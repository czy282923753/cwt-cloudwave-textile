import { and, desc, eq } from "drizzle-orm";
import type { PgQueryResultHKT } from "drizzle-orm/pg-core/session";

import { databaseConnection } from "@/db/client";
import { routes, seoMetadata } from "@/db/schema";
import type { AppDatabase } from "@/db/types";

async function queryIndexableRoutes<TQueryResult extends PgQueryResultHKT>(
  db: AppDatabase<TQueryResult>,
) {
  return db
    .select({ path: routes.path, updatedAt: routes.updatedAt })
    .from(routes)
    .innerJoin(seoMetadata, eq(seoMetadata.routeId, routes.id))
    .where(
      and(
        eq(routes.isCurrent, true),
        eq(routes.locale, "en"),
        eq(seoMetadata.indexStatus, "index"),
      ),
    )
    .orderBy(desc(routes.updatedAt));
}

export async function listIndexableRoutes() {
  return databaseConnection.kind === "pglite"
    ? queryIndexableRoutes(databaseConnection.db)
    : queryIndexableRoutes(databaseConnection.db);
}
