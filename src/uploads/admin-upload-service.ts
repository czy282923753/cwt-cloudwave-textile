import { createHash, randomBytes, randomUUID } from "node:crypto";
import { and, count, eq, gt, inArray, isNull, lte, sql } from "drizzle-orm";
import type { PgQueryResultHKT } from "drizzle-orm/pg-core/session";
import { z } from "zod";

import { writeAuditLog } from "@/audit/service";
import { requirePermission, type UserRole } from "@/auth/permissions";
import { env } from "@/config/env";
import {
  assetUploadBatches,
  assets,
  assetVariants,
  authSessions,
  contentAssets,
  contents,
  fabricLibraryEntries,
  fabricLibraryEntryAssets,
  objectCleanupJobs,
  productAssets,
  products,
  uploadIntents,
  uploadRecoveryJobs,
} from "@/db/schema";
import type { AppDatabase } from "@/db/types";
import type { ObjectStorage } from "@/storage";

import { isRoleMimeCompatible } from "./asset-eligibility";
import {
  acceptedPublicMimeTypes,
  inferNonBlockingRiskHints,
  validateUploadedFile,
} from "./file-validation";
import { createImageDerivatives } from "./image-derivatives";
import {
  FINALIZE_COMPENSATION_GRACE_MILLISECONDS,
  processPendingObjectCleanupJobs,
  registerObjectCleanup,
} from "./object-cleanup-service";
import { createUploadRateLimiter, type UploadRateLimiter } from "./rate-limit";
import type { FileScanner } from "./scanner";
import {
  advanceUploadRecoveryStage,
  markFinalizeRecoveryRequired,
  type UploadRecoveryLease,
  UPLOAD_RECOVERY_LEASE_MILLISECONDS,
} from "./upload-recovery-service";

const categorySchema = z.enum([
  "product", "fabric", "market", "company", "factory", "application",
  "certificate", "content", "other",
]);
const roleSchema = z.enum([
  "hero", "gallery", "cover", "detail", "thumbnail", "inline", "document", "download",
]);
const associationTypeSchema = z.enum(["product", "fabric", "content"]);
const sourceSubjectSchema = z.enum([
  "cwt", "partner_factory", "supplier", "customer", "third_party", "unknown",
]);
const permissionSchema = z.enum(["unknown", "allowed", "not_allowed", "restricted"]);
const adminRateLimiter = createUploadRateLimiter();

export interface AdminUploadActor {
  userId: string;
  role: UserRole;
  authSessionId: string;
}

export interface AdminSourceDeclarationInput {
  sourceType?: string | null | undefined;
  sourceProvider?: string | null | undefined;
  rightsStatus?: string | null | undefined;
  subjectRelationship?: z.infer<typeof sourceSubjectSchema> | null | undefined;
  publicUsePermission?: z.infer<typeof permissionSchema> | null | undefined;
  editingPermission?: z.infer<typeof permissionSchema> | null | undefined;
  usageRestrictions?: string | null | undefined;
  permissionEvidence?: string | null | undefined;
  declarationExpiryDate?: string | null | undefined;
  isCwtOwnedFacility?: boolean | null | undefined;
}

export interface AdminUploadFileDeclaration {
  fileName: string;
  declaredMimeType: string;
  declaredByteSize: number;
}

export interface AdminUploadBatchInput {
  files: readonly AdminUploadFileDeclaration[];
  category: z.infer<typeof categorySchema>;
  role: z.infer<typeof roleSchema>;
  sortOrder: number;
  associationType?: z.infer<typeof associationTypeSchema> | null;
  associationEntityId?: string | null;
  sourceDeclarationEnabled: boolean;
  sourceDeclaration?: AdminSourceDeclarationInput | null;
}

interface AdminUploadOptions {
  auditWriter?: typeof writeAuditLog;
  rateLimiter?: UploadRateLimiter;
  now?: Date;
  workerId?: string;
  leaseMilliseconds?: number;
  faultInjector?: (point: AdminUploadFaultPoint) => void | Promise<void>;
}

export type AdminUploadFaultPoint =
  | "before_recovery_job_insert"
  | "before_preregister_commit"
  | "after_staging_put"
  | "after_scan_success"
  | "before_asset_complete_update"
  | "before_intent_complete_update"
  | "before_batch_complete_update"
  | "before_finalize_claim_commit"
  | "after_finalize_claim";

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function cleanOptional(value: string | null | undefined): string | null {
  return value?.trim() || null;
}

function safeExtension(mimeType: string): string {
  const extension = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/avif": "avif",
    "application/pdf": "pdf",
  }[mimeType];
  if (!extension) throw new Error("Upload MIME type has no safe extension.");
  return extension;
}

async function assertActiveSession<TQueryResult extends PgQueryResultHKT>(
  db: AppDatabase<TQueryResult>,
  actor: AdminUploadActor,
  now: Date,
): Promise<void> {
  requirePermission(actor.role, "assets.write");
  const rows = await db.select({ id: authSessions.id }).from(authSessions).where(and(
    eq(authSessions.id, actor.authSessionId),
    eq(authSessions.userId, actor.userId),
    gt(authSessions.expiresAt, now),
    isNull(authSessions.revokedAt),
  )).limit(1);
  if (!rows[0]) throw new Error("Admin upload session is invalid or expired.");
}

async function assertAssociationTarget<TQueryResult extends PgQueryResultHKT>(
  db: AppDatabase<TQueryResult>,
  actor: Pick<AdminUploadActor, "role">,
  associationType: z.infer<typeof associationTypeSchema> | null,
  associationEntityId: string | null,
): Promise<void> {
  if (!associationType && !associationEntityId) return;
  if (!associationType || !associationEntityId) throw new Error("Asset association is incomplete.");
  z.uuid().parse(associationEntityId);
  if (associationType === "content") {
    requirePermission(actor.role, "content.write");
    const row = (await db.select({ status: contents.status }).from(contents)
      .where(eq(contents.id, associationEntityId)).limit(1))[0];
    if (!row || row.status === "archived") throw new Error("Asset association target is unavailable.");
    if (row.status === "published") throw new Error("Published Content Assets require an Editorial Revision.");
    return;
  }
  requirePermission(actor.role, "products.write");
  if (associationType === "product") {
    const row = (await db.select({ status: products.status }).from(products)
      .where(eq(products.id, associationEntityId)).limit(1))[0];
    if (!row || row.status === "archived") throw new Error("Asset association target is unavailable.");
    if (row.status === "published") throw new Error("Published Product Assets require an Editorial Revision.");
    return;
  }
  const row = (await db.select({ status: fabricLibraryEntries.status }).from(fabricLibraryEntries)
    .where(eq(fabricLibraryEntries.id, associationEntityId)).limit(1))[0];
  if (!row || row.status === "archived") throw new Error("Asset association target is unavailable.");
  if (row.status === "published") throw new Error("Published Fabric Library Assets require an Editorial Revision.");
}

function normalizeBatchInput(input: AdminUploadBatchInput): AdminUploadBatchInput {
  const files = input.files.map((file) => ({
    fileName: file.fileName.trim(),
    declaredMimeType: file.declaredMimeType,
    declaredByteSize: file.declaredByteSize,
  }));
  if (files.length < 1 || files.length > env.MAX_FILES_PER_UPLOAD) {
    throw new Error("Upload file count is outside the configured limit.");
  }
  for (const file of files) {
    if (!file.fileName || file.fileName.length > 200 || /[\\/\u0000-\u001f]/.test(file.fileName)) {
      throw new Error("Upload file name is invalid.");
    }
    if (!(acceptedPublicMimeTypes as readonly string[]).includes(file.declaredMimeType)) {
      throw new Error("Upload MIME type is not permitted.");
    }
    if (!isRoleMimeCompatible(input.role, file.declaredMimeType)) {
      throw new Error("Asset role does not allow the declared MIME type.");
    }
    if (!Number.isInteger(file.declaredByteSize) || file.declaredByteSize < 1 || file.declaredByteSize > env.MAX_PUBLIC_FILE_BYTES) {
      throw new Error("Upload size is invalid.");
    }
  }
  if (!Number.isInteger(input.sortOrder) || input.sortOrder < 0) throw new Error("Asset sort order is invalid.");
  if (!input.sourceDeclarationEnabled && input.sourceDeclaration) {
    throw new Error("Disabled Source Declaration must not carry source or rights values.");
  }
  return {
    ...input,
    files,
    category: categorySchema.parse(input.category),
    role: roleSchema.parse(input.role),
    associationType: input.associationType ? associationTypeSchema.parse(input.associationType) : null,
    associationEntityId: input.associationEntityId || null,
  };
}

export async function createAdminUploadBatch<TQueryResult extends PgQueryResultHKT>(
  db: AppDatabase<TQueryResult>,
  actor: AdminUploadActor,
  input: AdminUploadBatchInput,
  options: AdminUploadOptions = {},
): Promise<{ batchId: string; expiresAt: Date; intents: { token: string; uploadUrl: string }[] }> {
  const now = options.now ?? new Date();
  await assertActiveSession(db, actor, now);
  const normalized = normalizeBatchInput(input);
  await assertAssociationTarget(db, actor, normalized.associationType ?? null, normalized.associationEntityId ?? null);
  const limiter = options.rateLimiter ?? adminRateLimiter;
  if (!(await limiter.consume(`admin:${actor.userId}:${actor.authSessionId}`, "upload"))) {
    throw new Error("Upload rate limit exceeded.");
  }
  const expiresAt = new Date(now.getTime() + env.UPLOAD_INTENT_TTL_SECONDS * 1_000);
  const issued = normalized.files.map((file) => ({ file, token: randomBytes(32).toString("base64url") }));
  const auditWriter = options.auditWriter ?? writeAuditLog;
  return db.transaction(async (transaction) => {
    await assertActiveSession(transaction, actor, now);
    await assertAssociationTarget(transaction, actor, normalized.associationType ?? null, normalized.associationEntityId ?? null);
    const batchRows = await transaction.insert(assetUploadBatches).values({
      createdByUserId: actor.userId,
      authSessionId: actor.authSessionId,
      sourceDeclarationEnabled: normalized.sourceDeclarationEnabled,
      declarationInput: normalized.sourceDeclarationEnabled ? normalized.sourceDeclaration ?? {} : null,
      declaredFileCount: issued.length,
      completedFileCount: 0,
      status: "created",
      expiresAt,
    }).returning({ id: assetUploadBatches.id });
    const batchId = batchRows[0]?.id;
    if (!batchId) throw new Error("Upload Batch insert failed.");
    await transaction.insert(uploadIntents).values(issued.map(({ file, token }) => ({
      tokenHash: hashToken(token),
      kind: "admin_asset" as const,
      anonymousSessionId: actor.authSessionId,
      createdByUserId: actor.userId,
      authSessionId: actor.authSessionId,
      uploadBatchId: batchId,
      adminAssetCategory: normalized.category,
      adminAssetRole: normalized.role,
      associationType: normalized.associationType ?? null,
      associationEntityId: normalized.associationEntityId ?? null,
      sortOrder: normalized.sortOrder,
      declaredFileName: file.fileName,
      declaredMimeType: file.declaredMimeType,
      declaredByteSize: file.declaredByteSize,
      expiresAt,
    })));
    await auditWriter(transaction, {
      actorUserId: actor.userId,
      action: "asset.upload_batch.created",
      entityType: "asset_upload_batch",
      entityId: batchId,
      afterSummary: { fileCount: issued.length, sourceDeclarationEnabled: normalized.sourceDeclarationEnabled },
    });
    return {
      batchId,
      expiresAt,
      intents: issued.map(({ token }) => ({ token, uploadUrl: `/api/admin/upload-intents/${encodeURIComponent(token)}/` })),
    };
  });
}

export async function inspectAdminUploadIntent<TQueryResult extends PgQueryResultHKT>(
  db: AppDatabase<TQueryResult>,
  actor: AdminUploadActor,
  token: string,
  now = new Date(),
): Promise<{ declaredByteSize: number; declaredMimeType: string }> {
  await assertActiveSession(db, actor, now);
  const row = (await db.select({
    declaredByteSize: uploadIntents.declaredByteSize,
    declaredMimeType: uploadIntents.declaredMimeType,
  }).from(uploadIntents).where(and(
    eq(uploadIntents.tokenHash, hashToken(token)),
    eq(uploadIntents.kind, "admin_asset"),
    eq(uploadIntents.createdByUserId, actor.userId),
    eq(uploadIntents.authSessionId, actor.authSessionId),
    eq(uploadIntents.status, "created"),
    gt(uploadIntents.expiresAt, now),
  )).limit(1))[0];
  if (!row) throw new Error("Admin Upload Intent is invalid, expired, or already used.");
  return row;
}

export async function completeAdminUploadIntent<TQueryResult extends PgQueryResultHKT>(
  db: AppDatabase<TQueryResult>,
  storage: ObjectStorage,
  scanner: FileScanner,
  actor: AdminUploadActor,
  input: { token: string; bytes: Uint8Array },
  options: AdminUploadOptions = {},
): Promise<string> {
  const now = options.now ?? new Date();
  await assertActiveSession(db, actor, now);
  const auditWriter = options.auditWriter ?? writeAuditLog;
  const workerId = options.workerId ?? `staging-${randomUUID()}`;
  const leaseMilliseconds = options.leaseMilliseconds ?? 5 * UPLOAD_RECOVERY_LEASE_MILLISECONDS;
  const leaseExpiresAt = new Date(now.getTime() + leaseMilliseconds);
  const expectedAssetId = randomUUID();
  const datePrefix = now.toISOString().slice(0, 10).replaceAll("-", "/");

  const preregistered = await db.transaction(async (transaction) => {
    await assertActiveSession(transaction, actor, now);
    const intent = (await transaction.select().from(uploadIntents).where(and(
      eq(uploadIntents.tokenHash, hashToken(input.token)),
      eq(uploadIntents.kind, "admin_asset"),
      eq(uploadIntents.createdByUserId, actor.userId),
      eq(uploadIntents.authSessionId, actor.authSessionId),
      eq(uploadIntents.status, "created"),
      gt(uploadIntents.expiresAt, now),
    )).limit(1))[0];
    if (!intent?.uploadBatchId || !intent.adminAssetCategory || !intent.adminAssetRole) {
      throw new Error("Admin Upload Intent is invalid, expired, or already used.");
    }
    if (input.bytes.byteLength !== intent.declaredByteSize) {
      await transaction.update(uploadIntents).set({
        status: "failed",
        failureReason: "declared_size_mismatch",
        updatedAt: now,
      }).where(eq(uploadIntents.id, intent.id));
      await transaction.update(assetUploadBatches).set({
        status: "failed",
        failureReason: "declared_size_mismatch",
      }).where(eq(assetUploadBatches.id, intent.uploadBatchId));
      await auditWriter(transaction, {
        actorUserId: actor.userId,
        action: "asset.upload_batch.failed",
        entityType: "asset_upload_batch",
        entityId: intent.uploadBatchId,
        afterSummary: { reason: "declared_size_mismatch" },
      });
      return { mismatch: true } as const;
    }
    const objectKey = `staging/admin/${datePrefix}/${randomUUID()}.${safeExtension(intent.declaredMimeType)}`;
    const sha256 = createHash("sha256").update(input.bytes).digest("hex");
    await transaction.insert(assets).values({
      id: expectedAssetId,
      uploadBatchId: intent.uploadBatchId,
      uploadedByUserId: actor.userId,
      originalFileName: intent.declaredFileName,
      storageProvider: env.STORAGE_DRIVER,
      storagePartition: "private",
      objectKey,
      access: "internal",
      category: intent.adminAssetCategory,
      status: "scanning",
      declaredMimeType: intent.declaredMimeType,
      byteSize: input.bytes.byteLength,
      sha256,
      sourceDeclarationEnabled: false,
      nonBlockingRiskHints: inferNonBlockingRiskHints(intent.declaredFileName),
      retentionExpiresAt: intent.expiresAt,
    });
    await options.faultInjector?.("before_recovery_job_insert");
    const recovery = (await transaction.insert(uploadRecoveryJobs).values({
      kind: "staging",
      uploadBatchId: intent.uploadBatchId,
      uploadIntentId: intent.id,
      assetId: expectedAssetId,
      storagePartition: "private",
      objectKey,
      status: "processing",
      stage: "preregistered",
      attemptCount: 1,
      nextAttemptAt: leaseExpiresAt,
      lockedBy: workerId,
      lockedAt: now,
      leaseExpiresAt,
      version: 1,
      startedAt: now,
      expiresAt: intent.expiresAt,
    }).returning({ id: uploadRecoveryJobs.id, version: uploadRecoveryJobs.version }))[0];
    if (!recovery) throw new Error("Upload Recovery Job insert failed.");
    await transaction.insert(objectCleanupJobs).values({
      uploadBatchId: intent.uploadBatchId,
      assetId: expectedAssetId,
      storagePartition: "private",
      objectKey,
      reason: "admin_staging_saga_compensation",
      status: "pending",
      nextAttemptAt: leaseExpiresAt,
    });
    await transaction.update(uploadIntents).set({
      assetId: expectedAssetId,
      status: "uploading",
      failureReason: null,
      updatedAt: now,
    }).where(eq(uploadIntents.id, intent.id));
    await transaction.update(assetUploadBatches).set({
      status: "uploading",
      failureReason: null,
    }).where(and(
      eq(assetUploadBatches.id, intent.uploadBatchId),
      inArray(assetUploadBatches.status, ["created", "uploading"]),
    ));
    await auditWriter(transaction, {
      actorUserId: actor.userId,
      action: "asset.upload.receiving",
      entityType: "asset",
      entityId: expectedAssetId,
      afterSummary: {
        uploadBatchId: intent.uploadBatchId,
        uploadIntentId: intent.id,
        recoveryJobId: recovery.id,
      },
    });
    await options.faultInjector?.("before_preregister_commit");
    return {
      mismatch: false,
      intent,
      assetId: expectedAssetId,
      objectKey,
      recoveryLease: {
        id: recovery.id,
        workerId,
        version: recovery.version,
        leaseExpiresAt,
      } satisfies UploadRecoveryLease,
    } as const;
  });
  if (preregistered.mismatch) {
    throw new Error("Uploaded size does not match the Admin Upload Intent.");
  }

  let recoveryLease = preregistered.recoveryLease;
  try {
    recoveryLease = await advanceUploadRecoveryStage(
      db,
      recoveryLease,
      "storage_writing",
      new Date(),
      leaseMilliseconds,
    );
    await storage.put(
      "private",
      preregistered.objectKey,
      input.bytes,
      preregistered.intent.declaredMimeType,
    );
    await options.faultInjector?.("after_staging_put");
    recoveryLease = await advanceUploadRecoveryStage(db, recoveryLease, "storage_written", new Date(), leaseMilliseconds);
    const validated = await validateUploadedFile({
      bytes: input.bytes,
      declaredMimeType: preregistered.intent.declaredMimeType,
      maximumBytes: env.MAX_PUBLIC_FILE_BYTES,
      purpose: "admin_asset_staging",
    });
    recoveryLease = await advanceUploadRecoveryStage(db, recoveryLease, "scanning", new Date(), leaseMilliseconds);
    const scanResult = await scanner.scan(input.bytes, preregistered.intent.declaredFileName);
    if (!scanResult.clean) throw new Error("File was rejected by malware scanning.");
    recoveryLease = await advanceUploadRecoveryStage(db, recoveryLease, "scan_passed", new Date(), leaseMilliseconds);
    await options.faultInjector?.("after_scan_success");
    await db.transaction(async (transaction) => {
      const completedAt = new Date();
      await options.faultInjector?.("before_asset_complete_update");
      const assetUpdated = await transaction.update(assets).set({
        status: "ready",
        scanStatus: "passed",
        detectedMimeType: validated.detectedMimeType,
        width: validated.width,
        height: validated.height,
        scanProvider: scanResult.provider,
        scanResult: scanResult.reference,
        scanCompletedAt: completedAt,
        updatedAt: completedAt,
      }).where(and(
        eq(assets.id, preregistered.assetId),
        eq(assets.storagePartition, "private"),
        eq(assets.access, "internal"),
        eq(assets.status, "scanning"),
      )).returning({ id: assets.id });
      if (!assetUpdated[0]) throw new Error("Staging Asset changed before completion.");
      await options.faultInjector?.("before_intent_complete_update");
      const intentUpdated = await transaction.update(uploadIntents).set({
        status: "passed",
        failureReason: null,
        updatedAt: completedAt,
      }).where(and(
        eq(uploadIntents.id, preregistered.intent.id),
        eq(uploadIntents.status, "uploading"),
        eq(uploadIntents.assetId, preregistered.assetId),
      )).returning({ id: uploadIntents.id });
      if (!intentUpdated[0]) throw new Error("Upload Intent changed before staging completion.");
      const totals = (await transaction.select({ value: count() }).from(uploadIntents).where(and(
        eq(uploadIntents.uploadBatchId, preregistered.intent.uploadBatchId!),
        eq(uploadIntents.status, "passed"),
      )))[0];
      const passed = Number(totals?.value ?? 0);
      const declared = (await transaction.select({ value: assetUploadBatches.declaredFileCount })
        .from(assetUploadBatches)
        .where(eq(assetUploadBatches.id, preregistered.intent.uploadBatchId!))
        .limit(1))[0]?.value;
      if (declared === undefined) throw new Error("Upload Batch disappeared during staging completion.");
      await options.faultInjector?.("before_batch_complete_update");
      const batchUpdated = await transaction.update(assetUploadBatches).set({
        completedFileCount: passed,
        status: passed >= declared ? "ready_to_finalize" : "uploading",
        failureReason: null,
      }).where(and(
        eq(assetUploadBatches.id, preregistered.intent.uploadBatchId!),
        eq(assetUploadBatches.status, "uploading"),
      )).returning({ id: assetUploadBatches.id });
      if (!batchUpdated[0]) throw new Error("Upload Batch changed before staging completion.");
      const recoveryUpdated = await transaction.update(uploadRecoveryJobs).set({
        status: "completed",
        stage: "completed",
        completedAt,
        lockedBy: null,
        lockedAt: null,
        leaseExpiresAt: null,
        lastError: null,
        version: sql`${uploadRecoveryJobs.version} + 1`,
        updatedAt: completedAt,
      }).where(and(
        eq(uploadRecoveryJobs.id, recoveryLease.id),
        eq(uploadRecoveryJobs.status, "processing"),
        eq(uploadRecoveryJobs.lockedBy, recoveryLease.workerId),
        eq(uploadRecoveryJobs.version, recoveryLease.version),
        gt(uploadRecoveryJobs.leaseExpiresAt, completedAt),
      )).returning({ id: uploadRecoveryJobs.id });
      if (!recoveryUpdated[0]) throw new Error("Upload Recovery lease was lost before staging completion.");
      await transaction.update(objectCleanupJobs).set({
        nextAttemptAt: preregistered.intent.expiresAt,
        updatedAt: completedAt,
      }).where(and(
        eq(objectCleanupJobs.assetId, preregistered.assetId),
        eq(objectCleanupJobs.storagePartition, "private"),
        eq(objectCleanupJobs.status, "pending"),
      ));
      await auditWriter(transaction, {
        actorUserId: actor.userId,
        action: "asset.upload.staged",
        entityType: "asset",
        entityId: preregistered.assetId,
        afterSummary: {
          uploadBatchId: preregistered.intent.uploadBatchId,
          recoveryJobId: recoveryLease.id,
        },
      });
    });
    return preregistered.assetId;
  } catch (error) {
    // Phase A already committed the durable Asset, object key, cleanup record,
    // Recovery Job and watchdog lease. Do not depend on a failing Audit writer
    // to make compensation discoverable here; the Recovery Worker owns it.
    throw error;
  }
}

type AssetRelationInput = {
  assetId: string;
  associationType: z.infer<typeof associationTypeSchema>;
  associationEntityId: string;
  role: z.infer<typeof roleSchema>;
  sortOrder: number;
};

async function insertRelation<TQueryResult extends PgQueryResultHKT>(
  db: AppDatabase<TQueryResult>,
  input: AssetRelationInput,
): Promise<void> {
  if (input.associationType === "product") {
    await db.insert(productAssets).values({ productId: input.associationEntityId, assetId: input.assetId, role: input.role, sortOrder: input.sortOrder });
  } else if (input.associationType === "fabric") {
    await db.insert(fabricLibraryEntryAssets).values({ fabricEntryId: input.associationEntityId, assetId: input.assetId, role: input.role, sortOrder: input.sortOrder });
  } else {
    await db.insert(contentAssets).values({ contentId: input.associationEntityId, assetId: input.assetId, role: input.role, sortOrder: input.sortOrder });
  }
}

export async function linkAssetRelation<TQueryResult extends PgQueryResultHKT>(
  db: AppDatabase<TQueryResult>, actor: AdminUploadActor, input: AssetRelationInput,
  options: AdminUploadOptions = {},
): Promise<void> {
  const now = options.now ?? new Date();
  await assertActiveSession(db, actor, now);
  const auditWriter = options.auditWriter ?? writeAuditLog;
  await db.transaction(async (transaction) => {
    await assertActiveSession(transaction, actor, now);
    await assertAssociationTarget(transaction, actor, input.associationType, input.associationEntityId);
    const asset = (await transaction.select({ mime: assets.detectedMimeType }).from(assets).where(eq(assets.id, input.assetId)).limit(1))[0];
    if (!asset || !isRoleMimeCompatible(input.role, asset.mime)) throw new Error("Asset is unavailable or incompatible with its role.");
    await insertRelation(transaction, input);
    await auditWriter(transaction, { actorUserId: actor.userId, action: "asset.relation.created", entityType: "asset", entityId: input.assetId, afterSummary: { associationType: input.associationType, associationEntityId: input.associationEntityId } });
  });
}

export async function unlinkAssetRelation<TQueryResult extends PgQueryResultHKT>(
  db: AppDatabase<TQueryResult>, actor: AdminUploadActor, input: Omit<AssetRelationInput, "role" | "sortOrder">,
  options: AdminUploadOptions = {},
): Promise<void> {
  const now = options.now ?? new Date();
  await assertActiveSession(db, actor, now);
  const auditWriter = options.auditWriter ?? writeAuditLog;
  await db.transaction(async (transaction) => {
    await assertActiveSession(transaction, actor, now);
    await assertAssociationTarget(transaction, actor, input.associationType, input.associationEntityId);
    let removed: { assetId: string }[];
    if (input.associationType === "product") removed = await transaction.delete(productAssets).where(and(eq(productAssets.productId, input.associationEntityId), eq(productAssets.assetId, input.assetId))).returning({ assetId: productAssets.assetId });
    else if (input.associationType === "fabric") removed = await transaction.delete(fabricLibraryEntryAssets).where(and(eq(fabricLibraryEntryAssets.fabricEntryId, input.associationEntityId), eq(fabricLibraryEntryAssets.assetId, input.assetId))).returning({ assetId: fabricLibraryEntryAssets.assetId });
    else removed = await transaction.delete(contentAssets).where(and(eq(contentAssets.contentId, input.associationEntityId), eq(contentAssets.assetId, input.assetId))).returning({ assetId: contentAssets.assetId });
    if (!removed[0]) throw new Error("Asset relation was not found.");
    await auditWriter(transaction, { actorUserId: actor.userId, action: "asset.relation.deleted", entityType: "asset", entityId: input.assetId, afterSummary: { associationType: input.associationType, associationEntityId: input.associationEntityId } });
  });
}

export async function finalizeAdminUploadBatch<TQueryResult extends PgQueryResultHKT>(
  db: AppDatabase<TQueryResult>,
  storage: ObjectStorage,
  actor: AdminUploadActor,
  batchId: string,
  options: AdminUploadOptions = {},
): Promise<{ assetIds: string[] }> {
  const now = options.now ?? new Date();
  await assertActiveSession(db, actor, now);
  const auditWriter = options.auditWriter ?? writeAuditLog;
  const parsedBatchId = z.uuid().parse(batchId);
  const workerId = options.workerId ?? `finalize-${randomUUID()}`;
  const leaseMilliseconds = options.leaseMilliseconds ?? UPLOAD_RECOVERY_LEASE_MILLISECONDS;
  const leaseExpiresAt = new Date(now.getTime() + leaseMilliseconds);
  const claim = await db.transaction(async (transaction) => {
    await assertActiveSession(transaction, actor, now);
    const batch = (await transaction.select().from(assetUploadBatches).where(and(
      eq(assetUploadBatches.id, parsedBatchId),
      eq(assetUploadBatches.createdByUserId, actor.userId),
      eq(assetUploadBatches.authSessionId, actor.authSessionId),
      inArray(assetUploadBatches.status, ["ready_to_finalize", "failed"]),
      gt(assetUploadBatches.expiresAt, now),
    )).limit(1))[0];
    if (!batch) {
      throw new Error("Admin Upload Batch is unavailable, incomplete, expired, or already finalized.");
    }
    const existing = (await transaction.select().from(uploadRecoveryJobs).where(and(
      eq(uploadRecoveryJobs.uploadBatchId, batch.id),
      eq(uploadRecoveryJobs.kind, "finalize"),
    )).limit(1))[0];
    if (batch.status === "failed" && (
      !existing ||
      existing.status !== "retryable" ||
      existing.nextAttemptAt > now
    )) {
      throw new Error("Admin Upload Batch recovery is not ready for another Finalize attempt.");
    }
    let recovery: { id: string; version: number } | undefined;
    if (existing) {
      recovery = (await transaction.update(uploadRecoveryJobs).set({
        status: "processing",
        stage: "claimed",
        attemptCount: sql`${uploadRecoveryJobs.attemptCount} + 1`,
        nextAttemptAt: leaseExpiresAt,
        lockedBy: workerId,
        lockedAt: now,
        leaseExpiresAt,
        version: sql`${uploadRecoveryJobs.version} + 1`,
        lastError: null,
        startedAt: now,
        completedAt: null,
        updatedAt: now,
      }).where(and(
        eq(uploadRecoveryJobs.id, existing.id),
        eq(uploadRecoveryJobs.status, "retryable"),
        lte(uploadRecoveryJobs.nextAttemptAt, now),
      )).returning({ id: uploadRecoveryJobs.id, version: uploadRecoveryJobs.version }))[0];
    } else {
      recovery = (await transaction.insert(uploadRecoveryJobs).values({
        kind: "finalize",
        uploadBatchId: batch.id,
        status: "processing",
        stage: "claimed",
        attemptCount: 1,
        nextAttemptAt: leaseExpiresAt,
        lockedBy: workerId,
        lockedAt: now,
        leaseExpiresAt,
        version: 1,
        startedAt: now,
        expiresAt: batch.expiresAt ?? leaseExpiresAt,
      }).returning({ id: uploadRecoveryJobs.id, version: uploadRecoveryJobs.version }))[0];
    }
    if (!recovery) throw new Error("Finalize Recovery lease could not be claimed.");
    const claimed = (await transaction.update(assetUploadBatches).set({
      status: "finalizing",
      failureReason: null,
    }).where(and(
      eq(assetUploadBatches.id, batch.id),
      eq(assetUploadBatches.status, batch.status),
    )).returning())[0];
    if (!claimed) throw new Error("Admin Upload Batch changed during Finalize claim.");
    await auditWriter(transaction, {
      actorUserId: actor.userId,
      action: "asset.upload_batch.finalize_claimed",
      entityType: "asset_upload_batch",
      entityId: claimed.id,
      afterSummary: {
        recoveryJobId: recovery.id,
        workerId,
        attempt: existing ? existing.attemptCount + 1 : 1,
        version: recovery.version,
      },
    });
    await options.faultInjector?.("before_finalize_claim_commit");
    return {
      batch: claimed,
      recoveryLease: {
        id: recovery.id,
        workerId,
        version: recovery.version,
        leaseExpiresAt,
      } satisfies UploadRecoveryLease,
    };
  });
  const batch = claim.batch;
  let recoveryLease = claim.recoveryLease;
  await options.faultInjector?.("after_finalize_claim");
  let staged: (typeof assets.$inferSelect)[] = [];
  try {
    const intents = await db.select().from(uploadIntents).where(and(
      eq(uploadIntents.uploadBatchId, batch.id),
      eq(uploadIntents.kind, "admin_asset"),
      eq(uploadIntents.status, "passed"),
    ));
    if (intents.length !== batch.declaredFileCount || intents.some((intent) => !intent.assetId || !intent.adminAssetRole)) {
      throw new Error("Admin Upload Batch is incomplete.");
    }
    staged = await db.select().from(assets).where(eq(assets.uploadBatchId, batch.id));
    if (staged.length !== intents.length || staged.some((asset) => asset.storagePartition !== "private" || asset.access !== "internal" || asset.status !== "ready" || asset.scanStatus !== "passed")) {
      throw new Error("Admin Upload Batch does not contain eligible staged Assets.");
    }
    const source = batch.sourceDeclarationEnabled
      ? (batch.declarationInput as AdminSourceDeclarationInput | null) ?? {}
      : null;
    if (source?.subjectRelationship) sourceSubjectSchema.parse(source.subjectRelationship);
    if (source?.publicUsePermission) permissionSchema.parse(source.publicUsePermission);
    if (source?.editingPermission) permissionSchema.parse(source.editingPermission);
    const compensationNotBefore = new Date(
      now.getTime() + FINALIZE_COMPENSATION_GRACE_MILLISECONDS,
    );
    const copies: {
      objectKey: string;
      variants: {
        key: string;
        format: string;
        bytes: Uint8Array;
        width: number;
        height: number;
      }[];
    }[] = [];
    for (const asset of staged) {
      recoveryLease = await advanceUploadRecoveryStage(
        db,
        recoveryLease,
        "source_copy_started",
        new Date(),
        leaseMilliseconds,
      );
      const bytes = await storage.get("private", asset.objectKey);
      await registerObjectCleanup(db, {
        uploadBatchId: batch.id,
        assetId: asset.id,
        storagePartition: "public",
        objectKey: asset.objectKey,
        reason: "finalize_public_original_compensation",
        notBefore: compensationNotBefore,
      });
      await storage.put("public", asset.objectKey, bytes, asset.detectedMimeType ?? asset.declaredMimeType);
      recoveryLease = await advanceUploadRecoveryStage(
        db,
        recoveryLease,
        "original_written",
        new Date(),
        leaseMilliseconds,
      );
      recoveryLease = await advanceUploadRecoveryStage(
        db,
        recoveryLease,
        "variants_processing",
        new Date(),
        leaseMilliseconds,
      );
      const variants = asset.detectedMimeType?.startsWith("image/")
        ? (await createImageDerivatives(bytes)).map((variant) => ({
            key: `${asset.objectKey}.variants/${variant.key}.${variant.format}`,
            format: variant.format,
            bytes: variant.bytes,
            width: variant.width,
            height: variant.height,
          }))
        : [];
      for (const variant of variants) {
        await registerObjectCleanup(db, {
          uploadBatchId: batch.id,
          assetId: asset.id,
          storagePartition: "public",
          objectKey: variant.key,
          reason: "finalize_public_variant_compensation",
          notBefore: compensationNotBefore,
        });
        await storage.put("public", variant.key, variant.bytes, `image/${variant.format}`);
      }
      recoveryLease = await advanceUploadRecoveryStage(
        db,
        recoveryLease,
        "variants_written",
        new Date(),
        leaseMilliseconds,
      );
      copies.push({ objectKey: asset.objectKey, variants });
    }
    recoveryLease = await advanceUploadRecoveryStage(
      db,
      recoveryLease,
      "database_finalizing",
      new Date(),
      leaseMilliseconds,
    );
    await db.transaction(async (transaction) => {
      const commitTime = new Date();
      await assertActiveSession(transaction, actor, commitTime);
      const current = (await transaction.select().from(assetUploadBatches).where(and(
        eq(assetUploadBatches.id, batch.id), eq(assetUploadBatches.status, "finalizing"),
        eq(assetUploadBatches.createdByUserId, actor.userId), eq(assetUploadBatches.authSessionId, actor.authSessionId),
      )).limit(1))[0];
      if (!current) throw new Error("Admin Upload Batch changed before finalization.");
      const validLease = (await transaction.select({ id: uploadRecoveryJobs.id })
        .from(uploadRecoveryJobs)
        .where(and(
          eq(uploadRecoveryJobs.id, recoveryLease.id),
          eq(uploadRecoveryJobs.kind, "finalize"),
          eq(uploadRecoveryJobs.status, "processing"),
          eq(uploadRecoveryJobs.lockedBy, recoveryLease.workerId),
          eq(uploadRecoveryJobs.version, recoveryLease.version),
          gt(uploadRecoveryJobs.leaseExpiresAt, commitTime),
        )).limit(1))[0];
      if (!validLease) throw new Error("Finalize lease or version changed before commit.");
      for (const intent of intents) {
        const asset = staged.find((candidate) => candidate.id === intent.assetId)!;
        const copy = copies.find((candidate) => candidate.objectKey === asset.objectKey)!;
        await assertAssociationTarget(transaction, actor, intent.associationType ? associationTypeSchema.parse(intent.associationType) : null, intent.associationEntityId);
        if (!isRoleMimeCompatible(intent.adminAssetRole!, asset.detectedMimeType)) throw new Error("Asset role is incompatible with detected MIME type.");
        await transaction.update(assets).set({
          storagePartition: "public", access: "public", retentionExpiresAt: null,
          sourceDeclarationEnabled: batch.sourceDeclarationEnabled,
          ...(batch.sourceDeclarationEnabled ? {
            sourceType: cleanOptional(source?.sourceType), sourceProvider: cleanOptional(source?.sourceProvider),
            rightsStatus: cleanOptional(source?.rightsStatus), subjectRelationship: source?.subjectRelationship ?? null,
            publicUsePermission: source?.publicUsePermission ?? null, editingPermission: source?.editingPermission ?? null,
            usageRestrictions: cleanOptional(source?.usageRestrictions), permissionEvidence: cleanOptional(source?.permissionEvidence),
            declarationExpiryDate: source?.declarationExpiryDate ? new Date(source.declarationExpiryDate) : null,
            isCwtOwnedFacility: source?.isCwtOwnedFacility ?? null,
            declarationStatementVersion: 1, declarationRecordVersion: 1,
            declarationLastEditorUserId: actor.userId, effectiveRightsDecision: "pending_review" as const,
          } : {}),
          updatedAt: commitTime,
        }).where(and(
          eq(assets.id, asset.id),
          eq(assets.storagePartition, "private"),
          eq(assets.access, "internal"),
          eq(assets.status, "ready"),
        ));
        if (copy.variants.length) await transaction.insert(assetVariants).values(copy.variants.map((variant) => ({
          sourceAssetId: asset.id, format: variant.format, variantKey: variant.key.split("/").at(-1)!,
          objectKey: variant.key, byteSize: variant.bytes.byteLength, width: variant.width, height: variant.height,
        })));
        if (intent.associationType && intent.associationEntityId) await insertRelation(transaction, {
          assetId: asset.id,
          associationType: associationTypeSchema.parse(intent.associationType),
          associationEntityId: intent.associationEntityId,
          role: roleSchema.parse(intent.adminAssetRole),
          sortOrder: intent.sortOrder ?? 0,
        });
        const consumed = await transaction.update(uploadIntents).set({ status: "consumed", isConsumed: true, usedAt: commitTime, updatedAt: commitTime }).where(and(eq(uploadIntents.id, intent.id), eq(uploadIntents.status, "passed"))).returning({ id: uploadIntents.id });
        if (!consumed[0]) throw new Error("Upload Intent changed before Finalize commit.");
        await auditWriter(transaction, { actorUserId: actor.userId, action: "asset.released_public", entityType: "asset", entityId: asset.id, afterSummary: { uploadBatchId: batch.id, associationType: intent.associationType } });
        await transaction.insert(objectCleanupJobs).values({
          uploadBatchId: batch.id,
          assetId: asset.id,
          storagePartition: "private",
          objectKey: asset.objectKey,
          reason: "finalize_private_staging_released",
          status: "pending",
          nextAttemptAt: commitTime,
        }).onConflictDoUpdate({
          target: [objectCleanupJobs.storagePartition, objectCleanupJobs.objectKey],
          set: {
            uploadBatchId: batch.id,
            assetId: asset.id,
            reason: "finalize_private_staging_released",
            status: "pending",
            attemptCount: 0,
            nextAttemptAt: commitTime,
            lockedBy: null,
            lockedAt: null,
            leaseExpiresAt: null,
            lastError: null,
            completedAt: null,
            updatedAt: commitTime,
          },
        });
      }
      await transaction.update(objectCleanupJobs).set({
        status: "cancelled",
        lockedBy: null,
        lockedAt: null,
        leaseExpiresAt: null,
        updatedAt: commitTime,
      }).where(and(
        eq(objectCleanupJobs.uploadBatchId, batch.id),
        eq(objectCleanupJobs.storagePartition, "public"),
        eq(objectCleanupJobs.status, "pending"),
      ));
      const completedRecovery = await transaction.update(uploadRecoveryJobs).set({
        status: "completed",
        stage: "completed",
        completedAt: commitTime,
        lockedBy: null,
        lockedAt: null,
        leaseExpiresAt: null,
        lastError: null,
        version: sql`${uploadRecoveryJobs.version} + 1`,
        updatedAt: commitTime,
      }).where(and(
        eq(uploadRecoveryJobs.id, recoveryLease.id),
        eq(uploadRecoveryJobs.status, "processing"),
        eq(uploadRecoveryJobs.lockedBy, recoveryLease.workerId),
        eq(uploadRecoveryJobs.version, recoveryLease.version),
        gt(uploadRecoveryJobs.leaseExpiresAt, commitTime),
      )).returning({ id: uploadRecoveryJobs.id });
      if (!completedRecovery[0]) throw new Error("Finalize lease or version changed before completion.");
      const completedBatch = await transaction.update(assetUploadBatches).set({ status: "completed", completedAt: commitTime, failureReason: null }).where(and(
        eq(assetUploadBatches.id, batch.id),
        eq(assetUploadBatches.status, "finalizing"),
      )).returning({ id: assetUploadBatches.id });
      if (!completedBatch[0]) throw new Error("Upload Batch changed before Finalize completion.");
      await auditWriter(transaction, { actorUserId: actor.userId, action: "asset.upload_batch.completed", entityType: "asset_upload_batch", entityId: batch.id, afterSummary: { fileCount: intents.length, sourceDeclarationEnabled: batch.sourceDeclarationEnabled } });
    });
    await processPendingObjectCleanupJobs(db, storage, {
      limit: Math.max(1, staged.length),
      workerId: `finalize-private-${batch.id}`,
      now: new Date(),
      auditWriter,
    });
  } catch (error) {
    const recoveryState = await markFinalizeRecoveryRequired(
      db,
      recoveryLease,
      batch.id,
      error,
      { auditWriter, now: new Date() },
    );
    if (recoveryState === "cleanup_required") {
      await processPendingObjectCleanupJobs(db, storage, {
        limit: Math.max(1, staged.length * 8),
        workerId: `finalize-compensation-${batch.id}`,
        now: new Date(),
        auditWriter,
      });
    }
    throw error;
  }
  return { assetIds: staged.map((asset) => asset.id) };
}
