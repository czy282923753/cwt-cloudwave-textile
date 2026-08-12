import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  createDeepSeekPricingPolicyRegistryV1,
  deepSeekPricingSnapshotV2,
  DEEPSEEK_PRICING_SOURCE_SHA256_V1,
  DEEPSEEK_PRICING_SOURCE_URL_V1,
} from "./deepseek-pricing";

describe("reviewed DeepSeek pricing V2", () => {
  it("binds the exact accepted source, model and rates", () => {
    expect(deepSeekPricingSnapshotV2).toEqual({
      version: 2,
      currency: "USD",
      billing_unit_tokens: 1_000_000,
      cache_hit_input_microusd_per_unit: 2_800,
      cache_miss_input_microusd_per_unit: 140_000,
      output_microusd_per_unit: 280_000,
      formula: "ceil-cache-split-v1",
      source_id: "deepseek-official-pricing",
      source_url: DEEPSEEK_PRICING_SOURCE_URL_V1,
      source_content_sha256: DEEPSEEK_PRICING_SOURCE_SHA256_V1,
      source_version: "2026-08-12-deepseek-v4-flash",
      model_alias: "deepseek-v4-flash",
      published_model_version: "DeepSeek-V4-Flash-0731",
      effective_from: "2026-08-12T16:38:29.000Z",
      observed_at: "2026-08-12T16:38:29.000Z",
      max_age_seconds: 86_400,
    });
  });

  it("is current only inside the reviewed 24-hour window", () => {
    const registry = createDeepSeekPricingPolicyRegistryV1();
    expect(registry.resolve({
      provider: "deepseek",
      model: "deepseek-v4-flash",
      at: new Date("2026-08-13T16:38:29.000Z"),
    })).toMatchObject({ ok: true });
    expect(registry.resolve({
      provider: "deepseek",
      model: "deepseek-v4-flash",
      at: new Date("2026-08-13T16:38:29.001Z"),
    })).toMatchObject({ ok: false, error: { code: "pricing_stale" } });
  });
});
