import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { parseEnvironment } from "@/config/env";

import { createSharedRateLimiter } from "./rate-limiter-factory";
import { MemorySharedRateLimiter } from "./shared-rate-limiter";

describe("shared rate limiter factory", () => {
  it("selects memory only for the explicit local/test seam", async () => {
    const limiter = createSharedRateLimiter(parseEnvironment({ APP_ENV: "test" }));
    expect(limiter).toBeInstanceOf(MemorySharedRateLimiter);
    await limiter.close();
  });

  it("does not reinterpret a Valkey request as a memory fallback", () => {
    const environment = parseEnvironment({ APP_ENV: "test", SHARED_RATE_LIMIT_DRIVER: "valkey" });
    expect(() => createSharedRateLimiter(environment)).toThrow(/explicit memory test seam/);
  });
});
