import { describe, expect, it } from "vitest";

import { MemorySharedRateLimiter } from "@/security/shared-rate-limiter";

describe("login throttling", () => {
  it("blocks attempts after the configured per-key window limit", async () => {
    const limiter = new MemorySharedRateLimiter(2, 60_000);
    await expect(limiter.consume("hashed-login-key", "login")).resolves.toMatchObject({ kind: "allowed" });
    await expect(limiter.consume("hashed-login-key", "login")).resolves.toMatchObject({ kind: "allowed" });
    await expect(limiter.consume("hashed-login-key", "login")).resolves.toMatchObject({ kind: "limited" });
  });
});
