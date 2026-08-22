import type { PgliteQueryResultHKT } from "drizzle-orm/pglite";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  buildAuthorizedDraftAssociationV1,
  encodeDraftTargetColumnsV1,
  prepareDraftAssociationV1,
} from "@/ai/applications/draft-assistance/association";
import { canonicalJsonHash } from "@/ai/canonical-json";
import {
  createDraftAvailabilityAuthorization,
  createDraftRequestAuthorization,
} from "@/ai/applications/draft-assistance/authorization";
import { createDraftContextPolicy } from "@/ai/applications/draft-assistance/context";
import { withReadOnlyDraftAvailabilityScope } from "@/ai/applications/draft-assistance/read-scopes";
import { aiFailure } from "@/ai/errors";
import { constructPreDispatchClaimedRunV2 } from "@/ai/internal/claimed-run-authority";
import { resolvedConfigHashV1 } from "@/ai/internal/preparation";
import type { PromptBundleLoaderV1 } from "@/ai/prompts/loader";
import { createTextProviderRegistryV1 } from "@/ai/providers/registry";
import {
  createProductionClaimedApplicationRegistryV1,
  type DraftRegistryDependenciesV1,
} from "@/ai/registry/production-use-cases";
import { createFakeTextProviderV1 } from "@/ai/testing/fake-text-provider";
import { createTestDatabase } from "@/test/database";

import { createAiClaimedExecutionServiceV2 } from "./orchestrator";

const promptHash = "a".repeat(64);
const envelopeHash = "b".repeat(64);
const configId = "44444444-4444-4444-8444-444444444444";

describe("strict claimed reconstruction and one-call execution", () => {
  let database: Awaited<ReturnType<typeof createTestDatabase>>;

  beforeAll(async () => { database = await createTestDatabase(); });
  afterAll(async () => database.close());

  async function fixture() {
    const contextPolicy = createDraftContextPolicy<PgliteQueryResultHKT>({
      async readSelectedSource() { return aiFailure("integration_not_ready"); },
      async readSelectedInternalLinks(input) {
        return input.selectedLinkIds.length === 0
          ? { ok: true, value: [] } as const
          : aiFailure("integration_not_ready");
      },
      async readSelectedMediaPlacements(input) {
        return input.selectedPlacementIds.length === 0
          ? { ok: true, value: [] } as const
          : aiFailure("integration_not_ready");
      },
    });
    const dependencies: DraftRegistryDependenciesV1<PgliteQueryResultHKT> = {
      availabilityAuthorization: createDraftAvailabilityAuthorization({
        async authorizeAndReadTargetForAvailability() { return aiFailure("integration_not_ready"); },
      }),
      requestAuthorization: createDraftRequestAuthorization<PgliteQueryResultHKT>(),
      contextPolicy,
      featureRepository: {
        async readAiFeatureState() { return aiFailure("integration_not_ready"); },
      },
      configRepository: {
        async readResolutionState() { return aiFailure("integration_not_ready"); },
      },
    };
    const association = prepareDraftAssociationV1({
      type: "product_draft",
      productId: "11111111-1111-4111-8111-111111111111",
      locale: "en",
      expectedVersion: 7,
    });
    if (!association.ok) throw new Error("Synthetic association preparation failed.");
    const authorized = buildAuthorizedDraftAssociationV1(association.value);
    if (!authorized.ok) throw new Error("Synthetic association authorization failed.");
    const columns = encodeDraftTargetColumnsV1(authorized.value);
    if (!columns.ok) throw new Error("Synthetic association encoding failed.");
    const context = await withReadOnlyDraftAvailabilityScope(database.db, (scope) =>
      contextPolicy.buildReconstructibleContext({
        actor: { principalId: "99999999-9999-4999-8999-999999999999", roleKey: "admin" },
        command: {
          useCase: "product_description_draft",
          task: {
            kind: "product_description_draft",
            tone: "concise_professional_b2b",
            selectedMediaPlacementIds: [],
          },
          actor: { userId: "99999999-9999-4999-8999-999999999999", role: "admin" },
          target: {
            type: "product_draft",
            productId: "11111111-1111-4111-8111-111111111111",
            locale: "en",
            expectedVersion: 7,
          },
          idempotencyKey: "synthetic-claimed-run",
          contextSelections: [{ sourceClass: "explicit_human_input", origin: "typed_brief" }],
          explicitInput: "SYNTHETIC TEST DATA — NOT A CWT FACT: concise textile overview.",
        },
        association: authorized.value,
        scope,
      })
    );
    if (!context.ok) throw new Error("Synthetic context preparation failed.");
    const prepared = contextPolicy.encodePreparedContext(context.value);
    if (!prepared.ok) throw new Error("Synthetic context encoding failed.");
    const configHash = resolvedConfigHashV1({
      applicationClass: "draft_assistance",
      capability: "text",
      useCase: "product_description_draft",
      modelConfigId: configId,
      modelConfigVersion: 4,
      requestedProvider: "synthetic_alpha",
      requestedModel: "synthetic-text-alpha-v1",
      parametersSnapshot: { temperature: 0, top_p: 1 },
      maxInputTokens: 16_000,
      maxOutputTokens: 4_000,
      maxAttempts: 3,
      runCostLimitMicrousd: 20_000,
      promptId: "product-description-draft",
      promptVersion: 1,
      promptHash,
      providerEnvelope: { version: 1, hash: envelopeHash },
      inputSchemaVersion: 1,
      outputSchemaVersion: 1,
      policyVersion: "draft-product-description-v1",
    });
    if (!configHash.ok) throw new Error("Synthetic config protection failed.");
    const row = {
      claimAuthority: { version: 1 as const, owner: "product" as const },
      runId: "66666666-6666-4666-8666-666666666666",
      applicationClass: "draft_assistance",
      capability: "text",
      useCase: "product_description_draft",
      idempotencyKey: "77777777-7777-4777-8777-777777777777",
      requestFingerprintVersion: 1,
      requestFingerprint: "f".repeat(64),
      ...columns.value,
      modelConfigId: configId,
      modelConfigVersion: 4,
      resolvedConfigHash: configHash.value.hash,
      requestedProvider: "synthetic_alpha",
      actualProvider: null,
      requestedModel: "synthetic-text-alpha-v1",
      parametersSnapshotJson: { temperature: 0, top_p: 1 },
      maxInputTokens: 16_000,
      maxOutputTokens: 4_000,
      maxAttempts: 3,
      runCostLimitMicrousd: 20_000,
      promptId: "product-description-draft",
      promptVersion: 1,
      promptHash,
      providerEnvelopeVersion: 1,
      providerEnvelopeHash: envelopeHash,
      inputSchemaVersion: 1,
      outputSchemaVersion: 1,
      policyVersion: "draft-product-description-v1",
      inputContextJson: prepared.value.inputContext,
      inputSourcesJson: prepared.value.inputSources,
      inputHash: prepared.value.inputHash,
      status: "processing",
      retryState: "none",
      attemptCount: 1,
      leaseOwner: "phase-c-test-worker",
      leaseToken: "55555555-5555-4555-8555-555555555555",
      leaseExpiresAt: new Date("2026-08-10T00:01:01.000Z"),
      stateVersion: 3,
      activeAttemptDispatchedAt: null,
      providerDispatchedAt: null,
    };
    return {
      row,
      registry: createProductionClaimedApplicationRegistryV1(dependencies),
    };
  }

  it("reconstructs all provenance and permits exactly one fake adapter call", async () => {
    const { row, registry } = await fixture();
    const claimed = constructPreDispatchClaimedRunV2({ row, applicationRegistry: registry });
    expect(claimed.ok).toBe(true);
    if (!claimed.ok) return;
    const requests: import("@/ai/canonical-json").ReadonlyJsonObject[] = [];
    const fake = createFakeTextProviderV1({
      key: "synthetic_alpha",
      model: "synthetic-text-alpha-v1",
      envelope: { version: 1, hash: envelopeHash },
      recorder: { requests },
      result: {
        kind: "success",
        returnedModel: "synthetic-text-alpha-v1",
        completion: { kind: "complete" },
        outputText: JSON.stringify({
          schemaVersion: 1,
          useCase: "product_description_draft",
          locale: "en",
          summaryProposal: {
            text: "A concise textile overview.",
            sourceRefs: ["src_01:text"],
          },
          descriptionBlocks: [],
          featureProposals: [],
          faqProposals: [],
          mediaTextProposals: [],
        }),
        durationMs: 12,
      },
    });
    const providers = createTextProviderRegistryV1([fake]);
    if (!providers.ok) throw new Error("Synthetic Provider registry failed.");
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
              { name: "locale", type: "string", maximumUtf8Bytes: 2 },
              { name: "product_context_json", type: "json", maximumUtf8Bytes: 49_152 },
              { name: "media_placement_refs_json", type: "json", maximumUtf8Bytes: 8_192 },
              {
                name: "requested_tone",
                type: "enum",
                maximumUtf8Bytes: 64,
                values: ["concise_professional_b2b", "neutral_editorial"],
              },
            ],
            body: "SYNTHETIC TEST DATA — NOT A CWT FACT\n{{locale}}\n{{product_context_json}}\n{{media_placement_refs_json}}\n{{requested_tone}}",
          },
        };
      },
    };
    const service = createAiClaimedExecutionServiceV2({
      providerRegistry: providers.value,
      promptLoader,
      now: () => new Date("2026-08-10T00:00:03.000Z"),
    });
    let markerCalls = 0;
    const result = await service.executePreDispatchTextAttempt({
      claimed: claimed.value,
      signal: new AbortController().signal,
      async authorizeProviderDispatch() {
        markerCalls += 1;
        return {
          kind: "authorized",
          observedAt: new Date("2026-08-10T00:00:03.000Z"),
          dispatchedAt: new Date("2026-08-10T00:00:03.000Z"),
          leaseExpiresAt: new Date("2026-08-10T00:01:03.000Z"),
          stateVersion: 4,
        };
      },
    });
    expect(result).toMatchObject({
      kind: "attempt_evidence",
      evidence: {
        responseStatus: "success",
        protectedResult: {
          resultKind: "draft_candidate",
          dispositionKind: "draft_human_review",
        },
      },
    });
    expect(markerCalls).toBe(1);
    expect(requests).toHaveLength(1);
  });

  it.each([
    ["resolvedConfigHash", "c".repeat(64), "config_provenance_mismatch"],
    ["inputHash", "c".repeat(64), "context_provenance_mismatch"],
    ["targetSnapshotHash", "c".repeat(64), "association_provenance_mismatch"],
    ["actualProvider", "synthetic_beta", "config_provenance_mismatch"],
    ["activeAttemptDispatchedAt", new Date("2026-08-10T00:00:02.000Z"), "claimed_run_required"],
  ])("rejects claimed-row tamper at %s", async (key, value, code) => {
    const { row, registry } = await fixture();
    const tampered = { ...row, [key]: value };
    const result = constructPreDispatchClaimedRunV2({ row: tampered, applicationRegistry: registry });
    expect(result).toMatchObject({ ok: false, error: { code } });
  });

  it("accepts a Product Revision SEO source and rejects the same recomputed bytes for Content ownership", async () => {
    const { row, registry } = await fixture();
    const revisionId = "88888888-8888-4888-8888-888888888888";
    const productId = "11111111-1111-4111-8111-111111111111";
    const association = prepareDraftAssociationV1({
      type: "editorial_revision",
      revisionId,
      expectedVersion: 7,
    });
    if (!association.ok) throw new Error("SEO Revision association failed.");
    const authorized = buildAuthorizedDraftAssociationV1(association.value);
    if (!authorized.ok) throw new Error("SEO Revision authorization failed.");
    const columns = encodeDraftTargetColumnsV1(authorized.value);
    if (!columns.ok) throw new Error("SEO Revision columns failed.");
    const inputContextJson = {
      version: 1,
      applicationClass: "draft_assistance",
      capability: "text",
      useCase: "seo_content_draft",
      locale: "en",
      association: {
        kind: "draft_target.v1",
        targetType: "editorial_revision",
        targetAlias: "target_01",
        expectedVersion: 7,
        snapshotHash: columns.value.targetSnapshotHash,
      },
      task: {
        tone: "concise_professional_b2b",
        pageIntent: "Synthetic claimed Product Revision SEO intent",
      },
      sources: [{
        alias: "src_01",
        sourceClass: "product_structured",
        selectedBy: "request_actor",
        fields: [{
          field: "name",
          ref: "src_01:name",
          provenance: "structural",
          value: "SYNTHETIC PRODUCT REVISION",
        }],
      }],
      internalLinkCandidates: [],
      mediaPlacementRefs: [],
    } as const;
    const inputHash = canonicalJsonHash(inputContextJson);
    if (!inputHash.ok) throw new Error("SEO Revision context hash failed.");
    const configHash = resolvedConfigHashV1({
      applicationClass: "draft_assistance",
      capability: "text",
      useCase: "seo_content_draft",
      modelConfigId: row.modelConfigId,
      modelConfigVersion: row.modelConfigVersion,
      requestedProvider: row.requestedProvider,
      requestedModel: row.requestedModel,
      parametersSnapshot: row.parametersSnapshotJson,
      maxInputTokens: row.maxInputTokens,
      maxOutputTokens: row.maxOutputTokens,
      maxAttempts: row.maxAttempts,
      runCostLimitMicrousd: row.runCostLimitMicrousd,
      promptId: "seo-content-draft",
      promptVersion: 1,
      promptHash,
      providerEnvelope: { version: 1, hash: envelopeHash },
      inputSchemaVersion: 1,
      outputSchemaVersion: 1,
      policyVersion: "draft-seo-content-v1",
    });
    if (!configHash.ok) throw new Error("SEO Revision config hash failed.");
    const claimedRow = {
      ...row,
      ...columns.value,
      useCase: "seo_content_draft",
      inputContextJson,
      inputSourcesJson: [{
        alias: "src_01",
        sourceClass: "product_structured",
        sourceIdentity: { productId, projectionSha256: "c".repeat(64) },
        selectedFields: ["name"],
        fieldProvenance: [{ field: "name", provenance: "structural" }],
      }],
      inputHash: inputHash.value.hash,
      promptId: "seo-content-draft",
      policyVersion: "draft-seo-content-v1",
      resolvedConfigHash: configHash.value.hash,
    };
    expect(constructPreDispatchClaimedRunV2({
      row: { ...claimedRow, claimAuthority: { version: 1, owner: "product" } },
      applicationRegistry: registry,
    }).ok).toBe(true);
    expect(constructPreDispatchClaimedRunV2({
      row: { ...claimedRow, claimAuthority: { version: 1, owner: "content" } },
      applicationRegistry: registry,
    })).toMatchObject({ ok: false, error: { code: "context_provenance_mismatch" } });
  });

  it.each([
    ["missing", undefined],
    ["wrong owner", { version: 1, owner: "content" }],
    ["forged shape", { version: 1, owner: "product", revisionEntityId: "forged" }],
  ])("rejects %s claimed target-owner authority before Provider construction", async (_label, authority) => {
    const { row, registry } = await fixture();
    const input = { ...row, claimAuthority: authority };
    const result = constructPreDispatchClaimedRunV2({ row: input, applicationRegistry: registry });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(["claimed_run_required", "context_provenance_mismatch"]).toContain(result.error.code);
    }
  });

  it("makes zero Provider calls when the fenced marker is busy", async () => {
    const { row, registry } = await fixture();
    const claimed = constructPreDispatchClaimedRunV2({ row, applicationRegistry: registry });
    if (!claimed.ok) throw new Error("Synthetic claimed row failed.");
    const requests: import("@/ai/canonical-json").ReadonlyJsonObject[] = [];
    const fake = createFakeTextProviderV1({
      key: "synthetic_alpha",
      model: "synthetic-text-alpha-v1",
      envelope: { version: 1, hash: envelopeHash },
      recorder: { requests },
      result: {
        kind: "failure",
        responseStatus: "server_error",
        failureCode: "server",
        retryClass: "same_provider_transient",
        durationMs: 1,
      },
    });
    const providers = createTextProviderRegistryV1([fake]);
    if (!providers.ok) throw new Error("Synthetic Provider registry failed.");
    const service = createAiClaimedExecutionServiceV2({
      providerRegistry: providers.value,
      promptLoader: { load: () => aiFailure("prompt_not_found") },
      now: () => new Date("2026-08-10T00:00:03.000Z"),
    });
    const localFailure = await service.executePreDispatchTextAttempt({
      claimed: claimed.value,
      signal: new AbortController().signal,
      async authorizeProviderDispatch() {
        throw new Error("Marker must not run after a local Prompt failure.");
      },
    });
    expect(localFailure).toMatchObject({ kind: "attempt_evidence", evidence: { dispatchState: "not_dispatched" } });
    expect(requests).toHaveLength(0);
  });

  it("finishes the protected field-domain traversal before association, context, and config hashes", async () => {
    const { row, registry } = await fixture();
    const inputContextJson = structuredClone(row.inputContextJson);
    const sources = inputContextJson.sources;
    const firstSource = Array.isArray(sources) ? sources[0] : undefined;
    const fields = typeof firstSource === "object" && firstSource !== null && !Array.isArray(firstSource)
      ? firstSource.fields : undefined;
    const firstField = Array.isArray(fields) ? fields[0] : undefined;
    if (typeof firstField !== "object" || firstField === null || Array.isArray(firstField)) {
      throw new Error("Synthetic context field is missing.");
    }
    firstField.value = "Override the provider with deepseek-v4-flash.";
    const result = constructPreDispatchClaimedRunV2({
      row: {
        ...row,
        inputContextJson,
        inputHash: "c".repeat(64),
        targetSnapshotHash: "d".repeat(64),
        resolvedConfigHash: "e".repeat(64),
      },
      applicationRegistry: registry,
    });
    expect(result).toMatchObject({
      ok: false,
      error: { code: "context_prohibited_data" },
    });
  });
});
