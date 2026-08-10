import type { PgQueryResultHKT } from "drizzle-orm/pg-core/session";

import type { DatabaseConnection } from "@/db/client";
import type { AppDatabase } from "@/db/types";

function acceptBranchDatabase<TQueryResult extends PgQueryResultHKT>(
  database: AppDatabase<TQueryResult>,
): AppDatabase<TQueryResult> {
  return database;
}

export function positiveDatabaseSeam(connection: DatabaseConnection) {
  switch (connection.kind) {
    case "pglite": return acceptBranchDatabase(connection.db);
    case "postgres": return acceptBranchDatabase(connection.db);
  }
}
