import { eq } from "drizzle-orm";
import type { PgQueryResultHKT } from "drizzle-orm/pg-core/session";

import type { DraftConsistentReadScope } from "@/ai/applications/draft-assistance/read-scopes";
import { withDraftReadExecutor } from "@/ai/applications/draft-assistance/read-scopes";
import type { AiFeatureStateReadV1 } from "@/ai/core/contracts";
import { featureFlags } from "@/db/schema";
import { aiFailure, aiSuccess, type AiServiceResult } from "@/ai/errors";

import type { TrustedPhaseBEnvironmentV1 } from "./trusted-phase-b-environment";

export interface AiFeatureGateRepository {
  readAiFeatureState<TQueryResult extends PgQueryResultHKT>(
    scope: DraftConsistentReadScope<TQueryResult>,
  ): Promise<AiServiceResult<AiFeatureStateReadV1>>;
}

export const aiFeatureGateRepositoryV1: AiFeatureGateRepository = {
  async readAiFeatureState(scope) {
    try {
      const rows = await withDraftReadExecutor(scope, (database) =>
        database.select({ enabled: featureFlags.enabled })
          .from(featureFlags).where(eq(featureFlags.key, "ai")));
      if (rows.length > 1) return aiFailure("config_repository_invalid");
      return aiSuccess({
        processEnabled: true,
        databaseRowPresent: rows.length === 1,
        databaseEnabled: rows[0]?.enabled ?? false,
      });
    } catch {
      return aiFailure("config_repository_invalid");
    }
  },
};

export function resolveAiFeatureStateV1(
  environment: TrustedPhaseBEnvironmentV1,
  read: AiFeatureStateReadV1,
): AiServiceResult<true> {
  if (environment.appEnvironment !== "local" && environment.appEnvironment !== "test") {
    return aiFailure("environment_not_authorized");
  }
  if (!environment.processFeatureAiEnabled || !read.processEnabled) {
    return aiFailure("feature_disabled");
  }
  if (!read.databaseRowPresent) return aiFailure("feature_flag_missing");
  if (!read.databaseEnabled) return aiFailure("feature_disabled");
  return aiSuccess(true);
}
