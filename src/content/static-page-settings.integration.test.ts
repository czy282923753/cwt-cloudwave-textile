import { and, eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import {
  assets,
  auditLogs,
  companyFacts,
  editorialRevisions,
  sitePageAssets,
  systemSettings,
  users,
} from "@/db/schema";
import { findPublicAssetForDelivery } from "@/public-site/public-asset-access";
import { listVerifiedPublicCompanyFacts } from "./company-facts-service";
import { createTestDatabase } from "@/test/database";

import {
  applyStaticPageConfigRevision,
  DEFAULT_STATIC_PAGE_CONFIGS,
  proposeStaticPageConfigRevision,
  saveStaticPageConfigDraft,
  StaticPageProjectionMismatchError,
  submitStaticPageConfigDraftForReview,
} from "./static-page-settings";

async function setup() {
  const connection = await createTestDatabase();
  const userRows = await connection.db.insert(users).values([
    { email: `page-editor-${crypto.randomUUID()}@example.test`, displayName: "Page Editor", role: "content_editor", passwordHash: "test" },
    { email: `page-reviewer-${crypto.randomUUID()}@example.test`, displayName: "Page Reviewer", role: "reviewer_publisher", passwordHash: "test" },
    { email: `page-sales-${crypto.randomUUID()}@example.test`, displayName: "Page Sales", role: "sales", passwordHash: "test" },
  ]).returning({ id: users.id, role: users.role });
  const assetRows = await connection.db.insert(assets).values([0, 1].map((index) => ({
    originalFileName: `TEST-page-${index}.jpg`,
    storageProvider: "test",
    storagePartition: "public" as const,
    objectKey: `test/page-${crypto.randomUUID()}.jpg`,
    access: "public" as const,
    category: "company" as const,
    status: "ready" as const,
    scanStatus: "passed" as const,
    declaredMimeType: "image/jpeg",
    detectedMimeType: "image/jpeg",
    byteSize: 100,
    sha256: `stage1-page-${crypto.randomUUID()}`,
  }))).returning({ id: assets.id });
  return {
    connection,
    editor: { userId: userRows.find((row) => row.role === "content_editor")!.id, role: "content_editor" as const },
    reviewer: { userId: userRows.find((row) => row.role === "reviewer_publisher")!.id, role: "reviewer_publisher" as const },
    sales: { userId: userRows.find((row) => row.role === "sales")!.id, role: "sales" as const },
    assetIds: assetRows.map((row) => row.id),
  };
}

function heroConfig(assetId: string, enabled = true) {
  return {
    ...DEFAULT_STATIC_PAGE_CONFIGS.home,
    modules: { ...DEFAULT_STATIC_PAGE_CONFIGS.home.modules, hero: enabled },
    placements: [{
      assetId,
      placementKey: "hero" as const,
      viewport: "desktop" as const,
      role: "hero" as const,
      sortOrder: 0,
      altText: "Synthetic Home hero",
      caption: null,
      focalX: 50,
      focalY: 50,
      overlayOpacity: 0.35,
      isVisible: true,
    }],
  };
}

async function appliedAuditCount(
  connection: Awaited<ReturnType<typeof createTestDatabase>>,
  revisionId: string,
) {
  return (await connection.db.select({ id: auditLogs.id }).from(auditLogs).where(and(
    eq(auditLogs.entityId, revisionId),
    eq(auditLogs.action, "static_page.revision.applied"),
  ))).length;
}

describe("static-page authoritative live projection", () => {
  it("returns idempotent success for the same applied revision without duplicate relations", async () => {
    const test = await setup();
    const revisionId = await proposeStaticPageConfigRevision(test.connection.db, test.editor, heroConfig(test.assetIds[0]!), "First apply");
    await expect(applyStaticPageConfigRevision(test.connection.db, test.reviewer, revisionId)).resolves.toBe("home");
    await expect(applyStaticPageConfigRevision(test.connection.db, test.reviewer, revisionId)).resolves.toBe("home");
    expect(await test.connection.db.select().from(sitePageAssets)).toHaveLength(1);
    await test.connection.close();
  });

  it("does not write a second success Audit on repeat Apply", async () => {
    const test = await setup();
    const revisionId = await proposeStaticPageConfigRevision(test.connection.db, test.editor, heroConfig(test.assetIds[0]!), "Audit idempotency");
    await applyStaticPageConfigRevision(test.connection.db, test.reviewer, revisionId);
    await applyStaticPageConfigRevision(test.connection.db, test.reviewer, revisionId);
    expect(await appliedAuditCount(test.connection, revisionId)).toBe(1);
    await test.connection.close();
  });

  it("treats a response-loss retry as the same successful business result", async () => {
    const test = await setup();
    const revisionId = await proposeStaticPageConfigRevision(test.connection.db, test.editor, heroConfig(test.assetIds[0]!), "Response loss retry");
    const firstBusinessResult = await applyStaticPageConfigRevision(test.connection.db, test.reviewer, revisionId);
    const retriedBusinessResult = await applyStaticPageConfigRevision(test.connection.db, test.reviewer, revisionId);
    expect(retriedBusinessResult).toBe(firstBusinessResult);
    expect(await appliedAuditCount(test.connection, revisionId)).toBe(1);
    await test.connection.close();
  });

  it("fails closed with a typed error when an Applied projection drifts", async () => {
    const test = await setup();
    const revisionId = await proposeStaticPageConfigRevision(test.connection.db, test.editor, heroConfig(test.assetIds[0]!), "Mismatch detection");
    await applyStaticPageConfigRevision(test.connection.db, test.reviewer, revisionId);
    await test.connection.db.update(sitePageAssets).set({ isVisible: false });
    await expect(applyStaticPageConfigRevision(test.connection.db, test.reviewer, revisionId))
      .rejects.toBeInstanceOf(StaticPageProjectionMismatchError);
    expect((await test.connection.db.select().from(sitePageAssets))[0]?.isVisible).toBe(false);
    await test.connection.close();
  });

  it("does not persist or deliver visible placements whose module is disabled", async () => {
    const test = await setup();
    const revisionId = await proposeStaticPageConfigRevision(test.connection.db, test.editor, heroConfig(test.assetIds[0]!, false), "Disabled module");
    await applyStaticPageConfigRevision(test.connection.db, test.reviewer, revisionId);
    expect(await test.connection.db.select().from(sitePageAssets)).toHaveLength(0);
    await expect(findPublicAssetForDelivery(test.connection.db, test.assetIds[0]!)).resolves.toBeNull();
    await test.connection.close();
  });

  it("revokes the known public Asset immediately when a newly approved revision disables its module", async () => {
    const test = await setup();
    const enabledId = await proposeStaticPageConfigRevision(test.connection.db, test.editor, heroConfig(test.assetIds[0]!), "Enable hero");
    await applyStaticPageConfigRevision(test.connection.db, test.reviewer, enabledId);
    await expect(findPublicAssetForDelivery(test.connection.db, test.assetIds[0]!)).resolves.toMatchObject({ id: test.assetIds[0] });
    const disabledId = await proposeStaticPageConfigRevision(test.connection.db, test.editor, heroConfig(test.assetIds[0]!, false), "Disable hero");
    await applyStaticPageConfigRevision(test.connection.db, test.reviewer, disabledId);
    await expect(findPublicAssetForDelivery(test.connection.db, test.assetIds[0]!)).resolves.toBeNull();
    await test.connection.close();
  });

  it("re-enables only the placement explicitly present in the new approved revision", async () => {
    const test = await setup();
    const firstId = await proposeStaticPageConfigRevision(test.connection.db, test.editor, heroConfig(test.assetIds[0]!), "Initial hero");
    await applyStaticPageConfigRevision(test.connection.db, test.reviewer, firstId);
    const disabledId = await proposeStaticPageConfigRevision(test.connection.db, test.editor, heroConfig(test.assetIds[0]!, false), "Disable old hero");
    await applyStaticPageConfigRevision(test.connection.db, test.reviewer, disabledId);
    const secondId = await proposeStaticPageConfigRevision(test.connection.db, test.editor, heroConfig(test.assetIds[1]!), "Approve replacement hero");
    await applyStaticPageConfigRevision(test.connection.db, test.reviewer, secondId);
    await expect(findPublicAssetForDelivery(test.connection.db, test.assetIds[0]!)).resolves.toBeNull();
    await expect(findPublicAssetForDelivery(test.connection.db, test.assetIds[1]!)).resolves.toMatchObject({ id: test.assetIds[1] });
    await test.connection.close();
  });

  it("rolls back Setting, relations, and Revision when Required Audit fails, then allows retry", async () => {
    const test = await setup();
    const revisionId = await proposeStaticPageConfigRevision(test.connection.db, test.editor, heroConfig(test.assetIds[0]!), "Audit rollback");
    await expect(applyStaticPageConfigRevision(test.connection.db, test.reviewer, revisionId, {
      auditWriter: async () => { throw new Error("TEST required Audit failure"); },
    })).rejects.toThrow(/required Audit failure/);
    const [setting] = await test.connection.db.select({ value: systemSettings.value }).from(systemSettings);
    const [revision] = await test.connection.db.select({ status: editorialRevisions.status }).from(editorialRevisions).where(eq(editorialRevisions.id, revisionId));
    expect(setting?.value).toEqual(DEFAULT_STATIC_PAGE_CONFIGS.home);
    expect(await test.connection.db.select().from(sitePageAssets)).toHaveLength(0);
    expect(revision?.status).toBe("in_review");
    await expect(applyStaticPageConfigRevision(test.connection.db, test.reviewer, revisionId)).resolves.toBe("home");
    await test.connection.close();
  });

  it("serializes concurrent Apply calls into one first commit and one safe idempotent result", async () => {
    const test = await setup();
    const revisionId = await proposeStaticPageConfigRevision(test.connection.db, test.editor, heroConfig(test.assetIds[0]!), "Concurrent apply");
    await expect(Promise.all([
      applyStaticPageConfigRevision(test.connection.db, test.reviewer, revisionId),
      applyStaticPageConfigRevision(test.connection.db, test.reviewer, revisionId),
    ])).resolves.toEqual(["home", "home"]);
    expect(await appliedAuditCount(test.connection, revisionId)).toBe(1);
    expect(await test.connection.db.select().from(sitePageAssets)).toHaveLength(1);
    await test.connection.close();
  });

  it("denies an unauthorized role before protected Apply state can be read or changed", async () => {
    const test = await setup();
    const revisionId = await proposeStaticPageConfigRevision(test.connection.db, test.editor, heroConfig(test.assetIds[0]!), "Permission boundary");
    await expect(applyStaticPageConfigRevision(test.connection.db, test.sales, revisionId)).rejects.toThrow(/permission/i);
    expect((await test.connection.db.select({ status: editorialRevisions.status }).from(editorialRevisions).where(eq(editorialRevisions.id, revisionId)))[0]?.status)
      .toBe("in_review");
    await test.connection.close();
  });

  it("accepts only verified public Company Facts in a fixed-page Draft", async () => {
    const test = await setup();
    const config = {
      ...DEFAULT_STATIC_PAGE_CONFIGS.home,
      copy: {
        ...DEFAULT_STATIC_PAGE_CONFIGS.home.copy!,
        manufacturingStrength: {
          ...DEFAULT_STATIC_PAGE_CONFIGS.home.copy!.manufacturingStrength,
          factKeys: ["test-owned-facility"],
        },
      },
    };
    await expect(saveStaticPageConfigDraft(
      test.connection.db,
      test.editor,
      config,
    )).rejects.toThrow(/verified and approved/);
    expect((await listVerifiedPublicCompanyFacts(test.connection.db)).has("test-owned-facility"))
      .toBe(false);
    const factRows = await test.connection.db.insert(companyFacts).values({
      factKey: "test-owned-facility",
      subject: "TEST owned facility",
      statement: "Synthetic verified CWT-owned facility fact.",
      relationshipToCwt: "owned",
      evidenceReference: "TEST evidence reference",
      publicUseAllowed: true,
      verificationStatus: "verified",
      verifiedByUserId: test.reviewer.userId,
      verifiedAt: new Date(),
    }).returning({ id: companyFacts.id });
    await expect(saveStaticPageConfigDraft(
      test.connection.db,
      test.editor,
      config,
    )).resolves.toMatchObject({ revisionVersion: 1 });
    await test.connection.db.update(companyFacts).set({
      reviewAfter: new Date(Date.now() - 1_000),
    }).where(eq(companyFacts.id, factRows[0]!.id));
    await expect(saveStaticPageConfigDraft(
      test.connection.db,
      test.editor,
      config,
    )).rejects.toThrow(/verified and approved/);
    await test.connection.close();
  });

  it("rejects non-owned facility media from manufacturing placements", async () => {
    const test = await setup();
    const placement = {
      assetId: test.assetIds[0]!,
      placementKey: "manufacturing_strength" as const,
      viewport: "desktop" as const,
      role: "detail" as const,
      sortOrder: 0,
      altText: "Synthetic facility",
      caption: null,
      focalX: 50,
      focalY: 50,
      overlayOpacity: 0.2,
      isVisible: true,
    };
    await expect(saveStaticPageConfigDraft(test.connection.db, test.editor, {
      ...DEFAULT_STATIC_PAGE_CONFIGS.home,
      placements: [placement],
    })).rejects.toThrow(/CWT-owned facility/);
    await test.connection.db.update(assets).set({
      subjectRelationship: "cwt",
      isCwtOwnedFacility: true,
    }).where(eq(assets.id, test.assetIds[0]!));
    const ownedDraft = await saveStaticPageConfigDraft(test.connection.db, test.editor, {
      ...DEFAULT_STATIC_PAGE_CONFIGS.home,
      placements: [placement],
    });
    await submitStaticPageConfigDraftForReview(
      test.connection.db,
      test.editor,
      ownedDraft.revisionId,
    );
    await applyStaticPageConfigRevision(
      test.connection.db,
      test.reviewer,
      ownedDraft.revisionId,
    );
    await expect(findPublicAssetForDelivery(test.connection.db, test.assetIds[0]!))
      .resolves.toBeNull();
    const factRows = await test.connection.db.insert(companyFacts).values({
      factKey: "test-owned-delivery",
      subject: "TEST owned delivery",
      statement: "Synthetic verified owned facility statement.",
      relationshipToCwt: "owned",
      evidenceReference: "TEST owned delivery evidence",
      publicUseAllowed: true,
      verificationStatus: "verified",
      verifiedByUserId: test.reviewer.userId,
      verifiedAt: new Date(),
    }).returning({ id: companyFacts.id });
    const evidencedDraft = await saveStaticPageConfigDraft(test.connection.db, test.editor, {
      ...DEFAULT_STATIC_PAGE_CONFIGS.home,
      copy: {
        ...DEFAULT_STATIC_PAGE_CONFIGS.home.copy!,
        manufacturingStrength: { factKeys: ["test-owned-delivery"] },
      },
      placements: [placement],
    });
    await submitStaticPageConfigDraftForReview(
      test.connection.db,
      test.editor,
      evidencedDraft.revisionId,
    );
    await applyStaticPageConfigRevision(
      test.connection.db,
      test.reviewer,
      evidencedDraft.revisionId,
    );
    await expect(findPublicAssetForDelivery(test.connection.db, test.assetIds[0]!))
      .resolves.toMatchObject({ id: test.assetIds[0] });
    await test.connection.db.update(companyFacts).set({ publicUseAllowed: false }).where(
      eq(companyFacts.id, factRows[0]!.id),
    );
    await expect(findPublicAssetForDelivery(test.connection.db, test.assetIds[0]!))
      .resolves.toBeNull();
    await test.connection.db.update(companyFacts).set({ publicUseAllowed: true }).where(
      eq(companyFacts.id, factRows[0]!.id),
    );
    await test.connection.db.update(assets).set({
      subjectRelationship: "partner_factory",
    }).where(eq(assets.id, test.assetIds[0]!));
    await expect(findPublicAssetForDelivery(test.connection.db, test.assetIds[0]!))
      .resolves.toBeNull();
    await test.connection.db.update(assets).set({
      subjectRelationship: "cwt",
      isCwtOwnedFacility: false,
    }).where(eq(assets.id, test.assetIds[0]!));
    await expect(findPublicAssetForDelivery(test.connection.db, test.assetIds[0]!))
      .resolves.toBeNull();
    await test.connection.db.update(assets).set({
      isCwtOwnedFacility: true,
      effectiveRightsDecision: "revoked",
    }).where(eq(assets.id, test.assetIds[0]!));
    await expect(findPublicAssetForDelivery(test.connection.db, test.assetIds[0]!))
      .resolves.toBeNull();
    await test.connection.db.update(assets).set({
      effectiveRightsDecision: null,
      scanStatus: "failed",
    }).where(eq(assets.id, test.assetIds[0]!));
    await expect(findPublicAssetForDelivery(test.connection.db, test.assetIds[0]!))
      .resolves.toBeNull();
    await test.connection.db.update(assets).set({
      scanStatus: "passed",
      deletedAt: new Date(),
    }).where(eq(assets.id, test.assetIds[0]!));
    await expect(findPublicAssetForDelivery(test.connection.db, test.assetIds[0]!))
      .resolves.toBeNull();
    await test.connection.db.update(assets).set({ deletedAt: null }).where(
      eq(assets.id, test.assetIds[0]!),
    );
    await test.connection.db.update(sitePageAssets).set({ isVisible: false }).where(
      eq(sitePageAssets.assetId, test.assetIds[0]!),
    );
    await expect(findPublicAssetForDelivery(test.connection.db, test.assetIds[0]!))
      .resolves.toBeNull();
    await test.connection.db.update(sitePageAssets).set({ isVisible: true }).where(
      eq(sitePageAssets.assetId, test.assetIds[0]!),
    );
    await test.connection.db.update(companyFacts).set({
      reviewAfter: new Date(Date.now() - 1_000),
    }).where(eq(companyFacts.id, factRows[0]!.id));
    await expect(findPublicAssetForDelivery(test.connection.db, test.assetIds[0]!))
      .resolves.toBeNull();
    await test.connection.db.update(companyFacts).set({
      reviewAfter: null,
      verificationStatus: "rejected",
    }).where(eq(companyFacts.id, factRows[0]!.id));
    await expect(findPublicAssetForDelivery(test.connection.db, test.assetIds[0]!))
      .resolves.toBeNull();
    await test.connection.db.delete(companyFacts).where(eq(companyFacts.id, factRows[0]!.id));
    await expect(findPublicAssetForDelivery(test.connection.db, test.assetIds[0]!))
      .resolves.toBeNull();
    await test.connection.close();
  });

  it("uses one version-checked Draft, supports response-loss retry, and requires explicit Review", async () => {
    const test = await setup();
    const first = await saveStaticPageConfigDraft(
      test.connection.db,
      test.editor,
      DEFAULT_STATIC_PAGE_CONFIGS.about,
    );
    await expect(saveStaticPageConfigDraft(
      test.connection.db,
      test.editor,
      DEFAULT_STATIC_PAGE_CONFIGS.about,
    )).resolves.toEqual(first);
    const changed = {
      ...DEFAULT_STATIC_PAGE_CONFIGS.about,
      modules: {
        ...DEFAULT_STATIC_PAGE_CONFIGS.about.modules,
        service_strength: false,
      },
    };
    const second = await saveStaticPageConfigDraft(
      test.connection.db,
      test.editor,
      changed,
      first.revisionId,
      first.revisionVersion,
    );
    expect(second.revisionVersion).toBe(2);
    await expect(saveStaticPageConfigDraft(
      test.connection.db,
      test.editor,
      { ...changed, modules: { ...changed.modules, introduction: false } },
      first.revisionId,
      first.revisionVersion,
    )).rejects.toThrow(/changed in another editor/);
    await submitStaticPageConfigDraftForReview(
      test.connection.db,
      test.editor,
      first.revisionId,
    );
    expect((await test.connection.db.select({
      status: editorialRevisions.status,
    }).from(editorialRevisions).where(eq(editorialRevisions.id, first.revisionId)))[0]?.status)
      .toBe("in_review");
    await expect(applyStaticPageConfigRevision(
      test.connection.db,
      test.reviewer,
      first.revisionId,
    )).resolves.toBe("about");
    await test.connection.close();
  });
});
