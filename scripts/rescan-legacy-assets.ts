import { databaseConnection } from "../src/db/client";
import { createObjectStorage } from "../src/storage";
import { createFileScanner } from "../src/uploads/scanner-factory";
import {
  listLegacyAssetsRequiringManualReview,
  rescanLegacyAsset,
  rescanLegacyAssets,
} from "../src/uploads/legacy-rescan-service";

async function main(): Promise<void> {
  try {
    const retryIndex = process.argv.indexOf("--retry-manual");
    const retryAssetId = retryIndex >= 0 ? process.argv[retryIndex + 1] : null;
    if (retryIndex >= 0 && !retryAssetId) {
      throw new Error("--retry-manual requires one explicit Asset ID.");
    }
    const storage = createObjectStorage();
    const scanner = createFileScanner();
    const results = retryAssetId
      ? [databaseConnection.kind === "pglite"
          ? await rescanLegacyAsset(databaseConnection.db, storage, scanner, retryAssetId, { retryManualReview: true })
          : await rescanLegacyAsset(databaseConnection.db, storage, scanner, retryAssetId, { retryManualReview: true })]
      : databaseConnection.kind === "pglite"
        ? await rescanLegacyAssets(databaseConnection.db, storage, scanner)
        : await rescanLegacyAssets(databaseConnection.db, storage, scanner);
    const manual = databaseConnection.kind === "pglite"
      ? await listLegacyAssetsRequiringManualReview(databaseConnection.db)
      : await listLegacyAssetsRequiringManualReview(databaseConnection.db);
    process.stdout.write(
      `${JSON.stringify({ processed: results.length, results, manualReview: manual }, null, 2)}\n`,
    );
    if (manual.length > 0) process.exitCode = 2;
  } finally {
    await databaseConnection.close();
  }
}

void main();
