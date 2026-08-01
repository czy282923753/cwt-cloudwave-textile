import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";

import { migrateDatabase } from "@/db/migrate";
import * as schema from "@/db/schema";

export async function createTestDatabase() {
  const client = new PGlite("memory://");
  const connection = {
    kind: "pglite" as const,
    db: drizzle(client, { schema }),
    close: async () => client.close(),
  };
  await migrateDatabase(connection);
  return connection;
}
