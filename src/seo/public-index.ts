import { and, eq, inArray, isNotNull, isNull, or, sql } from "drizzle-orm";
import type { PgQueryResultHKT } from "drizzle-orm/pg-core/session";

import { databaseConnection } from "@/db/client";
import {
  applicationLocalizations,
  applications,
  assets,
  contentLocalizations,
  contents,
  fabricLibraryEntries,
  fabricLibraryEntryAssets,
  fabricLibraryEntryLocalizations,
  productAssets,
  productApplications,
  productLocalizations,
  productTaxonomyTerms,
  products,
  internalLinkRelations,
  keywordPageMappings,
  routes,
  seoMetadata,
  taxonomyTermLocalizations,
  taxonomyTerms,
  seoTopicMembers,
} from "@/db/schema";
import type { AppDatabase } from "@/db/types";
import {
  hasPubliclyEligibleProductForFabricEntryConditions,
  publicProductEligibilityConditions,
} from "@/catalog/product-eligibility";
import {
  publicImageRoles,
  publicReadyAssetSqlConditions,
  publicReadyImageSqlConditions,
} from "@/uploads/asset-eligibility";

function commonRouteConditions() {
  return and(
    eq(routes.isCurrent, true),
    eq(routes.locale, "en"),
    eq(seoMetadata.indexStatus, "index"),
    or(isNull(seoMetadata.canonicalPath), eq(seoMetadata.canonicalPath, routes.path)),
  );
}

function publicAssetConditions() {
  return publicReadyAssetSqlConditions();
}

export async function queryIndexableRoutes<TQueryResult extends PgQueryResultHKT>(
  db: AppDatabase<TQueryResult>,
) {
  const [productRows, applicationRows, fabricRows, contentRows, taxonomyRows] =
    await Promise.all([
      db
        .selectDistinct({ path: routes.path, updatedAt: routes.updatedAt })
        .from(routes)
        .innerJoin(seoMetadata, eq(seoMetadata.routeId, routes.id))
        .innerJoin(
          products,
          and(eq(routes.entityType, "product"), eq(routes.entityId, products.id)),
        )
        .innerJoin(
          productLocalizations,
          and(
            eq(productLocalizations.productId, products.id),
            eq(productLocalizations.locale, routes.locale),
          ),
        )
        .innerJoin(productAssets, eq(productAssets.productId, products.id))
        .innerJoin(
          assets,
          and(eq(assets.id, productAssets.assetId), publicAssetConditions()),
        )
        .innerJoin(
          productApplications,
          eq(productApplications.productId, products.id),
        )
        .innerJoin(
          applications,
          and(
            eq(applications.id, productApplications.applicationId),
            eq(applications.status, "published"),
          ),
        )
        .innerJoin(
          keywordPageMappings,
          eq(keywordPageMappings.primaryRouteId, routes.id),
        )
        .where(
          and(
            commonRouteConditions(),
            publicProductEligibilityConditions(db),
            inArray(productAssets.role, [...publicImageRoles]),
            publicReadyImageSqlConditions(),
            or(
              sql`length(trim(coalesce(${productLocalizations.shortDescription}, ''))) > 0`,
              sql`length(trim(coalesce(${productLocalizations.fullDescription}, ''))) > 0`,
            ),
            sql`length(trim(coalesce(${seoMetadata.title}, ''))) > 0`,
            sql`length(trim(coalesce(${seoMetadata.metaDescription}, ''))) > 0`,
            sql`length(trim(coalesce(${assets.altText}, ''))) > 0`,
          ),
        ),
      db
        .selectDistinct({ path: routes.path, updatedAt: routes.updatedAt })
        .from(routes)
        .innerJoin(seoMetadata, eq(seoMetadata.routeId, routes.id))
        .innerJoin(
          applications,
          and(
            eq(routes.entityType, "application"),
            eq(routes.entityId, applications.id),
          ),
        )
        .innerJoin(
          applicationLocalizations,
          and(
            eq(applicationLocalizations.applicationId, applications.id),
            eq(applicationLocalizations.locale, routes.locale),
          ),
        )
        .innerJoin(
          productApplications,
          eq(productApplications.applicationId, applications.id),
        )
        .innerJoin(
          products,
          and(
            eq(products.id, productApplications.productId),
            eq(products.status, "published"),
          ),
        )
        .innerJoin(
          keywordPageMappings,
          eq(keywordPageMappings.primaryRouteId, routes.id),
        )
        .where(
          and(
            commonRouteConditions(),
            eq(applications.status, "published"),
            publicProductEligibilityConditions(db),
            sql`length(trim(coalesce(${applicationLocalizations.body}, ''))) > 0`,
            sql`length(trim(coalesce(${seoMetadata.title}, ''))) > 0`,
            sql`length(trim(coalesce(${seoMetadata.metaDescription}, ''))) > 0`,
          ),
        ),
      db
        .selectDistinct({ path: routes.path, updatedAt: routes.updatedAt })
        .from(routes)
        .innerJoin(seoMetadata, eq(seoMetadata.routeId, routes.id))
        .innerJoin(
          fabricLibraryEntries,
          and(
            eq(routes.entityType, "fabric_entry"),
            eq(routes.entityId, fabricLibraryEntries.id),
          ),
        )
        .innerJoin(
          fabricLibraryEntryLocalizations,
          and(
            eq(
              fabricLibraryEntryLocalizations.fabricEntryId,
              fabricLibraryEntries.id,
            ),
            eq(fabricLibraryEntryLocalizations.locale, routes.locale),
          ),
        )
        .innerJoin(
          fabricLibraryEntryAssets,
          eq(fabricLibraryEntryAssets.fabricEntryId, fabricLibraryEntries.id),
        )
        .innerJoin(
          assets,
          and(eq(assets.id, fabricLibraryEntryAssets.assetId), publicAssetConditions()),
        )
        .innerJoin(
          keywordPageMappings,
          eq(keywordPageMappings.primaryRouteId, routes.id),
        )
        .where(
          and(
            commonRouteConditions(),
            eq(fabricLibraryEntries.status, "published"),
            eq(fabricLibraryEntryAssets.role, "hero"),
            publicReadyImageSqlConditions(),
            isNotNull(fabricLibraryEntries.independentValueConfirmedAt),
            sql`length(trim(coalesce(${fabricLibraryEntryLocalizations.description}, ''))) > 0`,
            sql`length(trim(coalesce(${seoMetadata.title}, ''))) > 0`,
            sql`length(trim(coalesce(${seoMetadata.metaDescription}, ''))) > 0`,
            sql`length(trim(coalesce(${assets.altText}, ''))) > 0`,
            hasPubliclyEligibleProductForFabricEntryConditions(db),
          ),
        ),
      db
        .selectDistinct({ path: routes.path, updatedAt: routes.updatedAt })
        .from(routes)
        .innerJoin(seoMetadata, eq(seoMetadata.routeId, routes.id))
        .innerJoin(
          contents,
          and(eq(routes.entityType, "content"), eq(routes.entityId, contents.id)),
        )
        .innerJoin(
          contentLocalizations,
          and(
            eq(contentLocalizations.contentId, contents.id),
            eq(contentLocalizations.locale, routes.locale),
          ),
        )
        .innerJoin(
          keywordPageMappings,
          eq(keywordPageMappings.primaryRouteId, routes.id),
        )
        .innerJoin(seoTopicMembers, eq(seoTopicMembers.routeId, routes.id))
        .innerJoin(
          internalLinkRelations,
          and(
            eq(internalLinkRelations.sourceRouteId, routes.id),
            eq(internalLinkRelations.status, "published"),
          ),
        )
        .where(
          and(
            commonRouteConditions(),
            eq(contents.status, "published"),
            sql`length(trim(${contentLocalizations.title})) > 0`,
            sql`length(trim(${contentLocalizations.body})) > 0`,
            sql`length(trim(coalesce(${seoMetadata.title}, ''))) > 0`,
            sql`length(trim(coalesce(${seoMetadata.metaDescription}, ''))) > 0`,
          ),
        ),
      db
        .selectDistinct({ path: routes.path, updatedAt: routes.updatedAt })
        .from(routes)
        .innerJoin(seoMetadata, eq(seoMetadata.routeId, routes.id))
        .innerJoin(
          taxonomyTerms,
          and(eq(routes.entityType, "taxonomy"), eq(routes.entityId, taxonomyTerms.id)),
        )
        .innerJoin(
          taxonomyTermLocalizations,
          and(
            eq(taxonomyTermLocalizations.taxonomyTermId, taxonomyTerms.id),
            eq(taxonomyTermLocalizations.locale, routes.locale),
          ),
        )
        .innerJoin(
          productTaxonomyTerms,
          eq(productTaxonomyTerms.taxonomyTermId, taxonomyTerms.id),
        )
        .innerJoin(
          products,
          and(
            eq(products.id, productTaxonomyTerms.productId),
            publicProductEligibilityConditions(db),
          ),
        )
        .innerJoin(
          keywordPageMappings,
          eq(keywordPageMappings.primaryRouteId, routes.id),
        )
        .where(
          and(
            commonRouteConditions(),
            eq(taxonomyTerms.isActive, true),
            sql`length(trim(coalesce(${taxonomyTermLocalizations.description}, ''))) > 0`,
            sql`length(trim(coalesce(${seoMetadata.title}, ''))) > 0`,
            sql`length(trim(coalesce(${seoMetadata.metaDescription}, ''))) > 0`,
          ),
        ),
    ]);
  return [...productRows, ...applicationRows, ...fabricRows, ...contentRows, ...taxonomyRows]
    .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
}

export async function listIndexableRoutes() {
  return databaseConnection.kind === "pglite"
    ? queryIndexableRoutes(databaseConnection.db)
    : queryIndexableRoutes(databaseConnection.db);
}
