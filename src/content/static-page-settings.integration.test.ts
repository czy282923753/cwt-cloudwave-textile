import { and, eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import {
  assets,
  auditLogs,
  sitePageAssets,
  systemSettings,
  users,
} from "@/db/schema";
import { createTestDatabase } from "@/test/database";
import { findPublicAssetForDelivery } from "@/public-site/public-asset-access";

import {
  applyStaticPageConfigRevision,
  DEFAULT_STATIC_PAGE_CONFIGS,
  proposeStaticPageConfigRevision,
} from "./static-page-settings";

describe("static-page approved config and Asset relationship", () => {
  it("applies only reviewed, eligible CWT-owned manufacturing media with Audit", async () => {
    const connection = await createTestDatabase();
    const userRows = await connection.db.insert(users).values([
      { email: "page-editor@example.test", displayName: "Page Editor", role: "content_editor", passwordHash: "test" },
      { email: "page-reviewer@example.test", displayName: "Page Reviewer", role: "reviewer_publisher", passwordHash: "test" },
    ]).returning({ id: users.id, role: users.role });
    const editorId = userRows.find((row) => row.role === "content_editor")!.id;
    const reviewerId = userRows.find((row) => row.role === "reviewer_publisher")!.id;
    const assetRows = await connection.db.insert(assets).values([
      {
        originalFileName: "TEST-cwt-owned.jpg",
        storageProvider: "test",
        storagePartition: "public",
        objectKey: "test/cwt-owned.jpg",
        access: "public",
        category: "factory",
        status: "ready",
        scanStatus: "passed",
        declaredMimeType: "image/jpeg",
        detectedMimeType: "image/jpeg",
        byteSize: 100,
        sha256: "stage1-owned-page",
        subjectRelationship: "cwt",
        isCwtOwnedFacility: true,
      },
      {
        originalFileName: "TEST-partner.jpg",
        storageProvider: "test",
        storagePartition: "public",
        objectKey: "test/partner.jpg",
        access: "public",
        category: "factory",
        status: "ready",
        scanStatus: "passed",
        declaredMimeType: "image/jpeg",
        detectedMimeType: "image/jpeg",
        byteSize: 100,
        sha256: "stage1-partner-page",
        subjectRelationship: "partner_factory",
        isCwtOwnedFacility: false,
      },
    ]).returning({ id: assets.id, subject: assets.subjectRelationship });
    const ownedId = assetRows.find((row) => row.subject === "cwt")!.id;
    const partnerId = assetRows.find((row) => row.subject === "partner_factory")!.id;
    const placement = {
      placementKey: "manufacturing_strength" as const,
      viewport: "desktop" as const,
      role: "hero" as const,
      sortOrder: 0,
      altText: "Synthetic CWT-owned facility test image",
      caption: null,
      focalX: 50,
      focalY: 50,
      overlayOpacity: 0.35,
      isVisible: true,
    };
    await expect(proposeStaticPageConfigRevision(
      connection.db,
      { userId: editorId, role: "content_editor" },
      { ...DEFAULT_STATIC_PAGE_CONFIGS.home, placements: [{ ...placement, assetId: partnerId }] },
      "Synthetic partner rejection",
    )).rejects.toThrow(/CWT-owned/);

    const revisionId = await proposeStaticPageConfigRevision(
      connection.db,
      { userId: editorId, role: "content_editor" },
      { ...DEFAULT_STATIC_PAGE_CONFIGS.home, placements: [{ ...placement, assetId: ownedId }] },
      "Synthetic approved Home media",
    );
    await applyStaticPageConfigRevision(
      connection.db,
      { userId: reviewerId, role: "reviewer_publisher" },
      revisionId,
    );
    await expect(applyStaticPageConfigRevision(
      connection.db,
      { userId: reviewerId, role: "reviewer_publisher" },
      revisionId,
    )).rejects.toThrow(/not eligible/);
    const settingRows = await connection.db.select({ id: systemSettings.id, value: systemSettings.value })
      .from(systemSettings)
      .where(eq(systemSettings.key, "site_page.home"));
    expect(settingRows[0]?.value).toMatchObject({ pageKey: "home", version: 1 });
    const relationRows = await connection.db.select().from(sitePageAssets)
      .where(eq(sitePageAssets.systemSettingId, settingRows[0]!.id));
    expect(relationRows).toHaveLength(1);
    expect(relationRows[0]).toMatchObject({
      assetId: ownedId,
      pageKey: "home",
      placementKey: "manufacturing_strength",
      viewport: "desktop",
      isVisible: true,
    });
    const audits = await connection.db.select({ action: auditLogs.action }).from(auditLogs).where(and(
      eq(auditLogs.entityId, revisionId),
      eq(auditLogs.action, "static_page.revision.applied"),
    ));
    expect(audits).toHaveLength(1);
    await expect(findPublicAssetForDelivery(connection.db, ownedId)).resolves.toMatchObject({
      id: ownedId,
      partition: "public",
    });
    await connection.db.update(sitePageAssets).set({ isVisible: false }).where(eq(sitePageAssets.assetId, ownedId));
    await expect(findPublicAssetForDelivery(connection.db, ownedId)).resolves.toBeNull();
    await connection.close();
  });
});
