import { eq } from "drizzle-orm";
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  assets,
  fabricLibraryEntryProducts,
  products,
  routes,
  seoMetadata,
  taxonomyTermLocalizations,
  taxonomyTerms,
  users,
} from "@/db/schema";
import { createTestDatabase } from "@/test/database";
import { queryPublishedFabricRelatedProductIds } from "@/public-site/data";

import {
  createFabricLibraryEntry,
  publishFabricLibraryEntry,
  submitFabricLibraryEntryForReview,
} from "./fabric-library-service";
import {
  confirmRealProductBasis,
  createProductDraft,
  publishReviewedProduct,
  submitProductForReview,
} from "./product-service";

describe("Fabric Library boundary", () => {
  it("creates a distinct thin visual entry as noindex", async () => {
    const connection = await createTestDatabase();
    const userRows = await connection.db
      .insert(users)
      .values([
        { email: "fabric-editor@example.test", displayName: "Fabric Editor", role: "product_editor", passwordHash: "test" },
        { email: "fabric-publisher@example.test", displayName: "Fabric Publisher", role: "reviewer_publisher", passwordHash: "test" },
      ])
      .returning({ id: users.id, role: users.role });
    const userId = userRows.find((row) => row.role === "product_editor")?.id;
    const publisherId = userRows.find((row) => row.role === "reviewer_publisher")?.id;
    if (!userId || !publisherId) throw new Error("Missing actors.");
    const assetRows = await connection.db
      .insert(assets)
      .values({
        originalFileName: "fabric.jpg",
        storageProvider: "test",
        storagePartition: "public",
        objectKey: "test/fabric.jpg",
        access: "public",
        category: "fabric",
        status: "ready",
        scanStatus: "passed",
        declaredMimeType: "image/jpeg",
        detectedMimeType: "image/jpeg",
        byteSize: 100,
        sha256: "fabric-test-sha",
      })
      .returning({ id: assets.id });
    const assetId = assetRows[0]?.id;
    if (!assetId) throw new Error("Missing asset.");
    const entryId = await createFabricLibraryEntry(
      connection.db,
      { userId, role: "product_editor" },
      { title: "TEST Blue Fabric Visual", assetIds: [assetId] },
    );
    const rows = await connection.db
      .select({ indexStatus: seoMetadata.indexStatus })
      .from(routes)
      .innerJoin(seoMetadata, eq(seoMetadata.routeId, routes.id))
      .where(eq(routes.entityId, entryId));
    expect(rows[0]?.indexStatus).toBe("noindex");
    await expect(
      publishFabricLibraryEntry(
        connection.db,
        { userId: publisherId, role: "reviewer_publisher" },
        entryId,
      ),
    ).rejects.toThrow(/publish/);
    await submitFabricLibraryEntryForReview(
      connection.db,
      { userId, role: "product_editor" },
      entryId,
    );
    await publishFabricLibraryEntry(
      connection.db,
      { userId: publisherId, role: "reviewer_publisher" },
      entryId,
    );

    const categoryRows = await connection.db
      .insert(taxonomyTerms)
      .values({ internalKey: "fabric-relation-category", dimension: "material_fiber" })
      .returning({ id: taxonomyTerms.id });
    const categoryId = categoryRows[0]?.id;
    if (!categoryId) throw new Error("Missing category.");
    await connection.db.insert(taxonomyTermLocalizations).values({
      taxonomyTermId: categoryId,
      locale: "en",
      name: "TEST Fabric Relation Category",
    });
    const draftProductId = await createProductDraft(
      connection.db,
      { userId, role: "product_editor" },
      { name: "TEST Draft Related", primaryTaxonomyTermId: categoryId, assetIds: [assetId] },
    );
    const archivedProductId = await createProductDraft(
      connection.db,
      { userId, role: "product_editor" },
      { name: "TEST Archived Related", primaryTaxonomyTermId: categoryId, assetIds: [assetId] },
    );
    const publishedProductId = await createProductDraft(
      connection.db,
      { userId, role: "product_editor" },
      { name: "TEST Published Related", primaryTaxonomyTermId: categoryId, assetIds: [assetId] },
    );
    await connection.db
      .update(products)
      .set({ status: "archived" })
      .where(eq(products.id, archivedProductId));
    await submitProductForReview(
      connection.db,
      { userId, role: "product_editor" },
      publishedProductId,
    );
    await confirmRealProductBasis(
      connection.db,
      { userId: publisherId, role: "reviewer_publisher" },
      publishedProductId,
      "physical_sample",
      "Synthetic test confirmation",
    );
    await publishReviewedProduct(
      connection.db,
      { userId: publisherId, role: "reviewer_publisher" },
      publishedProductId,
    );
    await connection.db.insert(fabricLibraryEntryProducts).values([
      { fabricEntryId: entryId, productId: draftProductId },
      { fabricEntryId: entryId, productId: archivedProductId },
      { fabricEntryId: entryId, productId: publishedProductId },
    ]);
    await expect(
      queryPublishedFabricRelatedProductIds(connection.db, entryId),
    ).resolves.toEqual([{ id: publishedProductId }]);
    await connection.close();
  });
});
