import { and, eq, inArray, isNull } from "drizzle-orm";
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
import { publicProductEligibilityConditions } from "@/catalog/product-eligibility";
import {
  isAllowedImageMimeType,
  publicAttachmentRoles,
  publicImageRoles,
} from "@/uploads/asset-eligibility";

import { isPublicAssetCandidate } from "./public-asset-policy";

async function hasPublishedEntityRelation<TQueryResult extends PgQueryResultHKT>(
  db: AppDatabase<TQueryResult>,
  assetId: string,
  detectedMimeType: string,
): Promise<boolean> {
  const allowedRoles = isAllowedImageMimeType(detectedMimeType)
    ? [...publicImageRoles, ...publicAttachmentRoles]
    : detectedMimeType === "application/pdf"
      ? [...publicAttachmentRoles]
      : [];
  if (allowedRoles.length === 0) return false;
  const [productRows, fabricRows, contentRows] = await Promise.all([
    db
      .select({ id: products.id })
      .from(productAssets)
      .innerJoin(products, eq(products.id, productAssets.productId))
      .where(
        and(
          eq(productAssets.assetId, assetId),
          inArray(productAssets.role, [...publicImageRoles]),
          publicProductEligibilityConditions(db),
        ),
      )
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
          inArray(fabricLibraryEntryAssets.role, allowedRoles),
          eq(fabricLibraryEntries.status, "published"),
        ),
      )
      .limit(1),
    db
      .select({ id: contents.id })
      .from(contentAssets)
      .innerJoin(contents, eq(contents.id, contentAssets.contentId))
      .where(
        and(
          eq(contentAssets.assetId, assetId),
          inArray(contentAssets.role, allowedRoles),
          eq(contents.status, "published"),
        ),
      )
      .limit(1),
  ]);
  return Boolean(productRows[0] || fabricRows[0] || contentRows[0]);
}

export async function findPublicAssetForDelivery<
  TQueryResult extends PgQueryResultHKT,
>(
  db: AppDatabase<TQueryResult>,
  assetId: string,
): Promise<{
  id: string;
  objectKey: string;
  partition: "public";
  detectedMimeType: string;
} | null> {
  const rows = await db
    .select({
      id: assets.id,
      objectKey: assets.objectKey,
      partition: assets.storagePartition,
      storagePartition: assets.storagePartition,
      access: assets.access,
      status: assets.status,
      scanStatus: assets.scanStatus,
      deletedAt: assets.deletedAt,
      detectedMimeType: assets.detectedMimeType,
      effectiveRightsDecision: assets.effectiveRightsDecision,
      publicUsePermission: assets.publicUsePermission,
      rightsPublicWebsiteAllowed: assets.rightsPublicWebsiteAllowed,
      declarationExpiryDate: assets.declarationExpiryDate,
    })
    .from(assets)
    .where(
      and(
        eq(assets.id, assetId),
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
  if (!asset.detectedMimeType || !isPublicAssetCandidate(asset)) return null;
  if (!(await hasPublishedEntityRelation(db, asset.id, asset.detectedMimeType))) return null;
  return {
    id: asset.id,
    objectKey: asset.objectKey,
    partition: "public",
    detectedMimeType: asset.detectedMimeType,
  };
}
