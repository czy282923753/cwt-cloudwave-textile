import { randomUUID } from "node:crypto";

import { count, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres, { type Sql } from "postgres";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { createPhaseCAvailabilityServiceV1 } from "./composition";
import type {
  DraftAssistanceAvailabilityQueryV1,
  DraftAssistanceTaskV1,
  ProductionAiUseCase,
} from "./contracts";
import { productionPromptLoaderV1 } from "@/ai/prompts/loader";
import { productionTextProviderRegistryV1 } from "@/ai/providers/registry";
import { productionPricingPolicyRegistryV1 } from "@/ai/runs/pricing-policy";
import type { DatabaseConnection, PostgresAppDatabase } from "@/db/client";
import { migrateDatabase } from "@/db/migrate";
import {
  aiRuns,
  authors,
  contentLocalizations,
  contents,
  productLocalizations,
  productTaxonomyTerms,
  products,
  taxonomyTerms,
  users,
} from "@/db/schema";
import * as schema from "@/db/schema";

const postgresUrl = process.env.CWT_PHASE_C_POSTGRES_URL;
const adminId = "30000000-0000-4000-8000-000000000001";
const productId = "30000000-0000-4000-8000-000000000002";
const authorId = "30000000-0000-4000-8000-000000000003";
const fabricContentId = "30000000-0000-4000-8000-000000000004";
const sourcingContentId = "30000000-0000-4000-8000-000000000005";
const categoryId = "30000000-0000-4000-8000-000000000006";

let client: Sql | undefined;
let database: PostgresAppDatabase | undefined;

function db(): PostgresAppDatabase {
  if (database === undefined) throw new Error("Phase E PostgreSQL fixture is unavailable.");
  return database;
}

function task(useCase: ProductionAiUseCase): DraftAssistanceTaskV1 {
  switch (useCase) {
    case "seo_content_draft": return {
      kind: useCase,
      tone: "concise_professional_b2b",
      pageIntent: "Synthetic SEO page intent",
      selectedInternalLinkIds: [],
    };
    case "fabric_knowledge_draft": return {
      kind: useCase,
      tone: "neutral_editorial",
      topic: "Synthetic fabric topic",
    };
    case "product_description_draft": return {
      kind: useCase,
      tone: "concise_professional_b2b",
      selectedMediaPlacementIds: [],
    };
    case "sourcing_guide_draft": return {
      kind: useCase,
      tone: "concise_professional_b2b",
      guideIntent: "Synthetic sourcing guide intent",
    };
  }
}

function query(
  useCase: ProductionAiUseCase = "product_description_draft",
): DraftAssistanceAvailabilityQueryV1 {
  const target = useCase === "fabric_knowledge_draft"
    ? { type: "content_draft" as const, contentId: fabricContentId, locale: "en" as const, expectedVersion: 1 }
    : useCase === "sourcing_guide_draft"
      ? { type: "content_draft" as const, contentId: sourcingContentId, locale: "en" as const, expectedVersion: 1 }
      : { type: "product_draft" as const, productId, locale: "en" as const, expectedVersion: 1 };
  return {
    useCase,
    task: task(useCase),
    actor: { userId: adminId, role: "admin" },
    target,
    contextSelections: [],
  };
}

describe.skipIf(postgresUrl === undefined)("Phase E E1 closed command and reader integration", () => {
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

  beforeEach(async () => {
    await db().execute(sql`truncate table ${aiRuns}, ${contentLocalizations}, ${contents}, ${authors}, ${productLocalizations}, ${productTaxonomyTerms}, ${products}, ${taxonomyTerms}, ${users} cascade`);
    await db().insert(users).values({
      id: adminId,
      email: "synthetic-phase-e-admin@example.invalid",
      displayName: "Synthetic Phase E Admin",
      role: "admin",
      passwordHash: "synthetic-not-a-password",
    });
    await db().insert(authors).values({
      id: authorId,
      internalKey: "synthetic-phase-e-author",
      displayName: "Synthetic Phase E Author",
    });
    await db().insert(taxonomyTerms).values({
      id: categoryId,
      internalKey: "synthetic-phase-e-category",
      dimension: "material_fiber",
    });
    await db().transaction(async (transaction) => {
      await transaction.insert(products).values({ id: productId, status: "draft", createdByUserId: adminId });
      await transaction.insert(productLocalizations).values({
        productId,
        locale: "en",
        name: "Synthetic Phase E Product",
        editorDocumentVersion: 1,
      });
      await transaction.insert(productTaxonomyTerms).values({
        productId,
        taxonomyTermId: categoryId,
        isPrimary: true,
      });
    });
    await db().insert(contents).values([
      { id: fabricContentId, channel: "fabric_knowledge", status: "draft", authorId, createdByUserId: adminId },
      { id: sourcingContentId, channel: "china_sourcing_guide", status: "draft", authorId, createdByUserId: adminId },
    ]);
    await db().insert(contentLocalizations).values([
      { contentId: fabricContentId, locale: "en", title: "Synthetic Fabric Content", body: "Synthetic", editorDocumentVersion: 1 },
      { contentId: sourcingContentId, locale: "en", title: "Synthetic Sourcing Content", body: "Synthetic", editorDocumentVersion: 1 },
    ]);
  });

  afterAll(async () => {
    await client?.end();
  });

  const service = () => createPhaseCAvailabilityServiceV1({
    database: db(),
    trustedEnvironment: { appEnvironment: "test", processFeatureAiEnabled: true },
    providerRegistry: productionTextProviderRegistryV1,
    promptLoader: productionPromptLoaderV1,
    pricingRegistry: productionPricingPolicyRegistryV1,
  });

  it("accepts only exact task/use-case pairs for all four Production use cases", async () => {
    for (const useCase of [
      "seo_content_draft",
      "fabric_knowledge_draft",
      "product_description_draft",
      "sourcing_guide_draft",
    ] as const) {
      const result = await service().inspectDraftAssistanceAvailability(query(useCase));
      expect(result).toMatchObject({
        ok: true,
        value: { code: "feature_flag_missing", manualEditorAvailable: true },
      });
    }

    const mismatched = {
      ...query("product_description_draft"),
      task: task("fabric_knowledge_draft"),
    } as unknown as DraftAssistanceAvailabilityQueryV1;
    expect(await service().inspectDraftAssistanceAvailability(mismatched))
      .toMatchObject({ ok: true, value: { code: "target_scope_mismatch" } });
  });

  it("rejects unknown keys, empty/oversized strings, wrong tones, duplicate IDs and excess cardinality", async () => {
    const ids = Array.from({ length: 13 }, () => randomUUID());
    const invalid = [
      { ...query(), unknownTopLevel: true },
      { ...query(), task: { ...task("product_description_draft"), unknownTaskKey: true } },
      { ...query("seo_content_draft"), task: { ...task("seo_content_draft"), pageIntent: "   " } },
      { ...query("seo_content_draft"), task: { ...task("seo_content_draft"), pageIntent: "界".repeat(167) + "aa" } },
      { ...query("fabric_knowledge_draft"), task: { ...task("fabric_knowledge_draft"), tone: "concise_professional_b2b" } },
      { ...query("seo_content_draft"), task: { ...task("seo_content_draft"), selectedInternalLinkIds: [ids[0], ids[0]] } },
      { ...query("product_description_draft"), task: { ...task("product_description_draft"), selectedMediaPlacementIds: ids } },
    ] as unknown as DraftAssistanceAvailabilityQueryV1[];
    for (const candidate of invalid) {
      expect(await service().inspectDraftAssistanceAvailability(candidate))
        .toMatchObject({ ok: true, value: { code: "target_scope_mismatch" } });
    }
    expect((await db().select({ value: count() }).from(aiRuns))[0]?.value).toBe(0);
  });

  it("fails closed on forged role, wrong target kind and wrong Content channel", async () => {
    const forgedRole = { ...query(), actor: { userId: adminId, role: "product_editor" as const } };
    expect(await service().inspectDraftAssistanceAvailability(forgedRole))
      .toMatchObject({ ok: true, value: { code: "authorization_denied" } });

    const wrongTarget = {
      ...query("product_description_draft"),
      target: { type: "content_draft" as const, contentId: fabricContentId, locale: "en" as const, expectedVersion: 1 },
    };
    expect(await service().inspectDraftAssistanceAvailability(wrongTarget))
      .toMatchObject({ ok: true, value: { code: "target_scope_mismatch" } });

    const wrongChannel = {
      ...query("fabric_knowledge_draft"),
      target: { type: "content_draft" as const, contentId: sourcingContentId, locale: "en" as const, expectedVersion: 1 },
    };
    expect(await service().inspectDraftAssistanceAvailability(wrongChannel))
      .toMatchObject({ ok: true, value: { code: "target_scope_mismatch" } });
    expect((await db().select({ value: count() }).from(aiRuns))[0]?.value).toBe(0);
  });
});
