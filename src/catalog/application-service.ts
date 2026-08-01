import { and, count, eq } from "drizzle-orm";
import type { PgQueryResultHKT } from "drizzle-orm/pg-core/session";

import { writeAuditLog } from "@/audit/service";
import { requirePermission } from "@/auth/permissions";
import {
  applicationLocalizations,
  applications,
  keywordPageMappings,
  productApplications,
  routes,
  seoMetadata,
} from "@/db/schema";
import type { AppDatabase } from "@/db/types";

import type { Actor } from "./product-service";

export async function submitApplicationForReview<
  TQueryResult extends PgQueryResultHKT,
>(db: AppDatabase<TQueryResult>, actor: Actor, applicationId: string): Promise<void> {
  requirePermission(actor.role, "taxonomy.manage");
  const updated = await db
    .update(applications)
    .set({ status: "in_review", updatedAt: new Date() })
    .where(and(eq(applications.id, applicationId), eq(applications.status, "draft")))
    .returning({ id: applications.id });
  if (!updated[0]) throw new Error("Only a draft Application can enter review.");
  await writeAuditLog(db, {
    actorUserId: actor.userId,
    action: "application.review.requested",
    entityType: "application",
    entityId: applicationId,
  });
}

export async function publishApplication<TQueryResult extends PgQueryResultHKT>(
  db: AppDatabase<TQueryResult>,
  actor: Actor,
  applicationId: string,
): Promise<void> {
  requirePermission(actor.role, "products.publish");
  const updated = await db
    .update(applications)
    .set({ status: "published", publishedAt: new Date(), updatedAt: new Date() })
    .where(
      and(eq(applications.id, applicationId), eq(applications.status, "in_review")),
    )
    .returning({ id: applications.id });
  if (!updated[0]) throw new Error("Only an in-review Application can be published.");
  await writeAuditLog(db, {
    actorUserId: actor.userId,
    action: "application.published",
    entityType: "application",
    entityId: applicationId,
  });
}

export async function setApplicationIndexStatus<
  TQueryResult extends PgQueryResultHKT,
>(
  db: AppDatabase<TQueryResult>,
  actor: Actor,
  applicationId: string,
  indexStatus: "index" | "noindex",
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
        .where(eq(productApplications.applicationId, applicationId)),
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
        "Indexable Applications require publication, useful copy, related products, metadata, and an owned search intent.",
      );
    }
  }
  await db
    .update(seoMetadata)
    .set({ indexStatus, updatedByUserId: actor.userId, updatedAt: new Date() })
    .where(eq(seoMetadata.routeId, application.routeId));
  await writeAuditLog(db, {
    actorUserId: actor.userId,
    action: "application.index_status.changed",
    entityType: "application",
    entityId: applicationId,
    afterSummary: { indexStatus },
  });
}
