import { eq } from "drizzle-orm";
import type { PgQueryResultHKT } from "drizzle-orm/pg-core/session";

import { writeAuditLog } from "@/audit/service";
import { requirePermission } from "@/auth/permissions";
import type { Actor } from "@/catalog/product-service";
import { routes, seoMetadata } from "@/db/schema";
import type { AppDatabase } from "@/db/types";

import { normalizePath } from "./path";

export async function updateSeoMetadata<TQueryResult extends PgQueryResultHKT>(
  db: AppDatabase<TQueryResult>,
  actor: Actor,
  routeId: string,
  input: {
    title?: string | null;
    metaDescription?: string | null;
    focusKeyword?: string | null;
    canonicalPath?: string | null;
  },
): Promise<void> {
  requirePermission(actor.role, "seo.manage");
  let canonicalPath: string | null | undefined;
  if (input.canonicalPath !== undefined) {
    canonicalPath = input.canonicalPath ? normalizePath(input.canonicalPath) : null;
    if (canonicalPath) {
      const target = await db
        .select({ id: routes.id })
        .from(routes)
        .where(eq(routes.path, canonicalPath))
        .limit(1);
      if (!target[0]) throw new Error("Canonical target must be a current governed route.");
    }
  }
  await db
    .update(seoMetadata)
    .set({
      ...(input.title !== undefined ? { title: input.title?.trim() || null } : {}),
      ...(input.metaDescription !== undefined
        ? { metaDescription: input.metaDescription?.trim() || null }
        : {}),
      ...(input.focusKeyword !== undefined
        ? { focusKeyword: input.focusKeyword?.trim() || null }
        : {}),
      ...(canonicalPath !== undefined ? { canonicalPath } : {}),
      updatedByUserId: actor.userId,
      updatedAt: new Date(),
    })
    .where(eq(seoMetadata.routeId, routeId));
  await writeAuditLog(db, {
    actorUserId: actor.userId,
    action: "seo.metadata.updated",
    entityType: "route",
    entityId: routeId,
    afterSummary: {
      titleChanged: input.title !== undefined,
      descriptionChanged: input.metaDescription !== undefined,
      canonicalPath,
    },
  });
}
