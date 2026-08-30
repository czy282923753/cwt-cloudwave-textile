import { and, eq } from "drizzle-orm";
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  assets,
  auditLogs,
  editorialRevisions,
  products,
  productTaxonomyTerms,
  taxonomyTerms,
  users,
} from "@/db/schema";
import { createTestDatabase } from "@/test/database";

import {
  assignGeneratedProductCode,
  applyProductRevision,
  correctProductCode,
  createProductDraft,
  updateProductFacts,
  updateProductStructure,
} from "./product-service";

describe("Phase 1B Product data foundation", () => {
  it("allocates permanent category codes and requires the dedicated Admin correction", async () => {
    const connection = await createTestDatabase();
    const userRows = await connection.db.insert(users).values([
      { email: "stage1-editor@example.test", displayName: "Stage 1 Editor", role: "product_editor", passwordHash: "test" },
      { email: "stage1-admin@example.test", displayName: "Stage 1 Admin", role: "admin", passwordHash: "test" },
    ]).returning({ id: users.id, role: users.role });
    const editorId = userRows.find((row) => row.role === "product_editor")!.id;
    const adminId = userRows.find((row) => row.role === "admin")!.id;
    const categoryRows = await connection.db.insert(taxonomyTerms).values([
      { internalKey: "stage1-polyester", dimension: "material_fiber", productCodePrefix: "POL" },
      { internalKey: "stage1-no-prefix", dimension: "structure_construction" },
    ]).returning({ id: taxonomyTerms.id, prefix: taxonomyTerms.productCodePrefix });
    const prefixedCategoryId = categoryRows.find((row) => row.prefix === "POL")!.id;
    const noPrefixCategoryId = categoryRows.find((row) => row.prefix === null)!.id;
    const assetRows = await connection.db.insert(assets).values({
      originalFileName: "TEST-stage1-product.jpg",
      storageProvider: "test",
      storagePartition: "public",
      objectKey: "test/stage1-product.jpg",
      access: "public",
      category: "product",
      status: "ready",
      scanStatus: "passed",
      declaredMimeType: "image/jpeg",
      detectedMimeType: "image/jpeg",
      byteSize: 100,
      sha256: "stage1-product-data",
    }).returning({ id: assets.id });
    const assetId = assetRows[0]!.id;

    const firstId = await createProductDraft(connection.db, { userId: editorId, role: "product_editor" }, {
      name: "Synthetic Polyester Chiffon Fabric",
      primaryTaxonomyTermId: prefixedCategoryId,
      assetIds: [assetId],
    });
    const secondId = await createProductDraft(connection.db, { userId: editorId, role: "product_editor" }, {
      name: "Synthetic Polyester Mesh Fabric",
      primaryTaxonomyTermId: prefixedCategoryId,
      assetIds: [assetId],
    });
    const codes = await connection.db.select({ id: products.id, code: products.productCode })
      .from(products)
      .where(and(eq(products.status, "draft")));
    expect(codes.find((row) => row.id === firstId)?.code).toBe("CWT-POL-001");
    expect(codes.find((row) => row.id === secondId)?.code).toBe("CWT-POL-002");

    await expect(updateProductFacts(connection.db, { userId: editorId, role: "product_editor" }, firstId, {
      productCode: "CWT-POL-099",
    })).rejects.toThrow(/dedicated correction/);
    await expect(correctProductCode(
      connection.db,
      { userId: editorId, role: "product_editor" },
      firstId,
      "CWT-POL-099",
      "Synthetic correction",
    )).rejects.toThrow(/Only an Admin/);
    await correctProductCode(
      connection.db,
      { userId: adminId, role: "admin" },
      firstId,
      "CWT-POL-099",
      "Synthetic correction for Stage 1 test",
    );
    expect((await connection.db.select({ code: products.productCode }).from(products).where(eq(products.id, firstId)))[0]?.code)
      .toBe("CWT-POL-099");
    expect((await connection.db.select({ action: auditLogs.action }).from(auditLogs).where(and(
      eq(auditLogs.entityId, firstId),
      eq(auditLogs.action, "product.code.corrected"),
    )))).toHaveLength(1);

    const legacyRevisionRows = await connection.db.insert(editorialRevisions).values({
      entityType: "product",
      entityId: firstId,
      locale: "en",
      versionNumber: 1,
      status: "in_review",
      snapshot: { kind: "facts", productCode: "CWT-POL-088" },
      changeSummary: "Synthetic legacy Product Code fact revision",
      createdByUserId: editorId,
    }).returning({ id: editorialRevisions.id });
    await expect(applyProductRevision(
      connection.db,
      { userId: adminId, role: "admin" },
      legacyRevisionRows[0]!.id,
    )).rejects.toThrow(/dedicated Admin correction revision/);
    expect((await connection.db.select({ code: products.productCode }).from(products).where(eq(products.id, firstId)))[0]?.code)
      .toBe("CWT-POL-099");

    const unassignedId = await createProductDraft(connection.db, { userId: editorId, role: "product_editor" }, {
      name: "Synthetic Unassigned Woven Fabric",
      primaryTaxonomyTermId: noPrefixCategoryId,
      assetIds: [assetId],
    });
    expect((await connection.db.select({ code: products.productCode }).from(products).where(eq(products.id, unassignedId)))[0]?.code)
      .toBeNull();
    await expect(assignGeneratedProductCode(
      connection.db,
      { userId: editorId, role: "product_editor" },
      unassignedId,
    )).rejects.toThrow(/no approved Product Code prefix/);

    await updateProductStructure(connection.db, { userId: editorId, role: "product_editor" }, secondId, {
      primaryTaxonomyTermId: noPrefixCategoryId,
      additionalTaxonomyTermIds: [],
      applicationIds: [],
      tagNames: [],
      assetIds: [assetId],
      heroAssetId: assetId,
      media: [{ assetId, role: "hero", sortOrder: 0, altText: "Synthetic fabric", caption: null, isVisible: true }],
      features: [],
      faqs: [],
      colorOptionsDisplay: "inherit",
      customAvailableDisplay: "inherit",
      sampleAvailableDisplay: "inherit",
      moqNoteDisplay: "hide",
    });
    expect((await connection.db.select({ code: products.productCode }).from(products).where(eq(products.id, secondId)))[0]?.code)
      .toBe("CWT-POL-002");
    await connection.close();
  });

  it("normalizes factual fields and stores MOQ value/unit without parsing the note", async () => {
    const connection = await createTestDatabase();
    const userRows = await connection.db.insert(users).values({
      email: "stage1-facts@example.test",
      displayName: "Stage 1 Facts",
      role: "product_editor",
      passwordHash: "test",
    }).returning({ id: users.id });
    const categoryRows = await connection.db.insert(taxonomyTerms).values({
      internalKey: "stage1-facts-category",
      dimension: "material_fiber",
    }).returning({ id: taxonomyTerms.id });
    const productId = await connection.db.transaction(async (transaction) => {
      const productRows = await transaction.insert(products).values({ status: "draft" }).returning({ id: products.id });
      await transaction.insert(productTaxonomyTerms).values({
        productId: productRows[0]!.id,
        taxonomyTermId: categoryRows[0]!.id,
        isPrimary: true,
      });
      return productRows[0]!.id;
    });
    await updateProductFacts(connection.db, { userId: userRows[0]!.id, role: "product_editor" }, productId, {
      composition: "92%  Polyester/8% Spandex",
      weightGsm: "180",
      widthCm: "150.5",
      moqValue: "500",
      moqUnit: "m",
      moqNote: "Synthetic note remains unparsed: about five rolls",
    });
    expect((await connection.db.select({
      composition: products.composition,
      weightGsm: products.weightGsm,
      widthCm: products.widthCm,
      moqValue: products.moqValue,
      moqUnit: products.moqUnit,
      moqNote: products.moqNote,
    }).from(products).where(eq(products.id, productId)))[0]).toMatchObject({
      composition: "92% Polyester / 8% Spandex",
      weightGsm: "180.00",
      widthCm: "150.50",
      moqValue: "500.00",
      moqUnit: "m",
      moqNote: "Synthetic note remains unparsed: about five rolls",
    });
    await connection.close();
  });
});
