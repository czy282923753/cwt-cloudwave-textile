import "server-only";

import { and, eq } from "drizzle-orm";
import type { PgQueryResultHKT } from "drizzle-orm/pg-core/session";

import type { AppDatabase } from "@/db/types";
import {
  contentLocalizations,
  contents,
  editorialRevisions,
  productLocalizations,
  products,
} from "@/db/schema";
import { aiFailure } from "@/ai/errors";
import { createGenericAiOrchestratorV1 } from "@/ai/core/orchestrator";
import { aiFeatureGateRepositoryV1 } from "@/ai/config/feature-gate-repository";
import { aiModelConfigRepositoryV1 } from "@/ai/config/model-config-repository";
import type { TrustedPhaseBEnvironmentV1 } from "@/ai/config/trusted-phase-b-environment";
import { createProductionApplicationRegistryV1 } from "@/ai/registry/production-use-cases";

import { buildAuthorizedDraftAssociationV1 } from "./association";
import {
  createDraftAvailabilityAuthorization,
  createDraftRequestAuthorization,
  type DraftTargetReadRepository,
} from "./authorization";
import { createDraftContextPolicy, type DraftContextReadRepository } from "./context";
import type { DraftAssistanceCommandV1, DraftAssistanceService } from "./contracts";
import { createDraftAssistanceFacadeV1 } from "./facade";
import { withDraftReadExecutor } from "./read-scopes";

function actorCanEdit(command: DraftAssistanceCommandV1): boolean {
  if (command.actor.role === "admin") return true;
  if (command.target.type === "product_draft") return command.actor.role === "product_editor";
  return command.actor.role === "content_editor";
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
      if (!actorCanEdit(input.command)) return aiFailure("authorization_denied");
      return withDraftReadExecutor(input.scope, async (database) => {
        if (input.association.targetType === "product_draft") {
          if (input.command.useCase !== "product_description_draft" && input.command.useCase !== "seo_content_draft") {
            return aiFailure("target_scope_mismatch");
          }
          const rows = await database.select({
            status: products.status,
            version: productLocalizations.editorDocumentVersion,
          }).from(products).innerJoin(productLocalizations, and(
            eq(productLocalizations.productId, products.id),
            eq(productLocalizations.locale, "en"),
          )).where(eq(products.id, input.association.targetProductId));
          const row = rows[0];
          if (row === undefined) return aiFailure("authorization_denied");
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
        if (row.locale !== "en" ||
          (row.entityType === "product" &&
            input.command.useCase !== "product_description_draft" && input.command.useCase !== "seo_content_draft") ||
          (row.entityType === "content" && !contentChannelAllowed(input.command.useCase, row.contentChannel)) ||
          (row.entityType !== "product" && row.entityType !== "content")) {
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
    async readSelectedSource() {
      return aiFailure("integration_not_ready");
    },
  };
}

export function createPhaseBAvailabilityServiceV1<
  TQueryResult extends PgQueryResultHKT,
>(dependencies: {
  readonly database: AppDatabase<TQueryResult>;
  readonly trustedEnvironment: TrustedPhaseBEnvironmentV1;
}): DraftAssistanceService {
  const contextPolicy = createDraftContextPolicy(contextRepository<TQueryResult>());
  const registry = createProductionApplicationRegistryV1({
    availabilityAuthorization: createDraftAvailabilityAuthorization(targetRepository<TQueryResult>()),
    requestAuthorization: createDraftRequestAuthorization<TQueryResult>(),
    contextPolicy,
    featureRepository: aiFeatureGateRepositoryV1,
    configRepository: aiModelConfigRepositoryV1,
  });
  const orchestrator = createGenericAiOrchestratorV1({
    durableEnqueueAvailable: false,
    appEnvironment: dependencies.trustedEnvironment.appEnvironment,
    processFeatureAiEnabled: dependencies.trustedEnvironment.processFeatureAiEnabled,
    async validateConfiguration() {
      return aiFailure("integration_not_ready");
    },
  });
  return createDraftAssistanceFacadeV1({
    database: dependencies.database,
    registry,
    orchestrator,
  });
}
