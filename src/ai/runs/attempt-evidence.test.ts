import { describe, expect, it } from "vitest";

import { aiFailure } from "@/ai/errors";
import {
  attemptResponseFingerprintV2,
  createAttemptHistoryEntryV2,
  decodeAttemptHistoryEntryV2,
  normalizeAttemptEvidenceV3,
  sanitizedAttemptEvidenceJsonV2,
} from "./attempt-evidence";

function validNormalizedEvidence() {
  const evidence = normalizeAttemptEvidenceV3({
    version: 3,
    dispatchState: "dispatched",
    protectedResult: { synthetic: true },
    error: null,
    responseStatus: "success",
    retryClass: "not_retryable",
    returnedModel: "synthetic-model-v1",
    completion: { kind: "complete" },
    usage: { inputTokens: 10, outputTokens: 5, totalTokens: 15 },
    providerHttpStatus: 200,
    providerErrorCode: null,
    providerRequestId: "req_synthetic_01",
    providerSystemFingerprint: null,
    durationMs: 10,
  });
  if (!evidence.ok) throw new Error("Valid attempt evidence fixture failed.");
  return evidence.value;
}

function validHistoryEntry() {
  const evidence = validNormalizedEvidence();
  const entry = createAttemptHistoryEntryV2({
    attempt: 1,
    outcome: "draft_ready",
    requestedProvider: "synthetic_provider",
    actualProvider: "synthetic_provider",
    requestedModel: "synthetic-model-v1",
    providerEnvelopeVersion: 1,
    providerEnvelopeHash: "a".repeat(64),
    dispatchedAt: new Date("2026-08-12T00:00:00.000Z"),
    respondedAt: new Date("2026-08-12T00:00:01.000Z"),
    attemptUpperCostMicrousd: 100,
    actualCostMicrousd: 1,
    accountedCostMicrousd: 1,
    actualCostComplete: true,
    evidence,
    candidateHash: "b".repeat(64),
    controlledIdentity: null,
  });
  if (!entry.ok) throw new Error("Valid attempt history fixture failed.");
  return entry.value;
}

describe("normalized attempt evidence V3", () => {
  it("retains every safe failure field without raw payload authority", () => {
    const failure = aiFailure("provider_rate_limited");
    if (failure.ok) throw new Error("Expected a failure.");
    const result = normalizeAttemptEvidenceV3({
      version: 3,
      dispatchState: "dispatched",
      protectedResult: null,
      error: failure.error,
      responseStatus: "rate_limited",
      retryClass: "same_provider_transient",
      returnedModel: null,
      completion: null,
      usage: null,
      providerHttpStatus: 429,
      providerErrorCode: "rate_limit",
      providerRequestId: "req_synthetic_01",
      providerSystemFingerprint: null,
      durationMs: 14,
    });
    expect(result).toMatchObject({ ok: true, value: {
      providerHttpStatus: 429,
      providerErrorCode: "rate_limit",
      providerRequestId: "req_synthetic_01",
      providerSystemFingerprint: null,
    } });
    if (!result.ok) return;
    expect(sanitizedAttemptEvidenceJsonV2(result.value)).not.toHaveProperty("rawOutput");
  });

  it("rejects unsafe identifiers, token arithmetic and invalid protected state", () => {
    const failure = aiFailure("provider_server_error");
    if (failure.ok) throw new Error("Expected a failure.");
    const base = {
      version: 3 as const,
      dispatchState: "dispatched" as const,
      protectedResult: null,
      error: failure.error,
      responseStatus: "server_error" as const,
      retryClass: "same_provider_transient" as const,
      returnedModel: null,
      completion: null,
      usage: null,
      providerHttpStatus: 500,
      providerErrorCode: null,
      providerRequestId: null,
      providerSystemFingerprint: null,
      durationMs: 1,
    };
    expect(normalizeAttemptEvidenceV3({ ...base, providerRequestId: "bad\nheader" })).toMatchObject({ ok: false });
    expect(normalizeAttemptEvidenceV3({ ...base, usage: { inputTokens: 1, outputTokens: 1, totalTokens: 3 } })).toMatchObject({ ok: false });
  });

  it("binds a stable candidate-aware response fingerprint", () => {
    const entry = {
      version: 2 as const, attempt: 1, dispatch_state: "dispatched" as const,
      outcome: "draft_ready" as const, requested_provider: "synthetic_alpha",
      actual_provider: "synthetic_alpha", requested_model: "synthetic-text-alpha-v1",
      returned_model: "synthetic-text-alpha-v1", provider_envelope_version: 1,
      provider_envelope_hash: "a".repeat(64), dispatched_at: "2026-08-12T00:00:00.000Z",
      responded_at: "2026-08-12T00:00:01.000Z", duration_ms: 1_000,
      input_tokens: 10, output_tokens: 20, total_tokens: 30,
      cache_hit_input_tokens: 3, cache_miss_input_tokens: 7,
      attempt_upper_cost_microusd: 100, actual_cost_microusd: 1,
      accounted_cost_microusd: 1, actual_cost_complete: true,
      provider_response_status: "success" as const, provider_http_status: 200,
      provider_error_code: null, provider_request_id: "req_1",
      provider_system_fingerprint: "fp_1", failure_code: null,
      controlled_validation_fixture_id: null,
      controlled_validation_fixture_hash: null,
      provider_request_identity_version: null,
      provider_request_identity_hash: null,
    };
    const first = attemptResponseFingerprintV2({ entryWithoutFingerprint: entry, candidateHash: "b".repeat(64) });
    const second = attemptResponseFingerprintV2({ entryWithoutFingerprint: entry, candidateHash: "b".repeat(64) });
    expect(first).toEqual(second);
  });

  it("uses one strict complete runtime authority for created and stored entries", () => {
    const entry = validHistoryEntry();
    expect(decodeAttemptHistoryEntryV2(entry)).toEqual({ ok: true, value: entry });
    for (const invalid of [
      { ...entry, unknown: true },
      { ...entry, attempt: 0 },
      { ...entry, provider_response_status: "arbitrary" },
      { ...entry, input_tokens: null },
      { ...entry, controlled_validation_fixture_id: "SYN-AI-ONE" },
      { ...entry, response_fingerprint: "not-a-hash" },
    ]) {
      expect(decodeAttemptHistoryEntryV2(invalid)).toMatchObject({ ok: false });
    }
  });

  it("makes the creator fail closed through the strict entry decoder", () => {
    expect(createAttemptHistoryEntryV2({
      attempt: 1,
      outcome: "draft_ready",
      requestedProvider: "bad\nprovider",
      actualProvider: "synthetic_provider",
      requestedModel: "synthetic-model-v1",
      providerEnvelopeVersion: 1,
      providerEnvelopeHash: "a".repeat(64),
      dispatchedAt: new Date("2026-08-12T00:00:00.000Z"),
      respondedAt: new Date("2026-08-12T00:00:01.000Z"),
      attemptUpperCostMicrousd: 100,
      actualCostMicrousd: 1,
      accountedCostMicrousd: 1,
      actualCostComplete: true,
      evidence: validNormalizedEvidence(),
      candidateHash: "b".repeat(64),
      controlledIdentity: null,
    })).toMatchObject({ ok: false });
  });
});
