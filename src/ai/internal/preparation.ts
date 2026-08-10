import { canonicalJsonHash, type ReadonlyJsonObject } from "@/ai/canonical-json";
import type { ProviderEnvelopeIdentityV1 } from "@/ai/core/contracts";
import { aiFailure, type AiServiceResult } from "@/ai/errors";

export interface ResolvedConfigHashFieldsV1 {
  readonly applicationClass: string;
  readonly capability: "text";
  readonly useCase: string;
  readonly modelConfigId: string;
  readonly modelConfigVersion: number;
  readonly requestedProvider: string;
  readonly requestedModel: string;
  readonly parametersSnapshot: ReadonlyJsonObject;
  readonly maxInputTokens: number;
  readonly maxOutputTokens: number;
  readonly maxAttempts: number;
  readonly runCostLimitMicrousd: number;
  readonly promptId: string;
  readonly promptVersion: number;
  readonly promptHash: string;
  readonly providerEnvelope: ProviderEnvelopeIdentityV1;
  readonly inputSchemaVersion: number;
  readonly outputSchemaVersion: number;
  readonly policyVersion: string;
}

export function resolvedConfigHashV1(
  fields: ResolvedConfigHashFieldsV1,
): AiServiceResult<{ readonly canonicalJson: string; readonly hash: string }> {
  if (
    !Number.isSafeInteger(fields.modelConfigVersion) || fields.modelConfigVersion < 1 ||
    !Number.isSafeInteger(fields.runCostLimitMicrousd) || fields.runCostLimitMicrousd < 0
  ) return aiFailure("config_invalid");
  return canonicalJsonHash({
    application_class: fields.applicationClass,
    capability: fields.capability,
    use_case: fields.useCase,
    model_config_id: fields.modelConfigId,
    model_config_version: fields.modelConfigVersion,
    requested_provider: fields.requestedProvider,
    requested_model: fields.requestedModel,
    parameters_snapshot_json: fields.parametersSnapshot,
    max_input_tokens: fields.maxInputTokens,
    max_output_tokens: fields.maxOutputTokens,
    max_attempts: fields.maxAttempts,
    run_cost_limit_microusd: fields.runCostLimitMicrousd,
    prompt_id: fields.promptId,
    prompt_version: fields.promptVersion,
    prompt_hash: fields.promptHash,
    provider_envelope_version: fields.providerEnvelope.version,
    provider_envelope_hash: fields.providerEnvelope.hash,
    input_schema_version: fields.inputSchemaVersion,
    output_schema_version: fields.outputSchemaVersion,
    policy_version: fields.policyVersion,
  });
}
