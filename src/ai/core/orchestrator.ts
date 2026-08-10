import "server-only";

import type {
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
import { CWT_SERVER_AI_BOUNDARY_V1_5F4D7C2A } from "../server-bundle-marker";

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
