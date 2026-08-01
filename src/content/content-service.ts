import { and, count, desc, eq } from "drizzle-orm";
import type { PgQueryResultHKT } from "drizzle-orm/pg-core/session";
import { z } from "zod";

import { writeAuditLog } from "@/audit/service";
import { requirePermission } from "@/auth/permissions";
import type { Actor } from "@/catalog/product-service";
import {
  contentLocalizations,
  contents,
  editorialRevisions,
  internalLinkRelations,
  keywordPageMappings,
  routes,
  seoMetadata,
  seoTopicMembers,
} from "@/db/schema";
import type { AppDatabase } from "@/db/types";
import { slugify } from "@/seo/path";

const revisionSnapshotSchema = z.object({
  title: z.string().min(1),
  excerpt: z.string().nullable(),
  body: z.string().min(1),
});

type ContentChannel = typeof contents.$inferInsert.channel;

function channelPrefix(channel: ContentChannel): string {
  return {
    fabric_knowledge: "fabric-knowledge",
    china_textile_guide: "china-textile-guide",
    china_sourcing_guide: "china-sourcing-guide",
  }[channel];
}

export async function createContentDraft<TQueryResult extends PgQueryResultHKT>(
  db: AppDatabase<TQueryResult>,
  actor: Actor,
  input: {
    channel: ContentChannel;
    type: typeof contents.$inferInsert.type;
    authorId: string;
    title: string;
    excerpt?: string;
    body: string;
  },
): Promise<string> {
  requirePermission(actor.role, "content.write");
  const title = input.title.trim();
  const body = input.body.trim();
  if (!title || !body) throw new Error("Content title and body are required.");
  const path = `/${channelPrefix(input.channel)}/${slugify(title)}`;
  const collision = await db.select({ id: routes.id }).from(routes).where(eq(routes.path, path));
  if (collision[0]) throw new Error("Content URL already exists.");

  return db.transaction(async (transaction) => {
    const rows = await transaction
      .insert(contents)
      .values({
        channel: input.channel,
        type: input.type,
        authorId: input.authorId,
        status: "draft",
        createdByUserId: actor.userId,
      })
      .returning({ id: contents.id });
    const contentId = rows[0]?.id;
    if (!contentId) throw new Error("Content insert failed.");
    const snapshot = {
      title,
      excerpt: input.excerpt?.trim() || null,
      body,
    };
    await transaction.insert(contentLocalizations).values({
      contentId,
      locale: "en",
      ...snapshot,
    });
    await transaction.insert(editorialRevisions).values({
      entityType: "content",
      entityId: contentId,
      locale: "en",
      versionNumber: 1,
      status: "applied",
      snapshot,
      changeSummary: "Initial draft",
      createdByUserId: actor.userId,
    });
    const routeRows = await transaction
      .insert(routes)
      .values({ locale: "en", path, entityType: "content", entityId: contentId })
      .returning({ id: routes.id });
    const routeId = routeRows[0]?.id;
    if (!routeId) throw new Error("Content route insert failed.");
    await transaction.insert(seoMetadata).values({
      routeId,
      title: `${title} | CloudWave Textile`,
      indexStatus: "noindex",
      canonicalPath: path,
    });
    await writeAuditLog(transaction, {
      actorUserId: actor.userId,
      action: "content.draft.created",
      entityType: "content",
      entityId: contentId,
      afterSummary: { channel: input.channel, path },
    });
    return contentId;
  });
}

export async function proposePublishedContentRevision<
  TQueryResult extends PgQueryResultHKT,
>(
  db: AppDatabase<TQueryResult>,
  actor: Actor,
  contentId: string,
  input: { title: string; excerpt?: string | null; body: string; changeSummary: string },
): Promise<string> {
  requirePermission(actor.role, "content.write");
  const contentRows = await db
    .select({ status: contents.status })
    .from(contents)
    .where(eq(contents.id, contentId))
    .limit(1);
  if (contentRows[0]?.status !== "published") {
    throw new Error("Revision workflow is reserved for published content.");
  }
  const latestRows = await db
    .select({ versionNumber: editorialRevisions.versionNumber })
    .from(editorialRevisions)
    .where(
      and(
        eq(editorialRevisions.entityType, "content"),
        eq(editorialRevisions.entityId, contentId),
        eq(editorialRevisions.locale, "en"),
      ),
    )
    .orderBy(desc(editorialRevisions.versionNumber))
    .limit(1);
  const snapshot = revisionSnapshotSchema.parse({
    title: input.title.trim(),
    excerpt: input.excerpt?.trim() || null,
    body: input.body.trim(),
  });
  const rows = await db
    .insert(editorialRevisions)
    .values({
      entityType: "content",
      entityId: contentId,
      locale: "en",
      versionNumber: (latestRows[0]?.versionNumber ?? 0) + 1,
      status: "in_review",
      snapshot,
      changeSummary: input.changeSummary.trim(),
      createdByUserId: actor.userId,
    })
    .returning({ id: editorialRevisions.id });
  const revisionId = rows[0]?.id;
  if (!revisionId) throw new Error("Editorial revision insert failed.");
  await writeAuditLog(db, {
    actorUserId: actor.userId,
    action: "content.revision.proposed",
    entityType: "editorial_revision",
    entityId: revisionId,
    afterSummary: { contentId },
  });
  return revisionId;
}

export async function submitContentForReview<TQueryResult extends PgQueryResultHKT>(
  db: AppDatabase<TQueryResult>,
  actor: Actor,
  contentId: string,
): Promise<void> {
  requirePermission(actor.role, "content.write");
  const updated = await db
    .update(contents)
    .set({ status: "in_review", updatedAt: new Date() })
    .where(and(eq(contents.id, contentId), eq(contents.status, "draft")))
    .returning({ id: contents.id });
  if (!updated[0]) throw new Error("Only draft content can enter review.");
  await writeAuditLog(db, {
    actorUserId: actor.userId,
    action: "content.review.requested",
    entityType: "content",
    entityId: contentId,
  });
}

export async function applyContentRevision<TQueryResult extends PgQueryResultHKT>(
  db: AppDatabase<TQueryResult>,
  actor: Actor,
  revisionId: string,
): Promise<void> {
  requirePermission(actor.role, "content.publish");
  await db.transaction(async (transaction) => {
    const rows = await transaction
      .select()
      .from(editorialRevisions)
      .where(eq(editorialRevisions.id, revisionId))
      .limit(1);
    const revision = rows[0];
    if (!revision || revision.entityType !== "content" || revision.status !== "in_review") {
      throw new Error("Revision is not eligible for approval.");
    }
    const snapshot = revisionSnapshotSchema.parse(revision.snapshot);
    await transaction
      .update(contentLocalizations)
      .set(snapshot)
      .where(
        and(
          eq(contentLocalizations.contentId, revision.entityId),
          eq(contentLocalizations.locale, revision.locale),
        ),
      );
    await transaction
      .update(editorialRevisions)
      .set({ status: "applied", reviewedByUserId: actor.userId, reviewedAt: new Date() })
      .where(eq(editorialRevisions.id, revisionId));
    await transaction
      .update(contents)
      .set({ updatedAt: new Date(), reviewedByUserId: actor.userId, reviewedAt: new Date() })
      .where(eq(contents.id, revision.entityId));
    await writeAuditLog(transaction, {
      actorUserId: actor.userId,
      action: "content.revision.applied",
      entityType: "editorial_revision",
      entityId: revisionId,
      afterSummary: { contentId: revision.entityId },
    });
  });
}

export async function publishContent<TQueryResult extends PgQueryResultHKT>(
  db: AppDatabase<TQueryResult>,
  actor: Actor,
  contentId: string,
): Promise<void> {
  requirePermission(actor.role, "content.publish");
  const updated = await db
    .update(contents)
    .set({
      status: "published",
      reviewedByUserId: actor.userId,
      reviewedAt: new Date(),
      publishedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(and(eq(contents.id, contentId), eq(contents.status, "in_review")))
    .returning({ id: contents.id });
  if (!updated[0]) throw new Error("Only in-review content can be published.");
  await writeAuditLog(db, {
    actorUserId: actor.userId,
    action: "content.published",
    entityType: "content",
    entityId: contentId,
  });
}

export async function setContentIndexStatus<TQueryResult extends PgQueryResultHKT>(
  db: AppDatabase<TQueryResult>,
  actor: Actor,
  contentId: string,
  indexStatus: "index" | "noindex",
): Promise<void> {
  requirePermission(actor.role, "seo.manage");
  const rows = await db
    .select({
      status: contents.status,
      title: contentLocalizations.title,
      body: contentLocalizations.body,
      routeId: routes.id,
      seoTitle: seoMetadata.title,
      metaDescription: seoMetadata.metaDescription,
    })
    .from(contents)
    .innerJoin(
      contentLocalizations,
      and(
        eq(contentLocalizations.contentId, contents.id),
        eq(contentLocalizations.locale, "en"),
      ),
    )
    .innerJoin(
      routes,
      and(
        eq(routes.entityType, "content"),
        eq(routes.entityId, contents.id),
        eq(routes.isCurrent, true),
      ),
    )
    .innerJoin(seoMetadata, eq(seoMetadata.routeId, routes.id))
    .where(eq(contents.id, contentId))
    .limit(1);
  const content = rows[0];
  if (!content) throw new Error("Content SEO record was not found.");
  if (indexStatus === "index") {
    const [intents, topics, links] = await Promise.all([
      db
        .select({ count: count() })
        .from(keywordPageMappings)
        .where(eq(keywordPageMappings.primaryRouteId, content.routeId)),
      db
        .select({ count: count() })
        .from(seoTopicMembers)
        .where(eq(seoTopicMembers.routeId, content.routeId)),
      db
        .select({ count: count() })
        .from(internalLinkRelations)
        .where(
          and(
            eq(internalLinkRelations.sourceRouteId, content.routeId),
            eq(internalLinkRelations.status, "published"),
          ),
        ),
    ]);
    if (
      content.status !== "published" ||
      !content.title.trim() ||
      !content.body.trim() ||
      !content.seoTitle?.trim() ||
      !content.metaDescription?.trim() ||
      Number(intents[0]?.count ?? 0) < 1 ||
      Number(topics[0]?.count ?? 0) < 1 ||
      Number(links[0]?.count ?? 0) < 1
    ) {
      throw new Error(
        "Indexable content requires publication, metadata, an owned intent, topic membership, and an approved internal link.",
      );
    }
  }
  await db
    .update(seoMetadata)
    .set({ indexStatus, updatedByUserId: actor.userId, updatedAt: new Date() })
    .where(eq(seoMetadata.routeId, content.routeId));
  await writeAuditLog(db, {
    actorUserId: actor.userId,
    action: "content.index_status.changed",
    entityType: "content",
    entityId: contentId,
    afterSummary: { indexStatus },
  });
}
