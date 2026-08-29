import { z } from "zod";

import {
  INTERNAL_OPTIONAL_TEMPLATE_VARIABLES,
  parseEmailTemplateRevision,
  type EmailTemplateKind,
  type EmailTemplateRevisionV1,
} from "./contracts";

const TOKEN_PATTERN = /\{\{([a-z_][a-z0-9_]*)\}\}/g;
const UNSAFE_BODY_VALUE_PATTERN = /[\u0000-\u0009\u000b-\u001f\u007f]/;
const HEADER_BREAK_PATTERN = /[\r\n\u0000-\u001f\u007f]/;

const boundedText = z.string().min(1).max(10_000);
const optionalBoundedText = z.string().min(1).max(2_000).nullable();

const customerContextSchema = z.object({
  templateKind: z.literal("inquiry_customer_confirmation"),
  customer_name: boundedText,
  inquiry_reference: z.string().regex(/^CWT-[0-9A-F]{20}$/),
  submitted_at: boundedText,
  company_name: z.literal("CloudWave Textile"),
  reply_to_email: z.literal("info@cwtextile.com"),
}).strict();

const internalContextSchema = z.object({
  templateKind: z.literal("inquiry_notification"),
  inquiry_reference: z.string().regex(/^CWT-[0-9A-F]{20}$/),
  submitted_at: boundedText,
  customer_name: boundedText,
  customer_email: z.email(),
  country_code: optionalBoundedText,
  whatsapp: optionalBoundedText,
  inquiry_description: optionalBoundedText,
  attachment_count: z.number().int().min(0).max(10_000),
  source_page_path: z.string().startsWith("/").max(2_000),
  landing_page_path: z.string().startsWith("/").max(2_000).nullable(),
  referrer: optionalBoundedText,
  utm_source: optionalBoundedText,
  utm_medium: optionalBoundedText,
  utm_campaign: optionalBoundedText,
  last_non_direct_source: optionalBoundedText,
  last_non_direct_medium: optionalBoundedText,
  last_non_direct_campaign: optionalBoundedText,
  source_entity_type: z.enum(["product", "application", "content"]).nullable(),
  source_entity_label: optionalBoundedText,
  operations_url: z.url().max(2_000).refine((value) => {
    const url = new URL(value);
    return !url.username && !url.password && !url.search && !url.hash &&
      (url.protocol === "https:" || url.hostname === "localhost") &&
      /^\/admin\/inquiries\/[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\/$/i.test(url.pathname);
  }, "Operations URL must be a trusted authenticated Inquiry record route."),
}).strict();

export type CustomerTemplateContext = z.infer<typeof customerContextSchema>;
export type InternalTemplateContext = z.infer<typeof internalContextSchema>;
export type EmailTemplateRenderContext = CustomerTemplateContext | InternalTemplateContext;

export interface RenderedEmailTemplate {
  readonly templateKind: EmailTemplateKind;
  readonly canonicalSha256: string;
  readonly subject: string;
  readonly textBody: string;
}

export function formatTemplateTimestamp(value: Date): string {
  if (Number.isNaN(value.getTime())) throw new Error("Template timestamp must be valid.");
  return value.toISOString();
}

export function buildCustomerTemplateContext(input: {
  readonly customerName: string;
  readonly inquiryReference: string;
  readonly submittedAt: Date;
}): CustomerTemplateContext {
  return Object.freeze(customerContextSchema.parse({
    templateKind: "inquiry_customer_confirmation",
    customer_name: input.customerName,
    inquiry_reference: input.inquiryReference,
    submitted_at: formatTemplateTimestamp(input.submittedAt),
    company_name: "CloudWave Textile",
    reply_to_email: "info@cwtextile.com",
  }));
}

export function buildTrustedOperationsUrl(input: {
  readonly applicationOrigin: string;
  readonly inquiryId: string;
}): string {
  const origin = new URL(input.applicationOrigin);
  if (origin.username || origin.password || origin.pathname !== "/" || origin.search || origin.hash) {
    throw new Error("Operations origin must be a trusted bare application origin.");
  }
  if (origin.protocol !== "https:" && origin.hostname !== "localhost") {
    throw new Error("Operations origin must use HTTPS outside loopback development.");
  }
  const inquiryId = z.uuid().parse(input.inquiryId);
  return new URL(`/admin/inquiries/${inquiryId}/`, origin).toString();
}

export function buildInternalTemplateContext(input: {
  readonly inquiryReference: string;
  readonly submittedAt: Date;
  readonly customerName: string;
  readonly customerEmail: string;
  readonly countryCode?: string | null;
  readonly whatsapp?: string | null;
  readonly inquiryDescription?: string | null;
  readonly attachmentCount: number;
  readonly sourcePagePath: string;
  readonly landingPagePath?: string | null;
  readonly referrer?: string | null;
  readonly utmSource?: string | null;
  readonly utmMedium?: string | null;
  readonly utmCampaign?: string | null;
  readonly lastNonDirectSource?: string | null;
  readonly lastNonDirectMedium?: string | null;
  readonly lastNonDirectCampaign?: string | null;
  readonly sourceEntityType?: "product" | "application" | "content" | null;
  readonly sourceEntityLabel?: string | null;
  readonly applicationOrigin: string;
  readonly inquiryId: string;
}): InternalTemplateContext {
  return Object.freeze(internalContextSchema.parse({
    templateKind: "inquiry_notification",
    inquiry_reference: input.inquiryReference,
    submitted_at: formatTemplateTimestamp(input.submittedAt),
    customer_name: input.customerName,
    customer_email: input.customerEmail,
    country_code: input.countryCode ?? null,
    whatsapp: input.whatsapp ?? null,
    inquiry_description: input.inquiryDescription ?? null,
    attachment_count: input.attachmentCount,
    source_page_path: input.sourcePagePath,
    landing_page_path: input.landingPagePath ?? null,
    referrer: input.referrer ?? null,
    utm_source: input.utmSource ?? null,
    utm_medium: input.utmMedium ?? null,
    utm_campaign: input.utmCampaign ?? null,
    last_non_direct_source: input.lastNonDirectSource ?? null,
    last_non_direct_medium: input.lastNonDirectMedium ?? null,
    last_non_direct_campaign: input.lastNonDirectCampaign ?? null,
    source_entity_type: input.sourceEntityType ?? null,
    source_entity_label: input.sourceEntityLabel ?? null,
    operations_url: buildTrustedOperationsUrl(input),
  }));
}

function parseContext(context: EmailTemplateRenderContext): EmailTemplateRenderContext {
  return context.templateKind === "inquiry_notification"
    ? internalContextSchema.parse(context)
    : customerContextSchema.parse(context);
}

function stringValue(value: string | number | null): string | null {
  if (value === null) return null;
  return typeof value === "number" ? String(value) : value;
}

function renderSource(
  source: string,
  context: EmailTemplateRenderContext,
  field: "subject" | "body",
): string {
  const contextRecord = context as unknown as Readonly<Record<string, string | number | null>>;
  const lines = field === "body" ? source.split("\n") : [source];
  const retained = lines.filter((line) => {
    const variables = [...line.matchAll(TOKEN_PATTERN)].map((match) => match[1]!);
    return !variables.some((variable) =>
      INTERNAL_OPTIONAL_TEMPLATE_VARIABLES.has(variable) &&
      stringValue(contextRecord[variable] ?? null) === null,
    );
  });
  const rendered = retained.join("\n").replace(TOKEN_PATTERN, (_token, variable: string) => {
    const value = stringValue(contextRecord[variable] ?? null);
    if (value === null) throw new Error(`Required template variable ${variable} is absent.`);
    if (field === "subject" && HEADER_BREAK_PATTERN.test(value)) {
      throw new Error("Rendered subject contains an unsafe header value.");
    }
    if (field === "body" && (value.includes("\r") || UNSAFE_BODY_VALUE_PATTERN.test(value))) {
      throw new Error("Rendered body contains an unsafe control value.");
    }
    return value;
  });
  if (field === "subject" && HEADER_BREAK_PATTERN.test(rendered)) {
    throw new Error("Rendered subject is not a safe single header value.");
  }
  return rendered;
}

export function renderEmailTemplate(
  templateInput: EmailTemplateRevisionV1,
  contextInput: EmailTemplateRenderContext,
): RenderedEmailTemplate {
  const template = parseEmailTemplateRevision(templateInput);
  const context = parseContext(contextInput);
  if (template.templateKind !== context.templateKind) {
    throw new Error("Template kind and render context do not match.");
  }
  return Object.freeze({
    templateKind: template.templateKind,
    canonicalSha256: template.canonicalSha256,
    subject: renderSource(template.subjectSource, context, "subject"),
    textBody: renderSource(template.textBodySource, context, "body"),
  });
}
