import { and, eq } from "drizzle-orm";
import sharp from "sharp";
import writeExcelFile from "write-excel-file/node";
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  applicationLocalizations,
  applications,
  authSessions,
  editorialRevisions,
  featureFlags,
  productApplications,
  productAssets,
  productFaqs,
  productFeatures,
  productImportItems,
  products,
  productTagAssignments,
  productTags,
  productTaxonomyTerms,
  taxonomyTermLocalizations,
  taxonomyTerms,
  users,
} from "@/db/schema";
import { createTestDatabase } from "@/test/database";
import { InMemoryObjectStorage } from "@/test/in-memory-storage";
import {
  createProductDraft,
  updateProductStructure,
} from "@/catalog/product-service";
import {
  completeAdminUploadIntent,
  createAdminUploadBatch,
  createProductImportUploadBatch,
  finalizeAdminUploadBatch,
  IMPORT_WORKBOOK_MIME,
  type AdminUploadActor,
} from "@/uploads/admin-upload-service";
import { DevelopmentFileScanner } from "@/uploads/scanner";

import { PRODUCT_IMPORT_HEADERS, PRODUCT_IMPORT_TEMPLATE_NAME } from "./contract";
import { applyProductImportBatch, prepareProductImportBatch, validatePreparedProductImport } from "./service";

const allowLimiter = {
  consume: async () => ({ kind: "allowed" as const, remaining: 29, retryAfterMs: 60_000 }),
};

async function workbook(row: string[]): Promise<Uint8Array> {
  const file = writeExcelFile([
    { sheet: "Products", data: [[...PRODUCT_IMPORT_HEADERS], row] },
    { sheet: "_CWT_META", data: [["contract", PRODUCT_IMPORT_TEMPLATE_NAME], ["version", 1]] },
  ]);
  return new Uint8Array(await file.toBuffer());
}

describe("Product Import Update patch semantics", () => {
  it("preserves omitted structure, adds media deterministically, and keeps Published changes in one pending Revision", async () => {
    const connection = await createTestDatabase();
    const storage = new InMemoryObjectStorage();
    try {
      const [user] = await connection.db.insert(users).values({
        email: "stage3-update-patch@example.test",
        displayName: "Synthetic Update Patch Editor",
        role: "product_editor",
        passwordHash: "test",
      }).returning({ id: users.id, role: users.role });
      const [session] = await connection.db.insert(authSessions).values({
        userId: user!.id,
        tokenHash: "stage3-update-patch-session",
        expiresAt: new Date(Date.now() + 120_000),
      }).returning({ id: authSessions.id });
      await connection.db.insert(featureFlags).values({ key: "product_import", enabled: true, updatedByUserId: user!.id })
        .onConflictDoUpdate({ target: featureFlags.key, set: { enabled: true } });
      const actor: AdminUploadActor = { userId: user!.id, role: user!.role, authSessionId: session!.id };
      const productActor = { userId: user!.id, role: user!.role } as const;

      const categoryRows = await connection.db.insert(taxonomyTerms).values([
        { internalKey: "synthetic-patch-primary", dimension: "structure_construction", productCodePrefix: "PATCH" },
        { internalKey: "synthetic-patch-additional", dimension: "material_fiber" },
        { internalKey: "synthetic-patch-next", dimension: "structure_construction" },
      ]).returning({ id: taxonomyTerms.id });
      await connection.db.insert(taxonomyTermLocalizations).values([
        { taxonomyTermId: categoryRows[0]!.id, locale: "en", name: "Synthetic Patch Primary" },
        { taxonomyTermId: categoryRows[1]!.id, locale: "en", name: "Synthetic Patch Additional" },
        { taxonomyTermId: categoryRows[2]!.id, locale: "en", name: "Synthetic Patch Next" },
      ]);
      const applicationRows = await connection.db.insert(applications).values([
        { internalKey: "synthetic-patch-existing", createdByUserId: user!.id },
        { internalKey: "synthetic-patch-next", createdByUserId: user!.id },
      ]).returning({ id: applications.id });
      await connection.db.insert(applicationLocalizations).values([
        { applicationId: applicationRows[0]!.id, locale: "en", name: "Synthetic Existing Application" },
        { applicationId: applicationRows[1]!.id, locale: "en", name: "Synthetic Next Application" },
      ]);

      const imageBytes = await Promise.all(["teal", "navy", "orange", "purple"].map(async (background) =>
        new Uint8Array(await sharp({ create: { width: 32, height: 24, channels: 3, background } }).webp().toBuffer()),
      ));
      const imageUpload = await createAdminUploadBatch(connection.db, actor, {
        files: imageBytes.slice(0, 2).map((bytes, index) => ({ fileName: `CWT-PATCH-001-${String(index + 1).padStart(2, "0")}.webp`, declaredMimeType: "image/webp", declaredByteSize: bytes.byteLength })),
        category: "product", role: "gallery", sortOrder: 0,
        associationType: null, associationEntityId: null,
        sourceDeclarationEnabled: false,
      }, { rateLimiter: allowLimiter });
      const imageIds: string[] = [];
      for (const [index, bytes] of imageBytes.slice(0, 2).entries()) imageIds.push(await completeAdminUploadIntent(
        connection.db, storage, new DevelopmentFileScanner(), actor,
        { token: imageUpload.intents[index]!.token, bytes }, { rateLimiter: allowLimiter },
      ));
      await finalizeAdminUploadBatch(connection.db, storage, actor, imageUpload.batchId, { rateLimiter: allowLimiter });

      const productId = await createProductDraft(connection.db, productActor, {
        name: "Synthetic Patch Product",
        primaryTaxonomyTermId: categoryRows[0]!.id,
        assetIds: imageIds.slice(0, 2),
        productCode: "CWT-PATCH-001",
      });
      await updateProductStructure(connection.db, productActor, productId, {
        primaryTaxonomyTermId: categoryRows[0]!.id,
        additionalTaxonomyTermIds: [categoryRows[1]!.id],
        applicationIds: [applicationRows[0]!.id],
        tagNames: ["Existing Patch Tag"],
        assetIds: imageIds.slice(0, 2),
        heroAssetId: imageIds[0]!,
        media: [
          { assetId: imageIds[0]!, role: "hero", sortOrder: 0, altText: "Existing hero", caption: null, isVisible: true },
          { assetId: imageIds[1]!, role: "gallery", sortOrder: 7, altText: "Existing gallery", caption: "Existing caption", isVisible: false },
        ],
        features: ["Existing feature"],
        faqs: [{ question: "Existing question?", answer: "Existing answer." }],
        colorOptionsDisplay: "show",
        customAvailableDisplay: "hide",
        sampleAvailableDisplay: "show",
        moqNoteDisplay: "inherit",
      });

      const update = Array(PRODUCT_IMPORT_HEADERS.length).fill("");
      update[1] = "CWT-PATCH-001";
      update[2] = "Synthetic Patch Next";
      update[4] = "Synthetic Next Application";
      update[15] = "CWT-PATCH-001-03.webp";
      const workbookBytes = await workbook(update);
      const workbookUpload = await createAdminUploadBatch(connection.db, actor, {
        files: [{ fileName: "CWT-Product-Import-Template-V1.xlsx", declaredMimeType: IMPORT_WORKBOOK_MIME, declaredByteSize: workbookBytes.byteLength }],
        category: "other", role: "document", sortOrder: 0,
        associationType: null, associationEntityId: null, sourceDeclarationEnabled: false,
      }, { rateLimiter: allowLimiter });
      const workbookId = await completeAdminUploadIntent(connection.db, storage, new DevelopmentFileScanner(), actor, { token: workbookUpload.intents[0]!.token, bytes: workbookBytes }, { rateLimiter: allowLimiter });
      await finalizeAdminUploadBatch(connection.db, storage, actor, workbookUpload.batchId, { rateLimiter: allowLimiter });
      const batchId = await prepareProductImportBatch(connection.db, actor, {
        mode: "update", workbookAssetId: workbookId, preparation: { kind: "folder", files: [{
          relativePath: "CWT-PATCH-001-03.webp", fileName: "CWT-PATCH-001-03.webp", declaredMimeType: "image/webp", declaredByteSize: imageBytes[2]!.byteLength,
        }] },
      });
      const updateImageUpload = await createProductImportUploadBatch(connection.db, actor, {
        productImportBatchId: batchId, kind: "folder_media", relativePath: "CWT-PATCH-001-03.webp", fileName: "CWT-PATCH-001-03.webp", declaredMimeType: "image/webp", declaredByteSize: imageBytes[2]!.byteLength,
      }, { rateLimiter: allowLimiter });
      imageIds.push(await completeAdminUploadIntent(connection.db, storage, new DevelopmentFileScanner(), actor, { token: updateImageUpload.intents[0]!.token, bytes: imageBytes[2]! }, { rateLimiter: allowLimiter }));
      await finalizeAdminUploadBatch(connection.db, storage, actor, updateImageUpload.batchId, { rateLimiter: allowLimiter });
      await validatePreparedProductImport(connection.db, storage, actor, batchId);
      const preview = (await connection.db.select().from(productImportItems).where(and(eq(productImportItems.batchId, batchId), eq(productImportItems.kind, "row"))))[0]!;
      expect(preview).toMatchObject({ status: "valid", errorCode: null, errorDetail: null });
      expect(preview.normalizedData).toMatchObject({ media: [{ assetId: imageIds[2], role: "gallery", sortOrder: 8 }] });

      await Promise.all([
        applyProductImportBatch(connection.db, actor, batchId),
        applyProductImportBatch(connection.db, actor, batchId),
      ]);
      const draftMedia = await connection.db.select().from(productAssets).where(eq(productAssets.productId, productId)).orderBy(productAssets.sortOrder);
      expect(draftMedia).toHaveLength(3);
      expect(draftMedia.find((entry) => entry.assetId === imageIds[0])).toMatchObject({ role: "hero", sortOrder: 0, isVisible: true });
      expect(draftMedia.find((entry) => entry.assetId === imageIds[1])).toMatchObject({ role: "gallery", sortOrder: 7, isVisible: false });
      expect(draftMedia.find((entry) => entry.assetId === imageIds[2])).toMatchObject({ role: "gallery", sortOrder: 8, isVisible: true });
      expect(await connection.db.select().from(productFeatures).where(eq(productFeatures.productId, productId))).toMatchObject([{ label: "Existing feature" }]);
      expect(await connection.db.select().from(productFaqs).where(eq(productFaqs.productId, productId))).toMatchObject([{ question: "Existing question?", answer: "Existing answer." }]);
      expect((await connection.db.select().from(products).where(eq(products.id, productId)))[0]).toMatchObject({ colorOptionsDisplay: "show", customAvailableDisplay: "hide", sampleAvailableDisplay: "show", moqNoteDisplay: "inherit" });
      expect((await connection.db.select().from(productTaxonomyTerms).where(and(eq(productTaxonomyTerms.productId, productId), eq(productTaxonomyTerms.isPrimary, true))))[0]?.taxonomyTermId).toBe(categoryRows[2]!.id);
      expect((await connection.db.select().from(productApplications).where(eq(productApplications.productId, productId))).map((entry) => entry.applicationId)).toEqual([applicationRows[1]!.id]);
      const tagsAfterDraft = await connection.db.select({ name: productTags.name }).from(productTagAssignments).innerJoin(productTags, eq(productTags.id, productTagAssignments.tagId)).where(eq(productTagAssignments.productId, productId));
      expect(tagsAfterDraft.map((entry) => entry.name)).toEqual(["Existing Patch Tag"]);

      await connection.db.update(products).set({ status: "published", publishedAt: new Date() }).where(eq(products.id, productId));
      const publishedUpdate = Array(PRODUCT_IMPORT_HEADERS.length).fill("");
      publishedUpdate[1] = "CWT-PATCH-001";
      publishedUpdate[13] = "Synthetic pending summary";
      publishedUpdate[15] = "CWT-PATCH-001-04.webp";
      const publishedWorkbook = await workbook(publishedUpdate);
      const publishedWorkbookUpload = await createAdminUploadBatch(connection.db, actor, {
        files: [{ fileName: "CWT-Product-Import-Template-V1.xlsx", declaredMimeType: IMPORT_WORKBOOK_MIME, declaredByteSize: publishedWorkbook.byteLength }],
        category: "other", role: "document", sortOrder: 0,
        associationType: null, associationEntityId: null, sourceDeclarationEnabled: false,
      }, { rateLimiter: allowLimiter });
      const publishedWorkbookId = await completeAdminUploadIntent(connection.db, storage, new DevelopmentFileScanner(), actor, { token: publishedWorkbookUpload.intents[0]!.token, bytes: publishedWorkbook }, { rateLimiter: allowLimiter });
      await finalizeAdminUploadBatch(connection.db, storage, actor, publishedWorkbookUpload.batchId, { rateLimiter: allowLimiter });
      const publishedBatchId = await prepareProductImportBatch(connection.db, actor, {
        mode: "update", workbookAssetId: publishedWorkbookId, preparation: { kind: "folder", files: [{
          relativePath: "CWT-PATCH-001-04.webp", fileName: "CWT-PATCH-001-04.webp", declaredMimeType: "image/webp", declaredByteSize: imageBytes[3]!.byteLength,
        }] },
      });
      const publishedImageUpload = await createProductImportUploadBatch(connection.db, actor, {
        productImportBatchId: publishedBatchId, kind: "folder_media", relativePath: "CWT-PATCH-001-04.webp", fileName: "CWT-PATCH-001-04.webp", declaredMimeType: "image/webp", declaredByteSize: imageBytes[3]!.byteLength,
      }, { rateLimiter: allowLimiter });
      imageIds.push(await completeAdminUploadIntent(connection.db, storage, new DevelopmentFileScanner(), actor, { token: publishedImageUpload.intents[0]!.token, bytes: imageBytes[3]! }, { rateLimiter: allowLimiter }));
      await finalizeAdminUploadBatch(connection.db, storage, actor, publishedImageUpload.batchId, { rateLimiter: allowLimiter });
      await validatePreparedProductImport(connection.db, storage, actor, publishedBatchId);
      await applyProductImportBatch(connection.db, actor, publishedBatchId);
      expect(await connection.db.select().from(productAssets).where(eq(productAssets.productId, productId))).toHaveLength(3);
      const revisions = await connection.db.select().from(editorialRevisions).where(and(
        eq(editorialRevisions.entityType, "product"), eq(editorialRevisions.entityId, productId), eq(editorialRevisions.status, "draft"),
      ));
      expect(revisions).toHaveLength(1);
      const revision = JSON.stringify(revisions[0]!.snapshot);
      expect(revision).toContain("Synthetic pending summary");
      expect(revision).toContain(imageIds[3]!);
      expect(revision).toContain("Existing feature");
      expect(revision).toContain("Existing question?");
      expect(revision).toContain('"colorOptionsDisplay":"show"');
      expect(await connection.db.select().from(productAssets).where(and(eq(productAssets.productId, productId), eq(productAssets.assetId, imageIds[3]!)))).toHaveLength(0);
    } finally {
      await connection.close();
    }
  });
});
