export const OUTBOX_BACKLOG_LIMIT_MILLISECONDS = 30 * 60 * 1_000;
export const BACKUP_COMPLETION_LIMIT_MILLISECONDS = 26 * 60 * 60 * 1_000;

export interface DatabaseWorkState {
  readonly outboxBacklog: number;
  readonly outboxRepeatedFailures: number;
  readonly outboxDead: number;
  readonly oldestOutboxCreatedAt: Date | null;
  readonly workerDead: number;
}

export type BackupCompletionStatus = "healthy" | "missing" | "stale" | "invalid" | "not_required";

export interface WorkHealthResult {
  readonly status: "healthy" | "unhealthy";
  readonly outbox: "healthy" | "backlog" | "failed" | "dead";
  readonly worker: "healthy" | "dead";
  readonly backup: BackupCompletionStatus;
  readonly counts: Readonly<{
    outboxBacklog: number;
    outboxRepeatedFailures: number;
    outboxDead: number;
    workerDead: number;
  }>;
  readonly oldestBacklogExceeded: boolean;
}

export function backupCompletionPath(environment: "production" | "staging"): string {
  return `/srv/cwt/backups/postgresql/${environment}/latest-complete.json`;
}

export async function probeBackupCompletion(input: {
  readonly environment: "local" | "test" | "staging" | "production";
  readonly now?: Date;
  readonly readText: (path: string) => Promise<string>;
}): Promise<BackupCompletionStatus> {
  if (input.environment === "local" || input.environment === "test") return "not_required";
  let raw: string;
  try {
    raw = await input.readText(backupCompletionPath(input.environment));
  } catch {
    return "missing";
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return "invalid";
    const record = parsed as Record<string, unknown>;
    if (
      JSON.stringify(Object.keys(record).sort()) !== JSON.stringify(["completedAt", "environment", "kind", "schemaVersion", "status"]) ||
      record.schemaVersion !== 1 || record.environment !== input.environment ||
      record.kind !== "daily_database" || record.status !== "complete" || typeof record.completedAt !== "string"
    ) return "invalid";
    const completedAt = new Date(record.completedAt);
    const now = input.now ?? new Date();
    const age = now.getTime() - completedAt.getTime();
    if (!Number.isFinite(age) || age < -5 * 60 * 1_000) return "invalid";
    return age <= BACKUP_COMPLETION_LIMIT_MILLISECONDS ? "healthy" : "stale";
  } catch {
    return "invalid";
  }
}

export function evaluateWorkHealth(
  database: DatabaseWorkState,
  backup: BackupCompletionStatus,
  now = new Date(),
): WorkHealthResult {
  const oldestBacklogExceeded = database.oldestOutboxCreatedAt !== null &&
    now.getTime() - database.oldestOutboxCreatedAt.getTime() > OUTBOX_BACKLOG_LIMIT_MILLISECONDS;
  const outbox = database.outboxDead > 0
    ? "dead" as const
    : database.outboxRepeatedFailures > 0
      ? "failed" as const
      : oldestBacklogExceeded
        ? "backlog" as const
        : "healthy" as const;
  const worker = database.workerDead > 0 ? "dead" as const : "healthy" as const;
  const status = outbox === "healthy" && worker === "healthy" && (backup === "healthy" || backup === "not_required")
    ? "healthy" as const
    : "unhealthy" as const;
  return Object.freeze({
    status,
    outbox,
    worker,
    backup,
    counts: Object.freeze({
      outboxBacklog: database.outboxBacklog,
      outboxRepeatedFailures: database.outboxRepeatedFailures,
      outboxDead: database.outboxDead,
      workerDead: database.workerDead,
    }),
    oldestBacklogExceeded,
  });
}
