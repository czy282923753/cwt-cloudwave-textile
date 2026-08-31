import "server-only";

import { readFile } from "node:fs/promises";

import { and, eq, sql } from "drizzle-orm";
import type { PgQueryResultHKT } from "drizzle-orm/pg-core/session";

import { env } from "@/config/env";
import { databaseConnection } from "@/db/client";
import { aiRuns, notificationOutbox } from "@/db/schema";
import type { AppDatabase } from "@/db/types";

import {
  evaluateWorkHealth,
  probeBackupCompletion,
  type DatabaseWorkState,
  type WorkHealthResult,
} from "./work-health";

export async function loadDatabaseWorkState<TQueryResult extends PgQueryResultHKT>(
  db: AppDatabase<TQueryResult>,
): Promise<DatabaseWorkState> {
  const [outboxRows, workerRows] = await Promise.all([
    db.select({
      outboxBacklog: sql<number>`count(*) filter (where ${notificationOutbox.status} in ('pending', 'failed', 'processing'))`,
      outboxRepeatedFailures: sql<number>`count(*) filter (where ${notificationOutbox.status} = 'failed' and ${notificationOutbox.attempts} >= 2)`,
      outboxDead: sql<number>`count(*) filter (where ${notificationOutbox.status} = 'dead')`,
      oldestOutboxCreatedAt: sql<Date | null>`min(${notificationOutbox.createdAt}) filter (where ${notificationOutbox.status} in ('pending', 'failed', 'processing'))`,
    }).from(notificationOutbox),
    db.select({ workerDead: sql<number>`count(*)` }).from(aiRuns).where(and(
      eq(aiRuns.status, "failed"),
      eq(aiRuns.retryState, "not_retryable"),
    )),
  ]);
  const outbox = outboxRows[0];
  const worker = workerRows[0];
  const oldestValue = outbox?.oldestOutboxCreatedAt;
  const oldestOutboxCreatedAt = oldestValue === null || oldestValue === undefined
    ? null
    : oldestValue instanceof Date ? oldestValue : new Date(oldestValue);
  if (oldestOutboxCreatedAt !== null && !Number.isFinite(oldestOutboxCreatedAt.getTime())) {
    throw new Error("Work-health timestamp is invalid.");
  }
  return Object.freeze({
    outboxBacklog: Number(outbox?.outboxBacklog ?? 0),
    outboxRepeatedFailures: Number(outbox?.outboxRepeatedFailures ?? 0),
    outboxDead: Number(outbox?.outboxDead ?? 0),
    oldestOutboxCreatedAt,
    workerDead: Number(worker?.workerDead ?? 0),
  });
}

export async function runApplicationWorkHealth(now = new Date()): Promise<WorkHealthResult> {
  const database = databaseConnection.kind === "pglite"
    ? await loadDatabaseWorkState(databaseConnection.db)
    : await loadDatabaseWorkState(databaseConnection.db);
  const backup = await probeBackupCompletion({
    environment: env.APP_ENV,
    now,
    readText: async (path) => readFile(path, "utf8"),
  });
  return evaluateWorkHealth(database, backup, now);
}
