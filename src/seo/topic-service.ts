import type { PgQueryResultHKT } from "drizzle-orm/pg-core/session";

import { writeAuditLog } from "@/audit/service";
import { requirePermission } from "@/auth/permissions";
import type { Actor } from "@/catalog/product-service";
import {
  internalLinkRelations,
  seoTopicMembers,
  seoTopics,
} from "@/db/schema";
import type { AppDatabase } from "@/db/types";

import { normalizeKeyword } from "./keyword-mapping-service";

export async function createSeoTopic<TQueryResult extends PgQueryResultHKT>(
  db: AppDatabase<TQueryResult>,
  actor: Actor,
  input: {
    name: string;
    primaryKeyword: string;
    intent: typeof seoTopics.$inferInsert.intent;
  },
): Promise<string> {
  requirePermission(actor.role, "seo.manage");
  const rows = await db
    .insert(seoTopics)
    .values({
      name: input.name.trim(),
      primaryKeyword: normalizeKeyword(input.primaryKeyword),
      intent: input.intent,
      locale: "en",
    })
    .returning({ id: seoTopics.id });
  const topicId = rows[0]?.id;
  if (!topicId) throw new Error("SEO topic insert failed.");
  await writeAuditLog(db, {
    actorUserId: actor.userId,
    action: "seo.topic.created",
    entityType: "seo_topic",
    entityId: topicId,
  });
  return topicId;
}

export async function addTopicMember<TQueryResult extends PgQueryResultHKT>(
  db: AppDatabase<TQueryResult>,
  actor: Actor,
  input: {
    topicId: string;
    routeId: string;
    role: typeof seoTopicMembers.$inferInsert.role;
  },
): Promise<void> {
  requirePermission(actor.role, "seo.manage");
  await db.insert(seoTopicMembers).values(input).onConflictDoNothing();
  await writeAuditLog(db, {
    actorUserId: actor.userId,
    action: "seo.topic_member.added",
    entityType: "seo_topic",
    entityId: input.topicId,
    afterSummary: { routeId: input.routeId, role: input.role },
  });
}

export async function createInternalLink<TQueryResult extends PgQueryResultHKT>(
  db: AppDatabase<TQueryResult>,
  actor: Actor,
  input: {
    sourceRouteId: string;
    destinationRouteId: string;
    anchorText: string;
    status?: typeof internalLinkRelations.$inferInsert.status;
  },
): Promise<string> {
  requirePermission(actor.role, "seo.manage");
  const rows = await db
    .insert(internalLinkRelations)
    .values({
      sourceRouteId: input.sourceRouteId,
      destinationRouteId: input.destinationRouteId,
      anchorText: input.anchorText.trim(),
      status: input.status ?? "approved",
    })
    .returning({ id: internalLinkRelations.id });
  const linkId = rows[0]?.id;
  if (!linkId) throw new Error("Internal link relation insert failed.");
  await writeAuditLog(db, {
    actorUserId: actor.userId,
    action: "seo.internal_link.created",
    entityType: "internal_link",
    entityId: linkId,
  });
  return linkId;
}
