import { eq, sql } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import sharp from "sharp";

import { migrateDatabase } from "./migrate";
import { createTestDatabase } from "@/test/database";
import * as schema from "@/db/schema";
import {
  contacts,
  conversionEvents,
  assets,
  auditLogs,
  customerActivities,
  inquiries,
  productTaxonomyTerms,
  products,
  redirects,
  routes,
  taxonomyTerms,
  users,
} from "@/db/schema";
import { CONVERSION_EVENTS_PUBLIC_ONLY_EXPRESSION } from "@/db/schema/analytics";
import { assertDatabaseReady, verifyDatabaseReadiness } from "./readiness";
import { InMemoryObjectStorage } from "@/test/in-memory-storage";
import { DevelopmentFileScanner } from "@/uploads/scanner";
import { rescanLegacyAssets } from "@/uploads/legacy-rescan-service";
import { authorizeInquiryAssetRecord } from "@/crm/authorization";

describe("database migrations", () => {
  it("creates the complete schema and is safe to run repeatedly", async () => {
    const connection = await createTestDatabase();
    await migrateDatabase(connection);
    const result = await connection.db.execute<{ table_name: string }>(sql`
      select table_name
      from information_schema.tables
      where table_schema = 'public'
    `);
    const names = result.rows.map((row) => row.table_name);
    expect(names).toContain("products");
    expect(names).toContain("assets");
    expect(names).toContain("inquiries");
    expect(names).toContain("audit_logs");
    expect(names).toContain("upload_recovery_jobs");
    expect(names).toContain("finalize_object_manifest_items");
    await connection.close();
  }, 15_000);

  it("enforces primary taxonomy, CRM contact, owner, and route/redirect invariants", async () => {
    const connection = await createTestDatabase();
    const taxonomyRows = await connection.db
      .insert(taxonomyTerms)
      .values([
        { internalKey: "constraint-primary", dimension: "material_fiber" },
        { internalKey: "constraint-additional", dimension: "structure_construction" },
      ])
      .returning({ id: taxonomyTerms.id });
    const primaryId = taxonomyRows[0]?.id;
    const additionalId = taxonomyRows[1]?.id;
    if (!primaryId || !additionalId) throw new Error("Missing taxonomy fixtures.");
    const productId = await connection.db.transaction(async (transaction) => {
      const rows = await transaction
        .insert(products)
        .values({ status: "draft" })
        .returning({ id: products.id });
      const id = rows[0]!.id;
      await transaction.insert(productTaxonomyTerms).values({
        productId: id,
        taxonomyTermId: primaryId,
        isPrimary: true,
      });
      return id;
    });
    await expect(
      connection.db.insert(productTaxonomyTerms).values({
        productId,
        taxonomyTermId: additionalId,
        isPrimary: true,
      }),
    ).rejects.toThrow();

    const contactRows = await connection.db
      .insert(contacts)
      .values([
        { name: "Contact A", email: "constraint-a@example.test", normalizedEmail: "constraint-a@example.test" },
        { name: "Contact B", email: "constraint-b@example.test", normalizedEmail: "constraint-b@example.test" },
      ])
      .returning({ id: contacts.id });
    const contactA = contactRows[0]!.id;
    const contactB = contactRows[1]!.id;
    const inquiryRows = await connection.db
      .insert(inquiries)
      .values({
        publicReference: "CWT-CONSTRAINT",
        contactId: contactA,
        submittedName: "Contact A",
        submittedEmail: "constraint-a@example.test",
        idempotencyKey: "constraint-inquiry",
        sourcePagePath: "/get-quote/",
      })
      .returning({ id: inquiries.id });
    const inquiryId = inquiryRows[0]!.id;
    await expect(
      connection.db.insert(customerActivities).values({
        inquiryId,
        contactId: contactB,
        type: "note",
        direction: "internal",
        content: "Mismatched Contact",
      }),
    ).rejects.toThrow(/contact/i);
    const editorRows = await connection.db
      .insert(users)
      .values({ email: "constraint-editor@example.test", displayName: "Editor", role: "content_editor", passwordHash: "test" })
      .returning({ id: users.id });
    await expect(
      connection.db
        .update(inquiries)
        .set({ ownerUserId: editorRows[0]!.id })
        .where(eq(inquiries.id, inquiryId)),
    ).rejects.toThrow(/owner/i);

    await connection.db.insert(routes).values({
      path: "/constraint-destination/",
      entityType: "static_page",
    });
    await connection.db.insert(redirects).values({
      sourcePath: "/constraint-old/",
      destinationPath: "/constraint-destination/",
      reason: "Constraint test",
    });
    await expect(
      connection.db.insert(routes).values({
        path: "/constraint-old/",
        entityType: "static_page",
      }),
    ).rejects.toThrow();
    await expect(
      connection.db.insert(redirects).values({
        sourcePath: "/constraint-missing-source/",
        destinationPath: "/constraint-missing-destination/",
        reason: "Invalid destination",
      }),
    ).rejects.toThrow();
    await connection.close();
  });

  it("keeps authoritative Check Constraints in Schema/Snapshot and rejects blank Product Codes at the database boundary", async () => {
    const connection = await createTestDatabase();
    try {
      const constraints = await connection.db.execute<{ conname: string; definition: string }>(sql`
        select conname, pg_get_constraintdef(oid) as definition from pg_constraint
        where conname in ('conversion_events_public_only_check', 'products_product_code_nonblank_check')
      `);
      expect(constraints.rows.map((row) => row.conname).sort()).toEqual([
        "conversion_events_public_only_check",
        "products_product_code_nonblank_check",
      ]);
      const conversionDefinition = constraints.rows.find((row) => row.conname === "conversion_events_public_only_check")?.definition ?? "";
      for (const requiredFragment of [
        "event_name",
        "entity_type",
        "entity_id",
        "product_view",
        "inquiry_created",
        "fabric_entry",
      ]) {
        expect(conversionDefinition).toContain(requiredFragment);
      }
      for (const forbiddenInternalEvent of [
        "inquiry_qualified",
        "quote_recorded",
        "sample_recorded",
        "inquiry_won",
        "inquiry_lost",
      ]) {
        await expect(connection.db.insert(conversionEvents).values({
          eventId: `constraint-${forbiddenInternalEvent}`,
          eventName: forbiddenInternalEvent as typeof conversionEvents.$inferInsert.eventName,
          anonymousSessionId: "constraint-session",
          routePath: "/",
        })).rejects.toThrow();
      }
      await expect(connection.db.insert(conversionEvents).values({
        eventId: "constraint-public-legal",
        eventName: "quote_cta_click",
        anonymousSessionId: "constraint-session",
        routePath: "/products/",
      })).resolves.toBeDefined();
      await expect(connection.db.insert(conversionEvents).values({
        eventId: "constraint-entity-illegal",
        eventName: "quote_cta_click",
        anonymousSessionId: "constraint-session",
        routePath: "/products/",
        entityType: "taxonomy",
      })).rejects.toThrow();
      await expect(connection.db.insert(conversionEvents).values({
        eventId: "constraint-entity-id-mismatch",
        eventName: "product_view",
        anonymousSessionId: "constraint-session",
        routePath: "/products/test/",
        entityType: "product",
      })).rejects.toThrow();
      const [taxonomy] = await connection.db.insert(taxonomyTerms).values({ internalKey: "product-code-constraint", dimension: "material_fiber" }).returning({ id: taxonomyTerms.id });
      if (!taxonomy) throw new Error("Missing Taxonomy.");
      const insertCode = (productCode: string | null) => connection.db.transaction(async (transaction) => {
        const [product] = await transaction.insert(products).values({ productCode }).returning({ id: products.id });
        if (!product) throw new Error("Missing Product.");
        await transaction.insert(productTaxonomyTerms).values({ productId: product.id, taxonomyTermId: taxonomy.id, isPrimary: true });
      });
      await expect(insertCode(null)).resolves.toBeUndefined();
      await expect(insertCode("TEST-CODE-001")).resolves.toBeUndefined();
      await expect(insertCode("TEST-CODE-001")).rejects.toThrow();
      for (const blank of ["", "   ", "\t", "\n", " \t\n "]) {
        await expect(insertCode(blank), JSON.stringify(blank)).rejects.toThrow();
      }
      const snapshot = await readFile("drizzle/meta/0011_snapshot.json", "utf8");
      expect(snapshot).toContain('"conversion_events_public_only_check"');
      expect(snapshot).toContain('"products_product_code_nonblank_check"');
      expect(snapshot).toContain(CONVERSION_EVENTS_PUBLIC_ONLY_EXPRESSION.replaceAll('"', '\\"'));
      const migration = await readFile("drizzle/0011_clever_inertia.sql", "utf8");
      expect(migration).toContain('DROP CONSTRAINT IF EXISTS "conversion_events_public_only_check"');
      expect(migration).toContain(`ADD CONSTRAINT "conversion_events_public_only_check" CHECK (${CONVERSION_EVENTS_PUBLIC_ONLY_EXPRESSION})`);
      expect(migration.match(/ADD CONSTRAINT "conversion_events_public_only_check"/g)).toHaveLength(1);
    } finally {
      await connection.close();
    }
  });

  it("creates the durable Upload Recovery lease model with its uniqueness and work indexes", async () => {
    const connection = await createTestDatabase();
    try {
      const columns = await connection.db.execute<{ column_name: string }>(sql`
        select column_name from information_schema.columns
        where table_name = 'upload_recovery_jobs'
      `);
      const names = new Set(columns.rows.map((row) => row.column_name));
      for (const required of [
        "kind",
        "upload_batch_id",
        "upload_intent_id",
        "asset_id",
        "storage_partition",
        "object_key",
        "status",
        "stage",
        "attempt_count",
        "next_attempt_at",
        "locked_by",
        "locked_at",
        "lease_expires_at",
        "version",
        "last_error",
        "started_at",
        "completed_at",
        "expires_at",
      ]) {
        expect(names, required).toContain(required);
      }
      const indexes = await connection.db.execute<{ indexname: string }>(sql`
        select indexname from pg_indexes where tablename = 'upload_recovery_jobs'
      `);
      expect(indexes.rows.map((row) => row.indexname)).toEqual(expect.arrayContaining([
        "upload_recovery_jobs_intent_unique",
        "upload_recovery_jobs_finalize_batch_unique",
        "upload_recovery_jobs_work_idx",
        "upload_recovery_jobs_batch_idx",
      ]));
      const snapshot = await readFile("drizzle/meta/0012_snapshot.json", "utf8");
      expect(snapshot).toContain('"upload_recovery_jobs"');
      expect(snapshot).toContain('"upload_recovery_jobs_finalize_batch_unique"');
      const migration = await readFile("drizzle/0012_nostalgic_calypso.sql", "utf8");
      expect(migration).toContain('CREATE TABLE "upload_recovery_jobs"');
      expect(migration).toContain('CREATE UNIQUE INDEX "upload_recovery_jobs_finalize_batch_unique"');
    } finally {
      await connection.close();
    }
  });

  it("creates standby Public Compensation and an independent authoritative Finalize Object Manifest", async () => {
    const connection = await createTestDatabase();
    try {
      const cleanupColumns = await connection.db.execute<{ column_name: string }>(sql`
        select column_name from information_schema.columns
        where table_name = 'object_cleanup_jobs'
      `);
      const cleanupNames = new Set(cleanupColumns.rows.map((row) => row.column_name));
      for (const required of [
        "finalize_recovery_id",
        "finalize_attempt",
        "expected_object_role",
        "expected_mime_type",
        "expected_byte_size",
        "write_completed_at",
        "armed_at",
        "armed_reason",
      ]) {
        expect(cleanupNames, required).toContain(required);
      }
      const manifestColumns = await connection.db.execute<{ column_name: string }>(sql`
        select column_name from information_schema.columns
        where table_name = 'finalize_object_manifest_items'
      `);
      expect(manifestColumns.rows.map((row) => row.column_name)).toEqual(expect.arrayContaining([
        "recovery_job_id",
        "upload_batch_id",
        "finalize_attempt",
        "asset_id",
        "object_key",
        "object_role",
        "mime_type",
        "byte_size",
        "write_completed_at",
      ]));
      const statusValues = await connection.db.execute<{ enumlabel: string }>(sql`
        select enumlabel from pg_enum
        join pg_type on pg_type.oid = pg_enum.enumtypid
        where pg_type.typname = 'object_cleanup_status'
        order by enumsortorder
      `);
      expect(statusValues.rows.map((row) => row.enumlabel)).toEqual([
        "standby", "pending", "processing", "completed", "cancelled", "dead",
      ]);
      const indexes = await connection.db.execute<{ indexname: string }>(sql`
        select indexname from pg_indexes
        where tablename in ('object_cleanup_jobs', 'finalize_object_manifest_items')
      `);
      expect(indexes.rows.map((row) => row.indexname)).toEqual(expect.arrayContaining([
        "object_cleanup_jobs_finalize_idx",
        "finalize_manifest_attempt_object_unique",
        "finalize_manifest_batch_attempt_idx",
      ]));
      expect(await readFile("drizzle/0013_lyrical_black_knight.sql", "utf8"))
        .toContain("object_cleanup_finalize_state_check");
      expect(await readFile("drizzle/0014_lumpy_toxin.sql", "utf8"))
        .toContain('CREATE TABLE "finalize_object_manifest_items"');
      expect(await readFile("drizzle/meta/0014_snapshot.json", "utf8"))
        .toContain('"finalize_object_manifest_items"');
    } finally {
      await connection.close();
    }
  });

  it("upgrades 0012 in-flight Public compensation into standby plus a durable Manifest", async () => {
    const temporaryRoot = await mkdtemp(join(tmpdir(), "cwt-finalize-upgrade-"));
    const metaDirectory = join(temporaryRoot, "meta");
    await mkdir(metaDirectory);
    const journal = JSON.parse(await readFile("drizzle/meta/_journal.json", "utf8")) as {
      version: string;
      dialect: string;
      entries: Array<{ idx: number; tag: string }>;
    };
    for (const entry of journal.entries.filter((item) => item.idx <= 12)) {
      await copyFile(`drizzle/${entry.tag}.sql`, join(temporaryRoot, `${entry.tag}.sql`));
    }
    await writeFile(join(metaDirectory, "_journal.json"), JSON.stringify({
      ...journal,
      entries: journal.entries.filter((item) => item.idx <= 12),
    }));
    const client = new PGlite("memory://");
    const connection = {
      kind: "pglite" as const,
      db: drizzle(client, { schema }),
      close: async () => client.close(),
    };
    try {
      await migrateDatabase(connection, temporaryRoot);
      await connection.db.execute(sql.raw(`
        insert into asset_upload_batches (id, status, declared_file_count, expires_at)
        values ('11111111-1111-4111-8111-111111111111', 'finalizing', 1, now() + interval '1 hour')
      `));
      await connection.db.execute(sql.raw(`
        insert into assets
          (id, upload_batch_id, original_file_name, storage_provider, storage_partition,
           object_key, access, category, status, declared_mime_type, detected_mime_type,
           byte_size, sha256, scan_status)
        values
          ('22222222-2222-4222-8222-222222222222',
           '11111111-1111-4111-8111-111111111111', 'TEST-upgrade.jpg', 'test',
           'private', 'staging/TEST-upgrade.jpg', 'internal', 'product', 'ready',
           'image/jpeg', 'image/jpeg', 128, 'TEST-upgrade-hash', 'passed')
      `));
      await connection.db.execute(sql.raw(`
        insert into upload_recovery_jobs
          (id, kind, upload_batch_id, status, stage, attempt_count, next_attempt_at,
           locked_by, locked_at, lease_expires_at, version, expires_at)
        values
          ('33333333-3333-4333-8333-333333333333', 'finalize',
           '11111111-1111-4111-8111-111111111111', 'processing', 'original_written', 1,
           now(), 'TEST-upgrade-worker', now(), now() + interval '20 minutes', 3,
           now() + interval '1 hour')
      `));
      await connection.db.execute(sql.raw(`
        insert into object_cleanup_jobs
          (id, upload_batch_id, asset_id, storage_partition, object_key, reason, status,
           next_attempt_at)
        values
          ('44444444-4444-4444-8444-444444444444',
           '11111111-1111-4111-8111-111111111111',
           '22222222-2222-4222-8222-222222222222', 'public',
           'staging/TEST-upgrade.jpg', 'finalize_public_original_compensation', 'pending', now())
      `));
      for (const entry of journal.entries.filter((item) => item.idx > 12)) {
        await copyFile(`drizzle/${entry.tag}.sql`, join(temporaryRoot, `${entry.tag}.sql`));
      }
      await writeFile(join(metaDirectory, "_journal.json"), JSON.stringify(journal));
      await migrateDatabase(connection, temporaryRoot);
      const cleanup = await connection.db.execute<{
        status: string;
        finalize_recovery_id: string;
        finalize_attempt: number;
        armed_at: Date | null;
      }>(sql.raw(`
        select status, finalize_recovery_id, finalize_attempt, armed_at
        from object_cleanup_jobs
        where id = '44444444-4444-4444-8444-444444444444'
      `));
      expect(cleanup.rows[0]).toMatchObject({
        status: "standby",
        finalize_recovery_id: "33333333-3333-4333-8333-333333333333",
        finalize_attempt: 1,
        armed_at: null,
      });
      const manifest = await connection.db.execute<{
        object_key: string;
        object_role: string;
        mime_type: string;
        byte_size: number;
      }>(sql.raw(`
        select object_key, object_role, mime_type, byte_size
        from finalize_object_manifest_items
        where recovery_job_id = '33333333-3333-4333-8333-333333333333'
      `));
      expect(manifest.rows).toEqual([{
        object_key: "staging/TEST-upgrade.jpg",
        object_role: "original",
        mime_type: "image/jpeg",
        byte_size: 128,
      }]);
    } finally {
      await connection.close();
      await rm(temporaryRoot, { recursive: true, force: true });
    }
  }, 30_000);

  it("upgrades the pre-remediation schema without losing the authoritative primary category", async () => {
    const temporaryRoot = await mkdtemp(join(tmpdir(), "cwt-migration-upgrade-"));
    const metaDirectory = join(temporaryRoot, "meta");
    await mkdir(metaDirectory);
    const journal = JSON.parse(
      await readFile("drizzle/meta/_journal.json", "utf8"),
    ) as { version: string; dialect: string; entries: Array<{ idx: number; tag: string }> };
    for (const entry of journal.entries.filter((item) => item.idx <= 5)) {
      await copyFile(`drizzle/${entry.tag}.sql`, join(temporaryRoot, `${entry.tag}.sql`));
    }
    await writeFile(
      join(metaDirectory, "_journal.json"),
      JSON.stringify({ ...journal, entries: journal.entries.filter((item) => item.idx <= 5) }),
    );
    const client = new PGlite("memory://");
    const connection = {
      kind: "pglite" as const,
      db: drizzle(client, { schema }),
      close: async () => client.close(),
    };
    try {
      await migrateDatabase(connection, temporaryRoot);
      await connection.db.execute(sql.raw(`
        insert into taxonomy_terms (id, internal_key, dimension)
        values
          ('11111111-1111-4111-8111-111111111111', 'upgrade-primary', 'material_fiber'),
          ('22222222-2222-4222-8222-222222222222', 'upgrade-old-relation', 'structure_construction')
      `));
      await connection.db.execute(sql.raw(`
        insert into products (id, status, primary_taxonomy_term_id)
        values ('33333333-3333-4333-8333-333333333333', 'published', '11111111-1111-4111-8111-111111111111')
      `));
      await connection.db.execute(sql.raw(`
        insert into product_taxonomy_terms (product_id, taxonomy_term_id, is_primary)
        values ('33333333-3333-4333-8333-333333333333', '22222222-2222-4222-8222-222222222222', true)
      `));
      const imageBytes = await sharp({ create: { width: 8, height: 8, channels: 3, background: "blue" } }).jpeg().toBuffer();
      await connection.db.execute(sql.raw(`
        insert into assets
          (id, original_file_name, storage_provider, storage_partition, object_key, access, category, status, declared_mime_type, detected_mime_type, byte_size, sha256, deleted_at)
        values
          ('44444444-4444-4444-8444-444444444444', 'legacy-public.jpg', 'legacy', 'public', 'legacy/public.jpg', 'public', 'product', 'ready', 'image/jpeg', 'image/jpeg', ${imageBytes.byteLength}, 'legacy-public', null),
          ('55555555-5555-4555-8555-555555555555', 'legacy-inquiry.jpg', 'legacy', 'private', 'legacy/inquiry.jpg', 'private', 'inquiry', 'ready', 'image/jpeg', 'image/jpeg', ${imageBytes.byteLength}, 'legacy-inquiry', null),
          ('66666666-6666-4666-8666-666666666666', 'legacy-import.jpg', 'legacy', 'imports', 'legacy/import.jpg', 'internal', 'import', 'ready', 'image/jpeg', 'image/jpeg', ${imageBytes.byteLength}, 'legacy-import', null),
          ('77777777-7777-4777-8777-777777777777', 'legacy-missing.jpg', 'legacy', 'public', 'legacy/missing.jpg', 'public', 'product', 'ready', 'image/jpeg', 'image/jpeg', ${imageBytes.byteLength}, 'legacy-missing', null),
          ('88888888-8888-4888-8888-888888888888', 'legacy-deleted.jpg', 'legacy', 'public', 'legacy/deleted.jpg', 'public', 'product', 'deleted', 'image/jpeg', 'image/jpeg', ${imageBytes.byteLength}, 'legacy-deleted', now())
      `));
      await connection.db.execute(sql.raw(`
        insert into product_assets (product_id, asset_id, role, sort_order)
        values
          ('33333333-3333-4333-8333-333333333333', '44444444-4444-4444-8444-444444444444', 'hero', 0),
          ('33333333-3333-4333-8333-333333333333', '77777777-7777-4777-8777-777777777777', 'gallery', 1)
      `));
      await connection.db.execute(sql.raw(`
        insert into contacts (id, name, email, normalized_email)
        values ('99999999-9999-4999-8999-999999999999', 'Legacy Buyer', 'legacy@example.test', 'legacy@example.test')
      `));
      await connection.db.execute(sql.raw(`
        insert into inquiries (id, contact_id, source_page_path)
        values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', '99999999-9999-4999-8999-999999999999', '/get-quote/')
      `));
      await connection.db.execute(sql.raw(`
        insert into inquiry_assets (inquiry_id, asset_id)
        values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', '55555555-5555-4555-8555-555555555555')
      `));
      const storage = new InMemoryObjectStorage();
      await storage.put("public", "legacy/public.jpg", imageBytes, "image/jpeg");
      await storage.put("private", "legacy/inquiry.jpg", imageBytes, "image/jpeg");
      await storage.put("imports", "legacy/import.jpg", imageBytes, "image/jpeg");
      const remediationEntries = journal.entries.filter((entry) => entry.idx > 5);
      if (!remediationEntries.length) throw new Error("Missing remediation migration journal entries.");
      for (const remediationEntry of remediationEntries) {
        await copyFile(
          `drizzle/${remediationEntry.tag}.sql`,
          join(temporaryRoot, `${remediationEntry.tag}.sql`),
        );
      }
      await writeFile(join(metaDirectory, "_journal.json"), JSON.stringify(journal));
      await migrateDatabase(connection, temporaryRoot);
      const postMigrationAssets = await connection.db
        .select({ id: assets.id, rescanStatus: assets.rescanStatus, scanStatus: assets.scanStatus })
        .from(assets);
      expect(postMigrationAssets.filter((asset) => asset.id !== "88888888-8888-4888-8888-888888888888").every((asset) => asset.rescanStatus === "required" && asset.scanStatus === "pending")).toBe(true);
      await connection.db
        .update(assets)
        .set({
          rescanStatus: "processing",
          lastRescanAttemptAt: new Date(0),
          scanFailureReason: null,
        })
        .where(eq(assets.id, "66666666-6666-4666-8666-666666666666"));
      await rescanLegacyAssets(connection.db, storage, new DevelopmentFileScanner());
      const rescanned = await connection.db.select().from(assets);
      const byId = new Map(rescanned.map((asset) => [asset.id, asset]));
      for (const id of [
        "44444444-4444-4444-8444-444444444444",
        "55555555-5555-4555-8555-555555555555",
        "66666666-6666-4666-8666-666666666666",
      ]) {
        expect(byId.get(id)).toMatchObject({ scanStatus: "passed", rescanStatus: "completed", status: "ready" });
      }
      expect(byId.get("77777777-7777-4777-8777-777777777777")).toMatchObject({ scanStatus: "error", rescanStatus: "manual_review", status: "quarantined", scanFailureReason: "source_object_missing" });
      expect(byId.get("88888888-8888-4888-8888-888888888888")).toMatchObject({ rescanStatus: "manual_review", scanFailureReason: "historical_asset_deleted" });
      await expect(authorizeInquiryAssetRecord(connection.db, { userId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb", role: "admin" }, "55555555-5555-4555-8555-555555555555")).resolves.toMatchObject({ inquiryId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa" });
      const readiness = await verifyDatabaseReadiness(connection.db);
      expect(readiness.historicalAssetsManualReview).toBeGreaterThan(0);
      expect(() => assertDatabaseReady(readiness)).not.toThrow();
      const demoted = await connection.db
        .select({
          status: products.status,
          remediationRequired: products.publicationRemediationRequired,
          remediationReason: products.publicationRemediationReason,
        })
        .from(products)
        .where(eq(products.id, "33333333-3333-4333-8333-333333333333"));
      expect(demoted[0]).toMatchObject({
        status: "in_review",
        remediationRequired: true,
        remediationReason: "round3_historical_publication_gate_failed",
      });
      const migrationAudits = await connection.db
        .select({ action: auditLogs.action })
        .from(auditLogs)
        .where(eq(auditLogs.entityId, "33333333-3333-4333-8333-333333333333"));
      expect(migrationAudits).toContainEqual({
        action: "product.historical_publication.remediation_required",
      });
      const primaryRows = await connection.db
        .select({ taxonomyTermId: productTaxonomyTerms.taxonomyTermId })
        .from(productTaxonomyTerms)
        .where(
          sql`${productTaxonomyTerms.productId} = '33333333-3333-4333-8333-333333333333' and ${productTaxonomyTerms.isPrimary} = true`,
        );
      expect(primaryRows).toEqual([
        { taxonomyTermId: "11111111-1111-4111-8111-111111111111" },
      ]);
      const columns = await connection.db.execute<{ column_name: string }>(sql`
        select column_name from information_schema.columns
        where table_name = 'products' and column_name = 'primary_taxonomy_term_id'
      `);
      expect(columns.rows).toHaveLength(0);
      const upgradedConstraint = await connection.db.execute<{ definition: string }>(sql`
        select pg_get_constraintdef(oid) as definition
        from pg_constraint
        where conname = 'conversion_events_public_only_check'
      `);
      expect(upgradedConstraint.rows).toHaveLength(1);
      expect(upgradedConstraint.rows[0]?.definition).toContain("event_name");
      expect(upgradedConstraint.rows[0]?.definition).toContain("entity_type");
      expect(upgradedConstraint.rows[0]?.definition).toContain("entity_id");
      const upgradedRecoveryTable = await connection.db.execute<{ table_name: string }>(sql`
        select table_name from information_schema.tables
        where table_schema = 'public' and table_name = 'upload_recovery_jobs'
      `);
      expect(upgradedRecoveryTable.rows).toHaveLength(1);
    } finally {
      await connection.close();
      await rm(temporaryRoot, { recursive: true, force: true });
    }
  });
});
