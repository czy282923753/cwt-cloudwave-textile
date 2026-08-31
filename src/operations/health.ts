export const HEALTH_CHECK_TIMEOUT_MILLISECONDS = 2_000;

export const READINESS_COMPONENTS = [
  "configuration",
  "storage",
  "database",
  "valkey",
  "local_dependencies",
] as const;

export type ReadinessComponent = (typeof READINESS_COMPONENTS)[number];
export type ReadinessCheckStatus = "pass" | "fail";

export interface ReadinessDependencies {
  readonly configuration: () => Promise<void>;
  readonly storage: () => Promise<void>;
  readonly database: () => Promise<void>;
  readonly valkey: () => Promise<void>;
  readonly localDependencies: () => Promise<void>;
}

export interface ReadinessResult {
  readonly status: "ready" | "not_ready";
  readonly checks: Readonly<Record<ReadinessComponent, ReadinessCheckStatus>>;
}

export interface ReadinessConfiguration {
  readonly APP_ENV: "local" | "test" | "staging" | "production";
  readonly DATABASE_DRIVER: "pglite" | "postgres";
  readonly STORAGE_DRIVER: "local" | "s3";
  readonly SHARED_RATE_LIMIT_DRIVER: "memory" | "valkey";
  readonly FILE_SCAN_DRIVER: "development" | "cloudmersive";
  readonly TRUSTED_PROXY_MODE: "none" | "cloudflare";
  readonly MONITORING_DRIVER: "log" | "external";
}

export function processLiveness(): Readonly<{ status: "live" }> {
  return Object.freeze({ status: "live" });
}

export function assertReadinessConfiguration(current: ReadinessConfiguration): void {
  if (current.APP_ENV !== "production" && current.APP_ENV !== "staging") return;
  if (
    current.DATABASE_DRIVER !== "postgres" ||
    current.STORAGE_DRIVER !== "local" ||
    current.SHARED_RATE_LIMIT_DRIVER !== "valkey" ||
    current.FILE_SCAN_DRIVER !== "cloudmersive" ||
    current.TRUSTED_PROXY_MODE !== "cloudflare" ||
    current.MONITORING_DRIVER !== "external"
  ) {
    throw new Error("Protected configuration is not ready.");
  }
}

async function withinDeadline(operation: () => Promise<void>, timeoutMilliseconds: number): Promise<void> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    await Promise.race([
      operation(),
      new Promise<never>((_resolve, reject) => {
        timer = setTimeout(() => reject(new Error("Health dependency timed out.")), timeoutMilliseconds);
      }),
    ]);
  } finally {
    if (timer !== undefined) clearTimeout(timer);
  }
}

export async function checkReadiness(
  dependencies: ReadinessDependencies,
  timeoutMilliseconds = HEALTH_CHECK_TIMEOUT_MILLISECONDS,
): Promise<ReadinessResult> {
  if (!Number.isSafeInteger(timeoutMilliseconds) || timeoutMilliseconds < 1 || timeoutMilliseconds > 10_000) {
    throw new Error("Readiness timeout is invalid.");
  }
  const operations: Readonly<Record<ReadinessComponent, () => Promise<void>>> = {
    configuration: dependencies.configuration,
    storage: dependencies.storage,
    database: dependencies.database,
    valkey: dependencies.valkey,
    local_dependencies: dependencies.localDependencies,
  };
  const entries = await Promise.all(READINESS_COMPONENTS.map(async (component) => {
    const status = await withinDeadline(operations[component], timeoutMilliseconds)
      .then(() => "pass" as const, () => "fail" as const);
    return [component, status] as const;
  }));
  const checks = Object.freeze(Object.fromEntries(entries)) as Readonly<Record<ReadinessComponent, ReadinessCheckStatus>>;
  return Object.freeze({
    status: Object.values(checks).every((status) => status === "pass") ? "ready" : "not_ready",
    checks,
  });
}
