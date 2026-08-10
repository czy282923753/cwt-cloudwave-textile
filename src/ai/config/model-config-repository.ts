import { sql } from "drizzle-orm";
import type { PgQueryResultHKT } from "drizzle-orm/pg-core/session";
import { z } from "zod";

import type { DraftConsistentReadScope } from "@/ai/applications/draft-assistance/read-scopes";
import { withDraftReadExecutor } from "@/ai/applications/draft-assistance/read-scopes";
import type {
  AiModelConfigResolutionReadV1,
  AiModelConfigRow,
} from "@/ai/core/contracts";
import { aiFailure, aiSuccess, type AiServiceResult } from "@/ai/errors";
import type { ReadonlyJsonObject, ReadonlyJsonValue } from "@/ai/canonical-json";

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
  use_case: z.string(),
  provider: z.string(),
  model: z.string(),
  parameters_json: z.unknown(),
  max_input_tokens: z.number().int(),
  max_output_tokens: z.number().int(),
  max_attempts: z.number().int(),
  run_cost_limit_microusd: z.number().int(),
  prompt_id: z.string(),
  prompt_version: z.number().int(),
  prompt_hash: z.string(),
  enabled: z.boolean(),
  is_default: z.boolean(),
  fallback_config_id: uuid.nullable(),
  record_version: z.number().int(),
  created_by_user_id: uuid,
  updated_by_user_id: uuid,
  created_at: z.coerce.date(),
  updated_at: z.coerce.date(),
}).strict();
const aggregateSchema = z.object({
  applicationClass: z.literal("draft_assistance"),
  capability: z.literal("text"),
  useCase: z.string(),
  totalRowCount: z.number().int().nonnegative(),
  defaultRowCount: z.number().int().nonnegative(),
  enabledDefaultRowCount: z.number().int().nonnegative(),
  enabledDefaultRows: z.array(modelRowSchema),
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

function ownRecord(value: unknown): Record<string, unknown> | undefined {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return undefined;
  return Object.fromEntries(Object.entries(value));
}

function firstAggregateRow(result: unknown): unknown {
  if (Array.isArray(result)) return result.length === 1 ? result[0] : undefined;
  const record = ownRecord(result);
  const rows = record?.rows;
  return Array.isArray(rows) && rows.length === 1 ? rows[0] : undefined;
}

function mapRow(row: z.infer<typeof modelRowSchema>): AiServiceResult<AiModelConfigRow> {
  if (!jsonObject(row.parameters_json)) return aiFailure("config_repository_invalid");
  return aiSuccess({
    id: row.id,
    capability: "text",
    useCase: row.use_case,
    provider: row.provider,
    model: row.model,
    parametersJson: row.parameters_json,
    maxInputTokens: row.max_input_tokens,
    maxOutputTokens: row.max_output_tokens,
    maxAttempts: row.max_attempts,
    runCostLimitMicrousd: row.run_cost_limit_microusd,
    promptId: row.prompt_id,
    promptVersion: row.prompt_version,
    promptHash: row.prompt_hash,
    enabled: row.enabled,
    isDefault: row.is_default,
    fallbackConfigId: row.fallback_config_id,
    recordVersion: row.record_version,
    createdByUserId: row.created_by_user_id,
    updatedByUserId: row.updated_by_user_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  });
}

export const aiModelConfigRepositoryV1: AiModelConfigRepository = {
  async readResolutionState(scope, key) {
    if (key.applicationClass !== "draft_assistance") {
      return aiFailure("config_repository_invalid");
    }
    try {
      const rawResult = await withDraftReadExecutor(scope, (database) => database.execute(sql`
        WITH scoped AS MATERIALIZED (
          SELECT
            id, capability, use_case, provider, model, parameters_json,
            max_input_tokens, max_output_tokens, max_attempts,
            run_cost_limit_microusd, prompt_id, prompt_version, prompt_hash,
            enabled, is_default, fallback_config_id, record_version,
            created_by_user_id, updated_by_user_id, created_at, updated_at
          FROM ai_model_config
          WHERE capability = ${key.capability} AND use_case = ${key.useCase}
        ),
        facts AS (
          SELECT
            count(*)::integer AS total_row_count,
            count(*) FILTER (WHERE is_default)::integer AS default_row_count,
            count(*) FILTER (WHERE enabled AND is_default)::integer AS enabled_default_row_count
          FROM scoped
        )
        SELECT
          'draft_assistance' AS "applicationClass",
          ${key.capability} AS capability,
          ${key.useCase} AS "useCase",
          facts.total_row_count AS "totalRowCount",
          facts.default_row_count AS "defaultRowCount",
          facts.enabled_default_row_count AS "enabledDefaultRowCount",
          COALESCE(
            jsonb_agg(to_jsonb(scoped) ORDER BY scoped.id)
              FILTER (WHERE scoped.enabled AND scoped.is_default),
            '[]'::jsonb
          ) AS "enabledDefaultRows"
        FROM facts
        LEFT JOIN scoped ON true
        GROUP BY facts.total_row_count, facts.default_row_count, facts.enabled_default_row_count
      `));
      const aggregate = aggregateSchema.safeParse(firstAggregateRow(rawResult));
      if (!aggregate.success || aggregate.data.capability !== key.capability ||
        aggregate.data.useCase !== key.useCase) return aiFailure("config_repository_invalid");
      const rows: AiModelConfigRow[] = [];
      for (const rawRow of aggregate.data.enabledDefaultRows) {
        const row = mapRow(rawRow);
        if (!row.ok) return row;
        rows.push(row.value);
      }
      return aiSuccess({
        version: 1,
        applicationClass: "draft_assistance",
        capability: "text",
        useCase: key.useCase,
        totalRowCount: aggregate.data.totalRowCount,
        defaultRowCount: aggregate.data.defaultRowCount,
        enabledDefaultRowCount: aggregate.data.enabledDefaultRowCount,
        enabledDefaultRows: rows,
      });
    } catch {
      return aiFailure("config_repository_invalid");
    }
  },
};
