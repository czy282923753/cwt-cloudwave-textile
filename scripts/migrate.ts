import { databaseConnection } from "../src/db/client";
import { migrateDatabase } from "../src/db/migrate";

async function main(): Promise<void> {
  await migrateDatabase(databaseConnection);
  await databaseConnection.close();
  process.stdout.write("Database migrations applied.\n");
}

void main();
