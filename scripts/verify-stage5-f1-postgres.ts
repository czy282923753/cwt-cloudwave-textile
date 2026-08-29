import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import postgres, { type Sql } from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";

import {
  createInquiry,
  createInquiryRequestFingerprintV1,
  InquiryIdempotencyConflictError,
  type CreateInquiryInput,
} from "../src/crm/inquiry-service";
import * as schema from "../src/db/schema";
import { migrateDatabase } from "../src/db/migrate";
import type { DatabaseConnection } from "../src/db/client";
import type { EmailNotifier } from "../src/integrations/email";

const databasePrefix = "cwt_s5f1_synthetic_";

class SilentNotifier implements EmailNotifier {
  async notifyInquiry(): Promise<void> {}
}

type Journal = {
  version: string;
  dialect: string;
  entries: Array<{
    idx: number;
    version: string;
    when: number;
    tag: string;
    breakpoints: boolean;
  }>;
};

function guardedAdminUrl(): URL {
  const raw = process.env.CWT_STAGE5_F1_POSTGRES_URL;
  if (!raw) throw new Error("CWT_STAGE5_F1_POSTGRES_URL is required.");
  const url = new URL(raw);
  if (!['127.0.0.1', 'localhost', '[::1]', '::1'].includes(url.hostname)) {
    throw new Error("Stage 5 PostgreSQL verifier accepts loopback only.");
  }
  if (!url.username.startsWith("cwt_s5f1_synthetic")) {
    throw new Error("Stage 5 PostgreSQL verifier requires a conspicuously Synthetic user.");
  }
  if (url.pathname !== "/postgres") {
    throw new Error("Stage 5 PostgreSQL verifier admin URL must target the postgres database.");
  }
  return url;
}

function databaseUrl(adminUrl: URL, databaseName: string): string {
  assert.match(databaseName, /^cwt_s5f1_synthetic_[a-z0-9_]+$/);
  const url = new URL(adminUrl);
  url.pathname = `/${databaseName}`;
  return url.toString();
}

function appConnection(
  url: string,
): Extract<DatabaseConnection, { kind: "postgres" }> {
  const client = postgres(url, { max: 10, prepare: false });
  return {
    kind: "postgres",
    db: drizzle(client, { schema }),
    createMigrationClient: () => postgres(url, { max: 1, prepare: false }),
    close: () => client.end(),
  };
}

async function migrationDirectoryThrough(maximum: number): Promise<string> {
  const journal = JSON.parse(await readFile("drizzle/meta/_journal.json", "utf8")) as Journal;
  const directory = await mkdtemp(join(tmpdir(), `cwt-stage5-f1-postgres-${maximum}-`));
  await mkdir(join(directory, "meta"));
  for (const entry of journal.entries.filter((candidate) => candidate.idx <= maximum)) {
    await copyFile(`drizzle/${entry.tag}.sql`, join(directory, `${entry.tag}.sql`));
  }
  await writeFile(join(directory, "meta", "_journal.json"), JSON.stringify({
    ...journal,
    entries: journal.entries.filter((entry) => entry.idx <= maximum),
  }));
  return directory;
}

async function createDatabase(admin: Sql, databaseName: string): Promise<void> {
  assert.match(databaseName, /^cwt_s5f1_synthetic_[a-z0-9_]+$/);
  const existing = await admin<{ value: number }[]>`
    select count(*)::int as value from pg_database where datname = ${databaseName}
  `;
  assert.equal(existing[0]?.value, 0, `Disposable database collision: ${databaseName}`);
  await admin.unsafe(`create database "${databaseName}"`);
}

async function dropDatabase(admin: Sql, databaseName: string): Promise<void> {
  assert.match(databaseName, /^cwt_s5f1_synthetic_[a-z0-9_]+$/);
  await admin`
    select pg_terminate_backend(pid)
    from pg_stat_activity
    where datname = ${databaseName} and pid <> pg_backend_pid()
  `;
  await admin.unsafe(`drop database if exists "${databaseName}"`);
}

async function countRows(client: Sql, table: string): Promise<number> {
  assert.match(table, /^[a-z_]+$/);
  const rows = await client.unsafe<{ value: number }[]>(
    `select count(*)::int as value from "${table}"`,
  );
  return Number(rows[0]?.value ?? 0);
}

async function verifyFresh(url: string): Promise<Record<string, unknown>> {
  const connection = appConnection(url);
  const client = postgres(url, { max: 6, prepare: false });
  try {
    await migrateDatabase(connection);
    await migrateDatabase(connection);
    const columns = await client<{ column_name: string }[]>`
      select column_name from information_schema.columns
      where table_schema = 'public' and table_name = 'inquiries'
        and column_name in (
          'submit_referrer', 'submit_utm_source', 'submit_utm_medium',
          'submit_utm_campaign', 'source_entity_type', 'source_entity_id'
        )
      order by column_name
    `;
    assert.equal(columns.length, 6);

    const hardBoundaryBefore = await Promise.all([
      countRows(client, "contacts"),
      countRows(client, "inquiries"),
      countRows(client, "inquiry_assets"),
      countRows(client, "inquiry_status_history"),
      countRows(client, "notification_outbox"),
      countRows(client, "audit_logs"),
    ]);
    for (const [suffix, sourcePagePath] of [
      ["query", "/products/synthetic-fabric/?private=1"],
      ["fragment", "/applications/activewear/#private"],
    ] as const) {
      await assert.rejects(createInquiry(connection.db, new SilentNotifier(), {
        idempotencyKey: `postgres-required-path-${suffix}-0001`,
        name: "Synthetic PostgreSQL Required Path Buyer",
        email: `postgres-required-path-${suffix}@example.test`,
        description: "Synthetic required path hard-boundary request.",
        sourcePagePath,
      }), /A valid source page path is required/);
    }
    const hardBoundaryAfter = await Promise.all([
      countRows(client, "contacts"),
      countRows(client, "inquiries"),
      countRows(client, "inquiry_assets"),
      countRows(client, "inquiry_status_history"),
      countRows(client, "notification_outbox"),
      countRows(client, "audit_logs"),
    ]);
    assert.deepEqual(hardBoundaryAfter, hardBoundaryBefore);

    const equalInput: CreateInquiryInput = {
      idempotencyKey: "postgres-equal-0001",
      name: "Synthetic PostgreSQL Equal Buyer",
      email: "postgres-equal@example.test",
      description: "Synthetic equal concurrency.",
      sourcePagePath: "/get-quote/",
      submitUtmCampaign: "campaign-1234567",
    };
    const equal = await Promise.all([
      createInquiry(connection.db, new SilentNotifier(), equalInput),
      createInquiry(connection.db, new SilentNotifier(), {
        ...equalInput,
        submitUtmCampaign: "phone:138:0013:8000",
      }),
    ]);
    assert.equal(new Set(equal.map((result) => result.inquiryId)).size, 1);
    assert.equal(equal.filter((result) => result.replayed).length, 1);

    const differentInput: CreateInquiryInput = {
      ...equalInput,
      idempotencyKey: "postgres-different-0001",
      email: "postgres-different@example.test",
      submitUtmCampaign: "spring-launch",
    };
    const different = await Promise.allSettled([
      createInquiry(connection.db, new SilentNotifier(), differentInput),
      createInquiry(connection.db, new SilentNotifier(), {
        ...differentInput,
        submitUtmCampaign: "autumn-launch",
      }),
    ]);
    assert.equal(different.filter((result) => result.status === "fulfilled").length, 1);
    const rejection = different.find((result) => result.status === "rejected");
    assert.ok(rejection?.status === "rejected" &&
      rejection.reason instanceof InquiryIdempotencyConflictError);

    const beforeRollback = await Promise.all([
      countRows(client, "contacts"),
      countRows(client, "inquiries"),
      countRows(client, "inquiry_assets"),
      countRows(client, "inquiry_status_history"),
      countRows(client, "notification_outbox"),
      countRows(client, "audit_logs"),
    ]);
    await assert.rejects(createInquiry(connection.db, new SilentNotifier(), {
      ...equalInput,
      idempotencyKey: "postgres-audit-rollback-0001",
      email: "postgres-audit-rollback@example.test",
    }, {
      auditWriter: async () => {
        throw new Error("Synthetic required Audit failure");
      },
    }), /Synthetic required Audit failure/);
    const afterRollback = await Promise.all([
      countRows(client, "contacts"),
      countRows(client, "inquiries"),
      countRows(client, "inquiry_assets"),
      countRows(client, "inquiry_status_history"),
      countRows(client, "notification_outbox"),
      countRows(client, "audit_logs"),
    ]);
    assert.deepEqual(afterRollback, beforeRollback);

    await client`
      insert into inquiries (
        public_reference, contact_id, submitted_name, submitted_email,
        idempotency_key, source_page_path, source_entity_type, source_entity_id
      )
      select
        'CWT-PLAN-' || value,
        (select id from contacts limit 1),
        'Synthetic plan row', 'plan@example.test',
        'plan-' || value, '/get-quote/', 'product',
        (md5('stage5-plan-' || value::text))::uuid
      from generate_series(1, 200) as value
    `;
    await client`analyze inquiries`;
    await client`set enable_seqscan = off`;
    const plan = await client.unsafe<Array<{ "QUERY PLAN": string }>>(
      `explain select id from inquiries where source_entity_type = 'product' and source_entity_id = (md5('stage5-plan-100'))::uuid`,
    );
    await client`reset enable_seqscan`;
    assert.match(plan.map((row) => row["QUERY PLAN"]).join("\n"), /inquiries_source_entity_idx/);

    for (const invalid of [
      { label: "type without id", statement: `update inquiries set source_entity_type = 'product', source_entity_id = null where id = '${equal[0]!.inquiryId}'` },
      { label: "unsupported paired type", statement: `update inquiries set source_entity_type = 'unsupported', source_entity_id = '${equal[0]!.inquiryId}' where id = '${equal[0]!.inquiryId}'` },
      { label: "id without type", statement: `update inquiries set source_entity_type = null, source_entity_id = '${equal[0]!.inquiryId}' where id = '${equal[0]!.inquiryId}'` },
    ]) {
      let rejected = false;
      try {
        await client.unsafe(invalid.statement);
      } catch {
        rejected = true;
      }
      assert.equal(rejected, true, `Constraint accepted ${invalid.label}`);
    }

    return {
      columns: columns.map((row) => row.column_name),
      equalConcurrency: "one create plus one replay",
      differentConcurrency: "one create plus one conflict",
      auditRollback: "six-table counts unchanged",
      requiredPathBoundary: "raw v2 query and fragment rejected with six-table counts unchanged",
      indexPlan: "inquiries_source_entity_idx",
    };
  } finally {
    await client.end();
    await connection.close();
  }
}

async function verifyUpgrade(url: string): Promise<Record<string, unknown>> {
  const directory = await migrationDirectoryThrough(21);
  const connection = appConnection(url);
  const client = postgres(url, { max: 6, prepare: false });
  const v1Input: CreateInquiryInput = {
    idempotencyKey: "postgres-upgrade-v1-0001",
    name: "Synthetic Upgrade Buyer",
    email: "postgres-upgrade@example.test",
    description: "Synthetic v1 Upgrade replay.",
    sourcePagePath: "/GET-QUOTE?historical=true",
    referrer: "https://first.example",
    utmSource: "legacy-source",
    attributionConfidence: "high",
  };
  try {
    await migrateDatabase(connection, directory);
    const [actor] = await connection.db.insert(schema.users).values({
      email: "stage5-upgrade-actor@example.test",
      displayName: "Synthetic Stage 5 Upgrade Actor",
      role: "product_editor",
      passwordHash: "synthetic-test-only",
    }).returning({ id: schema.users.id });
    const [taxonomy] = await connection.db.insert(schema.taxonomyTerms).values({
      internalKey: "synthetic-stage5-upgrade-term",
      dimension: "material_fiber",
    }).returning({ id: schema.taxonomyTerms.id });
    let productId = "";
    await connection.db.transaction(async (transaction) => {
      const [product] = await transaction.insert(schema.products).values({
        createdByUserId: actor!.id,
      }).returning({ id: schema.products.id });
      productId = product!.id;
      await transaction.insert(schema.productLocalizations).values({
        productId,
        locale: "en",
        name: "Synthetic Stage 5 Upgrade Product",
      });
      await transaction.insert(schema.productTaxonomyTerms).values({
        productId,
        taxonomyTermId: taxonomy!.id,
        isPrimary: true,
      });
    });
    await connection.db.insert(schema.routes).values({
      path: "/synthetic-stage5-upgrade/",
      entityType: "static_page",
    });
    await connection.db.insert(schema.analyticsConsents).values({
      consentSessionId: "synthetic-stage5-upgrade-consent",
      status: "granted",
      consentVersion: 1,
      grantedAt: new Date("2026-08-29T00:00:00.000Z"),
    });
    await connection.db.insert(schema.conversionEvents).values({
      eventId: "synthetic_stage5_upgrade_event",
      eventName: "quote_cta_click",
      anonymousSessionId: "synthetic-stage5-upgrade-session",
      routePath: "/get-quote/",
      consentState: "granted",
      safeProperties: { placement: "synthetic_upgrade_fixture" },
      occurredAt: new Date("2026-08-29T00:00:00.000Z"),
    });
    const [modelConfig] = await connection.db.insert(schema.aiModelConfig).values({
      useCase: "product_description_draft",
      provider: "synthetic_stage5",
      model: "synthetic-stage5-text-v1",
      promptId: "product-description-draft",
      promptVersion: 1,
      promptHash: "a".repeat(64),
      enabled: true,
      isDefault: true,
      createdByUserId: actor!.id,
      updatedByUserId: actor!.id,
    }).returning({ id: schema.aiModelConfig.id });
    await connection.db.insert(schema.aiRuns).values({
      useCase: "product_description_draft",
      requestedByUserId: actor!.id,
      idempotencyKey: "73000000-0000-4000-8000-000000000001",
      requestFingerprint: "b".repeat(64),
      targetType: "product_draft",
      targetProductId: productId,
      targetLocale: "en",
      expectedTargetVersion: 1,
      targetSnapshotHash: "c".repeat(64),
      modelConfigId: modelConfig!.id,
      modelConfigVersion: 1,
      resolvedConfigHash: "d".repeat(64),
      requestedProvider: "synthetic_stage5",
      requestedModel: "synthetic-stage5-text-v1",
      parametersSnapshotJson: {},
      maxInputTokens: 16000,
      maxOutputTokens: 4000,
      maxAttempts: 3,
      promptId: "product-description-draft",
      promptVersion: 1,
      promptHash: "e".repeat(64),
      providerEnvelopeVersion: 1,
      providerEnvelopeHash: "f".repeat(64),
      inputSchemaVersion: 1,
      outputSchemaVersion: 1,
      policyVersion: "stage4a-v1",
      inputContextJson: { product: { name: "Synthetic Stage 5 Upgrade Product" } },
      inputHash: "0".repeat(64),
      executionEnvironment: "test",
      budgetPolicyVersion: "nonbillable-v1",
      runCostLimitMicrousd: 20000,
      dailyHardLimitMicrousd: 0,
      monthlyWarningLimitMicrousd: 0,
      monthlyHardLimitMicrousd: 0,
      estimatedMaxCostMicrousd: 0,
      pricingSnapshotJson: {},
    });
    const [contact] = await client<{ id: string }[]>`
      insert into contacts (name, email, normalized_email)
      values (${v1Input.name}, ${v1Input.email}, ${v1Input.email}) returning id
    `;
    assert.ok(contact);
    await client`
      insert into inquiries (
        public_reference, contact_id, submitted_name, submitted_email, description,
        idempotency_key, request_fingerprint, request_fingerprint_version,
        source_page_path, referrer, utm_source, attribution_confidence
      ) values (
        'CWT-SYNTHETIC-UPGRADE-V1', ${contact.id}, ${v1Input.name}, ${v1Input.email},
        ${v1Input.description ?? null}, ${v1Input.idempotencyKey},
        ${createInquiryRequestFingerprintV1(v1Input)}, 1,
        '/get-quote/', ${v1Input.referrer ?? null}, ${v1Input.utmSource ?? null}, 'high'
      )
    `;
    await client`
      insert into notification_outbox (kind, aggregate_type, aggregate_id, payload, delivery_key)
      select 'inquiry_notification', 'inquiry', id, '{"synthetic":true}'::jsonb,
        'upgrade:' || id::text from inquiries where idempotency_key = ${v1Input.idempotencyKey}
    `;
    await client`
      insert into audit_logs (action, entity_type, entity_id)
      select 'synthetic.upgrade', 'inquiry', id from inquiries where idempotency_key = ${v1Input.idempotencyKey}
    `;
    const before = {
      inquiries: await countRows(client, "inquiries"),
      outbox: await countRows(client, "notification_outbox"),
      audits: await countRows(client, "audit_logs"),
      routes: await countRows(client, "routes"),
      consents: await countRows(client, "analytics_consents"),
      conversions: await countRows(client, "conversion_events"),
      aiConfig: await countRows(client, "ai_model_config"),
      aiRuns: await countRows(client, "ai_runs"),
    };

    await migrateDatabase(connection);
    await migrateDatabase(connection);
    const replay = await createInquiry(connection.db, new SilentNotifier(), {
      ...v1Input,
      submitReferrer: "https://submit.example/",
      submitUtmSource: "ignored-by-v1",
    });
    assert.equal(replay.replayed, true);
    const legacy = await client<{
      submit_referrer: string | null;
      source_entity_type: string | null;
      source_entity_id: string | null;
    }[]>`
      select submit_referrer, source_entity_type, source_entity_id
      from inquiries where idempotency_key = ${v1Input.idempotencyKey}
    `;
    assert.deepEqual(legacy[0], {
      submit_referrer: null,
      source_entity_type: null,
      source_entity_id: null,
    });
    assert.deepEqual({
      inquiries: await countRows(client, "inquiries"),
      outbox: await countRows(client, "notification_outbox"),
      audits: await countRows(client, "audit_logs"),
      routes: await countRows(client, "routes"),
      consents: await countRows(client, "analytics_consents"),
      conversions: await countRows(client, "conversion_events"),
      aiConfig: await countRows(client, "ai_model_config"),
      aiRuns: await countRows(client, "ai_runs"),
    }, before);

    const v2Input: CreateInquiryInput = {
      idempotencyKey: "postgres-upgrade-v2-0001",
      name: "Synthetic Upgrade V2 Buyer",
      email: "postgres-upgrade-v2@example.test",
      description: "Synthetic v2 Upgrade replay.",
      sourcePagePath: "/get-quote/",
      submitUtmCampaign: "campaign-1234567",
    };
    const v2 = await createInquiry(connection.db, new SilentNotifier(), v2Input);
    const v2Replay = await createInquiry(connection.db, new SilentNotifier(), {
      ...v2Input,
      submitUtmCampaign: "phone:138:0013:8000",
    });
    assert.equal(v2Replay.inquiryId, v2.inquiryId);
    assert.equal(v2Replay.replayed, true);

    return {
      legacyRows: "Inquiry, Outbox, Audit, route, analytics and AI rows preserved; six new Inquiry columns null",
      v1Replay: "exact read-only dispatch",
      v2Replay: "unsafe-null equality",
      repeat: "no-op pass",
    };
  } finally {
    await client.end();
    await connection.close();
    await rm(directory, { recursive: true, force: true });
  }
}

async function main(): Promise<void> {
  if (process.env.CWT_STAGE5_F1_POSTGRES_VALIDATION !== "isolated-synthetic-database") {
    throw new Error(
      "Set CWT_STAGE5_F1_POSTGRES_VALIDATION=isolated-synthetic-database for the guarded verifier.",
    );
  }
  const adminUrl = guardedAdminUrl();
  const admin = postgres(adminUrl.toString(), { max: 1, prepare: false });
  const suffix = randomBytes(6).toString("hex");
  const freshName = `${databasePrefix}fresh_${suffix}`;
  const upgradeName = `${databasePrefix}upgrade_${suffix}`;
  const databases = [freshName, upgradeName];
  try {
    const server = await admin<{ version: string; address: string | null }[]>`
      select current_setting('server_version') as version, inet_server_addr()::text as address
    `;
    assert.match(server[0]?.version ?? "", /^18\.4(?:\s|$)/);
    for (const databaseName of databases) await createDatabase(admin, databaseName);
    const fresh = await verifyFresh(databaseUrl(adminUrl, freshName));
    const upgrade = await verifyUpgrade(databaseUrl(adminUrl, upgradeName));
    process.stdout.write(`${JSON.stringify({
      status: "pass",
      server: server[0],
      fresh,
      upgrade,
    }, null, 2)}\n`);
  } finally {
    for (const databaseName of databases.reverse()) {
      await dropDatabase(admin, databaseName);
    }
    const remaining = await admin<{ datname: string }[]>`
      select datname from pg_database where datname like ${`${databasePrefix}%`}
    `;
    assert.equal(remaining.length, 0);
    await admin.end();
  }
}

void main();
