import { count, eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { createPhaseBAvailabilityServiceV1 } from "@/ai/applications/draft-assistance/composition";
import {
  aiRuns,
  authors,
  contentLocalizations,
  contents,
  editorialRevisions,
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
  const contentId = "33333333-3333-4333-8333-333333333333";
  const authorId = "44444444-4444-4444-8444-444444444444";
  const productRevisionId = "77777777-7777-4777-8777-777777777777";
  const contentRevisionId = "88888888-8888-4888-8888-888888888888";

  beforeAll(async () => {
    database = await createTestDatabase();
    const categoryId = "22222222-2222-4222-8222-222222222222";
    await database.db.insert(taxonomyTerms).values({
      id: categoryId,
      internalKey: "synthetic-phase-b-primary-category",
      dimension: "material_fiber",
    });
    await database.db.insert(authors).values({
      id: authorId,
      internalKey: "synthetic-phase-b-author",
      displayName: "SYNTHETIC TEST DATA — NOT A CWT FACT",
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
      await transaction.insert(contents).values({
        id: contentId,
        channel: "fabric_knowledge",
        status: "draft",
        authorId,
      });
      await transaction.insert(contentLocalizations).values({
        contentId,
        locale: "en",
        title: "SYNTHETIC TEST DATA — NOT A CWT FACT",
        body: "SYNTHETIC TEST DATA — NOT A CWT FACT",
        editorDocumentVersion: 5,
      });
      await transaction.insert(editorialRevisions).values([
        {
          id: productRevisionId,
          entityType: "product",
          entityId: productId,
          locale: "en",
          versionNumber: 3,
          status: "draft",
          snapshot: { synthetic: true },
        },
        {
          id: contentRevisionId,
          entityType: "content",
          entityId: contentId,
          locale: "en",
          versionNumber: 4,
          status: "draft",
          snapshot: { synthetic: true },
        },
      ]);
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

  it("enforces Product and Content editor roles from the authoritative target entity type", async () => {
    const service = createPhaseBAvailabilityServiceV1({
      database: database.db,
      trustedEnvironment: { appEnvironment: "test", processFeatureAiEnabled: true },
    });
    type Inspection = Parameters<typeof service.inspectDraftAssistanceAvailability>[0];
    const admin = {
      userId: "99999999-9999-4999-8999-999999999999",
      role: "admin",
    } satisfies Inspection["actor"];
    const productEditor = {
      userId: "66666666-6666-4666-8666-666666666666",
      role: "product_editor",
    } satisfies Inspection["actor"];
    const contentEditor = {
      userId: "55555555-5555-4555-8555-555555555555",
      role: "content_editor",
    } satisfies Inspection["actor"];
    const matrix = [
      {
        label: "Product Draft",
        useCase: "product_description_draft",
        target: { type: "product_draft", productId, locale: "en", expectedVersion: 7 },
        correctEditor: productEditor,
        wrongEditor: contentEditor,
        downstreamCode: "integration_not_ready",
        downstreamManualEditorAvailable: true,
      },
      {
        label: "Content Draft",
        useCase: "fabric_knowledge_draft",
        target: { type: "content_draft", contentId, locale: "en", expectedVersion: 5 },
        correctEditor: contentEditor,
        wrongEditor: productEditor,
        downstreamCode: "integration_not_ready",
        downstreamManualEditorAvailable: true,
      },
      {
        label: "Product Revision",
        useCase: "product_description_draft",
        target: { type: "editorial_revision", revisionId: productRevisionId, expectedVersion: 3 },
        correctEditor: productEditor,
        wrongEditor: contentEditor,
        downstreamCode: "integration_not_ready",
        downstreamManualEditorAvailable: true,
      },
      {
        label: "Content Revision",
        useCase: "fabric_knowledge_draft",
        target: { type: "editorial_revision", revisionId: contentRevisionId, expectedVersion: 4 },
        correctEditor: contentEditor,
        wrongEditor: productEditor,
        downstreamCode: "integration_not_ready",
        downstreamManualEditorAvailable: true,
      },
    ] satisfies ReadonlyArray<{
      readonly label: string;
      readonly useCase: Inspection["useCase"];
      readonly target: Inspection["target"];
      readonly correctEditor: Inspection["actor"];
      readonly wrongEditor: Inspection["actor"];
      readonly downstreamCode: "integration_not_ready";
      readonly downstreamManualEditorAvailable: boolean;
    }>;

    for (const entry of matrix) {
      for (const actor of [admin, entry.correctEditor]) {
        const result = await service.inspectDraftAssistanceAvailability({
          useCase: entry.useCase,
          actor,
          target: entry.target,
          contextSelections: [{ sourceClass: "explicit_human_input", origin: "typed_brief" }],
          explicitInput: "SYNTHETIC TEST DATA — NOT A CWT FACT: concise textile overview.",
        });
        expect(result, `${entry.label}: authorized actor`).toEqual({
          ok: true,
          value: {
            available: false,
            manualEditorAvailable: entry.downstreamManualEditorAvailable,
            code: entry.downstreamCode,
          },
        });
      }

      const denied = await service.inspectDraftAssistanceAvailability({
        useCase: entry.useCase,
        actor: entry.wrongEditor,
        target: entry.target,
        contextSelections: [{ sourceClass: "explicit_human_input", origin: "typed_brief" }],
        explicitInput: "SYNTHETIC TEST DATA — NOT A CWT FACT: concise textile overview.",
      });
      expect(denied, `${entry.label}: wrong editor`).toEqual({
        ok: true,
        value: {
          available: false,
          manualEditorAvailable: false,
          code: "authorization_denied",
        },
      });
    }
  });

  it("does not disclose Revision existence or version to the wrong editor", async () => {
    const service = createPhaseBAvailabilityServiceV1({
      database: database.db,
      trustedEnvironment: { appEnvironment: "test", processFeatureAiEnabled: true },
    });
    const contentEditor = {
      userId: "55555555-5555-4555-8555-555555555555",
      role: "content_editor" as const,
    };
    const productEditor = {
      userId: "66666666-6666-4666-8666-666666666666",
      role: "product_editor" as const,
    };
    const missingRevisionId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
    const wrongRoleExisting = await service.inspectDraftAssistanceAvailability({
      useCase: "product_description_draft",
      actor: contentEditor,
      target: { type: "editorial_revision", revisionId: productRevisionId, expectedVersion: 99 },
      contextSelections: [],
    });
    const wrongRoleMissing = await service.inspectDraftAssistanceAvailability({
      useCase: "product_description_draft",
      actor: contentEditor,
      target: { type: "editorial_revision", revisionId: missingRevisionId, expectedVersion: 99 },
      contextSelections: [],
    });
    const correctRoleMissing = await service.inspectDraftAssistanceAvailability({
      useCase: "product_description_draft",
      actor: productEditor,
      target: { type: "editorial_revision", revisionId: missingRevisionId, expectedVersion: 99 },
      contextSelections: [],
    });
    expect(wrongRoleExisting).toEqual(wrongRoleMissing);
    expect(wrongRoleMissing).toEqual(correctRoleMissing);
    expect(wrongRoleExisting).toEqual({
      ok: true,
      value: {
        available: false,
        manualEditorAvailable: false,
        code: "authorization_denied",
      },
    });

    const versionConflict = await service.inspectDraftAssistanceAvailability({
      useCase: "product_description_draft",
      actor: productEditor,
      target: { type: "editorial_revision", revisionId: productRevisionId, expectedVersion: 99 },
      contextSelections: [],
    });
    expect(versionConflict).toEqual({
      ok: true,
      value: {
        available: false,
        manualEditorAvailable: false,
        code: "target_version_conflict",
      },
    });
  });
});
