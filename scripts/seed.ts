import { seedCoreData } from "../src/db/seed";
import { databaseConnection } from "../src/db/client";

async function runSeed(): Promise<string> {
  if (databaseConnection.kind === "pglite") {
    return (await seedCoreData(databaseConnection.db)).adminUserId;
  }
  return (await seedCoreData(databaseConnection.db)).adminUserId;
}

async function main(): Promise<void> {
  if (process.env.APP_ENV === "production") {
    throw new Error("Development seed is disabled in production.");
  }
  const adminUserId = await runSeed();
  await databaseConnection.close();
  process.stdout.write(`Core seed complete for user ${adminUserId}.\n`);
}

void main();
