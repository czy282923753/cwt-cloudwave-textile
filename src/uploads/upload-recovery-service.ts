import { randomUUID } from "node:crypto";
import { and, asc, desc, eq, gt, inArray, isNull, lte, or, sql } from "drizzle-orm";
import type { PgQueryResultHKT } from "drizzle-orm/pg-core/session";

import { writeAuditLog } from "@/audit/service";
import {
  assetUploadBatches,
  finalizeObjectManifestItems,
  objectCleanupJobs,
  uploadIntents,
  uploadRecoveryJobs,
} from "@/db/schema";
import type { AppDatabase } from "@/db/types";
import type { ObjectStorage } from "@/storage";

import {
  processObjectCleanupJob,
  UPLOAD_RECOVERY_SYSTEM_ACTOR,
} from "./object-cleanup-service";

export const UPLOAD_RECOVERY_LEASE_MILLISECONDS = 60_000;

type RecoveryStage = typeof uploadRecoveryJobs.$inferSelect.stage;

export interface UploadRecoveryLease {
  id: string;
  workerId: string;
  version: number;
  attemptCount: number;
  leaseExpiresAt: Date;
}

export interface FinalizeManifestItem {
  assetId: string;
  objectKey: string;
  role: "original" | "variant";
  mimeType: string;
  byteSize: number;
}

interface RecoveryOptions {
  auditWriter?: typeof writeAuditLog;
  workerId?: string;
  now?: Date;
  leaseMilliseconds?: number;
  faultInjector?: (point: "after_claim" | "after_cleanup_scheduled") => void | Promise<void>;
}

async function reconcileFinalizingRecoveryGaps<
  TQueryResult extends PgQueryResultHKT,
>(
  db: AppDatabase<TQueryResult>,
  now: Date,
  auditWriter: typeof writeAuditLog,
  limit: number,
): Promise<number> {
  const candidates = await db.select({
    id: assetUploadBatches.id,
    expiresAt: assetUploadBatches.expiresAt,
  }).from(assetUploadBatches)
    .where(eq(assetUploadBatches.status, "finalizing"))
    .limit(limit);
  let repaired = 0;
  for (const candidate of candidates) {
    const changed = await db.transaction(async (transaction) => {
      const batch = (await transaction.select({
        id: assetUploadBatches.id,
        status: assetUploadBatches.status,
      }).from(assetUploadBatches).where(and(
        eq(assetUploadBatches.id, candidate.id),
        eq(assetUploadBatches.status, "finalizing"),
      )).limit(1))[0];
      if (!batch) return false;
      const existing = (await transaction.select().from(uploadRecoveryJobs).where(and(
        eq(uploadRecoveryJobs.uploadBatchId, batch.id),
        eq(uploadRecoveryJobs.kind, "finalize"),
      )).limit(1))[0];
      if (existing && existing.status !== "completed" && existing.status !== "dead") {
        return false;
      }
      if (existing?.status === "dead") {
        await transaction.update(assetUploadBatches).set({
          status: "failed",
          failureReason: "finalize_recovery_dead",
        }).where(and(
          eq(assetUploadBatches.id, batch.id),
          eq(assetUploadBatches.status, "finalizing"),
        ));
      } else if (existing) {
        await transaction.update(uploadRecoveryJobs).set({
          status: "retryable",
          stage: "failed",
          nextAttemptAt: now,
          lockedBy: null,
          lockedAt: null,
          leaseExpiresAt: null,
          lastError: "finalizing_batch_had_completed_recovery",
          completedAt: null,
          version: sql`${uploadRecoveryJobs.version} + 1`,
          updatedAt: now,
        }).where(eq(uploadRecoveryJobs.id, existing.id));
        await transaction.update(assetUploadBatches).set({
          status: "failed",
          failureReason: "finalize_recovery_repaired",
        }).where(and(
          eq(assetUploadBatches.id, batch.id),
          eq(assetUploadBatches.status, "finalizing"),
        ));
      } else {
        await transaction.insert(uploadRecoveryJobs).values({
          kind: "finalize",
          uploadBatchId: batch.id,
          status: "retryable",
          stage: "failed",
          attemptCount: 0,
          nextAttemptAt: now,
          lastError: "finalizing_batch_missing_recovery",
          expiresAt: candidate.expiresAt ?? now,
        });
        await transaction.update(assetUploadBatches).set({
          status: "failed",
          failureReason: "finalize_recovery_record_recreated",
        }).where(and(
          eq(assetUploadBatches.id, batch.id),
          eq(assetUploadBatches.status, "finalizing"),
        ));
      }
      await auditWriter(transaction, {
        action: "asset.finalize.recovery_gap_reconciled",
        entityType: "asset_upload_batch",
        entityId: batch.id,
        afterSummary: {
          systemActor: UPLOAD_RECOVERY_SYSTEM_ACTOR,
          priorRecoveryStatus: existing?.status ?? "missing",
        },
      });
      return true;
    });
    if (changed) repaired += 1;
  }
  return repaired;
}

export class UploadRecoveryLeaseError extends Error {
  constructor() {
    super("Upload Recovery lease or version is no longer valid.");
    this.name = "UploadRecoveryLeaseError";
  }
}

export async function advanceUploadRecoveryStage<
  TQueryResult extends PgQueryResultHKT,
>(
  db: AppDatabase<TQueryResult>,
  lease: UploadRecoveryLease,
  stage: RecoveryStage,
  now = new Date(),
  leaseMilliseconds = UPLOAD_RECOVERY_LEASE_MILLISECONDS,
): Promise<UploadRecoveryLease> {
  const leaseExpiresAt = new Date(now.getTime() + leaseMilliseconds);
  const row = (await db.update(uploadRecoveryJobs).set({
    stage,
    version: sql`${uploadRecoveryJobs.version} + 1`,
    leaseExpiresAt,
    updatedAt: now,
  }).where(and(
    eq(uploadRecoveryJobs.id, lease.id),
    eq(uploadRecoveryJobs.status, "processing"),
    eq(uploadRecoveryJobs.lockedBy, lease.workerId),
    eq(uploadRecoveryJobs.version, lease.version),
    gt(uploadRecoveryJobs.leaseExpiresAt, now),
  )).returning({ version: uploadRecoveryJobs.version }))[0];
  if (!row) throw new UploadRecoveryLeaseError();
  return { ...lease, version: row.version, leaseExpiresAt };
}

export async function heartbeatFinalizeLease<
  TQueryResult extends PgQueryResultHKT,
>(
  db: AppDatabase<TQueryResult>,
  lease: UploadRecoveryLease,
  now = new Date(),
  leaseMilliseconds = UPLOAD_RECOVERY_LEASE_MILLISECONDS,
): Promise<UploadRecoveryLease> {
  const leaseExpiresAt = new Date(now.getTime() + leaseMilliseconds);
  const row = (await db.update(uploadRecoveryJobs).set({
    version: sql`${uploadRecoveryJobs.version} + 1`,
    leaseExpiresAt,
    updatedAt: now,
  }).where(and(
    eq(uploadRecoveryJobs.id, lease.id),
    eq(uploadRecoveryJobs.kind, "finalize"),
    eq(uploadRecoveryJobs.status, "processing"),
    eq(uploadRecoveryJobs.lockedBy, lease.workerId),
    eq(uploadRecoveryJobs.version, lease.version),
    gt(uploadRecoveryJobs.leaseExpiresAt, now),
  )).returning({ version: uploadRecoveryJobs.version }))[0];
  if (!row) throw new UploadRecoveryLeaseError();
  return { ...lease, version: row.version, leaseExpiresAt };
}

export async function registerFinalizeManifest<
  TQueryResult extends PgQueryResultHKT,
>(
  db: AppDatabase<TQueryResult>,
  lease: UploadRecoveryLease,
  batchId: string,
  items: readonly FinalizeManifestItem[],
  options: Pick<RecoveryOptions, "auditWriter" | "now" | "leaseMilliseconds"> = {},
): Promise<UploadRecoveryLease> {
  if (!items.length) throw new Error("Finalize Object Manifest cannot be empty.");
  const keys = new Set(items.map((item) => item.objectKey));
  if (keys.size !== items.length) throw new Error("Finalize Object Manifest contains duplicate keys.");
  if (items.some((item) => !item.objectKey || !item.mimeType || item.byteSize < 1)) {
    throw new Error("Finalize Object Manifest contains invalid object metadata.");
  }
  const now = options.now ?? new Date();
  const leaseMilliseconds = options.leaseMilliseconds ?? UPLOAD_RECOVERY_LEASE_MILLISECONDS;
  const leaseExpiresAt = new Date(now.getTime() + leaseMilliseconds);
  const auditWriter = options.auditWriter ?? writeAuditLog;
  return db.transaction(async (transaction) => {
    await transaction.execute(sql`
      select id from asset_upload_batches where id = ${batchId} for update
    `);
    await transaction.execute(sql`
      select id from upload_recovery_jobs where id = ${lease.id} for update
    `);
    await transaction.execute(sql`
      select id from finalize_object_manifest_items
      where recovery_job_id = ${lease.id} and finalize_attempt = ${lease.attemptCount}
      order by id for update
    `);
    await transaction.execute(sql`
      select id from object_cleanup_jobs
      where upload_batch_id = ${batchId} and storage_partition = 'public'
      order by id for update
    `);
    const recovery = (await transaction.select().from(uploadRecoveryJobs).where(and(
      eq(uploadRecoveryJobs.id, lease.id),
      eq(uploadRecoveryJobs.uploadBatchId, batchId),
      eq(uploadRecoveryJobs.kind, "finalize"),
      eq(uploadRecoveryJobs.status, "processing"),
      eq(uploadRecoveryJobs.lockedBy, lease.workerId),
      eq(uploadRecoveryJobs.version, lease.version),
      gt(uploadRecoveryJobs.leaseExpiresAt, now),
    )).limit(1))[0];
    if (!recovery) throw new UploadRecoveryLeaseError();
    const existingManifest = await transaction.select({
      objectKey: finalizeObjectManifestItems.objectKey,
    }).from(finalizeObjectManifestItems).where(and(
      eq(finalizeObjectManifestItems.recoveryJobId, lease.id),
      eq(finalizeObjectManifestItems.finalizeAttempt, lease.attemptCount),
    ));
    if (existingManifest.length) {
      throw new Error("Finalize Object Manifest is already registered for this attempt.");
    }
    const existing = await transaction.select().from(objectCleanupJobs).where(and(
      eq(objectCleanupJobs.uploadBatchId, batchId),
      eq(objectCleanupJobs.storagePartition, "public"),
    ));
    const unexpected = existing.filter((job) =>
      job.finalizeRecoveryId === lease.id &&
      job.finalizeAttempt === lease.attemptCount &&
      (!keys.has(job.objectKey) ||
        job.status === "pending" ||
        job.status === "processing" ||
        job.status === "dead" ||
        job.status === "standby"),
    );
    if (unexpected.length) {
      throw new Error("Existing Public Compensation state conflicts with the Finalize Manifest.");
    }
    await transaction.insert(finalizeObjectManifestItems).values(items.map((item) => ({
      recoveryJobId: lease.id,
      uploadBatchId: batchId,
      finalizeAttempt: lease.attemptCount,
      assetId: item.assetId,
      objectKey: item.objectKey,
      objectRole: item.role,
      mimeType: item.mimeType,
      byteSize: item.byteSize,
      writeCompletedAt: null,
      updatedAt: now,
    })));
    for (const item of items) {
      await transaction.insert(objectCleanupJobs).values({
        uploadBatchId: batchId,
        assetId: item.assetId,
        storagePartition: "public",
        objectKey: item.objectKey,
        reason: item.role === "original"
          ? "finalize_public_original_compensation"
          : "finalize_public_variant_compensation",
        status: "standby",
        finalizeRecoveryId: lease.id,
        finalizeAttempt: lease.attemptCount,
        expectedObjectRole: item.role,
        expectedMimeType: item.mimeType,
        expectedByteSize: item.byteSize,
        writeCompletedAt: null,
        armedAt: null,
        armedReason: null,
        attemptCount: 0,
        nextAttemptAt: now,
        lockedBy: null,
        lockedAt: null,
        leaseExpiresAt: null,
        lastError: null,
        completedAt: null,
        updatedAt: now,
      }).onConflictDoUpdate({
        target: [objectCleanupJobs.storagePartition, objectCleanupJobs.objectKey],
        set: {
          uploadBatchId: batchId,
          assetId: item.assetId,
          reason: item.role === "original"
            ? "finalize_public_original_compensation"
            : "finalize_public_variant_compensation",
          status: "standby",
          finalizeRecoveryId: lease.id,
          finalizeAttempt: lease.attemptCount,
          expectedObjectRole: item.role,
          expectedMimeType: item.mimeType,
          expectedByteSize: item.byteSize,
          writeCompletedAt: null,
          armedAt: null,
          armedReason: null,
          attemptCount: 0,
          nextAttemptAt: now,
          lockedBy: null,
          lockedAt: null,
          leaseExpiresAt: null,
          lastError: null,
          completedAt: null,
          updatedAt: now,
        },
      });
    }
    const updated = (await transaction.update(uploadRecoveryJobs).set({
      stage: "manifest_registered",
      version: sql`${uploadRecoveryJobs.version} + 1`,
      leaseExpiresAt,
      updatedAt: now,
    }).where(and(
      eq(uploadRecoveryJobs.id, lease.id),
      eq(uploadRecoveryJobs.status, "processing"),
      eq(uploadRecoveryJobs.lockedBy, lease.workerId),
      eq(uploadRecoveryJobs.version, lease.version),
      gt(uploadRecoveryJobs.leaseExpiresAt, now),
    )).returning({ version: uploadRecoveryJobs.version }))[0];
    if (!updated) throw new UploadRecoveryLeaseError();
    await auditWriter(transaction, {
      action: "asset.finalize.manifest_registered",
      entityType: "asset_upload_batch",
      entityId: batchId,
      afterSummary: {
        systemActor: lease.workerId,
        recoveryJobId: lease.id,
        objectCount: items.length,
      },
    });
    return { ...lease, version: updated.version, leaseExpiresAt };
  });
}

export async function markFinalizeObjectWritten<
  TQueryResult extends PgQueryResultHKT,
>(
  db: AppDatabase<TQueryResult>,
  lease: UploadRecoveryLease,
  objectKey: string,
  stage: RecoveryStage,
  now = new Date(),
  leaseMilliseconds = UPLOAD_RECOVERY_LEASE_MILLISECONDS,
): Promise<UploadRecoveryLease> {
  const leaseExpiresAt = new Date(now.getTime() + leaseMilliseconds);
  return db.transaction(async (transaction) => {
    const recovery = (await transaction.update(uploadRecoveryJobs).set({
      stage,
      version: sql`${uploadRecoveryJobs.version} + 1`,
      leaseExpiresAt,
      updatedAt: now,
    }).where(and(
      eq(uploadRecoveryJobs.id, lease.id),
      eq(uploadRecoveryJobs.kind, "finalize"),
      eq(uploadRecoveryJobs.status, "processing"),
      eq(uploadRecoveryJobs.lockedBy, lease.workerId),
      eq(uploadRecoveryJobs.version, lease.version),
      gt(uploadRecoveryJobs.leaseExpiresAt, now),
    )).returning({ version: uploadRecoveryJobs.version }))[0];
    if (!recovery) throw new UploadRecoveryLeaseError();
    const manifestWritten = await transaction.update(finalizeObjectManifestItems).set({
      writeCompletedAt: now,
      updatedAt: now,
    }).where(and(
      eq(finalizeObjectManifestItems.recoveryJobId, lease.id),
      eq(finalizeObjectManifestItems.finalizeAttempt, lease.attemptCount),
      eq(finalizeObjectManifestItems.objectKey, objectKey),
      isNull(finalizeObjectManifestItems.writeCompletedAt),
    )).returning({ id: finalizeObjectManifestItems.id });
    if (!manifestWritten[0]) throw new Error("Finalize Manifest object changed before write completion.");
    const written = await transaction.update(objectCleanupJobs).set({
      writeCompletedAt: now,
      updatedAt: now,
    }).where(and(
      eq(objectCleanupJobs.finalizeRecoveryId, lease.id),
      eq(objectCleanupJobs.finalizeAttempt, lease.attemptCount),
      eq(objectCleanupJobs.objectKey, objectKey),
      eq(objectCleanupJobs.storagePartition, "public"),
      eq(objectCleanupJobs.status, "standby"),
      isNull(objectCleanupJobs.armedAt),
    )).returning({ id: objectCleanupJobs.id });
    if (!written[0]) throw new Error("Finalize Manifest object changed before write completion.");
    return { ...lease, version: recovery.version, leaseExpiresAt };
  });
}

function recoverableAt(now: Date) {
  return or(
    and(
      inArray(uploadRecoveryJobs.status, ["pending", "retryable", "cleanup_required"]),
      lte(uploadRecoveryJobs.nextAttemptAt, now),
    ),
    and(
      eq(uploadRecoveryJobs.status, "processing"),
      lte(uploadRecoveryJobs.leaseExpiresAt, now),
    ),
  );
}

async function claimRecoveryJob<TQueryResult extends PgQueryResultHKT>(
  db: AppDatabase<TQueryResult>,
  jobId: string,
  workerId: string,
  now: Date,
  leaseMilliseconds: number,
  auditWriter: typeof writeAuditLog,
) {
  return db.transaction(async (transaction) => {
    const leaseExpiresAt = new Date(now.getTime() + leaseMilliseconds);
    const row = (await transaction.update(uploadRecoveryJobs).set({
      status: "processing",
      attemptCount: sql`${uploadRecoveryJobs.attemptCount} + 1`,
      lockedBy: workerId,
      lockedAt: now,
      leaseExpiresAt,
      version: sql`${uploadRecoveryJobs.version} + 1`,
      updatedAt: now,
    }).where(and(
      eq(uploadRecoveryJobs.id, jobId),
      recoverableAt(now),
    )).returning())[0];
    if (!row) return null;
    await auditWriter(transaction, {
      action: "asset.upload_recovery.claimed",
      entityType: "upload_recovery_job",
      entityId: row.id,
      afterSummary: {
        systemActor: UPLOAD_RECOVERY_SYSTEM_ACTOR,
        kind: row.kind,
        stage: row.stage,
        attempt: row.attemptCount,
      },
    });
    return row;
  });
}

export async function markFinalizeRecoveryRequired<
  TQueryResult extends PgQueryResultHKT,
>(
  db: AppDatabase<TQueryResult>,
  lease: UploadRecoveryLease,
  batchId: string,
  error: unknown,
  options: Pick<RecoveryOptions, "auditWriter" | "now"> = {},
): Promise<"cleanup_required" | "retryable"> {
  const now = options.now ?? new Date();
  const auditWriter = options.auditWriter ?? writeAuditLog;
  return db.transaction(async (transaction) => {
    await transaction.execute(sql`
      select id from asset_upload_batches where id = ${batchId} for update
    `);
    await transaction.execute(sql`
      select id from upload_recovery_jobs where id = ${lease.id} for update
    `);
    await transaction.execute(sql`
      select id from finalize_object_manifest_items
      where recovery_job_id = ${lease.id} and finalize_attempt = ${lease.attemptCount}
      order by id for update
    `);
    await transaction.execute(sql`
      select id from object_cleanup_jobs
      where upload_batch_id = ${batchId} and storage_partition = 'public'
      order by id for update
    `);
    const manifest = await transaction.select().from(finalizeObjectManifestItems).where(and(
      eq(finalizeObjectManifestItems.recoveryJobId, lease.id),
      eq(finalizeObjectManifestItems.finalizeAttempt, lease.attemptCount),
      eq(finalizeObjectManifestItems.uploadBatchId, batchId),
    ));
    const publicCleanup = await transaction.select({
      id: objectCleanupJobs.id,
      objectKey: objectCleanupJobs.objectKey,
      status: objectCleanupJobs.status,
    })
      .from(objectCleanupJobs)
      .where(and(
        eq(objectCleanupJobs.uploadBatchId, batchId),
        eq(objectCleanupJobs.storagePartition, "public"),
        eq(objectCleanupJobs.finalizeRecoveryId, lease.id),
        eq(objectCleanupJobs.finalizeAttempt, lease.attemptCount),
      ));
    if (manifest.length) {
      for (const item of manifest) {
        await transaction.insert(objectCleanupJobs).values({
          uploadBatchId: batchId,
          assetId: item.assetId,
          storagePartition: "public",
          objectKey: item.objectKey,
          reason: item.objectRole === "original"
            ? "finalize_public_original_compensation"
            : "finalize_public_variant_compensation",
          status: "standby",
          finalizeRecoveryId: lease.id,
          finalizeAttempt: lease.attemptCount,
          expectedObjectRole: item.objectRole,
          expectedMimeType: item.mimeType,
          expectedByteSize: item.byteSize,
          writeCompletedAt: item.writeCompletedAt,
          nextAttemptAt: now,
          updatedAt: now,
        }).onConflictDoUpdate({
          target: [objectCleanupJobs.storagePartition, objectCleanupJobs.objectKey],
          set: {
            uploadBatchId: batchId,
            assetId: item.assetId,
            reason: item.objectRole === "original"
              ? "finalize_public_original_compensation"
              : "finalize_public_variant_compensation",
            status: "standby",
            finalizeRecoveryId: lease.id,
            finalizeAttempt: lease.attemptCount,
            expectedObjectRole: item.objectRole,
            expectedMimeType: item.mimeType,
            expectedByteSize: item.byteSize,
            writeCompletedAt: item.writeCompletedAt,
            armedAt: null,
            armedReason: null,
            lockedBy: null,
            lockedAt: null,
            leaseExpiresAt: null,
            completedAt: null,
            updatedAt: now,
          },
        });
      }
    }
    const repairableCleanup = await transaction.select({
      id: objectCleanupJobs.id,
      objectKey: objectCleanupJobs.objectKey,
      status: objectCleanupJobs.status,
    }).from(objectCleanupJobs).where(and(
      eq(objectCleanupJobs.uploadBatchId, batchId),
      eq(objectCleanupJobs.storagePartition, "public"),
      eq(objectCleanupJobs.finalizeRecoveryId, lease.id),
      eq(objectCleanupJobs.finalizeAttempt, lease.attemptCount),
    ));
    const manifestKeys = new Set(manifest.map((item) => item.objectKey));
    const nextStatus = manifest.length ? "cleanup_required" : "retryable";
    const updated = (await transaction.update(uploadRecoveryJobs).set({
      status: nextStatus,
      stage: manifest.length ? "cleanup_required" : "failed",
      nextAttemptAt: now,
      lockedBy: null,
      lockedAt: null,
      leaseExpiresAt: null,
      lastError: error instanceof Error ? error.message.slice(0, 500) : "unknown",
      version: sql`${uploadRecoveryJobs.version} + 1`,
      updatedAt: now,
    }).where(and(
      eq(uploadRecoveryJobs.id, lease.id),
      eq(uploadRecoveryJobs.uploadBatchId, batchId),
      eq(uploadRecoveryJobs.kind, "finalize"),
      eq(uploadRecoveryJobs.status, "processing"),
      eq(uploadRecoveryJobs.lockedBy, lease.workerId),
      eq(uploadRecoveryJobs.version, lease.version),
      gt(uploadRecoveryJobs.leaseExpiresAt, now),
    )).returning({ id: uploadRecoveryJobs.id }))[0];
    if (!updated) throw new UploadRecoveryLeaseError();
    const batchUpdated = await transaction.update(assetUploadBatches).set({
      status: "failed",
      failureReason: nextStatus === "cleanup_required"
        ? "finalize_cleanup_required"
        : "finalize_retryable",
    }).where(and(
      eq(assetUploadBatches.id, batchId),
      eq(assetUploadBatches.status, "finalizing"),
    )).returning({ id: assetUploadBatches.id });
    if (!batchUpdated[0]) throw new UploadRecoveryLeaseError();
    if (manifest.length) {
      for (const item of manifest) {
        await transaction.update(objectCleanupJobs).set({
          status: "pending",
          assetId: item.assetId,
          expectedObjectRole: item.objectRole,
          expectedMimeType: item.mimeType,
          expectedByteSize: item.byteSize,
          writeCompletedAt: item.writeCompletedAt,
          armedAt: now,
          armedReason: "finalize_failed",
          nextAttemptAt: now,
          lockedBy: null,
          lockedAt: null,
          leaseExpiresAt: null,
          completedAt: null,
          updatedAt: now,
        }).where(and(
          eq(objectCleanupJobs.storagePartition, "public"),
          eq(objectCleanupJobs.objectKey, item.objectKey),
          eq(objectCleanupJobs.finalizeRecoveryId, lease.id),
          eq(objectCleanupJobs.finalizeAttempt, lease.attemptCount),
        ));
      }
      const unexpectedIds = repairableCleanup
        .filter((job) => !manifestKeys.has(job.objectKey))
        .map((job) => job.id);
      if (unexpectedIds.length) {
        await transaction.update(objectCleanupJobs).set({
          status: "dead",
          armedAt: now,
          armedReason: "finalize_manifest_mismatch_manual_review",
          lockedBy: null,
          lockedAt: null,
          leaseExpiresAt: null,
          updatedAt: now,
        }).where(inArray(objectCleanupJobs.id, unexpectedIds));
      }
      await transaction.update(uploadIntents).set({
        failureReason: "finalize_cleanup_required",
        updatedAt: now,
      }).where(and(
        eq(uploadIntents.uploadBatchId, batchId),
        eq(uploadIntents.kind, "admin_asset"),
        eq(uploadIntents.status, "passed"),
      ));
    }
    await auditWriter(transaction, {
      action: "asset.finalize.recovery_required",
      entityType: "asset_upload_batch",
      entityId: batchId,
      afterSummary: {
        systemActor: UPLOAD_RECOVERY_SYSTEM_ACTOR,
        recoveryStatus: nextStatus,
        manifestObjects: manifest.length,
        registeredCleanupObjects: repairableCleanup.length,
        repairedMissingCleanupObjects: manifest.filter(
          (item) => !publicCleanup.some((job) => job.objectKey === item.objectKey),
        ).length,
        abnormalCleanupStates: publicCleanup.filter(
          (job) => !manifestKeys.has(job.objectKey) || job.status !== "standby",
        ).length,
      },
    });
    return nextStatus;
  });
}

export async function recoverUploadRecoveryJob<
  TQueryResult extends PgQueryResultHKT,
>(
  db: AppDatabase<TQueryResult>,
  storage: ObjectStorage,
  jobId: string,
  options: RecoveryOptions = {},
): Promise<"completed" | "retryable" | "dead" | "not_claimed"> {
  const now = options.now ?? new Date();
  const workerId = options.workerId ?? `recovery-${randomUUID()}`;
  const auditWriter = options.auditWriter ?? writeAuditLog;
  const job = await claimRecoveryJob(
    db,
    jobId,
    workerId,
    now,
    options.leaseMilliseconds ?? UPLOAD_RECOVERY_LEASE_MILLISECONDS,
    auditWriter,
  );
  if (!job) return "not_claimed";
  await options.faultInjector?.("after_claim");

  let noCleanupRecoveryDead = false;
  const cleanupRows = await db.transaction(async (transaction) => {
    const partition = job.kind === "staging" ? "private" : "public";
    if (job.kind === "finalize") {
      await transaction.execute(sql`
        select id from asset_upload_batches where id = ${job.uploadBatchId} for update
      `);
      await transaction.execute(sql`
        select id from upload_recovery_jobs where id = ${job.id} for update
      `);
      await transaction.execute(sql`
        select id from finalize_object_manifest_items
        where recovery_job_id = ${job.id}
        order by finalize_attempt desc, id for update
      `);
      await transaction.execute(sql`
        select id from object_cleanup_jobs
        where upload_batch_id = ${job.uploadBatchId} and storage_partition = 'public'
        order by id for update
      `);
    }
    const latestManifestAttempt = job.kind === "finalize"
      ? (await transaction.select({
          attempt: finalizeObjectManifestItems.finalizeAttempt,
        }).from(finalizeObjectManifestItems).where(and(
          eq(finalizeObjectManifestItems.recoveryJobId, job.id),
          eq(finalizeObjectManifestItems.uploadBatchId, job.uploadBatchId),
        )).orderBy(desc(finalizeObjectManifestItems.finalizeAttempt)).limit(1))[0]?.attempt
      : undefined;
    const manifest = job.kind === "finalize" && latestManifestAttempt !== undefined
      ? await transaction.select().from(finalizeObjectManifestItems).where(and(
          eq(finalizeObjectManifestItems.recoveryJobId, job.id),
          eq(finalizeObjectManifestItems.finalizeAttempt, latestManifestAttempt),
          eq(finalizeObjectManifestItems.uploadBatchId, job.uploadBatchId),
        ))
      : [];
    if (job.kind === "finalize") {
      for (const item of manifest) {
        await transaction.insert(objectCleanupJobs).values({
          uploadBatchId: job.uploadBatchId,
          assetId: item.assetId,
          storagePartition: "public",
          objectKey: item.objectKey,
          reason: item.objectRole === "original"
            ? "finalize_public_original_compensation"
            : "finalize_public_variant_compensation",
          status: "standby",
          finalizeRecoveryId: job.id,
          finalizeAttempt: latestManifestAttempt,
          expectedObjectRole: item.objectRole,
          expectedMimeType: item.mimeType,
          expectedByteSize: item.byteSize,
          writeCompletedAt: item.writeCompletedAt,
          nextAttemptAt: now,
          updatedAt: now,
        }).onConflictDoNothing();
      }
    }
    const rows = await transaction.select({
      id: objectCleanupJobs.id,
      objectKey: objectCleanupJobs.objectKey,
      status: objectCleanupJobs.status,
      leaseExpiresAt: objectCleanupJobs.leaseExpiresAt,
    })
      .from(objectCleanupJobs)
      .where(and(
        eq(objectCleanupJobs.uploadBatchId, job.uploadBatchId),
        eq(objectCleanupJobs.storagePartition, partition),
        job.kind === "staging" && job.assetId
          ? eq(objectCleanupJobs.assetId, job.assetId)
          : job.kind === "finalize"
            ? and(
                eq(objectCleanupJobs.finalizeRecoveryId, job.id),
                eq(objectCleanupJobs.finalizeAttempt, latestManifestAttempt!),
              )
            : sql`true`,
        inArray(objectCleanupJobs.status, ["standby", "pending", "processing", "cancelled"]),
      ));
    if (!rows.length) {
      if (job.kind === "finalize") {
        const recoveryStatus = job.attemptCount >= job.maxAttempts ? "dead" : "retryable";
        noCleanupRecoveryDead = recoveryStatus === "dead";
        await transaction.update(assetUploadBatches).set({
          status: "failed",
          failureReason: recoveryStatus === "dead"
            ? "finalize_recovery_dead"
            : "finalize_recovered_retryable",
        }).where(eq(assetUploadBatches.id, job.uploadBatchId));
        await transaction.update(uploadRecoveryJobs).set({
          status: recoveryStatus,
          stage: "failed",
          nextAttemptAt: now,
          lockedBy: null,
          lockedAt: null,
          leaseExpiresAt: null,
          updatedAt: now,
        }).where(and(
          eq(uploadRecoveryJobs.id, job.id),
          eq(uploadRecoveryJobs.lockedBy, workerId),
        ));
        await auditWriter(transaction, {
          action: "asset.finalize.crash_recovered",
          entityType: "asset_upload_batch",
          entityId: job.uploadBatchId,
          afterSummary: {
            systemActor: UPLOAD_RECOVERY_SYSTEM_ACTOR,
            cleanupObjects: 0,
            manifestObjects: manifest.length,
            recoveryStatus,
          },
        });
      }
      return rows;
    }
    const manifestByKey = new Map(manifest.map((item) => [item.objectKey, item]));
    const unexpected = job.kind === "finalize"
      ? rows.filter((row) => !manifestByKey.has(row.objectKey))
      : [];
    if (unexpected.length) {
      await transaction.update(objectCleanupJobs).set({
        status: "dead",
        armedAt: now,
        armedReason: "finalize_manifest_mismatch_manual_review",
        lockedBy: null,
        lockedAt: null,
        leaseExpiresAt: null,
        updatedAt: now,
      }).where(inArray(objectCleanupJobs.id, unexpected.map((row) => row.id)));
    }
    const reclaimable = rows.filter((row) =>
      !unexpected.some((unexpectedRow) => unexpectedRow.id === row.id) &&
      (row.status !== "processing" || !row.leaseExpiresAt || row.leaseExpiresAt <= now),
    );
    for (const row of reclaimable) {
      const item = manifestByKey.get(row.objectKey);
      await transaction.update(objectCleanupJobs).set({
        status: "pending",
        ...(item ? {
          assetId: item.assetId,
          expectedObjectRole: item.objectRole,
          expectedMimeType: item.mimeType,
          expectedByteSize: item.byteSize,
          writeCompletedAt: item.writeCompletedAt,
          armedAt: now,
          armedReason: "finalize_lease_expired_recovery",
        } : {}),
        nextAttemptAt: now,
        lockedBy: null,
        lockedAt: null,
        leaseExpiresAt: null,
        completedAt: null,
        updatedAt: now,
      }).where(eq(objectCleanupJobs.id, row.id));
    }
    await transaction.update(uploadRecoveryJobs).set({
      status: "cleanup_required",
      stage: "cleanup_required",
      nextAttemptAt: now,
      lockedBy: null,
      lockedAt: null,
      leaseExpiresAt: null,
      updatedAt: now,
    }).where(and(
      eq(uploadRecoveryJobs.id, job.id),
      eq(uploadRecoveryJobs.lockedBy, workerId),
    ));
    await transaction.update(assetUploadBatches).set({
      status: "failed",
      failureReason: `${job.kind}_recovery_cleanup_required`,
    }).where(and(
      eq(assetUploadBatches.id, job.uploadBatchId),
      inArray(assetUploadBatches.status, ["created", "uploading", "ready_to_finalize", "finalizing", "failed"]),
    ));
    await auditWriter(transaction, {
      action: `asset.${job.kind}.cleanup_scheduled`,
      entityType: "upload_recovery_job",
      entityId: job.id,
      afterSummary: {
        systemActor: UPLOAD_RECOVERY_SYSTEM_ACTOR,
        cleanupObjects: rows.length,
      },
    });
    return rows;
  });
  await options.faultInjector?.("after_cleanup_scheduled");
  if (!cleanupRows.length) return noCleanupRecoveryDead ? "dead" : "retryable";
  let cleanupComplete = true;
  for (const cleanup of cleanupRows) {
    const result = await processObjectCleanupJob(db, storage, cleanup.id, {
      workerId: `${workerId}:cleanup`,
      now,
      auditWriter,
    });
    if (result !== "completed") cleanupComplete = false;
  }
  return cleanupComplete ? "completed" : "retryable";
}

export async function processPendingUploadRecoveryJobs<
  TQueryResult extends PgQueryResultHKT,
>(
  db: AppDatabase<TQueryResult>,
  storage: ObjectStorage,
  options: RecoveryOptions & { limit?: number } = {},
): Promise<{ attempted: number; completed: number }> {
  const now = options.now ?? new Date();
  const auditWriter = options.auditWriter ?? writeAuditLog;
  const limit = Math.max(1, Math.min(options.limit ?? 25, 100));
  await reconcileFinalizingRecoveryGaps(db, now, auditWriter, limit);
  const due = await db.select({ id: uploadRecoveryJobs.id })
    .from(uploadRecoveryJobs)
    .where(recoverableAt(now))
    .orderBy(asc(uploadRecoveryJobs.createdAt))
    .limit(limit);
  let completed = 0;
  for (const row of due) {
    const result = await recoverUploadRecoveryJob(db, storage, row.id, options);
    if (result === "completed" || result === "retryable") completed += 1;
  }
  return { attempted: due.length, completed };
}
