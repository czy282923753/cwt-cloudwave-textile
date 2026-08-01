import { eq } from "drizzle-orm";
import type { PgQueryResultHKT } from "drizzle-orm/pg-core/session";

import { writeAuditLog } from "@/audit/service";
import { requirePermission } from "@/auth/permissions";
import { keywordPageMappings, routes } from "@/db/schema";
import type { AppDatabase } from "@/db/types";
import type { Actor } from "@/catalog/product-service";

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
): Promise<string> {
  requirePermission(actor.role, "seo.manage");
  const normalizedKeyword = normalizeKeyword(input.keyword);
  const routeRows = await db
    .select({ id: routes.id })
    .from(routes)
    .where(eq(routes.id, input.routeId))
    .limit(1);
  if (!routeRows[0]) throw new Error("Keyword owner route was not found.");
  const rows = await db
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
  await writeAuditLog(db, {
    actorUserId: actor.userId,
    action: "seo.keyword_owner.assigned",
    entityType: "keyword_mapping",
    entityId: mappingId,
    afterSummary: { normalizedKeyword, routeId: input.routeId },
  });
  return mappingId;
}
