import { randomUUID } from "node:crypto";

import { eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres, { type Sql } from "postgres";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import type { PreparedCoreRunV1 } from "@/ai/core/contracts";
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
import type { DatabaseConnection, PostgresAppDatabase } from "@/db/client";
import * as schema from "@/db/schema";
import {
  CWT_AI_TEXT_CLAIM_BUDGET_ADVISORY_KEY_V1,
  createAiRunRepositoryV1,
} from "./repository";

const postgresUrl = process.env.CWT_PHASE_C_POSTGRES_URL;
const hash = (character: string) => character.repeat(64);

interface Fixture {
  readonly actorId: string;
  readonly productId: string;
  readonly configId: string;
}

let client: Sql | undefined;
let database: PostgresAppDatabase | undefined;

function db(): PostgresAppDatabase {
  if (database === undefined) throw new Error("Real PostgreSQL fixture was not initialized.");
  return database;
}

function preparedRun(fixture: Fixture, overrides: {
  readonly idempotencyKey?: string;
  readonly fingerprint?: string;
  readonly maxAttempts?: number;
  readonly runCostLimitMicrousd?: number;
} = {}): PreparedCoreRunV1 {
  return {
    version: 1,
    applicationClass: "draft_assistance",
    useCase: "product_description_draft",
    capability: "text",
    requestIdentity: {
      idempotencyKey: overrides.idempotencyKey ?? randomUUID(),
      fingerprintVersion: 1,
      fingerprint: overrides.fingerprint ?? hash("1"),
      requestedByPrincipalId: fixture.actorId,
    },
    association: {
      kind: "draft_assistance.product_draft.v1",
      persistenceVersion: 1,
      value: {
        targetType: "product_draft",
        targetProductId: fixture.productId,
        targetLocale: "en",
        expectedTargetVersion: 1,
      },
    },
    associationSnapshotHash: hash("2"),
    resolvedConfig: {
      modelConfigId: fixture.configId,
      modelConfigVersion: 1,
      resolvedConfigHash: hash("3"),
      requestedProvider: "synthetic_alpha",
      requestedModel: "synthetic-text-alpha-v1",
      parametersSnapshot: {},
      maxInputTokens: 1_000,
      maxOutputTokens: 200,
      maxAttempts: overrides.maxAttempts ?? 3,
      runCostLimitMicrousd: overrides.runCostLimitMicrousd ?? 20_000,
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
    inputContext: { product: { name: "Synthetic Repository Product" } },
    inputHash: hash("6"),
  };
}

async function seedFixture(): Promise<Fixture> {
  const [actor] = await db().insert(users).values({
    email: `${randomUUID()}@repository.example.test`,
    displayName: "Synthetic Repository Actor",
    role: "product_editor",
    passwordHash: "test-only",
  }).returning({ id: users.id });
  if (actor === undefined) throw new Error("Actor fixture failed.");
  const productId = await db().transaction(async (transaction) => {
    const [taxonomy] = await transaction.insert(taxonomyTerms).values({
      internalKey: `synthetic-repository-${randomUUID()}`,
      dimension: "material_fiber",
    }).returning({ id: taxonomyTerms.id });
    const [product] = await transaction.insert(products).values({
      status: "draft",
      createdByUserId: actor.id,
    }).returning({ id: products.id });
    if (product === undefined || taxonomy === undefined) throw new Error("Product fixture failed.");
    await transaction.insert(productLocalizations).values({
      productId: product.id,
      locale: "en",
      name: "Synthetic Repository Product",
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
  return { actorId: actor.id, productId, configId: config.id };
}

async function insertPrepared(
  prepared: PreparedCoreRunV1,
  executionEnvironment: "local" | "test" | "staging" = "test",
  costs: { readonly estimatedMax?: number; readonly runLimit?: number } = {},
) {
  const repository = createAiRunRepositoryV1(db());
  return db().transaction((transaction) => repository.insertPreparedWithinTransaction(transaction, {
    preparedRun: prepared,
    executionEnvironment,
    pricingSnapshot: executionEnvironment === "staging" ? {
      version: 1,
      currency: "USD",
      billing_unit_tokens: 1_000_000,
      input_microusd_per_unit: 1,
      output_microusd_per_unit: 1,
      formula: "ceil-separate-v1",
      source_id: "synthetic-billable",
      source_version: "1",
      effective_from: "1970-01-01T00:00:00.000Z",
      observed_at: "1970-01-01T00:00:00.000Z",
    } : {},
    estimatedMaxCostMicrousd: costs.estimatedMax ?? 0,
    dailyHardLimitMicrousd: executionEnvironment === "staging" ? 5_000_000 : 0,
    monthlyWarningLimitMicrousd: executionEnvironment === "staging" ? 50_000_000 : 0,
    monthlyHardLimitMicrousd: executionEnvironment === "staging" ? 100_000_000 : 0,
  }));
}

describe.skipIf(postgresUrl === undefined)("Phase C ai_runs PostgreSQL repository", () => {
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

  beforeEach(async () => {
    await db().execute(sql`truncate table ${aiRuns}, ${aiModelConfig}, ${featureFlags}, ${productLocalizations}, ${products}, ${users} cascade`);
  });

  afterAll(async () => {
    await client?.end();
  });

  it("binds idempotency to actor and fingerprint and preserves exactly one row", async () => {
    const fixture = await seedFixture();
    const key = randomUUID();
    const initial = preparedRun(fixture, { idempotencyKey: key });
    const repository = createAiRunRepositoryV1(db());
    const first = await insertPrepared(initial);
    expect(first.kind).toBe("inserted");

    const replay = await db().transaction((transaction) => repository.findReplayWithinTransaction(
      transaction,
      {
        idempotencyKey: key,
        requestedByUserId: fixture.actorId,
        requestFingerprintVersion: 1,
        requestFingerprint: hash("1"),
      },
    ));
    expect(replay.kind).toBe("exact_replay");

    const conflict = await db().transaction((transaction) => repository.findReplayWithinTransaction(
      transaction,
      {
        idempotencyKey: key,
        requestedByUserId: fixture.actorId,
        requestFingerprintVersion: 1,
        requestFingerprint: hash("9"),
      },
    ));
    expect(conflict).toEqual({ kind: "conflict" });
    const rows = await db().select().from(aiRuns);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      status: "pending",
      retryState: "none",
      attemptCount: 0,
      stateVersion: 1,
      costAccountingState: "preflight",
      actualCostMicrousd: 0,
      budgetAccountedCostMicrousd: 0,
      budgetReservedCostMicrousd: 0,
      candidateJson: null,
      candidateHash: null,
    });
  });

  it("claims with database time, a fresh lease token, and CAS-fenced heartbeat", async () => {
    const fixture = await seedFixture();
    const inserted = await insertPrepared(preparedRun(fixture));
    if (inserted.kind !== "inserted") throw new Error("Expected inserted run.");
    const repository = createAiRunRepositoryV1(db(), {
      uuid: () => "22222222-2222-4222-8222-222222222222",
    });
    const claim = await repository.claimOrRecover({
      executionEnvironment: "test",
      workerId: "repository-worker-a",
    });
    expect(claim.kind).toBe("claimed");
    const [claimed] = await db().select().from(aiRuns).where(eq(aiRuns.id, inserted.row.id));
    if (claimed === undefined) throw new Error("Claimed run disappeared.");
    expect(claimed).toMatchObject({
      status: "processing",
      attemptCount: 1,
      leaseOwner: "repository-worker-a",
      leaseToken: "22222222-2222-4222-8222-222222222222",
      stateVersion: 2,
      costAccountingState: "reserved",
      budgetReservedCostMicrousd: 0,
      activeAttemptDispatchedAt: null,
    });
    expect(claimed?.budgetChargeDay).not.toBeNull();
    expect(claimed?.budgetChargeMonth).not.toBeNull();
    if (claimed.leaseExpiresAt === null || claimed.leaseToken === null) {
      throw new Error("Claim lease was incomplete.");
    }
    const stale = await repository.heartbeat({
      runId: claimed.id,
      executionEnvironment: "test",
      leaseOwner: claimed.leaseOwner!,
      leaseToken: claimed.leaseToken,
      leaseExpiresAt: claimed.leaseExpiresAt,
      stateVersion: claimed.stateVersion - 1,
    });
    expect(stale.kind).toBe("lease_lost_or_unsafe");
    const renewed = await repository.heartbeat({
      runId: claimed.id,
      executionEnvironment: "test",
      leaseOwner: claimed.leaseOwner!,
      leaseToken: claimed.leaseToken,
      leaseExpiresAt: claimed.leaseExpiresAt,
      stateVersion: claimed.stateVersion,
    });
    expect(renewed.kind).toBe("renewed");
    if (renewed.kind === "renewed") expect(renewed.stateVersion).toBe(3);
  });

  it("never reads or mutates a run when the lifecycle advisory lock is busy", async () => {
    const fixture = await seedFixture();
    const inserted = await insertPrepared(preparedRun(fixture));
    if (inserted.kind !== "inserted") throw new Error("Expected inserted run.");
    const lockClient = postgres(postgresUrl!, {
      max: 1,
      prepare: false,
      onnotice: () => undefined,
    });
    const lock = CWT_AI_TEXT_CLAIM_BUDGET_ADVISORY_KEY_V1;
    try {
      await lockClient.begin(async (transaction) => {
        await transaction`select pg_advisory_xact_lock(${lock[0]}, ${lock[1]})`;
        const result = await createAiRunRepositoryV1(db()).claimOrRecover({
          executionEnvironment: "test",
          workerId: "repository-worker-b",
        });
        expect(result).toEqual({ kind: "idle", reason: "lock_busy" });
        const [row] = await db().select().from(aiRuns).where(eq(aiRuns.id, inserted.row.id));
        expect(row).toMatchObject({ status: "pending", attemptCount: 0, stateVersion: 1 });
      });
    } finally {
      await lockClient.end();
    }
  });

  it("serializes multiple claimers and never commits more than two active leases", async () => {
    const fixture = await seedFixture();
    for (let index = 0; index < 4; index += 1) {
      await insertPrepared(preparedRun(fixture, { idempotencyKey: randomUUID(), fingerprint: `${index}`.repeat(64) }));
    }
    const results = await Promise.all(Array.from({ length: 8 }, (_, index) =>
      createAiRunRepositoryV1(db()).claimOrRecover({
        executionEnvironment: "test",
        workerId: `repository-worker-${index}`,
      })));
    if (results.filter((result) => result.kind === "claimed").length < 2) {
      results.push(await createAiRunRepositoryV1(db()).claimOrRecover({
        executionEnvironment: "test",
        workerId: "repository-worker-follow-up",
      }));
    }
    const [active] = await db().select({ value: sql<number>`count(*)` }).from(aiRuns)
      .where(eq(aiRuns.status, "processing"));
    expect(Number(active?.value)).toBeLessThanOrEqual(2);
    expect(results.filter((result) => result.kind === "claimed")).toHaveLength(2);
    const claims = await db().select().from(aiRuns).where(eq(aiRuns.status, "processing"));
    expect(new Set(claims.map((row) => row.leaseToken)).size).toBe(2);
    expect(claims.every((row) => row.attemptCount === 1)).toBe(true);
  });
});
