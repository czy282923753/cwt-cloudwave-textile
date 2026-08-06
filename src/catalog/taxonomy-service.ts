import { and, count, eq } from "drizzle-orm";
import type { PgQueryResultHKT } from "drizzle-orm/pg-core/session";

import { writeAuditLog } from "@/audit/service";
import {
  runGovernedMutation,
  type GovernedMutationOptions,
} from "@/audit/governed-mutation";
import { requirePermission } from "@/auth/permissions";
import {
  applicationLocalizations,
  applications,
  redirects,
  routes,
  seoMetadata,
  taxonomyTermLocalizations,
  taxonomyTerms,
  keywordPageMappings,
  productTaxonomyTerms,
  products,
} from "@/db/schema";
import type { AppDatabase } from "@/db/types";
import { publicProductEligibilityConditions } from "./product-eligibility";
import { slugify } from "@/seo/path";
import { normalizeProductCodePrefix } from "./product-data";

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
    productCodePrefix?: string | null;
  },
): Promise<string> {
  requirePermission(actor.role, "taxonomy.manage");
  assertSportsBoundary("taxonomy", input.name, input.dimension);
  const slug = slugify(input.name);
  const path = `/fabric-types/${slug}/`;
  await assertPathAvailable(db, path);
  return db.transaction(async (transaction) => {
    const rows = await transaction
      .insert(taxonomyTerms)
      .values({
        internalKey: input.internalKey,
        dimension: input.dimension,
        productCodePrefix: normalizeProductCodePrefix(input.productCodePrefix),
      })
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
      afterSummary: {
        dimension: input.dimension,
        path,
        productCodePrefix: normalizeProductCodePrefix(input.productCodePrefix),
      },
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
  const path = `/applications/${slugify(input.name)}/`;
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

export async function quickCreateTaxonomyTerm<TQueryResult extends PgQueryResultHKT>(
  db: AppDatabase<TQueryResult>,
  actor: Actor,
  input: {
    internalKey: string;
    name: string;
    dimension: typeof taxonomyTerms.$inferInsert.dimension;
    productCodePrefix?: string | null;
  },
): Promise<string> {
  requirePermission(actor.role, "taxonomy.manage");
  assertSportsBoundary("taxonomy", input.name, input.dimension);
  const name = input.name.trim();
  const internalKey = `quick-${slugify(name)}`;
  if (!name || internalKey === "quick-") throw new Error("Taxonomy name is required.");
  return db.transaction(async (transaction) => {
    const inserted = await transaction.insert(taxonomyTerms).values({
      internalKey,
      dimension: input.dimension,
      productCodePrefix: normalizeProductCodePrefix(input.productCodePrefix),
      isActive: true,
    }).onConflictDoNothing({ target: taxonomyTerms.internalKey }).returning({ id: taxonomyTerms.id });
    if (inserted[0]) {
      await transaction.insert(taxonomyTermLocalizations).values({
        taxonomyTermId: inserted[0].id,
        locale: "en",
        name,
      });
      await writeAuditLog(transaction, {
        actorUserId: actor.userId,
        action: "taxonomy.quick_draft.created",
        entityType: "taxonomy",
        entityId: inserted[0].id,
        afterSummary: { publicRouteCreated: false, internalKey },
      });
      return inserted[0].id;
    }
    const existing = await transaction.select({ id: taxonomyTerms.id }).from(taxonomyTerms)
      .where(eq(taxonomyTerms.internalKey, internalKey)).limit(1);
    if (!existing[0]) throw new Error("The normalized Category already exists.");
    return existing[0].id;
  });
}

export async function quickCreateApplicationDraft<TQueryResult extends PgQueryResultHKT>(
  db: AppDatabase<TQueryResult>,
  actor: Actor,
  input: { internalKey: string; name: string },
): Promise<string> {
  requirePermission(actor.role, "taxonomy.manage");
  assertSportsBoundary("application", input.name);
  const name = input.name.trim();
  const internalKey = `quick-${slugify(name)}`;
  if (!name || internalKey === "quick-") throw new Error("Application name is required.");
  return db.transaction(async (transaction) => {
    const inserted = await transaction.insert(applications).values({
      internalKey,
      status: "draft",
      createdByUserId: actor.userId,
    }).onConflictDoNothing({ target: applications.internalKey }).returning({ id: applications.id });
    if (inserted[0]) {
      await transaction.insert(applicationLocalizations).values({
        applicationId: inserted[0].id,
        locale: "en",
        name,
      });
      await writeAuditLog(transaction, {
        actorUserId: actor.userId,
        action: "application.quick_draft.created",
        entityType: "application",
        entityId: inserted[0].id,
        afterSummary: { publicRouteCreated: false, internalKey },
      });
      return inserted[0].id;
    }
    const existing = await transaction.select({ id: applications.id }).from(applications)
      .where(eq(applications.internalKey, internalKey)).limit(1);
    if (!existing[0]) throw new Error("The normalized Application already exists.");
    return existing[0].id;
  });
}

export async function updateTaxonomyTerm<TQueryResult extends PgQueryResultHKT>(
  db: AppDatabase<TQueryResult>,
  actor: Actor,
  termId: string,
  input: {
    name: string;
    description?: string | null;
    dimension: typeof taxonomyTerms.$inferInsert.dimension;
    productCodePrefix?: string | null;
  },
): Promise<void> {
  requirePermission(actor.role, "taxonomy.manage");
  assertSportsBoundary("taxonomy", input.name, input.dimension);
  if (!input.name.trim()) throw new Error("Taxonomy name is required.");
  await db.transaction(async (transaction) => {
    const updated = await transaction
      .update(taxonomyTerms)
      .set({
        dimension: input.dimension,
        productCodePrefix: normalizeProductCodePrefix(input.productCodePrefix),
        updatedAt: new Date(),
      })
      .where(eq(taxonomyTerms.id, termId))
      .returning({ id: taxonomyTerms.id });
    if (!updated[0]) throw new Error("Taxonomy term was not found.");
    await transaction
      .update(taxonomyTermLocalizations)
      .set({
        name: input.name.trim(),
        description: input.description?.trim() || null,
      })
      .where(
        and(
          eq(taxonomyTermLocalizations.taxonomyTermId, termId),
          eq(taxonomyTermLocalizations.locale, "en"),
        ),
      );
    await writeAuditLog(transaction, {
      actorUserId: actor.userId,
      action: "taxonomy.updated",
      entityType: "taxonomy",
      entityId: termId,
      afterSummary: {
        dimension: input.dimension,
        productCodePrefix: normalizeProductCodePrefix(input.productCodePrefix),
      },
    });
  });
}

export async function approveTaxonomyPublicRoute<TQueryResult extends PgQueryResultHKT>(
  db: AppDatabase<TQueryResult>,
  actor: Actor,
  termId: string,
  options: GovernedMutationOptions = {},
): Promise<string> {
  requirePermission(actor.role, "taxonomy.manage");
  return runGovernedMutation(db, async ({ transaction, audit }) => {
    const existing = await transaction
      .select({ id: routes.id })
      .from(routes)
      .where(and(
        eq(routes.entityType, "taxonomy"),
        eq(routes.entityId, termId),
        eq(routes.locale, "en"),
        eq(routes.isCurrent, true),
      ))
      .limit(1);
    if (existing[0]) return existing[0].id;
    const names = await transaction
      .select({ name: taxonomyTermLocalizations.name })
      .from(taxonomyTermLocalizations)
      .where(and(
        eq(taxonomyTermLocalizations.taxonomyTermId, termId),
        eq(taxonomyTermLocalizations.locale, "en"),
      ))
      .limit(1);
    if (!names[0]?.name.trim()) throw new Error("Taxonomy approval requires an English name.");
    const path = `/fabric-types/${slugify(names[0].name)}/`;
    const [routeCollision, redirectCollision] = await Promise.all([
      transaction.select({ id: routes.id }).from(routes).where(eq(routes.path, path)).limit(1),
      transaction.select({ id: redirects.id }).from(redirects)
        .where(and(eq(redirects.sourcePath, path), eq(redirects.isActive, true))).limit(1),
    ]);
    if (routeCollision[0] || redirectCollision[0]) {
      throw new Error("The approved Taxonomy URL is already in use.");
    }
    const inserted = await transaction.insert(routes).values({
      locale: "en",
      path,
      entityType: "taxonomy",
      entityId: termId,
    }).returning({ id: routes.id });
    const routeId = inserted[0]?.id;
    if (!routeId) throw new Error("Taxonomy route approval failed.");
    await transaction.insert(seoMetadata).values({
      routeId,
      title: `${names[0].name.trim()} | CloudWave Textile`,
      indexStatus: "noindex",
      canonicalPath: path,
      updatedByUserId: actor.userId,
    });
    await audit({
      actorUserId: actor.userId,
      action: "taxonomy.route.approved",
      entityType: "taxonomy",
      entityId: termId,
      afterSummary: { path },
    });
    return routeId;
  }, options);
}

export async function setTaxonomyIndexStatus<TQueryResult extends PgQueryResultHKT>(
  db: AppDatabase<TQueryResult>,
  actor: Actor,
  termId: string,
  indexStatus: "index" | "noindex",
  options: GovernedMutationOptions = {},
): Promise<void> {
  requirePermission(actor.role, "seo.manage");
  const rows = await db
    .select({
      active: taxonomyTerms.isActive,
      description: taxonomyTermLocalizations.description,
      routeId: routes.id,
      title: seoMetadata.title,
      metaDescription: seoMetadata.metaDescription,
    })
    .from(taxonomyTerms)
    .innerJoin(
      taxonomyTermLocalizations,
      and(
        eq(taxonomyTermLocalizations.taxonomyTermId, taxonomyTerms.id),
        eq(taxonomyTermLocalizations.locale, "en"),
      ),
    )
    .innerJoin(
      routes,
      and(
        eq(routes.entityType, "taxonomy"),
        eq(routes.entityId, taxonomyTerms.id),
        eq(routes.isCurrent, true),
      ),
    )
    .innerJoin(seoMetadata, eq(seoMetadata.routeId, routes.id))
    .where(eq(taxonomyTerms.id, termId))
    .limit(1);
  const term = rows[0];
  if (!term) throw new Error("Taxonomy SEO record was not found.");
  if (indexStatus === "index") {
    const [productRows, intentRows] = await Promise.all([
      db
        .select({ count: count() })
        .from(productTaxonomyTerms)
        .innerJoin(products, eq(products.id, productTaxonomyTerms.productId))
        .where(
          and(
            eq(productTaxonomyTerms.taxonomyTermId, termId),
            publicProductEligibilityConditions(db),
          ),
        ),
      db
        .select({ count: count() })
        .from(keywordPageMappings)
        .where(eq(keywordPageMappings.primaryRouteId, term.routeId)),
    ]);
    if (
      !term.active ||
      !term.description?.trim() ||
      !term.title?.trim() ||
      !term.metaDescription?.trim() ||
      Number(productRows[0]?.count ?? 0) < 1 ||
      Number(intentRows[0]?.count ?? 0) < 1
    ) {
      throw new Error(
        "Indexable taxonomy pages require an active term, useful copy, a published Product, metadata, and an owned search intent.",
      );
    }
  }
  await runGovernedMutation(db, async ({ transaction, audit }) => {
    await transaction
      .update(seoMetadata)
      .set({ indexStatus, updatedByUserId: actor.userId, updatedAt: new Date() })
      .where(eq(seoMetadata.routeId, term.routeId));
    await audit({
      actorUserId: actor.userId,
      action: "taxonomy.index_status.changed",
      entityType: "taxonomy",
      entityId: termId,
      afterSummary: { indexStatus },
    });
  }, options);
}

export async function setTaxonomyActive<TQueryResult extends PgQueryResultHKT>(
  db: AppDatabase<TQueryResult>,
  actor: Actor,
  termId: string,
  active: boolean,
): Promise<void> {
  requirePermission(actor.role, "taxonomy.manage");
  await db.transaction(async (transaction) => {
    const updated = await transaction
      .update(taxonomyTerms)
      .set({ isActive: active, updatedAt: new Date() })
      .where(eq(taxonomyTerms.id, termId))
      .returning({ id: taxonomyTerms.id });
    if (!updated[0]) throw new Error("Taxonomy term was not found.");
    if (!active) {
      const routeRows = await transaction
        .select({ id: routes.id })
        .from(routes)
        .where(
          and(
            eq(routes.entityType, "taxonomy"),
            eq(routes.entityId, termId),
            eq(routes.isCurrent, true),
          ),
        );
      for (const route of routeRows) {
        await transaction
          .update(seoMetadata)
          .set({ indexStatus: "noindex", updatedByUserId: actor.userId, updatedAt: new Date() })
          .where(eq(seoMetadata.routeId, route.id));
      }
    }
    await writeAuditLog(transaction, {
      actorUserId: actor.userId,
      action: active ? "taxonomy.activated" : "taxonomy.deactivated",
      entityType: "taxonomy",
      entityId: termId,
    });
  });
}
