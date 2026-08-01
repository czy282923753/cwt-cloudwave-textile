import { and, eq, isNull } from "drizzle-orm";
import type { PgQueryResultHKT } from "drizzle-orm/pg-core/session";

import { AuthorizationError, requirePermission } from "@/auth/permissions";
import type { Actor } from "@/catalog/product-service";
import { assets, inquiries, inquiryAssets } from "@/db/schema";
import type { AppDatabase } from "@/db/types";

export async function requireInquiryRecordAccess<
  TQueryResult extends PgQueryResultHKT,
>(
  db: AppDatabase<TQueryResult>,
  actor: Actor,
  inquiryId: string,
  mode: "read" | "manage",
): Promise<typeof inquiries.$inferSelect> {
  requirePermission(actor.role, mode === "read" ? "inquiries.read" : "crm.manage");
  const ownership =
    actor.role === "admin"
      ? eq(inquiries.id, inquiryId)
      : and(eq(inquiries.id, inquiryId), eq(inquiries.ownerUserId, actor.userId));
  const rows = await db.select().from(inquiries).where(ownership).limit(1);
  const inquiry = rows[0];
  if (!inquiry) {
    throw new AuthorizationError(
      actor.role,
      mode === "read" ? "inquiries.read" : "crm.manage",
    );
  }
  return inquiry;
}

export function canReadAggregateAnalytics(actor: Actor): boolean {
  return actor.role === "admin" || actor.role === "analyst";
}

export async function authorizeInquiryAssetRecord<
  TQueryResult extends PgQueryResultHKT,
>(
  db: AppDatabase<TQueryResult>,
  actor: Actor,
  assetId: string,
): Promise<{ id: string; objectKey: string; partition: "private"; inquiryId: string }> {
  const rows = await db
    .select({
      id: assets.id,
      objectKey: assets.objectKey,
      partition: assets.storagePartition,
      inquiryId: inquiryAssets.inquiryId,
    })
    .from(assets)
    .innerJoin(inquiryAssets, eq(inquiryAssets.assetId, assets.id))
    .where(
      and(
        eq(assets.id, assetId),
        eq(assets.category, "inquiry"),
        eq(assets.access, "private"),
        eq(assets.storagePartition, "private"),
        eq(assets.status, "ready"),
        eq(assets.scanStatus, "passed"),
        isNull(assets.deletedAt),
      ),
    )
    .limit(1);
  const asset = rows[0];
  if (!asset || asset.partition !== "private") {
    throw new AuthorizationError(actor.role, "inquiries.read");
  }
  await requireInquiryRecordAccess(db, actor, asset.inquiryId, "read");
  return { ...asset, partition: "private" };
}
