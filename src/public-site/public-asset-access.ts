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
  sitePageAssets,
  systemSettings,
} from "@/db/schema";
import type { AppDatabase } from "@/db/types";
import { publicProductEligibilityConditions } from "@/catalog/product-eligibility";
import {
  isAllowedImageMimeType,
  publicAttachmentRoles,
  publicImageRoles,
  verifiedFinalizeManifestSqlCondition,
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
  const [productRows, fabricRows, contentRows, sitePageRows] = await Promise.all([
    db
      .select({ id: products.id })
      .from(productAssets)
      .innerJoin(products, eq(products.id, productAssets.productId))
      .where(
        and(
          eq(productAssets.assetId, assetId),
          inArray(productAssets.role, [...publicImageRoles]),
          eq(productAssets.isVisible, true),
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
          eq(contentAssets.isVisible, true),
          eq(contents.status, "published"),
        ),
      )
      .limit(1),
    db
      .select({ id: sitePageAssets.id })
      .from(sitePageAssets)
      .innerJoin(systemSettings, eq(systemSettings.id, sitePageAssets.systemSettingId))
      .where(
        and(
          eq(sitePageAssets.assetId, assetId),
          inArray(sitePageAssets.role, [...publicImageRoles]),
          eq(sitePageAssets.isVisible, true),
          inArray(systemSettings.key, ["site_page.home", "site_page.about"]),
        ),
      )
      .limit(1),
  ]);
  return Boolean(
    productRows[0] || fabricRows[0] || contentRows[0] || sitePageRows[0],
  );
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
        verifiedFinalizeManifestSqlCondition(),
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
