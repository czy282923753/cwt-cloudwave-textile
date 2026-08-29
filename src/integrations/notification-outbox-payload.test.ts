import { describe, expect, it } from "vitest";

import { codeEmailTemplateFallback } from "@/email-templates/fallbacks";
import type { ResolvedEmailTemplate } from "@/email-templates/service";

import {
  createNotificationOutboxPayloadV1,
  notificationOutboxPayloadV1Schema,
  parseNotificationOutboxPayload,
  templateFromNotificationSnapshot,
} from "./notification-outbox-payload";

const inquiryId = "11111111-1111-4111-8111-111111111111";

function fallback(kind: "inquiry_notification" | "inquiry_customer_confirmation"):
ResolvedEmailTemplate {
  const template = codeEmailTemplateFallback(kind);
  return Object.freeze({
    template,
    provenance: Object.freeze({
      source: "code_fallback" as const,
      settingKey: `email_template.${kind}`,
      revisionId: null,
      revisionVersion: null,
      canonicalSha256: template.canonicalSha256,
      fallbackReason: "active_absent" as const,
    }),
  });
}

describe("strict PII-minimized Notification Outbox payload", () => {
  it.each(["inquiry_notification", "inquiry_customer_confirmation"] as const)(
    "creates one strict versioned %s payload with a complete fallback snapshot",
    (kind) => {
      const payload = createNotificationOutboxPayloadV1({
        inquiryId,
        kind,
        resolved: fallback(kind),
        sourceEntityLabelSnapshot: "Synthetic Product",
      });
      expect(payload).toMatchObject({
        schema_version: 1,
        inquiry_id: inquiryId,
        source_entity_label_snapshot: "Synthetic Product",
        template_snapshot: {
          template_kind: kind,
          contract_version: 1,
          source: "code_fallback",
          revision_id: null,
          revision_version: null,
        },
      });
      expect(templateFromNotificationSnapshot(payload.template_snapshot))
        .toEqual(fallback(kind).template);
      expect(Object.keys(payload).sort()).toEqual([
        "inquiry_id",
        "schema_version",
        "source_entity_label_snapshot",
        "template_snapshot",
      ]);
      const serialized = JSON.stringify(payload);
      for (const forbidden of [
        "Actual Buyer Name", "actual-buyer@example.test", "+86 13800000000",
        "Actual private description", "customer-sample.jpg", "private/object/key",
        "signed.example", "contact-id", "consent-session", "rendered_body",
      ]) expect(serialized).not.toContain(forbidden);
    },
  );

  it("rejects unknown fields, version/kind mismatch, partial provenance, and hash drift", () => {
    const payload = createNotificationOutboxPayloadV1({
      inquiryId,
      kind: "inquiry_notification",
      resolved: fallback("inquiry_notification"),
    });
    expect(() => notificationOutboxPayloadV1Schema.parse({ ...payload, extra: true }))
      .toThrow();
    expect(() => parseNotificationOutboxPayload({
      kind: "inquiry_customer_confirmation",
      payload,
      status: "pending",
    })).toThrow(/kind.*match/i);
    expect(() => notificationOutboxPayloadV1Schema.parse({
      ...payload,
      template_snapshot: {
        ...payload.template_snapshot,
        source: "revision",
        revision_id: "22222222-2222-4222-8222-222222222222",
        revision_version: null,
      },
    })).toThrow();
    expect(() => parseNotificationOutboxPayload({
      kind: "inquiry_notification",
      payload: {
        ...payload,
        template_snapshot: {
          ...payload.template_snapshot,
          canonical_sha256: "0".repeat(64),
        },
      },
      status: "pending",
    })).toThrow(/hash/i);
  });

  it("accepts only exact active legacy internal rows without calendar authority", () => {
    const legacy = {
      inquiryId,
      name: "Synthetic Legacy Buyer",
      email: "legacy@example.test",
      countryCode: "CN",
      whatsapp: null,
      description: "Synthetic legacy body.",
      attachmentCount: 0,
    };
    for (const status of ["pending", "processing", "failed"] as const) {
      expect(parseNotificationOutboxPayload({
        kind: "inquiry_notification",
        payload: legacy,
        status,
      }).format).toBe("legacy_internal");
    }
    for (const rejected of [
      { kind: "inquiry_customer_confirmation", status: "pending" },
      { kind: "inquiry_notification", status: "sent" },
      { kind: "inquiry_notification", status: "dead" },
    ]) {
      expect(() => parseNotificationOutboxPayload({ ...rejected, payload: legacy }))
        .toThrow(/supported version/i);
    }
    expect(() => parseNotificationOutboxPayload({
      kind: "inquiry_notification",
      payload: { ...legacy, unknown: true },
      status: "pending",
    })).toThrow();
    for (const polluted of [
      { ...legacy, schema_version: 1 },
      { ...legacy, schema_version: 2 },
      { schema_version: 2, inquiry_id: inquiryId },
    ]) {
      expect(() => parseNotificationOutboxPayload({
        kind: "inquiry_notification",
        payload: polluted,
        status: "pending",
      })).toThrow();
    }
    expect(createNotificationOutboxPayloadV1({
      inquiryId,
      kind: "inquiry_notification",
      resolved: fallback("inquiry_notification"),
    })).toHaveProperty("schema_version", 1);
  });

  it.each([
    " leading",
    "trailing ",
    "unsafe\nlabel",
    "x".repeat(501),
  ])("rejects unsafe source label snapshot %j", (label) => {
    expect(() => createNotificationOutboxPayloadV1({
      inquiryId,
      kind: "inquiry_notification",
      resolved: fallback("inquiry_notification"),
      sourceEntityLabelSnapshot: label,
    })).toThrow();
  });
});
