import { and, eq } from "drizzle-orm";
import type { PgQueryResultHKT } from "drizzle-orm/pg-core/session";
import sharp from "sharp";

import {
  applicationLocalizations,
  applications,
  fabricLibraryEntries,
  fabricLibraryEntryAssets,
  fabricLibraryEntryLocalizations,
  fabricLibraryEntryProducts,
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

async function ensureFixtureRoute<TQueryResult extends PgQueryResultHKT>(
  db: AppDatabase<TQueryResult>,
  input: {
    entityType: "taxonomy" | "application" | "fabric_entry";
    entityId: string;
    path: string;
    title: string;
  },
): Promise<void> {
  const existing = await db
    .select({ id: routes.id })
    .from(routes)
    .where(
      and(
        eq(routes.entityType, input.entityType),
        eq(routes.entityId, input.entityId),
        eq(routes.locale, "en"),
        eq(routes.isCurrent, true),
      ),
    )
    .limit(1);
  const routeId = existing[0]?.id ?? (await db
    .insert(routes)
    .values({
      locale: "en",
      path: input.path,
      entityType: input.entityType,
      entityId: input.entityId,
    })
    .returning({ id: routes.id }))[0]?.id;
  if (!routeId) throw new Error("Unable to seed fixture route.");
  await db
    .insert(seoMetadata)
    .values({
      routeId,
      title: `${input.title} | CloudWave Textile`,
      metaDescription: "Noindex test fixture for local Phase 1A validation.",
      indexStatus: "noindex",
      canonicalPath: input.path,
    })
    .onConflictDoUpdate({
      target: seoMetadata.routeId,
      set: {
        title: `${input.title} | CloudWave Textile`,
        metaDescription: "Noindex test fixture for local Phase 1A validation.",
        indexStatus: "noindex",
        canonicalPath: input.path,
      },
    });
}

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
  await ensureFixtureRoute(db, {
    entityType: "taxonomy",
    entityId: id,
    path: `/fabric-types/${internalKey}/`,
    title: name,
  });
  return id;
}

async function ensureApplication<TQueryResult extends PgQueryResultHKT>(
  db: AppDatabase<TQueryResult>,
): Promise<string> {
  const existing = await db
    .select({ id: applications.id })
    .from(applications)
    .where(eq(applications.internalKey, "fixture-sportswear"))
    .limit(1);
  let id = existing[0]?.id;
  if (!id) {
    const rows = await db
      .insert(applications)
      .values({
        internalKey: "fixture-sportswear",
        status: "published",
        publishedAt: new Date(),
      })
      .returning({ id: applications.id });
    id = rows[0]?.id;
  }
  if (!id) throw new Error("Unable to seed application fixture.");
  await db
    .insert(applicationLocalizations)
    .values({
      applicationId: id,
      locale: "en",
      name: "TEST FIXTURE Sportswear",
      shortDescription: "Synthetic application fixture used only for local validation.",
    })
    .onConflictDoUpdate({
      target: [applicationLocalizations.applicationId, applicationLocalizations.locale],
      set: {
        name: "TEST FIXTURE Sportswear",
        shortDescription: "Synthetic application fixture used only for local validation.",
      },
    });
  await ensureFixtureRoute(db, {
    entityType: "application",
    entityId: id,
    path: "/applications/test-fixture-sportswear/",
    title: "TEST FIXTURE Sportswear",
  });
  return id;
}

async function ensureFabricLibraryFixture<TQueryResult extends PgQueryResultHKT>(
  db: AppDatabase<TQueryResult>,
  adminUserId: string,
): Promise<void> {
  const productRows = await db
    .select({ productId: products.id, assetId: productAssets.assetId })
    .from(products)
    .innerJoin(productAssets, eq(productAssets.productId, products.id))
    .where(eq(products.productCode, fixtureProducts[0]!.code))
    .limit(1);
  const product = productRows[0];
  if (!product) throw new Error("Fixture Product and Asset are required for Fabric Library fixture.");
  const path = "/fabric-library/test-fixture-entry/";
  const routeRows = await db
    .select({ entityId: routes.entityId })
    .from(routes)
    .where(eq(routes.path, path))
    .limit(1);
  let entryId = routeRows[0]?.entityId ?? null;
  if (!entryId) {
    entryId = (await db
      .insert(fabricLibraryEntries)
      .values({
        status: "published",
        createdByUserId: adminUserId,
        publishedAt: new Date(),
      })
      .returning({ id: fabricLibraryEntries.id }))[0]?.id ?? null;
  }
  if (!entryId) throw new Error("Unable to seed Fabric Library fixture.");
  await db
    .insert(fabricLibraryEntryLocalizations)
    .values({
      fabricEntryId: entryId,
      locale: "en",
      title: "TEST FIXTURE Fabric Library Entry",
      description: "Synthetic visual record used only for local Phase 1A validation.",
    })
    .onConflictDoUpdate({
      target: [
        fabricLibraryEntryLocalizations.fabricEntryId,
        fabricLibraryEntryLocalizations.locale,
      ],
      set: {
        title: "TEST FIXTURE Fabric Library Entry",
        description: "Synthetic visual record used only for local Phase 1A validation.",
      },
    });
  await db
    .insert(fabricLibraryEntryAssets)
    .values({ fabricEntryId: entryId, assetId: product.assetId, role: "hero" })
    .onConflictDoNothing();
  await db
    .insert(fabricLibraryEntryProducts)
    .values({ fabricEntryId: entryId, productId: product.productId })
    .onConflictDoNothing();
  await ensureFixtureRoute(db, {
    entityType: "fabric_entry",
    entityId: entryId,
    path,
    title: "TEST FIXTURE Fabric Library Entry",
  });
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
    if (existing[0]) {
      await db
        .update(products)
        .set({
          realProductBasis: "physical_sample",
          realProductEvidenceNote: "Synthetic fixture basis for workflow testing only.",
          realProductConfirmedByUserId: adminUserId,
          realProductConfirmedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(products.id, existing[0].id));
      await db
        .insert(productApplications)
        .values({ productId: existing[0].id, applicationId })
        .onConflictDoNothing();
      continue;
    }

    const assetId = await uploadAsset(db, storage, scanner, {
      fileName: `${fixture.slug}.jpg`,
      declaredMimeType: "image/jpeg",
      bytes: await createFixtureImage(index),
      category: "product",
      purpose: "public_asset",
      uploadedByUserId: adminUserId,
      sourceDeclarationEnabled: false,
    });
    await db.transaction(async (transaction) => {
      const inserted = await transaction
        .insert(products)
        .values({
          productCode: fixture.code,
          status: "published",
          realProductBasis: "physical_sample",
          realProductEvidenceNote: "Synthetic fixture basis for workflow testing only.",
          realProductConfirmedByUserId: adminUserId,
          realProductConfirmedAt: new Date(),
          createdByUserId: adminUserId,
          reviewedByUserId: adminUserId,
          reviewedAt: new Date(),
          publishedAt: new Date(),
        })
        .returning({ id: products.id });
      const productId = inserted[0]?.id;
      if (!productId) throw new Error("Unable to seed fixture product.");

      await transaction.insert(productLocalizations).values({
        productId,
        locale: "en",
        name: fixture.name,
        shortDescription:
          "Synthetic fixture data used only to validate the CWT Phase 1A workflow.",
      });
      await transaction.insert(productTaxonomyTerms).values([
        { productId, taxonomyTermId: materialId, isPrimary: true },
        { productId, taxonomyTermId: structureId, isPrimary: false },
      ]);
      await transaction.insert(productApplications).values({ productId, applicationId });
      await transaction.insert(productAssets).values({
        productId,
        assetId,
        role: "hero",
        sortOrder: 0,
      });
      const routeRows = await transaction
        .insert(routes)
        .values({
          locale: "en",
          path: `/products/${fixture.slug}/`,
          entityType: "product",
          entityId: productId,
        })
        .returning({ id: routes.id });
      const routeId = routeRows[0]?.id;
      if (!routeId) throw new Error("Unable to seed fixture product route.");
      await transaction.insert(seoMetadata).values({
        routeId,
        title: `${fixture.name} | CloudWave Textile`,
        metaDescription: "Noindex test fixture for local Phase 1A validation.",
        indexStatus: "noindex",
        canonicalPath: `/products/${fixture.slug}/`,
      });
    });
    created += 1;
  }

  await ensureFabricLibraryFixture(db, adminUserId);

  return created;
}
