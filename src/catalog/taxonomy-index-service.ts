import { and, count, eq } from "drizzle-orm";
import type { PgQueryResultHKT } from "drizzle-orm/pg-core/session";

import {
  runGovernedMutation,
  type GovernedMutationOptions,
} from "@/audit/governed-mutation";
import { requirePermission } from "@/auth/permissions";
import type { Actor } from "@/catalog/product-service";
import {
  keywordPageMappings,
  productTaxonomyTerms,
  products,
  routes,
  seoMetadata,
  taxonomyTermLocalizations,
  taxonomyTerms,
} from "@/db/schema";
import type { AppDatabase } from "@/db/types";
import { publicProductEligibilityConditions } from "./product-eligibility";

export async function setTaxonomyIndexStatus<
  TQueryResult extends PgQueryResultHKT,
>(
  db: AppDatabase<TQueryResult>,
  actor: Actor,
  taxonomyTermId: string,
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
    .where(eq(taxonomyTerms.id, taxonomyTermId))
    .limit(1);
  const term = rows[0];
  if (!term) throw new Error("Taxonomy SEO record was not found.");
  if (indexStatus === "index") {
    const [productRows, intentRows] = await Promise.all([
      db
        .select({ count: count() })
        .from(productTaxonomyTerms)
        .innerJoin(products, eq(products.id, productTaxonomyTerms.productId))
        .where(and(
          eq(productTaxonomyTerms.taxonomyTermId, taxonomyTermId),
          publicProductEligibilityConditions(db),
        )),
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
        "Indexable taxonomy pages require active terms, useful copy, related products, metadata, and an owned intent.",
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
      entityId: taxonomyTermId,
      afterSummary: { indexStatus },
    });
  }, options);
}
