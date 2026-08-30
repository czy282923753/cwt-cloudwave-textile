import "server-only";

import { GlideClient, NodeDiscoveryMode, Script } from "@valkey/valkey-glide";

import type { RateLimitAction, RateLimitOutcome, SharedRateLimiter } from "./shared-rate-limiter";
import { hashRateLimitIdentity } from "./shared-rate-limiter";

export const RATE_LIMIT_WINDOW_MILLISECONDS = 60_000;
export const RATE_LIMIT_MAXIMUM = 30;
export const RATE_LIMIT_SCRIPT_VERSION = "fixed-window-v1";
export const RATE_LIMIT_LUA = `-- cwt:${RATE_LIMIT_SCRIPT_VERSION}
local current = redis.call('INCR', KEYS[1])
if current == 1 then
  redis.call('PEXPIRE', KEYS[1], ARGV[1])
end
local ttl = redis.call('PTTL', KEYS[1])
return { current, ttl }
`;

export interface ValkeyRateLimitTransport {
  invoke(key: string, windowMilliseconds: number): Promise<unknown>;
  ping(): Promise<unknown>;
  close(): void;
}

export interface ValkeyRateLimiterConfiguration {
  readonly endpoint: string;
  readonly username: string;
  readonly password: string;
  readonly keyPrefix: string;
  readonly clientName: string;
}

function exactEndpoint(value: string): Readonly<{ host: string; port: number }> {
  const endpoint = new URL(value);
  if (
    endpoint.protocol !== "redis:" || endpoint.username || endpoint.password ||
    endpoint.pathname !== "" && endpoint.pathname !== "/" ||
    endpoint.search || endpoint.hash || !endpoint.hostname ||
    (endpoint.port && !/^\d+$/u.test(endpoint.port))
  ) {
    throw new Error("Valkey endpoint must be one credential-free redis origin.");
  }
  const port = endpoint.port ? Number(endpoint.port) : 6379;
  if (!Number.isInteger(port) || port < 1 || port > 65_535) throw new Error("Valkey port is invalid.");
  return Object.freeze({ host: endpoint.hostname, port });
}

export async function createGlideValkeyTransport(
  configuration: ValkeyRateLimiterConfiguration,
): Promise<ValkeyRateLimitTransport> {
  const address = exactEndpoint(configuration.endpoint);
  const script = new Script(RATE_LIMIT_LUA);
  try {
    const client = await GlideClient.createClient({
      addresses: [address],
      credentials: { username: configuration.username, password: configuration.password },
      databaseId: 0,
      requestTimeout: 250,
      inflightRequestsLimit: 128,
      clientName: configuration.clientName,
      nodeDiscoveryMode: NodeDiscoveryMode.Static,
      lazyConnect: true,
      connectionBackoff: { numberOfRetries: 1, factor: 10, exponentBase: 2, jitterPercent: 0 },
      advancedConfiguration: { connectionTimeout: 250 },
    });
    return {
      invoke: (key, windowMilliseconds) => client.invokeScript(script, {
        keys: [key],
        args: [String(windowMilliseconds)],
      }),
      ping: () => client.customCommand(["PING"]),
      close() {
        client.close();
        script.release();
      },
    };
  } catch (error) {
    script.release();
    throw error;
  }
}

function integer(value: unknown): number | null {
  if (typeof value === "number" && Number.isSafeInteger(value)) return value;
  if (typeof value === "bigint" && value <= BigInt(Number.MAX_SAFE_INTEGER)) return Number(value);
  return null;
}

export class ValkeySharedRateLimiter implements SharedRateLimiter {
  private transportPromise: Promise<ValkeyRateLimitTransport> | undefined;

  constructor(
    private readonly configuration: ValkeyRateLimiterConfiguration,
    private readonly transportFactory: (configuration: ValkeyRateLimiterConfiguration) => Promise<ValkeyRateLimitTransport> = createGlideValkeyTransport,
  ) {
    if (!/^cwt:(?:production|staging):rate:$/u.test(configuration.keyPrefix)) {
      throw new Error("Valkey key prefix is not environment isolated.");
    }
  }

  private transport(): Promise<ValkeyRateLimitTransport> {
    this.transportPromise ??= this.transportFactory(this.configuration);
    return this.transportPromise;
  }

  private async invoke(identity: string, action: RateLimitAction): Promise<RateLimitOutcome> {
    const key = `${this.configuration.keyPrefix}${action}:${hashRateLimitIdentity(identity)}`;
    try {
      const response = await (await this.transport()).invoke(key, RATE_LIMIT_WINDOW_MILLISECONDS);
      if (!Array.isArray(response) || response.length !== 2) return Object.freeze({ kind: "unavailable" });
      const count = integer(response[0]);
      const ttl = integer(response[1]);
      if (count === null || ttl === null || count < 1 || ttl < 1 || ttl > RATE_LIMIT_WINDOW_MILLISECONDS) {
        return Object.freeze({ kind: "unavailable" });
      }
      if (count > RATE_LIMIT_MAXIMUM) return Object.freeze({ kind: "limited", retryAfterMs: ttl });
      return Object.freeze({ kind: "allowed", remaining: RATE_LIMIT_MAXIMUM - count, retryAfterMs: ttl });
    } catch {
      return Object.freeze({ kind: "unavailable" });
    }
  }

  consume(identity: string, action: RateLimitAction = "upload"): Promise<RateLimitOutcome> {
    return this.invoke(identity, action);
  }

  async readiness(): Promise<RateLimitOutcome> {
    try {
      const pong = await (await this.transport()).ping();
      if (pong !== "PONG" && !(pong instanceof Uint8Array && Buffer.from(pong).toString("utf8") === "PONG")) {
        return Object.freeze({ kind: "unavailable" });
      }
      return this.invoke(`readiness:${process.pid}:${Date.now()}`, "upload");
    } catch {
      return Object.freeze({ kind: "unavailable" });
    }
  }

  async close(): Promise<void> {
    if (this.transportPromise === undefined) return;
    try {
      (await this.transportPromise).close();
    } finally {
      this.transportPromise = undefined;
    }
  }
}
