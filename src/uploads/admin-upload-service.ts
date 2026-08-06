import { createHash, randomBytes, randomUUID } from "node:crypto";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { and, count, desc, eq, gt, inArray, isNull, lte, sql } from "drizzle-orm";
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
  finalizeObjectManifestItems,
  objectCleanupJobs,
  productAssets,
  products,
  uploadIntents,
  uploadRecoveryJobs,
} from "@/db/schema";
import type { AppDatabase } from "@/db/types";
import type { ObjectStorage } from "@/storage";

import { isRoleMimeCompatible } from "./asset-eligibility";
import { createAssetVariantObjectKey, type AssetVariantFormat } from "./asset-variant";
import {
  acceptedPublicMimeTypes,
  detectMimeType,
  inferNonBlockingRiskHints,
  validateUploadedFile,
} from "./file-validation";
import { createImageDerivatives } from "./image-derivatives";
import { parseProductImportWorkbook } from "@/imports/workbook";
import { inspectImportImageArchiveStream } from "@/imports/archive";
import {
  processPendingObjectCleanupJobs,
} from "./object-cleanup-service";
import { createUploadRateLimiter, type UploadRateLimiter } from "./rate-limit";
import type { FileScanner } from "./scanner";
import {
  advanceUploadRecoveryStage,
  heartbeatFinalizeLease,
  markFinalizeRecoveryRequired,
  markFinalizeObjectWritten,
  registerFinalizeManifest,
  type FinalizeManifestItem,
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
export const IMPORT_WORKBOOK_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
export const IMPORT_ARCHIVE_MIME = "application/zip";
const importPackageMimeTypes = [IMPORT_WORKBOOK_MIME, IMPORT_ARCHIVE_MIME] as const;

function isImportPackageMime(value: string): boolean {
  return (importPackageMimeTypes as readonly string[]).includes(value);
}

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
  clock?: () => Date;
  faultInjector?: (point: AdminUploadFaultPoint) => void | Promise<void>;
  importBinding?: ImportMediaUploadBinding;
  issuedTokens?: readonly string[];
}

const importMediaUploadBindingSchema = z.object({
  packageAssetId: z.uuid(),
  sourceKey: z.string().min(1).max(240),
  sourceOrder: z.number().int().min(0).max(499),
  relativePath: z.string().min(1).max(240),
  displayName: z.string().min(1).max(200),
  sha256: z.string().regex(/^[0-9a-f]{64}$/),
}).strict();

type ImportMediaUploadBinding = z.infer<typeof importMediaUploadBindingSchema>;

export type AdminUploadFaultPoint =
  | "before_recovery_job_insert"
  | "before_preregister_commit"
  | "after_staging_put"
  | "after_scan_success"
  | "before_asset_complete_update"
  | "before_intent_complete_update"
  | "before_batch_complete_update"
  | "before_finalize_claim_commit"
  | "after_finalize_claim"
  | "after_finalize_manifest_registered"
  | "after_finalize_original_written"
  | "after_finalize_first_variant_written"
  | "before_finalize_publish_transaction"
  | "before_finalize_publish_commit"
  | "before_post_commit_cleanup"
  | "after_post_commit_cleanup"
  | "before_post_commit_warning"
  | "after_import_archive_first_media";

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
    [IMPORT_WORKBOOK_MIME]: "xlsx",
    [IMPORT_ARCHIVE_MIME]: "zip",
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
    const importPackage = isImportPackageMime(file.declaredMimeType);
    if (!(acceptedPublicMimeTypes as readonly string[]).includes(file.declaredMimeType) && !importPackage) {
      throw new Error("Upload MIME type is not permitted.");
    }
    if (importPackage && (input.category !== "other" || input.role !== "document" || input.associationType || input.associationEntityId || input.sourceDeclarationEnabled)) {
      throw new Error("Import packages require the isolated other/document upload contract.");
    }
    if (!importPackage && !isRoleMimeCompatible(input.role, file.declaredMimeType)) {
      throw new Error("Asset role does not allow the declared MIME type.");
    }
    const maximumBytes = file.declaredMimeType === IMPORT_WORKBOOK_MIME
      ? 10 * 1024 * 1024
      : file.declaredMimeType === IMPORT_ARCHIVE_MIME
        ? 500 * 1024 * 1024
        : env.MAX_PUBLIC_FILE_BYTES;
    if (!Number.isInteger(file.declaredByteSize) || file.declaredByteSize < 1 || file.declaredByteSize > maximumBytes) {
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
  if (options.issuedTokens && options.issuedTokens.length !== normalized.files.length) {
    throw new Error("Issued Upload token count does not match the declared files.");
  }
  const importBinding = options.importBinding
    ? importMediaUploadBindingSchema.parse(options.importBinding)
    : null;
  if (importBinding && (
    normalized.files.length !== 1 ||
    normalized.category !== "product" ||
    normalized.role !== "gallery" ||
    normalized.associationType ||
    normalized.associationEntityId ||
    normalized.sourceDeclarationEnabled
  )) {
    throw new Error("Import media binding requires one isolated Product media upload.");
  }
  const issued = normalized.files.map((file, index) => ({
    file,
    token: options.issuedTokens?.[index] ?? randomBytes(32).toString("base64url"),
  }));
  const auditWriter = options.auditWriter ?? writeAuditLog;
  return db.transaction(async (transaction) => {
    await assertActiveSession(transaction, actor, now);
    await assertAssociationTarget(transaction, actor, normalized.associationType ?? null, normalized.associationEntityId ?? null);
    const batchRows = await transaction.insert(assetUploadBatches).values({
      createdByUserId: actor.userId,
      authSessionId: actor.authSessionId,
      sourceDeclarationEnabled: normalized.sourceDeclarationEnabled,
      declarationInput: importBinding
        ? { importMediaBinding: importBinding }
        : normalized.sourceDeclarationEnabled
          ? normalized.sourceDeclaration ?? {}
          : null,
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
      afterSummary: {
        fileCount: issued.length,
        sourceDeclarationEnabled: normalized.sourceDeclarationEnabled,
        importBound: Boolean(importBinding),
      },
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
): Promise<{ declaredByteSize: number; declaredMimeType: string; importPackage: boolean }> {
  await assertActiveSession(db, actor, now);
  const row = (await db.select({
    declaredByteSize: uploadIntents.declaredByteSize,
    declaredMimeType: uploadIntents.declaredMimeType,
  }).from(uploadIntents).where(and(
    eq(uploadIntents.tokenHash, hashToken(token)),
    eq(uploadIntents.kind, "admin_asset"),
    eq(uploadIntents.createdByUserId, actor.userId),
    eq(uploadIntents.authSessionId, actor.authSessionId),
    inArray(uploadIntents.status, ["created", "uploading", "passed", "consumed"]),
    gt(uploadIntents.expiresAt, now),
  )).limit(1))[0];
  if (!row) throw new Error("Admin Upload Intent is invalid, expired, or already used.");
  return { ...row, importPackage: isImportPackageMime(row.declaredMimeType) };
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
  const inputSha256 = createHash("sha256").update(input.bytes).digest("hex");

  const preregistered = await db.transaction(async (transaction) => {
    await assertActiveSession(transaction, actor, now);
    await transaction.execute(sql`
      select id from upload_intents
      where token_hash = ${hashToken(input.token)}
      for update
    `);
    const intent = (await transaction.select().from(uploadIntents).where(and(
      eq(uploadIntents.tokenHash, hashToken(input.token)),
      eq(uploadIntents.kind, "admin_asset"),
      eq(uploadIntents.createdByUserId, actor.userId),
      eq(uploadIntents.authSessionId, actor.authSessionId),
      inArray(uploadIntents.status, ["created", "uploading", "passed", "consumed"]),
      gt(uploadIntents.expiresAt, now),
    )).limit(1))[0];
    if (!intent?.uploadBatchId || !intent.adminAssetCategory || !intent.adminAssetRole) {
      throw new Error("Admin Upload Intent is invalid, expired, or already used.");
    }
    if (intent.status === "passed" || intent.status === "consumed") {
      const completedAsset = intent.assetId
        ? (await transaction.select().from(assets).where(eq(assets.id, intent.assetId)).limit(1))[0]
        : undefined;
      if (
        !completedAsset ||
        completedAsset.uploadBatchId !== intent.uploadBatchId ||
        completedAsset.byteSize !== input.bytes.byteLength ||
        completedAsset.sha256 !== inputSha256 ||
        completedAsset.status !== "ready" ||
        completedAsset.scanStatus !== "passed"
      ) {
        throw new Error("Completed Admin Upload replay does not match its durable Asset evidence.");
      }
      return { mismatch: false, completedAssetId: completedAsset.id } as const;
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
    const importPackage = isImportPackageMime(intent.declaredMimeType);
    const storagePartition = importPackage ? "imports" as const : "private" as const;
    if (intent.status === "uploading") {
      const existingAsset = intent.assetId
        ? (await transaction.select().from(assets).where(eq(assets.id, intent.assetId)).limit(1))[0]
        : undefined;
      const existingRecovery = (await transaction.select().from(uploadRecoveryJobs).where(and(
        eq(uploadRecoveryJobs.uploadIntentId, intent.id),
        eq(uploadRecoveryJobs.kind, "staging"),
      )).limit(1))[0];
      const cleanup = existingAsset
        ? (await transaction.select().from(objectCleanupJobs).where(and(
            eq(objectCleanupJobs.assetId, existingAsset.id),
            eq(objectCleanupJobs.uploadIntentId, intent.id),
            eq(objectCleanupJobs.storagePartition, storagePartition),
          )).limit(1))[0]
        : undefined;
      if (
        !existingAsset ||
        !existingRecovery ||
        !cleanup ||
        existingAsset.uploadBatchId !== intent.uploadBatchId ||
        existingAsset.storagePartition !== storagePartition ||
        existingAsset.access !== "internal" ||
        existingAsset.byteSize !== input.bytes.byteLength ||
        existingAsset.sha256 !== inputSha256 ||
        existingRecovery.assetId !== existingAsset.id ||
        existingRecovery.objectKey !== existingAsset.objectKey ||
        existingRecovery.status === "dead" ||
        cleanup.status === "dead" ||
        (existingRecovery.status === "processing" && existingRecovery.leaseExpiresAt && existingRecovery.leaseExpiresAt > now) ||
        (cleanup.status === "processing" && cleanup.leaseExpiresAt && cleanup.leaseExpiresAt > now)
      ) {
        throw new Error("Admin Upload retry is not safely reclaimable yet.");
      }
      const recovery = (await transaction.update(uploadRecoveryJobs).set({
        status: "processing",
        stage: "preregistered",
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
        eq(uploadRecoveryJobs.id, existingRecovery.id),
        eq(uploadRecoveryJobs.version, existingRecovery.version),
        inArray(uploadRecoveryJobs.status, ["processing", "retryable", "cleanup_required"]),
      )).returning({
        id: uploadRecoveryJobs.id,
        version: uploadRecoveryJobs.version,
        attemptCount: uploadRecoveryJobs.attemptCount,
      }))[0];
      if (!recovery) throw new Error("Admin Upload retry lease could not be reclaimed.");
      await transaction.update(objectCleanupJobs).set({
        status: "pending",
        recoveryVersion: recovery.version,
        nextAttemptAt: leaseExpiresAt,
        lockedBy: null,
        lockedAt: null,
        leaseExpiresAt: null,
        completedAt: null,
        lastError: null,
        updatedAt: now,
      }).where(eq(objectCleanupJobs.id, cleanup.id));
      await transaction.update(assets).set({
        status: "scanning",
        scanStatus: "pending",
        detectedMimeType: null,
        width: null,
        height: null,
        scanProvider: null,
        scanResult: null,
        scanFailureReason: null,
        scanCompletedAt: null,
        updatedAt: now,
      }).where(eq(assets.id, existingAsset.id));
      await transaction.update(assetUploadBatches).set({
        status: "uploading",
        failureReason: null,
      }).where(eq(assetUploadBatches.id, intent.uploadBatchId));
      await auditWriter(transaction, {
        actorUserId: actor.userId,
        action: "asset.upload.retry_claimed",
        entityType: "asset",
        entityId: existingAsset.id,
        afterSummary: { uploadBatchId: intent.uploadBatchId, attempt: recovery.attemptCount },
      });
      return {
        mismatch: false,
        intent,
        assetId: existingAsset.id,
        objectKey: existingAsset.objectKey,
        resumed: true,
        recoveryLease: {
          id: recovery.id,
          workerId,
          version: recovery.version,
          attemptCount: recovery.attemptCount,
          leaseExpiresAt,
        } satisfies UploadRecoveryLease,
      } as const;
    }
    const objectKey = `${importPackage ? "packages/admin" : "staging/admin"}/${datePrefix}/${randomUUID()}.${safeExtension(intent.declaredMimeType)}`;
    await transaction.insert(assets).values({
      id: expectedAssetId,
      uploadBatchId: intent.uploadBatchId,
      uploadedByUserId: actor.userId,
      originalFileName: intent.declaredFileName,
      storageProvider: env.STORAGE_DRIVER,
      storagePartition,
      objectKey,
      access: "internal",
      category: intent.adminAssetCategory,
      status: "scanning",
      declaredMimeType: intent.declaredMimeType,
      byteSize: input.bytes.byteLength,
      sha256: inputSha256,
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
      storagePartition,
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
      uploadIntentId: intent.id,
      assetId: expectedAssetId,
      storagePartition,
      objectKey,
      reason: "admin_staging_saga_compensation",
      cleanupKind: "staging",
      status: "pending",
      recoveryVersion: recovery.version,
      expectedObjectRole: intent.adminAssetRole,
      expectedMimeType: intent.declaredMimeType,
      expectedByteSize: input.bytes.byteLength,
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
      resumed: false,
      recoveryLease: {
        id: recovery.id,
        workerId,
        version: recovery.version,
        attemptCount: 1,
        leaseExpiresAt,
      } satisfies UploadRecoveryLease,
    } as const;
  });
  if (preregistered.mismatch) {
    throw new Error("Uploaded size does not match the Admin Upload Intent.");
  }
  if ("completedAssetId" in preregistered) return preregistered.completedAssetId;

  let recoveryLease = preregistered.recoveryLease;
  try {
    recoveryLease = await advanceUploadRecoveryStage(
      db,
      recoveryLease,
      "storage_writing",
      new Date(),
      leaseMilliseconds,
    );
    if (preregistered.resumed && await storage.exists(
      isImportPackageMime(preregistered.intent.declaredMimeType) ? "imports" : "private",
      preregistered.objectKey,
    )) {
      await storage.delete(
        isImportPackageMime(preregistered.intent.declaredMimeType) ? "imports" : "private",
        preregistered.objectKey,
      );
    }
    await storage.put(
      isImportPackageMime(preregistered.intent.declaredMimeType) ? "imports" : "private",
      preregistered.objectKey,
      input.bytes,
      preregistered.intent.declaredMimeType,
    );
    await options.faultInjector?.("after_staging_put");
    recoveryLease = await advanceUploadRecoveryStage(db, recoveryLease, "storage_written", new Date(), leaseMilliseconds);
    const importPackage = isImportPackageMime(preregistered.intent.declaredMimeType);
    const validated = importPackage
      ? preregistered.intent.declaredMimeType === IMPORT_WORKBOOK_MIME
        ? (await parseProductImportWorkbook(input.bytes), { detectedMimeType: IMPORT_WORKBOOK_MIME, width: null, height: null })
        : (() => {
            if (input.bytes[0] !== 0x50 || input.bytes[1] !== 0x4b) throw new Error("Import archive signature is invalid.");
            return { detectedMimeType: IMPORT_ARCHIVE_MIME, width: null, height: null };
          })()
      : await validateUploadedFile({
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
        eq(assets.storagePartition, importPackage ? "imports" : "private"),
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
      )).returning({ id: uploadRecoveryJobs.id, version: uploadRecoveryJobs.version });
      if (!recoveryUpdated[0]) throw new Error("Upload Recovery lease was lost before staging completion.");
      await transaction.update(objectCleanupJobs).set({
        nextAttemptAt: preregistered.intent.expiresAt,
        recoveryVersion: recoveryUpdated[0].version,
        updatedAt: completedAt,
      }).where(and(
        eq(objectCleanupJobs.assetId, preregistered.assetId),
        eq(objectCleanupJobs.storagePartition, importPackage ? "imports" : "private"),
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

export interface CompletedImportArchiveMedia {
  sourceKey: string;
  relativePath: string;
  displayName: string;
  sha256: string;
  assetId: string;
  uploadBatchId: string;
}

function importMediaToken(parentToken: string, sourceKey: string): string {
  return createHash("sha256")
    .update("cwt-import-media-v1\0")
    .update(parentToken)
    .update("\0")
    .update(sourceKey)
    .digest("base64url");
}

async function digestBoundedStream(
  stream: ReadableStream<Uint8Array>,
  expectedBytes: number,
): Promise<string> {
  const digest = createHash("sha256");
  const reader = stream.getReader();
  let actualBytes = 0;
  try {
    while (true) {
      const next = await reader.read();
      if (next.done) break;
      actualBytes += next.value.byteLength;
      if (actualBytes > expectedBytes) throw new Error("Streamed object exceeds its declared size.");
      digest.update(next.value);
    }
  } finally {
    reader.releaseLock();
  }
  if (actualBytes !== expectedBytes) throw new Error("Streamed object does not match its declared size.");
  return digest.digest("hex");
}

async function readBoundImportMedia<TQueryResult extends PgQueryResultHKT>(
  db: AppDatabase<TQueryResult>,
  actor: AdminUploadActor,
  packageAssetId: string,
): Promise<Map<string, {
  binding: ImportMediaUploadBinding;
  batchId: string;
  completed: CompletedImportArchiveMedia | null;
}>> {
  const batches = await db.select().from(assetUploadBatches).where(and(
    eq(assetUploadBatches.createdByUserId, actor.userId),
    eq(assetUploadBatches.authSessionId, actor.authSessionId),
    sql`${assetUploadBatches.declarationInput} -> 'importMediaBinding' ->> 'packageAssetId' = ${packageAssetId}`,
  ));
  if (!batches.length) return new Map();
  const batchIds = batches.map((batch) => batch.id);
  const relatedAssets = await db.select().from(assets).where(inArray(assets.uploadBatchId, batchIds));
  const assetsByBatch = new Map<string, typeof relatedAssets>();
  for (const asset of relatedAssets) {
    if (!asset.uploadBatchId) continue;
    const current = assetsByBatch.get(asset.uploadBatchId) ?? [];
    current.push(asset);
    assetsByBatch.set(asset.uploadBatchId, current);
  }
  const result = new Map<string, {
    binding: ImportMediaUploadBinding;
    batchId: string;
    completed: CompletedImportArchiveMedia | null;
  }>();
  for (const batch of batches) {
    const input = batch.declarationInput as { importMediaBinding?: unknown } | null;
    const parsed = importMediaUploadBindingSchema.safeParse(input?.importMediaBinding);
    if (!parsed.success || parsed.data.packageAssetId !== packageAssetId) {
      throw new Error("Import media Upload binding is invalid.");
    }
    if (result.has(parsed.data.sourceKey)) {
      throw new Error("Import media Upload binding is duplicated.");
    }
    const batchAssets = assetsByBatch.get(batch.id) ?? [];
    const publicAsset = batch.status === "completed" && batchAssets.length === 1
      ? batchAssets[0]
      : undefined;
    const completed = publicAsset &&
      publicAsset.storagePartition === "public" &&
      publicAsset.access === "public" &&
      publicAsset.status === "ready" &&
      publicAsset.scanStatus === "passed" &&
      publicAsset.sha256 === parsed.data.sha256
      ? {
          sourceKey: parsed.data.sourceKey,
          relativePath: parsed.data.relativePath,
          displayName: parsed.data.displayName,
          sha256: parsed.data.sha256,
          assetId: publicAsset.id,
          uploadBatchId: batch.id,
        }
      : null;
    if (batch.status === "completed" && !completed) {
      throw new Error("Completed Import media Upload binding has inconsistent Asset evidence.");
    }
    result.set(parsed.data.sourceKey, { binding: parsed.data, batchId: batch.id, completed });
  }
  return result;
}

export async function completeAdminImportArchiveIntent<TQueryResult extends PgQueryResultHKT>(
  db: AppDatabase<TQueryResult>,
  storage: ObjectStorage,
  scanner: FileScanner,
  actor: AdminUploadActor,
  input: { token: string; stream: ReadableStream<Uint8Array> },
  options: AdminUploadOptions = {},
): Promise<{ packageAssetId: string; media: CompletedImportArchiveMedia[] }> {
  const now = options.now ?? new Date();
  await assertActiveSession(db, actor, now);
  if (!storage.putStream) throw new Error("Configured storage does not support bounded Import streams.");
  const workerId = options.workerId ?? `import-archive-${randomUUID()}`;
  const leaseMilliseconds = options.leaseMilliseconds ?? 5 * UPLOAD_RECOVERY_LEASE_MILLISECONDS;
  const leaseExpiresAt = new Date(now.getTime() + leaseMilliseconds);
  const datePrefix = now.toISOString().slice(0, 10).replaceAll("-", "/");
  const auditWriter = options.auditWriter ?? writeAuditLog;
  const claim = await db.transaction(async (transaction) => {
    await assertActiveSession(transaction, actor, now);
    await transaction.execute(sql`
      select id from upload_intents
      where token_hash = ${hashToken(input.token)}
      for update
    `);
    const intent = (await transaction.select().from(uploadIntents).where(and(
      eq(uploadIntents.tokenHash, hashToken(input.token)),
      eq(uploadIntents.kind, "admin_asset"),
      eq(uploadIntents.createdByUserId, actor.userId),
      eq(uploadIntents.authSessionId, actor.authSessionId),
      inArray(uploadIntents.status, ["created", "uploading", "passed", "consumed"]),
      eq(uploadIntents.declaredMimeType, IMPORT_ARCHIVE_MIME),
      gt(uploadIntents.expiresAt, now),
    )).limit(1))[0];
    if (!intent?.uploadBatchId || !intent.adminAssetCategory || !intent.adminAssetRole) {
      throw new Error("Import Archive Intent is invalid, expired, or already used.");
    }
    if (intent.status === "passed" || intent.status === "consumed") {
      const completedAsset = intent.assetId
        ? (await transaction.select().from(assets).where(eq(assets.id, intent.assetId)).limit(1))[0]
        : undefined;
      if (
        !completedAsset ||
        completedAsset.uploadBatchId !== intent.uploadBatchId ||
        completedAsset.storagePartition !== "imports" ||
        completedAsset.access !== "internal" ||
        completedAsset.status !== "ready" ||
        completedAsset.scanStatus !== "passed" ||
        completedAsset.detectedMimeType !== IMPORT_ARCHIVE_MIME
      ) {
        throw new Error("Completed Import Archive replay has inconsistent durable evidence.");
      }
      return { completed: true, intent, asset: completedAsset } as const;
    }
    if (intent.status === "uploading") {
      const existingAsset = intent.assetId
        ? (await transaction.select().from(assets).where(eq(assets.id, intent.assetId)).limit(1))[0]
        : undefined;
      const existingRecovery = (await transaction.select().from(uploadRecoveryJobs).where(and(
        eq(uploadRecoveryJobs.uploadIntentId, intent.id),
        eq(uploadRecoveryJobs.kind, "staging"),
      )).limit(1))[0];
      const cleanup = existingAsset
        ? (await transaction.select().from(objectCleanupJobs).where(and(
            eq(objectCleanupJobs.assetId, existingAsset.id),
            eq(objectCleanupJobs.uploadIntentId, intent.id),
            eq(objectCleanupJobs.storagePartition, "imports"),
          )).limit(1))[0]
        : undefined;
      if (
        !existingAsset ||
        !existingRecovery ||
        !cleanup ||
        existingAsset.uploadBatchId !== intent.uploadBatchId ||
        existingAsset.storagePartition !== "imports" ||
        existingAsset.access !== "internal" ||
        existingAsset.byteSize !== intent.declaredByteSize ||
        existingRecovery.assetId !== existingAsset.id ||
        existingRecovery.objectKey !== existingAsset.objectKey ||
        existingRecovery.status === "dead" ||
        cleanup.status === "dead" ||
        (existingRecovery.status === "processing" && existingRecovery.leaseExpiresAt && existingRecovery.leaseExpiresAt > now) ||
        (cleanup.status === "processing" && cleanup.leaseExpiresAt && cleanup.leaseExpiresAt > now)
      ) {
        throw new Error("Import Archive retry is not safely reclaimable yet.");
      }
      const recovery = (await transaction.update(uploadRecoveryJobs).set({
        status: "processing",
        stage: "preregistered",
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
        eq(uploadRecoveryJobs.id, existingRecovery.id),
        eq(uploadRecoveryJobs.version, existingRecovery.version),
        inArray(uploadRecoveryJobs.status, ["processing", "retryable", "cleanup_required"]),
      )).returning({
        id: uploadRecoveryJobs.id,
        version: uploadRecoveryJobs.version,
        attemptCount: uploadRecoveryJobs.attemptCount,
      }))[0];
      if (!recovery) throw new Error("Import Archive retry lease could not be reclaimed.");
      await transaction.update(objectCleanupJobs).set({
        status: "pending",
        recoveryVersion: recovery.version,
        nextAttemptAt: leaseExpiresAt,
        lockedBy: null,
        lockedAt: null,
        leaseExpiresAt: null,
        completedAt: null,
        lastError: null,
        updatedAt: now,
      }).where(eq(objectCleanupJobs.id, cleanup.id));
      await transaction.update(assets).set({
        status: "scanning",
        scanStatus: "pending",
        detectedMimeType: null,
        scanProvider: null,
        scanResult: null,
        scanFailureReason: null,
        scanCompletedAt: null,
        sha256: "0".repeat(64),
        updatedAt: now,
      }).where(eq(assets.id, existingAsset.id));
      await transaction.update(assetUploadBatches).set({ status: "uploading", failureReason: null })
        .where(eq(assetUploadBatches.id, intent.uploadBatchId));
      await auditWriter(transaction, {
        actorUserId: actor.userId,
        action: "asset.import_archive.retry_claimed",
        entityType: "asset",
        entityId: existingAsset.id,
        afterSummary: { uploadBatchId: intent.uploadBatchId, attempt: recovery.attemptCount },
      });
      return {
        completed: false,
        resumed: true,
        intent,
        asset: existingAsset,
        recovery,
      } as const;
    }
    const assetId = randomUUID();
    const objectKey = `packages/admin/${datePrefix}/${randomUUID()}.zip`;
    await transaction.insert(assets).values({
      id: assetId,
      uploadBatchId: intent.uploadBatchId,
      uploadedByUserId: actor.userId,
      originalFileName: intent.declaredFileName,
      storageProvider: env.STORAGE_DRIVER,
      storagePartition: "imports",
      objectKey,
      access: "internal",
      category: "other",
      status: "scanning",
      declaredMimeType: IMPORT_ARCHIVE_MIME,
      byteSize: intent.declaredByteSize,
      sha256: "0".repeat(64),
      retentionExpiresAt: intent.expiresAt,
    });
    const row = (await transaction.insert(uploadRecoveryJobs).values({
      kind: "staging",
      uploadBatchId: intent.uploadBatchId,
      uploadIntentId: intent.id,
      assetId,
      storagePartition: "imports",
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
    if (!row) throw new Error("Import Archive Recovery Job insert failed.");
    await transaction.insert(objectCleanupJobs).values({
      uploadBatchId: intent.uploadBatchId,
      uploadIntentId: intent.id,
      assetId,
      storagePartition: "imports",
      objectKey,
      reason: "import_archive_saga_compensation",
      cleanupKind: "staging",
      status: "pending",
      recoveryVersion: row.version,
      expectedObjectRole: "document",
      expectedMimeType: IMPORT_ARCHIVE_MIME,
      expectedByteSize: intent.declaredByteSize,
      nextAttemptAt: leaseExpiresAt,
    });
    await transaction.update(uploadIntents).set({ assetId, status: "uploading", updatedAt: now })
      .where(and(eq(uploadIntents.id, intent.id), eq(uploadIntents.status, "created")));
    await transaction.update(assetUploadBatches).set({ status: "uploading" })
      .where(eq(assetUploadBatches.id, intent.uploadBatchId));
    await auditWriter(transaction, {
      actorUserId: actor.userId,
      action: "asset.import_archive.receiving",
      entityType: "asset",
      entityId: assetId,
      afterSummary: { uploadBatchId: intent.uploadBatchId, recoveryJobId: row.id },
    });
    return {
      completed: false,
      resumed: false,
      intent,
      asset: { id: assetId, objectKey, sha256: "0".repeat(64) },
      recovery: { id: row.id, version: row.version, attemptCount: 1 },
    } as const;
  });
  if (claim.completed) {
    const replaySha256 = await digestBoundedStream(input.stream, claim.intent.declaredByteSize);
    if (replaySha256 !== claim.asset.sha256) {
      throw new Error("Completed Import Archive replay does not match the original package.");
    }
    const bindings = await readBoundImportMedia(db, actor, claim.asset.id);
    const media = [...bindings.values()].map((entry) => {
      if (!entry.completed) throw new Error("Completed Import Archive has incomplete media evidence.");
      return { order: entry.binding.sourceOrder, media: entry.completed };
    }).sort((left, right) => left.order - right.order).map((entry) => entry.media);
    return { packageAssetId: claim.asset.id, media };
  }
  const intent = claim.intent;
  const uploadBatchId = intent.uploadBatchId!;
  const assetId = claim.asset.id;
  const objectKey = claim.asset.objectKey;
  let lease: UploadRecoveryLease = {
    id: claim.recovery.id,
    workerId,
    version: claim.recovery.version,
    attemptCount: claim.recovery.attemptCount,
    leaseExpiresAt,
  };
  const [storageStream, inspectStream] = input.stream.tee();
  const sha = createHash("sha256");
  const hashingStream = storageStream.pipeThrough(new TransformStream<Uint8Array, Uint8Array>({
    transform(chunk, controller) {
      sha.update(chunk);
      controller.enqueue(chunk);
    },
  }));
  const media: CompletedImportArchiveMedia[] = [];
  const temporaryRoot = await mkdtemp(join(tmpdir(), "cwt-product-import-"));
  const stagedMedia: Array<{
    sourceKey: string;
    relativePath: string;
    displayName: string;
    detectedMimeType: "image/jpeg" | "image/png" | "image/webp" | "image/avif";
    path: string;
    byteSize: number;
  }> = [];
  const internalImportOptions: AdminUploadOptions = {
    ...options,
    rateLimiter: { consume: async () => true },
  };
  try {
    lease = await advanceUploadRecoveryStage(db, lease, "storage_writing", new Date(), leaseMilliseconds);
    if (claim.resumed && await storage.exists("imports", objectKey)) {
      await storage.delete("imports", objectKey);
    }
    await Promise.all([
      storage.putStream("imports", objectKey, hashingStream, IMPORT_ARCHIVE_MIME, intent.declaredByteSize),
      inspectImportImageArchiveStream(inspectStream, async (file) => {
        const path = join(temporaryRoot, `${String(stagedMedia.length).padStart(4, "0")}-${randomUUID()}.image`);
        await writeFile(path, file.bytes, { flag: "wx" });
        stagedMedia.push({
          sourceKey: file.sourceKey,
          relativePath: file.relativePath,
          displayName: file.displayName,
          detectedMimeType: file.detectedMimeType,
          path,
          byteSize: file.bytes.byteLength,
        });
      }),
    ]);
    stagedMedia.sort((left, right) => left.relativePath.localeCompare(right.relativePath, "en"));
    for (const file of stagedMedia) {
      const bytes = new Uint8Array(await readFile(file.path));
      await validateUploadedFile({
        bytes,
        declaredMimeType: file.detectedMimeType,
        maximumBytes: 20 * 1024 * 1024,
        purpose: "admin_asset_staging",
      });
      const scan = await scanner.scan(bytes, file.displayName);
      if (!scan.clean) throw new Error("An archive image was rejected by malware scanning.");
    }
    const existingBindings = await readBoundImportMedia(db, actor, assetId);
    for (const [sourceOrder, file] of stagedMedia.entries()) {
      const bytes = new Uint8Array(await readFile(file.path));
      const validated = await validateUploadedFile({
        bytes,
        declaredMimeType: file.detectedMimeType,
        maximumBytes: 20 * 1024 * 1024,
        purpose: "admin_asset_staging",
      });
      const sha256 = createHash("sha256").update(bytes).digest("hex");
      const binding = importMediaUploadBindingSchema.parse({
        packageAssetId: assetId,
        sourceKey: file.sourceKey,
        sourceOrder,
        relativePath: file.relativePath,
        displayName: file.displayName,
        sha256,
      });
      const existing = existingBindings.get(file.sourceKey);
      if (existing && JSON.stringify(existing.binding) !== JSON.stringify(binding)) {
        throw new Error("Import media retry does not match its durable binding.");
      }
      if (existing?.completed) {
        media.push(existing.completed);
      } else {
        const token = importMediaToken(input.token, file.sourceKey);
        const issued = existing
          ? { batchId: existing.batchId, intents: [{ token }] }
          : await createAdminUploadBatch(db, actor, {
              files: [{ fileName: file.displayName, declaredMimeType: validated.detectedMimeType, declaredByteSize: file.byteSize }],
              category: "product",
              role: "gallery",
              sortOrder: 0,
              associationType: null,
              associationEntityId: null,
              sourceDeclarationEnabled: false,
              sourceDeclaration: null,
            }, {
              ...internalImportOptions,
              importBinding: binding,
              issuedTokens: [token],
            });
        const stagedAssetId = await completeAdminUploadIntent(db, storage, scanner, actor, { token, bytes }, internalImportOptions);
        const finalized = await finalizeAdminUploadBatch(db, storage, actor, issued.batchId, internalImportOptions);
        if (!finalized.assetIds.includes(stagedAssetId)) throw new Error("Import media Finalize identity mismatch.");
        media.push({
          sourceKey: binding.sourceKey,
          relativePath: binding.relativePath,
          displayName: binding.displayName,
          sha256: binding.sha256,
          assetId: stagedAssetId,
          uploadBatchId: issued.batchId,
        });
      }
      lease = await advanceUploadRecoveryStage(db, lease, "scanning", new Date(), leaseMilliseconds);
      if (media.length === 1) await options.faultInjector?.("after_import_archive_first_media");
    }
    lease = await advanceUploadRecoveryStage(db, lease, "scan_passed", new Date(), leaseMilliseconds);
    await db.transaction(async (transaction) => {
      const completedAt = new Date();
      const assetUpdated = await transaction.update(assets).set({
        status: "ready",
        scanStatus: "passed",
        detectedMimeType: IMPORT_ARCHIVE_MIME,
        scanProvider: "archive_entry_scanner",
        scanResult: `entries:${media.length}`,
        scanCompletedAt: completedAt,
        sha256: sha.digest("hex"),
        updatedAt: completedAt,
      }).where(and(eq(assets.id, assetId), eq(assets.storagePartition, "imports"), eq(assets.status, "scanning")))
        .returning({ id: assets.id });
      if (!assetUpdated[0]) throw new Error("Import Archive Asset changed before completion.");
      await transaction.update(uploadIntents).set({ status: "passed", updatedAt: completedAt })
        .where(and(eq(uploadIntents.id, intent.id), eq(uploadIntents.status, "uploading")));
      const passedCount = Number((await transaction.select({ value: count() }).from(uploadIntents).where(and(
        eq(uploadIntents.uploadBatchId, uploadBatchId),
        eq(uploadIntents.status, "passed"),
      )))[0]?.value ?? 0);
      const declaredCount = (await transaction.select({ value: assetUploadBatches.declaredFileCount }).from(assetUploadBatches)
        .where(eq(assetUploadBatches.id, uploadBatchId)).limit(1))[0]?.value;
      if (declaredCount === undefined) throw new Error("Import Archive Batch disappeared during completion.");
      await transaction.update(assetUploadBatches).set({
        completedFileCount: passedCount,
        status: passedCount >= declaredCount ? "ready_to_finalize" : "uploading",
      }).where(and(eq(assetUploadBatches.id, uploadBatchId), eq(assetUploadBatches.status, "uploading")));
      const recoveryUpdated = await transaction.update(uploadRecoveryJobs).set({
        status: "completed",
        stage: "completed",
        completedAt,
        lockedBy: null,
        lockedAt: null,
        leaseExpiresAt: null,
        version: sql`${uploadRecoveryJobs.version} + 1`,
        updatedAt: completedAt,
      }).where(and(
        eq(uploadRecoveryJobs.id, lease.id),
        eq(uploadRecoveryJobs.status, "processing"),
        eq(uploadRecoveryJobs.lockedBy, lease.workerId),
        eq(uploadRecoveryJobs.version, lease.version),
        gt(uploadRecoveryJobs.leaseExpiresAt, completedAt),
      )).returning({ version: uploadRecoveryJobs.version });
      if (!recoveryUpdated[0]) throw new Error("Import Archive Recovery lease was lost before completion.");
      await transaction.update(objectCleanupJobs).set({
        nextAttemptAt: intent.expiresAt,
        recoveryVersion: recoveryUpdated[0].version,
        updatedAt: completedAt,
      })
        .where(and(eq(objectCleanupJobs.assetId, assetId), eq(objectCleanupJobs.storagePartition, "imports")));
      await auditWriter(transaction, {
        actorUserId: actor.userId,
        action: "asset.import_archive.staged",
        entityType: "asset",
        entityId: assetId,
        afterSummary: { imageCount: media.length, uploadBatchId },
      });
    });
    return { packageAssetId: assetId, media };
  } catch (error) {
    throw error;
  } finally {
    await rm(temporaryRoot, { recursive: true, force: true });
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

export interface RetryableAdminUploadBatch {
  batchId: string;
  fileNames: string[];
  fileCount: number;
  uploadedAt: Date;
  status: "retryable";
  reason: "processing_interrupted";
}

/**
 * Lists only the existing pre-Manifest handoffs that the current upload actor
 * can safely send back through the authoritative Finalize path. The UI is not
 * trusted to infer recoverability from a failed Batch alone.
 */
export async function listRetryableAdminUploadBatches<
  TQueryResult extends PgQueryResultHKT,
>(
  db: AppDatabase<TQueryResult>,
  storage: ObjectStorage,
  actor: AdminUploadActor,
  options: Pick<AdminUploadOptions, "now"> = {},
): Promise<RetryableAdminUploadBatch[]> {
  const now = options.now ?? new Date();
  await assertActiveSession(db, actor, now);
  const candidates = await db
    .select({
      batchId: assetUploadBatches.id,
      declaredFileCount: assetUploadBatches.declaredFileCount,
      uploadedAt: assetUploadBatches.createdAt,
      recoveryId: uploadRecoveryJobs.id,
    })
    .from(assetUploadBatches)
    .innerJoin(
      uploadRecoveryJobs,
      and(
        eq(uploadRecoveryJobs.uploadBatchId, assetUploadBatches.id),
        eq(uploadRecoveryJobs.kind, "finalize"),
      ),
    )
    .where(and(
      eq(assetUploadBatches.createdByUserId, actor.userId),
      eq(assetUploadBatches.authSessionId, actor.authSessionId),
      eq(assetUploadBatches.status, "failed"),
      eq(assetUploadBatches.failureReason, "finalize_recovered_retryable"),
      gt(assetUploadBatches.expiresAt, now),
      eq(uploadRecoveryJobs.status, "retryable"),
      eq(uploadRecoveryJobs.stage, "failed"),
      lte(uploadRecoveryJobs.nextAttemptAt, now),
      isNull(uploadRecoveryJobs.lockedBy),
      isNull(uploadRecoveryJobs.leaseExpiresAt),
      gt(uploadRecoveryJobs.expiresAt, now),
    ))
    .orderBy(desc(assetUploadBatches.createdAt))
    .limit(20);

  const retryable: RetryableAdminUploadBatch[] = [];
  for (const candidate of candidates) {
    const intents = await db.select().from(uploadIntents).where(and(
      eq(uploadIntents.uploadBatchId, candidate.batchId),
      eq(uploadIntents.kind, "admin_asset"),
    ));
    if (
      intents.length !== candidate.declaredFileCount ||
      intents.some((intent) =>
        intent.createdByUserId !== actor.userId ||
        intent.authSessionId !== actor.authSessionId ||
        intent.status !== "passed" ||
        intent.isConsumed ||
        !intent.assetId ||
        !intent.adminAssetRole ||
        intent.expiresAt <= now
      )
    ) continue;

    const stagedAssets = await db.select().from(assets).where(
      eq(assets.uploadBatchId, candidate.batchId),
    );
    if (
      stagedAssets.length !== intents.length ||
      stagedAssets.some((asset) =>
        asset.uploadedByUserId !== actor.userId ||
        asset.storagePartition !== "private" ||
        asset.access !== "internal" ||
        asset.status !== "ready" ||
        asset.scanStatus !== "passed" ||
        asset.deletedAt !== null ||
        (asset.retentionExpiresAt !== null && asset.retentionExpiresAt <= now)
      )
    ) continue;

    const stagedById = new Map(stagedAssets.map((asset) => [asset.id, asset]));
    if (intents.some((intent) => !intent.assetId || !stagedById.has(intent.assetId))) continue;
    const stagingRecoveries = await db.select().from(uploadRecoveryJobs).where(and(
      eq(uploadRecoveryJobs.uploadBatchId, candidate.batchId),
      eq(uploadRecoveryJobs.kind, "staging"),
    ));
    if (
      stagingRecoveries.length !== intents.length ||
      stagingRecoveries.some((recovery) => {
        const intent = intents.find((row) => row.id === recovery.uploadIntentId);
        const asset = recovery.assetId ? stagedById.get(recovery.assetId) : undefined;
        return !intent || !asset || intent.assetId !== asset.id ||
          recovery.status !== "completed" || recovery.stage !== "completed" ||
          recovery.storagePartition !== "private" || recovery.objectKey !== asset.objectKey ||
          recovery.lockedBy !== null || recovery.leaseExpiresAt !== null;
      })
    ) continue;

    const [manifest, publicCleanup] = await Promise.all([
      db.select({ id: finalizeObjectManifestItems.id })
        .from(finalizeObjectManifestItems)
        .where(eq(finalizeObjectManifestItems.recoveryJobId, candidate.recoveryId))
        .limit(1),
      db.select({ id: objectCleanupJobs.id })
        .from(objectCleanupJobs)
        .where(and(
          eq(objectCleanupJobs.uploadBatchId, candidate.batchId),
          eq(objectCleanupJobs.storagePartition, "public"),
        ))
        .limit(1),
    ]);
    if (manifest.length || publicCleanup.length) continue;

    let targetsAndObjectsRemainUsable = true;
    try {
      for (const intent of intents) {
        await assertAssociationTarget(
          db,
          actor,
          intent.associationType ? associationTypeSchema.parse(intent.associationType) : null,
          intent.associationEntityId,
        );
      }
      const objectChecks = await Promise.all(stagedAssets.map((asset) =>
        storage.exists("private", asset.objectKey)
      ));
      targetsAndObjectsRemainUsable = objectChecks.every(Boolean);
    } catch {
      targetsAndObjectsRemainUsable = false;
    }
    if (!targetsAndObjectsRemainUsable) continue;

    retryable.push({
      batchId: candidate.batchId,
      fileNames: intents.map((intent) => intent.declaredFileName),
      fileCount: intents.length,
      uploadedAt: candidate.uploadedAt,
      status: "retryable",
      reason: "processing_interrupted",
    });
  }

  return retryable.sort((left, right) => right.uploadedAt.getTime() - left.uploadedAt.getTime());
}

export interface FinalizeAdminUploadResult {
  success: true;
  assetIds: string[];
  assetId: string;
  batchId: string;
  alreadyFinalized: boolean;
  privateCleanupPending: boolean;
  message: string;
  maintenanceWarning?: string;
}

function successfulFinalizeResult(input: {
  assetIds: string[];
  batchId: string;
  alreadyFinalized: boolean;
  privateCleanupPending: boolean;
  maintenanceWarning?: string;
}): FinalizeAdminUploadResult {
  const assetId = input.assetIds[0];
  if (!assetId) throw new Error("Completed Finalize has no released Asset.");
  const assetLabel = `${input.assetIds.length} asset${input.assetIds.length === 1 ? "" : "s"}`;
  const message = input.alreadyFinalized
    ? `${assetLabel} ${input.assetIds.length === 1 ? "was" : "were"} already uploaded and released.`
    : `${assetLabel} uploaded and released.`;
  return {
    success: true,
    assetIds: input.assetIds,
    assetId,
    batchId: input.batchId,
    alreadyFinalized: input.alreadyFinalized,
    privateCleanupPending: input.privateCleanupPending,
    message,
    ...(input.maintenanceWarning ? { maintenanceWarning: input.maintenanceWarning } : {}),
  };
}

async function assertStoredManifestObject(
  storage: ObjectStorage,
  item: { objectKey: string; byteSize: number; mimeType: string },
): Promise<{ byteSize: number; mimeType: string }> {
  if (!(await storage.exists("public", item.objectKey))) {
    throw new Error("Finalize Public object evidence is incomplete.");
  }
  let bytes: Uint8Array;
  try {
    bytes = await storage.get("public", item.objectKey);
  } catch {
    throw new Error("Finalize Public object evidence is incomplete.");
  }
  const mimeType = detectMimeType(bytes);
  if (bytes.byteLength !== item.byteSize || mimeType !== item.mimeType) {
    throw new Error("Finalize Public object evidence does not match its authoritative Manifest.");
  }
  return { byteSize: bytes.byteLength, mimeType };
}

async function readCompletedFinalizeResult<TQueryResult extends PgQueryResultHKT>(
  db: AppDatabase<TQueryResult>,
  storage: ObjectStorage,
  actor: AdminUploadActor,
  batchId: string,
  now: Date,
): Promise<FinalizeAdminUploadResult | null> {
  await assertActiveSession(db, actor, now);
  const batch = (await db.select().from(assetUploadBatches).where(and(
    eq(assetUploadBatches.id, batchId),
    eq(assetUploadBatches.createdByUserId, actor.userId),
    eq(assetUploadBatches.authSessionId, actor.authSessionId),
    eq(assetUploadBatches.status, "completed"),
  )).limit(1))[0];
  if (!batch) return null;
  const recovery = (await db.select().from(uploadRecoveryJobs).where(and(
    eq(uploadRecoveryJobs.uploadBatchId, batch.id),
    eq(uploadRecoveryJobs.kind, "finalize"),
    eq(uploadRecoveryJobs.status, "completed"),
    eq(uploadRecoveryJobs.stage, "completed"),
    isNull(uploadRecoveryJobs.lockedBy),
    isNull(uploadRecoveryJobs.leaseExpiresAt),
  )).limit(1))[0];
  const intents = await db.select().from(uploadIntents).where(and(
    eq(uploadIntents.uploadBatchId, batch.id),
    eq(uploadIntents.kind, "admin_asset"),
  ));
  const assetIds = intents.flatMap((intent) => intent.assetId ? [intent.assetId] : []);
  if (
    !recovery ||
    intents.length !== batch.declaredFileCount ||
    assetIds.length !== intents.length ||
    intents.some((intent) =>
      intent.createdByUserId !== actor.userId ||
      intent.authSessionId !== actor.authSessionId ||
      intent.status !== "consumed" ||
      !intent.isConsumed
    )
  ) {
    throw new Error("Completed Finalize failed authoritative identity validation.");
  }
  const releasedAssets = await db.select().from(assets).where(
    eq(assets.uploadBatchId, batch.id),
  );
  const manifest = await db.select().from(finalizeObjectManifestItems).where(and(
    eq(finalizeObjectManifestItems.recoveryJobId, recovery.id),
    eq(finalizeObjectManifestItems.uploadBatchId, batch.id),
    eq(finalizeObjectManifestItems.finalizeAttempt, recovery.attemptCount),
    eq(finalizeObjectManifestItems.evidenceStatus, "verified"),
  ));
  const publicCleanup = await db.select().from(objectCleanupJobs).where(and(
    eq(objectCleanupJobs.uploadBatchId, batch.id),
    eq(objectCleanupJobs.storagePartition, "public"),
  ));
  const manifestById = new Map(manifest.map((item) => [item.id, item]));
  const manifestOriginalAssetIds = new Set(
    manifest.filter((item) => item.objectRole === "original").map((item) => item.assetId),
  );
  const identityInvalid = releasedAssets.length !== assetIds.length ||
    releasedAssets.some((asset) =>
      !assetIds.includes(asset.id) ||
      asset.storagePartition !== "public" ||
      asset.access !== "public" ||
      asset.status !== "ready" ||
      asset.scanStatus !== "passed" ||
      asset.deletedAt !== null
    ) ||
    manifestOriginalAssetIds.size !== assetIds.length ||
    assetIds.some((assetId) => !manifestOriginalAssetIds.has(assetId)) ||
    publicCleanup.length !== manifest.length ||
    manifest.some((item) =>
      !assetIds.includes(item.assetId) ||
      item.evidenceSource !== "current_finalize_storage_verified" ||
      item.evidenceVerifiedAt === null ||
      item.observedAt === null ||
      item.observedByteSize !== item.byteSize ||
      item.observedMimeType !== item.mimeType
    ) ||
    publicCleanup.some((job) => {
      const item = job.finalizeManifestItemId ? manifestById.get(job.finalizeManifestItemId) : undefined;
      return !item ||
        job.cleanupKind !== "finalize_public" ||
        job.status !== "cancelled" ||
        job.finalizeRecoveryId !== recovery.id ||
        job.finalizeAttempt !== recovery.attemptCount ||
        job.recoveryVersion !== recovery.version ||
        job.assetId !== item.assetId ||
        job.objectKey !== item.objectKey ||
        job.expectedObjectRole !== item.objectRole ||
        job.expectedMimeType !== item.mimeType ||
        job.expectedByteSize !== item.byteSize;
    });
  if (identityInvalid) {
    throw new Error("Completed Finalize failed authoritative object integrity validation.");
  }
  for (const item of manifest) await assertStoredManifestObject(storage, item);
  const privateCleanup = await db.select({ status: objectCleanupJobs.status })
    .from(objectCleanupJobs)
    .where(and(
      eq(objectCleanupJobs.uploadBatchId, batch.id),
      eq(objectCleanupJobs.storagePartition, "private"),
      inArray(objectCleanupJobs.uploadIntentId, intents.map((intent) => intent.id)),
    ));
  return successfulFinalizeResult({
    assetIds,
    batchId: batch.id,
    alreadyFinalized: true,
    privateCleanupPending: privateCleanup.some((job) => job.status !== "completed"),
  });
}

async function runFinalizePostCommitMaintenance<TQueryResult extends PgQueryResultHKT>(
  db: AppDatabase<TQueryResult>,
  storage: ObjectStorage,
  actor: AdminUploadActor,
  input: { assetIds: string[]; batchId: string; alreadyFinalized: boolean },
  options: AdminUploadOptions,
): Promise<FinalizeAdminUploadResult> {
  const auditWriter = options.auditWriter ?? writeAuditLog;
  let privateCleanupPending = false;
  let maintenanceWarning: string | undefined;
  try {
    await options.faultInjector?.("before_post_commit_cleanup");
    await processPendingObjectCleanupJobs(db, storage, {
      limit: Math.max(1, input.assetIds.length),
      workerId: `finalize-private-${input.batchId}`,
      now: options.clock?.() ?? new Date(),
      auditWriter,
    });
    await options.faultInjector?.("after_post_commit_cleanup");
    const remaining = await db.select({ status: objectCleanupJobs.status })
      .from(objectCleanupJobs)
      .where(and(
        eq(objectCleanupJobs.uploadBatchId, input.batchId),
        eq(objectCleanupJobs.storagePartition, "private"),
        inArray(objectCleanupJobs.assetId, input.assetIds),
      ));
    privateCleanupPending = remaining.some((job) => job.status !== "completed");
    if (privateCleanupPending) {
      maintenanceWarning = "Temporary file cleanup is pending and will retry in the background.";
    }
  } catch {
    privateCleanupPending = true;
    maintenanceWarning = "Temporary file cleanup is pending and will retry in the background.";
    await Promise.resolve().then(async () => {
      await options.faultInjector?.("before_post_commit_warning");
      await auditWriter(db, {
        actorUserId: actor.userId,
        action: "asset.finalize.post_commit_warning",
        entityType: "asset_upload_batch",
        entityId: input.batchId,
        afterSummary: { cleanupPending: true, warningCode: "private_cleanup_deferred" },
      });
    }).then(() => undefined, () => undefined);
  }
  return successfulFinalizeResult({
    ...input,
    privateCleanupPending,
    ...(maintenanceWarning ? { maintenanceWarning } : {}),
  });
}

async function finalizeImportPackageBatch<TQueryResult extends PgQueryResultHKT>(
  db: AppDatabase<TQueryResult>,
  actor: AdminUploadActor,
  batchId: string,
  now: Date,
  auditWriter: typeof writeAuditLog,
): Promise<FinalizeAdminUploadResult | null> {
  const rows = await db.select({
    batch: assetUploadBatches,
    asset: assets,
    intent: uploadIntents,
  }).from(assetUploadBatches)
    .innerJoin(uploadIntents, eq(uploadIntents.uploadBatchId, assetUploadBatches.id))
    .innerJoin(assets, eq(assets.id, uploadIntents.assetId))
    .where(and(
      eq(assetUploadBatches.id, batchId),
      eq(assetUploadBatches.createdByUserId, actor.userId),
      eq(assetUploadBatches.authSessionId, actor.authSessionId),
      eq(uploadIntents.kind, "admin_asset"),
    ));
  if (!rows.length || rows.some((row) => !isImportPackageMime(row.intent.declaredMimeType))) return null;
  const batch = rows[0]!.batch;
  if (rows.length !== batch.declaredFileCount || rows.some((row) =>
    row.asset.storagePartition !== "imports" ||
    row.asset.access !== "internal" ||
    row.asset.status !== "ready" ||
    row.asset.scanStatus !== "passed"
  )) {
    throw new Error("Import package Batch does not contain eligible isolated Assets.");
  }
  const assetIds = rows.map((row) => row.asset.id);
  if (batch.status === "completed") {
    if (rows.some((row) => row.intent.status !== "consumed" || !row.intent.isConsumed)) {
      throw new Error("Completed Import package identity is inconsistent.");
    }
    return {
      success: true,
      assetIds,
      assetId: assetIds[0]!,
      batchId,
      alreadyFinalized: true,
      privateCleanupPending: false,
      message: "Import package was already finalized in isolated storage.",
    };
  }
  if (batch.status !== "ready_to_finalize") throw new Error("Import package Batch is not ready to finalize.");
  await db.transaction(async (transaction) => {
    await assertActiveSession(transaction, actor, now);
    await transaction.execute(sql`select id from asset_upload_batches where id = ${batchId} for update`);
    const consumed = await transaction.update(uploadIntents).set({
      status: "consumed",
      isConsumed: true,
      usedAt: now,
      updatedAt: now,
    }).where(and(
      eq(uploadIntents.uploadBatchId, batchId),
      eq(uploadIntents.status, "passed"),
    )).returning({ id: uploadIntents.id });
    if (consumed.length !== rows.length) throw new Error("Import package Intents changed before Finalize.");
    const completed = await transaction.update(assetUploadBatches).set({
      status: "completed",
      completedAt: now,
      failureReason: null,
    }).where(and(
      eq(assetUploadBatches.id, batchId),
      eq(assetUploadBatches.status, "ready_to_finalize"),
    )).returning({ id: assetUploadBatches.id });
    if (!completed[0]) throw new Error("Import package Batch changed before Finalize.");
    await auditWriter(transaction, {
      actorUserId: actor.userId,
      action: "asset.import_package.finalized",
      entityType: "asset_upload_batch",
      entityId: batchId,
      afterSummary: { assetCount: assetIds.length, partition: "imports" },
    });
  });
  return {
    success: true,
    assetIds,
    assetId: assetIds[0]!,
    batchId,
    alreadyFinalized: false,
    privateCleanupPending: false,
    message: "Import package finalized in isolated storage.",
  };
}

export async function finalizeAdminUploadBatch<TQueryResult extends PgQueryResultHKT>(
  db: AppDatabase<TQueryResult>,
  storage: ObjectStorage,
  actor: AdminUploadActor,
  batchId: string,
  options: AdminUploadOptions = {},
): Promise<FinalizeAdminUploadResult> {
  const clock = options.clock ?? (() => new Date());
  const now = options.now ?? clock();
  await assertActiveSession(db, actor, now);
  const auditWriter = options.auditWriter ?? writeAuditLog;
  const parsedBatchId = z.uuid().parse(batchId);
  const importPackageResult = await finalizeImportPackageBatch(
    db,
    actor,
    parsedBatchId,
    now,
    auditWriter,
  );
  if (importPackageResult) return importPackageResult;
  const alreadyCompleted = await readCompletedFinalizeResult(
    db,
    storage,
    actor,
    parsedBatchId,
    now,
  );
  if (alreadyCompleted) return alreadyCompleted;
  const workerId = options.workerId ?? `finalize-${randomUUID()}`;
  const leaseMilliseconds = options.leaseMilliseconds ?? UPLOAD_RECOVERY_LEASE_MILLISECONDS;
  const leaseExpiresAt = new Date(now.getTime() + leaseMilliseconds);
  const claimFinalize = () => db.transaction(async (transaction) => {
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
    let recovery: { id: string; version: number; attemptCount: number } | undefined;
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
      )).returning({
        id: uploadRecoveryJobs.id,
        version: uploadRecoveryJobs.version,
        attemptCount: uploadRecoveryJobs.attemptCount,
      }))[0];
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
      }).returning({
        id: uploadRecoveryJobs.id,
        version: uploadRecoveryJobs.version,
        attemptCount: uploadRecoveryJobs.attemptCount,
      }))[0];
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
        attemptCount: recovery.attemptCount,
        leaseExpiresAt,
      } satisfies UploadRecoveryLease,
    };
  });
  let claim: Awaited<ReturnType<typeof claimFinalize>>;
  try {
    claim = await claimFinalize();
  } catch (error) {
    const completedDuringClaim = await readCompletedFinalizeResult(
      db,
      storage,
      actor,
      parsedBatchId,
      clock(),
    );
    if (completedDuringClaim) return completedDuringClaim;
    throw error;
  }
  const batch = claim.batch;
  let recoveryLease = claim.recoveryLease;
  const heartbeatIntervalMilliseconds = Math.max(
    10,
    Math.min(Math.floor(leaseMilliseconds / 3), 30_000),
  );
  const runWithFinalizeHeartbeat = async <T>(operation: () => Promise<T>): Promise<T> => {
    let pulse: Promise<void> | null = null;
    let heartbeatFailure: unknown;
    const timer = setInterval(() => {
      if (pulse || heartbeatFailure) return;
      pulse = heartbeatFinalizeLease(
        db,
        recoveryLease,
        clock(),
        leaseMilliseconds,
      ).then((renewed) => {
        recoveryLease = renewed;
      }).catch((error: unknown) => {
        heartbeatFailure = error;
      }).finally(() => {
        pulse = null;
      });
    }, heartbeatIntervalMilliseconds);
    try {
      const result = await operation();
      if (pulse) await pulse;
      if (heartbeatFailure) throw heartbeatFailure;
      return result;
    } finally {
      clearInterval(timer);
    }
  };
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
    const stagingRecoveries = await db.select().from(uploadRecoveryJobs).where(and(
      eq(uploadRecoveryJobs.kind, "staging"),
      eq(uploadRecoveryJobs.uploadBatchId, batch.id),
      inArray(uploadRecoveryJobs.uploadIntentId, intents.map((intent) => intent.id)),
      eq(uploadRecoveryJobs.status, "completed"),
    ));
    if (stagingRecoveries.length !== intents.length) {
      throw new Error("Admin Upload Batch staging recovery identity is incomplete.");
    }
    const source = batch.sourceDeclarationEnabled
      ? (batch.declarationInput as AdminSourceDeclarationInput | null) ?? {}
      : null;
    if (source?.subjectRelationship) sourceSubjectSchema.parse(source.subjectRelationship);
    if (source?.publicUsePermission) permissionSchema.parse(source.publicUsePermission);
    if (source?.editingPermission) permissionSchema.parse(source.editingPermission);
    const copies: {
      assetId: string;
      objectKey: string;
      originalBytes: Uint8Array;
      originalMimeType: string;
      variants: {
        logicalKey: string;
        objectKey: string;
        format: AssetVariantFormat;
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
        clock(),
        leaseMilliseconds,
      );
      const bytes = await runWithFinalizeHeartbeat(
        () => storage.get("private", asset.objectKey),
      );
      recoveryLease = await heartbeatFinalizeLease(
        db,
        recoveryLease,
        clock(),
        leaseMilliseconds,
      );
      recoveryLease = await advanceUploadRecoveryStage(
        db,
        recoveryLease,
        "variants_processing",
        clock(),
        leaseMilliseconds,
      );
      const variants = asset.detectedMimeType?.startsWith("image/")
        ? (await runWithFinalizeHeartbeat(() => createImageDerivatives(bytes))).map((variant) => ({
            logicalKey: variant.key,
            objectKey: createAssetVariantObjectKey(
              asset.objectKey,
              variant.key,
              variant.format,
            ),
            format: variant.format,
            bytes: variant.bytes,
            width: variant.width,
            height: variant.height,
          }))
        : [];
      recoveryLease = await heartbeatFinalizeLease(
        db,
        recoveryLease,
        clock(),
        leaseMilliseconds,
      );
      copies.push({
        assetId: asset.id,
        objectKey: asset.objectKey,
        originalBytes: bytes,
        originalMimeType: asset.detectedMimeType ?? asset.declaredMimeType,
        variants,
      });
    }
    const manifest: FinalizeManifestItem[] = copies.flatMap((copy) => [
      {
        assetId: copy.assetId,
        objectKey: copy.objectKey,
        role: "original" as const,
        mimeType: copy.originalMimeType,
        byteSize: copy.originalBytes.byteLength,
      },
      ...copy.variants.map((variant) => ({
        assetId: copy.assetId,
        objectKey: variant.objectKey,
        role: "variant" as const,
        mimeType: `image/${variant.format}`,
        byteSize: variant.bytes.byteLength,
      })),
    ]);
    recoveryLease = await registerFinalizeManifest(
      db,
      recoveryLease,
      batch.id,
      manifest,
      { auditWriter, now: clock(), leaseMilliseconds },
    );
    await options.faultInjector?.("after_finalize_manifest_registered");
    let variantWriteCount = 0;
    for (const copy of copies) {
      recoveryLease = await heartbeatFinalizeLease(db, recoveryLease, clock(), leaseMilliseconds);
      await runWithFinalizeHeartbeat(() => storage.put(
        "public",
        copy.objectKey,
        copy.originalBytes,
        copy.originalMimeType,
      ));
      recoveryLease = await markFinalizeObjectWritten(
        db,
        recoveryLease,
        copy.objectKey,
        "original_written",
        clock(),
        leaseMilliseconds,
      );
      await options.faultInjector?.("after_finalize_original_written");
      for (const variant of copy.variants) {
        recoveryLease = await heartbeatFinalizeLease(db, recoveryLease, clock(), leaseMilliseconds);
        await runWithFinalizeHeartbeat(() => storage.put(
          "public",
          variant.objectKey,
          variant.bytes,
          `image/${variant.format}`,
        ));
        recoveryLease = await markFinalizeObjectWritten(
          db,
          recoveryLease,
          variant.objectKey,
          "variants_processing",
          clock(),
          leaseMilliseconds,
        );
        variantWriteCount += 1;
        if (variantWriteCount === 1) {
          await options.faultInjector?.("after_finalize_first_variant_written");
        }
      }
      recoveryLease = await advanceUploadRecoveryStage(
        db,
        recoveryLease,
        "variants_written",
        clock(),
        leaseMilliseconds,
      );
    }
    recoveryLease = await advanceUploadRecoveryStage(
      db,
      recoveryLease,
      "database_finalizing",
      clock(),
      leaseMilliseconds,
    );
    const objectEvidence = new Map<string, { byteSize: number; mimeType: string }>();
    for (const item of manifest) {
      objectEvidence.set(item.objectKey, await runWithFinalizeHeartbeat(
        () => assertStoredManifestObject(storage, item),
      ));
      recoveryLease = await heartbeatFinalizeLease(db, recoveryLease, clock(), leaseMilliseconds);
    }
    await options.faultInjector?.("before_finalize_publish_transaction");
    await db.transaction(async (transaction) => {
      const preflightTime = clock();
      await transaction.execute(sql`
        select id from asset_upload_batches where id = ${batch.id} for update
      `);
      await transaction.execute(sql`
        select id from upload_recovery_jobs where id = ${recoveryLease.id} for update
      `);
      await transaction.execute(sql`
        select id from finalize_object_manifest_items
        where recovery_job_id = ${recoveryLease.id}
          and finalize_attempt = ${recoveryLease.attemptCount}
        order by id for update
      `);
      await transaction.execute(sql`
        select id from object_cleanup_jobs
        where upload_batch_id = ${batch.id} and storage_partition = 'public'
        order by id for update
      `);
      await assertActiveSession(transaction, actor, preflightTime);
      const current = (await transaction.select().from(assetUploadBatches).where(and(
        eq(assetUploadBatches.id, batch.id), eq(assetUploadBatches.status, "finalizing"),
        eq(assetUploadBatches.createdByUserId, actor.userId), eq(assetUploadBatches.authSessionId, actor.authSessionId),
      )).limit(1))[0];
      if (!current) throw new Error("Admin Upload Batch changed before finalization.");
      const preflightLease = (await transaction.select({ id: uploadRecoveryJobs.id })
        .from(uploadRecoveryJobs)
        .where(and(
          eq(uploadRecoveryJobs.id, recoveryLease.id),
          eq(uploadRecoveryJobs.kind, "finalize"),
          eq(uploadRecoveryJobs.status, "processing"),
          eq(uploadRecoveryJobs.lockedBy, recoveryLease.workerId),
          eq(uploadRecoveryJobs.version, recoveryLease.version),
          gt(uploadRecoveryJobs.leaseExpiresAt, preflightTime),
        )).limit(1))[0];
      if (!preflightLease) throw new Error("Finalize lease or version changed before commit.");
      const persistedManifest = await transaction.select()
        .from(finalizeObjectManifestItems)
        .where(and(
          eq(finalizeObjectManifestItems.recoveryJobId, recoveryLease.id),
          eq(finalizeObjectManifestItems.uploadBatchId, batch.id),
          eq(finalizeObjectManifestItems.finalizeAttempt, recoveryLease.attemptCount),
        ));
      const commitObjectEvidence = new Map<string, { byteSize: number; mimeType: string }>();
      for (const item of persistedManifest) {
        commitObjectEvidence.set(
          item.objectKey,
          await assertStoredManifestObject(storage, item),
        );
      }
      const commitTime = clock();
      await assertActiveSession(transaction, actor, commitTime);
      const commitLease = (await transaction.select({ id: uploadRecoveryJobs.id })
        .from(uploadRecoveryJobs)
        .where(and(
          eq(uploadRecoveryJobs.id, recoveryLease.id),
          eq(uploadRecoveryJobs.kind, "finalize"),
          eq(uploadRecoveryJobs.status, "processing"),
          eq(uploadRecoveryJobs.lockedBy, recoveryLease.workerId),
          eq(uploadRecoveryJobs.version, recoveryLease.version),
          gt(uploadRecoveryJobs.leaseExpiresAt, commitTime),
        )).limit(1))[0];
      if (!commitLease) throw new Error("Finalize lease expired during the publication preflight.");
      const compensationJobs = await transaction.select().from(objectCleanupJobs).where(and(
        eq(objectCleanupJobs.uploadBatchId, batch.id),
        eq(objectCleanupJobs.storagePartition, "public"),
        eq(objectCleanupJobs.finalizeRecoveryId, recoveryLease.id),
        eq(objectCleanupJobs.finalizeAttempt, recoveryLease.attemptCount),
      ));
      const expectedByKey = new Map(manifest.map((item) => [item.objectKey, item]));
      const persistedManifestMismatch = persistedManifest.length !== manifest.length || persistedManifest.some((item) => {
        const expected = expectedByKey.get(item.objectKey);
        return !expected ||
          item.assetId !== expected.assetId ||
          item.objectRole !== expected.role ||
          item.mimeType !== expected.mimeType ||
          item.byteSize !== expected.byteSize ||
          item.writeCompletedAt === null ||
          item.evidenceStatus !== "written" ||
          item.evidenceSource !== "current_finalize_storage_put" ||
          item.observedByteSize !== expected.byteSize ||
          item.observedMimeType !== expected.mimeType ||
          item.observedAt === null;
      });
      const manifestMismatch = persistedManifestMismatch ||
        compensationJobs.length !== persistedManifest.length || compensationJobs.some((job) => {
        const expected = expectedByKey.get(job.objectKey);
          return !expected ||
          job.finalizeRecoveryId !== recoveryLease.id ||
          job.cleanupKind !== "finalize_public" ||
          job.recoveryVersion === null ||
          job.finalizeAttempt !== recoveryLease.attemptCount ||
          job.finalizeManifestItemId !== persistedManifest.find((item) => item.objectKey === job.objectKey)?.id ||
          job.assetId !== expected.assetId ||
          job.expectedObjectRole !== expected.role ||
          job.expectedMimeType !== expected.mimeType ||
          job.expectedByteSize !== expected.byteSize ||
          job.status !== "standby" ||
          job.armedAt !== null ||
          job.lockedBy !== null ||
          job.completedAt !== null ||
          job.writeCompletedAt === null ||
          objectEvidence.get(job.objectKey)?.byteSize !== expected.byteSize ||
          objectEvidence.get(job.objectKey)?.mimeType !== expected.mimeType ||
          commitObjectEvidence.get(job.objectKey)?.byteSize !== expected.byteSize ||
          commitObjectEvidence.get(job.objectKey)?.mimeType !== expected.mimeType;
      });
      if (manifestMismatch) {
        throw new Error("Finalize Compensation state or Object Manifest failed closed.");
      }
      const verifiedEvidence = await transaction.update(finalizeObjectManifestItems).set({
        evidenceStatus: "verified",
        evidenceSource: "current_finalize_storage_verified",
        evidenceVerifiedAt: commitTime,
        observedAt: commitTime,
        updatedAt: commitTime,
      }).where(and(
        eq(finalizeObjectManifestItems.recoveryJobId, recoveryLease.id),
        eq(finalizeObjectManifestItems.uploadBatchId, batch.id),
        eq(finalizeObjectManifestItems.finalizeAttempt, recoveryLease.attemptCount),
        eq(finalizeObjectManifestItems.evidenceStatus, "written"),
      )).returning({ id: finalizeObjectManifestItems.id });
      if (verifiedEvidence.length !== manifest.length) {
        throw new Error("Finalize storage evidence could not be verified atomically.");
      }
      await auditWriter(transaction, {
        actorUserId: actor.userId,
        action: "asset.finalize.storage_evidence_verified",
        entityType: "asset_upload_batch",
        entityId: batch.id,
        afterSummary: { recoveryJobId: recoveryLease.id, objectCount: manifest.length },
      });
      for (const intent of intents) {
        const asset = staged.find((candidate) => candidate.id === intent.assetId)!;
        const copy = copies.find((candidate) => candidate.objectKey === asset.objectKey)!;
        const stagingRecovery = stagingRecoveries.find((candidate) => candidate.uploadIntentId === intent.id);
        if (!stagingRecovery) throw new Error("Staging Recovery identity changed before Finalize commit.");
        await assertAssociationTarget(transaction, actor, intent.associationType ? associationTypeSchema.parse(intent.associationType) : null, intent.associationEntityId);
        if (!isRoleMimeCompatible(intent.adminAssetRole!, asset.detectedMimeType)) throw new Error("Asset role is incompatible with detected MIME type.");
        const releasedAsset = await transaction.update(assets).set({
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
        )).returning({ id: assets.id });
        if (!releasedAsset[0]) throw new Error("Staged Asset changed before Public release.");
        if (copy.variants.length) await transaction.insert(assetVariants).values(copy.variants.map((variant) => ({
          sourceAssetId: asset.id, format: variant.format, variantKey: variant.logicalKey,
          objectKey: variant.objectKey, byteSize: variant.bytes.byteLength, width: variant.width, height: variant.height,
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
          uploadIntentId: intent.id,
          assetId: asset.id,
          storagePartition: "private",
          objectKey: asset.objectKey,
          reason: "finalize_private_staging_released",
          cleanupKind: "finalize_private",
          status: "pending",
          recoveryVersion: stagingRecovery.version,
          expectedObjectRole: intent.adminAssetRole,
          expectedMimeType: asset.detectedMimeType ?? asset.declaredMimeType,
          expectedByteSize: asset.byteSize,
          nextAttemptAt: commitTime,
        }).onConflictDoUpdate({
          target: [objectCleanupJobs.storagePartition, objectCleanupJobs.objectKey],
          set: {
            uploadBatchId: batch.id,
            uploadIntentId: intent.id,
            assetId: asset.id,
            reason: "finalize_private_staging_released",
            cleanupKind: "finalize_private",
            status: "pending",
            recoveryVersion: stagingRecovery.version,
            expectedObjectRole: intent.adminAssetRole,
            expectedMimeType: asset.detectedMimeType ?? asset.declaredMimeType,
            expectedByteSize: asset.byteSize,
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
      const cancelledCleanup = await transaction.update(objectCleanupJobs).set({
        status: "cancelled",
        lockedBy: null,
        lockedAt: null,
        leaseExpiresAt: null,
        updatedAt: commitTime,
      }).where(and(
        eq(objectCleanupJobs.uploadBatchId, batch.id),
        eq(objectCleanupJobs.storagePartition, "public"),
        eq(objectCleanupJobs.finalizeRecoveryId, recoveryLease.id),
        eq(objectCleanupJobs.finalizeAttempt, recoveryLease.attemptCount),
        eq(objectCleanupJobs.status, "standby"),
        isNull(objectCleanupJobs.armedAt),
      )).returning({ id: objectCleanupJobs.id });
      if (cancelledCleanup.length !== manifest.length) {
        throw new Error("Finalize Compensation Manifest could not be cancelled atomically.");
      }
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
      )).returning({ id: uploadRecoveryJobs.id, version: uploadRecoveryJobs.version });
      if (!completedRecovery[0]) throw new Error("Finalize lease or version changed before completion.");
      await transaction.update(objectCleanupJobs).set({
        recoveryVersion: completedRecovery[0].version,
        updatedAt: commitTime,
      }).where(inArray(
        objectCleanupJobs.id,
        cancelledCleanup.map((job) => job.id),
      ));
      const completedBatch = await transaction.update(assetUploadBatches).set({ status: "completed", completedAt: commitTime, failureReason: null }).where(and(
        eq(assetUploadBatches.id, batch.id),
        eq(assetUploadBatches.status, "finalizing"),
      )).returning({ id: assetUploadBatches.id });
      if (!completedBatch[0]) throw new Error("Upload Batch changed before Finalize completion.");
      await options.faultInjector?.("before_finalize_publish_commit");
      await auditWriter(transaction, { actorUserId: actor.userId, action: "asset.upload_batch.completed", entityType: "asset_upload_batch", entityId: batch.id, afterSummary: { fileCount: intents.length, sourceDeclarationEnabled: batch.sourceDeclarationEnabled } });
    });
  } catch (error) {
    const completedDuringCoreFailure = await readCompletedFinalizeResult(
      db,
      storage,
      actor,
      batch.id,
      clock(),
    );
    if (completedDuringCoreFailure) return completedDuringCoreFailure;
    const recoveryState = await markFinalizeRecoveryRequired(
      db,
      recoveryLease,
      batch.id,
      error,
      { auditWriter, now: clock() },
    );
    if (recoveryState === "cleanup_required") {
      await processPendingObjectCleanupJobs(db, storage, {
        limit: Math.max(1, staged.length * 8),
        workerId: `finalize-compensation-${batch.id}`,
        now: clock(),
        auditWriter,
      });
    }
    throw error;
  }
  return runFinalizePostCommitMaintenance(db, storage, actor, {
    assetIds: staged.map((asset) => asset.id),
    batchId: batch.id,
    alreadyFinalized: false,
  }, options);
}
