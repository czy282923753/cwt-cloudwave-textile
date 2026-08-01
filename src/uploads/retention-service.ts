import { and, eq, inArray, isNull, lte } from "drizzle-orm";
import type { PgQueryResultHKT } from "drizzle-orm/pg-core/session";

import { writeAuditLog } from "@/audit/service";
import { assetUploadBatches, assets, uploadIntents } from "@/db/schema";
import type { AppDatabase } from "@/db/types";
import type { ObjectStorage, StoragePartition } from "@/storage";

export interface RetentionResult {
  eligible: number;
  deleted: number;
  dryRun: boolean;
}

export async function purgeExpiredUploadIntents<
  TQueryResult extends PgQueryResultHKT,
>(
  db: AppDatabase<TQueryResult>,
  storage: ObjectStorage,
  options: { dryRun: boolean; now?: Date },
): Promise<RetentionResult> {
  const now = options.now ?? new Date();
  const expired = await db
    .select({
      intentId: uploadIntents.id,
      intentKind: uploadIntents.kind,
      uploadBatchId: uploadIntents.uploadBatchId,
      assetId: uploadIntents.assetId,
      storagePartition: assets.storagePartition,
      objectKey: assets.objectKey,
    })
    .from(uploadIntents)
    .leftJoin(assets, eq(assets.id, uploadIntents.assetId))
    .where(
      and(
        eq(uploadIntents.isConsumed, false),
        inArray(uploadIntents.status, [
          "created",
          "uploading",
          "passed",
          "failed",
          "consumed",
        ]),
        lte(uploadIntents.expiresAt, now),
      ),
    );
  if (options.dryRun) return { eligible: expired.length, deleted: 0, dryRun: true };
  let deleted = 0;
  for (const row of expired) {
    if (row.assetId && row.storagePartition && row.objectKey) {
      await storage.delete(row.storagePartition as StoragePartition, row.objectKey);
    }
    await db.transaction(async (transaction) => {
      if (row.assetId) {
        await transaction
          .update(assets)
          .set({ status: "deleted", deletedAt: now, updatedAt: now })
          .where(eq(assets.id, row.assetId));
      }
      await transaction
        .update(uploadIntents)
        .set({ status: "expired", failureReason: "upload_intent_expired", updatedAt: now })
        .where(eq(uploadIntents.id, row.intentId));
      if (row.intentKind === "admin_asset" && row.uploadBatchId) {
        await transaction.update(assetUploadBatches).set({
          status: "expired", failureReason: "upload_intent_expired",
        }).where(eq(assetUploadBatches.id, row.uploadBatchId));
      }
      await writeAuditLog(transaction, {
        action: "upload_intent.retention.deleted",
        entityType: "upload_intent",
        entityId: row.intentId,
        afterSummary: { assetDeleted: Boolean(row.assetId) },
      });
      if (row.intentKind === "admin_asset" && row.uploadBatchId) {
        await writeAuditLog(transaction, {
          action: "asset.upload_batch.expired",
          entityType: "asset_upload_batch",
          entityId: row.uploadBatchId,
          afterSummary: { reason: "upload_intent_expired" },
        });
      }
    });
    deleted += 1;
  }
  return { eligible: expired.length, deleted, dryRun: false };
}

export async function purgeExpiredInquiryAssets<
  TQueryResult extends PgQueryResultHKT,
>(
  db: AppDatabase<TQueryResult>,
  storage: ObjectStorage,
  options: { dryRun: boolean; now?: Date },
): Promise<RetentionResult> {
  const now = options.now ?? new Date();
  const expired = await db
    .select({
      id: assets.id,
      storagePartition: assets.storagePartition,
      objectKey: assets.objectKey,
    })
    .from(assets)
    .where(
      and(
        eq(assets.category, "inquiry"),
        isNull(assets.deletedAt),
        lte(assets.retentionExpiresAt, now),
      ),
    );

  if (options.dryRun) {
    return { eligible: expired.length, deleted: 0, dryRun: true };
  }

  let deleted = 0;
  for (const asset of expired) {
    await storage.delete(
      asset.storagePartition as StoragePartition,
      asset.objectKey,
    );
    await db.transaction(async (transaction) => {
      await transaction
        .update(assets)
        .set({ status: "deleted", deletedAt: now, updatedAt: now })
        .where(eq(assets.id, asset.id));
      await writeAuditLog(transaction, {
        action: "asset.retention.deleted",
        entityType: "asset",
        entityId: asset.id,
        afterSummary: {
          category: "inquiry",
          storageObjectDeleted: true,
          retainedDatabaseRecord: true,
        },
      });
    });
    deleted += 1;
  }

  return { eligible: expired.length, deleted, dryRun: false };
}
