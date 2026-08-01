import { and, eq, exists, inArray, isNotNull, sql } from "drizzle-orm";
import type { PgQueryResultHKT } from "drizzle-orm/pg-core/session";

import {
  assets,
  productAssets,
  productLocalizations,
  products,
  routes,
  users,
} from "@/db/schema";
import type { AppDatabase } from "@/db/types";
import {
  publicImageRoles,
  publicReadyImageSqlConditions,
} from "@/uploads/asset-eligibility";

export function verifiedRealProductConditions<
  TQueryResult extends PgQueryResultHKT,
>(db: AppDatabase<TQueryResult>) {
  return and(
    isNotNull(products.realProductBasis),
    isNotNull(products.realProductConfirmedByUserId),
    isNotNull(products.realProductConfirmedAt),
    exists(
      db
        .select({ id: users.id })
        .from(users)
        .where(
          and(
            eq(users.id, products.realProductConfirmedByUserId),
            eq(users.isActive, true),
            inArray(users.role, ["admin", "reviewer_publisher"]),
          ),
        ),
    ),
  )!;
}

export function hasEligibleProductImageConditions<
  TQueryResult extends PgQueryResultHKT,
>(db: AppDatabase<TQueryResult>, now = new Date()) {
  return exists(
    db
      .select({ id: productAssets.assetId })
      .from(productAssets)
      .innerJoin(assets, eq(assets.id, productAssets.assetId))
      .where(
        and(
          eq(productAssets.productId, products.id),
          inArray(productAssets.role, [...publicImageRoles]),
          publicReadyImageSqlConditions(now),
        ),
      ),
  );
}

export function publicProductEligibilityConditions<
  TQueryResult extends PgQueryResultHKT,
>(db: AppDatabase<TQueryResult>, now = new Date()) {
  return and(
    eq(products.status, "published"),
    verifiedRealProductConditions(db),
    hasEligibleProductImageConditions(db, now),
    exists(
      db
        .select({ id: productLocalizations.productId })
        .from(productLocalizations)
        .where(
          and(
            eq(productLocalizations.productId, products.id),
            eq(productLocalizations.locale, "en"),
            sql`length(trim(${productLocalizations.name})) > 0`,
          ),
        ),
    ),
    exists(
      db
        .select({ id: routes.id })
        .from(routes)
        .where(
          and(
            eq(routes.entityType, "product"),
            eq(routes.entityId, products.id),
            eq(routes.locale, "en"),
            eq(routes.isCurrent, true),
          ),
        ),
    ),
  )!;
}
