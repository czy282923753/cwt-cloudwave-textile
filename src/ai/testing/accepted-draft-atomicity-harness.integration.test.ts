import { randomUUID } from "node:crypto";

import { eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres, { type Sql } from "postgres";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import type { DatabaseConnection, PostgresAppDatabase } from "@/db/client";
import { migrateDatabase } from "@/db/migrate";
import {
  aiModelConfig,
  aiRuns,
  auditLogs,
  productLocalizations,
  productTaxonomyTerms,
  products,
  taxonomyTerms,
  users,
} from "@/db/schema";
import * as schema from "@/db/schema";
import { applyConspicuouslySyntheticAcceptedDraftV1 } from "./accepted-draft-atomicity-harness";

const postgresUrl = process.env.CWT_PHASE_C_POSTGRES_URL;
const hash = (character: string) => character.repeat(64);
let client: Sql | undefined;
let database: PostgresAppDatabase | undefined;

function db(): PostgresAppDatabase {
  if (database === undefined) throw new Error("Real PostgreSQL fixture was not initialized.");
  return database;
}

async function seed() {
  const completedAt = new Date("2026-08-12T08:00:00.000Z");
  const [actor] = await db().insert(users).values({
    email: `${randomUUID()}@accepted-harness.example.test`,
    displayName: "Synthetic Acceptance Harness Actor",
    role: "product_editor",
    passwordHash: "test-only",
  }).returning({ id: users.id });
  if (actor === undefined) throw new Error("Synthetic actor failed.");
  const product = await db().transaction(async (transaction) => {
    const [taxonomy] = await transaction.insert(taxonomyTerms).values({
      internalKey: `synthetic-accepted-harness-${randomUUID()}`,
      dimension: "material_fiber",
    }).returning({ id: taxonomyTerms.id });
    const [created] = await transaction.insert(products).values({
      status: "draft",
      createdByUserId: actor.id,
    }).returning({ id: products.id });
    if (created === undefined || taxonomy === undefined) throw new Error("Synthetic product failed.");
    await transaction.insert(productLocalizations).values({
      productId: created.id,
      locale: "en",
      name: "SYNTHETIC TEST DATA — NOT A CWT FACT",
      editorDocumentVersion: 1,
    });
    await transaction.insert(productTaxonomyTerms).values({
      productId: created.id,
      taxonomyTermId: taxonomy.id,
      isPrimary: true,
    });
    return created;
  });
  const [config] = await db().insert(aiModelConfig).values({
    useCase: "product_description_draft",
    provider: "synthetic_alpha",
    model: "synthetic-text-alpha-v1",
    maxInputTokens: 100,
    maxOutputTokens: 100,
    maxAttempts: 1,
    runCostLimitMicrousd: 0,
    promptId: "synthetic-harness",
    promptVersion: 1,
    promptHash: hash("a"),
    enabled: true,
    isDefault: true,
    createdByUserId: actor.id,
    updatedByUserId: actor.id,
  }).returning({ id: aiModelConfig.id });
  if (config === undefined) throw new Error("Synthetic config failed.");
  const [run] = await db().insert(aiRuns).values({
    useCase: "product_description_draft",
    requestedByUserId: actor.id,
    idempotencyKey: randomUUID(),
    requestFingerprint: hash("b"),
    targetType: "product_draft",
    targetProductId: product.id,
    targetLocale: "en",
    expectedTargetVersion: 1,
    targetSnapshotHash: hash("c"),
    modelConfigId: config.id,
    modelConfigVersion: 1,
    resolvedConfigHash: hash("d"),
    requestedProvider: "synthetic_alpha",
    actualProvider: "synthetic_alpha",
    requestedModel: "synthetic-text-alpha-v1",
    returnedModel: "synthetic-text-alpha-v1",
    parametersSnapshotJson: {},
    maxInputTokens: 100,
    maxOutputTokens: 100,
    maxAttempts: 1,
    promptId: "synthetic-harness",
    promptVersion: 1,
    promptHash: hash("a"),
    providerEnvelopeVersion: 1,
    providerEnvelopeHash: hash("e"),
    inputSchemaVersion: 1,
    outputSchemaVersion: 1,
    policyVersion: "synthetic-v1",
    inputSourcesJson: [],
    inputContextJson: { synthetic: true },
    inputHash: hash("f"),
    candidateJson: { fullDescription: "SYNTHETIC TEST DATA — NOT A CWT FACT" },
    candidateHash: hash("9"),
    status: "draft_ready",
    retryState: "none",
    attemptCount: 1,
    nextAttemptAt: null,
    stateVersion: 4,
    queuedAt: completedAt,
    providerDispatchedAt: completedAt,
    generatedAt: completedAt,
    completedAt,
    updatedAt: completedAt,
    providerResponseStatus: "success",
    executionEnvironment: "test",
    budgetPolicyVersion: "nonbillable-v1",
    budgetChargeDay: "2026-08-12",
    budgetChargeMonth: "2026-08-01",
    runCostLimitMicrousd: 0,
    dailyHardLimitMicrousd: 0,
    monthlyWarningLimitMicrousd: 0,
    monthlyHardLimitMicrousd: 0,
    estimatedMaxCostMicrousd: 0,
    costAccountingState: "final",
    pricingSnapshotJson: {},
  }).returning({ id: aiRuns.id });
  if (run === undefined) throw new Error("Synthetic run failed.");
  return { actorId: actor.id, productId: product.id, runId: run.id };
}

describe.skipIf(postgresUrl === undefined)("accepted Draft atomicity harness", () => {
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
  beforeEach(async () => {
    await db().execute(sql`truncate table ${aiRuns}, ${aiModelConfig}, ${auditLogs}, ${productLocalizations}, ${products}, ${users} cascade`);
  });
  afterAll(async () => client?.end());

  it("commits target, run disposition and required Audit together", async () => {
    const fixture = await seed();
    const result = await applyConspicuouslySyntheticAcceptedDraftV1(db(), {
      runId: fixture.runId,
      productId: fixture.productId,
      actorUserId: fixture.actorId,
      expectedRunStateVersion: 4,
      expectedTargetVersion: 1,
      candidateHash: hash("9"),
      syntheticFullDescription: "SYNTHETIC TEST DATA — NOT A CWT FACT; atomicity proof only.",
    });
    expect(result).toEqual({ ok: true, value: { runStateVersion: 5, targetVersion: 2 } });
    const [target] = await db().select().from(productLocalizations);
    const [run] = await db().select().from(aiRuns);
    expect(target).toMatchObject({ editorDocumentVersion: 2 });
    expect(run).toMatchObject({ humanDisposition: "accepted", appliedTargetVersion: 2, stateVersion: 5 });
    expect(await db().select().from(auditLogs)
      .where(eq(auditLogs.action, "ai.run.candidate_applied"))).toHaveLength(1);
  });

  it("rolls target and run back when required Audit fails", async () => {
    const fixture = await seed();
    await expect(applyConspicuouslySyntheticAcceptedDraftV1(db(), {
      runId: fixture.runId,
      productId: fixture.productId,
      actorUserId: fixture.actorId,
      expectedRunStateVersion: 4,
      expectedTargetVersion: 1,
      candidateHash: hash("9"),
      syntheticFullDescription: "SYNTHETIC TEST DATA — NOT A CWT FACT; rollback proof only.",
    }, { auditWriter: async () => { throw new Error("TEST accepted Draft Audit failure"); } }))
      .rejects.toThrow(/accepted Draft Audit failure/);
    const [target] = await db().select().from(productLocalizations);
    const [run] = await db().select().from(aiRuns);
    expect(target).toMatchObject({ editorDocumentVersion: 1, fullDescription: null });
    expect(run).toMatchObject({ humanDisposition: "not_evaluated", appliedTargetVersion: null, stateVersion: 4 });
  });
});
