import "server-only";

import { env, type AppEnvironment } from "@/config/env";

import { MemorySharedRateLimiter, type SharedRateLimiter } from "./shared-rate-limiter";
import { ValkeySharedRateLimiter } from "./valkey-rate-limiter";

export function createSharedRateLimiter(environment: AppEnvironment = env): SharedRateLimiter {
  if (environment.APP_ENV === "local" || environment.APP_ENV === "test") {
    if (environment.SHARED_RATE_LIMIT_DRIVER !== "memory") {
      throw new Error("Local/test rate limiting requires the explicit memory test seam.");
    }
    return new MemorySharedRateLimiter();
  }
  if (environment.SHARED_RATE_LIMIT_DRIVER !== "valkey") {
    throw new Error("Protected rate limiting requires Valkey without fallback.");
  }
  return new ValkeySharedRateLimiter({
    endpoint: environment.VALKEY_ENDPOINT,
    username: environment.VALKEY_USERNAME,
    password: environment.VALKEY_PASSWORD,
    keyPrefix: environment.RATE_LIMIT_KEY_PREFIX,
    clientName: `cwt-${environment.APP_ENV}-process`,
  });
}

export const sharedRateLimiter = createSharedRateLimiter();
