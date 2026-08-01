import { and, count, desc, eq, gt, inArray, not, or } from "drizzle-orm";
import type { PgQueryResultHKT } from "drizzle-orm/pg-core/session";
import { z } from "zod";

import { writeAuditLog } from "@/audit/service";
import {
  runGovernedMutation,
  type GovernedMutationOptions,
} from "@/audit/governed-mutation";
import { requirePermission } from "@/auth/permissions";
import type { Actor } from "@/catalog/product-service";
import {
  contentLocalizations,
  contentAssets,
  contents,
  authors,
  assets,
  editorialRevisions,
  internalLinkRelations,
  keywordPageMappings,
  routes,
  seoMetadata,
  seoTopicMembers,
} from "@/db/schema";
import type { AppDatabase } from "@/db/types";
import { slugify } from "@/seo/path";
import {
  publicReadyAssetSqlConditions,
  publicReadyImageSqlConditions,
  roleMimeSqlCondition,
} from "@/uploads/asset-eligibility";

const revisionSnapshotSchema = z.object({
  title: z.string().min(1),
  excerpt: z.string().nullable(),
  body: z.string().min(1),
  authorId: z.uuid().optional(),
  type: z.enum(["article", "pillar", "comparison", "how_to", "guide"]).optional(),
  assetIds: z.array(z.uuid()).optional(),
  seo: z
    .object({
      routeId: z.uuid(),
      title: z.string().nullable(),
      metaDescription: z.string().nullable(),
      focusKeyword: z.string().nullable(),
    })
    .optional(),
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
  const path = `/${channelPrefix(input.channel)}/${slugify(title)}/`;
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

export async function updateContent<TQueryResult extends PgQueryResultHKT>(
  db: AppDatabase<TQueryResult>,
  actor: Actor,
  contentId: string,
  input: {
    title: string;
    excerpt?: string | null;
    body: string;
    authorId: string;
    type: typeof contents.$inferInsert.type;
    seoTitle?: string | null;
    metaDescription?: string | null;
    focusKeyword?: string | null;
    assetIds?: readonly string[];
    changeSummary?: string;
  },
): Promise<string | null> {
  requirePermission(actor.role, "content.write");
  const snapshot = revisionSnapshotSchema.parse({
    title: input.title.trim(),
    excerpt: input.excerpt?.trim() || null,
    body: input.body.trim(),
    authorId: input.authorId,
    type: input.type,
    ...(input.assetIds ? { assetIds: [...new Set(input.assetIds)] } : {}),
  });
  const [contentRows, authorRows] = await Promise.all([
    db
      .select({ status: contents.status, routeId: routes.id })
      .from(contents)
      .innerJoin(
        routes,
        and(
          eq(routes.entityType, "content"),
          eq(routes.entityId, contents.id),
          eq(routes.locale, "en"),
          eq(routes.isCurrent, true),
        ),
      )
      .where(eq(contents.id, contentId))
      .limit(1),
    db
      .select({ id: authors.id })
      .from(authors)
      .where(and(eq(authors.id, input.authorId), eq(authors.isActive, true)))
      .limit(1),
  ]);
  const status = contentRows[0]?.status;
  if (!status) throw new Error("Content was not found.");
  if (!authorRows[0]) throw new Error("Content Author must be active.");
  if (snapshot.assetIds?.length) {
    const assetRows = await db
      .select({ id: assets.id })
      .from(assets)
      .where(
        and(
          inArray(assets.id, snapshot.assetIds),
          publicReadyImageSqlConditions(),
        ),
      );
    if (assetRows.length !== snapshot.assetIds.length) {
      throw new Error("Content Assets must be ready, scanned public Assets.");
    }
  }
  if (status === "archived") throw new Error("Archived Content cannot be edited.");
  const seo = {
    routeId: contentRows[0]!.routeId,
    title: input.seoTitle?.trim() || null,
    metaDescription: input.metaDescription?.trim() || null,
    focusKeyword: input.focusKeyword?.trim() || null,
  };
  if (status === "published") {
    return proposePublishedContentRevision(db, actor, contentId, {
      title: snapshot.title,
      excerpt: snapshot.excerpt,
      body: snapshot.body,
      authorId: input.authorId,
      type: input.type,
      ...(snapshot.assetIds ? { assetIds: snapshot.assetIds } : {}),
      seo,
      changeSummary: input.changeSummary?.trim() || "Published Content update",
    });
  }
  await db.transaction(async (transaction) => {
    await transaction
      .update(contentLocalizations)
      .set({ title: snapshot.title, excerpt: snapshot.excerpt, body: snapshot.body })
      .where(
        and(
          eq(contentLocalizations.contentId, contentId),
          eq(contentLocalizations.locale, "en"),
        ),
      );
    await transaction
      .update(contents)
      .set({ authorId: input.authorId, type: input.type, updatedAt: new Date() })
      .where(eq(contents.id, contentId));
    if (snapshot.assetIds) {
      await transaction.delete(contentAssets).where(eq(contentAssets.contentId, contentId));
      if (snapshot.assetIds.length) {
        await transaction.insert(contentAssets).values(
          snapshot.assetIds.map((assetId, sortOrder) => ({
            contentId,
            assetId,
            role: sortOrder === 0 ? ("cover" as const) : ("inline" as const),
            sortOrder,
          })),
        );
      }
    }
    await transaction
      .update(seoMetadata)
      .set({
        title: seo.title,
        metaDescription: seo.metaDescription,
        focusKeyword: seo.focusKeyword,
        updatedByUserId: actor.userId,
        updatedAt: new Date(),
      })
      .where(eq(seoMetadata.routeId, seo.routeId));
    await writeAuditLog(transaction, {
      actorUserId: actor.userId,
      action: "content.updated",
      entityType: "content",
      entityId: contentId,
    });
  });
  return null;
}

export async function proposePublishedContentRevision<
  TQueryResult extends PgQueryResultHKT,
>(
  db: AppDatabase<TQueryResult>,
  actor: Actor,
  contentId: string,
  input: {
    title: string;
    excerpt?: string | null;
    body: string;
    authorId?: string;
    type?: typeof contents.$inferInsert.type;
    assetIds?: readonly string[];
    seo?: {
      routeId: string;
      title: string | null;
      metaDescription: string | null;
      focusKeyword: string | null;
    };
    changeSummary: string;
  },
  options: GovernedMutationOptions = {},
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
  const snapshot = revisionSnapshotSchema.parse({
    title: input.title.trim(),
    excerpt: input.excerpt?.trim() || null,
    body: input.body.trim(),
    ...(input.authorId ? { authorId: input.authorId } : {}),
    ...(input.type ? { type: input.type } : {}),
    ...(input.assetIds ? { assetIds: [...new Set(input.assetIds)] } : {}),
    ...(input.seo ? { seo: input.seo } : {}),
  });
  return runGovernedMutation(db, async ({ transaction, audit }) => {
    const latestRows = await transaction
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
    const rows = await transaction
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
    await audit({
      actorUserId: actor.userId,
      action: "content.revision.proposed",
      entityType: "editorial_revision",
      entityId: revisionId,
      afterSummary: { contentId },
    });
    return revisionId;
  }, options);
}

export async function submitContentForReview<TQueryResult extends PgQueryResultHKT>(
  db: AppDatabase<TQueryResult>,
  actor: Actor,
  contentId: string,
  options: GovernedMutationOptions = {},
): Promise<void> {
  requirePermission(actor.role, "content.write");
  await runGovernedMutation(db, async ({ transaction, audit }) => {
    const updated = await transaction
      .update(contents)
      .set({ status: "in_review", updatedAt: new Date() })
      .where(and(eq(contents.id, contentId), eq(contents.status, "draft")))
      .returning({ id: contents.id });
    if (!updated[0]) throw new Error("Only draft content can enter review.");
    await audit({
      actorUserId: actor.userId,
      action: "content.review.requested",
      entityType: "content",
      entityId: contentId,
    });
  }, options);
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
    const newer = await transaction
      .select({ id: editorialRevisions.id })
      .from(editorialRevisions)
      .where(
        and(
          eq(editorialRevisions.entityType, "content"),
          eq(editorialRevisions.entityId, revision.entityId),
          eq(editorialRevisions.locale, revision.locale),
          gt(editorialRevisions.versionNumber, revision.versionNumber),
        ),
      )
      .limit(1);
    if (newer[0]) {
      throw new Error("A newer Content revision exists; this revision is stale.");
    }
    const snapshot = revisionSnapshotSchema.parse(revision.snapshot);
    if (snapshot.authorId) {
      const authorRows = await transaction
        .select({ id: authors.id })
        .from(authors)
        .where(and(eq(authors.id, snapshot.authorId), eq(authors.isActive, true)))
        .limit(1);
      if (!authorRows[0]) throw new Error("Content revision Author must still be active.");
    }
    if (snapshot.assetIds?.length) {
      const assetRows = await transaction
        .select({ id: assets.id })
        .from(assets)
        .where(
          and(
            inArray(assets.id, snapshot.assetIds),
            publicReadyImageSqlConditions(),
          ),
        );
      if (assetRows.length !== snapshot.assetIds.length) {
        throw new Error("Content revision Assets are no longer publicly eligible.");
      }
    }
    await transaction
      .update(contentLocalizations)
      .set({
        title: snapshot.title,
        excerpt: snapshot.excerpt,
        body: snapshot.body,
      })
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
      .set({
        ...(snapshot.authorId ? { authorId: snapshot.authorId } : {}),
        ...(snapshot.type ? { type: snapshot.type } : {}),
        updatedAt: new Date(),
        reviewedByUserId: actor.userId,
        reviewedAt: new Date(),
      })
      .where(eq(contents.id, revision.entityId));
    if (snapshot.assetIds) {
      await transaction
        .delete(contentAssets)
        .where(eq(contentAssets.contentId, revision.entityId));
      if (snapshot.assetIds.length) {
        await transaction.insert(contentAssets).values(
          snapshot.assetIds.map((assetId, sortOrder) => ({
            contentId: revision.entityId,
            assetId,
            role: sortOrder === 0 ? ("cover" as const) : ("inline" as const),
            sortOrder,
          })),
        );
      }
    }
    if (snapshot.seo) {
      const routeRows = await transaction
        .select({ id: routes.id })
        .from(routes)
        .where(
          and(
            eq(routes.id, snapshot.seo.routeId),
            eq(routes.entityType, "content"),
            eq(routes.entityId, revision.entityId),
            eq(routes.isCurrent, true),
          ),
        )
        .limit(1);
      if (!routeRows[0]) throw new Error("Content revision targets an invalid SEO route.");
      await transaction
        .update(seoMetadata)
        .set({
          title: snapshot.seo.title,
          metaDescription: snapshot.seo.metaDescription,
          focusKeyword: snapshot.seo.focusKeyword,
          updatedByUserId: actor.userId,
          updatedAt: new Date(),
        })
        .where(eq(seoMetadata.routeId, snapshot.seo.routeId));
    }
    await writeAuditLog(transaction, {
      actorUserId: actor.userId,
      action: "content.revision.applied",
      entityType: "editorial_revision",
      entityId: revisionId,
      afterSummary: { contentId: revision.entityId },
    });
  });
}

export async function rejectContentReview<TQueryResult extends PgQueryResultHKT>(
  db: AppDatabase<TQueryResult>,
  actor: Actor,
  contentId: string,
  reason: string,
  options: GovernedMutationOptions = {},
): Promise<void> {
  requirePermission(actor.role, "content.review");
  if (!reason.trim()) throw new Error("Review rejection requires a reason.");
  await runGovernedMutation(db, async ({ transaction, audit }) => {
    const updated = await transaction
      .update(contents)
      .set({ status: "draft", reviewedByUserId: actor.userId, reviewedAt: new Date(), updatedAt: new Date() })
      .where(and(eq(contents.id, contentId), eq(contents.status, "in_review")))
      .returning({ id: contents.id });
    if (!updated[0]) throw new Error("Only In Review Content can be rejected.");
    await audit({
      actorUserId: actor.userId,
      action: "content.review.rejected",
      entityType: "content",
      entityId: contentId,
      afterSummary: { reason: reason.trim().slice(0, 500) },
    });
  }, options);
}

export async function rejectContentRevision<TQueryResult extends PgQueryResultHKT>(
  db: AppDatabase<TQueryResult>,
  actor: Actor,
  revisionId: string,
  options: GovernedMutationOptions = {},
): Promise<void> {
  requirePermission(actor.role, "content.publish");
  await runGovernedMutation(db, async ({ transaction, audit }) => {
    const updated = await transaction
      .update(editorialRevisions)
      .set({ status: "rejected", reviewedByUserId: actor.userId, reviewedAt: new Date() })
      .where(
        and(
          eq(editorialRevisions.id, revisionId),
          eq(editorialRevisions.entityType, "content"),
          eq(editorialRevisions.status, "in_review"),
        ),
      )
      .returning({ contentId: editorialRevisions.entityId });
    if (!updated[0]) throw new Error("Content revision cannot be rejected.");
    await audit({
      actorUserId: actor.userId,
      action: "content.revision.rejected",
      entityType: "editorial_revision",
      entityId: revisionId,
      afterSummary: { contentId: updated[0].contentId },
    });
  }, options);
}

export async function publishContent<TQueryResult extends PgQueryResultHKT>(
  db: AppDatabase<TQueryResult>,
  actor: Actor,
  contentId: string,
  options: GovernedMutationOptions = {},
): Promise<void> {
  requirePermission(actor.role, "content.publish");
  const invalidAssets = await db
    .select({ count: count() })
    .from(contentAssets)
    .innerJoin(assets, eq(assets.id, contentAssets.assetId))
    .where(
      and(
        eq(contentAssets.contentId, contentId),
        or(
          not(publicReadyAssetSqlConditions()),
          not(roleMimeSqlCondition(contentAssets.role)),
        ),
      ),
    );
  if (Number(invalidAssets[0]?.count ?? 0) > 0) {
    throw new Error("Content publication contains an invalid Asset role or MIME type.");
  }
  await runGovernedMutation(db, async ({ transaction, audit }) => {
    const updated = await transaction
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
    await audit({
      actorUserId: actor.userId,
      action: "content.published",
      entityType: "content",
      entityId: contentId,
    });
  }, options);
}

export async function setContentIndexStatus<TQueryResult extends PgQueryResultHKT>(
  db: AppDatabase<TQueryResult>,
  actor: Actor,
  contentId: string,
  indexStatus: "index" | "noindex",
  options: GovernedMutationOptions = {},
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
  await runGovernedMutation(db, async ({ transaction, audit }) => {
    await transaction
      .update(seoMetadata)
      .set({ indexStatus, updatedByUserId: actor.userId, updatedAt: new Date() })
      .where(eq(seoMetadata.routeId, content.routeId));
    await audit({
      actorUserId: actor.userId,
      action: "content.index_status.changed",
      entityType: "content",
      entityId: contentId,
      afterSummary: { indexStatus },
    });
  }, options);
}

export async function archiveContent<TQueryResult extends PgQueryResultHKT>(
  db: AppDatabase<TQueryResult>,
  actor: Actor,
  contentId: string,
  reason: string,
): Promise<void> {
  requirePermission(actor.role, "content.publish");
  if (!reason.trim()) throw new Error("Archive requires a reason.");
  await db.transaction(async (transaction) => {
    const rows = await transaction
      .select({ status: contents.status, routeId: routes.id })
      .from(contents)
      .innerJoin(
        routes,
        and(
          eq(routes.entityType, "content"),
          eq(routes.entityId, contents.id),
          eq(routes.isCurrent, true),
        ),
      )
      .where(eq(contents.id, contentId))
      .limit(1);
    const current = rows[0];
    if (!current || current.status === "archived") throw new Error("Content cannot be archived.");
    await transaction
      .update(contents)
      .set({ status: "archived", archivedAt: new Date(), updatedAt: new Date() })
      .where(eq(contents.id, contentId));
    await transaction
      .update(seoMetadata)
      .set({ indexStatus: "noindex", updatedByUserId: actor.userId, updatedAt: new Date() })
      .where(eq(seoMetadata.routeId, current.routeId));
    await writeAuditLog(transaction, {
      actorUserId: actor.userId,
      action: "content.archived",
      entityType: "content",
      entityId: contentId,
      afterSummary: { reason: reason.trim().slice(0, 500) },
    });
  });
}
