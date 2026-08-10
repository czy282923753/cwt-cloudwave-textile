import { describe, expect, it } from "vitest";

import { canonicalJsonHash, canonicalizeJson } from "./canonical-json";

describe("RFC 8785 canonical JSON", () => {
  it("matches the published numeric sample and UTF-16 property order", () => {
    const result = canonicalizeJson({
      literals: [null, true, false],
      numbers: [333333333.33333329, 4.5, 0.002, -0],
      string: "€$\u000f\nA'B\"\\\"/",
    });
    expect(result).toEqual({
      ok: true,
      value:
        '{"literals":[null,true,false],"numbers":[333333333.3333333,4.5,0.002,0],"string":"€$\\u000f\\nA\'B\\\"\\\\\\\"/"}',
    });

    const ordered = canonicalizeJson({
      "€": "Euro Sign",
      "\r": "Carriage Return",
      "\ufb33": "Hebrew Letter Dalet With Dagesh",
      "1": "One",
      "😀": "Emoji: Grinning Face",
      "\u0080": "Control",
      ö: "Latin Small Letter O With Diaeresis",
    });
    expect(ordered.ok && ordered.value).toBe(
      '{"\\r":"Carriage Return","1":"One","":"Control","ö":"Latin Small Letter O With Diaeresis","€":"Euro Sign","😀":"Emoji: Grinning Face","דּ":"Hebrew Letter Dalet With Dagesh"}',
    );
  });

  it("rejects non-I-JSON and non-plain values", () => {
    const sparse: unknown[] = [];
    sparse[1] = "x";
    const cyclic: { self?: unknown } = {};
    cyclic.self = cyclic;
    for (const value of [NaN, Infinity, undefined, 1n, sparse, cyclic, new Date()]) {
      expect(canonicalizeJson(value)).toMatchObject({
        ok: false,
        error: { code: "canonicalization_failed" },
      });
    }
  });

  it("reconstructs the fixed Phase A configuration hash", () => {
    const result = canonicalJsonHash({
      application_class: "draft_assistance",
      capability: "text",
      input_schema_version: 1,
      max_attempts: 3,
      max_input_tokens: 16000,
      max_output_tokens: 4000,
      model_config_id: "44444444-4444-4444-8444-444444444444",
      model_config_version: 4,
      output_schema_version: 1,
      parameters_snapshot_json: { temperature: 0, top_p: 1 },
      policy_version: "draft-product-description-v1",
      prompt_hash: "a".repeat(64),
      prompt_id: "product-description-draft",
      prompt_version: 1,
      provider_envelope_hash: "b".repeat(64),
      provider_envelope_version: 1,
      requested_model: "synthetic-text-alpha-v1",
      requested_provider: "synthetic_alpha",
      run_cost_limit_microusd: 20000,
      use_case: "product_description_draft",
    });
    expect(result.ok && result.value.hash).toBe(
      "4a31457a0458233e62c0de489f95f3e7cd6463c1fe95b3e0c3620452d82845f3",
    );
  });
});
