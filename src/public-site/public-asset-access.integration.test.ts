import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import { assets, authors, contentAssets, contents, users } from "@/db/schema";
import { createTestDatabase } from "@/test/database";

import { findPublicAssetForDelivery } from "./public-asset-access";

describe("public Asset delivery boundary", () => {
  it("fails closed for private, import, quarantined, and draft relations", async () => {
    const connection = await createTestDatabase();
    const userRows = await connection.db
      .insert(users)
      .values({
        email: "asset-boundary@example.test",
        displayName: "Asset Boundary",
        role: "content_editor",
        passwordHash: "test",
      })
      .returning({ id: users.id });
    const authorRows = await connection.db
      .insert(authors)
      .values({
        internalKey: "asset-boundary-author",
        displayName: "TEST Author",
        isOrganization: true,
      })
      .returning({ id: authors.id });
    const userId = userRows[0]?.id;
    const authorId = authorRows[0]?.id;
    if (!userId || !authorId) throw new Error("Missing public Asset fixtures.");
    const contentRows = await connection.db
      .insert(contents)
      .values([
        {
          channel: "fabric_knowledge",
          type: "article",
          status: "published",
          authorId,
          createdByUserId: userId,
        },
        {
          channel: "fabric_knowledge",
          type: "article",
          status: "draft",
          authorId,
          createdByUserId: userId,
        },
      ])
      .returning({ id: contents.id, status: contents.status });
    const publishedId = contentRows.find((row) => row.status === "published")?.id;
    const draftId = contentRows.find((row) => row.status === "draft")?.id;
    if (!publishedId || !draftId) throw new Error("Missing Content fixtures.");
    const assetRows = await connection.db
      .insert(assets)
      .values([
        {
          originalFileName: "private.jpg",
          storageProvider: "test",
          storagePartition: "private",
          objectKey: "boundary/private.jpg",
          access: "private",
          category: "content",
          status: "ready",
          scanStatus: "passed",
          declaredMimeType: "image/jpeg",
          detectedMimeType: "image/jpeg",
          byteSize: 10,
          sha256: "boundary-private",
        },
        {
          originalFileName: "import.jpg",
          storageProvider: "test",
          storagePartition: "imports",
          objectKey: "boundary/import.jpg",
          access: "internal",
          category: "content",
          status: "ready",
          scanStatus: "passed",
          declaredMimeType: "image/jpeg",
          detectedMimeType: "image/jpeg",
          byteSize: 10,
          sha256: "boundary-import",
        },
        {
          originalFileName: "quarantine.jpg",
          storageProvider: "test",
          storagePartition: "public",
          objectKey: "boundary/quarantine.jpg",
          access: "public",
          category: "content",
          status: "quarantined",
          scanStatus: "error",
          declaredMimeType: "image/jpeg",
          detectedMimeType: "image/jpeg",
          byteSize: 10,
          sha256: "boundary-quarantine",
        },
        {
          originalFileName: "draft.jpg",
          storageProvider: "test",
          storagePartition: "public",
          objectKey: "boundary/draft.jpg",
          access: "public",
          category: "content",
          status: "ready",
          scanStatus: "passed",
          declaredMimeType: "image/jpeg",
          detectedMimeType: "image/jpeg",
          byteSize: 10,
          sha256: "boundary-draft",
        },
        {
          originalFileName: "eligible.jpg",
          storageProvider: "test",
          storagePartition: "public",
          objectKey: "boundary/eligible.jpg",
          access: "public",
          category: "content",
          status: "ready",
          scanStatus: "passed",
          declaredMimeType: "image/jpeg",
          detectedMimeType: "image/jpeg",
          byteSize: 10,
          sha256: "boundary-eligible",
        },
      ])
      .returning({ id: assets.id, objectKey: assets.objectKey });
    const idByKey = new Map(assetRows.map((row) => [row.objectKey, row.id]));
    await connection.db.insert(contentAssets).values([
      "boundary/private.jpg",
      "boundary/import.jpg",
      "boundary/quarantine.jpg",
      "boundary/eligible.jpg",
    ].map((key, sortOrder) => ({
      contentId: publishedId,
      assetId: idByKey.get(key)!,
      sortOrder,
    })));
    await connection.db.insert(contentAssets).values({
      contentId: draftId,
      assetId: idByKey.get("boundary/draft.jpg")!,
    });

    for (const key of [
      "boundary/private.jpg",
      "boundary/import.jpg",
      "boundary/quarantine.jpg",
      "boundary/draft.jpg",
    ]) {
      await expect(findPublicAssetForDelivery(connection.db, idByKey.get(key)!)).resolves.toBeNull();
    }
    await expect(
      findPublicAssetForDelivery(connection.db, idByKey.get("boundary/eligible.jpg")!),
    ).resolves.toMatchObject({
      objectKey: "boundary/eligible.jpg",
      partition: "public",
    });
    await connection.db
      .update(assets)
      .set({
        sourceDeclarationEnabled: true,
        publicUsePermission: "not_allowed",
      })
      .where(eq(assets.id, idByKey.get("boundary/eligible.jpg")!));
    await expect(
      findPublicAssetForDelivery(connection.db, idByKey.get("boundary/eligible.jpg")!),
    ).resolves.toBeNull();
    await connection.db
      .update(assets)
      .set({
        sourceDeclarationEnabled: false,
        publicUsePermission: null,
      })
      .where(eq(assets.id, idByKey.get("boundary/eligible.jpg")!));
    await expect(
      findPublicAssetForDelivery(connection.db, idByKey.get("boundary/eligible.jpg")!),
    ).resolves.toMatchObject({ objectKey: "boundary/eligible.jpg" });
    await connection.db
      .update(contents)
      .set({ status: "archived" })
      .where(eq(contents.id, publishedId));
    await expect(
      findPublicAssetForDelivery(connection.db, idByKey.get("boundary/eligible.jpg")!),
    ).resolves.toBeNull();
    await connection.db
      .update(contents)
      .set({ status: "published" })
      .where(eq(contents.id, publishedId));
    await connection.db
      .delete(contentAssets)
      .where(eq(contentAssets.assetId, idByKey.get("boundary/eligible.jpg")!));
    await expect(
      findPublicAssetForDelivery(connection.db, idByKey.get("boundary/eligible.jpg")!),
    ).resolves.toBeNull();
    await connection.close();
  });
});
