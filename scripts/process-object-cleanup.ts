import { databaseConnection } from "@/db/client";
import { createObjectStorage } from "@/storage";
import { processPendingObjectCleanupJobs } from "@/uploads/object-cleanup-service";
import { processPendingUploadRecoveryJobs } from "@/uploads/upload-recovery-service";

const storage = createObjectStorage();
const recovery = databaseConnection.kind === "pglite"
  ? await processPendingUploadRecoveryJobs(databaseConnection.db, storage)
  : await processPendingUploadRecoveryJobs(databaseConnection.db, storage);
const result = databaseConnection.kind === "pglite"
  ? await processPendingObjectCleanupJobs(databaseConnection.db, storage)
  : await processPendingObjectCleanupJobs(databaseConnection.db, storage);

process.stdout.write(
  `Upload recovery processed: ${recovery.attempted} attempted, ${recovery.completed} completed. Object cleanup processed: ${result.attempted} attempted, ${result.completed} completed, ${result.dead} dead.\n`,
);
if (result.dead > 0) process.exitCode = 2;
await databaseConnection.close();
