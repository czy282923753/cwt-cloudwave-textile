import { migrate as migratePglite } from "drizzle-orm/pglite/migrator";

import type { DatabaseConnection } from "./client";
import { migratePostgresWithEnumCompatibility } from "./postgres-enum-migration-compatibility";

export async function migrateDatabase(
  connection: DatabaseConnection,
  migrationsFolder = "drizzle",
): Promise<void> {
  if (connection.kind === "pglite") {
    await migratePglite(connection.db, { migrationsFolder });
    return;
  }

  const migrationClient = connection.createMigrationClient();
  try {
    await migratePostgresWithEnumCompatibility(migrationClient, migrationsFolder);
  } finally {
    await migrationClient.end();
  }
}
