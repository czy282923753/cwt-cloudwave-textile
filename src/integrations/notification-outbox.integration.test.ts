import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import { createInquiry } from "@/crm/inquiry-service";
import {
  applicationLocalizations,
  applications,
  assets,
  notificationOutbox,
  routes,
  seoMetadata,
  users,
} from "@/db/schema";
import {
  applyEmailTemplateRevision,
  saveEmailTemplateDraft,
  submitEmailTemplateDraftForReview,
} from "@/email-templates/service";
import { createTestDatabase } from "@/test/database";

import {
  InMemoryCaptureEmailTransport,
  type CaptureEmailTransport,
  type EmailEnvelopePolicy,
  type TrustedEmailEnvelope,
} from "./email";
import {
  claimNotificationOutboxJob,
  deliverNotificationOutboxJob,
  deliverPendingNotificationOutbox,
  listDueNotificationOutboxJobIds,
  OUTBOX_MAX_ATTEMPTS,
} from "./notification-outbox";

const policy: EmailEnvelopePolicy = Object.freeze({
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
  databaseDriver: "pglite",
  monitoringDriver: "log",
});

async function setupInquiry(suffix: string) {
  const connection = await createTestDatabase();
  const inquiry = await createInquiry(connection.db, {
    idempotencyKey: `outbox-${suffix}-0001`,
    name: "Synthetic Outbox Buyer",
    email: "synthetic-outbox@example.test",
    countryCode: "CN",
    whatsapp: "+86 000 0000",
    description: "Synthetic immutable delivery snapshot.",
    sourcePagePath: "/get-quote/",
  });
  const jobs = await connection.db.select().from(notificationOutbox)
    .where(eq(notificationOutbox.aggregateId, inquiry.inquiryId));
  return { connection, inquiry, jobs };
}

function sequenceClock(...instants: readonly string[]) {
  let index = 0;
  const clock = () => {
    const instant = instants[index];
    if (!instant) throw new Error(`Synthetic clock exhausted at call ${index + 1}.`);
    index += 1;
    return new Date(instant);
  };
  return { clock, calls: () => index };
}

describe("two-kind Notification Outbox lease and dispatch authority", () => {
  it("lists and claims by job ID, with same-row contention and simultaneous two-kind claims", async () => {
    const { connection, jobs } = await setupInquiry("claim");
    expect(jobs).toHaveLength(2);
    const ids = await listDueNotificationOutboxJobIds(connection.db);
    expect(new Set(ids)).toEqual(new Set(jobs.map((job) => job.id)));
    const firstJob = jobs[0]!;
    const secondJob = jobs[1]!;
    const sameRow = await Promise.all([
      claimNotificationOutboxJob(connection.db, firstJob.id, "worker-a"),
      claimNotificationOutboxJob(connection.db, firstJob.id, "worker-b"),
    ]);
    expect(sameRow.filter(Boolean)).toHaveLength(1);
    await connection.db.update(notificationOutbox).set({
      status: "pending",
      attempts: 0,
      attemptCount: 0,
      lockedAt: null,
      lockedBy: null,
      leaseExpiresAt: null,
    }).where(eq(notificationOutbox.id, firstJob.id));
    const both = await Promise.all([
      claimNotificationOutboxJob(connection.db, firstJob.id, "worker-internal"),
      claimNotificationOutboxJob(connection.db, secondJob.id, "worker-customer"),
    ]);
    expect(both.every(Boolean)).toBe(true);
    expect(both.map((job) => job?.attempts)).toEqual([1, 1]);
    expect(both.map((job) => job?.attemptCount)).toEqual([1, 1]);
    await connection.close();
  });

  it("renders both kinds from captured templates and immutable Inquiry data", async () => {
    const { connection, jobs } = await setupInquiry("render");
    const transport = new InMemoryCaptureEmailTransport();
    for (const job of jobs) {
      await expect(deliverNotificationOutboxJob(connection.db, transport, job.id, {
        policy,
        workerId: `worker-${job.kind}`,
        clock: () => new Date("2026-08-30T01:00:00.000Z"),
      })).resolves.toBe(true);
    }
    expect(transport.captured).toHaveLength(2);
    expect(transport.captured.map((envelope) => envelope.to)).toEqual(
      expect.arrayContaining(["info@cwtextile.com", "synthetic-outbox@example.test"]),
    );
    expect(transport.captured.every((envelope) =>
      envelope.messageId.includes("inquiry-") && !envelope.textBody.includes("objectKey"),
    )).toBe(true);
    const rows = await connection.db.select().from(notificationOutbox);
    expect(rows.map((row) => row.status)).toEqual(["sent", "sent"]);
    expect(rows.every((row) => row.attempts === row.attemptCount)).toBe(true);
    await connection.close();
  });

  it("renders trusted operations URL, safe source label, and attachment count without payload PII", async () => {
    const connection = await createTestDatabase();
    const [application] = await connection.db.insert(applications).values({
      internalKey: "synthetic-outbox-source",
      status: "published",
      publishedAt: new Date(),
    }).returning({ id: applications.id });
    if (!application) throw new Error("Synthetic Application was not created.");
    await connection.db.insert(applicationLocalizations).values({
      applicationId: application.id,
      locale: "en",
      name: "Synthetic Safe Source Label",
      body: "Synthetic public Application body.",
    });
    const sourcePath = "/applications/synthetic-outbox-source/";
    const [route] = await connection.db.insert(routes).values({
      locale: "en",
      path: sourcePath,
      entityType: "application",
      entityId: application.id,
    }).returning({ id: routes.id });
    if (!route) throw new Error("Synthetic Route was not created.");
    await connection.db.insert(seoMetadata).values({
      routeId: route.id,
      title: "Synthetic Source",
      canonicalPath: sourcePath,
      indexStatus: "noindex",
    });
    const [asset] = await connection.db.insert(assets).values({
      originalFileName: "synthetic-private-sample.jpg",
      storageProvider: "test",
      storagePartition: "private",
      objectKey: "private/synthetic-secret-object.jpg",
      access: "private",
      category: "inquiry",
      status: "ready",
      scanStatus: "passed",
      declaredMimeType: "image/jpeg",
      detectedMimeType: "image/jpeg",
      byteSize: 100,
      sha256: "synthetic-outbox-private-asset",
    }).returning({ id: assets.id });
    if (!asset) throw new Error("Synthetic private Asset was not created.");
    const inquiry = await createInquiry(connection.db, {
      idempotencyKey: "outbox-source-attachment-0001",
      name: "Synthetic Source Buyer",
      email: "source-buyer@example.test",
      description: "Synthetic source and attachment render.",
      sourcePagePath: sourcePath,
      assetIds: [asset.id],
    });
    const jobs = await connection.db.select().from(notificationOutbox)
      .where(eq(notificationOutbox.aggregateId, inquiry.inquiryId));
    const internal = jobs.find((job) => job.kind === "inquiry_notification")!;
    expect(internal.payload).toMatchObject({
      schema_version: 1,
      source_entity_label_snapshot: "Synthetic Safe Source Label",
    });
    const serializedPayload = JSON.stringify(internal.payload);
    for (const forbidden of [
      asset.id,
      "synthetic-private-sample.jpg",
      "private/synthetic-secret-object.jpg",
      "source-buyer@example.test",
      "Synthetic Source Buyer",
      "Synthetic source and attachment render.",
    ]) expect(serializedPayload).not.toContain(forbidden);
    const transport = new InMemoryCaptureEmailTransport();
    await expect(deliverNotificationOutboxJob(connection.db, transport, internal.id, {
      policy,
      workerId: "source-render-worker",
      clock: () => new Date("2026-08-30T01:30:00.000Z"),
    })).resolves.toBe(true);
    const body = transport.captured[0]!.textBody;
    expect(body).toContain("Private attachment count: 1");
    expect(body).toContain("Source entity: application — Synthetic Safe Source Label");
    expect(body).toContain(`http://localhost:3000/admin/inquiries/${inquiry.inquiryId}/`);
    expect(body).not.toContain(asset.id);
    expect(body).not.toContain("synthetic-secret-object");
    expect(body).not.toContain("synthetic-private-sample.jpg");
    await connection.close();
  });

  it("keeps kind state independent and moves only the fifth failed attempt to Dead", async () => {
    const { connection, jobs } = await setupInquiry("failure");
    const internal = jobs.find((job) => job.kind === "inquiry_notification")!;
    const customer = jobs.find((job) => job.kind === "inquiry_customer_confirmation")!;
    await connection.db.update(notificationOutbox).set({ attempts: 4, attemptCount: 4 })
      .where(eq(notificationOutbox.id, internal.id));
    const failing = new InMemoryCaptureEmailTransport({
      outcome: "failure",
      errorClass: "Synthetic_secret_customer@example.test",
    });
    await expect(deliverNotificationOutboxJob(connection.db, failing, internal.id, {
      policy,
      workerId: "worker-failure",
      clock: () => new Date("2026-08-30T02:00:00.000Z"),
    })).resolves.toBe(false);
    const successful = new InMemoryCaptureEmailTransport();
    await expect(deliverNotificationOutboxJob(connection.db, successful, customer.id, {
      policy,
      workerId: "worker-success",
      clock: () => new Date("2026-08-30T02:00:00.000Z"),
    })).resolves.toBe(true);
    const rows = await connection.db.select().from(notificationOutbox);
    expect(rows.find((row) => row.id === internal.id)).toMatchObject({
      status: "dead",
      attempts: 5,
      attemptCount: 5,
      lastErrorCode: "email_transport_failure",
      lastError: "Notification delivery was not confirmed; details omitted.",
    });
    expect(JSON.stringify(rows)).not.toContain("customer@example.test");
    expect(rows.find((row) => row.id === customer.id)?.status).toBe("sent");
    await connection.close();
  });

  it("enforces equal counters and attempt zero through five without a sixth transport", async () => {
    const { connection, jobs } = await setupInquiry("attempt-ceiling");
    const internal = jobs.find((job) => job.kind === "inquiry_notification")!;
    const customer = jobs.find((job) => job.kind === "inquiry_customer_confirmation")!;

    for (let attempt = 0; attempt < OUTBOX_MAX_ATTEMPTS; attempt += 1) {
      await connection.db.update(notificationOutbox).set({
        status: "pending",
        attempts: attempt,
        attemptCount: attempt,
        nextAttemptAt: new Date(0),
        lockedAt: null,
        lockedBy: null,
        leaseExpiresAt: null,
        processedAt: null,
      }).where(eq(notificationOutbox.id, internal.id));
      const now = new Date(`2026-08-30T02:1${attempt}:00.000Z`);
      expect(await listDueNotificationOutboxJobIds(connection.db, now)).toContain(internal.id);
      const claimed = await claimNotificationOutboxJob(
        connection.db,
        internal.id,
        `matrix-worker-${attempt}`,
        now,
      );
      expect(claimed).toMatchObject({ attempts: attempt + 1, attemptCount: attempt + 1 });
    }

    await connection.db.update(notificationOutbox).set({
      status: "pending",
      attempts: OUTBOX_MAX_ATTEMPTS,
      attemptCount: OUTBOX_MAX_ATTEMPTS,
      nextAttemptAt: new Date("2099-01-01T00:00:00.000Z"),
      lockedAt: null,
      lockedBy: null,
      leaseExpiresAt: null,
      processedAt: null,
    }).where(eq(notificationOutbox.id, internal.id));
    expect(await listDueNotificationOutboxJobIds(
      connection.db,
      new Date("2026-08-30T02:20:00.000Z"),
    )).not.toContain(internal.id);
    const exhaustedTransport = new InMemoryCaptureEmailTransport();
    await expect(deliverNotificationOutboxJob(connection.db, exhaustedTransport, internal.id, {
      policy,
      workerId: "must-not-attempt-six",
      clock: () => new Date("2026-08-30T02:20:00.000Z"),
    })).resolves.toBe(false);
    expect(exhaustedTransport.captured).toHaveLength(0);
    const [dead] = await connection.db.select().from(notificationOutbox)
      .where(eq(notificationOutbox.id, internal.id));
    expect(dead).toMatchObject({
      status: "dead",
      attempts: OUTBOX_MAX_ATTEMPTS,
      attemptCount: OUTBOX_MAX_ATTEMPTS,
      lastErrorCode: "outbox_attempts_exhausted",
      lastError: "Notification delivery attempt limit was exhausted.",
      lockedAt: null,
      lockedBy: null,
      leaseExpiresAt: null,
    });
    expect((await connection.db.select().from(notificationOutbox)
      .where(eq(notificationOutbox.id, customer.id)))[0]?.status).toBe("pending");

    for (const [status, attempt] of [
      ["failed", OUTBOX_MAX_ATTEMPTS],
      ["pending", OUTBOX_MAX_ATTEMPTS + 1],
    ] as const) {
      await connection.db.update(notificationOutbox).set({
        status,
        attempts: attempt,
        attemptCount: attempt,
        nextAttemptAt: new Date("2099-01-01T00:00:00.000Z"),
        lastErrorCode: null,
        lastError: null,
        processedAt: null,
      }).where(eq(notificationOutbox.id, internal.id));
      await expect(deliverNotificationOutboxJob(connection.db, exhaustedTransport, internal.id, {
        policy,
        workerId: `${status}-${attempt}-terminalizer`,
        clock: () => new Date("2026-08-30T02:20:30.000Z"),
      })).resolves.toBe(false);
      expect((await connection.db.select().from(notificationOutbox)
        .where(eq(notificationOutbox.id, internal.id)))[0]).toMatchObject({
        status: "dead",
        attempts: attempt,
        attemptCount: attempt,
        lastErrorCode: "outbox_attempts_exhausted",
      });
      expect(exhaustedTransport.captured).toHaveLength(0);
    }

    await connection.db.update(notificationOutbox).set({
      status: "failed",
      attempts: 4,
      attemptCount: 5,
      nextAttemptAt: new Date(0),
      lastErrorCode: null,
      lastError: null,
      processedAt: null,
    }).where(eq(notificationOutbox.id, internal.id));
    const mismatchBefore = (await connection.db.select().from(notificationOutbox)
      .where(eq(notificationOutbox.id, internal.id)))[0];
    await expect(deliverNotificationOutboxJob(connection.db, exhaustedTransport, internal.id, {
      policy,
      workerId: "mismatch-worker",
      clock: () => new Date("2026-08-30T02:21:00.000Z"),
    })).resolves.toBe(false);
    expect((await connection.db.select().from(notificationOutbox)
      .where(eq(notificationOutbox.id, internal.id)))[0]).toEqual(mismatchBefore);
    expect(exhaustedTransport.captured).toHaveLength(0);
    await connection.close();
  });

  it("terminalizes only an expired fifth lease and preserves the live fifth worker", async () => {
    const { connection, jobs } = await setupInquiry("expired-fifth");
    const internal = jobs.find((job) => job.kind === "inquiry_notification")!;
    const now = new Date("2026-08-30T02:40:00.000Z");
    await connection.db.update(notificationOutbox).set({
      status: "processing",
      attempts: OUTBOX_MAX_ATTEMPTS,
      attemptCount: OUTBOX_MAX_ATTEMPTS,
      lockedAt: new Date(now.getTime() - 1_000),
      lockedBy: "live-fifth-worker",
      leaseExpiresAt: new Date(now.getTime() + 1_000),
    }).where(eq(notificationOutbox.id, internal.id));
    const transport = new InMemoryCaptureEmailTransport();
    await expect(deliverNotificationOutboxJob(connection.db, transport, internal.id, {
      policy,
      workerId: "competing-worker",
      clock: () => new Date(now),
    })).resolves.toBe(false);
    expect((await connection.db.select().from(notificationOutbox)
      .where(eq(notificationOutbox.id, internal.id)))[0]).toMatchObject({
      status: "processing",
      attempts: 5,
      attemptCount: 5,
      lockedBy: "live-fifth-worker",
    });

    const expiredAt = new Date(now.getTime() + 2_000);
    await connection.db.update(notificationOutbox).set({
      nextAttemptAt: new Date("2099-01-01T00:00:00.000Z"),
    }).where(eq(notificationOutbox.id, jobs.find((job) =>
      job.kind === "inquiry_customer_confirmation")!.id));
    const results = await Promise.all([
      deliverNotificationOutboxJob(connection.db, transport, internal.id, {
        policy,
        workerId: "direct-terminalizer",
        clock: () => new Date(expiredAt),
      }),
      deliverPendingNotificationOutbox(connection.db, transport, {
        policy,
        workerId: "batch-terminalizer",
        clock: () => new Date(expiredAt),
      }),
    ]);
    expect(results[0]).toBe(false);
    expect(transport.captured).toHaveLength(0);
    expect((await connection.db.select().from(notificationOutbox)
      .where(eq(notificationOutbox.id, internal.id)))[0]).toMatchObject({
      status: "dead",
      attempts: 5,
      attemptCount: 5,
      lastErrorCode: "outbox_attempts_exhausted",
      lockedAt: null,
      lockedBy: null,
      leaseExpiresAt: null,
    });
    await connection.close();
  });

  it("uses fresh discovery, per-claim, and per-settlement clock instants", async () => {
    const { connection, jobs } = await setupInquiry("fresh-clock-batch");
    await connection.db.update(notificationOutbox).set({ nextAttemptAt: new Date(0) });
    const clock = sequenceClock(
      "2026-08-30T03:00:00.000Z",
      "2026-08-30T03:00:10.000Z",
      "2026-08-30T03:00:20.000Z",
      "2026-08-30T03:00:30.000Z",
      "2026-08-30T03:00:40.000Z",
    );
    const observedLeases: Date[] = [];
    const transport: CaptureEmailTransport = {
      kind: "capture_only",
      capture: async () => {
        const [processing] = await connection.db.select().from(notificationOutbox)
          .where(eq(notificationOutbox.status, "processing"));
        if (!processing?.leaseExpiresAt) throw new Error("Synthetic lease was not recorded.");
        observedLeases.push(processing.leaseExpiresAt);
        return { outcome: "success" };
      },
    };
    await expect(deliverPendingNotificationOutbox(connection.db, transport, {
      policy,
      workerId: "fresh-clock-worker",
      clock: clock.clock,
    })).resolves.toEqual({ attempted: 2, sent: 2 });
    expect(clock.calls()).toBe(5);
    expect(observedLeases).toEqual([
      new Date("2026-08-30T03:01:10.000Z"),
      new Date("2026-08-30T03:01:30.000Z"),
    ]);
    const settled = await connection.db.select().from(notificationOutbox);
    expect(settled.map((row) => row.processedAt?.toISOString()).sort()).toEqual([
      "2026-08-30T03:00:20.000Z",
      "2026-08-30T03:00:40.000Z",
    ]);
    expect(new Set(settled.map((row) => row.id))).toEqual(new Set(jobs.map((job) => job.id)));
    await connection.close();
  });

  it.each(["success", "failure", "exception"] as const)(
    "rejects a %s outcome after fresh-time lease expiry",
    async (outcome) => {
      const { connection, jobs } = await setupInquiry(`late-${outcome}`);
      const job = jobs[0]!;
      await connection.db.update(notificationOutbox).set({ nextAttemptAt: new Date(0) })
        .where(eq(notificationOutbox.id, job.id));
      const transport: CaptureEmailTransport = {
        kind: "capture_only",
        capture: async () => {
          if (outcome === "exception") throw new Error("Synthetic late transport detail");
          return outcome === "success"
            ? { outcome: "success" }
            : { outcome: "failure", errorClass: "Synthetic_late_failure" };
        },
      };
      const clock = sequenceClock(
        "2026-08-30T03:30:00.000Z",
        "2026-08-30T03:32:00.000Z",
      );
      await expect(deliverNotificationOutboxJob(connection.db, transport, job.id, {
        policy,
        workerId: `late-${outcome}-worker`,
        clock: clock.clock,
      })).resolves.toBe(false);
      expect(clock.calls()).toBe(2);
      expect((await connection.db.select().from(notificationOutbox)
        .where(eq(notificationOutbox.id, job.id)))[0]).toMatchObject({
        status: "processing",
        attempts: 1,
        attemptCount: 1,
        processedAt: null,
      });
      await connection.close();
    },
  );

  it("derives retry backoff from the fresh failure time", async () => {
    const { connection, jobs } = await setupInquiry("fresh-backoff");
    const job = jobs[0]!;
    await connection.db.update(notificationOutbox).set({ nextAttemptAt: new Date(0) })
      .where(eq(notificationOutbox.id, job.id));
    const clock = sequenceClock(
      "2026-08-30T03:40:00.000Z",
      "2026-08-30T03:40:30.000Z",
    );
    await expect(deliverNotificationOutboxJob(
      connection.db,
      new InMemoryCaptureEmailTransport({ outcome: "failure", errorClass: "Synthetic" }),
      job.id,
      { policy, workerId: "fresh-backoff-worker", clock: clock.clock },
    )).resolves.toBe(false);
    expect((await connection.db.select().from(notificationOutbox)
      .where(eq(notificationOutbox.id, job.id)))[0]).toMatchObject({
      status: "failed",
      nextAttemptAt: new Date("2026-08-30T03:41:30.000Z"),
    });
    await connection.close();
  });

  it("records uncertain first attempt as bounded Failed with deterministic backoff", async () => {
    const { connection, jobs } = await setupInquiry("uncertain");
    const job = jobs[0]!;
    const attemptedAt = new Date("2026-08-30T02:30:00.000Z");
    const uncertain = new InMemoryCaptureEmailTransport({
      outcome: "uncertain",
      errorClass: "Synthetic_timeout_with_private_detail",
    });
    await expect(deliverNotificationOutboxJob(connection.db, uncertain, job.id, {
      policy,
      workerId: "uncertain-worker",
      clock: () => new Date(attemptedAt),
    })).resolves.toBe(false);
    const [row] = await connection.db.select().from(notificationOutbox)
      .where(eq(notificationOutbox.id, job.id));
    expect(row).toMatchObject({
      status: "failed",
      attempts: 1,
      attemptCount: 1,
      nextAttemptAt: new Date(attemptedAt.getTime() + 60_000),
      lastErrorCode: "email_transport_uncertain",
      lastError: "Notification delivery was not confirmed; details omitted.",
    });
    expect(`${row?.lastErrorCode} ${row?.lastError}`).not.toContain("private_detail");
    await connection.close();
  });

  it("recovers expired leases and preserves honest lost-fence at-least-once identity", async () => {
    const { connection, jobs } = await setupInquiry("fence");
    const job = jobs[0]!;
    await connection.db.update(notificationOutbox).set({
      status: "processing",
      lockedBy: "dead-worker",
      lockedAt: new Date(0),
      leaseExpiresAt: new Date(1),
    }).where(eq(notificationOutbox.id, job.id));
    await expect(claimNotificationOutboxJob(
      connection.db,
      job.id,
      "recovery-worker",
      new Date(10),
    )).resolves.toMatchObject({ deliveryKey: job.deliveryKey, attempts: 1 });
    await connection.db.update(notificationOutbox).set({
      status: "pending",
      attempts: 0,
      attemptCount: 0,
      lockedAt: null,
      lockedBy: null,
      leaseExpiresAt: null,
    }).where(eq(notificationOutbox.id, job.id));
    const capturedIds: string[] = [];
    const fenceLosingTransport: CaptureEmailTransport = {
      kind: "capture_only",
      capture: async (envelope: TrustedEmailEnvelope) => {
        capturedIds.push(envelope.messageId);
        await connection.db.update(notificationOutbox).set({ lockedBy: "new-owner" })
          .where(eq(notificationOutbox.id, job.id));
        return { outcome: "success" };
      },
    };
    await expect(deliverNotificationOutboxJob(connection.db, fenceLosingTransport, job.id, {
      policy,
      workerId: "first-worker",
      clock: () => new Date("2026-08-30T03:00:00.000Z"),
    })).resolves.toBe(false);
    await connection.db.update(notificationOutbox).set({ leaseExpiresAt: new Date(0) })
      .where(eq(notificationOutbox.id, job.id));
    const recovery = new InMemoryCaptureEmailTransport();
    await expect(deliverNotificationOutboxJob(connection.db, recovery, job.id, {
      policy,
      workerId: "recovery-worker",
      clock: () => new Date("2026-08-30T03:02:00.000Z"),
    })).resolves.toBe(true);
    expect([capturedIds[0], recovery.captured[0]?.messageId]).toEqual([
      recovery.captured[0]?.messageId,
      recovery.captured[0]?.messageId,
    ]);
    await connection.close();
  });

  it("keeps captured template identity immutable across later Active changes", async () => {
    const { connection, jobs } = await setupInquiry("immutable-old");
    const oldCustomer = jobs.find((job) => job.kind === "inquiry_customer_confirmation")!;
    const actorRows = await connection.db.insert(users).values([
      {
        email: `outbox-editor-${crypto.randomUUID()}@example.test`,
        displayName: "Synthetic Editor",
        role: "content_editor",
        passwordHash: "test",
      },
      {
        email: `outbox-admin-${crypto.randomUUID()}@example.test`,
        displayName: "Synthetic Admin",
        role: "admin",
        passwordHash: "test",
      },
    ]).returning({ id: users.id, role: users.role });
    const editor = {
      userId: actorRows.find((row) => row.role === "content_editor")!.id,
      role: "content_editor" as const,
    };
    const admin = {
      userId: actorRows.find((row) => row.role === "admin")!.id,
      role: "admin" as const,
    };
    const draft = await saveEmailTemplateDraft(connection.db, editor, {
      templateKind: "inquiry_customer_confirmation",
      subjectSource: "CUSTOM ACTIVE {{inquiry_reference}}",
      textBodySource: "Hello {{customer_name}}, reference {{inquiry_reference}} received {{submitted_at}} by {{company_name}}. Reply {{reply_to_email}}.",
      changeSummary: "Synthetic immutable retry evidence",
      expectedDraftVersion: 0,
    });
    await submitEmailTemplateDraftForReview(connection.db, editor, {
      revisionId: draft.revisionId,
      expectedDraftVersion: draft.draftVersion,
    });
    await applyEmailTemplateRevision(connection.db, admin, draft.revisionId);
    const newer = await createInquiry(connection.db, {
      idempotencyKey: "outbox-immutable-new-0001",
      name: "Synthetic New Active Buyer",
      email: "synthetic-new-active@example.test",
      description: "Synthetic new Active capture.",
      sourcePagePath: "/get-quote/",
    });
    const [newCustomer] = await connection.db.select().from(notificationOutbox).where(eq(
      notificationOutbox.aggregateId,
      newer.inquiryId,
    ));
    const oldTransport = new InMemoryCaptureEmailTransport();
    await deliverNotificationOutboxJob(connection.db, oldTransport, oldCustomer.id, {
      policy,
      workerId: "old-snapshot-worker",
      clock: () => new Date("2026-08-30T04:00:00.000Z"),
    });
    const newCustomerJob = (await connection.db.select().from(notificationOutbox).where(eq(
      notificationOutbox.aggregateId,
      newer.inquiryId,
    ))).find((job) => job.kind === "inquiry_customer_confirmation")!;
    const newTransport = new InMemoryCaptureEmailTransport();
    await deliverNotificationOutboxJob(connection.db, newTransport, newCustomerJob.id, {
      policy,
      workerId: "new-snapshot-worker",
      clock: () => new Date("2026-08-30T04:00:00.000Z"),
    });
    expect(oldTransport.captured[0]?.subject).toMatch(/^We received your CloudWave Textile inquiry/);
    expect(newTransport.captured[0]?.subject).toMatch(/^CUSTOM ACTIVE/);
    expect(oldTransport.captured[0]?.subject).not.toContain("CUSTOM ACTIVE");
    expect(newCustomer).toBeDefined();
    await connection.close();
  });

  it("delivers an exact active legacy internal row regardless of its timestamp", async () => {
    const { connection, inquiry, jobs } = await setupInquiry("legacy");
    const internal = jobs.find((job) => job.kind === "inquiry_notification")!;
    await connection.db.update(notificationOutbox).set({
      createdAt: new Date("2036-08-30T00:00:00.000Z"),
      payload: {
        inquiryId: inquiry.inquiryId,
        name: "Synthetic Outbox Buyer",
        email: "synthetic-outbox@example.test",
        countryCode: "CN",
        whatsapp: null,
        description: "Synthetic legacy snapshot.",
        attachmentCount: 0,
      },
    }).where(eq(notificationOutbox.id, internal.id));
    const transport = new InMemoryCaptureEmailTransport();
    await expect(deliverNotificationOutboxJob(connection.db, transport, internal.id, {
      policy,
      workerId: "legacy-worker",
      clock: () => new Date("2036-08-30T00:01:00.000Z"),
    })).resolves.toBe(true);
    expect(transport.captured).toHaveLength(1);
    expect(transport.captured[0]?.subject).toMatch(/^New CWT inquiry/);
    await connection.close();
  });

  it("rejects a direct-DB polluted legacy-shaped payload without transport", async () => {
    const { connection, inquiry, jobs } = await setupInquiry("polluted");
    const internal = jobs.find((job) => job.kind === "inquiry_notification")!;
    await connection.db.update(notificationOutbox).set({
      payload: {
        inquiryId: inquiry.inquiryId,
        name: "Polluted Buyer",
        email: "polluted@example.test",
        attachmentCount: 0,
        schema_version: 1,
      },
    }).where(eq(notificationOutbox.id, internal.id));
    const transport = new InMemoryCaptureEmailTransport();
    await expect(deliverNotificationOutboxJob(connection.db, transport, internal.id, {
      policy,
      workerId: "pollution-worker",
      clock: () => new Date("2026-08-30T05:00:00.000Z"),
    })).resolves.toBe(false);
    expect(transport.captured).toHaveLength(0);
    const [row] = await connection.db.select().from(notificationOutbox)
      .where(eq(notificationOutbox.id, internal.id));
    expect(row).toMatchObject({
      status: "failed",
      lastErrorCode: "outbox_contract_rejected",
      lastError: "Notification delivery was not confirmed; details omitted.",
    });
    expect(`${row?.lastErrorCode} ${row?.lastError}`).not.toContain("Polluted Buyer");
    await connection.close();
  });
});
