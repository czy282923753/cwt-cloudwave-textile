import { readFile } from "node:fs/promises";

import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres, { type Sql } from "postgres";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { createTextProviderRegistryV1 } from "@/ai/providers/registry";
import type { DatabaseConnection, PostgresAppDatabase } from "@/db/client";
import { migrateDatabase } from "@/db/migrate";
import * as schema from "@/db/schema";
import { createPricingPolicyRegistryV1 } from "./pricing-policy";
import { createAiRunWorkerV1 } from "./worker";

const postgresUrl = process.env.CWT_PHASE_C_POSTGRES_URL;
let client: Sql | undefined;
let database: PostgresAppDatabase | undefined;

function db(): PostgresAppDatabase {
  if (database === undefined) throw new Error("Real PostgreSQL fixture was not initialized.");
  return database;
}

describe.skipIf(postgresUrl === undefined)("Phase C Worker shutdown boundary", () => {
  beforeAll(async () => {
    if (postgresUrl === undefined) return;
    client = postgres(postgresUrl, { max: 6, prepare: false, onnotice: () => undefined });
    database = drizzle(client, { schema });
    const connection: DatabaseConnection = {
      kind: "postgres",
      db: database,
      createMigrationClient: () => postgres(postgresUrl, { max: 1, prepare: false }),
      close: async () => undefined,
    };
    await migrateDatabase(connection);
  });
  afterAll(async () => client?.end());

  it.each(["SIGINT", "SIGTERM"] as const)("stops accepting claims on %s and leaves no lifecycle lock", async (signal) => {
    await db().execute(sql`truncate table ai_runs, ai_model_config, feature_flags cascade`);
    const providers = createTextProviderRegistryV1([]);
    const pricing = createPricingPolicyRegistryV1([]);
    if (!providers.ok || !pricing.ok) throw new Error("Empty test registries were invalid.");
    const worker = createAiRunWorkerV1({
      database: db(),
      trustedEnvironment: { appEnvironment: "test", processFeatureAiEnabled: true },
      providerRegistry: providers.value,
      promptLoader: { load: () => { throw new Error("No Prompt may load without work."); } },
      pricingRegistry: pricing.value,
      timing: {
        heartbeatIntervalMs: 15_000,
        lockRetryDelayMs: 1_000,
        idlePollMs: 10,
        gracefulShutdownMs: 200,
        postAbortPersistenceMs: 50,
      },
      workerId: `synthetic-shutdown-${signal}`,
    });
    const beforeStart = worker.join();
    expect(worker.join()).toBe(beforeStart);
    await expect(beforeStart).resolves.toBeUndefined();
    await worker.start();
    expect(worker.running).toBe(true);
    const generationCompletion = worker.join();
    expect(worker.join()).toBe(generationCompletion);
    const stopCompletion = worker.stop(signal);
    expect(worker.join()).toBe(generationCompletion);
    await stopCompletion;
    await generationCompletion;
    expect(worker.join()).toBe(generationCompletion);
    await expect(worker.join()).resolves.toBeUndefined();
    expect(worker.running).toBe(false);
    const locks = await db().execute<{ readonly count: number }>(sql`
      select count(*)::integer as count
      from pg_locks
      where locktype = 'advisory'
        and classid = 1129792594
        and objid = 1
    `);
    expect(locks[0]?.count).toBe(0);
  });

  it("keeps the CLI signal-aware and rooted only through the sole Phase C Worker export", async () => {
    const source = await readFile(new URL("../../../scripts/process-ai-runs.ts", import.meta.url), "utf8");
    expect(source).toContain('import { createPhaseDAiRunWorkerV1 } from "@/server/ai/phase-d-provider-composition";');
    expect(source).toContain('process.once("SIGINT"');
    expect(source).toContain('process.once("SIGTERM"');
    expect(source).not.toMatch(/runs\/repository|providers\/registry|prompts\/loader|db\/client/);
  });
});
