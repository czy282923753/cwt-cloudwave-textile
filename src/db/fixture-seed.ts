import { eq } from "drizzle-orm";
import type { PgQueryResultHKT } from "drizzle-orm/pg-core/session";
import sharp from "sharp";

import {
  applicationLocalizations,
  applications,
  productApplications,
  productAssets,
  productLocalizations,
  products,
  productTaxonomyTerms,
  routes,
  seoMetadata,
  taxonomyTermLocalizations,
  taxonomyTerms,
} from "./schema";
import type { AppDatabase } from "./types";
import type { ObjectStorage } from "@/storage";
import type { FileScanner } from "@/uploads/scanner";
import { uploadAsset } from "@/uploads/service";

const fixtureProducts = Array.from({ length: 12 }, (_, index) => ({
  code: `FIXTURE-${String(index + 1).padStart(2, "0")}`,
  name: `TEST FIXTURE Fabric Sample ${String(index + 1).padStart(2, "0")} — Not a Real Product`,
  slug: `test-fixture-fabric-${String(index + 1).padStart(2, "0")}`,
}));

async function ensureTaxonomy<TQueryResult extends PgQueryResultHKT>(
  db: AppDatabase<TQueryResult>,
  internalKey: string,
  name: string,
  dimension: "material_fiber" | "structure_construction",
): Promise<string> {
  const existing = await db
    .select({ id: taxonomyTerms.id })
    .from(taxonomyTerms)
    .where(eq(taxonomyTerms.internalKey, internalKey))
    .limit(1);
  let id = existing[0]?.id;
  if (!id) {
    const rows = await db
      .insert(taxonomyTerms)
      .values({ internalKey, dimension })
      .returning({ id: taxonomyTerms.id });
    id = rows[0]?.id;
  }
  if (!id) throw new Error("Unable to seed taxonomy fixture.");
  await db
    .insert(taxonomyTermLocalizations)
    .values({ taxonomyTermId: id, locale: "en", name })
    .onConflictDoUpdate({
      target: [
        taxonomyTermLocalizations.taxonomyTermId,
        taxonomyTermLocalizations.locale,
      ],
      set: { name },
    });
  return id;
}

async function ensureApplication<TQueryResult extends PgQueryResultHKT>(
  db: AppDatabase<TQueryResult>,
): Promise<string> {
  const existing = await db
    .select({ id: applications.id })
    .from(applications)
    .where(eq(applications.internalKey, "sportswear"))
    .limit(1);
  let id = existing[0]?.id;
  if (!id) {
    const rows = await db
      .insert(applications)
      .values({ internalKey: "sportswear", status: "published" })
      .returning({ id: applications.id });
    id = rows[0]?.id;
  }
  if (!id) throw new Error("Unable to seed application fixture.");
  await db
    .insert(applicationLocalizations)
    .values({ applicationId: id, locale: "en", name: "Sportswear" })
    .onConflictDoUpdate({
      target: [applicationLocalizations.applicationId, applicationLocalizations.locale],
      set: { name: "Sportswear" },
    });
  return id;
}

async function createFixtureImage(index: number): Promise<Uint8Array> {
  return sharp({
    create: {
      width: 1200,
      height: 900,
      channels: 3,
      background: {
        r: 20 + index * 10,
        g: 60 + index * 6,
        b: 110 + index * 5,
      },
    },
  })
    .jpeg({ quality: 82 })
    .toBuffer();
}

export async function seedFixtureProducts<TQueryResult extends PgQueryResultHKT>(
  db: AppDatabase<TQueryResult>,
  storage: ObjectStorage,
  scanner: FileScanner,
  adminUserId: string,
): Promise<number> {
  const materialId = await ensureTaxonomy(
    db,
    "fixture-polyester",
    "TEST FIXTURE Polyester",
    "material_fiber",
  );
  const structureId = await ensureTaxonomy(
    db,
    "fixture-mesh",
    "TEST FIXTURE Mesh",
    "structure_construction",
  );
  const applicationId = await ensureApplication(db);
  let created = 0;

  for (const [index, fixture] of fixtureProducts.entries()) {
    const existing = await db
      .select({ id: products.id })
      .from(products)
      .where(eq(products.productCode, fixture.code))
      .limit(1);
    if (existing[0]) continue;

    const assetId = await uploadAsset(db, storage, scanner, {
      fileName: `${fixture.slug}.jpg`,
      declaredMimeType: "image/jpeg",
      bytes: await createFixtureImage(index),
      category: "product",
      purpose: "public_asset",
      uploadedByUserId: adminUserId,
      sourceDeclarationEnabled: false,
    });
    const inserted = await db
      .insert(products)
      .values({
        primaryTaxonomyTermId: materialId,
        productCode: fixture.code,
        status: "published",
        createdByUserId: adminUserId,
        reviewedByUserId: adminUserId,
        reviewedAt: new Date(),
        publishedAt: new Date(),
      })
      .returning({ id: products.id });
    const productId = inserted[0]?.id;
    if (!productId) throw new Error("Unable to seed fixture product.");

    await db.insert(productLocalizations).values({
      productId,
      locale: "en",
      name: fixture.name,
      shortDescription:
        "Synthetic fixture data used only to validate the CWT Phase 1A workflow.",
    });
    await db.insert(productTaxonomyTerms).values([
      { productId, taxonomyTermId: materialId, isPrimary: true },
      { productId, taxonomyTermId: structureId, isPrimary: false },
    ]);
    await db.insert(productApplications).values({ productId, applicationId });
    await db.insert(productAssets).values({
      productId,
      assetId,
      role: "hero",
      sortOrder: 0,
    });
    const routeRows = await db
      .insert(routes)
      .values({
        locale: "en",
        path: `/products/${fixture.slug}`,
        entityType: "product",
        entityId: productId,
      })
      .returning({ id: routes.id });
    const routeId = routeRows[0]?.id;
    if (!routeId) throw new Error("Unable to seed fixture product route.");
    await db.insert(seoMetadata).values({
      routeId,
      title: `${fixture.name} | CloudWave Textile`,
      metaDescription: "Noindex test fixture for local Phase 1A validation.",
      indexStatus: "noindex",
      canonicalPath: `/products/${fixture.slug}`,
    });
    created += 1;
  }

  return created;
}
