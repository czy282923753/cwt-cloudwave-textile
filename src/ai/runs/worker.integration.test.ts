import { randomUUID } from "node:crypto";

import { eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres, { type Sql } from "postgres";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { createPhaseCDurableDraftAssistanceServiceV1 } from "@/ai/applications/draft-assistance/composition";
import type { DraftAssistanceCommandV1 } from "@/ai/applications/draft-assistance/contracts";
import type { PromptBundleLoaderV1 } from "@/ai/prompts/loader";
import { createTextProviderRegistryV1 } from "@/ai/providers/registry";
import { createFakeTextProviderV1 } from "@/ai/testing/fake-text-provider";
import type { DatabaseConnection, PostgresAppDatabase } from "@/db/client";
import { migrateDatabase } from "@/db/migrate";
import {
  aiModelConfig,
  aiRuns,
  auditLogs,
  featureFlags,
  productLocalizations,
  productTaxonomyTerms,
  products,
  taxonomyTerms,
  users,
} from "@/db/schema";
import * as schema from "@/db/schema";
import { localTestPricingPolicyRegistryV1 } from "./pricing-policy";
import { createAiRunWorkerV1 } from "./worker";

const postgresUrl = process.env.CWT_PHASE_C_POSTGRES_URL;
const hash = (character: string) => character.repeat(64);
const requests: import("@/ai/canonical-json").ReadonlyJsonObject[] = [];
const provider = createFakeTextProviderV1({
  key: "synthetic_alpha",
  model: "synthetic-text-alpha-v1",
  envelope: { version: 1, hash: hash("e") },
  recorder: { requests },
  result: {
    kind: "success",
    returnedModel: "synthetic-text-alpha-v1",
    completion: { kind: "complete" },
    outputText: JSON.stringify({
      schemaVersion: 1,
      useCase: "product_description_draft",
      locale: "en",
      summaryProposal: { text: "Synthetic Worker candidate.", sourceRefs: ["src_01:text"] },
      descriptionBlocks: [],
      featureProposals: [],
      faqProposals: [],
      mediaTextProposals: [],
    }),
    usage: { inputTokens: 20, outputTokens: 10, totalTokens: 30 },
    durationMs: 3,
  },
});
const providerRegistryResult = createTextProviderRegistryV1([provider]);
if (!providerRegistryResult.ok) throw new Error("Synthetic Provider registry failed.");
const providerRegistry = providerRegistryResult.value;
const promptLoader: PromptBundleLoaderV1 = {
  load(input) {
    return {
      ok: true,
      value: {
        tuple: { promptId: input.promptId, promptVersion: input.promptVersion, promptHash: input.promptHash },
        applicationClass: input.applicationClass,
        capability: "text",
        useCase: input.useCase,
        locale: "en",
        inputSchemaVersion: input.inputSchemaVersion,
        outputSchemaVersion: input.outputSchemaVersion,
        policyVersion: input.policyVersion,
        variables: [
          { name: "locale", type: "string", maximumUtf8Bytes: 16 },
          { name: "product_context_json", type: "json", maximumUtf8Bytes: 49_152 },
          { name: "media_placement_refs_json", type: "json", maximumUtf8Bytes: 8_192 },
          { name: "requested_tone", type: "enum", values: ["concise_professional_b2b", "neutral_editorial"] },
        ],
        body: "SYNTHETIC TEST DATA — NOT A CWT FACT\n{{locale}}\n{{product_context_json}}\n{{media_placement_refs_json}}\n{{requested_tone}}",
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

async function seed() {
  const [actor] = await db().insert(users).values({
    email: `${randomUUID()}@worker.example.test`,
    displayName: "Synthetic Worker Actor",
    role: "product_editor",
    passwordHash: "test-only",
  }).returning({ id: users.id });
  if (actor === undefined) throw new Error("Synthetic actor failed.");
  const productId = await db().transaction(async (transaction) => {
    const [taxonomy] = await transaction.insert(taxonomyTerms).values({
      internalKey: `synthetic-worker-${randomUUID()}`,
      dimension: "material_fiber",
    }).returning({ id: taxonomyTerms.id });
    const [product] = await transaction.insert(products).values({
      status: "draft",
      createdByUserId: actor.id,
    }).returning({ id: products.id });
    if (taxonomy === undefined || product === undefined) throw new Error("Synthetic product failed.");
    await transaction.insert(productLocalizations).values({
      productId: product.id,
      locale: "en",
      name: "Synthetic Worker Product",
      editorDocumentVersion: 1,
    });
    await transaction.insert(productTaxonomyTerms).values({
      productId: product.id,
      taxonomyTermId: taxonomy.id,
      isPrimary: true,
    });
    return product.id;
  });
  await db().insert(featureFlags).values({ key: "ai", enabled: true });
  await db().insert(aiModelConfig).values({
    useCase: "product_description_draft",
    provider: "synthetic_alpha",
    model: "synthetic-text-alpha-v1",
    parametersJson: { temperature: 0 },
    maxInputTokens: 1_000,
    maxOutputTokens: 200,
    maxAttempts: 3,
    runCostLimitMicrousd: 20_000,
    promptId: "product-description-draft",
    promptVersion: 1,
    promptHash: hash("a"),
    enabled: true,
    isDefault: true,
    createdByUserId: actor.id,
    updatedByUserId: actor.id,
  });
  return { actorId: actor.id, productId };
}

function command(fixture: Awaited<ReturnType<typeof seed>>, idempotencyKey: string): DraftAssistanceCommandV1 {
  return {
    useCase: "product_description_draft",
    actor: { userId: fixture.actorId, role: "product_editor" },
    target: { type: "product_draft", productId: fixture.productId, locale: "en", expectedVersion: 1 },
    idempotencyKey,
    contextSelections: [{ sourceClass: "explicit_human_input", origin: "typed_brief" }],
    explicitInput: "SYNTHETIC TEST DATA — NOT A CWT FACT; Worker lifecycle proof.",
  };
}

async function waitFor(predicate: () => Promise<boolean>) {
  for (let count = 0; count < 800; count += 1) {
    if (await predicate()) return;
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  throw new Error("Synthetic Worker condition did not become true.");
}

describe.skipIf(postgresUrl === undefined)("Phase C direct two-slot Worker", () => {
  beforeAll(async () => {
    if (postgresUrl === undefined) return;
    client = postgres(postgresUrl, { max: 12, prepare: false, onnotice: () => undefined });
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
    requests.length = 0;
    await db().execute(sql`truncate table ${aiRuns}, ${aiModelConfig}, ${auditLogs}, ${featureFlags}, ${productLocalizations}, ${products}, ${users} cascade`);
  });
  afterAll(async () => client?.end());

  it("processes three durable rows through only two local slots and one call per row", async () => {
    const fixture = await seed();
    const service = createPhaseCDurableDraftAssistanceServiceV1({
      database: db(),
      trustedEnvironment: { appEnvironment: "test", processFeatureAiEnabled: true },
      providerRegistry,
      promptLoader,
      pricingRegistry: localTestPricingPolicyRegistryV1,
    });
    for (let index = 0; index < 3; index += 1) {
      const result = await service.requestDraftAssistance(command(fixture, randomUUID()));
      expect(result.ok).toBe(true);
    }
    const worker = createAiRunWorkerV1({
      database: db(),
      trustedEnvironment: { appEnvironment: "test", processFeatureAiEnabled: true },
      providerRegistry,
      promptLoader,
      pricingRegistry: localTestPricingPolicyRegistryV1,
      timing: {
        heartbeatIntervalMs: 15_000,
        lockRetryDelayMs: 1_000,
        idlePollMs: 50,
        gracefulShutdownMs: 1_000,
        postAbortPersistenceMs: 200,
      },
      workerId: "synthetic-worker-integration",
    });
    await worker.start();
    await waitFor(async () => {
      const rows = await db().select().from(aiRuns);
      return rows.length === 3 && rows.every((row) => row.status === "draft_ready");
    });
    await worker.stop("SIGTERM");
    const rows = await db().select().from(aiRuns);
    expect(rows).toHaveLength(3);
    expect(rows.every((row) => row.status === "draft_ready" && row.attemptCount === 1)).toBe(true);
    expect(requests).toHaveLength(3);
    expect(new Set(rows.map((row) => row.leaseToken))).toEqual(new Set([null]));
    const active = await db().select().from(aiRuns).where(eq(aiRuns.status, "processing"));
    expect(active).toHaveLength(0);
  }, 20_000);
});
