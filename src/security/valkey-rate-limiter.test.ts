import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { RATE_LIMIT_LUA, RATE_LIMIT_WINDOW_MILLISECONDS, ValkeySharedRateLimiter, type ValkeyRateLimitTransport } from "./valkey-rate-limiter";

function configuration() {
  return {
    endpoint: "redis://valkey-production:6379",
    username: "cwt-production",
    password: "synthetic-password",
    keyPrefix: "cwt:production:rate:",
    clientName: "cwt-production-web",
  } as const;
}

describe("Valkey shared rate limiter", () => {
  it("uses one constant atomic INCR/PEXPIRE script and hashes raw identities", async () => {
    expect(RATE_LIMIT_LUA).toContain("redis.call('INCR', KEYS[1])");
    expect(RATE_LIMIT_LUA).toContain("redis.call('PEXPIRE', KEYS[1], ARGV[1])");
    const invoke = vi.fn<(key: string, windowMilliseconds: number) => Promise<unknown>>(async () => [1, RATE_LIMIT_WINDOW_MILLISECONDS]);
    const transport: ValkeyRateLimitTransport = { invoke, ping: async () => "PONG", close: vi.fn() };
    const limiter = new ValkeySharedRateLimiter(configuration(), async () => transport);
    await expect(limiter.consume("buyer@example.test", "login")).resolves.toEqual({ kind: "allowed", remaining: 29, retryAfterMs: 60_000 });
    const key = invoke.mock.calls[0]?.[0];
    expect(key).toMatch(/^cwt:production:rate:login:[0-9a-f]{64}$/);
    expect(key).not.toContain("buyer");
  });

  it("maps limit, malformed, timeout, OOM and transport failure to typed outcomes", async () => {
    const outcomes: readonly [unknown, string][] = [
      [[31, 10_000], "limited"],
      [[1], "unavailable"],
      [["1", 10_000], "unavailable"],
      [[1, -1], "unavailable"],
    ];
    for (const [response, kind] of outcomes) {
      const limiter = new ValkeySharedRateLimiter(configuration(), async () => ({
        invoke: async () => response,
        ping: async () => "PONG",
        close: () => undefined,
      }));
      await expect(limiter.consume("synthetic", "upload")).resolves.toMatchObject({ kind });
    }
    const unavailable = new ValkeySharedRateLimiter(configuration(), async () => { throw new Error("secret details"); });
    await expect(unavailable.consume("synthetic", "upload")).resolves.toEqual({ kind: "unavailable" });
  });

  it("readiness requires PING and the exact script canary", async () => {
    const invoke = vi.fn(async () => [1, 60_000]);
    const limiter = new ValkeySharedRateLimiter(configuration(), async () => ({ invoke, ping: async () => "PONG", close: () => undefined }));
    await expect(limiter.readiness()).resolves.toMatchObject({ kind: "allowed" });
    expect(invoke).toHaveBeenCalledOnce();
    const failed = new ValkeySharedRateLimiter(configuration(), async () => ({ invoke, ping: async () => "NO", close: () => undefined }));
    await expect(failed.readiness()).resolves.toEqual({ kind: "unavailable" });
  });
});
