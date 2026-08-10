import { and, eq } from "drizzle-orm";
import type { PgQueryResultHKT } from "drizzle-orm/pg-core/session";

import type { DraftConsistentReadScope } from "@/ai/applications/draft-assistance/read-scopes";
import { withDraftReadExecutor } from "@/ai/applications/draft-assistance/read-scopes";
import type {
  AiModelConfigResolutionReadV1,
  AiModelConfigRow,
} from "@/ai/core/contracts";
import { aiModelConfig } from "@/db/schema";
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

export const aiModelConfigRepositoryV1: AiModelConfigRepository = {
  async readResolutionState(scope, key) {
    if (key.applicationClass !== "draft_assistance") {
      return aiFailure("config_repository_invalid");
    }
    try {
      const rawRows = await withDraftReadExecutor(
        scope,
        (database) => database.select().from(aiModelConfig).where(and(
          eq(aiModelConfig.capability, key.capability),
          eq(aiModelConfig.useCase, key.useCase),
        )),
      );
      const rows: AiModelConfigRow[] = [];
      for (const row of rawRows) {
        if (row.capability !== "text" || !jsonObject(row.parametersJson)) {
          return aiFailure("config_repository_invalid");
        }
        rows.push({ ...row, capability: "text", parametersJson: row.parametersJson });
      }
      const defaultRows = rows.filter((row) => row.isDefault);
      const enabledDefaults = defaultRows.filter((row) => row.enabled)
        .sort((left, right) => left.id.localeCompare(right.id));
      return aiSuccess({
        version: 1,
        applicationClass: "draft_assistance",
        capability: "text",
        useCase: key.useCase,
        totalRowCount: rows.length,
        defaultRowCount: defaultRows.length,
        enabledDefaultRowCount: enabledDefaults.length,
        enabledDefaultRows: enabledDefaults,
      });
    } catch {
      return aiFailure("config_repository_invalid");
    }
  },
};
