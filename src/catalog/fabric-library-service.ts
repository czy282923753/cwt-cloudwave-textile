import { and, count, eq, inArray, isNotNull, ne, or } from "drizzle-orm";
import type { PgQueryResultHKT } from "drizzle-orm/pg-core/session";

import { writeAuditLog } from "@/audit/service";
import { requirePermission } from "@/auth/permissions";
import {
  assets,
  fabricLibraryEntries,
  fabricLibraryEntryApplications,
  fabricLibraryEntryAssets,
  fabricLibraryEntryLocalizations,
  fabricLibraryEntryProducts,
  keywordPageMappings,
  routes,
  seoMetadata,
} from "@/db/schema";
import type { AppDatabase } from "@/db/types";
import { slugify } from "@/seo/path";

import type { Actor } from "./product-service";

export async function createFabricLibraryEntry<
  TQueryResult extends PgQueryResultHKT,
>(
  db: AppDatabase<TQueryResult>,
  actor: Actor,
  input: {
    title: string;
    description?: string;
    assetIds: readonly string[];
    productIds?: readonly string[];
    applicationIds?: readonly string[];
  },
): Promise<string> {
  requirePermission(actor.role, "products.write");
  const title = input.title.trim();
  if (!title) throw new Error("Fabric Library title is required.");
  const assetIds = [...new Set(input.assetIds)];
  if (assetIds.length === 0) throw new Error("A Fabric Library entry requires an image.");
  const validAssets = await db
    .select({ id: assets.id })
    .from(assets)
    .where(
      and(
        inArray(assets.id, assetIds),
        eq(assets.status, "ready"),
        eq(assets.access, "public"),
      ),
    );
  if (validAssets.length !== assetIds.length) {
    throw new Error("Fabric Library images must be ready public Assets.");
  }
  const path = `/fabric-library/${slugify(title)}`;
  const collision = await db.select({ id: routes.id }).from(routes).where(eq(routes.path, path));
  if (collision[0]) throw new Error("Fabric Library URL already exists.");

  return db.transaction(async (transaction) => {
    const rows = await transaction
      .insert(fabricLibraryEntries)
      .values({ status: "draft", createdByUserId: actor.userId })
      .returning({ id: fabricLibraryEntries.id });
    const entryId = rows[0]?.id;
    if (!entryId) throw new Error("Fabric Library entry insert failed.");
    await transaction.insert(fabricLibraryEntryLocalizations).values({
      fabricEntryId: entryId,
      locale: "en",
      title,
      description: input.description?.trim() || null,
    });
    await transaction.insert(fabricLibraryEntryAssets).values(
      assetIds.map((assetId, index) => ({
        fabricEntryId: entryId,
        assetId,
        role: index === 0 ? ("hero" as const) : ("gallery" as const),
        sortOrder: index,
      })),
    );
    if (input.productIds?.length) {
      await transaction.insert(fabricLibraryEntryProducts).values(
        [...new Set(input.productIds)].map((productId) => ({
          fabricEntryId: entryId,
          productId,
        })),
      );
    }
    if (input.applicationIds?.length) {
      await transaction.insert(fabricLibraryEntryApplications).values(
        [...new Set(input.applicationIds)].map((applicationId) => ({
          fabricEntryId: entryId,
          applicationId,
        })),
      );
    }
    const routeRows = await transaction
      .insert(routes)
      .values({
        locale: "en",
        path,
        entityType: "fabric_entry",
        entityId: entryId,
      })
      .returning({ id: routes.id });
    const routeId = routeRows[0]?.id;
    if (!routeId) throw new Error("Fabric Library route insert failed.");
    await transaction.insert(seoMetadata).values({
      routeId,
      title: `${title} | CWT Fabric Library`,
      indexStatus: "noindex",
      canonicalPath: path,
    });
    await writeAuditLog(transaction, {
      actorUserId: actor.userId,
      action: "fabric_entry.draft.created",
      entityType: "fabric_entry",
      entityId: entryId,
      afterSummary: { path, indexStatus: "noindex" },
    });
    return entryId;
  });
}

export async function publishFabricLibraryEntry<
  TQueryResult extends PgQueryResultHKT,
>(
  db: AppDatabase<TQueryResult>,
  actor: Actor,
  entryId: string,
): Promise<void> {
  requirePermission(actor.role, "products.publish");
  const updated = await db
    .update(fabricLibraryEntries)
    .set({ status: "published", publishedAt: new Date(), updatedAt: new Date() })
    .where(
      and(
        eq(fabricLibraryEntries.id, entryId),
        or(
          eq(fabricLibraryEntries.status, "draft"),
          eq(fabricLibraryEntries.status, "in_review"),
        ),
      ),
    )
    .returning({ id: fabricLibraryEntries.id });
  if (!updated[0]) throw new Error("Fabric Library entry cannot be published.");
  await writeAuditLog(db, {
    actorUserId: actor.userId,
    action: "fabric_entry.published",
    entityType: "fabric_entry",
    entityId: entryId,
  });
}

export async function confirmFabricEntryIndependentValue<
  TQueryResult extends PgQueryResultHKT,
>(
  db: AppDatabase<TQueryResult>,
  actor: Actor,
  entryId: string,
): Promise<void> {
  requirePermission(actor.role, "products.review");
  await db
    .update(fabricLibraryEntries)
    .set({
      independentValueConfirmedByUserId: actor.userId,
      independentValueConfirmedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(fabricLibraryEntries.id, entryId));
  await writeAuditLog(db, {
    actorUserId: actor.userId,
    action: "fabric_entry.independent_value.confirmed",
    entityType: "fabric_entry",
    entityId: entryId,
  });
}

export async function setFabricEntryIndexStatus<
  TQueryResult extends PgQueryResultHKT,
>(
  db: AppDatabase<TQueryResult>,
  actor: Actor,
  entryId: string,
  indexStatus: "index" | "noindex",
): Promise<void> {
  requirePermission(actor.role, "seo.manage");
  const rows = await db
    .select({
      status: fabricLibraryEntries.status,
      confirmedAt: fabricLibraryEntries.independentValueConfirmedAt,
      description: fabricLibraryEntryLocalizations.description,
      routeId: routes.id,
      title: seoMetadata.title,
      metaDescription: seoMetadata.metaDescription,
    })
    .from(fabricLibraryEntries)
    .innerJoin(
      fabricLibraryEntryLocalizations,
      and(
        eq(fabricLibraryEntryLocalizations.fabricEntryId, fabricLibraryEntries.id),
        eq(fabricLibraryEntryLocalizations.locale, "en"),
      ),
    )
    .innerJoin(
      routes,
      and(
        eq(routes.entityType, "fabric_entry"),
        eq(routes.entityId, fabricLibraryEntries.id),
        eq(routes.isCurrent, true),
      ),
    )
    .innerJoin(seoMetadata, eq(seoMetadata.routeId, routes.id))
    .where(eq(fabricLibraryEntries.id, entryId))
    .limit(1);
  const entry = rows[0];
  if (!entry) throw new Error("Fabric Library SEO record was not found.");
  if (indexStatus === "index") {
    const [imageRows, productRows, applicationRows, intentRows] = await Promise.all([
      db
        .select({ count: count() })
        .from(fabricLibraryEntryAssets)
        .innerJoin(assets, eq(fabricLibraryEntryAssets.assetId, assets.id))
        .where(
          and(
            eq(fabricLibraryEntryAssets.fabricEntryId, entryId),
            isNotNull(assets.altText),
            ne(assets.altText, ""),
          ),
        ),
      db
        .select({ count: count() })
        .from(fabricLibraryEntryProducts)
        .where(eq(fabricLibraryEntryProducts.fabricEntryId, entryId)),
      db
        .select({ count: count() })
        .from(fabricLibraryEntryApplications)
        .where(eq(fabricLibraryEntryApplications.fabricEntryId, entryId)),
      db
        .select({ count: count() })
        .from(keywordPageMappings)
        .where(eq(keywordPageMappings.primaryRouteId, entry.routeId)),
    ]);
    if (
      entry.status !== "published" ||
      !entry.confirmedAt ||
      !entry.description?.trim() ||
      !entry.title?.trim() ||
      !entry.metaDescription?.trim() ||
      Number(imageRows[0]?.count ?? 0) < 1 ||
      Number(productRows[0]?.count ?? 0) + Number(applicationRows[0]?.count ?? 0) < 1 ||
      Number(intentRows[0]?.count ?? 0) < 1
    ) {
      throw new Error(
        "Indexable Fabric Library entries require confirmed standalone value, metadata, alt text, a useful relation, and an owned search intent.",
      );
    }
  }
  await db
    .update(seoMetadata)
    .set({ indexStatus, updatedByUserId: actor.userId, updatedAt: new Date() })
    .where(eq(seoMetadata.routeId, entry.routeId));
  await writeAuditLog(db, {
    actorUserId: actor.userId,
    action: "fabric_entry.index_status.changed",
    entityType: "fabric_entry",
    entityId: entryId,
    afterSummary: { indexStatus },
  });
}
