import { describe, expect, it } from "vitest";

import {
  assertProductionEmailPolicy,
  buildTrustedEmailEnvelope,
  canonicalReservedSubjectPrefixes,
  createEmailTransport,
  dispatchTrustedEmail,
  InMemoryCaptureEmailTransport,
  TEMPLATE_TEST_RECIPIENT,
  type EmailEnvelopePolicy,
  type SmtpEmailTransport,
} from "./email";

function policy(
  environment: EmailEnvelopePolicy["environment"],
  overrides: Partial<EmailEnvelopePolicy> = {},
): EmailEnvelopePolicy {
  return {
    environment,
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
    ...overrides,
  };
}

describe("central trusted email envelope and transport policy", () => {
  it.each([
    ["   [TEST] [STAGING] [TEST] Subject", ["TEST"], "[TEST] Subject"],
    ["[STAGING] [TEST] [STAGING] Subject", ["STAGING"], "[STAGING] Subject"],
    ["[TEST] [STAGING] [TEST]", ["STAGING", "TEST"], "[STAGING] [TEST]"],
    ["[STAGING] [TEST] Subject", ["STAGING", "TEST"], "[STAGING] [TEST] Subject"],
    ["[test] [Staging] Subject", ["TEST"], "[TEST] [test] [Staging] Subject"],
  ] as const)("normalizes the complete exact reserved-marker set in %j", (
    subject,
    required,
    expected,
  ) => {
    expect(canonicalReservedSubjectPrefixes(subject, required)).toBe(expected);
  });

  it("leaves an ordinary subject unchanged when no policy prefix is required", () => {
    const subject = "   [TEST] [STAGING] Authored subject";
    expect(buildTrustedEmailEnvelope({
      policy: policy("test"),
      logicalTo: "synthetic@example.test",
      subject,
      textBody: "Synthetic body.",
      deliveryKey: "ordinary:subject",
    }).subject).toBe(subject);
  });

  it.each([
    ["[TEST] [STAGING] Synthetic", "[STAGING] [TEST] Synthetic"],
    ["[STAGING] [TEST] Synthetic", "[STAGING] [TEST] Synthetic"],
    ["[STAGING] [STAGING] [TEST] Synthetic", "[STAGING] [TEST] Synthetic"],
    ["   [TEST] [STAGING] [TEST]", "[STAGING] [TEST]"],
    ["[test] [Staging] Synthetic", "[STAGING] [TEST] [test] [Staging] Synthetic"],
  ])("replaces every Staging recipient and canonically prefixes %j", (subject, expected) => {
    const envelope = buildTrustedEmailEnvelope({
      policy: policy("staging"),
      logicalTo: "logical-to@example.test",
      logicalCc: ["logical-cc-a@example.test", "logical-cc-b@example.test"],
      logicalBcc: ["logical-bcc@example.test"],
      subject,
      textBody: "Synthetic body.",
      deliveryKey: "staging:test:key",
      isTestSend: true,
    });
    expect(envelope).toMatchObject({
      to: TEMPLATE_TEST_RECIPIENT,
      cc: [TEMPLATE_TEST_RECIPIENT],
      bcc: [TEMPLATE_TEST_RECIPIENT],
      subject: expected,
    });
    expect(JSON.stringify(envelope)).not.toContain("logical-");
    const rebuilt = buildTrustedEmailEnvelope({
      policy: policy("staging"),
      logicalTo: "logical-to@example.test",
      subject: envelope.subject,
      textBody: envelope.textBody,
      deliveryKey: "staging:test:key",
      isTestSend: true,
    });
    expect(rebuilt.subject).toBe(expected);
  });

  it("applies exactly one Staging-only marker through the ordinary envelope path", () => {
    const envelope = buildTrustedEmailEnvelope({
      policy: policy("staging"),
      logicalTo: "logical-to@example.test",
      subject: " [TEST] [STAGING] [TEST] Synthetic",
      textBody: "Synthetic body.",
      deliveryKey: "staging:ordinary:key",
    });
    expect(envelope.subject).toBe("[STAGING] Synthetic");
  });

  it.each([
    { logicalTo: "one@example.test\r\nBcc: victim@example.test" },
    { logicalTo: "one@example.test,two@example.test" },
    { logicalTo: "one@example.test;two@example.test" },
    { logicalTo: "one@example.test", subject: "safe\nBcc: victim@example.test" },
    { logicalTo: "one@example.test", textBody: "safe\u0000unsafe" },
  ])("rejects header, multi-address, and control injection %#", (unsafe) => {
    expect(() => buildTrustedEmailEnvelope({
      policy: policy("test"),
      logicalTo: unsafe.logicalTo,
      subject: unsafe.subject ?? "Synthetic subject",
      textBody: unsafe.textBody ?? "Synthetic body.",
      deliveryKey: "injection:test",
    })).toThrow();
  });

  it("refuses SMTP construction and calls in Local/Test", async () => {
    expect(() => createEmailTransport(policy("local", { emailDriver: "smtp" })))
      .toThrow(/forbidden/i);
    let calls = 0;
    const smtp: SmtpEmailTransport = {
      kind: "smtp",
      send: async () => {
        calls += 1;
        return { outcome: "success" };
      },
    };
    const envelope = buildTrustedEmailEnvelope({
      policy: policy("test"),
      logicalTo: "synthetic@example.test",
      subject: "Synthetic subject",
      textBody: "Synthetic body.",
      deliveryKey: "local:test",
    });
    await expect(dispatchTrustedEmail(smtp, policy("test"), envelope))
      .rejects.toThrow(/capture-only/i);
    expect(calls).toBe(0);
  });

  it("fails closed for incomplete Production configuration", () => {
    expect(() => assertProductionEmailPolicy(policy("production")))
      .toThrow(/Production email policy refused/);
    expect(() => buildTrustedEmailEnvelope({
      policy: policy("production"),
      logicalTo: "synthetic@example.test",
      subject: "Synthetic subject",
      textBody: "Synthetic body.",
      deliveryKey: "production:incomplete",
    })).toThrow(/Production email policy refused/);
  });

  it("keeps empty CC/BCC empty and preserves stable Message-ID through capture", async () => {
    const input = {
      policy: policy("test"),
      logicalTo: "synthetic@example.test",
      subject: "Synthetic subject",
      textBody: "Synthetic body.",
      deliveryKey: "inquiry_notification:11111111-1111-4111-8111-111111111111",
    } as const;
    const first = buildTrustedEmailEnvelope(input);
    const second = buildTrustedEmailEnvelope(input);
    expect(second.messageId).toBe(first.messageId);
    expect(first.cc).toEqual([]);
    expect(first.bcc).toEqual([]);
    const transport = new InMemoryCaptureEmailTransport();
    await expect(dispatchTrustedEmail(transport, policy("test"), first))
      .resolves.toEqual({ outcome: "success" });
    expect(transport.captured[0]?.messageId).toBe(first.messageId);
  });
});
