import { databaseConnection } from "@/db/client";
import { createEmailNotifier } from "@/integrations/email";
import { deliverPendingInquiryNotifications } from "@/integrations/notification-outbox";

const notifier = createEmailNotifier();
const result =
  databaseConnection.kind === "pglite"
    ? await deliverPendingInquiryNotifications(databaseConnection.db, notifier)
    : await deliverPendingInquiryNotifications(databaseConnection.db, notifier);

process.stdout.write(
  `Notification outbox processed: ${result.attempted} attempted, ${result.sent} sent.\n`,
);
await databaseConnection.close();
