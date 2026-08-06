import { and, eq } from "drizzle-orm";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import {
  applyProductRevision,
  confirmRealProductBasis,
  createProductDraft,
  publishReviewedProduct,
  submitProductForReview,
  submitProductBlockDraftForReview,
  updateProductBlocks,
  updateProductStructure,
} from "@/catalog/product-service";
import {
  applyContentRevision,
  createContentDraft,
  publishContent,
  setContentIndexStatus,
  submitContentForReview,
  submitContentBlockDraftForReview,
  updateContent,
} from "@/content/content-service";
import {
  assets,
  applications,
  authors,
  contentAssets,
  contentLocalizations,
  contents,
  editorialRevisions,
  internalLinkRelations,
  keywordPageMappings,
  productAssets,
  productLocalizations,
  productTaxonomyTerms,
  products,
  redirects,
  routes,
  seoMetadata,
  seoTopicMembers,
  seoTopics,
  taxonomyTerms,
  users,
} from "@/db/schema";
import { BlockRenderer } from "@/editorial/block-renderer";
import { legacyTextToBlockDocument, parseBlockDocument } from "@/editorial/blocks";
import { createTestDatabase } from "@/test/database";
import { queryIndexableRoutes } from "@/seo/public-index";
import { registerSystemPublicRoutes } from "@/seo/system-public-routes";
import { runGovernedMutation } from "@/audit/governed-mutation";

import {
  BlockReferenceResolutionError,
  resolveBlockPublicProjection,
  synchronizeBlockInternalLinks,
} from "./block-references";

type TestConnection = Awaited<ReturnType<typeof createTestDatabase>>;

async function insertAsset(
  connection: TestConnection,
  label: string,
  overrides: Partial<typeof assets.$inferInsert> = {},
) {
  const rows = await connection.db.insert(assets).values({
    originalFileName: `TEST-${label}.jpg`,
    storageProvider: "test",
    storagePartition: "public",
    objectKey: `test/${label}-${crypto.randomUUID()}.jpg`,
    access: "public",
    category: "product",
    status: "ready",
    scanStatus: "passed",
    declaredMimeType: "image/jpeg",
    detectedMimeType: "image/jpeg",
    byteSize: 100,
    sha256: `stage1-${label}-${crypto.randomUUID()}`,
    ...overrides,
  }).returning({ id: assets.id });
  return rows[0]!.id;
}

async function productResolverFixture() {
  const connection = await createTestDatabase();
  const assetA = await insertAsset(connection, "product-owner-a");
  const assetB = await insertAsset(connection, "product-owner-b");
  const categoryRows = await connection.db.insert(taxonomyTerms).values({
    internalKey: `resolver-category-${crypto.randomUUID()}`,
    dimension: "material_fiber",
  }).returning({ id: taxonomyTerms.id });
  const createOwner = () => connection.db.transaction(async (transaction) => {
    const productRows = await transaction.insert(products).values({ status: "draft" }).returning({ id: products.id });
    await transaction.insert(productTaxonomyTerms).values({
      productId: productRows[0]!.id,
      taxonomyTermId: categoryRows[0]!.id,
      isPrimary: true,
    });
    return productRows[0]!.id;
  });
  const productA = await createOwner();
  const productB = await createOwner();
  await connection.db.insert(productLocalizations).values([
    { productId: productA, locale: "en", name: "TEST Product A" },
    { productId: productB, locale: "en", name: "TEST Product B" },
  ]);
  await connection.db.insert(productAssets).values([
    { productId: productA, assetId: assetA, role: "hero", isVisible: true },
    { productId: productB, assetId: assetB, role: "hero", isVisible: true },
  ]);
  return { connection, productA, productB, assetA, assetB };
}

function productImageDocument(mediaKey: string) {
  return parseBlockDocument({
    version: 1,
    blocks: [{ id: "product-image", type: "image", mediaKey }],
  }, "product");
}

async function contentResolverFixture() {
  const connection = await createTestDatabase();
  const authorRows = await connection.db.insert(authors).values({
    internalKey: `resolver-author-${crypto.randomUUID()}`,
    displayName: "TEST Resolver Author",
    isOrganization: true,
  }).returning({ id: authors.id });
  const contentRows = await connection.db.insert(contents).values([
    { channel: "fabric_knowledge", type: "guide", status: "draft", authorId: authorRows[0]!.id },
    { channel: "fabric_knowledge", type: "guide", status: "draft", authorId: authorRows[0]!.id },
  ]).returning({ id: contents.id });
  const contentA = contentRows[0]!.id;
  const contentB = contentRows[1]!.id;
  await connection.db.insert(contentLocalizations).values([
    { contentId: contentA, locale: "en", title: "TEST Content A", body: "" },
    { contentId: contentB, locale: "en", title: "TEST Content B", body: "" },
  ]);
  const assetA = await insertAsset(connection, "content-owner-a", { category: "content" });
  const assetB = await insertAsset(connection, "content-owner-b", { category: "content" });
  await connection.db.insert(contentAssets).values([
    { contentId: contentA, assetId: assetA, role: "inline", blockKey: "content-a", isVisible: true },
    { contentId: contentB, assetId: assetB, role: "inline", blockKey: "content-b", isVisible: true },
  ]);
  return { connection, contentA, contentB, assetA, assetB };
}

function contentImageDocument(mediaKey: string) {
  return parseBlockDocument({
    version: 1,
    blocks: [{ id: "content-image", type: "image", mediaKey }],
  }, "content");
}

describe("owner-aware Product Block media", () => {
  it.each([
    "missing",
    "other-owner",
    "hidden",
    "unbound",
    "private",
    "import",
    "pending-scan",
    "revoked-rights",
  ] as const)("rejects %s Product media", async (failure) => {
    const fixture = await productResolverFixture();
    let key = fixture.assetA;
    if (failure === "missing") key = crypto.randomUUID();
    if (failure === "other-owner") key = fixture.assetB;
    if (failure === "hidden") {
      await fixture.connection.db.update(productAssets).set({ isVisible: false }).where(and(
        eq(productAssets.productId, fixture.productA),
        eq(productAssets.assetId, fixture.assetA),
      ));
    }
    if (failure === "unbound") {
      await fixture.connection.db.delete(productAssets).where(and(
        eq(productAssets.productId, fixture.productA),
        eq(productAssets.assetId, fixture.assetA),
      ));
    }
    if (failure === "private") {
      await fixture.connection.db.update(assets).set({ storagePartition: "private", access: "private" }).where(eq(assets.id, fixture.assetA));
    }
    if (failure === "import") {
      await fixture.connection.db.update(assets).set({ storagePartition: "import", access: "internal" }).where(eq(assets.id, fixture.assetA));
    }
    if (failure === "pending-scan") {
      await fixture.connection.db.update(assets).set({ scanStatus: "pending" }).where(eq(assets.id, fixture.assetA));
    }
    if (failure === "revoked-rights") {
      await fixture.connection.db.update(assets).set({ effectiveRightsDecision: "revoked" }).where(eq(assets.id, fixture.assetA));
    }
    await expect(resolveBlockPublicProjection(
      fixture.connection.db,
      { type: "product", id: fixture.productA },
      productImageDocument(key),
    )).rejects.toBeInstanceOf(BlockReferenceResolutionError);
    await fixture.connection.close();
  });

  it("resolves and renders a valid Product Image from the current owner relation", async () => {
    const fixture = await productResolverFixture();
    const document = productImageDocument(fixture.assetA);
    const projection = await resolveBlockPublicProjection(
      fixture.connection.db,
      { type: "product", id: fixture.productA },
      document,
    );
    expect(projection.mediaAssetIds.get(fixture.assetA)).toBe(fixture.assetA);
    expect(projection.hasRenderableContent).toBe(true);
    expect(projection.renderableDocument).toEqual(document);
    expect(renderToStaticMarkup(<BlockRenderer document={projection.renderableDocument} media={{
      [fixture.assetA]: { id: fixture.assetA, url: "/media/test-product.jpg", alt: "TEST product", caption: null },
    }} />)).toContain("/media/test-product.jpg");
    await fixture.connection.close();
  });
});

describe("owner-aware Content Block media", () => {
  it.each([
    "missing",
    "other-owner",
    "hidden",
    "unbound",
    "private",
    "failed-scan",
    "revoked-rights",
  ] as const)("rejects %s Content media", async (failure) => {
    const fixture = await contentResolverFixture();
    let key = "content-a";
    if (failure === "missing") key = "missing-key";
    if (failure === "other-owner") key = "content-b";
    if (failure === "hidden") {
      await fixture.connection.db.update(contentAssets).set({ isVisible: false }).where(and(
        eq(contentAssets.contentId, fixture.contentA),
        eq(contentAssets.assetId, fixture.assetA),
      ));
    }
    if (failure === "unbound") {
      await fixture.connection.db.delete(contentAssets).where(and(
        eq(contentAssets.contentId, fixture.contentA),
        eq(contentAssets.assetId, fixture.assetA),
      ));
    }
    if (failure === "private") {
      await fixture.connection.db.update(assets).set({ storagePartition: "private", access: "private" }).where(eq(assets.id, fixture.assetA));
    }
    if (failure === "failed-scan") {
      await fixture.connection.db.update(assets).set({ scanStatus: "failed" }).where(eq(assets.id, fixture.assetA));
    }
    if (failure === "revoked-rights") {
      await fixture.connection.db.update(assets).set({ effectiveRightsDecision: "revoked" }).where(eq(assets.id, fixture.assetA));
    }
    await expect(resolveBlockPublicProjection(
      fixture.connection.db,
      { type: "content", id: fixture.contentA },
      contentImageDocument(key),
    )).rejects.toBeInstanceOf(BlockReferenceResolutionError);
    await fixture.connection.close();
  });

  it("rejects ambiguous Content blockKey candidates before persistence", async () => {
    const fixture = await contentResolverFixture();
    await expect(resolveBlockPublicProjection(
      fixture.connection.db,
      {
        type: "content",
        id: fixture.contentA,
        media: [
          { assetId: fixture.assetA, role: "inline", isVisible: true, blockKey: "duplicate" },
          { assetId: fixture.assetB, role: "inline", isVisible: true, blockKey: "duplicate" },
        ],
      },
      contentImageDocument("duplicate"),
    )).rejects.toThrow(/ambiguous/);
    await fixture.connection.close();
  });

  it("resolves and renders a valid Content Image from its unique blockKey", async () => {
    const fixture = await contentResolverFixture();
    const document = contentImageDocument("content-a");
    const projection = await resolveBlockPublicProjection(
      fixture.connection.db,
      { type: "content", id: fixture.contentA },
      document,
    );
    expect(projection.mediaAssetIds.get("content-a")).toBe(fixture.assetA);
    expect(renderToStaticMarkup(<BlockRenderer document={document} media={{
      "content-a": { id: fixture.assetA, url: "/media/test-content.jpg", alt: "TEST content", caption: null },
    }} />)).toContain("/media/test-content.jpg");
    await fixture.connection.close();
  });
});

describe("normalized readable Block projection", () => {
  it("does not treat a Divider-only document as readable", async () => {
    const connection = await createTestDatabase();
    const projection = await resolveBlockPublicProjection(connection.db, { type: "content", id: crypto.randomUUID() }, parseBlockDocument({ version: 1, blocks: [{ id: "divider", type: "divider" }] }, "content"));
    expect(projection.readableText).toBe("");
    expect(projection.hasRenderableContent).toBe(false);
    await connection.close();
  });

  it("filters unresolved public media from the same projection without inventing narrative", async () => {
    const connection = await createTestDatabase();
    const projection = await resolveBlockPublicProjection(
      connection.db,
      { type: "product", id: crypto.randomUUID() },
      productImageDocument(crypto.randomUUID()),
      { invalidReferences: "filter" },
    );
    expect(projection.referencesValid).toBe(false);
    expect(projection.hasRenderableContent).toBe(false);
    expect(projection.renderableDocument.blocks).toEqual([]);
    await connection.close();
  });

  it("treats a Heading as renderable narrative", async () => {
    const connection = await createTestDatabase();
    const projection = await resolveBlockPublicProjection(
      connection.db,
      { type: "product", id: crypto.randomUUID() },
      parseBlockDocument({ version: 1, blocks: [{ id: "heading", type: "heading", level: 2, text: "Renderable heading" }] }, "product"),
    );
    expect(projection.hasRenderableContent).toBe(true);
    expect(projection.readableText).toBe("Renderable heading");
    await connection.close();
  });

  it("rejects unresolved Image-only and Gallery-only documents", async () => {
    const connection = await createTestDatabase();
    await expect(resolveBlockPublicProjection(connection.db, { type: "content", id: crypto.randomUUID() }, contentImageDocument("missing"))).rejects.toThrow();
    await expect(resolveBlockPublicProjection(connection.db, { type: "content", id: crypto.randomUUID() }, parseBlockDocument({ version: 1, blocks: [{ id: "gallery", type: "gallery", mediaKeys: ["missing-a", "missing-b"] }] }, "content"))).rejects.toThrow();
    await connection.close();
  });

  it("does not accept a document containing only filtered Related entities", async () => {
    const fixture = await productResolverFixture();
    const document = parseBlockDocument({ version: 1, blocks: [{ id: "related", type: "related_products", productIds: [fixture.productB] }] }, "product");
    await expect(resolveBlockPublicProjection(fixture.connection.db, { type: "product", id: fixture.productA }, document)).rejects.toThrow(/current public records/);
    const filtered = await resolveBlockPublicProjection(
      fixture.connection.db,
      { type: "product", id: fixture.productA },
      document,
      { invalidReferences: "filter" },
    );
    expect(filtered.referencesValid).toBe(false);
    expect(filtered.hasRenderableContent).toBe(false);
    expect(filtered.renderableDocument.blocks).toEqual([]);
    await fixture.connection.close();
  });

  it("uses normalized Paragraph text as readable narrative", async () => {
    const connection = await createTestDatabase();
    const document = parseBlockDocument({ version: 1, blocks: [{ id: "paragraph", type: "paragraph", text: "Readable synthetic narrative." }] }, "content");
    expect((await resolveBlockPublicProjection(connection.db, { type: "content", id: crypto.randomUUID() }, document)).readableText).toBe("Readable synthetic narrative.");
    await connection.close();
  });

  it("fails closed on an unknown Block version", () => {
    expect(() => parseBlockDocument({ version: 2, blocks: [] }, "content")).toThrow();
  });

  it("preserves legacy Paragraph readable-text parity", async () => {
    const connection = await createTestDatabase();
    const projection = await resolveBlockPublicProjection(connection.db, { type: "content", id: crypto.randomUUID() }, legacyTextToBlockDocument("Legacy synthetic paragraph."));
    expect(projection.readableText).toBe("Legacy synthetic paragraph.");
    await connection.close();
  });
});

describe("save, Revision Apply, Publish, and required Audit boundaries", () => {
  it("applies fixed CTA Route IDs through both Product and Content Revision services", async () => {
    const productFixture = await productResolverFixture();
    const productRoutes = await registerSystemPublicRoutes(productFixture.connection.db);
    const productReviewer = await productFixture.connection.db.insert(users).values({
      email: `fixed-product-reviewer-${crypto.randomUUID()}@example.test`,
      displayName: "TEST Fixed Product Reviewer",
      role: "reviewer_publisher",
      passwordHash: "test",
    }).returning({ id: users.id });
    const productSource = await productFixture.connection.db.insert(routes).values({
      entityType: "product",
      entityId: productFixture.productA,
      locale: "en",
      path: `/products/fixed-source-${crypto.randomUUID()}/`,
    }).returning({ id: routes.id });
    const productRevision = await productFixture.connection.db.insert(editorialRevisions).values({
      entityType: "product",
      entityId: productFixture.productA,
      locale: "en",
      versionNumber: 1,
      status: "in_review",
      snapshot: {
        kind: "editorial_blocks",
        name: "TEST Product A",
        shortDescription: null,
        document: { version: 1, blocks: [{ id: "fixed-product", type: "cta", label: "Get a Quote", href: "/get-quote/" }] },
        expectedEditorDocumentVersion: 1,
      },
      changeSummary: "TEST Product fixed CTA",
    }).returning({ id: editorialRevisions.id });
    await applyProductRevision(productFixture.connection.db, {
      userId: productReviewer[0]!.id,
      role: "reviewer_publisher",
    }, productRevision[0]!.id);
    expect(await productFixture.connection.db.select().from(internalLinkRelations).where(eq(
      internalLinkRelations.sourceRouteId,
      productSource[0]!.id,
    ))).toEqual([expect.objectContaining({
      destinationRouteId: productRoutes.get("/get-quote/"),
      anchorText: "Get a Quote",
    })]);
    await productFixture.connection.close();

    const contentFixture = await contentResolverFixture();
    const contentRoutes = await registerSystemPublicRoutes(contentFixture.connection.db);
    const contentReviewer = await contentFixture.connection.db.insert(users).values({
      email: `fixed-content-reviewer-${crypto.randomUUID()}@example.test`,
      displayName: "TEST Fixed Content Reviewer",
      role: "reviewer_publisher",
      passwordHash: "test",
    }).returning({ id: users.id });
    const contentSource = await contentFixture.connection.db.insert(routes).values({
      entityType: "content",
      entityId: contentFixture.contentA,
      locale: "en",
      path: `/fabric-knowledge/fixed-source-${crypto.randomUUID()}/`,
    }).returning({ id: routes.id });
    const contentRevision = await contentFixture.connection.db.insert(editorialRevisions).values({
      entityType: "content",
      entityId: contentFixture.contentA,
      locale: "en",
      versionNumber: 1,
      status: "in_review",
      snapshot: {
        kind: "content_blocks_v1",
        title: "TEST Content A",
        excerpt: null,
        document: { version: 1, blocks: [{ id: "fixed-content", type: "cta", label: "Get a Quote", href: "/get-quote/" }] },
        expectedEditorDocumentVersion: 1,
      },
      changeSummary: "TEST Content fixed CTA",
    }).returning({ id: editorialRevisions.id });
    await applyContentRevision(contentFixture.connection.db, {
      userId: contentReviewer[0]!.id,
      role: "reviewer_publisher",
    }, contentRevision[0]!.id);
    expect(await contentFixture.connection.db.select().from(internalLinkRelations).where(eq(
      internalLinkRelations.sourceRouteId,
      contentSource[0]!.id,
    ))).toEqual([expect.objectContaining({
      destinationRouteId: contentRoutes.get("/get-quote/"),
      anchorText: "Get a Quote",
    })]);
    await contentFixture.connection.close();
  });

  it("synchronizes Product and Content Block links into the existing current-Route authority", async () => {
    const productFixture = await productResolverFixture();
    const reviewerRows = await productFixture.connection.db.insert(users).values({
      email: `link-reviewer-${crypto.randomUUID()}@example.test`, displayName: "TEST Link Reviewer", role: "reviewer_publisher", passwordHash: "test",
    }).returning({ id: users.id });
    const destinationApplicationRows = await productFixture.connection.db.insert(applications).values({
      internalKey: `link-destination-${crypto.randomUUID()}`, status: "published",
    }).returning({ id: applications.id });
    const sourceRouteRows = await productFixture.connection.db.insert(routes).values({
      entityType: "product", entityId: productFixture.productA, locale: "en", path: `/products/link-source-${crypto.randomUUID()}/`,
    }).returning({ id: routes.id });
    const destinationRouteRows = await productFixture.connection.db.insert(routes).values({
      entityType: "application", entityId: destinationApplicationRows[0]!.id, locale: "en", path: `/applications/link-target-${crypto.randomUUID()}/`,
    }).returning({ id: routes.id, path: routes.path });
    const redirectedSourcePath = `/applications/old-link-target-${crypto.randomUUID()}/`;
    await productFixture.connection.db.insert(redirects).values({
      sourcePath: redirectedSourcePath,
      destinationPath: destinationRouteRows[0]!.path,
      reason: "TEST normalize Block link to current Route",
    });
    const productRevisionRows = await productFixture.connection.db.insert(editorialRevisions).values({
      entityType: "product", entityId: productFixture.productA, locale: "en", versionNumber: 1, status: "in_review",
      snapshot: {
        kind: "editorial_blocks", name: "TEST Product A", shortDescription: null,
        document: { version: 1, blocks: [{ id: "product-cta", type: "cta", label: "TEST Application", href: redirectedSourcePath }] },
        expectedEditorDocumentVersion: 1,
      },
      changeSummary: "TEST Product link",
    }).returning({ id: editorialRevisions.id });
    await applyProductRevision(productFixture.connection.db, {
      userId: reviewerRows[0]!.id, role: "reviewer_publisher",
    }, productRevisionRows[0]!.id);
    expect(await productFixture.connection.db.select().from(internalLinkRelations).where(eq(
      internalLinkRelations.sourceRouteId, sourceRouteRows[0]!.id,
    ))).toEqual([expect.objectContaining({
      destinationRouteId: destinationRouteRows[0]!.id,
      anchorText: "TEST Application",
      status: "published",
    })]);
    expect((await productFixture.connection.db.select({
      document: productLocalizations.structuredBlocks,
    }).from(productLocalizations).where(eq(
      productLocalizations.productId, productFixture.productA,
    )))[0]?.document).toMatchObject({
      blocks: [expect.objectContaining({ href: destinationRouteRows[0]!.path })],
    });
    const removeRevisionRows = await productFixture.connection.db.insert(editorialRevisions).values({
      entityType: "product", entityId: productFixture.productA, locale: "en", versionNumber: 2, status: "in_review",
      snapshot: {
        kind: "editorial_blocks", name: "TEST Product A", shortDescription: null,
        document: { version: 1, blocks: [{ id: "link-removed", type: "paragraph", text: "TEST link removed." }] }, expectedEditorDocumentVersion: 2,
      },
      changeSummary: "TEST Product link removal",
    }).returning({ id: editorialRevisions.id });
    await applyProductRevision(productFixture.connection.db, {
      userId: reviewerRows[0]!.id, role: "reviewer_publisher",
    }, removeRevisionRows[0]!.id);
    expect(await productFixture.connection.db.select().from(internalLinkRelations).where(eq(
      internalLinkRelations.sourceRouteId, sourceRouteRows[0]!.id,
    ))).toHaveLength(0);
    await productFixture.connection.close();

    const contentFixture = await contentResolverFixture();
    const contentReviewerRows = await contentFixture.connection.db.insert(users).values({
      email: `content-link-reviewer-${crypto.randomUUID()}@example.test`, displayName: "TEST Content Link Reviewer", role: "reviewer_publisher", passwordHash: "test",
    }).returning({ id: users.id });
    const targetRows = await contentFixture.connection.db.insert(applications).values({
      internalKey: `content-link-target-${crypto.randomUUID()}`, status: "published",
    }).returning({ id: applications.id });
    const contentSourceRouteRows = await contentFixture.connection.db.insert(routes).values({
      entityType: "content", entityId: contentFixture.contentA, locale: "en", path: `/fabric-knowledge/link-source-${crypto.randomUUID()}/`,
    }).returning({ id: routes.id });
    const contentTargetRouteRows = await contentFixture.connection.db.insert(routes).values({
      entityType: "application", entityId: targetRows[0]!.id, locale: "en", path: `/applications/content-link-target-${crypto.randomUUID()}/`,
    }).returning({ id: routes.id, path: routes.path });
    const contentRevisionRows = await contentFixture.connection.db.insert(editorialRevisions).values({
      entityType: "content", entityId: contentFixture.contentA, locale: "en", versionNumber: 1, status: "in_review",
      snapshot: {
        kind: "content_blocks_v1", title: "TEST Content A", excerpt: null,
        document: { version: 1, blocks: [{ id: "content-cta", type: "cta", label: "TEST Content CTA", href: contentTargetRouteRows[0]!.path }] },
        expectedEditorDocumentVersion: 1,
      },
      changeSummary: "TEST Content link",
    }).returning({ id: editorialRevisions.id });
    await applyContentRevision(contentFixture.connection.db, {
      userId: contentReviewerRows[0]!.id, role: "reviewer_publisher",
    }, contentRevisionRows[0]!.id);
    expect(await contentFixture.connection.db.select().from(internalLinkRelations).where(eq(
      internalLinkRelations.sourceRouteId, contentSourceRouteRows[0]!.id,
    ))).toEqual([expect.objectContaining({ destinationRouteId: contentTargetRouteRows[0]!.id, status: "published" })]);
    await contentFixture.connection.close();
  });

  it("revalidates Product media at Apply and leaves approved public narrative unchanged", async () => {
    const connection = await createTestDatabase();
    const userRows = await connection.db.insert(users).values([
      { email: `product-editor-${crypto.randomUUID()}@example.test`, displayName: "TEST Product Editor", role: "product_editor", passwordHash: "test" },
      { email: `product-reviewer-${crypto.randomUUID()}@example.test`, displayName: "TEST Product Reviewer", role: "reviewer_publisher", passwordHash: "test" },
    ]).returning({ id: users.id, role: users.role });
    const editor = { userId: userRows.find((row) => row.role === "product_editor")!.id, role: "product_editor" as const };
    const reviewer = { userId: userRows.find((row) => row.role === "reviewer_publisher")!.id, role: "reviewer_publisher" as const };
    const categoryRows = await connection.db.insert(taxonomyTerms).values({ internalKey: `block-product-${crypto.randomUUID()}`, dimension: "material_fiber" }).returning({ id: taxonomyTerms.id });
    const heroAssetId = await insertAsset(connection, "workflow-product-hero");
    const detailAssetId = await insertAsset(connection, "workflow-product-detail");
    const productId = await createProductDraft(connection.db, editor, {
      name: "TEST Block Workflow Product",
      primaryTaxonomyTermId: categoryRows[0]!.id,
      assetIds: [heroAssetId, detailAssetId],
    });
    await updateProductStructure(connection.db, editor, productId, {
      primaryTaxonomyTermId: categoryRows[0]!.id,
      additionalTaxonomyTermIds: [], applicationIds: [], tagNames: [],
      assetIds: [heroAssetId, detailAssetId], heroAssetId,
      media: [
        { assetId: heroAssetId, role: "hero", sortOrder: 0, altText: "TEST hero", caption: null, isVisible: true },
        { assetId: detailAssetId, role: "detail", sortOrder: 1, altText: "TEST detail", caption: null, isVisible: true },
      ],
      features: [], faqs: [], colorOptionsDisplay: "inherit", customAvailableDisplay: "inherit", sampleAvailableDisplay: "inherit", moqNoteDisplay: "inherit",
    });
    await updateProductBlocks(connection.db, editor, productId, {
      name: "TEST Block Workflow Product", shortDescription: null,
      document: { version: 1, blocks: [{ id: "approved", type: "paragraph", text: "Approved public narrative." }] },
      expectedEditorDocumentVersion: 1,
    });
    await confirmRealProductBasis(connection.db, reviewer, productId, "physical_sample", "Synthetic test evidence");
    await submitProductForReview(connection.db, editor, productId);
    await publishReviewedProduct(connection.db, reviewer, productId);
    const revisionId = await updateProductBlocks(connection.db, editor, productId, {
      name: "TEST Block Workflow Product", shortDescription: null,
      document: { version: 1, blocks: [{ id: "pending-image", type: "image", mediaKey: detailAssetId }] },
      expectedEditorDocumentVersion: 2,
    });
    expect(revisionId).toBeTruthy();
    await submitProductBlockDraftForReview(connection.db, editor, productId, revisionId!);
    await connection.db.update(productAssets).set({ isVisible: false }).where(and(eq(productAssets.productId, productId), eq(productAssets.assetId, detailAssetId)));
    await expect(applyProductRevision(connection.db, reviewer, revisionId!)).rejects.toThrow(/visible, role-compatible/);
    const localization = (await connection.db.select({ document: productLocalizations.structuredBlocks }).from(productLocalizations).where(eq(productLocalizations.productId, productId)))[0]!;
    expect(parseBlockDocument(localization.document, "product").blocks[0]).toMatchObject({ type: "paragraph", text: "Approved public narrative." });
    await connection.close();
  });

  it("rolls back Product Revision state when Required Audit fails", async () => {
    const fixture = await productResolverFixture();
    const reviewerRows = await fixture.connection.db.insert(users).values({ email: `audit-reviewer-${crypto.randomUUID()}@example.test`, displayName: "Audit Reviewer", role: "reviewer_publisher", passwordHash: "test" }).returning({ id: users.id });
    const revisionRows = await fixture.connection.db.insert(editorialRevisions).values({
      entityType: "product", entityId: fixture.productA, locale: "en", versionNumber: 1, status: "in_review",
      snapshot: { kind: "editorial_blocks", name: "TEST Product A", shortDescription: null, document: { version: 1, blocks: [{ id: "audit", type: "paragraph", text: "Audit replacement." }] }, expectedEditorDocumentVersion: 1 },
      changeSummary: "TEST Audit rollback",
    }).returning({ id: editorialRevisions.id });
    await expect(applyProductRevision(fixture.connection.db, { userId: reviewerRows[0]!.id, role: "reviewer_publisher" }, revisionRows[0]!.id, {
      auditWriter: async () => { throw new Error("TEST Product Audit failure"); },
    })).rejects.toThrow(/Product Audit failure/);
    expect((await fixture.connection.db.select({ status: editorialRevisions.status }).from(editorialRevisions).where(eq(editorialRevisions.id, revisionRows[0]!.id)))[0]?.status).toBe("in_review");
    expect((await fixture.connection.db.select({ version: productLocalizations.editorDocumentVersion }).from(productLocalizations).where(eq(productLocalizations.productId, fixture.productA)))[0]?.version).toBe(1);
    await fixture.connection.close();
  });

  it("revalidates Content media at Apply and rolls back Required Audit failures", async () => {
    const connection = await createTestDatabase();
    const userRows = await connection.db.insert(users).values([
      { email: `content-editor-${crypto.randomUUID()}@example.test`, displayName: "TEST Content Editor", role: "content_editor", passwordHash: "test" },
      { email: `content-reviewer-${crypto.randomUUID()}@example.test`, displayName: "TEST Content Reviewer", role: "reviewer_publisher", passwordHash: "test" },
    ]).returning({ id: users.id, role: users.role });
    const editor = { userId: userRows.find((row) => row.role === "content_editor")!.id, role: "content_editor" as const };
    const reviewer = { userId: userRows.find((row) => row.role === "reviewer_publisher")!.id, role: "reviewer_publisher" as const };
    const authorRows = await connection.db.insert(authors).values({ internalKey: `workflow-author-${crypto.randomUUID()}`, displayName: "TEST Workflow Author", isOrganization: true }).returning({ id: authors.id });
    const assetId = await insertAsset(connection, "workflow-content", { category: "content" });
    const contentId = await createContentDraft(connection.db, editor, { channel: "fabric_knowledge", type: "guide", authorId: authorRows[0]!.id, title: "TEST Content Workflow", body: "Approved content narrative." });
    await submitContentForReview(connection.db, editor, contentId);
    await publishContent(connection.db, reviewer, contentId);
    const mediaRevision = await updateContent(connection.db, editor, contentId, {
      title: "TEST Content Workflow", body: "", authorId: authorRows[0]!.id, type: "guide", expectedEditorDocumentVersion: 1,
      structuredDocument: { version: 1, blocks: [{ id: "valid-image", type: "image", mediaKey: "inline-image" }, { id: "text", type: "paragraph", text: "Approved image narrative." }] },
      media: [{ assetId, role: "inline", sortOrder: 0, altText: "TEST inline", caption: null, isVisible: true, blockKey: "inline-image" }],
    });
    await submitContentBlockDraftForReview(connection.db, editor, contentId, mediaRevision!);
    await applyContentRevision(connection.db, reviewer, mediaRevision!);
    const pendingRevision = await updateContent(connection.db, editor, contentId, {
      title: "TEST Content Workflow", body: "", authorId: authorRows[0]!.id, type: "guide", expectedEditorDocumentVersion: 2,
      structuredDocument: { version: 1, blocks: [{ id: "pending-image", type: "image", mediaKey: "inline-image" }, { id: "pending-text", type: "paragraph", text: "Pending narrative." }] },
    });
    await submitContentBlockDraftForReview(connection.db, editor, contentId, pendingRevision!);
    await connection.db.update(contentAssets).set({ isVisible: false }).where(eq(contentAssets.contentId, contentId));
    await expect(applyContentRevision(connection.db, reviewer, pendingRevision!)).rejects.toThrow(/visible, role-compatible/);
    await connection.db.update(contentAssets).set({ isVisible: true }).where(eq(contentAssets.contentId, contentId));
    await expect(applyContentRevision(connection.db, reviewer, pendingRevision!, {
      auditWriter: async () => { throw new Error("TEST Content Audit failure"); },
    })).rejects.toThrow(/Content Audit failure/);
    expect((await connection.db.select({ status: editorialRevisions.status }).from(editorialRevisions).where(eq(editorialRevisions.id, pendingRevision!)))[0]?.status).toBe("in_review");
    expect((await connection.db.select({ version: contentLocalizations.editorDocumentVersion }).from(contentLocalizations).where(eq(contentLocalizations.contentId, contentId)))[0]?.version).toBe(2);
    await connection.close();
  });

  it("re-evaluates readable projection on indexed Content Revision Apply and sitemap eligibility", async () => {
    const connection = await createTestDatabase();
    const userRows = await connection.db.insert(users).values([
      { email: `seo-editor-${crypto.randomUUID()}@example.test`, displayName: "TEST SEO Editor", role: "content_editor", passwordHash: "test" },
      { email: `seo-reviewer-${crypto.randomUUID()}@example.test`, displayName: "TEST SEO Reviewer", role: "reviewer_publisher", passwordHash: "test" },
      { email: `seo-admin-${crypto.randomUUID()}@example.test`, displayName: "TEST SEO Admin", role: "admin", passwordHash: "test" },
    ]).returning({ id: users.id, role: users.role });
    const editor = { userId: userRows.find((row) => row.role === "content_editor")!.id, role: "content_editor" as const };
    const reviewer = { userId: userRows.find((row) => row.role === "reviewer_publisher")!.id, role: "reviewer_publisher" as const };
    const admin = { userId: userRows.find((row) => row.role === "admin")!.id, role: "admin" as const };
    const authorRows = await connection.db.insert(authors).values({ internalKey: `seo-author-${crypto.randomUUID()}`, displayName: "TEST SEO Author", isOrganization: true }).returning({ id: authors.id });
    const contentId = await createContentDraft(connection.db, editor, { channel: "fabric_knowledge", type: "guide", authorId: authorRows[0]!.id, title: "TEST Readable Projection SEO", body: "Readable approved paragraph." });
    await updateContent(connection.db, editor, contentId, {
      title: "TEST Readable Projection SEO", body: "Readable approved paragraph.", authorId: authorRows[0]!.id, type: "guide", expectedEditorDocumentVersion: 1,
      seoTitle: "TEST Readable Projection SEO", metaDescription: "Synthetic metadata for readable projection verification.",
    });
    await submitContentForReview(connection.db, editor, contentId);
    await publishContent(connection.db, reviewer, contentId);
    const routeRows = await connection.db.select({ id: routes.id, path: routes.path }).from(routes).where(and(
      eq(routes.entityType, "content"), eq(routes.entityId, contentId), eq(routes.isCurrent, true),
    ));
    const routeId = routeRows[0]!.id;
    const destinationRows = await connection.db.insert(routes).values({ entityType: "static_page", entityId: crypto.randomUUID(), locale: "en", path: `/test-seo-destination-${crypto.randomUUID()}/` }).returning({ id: routes.id });
    const topicRows = await connection.db.insert(seoTopics).values({ name: "TEST Readability Topic", primaryKeyword: `test-readability-${crypto.randomUUID()}`, intent: "informational" }).returning({ id: seoTopics.id });
    await connection.db.insert(keywordPageMappings).values({ normalizedKeyword: `test-readable-${crypto.randomUUID()}`, intent: "informational", primaryRouteId: routeId });
    await connection.db.insert(seoTopicMembers).values({ topicId: topicRows[0]!.id, routeId, role: "supporting" });
    await connection.db.insert(internalLinkRelations).values({ sourceRouteId: routeId, destinationRouteId: destinationRows[0]!.id, anchorText: "TEST destination", status: "published" });
    await setContentIndexStatus(connection.db, admin, contentId, "index");
    expect((await queryIndexableRoutes(connection.db)).map((row) => row.path)).toContain(routeRows[0]!.path);

    const dividerRevision = await updateContent(connection.db, editor, contentId, {
      title: "TEST Readable Projection SEO", body: "", authorId: authorRows[0]!.id, type: "guide", expectedEditorDocumentVersion: 2,
      structuredDocument: { version: 1, blocks: [{ id: "divider-only", type: "divider" }] },
      seoTitle: "TEST Readable Projection SEO", metaDescription: "Synthetic metadata for readable projection verification.",
    });
    await submitContentBlockDraftForReview(connection.db, editor, contentId, dividerRevision!);
    await expect(applyContentRevision(connection.db, reviewer, dividerRevision!)).rejects.toThrow(/retain readable/);
    expect((await queryIndexableRoutes(connection.db)).map((row) => row.path)).toContain(routeRows[0]!.path);
    expect((await connection.db.select({ status: editorialRevisions.status }).from(editorialRevisions).where(eq(editorialRevisions.id, dividerRevision!)))[0]?.status).toBe("in_review");
    await connection.db.update(seoMetadata).set({ indexStatus: "noindex" }).where(eq(seoMetadata.routeId, routeId));
    await applyContentRevision(connection.db, reviewer, dividerRevision!);
    expect((await queryIndexableRoutes(connection.db)).map((row) => row.path)).not.toContain(routeRows[0]!.path);
    await connection.close();
  });

  it("requires registered Route IDs for governed fixed CTA paths", async () => {
    const connection = await createTestDatabase();
    const fixed = parseBlockDocument({
      version: 1,
      blocks: [{ id: "fixed-cta", type: "cta", label: "Get a Quote", href: "/get-quote/" }],
    }, "content");
    await expect(resolveBlockPublicProjection(
      connection.db,
      { type: "content", id: crypto.randomUUID() },
      fixed,
    )).rejects.toThrow(/current public records and eligible routes/);
    const routeIds = await registerSystemPublicRoutes(connection.db);
    const fixedProjection = await resolveBlockPublicProjection(
      connection.db,
      { type: "content", id: crypto.randomUUID() },
      fixed,
    );
    expect(fixedProjection).toMatchObject({ referencesValid: true, hasRenderableContent: true });
    expect(fixedProjection.internalLinks).toEqual([{
      destinationRouteId: routeIds.get("/get-quote/"),
      anchorText: "Get a Quote",
    }]);
    const missing = parseBlockDocument({
      version: 1,
      blocks: [{ id: "missing-cta", type: "cta", label: "Missing", href: "/missing-stage2-route/" }],
    }, "content");
    await expect(resolveBlockPublicProjection(
      connection.db,
      { type: "content", id: crypto.randomUUID() },
      missing,
    )).rejects.toThrow(/current public records and eligible routes/);
    const filtered = await resolveBlockPublicProjection(
      connection.db,
      { type: "content", id: crypto.randomUUID() },
      missing,
      { invalidReferences: "filter" },
    );
    expect(filtered.renderableDocument.blocks).toEqual([]);
    expect(filtered.hasRenderableContent).toBe(false);
    await connection.close();
  });

  it("synchronizes fixed CTA Route IDs, removes stale relations, deduplicates, and rolls back with Required Audit", async () => {
    const connection = await createTestDatabase();
    const systemRoutes = await registerSystemPublicRoutes(connection.db);
    const ownerId = crypto.randomUUID();
    const sourceRows = await connection.db.insert(routes).values({
      path: `/test-fixed-link-source-${crypto.randomUUID()}/`,
      entityType: "content",
      entityId: ownerId,
    }).returning({ id: routes.id });
    const quoteDocument = parseBlockDocument({
      version: 1,
      blocks: [
        { id: "quote-one", type: "cta", label: "Quote one", href: "/get-quote/" },
        { id: "quote-two", type: "cta", label: "Quote two", href: "/get-quote/" },
      ],
    }, "content");
    const quoteProjection = await resolveBlockPublicProjection(
      connection.db,
      { type: "content", id: ownerId },
      quoteDocument,
    );
    await synchronizeBlockInternalLinks(connection.db, { type: "content", id: ownerId }, quoteProjection);
    expect(await connection.db.select().from(internalLinkRelations)).toMatchObject([{
      sourceRouteId: sourceRows[0]!.id,
      destinationRouteId: systemRoutes.get("/get-quote/"),
      anchorText: "Quote one",
      status: "published",
    }]);

    const aboutDocument = parseBlockDocument({
      version: 1,
      blocks: [{ id: "about", type: "cta", label: "About", href: "/about/" }],
    }, "content");
    const aboutProjection = await resolveBlockPublicProjection(
      connection.db,
      { type: "content", id: ownerId },
      aboutDocument,
    );
    await synchronizeBlockInternalLinks(connection.db, { type: "content", id: ownerId }, aboutProjection);
    expect(await connection.db.select().from(internalLinkRelations)).toMatchObject([{
      destinationRouteId: systemRoutes.get("/about/"),
      anchorText: "About",
    }]);

    await expect(runGovernedMutation(connection.db, async ({ transaction, audit }) => {
      await synchronizeBlockInternalLinks(transaction, { type: "content", id: ownerId }, quoteProjection);
      await audit({ action: "test.fixed_link.rollback", entityType: "content", entityId: ownerId });
    }, {
      auditWriter: async () => { throw new Error("TEST fixed link required Audit failure"); },
    })).rejects.toThrow(/required Audit failure/);
    expect(await connection.db.select().from(internalLinkRelations)).toMatchObject([{
      destinationRouteId: systemRoutes.get("/about/"),
    }]);

    const emptyProjection = await resolveBlockPublicProjection(
      connection.db,
      { type: "content", id: ownerId },
      { version: 1, blocks: [] },
    );
    await synchronizeBlockInternalLinks(connection.db, { type: "content", id: ownerId }, emptyProjection);
    expect(await connection.db.select().from(internalLinkRelations)).toEqual([]);
    await connection.close();
  });
});
