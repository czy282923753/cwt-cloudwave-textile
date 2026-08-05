import { and, desc, eq, inArray } from "drizzle-orm";
import type { PgQueryResultHKT } from "drizzle-orm/pg-core/session";
import { NextResponse } from "next/server";

import { requireCurrentUser } from "@/auth/current-user";
import {
  assets,
  contentAssets,
  editorialRevisions,
  productAssets,
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
    const rows = await db.select({ assetId: productAssets.assetId }).from(productAssets).where(and(eq(productAssets.productId, entityId), eq(productAssets.assetId, assetId))).limit(1);
    if (rows[0]) return true;
  }
  if (entityType === "content") {
    const rows = await db.select({ assetId: contentAssets.assetId }).from(contentAssets).where(and(eq(contentAssets.contentId, entityId), eq(contentAssets.assetId, assetId))).limit(1);
    if (rows[0]) return true;
  }
  if (entityType === "product" || entityType === "content") {
    const rows = await db
      .select({ snapshot: editorialRevisions.snapshot })
      .from(editorialRevisions)
      .where(and(
        eq(editorialRevisions.entityType, entityType),
        eq(editorialRevisions.entityId, entityId),
        inArray(editorialRevisions.status, ["draft", "in_review"]),
      ))
      .orderBy(desc(editorialRevisions.versionNumber));
    return rows.some((row) => snapshotContainsPreviewAsset(entityType, row.snapshot, assetId));
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
  const config = rows[0] ? snapshotConfig(rows[0].snapshot) : null;
  return Boolean(config && deriveStaticPageLivePlacements(config)
    .some((placement) => placement.assetId === assetId));
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
  await requireCurrentUser(entityType === "product" ? "products.read" : "content.read");
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
