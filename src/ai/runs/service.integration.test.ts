import { randomUUID } from "node:crypto";

import { count, eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres, { type Sql } from "postgres";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { createPhaseCDurableDraftAssistanceServiceV1 } from "@/ai/applications/draft-assistance/composition";
import type { DraftAssistanceCommandV1 } from "@/ai/applications/draft-assistance/contracts";
import type { ProtectedApplicationResultEnvelopeV1 } from "@/ai/core/contracts";
import type { PromptBundleLoaderV1 } from "@/ai/prompts/loader";
import { createTextProviderRegistryV1 } from "@/ai/providers/registry";
import { localTestPricingPolicyRegistryV1 } from "@/ai/runs/pricing-policy";
import { normalizeAttemptEvidenceV2 } from "@/ai/runs/attempt-evidence";
import { createAiRunRepositoryV1 } from "@/ai/runs/repository";
import { aiFailure } from "@/ai/errors";
import { createFakeTextProviderV1 } from "@/ai/testing/fake-text-provider";
import type { DatabaseConnection, PostgresAppDatabase } from "@/db/client";
import { migrateDatabase } from "@/db/migrate";
import {
  aiModelConfig,
  aiRuns,
  auditLogs,
  featureFlags,
  productLocalizations,
  productTaxonomyTerms,
  products,
  taxonomyTerms,
  users,
} from "@/db/schema";
import * as schema from "@/db/schema";

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
        variables: [
          { name: "locale", type: "string", maximumUtf8Bytes: 16 },
          { name: "product_context_json", type: "json", maximumUtf8Bytes: 49_152 },
          { name: "media_placement_refs_json", type: "json", maximumUtf8Bytes: 8_192 },
          {
            name: "requested_tone",
            type: "enum",
            values: ["concise_professional_b2b", "neutral_editorial"],
          },
        ],
        body: [
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
  await db().insert(aiModelConfig).values({
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
  });
  return { actorId: actor.id, productId };
}

function command(fixture: Awaited<ReturnType<typeof seedFixture>>, input: {
  readonly idempotencyKey: string;
  readonly explicitInput?: string;
}): DraftAssistanceCommandV1 {
  return {
    useCase: "product_description_draft",
    actor: { userId: fixture.actorId, role: "product_editor" },
    target: {
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
    await db().execute(sql`truncate table ${aiRuns}, ${aiModelConfig}, ${auditLogs}, ${featureFlags}, ${productLocalizations}, ${products}, ${users} cascade`);
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

  it("cancels an owned pending run with one required Audit and rejects stale replay", async () => {
    const fixture = await seedFixture();
    const created = await service().requestDraftAssistance(command(fixture, {
      idempotencyKey: randomUUID(),
    }));
    if (!created.ok) throw new Error("Synthetic enqueue failed.");
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
    const audits = await db().select().from(auditLogs).where(eq(auditLogs.action, "ai.run.cancelled"));
    expect(audits).toHaveLength(1);
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
    const created = await service().requestDraftAssistance(command(fixture, {
      idempotencyKey: randomUUID(),
    }));
    if (!created.ok) throw new Error("Synthetic enqueue failed.");
    const active = await claimAndMark(created.value.runId);
    const failure = aiFailure("provider_auth_failed");
    if (failure.ok) throw new Error("Static Provider auth failure was invalid.");
    const evidence = normalizeAttemptEvidenceV2<ProtectedApplicationResultEnvelopeV1>({
      version: 2,
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
    const retried = await service().manualRetry({
      runId: created.value.runId,
      actor: { userId: fixture.actorId, role: "product_editor" },
      expectedStateVersion: settled.stateVersion,
    });
    expect(retried.ok).toBe(true);
    if (retried.ok) expect(retried.value).toMatchObject({ status: "pending", retryState: "scheduled" });
    expect(await db().select().from(auditLogs)
      .where(eq(auditLogs.action, "ai.run.manual_retry_scheduled"))).toHaveLength(1);
  });

  it("records a write-once rejected disposition and rolls back on Audit failure", async () => {
    const fixture = await seedFixture();
    const created = await service().requestDraftAssistance(command(fixture, {
      idempotencyKey: randomUUID(),
    }));
    if (!created.ok) throw new Error("Synthetic enqueue failed.");
    const active = await claimAndMark(created.value.runId);
    const evidence = normalizeAttemptEvidenceV2<ProtectedApplicationResultEnvelopeV1>({
      version: 2,
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
        hash: hash("c"),
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
      durationMs: 2,
    });
    if (!evidence.ok) throw new Error("Synthetic candidate evidence failed.");
    const settled = await active.repository.settle({
      runId: created.value.runId,
      executionEnvironment: "test",
      leaseOwner: active.leaseOwner,
      leaseToken: active.leaseToken,
      leaseExpiresAt: active.marker.leaseExpiresAt,
      stateVersion: active.marker.stateVersion,
      evidence: evidence.value,
    });
    if (settled.kind !== "settled") throw new Error("Synthetic candidate settlement failed.");
    await expect(service(async () => {
      throw new Error("TEST disposition Audit failure");
    }).rejectDisposition({
      runId: created.value.runId,
      actor: { userId: fixture.actorId, role: "product_editor" },
      expectedStateVersion: settled.stateVersion,
      disposition: "rejected",
      candidateHash: hash("c"),
      qualityRating: 2,
      qualityLabels: ["factual_issue", "unsafe_claim"],
      qualityComment: "Synthetic quality note.",
    })).rejects.toThrow(/disposition Audit failure/);
    const accepted = await service().rejectDisposition({
      runId: created.value.runId,
      actor: { userId: fixture.actorId, role: "product_editor" },
      expectedStateVersion: settled.stateVersion,
      disposition: "rejected",
      candidateHash: hash("c"),
      qualityRating: 2,
      qualityLabels: ["factual_issue", "unsafe_claim"],
      qualityComment: "Synthetic quality note.",
    });
    expect(accepted.ok).toBe(true);
    if (accepted.ok) expect(accepted.value).toMatchObject({ humanDisposition: "rejected" });
    expect(await db().select().from(auditLogs)
      .where(eq(auditLogs.action, "ai.run.disposition_recorded"))).toHaveLength(1);
  });
});
