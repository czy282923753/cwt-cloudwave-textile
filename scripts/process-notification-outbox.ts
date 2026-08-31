import { databaseConnection } from "@/db/client";
import { createEmailTransport } from "@/integrations/email";
import { deliverPendingNotificationOutbox } from "@/integrations/notification-outbox";
import { runApplicationWorkHealth } from "@/operations/work-health-runtime";

async function main(): Promise<void> {
  try {
    let result: Awaited<ReturnType<typeof deliverPendingNotificationOutbox>>;
    try {
      const transport = createEmailTransport();
      result = databaseConnection.kind === "pglite"
        ? await deliverPendingNotificationOutbox(databaseConnection.db, transport)
        : await deliverPendingNotificationOutbox(databaseConnection.db, transport);
    } catch {
      process.stderr.write("Notification outbox failed: unavailable.\n");
      process.exitCode = 1;
      return;
    }
    process.stdout.write(
      `Notification outbox processed: ${result.attempted} attempted, ${result.sent} sent.\n`,
    );
    try {
      const health = await runApplicationWorkHealth();
      process.stdout.write(`Work health: ${JSON.stringify(health)}\n`);
      if (health.status !== "healthy") process.exitCode = 2;
    } catch {
      process.stderr.write("Work health probe failed: unavailable.\n");
      process.exitCode = 1;
    }
  } finally {
    await databaseConnection.close();
  }
}

void main().catch(() => {
  process.stderr.write("Notification outbox process cleanup failed: unavailable.\n");
  process.exitCode = 1;
});
