import type { PgQueryResultHKT } from "drizzle-orm/pg-core/session";

import { auditLogs } from "@/db/schema";
import type { AppDatabase } from "@/db/types";

type JsonObject = Readonly<Record<string, unknown>>;

export interface AuditInput {
  actorUserId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  beforeSummary?: JsonObject | null;
  afterSummary?: JsonObject | null;
  requestId?: string | null;
  ipSummary?: string | null;
  userAgentSummary?: string | null;
}

export class AuditWriteError extends Error {
  constructor(cause?: unknown) {
    super("Required Audit log write failed.", { cause });
    this.name = "AuditWriteError";
  }
}

export async function writeAuditLog<TQueryResult extends PgQueryResultHKT>(
  db: AppDatabase<TQueryResult>,
  input: AuditInput,
): Promise<string> {
  try {
    const rows = await db
      .insert(auditLogs)
      .values({
        actorUserId: input.actorUserId ?? null,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId ?? null,
        beforeSummary: input.beforeSummary ?? null,
        afterSummary: input.afterSummary ?? null,
        requestId: input.requestId ?? null,
        ipSummary: input.ipSummary ?? null,
        userAgentSummary: input.userAgentSummary ?? null,
      })
      .returning({ id: auditLogs.id });
    const row = rows[0];
    if (!row) throw new Error("Audit log insert did not return an ID.");
    return row.id;
  } catch (error) {
    if (error instanceof AuditWriteError) throw error;
    throw new AuditWriteError(error);
  }
}
