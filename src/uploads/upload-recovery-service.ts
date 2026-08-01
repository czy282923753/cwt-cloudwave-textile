import { randomUUID } from "node:crypto";
import { and, asc, eq, gt, inArray, lte, or, sql } from "drizzle-orm";
import type { PgQueryResultHKT } from "drizzle-orm/pg-core/session";

import { writeAuditLog } from "@/audit/service";
import {
  assetUploadBatches,
  objectCleanupJobs,
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
  leaseExpiresAt: Date;
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
    const publicCleanup = await transaction.select({ id: objectCleanupJobs.id })
      .from(objectCleanupJobs)
      .where(and(
        eq(objectCleanupJobs.uploadBatchId, batchId),
        eq(objectCleanupJobs.storagePartition, "public"),
        inArray(objectCleanupJobs.status, ["pending", "processing"]),
      ));
    const nextStatus = publicCleanup.length ? "cleanup_required" : "retryable";
    const updated = (await transaction.update(uploadRecoveryJobs).set({
      status: nextStatus,
      stage: publicCleanup.length ? "cleanup_required" : "failed",
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
    if (publicCleanup.length) {
      await transaction.update(objectCleanupJobs).set({
        status: "pending",
        nextAttemptAt: now,
        lockedBy: null,
        lockedAt: null,
        leaseExpiresAt: null,
        updatedAt: now,
      }).where(and(
        eq(objectCleanupJobs.uploadBatchId, batchId),
        eq(objectCleanupJobs.storagePartition, "public"),
        inArray(objectCleanupJobs.status, ["pending", "processing"]),
      ));
    }
    await auditWriter(transaction, {
      action: "asset.finalize.recovery_required",
      entityType: "asset_upload_batch",
      entityId: batchId,
      afterSummary: {
        systemActor: UPLOAD_RECOVERY_SYSTEM_ACTOR,
        recoveryStatus: nextStatus,
        registeredCleanupObjects: publicCleanup.length,
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
    const rows = await transaction.select({ id: objectCleanupJobs.id })
      .from(objectCleanupJobs)
      .where(and(
        eq(objectCleanupJobs.uploadBatchId, job.uploadBatchId),
        eq(objectCleanupJobs.storagePartition, partition),
        job.kind === "staging" && job.assetId
          ? eq(objectCleanupJobs.assetId, job.assetId)
          : sql`true`,
        inArray(objectCleanupJobs.status, ["pending", "processing"]),
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
            recoveryStatus,
          },
        });
      }
      return rows;
    }
    await transaction.update(objectCleanupJobs).set({
      status: "pending",
      nextAttemptAt: now,
      lockedBy: null,
      lockedAt: null,
      leaseExpiresAt: null,
      updatedAt: now,
    }).where(inArray(objectCleanupJobs.id, rows.map((row) => row.id)));
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
