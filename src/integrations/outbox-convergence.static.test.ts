import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();

async function source(path: string): Promise<string> {
  return readFile(join(root, path), "utf8");
}

describe("S5-F4 request-path and authority convergence", () => {
  it("contains no ordinary request-path notifier or post-commit delivery", async () => {
    const route = await source("src/app/api/inquiries/route.ts");
    const service = await source("src/crm/inquiry-service.ts");
    for (const obsolete of [
      "createEmailNotifier",
      "deliverInquiryNotification",
      "notifyInquiry",
      "EmailNotifier",
      "inquiry-notification-deferred",
    ]) {
      expect(route).not.toContain(obsolete);
      expect(service).not.toContain(obsolete);
    }
    expect(service.indexOf("await db.transaction")).toBeGreaterThan(-1);
    expect(service).toContain("inquiry_customer_confirmation");
  });

  it("has one centralized envelope/capture/SMTP construction authority", async () => {
    const email = await source("src/integrations/email.ts");
    const testSend = await source("src/email-templates/test-send.ts");
    const outbox = await source("src/integrations/notification-outbox.ts");
    expect(email.match(/nodemailer\.createTransport/g)).toHaveLength(1);
    expect(email.match(/buildTrustedEmailEnvelope/g)?.length).toBeGreaterThanOrEqual(1);
    expect(testSend).toContain("buildTrustedEmailEnvelope");
    expect(outbox).toContain("buildTrustedEmailEnvelope");
    expect(testSend).not.toContain("nodemailer");
    expect(outbox).not.toContain("nodemailer");
    expect(testSend).not.toContain("class InMemoryCaptureEmailTransport");
  });

  it("loads only Inquiry snapshots and attachment count after claim, never private files", async () => {
    const outbox = await source("src/integrations/notification-outbox.ts");
    expect(outbox).toContain("claimNotificationOutboxJob");
    expect(outbox).toContain("inquiryAssets");
    for (const forbidden of [
      "assets.",
      "objectKey",
      "privateUrl",
      "signedUrl",
      "storageProvider",
      "inquiryAssets.assetId",
    ]) expect(outbox).not.toContain(forbidden);
  });

  it("keeps the new writer versioned while legacy remains a bounded reader only", async () => {
    const payload = await source("src/integrations/notification-outbox-payload.ts");
    const service = await source("src/crm/inquiry-service.ts");
    expect(service).toContain("createNotificationOutboxPayloadV1");
    expect(service).not.toContain("legacyInquiryNotificationPayloadSchema");
    expect(payload).toContain("legacyInquiryNotificationPayloadSchema.parse");
    expect(payload).not.toContain("CUTOVER_AT");
    expect(payload).not.toContain("createdAt");
    expect(payload).toContain("schema_version: z.literal(1)");
  });
});
