import { and, count, eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import {
  assets,
  auditLogs,
  contacts,
  customerActivities,
  inquiries,
  inquiryAssets,
  inquiryStatusHistory,
  notificationOutbox,
  uploadIntents,
  users,
} from "@/db/schema";
import type { EmailNotifier, InquiryNotification } from "@/integrations/email";
import { createTestDatabase } from "@/test/database";
import { deliverPendingInquiryNotifications } from "@/integrations/notification-outbox";

import {
  addCustomerActivity,
  assignInquiry,
  assertInquiryStatusTransition,
  changeInquiryStatus,
  createInquiry,
  countValidInquiries,
  InquiryIdempotencyConflictError,
} from "./inquiry-service";
import { authorizeInquiryAssetRecord, requireInquiryRecordAccess } from "./authorization";

class TestNotifier implements EmailNotifier {
  readonly notifications: InquiryNotification[] = [];
  async notifyInquiry(input: InquiryNotification): Promise<void> {
    this.notifications.push(input);
  }
}

class FailingNotifier implements EmailNotifier {
  async notifyInquiry(): Promise<void> {
    throw new Error("Synthetic notification outage");
  }
}

describe("minimal inquiry and CRM workflow", () => {
  it("accepts text-only and image-only inquiries and exactly matches Contacts by email", async () => {
    const connection = await createTestDatabase();
    const notifier = new TestNotifier();
    const { inquiryId: firstInquiryId } = await createInquiry(connection.db, notifier, {
      idempotencyKey: "text-inquiry-0001",
      name: "Test Buyer",
      email: "BUYER@EXAMPLE.TEST ",
      description: "Please help match a fabric.",
      assetIds: [],
      sourcePagePath: "/get-quote",
    });
    const assetRows = await connection.db
      .insert(assets)
      .values({
        originalFileName: "customer-sample.jpg",
        storageProvider: "test",
        storagePartition: "private",
        objectKey: "inquiry/test.jpg",
        access: "private",
        category: "inquiry",
        status: "ready",
        scanStatus: "passed",
        declaredMimeType: "image/jpeg",
        detectedMimeType: "image/jpeg",
        byteSize: 100,
        sha256: "inquiry-image-sha",
      })
      .returning({ id: assets.id });
    const assetId = assetRows[0]?.id;
    if (!assetId) throw new Error("Missing private asset.");
    const { inquiryId: secondInquiryId } = await createInquiry(connection.db, notifier, {
      idempotencyKey: "image-inquiry-0001",
      name: "Test Buyer Updated",
      email: "buyer@example.test",
      assetIds: [assetId],
      sourcePagePath: "/products/test",
    });
    expect(firstInquiryId).not.toBe(secondInquiryId);
    const references = await connection.db
      .select({ id: inquiries.id, publicReference: inquiries.publicReference })
      .from(inquiries);
    for (const row of references) {
      expect(row.publicReference).toMatch(/^CWT-[A-F0-9]{20}$/);
      expect(row.publicReference).not.toContain(row.id);
      expect(row.publicReference).not.toMatch(
        /[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i,
      );
    }
    const contactCount = await connection.db.select({ count: count() }).from(contacts);
    const inquiryCount = await connection.db.select({ count: count() }).from(inquiries);
    const attachmentCount = await connection.db
      .select({ count: count() })
      .from(inquiryAssets);
    expect(Number(contactCount[0]?.count)).toBe(1);
    expect(Number(inquiryCount[0]?.count)).toBe(2);
    expect(Number(attachmentCount[0]?.count)).toBe(1);
    expect(notifier.notifications).toHaveLength(2);
    const contactRows = await connection.db.select().from(contacts);
    expect(contactRows[0]).toMatchObject({
      name: "Test Buyer",
      email: "buyer@example.test",
    });
    const snapshotRows = await connection.db
      .select({ submittedName: inquiries.submittedName })
      .from(inquiries)
      .where(eq(inquiries.id, secondInquiryId));
    expect(snapshotRows[0]?.submittedName).toBe("Test Buyer Updated");
    await connection.close();
  });

  it("normalizes valid country codes and preserves immutable repeat-Inquiry snapshots without overwriting Contact master data", async () => {
    const connection = await createTestDatabase();
    const notifier = new TestNotifier();
    const firstInput = {
      idempotencyKey: "country-inquiry-0001",
      name: "Country Buyer",
      email: "country-buyer@example.test",
      countryCode: "cn",
      description: "First country-code inquiry.",
      sourcePagePath: "/get-quote/",
    };

    const first = await createInquiry(connection.db, notifier, firstInput);
    const replay = await createInquiry(connection.db, notifier, {
      ...firstInput,
      countryCode: "CN",
    });
    const second = await createInquiry(connection.db, notifier, {
      ...firstInput,
      idempotencyKey: "country-inquiry-0002",
      name: "Country Buyer Updated",
      countryCode: "us",
      description: "A later immutable submitted snapshot.",
    });

    expect(replay).toMatchObject({ inquiryId: first.inquiryId, replayed: true });
    expect(second.inquiryId).not.toBe(first.inquiryId);
    expect(await connection.db.select({
      countryCode: contacts.countryCode,
      name: contacts.name,
    }).from(contacts)).toEqual([
      { countryCode: "CN", name: "Country Buyer" },
    ]);

    const snapshots = await connection.db
      .select({
        id: inquiries.id,
        submittedCountryCode: inquiries.submittedCountryCode,
        submittedName: inquiries.submittedName,
      })
      .from(inquiries);
    expect(snapshots.find((row) => row.id === first.inquiryId)).toMatchObject({
      submittedCountryCode: "CN",
      submittedName: "Country Buyer",
    });
    expect(snapshots.find((row) => row.id === second.inquiryId)).toMatchObject({
      submittedCountryCode: "US",
      submittedName: "Country Buyer Updated",
    });

    const outboxRows = await connection.db
      .select({ aggregateId: notificationOutbox.aggregateId, payload: notificationOutbox.payload })
      .from(notificationOutbox);
    expect(outboxRows.find((row) => row.aggregateId === first.inquiryId)?.payload)
      .toMatchObject({ countryCode: "CN" });
    expect(outboxRows.find((row) => row.aggregateId === second.inquiryId)?.payload)
      .toMatchObject({ countryCode: "US" });
    expect(notifier.notifications.map((notification) => notification.countryCode))
      .toEqual(["CN", "US"]);
    await connection.close();
  });

  it("allows an empty optional country and rejects invalid country text at the Domain Service boundary", async () => {
    const connection = await createTestDatabase();
    const notifier = new TestNotifier();
    const empty = await createInquiry(connection.db, notifier, {
      idempotencyKey: "empty-country-inquiry-0001",
      name: "No Country Buyer",
      email: "no-country@example.test",
      countryCode: "   ",
      description: "Country remains optional.",
      sourcePagePath: "/get-quote/",
    });

    const emptyRows = await connection.db
      .select({ submittedCountryCode: inquiries.submittedCountryCode })
      .from(inquiries)
      .where(eq(inquiries.id, empty.inquiryId));
    expect(emptyRows[0]?.submittedCountryCode).toBeNull();

    for (const [index, countryCode] of ["ZZ", "China", "C"].entries()) {
      await expect(
        createInquiry(connection.db, notifier, {
          idempotencyKey: `invalid-country-inquiry-000${index + 1}`,
          name: "Invalid Country Buyer",
          email: `invalid-country-${index}@example.test`,
          countryCode,
          description: "This submission must fail before persistence.",
          sourcePagePath: "/get-quote/",
        }),
      ).rejects.toThrow("Country must be a valid ISO 3166-1 alpha-2 code.");
    }
    expect(Number((await connection.db.select({ value: count() }).from(inquiries))[0]?.value))
      .toBe(1);
    expect(Number((await connection.db.select({ value: count() }).from(contacts))[0]?.value))
      .toBe(1);
    expect(Number((await connection.db.select({ value: count() }).from(notificationOutbox))[0]?.value))
      .toBe(1);
    await connection.close();
  });

  it("records governed status history, activities, and first response time", async () => {
    const connection = await createTestDatabase();
    const notifier = new TestNotifier();
    const { inquiryId } = await createInquiry(connection.db, notifier, {
      idempotencyKey: "crm-inquiry-0001",
      name: "Test Buyer",
      email: "crm@example.test",
      description: "Text-only test inquiry.",
      assetIds: [],
      sourcePagePath: "/get-quote",
    });
    const userRows = await connection.db
      .insert(users)
      .values([
        {
          email: "sales@example.test",
          displayName: "Sales Operator",
          role: "sales",
          passwordHash: "test",
        },
        {
          email: "admin@example.test",
          displayName: "Admin Operator",
          role: "admin",
          passwordHash: "test",
        },
      ])
      .returning({ id: users.id, role: users.role });
    const userId = userRows.find((row) => row.role === "sales")?.id;
    const adminId = userRows.find((row) => row.role === "admin")?.id;
    if (!userId || !adminId) throw new Error("Missing CRM users.");
    await assignInquiry(
      connection.db,
      { userId: adminId, role: "admin" },
      inquiryId,
      { ownerUserId: userId, priority: "normal", qualificationStatus: "unassessed" },
    );
    const actor = { userId, role: "sales" as const };
    await changeInquiryStatus(connection.db, actor, inquiryId, "reviewing");
    await changeInquiryStatus(connection.db, actor, inquiryId, "qualified");
    await addCustomerActivity(connection.db, actor, inquiryId, {
      type: "email",
      direction: "outbound",
      content: "Sent a test acknowledgement.",
    });
    const createdRows = await connection.db
      .select({ createdAt: inquiries.createdAt })
      .from(inquiries)
      .where(eq(inquiries.id, inquiryId));
    const earlierOutbound = new Date(createdRows[0]!.createdAt.getTime() + 1);
    await addCustomerActivity(connection.db, actor, inquiryId, {
      type: "whatsapp",
      direction: "outbound",
      content: "Earlier valid outbound response recorded later.",
      occurredAt: earlierOutbound,
    });
    await addCustomerActivity(connection.db, actor, inquiryId, {
      type: "note",
      direction: "internal",
      content: "Internal note must not count.",
      occurredAt: createdRows[0]!.createdAt,
    });
    const rows = await connection.db
      .select({ status: inquiries.status, firstResponseAt: inquiries.firstResponseAt })
      .from(inquiries)
      .where(eq(inquiries.id, inquiryId));
    expect(rows[0]?.status).toBe("qualified");
    expect(rows[0]?.firstResponseAt?.getTime()).toBe(earlierOutbound.getTime());
    const history = await connection.db
      .select()
      .from(inquiryStatusHistory)
      .where(eq(inquiryStatusHistory.inquiryId, inquiryId));
    const activities = await connection.db
      .select()
      .from(customerActivities)
      .where(eq(customerActivities.inquiryId, inquiryId));
    expect(history).toHaveLength(3);
    expect(activities).toHaveLength(5);
    expect(() => assertInquiryStatusTransition("qualified", "new")).toThrow();
    await expect(
      assignInquiry(connection.db, actor, inquiryId, {
        priority: "normal",
        qualificationStatus: "unqualified",
      }),
    ).rejects.toThrow(/retain Qualified/);
    await expect(
      changeInquiryStatus(connection.db, actor, inquiryId, "lost"),
    ).rejects.toThrow(/Lost Reason/);
    await connection.close();
  });

  it("enforces record ownership and legal assignees at the service boundary", async () => {
    const connection = await createTestDatabase();
    const assetRows = await connection.db
      .insert(assets)
      .values({
        originalFileName: "authorization-sample.jpg",
        storageProvider: "test",
        storagePartition: "private",
        objectKey: "authorization/sample.jpg",
        access: "private",
        category: "inquiry",
        status: "ready",
        scanStatus: "passed",
        declaredMimeType: "image/jpeg",
        detectedMimeType: "image/jpeg",
        byteSize: 10,
        sha256: "authorization-sample",
      })
      .returning({ id: assets.id });
    const authorizationAssetId = assetRows[0]?.id;
    if (!authorizationAssetId) throw new Error("Missing authorization Asset.");
    const { inquiryId } = await createInquiry(connection.db, new TestNotifier(), {
      idempotencyKey: "authorization-inquiry-0001",
      name: "Authorization Buyer",
      email: "authorization@example.test",
      description: "Authorization test.",
      assetIds: [authorizationAssetId],
      sourcePagePath: "/get-quote/",
    });
    const userRows = await connection.db
      .insert(users)
      .values([
        { email: "owner@example.test", displayName: "Owner", role: "sales", passwordHash: "test" },
        { email: "other@example.test", displayName: "Other", role: "sales", passwordHash: "test" },
        { email: "analyst@example.test", displayName: "Analyst", role: "analyst", passwordHash: "test" },
        { email: "editor@example.test", displayName: "Editor", role: "content_editor", passwordHash: "test" },
        { email: "disabled@example.test", displayName: "Disabled", role: "sales", passwordHash: "test", isActive: false },
        { email: "auth-admin@example.test", displayName: "Admin", role: "admin", passwordHash: "test" },
      ])
      .returning({ id: users.id, role: users.role, email: users.email });
    const id = (email: string) => userRows.find((row) => row.email === email)!.id;
    const admin = { userId: id("auth-admin@example.test"), role: "admin" as const };
    const owner = { userId: id("owner@example.test"), role: "sales" as const };
    const other = { userId: id("other@example.test"), role: "sales" as const };
    await assignInquiry(connection.db, admin, inquiryId, {
      ownerUserId: owner.userId,
      priority: "normal",
      qualificationStatus: "unassessed",
    });
    await expect(requireInquiryRecordAccess(connection.db, owner, inquiryId, "read")).resolves.toMatchObject({ id: inquiryId });
    await expect(
      authorizeInquiryAssetRecord(connection.db, owner, authorizationAssetId),
    ).resolves.toMatchObject({ id: authorizationAssetId, partition: "private" });
    await expect(requireInquiryRecordAccess(connection.db, other, inquiryId, "read")).rejects.toThrow();
    await expect(
      authorizeInquiryAssetRecord(connection.db, other, authorizationAssetId),
    ).rejects.toThrow();
    await expect(changeInquiryStatus(connection.db, other, inquiryId, "reviewing")).rejects.toThrow();
    await expect(
      requireInquiryRecordAccess(
        connection.db,
        { userId: id("analyst@example.test"), role: "analyst" },
        inquiryId,
        "read",
      ),
    ).rejects.toThrow();
    await expect(
      authorizeInquiryAssetRecord(
        connection.db,
        { userId: id("analyst@example.test"), role: "analyst" },
        authorizationAssetId,
      ),
    ).rejects.toThrow();
    for (const illegalOwner of ["editor@example.test", "disabled@example.test"]) {
      await expect(
        assignInquiry(connection.db, admin, inquiryId, {
          ownerUserId: id(illegalOwner),
          priority: "normal",
          qualificationStatus: "unassessed",
        }),
      ).rejects.toThrow(/active Sales or Admin/);
    }
    await connection.close();
  });

  it("deduplicates retries and keeps notification failure asynchronous", async () => {
    const connection = await createTestDatabase();
    const input = {
      idempotencyKey: "idempotent-notification-0001",
      name: "Idempotent Buyer",
      email: "idempotent@example.test",
      description: "Retry-safe inquiry.",
      assetIds: [] as const,
      sourcePagePath: "/get-quote/",
    };
    const first = await createInquiry(connection.db, new FailingNotifier(), input);
    const second = await createInquiry(connection.db, new FailingNotifier(), input);
    expect(second).toMatchObject({ inquiryId: first.inquiryId, replayed: true });
    const inquiryCount = await connection.db.select({ value: count() }).from(inquiries);
    expect(Number(inquiryCount[0]?.value)).toBe(1);
    const outboxRows = await connection.db.select().from(notificationOutbox);
    expect(outboxRows).toHaveLength(1);
    expect(outboxRows[0]).toMatchObject({ status: "failed", attempts: 1 });
    await connection.db
      .update(notificationOutbox)
      .set({ nextAttemptAt: new Date(0) })
      .where(eq(notificationOutbox.aggregateId, first.inquiryId));
    const notifier = new TestNotifier();
    await expect(
      deliverPendingInquiryNotifications(connection.db, notifier),
    ).resolves.toEqual({ attempted: 1, sent: 1 });
    expect(notifier.notifications).toHaveLength(1);
    await connection.close();
  });

  it("compares a versioned canonical request before replaying an Idempotency Key", async () => {
    const connection = await createTestDatabase();
    const firstAssetRows = await connection.db
      .insert(assets)
      .values({
        originalFileName: "canonical-a.jpg",
        storageProvider: "test",
        storagePartition: "private",
        objectKey: "inquiry/canonical-a.jpg",
        access: "private",
        category: "inquiry",
        status: "ready",
        scanStatus: "passed",
        declaredMimeType: "image/jpeg",
        byteSize: 10,
        sha256: "canonical-a-sha256",
      })
      .returning({ id: assets.id });
    const secondAssetRows = await connection.db
      .insert(assets)
      .values({
        originalFileName: "canonical-b.jpg",
        storageProvider: "test",
        storagePartition: "private",
        objectKey: "inquiry/canonical-b.jpg",
        access: "private",
        category: "inquiry",
        status: "ready",
        scanStatus: "passed",
        declaredMimeType: "image/jpeg",
        byteSize: 10,
        sha256: "canonical-b-sha256",
      })
      .returning({ id: assets.id });
    const assetIds = [firstAssetRows[0]!.id, secondAssetRows[0]!.id];
    const baseInput = {
      idempotencyKey: "canonical-inquiry-0001",
      name: " Canonical Buyer ",
      email: "CANONICAL@EXAMPLE.TEST ",
      countryCode: " ",
      whatsapp: " +1 555 0100 ",
      description: "Need\r\na fabric match.",
      assetIds,
      sourcePagePath: "/GET-QUOTE/",
      landingPagePath: "",
      referrer: " ",
      attributionConfidence: "unavailable" as const,
      sessionId: "11111111-1111-4111-8111-111111111111",
    };
    const first = await createInquiry(connection.db, new TestNotifier(), baseInput);
    const replay = await createInquiry(connection.db, new TestNotifier(), {
      ...baseInput,
      name: "Canonical Buyer",
      email: "canonical@example.test",
      countryCode: null,
      whatsapp: "+1 555 0100",
      description: "Need\na fabric match.",
      assetIds: [...assetIds].reverse(),
      sourcePagePath: "/get-quote/",
      landingPagePath: null,
      referrer: null,
      sessionId: "22222222-2222-4222-8222-222222222222",
    });
    expect(replay).toMatchObject({ inquiryId: first.inquiryId, replayed: true });

    await expect(
      createInquiry(connection.db, new TestNotifier(), {
        ...baseInput,
        description: "A materially different request.",
      }),
    ).rejects.toBeInstanceOf(InquiryIdempotencyConflictError);

    expect(Number((await connection.db.select({ value: count() }).from(inquiries))[0]?.value)).toBe(1);
    expect(Number((await connection.db.select({ value: count() }).from(contacts))[0]?.value)).toBe(1);
    expect(Number((await connection.db.select({ value: count() }).from(inquiryAssets))[0]?.value)).toBe(2);
    expect(Number((await connection.db.select({ value: count() }).from(inquiryStatusHistory))[0]?.value)).toBe(1);
    expect(Number((await connection.db.select({ value: count() }).from(notificationOutbox))[0]?.value)).toBe(1);
    const createdAudits = await connection.db
      .select({ id: auditLogs.id })
      .from(auditLogs)
      .where(
        and(
          eq(auditLogs.action, "inquiry.created"),
          eq(auditLogs.entityId, first.inquiryId),
        ),
      );
    expect(createdAudits).toHaveLength(1);
    await connection.close();
  });

  it("fails closed for historical Idempotency Keys without an immutable fingerprint", async () => {
    const connection = await createTestDatabase();
    const contactRows = await connection.db
      .insert(contacts)
      .values({
        name: "Legacy Buyer",
        email: "legacy@example.test",
        normalizedEmail: "legacy@example.test",
      })
      .returning({ id: contacts.id });
    await connection.db.insert(inquiries).values({
      publicReference: "CWT-LEGACY-IDEMPOTENCY",
      contactId: contactRows[0]!.id,
      submittedName: "Legacy Buyer",
      submittedEmail: "legacy@example.test",
      idempotencyKey: "legacy-inquiry-0001",
      sourcePagePath: "/get-quote/",
    });
    await expect(
      createInquiry(connection.db, new TestNotifier(), {
        idempotencyKey: "legacy-inquiry-0001",
        name: "Legacy Buyer",
        email: "legacy@example.test",
        description: "Cannot be proven equal to the historical request.",
        sourcePagePath: "/get-quote/",
      }),
    ).rejects.toBeInstanceOf(InquiryIdempotencyConflictError);
    await connection.close();
  });

  it("replays consumed attachment Tokens but leaves conflicting new Tokens untouched", async () => {
    const connection = await createTestDatabase();
    const sessionId = "44444444-4444-4444-8444-444444444444";
    const tokens = ["attachment-token-a-0000000000000001", "attachment-token-b-0000000000000002"];
    for (const [index, token] of tokens.entries()) {
      const assetRows = await connection.db
        .insert(assets)
        .values({
          originalFileName: `token-${index}.jpg`,
          storageProvider: "test",
          storagePartition: "private",
          objectKey: `inquiry/token-${index}.jpg`,
          access: "private",
          category: "inquiry",
          status: "ready",
          scanStatus: "passed",
          declaredMimeType: "image/jpeg",
          byteSize: 10,
          sha256: `token-${index}-sha256`,
        })
        .returning({ id: assets.id });
      await connection.db.insert(uploadIntents).values({
        tokenHash: createHash("sha256").update(token).digest("hex"),
        anonymousSessionId: sessionId,
        declaredFileName: `token-${index}.jpg`,
        declaredMimeType: "image/jpeg",
        declaredByteSize: 10,
        status: "passed",
        assetId: assetRows[0]!.id,
        expiresAt: new Date(Date.now() + 60_000),
      });
    }
    const input = {
      idempotencyKey: "token-inquiry-0001",
      name: "Token Buyer",
      email: "token-buyer@example.test",
      description: null,
      uploadTokens: tokens,
      sourcePagePath: "/get-quote/",
      sessionId,
    };
    const first = await createInquiry(connection.db, new TestNotifier(), input);
    const replay = await createInquiry(connection.db, new TestNotifier(), {
      ...input,
      uploadTokens: [...tokens].reverse(),
    });
    expect(replay).toMatchObject({ inquiryId: first.inquiryId, replayed: true });
    const consumed = await connection.db
      .select({ isConsumed: uploadIntents.isConsumed, inquiryId: uploadIntents.consumedByInquiryId })
      .from(uploadIntents);
    expect(consumed).toEqual([
      { isConsumed: true, inquiryId: first.inquiryId },
      { isConsumed: true, inquiryId: first.inquiryId },
    ]);

    const conflictingToken = "attachment-token-c-0000000000000003";
    const conflictingAssetRows = await connection.db
      .insert(assets)
      .values({
        originalFileName: "token-conflict.jpg",
        storageProvider: "test",
        storagePartition: "private",
        objectKey: "inquiry/token-conflict.jpg",
        access: "private",
        category: "inquiry",
        status: "ready",
        scanStatus: "passed",
        declaredMimeType: "image/jpeg",
        byteSize: 10,
        sha256: "token-conflict-sha256",
      })
      .returning({ id: assets.id });
    await connection.db.insert(uploadIntents).values({
      tokenHash: createHash("sha256").update(conflictingToken).digest("hex"),
      anonymousSessionId: sessionId,
      declaredFileName: "token-conflict.jpg",
      declaredMimeType: "image/jpeg",
      declaredByteSize: 10,
      status: "passed",
      assetId: conflictingAssetRows[0]!.id,
      expiresAt: new Date(Date.now() + 60_000),
    });
    await expect(
      createInquiry(connection.db, new TestNotifier(), {
        ...input,
        uploadTokens: [conflictingToken],
      }),
    ).rejects.toBeInstanceOf(InquiryIdempotencyConflictError);
    const untouched = await connection.db
      .select({ status: uploadIntents.status, isConsumed: uploadIntents.isConsumed })
      .from(uploadIntents)
      .where(eq(uploadIntents.assetId, conflictingAssetRows[0]!.id));
    expect(untouched[0]).toEqual({ status: "passed", isConsumed: false });
    await connection.close();
  });

  it("excludes Spam from valid inquiry statistics", async () => {
    const connection = await createTestDatabase();
    await connection.db.insert(inquiries).values([
      {
        publicReference: "CWT-STATS-A",
        contactId: (await connection.db.insert(contacts).values({ name: "A", email: "a@example.test", normalizedEmail: "a@example.test" }).returning({ id: contacts.id }))[0]!.id,
        submittedName: "A",
        submittedEmail: "a@example.test",
        idempotencyKey: "stats-a",
        status: "new",
        description: "Valid",
        sourcePagePath: "/",
      },
      {
        publicReference: "CWT-STATS-B",
        contactId: (await connection.db.insert(contacts).values({ name: "B", email: "b@example.test", normalizedEmail: "b@example.test" }).returning({ id: contacts.id }))[0]!.id,
        submittedName: "B",
        submittedEmail: "b@example.test",
        idempotencyKey: "stats-b",
        status: "spam",
        description: "Spam",
        sourcePagePath: "/",
      },
    ]);
    await expect(countValidInquiries(connection.db)).resolves.toBe(1);
    await connection.close();
  });
});
import { createHash } from "node:crypto";
