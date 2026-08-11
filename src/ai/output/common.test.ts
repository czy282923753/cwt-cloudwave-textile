import { describe, expect, it } from "vitest";

import type { ReadonlyJsonObject } from "@/ai/canonical-json";
import type { ReconstructibleDraftContextV1 } from "@/ai/applications/draft-assistance/context";

import { draftOutputDefinitionV1 } from "./registry";

function context(fields: readonly (ReadonlyJsonObject & {
  readonly field: string;
  readonly ref: string;
  readonly provenance: "provided" | "verified";
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

function productCandidateWithParagraphs(paragraphs: readonly string[]): ReadonlyJsonObject {
  return {
    ...productCandidate("A conservative textile narrative."),
    descriptionBlocks: paragraphs.map((text) => ({
      type: "paragraph",
      text: { text, sourceRefs: ["src_01:fabricStyle"] },
    })),
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

  it("requires the exact adjacent same-alias MOQ value/unit ref pair", () => {
    const moqContext = context([
      {
        field: "moqValue",
        ref: "src_01:moqValue",
        provenance: "verified",
        value: "100",
      },
      {
        field: "moqUnit",
        ref: "src_01:moqUnit",
        provenance: "verified",
        value: "kg",
      },
    ]);
    expect(output.policy.parseAndProtect({
      rawObject: productCandidate("A minimum order of 100 kg.", [
        "src_01:moqValue", "src_01:moqUnit",
      ]),
      context: moqContext,
    }).ok).toBe(true);
    for (const [text, refs] of [
      ["A minimum order of 100 kg.", ["src_01:moqValue"]],
      ["A minimum order of 100 m.", ["src_01:moqValue", "src_01:moqUnit"]],
      ["A minimum order of 100 KG.", ["src_01:moqValue", "src_01:moqUnit"]],
      ["A minimum order of -100 kg.", ["src_01:moqValue", "src_01:moqUnit"]],
      ["A minimum order of 1e2 kg.", ["src_01:moqValue", "src_01:moqUnit"]],
      ["A minimum order of 100.0 kg.", ["src_01:moqValue", "src_01:moqUnit"]],
    ] as const) {
      expect(output.policy.parseAndProtect({
        rawObject: productCandidate(text, refs),
        context: moqContext,
      }).ok).toBe(false);
    }
  });

  it("derives A-03 refs from the application context policy", () => {
    const companyContext: ReconstructibleDraftContextV1 = {
      ...narrativeContext,
      sources: [{
        alias: "src_01",
        sourceClass: "public_company_fact",
        selectedBy: "request_actor",
        fields: [{
          field: "statement",
          ref: "src_01:statement",
          provenance: "verified",
          value: "SYNTHETIC TEST DATA — NOT A CWT FACT",
        }],
      }],
    };
    expect(output.policy.parseAndProtect({
      rawObject: productCandidate("A conservative TEST narrative.", ["src_01:statement"]),
      context: companyContext,
    }).ok).toBe(false);
  });

  it("rejects deterministic repeated-block and repeated-token spam", () => {
    const repeatedBlock = {
      type: "paragraph",
      text: {
        text: "Repeated plain weave narrative.",
        sourceRefs: ["src_01:fabricStyle"],
      },
    };
    expect(output.policy.parseAndProtect({
      rawObject: {
        ...productCandidate("A conservative TEST narrative."),
        descriptionBlocks: Array.from({ length: 30 }, () => repeatedBlock),
      },
      context: narrativeContext,
    }).ok).toBe(false);
    expect(output.policy.parseAndProtect({
      rawObject: productCandidate("weave weave weave weave weave weave weave weave"),
      context: narrativeContext,
    }).ok).toBe(false);
  });

  it.each([
    ["unique suffix", [
      "balanced woven textile surface amber", "balanced woven textile surface birch",
      "balanced woven textile surface cedar", "balanced woven textile surface dahlia",
    ]],
    ["unique prefix", [
      "amber balanced woven textile surface", "birch balanced woven textile surface",
      "cedar balanced woven textile surface", "dahlia balanced woven textile surface",
    ]],
    ["alternating middle token", [
      "balanced amber woven textile surface", "balanced woven birch textile surface",
      "balanced woven textile cedar surface", "dahlia balanced woven textile surface",
    ]],
    ["interleaved cosmetic tokens", [
      "balanced amber woven textile birch surface", "cedar balanced woven dahlia textile surface",
      "balanced elm woven fir textile surface", "garnet balanced woven textile hazel surface",
    ]],
    ["token reordering", [
      "balanced woven textile surface amber", "surface textile woven balanced birch",
      "woven cedar surface balanced textile", "dahlia textile balanced surface woven",
    ]],
    ["two cosmetics at arbitrary positions", [
      "amber balanced woven textile surface birch", "balanced cedar woven dahlia textile surface",
      "elm balanced woven fir textile surface", "balanced woven garnet textile hazel surface",
    ]],
    ["four-token proposition plus three ordinary tokens", [
      "amber balanced birch woven cedar textile surface", "balanced dahlia woven elm textile fir surface",
      "garnet hazel balanced woven textile indigo surface", "juniper balanced kiln woven linen textile surface",
    ]],
  ] as const)("rejects the decisive position-insensitive family: %s", (_name, family) => {
    for (const member of family) {
      expect(output.policy.parseAndProtect({
        rawObject: productCandidateWithParagraphs([member]),
        context: narrativeContext,
      }).ok).toBe(true);
    }
    expect(output.policy.parseAndProtect({
      rawObject: productCandidateWithParagraphs(family.slice(0, 3)),
      context: narrativeContext,
    }).ok).toBe(true);
    expect(output.policy.parseAndProtect({
      rawObject: productCandidateWithParagraphs(family),
      context: narrativeContext,
    })).toMatchObject({ ok: false, error: { code: "output_policy_rejected" } });
  });

  it("uses token multiplicity, four shared distinct tokens, half containment, and the two-to-one ratio", () => {
    const related = [
      "balanced balanced woven textile surface amber",
      "balanced woven woven textile surface birch",
      "balanced woven textile textile surface cedar",
      "balanced woven textile surface surface dahlia",
    ];
    expect(output.policy.parseAndProtect({
      rawObject: productCandidateWithParagraphs(related),
      context: narrativeContext,
    }).ok).toBe(false);

    const onlyThreeSharedDistinct = [
      "balanced woven textile amber birch", "balanced woven textile cedar dahlia",
      "balanced woven textile elm fir", "balanced woven textile garnet hazel",
    ];
    expect(output.policy.parseAndProtect({
      rawObject: productCandidateWithParagraphs(onlyThreeSharedDistinct),
      context: narrativeContext,
    }).ok).toBe(true);

    const belowHalf = [
      "balanced woven textile surface amber birch cedar dahlia elm",
      "balanced woven textile surface fir garnet hazel indigo juniper",
      "balanced woven textile surface kiln linen maple nutmeg olive",
      "balanced woven textile surface pearl quartz ruby sienna topaz",
    ];
    expect(output.policy.parseAndProtect({
      rawObject: productCandidateWithParagraphs(belowHalf),
      context: narrativeContext,
    }).ok).toBe(true);

    const outsideRatio = [
      "balanced woven textile surface",
      "balanced woven textile surface amber birch cedar dahlia elm fir garnet",
      "surface textile woven balanced",
      "woven balanced surface textile",
    ];
    expect(output.policy.parseAndProtect({
      rawObject: productCandidateWithParagraphs(outsideRatio),
      context: narrativeContext,
    }).ok).toBe(true);
  });

  it("normalizes NFKC and English lowercase for detection without mutating stored text", () => {
    const stored = "Ｂａｌａｎｃｅｄ woven textile surface amber";
    const accepted = output.policy.parseAndProtect({
      rawObject: productCandidateWithParagraphs([stored]),
      context: narrativeContext,
    });
    expect(accepted.ok).toBe(true);
    if (accepted.ok) {
      expect(accepted.value.value.payload.descriptionBlocks).toEqual([
        { type: "paragraph", text: { text: stored, sourceRefs: ["src_01:fabricStyle"] } },
      ]);
    }
    expect(output.policy.parseAndProtect({
      rawObject: productCandidateWithParagraphs([
        stored,
        "balanced woven textile surface birch",
        "BALANCED textile woven surface cedar",
        "surface dahlia woven balanced textile",
      ]),
      context: narrativeContext,
    }).ok).toBe(false);
  });

  it("accepts bounded non-repetitive B2B paragraphs with shared textile vocabulary", () => {
    const paragraphs = [
      "Plain weave supports a crisp hand and balanced surface for shirting concepts.",
      "Twill construction offers diagonal texture and flexible drape for tailored applications.",
      "Brushed finishing creates a softer touch suited to layered apparel concepts.",
      "Lightweight cloth supports breathable silhouettes and fluid seasonal styling.",
      "Dense woven structure gives outerwear panels a substantial feel and clean shape.",
      "Textured dobby details add visual depth to understated interior accents.",
      "Stretch recovery helps fitted garments retain comfort through routine movement.",
      "Matte coloration provides a quiet base for coordinated collection development.",
    ];
    const result = output.policy.parseAndProtect({
      rawObject: {
        ...productCandidate("A conservative textile narrative."),
        descriptionBlocks: paragraphs.map((text) => ({
          type: "paragraph",
          text: { text, sourceRefs: ["src_01:fabricStyle"] },
        })),
      },
      context: narrativeContext,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.value.semanticReviewStatus).toBe("human_review_required");
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
