import { PGlite } from "@electric-sql/pglite";
import { drizzle as drizzlePglite, type PgliteDatabase } from "drizzle-orm/pglite";
import { drizzle as drizzlePostgres, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import postgres from "postgres";

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
      close: () => Promise<void>;
    };

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

  const client = postgres(env.DATABASE_URL, { max: 10, prepare: false });
  return {
    kind: "postgres",
    db: drizzlePostgres(client, { schema }),
    close: async () => client.end(),
  };
}

const globalDatabase = globalThis as typeof globalThis & {
  cwtDatabaseConnection?: DatabaseConnection;
};

export const databaseConnection =
  globalDatabase.cwtDatabaseConnection ?? createDatabaseConnection();

if (env.APP_ENV !== "production") {
  globalDatabase.cwtDatabaseConnection = databaseConnection;
}
