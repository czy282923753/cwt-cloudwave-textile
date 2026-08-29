import {
  createEmailTemplateRevision,
  type EmailTemplateKind,
  type EmailTemplateRevisionV1,
} from "./contracts";

const CUSTOMER_FALLBACK = createEmailTemplateRevision({
  templateKind: "inquiry_customer_confirmation",
  subjectSource: "We received your CloudWave Textile inquiry {{inquiry_reference}}",
  textBodySource: `Hello {{customer_name}},

Thank you for contacting CloudWave Textile. We received your inquiry
{{inquiry_reference}} on {{submitted_at}}. Our team will review it and
reply from our business email.

If you need to add context, reply to {{reply_to_email}} and include your
inquiry reference.

CloudWave Textile`,
  draftVersion: 1,
});

const INTERNAL_FALLBACK = createEmailTemplateRevision({
  templateKind: "inquiry_notification",
  subjectSource: "New CWT inquiry {{inquiry_reference}}",
  textBodySource: `New CWT inquiry

Reference: {{inquiry_reference}}
Submitted: {{submitted_at}}
Name: {{customer_name}}
Email: {{customer_email}}
Country: {{country_code}}
WhatsApp: {{whatsapp}}
Description: {{inquiry_description}}
Private attachment count: {{attachment_count}}
Source page: {{source_page_path}}
Landing page: {{landing_page_path}}
Referrer: {{referrer}}
UTM: {{utm_source}} / {{utm_medium}} / {{utm_campaign}}
Last non-direct: {{last_non_direct_source}} / {{last_non_direct_medium}} /
{{last_non_direct_campaign}}
Source entity: {{source_entity_type}} — {{source_entity_label}}

Open CWT Operations: {{operations_url}}
Review private files only through authenticated record-scoped access.`,
  draftVersion: 1,
});

export const CODE_EMAIL_TEMPLATE_FALLBACKS: Readonly<
  Record<EmailTemplateKind, EmailTemplateRevisionV1>
> = Object.freeze({
  inquiry_notification: Object.freeze(INTERNAL_FALLBACK),
  inquiry_customer_confirmation: Object.freeze(CUSTOMER_FALLBACK),
});

export function codeEmailTemplateFallback(kind: EmailTemplateKind): EmailTemplateRevisionV1 {
  return CODE_EMAIL_TEMPLATE_FALLBACKS[kind];
}
