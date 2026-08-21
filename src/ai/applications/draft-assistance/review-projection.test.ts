import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { canonicalJsonHash, type ReadonlyJsonObject } from "@/ai/canonical-json";
import { draftOutputDefinitionV1 } from "@/ai/output/registry";
import { attemptResponseFingerprintV2 } from "@/ai/runs/attempt-evidence";
import type { AiRunAuthorizedEvidenceV1, AttemptHistoryEntryV2 } from "@/ai/runs/contracts";
import { parseBlockDocument } from "@/editorial/blocks";

import { buildAuthorizedDraftAssociationV1 } from "./association";
import type {
  ApplyAiDraftCandidateV1,
  DraftDurableAssociationWithoutHashV1,
  ProductionAiUseCase,
} from "./contracts";
import type { ReconstructibleDraftContextV1 } from "./context";
import {
  composeDraftCandidateBlocksV1,
  createDraftReviewProjectionBuilderV1,
  fingerprintApplyAiDraftCandidateV1,
} from "./review-projection";

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
      featureProposals: [evidence("Synthetic feature one"), evidence("Synthetic feature two")],
      faqProposals: [{ question: evidence("Synthetic question?"),
        answer: evidence("Synthetic answer.") }],
      mediaTextProposals: [],
    };
    case "sourcing_guide_draft": return {
      schemaVersion: 1, useCase, locale: "en", titleProposal: evidence("Synthetic guide title"),
      outline: [evidence("Synthetic guide outline")],
      blocks: [{ type: "paragraph", text: evidence("Synthetic guide paragraph") }],
    };
  }
}

function protectedCandidate(useCase: ProductionAiUseCase) {
  const output = draftOutputDefinitionV1(useCase);
  if (output === undefined) throw new Error("output definition fixture failed");
  const result = output.policy.parseAndProtect({
    rawObject: rawPayload(useCase),
    context: context(useCase),
  });
  if (!result.ok) throw new Error(`candidate fixture failed: ${result.error.code}`);
  return result.value;
}

function attempt(
  candidateHash: string | null,
  attemptNumber = 1,
  outcome: "retry_scheduled" | "failed" | "draft_ready" | "discarded_cancelled" = "draft_ready",
  failureCode: string | null = null,
): ReadonlyJsonObject {
  const failed = outcome === "failed";
  const base: Omit<AttemptHistoryEntryV2, "response_fingerprint"> = {
    version: 2, attempt: attemptNumber, dispatch_state: "dispatched", outcome,
    requested_provider: "synthetic", actual_provider: "synthetic",
    requested_model: "synthetic", returned_model: failed ? null : "synthetic",
    provider_envelope_version: 1, provider_envelope_hash: "9".repeat(64),
    dispatched_at: "2026-01-01T00:00:00.000Z", responded_at: "2026-01-01T00:00:01.000Z",
    duration_ms: 1000, input_tokens: 10, output_tokens: 10, total_tokens: 20,
    cache_hit_input_tokens: null, cache_miss_input_tokens: null,
    attempt_upper_cost_microusd: 0, actual_cost_microusd: 0,
    accounted_cost_microusd: 0, actual_cost_complete: true,
    provider_response_status: failed
      ? failureCode === "provider_quota_exceeded" ? "quota_exceeded"
        : failureCode === "provider_timeout" ? "timeout" : "client_error"
      : "success",
    provider_http_status: failed
      ? failureCode === "provider_auth_failed" ? 401
        : failureCode === "provider_quota_exceeded" ? 429 : null
      : 200,
    provider_error_code: null, provider_request_id: null, provider_system_fingerprint: null,
    failure_code: failureCode, controlled_validation_fixture_id: null,
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
    rejectAvailable: true, applyAvailable: true,
    appliedTargetVersion: null, appliedRevisionId: null, appliedRevisionVersion: null,
    targetType: target.targetType,
    targetProductId: target.targetType === "product_draft" ? target.targetProductId : null,
    targetContentId: target.targetType === "content_draft" ? target.targetContentId : null,
    targetRevisionId: null, targetLocale: "en", expectedTargetVersion: 3,
    targetSnapshotHash: inputContext.association.snapshotHash,
    outputSchemaVersion: 1,
    policyVersion: draftOutputDefinitionV1(useCase)?.policyVersion ?? "missing-definition",
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

async function buildPlan(
  row: AiRunAuthorizedEvidenceV1,
  mutate?: (command: ApplyAiDraftCandidateV1) => ApplyAiDraftCandidateV1,
  collisionId?: string,
) {
  const builder = createDraftReviewProjectionBuilderV1(readers({
    ...(collisionId === undefined ? {} : { collisionId }),
  }));
  const scope = { mode: "read_only" } as never;
  const projected = await builder.build({ scope, actor, evidence: row });
  if (!projected.ok) return projected;
  const applicable = [
    ...(projected.value.proposal.seo?.title ? [projected.value.proposal.seo.title] : []),
    ...(projected.value.proposal.seo?.metaDescription
      ? [projected.value.proposal.seo.metaDescription] : []),
    ...projected.value.proposal.nodes,
  ].filter((node) => !node.previewOnly);
  const command: ApplyAiDraftCandidateV1 = {
    runId: projected.value.run.id,
    expectedRunStateVersion: projected.value.run.stateVersion,
    candidateHash: projected.value.run.candidateHash,
    expectedTargetVersion: projected.value.target.draftVersion,
    expectedRevisionId: projected.value.target.revisionId,
    expectedRevisionDraftVersion: projected.value.target.revisionId === null
      ? null : projected.value.target.draftVersion,
    decisions: applicable.map((node) => ({
      candidatePath: node.path,
      decision: "accepted" as const,
      ...(node.kind === "block" || node.kind === "feature" || node.kind === "faq"
        ? { insertAfterBlockId: null } : {}),
    })),
    qualityRating: null,
    qualityLabels: [],
    qualityComment: null,
  };
  return builder.buildApplicationPlan({
    scope,
    actor,
    evidence: row,
    command: mutate === undefined ? command : mutate(structuredClone(command)),
  });
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
    expect(result.value.proposal.nodes.filter((node) => node.previewOnly)
      .every((node) => !node.editable)).toBe(true);
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

  it("binds the complete strict contiguous attempt history to attemptCount and every fingerprint", async () => {
    const original = evidence("product_description_draft");
    const validHistory = [
      attempt(null, 1, "retry_scheduled"),
      attempt(original.candidateHash, 2, "draft_ready"),
    ];
    const valid = { ...original, attemptCount: 2, attemptHistory: validHistory };
    expect((await build(valid)).ok).toBe(true);
    expect((await build({ ...original, attemptCount: 2, attemptHistory: [
      attempt(null, 1, "failed", "provider_auth_failed"),
      attempt(original.candidateHash, 2, "draft_ready"),
    ] })).ok).toBe(true);
    expect((await build({ ...original, attemptCount: 2, attemptHistory: [
      attempt(null, 1, "failed", "provider_quota_exceeded"),
      attempt(original.candidateHash, 2, "draft_ready"),
    ] })).ok).toBe(true);
    expect((await build({ ...original, attemptCount: 3, attemptHistory: [
      attempt(null, 1, "retry_scheduled"),
      attempt(null, 2, "failed", "provider_auth_failed"),
      attempt(original.candidateHash, 3, "draft_ready"),
    ] })).ok).toBe(true);

    const prefix = validHistory[0]!;
    const final = validHistory[1]!;
    const invalidRows: AiRunAuthorizedEvidenceV1[] = [
      { ...valid, attemptHistory: [final] },
      { ...valid, attemptHistory: [...validHistory, attempt(original.candidateHash, 3)] },
      { ...valid, attemptCount: 3 },
      { ...valid, attemptHistory: [prefix, attempt(original.candidateHash, 3)] },
      { ...valid, attemptHistory: [prefix, attempt(original.candidateHash, 1)] },
      { ...valid, attemptHistory: [final, prefix] },
      { ...valid, attemptHistory: [{ ...prefix, arbitrary: true }, final] },
      { ...valid, attemptHistory: [{ ...prefix, outcome: "arbitrary" }, final] },
      { ...valid, attemptHistory: [attempt(null, 1, "failed"), final] },
      { ...valid, attemptHistory: [attempt(null, 1, "failed", "provider_timeout"), final] },
      { ...valid, attemptHistory: [attempt(null, 1, "failed", "unknown_failure"), final] },
      { ...valid, attemptHistory: [attempt(null, 1, "discarded_cancelled",
        "provider_auth_failed"), final] },
      { ...valid, attemptHistory: [{ ...prefix, provider_http_status: 999 }, final] },
      { ...valid, attemptHistory: [{ ...prefix, response_fingerprint: "0".repeat(64) }, final] },
      { ...valid, attemptHistory: [prefix, { ...final, response_fingerprint: "0".repeat(64) }] },
      { ...valid, attemptHistory: [attempt(null, 1, "draft_ready"), final] },
      { ...valid, attemptHistory: [prefix, attempt(original.candidateHash, 1, "draft_ready")] },
    ] as AiRunAuthorizedEvidenceV1[];
    for (const row of invalidRows) expect((await build(row)).ok).toBe(false);
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
    const output = draftOutputDefinitionV1("product_description_draft");
    if (output === undefined) throw new Error("Product output definition fixture failed.");
    const next = output.policy.parseAndProtect({
      rawObject: raw,
      context: context("product_description_draft"),
    });
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

describe("server-authorized E4 application plan", () => {
  it.each([
    ["product_description_draft", "product"],
    ["seo_content_draft", "product"],
    ["fabric_knowledge_draft", "content"],
    ["sourcing_guide_draft", "content"],
  ] as const)("maps %s through the strict stored Candidate as %s-owned", async (useCase, owner) => {
    const result = await buildPlan(evidence(useCase));
    expect(result.ok, JSON.stringify(result)).toBe(true);
    if (!result.ok) return;
    expect(result.value).toMatchObject({ owner, useCase, disposition: "accepted" });
    if (useCase === "seo_content_draft") {
      expect(result.value.seoTitle).toBe("Synthetic textile title");
      expect(result.value.generatedBlocks).toEqual([]);
      expect(result.value.title).toBeUndefined();
    } else {
      expect(result.value.title).toMatch(/^Synthetic /);
      expect(result.value.generatedBlocks).not.toHaveLength(0);
    }
    if (useCase === "product_description_draft") {
      expect(result.value.generatedBlocks.filter((item) => item.block.type === "feature_list"))
        .toHaveLength(1);
      expect(result.value.generatedBlocks.filter((item) => item.block.type === "faq"))
        .toHaveLength(1);
    }
    expect(JSON.stringify(result.value)).not.toMatch(/sourceRefs|src_01|targetProductId|targetContentId/);
  });

  it("rejects unknown, duplicate, preview-only, empty and locked-anchor decisions", async () => {
    const base = evidence("product_description_draft");
    expect((await buildPlan(base, (command) => ({
      ...command,
      decisions: [...command.decisions, command.decisions[0]!],
    }))).ok).toBe(false);
    expect((await buildPlan(base, (command) => ({
      ...command,
      decisions: [{ candidatePath: "/outline/0", decision: "accepted" }],
    }))).ok).toBe(false);
    expect((await buildPlan(base, (command) => ({
      ...command,
      decisions: command.decisions.map((decision) => ({
        candidatePath: decision.candidatePath,
        decision: "rejected" as const,
      })),
    }))).ok).toBe(false);
    expect((await buildPlan(base, (command) => ({
      ...command,
      decisions: command.decisions.map((decision) => decision.insertAfterBlockId === undefined
        ? decision : { ...decision, insertAfterBlockId: "locked-current" }),
    }), "locked-current")).ok).toBe(false);
  });

  it("marks any edit, rejection or omission as accepted_with_edits", async () => {
    const edited = await buildPlan(evidence("product_description_draft"), (command) => ({
      ...command,
      decisions: command.decisions.map((decision, index) => index === 0
        ? { ...decision, editedText: "Synthetic operator-edited title" } : decision),
    }));
    expect(edited).toMatchObject({ ok: true, value: { disposition: "accepted_with_edits",
      title: "Synthetic operator-edited title" } });
    const partial = await buildPlan(evidence("product_description_draft"), (command) => ({
      ...command,
      decisions: command.decisions.map((decision, index) => index === 0
        ? { candidatePath: decision.candidatePath, decision: "rejected" as const } : decision),
    }));
    expect(partial).toMatchObject({ ok: true, value: { disposition: "accepted_with_edits" } });
  });

  it("fails closed when run, hash, target or Revision fences drift", async () => {
    for (const mutate of [
      (command: ApplyAiDraftCandidateV1) => ({ ...command, runId: actor.principalId }),
      (command: ApplyAiDraftCandidateV1) => ({ ...command, candidateHash: "f".repeat(64) }),
      (command: ApplyAiDraftCandidateV1) => ({ ...command, expectedTargetVersion: 4 }),
      (command: ApplyAiDraftCandidateV1) => ({ ...command,
        expectedRevisionId: actor.principalId, expectedRevisionDraftVersion: 3 }),
    ]) expect((await buildPlan(evidence("fabric_knowledge_draft"), mutate)).ok).toBe(false);
  });

  it("inserts generated Blocks only at explicit unlocked boundaries without changing old bytes/order", () => {
    const current = parseBlockDocument({
      version: 1 as const,
      blocks: [
        { id: "open-a", type: "paragraph" as const, text: "Before A" },
        { id: "locked-b", type: "paragraph" as const, text: "Before B", locked: true },
        { id: "open-c", type: "paragraph" as const, text: "Before C" },
      ],
    }, "product");
    const generated = [{
      candidatePath: "/descriptionBlocks/0",
      ordinal: 1,
      block: { id: `ai_${"1".repeat(60)}`, type: "paragraph" as const, text: "After A" },
      insertAfterBlockId: "open-a",
    }];
    const composed = composeDraftCandidateBlocksV1(current, generated, "product");
    expect(composed.ok).toBe(true);
    if (!composed.ok) return;
    expect(composed.value.blocks.map((block) => block.id))
      .toEqual(["open-a", generated[0]!.block.id, "locked-b", "open-c"]);
    expect(composed.value.blocks.filter((block) => block.id !== generated[0]!.block.id))
      .toEqual(current.blocks);
    expect(composeDraftCandidateBlocksV1(current, [{ ...generated[0]!,
      insertAfterBlockId: "locked-b" }], "product").ok).toBe(false);
    expect(composeDraftCandidateBlocksV1(current, [{ ...generated[0]!,
      block: { ...generated[0]!.block, id: "open-c" } }], "product").ok).toBe(false);
  });
});

describe("E4 Apply command replay fingerprint", () => {
  const command = (): ApplyAiDraftCandidateV1 => ({
    runId,
    expectedRunStateVersion: 7,
    candidateHash: "a".repeat(64),
    expectedTargetVersion: 3,
    expectedRevisionId: null,
    expectedRevisionDraftVersion: null,
    decisions: [
      { candidatePath: "/displayNameProposal", decision: "accepted" },
      { candidatePath: "/descriptionBlocks/0", decision: "accepted",
        insertAfterBlockId: null },
    ],
    qualityRating: 4,
    qualityLabels: ["clarity", "tone"],
    qualityComment: "Synthetic replay evidence.",
  });
  const hashOf = (value: unknown): string => {
    const result = fingerprintApplyAiDraftCandidateV1(value);
    expect(result.ok, JSON.stringify(result)).toBe(true);
    if (!result.ok) throw new Error("Apply fingerprint fixture failed.");
    expect(result.value.version).toBe(1);
    return result.value.hash;
  };

  it("is stable for the same strictly parsed normalized command", () => {
    expect(hashOf(command())).toBe(hashOf({ ...command(),
      qualityComment: "  Synthetic replay evidence.  ",
    }));
  });

  it("binds ordered decisions, edits, anchor presence/value and every fence", () => {
    const base = command();
    const baseHash = hashOf(base);
    const variants: unknown[] = [
      { ...base, runId: actor.principalId },
      { ...base, expectedRunStateVersion: 8 },
      { ...base, candidateHash: "b".repeat(64) },
      { ...base, expectedTargetVersion: 4 },
      { ...base, expectedTargetVersion: 4, expectedRevisionId: actor.principalId,
        expectedRevisionDraftVersion: 4 },
      { ...base, decisions: [...base.decisions].reverse() },
      { ...base, decisions: base.decisions.map((value, index) => index === 0
        ? { ...value, decision: "rejected" as const } : value) },
      { ...base, decisions: base.decisions.map((value, index) => index === 0
        ? { ...value, editedText: "Edited synthetic title" } : value) },
      { ...base, decisions: base.decisions.map((value, index) => index === 1
        ? { candidatePath: value.candidatePath, decision: value.decision } : value) },
      { ...base, decisions: base.decisions.map((value, index) => index === 1
        ? { ...value, insertAfterBlockId: "open-anchor" } : value) },
    ];
    for (const variant of variants) expect(hashOf(variant)).not.toBe(baseHash);
  });

  it("binds every quality field and rejects malformed commands", () => {
    const base = command();
    const baseHash = hashOf(base);
    for (const variant of [
      { ...base, qualityRating: 5 },
      { ...base, qualityLabels: ["tone", "clarity"] },
      { ...base, qualityComment: "Different synthetic evidence." },
    ]) expect(hashOf(variant)).not.toBe(baseHash);
    expect(fingerprintApplyAiDraftCandidateV1({ ...base, unknown: true }).ok).toBe(false);
    expect(fingerprintApplyAiDraftCandidateV1({ ...base, decisions: [
      ...base.decisions, base.decisions[0],
    ] }).ok).toBe(false);
  });
});
