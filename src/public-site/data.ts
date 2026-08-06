import { and, asc, countDistinct, desc, eq, inArray, sql } from "drizzle-orm";
import type { PgQueryResultHKT } from "drizzle-orm/pg-core/session";

import {
  applicationLocalizations,
  applications,
  assets,
  assetVariants,
  authors,
  contentLocalizations,
  contentAssets,
  contents,
  editorialRevisions,
  fabricLibraryEntries,
  fabricLibraryEntryAssets,
  fabricLibraryEntryLocalizations,
  fabricLibraryEntryProducts,
  productApplications,
  productAssets,
  productFaqs,
  productFeatures,
  productFieldReviews,
  productLocalizations,
  products,
  productTaxonomyTerms,
  redirects,
  routes,
  seoMetadata,
  sitePageAssets,
  systemSettings,
  taxonomyTermLocalizations,
  taxonomyTerms,
} from "@/db/schema";
import { databaseConnection } from "@/db/client";
import { listVerifiedPublicCompanyFacts } from "@/content/company-facts-service";
import type { AppDatabase } from "@/db/types";
import { createObjectStorage } from "@/storage";
import { parseBlockDocument } from "@/editorial/blocks";
import { resolveBlockPublicProjection } from "@/editorial/block-references";
import {
  hasRenderableStaticPageContent,
  isPersistedStaticPagePlacementLive,
  isStaticPageFactSensitivePlacement,
  resolveStaticPageLiveAuthority,
  type StaticPageConfig,
} from "@/content/static-page-projection";

import { resolveVisibleProductFields } from "./product-visibility";
import { assertPublicAssetCandidate } from "./public-asset-policy";
import {
  hasPubliclyEligibleProductForApplicationConditions,
  hasPubliclyEligibleProductForFabricEntryConditions,
  hasPubliclyEligibleProductForTaxonomyConditions,
  publicProductEligibilityConditions,
} from "@/catalog/product-eligibility";
import {
  publicImageRoles,
  publicReadyImageSqlConditions,
} from "@/uploads/asset-eligibility";
import { isCanonicalAssetVariantKey } from "@/uploads/asset-variant";

export interface PublicAsset {
  id: string;
  url: string;
  alt: string;
  caption: string | null;
  width: number | null;
  height: number | null;
  variants?: readonly PublicAssetVariant[];
}

export interface PublicAssetVariant {
  format: "avif" | "webp";
  url: string;
  width: number;
  height: number | null;
}

export async function getVerifiedPublicCompanyFacts() {
  return databaseConnection.kind === "pglite"
    ? listVerifiedPublicCompanyFacts(databaseConnection.db)
    : listVerifiedPublicCompanyFacts(databaseConnection.db);
}

export interface PublicStaticPagePlacement {
  placementKey: string;
  viewport: "desktop" | "mobile";
  sortOrder: number;
  focalX: number;
  focalY: number;
  overlayOpacity: number;
  asset: PublicAsset;
}

async function queryPublicStaticPage<TQueryResult extends PgQueryResultHKT>(
  db: AppDatabase<TQueryResult>,
  pageKey: "home" | "about",
): Promise<{
  authorityState: "bootstrap" | "live" | "invalid";
  config: StaticPageConfig | null;
  placements: PublicStaticPagePlacement[];
  facts: Array<{ key: string; statement: string }>;
  hasRenderableContent: boolean;
}> {
  const settingRows = await db
    .select({ id: systemSettings.id, value: systemSettings.value })
    .from(systemSettings)
    .where(eq(systemSettings.key, `site_page.${pageKey}`))
    .limit(1);
  const setting = settingRows[0];
  const appliedRows = setting ? await db
    .select({ id: editorialRevisions.id })
    .from(editorialRevisions)
    .where(and(
      eq(editorialRevisions.entityType, "static_page"),
      eq(editorialRevisions.entityId, setting.id),
      eq(editorialRevisions.locale, "en"),
      eq(editorialRevisions.status, "applied"),
    ))
    .limit(1) : [];
  const authority = resolveStaticPageLiveAuthority(
    pageKey,
    setting?.value ?? null,
    Boolean(appliedRows[0]),
  );
  const config = authority.config;
  const relationRows = setting && authority.state === "live" && config ? await db
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
      objectKey: assets.objectKey,
      storagePartition: assets.storagePartition,
      access: assets.access,
      status: assets.status,
      scanStatus: assets.scanStatus,
      deletedAt: assets.deletedAt,
      effectiveRightsDecision: assets.effectiveRightsDecision,
      publicUsePermission: assets.publicUsePermission,
      rightsPublicWebsiteAllowed: assets.rightsPublicWebsiteAllowed,
      declarationExpiryDate: assets.declarationExpiryDate,
      subjectRelationship: assets.subjectRelationship,
      isCwtOwnedFacility: assets.isCwtOwnedFacility,
      assetAltText: assets.altText,
      width: assets.width,
      height: assets.height,
    })
    .from(sitePageAssets)
    .innerJoin(assets, eq(assets.id, sitePageAssets.assetId))
    .where(and(
      eq(sitePageAssets.systemSettingId, setting.id),
      publicReadyImageSqlConditions(),
    )) : [];
  const placements: PublicStaticPagePlacement[] = [];
  for (const row of relationRows) {
    if (!config) continue;
    if (!isPersistedStaticPagePlacementLive(config, row)) continue;
    if (
      isStaticPageFactSensitivePlacement(row.placementKey) &&
      (row.subjectRelationship !== "cwt" || row.isCwtOwnedFacility !== true)
    ) continue;
    const configured = config.placements.find((placement) => (
      placement.assetId === row.assetId &&
      placement.placementKey === row.placementKey &&
      placement.viewport === row.viewport
    ));
    if (!configured || (row.viewport !== "desktop" && row.viewport !== "mobile")) continue;
    const asset = await toPublicAsset(db, {
      id: row.assetId,
      objectKey: row.objectKey,
      storagePartition: row.storagePartition,
      access: row.access,
      status: row.status,
      scanStatus: row.scanStatus,
      deletedAt: row.deletedAt,
      effectiveRightsDecision: row.effectiveRightsDecision,
      publicUsePermission: row.publicUsePermission,
      rightsPublicWebsiteAllowed: row.rightsPublicWebsiteAllowed,
      declarationExpiryDate: row.declarationExpiryDate,
      altText: row.altText ?? row.assetAltText,
      caption: row.caption,
      width: row.width,
      height: row.height,
    });
    placements.push({
      placementKey: row.placementKey,
      viewport: row.viewport,
      sortOrder: row.sortOrder,
      focalX: Number(row.focalX),
      focalY: Number(row.focalY),
      overlayOpacity: configured.overlayOpacity,
      asset,
    });
  }
  const verifiedFacts = await listVerifiedPublicCompanyFacts(db);
  const factKeys = config?.pageKey === "home"
    ? config.copy?.manufacturingStrength.factKeys ?? []
    : config?.pageKey === "about"
      ? config.copy?.ownedManufacturing.factKeys ?? []
      : [];
  const facts = factKeys.flatMap((key) => verifiedFacts.get(key)
    ? [{ key, statement: verifiedFacts.get(key)! }]
    : []);
  return {
    authorityState: authority.state,
    config,
    placements: placements.sort((left, right) => left.sortOrder - right.sortOrder),
    facts,
    hasRenderableContent: config
      ? hasRenderableStaticPageContent(
          config,
          new Set(facts.map((fact) => fact.key)),
          new Set(placements.map((placement) => placement.placementKey)),
        )
      : false,
  };
}

export async function getPublicStaticPage(pageKey: "home" | "about") {
  return databaseConnection.kind === "pglite"
    ? queryPublicStaticPage(databaseConnection.db, pageKey)
    : queryPublicStaticPage(databaseConnection.db, pageKey);
}

export class PublicStaticPageUnavailableError extends Error {
  constructor() {
    super("Public static page is temporarily unavailable.");
    this.name = "PublicStaticPageUnavailableError";
  }
}

type PublicStaticPageResult = Awaited<ReturnType<typeof getPublicStaticPage>>;

export function assertPublicStaticPageProjection<K extends "home" | "about">(
  page: PublicStaticPageResult,
  pageKey: K,
): Omit<PublicStaticPageResult, "config"> & {
  config: Extract<StaticPageConfig, { pageKey: K }>;
} {
  if (page.authorityState === "invalid" || !page.config || page.config.pageKey !== pageKey) {
    throw new PublicStaticPageUnavailableError();
  }
  return {
    ...page,
    config: page.config as Extract<StaticPageConfig, { pageKey: K }>,
  };
}

export async function requirePublicStaticPage<K extends "home" | "about">(
  pageKey: K,
): Promise<Omit<PublicStaticPageResult, "config"> & {
  config: Extract<StaticPageConfig, { pageKey: K }>;
}> {
  const page = await getPublicStaticPage(pageKey);
  try {
    return assertPublicStaticPageProjection(page, pageKey);
  } catch (error) {
    console.error("Public static page projection unavailable.", { pageKey });
    throw error;
  }
}

async function assetUrl(partition: string, assetId: string): Promise<string> {
  if (partition !== "public") {
    throw new Error("Public pages cannot create non-public Asset URLs.");
  }
  const storage = createObjectStorage();
  return storage.createPublicUrl(assetId);
}

async function toPublicAsset<TQueryResult extends PgQueryResultHKT>(
  db: AppDatabase<TQueryResult>,
  row: {
  id: string;
  objectKey: string;
  storagePartition: string;
  access: typeof assets.$inferSelect.access;
  status: typeof assets.$inferSelect.status;
  scanStatus: typeof assets.$inferSelect.scanStatus;
  deletedAt: Date | null;
  effectiveRightsDecision: typeof assets.$inferSelect.effectiveRightsDecision;
  publicUsePermission: typeof assets.$inferSelect.publicUsePermission;
  rightsPublicWebsiteAllowed: boolean | null;
  declarationExpiryDate: Date | null;
  altText: string | null;
  caption?: string | null;
  width: number | null;
  height: number | null;
  },
): Promise<PublicAsset> {
  assertPublicAssetCandidate(row);
  const baseUrl = await assetUrl(row.storagePartition, row.id);
  const variantRows = await db
    .select({
      format: assetVariants.format,
      variantKey: assetVariants.variantKey,
      width: assetVariants.width,
      height: assetVariants.height,
    })
    .from(assetVariants)
    .where(eq(assetVariants.sourceAssetId, row.id))
    .orderBy(asc(assetVariants.width), asc(assetVariants.variantKey));
  const variants: PublicAssetVariant[] = variantRows.flatMap((variant) => (
    (variant.format === "avif" || variant.format === "webp") &&
      variant.width !== null && variant.width > 0 &&
      isCanonicalAssetVariantKey(variant.variantKey)
      ? [{
          format: variant.format as "avif" | "webp",
          url: `${baseUrl}?variant=${encodeURIComponent(variant.variantKey)}`,
          width: variant.width,
          height: variant.height,
        }]
      : []
  ));
  return {
    id: row.id,
    url: baseUrl,
    alt: row.altText ?? "",
    caption: row.caption ?? null,
    width: row.width,
    height: row.height,
    variants,
  };
}

export interface PublicProductQueryOptions {
  limit?: number;
  offset?: number;
  productIds?: readonly string[];
}

export async function queryPublishedProducts<TQueryResult extends PgQueryResultHKT>(
  db: AppDatabase<TQueryResult>,
  input: number | PublicProductQueryOptions = {},
) {
  const options = typeof input === "number" ? { limit: input } : input;
  if (options.productIds?.length === 0) return [];
  let query = db
    .select({
      id: products.id,
      name: productLocalizations.name,
      shortDescription: productLocalizations.shortDescription,
      path: routes.path,
      indexStatus: seoMetadata.indexStatus,
      assetId: assets.id,
      objectKey: assets.objectKey,
      storagePartition: assets.storagePartition,
      assetAccess: assets.access,
      assetStatus: assets.status,
      assetScanStatus: assets.scanStatus,
      assetDeletedAt: assets.deletedAt,
      assetEffectiveRightsDecision: assets.effectiveRightsDecision,
      assetPublicUsePermission: assets.publicUsePermission,
      assetRightsPublicWebsiteAllowed: assets.rightsPublicWebsiteAllowed,
      assetDeclarationExpiryDate: assets.declarationExpiryDate,
      altText: assets.altText,
      placementAltText: productAssets.altText,
      placementCaption: productAssets.caption,
      width: assets.width,
      height: assets.height,
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
        eq(routes.entityType, "product"),
        eq(routes.entityId, products.id),
        eq(routes.isCurrent, true),
      ),
    )
    .innerJoin(seoMetadata, eq(seoMetadata.routeId, routes.id))
    .leftJoin(
      productAssets,
      and(
        eq(productAssets.productId, products.id),
        eq(productAssets.role, "hero"),
        eq(productAssets.isVisible, true),
      ),
    )
    .leftJoin(
      assets,
      and(
        eq(assets.id, productAssets.assetId),
        inArray(productAssets.role, [...publicImageRoles]),
        publicReadyImageSqlConditions(),
      ),
    )
    .where(and(
      publicProductEligibilityConditions(db),
      options.productIds ? inArray(products.id, [...options.productIds]) : undefined,
    ))
    .orderBy(desc(products.publishedAt), asc(products.id))
    .$dynamic();
  if (options.limit !== undefined) query = query.limit(options.limit);
  if (options.offset !== undefined) query = query.offset(options.offset);
  const rows = await query;
  return Promise.all(
    rows.map(async (row) => ({
      id: row.id,
      name: row.name,
      shortDescription: row.shortDescription,
      path: row.path,
      indexStatus: row.indexStatus,
      image:
        row.assetId &&
        row.objectKey &&
        row.storagePartition &&
        row.assetAccess &&
        row.assetStatus &&
        row.assetScanStatus
          ? await toPublicAsset(db, {
              id: row.assetId,
              objectKey: row.objectKey,
              storagePartition: row.storagePartition,
              access: row.assetAccess,
              status: row.assetStatus,
              scanStatus: row.assetScanStatus,
              deletedAt: row.assetDeletedAt,
              effectiveRightsDecision: row.assetEffectiveRightsDecision,
              publicUsePermission: row.assetPublicUsePermission,
              rightsPublicWebsiteAllowed: row.assetRightsPublicWebsiteAllowed,
              declarationExpiryDate: row.assetDeclarationExpiryDate,
              altText: row.placementAltText ?? row.altText,
              caption: row.placementCaption,
              width: row.width,
              height: row.height,
            })
          : null,
    })),
  );
}

export async function listPublishedProducts(limit?: number) {
  return databaseConnection.kind === "pglite"
    ? queryPublishedProducts(databaseConnection.db, limit)
    : queryPublishedProducts(databaseConnection.db, limit);
}

export const PUBLIC_PRODUCTS_PAGE_SIZE = 24;

export async function queryPublishedProductPage<
  TQueryResult extends PgQueryResultHKT,
>(
  db: AppDatabase<TQueryResult>,
  page: number,
  pageSize = PUBLIC_PRODUCTS_PAGE_SIZE,
) {
  if (!Number.isSafeInteger(page) || page < 1) {
    throw new RangeError("Product page must be a positive integer.");
  }
  const totalRows = await db
    .select({ value: countDistinct(products.id) })
    .from(products)
    .innerJoin(
      routes,
      and(
        eq(routes.entityType, "product"),
        eq(routes.entityId, products.id),
        eq(routes.locale, "en"),
        eq(routes.isCurrent, true),
      ),
    )
    .innerJoin(seoMetadata, eq(seoMetadata.routeId, routes.id))
    .where(publicProductEligibilityConditions(db));
  const total = totalRows[0]?.value ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  if (page > totalPages) return null;
  const items = await queryPublishedProducts(db, {
    limit: pageSize,
    offset: (page - 1) * pageSize,
  });
  return { items, page, pageSize, total, totalPages };
}

export async function getPublishedProductPage(page: number) {
  return databaseConnection.kind === "pglite"
    ? queryPublishedProductPage(databaseConnection.db, page)
    : queryPublishedProductPage(databaseConnection.db, page);
}

export async function queryProductByPath<TQueryResult extends PgQueryResultHKT>(
  db: AppDatabase<TQueryResult>,
  path: string,
) {
  const rows = await db
    .select({
      id: products.id,
      name: productLocalizations.name,
      shortDescription: productLocalizations.shortDescription,
      structuredBlocks: productLocalizations.structuredBlocks,
      blocksVersion: productLocalizations.blocksVersion,
      composition: products.composition,
      weightGsm: products.weightGsm,
      widthCm: products.widthCm,
      colorOptions: products.colorOptions,
      customAvailable: products.customAvailable,
      sampleAvailable: products.sampleAvailable,
      moqNote: products.moqNote,
      moqValue: products.moqValue,
      moqUnit: products.moqUnit,
      colorOptionsDisplay: products.colorOptionsDisplay,
      customAvailableDisplay: products.customAvailableDisplay,
      sampleAvailableDisplay: products.sampleAvailableDisplay,
      moqNoteDisplay: products.moqNoteDisplay,
      routeId: routes.id,
      path: routes.path,
      seoTitle: seoMetadata.title,
      metaDescription: seoMetadata.metaDescription,
      indexStatus: seoMetadata.indexStatus,
      canonicalPath: seoMetadata.canonicalPath,
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
        eq(routes.entityType, "product"),
        eq(routes.entityId, products.id),
        eq(routes.isCurrent, true),
        eq(routes.path, path),
      ),
    )
    .innerJoin(seoMetadata, eq(seoMetadata.routeId, routes.id))
    .where(publicProductEligibilityConditions(db))
    .limit(1);
  const product = rows[0];
  if (!product) return null;
  let narrativeBlocks;
  try {
    if (product.blocksVersion !== 1) return null;
    narrativeBlocks = parseBlockDocument(product.structuredBlocks, "product");
  } catch {
    return null;
  }
  let blockProjection;
  try {
    blockProjection = await resolveBlockPublicProjection(
      db,
      { type: "product", id: product.id },
      narrativeBlocks,
      { invalidReferences: "filter" },
    );
  } catch {
    return null;
  }
  const [
    imageRows,
    featureRows,
    faqRows,
    reviewRows,
    applicationRows,
    taxonomyRows,
  ] =
    await Promise.all([
      db
        .select({
          id: assets.id,
          objectKey: assets.objectKey,
          storagePartition: assets.storagePartition,
          access: assets.access,
          status: assets.status,
          scanStatus: assets.scanStatus,
          deletedAt: assets.deletedAt,
          effectiveRightsDecision: assets.effectiveRightsDecision,
          publicUsePermission: assets.publicUsePermission,
          rightsPublicWebsiteAllowed: assets.rightsPublicWebsiteAllowed,
          declarationExpiryDate: assets.declarationExpiryDate,
          altText: assets.altText,
          placementAltText: productAssets.altText,
          placementCaption: productAssets.caption,
          width: assets.width,
          height: assets.height,
        })
        .from(productAssets)
        .innerJoin(assets, eq(assets.id, productAssets.assetId))
        .where(
          and(
            eq(productAssets.productId, product.id),
            eq(productAssets.isVisible, true),
            inArray(productAssets.role, [...publicImageRoles]),
            publicReadyImageSqlConditions(),
          ),
        )
        .orderBy(asc(productAssets.sortOrder)),
      db
        .select({ label: productFeatures.label })
        .from(productFeatures)
        .where(
          and(eq(productFeatures.productId, product.id), eq(productFeatures.locale, "en")),
        )
        .orderBy(asc(productFeatures.sortOrder)),
      db
        .select({ question: productFaqs.question, answer: productFaqs.answer })
        .from(productFaqs)
        .where(and(eq(productFaqs.productId, product.id), eq(productFaqs.locale, "en")))
        .orderBy(asc(productFaqs.sortOrder)),
      db
        .select({ fieldName: productFieldReviews.fieldName })
        .from(productFieldReviews)
        .where(
          and(
            eq(productFieldReviews.productId, product.id),
            eq(productFieldReviews.verificationStatus, "verified"),
          ),
        ),
      db
        .select({ name: applicationLocalizations.name, path: routes.path })
        .from(productApplications)
        .innerJoin(applications, eq(applications.id, productApplications.applicationId))
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
            eq(routes.locale, "en"),
          ),
        )
        .where(
          and(
            eq(productApplications.productId, product.id),
            eq(applications.status, "published"),
          ),
        ),
      db
        .select({ name: taxonomyTermLocalizations.name, path: routes.path })
        .from(productTaxonomyTerms)
        .innerJoin(
          taxonomyTerms,
          eq(taxonomyTerms.id, productTaxonomyTerms.taxonomyTermId),
        )
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
            eq(routes.locale, "en"),
          ),
        )
        .where(and(
          eq(productTaxonomyTerms.productId, product.id),
          eq(taxonomyTerms.isActive, true),
        )),
    ]);
  const verified = new Set(reviewRows.map((row) => row.fieldName));
  const visibleFields = resolveVisibleProductFields(product, verified);
  return {
    ...product,
    ...visibleFields,
    narrativeBlocks,
    narrativeProjection: {
      document: blockProjection.renderableDocument,
      hasRenderableContent: blockProjection.hasRenderableContent,
      readableText: blockProjection.readableText,
      referencesValid: blockProjection.referencesValid,
    },
    images: await Promise.all(imageRows.map((row) => toPublicAsset(db, {
      ...row,
      altText: row.placementAltText ?? row.altText,
      caption: row.placementCaption,
    }))),
    features: featureRows,
    faqs: faqRows,
    applications: applicationRows,
    taxonomy: taxonomyRows,
    relatedProducts: blockProjection.relatedProducts,
    relatedArticles: blockProjection.relatedArticles,
  };
}

export async function getPublishedProductByPath(path: string) {
  return databaseConnection.kind === "pglite"
    ? queryProductByPath(databaseConnection.db, path)
    : queryProductByPath(databaseConnection.db, path);
}

async function queryRedirect<TQueryResult extends PgQueryResultHKT>(
  db: AppDatabase<TQueryResult>,
  path: string,
) {
  const rows = await db
    .select({ destinationPath: redirects.destinationPath })
    .from(redirects)
    .where(and(eq(redirects.sourcePath, path), eq(redirects.isActive, true)))
    .limit(1);
  return rows[0]?.destinationPath ?? null;
}

export async function findRedirect(path: string) {
  return databaseConnection.kind === "pglite"
    ? queryRedirect(databaseConnection.db, path)
    : queryRedirect(databaseConnection.db, path);
}

export async function queryApplications<TQueryResult extends PgQueryResultHKT>(
  db: AppDatabase<TQueryResult>,
  options: { path?: string; requireEligibleProduct?: boolean } = {},
) {
  return db
    .select({
      id: applications.id,
      name: applicationLocalizations.name,
      shortDescription: applicationLocalizations.shortDescription,
      body: applicationLocalizations.body,
      path: routes.path,
      indexStatus: seoMetadata.indexStatus,
      seoTitle: seoMetadata.title,
      metaDescription: seoMetadata.metaDescription,
      canonicalPath: seoMetadata.canonicalPath,
      hasEligibleProducts: sql<boolean>`${hasPubliclyEligibleProductForApplicationConditions(db)}`,
    })
    .from(applications)
    .innerJoin(
      applicationLocalizations,
      and(
        eq(applicationLocalizations.applicationId, applications.id),
        eq(applicationLocalizations.locale, "en"),
      ),
    )
    .innerJoin(
      routes,
      and(
        eq(routes.entityType, "application"),
        eq(routes.entityId, applications.id),
        eq(routes.isCurrent, true),
      ),
    )
    .innerJoin(seoMetadata, eq(seoMetadata.routeId, routes.id))
    .where(and(
      eq(applications.status, "published"),
      options.path ? eq(routes.path, options.path) : undefined,
      options.requireEligibleProduct
        ? hasPubliclyEligibleProductForApplicationConditions(db)
        : undefined,
    ));
}

export async function listPublishedApplications() {
  return databaseConnection.kind === "pglite"
    ? queryApplications(databaseConnection.db, { requireEligibleProduct: true })
    : queryApplications(databaseConnection.db, { requireEligibleProduct: true });
}

export async function getPublishedApplicationByPath(path: string) {
  const rows = databaseConnection.kind === "pglite"
    ? await queryApplications(databaseConnection.db, { path })
    : await queryApplications(databaseConnection.db, { path });
  return rows[0] ?? null;
}

export async function queryProductsForApplication<TQueryResult extends PgQueryResultHKT>(
  db: AppDatabase<TQueryResult>,
  applicationId: string,
) {
  const productIds = await db
    .select({ id: productApplications.productId })
    .from(productApplications)
    .innerJoin(products, eq(products.id, productApplications.productId))
    .where(and(
      eq(productApplications.applicationId, applicationId),
      publicProductEligibilityConditions(db),
    ));
  if (productIds.length === 0) return [];
  return queryPublishedProducts(db, {
    productIds: productIds.map((item) => item.id),
  });
}

export async function listProductsForApplication(applicationId: string) {
  return databaseConnection.kind === "pglite"
    ? queryProductsForApplication(databaseConnection.db, applicationId)
    : queryProductsForApplication(databaseConnection.db, applicationId);
}

export async function queryProductsForTaxonomy<TQueryResult extends PgQueryResultHKT>(
  db: AppDatabase<TQueryResult>,
  taxonomyTermId: string,
) {
  const productIds = await db
    .select({ id: productTaxonomyTerms.productId })
    .from(productTaxonomyTerms)
    .innerJoin(products, eq(products.id, productTaxonomyTerms.productId))
    .where(and(
      eq(productTaxonomyTerms.taxonomyTermId, taxonomyTermId),
      publicProductEligibilityConditions(db),
    ));
  if (productIds.length === 0) return [];
  return queryPublishedProducts(db, {
    productIds: productIds.map((item) => item.id),
  });
}

export async function listProductsForTaxonomy(taxonomyTermId: string) {
  return databaseConnection.kind === "pglite"
    ? queryProductsForTaxonomy(databaseConnection.db, taxonomyTermId)
    : queryProductsForTaxonomy(databaseConnection.db, taxonomyTermId);
}

export async function queryFabricEntries<TQueryResult extends PgQueryResultHKT>(
  db: AppDatabase<TQueryResult>,
  options: { path?: string; requireEligibleProduct?: boolean } = {},
) {
  const rows = await db
    .select({
      id: fabricLibraryEntries.id,
      title: fabricLibraryEntryLocalizations.title,
      description: fabricLibraryEntryLocalizations.description,
      path: routes.path,
      indexStatus: seoMetadata.indexStatus,
      seoTitle: seoMetadata.title,
      metaDescription: seoMetadata.metaDescription,
      canonicalPath: seoMetadata.canonicalPath,
      assetId: assets.id,
      objectKey: assets.objectKey,
      storagePartition: assets.storagePartition,
      assetAccess: assets.access,
      assetStatus: assets.status,
      assetScanStatus: assets.scanStatus,
      assetDeletedAt: assets.deletedAt,
      assetEffectiveRightsDecision: assets.effectiveRightsDecision,
      assetPublicUsePermission: assets.publicUsePermission,
      assetRightsPublicWebsiteAllowed: assets.rightsPublicWebsiteAllowed,
      assetDeclarationExpiryDate: assets.declarationExpiryDate,
      altText: assets.altText,
      width: assets.width,
      height: assets.height,
      hasEligibleProducts: sql<boolean>`${hasPubliclyEligibleProductForFabricEntryConditions(db)}`,
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
    .innerJoin(
      routes,
      and(
        eq(routes.entityType, "fabric_entry"),
        eq(routes.entityId, fabricLibraryEntries.id),
        eq(routes.isCurrent, true),
      ),
    )
    .innerJoin(seoMetadata, eq(seoMetadata.routeId, routes.id))
    .innerJoin(
      fabricLibraryEntryAssets,
      and(
        eq(fabricLibraryEntryAssets.fabricEntryId, fabricLibraryEntries.id),
        eq(fabricLibraryEntryAssets.role, "hero"),
      ),
    )
    .innerJoin(
      assets,
      and(
        eq(assets.id, fabricLibraryEntryAssets.assetId),
        publicReadyImageSqlConditions(),
      ),
    )
    .where(and(
      eq(fabricLibraryEntries.status, "published"),
      options.path ? eq(routes.path, options.path) : undefined,
      options.requireEligibleProduct
        ? hasPubliclyEligibleProductForFabricEntryConditions(db)
        : undefined,
    ));
  return Promise.all(
    rows.map(async (row) => ({
      ...row,
      image:
        row.assetId &&
        row.objectKey &&
        row.storagePartition &&
        row.assetAccess &&
        row.assetStatus &&
        row.assetScanStatus
          ? await toPublicAsset(db, {
              id: row.assetId,
              objectKey: row.objectKey,
              storagePartition: row.storagePartition,
              access: row.assetAccess,
              status: row.assetStatus,
              scanStatus: row.assetScanStatus,
              deletedAt: row.assetDeletedAt,
              effectiveRightsDecision: row.assetEffectiveRightsDecision,
              publicUsePermission: row.assetPublicUsePermission,
              rightsPublicWebsiteAllowed: row.assetRightsPublicWebsiteAllowed,
              declarationExpiryDate: row.assetDeclarationExpiryDate,
              altText: row.altText,
              width: row.width,
              height: row.height,
            })
          : null,
    })),
  );
}

export async function listPublishedFabricEntries() {
  return databaseConnection.kind === "pglite"
    ? queryFabricEntries(databaseConnection.db, { requireEligibleProduct: true })
    : queryFabricEntries(databaseConnection.db, { requireEligibleProduct: true });
}

export async function getPublishedFabricEntryByPath(path: string) {
  const entries = databaseConnection.kind === "pglite"
    ? await queryFabricEntries(databaseConnection.db, { path })
    : await queryFabricEntries(databaseConnection.db, { path });
  const entry = entries[0];
  if (!entry) return null;
  const relatedIds = databaseConnection.kind === "pglite"
    ? await queryPublishedFabricRelatedProductIds(databaseConnection.db, entry.id)
    : await queryPublishedFabricRelatedProductIds(databaseConnection.db, entry.id);
  const relatedProducts = databaseConnection.kind === "pglite"
    ? await queryPublishedProducts(databaseConnection.db, {
        productIds: relatedIds.map((row) => row.id),
      })
    : await queryPublishedProducts(databaseConnection.db, {
        productIds: relatedIds.map((row) => row.id),
      });
  return { ...entry, relatedProducts };
}

export async function queryPublishedFabricRelatedProductIds<
  TQueryResult extends PgQueryResultHKT,
>(db: AppDatabase<TQueryResult>, entryId: string) {
  return db
    .select({ id: fabricLibraryEntryProducts.productId })
    .from(fabricLibraryEntryProducts)
    .innerJoin(products, eq(products.id, fabricLibraryEntryProducts.productId))
    .where(
      and(
        eq(fabricLibraryEntryProducts.fabricEntryId, entryId),
        publicProductEligibilityConditions(db),
      ),
    );
}

async function queryContents<TQueryResult extends PgQueryResultHKT>(
  db: AppDatabase<TQueryResult>,
  channel?: typeof contents.$inferSelect.channel,
) {
  const base = db
    .select({
      id: contents.id,
      channel: contents.channel,
      type: contents.type,
      title: contentLocalizations.title,
      excerpt: contentLocalizations.excerpt,
      structuredBlocks: contentLocalizations.structuredBlocks,
      blocksVersion: contentLocalizations.blocksVersion,
      authorName: authors.displayName,
      authorIsOrganization: authors.isOrganization,
      publishedAt: contents.publishedAt,
      path: routes.path,
      indexStatus: seoMetadata.indexStatus,
      seoTitle: seoMetadata.title,
      metaDescription: seoMetadata.metaDescription,
      canonicalPath: seoMetadata.canonicalPath,
    })
    .from(contents)
    .innerJoin(contentLocalizations, and(eq(contentLocalizations.contentId, contents.id), eq(contentLocalizations.locale, "en")))
    .innerJoin(authors, eq(authors.id, contents.authorId))
    .innerJoin(routes, and(eq(routes.entityType, "content"), eq(routes.entityId, contents.id), eq(routes.isCurrent, true)))
    .innerJoin(seoMetadata, eq(seoMetadata.routeId, routes.id))
    .where(
      channel
        ? and(eq(contents.status, "published"), eq(contents.channel, channel))
        : eq(contents.status, "published"),
    )
    .orderBy(desc(contents.publishedAt));
  const rows = await base;
  const resolved = await Promise.all(rows.map(async (row) => {
    try {
      if (row.blocksVersion !== 1) return [];
      const document = parseBlockDocument(row.structuredBlocks, "content");
      const blockProjection = await resolveBlockPublicProjection(
        db,
        { type: "content", id: row.id },
        document,
      );
      if (!blockProjection.readableText) return [];
      return [{ ...row, document, blockProjection }];
    } catch {
      return [];
    }
  }));
  return resolved.flat();
}

export async function listPublishedContents(channel?: typeof contents.$inferSelect.channel) {
  return databaseConnection.kind === "pglite"
    ? queryContents(databaseConnection.db, channel)
    : queryContents(databaseConnection.db, channel);
}

async function queryPublishedContentByPath<TQueryResult extends PgQueryResultHKT>(
  db: AppDatabase<TQueryResult>,
  path: string,
) {
  const all = await queryContents(db);
  const content = all.find((item) => item.path === path);
  if (!content) return null;
  const imageRows = await queryPublicContentImages(db, content.id);
  const images = await Promise.all(imageRows.map((row) => toPublicAsset(
    db,
    {
    ...row,
    altText: row.placementAltText ?? row.altText,
    caption: row.placementCaption,
    },
  )));
  const blockMedia: Record<string, PublicAsset> = {};
  imageRows.forEach((row, index) => {
    const image = images[index];
    if (row.blockKey && image) blockMedia[row.blockKey] = image;
  });
  return {
    ...content,
    images,
    blockMedia,
    relatedProducts: content.blockProjection.relatedProducts,
    relatedArticles: content.blockProjection.relatedArticles,
  };
}

export async function getPublishedContentByPath(path: string) {
  return databaseConnection.kind === "pglite"
    ? queryPublishedContentByPath(databaseConnection.db, path)
    : queryPublishedContentByPath(databaseConnection.db, path);
}

export async function queryPublicContentImages<
  TQueryResult extends PgQueryResultHKT,
>(db: AppDatabase<TQueryResult>, contentId: string) {
  return db
      .select({
        id: assets.id,
        objectKey: assets.objectKey,
        storagePartition: assets.storagePartition,
        access: assets.access,
        status: assets.status,
        scanStatus: assets.scanStatus,
        deletedAt: assets.deletedAt,
        effectiveRightsDecision: assets.effectiveRightsDecision,
        publicUsePermission: assets.publicUsePermission,
        rightsPublicWebsiteAllowed: assets.rightsPublicWebsiteAllowed,
        declarationExpiryDate: assets.declarationExpiryDate,
        altText: assets.altText,
        placementAltText: contentAssets.altText,
        placementCaption: contentAssets.caption,
        blockKey: contentAssets.blockKey,
        width: assets.width,
        height: assets.height,
      })
      .from(contentAssets)
      .innerJoin(
        assets,
        and(
          eq(assets.id, contentAssets.assetId),
          inArray(contentAssets.role, [...publicImageRoles]),
          publicReadyImageSqlConditions(),
        ),
      )
      .where(
        and(
          eq(contentAssets.contentId, contentId),
          eq(contentAssets.isVisible, true),
        ),
      )
      .orderBy(asc(contentAssets.sortOrder));
}

export async function queryPublishedTaxonomyTerms<
  TQueryResult extends PgQueryResultHKT,
>(
  db: AppDatabase<TQueryResult>,
  options: { path?: string; requireEligibleProduct?: boolean } = {},
) {
  return (
    db
      .select({
        id: taxonomyTerms.id,
        name: taxonomyTermLocalizations.name,
        description: taxonomyTermLocalizations.description,
        dimension: taxonomyTerms.dimension,
        path: routes.path,
        indexStatus: seoMetadata.indexStatus,
        hasEligibleProducts: sql<boolean>`${hasPubliclyEligibleProductForTaxonomyConditions(db)}`,
      })
      .from(taxonomyTerms)
      .innerJoin(taxonomyTermLocalizations, and(eq(taxonomyTermLocalizations.taxonomyTermId, taxonomyTerms.id), eq(taxonomyTermLocalizations.locale, "en")))
      .innerJoin(routes, and(eq(routes.entityType, "taxonomy"), eq(routes.entityId, taxonomyTerms.id), eq(routes.isCurrent, true)))
      .innerJoin(seoMetadata, eq(seoMetadata.routeId, routes.id))
      .where(and(
        eq(taxonomyTerms.isActive, true),
        options.path ? eq(routes.path, options.path) : undefined,
        options.requireEligibleProduct
          ? hasPubliclyEligibleProductForTaxonomyConditions(db)
          : undefined,
      ))
  );
}

export async function listPublishedTaxonomyTerms() {
  return databaseConnection.kind === "pglite"
    ? queryPublishedTaxonomyTerms(databaseConnection.db, { requireEligibleProduct: true })
    : queryPublishedTaxonomyTerms(databaseConnection.db, { requireEligibleProduct: true });
}

export async function getPublishedTaxonomyByPath(path: string) {
  const terms = databaseConnection.kind === "pglite"
    ? await queryPublishedTaxonomyTerms(databaseConnection.db, { path })
    : await queryPublishedTaxonomyTerms(databaseConnection.db, { path });
  return terms[0] ?? null;
}
