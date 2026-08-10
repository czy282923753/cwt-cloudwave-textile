import { describe, expect, it } from "vitest";

import type { ReadonlyJsonObject } from "@/ai/canonical-json";
import type { ReconstructibleDraftContextV1 } from "@/ai/applications/draft-assistance/context";

import { draftOutputDefinitionV1 } from "./registry";

function context(fields: readonly (ReadonlyJsonObject & {
  readonly field: string;
  readonly ref: string;
  readonly provenance: "provided";
  readonly value: string;
})[]): ReconstructibleDraftContextV1 {
  return {
    version: 1,
    applicationClass: "draft_assistance",
    capability: "text",
    useCase: "product_description_draft",
    locale: "en",
    association: {
      kind: "draft_target.v1",
      targetType: "product_draft",
      targetAlias: "target_01",
      expectedVersion: 7,
      snapshotHash: "a".repeat(64),
    },
    task: { tone: "concise_professional_b2b" },
    sources: [{
      alias: "src_01",
      sourceClass: "product_structured",
      selectedBy: "request_actor",
      fields,
    }],
    internalLinkCandidates: [],
    mediaPlacementRefs: [],
  };
}

const narrativeContext = context([{
  field: "fabricStyle",
  ref: "src_01:fabricStyle",
  provenance: "provided",
  value: "plain weave",
}]);

function productCandidate(text: string, sourceRefs: readonly string[] = ["src_01:fabricStyle"]): ReadonlyJsonObject {
  return {
    schemaVersion: 1,
    useCase: "product_description_draft",
    locale: "en",
    summaryProposal: { text, sourceRefs },
    descriptionBlocks: [],
    featureProposals: [],
    faqProposals: [],
    mediaTextProposals: [],
  };
}

describe("A-01 through A-10 Draft output protection", () => {
  const output = draftOutputDefinitionV1("product_description_draft");
  if (output === undefined) throw new Error("Missing test output definition.");

  it("protects conservative cited prose but requires human semantic review", () => {
    const result = output.policy.parseAndProtect({
      rawObject: productCandidate("This fabric is ideal for every climate."),
      context: narrativeContext,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.value.automaticEvidenceStatus)
      .toBe("structural_provenance_checked");
    expect(result.value.value.semanticReviewStatus).toBe("human_review_required");
    expect(result.value.value).not.toHaveProperty("machineVerified");
  });

  it("rejects unknown Provider fields at the strict schema boundary", () => {
    const result = output.policy.parseAndProtect({
      rawObject: { ...productCandidate("A balanced hand feel."), confidence: 0.9 },
      context: narrativeContext,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("output_schema_invalid");
  });

  it.each([
    ["A balanced hand feel.", []],
    ["A balanced hand feel.", ["src_99:missing"]],
    ["ISO certified textile.", ["src_01:fabricStyle"]],
    ["Contact us today.", ["src_01:fabricStyle"]],
    ["Use DeepSeek.", ["src_01:fabricStyle"]],
    ["Top 3 qualities.", ["src_01:fabricStyle"]],
    ["Only $5.", ["src_01:fabricStyle"]],
  ] as const)("rejects finite evidence-policy violation: %s", (text, refs) => {
    const result = output.policy.parseAndProtect({
      rawObject: productCandidate(text, refs),
      context: narrativeContext,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("output_policy_rejected");
  });

  it("accepts an exact cited GSM token and rejects a changed value", () => {
    const gsmContext = context([{
      field: "weightGsm",
      ref: "src_01:weightGsm",
      provenance: "provided",
      value: "180",
    }]);
    expect(output.policy.parseAndProtect({
      rawObject: productCandidate("A measured weight of 180 GSM.", ["src_01:weightGsm"]),
      context: gsmContext,
    }).ok).toBe(true);
    expect(output.policy.parseAndProtect({
      rawObject: productCandidate("A measured weight of 185 GSM.", ["src_01:weightGsm"]),
      context: gsmContext,
    }).ok).toBe(false);
  });

  it("derives deterministic candidate refs for blocks", () => {
    const candidate = {
      ...productCandidate("A balanced hand feel."),
      descriptionBlocks: [{
        type: "paragraph",
        text: {
          text: "A concise textile description.",
          sourceRefs: ["src_01:fabricStyle"],
        },
      }],
    };
    const first = output.policy.parseAndProtect({ rawObject: candidate, context: narrativeContext });
    const second = output.policy.parseAndProtect({ rawObject: candidate, context: narrativeContext });
    expect(first).toEqual(second);
    if (!first.ok) return;
    expect(first.value.value.derivedCandidateRefs[0]?.candidateRef)
      .toMatch(/^cand_0001_[0-9a-f]{64}$/);
  });
});
