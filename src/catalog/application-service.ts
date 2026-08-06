import { and, count, desc, eq, gt, inArray } from "drizzle-orm";
import type { PgQueryResultHKT } from "drizzle-orm/pg-core/session";
import { z } from "zod";

import { writeAuditLog } from "@/audit/service";
import {
  runGovernedMutation,
  type GovernedMutationOptions,
} from "@/audit/governed-mutation";
import { requirePermission } from "@/auth/permissions";
import {
  applicationLocalizations,
  applications,
  editorialRevisions,
  keywordPageMappings,
  productApplications,
  products,
  redirects,
  routes,
  seoMetadata,
} from "@/db/schema";
import type { AppDatabase } from "@/db/types";
import { publicProductEligibilityConditions } from "./product-eligibility";
import { slugify } from "@/seo/path";

import type { Actor } from "./product-service";

const applicationRevisionSchema = z.object({
  name: z.string().trim().min(1).max(300),
  shortDescription: z.string().nullable(),
  body: z.string().nullable(),
  productIds: z.array(z.uuid()),
  seo: z.object({
    routeId: z.uuid(),
    title: z.string().nullable(),
    metaDescription: z.string().nullable(),
    focusKeyword: z.string().nullable(),
  }).optional(),
});

type ApplicationSnapshot = z.infer<typeof applicationRevisionSchema>;

async function validateApplicationSnapshot<TQueryResult extends PgQueryResultHKT>(
  db: AppDatabase<TQueryResult>,
  applicationId: string,
  snapshot: ApplicationSnapshot,
): Promise<void> {
  if (snapshot.seo) {
    const routeRows = await db
      .select({ id: routes.id })
      .from(routes)
      .where(
        and(
          eq(routes.id, snapshot.seo.routeId),
          eq(routes.entityType, "application"),
          eq(routes.entityId, applicationId),
          eq(routes.isCurrent, true),
        ),
      )
      .limit(1);
    if (!routeRows[0]) throw new Error("Application revision targets an invalid route.");
  }
  const uniqueProductIds = [...new Set(snapshot.productIds)];
  if (uniqueProductIds.length) {
    const productRows = await db
      .select({ id: products.id })
      .from(products)
      .where(inArray(products.id, uniqueProductIds));
    if (productRows.length !== uniqueProductIds.length) {
      throw new Error("An Application relation references a missing Product.");
    }
  }
}

async function applyApplicationSnapshot<TQueryResult extends PgQueryResultHKT>(
  db: AppDatabase<TQueryResult>,
  actor: Actor,
  applicationId: string,
  snapshot: ApplicationSnapshot,
): Promise<void> {
  await db
    .update(applicationLocalizations)
    .set({
      name: snapshot.name,
      shortDescription: snapshot.shortDescription,
      body: snapshot.body,
    })
    .where(
      and(
        eq(applicationLocalizations.applicationId, applicationId),
        eq(applicationLocalizations.locale, "en"),
      ),
    );
  await db.delete(productApplications).where(eq(productApplications.applicationId, applicationId));
  const productIds = [...new Set(snapshot.productIds)];
  if (productIds.length) {
    await db.insert(productApplications).values(
      productIds.map((productId) => ({ productId, applicationId })),
    );
  }
  if (snapshot.seo) {
    await db
      .update(seoMetadata)
      .set({
        title: snapshot.seo.title,
        metaDescription: snapshot.seo.metaDescription,
        focusKeyword: snapshot.seo.focusKeyword,
        updatedByUserId: actor.userId,
        updatedAt: new Date(),
      })
      .where(eq(seoMetadata.routeId, snapshot.seo.routeId));
  }
  await db
    .update(applications)
    .set({ updatedAt: new Date() })
    .where(eq(applications.id, applicationId));
}

export async function updateApplication<TQueryResult extends PgQueryResultHKT>(
  db: AppDatabase<TQueryResult>,
  actor: Actor,
  applicationId: string,
  input: ApplicationSnapshot,
  options: GovernedMutationOptions = {},
): Promise<string | null> {
  requirePermission(actor.role, "taxonomy.manage");
  const snapshot = applicationRevisionSchema.parse({
    ...input,
    productIds: [...new Set(input.productIds)],
    shortDescription: input.shortDescription?.trim() || null,
    body: input.body?.trim() || null,
  });
  const rows = await db
    .select({ status: applications.status })
    .from(applications)
    .where(eq(applications.id, applicationId))
    .limit(1);
  const status = rows[0]?.status;
  if (!status) throw new Error("Application was not found.");
  if (status === "archived") throw new Error("Archived Applications cannot be edited.");
  await validateApplicationSnapshot(db, applicationId, snapshot);
  if (status === "published") {
    return runGovernedMutation(db, async ({ transaction, audit }) => {
      const latestRows = await transaction
        .select({ versionNumber: editorialRevisions.versionNumber })
        .from(editorialRevisions)
        .where(
          and(
            eq(editorialRevisions.entityType, "application"),
            eq(editorialRevisions.entityId, applicationId),
            eq(editorialRevisions.locale, "en"),
          ),
        )
        .orderBy(desc(editorialRevisions.versionNumber))
        .limit(1);
      const inserted = await transaction
        .insert(editorialRevisions)
        .values({
          entityType: "application",
          entityId: applicationId,
          locale: "en",
          versionNumber: (latestRows[0]?.versionNumber ?? 0) + 1,
          status: "in_review",
          snapshot,
          changeSummary: "Published Application update",
          createdByUserId: actor.userId,
        })
        .returning({ id: editorialRevisions.id });
      const revisionId = inserted[0]?.id;
      if (!revisionId) throw new Error("Application revision insert failed.");
      await audit({
        actorUserId: actor.userId,
        action: "application.revision.proposed",
        entityType: "editorial_revision",
        entityId: revisionId,
        afterSummary: { applicationId },
      });
      return revisionId;
    }, options);
  }
  await db.transaction(async (transaction) => {
    await applyApplicationSnapshot(transaction, actor, applicationId, snapshot);
    await writeAuditLog(transaction, {
      actorUserId: actor.userId,
      action: "application.updated",
      entityType: "application",
      entityId: applicationId,
    });
  });
  return null;
}

export async function submitApplicationForReview<
  TQueryResult extends PgQueryResultHKT,
>(
  db: AppDatabase<TQueryResult>,
  actor: Actor,
  applicationId: string,
  options: GovernedMutationOptions = {},
): Promise<void> {
  requirePermission(actor.role, "taxonomy.manage");
  await runGovernedMutation(db, async ({ transaction, audit }) => {
    const updated = await transaction
      .update(applications)
      .set({ status: "in_review", updatedAt: new Date() })
      .where(and(eq(applications.id, applicationId), eq(applications.status, "draft")))
      .returning({ id: applications.id });
    if (!updated[0]) throw new Error("Only a Draft Application can enter review.");
    await audit({
      actorUserId: actor.userId,
      action: "application.review.requested",
      entityType: "application",
      entityId: applicationId,
    });
  }, options);
}

export async function rejectApplicationReview<TQueryResult extends PgQueryResultHKT>(
  db: AppDatabase<TQueryResult>,
  actor: Actor,
  applicationId: string,
  reason: string,
  options: GovernedMutationOptions = {},
): Promise<void> {
  requirePermission(actor.role, "products.review");
  if (!reason.trim()) throw new Error("Application review rejection requires a reason.");
  await runGovernedMutation(db, async ({ transaction, audit }) => {
    const updated = await transaction
      .update(applications)
      .set({ status: "draft", updatedAt: new Date() })
      .where(
        and(eq(applications.id, applicationId), eq(applications.status, "in_review")),
      )
      .returning({ id: applications.id });
    if (!updated[0]) throw new Error("Only an In Review Application can be rejected.");
    await audit({
      actorUserId: actor.userId,
      action: "application.review.rejected",
      entityType: "application",
      entityId: applicationId,
      afterSummary: { reason: reason.trim().slice(0, 500) },
    });
  }, options);
}

export async function publishApplication<TQueryResult extends PgQueryResultHKT>(
  db: AppDatabase<TQueryResult>,
  actor: Actor,
  applicationId: string,
  options: GovernedMutationOptions = {},
): Promise<void> {
  requirePermission(actor.role, "products.publish");
  const localizationRows = await db
    .select({ name: applicationLocalizations.name, body: applicationLocalizations.body })
    .from(applicationLocalizations)
    .where(
      and(
        eq(applicationLocalizations.applicationId, applicationId),
        eq(applicationLocalizations.locale, "en"),
      ),
    )
    .limit(1);
  const localization = localizationRows[0];
  if (!localization?.name.trim() || !localization.body?.trim()) {
    throw new Error("Application publication requires an English name and useful body copy.");
  }
  await runGovernedMutation(db, async ({ transaction, audit }) => {
    const currentRouteRows = await transaction
      .select({ id: routes.id, path: routes.path })
      .from(routes)
      .where(and(
        eq(routes.entityType, "application"),
        eq(routes.entityId, applicationId),
        eq(routes.locale, "en"),
        eq(routes.isCurrent, true),
      ))
      .limit(1);
    let approvedPath = currentRouteRows[0]?.path ?? null;
    if (!currentRouteRows[0]) {
      approvedPath = `/applications/${slugify(localization.name)}/`;
      const collisions = await transaction
        .select({ path: routes.path })
        .from(routes)
        .where(eq(routes.path, approvedPath))
        .limit(1);
      const redirectCollisions = await transaction
        .select({ sourcePath: redirects.sourcePath })
        .from(redirects)
        .where(and(eq(redirects.sourcePath, approvedPath), eq(redirects.isActive, true)))
        .limit(1);
      if (collisions[0] || redirectCollisions[0]) {
        throw new Error("The approved Application URL is already in use.");
      }
      const routeRows = await transaction
        .insert(routes)
        .values({
          locale: "en",
          path: approvedPath,
          entityType: "application",
          entityId: applicationId,
        })
        .returning({ id: routes.id });
      const routeId = routeRows[0]?.id;
      if (!routeId) throw new Error("Application route approval failed.");
      await transaction.insert(seoMetadata).values({
        routeId,
        title: `${localization.name.trim()} | CloudWave Textile`,
        indexStatus: "noindex",
        canonicalPath: approvedPath,
        updatedByUserId: actor.userId,
      });
    }
    const updated = await transaction
      .update(applications)
      .set({ status: "published", publishedAt: new Date(), updatedAt: new Date() })
      .where(
        and(eq(applications.id, applicationId), eq(applications.status, "in_review")),
      )
      .returning({ id: applications.id });
    if (!updated[0]) throw new Error("Only an In Review Application can be published.");
    await audit({
      actorUserId: actor.userId,
      action: "application.published",
      entityType: "application",
      entityId: applicationId,
      afterSummary: { approvedPath },
    });
  }, options);
}

export async function applyApplicationRevision<TQueryResult extends PgQueryResultHKT>(
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
    if (!revision || revision.entityType !== "application" || revision.status !== "in_review") {
      throw new Error("Application revision is not eligible for approval.");
    }
    const newer = await transaction
      .select({ id: editorialRevisions.id })
      .from(editorialRevisions)
      .where(
        and(
          eq(editorialRevisions.entityType, "application"),
          eq(editorialRevisions.entityId, revision.entityId),
          eq(editorialRevisions.locale, revision.locale),
          gt(editorialRevisions.versionNumber, revision.versionNumber),
        ),
      )
      .limit(1);
    if (newer[0]) throw new Error("A newer Application revision exists; this revision is stale.");
    const snapshot = applicationRevisionSchema.parse(revision.snapshot);
    await validateApplicationSnapshot(transaction, revision.entityId, snapshot);
    await applyApplicationSnapshot(transaction, actor, revision.entityId, snapshot);
    await transaction
      .update(editorialRevisions)
      .set({ status: "applied", reviewedByUserId: actor.userId, reviewedAt: new Date() })
      .where(eq(editorialRevisions.id, revisionId));
    await writeAuditLog(transaction, {
      actorUserId: actor.userId,
      action: "application.revision.applied",
      entityType: "editorial_revision",
      entityId: revisionId,
      afterSummary: { applicationId: revision.entityId },
    });
    return revision.entityId;
  });
}

export async function rejectApplicationRevision<TQueryResult extends PgQueryResultHKT>(
  db: AppDatabase<TQueryResult>,
  actor: Actor,
  revisionId: string,
  options: GovernedMutationOptions = {},
): Promise<void> {
  requirePermission(actor.role, "products.review");
  await runGovernedMutation(db, async ({ transaction, audit }) => {
    const updated = await transaction
      .update(editorialRevisions)
      .set({ status: "rejected", reviewedByUserId: actor.userId, reviewedAt: new Date() })
      .where(
        and(
          eq(editorialRevisions.id, revisionId),
          eq(editorialRevisions.entityType, "application"),
          eq(editorialRevisions.status, "in_review"),
        ),
      )
      .returning({ entityId: editorialRevisions.entityId });
    if (!updated[0]) throw new Error("Application revision cannot be rejected.");
    await audit({
      actorUserId: actor.userId,
      action: "application.revision.rejected",
      entityType: "editorial_revision",
      entityId: revisionId,
      afterSummary: { applicationId: updated[0].entityId },
    });
  }, options);
}

export async function archiveApplication<TQueryResult extends PgQueryResultHKT>(
  db: AppDatabase<TQueryResult>,
  actor: Actor,
  applicationId: string,
  reason: string,
): Promise<void> {
  requirePermission(actor.role, "products.publish");
  if (!reason.trim()) throw new Error("Archive requires a reason.");
  await db.transaction(async (transaction) => {
    const routeRows = await transaction
      .select({ id: routes.id })
      .from(routes)
      .where(
        and(
          eq(routes.entityType, "application"),
          eq(routes.entityId, applicationId),
          eq(routes.isCurrent, true),
        ),
      );
    const updated = await transaction
      .update(applications)
      .set({ status: "archived", updatedAt: new Date() })
      .where(and(eq(applications.id, applicationId), eq(applications.status, "published")))
      .returning({ id: applications.id });
    if (!updated[0]) throw new Error("Only a Published Application can be archived.");
    for (const route of routeRows) {
      await transaction
        .update(seoMetadata)
        .set({ indexStatus: "noindex", updatedByUserId: actor.userId, updatedAt: new Date() })
        .where(eq(seoMetadata.routeId, route.id));
    }
    await writeAuditLog(transaction, {
      actorUserId: actor.userId,
      action: "application.archived",
      entityType: "application",
      entityId: applicationId,
      afterSummary: { reason: reason.trim().slice(0, 500) },
    });
  });
}

export async function setApplicationIndexStatus<
  TQueryResult extends PgQueryResultHKT,
>(
  db: AppDatabase<TQueryResult>,
  actor: Actor,
  applicationId: string,
  indexStatus: "index" | "noindex",
  options: GovernedMutationOptions = {},
): Promise<void> {
  requirePermission(actor.role, "seo.manage");
  const rows = await db
    .select({
      status: applications.status,
      body: applicationLocalizations.body,
      routeId: routes.id,
      title: seoMetadata.title,
      metaDescription: seoMetadata.metaDescription,
    })
    .from(applications)
    .innerJoin(
      applicationLocalizations,
      and(
        eq(applicationLocalizations.applicationId, applications.id),
        eq(applicationLocalizations.locale, "en"),
      ),
    )
    .innerJoin(
      routes,
      and(
        eq(routes.entityType, "application"),
        eq(routes.entityId, applications.id),
        eq(routes.isCurrent, true),
      ),
    )
    .innerJoin(seoMetadata, eq(seoMetadata.routeId, routes.id))
    .where(eq(applications.id, applicationId))
    .limit(1);
  const application = rows[0];
  if (!application) throw new Error("Application SEO record was not found.");
  if (indexStatus === "index") {
    const [productRows, intentRows] = await Promise.all([
      db
        .select({ count: count() })
        .from(productApplications)
        .innerJoin(products, eq(products.id, productApplications.productId))
        .where(
          and(
            eq(productApplications.applicationId, applicationId),
            publicProductEligibilityConditions(db),
          ),
        ),
      db
        .select({ count: count() })
        .from(keywordPageMappings)
        .where(eq(keywordPageMappings.primaryRouteId, application.routeId)),
    ]);
    if (
      application.status !== "published" ||
      !application.body?.trim() ||
      !application.title?.trim() ||
      !application.metaDescription?.trim() ||
      Number(productRows[0]?.count ?? 0) < 1 ||
      Number(intentRows[0]?.count ?? 0) < 1
    ) {
      throw new Error(
        "Indexable Applications require publication, useful copy, a published Product, metadata, and an owned search intent.",
      );
    }
  }
  await runGovernedMutation(db, async ({ transaction, audit }) => {
    await transaction
      .update(seoMetadata)
      .set({ indexStatus, updatedByUserId: actor.userId, updatedAt: new Date() })
      .where(eq(seoMetadata.routeId, application.routeId));
    await audit({
      actorUserId: actor.userId,
      action: "application.index_status.changed",
      entityType: "application",
      entityId: applicationId,
      afterSummary: { indexStatus },
    });
  }, options);
}
