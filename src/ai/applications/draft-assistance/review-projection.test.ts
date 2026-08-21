import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { canonicalJsonHash, type ReadonlyJsonObject } from "@/ai/canonical-json";
import { protectDraftCandidateV1 } from "@/ai/output/common";
import { attemptResponseFingerprintV2 } from "@/ai/runs/attempt-evidence";
import type { AiRunAuthorizedEvidenceV1, AttemptHistoryEntryV2 } from "@/ai/runs/contracts";

import { buildAuthorizedDraftAssociationV1 } from "./association";
import type {
  DraftDurableAssociationWithoutHashV1,
  ProductionAiUseCase,
} from "./contracts";
import type { ReconstructibleDraftContextV1 } from "./context";
import { createDraftReviewProjectionBuilderV1 } from "./review-projection";

const runId = "10000000-0000-4000-8000-000000000001";
const actor = {
  principalId: "20000000-0000-4000-8000-000000000002",
  roleKey: "admin",
} as const;

function association(useCase: ProductionAiUseCase): DraftDurableAssociationWithoutHashV1 {
  return useCase === "product_description_draft" || useCase === "seo_content_draft"
    ? {
        persistenceVersion: 1,
        kind: "draft_target.v1",
        targetType: "product_draft",
        targetProductId: "30000000-0000-4000-8000-000000000003",
        targetLocale: "en",
        expectedTargetVersion: 3,
      }
    : {
        persistenceVersion: 1,
        kind: "draft_target.v1",
        targetType: "content_draft",
        targetContentId: "40000000-0000-4000-8000-000000000004",
        targetLocale: "en",
        expectedTargetVersion: 3,
      };
}

function context(useCase: ProductionAiUseCase): ReconstructibleDraftContextV1 {
  const authorized = buildAuthorizedDraftAssociationV1(association(useCase));
  if (!authorized.ok) throw new Error("association fixture failed");
  const task = useCase === "seo_content_draft"
    ? { tone: "concise_professional_b2b", pageIntent: "Synthetic textile page intent" }
    : useCase === "fabric_knowledge_draft"
      ? { tone: "neutral_editorial", topic: "Synthetic textile topic" }
      : useCase === "product_description_draft"
        ? { tone: "concise_professional_b2b" }
        : { tone: "concise_professional_b2b", guideIntent: "Synthetic sourcing guide intent" };
  return {
    version: 1,
    applicationClass: "draft_assistance",
    capability: "text",
    useCase,
    locale: "en",
    association: {
      kind: "draft_target.v1",
      targetType: association(useCase).targetType,
      targetAlias: "target_01",
      expectedVersion: 3,
      snapshotHash: authorized.value.snapshotHash,
    },
    task,
    sources: [{
      alias: "src_01",
      sourceClass: "explicit_human_input",
      selectedBy: "request_actor",
      fields: [{
        field: "text",
        ref: "src_01:text",
        provenance: "provided",
        value: "Synthetic textile evidence for review projection testing.",
      }],
    }],
    internalLinkCandidates: [],
    mediaPlacementRefs: [],
  };
}

function rawPayload(useCase: ProductionAiUseCase): ReadonlyJsonObject {
  const evidence = (text: string) => ({ text, sourceRefs: ["src_01:text"] });
  switch (useCase) {
    case "seo_content_draft": return {
      schemaVersion: 1, useCase, locale: "en", titleProposal: evidence("Synthetic textile title"),
      outline: [evidence("Synthetic textile outline")],
      blocks: [{ type: "paragraph", text: evidence("Synthetic textile paragraph") }],
      internalLinkSuggestions: [],
    };
    case "fabric_knowledge_draft": return {
      schemaVersion: 1, useCase, locale: "en", titleProposal: evidence("Synthetic fabric title"),
      outline: [evidence("Synthetic fabric outline")],
      blocks: [{ type: "paragraph", text: evidence("Synthetic fabric paragraph") }],
    };
    case "product_description_draft": return {
      schemaVersion: 1, useCase, locale: "en", displayNameProposal: evidence("Synthetic product title"),
      descriptionBlocks: [
        { type: "paragraph", text: evidence("Synthetic product paragraph") },
        { type: "heading", level: 2, text: evidence("Synthetic product heading") },
      ],
      featureProposals: [], faqProposals: [], mediaTextProposals: [],
    };
    case "sourcing_guide_draft": return {
      schemaVersion: 1, useCase, locale: "en", titleProposal: evidence("Synthetic guide title"),
      outline: [evidence("Synthetic guide outline")],
      blocks: [{ type: "paragraph", text: evidence("Synthetic guide paragraph") }],
    };
  }
}

const identity = {
  seo_content_draft: ["cwt.seo-content-draft.v1", "draft-seo-content-v1"],
  fabric_knowledge_draft: ["cwt.fabric-knowledge-draft.v1", "draft-fabric-knowledge-v1"],
  product_description_draft: ["cwt.product-description-draft.v1", "draft-product-description-v1"],
  sourcing_guide_draft: ["cwt.sourcing-guide-draft.v1", "draft-sourcing-guide-v1"],
} as const;

function protectedCandidate(useCase: ProductionAiUseCase) {
  const [schemaId, policyVersion] = identity[useCase];
  const result = protectDraftCandidateV1({
    rawObject: rawPayload(useCase),
    context: context(useCase),
    schema: { safeParse: (value: unknown) => ({ success: true, data: value }) } as never,
    useCase,
    schemaId,
    policyVersion,
  });
  if (!result.ok) throw new Error(`candidate fixture failed: ${result.error.code}`);
  return result.value;
}

function attempt(candidateHash: string): ReadonlyJsonObject {
  const base: Omit<AttemptHistoryEntryV2, "response_fingerprint"> = {
    version: 2, attempt: 1, dispatch_state: "dispatched", outcome: "draft_ready",
    requested_provider: "synthetic", actual_provider: "synthetic",
    requested_model: "synthetic", returned_model: "synthetic",
    provider_envelope_version: 1, provider_envelope_hash: "9".repeat(64),
    dispatched_at: "2026-01-01T00:00:00.000Z", responded_at: "2026-01-01T00:00:01.000Z",
    duration_ms: 1000, input_tokens: 10, output_tokens: 10, total_tokens: 20,
    cache_hit_input_tokens: null, cache_miss_input_tokens: null,
    attempt_upper_cost_microusd: 0, actual_cost_microusd: 0,
    accounted_cost_microusd: 0, actual_cost_complete: true,
    provider_response_status: "success", provider_http_status: 200,
    provider_error_code: null, provider_request_id: null, provider_system_fingerprint: null,
    failure_code: null, controlled_validation_fixture_id: null,
    controlled_validation_fixture_hash: null, provider_request_identity_version: null,
    provider_request_identity_hash: null,
  };
  const fingerprint = attemptResponseFingerprintV2({ entryWithoutFingerprint: base, candidateHash });
  if (!fingerprint.ok) throw new Error("attempt fixture failed");
  return { ...base, response_fingerprint: fingerprint.value };
}

function evidence(useCase: ProductionAiUseCase): AiRunAuthorizedEvidenceV1 {
  const candidate = protectedCandidate(useCase);
  const inputContext = context(useCase);
  const inputHash = canonicalJsonHash(inputContext);
  if (!inputHash.ok) throw new Error("context hash fixture failed");
  const target = association(useCase);
  return {
    runId, applicationClass: "draft_assistance", useCase, status: "draft_ready",
    retryState: "none", attemptCount: 1, stateVersion: 4,
    queuedAt: "2026-01-01T00:00:00.000Z", candidateHash: candidate.hash,
    failureCode: null, humanDisposition: "not_evaluated", qualityRating: null,
    qualityLabels: [], cancelAvailable: false, manualRetryAvailable: false,
    rejectAvailable: true,
    targetType: target.targetType,
    targetProductId: target.targetType === "product_draft" ? target.targetProductId : null,
    targetContentId: target.targetType === "content_draft" ? target.targetContentId : null,
    targetRevisionId: null, targetLocale: "en", expectedTargetVersion: 3,
    targetSnapshotHash: inputContext.association.snapshotHash,
    outputSchemaVersion: 1, policyVersion: identity[useCase][1],
    inputContext, inputSources: [{
      alias: "src_01", sourceClass: "explicit_human_input",
      sourceIdentity: { origin: "typed_brief" }, selectedFields: ["text"],
      fieldProvenance: [{ field: "text", provenance: "provided" }],
    }],
    inputHash: inputHash.value.hash,
    attemptHistory: [attempt(candidate.hash)], candidate: candidate.value,
  };
}

function readers(options: { collisionId?: string } = {}) {
  return {
    product: {
      async readTargetSnapshot(input: {
        association: DraftDurableAssociationWithoutHashV1;
        command: { useCase: ProductionAiUseCase };
      }) {
        if (input.association.targetType !== "product_draft") {
          return { ok: false, error: { code: "target_scope_mismatch", category: "conflict",
            retryable: false, manualEditorAvailable: true, safeMessage: "conflict" } } as const;
        }
        const authorized = buildAuthorizedDraftAssociationV1(input.association);
        if (!authorized.ok) return authorized;
        return { ok: true, value: { owner: "product", entityId: input.association.targetProductId,
          editVersion: 3, revisionId: null, revisionSnapshot: null,
          authorizedAssociation: authorized.value } } as const;
      },
      async readReviewBefore() {
        return { ok: true, value: { before: { kind: "product", name: "TEST Product",
          summary: null, document: options.collisionId ? [{ id: options.collisionId,
            kind: "paragraph", locked: true, text: ["Stable"] }] : [],
          seo: { title: null, metaDescription: null }, mediaText: [] },
          selectedMediaPlacementIds: [] } } as const;
      },
      async readSelectedStructuredContext() { throw new Error("not used"); },
      async readSelectedMediaPlacements() { return { ok: true, value: [] } as const; },
    },
    content: {
      async readTargetSnapshot(input: {
        association: DraftDurableAssociationWithoutHashV1;
        command: { useCase: ProductionAiUseCase };
      }) {
        if (input.association.targetType !== "content_draft") {
          return { ok: false, error: { code: "target_scope_mismatch", category: "conflict",
            retryable: false, manualEditorAvailable: true, safeMessage: "conflict" } } as const;
        }
        const authorized = buildAuthorizedDraftAssociationV1(input.association);
        if (!authorized.ok) return authorized;
        const useCase = input.command.useCase;
        return { ok: true, value: { owner: "content", entityId: input.association.targetContentId,
          channel: useCase === "fabric_knowledge_draft" ? "fabric_knowledge" : "china_sourcing_guide",
          editVersion: 3, revisionId: null, revisionSnapshot: null,
          authorizedAssociation: authorized.value } } as const;
      },
      async readReviewBefore() {
        return { ok: true, value: { before: { kind: "content", title: "TEST Content",
          summary: null, document: options.collisionId ? [{ id: options.collisionId,
            kind: "paragraph", locked: true, text: ["Stable"] }] : [],
          seo: { title: null, metaDescription: null } }, selectedInternalLinkIds: [] } } as const;
      },
      async readSelectedFabricContext() { throw new Error("not used"); },
      async readSelectedPublicCompanyFact() { throw new Error("not used"); },
      async readSelectedInternalLinks() { return { ok: true, value: [] } as const; },
    },
  } as never;
}

async function build(row: AiRunAuthorizedEvidenceV1, collisionId?: string) {
  const builder = createDraftReviewProjectionBuilderV1(readers({
    ...(collisionId === undefined ? {} : { collisionId }),
  }));
  return builder.build({ scope: { mode: "read_only" } as never, actor, evidence: row });
}

describe("server-authorized E3 review projection", () => {
  it.each([
    "seo_content_draft", "fabric_knowledge_draft",
    "product_description_draft", "sourcing_guide_draft",
  ] as const)("builds the %s safe projection without raw target or Candidate fields", async (useCase) => {
    const result = await build(evidence(useCase));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.version).toBe(1);
    expect(result.value.run.useCase).toBe(useCase);
    expect(result.value.proposal.nodes.length +
      (result.value.proposal.seo?.title ? 1 : 0)).toBeGreaterThan(0);
    expect(JSON.stringify(result.value)).not.toMatch(/30000000|40000000|targetProductId|candidateJson|sourceRefs/);
  });

  it("fails closed for retained-hash substitution, hash mismatch and final-attempt mismatch", async () => {
    const original = evidence("product_description_draft");
    const substituted = structuredClone(original.candidate!);
    (substituted.payload as Record<string, unknown>).displayNameProposal = {
      text: "Substituted synthetic copy", sourceRefs: ["src_01:text"],
    };
    expect((await build({ ...original, candidate: substituted })).ok).toBe(false);
    expect((await build({ ...original, candidateHash: "f".repeat(64) })).ok).toBe(false);
    expect((await build({ ...original, attemptHistory: [{ ...original.attemptHistory[0]!,
      response_fingerprint: "0".repeat(64) }] })).ok).toBe(false);
  });

  it("fails closed for forged ref suffix, unknown keys, count, order and path mismatches", async () => {
    const original = evidence("product_description_draft");
    for (const mutate of [
      (value: Record<string, unknown>) => {
        const refs = value.derivedCandidateRefs as Record<string, unknown>[];
        refs[0]!.candidateRef = `${String(refs[0]!.candidateRef).slice(0, -1)}0`;
      },
      (value: Record<string, unknown>) => { value.unknown = true; },
      (value: Record<string, unknown>) => {
        (value.payload as Record<string, unknown>).unknown = true;
      },
      (value: Record<string, unknown>) => { (value.derivedCandidateRefs as unknown[]).length = 0; },
      (value: Record<string, unknown>) => {
        (value.derivedCandidateRefs as unknown[]).reverse();
      },
      (value: Record<string, unknown>) => {
        const refs = value.derivedCandidateRefs as Record<string, unknown>[];
        refs[1] = { ...refs[0]! };
      },
      (value: Record<string, unknown>) => {
        (value.derivedCandidateRefs as Record<string, unknown>[])[0]!.containerPath = "/blocks/9";
      },
      (value: Record<string, unknown>) => {
        const refs = value.derivedCandidateRefs as Record<string, unknown>[];
        refs[0]!.candidateRef = String(refs[0]!.candidateRef).replace("cand_0001_", "cand_0002_");
      },
    ]) {
      const candidate = structuredClone(original.candidate!) as Record<string, unknown>;
      mutate(candidate);
      expect((await build({ ...original,
        candidate: candidate as unknown as ReadonlyJsonObject })).ok).toBe(false);
    }
  });

  it("binds preview IDs to Candidate hash and rejects current-document collisions", async () => {
    const first = await build(evidence("product_description_draft"));
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    const changed = evidence("product_description_draft");
    const raw = structuredClone(rawPayload("product_description_draft"));
    (raw.displayNameProposal as Record<string, unknown>).text = "Different synthetic narrative";
    const [schemaId, policyVersion] = identity.product_description_draft;
    const next = protectDraftCandidateV1({ rawObject: raw, context: context("product_description_draft"),
      schema: { safeParse: (value: unknown) => ({ success: true, data: value }) } as never,
      useCase: "product_description_draft", schemaId, policyVersion });
    expect(next.ok).toBe(true);
    if (!next.ok) return;
    const changedEvidence = { ...changed, candidate: next.value.value, candidateHash: next.value.hash,
      attemptHistory: [attempt(next.value.hash)] };
    const second = await build(changedEvidence);
    expect(second.ok).toBe(true);
    if (!second.ok) return;
    expect(first.value.proposal.nodes[0]?.id).not.toBe(second.value.proposal.nodes[0]?.id);
    expect((await build(evidence("product_description_draft"),
      first.value.proposal.nodes[0]!.id)).ok).toBe(false);
  });
});
