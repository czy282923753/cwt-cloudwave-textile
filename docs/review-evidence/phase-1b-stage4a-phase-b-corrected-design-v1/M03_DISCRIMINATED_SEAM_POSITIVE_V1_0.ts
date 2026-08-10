import type { PgQueryResultHKT } from "drizzle-orm/pg-core/session";

import { env } from "@/config/env";
import { databaseConnection } from "@/db/client";
import type { AppDatabase } from "@/db/types";

interface TrustedPhaseBEnvironmentV1 {
  readonly appEnvironment: "local" | "test" | "staging" | "production";
  readonly processFeatureAiEnabled: boolean;
}

interface DraftAssistanceService {
  readonly serviceKind: "draft_assistance";
}

declare function createPhaseBAvailabilityServiceV1<
  TQueryResult extends PgQueryResultHKT,
>(dependencies: {
  readonly database: AppDatabase<TQueryResult>;
  readonly trustedEnvironment: TrustedPhaseBEnvironmentV1;
}): DraftAssistanceService;

function unsupportedDatabaseConnection(connection: never): never {
  throw new Error("Unsupported database connection kind.");
}

export function createPhaseBServerAiAvailabilityV1(): DraftAssistanceService {
  const trustedEnvironment = Object.freeze({
    appEnvironment: env.APP_ENV,
    processFeatureAiEnabled: env.FEATURE_AI,
  }) satisfies TrustedPhaseBEnvironmentV1;

  switch (databaseConnection.kind) {
    case "pglite":
      return createPhaseBAvailabilityServiceV1({
        database: databaseConnection.db,
        trustedEnvironment,
      });
    case "postgres":
      return createPhaseBAvailabilityServiceV1({
        database: databaseConnection.db,
        trustedEnvironment,
      });
    default:
      return unsupportedDatabaseConnection(databaseConnection);
  }
}
