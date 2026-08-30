import { strict as assert } from "node:assert";

import { and, eq } from "drizzle-orm";
import postgres from "postgres";
import sharp from "sharp";

import { databaseConnection } from "../src/db/client";
import { migrateDatabase } from "../src/db/migrate";
import {
  assetUploadBatches,
  assets,
  assetVariants,
  auditLogs,
  authSessions,
  finalizeObjectManifestItems,
  objectCleanupJobs,
  productAssets,
  productLocalizations,
  products,
  productTaxonomyTerms,
  routes,
  seoMetadata,
  taxonomyTerms,
  uploadRecoveryJobs,
  users,
} from "../src/db/schema";
import { queryPublishedProducts } from "../src/public-site/data";
import {
  GOVERNED_PUBLIC_ASSET_CACHE_CONTROL,
  serveGovernedPublicAsset,
} from "../src/public-site/public-asset-response";
import { InMemoryObjectStorage } from "../src/test/in-memory-storage";
import {
  completeAdminUploadIntent,
  createAdminUploadBatch,
  finalizeAdminUploadBatch,
} from "../src/uploads/admin-upload-service";
import { DevelopmentFileScanner } from "../src/uploads/scanner";

async function main(): Promise<void> {
  if (
    databaseConnection.kind !== "postgres" ||
    process.env.APP_ENV === "production" ||
    process.env.CWT_POSTGRES_VALIDATION !== "seo-rr1-isolated"
  ) {
    throw new Error("SEO RR1 verification requires an isolated non-production PostgreSQL database.");
  }
  const raw = postgres(process.env.DATABASE_URL!, { max: 2, prepare: false });
  const storage = new InMemoryObjectStorage();
  try {
    await migrateDatabase(databaseConnection);
    await migrateDatabase(databaseConnection);
    const [admin] = await databaseConnection.db.insert(users).values({
      email: "seo-rr1-postgres-admin@example.test",
      displayName: "TEST SEO RR1 PostgreSQL Admin",
      role: "admin",
      passwordHash: "test",
    }).returning({ id: users.id, role: users.role });
    assert(admin);
    const [session] = await databaseConnection.db.insert(authSessions).values({
      userId: admin.id,
      tokenHash: "seo-rr1-postgres-session",
      expiresAt: new Date(Date.now() + 60_000),
    }).returning({ id: authSessions.id });
    const [taxonomy] = await databaseConnection.db.insert(taxonomyTerms).values({
      internalKey: "seo-rr1-postgres-taxonomy",
      dimension: "material_fiber",
    }).returning({ id: taxonomyTerms.id });
    assert(session && taxonomy);
    const product = await databaseConnection.db.transaction(async (transaction) => {
      const [created] = await transaction.insert(products).values({
        status: "draft",
        createdByUserId: admin.id,
      }).returning({ id: products.id });
      assert(created);
      await transaction.insert(productTaxonomyTerms).values({
        productId: created.id,
        taxonomyTermId: taxonomy.id,
        isPrimary: true,
      });
      return created;
    });
    await databaseConnection.db.insert(productLocalizations).values({
      productId: product.id,
      locale: "en",
      name: "TEST SEO RR1 PostgreSQL Responsive Product",
    });
    const [route] = await databaseConnection.db.insert(routes).values({
      entityType: "product",
      entityId: product.id,
      locale: "en",
      path: "/products/test-seo-rr1-postgres-responsive/",
    }).returning({ id: routes.id });
    assert(route);
    await databaseConnection.db.insert(seoMetadata).values({
      routeId: route.id,
      indexStatus: "noindex",
    });

    const sourceBytes = new Uint8Array(await sharp({
      create: {
        width: 1200,
        height: 800,
        channels: 3,
        background: { r: 24, g: 98, b: 80 },
      },
    }).jpeg({ quality: 86 }).toBuffer());
    const actor = {
      userId: admin.id,
      role: admin.role,
      authSessionId: session.id,
    };
    const batch = await createAdminUploadBatch(databaseConnection.db, actor, {
      files: [{
        fileName: "TEST-seo-rr1-postgres-responsive.jpg",
        declaredMimeType: "image/jpeg",
        declaredByteSize: sourceBytes.byteLength,
      }],
      category: "product",
      role: "hero",
      sortOrder: 0,
      associationType: "product",
      associationEntityId: product.id,
      sourceDeclarationEnabled: false,
    }, {
      rateLimiter: {
        consume: async () => ({ kind: "allowed", remaining: 29, retryAfterMs: 60_000 }),
      },
    });
    const assetId = await completeAdminUploadIntent(
      databaseConnection.db,
      storage,
      new DevelopmentFileScanner(),
      actor,
      { token: batch.intents[0]!.token, bytes: sourceBytes },
    );
    const finalized = await finalizeAdminUploadBatch(
      databaseConnection.db,
      storage,
      actor,
      batch.batchId,
    );
    assert.equal(finalized.success, true);
    await databaseConnection.db.update(productAssets).set({
      altText: "Synthetic PostgreSQL Admin-finalized responsive fabric",
    }).where(eq(productAssets.assetId, assetId));
    await databaseConnection.db.update(products).set({
      status: "published",
      realProductBasis: "physical_sample",
      realProductConfirmedByUserId: admin.id,
      realProductConfirmedAt: new Date(),
      publishedAt: new Date(),
    }).where(eq(products.id, product.id));

    const variants = await databaseConnection.db.select().from(assetVariants)
      .where(eq(assetVariants.sourceAssetId, assetId));
    assert.equal(variants.length, 6);
    for (const variant of variants) {
      assert.match(variant.variantKey, /^(480|960|1600)w-(webp|avif)$/);
      assert.equal(variant.variantKey.includes("."), false);
      assert.equal(
        variant.objectKey.endsWith(`.variants/${variant.variantKey}.${variant.format}`),
        true,
      );
      assert.equal(await storage.exists("public", variant.objectKey), true);
    }
    const [asset] = await databaseConnection.db.select().from(assets)
      .where(eq(assets.id, assetId));
    assert(asset);
    const [recovery] = await databaseConnection.db.select().from(uploadRecoveryJobs)
      .where(and(
        eq(uploadRecoveryJobs.uploadBatchId, batch.batchId),
        eq(uploadRecoveryJobs.kind, "finalize"),
      ));
    assert(recovery);
    assert.equal(recovery.status, "completed");
    assert.equal(recovery.stage, "completed");
    const manifest = await databaseConnection.db.select().from(finalizeObjectManifestItems)
      .where(eq(finalizeObjectManifestItems.recoveryJobId, recovery.id));
    assert.equal(manifest.length, 7);
    assert.equal(manifest.every((item) =>
      item.evidenceStatus === "verified" &&
      item.evidenceSource === "current_finalize_storage_verified" &&
      item.evidenceVerifiedAt !== null
    ), true);
    assert.equal((await databaseConnection.db.select().from(auditLogs).where(and(
      eq(auditLogs.action, "asset.finalize.storage_evidence_verified"),
      eq(auditLogs.entityId, batch.batchId),
    ))).length, 1);
    assert.equal((await databaseConnection.db.select().from(assetUploadBatches)
      .where(eq(assetUploadBatches.id, batch.batchId)))[0]?.status, "completed");
    const publicCleanup = await databaseConnection.db.select().from(objectCleanupJobs)
      .where(and(
        eq(objectCleanupJobs.uploadBatchId, batch.batchId),
        eq(objectCleanupJobs.storagePartition, "public"),
      ));
    assert.equal(publicCleanup.length, 7);
    assert.equal(publicCleanup.every((job) => job.status === "cancelled"), true);

    const [publicProduct] = await queryPublishedProducts(databaseConnection.db, {
      productIds: [product.id],
    });
    assert.equal(publicProduct?.image?.variants?.length, 6);
    const webp = publicProduct?.image?.variants?.find(
      (variant) => variant.format === "webp" && variant.width === 960,
    );
    assert(webp);
    const logicalKey = new URL(webp.url, "http://localhost").searchParams.get("variant");
    assert.equal(logicalKey, "960w-webp");
    const response = await serveGovernedPublicAsset(
      databaseConnection.db,
      storage,
      assetId,
      logicalKey!,
    );
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("content-type"), "image/webp");
    assert.equal(
      response.headers.get("cache-control"),
      GOVERNED_PUBLIC_ASSET_CACHE_CONTROL,
    );
    const delivered = new Uint8Array(await response.arrayBuffer());
    const metadata = await sharp(delivered).metadata();
    assert.equal(metadata.format, "webp");
    assert.equal(metadata.width, 960);

    const [migrationState] = await raw<{ count: number; latest: number }[]>`
      select count(*)::int as count, max(id)::int as latest
      from drizzle.__drizzle_migrations
    `;
    const [activity] = await raw<{ idle_in_transaction: number; waiting: number }[]>`
      select
        count(*) filter (where state = 'idle in transaction')::int as idle_in_transaction,
        count(*) filter (where wait_event_type = 'Lock')::int as waiting
      from pg_stat_activity
      where datname = current_database() and pid <> pg_backend_pid()
    `;
    const [advisory] = await raw<{ count: number }[]>`
      select count(*)::int as count from pg_locks where locktype = 'advisory'
    `;
    assert.equal(migrationState?.count, 19);
    assert.equal(activity?.idle_in_transaction, 0);
    assert.equal(activity?.waiting, 0);
    assert.equal(advisory?.count, 0);
    process.stdout.write(`${JSON.stringify({
      status: "passed",
      postgres: (await raw<{ version: string }[]>`select version() as version`)[0]?.version,
      migrations: migrationState,
      adminFinalize: {
        batch: batch.batchId,
        asset: asset.id,
        variants: variants.map((variant) => ({
          logicalKey: variant.variantKey,
          objectKey: variant.objectKey,
        })),
        manifestVerified: manifest.length,
        publicCompensationCancelled: publicCleanup.length,
      },
      delivery: {
        logicalKey,
        status: response.status,
        mime: response.headers.get("content-type"),
        width: metadata.width,
      },
      locks: { ...activity, advisory: advisory?.count ?? null },
    }, null, 2)}\n`);
  } finally {
    await raw.end();
    await databaseConnection.close();
  }
}

void main();
