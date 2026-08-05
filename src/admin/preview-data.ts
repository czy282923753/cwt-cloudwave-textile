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
} from "@/admin/preview-policy";

function objectValue(value: unknown, key: string): unknown {
  return typeof value === "object" && value !== null && key in value
    ? value[key as keyof typeof value]
    : undefined;
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
  const blockRevision = revisionRows.find((row) => objectValue(row.snapshot, "kind") === "editorial_blocks");
  const productPreviewMedia = revisionRows
    .map((row) => productPreviewMediaFromSnapshot(row.snapshot))
    .find((media) => media !== null) ?? null;
  const revisionDocument = blockRevision ? blockDocumentSchema.safeParse(objectValue(blockRevision.snapshot, "document")) : null;
  const document = revisionDocument?.success ? revisionDocument.data : parseBlockDocument(product.structuredBlocks, "product");
  const name = blockRevision && typeof objectValue(blockRevision.snapshot, "name") === "string" ? String(objectValue(blockRevision.snapshot, "name")) : product.name;
  const shortDescriptionValue = blockRevision ? objectValue(blockRevision.snapshot, "shortDescription") : product.shortDescription;
  const shortDescription = typeof shortDescriptionValue === "string" ? shortDescriptionValue : null;
  const projection = await resolveBlockPublicProjection(db, {
    type: "product",
    id: productId,
    ...(productPreviewMedia ? { media: productPreviewMedia } : {}),
  }, document, { invalidReferences: "filter" });
  const [liveImageRows, featureRows, faqRows, reviews, applicationRows, taxonomyRows] = await Promise.all([
    productPreviewMedia ? Promise.resolve([]) : db.select({ id: assets.id, alt: productAssets.altText, fallbackAlt: assets.altText, caption: productAssets.caption, role: productAssets.role, sortOrder: productAssets.sortOrder }).from(productAssets).innerJoin(assets, eq(assets.id, productAssets.assetId)).where(and(eq(productAssets.productId, productId), eq(productAssets.isVisible, true), publicReadyImageSqlConditions())).orderBy(asc(productAssets.sortOrder)),
    db.select({ label: productFeatures.label }).from(productFeatures).where(eq(productFeatures.productId, productId)).orderBy(asc(productFeatures.sortOrder)),
    db.select({ question: productFaqs.question, answer: productFaqs.answer }).from(productFaqs).where(eq(productFaqs.productId, productId)).orderBy(asc(productFaqs.sortOrder)),
    db.select({ fieldName: productFieldReviews.fieldName }).from(productFieldReviews).where(and(eq(productFieldReviews.productId, productId), eq(productFieldReviews.verificationStatus, "verified"))),
    db.select({ name: applicationLocalizations.name, path: routes.path }).from(productApplications).innerJoin(applications, eq(applications.id, productApplications.applicationId)).innerJoin(applicationLocalizations, and(eq(applicationLocalizations.applicationId, applications.id), eq(applicationLocalizations.locale, "en"))).leftJoin(routes, and(eq(routes.entityType, "application"), eq(routes.entityId, applications.id), eq(routes.locale, "en"), eq(routes.isCurrent, true))).where(eq(productApplications.productId, productId)),
    db.select({ name: taxonomyTermLocalizations.name, path: routes.path }).from(productTaxonomyTerms).innerJoin(taxonomyTerms, eq(taxonomyTerms.id, productTaxonomyTerms.taxonomyTermId)).innerJoin(taxonomyTermLocalizations, and(eq(taxonomyTermLocalizations.taxonomyTermId, taxonomyTerms.id), eq(taxonomyTermLocalizations.locale, "en"))).leftJoin(routes, and(eq(routes.entityType, "taxonomy"), eq(routes.entityId, taxonomyTerms.id), eq(routes.locale, "en"), eq(routes.isCurrent, true))).where(eq(productTaxonomyTerms.productId, productId)),
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
  const images = imageRows.map((image) => ({ id: image.id, url: `/api/admin/preview-assets/product/${productId}/${image.id}/`, alt: image.alt ?? image.fallbackAlt ?? "", caption: image.caption }));
  return {
    id: product.id,
    name,
    path: product.path,
    shortDescription,
    composition: verified.has("composition") ? product.composition : null,
    weightGsm: verified.has("weightGsm") ? product.weightGsm : null,
    widthCm: verified.has("widthCm") ? product.widthCm : null,
    colorOptions: product.colorOptions,
    customAvailable: product.customAvailable,
    sampleAvailable: product.sampleAvailable,
    moqValue: verified.has("moqValue") ? product.moqValue : null,
    moqUnit: verified.has("moqUnit") ? product.moqUnit : null,
    moqNote: product.moqNote,
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

export async function getProductPreviewModel(productId: string) {
  return databaseConnection.kind === "pglite" ? queryProductPreview(databaseConnection.db, productId) : queryProductPreview(databaseConnection.db, productId);
}

export async function getContentPreviewModel(contentId: string) {
  return databaseConnection.kind === "pglite" ? queryContentPreview(databaseConnection.db, contentId) : queryContentPreview(databaseConnection.db, contentId);
}
