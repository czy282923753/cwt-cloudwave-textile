import { describe, expect, it } from "vitest";

import {
  calculateAttemptUpperCostMicrousdV1,
  calculateTextCostBreakdownMicrousdV2,
  calculateTextCostMicrousdV1,
  createPricingPolicyRegistryV1,
  nonbillablePricingSnapshotV1,
  productionPricingPolicyRegistryV1,
} from "./pricing-policy";

describe("pricing policy V1", () => {
  it("uses separate ceiling arithmetic and exact attempt ceilings", () => {
    const pricing = { ...nonbillablePricingSnapshotV1, input_microusd_per_unit: 1, output_microusd_per_unit: 2 };
    expect(calculateTextCostMicrousdV1({ inputTokens: 1, outputTokens: 1, pricing })).toEqual({ ok: true, value: 2 });
    expect(calculateAttemptUpperCostMicrousdV1({ maxInputTokens: 1, maxOutputTokens: 1, maxAttempts: 3, pricing }))
      .toEqual({ ok: true, value: { attemptUpper: 2, estimatedMax: 6 } });
  });

  it("keeps Production exact-empty and fails closed on missing/stale pricing", () => {
    expect(productionPricingPolicyRegistryV1.keys).toEqual([]);
    expect(productionPricingPolicyRegistryV1.resolve({ provider: "missing", model: "missing", at: new Date() }))
      .toMatchObject({ ok: false, error: { code: "pricing_stale" } });
    const registry = createPricingPolicyRegistryV1([{ provider: "p", model: "m", snapshot: {
      ...nonbillablePricingSnapshotV1,
      effective_from: "2099-01-01T00:00:00.000Z",
    } }]);
    expect(registry.ok).toBe(true);
    if (registry.ok) expect(registry.value.resolve({ provider: "p", model: "m", at: new Date("2026-01-01") }))
      .toMatchObject({ ok: false, error: { code: "pricing_stale" } });
  });

  it("uses exact cache-split arithmetic and conservative miss accounting", () => {
    const pricing = {
      version: 2 as const,
      currency: "USD" as const,
      billing_unit_tokens: 1_000_000 as const,
      cache_hit_input_microusd_per_unit: 14_000,
      cache_miss_input_microusd_per_unit: 440_000,
      output_microusd_per_unit: 1_320_000,
      formula: "ceil-cache-split-v1" as const,
      source_id: "deepseek-official-pricing",
      source_url: "https://api-docs.deepseek.com/quick_start/pricing/",
      source_content_sha256: "a".repeat(64),
      source_version: "2026-08-23-deepseek-v4-flash-peak-conservative",
      model_alias: "deepseek-v4-flash",
      published_model_version: "DeepSeek-V4-Flash-0731",
      effective_from: "2026-08-23T10:23:53.657Z",
      observed_at: "2026-08-23T10:23:53.657Z",
      max_age_seconds: 604_800 as const,
    };
    expect(calculateTextCostBreakdownMicrousdV2({
      inputTokens: 10,
      outputTokens: 2,
      cacheHitInputTokens: 6,
      cacheMissInputTokens: 4,
      pricing,
    })).toEqual({ ok: true, value: { costMicrousd: 6, complete: true } });
    expect(calculateTextCostBreakdownMicrousdV2({
      inputTokens: 10,
      outputTokens: 2,
      pricing,
    })).toEqual({ ok: true, value: { costMicrousd: 8, complete: false } });
    expect(calculateAttemptUpperCostMicrousdV1({
      maxInputTokens: 2_048,
      maxOutputTokens: 64,
      maxAttempts: 1,
      pricing,
    })).toEqual({ ok: true, value: { attemptUpper: 987, estimatedMax: 987 } });
  });
});
