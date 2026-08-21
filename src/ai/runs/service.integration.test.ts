import { randomUUID } from "node:crypto";

import { and, count, eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres, { type Sql } from "postgres";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { createPhaseCDurableDraftAssistanceServiceV1 } from "@/ai/applications/draft-assistance/composition";
import type {
  ApplyAiDraftCandidateV1,
  DraftAssistanceCommandV1,
} from "@/ai/applications/draft-assistance/contracts";
import type { UserRole } from "@/auth/permissions";
import type { ProtectedApplicationResultEnvelopeV1 } from "@/ai/core/contracts";
import type { PromptBundleLoaderV1 } from "@/ai/prompts/loader";
import { createTextProviderRegistryV1 } from "@/ai/providers/registry";
import { createAiModelConfigServiceV1 } from "@/ai/config/model-config-service";
import { resolvedConfigHashV1 } from "@/ai/internal/preparation";
import { localTestPricingPolicyRegistryV1 } from "@/ai/runs/pricing-policy";
import { normalizeAttemptEvidenceV3 } from "@/ai/runs/attempt-evidence";
import { protectDraftCandidateV1 } from "@/ai/output/common";
import { productDescriptionDraftV1Schema } from "@/ai/output/product-description-draft";
import { fabricKnowledgeDraftV1Schema } from "@/ai/output/fabric-knowledge-draft";
import { decodeReconstructibleDraftContextV1 } from "@/ai/applications/draft-assistance/context";
import { createAiRunRepositoryV1 } from "@/ai/runs/repository";
import { aiFailure } from "@/ai/errors";
import { writeAuditLog } from "@/audit/service";
import type { GovernedMutationOptions } from "@/audit/governed-mutation";
import { createFakeTextProviderV1 } from "@/ai/testing/fake-text-provider";
import type { DatabaseConnection, PostgresAppDatabase } from "@/db/client";
import { migrateDatabase } from "@/db/migrate";
import {
  aiModelConfig,
  aiRuns,
  assets,
  auditLogs,
  authors,
  contentLocalizations,
  contents,
  editorialRevisions,
  featureFlags,
  productLocalizations,
  productAssets,
  productFieldReviews,
  productTaxonomyTerms,
  products,
  taxonomyTerms,
  users,
} from "@/db/schema";
import * as schema from "@/db/schema";
import { parseBlockDocument } from "@/editorial/blocks";

const postgresUrl = process.env.CWT_PHASE_C_POSTGRES_URL;
const hash = (character: string) => character.repeat(64);
const fakeProvider = createFakeTextProviderV1({
  key: "synthetic_alpha",
  model: "synthetic-text-alpha-v1",
  envelope: { version: 1, hash: hash("e") },
  result: {
    kind: "failure",
    responseStatus: "unknown",
    failureCode: "unknown",
    retryClass: "not_retryable",
    durationMs: 0,
  },
});
const registryResult = createTextProviderRegistryV1([fakeProvider]);
if (!registryResult.ok) throw new Error("Fake Provider registry failed.");
const providerRegistry = registryResult.value;
const promptLoader: PromptBundleLoaderV1 = {
  load(input) {
    return {
      ok: true,
      value: {
        tuple: {
          promptId: input.promptId,
          promptVersion: input.promptVersion,
          promptHash: input.promptHash,
        },
        applicationClass: input.applicationClass,
        capability: "text",
        useCase: input.useCase,
        locale: "en",
        inputSchemaVersion: input.inputSchemaVersion,
        outputSchemaVersion: input.outputSchemaVersion,
        policyVersion: input.policyVersion,
        variables: input.useCase === "fabric_knowledge_draft" ? [
          { name: "locale", type: "string", maximumUtf8Bytes: 16 },
          {
            name: "requested_tone",
            type: "enum",
            values: ["concise_professional_b2b", "neutral_editorial"],
          },
          { name: "selected_context_json", type: "json", maximumUtf8Bytes: 65_536 },
          { name: "topic", type: "string", maximumUtf8Bytes: 16_384 },
        ] : [
          { name: "locale", type: "string", maximumUtf8Bytes: 16 },
          { name: "product_context_json", type: "json", maximumUtf8Bytes: 49_152 },
          { name: "media_placement_refs_json", type: "json", maximumUtf8Bytes: 8_192 },
          {
            name: "requested_tone",
            type: "enum",
            values: ["concise_professional_b2b", "neutral_editorial"],
          },
        ],
        body: input.useCase === "fabric_knowledge_draft"
          ? [
              "SYNTHETIC TEST DATA — NOT A CWT FACT",
              "{{locale}}",
              "{{requested_tone}}",
              "{{selected_context_json}}",
              "{{topic}}",
            ].join("\n")
          : [
              "SYNTHETIC TEST DATA — NOT A CWT FACT",
              "{{locale}}",
              "{{product_context_json}}",
              "{{media_placement_refs_json}}",
              "{{requested_tone}}",
            ].join("\n"),
      },
    };
  },
};

let client: Sql | undefined;
let database: PostgresAppDatabase | undefined;

function db(): PostgresAppDatabase {
  if (database === undefined) throw new Error("Real PostgreSQL fixture was not initialized.");
  return database;
}

async function seedFixture() {
  const [actor] = await db().insert(users).values({
    email: `${randomUUID()}@run-service.example.test`,
    displayName: "Synthetic Run Service Actor",
    role: "product_editor",
    passwordHash: "test-only",
  }).returning({ id: users.id });
  if (actor === undefined) throw new Error("Actor fixture failed.");
  const productId = await db().transaction(async (transaction) => {
    const [taxonomy] = await transaction.insert(taxonomyTerms).values({
      internalKey: `synthetic-run-service-${randomUUID()}`,
      dimension: "material_fiber",
    }).returning({ id: taxonomyTerms.id });
    const [product] = await transaction.insert(products).values({
      status: "draft",
      createdByUserId: actor.id,
    }).returning({ id: products.id });
    if (taxonomy === undefined || product === undefined) throw new Error("Product fixture failed.");
    await transaction.insert(productLocalizations).values({
      productId: product.id,
      locale: "en",
      name: "Synthetic Run Service Product",
      editorDocumentVersion: 1,
    });
    await transaction.insert(productTaxonomyTerms).values({
      productId: product.id,
      taxonomyTermId: taxonomy.id,
      isPrimary: true,
    });
    return product.id;
  });
  await db().insert(featureFlags).values({ key: "ai", enabled: true });
  const [config] = await db().insert(aiModelConfig).values({
    useCase: "product_description_draft",
    provider: "synthetic_alpha",
    model: "synthetic-text-alpha-v1",
    parametersJson: { temperature: 0 },
    maxInputTokens: 1_000,
    maxOutputTokens: 200,
    maxAttempts: 3,
    runCostLimitMicrousd: 20_000,
    promptId: "product-description-draft",
    promptVersion: 1,
    promptHash: hash("a"),
    enabled: true,
    isDefault: true,
    createdByUserId: actor.id,
    updatedByUserId: actor.id,
  }).returning({ id: aiModelConfig.id });
  if (config === undefined) throw new Error("Config fixture failed.");
  return { actorId: actor.id, productId, configId: config.id };
}

async function seedUser(role: UserRole, isActive = true) {
  const [actor] = await db().insert(users).values({
    email: `${randomUUID()}@run-service.example.test`,
    displayName: `Synthetic ${role} Actor`,
    role,
    passwordHash: "test-only",
    isActive,
  }).returning({ id: users.id, role: users.role });
  if (actor === undefined) throw new Error("Role actor fixture failed.");
  return { userId: actor.id, role: actor.role };
}

async function seedContentFixture(actor: { readonly userId: string }) {
  const [author] = await db().insert(authors).values({
    internalKey: `synthetic-run-service-${randomUUID()}`,
    displayName: "Synthetic Run Service Author",
  }).returning({ id: authors.id });
  if (author === undefined) throw new Error("Author fixture failed.");
  const [content] = await db().insert(contents).values({
    channel: "fabric_knowledge",
    status: "draft",
    authorId: author.id,
    createdByUserId: actor.userId,
  }).returning({ id: contents.id });
  if (content === undefined) throw new Error("Content fixture failed.");
  await db().insert(contentLocalizations).values({
    contentId: content.id,
    locale: "en",
    title: "Synthetic Run Service Content",
    body: "SYNTHETIC TEST DATA — NOT A CWT FACT",
    editorDocumentVersion: 1,
  });
  await db().insert(featureFlags).values({ key: "ai", enabled: true }).onConflictDoNothing();
  const [config] = await db().insert(aiModelConfig).values({
    useCase: "fabric_knowledge_draft",
    provider: "synthetic_alpha",
    model: "synthetic-text-alpha-v1",
    parametersJson: { temperature: 0 },
    maxInputTokens: 1_000,
    maxOutputTokens: 200,
    maxAttempts: 3,
    runCostLimitMicrousd: 20_000,
    promptId: "fabric-knowledge-draft",
    promptVersion: 1,
    promptHash: hash("b"),
    enabled: true,
    isDefault: true,
    createdByUserId: actor.userId,
    updatedByUserId: actor.userId,
  }).returning({ id: aiModelConfig.id });
  if (config === undefined) throw new Error("Content config fixture failed.");
  return { actorId: actor.userId, contentId: content.id, configId: config.id };
}

function command(fixture: Awaited<ReturnType<typeof seedFixture>>, input: {
  readonly idempotencyKey: string;
  readonly explicitInput?: string;
  readonly target?: DraftAssistanceCommandV1["target"];
  readonly selectedMediaPlacementIds?: readonly string[];
}): DraftAssistanceCommandV1 {
  return {
    useCase: "product_description_draft",
    task: {
      kind: "product_description_draft",
      tone: "concise_professional_b2b",
      selectedMediaPlacementIds: [...(input.selectedMediaPlacementIds ?? [])],
    },
    actor: { userId: fixture.actorId, role: "product_editor" },
    target: input.target ?? {
      type: "product_draft",
      productId: fixture.productId,
      locale: "en",
      expectedVersion: 1,
    },
    idempotencyKey: input.idempotencyKey,
    contextSelections: [{
      sourceClass: "explicit_human_input",
      origin: "typed_brief",
    }],
    explicitInput: input.explicitInput ?? "Synthetic brief; not a CWT business fact.",
  };
}

function contentCommand(
  fixture: Awaited<ReturnType<typeof seedContentFixture>>,
  actor: { readonly userId: string; readonly role: UserRole },
  target: DraftAssistanceCommandV1["target"] = {
    type: "content_draft",
    contentId: fixture.contentId,
    locale: "en",
    expectedVersion: 1,
  },
): DraftAssistanceCommandV1 {
  return {
    useCase: "fabric_knowledge_draft",
    task: {
      kind: "fabric_knowledge_draft",
      tone: "neutral_editorial",
      topic: "Synthetic content lifecycle topic",
    },
    actor,
    target,
    idempotencyKey: randomUUID(),
    contextSelections: [{ sourceClass: "explicit_human_input", origin: "typed_brief" }],
    explicitInput: "Synthetic content brief; not a CWT business fact.",
  };
}

function service(auditWriter?: () => Promise<string>) {
  return createPhaseCDurableDraftAssistanceServiceV1({
    database: db(),
    trustedEnvironment: { appEnvironment: "test", processFeatureAiEnabled: true },
    providerRegistry,
    promptLoader,
    pricingRegistry: localTestPricingPolicyRegistryV1,
    ...(auditWriter === undefined ? {} : { governedMutationOptions: { auditWriter } }),
  });
}

function serviceWithGovernedOptions(governedMutationOptions: GovernedMutationOptions) {
  return createPhaseCDurableDraftAssistanceServiceV1({
    database: db(),
    trustedEnvironment: { appEnvironment: "test", processFeatureAiEnabled: true },
    providerRegistry,
    promptLoader,
    pricingRegistry: localTestPricingPolicyRegistryV1,
    governedMutationOptions,
  });
}

async function claimAndMark(runId: string) {
  const repository = createAiRunRepositoryV1(db());
  const claim = await repository.claimOrRecover({
    executionEnvironment: "test",
    workerId: `service-test-${randomUUID()}`,
  });
  if (claim.kind !== "claimed") throw new Error("Synthetic run was not claimed.");
  const row = await repository.readRunForWorker(runId);
  if (typeof row !== "object" || row === null || !("leaseToken" in row) ||
    !("leaseExpiresAt" in row) || !("leaseOwner" in row) || !("stateVersion" in row) ||
    typeof row.leaseToken !== "string" || !(row.leaseExpiresAt instanceof Date) ||
    typeof row.leaseOwner !== "string" || typeof row.stateVersion !== "number") {
    throw new Error("Synthetic claimed lease projection was invalid.");
  }
  const marker = await repository.authorizeProviderDispatch({
    runId,
    executionEnvironment: "test",
    leaseOwner: row.leaseOwner,
    leaseToken: row.leaseToken,
    leaseExpiresAt: row.leaseExpiresAt,
    stateVersion: row.stateVersion,
    pricingCurrent: true,
  });
  if (marker.kind !== "authorized") throw new Error("Synthetic dispatch marker failed.");
  return { repository, leaseOwner: row.leaseOwner, leaseToken: row.leaseToken, marker };
}

async function settleDraftReady(runId: string, candidateHash = hash("c")) {
  const active = await claimAndMark(runId);
  const evidence = normalizeAttemptEvidenceV3<ProtectedApplicationResultEnvelopeV1>({
    version: 3,
    dispatchState: "dispatched",
    protectedResult: {
      version: 1,
      resultKind: "draft_assistance_candidate",
      dispositionKind: "human_review",
      schemaId: "cwt.product-description-draft.v1",
      schemaVersion: 1,
      policyVersion: "stage4a-v1",
      value: { synthetic: "not a CWT fact" },
      canonicalJson: '{"synthetic":"not a CWT fact"}',
      hash: candidateHash,
    },
    error: null,
    responseStatus: "success",
    retryClass: "not_retryable",
    returnedModel: "synthetic-text-alpha-v1",
    completion: { kind: "complete" },
    usage: { inputTokens: 10, outputTokens: 5, totalTokens: 15 },
    providerHttpStatus: 200,
    providerErrorCode: null,
    providerRequestId: "synthetic-request",
      providerSystemFingerprint: null,
    durationMs: 2,
  });
  if (!evidence.ok) throw new Error("Synthetic candidate evidence failed.");
  const settled = await active.repository.settle({
    runId,
    executionEnvironment: "test",
    leaseOwner: active.leaseOwner,
    leaseToken: active.leaseToken,
    leaseExpiresAt: active.marker.leaseExpiresAt,
    stateVersion: active.marker.stateVersion,
    evidence: evidence.value,
  });
  if (settled.kind !== "settled") throw new Error("Synthetic candidate settlement failed.");
  return settled;
}

async function settleProtectedProductCandidate(runId: string) {
  const [row] = await db().select({ context: aiRuns.inputContextJson }).from(aiRuns)
    .where(eq(aiRuns.id, runId));
  if (row === undefined) throw new Error("Synthetic protected candidate run disappeared.");
  const decodedContext = decodeReconstructibleDraftContextV1(row.context);
  if (!decodedContext.ok) throw new Error(`Stored context failed: ${decodedContext.error.code}`);
  const sourceRef = "src_01:text";
  const mediaTextProposals = decodedContext.value.mediaPlacementRefs.includes("media_01")
    ? [{ placementRef: "media_01", altText: {
        text: "Synthetic accessible textile swatch", sourceRefs: [sourceRef],
      }, caption: {
        text: "Synthetic swatch caption", sourceRefs: [sourceRef],
      } }]
    : [];
  const protectedResult = protectDraftCandidateV1({
    rawObject: {
      schemaVersion: 1,
      useCase: "product_description_draft",
      locale: "en",
      displayNameProposal: { text: "Synthetic product title", sourceRefs: [sourceRef] },
      summaryProposal: { text: "Synthetic product summary", sourceRefs: [sourceRef] },
      descriptionBlocks: [{ type: "paragraph", text: {
        text: "Synthetic product paragraph", sourceRefs: [sourceRef],
      } }],
      featureProposals: [],
      faqProposals: [],
      mediaTextProposals,
    },
    context: decodedContext.value,
    schema: productDescriptionDraftV1Schema,
    useCase: "product_description_draft",
    schemaId: "cwt.product-description-draft.v1",
    policyVersion: "draft-product-description-v1",
  });
  if (!protectedResult.ok) throw new Error(`Protected candidate failed: ${protectedResult.error.code}`);
  const active = await claimAndMark(runId);
  const normalized = normalizeAttemptEvidenceV3<ProtectedApplicationResultEnvelopeV1>({
    version: 3,
    dispatchState: "dispatched",
    protectedResult: protectedResult.value,
    error: null,
    responseStatus: "success",
    retryClass: "not_retryable",
    returnedModel: "synthetic-text-alpha-v1",
    completion: { kind: "complete" },
    usage: { inputTokens: 10, outputTokens: 5, totalTokens: 15 },
    providerHttpStatus: 200,
    providerErrorCode: null,
    providerRequestId: "synthetic-protected-request",
    providerSystemFingerprint: null,
    durationMs: 2,
  });
  if (!normalized.ok) throw new Error("Protected candidate evidence failed.");
  const settled = await active.repository.settle({
    runId,
    executionEnvironment: "test",
    leaseOwner: active.leaseOwner,
    leaseToken: active.leaseToken,
    leaseExpiresAt: active.marker.leaseExpiresAt,
    stateVersion: active.marker.stateVersion,
    evidence: normalized.value,
  });
  if (settled.kind !== "settled") throw new Error("Protected candidate settlement failed.");
  return { settled, protectedResult: protectedResult.value };
}

async function settleProtectedContentCandidate(runId: string) {
  const [row] = await db().select({ context: aiRuns.inputContextJson }).from(aiRuns)
    .where(eq(aiRuns.id, runId));
  if (row === undefined) throw new Error("Synthetic protected Content run disappeared.");
  const decodedContext = decodeReconstructibleDraftContextV1(row.context);
  if (!decodedContext.ok) throw new Error(`Stored context failed: ${decodedContext.error.code}`);
  const sourceRef = "src_01:text";
  const protectedResult = protectDraftCandidateV1({
    rawObject: {
      schemaVersion: 1,
      useCase: "fabric_knowledge_draft",
      locale: "en",
      titleProposal: { text: "Synthetic fabric title", sourceRefs: [sourceRef] },
      summaryProposal: { text: "Synthetic fabric summary", sourceRefs: [sourceRef] },
      outline: [{ text: "Synthetic fabric outline", sourceRefs: [sourceRef] }],
      blocks: [{ type: "paragraph", text: {
        text: "Synthetic fabric paragraph", sourceRefs: [sourceRef],
      } }],
    },
    context: decodedContext.value,
    schema: fabricKnowledgeDraftV1Schema,
    useCase: "fabric_knowledge_draft",
    schemaId: "cwt.fabric-knowledge-draft.v1",
    policyVersion: "draft-fabric-knowledge-v1",
  });
  if (!protectedResult.ok) throw new Error(`Protected Content failed: ${protectedResult.error.code}`);
  const active = await claimAndMark(runId);
  const normalized = normalizeAttemptEvidenceV3<ProtectedApplicationResultEnvelopeV1>({
    version: 3,
    dispatchState: "dispatched",
    protectedResult: protectedResult.value,
    error: null,
    responseStatus: "success",
    retryClass: "not_retryable",
    returnedModel: "synthetic-text-alpha-v1",
    completion: { kind: "complete" },
    usage: { inputTokens: 10, outputTokens: 5, totalTokens: 15 },
    providerHttpStatus: 200,
    providerErrorCode: null,
    providerRequestId: "synthetic-protected-content-request",
    providerSystemFingerprint: null,
    durationMs: 2,
  });
  if (!normalized.ok) throw new Error("Protected Content evidence failed.");
  const settled = await active.repository.settle({
    runId,
    executionEnvironment: "test",
    leaseOwner: active.leaseOwner,
    leaseToken: active.leaseToken,
    leaseExpiresAt: active.marker.leaseExpiresAt,
    stateVersion: active.marker.stateVersion,
    evidence: normalized.value,
  });
  if (settled.kind !== "settled") throw new Error("Protected Content settlement failed.");
  return { settled, protectedResult: protectedResult.value };
}

async function fullAcceptCommand(
  runId: string,
  actor: { readonly userId: string; readonly role: UserRole },
): Promise<ApplyAiDraftCandidateV1> {
  const read = await service().readRun({ runId, actor });
  if (!read.ok || read.value.reviewProjection === null) {
    throw new Error(`Synthetic E4 projection failed: ${JSON.stringify(read)}`);
  }
  const projection = read.value.reviewProjection;
  const nodes = [
    ...(projection.proposal.seo?.title ? [projection.proposal.seo.title] : []),
    ...(projection.proposal.seo?.metaDescription
      ? [projection.proposal.seo.metaDescription] : []),
    ...projection.proposal.nodes,
  ].filter((node) => !node.previewOnly);
  return {
    runId,
    expectedRunStateVersion: projection.run.stateVersion,
    candidateHash: projection.run.candidateHash,
    expectedTargetVersion: projection.target.draftVersion,
    expectedRevisionId: projection.target.revisionId,
    expectedRevisionDraftVersion: projection.target.revisionId === null
      ? null : projection.target.draftVersion,
    decisions: nodes.map((node) => ({
      candidatePath: node.path,
      decision: "accepted" as const,
      ...(node.kind === "block" || node.kind === "feature" || node.kind === "faq"
        ? { insertAfterBlockId: null } : {}),
    })),
    qualityRating: 5,
    qualityLabels: [],
    qualityComment: "Synthetic E4 application evidence.",
  };
}

describe.skipIf(postgresUrl === undefined)("Phase C governed durable run service", () => {
  beforeAll(async () => {
    if (postgresUrl === undefined) return;
    client = postgres(postgresUrl, { max: 12, prepare: false, onnotice: () => undefined });
    database = drizzle(client, { schema });
    const connection: DatabaseConnection = {
      kind: "postgres",
      db: database,
      createMigrationClient: () => postgres(postgresUrl, {
        max: 1,
        prepare: false,
        onnotice: () => undefined,
      }),
      close: async () => undefined,
    };
    await migrateDatabase(connection);
  }, 30_000);

  beforeEach(async () => {
    await db().execute(sql`truncate table ${aiRuns}, ${aiModelConfig}, ${auditLogs}, ${featureFlags}, ${editorialRevisions}, ${contentLocalizations}, ${contents}, ${authors}, ${productAssets}, ${assets}, ${productLocalizations}, ${products}, ${users} cascade`);
  });

  afterAll(async () => {
    await client?.end();
  });

  it("commits one durable run and one required Audit, then exact-replays", async () => {
    const fixture = await seedFixture();
    const idempotencyKey = randomUUID();
    const first = await service().requestDraftAssistance(command(fixture, { idempotencyKey }));
    expect(first.ok).toBe(true);
    const replay = await service().requestDraftAssistance(command(fixture, { idempotencyKey }));
    expect(replay).toEqual(first);
    const [runCount] = await db().select({ value: count() }).from(aiRuns);
    const audits = await db().select().from(auditLogs).where(eq(auditLogs.action, "ai.run.enqueued"));
    expect(runCount?.value).toBe(1);
    expect(audits).toHaveLength(1);
    const [row] = await db().select().from(aiRuns);
    expect(row).toMatchObject({
      status: "pending",
      retryState: "none",
      attemptCount: 0,
      stateVersion: 1,
      executionEnvironment: "test",
      budgetPolicyVersion: "nonbillable-v1",
      actualCostMicrousd: 0,
      budgetAccountedCostMicrousd: 0,
      budgetReservedCostMicrousd: 0,
      candidateJson: null,
      candidateHash: null,
    });
  });

  it("forces the governed enqueue transaction to REPEATABLE READ without losing injected Audit", async () => {
    const fixture = await seedFixture();
    let observedIsolation: string | undefined;
    const created = await serviceWithGovernedOptions({
      transactionConfig: { isolationLevel: "read committed" },
      auditWriter: async (transaction, input) => {
        const rows = await transaction.select({
          transactionIsolation: sql<string>`current_setting('transaction_isolation')`,
        }).from(users).limit(1);
        observedIsolation = rows[0]?.transactionIsolation;
        return writeAuditLog(transaction, input);
      },
    }).requestDraftAssistance(command(fixture, { idempotencyKey: randomUUID() }));
    expect(created.ok).toBe(true);
    expect(observedIsolation).toBe("repeatable read");
    expect(await db().select().from(auditLogs).where(eq(auditLogs.action, "ai.run.enqueued")))
      .toHaveLength(1);
  });

  it("returns a safe idempotency conflict for a different fingerprint", async () => {
    const fixture = await seedFixture();
    const idempotencyKey = randomUUID();
    const first = await service().requestDraftAssistance(command(fixture, { idempotencyKey }));
    expect(first.ok).toBe(true);
    const conflict = await service().requestDraftAssistance(command(fixture, {
      idempotencyKey,
      explicitInput: "A distinct conspicuously synthetic brief.",
    }));
    expect(conflict.ok).toBe(false);
    if (!conflict.ok) expect(conflict.error.code).toBe("idempotency_conflict");
    expect((await db().select().from(aiRuns))).toHaveLength(1);
    expect((await db().select().from(auditLogs).where(eq(auditLogs.action, "ai.run.enqueued"))))
      .toHaveLength(1);
  });

  it("binds changed Product facts/provenance to a new source projection fingerprint", async () => {
    const fixture = await seedFixture();
    await db().update(products).set({ composition: "SYNTHETIC old coherent fiber" })
      .where(eq(products.id, fixture.productId));
    await db().insert(productFieldReviews).values({
      productId: fixture.productId,
      fieldName: "composition",
      verificationStatus: "provided",
    });
    const base = command(fixture, { idempotencyKey: randomUUID() });
    const structured: DraftAssistanceCommandV1 = {
      useCase: base.useCase,
      task: base.task,
      actor: base.actor,
      target: base.target,
      idempotencyKey: base.idempotencyKey,
      contextSelections: [{
        sourceClass: "product_structured",
        sourceId: fixture.productId,
        fields: ["composition"],
      }],
    };
    const first = await service().requestDraftAssistance(structured);
    expect(first.ok).toBe(true);
    const [firstRow] = await db().select({
      inputSources: aiRuns.inputSourcesJson,
    }).from(aiRuns).where(eq(aiRuns.id, first.ok ? first.value.runId : randomUUID()));
    await db().transaction(async (transaction) => {
      await transaction.update(products).set({ composition: "SYNTHETIC new coherent fiber" })
        .where(eq(products.id, fixture.productId));
      await transaction.update(productFieldReviews).set({ verificationStatus: "verified" })
        .where(eq(productFieldReviews.productId, fixture.productId));
    });
    const conflict = await service().requestDraftAssistance(structured);
    expect(conflict).toMatchObject({ ok: false, error: { code: "idempotency_conflict" } });
    const next = await service().requestDraftAssistance({
      ...structured,
      idempotencyKey: randomUUID(),
    });
    expect(next.ok).toBe(true);
    const [nextRow] = await db().select({
      inputSources: aiRuns.inputSourcesJson,
    }).from(aiRuns).where(eq(aiRuns.id, next.ok ? next.value.runId : randomUUID()));
    expect(firstRow?.inputSources).not.toEqual(nextRow?.inputSources);
    expect(JSON.stringify(firstRow?.inputSources)).toContain("projectionSha256");
    expect(JSON.stringify(nextRow?.inputSources)).not.toContain("recordVersion");
  });

  it("authorizes PostgreSQL availability from one persisted actor before protected state", async () => {
    const product = await seedFixture();
    const productEditor = { userId: product.actorId, role: "product_editor" as const };
    const contentEditor = await seedUser("content_editor");
    const content = await seedContentFixture(contentEditor);
    const admin = await seedUser("admin");
    const sales = await seedUser("sales");
    const reviewer = await seedUser("reviewer_publisher");
    const analyst = await seedUser("analyst");
    const inactive = await seedUser("product_editor", false);
    const [productRevision, contentRevision] = await db().insert(editorialRevisions).values([
      {
        entityType: "product",
        entityId: product.productId,
        locale: "en",
        versionNumber: 1,
        status: "draft",
        snapshot: {
          kind: "editorial_blocks",
          name: "SYNTHETIC TEST DATA — NOT A CWT FACT",
          shortDescription: null,
          document: { version: 1, blocks: [] },
          expectedEditorDocumentVersion: 1,
          draftVersion: 1,
          pendingChanges: [],
        },
        createdByUserId: productEditor.userId,
      },
      {
        entityType: "content",
        entityId: content.contentId,
        locale: "en",
        versionNumber: 1,
        status: "draft",
        snapshot: {
          kind: "content_blocks_v1",
          title: "SYNTHETIC TEST DATA — NOT A CWT FACT",
          excerpt: null,
          document: { version: 1, blocks: [] },
          expectedEditorDocumentVersion: 1,
          draftVersion: 1,
        },
        createdByUserId: contentEditor.userId,
      },
    ]).returning({ id: editorialRevisions.id });
    if (productRevision === undefined || contentRevision === undefined) {
      throw new Error("Availability revision fixtures failed.");
    }
    const availability = service();
    type Inspection = Parameters<typeof availability.inspectDraftAssistanceAvailability>[0];
    const productDraft = {
      type: "product_draft",
      productId: product.productId,
      locale: "en",
      expectedVersion: 1,
    } satisfies Inspection["target"];
    const contentDraft = {
      type: "content_draft",
      contentId: content.contentId,
      locale: "en",
      expectedVersion: 1,
    } satisfies Inspection["target"];
    const productRevisionTarget = {
      type: "editorial_revision",
      revisionId: productRevision.id,
      expectedVersion: 1,
    } satisfies Inspection["target"];
    const contentRevisionTarget = {
      type: "editorial_revision",
      revisionId: contentRevision.id,
      expectedVersion: 1,
    } satisfies Inspection["target"];
    const inspect = (input: {
      readonly actor: Inspection["actor"];
      readonly target: Inspection["target"];
      readonly useCase: Inspection["useCase"];
    }) => availability.inspectDraftAssistanceAvailability({
      actor: input.actor,
      target: input.target,
      useCase: input.useCase,
      task: input.useCase === "fabric_knowledge_draft"
        ? {
            kind: "fabric_knowledge_draft",
            tone: "neutral_editorial",
            topic: "Synthetic availability topic",
          }
        : {
            kind: "product_description_draft",
            tone: "concise_professional_b2b",
            selectedMediaPlacementIds: [],
          },
      contextSelections: [{ sourceClass: "explicit_human_input", origin: "typed_brief" }],
      explicitInput: "Synthetic availability brief; not a CWT business fact.",
    });
    const available = {
      ok: true,
      value: { available: true, manualEditorAvailable: true, code: "available" },
    } as const;
    const denied = {
      ok: true,
      value: { available: false, manualEditorAvailable: false, code: "authorization_denied" },
    } as const;
    const scopes = [
      { useCase: "product_description_draft", target: productDraft, actors: [admin, productEditor] },
      { useCase: "fabric_knowledge_draft", target: contentDraft, actors: [admin, contentEditor] },
      { useCase: "product_description_draft", target: productRevisionTarget, actors: [admin, productEditor] },
      { useCase: "fabric_knowledge_draft", target: contentRevisionTarget, actors: [admin, contentEditor] },
    ] satisfies ReadonlyArray<{
      readonly useCase: Inspection["useCase"];
      readonly target: Inspection["target"];
      readonly actors: readonly Inspection["actor"][];
    }>;
    for (const entry of scopes) {
      for (const actor of entry.actors) {
        expect(await inspect({ useCase: entry.useCase, target: entry.target, actor }))
          .toEqual(available);
      }
    }

    for (const entry of [
      { actor: productEditor, target: contentDraft, useCase: "fabric_knowledge_draft" },
      { actor: contentEditor, target: productDraft, useCase: "product_description_draft" },
      { actor: productEditor, target: contentRevisionTarget, useCase: "fabric_knowledge_draft" },
      { actor: contentEditor, target: productRevisionTarget, useCase: "product_description_draft" },
      { actor: sales, target: productDraft, useCase: "product_description_draft" },
      { actor: reviewer, target: productDraft, useCase: "product_description_draft" },
      { actor: reviewer, target: contentRevisionTarget, useCase: "fabric_knowledge_draft" },
      { actor: analyst, target: productDraft, useCase: "product_description_draft" },
      { actor: { userId: sales.userId, role: "product_editor" }, target: productDraft, useCase: "product_description_draft" },
      { actor: { userId: reviewer.userId, role: "content_editor" }, target: contentDraft, useCase: "fabric_knowledge_draft" },
      { actor: inactive, target: productDraft, useCase: "product_description_draft" },
      { actor: { userId: productEditor.userId, role: "content_editor" }, target: productDraft, useCase: "product_description_draft" },
      { actor: { userId: randomUUID(), role: "product_editor" }, target: productDraft, useCase: "product_description_draft" },
      { actor: { userId: "not-a-uuid", role: "product_editor" }, target: productDraft, useCase: "product_description_draft" },
    ] satisfies ReadonlyArray<{
      readonly actor: Inspection["actor"];
      readonly target: Inspection["target"];
      readonly useCase: Inspection["useCase"];
    }>) {
      expect(await inspect(entry)).toEqual(denied);
    }

    const forged = { userId: sales.userId, role: "product_editor" as const };
    const missingProduct = { ...productDraft, productId: randomUUID() };
    expect(await inspect({
      actor: forged,
      target: missingProduct,
      useCase: "product_description_draft",
    })).toEqual(denied);
    expect(await inspect({
      actor: forged,
      target: { type: "editorial_revision", revisionId: randomUUID(), expectedVersion: 1 },
      useCase: "product_description_draft",
    })).toEqual(denied);
    await db().update(featureFlags).set({ enabled: false }).where(eq(featureFlags.key, "ai"));
    expect(await inspect({ actor: forged, target: productDraft, useCase: "product_description_draft" }))
      .toEqual(denied);
    await db().update(featureFlags).set({ enabled: true }).where(eq(featureFlags.key, "ai"));
    await db().delete(aiModelConfig).where(eq(aiModelConfig.useCase, "product_description_draft"));
    expect(await inspect({ actor: forged, target: productDraft, useCase: "product_description_draft" }))
      .toEqual(denied);
    expect(await db().select({ value: count() }).from(aiRuns)).toEqual([{ value: 0 }]);
    expect(await db().select({ value: count() }).from(auditLogs)).toEqual([{ value: 0 }]);
  });

  it("uses persisted active roles for Product-scoped reads without an existence oracle", async () => {
    const fixture = await seedFixture();
    const created = await service().requestDraftAssistance(command(fixture, {
      idempotencyKey: randomUUID(),
    }));
    if (!created.ok) throw new Error("Synthetic enqueue failed.");
    const insertedActors = await db().insert(users).values([
      {
        email: `${randomUUID()}@run-service.example.test`,
        displayName: "Synthetic Unrelated Product Editor",
        role: "product_editor",
        passwordHash: "test-only",
      },
      {
        email: `${randomUUID()}@run-service.example.test`,
        displayName: "Synthetic Admin",
        role: "admin",
        passwordHash: "test-only",
      },
      {
        email: `${randomUUID()}@run-service.example.test`,
        displayName: "Synthetic Content Editor",
        role: "content_editor",
        passwordHash: "test-only",
      },
      {
        email: `${randomUUID()}@run-service.example.test`,
        displayName: "Synthetic Reviewer",
        role: "reviewer_publisher",
        passwordHash: "test-only",
      },
      {
        email: `${randomUUID()}@run-service.example.test`,
        displayName: "Synthetic Sales",
        role: "sales",
        passwordHash: "test-only",
      },
      {
        email: `${randomUUID()}@run-service.example.test`,
        displayName: "Synthetic Analyst",
        role: "analyst",
        passwordHash: "test-only",
      },
      {
        email: `${randomUUID()}@run-service.example.test`,
        displayName: "Synthetic Inactive Product Editor",
        role: "product_editor",
        passwordHash: "test-only",
        isActive: false,
      },
    ]).returning({ id: users.id, role: users.role });
    const [unrelated, admin, contentEditor, reviewer, sales, analyst, inactive] = insertedActors;
    if (unrelated === undefined || admin === undefined || contentEditor === undefined ||
      reviewer === undefined || sales === undefined || analyst === undefined || inactive === undefined) {
      throw new Error("Read actors failed.");
    }
    expect((await service().readRun({
      runId: created.value.runId,
      actor: { userId: fixture.actorId, role: "product_editor" },
    })).ok).toBe(true);
    expect((await service().readRun({
      runId: created.value.runId,
      actor: { userId: admin.id, role: "admin" },
    })).ok).toBe(true);
    expect((await service().readRun({
      runId: created.value.runId,
      actor: { userId: unrelated.id, role: "product_editor" },
    })).ok).toBe(true);
    expect((await service().readRun({
      runId: created.value.runId,
      actor: { userId: reviewer.id, role: "reviewer_publisher" },
    })).ok).toBe(true);

    const deniedExisting = await Promise.all([
      service().readRun({
        runId: created.value.runId,
        actor: { userId: contentEditor.id, role: "content_editor" },
      }),
      service().readRun({
        runId: created.value.runId,
        actor: { userId: sales.id, role: "sales" },
      }),
      service().readRun({
        runId: created.value.runId,
        actor: { userId: analyst.id, role: "analyst" },
      }),
      service().readRun({
        runId: created.value.runId,
        actor: { userId: sales.id, role: "admin" },
      }),
      service().readRun({
        runId: created.value.runId,
        actor: { userId: inactive.id, role: "product_editor" },
      }),
      service().readRun({
        runId: created.value.runId,
        actor: { userId: randomUUID(), role: "product_editor" },
      }),
      service().readRun({
        runId: created.value.runId,
        actor: { userId: fixture.actorId, role: "content_editor" },
      }),
    ]);
    for (const denied of deniedExisting) {
      expect(denied).toMatchObject({ ok: false, error: { code: "authorization_denied" } });
    }
    expect(await service().readRun({
      runId: randomUUID(),
      actor: { userId: sales.id, role: "sales" },
    })).toEqual(deniedExisting[1]);
  });

  it("enforces persisted Product/Content/Revision scope for enqueue and protected reads", async () => {
    const product = await seedFixture();
    const productEditor = { userId: product.actorId, role: "product_editor" as const };
    const contentEditor = await seedUser("content_editor");
    const content = await seedContentFixture(contentEditor);
    const reviewer = await seedUser("reviewer_publisher");
    const admin = await seedUser("admin");
    const sales = await seedUser("sales");
    const analyst = await seedUser("analyst");
    const inactive = await seedUser("product_editor", false);
    const [productRevision] = await db().insert(editorialRevisions).values({
      entityType: "product",
      entityId: product.productId,
      locale: "en",
      versionNumber: 1,
      status: "draft",
      snapshot: {
        kind: "editorial_blocks",
        name: "SYNTHETIC TEST DATA — NOT A CWT FACT",
        shortDescription: null,
        document: { version: 1, blocks: [] },
        expectedEditorDocumentVersion: 1,
        draftVersion: 1,
        pendingChanges: [],
      },
      createdByUserId: productEditor.userId,
    }).returning({ id: editorialRevisions.id });
    const [contentRevision] = await db().insert(editorialRevisions).values({
      entityType: "content",
      entityId: content.contentId,
      locale: "en",
      versionNumber: 1,
      status: "draft",
      snapshot: {
        kind: "content_blocks_v1",
        title: "SYNTHETIC TEST DATA — NOT A CWT FACT",
        excerpt: null,
        document: { version: 1, blocks: [] },
        expectedEditorDocumentVersion: 1,
        draftVersion: 1,
      },
      createdByUserId: contentEditor.userId,
    }).returning({ id: editorialRevisions.id });
    if (productRevision === undefined || contentRevision === undefined) {
      throw new Error("Revision fixtures failed.");
    }

    const productDraftCommand = command(product, {
      idempotencyKey: randomUUID(),
    });
    const productDraft = await service().requestDraftAssistance(productDraftCommand);
    const contentDraft = await service().requestDraftAssistance(contentCommand(content, contentEditor));
    const productRevisionRun = await service().requestDraftAssistance({
      ...command(product, { idempotencyKey: randomUUID() }),
      target: {
        type: "editorial_revision",
        revisionId: productRevision.id,
        expectedVersion: 1,
      },
    });
    const contentRevisionRun = await service().requestDraftAssistance(contentCommand(
      content,
      contentEditor,
      { type: "editorial_revision", revisionId: contentRevision.id, expectedVersion: 1 },
    ));
    const adminDraft = await service().requestDraftAssistance({
      ...command(product, { idempotencyKey: randomUUID() }),
      actor: admin,
    });
    const created = [productDraft, contentDraft, productRevisionRun, contentRevisionRun, adminDraft];
    expect(created.every((outcome) => outcome.ok), JSON.stringify(created)).toBe(true);
    if (!productDraft.ok || !contentDraft.ok || !productRevisionRun.ok || !contentRevisionRun.ok ||
      !adminDraft.ok) {
      throw new Error("Role-matrix enqueue fixture failed.");
    }

    const deniedEnqueues = await Promise.all([
      service().requestDraftAssistance({
        ...command(product, { idempotencyKey: randomUUID() }),
        actor: contentEditor,
        target: { type: "editorial_revision", revisionId: productRevision.id, expectedVersion: 1 },
      }),
      service().requestDraftAssistance(contentCommand(
        content,
        productEditor,
        { type: "editorial_revision", revisionId: contentRevision.id, expectedVersion: 1 },
      )),
      service().requestDraftAssistance({
        ...command(product, { idempotencyKey: randomUUID() }),
        actor: reviewer,
      }),
      service().requestDraftAssistance({
        ...command(product, { idempotencyKey: randomUUID() }),
        actor: { userId: sales.userId, role: "admin" },
      }),
      service().requestDraftAssistance({
        ...command(product, { idempotencyKey: randomUUID() }),
        actor: analyst,
      }),
      service().requestDraftAssistance({
        ...command(product, { idempotencyKey: randomUUID() }),
        actor: inactive,
      }),
      service().requestDraftAssistance({
        ...command(product, { idempotencyKey: randomUUID() }),
        actor: { userId: randomUUID(), role: "product_editor" },
      }),
    ]);
    for (const denied of deniedEnqueues) {
      expect(denied).toMatchObject({ ok: false, error: { code: "authorization_denied" } });
    }
    expect(await db().select().from(aiRuns)).toHaveLength(5);
    expect(await db().select().from(auditLogs).where(eq(auditLogs.action, "ai.run.enqueued")))
      .toHaveLength(5);

    const runIds = {
      productDraft: productDraft.value.runId,
      contentDraft: contentDraft.value.runId,
      productRevision: productRevisionRun.value.runId,
      contentRevision: contentRevisionRun.value.runId,
    };
    for (const runId of [runIds.productDraft, runIds.productRevision]) {
      expect((await service().readRun({ runId, actor: productEditor })).ok).toBe(true);
      expect(await service().readRun({ runId, actor: contentEditor }))
        .toMatchObject({ ok: false, error: { code: "authorization_denied" } });
    }
    for (const runId of [runIds.contentDraft, runIds.contentRevision]) {
      expect((await service().readRun({ runId, actor: contentEditor })).ok).toBe(true);
      expect(await service().readRun({ runId, actor: productEditor }))
        .toMatchObject({ ok: false, error: { code: "authorization_denied" } });
    }
    for (const runId of Object.values(runIds)) {
      expect((await service().readRun({ runId, actor: reviewer })).ok).toBe(true);
      expect((await service().readRun({ runId, actor: admin })).ok).toBe(true);
      for (const actor of [sales, analyst]) {
        expect(await service().readRun({ runId, actor }))
          .toMatchObject({ ok: false, error: { code: "authorization_denied" } });
      }
    }
    const crossScope = await service().readRun({
      runId: runIds.contentRevision,
      actor: productEditor,
    });
    expect(await service().readRun({ runId: randomUUID(), actor: productEditor })).toEqual(crossScope);
    await db().update(users).set({ role: "content_editor" }).where(eq(users.id, productEditor.userId));
    expect(await service().requestDraftAssistance({
      ...productDraftCommand,
      actor: { userId: productEditor.userId, role: "content_editor" },
    })).toMatchObject({ ok: false, error: { code: "authorization_denied" } });
    expect(await db().select().from(aiRuns)).toHaveLength(5);
    expect(await db().select().from(auditLogs).where(eq(auditLogs.action, "ai.run.enqueued")))
      .toHaveLength(5);
  });

  async function verifyDefaultSwitchSchedule(
    schedule: "concurrent" | "switch-first" | "enqueue-first",
  ): Promise<void> {
    const fixture = await seedFixture();
    const [admin] = await db().insert(users).values({
      email: `${randomUUID()}@run-service.example.test`,
      displayName: "Synthetic Config Admin",
      role: "admin",
      passwordHash: "test-only",
    }).returning({ id: users.id, role: users.role });
    if (admin === undefined) throw new Error("Admin fixture failed.");
    const [second] = await db().insert(aiModelConfig).values({
      useCase: "product_description_draft",
      provider: "synthetic_alpha",
      model: "synthetic-text-alpha-v1",
      parametersJson: { temperature: 0 },
      maxInputTokens: 1_000,
      maxOutputTokens: 200,
      maxAttempts: 3,
      runCostLimitMicrousd: 20_000,
      promptId: "product-description-draft",
      promptVersion: 1,
      promptHash: hash("a"),
      enabled: false,
      isDefault: false,
      createdByUserId: admin.id,
      updatedByUserId: admin.id,
    }).returning({ id: aiModelConfig.id });
    if (second === undefined) throw new Error("Second config fixture failed.");
    const configService = createAiModelConfigServiceV1(db(), {
      contracts: [{
        useCase: "product_description_draft",
        inputSchemaVersion: 1,
        outputSchemaVersion: 1,
        policyVersion: "draft-product-description-v1",
      }],
      providerRegistry,
      promptLoader,
      pricingRegistry: localTestPricingPolicyRegistryV1,
    });
    const request = () => service()
      .requestDraftAssistance(command(fixture, { idempotencyKey: randomUUID() }));
    const activate = () => configService.activateDefault({
      actor: { userId: admin.id, role: "admin" },
      useCase: "product_description_draft",
      selectedConfigId: second.id,
      expectedRecordVersions: {
        [fixture.configId]: 1,
        [second.id]: 1,
      },
    });
    const outcomes = await (async () => {
      if (schedule === "switch-first") {
        const switchOutcome = await activate();
        const requestOutcome = await request();
        return { requestOutcome, switchOutcome };
      }
      if (schedule === "enqueue-first") {
        const requestOutcome = await request();
        const switchOutcome = await activate();
        return { requestOutcome, switchOutcome };
      }
      const [requestOutcome, switchOutcome] = await Promise.all([request(), activate()]);
      return { requestOutcome, switchOutcome };
    })();
    const { requestOutcome, switchOutcome } = outcomes;
    expect(switchOutcome).toMatchObject({
      ok: true,
      value: { selectedConfigId: second.id, recordVersion: 2 },
    });
    const runs = await db().select().from(aiRuns);
    const enqueueAudits = await db().select().from(auditLogs)
      .where(eq(auditLogs.action, "ai.run.enqueued"));
    if (requestOutcome.ok) {
      expect(runs).toHaveLength(1);
      expect(enqueueAudits).toHaveLength(1);
      const [run] = runs;
      expect(run?.id).toBe(requestOutcome.value.runId);
      if (run === undefined) throw new Error("Concurrent enqueue did not persist its run.");
      expect(enqueueAudits[0]).toMatchObject({
        actorUserId: fixture.actorId,
        entityType: "ai_run",
        entityId: run.id,
      });
      const expectedTuple = run.modelConfigId === fixture.configId
        ? { id: fixture.configId, version: 1 }
        : run.modelConfigId === second.id
          ? { id: second.id, version: 2 }
          : undefined;
      expect(expectedTuple).toBeDefined();
      if (expectedTuple === undefined) throw new Error("Concurrent enqueue selected an unknown config.");
      expect(run.modelConfigVersion).toBe(expectedTuple.version);
      if (schedule === "switch-first") expect(expectedTuple.id).toBe(second.id);
      if (schedule === "enqueue-first") expect(expectedTuple.id).toBe(fixture.configId);
      const expectedHash = resolvedConfigHashV1({
        applicationClass: "draft_assistance",
        capability: "text",
        useCase: "product_description_draft",
        modelConfigId: expectedTuple.id,
        modelConfigVersion: expectedTuple.version,
        requestedProvider: "synthetic_alpha",
        requestedModel: "synthetic-text-alpha-v1",
        parametersSnapshot: { temperature: 0 },
        maxInputTokens: 1_000,
        maxOutputTokens: 200,
        maxAttempts: 3,
        runCostLimitMicrousd: 20_000,
        promptId: "product-description-draft",
        promptVersion: 1,
        promptHash: hash("a"),
        providerEnvelope: fakeProvider.describeEnvelope(),
        inputSchemaVersion: 1,
        outputSchemaVersion: 1,
        policyVersion: "draft-product-description-v1",
      });
      expect(expectedHash.ok).toBe(true);
      if (!expectedHash.ok) throw new Error("Synthetic resolved-config hash fixture failed.");
      expect(run.resolvedConfigHash).toBe(expectedHash.value.hash);
      const [snapshot] = await db().select().from(aiModelConfig)
        .where(eq(aiModelConfig.id, run.modelConfigId));
      expect(snapshot).toBeDefined();
    } else {
      expect(schedule).toBe("concurrent");
      expect(requestOutcome.error.code).toBe("state_conflict");
      expect(runs).toHaveLength(0);
      expect(enqueueAudits).toHaveLength(0);
    }
  }

  it.each(["concurrent", "switch-first", "enqueue-first"] as const)(
    "serializes default switching with enqueue into an exact snapshot or clean conflict: %s",
    verifyDefaultSwitchSchedule,
  );

  it("rolls target/run/Audit back atomically on required Audit failure", async () => {
    const fixture = await seedFixture();
    await expect(service(async () => {
      throw new Error("TEST enqueue Audit failure");
    }).requestDraftAssistance(command(fixture, { idempotencyKey: randomUUID() })))
      .rejects.toThrow(/enqueue Audit failure/);
    expect(await db().select().from(aiRuns)).toHaveLength(0);
    expect(await db().select().from(auditLogs).where(eq(auditLogs.action, "ai.run.enqueued")))
      .toHaveLength(0);
    const [target] = await db().select().from(productLocalizations)
      .where(eq(productLocalizations.productId, fixture.productId));
    expect(target).toMatchObject({ editorDocumentVersion: 1 });
  });

  it("allows only Admin or the own-request correct-scope editor to cancel", async () => {
    const fixture = await seedFixture();
    const unrelatedEditor = await seedUser("product_editor");
    const reviewer = await seedUser("reviewer_publisher");
    const sales = await seedUser("sales");
    const inactive = await seedUser("product_editor", false);
    const admin = await seedUser("admin");
    const created = await service().requestDraftAssistance(command(fixture, {
      idempotencyKey: randomUUID(),
    }));
    if (!created.ok) throw new Error("Synthetic enqueue failed.");
    const denied = [];
    for (const input of [
      {
        runId: created.value.runId,
        actor: unrelatedEditor,
        expectedStateVersion: 1,
        reason: "Synthetic unrelated cancellation.",
      },
      {
        runId: created.value.runId,
        actor: reviewer,
        expectedStateVersion: 1,
        reason: "Synthetic reviewer cancellation.",
      },
      {
        runId: created.value.runId,
        actor: { userId: sales.userId, role: "admin" },
        expectedStateVersion: 1,
        reason: "Synthetic spoofed cancellation.",
      },
      {
        runId: created.value.runId,
        actor: inactive,
        expectedStateVersion: 1,
        reason: "Synthetic inactive cancellation.",
      },
      {
        runId: created.value.runId,
        actor: { userId: randomUUID(), role: "product_editor" },
        expectedStateVersion: 1,
        reason: "Synthetic unknown cancellation.",
      },
    ]) denied.push(await service().cancelRun(input));
    for (const outcome of denied) {
      expect(outcome).toMatchObject({ ok: false, error: { code: "authorization_denied" } });
    }
    expect((await db().select().from(aiRuns).where(eq(aiRuns.id, created.value.runId)))[0])
      .toMatchObject({ status: "pending", stateVersion: 1 });
    expect(await db().select().from(auditLogs).where(eq(auditLogs.action, "ai.run.cancelled")))
      .toHaveLength(0);
    const cancelled = await service().cancelRun({
      runId: created.value.runId,
      actor: { userId: fixture.actorId, role: "product_editor" },
      expectedStateVersion: 1,
      reason: "Synthetic test cancellation; not a CWT business fact.",
    });
    expect(cancelled.ok).toBe(true);
    if (cancelled.ok) expect(cancelled.value).toMatchObject({ status: "cancelled", stateVersion: 2 });
    const stale = await service().cancelRun({
      runId: created.value.runId,
      actor: { userId: fixture.actorId, role: "product_editor" },
      expectedStateVersion: 1,
      reason: "Synthetic stale retry.",
    });
    expect(stale.ok).toBe(false);
    const adminRun = await service().requestDraftAssistance({
      ...command(fixture, { idempotencyKey: randomUUID() }),
      actor: unrelatedEditor,
    });
    if (!adminRun.ok) throw new Error("Admin cancellation fixture failed.");
    expect((await service().cancelRun({
      runId: adminRun.value.runId,
      actor: admin,
      expectedStateVersion: 1,
      reason: "Synthetic Admin cancellation.",
    })).ok).toBe(true);
    expect(await db().select().from(auditLogs).where(eq(auditLogs.action, "ai.run.cancelled")))
      .toHaveLength(2);
  });

  it("rolls cancellation and required Audit back together", async () => {
    const fixture = await seedFixture();
    const created = await service().requestDraftAssistance(command(fixture, {
      idempotencyKey: randomUUID(),
    }));
    if (!created.ok) throw new Error("Synthetic enqueue failed.");
    await expect(service(async () => {
      throw new Error("TEST cancellation Audit failure");
    }).cancelRun({
      runId: created.value.runId,
      actor: { userId: fixture.actorId, role: "product_editor" },
      expectedStateVersion: 1,
      reason: "Synthetic rollback cancellation.",
    })).rejects.toThrow(/cancellation Audit failure/);
    const [row] = await db().select().from(aiRuns).where(eq(aiRuns.id, created.value.runId));
    expect(row).toMatchObject({ status: "pending", stateVersion: 1 });
  });

  it("permits only the closed operator-remediable manual retry and Audits it", async () => {
    const fixture = await seedFixture();
    const unrelatedEditor = await seedUser("product_editor");
    const reviewer = await seedUser("reviewer_publisher");
    const sales = await seedUser("sales");
    const admin = await seedUser("admin");
    const created = await service().requestDraftAssistance(command(fixture, {
      idempotencyKey: randomUUID(),
    }));
    if (!created.ok) throw new Error("Synthetic enqueue failed.");
    const active = await claimAndMark(created.value.runId);
    const failure = aiFailure("provider_auth_failed");
    if (failure.ok) throw new Error("Static Provider auth failure was invalid.");
    const evidence = normalizeAttemptEvidenceV3<ProtectedApplicationResultEnvelopeV1>({
      version: 3,
      dispatchState: "dispatched",
      protectedResult: null,
      error: failure.error,
      responseStatus: "client_error",
      retryClass: "not_retryable",
      returnedModel: null,
      completion: null,
      usage: null,
      providerHttpStatus: 401,
      providerErrorCode: "synthetic_auth",
      providerRequestId: null,
      providerSystemFingerprint: null,
      durationMs: 1,
    });
    if (!evidence.ok) throw new Error("Synthetic failure evidence failed.");
    const settled = await active.repository.settle({
      runId: created.value.runId,
      executionEnvironment: "test",
      leaseOwner: active.leaseOwner,
      leaseToken: active.leaseToken,
      leaseExpiresAt: active.marker.leaseExpiresAt,
      stateVersion: active.marker.stateVersion,
      evidence: evidence.value,
    });
    if (settled.kind !== "settled") throw new Error("Synthetic failure settlement failed.");
    const denied = [];
    for (const input of [
      {
        runId: created.value.runId,
        actor: unrelatedEditor,
        expectedStateVersion: settled.stateVersion,
      },
      {
        runId: created.value.runId,
        actor: reviewer,
        expectedStateVersion: settled.stateVersion,
      },
      {
        runId: created.value.runId,
        actor: { userId: sales.userId, role: "admin" },
        expectedStateVersion: settled.stateVersion,
      },
    ]) denied.push(await service().manualRetry(input));
    for (const outcome of denied) {
      expect(outcome).toMatchObject({ ok: false, error: { code: "authorization_denied" } });
    }
    expect(await db().select().from(auditLogs)
      .where(eq(auditLogs.action, "ai.run.manual_retry_scheduled"))).toHaveLength(0);
    await expect(service(async () => {
      throw new Error("TEST manual retry Audit failure");
    }).manualRetry({
      runId: created.value.runId,
      actor: { userId: fixture.actorId, role: "product_editor" },
      expectedStateVersion: settled.stateVersion,
    })).rejects.toThrow(/manual retry Audit failure/);
    const [afterAuditFailure] = await db().select().from(aiRuns)
      .where(eq(aiRuns.id, created.value.runId));
    expect(afterAuditFailure).toMatchObject({
      status: "failed",
      retryState: "not_retryable",
      stateVersion: settled.stateVersion,
    });
    const retried = await service().manualRetry({
      runId: created.value.runId,
      actor: { userId: fixture.actorId, role: "product_editor" },
      expectedStateVersion: settled.stateVersion,
    });
    expect(retried.ok).toBe(true);
    if (retried.ok) expect(retried.value).toMatchObject({ status: "pending", retryState: "scheduled" });
    if (!retried.ok) throw new Error("Owned manual retry failed.");
    const cancelled = await service().cancelRun({
      runId: created.value.runId,
      actor: { userId: fixture.actorId, role: "product_editor" },
      expectedStateVersion: retried.value.stateVersion,
      reason: "Synthetic cleanup before Admin retry proof.",
    });
    if (!cancelled.ok) throw new Error("Retry cleanup cancellation failed.");
    const adminFixture = await service().requestDraftAssistance(command(fixture, {
      idempotencyKey: randomUUID(),
    }));
    if (!adminFixture.ok) throw new Error("Admin retry fixture enqueue failed.");
    const adminActive = await claimAndMark(adminFixture.value.runId);
    const adminSettled = await adminActive.repository.settle({
      runId: adminFixture.value.runId,
      executionEnvironment: "test",
      leaseOwner: adminActive.leaseOwner,
      leaseToken: adminActive.leaseToken,
      leaseExpiresAt: adminActive.marker.leaseExpiresAt,
      stateVersion: adminActive.marker.stateVersion,
      evidence: evidence.value,
    });
    if (adminSettled.kind !== "settled") throw new Error("Admin retry settlement failed.");
    expect((await service().manualRetry({
      runId: adminFixture.value.runId,
      actor: admin,
      expectedStateVersion: adminSettled.stateVersion,
    })).ok).toBe(true);
    expect(await db().select().from(auditLogs)
      .where(eq(auditLogs.action, "ai.run.manual_retry_scheduled"))).toHaveLength(2);
  });

  it("returns the protected projection after one governed audited manual retry", async () => {
    const fixture = await seedFixture();
    const actor = { userId: fixture.actorId, role: "product_editor" as const };
    const created = await service().requestDraftAssistance(command(fixture, {
      idempotencyKey: randomUUID(),
    }));
    if (!created.ok) throw new Error("Manual retry projection enqueue failed.");

    const active = await claimAndMark(created.value.runId);
    const failure = aiFailure("provider_auth_failed");
    if (failure.ok) throw new Error("Static Provider auth failure was invalid.");
    const failureEvidence = normalizeAttemptEvidenceV3<ProtectedApplicationResultEnvelopeV1>({
      version: 3,
      dispatchState: "dispatched",
      protectedResult: null,
      error: failure.error,
      responseStatus: "client_error",
      retryClass: "not_retryable",
      returnedModel: null,
      completion: null,
      usage: null,
      providerHttpStatus: 401,
      providerErrorCode: "synthetic_auth",
      providerRequestId: null,
      providerSystemFingerprint: null,
      durationMs: 1,
    });
    if (!failureEvidence.ok) throw new Error("Manual retry failure evidence failed.");
    const failed = await active.repository.settle({
      runId: created.value.runId,
      executionEnvironment: "test",
      leaseOwner: active.leaseOwner,
      leaseToken: active.leaseToken,
      leaseExpiresAt: active.marker.leaseExpiresAt,
      stateVersion: active.marker.stateVersion,
      evidence: failureEvidence.value,
    });
    if (failed.kind !== "settled") throw new Error("Manual retry failure settlement failed.");
    expect(failed).toMatchObject({ status: "failed", retryState: "not_retryable" });

    const retried = await service().manualRetry({
      runId: created.value.runId,
      actor,
      expectedStateVersion: failed.stateVersion,
    });
    expect(retried.ok).toBe(true);
    if (!retried.ok) throw new Error("Governed manual retry failed.");
    expect(retried.value).toMatchObject({ status: "pending", retryState: "scheduled" });

    const { settled, protectedResult } = await settleProtectedProductCandidate(created.value.runId);
    expect(settled).toMatchObject({ status: "draft_ready" });
    const [row] = await db().select({
      status: aiRuns.status,
      attemptCount: aiRuns.attemptCount,
      attemptHistory: aiRuns.attemptHistoryJson,
      candidateHash: aiRuns.candidateHash,
      candidate: aiRuns.candidateJson,
    }).from(aiRuns).where(eq(aiRuns.id, created.value.runId));
    expect(row).toMatchObject({
      status: "draft_ready",
      attemptCount: 2,
      candidateHash: protectedResult.hash,
      candidate: protectedResult.value,
    });
    const history = row?.attemptHistory as readonly Record<string, unknown>[];
    expect(history.map((entry) => ({
      attempt: entry.attempt,
      outcome: entry.outcome,
      failureCode: entry.failure_code,
    }))).toEqual([
      { attempt: 1, outcome: "failed", failureCode: "provider_auth_failed" },
      { attempt: 2, outcome: "draft_ready", failureCode: null },
    ]);

    const retryAudits = await db().select().from(auditLogs)
      .where(eq(auditLogs.action, "ai.run.manual_retry_scheduled"));
    expect(retryAudits).toHaveLength(1);
    expect(retryAudits[0]).toMatchObject({
      actorUserId: fixture.actorId,
      entityType: "ai_run",
      entityId: created.value.runId,
      beforeSummary: { stateVersion: failed.stateVersion },
      afterSummary: {
        status: "pending",
        retryState: "scheduled",
        stateVersion: retried.value.stateVersion,
      },
    });

    const read = await service().readRun({ runId: created.value.runId, actor });
    expect(read.ok, JSON.stringify(read)).toBe(true);
    if (!read.ok) return;
    expect(read.value.reviewProjection).toMatchObject({
      version: 1,
      run: { id: created.value.runId, candidateHash: protectedResult.hash },
      target: { kind: "product", locale: "en", draftVersion: 1 },
    });
  });

  it("returns one server-authorized protected projection immediately on draft_ready", async () => {
    const fixture = await seedFixture();
    const reviewer = await seedUser("reviewer_publisher");
    const created = await service().requestDraftAssistance(command(fixture, {
      idempotencyKey: randomUUID(),
    }));
    if (!created.ok) throw new Error("Protected projection enqueue failed.");
    const { protectedResult } = await settleProtectedProductCandidate(created.value.runId);

    for (const readActor of [
      { userId: fixture.actorId, role: "product_editor" as const },
      reviewer,
    ]) {
      const read = await service().readRun({ runId: created.value.runId, actor: readActor });
      expect(read.ok, JSON.stringify(read)).toBe(true);
      if (!read.ok) continue;
      expect(read.value.reviewProjection).toMatchObject({
        version: 1,
        run: { id: created.value.runId, candidateHash: protectedResult.hash },
        target: { kind: "product", locale: "en", draftVersion: 1 },
        before: { kind: "product", name: "Synthetic Run Service Product" },
      });
      expect(read.value.reviewProjection?.proposal.nodes).toHaveLength(3);
      expect(JSON.stringify(read.value.reviewProjection)).not.toMatch(
        new RegExp(`${fixture.productId}|targetProductId|candidateJson|sourceRefs|productCode`, "i"),
      );
    }
    const contentEditor = await seedUser("content_editor");
    expect(await service().readRun({
      runId: created.value.runId,
      actor: contentEditor,
    })).toMatchObject({ ok: false, error: { code: "authorization_denied" } });
  });

  it("atomically applies a Product Draft Candidate and exact-replays without a second mutation", async () => {
    const fixture = await seedFixture();
    await db().update(products).set({
      productCode: "SYNTHETIC-E4-PROTECTED-CODE",
      composition: "Synthetic protected composition",
      moqValue: "500",
      moqUnit: "kg",
    }).where(eq(products.id, fixture.productId));
    const actor = { userId: fixture.actorId, role: "product_editor" as const };
    const created = await service().requestDraftAssistance(command(fixture, {
      idempotencyKey: randomUUID(),
    }));
    if (!created.ok) throw new Error("Synthetic E4 Product enqueue failed.");
    await settleProtectedProductCandidate(created.value.runId);
    const application = await fullAcceptCommand(created.value.runId, actor);

    const applied = await service().applyDraftAssistanceCandidate({ actor, command: application });
    expect(applied).toMatchObject({ ok: true, value: {
      runId: created.value.runId,
      disposition: "accepted",
      appliedTargetVersion: 2,
      appliedRevisionId: null,
      appliedRevisionDraftVersion: null,
    } });
    const [localization] = await db().select().from(productLocalizations)
      .where(eq(productLocalizations.productId, fixture.productId));
    expect(localization).toMatchObject({
      name: "Synthetic product title",
      shortDescription: "Synthetic product summary",
      editorDocumentVersion: 2,
    });
    expect(parseBlockDocument(localization?.structuredBlocks, "product").blocks)
      .toMatchObject([{ type: "paragraph", text: "Synthetic product paragraph" }]);
    expect((await db().select().from(products).where(eq(products.id, fixture.productId)))[0])
      .toMatchObject({ productCode: "SYNTHETIC-E4-PROTECTED-CODE",
        composition: "Synthetic protected composition", moqValue: "500.00", moqUnit: "kg",
        status: "draft" });
    expect((await db().select().from(aiRuns).where(eq(aiRuns.id, created.value.runId)))[0])
      .toMatchObject({ humanDisposition: "accepted", stateVersion: application.expectedRunStateVersion + 1,
        appliedTargetVersion: 2, appliedRevisionId: null, appliedRevisionVersion: null });
    expect(await db().select().from(auditLogs)
      .where(eq(auditLogs.action, "ai.run.candidate_applied"))).toHaveLength(1);

    expect(await service().applyDraftAssistanceCandidate({ actor, command: application }))
      .toEqual(applied.ok ? { ...applied, value: { ...applied.value, exactReplay: true } } : applied);
    expect((await db().select().from(productLocalizations)
      .where(eq(productLocalizations.productId, fixture.productId)))[0]?.editorDocumentVersion).toBe(2);
    expect(await db().select().from(auditLogs)
      .where(eq(auditLogs.action, "ai.run.candidate_applied"))).toHaveLength(1);

    const changedCommands: ApplyAiDraftCandidateV1[] = [
      { ...application, decisions: application.decisions.map((decision, index) => index === 0
        ? { candidatePath: decision.candidatePath, decision: "rejected" as const }
        : decision) },
      { ...application, decisions: application.decisions.map((decision, index) => index === 0
        ? { ...decision, editedText: "Changed replay text" } : decision) },
      { ...application, decisions: application.decisions.map((decision) =>
        decision.insertAfterBlockId === undefined ? decision
          : { ...decision, insertAfterBlockId: "changed-anchor" }) },
      { ...application, decisions: [...application.decisions].reverse() },
      { ...application, expectedRunStateVersion: application.expectedRunStateVersion + 1 },
      { ...application, candidateHash: "f".repeat(64) },
      { ...application, expectedTargetVersion: application.expectedTargetVersion + 1 },
      { ...application, qualityRating: 4 },
      { ...application, qualityLabels: ["clarity"] },
      { ...application, qualityComment: "Changed replay quality evidence." },
    ];
    for (const changed of changedCommands) {
      expect(await service().applyDraftAssistanceCandidate({ actor, command: changed }))
        .toMatchObject({ ok: false, error: { code: "state_conflict" } });
    }
    expect((await db().select().from(productLocalizations)
      .where(eq(productLocalizations.productId, fixture.productId)))[0]?.editorDocumentVersion).toBe(2);
    expect((await db().select().from(aiRuns).where(eq(aiRuns.id, created.value.runId)))[0])
      .toMatchObject({ humanDisposition: "accepted", appliedTargetVersion: 2 });
    expect(await db().select().from(auditLogs)
      .where(eq(auditLogs.action, "ai.run.candidate_applied"))).toHaveLength(1);
  });

  it("fails closed when durable candidate_applied replay evidence is absent or malformed", async () => {
    const fixture = await seedFixture();
    const actor = { userId: fixture.actorId, role: "product_editor" as const };
    const created = await service().requestDraftAssistance(command(fixture, {
      idempotencyKey: randomUUID(),
    }));
    if (!created.ok) throw new Error("Synthetic E4 replay Audit enqueue failed.");
    await settleProtectedProductCandidate(created.value.runId);
    const application = await fullAcceptCommand(created.value.runId, actor);
    expect((await service().applyDraftAssistanceCandidate({ actor, command: application })).ok)
      .toBe(true);
    const [audit] = await db().select().from(auditLogs).where(and(
      eq(auditLogs.action, "ai.run.candidate_applied"),
      eq(auditLogs.entityId, created.value.runId),
    ));
    if (audit === undefined || typeof audit.afterSummary !== "object" ||
      audit.afterSummary === null || Array.isArray(audit.afterSummary)) {
      throw new Error("Synthetic E4 replay Audit fixture failed.");
    }
    const original = audit.afterSummary as Record<string, unknown>;
    const conflict = async () => expect(await service().applyDraftAssistanceCandidate({
      actor, command: application,
    })).toMatchObject({ ok: false, error: { code: "state_conflict" } });
    await db().delete(auditLogs).where(eq(auditLogs.id, audit.id));
    await conflict();
    await db().insert(auditLogs).values({
      id: audit.id,
      actorUserId: audit.actorUserId,
      action: audit.action,
      entityType: audit.entityType,
      entityId: audit.entityId,
      beforeSummary: audit.beforeSummary,
      afterSummary: audit.afterSummary,
      createdAt: audit.createdAt,
    });
    await db().update(auditLogs).set({ beforeSummary: {
      stateVersion: application.expectedRunStateVersion + 1,
      targetVersion: application.expectedTargetVersion,
    } }).where(eq(auditLogs.id, audit.id));
    await conflict();
    await db().update(auditLogs).set({ beforeSummary: audit.beforeSummary })
      .where(eq(auditLogs.id, audit.id));
    const { applyCommandFingerprint: omitted, ...missingFingerprint } = original;
    expect(omitted).toBeDefined();
    for (const afterSummary of [
      missingFingerprint,
      { ...original, applyCommandFingerprint: { version: "1", hash: "f".repeat(64) } },
      { ...original, applyCommandFingerprint: { version: 2, hash: "f".repeat(64) } },
      { ...original, applyCommandFingerprint: { version: 1, hash: "f".repeat(64) } },
    ]) {
      await db().update(auditLogs).set({ afterSummary }).where(eq(auditLogs.id, audit.id));
      await conflict();
    }
    await db().update(auditLogs).set({ afterSummary: original }).where(eq(auditLogs.id, audit.id));
    await db().insert(auditLogs).values({
      actorUserId: audit.actorUserId,
      action: audit.action,
      entityType: audit.entityType,
      entityId: audit.entityId,
      beforeSummary: audit.beforeSummary,
      afterSummary: audit.afterSummary,
    });
    await conflict();
    expect((await db().select().from(productLocalizations)
      .where(eq(productLocalizations.productId, fixture.productId)))[0]?.editorDocumentVersion).toBe(2);
    expect((await db().select().from(aiRuns).where(eq(aiRuns.id, created.value.runId)))[0])
      .toMatchObject({ humanDisposition: "accepted", stateVersion: application.expectedRunStateVersion + 1 });
  });

  it("atomically applies a Content Draft Candidate while excluding preview-only outline", async () => {
    const actor = await seedUser("content_editor");
    const fixture = await seedContentFixture(actor);
    const created = await service().requestDraftAssistance(contentCommand(fixture, actor));
    if (!created.ok) throw new Error("Synthetic E4 Content enqueue failed.");
    await settleProtectedContentCandidate(created.value.runId);
    const application = await fullAcceptCommand(created.value.runId, actor);
    expect(application.decisions.some((decision) => decision.candidatePath.startsWith("/outline/")))
      .toBe(false);

    expect(await service().applyDraftAssistanceCandidate({ actor, command: application }))
      .toMatchObject({
      ok: true,
      value: { disposition: "accepted", appliedTargetVersion: 2 },
    });
    const [localization] = await db().select().from(contentLocalizations)
      .where(eq(contentLocalizations.contentId, fixture.contentId));
    expect(localization).toMatchObject({
      title: "Synthetic fabric title",
      excerpt: "Synthetic fabric summary",
      editorDocumentVersion: 2,
    });
    expect(parseBlockDocument(localization?.structuredBlocks, "content").blocks)
      .toMatchObject([{ type: "paragraph", text: "Synthetic fabric paragraph" }]);
    expect(await db().select().from(auditLogs)
      .where(eq(auditLogs.action, "ai.run.candidate_applied"))).toHaveLength(1);
  });

  it("updates only exact selected Product media alt/caption and preserves relation and rights", async () => {
    const fixture = await seedFixture();
    const actor = { userId: fixture.actorId, role: "product_editor" as const };
    const [asset] = await db().insert(assets).values({
      uploadedByUserId: fixture.actorId,
      originalFileName: "synthetic-e4-public.png",
      storageProvider: "local",
      storagePartition: "public",
      objectKey: `synthetic/e4/${randomUUID()}.png`,
      access: "public",
      category: "product",
      status: "ready",
      declaredMimeType: "image/png",
      detectedMimeType: "image/png",
      byteSize: 4,
      sha256: hash("7"),
      scanStatus: "passed",
      rightsStatus: "verified",
    }).returning({ id: assets.id });
    if (asset === undefined) throw new Error("Synthetic E4 media fixture failed.");
    await db().insert(productAssets).values({
      productId: fixture.productId,
      assetId: asset.id,
      role: "gallery",
      sortOrder: 7,
      altText: "Before alt",
      caption: "Before caption",
      isVisible: true,
    });
    const created = await service().requestDraftAssistance(command(fixture, {
      idempotencyKey: randomUUID(),
      selectedMediaPlacementIds: [asset.id],
    }));
    if (!created.ok) throw new Error(`Synthetic E4 media enqueue failed: ${created.error.code}`);
    await settleProtectedProductCandidate(created.value.runId);
    const application = await fullAcceptCommand(created.value.runId, actor);
    expect(application.decisions.filter((decision) =>
      decision.candidatePath.startsWith("/mediaTextProposals/"))).toHaveLength(2);
    expect(await service().applyDraftAssistanceCandidate({ actor, command: application }))
      .toMatchObject({ ok: true, value: { disposition: "accepted" } });
    expect((await db().select().from(productAssets).where(eq(productAssets.assetId, asset.id)))[0])
      .toMatchObject({ role: "gallery", sortOrder: 7, isVisible: true,
        altText: "Synthetic accessible textile swatch", caption: "Synthetic swatch caption" });
    expect((await db().select().from(assets).where(eq(assets.id, asset.id)))[0])
      .toMatchObject({ storagePartition: "public", access: "public", status: "ready",
        rightsStatus: "verified" });
  });

  it("rolls Product target and run disposition back together when required Apply Audit fails", async () => {
    const fixture = await seedFixture();
    const actor = { userId: fixture.actorId, role: "product_editor" as const };
    const created = await service().requestDraftAssistance(command(fixture, {
      idempotencyKey: randomUUID(),
    }));
    if (!created.ok) throw new Error("Synthetic E4 rollback enqueue failed.");
    await settleProtectedProductCandidate(created.value.runId);
    const application = await fullAcceptCommand(created.value.runId, actor);
    const failed = await service(async () => {
      throw new Error("TEST required E4 Audit failure");
    }).applyDraftAssistanceCandidate({ actor, command: application });
    expect(failed).toMatchObject({ ok: false, error: { code: "internal_failure" } });
    expect((await db().select().from(productLocalizations)
      .where(eq(productLocalizations.productId, fixture.productId)))[0])
      .toMatchObject({ name: "Synthetic Run Service Product", editorDocumentVersion: 1 });
    expect((await db().select().from(aiRuns).where(eq(aiRuns.id, created.value.runId)))[0])
      .toMatchObject({ humanDisposition: "not_evaluated",
        stateVersion: application.expectedRunStateVersion, appliedTargetVersion: null });
    expect(await db().select().from(auditLogs)
      .where(eq(auditLogs.action, "ai.run.candidate_applied"))).toHaveLength(0);
  });

  it("updates only the current Product and Content Draft Revisions and preserves live copy", async () => {
    const product = await seedFixture();
    const productActor = { userId: product.actorId, role: "product_editor" as const };
    await db().update(products).set({ status: "published" }).where(eq(products.id, product.productId));
    const [productRevision] = await db().insert(editorialRevisions).values({
      entityType: "product",
      entityId: product.productId,
      locale: "en",
      versionNumber: 9,
      status: "draft",
      snapshot: {
        kind: "editorial_blocks",
        name: "Synthetic Product Revision Before",
        shortDescription: null,
        document: { version: 1, blocks: [] },
        expectedEditorDocumentVersion: 1,
        draftVersion: 1,
        pendingChanges: [],
      },
      createdByUserId: product.actorId,
    }).returning({ id: editorialRevisions.id });
    if (productRevision === undefined) throw new Error("Product Revision fixture failed.");
    const productCreated = await service().requestDraftAssistance(command(product, {
      idempotencyKey: randomUUID(),
      target: { type: "editorial_revision", revisionId: productRevision.id,
        expectedVersion: 1 },
    }));
    if (!productCreated.ok) throw new Error(`Product Revision enqueue failed: ${productCreated.error.code}`);
    await settleProtectedProductCandidate(productCreated.value.runId);
    const productApplication = await fullAcceptCommand(productCreated.value.runId, productActor);
    expect(await service().applyDraftAssistanceCandidate({
      actor: productActor, command: productApplication,
    })).toMatchObject({ ok: true, value: { appliedTargetVersion: null,
      appliedRevisionId: productRevision.id, appliedRevisionDraftVersion: 2 } });
    const [productLive] = await db().select().from(productLocalizations)
      .where(eq(productLocalizations.productId, product.productId));
    expect(productLive).toMatchObject({ name: "Synthetic Run Service Product",
      editorDocumentVersion: 1 });
    const [productRevisionAfter] = await db().select().from(editorialRevisions)
      .where(eq(editorialRevisions.id, productRevision.id));
    expect(productRevisionAfter?.snapshot).toMatchObject({
      name: "Synthetic product title", shortDescription: "Synthetic product summary", draftVersion: 2,
    });

    const contentActor = await seedUser("content_editor");
    const content = await seedContentFixture(contentActor);
    await db().update(contents).set({ status: "published" }).where(eq(contents.id, content.contentId));
    const [contentRevision] = await db().insert(editorialRevisions).values({
      entityType: "content",
      entityId: content.contentId,
      locale: "en",
      versionNumber: 11,
      status: "draft",
      snapshot: {
        kind: "content_blocks_v1",
        title: "Synthetic Content Revision Before",
        excerpt: null,
        document: { version: 1, blocks: [] },
        expectedEditorDocumentVersion: 1,
        draftVersion: 1,
      },
      createdByUserId: contentActor.userId,
    }).returning({ id: editorialRevisions.id });
    if (contentRevision === undefined) throw new Error("Content Revision fixture failed.");
    const contentCreated = await service().requestDraftAssistance(contentCommand(
      content,
      contentActor,
      { type: "editorial_revision", revisionId: contentRevision.id, expectedVersion: 1 },
    ));
    if (!contentCreated.ok) throw new Error(`Content Revision enqueue failed: ${contentCreated.error.code}`);
    await settleProtectedContentCandidate(contentCreated.value.runId);
    const contentApplication = await fullAcceptCommand(contentCreated.value.runId, contentActor);
    const contentApplied = await service().applyDraftAssistanceCandidate({
      actor: contentActor, command: contentApplication,
    });
    expect(contentApplied).toMatchObject({ ok: true, value: { appliedTargetVersion: null,
      appliedRevisionId: contentRevision.id, appliedRevisionDraftVersion: 2 } });
    expect(await service().applyDraftAssistanceCandidate({
      actor: contentActor, command: contentApplication,
    })).toEqual(contentApplied.ok
      ? { ...contentApplied, value: { ...contentApplied.value, exactReplay: true } }
      : contentApplied);
    const [contentLive] = await db().select().from(contentLocalizations)
      .where(eq(contentLocalizations.contentId, content.contentId));
    expect(contentLive).toMatchObject({ title: "Synthetic Run Service Content",
      editorDocumentVersion: 1 });
    const [contentRevisionAfter] = await db().select().from(editorialRevisions)
      .where(eq(editorialRevisions.id, contentRevision.id));
    expect(contentRevisionAfter?.snapshot).toMatchObject({
      title: "Synthetic fabric title", excerpt: "Synthetic fabric summary", draftVersion: 2,
    });
  });

  it("allows one winner under independent concurrent Product Apply connections", async () => {
    const fixture = await seedFixture();
    const actor = { userId: fixture.actorId, role: "product_editor" as const };
    const created = await service().requestDraftAssistance(command(fixture, {
      idempotencyKey: randomUUID(),
    }));
    if (!created.ok) throw new Error("Synthetic E4 race enqueue failed.");
    await settleProtectedProductCandidate(created.value.runId);
    const application = await fullAcceptCommand(created.value.runId, actor);
    const contenders = await Promise.all([
      service().applyDraftAssistanceCandidate({ actor, command: application }),
      service().applyDraftAssistanceCandidate({ actor, command: application }),
    ]);
    const winner = contenders.find((result) => result.ok);
    expect(winner).toMatchObject({ ok: true, value: { exactReplay: false } });
    expect(contenders.filter((result) => !result.ok)).toEqual([
      expect.objectContaining({ ok: false, error: expect.objectContaining({ code: "state_conflict" }) }),
    ]);
    expect(await service().applyDraftAssistanceCandidate({ actor, command: application }))
      .toEqual(winner?.ok
        ? { ...winner, value: { ...winner.value, exactReplay: true } }
        : winner);
    expect((await db().select().from(productLocalizations)
      .where(eq(productLocalizations.productId, fixture.productId)))[0]?.editorDocumentVersion).toBe(2);
    expect(await db().select().from(auditLogs)
      .where(eq(auditLogs.action, "ai.run.candidate_applied"))).toHaveLength(1);
  });

  it("never false-replays semantically different independent Apply contenders", async () => {
    const fixture = await seedFixture();
    const actor = { userId: fixture.actorId, role: "product_editor" as const };
    const created = await service().requestDraftAssistance(command(fixture, {
      idempotencyKey: randomUUID(),
    }));
    if (!created.ok) throw new Error("Synthetic E4 distinct race enqueue failed.");
    await settleProtectedProductCandidate(created.value.runId);
    const application = await fullAcceptCommand(created.value.runId, actor);
    const changed = { ...application, decisions: application.decisions.map((decision, index) =>
      index === 0 ? { candidatePath: decision.candidatePath, decision: "rejected" as const }
        : decision) };
    const contenders = await Promise.all([
      service().applyDraftAssistanceCandidate({ actor, command: application }),
      service().applyDraftAssistanceCandidate({ actor, command: changed }),
    ]);
    const winnerIndex = contenders.findIndex((result) => result.ok);
    expect(winnerIndex).toBeGreaterThanOrEqual(0);
    const winner = contenders[winnerIndex]!;
    expect(winner).toMatchObject({ ok: true, value: { exactReplay: false } });
    expect(contenders.filter((result) => !result.ok)).toEqual([
      expect.objectContaining({ ok: false, error: expect.objectContaining({ code: "state_conflict" }) }),
    ]);
    const winningCommand = winnerIndex === 0 ? application : changed;
    const losingCommand = winnerIndex === 0 ? changed : application;
    expect(await service().applyDraftAssistanceCandidate({ actor, command: winningCommand }))
      .toEqual(winner.ok
        ? { ...winner, value: { ...winner.value, exactReplay: true } }
        : winner);
    expect(await service().applyDraftAssistanceCandidate({ actor, command: losingCommand }))
      .toMatchObject({ ok: false, error: { code: "state_conflict" } });
    expect((await db().select().from(productLocalizations)
      .where(eq(productLocalizations.productId, fixture.productId)))[0]?.editorDocumentVersion).toBe(2);
    expect(await db().select().from(auditLogs)
      .where(eq(auditLogs.action, "ai.run.candidate_applied"))).toHaveLength(1);
  });

  it("denies Reviewer-only Apply and stale target fences with zero mutation", async () => {
    const fixture = await seedFixture();
    const actor = { userId: fixture.actorId, role: "product_editor" as const };
    const reviewer = await seedUser("reviewer_publisher");
    const created = await service().requestDraftAssistance(command(fixture, {
      idempotencyKey: randomUUID(),
    }));
    if (!created.ok) throw new Error("Synthetic E4 authorization enqueue failed.");
    await settleProtectedProductCandidate(created.value.runId);
    const application = await fullAcceptCommand(created.value.runId, actor);
    expect(await service().applyDraftAssistanceCandidate({ actor: reviewer, command: application }))
      .toMatchObject({ ok: false, error: { code: "authorization_denied" } });
    expect(await service().applyDraftAssistanceCandidate({ actor, command: {
      ...application,
      expectedTargetVersion: application.expectedTargetVersion + 1,
    } })).toMatchObject({ ok: false });
    expect((await db().select().from(productLocalizations)
      .where(eq(productLocalizations.productId, fixture.productId)))[0]?.editorDocumentVersion).toBe(1);
    expect((await db().select().from(aiRuns).where(eq(aiRuns.id, created.value.runId)))[0])
      .toMatchObject({ humanDisposition: "not_evaluated",
        stateVersion: application.expectedRunStateVersion });
    expect(await db().select().from(auditLogs)
      .where(eq(auditLogs.action, "ai.run.candidate_applied"))).toHaveLength(0);
  });

  it("returns the protected Content projection only to authorized Content roles", async () => {
    const contentEditor = await seedUser("content_editor");
    const reviewer = await seedUser("reviewer_publisher");
    const productEditor = await seedUser("product_editor");
    const fixture = await seedContentFixture(contentEditor);
    const created = await service().requestDraftAssistance(contentCommand(fixture, contentEditor));
    if (!created.ok) throw new Error("Protected Content projection enqueue failed.");
    const { protectedResult } = await settleProtectedContentCandidate(created.value.runId);

    for (const readActor of [contentEditor, reviewer]) {
      const read = await service().readRun({ runId: created.value.runId, actor: readActor });
      expect(read.ok, JSON.stringify(read)).toBe(true);
      if (!read.ok) continue;
      expect(read.value.reviewProjection).toMatchObject({
        version: 1,
        run: { id: created.value.runId, candidateHash: protectedResult.hash },
        target: { kind: "content", locale: "en", draftVersion: 1, channel: "fabric_knowledge" },
        before: { kind: "content", title: "Synthetic Run Service Content" },
      });
      expect(read.value.reviewProjection?.proposal.nodes).toHaveLength(4);
      expect(JSON.stringify(read.value.reviewProjection)).not.toMatch(
        new RegExp(`${fixture.contentId}|targetContentId|candidateJson|sourceRefs`, "i"),
      );
    }
    expect(await service().readRun({ runId: created.value.runId, actor: productEditor }))
      .toMatchObject({ ok: false, error: { code: "authorization_denied" } });
  });

  it("fails closed for stored Candidate substitution and target version drift", async () => {
    const fixture = await seedFixture();
    const created = await service().requestDraftAssistance(command(fixture, {
      idempotencyKey: randomUUID(),
    }));
    if (!created.ok) throw new Error("Protected projection enqueue failed.");
    const { protectedResult } = await settleProtectedProductCandidate(created.value.runId);
    await db().update(aiRuns).set({
      candidateJson: { ...protectedResult.value, unknown: "substitution" },
    }).where(eq(aiRuns.id, created.value.runId));
    expect((await service().readRun({
      runId: created.value.runId,
      actor: { userId: fixture.actorId, role: "product_editor" },
    })).ok).toBe(false);

    await db().update(aiRuns).set({ candidateJson: protectedResult.value })
      .where(eq(aiRuns.id, created.value.runId));
    await db().update(productLocalizations).set({ editorDocumentVersion: 2 })
      .where(eq(productLocalizations.productId, fixture.productId));
    expect((await service().readRun({
      runId: created.value.runId,
      actor: { userId: fixture.actorId, role: "product_editor" },
    })).ok).toBe(false);
  });

  it("allows persisted Reviewer Product/Content disposition and Admin all-scope disposition", async () => {
    const fixture = await seedFixture();
    const reviewer = await seedUser("reviewer_publisher");
    const sales = await seedUser("sales");
    const contentEditor = await seedUser("content_editor");
    const admin = await seedUser("admin");
    const created = await service().requestDraftAssistance(command(fixture, {
      idempotencyKey: randomUUID(),
    }));
    if (!created.ok) throw new Error("Synthetic enqueue failed.");
    const settled = await settleDraftReady(created.value.runId, hash("c"));
    const productDisposition = {
      runId: created.value.runId,
      expectedStateVersion: settled.stateVersion,
      disposition: "rejected" as const,
      candidateHash: hash("c"),
      qualityRating: 2,
      qualityLabels: ["factual_issue", "unsafe_claim"] as const,
      qualityComment: "Synthetic quality note.",
    };
    expect(await service().rejectDisposition({
      ...productDisposition,
      actor: { userId: sales.userId, role: "admin" },
    })).toMatchObject({ ok: false, error: { code: "authorization_denied" } });
    expect(await db().select().from(auditLogs)
      .where(eq(auditLogs.action, "ai.run.disposition_recorded"))).toHaveLength(0);
    await expect(service(async () => {
      throw new Error("TEST disposition Audit failure");
    }).rejectDisposition({
      ...productDisposition,
      actor: reviewer,
    })).rejects.toThrow(/disposition Audit failure/);
    expect((await db().select().from(aiRuns).where(eq(aiRuns.id, created.value.runId)))[0])
      .toMatchObject({ humanDisposition: "not_evaluated", stateVersion: settled.stateVersion });
    const accepted = await service().rejectDisposition({
      ...productDisposition,
      actor: reviewer,
    });
    expect(accepted.ok).toBe(true);

    const content = await seedContentFixture(contentEditor);
    const contentCreated = await service().requestDraftAssistance(contentCommand(content, contentEditor));
    if (!contentCreated.ok) throw new Error(`Synthetic Content enqueue failed: ${contentCreated.error.code}`);
    const contentSettled = await settleDraftReady(contentCreated.value.runId, hash("d"));
    const contentDisposition = {
      runId: contentCreated.value.runId,
      expectedStateVersion: contentSettled.stateVersion,
      disposition: "rejected" as const,
      candidateHash: hash("d"),
      qualityRating: 3,
      qualityLabels: ["clarity"] as const,
      qualityComment: "Synthetic Content quality note.",
    };
    expect(await service().rejectDisposition({
      ...contentDisposition,
      actor: { userId: fixture.actorId, role: "product_editor" },
    })).toMatchObject({ ok: false, error: { code: "authorization_denied" } });
    expect((await service().rejectDisposition({
      ...contentDisposition,
      actor: reviewer,
    })).ok).toBe(true);

    const adminCreated = await service().requestDraftAssistance(command(fixture, {
      idempotencyKey: randomUUID(),
    }));
    if (!adminCreated.ok) throw new Error("Synthetic Admin disposition fixture failed.");
    const adminSettled = await settleDraftReady(adminCreated.value.runId, hash("e"));
    expect((await service().rejectDisposition({
      runId: adminCreated.value.runId,
      actor: admin,
      expectedStateVersion: adminSettled.stateVersion,
      disposition: "rejected",
      candidateHash: hash("e"),
      qualityRating: null,
      qualityLabels: [],
      qualityComment: null,
    })).ok).toBe(true);
    expect(await db().select().from(auditLogs)
      .where(eq(auditLogs.action, "ai.run.disposition_recorded"))).toHaveLength(3);
    expect(await db().select().from(auditLogs).where(eq(auditLogs.actorUserId, sales.userId)))
      .toHaveLength(0);
    expect(await db().select().from(auditLogs).where(eq(auditLogs.actorUserId, reviewer.userId)))
      .toHaveLength(2);
    expect(await db().select().from(auditLogs).where(eq(auditLogs.actorUserId, admin.userId)))
      .toHaveLength(1);
    expect(accepted).toMatchObject({
      ok: true,
      value: { humanDisposition: "rejected" },
    });
  });
});
