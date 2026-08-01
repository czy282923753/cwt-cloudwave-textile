import { databaseConnection } from "../src/db/client";
import { purgeExpiredInquiryAssets } from "../src/uploads/retention-service";
import { createObjectStorage } from "../src/storage";

async function main(): Promise<void> {
  const execute = process.argv.includes("--execute");
  try {
    const storage = createObjectStorage();
    const result =
      databaseConnection.kind === "pglite"
        ? await purgeExpiredInquiryAssets(databaseConnection.db, storage, {
            dryRun: !execute,
          })
        : await purgeExpiredInquiryAssets(databaseConnection.db, storage, {
            dryRun: !execute,
          });
    process.stdout.write(
      `${execute ? "Retention execution" : "Retention preview"}: ${JSON.stringify(result)}\n`,
    );
  } finally {
    await databaseConnection.close();
  }
}

void main();
