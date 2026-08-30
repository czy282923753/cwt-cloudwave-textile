import { describe, expect, it } from "vitest";

import { hashRateLimitIdentity, MemorySharedRateLimiter } from "./shared-rate-limiter";

describe("provider-neutral shared rate limiter", () => {
  it("preserves the exact 30 per 60 second action boundary", async () => {
    let now = 1_000;
    const limiter = new MemorySharedRateLimiter(30, 60_000, () => now);
    for (let attempt = 1; attempt <= 30; attempt += 1) {
      await expect(limiter.consume("synthetic-client", "upload")).resolves.toMatchObject({ kind: "allowed", remaining: 30 - attempt });
    }
    await expect(limiter.consume("synthetic-client", "upload")).resolves.toMatchObject({ kind: "limited" });
    now += 60_000;
    await expect(limiter.consume("synthetic-client", "upload")).resolves.toMatchObject({ kind: "allowed", remaining: 29 });
  });

  it("isolates actions and hashes raw identity material", async () => {
    const limiter = new MemorySharedRateLimiter(1);
    await expect(limiter.consume("buyer@example.test", "login")).resolves.toMatchObject({ kind: "allowed" });
    await expect(limiter.consume("buyer@example.test", "conversion")).resolves.toMatchObject({ kind: "allowed" });
    expect(hashRateLimitIdentity("buyer@example.test")).toMatch(/^[0-9a-f]{64}$/);
    expect(hashRateLimitIdentity("buyer@example.test")).not.toContain("buyer");
  });
});
