import { describe, expect, it } from "vitest";

import {
  canonicalTemplateSource,
  createEmailTemplateActive,
  createEmailTemplateRevision,
  CUSTOMER_TEMPLATE_VARIABLES,
  EMAIL_TEMPLATE_KINDS,
  EMAIL_TEMPLATE_SETTING_KEYS,
  emailTemplateActiveV1Schema,
  emailTemplateRevisionV1Schema,
  INTERNAL_TEMPLATE_VARIABLES,
  parseEmailTemplateActive,
  parseEmailTemplateRevision,
  settingKeyForTemplateKind,
  templateKindForSettingKey,
  validateEmailTemplateSource,
} from "./contracts";
import { CODE_EMAIL_TEMPLATE_FALLBACKS } from "./fallbacks";
import {
  buildCustomerTemplateContext,
  buildInternalTemplateContext,
  renderEmailTemplate,
} from "./renderer";

const customerSource = {
  templateKind: "inquiry_customer_confirmation" as const,
  contractVersion: 1 as const,
  subjectSource: "Synthetic acknowledgement {{inquiry_reference}}",
  textBodySource: "Hello {{customer_name}} from {{company_name}}. Reply to {{reply_to_email}} at {{submitted_at}}.",
};

function internalContext(overrides: Record<string, unknown> = {}) {
  return {
    ...buildInternalTemplateContext({
      inquiryReference: "CWT-AAAAAAAAAAAAAAAAAAAA",
      submittedAt: new Date("2026-01-15T10:30:00.000Z"),
      customerName: "Synthetic Customer",
      customerEmail: "synthetic@example.test",
      countryCode: "US",
      whatsapp: "+1 555 0100",
      inquiryDescription: "Synthetic description",
      attachmentCount: 2,
      sourcePagePath: "/synthetic-source/",
      landingPagePath: "/synthetic-landing/",
      referrer: "synthetic.example.test",
      utmSource: "synthetic_source",
      utmMedium: "synthetic_medium",
      utmCampaign: "synthetic_campaign",
      lastNonDirectSource: "synthetic_last_source",
      lastNonDirectMedium: "synthetic_last_medium",
      lastNonDirectCampaign: "synthetic_last_campaign",
      sourceEntityType: "product",
      sourceEntityLabel: "Synthetic Product Label",
      applicationOrigin: "https://operations.example.test",
      inquiryId: "00000000-0000-4000-8000-000000000001",
    }),
    ...overrides,
  };
}

describe("email template V1 contracts", () => {
  it("owns exactly the two approved non-sensitive Setting keys and kinds", () => {
    expect(EMAIL_TEMPLATE_KINDS).toEqual([
      "inquiry_notification",
      "inquiry_customer_confirmation",
    ]);
    expect(EMAIL_TEMPLATE_SETTING_KEYS).toEqual({
      inquiry_notification: "email_template.inquiry_notification",
      inquiry_customer_confirmation: "email_template.inquiry_customer_confirmation",
    });
    for (const kind of EMAIL_TEMPLATE_KINDS) {
      expect(templateKindForSettingKey(settingKeyForTemplateKind(kind))).toBe(kind);
    }
    expect(templateKindForSettingKey("email_template.unknown")).toBeNull();
  });

  it("uses stable canonical serialization and rejects hash drift", () => {
    const first = canonicalTemplateSource(customerSource);
    const reordered = canonicalTemplateSource({
      textBodySource: customerSource.textBodySource,
      subjectSource: customerSource.subjectSource,
      contractVersion: 1,
      templateKind: customerSource.templateKind,
    });
    expect(first).toEqual(reordered);
    const revision = createEmailTemplateRevision({
      ...customerSource,
      draftVersion: 1,
    });
    expect(() => parseEmailTemplateRevision({
      ...revision,
      canonicalSha256: "0".repeat(64),
    })).toThrow(/canonical hash/i);
  });

  it("rejects unknown schema fields, versions, kinds, and Active provenance shapes", () => {
    const revision = createEmailTemplateRevision({ ...customerSource, draftVersion: 1 });
    expect(emailTemplateRevisionV1Schema.safeParse({ ...revision, extra: true }).success).toBe(false);
    expect(emailTemplateRevisionV1Schema.safeParse({ ...revision, contractVersion: 2 }).success).toBe(false);
    expect(emailTemplateRevisionV1Schema.safeParse({ ...revision, templateKind: "other" }).success).toBe(false);
    const active = createEmailTemplateActive({ template: revision, source: "code_fallback" });
    expect(emailTemplateActiveV1Schema.safeParse({ ...active, extra: true }).success).toBe(false);
    expect(emailTemplateActiveV1Schema.safeParse({
      ...active,
      source: "revision",
      revisionId: null,
      revisionVersion: null,
    }).success).toBe(false);
    expect(() => parseEmailTemplateActive({ ...active, canonicalSha256: "f".repeat(64) }))
      .toThrow(/canonical hash/i);
  });

  it("accepts the complete kind-specific variable matrices and rejects cross-kind/private variables", () => {
    for (const variable of CUSTOMER_TEMPLATE_VARIABLES) {
      expect(() => validateEmailTemplateSource({
        ...customerSource,
        textBodySource: `Value: {{${variable}}}`,
      })).not.toThrow();
    }
    for (const variable of INTERNAL_TEMPLATE_VARIABLES) {
      expect(() => validateEmailTemplateSource({
        templateKind: "inquiry_notification",
        contractVersion: 1,
        subjectSource: "Synthetic internal",
        textBodySource: `Value: {{${variable}}}`,
      })).not.toThrow();
    }
    for (const variable of [
      "customer_email", "whatsapp", "inquiry_description", "attachment_count",
      "utm_source", "operations_url", "inquiry_id", "object_key", "signed_url",
    ]) {
      expect(() => validateEmailTemplateSource({
        ...customerSource,
        textBodySource: `Forbidden: {{${variable}}}`,
      })).toThrow(/unknown template variable/i);
    }
    for (const expression of [
      "{{customer.name}}", "{{customer_name | upper}}", "{{fn()}}", "{{#loop}}",
      "{% include 'remote' %}", "${secret}", "{{operations_url/path}}",
    ]) {
      expect(() => validateEmailTemplateSource({
        ...customerSource,
        textBodySource: expression,
      })).toThrow();
    }
  });

  it("rejects CR/LF subject injection, controls, markup, scripts, and remote content", () => {
    for (const subjectSource of ["Safe\nBcc: leak@example.test", "Safe\rInjected", "Safe\u0000Value"]) {
      expect(() => validateEmailTemplateSource({ ...customerSource, subjectSource })).toThrow();
    }
    for (const textBodySource of [
      "<strong>markup</strong>", "<script>alert(1)</script>", "[remote](https://example.test)",
      "https://example.test/pixel", "data:image/png;base64,AA", "cid:tracking", "{% fetch('x') %}",
      "# Markdown heading", "**bold markup**", "`code markup`", "javascript:alert(1)",
      "@import 'remote.css'", "background: url(remote.png)",
    ]) {
      expect(() => validateEmailTemplateSource({ ...customerSource, textBodySource })).toThrow();
    }
  });

  it("renders deterministically, omits complete optional lines, and rejects rendered header injection", () => {
    const template = createEmailTemplateRevision({
      templateKind: "inquiry_notification",
      subjectSource: "Synthetic {{customer_name}} {{inquiry_reference}}",
      textBodySource: "Required: {{inquiry_reference}}\nCountry: {{country_code}}\nWhatsApp: {{whatsapp}}\nAttachments: {{attachment_count}}",
      draftVersion: 1,
    });
    const context = internalContext({ country_code: null, whatsapp: null });
    const first = renderEmailTemplate(template, context as never);
    const second = renderEmailTemplate(template, context as never);
    expect(first).toEqual(second);
    expect(first.textBody).toBe("Required: CWT-AAAAAAAAAAAAAAAAAAAA\nAttachments: 2");
    expect(first.textBody).not.toContain("Country:");
    expect(() => renderEmailTemplate(template, internalContext({
      customer_name: "Synthetic\nBcc: leak@example.test",
    }) as never)).toThrow(/unsafe header/i);
  });

  it("builds operations_url only from trusted origin plus record identity", () => {
    expect(internalContext().operations_url).toBe(
      "https://operations.example.test/admin/inquiries/00000000-0000-4000-8000-000000000001/",
    );
    expect(() => buildInternalTemplateContext({
      inquiryReference: "CWT-AAAAAAAAAAAAAAAAAAAA",
      submittedAt: new Date(),
      customerName: "Synthetic",
      customerEmail: "synthetic@example.test",
      attachmentCount: 0,
      sourcePagePath: "/",
      applicationOrigin: "http://untrusted.example.test",
      inquiryId: "00000000-0000-4000-8000-000000000001",
    })).toThrow(/HTTPS/i);
  });

  it("preserves the exact code-owned fallback copy and contains no invented business facts", () => {
    expect(CODE_EMAIL_TEMPLATE_FALLBACKS.inquiry_customer_confirmation.subjectSource).toBe(
      "We received your CloudWave Textile inquiry {{inquiry_reference}}",
    );
    expect(CODE_EMAIL_TEMPLATE_FALLBACKS.inquiry_customer_confirmation.textBodySource).toBe(
      "Hello {{customer_name}},\n\nThank you for contacting CloudWave Textile. We received your inquiry\n{{inquiry_reference}} on {{submitted_at}}. Our team will review it and\nreply from our business email.\n\nIf you need to add context, reply to {{reply_to_email}} and include your\ninquiry reference.\n\nCloudWave Textile",
    );
    expect(CODE_EMAIL_TEMPLATE_FALLBACKS.inquiry_notification.textBodySource).toContain(
      "Private attachment count: {{attachment_count}}",
    );
    expect(CODE_EMAIL_TEMPLATE_FALLBACKS.inquiry_notification.textBodySource).not.toMatch(
      /object key|signed url|factory|capacity|certification|moq/i,
    );
    const rendered = renderEmailTemplate(
      CODE_EMAIL_TEMPLATE_FALLBACKS.inquiry_customer_confirmation,
      buildCustomerTemplateContext({
        customerName: "Synthetic Customer",
        inquiryReference: "CWT-AAAAAAAAAAAAAAAAAAAA",
        submittedAt: new Date("2026-01-15T10:30:00.000Z"),
      }),
    );
    expect(rendered.textBody).not.toContain("{{");
  });
});
