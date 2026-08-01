import { and, desc, eq } from "drizzle-orm";
import type { PgQueryResultHKT } from "drizzle-orm/pg-core/session";

import { databaseConnection } from "@/db/client";
import {
  applicationLocalizations,
  applications,
  assets,
  authors,
  contentLocalizations,
  contents,
  companyFacts,
  fabricLibraryEntries,
  fabricLibraryEntryLocalizations,
  productLocalizations,
  products,
  routes,
  seoMetadata,
  taxonomyTermLocalizations,
  taxonomyTerms,
} from "@/db/schema";
import type { AppDatabase } from "@/db/types";

async function queryProducts<TQueryResult extends PgQueryResultHKT>(
  db: AppDatabase<TQueryResult>,
) {
  return db
    .select({
      id: products.id,
      name: productLocalizations.name,
      status: products.status,
      updatedAt: products.updatedAt,
      path: routes.path,
      indexStatus: seoMetadata.indexStatus,
    })
    .from(products)
    .innerJoin(
      productLocalizations,
      and(
        eq(productLocalizations.productId, products.id),
        eq(productLocalizations.locale, "en"),
      ),
    )
    .leftJoin(
      routes,
      and(
        eq(routes.entityId, products.id),
        eq(routes.entityType, "product"),
        eq(routes.isCurrent, true),
      ),
    )
    .leftJoin(seoMetadata, eq(seoMetadata.routeId, routes.id))
    .orderBy(desc(products.updatedAt));
}

export async function listAdminProducts() {
  return databaseConnection.kind === "pglite"
    ? queryProducts(databaseConnection.db)
    : queryProducts(databaseConnection.db);
}

async function queryProductDetail<TQueryResult extends PgQueryResultHKT>(
  db: AppDatabase<TQueryResult>,
  productId: string,
) {
  const rows = await db
    .select({
      id: products.id,
      name: productLocalizations.name,
      shortDescription: productLocalizations.shortDescription,
      fullDescription: productLocalizations.fullDescription,
      status: products.status,
      productCode: products.productCode,
      supplierType: products.supplierType,
      composition: products.composition,
      weightGsm: products.weightGsm,
      widthCm: products.widthCm,
      fabricStyle: products.fabricStyle,
      colorOptions: products.colorOptions,
      moqNote: products.moqNote,
      customAvailable: products.customAvailable,
      sampleAvailable: products.sampleAvailable,
      realProductBasis: products.realProductBasis,
      realProductEvidenceNote: products.realProductEvidenceNote,
      routeId: routes.id,
      path: routes.path,
      seoTitle: seoMetadata.title,
      metaDescription: seoMetadata.metaDescription,
      focusKeyword: seoMetadata.focusKeyword,
      indexStatus: seoMetadata.indexStatus,
    })
    .from(products)
    .innerJoin(
      productLocalizations,
      and(
        eq(productLocalizations.productId, products.id),
        eq(productLocalizations.locale, "en"),
      ),
    )
    .innerJoin(
      routes,
      and(
        eq(routes.entityId, products.id),
        eq(routes.entityType, "product"),
        eq(routes.isCurrent, true),
      ),
    )
    .innerJoin(seoMetadata, eq(seoMetadata.routeId, routes.id))
    .where(eq(products.id, productId))
    .limit(1);
  return rows[0] ?? null;
}

export async function getAdminProduct(productId: string) {
  return databaseConnection.kind === "pglite"
    ? queryProductDetail(databaseConnection.db, productId)
    : queryProductDetail(databaseConnection.db, productId);
}

async function queryTaxonomy<TQueryResult extends PgQueryResultHKT>(
  db: AppDatabase<TQueryResult>,
) {
  return db
    .select({
      id: taxonomyTerms.id,
      name: taxonomyTermLocalizations.name,
      dimension: taxonomyTerms.dimension,
    })
    .from(taxonomyTerms)
    .innerJoin(
      taxonomyTermLocalizations,
      and(
        eq(taxonomyTermLocalizations.taxonomyTermId, taxonomyTerms.id),
        eq(taxonomyTermLocalizations.locale, "en"),
      ),
    )
    .where(eq(taxonomyTerms.isActive, true));
}

export async function listAdminTaxonomy() {
  return databaseConnection.kind === "pglite"
    ? queryTaxonomy(databaseConnection.db)
    : queryTaxonomy(databaseConnection.db);
}

async function queryReadyAssets<TQueryResult extends PgQueryResultHKT>(
  db: AppDatabase<TQueryResult>,
) {
  return db
    .select({
      id: assets.id,
      fileName: assets.originalFileName,
      category: assets.category,
      access: assets.access,
      status: assets.status,
      sourceDeclarationEnabled: assets.sourceDeclarationEnabled,
      createdAt: assets.createdAt,
    })
    .from(assets)
    .orderBy(desc(assets.createdAt));
}

export async function listAdminAssets() {
  return databaseConnection.kind === "pglite"
    ? queryReadyAssets(databaseConnection.db)
    : queryReadyAssets(databaseConnection.db);
}

async function queryApplications<TQueryResult extends PgQueryResultHKT>(
  db: AppDatabase<TQueryResult>,
) {
  return db
    .select({
      id: applications.id,
      name: applicationLocalizations.name,
      status: applications.status,
      updatedAt: applications.updatedAt,
    })
    .from(applications)
    .innerJoin(
      applicationLocalizations,
      and(
        eq(applicationLocalizations.applicationId, applications.id),
        eq(applicationLocalizations.locale, "en"),
      ),
    )
    .orderBy(desc(applications.updatedAt));
}

export async function listAdminApplications() {
  return databaseConnection.kind === "pglite"
    ? queryApplications(databaseConnection.db)
    : queryApplications(databaseConnection.db);
}

async function queryContents<TQueryResult extends PgQueryResultHKT>(
  db: AppDatabase<TQueryResult>,
) {
  return db
    .select({
      id: contents.id,
      title: contentLocalizations.title,
      channel: contents.channel,
      status: contents.status,
      updatedAt: contents.updatedAt,
    })
    .from(contents)
    .innerJoin(
      contentLocalizations,
      and(
        eq(contentLocalizations.contentId, contents.id),
        eq(contentLocalizations.locale, "en"),
      ),
    )
    .orderBy(desc(contents.updatedAt));
}

export async function listAdminContents() {
  return databaseConnection.kind === "pglite"
    ? queryContents(databaseConnection.db)
    : queryContents(databaseConnection.db);
}

async function queryAuthors<TQueryResult extends PgQueryResultHKT>(
  db: AppDatabase<TQueryResult>,
) {
  return db
    .select({ id: authors.id, displayName: authors.displayName })
    .from(authors)
    .where(eq(authors.isActive, true));
}

export async function listAdminAuthors() {
  return databaseConnection.kind === "pglite"
    ? queryAuthors(databaseConnection.db)
    : queryAuthors(databaseConnection.db);
}

async function queryFabricEntries<TQueryResult extends PgQueryResultHKT>(
  db: AppDatabase<TQueryResult>,
) {
  return db
    .select({
      id: fabricLibraryEntries.id,
      title: fabricLibraryEntryLocalizations.title,
      status: fabricLibraryEntries.status,
      updatedAt: fabricLibraryEntries.updatedAt,
    })
    .from(fabricLibraryEntries)
    .innerJoin(
      fabricLibraryEntryLocalizations,
      and(
        eq(
          fabricLibraryEntryLocalizations.fabricEntryId,
          fabricLibraryEntries.id,
        ),
        eq(fabricLibraryEntryLocalizations.locale, "en"),
      ),
    )
    .orderBy(desc(fabricLibraryEntries.updatedAt));
}

export async function listAdminFabricEntries() {
  return databaseConnection.kind === "pglite"
    ? queryFabricEntries(databaseConnection.db)
    : queryFabricEntries(databaseConnection.db);
}

async function queryCompanyFacts<TQueryResult extends PgQueryResultHKT>(
  db: AppDatabase<TQueryResult>,
) {
  return db.select().from(companyFacts).orderBy(desc(companyFacts.updatedAt));
}

export async function listAdminCompanyFacts() {
  return databaseConnection.kind === "pglite"
    ? queryCompanyFacts(databaseConnection.db)
    : queryCompanyFacts(databaseConnection.db);
}

async function querySeoRoutes<TQueryResult extends PgQueryResultHKT>(
  db: AppDatabase<TQueryResult>,
) {
  return db
    .select({
      id: routes.id,
      path: routes.path,
      entityType: routes.entityType,
      title: seoMetadata.title,
      indexStatus: seoMetadata.indexStatus,
      canonicalPath: seoMetadata.canonicalPath,
    })
    .from(routes)
    .leftJoin(seoMetadata, eq(seoMetadata.routeId, routes.id))
    .where(eq(routes.isCurrent, true))
    .orderBy(routes.path);
}

export async function listAdminSeoRoutes() {
  return databaseConnection.kind === "pglite"
    ? querySeoRoutes(databaseConnection.db)
    : querySeoRoutes(databaseConnection.db);
}
