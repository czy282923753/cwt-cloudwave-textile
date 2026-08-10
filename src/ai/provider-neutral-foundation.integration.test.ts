import { count, eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { createPhaseBAvailabilityServiceV1 } from "@/ai/applications/draft-assistance/composition";
import {
  aiRuns,
  productLocalizations,
  products,
  productTaxonomyTerms,
  taxonomyTerms,
} from "@/db/schema";
import { createTestDatabase } from "@/test/database";
import { productionApplicationKeysV1 } from "@/ai/registry/production-use-cases";

describe("Phase B Provider-neutral Production foundation", () => {
  let database: Awaited<ReturnType<typeof createTestDatabase>>;
  const productId = "11111111-1111-4111-8111-111111111111";

  beforeAll(async () => {
    database = await createTestDatabase();
    const categoryId = "22222222-2222-4222-8222-222222222222";
    await database.db.insert(taxonomyTerms).values({
      id: categoryId,
      internalKey: "synthetic-phase-b-primary-category",
      dimension: "material_fiber",
    });
    await database.db.transaction(async (transaction) => {
      await transaction.insert(products).values({
        id: productId,
        status: "draft",
      });
      await transaction.insert(productLocalizations).values({
        productId,
        locale: "en",
        name: "SYNTHETIC TEST DATA — NOT A CWT FACT",
        editorDocumentVersion: 7,
      });
      await transaction.insert(productTaxonomyTerms).values({
        productId,
        taxonomyTermId: categoryId,
        isPrimary: true,
      });
    });
  });

  afterAll(async () => {
    await database.close();
  });

  it("declares exactly the four approved Production keys", () => {
    expect(productionApplicationKeysV1).toEqual([
      { applicationClass: "draft_assistance", capability: "text", useCase: "seo_content_draft" },
      { applicationClass: "draft_assistance", capability: "text", useCase: "fabric_knowledge_draft" },
      { applicationClass: "draft_assistance", capability: "text", useCase: "product_description_draft" },
      { applicationClass: "draft_assistance", capability: "text", useCase: "sourcing_guide_draft" },
    ]);
  });

  it("authorizes and snapshots a Draft target, then stops at durable integration readiness", async () => {
    const service = createPhaseBAvailabilityServiceV1({
      database: database.db,
      trustedEnvironment: { appEnvironment: "test", processFeatureAiEnabled: true },
    });
    expect(Object.keys(service)).toEqual(["inspectDraftAssistanceAvailability"]);
    expect("requestDraftAssistance" in service).toBe(false);
    const before = await database.db.select({ value: count() }).from(aiRuns);
    const result = await service.inspectDraftAssistanceAvailability({
      useCase: "product_description_draft",
      actor: { userId: "99999999-9999-4999-8999-999999999999", role: "admin" },
      target: { type: "product_draft", productId, locale: "en", expectedVersion: 7 },
      contextSelections: [{ sourceClass: "explicit_human_input", origin: "typed_brief" }],
      explicitInput: "SYNTHETIC TEST DATA — NOT A CWT FACT: write a concise overview.",
    });
    expect(result).toEqual({
      ok: true,
      value: {
        available: false,
        manualEditorAvailable: true,
        code: "integration_not_ready",
      },
    });
    const after = await database.db.select({ value: count() }).from(aiRuns);
    expect(after).toEqual(before);
  });

  it("fails target version before readiness without writing", async () => {
    const service = createPhaseBAvailabilityServiceV1({
      database: database.db,
      trustedEnvironment: { appEnvironment: "test", processFeatureAiEnabled: true },
    });
    const result = await service.inspectDraftAssistanceAvailability({
      useCase: "product_description_draft",
      actor: { userId: "99999999-9999-4999-8999-999999999999", role: "admin" },
      target: { type: "product_draft", productId, locale: "en", expectedVersion: 8 },
      contextSelections: [],
    });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.code).toBe("target_version_conflict");
    const row = await database.db.select({ version: productLocalizations.editorDocumentVersion })
      .from(productLocalizations).where(eq(productLocalizations.productId, productId));
    expect(row[0]?.version).toBe(7);
  });
});
