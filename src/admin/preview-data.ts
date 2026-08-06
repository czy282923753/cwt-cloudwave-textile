import { and, asc, desc, eq, inArray } from "drizzle-orm";
import type { PgQueryResultHKT } from "drizzle-orm/pg-core/session";

import type { ProductDetailViewModel } from "@/public-site/product-detail-renderer";
import type { ContentArticleViewModel } from "@/public-site/content-article-renderer";
import {
  applicationLocalizations,
  applications,
  assets,
  authors,
  contentAssets,
  contentLocalizations,
  contents,
  editorialRevisions,
  productApplications,
  productAssets,
  productFaqs,
  productFeatures,
  productFieldReviews,
  productLocalizations,
  products,
  productTaxonomyTerms,
  routes,
  taxonomyTermLocalizations,
  taxonomyTerms,
} from "@/db/schema";
import { databaseConnection } from "@/db/client";
import type { AppDatabase } from "@/db/types";
import { blockDocumentSchema, parseBlockDocument } from "@/editorial/blocks";
import { resolveBlockPublicProjection } from "@/editorial/block-references";
import { publicReadyImageSqlConditions } from "@/uploads/asset-eligibility";
import {
  contentPreviewMediaFromSnapshot,
  productPreviewMediaFromSnapshot,
  requireEditorialResourceAccess,
} from "@/admin/preview-policy";
import type { UserRole } from "@/auth/permissions";
import { resolveVisibleProductFields } from "@/public-site/product-visibility";

function objectValue(value: unknown, key: string): unknown {
  return typeof value === "object" && value !== null && key in value
    ? value[key as keyof typeof value]
    : undefined;
}

function objectRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null
    ? value as Record<string, unknown>
    : null;
}

function productRevisionChanges(snapshot: unknown): Record<string, unknown>[] {
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

async function queryProductPreview<TQueryResult extends PgQueryResultHKT>(
  db: AppDatabase<TQueryResult>,
  productId: string,
): Promise<ProductDetailViewModel | null> {
  const rows = await db
    .select({
      id: products.id,
      name: productLocalizations.name,
      shortDescription: productLocalizations.shortDescription,
      structuredBlocks: productLocalizations.structuredBlocks,
      composition: products.composition,
      weightGsm: products.weightGsm,
      widthCm: products.widthCm,
      colorOptions: products.colorOptions,
      customAvailable: products.customAvailable,
      sampleAvailable: products.sampleAvailable,
      moqValue: products.moqValue,
      moqUnit: products.moqUnit,
      moqNote: products.moqNote,
      colorOptionsDisplay: products.colorOptionsDisplay,
      customAvailableDisplay: products.customAvailableDisplay,
      sampleAvailableDisplay: products.sampleAvailableDisplay,
      moqNoteDisplay: products.moqNoteDisplay,
      path: routes.path,
    })
    .from(products)
    .innerJoin(productLocalizations, and(eq(productLocalizations.productId, products.id), eq(productLocalizations.locale, "en")))
    .innerJoin(routes, and(eq(routes.entityType, "product"), eq(routes.entityId, products.id), eq(routes.locale, "en"), eq(routes.isCurrent, true)))
    .where(eq(products.id, productId))
    .limit(1);
  const product = rows[0];
  if (!product) return null;
  const revisionRows = await db
    .select({ snapshot: editorialRevisions.snapshot })
    .from(editorialRevisions)
    .where(and(eq(editorialRevisions.entityType, "product"), eq(editorialRevisions.entityId, productId), inArray(editorialRevisions.status, ["draft", "in_review"])))
    .orderBy(desc(editorialRevisions.versionNumber));
  const activeSnapshot = revisionRows[0]?.snapshot;
  const changes = productRevisionChanges(activeSnapshot);
  const blockRevision = changes.find((change) => change.kind === "editorial_blocks");
  const factRevision = changes.find((change) => change.kind === "facts");
  const structureRevision = changes.find((change) => change.kind === "structure");
  const productPreviewMedia = productPreviewMediaFromSnapshot(activeSnapshot);
  const revisionDocument = blockRevision ? blockDocumentSchema.safeParse(blockRevision.document) : null;
  const document = revisionDocument?.success ? revisionDocument.data : parseBlockDocument(product.structuredBlocks, "product");
  const name = typeof blockRevision?.name === "string" ? blockRevision.name : product.name;
  const shortDescriptionValue = blockRevision ? blockRevision.shortDescription : product.shortDescription;
  const shortDescription = typeof shortDescriptionValue === "string" ? shortDescriptionValue : null;
  const projection = await resolveBlockPublicProjection(db, {
    type: "product",
    id: productId,
    ...(productPreviewMedia ? { media: productPreviewMedia } : {}),
  }, document, { invalidReferences: "filter" });
  const pendingApplicationIds = Array.isArray(structureRevision?.applicationIds)
    ? structureRevision.applicationIds.filter((value): value is string => typeof value === "string")
    : null;
  const pendingTaxonomyIds = structureRevision && typeof structureRevision.primaryTaxonomyTermId === "string"
    ? [
        structureRevision.primaryTaxonomyTermId,
        ...(Array.isArray(structureRevision.additionalTaxonomyTermIds)
          ? structureRevision.additionalTaxonomyTermIds.filter((value): value is string => typeof value === "string")
          : []),
      ]
    : null;
  const [liveImageRows, liveFeatureRows, liveFaqRows, reviews, applicationRows, taxonomyRows] = await Promise.all([
    productPreviewMedia ? Promise.resolve([]) : db.select({ id: assets.id, alt: productAssets.altText, fallbackAlt: assets.altText, caption: productAssets.caption, role: productAssets.role, sortOrder: productAssets.sortOrder }).from(productAssets).innerJoin(assets, eq(assets.id, productAssets.assetId)).where(and(eq(productAssets.productId, productId), eq(productAssets.isVisible, true), publicReadyImageSqlConditions())).orderBy(asc(productAssets.sortOrder)),
    db.select({ label: productFeatures.label }).from(productFeatures).where(eq(productFeatures.productId, productId)).orderBy(asc(productFeatures.sortOrder)),
    db.select({ question: productFaqs.question, answer: productFaqs.answer }).from(productFaqs).where(eq(productFaqs.productId, productId)).orderBy(asc(productFaqs.sortOrder)),
    db.select({ fieldName: productFieldReviews.fieldName }).from(productFieldReviews).where(and(eq(productFieldReviews.productId, productId), eq(productFieldReviews.verificationStatus, "verified"))),
    pendingApplicationIds
      ? pendingApplicationIds.length
        ? db.select({ name: applicationLocalizations.name, path: routes.path }).from(applications).innerJoin(applicationLocalizations, and(eq(applicationLocalizations.applicationId, applications.id), eq(applicationLocalizations.locale, "en"))).leftJoin(routes, and(eq(routes.entityType, "application"), eq(routes.entityId, applications.id), eq(routes.locale, "en"), eq(routes.isCurrent, true))).where(inArray(applications.id, pendingApplicationIds))
        : Promise.resolve([])
      : db.select({ name: applicationLocalizations.name, path: routes.path }).from(productApplications).innerJoin(applications, eq(applications.id, productApplications.applicationId)).innerJoin(applicationLocalizations, and(eq(applicationLocalizations.applicationId, applications.id), eq(applicationLocalizations.locale, "en"))).leftJoin(routes, and(eq(routes.entityType, "application"), eq(routes.entityId, applications.id), eq(routes.locale, "en"), eq(routes.isCurrent, true))).where(eq(productApplications.productId, productId)),
    pendingTaxonomyIds
      ? db.select({ name: taxonomyTermLocalizations.name, path: routes.path }).from(taxonomyTerms).innerJoin(taxonomyTermLocalizations, and(eq(taxonomyTermLocalizations.taxonomyTermId, taxonomyTerms.id), eq(taxonomyTermLocalizations.locale, "en"))).leftJoin(routes, and(eq(routes.entityType, "taxonomy"), eq(routes.entityId, taxonomyTerms.id), eq(routes.locale, "en"), eq(routes.isCurrent, true))).where(inArray(taxonomyTerms.id, pendingTaxonomyIds))
      : db.select({ name: taxonomyTermLocalizations.name, path: routes.path }).from(productTaxonomyTerms).innerJoin(taxonomyTerms, eq(taxonomyTerms.id, productTaxonomyTerms.taxonomyTermId)).innerJoin(taxonomyTermLocalizations, and(eq(taxonomyTermLocalizations.taxonomyTermId, taxonomyTerms.id), eq(taxonomyTermLocalizations.locale, "en"))).leftJoin(routes, and(eq(routes.entityType, "taxonomy"), eq(routes.entityId, taxonomyTerms.id), eq(routes.locale, "en"), eq(routes.isCurrent, true))).where(eq(productTaxonomyTerms.productId, productId)),
  ]);
  const previewAssetRows = productPreviewMedia?.length
    ? await db.select({ id: assets.id, fallbackAlt: assets.altText }).from(assets).where(and(
        inArray(assets.id, productPreviewMedia.map((placement) => placement.assetId)),
        publicReadyImageSqlConditions(),
      ))
    : [];
  const previewAssets = new Map(previewAssetRows.map((asset) => [asset.id, asset]));
  const imageRows = productPreviewMedia
    ? productPreviewMedia
        .filter((placement) => placement.isVisible && previewAssets.has(placement.assetId))
        .sort((left, right) => left.sortOrder - right.sortOrder)
        .map((placement) => ({
          id: placement.assetId,
          alt: placement.altText,
          fallbackAlt: previewAssets.get(placement.assetId)?.fallbackAlt ?? null,
          caption: placement.caption,
          role: placement.role,
          sortOrder: placement.sortOrder,
        }))
    : liveImageRows;
  const verified = new Set(reviews.map((review) => review.fieldName));
  const factValue = <TValue,>(key: string, fallback: TValue): TValue =>
    factRevision && key in factRevision ? factRevision[key] as TValue : fallback;
  const structureValue = <TValue,>(key: string, fallback: TValue): TValue =>
    structureRevision && key in structureRevision ? structureRevision[key] as TValue : fallback;
  const visibleFields = resolveVisibleProductFields({
    composition: factValue("composition", product.composition),
    weightGsm: factValue("weightGsm", product.weightGsm),
    widthCm: factValue("widthCm", product.widthCm),
    colorOptions: factValue("colorOptions", product.colorOptions),
    customAvailable: factValue("customAvailable", product.customAvailable),
    sampleAvailable: factValue("sampleAvailable", product.sampleAvailable),
    moqNote: factValue("moqNote", product.moqNote),
    moqValue: factValue("moqValue", product.moqValue),
    moqUnit: factValue("moqUnit", product.moqUnit),
    colorOptionsDisplay: structureValue("colorOptionsDisplay", product.colorOptionsDisplay),
    customAvailableDisplay: structureValue("customAvailableDisplay", product.customAvailableDisplay),
    sampleAvailableDisplay: structureValue("sampleAvailableDisplay", product.sampleAvailableDisplay),
    moqNoteDisplay: structureValue("moqNoteDisplay", product.moqNoteDisplay),
  }, verified);
  const featureRows = Array.isArray(structureRevision?.features)
    ? structureRevision.features.flatMap((value) => typeof value === "string" ? [{ label: value }] : [])
    : liveFeatureRows;
  const faqRows = Array.isArray(structureRevision?.faqs)
    ? structureRevision.faqs.flatMap((value) => {
        const faq = objectRecord(value);
        return typeof faq?.question === "string" && typeof faq.answer === "string"
          ? [{ question: faq.question, answer: faq.answer }]
          : [];
      })
    : liveFaqRows;
  const images = imageRows.map((image) => ({ id: image.id, url: `/api/admin/preview-assets/product/${productId}/${image.id}/`, alt: image.alt ?? image.fallbackAlt ?? "", caption: image.caption }));
  return {
    id: product.id,
    name,
    path: product.path,
    shortDescription,
    ...visibleFields,
    images,
    taxonomy: taxonomyRows,
    features: featureRows,
    applications: applicationRows,
    faqs: faqRows,
    narrativeProjection: { document: projection.renderableDocument, hasRenderableContent: projection.hasRenderableContent, readableText: projection.readableText },
    relatedProducts: projection.relatedProducts,
    relatedArticles: projection.relatedArticles,
  };
}

async function queryContentPreview<TQueryResult extends PgQueryResultHKT>(
  db: AppDatabase<TQueryResult>,
  contentId: string,
): Promise<{ content: ContentArticleViewModel; channel: string } | null> {
  const rows = await db.select({ id: contents.id, channel: contents.channel, title: contentLocalizations.title, excerpt: contentLocalizations.excerpt, structuredBlocks: contentLocalizations.structuredBlocks, authorName: authors.displayName }).from(contents).innerJoin(contentLocalizations, and(eq(contentLocalizations.contentId, contents.id), eq(contentLocalizations.locale, "en"))).innerJoin(authors, eq(authors.id, contents.authorId)).where(eq(contents.id, contentId)).limit(1);
  const content = rows[0];
  if (!content) return null;
  const revisionRows = await db.select({ snapshot: editorialRevisions.snapshot }).from(editorialRevisions).where(and(eq(editorialRevisions.entityType, "content"), eq(editorialRevisions.entityId, contentId), inArray(editorialRevisions.status, ["draft", "in_review"]))).orderBy(desc(editorialRevisions.versionNumber));
  const blockRevision = revisionRows.find((row) => objectValue(row.snapshot, "kind") === "content_blocks_v1");
  const contentPreviewMedia = blockRevision
    ? contentPreviewMediaFromSnapshot(blockRevision.snapshot)
    : null;
  const revisionDocument = blockRevision ? blockDocumentSchema.safeParse(objectValue(blockRevision.snapshot, "document")) : null;
  const document = revisionDocument?.success ? revisionDocument.data : parseBlockDocument(content.structuredBlocks, "content");
  const projection = await resolveBlockPublicProjection(db, {
    type: "content",
    id: contentId,
    ...(contentPreviewMedia ? { media: contentPreviewMedia } : {}),
  }, document, { invalidReferences: "filter" });
  const liveMediaRows = contentPreviewMedia ? [] : await db.select({ id: assets.id, role: contentAssets.role, alt: contentAssets.altText, fallbackAlt: assets.altText, caption: contentAssets.caption, blockKey: contentAssets.blockKey, sortOrder: contentAssets.sortOrder }).from(contentAssets).innerJoin(assets, eq(assets.id, contentAssets.assetId)).where(and(eq(contentAssets.contentId, contentId), eq(contentAssets.isVisible, true), publicReadyImageSqlConditions())).orderBy(asc(contentAssets.sortOrder));
  const previewAssetRows = contentPreviewMedia?.length
    ? await db.select({ id: assets.id, fallbackAlt: assets.altText }).from(assets).where(and(
        inArray(assets.id, contentPreviewMedia.map((placement) => placement.assetId)),
        publicReadyImageSqlConditions(),
      ))
    : [];
  const previewAssets = new Map(previewAssetRows.map((asset) => [asset.id, asset]));
  const mediaRows = contentPreviewMedia
    ? contentPreviewMedia
        .filter((placement) => placement.isVisible && previewAssets.has(placement.assetId))
        .sort((left, right) => left.sortOrder - right.sortOrder)
        .map((placement) => ({
          id: placement.assetId,
          role: placement.role,
          alt: placement.altText,
          fallbackAlt: previewAssets.get(placement.assetId)?.fallbackAlt ?? null,
          caption: placement.caption,
          blockKey: placement.blockKey,
          sortOrder: placement.sortOrder,
        }))
    : liveMediaRows;
  const images = mediaRows.map((image) => ({ id: image.id, url: `/api/admin/preview-assets/content/${contentId}/${image.id}/`, alt: image.alt ?? image.fallbackAlt ?? "", caption: image.caption }));
  const byId = new Map(images.map((image) => [image.id, image]));
  const blockMedia = Object.fromEntries(mediaRows.flatMap((row) => row.blockKey && byId.get(row.id) ? [[row.blockKey, byId.get(row.id)!]] : []));
  const titleValue = blockRevision ? objectValue(blockRevision.snapshot, "title") : content.title;
  const excerptValue = blockRevision ? objectValue(blockRevision.snapshot, "excerpt") : content.excerpt;
  return { content: { id: content.id, title: typeof titleValue === "string" ? titleValue : content.title, excerpt: typeof excerptValue === "string" ? excerptValue : null, authorName: content.authorName, document: projection.renderableDocument, images: images.filter((image) => mediaRows.find((row) => row.id === image.id)?.role === "cover"), blockMedia, relatedProducts: projection.relatedProducts, relatedArticles: projection.relatedArticles }, channel: { fabric_knowledge: "Fabric Knowledge", china_textile_guide: "China Textile Guide", china_sourcing_guide: "China Sourcing Guide" }[content.channel] };
}

export async function getProductPreviewModel(productId: string, role: UserRole) {
  requireEditorialResourceAccess(role, "product", "preview");
  return databaseConnection.kind === "pglite" ? queryProductPreview(databaseConnection.db, productId) : queryProductPreview(databaseConnection.db, productId);
}

export async function getContentPreviewModel(contentId: string, role: UserRole) {
  requireEditorialResourceAccess(role, "content", "preview");
  return databaseConnection.kind === "pglite" ? queryContentPreview(databaseConnection.db, contentId) : queryContentPreview(databaseConnection.db, contentId);
}
