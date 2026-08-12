import "server-only";

import { and, asc, eq } from "drizzle-orm";
import type { PgQueryResultHKT } from "drizzle-orm/pg-core/session";
import type { PostgresJsQueryResultHKT } from "drizzle-orm/postgres-js/session";

import type { AppDatabase } from "@/db/types";
import {
  contentLocalizations,
  contents,
  companyFacts,
  editorialRevisions,
  applicationLocalizations,
  applications,
  productLocalizations,
  productApplications,
  productTaxonomyTerms,
  products,
  taxonomyTermLocalizations,
  taxonomyTerms,
} from "@/db/schema";
import { aiFailure, aiSuccess } from "@/ai/errors";
import { createGenericAiOrchestratorV1 } from "@/ai/core/orchestrator";
import { aiFeatureGateRepositoryV1 } from "@/ai/config/feature-gate-repository";
import { aiModelConfigRepositoryV1 } from "@/ai/config/model-config-repository";
import { resolveModelConfigV1 } from "@/ai/config/model-config-resolver";
import type { TrustedPhaseBEnvironmentV1 } from "@/ai/config/trusted-phase-b-environment";
import {
  createProductionApplicationRegistryV1,
  createProductionClaimedApplicationRegistryV1,
} from "@/ai/registry/production-use-cases";
import type { TextProviderRegistryV1 } from "@/ai/providers/registry";
import type { PromptBundleLoaderV1 } from "@/ai/prompts/loader";
import { renderPromptV1 } from "@/ai/prompts/renderer";
import { draftOutputDefinitionV1 } from "@/ai/output/registry";
import type { PricingPolicyRegistryV1 } from "@/ai/runs/pricing-policy";
import { createAiRunServiceV1 } from "@/ai/runs/service";
import { type GovernedMutationOptions } from "@/audit/governed-mutation";

import { buildAuthorizedDraftAssociationV1 } from "./association";
import {
  createDraftAvailabilityAuthorization,
  createDraftRequestAuthorization,
  type DraftTargetReadRepository,
} from "./authorization";
import {
  createDraftContextPolicy,
  type DraftContextReadRepository,
  type DraftContextSourceDtoV1,
} from "./context";
import type {
  DraftAssistanceAvailabilityService,
  DraftAssistanceCommandV1,
  DraftAssistanceService,
} from "./contracts";
import {
  createDraftAssistanceAvailabilityFacadeV1,
  createDraftAssistanceDurableFacadeV1,
} from "./facade";
import { withDraftReadExecutor } from "./read-scopes";

function actorCanEditEntityType(
  role: string,
  entityType: "product" | "content",
): boolean {
  if (role === "admin") return true;
  return entityType === "product" ? role === "product_editor" : role === "content_editor";
}

function contentChannelAllowed(
  useCase: DraftAssistanceCommandV1["useCase"],
  channel: string | null,
): boolean {
  if (useCase === "fabric_knowledge_draft") return channel === "fabric_knowledge";
  if (useCase === "sourcing_guide_draft") return channel === "china_sourcing_guide";
  if (useCase === "product_description_draft") return false;
  return channel !== null;
}

function targetRepository<TQueryResult extends PgQueryResultHKT>():
  DraftTargetReadRepository<TQueryResult> {
  return {
    async authorizeAndReadTargetForAvailability(input) {
      return withDraftReadExecutor(input.scope, async (database) => {
        if (input.association.targetType === "product_draft") {
          const rows = await database.select({
            status: products.status,
            version: productLocalizations.editorDocumentVersion,
          }).from(products).innerJoin(productLocalizations, and(
            eq(productLocalizations.productId, products.id),
            eq(productLocalizations.locale, "en"),
          )).where(eq(products.id, input.association.targetProductId));
          const row = rows[0];
          if (row === undefined) return aiFailure("authorization_denied");
          if (!actorCanEditEntityType(input.actor.roleKey, "product")) {
            return aiFailure("authorization_denied");
          }
          if (input.command.useCase !== "product_description_draft" && input.command.useCase !== "seo_content_draft") {
            return aiFailure("target_scope_mismatch");
          }
          if (row.status !== "draft") return aiFailure("target_not_editable");
          if (row.version !== input.association.expectedTargetVersion) return aiFailure("target_version_conflict");
          return buildAuthorizedDraftAssociationV1(input.association);
        }
        if (input.association.targetType === "content_draft") {
          const rows = await database.select({
            status: contents.status,
            channel: contents.channel,
            version: contentLocalizations.editorDocumentVersion,
          }).from(contents).innerJoin(contentLocalizations, and(
            eq(contentLocalizations.contentId, contents.id),
            eq(contentLocalizations.locale, "en"),
          )).where(eq(contents.id, input.association.targetContentId));
          const row = rows[0];
          if (row === undefined) return aiFailure("authorization_denied");
          if (!actorCanEditEntityType(input.actor.roleKey, "content")) {
            return aiFailure("authorization_denied");
          }
          if (!contentChannelAllowed(input.command.useCase, row.channel)) return aiFailure("target_scope_mismatch");
          if (row.status !== "draft") return aiFailure("target_not_editable");
          if (row.version !== input.association.expectedTargetVersion) return aiFailure("target_version_conflict");
          return buildAuthorizedDraftAssociationV1(input.association);
        }
        const rows = await database.select({
          status: editorialRevisions.status,
          entityType: editorialRevisions.entityType,
          locale: editorialRevisions.locale,
          version: editorialRevisions.versionNumber,
          contentChannel: contents.channel,
        }).from(editorialRevisions).leftJoin(contents, and(
          eq(editorialRevisions.entityType, "content"),
          eq(contents.id, editorialRevisions.entityId),
        )).where(eq(editorialRevisions.id, input.association.targetRevisionId));
        const row = rows[0];
        if (row === undefined) return aiFailure("authorization_denied");
        if (input.actor.roleKey !== "admin" &&
          (row.entityType !== "product" && row.entityType !== "content" ||
            !actorCanEditEntityType(input.actor.roleKey, row.entityType))) {
          return aiFailure("authorization_denied");
        }
        if (row.entityType !== "product" && row.entityType !== "content") {
          return aiFailure("target_scope_mismatch");
        }
        if (row.locale !== "en" ||
          (row.entityType === "product" &&
            input.command.useCase !== "product_description_draft" && input.command.useCase !== "seo_content_draft") ||
          (row.entityType === "content" && !contentChannelAllowed(input.command.useCase, row.contentChannel))) {
          return aiFailure("target_scope_mismatch");
        }
        if (row.status !== "draft") return aiFailure("target_not_editable");
        if (row.version !== input.association.expectedTargetVersion) return aiFailure("target_version_conflict");
        return buildAuthorizedDraftAssociationV1(input.association);
      });
    },
  };
}

function contextRepository<TQueryResult extends PgQueryResultHKT>():
  DraftContextReadRepository<TQueryResult> {
  return {
    async readSelectedSource(input) {
      return withDraftReadExecutor(input.scope, async (database) => {
        const targetBinding = async (): Promise<
          DraftContextSourceDtoV1["targetBinding"] | undefined
        > => {
          switch (input.command.target.type) {
            case "product_draft": return {
              targetType: "product_draft",
              targetProductId: input.command.target.productId,
              expectedTargetVersion: input.command.target.expectedVersion,
            };
            case "content_draft": return {
              targetType: "content_draft",
              targetContentId: input.command.target.contentId,
              expectedTargetVersion: input.command.target.expectedVersion,
            };
            case "editorial_revision": {
              const rows = await database.select({
                entityType: editorialRevisions.entityType,
                entityId: editorialRevisions.entityId,
                version: editorialRevisions.versionNumber,
              }).from(editorialRevisions)
                .where(eq(editorialRevisions.id, input.command.target.revisionId)).limit(1);
              const row = rows[0];
              if (row === undefined || row.entityType !== "product" && row.entityType !== "content" ||
                row.version !== input.command.target.expectedVersion) return undefined;
              return {
                targetType: "editorial_revision",
                targetRevisionId: input.command.target.revisionId,
                expectedTargetVersion: input.command.target.expectedVersion,
                authoritativeRevisionVersion: row.version,
                revisionEntityType: row.entityType,
                revisionEntityId: row.entityId,
              };
            }
          }
        };
        const binding = await targetBinding();
        if (binding === undefined) return aiFailure("context_record_unauthorized");
        if (input.selector.sourceClass === "public_company_fact") {
          const rows = await database.select().from(companyFacts).where(and(
            eq(companyFacts.id, input.selector.sourceId),
            eq(companyFacts.publicUseAllowed, true),
            eq(companyFacts.verificationStatus, "verified"),
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
          return aiSuccess({
            sourceClass: "public_company_fact",
            companyFactId: row.id,
            recordUpdatedAt: row.updatedAt.toISOString(),
            authoritativeRecordUpdatedAt: row.updatedAt.toISOString(),
            targetBinding: binding,
            fields,
          });
        }
        if (input.selector.sourceClass === "fabric_knowledge") {
          const rows = await database.select({
            id: contents.id,
            channel: contents.channel,
            status: contents.status,
            title: contentLocalizations.title,
            excerpt: contentLocalizations.excerpt,
            body: contentLocalizations.body,
            version: contentLocalizations.editorDocumentVersion,
          }).from(contents).innerJoin(contentLocalizations, and(
            eq(contentLocalizations.contentId, contents.id),
            eq(contentLocalizations.locale, "en"),
          )).where(eq(contents.id, input.selector.sourceId)).limit(1);
          const row = rows[0];
          const sameEditableContent = binding.targetType === "content_draft" &&
            binding.targetContentId === input.selector.sourceId ||
            binding.targetType === "editorial_revision" &&
            binding.revisionEntityType === "content" &&
            binding.revisionEntityId === input.selector.sourceId;
          if (row === undefined || row.channel !== "fabric_knowledge" ||
            row.status !== "published" && !sameEditableContent &&
              input.actor.roleKey !== "admin" && input.actor.roleKey !== "content_editor") {
            return aiFailure("context_record_unauthorized");
          }
          const values = {
            title: row.title,
            excerpt: row.excerpt,
            narrativeText: row.body,
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
            contentId: row.id,
            recordVersion: row.version,
            authoritativeRecordVersion: row.version,
            targetBinding: binding,
            fields,
          });
        }
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
        const sameProduct = binding.targetType === "product_draft" &&
          binding.targetProductId === input.selector.sourceId ||
          binding.targetType === "editorial_revision" && binding.revisionEntityType === "product" &&
          binding.revisionEntityId === input.selector.sourceId;
        if (row === undefined || !sameProduct) return aiFailure("context_record_unauthorized");
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
          targetBinding: binding,
          fields,
        });
      });
    },
  };
}

export function createPhaseCClaimedApplicationRegistryV1() {
  const contextPolicy = createDraftContextPolicy(contextRepository<PostgresJsQueryResultHKT>());
  return createProductionClaimedApplicationRegistryV1({
    availabilityAuthorization: createDraftAvailabilityAuthorization(
      targetRepository<PostgresJsQueryResultHKT>(),
    ),
    requestAuthorization: createDraftRequestAuthorization<PostgresJsQueryResultHKT>(),
    contextPolicy,
    featureRepository: aiFeatureGateRepositoryV1,
    configRepository: aiModelConfigRepositoryV1,
  });
}

function compositionOrchestrator(dependencies: {
  readonly trustedEnvironment: TrustedPhaseBEnvironmentV1;
  readonly providerRegistry: TextProviderRegistryV1;
  readonly promptLoader: PromptBundleLoaderV1;
  readonly pricingRegistry: PricingPolicyRegistryV1;
}) {
  return createGenericAiOrchestratorV1({
    appEnvironment: dependencies.trustedEnvironment.appEnvironment,
    processFeatureAiEnabled: dependencies.trustedEnvironment.processFeatureAiEnabled,
    async validateConfiguration(input) {
      const output = draftOutputDefinitionV1(input.useCase as DraftAssistanceCommandV1["useCase"]);
      if (output === undefined) return aiFailure("use_case_unknown");
      const resolved = resolveModelConfigV1({
        key: {
          applicationClass: input.applicationClass,
          capability: "text",
          useCase: input.useCase,
        },
        read: input.read,
        inputSchemaVersion: 1,
        outputSchemaVersion: output.schemaVersion,
        policyVersion: output.policyVersion,
        outputSchemaId: output.schemaId,
        providerRegistry: dependencies.providerRegistry,
        promptLoader: dependencies.promptLoader,
        pricingRegistry: dependencies.pricingRegistry,
      });
      if (!resolved.ok) return resolved;
      const rendered = renderPromptV1({
        resource: resolved.value.prompt,
        variables: input.variables,
      });
      if (!rendered.ok) return rendered;
      const base = {
        modelConfigId: resolved.value.model.modelConfigId,
        modelConfigVersion: resolved.value.model.modelConfigVersion,
      };
      if (input.requestStage === undefined) return { ok: true, value: base };
      if (input.durableAssociation === undefined || input.associationSnapshotHash === undefined) {
        return aiFailure("association_provenance_mismatch");
      }
      return {
        ok: true,
        value: {
          ...base,
          preparedRun: {
            version: 1,
            applicationClass: input.applicationClass,
            useCase: input.useCase,
            capability: "text",
            requestIdentity: input.requestStage.requestIdentity,
            association: input.durableAssociation,
            associationSnapshotHash: input.associationSnapshotHash,
            resolvedConfig: resolved.value.model,
            promptIdentity: resolved.value.prompt.tuple,
            providerEnvelope: resolved.value.providerEnvelope,
            inputSchemaVersion: 1,
            outputSchemaId: output.schemaId,
            outputSchemaVersion: output.schemaVersion,
            policyVersion: output.policyVersion,
            resultKind: output.policy.resultKind,
            dispositionKind: output.policy.dispositionKind,
            inputSources: input.requestStage.preparedContext.inputSources,
            inputContext: input.requestStage.preparedContext.inputContext,
            inputHash: input.requestStage.preparedContext.inputHash,
          },
        },
      };
    },
  });
}

export function createPhaseCAvailabilityServiceV1<
  TQueryResult extends PgQueryResultHKT,
>(dependencies: {
  readonly database: AppDatabase<TQueryResult>;
  readonly trustedEnvironment: TrustedPhaseBEnvironmentV1;
  readonly providerRegistry: TextProviderRegistryV1;
  readonly promptLoader: PromptBundleLoaderV1;
  readonly pricingRegistry: PricingPolicyRegistryV1;
}): DraftAssistanceAvailabilityService {
  const contextPolicy = createDraftContextPolicy(contextRepository<TQueryResult>());
  const registry = createProductionApplicationRegistryV1({
    availabilityAuthorization: createDraftAvailabilityAuthorization(targetRepository<TQueryResult>()),
    requestAuthorization: createDraftRequestAuthorization<TQueryResult>(),
    contextPolicy,
    featureRepository: aiFeatureGateRepositoryV1,
    configRepository: aiModelConfigRepositoryV1,
  });
  const orchestrator = compositionOrchestrator(dependencies);
  return createDraftAssistanceAvailabilityFacadeV1({
    database: dependencies.database,
    registry,
    orchestrator,
  });
}

export function createPhaseCDurableDraftAssistanceServiceV1(dependencies: {
  readonly database: AppDatabase<PostgresJsQueryResultHKT>;
  readonly trustedEnvironment: TrustedPhaseBEnvironmentV1;
  readonly providerRegistry: TextProviderRegistryV1;
  readonly promptLoader: PromptBundleLoaderV1;
  readonly pricingRegistry: PricingPolicyRegistryV1;
  readonly governedMutationOptions?: GovernedMutationOptions;
}): DraftAssistanceService & Pick<
  import("@/ai/runs/service").AiRunServiceV1,
  "readRun" | "cancelRun" | "manualRetry" | "rejectDisposition"
> {
  const contextPolicy = createDraftContextPolicy(contextRepository<PostgresJsQueryResultHKT>());
  const registry = createProductionApplicationRegistryV1({
    availabilityAuthorization: createDraftAvailabilityAuthorization(
      targetRepository<PostgresJsQueryResultHKT>(),
    ),
    requestAuthorization: createDraftRequestAuthorization<PostgresJsQueryResultHKT>(),
    contextPolicy,
    featureRepository: aiFeatureGateRepositoryV1,
    configRepository: aiModelConfigRepositoryV1,
  });
  const orchestrator = compositionOrchestrator(dependencies);
  const availability = createDraftAssistanceAvailabilityFacadeV1({
    database: dependencies.database,
    registry,
    orchestrator,
  });
  const runService = createAiRunServiceV1(dependencies.database, {
    executionEnvironment: dependencies.trustedEnvironment.appEnvironment,
    pricingRegistry: dependencies.pricingRegistry,
    registry,
    orchestrator,
    ...(dependencies.governedMutationOptions === undefined
      ? {}
      : { governedMutationOptions: dependencies.governedMutationOptions }),
  });
  return createDraftAssistanceDurableFacadeV1({ availability, runService });
}
