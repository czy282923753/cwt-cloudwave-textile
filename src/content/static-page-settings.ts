import { and, desc, eq, gt, inArray } from "drizzle-orm";
import type { PgQueryResultHKT } from "drizzle-orm/pg-core/session";

import { runGovernedMutation, type GovernedMutationOptions } from "@/audit/governed-mutation";
import { requirePermission } from "@/auth/permissions";
import type { Actor } from "@/catalog/product-service";
import {
  assets,
  editorialRevisions,
  sitePageAssets,
  systemSettings,
} from "@/db/schema";
import type { AppDatabase } from "@/db/types";
import { publicReadyImageSqlConditions } from "@/uploads/asset-eligibility";
import {
  DEFAULT_STATIC_PAGE_CONFIGS,
  deriveStaticPageLivePlacements,
  expectedStaticPagePlacementRows,
  staticPageConfigSchema,
  staticPagePlacementProjectionMatches,
  type StaticPageConfig,
} from "./static-page-projection";

export {
  DEFAULT_STATIC_PAGE_CONFIGS,
  staticPageConfigSchema,
  type StaticPageConfig,
} from "./static-page-projection";

export class StaticPageProjectionMismatchError extends Error {
  constructor() {
    super("Applied static-page revision does not match the current live projection.");
    this.name = "StaticPageProjectionMismatchError";
  }
}

const ownedManufacturingKeys = new Set(["manufacturing_strength", "owned_manufacturing"]);

async function validateStaticPageAssets<TQueryResult extends PgQueryResultHKT>(
  db: AppDatabase<TQueryResult>,
  config: StaticPageConfig,
): Promise<void> {
  const livePlacements = deriveStaticPageLivePlacements(config);
  const assetIds = [...new Set(livePlacements.map((placement) => placement.assetId))];
  if (!assetIds.length) return;
  const rows = await db
    .select({
      id: assets.id,
      subjectRelationship: assets.subjectRelationship,
      isCwtOwnedFacility: assets.isCwtOwnedFacility,
    })
    .from(assets)
    .where(and(inArray(assets.id, assetIds), publicReadyImageSqlConditions()));
  if (rows.length !== assetIds.length) {
    throw new Error("Static-page media must use ready, scanned, rights-eligible public Assets.");
  }
  const byId = new Map(rows.map((row) => [row.id, row]));
  for (const placement of livePlacements) {
    if (!ownedManufacturingKeys.has(placement.placementKey)) continue;
    const asset = byId.get(placement.assetId);
    if (
      asset?.subjectRelationship !== "cwt" ||
      asset.isCwtOwnedFacility !== true
    ) {
      throw new Error("Manufacturing placements require verified CWT-owned facility media.");
    }
  }
}

export async function proposeStaticPageConfigRevision<
  TQueryResult extends PgQueryResultHKT,
>(
  db: AppDatabase<TQueryResult>,
  actor: Actor,
  input: StaticPageConfig,
  changeSummary: string,
  options: GovernedMutationOptions = {},
): Promise<string> {
  requirePermission(actor.role, "content.write");
  const config = staticPageConfigSchema.parse(input);
  if (!changeSummary.trim()) throw new Error("Static-page revision requires a change summary.");
  await validateStaticPageAssets(db, config);
  return runGovernedMutation(db, async ({ transaction, audit }) => {
    const key = `site_page.${config.pageKey}`;
    await transaction
      .insert(systemSettings)
      .values({ key, value: DEFAULT_STATIC_PAGE_CONFIGS[config.pageKey] })
      .onConflictDoNothing({ target: systemSettings.key });
    const settingRows = await transaction
      .select({ id: systemSettings.id })
      .from(systemSettings)
      .where(eq(systemSettings.key, key))
      .limit(1);
    const settingId = settingRows[0]?.id;
    if (!settingId) throw new Error("Static-page setting could not be resolved.");
    const latestRows = await transaction
      .select({ versionNumber: editorialRevisions.versionNumber })
      .from(editorialRevisions)
      .where(
        and(
          eq(editorialRevisions.entityType, "static_page"),
          eq(editorialRevisions.entityId, settingId),
          eq(editorialRevisions.locale, "en"),
        ),
      )
      .orderBy(desc(editorialRevisions.versionNumber))
      .limit(1);
    const revisionRows = await transaction
      .insert(editorialRevisions)
      .values({
        entityType: "static_page",
        entityId: settingId,
        locale: "en",
        versionNumber: (latestRows[0]?.versionNumber ?? 0) + 1,
        status: "in_review",
        snapshot: config,
        changeSummary: changeSummary.trim(),
        createdByUserId: actor.userId,
      })
      .returning({ id: editorialRevisions.id });
    const revisionId = revisionRows[0]?.id;
    if (!revisionId) throw new Error("Static-page revision insert failed.");
    await audit({
      actorUserId: actor.userId,
      action: "static_page.revision.proposed",
      entityType: "editorial_revision",
      entityId: revisionId,
      afterSummary: { pageKey: config.pageKey },
    });
    return revisionId;
  }, options);
}

export async function applyStaticPageConfigRevision<
  TQueryResult extends PgQueryResultHKT,
>(
  db: AppDatabase<TQueryResult>,
  actor: Actor,
  revisionId: string,
  options: GovernedMutationOptions = {},
): Promise<"home" | "about"> {
  requirePermission(actor.role, "content.publish");
  return runGovernedMutation(db, async ({ transaction, audit }) => {
    const revisionRows = await transaction
      .select()
      .from(editorialRevisions)
      .where(
        and(
          eq(editorialRevisions.id, revisionId),
          eq(editorialRevisions.entityType, "static_page"),
        ),
      )
      .limit(1)
      .for("update");
    const revision = revisionRows[0];
    if (!revision || (revision.status !== "in_review" && revision.status !== "applied")) {
      throw new Error("Static-page revision is not eligible for approval.");
    }
    const config = staticPageConfigSchema.parse(revision.snapshot);
    const settingRows = await transaction
      .select({ id: systemSettings.id, key: systemSettings.key, value: systemSettings.value })
      .from(systemSettings)
      .where(eq(systemSettings.id, revision.entityId))
      .limit(1)
      .for("update");
    const setting = settingRows[0];
    if (!setting || setting.key !== `site_page.${config.pageKey}`) {
      throw new StaticPageProjectionMismatchError();
    }
    if (revision.status === "applied") {
      const currentConfig = staticPageConfigSchema.safeParse(setting.value);
      const relationRows = await transaction
        .select({
          systemSettingId: sitePageAssets.systemSettingId,
          assetId: sitePageAssets.assetId,
          pageKey: sitePageAssets.pageKey,
          placementKey: sitePageAssets.placementKey,
          viewport: sitePageAssets.viewport,
          role: sitePageAssets.role,
          sortOrder: sitePageAssets.sortOrder,
          altText: sitePageAssets.altText,
          caption: sitePageAssets.caption,
          focalX: sitePageAssets.focalX,
          focalY: sitePageAssets.focalY,
          isVisible: sitePageAssets.isVisible,
        })
        .from(sitePageAssets)
        .where(eq(sitePageAssets.systemSettingId, revision.entityId));
      if (
        !currentConfig.success ||
        JSON.stringify(currentConfig.data) !== JSON.stringify(config) ||
        !staticPagePlacementProjectionMatches(revision.entityId, config, relationRows)
      ) {
        throw new StaticPageProjectionMismatchError();
      }
      return config.pageKey;
    }
    const newerRows = await transaction
      .select({ id: editorialRevisions.id })
      .from(editorialRevisions)
      .where(
        and(
          eq(editorialRevisions.entityType, "static_page"),
          eq(editorialRevisions.entityId, revision.entityId),
          gt(editorialRevisions.versionNumber, revision.versionNumber),
        ),
      )
      .limit(1);
    if (newerRows[0]) throw new Error("A newer static-page revision exists.");
    await validateStaticPageAssets(transaction, config);
    const liveRows = expectedStaticPagePlacementRows(revision.entityId, config);
    const updatedSettings = await transaction
      .update(systemSettings)
      .set({ value: config, updatedByUserId: actor.userId, updatedAt: new Date() })
      .where(eq(systemSettings.id, revision.entityId))
      .returning({ id: systemSettings.id });
    if (!updatedSettings[0]) throw new Error("Static-page setting was not found.");
    await transaction
      .delete(sitePageAssets)
      .where(eq(sitePageAssets.systemSettingId, revision.entityId));
    if (liveRows.length) {
      await transaction.insert(sitePageAssets).values(liveRows.map((placement) => ({
        ...placement,
        focalX: String(placement.focalX),
        focalY: String(placement.focalY),
      })));
    }
    const claimedRows = await transaction
      .update(editorialRevisions)
      .set({ status: "applied", reviewedByUserId: actor.userId, reviewedAt: new Date() })
      .where(
        and(
          eq(editorialRevisions.id, revisionId),
          eq(editorialRevisions.status, "in_review"),
        ),
      )
      .returning({ id: editorialRevisions.id });
    if (!claimedRows[0]) throw new StaticPageProjectionMismatchError();
    await audit({
      actorUserId: actor.userId,
      action: "static_page.revision.applied",
      entityType: "editorial_revision",
      entityId: revisionId,
      afterSummary: { pageKey: config.pageKey, placementCount: liveRows.length },
    });
    return config.pageKey;
  }, options);
}
