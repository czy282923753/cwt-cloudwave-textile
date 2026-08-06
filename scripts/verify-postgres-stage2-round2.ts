import { and, eq, inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import { canAccessEditorialResource } from "../src/admin/preview-policy";
import { runGovernedMutation } from "../src/audit/governed-mutation";
import { createProductDraft } from "../src/catalog/product-service";
import { createContentDraft } from "../src/content/content-service";
import {
  applyStaticPageConfigRevision,
  DEFAULT_STATIC_PAGE_CONFIGS,
  saveStaticPageConfigDraft,
  submitStaticPageConfigDraftForReview,
} from "../src/content/static-page-settings";
import { migratePostgresWithEnumCompatibility } from "../src/db/postgres-enum-migration-compatibility";
import * as schema from "../src/db/schema";
import {
  assets,
  authors,
  companyFacts,
  contentLocalizations,
  contents,
  internalLinkRelations,
  routes,
  users,
} from "../src/db/schema";
import { applyBlockCommand } from "../src/editorial/block-editor-state";
import { parseBlockDocument } from "../src/editorial/blocks";
import {
  resolveBlockPublicProjection,
  synchronizeBlockInternalLinks,
} from "../src/editorial/block-references";
import { findPublicAssetForDelivery } from "../src/public-site/public-asset-access";
import {
  registerSystemPublicRoutes,
  SYSTEM_PUBLIC_ROUTES,
} from "../src/seo/system-public-routes";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function validationAdminUrl(): URL {
  if (
    process.env.APP_ENV !== "test" ||
    process.env.DATABASE_DRIVER !== "postgres" ||
    process.env.CWT_STAGE2_ROUND2_VALIDATION !== "isolated-test-database"
  ) {
    throw new Error(
      "Stage 2 Round 2 validation requires APP_ENV=test, DATABASE_DRIVER=postgres, and CWT_STAGE2_ROUND2_VALIDATION=isolated-test-database.",
    );
  }
  const url = new URL(process.env.DATABASE_URL ?? "");
  if (!url.pathname || url.pathname === "/" || !["localhost", "127.0.0.1"].includes(url.hostname)) {
    throw new Error("Stage 2 Round 2 validation requires a localhost PostgreSQL administrative database.");
  }
  return url;
}

function testDatabaseName(): string {
  return `cwt_stage2_round2_${process.pid}_${crypto.randomUUID().replaceAll("-", "")}`;
}

async function main(): Promise<void> {
  const adminUrl = validationAdminUrl();
  const databaseName = testDatabaseName();
  const admin = postgres(adminUrl.toString(), { max: 1, prepare: false });
  await admin.unsafe(`create database "${databaseName}"`);
  const testUrl = new URL(adminUrl);
  testUrl.pathname = `/${databaseName}`;
  const migrationClient = postgres(testUrl.toString(), { max: 1, prepare: false });
  const firstClient = postgres(testUrl.toString(), { max: 6, prepare: false });
  const secondClient = postgres(testUrl.toString(), { max: 4, prepare: false });
  const db = drizzle(firstClient, { schema });
  const secondDb = drizzle(secondClient, { schema });
  const scenarios: string[] = [];

  try {
    await migratePostgresWithEnumCompatibility(migrationClient, "drizzle");
    await migratePostgresWithEnumCompatibility(migrationClient, "drizzle");
    const journal = await firstClient<{ value: string }[]>`
      select count(*)::text as value from drizzle.__drizzle_migrations
    `;
    assert(Number(journal[0]?.value) === 19, "Fresh 0000→0018 or repeat/no-op failed.");
    scenarios.push("Fresh 0000→0018 and repeat/no-op");

    const actors = await db.insert(users).values([
      { email: "stage2-round2-content@example.test", displayName: "TEST Content Editor", role: "content_editor", passwordHash: "test-only" },
      { email: "stage2-round2-reviewer@example.test", displayName: "TEST Reviewer", role: "reviewer_publisher", passwordHash: "test-only" },
      { email: "stage2-round2-sales@example.test", displayName: "TEST Sales", role: "sales", passwordHash: "test-only" },
    ]).returning({ id: users.id, role: users.role });
    const contentEditor = { userId: actors.find((row) => row.role === "content_editor")!.id, role: "content_editor" as const };
    const reviewer = { userId: actors.find((row) => row.role === "reviewer_publisher")!.id, role: "reviewer_publisher" as const };
    const sales = { userId: actors.find((row) => row.role === "sales")!.id, role: "sales" as const };

    const roles = ["admin", "product_editor", "content_editor", "reviewer_publisher", "sales", "analyst"] as const;
    const allowed = {
      admin: ["product", "content", "static_page"],
      product_editor: ["product"],
      content_editor: ["content", "static_page"],
      reviewer_publisher: ["product", "content", "static_page"],
      sales: [],
      analyst: [],
    } as const;
    for (const role of roles) {
      for (const resource of ["product", "content", "static_page"] as const) {
        assert(
          canAccessEditorialResource(role, resource, "manage") ===
            (allowed[role] as readonly string[]).includes(resource),
          `Editorial policy mismatch for ${role}/${resource}.`,
        );
      }
    }
    let productDenied = false;
    let contentDenied = false;
    let staticDenied = false;
    try {
      await createProductDraft(db, sales, {
        name: "TEST forbidden Product",
        primaryTaxonomyTermId: crypto.randomUUID(),
        assetIds: [crypto.randomUUID()],
      });
    } catch { productDenied = true; }
    try {
      await createContentDraft(db, sales, {
        channel: "fabric_knowledge",
        type: "article",
        authorId: crypto.randomUUID(),
        title: "TEST forbidden Content",
        body: "TEST forbidden Content body",
      });
    } catch { contentDenied = true; }
    try {
      await saveStaticPageConfigDraft(db, sales, DEFAULT_STATIC_PAGE_CONFIGS.home);
    } catch { staticDenied = true; }
    assert(productDenied && contentDenied && staticDenied, "A direct unauthorized Editorial mutation reached persistence.");
    scenarios.push("H3 seven-role resource policy and direct Domain Service denial");

    const fixedDocument = parseBlockDocument({
      version: 1,
      blocks: [{ id: "fixed-cta", type: "cta", label: "Get a Quote", href: "/get-quote/" }],
    }, "content");
    let unregisteredRejected = false;
    try {
      await resolveBlockPublicProjection(db, { type: "content", id: crypto.randomUUID() }, fixedDocument);
    } catch { unregisteredRejected = true; }
    assert(unregisteredRejected, "Unregistered fixed Route did not fail closed.");
    const [firstRegistration, concurrentRegistration] = await Promise.all([
      registerSystemPublicRoutes(db),
      registerSystemPublicRoutes(secondDb),
    ]);
    assert(
      firstRegistration.size === SYSTEM_PUBLIC_ROUTES.length &&
        [...firstRegistration].every(([path, id]) => concurrentRegistration.get(path) === id),
      "Concurrent System Public Route registration was not stable and idempotent.",
    );
    const fixedRows = await db.select({ id: routes.id, path: routes.path }).from(routes).where(and(
      inArray(routes.path, SYSTEM_PUBLIC_ROUTES.map((route) => route.path)),
      eq(routes.isCurrent, true),
    ));
    assert(fixedRows.length === SYSTEM_PUBLIC_ROUTES.length, "System Public Route registry is incomplete.");

    const productOwnerId = crypto.randomUUID();
    const contentOwnerId = crypto.randomUUID();
    const sourceRoutes = await db.insert(routes).values([
      { path: `/products/test-round2-${crypto.randomUUID()}/`, entityType: "product", entityId: productOwnerId },
      { path: `/fabric-knowledge/test-round2-${crypto.randomUUID()}/`, entityType: "content", entityId: contentOwnerId },
    ]).returning({ id: routes.id, entityType: routes.entityType });
    for (const owner of [
      { type: "product" as const, id: productOwnerId },
      { type: "content" as const, id: contentOwnerId },
    ]) {
      const projection = await resolveBlockPublicProjection(db, owner, fixedDocument);
      await synchronizeBlockInternalLinks(db, owner, projection);
    }
    const quoteRouteId = firstRegistration.get("/get-quote/");
    const relationRows = await db.select().from(internalLinkRelations).where(eq(
      internalLinkRelations.destinationRouteId,
      quoteRouteId!,
    ));
    assert(relationRows.length === 2, "Product and Content fixed CTA relations did not share the registered Route ID.");
    const contentSourceRoute = sourceRoutes.find((route) => route.entityType === "content")!.id;
    await expectAuditRollback(db, contentOwnerId, contentSourceRoute, fixedDocument);
    scenarios.push("M3 fixed Route registration, concurrency, Product/Content relation synchronization, and Audit rollback");

    const ownedAssetRows = await db.insert(assets).values({
      originalFileName: "TEST-stage2-round2-owned.jpg",
      storageProvider: "test",
      storagePartition: "public",
      objectKey: `test/stage2-round2-owned-${crypto.randomUUID()}.jpg`,
      access: "public",
      category: "company",
      status: "ready",
      scanStatus: "passed",
      declaredMimeType: "image/jpeg",
      detectedMimeType: "image/jpeg",
      byteSize: 100,
      sha256: `stage2-round2-owned-${crypto.randomUUID()}`,
      subjectRelationship: "cwt",
      isCwtOwnedFacility: true,
    }).returning({ id: assets.id });
    const ownedAssetId = ownedAssetRows[0]!.id;
    const factKey = `test-stage2-round2-fact-${crypto.randomUUID()}`;
    const evidencedHome = {
      ...DEFAULT_STATIC_PAGE_CONFIGS.home,
      copy: {
        ...DEFAULT_STATIC_PAGE_CONFIGS.home.copy!,
        manufacturingStrength: { factKeys: [factKey] },
      },
      placements: [{
        assetId: ownedAssetId,
        placementKey: "manufacturing_strength" as const,
        viewport: "desktop" as const,
        role: "detail" as const,
        sortOrder: 0,
        altText: "TEST legacy free fact assertion",
        caption: "TEST legacy free capacity assertion",
        focalX: 50,
        focalY: 50,
        overlayOpacity: 0,
        isVisible: true,
      }],
    };
    let missingFactRejected = false;
    try { await saveStaticPageConfigDraft(db, contentEditor, evidencedHome); } catch { missingFactRejected = true; }
    assert(missingFactRejected, "Missing Company Fact was accepted into a sensitive Draft.");
    const factRows = await db.insert(companyFacts).values({
      factKey,
      subject: "TEST owned facility",
      statement: "Synthetic verified CWT-owned facility evidence.",
      relationshipToCwt: "owned",
      evidenceReference: "TEST evidence reference",
      publicUseAllowed: true,
      verificationStatus: "verified",
      verifiedByUserId: reviewer.userId,
      verifiedAt: new Date(),
    }).returning({ id: companyFacts.id });
    const pageDraft = await saveStaticPageConfigDraft(db, contentEditor, evidencedHome);
    await submitStaticPageConfigDraftForReview(db, contentEditor, pageDraft.revisionId);
    await applyStaticPageConfigRevision(db, reviewer, pageDraft.revisionId);
    assert((await findPublicAssetForDelivery(db, ownedAssetId))?.id === ownedAssetId, "Evidence-gated owned media was not deliverable.");
    await db.update(companyFacts).set({ publicUseAllowed: false }).where(eq(companyFacts.id, factRows[0]!.id));
    assert(await findPublicAssetForDelivery(db, ownedAssetId) === null, "Fact revocation did not remove sensitive media delivery.");
    await db.update(companyFacts).set({ publicUseAllowed: true }).where(eq(companyFacts.id, factRows[0]!.id));
    await db.update(assets).set({ subjectRelationship: "partner_factory" }).where(eq(assets.id, ownedAssetId));
    assert(await findPublicAssetForDelivery(db, ownedAssetId) === null, "Partner media remained in the sensitive public projection.");
    await db.update(assets).set({ subjectRelationship: "cwt", scanStatus: "failed" }).where(eq(assets.id, ownedAssetId));
    assert(await findPublicAssetForDelivery(db, ownedAssetId) === null, "Failed-scan media remained in the sensitive public projection.");
    scenarios.push("H2 fixed sensitive copy, Fact/owned-media Evidence Gate, and immediate revocation");

    const authorRows = await db.insert(authors).values({
      internalKey: `stage2-round2-author-${crypto.randomUUID()}`,
      displayName: "TEST Stage 2 Round 2 Author",
      isOrganization: true,
    }).returning({ id: authors.id });
    const anchoredDocument = parseBlockDocument({
      version: 1,
      blocks: [
        { id: "left", type: "paragraph", text: "Left interval" },
        { id: "anchor", type: "divider", locked: true },
        { id: "right", type: "paragraph", text: "Right interval" },
      ],
    }, "content");
    const persistedContent = await db.insert(contents).values({
      channel: "fabric_knowledge",
      type: "article",
      authorId: authorRows[0]!.id,
    }).returning({ id: contents.id });
    await db.insert(contentLocalizations).values({
      contentId: persistedContent[0]!.id,
      locale: "en",
      title: "TEST locked anchor",
      body: "",
      structuredBlocks: anchoredDocument,
    });
    const reloaded = parseBlockDocument((await db.select({ document: contentLocalizations.structuredBlocks })
      .from(contentLocalizations)
      .where(eq(contentLocalizations.contentId, persistedContent[0]!.id)))[0]!.document, "content");
    let crossingRejected = false;
    try { applyBlockCommand(reloaded, { type: "move", blockId: "left", toIndex: 2 }); } catch { crossingRejected = true; }
    assert(crossingRejected, "A persisted unlocked Block crossed a Locked sorting anchor.");
    const unlocked = applyBlockCommand(reloaded, { type: "toggle_lock", blockId: "anchor" });
    assert(applyBlockCommand(unlocked, { type: "move", blockId: "left", toIndex: 2 }).blocks[2]?.id === "left", "Unlock did not restore ordinary ordering.");
    scenarios.push("L1 persisted Locked Block sorting anchor and explicit Unlock");

    const sessionState = await firstClient<{ idle: string; waiting: string; advisory: string }[]>`
      select
        count(*) filter (where state = 'idle in transaction')::text as idle,
        count(*) filter (where wait_event_type = 'Lock')::text as waiting,
        (select count(*)::text from pg_locks where locktype = 'advisory' and granted) as advisory
      from pg_stat_activity where datname = current_database()
    `;
    assert(
      Number(sessionState[0]?.idle) === 0 &&
        Number(sessionState[0]?.waiting) === 0 &&
        Number(sessionState[0]?.advisory) === 0,
      "Validation left an open transaction, lock wait, or advisory lock.",
    );
    scenarios.push("No idle transaction, waiting lock, or advisory lock");

    process.stdout.write(`${JSON.stringify({
      postgres: (await firstClient<{ version: string }[]>`select version()`).at(0)?.version,
      migrationJournalEntries: Number(journal[0]?.value),
      systemPublicRouteCount: fixedRows.length,
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

async function expectAuditRollback<TDb extends Parameters<typeof synchronizeBlockInternalLinks>[0]>(
  db: TDb,
  ownerId: string,
  sourceRouteId: string,
  fixedDocument: ReturnType<typeof parseBlockDocument>,
): Promise<void> {
  const before = await db.select().from(internalLinkRelations).where(eq(
    internalLinkRelations.sourceRouteId,
    sourceRouteId,
  ));
  const emptyProjection = await resolveBlockPublicProjection(db, { type: "content", id: ownerId }, {
    version: fixedDocument.version,
    blocks: [],
  });
  let failed = false;
  try {
    await runGovernedMutation(db, async ({ transaction, audit }) => {
      await synchronizeBlockInternalLinks(transaction, { type: "content", id: ownerId }, emptyProjection);
      await audit({ action: "test.stage2.round2.link.rollback", entityType: "content", entityId: ownerId });
    }, { auditWriter: async () => { throw new Error("TEST required Audit failure"); } });
  } catch { failed = true; }
  assert(failed, "Required Audit failure was not surfaced.");
  const after = await db.select().from(internalLinkRelations).where(eq(
    internalLinkRelations.sourceRouteId,
    sourceRouteId,
  ));
  assert(JSON.stringify(after) === JSON.stringify(before), "Required Audit failure changed fixed link relations.");
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack : String(error)}\n`);
  process.exitCode = 1;
});
