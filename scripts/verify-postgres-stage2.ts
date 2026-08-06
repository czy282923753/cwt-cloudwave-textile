import { and, count, eq, inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import {
  confirmRealProductBasis,
  createProductDraft,
  publishReviewedProduct,
  saveProductBlockDraft,
  submitProductForReview,
  updateProductBlocks,
} from "../src/catalog/product-service";
import {
  quickCreateApplicationDraft,
  quickCreateTaxonomyTerm,
} from "../src/catalog/taxonomy-service";
import {
  applyContentRevision,
  saveContentBlockDraft,
  submitContentBlockDraftForReview,
} from "../src/content/content-service";
import {
  applyStaticPageConfigRevision,
  DEFAULT_STATIC_PAGE_CONFIGS,
  saveStaticPageConfigDraft,
  submitStaticPageConfigDraftForReview,
} from "../src/content/static-page-settings";
import { staticPageConfigSchema } from "../src/content/static-page-projection";
import { migratePostgresWithEnumCompatibility } from "../src/db/postgres-enum-migration-compatibility";
import * as schema from "../src/db/schema";
import {
  applications,
  assets,
  auditLogs,
  authors,
  contentLocalizations,
  contents,
  editorialRevisions,
  productLocalizations,
  routes,
  seoMetadata,
  sitePageAssets,
  systemSettings,
  taxonomyTermLocalizations,
  taxonomyTerms,
  users,
} from "../src/db/schema";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function safeAdminUrl(): URL {
  if (
    process.env.APP_ENV !== "test" ||
    process.env.DATABASE_DRIVER !== "postgres" ||
    process.env.CWT_STAGE2_VALIDATION !== "isolated-test-database"
  ) {
    throw new Error(
      "Stage 2 PostgreSQL validation requires APP_ENV=test, DATABASE_DRIVER=postgres, and CWT_STAGE2_VALIDATION=isolated-test-database.",
    );
  }
  const url = new URL(process.env.DATABASE_URL ?? "");
  if (!["localhost", "127.0.0.1"].includes(url.hostname)) {
    throw new Error("Stage 2 PostgreSQL validation is restricted to localhost.");
  }
  if (!url.pathname || url.pathname === "/") {
    throw new Error("Stage 2 PostgreSQL validation requires an administrative database name.");
  }
  return url;
}

function paragraph(text: string) {
  return {
    version: 1 as const,
    blocks: [{ id: "paragraph", type: "paragraph" as const, text }],
  };
}

function firstParagraphText(document: unknown): string | null {
  if (typeof document !== "object" || document === null || !("blocks" in document)) return null;
  const blocks = document.blocks;
  if (!Array.isArray(blocks)) return null;
  const first = blocks[0];
  if (typeof first !== "object" || first === null || !("type" in first) || !("text" in first)) return null;
  return first.type === "paragraph" && typeof first.text === "string" ? first.text : null;
}

function testDatabaseName(): string {
  return `cwt_stage2_${process.pid}_${crypto.randomUUID().replaceAll("-", "")}`;
}

async function main(): Promise<void> {
  const adminUrl = safeAdminUrl();
  const databaseName = testDatabaseName();
  const admin = postgres(adminUrl.toString(), { max: 1, prepare: false });
  await admin.unsafe(`create database "${databaseName}"`);
  const testUrl = new URL(adminUrl);
  testUrl.pathname = `/${databaseName}`;
  const migrationClient = postgres(testUrl.toString(), { max: 1, prepare: false });
  const firstClient = postgres(testUrl.toString(), { max: 8, prepare: false });
  const secondClient = postgres(testUrl.toString(), { max: 4, prepare: false });
  const db = drizzle(firstClient, { schema });
  const secondDb = drizzle(secondClient, { schema });
  const scenarios: string[] = [];

  try {
    await migratePostgresWithEnumCompatibility(migrationClient, "drizzle");
    await migratePostgresWithEnumCompatibility(migrationClient, "drizzle");
    await migrationClient.end();

    const journalRows = await firstClient<{ count: string }[]>`
      select count(*)::text as count from drizzle.__drizzle_migrations
    `;
    assert(Number(journalRows[0]?.count) === 19, "Migration Journal is not Fresh 0000→0018.");
    scenarios.push("Fresh 0000→0018 and repeat/no-op");

    const actorRows = await db.insert(users).values([
      { email: "stage2-product@example.test", displayName: "TEST Stage 2 Product Editor", role: "product_editor", passwordHash: "test" },
      { email: "stage2-content@example.test", displayName: "TEST Stage 2 Content Editor", role: "content_editor", passwordHash: "test" },
      { email: "stage2-reviewer@example.test", displayName: "TEST Stage 2 Reviewer", role: "reviewer_publisher", passwordHash: "test" },
    ]).returning({ id: users.id, role: users.role });
    const productEditor = { userId: actorRows.find((row) => row.role === "product_editor")!.id, role: "product_editor" as const };
    const contentEditor = { userId: actorRows.find((row) => row.role === "content_editor")!.id, role: "content_editor" as const };
    const reviewer = { userId: actorRows.find((row) => row.role === "reviewer_publisher")!.id, role: "reviewer_publisher" as const };
    const authorRows = await db.insert(authors).values({
      internalKey: "stage2-postgres-author",
      displayName: "TEST Stage 2 Author",
      isOrganization: true,
    }).returning({ id: authors.id });
    const authorId = authorRows[0]!.id;

    const categoryRows = await db.insert(taxonomyTerms).values({
      internalKey: "stage2-postgres-product-category",
      dimension: "material_fiber",
      productCodePrefix: "SPG",
    }).returning({ id: taxonomyTerms.id });
    const categoryId = categoryRows[0]!.id;
    await db.insert(taxonomyTermLocalizations).values({
      taxonomyTermId: categoryId,
      locale: "en",
      name: "TEST Stage 2 PostgreSQL Category",
    });

    const productAssetRows = await db.insert(assets).values({
      originalFileName: "TEST-stage2-product.jpg",
      storageProvider: "test",
      storagePartition: "public",
      objectKey: "test/stage2-product.jpg",
      access: "public",
      category: "product",
      status: "ready",
      scanStatus: "passed",
      declaredMimeType: "image/jpeg",
      detectedMimeType: "image/jpeg",
      byteSize: 100,
      sha256: "stage2-postgres-product",
    }).returning({ id: assets.id });
    const productId = await createProductDraft(db, productEditor, {
      name: "TEST Stage 2 Published Product",
      primaryTaxonomyTermId: categoryId,
      assetIds: [productAssetRows[0]!.id],
    });
    await updateProductBlocks(db, productEditor, productId, {
      name: "TEST Stage 2 Published Product",
      shortDescription: null,
      document: paragraph("Approved Product copy."),
      expectedEditorDocumentVersion: 1,
    });
    await confirmRealProductBasis(
      db,
      reviewer,
      productId,
      "physical_sample",
      "Synthetic Stage 2 PostgreSQL evidence",
    );
    await submitProductForReview(db, productEditor, productId);
    await publishReviewedProduct(db, reviewer, productId);
    const productRequest = {
      name: "TEST Stage 2 Published Product",
      shortDescription: null,
      document: paragraph("Product Draft copy."),
      expectedEditorDocumentVersion: 2,
      revisionId: null,
      expectedRevisionVersion: 0,
    };
    const firstProductSave = await saveProductBlockDraft(db, productEditor, productId, productRequest);
    assert(firstProductSave.revisionId && firstProductSave.revisionVersion === 1, "Published Product Draft Revision was not created.");
    const productRetry = await saveProductBlockDraft(secondDb, productEditor, productId, productRequest);
    assert(JSON.stringify(productRetry) === JSON.stringify(firstProductSave), "Product response-loss retry was not idempotent.");
    const concurrentProduct = await Promise.allSettled([
      saveProductBlockDraft(db, productEditor, productId, {
        ...productRequest,
        document: paragraph("Product editor A."),
        revisionId: firstProductSave.revisionId,
        expectedRevisionVersion: 1,
      }),
      saveProductBlockDraft(secondDb, productEditor, productId, {
        ...productRequest,
        document: paragraph("Product editor B."),
        revisionId: firstProductSave.revisionId,
        expectedRevisionVersion: 1,
      }),
    ]);
    assert(concurrentProduct.filter((result) => result.status === "fulfilled").length === 1, "Concurrent Product autosave did not select one winner.");
    assert(concurrentProduct.filter((result) => result.status === "rejected").length === 1, "Concurrent Product autosave did not reject the stale writer.");
    const liveProduct = await db.select({ document: productLocalizations.structuredBlocks }).from(productLocalizations).where(eq(productLocalizations.productId, productId));
    assert(firstParagraphText(liveProduct[0]?.document) === "Approved Product copy.", "Product Draft Preview state changed live approved content.");
    scenarios.push("Product autosave response-loss retry, multi-tab conflict, and live isolation");

    const contentRows = await db.insert(contents).values({
      channel: "fabric_knowledge",
      type: "guide",
      status: "published",
      authorId,
      createdByUserId: contentEditor.userId,
    }).returning({ id: contents.id });
    const contentId = contentRows[0]!.id;
    await db.insert(contentLocalizations).values({
      contentId,
      locale: "en",
      title: "TEST Stage 2 Published Content",
      body: "",
      structuredBlocks: paragraph("Approved Content copy."),
      blocksVersion: 1,
      editorDocumentVersion: 1,
    });
    const contentRequest = {
      title: "TEST Stage 2 Published Content",
      excerpt: null,
      document: paragraph("Content Draft copy."),
      expectedEditorDocumentVersion: 1,
      revisionId: null,
      expectedRevisionVersion: 0,
    };
    let contentAuditFailed = false;
    try {
      await saveContentBlockDraft(db, contentEditor, contentId, contentRequest, {
        auditWriter: async () => { throw new Error("TEST Stage 2 required Audit failure"); },
      });
    } catch {
      contentAuditFailed = true;
    }
    assert(contentAuditFailed, "Content required Audit failure was not surfaced.");
    const rolledBackDrafts = await db.select({ count: count() }).from(editorialRevisions).where(and(
      eq(editorialRevisions.entityType, "content"),
      eq(editorialRevisions.entityId, contentId),
      eq(editorialRevisions.status, "draft"),
    ));
    assert(Number(rolledBackDrafts[0]?.count) === 0, "Content required Audit failure left a Draft Revision.");
    const firstContentSave = await saveContentBlockDraft(db, contentEditor, contentId, contentRequest);
    const contentRetry = await saveContentBlockDraft(secondDb, contentEditor, contentId, contentRequest);
    assert(JSON.stringify(contentRetry) === JSON.stringify(firstContentSave), "Content response-loss retry was not idempotent.");
    assert(firstParagraphText((await db.select({ document: contentLocalizations.structuredBlocks }).from(contentLocalizations).where(eq(contentLocalizations.contentId, contentId)))[0]?.document) === "Approved Content copy.", "Content Draft Preview state changed live approved content.");
    scenarios.push("Content required Audit rollback, response-loss retry, and live isolation");

    const assetRows = await db.insert(assets).values({
      originalFileName: "TEST-stage2-home.jpg",
      storageProvider: "test",
      storagePartition: "public",
      objectKey: "test/stage2-home.jpg",
      access: "public",
      category: "company",
      status: "ready",
      scanStatus: "passed",
      declaredMimeType: "image/jpeg",
      detectedMimeType: "image/jpeg",
      byteSize: 100,
      sha256: "stage2-postgres-home",
    }).returning({ id: assets.id });
    const homeAssetId = assetRows[0]!.id;
    const homeConfig = {
      ...DEFAULT_STATIC_PAGE_CONFIGS.home,
      placements: [{
        assetId: homeAssetId,
        placementKey: "hero" as const,
        viewport: "desktop" as const,
        role: "hero" as const,
        sortOrder: 0,
        altText: "TEST Stage 2 Home hero",
        caption: null,
        focalX: 50,
        focalY: 50,
        overlayOpacity: 0.35,
        isVisible: true,
      }],
    };
    const firstPageSave = await saveStaticPageConfigDraft(db, contentEditor, homeConfig);
    assert(JSON.stringify(await saveStaticPageConfigDraft(secondDb, contentEditor, homeConfig)) === JSON.stringify(firstPageSave), "Static-page response-loss retry was not idempotent.");
    const changedHomeConfig = {
      ...homeConfig,
      modules: { ...homeConfig.modules, fabric_library: false },
    };
    const secondPageSave = await saveStaticPageConfigDraft(db, contentEditor, changedHomeConfig, firstPageSave.revisionId, firstPageSave.revisionVersion);
    let stalePageRejected = false;
    try {
      await saveStaticPageConfigDraft(secondDb, contentEditor, {
        ...homeConfig,
        modules: { ...homeConfig.modules, applications: false },
      }, firstPageSave.revisionId, firstPageSave.revisionVersion);
    } catch {
      stalePageRejected = true;
    }
    assert(stalePageRejected, "Static-page stale editor was not rejected.");
    const liveBeforeReview = await db.select({ value: systemSettings.value }).from(systemSettings).where(eq(systemSettings.key, "site_page.home"));
    const liveBeforeReviewConfig = staticPageConfigSchema.parse(liveBeforeReview[0]?.value);
    assert(
      liveBeforeReviewConfig.pageKey === "home" &&
        "fabric_library" in liveBeforeReviewConfig.modules &&
        liveBeforeReviewConfig.modules.fabric_library &&
        liveBeforeReviewConfig.placements.length === 0,
      "Static-page Draft changed live config before approval.",
    );
    await submitStaticPageConfigDraftForReview(db, contentEditor, secondPageSave.revisionId);
    let pageAuditFailed = false;
    try {
      await applyStaticPageConfigRevision(db, reviewer, secondPageSave.revisionId, {
        auditWriter: async () => { throw new Error("TEST Stage 2 static required Audit failure"); },
      });
    } catch {
      pageAuditFailed = true;
    }
    assert(pageAuditFailed, "Static-page required Audit failure was not surfaced.");
    assert((await db.select({ status: editorialRevisions.status }).from(editorialRevisions).where(eq(editorialRevisions.id, secondPageSave.revisionId)))[0]?.status === "in_review", "Static-page required Audit failure did not roll back Revision.");
    assert((await db.select().from(sitePageAssets)).length === 0, "Static-page required Audit failure left live media relations.");
    await applyStaticPageConfigRevision(db, reviewer, secondPageSave.revisionId);
    assert((await db.select().from(sitePageAssets)).length === 1, "Static-page approved media relation was not projected exactly once.");
    await applyStaticPageConfigRevision(secondDb, reviewer, secondPageSave.revisionId);
    assert((await db.select().from(sitePageAssets)).length === 1, "Static-page repeat Apply duplicated media relations.");
    scenarios.push("Home Draft conflict, Preview/live isolation, Required Audit rollback, and idempotent Apply");

    const quickName = "TEST Stage 2 Concurrent Category";
    const concurrentCategory = await Promise.allSettled([
      quickCreateTaxonomyTerm(db, productEditor, {
        internalKey: `stage2-concurrent-a-${crypto.randomUUID()}`,
        name: quickName,
        dimension: "structure_construction",
        productCodePrefix: "SQA",
      }),
      quickCreateTaxonomyTerm(secondDb, productEditor, {
        internalKey: `stage2-concurrent-b-${crypto.randomUUID()}`,
        name: quickName,
        dimension: "structure_construction",
        productCodePrefix: "SQB",
      }),
    ]);
    assert(concurrentCategory.every((result) => result.status === "fulfilled"), "Concurrent Category quick-create did not converge safely.");
    const categoryIds = concurrentCategory.flatMap((result) => result.status === "fulfilled" ? [result.value] : []);
    assert(new Set(categoryIds).size === 1, "Concurrent Category quick-create did not converge on one internal entity.");
    const applicationId = await quickCreateApplicationDraft(db, productEditor, {
      internalKey: `stage2-quick-application-${crypto.randomUUID()}`,
      name: "TEST Stage 2 Quick Application",
    });
    const quickRoutes = await db.select({ entityId: routes.entityId, indexStatus: seoMetadata.indexStatus }).from(routes).innerJoin(seoMetadata, eq(seoMetadata.routeId, routes.id)).where(inArray(routes.path, ["/fabric-types/test-stage-2-concurrent-category/", "/applications/test-stage-2-quick-application/"]));
    assert(quickRoutes.length === 0, "Quick-created records unexpectedly acquired public Route or SEO authority.");
    assert((await db.select({ status: applications.status }).from(applications).where(eq(applications.id, applicationId)))[0]?.status === "draft", "Quick-created Application was not Draft.");
    const quickAuditRows = await db.select({ action: auditLogs.action }).from(auditLogs).where(inArray(auditLogs.action, ["taxonomy.quick_draft.created", "application.quick_draft.created"]));
    assert(quickAuditRows.filter((row) => row.action === "taxonomy.quick_draft.created").length === 1, "Concurrent Category quick-create wrote duplicate Audit authority.");
    assert(quickAuditRows.some((row) => row.action === "application.quick_draft.created"), "Application quick-create required Audit is missing.");
    scenarios.push("Category/Application quick-create converges on internal Drafts without Route or SEO authority");

    const targetRows = await db.insert(contents).values({
      channel: "fabric_knowledge",
      type: "guide",
      status: "published",
      authorId,
      createdByUserId: contentEditor.userId,
    }).returning({ id: contents.id });
    const targetContentId = targetRows[0]!.id;
    await db.insert(contentLocalizations).values({
      contentId: targetContentId,
      locale: "en",
      title: "TEST Stage 2 CTA Target",
      body: "",
      structuredBlocks: paragraph("Public target."),
      blocksVersion: 1,
      editorDocumentVersion: 1,
    });
    const targetPath = `/fabric-knowledge/test-stage2-target-${crypto.randomUUID()}/`;
    const targetRouteRows = await db.insert(routes).values({
      locale: "en",
      path: targetPath,
      entityType: "content",
      entityId: targetContentId,
      isCurrent: true,
    }).returning({ id: routes.id });
    await db.insert(seoMetadata).values({
      routeId: targetRouteRows[0]!.id,
      indexStatus: "noindex",
      canonicalPath: targetPath,
    });
    const sourceRows = await db.insert(contents).values({
      channel: "fabric_knowledge",
      type: "guide",
      status: "published",
      authorId,
      createdByUserId: contentEditor.userId,
    }).returning({ id: contents.id });
    const sourceContentId = sourceRows[0]!.id;
    await db.insert(contentLocalizations).values({
      contentId: sourceContentId,
      locale: "en",
      title: "TEST Stage 2 CTA Source",
      body: "",
      structuredBlocks: paragraph("Approved source."),
      blocksVersion: 1,
      editorDocumentVersion: 1,
    });
    const ctaSave = await saveContentBlockDraft(db, contentEditor, sourceContentId, {
      title: "TEST Stage 2 CTA Source",
      excerpt: null,
      document: {
        version: 1,
        blocks: [{ id: "target-cta", type: "cta", label: "Read target", href: targetPath }],
      },
      expectedEditorDocumentVersion: 1,
      revisionId: null,
      expectedRevisionVersion: 0,
    });
    assert(ctaSave.revisionId, "Content CTA Draft Revision was not created.");
    await submitContentBlockDraftForReview(db, contentEditor, sourceContentId, ctaSave.revisionId);
    await db.update(routes).set({ isCurrent: false }).where(eq(routes.id, targetRouteRows[0]!.id));
    let invalidatedLinkRejected = false;
    try {
      await applyContentRevision(db, reviewer, ctaSave.revisionId);
    } catch {
      invalidatedLinkRejected = true;
    }
    assert(invalidatedLinkRejected, "Apply did not recheck an invalidated internal CTA target.");
    assert((await db.select({ status: editorialRevisions.status }).from(editorialRevisions).where(eq(editorialRevisions.id, ctaSave.revisionId)))[0]?.status === "in_review", "Rejected internal CTA Apply changed Revision status.");
    assert(firstParagraphText((await db.select({ document: contentLocalizations.structuredBlocks }).from(contentLocalizations).where(eq(contentLocalizations.contentId, sourceContentId)))[0]?.document) === "Approved source.", "Rejected internal CTA Apply changed live Content.");
    scenarios.push("Internal CTA target invalidated between Save and Apply fails closed");

    const idleTransactionRows = await firstClient<{ count: string }[]>`
      select count(*)::text as count
      from pg_stat_activity
      where datname = current_database() and state = 'idle in transaction'
    `;
    assert(Number(idleTransactionRows[0]?.count) === 0, "Validation left an idle-in-transaction session.");
    scenarios.push("No idle-in-transaction validation sessions");

    process.stdout.write(`${JSON.stringify({
      postgres: (await firstClient<{ version: string }[]>`select version()`).at(0)?.version,
      migrationJournalEntries: Number(journalRows[0]?.count),
      scenarios: scenarios.map((scenario) => ({ scenario, result: "passed" })),
    }, null, 2)}\n`);
  } finally {
    await migrationClient.end().catch(() => undefined);
    await firstClient.end();
    await secondClient.end();
    await admin.unsafe(
      "select pg_terminate_backend(pid) from pg_stat_activity where datname = $1 and pid <> pg_backend_pid()",
      [databaseName],
    );
    await admin.unsafe(`drop database if exists "${databaseName}" with (force)`);
    await admin.end();
  }
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack : String(error)}\n`);
  process.exitCode = 1;
});
