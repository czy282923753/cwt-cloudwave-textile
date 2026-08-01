import { env } from "@/config/env";

export interface UploadRateLimiter {
  consume(key: string, action?: "upload" | "login" | "conversion"): Promise<boolean>;
}

interface Bucket {
  count: number;
  expiresAt: number;
}

export class MemoryUploadRateLimiter implements UploadRateLimiter {
  private readonly buckets = new Map<string, Bucket>();

  constructor(
    private readonly maximumAttempts = 12,
    private readonly windowMilliseconds = 60_000,
  ) {}

  async consume(
    key: string,
    action: "upload" | "login" | "conversion" = "upload",
  ): Promise<boolean> {
    void action;
    const now = Date.now();
    const current = this.buckets.get(key);
    if (!current || current.expiresAt <= now) {
      this.buckets.set(key, {
        count: 1,
        expiresAt: now + this.windowMilliseconds,
      });
      return true;
    }
    if (current.count >= this.maximumAttempts) return false;
    current.count += 1;
    return true;
  }
}

export class HttpUploadRateLimiter implements UploadRateLimiter {
  async consume(
    key: string,
    action: "upload" | "login" | "conversion" = "upload",
  ): Promise<boolean> {
    if (!env.UPLOAD_RATE_LIMIT_ENDPOINT) {
      throw new Error("Upload rate-limit endpoint is required.");
    }
    const response = await fetch(env.UPLOAD_RATE_LIMIT_ENDPOINT, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(env.UPLOAD_RATE_LIMIT_TOKEN
          ? { authorization: `Bearer ${env.UPLOAD_RATE_LIMIT_TOKEN}` }
          : {}),
      },
      body: JSON.stringify({ key, action }),
    });
    if (!response.ok) throw new Error("Upload rate limiter is unavailable.");
    const result = (await response.json()) as unknown;
    return (
      typeof result === "object" &&
      result !== null &&
      "allowed" in result &&
      result.allowed === true
    );
  }
}

export function createUploadRateLimiter(): UploadRateLimiter {
  return env.UPLOAD_RATE_LIMIT_DRIVER === "http"
    ? new HttpUploadRateLimiter()
    : new MemoryUploadRateLimiter();
}
