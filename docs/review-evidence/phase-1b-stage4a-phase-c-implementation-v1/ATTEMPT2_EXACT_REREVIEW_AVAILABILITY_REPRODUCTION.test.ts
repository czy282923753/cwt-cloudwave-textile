import { randomUUID } from "node:crypto";

import { drizzle } from "drizzle-orm/postgres-js";
import postgres, { type Sql } from "postgres";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { createPhaseCDurableDraftAssistanceServiceV1 } from "@/ai/applications/draft-assistance/composition";
import type { PromptBundleLoaderV1 } from "@/ai/prompts/loader";
import { createTextProviderRegistryV1 } from "@/ai/providers/registry";
import { localTestPricingPolicyRegistryV1 } from "@/ai/runs/pricing-policy";
import { createFakeTextProviderV1 } from "@/ai/testing/fake-text-provider";
import type { DatabaseConnection, PostgresAppDatabase } from "@/db/client";
import { migrateDatabase } from "@/db/migrate";
import {
  aiModelConfig,
  featureFlags,
  productLocalizations,
  productTaxonomyTerms,
  products,
  taxonomyTerms,
  users,
} from "@/db/schema";
import * as schema from "@/db/schema";

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
const providers = createTextProviderRegistryV1([provider]);
if (!providers.ok) throw new Error("Synthetic Provider registry failed.");
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
        variables: [
          { name: "locale", type: "string", maximumUtf8Bytes: 16 },
          { name: "product_context_json", type: "json", maximumUtf8Bytes: 49_152 },
          { name: "media_placement_refs_json", type: "json", maximumUtf8Bytes: 8_192 },
          {
            name: "requested_tone",
            type: "enum",
            values: ["concise_professional_b2b", "neutral_editorial"],
          },
        ],
        body: [
          "SYNTHETIC TEST DATA — NOT A CWT FACT",
          "{{locale}}",
          "{{product_context_json}}",
          "{{media_placement_refs_json}}",
          "{{requested_tone}}",
        ].join("\n"),
      },
    };
  },
};

let client: Sql | undefined;
let database: PostgresAppDatabase | undefined;

function db(): PostgresAppDatabase {
  if (database === undefined) throw new Error("Review PostgreSQL fixture was not initialized.");
  return database;
}

describe.skipIf(postgresUrl === undefined)("Remediation re-review: availability actor authority", () => {
  beforeAll(async () => {
    if (postgresUrl === undefined) return;
    client = postgres(postgresUrl, { max: 6, prepare: false, onnotice: () => undefined });
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

  it("shows the same DTO-role authority still exposes target/config availability", async () => {
    await db().execute("truncate table ai_runs, ai_model_config, audit_logs, feature_flags, products, users cascade");
    const [owner, sales, reviewer, inactive] = await db().insert(users).values([
      {
        email: `${randomUUID()}@availability-review.example.test`,
        displayName: "Synthetic Product Editor",
        role: "product_editor",
        passwordHash: "test-only",
      },
      {
        email: `${randomUUID()}@availability-review.example.test`,
        displayName: "Synthetic Sales",
        role: "sales",
        passwordHash: "test-only",
      },
      {
        email: `${randomUUID()}@availability-review.example.test`,
        displayName: "Synthetic Reviewer",
        role: "reviewer_publisher",
        passwordHash: "test-only",
      },
      {
        email: `${randomUUID()}@availability-review.example.test`,
        displayName: "Synthetic Inactive Editor",
        role: "product_editor",
        passwordHash: "test-only",
        isActive: false,
      },
    ]).returning({ id: users.id });
    if (owner === undefined || sales === undefined || reviewer === undefined || inactive === undefined) {
      throw new Error("Synthetic actor fixtures were incomplete.");
    }
    const productId = await db().transaction(async (transaction) => {
      const [taxonomy] = await transaction.insert(taxonomyTerms).values({
        internalKey: `synthetic-availability-${randomUUID()}`,
        dimension: "material_fiber",
      }).returning({ id: taxonomyTerms.id });
      const [product] = await transaction.insert(products).values({
        status: "draft",
        createdByUserId: owner.id,
      }).returning({ id: products.id });
      if (taxonomy === undefined || product === undefined) throw new Error("Synthetic Product failed.");
      await transaction.insert(productLocalizations).values({
        productId: product.id,
        locale: "en",
        name: "Synthetic Availability Product",
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
      createdByUserId: owner.id,
      updatedByUserId: owner.id,
    });

    const service = createPhaseCDurableDraftAssistanceServiceV1({
      database: db(),
      trustedEnvironment: { appEnvironment: "test", processFeatureAiEnabled: true },
      providerRegistry: providers.value,
      promptLoader,
      pricingRegistry: localTestPricingPolicyRegistryV1,
    });
    const inspect = (actor: { readonly userId: string; readonly role: "product_editor" }, id = productId) =>
      service.inspectDraftAssistanceAvailability({
        useCase: "product_description_draft",
        actor,
        target: { type: "product_draft", productId: id, locale: "en", expectedVersion: 1 },
        contextSelections: [{ sourceClass: "explicit_human_input", origin: "typed_brief" }],
        explicitInput: "Synthetic availability brief; not a CWT business fact.",
      });

    const salesClaimingEditor = await inspect({ userId: sales.id, role: "product_editor" });
    const reviewerClaimingEditor = await inspect({ userId: reviewer.id, role: "product_editor" });
    const inactiveEditor = await inspect({ userId: inactive.id, role: "product_editor" });
    const unknownEditor = await inspect({ userId: randomUUID(), role: "product_editor" });
    const malformedEditor = await inspect({ userId: "not-a-uuid", role: "product_editor" });
    for (const outcome of [
      salesClaimingEditor,
      reviewerClaimingEditor,
      inactiveEditor,
      unknownEditor,
    ]) {
      expect(outcome).toEqual({
        ok: true,
        value: { available: true, manualEditorAvailable: true, code: "available" },
      });
    }

    const missing = await inspect({ userId: sales.id, role: "product_editor" }, randomUUID());
    expect(malformedEditor).toEqual({
      ok: true,
      value: { available: false, manualEditorAvailable: false, code: "authorization_denied" },
    });
    expect(missing).toEqual({
      ok: true,
      value: { available: false, manualEditorAvailable: false, code: "authorization_denied" },
    });
    expect(missing).not.toEqual(salesClaimingEditor);
  });
});
