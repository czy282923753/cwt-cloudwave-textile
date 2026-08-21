import { randomUUID } from "node:crypto";

import { and, eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres, { type Sql } from "postgres";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { prepareDraftAssociationV1 } from "@/ai/applications/draft-assistance/association";
import type { DraftAssistanceCommandV1 } from "@/ai/applications/draft-assistance/contracts";
import { withReadOnlyDraftAvailabilityScope } from "@/ai/applications/draft-assistance/read-scopes";
import type { CoreAiActorV1 } from "@/ai/core/contracts";
import type { ProductContextField } from "@/ai/context/contracts";
import type { DatabaseConnection, PostgresAppDatabase } from "@/db/client";
import { migrateDatabase } from "@/db/migrate";
import {
  assets,
  editorialRevisions,
  productAssets,
  productFieldReviews,
  productLocalizations,
  productTaxonomyTerms,
  products,
  taxonomyTermLocalizations,
  taxonomyTerms,
  users,
} from "@/db/schema";
import * as schema from "@/db/schema";

import { createProductAiDraftReaderV1 } from "./product-ai-context-reader";

const postgresUrl = process.env.CWT_PHASE_C_POSTGRES_URL;
const actorId = "10000000-0000-4000-8000-000000000001";
const productId = "10000000-0000-4000-8000-000000000002";
const revisionId = "10000000-0000-4000-8000-000000000003";
const mediaId = "10000000-0000-4000-8000-000000000004";
const otherMediaId = "10000000-0000-4000-8000-000000000005";
const categoryId = "10000000-0000-4000-8000-000000000006";
const missingDraftVersionRevisionId = "10000000-0000-4000-8000-000000000007";

let client: Sql | undefined;
let database: PostgresAppDatabase | undefined;

function db(): PostgresAppDatabase {
  if (database === undefined) throw new Error("Product reader PostgreSQL fixture is unavailable.");
  return database;
}

const actor: CoreAiActorV1 = { principalId: actorId, roleKey: "product_editor" };

function productCommand(
  target: DraftAssistanceCommandV1["target"] = {
    type: "product_draft",
    productId,
    locale: "en",
    expectedVersion: 7,
  },
  selectedMediaPlacementIds: readonly string[] = [],
): DraftAssistanceCommandV1 {
  return {
    useCase: "product_description_draft",
    task: {
      kind: "product_description_draft",
      tone: "concise_professional_b2b",
      selectedMediaPlacementIds,
    },
    actor: { userId: actorId, role: "product_editor" },
    target,
    idempotencyKey: randomUUID(),
    contextSelections: [],
  };
}

function seoProductCommand(target: DraftAssistanceCommandV1["target"]): DraftAssistanceCommandV1 {
  return {
    useCase: "seo_content_draft",
    task: {
      kind: "seo_content_draft",
      tone: "concise_professional_b2b",
      pageIntent: "Synthetic Product Revision SEO intent",
      selectedInternalLinkIds: [],
    },
    actor: { userId: actorId, role: "product_editor" },
    target,
    idempotencyKey: randomUUID(),
    contextSelections: [],
  };
}

describe.skipIf(postgresUrl === undefined)("ProductAiDraftReaderV1 on PostgreSQL", () => {
  const reader = createProductAiDraftReaderV1();

  async function readProductFields(
    command: DraftAssistanceCommandV1,
    fields: readonly ProductContextField[],
  ) {
    const association = prepareDraftAssociationV1(command.target);
    if (!association.ok) throw new Error("Product association fixture failed.");
    return withReadOnlyDraftAvailabilityScope(db(), async (scope) => {
      const target = await reader.readTargetSnapshot({
        scope,
        actor,
        command,
        association: association.value,
      });
      return target.ok
        ? reader.readSelectedStructuredContext({
            scope,
            actor,
            command,
            target: target.value,
            selector: { sourceClass: "product_structured", sourceId: productId, fields },
          })
        : target;
    });
  }

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
    await db().execute(sql`truncate table ${editorialRevisions}, ${productAssets}, ${assets}, ${productFieldReviews}, ${productLocalizations}, ${productTaxonomyTerms}, ${products}, ${taxonomyTermLocalizations}, ${taxonomyTerms}, ${users} cascade`);
    await db().insert(users).values({
      id: actorId,
      email: "synthetic-product-reader@example.invalid",
      displayName: "Synthetic Product Reader",
      role: "product_editor",
      passwordHash: "synthetic-not-a-password",
    });
    await db().insert(taxonomyTerms).values({
      id: categoryId,
      internalKey: "synthetic-product-reader-category",
      dimension: "material_fiber",
    });
    await db().insert(taxonomyTermLocalizations).values({
      taxonomyTermId: categoryId,
      locale: "en",
      name: "Synthetic Primary Category",
    });
    await db().transaction(async (transaction) => {
      await transaction.insert(products).values({
        id: productId,
        status: "draft",
        productCode: "SYNTHETIC-FORBIDDEN-PRODUCT-CODE",
        composition: "SYNTHETIC 100% test fiber",
        weightGsm: "180",
        widthCm: "150",
        moqValue: "500",
        moqUnit: "kg",
        fabricStyle: "Synthetic plain weave",
        colorOptions: "Synthetic blue",
        moqNote: "Synthetic MOQ note",
        customAvailable: "yes",
        sampleAvailable: "no",
        createdByUserId: actorId,
      });
      await transaction.insert(productLocalizations).values({
        productId,
        locale: "en",
        name: "Synthetic Product Reader Target",
        editorDocumentVersion: 7,
      });
      await transaction.insert(productTaxonomyTerms).values({
        productId,
        taxonomyTermId: categoryId,
        isPrimary: true,
      });
    });
    await db().insert(productFieldReviews).values([
      { productId, fieldName: "composition", verificationStatus: "provided" },
      { productId, fieldName: "weightGsm", verificationStatus: "verified" },
      { productId, fieldName: "widthCm", verificationStatus: "provided" },
      { productId, fieldName: "moqValue", verificationStatus: "verified" },
      { productId, fieldName: "moqUnit", verificationStatus: "verified" },
    ]);
    await db().insert(editorialRevisions).values({
      id: revisionId,
      entityType: "product",
      entityId: productId,
      locale: "en",
      versionNumber: 91,
      status: "draft",
      snapshot: {
        kind: "editorial_blocks",
        name: "Synthetic Product Revision",
        shortDescription: null,
        document: { version: 1, blocks: [] },
        expectedEditorDocumentVersion: 7,
        draftVersion: 3,
        pendingChanges: [],
      },
      createdByUserId: actorId,
    });
    await db().insert(editorialRevisions).values({
      id: missingDraftVersionRevisionId,
      entityType: "product",
      entityId: productId,
      locale: "en",
      versionNumber: 1,
      status: "draft",
      snapshot: {
        kind: "editorial_blocks",
        name: "Synthetic Invalid Product Revision",
        shortDescription: null,
        document: { version: 1, blocks: [] },
        expectedEditorDocumentVersion: 7,
        pendingChanges: [],
      },
      createdByUserId: actorId,
    });
    await db().insert(assets).values([
      {
        id: mediaId,
        uploadedByUserId: actorId,
        originalFileName: "SYNTHETIC-PRIVATE-NAME.png",
        storageProvider: "synthetic-private-provider",
        storagePartition: "private",
        objectKey: "SYNTHETIC-PRIVATE-OBJECT-KEY",
        access: "private",
        category: "product",
        status: "ready",
        declaredMimeType: "image/png",
        detectedMimeType: "image/png",
        byteSize: 4,
        sha256: "a".repeat(64),
        scanStatus: "passed",
      },
      {
        id: otherMediaId,
        uploadedByUserId: actorId,
        originalFileName: "SYNTHETIC-UNRELATED.png",
        storageProvider: "synthetic-private-provider",
        storagePartition: "private",
        objectKey: "SYNTHETIC-UNRELATED-OBJECT-KEY",
        access: "private",
        category: "product",
        status: "ready",
        declaredMimeType: "image/png",
        detectedMimeType: "image/png",
        byteSize: 4,
        sha256: "b".repeat(64),
        scanStatus: "passed",
      },
    ]);
    await db().insert(productAssets).values({
      productId,
      assetId: mediaId,
      role: "gallery",
      isVisible: true,
    });
  });

  afterAll(async () => {
    await client?.end();
  });

  it("uses editor_document_version for a direct Draft and snapshot draftVersion for a Revision", async () => {
    const directCommand = productCommand();
    const directAssociation = prepareDraftAssociationV1(directCommand.target);
    if (!directAssociation.ok) throw new Error("Direct association fixture failed.");
    const direct = await withReadOnlyDraftAvailabilityScope(db(), (scope) =>
      reader.readTargetSnapshot({ scope, actor, command: directCommand, association: directAssociation.value }));
    expect(direct).toMatchObject({ ok: true, value: { editVersion: 7, revisionId: null } });

    const revisionCommand = productCommand({
      type: "editorial_revision",
      revisionId,
      expectedVersion: 3,
    });
    const revisionAssociation = prepareDraftAssociationV1(revisionCommand.target);
    if (!revisionAssociation.ok) throw new Error("Revision association fixture failed.");
    const revision = await withReadOnlyDraftAvailabilityScope(db(), (scope) =>
      reader.readTargetSnapshot({ scope, actor, command: revisionCommand, association: revisionAssociation.value }));
    expect(revision).toMatchObject({ ok: true, value: { editVersion: 3, revisionId } });

    const lineageCommand = productCommand({
      type: "editorial_revision",
      revisionId,
      expectedVersion: 91,
    });
    const lineageAssociation = prepareDraftAssociationV1(lineageCommand.target);
    if (!lineageAssociation.ok) throw new Error("Lineage association fixture failed.");
    const lineage = await withReadOnlyDraftAvailabilityScope(db(), (scope) =>
      reader.readTargetSnapshot({ scope, actor, command: lineageCommand, association: lineageAssociation.value }));
    expect(lineage).toMatchObject({ ok: false, error: { code: "target_version_conflict" } });

    const missingVersionCommand = productCommand({
      type: "editorial_revision",
      revisionId: missingDraftVersionRevisionId,
      expectedVersion: 1,
    });
    const missingVersionAssociation = prepareDraftAssociationV1(missingVersionCommand.target);
    if (!missingVersionAssociation.ok) throw new Error("Missing-version association fixture failed.");
    const missingVersion = await withReadOnlyDraftAvailabilityScope(db(), (scope) =>
      reader.readTargetSnapshot({
        scope,
        actor,
        command: missingVersionCommand,
        association: missingVersionAssociation.value,
      }));
    expect(missingVersion).toMatchObject({
      ok: false,
      error: { code: "context_provenance_mismatch" },
    });
  });

  it("uses the exact Product Revision snapshot name after live localization drift", async () => {
    await db().update(productLocalizations).set({ name: "SYNTHETIC DRIFTED LIVE NAME" })
      .where(eq(productLocalizations.productId, productId));
    const revisionTarget = { type: "editorial_revision" as const, revisionId, expectedVersion: 3 };
    const revisionContext = await readProductFields(productCommand(revisionTarget), ["name"]);
    expect(revisionContext).toMatchObject({
      ok: true,
      value: {
        recordVersion: 3,
        fields: [{ field: "name", provenance: "structural", value: "Synthetic Product Revision" }],
      },
    });
    expect(JSON.stringify(revisionContext)).not.toContain("SYNTHETIC DRIFTED LIVE NAME");

    const seoRevisionContext = await readProductFields(seoProductCommand(revisionTarget), ["name"]);
    expect(seoRevisionContext).toMatchObject({
      ok: true,
      value: {
        targetBinding: { revisionEntityType: "product", authoritativeRevisionVersion: 3 },
        fields: [{ field: "name", value: "Synthetic Product Revision" }],
      },
    });
  });

  it("enforces the accepted Product fact provenance matrix", async () => {
    const accepted = await readProductFields(productCommand(), [
      "composition", "weightGsm", "widthCm", "moqPair",
    ]);
    expect(accepted).toMatchObject({
      ok: true,
      value: { fields: [
        { field: "composition", provenance: "provided", value: "SYNTHETIC 100% test fiber" },
        { field: "weightGsm", provenance: "verified", value: "180" },
        { field: "widthCm", provenance: "provided", value: "150" },
        { field: "moqPair", provenance: "verified", value: { moqValue: "500", moqUnit: "kg" } },
      ] },
    });

    await db().update(productFieldReviews).set({ verificationStatus: "provided" }).where(and(
      eq(productFieldReviews.productId, productId),
      eq(productFieldReviews.fieldName, "moqUnit"),
    ));
    expect(await readProductFields(productCommand(), ["moqPair"])).toMatchObject({
      ok: true,
      value: { fields: [{ field: "moqPair", provenance: "provided" }] },
    });

    await db().update(productFieldReviews).set({ verificationStatus: "rejected" }).where(and(
      eq(productFieldReviews.productId, productId),
      eq(productFieldReviews.fieldName, "composition"),
    ));
    expect(await readProductFields(productCommand(), ["composition"]))
      .toMatchObject({ ok: false, error: { code: "context_field_ineligible" } });
    await db().update(productFieldReviews).set({ verificationStatus: "provided" }).where(and(
      eq(productFieldReviews.productId, productId),
      eq(productFieldReviews.fieldName, "composition"),
    ));

    await db().delete(productFieldReviews).where(and(
      eq(productFieldReviews.productId, productId),
      eq(productFieldReviews.fieldName, "weightGsm"),
    ));
    expect(await readProductFields(productCommand(), ["weightGsm"]))
      .toMatchObject({ ok: false, error: { code: "context_field_ineligible" } });

    await db().update(productFieldReviews).set({ verificationStatus: "empty" }).where(and(
      eq(productFieldReviews.productId, productId),
      eq(productFieldReviews.fieldName, "widthCm"),
    ));
    expect(await readProductFields(productCommand(), ["widthCm"]))
      .toMatchObject({ ok: false, error: { code: "context_field_ineligible" } });

    await db().update(products).set({ composition: null }).where(eq(products.id, productId));
    expect(await readProductFields(productCommand(), ["composition"]))
      .toMatchObject({ ok: false, error: { code: "context_field_ineligible" } });

    await db().update(productFieldReviews).set({ verificationStatus: "rejected" }).where(and(
      eq(productFieldReviews.productId, productId),
      eq(productFieldReviews.fieldName, "moqUnit"),
    ));
    expect(await readProductFields(productCommand(), ["moqPair"]))
      .toMatchObject({ ok: false, error: { code: "context_field_ineligible" } });

    await expect(db().update(products).set({ moqUnit: null }).where(eq(products.id, productId)))
      .rejects.toThrow();
    await expect(db().update(products).set({ moqUnit: "invalid" }).where(eq(products.id, productId)))
      .rejects.toThrow();
  });

  it("keeps structural and supplied-only Product fields at their accepted provenance", async () => {
    expect(await readProductFields(productCommand(), [
      "name", "primaryCategoryLabel", "fabricStyle", "colorOptions", "moqNote",
      "customAvailable", "sampleAvailable",
    ])).toMatchObject({
      ok: true,
      value: { fields: [
        { field: "name", provenance: "structural" },
        { field: "primaryCategoryLabel", provenance: "structural" },
        { field: "fabricStyle", provenance: "provided" },
        { field: "colorOptions", provenance: "provided" },
        { field: "moqNote", provenance: "provided" },
        { field: "customAvailable", provenance: "provided", value: "yes" },
        { field: "sampleAvailable", provenance: "provided", value: "no" },
      ] },
    });
    await db().update(products).set({ fabricStyle: "   ", customAvailable: "unknown" })
      .where(eq(products.id, productId));
    expect(await readProductFields(productCommand(), ["fabricStyle"]))
      .toMatchObject({ ok: false, error: { code: "context_field_ineligible" } });
    expect(await readProductFields(productCommand(), ["customAvailable"]))
      .toMatchObject({ ok: false, error: { code: "context_field_ineligible" } });
  });

  it("returns only closed Product fields and stable opaque media aliases", async () => {
    const command = productCommand(undefined, [mediaId]);
    const association = prepareDraftAssociationV1(command.target);
    if (!association.ok) throw new Error("Product association fixture failed.");
    const result = await withReadOnlyDraftAvailabilityScope(db(), async (scope) => {
      const target = await reader.readTargetSnapshot({ scope, actor, command, association: association.value });
      if (!target.ok) return target;
      const context = await reader.readSelectedStructuredContext({
        scope,
        actor,
        command,
        target: target.value,
        selector: {
          sourceClass: "product_structured",
          sourceId: productId,
          fields: ["name", "composition"],
        },
      });
      if (!context.ok) return context;
      const media = await reader.readSelectedMediaPlacements({
        scope,
        actor,
        command,
        target: target.value,
        selectedPlacementIds: [mediaId],
      });
      return { ok: true as const, value: { context: context.value, media: media.ok ? media.value : media } };
    });
    expect(result).toMatchObject({
      ok: true,
      value: {
        context: { fields: [{ field: "name" }, { field: "composition" }] },
        media: [{ placementRef: "media_01" }],
      },
    });
    const serialized = JSON.stringify(result);
    expect(serialized).not.toContain("SYNTHETIC-FORBIDDEN-PRODUCT-CODE");
    expect(serialized).not.toContain("SYNTHETIC-PRIVATE-OBJECT-KEY");
    expect(serialized).not.toContain(mediaId);
  });

  it("fails closed for authorization loss, unrelated media and a target version race", async () => {
    const command = productCommand(undefined, [otherMediaId]);
    const association = prepareDraftAssociationV1(command.target);
    if (!association.ok) throw new Error("Product association fixture failed.");
    const unrelated = await withReadOnlyDraftAvailabilityScope(db(), async (scope) => {
      const target = await reader.readTargetSnapshot({ scope, actor, command, association: association.value });
      return target.ok
        ? reader.readSelectedMediaPlacements({
            scope,
            actor,
            command,
            target: target.value,
            selectedPlacementIds: [otherMediaId],
          })
        : target;
    });
    expect(unrelated).toMatchObject({ ok: false, error: { code: "context_record_unauthorized" } });

    await db().update(productLocalizations).set({ editorDocumentVersion: 8 })
      .where(eq(productLocalizations.productId, productId));
    const raced = await withReadOnlyDraftAvailabilityScope(db(), (scope) =>
      reader.readTargetSnapshot({ scope, actor, command, association: association.value }));
    expect(raced).toMatchObject({ ok: false, error: { code: "target_version_conflict" } });

    await db().update(users).set({ isActive: false }).where(eq(users.id, actorId));
    const inactive = await withReadOnlyDraftAvailabilityScope(db(), (scope) =>
      reader.readTargetSnapshot({ scope, actor, command, association: association.value }));
    expect(inactive).toMatchObject({ ok: false, error: { code: "authorization_denied" } });
  });
});
