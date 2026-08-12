import "server-only";

import type {
  AiClaimedExecutionServiceV2,
  AiModelConfigResolutionReadV1,
  CoreAvailabilityV1,
  GenericAiOrchestratorV1,
  OpaqueAvailabilityContextStageV1,
  OpaqueAvailabilityInvocationV1,
  OpaqueRequestContextStageV1,
  OpaqueRequestInvocationV1,
  PreparedCoreRunV1,
  PromptVariablesV1,
  ProtectedApplicationResultEnvelopeV1,
} from "./contracts";
import { aiFailure, aiSuccess, type AiServiceResult } from "../errors";
import type { AiErrorCode } from "../errors";
import { CWT_SERVER_AI_BOUNDARY_V1_5F4D7C2A } from "../server-bundle-marker";
import type { PromptBundleLoaderV1 } from "../prompts/loader";
import { renderPromptV1 } from "../prompts/renderer";
import type { TextProviderRegistryV1 } from "../providers/registry";
import type {
  NormalizedCompletionV1,
  NormalizedProviderResponseStatus,
  NormalizedTokenUsageV2,
  ProviderNeutralFailureCode,
  ProviderNeutralTextRequestV1,
} from "../providers/text-provider";
import { parseOneJsonObjectV1 } from "../output/raw-json";
import { normalizeAttemptEvidenceV3 } from "../runs/attempt-evidence";
import type {
  DispatchAuthorizationOutcomeV1,
  NormalizedAttemptEvidenceV3,
} from "../runs/contracts";

void CWT_SERVER_AI_BOUNDARY_V1_5F4D7C2A;

interface PreparedConfigurationV1 {
  readonly modelConfigId: string;
  readonly modelConfigVersion: number;
  readonly preparedRun?: PreparedCoreRunV1;
}

export interface CoreReadinessDependenciesV1 {
  readonly appEnvironment: "local" | "test" | "staging" | "production";
  readonly processFeatureAiEnabled: boolean;
  readonly controlledValidationAuthority?: import("./contracts").ControlledValidationExecutionAuthorityV1;
  validateConfiguration(input: {
    readonly applicationClass: string;
    readonly capability: "text";
    readonly useCase: string;
    readonly read: AiModelConfigResolutionReadV1;
    readonly variables: PromptVariablesV1;
    readonly requestStage?: OpaqueRequestContextStageV1;
    readonly durableAssociation?: import("./contracts").DurableApplicationAssociationV1;
    readonly associationSnapshotHash?: string;
  }): Promise<AiServiceResult<PreparedConfigurationV1>>;
}

function available(): AiServiceResult<CoreAvailabilityV1> {
  return aiSuccess({ available: true, manualEditorAvailable: true, code: "available" });
}

function unavailable(result: AiServiceResult<never>): AiServiceResult<CoreAvailabilityV1> {
  if (result.ok) return aiFailure("internal_failure");
  return aiSuccess({
    available: false,
    manualEditorAvailable: result.error.manualEditorAvailable,
    code: result.error.code,
  });
}

function ordinaryEnvironmentReadiness(
  dependencies: CoreReadinessDependenciesV1,
): AiServiceResult<true> {
  if (dependencies.appEnvironment !== "local" && dependencies.appEnvironment !== "test") {
    return aiFailure("environment_not_authorized");
  }
  if (!dependencies.processFeatureAiEnabled) return aiFailure("feature_disabled");
  return aiSuccess(true);
}

async function featureReadiness(
  stage: OpaqueAvailabilityContextStageV1 | OpaqueRequestContextStageV1,
): Promise<AiServiceResult<true>> {
  const feature = await stage.readFeatureState();
  if (!feature.ok) return feature;
  if (!feature.value.databaseRowPresent) return aiFailure("feature_flag_missing");
  if (!feature.value.processEnabled || !feature.value.databaseEnabled) {
    return aiFailure("feature_disabled");
  }
  return aiSuccess(true);
}

export function createGenericAiOrchestratorV1(
  dependencies: CoreReadinessDependenciesV1,
): GenericAiOrchestratorV1 {
  return {
    async inspect(invocation: OpaqueAvailabilityInvocationV1) {
      const authorized = await invocation.authorizeAssociation();
      if (!authorized.ok) return unavailable(authorized);
      const context = await authorized.value.buildContext();
      if (!context.ok) return unavailable(context);
      const environment = ordinaryEnvironmentReadiness(dependencies);
      if (!environment.ok) return unavailable(environment);
      const feature = await featureReadiness(context.value);
      if (!feature.ok) return unavailable(feature);
      const config = await context.value.readConfigResolution();
      if (!config.ok) return unavailable(config);
      const variables = context.value.buildPromptVariables();
      if (!variables.ok) return unavailable(variables);
      const prepared = await dependencies.validateConfiguration({
        applicationClass: invocation.applicationClass,
        capability: "text",
        useCase: invocation.useCase,
        read: config.value,
        variables: variables.value,
      });
      if (!prepared.ok) return unavailable(prepared);
      return available();
    },
    async request(invocation: OpaqueRequestInvocationV1) {
      const authorized = await invocation.authorizeAssociation();
      if (!authorized.ok) return authorized;
      const context = await authorized.value.buildContextAndFingerprint();
      if (!context.ok) return context;
      const replay = await context.value.findReplay();
      if (!replay.ok) return replay;
      if (replay.value.kind === "exact_replay") return aiSuccess(replay.value.summary);
      const environment = dependencies.appEnvironment === "staging"
        ? dependencies.controlledValidationAuthority?.authorizePreConfiguration({
            environment: "staging",
            applicationClass: invocation.applicationClass,
            capability: "text",
            useCase: invocation.useCase,
            idempotencyKey: context.value.requestIdentity.idempotencyKey,
            requestedByPrincipalId: context.value.requestIdentity.requestedByPrincipalId,
            requestFingerprint: context.value.requestIdentity.fingerprint,
            inputHash: context.value.preparedContext.inputHash,
            inputSources: context.value.preparedContext.inputSources,
          }) ?? aiFailure("environment_not_authorized")
        : ordinaryEnvironmentReadiness(dependencies);
      if (!environment.ok) return environment;
      const feature = await featureReadiness(context.value);
      if (!feature.ok) return feature;
      const config = await context.value.readConfigResolution();
      if (!config.ok) return config;
      const variables = context.value.buildPromptVariables();
      if (!variables.ok) return variables;
      const prepared = await dependencies.validateConfiguration({
        applicationClass: invocation.applicationClass,
        capability: "text",
        useCase: invocation.useCase,
        read: config.value,
        variables: variables.value,
        requestStage: context.value,
        durableAssociation: authorized.value.durableAssociation,
        associationSnapshotHash: authorized.value.association.snapshotHash,
      });
      if (!prepared.ok) return prepared;
      const locked = await context.value.confirmResolvedConfiguration({
        modelConfigId: prepared.value.modelConfigId,
        expectedRecordVersion: prepared.value.modelConfigVersion,
      });
      if (!locked.ok) return locked;
      if (prepared.value.preparedRun === undefined) return aiFailure("integration_not_ready");
      if (dependencies.appEnvironment === "staging") {
        const controlled = dependencies.controlledValidationAuthority?.authorizePreparedRun({
          environment: "staging",
          preparedRun: prepared.value.preparedRun,
        }) ?? aiFailure("environment_not_authorized");
        if (!controlled.ok) return controlled;
      }
      const committed = await context.value.commitPreparedRun(prepared.value.preparedRun);
      return committed.ok ? aiSuccess(committed.value.summary) : committed;
    },
  };
}

function providerFailureCode(code: ProviderNeutralFailureCode): AiErrorCode {
  switch (code) {
    case "timeout": return "provider_timeout";
    case "transport": return "provider_transport_error";
    case "rate_limited": return "provider_rate_limited";
    case "quota_exceeded": return "provider_quota_exceeded";
    case "authentication": return "provider_auth_failed";
    case "client": return "provider_client_error";
    case "server": return "provider_server_error";
    case "empty_response": return "output_empty";
    case "invalid_response_json": return "output_invalid_json";
    case "invalid_response_schema": return "output_schema_invalid";
    case "response_too_large": return "output_too_large";
    case "unknown": return "adapter_unexpected_failure";
  }
}

function attemptFailure<TProtected>(input: {
  readonly result: AiServiceResult<never>;
  readonly responseStatus: NormalizedProviderResponseStatus | "not_dispatched";
  readonly dispatchState?: "not_dispatched" | "dispatched";
  readonly retryClass?: "same_provider_transient" | "not_retryable";
  readonly returnedModel?: string | null;
  readonly completion?: NormalizedCompletionV1 | null;
  readonly usage?: NormalizedTokenUsageV2 | null;
  readonly providerHttpStatus?: number | null;
  readonly providerErrorCode?: string | null;
  readonly providerRequestId?: string | null;
  readonly providerSystemFingerprint?: string | null;
  readonly durationMs?: number;
}): NormalizedAttemptEvidenceV3<TProtected> {
  if (input.result.ok) throw new Error("Failure result unexpectedly contained a success value.");
  const normalized = normalizeAttemptEvidenceV3<TProtected>({
    version: 3,
    dispatchState: input.dispatchState ?? "not_dispatched",
    protectedResult: null,
    error: input.result.error,
    responseStatus: input.responseStatus,
    retryClass: input.retryClass ?? "not_retryable",
    returnedModel: input.returnedModel ?? null,
    completion: input.completion ?? null,
    usage: input.usage ?? null,
    providerHttpStatus: input.providerHttpStatus ?? null,
    providerErrorCode: input.providerErrorCode ?? null,
    providerRequestId: input.providerRequestId ?? null,
    providerSystemFingerprint: input.providerSystemFingerprint ?? null,
    durationMs: input.durationMs ?? 0,
  });
  if (normalized.ok) return normalized.value;
  const failure = aiFailure("request_reconstruction_failed");
  if (failure.ok) throw new Error("Static failure construction failed.");
  const fallback = normalizeAttemptEvidenceV3<TProtected>({
    version: 3,
    dispatchState: input.dispatchState ?? "not_dispatched",
    protectedResult: null,
    error: failure.error,
    responseStatus: "unknown",
    retryClass: "not_retryable",
    returnedModel: null,
    completion: null,
    usage: null,
    providerHttpStatus: null,
    providerErrorCode: null,
    providerRequestId: null,
    providerSystemFingerprint: null,
    durationMs: 0,
  });
  if (!fallback.ok) throw new Error("Static normalized failure construction failed.");
  return fallback.value;
}

function evidenceResult<T>(
  evidence: NormalizedAttemptEvidenceV3<T>,
  dispatchAuthorization: Extract<DispatchAuthorizationOutcomeV1, { readonly kind: "authorized" }> | null,
) {
  return { kind: "attempt_evidence" as const, evidence, dispatchAuthorization };
}

export function createAiClaimedExecutionServiceV2(dependencies: {
  readonly providerRegistry: TextProviderRegistryV1;
  readonly promptLoader: PromptBundleLoaderV1;
  readonly now: () => Date;
}): AiClaimedExecutionServiceV2 {
  return {
    async executePreDispatchTextAttempt(command) {
      const claimed = command.claimed;
      if (command.signal.aborted || claimed.leaseExpiresAt <= dependencies.now()) {
        return evidenceResult(attemptFailure({
          result: aiFailure(command.signal.aborted ? "provider_cancelled" : "claim_expired"),
          responseStatus: "cancelled_no_response",
        }), null);
      }
      const provider = dependencies.providerRegistry.resolve(claimed.requestedProvider);
      if (!provider.ok) {
        return evidenceResult(attemptFailure({ result: provider, responseStatus: "unknown" }), null);
      }
      const configuration = provider.value.resolveConfiguration({
        model: claimed.requestedModel,
        parameters: claimed.parametersSnapshot,
      });
      if (!configuration.ok) {
        return evidenceResult(attemptFailure({ result: configuration, responseStatus: "unknown" }), null);
      }
      const envelope = provider.value.describeEnvelope();
      if (envelope.version !== claimed.providerEnvelopeVersion || envelope.hash !== claimed.providerEnvelopeHash) {
        return evidenceResult(attemptFailure({
          result: aiFailure("envelope_provenance_mismatch"),
          responseStatus: "unknown",
        }), null);
      }
      const prompt = dependencies.promptLoader.load({
        promptId: claimed.promptId,
        promptVersion: claimed.promptVersion,
        promptHash: claimed.promptHash,
        applicationClass: claimed.applicationClass,
        capability: "text",
        useCase: claimed.useCase,
        inputSchemaVersion: claimed.inputSchemaVersion,
        outputSchemaVersion: claimed.outputSchemaVersion,
        policyVersion: claimed.policyVersion,
      });
      if (!prompt.ok) return evidenceResult(attemptFailure({ result: prompt, responseStatus: "unknown" }), null);
      const variables = claimed.claimedContext.buildPromptVariables();
      if (!variables.ok) return evidenceResult(attemptFailure({ result: variables, responseStatus: "unknown" }), null);
      const rendered = renderPromptV1({ resource: prompt.value, variables: variables.value });
      if (!rendered.ok) return evidenceResult(attemptFailure({ result: rendered, responseStatus: "unknown" }), null);
      const request: ProviderNeutralTextRequestV1 = {
        version: 1,
        instructions: rendered.value.instructions,
        input: rendered.value.input,
        responseFormat: {
          kind: "json_object",
          schemaId: claimed.outputSchemaId,
          schemaVersion: claimed.outputSchemaVersion,
        },
        maxOutputTokens: claimed.maxOutputTokens,
      };
      const tokens = provider.value.estimateInputTokens(request);
      if (!tokens.ok) return evidenceResult(attemptFailure({ result: tokens, responseStatus: "unknown" }), null);
      if (tokens.value > claimed.maxInputTokens) {
        return evidenceResult(attemptFailure({
          result: aiFailure("input_token_limit_exceeded"),
          responseStatus: "unknown",
        }), null);
      }
      let prepared: ReturnType<typeof provider.value.prepareTextDispatch>;
      try {
        prepared = provider.value.prepareTextDispatch({
          model: claimed.requestedModel,
          parameters: configuration.value.parameters,
          request,
        });
      } catch {
        return evidenceResult(attemptFailure({
          result: aiFailure("adapter_unexpected_failure"),
          responseStatus: "not_dispatched",
        }), null);
      }
      if (!prepared.ok) {
        return evidenceResult(attemptFailure({
          result: prepared,
          responseStatus: "not_dispatched",
        }), null);
      }
      const authorization = await command.authorizeProviderDispatch();
      if (authorization.kind !== "authorized") {
        return { kind: "dispatch_unavailable", outcome: authorization };
      }
      let result: Awaited<ReturnType<typeof prepared.value.execute>>;
      try {
        result = await prepared.value.execute({ signal: command.signal });
      } catch {
        return evidenceResult(attemptFailure({
          result: aiFailure("adapter_unexpected_failure"),
          responseStatus: "unknown",
          dispatchState: "dispatched",
        }), authorization);
      }
      if (command.signal.aborted) {
        return evidenceResult(attemptFailure({
          result: aiFailure("provider_cancelled"),
          responseStatus: "cancelled_late_response",
          dispatchState: "dispatched",
          returnedModel: result.kind === "success" ? result.returnedModel : null,
          completion: result.kind === "success" ? result.completion : null,
          usage: result.kind === "success" ? result.usage ?? null : null,
          providerHttpStatus: result.kind === "failure" ? result.httpStatus ?? null : null,
          providerErrorCode: result.kind === "failure" ? result.providerErrorCode ?? null : null,
          providerRequestId: result.providerRequestId ?? null,
          providerSystemFingerprint: result.kind === "success"
            ? result.providerSystemFingerprint ?? null : null,
          durationMs: result.durationMs,
        }), authorization);
      }
      if (result.kind === "failure") {
        return evidenceResult(attemptFailure({
          result: aiFailure(providerFailureCode(result.failureCode)),
          responseStatus: result.responseStatus,
          dispatchState: "dispatched",
          retryClass: result.retryClass,
          providerHttpStatus: result.httpStatus ?? null,
          providerErrorCode: result.providerErrorCode ?? null,
          providerRequestId: result.providerRequestId ?? null,
          returnedModel: result.returnedModel ?? null,
          durationMs: result.durationMs,
        }), authorization);
      }
      const successFailure = (code: AiErrorCode, responseStatus: NormalizedProviderResponseStatus) =>
        evidenceResult<ProtectedApplicationResultEnvelopeV1>(attemptFailure({
          result: aiFailure(code),
          responseStatus,
          dispatchState: "dispatched",
          returnedModel: result.returnedModel,
          completion: result.completion,
          usage: result.usage ?? null,
          providerRequestId: result.providerRequestId ?? null,
          providerSystemFingerprint: result.providerSystemFingerprint ?? null,
          durationMs: result.durationMs,
        }), authorization);
      if (result.returnedModel !== claimed.requestedModel) return successFailure("model_drift", "model_drift");
      switch (result.completion.kind) {
        case "length_limit":
        case "unknown": return successFailure("output_truncated", "invalid_response");
        case "content_filter": return successFailure("provider_safety_rejected", "safety_rejected");
        case "cancelled": return successFailure("provider_cancelled", "cancelled_late_response");
        case "complete": break;
      }
      const raw = parseOneJsonObjectV1(result.outputText);
      if (!raw.ok) return successFailure(raw.error.code, "invalid_response");
      const protectedResult = claimed.claimedContext.parseAndProtect(raw.value);
      if (!protectedResult.ok) return successFailure(protectedResult.error.code, "invalid_response");
      const normalized = normalizeAttemptEvidenceV3({
        version: 3,
        dispatchState: "dispatched",
        protectedResult: protectedResult.value,
        error: null,
        responseStatus: "success",
        retryClass: "not_retryable",
        returnedModel: result.returnedModel,
        completion: result.completion,
        usage: result.usage ?? null,
        providerHttpStatus: null,
        providerErrorCode: null,
        providerRequestId: result.providerRequestId ?? null,
        providerSystemFingerprint: result.providerSystemFingerprint ?? null,
        durationMs: result.durationMs,
      });
      return normalized.ok
        ? evidenceResult(normalized.value, authorization)
        : successFailure(normalized.error.code, "invalid_response");
    },
  };
}
