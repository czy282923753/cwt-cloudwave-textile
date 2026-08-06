import { databaseConnection } from "@/db/client";
import { createObjectStorage } from "@/storage";
import { expireRetainedProductImportMedia } from "@/uploads/admin-upload-service";
import { processPendingObjectCleanupJobs } from "@/uploads/object-cleanup-service";
import { processPendingUploadRecoveryJobs } from "@/uploads/upload-recovery-service";

const storage = createObjectStorage();
const recovery = databaseConnection.kind === "pglite"
  ? await processPendingUploadRecoveryJobs(databaseConnection.db, storage)
  : await processPendingUploadRecoveryJobs(databaseConnection.db, storage);
const importExpiry = databaseConnection.kind === "pglite"
  ? await expireRetainedProductImportMedia(databaseConnection.db, storage)
  : await expireRetainedProductImportMedia(databaseConnection.db, storage);
const result = databaseConnection.kind === "pglite"
  ? await processPendingObjectCleanupJobs(databaseConnection.db, storage)
  : await processPendingObjectCleanupJobs(databaseConnection.db, storage);

process.stdout.write(
  `Upload recovery processed: ${recovery.attempted} attempted, ${recovery.completed} completed. Retained Import media expired: ${importExpiry.expired}, failed Batches: ${importExpiry.failedBatches}. Object cleanup processed: ${result.attempted + importExpiry.cleanup.attempted} attempted, ${result.completed + importExpiry.cleanup.completed} completed, ${result.dead + importExpiry.cleanup.dead} dead.\n`,
);
if (result.dead + importExpiry.cleanup.dead > 0) process.exitCode = 2;
await databaseConnection.close();
