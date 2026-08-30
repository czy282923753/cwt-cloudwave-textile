import { createHash } from "node:crypto";

export type RateLimitAction = "upload" | "login" | "conversion";

export type RateLimitOutcome =
  | Readonly<{ kind: "allowed"; remaining: number; retryAfterMs: number }>
  | Readonly<{ kind: "limited"; retryAfterMs: number }>
  | Readonly<{ kind: "unavailable" }>;

export interface SharedRateLimiter {
  consume(identity: string, action?: RateLimitAction): Promise<RateLimitOutcome>;
  readiness(): Promise<RateLimitOutcome>;
  close(): Promise<void>;
}

export function hashRateLimitIdentity(identity: string): string {
  if (identity.length === 0 || identity.length > 1_024 || /[\r\n\u0000]/u.test(identity)) {
    throw new Error("Rate-limit identity is invalid.");
  }
  return createHash("sha256").update(identity).digest("hex");
}

interface Bucket {
  count: number;
  expiresAt: number;
}

/** Local/test-only deterministic seam. Protected factories never select it. */
export class MemorySharedRateLimiter implements SharedRateLimiter {
  private readonly buckets = new Map<string, Bucket>();

  constructor(
    private readonly maximumAttempts = 30,
    private readonly windowMilliseconds = 60_000,
    private readonly now: () => number = Date.now,
  ) {}

  async consume(identity: string, action: RateLimitAction = "upload"): Promise<RateLimitOutcome> {
    const key = `${action}:${hashRateLimitIdentity(identity)}`;
    const now = this.now();
    const current = this.buckets.get(key);
    if (!current || current.expiresAt <= now) {
      this.buckets.set(key, { count: 1, expiresAt: now + this.windowMilliseconds });
      return Object.freeze({ kind: "allowed", remaining: this.maximumAttempts - 1, retryAfterMs: this.windowMilliseconds });
    }
    const retryAfterMs = Math.max(1, current.expiresAt - now);
    if (current.count >= this.maximumAttempts) return Object.freeze({ kind: "limited", retryAfterMs });
    current.count += 1;
    return Object.freeze({ kind: "allowed", remaining: this.maximumAttempts - current.count, retryAfterMs });
  }

  async readiness(): Promise<RateLimitOutcome> {
    return Object.freeze({ kind: "allowed", remaining: 1, retryAfterMs: 1 });
  }

  async close(): Promise<void> {
    this.buckets.clear();
  }
}
