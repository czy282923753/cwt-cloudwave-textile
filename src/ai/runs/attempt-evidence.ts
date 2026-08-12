import { z } from "zod";

import { canonicalJsonHash, type ReadonlyJsonObject } from "@/ai/canonical-json";
import { aiFailure, aiSuccess, type AiServiceResult } from "@/ai/errors";
import type {
  AttemptHistoryEntryV1,
  NormalizeAttemptEvidenceInputV2,
  NormalizedAttemptEvidenceV2,
} from "./contracts";

const safeIdentifier = z.string().min(1).max(256)
  .refine((value) => value === value.trim() && !/[\u0000-\u001f\u007f]/u.test(value));
const model = z.string().min(1).max(128)
  .refine((value) => value === value.trim() && !/[\u0000-\u001f\u007f]/u.test(value));
const usageSchema = z.object({
  inputTokens: z.number().int().nonnegative().max(2_147_483_647),
  outputTokens: z.number().int().nonnegative().max(2_147_483_647),
  totalTokens: z.number().int().nonnegative().max(2_147_483_647),
}).strict().refine((value) => value.totalTokens === value.inputTokens + value.outputTokens);

export function normalizeAttemptEvidenceV2<TProtected>(
  input: NormalizeAttemptEvidenceInputV2<TProtected>,
): AiServiceResult<NormalizedAttemptEvidenceV2<TProtected>> {
  if (input.version !== 2 || !Number.isSafeInteger(input.durationMs) ||
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
  for (const value of [input.providerErrorCode, input.providerRequestId]) {
    if (value !== null && !safeIdentifier.safeParse(value).success) {
      return aiFailure("request_reconstruction_failed");
    }
  }
  return aiSuccess(Object.freeze({
    version: 2 as const,
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
    durationMs: input.durationMs,
  }));
}

export function attemptResponseFingerprintV1(input: {
  readonly entryWithoutFingerprint: Omit<AttemptHistoryEntryV1, "response_fingerprint">;
  readonly candidateHash: string | null;
}): AiServiceResult<string> {
  const hash = canonicalJsonHash({
    ...input.entryWithoutFingerprint,
    candidate_hash: input.candidateHash,
  });
  return hash.ok ? aiSuccess(hash.value.hash) : aiFailure("canonicalization_failed");
}

export function createAttemptHistoryEntryV1(input: {
  readonly attempt: number;
  readonly outcome: AttemptHistoryEntryV1["outcome"];
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
  readonly evidence: NormalizedAttemptEvidenceV2<unknown>;
  readonly candidateHash: string | null;
}): AiServiceResult<AttemptHistoryEntryV1> {
  if (!Number.isInteger(input.attempt) || input.attempt < 1 || input.attempt > 3 ||
    !Number.isInteger(input.providerEnvelopeVersion) || input.providerEnvelopeVersion < 1 ||
    !/^[0-9a-f]{64}$/.test(input.providerEnvelopeHash)) {
    return aiFailure("request_reconstruction_failed");
  }
  const usage = input.evidence.usage;
  const base: Omit<AttemptHistoryEntryV1, "response_fingerprint"> = {
    version: 1,
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
    attempt_upper_cost_microusd: input.attemptUpperCostMicrousd,
    actual_cost_microusd: input.actualCostMicrousd,
    accounted_cost_microusd: input.accountedCostMicrousd,
    actual_cost_complete: input.actualCostComplete,
    provider_response_status: input.evidence.responseStatus,
    provider_http_status: input.evidence.providerHttpStatus,
    provider_error_code: input.evidence.providerErrorCode,
    provider_request_id: input.evidence.providerRequestId,
    failure_code: input.evidence.error?.code ?? null,
  };
  const fingerprint = attemptResponseFingerprintV1({
    entryWithoutFingerprint: base,
    candidateHash: input.candidateHash,
  });
  if (!fingerprint.ok) return fingerprint;
  return aiSuccess(Object.freeze({ ...base, response_fingerprint: fingerprint.value }) as AttemptHistoryEntryV1);
}

export function sanitizedAttemptEvidenceJsonV1(
  evidence: NormalizedAttemptEvidenceV2<unknown>,
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
    failure_code: evidence.error?.code ?? null,
    duration_ms: evidence.durationMs,
  });
}
