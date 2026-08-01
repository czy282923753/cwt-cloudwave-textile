import { createHash, randomUUID } from "node:crypto";
import { eq, inArray } from "drizzle-orm";
import type { PgQueryResultHKT } from "drizzle-orm/pg-core/session";

import { writeAuditLog } from "@/audit/service";
import { hasPermission, type UserRole } from "@/auth/permissions";
import { env } from "@/config/env";
import { assets, assetVariants, inquiryAssets } from "@/db/schema";
import type { AppDatabase } from "@/db/types";
import type { ObjectStorage, StoragePartition } from "@/storage";

import { validateUploadedFile, inferNonBlockingRiskHints } from "./file-validation";
import { createImageDerivatives } from "./image-derivatives";
import type { FileScanner } from "./scanner";

type AssetCategory = typeof assets.$inferInsert.category;

export interface UploadAssetInput {
  fileName: string;
  declaredMimeType: string;
  bytes: Uint8Array;
  category: AssetCategory;
  purpose: "public_asset" | "inquiry" | "import";
  uploadedByUserId?: string | null;
  uploadBatchId?: string | null;
  sourceDeclarationEnabled?: boolean;
  retentionExpiresAt?: Date | null;
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

  await storage.put(
    "private",
    quarantineKey,
    input.bytes,
    validated.detectedMimeType,
  );

  const inserted = await db
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
  const asset = inserted[0];
  if (!asset) throw new Error("Asset insert did not return an ID.");

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
  enabled: boolean;
  sourceType?: string | null;
  sourceProvider?: string | null;
  rightsStatus?: string | null;
  subjectRelationship?: typeof assets.$inferInsert.subjectRelationship;
  publicUsePermission?: typeof assets.$inferInsert.publicUsePermission;
  editingPermission?: typeof assets.$inferInsert.editingPermission;
  usageRestrictions?: string | null;
  permissionEvidence?: string | null;
  declarationReviewerUserId?: string | null;
  declarationReviewDate?: Date | null;
  declarationExpiryDate?: Date | null;
  isCwtOwnedFacility?: boolean | null;
}

export async function updateSourceDeclaration<TQueryResult extends PgQueryResultHKT>(
  db: AppDatabase<TQueryResult>,
  assetId: string,
  actor: { userId: string; role: UserRole },
  update: SourceDeclarationUpdate,
): Promise<void> {
  const beforeRows = await db.select().from(assets).where(eq(assets.id, assetId)).limit(1);
  const before = beforeRows[0];
  if (!before) throw new Error("Asset was not found.");
  const touchesReview =
    "declarationReviewerUserId" in update || "declarationReviewDate" in update;
  const updateKeys = Object.keys(update);
  const isReviewOnlyUpdate = updateKeys.every((key) =>
    ["enabled", "declarationReviewerUserId", "declarationReviewDate"].includes(key),
  );
  if (
    !hasPermission(actor.role, "assets.write") &&
    !(
      touchesReview &&
      isReviewOnlyUpdate &&
      hasPermission(actor.role, "assets.declaration.review")
    )
  ) {
    throw new Error("Source Declaration changes require Asset writer authority.");
  }
  if (touchesReview && !hasPermission(actor.role, "assets.declaration.review")) {
    throw new Error("Source declaration review fields require reviewer authority.");
  }
  if (
    update.declarationReviewerUserId &&
    update.declarationReviewerUserId !== actor.userId
  ) {
    throw new Error("A source declaration reviewer can only record their own review.");
  }
  if (update.declarationReviewDate && !update.declarationReviewerUserId) {
    throw new Error("A source declaration review date requires a reviewer.");
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
  const declarationContentChanged =
    update.enabled &&
    substantiveFields.some(
      (field) =>
        field in update && String(update[field] ?? null) !== String(before[field] ?? null),
    );
  const reviewExplicitlyRecorded =
    Boolean(update.declarationReviewerUserId) && Boolean(update.declarationReviewDate);

  await db
    .update(assets)
    .set({
      sourceDeclarationEnabled: update.enabled,
      ...(update.enabled
        ? {
            sourceType:
              "sourceType" in update ? update.sourceType ?? null : before.sourceType,
            sourceProvider:
              "sourceProvider" in update
                ? update.sourceProvider ?? null
                : before.sourceProvider,
            rightsStatus:
              "rightsStatus" in update
                ? update.rightsStatus ?? null
                : before.rightsStatus,
            subjectRelationship:
              "subjectRelationship" in update
                ? update.subjectRelationship ?? null
                : before.subjectRelationship,
            publicUsePermission:
              "publicUsePermission" in update
                ? update.publicUsePermission ?? null
                : before.publicUsePermission,
            editingPermission:
              "editingPermission" in update
                ? update.editingPermission ?? null
                : before.editingPermission,
            usageRestrictions:
              "usageRestrictions" in update
                ? update.usageRestrictions ?? null
                : before.usageRestrictions,
            permissionEvidence:
              "permissionEvidence" in update
                ? update.permissionEvidence ?? null
                : before.permissionEvidence,
            declarationReviewerUserId:
              "declarationReviewerUserId" in update
                ? update.declarationReviewerUserId ?? null
                : declarationContentChanged && !reviewExplicitlyRecorded
                  ? null
                  : before.declarationReviewerUserId,
            declarationReviewDate:
              "declarationReviewDate" in update
                ? update.declarationReviewDate ?? null
                : declarationContentChanged && !reviewExplicitlyRecorded
                  ? null
                  : before.declarationReviewDate,
            declarationExpiryDate:
              "declarationExpiryDate" in update
                ? update.declarationExpiryDate ?? null
                : before.declarationExpiryDate,
            isCwtOwnedFacility:
              "isCwtOwnedFacility" in update
                ? update.isCwtOwnedFacility ?? null
                : before.isCwtOwnedFacility,
          }
        : {}),
      updatedAt: new Date(),
    })
    .where(eq(assets.id, assetId));

  const afterRows = await db.select().from(assets).where(eq(assets.id, assetId)).limit(1);
  const after = afterRows[0];
  if (!after) throw new Error("Asset disappeared during declaration update.");
  const declarationFields = [
    "sourceDeclarationEnabled",
    "sourceType",
    "sourceProvider",
    "rightsStatus",
    "subjectRelationship",
    "publicUsePermission",
    "editingPermission",
    "usageRestrictions",
    "permissionEvidence",
    "declarationReviewerUserId",
    "declarationReviewDate",
    "declarationExpiryDate",
    "isCwtOwnedFacility",
  ] as const;
  const changedFields = declarationFields.filter(
    (field) => String(before[field]) !== String(after[field]),
  );

  await writeAuditLog(db, {
    actorUserId: actor.userId,
    action: "asset.source_declaration.updated",
    entityType: "asset",
    entityId: assetId,
    beforeSummary: { enabled: before.sourceDeclarationEnabled },
    afterSummary: {
      enabled: update.enabled,
      changedFields,
      reviewInvalidated: declarationContentChanged && !reviewExplicitlyRecorded,
    },
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
  for (const orphan of orphans) {
    if (
      orphan.partition === "public" ||
      orphan.partition === "private" ||
      orphan.partition === "imports"
    ) {
      await storage.delete(orphan.partition, orphan.objectKey);
    }
    await db
      .update(assets)
      .set({ status: "deleted", deletedAt: new Date(), updatedAt: new Date() })
      .where(eq(assets.id, orphan.id));
  }
  if (orphans.length > 0) {
    await writeAuditLog(db, {
      action: "inquiry_asset.orphan_cleanup",
      entityType: "asset",
      requestId,
      afterSummary: { removedCount: orphans.length },
    });
  }
  return orphans.length;
}
