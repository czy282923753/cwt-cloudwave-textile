import { and, asc, eq, inArray } from "drizzle-orm";
import type { PgQueryResultHKT } from "drizzle-orm/pg-core/session";
import { z } from "zod";

import { canonicalJsonHash, type ReadonlyJsonValue } from "@/ai/canonical-json";
import type { ProductContextField } from "@/ai/context/contracts";
import { aiFailure, aiSuccess, type AiServiceResult } from "@/ai/errors";
import type { CoreAiActorV1 } from "@/ai/core/contracts";
import type {
  AuthorizedDraftAssociationV1,
  DraftAssistanceCommandV1,
  DraftDurableAssociationWithoutHashV1,
  ProductBeforeV1,
  ReviewCurrentNodeV1,
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
  productFieldReviews,
  productLocalizations,
  productTaxonomyTerms,
  products,
  routes,
  seoMetadata,
  taxonomyTermLocalizations,
  taxonomyTerms,
  users,
} from "@/db/schema";
import { blockDocumentSchema, parseBlockDocument, type BlockDocument } from "@/editorial/blocks";

const productRevisionSnapshotSchema = z.object({
  kind: z.literal("editorial_blocks"),
  name: z.string().min(1),
  shortDescription: z.string().nullable(),
  document: blockDocumentSchema,
  expectedEditorDocumentVersion: z.number().int().positive(),
  draftVersion: z.number().int().positive(),
  pendingChanges: z.array(z.unknown()).optional(),
}).strict();
interface ProductRevisionContextProjectionV1 {
  readonly name: string;
}

export interface ProductAiTargetSnapshotV1 {
  readonly owner: "product";
  readonly entityId: string;
  readonly editVersion: number;
  readonly revisionId: string | null;
  readonly revisionSnapshot: ProductRevisionContextProjectionV1 | null;
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
  readReviewBefore(input: {
    readonly scope: DraftConsistentReadScope<TQueryResult>;
    readonly actor: CoreAiActorV1;
    readonly target: ProductAiTargetSnapshotV1;
    readonly mediaSelectionHashes: readonly string[];
  }): Promise<AiServiceResult<{
    readonly before: ProductBeforeV1;
    readonly selectedMediaPlacementIds: readonly string[];
  }>>;
}

export interface ProductAiReaderBarrierHooksV1 {
  afterProductRecordRead?(): Promise<void>;
}

function actorCanOwnProductTarget(role: CoreAiActorV1["roleKey"]): boolean {
  return role === "admin" || role === "product_editor";
}

function actorCanReadProductTarget<TQueryResult extends PgQueryResultHKT>(
  scope: DraftConsistentReadScope<TQueryResult>,
  role: CoreAiActorV1["roleKey"],
): boolean {
  return actorCanOwnProductTarget(role) ||
    scope.mode === "read_only" && role === "reviewer_publisher";
}

function safeDocument(document: BlockDocument): readonly ReviewCurrentNodeV1[] {
  return document.blocks.map((block) => {
    let text: readonly string[] = [];
    switch (block.type) {
      case "heading":
      case "paragraph": text = [block.text]; break;
      case "callout": text = [...(block.title ? [block.title] : []), block.text]; break;
      case "quote": text = [block.text, ...(block.attribution ? [block.attribution] : [])]; break;
      case "feature_list":
      case "bullet_list": text = block.items; break;
      case "faq": text = block.items.flatMap((item) => [item.question, item.answer]); break;
      case "specification_table": text = block.rows.flatMap((row) => [row.label, row.value]); break;
      case "comparison_table": text = [
        ...block.columns,
        ...block.rows.flatMap((row) => [row.label, ...row.cells]),
      ]; break;
      case "cta": text = [block.label, ...(block.supportingText ? [block.supportingText] : [])]; break;
      case "image": text = ["Image placement"]; break;
      case "gallery": text = [`Gallery (${block.mediaKeys.length})`]; break;
      case "related_products": text = [`Related products (${block.productIds.length})`]; break;
      case "related_articles": text = [`Related articles (${block.contentIds.length})`]; break;
      case "divider": text = []; break;
    }
    return { id: block.id, kind: block.type, locked: block.locked === true, text };
  });
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

const reviewedProductFactFields = [
  "composition", "weightGsm", "widthCm", "moqValue", "moqUnit",
] as const;
type ReviewedProductFactField = (typeof reviewedProductFactFields)[number];
type EligibleFactProvenance = "provided" | "verified";

interface ProductContextRowV1 {
  readonly id: string;
  readonly name: string;
  readonly version: number;
  readonly composition: string | null;
  readonly weightGsm: string | null;
  readonly widthCm: string | null;
  readonly moqValue: string | null;
  readonly moqUnit: string | null;
  readonly fabricStyle: string | null;
  readonly colorOptions: string | null;
  readonly moqNote: string | null;
  readonly customAvailable: "unknown" | "yes" | "no";
  readonly sampleAvailable: "unknown" | "yes" | "no";
}

function eligibleFactProvenance(
  value: string | undefined,
): EligibleFactProvenance | null {
  return value === "provided" || value === "verified" ? value : null;
}

function canonicalPositiveDecimal(value: string | null): string | null {
  if (value === null || !/^(?:0|[1-9]\d*)(?:\.\d+)?$/.test(value)) return null;
  const [integer = "", fraction = ""] = value.split(".");
  const canonicalFraction = fraction.replace(/0+$/, "");
  if (/^0+$/.test(integer) && canonicalFraction.length === 0) return null;
  return canonicalFraction.length === 0 ? integer : `${integer}.${canonicalFraction}`;
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
>(options: {
  readonly barriers?: ProductAiReaderBarrierHooksV1;
} = {}): ProductAiDraftReaderV1<TQueryResult> {
  return {
    async readTargetSnapshot(input) {
      if (!await actorIsCurrent(input.scope, input.actor, input.command) ||
        !actorCanReadProductTarget(input.scope, input.actor.roleKey)) {
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
        const draftVersion = snapshot.data.draftVersion;
        if (draftVersion !== input.association.expectedTargetVersion) {
          return aiFailure("target_version_conflict");
        }
        const authorized = buildAuthorizedDraftAssociationV1(input.association);
        return authorized.ok ? aiSuccess({
          owner: "product",
          entityId: row.entityId,
          editVersion: draftVersion,
          revisionId: input.association.targetRevisionId,
          revisionSnapshot: Object.freeze({ name: snapshot.data.name }),
          authorizedAssociation: authorized.value,
        }) : authorized;
      });
    },

    async readSelectedStructuredContext(input) {
      if (!await actorIsCurrent(input.scope, input.actor, input.command) ||
        !actorCanReadProductTarget(input.scope, input.actor.roleKey) ||
        input.target.owner !== "product" ||
        input.target.entityId !== input.selector.sourceId) {
        return aiFailure("context_record_unauthorized");
      }
      return withDraftReadExecutor(input.scope, async (database) => {
        let row: ProductContextRowV1 | undefined;
        if (input.target.revisionSnapshot === null) {
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
          row = rows[0];
        } else {
          const rows = await database.select({
            id: products.id,
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
          }).from(products).where(eq(products.id, input.selector.sourceId)).limit(1);
          const factualRow = rows[0];
          if (factualRow !== undefined) {
            row = {
              ...factualRow,
              name: input.target.revisionSnapshot.name,
              version: input.target.editVersion,
            };
          }
        }
        if (row === undefined) return aiFailure("context_record_unauthorized");
        await options.barriers?.afterProductRecordRead?.();
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
        const reviewRows = await database.select({
          fieldName: productFieldReviews.fieldName,
          status: productFieldReviews.verificationStatus,
        }).from(productFieldReviews).where(and(
          eq(productFieldReviews.productId, row.id),
          inArray(productFieldReviews.fieldName, reviewedProductFactFields),
        ));
        const reviews = new Map<ReviewedProductFactField, string>();
        for (const review of reviewRows) {
          if (reviewedProductFactFields.includes(review.fieldName as ReviewedProductFactField)) {
            reviews.set(review.fieldName as ReviewedProductFactField, review.status);
          }
        }
        const compositionProvenance = eligibleFactProvenance(reviews.get("composition"));
        const weightProvenance = eligibleFactProvenance(reviews.get("weightGsm"));
        const widthProvenance = eligibleFactProvenance(reviews.get("widthCm"));
        const moqValueProvenance = eligibleFactProvenance(reviews.get("moqValue"));
        const moqUnitProvenance = eligibleFactProvenance(reviews.get("moqUnit"));
        const canonicalWeight = canonicalPositiveDecimal(row.weightGsm);
        const canonicalWidth = canonicalPositiveDecimal(row.widthCm);
        const canonicalMoq = canonicalPositiveDecimal(row.moqValue);
        const moqProvenance = moqValueProvenance !== null && moqUnitProvenance !== null
          ? moqValueProvenance === "verified" && moqUnitProvenance === "verified"
            ? "verified" as const : "provided" as const
          : null;
        const values: Record<ProductContextField, {
          readonly value: ReadonlyJsonValue | undefined;
          readonly provenance: "structural" | EligibleFactProvenance | null;
        }> = {
          name: { value: row.name, provenance: "structural" },
          primaryCategoryLabel: { value: primary[0]?.name, provenance: "structural" },
          additionalCategoryLabels: {
            value: additional.map((item) => item.name),
            provenance: "structural",
          },
          applicationLabels: {
            value: applicationRows.map((item) => item.name),
            provenance: "structural",
          },
          composition: {
            value: row.composition ?? undefined,
            provenance: compositionProvenance,
          },
          weightGsm: { value: canonicalWeight ?? undefined, provenance: weightProvenance },
          widthCm: { value: canonicalWidth ?? undefined, provenance: widthProvenance },
          moqPair: {
            value: canonicalMoq !== null && row.moqUnit !== null &&
                ["m", "kg", "roll", "yd"].includes(row.moqUnit)
              ? { moqValue: canonicalMoq, moqUnit: row.moqUnit }
              : undefined,
            provenance: moqProvenance,
          },
          fabricStyle: { value: row.fabricStyle ?? undefined, provenance: "provided" },
          colorOptions: { value: row.colorOptions ?? undefined, provenance: "provided" },
          moqNote: { value: row.moqNote ?? undefined, provenance: "provided" },
          customAvailable: {
            value: row.customAvailable === "unknown" ? undefined : row.customAvailable,
            provenance: "provided",
          },
          sampleAvailable: {
            value: row.sampleAvailable === "unknown" ? undefined : row.sampleAvailable,
            provenance: "provided",
          },
        };
        const fields: DraftContextSourceDtoV1["fields"] = [];
        for (const field of input.selector.fields) {
          const projection = values[field];
          if (projection.value === undefined || projection.provenance === null ||
            typeof projection.value === "string" && projection.value.trim().length === 0 ||
            Array.isArray(projection.value) && projection.value.length === 0) {
            return aiFailure("context_field_ineligible");
          }
          fields.push({
            field,
            provenance: projection.provenance,
            value: projection.value,
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
        !actorCanReadProductTarget(input.scope, input.actor.roleKey) ||
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

    async readReviewBefore(input) {
      if (!actorCanReadProductTarget(input.scope, input.actor.roleKey) ||
        input.mediaSelectionHashes.length > 12 ||
        new Set(input.mediaSelectionHashes).size !== input.mediaSelectionHashes.length ||
        input.mediaSelectionHashes.some((hash) => !/^[0-9a-f]{64}$/.test(hash))) {
        return aiFailure("context_record_unauthorized");
      }
      return withDraftReadExecutor(input.scope, async (database) => {
        const direct = input.target.revisionSnapshot === null;
        const localizationRows = direct ? await database.select({
          status: products.status,
          name: productLocalizations.name,
          summary: productLocalizations.shortDescription,
          document: productLocalizations.structuredBlocks,
          version: productLocalizations.editorDocumentVersion,
        }).from(products).innerJoin(productLocalizations, and(
          eq(productLocalizations.productId, products.id),
          eq(productLocalizations.locale, "en"),
        )).where(eq(products.id, input.target.entityId)).limit(2) : [];
        const localization = localizationRows[0];
        if (direct && (localizationRows.length !== 1 || localization?.status !== "draft" ||
          localization.version !== input.target.editVersion)) {
          return aiFailure("target_version_conflict");
        }
        const revisionRows = direct ? [] : await database.select({
          entityId: editorialRevisions.entityId,
          entityType: editorialRevisions.entityType,
          locale: editorialRevisions.locale,
          status: editorialRevisions.status,
          snapshot: editorialRevisions.snapshot,
        }).from(editorialRevisions).where(eq(
          editorialRevisions.id,
          input.target.revisionId!,
        )).limit(2);
        const revisionRow = revisionRows[0];
        const revision = direct ? null : productRevisionSnapshotSchema.safeParse(revisionRow?.snapshot);
        if (!direct && (revisionRows.length !== 1 || revisionRow?.entityType !== "product" ||
          revisionRow.entityId !== input.target.entityId || revisionRow.locale !== "en" ||
          revisionRow.status !== "draft" || !revision?.success ||
          revision.data.draftVersion !== input.target.editVersion)) {
          return aiFailure("target_version_conflict");
        }
        const revisionData = revision?.success ? revision.data : null;
        if (!direct && revisionData === null) return aiFailure("target_version_conflict");
        let document: BlockDocument;
        try {
          document = direct
            ? parseBlockDocument(localization?.document, "product")
            : revisionData!.document;
        } catch {
          return aiFailure("context_provenance_mismatch");
        }
        const routeRows = await database.select({
          title: seoMetadata.title,
          metaDescription: seoMetadata.metaDescription,
        }).from(routes).innerJoin(seoMetadata, eq(seoMetadata.routeId, routes.id)).where(and(
          eq(routes.entityType, "product"),
          eq(routes.entityId, input.target.entityId),
          eq(routes.locale, "en"),
          eq(routes.isCurrent, true),
        )).limit(2);
        if (routeRows.length > 1) return aiFailure("context_provenance_mismatch");
        let seo = {
          title: routeRows[0]?.title ?? null,
          metaDescription: routeRows[0]?.metaDescription ?? null,
        };
        for (const change of revisionData?.pendingChanges ?? []) {
          if (typeof change !== "object" || change === null || Array.isArray(change)) continue;
          const value = change as Record<string, unknown>;
          if (value.kind === "seo" &&
            (typeof value.title === "string" || value.title === null) &&
            (typeof value.metaDescription === "string" || value.metaDescription === null)) {
            seo = { title: value.title, metaDescription: value.metaDescription };
          }
        }
        const placements = await database.select({
          id: productAssets.assetId,
          altText: productAssets.altText,
          caption: productAssets.caption,
        }).from(productAssets).where(and(
          eq(productAssets.productId, input.target.entityId),
          eq(productAssets.isVisible, true),
        ));
        const byHash = new Map<string, typeof placements[number]>();
        for (const placement of placements) {
          const identity = canonicalJsonHash({ selectedMediaPlacementId: placement.id });
          if (!identity.ok || byHash.has(identity.value.hash)) {
            return aiFailure("context_provenance_mismatch");
          }
          byHash.set(identity.value.hash, placement);
        }
        const selected = input.mediaSelectionHashes.map((hash) => byHash.get(hash));
        if (selected.some((placement) => placement === undefined)) {
          return aiFailure("context_record_unauthorized");
        }
        return aiSuccess({
          before: {
            kind: "product",
            name: direct ? localization!.name : revisionData!.name,
            summary: direct ? localization!.summary : revisionData!.shortDescription,
            document: safeDocument(document),
            seo,
            mediaText: selected.map((placement, index) => ({
              placementRef: `media_${String(index + 1).padStart(2, "0")}` as const,
              altText: placement!.altText,
              caption: placement!.caption,
            })),
          },
          selectedMediaPlacementIds: selected.map((placement) => placement!.id),
        });
      });
    },
  };
}
