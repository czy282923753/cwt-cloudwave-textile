import type { ReadonlyJsonObject } from "@/ai/canonical-json";
import type {
  AiApplicationDefinition,
  ApplicationReadScope,
  PreparedApplicationInvocationBinding,
  TypedApplicationRegistry,
} from "@/ai/applications/contracts";
import type { ClaimedApplicationRuntimeRegistryV1 } from "@/ai/core/contracts";
import { aiFailure, aiSuccess, type AiServiceResult } from "@/ai/errors";

function sameKey(
  left: { readonly applicationClass: string; readonly capability: "text"; readonly useCase: string },
  right: { readonly applicationClass: string; readonly capability: "text"; readonly useCase: string },
): boolean {
  return left.applicationClass === right.applicationClass &&
    left.capability === right.capability && left.useCase === right.useCase;
}

export function createTypedApplicationRegistry<
  TCommand,
  TAssociation,
  TContext,
  TOutput extends ReadonlyJsonObject,
  TCommonReadScope extends ApplicationReadScope,
  TAvailabilityScope extends TCommonReadScope,
  TRequestScope extends TCommonReadScope,
>(
  definitions: readonly AiApplicationDefinition<
    TCommand,
    TAssociation,
    TContext,
    TOutput,
    TCommonReadScope,
    TAvailabilityScope,
    TRequestScope
  >[],
): AiServiceResult<TypedApplicationRegistry<
  TCommand,
  TAssociation,
  TContext,
  TOutput,
  TCommonReadScope,
  TAvailabilityScope,
  TRequestScope
>> {
  for (const [index, definition] of definitions.entries()) {
    if (
      definition.capability !== "text" ||
      definition.applicationClass !== definition.commandCodec.applicationClass ||
      definition.useCase !== definition.commandCodec.useCase ||
      definition.availabilityAuthorization.associationKind !==
        definition.requestAuthorization.associationKind ||
      definition.inputSchemaVersion < 1 ||
      definition.resultPolicy.outputSchemaVersion < 1 ||
      definition.policyVersion.length === 0
    ) return aiFailure("registry_invalid");
    if (definitions.slice(index + 1).some((other) => sameKey(definition, other))) {
      return aiFailure("registry_invalid");
    }
  }

  return aiSuccess({
    prepareInvocation(input): AiServiceResult<PreparedApplicationInvocationBinding<
      TAvailabilityScope,
      TRequestScope
    >> {
      const definition = definitions.find((candidate) => sameKey(candidate, input));
      if (definition === undefined) return aiFailure("use_case_unknown");
      const command = definition.commandCodec.parse(input.applicationPayload);
      if (!command.ok) return command;
      const association = definition.commandCodec.associationFrom(command.value);
      if (!association.ok) return association;
      return aiSuccess({
        bindAvailability(scope) {
          return definition.availabilityBinder.bindAvailability({
            actor: input.actor,
            command: command.value,
            association: association.value,
            scope,
          });
        },
        bindRequest(request) {
          return definition.requestBinder.bindRequest({
            actor: input.actor,
            command: command.value,
            association: association.value,
            scope: request.scope,
            idempotencyKey: request.idempotencyKey,
          });
        },
      });
    },
  });
}

export function createClaimedApplicationRuntimeRegistryV1<
  TCommand,
  TAssociation,
  TContext,
  TOutput extends ReadonlyJsonObject,
  TCommonReadScope extends ApplicationReadScope,
  TAvailabilityScope extends TCommonReadScope,
  TRequestScope extends TCommonReadScope,
>(definitions: readonly AiApplicationDefinition<
  TCommand,
  TAssociation,
  TContext,
  TOutput,
  TCommonReadScope,
  TAvailabilityScope,
  TRequestScope
>[]): AiServiceResult<ClaimedApplicationRuntimeRegistryV1> {
  const checked = createTypedApplicationRegistry(definitions);
  if (!checked.ok) return checked;
  return aiSuccess({
    resolve(input) {
      const definition = definitions.find((candidate) =>
        sameKey(candidate, input) &&
        candidate.inputSchemaVersion === input.inputSchemaVersion &&
        candidate.resultPolicy.outputSchemaVersion === input.outputSchemaVersion &&
        candidate.policyVersion === input.policyVersion
      );
      return definition === undefined
        ? aiFailure("registry_invalid")
        : aiSuccess(definition.claimedRuntime);
    },
  });
}
