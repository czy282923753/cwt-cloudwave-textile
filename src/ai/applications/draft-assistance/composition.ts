import "server-only";

import type { PgQueryResultHKT } from "drizzle-orm/pg-core/session";
import type { PostgresJsQueryResultHKT } from "drizzle-orm/postgres-js/session";

import type { AppDatabase } from "@/db/types";
import { aiFailure, type AiServiceResult } from "@/ai/errors";
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
import {
  authoritativeAiActorCanPerformV1,
  resolveAuthoritativeAiActorV1,
} from "@/ai/runs/repository";
import { createAiRunServiceV1 } from "@/ai/runs/service";
import { type GovernedMutationOptions } from "@/audit/governed-mutation";
import {
  createProductAiDraftReaderV1,
  type ProductAiDraftReaderV1,
} from "@/catalog/product-ai-context-reader";
import {
  createContentAiDraftReaderV1,
  type AiDraftTargetSnapshotV1,
  type ContentAiDraftReaderV1,
} from "@/content/content-ai-context-reader";

import {
  createDraftAvailabilityAuthorization,
  createDraftRequestAuthorization,
  type DraftTargetReadRepository,
} from "./authorization";
import {
  createDraftContextPolicy,
  type ControlledValidationSourceAttestorV1,
  type DraftContextReadRepository,
} from "./context";
import type {
  DraftAssistanceAvailabilityService,
  DraftAssistanceCommandV1,
  DraftAssistanceService,
  DraftDurableAssociationWithoutHashV1,
} from "./contracts";
import {
  createDraftAssistanceAvailabilityFacadeV1,
  createDraftAssistanceDurableFacadeV1,
} from "./facade";
import type { DraftConsistentReadScope } from "./read-scopes";

interface DomainReadersV1<TQueryResult extends PgQueryResultHKT> {
  readonly product: ProductAiDraftReaderV1<TQueryResult>;
  readonly content: ContentAiDraftReaderV1<TQueryResult>;
}

function domainReaders<TQueryResult extends PgQueryResultHKT>(): DomainReadersV1<TQueryResult> {
  return {
    product: createProductAiDraftReaderV1<TQueryResult>(),
    content: createContentAiDraftReaderV1<TQueryResult>(),
  };
}

async function readTargetSnapshot<TQueryResult extends PgQueryResultHKT>(
  readers: DomainReadersV1<TQueryResult>,
  input: {
    readonly scope: DraftConsistentReadScope<TQueryResult>;
    readonly actor: import("@/ai/core/contracts").CoreAiActorV1;
    readonly command: DraftAssistanceCommandV1;
    readonly association: DraftDurableAssociationWithoutHashV1;
  },
): Promise<AiServiceResult<AiDraftTargetSnapshotV1>> {
  if (input.association.targetType === "product_draft") {
    return readers.product.readTargetSnapshot(input);
  }
  if (input.association.targetType === "content_draft") {
    return readers.content.readTargetSnapshot(input);
  }
  if (input.actor.roleKey === "product_editor") {
    return readers.product.readTargetSnapshot(input);
  }
  if (input.actor.roleKey === "content_editor") {
    return readers.content.readTargetSnapshot(input);
  }
  if (input.actor.roleKey !== "admin") return aiFailure("authorization_denied");
  const product = await readers.product.readTargetSnapshot(input);
  if (product.ok || product.error.code !== "target_scope_mismatch") return product;
  return readers.content.readTargetSnapshot(input);
}

function targetRepository<TQueryResult extends PgQueryResultHKT>(
  readers: DomainReadersV1<TQueryResult>,
): DraftTargetReadRepository<TQueryResult> {
  return {
    async authorizeAndReadTargetForAvailability(input) {
      const target = await readTargetSnapshot(readers, input);
      return target.ok ? { ok: true, value: target.value.authorizedAssociation } : target;
    },
  };
}

function contextRepository<TQueryResult extends PgQueryResultHKT>(
  readers: DomainReadersV1<TQueryResult>,
): DraftContextReadRepository<TQueryResult> {
  const targetFor = (input: {
    readonly scope: DraftConsistentReadScope<TQueryResult>;
    readonly actor: import("@/ai/core/contracts").CoreAiActorV1;
    readonly command: DraftAssistanceCommandV1;
    readonly association: { readonly association: DraftDurableAssociationWithoutHashV1 };
  }) => readTargetSnapshot(readers, {
    scope: input.scope,
    actor: input.actor,
    command: input.command,
    association: input.association.association,
  });
  return {
    async readSelectedSource(input) {
      const target = await targetFor(input);
      if (!target.ok) return target;
      if (input.selector.sourceClass === "product_structured") {
        if (target.value.owner !== "product") return aiFailure("context_record_unauthorized");
        return readers.product.readSelectedStructuredContext({
          scope: input.scope,
          actor: input.actor,
          command: input.command,
          target: target.value,
          selector: input.selector,
        });
      }
      if (input.selector.sourceClass === "fabric_knowledge") {
        return readers.content.readSelectedFabricContext({
          scope: input.scope,
          actor: input.actor,
          command: input.command,
          target: target.value,
          selector: input.selector,
        });
      }
      return readers.content.readSelectedPublicCompanyFact({
        scope: input.scope,
        actor: input.actor,
        command: input.command,
        target: target.value,
        selector: input.selector,
      });
    },
    async readSelectedInternalLinks(input) {
      const target = await targetFor(input);
      if (!target.ok) return target;
      return readers.content.readSelectedInternalLinks({
        scope: input.scope,
        actor: input.actor,
        command: input.command,
        target: target.value,
        selectedLinkIds: input.selectedLinkIds,
      });
    },
    async readSelectedMediaPlacements(input) {
      const target = await targetFor(input);
      if (!target.ok) return target;
      if (target.value.owner !== "product") return aiFailure("context_record_unauthorized");
      const media = await readers.product.readSelectedMediaPlacements({
        scope: input.scope,
        actor: input.actor,
        command: input.command,
        target: target.value,
        selectedPlacementIds: input.selectedPlacementIds,
      });
      return media.ok
        ? { ok: true, value: media.value.map((item) => item.placementRef) }
        : media;
    },
  };
}

export function createPhaseCClaimedApplicationRegistryV1(options: {
  readonly controlledValidationSourceAttestor?: ControlledValidationSourceAttestorV1;
} = {}) {
  const readers = domainReaders<PostgresJsQueryResultHKT>();
  const contextPolicy = createDraftContextPolicy(
    contextRepository(readers),
    options.controlledValidationSourceAttestor,
  );
  return createProductionClaimedApplicationRegistryV1({
    availabilityAuthorization: createDraftAvailabilityAuthorization(targetRepository(readers)),
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
  readonly controlledValidationAuthority?: import("@/ai/core/contracts")
    .ControlledValidationExecutionAuthorityV1;
}) {
  return createGenericAiOrchestratorV1({
    appEnvironment: dependencies.trustedEnvironment.appEnvironment,
    processFeatureAiEnabled: dependencies.trustedEnvironment.processFeatureAiEnabled,
    ...(dependencies.controlledValidationAuthority === undefined ? {} : {
      controlledValidationAuthority: dependencies.controlledValidationAuthority,
    }),
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
  const readers = domainReaders<TQueryResult>();
  const contextPolicy = createDraftContextPolicy(contextRepository(readers));
  const registry = createProductionApplicationRegistryV1({
    availabilityAuthorization: createDraftAvailabilityAuthorization(targetRepository(readers)),
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
    resolveAuthoritativeActor: resolveAuthoritativeAiActorV1,
    authoritativeActorCanPerform: authoritativeAiActorCanPerformV1,
  });
}

export function createPhaseCDurableDraftAssistanceServiceV1(dependencies: {
  readonly database: AppDatabase<PostgresJsQueryResultHKT>;
  readonly trustedEnvironment: TrustedPhaseBEnvironmentV1;
  readonly providerRegistry: TextProviderRegistryV1;
  readonly promptLoader: PromptBundleLoaderV1;
  readonly pricingRegistry: PricingPolicyRegistryV1;
  readonly governedMutationOptions?: GovernedMutationOptions;
  readonly controlledValidationAuthority?: import("@/ai/core/contracts")
    .ControlledValidationExecutionAuthorityV1;
  readonly controlledValidationSourceAttestor?: ControlledValidationSourceAttestorV1;
}): DraftAssistanceService & Pick<
  import("@/ai/runs/service").AiRunServiceV1,
  "readRun" | "cancelRun" | "manualRetry" | "rejectDisposition"
> {
  const readers = domainReaders<PostgresJsQueryResultHKT>();
  const contextPolicy = createDraftContextPolicy(
    contextRepository(readers),
    dependencies.controlledValidationSourceAttestor,
  );
  const registry = createProductionApplicationRegistryV1({
    availabilityAuthorization: createDraftAvailabilityAuthorization(targetRepository(readers)),
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
    resolveAuthoritativeActor: resolveAuthoritativeAiActorV1,
    authoritativeActorCanPerform: authoritativeAiActorCanPerformV1,
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
