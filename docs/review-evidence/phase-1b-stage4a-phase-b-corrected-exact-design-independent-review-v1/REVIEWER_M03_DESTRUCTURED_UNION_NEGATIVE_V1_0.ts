import type { PgQueryResultHKT } from "drizzle-orm/pg-core/session";

import { env } from "@/config/env";
import { databaseConnection } from "@/db/client";
import type { AppDatabase } from "@/db/types";

interface TrustedPhaseBEnvironmentV1 {
  readonly appEnvironment: "local" | "test" | "staging" | "production";
  readonly processFeatureAiEnabled: boolean;
}

declare function createPhaseBAvailabilityServiceV1<TQueryResult extends PgQueryResultHKT>(dependencies: {
  readonly database: AppDatabase<TQueryResult>;
  readonly trustedEnvironment: TrustedPhaseBEnvironmentV1;
}): { readonly serviceKind: "draft_assistance" };

const trustedEnvironment = Object.freeze({
  appEnvironment: env.APP_ENV,
  processFeatureAiEnabled: env.FEATURE_AI,
}) satisfies TrustedPhaseBEnvironmentV1;

const { db } = databaseConnection;
export const invalidDestructuredUnion = createPhaseBAvailabilityServiceV1({
  database: db,
  trustedEnvironment,
});
