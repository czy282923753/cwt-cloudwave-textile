import { describe, expect, it } from "vitest";

import { aiFailure } from "@/ai/errors";
import {
  attemptResponseFingerprintV1,
  normalizeAttemptEvidenceV2,
  sanitizedAttemptEvidenceJsonV1,
} from "./attempt-evidence";

describe("normalized attempt evidence V2", () => {
  it("retains every safe failure field without raw payload authority", () => {
    const failure = aiFailure("provider_rate_limited");
    if (failure.ok) throw new Error("Expected a failure.");
    const result = normalizeAttemptEvidenceV2({
      version: 2,
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
      durationMs: 14,
    });
    expect(result).toMatchObject({ ok: true, value: {
      providerHttpStatus: 429,
      providerErrorCode: "rate_limit",
      providerRequestId: "req_synthetic_01",
    } });
    if (!result.ok) return;
    expect(sanitizedAttemptEvidenceJsonV1(result.value)).not.toHaveProperty("rawOutput");
  });

  it("rejects unsafe identifiers, token arithmetic and invalid protected state", () => {
    const failure = aiFailure("provider_server_error");
    if (failure.ok) throw new Error("Expected a failure.");
    const base = {
      version: 2 as const,
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
      durationMs: 1,
    };
    expect(normalizeAttemptEvidenceV2({ ...base, providerRequestId: "bad\nheader" })).toMatchObject({ ok: false });
    expect(normalizeAttemptEvidenceV2({ ...base, usage: { inputTokens: 1, outputTokens: 1, totalTokens: 3 } })).toMatchObject({ ok: false });
  });

  it("binds a stable candidate-aware response fingerprint", () => {
    const entry = {
      version: 1 as const, attempt: 1, dispatch_state: "dispatched" as const,
      outcome: "draft_ready" as const, requested_provider: "synthetic_alpha",
      actual_provider: "synthetic_alpha", requested_model: "synthetic-text-alpha-v1",
      returned_model: "synthetic-text-alpha-v1", provider_envelope_version: 1,
      provider_envelope_hash: "a".repeat(64), dispatched_at: "2026-08-12T00:00:00.000Z",
      responded_at: "2026-08-12T00:00:01.000Z", duration_ms: 1_000,
      input_tokens: 10, output_tokens: 20, total_tokens: 30,
      attempt_upper_cost_microusd: 100, actual_cost_microusd: 1,
      accounted_cost_microusd: 1, actual_cost_complete: true,
      provider_response_status: "success" as const, provider_http_status: 200,
      provider_error_code: null, provider_request_id: "req_1", failure_code: null,
    };
    const first = attemptResponseFingerprintV1({ entryWithoutFingerprint: entry, candidateHash: "b".repeat(64) });
    const second = attemptResponseFingerprintV1({ entryWithoutFingerprint: entry, candidateHash: "b".repeat(64) });
    expect(first).toEqual(second);
  });
});
