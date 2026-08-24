import "server-only";

import {
  createPricingPolicyRegistryV1,
  type CacheSplitPricingSnapshotV2,
} from "@/ai/runs/pricing-policy";

export const DEEPSEEK_PRICING_SOURCE_URL_V1 =
  "https://api-docs.deepseek.com/quick_start/pricing/";
export const DEEPSEEK_PRICING_SOURCE_SHA256_V1 =
  "d321546b99bc77060c1716c86228810e84ccfee6c157a3ee5aee5296a3cdec51";

export const deepSeekPricingSnapshotV2: CacheSplitPricingSnapshotV2 = Object.freeze({
  version: 2,
  currency: "USD",
  billing_unit_tokens: 1_000_000,
  cache_hit_input_microusd_per_unit: 14_000,
  cache_miss_input_microusd_per_unit: 440_000,
  output_microusd_per_unit: 1_320_000,
  formula: "ceil-cache-split-v1",
  source_id: "deepseek-official-pricing",
  source_url: DEEPSEEK_PRICING_SOURCE_URL_V1,
  source_content_sha256: DEEPSEEK_PRICING_SOURCE_SHA256_V1,
  source_version: "2026-08-23-deepseek-v4-flash-peak-conservative",
  model_alias: "deepseek-v4-flash",
  published_model_version: "DeepSeek-V4-Flash-0731",
  effective_from: "2026-08-23T10:23:53.657Z",
  observed_at: "2026-08-23T10:23:53.657Z",
  max_age_seconds: 604_800,
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
