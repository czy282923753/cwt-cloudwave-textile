import postgres from "postgres";

import { env } from "../src/config/env";
import { databaseConnection } from "../src/db/client";
import { migrateDatabase } from "../src/db/migrate";
import { assertDatabaseReady, verifyDatabaseReadiness } from "../src/db/readiness";
import { seedCoreData } from "../src/db/seed";

async function main(): Promise<void> {
  if (
    databaseConnection.kind !== "postgres" ||
    env.APP_ENV === "production" ||
    process.env.CWT_POSTGRES_VALIDATION !== "isolated-test-database"
  ) {
    throw new Error(
      "PostgreSQL validation requires a dedicated non-production PostgreSQL database and CWT_POSTGRES_VALIDATION=isolated-test-database.",
    );
  }
  const client = postgres(env.DATABASE_URL, { max: 4, prepare: false });
  try {
    await migrateDatabase(databaseConnection);
    await seedCoreData(databaseConnection.db);
    const readiness = await verifyDatabaseReadiness(databaseConnection.db);
    assertDatabaseReady(readiness);
    const databaseInfo = await client<{
      server_version: string;
      timezone: string;
      current_time: Date;
    }[]>`
      select current_setting('server_version') as server_version,
             current_setting('TimeZone') as timezone,
             current_timestamp as current_time
    `;
    const triggers = await client<{ tgname: string }[]>`
      select tgname from pg_trigger
      where not tgisinternal and tgname in (
        'cwt_product_primary_from_product',
        'cwt_product_primary_from_relation',
        'cwt_customer_activity_contact_guard',
        'cwt_inquiry_assignment_guard',
        'cwt_route_path_guard',
        'cwt_redirect_graph_guard'
      )
    `;
    const indexes = await client<{ indexname: string }[]>`
      select indexname from pg_indexes
      where schemaname = 'public' and indexname in (
        'product_taxonomy_one_primary_unique',
        'routes_path_unique',
        'inquiries_idempotency_key_unique',
        'notification_outbox_delivery_key_unique'
      )
    `;
    const advisory = await client<{ locked: boolean }[]>`
      select pg_try_advisory_lock(hashtext('cwt-round2-validation')) as locked
    `;
    if (!advisory[0]?.locked) throw new Error("Advisory lock validation failed.");
    await client`select pg_advisory_unlock(hashtext('cwt-round2-validation'))`;
    if (triggers.length !== 6 || indexes.length !== 4) {
      throw new Error("Required trigger or index validation failed.");
    }
    process.stdout.write(
      `${JSON.stringify({
        status: "partial-pass",
        databaseInfo: databaseInfo[0],
        readiness,
        triggers: triggers.map((row) => row.tgname).sort(),
        indexes: indexes.map((row) => row.indexname).sort(),
        remaining: "Run the documented concurrent two-client scenarios and restore drill.",
      }, null, 2)}\n`,
    );
  } finally {
    await client.end();
    await databaseConnection.close();
  }
}

void main();
