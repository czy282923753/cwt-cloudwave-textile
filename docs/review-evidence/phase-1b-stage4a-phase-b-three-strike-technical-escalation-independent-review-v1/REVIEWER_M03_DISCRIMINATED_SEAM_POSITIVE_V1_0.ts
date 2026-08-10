import type { PgQueryResultHKT } from "drizzle-orm/pg-core/session";

import {
  databaseConnection,
  type DatabaseConnection,
} from "../../../src/db/client";
import type { AppDatabase } from "../../../src/db/types";

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

const trustedEnvironment = Object.freeze({
  appEnvironment: "local",
  processFeatureAiEnabled: true,
}) satisfies TrustedPhaseBEnvironmentV1;

function composeFromActualUnion(
  connection: DatabaseConnection,
): DraftAssistanceService {
  switch (connection.kind) {
    case "pglite":
      return createPhaseBAvailabilityServiceV1({
        database: connection.db,
        trustedEnvironment,
      });
    case "postgres":
      return createPhaseBAvailabilityServiceV1({
        database: connection.db,
        trustedEnvironment,
      });
    default:
      return unsupportedDatabaseConnection(connection);
  }
}

export const reviewerComposedService = composeFromActualUnion(databaseConnection);
