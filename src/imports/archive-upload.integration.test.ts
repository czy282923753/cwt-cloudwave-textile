import { Uint8ArrayReader, Uint8ArrayWriter, ZipWriter } from "@zip.js/zip.js";
import { and, count, eq } from "drizzle-orm";
import sharp from "sharp";
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  assetUploadBatches,
  assets,
  assetVariants,
  authSessions,
  featureFlags,
  objectCleanupJobs,
  productImportBatches,
  productImportItems,
  uploadRecoveryJobs,
  users,
} from "@/db/schema";
import { createTestDatabase } from "@/test/database";
import { InMemoryObjectStorage } from "@/test/in-memory-storage";
import {
  completeAdminImportArchiveIntent,
  createProductImportUploadBatch,
  finalizeAdminUploadBatch,
  IMPORT_ARCHIVE_MIME,
  type AdminUploadActor,
} from "@/uploads/admin-upload-service";
import { DevelopmentFileScanner, type FileScanner } from "@/uploads/scanner";
import { processPendingUploadRecoveryJobs } from "@/uploads/upload-recovery-service";
import { cancelProductImportBatch } from "./service";

const allowLimiter = {
  consume: async () => ({ kind: "allowed" as const, remaining: 29, retryAfterMs: 60_000 }),
};

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
  await connection.db.insert(featureFlags).values({ key: "product_import", enabled: true, updatedByUserId: user!.id })
    .onConflictDoUpdate({ target: featureFlags.key, set: { enabled: true, updatedByUserId: user!.id } });
  return {
    connection,
    actor: { userId: user!.id, role: user!.role, authSessionId: session!.id } satisfies AdminUploadActor,
    storage: new InMemoryObjectStorage(),
  };
}

async function issueArchive(test: Awaited<ReturnType<typeof fixture>>, bytes: Uint8Array, fileName: string) {
  const [batch] = await test.connection.db.insert(productImportBatches).values({
    createdByUserId: test.actor.userId,
    authSessionId: test.actor.authSessionId,
    mode: "create",
    sourceFingerprint: crypto.randomUUID().replaceAll("-", "").padEnd(64, "0"),
    status: "draft",
  }).returning({ id: productImportBatches.id });
  await test.connection.db.insert(productImportItems).values({
    batchId: batch!.id,
    kind: "media",
    sourceKey: "archive:package",
    status: "pending",
    rawData: { preparationKind: "archive", displayName: fileName, declaredMimeType: IMPORT_ARCHIVE_MIME, declaredByteSize: bytes.byteLength },
  });
  return { importBatchId: batch!.id, ...await createProductImportUploadBatch(test.connection.db, test.actor, {
    productImportBatchId: batch!.id,
    kind: "archive_package",
    fileName,
    declaredMimeType: IMPORT_ARCHIVE_MIME,
    declaredByteSize: bytes.byteLength,
  }, { rateLimiter: allowLimiter }) };
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
      const issued = await issueArchive(test, bytes, "synthetic-images.zip");
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
      const replay = await completeAdminImportArchiveIntent(
        test.connection.db,
        test.storage,
        new DevelopmentFileScanner(),
        test.actor,
        { token: issued.intents[0]!.token, stream: stream(bytes) },
        { rateLimiter: allowLimiter },
      );
      expect(replay).toEqual(completed);
      const mismatchedReplay = bytes.slice();
      const mismatchIndex = mismatchedReplay.length - 1;
      mismatchedReplay[mismatchIndex] = (mismatchedReplay[mismatchIndex] ?? 0) ^ 1;
      await expect(completeAdminImportArchiveIntent(
        test.connection.db,
        test.storage,
        new DevelopmentFileScanner(),
        test.actor,
        { token: issued.intents[0]!.token, stream: stream(mismatchedReplay) },
        { rateLimiter: allowLimiter },
      )).rejects.toThrow(/does not match/i);
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

  it("resumes the same archive authority after a crash without duplicating finalized media", async () => {
    const test = await fixture();
    try {
      const first = new Uint8Array(await sharp({ create: { width: 20, height: 20, channels: 3, background: "teal" } }).webp().toBuffer());
      const second = new Uint8Array(await sharp({ create: { width: 20, height: 20, channels: 3, background: "navy" } }).webp().toBuffer());
      const bytes = await zip([
        { name: "CWT-MESH-001/CWT-MESH-001-01.webp", bytes: first },
        { name: "CWT-MESH-001/CWT-MESH-001-02.webp", bytes: second },
      ]);
      const issued = await issueArchive(test, bytes, "synthetic-retry-images.zip");
      const startedAt = new Date();
      let injected = false;
      await expect(completeAdminImportArchiveIntent(
        test.connection.db,
        test.storage,
        new DevelopmentFileScanner(),
        test.actor,
        { token: issued.intents[0]!.token, stream: stream(bytes) },
        {
          rateLimiter: allowLimiter,
          now: startedAt,
          leaseMilliseconds: 10_000,
          faultInjector(point) {
            if (point === "after_import_archive_first_media" && !injected) {
              injected = true;
              throw new Error("synthetic process crash after first Import media");
            }
          },
        },
      )).rejects.toThrow(/synthetic process crash/i);

      const afterCrash = await test.connection.db.select().from(assets).where(eq(assets.storagePartition, "public"));
      expect(afterCrash).toHaveLength(1);
      const firstAssetVariantsAfterCrash = await test.connection.db.select().from(assetVariants)
        .where(eq(assetVariants.sourceAssetId, afterCrash[0]!.id));
      expect(firstAssetVariantsAfterCrash.length).toBeGreaterThan(0);
      await expect(completeAdminImportArchiveIntent(
        test.connection.db,
        test.storage,
        new DevelopmentFileScanner(),
        test.actor,
        { token: issued.intents[0]!.token, stream: stream(bytes) },
        { rateLimiter: allowLimiter, now: new Date(startedAt.getTime() + 1_000), leaseMilliseconds: 10_000 },
      )).rejects.toThrow(/not safely reclaimable/i);

      const recovered = await processPendingUploadRecoveryJobs(test.connection.db, test.storage, {
        now: new Date(startedAt.getTime() + 30_000),
        workerId: "synthetic-import-recovery",
        auditWriter: async () => crypto.randomUUID(),
      });
      expect(recovered).toEqual({ attempted: 1, completed: 1 });
      const retryable = (await test.connection.db.select().from(uploadRecoveryJobs)
        .where(eq(uploadRecoveryJobs.uploadBatchId, issued.batchId)))[0];
      expect(retryable).toMatchObject({ status: "retryable", stage: "failed", lastError: "import_staging_retryable" });

      const resumed = await completeAdminImportArchiveIntent(
        test.connection.db,
        test.storage,
        new DevelopmentFileScanner(),
        test.actor,
        { token: issued.intents[0]!.token, stream: stream(bytes) },
        {
          rateLimiter: allowLimiter,
          now: new Date(startedAt.getTime() + 30_001),
          leaseMilliseconds: 10_000,
          faultInjector(point) {
            if (point === "after_import_archive_first_media" && !injected) {
              injected = true;
              throw new Error("must not run");
            }
          },
        },
      );
      expect(resumed.media).toHaveLength(2);
      expect(new Set(resumed.media.map((item) => item.assetId)).size).toBe(2);
      expect(resumed.media[0]?.assetId).toBe(afterCrash[0]?.id);
      const publicAssets = await test.connection.db.select().from(assets).where(eq(assets.storagePartition, "public"));
      expect(publicAssets).toHaveLength(2);
      const firstAssetVariantsAfterResume = await test.connection.db.select().from(assetVariants)
        .where(eq(assetVariants.sourceAssetId, afterCrash[0]!.id));
      expect(firstAssetVariantsAfterResume).toHaveLength(firstAssetVariantsAfterCrash.length);
      const allBatches = await test.connection.db.select().from(assetUploadBatches)
        .where(eq(assetUploadBatches.createdByUserId, test.actor.userId));
      expect(allBatches).toHaveLength(3);
      expect(allBatches.filter((batch) => batch.status === "completed")).toHaveLength(2);
      const bindings = allBatches
        .map((batch) => (batch.declarationInput as { importMediaBinding?: unknown } | null)?.importMediaBinding)
        .filter(Boolean);
      expect(bindings).toHaveLength(2);
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
      const issued = await issueArchive(test, bytes, "synthetic-rejected-images.zip");
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
      const packageAsset = (await test.connection.db.select().from(assets)
        .where(eq(assets.uploadBatchId, issued.batchId)))[0]!;
      const recovery = (await test.connection.db.select().from(uploadRecoveryJobs)
        .where(eq(uploadRecoveryJobs.uploadBatchId, issued.batchId)))[0]!;
      const expiredRecovery = await processPendingUploadRecoveryJobs(test.connection.db, test.storage, {
        now: new Date(recovery.expiresAt.getTime() + 1),
        workerId: "synthetic-expired-import-cleanup",
      });
      expect(expiredRecovery).toEqual({ attempted: 1, completed: 1 });
      await expect(test.storage.exists("imports", packageAsset.objectKey)).resolves.toBe(false);
      expect((await test.connection.db.select().from(assets).where(eq(assets.id, packageAsset.id)))[0])
        .toMatchObject({ status: "deleted" });
      expect((await test.connection.db.select().from(objectCleanupJobs).where(eq(objectCleanupJobs.id, cleanup[0]!.id)))[0])
        .toMatchObject({ status: "completed" });
    } finally {
      await test.connection.close();
    }
  });

  it("abandons an interrupted archive package and its finalized child through existing Recovery and Cleanup", async () => {
    const test = await fixture();
    try {
      const first = new Uint8Array(await sharp({ create: { width: 22, height: 22, channels: 3, background: "orange" } }).webp().toBuffer());
      const second = new Uint8Array(await sharp({ create: { width: 22, height: 22, channels: 3, background: "purple" } }).webp().toBuffer());
      const bytes = await zip([
        { name: "CWT-ABANDON-001/CWT-ABANDON-001-01.webp", bytes: first },
        { name: "CWT-ABANDON-001/CWT-ABANDON-001-02.webp", bytes: second },
      ]);
      const issued = await issueArchive(test, bytes, "synthetic-abandoned-images.zip");
      const startedAt = new Date();
      await expect(completeAdminImportArchiveIntent(
        test.connection.db,
        test.storage,
        new DevelopmentFileScanner(),
        test.actor,
        { token: issued.intents[0]!.token, stream: stream(bytes) },
        {
          rateLimiter: allowLimiter,
          now: startedAt,
          leaseMilliseconds: 10_000,
          faultInjector(point) {
            if (point === "after_import_archive_first_media") throw new Error("synthetic archive abandon interruption");
          },
        },
      )).rejects.toThrow(/abandon interruption/);
      const childBeforeCancel = (await test.connection.db.select().from(assets).where(eq(assets.storagePartition, "public")))[0]!;
      const packageBeforeCancel = (await test.connection.db.select().from(assets).where(eq(assets.uploadBatchId, issued.batchId)))[0]!;
      expect(childBeforeCancel.status).toBe("ready");
      await processPendingUploadRecoveryJobs(test.connection.db, test.storage, {
        now: new Date(startedAt.getTime() + 30_000),
        workerId: "synthetic-abandoned-archive-recovery",
        auditWriter: async () => crypto.randomUUID(),
      });
      await cancelProductImportBatch(test.connection.db, test.storage, test.actor, issued.importBatchId);
      expect((await test.connection.db.select().from(productImportBatches).where(eq(productImportBatches.id, issued.importBatchId)))[0]).toMatchObject({ status: "failed", failureCode: "operator_cancelled" });
      expect((await test.connection.db.select().from(assets).where(eq(assets.id, childBeforeCancel.id)))[0]).toMatchObject({ status: "deleted" });
      expect((await test.connection.db.select().from(assets).where(eq(assets.id, packageBeforeCancel.id)))[0]).toMatchObject({ status: "deleted" });
      await expect(test.storage.exists("public", childBeforeCancel.objectKey)).resolves.toBe(false);
      await expect(test.storage.exists("imports", packageBeforeCancel.objectKey)).resolves.toBe(false);
      const publicCleanup = await test.connection.db.select().from(objectCleanupJobs).where(and(
        eq(objectCleanupJobs.uploadBatchId, childBeforeCancel.uploadBatchId!),
        eq(objectCleanupJobs.storagePartition, "public"),
      ));
      expect(publicCleanup.length).toBeGreaterThan(0);
      expect(publicCleanup.every((job) => job.status === "completed")).toBe(true);
    } finally {
      await test.connection.close();
    }
  });
});
