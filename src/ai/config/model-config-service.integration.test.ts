import { randomUUID } from "node:crypto";

import { and, eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres, { type Sql } from "postgres";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import type { PromptBundleLoaderV1 } from "@/ai/prompts/loader";
import { createTextProviderRegistryV1 } from "@/ai/providers/registry";
import { localTestPricingPolicyRegistryV1 } from "@/ai/runs/pricing-policy";
import { createFakeTextProviderV1 } from "@/ai/testing/fake-text-provider";
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
import { createAiModelConfigServiceV1 } from "./model-config-service";

const postgresUrl = process.env.CWT_PHASE_C_POSTGRES_URL;
const hash = (character: string) => character.repeat(64);
const provider = createFakeTextProviderV1({
  key: "synthetic_alpha",
  model: "synthetic-text-alpha-v1",
  envelope: { version: 1, hash: hash("e") },
  result: {
    kind: "failure",
    responseStatus: "unknown",
    failureCode: "unknown",
    retryClass: "not_retryable",
    durationMs: 0,
  },
});
const providerRegistryResult = createTextProviderRegistryV1([provider]);
if (!providerRegistryResult.ok) throw new Error("Fake Provider registry failed.");
const providerRegistry = providerRegistryResult.value;
const promptLoader: PromptBundleLoaderV1 = {
  load(input) {
    return {
      ok: true,
      value: {
        tuple: {
          promptId: input.promptId,
          promptVersion: input.promptVersion,
          promptHash: input.promptHash,
        },
        applicationClass: input.applicationClass,
        capability: "text",
        useCase: input.useCase,
        locale: "en",
        inputSchemaVersion: input.inputSchemaVersion,
        outputSchemaVersion: input.outputSchemaVersion,
        policyVersion: input.policyVersion,
        variables: [],
        body: "SYNTHETIC TEST DATA — NOT A CWT FACT",
      },
    };
  },
};

let client: Sql | undefined;
let database: PostgresAppDatabase | undefined;

function db(): PostgresAppDatabase {
  if (database === undefined) throw new Error("Real PostgreSQL fixture was not initialized.");
  return database;
}

function dependencies(auditWriter?: () => Promise<string>) {
  return {
    contracts: [{
      useCase: "product_description_draft" as const,
      inputSchemaVersion: 1,
      outputSchemaVersion: 1,
      policyVersion: "draft-product-description-v1",
    }],
    providerRegistry,
    promptLoader,
    pricingRegistry: localTestPricingPolicyRegistryV1,
    ...(auditWriter === undefined ? {} : { governedMutationOptions: { auditWriter } }),
  };
}

const substantive = {
  provider: "synthetic_alpha",
  model: "synthetic-text-alpha-v1",
  parameters: { temperature: 0, top_p: 1 },
  maxInputTokens: 1_000,
  maxOutputTokens: 200,
  maxAttempts: 3,
  runCostLimitMicrousd: 20_000,
  promptId: "product-description-draft",
  promptVersion: 1,
  promptHash: hash("p".replace("p", "a")),
};

async function seedActor(role: "admin" | "product_editor" = "admin") {
  const [actor] = await db().insert(users).values({
    email: `${randomUUID()}@config.example.test`,
    displayName: "Synthetic Config Actor",
    role,
    passwordHash: "test-only",
  }).returning({ id: users.id, role: users.role });
  if (actor === undefined) throw new Error("Actor fixture failed.");
  return { userId: actor.id, role: actor.role };
}

async function createConfig(actor: Awaited<ReturnType<typeof seedActor>>) {
  return createAiModelConfigServiceV1(db(), dependencies()).create({
    actor,
    useCase: "product_description_draft",
    ...substantive,
  });
}

async function insertRunReference(input: { readonly actorId: string; readonly configId: string }) {
  const productId = await db().transaction(async (transaction) => {
    const [taxonomy] = await transaction.insert(taxonomyTerms).values({
      internalKey: `synthetic-config-${randomUUID()}`,
      dimension: "material_fiber",
    }).returning({ id: taxonomyTerms.id });
    const [product] = await transaction.insert(products).values({
      status: "draft",
      createdByUserId: input.actorId,
    }).returning({ id: products.id });
    if (taxonomy === undefined || product === undefined) throw new Error("Product fixture failed.");
    await transaction.insert(productLocalizations).values({
      productId: product.id,
      locale: "en",
      name: "Synthetic Config Product",
    });
    await transaction.insert(productTaxonomyTerms).values({
      productId: product.id,
      taxonomyTermId: taxonomy.id,
      isPrimary: true,
    });
    return product.id;
  });
  await db().insert(aiRuns).values({
    useCase: "product_description_draft",
    requestedByUserId: input.actorId,
    idempotencyKey: randomUUID(),
    requestFingerprint: hash("1"),
    targetType: "product_draft",
    targetProductId: productId,
    targetLocale: "en",
    expectedTargetVersion: 1,
    targetSnapshotHash: hash("2"),
    modelConfigId: input.configId,
    modelConfigVersion: 1,
    resolvedConfigHash: hash("3"),
    requestedProvider: "synthetic_alpha",
    requestedModel: "synthetic-text-alpha-v1",
    parametersSnapshotJson: {},
    maxInputTokens: 1_000,
    maxOutputTokens: 200,
    maxAttempts: 3,
    promptId: "product-description-draft",
    promptVersion: 1,
    promptHash: hash("4"),
    providerEnvelopeVersion: 1,
    providerEnvelopeHash: hash("5"),
    inputSchemaVersion: 1,
    outputSchemaVersion: 1,
    policyVersion: "draft-product-description-v1",
    inputContextJson: { product: { name: "Synthetic Config Product" } },
    inputHash: hash("6"),
    executionEnvironment: "test",
    budgetPolicyVersion: "nonbillable-v1",
    runCostLimitMicrousd: 20_000,
    dailyHardLimitMicrousd: 0,
    monthlyWarningLimitMicrousd: 0,
    monthlyHardLimitMicrousd: 0,
    estimatedMaxCostMicrousd: 0,
    pricingSnapshotJson: {},
  });
}

describe.skipIf(postgresUrl === undefined)("Phase C model configuration service", () => {
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
    await db().execute(sql`truncate table ${aiRuns}, ${aiModelConfig}, ${auditLogs}, ${productLocalizations}, ${products}, ${users} cascade`);
  });

  afterAll(async () => {
    await client?.end();
  });

  it("creates disabled non-default configurations and requires Admin", async () => {
    const nonAdmin = await seedActor("product_editor");
    const denied = await createAiModelConfigServiceV1(db(), dependencies()).create({
      actor: nonAdmin,
      useCase: "product_description_draft",
      ...substantive,
    });
    expect(denied.ok).toBe(false);
    if (!denied.ok) expect(denied.error.code).toBe("authorization_denied");
    const admin = await seedActor();
    const result = await createConfig(admin);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const [row] = await db().select().from(aiModelConfig).where(eq(aiModelConfig.id, result.value.id));
    expect(row).toMatchObject({
      enabled: false,
      isDefault: false,
      fallbackConfigId: null,
      recordVersion: 1,
    });
    const audits = await db().select().from(auditLogs).where(and(
      eq(auditLogs.action, "ai.model_config.created"),
      eq(auditLogs.entityId, result.value.id),
    ));
    expect(audits).toHaveLength(1);
  });

  it("rolls back create and default activation when required Audit fails", async () => {
    const admin = await seedActor();
    const failing = createAiModelConfigServiceV1(db(), dependencies(async () => {
      throw new Error("TEST required Audit failure");
    }));
    await expect(failing.create({
      actor: admin,
      useCase: "product_description_draft",
      ...substantive,
    })).rejects.toThrow(/required Audit failure/);
    expect(await db().select().from(aiModelConfig)).toHaveLength(0);
    const created = await createConfig(admin);
    if (!created.ok) throw new Error("Configuration fixture failed.");
    await expect(failing.activateDefault({
      actor: admin,
      useCase: "product_description_draft",
      selectedConfigId: created.value.id,
      expectedRecordVersions: { [created.value.id]: 1 },
    })).rejects.toThrow(/required Audit failure/);
    const [row] = await db().select().from(aiModelConfig).where(eq(aiModelConfig.id, created.value.id));
    expect(row).toMatchObject({ enabled: false, isDefault: false, recordVersion: 1 });
  });

  it("switches exactly one enabled default under stable row locks", async () => {
    const admin = await seedActor();
    const first = await createConfig(admin);
    const second = await createConfig(admin);
    if (!first.ok || !second.ok) throw new Error("Configuration fixtures failed.");
    const service = createAiModelConfigServiceV1(db(), dependencies());
    const firstActivation = await service.activateDefault({
      actor: admin,
      useCase: "product_description_draft",
      selectedConfigId: first.value.id,
      expectedRecordVersions: { [first.value.id]: 1 },
    });
    expect(firstActivation.ok).toBe(true);
    const secondActivation = await service.activateDefault({
      actor: admin,
      useCase: "product_description_draft",
      selectedConfigId: second.value.id,
      expectedRecordVersions: { [first.value.id]: 2, [second.value.id]: 1 },
    });
    expect(secondActivation.ok).toBe(true);
    const rows = await db().select().from(aiModelConfig);
    expect(rows.filter((row) => row.enabled && row.isDefault).map((row) => row.id))
      .toEqual([second.value.id]);
    expect(rows.find((row) => row.id === first.value.id)).toMatchObject({
      enabled: true,
      isDefault: false,
      recordVersion: 3,
    });
    expect(rows.find((row) => row.id === second.value.id)).toMatchObject({
      enabled: true,
      isDefault: true,
      recordVersion: 2,
    });
  });

  it("allows only one concurrent default switch and rejects stale versions cleanly", async () => {
    const admin = await seedActor();
    const first = await createConfig(admin);
    const second = await createConfig(admin);
    const third = await createConfig(admin);
    if (!first.ok || !second.ok || !third.ok) throw new Error("Configuration fixtures failed.");
    const service = createAiModelConfigServiceV1(db(), dependencies());
    const initial = await service.activateDefault({
      actor: admin,
      useCase: "product_description_draft",
      selectedConfigId: first.value.id,
      expectedRecordVersions: { [first.value.id]: 1 },
    });
    if (!initial.ok) throw new Error("Initial activation failed.");
    const outcomes = await Promise.all([
      service.activateDefault({
        actor: admin,
        useCase: "product_description_draft",
        selectedConfigId: second.value.id,
        expectedRecordVersions: { [first.value.id]: 2, [second.value.id]: 1 },
      }),
      service.activateDefault({
        actor: admin,
        useCase: "product_description_draft",
        selectedConfigId: third.value.id,
        expectedRecordVersions: { [first.value.id]: 2, [third.value.id]: 1 },
      }),
    ]);
    expect(outcomes.filter((outcome) => outcome.ok)).toHaveLength(1);
    expect(outcomes.filter((outcome) => !outcome.ok && outcome.error.code === "state_conflict"))
      .toHaveLength(1);
    const enabledDefaults = await db().select().from(aiModelConfig).where(and(
      eq(aiModelConfig.enabled, true),
      eq(aiModelConfig.isDefault, true),
    ));
    expect(enabledDefaults).toHaveLength(1);
  });

  it("freezes substantive fields after the first run reference", async () => {
    const admin = await seedActor();
    const created = await createConfig(admin);
    if (!created.ok) throw new Error("Configuration fixture failed.");
    await insertRunReference({ actorId: admin.userId, configId: created.value.id });
    const result = await createAiModelConfigServiceV1(db(), dependencies()).updateSubstantive({
      actor: admin,
      id: created.value.id,
      expectedRecordVersion: 1,
      ...substantive,
      maxOutputTokens: 201,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("state_conflict");
    const [row] = await db().select().from(aiModelConfig).where(eq(aiModelConfig.id, created.value.id));
    expect(row).toMatchObject({ maxOutputTokens: 200, recordVersion: 1 });
  });
});
