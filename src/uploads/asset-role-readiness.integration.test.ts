import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import { publishFabricLibraryEntry } from "@/catalog/fabric-library-service";
import { publishContent } from "@/content/content-service";
import { verifyDatabaseReadiness } from "@/db/readiness";
import {
  assets,
  authors,
  contentAssets,
  contentLocalizations,
  contents,
  fabricLibraryEntries,
  fabricLibraryEntryAssets,
  fabricLibraryEntryLocalizations,
  routes,
  seoMetadata,
  users,
} from "@/db/schema";
import {
  queryFabricEntries,
  queryPublicContentImages,
} from "@/public-site/data";
import { createTestDatabase } from "@/test/database";

describe("Fabric and Content Asset role/MIME readiness", () => {
  it("rejects a PDF Fabric hero and hides a directly corrupted Published entry", async () => {
    const connection = await createTestDatabase();
    const reviewerRows = await connection.db.insert(users).values({
      email: "fabric-mime-reviewer@example.test",
      displayName: "Fabric MIME Reviewer",
      role: "reviewer_publisher",
      passwordHash: "test",
    }).returning({ id: users.id });
    const actor = { userId: reviewerRows[0]!.id, role: "reviewer_publisher" as const };
    const entryRows = await connection.db.insert(fabricLibraryEntries).values({
      status: "in_review",
    }).returning({ id: fabricLibraryEntries.id });
    const entryId = entryRows[0]!.id;
    await connection.db.insert(fabricLibraryEntryLocalizations).values({
      fabricEntryId: entryId,
      locale: "en",
      title: "TEST Fabric MIME Entry",
    });
    const routeRows = await connection.db.insert(routes).values({
      path: "/fabric-library/test-fabric-mime-entry/",
      entityType: "fabric_entry",
      entityId: entryId,
      locale: "en",
    }).returning({ id: routes.id });
    await connection.db.insert(seoMetadata).values({
      routeId: routeRows[0]!.id,
      indexStatus: "noindex",
    });
    const assetRows = await connection.db.insert(assets).values({
      originalFileName: "fabric-certificate.pdf",
      storageProvider: "test",
      storagePartition: "public",
      objectKey: "mime/fabric-certificate.pdf",
      access: "public",
      category: "certificate",
      status: "ready",
      scanStatus: "passed",
      declaredMimeType: "application/pdf",
      detectedMimeType: "application/pdf",
      byteSize: 10,
      sha256: "fabric-pdf-role",
    }).returning({ id: assets.id });
    const assetId = assetRows[0]!.id;
    await connection.db.insert(fabricLibraryEntryAssets).values({
      fabricEntryId: entryId,
      assetId,
      role: "hero",
    });
    await expect(
      publishFabricLibraryEntry(connection.db, actor, entryId),
    ).rejects.toThrow(/scanned public image/);

    await connection.db.update(assets).set({
      declaredMimeType: "image/jpeg",
      detectedMimeType: "image/jpeg",
    }).where(eq(assets.id, assetId));
    await publishFabricLibraryEntry(connection.db, actor, entryId);
    expect((await queryFabricEntries(connection.db)).map((row) => row.id)).toContain(entryId);
    await connection.db.update(assets).set({
      declaredMimeType: "application/pdf",
      detectedMimeType: "application/pdf",
    }).where(eq(assets.id, assetId));
    const readiness = await verifyDatabaseReadiness(connection.db);
    expect(readiness.publishedFabricAssetFailures).toBeGreaterThan(0);
    expect(readiness.publishedFabricWithoutUsableImage).toBeGreaterThan(0);
    expect((await queryFabricEntries(connection.db)).map((row) => row.id)).not.toContain(entryId);
    await connection.close();
  });

  it("allows a PDF document attachment but rejects it as a Content cover", async () => {
    const connection = await createTestDatabase();
    const reviewerRows = await connection.db.insert(users).values({
      email: "content-mime-reviewer@example.test",
      displayName: "Content MIME Reviewer",
      role: "reviewer_publisher",
      passwordHash: "test",
    }).returning({ id: users.id });
    const authorRows = await connection.db.insert(authors).values({
      internalKey: "content-mime-author",
      displayName: "TEST Content MIME Author",
    }).returning({ id: authors.id });
    const actor = { userId: reviewerRows[0]!.id, role: "reviewer_publisher" as const };
    const contentRows = await connection.db.insert(contents).values({
      channel: "fabric_knowledge",
      authorId: authorRows[0]!.id,
      status: "in_review",
    }).returning({ id: contents.id });
    const contentId = contentRows[0]!.id;
    await connection.db.insert(contentLocalizations).values({
      contentId,
      locale: "en",
      title: "TEST Content PDF Role",
      body: "TEST body",
    });
    const assetRows = await connection.db.insert(assets).values({
      originalFileName: "report.pdf",
      storageProvider: "test",
      storagePartition: "public",
      objectKey: "mime/report.pdf",
      access: "public",
      category: "content",
      status: "ready",
      scanStatus: "passed",
      declaredMimeType: "application/pdf",
      detectedMimeType: "application/pdf",
      byteSize: 10,
      sha256: "content-pdf-role",
    }).returning({ id: assets.id });
    const assetId = assetRows[0]!.id;
    await connection.db.insert(contentAssets).values({
      contentId,
      assetId,
      role: "cover",
    });
    await expect(publishContent(connection.db, actor, contentId)).rejects.toThrow(/role or MIME/);
    await connection.db.update(contentAssets).set({ role: "document" }).where(eq(contentAssets.assetId, assetId));
    await publishContent(connection.db, actor, contentId);
    expect((await verifyDatabaseReadiness(connection.db)).publishedContentAssetFailures).toBe(0);
    expect(await queryPublicContentImages(connection.db, contentId)).toHaveLength(0);

    await connection.db.update(contentAssets).set({ role: "cover" }).where(eq(contentAssets.assetId, assetId));
    expect((await verifyDatabaseReadiness(connection.db)).publishedContentAssetFailures).toBeGreaterThan(0);
    expect(await queryPublicContentImages(connection.db, contentId)).toHaveLength(0);
    await connection.close();
  });
});
