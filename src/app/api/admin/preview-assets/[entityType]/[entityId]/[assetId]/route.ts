import { and, desc, eq, inArray } from "drizzle-orm";
import type { PgQueryResultHKT } from "drizzle-orm/pg-core/session";
import { NextResponse } from "next/server";

import { resolveCurrentUser } from "@/auth/current-user";
import { canAccessEditorialResource } from "@/admin/preview-policy";
import {
  assets,
  contentAssets,
  editorialRevisions,
  productAssets,
  sitePageAssets,
  systemSettings,
} from "@/db/schema";
import { databaseConnection } from "@/db/client";
import type { AppDatabase } from "@/db/types";
import {
  deriveStaticPageLivePlacements,
  staticPageConfigSchema,
} from "@/content/static-page-projection";
import { createObjectStorage } from "@/storage";
import { publicReadyImageSqlConditions } from "@/uploads/asset-eligibility";
import { snapshotContainsPreviewAsset } from "@/admin/preview-policy";

function snapshotConfig(snapshot: unknown) {
  const direct = staticPageConfigSchema.safeParse(snapshot);
  if (direct.success) return direct.data;
  if (typeof snapshot !== "object" || snapshot === null || !("config" in snapshot)) return null;
  const wrapped = staticPageConfigSchema.safeParse(snapshot.config);
  return wrapped.success ? wrapped.data : null;
}

async function hasPreviewRelation<TQueryResult extends PgQueryResultHKT>(
  db: AppDatabase<TQueryResult>,
  entityType: string,
  entityId: string,
  assetId: string,
): Promise<boolean> {
  if (entityType === "product") {
    const rows = await db
      .select({ snapshot: editorialRevisions.snapshot })
      .from(editorialRevisions)
      .where(and(
        eq(editorialRevisions.entityType, entityType),
        eq(editorialRevisions.entityId, entityId),
        inArray(editorialRevisions.status, ["draft", "in_review"]),
      ))
      .orderBy(desc(editorialRevisions.versionNumber))
      .limit(1);
    if (rows[0]) return snapshotContainsPreviewAsset("product", rows[0].snapshot, assetId);
    const liveRows = await db.select({ assetId: productAssets.assetId }).from(productAssets).where(and(
      eq(productAssets.productId, entityId),
      eq(productAssets.assetId, assetId),
      eq(productAssets.isVisible, true),
    )).limit(1);
    return Boolean(liveRows[0]);
  }
  if (entityType === "content") {
    const rows = await db
      .select({ snapshot: editorialRevisions.snapshot })
      .from(editorialRevisions)
      .where(and(
        eq(editorialRevisions.entityType, "content"),
        eq(editorialRevisions.entityId, entityId),
        inArray(editorialRevisions.status, ["draft", "in_review"]),
      ))
      .orderBy(desc(editorialRevisions.versionNumber))
      .limit(1);
    if (rows[0]) return snapshotContainsPreviewAsset("content", rows[0].snapshot, assetId);
    const liveRows = await db.select({ assetId: contentAssets.assetId }).from(contentAssets).where(and(
      eq(contentAssets.contentId, entityId),
      eq(contentAssets.assetId, assetId),
      eq(contentAssets.isVisible, true),
    )).limit(1);
    return Boolean(liveRows[0]);
  }
  if (entityType !== "site" || (entityId !== "home" && entityId !== "about")) return false;
  const rows = await db
    .select({ snapshot: editorialRevisions.snapshot })
    .from(editorialRevisions)
    .innerJoin(systemSettings, eq(systemSettings.id, editorialRevisions.entityId))
    .where(and(
      eq(systemSettings.key, `site_page.${entityId}`),
      eq(editorialRevisions.entityType, "static_page"),
      inArray(editorialRevisions.status, ["draft", "in_review"]),
    ))
    .orderBy(desc(editorialRevisions.versionNumber))
    .limit(1);
  const pendingConfig = rows[0] ? snapshotConfig(rows[0].snapshot) : null;
  if (pendingConfig) {
    const placement = deriveStaticPageLivePlacements(pendingConfig)
      .find((item) => item.assetId === assetId);
    if (!placement) return false;
    if (placement.placementKey !== "manufacturing_strength" && placement.placementKey !== "owned_manufacturing") return true;
    const ownedRows = await db.select({ relationship: assets.subjectRelationship, owned: assets.isCwtOwnedFacility }).from(assets).where(eq(assets.id, assetId)).limit(1);
    return ownedRows[0]?.relationship === "cwt" && ownedRows[0].owned === true;
  }
  const liveRows = await db
    .select({
      value: systemSettings.value,
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
      relationship: assets.subjectRelationship,
      owned: assets.isCwtOwnedFacility,
    })
    .from(systemSettings)
    .innerJoin(sitePageAssets, eq(sitePageAssets.systemSettingId, systemSettings.id))
    .innerJoin(assets, eq(assets.id, sitePageAssets.assetId))
    .innerJoin(editorialRevisions, and(
      eq(editorialRevisions.entityType, "static_page"),
      eq(editorialRevisions.entityId, systemSettings.id),
      eq(editorialRevisions.status, "applied"),
    ))
    .where(and(
      eq(systemSettings.key, `site_page.${entityId}`),
      eq(sitePageAssets.assetId, assetId),
      eq(sitePageAssets.isVisible, true),
    ));
  return liveRows.some((row) => {
    const config = staticPageConfigSchema.safeParse(row.value);
    if (!config.success || !deriveStaticPageLivePlacements(config.data).some((placement) => (
      placement.assetId === assetId && placement.placementKey === row.placementKey && placement.viewport === row.viewport
    ))) return false;
    return (row.placementKey !== "manufacturing_strength" && row.placementKey !== "owned_manufacturing") ||
      (row.relationship === "cwt" && row.owned === true);
  });
}

async function findPreviewAsset<TQueryResult extends PgQueryResultHKT>(
  db: AppDatabase<TQueryResult>,
  entityType: string,
  entityId: string,
  assetId: string,
) {
  if (!await hasPreviewRelation(db, entityType, entityId, assetId)) return null;
  const rows = await db
    .select({ objectKey: assets.objectKey, detectedMimeType: assets.detectedMimeType })
    .from(assets)
    .where(and(eq(assets.id, assetId), publicReadyImageSqlConditions()))
    .limit(1);
  return rows[0] ?? null;
}

export async function GET(
  request: Request,
  context: { params: Promise<{ entityType: string; entityId: string; assetId: string }> },
): Promise<NextResponse> {
  void request;
  const { entityType, entityId, assetId } = await context.params;
  const user = await resolveCurrentUser();
  const resource = entityType === "product"
    ? "product"
    : entityType === "content"
      ? "content"
      : entityType === "site"
        ? "static_page"
        : null;
  if (!user || !resource || !canAccessEditorialResource(user.role, resource, "preview")) {
    return new NextResponse("Not found", { status: user ? 404 : 403 });
  }
  try {
    const asset = databaseConnection.kind === "pglite"
      ? await findPreviewAsset(databaseConnection.db, entityType, entityId, assetId)
      : await findPreviewAsset(databaseConnection.db, entityType, entityId, assetId);
    if (!asset?.detectedMimeType) return new NextResponse("Not found", { status: 404 });
    const bytes = await createObjectStorage().get("public", asset.objectKey);
    return new NextResponse(Buffer.from(bytes), {
      headers: {
        "content-type": asset.detectedMimeType,
        "cache-control": "private, no-store, max-age=0, must-revalidate",
        "content-disposition": "inline",
        "x-content-type-options": "nosniff",
        "x-robots-tag": "noindex, nofollow, noarchive",
      },
    });
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
}
