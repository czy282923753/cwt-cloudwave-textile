import type { ReadonlyJsonObject, ReadonlyJsonValue } from "../canonical-json";
import type { AiServiceResult } from "../errors";

export type AiCapability = "text";

export interface CoreAiActorV1 {
  readonly principalId: string;
  readonly roleKey: string;
}

export interface CoreOrchestrationCommandV1 {
  readonly version: 1;
  readonly applicationClass: string;
  readonly useCase: string;
  readonly capability: AiCapability;
  readonly actor: CoreAiActorV1;
  readonly idempotencyKey?: string;
  readonly applicationPayload: unknown;
}

export interface AuthorizedAssociationSnapshot<TAssociation> {
  readonly association: TAssociation;
  readonly snapshot: ReadonlyJsonObject;
  readonly snapshotHash: string;
}

export interface ApplicationAssociationEnvelopeV1 {
  readonly kind: string;
  readonly snapshot: ReadonlyJsonObject;
  readonly snapshotHash: string;
}

export interface DurableApplicationAssociationV1 {
  readonly kind: string;
  readonly persistenceVersion: number;
  readonly value: ReadonlyJsonObject;
}

export interface ProtectedApplicationResultEnvelopeV1 {
  readonly version: 1;
  readonly resultKind: string;
  readonly dispositionKind: string;
  readonly schemaId: string;
  readonly schemaVersion: number;
  readonly policyVersion: string;
  readonly value: ReadonlyJsonObject;
  readonly canonicalJson: string;
  readonly hash: string;
}

export type PromptVariablesV1 = Readonly<
  Record<string, string | ReadonlyJsonValue>
>;

export interface SafeInputSourceReferenceV1 {
  readonly alias: string;
  readonly sourceClass: string;
  readonly sourceIdentity: ReadonlyJsonObject;
  readonly selectedFields: readonly string[];
  readonly fieldProvenance: readonly {
    readonly field: string;
    readonly provenance: "structural" | "provided" | "verified";
  }[];
}

export interface PreparedApplicationContextV1 {
  readonly version: 1;
  readonly inputSources: readonly SafeInputSourceReferenceV1[];
  readonly inputContext: ReadonlyJsonObject;
  readonly inputHash: string;
  readonly explicitInputHash: string;
  readonly requestFingerprintInput: ReadonlyJsonObject;
}

export interface PreparedRequestIdentityV1 {
  readonly idempotencyKey: string;
  readonly fingerprintVersion: 1;
  readonly fingerprint: string;
  readonly requestedByPrincipalId: string;
}

export interface PromptTupleV1 {
  readonly promptId: string;
  readonly promptVersion: number;
  readonly promptHash: string;
}

export interface ProviderEnvelopeIdentityV1 {
  readonly version: number;
  readonly hash: string;
}

export interface ResolvedModelConfigV1 {
  readonly modelConfigId: string;
  readonly modelConfigVersion: number;
  readonly resolvedConfigHash: string;
  readonly requestedProvider: string;
  readonly requestedModel: string;
  readonly parametersSnapshot: ReadonlyJsonObject;
  readonly maxInputTokens: number;
  readonly maxOutputTokens: number;
  readonly maxAttempts: number;
  readonly runCostLimitMicrousd: number;
}

export interface PreparedCoreRunV1 {
  readonly version: 1;
  readonly applicationClass: string;
  readonly useCase: string;
  readonly capability: "text";
  readonly requestIdentity: PreparedRequestIdentityV1;
  readonly association: DurableApplicationAssociationV1;
  readonly associationSnapshotHash: string;
  readonly resolvedConfig: ResolvedModelConfigV1;
  readonly promptIdentity: PromptTupleV1;
  readonly providerEnvelope: ProviderEnvelopeIdentityV1;
  readonly inputSchemaVersion: number;
  readonly outputSchemaId: string;
  readonly outputSchemaVersion: number;
  readonly policyVersion: string;
  readonly resultKind: string;
  readonly dispositionKind: string;
  readonly inputSources: readonly SafeInputSourceReferenceV1[];
  readonly inputContext: ReadonlyJsonObject;
  readonly inputHash: string;
}

export interface CoreAvailabilityV1 {
  readonly available: boolean;
  readonly manualEditorAvailable: boolean;
  readonly code: import("../errors").AiErrorCode | "available";
}

export interface CoreCommittedRunSummaryV1 {
  readonly runId: string;
  readonly applicationClass: string;
  readonly useCase: string;
  readonly status: "pending" | "processing" | "draft_ready" | "failed" | "cancelled";
  readonly queuedAt: string;
}

export type ReplayLookupResultV1 =
  | { readonly kind: "new_request" }
  | { readonly kind: "exact_replay"; readonly summary: CoreCommittedRunSummaryV1 };

export type PreparedRunCommitResultV1 =
  | { readonly kind: "inserted"; readonly summary: CoreCommittedRunSummaryV1 }
  | {
      readonly kind: "unique_loser_exact_replay";
      readonly summary: CoreCommittedRunSummaryV1;
    };

export interface AiFeatureStateReadV1 {
  readonly processEnabled: boolean;
  readonly databaseRowPresent: boolean;
  readonly databaseEnabled: boolean;
}

export interface AiModelConfigRow {
  readonly id: string;
  readonly capability: "text";
  readonly useCase: string;
  readonly provider: string;
  readonly model: string;
  readonly parametersJson: ReadonlyJsonObject;
  readonly maxInputTokens: number;
  readonly maxOutputTokens: number;
  readonly maxAttempts: number;
  readonly runCostLimitMicrousd: number;
  readonly promptId: string;
  readonly promptVersion: number;
  readonly promptHash: string;
  readonly enabled: boolean;
  readonly isDefault: boolean;
  readonly fallbackConfigId: string | null;
  readonly recordVersion: number;
  readonly createdByUserId: string;
  readonly updatedByUserId: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface AiModelConfigResolutionReadV1 {
  readonly version: 1;
  readonly applicationClass: string;
  readonly capability: "text";
  readonly useCase: string;
  readonly totalRowCount: number;
  readonly defaultRowCount: number;
  readonly enabledDefaultRowCount: number;
  readonly enabledDefaultRows: readonly AiModelConfigRow[];
}

export interface OpaqueApplicationContextStageV1 {
  readonly preparedContext: PreparedApplicationContextV1;
  buildPromptVariables(): AiServiceResult<PromptVariablesV1>;
}

export interface OpaqueAvailabilityContextStageV1
  extends OpaqueApplicationContextStageV1 {
  readFeatureState(): Promise<AiServiceResult<AiFeatureStateReadV1>>;
  readConfigResolution(): Promise<AiServiceResult<AiModelConfigResolutionReadV1>>;
}

export interface OpaqueAuthorizedAvailabilityStageV1 {
  readonly association: ApplicationAssociationEnvelopeV1;
  readonly durableAssociation: DurableApplicationAssociationV1;
  buildContext(): Promise<AiServiceResult<OpaqueAvailabilityContextStageV1>>;
}

export interface AvailabilityInvocationOperationsV1 {
  readonly version: 1;
  readonly applicationClass: string;
  readonly capability: "text";
  readonly useCase: string;
  authorizeAssociation(): Promise<AiServiceResult<OpaqueAuthorizedAvailabilityStageV1>>;
}

const opaqueApplicationInvocationBrand = Symbol("opaque-application-invocation");

export interface OpaqueAvailabilityInvocationV1
  extends AvailabilityInvocationOperationsV1 {
  readonly [opaqueApplicationInvocationBrand]: "availability";
}

export function createOpaqueAvailabilityInvocation(
  operations: AvailabilityInvocationOperationsV1,
): OpaqueAvailabilityInvocationV1 {
  return {
    ...operations,
    [opaqueApplicationInvocationBrand]: "availability",
  };
}

export interface OpaqueRequestContextStageV1
  extends OpaqueApplicationContextStageV1 {
  readonly requestIdentity: PreparedRequestIdentityV1;
  findReplay(): Promise<AiServiceResult<ReplayLookupResultV1>>;
  readFeatureState(): Promise<AiServiceResult<AiFeatureStateReadV1>>;
  readConfigResolution(): Promise<AiServiceResult<AiModelConfigResolutionReadV1>>;
  confirmResolvedConfiguration(input: {
    readonly modelConfigId: string;
    readonly expectedRecordVersion: number;
  }): Promise<AiServiceResult<AiModelConfigRow>>;
  commitPreparedRun(
    input: PreparedCoreRunV1,
  ): Promise<AiServiceResult<PreparedRunCommitResultV1>>;
}

export interface OpaqueAuthorizedRequestStageV1 {
  readonly association: ApplicationAssociationEnvelopeV1;
  readonly durableAssociation: DurableApplicationAssociationV1;
  buildContextAndFingerprint(): Promise<AiServiceResult<OpaqueRequestContextStageV1>>;
}

export interface RequestInvocationOperationsV1 {
  readonly version: 1;
  readonly applicationClass: string;
  readonly capability: "text";
  readonly useCase: string;
  authorizeAssociation(): Promise<AiServiceResult<OpaqueAuthorizedRequestStageV1>>;
}

export interface OpaqueRequestInvocationV1 extends RequestInvocationOperationsV1 {
  readonly [opaqueApplicationInvocationBrand]: "request";
}

export function createOpaqueRequestInvocation(
  operations: RequestInvocationOperationsV1,
): OpaqueRequestInvocationV1 {
  return { ...operations, [opaqueApplicationInvocationBrand]: "request" };
}

export interface OpaqueClaimedContextStageV1 {
  readonly preparedContext: PreparedApplicationContextV1;
  buildPromptVariables(): AiServiceResult<PromptVariablesV1>;
  parseAndProtect(
    rawObject: ReadonlyJsonObject,
  ): AiServiceResult<ProtectedApplicationResultEnvelopeV1>;
}

export interface OpaqueClaimedApplicationRuntimeV1 {
  readonly applicationClass: string;
  readonly capability: "text";
  readonly useCase: string;
  readonly inputSchemaVersion: number;
  readonly outputSchemaId: string;
  readonly outputSchemaVersion: number;
  readonly policyVersion: string;
  decodeClaimedAssociation(
    row: unknown,
  ): AiServiceResult<ApplicationAssociationEnvelopeV1>;
  decodeClaimedContext(
    inputContext: unknown,
  ): AiServiceResult<OpaqueClaimedContextStageV1>;
}

export interface ClaimedApplicationRuntimeRegistryV1 {
  resolve(input: {
    readonly applicationClass: string;
    readonly capability: "text";
    readonly useCase: string;
    readonly inputSchemaVersion: number;
    readonly outputSchemaVersion: number;
    readonly policyVersion: string;
  }): AiServiceResult<OpaqueClaimedApplicationRuntimeV1>;
}

export interface GenericAiOrchestratorV1 {
  inspect(invocation: OpaqueAvailabilityInvocationV1):
    Promise<AiServiceResult<CoreAvailabilityV1>>;
  request(invocation: OpaqueRequestInvocationV1):
    Promise<AiServiceResult<CoreCommittedRunSummaryV1>>;
}

export interface ExecuteClaimedTextAttemptCommand {
  readonly claimed: import("../internal/claimed-run-authority").ConstructedClaimedRunV1;
  readonly signal: AbortSignal;
}

export type AiAttemptResult<TProtected> =
  | {
      readonly kind: "protected_result";
      readonly protectedResult: TProtected;
      readonly returnedModel: string;
      readonly responseStatus: "success";
      readonly usage?: import("../providers/text-provider").NormalizedTokenUsage;
      readonly providerRequestId?: string;
      readonly durationMs: number;
    }
  | {
      readonly kind: "failure";
      readonly error: import("../errors").SafeAiError;
      readonly responseStatus: import("../providers/text-provider").NormalizedProviderResponseStatus;
      readonly retryClass: "same_provider_transient" | "not_retryable";
      readonly durationMs: number;
    };

export interface AiClaimedExecutionService {
  executeClaimedTextAttempt(
    command: ExecuteClaimedTextAttemptCommand,
  ): Promise<AiAttemptResult<ProtectedApplicationResultEnvelopeV1>>;
}
