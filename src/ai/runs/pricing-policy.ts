import { aiFailure, aiSuccess, type AiServiceResult } from "@/ai/errors";

export interface AggregatePricingSnapshotV1 {
  readonly version: 1;
  readonly currency: "USD";
  readonly billing_unit_tokens: 1_000_000;
  readonly input_microusd_per_unit: number;
  readonly output_microusd_per_unit: number;
  readonly formula: "ceil-separate-v1";
  readonly source_id: string;
  readonly source_version: string;
  readonly effective_from: string;
  readonly observed_at: string;
}

export interface CacheSplitPricingSnapshotV2 {
  readonly version: 2;
  readonly currency: "USD";
  readonly billing_unit_tokens: 1_000_000;
  readonly cache_hit_input_microusd_per_unit: number;
  readonly cache_miss_input_microusd_per_unit: number;
  readonly output_microusd_per_unit: number;
  readonly formula: "ceil-cache-split-v1";
  readonly source_id: string;
  readonly source_url: string;
  readonly source_content_sha256: string;
  readonly source_version: string;
  readonly model_alias: string;
  readonly published_model_version: string;
  readonly effective_from: string;
  readonly observed_at: string;
  readonly max_age_seconds: 86_400;
}

export type PricingSnapshotV1 = AggregatePricingSnapshotV1 | CacheSplitPricingSnapshotV2;

export interface PricingPolicyRegistryV1 {
  readonly keys: readonly string[];
  resolve(input: { readonly provider: string; readonly model: string; readonly at: Date }):
    AiServiceResult<PricingSnapshotV1>;
}

const sourcePart = /^[a-z0-9][a-z0-9._-]{0,79}$/;

function validateSnapshot(snapshot: PricingSnapshotV1): boolean {
  if (snapshot.currency !== "USD" || snapshot.billing_unit_tokens !== 1_000_000 ||
    !sourcePart.test(snapshot.source_id) || !sourcePart.test(snapshot.source_version) ||
    !Number.isFinite(Date.parse(snapshot.effective_from)) ||
    !Number.isFinite(Date.parse(snapshot.observed_at))) return false;
  if (snapshot.version === 1) {
    return snapshot.formula === "ceil-separate-v1" &&
      Number.isSafeInteger(snapshot.input_microusd_per_unit) &&
      snapshot.input_microusd_per_unit >= 0 &&
      Number.isSafeInteger(snapshot.output_microusd_per_unit) &&
      snapshot.output_microusd_per_unit >= 0;
  }
  return snapshot.version === 2 && snapshot.formula === "ceil-cache-split-v1" &&
    Number.isSafeInteger(snapshot.cache_hit_input_microusd_per_unit) &&
    snapshot.cache_hit_input_microusd_per_unit >= 0 &&
    Number.isSafeInteger(snapshot.cache_miss_input_microusd_per_unit) &&
    snapshot.cache_miss_input_microusd_per_unit >= 0 &&
    Number.isSafeInteger(snapshot.output_microusd_per_unit) &&
    snapshot.output_microusd_per_unit >= 0 && snapshot.max_age_seconds === 86_400 &&
    snapshot.source_url === "https://api-docs.deepseek.com/quick_start/pricing/" &&
    /^[0-9a-f]{64}$/.test(snapshot.source_content_sha256) &&
    /^[a-z][a-z0-9_-]{0,63}$/.test(snapshot.model_alias) &&
    snapshot.published_model_version.length > 0 &&
    snapshot.published_model_version.length <= 128 &&
    snapshot.published_model_version === snapshot.published_model_version.trim();
}

export function createPricingPolicyRegistryV1(entries: readonly {
  readonly provider: string;
  readonly model: string;
  readonly snapshot: PricingSnapshotV1;
}[]): AiServiceResult<PricingPolicyRegistryV1> {
  const map = new Map<string, PricingSnapshotV1>();
  for (const entry of entries) {
    const key = `${entry.provider}\u0000${entry.model}`;
    if (map.has(key) || !validateSnapshot(entry.snapshot)) return aiFailure("config_invalid");
    map.set(key, Object.freeze({ ...entry.snapshot }));
  }
  return aiSuccess(Object.freeze({
    keys: Object.freeze([...map.keys()].map((key) => key.replace("\u0000", ":"))),
    resolve(input: { readonly provider: string; readonly model: string; readonly at: Date }) {
      const snapshot = map.get(`${input.provider}\u0000${input.model}`);
      if (snapshot === undefined) return aiFailure("pricing_stale");
      if (Date.parse(snapshot.effective_from) > input.at.getTime()) return aiFailure("pricing_stale");
      if (snapshot.version === 2) {
        const observedAt = Date.parse(snapshot.observed_at);
        const ageMilliseconds = input.at.getTime() - observedAt;
        if (ageMilliseconds < 0 || ageMilliseconds > snapshot.max_age_seconds * 1_000) {
          return aiFailure("pricing_stale");
        }
      }
      return aiSuccess(snapshot);
    },
  }));
}

export function calculateTextCostMicrousdV1(input: {
  readonly inputTokens: number;
  readonly outputTokens: number;
  readonly cacheHitInputTokens?: number;
  readonly cacheMissInputTokens?: number;
  readonly pricing: PricingSnapshotV1;
}): AiServiceResult<number> {
  const calculated = calculateTextCostBreakdownMicrousdV2(input);
  return calculated.ok ? aiSuccess(calculated.value.costMicrousd) : calculated;
}

export function calculateTextCostBreakdownMicrousdV2(input: {
  readonly inputTokens: number;
  readonly outputTokens: number;
  readonly cacheHitInputTokens?: number;
  readonly cacheMissInputTokens?: number;
  readonly pricing: PricingSnapshotV1;
}): AiServiceResult<{ readonly costMicrousd: number; readonly complete: boolean }> {
  if (!validateSnapshot(input.pricing) || !Number.isSafeInteger(input.inputTokens) ||
    !Number.isSafeInteger(input.outputTokens) || input.inputTokens < 0 || input.outputTokens < 0) {
    return aiFailure("config_invalid");
  }
  const unit = 1_000_000n;
  const ceil = (tokens: number, rate: number): bigint => {
    if (tokens === 0 || rate === 0) return 0n;
    return (BigInt(tokens) * BigInt(rate) + unit - 1n) / unit;
  };
  const pairPresent = input.cacheHitInputTokens !== undefined &&
    input.cacheMissInputTokens !== undefined;
  const pairAbsent = input.cacheHitInputTokens === undefined &&
    input.cacheMissInputTokens === undefined;
  if (!pairPresent && !pairAbsent) return aiFailure("config_invalid");
  if (pairPresent && (!Number.isSafeInteger(input.cacheHitInputTokens) ||
    !Number.isSafeInteger(input.cacheMissInputTokens) ||
    input.cacheHitInputTokens! < 0 || input.cacheMissInputTokens! < 0 ||
    input.cacheHitInputTokens! + input.cacheMissInputTokens! !== input.inputTokens)) {
    return aiFailure("config_invalid");
  }
  const cost = input.pricing.version === 1
    ? ceil(input.inputTokens, input.pricing.input_microusd_per_unit) +
      ceil(input.outputTokens, input.pricing.output_microusd_per_unit)
    : pairPresent
      ? ceil(input.cacheHitInputTokens!, input.pricing.cache_hit_input_microusd_per_unit) +
        ceil(input.cacheMissInputTokens!, input.pricing.cache_miss_input_microusd_per_unit) +
        ceil(input.outputTokens, input.pricing.output_microusd_per_unit)
      : ceil(input.inputTokens, input.pricing.cache_miss_input_microusd_per_unit) +
        ceil(input.outputTokens, input.pricing.output_microusd_per_unit);
  if (cost > BigInt(Number.MAX_SAFE_INTEGER)) return aiFailure("config_invalid");
  return aiSuccess({
    costMicrousd: Number(cost),
    complete: input.pricing.version === 1 || pairPresent,
  });
}

export function calculateAttemptUpperCostMicrousdV1(input: {
  readonly maxInputTokens: number;
  readonly maxOutputTokens: number;
  readonly maxAttempts: number;
  readonly pricing: PricingSnapshotV1;
}): AiServiceResult<{ readonly attemptUpper: number; readonly estimatedMax: number }> {
  const attempt = calculateTextCostMicrousdV1({
    inputTokens: input.maxInputTokens,
    outputTokens: input.maxOutputTokens,
    pricing: input.pricing,
  });
  if (!attempt.ok || !Number.isInteger(input.maxAttempts) || input.maxAttempts < 1 || input.maxAttempts > 3) {
    return aiFailure("config_invalid");
  }
  const estimated = attempt.value * input.maxAttempts;
  if (!Number.isSafeInteger(estimated)) return aiFailure("config_invalid");
  return aiSuccess({ attemptUpper: attempt.value, estimatedMax: estimated });
}

export const nonbillablePricingSnapshotV1: PricingSnapshotV1 = Object.freeze({
  version: 1,
  currency: "USD",
  billing_unit_tokens: 1_000_000,
  input_microusd_per_unit: 0,
  output_microusd_per_unit: 0,
  formula: "ceil-separate-v1",
  source_id: "cwt-nonbillable",
  source_version: "1",
  effective_from: "1970-01-01T00:00:00.000Z",
  observed_at: "1970-01-01T00:00:00.000Z",
});

const productionRegistry = createPricingPolicyRegistryV1([]);
if (!productionRegistry.ok) throw new Error("The empty Production pricing registry is invalid.");
export const productionPricingPolicyRegistryV1 = productionRegistry.value;

const localRegistry = createPricingPolicyRegistryV1([
  { provider: "synthetic_alpha", model: "synthetic-text-alpha-v1", snapshot: nonbillablePricingSnapshotV1 },
  { provider: "synthetic_beta", model: "synthetic-text-beta-v1", snapshot: nonbillablePricingSnapshotV1 },
]);
if (!localRegistry.ok) throw new Error("The local/test pricing registry is invalid.");
export const localTestPricingPolicyRegistryV1 = localRegistry.value;
