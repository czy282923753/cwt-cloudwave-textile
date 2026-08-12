import type { ReadonlyJsonObject } from "@/ai/canonical-json";
import type { SafeAiError } from "@/ai/errors";
import type {
  NormalizedCompletionV1,
  NormalizedProviderResponseStatus,
  NormalizedTokenUsage,
} from "@/ai/providers/text-provider";

export const aiRunStatusesV1 = [
  "pending",
  "processing",
  "draft_ready",
  "failed",
  "cancelled",
] as const;

export type AiRunStatusV1 = (typeof aiRunStatusesV1)[number];
export type AiRunRetryStateV1 =
  | "none"
  | "scheduled"
  | "exhausted"
  | "not_retryable";
export type AiRunCostAccountingStateV1 = "preflight" | "reserved" | "final";

export interface AiRunSummaryReadV1 {
  readonly runId: string;
  readonly applicationClass: "draft_assistance";
  readonly useCase: string;
  readonly status: AiRunStatusV1;
  readonly retryState: AiRunRetryStateV1;
  readonly attemptCount: number;
  readonly stateVersion: number;
  readonly queuedAt: string;
}

export type LifecycleLockOutcomeV1 =
  | {
      readonly kind: "acquired";
      readonly observedAt: Date;
    }
  | {
      readonly kind: "lock_busy";
      readonly observedAt: Date;
      readonly currentLeaseExpiresAt: Date | null;
    };

export type DispatchAuthorizationOutcomeV1 =
  | {
      readonly kind: "authorized";
      readonly observedAt: Date;
      readonly dispatchedAt: Date;
      readonly leaseExpiresAt: Date;
      readonly stateVersion: number;
    }
  | {
      readonly kind: "lock_busy";
      readonly observedAt: Date;
      readonly currentLeaseExpiresAt: Date | null;
    }
  | {
      readonly kind: "lease_lost_or_unsafe";
      readonly observedAt: Date;
    }
  | {
      readonly kind: "pricing_stale";
      readonly observedAt: Date;
    };

export interface NormalizeAttemptEvidenceInputV2<TProtected> {
  readonly version: 2;
  readonly dispatchState: "not_dispatched" | "dispatched";
  readonly protectedResult: TProtected | null;
  readonly error: SafeAiError | null;
  readonly responseStatus: NormalizedProviderResponseStatus;
  readonly retryClass: "same_provider_transient" | "not_retryable";
  readonly returnedModel: string | null;
  readonly completion: NormalizedCompletionV1 | null;
  readonly usage: NormalizedTokenUsage | null;
  readonly providerHttpStatus: number | null;
  readonly providerErrorCode: string | null;
  readonly providerRequestId: string | null;
  readonly durationMs: number;
}

export interface NormalizedAttemptEvidenceV2<TProtected> {
  readonly version: 2;
  readonly dispatchState: "not_dispatched" | "dispatched";
  readonly protectedResult: TProtected | null;
  readonly error: SafeAiError | null;
  readonly responseStatus: NormalizedProviderResponseStatus;
  readonly retryClass: "same_provider_transient" | "not_retryable";
  readonly returnedModel: string | null;
  readonly completionKind:
    | "complete"
    | "length_limit"
    | "content_filter"
    | "cancelled"
    | "unknown"
    | null;
  readonly usage: NormalizedTokenUsage | null;
  readonly providerHttpStatus: number | null;
  readonly providerErrorCode: string | null;
  readonly providerRequestId: string | null;
  readonly durationMs: number;
}

export interface AttemptHistoryEntryV1 extends ReadonlyJsonObject {
  readonly version: 1;
  readonly attempt: number;
  readonly dispatch_state: "not_dispatched" | "dispatched";
  readonly outcome: "retry_scheduled" | "failed" | "draft_ready" | "discarded_cancelled";
  readonly requested_provider: string;
  readonly actual_provider: string | null;
  readonly requested_model: string;
  readonly returned_model: string | null;
  readonly provider_envelope_version: number;
  readonly provider_envelope_hash: string;
  readonly dispatched_at: string | null;
  readonly responded_at: string | null;
  readonly duration_ms: number;
  readonly input_tokens: number | null;
  readonly output_tokens: number | null;
  readonly total_tokens: number | null;
  readonly attempt_upper_cost_microusd: number;
  readonly actual_cost_microusd: number;
  readonly accounted_cost_microusd: number;
  readonly actual_cost_complete: boolean;
  readonly provider_response_status: NormalizedProviderResponseStatus;
  readonly provider_http_status: number | null;
  readonly provider_error_code: string | null;
  readonly provider_request_id: string | null;
  readonly failure_code: string | null;
  readonly response_fingerprint: string;
}

export type WorkerClaimResultV1 =
  | { readonly kind: "claimed"; readonly row: unknown }
  | { readonly kind: "recovered"; readonly runId: string }
  | { readonly kind: "idle"; readonly reason: "lock_busy" | "disabled" | "concurrency" | "budget" | "empty" };

export interface AiRunWorkerV1 {
  readonly workerId: string;
  start(): Promise<void>;
  stop(signal?: "SIGINT" | "SIGTERM"): Promise<void>;
  readonly running: boolean;
}

export interface ClaimedLeaseHandleV1 {
  readonly runId: string;
  readonly executionEnvironment: "local" | "test" | "staging" | "production";
  readonly leaseOwner: string;
  readonly leaseToken: string;
  readonly leaseExpiresAt: Date;
  readonly stateVersion: number;
}

export type HeartbeatOutcomeV1 =
  | {
      readonly kind: "renewed";
      readonly observedAt: Date;
      readonly leaseExpiresAt: Date;
      readonly stateVersion: number;
    }
  | Extract<LifecycleLockOutcomeV1, { readonly kind: "lock_busy" }>
  | { readonly kind: "lease_lost_or_unsafe"; readonly observedAt: Date };

export type SettlementOutcomeV1 =
  | {
      readonly kind: "settled";
      readonly status: "pending" | "draft_ready" | "failed";
      readonly retryState: AiRunRetryStateV1;
      readonly stateVersion: number;
    }
  | Extract<LifecycleLockOutcomeV1, { readonly kind: "lock_busy" }>
  | { readonly kind: "lease_lost_or_unsafe"; readonly observedAt: Date }
  | { readonly kind: "cancelled_fence"; readonly observedAt: Date };

export interface RunDispositionInputV1 {
  readonly runId: string;
  readonly actorUserId: string;
  readonly expectedStateVersion: number;
  readonly disposition: "rejected";
  readonly candidateHash: string;
  readonly qualityRating: number | null;
  readonly qualityLabels: readonly (
    | "factual_issue"
    | "relevance"
    | "clarity"
    | "tone"
    | "format"
    | "duplication"
    | "unsafe_claim"
  )[];
  readonly qualityComment: string | null;
}
