import { databaseConnection } from "@/db/client";
import { createObjectStorage } from "@/storage";
import { processPendingObjectCleanupJobs } from "@/uploads/object-cleanup-service";

const storage = createObjectStorage();
const result = databaseConnection.kind === "pglite"
  ? await processPendingObjectCleanupJobs(databaseConnection.db, storage)
  : await processPendingObjectCleanupJobs(databaseConnection.db, storage);

process.stdout.write(
  `Object cleanup processed: ${result.attempted} attempted, ${result.completed} completed, ${result.dead} dead.\n`,
);
if (result.dead > 0) process.exitCode = 2;
await databaseConnection.close();
