import { and, eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import {
  assets,
  authors,
  applications,
  applicationLocalizations,
  contentLocalizations,
  contents,
  keywordPageMappings,
  productApplications,
  productAssets,
  productLocalizations,
  products,
  routes,
  seoMetadata,
  taxonomyTerms,
  productTaxonomyTerms,
  users,
} from "@/db/schema";
import { verifyDatabaseReadiness } from "@/db/readiness";
import { queryIndexableRoutes } from "@/seo/public-index";
import { createTestDatabase } from "@/test/database";

import { queryProductByPath, queryPublishedProducts } from "./data";

describe("historical and direct Product publication boundary", () => {
  it("fails closed for every incomplete real-Product gate in list, detail, sitemap, and readiness", async () => {
    const connection = await createTestDatabase();
    const reviewerRows = await connection.db.insert(users).values({
      email: "public-product-reviewer@example.test",
      displayName: "Public Product Reviewer",
      role: "reviewer_publisher",
      passwordHash: "test",
    }).returning({ id: users.id });
    const reviewerId = reviewerRows[0]!.id;
    const taxonomyRows = await connection.db.insert(taxonomyTerms).values({
      internalKey: "product-boundary-primary",
      dimension: "material_fiber",
    }).returning({ id: taxonomyTerms.id });
    const productId = await connection.db.transaction(async (transaction) => {
      const productRows = await transaction.insert(products).values({
        status: "draft",
        realProductBasis: "physical_sample",
        realProductConfirmedByUserId: reviewerId,
        realProductConfirmedAt: new Date(),
        publishedAt: new Date(),
      }).returning({ id: products.id });
      const id = productRows[0]!.id;
      await transaction.insert(productTaxonomyTerms).values({
        productId: id,
        taxonomyTermId: taxonomyRows[0]!.id,
        isPrimary: true,
      });
      return id;
    });
    await connection.db.update(products).set({ status: "published" }).where(eq(products.id, productId));
    const path = "/products/direct-database-gate-test/";
    await connection.db.insert(productLocalizations).values({
      productId,
      locale: "en",
      name: "TEST Direct Database Gate Product",
      shortDescription: "TEST descriptive content for publication-gate verification.",
    });
    const routeRows = await connection.db.insert(routes).values({
      entityType: "product",
      entityId: productId,
      locale: "en",
      path,
    }).returning({ id: routes.id });
    await connection.db.insert(seoMetadata).values({
      routeId: routeRows[0]!.id,
      title: "TEST Product",
      metaDescription: "TEST metadata only.",
      canonicalPath: path,
      indexStatus: "noindex",
    });
    const assetRows = await connection.db.insert(assets).values({
      originalFileName: "valid.jpg",
      storageProvider: "test",
      storagePartition: "public",
      objectKey: "product-boundary/valid.jpg",
      access: "public",
      category: "product",
      status: "ready",
      scanStatus: "passed",
      declaredMimeType: "image/jpeg",
      detectedMimeType: "image/jpeg",
      byteSize: 100,
      sha256: "product-boundary-valid",
      altText: "TEST product image",
    }).returning({ id: assets.id });
    const assetId = assetRows[0]!.id;
    await connection.db.insert(productAssets).values({
      productId,
      assetId,
      role: "hero",
    });

    const expectVisible = async (visible: boolean) => {
      const listIds = (await queryPublishedProducts(connection.db)).map((row) => row.id);
      expect(listIds.includes(productId)).toBe(visible);
      expect(Boolean(await queryProductByPath(connection.db, path))).toBe(visible);
    };
    await expectVisible(true);

    const draftProductId = await connection.db.transaction(async (transaction) => {
      const draftProductRows = await transaction.insert(products).values({
        status: "draft",
      }).returning({ id: products.id });
      const id = draftProductRows[0]!.id;
      await transaction.insert(productTaxonomyTerms).values({
        productId: id,
        taxonomyTermId: taxonomyRows[0]!.id,
        isPrimary: true,
      });
      return id;
    });
    const authorRows = await connection.db.insert(authors).values({
      internalKey: "product-boundary-related-author",
      displayName: "TEST Related Author",
      isOrganization: true,
    }).returning({ id: authors.id });
    const draftContentRows = await connection.db.insert(contents).values({
      channel: "fabric_knowledge",
      type: "article",
      status: "draft",
      authorId: authorRows[0]!.id,
      createdByUserId: reviewerId,
    }).returning({ id: contents.id });
    const draftContentId = draftContentRows[0]!.id;
    await connection.db.insert(contentLocalizations).values({
      contentId: draftContentId,
      locale: "en",
      title: "TEST Draft Related Article",
      body: "",
    });
    await connection.db.insert(routes).values({
      entityType: "content",
      entityId: draftContentId,
      locale: "en",
      path: "/fabric-knowledge/test-draft-related-article/",
    });
    await connection.db.update(productLocalizations).set({
      structuredBlocks: {
        version: 1,
        blocks: [
          { id: "related-products", type: "related_products", productIds: [productId, draftProductId] },
          { id: "related-articles", type: "related_articles", contentIds: [draftContentId] },
        ],
      },
    }).where(eq(productLocalizations.productId, productId));
    const productWithDraftRelations = await queryProductByPath(connection.db, path);
    expect(Object.keys(productWithDraftRelations?.relatedProducts ?? {})).toEqual([productId]);
    expect(productWithDraftRelations?.relatedArticles).toEqual({});
    await connection.db.update(contents).set({ status: "published" }).where(eq(contents.id, draftContentId));
    expect(Object.keys((await queryProductByPath(connection.db, path))?.relatedArticles ?? {}))
      .toEqual([draftContentId]);
    await connection.db.update(contents).set({ status: "draft" }).where(eq(contents.id, draftContentId));

    await connection.db.update(products).set({ realProductBasis: null }).where(eq(products.id, productId));
    await expectVisible(false);
    expect((await verifyDatabaseReadiness(connection.db)).publishedProductEligibilityFailures).toBeGreaterThan(0);
    await connection.db.update(products).set({ realProductBasis: "physical_sample" }).where(eq(products.id, productId));

    const applicationRows = await connection.db.insert(applications).values({
      internalKey: "product-boundary-application",
      status: "published",
    }).returning({ id: applications.id });
    await connection.db.insert(applicationLocalizations).values({
      applicationId: applicationRows[0]!.id,
      locale: "en",
      name: "TEST Application",
    });
    await connection.db.insert(productApplications).values({
      productId,
      applicationId: applicationRows[0]!.id,
    });
    await connection.db.insert(keywordPageMappings).values({
      normalizedKeyword: "test direct database gate product",
      intent: "commercial_investigation",
      primaryRouteId: routeRows[0]!.id,
    });
    await connection.db.update(seoMetadata).set({ indexStatus: "index" }).where(eq(seoMetadata.routeId, routeRows[0]!.id));
    expect((await queryIndexableRoutes(connection.db)).map((row) => row.path)).toContain(path);

    const cases: Array<{
      name: string;
      apply: () => Promise<unknown>;
      restore: () => Promise<unknown>;
    }> = [
      {
        name: "missing basis from a direct database write",
        apply: () => connection.db.update(products).set({ realProductBasis: null }).where(eq(products.id, productId)),
        restore: () => connection.db.update(products).set({ realProductBasis: "physical_sample" }).where(eq(products.id, productId)),
      },
      {
        name: "missing confirmer",
        apply: () => connection.db.update(products).set({ realProductConfirmedByUserId: null }).where(eq(products.id, productId)),
        restore: () => connection.db.update(products).set({ realProductConfirmedByUserId: reviewerId }).where(eq(products.id, productId)),
      },
      {
        name: "missing confirmation time",
        apply: () => connection.db.update(products).set({ realProductConfirmedAt: null }).where(eq(products.id, productId)),
        restore: () => connection.db.update(products).set({ realProductConfirmedAt: new Date() }).where(eq(products.id, productId)),
      },
      {
        name: "empty current localization",
        apply: () => connection.db.update(productLocalizations).set({ name: "" }).where(eq(productLocalizations.productId, productId)),
        restore: () => connection.db.update(productLocalizations).set({ name: "TEST Direct Database Gate Product" }).where(eq(productLocalizations.productId, productId)),
      },
      {
        name: "PDF hero",
        apply: () => connection.db.update(assets).set({ detectedMimeType: "application/pdf", declaredMimeType: "application/pdf" }).where(eq(assets.id, assetId)),
        restore: () => connection.db.update(assets).set({ detectedMimeType: "image/jpeg", declaredMimeType: "image/jpeg" }).where(eq(assets.id, assetId)),
      },
      {
        name: "non-image MIME",
        apply: () => connection.db.update(assets).set({ detectedMimeType: "text/plain" }).where(eq(assets.id, assetId)),
        restore: () => connection.db.update(assets).set({ detectedMimeType: "image/jpeg" }).where(eq(assets.id, assetId)),
      },
      {
        name: "Pending image",
        apply: () => connection.db.update(assets).set({ scanStatus: "pending" }).where(eq(assets.id, assetId)),
        restore: () => connection.db.update(assets).set({ scanStatus: "passed" }).where(eq(assets.id, assetId)),
      },
      {
        name: "Failed image",
        apply: () => connection.db.update(assets).set({ scanStatus: "failed" }).where(eq(assets.id, assetId)),
        restore: () => connection.db.update(assets).set({ scanStatus: "passed" }).where(eq(assets.id, assetId)),
      },
    ];
    for (const testCase of cases) {
      await testCase.apply();
      await expectVisible(false);
      expect((await queryIndexableRoutes(connection.db)).map((row) => row.path), testCase.name).not.toContain(path);
      expect((await verifyDatabaseReadiness(connection.db)).publishedProductEligibilityFailures, testCase.name).toBeGreaterThan(0);
      await testCase.restore();
      expect((await queryIndexableRoutes(connection.db)).map((row) => row.path), `${testCase.name} restore`).toContain(path);
    }
    await expectVisible(true);

    await connection.db.update(routes).set({ isCurrent: false }).where(
      and(eq(routes.entityType, "product"), eq(routes.entityId, productId)),
    );
    await expectVisible(false);
    expect((await verifyDatabaseReadiness(connection.db)).publishedProductEligibilityFailures).toBeGreaterThan(0);
    await connection.close();
  }, 15_000);
});
