import "server-only";

import type {
  AiAttemptResult,
  AiClaimedExecutionService,
  AiModelConfigResolutionReadV1,
  CoreAvailabilityV1,
  GenericAiOrchestratorV1,
  OpaqueAvailabilityContextStageV1,
  OpaqueAvailabilityInvocationV1,
  OpaqueRequestContextStageV1,
  OpaqueRequestInvocationV1,
  PreparedCoreRunV1,
  PromptVariablesV1,
} from "./contracts";
import { aiFailure, aiSuccess, type AiServiceResult } from "../errors";
import type { AiErrorCode } from "../errors";
import { CWT_SERVER_AI_BOUNDARY_V1_5F4D7C2A } from "../server-bundle-marker";
import type { PromptBundleLoaderV1 } from "../prompts/loader";
import { renderPromptV1 } from "../prompts/renderer";
import type { TextProviderRegistryV1 } from "../providers/registry";
import type {
  NormalizedProviderResponseStatus,
  ProviderNeutralTextRequestV1,
  ProviderNeutralFailureCode,
} from "../providers/text-provider";
import { parseOneJsonObjectV1 } from "../output/raw-json";

void CWT_SERVER_AI_BOUNDARY_V1_5F4D7C2A;

interface PreparedConfigurationV1 {
  readonly modelConfigId: string;
  readonly modelConfigVersion: number;
  readonly preparedRun?: PreparedCoreRunV1;
}

export interface CoreReadinessDependenciesV1 {
  readonly durableEnqueueAvailable: boolean;
  readonly appEnvironment: "local" | "test" | "staging" | "production";
  readonly processFeatureAiEnabled: boolean;
  validateConfiguration(input: {
    readonly applicationClass: string;
    readonly capability: "text";
    readonly useCase: string;
    readonly read: AiModelConfigResolutionReadV1;
    readonly variables: PromptVariablesV1;
    readonly requestStage?: OpaqueRequestContextStageV1;
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

function environmentReadiness(
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
      if (!dependencies.durableEnqueueAvailable) {
        return unavailable(aiFailure("integration_not_ready"));
      }
      const environment = environmentReadiness(dependencies);
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
      if (!dependencies.durableEnqueueAvailable) return aiFailure("integration_not_ready");
      const environment = environmentReadiness(dependencies);
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
      });
      if (!prepared.ok) return prepared;
      const locked = await context.value.confirmResolvedConfiguration({
        modelConfigId: prepared.value.modelConfigId,
        expectedRecordVersion: prepared.value.modelConfigVersion,
      });
      if (!locked.ok) return locked;
      if (prepared.value.preparedRun === undefined) return aiFailure("integration_not_ready");
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
    case "unknown": return "adapter_unexpected_failure";
  }
}

function attemptFailure(input: {
  readonly result: AiServiceResult<never>;
  readonly responseStatus: NormalizedProviderResponseStatus;
  readonly retryClass?: "same_provider_transient" | "not_retryable";
  readonly durationMs?: number;
}): AiAttemptResult<never> {
  if (input.result.ok) {
    throw new Error("Failure result unexpectedly contained a success value.");
  }
  return {
    kind: "failure",
    error: input.result.error,
    responseStatus: input.responseStatus,
    retryClass: input.retryClass ?? "not_retryable",
    durationMs: input.durationMs ?? 0,
  };
}

export function createAiClaimedExecutionServiceV1(dependencies: {
  readonly providerRegistry: TextProviderRegistryV1;
  readonly promptLoader: PromptBundleLoaderV1;
  readonly now: () => Date;
}): AiClaimedExecutionService {
  return {
    async executeClaimedTextAttempt(command) {
      const claimed = command.claimed;
      if (command.signal.aborted || claimed.leaseExpiresAt <= dependencies.now()) {
        return attemptFailure({
          result: aiFailure(command.signal.aborted ? "provider_cancelled" : "claim_expired"),
          responseStatus: "cancelled_no_response",
        });
      }
      const provider = dependencies.providerRegistry.resolve(claimed.requestedProvider);
      if (!provider.ok) return attemptFailure({ result: provider, responseStatus: "unknown" });
      const configuration = provider.value.resolveConfiguration({
        model: claimed.requestedModel,
        parameters: claimed.parametersSnapshot,
      });
      if (!configuration.ok) return attemptFailure({ result: configuration, responseStatus: "unknown" });
      const envelope = provider.value.describeEnvelope();
      if (envelope.version !== claimed.providerEnvelopeVersion || envelope.hash !== claimed.providerEnvelopeHash) {
        return attemptFailure({ result: aiFailure("envelope_provenance_mismatch"), responseStatus: "unknown" });
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
      if (!prompt.ok) return attemptFailure({ result: prompt, responseStatus: "unknown" });
      const variables = claimed.claimedContext.buildPromptVariables();
      if (!variables.ok) return attemptFailure({ result: variables, responseStatus: "unknown" });
      const rendered = renderPromptV1({ resource: prompt.value, variables: variables.value });
      if (!rendered.ok) return attemptFailure({ result: rendered, responseStatus: "unknown" });
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
      if (!tokens.ok) return attemptFailure({ result: tokens, responseStatus: "unknown" });
      if (tokens.value > claimed.maxInputTokens) {
        return attemptFailure({ result: aiFailure("input_token_limit_exceeded"), responseStatus: "unknown" });
      }
      let result: Awaited<ReturnType<typeof provider.value.generateText>>;
      try {
        result = await provider.value.generateText({
          model: claimed.requestedModel,
          parameters: configuration.value.parameters,
          request,
          signal: command.signal,
        });
      } catch {
        return attemptFailure({ result: aiFailure("adapter_unexpected_failure"), responseStatus: "unknown" });
      }
      if (command.signal.aborted || claimed.leaseExpiresAt <= dependencies.now()) {
        return attemptFailure({
          result: aiFailure(command.signal.aborted ? "provider_cancelled" : "claim_expired"),
          responseStatus: "cancelled_late_response",
          durationMs: result.durationMs,
        });
      }
      if (result.kind === "failure") {
        return attemptFailure({
          result: aiFailure(providerFailureCode(result.failureCode)),
          responseStatus: result.responseStatus,
          retryClass: result.retryClass,
          durationMs: result.durationMs,
        });
      }
      if (result.returnedModel !== claimed.requestedModel) {
        return attemptFailure({ result: aiFailure("model_drift"), responseStatus: "model_drift", durationMs: result.durationMs });
      }
      switch (result.completion.kind) {
        case "length_limit":
        case "unknown":
          return attemptFailure({ result: aiFailure("output_truncated"), responseStatus: "invalid_response", durationMs: result.durationMs });
        case "content_filter":
          return attemptFailure({ result: aiFailure("provider_safety_rejected"), responseStatus: "safety_rejected", durationMs: result.durationMs });
        case "cancelled":
          return attemptFailure({ result: aiFailure("provider_cancelled"), responseStatus: "cancelled_late_response", durationMs: result.durationMs });
        case "complete": break;
      }
      const raw = parseOneJsonObjectV1(result.outputText);
      if (!raw.ok) return attemptFailure({ result: raw, responseStatus: "invalid_response", durationMs: result.durationMs });
      const protectedResult = claimed.claimedContext.parseAndProtect(raw.value);
      if (!protectedResult.ok) return attemptFailure({ result: protectedResult, responseStatus: "invalid_response", durationMs: result.durationMs });
      const base: {
        readonly kind: "protected_result";
        readonly protectedResult: typeof protectedResult.value;
        readonly returnedModel: string;
        readonly responseStatus: "success";
        readonly durationMs: number;
      } = {
        kind: "protected_result",
        protectedResult: protectedResult.value,
        returnedModel: result.returnedModel,
        responseStatus: "success",
        durationMs: result.durationMs,
      };
      const requestId = result.providerRequestId;
      const usage = result.usage;
      if (usage === undefined && requestId === undefined) return base;
      if (usage === undefined && requestId !== undefined) return { ...base, providerRequestId: requestId };
      if (requestId === undefined && usage !== undefined) return { ...base, usage };
      if (usage === undefined || requestId === undefined) return base;
      return { ...base, usage, providerRequestId: requestId };
    },
  };
}
