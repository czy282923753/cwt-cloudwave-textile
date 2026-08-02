import { randomUUID } from "node:crypto";
import { and, asc, eq, inArray, lte, or, sql } from "drizzle-orm";
import type { PgQueryResultHKT } from "drizzle-orm/pg-core/session";

import { writeAuditLog } from "@/audit/service";
import {
  assetUploadBatches,
  assets,
  finalizeObjectManifestItems,
  objectCleanupJobs,
  uploadIntents,
  uploadRecoveryJobs,
} from "@/db/schema";
import type { AppDatabase } from "@/db/types";
import type { ObjectStorage, StoragePartition } from "@/storage";

export const CLEANUP_MAX_ATTEMPTS = 8;
export const CLEANUP_LEASE_MILLISECONDS = 60_000;
export const UPLOAD_RECOVERY_SYSTEM_ACTOR = "system:upload-recovery-worker";

export interface ObjectCleanupRegistration {
  uploadBatchId?: string | null;
  assetId?: string | null;
  storagePartition: StoragePartition;
  objectKey: string;
  reason: string;
  notBefore?: Date;
}

export async function registerObjectCleanup<
  TQueryResult extends PgQueryResultHKT,
>(
  db: AppDatabase<TQueryResult>,
  input: ObjectCleanupRegistration,
): Promise<string> {
  const now = new Date();
  const rows = await db
    .insert(objectCleanupJobs)
    .values({
      uploadBatchId: input.uploadBatchId ?? null,
      assetId: input.assetId ?? null,
      storagePartition: input.storagePartition,
      objectKey: input.objectKey,
      reason: input.reason,
      status: "pending",
      armedAt: now,
      armedReason: input.reason,
      attemptCount: 0,
      maxAttempts: CLEANUP_MAX_ATTEMPTS,
      nextAttemptAt: input.notBefore ?? now,
      lockedBy: null,
      lockedAt: null,
      leaseExpiresAt: null,
      lastError: null,
      completedAt: null,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: [objectCleanupJobs.storagePartition, objectCleanupJobs.objectKey],
      set: {
        uploadBatchId: input.uploadBatchId ?? null,
        assetId: input.assetId ?? null,
        reason: input.reason,
        status: "pending",
        armedAt: now,
        armedReason: input.reason,
        attemptCount: 0,
        maxAttempts: CLEANUP_MAX_ATTEMPTS,
        nextAttemptAt: input.notBefore ?? now,
        lockedBy: null,
        lockedAt: null,
        leaseExpiresAt: null,
        lastError: null,
        completedAt: null,
        updatedAt: now,
      },
    })
    .returning({ id: objectCleanupJobs.id });
  const jobId = rows[0]?.id;
  if (!jobId) throw new Error("Object Cleanup Job registration failed.");
  return jobId;
}

function claimableCleanup(now: Date) {
  return or(
    and(
      eq(objectCleanupJobs.status, "pending"),
      lte(objectCleanupJobs.nextAttemptAt, now),
    ),
    and(
      eq(objectCleanupJobs.status, "processing"),
      lte(objectCleanupJobs.leaseExpiresAt, now),
    ),
  );
}

export async function claimObjectCleanupJob<
  TQueryResult extends PgQueryResultHKT,
>(
  db: AppDatabase<TQueryResult>,
  jobId: string,
  workerId: string,
  now = new Date(),
  leaseMilliseconds = CLEANUP_LEASE_MILLISECONDS,
  auditWriter: typeof writeAuditLog = writeAuditLog,
) {
  return db.transaction(async (transaction) => {
    const candidate = (await transaction.select().from(objectCleanupJobs)
      .where(eq(objectCleanupJobs.id, jobId)).limit(1))[0];
    if (!candidate) return null;

    if (candidate.storagePartition === "public" && candidate.uploadBatchId) {
      if (
        !candidate.finalizeRecoveryId ||
        candidate.finalizeAttempt === null ||
        !candidate.armedAt
      ) return null;
      await transaction.execute(sql`
        select id from asset_upload_batches
        where id = ${candidate.uploadBatchId}
        for update
      `);
      await transaction.execute(sql`
        select id from upload_recovery_jobs
        where id = ${candidate.finalizeRecoveryId}
        for update
      `);
      await transaction.execute(sql`
        select id from finalize_object_manifest_items
        where recovery_job_id = ${candidate.finalizeRecoveryId}
          and finalize_attempt = ${candidate.finalizeAttempt}
          and object_key = ${candidate.objectKey}
        for update
      `);
      await transaction.execute(sql`
        select id from object_cleanup_jobs
        where id = ${candidate.id}
        for update
      `);
      const recovery = (await transaction.select().from(uploadRecoveryJobs).where(and(
        eq(uploadRecoveryJobs.id, candidate.finalizeRecoveryId),
        eq(uploadRecoveryJobs.uploadBatchId, candidate.uploadBatchId),
        eq(uploadRecoveryJobs.kind, "finalize"),
      )).limit(1))[0];
      const currentJob = (await transaction.select().from(objectCleanupJobs)
        .where(eq(objectCleanupJobs.id, candidate.id)).limit(1))[0];
      const manifestItem = (await transaction.select()
        .from(finalizeObjectManifestItems)
        .where(and(
          eq(finalizeObjectManifestItems.recoveryJobId, candidate.finalizeRecoveryId),
          eq(finalizeObjectManifestItems.finalizeAttempt, candidate.finalizeAttempt),
          eq(finalizeObjectManifestItems.objectKey, candidate.objectKey),
        )).limit(1))[0];
      if (
        !recovery ||
        !manifestItem ||
        !currentJob?.armedAt ||
        currentJob.status === "standby" ||
        currentJob.assetId !== manifestItem.assetId ||
        currentJob.expectedObjectRole !== manifestItem.objectRole ||
        currentJob.expectedMimeType !== manifestItem.mimeType ||
        currentJob.expectedByteSize !== manifestItem.byteSize
      ) return null;
      if (
        recovery.status === "processing" &&
        recovery.leaseExpiresAt &&
        recovery.leaseExpiresAt > now
      ) {
        return null;
      }
      if (recovery.status !== "cleanup_required" && recovery.status !== "dead") {
        return null;
      }
    } else {
      await transaction.execute(sql`
        select id from object_cleanup_jobs
        where id = ${candidate.id}
        for update
      `);
    }

    const rows = await transaction
      .update(objectCleanupJobs)
      .set({
        status: "processing",
        attemptCount: sql`${objectCleanupJobs.attemptCount} + 1`,
        lockedBy: workerId,
        lockedAt: now,
        leaseExpiresAt: new Date(now.getTime() + leaseMilliseconds),
        lastError: null,
        updatedAt: now,
      })
      .where(and(eq(objectCleanupJobs.id, jobId), claimableCleanup(now)))
      .returning({
        id: objectCleanupJobs.id,
        uploadBatchId: objectCleanupJobs.uploadBatchId,
        assetId: objectCleanupJobs.assetId,
        finalizeRecoveryId: objectCleanupJobs.finalizeRecoveryId,
        finalizeAttempt: objectCleanupJobs.finalizeAttempt,
        partition: objectCleanupJobs.storagePartition,
        objectKey: objectCleanupJobs.objectKey,
        attemptCount: objectCleanupJobs.attemptCount,
        maxAttempts: objectCleanupJobs.maxAttempts,
      });
    const claimed = rows[0];
    if (!claimed) return null;
    await auditWriter(transaction, {
      action: "object_cleanup.claimed",
      entityType: "object_cleanup_job",
      entityId: claimed.id,
      afterSummary: {
        systemActor: UPLOAD_RECOVERY_SYSTEM_ACTOR,
        workerId,
        partition: claimed.partition,
      },
    });
    return claimed;
  });
}

async function reconcileCleanupTransaction<TQueryResult extends PgQueryResultHKT>(
  db: AppDatabase<TQueryResult>,
  job: {
    id: string;
    uploadBatchId: string | null;
    assetId: string | null;
    finalizeRecoveryId: string | null;
    finalizeAttempt: number | null;
    partition: string;
  },
  now: Date,
  auditWriter: typeof writeAuditLog,
): Promise<void> {
  if (job.uploadBatchId && job.partition === "public") {
    const remaining = await db
      .select({ id: objectCleanupJobs.id, status: objectCleanupJobs.status })
      .from(objectCleanupJobs)
      .where(
        and(
          eq(objectCleanupJobs.uploadBatchId, job.uploadBatchId),
          eq(objectCleanupJobs.storagePartition, "public"),
          job.finalizeRecoveryId
            ? eq(objectCleanupJobs.finalizeRecoveryId, job.finalizeRecoveryId)
            : sql`true`,
          job.finalizeAttempt !== null
            ? eq(objectCleanupJobs.finalizeAttempt, job.finalizeAttempt)
            : sql`true`,
          inArray(objectCleanupJobs.status, ["standby", "pending", "processing", "dead"]),
        ),
      );
    if (remaining.some((row) => row.status === "dead")) {
      await db.update(assetUploadBatches).set({
        status: "failed",
        failureReason: "public_object_cleanup_dead",
      }).where(eq(assetUploadBatches.id, job.uploadBatchId));
      await db.update(uploadRecoveryJobs).set({
        status: "dead",
        stage: "failed",
        lockedBy: null,
        lockedAt: null,
        leaseExpiresAt: null,
        lastError: "public_object_cleanup_dead",
        updatedAt: now,
      }).where(and(
        eq(uploadRecoveryJobs.uploadBatchId, job.uploadBatchId),
        eq(uploadRecoveryJobs.kind, "finalize"),
      ));
      await auditWriter(db, {
        action: "asset.finalize.cleanup_dead",
        entityType: "asset_upload_batch",
        entityId: job.uploadBatchId,
        afterSummary: { systemActor: UPLOAD_RECOVERY_SYSTEM_ACTOR },
      });
      return;
    }
    if (remaining.length === 0) {
      await db.update(assetUploadBatches).set({
        status: "failed",
        failureReason: "finalize_compensation_completed_retryable",
      }).where(and(
        eq(assetUploadBatches.id, job.uploadBatchId),
        inArray(assetUploadBatches.status, ["finalizing", "failed"]),
      ));
      await db.update(uploadRecoveryJobs).set({
        status: "retryable",
        stage: "failed",
        nextAttemptAt: now,
        lockedBy: null,
        lockedAt: null,
        leaseExpiresAt: null,
        updatedAt: now,
      }).where(and(
        eq(uploadRecoveryJobs.uploadBatchId, job.uploadBatchId),
        eq(uploadRecoveryJobs.kind, "finalize"),
        inArray(uploadRecoveryJobs.status, ["processing", "cleanup_required"]),
      ));
      await auditWriter(db, {
        action: "asset.finalize.cleanup_reconciled",
        entityType: "asset_upload_batch",
        entityId: job.uploadBatchId,
        afterSummary: {
          systemActor: UPLOAD_RECOVERY_SYSTEM_ACTOR,
          recoveryStatus: "retryable",
        },
      });
    }
  }

  if (job.assetId && job.partition === "private") {
    const recovery = (await db.select().from(uploadRecoveryJobs).where(and(
      eq(uploadRecoveryJobs.assetId, job.assetId),
      eq(uploadRecoveryJobs.kind, "staging"),
    )).limit(1))[0];
    const asset = (await db.select({ partition: assets.storagePartition }).from(assets)
      .where(eq(assets.id, job.assetId)).limit(1))[0];
    if (recovery && asset?.partition === "private") {
      const wasCompleted = recovery.status === "completed";
      await db.update(assets).set({
        status: "deleted",
        deletedAt: now,
        updatedAt: now,
      }).where(eq(assets.id, job.assetId));
      if (recovery.uploadIntentId) {
        await db.update(uploadIntents).set({
          status: wasCompleted ? "expired" : "failed",
          failureReason: wasCompleted ? "staging_expired" : "staging_recovered",
          updatedAt: now,
        }).where(eq(uploadIntents.id, recovery.uploadIntentId));
      }
      await db.update(assetUploadBatches).set({
        status: wasCompleted ? "expired" : "failed",
        failureReason: wasCompleted ? "staging_expired" : "staging_recovered",
      }).where(and(
        eq(assetUploadBatches.id, recovery.uploadBatchId),
        inArray(assetUploadBatches.status, ["created", "uploading", "ready_to_finalize", "failed"]),
      ));
      await db.update(uploadRecoveryJobs).set({
        status: "completed",
        stage: wasCompleted ? "completed" : "failed",
        completedAt: now,
        lockedBy: null,
        lockedAt: null,
        leaseExpiresAt: null,
        updatedAt: now,
      }).where(eq(uploadRecoveryJobs.id, recovery.id));
      await auditWriter(db, {
        action: wasCompleted
          ? "asset.upload_staging.expired_cleanup"
          : "asset.upload_staging.recovered",
        entityType: "asset",
        entityId: job.assetId,
        afterSummary: {
          systemActor: UPLOAD_RECOVERY_SYSTEM_ACTOR,
          uploadBatchId: recovery.uploadBatchId,
        },
      });
    }
  }
}

export async function processObjectCleanupJob<
  TQueryResult extends PgQueryResultHKT,
>(
  db: AppDatabase<TQueryResult>,
  storage: ObjectStorage,
  jobId: string,
  options: {
    workerId?: string;
    now?: Date;
    leaseMilliseconds?: number;
    auditWriter?: typeof writeAuditLog;
  } = {},
): Promise<"completed" | "retry" | "dead" | "not_claimed"> {
  const workerId = options.workerId ?? `cleanup-${randomUUID()}`;
  const now = options.now ?? new Date();
  const auditWriter = options.auditWriter ?? writeAuditLog;
  const job = await claimObjectCleanupJob(
    db,
    jobId,
    workerId,
    now,
    options.leaseMilliseconds ?? CLEANUP_LEASE_MILLISECONDS,
    auditWriter,
  );
  if (!job) return "not_claimed";
  if (!(["public", "private", "imports"] as const).includes(job.partition as StoragePartition)) {
    throw new Error("Cleanup Job storage partition is invalid.");
  }
  try {
    await storage.delete(job.partition as StoragePartition, job.objectKey);
    await db.transaction(async (transaction) => {
      const completed = await transaction
        .update(objectCleanupJobs)
        .set({
          status: "completed",
          completedAt: now,
          lockedBy: null,
          lockedAt: null,
          leaseExpiresAt: null,
          lastError: null,
          updatedAt: now,
        })
        .where(and(
          eq(objectCleanupJobs.id, job.id),
          eq(objectCleanupJobs.status, "processing"),
          eq(objectCleanupJobs.lockedBy, workerId),
        ))
        .returning({ id: objectCleanupJobs.id });
      if (!completed[0]) throw new Error("Object Cleanup lease was lost after deletion.");
      await reconcileCleanupTransaction(transaction, {
        id: job.id,
        uploadBatchId: job.uploadBatchId,
        assetId: job.assetId,
        finalizeRecoveryId: job.finalizeRecoveryId,
        finalizeAttempt: job.finalizeAttempt,
        partition: job.partition,
      }, now, auditWriter);
      await auditWriter(transaction, {
        action: "object_cleanup.completed",
        entityType: "object_cleanup_job",
        entityId: job.id,
        afterSummary: {
          systemActor: UPLOAD_RECOVERY_SYSTEM_ACTOR,
          partition: job.partition,
        },
      });
    });
    return "completed";
  } catch (error) {
    const dead = job.attemptCount >= job.maxAttempts;
    const delay = Math.min(30_000 * 2 ** Math.max(0, job.attemptCount - 1), 3_600_000);
    await db.transaction(async (transaction) => {
      const updated = await transaction
        .update(objectCleanupJobs)
        .set({
          status: dead ? "dead" : "pending",
          nextAttemptAt: new Date(now.getTime() + delay),
          lastError: error instanceof Error ? error.message.slice(0, 500) : "unknown",
          lockedBy: null,
          lockedAt: null,
          leaseExpiresAt: null,
          updatedAt: now,
        })
        .where(
          and(
            eq(objectCleanupJobs.id, job.id),
            eq(objectCleanupJobs.lockedBy, workerId),
          ),
        )
        .returning({ id: objectCleanupJobs.id });
      if (!updated[0]) throw new Error("Object Cleanup lease was lost after failure.");
      if (dead && job.uploadBatchId) {
        await transaction.update(assetUploadBatches).set({
          status: "failed",
          failureReason: job.partition === "public"
            ? "public_object_cleanup_dead"
            : "private_staging_cleanup_dead",
        }).where(eq(assetUploadBatches.id, job.uploadBatchId));
        await transaction.update(uploadRecoveryJobs).set({
          status: "dead",
          stage: "failed",
          lockedBy: null,
          lockedAt: null,
          leaseExpiresAt: null,
          lastError: error instanceof Error ? error.message.slice(0, 500) : "unknown",
          updatedAt: now,
        }).where(and(
          eq(uploadRecoveryJobs.uploadBatchId, job.uploadBatchId),
          eq(uploadRecoveryJobs.kind, job.partition === "public" ? "finalize" : "staging"),
        ));
      }
      await auditWriter(transaction, {
        action: dead ? "object_cleanup.dead" : "object_cleanup.retry_scheduled",
        entityType: "object_cleanup_job",
        entityId: job.id,
        afterSummary: {
          systemActor: UPLOAD_RECOVERY_SYSTEM_ACTOR,
          uploadBatchId: job.uploadBatchId,
          partition: job.partition,
          attempts: job.attemptCount,
        },
      });
    });
    return dead ? "dead" : "retry";
  }
}

export async function processPendingObjectCleanupJobs<
  TQueryResult extends PgQueryResultHKT,
>(
  db: AppDatabase<TQueryResult>,
  storage: ObjectStorage,
  options: {
    limit?: number;
    workerId?: string;
    now?: Date;
    auditWriter?: typeof writeAuditLog;
  } = {},
): Promise<{ attempted: number; completed: number; dead: number }> {
  const now = options.now ?? new Date();
  const workerId = options.workerId ?? `cleanup-${randomUUID()}`;
  const due = await db
    .select({ id: objectCleanupJobs.id })
    .from(objectCleanupJobs)
    .where(claimableCleanup(now))
    .orderBy(asc(objectCleanupJobs.createdAt))
    .limit(Math.max(1, Math.min(options.limit ?? 25, 100)));
  let completed = 0;
  let dead = 0;
  for (const row of due) {
    const result = await processObjectCleanupJob(db, storage, row.id, {
      workerId,
      now,
      ...(options.auditWriter ? { auditWriter: options.auditWriter } : {}),
    });
    if (result === "completed") completed += 1;
    if (result === "dead") dead += 1;
  }
  return { attempted: due.length, completed, dead };
}
