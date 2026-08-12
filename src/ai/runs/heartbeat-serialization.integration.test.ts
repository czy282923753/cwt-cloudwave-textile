import { randomUUID } from "node:crypto";

import { and, eq, gt, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres, { type Sql } from "postgres";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import type { PreparedCoreRunV1 } from "@/ai/core/contracts";
import type { DatabaseConnection, PostgresAppDatabase } from "@/db/client";
import { migrateDatabase } from "@/db/migrate";
import {
  aiModelConfig,
  aiRuns,
  featureFlags,
  productLocalizations,
  productTaxonomyTerms,
  products,
  taxonomyTerms,
  users,
} from "@/db/schema";
import * as schema from "@/db/schema";
import type { ClaimedLeaseHandleV1 } from "./contracts";
import { createAiRunRepositoryV1 } from "./repository";

const postgresUrl = process.env.CWT_PHASE_C_POSTGRES_URL;
const hash = (character: string) => character.repeat(64);

let client: Sql | undefined;
let database: PostgresAppDatabase | undefined;

function db(): PostgresAppDatabase {
  if (database === undefined) throw new Error("Real PostgreSQL fixture was not initialized.");
  return database;
}

function deferred(): {
  readonly promise: Promise<void>;
  readonly resolve: () => void;
} {
  let resolve!: () => void;
  const promise = new Promise<void>((accept) => {
    resolve = accept;
  });
  return { promise, resolve };
}

async function seedThreeRuns(): Promise<void> {
  const [actor] = await db().insert(users).values({
    email: `${randomUUID()}@heartbeat.example.test`,
    displayName: "Synthetic Heartbeat Actor",
    role: "product_editor",
    passwordHash: "test-only",
  }).returning({ id: users.id });
  if (actor === undefined) throw new Error("Actor fixture failed.");
  const productId = await db().transaction(async (transaction) => {
    const [taxonomy] = await transaction.insert(taxonomyTerms).values({
      internalKey: `synthetic-heartbeat-${randomUUID()}`,
      dimension: "material_fiber",
    }).returning({ id: taxonomyTerms.id });
    const [product] = await transaction.insert(products).values({
      status: "draft",
      createdByUserId: actor.id,
    }).returning({ id: products.id });
    if (taxonomy === undefined || product === undefined) throw new Error("Product fixture failed.");
    await transaction.insert(productLocalizations).values({
      productId: product.id,
      locale: "en",
      name: "Synthetic Heartbeat Product",
    });
    await transaction.insert(productTaxonomyTerms).values({
      productId: product.id,
      taxonomyTermId: taxonomy.id,
      isPrimary: true,
    });
    return product.id;
  });
  const [config] = await db().insert(aiModelConfig).values({
    useCase: "product_description_draft",
    provider: "synthetic_alpha",
    model: "synthetic-text-alpha-v1",
    maxInputTokens: 1_000,
    maxOutputTokens: 200,
    maxAttempts: 3,
    runCostLimitMicrousd: 20_000,
    promptId: "product-description-draft",
    promptVersion: 1,
    promptHash: hash("4"),
    enabled: true,
    isDefault: true,
    createdByUserId: actor.id,
    updatedByUserId: actor.id,
  }).returning({ id: aiModelConfig.id });
  if (config === undefined) throw new Error("Config fixture failed.");
  await db().insert(featureFlags).values({ key: "ai", enabled: true });
  const repository = createAiRunRepositoryV1(db());
  for (let index = 0; index < 3; index += 1) {
    const prepared: PreparedCoreRunV1 = {
      version: 1,
      applicationClass: "draft_assistance",
      useCase: "product_description_draft",
      capability: "text",
      requestIdentity: {
        idempotencyKey: randomUUID(),
        fingerprintVersion: 1,
        fingerprint: `${index}`.repeat(64),
        requestedByPrincipalId: actor.id,
      },
      association: {
        kind: "draft_assistance.product_draft.v1",
        persistenceVersion: 1,
        value: {
          targetType: "product_draft",
          targetProductId: productId,
          targetLocale: "en",
          expectedTargetVersion: 1,
        },
      },
      associationSnapshotHash: hash("2"),
      resolvedConfig: {
        modelConfigId: config.id,
        modelConfigVersion: 1,
        resolvedConfigHash: hash("3"),
        requestedProvider: "synthetic_alpha",
        requestedModel: "synthetic-text-alpha-v1",
        parametersSnapshot: {},
        maxInputTokens: 1_000,
        maxOutputTokens: 200,
        maxAttempts: 3,
        runCostLimitMicrousd: 20_000,
      },
      promptIdentity: {
        promptId: "product-description-draft",
        promptVersion: 1,
        promptHash: hash("4"),
      },
      providerEnvelope: { version: 1, hash: hash("5") },
      inputSchemaVersion: 1,
      outputSchemaId: "cwt.product-description-draft.v1",
      outputSchemaVersion: 1,
      policyVersion: "stage4a-v1",
      resultKind: "draft_assistance_candidate",
      dispositionKind: "human_review",
      inputSources: [],
      inputContext: { product: { name: "Synthetic Heartbeat Product" } },
      inputHash: hash("6"),
    };
    await db().transaction((transaction) => repository.insertPreparedWithinTransaction(transaction, {
      preparedRun: prepared,
      executionEnvironment: "test",
      pricingSnapshot: {},
      estimatedMaxCostMicrousd: 0,
      dailyHardLimitMicrousd: 0,
      monthlyWarningLimitMicrousd: 0,
      monthlyHardLimitMicrousd: 0,
    }));
  }
}

function handle(row: typeof aiRuns.$inferSelect): ClaimedLeaseHandleV1 {
  if (row.leaseOwner === null || row.leaseToken === null || row.leaseExpiresAt === null) {
    throw new Error("Processing fixture was missing its lease.");
  }
  return {
    runId: row.id,
    executionEnvironment: "test",
    leaseOwner: row.leaseOwner,
    leaseToken: row.leaseToken,
    leaseExpiresAt: row.leaseExpiresAt,
    stateVersion: row.stateVersion,
  };
}

async function activeCount(): Promise<number> {
  const result = await db().execute<{ readonly value: string }>(sql`
    select count(*)::text as value
    from ai_runs
    where execution_environment = 'test'
      and status = 'processing'
      and lease_expires_at > clock_timestamp()
  `);
  return Number(result[0]?.value ?? -1);
}

describe.skipIf(postgresUrl === undefined)("Phase C H-01 heartbeat serialization", () => {
  beforeAll(async () => {
    if (postgresUrl === undefined) return;
    client = postgres(postgresUrl, { max: 12, prepare: false, onnotice: () => undefined });
    database = drizzle(client, { schema });
    const connection: DatabaseConnection = {
      kind: "postgres",
      db: database,
      createMigrationClient: () => postgres(postgresUrl, {
        max: 1,
        prepare: false,
        onnotice: () => undefined,
      }),
      close: async () => undefined,
    };
    await migrateDatabase(connection);
  }, 30_000);

  afterAll(async () => {
    await client?.end();
  });

  it("proves both advisory-owner orders with committed R1/R2 and due R3", async () => {
    await db().execute(sql`truncate table ${aiRuns}, ${aiModelConfig}, ${featureFlags}, ${productLocalizations}, ${products}, ${users} cascade`);
    await seedThreeRuns();
    const claimer = createAiRunRepositoryV1(db());
    expect((await claimer.claimOrRecover({ executionEnvironment: "test", workerId: "worker-r1" })).kind)
      .toBe("claimed");
    expect((await claimer.claimOrRecover({ executionEnvironment: "test", workerId: "worker-r2" })).kind)
      .toBe("claimed");
    expect(await activeCount()).toBe(2);
    const processing = await db().select().from(aiRuns).where(eq(aiRuns.status, "processing"));
    const initialR1 = processing.find((row) => row.leaseOwner === "worker-r1");
    if (initialR1 === undefined) throw new Error("R1 was not claimed.");

    const [shortenedR1] = await db().update(aiRuns).set({
      leaseExpiresAt: sql`clock_timestamp() + interval '11 seconds'`,
    }).where(eq(aiRuns.id, initialR1.id)).returning();
    if (shortenedR1 === undefined) throw new Error("R1 expiry setup failed.");
    const oldExpiry = shortenedR1.leaseExpiresAt;
    if (oldExpiry === null) throw new Error("R1 old expiry was null.");

    const heartbeatEntered = deferred();
    const releaseHeartbeat = deferred();
    const heartbeatRepository = createAiRunRepositoryV1(db(), {
      barriers: {
        async beforeCommit(input) {
          if (input.operation === "heartbeat" && input.runId === shortenedR1.id) {
            heartbeatEntered.resolve();
            await releaseHeartbeat.promise;
          }
        },
      },
    });
    const heartbeatPromise = heartbeatRepository.heartbeat(handle(shortenedR1));
    await heartbeatEntered.promise;
    let observedOldExpiry = false;
    while (!observedOldExpiry) {
      const observation = await db().execute<{ readonly passed: boolean }>(sql`
        select clock_timestamp() >= ${oldExpiry.toISOString()}::timestamptz as passed
      `);
      observedOldExpiry = observation[0]?.passed === true;
      if (!observedOldExpiry) await new Promise<void>((resolve) => setImmediate(resolve));
    }
    const contenderWhileHeartbeatOwns = await createAiRunRepositoryV1(db()).claimOrRecover({
      executionEnvironment: "test",
      workerId: "worker-c-after-old-expiry",
    });
    expect(contenderWhileHeartbeatOwns).toEqual({ kind: "idle", reason: "lock_busy" });
    expect(await activeCount()).toBe(1);
    releaseHeartbeat.resolve();
    const renewed = await heartbeatPromise;
    expect(renewed.kind).toBe("renewed");
    expect(await activeCount()).toBe(2);
    const noThirdAfterRenewal = await createAiRunRepositoryV1(db()).claimOrRecover({
      executionEnvironment: "test",
      workerId: "worker-r3-denied",
    });
    expect(noThirdAfterRenewal).toEqual({ kind: "idle", reason: "concurrency" });

    const [renewedR1] = await db().select().from(aiRuns).where(eq(aiRuns.id, shortenedR1.id));
    if (renewedR1 === undefined) throw new Error("Renewed R1 disappeared.");
    await db().update(aiRuns).set({
      leaseExpiresAt: sql`clock_timestamp() - interval '1 millisecond'`,
    }).where(eq(aiRuns.id, renewedR1.id));
    const recoveryMutated = deferred();
    const releaseRecovery = deferred();
    const recoveryRepository = createAiRunRepositoryV1(db(), {
      barriers: {
        async afterRunMutation(input) {
          if (input.operation === "claim_or_recover" && input.runId === renewedR1.id) {
            recoveryMutated.resolve();
            await releaseRecovery.promise;
          }
        },
      },
    });
    const recoveryPromise = recoveryRepository.claimOrRecover({
      executionEnvironment: "test",
      workerId: "worker-c-recovery-owner",
    });
    await recoveryMutated.promise;
    const heartbeatWhileRecoveryOwns = await createAiRunRepositoryV1(db()).heartbeat(handle(renewedR1));
    expect(heartbeatWhileRecoveryOwns.kind).toBe("lock_busy");
    releaseRecovery.resolve();
    expect(await recoveryPromise).toEqual({ kind: "recovered", runId: renewedR1.id });
    const lateHeartbeat = await createAiRunRepositoryV1(db()).heartbeat(handle(renewedR1));
    expect(lateHeartbeat.kind).toBe("lease_lost_or_unsafe");
    const claimedR3 = await createAiRunRepositoryV1(db()).claimOrRecover({
      executionEnvironment: "test",
      workerId: "worker-r3-after-recovery",
    });
    expect(claimedR3.kind).toBe("claimed");
    expect(await activeCount()).toBe(2);
    const active = await db().select().from(aiRuns).where(and(
      eq(aiRuns.status, "processing"),
      gt(aiRuns.leaseExpiresAt, sql`clock_timestamp()`),
    ));
    expect(active.map((row) => row.leaseOwner).sort()).toEqual([
      "worker-r2",
      "worker-r3-after-recovery",
    ]);
    const sessions = await db().execute<{ readonly count: string }>(sql`
      select count(*)::text as count
      from pg_stat_activity
      where datname = current_database() and state = 'idle in transaction'
    `);
    expect(Number(sessions[0]?.count ?? -1)).toBe(0);
    const residual = await db().execute<{ readonly count: string }>(sql`
      select count(*)::text as count
      from pg_locks
      where locktype = 'advisory'
        and classid = 1129792594
        and objid = 1
    `);
    expect(Number(residual[0]?.count ?? -1)).toBe(0);
  }, 30_000);
});
