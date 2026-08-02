import { and, eq } from "drizzle-orm";
import sharp from "sharp";
import { describe, expect, it } from "vitest";

import {
  assetUploadBatches,
  assets,
  assetVariants,
  auditLogs,
  authSessions,
  finalizeObjectManifestItems,
  objectCleanupJobs,
  productTaxonomyTerms,
  products,
  taxonomyTerms,
  uploadRecoveryJobs,
  uploadIntents,
  users,
} from "@/db/schema";
import { findPublicAssetForDelivery } from "@/public-site/public-asset-access";
import { createTestDatabase } from "@/test/database";
import { InMemoryObjectStorage } from "@/test/in-memory-storage";
import { publicReadyAssetSqlConditions } from "./asset-eligibility";

import {
  completeAdminUploadIntent,
  createAdminUploadBatch,
  finalizeAdminUploadBatch,
  type AdminUploadActor,
  type AdminUploadFaultPoint,
} from "./admin-upload-service";
import {
  claimObjectCleanupJob,
  processObjectCleanupJob,
  processPendingObjectCleanupJobs,
} from "./object-cleanup-service";
import { DevelopmentFileScanner } from "./scanner";
import {
  markFinalizeRecoveryRequired,
  processPendingUploadRecoveryJobs,
  recoverUploadRecoveryJob,
  revalidateHistoricalFinalizeManifest,
  type UploadRecoveryLease,
} from "./upload-recovery-service";

const allowLimiter = { consume: async () => true };

class AsyncBarrier {
  readonly reached: Promise<void>;
  private markReached: (() => void) | undefined;
  private continueRun: (() => void) | undefined;
  private readonly continuation: Promise<void>;

  constructor() {
    this.reached = new Promise((resolve) => {
      this.markReached = resolve;
    });
    this.continuation = new Promise((resolve) => {
      this.continueRun = resolve;
    });
  }

  async pause(): Promise<void> {
    this.markReached?.();
    await this.continuation;
  }

  release(): void {
    this.continueRun?.();
  }
}

class SlowPublicPutStorage extends InMemoryObjectStorage {
  readonly publicPut = new AsyncBarrier();
  private paused = false;

  override async put(...args: Parameters<InMemoryObjectStorage["put"]>) {
    if (args[0] === "public" && !this.paused) {
      this.paused = true;
      await this.publicPut.pause();
    }
    return super.put(...args);
  }
}

class CommitPreflightExpiryStorage extends InMemoryObjectStorage {
  private existenceChecks = 0;

  constructor(private readonly expireLease: () => void) {
    super();
  }

  override async exists(...args: Parameters<InMemoryObjectStorage["exists"]>) {
    this.existenceChecks += 1;
    if (this.existenceChecks === 8) this.expireLease();
    return super.exists(...args);
  }
}

class DeleteTrackingStorage extends InMemoryObjectStorage {
  deleteCalls = 0;

  override async delete(...args: Parameters<InMemoryObjectStorage["delete"]>) {
    this.deleteCalls += 1;
    return super.delete(...args);
  }
}

async function imageBytes(): Promise<Uint8Array> {
  return new Uint8Array(await sharp({
    create: { width: 16, height: 16, channels: 3, background: "#126f70" },
  }).jpeg().toBuffer());
}

async function setup(label: string) {
  const connection = await createTestDatabase();
  const [user] = await connection.db.insert(users).values({
    email: `${label}@example.test`,
    displayName: `TEST ${label}`,
    role: "admin",
    passwordHash: "test",
  }).returning({ id: users.id, role: users.role });
  if (!user) throw new Error("Missing test User.");
  const [session] = await connection.db.insert(authSessions).values({
    userId: user.id,
    tokenHash: `${label}-session`,
    expiresAt: new Date(Date.now() + 4 * 60 * 60_000),
  }).returning({ id: authSessions.id });
  if (!session) throw new Error("Missing test Session.");
  const [taxonomy] = await connection.db.insert(taxonomyTerms).values({
    internalKey: `${label}-material`,
    dimension: "material_fiber",
  }).returning({ id: taxonomyTerms.id });
  if (!taxonomy) throw new Error("Missing test Taxonomy.");
  const productId = await connection.db.transaction(async (transaction) => {
    const [product] = await transaction.insert(products).values({ status: "draft" })
      .returning({ id: products.id });
    if (!product) throw new Error("Missing test Product.");
    await transaction.insert(productTaxonomyTerms).values({
      productId: product.id,
      taxonomyTermId: taxonomy.id,
      isPrimary: true,
    });
    return product.id;
  });
  const actor: AdminUploadActor = {
    userId: user.id,
    role: user.role,
    authSessionId: session.id,
  };
  return { connection, actor, productId };
}

async function stage(label: string, storage = new InMemoryObjectStorage()) {
  const fixture = await setup(label);
  const bytes = await imageBytes();
  const batch = await createAdminUploadBatch(fixture.connection.db, fixture.actor, {
    files: [{
      fileName: `TEST-${label}.jpg`,
      declaredMimeType: "image/jpeg",
      declaredByteSize: bytes.byteLength,
    }],
    category: "product",
    role: "gallery",
    sortOrder: 0,
    associationType: "product",
    associationEntityId: fixture.productId,
    sourceDeclarationEnabled: false,
  }, { rateLimiter: allowLimiter });
  const assetId = await completeAdminUploadIntent(
    fixture.connection.db,
    storage,
    new DevelopmentFileScanner(),
    fixture.actor,
    { token: batch.intents[0]!.token, bytes },
  );
  return { ...fixture, storage, batch, assetId };
}

function publicObjectCount(storage: InMemoryObjectStorage): number {
  return [...storage.objects.keys()].filter((key) => key.startsWith("public:")).length;
}

describe("Finalize and Public Compensation mutual exclusion", () => {
  it("keeps original, first derivative, and complete derivative manifests standby during a valid lease beyond the former grace window", async () => {
    const cases: Array<{ point: AdminUploadFaultPoint; expectedWritten: number }> = [
      { point: "after_finalize_original_written", expectedWritten: 1 },
      { point: "after_finalize_first_variant_written", expectedWritten: 2 },
      { point: "before_finalize_publish_transaction", expectedWritten: 7 },
    ];
    for (const testCase of cases) {
      const fixture = await stage(`standby-${testCase.expectedWritten}`);
      const barrier = new AsyncBarrier();
      let currentTime = new Date();
      try {
        const finalizing = finalizeAdminUploadBatch(
          fixture.connection.db,
          fixture.storage,
          fixture.actor,
          fixture.batch.batchId,
          {
            now: currentTime,
            clock: () => currentTime,
            workerId: `standby-worker-${testCase.expectedWritten}`,
            leaseMilliseconds: 20 * 60_000,
            faultInjector: async (point) => {
              if (point === testCase.point) await barrier.pause();
            },
          },
        );
        await barrier.reached;
        const compensation = await fixture.connection.db.select().from(objectCleanupJobs)
          .where(and(
            eq(objectCleanupJobs.uploadBatchId, fixture.batch.batchId),
            eq(objectCleanupJobs.storagePartition, "public"),
          ));
        expect(compensation).toHaveLength(7);
        expect(compensation.every((job) => job.status === "standby" && job.armedAt === null)).toBe(true);
        expect(compensation.filter((job) => job.writeCompletedAt !== null)).toHaveLength(testCase.expectedWritten);
        expect(publicObjectCount(fixture.storage)).toBe(testCase.expectedWritten);

        currentTime = new Date(currentTime.getTime() + 6 * 60_000);
        const cleanup = await processPendingObjectCleanupJobs(
          fixture.connection.db,
          fixture.storage,
          { now: currentTime, workerId: `forbidden-cleanup-${testCase.expectedWritten}` },
        );
        expect(cleanup).toEqual({ attempted: 0, completed: 0, dead: 0 });
        expect(publicObjectCount(fixture.storage)).toBe(testCase.expectedWritten);
        barrier.release();
        await finalizing;
        expect(publicObjectCount(fixture.storage)).toBe(7);
        expect((await fixture.connection.db.select().from(objectCleanupJobs).where(and(
          eq(objectCleanupJobs.uploadBatchId, fixture.batch.batchId),
          eq(objectCleanupJobs.storagePartition, "public"),
        ))).every((job) => job.status === "cancelled")).toBe(true);
        expect((await fixture.connection.db.select().from(finalizeObjectManifestItems).where(
          eq(finalizeObjectManifestItems.uploadBatchId, fixture.batch.batchId),
        )).every((item) =>
          item.evidenceStatus === "verified" &&
          item.evidenceSource === "current_finalize_storage_verified" &&
          item.observedByteSize === item.byteSize &&
          item.observedMimeType === item.mimeType
        )).toBe(true);
      } finally {
        barrier.release();
        await fixture.connection.close();
      }
    }
  }, 60_000);

  it("refuses cleanup even if a compensation row is incorrectly armed while its Finalize lease is valid", async () => {
    const fixture = await stage("valid-lease-fencing");
    const barrier = new AsyncBarrier();
    try {
      const finalizing = finalizeAdminUploadBatch(
        fixture.connection.db,
        fixture.storage,
        fixture.actor,
        fixture.batch.batchId,
        {
          workerId: "valid-finalizer",
          leaseMilliseconds: 20 * 60_000,
          faultInjector: async (point) => {
            if (point === "after_finalize_original_written") await barrier.pause();
          },
        },
      );
      await barrier.reached;
      const [job] = await fixture.connection.db.select().from(objectCleanupJobs).where(and(
        eq(objectCleanupJobs.uploadBatchId, fixture.batch.batchId),
        eq(objectCleanupJobs.expectedObjectRole, "original"),
      ));
      if (!job) throw new Error("Missing compensation fixture.");
      await fixture.connection.db.update(objectCleanupJobs).set({
        status: "pending",
        armedAt: new Date(),
        armedReason: "TEST erroneous arm",
      }).where(eq(objectCleanupJobs.id, job.id));
      expect(await claimObjectCleanupJob(
        fixture.connection.db,
        job.id,
        "forbidden-cleaner",
      )).toBeNull();
      expect(fixture.storage.objects.has(`public:${job.objectKey}`)).toBe(true);
      await fixture.connection.db.update(objectCleanupJobs).set({
        status: "standby",
        armedAt: null,
        armedReason: null,
      }).where(eq(objectCleanupJobs.id, job.id));
      barrier.release();
      await finalizing;
    } finally {
      barrier.release();
      await fixture.connection.close();
    }
  }, 30_000);

  it("renews the Finalize lease during work and prevents recovery at the original expiry", async () => {
    const fixture = await stage("lease-heartbeat");
    const beforeOriginal = new AsyncBarrier();
    const afterOriginal = new AsyncBarrier();
    let currentTime = new Date();
    try {
      const finalizing = finalizeAdminUploadBatch(
        fixture.connection.db,
        fixture.storage,
        fixture.actor,
        fixture.batch.batchId,
        {
          now: currentTime,
          clock: () => currentTime,
          workerId: "heartbeat-finalizer",
          leaseMilliseconds: 1_000,
          faultInjector: async (point) => {
            if (point === "after_finalize_manifest_registered") await beforeOriginal.pause();
            if (point === "after_finalize_original_written") await afterOriginal.pause();
          },
        },
      );
      await beforeOriginal.reached;
      const initial = (await fixture.connection.db.select().from(uploadRecoveryJobs).where(and(
        eq(uploadRecoveryJobs.uploadBatchId, fixture.batch.batchId),
        eq(uploadRecoveryJobs.kind, "finalize"),
      )))[0];
      if (!initial?.leaseExpiresAt) throw new Error("Missing initial lease.");
      currentTime = new Date(currentTime.getTime() + 500);
      beforeOriginal.release();
      await afterOriginal.reached;
      const renewed = (await fixture.connection.db.select().from(uploadRecoveryJobs)
        .where(eq(uploadRecoveryJobs.id, initial.id)))[0];
      expect(renewed?.leaseExpiresAt?.getTime()).toBeGreaterThan(initial.leaseExpiresAt.getTime());
      expect((await processPendingUploadRecoveryJobs(fixture.connection.db, fixture.storage, {
        now: new Date(initial.leaseExpiresAt.getTime() + 1),
        workerId: "premature-recovery",
      })).attempted).toBe(0);
      afterOriginal.release();
      await finalizing;
      expect((await fixture.connection.db.select().from(assetUploadBatches)
        .where(eq(assetUploadBatches.id, fixture.batch.batchId)))[0]?.status).toBe("completed");
    } finally {
      beforeOriginal.release();
      afterOriginal.release();
      await fixture.connection.close();
    }
  }, 30_000);

  it("continues heartbeat renewal while a single slow storage operation is still in flight", async () => {
    const fixture = await setup("slow-storage-heartbeat");
    const storage = new SlowPublicPutStorage();
    const bytes = await imageBytes();
    const batch = await createAdminUploadBatch(fixture.connection.db, fixture.actor, {
      files: [{
        fileName: "TEST-slow-storage.jpg",
        declaredMimeType: "image/jpeg",
        declaredByteSize: bytes.byteLength,
      }],
      category: "product",
      role: "gallery",
      sortOrder: 0,
      associationType: "product",
      associationEntityId: fixture.productId,
      sourceDeclarationEnabled: false,
    }, { rateLimiter: allowLimiter });
    await completeAdminUploadIntent(
      fixture.connection.db,
      storage,
      new DevelopmentFileScanner(),
      fixture.actor,
      { token: batch.intents[0]!.token, bytes },
    );
    try {
      const finalizing = finalizeAdminUploadBatch(
        fixture.connection.db,
        storage,
        fixture.actor,
        batch.batchId,
        {
          workerId: "slow-storage-finalizer",
          leaseMilliseconds: 150,
        },
      );
      await storage.publicPut.reached;
      const initial = (await fixture.connection.db.select().from(uploadRecoveryJobs).where(and(
        eq(uploadRecoveryJobs.uploadBatchId, batch.batchId),
        eq(uploadRecoveryJobs.kind, "finalize"),
      )))[0];
      if (!initial?.leaseExpiresAt) throw new Error("Missing slow-operation lease.");
      await new Promise((resolve) => setTimeout(resolve, 350));
      const renewed = (await fixture.connection.db.select().from(uploadRecoveryJobs)
        .where(eq(uploadRecoveryJobs.id, initial.id)))[0];
      expect(renewed?.leaseExpiresAt?.getTime()).toBeGreaterThan(initial.leaseExpiresAt.getTime());
      expect((await processPendingUploadRecoveryJobs(fixture.connection.db, storage, {
        now: new Date(),
        workerId: "slow-operation-recovery",
      })).attempted).toBe(0);
      storage.publicPut.release();
      await finalizing;
    } finally {
      storage.publicPut.release();
      await fixture.connection.close();
    }
  }, 30_000);

  it("rolls back failure arming when Audit fails, then recovers from the durable manifest after restart", async () => {
    const fixture = await stage("failure-audit-recovery");
    const start = new Date();
    try {
      await expect(finalizeAdminUploadBatch(
        fixture.connection.db,
        fixture.storage,
        fixture.actor,
        fixture.batch.batchId,
        {
          now: start,
          clock: () => start,
          workerId: "audit-failing-finalizer",
          leaseMilliseconds: 1_000,
          faultInjector: (point) => {
            if (point === "before_finalize_publish_commit") {
              throw new Error("TEST publish transaction failure");
            }
          },
          auditWriter: async (db, input) => {
            if (input.action === "asset.finalize.recovery_required") {
              throw new Error("TEST recovery Audit outage");
            }
            const { writeAuditLog } = await import("@/audit/service");
            return writeAuditLog(db, input);
          },
        },
      )).rejects.toThrow(/recovery Audit outage/);
      const recovery = (await fixture.connection.db.select().from(uploadRecoveryJobs).where(and(
        eq(uploadRecoveryJobs.uploadBatchId, fixture.batch.batchId),
        eq(uploadRecoveryJobs.kind, "finalize"),
      )))[0];
      if (!recovery?.leaseExpiresAt) throw new Error("Missing durable Finalize Recovery.");
      const standby = await fixture.connection.db.select().from(objectCleanupJobs).where(and(
        eq(objectCleanupJobs.uploadBatchId, fixture.batch.batchId),
        eq(objectCleanupJobs.storagePartition, "public"),
      ));
      expect(standby).toHaveLength(7);
      expect(standby.every((job) => job.status === "standby" && job.armedAt === null)).toBe(true);
      expect(await fixture.connection.db.select().from(finalizeObjectManifestItems).where(
        eq(finalizeObjectManifestItems.recoveryJobId, recovery.id),
      )).toHaveLength(7);
      expect((await fixture.connection.db.select().from(assetUploadBatches)
        .where(eq(assetUploadBatches.id, fixture.batch.batchId)))[0]?.status).toBe("finalizing");

      expect(await recoverUploadRecoveryJob(
        fixture.connection.db,
        fixture.storage,
        recovery.id,
        {
          now: new Date(recovery.leaseExpiresAt.getTime() + 1),
          workerId: "restarted-recovery",
        },
      )).toBe("completed");
      expect(publicObjectCount(fixture.storage)).toBe(0);
      expect((await fixture.connection.db.select().from(objectCleanupJobs).where(and(
        eq(objectCleanupJobs.uploadBatchId, fixture.batch.batchId),
        eq(objectCleanupJobs.storagePartition, "public"),
      ))).every((job) => job.status === "completed")).toBe(true);
      expect((await fixture.connection.db.select().from(uploadRecoveryJobs)
        .where(eq(uploadRecoveryJobs.id, recovery.id)))[0]?.status).toBe("retryable");
      await expect(findPublicAssetForDelivery(fixture.connection.db, fixture.assetId)).resolves.toBeNull();
    } finally {
      await fixture.connection.close();
    }
  }, 30_000);

  it("recovers deterministic crashes after Manifest registration, original write, and derivative write", async () => {
    const points: AdminUploadFaultPoint[] = [
      "after_finalize_manifest_registered",
      "after_finalize_original_written",
      "after_finalize_first_variant_written",
    ];
    for (const point of points) {
      const fixture = await stage(`crash-${point}`);
      try {
        await expect(finalizeAdminUploadBatch(
          fixture.connection.db,
          fixture.storage,
          fixture.actor,
          fixture.batch.batchId,
          {
            workerId: `crashed-${point}`,
            faultInjector: (candidate) => {
              if (candidate === point) throw new Error(`TEST crash ${point}`);
            },
          },
        )).rejects.toThrow(`TEST crash ${point}`);
        const recovery = (await fixture.connection.db.select().from(uploadRecoveryJobs).where(and(
          eq(uploadRecoveryJobs.uploadBatchId, fixture.batch.batchId),
          eq(uploadRecoveryJobs.kind, "finalize"),
        )))[0];
        if (!recovery) throw new Error("Missing crash Recovery.");
        expect(await fixture.connection.db.select().from(finalizeObjectManifestItems)
          .where(eq(finalizeObjectManifestItems.recoveryJobId, recovery.id))).toHaveLength(7);
        expect(publicObjectCount(fixture.storage)).toBe(0);
        expect((await fixture.connection.db.select().from(objectCleanupJobs).where(and(
          eq(objectCleanupJobs.uploadBatchId, fixture.batch.batchId),
          eq(objectCleanupJobs.storagePartition, "public"),
        ))).every((job) => job.status === "completed")).toBe(true);
        expect((await fixture.connection.db.select().from(uploadRecoveryJobs)
          .where(eq(uploadRecoveryJobs.id, recovery.id)))[0]?.status).toBe("retryable");
        await expect(findPublicAssetForDelivery(fixture.connection.db, fixture.assetId)).resolves.toBeNull();
      } finally {
        await fixture.connection.close();
      }
    }
  }, 45_000);

  it("fails closed and repairs every forbidden compensation state, missing row, metadata mismatch, key mismatch, and missing object", async () => {
    const mutations = [
      "pending",
      "processing",
      "completed",
      "dead",
      "cancelled",
      "missing_row",
      "metadata_mismatch",
      "key_mismatch",
      "unverified_evidence",
      "missing_object",
    ] as const;
    for (const mutation of mutations) {
      const fixture = await stage(`preflight-${mutation}`);
      const barrier = new AsyncBarrier();
      try {
        const finalizing = finalizeAdminUploadBatch(
          fixture.connection.db,
          fixture.storage,
          fixture.actor,
          fixture.batch.batchId,
          {
            workerId: `preflight-${mutation}`,
            leaseMilliseconds: 20 * 60_000,
            faultInjector: async (point) => {
              if (point === "before_finalize_publish_transaction") await barrier.pause();
            },
          },
        );
        await barrier.reached;
        const jobs = await fixture.connection.db.select().from(objectCleanupJobs).where(and(
          eq(objectCleanupJobs.uploadBatchId, fixture.batch.batchId),
          eq(objectCleanupJobs.storagePartition, "public"),
        ));
        const target = jobs[0];
        if (!target) throw new Error("Missing compensation fixture.");
        const changedAt = new Date();
        if (mutation === "pending") {
          await fixture.connection.db.update(objectCleanupJobs).set({
            status: "pending", armedAt: changedAt, armedReason: "TEST mutation",
          }).where(eq(objectCleanupJobs.id, target.id));
        } else if (mutation === "processing") {
          await fixture.connection.db.update(objectCleanupJobs).set({
            status: "processing", armedAt: changedAt, armedReason: "TEST mutation",
            lockedBy: "TEST corrupt cleaner", lockedAt: changedAt,
            leaseExpiresAt: new Date(changedAt.getTime() + 60_000),
          }).where(eq(objectCleanupJobs.id, target.id));
        } else if (mutation === "completed") {
          await fixture.connection.db.update(objectCleanupJobs).set({
            status: "completed", armedAt: changedAt, armedReason: "TEST mutation",
            completedAt: changedAt,
          }).where(eq(objectCleanupJobs.id, target.id));
        } else if (mutation === "dead") {
          await fixture.connection.db.update(objectCleanupJobs).set({
            status: "dead", armedAt: changedAt, armedReason: "TEST mutation",
          }).where(eq(objectCleanupJobs.id, target.id));
        } else if (mutation === "cancelled") {
          await fixture.connection.db.update(objectCleanupJobs).set({ status: "cancelled" })
            .where(eq(objectCleanupJobs.id, target.id));
        } else if (mutation === "missing_row") {
          await fixture.connection.db.delete(objectCleanupJobs).where(eq(objectCleanupJobs.id, target.id));
        } else if (mutation === "metadata_mismatch") {
          await fixture.connection.db.update(objectCleanupJobs).set({ expectedMimeType: "image/gif" })
            .where(eq(objectCleanupJobs.id, target.id));
        } else if (mutation === "key_mismatch") {
          await fixture.connection.db.update(objectCleanupJobs).set({ objectKey: `${target.objectKey}.TEST-tampered` })
            .where(eq(objectCleanupJobs.id, target.id));
        } else if (mutation === "unverified_evidence") {
          await fixture.connection.db.update(finalizeObjectManifestItems).set({
            evidenceStatus: "unverified",
            evidenceSource: "TEST-forced-unverified",
            evidenceVerifiedAt: null,
          }).where(eq(finalizeObjectManifestItems.id, target.finalizeManifestItemId!));
        } else {
          await fixture.storage.delete("public", target.objectKey);
        }
        barrier.release();
        await expect(finalizing, mutation).rejects.toThrow(/failed closed|incomplete/i);
        expect((await fixture.connection.db.select().from(assets)
          .where(eq(assets.id, fixture.assetId)))[0]).toMatchObject({
          storagePartition: "private",
          access: "internal",
  });

        await expect(findPublicAssetForDelivery(fixture.connection.db, fixture.assetId)).resolves.toBeNull();
        expect([...fixture.storage.objects.keys()].filter((key) =>
          key.startsWith(`public:`) && !key.includes("TEST-tampered"),
        )).toHaveLength(0);
      } finally {
        barrier.release();
        await fixture.connection.close();
      }
    }
  }, 90_000);

  it("fails closed when the Finalize lease expires during the locked object-existence preflight", async () => {
    let currentTime = new Date();
    const leaseMilliseconds = 20 * 60_000;
    const storage = new CommitPreflightExpiryStorage(() => {
      currentTime = new Date(currentTime.getTime() + leaseMilliseconds + 1);
    });
    const fixture = await stage("commit-preflight-expiry", storage);
    try {
      await expect(finalizeAdminUploadBatch(
        fixture.connection.db,
        fixture.storage,
        fixture.actor,
        fixture.batch.batchId,
        {
          now: currentTime,
          clock: () => currentTime,
          workerId: "commit-preflight-expiry-worker",
          leaseMilliseconds,
        },
      )).rejects.toThrow(/lease/i);
      expect((await fixture.connection.db.select().from(assets)
        .where(eq(assets.id, fixture.assetId)))[0]).toMatchObject({
        storagePartition: "private",
        access: "internal",
      });
      expect(await findPublicAssetForDelivery(fixture.connection.db, fixture.assetId)).toBeNull();
      expect(publicObjectCount(fixture.storage)).toBe(7);

      const recovered = await processPendingUploadRecoveryJobs(
        fixture.connection.db,
        fixture.storage,
        { now: currentTime, workerId: "commit-preflight-expiry-recovery" },
      );
      expect(recovered.attempted).toBe(1);
      expect(publicObjectCount(fixture.storage)).toBe(0);
      expect((await fixture.connection.db.select().from(assetUploadBatches)
        .where(eq(assetUploadBatches.id, fixture.batch.batchId)))[0]?.status).toBe("failed");
    } finally {
      await fixture.connection.close();
    }
  }, 30_000);

  it("serializes an explicit failure arm racing the success commit and never exposes a Public Asset with a missing object", async () => {
    const fixture = await stage("success-failure-race");
    const barrier = new AsyncBarrier();
    const workerId = "success-failure-worker";
    try {
      const finalizing = finalizeAdminUploadBatch(
        fixture.connection.db,
        fixture.storage,
        fixture.actor,
        fixture.batch.batchId,
        {
          workerId,
          leaseMilliseconds: 20 * 60_000,
          faultInjector: async (point) => {
            if (point === "before_finalize_publish_transaction") await barrier.pause();
          },
        },
      );
      await barrier.reached;
      const recovery = (await fixture.connection.db.select().from(uploadRecoveryJobs).where(and(
        eq(uploadRecoveryJobs.uploadBatchId, fixture.batch.batchId),
        eq(uploadRecoveryJobs.kind, "finalize"),
      )))[0];
      if (!recovery?.leaseExpiresAt) throw new Error("Missing race Recovery lease.");
      const lease: UploadRecoveryLease = {
        id: recovery.id,
        workerId,
        version: recovery.version,
        attemptCount: recovery.attemptCount,
        leaseExpiresAt: recovery.leaseExpiresAt,
      };
      const forcedFailure = markFinalizeRecoveryRequired(
        fixture.connection.db,
        lease,
        fixture.batch.batchId,
        new Error("TEST concurrent failure"),
      );
      barrier.release();
      const outcomes = await Promise.allSettled([forcedFailure, finalizing]);
      expect(outcomes.some((outcome) => outcome.status === "fulfilled")).toBe(true);
      await processPendingObjectCleanupJobs(fixture.connection.db, fixture.storage, {
        workerId: "race-cleaner",
        now: new Date(Date.now() + 60_000),
      });
      const asset = (await fixture.connection.db.select().from(assets)
        .where(eq(assets.id, fixture.assetId)))[0];
      if (asset?.storagePartition === "public") {
        expect(await fixture.storage.exists("public", asset.objectKey)).toBe(true);
        expect(await findPublicAssetForDelivery(fixture.connection.db, fixture.assetId)).not.toBeNull();
      } else {
        expect(await findPublicAssetForDelivery(fixture.connection.db, fixture.assetId)).toBeNull();
        expect(publicObjectCount(fixture.storage)).toBe(0);
      }
    } finally {
      barrier.release();
      await fixture.connection.close();
    }
  }, 30_000);

  it("does not steal or reset an active Cleanup lease while Recovery repairs the remaining Manifest projection", async () => {
    const fixture = await stage("recovery-cleanup-lease");
    const barrier = new AsyncBarrier();
    const workerId = "recovery-cleanup-finalizer";
    try {
      const finalizing = finalizeAdminUploadBatch(
        fixture.connection.db,
        fixture.storage,
        fixture.actor,
        fixture.batch.batchId,
        {
          workerId,
          leaseMilliseconds: 20 * 60_000,
          faultInjector: async (point) => {
            if (point === "before_finalize_publish_transaction") await barrier.pause();
          },
        },
      );
      await barrier.reached;
      const recovery = (await fixture.connection.db.select().from(uploadRecoveryJobs).where(and(
        eq(uploadRecoveryJobs.uploadBatchId, fixture.batch.batchId),
        eq(uploadRecoveryJobs.kind, "finalize"),
      )))[0];
      if (!recovery?.leaseExpiresAt) throw new Error("Missing Finalize Recovery.");
      await markFinalizeRecoveryRequired(
        fixture.connection.db,
        {
          id: recovery.id,
          workerId,
          version: recovery.version,
          attemptCount: recovery.attemptCount,
          leaseExpiresAt: recovery.leaseExpiresAt,
        },
        fixture.batch.batchId,
        new Error("TEST explicit failure before cleanup race"),
      );
      const [cleanup] = await fixture.connection.db.select().from(objectCleanupJobs).where(and(
        eq(objectCleanupJobs.uploadBatchId, fixture.batch.batchId),
        eq(objectCleanupJobs.storagePartition, "public"),
        eq(objectCleanupJobs.status, "pending"),
      ));
      if (!cleanup) throw new Error("Missing armed Cleanup.");
      const cleanupStartedAt = new Date();
      expect(await claimObjectCleanupJob(
        fixture.connection.db,
        cleanup.id,
        "active-cleaner",
        cleanupStartedAt,
        60_000,
      )).toBeTruthy();
      expect(await recoverUploadRecoveryJob(
        fixture.connection.db,
        fixture.storage,
        recovery.id,
        { now: new Date(cleanupStartedAt.getTime() + 1), workerId: "repair-worker" },
      )).toBe("retryable");
      expect((await fixture.connection.db.select().from(objectCleanupJobs)
        .where(eq(objectCleanupJobs.id, cleanup.id)))[0]).toMatchObject({
        status: "processing",
        lockedBy: "active-cleaner",
      });
      expect(await processObjectCleanupJob(
        fixture.connection.db,
        fixture.storage,
        cleanup.id,
        {
          now: new Date(cleanupStartedAt.getTime() + 60_001),
          workerId: "expired-cleanup-takeover",
        },
      )).toBe("completed");
      expect(publicObjectCount(fixture.storage)).toBe(0);
      barrier.release();
      await expect(finalizing).rejects.toThrow(/changed|lease|version/i);
    } finally {
      barrier.release();
      await fixture.connection.close();
    }
  }, 30_000);

  it("fails closed before Storage delete for every locked Cleanup identity projection mismatch", async () => {
    const mismatches = [
      "batch",
      "intent",
      "recovery",
      "recovery_version",
      "attempt",
      "manifest_item",
      "asset",
      "object_key",
      "role",
      "mime",
      "byte_size",
    ] as const;
    for (const mismatch of mismatches) {
      const storage = new DeleteTrackingStorage();
      const fixture = await stage(`cleanup-identity-${mismatch}`, storage);
      const barrier = new AsyncBarrier();
      const workerId = `cleanup-identity-finalizer-${mismatch}`;
      try {
        const finalizing = finalizeAdminUploadBatch(
          fixture.connection.db,
          storage,
          fixture.actor,
          fixture.batch.batchId,
          {
            workerId,
            leaseMilliseconds: 20 * 60_000,
            faultInjector: async (point) => {
              if (point === "before_finalize_publish_transaction") await barrier.pause();
            },
          },
        );
        await barrier.reached;
        const recovery = (await fixture.connection.db.select().from(uploadRecoveryJobs).where(and(
          eq(uploadRecoveryJobs.uploadBatchId, fixture.batch.batchId),
          eq(uploadRecoveryJobs.kind, "finalize"),
        )))[0];
        if (!recovery?.leaseExpiresAt) throw new Error("Missing Finalize Recovery.");
        await markFinalizeRecoveryRequired(
          fixture.connection.db,
          {
            id: recovery.id,
            workerId,
            version: recovery.version,
            attemptCount: recovery.attemptCount,
            leaseExpiresAt: recovery.leaseExpiresAt,
          },
          fixture.batch.batchId,
          new Error("TEST arm Cleanup identity mismatch"),
        );
        const jobs = await fixture.connection.db.select().from(objectCleanupJobs).where(and(
          eq(objectCleanupJobs.uploadBatchId, fixture.batch.batchId),
          eq(objectCleanupJobs.storagePartition, "public"),
          eq(objectCleanupJobs.status, "pending"),
        ));
        const job = jobs.find((candidate) => candidate.expectedObjectRole === "original")!;
        const otherManifest = (await fixture.connection.db.select().from(finalizeObjectManifestItems).where(
          eq(finalizeObjectManifestItems.recoveryJobId, recovery.id),
        )).find((item) => item.id !== job.finalizeManifestItemId)!;
        const [intent] = await fixture.connection.db.select().from(uploadIntents).where(
          eq(uploadIntents.uploadBatchId, fixture.batch.batchId),
        );
        const stagingRecovery = (await fixture.connection.db.select().from(uploadRecoveryJobs).where(and(
          eq(uploadRecoveryJobs.uploadBatchId, fixture.batch.batchId),
          eq(uploadRecoveryJobs.kind, "staging"),
        )))[0]!;
        if (mismatch === "batch") {
          const [otherBatch] = await fixture.connection.db.insert(assetUploadBatches).values({
            status: "failed",
            declaredFileCount: 1,
            expiresAt: new Date(Date.now() + 60_000),
          }).returning({ id: assetUploadBatches.id });
          await fixture.connection.db.update(objectCleanupJobs).set({ uploadBatchId: otherBatch!.id })
            .where(eq(objectCleanupJobs.id, job.id));
        } else if (mismatch === "intent") {
          await fixture.connection.db.update(objectCleanupJobs).set({ uploadIntentId: intent!.id })
            .where(eq(objectCleanupJobs.id, job.id));
        } else if (mismatch === "recovery") {
          await fixture.connection.db.update(objectCleanupJobs).set({
            finalizeRecoveryId: stagingRecovery.id,
            recoveryVersion: stagingRecovery.version,
          }).where(eq(objectCleanupJobs.id, job.id));
        } else if (mismatch === "recovery_version") {
          await fixture.connection.db.update(objectCleanupJobs).set({ recoveryVersion: job.recoveryVersion! + 1 })
            .where(eq(objectCleanupJobs.id, job.id));
        } else if (mismatch === "attempt") {
          await fixture.connection.db.update(objectCleanupJobs).set({ finalizeAttempt: job.finalizeAttempt! + 1 })
            .where(eq(objectCleanupJobs.id, job.id));
        } else if (mismatch === "manifest_item") {
          await fixture.connection.db.update(objectCleanupJobs).set({ finalizeManifestItemId: otherManifest.id })
            .where(eq(objectCleanupJobs.id, job.id));
        } else if (mismatch === "asset") {
          const [otherAsset] = await fixture.connection.db.insert(assets).values({
            originalFileName: "TEST-cleanup-identity-other.jpg",
            storageProvider: "test",
            storagePartition: "private",
            objectKey: `TEST/cleanup-identity-${mismatch}.jpg`,
            access: "internal",
            category: "product",
            status: "ready",
            declaredMimeType: "image/jpeg",
            detectedMimeType: "image/jpeg",
            byteSize: 1,
            sha256: "TEST-cleanup-identity-other",
            scanStatus: "passed",
          }).returning({ id: assets.id });
          await fixture.connection.db.update(objectCleanupJobs).set({ assetId: otherAsset!.id })
            .where(eq(objectCleanupJobs.id, job.id));
        } else if (mismatch === "object_key") {
          await fixture.connection.db.update(objectCleanupJobs).set({ objectKey: `${job.objectKey}.TEST-mismatch` })
            .where(eq(objectCleanupJobs.id, job.id));
        } else if (mismatch === "role") {
          await fixture.connection.db.update(objectCleanupJobs).set({ expectedObjectRole: "variant" })
            .where(eq(objectCleanupJobs.id, job.id));
        } else if (mismatch === "mime") {
          await fixture.connection.db.update(objectCleanupJobs).set({ expectedMimeType: "image/png" })
            .where(eq(objectCleanupJobs.id, job.id));
        } else {
          await fixture.connection.db.update(objectCleanupJobs).set({ expectedByteSize: job.expectedByteSize! + 1 })
            .where(eq(objectCleanupJobs.id, job.id));
        }
        storage.deleteCalls = 0;
        if (mismatch === "role") {
          await expect(processObjectCleanupJob(
            fixture.connection.db,
            storage,
            job.id,
            {
              workerId: "cleanup-identity-audit-failure",
              auditWriter: async () => {
                throw new Error("TEST Cleanup identity Audit failure");
              },
            },
          )).rejects.toThrow(/Audit failure/);
          expect(storage.deleteCalls).toBe(0);
          expect((await fixture.connection.db.select().from(objectCleanupJobs)
            .where(eq(objectCleanupJobs.id, job.id)))[0]?.status).toBe("pending");
        }
        await expect(processObjectCleanupJob(
          fixture.connection.db,
          storage,
          job.id,
          { workerId: `cleanup-identity-worker-${mismatch}` },
        ), mismatch).resolves.toBe("not_claimed");
        expect(storage.deleteCalls, mismatch).toBe(0);
        expect((await fixture.connection.db.select().from(objectCleanupJobs)
          .where(eq(objectCleanupJobs.id, job.id)))[0], mismatch).toMatchObject({
          status: "dead",
          armedReason: "cleanup_identity_mismatch_manual_review",
        });
        expect(await fixture.connection.db.select().from(auditLogs).where(and(
          eq(auditLogs.action, "object_cleanup.identity_mismatch"),
          eq(auditLogs.entityId, job.id),
        )), mismatch).toHaveLength(1);
        barrier.release();
        await expect(finalizing).rejects.toThrow();
      } finally {
        barrier.release();
        await fixture.connection.close();
      }
    }
  }, 120_000);

  it("keeps historical inferred Manifest evidence nonpublic until byte-backed audited storage revalidation", async () => {
    const connection = await createTestDatabase();
    const storage = new InMemoryObjectStorage();
    try {
      const bytes = await imageBytes();
      const variantBytes = new Uint8Array(await sharp(bytes).webp().toBuffer());
      const [batch] = await connection.db.insert(assetUploadBatches).values({
        status: "completed",
        declaredFileCount: 1,
        completedFileCount: 1,
        expiresAt: new Date(Date.now() + 60_000),
        completedAt: new Date(),
      }).returning({ id: assetUploadBatches.id });
      if (!batch) throw new Error("Missing Batch.");
      const [asset] = await connection.db.insert(assets).values({
        uploadBatchId: batch.id,
        originalFileName: "TEST-historical-evidence.jpg",
        storageProvider: "test",
        storagePartition: "public",
        objectKey: "TEST/historical-evidence.jpg",
        access: "public",
        category: "product",
        status: "ready",
        declaredMimeType: "image/jpeg",
        detectedMimeType: "image/jpeg",
        byteSize: 1,
        sha256: "TEST-historical-evidence",
        scanStatus: "passed",
      }).returning({ id: assets.id, objectKey: assets.objectKey });
      if (!asset) throw new Error("Missing Asset.");
      const variantKey = `${asset.objectKey}.variants/TEST-historical.webp`;
      const [variant] = await connection.db.insert(assetVariants).values({
        sourceAssetId: asset.id,
        format: "webp",
        variantKey: "TEST-historical",
        objectKey: variantKey,
        byteSize: 1,
      }).returning({ id: assetVariants.id });
      if (!variant) throw new Error("Missing Variant.");
      const [recovery] = await connection.db.insert(uploadRecoveryJobs).values({
        kind: "finalize",
        uploadBatchId: batch.id,
        status: "completed",
        stage: "completed",
        attemptCount: 1,
        version: 7,
        completedAt: new Date(),
        expiresAt: new Date(Date.now() + 60_000),
      }).returning({ id: uploadRecoveryJobs.id, version: uploadRecoveryJobs.version });
      if (!recovery) throw new Error("Missing Recovery.");
      const [manifest] = await connection.db.insert(finalizeObjectManifestItems).values({
        recoveryJobId: recovery.id,
        uploadBatchId: batch.id,
        finalizeAttempt: 1,
        assetId: asset.id,
        objectKey: asset.objectKey,
        objectRole: "original",
        mimeType: "image/jpeg",
        byteSize: 1,
        writeCompletedAt: new Date(0),
        evidenceStatus: "unverified",
        evidenceSource: "migration_0015_legacy_inferred",
      }).returning({ id: finalizeObjectManifestItems.id });
      if (!manifest) throw new Error("Missing Manifest.");
      const [supersededManifest] = await connection.db.insert(finalizeObjectManifestItems).values({
        recoveryJobId: recovery.id,
        uploadBatchId: batch.id,
        finalizeAttempt: 0,
        assetId: asset.id,
        objectKey: `${asset.objectKey}.superseded-attempt`,
        objectRole: "variant",
        mimeType: "image/webp",
        byteSize: 1,
        writeCompletedAt: new Date(0),
        evidenceStatus: "unverified",
        evidenceSource: "migration_0015_legacy_inferred",
      }).returning({ id: finalizeObjectManifestItems.id });
      if (!supersededManifest) throw new Error("Missing superseded Manifest.");
      const [variantManifest] = await connection.db.insert(finalizeObjectManifestItems).values({
        recoveryJobId: recovery.id,
        uploadBatchId: batch.id,
        finalizeAttempt: 1,
        assetId: asset.id,
        objectKey: variantKey,
        objectRole: "variant",
        mimeType: "image/webp",
        byteSize: 1,
        writeCompletedAt: new Date(0),
        evidenceStatus: "unverified",
        evidenceSource: "migration_0015_legacy_inferred",
      }).returning({ id: finalizeObjectManifestItems.id });
      if (!variantManifest) throw new Error("Missing Variant Manifest.");
      await connection.db.insert(objectCleanupJobs).values({
        uploadBatchId: batch.id,
        assetId: asset.id,
        storagePartition: "public",
        objectKey: asset.objectKey,
        reason: "TEST-historical-evidence",
        cleanupKind: "finalize_public",
        status: "cancelled",
        finalizeRecoveryId: recovery.id,
        recoveryVersion: recovery.version,
        finalizeAttempt: 1,
        finalizeManifestItemId: manifest.id,
        expectedObjectRole: "original",
        expectedMimeType: "image/jpeg",
        expectedByteSize: 1,
        writeCompletedAt: new Date(0),
      });
      await connection.db.insert(objectCleanupJobs).values({
        uploadBatchId: batch.id,
        assetId: asset.id,
        storagePartition: "public",
        objectKey: variantKey,
        reason: "TEST-historical-variant-evidence",
        cleanupKind: "finalize_public",
        status: "cancelled",
        finalizeRecoveryId: recovery.id,
        recoveryVersion: recovery.version,
        finalizeAttempt: 1,
        finalizeManifestItemId: variantManifest.id,
        expectedObjectRole: "variant",
        expectedMimeType: "image/webp",
        expectedByteSize: 1,
        writeCompletedAt: new Date(0),
      });
      await storage.put("public", asset.objectKey, bytes, "image/jpeg");
      await storage.put("public", variantKey, variantBytes, "image/webp");
      expect(await connection.db.select({ id: assets.id }).from(assets).where(and(
        eq(assets.id, asset.id),
        publicReadyAssetSqlConditions(),
      ))).toHaveLength(0);
      await expect(revalidateHistoricalFinalizeManifest(
        connection.db,
        storage,
        recovery.id,
        { auditWriter: async () => { throw new Error("TEST evidence Audit failure"); } },
      )).rejects.toThrow(/Audit failure/);
      expect((await connection.db.select().from(finalizeObjectManifestItems)
        .where(eq(finalizeObjectManifestItems.id, manifest.id)))[0]).toMatchObject({
        evidenceStatus: "unverified",
        observedByteSize: null,
      });
      await expect(revalidateHistoricalFinalizeManifest(
        connection.db,
        storage,
        recovery.id,
      )).resolves.toBe(2);
      expect((await connection.db.select().from(finalizeObjectManifestItems)
        .where(eq(finalizeObjectManifestItems.id, manifest.id)))[0]).toMatchObject({
        evidenceStatus: "verified",
        evidenceSource: "historical_storage_revalidation",
        observedByteSize: bytes.byteLength,
        observedMimeType: "image/jpeg",
        byteSize: bytes.byteLength,
        writeCompletedAt: new Date(0),
      });
      expect((await connection.db.select().from(finalizeObjectManifestItems)
        .where(eq(finalizeObjectManifestItems.id, variantManifest.id)))[0]).toMatchObject({
        evidenceStatus: "verified",
        evidenceSource: "historical_storage_revalidation",
        observedByteSize: variantBytes.byteLength,
        observedMimeType: "image/webp",
        byteSize: variantBytes.byteLength,
        writeCompletedAt: new Date(0),
      });
      expect((await connection.db.select().from(finalizeObjectManifestItems)
        .where(eq(finalizeObjectManifestItems.id, supersededManifest.id)))[0]?.evidenceStatus)
        .toBe("unverified");
      expect((await connection.db.select({ byteSize: assets.byteSize }).from(assets)
        .where(eq(assets.id, asset.id)))[0]?.byteSize).toBe(bytes.byteLength);
      expect((await connection.db.select({ byteSize: assetVariants.byteSize }).from(assetVariants)
        .where(eq(assetVariants.id, variant.id)))[0]?.byteSize).toBe(variantBytes.byteLength);
      expect(await connection.db.select({ id: assets.id }).from(assets).where(and(
        eq(assets.id, asset.id),
        publicReadyAssetSqlConditions(),
      ))).toHaveLength(1);
      expect(await connection.db.select().from(auditLogs).where(and(
        eq(auditLogs.action, "asset.finalize.historical_storage_evidence_verified"),
        eq(auditLogs.entityId, recovery.id),
      ))).toHaveLength(1);
    } finally {
      await connection.close();
    }
  });
});
