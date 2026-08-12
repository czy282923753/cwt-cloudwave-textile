export const aiErrorCodes = [
  "authorization_denied",
  "target_not_found",
  "target_not_editable",
  "target_scope_mismatch",
  "target_version_conflict",
  "environment_not_authorized",
  "feature_disabled",
  "feature_flag_missing",
  "integration_not_ready",
  "use_case_unknown",
  "registry_invalid",
  "config_missing",
  "config_disabled",
  "config_default_missing",
  "config_ambiguous",
  "config_repository_invalid",
  "config_invalid",
  "budget_disabled",
  "pricing_stale",
  "run_cost_limit_exceeded",
  "provider_unsupported",
  "model_unsupported",
  "parameters_invalid",
  "fallback_forbidden",
  "prompt_not_found",
  "prompt_invalid",
  "prompt_manifest_invalid",
  "prompt_bundle_invalid",
  "prompt_hash_mismatch",
  "prompt_contract_mismatch",
  "prompt_variables_missing",
  "prompt_variables_extra",
  "prompt_variable_invalid",
  "prompt_too_large",
  "context_source_forbidden",
  "context_field_forbidden",
  "context_field_ineligible",
  "context_record_unauthorized",
  "context_prohibited_data",
  "context_too_large",
  "input_token_limit_exceeded",
  "association_provenance_mismatch",
  "config_provenance_mismatch",
  "prompt_provenance_mismatch",
  "context_provenance_mismatch",
  "envelope_provenance_mismatch",
  "policy_provenance_mismatch",
  "request_reconstruction_failed",
  "provider_timeout",
  "provider_transport_error",
  "provider_rate_limited",
  "provider_quota_exceeded",
  "provider_auth_failed",
  "provider_safety_rejected",
  "provider_cancelled",
  "provider_client_error",
  "provider_server_error",
  "adapter_unexpected_failure",
  "model_drift",
  "output_empty",
  "output_truncated",
  "output_invalid_json",
  "output_schema_invalid",
  "output_policy_rejected",
  "output_too_large",
  "claimed_run_required",
  "claim_expired",
  "state_conflict",
  "idempotency_conflict",
  "canonicalization_failed",
  "internal_failure",
] as const;

export type AiErrorCode = (typeof aiErrorCodes)[number];

export type AiErrorCategory =
  | "authorization"
  | "availability"
  | "configuration"
  | "prompt"
  | "context"
  | "provenance"
  | "provider"
  | "output"
  | "conflict"
  | "internal";

export interface SafeAiError {
  readonly code: AiErrorCode;
  readonly category: AiErrorCategory;
  readonly safeMessage: string;
  readonly retryable: boolean;
  readonly manualEditorAvailable: boolean;
  readonly fieldPaths?: readonly string[];
}

export type AiServiceResult<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: SafeAiError };

const CATEGORY_BY_CODE: Readonly<Record<AiErrorCode, AiErrorCategory>> = {
  authorization_denied: "authorization",
  target_not_found: "authorization",
  target_not_editable: "authorization",
  target_scope_mismatch: "authorization",
  target_version_conflict: "conflict",
  environment_not_authorized: "availability",
  feature_disabled: "availability",
  feature_flag_missing: "availability",
  integration_not_ready: "availability",
  use_case_unknown: "configuration",
  registry_invalid: "configuration",
  config_missing: "configuration",
  config_disabled: "configuration",
  config_default_missing: "configuration",
  config_ambiguous: "configuration",
  config_repository_invalid: "configuration",
  config_invalid: "configuration",
  budget_disabled: "configuration",
  pricing_stale: "configuration",
  run_cost_limit_exceeded: "configuration",
  provider_unsupported: "configuration",
  model_unsupported: "configuration",
  parameters_invalid: "configuration",
  fallback_forbidden: "configuration",
  prompt_not_found: "prompt",
  prompt_invalid: "prompt",
  prompt_manifest_invalid: "prompt",
  prompt_bundle_invalid: "prompt",
  prompt_hash_mismatch: "prompt",
  prompt_contract_mismatch: "prompt",
  prompt_variables_missing: "prompt",
  prompt_variables_extra: "prompt",
  prompt_variable_invalid: "prompt",
  prompt_too_large: "prompt",
  context_source_forbidden: "context",
  context_field_forbidden: "context",
  context_field_ineligible: "context",
  context_record_unauthorized: "context",
  context_prohibited_data: "context",
  context_too_large: "context",
  input_token_limit_exceeded: "context",
  association_provenance_mismatch: "provenance",
  config_provenance_mismatch: "provenance",
  prompt_provenance_mismatch: "provenance",
  context_provenance_mismatch: "provenance",
  envelope_provenance_mismatch: "provenance",
  policy_provenance_mismatch: "provenance",
  request_reconstruction_failed: "provenance",
  provider_timeout: "provider",
  provider_transport_error: "provider",
  provider_rate_limited: "provider",
  provider_quota_exceeded: "provider",
  provider_auth_failed: "provider",
  provider_safety_rejected: "provider",
  provider_cancelled: "provider",
  provider_client_error: "provider",
  provider_server_error: "provider",
  adapter_unexpected_failure: "provider",
  model_drift: "provider",
  output_empty: "output",
  output_truncated: "output",
  output_invalid_json: "output",
  output_schema_invalid: "output",
  output_policy_rejected: "output",
  output_too_large: "output",
  claimed_run_required: "conflict",
  claim_expired: "conflict",
  state_conflict: "conflict",
  idempotency_conflict: "conflict",
  canonicalization_failed: "internal",
  internal_failure: "internal",
};

const MANUAL_EDITOR_CODES = new Set<AiErrorCode>([
  "environment_not_authorized",
  "feature_disabled",
  "feature_flag_missing",
  "integration_not_ready",
  "config_missing",
  "config_disabled",
  "config_default_missing",
  "config_ambiguous",
  "config_repository_invalid",
  "config_invalid",
  "budget_disabled",
  "pricing_stale",
  "run_cost_limit_exceeded",
  "provider_unsupported",
  "model_unsupported",
  "parameters_invalid",
  "fallback_forbidden",
  "prompt_not_found",
  "prompt_invalid",
  "prompt_manifest_invalid",
  "prompt_bundle_invalid",
  "prompt_hash_mismatch",
  "prompt_contract_mismatch",
]);

const RETRYABLE_CODES = new Set<AiErrorCode>([
  "provider_timeout",
  "provider_transport_error",
  "provider_rate_limited",
  "provider_server_error",
  "state_conflict",
]);

export function aiSuccess<T>(value: T): AiServiceResult<T> {
  return { ok: true, value };
}

export function aiFailure(
  code: AiErrorCode,
  options: {
    readonly safeMessage?: string;
    readonly fieldPaths?: readonly string[];
    readonly manualEditorAvailable?: boolean;
    readonly retryable?: boolean;
  } = {},
): AiServiceResult<never> {
  const safeMessage = options.safeMessage ?? "AI assistance is unavailable.";
  const retryable = options.retryable ?? RETRYABLE_CODES.has(code);
  const manualEditorAvailable =
    options.manualEditorAvailable ?? MANUAL_EDITOR_CODES.has(code);
  if (options.fieldPaths === undefined) {
    return {
      ok: false,
      error: {
        code,
        category: CATEGORY_BY_CODE[code],
        safeMessage,
        retryable,
        manualEditorAvailable,
      },
    };
  }
  return {
    ok: false,
    error: {
      code,
      category: CATEGORY_BY_CODE[code],
      safeMessage,
      retryable,
      manualEditorAvailable,
      fieldPaths: options.fieldPaths,
    },
  };
}

export function assertNever(value: never): never {
  throw new Error(`Unhandled AI contract variant: ${String(value)}`);
}
