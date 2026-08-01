import { createFileScanner } from "../src/uploads/scanner";
import { createObjectStorage } from "../src/storage";
import { seedFixtureProducts } from "../src/db/fixture-seed";
import { seedCoreData } from "../src/db/seed";
import { databaseConnection } from "../src/db/client";

async function runFixtureSeed(): Promise<number> {
  const storage = createObjectStorage();
  const scanner = createFileScanner();
  if (databaseConnection.kind === "pglite") {
    const { adminUserId } = await seedCoreData(databaseConnection.db);
    return seedFixtureProducts(databaseConnection.db, storage, scanner, adminUserId);
  }
  const { adminUserId } = await seedCoreData(databaseConnection.db);
  return seedFixtureProducts(databaseConnection.db, storage, scanner, adminUserId);
}

async function main(): Promise<void> {
  if (process.env.APP_ENV === "production") {
    throw new Error("Test fixtures are disabled in production.");
  }
  const created = await runFixtureSeed();
  await databaseConnection.close();
  process.stdout.write(`Fixture seed complete; ${created} products created.\n`);
}

void main();
