import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import { auditLogs, systemSettings, users } from "@/db/schema";
import { createTestDatabase } from "@/test/database";

import { saveEmailTemplateDraft } from "./service";
import {
  InMemoryCaptureEmailTransport,
  sendSyntheticEmailTemplateTest,
  TEMPLATE_TEST_RECIPIENT,
} from "./test-send";

async function setup(subjectSource = "[TEST] [TEST] Synthetic {{inquiry_reference}}") {
  const connection = await createTestDatabase();
  const rows = await connection.db.insert(users).values([
    { email: `template-admin-${crypto.randomUUID()}@example.test`, displayName: "Synthetic Admin", role: "admin", passwordHash: "test" },
    { email: `template-editor-${crypto.randomUUID()}@example.test`, displayName: "Synthetic Editor", role: "content_editor", passwordHash: "test" },
  ]).returning({ id: users.id, role: users.role });
  const admin = { userId: rows.find((row) => row.role === "admin")!.id, role: "admin" as const };
  const editor = { userId: rows.find((row) => row.role === "content_editor")!.id, role: "content_editor" as const };
  const draft = await saveEmailTemplateDraft(connection.db, editor, {
    templateKind: "inquiry_customer_confirmation",
    subjectSource,
    textBodySource: "Synthetic body for {{customer_name}} at {{submitted_at}} from {{company_name}} via {{reply_to_email}}.",
    changeSummary: "Synthetic test-send Draft",
    expectedDraftVersion: 0,
  });
  return { connection, admin, editor, draft };
}

describe("capture-only Email Template test send", () => {
  it.each([
    ["   [TEST] [TEST] Synthetic {{inquiry_reference}}", "[TEST] Synthetic CWT-AAAAAAAAAAAAAAAAAAAA"],
    ["[TEST] [TEST] Synthetic {{inquiry_reference}}", "[TEST] Synthetic CWT-AAAAAAAAAAAAAAAAAAAA"],
    ["[test] Synthetic {{inquiry_reference}}", "[TEST] [test] Synthetic CWT-AAAAAAAAAAAAAAAAAAAA"],
    ["[TEST] [TEST]", "[TEST]"],
  ])("normalizes the test-send subject %j to exactly one uppercase marker", async (subjectSource, expected) => {
    const test = await setup(subjectSource);
    const transport = new InMemoryCaptureEmailTransport();
    await sendSyntheticEmailTemplateTest(test.connection.db, test.admin, {
      templateKind: "inquiry_customer_confirmation",
      revisionId: test.draft.revisionId,
      environment: "test",
    }, transport);
    expect(transport.captured[0]?.subject).toBe(expected);
    expect(transport.captured[0]?.subject.match(/\[TEST\]/g)).toHaveLength(1);
    await test.connection.close();
  });

  it("uses renderer/envelope parity, forced recipient, one prefix, and sanitized attempt/outcome Audit", async () => {
    const test = await setup();
    const transport = new InMemoryCaptureEmailTransport();
    const result = await sendSyntheticEmailTemplateTest(test.connection.db, test.admin, {
      templateKind: "inquiry_customer_confirmation",
      revisionId: test.draft.revisionId,
      environment: "production",
    }, transport);
    expect(result).toEqual({ outcome: "success", attempted: true, outcomeAuditRecorded: true });
    expect(transport.captured).toHaveLength(1);
    const envelope = transport.captured[0]!;
    expect(envelope.to).toBe(TEMPLATE_TEST_RECIPIENT);
    expect(envelope.cc).toEqual([]);
    expect(envelope.bcc).toEqual([]);
    expect(envelope.from).toBe("CloudWave Textile Sales <sales@cwtextile.com>");
    expect(envelope.replyTo).toBe("info@cwtextile.com");
    expect(envelope.subject).toBe("[TEST] Synthetic CWT-AAAAAAAAAAAAAAAAAAAA");
    expect(envelope.subject.match(/\[TEST\]/g)).toHaveLength(1);
    expect(envelope.textBody).toContain("Synthetic Customer");
    const audits = await test.connection.db.select().from(auditLogs).where(
      eq(auditLogs.entityId, test.draft.revisionId),
    );
    expect(audits.map((row) => row.action)).toEqual([
      "email_template.draft.created",
      "email_template.test_send.attempted",
      "email_template.test_send.success",
    ]);
    const testAudits = audits.filter((row) => row.action.includes("test_send"));
    const serialized = JSON.stringify(testAudits);
    expect(serialized).not.toContain(TEMPLATE_TEST_RECIPIENT);
    expect(serialized).not.toContain(envelope.subject);
    expect(serialized).not.toContain(envelope.textBody);
    expect(serialized).not.toContain("Synthetic Customer");
    await test.connection.close();
  });

  it("commits required attempt Audit before transport and does not call transport when it fails", async () => {
    const test = await setup();
    const transport = new InMemoryCaptureEmailTransport();
    await expect(sendSyntheticEmailTemplateTest(test.connection.db, test.admin, {
      templateKind: "inquiry_customer_confirmation",
      revisionId: test.draft.revisionId,
      environment: "test",
    }, transport, {
      attemptAuditWriter: async () => { throw new Error("TEST required attempt Audit failure"); },
    })).rejects.toThrow(/required attempt Audit failure/);
    expect(transport.captured).toHaveLength(0);
    await test.connection.close();
  });

  it("reports actual success when event-only outcome Audit fails", async () => {
    const test = await setup();
    const transport = new InMemoryCaptureEmailTransport();
    const result = await sendSyntheticEmailTemplateTest(test.connection.db, test.admin, {
      templateKind: "inquiry_customer_confirmation",
      revisionId: test.draft.revisionId,
      environment: "local",
    }, transport, {
      outcomeAuditWriter: async () => { throw new Error("TEST outcome Audit failure"); },
    });
    expect(result).toEqual({ outcome: "success", attempted: true, outcomeAuditRecorded: false });
    expect(transport.captured).toHaveLength(1);
    await test.connection.close();
  });

  it("preserves failure and uncertain truth with exactly one capture and zero automatic retry", async () => {
    const test = await setup();
    const failureTransport = new InMemoryCaptureEmailTransport({
      outcome: "failure",
      errorClass: "synthetic_rejection",
    });
    const failure = await sendSyntheticEmailTemplateTest(test.connection.db, test.admin, {
      templateKind: "inquiry_customer_confirmation",
      revisionId: test.draft.revisionId,
      environment: "test",
    }, failureTransport);
    expect(failure).toMatchObject({ outcome: "failure", errorClass: "synthetic_rejection" });
    expect(failureTransport.captured).toHaveLength(1);

    let calls = 0;
    const uncertain = await sendSyntheticEmailTemplateTest(test.connection.db, test.admin, {
      templateKind: "inquiry_customer_confirmation",
      revisionId: test.draft.revisionId,
      environment: "test",
    }, {
      kind: "capture_only",
      capture: async () => {
        calls += 1;
        throw new Error("Synthetic timeout detail must not enter Audit");
      },
    });
    expect(uncertain).toMatchObject({ outcome: "uncertain", errorClass: "Error" });
    expect(calls).toBe(1);
    const audits = await test.connection.db.select().from(auditLogs).where(
      eq(auditLogs.action, "email_template.test_send.uncertain"),
    );
    expect(audits).toHaveLength(1);
    expect(JSON.stringify(audits)).not.toContain("Synthetic timeout detail");
    await test.connection.close();
  });

  it("is Admin-only even when another editorial role may Preview", async () => {
    const test = await setup();
    const transport = new InMemoryCaptureEmailTransport();
    await expect(sendSyntheticEmailTemplateTest(test.connection.db, test.editor, {
      templateKind: "inquiry_customer_confirmation",
      revisionId: test.draft.revisionId,
      environment: "test",
    }, transport)).rejects.toThrow(/Only Admin/i);
    expect(transport.captured).toHaveLength(0);
    await test.connection.close();
  });

  it("inherits selected-Revision rejection for a polluted sensitive Setting", async () => {
    const test = await setup();
    await test.connection.db.update(systemSettings).set({ isSensitive: true }).where(
      eq(systemSettings.key, "email_template.inquiry_customer_confirmation"),
    );
    const transport = new InMemoryCaptureEmailTransport();
    await expect(sendSyntheticEmailTemplateTest(test.connection.db, test.admin, {
      templateKind: "inquiry_customer_confirmation",
      revisionId: test.draft.revisionId,
      environment: "test",
    }, transport)).rejects.toThrow(/Sensitive Email Template Setting is forbidden/);
    expect(transport.captured).toHaveLength(0);
    await test.connection.close();
  });
});
