import { randomUUID } from "node:crypto";
import { and, asc, eq, inArray, lte, or, sql } from "drizzle-orm";
import type { PgQueryResultHKT } from "drizzle-orm/pg-core/session";

import { writeAuditLog } from "@/audit/service";
import {
  assetUploadBatches,
  objectCleanupJobs,
} from "@/db/schema";
import type { AppDatabase } from "@/db/types";
import type { ObjectStorage, StoragePartition } from "@/storage";

export const CLEANUP_MAX_ATTEMPTS = 8;
export const CLEANUP_LEASE_MILLISECONDS = 60_000;
export const FINALIZE_COMPENSATION_GRACE_MILLISECONDS = 5 * 60_000;

export interface ObjectCleanupRegistration {
  uploadBatchId?: string | null;
  assetId?: string | null;
  storagePartition: StoragePartition;
  objectKey: string;
  reason: string;
  /** Delay protects an in-flight Finalize from its own cleanup worker. */
  notBefore?: Date;
}

export async function registerObjectCleanup<
  TQueryResult extends PgQueryResultHKT,
>(
  db: AppDatabase<TQueryResult>,
  input: ObjectCleanupRegistration,
): Promise<string> {
  const rows = await db
    .insert(objectCleanupJobs)
    .values({
      uploadBatchId: input.uploadBatchId ?? null,
      assetId: input.assetId ?? null,
      storagePartition: input.storagePartition,
      objectKey: input.objectKey,
      reason: input.reason,
      status: "pending",
      attemptCount: 0,
      maxAttempts: CLEANUP_MAX_ATTEMPTS,
      nextAttemptAt: input.notBefore ?? new Date(),
      lockedBy: null,
      lockedAt: null,
      leaseExpiresAt: null,
      lastError: null,
      completedAt: null,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: [objectCleanupJobs.storagePartition, objectCleanupJobs.objectKey],
      set: {
        uploadBatchId: input.uploadBatchId ?? null,
        assetId: input.assetId ?? null,
        reason: input.reason,
        status: "pending",
        attemptCount: 0,
        maxAttempts: CLEANUP_MAX_ATTEMPTS,
        nextAttemptAt: input.notBefore ?? new Date(),
        lockedBy: null,
        lockedAt: null,
        leaseExpiresAt: null,
        lastError: null,
        completedAt: null,
        updatedAt: new Date(),
      },
    })
    .returning({ id: objectCleanupJobs.id });
  const jobId = rows[0]?.id;
  if (!jobId) throw new Error("Object Cleanup Job registration failed.");
  return jobId;
}

export async function releaseBatchCleanupJobs<
  TQueryResult extends PgQueryResultHKT,
>(
  db: AppDatabase<TQueryResult>,
  batchId: string,
  now = new Date(),
): Promise<void> {
  await db
    .update(objectCleanupJobs)
    .set({
      status: "pending",
      nextAttemptAt: now,
      lockedBy: null,
      lockedAt: null,
      leaseExpiresAt: null,
      updatedAt: now,
    })
    .where(
      and(
        eq(objectCleanupJobs.uploadBatchId, batchId),
        eq(objectCleanupJobs.storagePartition, "public"),
        inArray(objectCleanupJobs.status, ["pending", "processing"]),
      ),
    );
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
) {
  const rows = await db
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
      partition: objectCleanupJobs.storagePartition,
      objectKey: objectCleanupJobs.objectKey,
      attemptCount: objectCleanupJobs.attemptCount,
      maxAttempts: objectCleanupJobs.maxAttempts,
    });
  return rows[0] ?? null;
}

async function reconcileFinalizeBatch<TQueryResult extends PgQueryResultHKT>(
  db: AppDatabase<TQueryResult>,
  batchId: string | null,
  now: Date,
): Promise<void> {
  if (!batchId) return;
  const remaining = await db
    .select({ id: objectCleanupJobs.id, status: objectCleanupJobs.status })
    .from(objectCleanupJobs)
    .where(
      and(
        eq(objectCleanupJobs.uploadBatchId, batchId),
        eq(objectCleanupJobs.storagePartition, "public"),
        inArray(objectCleanupJobs.status, ["pending", "processing", "dead"]),
      ),
    );
  const hasDead = remaining.some((row) => row.status === "dead");
  if (hasDead) {
    await db
      .update(assetUploadBatches)
      .set({ status: "failed", failureReason: "public_object_cleanup_dead" })
      .where(
        and(
          eq(assetUploadBatches.id, batchId),
          inArray(assetUploadBatches.status, ["finalizing", "failed"]),
        ),
      );
    return;
  }
  if (remaining.length === 0) {
    await db
      .update(assetUploadBatches)
      .set({ status: "ready_to_finalize", failureReason: null })
      .where(
        and(
          eq(assetUploadBatches.id, batchId),
          inArray(assetUploadBatches.status, ["finalizing", "failed"]),
        ),
      );
    void now;
  }
}

export async function processObjectCleanupJob<
  TQueryResult extends PgQueryResultHKT,
>(
  db: AppDatabase<TQueryResult>,
  storage: ObjectStorage,
  jobId: string,
  options: { workerId?: string; now?: Date; leaseMilliseconds?: number } = {},
): Promise<"completed" | "retry" | "dead" | "not_claimed"> {
  const workerId = options.workerId ?? `cleanup-${randomUUID()}`;
  const now = options.now ?? new Date();
  const job = await claimObjectCleanupJob(
    db,
    jobId,
    workerId,
    now,
    options.leaseMilliseconds ?? CLEANUP_LEASE_MILLISECONDS,
  );
  if (!job) return "not_claimed";
  if (!(["public", "private", "imports"] as const).includes(job.partition as StoragePartition)) {
    throw new Error("Cleanup Job storage partition is invalid.");
  }
  try {
    await storage.delete(job.partition as StoragePartition, job.objectKey);
    const completed = await db
      .update(objectCleanupJobs)
      .set({
        status: "completed",
        completedAt: new Date(),
        lockedBy: null,
        lockedAt: null,
        leaseExpiresAt: null,
        lastError: null,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(objectCleanupJobs.id, job.id),
          eq(objectCleanupJobs.status, "processing"),
          eq(objectCleanupJobs.lockedBy, workerId),
        ),
      )
      .returning({ id: objectCleanupJobs.id });
    if (!completed[0]) throw new Error("Object Cleanup lease was lost after deletion.");
    await reconcileFinalizeBatch(db, job.uploadBatchId, now);
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
      if (dead) {
        await writeAuditLog(transaction, {
          action: "object_cleanup.dead",
          entityType: "object_cleanup_job",
          entityId: job.id,
          afterSummary: {
            uploadBatchId: job.uploadBatchId,
            partition: job.partition,
            attempts: job.attemptCount,
          },
        });
      }
    });
    await reconcileFinalizeBatch(db, job.uploadBatchId, now);
    return dead ? "dead" : "retry";
  }
}

export async function processPendingObjectCleanupJobs<
  TQueryResult extends PgQueryResultHKT,
>(
  db: AppDatabase<TQueryResult>,
  storage: ObjectStorage,
  options: { limit?: number; workerId?: string; now?: Date } = {},
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
    const result = await processObjectCleanupJob(db, storage, row.id, { workerId, now });
    if (result === "completed") completed += 1;
    if (result === "dead") dead += 1;
  }
  return { attempted: due.length, completed, dead };
}
