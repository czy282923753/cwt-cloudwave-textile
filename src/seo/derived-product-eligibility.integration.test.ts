import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import { setApplicationIndexStatus } from "@/catalog/application-service";
import { setFabricEntryIndexStatus } from "@/catalog/fabric-library-service";
import { setTaxonomyIndexStatus } from "@/catalog/taxonomy-service";
import {
  applicationLocalizations, applications, assets, fabricLibraryEntries,
  fabricLibraryEntryAssets, fabricLibraryEntryLocalizations, fabricLibraryEntryProducts,
  keywordPageMappings, productApplications, productAssets, productLocalizations,
  products, productTaxonomyTerms, routes, seoMetadata, taxonomyTermLocalizations,
  taxonomyTerms, users,
} from "@/db/schema";
import { verifyDatabaseReadiness } from "@/db/readiness";
import { createTestDatabase } from "@/test/database";
import {
  queryApplications,
  queryFabricEntries,
  queryProductByPath,
  queryPublishedTaxonomyTerms,
} from "@/public-site/data";

import { assignPrimaryKeywordOwner } from "./keyword-mapping-service";
import { queryIndexableRoutes } from "./public-index";

describe("derived SEO uses authoritative real Product eligibility", () => {
  it("fails closed for Taxonomy, Application, Fabric, Sitemap, Keyword Mapping, and Readiness", async () => {
    const connection = await createTestDatabase();
    try {
      const [reviewer] = await connection.db.insert(users).values({ email: "derived-reviewer@example.test", displayName: "Derived Reviewer", role: "reviewer_publisher", passwordHash: "test" }).returning({ id: users.id, role: users.role });
      if (!reviewer) throw new Error("Missing Reviewer.");
      const actor = { userId: reviewer.id, role: reviewer.role };
      const [taxonomy] = await connection.db.insert(taxonomyTerms).values({ internalKey: "derived-test", dimension: "material_fiber" }).returning({ id: taxonomyTerms.id });
      if (!taxonomy) throw new Error("Missing Taxonomy.");
      await connection.db.insert(taxonomyTermLocalizations).values({ taxonomyTermId: taxonomy.id, locale: "en", name: "TEST Derived Fabric", description: "Useful synthetic taxonomy copy." });
      const [application] = await connection.db.insert(applications).values({ internalKey: "derived-application", status: "published", publishedAt: new Date() }).returning({ id: applications.id });
      if (!application) throw new Error("Missing Application.");
      await connection.db.insert(applicationLocalizations).values({ applicationId: application.id, locale: "en", name: "TEST Derived Application", body: "Useful synthetic application copy." });
      const [fabric] = await connection.db.insert(fabricLibraryEntries).values({ status: "published", independentValueConfirmedByUserId: reviewer.id, independentValueConfirmedAt: new Date(), publishedAt: new Date() }).returning({ id: fabricLibraryEntries.id });
      if (!fabric) throw new Error("Missing Fabric Entry.");
      await connection.db.insert(fabricLibraryEntryLocalizations).values({ fabricEntryId: fabric.id, locale: "en", title: "TEST Derived Fabric Entry", description: "Useful synthetic Fabric Library copy." });
      const [image] = await connection.db.insert(assets).values({
        originalFileName: "derived.jpg", storageProvider: "test", storagePartition: "public", objectKey: "derived/valid.jpg",
        access: "public", category: "product", status: "ready", scanStatus: "passed", declaredMimeType: "image/jpeg",
        detectedMimeType: "image/jpeg", byteSize: 100, sha256: "derived-product-image", altText: "TEST eligible fabric image",
      }).returning({ id: assets.id });
      if (!image) throw new Error("Missing Image.");
      const product = await connection.db.transaction(async (transaction) => {
        const [created] = await transaction.insert(products).values({
          status: "draft", realProductBasis: "physical_sample", realProductConfirmedByUserId: reviewer.id,
          realProductConfirmedAt: new Date(), publishedAt: new Date(),
        }).returning({ id: products.id });
        if (!created) throw new Error("Missing Product.");
        await transaction.insert(productTaxonomyTerms).values({ productId: created.id, taxonomyTermId: taxonomy.id, isPrimary: true });
        return created;
      });
      await connection.db.insert(productLocalizations).values({ productId: product.id, locale: "en", name: "TEST Eligible Real Product" });
      await connection.db.insert(productApplications).values({ productId: product.id, applicationId: application.id });
      await connection.db.insert(productAssets).values({ productId: product.id, assetId: image.id, role: "hero" });
      await connection.db.insert(fabricLibraryEntryAssets).values({ fabricEntryId: fabric.id, assetId: image.id, role: "hero" });
      await connection.db.insert(fabricLibraryEntryProducts).values({ fabricEntryId: fabric.id, productId: product.id });

      const routeInputs = [
        { entityType: "product" as const, entityId: product.id, path: "/products/test-eligible-real-product/", keyword: "test eligible product" },
        { entityType: "taxonomy" as const, entityId: taxonomy.id, path: "/fabric-types/test-derived-fabric/", keyword: "test derived fabric" },
        { entityType: "application" as const, entityId: application.id, path: "/applications/test-derived-application/", keyword: "test derived application" },
        { entityType: "fabric_entry" as const, entityId: fabric.id, path: "/fabric-library/test-derived-entry/", keyword: "test derived entry" },
      ];
      for (const input of routeInputs) {
        const [route] = await connection.db.insert(routes).values({ locale: "en", path: input.path, entityType: input.entityType, entityId: input.entityId }).returning({ id: routes.id });
        if (!route) throw new Error("Missing Route.");
        await connection.db.insert(seoMetadata).values({ routeId: route.id, title: `TEST ${input.keyword}`, metaDescription: "Useful synthetic metadata for derived eligibility.", canonicalPath: input.path, indexStatus: "noindex" });
        await connection.db.insert(keywordPageMappings).values({ normalizedKeyword: input.keyword, intent: "commercial_investigation", primaryRouteId: route.id });
      }
      await connection.db.update(products).set({ status: "published" }).where(eq(products.id, product.id));
      await connection.db.update(products).set({ realProductBasis: null }).where(eq(products.id, product.id));
      await expect(setTaxonomyIndexStatus(connection.db, actor, taxonomy.id, "index")).rejects.toThrow(/published Product|public/i);
      await expect(setApplicationIndexStatus(connection.db, actor, application.id, "index")).rejects.toThrow(/published Product|public/i);
      await expect(setFabricEntryIndexStatus(connection.db, actor, fabric.id, "index")).rejects.toThrow(/useful relation|Product|public/i);
      const taxonomyRoute = (await connection.db.select().from(routes).where(eq(routes.entityId, taxonomy.id)).limit(1))[0]!;
      await expect(assignPrimaryKeywordOwner(connection.db, actor, { keyword: "invalid derived owner", intent: "commercial_investigation", routeId: taxonomyRoute.id })).rejects.toThrow(/eligible real Product/i);

      await connection.db.update(products).set({ realProductBasis: "physical_sample" }).where(eq(products.id, product.id));
      await setTaxonomyIndexStatus(connection.db, actor, taxonomy.id, "index");
      await setApplicationIndexStatus(connection.db, actor, application.id, "index");
      await setFabricEntryIndexStatus(connection.db, actor, fabric.id, "index");
      const derivedPaths = routeInputs.filter((input) => input.entityType !== "product").map((input) => input.path);
      expect((await queryIndexableRoutes(connection.db)).map((row) => row.path)).toEqual(expect.arrayContaining(derivedPaths));
      expect((await queryApplications(connection.db, { requireEligibleProduct: true })).map((row) => row.id)).toContain(application.id);
      expect((await queryFabricEntries(connection.db, { requireEligibleProduct: true })).map((row) => row.id)).toContain(fabric.id);
      expect((await queryPublishedTaxonomyTerms(connection.db, { requireEligibleProduct: true })).map((row) => row.id)).toContain(taxonomy.id);
      await assignPrimaryKeywordOwner(connection.db, actor, { keyword: "valid derived owner", intent: "commercial_investigation", routeId: taxonomyRoute.id });

      await connection.db.update(products).set({ realProductBasis: null }).where(eq(products.id, product.id));
      const afterRemoval = (await queryIndexableRoutes(connection.db)).map((row) => row.path);
      for (const path of derivedPaths) expect(afterRemoval).not.toContain(path);
      const readiness = await verifyDatabaseReadiness(connection.db);
      expect(readiness.indexableTaxonomyWithoutEligibleProduct).toBe(1);
      expect(readiness.indexableApplicationWithoutEligibleProduct).toBe(1);
      expect(readiness.indexableFabricWithoutEligibleProduct).toBe(1);
      expect((await queryApplications(connection.db, { requireEligibleProduct: true })).map((row) => row.id)).not.toContain(application.id);
      expect((await queryFabricEntries(connection.db, { requireEligibleProduct: true })).map((row) => row.id)).not.toContain(fabric.id);
      expect((await queryPublishedTaxonomyTerms(connection.db, { requireEligibleProduct: true })).map((row) => row.id)).not.toContain(taxonomy.id);
      expect((await queryApplications(connection.db, { path: routeInputs[2]!.path }))[0]).toMatchObject({ id: application.id, hasEligibleProducts: false });
      expect((await queryFabricEntries(connection.db, { path: routeInputs[3]!.path }))[0]).toMatchObject({ id: fabric.id, hasEligibleProducts: false });
      expect((await queryPublishedTaxonomyTerms(connection.db, { path: routeInputs[1]!.path }))[0]).toMatchObject({ id: taxonomy.id, hasEligibleProducts: false });

      await connection.db.update(products).set({ realProductBasis: "physical_sample" }).where(eq(products.id, product.id));
      expect((await queryProductByPath(connection.db, routeInputs[0]!.path))?.taxonomy.map((term) => term.name)).toContain("TEST Derived Fabric");
      await connection.db.update(applications).set({ status: "archived" }).where(eq(applications.id, application.id));
      await connection.db.update(fabricLibraryEntries).set({ status: "archived" }).where(eq(fabricLibraryEntries.id, fabric.id));
      await connection.db.update(taxonomyTerms).set({ isActive: false }).where(eq(taxonomyTerms.id, taxonomy.id));
      expect(await queryApplications(connection.db, { path: routeInputs[2]!.path })).toEqual([]);
      expect(await queryFabricEntries(connection.db, { path: routeInputs[3]!.path })).toEqual([]);
      expect(await queryPublishedTaxonomyTerms(connection.db, { path: routeInputs[1]!.path })).toEqual([]);
      expect((await queryProductByPath(connection.db, routeInputs[0]!.path))?.taxonomy).toEqual([]);
    } finally { await connection.close(); }
  }, 20_000);
});
