import { describe, expect, it } from "vitest";

import { MemoryUploadRateLimiter } from "@/uploads/rate-limit";

describe("login throttling", () => {
  it("blocks attempts after the configured per-key window limit", async () => {
    const limiter = new MemoryUploadRateLimiter(2, 60_000);
    await expect(limiter.consume("hashed-login-key", "login")).resolves.toBe(true);
    await expect(limiter.consume("hashed-login-key", "login")).resolves.toBe(true);
    await expect(limiter.consume("hashed-login-key", "login")).resolves.toBe(false);
  });
});
