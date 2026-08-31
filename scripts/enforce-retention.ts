import { databaseConnection } from "../src/db/client";
import {
  purgeExpiredInquiryAssets,
  purgeExpiredUploadIntents,
} from "../src/uploads/retention-service";
import { createObjectStorage } from "../src/storage";

async function main(): Promise<void> {
  const execute = process.argv.includes("--execute");
  try {
    const storage = createObjectStorage();
    const inquiryAssets =
      databaseConnection.kind === "pglite"
        ? await purgeExpiredInquiryAssets(databaseConnection.db, storage, {
            dryRun: !execute,
          })
        : await purgeExpiredInquiryAssets(databaseConnection.db, storage, {
            dryRun: !execute,
          });
    const uploadIntents = databaseConnection.kind === "pglite"
      ? await purgeExpiredUploadIntents(databaseConnection.db, storage, { dryRun: !execute })
      : await purgeExpiredUploadIntents(databaseConnection.db, storage, { dryRun: !execute });
    process.stdout.write(`${execute ? "Retention execution" : "Retention preview"}: ${JSON.stringify({ inquiryAssets, uploadIntents })}\n`);
  } finally {
    await databaseConnection.close();
  }
}

void main().catch(() => {
  process.stderr.write("Retention failed: unavailable.\n");
  process.exitCode = 1;
});
