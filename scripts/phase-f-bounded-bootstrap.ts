import "server-only";

import { count, sql } from "drizzle-orm";

import { hashPassword } from "@/auth/password";
import { runGovernedMutation } from "@/audit/governed-mutation";
import { databaseConnection } from "@/db/client";
import { aiModelConfig, aiRuns, auditLogs, featureFlags, users } from "@/db/schema";

const syntheticAdminEmail = "phase-f-synthetic-admin@cloudwave.invalid";
const syntheticAdminName = "Synthetic Phase F Admin — NOT CWT DATA";
const isolatedDatabaseName = /^cwt_phase_f_synthetic_[a-z0-9_]+$/u;

async function governedBootstrapMutation(passwordHash: string): Promise<string> {
  if (databaseConnection.kind !== "postgres") {
    throw new Error("Phase F bootstrap requires isolated PostgreSQL.");
  }
  return runGovernedMutation(databaseConnection.db, async ({ transaction, audit }) => {
    const topology = await transaction.execute<{
      readonly database_name: string;
      readonly lock_acquired: boolean;
      readonly other_clients: number;
    }>(sql`
      select current_database() as database_name,
             pg_try_advisory_xact_lock(1129792598, 1) as lock_acquired,
             (
               select count(*)::integer
               from pg_stat_activity
               where datname = current_database()
                 and pid <> pg_backend_pid()
                 and backend_type = 'client backend'
             ) as other_clients
    `);
    const observed = topology[0];
    if (observed === undefined || !isolatedDatabaseName.test(observed.database_name) ||
      observed.lock_acquired !== true || Number(observed.other_clients) !== 0) {
      throw new Error("Phase F bootstrap refused non-isolated or concurrent-writer topology.");
    }
    const [userCount, flagCount, auditCount, configCount, runCount] = await Promise.all([
      transaction.select({ value: count() }).from(users),
      transaction.select({ value: count() }).from(featureFlags),
      transaction.select({ value: count() }).from(auditLogs),
      transaction.select({ value: count() }).from(aiModelConfig),
      transaction.select({ value: count() }).from(aiRuns),
    ]);
    if ([userCount, flagCount, auditCount, configCount, runCount]
      .some((result) => Number(result[0]?.value ?? -1) !== 0)) {
      throw new Error("Phase F bootstrap requires a fresh disposable database.");
    }

    const actorRows = await transaction.insert(users).values({
      email: syntheticAdminEmail,
      displayName: syntheticAdminName,
      role: "admin",
      passwordHash,
      isActive: true,
    }).returning({ id: users.id });
    const actor = actorRows[0];
    if (actor === undefined) throw new Error("Synthetic Admin bootstrap insert failed.");
    await audit({
      actorUserId: actor.id,
      action: "auth.phase_f_staging_bootstrapped",
      entityType: "user",
      entityId: actor.id,
      afterSummary: {
        classification: "SYNTHETIC_TEST_DATA_NOT_CWT_FACT",
        role: "admin",
        active: true,
      },
    });

    const flagRows = await transaction.insert(featureFlags).values({
      key: "ai",
      enabled: false,
      configuration: { classification: "SYNTHETIC_TEST_DATA_NOT_CWT_FACT" },
      updatedByUserId: actor.id,
    }).returning({ id: featureFlags.id });
    const flag = flagRows[0];
    if (flag === undefined) throw new Error("Disabled AI feature bootstrap insert failed.");
    await audit({
      actorUserId: actor.id,
      action: "feature_flag.created",
      entityType: "feature_flag",
      entityId: flag.id,
      afterSummary: { key: "ai", enabled: false },
    });
    return actor.id;
  }, { transactionConfig: { isolationLevel: "serializable" } });
}

async function main(): Promise<void> {
  if (process.argv.length !== 2) throw new Error("Phase F bootstrap accepts no CLI arguments.");
  if (process.env.APP_ENV !== "staging" || process.env.FEATURE_AI !== "false") {
    throw new Error("Phase F bootstrap requires Staging with process AI disabled.");
  }
  if (databaseConnection.kind !== "postgres") {
    throw new Error("Phase F bootstrap requires isolated PostgreSQL.");
  }
  try {
    const actorId = await governedBootstrapMutation(await hashPassword(process.env.DEV_ADMIN_PASSWORD ?? ""));
    process.stdout.write(`${JSON.stringify({
      status: "bootstrapped",
      classification: "SYNTHETIC_TEST_DATA_NOT_CWT_FACT",
      actorId,
      featureAiEnabled: false,
    })}\n`);
  } finally {
    await databaseConnection.close();
  }
}

void main().catch(async (error: unknown) => {
  await databaseConnection.close().catch(() => undefined);
  process.stderr.write(`${error instanceof Error ? error.message : "Phase F bootstrap failed."}\n`);
  process.exitCode = 1;
});
