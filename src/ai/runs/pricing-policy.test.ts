import { describe, expect, it } from "vitest";

import {
  calculateAttemptUpperCostMicrousdV1,
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
});
