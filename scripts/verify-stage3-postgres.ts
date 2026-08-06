import { strict as assert } from "node:assert";
import { createHash, randomUUID } from "node:crypto";
import { copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { Uint8ArrayReader, Uint8ArrayWriter, ZipWriter } from "@zip.js/zip.js";
import { and, count, eq, inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres, { type Sql } from "postgres";
import sharp from "sharp";
import writeExcelFile from "write-excel-file/node";

import { migratePostgresWithEnumCompatibility } from "../src/db/postgres-enum-migration-compatibility";
import * as schema from "../src/db/schema";
import {
  assetVariants,
  assets,
  authSessions,
  featureFlags,
  objectCleanupJobs,
  productAssets,
  productImportItems,
  products,
  taxonomyTermLocalizations,
  taxonomyTerms,
  uploadRecoveryJobs,
  users,
} from "../src/db/schema";
import { PRODUCT_IMPORT_HEADERS, PRODUCT_IMPORT_TEMPLATE_NAME } from "../src/imports/contract";
import {
  applyProductImportBatch,
  createValidatedProductImport,
  retryProductImportErrors,
} from "../src/imports/service";
import { InMemoryObjectStorage } from "../src/test/in-memory-storage";
import {
  completeAdminUploadIntent,
  completeAdminImportArchiveIntent,
  createAdminUploadBatch,
  finalizeAdminUploadBatch,
  IMPORT_ARCHIVE_MIME,
  IMPORT_WORKBOOK_MIME,
  type AdminUploadActor,
} from "../src/uploads/admin-upload-service";
import { DevelopmentFileScanner } from "../src/uploads/scanner";
import { processPendingUploadRecoveryJobs } from "../src/uploads/upload-recovery-service";

const allowLimiter = { consume: async () => true };

type JournalEntry = { idx: number; tag: string; when: number; version: string; breakpoints: boolean };
type Journal = { version: string; dialect: string; entries: JournalEntry[] };

function stream(bytes: Uint8Array): ReadableStream<Uint8Array> {
  return new ReadableStream({
    start(controller) {
      controller.enqueue(bytes);
      controller.close();
    },
  });
}

async function archive(entries: Array<{ name: string; bytes: Uint8Array }>): Promise<Uint8Array> {
  const writer = new ZipWriter(new Uint8ArrayWriter());
  for (const entry of entries) await writer.add(entry.name, new Uint8ArrayReader(entry.bytes));
  return writer.close();
}

function validationAdminUrl(): URL {
  if (
    process.env.APP_ENV !== "test" ||
    process.env.DATABASE_DRIVER !== "postgres" ||
    process.env.CWT_POSTGRES_VALIDATION !== "stage3-isolated"
  ) {
    throw new Error("Stage 3 PostgreSQL verification requires APP_ENV=test, a local PostgreSQL database, and CWT_POSTGRES_VALIDATION=stage3-isolated.");
  }
  const url = new URL(process.env.DATABASE_URL ?? "");
  if (!url.pathname || url.pathname === "/" || !["localhost", "127.0.0.1"].includes(url.hostname)) {
    throw new Error("Stage 3 PostgreSQL verification requires a localhost PostgreSQL administrative database.");
  }
  return url;
}

function validationDatabaseName(kind: "fresh" | "upgrade"): string {
  return `cwt_stage3_${kind}_${process.pid}_${randomUUID().replaceAll("-", "")}`;
}

function databaseUrl(adminUrl: URL, databaseName: string): string {
  const url = new URL(adminUrl);
  url.pathname = `/${databaseName}`;
  return url.toString();
}

async function migrationFolderThrough(maxIndex: number): Promise<string> {
  const folder = await mkdtemp(join(tmpdir(), `cwt-stage3-migrations-${maxIndex}-`));
  const meta = join(folder, "meta");
  await mkdir(meta);
  const journal = JSON.parse(await readFile("drizzle/meta/_journal.json", "utf8")) as Journal;
  const entries = journal.entries.filter((entry) => entry.idx <= maxIndex);
  for (const entry of entries) await copyFile(`drizzle/${entry.tag}.sql`, join(folder, `${entry.tag}.sql`));
  await writeFile(join(meta, "_journal.json"), JSON.stringify({ ...journal, entries }));
  return folder;
}

async function verifyRepresentativeUpgrade(admin: Sql, adminUrl: URL): Promise<void> {
  const name = validationDatabaseName("upgrade");
  await admin.unsafe(`create database "${name}"`);
  const url = databaseUrl(adminUrl, name);
  const migrationClient = postgres(url, { max: 1, prepare: false });
  const inspect = postgres(url, { max: 1, prepare: false });
  const legacyFolder = await migrationFolderThrough(18);
  try {
    await migratePostgresWithEnumCompatibility(migrationClient, legacyFolder);
    const [before] = await inspect<{ count: number; latest: number }[]>`
      select count(*)::int as count, max(id)::int as latest from drizzle.__drizzle_migrations
    `;
    assert.ok(before?.count === 19 && before.latest === 19, "Representative 0018 baseline migration did not stop at 0018.");
    await migratePostgresWithEnumCompatibility(migrationClient, "drizzle");
    const [after] = await inspect<{ count: number; latest: number }[]>`
      select count(*)::int as count, max(id)::int as latest from drizzle.__drizzle_migrations
    `;
    assert.ok(after?.count === 20 && after.latest === 20, "Representative 0018→0019 upgrade did not apply exactly one migration.");
    const [tables] = await inspect<{ count: number }[]>`
      select count(*)::int as count from information_schema.tables
      where table_schema = 'public' and table_name in ('product_import_batches', 'product_import_items')
    `;
    assert.ok(tables?.count === 2, "Representative 0018→0019 upgrade did not create exactly the two Import tables.");
  } finally {
    await rm(legacyFolder, { recursive: true, force: true });
    await migrationClient.end();
    await inspect.end();
    await admin.unsafe(`drop database if exists "${name}"`);
  }
}

async function workbook(productCode: string, summary: string): Promise<Uint8Array> {
  const row = Array(PRODUCT_IMPORT_HEADERS.length).fill("");
  row[0] = `Synthetic ${productCode}`;
  row[1] = productCode;
  row[2] = "Synthetic Stage 3 Category";
  row[13] = summary;
  const file = writeExcelFile([
    { sheet: "Products", data: [[...PRODUCT_IMPORT_HEADERS], row] },
    { sheet: "_CWT_META", data: [["contract", PRODUCT_IMPORT_TEMPLATE_NAME], ["version", 1]] },
  ]);
  return new Uint8Array(await file.toBuffer());
}

async function main(): Promise<void> {
  const adminUrl = validationAdminUrl();
  const admin = postgres(adminUrl.toString(), { max: 1, prepare: false });
  await verifyRepresentativeUpgrade(admin, adminUrl);
  const databaseName = validationDatabaseName("fresh");
  await admin.unsafe(`create database "${databaseName}"`);
  const url = databaseUrl(adminUrl, databaseName);
  const migrationClient = postgres(url, { max: 1, prepare: false });
  const raw = postgres(url, { max: 6, prepare: false });
  const db = drizzle(raw, { schema });
  const storage = new InMemoryObjectStorage();
  try {
    await migratePostgresWithEnumCompatibility(migrationClient, "drizzle");
    await migratePostgresWithEnumCompatibility(migrationClient, "drizzle");
    const [user] = await db.insert(users).values({
      email: "stage3-postgres-importer@example.test",
      displayName: "Synthetic Stage 3 PostgreSQL Importer",
      role: "product_editor",
      passwordHash: "test",
    }).returning({ id: users.id, role: users.role });
    assert.ok(user);
    const [session] = await db.insert(authSessions).values({
      userId: user.id,
      tokenHash: "synthetic-stage3-postgres-session",
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    }).returning({ id: authSessions.id });
    assert.ok(session);
    await db.insert(featureFlags).values({
      key: "product_import",
      enabled: true,
      updatedByUserId: user.id,
    }).onConflictDoUpdate({ target: featureFlags.key, set: { enabled: true, updatedByUserId: user.id } });
    const [taxonomy] = await db.insert(taxonomyTerms).values({
      internalKey: "synthetic-stage3-postgres",
      dimension: "structure_construction",
      productCodePrefix: "TEST",
    }).returning({ id: taxonomyTerms.id });
    assert.ok(taxonomy);
    await db.insert(taxonomyTermLocalizations).values({
      taxonomyTermId: taxonomy.id,
      locale: "en",
      name: "Synthetic Stage 3 Category",
    });
    const actor = { userId: user.id, role: user.role, authSessionId: session.id } satisfies AdminUploadActor;
    const imageBytes = new Uint8Array(await sharp({
      create: { width: 48, height: 36, channels: 3, background: "teal" },
    }).jpeg().toBuffer());
    const imageUpload = await createAdminUploadBatch(db, actor, {
      files: [{ fileName: "synthetic-stage3-image.jpg", declaredMimeType: "image/jpeg", declaredByteSize: imageBytes.byteLength }],
      category: "product", role: "gallery", sortOrder: 0, associationType: null, associationEntityId: null,
      sourceDeclarationEnabled: false,
    }, { rateLimiter: allowLimiter });
    const imageAssetId = await completeAdminUploadIntent(
      db,
      storage,
      new DevelopmentFileScanner(),
      actor,
      { token: imageUpload.intents[0]!.token, bytes: imageBytes },
      { rateLimiter: allowLimiter },
    );
    await finalizeAdminUploadBatch(db, storage, actor, imageUpload.batchId, { rateLimiter: allowLimiter });

    const prepareBatch = async (code: string, summary: string) => {
      const bytes = await workbook(code, summary);
      const upload = await createAdminUploadBatch(db, actor, {
        files: [{ fileName: "CWT-Product-Import-Template-V1.xlsx", declaredMimeType: IMPORT_WORKBOOK_MIME, declaredByteSize: bytes.byteLength }],
        category: "other", role: "document", sortOrder: 0, associationType: null, associationEntityId: null,
        sourceDeclarationEnabled: false,
      }, { rateLimiter: allowLimiter });
      const workbookAssetId = await completeAdminUploadIntent(
        db,
        storage,
        new DevelopmentFileScanner(),
        actor,
        { token: upload.intents[0]!.token, bytes },
        { rateLimiter: allowLimiter },
      );
      await finalizeAdminUploadBatch(db, storage, actor, upload.batchId, { rateLimiter: allowLimiter });
      const command = {
        mode: "create" as const,
        workbookAssetId,
        media: [{
          assetId: imageAssetId,
          uploadBatchId: imageUpload.batchId,
          relativePath: `${code}-01.jpg`,
          sha256: createHash("sha256").update(imageBytes).digest("hex"),
        }],
      };
      return command;
    };
    const createBatch = async (code: string, summary: string) => {
      const command = await prepareBatch(code, summary);
      return { command, batchId: await createValidatedProductImport(db, storage, actor, command) };
    };

    const atomic = await createBatch("CWT-TEST-001", "Synthetic required Audit rollback row.");
    await raw.unsafe(`
      create function cwt_stage3_fail_item_audit() returns trigger language plpgsql as $$
      begin
        if new.action = 'product_import.item_applied' then
          raise exception 'synthetic required audit failure';
        end if;
        return new;
      end $$;
      create trigger cwt_stage3_fail_item_audit before insert on audit_logs
      for each row execute function cwt_stage3_fail_item_audit();
    `);
    await applyProductImportBatch(db, actor, atomic.batchId);
    assert.equal(Number((await db.select({ value: count() }).from(products).where(eq(products.productCode, "CWT-TEST-001")))[0]?.value), 0);
    const [failedItem] = await db.select().from(productImportItems).where(and(
      eq(productImportItems.batchId, atomic.batchId),
      eq(productImportItems.kind, "row"),
    ));
    assert.equal(failedItem?.status, "error");
    assert.equal(failedItem?.errorCode, "row_apply_failed");
    await raw.unsafe("drop trigger cwt_stage3_fail_item_audit on audit_logs; drop function cwt_stage3_fail_item_audit();");
    await retryProductImportErrors(db, actor, atomic.batchId);
    await applyProductImportBatch(db, actor, atomic.batchId);
    await applyProductImportBatch(db, actor, atomic.batchId);
    assert.equal(Number((await db.select({ value: count() }).from(products).where(eq(products.productCode, "CWT-TEST-001")))[0]?.value), 1);

    const fingerprintCommand = await prepareBatch("CWT-TEST-002", "Synthetic concurrent fingerprint row.");
    const sameFingerprint = await Promise.all([
      createValidatedProductImport(db, storage, actor, fingerprintCommand),
      createValidatedProductImport(db, storage, actor, fingerprintCommand),
    ]);
    const fingerprintBatchId = sameFingerprint[0]!;
    assert.deepEqual([...new Set(sameFingerprint)], [fingerprintBatchId]);
    await Promise.all([
      applyProductImportBatch(db, actor, fingerprintBatchId),
      applyProductImportBatch(db, actor, fingerprintBatchId),
    ]);
    assert.equal(Number((await db.select({ value: count() }).from(products).where(eq(products.productCode, "CWT-TEST-002")))[0]?.value), 1);
    const [concurrentProduct] = await db.select({ id: products.id }).from(products).where(eq(products.productCode, "CWT-TEST-002"));
    assert.ok(concurrentProduct);
    const [concurrentRelations] = await db.select({ value: count() }).from(productAssets).where(eq(productAssets.productId, concurrentProduct.id));
    assert.equal(Number(concurrentRelations?.value), 1, "Concurrent Apply duplicated the Product-Asset relation.");

    const contentionA = await createBatch("CWT-TEST-003", "Synthetic Product Code contender A.");
    const contentionB = await createBatch("CWT-TEST-003", "Synthetic Product Code contender B.");
    await Promise.all([
      applyProductImportBatch(db, actor, contentionA.batchId),
      applyProductImportBatch(db, actor, contentionB.batchId),
    ]);
    assert.equal(Number((await db.select({ value: count() }).from(products).where(eq(products.productCode, "CWT-TEST-003")))[0]?.value), 1);
    const contentionItems = await db.select({ status: productImportItems.status }).from(productImportItems).where(and(
      inArray(productImportItems.batchId, [contentionA.batchId, contentionB.batchId]),
      eq(productImportItems.kind, "row"),
    ));
    assert.deepEqual(contentionItems.map((item) => item.status).sort(), ["applied", "error"]);

    const archiveImageA = new Uint8Array(await sharp({
      create: { width: 32, height: 24, channels: 3, background: "teal" },
    }).webp().toBuffer());
    const archiveImageB = new Uint8Array(await sharp({
      create: { width: 24, height: 32, channels: 3, background: "navy" },
    }).avif().toBuffer());
    const archiveBytes = await archive([
      { name: "CWT-ARCH-001/CWT-ARCH-001-01.webp", bytes: archiveImageA },
      { name: "CWT-ARCH-001/CWT-ARCH-001-detail-01.avif", bytes: archiveImageB },
    ]);
    const archiveUpload = await createAdminUploadBatch(db, actor, {
      files: [{ fileName: "synthetic-stage3-images.zip", declaredMimeType: IMPORT_ARCHIVE_MIME, declaredByteSize: archiveBytes.byteLength }],
      category: "other", role: "document", sortOrder: 0, associationType: null, associationEntityId: null,
      sourceDeclarationEnabled: false,
    }, { rateLimiter: allowLimiter });
    const archiveCompleted = await completeAdminImportArchiveIntent(
      db, storage, new DevelopmentFileScanner(), actor,
      { token: archiveUpload.intents[0]!.token, stream: stream(archiveBytes) },
      { rateLimiter: allowLimiter },
    );
    const [archiveVariantsBeforeReplay] = await db.select({ value: count() }).from(assetVariants).where(inArray(
      assetVariants.sourceAssetId,
      archiveCompleted.media.map((item) => item.assetId),
    ));
    const replayedArchive = await completeAdminImportArchiveIntent(
      db, storage, new DevelopmentFileScanner(), actor,
      { token: archiveUpload.intents[0]!.token, stream: stream(archiveBytes) },
      { rateLimiter: allowLimiter },
    );
    assert.deepEqual(replayedArchive, archiveCompleted, "Same-token response-loss replay did not return the same durable archive result.");
    const [archiveVariantsAfterReplay] = await db.select({ value: count() }).from(assetVariants).where(inArray(
      assetVariants.sourceAssetId,
      archiveCompleted.media.map((item) => item.assetId),
    ));
    assert.equal(Number(archiveVariantsAfterReplay?.value), Number(archiveVariantsBeforeReplay?.value), "Same-token replay duplicated Variant records.");
    await finalizeAdminUploadBatch(db, storage, actor, archiveUpload.batchId, { rateLimiter: allowLimiter });
    const [bindingEvidence] = await raw<{ count: number; declarations: number }[]>`
      select
        count(*)::int as count,
        count(*) filter (where source_declaration_enabled = false)::int as declarations
      from asset_upload_batches
      where declaration_input->'importMediaBinding'->>'packageAssetId' = ${archiveCompleted.packageAssetId}
    `;
    assert.ok(bindingEvidence?.count === 2 && bindingEvidence.declarations === 2, "Exact JSONB Import-media binding lookup did not preserve two declaration-off bindings.");
    const [archivePackage] = await db.select().from(assets).where(eq(assets.id, archiveCompleted.packageAssetId));
    assert.ok(archivePackage?.storagePartition === "imports" && archivePackage.access === "internal", "Archive package crossed the Internal Import boundary.");
    const archivePublicAssets = await db.select().from(assets).where(and(
      eq(assets.uploadedByUserId, actor.userId),
      eq(assets.storagePartition, "public"),
    ));
    assert.ok(archivePublicAssets.length >= 3, "Archive media did not converge through the existing Public Finalize authority.");

    const crashImageA = new Uint8Array(await sharp({
      create: { width: 20, height: 20, channels: 3, background: "orange" },
    }).webp().toBuffer());
    const crashImageB = new Uint8Array(await sharp({
      create: { width: 20, height: 20, channels: 3, background: "purple" },
    }).webp().toBuffer());
    const crashBytes = await archive([
      { name: "CWT-CRASH-001/CWT-CRASH-001-01.webp", bytes: crashImageA },
      { name: "CWT-CRASH-001/CWT-CRASH-001-02.webp", bytes: crashImageB },
    ]);
    const crashUpload = await createAdminUploadBatch(db, actor, {
      files: [{ fileName: "synthetic-stage3-crash.zip", declaredMimeType: IMPORT_ARCHIVE_MIME, declaredByteSize: crashBytes.byteLength }],
      category: "other", role: "document", sortOrder: 0, associationType: null, associationEntityId: null,
      sourceDeclarationEnabled: false,
    }, { rateLimiter: allowLimiter });
    const crashStartedAt = new Date();
    let crashInjected = false;
    await assert.rejects(() => completeAdminImportArchiveIntent(
      db, storage, new DevelopmentFileScanner(), actor,
      { token: crashUpload.intents[0]!.token, stream: stream(crashBytes) },
      {
        rateLimiter: allowLimiter, now: crashStartedAt, leaseMilliseconds: 10_000,
        faultInjector(point) {
          if (point === "after_import_archive_first_media" && !crashInjected) {
            crashInjected = true;
            throw new Error("synthetic Stage 3 archive interruption");
          }
        },
      },
    ), /interruption/);
    await assert.rejects(() => completeAdminImportArchiveIntent(
      db, storage, new DevelopmentFileScanner(), actor,
      { token: crashUpload.intents[0]!.token, stream: stream(crashBytes) },
      { rateLimiter: allowLimiter, now: new Date(crashStartedAt.getTime() + 1_000), leaseMilliseconds: 10_000 },
    ), /not safely reclaimable/);
    const recovered = await processPendingUploadRecoveryJobs(db, storage, {
      now: new Date(crashStartedAt.getTime() + 30_000), workerId: "stage3-postgres-expired-import-lease",
      auditWriter: async () => randomUUID(),
    });
    assert.deepEqual(recovered, { attempted: 1, completed: 1 }, "Expired Import Recovery lease was not reclaimed exactly once.");
    const publicBeforeResume = await db.select({ value: count() }).from(assets).where(and(
      eq(assets.uploadedByUserId, actor.userId), eq(assets.storagePartition, "public"),
    ));
    const resumedArchive = await completeAdminImportArchiveIntent(
      db, storage, new DevelopmentFileScanner(), actor,
      { token: crashUpload.intents[0]!.token, stream: stream(crashBytes) },
      { rateLimiter: allowLimiter, now: new Date(crashStartedAt.getTime() + 30_001), leaseMilliseconds: 10_000 },
    );
    assert.ok(resumedArchive.media.length === 2 && new Set(resumedArchive.media.map((item) => item.assetId)).size === 2, "Recovered archive did not preserve its two durable child Asset identities.");
    const publicAfterResume = await db.select({ value: count() }).from(assets).where(and(
      eq(assets.uploadedByUserId, actor.userId), eq(assets.storagePartition, "public"),
    ));
    assert.ok(Number(publicAfterResume[0]?.value) === Number(publicBeforeResume[0]?.value) + 1, "Archive recovery duplicated a previously finalized child Asset.");

    const expiryBytes = await archive([{ name: "CWT-EXPIRE-001/CWT-EXPIRE-001-01.webp", bytes: crashImageA }]);
    const expiryUpload = await createAdminUploadBatch(db, actor, {
      files: [{ fileName: "synthetic-stage3-expiry.zip", declaredMimeType: IMPORT_ARCHIVE_MIME, declaredByteSize: expiryBytes.byteLength }],
      category: "other", role: "document", sortOrder: 0, associationType: null, associationEntityId: null,
      sourceDeclarationEnabled: false,
    }, { rateLimiter: allowLimiter });
    await assert.rejects(() => completeAdminImportArchiveIntent(
      db, storage, { scan: async () => ({ clean: false, provider: "synthetic", reference: "stage3-storage-interruption" }) }, actor,
      { token: expiryUpload.intents[0]!.token, stream: stream(expiryBytes) }, { rateLimiter: allowLimiter },
    ), /malware/);
    const [expiryRecovery] = await db.select().from(uploadRecoveryJobs).where(eq(uploadRecoveryJobs.uploadBatchId, expiryUpload.batchId));
    const [expiryAsset] = await db.select().from(assets).where(eq(assets.uploadBatchId, expiryUpload.batchId));
    assert.ok(expiryRecovery && expiryAsset, "Interrupted Import archive did not retain durable recovery evidence.");
    const expired = await processPendingUploadRecoveryJobs(db, storage, {
      now: new Date(expiryRecovery.expiresAt.getTime() + 1), workerId: "stage3-postgres-import-expiry",
    });
    assert.deepEqual(expired, { attempted: 1, completed: 1 }, "Import cleanup/expiry did not converge through Recovery.");
    assert.ok(await storage.exists("imports", expiryAsset.objectKey) === false, "Expired Import storage object was not cleaned up.");
    const [expiryCleanup] = await db.select().from(objectCleanupJobs).where(eq(objectCleanupJobs.uploadBatchId, expiryUpload.batchId));
    const [deletedExpiryAsset] = await db.select().from(assets).where(eq(assets.id, expiryAsset.id));
    assert.ok(expiryCleanup?.status === "completed" && deletedExpiryAsset?.status === "deleted", "Expired Import cleanup did not record a durable deleted result.");

    const [migrationState] = await raw<{ count: number; latest: number }[]>`
      select count(*)::int as count, max(id)::int as latest from drizzle.__drizzle_migrations
    `;
    const [catalog] = await raw<{ tables: number; constraints: number; foreignKeys: number; indexes: number }[]>`
      select
        (select count(*)::int from information_schema.tables where table_schema='public' and table_name in ('product_import_batches','product_import_items')) as tables,
        (select count(*)::int from pg_constraint where conrelid in ('product_import_batches'::regclass,'product_import_items'::regclass)) as constraints,
        (select count(*)::int from pg_constraint where conrelid in ('product_import_batches'::regclass,'product_import_items'::regclass) and contype='f') as "foreignKeys",
        (select count(*)::int from pg_indexes where schemaname='public' and tablename in ('product_import_batches','product_import_items')) as indexes
    `;
    const [activity] = await raw<{ idle_in_transaction: number; waiting: number }[]>`
      select count(*) filter (where state='idle in transaction')::int as idle_in_transaction,
             count(*) filter (where wait_event_type='Lock')::int as waiting
      from pg_stat_activity where datname=current_database() and pid<>pg_backend_pid()
    `;
    const [advisory] = await raw<{ count: number }[]>`select count(*)::int as count from pg_locks where locktype='advisory'`;
    assert.deepEqual(migrationState, { count: 20, latest: 20 });
    assert.deepEqual(catalog, { tables: 2, constraints: 45, foreignKeys: 9, indexes: 8 });
    assert.equal(activity?.idle_in_transaction, 0);
    assert.equal(activity?.waiting, 0);
    assert.equal(advisory?.count, 0);
    process.stdout.write(`${JSON.stringify({
      status: "passed",
      postgres: (await raw<{ version: string }[]>`select version() as version`)[0]?.version,
      migrations: migrationState,
      catalog,
      requiredAuditRollback: { productCountBeforeRetry: 0, finalProductCount: 1 },
      concurrentFingerprint: { batchIds: [...new Set(sameFingerprint)] },
      concurrentApply: { productCount: 1, productAssetRelations: Number(concurrentRelations?.value) },
      productCodeContention: { productCount: 1, itemStatuses: contentionItems.map((item) => item.status).sort() },
      archive: {
        sameTokenReplay: "same durable package and child Asset result",
        jsonbBindings: bindingEvidence,
        activeLeaseRejected: true,
        expiredLeaseRecovered: recovered,
        noDuplicateChildAssets: true,
        noDuplicateVariants: Number(archiveVariantsAfterReplay?.value),
        cleanupExpiry: expired,
      },
      locks: { ...activity, advisory: advisory?.count ?? null },
    }, null, 2)}\n`);
  } finally {
    await migrationClient.end();
    await raw.end();
    await admin.unsafe(`drop database if exists "${databaseName}"`);
    await admin.end();
  }
}

void main();
