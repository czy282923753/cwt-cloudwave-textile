import { PGlite } from "@electric-sql/pglite";
import { drizzle as drizzlePglite, type PgliteDatabase } from "drizzle-orm/pglite";
import { drizzle as drizzlePostgres, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import postgres, { type Sql } from "postgres";

import { env } from "@/config/env";

import * as schema from "./schema";

export type PgliteAppDatabase = PgliteDatabase<typeof schema>;
export type PostgresAppDatabase = PostgresJsDatabase<typeof schema>;

export type DatabaseConnection =
  | {
      kind: "pglite";
      db: PgliteAppDatabase;
      close: () => Promise<void>;
    }
  | {
      kind: "postgres";
      db: PostgresAppDatabase;
      createMigrationClient: () => Sql;
      close: () => Promise<void>;
    };

declare global {
  var cwtDatabaseConnection: DatabaseConnection | undefined;
}

export function createDatabaseConnection(): DatabaseConnection {
  if (env.DATABASE_DRIVER === "pglite") {
    const dataDirectory = env.PGLITE_DATA_DIR.startsWith("memory://")
      ? env.PGLITE_DATA_DIR
      : resolve(env.PGLITE_DATA_DIR);
    if (!dataDirectory.startsWith("memory://")) {
      mkdirSync(dirname(dataDirectory), { recursive: true });
    }
    const client = new PGlite(dataDirectory);
    return {
      kind: "pglite",
      db: drizzlePglite(client, { schema }),
      close: async () => client.close(),
    };
  }

  const client = postgres(env.DATABASE_URL, {
    max: env.DATABASE_POOL_MAX,
    prepare: false,
  });
  return {
    kind: "postgres",
    db: drizzlePostgres(client, { schema }),
    createMigrationClient: () => postgres(env.DATABASE_URL, { max: 1, prepare: false }),
    close: async () => client.end(),
  };
}

export const databaseConnection =
  globalThis.cwtDatabaseConnection ?? createDatabaseConnection();

if (env.APP_ENV !== "production") {
  globalThis.cwtDatabaseConnection = databaseConnection;
}
