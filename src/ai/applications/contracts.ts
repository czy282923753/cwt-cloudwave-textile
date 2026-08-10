import type { ReadonlyJsonObject } from "../canonical-json";
import type {
  ApplicationAssociationEnvelopeV1,
  AuthorizedAssociationSnapshot,
  CoreAiActorV1,
  DurableApplicationAssociationV1,
  OpaqueAvailabilityInvocationV1,
  OpaqueClaimedApplicationRuntimeV1,
  OpaqueRequestInvocationV1,
  PreparedApplicationContextV1,
  PromptVariablesV1,
  ProtectedApplicationResultEnvelopeV1,
} from "../core/contracts";
import type { AiServiceResult } from "../errors";

export interface ApplicationReadScope {
  readonly mode: string;
}

export interface ApplicationCommandCodec<TCommand, TAssociation> {
  readonly applicationClass: string;
  readonly useCase: string;
  parse(payload: unknown): AiServiceResult<TCommand>;
  associationFrom(command: TCommand): AiServiceResult<TAssociation>;
}

export interface ApplicationAvailabilityAuthorization<
  TCommand,
  TAssociation,
  TAvailabilityScope extends ApplicationReadScope,
> {
  readonly associationKind: string;
  authorizeAndSnapshotForAvailability(input: {
    readonly actor: CoreAiActorV1;
    readonly command: TCommand;
    readonly association: TAssociation;
    readonly scope: TAvailabilityScope;
  }): Promise<AiServiceResult<AuthorizedAssociationSnapshot<TAssociation>>>;
}

export interface ApplicationRequestAuthorization<
  TCommand,
  TAssociation,
  TRequestScope extends ApplicationReadScope,
> {
  readonly associationKind: string;
  authorizeAndSnapshotForRequest(input: {
    readonly actor: CoreAiActorV1;
    readonly command: TCommand;
    readonly association: TAssociation;
    readonly scope: TRequestScope;
  }): Promise<AiServiceResult<AuthorizedAssociationSnapshot<TAssociation>>>;
}

export interface ApplicationPersistenceCodec<TAssociation> {
  readonly persistenceSchemaId: string;
  toOpaqueEnvelope(
    snapshot: AuthorizedAssociationSnapshot<TAssociation>,
  ): AiServiceResult<ApplicationAssociationEnvelopeV1>;
  encodePrepared(
    snapshot: AuthorizedAssociationSnapshot<TAssociation>,
  ): AiServiceResult<DurableApplicationAssociationV1>;
  decodeClaimedRow(input: unknown): AiServiceResult<ApplicationAssociationEnvelopeV1>;
}

export interface ApplicationContextPolicy<
  TCommand,
  TAssociation,
  TContext,
  TCommonReadScope extends ApplicationReadScope,
> {
  readonly contextPolicyId: string;
  buildReconstructibleContext(input: {
    readonly actor: CoreAiActorV1;
    readonly command: TCommand;
    readonly association: AuthorizedAssociationSnapshot<TAssociation>;
    readonly scope: TCommonReadScope;
  }): Promise<AiServiceResult<TContext>>;
  encodePreparedContext(context: TContext): AiServiceResult<PreparedApplicationContextV1>;
  parseDurableContext(input: unknown): AiServiceResult<TContext>;
  buildPromptVariables(context: TContext): AiServiceResult<PromptVariablesV1>;
}

export interface ApplicationProtectedResultPolicy<
  TContext,
  TOutput extends ReadonlyJsonObject,
> {
  readonly outputSchemaId: string;
  readonly outputSchemaVersion: number;
  readonly resultKind: string;
  readonly dispositionKind: string;
  parseAndProtect(input: {
    readonly rawObject: ReadonlyJsonObject;
    readonly context: TContext;
  }): AiServiceResult<
    ProtectedApplicationResultEnvelopeV1 & { readonly value: TOutput }
  >;
}

export interface AvailabilityInvocationBinder<
  TCommand,
  TAssociation,
  TAvailabilityScope extends ApplicationReadScope,
> {
  bindAvailability(input: {
    readonly actor: CoreAiActorV1;
    readonly command: TCommand;
    readonly association: TAssociation;
    readonly scope: TAvailabilityScope;
  }): AiServiceResult<OpaqueAvailabilityInvocationV1>;
}

export interface RequestInvocationBinder<
  TCommand,
  TAssociation,
  TRequestScope extends ApplicationReadScope,
> {
  bindRequest(input: {
    readonly actor: CoreAiActorV1;
    readonly command: TCommand;
    readonly association: TAssociation;
    readonly scope: TRequestScope;
    readonly idempotencyKey: string;
  }): AiServiceResult<OpaqueRequestInvocationV1>;
}

export interface PreparedApplicationInvocationBinding<
  TAvailabilityScope extends ApplicationReadScope,
  TRequestScope extends ApplicationReadScope,
> {
  bindAvailability(
    scope: TAvailabilityScope,
  ): AiServiceResult<OpaqueAvailabilityInvocationV1>;
  bindRequest(input: {
    readonly scope: TRequestScope;
    readonly idempotencyKey: string;
  }): AiServiceResult<OpaqueRequestInvocationV1>;
}

export interface AiApplicationDefinition<
  TCommand,
  TAssociation,
  TContext,
  TOutput extends ReadonlyJsonObject,
  TCommonReadScope extends ApplicationReadScope,
  TAvailabilityScope extends TCommonReadScope,
  TRequestScope extends TCommonReadScope,
> {
  readonly applicationClass: string;
  readonly useCase: string;
  readonly capability: "text";
  readonly commandCodec: ApplicationCommandCodec<TCommand, TAssociation>;
  readonly availabilityAuthorization: ApplicationAvailabilityAuthorization<
    TCommand,
    TAssociation,
    TAvailabilityScope
  >;
  readonly requestAuthorization: ApplicationRequestAuthorization<
    TCommand,
    TAssociation,
    TRequestScope
  >;
  readonly availabilityBinder: AvailabilityInvocationBinder<
    TCommand,
    TAssociation,
    TAvailabilityScope
  >;
  readonly requestBinder: RequestInvocationBinder<
    TCommand,
    TAssociation,
    TRequestScope
  >;
  readonly claimedRuntime: OpaqueClaimedApplicationRuntimeV1;
  readonly persistenceCodec: ApplicationPersistenceCodec<TAssociation>;
  readonly contextPolicy: ApplicationContextPolicy<
    TCommand,
    TAssociation,
    TContext,
    TCommonReadScope
  >;
  readonly resultPolicy: ApplicationProtectedResultPolicy<TContext, TOutput>;
  readonly promptContractId: string;
  readonly inputSchemaVersion: number;
  readonly policyVersion: string;
}

type RegistryDefinitionContract<
  TCommand,
  TAssociation,
  TContext,
  TOutput extends ReadonlyJsonObject,
  TCommonReadScope extends ApplicationReadScope,
  TAvailabilityScope extends TCommonReadScope,
  TRequestScope extends TCommonReadScope,
> = AiApplicationDefinition<
  TCommand,
  TAssociation,
  TContext,
  TOutput,
  TCommonReadScope,
  TAvailabilityScope,
  TRequestScope
> extends AiApplicationDefinition<
  TCommand,
  TAssociation,
  TContext,
  TOutput,
  TCommonReadScope,
  TAvailabilityScope,
  TRequestScope
>
  ? object
  : never;

export interface TypedApplicationRegistry<
  TCommand,
  TAssociation,
  TContext,
  TOutput extends ReadonlyJsonObject,
  TCommonReadScope extends ApplicationReadScope,
  TAvailabilityScope extends TCommonReadScope,
  TRequestScope extends TCommonReadScope,
> {
  prepareInvocation(input: {
    readonly applicationClass: string;
    readonly capability: "text";
    readonly useCase: string;
    readonly actor: CoreAiActorV1;
    readonly applicationPayload: unknown;
  } & RegistryDefinitionContract<
    TCommand,
    TAssociation,
    TContext,
    TOutput,
    TCommonReadScope,
    TAvailabilityScope,
    TRequestScope
  >): AiServiceResult<
    PreparedApplicationInvocationBinding<TAvailabilityScope, TRequestScope>
  >;
}
