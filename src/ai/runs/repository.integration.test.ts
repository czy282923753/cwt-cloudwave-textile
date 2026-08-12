import { randomUUID } from "node:crypto";

import { eq, or, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres, { type Sql } from "postgres";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import type {
  PreparedCoreRunV1,
  ProtectedApplicationResultEnvelopeV1,
} from "@/ai/core/contracts";
import { aiFailure } from "@/ai/errors";
import { normalizeAttemptEvidenceV2 } from "@/ai/runs/attempt-evidence";
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
  costs: {
    readonly estimatedMax?: number;
    readonly runLimit?: number;
    readonly inputRate?: number;
    readonly outputRate?: number;
  } = {},
) {
  const repository = createAiRunRepositoryV1(db());
  return db().transaction((transaction) => repository.insertPreparedWithinTransaction(transaction, {
    preparedRun: prepared,
    executionEnvironment,
    pricingSnapshot: executionEnvironment === "staging" ? {
      version: 1,
      currency: "USD",
      billing_unit_tokens: 1_000_000,
      input_microusd_per_unit: costs.inputRate ?? 1,
      output_microusd_per_unit: costs.outputRate ?? 1,
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

async function createAccountedStagingTemplate(fixture: Fixture): Promise<typeof aiRuns.$inferSelect> {
  const inserted = await insertPrepared(preparedRun(fixture, {
    idempotencyKey: randomUUID(),
    fingerprint: hash("7"),
    maxAttempts: 1,
    runCostLimitMicrousd: 20_000,
  }), "staging", { estimatedMax: 20_000 });
  if (inserted.kind !== "inserted") throw new Error("Staging template insert failed.");
  const repository = createAiRunRepositoryV1(db());
  const claim = await repository.claimOrRecover({
    executionEnvironment: "staging",
    workerId: "budget-template-worker",
  });
  if (claim.kind !== "claimed") throw new Error("Staging template claim failed.");
  const [processing] = await db().select().from(aiRuns).where(eq(aiRuns.id, inserted.row.id));
  if (processing === undefined || processing.leaseOwner === null || processing.leaseToken === null ||
    processing.leaseExpiresAt === null) throw new Error("Staging template lease was incomplete.");
  const marker = await repository.authorizeProviderDispatch({
    runId: processing.id,
    executionEnvironment: "staging",
    leaseOwner: processing.leaseOwner,
    leaseToken: processing.leaseToken,
    leaseExpiresAt: processing.leaseExpiresAt,
    stateVersion: processing.stateVersion,
    pricingCurrent: true,
  });
  if (marker.kind !== "authorized") throw new Error("Staging template marker failed.");
  const failure = aiFailure("provider_transport_error");
  if (failure.ok) throw new Error("Staging template failure was invalid.");
  const evidence = normalizeAttemptEvidenceV2<ProtectedApplicationResultEnvelopeV1>({
    version: 2,
    dispatchState: "dispatched",
    protectedResult: null,
    error: failure.error,
    responseStatus: "transport_error",
    retryClass: "same_provider_transient",
    returnedModel: null,
    completion: null,
    usage: null,
    providerHttpStatus: null,
    providerErrorCode: null,
    providerRequestId: null,
    durationMs: 1,
  });
  if (!evidence.ok) throw new Error("Staging template evidence failed.");
  const settled = await repository.settle({
    runId: processing.id,
    executionEnvironment: "staging",
    leaseOwner: processing.leaseOwner,
    leaseToken: processing.leaseToken,
    leaseExpiresAt: marker.leaseExpiresAt,
    stateVersion: marker.stateVersion,
    evidence: evidence.value,
  });
  if (settled.kind !== "settled") throw new Error("Staging template settlement failed.");
  const [row] = await db().select().from(aiRuns).where(eq(aiRuns.id, processing.id));
  if (row === undefined) throw new Error("Staging template disappeared.");
  return row;
}

async function cloneAccountedRuns(templateId: string, copies: number): Promise<void> {
  await db().execute(sql`
    insert into ai_runs
    select (jsonb_populate_record(
      null::ai_runs,
      to_jsonb(seed) || jsonb_build_object(
        'id', gen_random_uuid(),
        'idempotency_key', gen_random_uuid()::text
      )
    )).*
    from ai_runs as seed
    cross join generate_series(1, ${copies}) as generated(value)
    where seed.id = ${templateId}::uuid
  `);
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
  }, 30_000);

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

  it("persists pricing drift before dispatch and makes zero dispatch authority available", async () => {
    const fixture = await seedFixture();
    const inserted = await insertPrepared(preparedRun(fixture));
    if (inserted.kind !== "inserted") throw new Error("Expected inserted run.");
    const repository = createAiRunRepositoryV1(db());
    const claim = await repository.claimOrRecover({
      executionEnvironment: "test",
      workerId: "pricing-stale-worker",
    });
    if (claim.kind !== "claimed") throw new Error("Expected claimed run.");
    const [processing] = await db().select().from(aiRuns).where(eq(aiRuns.id, inserted.row.id));
    if (processing === undefined || processing.leaseOwner === null || processing.leaseToken === null ||
      processing.leaseExpiresAt === null) throw new Error("Claim projection was incomplete.");
    const outcome = await repository.authorizeProviderDispatch({
      runId: processing.id,
      executionEnvironment: "test",
      leaseOwner: processing.leaseOwner,
      leaseToken: processing.leaseToken,
      leaseExpiresAt: processing.leaseExpiresAt,
      stateVersion: processing.stateVersion,
      pricingCurrent: false,
    });
    expect(outcome.kind).toBe("pricing_stale");
    const [row] = await db().select().from(aiRuns).where(eq(aiRuns.id, inserted.row.id));
    expect(row).toMatchObject({
      status: "failed",
      retryState: "not_retryable",
      failureCode: "pricing_stale",
      providerDispatchedAt: null,
      activeAttemptDispatchedAt: null,
      leaseToken: null,
      budgetReservedCostMicrousd: 0,
      costAccountingState: "final",
    });
  });

  it("fences a post-marker cancellation and permits one idempotent late-accounting enrichment", async () => {
    const fixture = await seedFixture();
    const inserted = await insertPrepared(preparedRun(fixture, {
      runCostLimitMicrousd: 20,
    }), "staging", { estimatedMax: 6, runLimit: 20 });
    if (inserted.kind !== "inserted") throw new Error("Expected inserted run.");
    const repository = createAiRunRepositoryV1(db());
    const claim = await repository.claimOrRecover({
      executionEnvironment: "staging",
      workerId: "cancel-late-worker",
    });
    if (claim.kind !== "claimed") throw new Error("Expected claimed run.");
    const [processing] = await db().select().from(aiRuns).where(eq(aiRuns.id, inserted.row.id));
    if (processing === undefined || processing.leaseOwner === null || processing.leaseToken === null ||
      processing.leaseExpiresAt === null) throw new Error("Claim projection was incomplete.");
    const marker = await repository.authorizeProviderDispatch({
      runId: processing.id,
      executionEnvironment: "staging",
      leaseOwner: processing.leaseOwner,
      leaseToken: processing.leaseToken,
      leaseExpiresAt: processing.leaseExpiresAt,
      stateVersion: processing.stateVersion,
      pricingCurrent: true,
    });
    if (marker.kind !== "authorized") throw new Error("Dispatch marker failed.");
    const cancelled = await db().transaction((transaction) =>
      repository.cancelWithinGovernedTransaction(transaction, {
        runId: processing.id,
        actorUserId: fixture.actorId,
        actorRole: "product_editor",
        expectedStateVersion: marker.stateVersion,
        reason: "Synthetic post-marker cancellation.",
      }));
    if (cancelled.kind !== "updated") throw new Error("Cancellation failed.");
    const evidence = normalizeAttemptEvidenceV2({
      version: 2,
      dispatchState: "dispatched",
      protectedResult: { safeSyntheticResult: true },
      error: null,
      responseStatus: "success",
      retryClass: "not_retryable",
      returnedModel: "synthetic-text-alpha-v1",
      completion: { kind: "complete" },
      usage: { inputTokens: 2, outputTokens: 1, totalTokens: 3 },
      providerHttpStatus: 200,
      providerErrorCode: null,
      providerRequestId: "synthetic-late-response",
      durationMs: 7,
    });
    if (!evidence.ok) throw new Error("Late evidence normalization failed.");
    const late = await repository.recordCancelledLateAccounting({
      runId: processing.id,
      executionEnvironment: "staging",
      cancelledLeaseToken: processing.leaseToken,
      expectedStateVersion: cancelled.row.stateVersion,
      evidence: evidence.value,
    });
    expect(late.kind).toBe("enriched");
    if (late.kind !== "enriched") throw new Error("Late enrichment failed.");
    const replay = await repository.recordCancelledLateAccounting({
      runId: processing.id,
      executionEnvironment: "staging",
      cancelledLeaseToken: processing.leaseToken,
      expectedStateVersion: late.stateVersion,
      evidence: evidence.value,
    });
    expect(replay).toEqual({ kind: "exact_replay", stateVersion: late.stateVersion });
    const [row] = await db().select().from(aiRuns).where(eq(aiRuns.id, processing.id));
    expect(row).toMatchObject({
      status: "cancelled",
      providerResponseStatus: "cancelled_late_response",
      candidateJson: null,
      candidateHash: null,
      inputTokens: 2,
      outputTokens: 1,
      totalTokens: 3,
      actualCostMicrousd: 2,
      budgetAccountedCostMicrousd: 2,
      budgetReservedCostMicrousd: 0,
      actualCostComplete: true,
    });
  });

  it("serializes the daily hard boundary and emits the hard-stop signal without mutation", async () => {
    const fixture = await seedFixture();
    const template = await createAccountedStagingTemplate(fixture);
    await cloneAccountedRuns(template.id, 248);
    const firstDue = await insertPrepared(preparedRun(fixture, {
      idempotencyKey: randomUUID(),
      fingerprint: hash("a"),
      maxAttempts: 1,
      runCostLimitMicrousd: 20_000,
    }), "staging", { estimatedMax: 20_000 });
    const secondDue = await insertPrepared(preparedRun(fixture, {
      idempotencyKey: randomUUID(),
      fingerprint: hash("b"),
      maxAttempts: 1,
      runCostLimitMicrousd: 20_000,
    }), "staging", { estimatedMax: 20_000 });
    if (firstDue.kind !== "inserted" || secondDue.kind !== "inserted") {
      throw new Error("Budget-boundary due rows failed.");
    }
    const events: string[] = [];
    const repository = () => createAiRunRepositoryV1(db(), {
      telemetry: { emit: (event) => { events.push(event.eventName); } },
    });
    const attempts = await Promise.all([
      repository().claimOrRecover({ executionEnvironment: "staging", workerId: "budget-boundary-a" }),
      repository().claimOrRecover({ executionEnvironment: "staging", workerId: "budget-boundary-b" }),
    ]);
    const claimed = attempts.filter((outcome) => outcome.kind === "claimed");
    expect(claimed).toHaveLength(1);
    const denied = attempts.find((outcome) => outcome.kind !== "claimed") ??
      await repository().claimOrRecover({ executionEnvironment: "staging", workerId: "budget-boundary-follow-up" });
    const finalDenied = denied.kind === "idle" && denied.reason === "lock_busy"
      ? await repository().claimOrRecover({ executionEnvironment: "staging", workerId: "budget-boundary-follow-up" })
      : denied;
    expect(finalDenied).toEqual({ kind: "idle", reason: "budget" });
    const rows = await db().select().from(aiRuns).where(or(
      eq(aiRuns.id, firstDue.row.id),
      eq(aiRuns.id, secondDue.row.id),
    ));
    expect(rows.filter((row) => row.status === "processing")).toHaveLength(1);
    expect(rows.filter((row) => row.status === "pending")).toHaveLength(1);
    expect(events).toContain("ai_budget_hard_stop");
  });

  it("emits the monthly warning only after a committed crossing and ignores sink failure", async () => {
    const fixture = await seedFixture();
    const template = await createAccountedStagingTemplate(fixture);
    await db().update(aiRuns).set({
      budgetChargeDay: sql`date_trunc('month', current_date)::date`,
      budgetChargeMonth: sql`date_trunc('month', current_date)::date`,
    }).where(eq(aiRuns.id, template.id));
    await cloneAccountedRuns(template.id, 2_498);
    const due = await insertPrepared(preparedRun(fixture, {
      idempotencyKey: randomUUID(),
      fingerprint: hash("d"),
      maxAttempts: 1,
      runCostLimitMicrousd: 20_000,
    }), "staging", { estimatedMax: 20_000 });
    if (due.kind !== "inserted") throw new Error("Monthly warning due row failed.");
    const events: string[] = [];
    const repository = createAiRunRepositoryV1(db(), {
      telemetry: {
        emit(event) {
          events.push(event.eventName);
          throw new Error("Synthetic non-critical telemetry failure.");
        },
      },
    });
    expect((await repository.claimOrRecover({
      executionEnvironment: "staging",
      workerId: "monthly-warning-worker",
    })).kind).toBe("claimed");
    const [row] = await db().select().from(aiRuns).where(eq(aiRuns.id, due.row.id));
    expect(row).toMatchObject({
      status: "processing",
      budgetReservedCostMicrousd: 20_000,
    });
    expect(events).toEqual(["ai_budget_monthly_warning_crossed"]);
  }, 30_000);

  it("keeps the original charge period across expiry recovery and a later logical claim", async () => {
    const fixture = await seedFixture();
    const inserted = await insertPrepared(preparedRun(fixture), "staging", { estimatedMax: 6 });
    if (inserted.kind !== "inserted") throw new Error("Expected inserted run.");
    const repository = createAiRunRepositoryV1(db());
    expect((await repository.claimOrRecover({
      executionEnvironment: "staging",
      workerId: "charge-period-attempt-1",
    })).kind).toBe("claimed");
    await db().update(aiRuns).set({
      budgetChargeDay: "2025-12-31",
      budgetChargeMonth: "2025-12-01",
      leaseAcquiredAt: sql`clock_timestamp() - interval '2 minutes'`,
      leaseExpiresAt: sql`clock_timestamp() - interval '1 minute'`,
    }).where(eq(aiRuns.id, inserted.row.id));
    expect(await repository.claimOrRecover({
      executionEnvironment: "staging",
      workerId: "charge-period-recovery",
    })).toEqual({ kind: "recovered", runId: inserted.row.id });
    await db().update(aiRuns).set({ nextAttemptAt: sql`clock_timestamp()` })
      .where(eq(aiRuns.id, inserted.row.id));
    expect((await repository.claimOrRecover({
      executionEnvironment: "staging",
      workerId: "charge-period-attempt-2",
    })).kind).toBe("claimed");
    const [row] = await db().select().from(aiRuns).where(eq(aiRuns.id, inserted.row.id));
    expect(row).toMatchObject({
      budgetChargeDay: "2025-12-31",
      budgetChargeMonth: "2025-12-01",
      attemptCount: 2,
      status: "processing",
    });
  });

  it("keeps missing usage conservative and records actual cost overrun truth", async () => {
    const fixture = await seedFixture();
    const repository = createAiRunRepositoryV1(db());
    const missing = await insertPrepared(preparedRun(fixture, {
      idempotencyKey: randomUUID(),
      maxAttempts: 1,
      runCostLimitMicrousd: 20_000,
    }), "staging", { estimatedMax: 20_000 });
    if (missing.kind !== "inserted") throw new Error("Expected missing-usage run.");
    const missingClaim = await repository.claimOrRecover({
      executionEnvironment: "staging",
      workerId: "missing-usage-worker",
    });
    if (missingClaim.kind !== "claimed") throw new Error("Expected missing-usage claim.");
    const [missingProcessing] = await db().select().from(aiRuns).where(eq(aiRuns.id, missing.row.id));
    if (missingProcessing === undefined || missingProcessing.leaseOwner === null ||
      missingProcessing.leaseToken === null || missingProcessing.leaseExpiresAt === null) {
      throw new Error("Missing-usage lease was incomplete.");
    }
    const missingMarker = await repository.authorizeProviderDispatch({
      runId: missingProcessing.id,
      executionEnvironment: "staging",
      leaseOwner: missingProcessing.leaseOwner,
      leaseToken: missingProcessing.leaseToken,
      leaseExpiresAt: missingProcessing.leaseExpiresAt,
      stateVersion: missingProcessing.stateVersion,
      pricingCurrent: true,
    });
    if (missingMarker.kind !== "authorized") throw new Error("Missing-usage marker failed.");
    const missingFailure = aiFailure("provider_transport_error");
    if (missingFailure.ok) throw new Error("Static missing-usage failure was invalid.");
    const missingEvidence = normalizeAttemptEvidenceV2<ProtectedApplicationResultEnvelopeV1>({
      version: 2,
      dispatchState: "dispatched",
      protectedResult: null,
      error: missingFailure.error,
      responseStatus: "transport_error",
      retryClass: "same_provider_transient",
      returnedModel: null,
      completion: null,
      usage: null,
      providerHttpStatus: null,
      providerErrorCode: null,
      providerRequestId: null,
      durationMs: 1,
    });
    if (!missingEvidence.ok) throw new Error("Missing-usage evidence failed.");
    expect((await repository.settle({
      runId: missingProcessing.id,
      executionEnvironment: "staging",
      leaseOwner: missingProcessing.leaseOwner,
      leaseToken: missingProcessing.leaseToken,
      leaseExpiresAt: missingMarker.leaseExpiresAt,
      stateVersion: missingMarker.stateVersion,
      evidence: missingEvidence.value,
    })).kind).toBe("settled");
    const [missingFinal] = await db().select().from(aiRuns).where(eq(aiRuns.id, missing.row.id));
    expect(missingFinal).toMatchObject({
      status: "failed",
      retryState: "exhausted",
      actualCostMicrousd: 0,
      actualCostComplete: false,
      budgetAccountedCostMicrousd: 20_000,
      budgetReservedCostMicrousd: 0,
    });

    const overrun = await insertPrepared(preparedRun(fixture, {
      idempotencyKey: randomUUID(),
      fingerprint: hash("8"),
      maxAttempts: 1,
      runCostLimitMicrousd: 20_000,
    }), "staging", {
      estimatedMax: 20_000,
      inputRate: 20_000_000_000,
      outputRate: 20_000_000_000,
    });
    if (overrun.kind !== "inserted") throw new Error("Expected overrun run.");
    const overrunClaim = await repository.claimOrRecover({
      executionEnvironment: "staging",
      workerId: "overrun-worker",
    });
    if (overrunClaim.kind !== "claimed") throw new Error("Expected overrun claim.");
    const [overrunProcessing] = await db().select().from(aiRuns).where(eq(aiRuns.id, overrun.row.id));
    if (overrunProcessing === undefined || overrunProcessing.leaseOwner === null ||
      overrunProcessing.leaseToken === null || overrunProcessing.leaseExpiresAt === null) {
      throw new Error("Overrun lease was incomplete.");
    }
    const overrunMarker = await repository.authorizeProviderDispatch({
      runId: overrunProcessing.id,
      executionEnvironment: "staging",
      leaseOwner: overrunProcessing.leaseOwner,
      leaseToken: overrunProcessing.leaseToken,
      leaseExpiresAt: overrunProcessing.leaseExpiresAt,
      stateVersion: overrunProcessing.stateVersion,
      pricingCurrent: true,
    });
    if (overrunMarker.kind !== "authorized") throw new Error("Overrun marker failed.");
    const overrunEvidence = normalizeAttemptEvidenceV2<ProtectedApplicationResultEnvelopeV1>({
      version: 2,
      dispatchState: "dispatched",
      protectedResult: {
        version: 1,
        resultKind: "draft_assistance_candidate",
        dispositionKind: "human_review",
        schemaId: "cwt.product-description-draft.v1",
        schemaVersion: 1,
        policyVersion: "stage4a-v1",
        value: { syntheticCandidate: true },
        canonicalJson: '{"syntheticCandidate":true}',
        hash: hash("c"),
      },
      error: null,
      responseStatus: "success",
      retryClass: "not_retryable",
      returnedModel: "synthetic-text-alpha-v1",
      completion: { kind: "complete" },
      usage: { inputTokens: 1, outputTokens: 1, totalTokens: 2 },
      providerHttpStatus: 200,
      providerErrorCode: null,
      providerRequestId: "synthetic-overrun",
      durationMs: 2,
    });
    if (!overrunEvidence.ok) throw new Error("Overrun evidence failed.");
    expect(await repository.settle({
      runId: overrunProcessing.id,
      executionEnvironment: "staging",
      leaseOwner: overrunProcessing.leaseOwner,
      leaseToken: overrunProcessing.leaseToken,
      leaseExpiresAt: overrunMarker.leaseExpiresAt,
      stateVersion: overrunMarker.stateVersion,
      evidence: overrunEvidence.value,
    })).toMatchObject({ kind: "settled", status: "failed" });
    const [overrunFinal] = await db().select().from(aiRuns).where(eq(aiRuns.id, overrun.row.id));
    expect(overrunFinal).toMatchObject({
      status: "failed",
      failureCode: "run_cost_limit_exceeded",
      candidateJson: null,
      candidateHash: null,
      actualCostMicrousd: 40_000,
      budgetAccountedCostMicrousd: 40_000,
      actualCostComplete: true,
    });
  });
});
