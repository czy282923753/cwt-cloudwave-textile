import { and, eq } from "drizzle-orm";
import type { PgQueryResultHKT } from "drizzle-orm/pg-core/session";

import {
  runGovernedMutation,
  type GovernedMutationOptions,
} from "@/audit/governed-mutation";
import { requirePermission } from "@/auth/permissions";
import {
  applications,
  fabricLibraryEntries,
  keywordPageMappings,
  products,
  routes,
  taxonomyTerms,
} from "@/db/schema";
import type { AppDatabase } from "@/db/types";
import type { Actor } from "@/catalog/product-service";
import {
  hasPubliclyEligibleProductForApplicationConditions,
  hasPubliclyEligibleProductForFabricEntryConditions,
  hasPubliclyEligibleProductForTaxonomyConditions,
  publicProductEligibilityConditions,
} from "@/catalog/product-eligibility";

async function assertEligiblePrimaryOwner<TQueryResult extends PgQueryResultHKT>(
  db: AppDatabase<TQueryResult>,
  route: { entityType: typeof routes.$inferSelect.entityType; entityId: string | null },
): Promise<void> {
  if (!route.entityId) return;
  let eligible = true;
  if (route.entityType === "product") {
    eligible = Boolean((await db.select({ id: products.id }).from(products)
      .where(and(eq(products.id, route.entityId), publicProductEligibilityConditions(db))).limit(1))[0]);
  } else if (route.entityType === "taxonomy") {
    eligible = Boolean((await db.select({ id: taxonomyTerms.id }).from(taxonomyTerms)
      .where(and(eq(taxonomyTerms.id, route.entityId), hasPubliclyEligibleProductForTaxonomyConditions(db))).limit(1))[0]);
  } else if (route.entityType === "application") {
    eligible = Boolean((await db.select({ id: applications.id }).from(applications)
      .where(and(eq(applications.id, route.entityId), hasPubliclyEligibleProductForApplicationConditions(db))).limit(1))[0]);
  } else if (route.entityType === "fabric_entry") {
    eligible = Boolean((await db.select({ id: fabricLibraryEntries.id }).from(fabricLibraryEntries)
      .where(and(eq(fabricLibraryEntries.id, route.entityId), hasPubliclyEligibleProductForFabricEntryConditions(db))).limit(1))[0]);
  }
  if (!eligible) throw new Error("Primary keyword owner is not backed by a publicly eligible real Product.");
}

export function normalizeKeyword(keyword: string): string {
  const normalized = keyword.trim().toLowerCase().replace(/\s+/g, " ");
  if (!normalized) throw new Error("Keyword is required.");
  return normalized;
}

export async function assignPrimaryKeywordOwner<
  TQueryResult extends PgQueryResultHKT,
>(
  db: AppDatabase<TQueryResult>,
  actor: Actor,
  input: {
    keyword: string;
    intent: typeof keywordPageMappings.$inferInsert.intent;
    routeId: string;
    notes?: string;
  },
  options: GovernedMutationOptions = {},
): Promise<string> {
  requirePermission(actor.role, "seo.manage");
  const normalizedKeyword = normalizeKeyword(input.keyword);
  const routeRows = await db
    .select({ id: routes.id, entityType: routes.entityType, entityId: routes.entityId })
    .from(routes)
    .where(eq(routes.id, input.routeId))
    .limit(1);
  if (!routeRows[0]) throw new Error("Keyword owner route was not found.");
  await assertEligiblePrimaryOwner(db, routeRows[0]);
  return runGovernedMutation(db, async ({ transaction, audit }) => {
    const rows = await transaction
      .insert(keywordPageMappings)
      .values({
        locale: "en",
        normalizedKeyword,
        intent: input.intent,
        primaryRouteId: input.routeId,
        notes: input.notes?.trim() || null,
        updatedByUserId: actor.userId,
      })
      .onConflictDoUpdate({
        target: [keywordPageMappings.locale, keywordPageMappings.normalizedKeyword],
        set: {
          intent: input.intent,
          primaryRouteId: input.routeId,
          notes: input.notes?.trim() || null,
          updatedByUserId: actor.userId,
          updatedAt: new Date(),
        },
      })
      .returning({ id: keywordPageMappings.id });
    const mappingId = rows[0]?.id;
    if (!mappingId) throw new Error("Keyword mapping did not return an ID.");
    await audit({
      actorUserId: actor.userId,
      action: "seo.keyword_owner.assigned",
      entityType: "keyword_mapping",
      entityId: mappingId,
      afterSummary: { normalizedKeyword, routeId: input.routeId },
    });
    return mappingId;
  }, options);
}
