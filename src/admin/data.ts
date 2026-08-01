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
  contacts,
  customerActivities,
  inquiries,
  inquiryAssets,
  inquiryStatusHistory,
  organizations,
  productLocalizations,
  products,
  routes,
  seoMetadata,
  taxonomyTermLocalizations,
  taxonomyTerms,
  users,
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

async function queryAssetDetail<TQueryResult extends PgQueryResultHKT>(
  db: AppDatabase<TQueryResult>,
  assetId: string,
) {
  const rows = await db.select().from(assets).where(eq(assets.id, assetId)).limit(1);
  return rows[0] ?? null;
}

export async function getAdminAsset(assetId: string) {
  return databaseConnection.kind === "pglite"
    ? queryAssetDetail(databaseConnection.db, assetId)
    : queryAssetDetail(databaseConnection.db, assetId);
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

async function queryInquiries<TQueryResult extends PgQueryResultHKT>(
  db: AppDatabase<TQueryResult>,
) {
  return db
    .select({
      id: inquiries.id,
      contactName: contacts.name,
      email: contacts.email,
      status: inquiries.status,
      priority: inquiries.priority,
      qualificationStatus: inquiries.qualificationStatus,
      ownerName: users.displayName,
      sourcePagePath: inquiries.sourcePagePath,
      createdAt: inquiries.createdAt,
    })
    .from(inquiries)
    .innerJoin(contacts, eq(contacts.id, inquiries.contactId))
    .leftJoin(users, eq(users.id, inquiries.ownerUserId))
    .orderBy(desc(inquiries.createdAt));
}

export async function listAdminInquiries() {
  return databaseConnection.kind === "pglite"
    ? queryInquiries(databaseConnection.db)
    : queryInquiries(databaseConnection.db);
}

async function queryInquiryDetail<TQueryResult extends PgQueryResultHKT>(
  db: AppDatabase<TQueryResult>,
  inquiryId: string,
) {
  const rows = await db
    .select({
      id: inquiries.id,
      contactId: contacts.id,
      contactName: contacts.name,
      email: contacts.email,
      countryCode: contacts.countryCode,
      whatsapp: contacts.whatsapp,
      description: inquiries.description,
      status: inquiries.status,
      priority: inquiries.priority,
      qualificationStatus: inquiries.qualificationStatus,
      ownerUserId: inquiries.ownerUserId,
      lostReason: inquiries.lostReason,
      sourcePagePath: inquiries.sourcePagePath,
      landingPagePath: inquiries.landingPagePath,
      referrer: inquiries.referrer,
      utmSource: inquiries.utmSource,
      utmMedium: inquiries.utmMedium,
      utmCampaign: inquiries.utmCampaign,
      lastNonDirectSource: inquiries.lastNonDirectSource,
      lastNonDirectMedium: inquiries.lastNonDirectMedium,
      lastNonDirectCampaign: inquiries.lastNonDirectCampaign,
      attributionConfidence: inquiries.attributionConfidence,
      createdAt: inquiries.createdAt,
      firstResponseAt: inquiries.firstResponseAt,
    })
    .from(inquiries)
    .innerJoin(contacts, eq(contacts.id, inquiries.contactId))
    .where(eq(inquiries.id, inquiryId))
    .limit(1);
  const inquiry = rows[0];
  if (!inquiry) return null;
  const [activities, history, files] = await Promise.all([
    db
      .select({
        id: customerActivities.id,
        type: customerActivities.type,
        content: customerActivities.content,
        operator: users.displayName,
        occurredAt: customerActivities.occurredAt,
      })
      .from(customerActivities)
      .leftJoin(users, eq(users.id, customerActivities.createdByUserId))
      .where(eq(customerActivities.inquiryId, inquiryId))
      .orderBy(desc(customerActivities.occurredAt)),
    db
      .select({
        id: inquiryStatusHistory.id,
        fromStatus: inquiryStatusHistory.fromStatus,
        toStatus: inquiryStatusHistory.toStatus,
        reason: inquiryStatusHistory.reason,
        changedAt: inquiryStatusHistory.changedAt,
      })
      .from(inquiryStatusHistory)
      .where(eq(inquiryStatusHistory.inquiryId, inquiryId))
      .orderBy(desc(inquiryStatusHistory.changedAt)),
    db
      .select({ id: assets.id, fileName: assets.originalFileName })
      .from(inquiryAssets)
      .innerJoin(assets, eq(assets.id, inquiryAssets.assetId))
      .where(eq(inquiryAssets.inquiryId, inquiryId)),
  ]);
  return { ...inquiry, activities, history, files };
}

export async function getAdminInquiry(inquiryId: string) {
  return databaseConnection.kind === "pglite"
    ? queryInquiryDetail(databaseConnection.db, inquiryId)
    : queryInquiryDetail(databaseConnection.db, inquiryId);
}

async function queryCrmOwners<TQueryResult extends PgQueryResultHKT>(
  db: AppDatabase<TQueryResult>,
) {
  return db
    .select({ id: users.id, displayName: users.displayName, role: users.role })
    .from(users)
    .where(eq(users.isActive, true));
}

export async function listCrmOwners() {
  const users = databaseConnection.kind === "pglite"
    ? await queryCrmOwners(databaseConnection.db)
    : await queryCrmOwners(databaseConnection.db);
  return users.filter((user) => user.role === "admin" || user.role === "sales");
}

async function queryContacts<TQueryResult extends PgQueryResultHKT>(
  db: AppDatabase<TQueryResult>,
) {
  return db
    .select({
      id: contacts.id,
      name: contacts.name,
      email: contacts.email,
      countryCode: contacts.countryCode,
      whatsapp: contacts.whatsapp,
      organizationName: organizations.name,
      organizationId: organizations.id,
      updatedAt: contacts.updatedAt,
    })
    .from(contacts)
    .leftJoin(organizations, eq(organizations.id, contacts.organizationId))
    .orderBy(desc(contacts.updatedAt));
}

export async function listAdminContacts() {
  return databaseConnection.kind === "pglite"
    ? queryContacts(databaseConnection.db)
    : queryContacts(databaseConnection.db);
}

async function queryOrganizations<TQueryResult extends PgQueryResultHKT>(
  db: AppDatabase<TQueryResult>,
) {
  return db.select().from(organizations).orderBy(organizations.name);
}

export async function listAdminOrganizations() {
  return databaseConnection.kind === "pglite"
    ? queryOrganizations(databaseConnection.db)
    : queryOrganizations(databaseConnection.db);
}
