import { z } from "zod";

import { isIsoAlpha2CountryCode } from "@/crm/country-codes";
import {
  createEmailTemplateRevision,
  type EmailTemplateKind,
  type EmailTemplateRevisionV1,
} from "@/email-templates/contracts";
import type { ResolvedEmailTemplate } from "@/email-templates/service";

export const NOTIFICATION_OUTBOX_KINDS = [
  "inquiry_notification",
  "inquiry_customer_confirmation",
] as const;

export type NotificationOutboxKind = (typeof NOTIFICATION_OUTBOX_KINDS)[number];

const sha256Schema = z.string().regex(/^[a-f0-9]{64}$/);
const safeSourceLabelSchema = z.string().min(1).max(500).refine(
  (value) => value === value.normalize("NFC").trim() && !/[\u0000-\u001f\u007f]/.test(value),
  "Source label must be normalized, trimmed, and free of control characters.",
);

const templateSnapshotFields = {
  template_kind: z.enum(NOTIFICATION_OUTBOX_KINDS),
  contract_version: z.literal(1),
  canonical_sha256: sha256Schema,
  subject_source: z.string().min(1).max(200),
  text_body_source: z.string().min(1).max(20_000),
} as const;

export const notificationTemplateSnapshotV1Schema = z.discriminatedUnion("source", [
  z.object({
    ...templateSnapshotFields,
    source: z.literal("revision"),
    revision_id: z.uuid(),
    revision_version: z.number().int().positive(),
  }).strict(),
  z.object({
    ...templateSnapshotFields,
    source: z.literal("code_fallback"),
    revision_id: z.null(),
    revision_version: z.null(),
  }).strict(),
]);

export const notificationOutboxPayloadV1Schema = z.object({
  schema_version: z.literal(1),
  inquiry_id: z.uuid(),
  template_snapshot: notificationTemplateSnapshotV1Schema,
  source_entity_label_snapshot: safeSourceLabelSchema.nullable(),
}).strict();

export type NotificationOutboxPayloadV1 = z.infer<typeof notificationOutboxPayloadV1Schema>;

export const legacyInquiryNotificationPayloadSchema = z.object({
  inquiryId: z.uuid(),
  name: z.string().min(1).max(10_000),
  email: z.email(),
  countryCode: z.string().refine(isIsoAlpha2CountryCode).nullable().optional(),
  whatsapp: z.string().max(2_000).nullable().optional(),
  description: z.string().max(10_000).nullable().optional(),
  attachmentCount: z.number().int().min(0).max(10_000),
}).strict();

export type LegacyInquiryNotificationPayload = z.infer<
  typeof legacyInquiryNotificationPayloadSchema
>;

/**
 * Code cutover boundary for the read-only legacy parser. New code never writes
 * the legacy shape, and rows at or after this instant cannot invoke it.
 */
export const NOTIFICATION_OUTBOX_V1_CUTOVER_AT = new Date(
  "2026-08-30T00:00:00.000Z",
);

export type ParsedNotificationOutboxPayload =
  | Readonly<{ format: "v1"; value: NotificationOutboxPayloadV1 }>
  | Readonly<{ format: "legacy_internal"; value: LegacyInquiryNotificationPayload }>;

function validateSnapshotTemplate(
  snapshot: NotificationOutboxPayloadV1["template_snapshot"],
): EmailTemplateRevisionV1 {
  const template = createEmailTemplateRevision({
    templateKind: snapshot.template_kind,
    subjectSource: snapshot.subject_source,
    textBodySource: snapshot.text_body_source,
    draftVersion: 1,
  });
  if (template.canonicalSha256 !== snapshot.canonical_sha256) {
    throw new Error("Outbox template snapshot canonical hash does not match its source.");
  }
  return template;
}

export function parseNotificationOutboxPayload(input: {
  readonly kind: string;
  readonly payload: unknown;
  readonly createdAt: Date;
  readonly status: string;
}): ParsedNotificationOutboxPayload {
  if (input.kind !== "inquiry_notification" &&
      input.kind !== "inquiry_customer_confirmation") {
    throw new Error("Unsupported notification Outbox kind.");
  }
  const v1 = notificationOutboxPayloadV1Schema.safeParse(input.payload);
  if (v1.success) {
    if (v1.data.template_snapshot.template_kind !== input.kind) {
      throw new Error("Outbox kind and captured template kind do not match.");
    }
    validateSnapshotTemplate(v1.data.template_snapshot);
    return Object.freeze({ format: "v1", value: Object.freeze(v1.data) });
  }
  if (
    input.kind !== "inquiry_notification" ||
    !["pending", "processing", "failed"].includes(input.status) ||
    input.createdAt.getTime() >= NOTIFICATION_OUTBOX_V1_CUTOVER_AT.getTime()
  ) {
    throw new Error("Notification Outbox payload is not a supported version.");
  }
  return Object.freeze({
    format: "legacy_internal",
    value: Object.freeze(legacyInquiryNotificationPayloadSchema.parse(input.payload)),
  });
}

export function createNotificationOutboxPayloadV1(input: {
  readonly inquiryId: string;
  readonly kind: EmailTemplateKind;
  readonly resolved: ResolvedEmailTemplate;
  readonly sourceEntityLabelSnapshot?: string | null;
}): NotificationOutboxPayloadV1 {
  if (input.resolved.template.templateKind !== input.kind) {
    throw new Error("Resolved template kind does not match Outbox kind.");
  }
  const provenance = input.resolved.provenance;
  if (provenance.canonicalSha256 !== input.resolved.template.canonicalSha256) {
    throw new Error("Resolved template provenance hash does not match its snapshot.");
  }
  return notificationOutboxPayloadV1Schema.parse({
    schema_version: 1,
    inquiry_id: input.inquiryId,
    template_snapshot: {
      template_kind: input.kind,
      contract_version: 1,
      source: provenance.source,
      revision_id: provenance.revisionId,
      revision_version: provenance.revisionVersion,
      canonical_sha256: input.resolved.template.canonicalSha256,
      subject_source: input.resolved.template.subjectSource,
      text_body_source: input.resolved.template.textBodySource,
    },
    source_entity_label_snapshot: input.sourceEntityLabelSnapshot ?? null,
  });
}

export function templateFromNotificationSnapshot(
  snapshot: NotificationOutboxPayloadV1["template_snapshot"],
): EmailTemplateRevisionV1 {
  return validateSnapshotTemplate(notificationTemplateSnapshotV1Schema.parse(snapshot));
}
