import { and, eq, isNull, lte } from "drizzle-orm";
import type { PgQueryResultHKT } from "drizzle-orm/pg-core/session";

import { writeAuditLog } from "@/audit/service";
import { assets } from "@/db/schema";
import type { AppDatabase } from "@/db/types";
import type { ObjectStorage, StoragePartition } from "@/storage";

export interface RetentionResult {
  eligible: number;
  deleted: number;
  dryRun: boolean;
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
