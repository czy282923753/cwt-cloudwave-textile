import { and, asc, eq, inArray } from "drizzle-orm";
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
import {
  applicationLocalizations,
  applications,
  editorialRevisions,
  productApplications,
  productAssets,
  productLocalizations,
  productTaxonomyTerms,
  products,
  taxonomyTermLocalizations,
  taxonomyTerms,
  users,
} from "@/db/schema";
import { blockDocumentSchema } from "@/editorial/blocks";

const productRevisionSnapshotSchema = z.object({
  kind: z.literal("editorial_blocks"),
  name: z.string().min(1),
  shortDescription: z.string().nullable(),
  document: blockDocumentSchema,
  expectedEditorDocumentVersion: z.number().int().positive(),
  draftVersion: z.number().int().positive().optional(),
  pendingChanges: z.array(z.unknown()).optional(),
}).strict();

export interface ProductAiTargetSnapshotV1 {
  readonly owner: "product";
  readonly entityId: string;
  readonly editVersion: number;
  readonly revisionId: string | null;
  readonly authorizedAssociation: AuthorizedDraftAssociationV1;
}

export interface MediaPlacementAliasV1 {
  readonly placementRef: `media_${string}`;
}

export interface ProductAiTargetReadV1<TQueryResult extends PgQueryResultHKT> {
  readonly scope: DraftConsistentReadScope<TQueryResult>;
  readonly actor: CoreAiActorV1;
  readonly command: DraftAssistanceCommandV1;
  readonly association: DraftDurableAssociationWithoutHashV1;
}

export interface ProductAiContextReadV1<TQueryResult extends PgQueryResultHKT> {
  readonly scope: DraftConsistentReadScope<TQueryResult>;
  readonly actor: CoreAiActorV1;
  readonly command: DraftAssistanceCommandV1;
  readonly target: ProductAiTargetSnapshotV1;
  readonly selector: Extract<
    DraftAssistanceCommandV1["contextSelections"][number],
    { readonly sourceClass: "product_structured" }
  >;
}

export interface ProductAiMediaReadV1<TQueryResult extends PgQueryResultHKT> {
  readonly scope: DraftConsistentReadScope<TQueryResult>;
  readonly actor: CoreAiActorV1;
  readonly command: DraftAssistanceCommandV1;
  readonly target: ProductAiTargetSnapshotV1;
  readonly selectedPlacementIds: readonly string[];
}

export interface ProductAiDraftReaderV1<TQueryResult extends PgQueryResultHKT> {
  readTargetSnapshot(input: ProductAiTargetReadV1<TQueryResult>):
    Promise<AiServiceResult<ProductAiTargetSnapshotV1>>;
  readSelectedStructuredContext(input: ProductAiContextReadV1<TQueryResult>):
    Promise<AiServiceResult<DraftContextSourceDtoV1>>;
  readSelectedMediaPlacements(input: ProductAiMediaReadV1<TQueryResult>):
    Promise<AiServiceResult<readonly MediaPlacementAliasV1[]>>;
}

function actorCanOwnProductTarget(role: CoreAiActorV1["roleKey"]): boolean {
  return role === "admin" || role === "product_editor";
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

function commandTargetsProduct(command: DraftAssistanceCommandV1): boolean {
  return command.useCase === "product_description_draft" ||
    command.useCase === "seo_content_draft";
}

function targetBinding(target: ProductAiTargetSnapshotV1): DraftContextSourceDtoV1["targetBinding"] {
  const association = target.authorizedAssociation.association;
  if (association.targetType === "product_draft") {
    return {
      targetType: "product_draft",
      targetProductId: association.targetProductId,
      expectedTargetVersion: association.expectedTargetVersion,
    };
  }
  if (association.targetType !== "editorial_revision") {
    throw new Error("Product target association was invalid.");
  }
  return {
    targetType: "editorial_revision",
    targetRevisionId: association.targetRevisionId,
    expectedTargetVersion: association.expectedTargetVersion,
    authoritativeRevisionVersion: target.editVersion,
    revisionEntityType: "product",
    revisionEntityId: target.entityId,
  };
}

export function createProductAiDraftReaderV1<
  TQueryResult extends PgQueryResultHKT,
>(): ProductAiDraftReaderV1<TQueryResult> {
  return {
    async readTargetSnapshot(input) {
      if (!await actorIsCurrent(input.scope, input.actor, input.command) ||
        !actorCanOwnProductTarget(input.actor.roleKey)) {
        return aiFailure("authorization_denied");
      }
      if (input.command.task.kind !== input.command.useCase) {
        return aiFailure("target_scope_mismatch");
      }
      return withDraftReadExecutor(input.scope, async (database) => {
        if (input.association.targetType === "product_draft") {
          if (input.command.target.type !== "product_draft" ||
            input.command.target.productId !== input.association.targetProductId ||
            input.command.target.expectedVersion !== input.association.expectedTargetVersion) {
            return aiFailure("target_scope_mismatch");
          }
          if (!commandTargetsProduct(input.command)) return aiFailure("target_scope_mismatch");
          const query = database.select({
            status: products.status,
            version: productLocalizations.editorDocumentVersion,
          }).from(products).innerJoin(productLocalizations, and(
            eq(productLocalizations.productId, products.id),
            eq(productLocalizations.locale, "en"),
          )).where(eq(products.id, input.association.targetProductId)).limit(1);
          const rows = input.scope.mode === "governed_enqueue_transaction"
            ? await query.for("update", { of: productLocalizations })
            : await query;
          const row = rows[0];
          if (row === undefined) return aiFailure("authorization_denied");
          if (row.status !== "draft") return aiFailure("target_not_editable");
          if (row.version !== input.association.expectedTargetVersion) {
            return aiFailure("target_version_conflict");
          }
          const authorized = buildAuthorizedDraftAssociationV1(input.association);
          return authorized.ok ? aiSuccess({
            owner: "product",
            entityId: input.association.targetProductId,
            editVersion: row.version,
            revisionId: null,
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
        }).from(editorialRevisions)
          .where(eq(editorialRevisions.id, input.association.targetRevisionId))
          .limit(1);
        const rows = input.scope.mode === "governed_enqueue_transaction"
          ? await query.for("update", { of: editorialRevisions })
          : await query;
        const row = rows[0];
        if (row === undefined) return aiFailure("authorization_denied");
        if (row.entityType !== "product") {
          return aiFailure(input.actor.roleKey === "admin"
            ? "target_scope_mismatch" : "authorization_denied");
        }
        if (row.locale !== "en" || !commandTargetsProduct(input.command)) {
          return aiFailure("target_scope_mismatch");
        }
        if (row.status !== "draft") return aiFailure("target_not_editable");
        const snapshot = productRevisionSnapshotSchema.safeParse(row.snapshot);
        if (!snapshot.success) return aiFailure("context_provenance_mismatch");
        const draftVersion = snapshot.data.draftVersion ?? 1;
        if (draftVersion !== input.association.expectedTargetVersion) {
          return aiFailure("target_version_conflict");
        }
        const authorized = buildAuthorizedDraftAssociationV1(input.association);
        return authorized.ok ? aiSuccess({
          owner: "product",
          entityId: row.entityId,
          editVersion: draftVersion,
          revisionId: input.association.targetRevisionId,
          authorizedAssociation: authorized.value,
        }) : authorized;
      });
    },

    async readSelectedStructuredContext(input) {
      if (!await actorIsCurrent(input.scope, input.actor, input.command) ||
        !actorCanOwnProductTarget(input.actor.roleKey) ||
        input.target.owner !== "product" ||
        input.target.entityId !== input.selector.sourceId) {
        return aiFailure("context_record_unauthorized");
      }
      return withDraftReadExecutor(input.scope, async (database) => {
        const rows = await database.select({
          id: products.id,
          name: productLocalizations.name,
          version: productLocalizations.editorDocumentVersion,
          composition: products.composition,
          weightGsm: products.weightGsm,
          widthCm: products.widthCm,
          moqValue: products.moqValue,
          moqUnit: products.moqUnit,
          fabricStyle: products.fabricStyle,
          colorOptions: products.colorOptions,
          moqNote: products.moqNote,
          customAvailable: products.customAvailable,
          sampleAvailable: products.sampleAvailable,
        }).from(products).innerJoin(productLocalizations, and(
          eq(productLocalizations.productId, products.id),
          eq(productLocalizations.locale, "en"),
        )).where(eq(products.id, input.selector.sourceId)).limit(1);
        const row = rows[0];
        if (row === undefined) return aiFailure("context_record_unauthorized");
        const primary = await database.select({ name: taxonomyTermLocalizations.name })
          .from(productTaxonomyTerms)
          .innerJoin(taxonomyTerms, eq(taxonomyTerms.id, productTaxonomyTerms.taxonomyTermId))
          .innerJoin(taxonomyTermLocalizations, and(
            eq(taxonomyTermLocalizations.taxonomyTermId, taxonomyTerms.id),
            eq(taxonomyTermLocalizations.locale, "en"),
          )).where(and(
            eq(productTaxonomyTerms.productId, row.id),
            eq(productTaxonomyTerms.isPrimary, true),
          )).orderBy(asc(taxonomyTerms.id));
        const additional = await database.select({ name: taxonomyTermLocalizations.name })
          .from(productTaxonomyTerms)
          .innerJoin(taxonomyTerms, eq(taxonomyTerms.id, productTaxonomyTerms.taxonomyTermId))
          .innerJoin(taxonomyTermLocalizations, and(
            eq(taxonomyTermLocalizations.taxonomyTermId, taxonomyTerms.id),
            eq(taxonomyTermLocalizations.locale, "en"),
          )).where(and(
            eq(productTaxonomyTerms.productId, row.id),
            eq(productTaxonomyTerms.isPrimary, false),
          )).orderBy(asc(taxonomyTerms.id));
        const applicationRows = await database.select({ name: applicationLocalizations.name })
          .from(productApplications)
          .innerJoin(applications, eq(applications.id, productApplications.applicationId))
          .innerJoin(applicationLocalizations, and(
            eq(applicationLocalizations.applicationId, applications.id),
            eq(applicationLocalizations.locale, "en"),
          )).where(eq(productApplications.productId, row.id)).orderBy(asc(applications.id));
        const values: Record<string, unknown> = {
          name: row.name,
          primaryCategoryLabel: primary[0]?.name,
          additionalCategoryLabels: additional.map((item) => item.name),
          applicationLabels: applicationRows.map((item) => item.name),
          composition: row.composition,
          weightGsm: row.weightGsm,
          widthCm: row.widthCm,
          moqPair: row.moqValue === null || row.moqUnit === null
            ? null : { moqValue: row.moqValue, moqUnit: row.moqUnit },
          fabricStyle: row.fabricStyle,
          colorOptions: row.colorOptions,
          moqNote: row.moqNote,
          customAvailable: row.customAvailable === "unknown" ? null : row.customAvailable,
          sampleAvailable: row.sampleAvailable === "unknown" ? null : row.sampleAvailable,
        };
        const fields: DraftContextSourceDtoV1["fields"] = [];
        for (const field of input.selector.fields) {
          const value = values[field];
          if (value === undefined || value === null || Array.isArray(value) && value.length === 0) {
            return aiFailure("context_field_ineligible");
          }
          fields.push({
            field,
            provenance: field === "name" || field === "primaryCategoryLabel" ||
              field === "additionalCategoryLabels" || field === "applicationLabels"
              ? "structural" : "provided",
            value: value as import("@/ai/canonical-json").ReadonlyJsonValue,
          });
        }
        return aiSuccess({
          sourceClass: "product_structured",
          productId: row.id,
          recordVersion: row.version,
          authoritativeRecordVersion: row.version,
          targetBinding: targetBinding(input.target),
          fields,
        });
      });
    },

    async readSelectedMediaPlacements(input) {
      if (!await actorIsCurrent(input.scope, input.actor, input.command) ||
        !actorCanOwnProductTarget(input.actor.roleKey) ||
        input.command.useCase !== "product_description_draft" ||
        input.target.owner !== "product" ||
        input.selectedPlacementIds.length > 12 ||
        new Set(input.selectedPlacementIds).size !== input.selectedPlacementIds.length) {
        return aiFailure("context_record_unauthorized");
      }
      if (input.selectedPlacementIds.length === 0) return aiSuccess([]);
      return withDraftReadExecutor(input.scope, async (database) => {
        const rows = await database.select({ assetId: productAssets.assetId })
          .from(productAssets)
          .where(and(
            eq(productAssets.productId, input.target.entityId),
            eq(productAssets.isVisible, true),
            inArray(productAssets.assetId, input.selectedPlacementIds),
          ));
        const current = new Set(rows.map((row) => row.assetId));
        if (current.size !== input.selectedPlacementIds.length ||
          input.selectedPlacementIds.some((id) => !current.has(id))) {
          return aiFailure("context_record_unauthorized");
        }
        return aiSuccess(input.selectedPlacementIds.map((_, index) => ({
          placementRef: `media_${String(index + 1).padStart(2, "0")}` as const,
        })));
      });
    },
  };
}
