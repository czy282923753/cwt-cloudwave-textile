import { and, count, eq, isNull, ne, notExists, or, sql } from "drizzle-orm";
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
} from "@/db/schema";
import type { AppDatabase } from "@/db/types";

const unusableAsset = or(
  ne(assets.storagePartition, "public"),
  ne(assets.access, "public"),
  ne(assets.status, "ready"),
  ne(assets.scanStatus, "passed"),
  sql`${assets.deletedAt} is not null`,
  sql`(${assets.sourceDeclarationEnabled} = true and ${assets.publicUsePermission} = 'not_allowed')`,
  sql`(${assets.declarationExpiryDate} is not null and ${assets.declarationExpiryDate} <= now())`,
);

export interface DatabaseReadinessResult {
  invalidPrimaryTaxonomy: number;
  invalidInquiryAssets: number;
  publishedProductAssetFailures: number;
  publishedFabricAssetFailures: number;
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
  const [badProducts, badFabric, badContent, missingProductImages, rescan, manual] =
    await Promise.all([
      db
        .select({ value: count() })
        .from(productAssets)
        .innerJoin(products, eq(products.id, productAssets.productId))
        .innerJoin(assets, eq(assets.id, productAssets.assetId))
        .where(and(eq(products.status, "published"), unusableAsset)),
      db
        .select({ value: count() })
        .from(fabricLibraryEntryAssets)
        .innerJoin(
          fabricLibraryEntries,
          eq(fabricLibraryEntries.id, fabricLibraryEntryAssets.fabricEntryId),
        )
        .innerJoin(assets, eq(assets.id, fabricLibraryEntryAssets.assetId))
        .where(and(eq(fabricLibraryEntries.status, "published"), unusableAsset)),
      db
        .select({ value: count() })
        .from(contentAssets)
        .innerJoin(contents, eq(contents.id, contentAssets.contentId))
        .innerJoin(assets, eq(assets.id, contentAssets.assetId))
        .where(and(eq(contents.status, "published"), unusableAsset)),
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
                    eq(assets.storagePartition, "public"),
                    eq(assets.access, "public"),
                    eq(assets.status, "ready"),
                    eq(assets.scanStatus, "passed"),
                    isNull(assets.deletedAt),
                    or(
                      eq(assets.sourceDeclarationEnabled, false),
                      isNull(assets.publicUsePermission),
                      ne(assets.publicUsePermission, "not_allowed"),
                    ),
                    or(
                      isNull(assets.declarationExpiryDate),
                      sql`${assets.declarationExpiryDate} > now()`,
                    ),
                    sql`${assets.detectedMimeType} in ('image/jpeg','image/png','image/webp','image/avif')`,
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
    publishedFabricAssetFailures: Number(badFabric[0]?.value ?? 0),
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
    publishedFabricAssetFailures: result.publishedFabricAssetFailures,
    publishedContentAssetFailures: result.publishedContentAssetFailures,
    publishedProductsWithoutUsableImage: result.publishedProductsWithoutUsableImage,
    historicalAssetsAwaitingRescan: result.historicalAssetsAwaitingRescan,
  };
  if (Object.values(blockers).some((value) => value > 0)) {
    throw new Error(`Database readiness failed: ${JSON.stringify(blockers)}`);
  }
}
