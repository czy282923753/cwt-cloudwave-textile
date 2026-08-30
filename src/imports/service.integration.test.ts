import { and, eq } from "drizzle-orm";
import { Uint8ArrayReader, Uint8ArrayWriter, ZipReader, ZipWriter } from "@zip.js/zip.js";
import sharp from "sharp";
import writeExcelFile from "write-excel-file/node";
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { assets, authSessions, editorialRevisions, featureFlags, productImportBatches, productImportItems, productLocalizations, products, seoMetadata, taxonomyTermLocalizations, taxonomyTerms, users } from "@/db/schema";
import { createTestDatabase } from "@/test/database";
import { InMemoryObjectStorage } from "@/test/in-memory-storage";
import { completeAdminUploadIntent, createAdminUploadBatch, createProductImportUploadBatch, finalizeAdminUploadBatch, IMPORT_WORKBOOK_MIME, type AdminUploadActor } from "@/uploads/admin-upload-service";
import { DevelopmentFileScanner } from "@/uploads/scanner";

import { PRODUCT_IMPORT_HEADERS, PRODUCT_IMPORT_LIMITS, PRODUCT_IMPORT_TEMPLATE_NAME } from "./contract";
import { applyProductImportBatch, prepareProductImportBatch, validatePreparedProductImport } from "./service";
import { ProductImportWorkbookPackageError } from "./workbook";

const allowLimiter = {
  consume: async () => ({ kind: "allowed" as const, remaining: 29, retryAfterMs: 60_000 }),
};

async function workbook(rows: string[][]): Promise<Uint8Array> {
  const file = writeExcelFile([
    { sheet: "Products", data: [[...PRODUCT_IMPORT_HEADERS], ...rows] },
    { sheet: "_CWT_META", data: [["contract", PRODUCT_IMPORT_TEMPLATE_NAME], ["version", 1]] },
  ]);
  return new Uint8Array(await file.toBuffer());
}

async function rewriteWorkbookXml(bytes: Uint8Array, mutate: (source: string) => string): Promise<Uint8Array> {
  const reader = new ZipReader(new Uint8ArrayReader(bytes), { checkSignature: true });
  const writer = new ZipWriter(new Uint8ArrayWriter());
  try {
    for (const entry of await reader.getEntries()) {
      if (entry.directory) continue;
      const data = await entry.getData(new Uint8ArrayWriter(), { checkSignature: true });
      const next = entry.filename === "xl/workbook.xml"
        ? new TextEncoder().encode(mutate(new TextDecoder().decode(data)))
        : data;
      await writer.add(entry.filename, new Uint8ArrayReader(next));
    }
    return writer.close();
  } finally {
    await reader.close();
  }
}

function withCustomOfficeRelationshipPrefix(bytes: Uint8Array): Promise<Uint8Array> {
  return rewriteWorkbookXml(bytes, (source) => source
    .replace(
      'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"',
      'xmlns:office="http://schemas.openxmlformats.org/officeDocument/2006/relationships"',
    )
    .replaceAll("r:id=", "office:id="));
}

describe("Product Import orchestration", () => {
  it("applies valid Create rows, preserves Row Errors, and does not replay success", async () => {
    const connection = await createTestDatabase();
    const storage = new InMemoryObjectStorage();
    try {
      const [user] = await connection.db.insert(users).values({ email: "stage3-import@example.test", displayName: "Synthetic Import Editor", role: "product_editor", passwordHash: "test" }).returning({ id: users.id, role: users.role });
      const [session] = await connection.db.insert(authSessions).values({ userId: user!.id, tokenHash: "stage3-import-session", expiresAt: new Date(Date.now() + 60_000) }).returning({ id: authSessions.id });
      await connection.db.insert(featureFlags).values({ key: "product_import", enabled: true, updatedByUserId: user!.id }).onConflictDoUpdate({ target: featureFlags.key, set: { enabled: true } });
      const [category] = await connection.db.insert(taxonomyTerms).values({ internalKey: "synthetic-stage3-mesh", dimension: "structure_construction", productCodePrefix: "MESH" }).returning({ id: taxonomyTerms.id });
      await connection.db.insert(taxonomyTermLocalizations).values({ taxonomyTermId: category!.id, locale: "en", name: "Synthetic Mesh" });
      const actor: AdminUploadActor = { userId: user!.id, role: user!.role, authSessionId: session!.id };
      const image = new Uint8Array(await sharp({ create: { width: 24, height: 24, channels: 3, background: "teal" } }).jpeg().toBuffer());
      const secondImage = new Uint8Array(await sharp({ create: { width: 24, height: 24, channels: 3, background: "navy" } }).jpeg().toBuffer());
      const good = Array(PRODUCT_IMPORT_HEADERS.length).fill("");
      good[0] = "Synthetic Stage 3 Mesh Fabric";
      good[1] = "CWT-MESH-001";
      good[2] = "Synthetic Mesh";
      good[6] = "100% Polyester";
      const atomicFailure = Array(PRODUCT_IMPORT_HEADERS.length).fill("");
      atomicFailure[0] = "Synthetic Atomic Rollback";
      atomicFailure[1] = "CWT-MESH-002";
      atomicFailure[2] = "Synthetic Mesh";
      atomicFailure[14] = "This document will be replaced with invalid synthetic test data.";
      const bad = Array(PRODUCT_IMPORT_HEADERS.length).fill("");
      bad[0] = "Synthetic Missing Evidence";
      bad[2] = "Synthetic Mesh";
      const workbookBytes = await withCustomOfficeRelationshipPrefix(await workbook([good, atomicFailure, bad]));
      const packageUpload = await createAdminUploadBatch(connection.db, actor, { files: [{ fileName: "CWT-Product-Import-Template-V1.xlsx", declaredMimeType: IMPORT_WORKBOOK_MIME, declaredByteSize: workbookBytes.byteLength }], category: "other", role: "document", sortOrder: 0, associationType: null, associationEntityId: null, sourceDeclarationEnabled: false }, { rateLimiter: allowLimiter });
      const workbookAssetId = await completeAdminUploadIntent(connection.db, storage, new DevelopmentFileScanner(), actor, { token: packageUpload.intents[0]!.token, bytes: workbookBytes }, { rateLimiter: allowLimiter });
      await finalizeAdminUploadBatch(connection.db, storage, actor, packageUpload.batchId);

      const batchId = await prepareProductImportBatch(connection.db, actor, { mode: "create", workbookAssetId, preparation: { kind: "folder", files: [
        { relativePath: "CWT-MESH-001-01.jpg", fileName: "CWT-MESH-001-01.jpg", declaredMimeType: "image/jpeg", declaredByteSize: image.byteLength },
        { relativePath: "CWT-MESH-002-01.jpg", fileName: "CWT-MESH-002-01.jpg", declaredMimeType: "image/jpeg", declaredByteSize: secondImage.byteLength },
      ] } });
      for (const [fileName, bytes] of [["CWT-MESH-001-01.jpg", image], ["CWT-MESH-002-01.jpg", secondImage]] as const) {
        const imageUpload = await createProductImportUploadBatch(connection.db, actor, {
          productImportBatchId: batchId, kind: "folder_media", relativePath: fileName,
          fileName, declaredMimeType: "image/jpeg", declaredByteSize: bytes.byteLength,
        }, { rateLimiter: allowLimiter });
        await completeAdminUploadIntent(connection.db, storage, new DevelopmentFileScanner(), actor, { token: imageUpload.intents[0]!.token, bytes }, { rateLimiter: allowLimiter });
        await finalizeAdminUploadBatch(connection.db, storage, actor, imageUpload.batchId);
      }
      await validatePreparedProductImport(connection.db, storage, actor, batchId);
      const before = await connection.db.select().from(productImportItems).where(eq(productImportItems.batchId, batchId));
      expect(before.filter((item) => item.kind === "row").sort((a, b) => a.rowNumber! - b.rowNumber!).map((item) => ({ row: item.rowNumber, status: item.status, error: item.errorDetail }))).toEqual([
        { row: 2, status: "valid", error: null },
        { row: 3, status: "valid", error: null },
        { row: 4, status: "error", error: expect.any(String) },
      ]);
      const rollbackItem = before.find((item) => item.rowNumber === 3)!;
      await connection.db.update(productImportItems).set({
        normalizedData: {
          ...(rollbackItem.normalizedData as Record<string, unknown>),
          document: { version: 1, blocks: [{ id: "invalid", type: "unsupported_synthetic_block" }] },
        },
      }).where(eq(productImportItems.id, rollbackItem.id));
      await connection.db.update(productImportBatches).set({ status: "applying", applyStartedAt: new Date() }).where(eq(productImportBatches.id, batchId));
      await applyProductImportBatch(connection.db, actor, batchId);
      const productRows = await connection.db.select().from(products).where(eq(products.productCode, "CWT-MESH-001"));
      expect(productRows).toHaveLength(1);
      expect(productRows[0]?.status).toBe("draft");
      const indexRows = await connection.db.select({ status: seoMetadata.indexStatus }).from(seoMetadata);
      expect(indexRows.map((row) => row.status)).toContain("noindex");
      const items = await connection.db.select().from(productImportItems).where(eq(productImportItems.batchId, batchId));
      expect(items.find((item) => item.rowNumber === 2)).toMatchObject({ status: "applied", targetProductId: productRows[0]!.id });
      expect(items.find((item) => item.rowNumber === 3)?.status).toBe("error");
      expect(await connection.db.select().from(products).where(eq(products.productCode, "CWT-MESH-002"))).toHaveLength(0);
      expect(items.find((item) => item.rowNumber === 4)?.status).toBe("error");
      await expect(applyProductImportBatch(connection.db, actor, batchId)).resolves.toBeUndefined();
      expect(await connection.db.select().from(products).where(eq(products.productCode, "CWT-MESH-001"))).toHaveLength(1);
      expect((await connection.db.select().from(assets).where(and(eq(assets.id, workbookAssetId), eq(assets.storagePartition, "imports"))))).toHaveLength(1);

      await connection.db.update(products).set({ status: "published" }).where(eq(products.id, productRows[0]!.id));
      const publicBefore = (await connection.db.select().from(productLocalizations).where(eq(productLocalizations.productId, productRows[0]!.id)).limit(1))[0]!;
      const update = Array(PRODUCT_IMPORT_HEADERS.length).fill("");
      update[1] = "CWT-MESH-001";
      update[13] = "Synthetic pending summary from Update import.";
      const updateWorkbookBytes = await workbook([update]);
      const updatePackage = await createAdminUploadBatch(connection.db, actor, { files: [{ fileName: "CWT-Product-Import-Template-V1.xlsx", declaredMimeType: IMPORT_WORKBOOK_MIME, declaredByteSize: updateWorkbookBytes.byteLength }], category: "other", role: "document", sortOrder: 0, associationType: null, associationEntityId: null, sourceDeclarationEnabled: false }, { rateLimiter: allowLimiter });
      const updateWorkbookAssetId = await completeAdminUploadIntent(connection.db, storage, new DevelopmentFileScanner(), actor, { token: updatePackage.intents[0]!.token, bytes: updateWorkbookBytes }, { rateLimiter: allowLimiter });
      await finalizeAdminUploadBatch(connection.db, storage, actor, updatePackage.batchId);
      const updateBatchId = await prepareProductImportBatch(connection.db, actor, { mode: "update", workbookAssetId: updateWorkbookAssetId, preparation: { kind: "none" } });
      await validatePreparedProductImport(connection.db, storage, actor, updateBatchId);
      await applyProductImportBatch(connection.db, actor, updateBatchId);
      const publicAfter = (await connection.db.select().from(productLocalizations).where(eq(productLocalizations.productId, productRows[0]!.id)).limit(1))[0]!;
      expect(publicAfter.shortDescription).toBe(publicBefore.shortDescription);
      const revisions = await connection.db.select().from(editorialRevisions).where(and(
        eq(editorialRevisions.entityType, "product"),
        eq(editorialRevisions.entityId, productRows[0]!.id),
        eq(editorialRevisions.status, "draft"),
      ));
      expect(revisions).toHaveLength(1);
      expect(JSON.stringify(revisions[0]!.snapshot)).toContain("Synthetic pending summary from Update import.");

      const oversizedWorkbookBytes = await rewriteWorkbookXml(await workbook([]), (source) => source.replace(
        "</workbook>",
        `<synthetic value="${"x".repeat(PRODUCT_IMPORT_LIMITS.workbookXmlAttributeValueBytes + 1)}"/></workbook>`,
      ));
      const oversizedPackage = await createAdminUploadBatch(connection.db, actor, {
        files: [{ fileName: "CWT-Product-Import-Template-V1.xlsx", declaredMimeType: IMPORT_WORKBOOK_MIME, declaredByteSize: oversizedWorkbookBytes.byteLength }],
        category: "other", role: "document", sortOrder: 0, associationType: null, associationEntityId: null, sourceDeclarationEnabled: false,
      }, { rateLimiter: allowLimiter });
      await expect(completeAdminUploadIntent(connection.db, storage, new DevelopmentFileScanner(), actor, {
        token: oversizedPackage.intents[0]!.token,
        bytes: oversizedWorkbookBytes,
      }, { rateLimiter: allowLimiter })).rejects.toMatchObject({
        name: "ProductImportWorkbookPackageError",
        code: "invalid_workbook_package",
        message: expect.stringMatching(/attribute value exceeds the Template V1 limit/i),
      } satisfies Partial<ProductImportWorkbookPackageError>);
    } finally { await connection.close(); }
  });
});
