import { and, eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import {
  applicationLocalizations,
  applications,
  assets,
  keywordPageMappings,
  productApplications,
  productLocalizations,
  products,
  redirects,
  routes,
  seoMetadata,
  taxonomyTermLocalizations,
  taxonomyTerms,
  users,
} from "@/db/schema";
import { createTestDatabase } from "@/test/database";
import { queryIndexableRoutes } from "@/seo/public-index";

import {
  applyProductRevision,
  changeProductSlug,
  confirmRealProductBasis,
  createProductDraft,
  publishReviewedProduct,
  setProductIndexStatus,
  submitProductForReview,
  updateProductEditorialCopy,
} from "./product-service";

describe("Product workflow", () => {
  it("keeps draft, publish, and index gates independent and flattens slug redirects", async () => {
    const connection = await createTestDatabase();
    const userRows = await connection.db
      .insert(users)
      .values([
        {
          email: "product-editor@example.test",
          displayName: "Product Editor",
          role: "product_editor",
          passwordHash: "test",
        },
        {
          email: "publisher@example.test",
          displayName: "Publisher",
          role: "reviewer_publisher",
          passwordHash: "test",
        },
      ])
      .returning({ id: users.id, role: users.role });
    const editorId = userRows.find((user) => user.role === "product_editor")?.id;
    const publisherId = userRows.find(
      (user) => user.role === "reviewer_publisher",
    )?.id;
    if (!editorId || !publisherId) throw new Error("Missing fixture actors.");

    const categoryRows = await connection.db
      .insert(taxonomyTerms)
      .values({ internalKey: "test-nylon", dimension: "material_fiber" })
      .returning({ id: taxonomyTerms.id });
    const categoryId = categoryRows[0]?.id;
    if (!categoryId) throw new Error("Missing fixture category.");
    await connection.db.insert(taxonomyTermLocalizations).values({
      taxonomyTermId: categoryId,
      locale: "en",
      name: "Test Nylon",
    });
    const assetRows = await connection.db
      .insert(assets)
      .values({
        originalFileName: "test.jpg",
        storageProvider: "test",
        storagePartition: "public",
        objectKey: "test/product.jpg",
        access: "public",
        category: "product",
        status: "ready",
        scanStatus: "passed",
        declaredMimeType: "image/jpeg",
        detectedMimeType: "image/jpeg",
        byteSize: 100,
        sha256: "product-test-sha",
      })
      .returning({ id: assets.id });
    const assetId = assetRows[0]?.id;
    if (!assetId) throw new Error("Missing fixture asset.");

    const productId = await createProductDraft(
      connection.db,
      { userId: editorId, role: "product_editor" },
      {
        name: "Test Real Nylon Mesh",
        primaryTaxonomyTermId: categoryId,
        assetIds: [assetId],
      },
    );
    const draftRows = await connection.db
      .select()
      .from(products)
      .where(eq(products.id, productId));
    expect(draftRows[0]).toMatchObject({
      status: "draft",
      composition: null,
      weightGsm: null,
      widthCm: null,
    });
    const productRouteRows = await connection.db
      .select({ id: routes.id })
      .from(routes)
      .where(and(eq(routes.entityType, "product"), eq(routes.entityId, productId)));
    const routeId = productRouteRows[0]?.id;
    if (!routeId) throw new Error("Missing product route.");
    const initialSeo = await connection.db
      .select()
      .from(seoMetadata)
      .where(eq(seoMetadata.routeId, routeId));
    expect(initialSeo[0]?.indexStatus).toBe("noindex");
    await connection.db
      .update(seoMetadata)
      .set({ indexStatus: "index" })
      .where(eq(seoMetadata.routeId, routeId));
    expect((await queryIndexableRoutes(connection.db)).map((row) => row.path)).not.toContain(
      "/products/test-real-nylon-mesh/",
    );
    await connection.db
      .update(seoMetadata)
      .set({ indexStatus: "noindex" })
      .where(eq(seoMetadata.routeId, routeId));

    await submitProductForReview(
      connection.db,
      { userId: editorId, role: "product_editor" },
      productId,
    );
    await publishReviewedProduct(
      connection.db,
      { userId: publisherId, role: "reviewer_publisher" },
      productId,
    );
    await expect(
      setProductIndexStatus(
        connection.db,
        { userId: publisherId, role: "reviewer_publisher" },
        productId,
        "index",
      ),
    ).rejects.toThrow(/confirmed real Product/);

    const revisionId = await updateProductEditorialCopy(
      connection.db,
      { userId: editorId, role: "product_editor" },
      productId,
      {
        name: "Test Real Nylon Mesh",
        shortDescription:
          "Fixture description proving that useful product copy is independent from factual textile specifications.",
      },
    );
    expect(revisionId).toBeTruthy();
    const beforeApproval = await connection.db
      .select({ shortDescription: productLocalizations.shortDescription })
      .from(productLocalizations)
      .where(eq(productLocalizations.productId, productId));
    expect(beforeApproval[0]?.shortDescription).toBeNull();
    await applyProductRevision(
      connection.db,
      { userId: publisherId, role: "reviewer_publisher" },
      revisionId!,
    );
    await connection.db
      .update(assets)
      .set({ altText: "Test fixture blue fabric surface" })
      .where(eq(assets.id, assetId));
    await confirmRealProductBasis(
      connection.db,
      { userId: publisherId, role: "reviewer_publisher" },
      productId,
      "physical_sample",
      "Synthetic test confirmation only",
    );
    const applicationRows = await connection.db
      .insert(applications)
      .values({ internalKey: "test-sportswear", status: "published" })
      .returning({ id: applications.id });
    const applicationId = applicationRows[0]?.id;
    if (!applicationId) throw new Error("Missing application.");
    await connection.db.insert(applicationLocalizations).values({
      applicationId,
      locale: "en",
      name: "Test Sportswear",
    });
    await connection.db.insert(productApplications).values({ productId, applicationId });
    await connection.db.insert(keywordPageMappings).values({
      normalizedKeyword: "test real nylon mesh",
      intent: "commercial_investigation",
      primaryRouteId: routeId,
    });
    await connection.db
      .update(seoMetadata)
      .set({ metaDescription: "Test fixture metadata for a validated no-production page." })
      .where(eq(seoMetadata.routeId, routeId));
    await setProductIndexStatus(
      connection.db,
      { userId: publisherId, role: "reviewer_publisher" },
      productId,
      "index",
    );
    const indexed = await connection.db
      .select({ indexStatus: seoMetadata.indexStatus })
      .from(seoMetadata)
      .where(eq(seoMetadata.routeId, routeId));
    expect(indexed[0]?.indexStatus).toBe("index");
    const sitemapRows = await queryIndexableRoutes(connection.db);
    expect(sitemapRows.map((row) => row.path)).toContain(
      "/products/test-real-nylon-mesh/",
    );

    await changeProductSlug(
      connection.db,
      { userId: publisherId, role: "reviewer_publisher" },
      productId,
      "test-renamed-once",
    );
    await changeProductSlug(
      connection.db,
      { userId: publisherId, role: "reviewer_publisher" },
      productId,
      "test-renamed-twice",
    );
    const redirectRows = await connection.db
      .select({ source: redirects.sourcePath, destination: redirects.destinationPath })
      .from(redirects);
    expect(redirectRows).toEqual(
      expect.arrayContaining([
        {
          source: "/products/test-real-nylon-mesh/",
          destination: "/products/test-renamed-twice/",
        },
        {
          source: "/products/test-renamed-once/",
          destination: "/products/test-renamed-twice/",
        },
      ]),
    );
    const localized = await connection.db
      .select()
      .from(productLocalizations)
      .where(eq(productLocalizations.productId, productId));
    expect(localized[0]?.name).toBe("Test Real Nylon Mesh");
    expect(localized[0]?.shortDescription).toContain("Fixture description");
    await connection.close();
  });
});
