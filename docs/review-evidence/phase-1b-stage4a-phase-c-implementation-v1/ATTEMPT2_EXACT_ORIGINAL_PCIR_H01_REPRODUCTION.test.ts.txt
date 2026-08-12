import { randomUUID } from "node:crypto";

import { eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres, { type Sql } from "postgres";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { createPhaseCDurableDraftAssistanceServiceV1 } from "@/ai/applications/draft-assistance/composition";
import { createAiModelConfigServiceV1 } from "@/ai/config/model-config-service";
import type { PreparedCoreRunV1 } from "@/ai/core/contracts";
import { productionPromptLoaderV1 } from "@/ai/prompts/loader";
import { productionTextProviderRegistryV1 } from "@/ai/providers/registry";
import { productionPricingPolicyRegistryV1 } from "@/ai/runs/pricing-policy";
import { createAiRunRepositoryV1 } from "@/ai/runs/repository";
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

const postgresUrl = process.env.CWT_PHASE_C_POSTGRES_URL;
const digest = (character: string) => character.repeat(64);

let client: Sql | undefined;
let database: PostgresAppDatabase | undefined;

function db(): PostgresAppDatabase {
  if (database === undefined) throw new Error("Fresh PostgreSQL review fixture was not initialized.");
  return database;
}

describe.skipIf(postgresUrl === undefined)("Fresh review: actor role is not authority", () => {
  beforeAll(async () => {
    if (postgresUrl === undefined) return;
    client = postgres(postgresUrl, { max: 4, prepare: false, onnotice: () => undefined });
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

  it("reproduces sales-to-admin protected read/config mutation and missing reviewer read", async () => {
    await db().execute(sql`truncate table ai_runs, ai_model_config, audit_logs, products, users cascade`);
    const actorRows = await db().insert(users).values([
      {
        email: `${randomUUID()}@fresh-review.example.test`,
        displayName: "Synthetic Requester",
        role: "product_editor",
        passwordHash: "test-only",
      },
      {
        email: `${randomUUID()}@fresh-review.example.test`,
        displayName: "Synthetic Sales Attacker",
        role: "sales",
        passwordHash: "test-only",
      },
      {
        email: `${randomUUID()}@fresh-review.example.test`,
        displayName: "Synthetic Reviewer",
        role: "reviewer_publisher",
        passwordHash: "test-only",
      },
    ]).returning({ id: users.id, role: users.role });
    const requester = actorRows.find((row) => row.role === "product_editor");
    const sales = actorRows.find((row) => row.role === "sales");
    const reviewer = actorRows.find((row) => row.role === "reviewer_publisher");
    if (requester === undefined || sales === undefined || reviewer === undefined) {
      throw new Error("Synthetic role fixtures were incomplete.");
    }
    const product = await db().transaction(async (transaction) => {
      const [taxonomy] = await transaction.insert(taxonomyTerms).values({
        internalKey: `synthetic-fresh-review-${randomUUID()}`,
        dimension: "material_fiber",
      }).returning({ id: taxonomyTerms.id });
      const [created] = await transaction.insert(products).values({
        status: "draft",
        createdByUserId: requester.id,
      }).returning({ id: products.id });
      if (taxonomy === undefined || created === undefined) {
        throw new Error("Synthetic Product fixture failed.");
      }
      await transaction.insert(productTaxonomyTerms).values({
        productId: created.id,
        taxonomyTermId: taxonomy.id,
        isPrimary: true,
      });
      await transaction.insert(productLocalizations).values({
        productId: created.id,
        locale: "en",
        name: "Synthetic Fresh Review Product",
      });
      return created;
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
      promptHash: digest("a"),
      enabled: true,
      isDefault: true,
      createdByUserId: requester.id,
      updatedByUserId: requester.id,
    }).returning({ id: aiModelConfig.id });
    if (config === undefined) throw new Error("Synthetic run fixture failed.");

    const prepared: PreparedCoreRunV1 = {
      version: 1,
      applicationClass: "draft_assistance",
      useCase: "product_description_draft",
      capability: "text",
      requestIdentity: {
        idempotencyKey: randomUUID(),
        fingerprintVersion: 1,
        fingerprint: digest("b"),
        requestedByPrincipalId: requester.id,
      },
      association: {
        kind: "draft_assistance.product_draft.v1",
        persistenceVersion: 1,
        value: {
          targetType: "product_draft",
          targetProductId: product.id,
          targetLocale: "en",
          expectedTargetVersion: 1,
        },
      },
      associationSnapshotHash: digest("c"),
      resolvedConfig: {
        modelConfigId: config.id,
        modelConfigVersion: 1,
        resolvedConfigHash: digest("d"),
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
        promptHash: digest("a"),
      },
      providerEnvelope: { version: 1, hash: digest("e") },
      inputSchemaVersion: 1,
      outputSchemaId: "cwt.product-description-draft.v1",
      outputSchemaVersion: 1,
      policyVersion: "stage4a-v1",
      resultKind: "draft_assistance_candidate",
      dispositionKind: "human_review",
      inputSources: [],
      inputContext: { synthetic: true },
      inputHash: digest("f"),
    };
    const inserted = await db().transaction((transaction) =>
      createAiRunRepositoryV1(transaction).insertPreparedWithinTransaction(transaction, {
        preparedRun: prepared,
        executionEnvironment: "test",
        pricingSnapshot: {},
        estimatedMaxCostMicrousd: 0,
        dailyHardLimitMicrousd: 0,
        monthlyWarningLimitMicrousd: 0,
        monthlyHardLimitMicrousd: 0,
      }));
    if (inserted.kind !== "inserted") throw new Error("Synthetic run insert lost unexpectedly.");

    const runService = createPhaseCDurableDraftAssistanceServiceV1({
      database: db(),
      trustedEnvironment: { appEnvironment: "test", processFeatureAiEnabled: true },
      providerRegistry: productionTextProviderRegistryV1,
      promptLoader: productionPromptLoaderV1,
      pricingRegistry: productionPricingPolicyRegistryV1,
    });

    const salesClaimingAdmin = await runService.readRun({
      runId: inserted.row.id,
      actor: { userId: sales.id, role: "admin" },
    });
    expect(salesClaimingAdmin.ok).toBe(true);

    const legitimateReviewer = await runService.readRun({
      runId: inserted.row.id,
      actor: { userId: reviewer.id, role: "reviewer_publisher" },
    });
    expect(legitimateReviewer).toMatchObject({
      ok: false,
      error: { code: "authorization_denied" },
    });

    const configService = createAiModelConfigServiceV1(db(), {
      contracts: [],
      providerRegistry: productionTextProviderRegistryV1,
      promptLoader: productionPromptLoaderV1,
      pricingRegistry: productionPricingPolicyRegistryV1,
    });
    const disabled = await configService.disable({
      id: config.id,
      expectedRecordVersion: 1,
      actor: { userId: sales.id, role: "admin" },
    });
    expect(disabled.ok).toBe(true);
    expect((await db().select({ enabled: aiModelConfig.enabled }).from(aiModelConfig)
      .where(eq(aiModelConfig.id, config.id)))[0]?.enabled).toBe(false);
    expect(await db().select().from(auditLogs)
      .where(eq(auditLogs.actorUserId, sales.id))).toHaveLength(1);
    expect(await db().select().from(aiRuns)
      .where(eq(aiRuns.id, inserted.row.id))).toHaveLength(1);
  });
});
