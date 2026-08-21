import type { ReadonlyJsonObject } from "@/ai/canonical-json";
import type { SafeAiError } from "@/ai/errors";
import type {
  NormalizedCompletionV1,
  NormalizedProviderResponseStatus,
  NormalizedTokenUsageV2,
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

export interface AiRunAuthorizedReadV1 extends AiRunSummaryReadV1 {
  readonly candidateHash: string | null;
  readonly failureCode: string | null;
  readonly humanDisposition: string;
  readonly qualityRating: number | null;
  readonly qualityLabels: readonly string[];
  /** Authoritative current controls, derived inside the authorized read transaction. */
  readonly cancelAvailable: boolean;
  readonly manualRetryAvailable: boolean;
  readonly rejectAvailable: boolean;
  readonly applyAvailable: boolean;
  readonly appliedTargetVersion: number | null;
  readonly appliedRevisionId: string | null;
  readonly appliedRevisionVersion: number | null;
  readonly reviewProjection: import("@/ai/applications/draft-assistance/contracts")
    .AiDraftReviewProjectionV1 | null;
}

/** Server-only evidence used to construct the authorized browser projection. */
export interface AiRunAuthorizedEvidenceV1 extends Omit<
  AiRunAuthorizedReadV1,
  "reviewProjection"
> {
  readonly targetType: string;
  readonly targetProductId: string | null;
  readonly targetContentId: string | null;
  readonly targetRevisionId: string | null;
  readonly targetLocale: string | null;
  readonly expectedTargetVersion: number;
  readonly targetSnapshotHash: string;
  readonly outputSchemaVersion: number;
  readonly policyVersion: string;
  readonly inputContext: ReadonlyJsonObject;
  readonly inputSources: readonly import("@/ai/core/contracts").SafeInputSourceReferenceV1[];
  readonly inputHash: string;
  readonly attemptHistory: readonly ReadonlyJsonObject[];
  readonly candidate: ReadonlyJsonObject | null;
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

export interface NormalizeAttemptEvidenceInputV3<TProtected> {
  readonly version: 3;
  readonly dispatchState: "not_dispatched" | "dispatched";
  readonly protectedResult: TProtected | null;
  readonly error: SafeAiError | null;
  readonly responseStatus: NormalizedProviderResponseStatus | "not_dispatched";
  readonly retryClass: "same_provider_transient" | "not_retryable";
  readonly returnedModel: string | null;
  readonly completion: NormalizedCompletionV1 | null;
  readonly usage: NormalizedTokenUsageV2 | null;
  readonly providerHttpStatus: number | null;
  readonly providerErrorCode: string | null;
  readonly providerRequestId: string | null;
  readonly providerSystemFingerprint: string | null;
  readonly durationMs: number;
}

export interface NormalizedAttemptEvidenceV3<TProtected> {
  readonly version: 3;
  readonly dispatchState: "not_dispatched" | "dispatched";
  readonly protectedResult: TProtected | null;
  readonly error: SafeAiError | null;
  readonly responseStatus: NormalizedProviderResponseStatus | "not_dispatched";
  readonly retryClass: "same_provider_transient" | "not_retryable";
  readonly returnedModel: string | null;
  readonly completionKind:
    | "complete"
    | "length_limit"
    | "content_filter"
    | "cancelled"
    | "unknown"
    | null;
  readonly usage: NormalizedTokenUsageV2 | null;
  readonly providerHttpStatus: number | null;
  readonly providerErrorCode: string | null;
  readonly providerRequestId: string | null;
  readonly providerSystemFingerprint: string | null;
  readonly durationMs: number;
}

export interface AttemptHistoryEntryV2 extends ReadonlyJsonObject {
  readonly version: 2;
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
  readonly cache_hit_input_tokens: number | null;
  readonly cache_miss_input_tokens: number | null;
  readonly attempt_upper_cost_microusd: number;
  readonly actual_cost_microusd: number;
  readonly accounted_cost_microusd: number;
  readonly actual_cost_complete: boolean;
  readonly provider_response_status: NormalizedProviderResponseStatus | "not_dispatched";
  readonly provider_http_status: number | null;
  readonly provider_error_code: string | null;
  readonly provider_request_id: string | null;
  readonly provider_system_fingerprint: string | null;
  readonly failure_code: string | null;
  readonly controlled_validation_fixture_id: string | null;
  readonly controlled_validation_fixture_hash: string | null;
  readonly provider_request_identity_version: 1 | null;
  readonly provider_request_identity_hash: string | null;
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
  join(): Promise<void>;
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
  readonly actorRole: string;
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

export interface AiCandidateApplyRouteV1 {
  readonly owner: "product" | "content";
  readonly entityId: string;
  readonly targetType: "product_draft" | "content_draft" | "editorial_revision";
  readonly revisionId: string | null;
}

export interface AiCandidateApplyCommandFingerprintV1 {
  readonly version: 1;
  readonly hash: string;
}

export type AiCandidateApplyLockOutcomeV1 =
  | {
      readonly kind: "ready";
      readonly evidence: AiRunAuthorizedEvidenceV1;
      readonly route: AiCandidateApplyRouteV1;
    }
  | {
      readonly kind: "exact_replay";
      readonly result: import("@/ai/applications/draft-assistance/contracts")
        .AppliedAiDraftCandidateV1;
    }
  | {
      readonly kind:
        | "not_found_or_unauthorized"
        | "state_conflict"
        | "transition_forbidden";
    };

export type AiCandidateApplyDispositionOutcomeV1 =
  | {
      readonly kind: "updated";
      readonly result: import("@/ai/applications/draft-assistance/contracts")
        .AppliedAiDraftCandidateV1;
    }
  | {
      readonly kind: "state_conflict" | "transition_forbidden";
    };

export type HumanLifecycleMutationOutcomeV1 =
  | {
      readonly kind: "updated";
      readonly row: {
        readonly runId: string;
        readonly targetType: string;
        readonly targetId: string;
        readonly status: AiRunStatusV1;
        readonly retryState: AiRunRetryStateV1;
        readonly stateVersion: number;
        readonly candidateHash: string | null;
        readonly humanDisposition: string;
        readonly qualityRating: number | null;
        readonly qualityLabels: readonly string[];
      };
    }
  | Extract<LifecycleLockOutcomeV1, { readonly kind: "lock_busy" }>
  | {
      readonly kind:
        | "not_found_or_unauthorized"
        | "state_conflict"
        | "transition_forbidden";
    };

export type LateAccountingOutcomeV1 =
  | { readonly kind: "enriched"; readonly stateVersion: number }
  | { readonly kind: "exact_replay"; readonly stateVersion: number }
  | Extract<LifecycleLockOutcomeV1, { readonly kind: "lock_busy" }>
  | { readonly kind: "state_conflict" };
