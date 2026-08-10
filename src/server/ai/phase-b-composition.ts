import "server-only";
import { env } from "@/config/env";
import { databaseConnection } from "@/db/client";
import type { TrustedPhaseBEnvironmentV1 } from "@/ai/config/trusted-phase-b-environment";
import { createPhaseBAvailabilityServiceV1 } from "@/ai/applications/draft-assistance/composition";

function unsupportedDatabaseConnection(connection: never): never {
  void connection;
  throw new Error("Unsupported database connection kind.");
}

export function createPhaseBServerAiAvailabilityV1() {
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
