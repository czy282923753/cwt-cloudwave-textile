import { canonicalJsonHash } from "@/ai/canonical-json";
import { z } from "zod";

export const EMAIL_TEMPLATE_KINDS = [
  "inquiry_notification",
  "inquiry_customer_confirmation",
] as const;

export const EMAIL_TEMPLATE_SETTING_KEYS = {
  inquiry_notification: "email_template.inquiry_notification",
  inquiry_customer_confirmation: "email_template.inquiry_customer_confirmation",
} as const;

export type EmailTemplateKind = (typeof EMAIL_TEMPLATE_KINDS)[number];
export type EmailTemplateSettingKey = (typeof EMAIL_TEMPLATE_SETTING_KEYS)[EmailTemplateKind];

export const CUSTOMER_TEMPLATE_VARIABLES = [
  "customer_name",
  "inquiry_reference",
  "submitted_at",
  "company_name",
  "reply_to_email",
] as const;

export const INTERNAL_TEMPLATE_VARIABLES = [
  "inquiry_reference",
  "submitted_at",
  "customer_name",
  "customer_email",
  "country_code",
  "whatsapp",
  "inquiry_description",
  "attachment_count",
  "source_page_path",
  "landing_page_path",
  "referrer",
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "last_non_direct_source",
  "last_non_direct_medium",
  "last_non_direct_campaign",
  "source_entity_type",
  "source_entity_label",
  "operations_url",
] as const;

export const INTERNAL_OPTIONAL_TEMPLATE_VARIABLES = new Set<string>([
  "country_code",
  "whatsapp",
  "inquiry_description",
  "landing_page_path",
  "referrer",
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "last_non_direct_source",
  "last_non_direct_medium",
  "last_non_direct_campaign",
  "source_entity_type",
  "source_entity_label",
]);

const sha256Schema = z.string().regex(/^[a-f0-9]{64}$/);
const subjectSourceSchema = z.string().min(1).max(200);
const textBodySourceSchema = z.string().min(1).max(20_000);

export const emailTemplateSourceSchema = z.object({
  templateKind: z.enum(EMAIL_TEMPLATE_KINDS),
  contractVersion: z.literal(1),
  subjectSource: subjectSourceSchema,
  textBodySource: textBodySourceSchema,
}).strict();

export const emailTemplateRevisionV1Schema = z.object({
  schema: z.literal("email_template_revision_v1"),
  templateKind: z.enum(EMAIL_TEMPLATE_KINDS),
  contractVersion: z.literal(1),
  subjectSource: subjectSourceSchema,
  textBodySource: textBodySourceSchema,
  canonicalSha256: sha256Schema,
  draftVersion: z.number().int().positive(),
  rollbackSourceRevisionId: z.uuid().nullable(),
}).strict();

const emailTemplateActiveFields = {
  schema: z.literal("email_template_active_v1"),
  templateKind: z.enum(EMAIL_TEMPLATE_KINDS),
  contractVersion: z.literal(1),
  subjectSource: subjectSourceSchema,
  textBodySource: textBodySourceSchema,
  canonicalSha256: sha256Schema,
} as const;

export const emailTemplateActiveV1Schema = z.discriminatedUnion("source", [
  z.object({
    ...emailTemplateActiveFields,
    source: z.literal("revision"),
    revisionId: z.uuid(),
    revisionVersion: z.number().int().positive(),
  }).strict(),
  z.object({
    ...emailTemplateActiveFields,
    source: z.literal("code_fallback"),
    revisionId: z.null(),
    revisionVersion: z.null(),
  }).strict(),
]);

export type EmailTemplateSource = z.infer<typeof emailTemplateSourceSchema>;
export type EmailTemplateRevisionV1 = z.infer<typeof emailTemplateRevisionV1Schema>;
export type EmailTemplateActiveV1 = z.infer<typeof emailTemplateActiveV1Schema>;

const TOKEN_PATTERN = /\{\{([a-z_][a-z0-9_]*)\}\}/g;
const UNSAFE_CONTROL_PATTERN = /[\u0000-\u0009\u000b-\u001f\u007f]/;
const MARKUP_OR_REMOTE_PATTERN = /<[^>]*>|!?(?:\[[^\]]*\])\([^)]*\)|(?:^|\n)\s{0,3}#{1,6}\s|\*\*[^*]+\*\*|__[^_]+__|~~[^~]+~~|`|(?:https?|ftp):\/\/|\bwww\.|\b(?:data|cid|javascript|vbscript|file):|@import\b|\burl\s*\(|\{\s*[^{}]+\s*:[^{}]+\}/i;
const TEMPLATE_DIRECTIVE_PATTERN = /\{%|%\}|\$\{|\{\{[#/>!]|\}\}\s*\(|\b(?:include|import|extends|fetch)\s*\(/i;

export class EmailTemplateContractError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EmailTemplateContractError";
  }
}

export function settingKeyForTemplateKind(kind: EmailTemplateKind): EmailTemplateSettingKey {
  return EMAIL_TEMPLATE_SETTING_KEYS[kind];
}

export function templateKindForSettingKey(key: string): EmailTemplateKind | null {
  const entry = Object.entries(EMAIL_TEMPLATE_SETTING_KEYS)
    .find(([, candidate]) => candidate === key);
  return entry ? entry[0] as EmailTemplateKind : null;
}

export function canonicalTemplateSource(source: EmailTemplateSource): {
  readonly canonicalJson: string;
  readonly canonicalSha256: string;
} {
  const parsed = emailTemplateSourceSchema.parse(source);
  const result = canonicalJsonHash(parsed);
  if (!result.ok) throw new EmailTemplateContractError("Template source cannot be canonicalized.");
  return Object.freeze({
    canonicalJson: result.value.canonicalJson,
    canonicalSha256: result.value.hash,
  });
}

function variablesForKind(kind: EmailTemplateKind): ReadonlySet<string> {
  return new Set(kind === "inquiry_notification"
    ? INTERNAL_TEMPLATE_VARIABLES
    : CUSTOMER_TEMPLATE_VARIABLES);
}

function validatePlainTextField(value: string, field: "subject" | "body"): void {
  if (value.includes("\r") || UNSAFE_CONTROL_PATTERN.test(value)) {
    throw new EmailTemplateContractError(`${field} contains an unsafe control character.`);
  }
  if (field === "subject" && value.includes("\n")) {
    throw new EmailTemplateContractError("subject contains a line break.");
  }
  if (MARKUP_OR_REMOTE_PATTERN.test(value) || TEMPLATE_DIRECTIVE_PATTERN.test(value)) {
    throw new EmailTemplateContractError(`${field} must be strict plain text without markup or remote content.`);
  }
}

function validateTokens(value: string, allowed: ReadonlySet<string>, field: string): void {
  const withoutTokens = value.replace(TOKEN_PATTERN, "");
  if (withoutTokens.includes("{") || withoutTokens.includes("}")) {
    throw new EmailTemplateContractError(`${field} contains an invalid template expression.`);
  }
  for (const match of value.matchAll(TOKEN_PATTERN)) {
    const variable = match[1];
    if (!variable || !allowed.has(variable)) {
      throw new EmailTemplateContractError(`${field} contains an unknown template variable.`);
    }
  }
}

export function validateEmailTemplateSource(input: unknown): EmailTemplateSource {
  const source = emailTemplateSourceSchema.parse(input);
  validatePlainTextField(source.subjectSource, "subject");
  validatePlainTextField(source.textBodySource, "body");
  const allowed = variablesForKind(source.templateKind);
  validateTokens(source.subjectSource, allowed, "subject");
  validateTokens(source.textBodySource, allowed, "body");
  return source;
}

export function createEmailTemplateRevision(input: {
  readonly templateKind: EmailTemplateKind;
  readonly subjectSource: string;
  readonly textBodySource: string;
  readonly draftVersion: number;
  readonly rollbackSourceRevisionId?: string | null;
}): EmailTemplateRevisionV1 {
  const source = validateEmailTemplateSource({
    templateKind: input.templateKind,
    contractVersion: 1,
    subjectSource: input.subjectSource,
    textBodySource: input.textBodySource,
  });
  const hash = canonicalTemplateSource(source).canonicalSha256;
  return emailTemplateRevisionV1Schema.parse({
    schema: "email_template_revision_v1",
    ...source,
    canonicalSha256: hash,
    draftVersion: input.draftVersion,
    rollbackSourceRevisionId: input.rollbackSourceRevisionId ?? null,
  });
}

export function parseEmailTemplateRevision(input: unknown): EmailTemplateRevisionV1 {
  const revision = emailTemplateRevisionV1Schema.parse(input);
  const source = validateEmailTemplateSource({
    templateKind: revision.templateKind,
    contractVersion: revision.contractVersion,
    subjectSource: revision.subjectSource,
    textBodySource: revision.textBodySource,
  });
  if (canonicalTemplateSource(source).canonicalSha256 !== revision.canonicalSha256) {
    throw new EmailTemplateContractError("Template Revision canonical hash does not match its source.");
  }
  return revision;
}

export function createEmailTemplateActive(input: {
  readonly template: EmailTemplateRevisionV1;
  readonly source: "revision" | "code_fallback";
  readonly revisionId?: string | null;
  readonly revisionVersion?: number | null;
}): EmailTemplateActiveV1 {
  const revision = parseEmailTemplateRevision(input.template);
  return emailTemplateActiveV1Schema.parse({
    schema: "email_template_active_v1",
    templateKind: revision.templateKind,
    contractVersion: revision.contractVersion,
    source: input.source,
    revisionId: input.revisionId ?? null,
    revisionVersion: input.revisionVersion ?? null,
    subjectSource: revision.subjectSource,
    textBodySource: revision.textBodySource,
    canonicalSha256: revision.canonicalSha256,
  });
}

export function parseEmailTemplateActive(input: unknown): EmailTemplateActiveV1 {
  const active = emailTemplateActiveV1Schema.parse(input);
  const source = validateEmailTemplateSource({
    templateKind: active.templateKind,
    contractVersion: active.contractVersion,
    subjectSource: active.subjectSource,
    textBodySource: active.textBodySource,
  });
  if (canonicalTemplateSource(source).canonicalSha256 !== active.canonicalSha256) {
    throw new EmailTemplateContractError("Active template canonical hash does not match its source.");
  }
  return active;
}
