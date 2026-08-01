import { createHash, randomBytes } from "node:crypto";
import { and, count, eq, gt, isNull } from "drizzle-orm";
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
  productAssets,
  products,
  uploadIntents,
} from "@/db/schema";
import type { AppDatabase } from "@/db/types";
import type { ObjectStorage } from "@/storage";

import { isRoleMimeCompatible } from "./asset-eligibility";
import { acceptedPublicMimeTypes } from "./file-validation";
import { createImageDerivatives } from "./image-derivatives";
import { createUploadRateLimiter, type UploadRateLimiter } from "./rate-limit";
import type { FileScanner } from "./scanner";
import { uploadAsset } from "./service";

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
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function cleanOptional(value: string | null | undefined): string | null {
  return value?.trim() || null;
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
  const claimed = (await db.update(uploadIntents).set({ status: "uploading", updatedAt: now }).where(and(
    eq(uploadIntents.tokenHash, hashToken(input.token)),
    eq(uploadIntents.kind, "admin_asset"),
    eq(uploadIntents.createdByUserId, actor.userId),
    eq(uploadIntents.authSessionId, actor.authSessionId),
    eq(uploadIntents.status, "created"),
    gt(uploadIntents.expiresAt, now),
  )).returning())[0];
  if (!claimed?.uploadBatchId || !claimed.adminAssetCategory || !claimed.adminAssetRole) {
    throw new Error("Admin Upload Intent is invalid, expired, or already used.");
  }
  if (input.bytes.byteLength !== claimed.declaredByteSize) {
    const auditWriter = options.auditWriter ?? writeAuditLog;
    await db.transaction(async (transaction) => {
      await transaction.update(uploadIntents).set({ status: "failed", failureReason: "declared_size_mismatch", updatedAt: now }).where(eq(uploadIntents.id, claimed.id));
      await transaction.update(assetUploadBatches).set({ status: "failed", failureReason: "declared_size_mismatch" }).where(eq(assetUploadBatches.id, claimed.uploadBatchId!));
      await auditWriter(transaction, { actorUserId: actor.userId, action: "asset.upload_batch.failed", entityType: "asset_upload_batch", entityId: claimed.uploadBatchId, afterSummary: { reason: "declared_size_mismatch" } });
    });
    throw new Error("Uploaded size does not match the Admin Upload Intent.");
  }
  try {
    const assetId = await uploadAsset(db, storage, scanner, {
      fileName: claimed.declaredFileName,
      declaredMimeType: claimed.declaredMimeType,
      bytes: input.bytes,
      category: claimed.adminAssetCategory,
      purpose: "admin_asset_staging",
      uploadedByUserId: actor.userId,
      uploadBatchId: claimed.uploadBatchId,
      uploadIntentId: claimed.id,
      sourceDeclarationEnabled: false,
      retentionExpiresAt: claimed.expiresAt,
    });
    const auditWriter = options.auditWriter ?? writeAuditLog;
    await db.transaction(async (transaction) => {
      await transaction.update(uploadIntents).set({ assetId, status: "passed", failureReason: null, updatedAt: new Date() }).where(eq(uploadIntents.id, claimed.id));
      const totals = (await transaction.select({ value: count() }).from(uploadIntents).where(and(
        eq(uploadIntents.uploadBatchId, claimed.uploadBatchId!), eq(uploadIntents.status, "passed"),
      )))[0];
      const passed = Number(totals?.value ?? 0);
      await transaction.update(assetUploadBatches).set({
        completedFileCount: passed,
        status: passed >= (await transaction.select({ value: assetUploadBatches.declaredFileCount }).from(assetUploadBatches).where(eq(assetUploadBatches.id, claimed.uploadBatchId!)).limit(1))[0]!.value
          ? "ready_to_finalize" : "uploading",
        failureReason: null,
      }).where(eq(assetUploadBatches.id, claimed.uploadBatchId!));
      await auditWriter(transaction, {
        actorUserId: actor.userId, action: "asset.upload.staged", entityType: "asset", entityId: assetId,
        afterSummary: { uploadBatchId: claimed.uploadBatchId },
      });
    });
    return assetId;
  } catch (error) {
    const auditWriter = options.auditWriter ?? writeAuditLog;
    await db.transaction(async (transaction) => {
      await transaction.update(uploadIntents).set({ status: "failed", failureReason: "upload_failed", updatedAt: new Date() }).where(eq(uploadIntents.id, claimed.id));
      await transaction.update(assetUploadBatches).set({ status: "failed", failureReason: "upload_failed" }).where(eq(assetUploadBatches.id, claimed.uploadBatchId!));
      await auditWriter(transaction, { actorUserId: actor.userId, action: "asset.upload_batch.failed", entityType: "asset_upload_batch", entityId: claimed.uploadBatchId, afterSummary: { reason: "upload_failed" } });
    });
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
  const batch = (await db.select().from(assetUploadBatches).where(and(
    eq(assetUploadBatches.id, z.uuid().parse(batchId)),
    eq(assetUploadBatches.createdByUserId, actor.userId),
    eq(assetUploadBatches.authSessionId, actor.authSessionId),
    eq(assetUploadBatches.status, "ready_to_finalize"),
    gt(assetUploadBatches.expiresAt, now),
  )).limit(1))[0];
  if (!batch) throw new Error("Admin Upload Batch is unavailable, incomplete, expired, or already finalized.");
  const intents = await db.select().from(uploadIntents).where(and(
    eq(uploadIntents.uploadBatchId, batch.id),
    eq(uploadIntents.kind, "admin_asset"),
    eq(uploadIntents.status, "passed"),
  ));
  if (intents.length !== batch.declaredFileCount || intents.some((intent) => !intent.assetId || !intent.adminAssetRole)) {
    throw new Error("Admin Upload Batch is incomplete.");
  }
  const staged = await db.select().from(assets).where(eq(assets.uploadBatchId, batch.id));
  if (staged.length !== intents.length || staged.some((asset) => asset.storagePartition !== "private" || asset.access !== "internal" || asset.status !== "ready" || asset.scanStatus !== "passed")) {
    throw new Error("Admin Upload Batch does not contain eligible staged Assets.");
  }
  const source = batch.sourceDeclarationEnabled
    ? (batch.declarationInput as AdminSourceDeclarationInput | null) ?? {}
    : null;
  if (source?.subjectRelationship) sourceSubjectSchema.parse(source.subjectRelationship);
  if (source?.publicUsePermission) permissionSchema.parse(source.publicUsePermission);
  if (source?.editingPermission) permissionSchema.parse(source.editingPermission);
  const copies: { objectKey: string; variants: { key: string; format: string; bytes: Uint8Array; width: number; height: number }[] }[] = [];
  try {
    for (const asset of staged) {
      const bytes = await storage.get("private", asset.objectKey);
      await storage.put("public", asset.objectKey, bytes, asset.detectedMimeType ?? asset.declaredMimeType);
      const variants = asset.detectedMimeType?.startsWith("image/")
        ? (await createImageDerivatives(bytes)).map((variant) => ({
            key: `${asset.objectKey}.variants/${variant.key}.${variant.format}`,
            format: variant.format,
            bytes: variant.bytes,
            width: variant.width,
            height: variant.height,
          }))
        : [];
      for (const variant of variants) await storage.put("public", variant.key, variant.bytes, `image/${variant.format}`);
      copies.push({ objectKey: asset.objectKey, variants });
    }
    const auditWriter = options.auditWriter ?? writeAuditLog;
    await db.transaction(async (transaction) => {
      await assertActiveSession(transaction, actor, now);
      const current = (await transaction.select().from(assetUploadBatches).where(and(
        eq(assetUploadBatches.id, batch.id), eq(assetUploadBatches.status, "ready_to_finalize"),
        eq(assetUploadBatches.createdByUserId, actor.userId), eq(assetUploadBatches.authSessionId, actor.authSessionId),
      )).limit(1))[0];
      if (!current) throw new Error("Admin Upload Batch changed before finalization.");
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
          updatedAt: now,
        }).where(eq(assets.id, asset.id));
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
        await transaction.update(uploadIntents).set({ status: "consumed", isConsumed: true, usedAt: now, updatedAt: now }).where(and(eq(uploadIntents.id, intent.id), eq(uploadIntents.status, "passed")));
        await auditWriter(transaction, { actorUserId: actor.userId, action: "asset.released_public", entityType: "asset", entityId: asset.id, afterSummary: { uploadBatchId: batch.id, associationType: intent.associationType } });
      }
      await transaction.update(assetUploadBatches).set({ status: "completed", completedAt: now, failureReason: null }).where(eq(assetUploadBatches.id, batch.id));
      await auditWriter(transaction, { actorUserId: actor.userId, action: "asset.upload_batch.completed", entityType: "asset_upload_batch", entityId: batch.id, afterSummary: { fileCount: intents.length, sourceDeclarationEnabled: batch.sourceDeclarationEnabled } });
    });
  } catch (error) {
    for (const copy of copies) {
      await storage.delete("public", copy.objectKey);
      for (const variant of copy.variants) await storage.delete("public", variant.key);
    }
    throw error;
  }
  for (const asset of staged) await storage.delete("private", asset.objectKey);
  return { assetIds: staged.map((asset) => asset.id) };
}
