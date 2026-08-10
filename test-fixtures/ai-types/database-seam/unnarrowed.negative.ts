import type { PgQueryResultHKT } from "drizzle-orm/pg-core/session";

import type { DatabaseConnection } from "@/db/client";
import type { AppDatabase } from "@/db/types";

function acceptOneDatabase<TQueryResult extends PgQueryResultHKT>(
  database: AppDatabase<TQueryResult>,
): AppDatabase<TQueryResult> {
  return database;
}

export function rejectedUnnarrowedSeam(connection: DatabaseConnection) {
  return acceptOneDatabase(connection.db);
}
