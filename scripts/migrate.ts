import { closeSync, fstatSync, openSync, statSync } from "node:fs";
import { spawnSync } from "node:child_process";

async function main(): Promise<void> {
  const protectedEnvironment = process.env.APP_ENV === "production" || process.env.APP_ENV === "staging";
  const lockPath = protectedEnvironment ? "/run/cwt/backup-migration.lock" : process.env.BACKUP_LOCK_FILE;
  let ownedDescriptor: number | undefined;
  try {
    if (lockPath) {
      if (process.platform !== "linux") throw new Error("The maintenance mutex requires Linux");
      const file = statSync(lockPath);
      if (!file.isFile()) throw new Error("The maintenance mutex must be a regular file");
      let descriptor: number;
      try {
        const inherited = fstatSync(8);
        if (inherited.dev !== file.dev || inherited.ino !== file.ino) throw new Error("different inode");
        descriptor = 8;
      } catch {
        descriptor = openSync(lockPath, "r");
        ownedDescriptor = descriptor;
      }
      // flock's child and this process share the open file description. Ownership
      // survives the short flock child and ends when this descriptor closes.
      const lock = spawnSync("flock", ["-n", "-E", "75", "3"], { stdio: ["ignore", "ignore", "ignore", descriptor] });
      if (lock.status !== 0) {
        process.stderr.write("Migration refused: backup/Migration operation active or mutex unavailable.\n");
        process.exitCode = lock.status === 75 ? 75 : 1;
        return;
      }
    }
    // No database connection or version probe may precede the OS mutex.
    const { databaseConnection } = await import("../src/db/client");
    try {
      const { migrateDatabase } = await import("../src/db/migrate");
      await migrateDatabase(databaseConnection);
      process.stdout.write("Database migrations applied.\n");
    } finally { await databaseConnection.close(); }
  } finally { if (ownedDescriptor !== undefined) closeSync(ownedDescriptor); }
}
void main().catch((error: unknown) => {
  const knownCodes = ["LOCK_UNAVAILABLE", "MIGRATION_IDENTITY_MISMATCH", "JOURNAL_CATALOG_MISMATCH", "MIGRATION_CLIENT_NOT_DEDICATED", "BACKEND_SESSION_CHANGED", "POST_MIGRATION_VERIFICATION_FAILED"];
  const code = error instanceof Error && "code" in error && typeof error.code === "string" && knownCodes.includes(error.code) ? error.code : "unavailable";
  process.stderr.write(`Migration failed: ${code}.\n`);
  process.exitCode = 1;
});
