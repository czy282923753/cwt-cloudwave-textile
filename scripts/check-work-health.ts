import { env } from "@/config/env";
import { databaseConnection } from "@/db/client";
import { createMonitoringReporter } from "@/operations/monitoring";
import { runApplicationWorkHealth } from "@/operations/work-health-runtime";

async function main(): Promise<void> {
  try {
    const result = await runApplicationWorkHealth();
    process.stdout.write(`Work health: ${JSON.stringify(result)}\n`);
    const release = process.env.CWT_RELEASE_ID ?? ((env.APP_ENV === "local" || env.APP_ENV === "test") ? "0".repeat(40) : "");
    const reporter = createMonitoringReporter({
      mode: env.MONITORING_DRIVER === "external" ? "external" : "disabled",
      environment: env.APP_ENV,
      release,
    });
    await reporter.report({
      severity: result.status === "healthy" ? "info" : "error",
      code: result.status === "healthy" ? "work_health.healthy" : "work_health.unhealthy",
      attributes: {
        component: result.outbox !== "healthy" ? "outbox" : result.worker !== "healthy" ? "worker" : "backup",
        outcome: result.status,
        count: result.counts.outboxDead + result.counts.workerDead + result.counts.outboxRepeatedFailures,
      },
    });
    if (result.status !== "healthy") process.exitCode = 2;
  } finally {
    await databaseConnection.close();
  }
}

void main().catch(() => {
  process.stderr.write("Work health probe failed: unavailable.\n");
  process.exitCode = 1;
});
