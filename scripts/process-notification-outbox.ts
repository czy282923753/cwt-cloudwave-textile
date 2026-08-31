import { databaseConnection } from "@/db/client";
import { createEmailTransport } from "@/integrations/email";
import { deliverPendingNotificationOutbox } from "@/integrations/notification-outbox";

async function main(): Promise<void> {
  try {
    const transport = createEmailTransport();
    const result = databaseConnection.kind === "pglite"
      ? await deliverPendingNotificationOutbox(databaseConnection.db, transport)
      : await deliverPendingNotificationOutbox(databaseConnection.db, transport);
    process.stdout.write(
      `Notification outbox processed: ${result.attempted} attempted, ${result.sent} sent.\n`,
    );
  } finally {
    await databaseConnection.close();
  }
}

void main().catch((error: unknown) => {
  process.stderr.write(`Notification outbox failed: ${error instanceof Error ? error.message : "unknown error"}\n`);
  process.exitCode = 1;
});
