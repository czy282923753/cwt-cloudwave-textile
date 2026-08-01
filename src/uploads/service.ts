import { createHash, randomUUID } from "node:crypto";
import { and, eq, inArray } from "drizzle-orm";
import type { PgQueryResultHKT } from "drizzle-orm/pg-core/session";

import { writeAuditLog } from "@/audit/service";
import { hasPermission, type UserRole } from "@/auth/permissions";
import { env } from "@/config/env";
import {
  assets,
  assetVariants,
  inquiryAssets,
  objectCleanupJobs,
  uploadIntents,
} from "@/db/schema";
import type { AppDatabase } from "@/db/types";
import type { ObjectStorage, StoragePartition } from "@/storage";

import { validateUploadedFile, inferNonBlockingRiskHints } from "./file-validation";
import { createImageDerivatives } from "./image-derivatives";
import { processPendingObjectCleanupJobs } from "./object-cleanup-service";
import type { FileScanner } from "./scanner";

type AssetCategory = typeof assets.$inferInsert.category;

export interface UploadAssetInput {
  fileName: string;
  declaredMimeType: string;
  bytes: Uint8Array;
  category: AssetCategory;
  purpose: "public_asset" | "admin_asset_staging" | "inquiry" | "import";
  uploadedByUserId?: string | null;
  uploadBatchId?: string | null;
  sourceDeclarationEnabled?: boolean;
  retentionExpiresAt?: Date | null;
  /** Internal Upload Intent linkage; never accepted from a public form. */
  uploadIntentId?: string | null;
}

function fileExtension(mimeType: string): string {
  const extensions: Readonly<Record<string, string>> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/avif": "avif",
    "application/pdf": "pdf",
  };
  const extension = extensions[mimeType];
  if (!extension) throw new Error("No safe extension exists for this MIME type.");
  return extension;
}

function targetForPurpose(purpose: UploadAssetInput["purpose"]): {
  partition: StoragePartition;
  access: typeof assets.$inferInsert.access;
} {
  if (purpose === "public_asset") return { partition: "public", access: "public" };
  if (purpose === "import") return { partition: "imports", access: "internal" };
  if (purpose === "admin_asset_staging") return { partition: "private", access: "internal" };
  return { partition: "private", access: "private" };
}

export async function uploadAsset<TQueryResult extends PgQueryResultHKT>(
  db: AppDatabase<TQueryResult>,
  storage: ObjectStorage,
  scanner: FileScanner,
  input: UploadAssetInput,
): Promise<string> {
  if (input.purpose === "inquiry" && input.category !== "inquiry") {
    throw new Error("Inquiry files must use the inquiry asset category.");
  }
  if (input.purpose !== "inquiry" && input.category === "inquiry") {
    throw new Error("Inquiry assets cannot enter public or import upload flows.");
  }

  const maximumBytes =
    input.purpose === "inquiry"
      ? env.MAX_INQUIRY_FILE_BYTES
      : env.MAX_PUBLIC_FILE_BYTES;
  const validated = await validateUploadedFile({
    bytes: input.bytes,
    declaredMimeType: input.declaredMimeType,
    maximumBytes,
    purpose: input.purpose,
  });
  const extension = fileExtension(validated.detectedMimeType);
  const datePrefix = new Date().toISOString().slice(0, 10).replaceAll("-", "/");
  const identifier = randomUUID();
  const quarantineKey = `quarantine/${datePrefix}/${identifier}.${extension}`;
  const target = targetForPurpose(input.purpose);
  const objectKey = `${datePrefix}/${identifier}.${extension}`;
  const sha256 = createHash("sha256").update(input.bytes).digest("hex");

  const asset = await db.transaction(async (transaction) => {
    const inserted = await transaction
      .insert(assets)
      .values({
        uploadBatchId: input.uploadBatchId ?? null,
        uploadedByUserId: input.uploadedByUserId ?? null,
        originalFileName: input.fileName,
        storageProvider: env.STORAGE_DRIVER,
        storagePartition: "private",
        objectKey: quarantineKey,
        access: "internal",
        category: input.category,
        status: "scanning",
        declaredMimeType: input.declaredMimeType,
        detectedMimeType: validated.detectedMimeType,
        byteSize: input.bytes.byteLength,
        sha256,
        width: validated.width,
        height: validated.height,
        sourceDeclarationEnabled: input.sourceDeclarationEnabled ?? false,
        nonBlockingRiskHints: inferNonBlockingRiskHints(input.fileName),
        retentionExpiresAt: input.retentionExpiresAt ?? null,
      })
      .returning({ id: assets.id });
    const created = inserted[0];
    if (!created) throw new Error("Asset insert did not return an ID.");
    if (input.uploadIntentId) {
      const linked = await transaction
        .update(uploadIntents)
        .set({ assetId: created.id, updatedAt: new Date() })
        .where(
          and(
            eq(uploadIntents.id, input.uploadIntentId),
            eq(uploadIntents.status, "uploading"),
          ),
        )
        .returning({ id: uploadIntents.id });
      if (!linked[0]) {
        throw new Error("Upload Intent could not be linked to its quarantined Asset.");
      }
    }
    return created;
  });
  if (!asset) throw new Error("Asset insert did not return an ID.");

  try {
    await storage.put(
      "private",
      quarantineKey,
      input.bytes,
      validated.detectedMimeType,
    );
  } catch (error) {
    await db
      .update(assets)
      .set({
        status: "quarantined",
        scanStatus: "error",
        scanResult: "quarantine_storage_error",
        updatedAt: new Date(),
      })
      .where(eq(assets.id, asset.id));
    throw error;
  }

  let scanResult;
  try {
    scanResult = await scanner.scan(input.bytes, input.fileName);
  } catch (error) {
    await db
      .update(assets)
      .set({
        status: "quarantined",
        scanStatus: "error",
        scanResult: "scanner_error",
      })
      .where(eq(assets.id, asset.id));
    throw error;
  }

  if (!scanResult.clean) {
    await db
      .update(assets)
      .set({
        status: "rejected",
        scanStatus: "failed",
        scanProvider: scanResult.provider,
        scanResult: scanResult.reference,
        scanCompletedAt: new Date(),
      })
      .where(eq(assets.id, asset.id));
    throw new Error("File was rejected by malware scanning.");
  }

  await storage.put(target.partition, objectKey, input.bytes, validated.detectedMimeType);
  const isImage = validated.detectedMimeType.startsWith("image/");
  if (target.partition === "public" && isImage) {
    const derivatives = await createImageDerivatives(input.bytes);
    for (const derivative of derivatives) {
      const derivativeObjectKey = `${datePrefix}/${identifier}/${derivative.key}.${derivative.format}`;
      await storage.put(
        "public",
        derivativeObjectKey,
        derivative.bytes,
        `image/${derivative.format}`,
      );
      await db.insert(assetVariants).values({
        sourceAssetId: asset.id,
        format: derivative.format,
        variantKey: derivative.key,
        objectKey: derivativeObjectKey,
        byteSize: derivative.bytes.byteLength,
        width: derivative.width,
        height: derivative.height,
      });
    }
  }

  await db
    .update(assets)
    .set({
      storagePartition: target.partition,
      objectKey,
      access: target.access,
      status: "ready",
      scanStatus: "passed",
      scanProvider: scanResult.provider,
      scanResult: scanResult.reference,
      scanCompletedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(assets.id, asset.id));
  await storage.delete("private", quarantineKey);

  return asset.id;
}

export interface SourceDeclarationUpdate {
  expectedVersion: number;
  enabled: boolean;
  sourceType?: string | null;
  sourceProvider?: string | null;
  rightsStatus?: string | null;
  subjectRelationship?: typeof assets.$inferInsert.subjectRelationship;
  publicUsePermission?: typeof assets.$inferInsert.publicUsePermission;
  editingPermission?: typeof assets.$inferInsert.editingPermission;
  usageRestrictions?: string | null;
  permissionEvidence?: string | null;
  declarationExpiryDate?: Date | null;
  isCwtOwnedFacility?: boolean | null;
}

type RightsDecision = "allowed" | "restricted" | "not_allowed" | "revoked";

interface DeclarationOperationOptions {
  auditWriter?: typeof writeAuditLog;
}

export async function updateSourceDeclaration<TQueryResult extends PgQueryResultHKT>(
  db: AppDatabase<TQueryResult>,
  assetId: string,
  actor: { userId: string; role: UserRole },
  update: SourceDeclarationUpdate,
  options: DeclarationOperationOptions = {},
): Promise<void> {
  if (!hasPermission(actor.role, "assets.write")) {
    throw new Error("Source Declaration changes require Asset writer authority.");
  }
  if (!Number.isInteger(update.expectedVersion) || update.expectedVersion < 0) {
    throw new Error("Source Declaration expected version is invalid.");
  }
  const auditWriter = options.auditWriter ?? writeAuditLog;
  await db.transaction(async (transaction) => {
    const beforeRows = await transaction
      .select()
      .from(assets)
      .where(eq(assets.id, assetId))
      .limit(1);
    const before = beforeRows[0];
    if (!before) throw new Error("Asset was not found.");
    if (before.declarationRecordVersion !== update.expectedVersion) {
      throw new Error("Source Declaration changed; reload before saving.");
    }
    const substantiveFields = [
      "sourceType",
      "sourceProvider",
      "rightsStatus",
      "subjectRelationship",
      "publicUsePermission",
      "editingPermission",
      "usageRestrictions",
      "permissionEvidence",
      "declarationExpiryDate",
      "isCwtOwnedFacility",
    ] as const;
    const declarationContentChanged = update.enabled &&
      (before.declarationStatementVersion === 0 ||
        substantiveFields.some(
          (field) =>
            field in update &&
            String(update[field] ?? null) !== String(before[field] ?? null),
        ));
    const nextVersion = declarationContentChanged
      ? before.declarationStatementVersion + 1
      : before.declarationStatementVersion;
    const updatedRows = await transaction
      .update(assets)
      .set({
        sourceDeclarationEnabled: update.enabled,
        ...(update.enabled
          ? {
              sourceType: "sourceType" in update ? update.sourceType ?? null : before.sourceType,
              sourceProvider: "sourceProvider" in update ? update.sourceProvider ?? null : before.sourceProvider,
              rightsStatus: "rightsStatus" in update ? update.rightsStatus ?? null : before.rightsStatus,
              subjectRelationship: "subjectRelationship" in update ? update.subjectRelationship ?? null : before.subjectRelationship,
              publicUsePermission: "publicUsePermission" in update ? update.publicUsePermission ?? null : before.publicUsePermission,
              editingPermission: "editingPermission" in update ? update.editingPermission ?? null : before.editingPermission,
              usageRestrictions: "usageRestrictions" in update ? update.usageRestrictions ?? null : before.usageRestrictions,
              permissionEvidence: "permissionEvidence" in update ? update.permissionEvidence ?? null : before.permissionEvidence,
              declarationExpiryDate: "declarationExpiryDate" in update ? update.declarationExpiryDate ?? null : before.declarationExpiryDate,
              isCwtOwnedFacility: "isCwtOwnedFacility" in update ? update.isCwtOwnedFacility ?? null : before.isCwtOwnedFacility,
            }
          : {}),
        ...(declarationContentChanged
          ? {
              declarationStatementVersion: nextVersion,
              declarationLastEditorUserId: actor.userId,
              declarationReviewerUserId: null,
              declarationReviewDate: null,
              declarationReviewedStatementVersion: null,
              declarationReviewDecision: null,
              declarationReviewReason: null,
              effectiveRightsDecision: "pending_review" as const,
              rightsPublicWebsiteAllowed: null,
            }
          : {}),
        declarationRecordVersion: update.expectedVersion + 1,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(assets.id, assetId),
          eq(assets.declarationRecordVersion, update.expectedVersion),
        ),
      )
      .returning();
    const after = updatedRows[0];
    if (!after) throw new Error("Source Declaration changed; reload before saving.");
    await auditWriter(transaction, {
      actorUserId: actor.userId,
      action: "asset.source_declaration.updated",
      entityType: "asset",
      entityId: assetId,
      beforeSummary: {
        enabled: before.sourceDeclarationEnabled,
        statementVersion: before.declarationStatementVersion,
        recordVersion: before.declarationRecordVersion,
        effectiveRightsDecision: before.effectiveRightsDecision,
      },
      afterSummary: {
        enabled: after.sourceDeclarationEnabled,
        statementVersion: after.declarationStatementVersion,
        recordVersion: after.declarationRecordVersion,
        reviewInvalidated: declarationContentChanged,
        effectiveRightsDecision: after.effectiveRightsDecision,
      },
    });
  });
}

export async function reviewSourceDeclaration<
  TQueryResult extends PgQueryResultHKT,
>(
  db: AppDatabase<TQueryResult>,
  assetId: string,
  actor: { userId: string; role: UserRole },
  decision: "approved" | "rejected",
  effectiveDecision: RightsDecision,
  rightsPublicWebsiteAllowed: boolean | null,
  expectedVersion: number,
  reason?: string | null,
  options: DeclarationOperationOptions = {},
): Promise<void> {
  if (!hasPermission(actor.role, "assets.declaration.review")) {
    throw new Error("Source Declaration review requires reviewer authority.");
  }
  const normalizedReason = reason?.trim() || null;
  if (decision === "rejected" && !normalizedReason) {
    throw new Error("A rejected Source Declaration requires a reason.");
  }
  if (decision === "rejected" && effectiveDecision !== "not_allowed" && effectiveDecision !== "revoked") {
    throw new Error("A rejected declaration must remain Not Allowed or Revoked.");
  }
  if (effectiveDecision === "restricted" && rightsPublicWebsiteAllowed === null) {
    throw new Error("Restricted rights require an explicit public website decision.");
  }
  const auditWriter = options.auditWriter ?? writeAuditLog;
  await db.transaction(async (transaction) => {
    const rows = await transaction.select().from(assets).where(eq(assets.id, assetId)).limit(1);
    const current = rows[0];
    if (
      !current?.sourceDeclarationEnabled ||
      current.declarationStatementVersion < 1 ||
      current.declarationRecordVersion !== expectedVersion
    ) {
      throw new Error("Source Declaration changed during review; review the current version.");
    }
    if (!current.declarationLastEditorUserId) {
      throw new Error("Source Declaration does not record a statement editor.");
    }
    if (current.declarationLastEditorUserId === actor.userId) {
      throw new Error("The last Source Declaration editor cannot review the same version.");
    }
    const reviewTime = new Date();
    const updated = await transaction
      .update(assets)
      .set({
        declarationReviewerUserId: actor.userId,
        declarationReviewDate: reviewTime,
        declarationReviewedStatementVersion: current.declarationStatementVersion,
        declarationReviewDecision: decision,
        declarationReviewReason: normalizedReason,
        effectiveRightsDecision: effectiveDecision,
        rightsPublicWebsiteAllowed:
          effectiveDecision === "restricted" ? rightsPublicWebsiteAllowed : null,
        declarationRecordVersion: expectedVersion + 1,
        updatedAt: reviewTime,
      })
      .where(
        and(
          eq(assets.id, assetId),
          eq(assets.declarationRecordVersion, expectedVersion),
        ),
      )
      .returning({ id: assets.id });
    if (!updated[0]) {
      throw new Error("Source Declaration changed during review; review the current version.");
    }
    await auditWriter(transaction, {
      actorUserId: actor.userId,
      action: `asset.source_declaration.${decision}`,
      entityType: "asset",
      entityId: assetId,
      afterSummary: {
        statementVersion: current.declarationStatementVersion,
        recordVersion: expectedVersion + 1,
        decision,
        effectiveRightsDecision: effectiveDecision,
        rightsPublicWebsiteAllowed,
        hasReason: Boolean(normalizedReason),
      },
    });
  });
}

export async function adminOverrideSourceDeclaration<
  TQueryResult extends PgQueryResultHKT,
>(
  db: AppDatabase<TQueryResult>,
  assetId: string,
  actor: { userId: string; role: UserRole },
  effectiveDecision: RightsDecision,
  rightsPublicWebsiteAllowed: boolean | null,
  expectedVersion: number,
  reason: string,
  options: DeclarationOperationOptions = {},
): Promise<void> {
  if (actor.role !== "admin") {
    throw new Error("Only an Admin may use Source Declaration Override.");
  }
  const normalizedReason = reason.trim();
  if (!normalizedReason) throw new Error("Admin Override requires a reason.");
  if (effectiveDecision === "restricted" && rightsPublicWebsiteAllowed === null) {
    throw new Error("Restricted rights require an explicit public website decision.");
  }
  const auditWriter = options.auditWriter ?? writeAuditLog;
  await db.transaction(async (transaction) => {
    const rows = await transaction.select().from(assets).where(eq(assets.id, assetId)).limit(1);
    const current = rows[0];
    if (
      !current?.sourceDeclarationEnabled ||
      current.declarationStatementVersion < 1 ||
      current.declarationRecordVersion !== expectedVersion
    ) {
      throw new Error("Source Declaration changed during Admin Override; retry explicitly.");
    }
    const reviewTime = new Date();
    const updated = await transaction
      .update(assets)
      .set({
        declarationReviewerUserId: actor.userId,
        declarationReviewDate: reviewTime,
        declarationReviewedStatementVersion: current.declarationStatementVersion,
        declarationReviewDecision: "admin_override",
        declarationReviewReason: normalizedReason,
        effectiveRightsDecision: effectiveDecision,
        rightsPublicWebsiteAllowed:
          effectiveDecision === "restricted" ? rightsPublicWebsiteAllowed : null,
        declarationRecordVersion: expectedVersion + 1,
        updatedAt: reviewTime,
      })
      .where(
        and(
          eq(assets.id, assetId),
          eq(assets.declarationRecordVersion, expectedVersion),
        ),
      )
      .returning({ id: assets.id });
    if (!updated[0]) {
      throw new Error("Source Declaration changed during Admin Override; retry explicitly.");
    }
    await auditWriter(transaction, {
      actorUserId: actor.userId,
      action: "asset.source_declaration.admin_override",
      entityType: "asset",
      entityId: assetId,
      afterSummary: {
        statementVersion: current.declarationStatementVersion,
        recordVersion: expectedVersion + 1,
        decision: "admin_override",
        effectiveRightsDecision: effectiveDecision,
        rightsPublicWebsiteAllowed,
        reason: normalizedReason.slice(0, 500),
      },
    });
  });
}

export async function cleanupUnlinkedInquiryAssets<
  TQueryResult extends PgQueryResultHKT,
>(
  db: AppDatabase<TQueryResult>,
  storage: ObjectStorage,
  assetIds: readonly string[],
  requestId: string,
): Promise<number> {
  const distinct = [...new Set(assetIds)];
  if (distinct.length === 0) return 0;
  const [assetRows, linkedRows] = await Promise.all([
    db
      .select({
        id: assets.id,
        partition: assets.storagePartition,
        objectKey: assets.objectKey,
      })
      .from(assets)
      .where(inArray(assets.id, distinct)),
    db
      .select({ assetId: inquiryAssets.assetId })
      .from(inquiryAssets)
      .where(inArray(inquiryAssets.assetId, distinct)),
  ]);
  const linked = new Set(linkedRows.map((row) => row.assetId));
  const orphans = assetRows.filter((row) => !linked.has(row.id));
  if (orphans.length > 0) {
    const now = new Date();
    await db.transaction(async (transaction) => {
      for (const orphan of orphans) {
        if (
          orphan.partition !== "public" &&
          orphan.partition !== "private" &&
          orphan.partition !== "imports"
        ) {
          throw new Error("Orphan Asset has an invalid storage partition.");
        }
        await transaction
          .update(assets)
          .set({ status: "deleted", deletedAt: now, updatedAt: now })
          .where(eq(assets.id, orphan.id));
        await transaction
          .insert(objectCleanupJobs)
          .values({
            assetId: orphan.id,
            storagePartition: orphan.partition,
            objectKey: orphan.objectKey,
            reason: "unlinked_inquiry_asset_retention",
            status: "pending",
            nextAttemptAt: now,
          })
          .onConflictDoUpdate({
            target: [objectCleanupJobs.storagePartition, objectCleanupJobs.objectKey],
            set: {
              assetId: orphan.id,
              reason: "unlinked_inquiry_asset_retention",
              status: "pending",
              nextAttemptAt: now,
              updatedAt: now,
            },
          });
      }
      await writeAuditLog(transaction, {
        action: "inquiry_asset.orphan_cleanup",
        entityType: "asset",
        requestId,
        afterSummary: { removedCount: orphans.length },
      });
    });
    await processPendingObjectCleanupJobs(db, storage, {
      limit: orphans.length,
      workerId: `inquiry-orphan-${requestId}`,
      now,
    });
  }
  return orphans.length;
}
