import { eq } from "drizzle-orm";
import type { PgQueryResultHKT } from "drizzle-orm/pg-core/session";

import { writeAuditLog } from "@/audit/service";
import { requirePermission } from "@/auth/permissions";
import {
  applicationLocalizations,
  applications,
  routes,
  seoMetadata,
  taxonomyTermLocalizations,
  taxonomyTerms,
} from "@/db/schema";
import type { AppDatabase } from "@/db/types";
import { slugify } from "@/seo/path";

import type { Actor } from "./product-service";

export function assertSportsBoundary(
  kind: "taxonomy" | "application",
  name: string,
  dimension?: typeof taxonomyTerms.$inferInsert.dimension,
): void {
  const normalized = name.trim().toLowerCase();
  if (kind === "application" && normalized === "sports fabric") {
    throw new Error(
      "Sports Fabric belongs in Commercial Collection or a curated landing page; Sportswear is the Application.",
    );
  }
  if (
    kind === "taxonomy" &&
    normalized === "sports fabric" &&
    dimension !== "commercial_collection"
  ) {
    throw new Error("Sports Fabric taxonomy terms must use Commercial Collection.");
  }
}

async function assertPathAvailable<TQueryResult extends PgQueryResultHKT>(
  db: AppDatabase<TQueryResult>,
  path: string,
): Promise<void> {
  const rows = await db.select({ id: routes.id }).from(routes).where(eq(routes.path, path));
  if (rows[0]) throw new Error("The requested URL is already in use.");
}

export async function createTaxonomyTerm<TQueryResult extends PgQueryResultHKT>(
  db: AppDatabase<TQueryResult>,
  actor: Actor,
  input: {
    internalKey: string;
    name: string;
    dimension: typeof taxonomyTerms.$inferInsert.dimension;
    description?: string;
  },
): Promise<string> {
  requirePermission(actor.role, "taxonomy.manage");
  assertSportsBoundary("taxonomy", input.name, input.dimension);
  const slug = slugify(input.name);
  const path = `/fabric-types/${slug}`;
  await assertPathAvailable(db, path);
  return db.transaction(async (transaction) => {
    const rows = await transaction
      .insert(taxonomyTerms)
      .values({ internalKey: input.internalKey, dimension: input.dimension })
      .returning({ id: taxonomyTerms.id });
    const termId = rows[0]?.id;
    if (!termId) throw new Error("Taxonomy term insert did not return an ID.");
    await transaction.insert(taxonomyTermLocalizations).values({
      taxonomyTermId: termId,
      locale: "en",
      name: input.name.trim(),
      description: input.description?.trim() || null,
    });
    const routeRows = await transaction
      .insert(routes)
      .values({ locale: "en", path, entityType: "taxonomy", entityId: termId })
      .returning({ id: routes.id });
    const routeId = routeRows[0]?.id;
    if (!routeId) throw new Error("Taxonomy route insert failed.");
    await transaction.insert(seoMetadata).values({
      routeId,
      title: `${input.name.trim()} | CloudWave Textile`,
      indexStatus: "noindex",
      canonicalPath: path,
    });
    await writeAuditLog(transaction, {
      actorUserId: actor.userId,
      action: "taxonomy.created",
      entityType: "taxonomy",
      entityId: termId,
      afterSummary: { dimension: input.dimension, path },
    });
    return termId;
  });
}

export async function createApplicationDraft<TQueryResult extends PgQueryResultHKT>(
  db: AppDatabase<TQueryResult>,
  actor: Actor,
  input: {
    internalKey: string;
    name: string;
    shortDescription?: string;
    body?: string;
  },
): Promise<string> {
  requirePermission(actor.role, "taxonomy.manage");
  assertSportsBoundary("application", input.name);
  const path = `/applications/${slugify(input.name)}`;
  await assertPathAvailable(db, path);
  return db.transaction(async (transaction) => {
    const rows = await transaction
      .insert(applications)
      .values({
        internalKey: input.internalKey,
        status: "draft",
        createdByUserId: actor.userId,
      })
      .returning({ id: applications.id });
    const applicationId = rows[0]?.id;
    if (!applicationId) throw new Error("Application insert did not return an ID.");
    await transaction.insert(applicationLocalizations).values({
      applicationId,
      locale: "en",
      name: input.name.trim(),
      shortDescription: input.shortDescription?.trim() || null,
      body: input.body?.trim() || null,
    });
    const routeRows = await transaction
      .insert(routes)
      .values({
        locale: "en",
        path,
        entityType: "application",
        entityId: applicationId,
      })
      .returning({ id: routes.id });
    const routeId = routeRows[0]?.id;
    if (!routeId) throw new Error("Application route insert failed.");
    await transaction.insert(seoMetadata).values({
      routeId,
      title: `${input.name.trim()} | CloudWave Textile`,
      indexStatus: "noindex",
      canonicalPath: path,
    });
    await writeAuditLog(transaction, {
      actorUserId: actor.userId,
      action: "application.draft.created",
      entityType: "application",
      entityId: applicationId,
      afterSummary: { path },
    });
    return applicationId;
  });
}
