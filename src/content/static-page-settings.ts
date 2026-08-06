import { and, desc, eq, gt, inArray } from "drizzle-orm";
import type { PgQueryResultHKT } from "drizzle-orm/pg-core/session";
import { z } from "zod";

import { runGovernedMutation, type GovernedMutationOptions } from "@/audit/governed-mutation";
import type { Actor } from "@/catalog/product-service";
import {
  assets,
  companyFacts,
  editorialRevisions,
  sitePageAssets,
  systemSettings,
} from "@/db/schema";
import type { AppDatabase } from "@/db/types";
import { EditorialDraftConflictError } from "@/editorial/conflict";
import { currentPublicCompanyFactConditions } from "./company-facts-service";
import { requireEditorialResourceAccess } from "@/admin/preview-policy";
import { publicReadyImageSqlConditions } from "@/uploads/asset-eligibility";
import {
  DEFAULT_STATIC_PAGE_CONFIGS,
  deriveStaticPageLivePlacements,
  expectedStaticPagePlacementRows,
  isStaticPageFactSensitivePlacement,
  projectStaticPageEvidenceGates,
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

const staticPageDraftSnapshotSchema = z.object({
  kind: z.literal("static_page_config_v1"),
  config: staticPageConfigSchema,
  draftVersion: z.number().int().positive(),
}).strict();

function parseStaticPageRevisionConfig(input: unknown): StaticPageConfig {
  const draft = staticPageDraftSnapshotSchema.safeParse(input);
  return draft.success ? draft.data.config : staticPageConfigSchema.parse(input);
}

export interface StaticPageDraftSaveResult {
  revisionId: string;
  revisionVersion: number;
}

async function validateStaticPageAssets<TQueryResult extends PgQueryResultHKT>(
  db: AppDatabase<TQueryResult>,
  config: StaticPageConfig,
): Promise<void> {
  const livePlacements = deriveStaticPageLivePlacements(config);
  const factKeys = config.pageKey === "home"
    ? config.copy?.manufacturingStrength.factKeys ?? []
    : config.copy?.ownedManufacturing.factKeys ?? [];
  const factRows = factKeys.length
    ? await db
      .select({ key: companyFacts.factKey })
      .from(companyFacts)
      .where(and(
        inArray(companyFacts.factKey, factKeys),
        currentPublicCompanyFactConditions(),
      ))
    : [];
  if (factKeys.length) {
    if (new Set(factRows.map((row) => row.key)).size !== factKeys.length) {
      throw new Error("Static-page Company Facts must be verified and approved for public use.");
    }
  }
  const assetIds = [...new Set(livePlacements.map((placement) => placement.assetId))];
  const rows = assetIds.length ? await db
    .select({
      id: assets.id,
      subjectRelationship: assets.subjectRelationship,
      isCwtOwnedFacility: assets.isCwtOwnedFacility,
    })
    .from(assets)
    .where(and(inArray(assets.id, assetIds), publicReadyImageSqlConditions())) : [];
  if (rows.length !== assetIds.length) {
    throw new Error("Static-page media must use ready, scanned, rights-eligible public Assets.");
  }
  const byId = new Map(rows.map((row) => [row.id, row]));
  for (const placement of livePlacements) {
    if (!isStaticPageFactSensitivePlacement(placement.placementKey)) continue;
    const asset = byId.get(placement.assetId);
    if (
      asset?.subjectRelationship !== "cwt" ||
      asset.isCwtOwnedFacility !== true
    ) {
      throw new Error("Manufacturing placements require verified CWT-owned facility media.");
    }
  }
  projectStaticPageEvidenceGates(
    config,
    new Set(factRows.map((row) => row.key)),
    new Set(livePlacements.flatMap((placement) => {
      if (!isStaticPageFactSensitivePlacement(placement.placementKey)) return [];
      const asset = byId.get(placement.assetId);
      return asset?.subjectRelationship === "cwt" && asset.isCwtOwnedFacility === true
        ? [placement.placementKey]
        : [];
    })),
  );
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
  requireEditorialResourceAccess(actor.role, "static_page", "write");
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

export async function saveStaticPageConfigDraft<
  TQueryResult extends PgQueryResultHKT,
>(
  db: AppDatabase<TQueryResult>,
  actor: Actor,
  input: StaticPageConfig,
  expectedRevisionId?: string | null,
  expectedRevisionVersion = 0,
  options: GovernedMutationOptions = {},
): Promise<StaticPageDraftSaveResult> {
  requireEditorialResourceAccess(actor.role, "static_page", "write");
  const config = staticPageConfigSchema.parse(input);
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
      .limit(1)
      .for("update");
    const settingId = settingRows[0]?.id;
    if (!settingId) throw new Error("Static-page setting could not be resolved.");
    const draftRows = await transaction
      .select()
      .from(editorialRevisions)
      .where(and(
        eq(editorialRevisions.entityType, "static_page"),
        eq(editorialRevisions.entityId, settingId),
        eq(editorialRevisions.locale, "en"),
        eq(editorialRevisions.status, "draft"),
      ))
      .orderBy(desc(editorialRevisions.versionNumber))
      .limit(1)
      .for("update");
    const draft = draftRows[0];
    if (draft) {
      if (expectedRevisionId && expectedRevisionId !== draft.id) {
        throw new EditorialDraftConflictError("A different Static Page Draft Revision is current.");
      }
      const current = staticPageDraftSnapshotSchema.parse(draft.snapshot);
      if (expectedRevisionVersion !== current.draftVersion) {
        if (JSON.stringify(current.config) === JSON.stringify(config)) {
          return { revisionId: draft.id, revisionVersion: current.draftVersion };
        }
        throw new EditorialDraftConflictError("Static-page Draft changed in another editor; reload before saving.");
      }
      const revisionVersion = current.draftVersion + 1;
      await transaction
        .update(editorialRevisions)
        .set({
          snapshot: { kind: "static_page_config_v1", config, draftVersion: revisionVersion },
          changeSummary: `${config.pageKey} fixed-page Draft saved`,
        })
        .where(and(eq(editorialRevisions.id, draft.id), eq(editorialRevisions.status, "draft")));
      await audit({
        actorUserId: actor.userId,
        action: "static_page.draft.saved",
        entityType: "editorial_revision",
        entityId: draft.id,
        afterSummary: { pageKey: config.pageKey, draftVersion: revisionVersion },
      });
      return { revisionId: draft.id, revisionVersion };
    }
    if (expectedRevisionId || expectedRevisionVersion !== 0) {
      throw new EditorialDraftConflictError("Static-page Draft Revision is no longer current.");
    }
    const latestRows = await transaction
      .select({ versionNumber: editorialRevisions.versionNumber })
      .from(editorialRevisions)
      .where(and(
        eq(editorialRevisions.entityType, "static_page"),
        eq(editorialRevisions.entityId, settingId),
        eq(editorialRevisions.locale, "en"),
      ))
      .orderBy(desc(editorialRevisions.versionNumber))
      .limit(1);
    const inserted = await transaction
      .insert(editorialRevisions)
      .values({
        entityType: "static_page",
        entityId: settingId,
        locale: "en",
        versionNumber: (latestRows[0]?.versionNumber ?? 0) + 1,
        status: "draft",
        snapshot: { kind: "static_page_config_v1", config, draftVersion: 1 },
        changeSummary: `${config.pageKey} fixed-page Draft`,
        createdByUserId: actor.userId,
      })
      .returning({ id: editorialRevisions.id });
    const revisionId = inserted[0]?.id;
    if (!revisionId) throw new Error("Static-page Draft Revision insert failed.");
    await audit({
      actorUserId: actor.userId,
      action: "static_page.draft.created",
      entityType: "editorial_revision",
      entityId: revisionId,
      afterSummary: { pageKey: config.pageKey, draftVersion: 1 },
    });
    return { revisionId, revisionVersion: 1 };
  }, options);
}

export async function submitStaticPageConfigDraftForReview<
  TQueryResult extends PgQueryResultHKT,
>(
  db: AppDatabase<TQueryResult>,
  actor: Actor,
  revisionId: string,
  options: GovernedMutationOptions = {},
): Promise<void> {
  requireEditorialResourceAccess(actor.role, "static_page", "write");
  await runGovernedMutation(db, async ({ transaction, audit }) => {
    const revisionRows = await transaction
      .select({ snapshot: editorialRevisions.snapshot })
      .from(editorialRevisions)
      .where(and(
        eq(editorialRevisions.id, revisionId),
        eq(editorialRevisions.entityType, "static_page"),
        eq(editorialRevisions.status, "draft"),
      ))
      .limit(1)
      .for("update");
    const revision = revisionRows[0];
    if (!revision) throw new Error("Static-page Draft Revision is not current.");
    const config = parseStaticPageRevisionConfig(revision.snapshot);
    await validateStaticPageAssets(transaction, config);
    await transaction
      .update(editorialRevisions)
      .set({ status: "in_review", changeSummary: `${config.pageKey} fixed-page Draft submitted for review` })
      .where(and(eq(editorialRevisions.id, revisionId), eq(editorialRevisions.status, "draft")));
    await audit({
      actorUserId: actor.userId,
      action: "static_page.draft.review_requested",
      entityType: "editorial_revision",
      entityId: revisionId,
      afterSummary: { pageKey: config.pageKey },
    });
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
  requireEditorialResourceAccess(actor.role, "static_page", "apply");
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
    const config = parseStaticPageRevisionConfig(revision.snapshot);
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
