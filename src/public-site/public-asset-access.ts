import { and, eq, isNull } from "drizzle-orm";
import type { PgQueryResultHKT } from "drizzle-orm/pg-core/session";

import {
  assets,
  contentAssets,
  contents,
  fabricLibraryEntries,
  fabricLibraryEntryAssets,
  productAssets,
  products,
} from "@/db/schema";
import type { AppDatabase } from "@/db/types";

async function hasPublishedEntityRelation<TQueryResult extends PgQueryResultHKT>(
  db: AppDatabase<TQueryResult>,
  assetId: string,
): Promise<boolean> {
  const [productRows, fabricRows, contentRows] = await Promise.all([
    db
      .select({ id: products.id })
      .from(productAssets)
      .innerJoin(products, eq(products.id, productAssets.productId))
      .where(and(eq(productAssets.assetId, assetId), eq(products.status, "published")))
      .limit(1),
    db
      .select({ id: fabricLibraryEntries.id })
      .from(fabricLibraryEntryAssets)
      .innerJoin(
        fabricLibraryEntries,
        eq(fabricLibraryEntries.id, fabricLibraryEntryAssets.fabricEntryId),
      )
      .where(
        and(
          eq(fabricLibraryEntryAssets.assetId, assetId),
          eq(fabricLibraryEntries.status, "published"),
        ),
      )
      .limit(1),
    db
      .select({ id: contents.id })
      .from(contentAssets)
      .innerJoin(contents, eq(contents.id, contentAssets.contentId))
      .where(and(eq(contentAssets.assetId, assetId), eq(contents.status, "published")))
      .limit(1),
  ]);
  return Boolean(productRows[0] || fabricRows[0] || contentRows[0]);
}

export async function findPublicAssetForDelivery<
  TQueryResult extends PgQueryResultHKT,
>(
  db: AppDatabase<TQueryResult>,
  objectKey: string,
): Promise<{ id: string; objectKey: string; partition: "public" } | null> {
  const rows = await db
    .select({
      id: assets.id,
      objectKey: assets.objectKey,
      partition: assets.storagePartition,
    })
    .from(assets)
    .where(
      and(
        eq(assets.objectKey, objectKey),
        eq(assets.storagePartition, "public"),
        eq(assets.access, "public"),
        eq(assets.status, "ready"),
        eq(assets.scanStatus, "passed"),
        isNull(assets.deletedAt),
      ),
    )
    .limit(1);
  const asset = rows[0];
  if (!asset || asset.partition !== "public") return null;
  if (!(await hasPublishedEntityRelation(db, asset.id))) return null;
  return { id: asset.id, objectKey: asset.objectKey, partition: "public" };
}
