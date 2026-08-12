import "server-only";

import {
  createPricingPolicyRegistryV1,
  type CacheSplitPricingSnapshotV2,
} from "@/ai/runs/pricing-policy";

export const DEEPSEEK_PRICING_SOURCE_URL_V1 =
  "https://api-docs.deepseek.com/quick_start/pricing/";
export const DEEPSEEK_PRICING_SOURCE_SHA256_V1 =
  "3af5e5d6992a4e26709ed37f02d9bfbc46ee92dc825e6588404728419f41ce71";

export const deepSeekPricingSnapshotV2: CacheSplitPricingSnapshotV2 = Object.freeze({
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

export function createDeepSeekPricingPolicyRegistryV1() {
  const registry = createPricingPolicyRegistryV1([{
    provider: "deepseek",
    model: "deepseek-v4-flash",
    snapshot: deepSeekPricingSnapshotV2,
  }]);
  if (!registry.ok) throw new Error("The reviewed DeepSeek pricing snapshot is invalid.");
  return registry.value;
}
