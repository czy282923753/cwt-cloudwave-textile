import type { PgQueryResultHKT } from "drizzle-orm/pg-core/session";

import { writeAuditLog, type AuditInput } from "@/audit/service";
import type { AppDatabase } from "@/db/types";

export type AuditWriter = typeof writeAuditLog;

export interface GovernedMutationOptions {
  auditWriter?: AuditWriter;
}

export interface GovernedMutationContext<TQueryResult extends PgQueryResultHKT> {
  transaction: AppDatabase<TQueryResult>;
  audit(input: AuditInput): Promise<string>;
}

/**
 * Runs a governed business mutation and its required Audit Log in one database
 * transaction. Callers must perform every related row/status change through the
 * supplied transaction and must not retain it after the callback resolves.
 */
export async function runGovernedMutation<
  TQueryResult extends PgQueryResultHKT,
  TResult,
>(
  db: AppDatabase<TQueryResult>,
  operation: (context: GovernedMutationContext<TQueryResult>) => Promise<TResult>,
  options: GovernedMutationOptions = {},
): Promise<TResult> {
  const auditWriter = options.auditWriter ?? writeAuditLog;
  return db.transaction(async (transaction) =>
    operation({
      transaction,
      audit: (input) => auditWriter(transaction, input),
    }),
  );
}
