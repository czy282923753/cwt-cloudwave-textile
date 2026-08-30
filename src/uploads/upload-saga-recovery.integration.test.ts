import { and, eq } from "drizzle-orm";
import sharp from "sharp";
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { writeAuditLog } from "@/audit/service";
import {
  assetUploadBatches,
  assets,
  auditLogs,
  authSessions,
  finalizeObjectManifestItems,
  objectCleanupJobs,
  productTaxonomyTerms,
  products,
  taxonomyTerms,
  uploadIntents,
  uploadRecoveryJobs,
  users,
} from "@/db/schema";
import { InMemoryObjectStorage } from "@/test/in-memory-storage";
import { createTestDatabase } from "@/test/database";

import {
  completeAdminUploadIntent,
  createAdminUploadBatch,
  finalizeAdminUploadBatch,
  type AdminUploadActor,
  type AdminUploadFaultPoint,
} from "./admin-upload-service";
import {
  processObjectCleanupJob,
  UPLOAD_RECOVERY_SYSTEM_ACTOR,
} from "./object-cleanup-service";
import { DevelopmentFileScanner } from "./scanner";
import {
  advanceUploadRecoveryStage,
  processPendingUploadRecoveryJobs,
  recoverUploadRecoveryJob,
} from "./upload-recovery-service";

const allowLimiter = {
  consume: async () => ({ kind: "allowed" as const, remaining: 29, retryAfterMs: 60_000 }),
};

class RecoveryStorage extends InMemoryObjectStorage {
  failPrivatePutAfterPersist = false;
  failDeletes = 0;

  override async put(...args: Parameters<InMemoryObjectStorage["put"]>) {
    const result = await super.put(...args);
    if (args[0] === "private" && this.failPrivatePutAfterPersist) {
      this.failPrivatePutAfterPersist = false;
      throw new Error("TEST private put persisted before process failure");
    }
    return result;
  }

  override async delete(...args: Parameters<InMemoryObjectStorage["delete"]>) {
    if (this.failDeletes > 0) {
      this.failDeletes -= 1;
      throw new Error("TEST storage cleanup failure");
    }
    return super.delete(...args);
  }
}

async function imageBytes(): Promise<Uint8Array> {
  return new Uint8Array(await sharp({
    create: { width: 12, height: 12, channels: 3, background: "#147d7e" },
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
    expiresAt: new Date(Date.now() + 60 * 60_000),
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

async function createBatch(
  fixture: Awaited<ReturnType<typeof setup>>,
  label: string,
  bytes: Uint8Array,
) {
  return createAdminUploadBatch(fixture.connection.db, fixture.actor, {
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
}

async function stageBatch(
  fixture: Awaited<ReturnType<typeof setup>>,
  storage: RecoveryStorage,
  label: string,
) {
  const bytes = await imageBytes();
  const batch = await createBatch(fixture, label, bytes);
  const assetId = await completeAdminUploadIntent(
    fixture.connection.db,
    storage,
    new DevelopmentFileScanner(),
    fixture.actor,
    { token: batch.intents[0]!.token, bytes },
  );
  return { batch, assetId, bytes };
}

describe("Admin Upload persistent Saga and Finalize lease", () => {
  it("rolls back every preregistration failure before storage.put", async () => {
    const fixture = await setup("saga-preregister");
    const storage = new RecoveryStorage();
    const bytes = await imageBytes();
    try {
      const cases: Array<{
        label: string;
        options: Parameters<typeof completeAdminUploadIntent>[5];
      }> = [
        {
          label: "recovery-insert-failure",
          options: { faultInjector: (point) => {
            if (point === "before_recovery_job_insert") throw new Error("TEST Recovery insert failure");
          } },
        },
        {
          label: "transaction-before-commit-failure",
          options: { faultInjector: (point) => {
            if (point === "before_preregister_commit") throw new Error("TEST preregistration transaction failure");
          } },
        },
        {
          label: "preregister-audit-failure",
          options: { auditWriter: async () => {
            throw new Error("TEST preregistration Audit failure");
          } },
        },
      ];
      for (const testCase of cases) {
        const batch = await createBatch(fixture, testCase.label, bytes);
        await expect(completeAdminUploadIntent(
          fixture.connection.db,
          storage,
          new DevelopmentFileScanner(),
          fixture.actor,
          { token: batch.intents[0]!.token, bytes },
          testCase.options,
        )).rejects.toThrow(/TEST/);
        expect(storage.objects.size, testCase.label).toBe(0);
        expect(await fixture.connection.db.select().from(assets)
          .where(eq(assets.uploadBatchId, batch.batchId)), testCase.label).toHaveLength(0);
        expect(await fixture.connection.db.select().from(uploadRecoveryJobs)
          .where(eq(uploadRecoveryJobs.uploadBatchId, batch.batchId)), testCase.label).toHaveLength(0);
        expect(await fixture.connection.db.select().from(objectCleanupJobs)
          .where(eq(objectCleanupJobs.uploadBatchId, batch.batchId)), testCase.label).toHaveLength(0);
        expect((await fixture.connection.db.select().from(uploadIntents)
          .where(eq(uploadIntents.uploadBatchId, batch.batchId)))[0]?.status).toBe("created");
        expect((await fixture.connection.db.select().from(assetUploadBatches)
          .where(eq(assetUploadBatches.id, batch.batchId)))[0]?.status).toBe("created");
      }
    } finally {
      await fixture.connection.close();
    }
  }, 30_000);

  it("recovers every post-write staging failure from persisted database state", async () => {
    const fixture = await setup("saga-post-write");
    const storage = new RecoveryStorage();
    const bytes = await imageBytes();
    try {
      const faultPoints: AdminUploadFaultPoint[] = [
        "after_staging_put",
        "after_scan_success",
        "before_asset_complete_update",
        "before_intent_complete_update",
        "before_batch_complete_update",
      ];
      for (const point of faultPoints) {
        const batch = await createBatch(fixture, point, bytes);
        await expect(completeAdminUploadIntent(
          fixture.connection.db,
          storage,
          new DevelopmentFileScanner(),
          fixture.actor,
          { token: batch.intents[0]!.token, bytes },
          {
            workerId: `staging-${point}`,
            faultInjector: (candidate) => {
              if (candidate === point) throw new Error(`TEST ${point}`);
            },
          },
        )).rejects.toThrow(`TEST ${point}`);
        const recovery = (await fixture.connection.db.select().from(uploadRecoveryJobs)
          .where(eq(uploadRecoveryJobs.uploadBatchId, batch.batchId)))[0];
        const asset = (await fixture.connection.db.select().from(assets)
          .where(eq(assets.uploadBatchId, batch.batchId)))[0];
        if (!recovery?.leaseExpiresAt || !asset) throw new Error("Missing persisted recovery state.");
        expect(recovery.objectKey).toBe(asset.objectKey);
        expect(storage.objects.has(`private:${asset.objectKey}`)).toBe(true);
        expect(asset).toMatchObject({ storagePartition: "private", access: "internal" });
        expect(asset.status).not.toBe("published");
        expect((await fixture.connection.db.select().from(objectCleanupJobs).where(and(
          eq(objectCleanupJobs.assetId, asset.id),
          eq(objectCleanupJobs.storagePartition, "private"),
        )))).toHaveLength(1);
        await processPendingUploadRecoveryJobs(fixture.connection.db, storage, {
          workerId: `recovery-${point}`,
          now: new Date(recovery.leaseExpiresAt.getTime() + 1),
        });
        expect(storage.objects.has(`private:${asset.objectKey}`)).toBe(false);
        expect((await fixture.connection.db.select().from(assets)
          .where(eq(assets.id, asset.id)))[0]?.status).toBe("deleted");
        expect((await fixture.connection.db.select().from(uploadIntents)
          .where(eq(uploadIntents.uploadBatchId, batch.batchId)))[0]?.status).toBe("failed");
        expect((await fixture.connection.db.select().from(assetUploadBatches)
          .where(eq(assetUploadBatches.id, batch.batchId)))[0]?.status).toBe("failed");
      }

      const putFailure = await createBatch(fixture, "put-persisted-failure", bytes);
      storage.failPrivatePutAfterPersist = true;
      await expect(completeAdminUploadIntent(
        fixture.connection.db,
        storage,
        new DevelopmentFileScanner(),
        fixture.actor,
        { token: putFailure.intents[0]!.token, bytes },
      )).rejects.toThrow(/put persisted/);
      const putRecovery = (await fixture.connection.db.select().from(uploadRecoveryJobs)
        .where(eq(uploadRecoveryJobs.uploadBatchId, putFailure.batchId)))[0];
      if (!putRecovery?.leaseExpiresAt) throw new Error("Missing persisted put Recovery.");
      expect(storage.objects.has(`private:${putRecovery.objectKey}`)).toBe(true);
      await processPendingUploadRecoveryJobs(fixture.connection.db, storage, {
        workerId: "put-crash-restart-worker",
        now: new Date(putRecovery.leaseExpiresAt.getTime() + 1),
      });
      expect(storage.objects.has(`private:${putRecovery.objectKey}`)).toBe(false);

      for (const key of [...storage.objects.keys()].filter((value) => value.startsWith("private:staging/admin/"))) {
        const objectKey = key.slice("private:".length);
        const matching = await fixture.connection.db.select({ id: uploadRecoveryJobs.id })
          .from(uploadRecoveryJobs).where(and(
            eq(uploadRecoveryJobs.storagePartition, "private"),
            eq(uploadRecoveryJobs.objectKey, objectKey),
          ));
        expect(matching, objectKey).not.toHaveLength(0);
      }
    } finally {
      await fixture.connection.close();
    }
  }, 45_000);

  it("keeps recovery retryable when the same Audit writer or cleanup reconciliation fails", async () => {
    const fixture = await setup("saga-audit-retry");
    const storage = new RecoveryStorage();
    const bytes = await imageBytes();
    try {
      const batch = await createBatch(fixture, "completion-audit", bytes);
      let auditCalls = 0;
      const persistentAfterPreregisterFailure: typeof writeAuditLog = async (db, input) => {
        auditCalls += 1;
        if (auditCalls > 1) throw new Error("TEST persistent Audit outage");
        return writeAuditLog(db, input);
      };
      await expect(completeAdminUploadIntent(
        fixture.connection.db,
        storage,
        new DevelopmentFileScanner(),
        fixture.actor,
        { token: batch.intents[0]!.token, bytes },
        { auditWriter: persistentAfterPreregisterFailure },
      )).rejects.toThrow(/persistent Audit outage/);
      const recovery = (await fixture.connection.db.select().from(uploadRecoveryJobs)
        .where(eq(uploadRecoveryJobs.uploadBatchId, batch.batchId)))[0];
      const asset = (await fixture.connection.db.select().from(assets)
        .where(eq(assets.uploadBatchId, batch.batchId)))[0];
      if (!recovery?.leaseExpiresAt || !asset) throw new Error("Missing durable Recovery.");
      await expect(recoverUploadRecoveryJob(
        fixture.connection.db,
        storage,
        recovery.id,
        {
          now: new Date(recovery.leaseExpiresAt.getTime() + 1),
          workerId: "persistent-audit-worker",
          auditWriter: persistentAfterPreregisterFailure,
        },
      )).rejects.toThrow(/persistent Audit outage/);
      expect((await fixture.connection.db.select().from(uploadRecoveryJobs)
        .where(eq(uploadRecoveryJobs.id, recovery.id)))[0]).toMatchObject({
        status: "processing",
        completedAt: null,
      });
      expect((await fixture.connection.db.select().from(assetUploadBatches)
        .where(eq(assetUploadBatches.id, batch.batchId)))[0]?.status).toBe("uploading");

      const reconciliationAudit: typeof writeAuditLog = async (db, input) => {
        if (input.action === "object_cleanup.completed") {
          throw new Error("TEST cleanup reconciliation Audit failure");
        }
        return writeAuditLog(db, input);
      };
      const firstRecovery = await recoverUploadRecoveryJob(
        fixture.connection.db,
        storage,
        recovery.id,
        {
          now: new Date(recovery.leaseExpiresAt.getTime() + 2),
          workerId: "cleanup-audit-worker",
          auditWriter: reconciliationAudit,
        },
      );
      expect(firstRecovery).toBe("retryable");
      expect(storage.objects.has(`private:${asset.objectKey}`)).toBe(false);
      const cleanup = (await fixture.connection.db.select().from(objectCleanupJobs)
        .where(eq(objectCleanupJobs.assetId, asset.id)))[0];
      expect(cleanup).toMatchObject({ status: "pending", completedAt: null });
      expect((await fixture.connection.db.select().from(assets)
        .where(eq(assets.id, asset.id)))[0]?.status).toBe("scanning");
      const secondRecovery = await recoverUploadRecoveryJob(
        fixture.connection.db,
        storage,
        recovery.id,
        {
          now: new Date((cleanup?.nextAttemptAt ?? new Date()).getTime() + 1),
          workerId: "cleanup-audit-retry-worker",
        },
      );
      expect(secondRecovery).toBe("completed");
      expect((await fixture.connection.db.select().from(objectCleanupJobs)
        .where(eq(objectCleanupJobs.id, cleanup!.id)))[0]?.status).toBe("completed");
      expect((await fixture.connection.db.select().from(uploadRecoveryJobs)
        .where(eq(uploadRecoveryJobs.id, recovery.id)))[0]?.status).toBe("completed");
      expect((await fixture.connection.db.select().from(auditLogs).where(and(
        eq(auditLogs.action, "asset.upload_staging.recovered"),
        eq(auditLogs.entityId, asset.id),
      )))).toHaveLength(1);
    } finally {
      await fixture.connection.close();
    }
  }, 30_000);

  it("retries failed cleanup without losing the staging Recovery record", async () => {
    const fixture = await setup("saga-cleanup-retry");
    const storage = new RecoveryStorage();
    const bytes = await imageBytes();
    try {
      const batch = await createBatch(fixture, "cleanup-retry", bytes);
      await expect(completeAdminUploadIntent(
        fixture.connection.db,
        storage,
        new DevelopmentFileScanner(),
        fixture.actor,
        { token: batch.intents[0]!.token, bytes },
        { faultInjector: (point) => {
          if (point === "after_staging_put") throw new Error("TEST crash after object write");
        } },
      )).rejects.toThrow(/crash after object write/);
      const recovery = (await fixture.connection.db.select().from(uploadRecoveryJobs)
        .where(eq(uploadRecoveryJobs.uploadBatchId, batch.batchId)))[0];
      if (!recovery?.leaseExpiresAt) throw new Error("Missing Recovery lease.");
      storage.failDeletes = 1;
      expect(await recoverUploadRecoveryJob(
        fixture.connection.db,
        storage,
        recovery.id,
        { now: new Date(recovery.leaseExpiresAt.getTime() + 1), workerId: "delete-failure-worker" },
      )).toBe("retryable");
      const cleanup = (await fixture.connection.db.select().from(objectCleanupJobs)
        .where(eq(objectCleanupJobs.assetId, recovery.assetId!)))[0];
      expect(cleanup?.status).toBe("pending");
      expect((await fixture.connection.db.select().from(uploadRecoveryJobs)
        .where(eq(uploadRecoveryJobs.id, recovery.id)))[0]?.status).toBe("cleanup_required");
      expect(await processObjectCleanupJob(
        fixture.connection.db,
        storage,
        cleanup!.id,
        { now: new Date(cleanup!.nextAttemptAt.getTime() + 1), workerId: "delete-retry-worker" },
      )).toBe("completed");
      expect((await fixture.connection.db.select().from(uploadRecoveryJobs)
        .where(eq(uploadRecoveryJobs.id, recovery.id)))[0]?.status).toBe("completed");
    } finally {
      await fixture.connection.close();
    }
  }, 30_000);

  it("keeps the existing core-failure dead-letter semantics for Staging cleanup", async () => {
    const fixture = await setup("staging-cleanup-dead");
    const storage = new RecoveryStorage();
    try {
      const staged = await stageBatch(fixture, storage, "staging-cleanup-dead");
      const recovery = (await fixture.connection.db.select().from(uploadRecoveryJobs)
        .where(eq(uploadRecoveryJobs.uploadBatchId, staged.batch.batchId)))[0];
      if (!recovery) throw new Error("Missing Staging Recovery.");
      const [cleanup] = await fixture.connection.db.select().from(objectCleanupJobs).where(and(
        eq(objectCleanupJobs.uploadBatchId, staged.batch.batchId),
        eq(objectCleanupJobs.cleanupKind, "staging"),
      ));
      if (!cleanup) throw new Error("Missing Staging Cleanup.");
      const attemptAt = new Date();
      await fixture.connection.db.update(objectCleanupJobs).set({
        maxAttempts: 1,
        nextAttemptAt: attemptAt,
      })
        .where(eq(objectCleanupJobs.id, cleanup.id));
      storage.failDeletes = 1;

      expect(await processObjectCleanupJob(
        fixture.connection.db,
        storage,
        cleanup.id,
        {
          now: new Date(attemptAt.getTime() + 1),
          workerId: "system:untrusted-staging-worker",
        },
      )).toBe("dead");
      expect((await fixture.connection.db.select().from(objectCleanupJobs)
        .where(eq(objectCleanupJobs.id, cleanup.id)))[0]?.status).toBe("dead");
      expect((await fixture.connection.db.select().from(assetUploadBatches)
        .where(eq(assetUploadBatches.id, staged.batch.batchId)))[0]).toMatchObject({
        status: "failed",
        failureReason: "private_staging_cleanup_dead",
      });
      expect((await fixture.connection.db.select().from(uploadRecoveryJobs)
        .where(eq(uploadRecoveryJobs.id, recovery.id)))[0]).toMatchObject({
        status: "dead",
        stage: "failed",
      });
      const [deadAudit] = await fixture.connection.db.select().from(auditLogs).where(and(
        eq(auditLogs.action, "object_cleanup.dead"),
        eq(auditLogs.entityId, cleanup.id),
      ));
      expect(deadAudit?.afterSummary).toMatchObject({
        systemActor: UPLOAD_RECOVERY_SYSTEM_ACTOR,
        cleanupKind: "staging",
        maintenanceOnly: false,
        requiresManualCleanup: false,
        outcome: "cleanup_exhausted",
      });
    } finally {
      await fixture.connection.close();
    }
  }, 30_000);

  it("claims Finalize atomically with its Lease, Recovery record, and Audit", async () => {
    const fixture = await setup("finalize-claim");
    const storage = new RecoveryStorage();
    try {
      const auditFailure = await stageBatch(fixture, storage, "claim-audit-failure");
      const failClaimAudit: typeof writeAuditLog = async (db, input) => {
        if (input.action === "asset.upload_batch.finalize_claimed") {
          throw new Error("TEST Finalize claim Audit failure");
        }
        return writeAuditLog(db, input);
      };
      await expect(finalizeAdminUploadBatch(
        fixture.connection.db,
        storage,
        fixture.actor,
        auditFailure.batch.batchId,
        { auditWriter: failClaimAudit },
      )).rejects.toThrow(/claim Audit failure/);
      expect((await fixture.connection.db.select().from(assetUploadBatches)
        .where(eq(assetUploadBatches.id, auditFailure.batch.batchId)))[0]?.status).toBe("ready_to_finalize");
      expect(await fixture.connection.db.select().from(uploadRecoveryJobs).where(and(
        eq(uploadRecoveryJobs.uploadBatchId, auditFailure.batch.batchId),
        eq(uploadRecoveryJobs.kind, "finalize"),
      ))).toHaveLength(0);

      const transactionFailure = await stageBatch(fixture, storage, "claim-transaction-failure");
      await expect(finalizeAdminUploadBatch(
        fixture.connection.db,
        storage,
        fixture.actor,
        transactionFailure.batch.batchId,
        { faultInjector: (point) => {
          if (point === "before_finalize_claim_commit") throw new Error("TEST Finalize claim transaction interrupted");
        } },
      )).rejects.toThrow(/transaction interrupted/);
      expect((await fixture.connection.db.select().from(assetUploadBatches)
        .where(eq(assetUploadBatches.id, transactionFailure.batch.batchId)))[0]?.status).toBe("ready_to_finalize");
      expect(await fixture.connection.db.select().from(uploadRecoveryJobs).where(and(
        eq(uploadRecoveryJobs.uploadBatchId, transactionFailure.batch.batchId),
        eq(uploadRecoveryJobs.kind, "finalize"),
      ))).toHaveLength(0);

      const crashed = await stageBatch(fixture, storage, "claim-immediate-crash");
      await expect(finalizeAdminUploadBatch(
        fixture.connection.db,
        storage,
        fixture.actor,
        crashed.batch.batchId,
        {
          workerId: "crashed-finalize-worker",
          leaseMilliseconds: 2_000,
          faultInjector: (point) => {
            if (point === "after_finalize_claim") throw new Error("TEST immediate worker crash");
          },
        },
      )).rejects.toThrow(/immediate worker crash/);
      const recovery = (await fixture.connection.db.select().from(uploadRecoveryJobs).where(and(
        eq(uploadRecoveryJobs.uploadBatchId, crashed.batch.batchId),
        eq(uploadRecoveryJobs.kind, "finalize"),
      )))[0];
      if (!recovery?.leaseExpiresAt) throw new Error("Finalize claim omitted its Recovery lease.");
      expect(recovery).toMatchObject({
        status: "processing",
        stage: "claimed",
        lockedBy: "crashed-finalize-worker",
        attemptCount: 1,
      });
      expect((await fixture.connection.db.select().from(assetUploadBatches)
        .where(eq(assetUploadBatches.id, crashed.batch.batchId)))[0]?.status).toBe("finalizing");
      await expect(finalizeAdminUploadBatch(
        fixture.connection.db,
        storage,
        fixture.actor,
        crashed.batch.batchId,
        { workerId: "early-second-worker" },
      )).rejects.toThrow(/unavailable|incomplete|finalized/i);
      expect((await processPendingUploadRecoveryJobs(fixture.connection.db, storage, {
        now: new Date(recovery.leaseExpiresAt.getTime() - 1),
        workerId: "early-recovery-worker",
      })).attempted).toBe(0);
      let releaseTakeover: (() => void) | undefined;
      let markTakeoverClaimed: (() => void) | undefined;
      const takeoverClaimed = new Promise<void>((resolve) => {
        markTakeoverClaimed = resolve;
      });
      const holdTakeover = new Promise<void>((resolve) => {
        releaseTakeover = resolve;
      });
      const takeoverAt = new Date(recovery.leaseExpiresAt.getTime() + 1);
      const takeover = recoverUploadRecoveryJob(
        fixture.connection.db,
        storage,
        recovery.id,
        {
          now: takeoverAt,
          workerId: "expired-lease-recovery-worker",
          leaseMilliseconds: 5_000,
          faultInjector: async (point) => {
            if (point === "after_claim") {
              markTakeoverClaimed?.();
              await holdTakeover;
            }
          },
        },
      );
      await takeoverClaimed;
      const takeoverLease = (await fixture.connection.db.select().from(uploadRecoveryJobs)
        .where(eq(uploadRecoveryJobs.id, recovery.id)))[0];
      if (!takeoverLease?.leaseExpiresAt) throw new Error("Takeover omitted its Recovery lease.");
      expect(takeoverLease).toMatchObject({
        status: "processing",
        stage: "claimed",
        lockedBy: "expired-lease-recovery-worker",
      });
      expect(takeoverLease.version).toBeGreaterThan(recovery.version);
      expect(await recoverUploadRecoveryJob(
        fixture.connection.db,
        storage,
        recovery.id,
        {
          now: new Date(takeoverAt.getTime() + 1),
          workerId: "second-recovery-worker",
        },
      )).toBe("not_claimed");
      await expect(advanceUploadRecoveryStage(
        fixture.connection.db,
        {
          id: recovery.id,
          workerId: "crashed-finalize-worker",
          version: recovery.version,
          attemptCount: recovery.attemptCount,
          leaseExpiresAt: recovery.leaseExpiresAt,
        },
        "source_copy_started",
        new Date(takeoverAt.getTime() + 2),
      )).rejects.toThrow(/lease|version/i);
      releaseTakeover?.();
      await expect(takeover).resolves.toBe("retryable");
      expect((await fixture.connection.db.select().from(assetUploadBatches)
        .where(eq(assetUploadBatches.id, crashed.batch.batchId)))[0]?.status).toBe("failed");
      expect((await fixture.connection.db.select().from(uploadRecoveryJobs)
        .where(eq(uploadRecoveryJobs.id, recovery.id)))[0]).toMatchObject({
        status: "retryable",
        stage: "failed",
        lockedBy: null,
        leaseExpiresAt: null,
        lastError: "finalize_pre_manifest_recovery",
      });
      expect(await fixture.connection.db.select().from(finalizeObjectManifestItems).where(
        eq(finalizeObjectManifestItems.recoveryJobId, recovery.id),
      )).toHaveLength(0);
      expect(await fixture.connection.db.select().from(objectCleanupJobs).where(and(
        eq(objectCleanupJobs.uploadBatchId, crashed.batch.batchId),
        eq(objectCleanupJobs.storagePartition, "public"),
      ))).toHaveLength(0);
      expect((await fixture.connection.db.select().from(assets)
        .where(eq(assets.id, crashed.assetId)))[0]).toMatchObject({
        storagePartition: "private",
        access: "internal",
      });
      expect([...storage.objects.keys()].some((key) => key.startsWith("public:"))).toBe(false);
      await finalizeAdminUploadBatch(
        fixture.connection.db,
        storage,
        fixture.actor,
        crashed.batch.batchId,
        { now: new Date(recovery.leaseExpiresAt.getTime() + 2), workerId: "takeover-finalize-worker" },
      );
      const completedRecovery = (await fixture.connection.db.select().from(uploadRecoveryJobs)
        .where(eq(uploadRecoveryJobs.id, recovery.id)))[0];
      expect(completedRecovery).toMatchObject({
        status: "completed",
        stage: "completed",
        lockedBy: null,
        leaseExpiresAt: null,
      });
      expect(completedRecovery!.attemptCount).toBeGreaterThanOrEqual(3);
      expect((await fixture.connection.db.select().from(assetUploadBatches)
        .where(eq(assetUploadBatches.id, crashed.batch.batchId)))[0]?.status).toBe("completed");
    } finally {
      await fixture.connection.close();
    }
  }, 45_000);

  it("rolls back the Pre-Manifest retry transition when its required Audit fails", async () => {
    const fixture = await setup("pre-manifest-audit-rollback");
    const storage = new RecoveryStorage();
    try {
      const staged = await stageBatch(fixture, storage, "pre-manifest-audit-rollback");
      await expect(finalizeAdminUploadBatch(
        fixture.connection.db,
        storage,
        fixture.actor,
        staged.batch.batchId,
        {
          workerId: "audit-old-finalizer",
          leaseMilliseconds: 1_000,
          faultInjector: (point) => {
            if (point === "after_finalize_claim") throw new Error("TEST Pre-Manifest crash");
          },
        },
      )).rejects.toThrow(/Pre-Manifest crash/);
      const recovery = (await fixture.connection.db.select().from(uploadRecoveryJobs).where(and(
        eq(uploadRecoveryJobs.uploadBatchId, staged.batch.batchId),
        eq(uploadRecoveryJobs.kind, "finalize"),
      )))[0];
      if (!recovery?.leaseExpiresAt) throw new Error("Missing Pre-Manifest Recovery lease.");
      const failTransitionAudit: typeof writeAuditLog = async (db, input) => {
        if (
          input.action === "asset.finalize.crash_recovered" &&
          input.afterSummary?.recoveryMode === "pre_manifest_retryable"
        ) {
          throw new Error("TEST Pre-Manifest Recovery Audit failure");
        }
        return writeAuditLog(db, input);
      };
      await expect(recoverUploadRecoveryJob(
        fixture.connection.db,
        storage,
        recovery.id,
        {
          now: new Date(recovery.leaseExpiresAt.getTime() + 1),
          workerId: "audit-takeover-worker",
          leaseMilliseconds: 1_000,
          auditWriter: failTransitionAudit,
        },
      )).rejects.toThrow(/Recovery Audit failure/);
      const afterAuditFailure = (await fixture.connection.db.select().from(uploadRecoveryJobs)
        .where(eq(uploadRecoveryJobs.id, recovery.id)))[0];
      if (!afterAuditFailure?.leaseExpiresAt) throw new Error("Claim was not retained after transition rollback.");
      expect(afterAuditFailure).toMatchObject({
        status: "processing",
        stage: "claimed",
        lockedBy: "audit-takeover-worker",
      });
      expect((await fixture.connection.db.select().from(assetUploadBatches)
        .where(eq(assetUploadBatches.id, staged.batch.batchId)))[0]?.status).toBe("finalizing");
      expect(await fixture.connection.db.select().from(finalizeObjectManifestItems).where(
        eq(finalizeObjectManifestItems.recoveryJobId, recovery.id),
      )).toHaveLength(0);
      expect(await fixture.connection.db.select().from(objectCleanupJobs).where(and(
        eq(objectCleanupJobs.uploadBatchId, staged.batch.batchId),
        eq(objectCleanupJobs.storagePartition, "public"),
      ))).toHaveLength(0);
      expect(await recoverUploadRecoveryJob(
        fixture.connection.db,
        storage,
        recovery.id,
        {
          now: new Date(afterAuditFailure.leaseExpiresAt.getTime() + 1),
          workerId: "audit-retry-worker",
        },
      )).toBe("retryable");
    } finally {
      await fixture.connection.close();
    }
  }, 30_000);

  it("fails closed for missing-Manifest stage, Cleanup, public Asset, and Attempt contradictions", async () => {
    const missingManifestCases = [
      "stage_requires_manifest",
      "cleanup_without_manifest",
      "public_asset_without_manifest",
    ] as const;
    for (const contradiction of missingManifestCases) {
      const fixture = await setup(`pre-manifest-${contradiction}`);
      const storage = new RecoveryStorage();
      try {
        const staged = await stageBatch(fixture, storage, contradiction);
        await expect(finalizeAdminUploadBatch(
          fixture.connection.db,
          storage,
          fixture.actor,
          staged.batch.batchId,
          {
            workerId: `contradiction-${contradiction}`,
            leaseMilliseconds: 1_000,
            faultInjector: (point) => {
              if (point === "after_finalize_claim") throw new Error(`TEST ${contradiction}`);
            },
          },
        )).rejects.toThrow(`TEST ${contradiction}`);
        const recovery = (await fixture.connection.db.select().from(uploadRecoveryJobs).where(and(
          eq(uploadRecoveryJobs.uploadBatchId, staged.batch.batchId),
          eq(uploadRecoveryJobs.kind, "finalize"),
        )))[0];
        if (!recovery?.leaseExpiresAt) throw new Error("Missing contradictory Recovery lease.");
        if (contradiction === "stage_requires_manifest") {
          await fixture.connection.db.update(uploadRecoveryJobs).set({ stage: "manifest_registered" })
            .where(eq(uploadRecoveryJobs.id, recovery.id));
        } else if (contradiction === "cleanup_without_manifest") {
          await fixture.connection.db.insert(objectCleanupJobs).values({
            uploadBatchId: staged.batch.batchId,
            assetId: staged.assetId,
            storagePartition: "public",
            objectKey: `TEST/${contradiction}.jpg`,
            reason: "TEST contradictory public cleanup",
            cleanupKind: "generic",
            status: "pending",
            nextAttemptAt: new Date(),
          });
        } else {
          await fixture.connection.db.update(assets).set({
            storagePartition: "public",
            access: "public",
          }).where(eq(assets.id, staged.assetId));
        }
        expect(await recoverUploadRecoveryJob(
          fixture.connection.db,
          storage,
          recovery.id,
          {
            now: new Date(recovery.leaseExpiresAt.getTime() + 1),
            workerId: `recovery-${contradiction}`,
          },
        )).toBe("dead");
        expect((await fixture.connection.db.select().from(uploadRecoveryJobs)
          .where(eq(uploadRecoveryJobs.id, recovery.id)))[0]).toMatchObject({
          status: "dead",
          stage: "failed",
          lastError: "finalize_manifest_state_conflict",
        });
        expect((await fixture.connection.db.select().from(assetUploadBatches)
          .where(eq(assetUploadBatches.id, staged.batch.batchId)))[0]?.status).toBe("failed");
        expect([...storage.objects.keys()].some((key) => key.startsWith("public:"))).toBe(false);
        const [conflictAudit] = await fixture.connection.db.select().from(auditLogs).where(and(
          eq(auditLogs.action, "asset.finalize.crash_recovered"),
          eq(auditLogs.entityId, staged.batch.batchId),
        ));
        expect(conflictAudit?.afterSummary).toMatchObject({
          recoveryMode: "manifest_state_conflict",
          recoveryStatus: "dead",
        });
      } finally {
        await fixture.connection.close();
      }
    }

    const fixture = await setup("manifest-attempt-mismatch");
    const storage = new RecoveryStorage();
    try {
      const staged = await stageBatch(fixture, storage, "manifest-attempt-mismatch");
      await expect(finalizeAdminUploadBatch(
        fixture.connection.db,
        storage,
        fixture.actor,
        staged.batch.batchId,
        {
          workerId: "attempt-mismatch-finalizer",
          faultInjector: (point) => {
            if (point === "after_finalize_manifest_registered") {
              throw new Error("TEST Attempt mismatch after Manifest");
            }
          },
        },
      )).rejects.toThrow(/Attempt mismatch/);
      const recovery = (await fixture.connection.db.select().from(uploadRecoveryJobs).where(and(
        eq(uploadRecoveryJobs.uploadBatchId, staged.batch.batchId),
        eq(uploadRecoveryJobs.kind, "finalize"),
      )))[0];
      const [cleanup] = await fixture.connection.db.select().from(objectCleanupJobs).where(and(
        eq(objectCleanupJobs.uploadBatchId, staged.batch.batchId),
        eq(objectCleanupJobs.storagePartition, "public"),
      ));
      if (!recovery || !cleanup?.finalizeAttempt) throw new Error("Missing Manifest projection fixture.");
      await fixture.connection.db.update(objectCleanupJobs).set({
        finalizeAttempt: cleanup.finalizeAttempt + 100,
      }).where(eq(objectCleanupJobs.id, cleanup.id));
      expect(await recoverUploadRecoveryJob(
        fixture.connection.db,
        storage,
        recovery.id,
        { now: new Date(recovery.nextAttemptAt.getTime() + 1), workerId: "attempt-mismatch-recovery" },
      )).toBe("dead");
      expect((await fixture.connection.db.select().from(uploadRecoveryJobs)
        .where(eq(uploadRecoveryJobs.id, recovery.id)))[0]?.status).toBe("dead");
      expect([...storage.objects.keys()].some((key) => key.startsWith("public:"))).toBe(false);
    } finally {
      await fixture.connection.close();
    }
  }, 60_000);

  it("prevents an expired old Finalize worker from committing after safe takeover", async () => {
    const fixture = await setup("finalize-takeover");
    const storage = new RecoveryStorage();
    try {
      const staged = await stageBatch(fixture, storage, "worker-takeover");
      const startedAt = new Date();
      let releaseOldWorker: (() => void) | undefined;
      let markOldWorkerClaimed: (() => void) | undefined;
      const oldWorkerClaimed = new Promise<void>((resolve) => {
        markOldWorkerClaimed = resolve;
      });
      const holdOldWorker = new Promise<void>((resolve) => {
        releaseOldWorker = resolve;
      });
      const oldWorker = finalizeAdminUploadBatch(
        fixture.connection.db,
        storage,
        fixture.actor,
        staged.batch.batchId,
        {
          now: startedAt,
          workerId: "old-finalize-worker",
          leaseMilliseconds: 1_000,
          faultInjector: async (point) => {
            if (point === "after_finalize_claim") {
              markOldWorkerClaimed?.();
              await holdOldWorker;
            }
          },
        },
      );
      await oldWorkerClaimed;
      const firstLease = (await fixture.connection.db.select().from(uploadRecoveryJobs).where(and(
        eq(uploadRecoveryJobs.uploadBatchId, staged.batch.batchId),
        eq(uploadRecoveryJobs.kind, "finalize"),
      )))[0];
      if (!firstLease?.leaseExpiresAt) throw new Error("Missing first Finalize lease.");
      await processPendingUploadRecoveryJobs(fixture.connection.db, storage, {
        now: new Date(firstLease.leaseExpiresAt.getTime() + 1),
        workerId: "takeover-recovery-worker",
      });
      await finalizeAdminUploadBatch(
        fixture.connection.db,
        storage,
        fixture.actor,
        staged.batch.batchId,
        {
          now: new Date(firstLease.leaseExpiresAt.getTime() + 2),
          workerId: "new-finalize-worker",
        },
      );
      releaseOldWorker?.();
      await expect(oldWorker).resolves.toMatchObject({
        success: true,
        batchId: staged.batch.batchId,
        assetId: staged.assetId,
        alreadyFinalized: true,
      });
      expect((await fixture.connection.db.select().from(assetUploadBatches)
        .where(eq(assetUploadBatches.id, staged.batch.batchId)))[0]?.status).toBe("completed");
      expect((await fixture.connection.db.select().from(uploadRecoveryJobs)
        .where(eq(uploadRecoveryJobs.id, firstLease.id)))[0]).toMatchObject({
        status: "completed",
        lockedBy: null,
        leaseExpiresAt: null,
      });
      expect((await fixture.connection.db.select().from(assets)
        .where(eq(assets.id, staged.assetId)))[0]).toMatchObject({
        storagePartition: "public",
        access: "public",
      });
    } finally {
      await fixture.connection.close();
    }
  }, 45_000);

  it("recovers a crashed Recovery worker and repairs an anomalous finalizing Batch", async () => {
    const fixture = await setup("finalize-recovery-restart");
    const storage = new RecoveryStorage();
    try {
      const staged = await stageBatch(fixture, storage, "recovery-restart");
      await expect(finalizeAdminUploadBatch(
        fixture.connection.db,
        storage,
        fixture.actor,
        staged.batch.batchId,
        {
          workerId: "initial-finalize-crash",
          leaseMilliseconds: 1_000,
          faultInjector: (point) => {
            if (point === "after_finalize_claim") throw new Error("TEST initial Finalize crash");
          },
        },
      )).rejects.toThrow(/initial Finalize crash/);
      const recovery = (await fixture.connection.db.select().from(uploadRecoveryJobs).where(and(
        eq(uploadRecoveryJobs.uploadBatchId, staged.batch.batchId),
        eq(uploadRecoveryJobs.kind, "finalize"),
      )))[0];
      if (!recovery?.leaseExpiresAt) throw new Error("Missing Finalize Recovery.");
      await expect(recoverUploadRecoveryJob(
        fixture.connection.db,
        storage,
        recovery.id,
        {
          now: new Date(recovery.leaseExpiresAt.getTime() + 1),
          workerId: "crashed-recovery-worker",
          leaseMilliseconds: 1_000,
          faultInjector: (point) => {
            if (point === "after_claim") throw new Error("TEST Recovery worker crash");
          },
        },
      )).rejects.toThrow(/Recovery worker crash/);
      const claimedAgain = (await fixture.connection.db.select().from(uploadRecoveryJobs)
        .where(eq(uploadRecoveryJobs.id, recovery.id)))[0];
      if (!claimedAgain?.leaseExpiresAt) throw new Error("Recovery worker did not persist its Lease.");
      expect(await recoverUploadRecoveryJob(
        fixture.connection.db,
        storage,
        recovery.id,
        {
          now: new Date(claimedAgain.leaseExpiresAt.getTime() + 1),
          workerId: "restarted-recovery-worker",
        },
      )).toBe("retryable");
      expect((await fixture.connection.db.select().from(uploadRecoveryJobs)
        .where(eq(uploadRecoveryJobs.id, recovery.id)))[0]?.status).toBe("retryable");

      const exhausted = await stageBatch(fixture, storage, "recovery-dead-state");
      await expect(finalizeAdminUploadBatch(
        fixture.connection.db,
        storage,
        fixture.actor,
        exhausted.batch.batchId,
        {
          workerId: "exhausted-finalize-worker",
          leaseMilliseconds: 1_000,
          faultInjector: (point) => {
            if (point === "after_finalize_claim") throw new Error("TEST exhausted Finalize crash");
          },
        },
      )).rejects.toThrow(/exhausted Finalize crash/);
      const exhaustedRecovery = (await fixture.connection.db.select().from(uploadRecoveryJobs).where(and(
        eq(uploadRecoveryJobs.uploadBatchId, exhausted.batch.batchId),
        eq(uploadRecoveryJobs.kind, "finalize"),
      )))[0];
      if (!exhaustedRecovery?.leaseExpiresAt) throw new Error("Missing exhausted Recovery lease.");
      await fixture.connection.db.update(uploadRecoveryJobs).set({ maxAttempts: 2 })
        .where(eq(uploadRecoveryJobs.id, exhaustedRecovery.id));
      expect(await recoverUploadRecoveryJob(
        fixture.connection.db,
        storage,
        exhaustedRecovery.id,
        {
          now: new Date(exhaustedRecovery.leaseExpiresAt.getTime() + 1),
          workerId: "exhausted-recovery-worker",
        },
      )).toBe("retryable");
      expect((await fixture.connection.db.select().from(uploadRecoveryJobs)
        .where(eq(uploadRecoveryJobs.id, exhaustedRecovery.id)))[0]?.status).toBe("retryable");
      expect((await fixture.connection.db.select().from(assetUploadBatches)
        .where(eq(assetUploadBatches.id, exhausted.batch.batchId)))[0]).toMatchObject({
        status: "failed",
        failureReason: "finalize_recovered_retryable",
      });

      const anomalous = await stageBatch(fixture, storage, "missing-recovery-anomaly");
      await expect(finalizeAdminUploadBatch(
        fixture.connection.db,
        storage,
        fixture.actor,
        anomalous.batch.batchId,
        { faultInjector: (point) => {
          if (point === "after_finalize_claim") throw new Error("TEST simulated orphan window");
        } },
      )).rejects.toThrow(/orphan window/);
      await fixture.connection.db.delete(uploadRecoveryJobs).where(and(
        eq(uploadRecoveryJobs.uploadBatchId, anomalous.batch.batchId),
        eq(uploadRecoveryJobs.kind, "finalize"),
      ));
      expect((await fixture.connection.db.select().from(assetUploadBatches)
        .where(eq(assetUploadBatches.id, anomalous.batch.batchId)))[0]?.status).toBe("finalizing");
      await processPendingUploadRecoveryJobs(fixture.connection.db, storage, {
        workerId: "gap-reconciliation-worker",
      });
      expect((await fixture.connection.db.select().from(assetUploadBatches)
        .where(eq(assetUploadBatches.id, anomalous.batch.batchId)))[0]?.status).toBe("failed");
      const recreated = await fixture.connection.db.select().from(uploadRecoveryJobs).where(and(
        eq(uploadRecoveryJobs.uploadBatchId, anomalous.batch.batchId),
        eq(uploadRecoveryJobs.kind, "finalize"),
      ));
      expect(recreated).toHaveLength(1);
      expect(recreated[0]?.status).toBe("retryable");
      expect(await fixture.connection.db.select().from(auditLogs).where(and(
        eq(auditLogs.action, "asset.finalize.recovery_gap_reconciled"),
        eq(auditLogs.entityId, anomalous.batch.batchId),
      ))).toHaveLength(1);
    } finally {
      await fixture.connection.close();
    }
  }, 45_000);
});
