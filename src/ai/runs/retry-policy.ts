import type { AiErrorCode } from "@/ai/errors";

export const AI_TEXT_CONCURRENCY_LIMIT_V1 = 2;
export const AI_CLAIM_LEASE_SECONDS_V1 = 60;
export const AI_HEARTBEAT_INTERVAL_SECONDS_V1 = 15;
export const AI_HEARTBEAT_SAFETY_SECONDS_V1 = 10;
export const AI_HEARTBEAT_LOCK_ATTEMPTS_V1 = 5;
export const AI_HEARTBEAT_LOCK_RETRY_DELAY_MS_V1 = 1_000;
export const AI_IDLE_POLL_MS_V1 = 1_000;
export const AI_GRACEFUL_SHUTDOWN_MS_V1 = 20_000;
export const AI_POST_ABORT_PERSISTENCE_GRACE_MS_V1 = 5_000;

export function automaticRetryBackoffSecondsV1(attemptCount: number): number {
  if (!Number.isInteger(attemptCount) || attemptCount < 1 || attemptCount > 3) {
    throw new RangeError("attemptCount must be an integer from 1 through 3.");
  }
  return Math.min(30 * (2 ** (attemptCount - 1)), 300);
}

export function mayAutomaticallyRetryV1(input: {
  readonly retryClass: "same_provider_transient" | "not_retryable";
  readonly attemptCount: number;
  readonly maxAttempts: number;
  readonly remainingReservationMicrousd: number;
  readonly nextAttemptUpperMicrousd: number;
}): boolean {
  return input.retryClass === "same_provider_transient" &&
    input.attemptCount < input.maxAttempts &&
    input.remainingReservationMicrousd >= input.nextAttemptUpperMicrousd;
}

export function mayManuallyRetryFailureV1(code: AiErrorCode): boolean {
  return code === "provider_auth_failed" || code === "provider_quota_exceeded";
}

export function heartbeatLockRetryDecisionV1(input: {
  readonly completedAttempts: number;
  readonly observedAt: Date;
  readonly currentLeaseExpiresAt: Date | null;
}): "retry" | "abort" {
  if (!Number.isInteger(input.completedAttempts) || input.completedAttempts < 1 ||
    input.completedAttempts >= AI_HEARTBEAT_LOCK_ATTEMPTS_V1 ||
    input.currentLeaseExpiresAt === null) return "abort";
  const nextAttemptAt = input.observedAt.getTime() + AI_HEARTBEAT_LOCK_RETRY_DELAY_MS_V1;
  const safetyBoundary = input.currentLeaseExpiresAt.getTime() -
    AI_HEARTBEAT_SAFETY_SECONDS_V1 * 1_000;
  return nextAttemptAt < safetyBoundary ? "retry" : "abort";
}
