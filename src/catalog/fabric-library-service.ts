import { and, count, desc, eq, gt, inArray, isNotNull, ne } from "drizzle-orm";
import type { PgQueryResultHKT } from "drizzle-orm/pg-core/session";
import { z } from "zod";

import { writeAuditLog } from "@/audit/service";
import {
  runGovernedMutation,
  type GovernedMutationOptions,
} from "@/audit/governed-mutation";
import { requirePermission } from "@/auth/permissions";
import {
  assets,
  applications,
  editorialRevisions,
  fabricLibraryEntries,
  fabricLibraryEntryApplications,
  fabricLibraryEntryAssets,
  fabricLibraryEntryLocalizations,
  fabricLibraryEntryProducts,
  keywordPageMappings,
  productApplications,
  products,
  routes,
  seoMetadata,
} from "@/db/schema";
import type { AppDatabase } from "@/db/types";
import { publicProductEligibilityConditions } from "./product-eligibility";
import { slugify } from "@/seo/path";
import { publicReadyImageSqlConditions } from "@/uploads/asset-eligibility";

import type { Actor } from "./product-service";

const fabricRevisionSchema = z.object({
  title: z.string().min(1).max(300),
  description: z.string().nullable(),
  assetIds: z.array(z.uuid()).min(1),
  productIds: z.array(z.uuid()),
  applicationIds: z.array(z.uuid()),
  seo: z
    .object({
      routeId: z.uuid(),
      title: z.string().nullable(),
      metaDescription: z.string().nullable(),
      focusKeyword: z.string().nullable(),
    })
    .optional(),
});

type FabricRevisionSnapshot = z.infer<typeof fabricRevisionSchema>;

async function validateFabricSnapshot<TQueryResult extends PgQueryResultHKT>(
  db: AppDatabase<TQueryResult>,
  snapshot: FabricRevisionSnapshot,
): Promise<void> {
  const [assetRows, productRows, applicationRows] = await Promise.all([
    db
      .select({ id: assets.id })
      .from(assets)
      .where(
        and(
          inArray(assets.id, snapshot.assetIds),
          publicReadyImageSqlConditions(),
        ),
      ),
    snapshot.productIds.length
      ? db.select({ id: products.id }).from(products).where(inArray(products.id, snapshot.productIds))
      : Promise.resolve([]),
    snapshot.applicationIds.length
      ? db
          .select({ id: applications.id })
          .from(applications)
          .where(inArray(applications.id, snapshot.applicationIds))
      : Promise.resolve([]),
  ]);
  if (assetRows.length !== new Set(snapshot.assetIds).size) {
    throw new Error("Fabric Library images must be ready, scanned public Assets.");
  }
  if (productRows.length !== new Set(snapshot.productIds).size) {
    throw new Error("A related Product does not exist.");
  }
  if (applicationRows.length !== new Set(snapshot.applicationIds).size) {
    throw new Error("A related Application does not exist.");
  }
}

async function applyFabricSnapshot<TQueryResult extends PgQueryResultHKT>(
  db: AppDatabase<TQueryResult>,
  actorUserId: string,
  entryId: string,
  snapshot: FabricRevisionSnapshot,
): Promise<void> {
  await db
    .update(fabricLibraryEntryLocalizations)
    .set({ title: snapshot.title, description: snapshot.description })
    .where(
      and(
        eq(fabricLibraryEntryLocalizations.fabricEntryId, entryId),
        eq(fabricLibraryEntryLocalizations.locale, "en"),
      ),
    );
  await db
    .delete(fabricLibraryEntryAssets)
    .where(eq(fabricLibraryEntryAssets.fabricEntryId, entryId));
  await db.insert(fabricLibraryEntryAssets).values(
    [...new Set(snapshot.assetIds)].map((assetId, sortOrder) => ({
      fabricEntryId: entryId,
      assetId,
      role: sortOrder === 0 ? ("hero" as const) : ("gallery" as const),
      sortOrder,
    })),
  );
  await db
    .delete(fabricLibraryEntryProducts)
    .where(eq(fabricLibraryEntryProducts.fabricEntryId, entryId));
  if (snapshot.productIds.length) {
    await db.insert(fabricLibraryEntryProducts).values(
      [...new Set(snapshot.productIds)].map((productId) => ({ fabricEntryId: entryId, productId })),
    );
  }
  await db
    .delete(fabricLibraryEntryApplications)
    .where(eq(fabricLibraryEntryApplications.fabricEntryId, entryId));
  if (snapshot.applicationIds.length) {
    await db.insert(fabricLibraryEntryApplications).values(
      [...new Set(snapshot.applicationIds)].map((applicationId) => ({ fabricEntryId: entryId, applicationId })),
    );
  }
  await db
    .update(fabricLibraryEntries)
    .set({ updatedAt: new Date() })
    .where(eq(fabricLibraryEntries.id, entryId));
  if (snapshot.seo) {
    const routeRows = await db
      .select({ id: routes.id })
      .from(routes)
      .where(
        and(
          eq(routes.id, snapshot.seo.routeId),
          eq(routes.entityType, "fabric_entry"),
          eq(routes.entityId, entryId),
          eq(routes.isCurrent, true),
        ),
      )
      .limit(1);
    if (!routeRows[0]) throw new Error("Fabric Library revision targets an invalid route.");
    await db
      .update(seoMetadata)
      .set({
        title: snapshot.seo.title,
        metaDescription: snapshot.seo.metaDescription,
        focusKeyword: snapshot.seo.focusKeyword,
        updatedByUserId: actorUserId,
        updatedAt: new Date(),
      })
      .where(eq(seoMetadata.routeId, snapshot.seo.routeId));
  }
}

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
        publicReadyImageSqlConditions(),
      ),
    );
  if (validAssets.length !== assetIds.length) {
    throw new Error("Fabric Library images must be ready public Assets.");
  }
  const path = `/fabric-library/${slugify(title)}/`;
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

export async function updateFabricLibraryEntry<
  TQueryResult extends PgQueryResultHKT,
>(
  db: AppDatabase<TQueryResult>,
  actor: Actor,
  entryId: string,
  input: FabricRevisionSnapshot,
  options: GovernedMutationOptions = {},
): Promise<string | null> {
  requirePermission(actor.role, "products.write");
  const snapshot = fabricRevisionSchema.parse({
    ...input,
    title: input.title.trim(),
    description: input.description?.trim() || null,
    assetIds: [...new Set(input.assetIds)],
    productIds: [...new Set(input.productIds)],
    applicationIds: [...new Set(input.applicationIds)],
  });
  await validateFabricSnapshot(db, snapshot);
  const statusRows = await db
    .select({ status: fabricLibraryEntries.status })
    .from(fabricLibraryEntries)
    .where(eq(fabricLibraryEntries.id, entryId))
    .limit(1);
  const status = statusRows[0]?.status;
  if (!status) throw new Error("Fabric Library Entry was not found.");
  if (status === "archived") throw new Error("Archived Fabric Library Entries cannot be edited.");
  if (status === "published") {
    return runGovernedMutation(db, async ({ transaction, audit }) => {
      const latestRows = await transaction
        .select({ versionNumber: editorialRevisions.versionNumber })
        .from(editorialRevisions)
        .where(
          and(
            eq(editorialRevisions.entityType, "fabric_entry"),
            eq(editorialRevisions.entityId, entryId),
            eq(editorialRevisions.locale, "en"),
          ),
        )
        .orderBy(desc(editorialRevisions.versionNumber))
        .limit(1);
      const revisionRows = await transaction
        .insert(editorialRevisions)
        .values({
          entityType: "fabric_entry",
          entityId: entryId,
          locale: "en",
          versionNumber: (latestRows[0]?.versionNumber ?? 0) + 1,
          status: "in_review",
          snapshot,
          changeSummary: "Published Fabric Library Entry update",
          createdByUserId: actor.userId,
        })
        .returning({ id: editorialRevisions.id });
      const revisionId = revisionRows[0]?.id;
      if (!revisionId) throw new Error("Fabric Library revision insert failed.");
      await audit({
        actorUserId: actor.userId,
        action: "fabric_entry.revision.proposed",
        entityType: "editorial_revision",
        entityId: revisionId,
        afterSummary: { entryId },
      });
      return revisionId;
    }, options);
  }
  await db.transaction(async (transaction) => {
    await applyFabricSnapshot(transaction, actor.userId, entryId, snapshot);
    await writeAuditLog(transaction, {
      actorUserId: actor.userId,
      action: "fabric_entry.updated",
      entityType: "fabric_entry",
      entityId: entryId,
    });
  });
  return null;
}

export async function submitFabricLibraryEntryForReview<
  TQueryResult extends PgQueryResultHKT,
>(
  db: AppDatabase<TQueryResult>,
  actor: Actor,
  entryId: string,
  options: GovernedMutationOptions = {},
): Promise<void> {
  requirePermission(actor.role, "products.write");
  await runGovernedMutation(db, async ({ transaction, audit }) => {
    const updated = await transaction
      .update(fabricLibraryEntries)
      .set({ status: "in_review", updatedAt: new Date() })
      .where(
        and(eq(fabricLibraryEntries.id, entryId), eq(fabricLibraryEntries.status, "draft")),
      )
      .returning({ id: fabricLibraryEntries.id });
    if (!updated[0]) throw new Error("Only a Draft Fabric Library Entry can enter review.");
    await audit({
      actorUserId: actor.userId,
      action: "fabric_entry.review.requested",
      entityType: "fabric_entry",
      entityId: entryId,
    });
  }, options);
}

export async function rejectFabricLibraryEntryReview<
  TQueryResult extends PgQueryResultHKT,
>(
  db: AppDatabase<TQueryResult>,
  actor: Actor,
  entryId: string,
  reason: string,
  options: GovernedMutationOptions = {},
): Promise<void> {
  requirePermission(actor.role, "products.review");
  if (!reason.trim()) throw new Error("Review rejection requires a reason.");
  await runGovernedMutation(db, async ({ transaction, audit }) => {
    const updated = await transaction
      .update(fabricLibraryEntries)
      .set({ status: "draft", updatedAt: new Date() })
      .where(
        and(
          eq(fabricLibraryEntries.id, entryId),
          eq(fabricLibraryEntries.status, "in_review"),
        ),
      )
      .returning({ id: fabricLibraryEntries.id });
    if (!updated[0]) throw new Error("Fabric Library Entry cannot be rejected.");
    await audit({
      actorUserId: actor.userId,
      action: "fabric_entry.review.rejected",
      entityType: "fabric_entry",
      entityId: entryId,
      afterSummary: { reason: reason.trim().slice(0, 500) },
    });
  }, options);
}

export async function publishFabricLibraryEntry<
  TQueryResult extends PgQueryResultHKT,
>(
  db: AppDatabase<TQueryResult>,
  actor: Actor,
  entryId: string,
  options: GovernedMutationOptions = {},
): Promise<void> {
  requirePermission(actor.role, "products.publish");
  const assetRows = await db
    .select({ count: count() })
    .from(fabricLibraryEntryAssets)
    .innerJoin(assets, eq(assets.id, fabricLibraryEntryAssets.assetId))
    .where(
      and(
        eq(fabricLibraryEntryAssets.fabricEntryId, entryId),
        eq(fabricLibraryEntryAssets.role, "hero"),
        publicReadyImageSqlConditions(),
      ),
    );
  if (Number(assetRows[0]?.count ?? 0) < 1) {
    throw new Error("Fabric Library publication requires a scanned public image.");
  }
  await runGovernedMutation(db, async ({ transaction, audit }) => {
    const updated = await transaction
      .update(fabricLibraryEntries)
      .set({ status: "published", publishedAt: new Date(), updatedAt: new Date() })
      .where(
        and(
          eq(fabricLibraryEntries.id, entryId),
          eq(fabricLibraryEntries.status, "in_review"),
        ),
      )
      .returning({ id: fabricLibraryEntries.id });
    if (!updated[0]) throw new Error("Fabric Library entry cannot be published.");
    await audit({
      actorUserId: actor.userId,
      action: "fabric_entry.published",
      entityType: "fabric_entry",
      entityId: entryId,
    });
  }, options);
}

export async function applyFabricLibraryRevision<
  TQueryResult extends PgQueryResultHKT,
>(
  db: AppDatabase<TQueryResult>,
  actor: Actor,
  revisionId: string,
): Promise<string> {
  requirePermission(actor.role, "products.publish");
  return db.transaction(async (transaction) => {
    const rows = await transaction
      .select()
      .from(editorialRevisions)
      .where(eq(editorialRevisions.id, revisionId))
      .limit(1);
    const revision = rows[0];
    if (
      !revision ||
      revision.entityType !== "fabric_entry" ||
      revision.status !== "in_review"
    ) {
      throw new Error("Fabric Library revision is not eligible for approval.");
    }
    const newer = await transaction
      .select({ id: editorialRevisions.id })
      .from(editorialRevisions)
      .where(
        and(
          eq(editorialRevisions.entityType, "fabric_entry"),
          eq(editorialRevisions.entityId, revision.entityId),
          eq(editorialRevisions.locale, revision.locale),
          gt(editorialRevisions.versionNumber, revision.versionNumber),
        ),
      )
      .limit(1);
    if (newer[0]) {
      throw new Error(
        "A newer Fabric Library revision exists; this revision is stale.",
      );
    }
    const snapshot = fabricRevisionSchema.parse(revision.snapshot);
    await validateFabricSnapshot(transaction, snapshot);
    await applyFabricSnapshot(
      transaction,
      actor.userId,
      revision.entityId,
      snapshot,
    );
    await transaction
      .update(editorialRevisions)
      .set({ status: "applied", reviewedByUserId: actor.userId, reviewedAt: new Date() })
      .where(eq(editorialRevisions.id, revisionId));
    await writeAuditLog(transaction, {
      actorUserId: actor.userId,
      action: "fabric_entry.revision.applied",
      entityType: "editorial_revision",
      entityId: revisionId,
      afterSummary: { entryId: revision.entityId },
    });
    return revision.entityId;
  });
}

export async function rejectFabricLibraryRevision<
  TQueryResult extends PgQueryResultHKT,
>(
  db: AppDatabase<TQueryResult>,
  actor: Actor,
  revisionId: string,
  options: GovernedMutationOptions = {},
): Promise<void> {
  requirePermission(actor.role, "products.publish");
  await runGovernedMutation(db, async ({ transaction, audit }) => {
    const updated = await transaction
      .update(editorialRevisions)
      .set({ status: "rejected", reviewedByUserId: actor.userId, reviewedAt: new Date() })
      .where(
        and(
          eq(editorialRevisions.id, revisionId),
          eq(editorialRevisions.entityType, "fabric_entry"),
          eq(editorialRevisions.status, "in_review"),
        ),
      )
      .returning({ entryId: editorialRevisions.entityId });
    if (!updated[0]) throw new Error("Fabric Library revision cannot be rejected.");
    await audit({
      actorUserId: actor.userId,
      action: "fabric_entry.revision.rejected",
      entityType: "editorial_revision",
      entityId: revisionId,
      afterSummary: { entryId: updated[0].entryId },
    });
  }, options);
}

export async function archiveFabricLibraryEntry<
  TQueryResult extends PgQueryResultHKT,
>(
  db: AppDatabase<TQueryResult>,
  actor: Actor,
  entryId: string,
  reason: string,
): Promise<void> {
  requirePermission(actor.role, "products.publish");
  if (!reason.trim()) throw new Error("Archive requires a reason.");
  await db.transaction(async (transaction) => {
    const routeRows = await transaction
      .select({ routeId: routes.id, status: fabricLibraryEntries.status })
      .from(fabricLibraryEntries)
      .innerJoin(
        routes,
        and(
          eq(routes.entityType, "fabric_entry"),
          eq(routes.entityId, fabricLibraryEntries.id),
          eq(routes.isCurrent, true),
        ),
      )
      .where(eq(fabricLibraryEntries.id, entryId))
      .limit(1);
    const current = routeRows[0];
    if (!current || current.status === "archived") {
      throw new Error("Fabric Library Entry cannot be archived.");
    }
    await transaction
      .update(fabricLibraryEntries)
      .set({ status: "archived", updatedAt: new Date() })
      .where(eq(fabricLibraryEntries.id, entryId));
    await transaction
      .update(seoMetadata)
      .set({ indexStatus: "noindex", updatedByUserId: actor.userId, updatedAt: new Date() })
      .where(eq(seoMetadata.routeId, current.routeId));
    await writeAuditLog(transaction, {
      actorUserId: actor.userId,
      action: "fabric_entry.archived",
      entityType: "fabric_entry",
      entityId: entryId,
      afterSummary: { reason: reason.trim().slice(0, 500) },
    });
  });
}

export async function confirmFabricEntryIndependentValue<
  TQueryResult extends PgQueryResultHKT,
>(
  db: AppDatabase<TQueryResult>,
  actor: Actor,
  entryId: string,
  options: GovernedMutationOptions = {},
): Promise<void> {
  requirePermission(actor.role, "products.review");
  await runGovernedMutation(db, async ({ transaction, audit }) => {
    const updated = await transaction
      .update(fabricLibraryEntries)
      .set({
        independentValueConfirmedByUserId: actor.userId,
        independentValueConfirmedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(fabricLibraryEntries.id, entryId))
      .returning({ id: fabricLibraryEntries.id });
    if (!updated[0]) throw new Error("Fabric Library Entry was not found.");
    await audit({
      actorUserId: actor.userId,
      action: "fabric_entry.independent_value.confirmed",
      entityType: "fabric_entry",
      entityId: entryId,
    });
  }, options);
}

export async function setFabricEntryIndexStatus<
  TQueryResult extends PgQueryResultHKT,
>(
  db: AppDatabase<TQueryResult>,
  actor: Actor,
  entryId: string,
  indexStatus: "index" | "noindex",
  options: GovernedMutationOptions = {},
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
            eq(fabricLibraryEntryAssets.role, "hero"),
            publicReadyImageSqlConditions(),
            isNotNull(assets.altText),
            ne(assets.altText, ""),
          ),
        ),
      db
        .select({ count: count() })
        .from(fabricLibraryEntryProducts)
        .innerJoin(products, eq(products.id, fabricLibraryEntryProducts.productId))
        .where(
          and(
            eq(fabricLibraryEntryProducts.fabricEntryId, entryId),
            publicProductEligibilityConditions(db),
          ),
        ),
      db.select({ count: count() }).from(fabricLibraryEntryApplications)
        .innerJoin(productApplications, eq(
          productApplications.applicationId,
          fabricLibraryEntryApplications.applicationId,
        ))
        .innerJoin(products, eq(products.id, productApplications.productId))
        .where(and(
          eq(fabricLibraryEntryApplications.fabricEntryId, entryId),
          publicProductEligibilityConditions(db),
        )),
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
  await runGovernedMutation(db, async ({ transaction, audit }) => {
    await transaction
      .update(seoMetadata)
      .set({ indexStatus, updatedByUserId: actor.userId, updatedAt: new Date() })
      .where(eq(seoMetadata.routeId, entry.routeId));
    await audit({
      actorUserId: actor.userId,
      action: "fabric_entry.index_status.changed",
      entityType: "fabric_entry",
      entityId: entryId,
      afterSummary: { indexStatus },
    });
  }, options);
}
