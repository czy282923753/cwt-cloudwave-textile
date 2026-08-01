import { eq } from "drizzle-orm";
import sharp from "sharp";
import { describe, expect, it } from "vitest";

import { assets, auditLogs, users } from "@/db/schema";
import { InMemoryObjectStorage } from "@/test/in-memory-storage";
import { createTestDatabase } from "@/test/database";
import { isPublicWebsiteUseAllowed } from "./asset-eligibility";

import { DevelopmentFileScanner } from "./scanner";
import {
  adminOverrideSourceDeclaration,
  cleanupUnlinkedInquiryAssets,
  reviewSourceDeclaration,
  updateSourceDeclaration,
  uploadAsset,
} from "./service";

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
      expectedVersion: 0,
      enabled: true,
      subjectRelationship: "partner_factory",
      isCwtOwnedFacility: false,
      publicUsePermission: "allowed",
    });
    await updateSourceDeclaration(
      connection.db,
      assetId,
      { userId, role: "admin" },
      { expectedVersion: 1, enabled: false },
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
      effectiveRightsDecision: "pending_review",
      declarationStatementVersion: 1,
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
    await updateSourceDeclaration(
      connection.db,
      assetId,
      { userId, role: "product_editor" },
      { expectedVersion: 0, enabled: true, rightsStatus: "claimed" },
    );
    await expect(
      reviewSourceDeclaration(
        connection.db,
        assetId,
        { userId, role: "admin" },
        "approved",
        "allowed",
        null,
        1,
      ),
    ).rejects.toThrow(/last Source Declaration editor/);
    const rows = await connection.db.select().from(assets).where(eq(assets.id, assetId));
    expect(rows[0]).toMatchObject({
      sourceDeclarationEnabled: true,
      rightsStatus: "claimed",
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
        expectedVersion: 0,
        enabled: true,
        rightsStatus: "reviewed",
      },
    );
    await reviewSourceDeclaration(
      connection.db,
      assetId,
      { userId: reviewerId, role: "reviewer_publisher" },
      "approved",
      "allowed",
      null,
      1,
    );
    await updateSourceDeclaration(
      connection.db,
      assetId,
      { userId: editorId, role: "product_editor" },
      { expectedVersion: 2, enabled: true, rightsStatus: "changed-by-editor" },
    );
    const rows = await connection.db.select().from(assets).where(eq(assets.id, assetId));
    expect(rows[0]).toMatchObject({
      rightsStatus: "changed-by-editor",
      declarationReviewerUserId: null,
      declarationReviewDate: null,
      declarationReviewDecision: null,
      effectiveRightsDecision: "pending_review",
      declarationStatementVersion: 2,
      declarationRecordVersion: 3,
    });
    await connection.close();
  });

  it("records an explicit Admin Override with a mandatory reason", async () => {
    const connection = await createTestDatabase();
    const usersCreated = await connection.db.insert(users).values({
      email: "override-admin@example.test",
      displayName: "Override Admin",
      role: "admin",
      passwordHash: "test",
    }).returning({ id: users.id });
    const adminId = usersCreated[0]!.id;
    const assetId = await uploadAsset(connection.db, new InMemoryObjectStorage(), new DevelopmentFileScanner(), {
      fileName: "override.jpg",
      declaredMimeType: "image/jpeg",
      bytes: await testJpeg(),
      category: "product",
      purpose: "public_asset",
      uploadedByUserId: adminId,
    });
    await updateSourceDeclaration(connection.db, assetId, { userId: adminId, role: "admin" }, { expectedVersion: 0, enabled: true, rightsStatus: "restricted" });
    await expect(adminOverrideSourceDeclaration(connection.db, assetId, { userId: adminId, role: "admin" }, "allowed", null, 1, "")).rejects.toThrow(/reason/);
    await adminOverrideSourceDeclaration(connection.db, assetId, { userId: adminId, role: "admin" }, "allowed", null, 1, "Urgent verified exception for test.");
    const rows = await connection.db.select().from(assets).where(eq(assets.id, assetId));
    expect(rows[0]).toMatchObject({ declarationReviewDecision: "admin_override", declarationReviewerUserId: adminId });
    const audits = await connection.db.select().from(auditLogs).where(eq(auditLogs.entityId, assetId));
    expect(audits.some((row) => row.action === "asset.source_declaration.admin_override")).toBe(true);
    await connection.close();
  });

  it("rejects concurrent declaration edits and stale review or override versions", async () => {
    const connection = await createTestDatabase();
    const actorRows = await connection.db.insert(users).values([
      { email: "concurrency-editor@example.test", displayName: "Editor", role: "product_editor", passwordHash: "test" },
      { email: "concurrency-reviewer@example.test", displayName: "Reviewer", role: "reviewer_publisher", passwordHash: "test" },
      { email: "concurrency-admin@example.test", displayName: "Admin", role: "admin", passwordHash: "test" },
    ]).returning({ id: users.id, role: users.role });
    const editorId = actorRows.find((row) => row.role === "product_editor")!.id;
    const reviewerId = actorRows.find((row) => row.role === "reviewer_publisher")!.id;
    const adminId = actorRows.find((row) => row.role === "admin")!.id;
    const assetId = await uploadAsset(connection.db, new InMemoryObjectStorage(), new DevelopmentFileScanner(), {
      fileName: "concurrent-rights.jpg",
      declaredMimeType: "image/jpeg",
      bytes: await testJpeg(),
      category: "product",
      purpose: "public_asset",
      uploadedByUserId: editorId,
    });
    const edits = await Promise.allSettled([
      updateSourceDeclaration(connection.db, assetId, { userId: editorId, role: "product_editor" }, { expectedVersion: 0, enabled: true, rightsStatus: "editor-a" }),
      updateSourceDeclaration(connection.db, assetId, { userId: editorId, role: "product_editor" }, { expectedVersion: 0, enabled: true, rightsStatus: "editor-b" }),
    ]);
    expect(edits.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    expect(edits.filter((result) => result.status === "rejected")).toHaveLength(1);
    await expect(reviewSourceDeclaration(connection.db, assetId, { userId: reviewerId, role: "reviewer_publisher" }, "approved", "allowed", null, 0)).rejects.toThrow(/changed/);
    await expect(adminOverrideSourceDeclaration(connection.db, assetId, { userId: adminId, role: "admin" }, "allowed", null, 0, "Stale override test")).rejects.toThrow(/changed/);
    await connection.close();
  });

  it("requires an explicit current-version reviewer decision to restore public use and rolls review back with Audit failure", async () => {
    const connection = await createTestDatabase();
    const actorRows = await connection.db.insert(users).values([
      { email: "restore-editor@example.test", displayName: "Restore Editor", role: "product_editor", passwordHash: "test" },
      { email: "restore-reviewer@example.test", displayName: "Restore Reviewer", role: "reviewer_publisher", passwordHash: "test" },
    ]).returning({ id: users.id, role: users.role });
    const editorId = actorRows.find((row) => row.role === "product_editor")!.id;
    const reviewerId = actorRows.find((row) => row.role === "reviewer_publisher")!.id;
    const assetId = await uploadAsset(connection.db, new InMemoryObjectStorage(), new DevelopmentFileScanner(), {
      fileName: "reviewer-restore.jpg",
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
      { expectedVersion: 0, enabled: true, rightsStatus: "third-party" },
    );
    await reviewSourceDeclaration(
      connection.db,
      assetId,
      { userId: reviewerId, role: "reviewer_publisher" },
      "rejected",
      "not_allowed",
      null,
      1,
      "Public use is not licensed.",
    );
    await updateSourceDeclaration(
      connection.db,
      assetId,
      { userId: editorId, role: "product_editor" },
      { expectedVersion: 2, enabled: false },
    );
    let asset = (await connection.db.select().from(assets).where(eq(assets.id, assetId)))[0]!;
    expect(asset).toMatchObject({
      sourceDeclarationEnabled: false,
      effectiveRightsDecision: "not_allowed",
      declarationRecordVersion: 3,
    });
    expect(isPublicWebsiteUseAllowed(asset)).toBe(false);

    await updateSourceDeclaration(
      connection.db,
      assetId,
      { userId: editorId, role: "product_editor" },
      { expectedVersion: 3, enabled: true },
    );
    await reviewSourceDeclaration(
      connection.db,
      assetId,
      { userId: reviewerId, role: "reviewer_publisher" },
      "approved",
      "allowed",
      null,
      4,
      "License evidence was verified.",
    );
    asset = (await connection.db.select().from(assets).where(eq(assets.id, assetId)))[0]!;
    expect(asset).toMatchObject({
      effectiveRightsDecision: "allowed",
      declarationRecordVersion: 5,
    });
    expect(isPublicWebsiteUseAllowed(asset)).toBe(true);

    await expect(reviewSourceDeclaration(
      connection.db,
      assetId,
      { userId: reviewerId, role: "reviewer_publisher" },
      "rejected",
      "revoked",
      null,
      5,
      "Simulated revocation.",
      { auditWriter: async () => { throw new Error("simulated review audit failure"); } },
    )).rejects.toThrow(/simulated review audit failure/);
    asset = (await connection.db.select().from(assets).where(eq(assets.id, assetId)))[0]!;
    expect(asset).toMatchObject({
      effectiveRightsDecision: "allowed",
      declarationRecordVersion: 5,
    });
    await connection.close();
  });

  it("rolls back declaration content when its Audit Log write fails", async () => {
    const connection = await createTestDatabase();
    const actorRows = await connection.db.insert(users).values({
      email: "audit-rollback-editor@example.test",
      displayName: "Rollback Editor",
      role: "product_editor",
      passwordHash: "test",
    }).returning({ id: users.id });
    const editorId = actorRows[0]!.id;
    const assetId = await uploadAsset(connection.db, new InMemoryObjectStorage(), new DevelopmentFileScanner(), {
      fileName: "audit-rollback.jpg",
      declaredMimeType: "image/jpeg",
      bytes: await testJpeg(),
      category: "product",
      purpose: "public_asset",
      uploadedByUserId: editorId,
    });
    await expect(updateSourceDeclaration(
      connection.db,
      assetId,
      { userId: editorId, role: "product_editor" },
      { expectedVersion: 0, enabled: true, rightsStatus: "must-rollback" },
      { auditWriter: async () => { throw new Error("simulated audit failure"); } },
    )).rejects.toThrow(/simulated audit failure/);
    const asset = (await connection.db.select().from(assets).where(eq(assets.id, assetId)))[0]!;
    expect(asset).toMatchObject({
      sourceDeclarationEnabled: false,
      rightsStatus: null,
      declarationStatementVersion: 0,
      effectiveRightsDecision: null,
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
