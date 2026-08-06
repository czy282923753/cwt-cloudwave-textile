import { strict as assert } from "node:assert";
import { createHash } from "node:crypto";

import { and, count, eq, inArray } from "drizzle-orm";
import postgres from "postgres";
import sharp from "sharp";
import writeExcelFile from "write-excel-file/node";

import { databaseConnection } from "../src/db/client";
import { migrateDatabase } from "../src/db/migrate";
import {
  authSessions,
  featureFlags,
  productImportItems,
  products,
  taxonomyTermLocalizations,
  taxonomyTerms,
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
  createAdminUploadBatch,
  finalizeAdminUploadBatch,
  IMPORT_WORKBOOK_MIME,
  type AdminUploadActor,
} from "../src/uploads/admin-upload-service";
import { DevelopmentFileScanner } from "../src/uploads/scanner";

const allowLimiter = { consume: async () => true };

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
  if (
    databaseConnection.kind !== "postgres" ||
    process.env.APP_ENV === "production" ||
    process.env.CWT_POSTGRES_VALIDATION !== "stage3-isolated"
  ) {
    throw new Error("Stage 3 PostgreSQL verification requires an isolated non-production database.");
  }
  const db = databaseConnection.db;
  const raw = postgres(process.env.DATABASE_URL!, { max: 4, prepare: false });
  const storage = new InMemoryObjectStorage();
  try {
    await migrateDatabase(databaseConnection);
    await migrateDatabase(databaseConnection);
    const [user] = await db.insert(users).values({
      email: "stage3-postgres-importer@example.test",
      displayName: "Synthetic Stage 3 PostgreSQL Importer",
      role: "product_editor",
      passwordHash: "test",
    }).returning({ id: users.id, role: users.role });
    assert(user);
    const [session] = await db.insert(authSessions).values({
      userId: user.id,
      tokenHash: "synthetic-stage3-postgres-session",
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    }).returning({ id: authSessions.id });
    assert(session);
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
    assert(taxonomy);
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

    const [migrationState] = await raw<{ count: number; latest: number }[]>`
      select count(*)::int as count, max(id)::int as latest from drizzle.__drizzle_migrations
    `;
    const [catalog] = await raw<{ tables: number; constraints: number; indexes: number }[]>`
      select
        (select count(*)::int from information_schema.tables where table_schema='public' and table_name in ('product_import_batches','product_import_items')) as tables,
        (select count(*)::int from pg_constraint where conrelid in ('product_import_batches'::regclass,'product_import_items'::regclass)) as constraints,
        (select count(*)::int from pg_indexes where schemaname='public' and tablename in ('product_import_batches','product_import_items')) as indexes
    `;
    const [activity] = await raw<{ idle_in_transaction: number; waiting: number }[]>`
      select count(*) filter (where state='idle in transaction')::int as idle_in_transaction,
             count(*) filter (where wait_event_type='Lock')::int as waiting
      from pg_stat_activity where datname=current_database() and pid<>pg_backend_pid()
    `;
    const [advisory] = await raw<{ count: number }[]>`select count(*)::int as count from pg_locks where locktype='advisory'`;
    assert.deepEqual(migrationState, { count: 20, latest: 20 });
    assert.equal(catalog?.tables, 2);
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
      concurrentApply: { productCount: 1 },
      productCodeContention: { productCount: 1, itemStatuses: contentionItems.map((item) => item.status).sort() },
      locks: { ...activity, advisory: advisory?.count ?? null },
    }, null, 2)}\n`);
  } finally {
    await raw.end();
    await databaseConnection.close();
  }
}

void main();
