import { migrate as migratePglite } from "drizzle-orm/pglite/migrator";
import { migrate as migratePostgres } from "drizzle-orm/postgres-js/migrator";

import type { DatabaseConnection } from "./client";

export async function migrateDatabase(
  connection: DatabaseConnection,
  migrationsFolder = "drizzle",
): Promise<void> {
  if (connection.kind === "pglite") {
    await migratePglite(connection.db, { migrationsFolder });
    return;
  }

  await migratePostgres(connection.db, { migrationsFolder });
}
