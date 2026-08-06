import { Uint8ArrayReader, Uint8ArrayWriter, ZipWriter } from "@zip.js/zip.js";
import { and, count, eq } from "drizzle-orm";
import sharp from "sharp";
import { describe, expect, it } from "vitest";

import {
  assetUploadBatches,
  assets,
  assetVariants,
  authSessions,
  objectCleanupJobs,
  uploadRecoveryJobs,
  users,
} from "@/db/schema";
import { createTestDatabase } from "@/test/database";
import { InMemoryObjectStorage } from "@/test/in-memory-storage";
import {
  completeAdminImportArchiveIntent,
  createAdminUploadBatch,
  finalizeAdminUploadBatch,
  IMPORT_ARCHIVE_MIME,
  type AdminUploadActor,
} from "@/uploads/admin-upload-service";
import { DevelopmentFileScanner, type FileScanner } from "@/uploads/scanner";

const allowLimiter = { consume: async () => true };

async function zip(entries: Array<{ name: string; bytes: Uint8Array }>): Promise<Uint8Array> {
  const writer = new ZipWriter(new Uint8ArrayWriter());
  for (const entry of entries) await writer.add(entry.name, new Uint8ArrayReader(entry.bytes));
  return writer.close();
}

function stream(bytes: Uint8Array): ReadableStream<Uint8Array> {
  return new ReadableStream({
    start(controller) {
      controller.enqueue(bytes);
      controller.close();
    },
  });
}

async function fixture() {
  const connection = await createTestDatabase();
  const [user] = await connection.db.insert(users).values({
    email: `stage3-archive-${crypto.randomUUID()}@example.test`,
    displayName: "Synthetic Archive Importer",
    role: "product_editor",
    passwordHash: "test",
  }).returning({ id: users.id, role: users.role });
  const [session] = await connection.db.insert(authSessions).values({
    userId: user!.id,
    tokenHash: crypto.randomUUID(),
    expiresAt: new Date(Date.now() + 60_000),
  }).returning({ id: authSessions.id });
  return {
    connection,
    actor: { userId: user!.id, role: user!.role, authSessionId: session!.id } satisfies AdminUploadActor,
    storage: new InMemoryObjectStorage(),
  };
}

describe("Import Archive convergence with the governed Upload Saga", () => {
  it("validates the complete archive before Finalize and persists package/media evidence", async () => {
    const test = await fixture();
    try {
      const first = new Uint8Array(await sharp({ create: { width: 32, height: 24, channels: 3, background: "teal" } }).webp().toBuffer());
      const second = new Uint8Array(await sharp({ create: { width: 24, height: 32, channels: 3, background: "navy" } }).avif().toBuffer());
      const bytes = await zip([
        { name: "CWT-MESH-001/CWT-MESH-001-01.webp", bytes: first },
        { name: "CWT-MESH-001/CWT-MESH-001-detail-01.avif", bytes: second },
      ]);
      const issued = await createAdminUploadBatch(test.connection.db, test.actor, {
        files: [{ fileName: "synthetic-images.zip", declaredMimeType: IMPORT_ARCHIVE_MIME, declaredByteSize: bytes.byteLength }],
        category: "other", role: "document", sortOrder: 0, associationType: null, associationEntityId: null,
        sourceDeclarationEnabled: false,
      }, { rateLimiter: allowLimiter });
      const completed = await completeAdminImportArchiveIntent(
        test.connection.db,
        test.storage,
        new DevelopmentFileScanner(),
        test.actor,
        { token: issued.intents[0]!.token, stream: stream(bytes) },
        { rateLimiter: allowLimiter },
      );
      expect(completed.media.map((item) => item.relativePath)).toEqual([
        "CWT-MESH-001/CWT-MESH-001-01.webp",
        "CWT-MESH-001/CWT-MESH-001-detail-01.avif",
      ]);
      const finalized = await finalizeAdminUploadBatch(test.connection.db, test.storage, test.actor, issued.batchId, { rateLimiter: allowLimiter });
      expect(finalized.assetIds).toEqual([completed.packageAssetId]);
      const packageAsset = (await test.connection.db.select().from(assets).where(eq(assets.id, completed.packageAssetId)))[0]!;
      expect(packageAsset).toMatchObject({ storagePartition: "imports", access: "internal", status: "ready", scanStatus: "passed" });
      const publicAssets = await test.connection.db.select().from(assets).where(and(
        eq(assets.uploadedByUserId, test.actor.userId),
        eq(assets.storagePartition, "public"),
      ));
      expect(publicAssets).toHaveLength(2);
      expect(publicAssets.every((asset) => asset.status === "ready" && asset.scanStatus === "passed")).toBe(true);
      const variants = await test.connection.db.select({ value: count() }).from(assetVariants);
      expect(Number(variants[0]?.value)).toBeGreaterThan(0);
      const packageBatch = (await test.connection.db.select().from(assetUploadBatches).where(eq(assetUploadBatches.id, issued.batchId)))[0]!;
      expect(packageBatch.status).toBe("completed");
      const recovery = await test.connection.db.select().from(uploadRecoveryJobs).where(eq(uploadRecoveryJobs.assetId, completed.packageAssetId));
      expect(recovery).toHaveLength(1);
      expect(recovery[0]).toMatchObject({ status: "completed", stage: "completed", lockedBy: null });
    } finally {
      await test.connection.close();
    }
  });

  it("creates no public Asset when any entry fails the pre-Finalize malware gate", async () => {
    const test = await fixture();
    try {
      const first = new Uint8Array(await sharp({ create: { width: 8, height: 8, channels: 3, background: "teal" } }).png().toBuffer());
      const second = new Uint8Array(await sharp({ create: { width: 8, height: 8, channels: 3, background: "navy" } }).png().toBuffer());
      const bytes = await zip([
        { name: "CWT-MESH-001-01.png", bytes: first },
        { name: "CWT-MESH-001-02.png", bytes: second },
      ]);
      const issued = await createAdminUploadBatch(test.connection.db, test.actor, {
        files: [{ fileName: "synthetic-rejected-images.zip", declaredMimeType: IMPORT_ARCHIVE_MIME, declaredByteSize: bytes.byteLength }],
        category: "other", role: "document", sortOrder: 0, associationType: null, associationEntityId: null,
        sourceDeclarationEnabled: false,
      }, { rateLimiter: allowLimiter });
      let scans = 0;
      const scanner: FileScanner = {
        async scan() {
          scans += 1;
          return { clean: scans < 2, provider: "synthetic", reference: "synthetic-malware-gate" };
        },
      };
      await expect(completeAdminImportArchiveIntent(
        test.connection.db,
        test.storage,
        scanner,
        test.actor,
        { token: issued.intents[0]!.token, stream: stream(bytes) },
        { rateLimiter: allowLimiter },
      )).rejects.toThrow(/malware/i);
      const publicAssets = await test.connection.db.select().from(assets).where(eq(assets.storagePartition, "public"));
      expect(publicAssets).toHaveLength(0);
      const cleanup = await test.connection.db.select().from(objectCleanupJobs).where(eq(objectCleanupJobs.uploadBatchId, issued.batchId));
      expect(cleanup).toHaveLength(1);
      expect(cleanup[0]?.status).toBe("pending");
    } finally {
      await test.connection.close();
    }
  });
});
