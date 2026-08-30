import { and, count, eq } from "drizzle-orm";
import sharp from "sharp";
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  assetUploadBatches,
  assets,
  authSessions,
  objectCleanupJobs,
  productAssets,
  products,
  productTaxonomyTerms,
  taxonomyTerms,
  uploadIntents,
  uploadRecoveryJobs,
  users,
} from "@/db/schema";
import { createTestDatabase } from "@/test/database";
import { InMemoryObjectStorage } from "@/test/in-memory-storage";

import {
  completeAdminUploadIntent,
  createAdminUploadBatch,
  finalizeAdminUploadBatch,
  listRetryableAdminUploadBatches,
  type AdminUploadActor,
} from "./admin-upload-service";
import { DevelopmentFileScanner } from "./scanner";
import { advanceUploadRecoveryStage, recoverUploadRecoveryJob } from "./upload-recovery-service";

const allowLimiter = {
  consume: async () => ({ kind: "allowed" as const, remaining: 29, retryAfterMs: 60_000 }),
};

async function createActor(
  db: Awaited<ReturnType<typeof createTestDatabase>>["db"],
  label: string,
  role: "admin" | "analyst" | "sales" | "product_editor" = "admin",
): Promise<AdminUploadActor> {
  const [user] = await db.insert(users).values({
    email: `${label}@example.test`,
    displayName: `TEST ${label}`,
    role,
    passwordHash: "test",
  }).returning({ id: users.id, role: users.role });
  if (!user) throw new Error("Missing test User.");
  const [session] = await db.insert(authSessions).values({
    userId: user.id,
    tokenHash: `${label}-session`,
    expiresAt: new Date(Date.now() + 60 * 60_000),
  }).returning({ id: authSessions.id });
  if (!session) throw new Error("Missing test Session.");
  return { userId: user.id, role: user.role, authSessionId: session.id };
}

async function createProduct(
  db: Awaited<ReturnType<typeof createTestDatabase>>["db"],
  key: string,
): Promise<string> {
  const [taxonomy] = await db.insert(taxonomyTerms).values({
    internalKey: key,
    dimension: "material_fiber",
  }).returning({ id: taxonomyTerms.id });
  if (!taxonomy) throw new Error("Missing test Taxonomy fixture.");
  return db.transaction(async (transaction) => {
    const [product] = await transaction.insert(products).values({ status: "draft" })
      .returning({ id: products.id });
    if (!product) throw new Error("Missing test Product fixture.");
    await transaction.insert(productTaxonomyTerms).values({
      productId: product.id,
      taxonomyTermId: taxonomy.id,
      isPrimary: true,
    });
    return product.id;
  });
}

async function createRetryableFixture(
  db: Awaited<ReturnType<typeof createTestDatabase>>["db"],
  storage: InMemoryObjectStorage,
  actor: AdminUploadActor,
  label: string,
) {
  const bytes = new Uint8Array(await sharp({
    create: { width: 12, height: 12, channels: 3, background: "teal" },
  }).jpeg().toBuffer());
  const productId = await createProduct(db, `${label}-material`);
  const batch = await createAdminUploadBatch(db, actor, {
    files: [{ fileName: `TEST-${label}.jpg`, declaredMimeType: "image/jpeg", declaredByteSize: bytes.byteLength }],
    category: "product",
    role: "gallery",
    sortOrder: 0,
    associationType: "product",
    associationEntityId: productId,
    sourceDeclarationEnabled: false,
  }, { rateLimiter: allowLimiter });
  const assetId = await completeAdminUploadIntent(
    db,
    storage,
    new DevelopmentFileScanner(),
    actor,
    { token: batch.intents[0]!.token, bytes },
  );
  const claimAt = new Date();
  await expect(finalizeAdminUploadBatch(db, storage, actor, batch.batchId, {
    now: claimAt,
    workerId: `${label}-old-worker`,
    leaseMilliseconds: 1_000,
    faultInjector: (point) => {
      if (point === "after_finalize_claim") throw new Error("TEST pre-Manifest interruption");
    },
  })).rejects.toThrow(/pre-Manifest interruption/i);
  const [recovery] = await db.select().from(uploadRecoveryJobs).where(and(
    eq(uploadRecoveryJobs.uploadBatchId, batch.batchId),
    eq(uploadRecoveryJobs.kind, "finalize"),
  ));
  if (!recovery?.leaseExpiresAt) throw new Error("Missing Finalize Recovery fixture.");
  const retryAt = new Date(recovery.leaseExpiresAt.getTime() + 1);
  await expect(recoverUploadRecoveryJob(db, storage, recovery.id, {
    now: retryAt,
    workerId: `${label}-recovery-worker`,
  })).resolves.toBe("retryable");
  return { batchId: batch.batchId, assetId, productId, recovery, retryAt };
}

describe("retryable Admin Asset Batch recovery", () => {
  it("lists only a current actor's complete, unexpired pre-Manifest handoff", async () => {
    const connection = await createTestDatabase();
    const storage = new InMemoryObjectStorage();
    try {
      const actor = await createActor(connection.db, "retry-list-owner");
      const otherActor = await createActor(connection.db, "retry-list-other");
      const analyst = await createActor(connection.db, "retry-list-analyst", "analyst");
      const sales = await createActor(connection.db, "retry-list-sales", "sales");
      const otherProductEditor = await createActor(connection.db, "retry-list-product-editor", "product_editor");
      const fixture = await createRetryableFixture(connection.db, storage, actor, "retry-list");

      await expect(listRetryableAdminUploadBatches(
        connection.db,
        storage,
        actor,
        { now: fixture.retryAt },
      )).resolves.toEqual([expect.objectContaining({
        batchId: fixture.batchId,
        fileNames: ["TEST-retry-list.jpg"],
        status: "retryable",
        reason: "processing_interrupted",
      })]);
      await expect(listRetryableAdminUploadBatches(
        connection.db,
        storage,
        otherActor,
        { now: fixture.retryAt },
      )).resolves.toEqual([]);
      await expect(listRetryableAdminUploadBatches(
        connection.db,
        storage,
        analyst,
        { now: fixture.retryAt },
      )).rejects.toThrow(/assets\.write/i);
      await expect(listRetryableAdminUploadBatches(
        connection.db,
        storage,
        sales,
        { now: fixture.retryAt },
      )).rejects.toThrow(/assets\.write/i);
      await expect(listRetryableAdminUploadBatches(
        connection.db,
        storage,
        otherProductEditor,
        { now: fixture.retryAt },
      )).resolves.toEqual([]);
      await expect(finalizeAdminUploadBatch(
        connection.db,
        storage,
        otherProductEditor,
        fixture.batchId,
        { now: fixture.retryAt },
      )).rejects.toThrow(/unavailable|expired|finalized/i);
      await expect(finalizeAdminUploadBatch(
        connection.db,
        storage,
        otherActor,
        fixture.batchId,
        { now: fixture.retryAt },
      )).rejects.toThrow(/unavailable|expired|finalized/i);

      const expectHidden = async () => expect(listRetryableAdminUploadBatches(
        connection.db,
        storage,
        actor,
        { now: fixture.retryAt },
      )).resolves.toEqual([]);
      await connection.db.update(assetUploadBatches).set({ status: "completed" })
        .where(eq(assetUploadBatches.id, fixture.batchId));
      await expectHidden();
      await connection.db.update(assetUploadBatches).set({
        status: "failed",
        expiresAt: new Date(fixture.retryAt.getTime() - 1),
      }).where(eq(assetUploadBatches.id, fixture.batchId));
      await expectHidden();
      await connection.db.update(assetUploadBatches).set({
        expiresAt: new Date(fixture.retryAt.getTime() + 60_000),
        failureReason: "ordinary_failure",
      }).where(eq(assetUploadBatches.id, fixture.batchId));
      await expectHidden();
      await connection.db.update(assetUploadBatches).set({ failureReason: "finalize_recovered_retryable" })
        .where(eq(assetUploadBatches.id, fixture.batchId));
      await connection.db.update(assets).set({ storagePartition: "public" })
        .where(eq(assets.id, fixture.assetId));
      await expectHidden();
      await connection.db.update(assets).set({ storagePartition: "private" })
        .where(eq(assets.id, fixture.assetId));

      await connection.db.update(uploadRecoveryJobs).set({
        status: "processing",
        lockedBy: "another-worker",
        leaseExpiresAt: new Date(fixture.retryAt.getTime() + 10_000),
      }).where(eq(uploadRecoveryJobs.id, fixture.recovery.id));
      await expect(listRetryableAdminUploadBatches(
        connection.db,
        storage,
        actor,
        { now: fixture.retryAt },
      )).resolves.toEqual([]);
    } finally {
      await connection.close();
    }
  }, 20_000);

  it("re-finalizes the original Batch without duplicating its Intent, Asset, relation, or Cleanup", async () => {
    const connection = await createTestDatabase();
    const storage = new InMemoryObjectStorage();
    try {
      const actor = await createActor(connection.db, "retry-finalize-owner");
      const fixture = await createRetryableFixture(connection.db, storage, actor, "retry-finalize");
      const before = {
        intents: Number((await connection.db.select({ value: count() }).from(uploadIntents))[0]?.value ?? 0),
        assets: Number((await connection.db.select({ value: count() }).from(assets))[0]?.value ?? 0),
        relations: Number((await connection.db.select({ value: count() }).from(productAssets))[0]?.value ?? 0),
      };

      await expect(advanceUploadRecoveryStage(
        connection.db,
        {
          id: fixture.recovery.id,
          workerId: "retry-finalize-old-worker",
          version: fixture.recovery.version,
          attemptCount: fixture.recovery.attemptCount,
          leaseExpiresAt: fixture.recovery.leaseExpiresAt!,
        },
        "source_copy_started",
        fixture.retryAt,
      )).rejects.toThrow(/lease|version/i);

      const result = await finalizeAdminUploadBatch(
        connection.db,
        storage,
        actor,
        fixture.batchId,
        { now: fixture.retryAt, workerId: "retry-finalize-new-worker" },
      );
      expect(result).toMatchObject({
        success: true,
        batchId: fixture.batchId,
        assetId: fixture.assetId,
        alreadyFinalized: false,
      });
      expect((await connection.db.select().from(assetUploadBatches)
        .where(eq(assetUploadBatches.id, fixture.batchId)))[0]).toMatchObject({
        status: "completed",
        failureReason: null,
      });
      expect((await connection.db.select().from(assets)
        .where(eq(assets.id, fixture.assetId)))[0]).toMatchObject({
        storagePartition: "public",
        access: "public",
        status: "ready",
      });
      expect(Number((await connection.db.select({ value: count() }).from(uploadIntents))[0]?.value)).toBe(before.intents);
      expect(Number((await connection.db.select({ value: count() }).from(assets))[0]?.value)).toBe(before.assets);
      expect(Number((await connection.db.select({ value: count() }).from(productAssets))[0]?.value)).toBe(before.relations + 1);
      expect(await connection.db.select().from(productAssets).where(and(
        eq(productAssets.productId, fixture.productId),
        eq(productAssets.assetId, fixture.assetId),
      ))).toHaveLength(1);
      const cleanup = await connection.db.select().from(objectCleanupJobs).where(
        eq(objectCleanupJobs.uploadBatchId, fixture.batchId),
      );
      expect(new Set(cleanup.map((job) => `${job.storagePartition}:${job.objectKey}`)).size).toBe(cleanup.length);

      const idempotent = await finalizeAdminUploadBatch(
        connection.db,
        storage,
        actor,
        fixture.batchId,
        { now: new Date(fixture.retryAt.getTime() + 1) },
      );
      expect(idempotent).toMatchObject({ success: true, alreadyFinalized: true, assetId: fixture.assetId });
      await expect(listRetryableAdminUploadBatches(
        connection.db,
        storage,
        actor,
        { now: new Date(fixture.retryAt.getTime() + 2) },
      )).resolves.toEqual([]);
    } finally {
      await connection.close();
    }
  }, 30_000);
});
