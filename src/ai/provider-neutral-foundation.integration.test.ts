import { count, eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { createPhaseCAvailabilityServiceV1 } from "@/ai/applications/draft-assistance/composition";
import { productionPromptLoaderV1 } from "@/ai/prompts/loader";
import { productionTextProviderRegistryV1 } from "@/ai/providers/registry";
import { productionPricingPolicyRegistryV1 } from "@/ai/runs/pricing-policy";
import {
  aiModelConfig,
  aiRuns,
  auditLogs,
  authors,
  contentLocalizations,
  contents,
  editorialRevisions,
  featureFlags,
  productLocalizations,
  products,
  productTaxonomyTerms,
  taxonomyTerms,
  users,
} from "@/db/schema";
import { createTestDatabase } from "@/test/database";
import { productionApplicationKeysV1 } from "@/ai/registry/production-use-cases";

describe("Phase C Provider-neutral Production foundation", () => {
  let database: Awaited<ReturnType<typeof createTestDatabase>>;
  const productId = "11111111-1111-4111-8111-111111111111";
  const contentId = "33333333-3333-4333-8333-333333333333";
  const authorId = "44444444-4444-4444-8444-444444444444";
  const productRevisionId = "77777777-7777-4777-8777-777777777777";
  const contentRevisionId = "88888888-8888-4888-8888-888888888888";
  const malformedRevisionId = "99999999-1111-4111-8111-111111111111";
  const adminId = "99999999-9999-4999-8999-999999999999";
  const productEditorId = "66666666-6666-4666-8666-666666666666";
  const contentEditorId = "55555555-5555-4555-8555-555555555555";
  const salesId = "aaaaaaaa-4444-4444-8444-444444444444";
  const reviewerId = "aaaaaaaa-5555-4555-8555-555555555555";
  const analystId = "aaaaaaaa-6666-4666-8666-666666666666";
  const inactiveEditorId = "aaaaaaaa-7777-4777-8777-777777777777";

  const createAvailabilityService = () => createPhaseCAvailabilityServiceV1({
    database: database.db,
    trustedEnvironment: { appEnvironment: "test", processFeatureAiEnabled: true },
    providerRegistry: productionTextProviderRegistryV1,
    promptLoader: productionPromptLoaderV1,
    pricingRegistry: productionPricingPolicyRegistryV1,
  });

  beforeAll(async () => {
    database = await createTestDatabase();
    const categoryId = "22222222-2222-4222-8222-222222222222";
    await database.db.insert(users).values([
      { id: adminId, email: "synthetic-admin@example.invalid", displayName: "Synthetic Admin", role: "admin", passwordHash: "synthetic-not-a-password" },
      { id: productEditorId, email: "synthetic-product-editor@example.invalid", displayName: "Synthetic Product Editor", role: "product_editor", passwordHash: "synthetic-not-a-password" },
      { id: contentEditorId, email: "synthetic-content-editor@example.invalid", displayName: "Synthetic Content Editor", role: "content_editor", passwordHash: "synthetic-not-a-password" },
      { id: salesId, email: "synthetic-sales@example.invalid", displayName: "Synthetic Sales", role: "sales", passwordHash: "synthetic-not-a-password" },
      { id: reviewerId, email: "synthetic-reviewer@example.invalid", displayName: "Synthetic Reviewer", role: "reviewer_publisher", passwordHash: "synthetic-not-a-password" },
      { id: analystId, email: "synthetic-analyst@example.invalid", displayName: "Synthetic Analyst", role: "analyst", passwordHash: "synthetic-not-a-password" },
      { id: inactiveEditorId, email: "synthetic-inactive@example.invalid", displayName: "Synthetic Inactive Editor", role: "product_editor", passwordHash: "synthetic-not-a-password", isActive: false },
    ]);
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
        {
          id: malformedRevisionId,
          entityType: "unexpected_entity_type",
          entityId: "99999999-3333-4333-8333-333333333333",
          locale: "en",
          versionNumber: 1,
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
    const service = createAvailabilityService();
    expect(Object.keys(service)).toEqual(["inspectDraftAssistanceAvailability"]);
    expect("requestDraftAssistance" in service).toBe(false);
    const before = await database.db.select({ value: count() }).from(aiRuns);
    const result = await service.inspectDraftAssistanceAvailability({
      useCase: "product_description_draft",
      actor: { userId: adminId, role: "admin" },
      target: { type: "product_draft", productId, locale: "en", expectedVersion: 7 },
      contextSelections: [{ sourceClass: "explicit_human_input", origin: "typed_brief" }],
      explicitInput: "SYNTHETIC TEST DATA — NOT A CWT FACT: write a concise overview.",
    });
    expect(result).toEqual({
      ok: true,
      value: {
        available: false,
        manualEditorAvailable: true,
        code: "feature_flag_missing",
      },
    });
    const after = await database.db.select({ value: count() }).from(aiRuns);
    expect(after).toEqual(before);
  });

  it("fails target version before readiness without writing", async () => {
    const service = createAvailabilityService();
    const result = await service.inspectDraftAssistanceAvailability({
      useCase: "product_description_draft",
      actor: { userId: adminId, role: "admin" },
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
    const service = createAvailabilityService();
    type Inspection = Parameters<typeof service.inspectDraftAssistanceAvailability>[0];
    const admin = {
      userId: adminId,
      role: "admin",
    } satisfies Inspection["actor"];
    const productEditor = {
      userId: productEditorId,
      role: "product_editor",
    } satisfies Inspection["actor"];
    const contentEditor = {
      userId: contentEditorId,
      role: "content_editor",
    } satisfies Inspection["actor"];
    const matrix = [
      {
        label: "Product Draft",
        useCase: "product_description_draft",
        target: { type: "product_draft", productId, locale: "en", expectedVersion: 7 },
        correctEditor: productEditor,
        wrongEditor: contentEditor,
        downstreamCode: "feature_flag_missing",
        downstreamManualEditorAvailable: true,
      },
      {
        label: "Content Draft",
        useCase: "fabric_knowledge_draft",
        target: { type: "content_draft", contentId, locale: "en", expectedVersion: 5 },
        correctEditor: contentEditor,
        wrongEditor: productEditor,
        downstreamCode: "feature_flag_missing",
        downstreamManualEditorAvailable: true,
      },
      {
        label: "Product Revision",
        useCase: "product_description_draft",
        target: { type: "editorial_revision", revisionId: productRevisionId, expectedVersion: 3 },
        correctEditor: productEditor,
        wrongEditor: contentEditor,
        downstreamCode: "feature_flag_missing",
        downstreamManualEditorAvailable: true,
      },
      {
        label: "Content Revision",
        useCase: "fabric_knowledge_draft",
        target: { type: "editorial_revision", revisionId: contentRevisionId, expectedVersion: 4 },
        correctEditor: contentEditor,
        wrongEditor: productEditor,
        downstreamCode: "feature_flag_missing",
        downstreamManualEditorAvailable: true,
      },
    ] satisfies ReadonlyArray<{
      readonly label: string;
      readonly useCase: Inspection["useCase"];
      readonly target: Inspection["target"];
      readonly correctEditor: Inspection["actor"];
      readonly wrongEditor: Inspection["actor"];
      readonly downstreamCode: "feature_flag_missing";
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
    const service = createAvailabilityService();
    const contentEditor = {
      userId: contentEditorId,
      role: "content_editor" as const,
    };
    const productEditor = {
      userId: productEditorId,
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

  it("applies record-scope-first authorization across a real-service database matrix", async () => {
    const service = createAvailabilityService();
    type Inspection = Parameters<typeof service.inspectDraftAssistanceAvailability>[0];
    const admin = {
      userId: adminId,
      role: "admin",
    } satisfies Inspection["actor"];
    const productEditor = {
      userId: productEditorId,
      role: "product_editor",
    } satisfies Inspection["actor"];
    const contentEditor = {
      userId: contentEditorId,
      role: "content_editor",
    } satisfies Inspection["actor"];
    const missingProductId = "aaaaaaaa-1111-4111-8111-111111111111";
    const missingContentId = "aaaaaaaa-2222-4222-8222-222222222222";
    const missingRevisionId = "aaaaaaaa-3333-4333-8333-333333333333";
    const inspect = (entry: {
      readonly useCase: Inspection["useCase"];
      readonly actor: Inspection["actor"];
      readonly target: Inspection["target"];
    }) => service.inspectDraftAssistanceAvailability({ ...entry, contextSelections: [] });
    const expected = (code: string, manualEditorAvailable = false) => ({
      ok: true,
      value: { available: false, manualEditorAvailable, code },
    });

    const validCases = [
      {
        label: "Product Draft",
        useCase: "product_description_draft",
        target: { type: "product_draft", productId, locale: "en", expectedVersion: 7 },
        actors: [admin, productEditor],
      },
      {
        label: "Content Draft",
        useCase: "fabric_knowledge_draft",
        target: { type: "content_draft", contentId, locale: "en", expectedVersion: 5 },
        actors: [admin, contentEditor],
      },
      {
        label: "Product Revision",
        useCase: "product_description_draft",
        target: { type: "editorial_revision", revisionId: productRevisionId, expectedVersion: 3 },
        actors: [admin, productEditor],
      },
      {
        label: "Content Revision",
        useCase: "fabric_knowledge_draft",
        target: { type: "editorial_revision", revisionId: contentRevisionId, expectedVersion: 4 },
        actors: [admin, contentEditor],
      },
    ] satisfies ReadonlyArray<{
      readonly label: string;
      readonly useCase: Inspection["useCase"];
      readonly target: Inspection["target"];
      readonly actors: readonly Inspection["actor"][];
    }>;
    for (const entry of validCases) {
      for (const actor of entry.actors) {
        expect(await inspect({ useCase: entry.useCase, actor, target: entry.target }),
          `${entry.label}: authorized`).toEqual(expected("feature_flag_missing", true));
      }
    }

    const deniedCases = [
      {
        label: "missing Product Draft",
        useCase: "product_description_draft",
        actor: productEditor,
        target: { type: "product_draft", productId: missingProductId, locale: "en", expectedVersion: 7 },
      },
      {
        label: "missing Content Draft",
        useCase: "fabric_knowledge_draft",
        actor: contentEditor,
        target: { type: "content_draft", contentId: missingContentId, locale: "en", expectedVersion: 5 },
      },
      {
        label: "missing Revision",
        useCase: "product_description_draft",
        actor: productEditor,
        target: { type: "editorial_revision", revisionId: missingRevisionId, expectedVersion: 3 },
      },
      {
        label: "malformed Revision for Product Editor",
        useCase: "product_description_draft",
        actor: productEditor,
        target: { type: "editorial_revision", revisionId: malformedRevisionId, expectedVersion: 1 },
      },
      {
        label: "malformed Revision for Content Editor",
        useCase: "product_description_draft",
        actor: contentEditor,
        target: { type: "editorial_revision", revisionId: malformedRevisionId, expectedVersion: 1 },
      },
      {
        label: "Product Revision wrong type, actor and version",
        useCase: "product_description_draft",
        actor: contentEditor,
        target: { type: "editorial_revision", revisionId: productRevisionId, expectedVersion: 99 },
      },
      {
        label: "Content Revision wrong type, actor and version",
        useCase: "fabric_knowledge_draft",
        actor: productEditor,
        target: { type: "editorial_revision", revisionId: contentRevisionId, expectedVersion: 99 },
      },
      {
        label: "Product Draft wrong actor and use case",
        useCase: "fabric_knowledge_draft",
        actor: contentEditor,
        target: { type: "product_draft", productId, locale: "en", expectedVersion: 99 },
      },
    ] satisfies ReadonlyArray<{
      readonly label: string;
      readonly useCase: Inspection["useCase"];
      readonly actor: Inspection["actor"];
      readonly target: Inspection["target"];
    }>;
    for (const entry of deniedCases) {
      expect(await inspect(entry), entry.label).toEqual(expected("authorization_denied"));
    }

    const authorizedVersionCases = [
      {
        label: "Product Draft version",
        useCase: "product_description_draft",
        actor: productEditor,
        target: { type: "product_draft", productId, locale: "en", expectedVersion: 99 },
      },
      {
        label: "Content Draft version",
        useCase: "fabric_knowledge_draft",
        actor: contentEditor,
        target: { type: "content_draft", contentId, locale: "en", expectedVersion: 99 },
      },
      {
        label: "Product Revision version",
        useCase: "product_description_draft",
        actor: productEditor,
        target: { type: "editorial_revision", revisionId: productRevisionId, expectedVersion: 99 },
      },
      {
        label: "Content Revision version",
        useCase: "fabric_knowledge_draft",
        actor: contentEditor,
        target: { type: "editorial_revision", revisionId: contentRevisionId, expectedVersion: 99 },
      },
    ] satisfies ReadonlyArray<{
      readonly label: string;
      readonly useCase: Inspection["useCase"];
      readonly actor: Inspection["actor"];
      readonly target: Inspection["target"];
    }>;
    for (const entry of authorizedVersionCases) {
      expect(await inspect(entry), entry.label).toEqual(expected("target_version_conflict"));
    }

    expect(await inspect({
      useCase: "product_description_draft",
      actor: admin,
      target: { type: "editorial_revision", revisionId: malformedRevisionId, expectedVersion: 1 },
    }), "Admin may see malformed target structure only after authorization")
      .toEqual(expected("target_scope_mismatch"));
  });

  it("resolves one persisted active actor before target, feature and config state", async () => {
    const service = createAvailabilityService();
    type Inspection = Parameters<typeof service.inspectDraftAssistanceAvailability>[0];
    const existingTarget = {
      type: "product_draft",
      productId,
      locale: "en",
      expectedVersion: 7,
    } satisfies Inspection["target"];
    const missingTarget = {
      ...existingTarget,
      productId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
    } satisfies Inspection["target"];
    const inspect = (actor: Inspection["actor"], target = existingTarget) =>
      service.inspectDraftAssistanceAvailability({
        useCase: "product_description_draft",
        actor,
        target,
        contextSelections: [],
      });
    const denied = {
      ok: true,
      value: {
        available: false,
        manualEditorAvailable: false,
        code: "authorization_denied",
      },
    } as const;
    const unauthorizedActors = [
      { userId: salesId, role: "product_editor" },
      { userId: reviewerId, role: "product_editor" },
      { userId: reviewerId, role: "reviewer_publisher" },
      { userId: analystId, role: "analyst" },
      { userId: inactiveEditorId, role: "product_editor" },
      { userId: productEditorId, role: "content_editor" },
      { userId: "bbbbbbbb-1111-4111-8111-111111111111", role: "product_editor" },
      { userId: "not-a-uuid", role: "product_editor" },
    ] satisfies readonly Inspection["actor"][];

    for (const actor of unauthorizedActors) {
      expect(await inspect(actor), `${actor.userId}:${actor.role}: existing`).toEqual(denied);
      expect(await inspect(actor, missingTarget), `${actor.userId}:${actor.role}: missing`).toEqual(denied);
    }

    await database.db.insert(featureFlags).values({ key: "ai", enabled: false });
    await database.db.insert(aiModelConfig).values({
      useCase: "product_description_draft",
      provider: "synthetic_unregistered",
      model: "synthetic-unregistered-v1",
      parametersJson: {},
      promptId: "product-description-draft",
      promptVersion: 1,
      promptHash: "a".repeat(64),
      enabled: true,
      isDefault: true,
      createdByUserId: adminId,
      updatedByUserId: adminId,
    });
    const beforeRuns = await database.db.select({ value: count() }).from(aiRuns);
    const beforeAudits = await database.db.select({ value: count() }).from(auditLogs);
    expect(await inspect({ userId: salesId, role: "product_editor" })).toEqual(denied);
    await database.db.update(featureFlags).set({ enabled: true }).where(eq(featureFlags.key, "ai"));
    expect(await inspect({ userId: salesId, role: "product_editor" })).toEqual(denied);
    await database.db.delete(aiModelConfig);
    expect(await inspect({ userId: salesId, role: "product_editor" })).toEqual(denied);
    expect(await database.db.select({ value: count() }).from(aiRuns)).toEqual(beforeRuns);
    expect(await database.db.select({ value: count() }).from(auditLogs)).toEqual(beforeAudits);
  });
});
