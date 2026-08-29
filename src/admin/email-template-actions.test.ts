import { readFile } from "node:fs/promises";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  actor: vi.fn(),
  apply: vi.fn(),
  rollback: vi.fn(),
  save: vi.fn(),
  submit: vi.fn(),
  testSend: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("@/admin/actor", () => ({ currentActor: mocks.actor }));
vi.mock("@/config/env", () => ({ env: { APP_ENV: "test" } }));
vi.mock("@/db/client", () => ({
  databaseConnection: { kind: "pglite", db: { synthetic: true } },
}));
vi.mock("@/email-templates/service", () => ({
  applyEmailTemplateRevision: mocks.apply,
  rollbackEmailTemplate: mocks.rollback,
  saveEmailTemplateDraft: mocks.save,
  submitEmailTemplateDraftForReview: mocks.submit,
}));
vi.mock("@/email-templates/test-send", () => ({
  InMemoryCaptureEmailTransport: class {
    readonly kind = "capture_only";
  },
  sendSyntheticEmailTemplateTest: mocks.testSend,
  TEMPLATE_TEST_RECIPIENT: "test@cwtextile.com",
}));

import {
  applyEmailTemplateRevisionAction,
  rollbackEmailTemplateAction,
  saveEmailTemplateDraftAction,
  sendSyntheticEmailTemplateTestAction,
  submitEmailTemplateDraftReviewAction,
} from "./email-template-actions";

const actor = {
  userId: "11111111-1111-4111-8111-111111111111",
  role: "admin" as const,
};
const revisionId = "22222222-2222-4222-8222-222222222222";

function templateForm(): FormData {
  const form = new FormData();
  form.set("templateKind", "inquiry_customer_confirmation");
  form.set("revisionId", revisionId);
  return form;
}

describe("Email Template Admin Server Actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.actor.mockResolvedValue(actor);
    mocks.apply.mockResolvedValue({
      template: { templateKind: "inquiry_customer_confirmation" },
      provenance: { revisionId },
    });
    mocks.rollback.mockResolvedValue({ provenance: { revisionId } });
    mocks.save.mockResolvedValue({ revisionId, revisionVersion: 1, draftVersion: 1 });
    mocks.testSend.mockResolvedValue({
      outcome: "success",
      attempted: true,
      outcomeAuditRecorded: true,
    });
  });

  it("keeps every adapter Domain-only and free of direct writes, Audit, redirect, Provider, and recipient authority", async () => {
    const source = await readFile("src/admin/email-template-actions.ts", "utf8");
    expect(source).not.toMatch(/\.(insert|update|delete)\s*\(/);
    expect(source).not.toContain("writeAuditLog");
    expect(source).not.toMatch(/\bredirect\s*\(/);
    expect(source).not.toMatch(/nodemailer|smtp|provider/i);
    expect(source).toContain("InMemoryCaptureEmailTransport");
    expect(source).toContain("sendSyntheticEmailTemplateTest");
  });

  it("passes strict Draft expectations to the accepted Domain Service", async () => {
    const form = templateForm();
    form.set("expectedDraftVersion", "3");
    form.set("subjectSource", "Synthetic {{inquiry_reference}}");
    form.set("textBodySource", "Synthetic {{customer_name}}\r\nSecond line");
    form.set("changeSummary", "Synthetic Admin edit");
    await expect(saveEmailTemplateDraftAction(form)).resolves.toEqual({
      entityId: revisionId,
      refresh: true,
    });
    expect(mocks.save).toHaveBeenCalledWith(
      { synthetic: true },
      actor,
      {
        templateKind: "inquiry_customer_confirmation",
        subjectSource: "Synthetic {{inquiry_reference}}",
        textBodySource: "Synthetic {{customer_name}}\nSecond line",
        changeSummary: "Synthetic Admin edit",
        expectedRevisionId: revisionId,
        expectedDraftVersion: 3,
      },
    );
  });

  it("composes submit, Apply, and rollback only through the accepted lifecycle services", async () => {
    const submit = templateForm();
    submit.set("expectedDraftVersion", "2");
    await submitEmailTemplateDraftReviewAction(submit);
    expect(mocks.submit).toHaveBeenCalledWith(
      { synthetic: true },
      actor,
      { revisionId, expectedDraftVersion: 2 },
    );
    await applyEmailTemplateRevisionAction(templateForm());
    expect(mocks.apply).toHaveBeenCalledWith({ synthetic: true }, actor, revisionId);
    const rollback = templateForm();
    rollback.delete("revisionId");
    rollback.set("sourceRevisionId", revisionId);
    await rollbackEmailTemplateAction(rollback);
    expect(mocks.rollback).toHaveBeenCalledWith(
      { synthetic: true },
      actor,
      { templateKind: "inquiry_customer_confirmation", sourceRevisionId: revisionId },
    );
  });

  it.each([
    ["success", true, "Capture-only test succeeded", "success"],
    ["failure", true, "reported failure", "failure"],
    ["uncertain", false, "outcome is uncertain", "uncertain"],
  ] as const)("reports capture %s and outcome-Audit truth without retry", async (
    outcome,
    outcomeAuditRecorded,
    message,
    operationStatus,
  ) => {
    mocks.testSend.mockResolvedValue({ outcome, attempted: true, outcomeAuditRecorded });
    const result = await sendSyntheticEmailTemplateTestAction(templateForm());
    expect(result).toMatchObject({
      refresh: false,
      operationStatus,
      message: expect.stringContaining(message),
    });
    expect(result.message).toContain("test@cwtextile.com");
    expect(result.message).toContain(outcomeAuditRecorded
      ? "Outcome Audit recorded"
      : "capture truth is unchanged");
    expect(mocks.testSend).toHaveBeenCalledTimes(1);
  });

  it("rejects any browser-provided recipient field before capture", async () => {
    const form = templateForm();
    form.set("recipient", "customer@example.test");
    await expect(sendSyntheticEmailTemplateTestAction(form)).rejects.toMatchObject({
      fieldErrors: { recipient: ["Test recipient and envelope fields are server-owned."] },
    });
    expect(mocks.testSend).not.toHaveBeenCalled();
  });
});
