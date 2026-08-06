import { and, desc, eq, inArray } from "drizzle-orm";
import type { PgQueryResultHKT } from "drizzle-orm/pg-core/session";

import { databaseConnection } from "@/db/client";
import type { Actor } from "@/catalog/product-service";
import type { UserRole } from "@/auth/permissions";
import { requireEditorialResourceAccess } from "@/admin/preview-policy";
import { publicProductEligibilityConditions } from "@/catalog/product-eligibility";
import { requireInquiryRecordAccess } from "@/crm/authorization";
import {
  applicationLocalizations,
  applications,
  assets,
  auditLogs,
  authors,
  contentLocalizations,
  contentAssets,
  contents,
  companyFacts,
  editorialRevisions,
  fabricLibraryEntries,
  fabricLibraryEntryApplications,
  fabricLibraryEntryAssets,
  fabricLibraryEntryLocalizations,
  fabricLibraryEntryProducts,
  featureFlags,
  contacts,
  customerActivities,
  inquiries,
  inquiryAssets,
  inquiryStatusHistory,
  organizations,
  productApplications,
  productAssets,
  productFaqs,
  productFeatures,
  productFieldReviews,
  productLocalizations,
  productTagAssignments,
  productTags,
  productTaxonomyTerms,
  products,
  routes,
  seoMetadata,
  systemSettings,
  taxonomyTermLocalizations,
  taxonomyTerms,
  users,
} from "@/db/schema";
import type { AppDatabase } from "@/db/types";
import { currentPublicCompanyFactConditions } from "@/content/company-facts-service";
import { SYSTEM_PUBLIC_ROUTES } from "@/seo/system-public-routes";
import {
  resolveStaticPageLiveAuthority,
  staticPageConfigSchema,
  type StaticPageConfig,
} from "@/content/static-page-projection";

function objectRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null
    ? value as Record<string, unknown>
    : null;
}

function nestedRevisionChanges(snapshot: unknown): Record<string, unknown>[] {
  const root = objectRecord(snapshot);
  if (!root) return [];
  const pending = Array.isArray(root.pendingChanges)
    ? root.pendingChanges.flatMap((value) => {
        const record = objectRecord(value);
        return record ? [record] : [];
      })
    : [];
  return [root, ...pending];
}

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
      publicationRemediationRequired: products.publicationRemediationRequired,
      publicationRemediationReason: products.publicationRemediationReason,
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
    .leftJoin(seoMetadata, eq(seoMetadata.routeId, routes.id))
    .orderBy(desc(products.updatedAt));
}

export async function listAdminProducts(role: UserRole) {
  requireEditorialResourceAccess(role, "product", "manage");
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
      structuredBlocks: productLocalizations.structuredBlocks,
      editorDocumentVersion: productLocalizations.editorDocumentVersion,
      status: products.status,
      productCode: products.productCode,
      supplierType: products.supplierType,
      composition: products.composition,
      weightGsm: products.weightGsm,
      widthCm: products.widthCm,
      fabricStyle: products.fabricStyle,
      colorOptions: products.colorOptions,
      moqNote: products.moqNote,
      moqValue: products.moqValue,
      moqUnit: products.moqUnit,
      customAvailable: products.customAvailable,
      sampleAvailable: products.sampleAvailable,
      colorOptionsDisplay: products.colorOptionsDisplay,
      customAvailableDisplay: products.customAvailableDisplay,
      sampleAvailableDisplay: products.sampleAvailableDisplay,
      moqNoteDisplay: products.moqNoteDisplay,
      realProductBasis: products.realProductBasis,
      realProductEvidenceNote: products.realProductEvidenceNote,
      publicationRemediationRequired: products.publicationRemediationRequired,
      publicationRemediationReason: products.publicationRemediationReason,
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
    .leftJoin(
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
  const product = rows[0];
  if (!product) return null;
  const [taxonomy, productApplicationRows, assetRows, tagRows, featureRows, faqRows, reviewRows, revisions] =
    await Promise.all([
      db
        .select({ taxonomyTermId: productTaxonomyTerms.taxonomyTermId, isPrimary: productTaxonomyTerms.isPrimary })
        .from(productTaxonomyTerms)
        .where(eq(productTaxonomyTerms.productId, productId)),
      db
        .select({ applicationId: productApplications.applicationId })
        .from(productApplications)
        .where(eq(productApplications.productId, productId)),
      db
        .select({
          assetId: productAssets.assetId,
          role: productAssets.role,
          sortOrder: productAssets.sortOrder,
          altText: productAssets.altText,
          caption: productAssets.caption,
          isVisible: productAssets.isVisible,
        })
        .from(productAssets)
        .where(eq(productAssets.productId, productId))
        .orderBy(productAssets.sortOrder),
      db
        .select({ name: productTags.name })
        .from(productTagAssignments)
        .innerJoin(productTags, eq(productTags.id, productTagAssignments.tagId))
        .where(eq(productTagAssignments.productId, productId)),
      db
        .select({ label: productFeatures.label })
        .from(productFeatures)
        .where(eq(productFeatures.productId, productId))
        .orderBy(productFeatures.sortOrder),
      db
        .select({ question: productFaqs.question, answer: productFaqs.answer })
        .from(productFaqs)
        .where(eq(productFaqs.productId, productId))
        .orderBy(productFaqs.sortOrder),
      db
        .select({ fieldName: productFieldReviews.fieldName, status: productFieldReviews.verificationStatus })
        .from(productFieldReviews)
        .where(eq(productFieldReviews.productId, productId)),
      db
        .select({ id: editorialRevisions.id, versionNumber: editorialRevisions.versionNumber, status: editorialRevisions.status, kind: editorialRevisions.snapshot, changeSummary: editorialRevisions.changeSummary, createdAt: editorialRevisions.createdAt })
        .from(editorialRevisions)
        .where(and(eq(editorialRevisions.entityType, "product"), eq(editorialRevisions.entityId, productId)))
        .orderBy(desc(editorialRevisions.versionNumber)),
    ]);
  const draft = revisions.find((revision) => revision.status === "draft");
  const changes = nestedRevisionChanges(draft?.kind);
  const editorial = changes.find((change) => change.kind === "editorial_blocks");
  const facts = changes.find((change) => change.kind === "facts");
  const structure = changes.find((change) => change.kind === "structure");
  const seo = changes.find((change) => change.kind === "seo");
  const pendingMedia = Array.isArray(structure?.media)
    ? structure.media as typeof assetRows
    : null;
  const pendingTaxonomy = structure && typeof structure.primaryTaxonomyTermId === "string" &&
      Array.isArray(structure.additionalTaxonomyTermIds)
    ? [
        { taxonomyTermId: structure.primaryTaxonomyTermId, isPrimary: true },
        ...structure.additionalTaxonomyTermIds.flatMap((value) =>
          typeof value === "string"
            ? [{ taxonomyTermId: value, isPrimary: false }]
            : [],
        ),
      ]
    : null;
  const factualValue = <TValue,>(key: string, fallback: TValue): TValue =>
    facts && key in facts ? facts[key] as TValue : fallback;
  const structureValue = <TValue,>(key: string, fallback: TValue): TValue =>
    structure && key in structure ? structure[key] as TValue : fallback;
  return {
    ...product,
    name: typeof editorial?.name === "string" ? editorial.name : product.name,
    shortDescription: typeof editorial?.shortDescription === "string" || editorial?.shortDescription === null
      ? editorial.shortDescription
      : product.shortDescription,
    structuredBlocks: editorial?.document ?? product.structuredBlocks,
    productCode: factualValue("productCode", product.productCode),
    supplierType: factualValue("supplierType", product.supplierType),
    composition: factualValue("composition", product.composition),
    weightGsm: factualValue("weightGsm", product.weightGsm),
    widthCm: factualValue("widthCm", product.widthCm),
    fabricStyle: factualValue("fabricStyle", product.fabricStyle),
    colorOptions: factualValue("colorOptions", product.colorOptions),
    moqNote: factualValue("moqNote", product.moqNote),
    moqValue: factualValue("moqValue", product.moqValue),
    moqUnit: factualValue("moqUnit", product.moqUnit),
    customAvailable: factualValue("customAvailable", product.customAvailable),
    sampleAvailable: factualValue("sampleAvailable", product.sampleAvailable),
    seoTitle: typeof seo?.title === "string" || seo?.title === null ? seo.title : product.seoTitle,
    metaDescription: typeof seo?.metaDescription === "string" || seo?.metaDescription === null ? seo.metaDescription : product.metaDescription,
    focusKeyword: typeof seo?.focusKeyword === "string" || seo?.focusKeyword === null ? seo.focusKeyword : product.focusKeyword,
    taxonomy: pendingTaxonomy ?? taxonomy,
    applicationIds: Array.isArray(structure?.applicationIds)
      ? structure.applicationIds.filter((value): value is string => typeof value === "string")
      : productApplicationRows.map((row) => row.applicationId),
    assets: pendingMedia ?? assetRows,
    tags: Array.isArray(structure?.tagNames)
      ? structure.tagNames.filter((value): value is string => typeof value === "string")
      : tagRows.map((row) => row.name),
    features: Array.isArray(structure?.features)
      ? structure.features.filter((value): value is string => typeof value === "string")
      : featureRows.map((row) => row.label),
    faqs: Array.isArray(structure?.faqs) ? structure.faqs as typeof faqRows : faqRows,
    colorOptionsDisplay: structureValue("colorOptionsDisplay", product.colorOptionsDisplay),
    customAvailableDisplay: structureValue("customAvailableDisplay", product.customAvailableDisplay),
    sampleAvailableDisplay: structureValue("sampleAvailableDisplay", product.sampleAvailableDisplay),
    moqNoteDisplay: structureValue("moqNoteDisplay", product.moqNoteDisplay),
    fieldReviews: reviewRows,
    revisions,
  };
}

export async function getAdminProduct(productId: string, role: UserRole) {
  requireEditorialResourceAccess(role, "product", "manage");
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
      description: taxonomyTermLocalizations.description,
      dimension: taxonomyTerms.dimension,
      productCodePrefix: taxonomyTerms.productCodePrefix,
      isActive: taxonomyTerms.isActive,
      routeId: routes.id,
      path: routes.path,
      seoTitle: seoMetadata.title,
      metaDescription: seoMetadata.metaDescription,
      indexStatus: seoMetadata.indexStatus,
    })
    .from(taxonomyTerms)
    .innerJoin(
      taxonomyTermLocalizations,
      and(
        eq(taxonomyTermLocalizations.taxonomyTermId, taxonomyTerms.id),
        eq(taxonomyTermLocalizations.locale, "en"),
      ),
    )
    .leftJoin(
      routes,
      and(
        eq(routes.entityType, "taxonomy"),
        eq(routes.entityId, taxonomyTerms.id),
        eq(routes.isCurrent, true),
      ),
    )
    .leftJoin(seoMetadata, eq(seoMetadata.routeId, routes.id));
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
      storagePartition: assets.storagePartition,
      status: assets.status,
      scanStatus: assets.scanStatus,
      detectedMimeType: assets.detectedMimeType,
      deletedAt: assets.deletedAt,
      effectiveRightsDecision: assets.effectiveRightsDecision,
      publicUsePermission: assets.publicUsePermission,
      rightsPublicWebsiteAllowed: assets.rightsPublicWebsiteAllowed,
      declarationExpiryDate: assets.declarationExpiryDate,
      sourceDeclarationEnabled: assets.sourceDeclarationEnabled,
      subjectRelationship: assets.subjectRelationship,
      isCwtOwnedFacility: assets.isCwtOwnedFacility,
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

async function queryEditorialPickerOptions<TQueryResult extends PgQueryResultHKT>(
  db: AppDatabase<TQueryResult>,
) {
  const [productRows, contentRows, applicationRows, systemRouteRows] = await Promise.all([
    db
      .select({ id: products.id, label: productLocalizations.name, value: routes.path })
      .from(products)
      .innerJoin(productLocalizations, and(
        eq(productLocalizations.productId, products.id),
        eq(productLocalizations.locale, "en"),
      ))
      .innerJoin(routes, and(
        eq(routes.entityType, "product"),
        eq(routes.entityId, products.id),
        eq(routes.locale, "en"),
        eq(routes.isCurrent, true),
      ))
      .where(publicProductEligibilityConditions(db)),
    db
      .select({ id: contents.id, label: contentLocalizations.title, value: routes.path })
      .from(contents)
      .innerJoin(contentLocalizations, and(
        eq(contentLocalizations.contentId, contents.id),
        eq(contentLocalizations.locale, "en"),
      ))
      .innerJoin(routes, and(
        eq(routes.entityType, "content"),
        eq(routes.entityId, contents.id),
        eq(routes.locale, "en"),
        eq(routes.isCurrent, true),
      ))
      .where(eq(contents.status, "published")),
    db
      .select({ id: applications.id, label: applicationLocalizations.name, value: routes.path })
      .from(applications)
      .innerJoin(applicationLocalizations, and(
        eq(applicationLocalizations.applicationId, applications.id),
        eq(applicationLocalizations.locale, "en"),
      ))
      .innerJoin(routes, and(
        eq(routes.entityType, "application"),
        eq(routes.entityId, applications.id),
        eq(routes.locale, "en"),
        eq(routes.isCurrent, true),
      ))
      .where(eq(applications.status, "published")),
    db
      .select({ id: routes.id, path: routes.path, entityType: routes.entityType, entityId: routes.entityId })
      .from(routes)
      .where(and(
        inArray(routes.path, SYSTEM_PUBLIC_ROUTES.map((route) => route.path)),
        eq(routes.locale, "en"),
        eq(routes.isCurrent, true),
      )),
  ]);
  const systemRowsByPath = new Map(systemRouteRows.map((route) => [route.path, route]));
  const fixed = SYSTEM_PUBLIC_ROUTES.flatMap((definition) => {
    const route = systemRowsByPath.get(definition.path);
    return route && route.entityType === definition.entityType && route.entityId === null
      ? [{ id: route.id, label: definition.label, value: definition.path }]
      : [];
  });
  return {
    products: productRows.map((row) => ({ id: row.id, label: row.label, value: row.id })),
    contents: contentRows.map((row) => ({ id: row.id, label: row.label, value: row.id })),
    links: [
      ...fixed,
      ...productRows.map((row) => ({ id: `product-${row.id}`, label: `Product · ${row.label}`, value: row.value })),
      ...applicationRows.map((row) => ({ id: `application-${row.id}`, label: `Application · ${row.label}`, value: row.value })),
      ...contentRows.map((row) => ({ id: `content-${row.id}`, label: `Content · ${row.label}`, value: row.value })),
    ],
  };
}

export async function getEditorialPickerOptions() {
  return databaseConnection.kind === "pglite"
    ? queryEditorialPickerOptions(databaseConnection.db)
    : queryEditorialPickerOptions(databaseConnection.db);
}

function staticPageConfigFromRevision(
  snapshot: unknown,
  pageKey: "home" | "about",
): { config: StaticPageConfig; draftVersion: number | null } | null {
  const direct = staticPageConfigSchema.safeParse(snapshot);
  if (direct.success && direct.data.pageKey === pageKey) {
    return { config: direct.data, draftVersion: null };
  }
  if (typeof snapshot !== "object" || snapshot === null || !("config" in snapshot)) return null;
  const wrapped = staticPageConfigSchema.safeParse(snapshot.config);
  if (!wrapped.success || wrapped.data.pageKey !== pageKey) return null;
  return {
    config: wrapped.data,
    draftVersion: "draftVersion" in snapshot && typeof snapshot.draftVersion === "number"
      ? snapshot.draftVersion
      : null,
  };
}

async function queryAdminStaticPage<TQueryResult extends PgQueryResultHKT>(
  db: AppDatabase<TQueryResult>,
  pageKey: "home" | "about",
) {
  const settingRows = await db
    .select({ id: systemSettings.id, value: systemSettings.value, updatedAt: systemSettings.updatedAt, updatedByUserId: systemSettings.updatedByUserId })
    .from(systemSettings)
    .where(eq(systemSettings.key, `site_page.${pageKey}`))
    .limit(1);
  const setting = settingRows[0];
  const revisions = setting ? await db
    .select({
      id: editorialRevisions.id,
      status: editorialRevisions.status,
      versionNumber: editorialRevisions.versionNumber,
      snapshot: editorialRevisions.snapshot,
      changeSummary: editorialRevisions.changeSummary,
      createdAt: editorialRevisions.createdAt,
      createdByUserId: editorialRevisions.createdByUserId,
    })
    .from(editorialRevisions)
    .where(and(
      eq(editorialRevisions.entityType, "static_page"),
      eq(editorialRevisions.entityId, setting.id),
      eq(editorialRevisions.locale, "en"),
    ))
    .orderBy(desc(editorialRevisions.versionNumber)) : [];
  const pendingRow = revisions.find((revision) => revision.status === "draft" || revision.status === "in_review");
  const liveAuthority = resolveStaticPageLiveAuthority(
    pageKey,
    setting?.value ?? null,
    revisions.some((revision) => revision.status === "applied"),
  );
  const pending = pendingRow ? staticPageConfigFromRevision(pendingRow.snapshot, pageKey) : null;
  const facts = await db
    .select({ id: companyFacts.id, key: companyFacts.factKey, statement: companyFacts.statement })
    .from(companyFacts)
    .where(currentPublicCompanyFactConditions());
  const modifierIds = [...new Set([
    setting?.updatedByUserId,
    pendingRow?.createdByUserId,
  ].filter((value): value is string => Boolean(value)))];
  const modifierRows = modifierIds.length
    ? await db.select({ id: users.id, name: users.displayName }).from(users).where(inArray(users.id, modifierIds))
    : [];
  const modifierNames = new Map(modifierRows.map((row) => [row.id, row.name]));
  return {
    settingId: setting?.id ?? null,
    liveAuthorityState: liveAuthority.state,
    liveConfig: liveAuthority.config,
    liveUpdatedAt: setting?.updatedAt ?? null,
    liveUpdatedByUserId: setting?.updatedByUserId ?? null,
    liveUpdatedByName: setting?.updatedByUserId
      ? modifierNames.get(setting.updatedByUserId) ?? setting.updatedByUserId
      : null,
    pendingRevision: pendingRow && pending ? {
      id: pendingRow.id,
      status: pendingRow.status,
      versionNumber: pendingRow.versionNumber,
      config: pending.config,
      draftVersion: pending.draftVersion,
      changeSummary: pendingRow.changeSummary,
      createdAt: pendingRow.createdAt,
      createdByUserId: pendingRow.createdByUserId,
      createdByName: pendingRow.createdByUserId
        ? modifierNames.get(pendingRow.createdByUserId) ?? pendingRow.createdByUserId
        : null,
    } : null,
    revisions,
    facts,
  };
}

export async function getAdminStaticPage(pageKey: "home" | "about", role: UserRole) {
  requireEditorialResourceAccess(role, "static_page", "manage");
  return databaseConnection.kind === "pglite"
    ? queryAdminStaticPage(databaseConnection.db, pageKey)
    : queryAdminStaticPage(databaseConnection.db, pageKey);
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

async function queryApplicationDetail<TQueryResult extends PgQueryResultHKT>(
  db: AppDatabase<TQueryResult>,
  applicationId: string,
) {
  const rows = await db
    .select({
      id: applications.id,
      name: applicationLocalizations.name,
      shortDescription: applicationLocalizations.shortDescription,
      body: applicationLocalizations.body,
      status: applications.status,
      routeId: routes.id,
      path: routes.path,
      seoTitle: seoMetadata.title,
      metaDescription: seoMetadata.metaDescription,
      focusKeyword: seoMetadata.focusKeyword,
      indexStatus: seoMetadata.indexStatus,
    })
    .from(applications)
    .innerJoin(
      applicationLocalizations,
      and(
        eq(applicationLocalizations.applicationId, applications.id),
        eq(applicationLocalizations.locale, "en"),
      ),
    )
    .leftJoin(
      routes,
      and(
        eq(routes.entityType, "application"),
        eq(routes.entityId, applications.id),
        eq(routes.isCurrent, true),
      ),
    )
    .leftJoin(seoMetadata, eq(seoMetadata.routeId, routes.id))
    .where(eq(applications.id, applicationId))
    .limit(1);
  const application = rows[0];
  if (!application) return null;
  const [relations, revisions] = await Promise.all([
    db
      .select({ productId: productApplications.productId })
      .from(productApplications)
      .where(eq(productApplications.applicationId, applicationId)),
    db
      .select()
      .from(editorialRevisions)
      .where(
        and(
          eq(editorialRevisions.entityType, "application"),
          eq(editorialRevisions.entityId, applicationId),
        ),
      )
      .orderBy(desc(editorialRevisions.versionNumber)),
  ]);
  return {
    ...application,
    productIds: relations.map((relation) => relation.productId),
    revisions,
  };
}

export async function getAdminApplication(applicationId: string) {
  return databaseConnection.kind === "pglite"
    ? queryApplicationDetail(databaseConnection.db, applicationId)
    : queryApplicationDetail(databaseConnection.db, applicationId);
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

export async function listAdminContents(role: UserRole) {
  requireEditorialResourceAccess(role, "content", "manage");
  return databaseConnection.kind === "pglite"
    ? queryContents(databaseConnection.db)
    : queryContents(databaseConnection.db);
}

async function queryContentDetail<TQueryResult extends PgQueryResultHKT>(
  db: AppDatabase<TQueryResult>,
  contentId: string,
) {
  const rows = await db
    .select({
      id: contents.id,
      channel: contents.channel,
      type: contents.type,
      status: contents.status,
      authorId: contents.authorId,
      title: contentLocalizations.title,
      excerpt: contentLocalizations.excerpt,
      body: contentLocalizations.body,
      structuredBlocks: contentLocalizations.structuredBlocks,
      editorDocumentVersion: contentLocalizations.editorDocumentVersion,
      routeId: routes.id,
      path: routes.path,
      seoTitle: seoMetadata.title,
      metaDescription: seoMetadata.metaDescription,
      focusKeyword: seoMetadata.focusKeyword,
      indexStatus: seoMetadata.indexStatus,
    })
    .from(contents)
    .innerJoin(
      contentLocalizations,
      and(
        eq(contentLocalizations.contentId, contents.id),
        eq(contentLocalizations.locale, "en"),
      ),
    )
    .innerJoin(
      routes,
      and(
        eq(routes.entityType, "content"),
        eq(routes.entityId, contents.id),
        eq(routes.isCurrent, true),
      ),
    )
    .innerJoin(seoMetadata, eq(seoMetadata.routeId, routes.id))
    .where(eq(contents.id, contentId))
    .limit(1);
  const content = rows[0];
  if (!content) return null;
  const [assetRows, revisions] = await Promise.all([
    db
      .select({
        assetId: contentAssets.assetId,
        role: contentAssets.role,
        sortOrder: contentAssets.sortOrder,
        altText: contentAssets.altText,
        caption: contentAssets.caption,
        isVisible: contentAssets.isVisible,
        blockKey: contentAssets.blockKey,
      })
      .from(contentAssets)
      .where(eq(contentAssets.contentId, contentId))
      .orderBy(contentAssets.sortOrder),
    db
      .select()
      .from(editorialRevisions)
      .where(and(eq(editorialRevisions.entityType, "content"), eq(editorialRevisions.entityId, contentId)))
      .orderBy(desc(editorialRevisions.versionNumber)),
  ]);
  const draft = revisions.find((revision) => revision.status === "draft");
  const snapshot = objectRecord(draft?.snapshot);
  const media = Array.isArray(snapshot?.media) ? snapshot.media as typeof assetRows : null;
  const seo = objectRecord(snapshot?.seo);
  return {
    ...content,
    title: typeof snapshot?.title === "string" ? snapshot.title : content.title,
    excerpt: typeof snapshot?.excerpt === "string" || snapshot?.excerpt === null
      ? snapshot.excerpt
      : content.excerpt,
    structuredBlocks: snapshot?.document ?? content.structuredBlocks,
    authorId: typeof snapshot?.authorId === "string" ? snapshot.authorId : content.authorId,
    type: typeof snapshot?.type === "string"
      ? snapshot.type as typeof content.type
      : content.type,
    seoTitle: typeof seo?.title === "string" || seo?.title === null ? seo.title : content.seoTitle,
    metaDescription: typeof seo?.metaDescription === "string" || seo?.metaDescription === null
      ? seo.metaDescription
      : content.metaDescription,
    focusKeyword: typeof seo?.focusKeyword === "string" || seo?.focusKeyword === null
      ? seo.focusKeyword
      : content.focusKeyword,
    assets: media ?? assetRows,
    revisions,
  };
}

export async function getAdminContent(contentId: string, role: UserRole) {
  requireEditorialResourceAccess(role, "content", "manage");
  return databaseConnection.kind === "pglite"
    ? queryContentDetail(databaseConnection.db, contentId)
    : queryContentDetail(databaseConnection.db, contentId);
}

async function queryAuthors<TQueryResult extends PgQueryResultHKT>(
  db: AppDatabase<TQueryResult>,
) {
  return db
    .select({
      id: authors.id,
      internalKey: authors.internalKey,
      displayName: authors.displayName,
      bio: authors.bio,
      isOrganization: authors.isOrganization,
      isActive: authors.isActive,
    })
    .from(authors)
    .orderBy(authors.displayName);
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

async function queryFabricEntryDetail<TQueryResult extends PgQueryResultHKT>(
  db: AppDatabase<TQueryResult>,
  entryId: string,
) {
  const rows = await db
    .select({
      id: fabricLibraryEntries.id,
      status: fabricLibraryEntries.status,
      title: fabricLibraryEntryLocalizations.title,
      description: fabricLibraryEntryLocalizations.description,
      independentValueConfirmedAt: fabricLibraryEntries.independentValueConfirmedAt,
      routeId: routes.id,
      path: routes.path,
      seoTitle: seoMetadata.title,
      metaDescription: seoMetadata.metaDescription,
      focusKeyword: seoMetadata.focusKeyword,
      indexStatus: seoMetadata.indexStatus,
    })
    .from(fabricLibraryEntries)
    .innerJoin(
      fabricLibraryEntryLocalizations,
      and(
        eq(fabricLibraryEntryLocalizations.fabricEntryId, fabricLibraryEntries.id),
        eq(fabricLibraryEntryLocalizations.locale, "en"),
      ),
    )
    .innerJoin(
      routes,
      and(
        eq(routes.entityType, "fabric_entry"),
        eq(routes.entityId, fabricLibraryEntries.id),
        eq(routes.isCurrent, true),
      ),
    )
    .innerJoin(seoMetadata, eq(seoMetadata.routeId, routes.id))
    .where(eq(fabricLibraryEntries.id, entryId))
    .limit(1);
  const entry = rows[0];
  if (!entry) return null;
  const [assetRows, productRows, applicationRows, revisions] = await Promise.all([
    db
      .select({ assetId: fabricLibraryEntryAssets.assetId, role: fabricLibraryEntryAssets.role, sortOrder: fabricLibraryEntryAssets.sortOrder })
      .from(fabricLibraryEntryAssets)
      .where(eq(fabricLibraryEntryAssets.fabricEntryId, entryId))
      .orderBy(fabricLibraryEntryAssets.sortOrder),
    db
      .select({ productId: fabricLibraryEntryProducts.productId })
      .from(fabricLibraryEntryProducts)
      .where(eq(fabricLibraryEntryProducts.fabricEntryId, entryId)),
    db
      .select({ applicationId: fabricLibraryEntryApplications.applicationId })
      .from(fabricLibraryEntryApplications)
      .where(eq(fabricLibraryEntryApplications.fabricEntryId, entryId)),
    db
      .select()
      .from(editorialRevisions)
      .where(and(eq(editorialRevisions.entityType, "fabric_entry"), eq(editorialRevisions.entityId, entryId)))
      .orderBy(desc(editorialRevisions.versionNumber)),
  ]);
  return {
    ...entry,
    assets: assetRows,
    productIds: productRows.map((row) => row.productId),
    applicationIds: applicationRows.map((row) => row.applicationId),
    revisions,
  };
}

export async function getAdminFabricEntry(entryId: string) {
  return databaseConnection.kind === "pglite"
    ? queryFabricEntryDetail(databaseConnection.db, entryId)
    : queryFabricEntryDetail(databaseConnection.db, entryId);
}

export async function getAdminCompanyFact(factId: string) {
  const query = async <TQueryResult extends PgQueryResultHKT>(db: AppDatabase<TQueryResult>) => {
    const rows = await db.select().from(companyFacts).where(eq(companyFacts.id, factId)).limit(1);
    return rows[0] ?? null;
  };
  return databaseConnection.kind === "pglite"
    ? query(databaseConnection.db)
    : query(databaseConnection.db);
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

async function queryAuditLogs<TQueryResult extends PgQueryResultHKT>(
  db: AppDatabase<TQueryResult>,
) {
  return db
    .select({
      id: auditLogs.id,
      action: auditLogs.action,
      entityType: auditLogs.entityType,
      entityId: auditLogs.entityId,
      actorUserId: auditLogs.actorUserId,
      requestId: auditLogs.requestId,
      createdAt: auditLogs.createdAt,
    })
    .from(auditLogs)
    .orderBy(desc(auditLogs.createdAt))
    .limit(250);
}

export async function listAdminAuditLogs() {
  return databaseConnection.kind === "pglite"
    ? queryAuditLogs(databaseConnection.db)
    : queryAuditLogs(databaseConnection.db);
}

async function queryFeatureFlags<TQueryResult extends PgQueryResultHKT>(
  db: AppDatabase<TQueryResult>,
) {
  return db.select().from(featureFlags).orderBy(featureFlags.key);
}

export async function listAdminFeatureFlags() {
  return databaseConnection.kind === "pglite"
    ? queryFeatureFlags(databaseConnection.db)
    : queryFeatureFlags(databaseConnection.db);
}

async function queryInquiries<TQueryResult extends PgQueryResultHKT>(
  db: AppDatabase<TQueryResult>,
  actor: Actor,
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
    .where(actor.role === "admin" ? undefined : eq(inquiries.ownerUserId, actor.userId))
    .orderBy(desc(inquiries.createdAt));
}

export async function listAdminInquiries(actor: Actor) {
  return databaseConnection.kind === "pglite"
    ? queryInquiries(databaseConnection.db, actor)
    : queryInquiries(databaseConnection.db, actor);
}

async function queryInquiryDetail<TQueryResult extends PgQueryResultHKT>(
  db: AppDatabase<TQueryResult>,
  actor: Actor,
  inquiryId: string,
) {
  await requireInquiryRecordAccess(db, actor, inquiryId, "read");
  const rows = await db
    .select({
      id: inquiries.id,
      contactId: contacts.id,
      contactName: contacts.name,
      email: contacts.email,
      countryCode: contacts.countryCode,
      whatsapp: contacts.whatsapp,
      submittedName: inquiries.submittedName,
      submittedEmail: inquiries.submittedEmail,
      submittedCountryCode: inquiries.submittedCountryCode,
      submittedWhatsapp: inquiries.submittedWhatsapp,
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
        direction: customerActivities.direction,
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

export async function getAdminInquiry(actor: Actor, inquiryId: string) {
  return databaseConnection.kind === "pglite"
    ? queryInquiryDetail(databaseConnection.db, actor, inquiryId)
    : queryInquiryDetail(databaseConnection.db, actor, inquiryId);
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
