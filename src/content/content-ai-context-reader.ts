import { alias } from "drizzle-orm/pg-core";
import { and, eq, inArray } from "drizzle-orm";
import type { PgQueryResultHKT } from "drizzle-orm/pg-core/session";
import { z } from "zod";

import { aiFailure, aiSuccess, type AiServiceResult } from "@/ai/errors";
import type { CoreAiActorV1 } from "@/ai/core/contracts";
import type {
  AuthorizedDraftAssociationV1,
  DraftAssistanceCommandV1,
  DraftDurableAssociationWithoutHashV1,
} from "@/ai/applications/draft-assistance/contracts";
import type { DraftContextSourceDtoV1 } from "@/ai/applications/draft-assistance/context";
import {
  withDraftReadExecutor,
  type DraftConsistentReadScope,
} from "@/ai/applications/draft-assistance/read-scopes";
import { buildAuthorizedDraftAssociationV1 } from "@/ai/applications/draft-assistance/association";
import type { ProductAiTargetSnapshotV1 } from "@/catalog/product-ai-context-reader";
import { currentPublicCompanyFactConditions } from "@/content/company-facts-service";
import {
  companyFacts,
  contentLocalizations,
  contents,
  editorialRevisions,
  internalLinkRelations,
  routes,
  users,
} from "@/db/schema";
import { blockDocumentPlainText, blockDocumentSchema, parseBlockDocument } from "@/editorial/blocks";

const contentMediaPlacementSchema = z.object({
  assetId: z.string().uuid(),
  role: z.enum(["cover", "inline", "gallery", "detail"]),
  sortOrder: z.number().int().min(0).max(10_000),
  altText: z.string().trim().min(1).max(500).nullable(),
  caption: z.string().trim().min(1).max(1_000).nullable(),
  isVisible: z.boolean(),
  blockKey: z.string().min(1).max(80).regex(/^[A-Za-z0-9_-]+$/).nullable(),
}).strict();
const contentRevisionSnapshotSchema = z.object({
  kind: z.literal("content_blocks_v1"),
  title: z.string().min(1),
  excerpt: z.string().nullable(),
  document: blockDocumentSchema,
  expectedEditorDocumentVersion: z.number().int().positive(),
  draftVersion: z.number().int().positive(),
  authorId: z.string().uuid().optional(),
  type: z.enum(["article", "pillar", "comparison", "how_to", "guide"]).optional(),
  media: z.array(contentMediaPlacementSchema).max(100).optional(),
  seo: z.object({
    routeId: z.string().uuid(),
    title: z.string().nullable(),
    metaDescription: z.string().nullable(),
    focusKeyword: z.string().nullable(),
  }).strict().optional(),
}).strict();
interface ContentRevisionContextProjectionV1 {
  readonly title: string;
  readonly excerpt: string | null;
  readonly narrativeText: string;
}

export interface ContentAiTargetSnapshotV1 {
  readonly owner: "content";
  readonly entityId: string;
  readonly channel: "fabric_knowledge" | "china_sourcing_guide" | "china_textile_guide";
  readonly editVersion: number;
  readonly revisionId: string | null;
  readonly revisionSnapshot: ContentRevisionContextProjectionV1 | null;
  readonly authorizedAssociation: AuthorizedDraftAssociationV1;
}

export type AiDraftTargetSnapshotV1 = ProductAiTargetSnapshotV1 | ContentAiTargetSnapshotV1;

export interface InternalLinkAliasV1 {
  readonly candidateRef: `link_${string}`;
  readonly label: string;
}

export interface ContentAiTargetReadV1<TQueryResult extends PgQueryResultHKT> {
  readonly scope: DraftConsistentReadScope<TQueryResult>;
  readonly actor: CoreAiActorV1;
  readonly command: DraftAssistanceCommandV1;
  readonly association: DraftDurableAssociationWithoutHashV1;
}

export interface ContentAiContextReadV1<TQueryResult extends PgQueryResultHKT> {
  readonly scope: DraftConsistentReadScope<TQueryResult>;
  readonly actor: CoreAiActorV1;
  readonly command: DraftAssistanceCommandV1;
  readonly target: AiDraftTargetSnapshotV1;
  readonly selector: Extract<
    DraftAssistanceCommandV1["contextSelections"][number],
    { readonly sourceClass: "fabric_knowledge" }
  >;
}

export interface CompanyFactAiContextReadV1<TQueryResult extends PgQueryResultHKT> {
  readonly scope: DraftConsistentReadScope<TQueryResult>;
  readonly actor: CoreAiActorV1;
  readonly command: DraftAssistanceCommandV1;
  readonly target: AiDraftTargetSnapshotV1;
  readonly selector: Extract<
    DraftAssistanceCommandV1["contextSelections"][number],
    { readonly sourceClass: "public_company_fact" }
  >;
}

export interface InternalLinkAiReadV1<TQueryResult extends PgQueryResultHKT> {
  readonly scope: DraftConsistentReadScope<TQueryResult>;
  readonly actor: CoreAiActorV1;
  readonly command: DraftAssistanceCommandV1;
  readonly target: AiDraftTargetSnapshotV1;
  readonly selectedLinkIds: readonly string[];
}

export interface ContentAiDraftReaderV1<TQueryResult extends PgQueryResultHKT> {
  readTargetSnapshot(input: ContentAiTargetReadV1<TQueryResult>):
    Promise<AiServiceResult<ContentAiTargetSnapshotV1>>;
  readSelectedFabricContext(input: ContentAiContextReadV1<TQueryResult>):
    Promise<AiServiceResult<DraftContextSourceDtoV1>>;
  readSelectedPublicCompanyFact(input: CompanyFactAiContextReadV1<TQueryResult>):
    Promise<AiServiceResult<DraftContextSourceDtoV1>>;
  readSelectedInternalLinks(input: InternalLinkAiReadV1<TQueryResult>):
    Promise<AiServiceResult<readonly InternalLinkAliasV1[]>>;
}

function actorCanOwnContentTarget(role: CoreAiActorV1["roleKey"]): boolean {
  return role === "admin" || role === "content_editor";
}

function actorCanOwnTarget(actor: CoreAiActorV1, target: AiDraftTargetSnapshotV1): boolean {
  return actor.roleKey === "admin" ||
    target.owner === "product" && actor.roleKey === "product_editor" ||
    target.owner === "content" && actor.roleKey === "content_editor";
}

async function actorIsCurrent<TQueryResult extends PgQueryResultHKT>(
  scope: DraftConsistentReadScope<TQueryResult>,
  actor: CoreAiActorV1,
  command: DraftAssistanceCommandV1,
): Promise<boolean> {
  if (command.actor.userId !== actor.principalId || command.actor.role !== actor.roleKey) {
    return false;
  }
  return withDraftReadExecutor(scope, async (database) => {
    const rows = await database.select({ id: users.id, role: users.role })
      .from(users)
      .where(and(eq(users.id, actor.principalId), eq(users.isActive, true)))
      .limit(2);
    return rows.length === 1 && rows[0]?.role === actor.roleKey;
  });
}

function contentChannelAllowed(
  useCase: DraftAssistanceCommandV1["useCase"],
  channel: ContentAiTargetSnapshotV1["channel"],
): boolean {
  if (useCase === "fabric_knowledge_draft") return channel === "fabric_knowledge";
  if (useCase === "sourcing_guide_draft") return channel === "china_sourcing_guide";
  if (useCase === "product_description_draft") return false;
  return true;
}

function targetBinding(target: AiDraftTargetSnapshotV1): DraftContextSourceDtoV1["targetBinding"] {
  const association = target.authorizedAssociation.association;
  if (association.targetType === "product_draft") {
    return {
      targetType: "product_draft",
      targetProductId: association.targetProductId,
      expectedTargetVersion: association.expectedTargetVersion,
    };
  }
  if (association.targetType === "content_draft") {
    return {
      targetType: "content_draft",
      targetContentId: association.targetContentId,
      expectedTargetVersion: association.expectedTargetVersion,
    };
  }
  return {
    targetType: "editorial_revision",
    targetRevisionId: association.targetRevisionId,
    expectedTargetVersion: association.expectedTargetVersion,
    authoritativeRevisionVersion: target.editVersion,
    revisionEntityType: target.owner,
    revisionEntityId: target.entityId,
  };
}

function boundedPlainText(value: string, maximumUtf8Bytes = 6 * 1_024): string {
  if (Buffer.byteLength(value, "utf8") <= maximumUtf8Bytes) return value;
  let result = "";
  for (const scalar of value) {
    if (Buffer.byteLength(result + scalar, "utf8") > maximumUtf8Bytes) break;
    result += scalar;
  }
  return result.trim();
}

function parseFabricNarrative(structuredBlocks: unknown): string | null {
  try {
    return boundedPlainText(blockDocumentPlainText(
      parseBlockDocument(structuredBlocks, "content"),
    ));
  } catch {
    return null;
  }
}

function projectFabricContext(input: {
  readonly target: AiDraftTargetSnapshotV1;
  readonly selector: ContentAiContextReadV1<PgQueryResultHKT>["selector"];
  readonly contentId: string;
  readonly recordVersion: number;
  readonly title: string;
  readonly excerpt: string | null;
  readonly narrativeText: string;
}): AiServiceResult<DraftContextSourceDtoV1> {
  const values = {
    title: input.title,
    excerpt: input.excerpt,
    narrativeText: input.narrativeText,
  };
  const fields: DraftContextSourceDtoV1["fields"] = [];
  for (const field of input.selector.fields) {
    const value = values[field];
    if (typeof value !== "string" || value.trim().length === 0) {
      return aiFailure("context_field_ineligible");
    }
    fields.push({ field, provenance: "provided", value });
  }
  return aiSuccess({
    sourceClass: "fabric_knowledge",
    contentId: input.contentId,
    recordVersion: input.recordVersion,
    authoritativeRecordVersion: input.recordVersion,
    targetBinding: targetBinding(input.target),
    fields,
  });
}

export function createContentAiDraftReaderV1<
  TQueryResult extends PgQueryResultHKT,
>(): ContentAiDraftReaderV1<TQueryResult> {
  return {
    async readTargetSnapshot(input) {
      if (!await actorIsCurrent(input.scope, input.actor, input.command) ||
        !actorCanOwnContentTarget(input.actor.roleKey)) {
        return aiFailure("authorization_denied");
      }
      if (input.command.task.kind !== input.command.useCase) {
        return aiFailure("target_scope_mismatch");
      }
      return withDraftReadExecutor(input.scope, async (database) => {
        if (input.association.targetType === "content_draft") {
          if (input.command.target.type !== "content_draft" ||
            input.command.target.contentId !== input.association.targetContentId ||
            input.command.target.expectedVersion !== input.association.expectedTargetVersion) {
            return aiFailure("target_scope_mismatch");
          }
          const query = database.select({
            status: contents.status,
            channel: contents.channel,
            version: contentLocalizations.editorDocumentVersion,
          }).from(contents).innerJoin(contentLocalizations, and(
            eq(contentLocalizations.contentId, contents.id),
            eq(contentLocalizations.locale, "en"),
          )).where(eq(contents.id, input.association.targetContentId)).limit(1);
          const rows = input.scope.mode === "governed_enqueue_transaction"
            ? await query.for("update", { of: contentLocalizations })
            : await query;
          const row = rows[0];
          if (row === undefined) return aiFailure("authorization_denied");
          if (!contentChannelAllowed(input.command.useCase, row.channel)) {
            return aiFailure("target_scope_mismatch");
          }
          if (row.status !== "draft") return aiFailure("target_not_editable");
          if (row.version !== input.association.expectedTargetVersion) {
            return aiFailure("target_version_conflict");
          }
          const authorized = buildAuthorizedDraftAssociationV1(input.association);
          return authorized.ok ? aiSuccess({
            owner: "content",
            entityId: input.association.targetContentId,
            channel: row.channel,
            editVersion: row.version,
            revisionId: null,
            revisionSnapshot: null,
            authorizedAssociation: authorized.value,
          }) : authorized;
        }
        if (input.association.targetType !== "editorial_revision" ||
          input.command.target.type !== "editorial_revision" ||
          input.command.target.revisionId !== input.association.targetRevisionId ||
          input.command.target.expectedVersion !== input.association.expectedTargetVersion) {
          return aiFailure("target_scope_mismatch");
        }
        const query = database.select({
          entityId: editorialRevisions.entityId,
          entityType: editorialRevisions.entityType,
          locale: editorialRevisions.locale,
          snapshot: editorialRevisions.snapshot,
          status: editorialRevisions.status,
          channel: contents.channel,
        }).from(editorialRevisions).leftJoin(contents, and(
          eq(editorialRevisions.entityType, "content"),
          eq(contents.id, editorialRevisions.entityId),
        )).where(eq(editorialRevisions.id, input.association.targetRevisionId)).limit(1);
        const rows = input.scope.mode === "governed_enqueue_transaction"
          ? await query.for("update", { of: editorialRevisions })
          : await query;
        const row = rows[0];
        if (row === undefined) return aiFailure("authorization_denied");
        if (row.entityType !== "content") {
          return aiFailure(input.actor.roleKey === "admin"
            ? "target_scope_mismatch" : "authorization_denied");
        }
        if (row.locale !== "en" || row.channel === null ||
          !contentChannelAllowed(input.command.useCase, row.channel)) {
          return aiFailure("target_scope_mismatch");
        }
        if (row.status !== "draft") return aiFailure("target_not_editable");
        const snapshot = contentRevisionSnapshotSchema.safeParse(row.snapshot);
        if (!snapshot.success) return aiFailure("context_provenance_mismatch");
        const narrativeText = parseFabricNarrative(snapshot.data.document);
        if (narrativeText === null) return aiFailure("context_provenance_mismatch");
        const draftVersion = snapshot.data.draftVersion;
        if (draftVersion !== input.association.expectedTargetVersion) {
          return aiFailure("target_version_conflict");
        }
        const authorized = buildAuthorizedDraftAssociationV1(input.association);
        return authorized.ok ? aiSuccess({
          owner: "content",
          entityId: row.entityId,
          channel: row.channel,
          editVersion: draftVersion,
          revisionId: input.association.targetRevisionId,
          revisionSnapshot: Object.freeze({
            title: snapshot.data.title,
            excerpt: snapshot.data.excerpt,
            narrativeText,
          }),
          authorizedAssociation: authorized.value,
        }) : authorized;
      });
    },

    async readSelectedFabricContext(input) {
      if (!await actorIsCurrent(input.scope, input.actor, input.command) ||
        !actorCanOwnTarget(input.actor, input.target)) {
        return aiFailure("context_record_unauthorized");
      }
      if (input.target.owner === "content" &&
        input.target.entityId === input.selector.sourceId &&
        input.target.channel === "fabric_knowledge" &&
        input.target.revisionSnapshot !== null) {
        return projectFabricContext({
          target: input.target,
          selector: input.selector,
          contentId: input.target.entityId,
          recordVersion: input.target.editVersion,
          title: input.target.revisionSnapshot.title,
          excerpt: input.target.revisionSnapshot.excerpt,
          narrativeText: input.target.revisionSnapshot.narrativeText,
        });
      }
      return withDraftReadExecutor(input.scope, async (database) => {
        const rows = await database.select({
          id: contents.id,
          channel: contents.channel,
          status: contents.status,
          title: contentLocalizations.title,
          excerpt: contentLocalizations.excerpt,
          structuredBlocks: contentLocalizations.structuredBlocks,
          version: contentLocalizations.editorDocumentVersion,
        }).from(contents).innerJoin(contentLocalizations, and(
          eq(contentLocalizations.contentId, contents.id),
          eq(contentLocalizations.locale, "en"),
        )).where(eq(contents.id, input.selector.sourceId)).limit(1);
        const row = rows[0];
        const sameEditableContent = input.target.owner === "content" &&
          input.target.entityId === input.selector.sourceId;
        if (row === undefined || row.channel !== "fabric_knowledge" ||
          row.status !== "published" && !sameEditableContent) {
          return aiFailure("context_record_unauthorized");
        }
        const narrativeText = parseFabricNarrative(row.structuredBlocks);
        if (narrativeText === null) return aiFailure("context_field_ineligible");
        return projectFabricContext({
          target: input.target,
          selector: input.selector,
          contentId: row.id,
          recordVersion: row.version,
          title: row.title,
          excerpt: row.excerpt,
          narrativeText,
        });
      });
    },

    async readSelectedPublicCompanyFact(input) {
      if (!await actorIsCurrent(input.scope, input.actor, input.command) ||
        !actorCanOwnTarget(input.actor, input.target)) {
        return aiFailure("context_record_unauthorized");
      }
      return withDraftReadExecutor(input.scope, async (database) => {
        const rows = await database.select({
          id: companyFacts.id,
          factKey: companyFacts.factKey,
          subject: companyFacts.subject,
          statement: companyFacts.statement,
          relationshipToCwt: companyFacts.relationshipToCwt,
          updatedAt: companyFacts.updatedAt,
        }).from(companyFacts).where(and(
          eq(companyFacts.id, input.selector.sourceId),
          currentPublicCompanyFactConditions(),
        )).limit(1);
        const row = rows[0];
        if (row === undefined) return aiFailure("context_record_unauthorized");
        const values = {
          factKey: row.factKey,
          subject: row.subject,
          statement: row.statement,
          relationshipToCwt: row.relationshipToCwt,
        };
        const fields: DraftContextSourceDtoV1["fields"] = [];
        for (const field of input.selector.fields) {
          const value = values[field];
          if (typeof value !== "string" || value.trim().length === 0) {
            return aiFailure("context_field_ineligible");
          }
          fields.push({ field, provenance: "verified", value });
        }
        const updatedAt = row.updatedAt.toISOString();
        return aiSuccess({
          sourceClass: "public_company_fact",
          companyFactId: row.id,
          recordUpdatedAt: updatedAt,
          authoritativeRecordUpdatedAt: updatedAt,
          targetBinding: targetBinding(input.target),
          fields,
        });
      });
    },

    async readSelectedInternalLinks(input) {
      if (!await actorIsCurrent(input.scope, input.actor, input.command) ||
        !actorCanOwnTarget(input.actor, input.target) ||
        input.command.useCase !== "seo_content_draft" ||
        input.selectedLinkIds.length > 12 ||
        new Set(input.selectedLinkIds).size !== input.selectedLinkIds.length) {
        return aiFailure("context_record_unauthorized");
      }
      if (input.selectedLinkIds.length === 0) return aiSuccess([]);
      return withDraftReadExecutor(input.scope, async (database) => {
        const sourceRows = await database.select({ id: routes.id }).from(routes).where(and(
          eq(routes.entityType, input.target.owner),
          eq(routes.entityId, input.target.entityId),
          eq(routes.locale, "en"),
          eq(routes.isCurrent, true),
        )).limit(1);
        const sourceRouteId = sourceRows[0]?.id;
        if (sourceRouteId === undefined) return aiFailure("context_record_unauthorized");
        const destinationRoutes = alias(routes, "ai_internal_link_destination_routes");
        const rows = await database.select({
          id: internalLinkRelations.id,
          label: internalLinkRelations.anchorText,
        }).from(internalLinkRelations).innerJoin(destinationRoutes, and(
          eq(destinationRoutes.id, internalLinkRelations.destinationRouteId),
          eq(destinationRoutes.locale, "en"),
          eq(destinationRoutes.isCurrent, true),
        )).where(and(
          eq(internalLinkRelations.sourceRouteId, sourceRouteId),
          inArray(internalLinkRelations.id, input.selectedLinkIds),
          inArray(internalLinkRelations.status, ["suggested", "approved", "published"]),
        ));
        const byId = new Map(rows.map((row) => [row.id, row.label]));
        if (byId.size !== input.selectedLinkIds.length) {
          return aiFailure("context_record_unauthorized");
        }
        const aliases: InternalLinkAliasV1[] = [];
        for (const [index, id] of input.selectedLinkIds.entries()) {
          const label = byId.get(id);
          if (typeof label !== "string" || label.trim().length === 0 ||
            Buffer.byteLength(label, "utf8") > 300) {
            return aiFailure("context_field_ineligible");
          }
          aliases.push({
            candidateRef: `link_${String(index + 1).padStart(2, "0")}` as const,
            label,
          });
        }
        return aiSuccess(aliases);
      });
    },
  };
}
