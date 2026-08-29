import { databaseConnection } from "@/db/client";
import { createEmailTransport } from "@/integrations/email";
import { deliverPendingNotificationOutbox } from "@/integrations/notification-outbox";

const transport = createEmailTransport();
const result =
  databaseConnection.kind === "pglite"
    ? await deliverPendingNotificationOutbox(databaseConnection.db, transport)
    : await deliverPendingNotificationOutbox(databaseConnection.db, transport);

process.stdout.write(
  `Notification outbox processed: ${result.attempted} attempted, ${result.sent} sent.\n`,
);
await databaseConnection.close();
