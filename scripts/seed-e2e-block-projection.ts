import { and, eq } from "drizzle-orm";
import sharp from "sharp";

import {
  applyProductRevision,
  confirmRealProductBasis,
  createProductDraft,
  publishReviewedProduct,
  submitProductBlockDraftForReview,
  submitProductForReview,
  updateProductBlocks,
  updateProductStructure,
} from "../src/catalog/product-service";
import {
  createContentDraft,
  publishContent,
  submitContentForReview,
  updateContent,
} from "../src/content/content-service";
import {
  applyStaticPageConfigRevision,
  DEFAULT_STATIC_PAGE_CONFIGS,
  proposeStaticPageConfigRevision,
} from "../src/content/static-page-settings";
import { databaseConnection } from "../src/db/client";
import { seedCoreData } from "../src/db/seed";
import {
  applications,
  assets,
  authors,
  productAssets,
  products,
  taxonomyTerms,
} from "../src/db/schema";
import type { AppDatabase } from "../src/db/types";
import type { BlockDocument } from "../src/editorial/blocks";
import { createObjectStorage } from "../src/storage";
import { createFileScanner } from "../src/uploads/scanner";
import { uploadAsset } from "../src/uploads/service";
import type { PgQueryResultHKT } from "drizzle-orm/pg-core/session";

async function imageBytes(red: number, green: number, blue: number) {
  return new Uint8Array(await sharp({
    create: { width: 320, height: 240, channels: 3, background: { r: red, g: green, b: blue } },
  }).jpeg({ quality: 82 }).toBuffer());
}

async function seed<TQueryResult extends PgQueryResultHKT>(db: AppDatabase<TQueryResult>) {
  const { adminUserId } = await seedCoreData(db);
  const actor = { userId: adminUserId, role: "admin" as const };
  const storage = createObjectStorage();
  const scanner = createFileScanner();
  const createAsset = async (label: string, color: [number, number, number], category: "product" | "content" | "company") =>
    uploadAsset(db, storage, scanner, {
      fileName: `TEST-${label}.jpg`,
      declaredMimeType: "image/jpeg",
      bytes: await imageBytes(...color),
      category,
      purpose: "public_asset",
      uploadedByUserId: adminUserId,
      sourceDeclarationEnabled: false,
    });

  const productAssetIds = await Promise.all([
    createAsset("block-product-hero", [35, 92, 85], "product"),
    createAsset("block-product-gallery-a", [122, 78, 45], "product"),
    createAsset("block-product-gallery-b", [48, 73, 126], "product"),
  ]);
  const detailAssetId = await createAsset("block-product-detail", [91, 65, 118], "product");
  const categoryRows = await db.select({ id: taxonomyTerms.id }).from(taxonomyTerms).where(eq(taxonomyTerms.isActive, true)).limit(1);
  const categoryId = categoryRows[0]?.id;
  if (!categoryId) throw new Error("E2E Block fixture requires an active taxonomy category.");
  type FixtureMedia = Array<{
    assetId: string;
    role: "hero" | "gallery" | "detail" | "application";
    sortOrder: number;
    altText: string;
    caption: string | null;
    isVisible: boolean;
  }>;
  const heroMedia: FixtureMedia = [{
    assetId: productAssetIds[0]!,
    role: "hero",
    sortOrder: 0,
    altText: "Synthetic Product hero",
    caption: null,
    isVisible: true,
  }];
  const publishFixtureProduct = async (input: {
    slug: string;
    label: string;
    document: BlockDocument;
    media?: FixtureMedia;
    features?: string[];
    applicationIds?: string[];
  }) => {
    const media = input.media ?? heroMedia;
    const assetIds = media.map((item) => item.assetId);
    const fixtureProductId = await createProductDraft(db, actor, {
      name: `TEST E2E ${input.label}`,
      requestedSlug: input.slug,
      primaryTaxonomyTermId: categoryId,
      assetIds,
    });
    await updateProductStructure(db, actor, fixtureProductId, {
      primaryTaxonomyTermId: categoryId,
      additionalTaxonomyTermIds: [],
      applicationIds: input.applicationIds ?? [],
      tagNames: [],
      assetIds,
      heroAssetId: productAssetIds[0]!,
      media,
      features: input.features ?? [],
      faqs: [],
      colorOptionsDisplay: "inherit",
      customAvailableDisplay: "inherit",
      sampleAvailableDisplay: "inherit",
      moqNoteDisplay: "inherit",
    });
    await updateProductBlocks(db, actor, fixtureProductId, {
      name: `TEST E2E ${input.label}`,
      shortDescription: "Synthetic noindex Product used only for final Stage 1 remediation browser checks.",
      document: input.document,
      expectedEditorDocumentVersion: 1,
    });
    await confirmRealProductBasis(db, actor, fixtureProductId, "physical_sample", "Synthetic E2E-only evidence");
    await submitProductForReview(db, actor, fixtureProductId);
    await publishReviewedProduct(db, actor, fixtureProductId);
    return fixtureProductId;
  };
  const productId = await createProductDraft(db, actor, {
    name: "TEST E2E Block Media Product",
    requestedSlug: "test-e2e-block-media-product",
    primaryTaxonomyTermId: categoryId,
    assetIds: productAssetIds,
  });
  await updateProductStructure(db, actor, productId, {
    primaryTaxonomyTermId: categoryId,
    additionalTaxonomyTermIds: [], applicationIds: [], tagNames: [],
    assetIds: productAssetIds, heroAssetId: productAssetIds[0]!,
    media: [
      { assetId: productAssetIds[0]!, role: "hero", sortOrder: 0, altText: "Synthetic Product hero", caption: null, isVisible: true },
      { assetId: productAssetIds[1]!, role: "gallery", sortOrder: 1, altText: "Synthetic Product gallery A", caption: "Synthetic gallery A", isVisible: true },
      { assetId: productAssetIds[2]!, role: "gallery", sortOrder: 2, altText: "Synthetic Product gallery B", caption: "Synthetic gallery B", isVisible: true },
    ],
    features: [], faqs: [], colorOptionsDisplay: "inherit", customAvailableDisplay: "inherit", sampleAvailableDisplay: "inherit", moqNoteDisplay: "inherit",
  });
  await updateProductBlocks(db, actor, productId, {
    name: "TEST E2E Block Media Product",
    shortDescription: "Synthetic noindex Product used only for Stage 1 remediation browser checks.",
    document: { version: 1, blocks: [
      { id: "product-paragraph", type: "paragraph", text: "Synthetic Product Block projection is visible." },
      { id: "product-image", type: "image", mediaKey: productAssetIds[0]! },
      { id: "product-gallery", type: "gallery", mediaKeys: [productAssetIds[1]!, productAssetIds[2]!] },
    ] },
    expectedEditorDocumentVersion: 1,
  });
  await confirmRealProductBasis(db, actor, productId, "physical_sample", "Synthetic E2E-only evidence");
  await submitProductForReview(db, actor, productId);
  await publishReviewedProduct(db, actor, productId);

  const detailMedia: FixtureMedia = [
    ...heroMedia,
    { assetId: detailAssetId, role: "detail", sortOrder: 1, altText: "Synthetic Product detail", caption: null, isVisible: true },
  ];
  const galleryMedia: FixtureMedia = [
    ...heroMedia,
    { assetId: productAssetIds[1]!, role: "gallery", sortOrder: 1, altText: "Synthetic Product gallery A", caption: "Synthetic gallery A", isVisible: true },
    { assetId: productAssetIds[2]!, role: "gallery", sortOrder: 2, altText: "Synthetic Product gallery B", caption: "Synthetic gallery B", isVisible: true },
  ];
  await publishFixtureProduct({
    slug: "test-e2e-renderable-empty",
    label: "Renderable Empty",
    document: { version: 1, blocks: [] },
  });
  await publishFixtureProduct({
    slug: "test-e2e-renderable-divider",
    label: "Renderable Divider",
    document: { version: 1, blocks: [{ id: "divider-only", type: "divider" }] },
  });
  const unresolvedImageId = await publishFixtureProduct({
    slug: "test-e2e-renderable-unresolved-image",
    label: "Renderable Unresolved Image",
    document: { version: 1, blocks: [{ id: "detail-image", type: "image", mediaKey: detailAssetId }] },
    media: detailMedia,
  });
  await db.delete(productAssets).where(and(
    eq(productAssets.productId, unresolvedImageId),
    eq(productAssets.assetId, detailAssetId),
  ));
  const hiddenImageId = await publishFixtureProduct({
    slug: "test-e2e-renderable-hidden-image",
    label: "Renderable Hidden Image",
    document: { version: 1, blocks: [{ id: "detail-image", type: "image", mediaKey: detailAssetId }] },
    media: detailMedia,
  });
  await db.update(productAssets).set({ isVisible: false }).where(and(
    eq(productAssets.productId, hiddenImageId),
    eq(productAssets.assetId, detailAssetId),
  ));
  const unresolvedGalleryId = await publishFixtureProduct({
    slug: "test-e2e-renderable-unresolved-gallery",
    label: "Renderable Unresolved Gallery",
    document: { version: 1, blocks: [{ id: "gallery", type: "gallery", mediaKeys: [productAssetIds[1]!, productAssetIds[2]!] }] },
    media: galleryMedia,
  });
  await db.delete(productAssets).where(and(
    eq(productAssets.productId, unresolvedGalleryId),
    eq(productAssets.role, "gallery"),
  ));
  const relatedTargetId = await publishFixtureProduct({
    slug: "test-e2e-renderable-related-target",
    label: "Renderable Related Target",
    document: { version: 1, blocks: [{ id: "target-text", type: "paragraph", text: "Synthetic related target." }] },
  });
  await publishFixtureProduct({
    slug: "test-e2e-renderable-filtered-related",
    label: "Renderable Filtered Related",
    document: { version: 1, blocks: [{ id: "related", type: "related_products", productIds: [relatedTargetId] }] },
  });
  await db.update(products).set({ status: "draft" }).where(eq(products.id, relatedTargetId));
  await publishFixtureProduct({
    slug: "test-e2e-renderable-paragraph",
    label: "Renderable Paragraph",
    document: { version: 1, blocks: [{ id: "paragraph", type: "paragraph", text: "Synthetic renderable Paragraph is visible." }] },
  });
  await publishFixtureProduct({
    slug: "test-e2e-renderable-heading",
    label: "Renderable Heading",
    document: { version: 1, blocks: [{ id: "heading", type: "heading", level: 2, text: "Synthetic renderable Heading" }] },
  });
  const applicationRows = await db.select({ id: applications.id }).from(applications).where(eq(applications.status, "published")).limit(1);
  const applicationId = applicationRows[0]?.id;
  if (!applicationId) throw new Error("E2E Block fixture requires a published Application.");
  await publishFixtureProduct({
    slug: "test-e2e-renderable-independent-modules",
    label: "Renderable Independent Modules",
    document: { version: 1, blocks: [] },
    features: ["Synthetic independent feature"],
    applicationIds: [applicationId],
  });
  const pendingRevisionProductId = await publishFixtureProduct({
    slug: "test-e2e-renderable-revision-before",
    label: "Renderable Revision Before",
    document: { version: 1, blocks: [{ id: "approved-text", type: "paragraph", text: "Approved narrative remains before Revision approval." }] },
  });
  await updateProductBlocks(db, actor, pendingRevisionProductId, {
    name: "TEST E2E Renderable Revision Before",
    shortDescription: "Synthetic noindex Product used only for final Stage 1 remediation browser checks.",
    document: { version: 1, blocks: [{ id: "pending-divider", type: "divider" }] },
    expectedEditorDocumentVersion: 2,
  });
  const appliedRevisionProductId = await publishFixtureProduct({
    slug: "test-e2e-renderable-revision-after",
    label: "Renderable Revision After",
    document: { version: 1, blocks: [{ id: "approved-text", type: "paragraph", text: "Narrative before final approved Revision." }] },
  });
  const appliedRevisionId = await updateProductBlocks(db, actor, appliedRevisionProductId, {
    name: "TEST E2E Renderable Revision After",
    shortDescription: "Synthetic noindex Product used only for final Stage 1 remediation browser checks.",
    document: { version: 1, blocks: [{ id: "approved-divider", type: "divider" }] },
    expectedEditorDocumentVersion: 2,
  });
  if (!appliedRevisionId) throw new Error("E2E applied Product Revision was not created.");
  await submitProductBlockDraftForReview(db, actor, appliedRevisionProductId, appliedRevisionId);
  await applyProductRevision(db, actor, appliedRevisionId);

  const contentAssetIds = await Promise.all([
    createAsset("block-content-inline", [85, 115, 50], "content"),
    createAsset("block-content-gallery-a", [125, 66, 96], "content"),
    createAsset("block-content-gallery-b", [66, 102, 135], "content"),
  ]);
  const authorRows = await db.insert(authors).values({
    internalKey: "test-e2e-block-author",
    displayName: "TEST E2E Block Author",
    isOrganization: true,
  }).returning({ id: authors.id });
  const contentId = await createContentDraft(db, actor, {
    channel: "fabric_knowledge", type: "guide", authorId: authorRows[0]!.id,
    title: "TEST E2E Block Media Content", body: "Initial synthetic narrative.",
  });
  await updateContent(db, actor, contentId, {
    title: "TEST E2E Block Media Content", body: "", authorId: authorRows[0]!.id, type: "guide", expectedEditorDocumentVersion: 1,
    seoTitle: "TEST E2E Block Media Content", metaDescription: "Synthetic noindex Content used only for Stage 1 remediation browser checks.",
    structuredDocument: { version: 1, blocks: [
      { id: "content-paragraph", type: "paragraph", text: "Synthetic Content Block projection is visible." },
      { id: "content-image", type: "image", mediaKey: "inline-image" },
      { id: "content-gallery", type: "gallery", mediaKeys: ["gallery-a", "gallery-b"] },
    ] },
    media: [
      { assetId: contentAssetIds[0]!, role: "inline", sortOrder: 0, altText: "Synthetic Content inline", caption: null, isVisible: true, blockKey: "inline-image" },
      { assetId: contentAssetIds[1]!, role: "gallery", sortOrder: 1, altText: "Synthetic Content gallery A", caption: "Synthetic Content gallery A", isVisible: true, blockKey: "gallery-a" },
      { assetId: contentAssetIds[2]!, role: "gallery", sortOrder: 2, altText: "Synthetic Content gallery B", caption: "Synthetic Content gallery B", isVisible: true, blockKey: "gallery-b" },
    ],
  });
  await submitContentForReview(db, actor, contentId);
  await publishContent(db, actor, contentId);

  const enabledStaticAssetId = "91000000-0000-4000-8000-000000000001";
  const disabledStaticAssetId = "91000000-0000-4000-8000-000000000002";
  const aboutStaticAssetId = "91000000-0000-4000-8000-000000000003";
  const staticAssets = [
    { id: enabledStaticAssetId, label: "enabled", color: [18, 105, 90] as const },
    { id: disabledStaticAssetId, label: "disabled", color: [105, 72, 38] as const },
    { id: aboutStaticAssetId, label: "about-enabled", color: [65, 98, 120] as const },
  ] as const;
  for (const item of staticAssets) {
    const objectKey = `e2e/static-${item.label}.jpg`;
    const bytes = await imageBytes(item.color[0], item.color[1], item.color[2]);
    await storage.put("public", objectKey, bytes, "image/jpeg");
    await db.insert(assets).values({
      id: item.id,
      originalFileName: `TEST-static-${item.label}.jpg`,
      storageProvider: "local",
      storagePartition: "public",
      objectKey,
      access: "public",
      category: "company",
      status: "ready",
      scanStatus: "passed",
      declaredMimeType: "image/jpeg",
      detectedMimeType: "image/jpeg",
      byteSize: bytes.byteLength,
      sha256: `stage1-e2e-static-${item.label}`,
    });
  }
  const placement = (assetId: string) => ({
    assetId, placementKey: "hero" as const, viewport: "desktop" as const, role: "hero" as const,
    sortOrder: 0, altText: "Synthetic Static Page hero", caption: null,
    focalX: 50, focalY: 50, overlayOpacity: 0.35, isVisible: true,
  });
  const enabledRevision = await proposeStaticPageConfigRevision(db, actor, {
    ...DEFAULT_STATIC_PAGE_CONFIGS.home,
    placements: [placement(enabledStaticAssetId)],
  }, "TEST E2E enabled Static media");
  await applyStaticPageConfigRevision(db, actor, enabledRevision);
  const disabledRevision = await proposeStaticPageConfigRevision(db, actor, {
    ...DEFAULT_STATIC_PAGE_CONFIGS.about,
    modules: { ...DEFAULT_STATIC_PAGE_CONFIGS.about.modules, hero: false },
    placements: [{ ...placement(disabledStaticAssetId), placementKey: "hero" as const }],
  }, "TEST E2E disabled Static media");
  await applyStaticPageConfigRevision(db, actor, disabledRevision);
  const aboutRevision = await proposeStaticPageConfigRevision(db, actor, {
    ...DEFAULT_STATIC_PAGE_CONFIGS.about,
    placements: [{
      ...placement(aboutStaticAssetId),
      placementKey: "service_strength" as const,
      role: "detail" as const,
    }],
  }, "TEST E2E enabled About Static media");
  await applyStaticPageConfigRevision(db, actor, aboutRevision);

  return {
    productPath: "/products/test-e2e-block-media-product/",
    contentPath: "/fabric-knowledge/test-e2e-block-media-content/",
    renderableProductPaths: {
      empty: "/products/test-e2e-renderable-empty/",
      divider: "/products/test-e2e-renderable-divider/",
      unresolvedImage: "/products/test-e2e-renderable-unresolved-image/",
      hiddenImage: "/products/test-e2e-renderable-hidden-image/",
      unresolvedGallery: "/products/test-e2e-renderable-unresolved-gallery/",
      filteredRelated: "/products/test-e2e-renderable-filtered-related/",
      paragraph: "/products/test-e2e-renderable-paragraph/",
      heading: "/products/test-e2e-renderable-heading/",
      validMedia: "/products/test-e2e-block-media-product/",
      independentModules: "/products/test-e2e-renderable-independent-modules/",
      revisionBefore: "/products/test-e2e-renderable-revision-before/",
      revisionAfter: "/products/test-e2e-renderable-revision-after/",
    },
    enabledStaticAssetId,
    disabledStaticAssetId,
    aboutStaticAssetId,
  };
}

async function main() {
  if (process.env.APP_ENV !== "test" || !process.env.CWT_E2E_TEMP_ROOT) {
    throw new Error("E2E Block projection fixtures require the isolated E2E environment.");
  }
  try {
    const result = databaseConnection.kind === "pglite"
      ? await seed(databaseConnection.db)
      : await seed(databaseConnection.db);
    process.stdout.write(`Block projection E2E fixtures ready: ${JSON.stringify(result)}\n`);
  } finally {
    await databaseConnection.close();
  }
}

void main();
