import { z } from "zod";

import { type ReadonlyJsonObject, type ReadonlyJsonValue } from "@/ai/canonical-json";
import type {
  AiModelConfigResolutionReadV1,
  AiModelConfigRow,
  ProviderEnvelopeIdentityV1,
  ResolvedModelConfigV1,
} from "@/ai/core/contracts";
import { aiFailure, aiSuccess, type AiServiceResult } from "@/ai/errors";
import type { LoadedPromptResourceV1 } from "@/ai/prompts/contracts";
import type { PromptBundleLoaderV1 } from "@/ai/prompts/loader";
import type { TextProviderRegistryV1 } from "@/ai/providers/registry";
import { resolvedConfigHashV1 } from "@/ai/internal/preparation";
import {
  calculateAttemptUpperCostMicrousdV1,
  localTestPricingPolicyRegistryV1,
  type PricingPolicyRegistryV1,
} from "@/ai/runs/pricing-policy";

const uuid = z.string().regex(
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
);
const rowSchema = z.object({
  id: uuid,
  capability: z.literal("text"),
  useCase: z.string().regex(/^[a-z][a-z0-9_]{0,63}$/),
  provider: z.string().regex(/^[a-z][a-z0-9_-]{0,63}$/),
  model: z.string().trim().min(1).max(128),
  parametersJson: z.unknown(),
  maxInputTokens: z.number().int().min(1).max(16_000),
  maxOutputTokens: z.number().int().min(1).max(4_000),
  maxAttempts: z.number().int().min(1).max(3),
  runCostLimitMicrousd: z.number().int().min(0).max(20_000),
  promptId: z.string().regex(/^[a-z][a-z0-9-]{0,63}$/),
  promptVersion: z.number().int().positive(),
  promptHash: z.string().regex(/^[0-9a-f]{64}$/),
  enabled: z.literal(true),
  isDefault: z.literal(true),
  fallbackConfigId: z.null(),
  recordVersion: z.number().int().positive(),
  createdByUserId: uuid,
  updatedByUserId: uuid,
  createdAt: z.date(),
  updatedAt: z.date(),
}).strict();

function readonlyJson(value: unknown): value is ReadonlyJsonValue {
  if (value === null || typeof value === "string" || typeof value === "boolean") return true;
  if (typeof value === "number") return Number.isFinite(value);
  if (Array.isArray(value)) return value.every(readonlyJson);
  if (typeof value !== "object") return false;
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) return false;
  return Object.entries(value).every(([, child]) => readonlyJson(child));
}

function readonlyJsonObject(value: unknown): value is ReadonlyJsonObject {
  return readonlyJson(value) && typeof value === "object" && value !== null && !Array.isArray(value);
}

function validateRepositoryResult(
  read: AiModelConfigResolutionReadV1,
  key: { readonly applicationClass: string; readonly capability: "text"; readonly useCase: string },
): AiServiceResult<readonly AiModelConfigRow[]> {
  if (
    read.version !== 1 || read.applicationClass !== key.applicationClass ||
    read.capability !== key.capability || read.useCase !== key.useCase ||
    !Number.isSafeInteger(read.totalRowCount) || read.totalRowCount < 0 ||
    !Number.isSafeInteger(read.defaultRowCount) || read.defaultRowCount < 0 ||
    !Number.isSafeInteger(read.enabledDefaultRowCount) || read.enabledDefaultRowCount < 0 ||
    read.defaultRowCount > read.totalRowCount ||
    read.enabledDefaultRowCount > read.defaultRowCount ||
    read.enabledDefaultRows.length !== read.enabledDefaultRowCount
  ) return aiFailure("config_repository_invalid");
  const ids = new Set<string>();
  const rows: AiModelConfigRow[] = [];
  for (const candidate of read.enabledDefaultRows) {
    const parsed = rowSchema.safeParse(candidate);
    if (!parsed.success || parsed.data.useCase !== key.useCase || ids.has(parsed.data.id) ||
      !readonlyJsonObject(parsed.data.parametersJson) ||
      parsed.data.updatedAt < parsed.data.createdAt) {
      return aiFailure("config_repository_invalid");
    }
    ids.add(parsed.data.id);
    rows.push({ ...parsed.data, parametersJson: parsed.data.parametersJson });
  }
  return aiSuccess(rows);
}

export interface ResolvedPhaseBConfigurationV1 {
  readonly model: ResolvedModelConfigV1;
  readonly providerEnvelope: ProviderEnvelopeIdentityV1;
  readonly prompt: LoadedPromptResourceV1;
}

export function resolveModelConfigV1(input: {
  readonly key: {
    readonly applicationClass: string;
    readonly capability: "text";
    readonly useCase: string;
  };
  readonly read: AiModelConfigResolutionReadV1;
  readonly inputSchemaVersion: number;
  readonly outputSchemaVersion: number;
  readonly policyVersion: string;
  readonly outputSchemaId: string;
  readonly providerRegistry: TextProviderRegistryV1;
  readonly promptLoader: PromptBundleLoaderV1;
  readonly pricingRegistry?: PricingPolicyRegistryV1;
  readonly pricingObservedAt?: Date;
}): AiServiceResult<ResolvedPhaseBConfigurationV1> {
  const rows = validateRepositoryResult(input.read, input.key);
  if (!rows.ok) return rows;
  if (input.read.totalRowCount === 0) return aiFailure("config_missing");
  if (input.read.enabledDefaultRowCount > 1) return aiFailure("config_ambiguous");
  if (input.read.enabledDefaultRowCount === 0) {
    return aiFailure(input.read.defaultRowCount > 0 ? "config_disabled" : "config_default_missing");
  }
  const row = rows.value[0];
  if (row === undefined) return aiFailure("config_repository_invalid");
  if (row.fallbackConfigId !== null) return aiFailure("fallback_forbidden");
  if (row.runCostLimitMicrousd === 0) return aiFailure("budget_disabled");
  const provider = input.providerRegistry.resolve(row.provider);
  if (!provider.ok) return provider;
  const adapterConfig = provider.value.resolveConfiguration({
    model: row.model,
    parameters: row.parametersJson,
  });
  if (!adapterConfig.ok) return adapterConfig;
  if (adapterConfig.value.model !== row.model) return aiFailure("model_unsupported");
  const envelope = provider.value.describeEnvelope();
  const prompt = input.promptLoader.load({
    promptId: row.promptId,
    promptVersion: row.promptVersion,
    promptHash: row.promptHash,
    applicationClass: input.key.applicationClass,
    capability: "text",
    useCase: input.key.useCase,
    inputSchemaVersion: input.inputSchemaVersion,
    outputSchemaVersion: input.outputSchemaVersion,
    policyVersion: input.policyVersion,
  });
  if (!prompt.ok) return prompt;
  const pricing = (input.pricingRegistry ?? localTestPricingPolicyRegistryV1).resolve({
    provider: row.provider,
    model: row.model,
    at: input.pricingObservedAt ?? row.updatedAt,
  });
  if (!pricing.ok) return pricing;
  const cost = calculateAttemptUpperCostMicrousdV1({
    maxInputTokens: row.maxInputTokens,
    maxOutputTokens: row.maxOutputTokens,
    maxAttempts: row.maxAttempts,
    pricing: pricing.value,
  });
  if (!cost.ok || cost.value.estimatedMax > row.runCostLimitMicrousd) {
    return aiFailure("config_invalid");
  }
  const protectedHash = resolvedConfigHashV1({
    applicationClass: input.key.applicationClass,
    capability: "text",
    useCase: input.key.useCase,
    modelConfigId: row.id,
    modelConfigVersion: row.recordVersion,
    requestedProvider: row.provider,
    requestedModel: row.model,
    parametersSnapshot: adapterConfig.value.parameters,
    maxInputTokens: row.maxInputTokens,
    maxOutputTokens: row.maxOutputTokens,
    maxAttempts: row.maxAttempts,
    runCostLimitMicrousd: row.runCostLimitMicrousd,
    promptId: row.promptId,
    promptVersion: row.promptVersion,
    promptHash: row.promptHash,
    providerEnvelope: envelope,
    inputSchemaVersion: input.inputSchemaVersion,
    outputSchemaVersion: input.outputSchemaVersion,
    policyVersion: input.policyVersion,
  });
  if (!protectedHash.ok) return aiFailure("canonicalization_failed");
  return aiSuccess({
    model: {
      modelConfigId: row.id,
      modelConfigVersion: row.recordVersion,
      resolvedConfigHash: protectedHash.value.hash,
      requestedProvider: row.provider,
      requestedModel: row.model,
      parametersSnapshot: adapterConfig.value.parameters,
      maxInputTokens: row.maxInputTokens,
      maxOutputTokens: row.maxOutputTokens,
      maxAttempts: row.maxAttempts,
      runCostLimitMicrousd: row.runCostLimitMicrousd,
    },
    providerEnvelope: envelope,
    prompt: prompt.value,
  });
}
