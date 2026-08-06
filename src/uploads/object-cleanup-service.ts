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

    const claimableBeforeLock = candidate.status === "pending"
      ? candidate.nextAttemptAt <= now
      : candidate.status === "processing" &&
        candidate.leaseExpiresAt !== null &&
        candidate.leaseExpiresAt <= now;
    if (!claimableBeforeLock) return null;

    const finalizeScoped = candidate.cleanupKind === "finalize_public" ||
      candidate.finalizeRecoveryId !== null ||
      candidate.finalizeManifestItemId !== null;
    if (candidate.uploadBatchId) {
      await transaction.execute(sql`
        select id from asset_upload_batches where id = ${candidate.uploadBatchId} for update
      `);
    }
    if (candidate.uploadIntentId) {
      await transaction.execute(sql`
        select id from upload_intents where id = ${candidate.uploadIntentId} for update
      `);
      await transaction.execute(sql`
        select id from upload_recovery_jobs
        where upload_intent_id = ${candidate.uploadIntentId}
        for update
      `);
    }
    if (candidate.finalizeRecoveryId) {
      await transaction.execute(sql`
        select id from upload_recovery_jobs where id = ${candidate.finalizeRecoveryId} for update
      `);
    }
    if (candidate.finalizeManifestItemId) {
      await transaction.execute(sql`
        select id from finalize_object_manifest_items
        where id = ${candidate.finalizeManifestItemId}
        for update
      `);
    }
    if (candidate.assetId) {
      await transaction.execute(sql`
        select id from assets where id = ${candidate.assetId} for update
      `);
    }
    await transaction.execute(sql`
      select id from object_cleanup_jobs where id = ${candidate.id} for update
    `);

    const currentJob = (await transaction.select().from(objectCleanupJobs)
      .where(eq(objectCleanupJobs.id, candidate.id)).limit(1))[0];
    const currentClaimable = currentJob?.status === "pending"
      ? currentJob.nextAttemptAt <= now
      : currentJob?.status === "processing" &&
        currentJob.leaseExpiresAt !== null &&
        currentJob.leaseExpiresAt <= now;
    if (!currentJob || !currentClaimable) return null;

    const projectionChangedAfterRead = (
      [
        "id",
        "uploadBatchId",
        "uploadIntentId",
        "assetId",
        "storagePartition",
        "objectKey",
        "cleanupKind",
        "status",
        "finalizeRecoveryId",
        "recoveryVersion",
        "finalizeAttempt",
        "finalizeManifestItemId",
        "expectedObjectRole",
        "expectedMimeType",
        "expectedByteSize",
        "writeCompletedAt",
      ] as const
    ).some((field) => {
      const before = candidate[field];
      const after = currentJob[field];
      return before instanceof Date && after instanceof Date
        ? before.getTime() !== after.getTime()
        : before !== after;
    });

    let identityMismatch = projectionChangedAfterRead;
    let recovery: typeof uploadRecoveryJobs.$inferSelect | undefined;
    if (finalizeScoped) {
      recovery = candidate.finalizeRecoveryId
        ? (await transaction.select().from(uploadRecoveryJobs)
            .where(eq(uploadRecoveryJobs.id, candidate.finalizeRecoveryId)).limit(1))[0]
        : undefined;
      const manifestItem = candidate.finalizeManifestItemId
        ? (await transaction.select().from(finalizeObjectManifestItems)
            .where(eq(finalizeObjectManifestItems.id, candidate.finalizeManifestItemId)).limit(1))[0]
        : undefined;
      const batch = candidate.uploadBatchId
        ? (await transaction.select({ id: assetUploadBatches.id }).from(assetUploadBatches)
            .where(eq(assetUploadBatches.id, candidate.uploadBatchId)).limit(1))[0]
        : undefined;
      identityMismatch ||= !batch ||
        !recovery ||
        !manifestItem ||
        currentJob.cleanupKind !== "finalize_public" ||
        currentJob.storagePartition !== "public" ||
        currentJob.uploadIntentId !== null ||
        currentJob.armedAt === null ||
        currentJob.finalizeRecoveryId !== recovery.id ||
        currentJob.recoveryVersion !== recovery.version ||
        currentJob.uploadBatchId !== recovery.uploadBatchId ||
        currentJob.finalizeManifestItemId !== manifestItem.id ||
        manifestItem.recoveryJobId !== recovery.id ||
        manifestItem.uploadBatchId !== recovery.uploadBatchId ||
        manifestItem.finalizeAttempt !== currentJob.finalizeAttempt ||
        currentJob.assetId !== manifestItem.assetId ||
        currentJob.objectKey !== manifestItem.objectKey ||
        currentJob.expectedObjectRole !== manifestItem.objectRole ||
        currentJob.expectedMimeType !== manifestItem.mimeType ||
        currentJob.expectedByteSize !== manifestItem.byteSize ||
        currentJob.writeCompletedAt?.getTime() !== manifestItem.writeCompletedAt?.getTime();
      if (
        recovery &&
        recovery.status === "processing" &&
        recovery.leaseExpiresAt &&
        recovery.leaseExpiresAt > now
      ) return null;
      if (recovery && recovery.status !== "cleanup_required" && recovery.status !== "dead") {
        identityMismatch = true;
      }
    } else if (currentJob.cleanupKind === "staging" || currentJob.cleanupKind === "finalize_private") {
      const intent = currentJob.uploadIntentId
        ? (await transaction.select().from(uploadIntents)
            .where(eq(uploadIntents.id, currentJob.uploadIntentId)).limit(1))[0]
        : undefined;
      recovery = currentJob.uploadIntentId
        ? (await transaction.select().from(uploadRecoveryJobs)
            .where(and(
              eq(uploadRecoveryJobs.uploadIntentId, currentJob.uploadIntentId),
              eq(uploadRecoveryJobs.kind, "staging"),
            )).limit(1))[0]
        : undefined;
      const asset = currentJob.assetId
        ? (await transaction.select().from(assets)
            .where(eq(assets.id, currentJob.assetId)).limit(1))[0]
        : undefined;
      identityMismatch ||= !intent ||
        !recovery ||
        !asset ||
        !(["private", "imports"] as const).includes(currentJob.storagePartition as "private" | "imports") ||
        currentJob.uploadBatchId !== intent.uploadBatchId ||
        currentJob.uploadBatchId !== recovery.uploadBatchId ||
        currentJob.assetId !== intent.assetId ||
        currentJob.assetId !== recovery.assetId ||
        currentJob.objectKey !== recovery.objectKey ||
        currentJob.objectKey !== asset.objectKey ||
        currentJob.storagePartition !== recovery.storagePartition ||
        (currentJob.cleanupKind === "staging" && currentJob.storagePartition !== asset.storagePartition) ||
        currentJob.recoveryVersion !== recovery.version ||
        currentJob.expectedObjectRole !== intent.adminAssetRole ||
        currentJob.expectedMimeType !== (asset.detectedMimeType ?? asset.declaredMimeType) ||
        currentJob.expectedByteSize !== asset.byteSize;
      if (
        recovery &&
        recovery.status === "processing" &&
        recovery.leaseExpiresAt &&
        recovery.leaseExpiresAt > now
      ) return null;
    }

    if (identityMismatch) {
      await transaction.update(objectCleanupJobs).set({
        status: "dead",
        armedAt: currentJob.armedAt ?? now,
        armedReason: "cleanup_identity_mismatch_manual_review",
        lockedBy: null,
        lockedAt: null,
        leaseExpiresAt: null,
        lastError: "cleanup_identity_mismatch_manual_review",
        updatedAt: now,
      }).where(eq(objectCleanupJobs.id, currentJob.id));
      await auditWriter(transaction, {
        action: "object_cleanup.identity_mismatch",
        entityType: "object_cleanup_job",
        entityId: currentJob.id,
        afterSummary: {
          systemActor: UPLOAD_RECOVERY_SYSTEM_ACTOR,
          cleanupKind: currentJob.cleanupKind,
          requiresManualReview: true,
        },
      });
      return null;
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
        uploadIntentId: objectCleanupJobs.uploadIntentId,
        cleanupKind: objectCleanupJobs.cleanupKind,
        finalizeRecoveryId: objectCleanupJobs.finalizeRecoveryId,
        recoveryVersion: objectCleanupJobs.recoveryVersion,
        finalizeAttempt: objectCleanupJobs.finalizeAttempt,
        finalizeManifestItemId: objectCleanupJobs.finalizeManifestItemId,
        partition: objectCleanupJobs.storagePartition,
        objectKey: objectCleanupJobs.objectKey,
        expectedObjectRole: objectCleanupJobs.expectedObjectRole,
        expectedMimeType: objectCleanupJobs.expectedMimeType,
        expectedByteSize: objectCleanupJobs.expectedByteSize,
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

  if (job.assetId && (job.partition === "private" || job.partition === "imports")) {
    const recovery = (await db.select().from(uploadRecoveryJobs).where(and(
      eq(uploadRecoveryJobs.assetId, job.assetId),
      eq(uploadRecoveryJobs.kind, "staging"),
    )).limit(1))[0];
    const asset = (await db.select({ partition: assets.storagePartition }).from(assets)
      .where(eq(assets.id, job.assetId)).limit(1))[0];
    if (recovery && asset?.partition === job.partition) {
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
    const postCommitMaintenance = job.cleanupKind === "finalize_private";
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
      if (dead && job.uploadBatchId && !postCommitMaintenance) {
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
          cleanupKind: job.cleanupKind,
          attempts: job.attemptCount,
          maintenanceOnly: postCommitMaintenance,
          requiresManualCleanup: dead && postCommitMaintenance,
          outcome: dead && postCommitMaintenance
            ? "private_staging_cleanup_exhausted"
            : dead
              ? "cleanup_exhausted"
              : "cleanup_retry_scheduled",
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
