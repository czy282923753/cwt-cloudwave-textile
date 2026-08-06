import { and, eq, inArray, isNull } from "drizzle-orm";
import type { PgQueryResultHKT } from "drizzle-orm/pg-core/session";

import {
  assets,
  assetVariants,
  companyFacts,
  contentAssets,
  contents,
  editorialRevisions,
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
  hasStaticPageEvidenceGate,
  isPersistedStaticPagePlacementLive,
  isStaticPageFactSensitivePlacement,
  staticPageFactKeys,
  staticPageConfigSchema,
} from "@/content/static-page-projection";
import { currentPublicCompanyFactConditions } from "@/content/company-facts-service";
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
      .select({
        systemSettingId: sitePageAssets.systemSettingId,
        assetId: sitePageAssets.assetId,
        pageKey: sitePageAssets.pageKey,
        placementKey: sitePageAssets.placementKey,
        viewport: sitePageAssets.viewport,
        role: sitePageAssets.role,
        sortOrder: sitePageAssets.sortOrder,
        altText: sitePageAssets.altText,
        caption: sitePageAssets.caption,
        focalX: sitePageAssets.focalX,
        focalY: sitePageAssets.focalY,
        isVisible: sitePageAssets.isVisible,
        settingKey: systemSettings.key,
        settingValue: systemSettings.value,
        subjectRelationship: assets.subjectRelationship,
        isCwtOwnedFacility: assets.isCwtOwnedFacility,
      })
      .from(sitePageAssets)
      .innerJoin(systemSettings, eq(systemSettings.id, sitePageAssets.systemSettingId))
      .innerJoin(assets, eq(assets.id, sitePageAssets.assetId))
      .innerJoin(editorialRevisions, and(
        eq(editorialRevisions.entityType, "static_page"),
        eq(editorialRevisions.entityId, systemSettings.id),
        eq(editorialRevisions.locale, "en"),
        eq(editorialRevisions.status, "applied"),
      ))
      .where(
        and(
          eq(sitePageAssets.assetId, assetId),
          inArray(sitePageAssets.role, [...publicImageRoles]),
          eq(sitePageAssets.isVisible, true),
          inArray(systemSettings.key, ["site_page.home", "site_page.about"]),
        ),
      ),
  ]);
  const liveStaticPageRows = sitePageRows.flatMap((row) => {
    const config = staticPageConfigSchema.safeParse(row.settingValue);
    return config.success &&
      row.settingKey === `site_page.${config.data.pageKey}` &&
      isPersistedStaticPagePlacementLive(config.data, row)
      ? [{ row, config: config.data }]
      : [];
  });
  const selectedFactKeys = [...new Set(liveStaticPageRows.flatMap(({ row, config }) => (
    isStaticPageFactSensitivePlacement(row.placementKey)
      ? staticPageFactKeys(config, row.placementKey)
      : []
  )))];
  const factRows = selectedFactKeys.length ? await db
    .select({ key: companyFacts.factKey })
    .from(companyFacts)
    .where(and(
      inArray(companyFacts.factKey, selectedFactKeys),
      currentPublicCompanyFactConditions(),
    )) : [];
  const currentFactKeys = new Set(factRows.map((fact) => fact.key));
  const hasLiveStaticPageRelation = liveStaticPageRows.some(({ row, config }) => (
    !isStaticPageFactSensitivePlacement(row.placementKey) || (
      row.subjectRelationship === "cwt" &&
      row.isCwtOwnedFacility === true &&
      hasStaticPageEvidenceGate(
        config,
        row.placementKey,
        currentFactKeys,
        new Set([row.placementKey]),
      )
    )
  ));
  return Boolean(
    productRows[0] || fabricRows[0] || contentRows[0] || hasLiveStaticPageRelation,
  );
}

export async function findPublicAssetForDelivery<
  TQueryResult extends PgQueryResultHKT,
>(
  db: AppDatabase<TQueryResult>,
  assetId: string,
  variantKey?: string,
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
  if (variantKey) {
    const variantRows = await db
      .select({
        objectKey: assetVariants.objectKey,
        format: assetVariants.format,
      })
      .from(assetVariants)
      .where(and(
        eq(assetVariants.sourceAssetId, asset.id),
        eq(assetVariants.variantKey, variantKey),
      ))
      .limit(1);
    const variant = variantRows[0];
    if (!variant || (variant.format !== "avif" && variant.format !== "webp")) {
      return null;
    }
    return {
      id: asset.id,
      objectKey: variant.objectKey,
      partition: "public",
      detectedMimeType: `image/${variant.format}`,
    };
  }
  return {
    id: asset.id,
    objectKey: asset.objectKey,
    partition: "public",
    detectedMimeType: asset.detectedMimeType,
  };
}
