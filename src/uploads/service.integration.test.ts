import { eq } from "drizzle-orm";
import sharp from "sharp";
import { describe, expect, it } from "vitest";

import { assets, auditLogs, users } from "@/db/schema";
import { InMemoryObjectStorage } from "@/test/in-memory-storage";
import { createTestDatabase } from "@/test/database";

import { DevelopmentFileScanner } from "./scanner";
import { cleanupUnlinkedInquiryAssets, updateSourceDeclaration, uploadAsset } from "./service";

async function testJpeg(): Promise<Buffer> {
  return sharp({
    create: {
      width: 32,
      height: 24,
      channels: 3,
      background: { r: 30, g: 70, b: 120 },
    },
  })
    .jpeg()
    .toBuffer();
}

describe("secure asset upload", () => {
  it("keeps inquiry files private and leaves source fields null by default", async () => {
    const connection = await createTestDatabase();
    const storage = new InMemoryObjectStorage();
    const assetId = await uploadAsset(
      connection.db,
      storage,
      new DevelopmentFileScanner(),
      {
        fileName: "customer-sample.jpg",
        declaredMimeType: "image/jpeg",
        bytes: await testJpeg(),
        category: "inquiry",
        purpose: "inquiry",
      },
    );
    const rows = await connection.db
      .select()
      .from(assets)
      .where(eq(assets.id, assetId));
    expect(rows[0]).toMatchObject({
      access: "private",
      storagePartition: "private",
      status: "ready",
      sourceDeclarationEnabled: false,
      sourceType: null,
      rightsStatus: null,
      publicUsePermission: null,
    });
    expect([...storage.objects.keys()].every((key) => key.startsWith("private:"))).toBe(
      true,
    );
    await connection.close();
  });

  it("preserves declaration data when its UI switch is turned off and audits it", async () => {
    const connection = await createTestDatabase();
    const storage = new InMemoryObjectStorage();
    const userRows = await connection.db
      .insert(users)
      .values({
        email: "asset-reviewer@example.test",
        displayName: "Asset Reviewer",
        role: "reviewer_publisher",
        passwordHash: "test-only-hash",
      })
      .returning({ id: users.id });
    const userId = userRows[0]?.id;
    if (!userId) throw new Error("Missing test user.");
    const assetId = await uploadAsset(
      connection.db,
      storage,
      new DevelopmentFileScanner(),
      {
        fileName: "partner-factory.jpg",
        declaredMimeType: "image/jpeg",
        bytes: await testJpeg(),
        category: "factory",
        purpose: "public_asset",
        uploadedByUserId: userId,
      },
    );
    await updateSourceDeclaration(connection.db, assetId, { userId, role: "admin" }, {
      enabled: true,
      subjectRelationship: "partner_factory",
      isCwtOwnedFacility: false,
      publicUsePermission: "allowed",
    });
    await updateSourceDeclaration(
      connection.db,
      assetId,
      { userId, role: "admin" },
      { enabled: false },
    );

    const rows = await connection.db
      .select()
      .from(assets)
      .where(eq(assets.id, assetId));
    expect(rows[0]).toMatchObject({
      sourceDeclarationEnabled: false,
      subjectRelationship: "partner_factory",
      isCwtOwnedFacility: false,
      publicUsePermission: "allowed",
    });
    const audits = await connection.db.select().from(auditLogs);
    expect(audits).toHaveLength(2);
    await connection.close();
  });

  it("rejects MIME mismatches before storing anything", async () => {
    const connection = await createTestDatabase();
    const storage = new InMemoryObjectStorage();
    await expect(
      uploadAsset(connection.db, storage, new DevelopmentFileScanner(), {
        fileName: "disguised.png",
        declaredMimeType: "image/png",
        bytes: await testJpeg(),
        category: "product",
        purpose: "public_asset",
      }),
    ).rejects.toThrow(/MIME/);
    expect(storage.objects.size).toBe(0);
    await connection.close();
  });

  it("deletes an unlinked Inquiry Asset after a failed submission", async () => {
    const connection = await createTestDatabase();
    const storage = new InMemoryObjectStorage();
    const assetId = await uploadAsset(connection.db, storage, new DevelopmentFileScanner(), {
      fileName: "orphaned-customer-sample.jpg",
      declaredMimeType: "image/jpeg",
      bytes: await testJpeg(),
      category: "inquiry",
      purpose: "inquiry",
    });
    await expect(
      cleanupUnlinkedInquiryAssets(connection.db, storage, [assetId], "cleanup-test"),
    ).resolves.toBe(1);
    const rows = await connection.db.select().from(assets).where(eq(assets.id, assetId));
    expect(rows[0]?.status).toBe("deleted");
    expect(rows[0]?.deletedAt).toBeInstanceOf(Date);
    expect(storage.objects.size).toBe(0);
    await connection.close();
  });

  it("prevents an Asset writer from self-reviewing a source declaration", async () => {
    const connection = await createTestDatabase();
    const storage = new InMemoryObjectStorage();
    const userRows = await connection.db
      .insert(users)
      .values({
        email: "asset-writer@example.test",
        displayName: "Asset Writer",
        role: "product_editor",
        passwordHash: "test",
      })
      .returning({ id: users.id });
    const userId = userRows[0]?.id;
    if (!userId) throw new Error("Missing Asset writer fixture.");
    const assetId = await uploadAsset(
      connection.db,
      storage,
      new DevelopmentFileScanner(),
      {
        fileName: "writer-upload.jpg",
        declaredMimeType: "image/jpeg",
        bytes: await testJpeg(),
        category: "product",
        purpose: "public_asset",
        uploadedByUserId: userId,
      },
    );
    await expect(
      updateSourceDeclaration(
        connection.db,
        assetId,
        { userId, role: "product_editor" },
        {
          enabled: true,
          rightsStatus: "claimed",
          declarationReviewerUserId: userId,
          declarationReviewDate: new Date(),
        },
      ),
    ).rejects.toThrow(/reviewer authority/);
    const rows = await connection.db.select().from(assets).where(eq(assets.id, assetId));
    expect(rows[0]).toMatchObject({
      sourceDeclarationEnabled: false,
      rightsStatus: null,
      declarationReviewerUserId: null,
      declarationReviewDate: null,
    });
    await connection.close();
  });

  it("invalidates an earlier review when declaration content changes", async () => {
    const connection = await createTestDatabase();
    const storage = new InMemoryObjectStorage();
    const userRows = await connection.db
      .insert(users)
      .values([
        { email: "rights-reviewer@example.test", displayName: "Reviewer", role: "reviewer_publisher", passwordHash: "test" },
        { email: "rights-editor@example.test", displayName: "Editor", role: "product_editor", passwordHash: "test" },
      ])
      .returning({ id: users.id, role: users.role });
    const reviewerId = userRows.find((row) => row.role === "reviewer_publisher")?.id;
    const editorId = userRows.find((row) => row.role === "product_editor")?.id;
    if (!reviewerId || !editorId) throw new Error("Missing declaration actors.");
    const assetId = await uploadAsset(connection.db, storage, new DevelopmentFileScanner(), {
      fileName: "rights-review.jpg",
      declaredMimeType: "image/jpeg",
      bytes: await testJpeg(),
      category: "product",
      purpose: "public_asset",
      uploadedByUserId: editorId,
    });
    await updateSourceDeclaration(
      connection.db,
      assetId,
      { userId: editorId, role: "product_editor" },
      {
        enabled: true,
        rightsStatus: "reviewed",
      },
    );
    const reviewedAt = new Date();
    await updateSourceDeclaration(
      connection.db,
      assetId,
      { userId: reviewerId, role: "reviewer_publisher" },
      {
        enabled: true,
        declarationReviewerUserId: reviewerId,
        declarationReviewDate: reviewedAt,
      },
    );
    await updateSourceDeclaration(
      connection.db,
      assetId,
      { userId: editorId, role: "product_editor" },
      { enabled: true, rightsStatus: "changed-by-editor" },
    );
    const rows = await connection.db.select().from(assets).where(eq(assets.id, assetId));
    expect(rows[0]).toMatchObject({
      rightsStatus: "changed-by-editor",
      declarationReviewerUserId: null,
      declarationReviewDate: null,
    });
    await connection.close();
  });

  it("rejects a decoded image containing the development malware signature", async () => {
    const connection = await createTestDatabase();
    const storage = new InMemoryObjectStorage();
    const infected = Buffer.concat([
      await testJpeg(),
      Buffer.from("EICAR-STANDARD-ANTIVIRUS-TEST-FILE"),
    ]);
    await expect(
      uploadAsset(connection.db, storage, new DevelopmentFileScanner(), {
        fileName: "malware-test.jpg",
        declaredMimeType: "image/jpeg",
        bytes: infected,
        category: "inquiry",
        purpose: "inquiry",
      }),
    ).rejects.toThrow(/malware scanning/);
    const rows = await connection.db.select().from(assets);
    expect(rows[0]?.status).toBe("rejected");
    expect(
      [...storage.objects.keys()].every((key) => key.startsWith("private:quarantine/")),
    ).toBe(true);
    await connection.close();
  });
});
