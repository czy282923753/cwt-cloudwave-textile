import { describe, expect, it } from "vitest";
import { inArray } from "drizzle-orm";

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
} from "@/db/schema";
import { createTestDatabase } from "@/test/database";

import {
  queryProductsForApplication,
  queryProductsForTaxonomy,
  queryPublishedProductPage,
} from "./data";

describe("crawlable public Product pagination", () => {
  it("returns 101 eligible Products without truncation, omission, duplication, or relation leakage", async () => {
    const connection = await createTestDatabase();
    try {
      const [reviewer] = await connection.db.insert(users).values({
        email: "pagination-reviewer@example.test",
        displayName: "TEST Pagination Reviewer",
        role: "reviewer_publisher",
        passwordHash: "test",
      }).returning({ id: users.id });
      const [taxonomy] = await connection.db.insert(taxonomyTerms).values({
        internalKey: "pagination-primary",
        dimension: "material_fiber",
      }).returning({ id: taxonomyTerms.id });
      const [application] = await connection.db.insert(applications).values({
        internalKey: "pagination-application",
        status: "published",
        publishedAt: new Date(),
      }).returning({ id: applications.id });
      const [image] = await connection.db.insert(assets).values({
        originalFileName: "pagination.jpg",
        storageProvider: "test",
        storagePartition: "public",
        objectKey: "pagination/eligible.jpg",
        access: "public",
        category: "product",
        status: "ready",
        scanStatus: "passed",
        declaredMimeType: "image/jpeg",
        detectedMimeType: "image/jpeg",
        byteSize: 100,
        sha256: "pagination-eligible-image",
        altText: "TEST pagination fabric",
      }).returning({ id: assets.id });
      if (!reviewer || !taxonomy || !application || !image) {
        throw new Error("Missing pagination fixtures.");
      }
      await connection.db.insert(applicationLocalizations).values({
        applicationId: application.id,
        locale: "en",
        name: "TEST Pagination Application",
      });

      const productRows = await connection.db.transaction(async (transaction) => {
        const created = await transaction.insert(products).values(
          Array.from({ length: 101 }, (_, index) => ({
          status: "draft" as const,
          realProductBasis: "physical_sample" as const,
          realProductConfirmedByUserId: reviewer.id,
          realProductConfirmedAt: new Date("2026-08-01T00:00:00.000Z"),
          publishedAt: new Date(Date.UTC(2026, 7, 1, 0, index)),
          })),
        ).returning({ id: products.id, publishedAt: products.publishedAt });
        await transaction.insert(productTaxonomyTerms).values(created.map((product) => ({
          productId: product.id,
          taxonomyTermId: taxonomy.id,
          isPrimary: true,
        })));
        return created;
      });
      await connection.db.insert(productLocalizations).values(productRows.map((product, index) => ({
        productId: product.id,
        locale: "en",
        name: `TEST Pagination Product ${String(index + 1).padStart(3, "0")}`,
      })));
      const routeRows = await connection.db.insert(routes).values(productRows.map((product, index) => ({
        entityType: "product" as const,
        entityId: product.id,
        locale: "en",
        path: `/products/test-pagination-${String(index + 1).padStart(3, "0")}/`,
      }))).returning({ id: routes.id });
      await connection.db.insert(seoMetadata).values(routeRows.map((route) => ({
        routeId: route.id,
        indexStatus: "noindex" as const,
      })));
      await connection.db.insert(productAssets).values(productRows.map((product) => ({
        productId: product.id,
        assetId: image.id,
        role: "hero" as const,
      })));
      await connection.db.update(products).set({ status: "published" }).where(
        inArray(products.id, productRows.map((product) => product.id)),
      );
      await connection.db.insert(productApplications).values(productRows.map((product) => ({
        productId: product.id,
        applicationId: application.id,
      })));

      const pages = [];
      for (let page = 1; page <= 5; page += 1) {
        const result = await queryPublishedProductPage(connection.db, page);
        if (!result) throw new Error(`Missing Product page ${page}.`);
        pages.push(result);
      }
      expect(pages[0]).toMatchObject({ total: 101, totalPages: 5, pageSize: 24 });
      expect(pages.map((page) => page.items.length)).toEqual([24, 24, 24, 24, 5]);
      const ids = pages.flatMap((page) => page.items.map((product) => product.id));
      expect(ids).toHaveLength(101);
      expect(new Set(ids).size).toBe(101);
      expect(await queryPublishedProductPage(connection.db, 6)).toBeNull();
      await expect(queryPublishedProductPage(connection.db, 0)).rejects.toThrow(/positive integer/);

      const applicationProducts = await queryProductsForApplication(connection.db, application.id);
      const taxonomyProducts = await queryProductsForTaxonomy(connection.db, taxonomy.id);
      expect(applicationProducts).toHaveLength(101);
      expect(taxonomyProducts).toHaveLength(101);
      expect(new Set(applicationProducts.map((product) => product.id))).toEqual(new Set(ids));
      expect(new Set(taxonomyProducts.map((product) => product.id))).toEqual(new Set(ids));
    } finally {
      await connection.close();
    }
  }, 30_000);
});
