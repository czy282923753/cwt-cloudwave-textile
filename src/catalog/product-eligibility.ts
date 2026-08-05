import { and, eq, exists, inArray, isNotNull, or, sql } from "drizzle-orm";
import type { PgQueryResultHKT } from "drizzle-orm/pg-core/session";

import {
  assets,
  fabricLibraryEntries,
  fabricLibraryEntryApplications,
  fabricLibraryEntryProducts,
  productAssets,
  productApplications,
  productLocalizations,
  productTaxonomyTerms,
  products,
  routes,
  taxonomyTerms,
  applications,
  users,
} from "@/db/schema";
import type { AppDatabase } from "@/db/types";
import {
  publicImageRoles,
  publicReadyImageSqlConditions,
} from "@/uploads/asset-eligibility";

export function verifiedRealProductConditions<
  TQueryResult extends PgQueryResultHKT,
>(db: AppDatabase<TQueryResult>) {
  return and(
    isNotNull(products.realProductBasis),
    isNotNull(products.realProductConfirmedByUserId),
    isNotNull(products.realProductConfirmedAt),
    exists(
      db
        .select({ id: users.id })
        .from(users)
        .where(
          and(
            eq(users.id, products.realProductConfirmedByUserId),
            eq(users.isActive, true),
            inArray(users.role, ["admin", "reviewer_publisher"]),
          ),
        ),
    ),
  )!;
}

export function hasEligibleProductImageConditions<
  TQueryResult extends PgQueryResultHKT,
>(db: AppDatabase<TQueryResult>, now = new Date()) {
  return exists(
    db
      .select({ id: productAssets.assetId })
      .from(productAssets)
      .innerJoin(assets, eq(assets.id, productAssets.assetId))
      .where(
        and(
          eq(productAssets.productId, products.id),
          eq(productAssets.isVisible, true),
          inArray(productAssets.role, [...publicImageRoles]),
          publicReadyImageSqlConditions(now),
        ),
      ),
  );
}

export function publicProductEligibilityConditions<
  TQueryResult extends PgQueryResultHKT,
>(db: AppDatabase<TQueryResult>, now = new Date()) {
  return and(
    eq(products.status, "published"),
    verifiedRealProductConditions(db),
    hasEligibleProductImageConditions(db, now),
    exists(
      db
        .select({ id: productLocalizations.productId })
        .from(productLocalizations)
        .where(
          and(
            eq(productLocalizations.productId, products.id),
            eq(productLocalizations.locale, "en"),
            sql`length(trim(${productLocalizations.name})) > 0`,
          ),
        ),
    ),
    exists(
      db
        .select({ id: routes.id })
        .from(routes)
        .where(
          and(
            eq(routes.entityType, "product"),
            eq(routes.entityId, products.id),
            eq(routes.locale, "en"),
            eq(routes.isCurrent, true),
          ),
        ),
    ),
  )!;
}

/** Correlated predicates for every derived SEO surface that depends on a real public Product. */
export function hasPubliclyEligibleProductForTaxonomyConditions<
  TQueryResult extends PgQueryResultHKT,
>(db: AppDatabase<TQueryResult>, now = new Date()) {
  return exists(
    db.select({ id: products.id }).from(productTaxonomyTerms)
      .innerJoin(products, eq(products.id, productTaxonomyTerms.productId))
      .where(and(
        eq(productTaxonomyTerms.taxonomyTermId, taxonomyTerms.id),
        publicProductEligibilityConditions(db, now),
      )),
  );
}

export function hasPubliclyEligibleProductForApplicationConditions<
  TQueryResult extends PgQueryResultHKT,
>(db: AppDatabase<TQueryResult>, now = new Date()) {
  return exists(
    db.select({ id: products.id }).from(productApplications)
      .innerJoin(products, eq(products.id, productApplications.productId))
      .where(and(
        eq(productApplications.applicationId, applications.id),
        publicProductEligibilityConditions(db, now),
      )),
  );
}

export function hasPubliclyEligibleProductForFabricEntryConditions<
  TQueryResult extends PgQueryResultHKT,
>(db: AppDatabase<TQueryResult>, now = new Date()) {
  const direct = exists(
    db.select({ id: products.id }).from(fabricLibraryEntryProducts)
      .innerJoin(products, eq(products.id, fabricLibraryEntryProducts.productId))
      .where(and(
        eq(fabricLibraryEntryProducts.fabricEntryId, fabricLibraryEntries.id),
        publicProductEligibilityConditions(db, now),
      )),
  );
  const throughApplication = exists(
    db.select({ id: products.id }).from(fabricLibraryEntryApplications)
      .innerJoin(productApplications, eq(
        productApplications.applicationId,
        fabricLibraryEntryApplications.applicationId,
      ))
      .innerJoin(products, eq(products.id, productApplications.productId))
      .where(and(
        eq(fabricLibraryEntryApplications.fabricEntryId, fabricLibraryEntries.id),
        publicProductEligibilityConditions(db, now),
      )),
  );
  return or(direct, throughApplication)!;
}
