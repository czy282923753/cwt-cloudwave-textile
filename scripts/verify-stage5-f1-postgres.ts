import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import postgres, { type Sql } from "postgres";
import { and, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";

import {
  createInquiry,
  createInquiryRequestFingerprintV1,
  InquiryIdempotencyConflictError,
  type CreateInquiryInput,
} from "../src/crm/inquiry-service";
import {
  getInquiryCrmReadProjection,
  listInquiryCrmSummaries,
} from "../src/crm/inquiry-read-projection";
import * as schema from "../src/db/schema";
import { migrateDatabase } from "../src/db/migrate";
import type { DatabaseConnection } from "../src/db/client";
import {
  applyEmailTemplateRevision,
  listEmailTemplateHistory,
  previewSyntheticEmailTemplate,
  resolveActiveEmailTemplate,
  rollbackEmailTemplate,
  saveEmailTemplateDraft,
  submitEmailTemplateDraftForReview,
} from "../src/email-templates/service";
import {
  InMemoryCaptureEmailTransport,
  sendSyntheticEmailTemplateTest,
} from "../src/email-templates/test-send";
import type { EmailEnvelopePolicy } from "../src/integrations/email";
import {
  claimNotificationOutboxJob,
  deliverNotificationOutboxJob,
  deliverPendingNotificationOutbox,
  listDueNotificationOutboxJobIds,
  OUTBOX_MAX_ATTEMPTS,
} from "../src/integrations/notification-outbox";
import { parseNotificationOutboxPayload } from "../src/integrations/notification-outbox-payload";

const databasePrefix = "cwt_s5f1_synthetic_";

function sequenceClock(...instants: readonly string[]) {
  let index = 0;
  return {
    clock: () => {
      const instant = instants[index];
      if (!instant) throw new Error(`Synthetic PostgreSQL clock exhausted at ${index + 1}.`);
      index += 1;
      return new Date(instant);
    },
    calls: () => index,
  };
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

async function createSyntheticSourceFixtures(
  connection: Extract<DatabaseConnection, { kind: "postgres" }>,
) {
  const [reviewer] = await connection.db.insert(schema.users).values({
    email: "stage5-f2a-postgres-reviewer@example.test",
    displayName: "Synthetic Stage 5 F2A Reviewer",
    role: "reviewer_publisher",
    passwordHash: "synthetic-test-only",
  }).returning({ id: schema.users.id });
  const [taxonomy] = await connection.db.insert(schema.taxonomyTerms).values({
    internalKey: "synthetic-stage5-f2a-primary",
    dimension: "material_fiber",
  }).returning({ id: schema.taxonomyTerms.id });
  const [image] = await connection.db.insert(schema.assets).values({
    originalFileName: "synthetic-stage5-f2a.jpg",
    storageProvider: "test",
    storagePartition: "public",
    objectKey: "synthetic/stage5-f2a.jpg",
    access: "public",
    category: "product",
    status: "ready",
    scanStatus: "passed",
    declaredMimeType: "image/jpeg",
    detectedMimeType: "image/jpeg",
    byteSize: 128,
    sha256: "synthetic-stage5-f2a-postgres-image",
  }).returning({ id: schema.assets.id });
  assert.ok(reviewer && taxonomy && image);
  const product = await connection.db.transaction(async (transaction) => {
    const [created] = await transaction.insert(schema.products).values({
      status: "draft",
      realProductBasis: "physical_sample",
      realProductConfirmedByUserId: reviewer.id,
      realProductConfirmedAt: new Date(),
      publishedAt: new Date(),
    }).returning({ id: schema.products.id });
    assert.ok(created);
    await transaction.insert(schema.productTaxonomyTerms).values({
      productId: created.id,
      taxonomyTermId: taxonomy.id,
      isPrimary: true,
    });
    return created;
  });
  await connection.db.insert(schema.productLocalizations).values({
    productId: product.id,
    locale: "en",
    name: "Synthetic Stage 5 F2A Product",
  });
  await connection.db.insert(schema.productAssets).values({
    productId: product.id,
    assetId: image.id,
    role: "hero",
  });
  await connection.db.update(schema.products).set({ status: "published" })
    .where(eq(schema.products.id, product.id));
  const productPath = "/products/synthetic-stage5-f2a/";
  await connection.db.insert(schema.routes).values({
    locale: "en",
    path: productPath,
    entityType: "product",
    entityId: product.id,
  });

  const [application] = await connection.db.insert(schema.applications).values({
    internalKey: "synthetic-stage5-f2a-application",
    status: "published",
    publishedAt: new Date(),
  }).returning({ id: schema.applications.id });
  assert.ok(application);
  await connection.db.insert(schema.applicationLocalizations).values({
    applicationId: application.id,
    locale: "en",
    name: "Synthetic Stage 5 F2A Application",
    body: "Synthetic published Application body.",
  });
  const applicationPath = "/applications/synthetic-stage5-f2a/";
  const [applicationRoute] = await connection.db.insert(schema.routes).values({
    locale: "en",
    path: applicationPath,
    entityType: "application",
    entityId: application.id,
  }).returning({ id: schema.routes.id });
  assert.ok(applicationRoute);
  await connection.db.insert(schema.seoMetadata).values({
    routeId: applicationRoute.id,
    title: "Synthetic Stage 5 F2A Application",
    canonicalPath: applicationPath,
    indexStatus: "noindex",
  });

  const [author] = await connection.db.insert(schema.authors).values({
    internalKey: "synthetic-stage5-f2a-author",
    displayName: "Synthetic Stage 5 F2A Author",
    isOrganization: true,
  }).returning({ id: schema.authors.id });
  assert.ok(author);
  const [content] = await connection.db.insert(schema.contents).values({
    channel: "fabric_knowledge",
    type: "article",
    status: "published",
    authorId: author.id,
    publishedAt: new Date(),
  }).returning({ id: schema.contents.id });
  assert.ok(content);
  await connection.db.insert(schema.contentLocalizations).values({
    contentId: content.id,
    locale: "en",
    title: "Synthetic Stage 5 F2A Content",
    body: "Synthetic published Content body.",
    structuredBlocks: {
      version: 1,
      blocks: [{ id: "synthetic", type: "paragraph", text: "Synthetic PostgreSQL source." }],
    },
  });
  const contentPath = "/fabric-knowledge/synthetic-stage5-f2a/";
  const [contentRoute] = await connection.db.insert(schema.routes).values({
    locale: "en",
    path: contentPath,
    entityType: "content",
    entityId: content.id,
  }).returning({ id: schema.routes.id });
  assert.ok(contentRoute);
  await connection.db.insert(schema.seoMetadata).values({
    routeId: contentRoute.id,
    title: "Synthetic Stage 5 F2A Content",
    canonicalPath: contentPath,
    indexStatus: "noindex",
  });

  return {
    productId: product.id,
    productPath,
    applicationId: application.id,
    applicationPath,
    applicationRouteId: applicationRoute.id,
    contentId: content.id,
    contentPath,
  };
}

async function verifyTemplateAuthority(
  connection: Extract<DatabaseConnection, { kind: "postgres" }>,
): Promise<Record<string, unknown>> {
  const actors = await connection.db.insert(schema.users).values([
    {
      email: "stage5-f3-postgres-editor@example.test",
      displayName: "Synthetic Stage 5 F3 Editor",
      role: "content_editor",
      passwordHash: "synthetic-test-only",
    },
    {
      email: "stage5-f3-postgres-reviewer@example.test",
      displayName: "Synthetic Stage 5 F3 Reviewer",
      role: "reviewer_publisher",
      passwordHash: "synthetic-test-only",
    },
    {
      email: "stage5-f3-postgres-admin@example.test",
      displayName: "Synthetic Stage 5 F3 Admin",
      role: "admin",
      passwordHash: "synthetic-test-only",
    },
  ]).returning({ id: schema.users.id, role: schema.users.role });
  const actor = <TRole extends "content_editor" | "reviewer_publisher" | "admin">(
    role: TRole,
  ) => ({ userId: actors.find((row) => row.role === role)!.id, role });
  const editor = actor("content_editor");
  const reviewer = actor("reviewer_publisher");
  const admin = actor("admin");
  const input = (subjectSource: string) => ({
    templateKind: "inquiry_customer_confirmation" as const,
    subjectSource,
    textBodySource:
      "Synthetic PostgreSQL body {{customer_name}} {{inquiry_reference}} {{submitted_at}} {{company_name}} {{reply_to_email}}",
    changeSummary: "Synthetic PostgreSQL template proof",
    expectedDraftVersion: 0,
  });

  const concurrent = await Promise.allSettled([
    saveEmailTemplateDraft(connection.db, editor, input("Synthetic PostgreSQL concurrent A")),
    saveEmailTemplateDraft(connection.db, editor, input("Synthetic PostgreSQL concurrent B")),
  ]);
  assert.equal(concurrent.filter((result) => result.status === "fulfilled").length, 1);
  assert.equal(concurrent.filter((result) => result.status === "rejected").length, 1);
  const firstResult = concurrent.find((result) => result.status === "fulfilled");
  assert.ok(firstResult?.status === "fulfilled");
  const first = firstResult.value;
  await submitEmailTemplateDraftForReview(connection.db, editor, {
    revisionId: first.revisionId,
    expectedDraftVersion: first.draftVersion,
  });
  await applyEmailTemplateRevision(connection.db, reviewer, first.revisionId);

  const second = await saveEmailTemplateDraft(
    connection.db,
    editor,
    input("Synthetic PostgreSQL Active V2"),
  );
  await submitEmailTemplateDraftForReview(connection.db, editor, {
    revisionId: second.revisionId,
    expectedDraftVersion: second.draftVersion,
  });
  await applyEmailTemplateRevision(connection.db, reviewer, second.revisionId);
  const activeV2 = await resolveActiveEmailTemplate(
    connection.db,
    "inquiry_customer_confirmation",
  );
  assert.equal(activeV2.provenance.revisionId, second.revisionId);
  assert.equal(activeV2.template.subjectSource, "Synthetic PostgreSQL Active V2");

  const third = await saveEmailTemplateDraft(
    connection.db,
    editor,
    input("Synthetic PostgreSQL Audit rollback V3"),
  );
  await submitEmailTemplateDraftForReview(connection.db, editor, {
    revisionId: third.revisionId,
    expectedDraftVersion: third.draftVersion,
  });
  await assert.rejects(applyEmailTemplateRevision(
    connection.db,
    reviewer,
    third.revisionId,
    { auditWriter: async () => { throw new Error("Synthetic required Template Audit failure"); } },
  ), /Synthetic required Template Audit failure/);
  const [rolledBackRevision] = await connection.db.select({
    status: schema.editorialRevisions.status,
  }).from(schema.editorialRevisions).where(eq(schema.editorialRevisions.id, third.revisionId));
  assert.equal(rolledBackRevision?.status, "in_review");
  assert.equal((await resolveActiveEmailTemplate(
    connection.db,
    "inquiry_customer_confirmation",
  )).provenance.revisionId, second.revisionId);

  const rollback = await rollbackEmailTemplate(connection.db, reviewer, {
    templateKind: "inquiry_customer_confirmation",
    sourceRevisionId: first.revisionId,
  });
  assert.equal(rollback.provenance.revisionVersion, 4);
  assert.notEqual(rollback.provenance.revisionId, first.revisionId);
  const history = await listEmailTemplateHistory(
    connection.db,
    reviewer.role,
    "inquiry_customer_confirmation",
  );
  assert.deepEqual(history.map((entry) => entry.revisionVersion), [4, 3, 2, 1]);
  assert.equal(history[0]?.template.rollbackSourceRevisionId, first.revisionId);
  const settingRows = await connection.db.select().from(schema.systemSettings).where(
    eq(schema.systemSettings.key, "email_template.inquiry_customer_confirmation"),
  );
  assert.equal(settingRows.length, 1);
  assert.equal(settingRows[0]?.isSensitive, false);
  assert.equal(
    (settingRows[0]?.value as { revisionId?: string }).revisionId,
    rollback.provenance.revisionId,
  );

  const preview = await previewSyntheticEmailTemplate(
    connection.db,
    editor,
    "inquiry_customer_confirmation",
  );
  assert.equal(preview.contextId, "SYNTHETIC_EMAIL_TEMPLATE_V1");
  const capture = new InMemoryCaptureEmailTransport();
  const testSend = await sendSyntheticEmailTemplateTest(connection.db, admin, {
    templateKind: "inquiry_customer_confirmation",
    environment: "test",
  }, capture);
  assert.equal(testSend.outcome, "success");
  assert.equal(capture.captured.length, 1);
  assert.equal(capture.captured[0]?.to, "test@cwtextile.com");
  assert.equal(capture.captured[0]?.subject.match(/\[TEST\]/g)?.length, 1);

  await assert.rejects(saveEmailTemplateDraft(
    connection.db,
    editor,
    {
      templateKind: "inquiry_notification",
      subjectSource: "Synthetic required Audit rollback",
      textBodySource: "Synthetic {{inquiry_reference}} {{operations_url}}",
      changeSummary: "Synthetic required Audit rollback",
      expectedDraftVersion: 0,
    },
    { auditWriter: async () => { throw new Error("Synthetic Draft Audit failure"); } },
  ), /Synthetic Draft Audit failure/);
  const internalSettings = await connection.db.select().from(schema.systemSettings).where(
    eq(schema.systemSettings.key, "email_template.inquiry_notification"),
  );
  assert.equal(internalSettings.length, 0);

  const templateAudits = await connection.db.select().from(schema.auditLogs).where(and(
    eq(schema.auditLogs.entityType, "editorial_revision"),
  ));
  const serializedAudits = JSON.stringify(templateAudits);
  assert.doesNotMatch(serializedAudits, /Synthetic PostgreSQL body|test@cwtextile\.com/);
  return {
    draftConcurrency: "one current Draft and one conflict under concurrent first save",
    versions: history.map((entry) => entry.revisionVersion),
    soleActivePointer: rollback.provenance.revisionId,
    auditRollback: "failed Apply left Active V2 and Revision V3 in_review",
    rollback: "historical V1 copied to new applied V4",
    preview: preview.contextId,
    testSend: "one capture-only call, fixed recipient, one TEST prefix",
  };
}

async function verifyOutboxConvergence(
  connection: Extract<DatabaseConnection, { kind: "postgres" }>,
  client: Sql,
): Promise<Record<string, unknown>> {
  const policy: EmailEnvelopePolicy = {
    environment: "test",
    applicationOrigin: "http://localhost:3000",
    emailDriver: "log",
    emailFrom: "",
    internalRecipient: "info@cwtextile.com",
    smtpHost: "",
    smtpPort: 587,
    smtpSecure: false,
    smtpUser: "",
    smtpPassword: "",
    databaseDriver: "postgres",
    monitoringDriver: "log",
  };
  const beforeFailure = await Promise.all([
    countRows(client, "contacts"),
    countRows(client, "inquiries"),
    countRows(client, "inquiry_status_history"),
    countRows(client, "notification_outbox"),
    countRows(client, "audit_logs"),
  ]);
  await assert.rejects(createInquiry(connection.db, {
    idempotencyKey: "postgres-f4-second-job-failure-0001",
    name: "Synthetic PostgreSQL F4 Atomic Buyer",
    email: "postgres-f4-atomic@example.test",
    description: "Synthetic second-job rollback.",
    sourcePagePath: "/get-quote/",
  }, {
    beforeOutboxInsert: (kind) => {
      if (kind === "inquiry_customer_confirmation") {
        throw new Error("Synthetic PostgreSQL second Outbox failure");
      }
    },
  }), /second Outbox failure/);
  const afterFailure = await Promise.all([
    countRows(client, "contacts"),
    countRows(client, "inquiries"),
    countRows(client, "inquiry_status_history"),
    countRows(client, "notification_outbox"),
    countRows(client, "audit_logs"),
  ]);
  assert.deepEqual(afterFailure, beforeFailure);

  const created = await createInquiry(connection.db, {
    idempotencyKey: "postgres-f4-two-kind-0001",
    name: "Synthetic PostgreSQL F4 Buyer",
    email: "postgres-f4-buyer@example.test",
    countryCode: "CN",
    whatsapp: "+86 000 0000",
    description: "Synthetic immutable F4 render data.",
    sourcePagePath: "/get-quote/",
  });
  const replay = await createInquiry(connection.db, {
    idempotencyKey: "postgres-f4-two-kind-0001",
    name: "Synthetic PostgreSQL F4 Buyer",
    email: "postgres-f4-buyer@example.test",
    countryCode: "cn",
    whatsapp: "+86 000 0000",
    description: "Synthetic immutable F4 render data.",
    sourcePagePath: "/get-quote/",
  });
  assert.equal(replay.replayed, true);
  const jobs = await connection.db.select().from(schema.notificationOutbox)
    .where(eq(schema.notificationOutbox.aggregateId, created.inquiryId));
  assert.equal(jobs.length, 2);
  assert.deepEqual(new Set(jobs.map((job) => job.kind)), new Set([
    "inquiry_notification",
    "inquiry_customer_confirmation",
  ]));
  for (const job of jobs) {
    const parsed = parseNotificationOutboxPayload(job);
    assert.equal(parsed.format, "v1");
    const serialized = JSON.stringify(job.payload);
    assert.doesNotMatch(serialized, /postgres-f4-buyer@example\.test|\+86 000|immutable F4 render data/);
  }
  const claimTime = new Date("2026-08-30T06:00:00.000Z");
  const claimed = await Promise.all(jobs.map((job) =>
    claimNotificationOutboxJob(
      connection.db,
      job.id,
      `postgres-worker-${job.kind}`,
      claimTime,
    ),
  ));
  assert.equal(claimed.every(Boolean), true);
  assert.equal(claimed.every((job) => job?.attempts === job?.attemptCount), true);
  await connection.db.update(schema.notificationOutbox).set({
    status: "pending",
    attempts: 0,
    attemptCount: 0,
    lockedAt: null,
    lockedBy: null,
    leaseExpiresAt: null,
  }).where(eq(schema.notificationOutbox.id, jobs[0]!.id));
  const sameRow = await Promise.all([
    claimNotificationOutboxJob(connection.db, jobs[0]!.id, "losing-worker-a", claimTime),
    claimNotificationOutboxJob(connection.db, jobs[0]!.id, "losing-worker-b", claimTime),
  ]);
  assert.equal(sameRow.filter(Boolean).length, 1);
  await connection.db.update(schema.notificationOutbox).set({
    status: "pending",
    attempts: 0,
    attemptCount: 0,
    lockedAt: null,
    lockedBy: null,
    leaseExpiresAt: null,
  }).where(eq(schema.notificationOutbox.aggregateId, created.inquiryId));
  const capture = new InMemoryCaptureEmailTransport();
  for (const job of jobs) {
    assert.equal(await deliverNotificationOutboxJob(connection.db, capture, job.id, {
      policy,
      workerId: `postgres-delivery-${job.kind}`,
      clock: () => new Date("2026-08-30T06:02:00.000Z"),
    }), true);
  }
  assert.equal(capture.captured.length, 2);
  assert.deepEqual(new Set(capture.captured.map((envelope) => envelope.to)), new Set([
    "info@cwtextile.com",
    "postgres-f4-buyer@example.test",
  ]));
  assert.equal(capture.captured.every((envelope) =>
    envelope.messageId.includes("inquiry-") && !envelope.textBody.includes("objectKey")), true);

  await client`set enable_seqscan = off`;
  const plan = await client<{ "QUERY PLAN": string }[]>`
    explain select id from notification_outbox
    where status in ('pending', 'failed') and next_attempt_at <= now()
    order by created_at limit 25
  `;
  await client`reset enable_seqscan`;
  assert.match(plan.map((row) => row["QUERY PLAN"]).join("\n"), /notification_outbox_delivery_idx/);
  return {
    atomicity: "second-job failure left five table counts unchanged",
    twoKindRows: jobs.map((job) => ({ kind: job.kind, deliveryKey: job.deliveryKey })),
    replay: "exact replay created no additional job",
    claim: "job-ID two-kind simultaneous claim and same-row fencing",
    render: "both kinds captured with stable Message-ID and no private-file load",
    queryPlan: "notification_outbox_delivery_idx",
  };
}

async function verifyOutboxRemediation(
  connection: Extract<DatabaseConnection, { kind: "postgres" }>,
): Promise<Record<string, unknown>> {
  const policy: EmailEnvelopePolicy = {
    environment: "test",
    applicationOrigin: "http://localhost:3000",
    emailDriver: "log",
    emailFrom: "",
    internalRecipient: "info@cwtextile.com",
    smtpHost: "",
    smtpPort: 587,
    smtpSecure: false,
    smtpUser: "",
    smtpPassword: "",
    databaseDriver: "postgres",
    monitoringDriver: "log",
  };

  async function createProbe(suffix: string) {
    const created = await createInquiry(connection.db, {
      idempotencyKey: `postgres-f4-r1-${suffix}-0001`,
      name: `Synthetic PostgreSQL ${suffix} Buyer`,
      email: `postgres-f4-r1-${suffix}@example.test`,
      description: `Synthetic PostgreSQL ${suffix} evidence.`,
      sourcePagePath: "/get-quote/",
    });
    const jobs = await connection.db.select().from(schema.notificationOutbox)
      .where(eq(schema.notificationOutbox.aggregateId, created.inquiryId));
    const internal = jobs.find((job) => job.kind === "inquiry_notification");
    const customer = jobs.find((job) => job.kind === "inquiry_customer_confirmation");
    assert.ok(internal && customer);
    return { created, internal, customer };
  }

  function legacyPayload(inquiryId: string) {
    return {
      inquiryId,
      name: "Synthetic PostgreSQL Legacy Buyer",
      email: "postgres-legacy@example.test",
      countryCode: "CN",
      whatsapp: null,
      description: "Synthetic strict historical payload.",
      attachmentCount: 0,
    };
  }

  const legacyCapture = new InMemoryCaptureEmailTransport();
  for (const [suffix, createdAt, deliveryAt] of [
    ["legacy-before", "2026-08-29T23:59:59.999Z", "2026-08-30T00:01:00.000Z"],
    ["legacy-at", "2026-08-30T00:00:00.000Z", "2026-08-30T00:02:00.000Z"],
    ["legacy-after", "2036-08-30T00:00:00.000Z", "2036-08-30T00:01:00.000Z"],
  ] as const) {
    const probe = await createProbe(suffix);
    await connection.db.update(schema.notificationOutbox).set({
      payload: legacyPayload(probe.created.inquiryId),
      createdAt: new Date(createdAt),
      nextAttemptAt: new Date(0),
    }).where(eq(schema.notificationOutbox.id, probe.internal.id));
    assert.equal(await deliverNotificationOutboxJob(
      connection.db,
      legacyCapture,
      probe.internal.id,
      {
        policy,
        workerId: `postgres-${suffix}-worker`,
        clock: () => new Date(deliveryAt),
      },
    ), true);
  }
  assert.equal(legacyCapture.captured.length, 3);

  const rejectedCapture = new InMemoryCaptureEmailTransport();
  const customerLegacy = await createProbe("legacy-customer-rejected");
  await connection.db.update(schema.notificationOutbox).set({
    payload: legacyPayload(customerLegacy.created.inquiryId),
    nextAttemptAt: new Date(0),
  }).where(eq(schema.notificationOutbox.id, customerLegacy.customer.id));
  assert.equal(await deliverNotificationOutboxJob(
    connection.db,
    rejectedCapture,
    customerLegacy.customer.id,
    { policy, clock: () => new Date("2036-08-30T01:00:00.000Z") },
  ), false);

  const pollutedLegacy = await createProbe("legacy-polluted-rejected");
  await connection.db.update(schema.notificationOutbox).set({
    payload: { ...legacyPayload(pollutedLegacy.created.inquiryId), schema_version: 1 },
    nextAttemptAt: new Date(0),
  }).where(eq(schema.notificationOutbox.id, pollutedLegacy.internal.id));
  assert.equal(await deliverNotificationOutboxJob(
    connection.db,
    rejectedCapture,
    pollutedLegacy.internal.id,
    { policy, clock: () => new Date("2036-08-30T01:01:00.000Z") },
  ), false);

  const unsupportedVersion = await createProbe("legacy-version-rejected");
  await connection.db.update(schema.notificationOutbox).set({
    payload: { schema_version: 2, inquiry_id: unsupportedVersion.created.inquiryId },
    nextAttemptAt: new Date(0),
  }).where(eq(schema.notificationOutbox.id, unsupportedVersion.internal.id));
  assert.equal(await deliverNotificationOutboxJob(
    connection.db,
    rejectedCapture,
    unsupportedVersion.internal.id,
    { policy, clock: () => new Date("2036-08-30T01:02:00.000Z") },
  ), false);

  const terminalLegacy = await createProbe("legacy-terminal-rejected");
  await connection.db.update(schema.notificationOutbox).set({
    status: "sent",
    payload: legacyPayload(terminalLegacy.created.inquiryId),
    nextAttemptAt: new Date(0),
  }).where(eq(schema.notificationOutbox.id, terminalLegacy.internal.id));
  assert.equal(await deliverNotificationOutboxJob(
    connection.db,
    rejectedCapture,
    terminalLegacy.internal.id,
    { policy, clock: () => new Date("2036-08-30T01:03:00.000Z") },
  ), false);
  assert.equal(rejectedCapture.captured.length, 0);

  await connection.db.update(schema.notificationOutbox).set({
    nextAttemptAt: new Date("2099-01-01T00:00:00.000Z"),
  });
  const attemptsProbe = await createProbe("attempt-matrix");
  await connection.db.update(schema.notificationOutbox).set({
    nextAttemptAt: new Date("2099-01-01T00:00:00.000Z"),
  }).where(eq(schema.notificationOutbox.id, attemptsProbe.customer.id));
  for (let attempt = 0; attempt < OUTBOX_MAX_ATTEMPTS; attempt += 1) {
    const now = new Date(`2036-08-30T02:0${attempt}:00.000Z`);
    await connection.db.update(schema.notificationOutbox).set({
      status: "pending",
      attempts: attempt,
      attemptCount: attempt,
      nextAttemptAt: new Date(0),
      lockedAt: null,
      lockedBy: null,
      leaseExpiresAt: null,
      processedAt: null,
    }).where(eq(schema.notificationOutbox.id, attemptsProbe.internal.id));
    assert.ok((await listDueNotificationOutboxJobIds(connection.db, now))
      .includes(attemptsProbe.internal.id));
    const claimed = await claimNotificationOutboxJob(
      connection.db,
      attemptsProbe.internal.id,
      `postgres-attempt-${attempt}`,
      now,
    );
    assert.equal(claimed?.attempts, attempt + 1);
    assert.equal(claimed?.attemptCount, attempt + 1);
  }

  await connection.db.update(schema.notificationOutbox).set({
    status: "pending",
    attempts: 4,
    attemptCount: 4,
    nextAttemptAt: new Date(0),
    lockedAt: null,
    lockedBy: null,
    leaseExpiresAt: null,
  }).where(eq(schema.notificationOutbox.id, attemptsProbe.internal.id));
  const fifthSuccess = new InMemoryCaptureEmailTransport();
  assert.equal(await deliverNotificationOutboxJob(
    connection.db,
    fifthSuccess,
    attemptsProbe.internal.id,
    {
      policy,
      workerId: "postgres-fifth-success",
      clock: () => new Date("2036-08-30T02:10:00.000Z"),
    },
  ), true);
  const [sentAtFive] = await connection.db.select().from(schema.notificationOutbox)
    .where(eq(schema.notificationOutbox.id, attemptsProbe.internal.id));
  assert.deepEqual(
    { status: sentAtFive?.status, attempts: sentAtFive?.attempts, count: sentAtFive?.attemptCount },
    { status: "sent", attempts: 5, count: 5 },
  );

  await connection.db.update(schema.notificationOutbox).set({
    status: "pending",
    attempts: OUTBOX_MAX_ATTEMPTS,
    attemptCount: OUTBOX_MAX_ATTEMPTS,
    nextAttemptAt: new Date("2099-01-01T00:00:00.000Z"),
    lockedAt: null,
    lockedBy: null,
    leaseExpiresAt: null,
    processedAt: null,
    lastErrorCode: null,
    lastError: null,
  }).where(eq(schema.notificationOutbox.id, attemptsProbe.internal.id));
  const exhaustedCapture = new InMemoryCaptureEmailTransport();
  assert.equal(await deliverNotificationOutboxJob(
    connection.db,
    exhaustedCapture,
    attemptsProbe.internal.id,
    { policy, clock: () => new Date("2036-08-30T02:20:00.000Z") },
  ), false);
  const [pendingExhausted] = await connection.db.select().from(schema.notificationOutbox)
    .where(eq(schema.notificationOutbox.id, attemptsProbe.internal.id));
  assert.deepEqual({
    status: pendingExhausted?.status,
    attempts: pendingExhausted?.attempts,
    count: pendingExhausted?.attemptCount,
    code: pendingExhausted?.lastErrorCode,
    lock: pendingExhausted?.lockedBy,
  }, {
    status: "dead",
    attempts: 5,
    count: 5,
    code: "outbox_attempts_exhausted",
    lock: null,
  });
  assert.equal(exhaustedCapture.captured.length, 0);

  await connection.db.update(schema.notificationOutbox).set({
    status: "failed",
    attempts: OUTBOX_MAX_ATTEMPTS,
    attemptCount: OUTBOX_MAX_ATTEMPTS,
    nextAttemptAt: new Date("2099-01-01T00:00:00.000Z"),
    processedAt: null,
    lastErrorCode: null,
    lastError: null,
  }).where(eq(schema.notificationOutbox.id, attemptsProbe.internal.id));
  assert.equal(await deliverNotificationOutboxJob(
    connection.db,
    exhaustedCapture,
    attemptsProbe.internal.id,
    { policy, clock: () => new Date("2036-08-30T02:20:30.000Z") },
  ), false);
  assert.equal((await connection.db.select().from(schema.notificationOutbox)
    .where(eq(schema.notificationOutbox.id, attemptsProbe.internal.id)))[0]
    ?.lastErrorCode, "outbox_attempts_exhausted");
  assert.equal(exhaustedCapture.captured.length, 0);

  await connection.db.update(schema.notificationOutbox).set({
    status: "pending",
    attempts: 4,
    attemptCount: 4,
    nextAttemptAt: new Date(0),
    lockedAt: null,
    lockedBy: null,
    leaseExpiresAt: null,
    processedAt: null,
  }).where(eq(schema.notificationOutbox.id, attemptsProbe.internal.id));
  assert.equal(await deliverNotificationOutboxJob(
    connection.db,
    new InMemoryCaptureEmailTransport({ outcome: "failure", errorClass: "Synthetic" }),
    attemptsProbe.internal.id,
    { policy, clock: () => new Date("2036-08-30T02:21:00.000Z") },
  ), false);
  assert.equal((await connection.db.select().from(schema.notificationOutbox)
    .where(eq(schema.notificationOutbox.id, attemptsProbe.internal.id)))[0]?.status, "dead");

  const liveFifthAt = new Date("2036-08-30T02:30:00.000Z");
  await connection.db.update(schema.notificationOutbox).set({
    status: "processing",
    attempts: 5,
    attemptCount: 5,
    lockedAt: new Date(liveFifthAt.getTime() - 1_000),
    lockedBy: "postgres-live-fifth",
    leaseExpiresAt: new Date(liveFifthAt.getTime() + 1_000),
    processedAt: null,
  }).where(eq(schema.notificationOutbox.id, attemptsProbe.internal.id));
  assert.equal(await deliverNotificationOutboxJob(
    connection.db,
    exhaustedCapture,
    attemptsProbe.internal.id,
    { policy, clock: () => new Date(liveFifthAt) },
  ), false);
  assert.deepEqual((await connection.db.select({
    status: schema.notificationOutbox.status,
    lockedBy: schema.notificationOutbox.lockedBy,
  }).from(schema.notificationOutbox)
    .where(eq(schema.notificationOutbox.id, attemptsProbe.internal.id)))[0], {
    status: "processing",
    lockedBy: "postgres-live-fifth",
  });

  const expiredAt = new Date(liveFifthAt.getTime() + 2_000);
  const concurrentTerminalization = await Promise.all([
    deliverNotificationOutboxJob(
      connection.db,
      exhaustedCapture,
      attemptsProbe.internal.id,
      { policy, workerId: "postgres-direct-terminalizer", clock: () => new Date(expiredAt) },
    ),
    deliverPendingNotificationOutbox(connection.db, exhaustedCapture, {
      policy,
      workerId: "postgres-batch-terminalizer",
      clock: () => new Date(expiredAt),
    }),
  ]);
  assert.equal(concurrentTerminalization[0], false);
  assert.equal(exhaustedCapture.captured.length, 0);
  const [expiredDead] = await connection.db.select().from(schema.notificationOutbox)
    .where(eq(schema.notificationOutbox.id, attemptsProbe.internal.id));
  assert.deepEqual({
    status: expiredDead?.status,
    attempts: expiredDead?.attempts,
    count: expiredDead?.attemptCount,
    lockedBy: expiredDead?.lockedBy,
    lease: expiredDead?.leaseExpiresAt,
  }, { status: "dead", attempts: 5, count: 5, lockedBy: null, lease: null });
  assert.equal((await connection.db.select().from(schema.notificationOutbox)
    .where(eq(schema.notificationOutbox.id, attemptsProbe.customer.id)))[0]?.status, "pending");

  await connection.db.update(schema.notificationOutbox).set({
    status: "failed",
    attempts: 4,
    attemptCount: 5,
    nextAttemptAt: new Date(0),
    lockedAt: null,
    lockedBy: null,
    leaseExpiresAt: null,
    processedAt: null,
  }).where(eq(schema.notificationOutbox.id, attemptsProbe.internal.id));
  assert.equal(await deliverNotificationOutboxJob(
    connection.db,
    exhaustedCapture,
    attemptsProbe.internal.id,
    { policy, clock: () => new Date("2036-08-30T02:40:00.000Z") },
  ), false);
  assert.deepEqual((await connection.db.select({
    status: schema.notificationOutbox.status,
    attempts: schema.notificationOutbox.attempts,
    attemptCount: schema.notificationOutbox.attemptCount,
  }).from(schema.notificationOutbox)
    .where(eq(schema.notificationOutbox.id, attemptsProbe.internal.id)))[0], {
    status: "failed",
    attempts: 4,
    attemptCount: 5,
  });

  await connection.db.update(schema.notificationOutbox).set({
    nextAttemptAt: new Date("2099-01-01T00:00:00.000Z"),
  });
  const batchProbe = await createProbe("fresh-clock-batch");
  await connection.db.update(schema.notificationOutbox).set({ nextAttemptAt: new Date(0) })
    .where(eq(schema.notificationOutbox.aggregateId, batchProbe.created.inquiryId));
  const batchClock = sequenceClock(
    "2036-08-30T03:00:00.000Z",
    "2036-08-30T03:00:10.000Z",
    "2036-08-30T03:00:20.000Z",
    "2036-08-30T03:00:30.000Z",
    "2036-08-30T03:00:40.000Z",
  );
  const observedLeases: string[] = [];
  const batchTransport = {
    kind: "capture_only" as const,
    capture: async () => {
      const [processing] = await connection.db.select({
        leaseExpiresAt: schema.notificationOutbox.leaseExpiresAt,
      }).from(schema.notificationOutbox).where(and(
        eq(schema.notificationOutbox.status, "processing"),
        eq(schema.notificationOutbox.lockedBy, "postgres-fresh-clock-worker"),
      )).limit(1);
      assert.ok(processing?.leaseExpiresAt);
      observedLeases.push(processing.leaseExpiresAt.toISOString());
      return { outcome: "success" as const };
    },
  };
  assert.deepEqual(await deliverPendingNotificationOutbox(
    connection.db,
    batchTransport,
    {
      policy,
      workerId: "postgres-fresh-clock-worker",
      clock: batchClock.clock,
    },
  ), { attempted: 2, sent: 2 });
  assert.equal(batchClock.calls(), 5);
  assert.deepEqual(observedLeases, [
    "2036-08-30T03:01:10.000Z",
    "2036-08-30T03:01:30.000Z",
  ]);
  const batchRows = await connection.db.select().from(schema.notificationOutbox)
    .where(eq(schema.notificationOutbox.aggregateId, batchProbe.created.inquiryId));
  assert.deepEqual(batchRows.map((row) => row.processedAt?.toISOString()).sort(), [
    "2036-08-30T03:00:20.000Z",
    "2036-08-30T03:00:40.000Z",
  ]);

  const lateResults: Record<string, string> = {};
  for (const outcome of ["success", "failure", "exception"] as const) {
    const probe = await createProbe(`late-${outcome}`);
    await connection.db.update(schema.notificationOutbox).set({
      nextAttemptAt: new Date(0),
    }).where(eq(schema.notificationOutbox.id, probe.internal.id));
    const lateClock = sequenceClock(
      "2036-08-30T03:30:00.000Z",
      "2036-08-30T03:32:00.000Z",
    );
    const lateTransport = {
      kind: "capture_only" as const,
      capture: async () => {
        if (outcome === "exception") throw new Error("Synthetic PostgreSQL late detail");
        return outcome === "success"
          ? { outcome: "success" as const }
          : { outcome: "failure" as const, errorClass: "Synthetic_late_failure" };
      },
    };
    assert.equal(await deliverNotificationOutboxJob(
      connection.db,
      lateTransport,
      probe.internal.id,
      { policy, workerId: `postgres-late-${outcome}`, clock: lateClock.clock },
    ), false);
    assert.equal(lateClock.calls(), 2);
    const [lateRow] = await connection.db.select().from(schema.notificationOutbox)
      .where(eq(schema.notificationOutbox.id, probe.internal.id));
    assert.deepEqual({
      status: lateRow?.status,
      attempts: lateRow?.attempts,
      count: lateRow?.attemptCount,
      processedAt: lateRow?.processedAt,
    }, { status: "processing", attempts: 1, count: 1, processedAt: null });
    lateResults[outcome] = "fenced after fresh-time lease expiry";
  }

  const backoffProbe = await createProbe("fresh-backoff");
  await connection.db.update(schema.notificationOutbox).set({ nextAttemptAt: new Date(0) })
    .where(eq(schema.notificationOutbox.id, backoffProbe.internal.id));
  const backoffClock = sequenceClock(
    "2036-08-30T04:00:00.000Z",
    "2036-08-30T04:00:30.000Z",
  );
  assert.equal(await deliverNotificationOutboxJob(
    connection.db,
    new InMemoryCaptureEmailTransport({ outcome: "failure", errorClass: "Synthetic" }),
    backoffProbe.internal.id,
    { policy, workerId: "postgres-fresh-backoff", clock: backoffClock.clock },
  ), false);
  assert.equal((await connection.db.select().from(schema.notificationOutbox)
    .where(eq(schema.notificationOutbox.id, backoffProbe.internal.id)))[0]
    ?.nextAttemptAt.toISOString(), "2036-08-30T04:01:30.000Z");

  const currentTimeProbe = await createProbe("current-time-default");
  await connection.db.update(schema.notificationOutbox).set({ nextAttemptAt: new Date(0) })
    .where(eq(schema.notificationOutbox.id, currentTimeProbe.internal.id));
  assert.equal(await deliverNotificationOutboxJob(
    connection.db,
    new InMemoryCaptureEmailTransport(),
    currentTimeProbe.internal.id,
    { policy, workerId: "postgres-current-time-default" },
  ), true);
  assert.ok((await connection.db.select().from(schema.notificationOutbox)
    .where(eq(schema.notificationOutbox.id, currentTimeProbe.internal.id)))[0]?.processedAt);

  return {
    legacyCompatibility:
      "strict internal legacy rows before/at/after deleted date delivered; customer/terminal/polluted/version rows rejected",
    attempts:
      "0..5 matrix, fifth success/failure, pending and expired-fifth Dead, concurrent direct/batch terminalization, zero sixth capture",
    counterMismatch: "failed closed without repair or transport",
    sibling: "customer job remained pending and unchanged",
    freshClock: {
      calls: batchClock.calls(),
      leases: observedLeases,
      settlements: batchRows.map((row) => row.processedAt?.toISOString()).sort(),
      lateResults,
      backoff: "2036-08-30T04:01:30.000Z",
      defaultClock: "current-time delivery settled successfully",
    },
  };
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
      ["leading-slash-run", "//products/synthetic-fabric/"],
      ["internal-slash-run", "/products//synthetic-fabric/"],
      ["long-internal-slash-run", "/products///synthetic-fabric/"],
      ["trailing-slash-run", "/products/synthetic-fabric//"],
      ["root-only-slash-run", "///"],
    ] as const) {
      await assert.rejects(createInquiry(connection.db, {
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

    const sourceFixtures = await createSyntheticSourceFixtures(connection);
    const createdSourceInquiries = new Map<string, string>();
    for (const [type, id, path] of [
      ["product", sourceFixtures.productId, sourceFixtures.productPath],
      ["application", sourceFixtures.applicationId, sourceFixtures.applicationPath],
      ["content", sourceFixtures.contentId, sourceFixtures.contentPath],
    ] as const) {
      const created = await createInquiry(connection.db, {
        idempotencyKey: `postgres-source-${type}-0001`,
        name: `Synthetic PostgreSQL ${type} Source Buyer`,
        email: `postgres-source-${type}@example.test`,
        description: `Synthetic ${type} source persistence.`,
        sourcePagePath: path,
      });
      const [row] = await connection.db.select({
        sourceEntityType: schema.inquiries.sourceEntityType,
        sourceEntityId: schema.inquiries.sourceEntityId,
      }).from(schema.inquiries).where(eq(schema.inquiries.id, created.inquiryId));
      assert.deepEqual(row, { sourceEntityType: type, sourceEntityId: id });
      createdSourceInquiries.set(type, created.inquiryId);
    }

    const crmUsers = await connection.db.insert(schema.users).values([
      {
        email: "stage5-f2b-postgres-admin@example.test",
        displayName: "Synthetic Stage 5 F2B Admin",
        role: "admin",
        passwordHash: "synthetic-test-only",
      },
      {
        email: "stage5-f2b-postgres-owner@example.test",
        displayName: "Synthetic Stage 5 F2B Owner",
        role: "sales",
        passwordHash: "synthetic-test-only",
      },
      {
        email: "stage5-f2b-postgres-other@example.test",
        displayName: "Synthetic Stage 5 F2B Other",
        role: "sales",
        passwordHash: "synthetic-test-only",
      },
      {
        email: "stage5-f2b-postgres-analyst@example.test",
        displayName: "Synthetic Stage 5 F2B Analyst",
        role: "analyst",
        passwordHash: "synthetic-test-only",
      },
    ]).returning({ id: schema.users.id, email: schema.users.email });
    const crmUserId = (email: string) => crmUsers.find((user) => user.email === email)!.id;
    const adminActor = {
      userId: crmUserId("stage5-f2b-postgres-admin@example.test"),
      role: "admin" as const,
    };
    const ownerActor = {
      userId: crmUserId("stage5-f2b-postgres-owner@example.test"),
      role: "sales" as const,
    };
    const otherActor = {
      userId: crmUserId("stage5-f2b-postgres-other@example.test"),
      role: "sales" as const,
    };
    const analystActor = {
      userId: crmUserId("stage5-f2b-postgres-analyst@example.test"),
      role: "analyst" as const,
    };
    const applicationInquiryId = createdSourceInquiries.get("application");
    assert.ok(applicationInquiryId);
    await connection.db.update(schema.inquiries)
      .set({ ownerUserId: ownerActor.userId })
      .where(eq(schema.inquiries.id, applicationInquiryId));
    const adminProjection = await getInquiryCrmReadProjection(
      connection.db,
      adminActor,
      applicationInquiryId,
    );
    const ownerProjection = await getInquiryCrmReadProjection(
      connection.db,
      ownerActor,
      applicationInquiryId,
    );
    assert.equal(
      adminProjection?.attribution.sourceEntityEvidence?.currentPublicSource?.href,
      sourceFixtures.applicationPath,
    );
    assert.deepEqual(ownerProjection, adminProjection);
    const serializedProjection = JSON.stringify(adminProjection);
    assert.doesNotMatch(serializedProjection, new RegExp(sourceFixtures.applicationId, "i"));
    assert.doesNotMatch(serializedProjection, /sourceEntityId|contactId/);
    await assert.rejects(
      getInquiryCrmReadProjection(connection.db, otherActor, applicationInquiryId),
    );
    await assert.rejects(
      getInquiryCrmReadProjection(connection.db, analystActor, applicationInquiryId),
    );
    assert.equal((await listInquiryCrmSummaries(connection.db, ownerActor)).length, 1);
    assert.equal((await listInquiryCrmSummaries(connection.db, otherActor)).length, 0);
    await assert.rejects(listInquiryCrmSummaries(connection.db, analystActor));

    const movedApplicationPath = "/applications/synthetic-stage5-f2b-current/";
    await connection.db.update(schema.routes).set({ path: movedApplicationPath })
      .where(eq(schema.routes.id, sourceFixtures.applicationRouteId));
    const movedProjection = await getInquiryCrmReadProjection(
      connection.db,
      adminActor,
      applicationInquiryId,
    );
    assert.equal(movedProjection?.attribution.submitTouch.sourcePagePath, sourceFixtures.applicationPath);
    assert.equal(
      movedProjection?.attribution.sourceEntityEvidence?.currentPublicSource?.href,
      movedApplicationPath,
    );
    await connection.db.update(schema.routes).set({ path: "/admin/synthetic-stage5-f2b-private/" })
      .where(eq(schema.routes.id, sourceFixtures.applicationRouteId));
    const privateProjection = await getInquiryCrmReadProjection(
      connection.db,
      adminActor,
      applicationInquiryId,
    );
    assert.equal(
      privateProjection?.attribution.sourceEntityEvidence?.currentPublicSource,
      null,
    );
    const [immutableStoredSource] = await connection.db.select({
      sourcePagePath: schema.inquiries.sourcePagePath,
      sourceEntityType: schema.inquiries.sourceEntityType,
      sourceEntityId: schema.inquiries.sourceEntityId,
    }).from(schema.inquiries).where(eq(schema.inquiries.id, applicationInquiryId));
    assert.deepEqual(immutableStoredSource, {
      sourcePagePath: sourceFixtures.applicationPath,
      sourceEntityType: "application",
      sourceEntityId: sourceFixtures.applicationId,
    });

    const equalInput: CreateInquiryInput = {
      idempotencyKey: "postgres-equal-0001",
      name: "Synthetic PostgreSQL Equal Buyer",
      email: "postgres-equal@example.test",
      description: "Synthetic equal concurrency.",
      sourcePagePath: sourceFixtures.productPath,
      submitUtmCampaign: "campaign-1234567",
    };
    const equal = await Promise.all([
      createInquiry(connection.db, equalInput),
      createInquiry(connection.db, {
        ...equalInput,
        submitUtmCampaign: "phone:138:0013:8000",
      }),
    ]);
    assert.equal(new Set(equal.map((result) => result.inquiryId)).size, 1);
    assert.equal(equal.filter((result) => result.replayed).length, 1);
    const [concurrentSource] = await connection.db.select({
      sourceEntityType: schema.inquiries.sourceEntityType,
      sourceEntityId: schema.inquiries.sourceEntityId,
    }).from(schema.inquiries).where(eq(schema.inquiries.id, equal[0]!.inquiryId));
    assert.deepEqual(concurrentSource, {
      sourceEntityType: "product",
      sourceEntityId: sourceFixtures.productId,
    });
    await connection.db.update(schema.products).set({ status: "archived" })
      .where(eq(schema.products.id, sourceFixtures.productId));
    const immutableReplay = await createInquiry(
      connection.db,
      equalInput,
    );
    assert.equal(immutableReplay.replayed, true);
    const [immutableSource] = await connection.db.select({
      sourceEntityType: schema.inquiries.sourceEntityType,
      sourceEntityId: schema.inquiries.sourceEntityId,
    }).from(schema.inquiries).where(eq(schema.inquiries.id, equal[0]!.inquiryId));
    assert.deepEqual(immutableSource, concurrentSource);
    await connection.db.update(schema.products).set({ status: "published" })
      .where(eq(schema.products.id, sourceFixtures.productId));

    const differentInput: CreateInquiryInput = {
      ...equalInput,
      idempotencyKey: "postgres-different-0001",
      email: "postgres-different@example.test",
      submitUtmCampaign: "spring-launch",
    };
    const different = await Promise.allSettled([
      createInquiry(connection.db, differentInput),
      createInquiry(connection.db, {
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
    await assert.rejects(createInquiry(connection.db, {
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

    const templateAuthority = await verifyTemplateAuthority(connection);
    const outboxConvergence = await verifyOutboxConvergence(connection, client);
    const outboxRemediation = await verifyOutboxRemediation(connection);

    return {
      columns: columns.map((row) => row.column_name),
      equalConcurrency: "one create plus one replay",
      differentConcurrency: "one create plus one conflict",
      auditRollback: "six-table counts unchanged, including eligible source pair",
      requiredPathBoundary:
        "raw v2 query, fragment and repeated-slash runs rejected with six-table counts unchanged",
      sourceResolution:
        "eligible Product, Application and Content pairs persisted; concurrent and later-ineligible replay immutable",
      crmReadProjection:
        "Admin and assigned Sales pass; unassigned Sales and Analyst fail; current label/link changes without snapshot rewrite; private current Route produces no link or source UUID",
      indexPlan: "inquiries_source_entity_idx",
      templateAuthority,
      outboxConvergence,
      outboxRemediation,
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
    sourcePagePath: "/GET-QUOTE//?historical=true",
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
    const replay = await createInquiry(connection.db, {
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
    const v2 = await createInquiry(connection.db, v2Input);
    const v2Replay = await createInquiry(connection.db, {
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
