import { z } from "zod";

import type { AiApplicationDefinition } from "@/ai/applications/contracts";
import { canonicalJsonHash } from "@/ai/canonical-json";
import {
  createOpaqueAvailabilityInvocation,
  createOpaqueRequestInvocation,
  type PreparedRequestIdentityV1,
} from "@/ai/core/contracts";
import { aiFailure, aiSuccess } from "@/ai/errors";

import {
  authorizeSyntheticAssociationV1,
  parseSyntheticAssociationV1,
  syntheticAssociationEnvelopeV1,
  syntheticDurableAssociationV1,
  type SyntheticAssociationV1,
} from "./association";
import {
  buildSyntheticPromptVariablesV1,
  createSyntheticContextV1,
  encodeSyntheticContextV1,
  parseSyntheticContextV1,
  type SyntheticContextV1,
} from "./context";
import {
  protectSyntheticOutputV1,
  type SyntheticProtectedValueV1,
} from "./output";
import {
  observeSyntheticCase,
  type SyntheticCaseTransactionScope,
  type SyntheticObservationReadScope,
} from "./read-scopes";

export interface SyntheticCommandV1 {
  readonly association: SyntheticAssociationV1;
}

const commandSchema = z.object({
  association: z.object({
    kind: z.literal("synthetic_case_association"),
    suiteKey: z.string().regex(/^[a-z][a-z0-9_]{0,31}$/),
    sampleOrdinal: z.number().int().min(1).max(100),
    epochLabel: z.string().min(1).max(32),
  }).strict(),
}).strict();

export type SyntheticDefinitionV1 = AiApplicationDefinition<
  SyntheticCommandV1,
  SyntheticAssociationV1,
  SyntheticContextV1,
  SyntheticProtectedValueV1,
  SyntheticObservationReadScope | SyntheticCaseTransactionScope,
  SyntheticObservationReadScope,
  SyntheticCaseTransactionScope
>;

export function createSyntheticDefinitionV1(): SyntheticDefinitionV1 {
  const contextPolicy: SyntheticDefinitionV1["contextPolicy"] = {
    contextPolicyId: "synthetic-context.v1",
    async buildReconstructibleContext(input) {
      const observed = await observeSyntheticCase(input.scope, {
        suiteKey: input.association.association.suiteKey,
        sampleOrdinal: input.association.association.sampleOrdinal,
      });
      if (!observed.ok) return observed;
      return aiSuccess(createSyntheticContextV1({
        association: input.association.association,
        observation: observed.value,
      }));
    },
    encodePreparedContext: encodeSyntheticContextV1,
    parseDurableContext: parseSyntheticContextV1,
    buildPromptVariables: buildSyntheticPromptVariablesV1,
  };
  const definition: SyntheticDefinitionV1 = {
    applicationClass: "synthetic_test_application",
    useCase: "synthetic_extensibility_probe",
    capability: "text",
    commandCodec: {
      applicationClass: "synthetic_test_application",
      useCase: "synthetic_extensibility_probe",
      parse(payload) {
        const parsed = commandSchema.safeParse(payload);
        return parsed.success ? aiSuccess(parsed.data) : aiFailure("target_scope_mismatch");
      },
      associationFrom(command) {
        return parseSyntheticAssociationV1(command.association);
      },
    },
    availabilityAuthorization: {
      associationKind: "synthetic_case_association",
      async authorizeAndSnapshotForAvailability(input) {
        const observed = await observeSyntheticCase(input.scope, input.association);
        if (!observed.ok || observed.value.epochLabel !== input.association.epochLabel) {
          return aiFailure("authorization_denied");
        }
        return authorizeSyntheticAssociationV1(input.association);
      },
    },
    requestAuthorization: {
      associationKind: "synthetic_case_association",
      async authorizeAndSnapshotForRequest(input) {
        const reserved = await input.scope.authorizeReserveAndSnapshotCase(input.association);
        if (!reserved.ok || reserved.value.epochLabel !== input.association.epochLabel) {
          return aiFailure("authorization_denied");
        }
        return authorizeSyntheticAssociationV1(input.association);
      },
    },
    availabilityBinder: {
      bindAvailability(input) {
        return aiSuccess(createOpaqueAvailabilityInvocation({
          version: 1,
          applicationClass: "synthetic_test_application",
          capability: "text",
          useCase: "synthetic_extensibility_probe",
          async authorizeAssociation() {
            const authorized = await definition.availabilityAuthorization
              .authorizeAndSnapshotForAvailability(input);
            if (!authorized.ok) return authorized;
            const envelope = syntheticAssociationEnvelopeV1(authorized.value);
            if (!envelope.ok) return envelope;
            const durable = syntheticDurableAssociationV1(authorized.value);
            if (!durable.ok) return durable;
            return aiSuccess({
              association: envelope.value,
              durableAssociation: durable.value,
              async buildContext() {
                const context = await contextPolicy.buildReconstructibleContext({
                  actor: input.actor,
                  command: input.command,
                  association: authorized.value,
                  scope: input.scope,
                });
                if (!context.ok) return context;
                const prepared = encodeSyntheticContextV1(context.value);
                if (!prepared.ok) return prepared;
                return aiSuccess({
                  preparedContext: prepared.value,
                  buildPromptVariables: () => buildSyntheticPromptVariablesV1(context.value),
                  async readFeatureState() { return aiFailure("integration_not_ready"); },
                  async readConfigResolution() { return aiFailure("integration_not_ready"); },
                });
              },
            });
          },
        }));
      },
    },
    requestBinder: {
      bindRequest(input) {
        return aiSuccess(createOpaqueRequestInvocation({
          version: 1,
          applicationClass: "synthetic_test_application",
          capability: "text",
          useCase: "synthetic_extensibility_probe",
          async authorizeAssociation() {
            const authorized = await definition.requestAuthorization
              .authorizeAndSnapshotForRequest(input);
            if (!authorized.ok) return authorized;
            const envelope = syntheticAssociationEnvelopeV1(authorized.value);
            if (!envelope.ok) return envelope;
            const durable = syntheticDurableAssociationV1(authorized.value);
            if (!durable.ok) return durable;
            return aiSuccess({
              association: envelope.value,
              durableAssociation: durable.value,
              async buildContextAndFingerprint() {
                const context = await contextPolicy.buildReconstructibleContext({
                  actor: input.actor,
                  command: input.command,
                  association: authorized.value,
                  scope: input.scope,
                });
                if (!context.ok) return context;
                const prepared = encodeSyntheticContextV1(context.value);
                if (!prepared.ok) return prepared;
                const fingerprint = canonicalJsonHash({
                  association: durable.value.value,
                  idempotencyKey: input.idempotencyKey,
                  principalId: input.actor.principalId,
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
                  buildPromptVariables: () => buildSyntheticPromptVariablesV1(context.value),
                  async findReplay() { return aiFailure("integration_not_ready"); },
                  async readFeatureState() { return aiFailure("integration_not_ready"); },
                  async readConfigResolution() { return aiFailure("integration_not_ready"); },
                  async confirmResolvedConfiguration() { return aiFailure("integration_not_ready"); },
                  async commitPreparedRun() { return aiFailure("integration_not_ready"); },
                });
              },
            });
          },
        }));
      },
    },
    claimedRuntime: {
      applicationClass: "synthetic_test_application",
      capability: "text",
      useCase: "synthetic_extensibility_probe",
      inputSchemaVersion: 1,
      outputSchemaId: "cwt.synthetic-review-packet.v1",
      outputSchemaVersion: 1,
      policyVersion: "synthetic-probe-policy-v1",
      decodeClaimedAssociation(input) {
        const association = parseSyntheticAssociationV1(input);
        if (!association.ok) return association;
        const authorized = authorizeSyntheticAssociationV1(association.value);
        return authorized.ok
          ? syntheticAssociationEnvelopeV1(authorized.value)
          : authorized;
      },
      decodeClaimedContext(input) {
        const context = parseSyntheticContextV1(input);
        if (!context.ok) return context;
        const prepared = encodeSyntheticContextV1(context.value);
        if (!prepared.ok) return prepared;
        return aiSuccess({
          preparedContext: prepared.value,
          buildPromptVariables: () => buildSyntheticPromptVariablesV1(context.value),
          parseAndProtect: protectSyntheticOutputV1,
        });
      },
    },
    persistenceCodec: {
      persistenceSchemaId: "synthetic-ephemeral.v1",
      toOpaqueEnvelope: syntheticAssociationEnvelopeV1,
      encodePrepared: syntheticDurableAssociationV1,
      decodeClaimedRow(input) {
        const association = parseSyntheticAssociationV1(input);
        if (!association.ok) return association;
        const authorized = authorizeSyntheticAssociationV1(association.value);
        return authorized.ok
          ? syntheticAssociationEnvelopeV1(authorized.value)
          : authorized;
      },
    },
    contextPolicy,
    resultPolicy: {
      outputSchemaId: "cwt.synthetic-review-packet.v1",
      outputSchemaVersion: 1,
      resultKind: "synthetic_review_packet",
      dispositionKind: "synthetic_probe_verdict",
      parseAndProtect(input) { return protectSyntheticOutputV1(input.rawObject); },
    },
    promptContractId: "synthetic-extensibility-probe",
    inputSchemaVersion: 1,
    policyVersion: "synthetic-probe-policy-v1",
  };
  return definition;
}
