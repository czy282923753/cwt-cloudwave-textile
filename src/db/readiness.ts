import { and, count, eq, inArray, isNull, ne, not, notExists, or, sql } from "drizzle-orm";
import type { PgQueryResultHKT } from "drizzle-orm/pg-core/session";

import {
  assets,
  contentAssets,
  contents,
  fabricLibraryEntries,
  fabricLibraryEntryAssets,
  inquiryAssets,
  productAssets,
  products,
  productTaxonomyTerms,
  productLocalizations,
  routes,
  seoMetadata,
} from "@/db/schema";
import type { AppDatabase } from "@/db/types";
import {
  publicImageRoles,
  publicReadyAssetSqlConditions,
  publicReadyImageSqlConditions,
  roleMimeSqlCondition,
} from "@/uploads/asset-eligibility";
import { publicProductEligibilityConditions } from "@/catalog/product-eligibility";

const unusableAsset = not(publicReadyAssetSqlConditions());

export interface DatabaseReadinessResult {
  invalidPrimaryTaxonomy: number;
  invalidInquiryAssets: number;
  publishedProductAssetFailures: number;
  publishedProductEligibilityFailures: number;
  publishedFabricAssetFailures: number;
  publishedFabricWithoutUsableImage: number;
  publishedContentAssetFailures: number;
  publishedProductsWithoutUsableImage: number;
  historicalAssetsAwaitingRescan: number;
  historicalAssetsManualReview: number;
}

export async function verifyDatabaseReadiness<TQueryResult extends PgQueryResultHKT>(
  db: AppDatabase<TQueryResult>,
): Promise<DatabaseReadinessResult> {
  const invalidPrimary = await db
    .select({ id: products.id })
    .from(products)
    .leftJoin(
      productTaxonomyTerms,
      and(
        eq(productTaxonomyTerms.productId, products.id),
        eq(productTaxonomyTerms.isPrimary, true),
      ),
    )
    .where(isNull(productTaxonomyTerms.taxonomyTermId));
  const invalidInquiry = await db
    .select({ assetId: inquiryAssets.assetId })
    .from(inquiryAssets)
    .innerJoin(assets, eq(assets.id, inquiryAssets.assetId))
    .where(
      or(
        ne(assets.category, "inquiry"),
        ne(assets.access, "private"),
        ne(assets.storagePartition, "private"),
        ne(assets.status, "ready"),
        ne(assets.scanStatus, "passed"),
        sql`${assets.deletedAt} is not null`,
      ),
    );
  const [
    badProducts,
    invalidPublishedProducts,
    badFabric,
    missingFabricImages,
    badContent,
    missingProductImages,
    rescan,
    manual,
  ] =
    await Promise.all([
      db
        .select({ value: count() })
        .from(productAssets)
        .innerJoin(products, eq(products.id, productAssets.productId))
        .innerJoin(assets, eq(assets.id, productAssets.assetId))
        .where(
          and(
            eq(products.status, "published"),
            or(unusableAsset, not(roleMimeSqlCondition(productAssets.role))),
          ),
        ),
      db
        .select({ value: count() })
        .from(products)
        .leftJoin(
          productLocalizations,
          and(
            eq(productLocalizations.productId, products.id),
            eq(productLocalizations.locale, "en"),
          ),
        )
        .leftJoin(
          routes,
          and(
            eq(routes.entityType, "product"),
            eq(routes.entityId, products.id),
            eq(routes.locale, "en"),
            eq(routes.isCurrent, true),
          ),
        )
        .leftJoin(seoMetadata, eq(seoMetadata.routeId, routes.id))
        .where(
          and(
            eq(products.status, "published"),
            or(
              not(publicProductEligibilityConditions(db)),
              isNull(productLocalizations.productId),
              sql`length(trim(coalesce(${productLocalizations.name}, ''))) = 0`,
              isNull(routes.id),
              isNull(seoMetadata.routeId),
            ),
          ),
        ),
      db
        .select({ value: count() })
        .from(fabricLibraryEntryAssets)
        .innerJoin(
          fabricLibraryEntries,
          eq(fabricLibraryEntries.id, fabricLibraryEntryAssets.fabricEntryId),
        )
        .innerJoin(assets, eq(assets.id, fabricLibraryEntryAssets.assetId))
        .where(
          and(
            eq(fabricLibraryEntries.status, "published"),
            or(
              unusableAsset,
              not(roleMimeSqlCondition(fabricLibraryEntryAssets.role)),
            ),
          ),
        ),
      db
        .select({ value: count() })
        .from(fabricLibraryEntries)
        .where(
          and(
            eq(fabricLibraryEntries.status, "published"),
            notExists(
              db
                .select({ id: fabricLibraryEntryAssets.assetId })
                .from(fabricLibraryEntryAssets)
                .innerJoin(assets, eq(assets.id, fabricLibraryEntryAssets.assetId))
                .where(
                  and(
                    eq(
                      fabricLibraryEntryAssets.fabricEntryId,
                      fabricLibraryEntries.id,
                    ),
                    eq(fabricLibraryEntryAssets.role, "hero"),
                    publicReadyImageSqlConditions(),
                  ),
                ),
            ),
          ),
        ),
      db
        .select({ value: count() })
        .from(contentAssets)
        .innerJoin(contents, eq(contents.id, contentAssets.contentId))
        .innerJoin(assets, eq(assets.id, contentAssets.assetId))
        .where(
          and(
            eq(contents.status, "published"),
            or(unusableAsset, not(roleMimeSqlCondition(contentAssets.role))),
          ),
        ),
      db
        .select({ value: count() })
        .from(products)
        .where(
          and(
            eq(products.status, "published"),
            notExists(
              db
                .select({ id: productAssets.assetId })
                .from(productAssets)
                .innerJoin(assets, eq(assets.id, productAssets.assetId))
                .where(
                  and(
                    eq(productAssets.productId, products.id),
                    inArray(productAssets.role, [...publicImageRoles]),
                    publicReadyImageSqlConditions(),
                  ),
                ),
            ),
          ),
        ),
      db.select({ value: count() }).from(assets).where(eq(assets.rescanStatus, "required")),
      db
        .select({ value: count() })
        .from(assets)
        .where(eq(assets.rescanStatus, "manual_review")),
    ]);
  return {
    invalidPrimaryTaxonomy: invalidPrimary.length,
    invalidInquiryAssets: invalidInquiry.length,
    publishedProductAssetFailures: Number(badProducts[0]?.value ?? 0),
    publishedProductEligibilityFailures: Number(
      invalidPublishedProducts[0]?.value ?? 0,
    ),
    publishedFabricAssetFailures: Number(badFabric[0]?.value ?? 0),
    publishedFabricWithoutUsableImage: Number(
      missingFabricImages[0]?.value ?? 0,
    ),
    publishedContentAssetFailures: Number(badContent[0]?.value ?? 0),
    publishedProductsWithoutUsableImage: Number(
      missingProductImages[0]?.value ?? 0,
    ),
    historicalAssetsAwaitingRescan: Number(rescan[0]?.value ?? 0),
    historicalAssetsManualReview: Number(manual[0]?.value ?? 0),
  };
}

export function assertDatabaseReady(result: DatabaseReadinessResult): void {
  const blockers = {
    invalidPrimaryTaxonomy: result.invalidPrimaryTaxonomy,
    invalidInquiryAssets: result.invalidInquiryAssets,
    publishedProductAssetFailures: result.publishedProductAssetFailures,
    publishedProductEligibilityFailures:
      result.publishedProductEligibilityFailures,
    publishedFabricAssetFailures: result.publishedFabricAssetFailures,
    publishedFabricWithoutUsableImage:
      result.publishedFabricWithoutUsableImage,
    publishedContentAssetFailures: result.publishedContentAssetFailures,
    publishedProductsWithoutUsableImage: result.publishedProductsWithoutUsableImage,
    historicalAssetsAwaitingRescan: result.historicalAssetsAwaitingRescan,
  };
  if (Object.values(blockers).some((value) => value > 0)) {
    throw new Error(`Database readiness failed: ${JSON.stringify(blockers)}`);
  }
}
