import { and, desc, eq, gt, inArray } from "drizzle-orm";
import type { PgQueryResultHKT } from "drizzle-orm/pg-core/session";
import { z } from "zod";

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

const homeModulesSchema = z.object({
  hero: z.boolean(),
  products: z.boolean(),
  applications: z.boolean(),
  fabric_library: z.boolean(),
  fabric_sourcing: z.boolean(),
  manufacturing_strength: z.boolean(),
  inquiry_cta: z.boolean(),
}).strict();

const aboutModulesSchema = z.object({
  hero: z.boolean(),
  introduction: z.boolean(),
  owned_manufacturing: z.boolean(),
  service_strength: z.boolean(),
  inquiry_cta: z.boolean(),
}).strict();

const placementBaseSchema = z.object({
  assetId: z.uuid(),
  placementKey: z.string().min(1).max(80),
  viewport: z.enum(["desktop", "mobile"]),
  role: z.enum(["hero", "gallery", "detail"]),
  sortOrder: z.number().int().min(0).max(1_000),
  altText: z.string().trim().min(1).max(500),
  caption: z.string().trim().min(1).max(1_000).nullable(),
  focalX: z.number().min(0).max(100),
  focalY: z.number().min(0).max(100),
  overlayOpacity: z.number().min(0).max(0.9),
  isVisible: z.boolean(),
}).strict();

const homePlacementKeys = [
  "hero",
  "products",
  "applications",
  "fabric_library",
  "fabric_sourcing",
  "manufacturing_strength",
  "inquiry_cta",
] as const;
const aboutPlacementKeys = [
  "hero",
  "introduction",
  "owned_manufacturing",
  "service_strength",
  "inquiry_cta",
] as const;

const homeConfigSchema = z.object({
  version: z.literal(1),
  pageKey: z.literal("home"),
  modules: homeModulesSchema,
  placements: z.array(placementBaseSchema.extend({
    placementKey: z.enum(homePlacementKeys),
  }).strict()).max(50),
}).strict();

const aboutConfigSchema = z.object({
  version: z.literal(1),
  pageKey: z.literal("about"),
  modules: aboutModulesSchema,
  placements: z.array(placementBaseSchema.extend({
    placementKey: z.enum(aboutPlacementKeys),
  }).strict()).max(50),
}).strict();

export const staticPageConfigSchema = z.discriminatedUnion("pageKey", [
  homeConfigSchema,
  aboutConfigSchema,
]).superRefine((config, context) => {
  const keys = new Set<string>();
  for (const [index, placement] of config.placements.entries()) {
    const key = `${placement.placementKey}:${placement.viewport}:${placement.assetId}`;
    if (keys.has(key)) {
      context.addIssue({
        code: "custom",
        message: "Static-page Asset placements must be unique.",
        path: ["placements", index],
      });
    }
    keys.add(key);
  }
});

export type StaticPageConfig = z.infer<typeof staticPageConfigSchema>;
type HomeStaticPageConfig = Extract<StaticPageConfig, { pageKey: "home" }>;
type AboutStaticPageConfig = Extract<StaticPageConfig, { pageKey: "about" }>;

export const DEFAULT_STATIC_PAGE_CONFIGS: Readonly<{
  home: HomeStaticPageConfig;
  about: AboutStaticPageConfig;
}> = {
  home: {
    version: 1,
    pageKey: "home",
    modules: {
      hero: true,
      products: true,
      applications: true,
      fabric_library: true,
      fabric_sourcing: true,
      manufacturing_strength: true,
      inquiry_cta: true,
    },
    placements: [],
  },
  about: {
    version: 1,
    pageKey: "about",
    modules: {
      hero: true,
      introduction: true,
      owned_manufacturing: true,
      service_strength: true,
      inquiry_cta: true,
    },
    placements: [],
  },
};

const ownedManufacturingKeys = new Set(["manufacturing_strength", "owned_manufacturing"]);

async function validateStaticPageAssets<TQueryResult extends PgQueryResultHKT>(
  db: AppDatabase<TQueryResult>,
  config: StaticPageConfig,
): Promise<void> {
  const assetIds = [...new Set(config.placements.map((placement) => placement.assetId))];
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
  for (const placement of config.placements) {
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
      .update(editorialRevisions)
      .set({ status: "applied", reviewedByUserId: actor.userId, reviewedAt: new Date() })
      .where(
        and(
          eq(editorialRevisions.id, revisionId),
          eq(editorialRevisions.entityType, "static_page"),
          eq(editorialRevisions.status, "in_review"),
        ),
      )
      .returning();
    const revision = revisionRows[0];
    if (!revision) throw new Error("Static-page revision is not eligible for approval.");
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
    const config = staticPageConfigSchema.parse(revision.snapshot);
    await validateStaticPageAssets(transaction, config);
    const settingRows = await transaction
      .update(systemSettings)
      .set({ value: config, updatedByUserId: actor.userId, updatedAt: new Date() })
      .where(eq(systemSettings.id, revision.entityId))
      .returning({ id: systemSettings.id });
    if (!settingRows[0]) throw new Error("Static-page setting was not found.");
    await transaction
      .delete(sitePageAssets)
      .where(eq(sitePageAssets.systemSettingId, revision.entityId));
    if (config.placements.length) {
      await transaction.insert(sitePageAssets).values(config.placements.map((placement) => ({
        systemSettingId: revision.entityId,
        assetId: placement.assetId,
        pageKey: config.pageKey,
        placementKey: placement.placementKey,
        viewport: placement.viewport,
        role: placement.role,
        sortOrder: placement.sortOrder,
        altText: placement.altText,
        caption: placement.caption,
        focalX: String(placement.focalX),
        focalY: String(placement.focalY),
        isVisible: placement.isVisible,
      })));
    }
    await audit({
      actorUserId: actor.userId,
      action: "static_page.revision.applied",
      entityType: "editorial_revision",
      entityId: revisionId,
      afterSummary: { pageKey: config.pageKey, placementCount: config.placements.length },
    });
    return config.pageKey;
  }, options);
}
