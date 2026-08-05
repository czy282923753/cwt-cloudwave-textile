import { drizzle } from "drizzle-orm/postgres-js";
import { and, eq } from "drizzle-orm";
import postgres from "postgres";

import {
  applyProductRevision,
  confirmRealProductBasis,
  createProductDraft,
  publishReviewedProduct,
  submitProductForReview,
  updateProductBlocks,
  updateProductStructure,
} from "../src/catalog/product-service";
import {
  applyContentRevision,
  createContentDraft,
  publishContent,
  setContentIndexStatus,
  submitContentForReview,
  updateContent,
} from "../src/content/content-service";
import {
  applyStaticPageConfigRevision,
  DEFAULT_STATIC_PAGE_CONFIGS,
  proposeStaticPageConfigRevision,
} from "../src/content/static-page-settings";
import { migratePostgresWithEnumCompatibility } from "../src/db/postgres-enum-migration-compatibility";
import * as schema from "../src/db/schema";
import {
  assets,
  auditLogs,
  authors,
  contentAssets,
  contentLocalizations,
  editorialRevisions,
  internalLinkRelations,
  keywordPageMappings,
  productAssets,
  productLocalizations,
  routes,
  seoMetadata,
  seoTopicMembers,
  seoTopics,
  sitePageAssets,
  taxonomyTerms,
  users,
} from "../src/db/schema";
import { findPublicAssetForDelivery } from "../src/public-site/public-asset-access";
import { queryProductByPath } from "../src/public-site/data";
import { queryIndexableRoutes } from "../src/seo/public-index";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function safeAdminUrl(): URL {
  if (
    process.env.APP_ENV === "production" ||
    process.env.CWT_STAGE1_REMEDIATION_VALIDATION !== "isolated-test-database"
  ) {
    throw new Error("Stage 1 remediation validation requires an isolated non-production database.");
  }
  const url = new URL(process.env.DATABASE_URL ?? "");
  if (!["localhost", "127.0.0.1"].includes(url.hostname)) {
    throw new Error("Stage 1 remediation validation is restricted to localhost PostgreSQL.");
  }
  return url;
}

async function main() {
  const adminUrl = safeAdminUrl();
  const databaseName = `cwt_stage1_remediation_${process.pid}`;
  const admin = postgres(adminUrl.toString(), { max: 1, prepare: false });
  await admin.unsafe(`create database "${databaseName}"`);
  const testUrl = new URL(adminUrl);
  testUrl.pathname = `/${databaseName}`;
  const migrationClient = postgres(testUrl.toString(), { max: 1, prepare: false });
  const firstClient = postgres(testUrl.toString(), { max: 6, prepare: false });
  const secondClient = postgres(testUrl.toString(), { max: 2, prepare: false });
  const db = drizzle(firstClient, { schema });
  const secondDb = drizzle(secondClient, { schema });
  const scenarios: string[] = [];

  try {
    await migratePostgresWithEnumCompatibility(migrationClient, "drizzle");
    await migratePostgresWithEnumCompatibility(migrationClient, "drizzle");
    await migrationClient.end();

    const actorRows = await db.insert(users).values([
      { email: "stage1-remediation-editor@example.test", displayName: "TEST Content Editor", role: "content_editor", passwordHash: "test" },
      { email: "stage1-remediation-product@example.test", displayName: "TEST Product Editor", role: "product_editor", passwordHash: "test" },
      { email: "stage1-remediation-reviewer@example.test", displayName: "TEST Reviewer", role: "reviewer_publisher", passwordHash: "test" },
      { email: "stage1-remediation-admin@example.test", displayName: "TEST Admin", role: "admin", passwordHash: "test" },
    ]).returning({ id: users.id, role: users.role });
    const contentEditor = { userId: actorRows.find((row) => row.role === "content_editor")!.id, role: "content_editor" as const };
    const productEditor = { userId: actorRows.find((row) => row.role === "product_editor")!.id, role: "product_editor" as const };
    const reviewer = { userId: actorRows.find((row) => row.role === "reviewer_publisher")!.id, role: "reviewer_publisher" as const };
    const adminActor = { userId: actorRows.find((row) => row.role === "admin")!.id, role: "admin" as const };
    const assetRows = await db.insert(assets).values(["hero", "detail", "content"].map((label) => ({
      originalFileName: `TEST-${label}.jpg`, storageProvider: "test", storagePartition: "public" as const,
      objectKey: `test/stage1-remediation-${label}.jpg`, access: "public" as const,
      category: label === "content" ? "content" as const : "product" as const,
      status: "ready" as const, scanStatus: "passed" as const,
      declaredMimeType: "image/jpeg", detectedMimeType: "image/jpeg", byteSize: 100,
      sha256: `stage1-remediation-${label}`,
    }))).returning({ id: assets.id });
    const [heroAssetId, detailAssetId, contentAssetId] = assetRows.map((row) => row.id);
    assert(heroAssetId && detailAssetId && contentAssetId, "Asset fixtures were not created.");

    const staticConfig = {
      ...DEFAULT_STATIC_PAGE_CONFIGS.home,
      placements: [{
        assetId: heroAssetId, placementKey: "hero" as const, viewport: "desktop" as const,
        role: "hero" as const, sortOrder: 0, altText: "TEST Home hero", caption: null,
        focalX: 50, focalY: 50, overlayOpacity: 0.35, isVisible: true,
      }],
    };
    const staticRevisionId = await proposeStaticPageConfigRevision(db, contentEditor, staticConfig, "TEST static idempotency");
    const concurrentStaticResults = await Promise.all([
      applyStaticPageConfigRevision(db, reviewer, staticRevisionId),
      applyStaticPageConfigRevision(secondDb, reviewer, staticRevisionId),
    ]);
    assert(concurrentStaticResults.every((result) => result === "home"), "Concurrent Static Apply did not converge.");
    assert((await db.select().from(sitePageAssets)).length === 1, "Static Apply duplicated live relations.");
    assert((await db.select().from(auditLogs).where(and(eq(auditLogs.entityId, staticRevisionId), eq(auditLogs.action, "static_page.revision.applied")))).length === 1, "Static Apply duplicated required Audit.");
    scenarios.push("Static concurrent first Apply and response-loss idempotent retry");

    const disabledRevisionId = await proposeStaticPageConfigRevision(db, contentEditor, {
      ...staticConfig,
      modules: { ...staticConfig.modules, hero: false },
    }, "TEST static revocation");
    await applyStaticPageConfigRevision(db, reviewer, disabledRevisionId);
    assert((await findPublicAssetForDelivery(db, heroAssetId)) === null, "Disabled Static module retained public delivery.");
    scenarios.push("Static module revocation immediately removes public delivery");

    const retryRevisionId = await proposeStaticPageConfigRevision(db, contentEditor, staticConfig, "TEST static Audit rollback");
    let staticAuditFailed = false;
    try {
      await applyStaticPageConfigRevision(db, reviewer, retryRevisionId, {
        auditWriter: async () => { throw new Error("TEST Static Audit failure"); },
      });
    } catch {
      staticAuditFailed = true;
    }
    assert(staticAuditFailed, "Static required Audit failure was not surfaced.");
    assert((await db.select({ status: editorialRevisions.status }).from(editorialRevisions).where(eq(editorialRevisions.id, retryRevisionId)))[0]?.status === "in_review", "Static Audit failure did not roll back Revision.");
    await applyStaticPageConfigRevision(db, reviewer, retryRevisionId);
    scenarios.push("Static required Audit rollback and retry");

    const categoryRows = await db.insert(taxonomyTerms).values({ internalKey: "stage1-remediation-category", dimension: "material_fiber" }).returning({ id: taxonomyTerms.id });
    const productId = await createProductDraft(db, productEditor, {
      name: "TEST PostgreSQL Block Product", primaryTaxonomyTermId: categoryRows[0]!.id,
      assetIds: [heroAssetId, detailAssetId],
    });
    await updateProductStructure(db, productEditor, productId, {
      primaryTaxonomyTermId: categoryRows[0]!.id, additionalTaxonomyTermIds: [], applicationIds: [], tagNames: [],
      assetIds: [heroAssetId, detailAssetId], heroAssetId,
      media: [
        { assetId: heroAssetId, role: "hero", sortOrder: 0, altText: "TEST hero", caption: null, isVisible: true },
        { assetId: detailAssetId, role: "detail", sortOrder: 1, altText: "TEST detail", caption: null, isVisible: true },
      ],
      features: [], faqs: [], colorOptionsDisplay: "inherit", customAvailableDisplay: "inherit", sampleAvailableDisplay: "inherit", moqNoteDisplay: "inherit",
    });
    await updateProductBlocks(db, productEditor, productId, {
      name: "TEST PostgreSQL Block Product", shortDescription: null,
      document: { version: 1, blocks: [{ id: "approved", type: "paragraph", text: "Approved PostgreSQL Product narrative." }] },
      expectedEditorDocumentVersion: 1,
    });
    await confirmRealProductBasis(db, reviewer, productId, "physical_sample", "Synthetic PostgreSQL evidence");
    await submitProductForReview(db, productEditor, productId);
    await publishReviewedProduct(db, reviewer, productId);
    const productRouteRows = await db.select({ path: routes.path }).from(routes).where(and(
      eq(routes.entityType, "product"), eq(routes.entityId, productId), eq(routes.isCurrent, true),
    ));
    const productPath = productRouteRows[0]?.path;
    assert(productPath, "Product public route was not found.");
    const initialPublicProduct = await queryProductByPath(db, productPath);
    assert(initialPublicProduct?.narrativeProjection.hasRenderableContent, "Approved Product Paragraph was not renderable before Revision approval.");
    scenarios.push("Product approved Paragraph public projection before Revision approval");
    const productRevisionId = await updateProductBlocks(db, productEditor, productId, {
      name: "TEST PostgreSQL Block Product", shortDescription: null,
      document: { version: 1, blocks: [{ id: "pending", type: "image", mediaKey: detailAssetId }] },
      expectedEditorDocumentVersion: 2,
    });
    assert(productRevisionId, "Product revision was not created.");
    await db.update(productAssets).set({ isVisible: false }).where(and(eq(productAssets.productId, productId), eq(productAssets.assetId, detailAssetId)));
    let productApplyFailed = false;
    try { await applyProductRevision(db, reviewer, productRevisionId); } catch { productApplyFailed = true; }
    assert(productApplyFailed, "Product Apply accepted media invalidated after Save.");
    const productDocument = (await db.select({ document: productLocalizations.structuredBlocks }).from(productLocalizations).where(eq(productLocalizations.productId, productId)))[0]?.document as { blocks?: Array<{ type?: string }> };
    assert(productDocument.blocks?.[0]?.type === "paragraph", "Failed Product Apply changed approved content.");
    scenarios.push("Product Save valid then media invalid before Apply fails closed");

    await db.update(productAssets).set({ isVisible: true }).where(and(eq(productAssets.productId, productId), eq(productAssets.assetId, detailAssetId)));
    const concurrentProductRevisionId = await updateProductBlocks(db, productEditor, productId, {
      name: "TEST PostgreSQL Block Product", shortDescription: null,
      document: { version: 1, blocks: [{ id: "concurrent", type: "paragraph", text: "Concurrent approved Product narrative." }] },
      expectedEditorDocumentVersion: 2,
    });
    assert(concurrentProductRevisionId, "Concurrent Product revision was not created.");
    const concurrentProductResults = await Promise.all([
      applyProductRevision(db, reviewer, concurrentProductRevisionId),
      applyProductRevision(secondDb, reviewer, concurrentProductRevisionId),
    ]);
    assert(concurrentProductResults.every((result) => result === productId), "Concurrent Product Revision Apply did not converge.");
    assert((await db.select().from(auditLogs).where(and(eq(auditLogs.entityId, concurrentProductRevisionId), eq(auditLogs.action, "product.revision.applied")))).length === 1, "Concurrent Product Revision Apply duplicated Audit.");
    scenarios.push("Product Revision concurrent Apply converges with one Audit");

    const productAuditRevisionId = await updateProductBlocks(db, productEditor, productId, {
      name: "TEST PostgreSQL Block Product", shortDescription: null,
      document: { version: 1, blocks: [{ id: "audit-divider", type: "divider" }] },
      expectedEditorDocumentVersion: 3,
    });
    assert(productAuditRevisionId, "Product Audit revision was not created.");
    let productAuditFailed = false;
    try {
      await applyProductRevision(db, reviewer, productAuditRevisionId, {
        auditWriter: async () => { throw new Error("TEST Product Audit failure"); },
      });
    } catch { productAuditFailed = true; }
    assert(productAuditFailed, "Product required Audit failure was not surfaced.");
    assert((await db.select({ status: editorialRevisions.status }).from(editorialRevisions).where(eq(editorialRevisions.id, productAuditRevisionId)))[0]?.status === "in_review", "Product Audit failure did not roll back Revision.");
    assert((await queryProductByPath(db, productPath))?.narrativeProjection.hasRenderableContent, "Failed Audit changed the approved Product public projection.");
    scenarios.push("Product required Audit rollback");

    await applyProductRevision(db, reviewer, productAuditRevisionId);
    const dividerPublicProduct = await queryProductByPath(db, productPath);
    assert(dividerPublicProduct && !dividerPublicProduct.narrativeProjection.hasRenderableContent, "Divider-only Product remained a renderable narrative module after approval.");
    assert(!(await queryIndexableRoutes(db)).some((row) => row.path === productPath), "Noindex Divider-only Product entered sitemap eligibility.");
    scenarios.push("Product Divider-only approved Revision keeps page public without narrative projection");

    const validMediaRevisionId = await updateProductBlocks(db, productEditor, productId, {
      name: "TEST PostgreSQL Block Product", shortDescription: null,
      document: { version: 1, blocks: [{ id: "valid-detail", type: "image", mediaKey: detailAssetId }] },
      expectedEditorDocumentVersion: 4,
    });
    assert(validMediaRevisionId, "Valid Product media Revision was not created.");
    await applyProductRevision(db, reviewer, validMediaRevisionId);
    const mediaPublicProduct = await queryProductByPath(db, productPath);
    assert(mediaPublicProduct?.narrativeProjection.hasRenderableContent, "Valid Product media did not restore the narrative projection.");
    assert(mediaPublicProduct.narrativeProjection.document.blocks[0]?.type === "image", "Valid Product media projection did not retain the approved Image Block.");
    assert(!(await queryIndexableRoutes(db)).some((row) => row.path === productPath), "Noindex media Product entered sitemap eligibility.");
    scenarios.push("Product valid media approved Revision restores public renderable projection");

    const authorRows = await db.insert(authors).values({ internalKey: "stage1-remediation-author", displayName: "TEST PostgreSQL Author", isOrganization: true }).returning({ id: authors.id });
    const contentId = await createContentDraft(db, contentEditor, { channel: "fabric_knowledge", type: "guide", authorId: authorRows[0]!.id, title: "TEST PostgreSQL Block Content", body: "Approved PostgreSQL Content narrative." });
    await submitContentForReview(db, contentEditor, contentId);
    await publishContent(db, reviewer, contentId);
    const mediaRevisionId = await updateContent(db, contentEditor, contentId, {
      title: "TEST PostgreSQL Block Content", body: "", authorId: authorRows[0]!.id, type: "guide", expectedEditorDocumentVersion: 1,
      structuredDocument: { version: 1, blocks: [{ id: "image", type: "image", mediaKey: "inline" }, { id: "text", type: "paragraph", text: "Approved media narrative." }] },
      media: [{ assetId: contentAssetId, role: "inline", sortOrder: 0, altText: "TEST inline", caption: null, isVisible: true, blockKey: "inline" }],
    });
    assert(mediaRevisionId, "Content media revision was not created.");
    await applyContentRevision(db, reviewer, mediaRevisionId);
    const contentRevisionId = await updateContent(db, contentEditor, contentId, {
      title: "TEST PostgreSQL Block Content", body: "", authorId: authorRows[0]!.id, type: "guide", expectedEditorDocumentVersion: 2,
      structuredDocument: { version: 1, blocks: [{ id: "image", type: "image", mediaKey: "inline" }, { id: "text", type: "paragraph", text: "Pending media narrative." }] },
    });
    assert(contentRevisionId, "Content revision was not created.");
    await db.update(contentAssets).set({ isVisible: false }).where(eq(contentAssets.contentId, contentId));
    let contentApplyFailed = false;
    try { await applyContentRevision(db, reviewer, contentRevisionId); } catch { contentApplyFailed = true; }
    assert(contentApplyFailed, "Content Apply accepted media invalidated after Save.");
    assert((await db.select({ version: contentLocalizations.editorDocumentVersion }).from(contentLocalizations).where(eq(contentLocalizations.contentId, contentId)))[0]?.version === 2, "Failed Content Apply changed approved content.");
    scenarios.push("Content Save valid then media invalid before Apply fails closed");

    await db.update(contentAssets).set({ isVisible: true }).where(eq(contentAssets.contentId, contentId));
    let contentAuditFailed = false;
    try {
      await applyContentRevision(db, reviewer, contentRevisionId, {
        auditWriter: async () => { throw new Error("TEST Content Audit failure"); },
      });
    } catch { contentAuditFailed = true; }
    assert(contentAuditFailed, "Content required Audit failure was not surfaced.");
    assert((await db.select({ status: editorialRevisions.status }).from(editorialRevisions).where(eq(editorialRevisions.id, contentRevisionId)))[0]?.status === "in_review", "Content Audit failure did not roll back Revision.");
    scenarios.push("Content required Audit rollback");

    const contentRouteRows = await db.select({ id: routes.id, path: routes.path }).from(routes).where(and(
      eq(routes.entityType, "content"), eq(routes.entityId, contentId), eq(routes.isCurrent, true),
    ));
    const contentRoute = contentRouteRows[0];
    assert(contentRoute, "Content route was not found.");
    await db.update(seoMetadata).set({ title: "TEST PostgreSQL Content SEO", metaDescription: "Synthetic PostgreSQL readable projection metadata." }).where(eq(seoMetadata.routeId, contentRoute.id));
    const destinationRows = await db.insert(routes).values({ entityType: "static_page", entityId: crypto.randomUUID(), locale: "en", path: `/test-postgres-destination-${crypto.randomUUID()}/` }).returning({ id: routes.id });
    const topicRows = await db.insert(seoTopics).values({ name: "TEST PostgreSQL Readability", primaryKeyword: `test-postgres-readability-${crypto.randomUUID()}`, intent: "informational" }).returning({ id: seoTopics.id });
    await db.insert(keywordPageMappings).values({ normalizedKeyword: `test-postgres-content-${crypto.randomUUID()}`, intent: "informational", primaryRouteId: contentRoute.id });
    await db.insert(seoTopicMembers).values({ topicId: topicRows[0]!.id, routeId: contentRoute.id, role: "supporting" });
    await db.insert(internalLinkRelations).values({ sourceRouteId: contentRoute.id, destinationRouteId: destinationRows[0]!.id, anchorText: "TEST PostgreSQL destination", status: "published" });
    await setContentIndexStatus(db, adminActor, contentId, "index");
    assert((await queryIndexableRoutes(db)).some((row) => row.path === contentRoute.path), "Readable Content was missing from sitemap eligibility.");
    const dividerRevisionId = await updateContent(db, contentEditor, contentId, {
      title: "TEST PostgreSQL Block Content", body: "", authorId: authorRows[0]!.id, type: "guide", expectedEditorDocumentVersion: 2,
      structuredDocument: { version: 1, blocks: [{ id: "divider-only", type: "divider" }] },
      seoTitle: "TEST PostgreSQL Content SEO", metaDescription: "Synthetic PostgreSQL readable projection metadata.",
    });
    assert(dividerRevisionId, "Divider-only Content revision was not created.");
    let indexedApplyFailed = false;
    try { await applyContentRevision(db, reviewer, dividerRevisionId); } catch { indexedApplyFailed = true; }
    assert(indexedApplyFailed, "Indexed Content accepted a non-readable Revision.");
    assert((await queryIndexableRoutes(db)).some((row) => row.path === contentRoute.path), "Failed Revision Apply changed sitemap eligibility.");
    scenarios.push("Content readable Index/Sitemap gate re-evaluated at Revision Apply");

    const journalRows = await firstClient<{ count: string }[]>`select count(*)::text as count from drizzle.__drizzle_migrations`;
    assert(Number(journalRows[0]?.count) === 19, "Migration Journal is not at 0000→0018.");
    scenarios.push("Fresh 0000→0018 and repeat Journal no-op");

    process.stdout.write(`${JSON.stringify({ postgres: (await firstClient<{ version: string }[]>`select version()`).at(0)?.version, scenarios: scenarios.map((scenario) => ({ scenario, result: "passed" })) }, null, 2)}\n`);
  } finally {
    await migrationClient.end().catch(() => undefined);
    await firstClient.end();
    await secondClient.end();
    await admin.unsafe(`select pg_terminate_backend(pid) from pg_stat_activity where datname = $1 and pid <> pg_backend_pid()`, [databaseName]);
    await admin.unsafe(`drop database if exists "${databaseName}" with (force)`);
    await admin.end();
  }
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack : String(error)}\n`);
  process.exitCode = 1;
});
