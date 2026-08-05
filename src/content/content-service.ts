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
import {
  blockDocumentSchema,
  legacyTextToBlockDocument,
  parseBlockDocument,
  type BlockDocument,
} from "@/editorial/blocks";
import {
  resolveBlockPublicProjection,
  type ContentBlockMediaPlacement,
} from "@/editorial/block-references";
import { slugify } from "@/seo/path";
import {
  publicReadyAssetSqlConditions,
  publicReadyImageSqlConditions,
  roleMimeSqlCondition,
} from "@/uploads/asset-eligibility";

const contentMediaPlacementSchema = z.object({
  assetId: z.uuid(),
  role: z.enum(["cover", "inline", "gallery", "detail"]),
  sortOrder: z.number().int().min(0).max(10_000),
  altText: z.string().trim().min(1).max(500).nullable(),
  caption: z.string().trim().min(1).max(1_000).nullable(),
  isVisible: z.boolean(),
  blockKey: z.string().min(1).max(80).regex(/^[A-Za-z0-9_-]+$/).nullable(),
}).strict();

const legacyRevisionSnapshotSchema = z.object({
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
}).strict();

const structuredRevisionSnapshotSchema = z.object({
  kind: z.literal("content_blocks_v1"),
  title: z.string().min(1),
  excerpt: z.string().nullable(),
  document: blockDocumentSchema,
  expectedEditorDocumentVersion: z.number().int().positive(),
  authorId: z.uuid().optional(),
  type: z.enum(["article", "pillar", "comparison", "how_to", "guide"]).optional(),
  media: z.array(contentMediaPlacementSchema).max(100).optional(),
  seo: z.object({
    routeId: z.uuid(),
    title: z.string().nullable(),
    metaDescription: z.string().nullable(),
    focusKeyword: z.string().nullable(),
  }).strict().optional(),
}).strict();

const revisionSnapshotSchema = z.union([
  structuredRevisionSnapshotSchema,
  legacyRevisionSnapshotSchema,
]);

type ContentMediaPlacement = z.infer<typeof contentMediaPlacementSchema>;

function normalizeContentMedia(
  assetIds: readonly string[] | undefined,
  media: readonly ContentMediaPlacement[] | undefined,
): ContentMediaPlacement[] | undefined {
  if (media) {
    return media.map((item) => ({
      ...item,
      altText: item.altText?.trim() || null,
      caption: item.caption?.trim() || null,
      blockKey: item.blockKey?.trim() || null,
    }));
  }
  if (!assetIds) return undefined;
  return [...new Set(assetIds)].map((assetId, sortOrder) => ({
    assetId,
    role: sortOrder === 0 ? "cover" : "inline",
    sortOrder,
    altText: null,
    caption: null,
    isVisible: true,
    blockKey: null,
  }));
}

async function validateContentMedia<TQueryResult extends PgQueryResultHKT>(
  db: AppDatabase<TQueryResult>,
  contentId: string,
  document: BlockDocument,
  media: readonly ContentMediaPlacement[] | undefined,
): Promise<Awaited<ReturnType<typeof resolveBlockPublicProjection>>> {
  const projectionMedia: readonly ContentBlockMediaPlacement[] | undefined = media;
  if (!media) {
    return resolveBlockPublicProjection(db, { type: "content", id: contentId }, document);
  }
  if (new Set(media.map((item) => item.assetId)).size !== media.length) {
    throw new Error("Content media Assets must be unique.");
  }
  if (media.filter((item) => item.role === "cover").length > 1) {
    throw new Error("Content may have at most one Cover image.");
  }
  const blockKeys = media.flatMap((item) => item.blockKey ? [item.blockKey] : []);
  if (new Set(blockKeys).size !== blockKeys.length) {
    throw new Error("Content media Block keys must be unique.");
  }
  if (media.length) {
    const assetRows = await db
      .select({ id: assets.id })
      .from(assets)
      .where(and(inArray(assets.id, media.map((item) => item.assetId)), publicReadyImageSqlConditions()));
    if (assetRows.length !== media.length) {
      throw new Error("Content Assets must be ready, scanned public Assets.");
    }
  }
  return resolveBlockPublicProjection(
    db,
    {
      type: "content",
      id: contentId,
      ...(projectionMedia ? { media: projectionMedia } : {}),
    },
    document,
  );
}

async function assertIndexedContentRemainsReadable<
  TQueryResult extends PgQueryResultHKT,
>(
  db: AppDatabase<TQueryResult>,
  contentId: string,
  readableText: string,
): Promise<void> {
  const rows = await db
    .select({ indexStatus: seoMetadata.indexStatus })
    .from(routes)
    .innerJoin(seoMetadata, eq(seoMetadata.routeId, routes.id))
    .where(and(
      eq(routes.entityType, "content"),
      eq(routes.entityId, contentId),
      eq(routes.locale, "en"),
      eq(routes.isCurrent, true),
    ))
    .limit(1);
  if (rows[0]?.indexStatus === "index" && !readableText) {
    throw new Error("An indexed Content revision must retain readable public narrative content.");
  }
}

async function applyContentMedia<TQueryResult extends PgQueryResultHKT>(
  db: AppDatabase<TQueryResult>,
  contentId: string,
  media: readonly ContentMediaPlacement[] | undefined,
): Promise<void> {
  if (!media) return;
  await db.delete(contentAssets).where(eq(contentAssets.contentId, contentId));
  if (media.length) {
    await db.insert(contentAssets).values(media.map((item) => ({
      contentId,
      assetId: item.assetId,
      role: item.role,
      sortOrder: item.sortOrder,
      altText: item.altText,
      caption: item.caption,
      isVisible: item.isVisible,
      blockKey: item.blockKey,
    })));
  }
}

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
    const document = legacyTextToBlockDocument(body);
    const snapshot = structuredRevisionSnapshotSchema.parse({
      kind: "content_blocks_v1",
      title,
      excerpt: input.excerpt?.trim() || null,
      document,
      expectedEditorDocumentVersion: 1,
    });
    await transaction.insert(contentLocalizations).values({
      contentId,
      locale: "en",
      title: snapshot.title,
      excerpt: snapshot.excerpt,
      body: "",
      structuredBlocks: snapshot.document,
      blocksVersion: 1,
      editorDocumentVersion: 1,
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
    media?: readonly ContentMediaPlacement[];
    structuredDocument?: BlockDocument;
    expectedEditorDocumentVersion?: number;
    changeSummary?: string;
  },
): Promise<string | null> {
  requirePermission(actor.role, "content.write");
  const media = normalizeContentMedia(input.assetIds, input.media);
  const document = input.structuredDocument
    ? parseBlockDocument(input.structuredDocument, "content")
    : legacyTextToBlockDocument(input.body);
  const [contentRows, authorRows] = await Promise.all([
    db
      .select({
        status: contents.status,
        routeId: routes.id,
        editorDocumentVersion: contentLocalizations.editorDocumentVersion,
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
  const current = contentRows[0];
  const snapshot = structuredRevisionSnapshotSchema.parse({
    kind: "content_blocks_v1",
    title: input.title.trim(),
    excerpt: input.excerpt?.trim() || null,
    document,
    expectedEditorDocumentVersion:
      input.expectedEditorDocumentVersion ?? current?.editorDocumentVersion,
    authorId: input.authorId,
    type: input.type,
    ...(media ? { media } : {}),
  });
  const status = current?.status;
  if (!status) throw new Error("Content was not found.");
  if (!authorRows[0]) throw new Error("Content Author must be active.");
  if (snapshot.expectedEditorDocumentVersion !== current.editorDocumentVersion) {
    throw new Error("Content changed after this editor loaded; refresh before saving.");
  }
  await validateContentMedia(db, contentId, snapshot.document, snapshot.media);
  if (status === "archived") throw new Error("Archived Content cannot be edited.");
  const seo = {
    routeId: current.routeId,
    title: input.seoTitle?.trim() || null,
    metaDescription: input.metaDescription?.trim() || null,
    focusKeyword: input.focusKeyword?.trim() || null,
  };
  if (status === "published") {
    return proposePublishedContentRevision(db, actor, contentId, {
      title: snapshot.title,
      excerpt: snapshot.excerpt,
      document: snapshot.document,
      expectedEditorDocumentVersion: snapshot.expectedEditorDocumentVersion,
      authorId: input.authorId,
      type: input.type,
      ...(snapshot.media ? { media: snapshot.media } : {}),
      seo,
      changeSummary: input.changeSummary?.trim() || "Published Content update",
    });
  }
  await db.transaction(async (transaction) => {
    const updatedLocalization = await transaction
      .update(contentLocalizations)
      .set({
        title: snapshot.title,
        excerpt: snapshot.excerpt,
        structuredBlocks: snapshot.document,
        blocksVersion: 1,
        editorDocumentVersion: snapshot.expectedEditorDocumentVersion + 1,
      })
      .where(
        and(
          eq(contentLocalizations.contentId, contentId),
          eq(contentLocalizations.locale, "en"),
          eq(
            contentLocalizations.editorDocumentVersion,
            snapshot.expectedEditorDocumentVersion,
          ),
        ),
      )
      .returning({ contentId: contentLocalizations.contentId });
    if (!updatedLocalization[0]) {
      throw new Error("Content changed after this editor loaded; refresh before saving.");
    }
    await transaction
      .update(contents)
      .set({ authorId: input.authorId, type: input.type, updatedAt: new Date() })
      .where(eq(contents.id, contentId));
    await applyContentMedia(transaction, contentId, snapshot.media);
    const projection = await validateContentMedia(
      transaction,
      contentId,
      snapshot.document,
      undefined,
    );
    await assertIndexedContentRemainsReadable(transaction, contentId, projection.readableText);
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
    body?: string;
    document?: BlockDocument;
    expectedEditorDocumentVersion?: number;
    authorId?: string;
    type?: typeof contents.$inferInsert.type;
    assetIds?: readonly string[];
    media?: readonly ContentMediaPlacement[];
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
  const localizationRows = await db
    .select({ editorDocumentVersion: contentLocalizations.editorDocumentVersion })
    .from(contentLocalizations)
    .where(
      and(
        eq(contentLocalizations.contentId, contentId),
        eq(contentLocalizations.locale, "en"),
      ),
    )
    .limit(1);
  const editorDocumentVersion = localizationRows[0]?.editorDocumentVersion;
  if (!editorDocumentVersion) throw new Error("Content localization was not found.");
  const document = input.document
    ? parseBlockDocument(input.document, "content")
    : legacyTextToBlockDocument(input.body);
  const media = normalizeContentMedia(input.assetIds, input.media);
  const snapshot = structuredRevisionSnapshotSchema.parse({
    kind: "content_blocks_v1",
    title: input.title.trim(),
    excerpt: input.excerpt?.trim() || null,
    document,
    expectedEditorDocumentVersion:
      input.expectedEditorDocumentVersion ?? editorDocumentVersion,
    ...(input.authorId ? { authorId: input.authorId } : {}),
    ...(input.type ? { type: input.type } : {}),
    ...(media ? { media } : {}),
    ...(input.seo ? { seo: input.seo } : {}),
  });
  if (snapshot.expectedEditorDocumentVersion !== editorDocumentVersion) {
    throw new Error("Content changed after this revision was prepared.");
  }
  await validateContentMedia(db, contentId, snapshot.document, snapshot.media);
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
  options: GovernedMutationOptions = {},
): Promise<void> {
  requirePermission(actor.role, "content.publish");
  await runGovernedMutation(db, async ({ transaction, audit }) => {
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
    let document: BlockDocument;
    let media: ContentMediaPlacement[] | undefined;
    let expectedEditorDocumentVersion: number | undefined;
    if ("kind" in snapshot) {
      document = parseBlockDocument(snapshot.document, "content");
      media = snapshot.media;
      expectedEditorDocumentVersion = snapshot.expectedEditorDocumentVersion;
    } else {
      document = legacyTextToBlockDocument(snapshot.body);
      media = normalizeContentMedia(snapshot.assetIds, undefined);
    }
    if (snapshot.authorId) {
      const authorRows = await transaction
        .select({ id: authors.id })
        .from(authors)
        .where(and(eq(authors.id, snapshot.authorId), eq(authors.isActive, true)))
        .limit(1);
      if (!authorRows[0]) throw new Error("Content revision Author must still be active.");
    }
    const projection = await validateContentMedia(
      transaction,
      revision.entityId,
      document,
      media,
    );
    await assertIndexedContentRemainsReadable(
      transaction,
      revision.entityId,
      projection.readableText,
    );
    const localizationRows = await transaction
      .select({ editorDocumentVersion: contentLocalizations.editorDocumentVersion })
      .from(contentLocalizations)
      .where(
        and(
          eq(contentLocalizations.contentId, revision.entityId),
          eq(contentLocalizations.locale, revision.locale),
        ),
      )
      .limit(1);
    const editorDocumentVersion = localizationRows[0]?.editorDocumentVersion;
    if (!editorDocumentVersion) throw new Error("Content localization was not found.");
    if (
      expectedEditorDocumentVersion !== undefined &&
      expectedEditorDocumentVersion !== editorDocumentVersion
    ) {
      throw new Error("Content changed after this revision was proposed.");
    }
    const updatedLocalization = await transaction
      .update(contentLocalizations)
      .set({
        title: snapshot.title,
        excerpt: snapshot.excerpt,
        structuredBlocks: document,
        blocksVersion: 1,
        editorDocumentVersion: editorDocumentVersion + 1,
      })
      .where(
        and(
          eq(contentLocalizations.contentId, revision.entityId),
          eq(contentLocalizations.locale, revision.locale),
          eq(contentLocalizations.editorDocumentVersion, editorDocumentVersion),
        ),
      )
      .returning({ contentId: contentLocalizations.contentId });
    if (!updatedLocalization[0]) throw new Error("Content changed during revision apply.");
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
    await applyContentMedia(transaction, revision.entityId, media);
    await validateContentMedia(
      transaction,
      revision.entityId,
      document,
      undefined,
    );
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
    await audit({
      actorUserId: actor.userId,
      action: "content.revision.applied",
      entityType: "editorial_revision",
      entityId: revisionId,
      afterSummary: { contentId: revision.entityId },
    });
  }, options);
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
  const localizationRows = await db
    .select({
      structuredBlocks: contentLocalizations.structuredBlocks,
      blocksVersion: contentLocalizations.blocksVersion,
    })
    .from(contentLocalizations)
    .where(
      and(
        eq(contentLocalizations.contentId, contentId),
        eq(contentLocalizations.locale, "en"),
      ),
    )
    .limit(1);
  if (localizationRows[0]?.blocksVersion !== 1) {
    throw new Error("Content Block document version is unsupported.");
  }
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
  const document = parseBlockDocument(localizationRows[0].structuredBlocks, "content");
  const placementRows = await db
    .select({
      assetId: contentAssets.assetId,
      role: contentAssets.role,
      sortOrder: contentAssets.sortOrder,
      altText: contentAssets.altText,
      caption: contentAssets.caption,
      isVisible: contentAssets.isVisible,
      blockKey: contentAssets.blockKey,
    })
    .from(contentAssets)
    .where(eq(contentAssets.contentId, contentId));
  const placements = placementRows.flatMap((row) => {
    const parsed = contentMediaPlacementSchema.safeParse(row);
    return parsed.success ? [parsed.data] : [];
  });
  const projection = await validateContentMedia(db, contentId, document, placements);
  if (!projection.readableText) {
    throw new Error("Published Content requires readable public narrative content.");
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
      structuredBlocks: contentLocalizations.structuredBlocks,
      blocksVersion: contentLocalizations.blocksVersion,
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
  let narrativeText = "";
  try {
    if (content.blocksVersion !== 1) throw new Error("Unsupported Block version.");
    narrativeText = (await resolveBlockPublicProjection(
      db,
      { type: "content", id: contentId },
      parseBlockDocument(content.structuredBlocks, "content"),
    )).readableText;
  } catch {
    narrativeText = "";
  }
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
      !narrativeText ||
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
