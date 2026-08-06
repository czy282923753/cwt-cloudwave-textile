import { strict as assert } from "node:assert";

import { inArray } from "drizzle-orm";
import postgres from "postgres";

import { databaseConnection } from "../src/db/client";
import { migrateDatabase } from "../src/db/migrate";
import {
  applicationLocalizations,
  applications,
  assets,
  productApplications,
  productAssets,
  productLocalizations,
  products,
  productTaxonomyTerms,
  routes,
  seoMetadata,
  taxonomyTerms,
  users,
} from "../src/db/schema";
import {
  queryApplications,
  queryProductsForApplication,
  queryProductsForTaxonomy,
  queryPublishedProductPage,
} from "../src/public-site/data";

async function main() {
  if (
    databaseConnection.kind !== "postgres" ||
    process.env.APP_ENV === "production" ||
    process.env.CWT_POSTGRES_VALIDATION !== "seo-remediation-isolated"
  ) {
    throw new Error("SEO PostgreSQL verification requires an isolated non-production PostgreSQL database.");
  }
  const raw = postgres(process.env.DATABASE_URL!, { max: 2, prepare: false });
  try {
    await migrateDatabase(databaseConnection);
    await migrateDatabase(databaseConnection);
    const [reviewer] = await databaseConnection.db.insert(users).values({
      email: "seo-postgres-reviewer@example.test",
      displayName: "TEST SEO PostgreSQL Reviewer",
      role: "reviewer_publisher",
      passwordHash: "test",
    }).returning({ id: users.id });
    const [taxonomy] = await databaseConnection.db.insert(taxonomyTerms).values({
      internalKey: "seo-postgres-primary",
      dimension: "material_fiber",
    }).returning({ id: taxonomyTerms.id });
    const [application] = await databaseConnection.db.insert(applications).values({
      internalKey: "seo-postgres-application",
      status: "published",
      publishedAt: new Date(),
    }).returning({ id: applications.id });
    const [image] = await databaseConnection.db.insert(assets).values({
      originalFileName: "seo-postgres.jpg",
      storageProvider: "test",
      storagePartition: "public",
      objectKey: "seo-postgres/eligible.jpg",
      access: "public",
      category: "product",
      status: "ready",
      scanStatus: "passed",
      declaredMimeType: "image/jpeg",
      detectedMimeType: "image/jpeg",
      byteSize: 100,
      sha256: "seo-postgres-eligible-image",
      altText: "TEST SEO PostgreSQL fabric",
    }).returning({ id: assets.id });
    assert(reviewer && taxonomy && application && image);
    await databaseConnection.db.insert(applicationLocalizations).values({
      applicationId: application.id,
      locale: "en",
      name: "TEST SEO PostgreSQL Application",
    });
    const [applicationRoute] = await databaseConnection.db.insert(routes).values({
      entityType: "application",
      entityId: application.id,
      locale: "en",
      path: "/applications/test-seo-postgres/",
    }).returning({ id: routes.id });
    assert(applicationRoute);
    await databaseConnection.db.insert(seoMetadata).values({
      routeId: applicationRoute.id,
      indexStatus: "index",
    });

    const productRows = await databaseConnection.db.transaction(async (transaction) => {
      const created = await transaction.insert(products).values(
        Array.from({ length: 101 }, (_, index) => ({
          status: "draft" as const,
          realProductBasis: "physical_sample" as const,
          realProductConfirmedByUserId: reviewer.id,
          realProductConfirmedAt: new Date("2026-08-01T00:00:00.000Z"),
          publishedAt: new Date(Date.UTC(2026, 7, 1, 0, index)),
        })),
      ).returning({ id: products.id });
      await transaction.insert(productTaxonomyTerms).values(created.map((product) => ({
        productId: product.id,
        taxonomyTermId: taxonomy.id,
        isPrimary: true,
      })));
      return created;
    });
    await databaseConnection.db.insert(productLocalizations).values(productRows.map((product, index) => ({
      productId: product.id,
      locale: "en",
      name: `TEST SEO PostgreSQL Product ${String(index + 1).padStart(3, "0")}`,
    })));
    const productRoutes = await databaseConnection.db.insert(routes).values(productRows.map((product, index) => ({
      entityType: "product" as const,
      entityId: product.id,
      locale: "en",
      path: `/products/test-seo-postgres-${String(index + 1).padStart(3, "0")}/`,
    }))).returning({ id: routes.id });
    await databaseConnection.db.insert(seoMetadata).values(productRoutes.map((route) => ({
      routeId: route.id,
      indexStatus: "noindex" as const,
    })));
    await databaseConnection.db.insert(productAssets).values(productRows.map((product) => ({
      productId: product.id,
      assetId: image.id,
      role: "hero" as const,
    })));
    await databaseConnection.db.insert(productApplications).values(productRows.map((product) => ({
      productId: product.id,
      applicationId: application.id,
    })));
    await databaseConnection.db.update(products).set({ status: "published" }).where(
      inArray(products.id, productRows.map((product) => product.id)),
    );

    const pageIds: string[] = [];
    for (let page = 1; page <= 5; page += 1) {
      const result = await queryPublishedProductPage(
        databaseConnection.db,
        page,
      ) as {
        items: Array<{ id: string }>;
        total: number;
        totalPages: number;
      } | null;
      assert(result);
      pageIds.push(...result.items.map((product) => product.id));
      assert.equal(result.total, 101);
      assert.equal(result.totalPages, 5);
    }
    assert.equal(pageIds.length, 101);
    assert.equal(new Set(pageIds).size, 101);
    assert.equal((await queryProductsForApplication(databaseConnection.db, application.id)).length, 101);
    assert.equal((await queryProductsForTaxonomy(databaseConnection.db, taxonomy.id)).length, 101);
    assert.equal((await queryApplications(databaseConnection.db, { requireEligibleProduct: true })).length, 1);

    await databaseConnection.db.update(products).set({ realProductBasis: null }).where(
      inArray(products.id, productRows.map((product) => product.id)),
    );
    const emptyPage = await queryPublishedProductPage(databaseConnection.db, 1);
    assert(emptyPage);
    assert.equal(emptyPage.total, 0);
    assert.equal(emptyPage.items.length, 0);
    assert.equal((await queryApplications(databaseConnection.db, { requireEligibleProduct: true })).length, 0);
    assert.equal((await queryApplications(databaseConnection.db, { path: "/applications/test-seo-postgres/" }))[0]?.hasEligibleProducts, false);

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
      products: { total: 101, unique: new Set(pageIds).size, pages: 5 },
      relations: { application: 101, taxonomy: 101 },
      eligibilityRevocation: { productTotal: 0, derivedApplicationList: 0 },
      locks: { ...activity, advisory: advisory?.count ?? null },
    }, null, 2)}\n`);
  } finally {
    await raw.end();
    await databaseConnection.close();
  }
}

void main();
