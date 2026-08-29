import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

const TEMPLATE_DOMAIN_FILES = [
  "src/email-templates/contracts.ts",
  "src/email-templates/fallbacks.ts",
  "src/email-templates/renderer.ts",
  "src/email-templates/service.ts",
  "src/email-templates/test-send.ts",
] as const;
const TEMPLATE_CORE_FILES = TEMPLATE_DOMAIN_FILES.filter(
  (path) => path !== "src/email-templates/test-send.ts",
);

describe("S5-F3 Template Domain scope boundary", () => {
  it("has no Inquiry, CRM, Outbox, Provider, SMTP, network, or browser execution dependency", async () => {
    const coreSources = await Promise.all(TEMPLATE_CORE_FILES.map((path) => readFile(path, "utf8")));
    const joined = coreSources.join("\n");
    for (const forbidden of [
      "@/crm/",
      "@/integrations/notification-outbox",
      "@/integrations/email",
      "nodemailer",
      "SMTP_",
      "createTransport",
      "sendMail(",
      "fetch(",
      "notificationOutbox",
      "inquiryAssets",
      "contacts",
      "organizations",
    ]) {
      expect(joined, forbidden).not.toContain(forbidden);
    }
    const testSend = await readFile("src/email-templates/test-send.ts", "utf8");
    expect(testSend).toContain("@/integrations/email");
    for (const forbidden of [
      "@/crm/",
      "@/integrations/notification-outbox",
      "nodemailer",
      "SMTP_",
      "createTransport",
      "sendMail(",
      "fetch(",
      "notificationOutbox",
      "inquiryAssets",
      "contacts",
      "organizations",
    ]) expect(testSend, forbidden).not.toContain(forbidden);
  });

  it("contains no second Template persistence or retry mechanism", async () => {
    const joined = (await Promise.all(
      TEMPLATE_DOMAIN_FILES.map((path) => readFile(path, "utf8")),
    )).join("\n");
    for (const forbidden of [
      "emailTemplates",
      "emailTemplateVersions",
      "templateQueue",
      "templateWorker",
      "retryCount",
      "leaseExpires",
      "setTimeout(",
    ]) {
      expect(joined, forbidden).not.toContain(forbidden);
    }
    expect(joined).toContain("systemSettings");
    expect(joined).toContain("editorialRevisions");
  });
});
