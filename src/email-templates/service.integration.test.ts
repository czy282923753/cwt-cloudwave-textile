import { and, eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import { canAccessEditorialResource } from "@/admin/preview-policy";
import { hasPermission, roles, type UserRole } from "@/auth/permissions";
import { auditLogs, editorialRevisions, systemSettings, users } from "@/db/schema";
import { EditorialDraftConflictError } from "@/editorial/conflict";
import { createTestDatabase } from "@/test/database";

import {
  applyEmailTemplateRevision,
  listEmailTemplateHistory,
  previewSyntheticEmailTemplate,
  resolveActiveEmailTemplate,
  rollbackEmailTemplate,
  saveEmailTemplateDraft,
  submitEmailTemplateDraftForReview,
} from "./service";

async function setup() {
  const connection = await createTestDatabase();
  const rows = await connection.db.insert(users).values(roles.map((role) => ({
    email: `template-${role}-${crypto.randomUUID()}@example.test`,
    displayName: `Synthetic ${role}`,
    role,
    passwordHash: "test",
  }))).returning({ id: users.id, role: users.role });
  const actor = (role: UserRole) => ({
    userId: rows.find((row) => row.role === role)!.id,
    role,
  });
  return { connection, actor };
}

function draftInput(
  subject: string,
  expectedDraftVersion = 0,
  expectedRevisionId?: string | null,
) {
  return {
    templateKind: "inquiry_customer_confirmation" as const,
    subjectSource: subject,
    textBodySource: "Synthetic body {{customer_name}} {{inquiry_reference}} {{submitted_at}} {{company_name}} {{reply_to_email}}",
    changeSummary: "Synthetic template change",
    expectedDraftVersion,
    ...(expectedRevisionId === undefined ? {} : { expectedRevisionId }),
  };
}

describe("email template Settings/Revision authority", () => {
  it("resolves absent and invalid Active as a complete code fallback with only a sanitized signal", async () => {
    const test = await setup();
    const absent = await resolveActiveEmailTemplate(
      test.connection.db,
      "inquiry_customer_confirmation",
    );
    expect(absent.provenance).toMatchObject({
      source: "code_fallback",
      fallbackReason: "active_absent",
      revisionId: null,
    });
    expect(absent.template.subjectSource).toBe(
      "We received your CloudWave Textile inquiry {{inquiry_reference}}",
    );
    expect(Object.isFrozen(absent)).toBe(true);
    expect(Object.isFrozen(absent.template)).toBe(true);
    expect(Object.isFrozen(absent.provenance)).toBe(true);

    await test.connection.db.insert(systemSettings).values({
      key: "email_template.inquiry_customer_confirmation",
      value: {
        schema: "email_template_active_v1",
        templateKind: "inquiry_customer_confirmation",
        contractVersion: 1,
        source: "revision",
        revisionId: "00000000-0000-4000-8000-000000000099",
        revisionVersion: 99,
        subjectSource: "LEAK-SENTINEL subject",
        textBodySource: "LEAK-SENTINEL body",
        canonicalSha256: "0".repeat(64),
      },
      isSensitive: false,
    });
    const signals: unknown[] = [];
    const invalid = await resolveActiveEmailTemplate(
      test.connection.db,
      "inquiry_customer_confirmation",
      { onConfigurationSignal: (signal) => { signals.push(signal); } },
    );
    expect(invalid.provenance.fallbackReason).toBe("active_invalid");
    expect(invalid.template.subjectSource).toBe(
      "We received your CloudWave Textile inquiry {{inquiry_reference}}",
    );
    expect(JSON.stringify(invalid)).not.toContain("LEAK-SENTINEL");
    expect(signals).toEqual([{
      code: "email_template_active_invalid",
      settingKey: "email_template.inquiry_customer_confirmation",
      templateKind: "inquiry_customer_confirmation",
    }]);
    expect(JSON.stringify(signals)).not.toContain("LEAK-SENTINEL");
    await expect(resolveActiveEmailTemplate(
      test.connection.db,
      "inquiry_customer_confirmation",
      { onConfigurationSignal: () => { throw new Error("Synthetic signal outage"); } },
    )).resolves.toMatchObject({
      provenance: { source: "code_fallback", fallbackReason: "active_invalid" },
    });
    await test.connection.close();
  });

  it("rejects each partial Active provenance shape as direct Setting pollution", async () => {
    const test = await setup();
    await saveEmailTemplateDraft(
      test.connection.db,
      test.actor("content_editor"),
      draftInput("Synthetic provenance seed"),
    );
    const setting = (await test.connection.db.select().from(systemSettings).where(
      eq(systemSettings.key, "email_template.inquiry_customer_confirmation"),
    ))[0]!;
    const active = setting.value as Readonly<Record<string, unknown>>;
    const pollutedValues = [
      {
        ...active,
        source: "revision",
        revisionId: "00000000-0000-4000-8000-000000000099",
        revisionVersion: null,
      },
      {
        ...active,
        source: "code_fallback",
        revisionId: null,
        revisionVersion: 99,
      },
    ];
    for (const value of pollutedValues) {
      await test.connection.db.update(systemSettings).set({ value }).where(eq(systemSettings.id, setting.id));
      const signals: unknown[] = [];
      const resolved = await resolveActiveEmailTemplate(
        test.connection.db,
        "inquiry_customer_confirmation",
        { onConfigurationSignal: (signal) => { signals.push(signal); } },
      );
      expect(resolved.provenance).toMatchObject({
        source: "code_fallback",
        revisionId: null,
        revisionVersion: null,
        fallbackReason: "active_invalid",
      });
      expect(resolved.template.subjectSource).toBe(
        "We received your CloudWave Textile inquiry {{inquiry_reference}}",
      );
      expect(signals).toEqual([{
        code: "email_template_active_invalid",
        settingKey: "email_template.inquiry_customer_confirmation",
        templateKind: "inquiry_customer_confirmation",
      }]);
    }
    await test.connection.close();
  });

  it("serializes Drafts, rejects stale work, applies one sole live projection, and rolls back by copy", async () => {
    const test = await setup();
    const editor = test.actor("content_editor");
    const reviewer = test.actor("reviewer_publisher");

    const concurrent = await Promise.allSettled([
      saveEmailTemplateDraft(test.connection.db, editor, draftInput("Synthetic concurrent A")),
      saveEmailTemplateDraft(test.connection.db, editor, draftInput("Synthetic concurrent B")),
    ]);
    expect(concurrent.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    expect(concurrent.filter((result) => result.status === "rejected")).toHaveLength(1);
    const first = concurrent.find((result) => result.status === "fulfilled")!.value;
    await expect(saveEmailTemplateDraft(
      test.connection.db,
      editor,
      draftInput("Synthetic stale", 0, first.revisionId),
    )).rejects.toBeInstanceOf(EditorialDraftConflictError);
    await submitEmailTemplateDraftForReview(test.connection.db, editor, {
      revisionId: first.revisionId,
      expectedDraftVersion: first.draftVersion,
    });
    const firstApplied = await applyEmailTemplateRevision(
      test.connection.db,
      reviewer,
      first.revisionId,
    );
    expect(firstApplied.provenance.revisionVersion).toBe(1);

    const second = await saveEmailTemplateDraft(
      test.connection.db,
      editor,
      draftInput("Synthetic custom active V2"),
    );
    expect(second.revisionVersion).toBe(2);
    await submitEmailTemplateDraftForReview(test.connection.db, editor, {
      revisionId: second.revisionId,
      expectedDraftVersion: second.draftVersion,
    });
    await applyEmailTemplateRevision(test.connection.db, reviewer, second.revisionId);
    const activeV2 = await resolveActiveEmailTemplate(
      test.connection.db,
      "inquiry_customer_confirmation",
    );
    expect(activeV2.provenance).toMatchObject({
      source: "revision",
      revisionId: second.revisionId,
      revisionVersion: 2,
      fallbackReason: null,
    });
    expect(activeV2.template.subjectSource).toBe("Synthetic custom active V2");
    expect(activeV2.template.subjectSource).not.toContain("We received your CloudWave Textile");

    const rolledBack = await rollbackEmailTemplate(test.connection.db, reviewer, {
      templateKind: "inquiry_customer_confirmation",
      sourceRevisionId: first.revisionId,
    });
    expect(rolledBack.provenance.revisionVersion).toBe(3);
    expect(rolledBack.provenance.revisionId).not.toBe(first.revisionId);
    expect(rolledBack.template.subjectSource).toBe(firstApplied.template.subjectSource);
    const history = await listEmailTemplateHistory(
      test.connection.db,
      reviewer.role,
      "inquiry_customer_confirmation",
    );
    expect(history.map((entry) => entry.revisionVersion)).toEqual([3, 2, 1]);
    expect(history[0]?.template.rollbackSourceRevisionId).toBe(first.revisionId);
    expect(history.every((entry) => entry.status === "applied")).toBe(true);
    const settings = await test.connection.db.select().from(systemSettings).where(
      eq(systemSettings.key, "email_template.inquiry_customer_confirmation"),
    );
    expect(settings).toHaveLength(1);
    expect(settings[0]?.isSensitive).toBe(false);
    expect(settings[0]?.value).toMatchObject({
      schema: "email_template_active_v1",
      source: "revision",
      revisionId: rolledBack.provenance.revisionId,
      revisionVersion: 3,
    });
    await test.connection.close();
  });

  it("rejects stale Apply and atomically rolls back Settings/Revision when required Audit fails", async () => {
    const test = await setup();
    const editor = test.actor("content_editor");
    const reviewer = test.actor("reviewer_publisher");
    const first = await saveEmailTemplateDraft(
      test.connection.db,
      editor,
      draftInput("Synthetic older in review"),
    );
    await submitEmailTemplateDraftForReview(test.connection.db, editor, {
      revisionId: first.revisionId,
      expectedDraftVersion: first.draftVersion,
    });
    const second = await saveEmailTemplateDraft(
      test.connection.db,
      editor,
      draftInput("Synthetic newer draft"),
    );
    await expect(applyEmailTemplateRevision(test.connection.db, reviewer, first.revisionId))
      .rejects.toThrow(/newer/i);
    await submitEmailTemplateDraftForReview(test.connection.db, editor, {
      revisionId: second.revisionId,
      expectedDraftVersion: second.draftVersion,
    });
    await expect(applyEmailTemplateRevision(
      test.connection.db,
      reviewer,
      second.revisionId,
      { auditWriter: async () => { throw new Error("TEST required Audit failure"); } },
    )).rejects.toThrow(/TEST required Audit failure/);
    const setting = (await test.connection.db.select().from(systemSettings).where(
      eq(systemSettings.key, "email_template.inquiry_customer_confirmation"),
    ))[0]!;
    expect(setting.value).toMatchObject({ source: "code_fallback", revisionId: null });
    const revision = (await test.connection.db.select().from(editorialRevisions).where(
      eq(editorialRevisions.id, second.revisionId),
    ))[0]!;
    expect(revision.status).toBe("in_review");
    expect(await test.connection.db.select().from(auditLogs).where(and(
      eq(auditLogs.action, "email_template.revision.applied"),
      eq(auditLogs.entityId, second.revisionId),
    ))).toHaveLength(0);
    await test.connection.close();
  });

  it("rolls back initial Setting and Draft together when required Audit creation fails", async () => {
    const test = await setup();
    await expect(saveEmailTemplateDraft(
      test.connection.db,
      test.actor("content_editor"),
      draftInput("Synthetic required Audit rollback"),
      { auditWriter: async () => { throw new Error("TEST Audit unavailable"); } },
    )).rejects.toThrow(/TEST Audit unavailable/);
    expect(await test.connection.db.select().from(systemSettings).where(
      eq(systemSettings.key, "email_template.inquiry_customer_confirmation"),
    )).toHaveLength(0);
    expect(await test.connection.db.select().from(editorialRevisions).where(
      eq(editorialRevisions.entityType, "email_template"),
    )).toHaveLength(0);
    await test.connection.close();
  });

  it("enforces the complete role/action matrix without granting Inquiry access", async () => {
    const expected = {
      admin: { manage: true, write: true, preview: true, review: true, apply: true },
      content_editor: { manage: true, write: true, preview: true, review: false, apply: false },
      reviewer_publisher: { manage: true, write: false, preview: true, review: true, apply: true },
      product_editor: { manage: false, write: false, preview: false, review: false, apply: false },
      sales: { manage: false, write: false, preview: false, review: false, apply: false },
      analyst: { manage: false, write: false, preview: false, review: false, apply: false },
    } as const;
    for (const role of roles) {
      for (const action of ["manage", "write", "preview", "review", "apply"] as const) {
        expect(canAccessEditorialResource(role, "email_template", action), `${role}/${action}`)
          .toBe(expected[role][action]);
      }
    }
    expect(hasPermission("content_editor", "inquiries.read")).toBe(false);
    expect(hasPermission("reviewer_publisher", "inquiries.read")).toBe(false);
    expect(canAccessEditorialResource("sales", "email_template", "preview")).toBe(false);

    const test = await setup();
    await expect(previewSyntheticEmailTemplate(
      test.connection.db,
      test.actor("sales"),
      "inquiry_notification",
    )).rejects.toThrow(/permission/i);
    const preview = await previewSyntheticEmailTemplate(
      test.connection.db,
      test.actor("content_editor"),
      "inquiry_notification",
    );
    expect(preview.contextId).toBe("SYNTHETIC_EMAIL_TEMPLATE_V1");
    expect(preview.rendered.textBody).toContain("Conspicuously Synthetic");
    expect(preview.rendered.textBody).not.toMatch(/object key|signed url/i);
    await test.connection.close();
  });

  it("rejects a polluted sensitive Setting before selected-Revision Preview rendering", async () => {
    const test = await setup();
    const draft = await saveEmailTemplateDraft(
      test.connection.db,
      test.actor("content_editor"),
      draftInput("Synthetic sensitive Setting probe"),
    );
    await test.connection.db.update(systemSettings).set({ isSensitive: true }).where(
      eq(systemSettings.key, "email_template.inquiry_customer_confirmation"),
    );
    await expect(previewSyntheticEmailTemplate(
      test.connection.db,
      test.actor("content_editor"),
      "inquiry_customer_confirmation",
      draft.revisionId,
    )).rejects.toThrow(/Sensitive Email Template Setting is forbidden/);
    await test.connection.close();
  });
});
