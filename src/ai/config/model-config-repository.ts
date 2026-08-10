import { and, asc, eq } from "drizzle-orm";
import type { PgQueryResultHKT } from "drizzle-orm/pg-core/session";
import { z } from "zod";

import type { DraftConsistentReadScope } from "@/ai/applications/draft-assistance/read-scopes";
import { withDraftReadExecutor } from "@/ai/applications/draft-assistance/read-scopes";
import type { ReadonlyJsonObject, ReadonlyJsonValue } from "@/ai/canonical-json";
import type {
  AiModelConfigResolutionReadV1,
  AiModelConfigRow,
} from "@/ai/core/contracts";
import { aiFailure, aiSuccess, type AiServiceResult } from "@/ai/errors";
import { aiModelConfig } from "@/db/schema";

export interface AiModelConfigRepository {
  readResolutionState<TQueryResult extends PgQueryResultHKT>(
    scope: DraftConsistentReadScope<TQueryResult>,
    key: {
      readonly applicationClass: string;
      readonly capability: "text";
      readonly useCase: string;
    },
  ): Promise<AiServiceResult<AiModelConfigResolutionReadV1>>;
}

const uuid = z.string().regex(
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
);
const modelRowSchema = z.object({
  id: uuid,
  capability: z.literal("text"),
  useCase: z.string(),
  provider: z.string(),
  model: z.string(),
  parametersJson: z.unknown(),
  maxInputTokens: z.number().int(),
  maxOutputTokens: z.number().int(),
  maxAttempts: z.number().int(),
  runCostLimitMicrousd: z.number().int(),
  promptId: z.string(),
  promptVersion: z.number().int(),
  promptHash: z.string(),
  enabled: z.boolean(),
  isDefault: z.boolean(),
  fallbackConfigId: uuid.nullable(),
  recordVersion: z.number().int(),
  createdByUserId: uuid,
  updatedByUserId: uuid,
  createdAt: z.date(),
  updatedAt: z.date(),
}).strict();

function jsonValue(value: unknown): value is ReadonlyJsonValue {
  if (value === null || typeof value === "string" || typeof value === "boolean") return true;
  if (typeof value === "number") return Number.isFinite(value);
  if (Array.isArray(value)) return value.every(jsonValue);
  if (typeof value !== "object") return false;
  const prototype = Object.getPrototypeOf(value);
  return (prototype === Object.prototype || prototype === null) &&
    Object.values(value).every(jsonValue);
}

function jsonObject(value: unknown): value is ReadonlyJsonObject {
  return jsonValue(value) && typeof value === "object" && value !== null && !Array.isArray(value);
}

function mapRow(row: z.infer<typeof modelRowSchema>): AiServiceResult<AiModelConfigRow> {
  if (!jsonObject(row.parametersJson)) return aiFailure("config_repository_invalid");
  return aiSuccess({
    id: row.id,
    capability: "text",
    useCase: row.useCase,
    provider: row.provider,
    model: row.model,
    parametersJson: row.parametersJson,
    maxInputTokens: row.maxInputTokens,
    maxOutputTokens: row.maxOutputTokens,
    maxAttempts: row.maxAttempts,
    runCostLimitMicrousd: row.runCostLimitMicrousd,
    promptId: row.promptId,
    promptVersion: row.promptVersion,
    promptHash: row.promptHash,
    enabled: row.enabled,
    isDefault: row.isDefault,
    fallbackConfigId: row.fallbackConfigId,
    recordVersion: row.recordVersion,
    createdByUserId: row.createdByUserId,
    updatedByUserId: row.updatedByUserId,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  });
}

export const aiModelConfigRepositoryV1: AiModelConfigRepository = {
  async readResolutionState(scope, key) {
    if (key.applicationClass !== "draft_assistance") {
      return aiFailure("config_repository_invalid");
    }
    try {
      const selected = await withDraftReadExecutor(scope, (database) => database.select({
        id: aiModelConfig.id,
        capability: aiModelConfig.capability,
        useCase: aiModelConfig.useCase,
        provider: aiModelConfig.provider,
        model: aiModelConfig.model,
        parametersJson: aiModelConfig.parametersJson,
        maxInputTokens: aiModelConfig.maxInputTokens,
        maxOutputTokens: aiModelConfig.maxOutputTokens,
        maxAttempts: aiModelConfig.maxAttempts,
        runCostLimitMicrousd: aiModelConfig.runCostLimitMicrousd,
        promptId: aiModelConfig.promptId,
        promptVersion: aiModelConfig.promptVersion,
        promptHash: aiModelConfig.promptHash,
        enabled: aiModelConfig.enabled,
        isDefault: aiModelConfig.isDefault,
        fallbackConfigId: aiModelConfig.fallbackConfigId,
        recordVersion: aiModelConfig.recordVersion,
        createdByUserId: aiModelConfig.createdByUserId,
        updatedByUserId: aiModelConfig.updatedByUserId,
        createdAt: aiModelConfig.createdAt,
        updatedAt: aiModelConfig.updatedAt,
      }).from(aiModelConfig).where(and(
        eq(aiModelConfig.capability, key.capability),
        eq(aiModelConfig.useCase, key.useCase),
      )).orderBy(asc(aiModelConfig.id)));
      const rows: AiModelConfigRow[] = [];
      let defaultRowCount = 0;
      let enabledDefaultRowCount = 0;
      for (const selectedRow of selected) {
        const parsed = modelRowSchema.safeParse(selectedRow);
        if (!parsed.success || parsed.data.capability !== key.capability ||
          parsed.data.useCase !== key.useCase) return aiFailure("config_repository_invalid");
        if (parsed.data.isDefault) defaultRowCount += 1;
        if (parsed.data.enabled && parsed.data.isDefault) {
          enabledDefaultRowCount += 1;
          const row = mapRow(parsed.data);
          if (!row.ok) return row;
          rows.push(row.value);
        }
      }
      return aiSuccess({
        version: 1,
        applicationClass: "draft_assistance",
        capability: "text",
        useCase: key.useCase,
        totalRowCount: selected.length,
        defaultRowCount,
        enabledDefaultRowCount,
        enabledDefaultRows: rows,
      });
    } catch {
      return aiFailure("config_repository_invalid");
    }
  },
};
