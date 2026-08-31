export type MonitoringEnvironment = "local" | "test" | "staging" | "production";
export type MonitoringSeverity = "info" | "warning" | "error";

export interface MonitoringTransport {
  send(event: MonitoringEvent): Promise<void>;
}

export interface MonitoringEvent {
  readonly schemaVersion: 1;
  readonly environment: MonitoringEnvironment;
  readonly release: string;
  readonly severity: MonitoringSeverity;
  readonly code: string;
  readonly attributes: Readonly<Record<string, string | number | boolean>>;
}

export interface MonitoringReporter {
  report(input: MonitoringReportInput): Promise<"delivered" | "disabled" | "unavailable">;
}

export interface MonitoringReportInput {
  readonly severity: MonitoringSeverity;
  readonly code: string;
  readonly attributes?: Readonly<Record<string, unknown>>;
}

const RELEASE_PATTERN = /^[0-9a-f]{40}$/u;
const CODE_PATTERN = /^[a-z][a-z0-9_.-]{0,63}$/u;
const SAFE_STRING_PATTERN = /^[a-z0-9_.:-]{1,64}$/u;
const SAFE_ATTRIBUTE_KEYS = new Set([
  "component",
  "outcome",
  "count",
  "duration_ms",
  "threshold",
  "consecutive_failures",
]);

export function scrubMonitoringAttributes(
  input: Readonly<Record<string, unknown>> = {},
): Readonly<Record<string, string | number | boolean>> {
  const output: Record<string, string | number | boolean> = {};
  for (const [key, value] of Object.entries(input)) {
    if (!SAFE_ATTRIBUTE_KEYS.has(key)) continue;
    if (typeof value === "boolean") output[key] = value;
    else if (typeof value === "number" && Number.isFinite(value) && Math.abs(value) <= Number.MAX_SAFE_INTEGER) output[key] = value;
    else if (typeof value === "string" && SAFE_STRING_PATTERN.test(value)) output[key] = value;
  }
  return Object.freeze(output);
}

export function createMonitoringReporter(input: {
  readonly mode: "disabled" | "external";
  readonly environment: MonitoringEnvironment;
  readonly release: string;
  readonly transport?: MonitoringTransport;
}): MonitoringReporter {
  if (!RELEASE_PATTERN.test(input.release)) throw new Error("Monitoring release identity is invalid.");
  return Object.freeze({
    async report(candidate: MonitoringReportInput) {
      if (!CODE_PATTERN.test(candidate.code)) return "unavailable";
      if (input.mode === "disabled") return "disabled";
      if (!input.transport) return "unavailable";
      const event: MonitoringEvent = Object.freeze({
        schemaVersion: 1,
        environment: input.environment,
        release: input.release,
        severity: candidate.severity,
        code: candidate.code,
        attributes: scrubMonitoringAttributes(candidate.attributes),
      });
      try {
        await input.transport.send(event);
        return "delivered";
      } catch {
        return "unavailable";
      }
    },
  });
}
