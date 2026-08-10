import type { PgQueryResultHKT } from "drizzle-orm/pg-core/session";

import type { DatabaseConnection } from "@/db/client";
import type { AppDatabase } from "@/db/types";

function requireSameDriver<TQueryResult extends PgQueryResultHKT>(
  left: AppDatabase<TQueryResult>,
  right: AppDatabase<TQueryResult>,
): readonly [AppDatabase<TQueryResult>, AppDatabase<TQueryResult>] {
  return [left, right];
}

type PgliteConnection = Extract<DatabaseConnection, { readonly kind: "pglite" }>;
type PostgresConnection = Extract<DatabaseConnection, { readonly kind: "postgres" }>;

export function rejectedDriverSwap(
  pglite: PgliteConnection,
  postgres: PostgresConnection,
) {
  return requireSameDriver(pglite.db, postgres.db);
}
