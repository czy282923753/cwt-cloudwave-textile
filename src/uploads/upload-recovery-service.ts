import { randomUUID } from "node:crypto";
import { and, asc, desc, eq, gt, inArray, isNull, lte, or, sql } from "drizzle-orm";
import type { PgQueryResultHKT } from "drizzle-orm/pg-core/session";

import { writeAuditLog } from "@/audit/service";
import {
  assetUploadBatches,
  assets,
  assetVariants,
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
import { detectMimeType } from "./file-validation";

export const UPLOAD_RECOVERY_LEASE_MILLISECONDS = 60_000;

type RecoveryStage = typeof uploadRecoveryJobs.$inferSelect.stage;

const PRE_MANIFEST_FINALIZE_STAGES: ReadonlySet<RecoveryStage> = new Set([
  "claimed",
  "source_copy_started",
  "variants_processing",
]);

const MANIFEST_FINALIZE_STAGES: ReadonlySet<RecoveryStage> = new Set([
  "manifest_registered",
  "original_written",
  "variants_processing",
  "variants_written",
  "database_finalizing",
  "cleanup_required",
  "failed",
]);

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
    const insertedManifest = await transaction.insert(finalizeObjectManifestItems).values(items.map((item) => ({
      recoveryJobId: lease.id,
      uploadBatchId: batchId,
      finalizeAttempt: lease.attemptCount,
      assetId: item.assetId,
      objectKey: item.objectKey,
      objectRole: item.role,
      mimeType: item.mimeType,
      byteSize: item.byteSize,
      writeCompletedAt: null,
      evidenceStatus: "planned" as const,
      evidenceSource: "current_finalize_manifest",
      updatedAt: now,
    }))).returning({
      id: finalizeObjectManifestItems.id,
      objectKey: finalizeObjectManifestItems.objectKey,
    });
    const manifestIdByKey = new Map(insertedManifest.map((item) => [item.objectKey, item.id]));
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
    for (const item of items) {
      const manifestItemId = manifestIdByKey.get(item.objectKey);
      if (!manifestItemId) throw new Error("Finalize Manifest identity was not persisted.");
      await transaction.insert(objectCleanupJobs).values({
        uploadBatchId: batchId,
        assetId: item.assetId,
        storagePartition: "public",
        objectKey: item.objectKey,
        reason: item.role === "original"
          ? "finalize_public_original_compensation"
          : "finalize_public_variant_compensation",
        cleanupKind: "finalize_public",
        status: "standby",
        finalizeRecoveryId: lease.id,
        recoveryVersion: updated.version,
        finalizeAttempt: lease.attemptCount,
        finalizeManifestItemId: manifestItemId,
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
          cleanupKind: "finalize_public",
          status: "standby",
          finalizeRecoveryId: lease.id,
          recoveryVersion: updated.version,
          finalizeAttempt: lease.attemptCount,
          finalizeManifestItemId: manifestItemId,
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
      evidenceStatus: "written",
      evidenceSource: "current_finalize_storage_put",
      observedByteSize: sql`${finalizeObjectManifestItems.byteSize}`,
      observedMimeType: sql`${finalizeObjectManifestItems.mimeType}`,
      observedAt: now,
      evidenceVerifiedAt: null,
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
      recoveryVersion: recovery.version,
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

export async function revalidateHistoricalFinalizeManifest<
  TQueryResult extends PgQueryResultHKT,
>(
  db: AppDatabase<TQueryResult>,
  storage: ObjectStorage,
  recoveryJobId: string,
  options: Pick<RecoveryOptions, "auditWriter" | "now"> = {},
): Promise<number> {
  const now = options.now ?? new Date();
  const auditWriter = options.auditWriter ?? writeAuditLog;
  const recovery = (await db.select().from(uploadRecoveryJobs).where(
    eq(uploadRecoveryJobs.id, recoveryJobId),
  ).limit(1))[0];
  if (
    !recovery ||
    recovery.kind !== "finalize" ||
    recovery.status !== "completed" ||
    recovery.stage !== "completed" ||
    !recovery.uploadBatchId
  ) {
    throw new Error("Finalize Recovery was not found for storage evidence revalidation.");
  }
  const manifest = await db.select().from(finalizeObjectManifestItems).where(and(
    eq(finalizeObjectManifestItems.recoveryJobId, recovery.id),
    eq(finalizeObjectManifestItems.uploadBatchId, recovery.uploadBatchId),
    eq(finalizeObjectManifestItems.finalizeAttempt, recovery.attemptCount),
    eq(finalizeObjectManifestItems.evidenceStatus, "unverified"),
  ));
  if (!manifest.length) return 0;
  const manifestAssetIds = [...new Set(manifest.map((item) => item.assetId))];
  const relatedAssets = await db.select().from(assets).where(inArray(assets.id, manifestAssetIds));
  const relatedVariants = await db.select().from(assetVariants).where(
    inArray(assetVariants.sourceAssetId, manifestAssetIds),
  );
  const assetById = new Map(relatedAssets.map((asset) => [asset.id, asset]));
  const variantByAssetAndKey = new Map(
    relatedVariants.map((variant) => [`${variant.sourceAssetId}:${variant.objectKey}`, variant]),
  );
  const assertEntityIdentity = (item: typeof finalizeObjectManifestItems.$inferSelect): void => {
    const asset = assetById.get(item.assetId);
    const variant = variantByAssetAndKey.get(`${item.assetId}:${item.objectKey}`);
    const assetMime = asset?.detectedMimeType ?? asset?.declaredMimeType;
    if (
      !asset ||
      asset.uploadBatchId !== recovery.uploadBatchId ||
      asset.storagePartition !== "public" ||
      asset.access !== "public" ||
      asset.status !== "ready" ||
      asset.scanStatus !== "passed" ||
      asset.deletedAt !== null ||
      (item.objectRole === "original"
        ? asset.objectKey !== item.objectKey || assetMime !== item.mimeType
        : !variant || `image/${variant.format}` !== item.mimeType)
    ) {
      throw new Error("Historical Finalize Asset and Manifest identity do not match.");
    }
  };
  for (const item of manifest) assertEntityIdentity(item);
  const observations = new Map<string, { byteSize: number; mimeType: string }>();
  for (const item of manifest) {
    if (!(await storage.exists("public", item.objectKey))) {
      throw new Error("Historical Finalize object is missing from Public storage.");
    }
    const bytes = await storage.get("public", item.objectKey);
    const mimeType = detectMimeType(bytes);
    if (mimeType !== item.mimeType) {
      throw new Error("Historical Finalize object MIME evidence does not match its Manifest.");
    }
    observations.set(item.id, { byteSize: bytes.byteLength, mimeType });
  }
  return db.transaction(async (transaction) => {
    await transaction.execute(sql`
      select id from asset_upload_batches where id = ${recovery.uploadBatchId} for update
    `);
    await transaction.execute(sql`
      select id from upload_recovery_jobs where id = ${recovery.id} for update
    `);
    await transaction.execute(sql`
      select id from finalize_object_manifest_items
      where recovery_job_id = ${recovery.id}
      order by id for update
    `);
    await transaction.execute(sql`
      select id from object_cleanup_jobs
      where finalize_recovery_id = ${recovery.id}
      order by id for update
    `);
    await transaction.execute(sql`
      select id from assets
      where id in (
        select asset_id from finalize_object_manifest_items
        where recovery_job_id = ${recovery.id}
          and finalize_attempt = ${recovery.attemptCount}
      )
      order by id for update
    `);
    await transaction.execute(sql`
      select id from asset_variants
      where source_asset_id in (
        select asset_id from finalize_object_manifest_items
        where recovery_job_id = ${recovery.id}
          and finalize_attempt = ${recovery.attemptCount}
      )
      order by id for update
    `);
    const currentBatch = (await transaction.select().from(assetUploadBatches)
      .where(eq(assetUploadBatches.id, recovery.uploadBatchId)).limit(1))[0];
    const currentRecovery = (await transaction.select().from(uploadRecoveryJobs)
      .where(eq(uploadRecoveryJobs.id, recovery.id)).limit(1))[0];
    const currentManifest = await transaction.select().from(finalizeObjectManifestItems).where(and(
      eq(finalizeObjectManifestItems.recoveryJobId, recovery.id),
      eq(finalizeObjectManifestItems.uploadBatchId, recovery.uploadBatchId),
      eq(finalizeObjectManifestItems.finalizeAttempt, recovery.attemptCount),
      eq(finalizeObjectManifestItems.evidenceStatus, "unverified"),
    ));
    const currentCleanup = await transaction.select().from(objectCleanupJobs).where(and(
      eq(objectCleanupJobs.finalizeRecoveryId, recovery.id),
      eq(objectCleanupJobs.finalizeAttempt, recovery.attemptCount),
    ));
    if (
      !currentBatch ||
      currentBatch.status !== "completed" ||
      !currentRecovery ||
      currentRecovery.kind !== "finalize" ||
      currentRecovery.status !== "completed" ||
      currentRecovery.stage !== "completed" ||
      currentRecovery.uploadBatchId !== recovery.uploadBatchId ||
      currentRecovery.attemptCount !== recovery.attemptCount ||
      currentRecovery.version !== recovery.version ||
      currentManifest.length !== manifest.length ||
      currentCleanup.length !== currentManifest.length
    ) {
      throw new Error("Historical Finalize evidence changed during revalidation.");
    }
    const currentManifestById = new Map(currentManifest.map((item) => [item.id, item]));
    if (currentCleanup.some((job) => {
      const item = job.finalizeManifestItemId
        ? currentManifestById.get(job.finalizeManifestItemId)
        : undefined;
      return !item ||
        job.cleanupKind !== "finalize_public" ||
        job.storagePartition !== "public" ||
        job.status !== "cancelled" ||
        job.uploadBatchId !== recovery.uploadBatchId ||
        job.uploadIntentId !== null ||
        job.finalizeRecoveryId !== recovery.id ||
        job.recoveryVersion !== currentRecovery.version ||
        job.finalizeAttempt !== recovery.attemptCount ||
        job.assetId !== item.assetId ||
        job.objectKey !== item.objectKey ||
        job.expectedObjectRole !== item.objectRole ||
        job.expectedMimeType !== item.mimeType ||
        job.expectedByteSize !== item.byteSize;
    })) {
      throw new Error("Historical Finalize Cleanup and Manifest identity do not match.");
    }
    const currentAssets = await transaction.select().from(assets)
      .where(inArray(assets.id, manifestAssetIds));
    const currentVariants = await transaction.select().from(assetVariants)
      .where(inArray(assetVariants.sourceAssetId, manifestAssetIds));
    assetById.clear();
    for (const asset of currentAssets) assetById.set(asset.id, asset);
    variantByAssetAndKey.clear();
    for (const variant of currentVariants) {
      variantByAssetAndKey.set(`${variant.sourceAssetId}:${variant.objectKey}`, variant);
    }
    for (const item of currentManifest) assertEntityIdentity(item);
    for (const item of currentManifest) {
      const observed = observations.get(item.id);
      if (!observed) throw new Error("Historical Finalize evidence set changed during revalidation.");
      const updated = await transaction.update(finalizeObjectManifestItems).set({
        byteSize: observed.byteSize,
        evidenceStatus: "verified",
        evidenceSource: "historical_storage_revalidation",
        evidenceVerifiedAt: now,
        observedByteSize: observed.byteSize,
        observedMimeType: observed.mimeType,
        observedAt: now,
        updatedAt: now,
      }).where(and(
        eq(finalizeObjectManifestItems.id, item.id),
        eq(finalizeObjectManifestItems.evidenceStatus, "unverified"),
      )).returning({ id: finalizeObjectManifestItems.id });
      if (!updated[0]) throw new Error("Historical Finalize evidence changed during revalidation.");
      if (item.objectRole === "original") {
        const updatedAsset = await transaction.update(assets).set({
          byteSize: observed.byteSize,
          updatedAt: now,
        }).where(and(
          eq(assets.id, item.assetId),
          eq(assets.uploadBatchId, recovery.uploadBatchId),
          eq(assets.objectKey, item.objectKey),
        )).returning({ id: assets.id });
        if (!updatedAsset[0]) throw new Error("Historical Finalize Asset identity changed during revalidation.");
      } else {
        const updatedVariant = await transaction.update(assetVariants).set({
          byteSize: observed.byteSize,
        }).where(and(
          eq(assetVariants.sourceAssetId, item.assetId),
          eq(assetVariants.objectKey, item.objectKey),
        )).returning({ id: assetVariants.id });
        if (!updatedVariant[0]) throw new Error("Historical Finalize Variant identity changed during revalidation.");
      }
      const updatedCleanup = await transaction.update(objectCleanupJobs).set({
        cleanupKind: "finalize_public",
        recoveryVersion: currentRecovery.version,
        finalizeManifestItemId: item.id,
        expectedObjectRole: item.objectRole,
        expectedMimeType: observed.mimeType,
        expectedByteSize: observed.byteSize,
        updatedAt: now,
      }).where(and(
        eq(objectCleanupJobs.finalizeManifestItemId, item.id),
        eq(objectCleanupJobs.finalizeRecoveryId, recovery.id),
        eq(objectCleanupJobs.finalizeAttempt, item.finalizeAttempt),
        eq(objectCleanupJobs.objectKey, item.objectKey),
      )).returning({ id: objectCleanupJobs.id });
      if (!updatedCleanup[0]) throw new Error("Historical Finalize Cleanup identity changed during revalidation.");
    }
    await auditWriter(transaction, {
      action: "asset.finalize.historical_storage_evidence_verified",
      entityType: "upload_recovery_job",
      entityId: recovery.id,
      afterSummary: {
        systemActor: UPLOAD_RECOVERY_SYSTEM_ACTOR,
        objectCount: currentManifest.length,
        evidenceSource: "historical_storage_revalidation",
      },
    });
    return currentManifest.length;
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
          cleanupKind: "finalize_public",
          status: "standby",
          finalizeRecoveryId: lease.id,
          recoveryVersion: lease.version,
          finalizeAttempt: lease.attemptCount,
          finalizeManifestItemId: item.id,
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
            cleanupKind: "finalize_public",
            status: "standby",
            finalizeRecoveryId: lease.id,
            recoveryVersion: lease.version,
            finalizeAttempt: lease.attemptCount,
            finalizeManifestItemId: item.id,
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
    )).returning({ id: uploadRecoveryJobs.id, version: uploadRecoveryJobs.version }))[0];
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
          cleanupKind: "finalize_public",
          recoveryVersion: updated.version,
          finalizeManifestItemId: item.id,
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
    const partition = job.kind === "staging"
      ? job.storagePartition === "imports" ? "imports" : "private"
      : "public";
    if (job.kind === "staging" && partition === "imports" && job.expiresAt > now) {
      await transaction.update(uploadRecoveryJobs).set({
        status: "retryable",
        stage: "failed",
        nextAttemptAt: job.expiresAt,
        lockedBy: null,
        lockedAt: null,
        leaseExpiresAt: null,
        lastError: "import_staging_retryable",
        version: sql`${uploadRecoveryJobs.version} + 1`,
        updatedAt: now,
      }).where(and(
        eq(uploadRecoveryJobs.id, job.id),
        eq(uploadRecoveryJobs.status, "processing"),
        eq(uploadRecoveryJobs.lockedBy, workerId),
      ));
      await transaction.update(assetUploadBatches).set({
        status: "failed",
        failureReason: "import_staging_retryable",
      }).where(and(
        eq(assetUploadBatches.id, job.uploadBatchId),
        inArray(assetUploadBatches.status, ["created", "uploading", "failed"]),
      ));
      await auditWriter(transaction, {
        action: "asset.import_staging.retryable",
        entityType: "upload_recovery_job",
        entityId: job.id,
        afterSummary: {
          systemActor: UPLOAD_RECOVERY_SYSTEM_ACTOR,
          uploadBatchId: job.uploadBatchId,
          expiresAt: job.expiresAt,
        },
      });
      return [];
    }
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
      await transaction.execute(sql`
        select id from assets
        where upload_batch_id = ${job.uploadBatchId}
        order by id for update
      `);
    }
    const allManifest = job.kind === "finalize"
      ? await transaction.select().from(finalizeObjectManifestItems).where(and(
          eq(finalizeObjectManifestItems.recoveryJobId, job.id),
          eq(finalizeObjectManifestItems.uploadBatchId, job.uploadBatchId),
        )).orderBy(desc(finalizeObjectManifestItems.finalizeAttempt))
      : [];
    const latestManifestAttempt = allManifest[0]?.finalizeAttempt;
    const manifest = latestManifestAttempt === undefined
      ? []
      : allManifest.filter((item) => item.finalizeAttempt === latestManifestAttempt);
    const publicCleanup = job.kind === "finalize"
      ? await transaction.select().from(objectCleanupJobs).where(and(
          eq(objectCleanupJobs.uploadBatchId, job.uploadBatchId),
          eq(objectCleanupJobs.storagePartition, "public"),
        ))
      : [];
    if (job.kind === "finalize") {
      const currentBatch = (await transaction.select().from(assetUploadBatches).where(
        eq(assetUploadBatches.id, job.uploadBatchId),
      ).limit(1))[0];
      const currentRecovery = (await transaction.select().from(uploadRecoveryJobs).where(and(
        eq(uploadRecoveryJobs.id, job.id),
        eq(uploadRecoveryJobs.uploadBatchId, job.uploadBatchId),
        eq(uploadRecoveryJobs.kind, "finalize"),
        eq(uploadRecoveryJobs.status, "processing"),
        eq(uploadRecoveryJobs.lockedBy, workerId),
        eq(uploadRecoveryJobs.version, job.version),
        gt(uploadRecoveryJobs.leaseExpiresAt, now),
      )).limit(1))[0];
      if (!currentRecovery || !currentBatch) throw new UploadRecoveryLeaseError();

      const publicAssets = await transaction.select({ id: assets.id }).from(assets).where(and(
        eq(assets.uploadBatchId, job.uploadBatchId),
        or(eq(assets.storagePartition, "public"), eq(assets.access, "public")),
      ));
      const manifestById = new Map(allManifest.map((item) => [item.id, item]));
      const projectionMismatch = publicCleanup.some((cleanup) => {
        const item = cleanup.finalizeManifestItemId
          ? manifestById.get(cleanup.finalizeManifestItemId)
          : undefined;
        return cleanup.finalizeRecoveryId !== job.id ||
          !item ||
          cleanup.finalizeAttempt !== item.finalizeAttempt ||
          cleanup.assetId !== item.assetId ||
          cleanup.objectKey !== item.objectKey ||
          cleanup.expectedObjectRole !== item.objectRole ||
          cleanup.expectedMimeType !== item.mimeType ||
          cleanup.expectedByteSize !== item.byteSize;
      });
      const failClosed = async (reasons: string[]): Promise<void> => {
        const activeCleanupIds = publicCleanup
          .filter((cleanup) => ["standby", "pending", "processing", "cancelled"].includes(cleanup.status))
          .map((cleanup) => cleanup.id);
        if (activeCleanupIds.length) {
          await transaction.update(objectCleanupJobs).set({
            status: "dead",
            armedAt: now,
            armedReason: "finalize_manifest_mismatch_manual_review",
            lockedBy: null,
            lockedAt: null,
            leaseExpiresAt: null,
            lastError: "finalize_manifest_state_conflict",
            updatedAt: now,
          }).where(inArray(objectCleanupJobs.id, activeCleanupIds));
        }
        const recoveryUpdated = await transaction.update(uploadRecoveryJobs).set({
          status: "dead",
          stage: "failed",
          nextAttemptAt: now,
          lockedBy: null,
          lockedAt: null,
          leaseExpiresAt: null,
          lastError: "finalize_manifest_state_conflict",
          version: sql`${uploadRecoveryJobs.version} + 1`,
          updatedAt: now,
        }).where(and(
          eq(uploadRecoveryJobs.id, job.id),
          eq(uploadRecoveryJobs.status, "processing"),
          eq(uploadRecoveryJobs.lockedBy, workerId),
          eq(uploadRecoveryJobs.version, job.version),
          gt(uploadRecoveryJobs.leaseExpiresAt, now),
        )).returning({ id: uploadRecoveryJobs.id });
        const batchUpdated = await transaction.update(assetUploadBatches).set({
          status: "failed",
          failureReason: "finalize_recovery_dead",
        }).where(and(
          eq(assetUploadBatches.id, job.uploadBatchId),
          inArray(assetUploadBatches.status, ["finalizing", "failed"]),
        )).returning({ id: assetUploadBatches.id });
        if (!recoveryUpdated[0] || !batchUpdated[0]) throw new UploadRecoveryLeaseError();
        await auditWriter(transaction, {
          action: "asset.finalize.crash_recovered",
          entityType: "asset_upload_batch",
          entityId: job.uploadBatchId,
          afterSummary: {
            systemActor: UPLOAD_RECOVERY_SYSTEM_ACTOR,
            cleanupObjects: publicCleanup.length,
            manifestObjects: allManifest.length,
            recoveryStatus: "dead",
            recoveryMode: "manifest_state_conflict",
            conflictReasons: reasons,
          },
        });
        noCleanupRecoveryDead = true;
      };

      if (latestManifestAttempt === undefined) {
        const legalPreManifestTakeover = currentBatch.status === "finalizing" &&
          PRE_MANIFEST_FINALIZE_STAGES.has(currentRecovery.stage);
        const existingRetryableHandoff = currentBatch.status === "failed" &&
          currentRecovery.stage === "failed";
        const conflictReasons = [
          ...(!legalPreManifestTakeover && !existingRetryableHandoff
            ? ["stage_requires_manifest"]
            : []),
          ...(publicCleanup.length ? ["cleanup_without_manifest"] : []),
          ...(publicAssets.length ? ["public_asset_without_manifest"] : []),
          ...(!legalPreManifestTakeover && !existingRetryableHandoff
            ? ["batch_not_recoverable_without_manifest"]
            : []),
        ];
        if (conflictReasons.length) {
          await failClosed(conflictReasons);
          return [];
        }
        const recoveryUpdated = await transaction.update(uploadRecoveryJobs).set({
          status: "retryable",
          stage: "failed",
          nextAttemptAt: now,
          lockedBy: null,
          lockedAt: null,
          leaseExpiresAt: null,
          lastError: "finalize_pre_manifest_recovery",
          version: sql`${uploadRecoveryJobs.version} + 1`,
          updatedAt: now,
        }).where(and(
          eq(uploadRecoveryJobs.id, job.id),
          eq(uploadRecoveryJobs.status, "processing"),
          eq(uploadRecoveryJobs.lockedBy, workerId),
          eq(uploadRecoveryJobs.version, job.version),
          gt(uploadRecoveryJobs.leaseExpiresAt, now),
        )).returning({ id: uploadRecoveryJobs.id });
        const batchUpdated = await transaction.update(assetUploadBatches).set({
          status: "failed",
          failureReason: "finalize_recovered_retryable",
        }).where(and(
          eq(assetUploadBatches.id, job.uploadBatchId),
          inArray(assetUploadBatches.status, ["finalizing", "failed"]),
        )).returning({ id: assetUploadBatches.id });
        if (!recoveryUpdated[0] || !batchUpdated[0]) throw new UploadRecoveryLeaseError();
        await auditWriter(transaction, {
          action: "asset.finalize.crash_recovered",
          entityType: "asset_upload_batch",
          entityId: job.uploadBatchId,
          afterSummary: {
            systemActor: UPLOAD_RECOVERY_SYSTEM_ACTOR,
            cleanupObjects: 0,
            manifestObjects: 0,
            recoveryStatus: "retryable",
            recoveryMode: "pre_manifest_retryable",
          },
        });
        return [];
      }

      const manifestConflictReasons = [
        ...(!MANIFEST_FINALIZE_STAGES.has(currentRecovery.stage)
          ? ["stage_precedes_existing_manifest"]
          : []),
        ...(latestManifestAttempt > currentRecovery.attemptCount
          ? ["manifest_attempt_ahead_of_recovery"]
          : []),
        ...(projectionMismatch ? ["cleanup_manifest_projection_mismatch"] : []),
        ...(publicAssets.length ? ["public_asset_before_finalize_commit"] : []),
      ];
      if (manifestConflictReasons.length) {
        await failClosed(manifestConflictReasons);
        return [];
      }
    }
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
          cleanupKind: "finalize_public",
          status: "standby",
          finalizeRecoveryId: job.id,
          recoveryVersion: job.version,
          finalizeAttempt: item.finalizeAttempt,
          finalizeManifestItemId: item.id,
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
          : job.kind === "finalize" && latestManifestAttempt !== undefined
            ? and(
                eq(objectCleanupJobs.finalizeRecoveryId, job.id),
                eq(objectCleanupJobs.finalizeAttempt, latestManifestAttempt),
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
    const activelyLeased = rows.filter((row) =>
      !unexpected.some((unexpectedRow) => unexpectedRow.id === row.id) &&
      row.status === "processing" &&
      row.leaseExpiresAt !== null &&
      row.leaseExpiresAt > now,
    );
    for (const row of activelyLeased) {
      const item = manifestByKey.get(row.objectKey);
      await transaction.update(objectCleanupJobs).set({
        recoveryVersion: job.version,
        ...(item ? {
          cleanupKind: "finalize_public" as const,
          finalizeManifestItemId: item.id,
          assetId: item.assetId,
          expectedObjectRole: item.objectRole,
          expectedMimeType: item.mimeType,
          expectedByteSize: item.byteSize,
          writeCompletedAt: item.writeCompletedAt,
        } : {}),
        updatedAt: now,
      }).where(and(
        eq(objectCleanupJobs.id, row.id),
        eq(objectCleanupJobs.status, "processing"),
      ));
    }
    for (const row of reclaimable) {
      const item = manifestByKey.get(row.objectKey);
      await transaction.update(objectCleanupJobs).set({
        status: "pending",
        ...(item ? {
          assetId: item.assetId,
          cleanupKind: "finalize_public" as const,
          recoveryVersion: job.version,
          finalizeManifestItemId: item.id,
          expectedObjectRole: item.objectRole,
          expectedMimeType: item.mimeType,
          expectedByteSize: item.byteSize,
          writeCompletedAt: item.writeCompletedAt,
          armedAt: now,
          armedReason: "finalize_lease_expired_recovery",
        } : job.kind === "staging" ? {
          recoveryVersion: job.version,
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
