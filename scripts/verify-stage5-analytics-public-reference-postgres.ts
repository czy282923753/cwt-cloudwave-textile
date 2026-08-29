import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";

import { drizzle } from "drizzle-orm/postgres-js";
import postgres, { type Sql } from "postgres";

import { recordConversionEvent } from "../src/analytics/conversion-service";
import { toPublicAnalyticsPayload } from "../src/analytics/public-payload";
import type { DatabaseConnection } from "../src/db/client";
import { migrateDatabase } from "../src/db/migrate";
import * as schema from "../src/db/schema";

const databasePrefix = "cwt_s5ar_synthetic_";

function guardedAdminUrl(): URL {
  const raw = process.env.CWT_STAGE5_ANALYTICS_REFERENCE_POSTGRES_URL;
  if (!raw) {
    throw new Error("CWT_STAGE5_ANALYTICS_REFERENCE_POSTGRES_URL is required.");
  }
  const url = new URL(raw);
  if (!["127.0.0.1", "localhost", "[::1]", "::1"].includes(url.hostname)) {
    throw new Error("Analytics public-reference verifier accepts loopback only.");
  }
  if (!url.username.startsWith("cwt_s5ar_synthetic")) {
    throw new Error("Analytics public-reference verifier requires a Synthetic user.");
  }
  if (url.pathname !== "/postgres") {
    throw new Error("Analytics public-reference admin URL must target postgres.");
  }
  return url;
}

function databaseUrl(adminUrl: URL, databaseName: string): string {
  assert.match(databaseName, /^cwt_s5ar_synthetic_[a-z0-9_]+$/);
  const url = new URL(adminUrl);
  url.pathname = `/${databaseName}`;
  return url.toString();
}

function appConnection(
  url: string,
): Extract<DatabaseConnection, { kind: "postgres" }> {
  const client = postgres(url, { max: 6, prepare: false });
  return {
    kind: "postgres",
    db: drizzle(client, { schema }),
    createMigrationClient: () => postgres(url, { max: 1, prepare: false }),
    close: () => client.end(),
  };
}

async function createDatabase(admin: Sql, databaseName: string): Promise<void> {
  const existing = await admin<{ value: number }[]>`
    select count(*)::int as value from pg_database where datname = ${databaseName}
  `;
  assert.equal(existing[0]?.value, 0, `Disposable database collision: ${databaseName}`);
  await admin.unsafe(`create database "${databaseName}"`);
}

async function dropDatabase(admin: Sql, databaseName: string): Promise<void> {
  assert.match(databaseName, /^cwt_s5ar_synthetic_[a-z0-9_]+$/);
  await admin`
    select pg_terminate_backend(pid)
    from pg_stat_activity
    where datname = ${databaseName} and pid <> pg_backend_pid()
  `;
  await admin.unsafe(`drop database if exists "${databaseName}"`);
}

async function verify(url: string): Promise<Record<string, unknown>> {
  const connection = appConnection(url);
  try {
    await migrateDatabase(connection);
    const consentIds = {
      granted: "81000000-0000-4000-8000-000000000001",
      unknown: "81000000-0000-4000-8000-000000000002",
      denied: "81000000-0000-4000-8000-000000000003",
      revoked: "81000000-0000-4000-8000-000000000004",
    } as const;
    await connection.db.insert(schema.analyticsConsents).values(
      Object.entries(consentIds).map(([status, consentSessionId]) => ({
        consentSessionId,
        status: status as "granted" | "unknown" | "denied" | "revoked",
        consentVersion: 1,
        grantedAt: status === "granted" ? new Date("2026-08-29T00:00:00.000Z") : null,
        revokedAt: status === "revoked" ? new Date("2026-08-29T00:00:00.000Z") : null,
      })),
    );

    const publicReference = "CWT-12345678901234567890";
    const input = {
      eventId: `inquiry_created:${publicReference}`,
      eventName: "inquiry_created" as const,
      consentSessionId: consentIds.granted,
      routePath: "/get-quote/",
      externalReference: publicReference,
      safeProperties: {},
    };
    const first = await recordConversionEvent(connection.db, input);
    const replay = await recordConversionEvent(connection.db, input);
    assert.ok(first);
    assert.equal(replay, first);

    const rows = await connection.db.select().from(schema.conversionEvents);
    assert.equal(rows.length, 1);
    assert.deepEqual(
      {
        eventId: rows[0]?.eventId,
        eventName: rows[0]?.eventName,
        externalReference: rows[0]?.externalReference,
      },
      {
        eventId: input.eventId,
        eventName: input.eventName,
        externalReference: publicReference,
      },
    );
    const payload = toPublicAnalyticsPayload(rows[0]!);
    assert.equal(payload.externalReference, publicReference);
    assert.equal(payload.eventId, input.eventId);
    assert.equal(JSON.stringify(payload).includes(rows[0]!.id), false);
    assert.equal(JSON.stringify(payload).includes(consentIds.granted), false);
    for (const key of ["entityId", "inquiryId", "contactId", "assetId"]) {
      assert.equal(Object.hasOwn(payload, key), false);
    }

    for (const [status, consentSessionId] of Object.entries(consentIds)) {
      if (status === "granted") continue;
      const suffix = status === "unknown" ? "1" : status === "denied" ? "2" : "3";
      const result = await recordConversionEvent(connection.db, {
        ...input,
        eventId: `inquiry_created:CWT-1234567890123456789${suffix}`,
        externalReference: `CWT-1234567890123456789${suffix}`,
        consentSessionId,
      });
      assert.equal(result, null);
    }

    await assert.rejects(
      recordConversionEvent(connection.db, {
        ...input,
        externalReference: "CWT-AAAAAAAAAAAAAAAAAAAA",
      }),
      /identity/,
    );
    await assert.rejects(
      recordConversionEvent(connection.db, {
        eventId: "customer-phone-13800138000",
        eventName: "quote_cta_click",
        consentSessionId: consentIds.granted,
        routePath: "/get-quote/",
        safeProperties: { placement: "synthetic_verifier" },
      }),
      /Event ID/,
    );
    assert.equal((await connection.db.select().from(schema.conversionEvents)).length, 1);

    return {
      migration: "fresh 0000 -> current",
      persistedIdentity: input.eventId,
      replay: "same durable row ID; one row",
      consent: "Unknown, Denied and Revoked produced zero additional rows",
      rejection: "pair mismatch and arbitrary phone-like Event ID produced zero mutation",
      providerBoundary: "canonical public reference retained; internal identities absent",
    };
  } finally {
    await connection.close();
  }
}

async function main(): Promise<void> {
  if (
    process.env.CWT_STAGE5_ANALYTICS_REFERENCE_POSTGRES_VALIDATION !==
    "isolated-synthetic-database"
  ) {
    throw new Error(
      "Set CWT_STAGE5_ANALYTICS_REFERENCE_POSTGRES_VALIDATION=isolated-synthetic-database.",
    );
  }
  const adminUrl = guardedAdminUrl();
  const admin = postgres(adminUrl.toString(), { max: 1, prepare: false });
  const databaseName = `${databasePrefix}${randomBytes(6).toString("hex")}`;
  let databaseCreated = false;
  try {
    const server = await admin<{ version: string; address: string | null }[]>`
      select current_setting('server_version') as version, inet_server_addr()::text as address
    `;
    assert.match(server[0]?.version ?? "", /^18\.4(?:\s|$)/);
    await createDatabase(admin, databaseName);
    databaseCreated = true;
    const result = await verify(databaseUrl(adminUrl, databaseName));
    process.stdout.write(`${JSON.stringify({ status: "pass", server: server[0], result }, null, 2)}\n`);
  } finally {
    if (databaseCreated) await dropDatabase(admin, databaseName);
    const remaining = await admin<{ datname: string }[]>`
      select datname from pg_database where datname like ${`${databasePrefix}%`}
    `;
    assert.equal(remaining.length, 0);
    await admin.end();
  }
}

void main();
