import { describe, expect, it } from "vitest";

import {
  AI_HEARTBEAT_LOCK_ATTEMPTS_V1,
  automaticRetryBackoffSecondsV1,
  heartbeatLockRetryDecisionV1,
  mayManuallyRetryFailureV1,
} from "./retry-policy";

describe("retry and heartbeat safety policy", () => {
  it("freezes exact backoff and manual retry allowlist", () => {
    expect([1, 2, 3].map(automaticRetryBackoffSecondsV1)).toEqual([30, 60, 120]);
    expect(mayManuallyRetryFailureV1("provider_auth_failed")).toBe(true);
    expect(mayManuallyRetryFailureV1("provider_quota_exceeded")).toBe(true);
    expect(mayManuallyRetryFailureV1("provider_timeout")).toBe(false);
  });

  it("permits exactly five total lock attempts before the database safety window", () => {
    const observedAt = new Date("2026-08-12T00:00:00.000Z");
    const safeExpiry = new Date("2026-08-12T00:00:30.000Z");
    for (let completed = 1; completed < AI_HEARTBEAT_LOCK_ATTEMPTS_V1; completed += 1) {
      expect(heartbeatLockRetryDecisionV1({ completedAttempts: completed, observedAt, currentLeaseExpiresAt: safeExpiry }))
        .toBe("retry");
    }
    expect(heartbeatLockRetryDecisionV1({ completedAttempts: 5, observedAt, currentLeaseExpiresAt: safeExpiry }))
      .toBe("abort");
    expect(heartbeatLockRetryDecisionV1({
      completedAttempts: 1,
      observedAt,
      currentLeaseExpiresAt: new Date("2026-08-12T00:00:11.000Z"),
    })).toBe("abort");
  });
});
