import { eq } from "drizzle-orm";
import sharp from "sharp";
import { describe, expect, it } from "vitest";

import { env } from "@/config/env";
import { assetUploadBatches, assets, authSessions, productAssets, products, productTaxonomyTerms, taxonomyTerms, uploadIntents, users } from "@/db/schema";
import { InMemoryObjectStorage } from "@/test/in-memory-storage";
import { createTestDatabase } from "@/test/database";

import {
  completeAdminUploadIntent,
  createAdminUploadBatch,
  finalizeAdminUploadBatch,
  inspectAdminUploadIntent,
  linkAssetRelation,
  unlinkAssetRelation,
} from "./admin-upload-service";
import { DevelopmentFileScanner } from "./scanner";

const allowLimiter = { consume: async () => true };
const failingAudit = async (): Promise<string> => { throw new Error("TEST audit failure"); };
const cleanLimitScanner = { scan: async () => ({ clean: true, provider: "test-limit-scanner", reference: "test:clean" }) };

async function jpegWithSize(size?: number): Promise<Uint8Array> {
  const base = new Uint8Array(await sharp({ create: { width: 16, height: 16, channels: 3, background: "teal" } }).jpeg().toBuffer());
  if (!size) return base;
  if (size < base.byteLength) throw new Error("Requested fixture is too small.");
  const bytes = new Uint8Array(size);
  bytes.set(base);
  return bytes;
}

async function createDraftProducts(
  db: Awaited<ReturnType<typeof createTestDatabase>>["db"],
  key: string,
  amount: number,
): Promise<string[]> {
  const [taxonomy] = await db.insert(taxonomyTerms).values({ internalKey: key, dimension: "material_fiber" }).returning({ id: taxonomyTerms.id });
  if (!taxonomy) throw new Error("Missing Taxonomy.");
  return db.transaction(async (transaction) => {
    const rows = await transaction.insert(products).values(Array.from({ length: amount }, () => ({ status: "draft" as const }))).returning({ id: products.id });
    await transaction.insert(productTaxonomyTerms).values(rows.map((row) => ({ productId: row.id, taxonomyTermId: taxonomy.id, isPrimary: true })));
    return rows.map((row) => row.id);
  });
}

describe("Admin Asset Upload Intents", () => {
  it("binds User and Session, transitions the Batch, finalizes atomically, and keeps declaration OFF/null", async () => {
    const connection = await createTestDatabase();
    const storage = new InMemoryObjectStorage();
    try {
      const userRows = await connection.db.insert(users).values([
        { email: "asset-admin@example.test", displayName: "Asset Admin", role: "admin", passwordHash: "test" },
        { email: "asset-other-admin@example.test", displayName: "Other Admin", role: "admin", passwordHash: "test" },
      ]).returning({ id: users.id, role: users.role, email: users.email });
      const user = userRows.find((row) => row.email === "asset-admin@example.test");
      const otherUser = userRows.find((row) => row.email === "asset-other-admin@example.test");
      if (!user || !otherUser) throw new Error("Missing User.");
      const sessions = await connection.db.insert(authSessions).values([
        { userId: user.id, tokenHash: "asset-session-a", expiresAt: new Date(Date.now() + 60_000) },
        { userId: user.id, tokenHash: "asset-session-b", expiresAt: new Date(Date.now() + 60_000) },
        { userId: otherUser.id, tokenHash: "asset-session-other-user", expiresAt: new Date(Date.now() + 60_000) },
      ]).returning({ id: authSessions.id, userId: authSessions.userId });
      const ownSessions = sessions.filter((row) => row.userId === user.id);
      const actor = { userId: user.id, role: user.role, authSessionId: ownSessions[0]!.id };
      const crossSession = { ...actor, authSessionId: ownSessions[1]!.id };
      const crossUser = { userId: otherUser.id, role: otherUser.role, authSessionId: sessions.find((row) => row.userId === otherUser.id)!.id };
      const [productId] = await createDraftProducts(connection.db, "upload-product-a", 1);
      if (!productId) throw new Error("Missing Product.");
      const bytes = await jpegWithSize(1_048_577);
      const batch = await createAdminUploadBatch(connection.db, actor, {
        files: [{ fileName: "TEST-over-one-mib.jpg", declaredMimeType: "image/jpeg", declaredByteSize: bytes.byteLength }],
        category: "product", role: "gallery", sortOrder: 2,
        associationType: "product", associationEntityId: productId,
        sourceDeclarationEnabled: false, sourceDeclaration: null,
      }, { rateLimiter: allowLimiter });
      await expect(inspectAdminUploadIntent(connection.db, crossSession, batch.intents[0]!.token)).rejects.toThrow(/invalid|expired|used/i);
      await expect(inspectAdminUploadIntent(connection.db, crossUser, batch.intents[0]!.token)).rejects.toThrow(/invalid|expired|used/i);
      await completeAdminUploadIntent(connection.db, storage, new DevelopmentFileScanner(), actor, { token: batch.intents[0]!.token, bytes });
      await expect(completeAdminUploadIntent(connection.db, storage, new DevelopmentFileScanner(), actor, { token: batch.intents[0]!.token, bytes })).rejects.toThrow(/invalid|expired|used/i);
      expect((await connection.db.select().from(assetUploadBatches).where(eq(assetUploadBatches.id, batch.batchId)))[0]).toMatchObject({ status: "ready_to_finalize", completedFileCount: 1 });
      const result = await finalizeAdminUploadBatch(connection.db, storage, actor, batch.batchId);
      const released = (await connection.db.select().from(assets).where(eq(assets.id, result.assetIds[0]!)))[0]!;
      expect(released).toMatchObject({ storagePartition: "public", access: "public", status: "ready", scanStatus: "passed", sourceDeclarationEnabled: false });
      expect(released.sourceType).toBeNull();
      expect(released.rightsStatus).toBeNull();
      expect(released.publicUsePermission).toBeNull();
      expect(released.declarationReviewerUserId).toBeNull();
      expect(await connection.db.select().from(productAssets).where(eq(productAssets.assetId, released.id))).toHaveLength(1);
      expect((await connection.db.select().from(assetUploadBatches).where(eq(assetUploadBatches.id, batch.batchId)))[0]?.status).toBe("completed");
      await expect(finalizeAdminUploadBatch(connection.db, storage, actor, batch.batchId)).rejects.toThrow(/unavailable|finalized/i);
    } finally { await connection.close(); }
  }, 20_000);

  it("accepts the exact configured limit, rejects limit plus one and expired/unauthorized intents", async () => {
    const connection = await createTestDatabase();
    const storage = new InMemoryObjectStorage();
    try {
      const inserted = await connection.db.insert(users).values([
        { email: "limit-admin@example.test", displayName: "Limit Admin", role: "admin", passwordHash: "test" },
        { email: "limit-analyst@example.test", displayName: "Limit Analyst", role: "analyst", passwordHash: "test" },
      ]).returning({ id: users.id, role: users.role });
      const admin = inserted.find((row) => row.role === "admin")!;
      const analyst = inserted.find((row) => row.role === "analyst")!;
      const sessions = await connection.db.insert(authSessions).values([
        { userId: admin.id, tokenHash: "limit-admin-session", expiresAt: new Date(Date.now() + 60_000) },
        { userId: analyst.id, tokenHash: "limit-analyst-session", expiresAt: new Date(Date.now() + 60_000) },
      ]).returning({ id: authSessions.id, userId: authSessions.userId });
      const actor = { userId: admin.id, role: admin.role, authSessionId: sessions.find((row) => row.userId === admin.id)!.id };
      await expect(createAdminUploadBatch(connection.db, { userId: analyst.id, role: analyst.role, authSessionId: sessions.find((row) => row.userId === analyst.id)!.id }, {
        files: [{ fileName: "forbidden.jpg", declaredMimeType: "image/jpeg", declaredByteSize: 10 }], category: "product", role: "gallery", sortOrder: 0, sourceDeclarationEnabled: false,
      }, { rateLimiter: allowLimiter })).rejects.toThrow(/permission/i);
      await expect(createAdminUploadBatch(connection.db, actor, {
        files: [{ fileName: "too-large.jpg", declaredMimeType: "image/jpeg", declaredByteSize: env.MAX_PUBLIC_FILE_BYTES + 1 }], category: "product", role: "gallery", sortOrder: 0, sourceDeclarationEnabled: false,
      }, { rateLimiter: allowLimiter })).rejects.toThrow(/size/i);
      const exact = await jpegWithSize(env.MAX_PUBLIC_FILE_BYTES);
      const batch = await createAdminUploadBatch(connection.db, actor, {
        files: [{ fileName: "exact-limit.jpg", declaredMimeType: "image/jpeg", declaredByteSize: exact.byteLength }], category: "product", role: "gallery", sortOrder: 0, sourceDeclarationEnabled: false,
      }, { rateLimiter: allowLimiter });
      await expect(inspectAdminUploadIntent(connection.db, actor, batch.intents[0]!.token, new Date(batch.expiresAt.getTime() + 1))).rejects.toThrow(/invalid|expired/i);
      await completeAdminUploadIntent(connection.db, storage, cleanLimitScanner, actor, { token: batch.intents[0]!.token, bytes: exact });
      expect((await connection.db.select().from(uploadIntents).where(eq(uploadIntents.uploadBatchId, batch.batchId)))[0]?.status).toBe("passed");
    } finally { await connection.close(); }
  }, 30_000);

  it("fails closed on scanning and rolls back public release and Asset relations when Audit or association writes fail", async () => {
    const connection = await createTestDatabase();
    const storage = new InMemoryObjectStorage();
    try {
      const [user] = await connection.db.insert(users).values({ email: "rollback-admin@example.test", displayName: "Rollback Admin", role: "admin", passwordHash: "test" }).returning({ id: users.id, role: users.role });
      if (!user) throw new Error("Missing User.");
      const [session] = await connection.db.insert(authSessions).values({ userId: user.id, tokenHash: "rollback-session", expiresAt: new Date(Date.now() + 60_000) }).returning({ id: authSessions.id });
      if (!session) throw new Error("Missing Session.");
      const actor = { userId: user.id, role: user.role, authSessionId: session.id };
      const bytes = await jpegWithSize();
      const infected = new Uint8Array(bytes.byteLength + 40);
      infected.set(bytes);
      infected.set(new TextEncoder().encode("EICAR-STANDARD-ANTIVIRUS-TEST-FILE"), bytes.byteLength);
      const bad = await createAdminUploadBatch(connection.db, actor, {
        files: [{ fileName: "scan-failure.jpg", declaredMimeType: "image/jpeg", declaredByteSize: infected.byteLength }], category: "product", role: "gallery", sortOrder: 0, sourceDeclarationEnabled: false,
      }, { rateLimiter: allowLimiter });
      await expect(completeAdminUploadIntent(connection.db, storage, new DevelopmentFileScanner(), actor, { token: bad.intents[0]!.token, bytes: infected })).rejects.toThrow(/malware/i);
      expect((await connection.db.select().from(assetUploadBatches).where(eq(assetUploadBatches.id, bad.batchId)))[0]?.status).toBe("failed");

      const [productA, productB] = await createDraftProducts(connection.db, "upload-product-rollback", 2);
      const batch = await createAdminUploadBatch(connection.db, actor, {
        files: [{ fileName: "rollback.jpg", declaredMimeType: "image/jpeg", declaredByteSize: bytes.byteLength }], category: "product", role: "gallery", sortOrder: 0,
        associationType: "product", associationEntityId: productA!, sourceDeclarationEnabled: false,
      }, { rateLimiter: allowLimiter });
      const assetId = await completeAdminUploadIntent(connection.db, storage, new DevelopmentFileScanner(), actor, { token: batch.intents[0]!.token, bytes });
      const staged = (await connection.db.select().from(assets).where(eq(assets.id, assetId)))[0]!;
      await connection.db.update(products).set({ status: "archived" }).where(eq(products.id, productA!));
      await expect(finalizeAdminUploadBatch(connection.db, storage, actor, batch.batchId)).rejects.toThrow(/unavailable/i);
      expect(storage.objects.has(`public:${staged.objectKey}`)).toBe(false);
      expect((await connection.db.select().from(assets).where(eq(assets.id, assetId)))[0]).toMatchObject({ storagePartition: "private", access: "internal" });
      await connection.db.update(products).set({ status: "draft" }).where(eq(products.id, productA!));
      await expect(finalizeAdminUploadBatch(connection.db, storage, actor, batch.batchId, { auditWriter: failingAudit })).rejects.toThrow("TEST audit failure");
      expect((await connection.db.select().from(assets).where(eq(assets.id, assetId)))[0]).toMatchObject({ storagePartition: "private", access: "internal" });
      expect(storage.objects.has(`public:${staged.objectKey}`)).toBe(false);
      expect(await connection.db.select().from(productAssets).where(eq(productAssets.assetId, assetId))).toHaveLength(0);

      await finalizeAdminUploadBatch(connection.db, storage, actor, batch.batchId);
      await expect(linkAssetRelation(connection.db, actor, { assetId, associationType: "product", associationEntityId: productB!, role: "gallery", sortOrder: 0 }, { auditWriter: failingAudit })).rejects.toThrow("TEST audit failure");
      expect(await connection.db.select().from(productAssets).where(eq(productAssets.productId, productB!))).toHaveLength(0);
      await linkAssetRelation(connection.db, actor, { assetId, associationType: "product", associationEntityId: productB!, role: "gallery", sortOrder: 0 });
      await expect(unlinkAssetRelation(connection.db, actor, { assetId, associationType: "product", associationEntityId: productB! }, { auditWriter: failingAudit })).rejects.toThrow("TEST audit failure");
      expect(await connection.db.select().from(productAssets).where(eq(productAssets.productId, productB!))).toHaveLength(1);
      await unlinkAssetRelation(connection.db, actor, { assetId, associationType: "product", associationEntityId: productB! });
    } finally { await connection.close(); }
  }, 30_000);
});
