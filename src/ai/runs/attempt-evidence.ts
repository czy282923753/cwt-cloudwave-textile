import { z } from "zod";

import { canonicalJsonHash, type ReadonlyJsonObject } from "@/ai/canonical-json";
import { aiFailure, aiSuccess, type AiServiceResult } from "@/ai/errors";
import type {
  AttemptHistoryEntryV2,
  NormalizeAttemptEvidenceInputV3,
  NormalizedAttemptEvidenceV3,
} from "./contracts";

const safeIdentifier = z.string().min(1).max(256)
  .refine((value) => value === value.trim() && !/[\u0000-\u001f\u007f]/u.test(value));
const model = z.string().min(1).max(128)
  .refine((value) => value === value.trim() && !/[\u0000-\u001f\u007f]/u.test(value));
const hash = /^[0-9a-f]{64}$/;
const sha256 = z.string().regex(hash);
const safeInteger = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER);
const tokenCount = z.number().int().nonnegative().max(2_147_483_647);
const timestamp = z.string().datetime({ offset: true });
const providerResponseStatus = z.enum([
  "success",
  "timeout",
  "transport_error",
  "rate_limited",
  "quota_exceeded",
  "client_error",
  "server_error",
  "safety_rejected",
  "invalid_response",
  "model_drift",
  "cancelled_no_response",
  "cancelled_late_response",
  "unknown",
  "not_dispatched",
]);
const usageSchema = z.object({
  inputTokens: z.number().int().nonnegative().max(2_147_483_647),
  outputTokens: z.number().int().nonnegative().max(2_147_483_647),
  totalTokens: z.number().int().nonnegative().max(2_147_483_647),
  cacheHitInputTokens: z.number().int().nonnegative().max(2_147_483_647).optional(),
  cacheMissInputTokens: z.number().int().nonnegative().max(2_147_483_647).optional(),
}).strict().refine((value) => value.totalTokens === value.inputTokens + value.outputTokens)
  .refine((value) => {
    const both = value.cacheHitInputTokens !== undefined &&
      value.cacheMissInputTokens !== undefined;
    const neither = value.cacheHitInputTokens === undefined &&
      value.cacheMissInputTokens === undefined;
    return (both || neither) && (!both ||
      value.cacheHitInputTokens! + value.cacheMissInputTokens! === value.inputTokens);
  });

export const attemptHistoryEntryV2Schema = z.object({
  version: z.literal(2),
  attempt: z.number().int().min(1).max(3),
  dispatch_state: z.enum(["not_dispatched", "dispatched"]),
  outcome: z.enum(["retry_scheduled", "failed", "draft_ready", "discarded_cancelled"]),
  requested_provider: safeIdentifier,
  actual_provider: safeIdentifier.nullable(),
  requested_model: model,
  returned_model: model.nullable(),
  provider_envelope_version: z.number().int().min(1).max(2_147_483_647),
  provider_envelope_hash: sha256,
  dispatched_at: timestamp.nullable(),
  responded_at: timestamp.nullable(),
  duration_ms: z.number().int().nonnegative().max(86_400_000),
  input_tokens: tokenCount.nullable(),
  output_tokens: tokenCount.nullable(),
  total_tokens: tokenCount.nullable(),
  cache_hit_input_tokens: tokenCount.nullable(),
  cache_miss_input_tokens: tokenCount.nullable(),
  attempt_upper_cost_microusd: safeInteger,
  actual_cost_microusd: safeInteger,
  accounted_cost_microusd: safeInteger,
  actual_cost_complete: z.boolean(),
  provider_response_status: providerResponseStatus,
  provider_http_status: z.number().int().min(100).max(599).nullable(),
  provider_error_code: safeIdentifier.nullable(),
  provider_request_id: safeIdentifier.nullable(),
  provider_system_fingerprint: safeIdentifier.nullable(),
  failure_code: safeIdentifier.nullable(),
  controlled_validation_fixture_id: z.string()
    .regex(/^SYN-AI-[A-Z0-9-]{1,120}$/).nullable(),
  controlled_validation_fixture_hash: sha256.nullable(),
  provider_request_identity_version: z.literal(1).nullable(),
  provider_request_identity_hash: sha256.nullable(),
  response_fingerprint: sha256,
}).strict().superRefine((entry, context) => {
  const tokens = [entry.input_tokens, entry.output_tokens, entry.total_tokens];
  const hasTokens = tokens.every((value) => value !== null);
  if (!hasTokens && tokens.some((value) => value !== null) ||
    hasTokens && entry.total_tokens !== entry.input_tokens! + entry.output_tokens!) {
    context.addIssue({ code: "custom", message: "Attempt token totals are invalid." });
  }
  const cache = [entry.cache_hit_input_tokens, entry.cache_miss_input_tokens];
  const hasCache = cache.every((value) => value !== null);
  if (!hasCache && cache.some((value) => value !== null) || hasCache &&
    (!hasTokens || entry.cache_hit_input_tokens! + entry.cache_miss_input_tokens! !==
      entry.input_tokens)) {
    context.addIssue({ code: "custom", message: "Attempt cache token totals are invalid." });
  }
  const controlled = [
    entry.controlled_validation_fixture_id,
    entry.controlled_validation_fixture_hash,
    entry.provider_request_identity_version,
    entry.provider_request_identity_hash,
  ];
  if (!controlled.every((value) => value === null) &&
    !controlled.every((value) => value !== null)) {
    context.addIssue({ code: "custom", message: "Controlled attempt identity is incomplete." });
  }
});

export function decodeAttemptHistoryEntryV2(
  input: unknown,
): AiServiceResult<AttemptHistoryEntryV2> {
  const parsed = attemptHistoryEntryV2Schema.safeParse(input);
  if (!parsed.success) return aiFailure("request_reconstruction_failed");
  const value: AttemptHistoryEntryV2 = Object.freeze(parsed.data);
  return aiSuccess(value);
}

export function normalizeAttemptEvidenceV3<TProtected>(
  input: NormalizeAttemptEvidenceInputV3<TProtected>,
): AiServiceResult<NormalizedAttemptEvidenceV3<TProtected>> {
  if (input.version !== 3 || !Number.isSafeInteger(input.durationMs) ||
    input.durationMs < 0 || input.durationMs > 86_400_000 ||
    (input.protectedResult === null) === (input.error === null) ||
    (input.protectedResult !== null && input.responseStatus !== "success") ||
    (input.protectedResult !== null && input.dispatchState !== "dispatched")) {
    return aiFailure("request_reconstruction_failed");
  }
  if (input.returnedModel !== null && !model.safeParse(input.returnedModel).success) {
    return aiFailure("model_drift");
  }
  if (input.usage !== null && !usageSchema.safeParse(input.usage).success) {
    return aiFailure("request_reconstruction_failed");
  }
  if (input.providerHttpStatus !== null &&
    (!Number.isInteger(input.providerHttpStatus) || input.providerHttpStatus < 100 ||
      input.providerHttpStatus > 599)) {
    return aiFailure("request_reconstruction_failed");
  }
  for (const value of [
    input.providerErrorCode,
    input.providerRequestId,
    input.providerSystemFingerprint,
  ]) {
    if (value !== null && !safeIdentifier.safeParse(value).success) {
      return aiFailure("request_reconstruction_failed");
    }
  }
  return aiSuccess(Object.freeze({
    version: 3 as const,
    dispatchState: input.dispatchState,
    protectedResult: input.protectedResult,
    error: input.error,
    responseStatus: input.responseStatus,
    retryClass: input.retryClass,
    returnedModel: input.returnedModel,
    completionKind: input.completion?.kind ?? null,
    usage: input.usage === null ? null : Object.freeze({ ...input.usage }),
    providerHttpStatus: input.providerHttpStatus,
    providerErrorCode: input.providerErrorCode,
    providerRequestId: input.providerRequestId,
    providerSystemFingerprint: input.providerSystemFingerprint,
    durationMs: input.durationMs,
  }));
}

export function attemptResponseFingerprintV2(input: {
  readonly entryWithoutFingerprint: Omit<AttemptHistoryEntryV2, "response_fingerprint">;
  readonly candidateHash: string | null;
}): AiServiceResult<string> {
  const result = canonicalJsonHash({
    ...input.entryWithoutFingerprint,
    candidate_hash: input.candidateHash,
  });
  return result.ok ? aiSuccess(result.value.hash) : aiFailure("canonicalization_failed");
}

export interface ControlledAttemptIdentityV1 {
  readonly fixtureId: string;
  readonly fixtureHash: string;
  readonly safeProviderRequestIdentity: ReadonlyJsonObject;
}

export function createAttemptHistoryEntryV2(input: {
  readonly attempt: number;
  readonly outcome: AttemptHistoryEntryV2["outcome"];
  readonly requestedProvider: string;
  readonly actualProvider: string | null;
  readonly requestedModel: string;
  readonly providerEnvelopeVersion: number;
  readonly providerEnvelopeHash: string;
  readonly dispatchedAt: Date | null;
  readonly respondedAt: Date | null;
  readonly attemptUpperCostMicrousd: number;
  readonly actualCostMicrousd: number;
  readonly accountedCostMicrousd: number;
  readonly actualCostComplete: boolean;
  readonly evidence: NormalizedAttemptEvidenceV3<unknown>;
  readonly candidateHash: string | null;
  readonly controlledIdentity: ControlledAttemptIdentityV1 | null;
}): AiServiceResult<AttemptHistoryEntryV2> {
  if (!Number.isInteger(input.attempt) || input.attempt < 1 || input.attempt > 3 ||
    !Number.isInteger(input.providerEnvelopeVersion) || input.providerEnvelopeVersion < 1 ||
    !hash.test(input.providerEnvelopeHash)) {
    return aiFailure("request_reconstruction_failed");
  }
  let providerRequestIdentityHash: string | null = null;
  if (input.controlledIdentity !== null) {
    if (!/^SYN-AI-[A-Z0-9-]{1,120}$/.test(input.controlledIdentity.fixtureId) ||
      !hash.test(input.controlledIdentity.fixtureHash)) {
      return aiFailure("request_reconstruction_failed");
    }
    const identity = canonicalJsonHash(input.controlledIdentity.safeProviderRequestIdentity);
    if (!identity.ok) return aiFailure("canonicalization_failed");
    providerRequestIdentityHash = identity.value.hash;
  }
  const usage = input.evidence.usage;
  const base: Omit<AttemptHistoryEntryV2, "response_fingerprint"> = {
    version: 2,
    attempt: input.attempt,
    dispatch_state: input.evidence.dispatchState,
    outcome: input.outcome,
    requested_provider: input.requestedProvider,
    actual_provider: input.actualProvider,
    requested_model: input.requestedModel,
    returned_model: input.evidence.returnedModel,
    provider_envelope_version: input.providerEnvelopeVersion,
    provider_envelope_hash: input.providerEnvelopeHash,
    dispatched_at: input.dispatchedAt?.toISOString() ?? null,
    responded_at: input.respondedAt?.toISOString() ?? null,
    duration_ms: input.evidence.durationMs,
    input_tokens: usage?.inputTokens ?? null,
    output_tokens: usage?.outputTokens ?? null,
    total_tokens: usage?.totalTokens ?? null,
    cache_hit_input_tokens: usage?.cacheHitInputTokens ?? null,
    cache_miss_input_tokens: usage?.cacheMissInputTokens ?? null,
    attempt_upper_cost_microusd: input.attemptUpperCostMicrousd,
    actual_cost_microusd: input.actualCostMicrousd,
    accounted_cost_microusd: input.accountedCostMicrousd,
    actual_cost_complete: input.actualCostComplete,
    provider_response_status: input.evidence.responseStatus,
    provider_http_status: input.evidence.providerHttpStatus,
    provider_error_code: input.evidence.providerErrorCode,
    provider_request_id: input.evidence.providerRequestId,
    provider_system_fingerprint: input.evidence.providerSystemFingerprint,
    failure_code: input.evidence.error?.code ?? null,
    controlled_validation_fixture_id: input.controlledIdentity?.fixtureId ?? null,
    controlled_validation_fixture_hash: input.controlledIdentity?.fixtureHash ?? null,
    provider_request_identity_version: input.controlledIdentity === null ? null : 1,
    provider_request_identity_hash: providerRequestIdentityHash,
  };
  const fingerprint = attemptResponseFingerprintV2({
    entryWithoutFingerprint: base,
    candidateHash: input.candidateHash,
  });
  if (!fingerprint.ok) return fingerprint;
  return decodeAttemptHistoryEntryV2({ ...base, response_fingerprint: fingerprint.value });
}

export function sanitizedAttemptEvidenceJsonV2(
  evidence: NormalizedAttemptEvidenceV3<unknown>,
): ReadonlyJsonObject {
  return Object.freeze({
    version: evidence.version,
    dispatch_state: evidence.dispatchState,
    response_status: evidence.responseStatus,
    retry_class: evidence.retryClass,
    returned_model: evidence.returnedModel,
    completion_kind: evidence.completionKind,
    usage: evidence.usage === null ? null : { ...evidence.usage },
    provider_http_status: evidence.providerHttpStatus,
    provider_error_code: evidence.providerErrorCode,
    provider_request_id: evidence.providerRequestId,
    provider_system_fingerprint: evidence.providerSystemFingerprint,
    failure_code: evidence.error?.code ?? null,
    duration_ms: evidence.durationMs,
  });
}
