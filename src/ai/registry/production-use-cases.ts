import { z } from "zod";
import type { PgQueryResultHKT } from "drizzle-orm/pg-core/session";

import type {
  AiApplicationDefinition,
  ApplicationContextPolicy,
  ApplicationPersistenceCodec,
} from "@/ai/applications/contracts";
import type {
  ReconstructibleDraftContextV1,
} from "@/ai/applications/draft-assistance/context";
import type {
  DraftAssistanceCommandV1,
  DraftDurableAssociationWithoutHashV1,
  ProductionAiUseCase,
} from "@/ai/applications/draft-assistance/contracts";
import { productionAiUseCases } from "@/ai/applications/draft-assistance/contracts";
import {
  buildAuthorizedDraftAssociationV1,
  decodeDraftTargetColumnsV1,
  prepareDraftAssociationV1,
  toDraftAssociationEnvelopeV1,
} from "@/ai/applications/draft-assistance/association";
import type {
  DraftConsistentReadScope,
  ReadOnlyDraftAvailabilityScope,
  TransactionBoundDraftEnqueueScope,
} from "@/ai/applications/draft-assistance/read-scopes";
import type {
  AvailabilityInvocationBinder,
  ApplicationAvailabilityAuthorization,
  ApplicationRequestAuthorization,
  RequestInvocationBinder,
  TypedApplicationRegistry,
} from "@/ai/applications/contracts";
import { canonicalJsonHash, type ReadonlyJsonObject } from "@/ai/canonical-json";
import {
  createOpaqueAvailabilityInvocation,
  createOpaqueRequestInvocation,
  type PreparedRequestIdentityV1,
  type OpaqueClaimedApplicationRuntimeV1,
} from "@/ai/core/contracts";
import { aiFailure, aiSuccess } from "@/ai/errors";
import type { AiFeatureGateRepository } from "@/ai/config/feature-gate-repository";
import type { AiModelConfigRepository } from "@/ai/config/model-config-repository";
import {
  draftOutputDefinitionV1,
  type DraftOutputDefinitionV1,
} from "@/ai/output/registry";
import type { ProtectedDraftCandidateV1 } from "@/ai/output/common";

import { createTypedApplicationRegistry } from "./application-registry";

const uuid = z.string().regex(
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
);
const selectorSchema = z.discriminatedUnion("sourceClass", [
  z.object({
    sourceClass: z.literal("public_company_fact"), sourceId: uuid,
    fields: z.array(z.enum(["factKey", "subject", "statement", "relationshipToCwt"])).max(20),
  }).strict(),
  z.object({
    sourceClass: z.literal("product_structured"), sourceId: uuid,
    fields: z.array(z.enum([
      "name", "primaryCategoryLabel", "additionalCategoryLabels",
      "applicationLabels", "composition", "weightGsm", "widthCm", "moqPair",
      "fabricStyle", "colorOptions", "moqNote", "customAvailable", "sampleAvailable",
    ])).max(32),
  }).strict(),
  z.object({
    sourceClass: z.literal("fabric_knowledge"), sourceId: uuid,
    fields: z.array(z.enum(["title", "excerpt", "narrativeText"])).max(3),
  }).strict(),
  z.object({
    sourceClass: z.literal("explicit_human_input"),
    origin: z.enum(["typed_brief", "operator_selected_target_text"]),
  }).strict(),
]);
const commandSchema = z.object({
  useCase: z.enum(productionAiUseCases),
  actor: z.object({
    userId: uuid,
    role: z.enum(["admin", "product_editor", "content_editor", "reviewer_publisher", "sales", "analyst"]),
  }).strict(),
  target: z.discriminatedUnion("type", [
    z.object({ type: z.literal("product_draft"), productId: uuid, locale: z.literal("en"), expectedVersion: z.number().int().min(1).max(2_147_483_647) }).strict(),
    z.object({ type: z.literal("content_draft"), contentId: uuid, locale: z.literal("en"), expectedVersion: z.number().int().min(1).max(2_147_483_647) }).strict(),
    z.object({ type: z.literal("editorial_revision"), revisionId: uuid, expectedVersion: z.number().int().min(1).max(2_147_483_647) }).strict(),
  ]),
  idempotencyKey: uuid,
  contextSelections: z.array(selectorSchema).max(32),
  explicitInput: z.string().max(16_384).optional(),
}).strict();

export interface DraftRegistryDependenciesV1<
  TQueryResult extends PgQueryResultHKT,
> {
  readonly availabilityAuthorization: ApplicationAvailabilityAuthorization<
    DraftAssistanceCommandV1,
    DraftDurableAssociationWithoutHashV1,
    ReadOnlyDraftAvailabilityScope<TQueryResult>
  >;
  readonly requestAuthorization: ApplicationRequestAuthorization<
    DraftAssistanceCommandV1,
    DraftDurableAssociationWithoutHashV1,
    TransactionBoundDraftEnqueueScope<TQueryResult>
  >;
  readonly contextPolicy: ApplicationContextPolicy<
    DraftAssistanceCommandV1,
    DraftDurableAssociationWithoutHashV1,
    ReconstructibleDraftContextV1,
    DraftConsistentReadScope<TQueryResult>
  >;
  readonly featureRepository: AiFeatureGateRepository;
  readonly configRepository: AiModelConfigRepository;
}

function persistenceValue(
  association: DraftDurableAssociationWithoutHashV1,
): ReadonlyJsonObject {
  switch (association.targetType) {
    case "product_draft": return {
      targetType: "product_draft",
      targetProductId: association.targetProductId,
      targetLocale: "en",
      expectedTargetVersion: association.expectedTargetVersion,
    };
    case "content_draft": return {
      targetType: "content_draft",
      targetContentId: association.targetContentId,
      targetLocale: "en",
      expectedTargetVersion: association.expectedTargetVersion,
    };
    case "editorial_revision": return {
      targetType: "editorial_revision",
      targetRevisionId: association.targetRevisionId,
      expectedTargetVersion: association.expectedTargetVersion,
    };
  }
}

function record(input: unknown): Record<string, unknown> | undefined {
  if (typeof input !== "object" || input === null || Array.isArray(input)) return undefined;
  return Object.fromEntries(Object.entries(input));
}

const persistenceCodec: ApplicationPersistenceCodec<DraftDurableAssociationWithoutHashV1> = {
  persistenceSchemaId: "draft-target-columns.v1",
  toOpaqueEnvelope(snapshot) {
    const checked = buildAuthorizedDraftAssociationV1(snapshot.association);
    if (!checked.ok || checked.value.snapshotHash !== snapshot.snapshotHash) {
      return aiFailure("association_provenance_mismatch");
    }
    return toDraftAssociationEnvelopeV1(checked.value);
  },
  encodePrepared(snapshot) {
    const checked = buildAuthorizedDraftAssociationV1(snapshot.association);
    if (!checked.ok || checked.value.snapshotHash !== snapshot.snapshotHash) {
      return aiFailure("association_provenance_mismatch");
    }
    return aiSuccess({
      kind: "draft_target.v1",
      persistenceVersion: 1,
      value: persistenceValue(snapshot.association),
    });
  },
  decodeClaimedRow(input) {
    const row = record(input);
    if (row === undefined) return aiFailure("association_provenance_mismatch");
    const decoded = decodeDraftTargetColumnsV1({
      targetType: row.targetType,
      targetProductId: row.targetProductId,
      targetContentId: row.targetContentId,
      targetRevisionId: row.targetRevisionId,
      targetLocale: row.targetLocale,
      expectedTargetVersion: row.expectedTargetVersion,
      targetSnapshotHash: row.targetSnapshotHash,
    });
    if (!decoded.ok) return decoded;
    const authorized = buildAuthorizedDraftAssociationV1(decoded.value);
    if (!authorized.ok) return authorized;
    return toDraftAssociationEnvelopeV1(authorized.value);
  },
};

export function createDraftAvailabilityBinder<
  TQueryResult extends PgQueryResultHKT,
>(dependencies: DraftRegistryDependenciesV1<TQueryResult>): AvailabilityInvocationBinder<
  DraftAssistanceCommandV1,
  DraftDurableAssociationWithoutHashV1,
  ReadOnlyDraftAvailabilityScope<TQueryResult>
> {
  return {
    bindAvailability(input) {
      return aiSuccess(createOpaqueAvailabilityInvocation({
        version: 1,
        applicationClass: "draft_assistance",
        capability: "text",
        useCase: input.command.useCase,
        async authorizeAssociation() {
          const authorized = await dependencies.availabilityAuthorization
            .authorizeAndSnapshotForAvailability(input);
          if (!authorized.ok) return authorized;
          const envelope = dependencies.contextPolicy;
          const associationEnvelope = persistenceCodec.toOpaqueEnvelope(authorized.value);
          if (!associationEnvelope.ok) return associationEnvelope;
          const durable = persistenceCodec.encodePrepared(authorized.value);
          if (!durable.ok) return durable;
          return aiSuccess({
            association: associationEnvelope.value,
            durableAssociation: durable.value,
            async buildContext() {
              const context = await envelope.buildReconstructibleContext({
                actor: input.actor,
                command: input.command,
                association: authorized.value,
                scope: input.scope,
              });
              if (!context.ok) return context;
              const prepared = envelope.encodePreparedContext(context.value);
              if (!prepared.ok) return prepared;
              return aiSuccess({
                preparedContext: prepared.value,
                buildPromptVariables: () => envelope.buildPromptVariables(context.value),
                readFeatureState: () => dependencies.featureRepository.readAiFeatureState(input.scope),
                readConfigResolution: () => dependencies.configRepository.readResolutionState(
                  input.scope,
                  { applicationClass: "draft_assistance", capability: "text", useCase: input.command.useCase },
                ),
              });
            },
          });
        },
      }));
    },
  };
}

export function createDraftRequestBinder<
  TQueryResult extends PgQueryResultHKT,
>(dependencies: DraftRegistryDependenciesV1<TQueryResult>): RequestInvocationBinder<
  DraftAssistanceCommandV1,
  DraftDurableAssociationWithoutHashV1,
  TransactionBoundDraftEnqueueScope<TQueryResult>
> {
  return {
    bindRequest(input) {
      return aiSuccess(createOpaqueRequestInvocation({
        version: 1,
        applicationClass: "draft_assistance",
        capability: "text",
        useCase: input.command.useCase,
        async authorizeAssociation() {
          const authorized = await dependencies.requestAuthorization
            .authorizeAndSnapshotForRequest(input);
          if (!authorized.ok) return authorized;
          const associationEnvelope = persistenceCodec.toOpaqueEnvelope(authorized.value);
          if (!associationEnvelope.ok) return associationEnvelope;
          const durable = persistenceCodec.encodePrepared(authorized.value);
          if (!durable.ok) return durable;
          return aiSuccess({
            association: associationEnvelope.value,
            durableAssociation: durable.value,
            async buildContextAndFingerprint() {
              const context = await dependencies.contextPolicy.buildReconstructibleContext({
                actor: input.actor,
                command: input.command,
                association: authorized.value,
                scope: input.scope,
              });
              if (!context.ok) return context;
              const prepared = dependencies.contextPolicy.encodePreparedContext(context.value);
              if (!prepared.ok) return prepared;
              const fingerprint = canonicalJsonHash({
                version: 1,
                requested_by_principal_id: input.actor.principalId,
                application_class: "draft_assistance",
                capability: "text",
                use_case: input.command.useCase,
                association: durable.value.value,
                association_snapshot_hash: authorized.value.snapshotHash,
                context: prepared.value.requestFingerprintInput,
              });
              if (!fingerprint.ok) return aiFailure("canonicalization_failed");
              const requestIdentity: PreparedRequestIdentityV1 = {
                idempotencyKey: input.idempotencyKey,
                fingerprintVersion: 1,
                fingerprint: fingerprint.value.hash,
                requestedByPrincipalId: input.actor.principalId,
              };
              return aiSuccess({
                preparedContext: prepared.value,
                requestIdentity,
                buildPromptVariables: () => dependencies.contextPolicy.buildPromptVariables(context.value),
                findReplay: () => input.scope.findReplay({
                  idempotencyKey: input.idempotencyKey,
                  requestedByPrincipalId: input.actor.principalId,
                  association: durable.value,
                  fingerprintVersion: 1,
                  fingerprint: fingerprint.value.hash,
                }),
                readFeatureState: () => dependencies.featureRepository.readAiFeatureState(input.scope),
                readConfigResolution: () => dependencies.configRepository.readResolutionState(
                  input.scope,
                  { applicationClass: "draft_assistance", capability: "text", useCase: input.command.useCase },
                ),
                confirmResolvedConfiguration: (configuration) =>
                  input.scope.lockSelectedConfigForNewRequest(configuration),
                commitPreparedRun: (preparedRun) =>
                  input.scope.insertPreparedWithRequiredAudit(preparedRun),
              });
            },
          });
        },
      }));
    },
  };
}

function claimedRuntime(
  useCase: ProductionAiUseCase,
  output: DraftOutputDefinitionV1,
  contextPolicy: DraftRegistryDependenciesV1<PgQueryResultHKT>["contextPolicy"],
): OpaqueClaimedApplicationRuntimeV1 {
  return {
    applicationClass: "draft_assistance",
    capability: "text",
    useCase,
    inputSchemaVersion: 1,
    outputSchemaId: output.schemaId,
    outputSchemaVersion: 1,
    policyVersion: output.policyVersion,
    decodeClaimedAssociation: (row) => persistenceCodec.decodeClaimedRow(row),
    decodeClaimedContext(input) {
      const context = contextPolicy.parseDurableContext(input);
      if (!context.ok || context.value.useCase !== useCase) {
        return aiFailure("context_provenance_mismatch");
      }
      const prepared = contextPolicy.encodePreparedContext(context.value);
      if (!prepared.ok) return prepared;
      return aiSuccess({
        preparedContext: prepared.value,
        buildPromptVariables: () => contextPolicy.buildPromptVariables(context.value),
        parseAndProtect: (rawObject) => output.policy.parseAndProtect({ rawObject, context: context.value }),
      });
    },
  };
}

type DraftDefinitionV1<TQueryResult extends PgQueryResultHKT> = AiApplicationDefinition<
  DraftAssistanceCommandV1,
  DraftDurableAssociationWithoutHashV1,
  ReconstructibleDraftContextV1,
  ProtectedDraftCandidateV1,
  DraftConsistentReadScope<TQueryResult>,
  ReadOnlyDraftAvailabilityScope<TQueryResult>,
  TransactionBoundDraftEnqueueScope<TQueryResult>
>;

export function createProductionApplicationRegistryV1<
  TQueryResult extends PgQueryResultHKT,
>(dependencies: DraftRegistryDependenciesV1<TQueryResult>): TypedApplicationRegistry<
  DraftAssistanceCommandV1,
  DraftDurableAssociationWithoutHashV1,
  ReconstructibleDraftContextV1,
  ProtectedDraftCandidateV1,
  DraftConsistentReadScope<TQueryResult>,
  ReadOnlyDraftAvailabilityScope<TQueryResult>,
  TransactionBoundDraftEnqueueScope<TQueryResult>
> {
  const availabilityBinder = createDraftAvailabilityBinder(dependencies);
  const requestBinder = createDraftRequestBinder(dependencies);
  const definitions: DraftDefinitionV1<TQueryResult>[] = [];
  for (const useCase of productionAiUseCases) {
    const output = draftOutputDefinitionV1(useCase);
    if (output === undefined) throw new Error("Draft output definition is missing.");
    definitions.push({
      applicationClass: "draft_assistance",
      useCase,
      capability: "text",
      commandCodec: {
        applicationClass: "draft_assistance",
        useCase,
        parse(payload) {
          const parsed = commandSchema.safeParse(payload);
          if (!parsed.success) return aiFailure("target_scope_mismatch");
          if (parsed.data.useCase !== useCase) return aiFailure("use_case_unknown");
          const command: DraftAssistanceCommandV1 =
            parsed.data.explicitInput === undefined
              ? {
                  useCase: parsed.data.useCase,
                  actor: parsed.data.actor,
                  target: parsed.data.target,
                  idempotencyKey: parsed.data.idempotencyKey,
                  contextSelections: parsed.data.contextSelections,
                }
              : {
                  useCase: parsed.data.useCase,
                  actor: parsed.data.actor,
                  target: parsed.data.target,
                  idempotencyKey: parsed.data.idempotencyKey,
                  contextSelections: parsed.data.contextSelections,
                  explicitInput: parsed.data.explicitInput,
                };
          return aiSuccess(command);
        },
        associationFrom(command) {
          return prepareDraftAssociationV1(command.target);
        },
      },
      availabilityAuthorization: dependencies.availabilityAuthorization,
      requestAuthorization: dependencies.requestAuthorization,
      availabilityBinder,
      requestBinder,
      claimedRuntime: claimedRuntime(useCase, output, dependencies.contextPolicy),
      persistenceCodec,
      contextPolicy: dependencies.contextPolicy,
      resultPolicy: output.policy,
      promptContractId: useCase.replaceAll("_", "-"),
      inputSchemaVersion: 1,
      policyVersion: output.policyVersion,
    });
  }
  const registry = createTypedApplicationRegistry(definitions);
  if (!registry.ok) throw new Error("Production application registry is invalid.");
  return registry.value;
}

export const productionApplicationKeysV1 = Object.freeze(
  productionAiUseCases.map((useCase) =>
    Object.freeze({ applicationClass: "draft_assistance", capability: "text", useCase })),
);
