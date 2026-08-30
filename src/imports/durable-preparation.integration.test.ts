import { and, eq } from "drizzle-orm";
import sharp from "sharp";
import writeExcelFile from "write-excel-file/node";
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  assets,
  assetUploadBatches,
  authSessions,
  featureFlags,
  objectCleanupJobs,
  productAssets,
  productImportBatches,
  productImportItems,
  taxonomyTermLocalizations,
  taxonomyTerms,
  uploadRecoveryJobs,
  users,
} from "@/db/schema";
import { createTestDatabase } from "@/test/database";
import { InMemoryObjectStorage } from "@/test/in-memory-storage";
import {
  completeAdminUploadIntent,
  createAdminUploadBatch,
  createProductImportUploadBatch,
  expireRetainedProductImportMedia,
  finalizeAdminUploadBatch,
  IMPORT_WORKBOOK_MIME,
  type AdminUploadActor,
} from "@/uploads/admin-upload-service";
import { DevelopmentFileScanner } from "@/uploads/scanner";

import { PRODUCT_IMPORT_HEADERS, PRODUCT_IMPORT_TEMPLATE_NAME } from "./contract";
import {
  applyProductImportBatch,
  cancelProductImportBatch,
  prepareProductImportBatch,
  validatePreparedProductImport,
} from "./service";

const allowLimiter = {
  consume: async () => ({ kind: "allowed" as const, remaining: 29, retryAfterMs: 60_000 }),
};

async function workbook(): Promise<Uint8Array> {
  const row = Array(PRODUCT_IMPORT_HEADERS.length).fill("");
  row[0] = "Synthetic Durable Preparation Product";
  row[1] = "CWT-DUR-001";
  row[2] = "Synthetic Durable Category";
  const file = writeExcelFile([
    { sheet: "Products", data: [[...PRODUCT_IMPORT_HEADERS], row] },
    { sheet: "_CWT_META", data: [["contract", PRODUCT_IMPORT_TEMPLATE_NAME], ["version", 1]] },
  ]);
  return new Uint8Array(await file.toBuffer());
}

describe("Product Import durable media preparation", () => {
  it("establishes Import authority before Folder media, resumes the same Asset, and cleans cancellation", async () => {
    const connection = await createTestDatabase();
    const storage = new InMemoryObjectStorage();
    try {
      const [user] = await connection.db.insert(users).values({
        email: "stage3-durable-preparation@example.test",
        displayName: "Synthetic Durable Importer",
        role: "product_editor",
        passwordHash: "test",
      }).returning({ id: users.id, role: users.role });
      const [session] = await connection.db.insert(authSessions).values({
        userId: user!.id,
        tokenHash: "stage3-durable-preparation-session",
        expiresAt: new Date(Date.now() + 120_000),
      }).returning({ id: authSessions.id });
      await connection.db.insert(featureFlags).values({ key: "product_import", enabled: true, updatedByUserId: user!.id })
        .onConflictDoUpdate({ target: featureFlags.key, set: { enabled: true } });
      const [category] = await connection.db.insert(taxonomyTerms).values({
        internalKey: "synthetic-durable-category",
        dimension: "structure_construction",
        productCodePrefix: "DUR",
      }).returning({ id: taxonomyTerms.id });
      await connection.db.insert(taxonomyTermLocalizations).values({ taxonomyTermId: category!.id, locale: "en", name: "Synthetic Durable Category" });
      const actor: AdminUploadActor = { userId: user!.id, role: user!.role, authSessionId: session!.id };
      const workbookBytes = await workbook();
      const uploadWorkbook = async () => {
        const issued = await createAdminUploadBatch(connection.db, actor, {
          files: [{ fileName: "CWT-Product-Import-Template-V1.xlsx", declaredMimeType: IMPORT_WORKBOOK_MIME, declaredByteSize: workbookBytes.byteLength }],
          category: "other", role: "document", sortOrder: 0,
          associationType: null, associationEntityId: null, sourceDeclarationEnabled: false,
        }, { rateLimiter: allowLimiter });
        const assetId = await completeAdminUploadIntent(connection.db, storage, new DevelopmentFileScanner(), actor, { token: issued.intents[0]!.token, bytes: workbookBytes }, { rateLimiter: allowLimiter });
        await finalizeAdminUploadBatch(connection.db, storage, actor, issued.batchId, { rateLimiter: allowLimiter });
        return assetId;
      };
      const image = new Uint8Array(await sharp({ create: { width: 40, height: 30, channels: 3, background: "teal" } }).webp().toBuffer());
      const workbookAssetId = await uploadWorkbook();
      const batchId = await prepareProductImportBatch(connection.db, actor, {
        mode: "create",
        workbookAssetId,
        preparation: { kind: "folder", files: [{
          relativePath: "CWT-DUR-001/CWT-DUR-001-01.webp",
          fileName: "CWT-DUR-001-01.webp",
          declaredMimeType: "image/webp",
          declaredByteSize: image.byteLength,
        }] },
      });
      expect((await connection.db.select().from(productImportBatches).where(eq(productImportBatches.id, batchId)))[0]).toMatchObject({ status: "draft" });
      const uploadCommand = {
        productImportBatchId: batchId,
        kind: "folder_media" as const,
        relativePath: "CWT-DUR-001/CWT-DUR-001-01.webp",
        fileName: "CWT-DUR-001-01.webp",
        declaredMimeType: "image/webp",
        declaredByteSize: image.byteLength,
      };
      const [upload, concurrentUpload] = await Promise.all([
        createProductImportUploadBatch(connection.db, actor, uploadCommand, { rateLimiter: allowLimiter }),
        createProductImportUploadBatch(connection.db, actor, uploadCommand, { rateLimiter: allowLimiter }),
      ]);
      expect(concurrentUpload).toEqual(upload);
      const assetId = await completeAdminUploadIntent(connection.db, storage, new DevelopmentFileScanner(), actor, { token: upload.intents[0]!.token, bytes: image }, { rateLimiter: allowLimiter });
      const resumedUpload = await createProductImportUploadBatch(connection.db, actor, uploadCommand, { rateLimiter: allowLimiter });
      expect(resumedUpload.batchId).toBe(upload.batchId);
      expect(resumedUpload.intents[0]!.token).toBe(upload.intents[0]!.token);
      expect(await completeAdminUploadIntent(connection.db, storage, new DevelopmentFileScanner(), actor, { token: resumedUpload.intents[0]!.token, bytes: image }, { rateLimiter: allowLimiter })).toBe(assetId);
      const finalized = await finalizeAdminUploadBatch(connection.db, storage, actor, upload.batchId, { rateLimiter: allowLimiter });
      const replay = await finalizeAdminUploadBatch(connection.db, storage, actor, upload.batchId, { rateLimiter: allowLimiter });
      expect(replay.assetIds).toEqual(finalized.assetIds);
      const retained = (await connection.db.select().from(assets).where(eq(assets.id, assetId)))[0]!;
      expect(retained).toMatchObject({ storagePartition: "public", access: "public", status: "ready" });
      expect(retained.retentionExpiresAt).not.toBeNull();
      const item = (await connection.db.select().from(productImportItems).where(and(eq(productImportItems.batchId, batchId), eq(productImportItems.targetAssetId, assetId))))[0]!;
      expect(item).toMatchObject({ uploadBatchId: upload.batchId, status: "valid" });
      const compensation = await connection.db.select().from(objectCleanupJobs).where(and(eq(objectCleanupJobs.uploadBatchId, upload.batchId), eq(objectCleanupJobs.storagePartition, "public")));
      expect(compensation.length).toBeGreaterThan(0);
      expect(compensation.every((job) => job.status === "standby" && job.armedAt === null)).toBe(true);

      await validatePreparedProductImport(connection.db, storage, actor, batchId);
      await applyProductImportBatch(connection.db, actor, batchId);
      expect(await connection.db.select().from(productAssets).where(eq(productAssets.assetId, assetId))).toHaveLength(1);
      expect((await connection.db.select().from(assets).where(eq(assets.id, assetId)))[0]?.retentionExpiresAt).toBeNull();
      expect((await connection.db.select().from(objectCleanupJobs).where(and(eq(objectCleanupJobs.uploadBatchId, upload.batchId), eq(objectCleanupJobs.storagePartition, "public")))).every((job) => job.status === "cancelled")).toBe(true);
      expect(await finalizeAdminUploadBatch(connection.db, storage, actor, upload.batchId, { rateLimiter: allowLimiter })).toMatchObject({ alreadyFinalized: true, assetIds: [assetId] });

      const cancelledWorkbookId = await uploadWorkbook();
      const cancelBatchId = await prepareProductImportBatch(connection.db, actor, {
        mode: "update",
        workbookAssetId: cancelledWorkbookId,
        preparation: { kind: "folder", files: [{
          relativePath: "unmatched.webp", fileName: "unmatched.webp", declaredMimeType: "image/webp", declaredByteSize: image.byteLength,
        }] },
      });
      const cancelUpload = await createProductImportUploadBatch(connection.db, actor, {
        productImportBatchId: cancelBatchId,
        kind: "folder_media",
        relativePath: "unmatched.webp",
        fileName: "unmatched.webp",
        declaredMimeType: "image/webp",
        declaredByteSize: image.byteLength,
      }, { rateLimiter: allowLimiter });
      const cancelledAssetId = await completeAdminUploadIntent(connection.db, storage, new DevelopmentFileScanner(), actor, { token: cancelUpload.intents[0]!.token, bytes: image }, { rateLimiter: allowLimiter });
      await finalizeAdminUploadBatch(connection.db, storage, actor, cancelUpload.batchId, { rateLimiter: allowLimiter });
      await cancelProductImportBatch(connection.db, storage, actor, cancelBatchId);
      expect((await connection.db.select().from(productImportBatches).where(eq(productImportBatches.id, cancelBatchId)))[0]).toMatchObject({ status: "failed", failureCode: "operator_cancelled" });
      expect((await connection.db.select().from(assets).where(eq(assets.id, cancelledAssetId)))[0]).toMatchObject({ status: "deleted" });
      const cancelledObjects = await connection.db.select().from(objectCleanupJobs).where(and(eq(objectCleanupJobs.uploadBatchId, cancelUpload.batchId), eq(objectCleanupJobs.storagePartition, "public")));
      expect(cancelledObjects.length).toBeGreaterThan(0);
      expect(cancelledObjects.every((job) => job.status === "completed")).toBe(true);
      expect((await connection.db.select().from(assetUploadBatches).where(eq(assetUploadBatches.id, cancelUpload.batchId)))[0]?.failureReason).toMatch(/product_import|compensation/);
      const cancelledWorkbook = (await connection.db.select().from(assets).where(eq(assets.id, cancelledWorkbookId)))[0]!;
      expect(cancelledWorkbook.status).toBe("deleted");
      expect(await storage.exists("imports", cancelledWorkbook.objectKey)).toBe(false);

      const expiryWorkbookId = await uploadWorkbook();
      const expiryBatchId = await prepareProductImportBatch(connection.db, actor, {
        mode: "create",
        workbookAssetId: expiryWorkbookId,
        preparation: { kind: "folder", files: [{
          relativePath: "expiry/retained.webp", fileName: "retained.webp", declaredMimeType: "image/webp", declaredByteSize: image.byteLength,
        }] },
      });
      const expiryUpload = await createProductImportUploadBatch(connection.db, actor, {
        productImportBatchId: expiryBatchId,
        kind: "folder_media",
        relativePath: "expiry/retained.webp",
        fileName: "retained.webp",
        declaredMimeType: "image/webp",
        declaredByteSize: image.byteLength,
      }, { rateLimiter: allowLimiter });
      const expiryAssetId = await completeAdminUploadIntent(connection.db, storage, new DevelopmentFileScanner(), actor, { token: expiryUpload.intents[0]!.token, bytes: image }, { rateLimiter: allowLimiter });
      await finalizeAdminUploadBatch(connection.db, storage, actor, expiryUpload.batchId, { rateLimiter: allowLimiter });
      const expiryAsset = (await connection.db.select().from(assets).where(eq(assets.id, expiryAssetId)))[0]!;
      await connection.db.update(assets).set({ retentionExpiresAt: new Date("2026-01-01T00:00:00Z") }).where(eq(assets.id, expiryAssetId));
      const expiryResult = await expireRetainedProductImportMedia(connection.db, storage, { now: new Date("2026-02-01T00:00:00Z") });
      expect(expiryResult).toMatchObject({ expired: 1, failedBatches: 1, cleanup: { dead: 0 } });
      expect((await connection.db.select().from(productImportBatches).where(eq(productImportBatches.id, expiryBatchId)))[0]).toMatchObject({ status: "failed", failureCode: "preparation_expired" });
      expect((await connection.db.select().from(assets).where(eq(assets.id, expiryAssetId)))[0]).toMatchObject({ status: "deleted" });
      expect(await storage.exists("public", expiryAsset.objectKey)).toBe(false);
      expect((await connection.db.select().from(objectCleanupJobs).where(and(eq(objectCleanupJobs.uploadBatchId, expiryUpload.batchId), eq(objectCleanupJobs.storagePartition, "public")))).every((job) => job.status === "completed")).toBe(true);
      expect((await connection.db.select().from(uploadRecoveryJobs).where(and(eq(uploadRecoveryJobs.uploadBatchId, expiryUpload.batchId), eq(uploadRecoveryJobs.kind, "finalize"))))[0]).toMatchObject({ status: "completed", stage: "failed", lastError: "product_import_media_cleanup_completed" });
    } finally {
      await connection.close();
    }
  });
});
