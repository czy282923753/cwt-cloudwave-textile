import { count } from "drizzle-orm";

import { databaseConnection } from "../src/db/client";
import {
  authors,
  featureFlags,
  products,
  users,
} from "../src/db/schema";
import { assertDatabaseReady, verifyDatabaseReadiness } from "../src/db/readiness";

export async function verifyCurrentDatabase() {
  const db = databaseConnection.db;
  const [userCount, authorCount, flagCount, productCount] = await Promise.all([
    db.select({ value: count() }).from(users),
    db.select({ value: count() }).from(authors),
    db.select({ value: count() }).from(featureFlags),
    db.select({ value: count() }).from(products),
  ]);

  const readiness = databaseConnection.kind === "pglite"
    ? await verifyDatabaseReadiness(databaseConnection.db)
    : await verifyDatabaseReadiness(databaseConnection.db);

  const values = {
    users: Number(userCount[0]?.value ?? 0),
    authors: Number(authorCount[0]?.value ?? 0),
    featureFlags: Number(flagCount[0]?.value ?? 0),
    products: Number(productCount[0]?.value ?? 0),
    ...readiness,
  };

  if (values.users < 1 || values.authors < 1 || values.featureFlags < 4) {
    throw new Error("Core seed verification failed.");
  }
  assertDatabaseReady(readiness);
  return values;
}

async function main(): Promise<void> {
  try {
    const result = await verifyCurrentDatabase();
    process.stdout.write(`Database verification passed: ${JSON.stringify(result)}\n`);
  } finally {
    await databaseConnection.close();
  }
}

void main();
