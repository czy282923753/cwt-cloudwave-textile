import { count, eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import {
  assets,
  contacts,
  customerActivities,
  inquiries,
  inquiryAssets,
  inquiryStatusHistory,
  users,
} from "@/db/schema";
import type { EmailNotifier, InquiryNotification } from "@/integrations/email";
import { createTestDatabase } from "@/test/database";

import {
  addCustomerActivity,
  assertInquiryStatusTransition,
  changeInquiryStatus,
  createInquiry,
} from "./inquiry-service";

class TestNotifier implements EmailNotifier {
  readonly notifications: InquiryNotification[] = [];
  async notifyInquiry(input: InquiryNotification): Promise<void> {
    this.notifications.push(input);
  }
}

describe("minimal inquiry and CRM workflow", () => {
  it("accepts text-only and image-only inquiries and exactly matches Contacts by email", async () => {
    const connection = await createTestDatabase();
    const notifier = new TestNotifier();
    const firstInquiryId = await createInquiry(connection.db, notifier, {
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
        declaredMimeType: "image/jpeg",
        detectedMimeType: "image/jpeg",
        byteSize: 100,
        sha256: "inquiry-image-sha",
      })
      .returning({ id: assets.id });
    const assetId = assetRows[0]?.id;
    if (!assetId) throw new Error("Missing private asset.");
    const secondInquiryId = await createInquiry(connection.db, notifier, {
      name: "Test Buyer Updated",
      email: "buyer@example.test",
      assetIds: [assetId],
      sourcePagePath: "/products/test",
    });
    expect(firstInquiryId).not.toBe(secondInquiryId);
    const contactCount = await connection.db.select({ count: count() }).from(contacts);
    const inquiryCount = await connection.db.select({ count: count() }).from(inquiries);
    const attachmentCount = await connection.db
      .select({ count: count() })
      .from(inquiryAssets);
    expect(Number(contactCount[0]?.count)).toBe(1);
    expect(Number(inquiryCount[0]?.count)).toBe(2);
    expect(Number(attachmentCount[0]?.count)).toBe(1);
    expect(notifier.notifications).toHaveLength(2);
    await connection.close();
  });

  it("records governed status history, activities, and first response time", async () => {
    const connection = await createTestDatabase();
    const notifier = new TestNotifier();
    const inquiryId = await createInquiry(connection.db, notifier, {
      name: "Test Buyer",
      email: "crm@example.test",
      description: "Text-only test inquiry.",
      assetIds: [],
      sourcePagePath: "/get-quote",
    });
    const userRows = await connection.db
      .insert(users)
      .values({
        email: "sales@example.test",
        displayName: "Sales Operator",
        role: "sales",
        passwordHash: "test",
      })
      .returning({ id: users.id });
    const userId = userRows[0]?.id;
    if (!userId) throw new Error("Missing sales user.");
    const actor = { userId, role: "sales" as const };
    await changeInquiryStatus(connection.db, actor, inquiryId, "reviewing");
    await changeInquiryStatus(connection.db, actor, inquiryId, "qualified");
    await addCustomerActivity(connection.db, actor, inquiryId, {
      type: "email",
      content: "Sent a test acknowledgement.",
    });
    const rows = await connection.db
      .select({ status: inquiries.status, firstResponseAt: inquiries.firstResponseAt })
      .from(inquiries)
      .where(eq(inquiries.id, inquiryId));
    expect(rows[0]?.status).toBe("qualified");
    expect(rows[0]?.firstResponseAt).toBeInstanceOf(Date);
    const history = await connection.db
      .select()
      .from(inquiryStatusHistory)
      .where(eq(inquiryStatusHistory.inquiryId, inquiryId));
    const activities = await connection.db
      .select()
      .from(customerActivities)
      .where(eq(customerActivities.inquiryId, inquiryId));
    expect(history).toHaveLength(3);
    expect(activities).toHaveLength(3);
    expect(() => assertInquiryStatusTransition("qualified", "new")).toThrow();
    await connection.close();
  });
});
