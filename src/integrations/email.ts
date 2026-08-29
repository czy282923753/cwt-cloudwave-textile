import nodemailer from "nodemailer";
import { z } from "zod";

import { env, type AppEnvironment } from "@/config/env";

export const TRUSTED_EMAIL_FROM = "CloudWave Textile Sales <sales@cwtextile.com>" as const;
export const TRUSTED_EMAIL_REPLY_TO = "info@cwtextile.com" as const;
export const TEMPLATE_TEST_RECIPIENT = "test@cwtextile.com" as const;

export type CaptureTransportOutcome =
  | Readonly<{ outcome: "success" }>
  | Readonly<{ outcome: "failure"; errorClass: string }>
  | Readonly<{ outcome: "uncertain"; errorClass: string }>;

export interface TrustedEmailEnvelope {
  readonly from: typeof TRUSTED_EMAIL_FROM;
  readonly replyTo: typeof TRUSTED_EMAIL_REPLY_TO;
  readonly to: string;
  readonly cc: readonly string[];
  readonly bcc: readonly string[];
  readonly subject: string;
  readonly textBody: string;
  readonly messageId: string;
}

export interface CaptureEmailTransport {
  readonly kind: "capture_only";
  capture(envelope: TrustedEmailEnvelope): Promise<CaptureTransportOutcome>;
}

export interface SmtpEmailTransport {
  readonly kind: "smtp";
  send(envelope: TrustedEmailEnvelope): Promise<CaptureTransportOutcome>;
}

export type EmailTransport = CaptureEmailTransport | SmtpEmailTransport;

export class InMemoryCaptureEmailTransport implements CaptureEmailTransport {
  readonly kind = "capture_only" as const;
  readonly captured: TrustedEmailEnvelope[] = [];

  constructor(private readonly result: CaptureTransportOutcome = { outcome: "success" }) {}

  async capture(envelope: TrustedEmailEnvelope): Promise<CaptureTransportOutcome> {
    this.captured.push(Object.freeze({
      ...envelope,
      cc: Object.freeze([...envelope.cc]),
      bcc: Object.freeze([...envelope.bcc]),
    }));
    return this.result;
  }
}

export interface EmailEnvelopePolicy {
  readonly environment: "local" | "test" | "staging" | "production";
  readonly applicationOrigin: string;
  readonly emailDriver: "log" | "smtp";
  readonly emailFrom: string;
  readonly internalRecipient: string;
  readonly smtpHost: string;
  readonly smtpPort: number;
  readonly smtpSecure: boolean;
  readonly smtpUser: string;
  readonly smtpPassword: string;
  readonly databaseDriver: "pglite" | "postgres";
  readonly monitoringDriver: "log" | "external";
}

export function emailEnvelopePolicyFromEnvironment(
  environment: AppEnvironment = env,
): EmailEnvelopePolicy {
  return Object.freeze({
    environment: environment.APP_ENV,
    applicationOrigin: environment.NEXT_PUBLIC_SITE_URL,
    emailDriver: environment.EMAIL_DRIVER,
    emailFrom: environment.EMAIL_FROM,
    internalRecipient: environment.INQUIRY_NOTIFICATION_TO,
    smtpHost: environment.SMTP_HOST,
    smtpPort: environment.SMTP_PORT,
    smtpSecure: environment.SMTP_SECURE,
    smtpUser: environment.SMTP_USER,
    smtpPassword: environment.SMTP_PASSWORD,
    databaseDriver: environment.DATABASE_DRIVER,
    monitoringDriver: environment.MONITORING_DRIVER,
  });
}

const safeAddressSchema = z.email().max(254).refine(
  (value) => !/[\r\n\u0000-\u001f\u007f,;]/.test(value),
  "Email recipient must be one mailbox without unsafe controls.",
);

function safeSubject(subject: string): string {
  const value = z.string().min(1).max(998).parse(subject);
  if (/[\r\n\u0000-\u001f\u007f]/.test(value)) {
    throw new Error("Email subject contains an unsafe header value.");
  }
  return value;
}

function safeBody(textBody: string): string {
  const value = z.string().min(1).max(100_000).parse(textBody);
  if (value.includes("\r") || /[\u0000-\u0009\u000b-\u001f\u007f]/.test(value)) {
    throw new Error("Email body contains an unsafe control value.");
  }
  return value;
}

export function exactlyOneLeadingPrefix(subject: string, marker: "TEST" | "STAGING"): string {
  const normalized = subject.trimStart();
  const exact = marker === "TEST" ? /^(?:\[TEST\]\s*)+/ : /^(?:\[STAGING\]\s*)+/;
  const unprefixed = normalized.replace(exact, "").trimStart();
  return unprefixed.length === 0 ? `[${marker}]` : `[${marker}] ${unprefixed}`;
}

export function deliveryKeyMessageId(deliveryKey: string): string {
  const stable = z.string().min(1).max(500).parse(deliveryKey)
    .replace(/[^a-z0-9.-]/gi, "-");
  return `<${stable}@cwt.invalid>`;
}

export function assertProductionEmailPolicy(policy: EmailEnvelopePolicy): void {
  if (policy.environment !== "production") return;
  const failures: string[] = [];
  if (policy.emailDriver !== "smtp") failures.push("SMTP driver is required");
  if (policy.emailFrom !== TRUSTED_EMAIL_FROM) failures.push("trusted From is required");
  if (policy.internalRecipient !== TRUSTED_EMAIL_REPLY_TO) {
    failures.push("trusted internal recipient is required");
  }
  if (!policy.smtpHost) failures.push("SMTP host is required");
  if (policy.smtpUser !== "sales@cwtextile.com") failures.push("trusted SMTP user is required");
  if (!policy.smtpPassword) failures.push("SMTP password is required");
  if (policy.databaseDriver !== "postgres") failures.push("isolated PostgreSQL is required");
  if (policy.monitoringDriver !== "external") failures.push("external monitoring is required");
  if (failures.length > 0) {
    throw new Error(`Production email policy refused: ${failures.join("; ")}.`);
  }
}

export function buildTrustedEmailEnvelope(input: {
  readonly policy: EmailEnvelopePolicy;
  readonly logicalTo: string;
  readonly logicalCc?: readonly string[];
  readonly logicalBcc?: readonly string[];
  readonly subject: string;
  readonly textBody: string;
  readonly deliveryKey: string;
  readonly isTestSend?: boolean;
}): TrustedEmailEnvelope {
  if (!input.isTestSend) assertProductionEmailPolicy(input.policy);
  let to = safeAddressSchema.parse(input.isTestSend ? TEMPLATE_TEST_RECIPIENT : input.logicalTo);
  let cc = (input.logicalCc ?? []).map((value) => safeAddressSchema.parse(value));
  let bcc = (input.logicalBcc ?? []).map((value) => safeAddressSchema.parse(value));
  let subject = safeSubject(input.subject);
  if (input.isTestSend) subject = exactlyOneLeadingPrefix(subject, "TEST");
  if (input.policy.environment === "staging") {
    to = TEMPLATE_TEST_RECIPIENT;
    cc = cc.length === 0 ? [] : [TEMPLATE_TEST_RECIPIENT];
    bcc = bcc.length === 0 ? [] : [TEMPLATE_TEST_RECIPIENT];
    subject = exactlyOneLeadingPrefix(subject, "STAGING");
  }
  return Object.freeze({
    from: TRUSTED_EMAIL_FROM,
    replyTo: TRUSTED_EMAIL_REPLY_TO,
    to,
    cc: Object.freeze(cc),
    bcc: Object.freeze(bcc),
    subject: safeSubject(subject),
    textBody: safeBody(input.textBody),
    messageId: deliveryKeyMessageId(input.deliveryKey),
  });
}

export function safeEmailErrorClass(error: unknown): string {
  if (!(error instanceof Error)) return "transport_exception";
  const value = error.name.replace(/[^a-zA-Z0-9_.-]/g, "_").slice(0, 80);
  return value || "transport_exception";
}

export function sanitizeTransportOutcome(
  result: CaptureTransportOutcome,
): CaptureTransportOutcome {
  if (result.outcome === "success") return Object.freeze({ outcome: "success" });
  return Object.freeze({
    outcome: result.outcome,
    errorClass: result.errorClass.replace(/[^a-zA-Z0-9_.-]/g, "_").slice(0, 80) || "unspecified",
  });
}

export async function dispatchTrustedEmail(
  transport: EmailTransport,
  policy: EmailEnvelopePolicy,
  envelope: TrustedEmailEnvelope,
): Promise<CaptureTransportOutcome> {
  if ((policy.environment === "local" || policy.environment === "test") &&
      transport.kind !== "capture_only") {
    throw new Error("Local and Test email delivery requires capture-only transport.");
  }
  try {
    const result = transport.kind === "capture_only"
      ? await transport.capture(envelope)
      : await transport.send(envelope);
    return sanitizeTransportOutcome(result);
  } catch (error) {
    return Object.freeze({ outcome: "uncertain", errorClass: safeEmailErrorClass(error) });
  }
}

class NodemailerSmtpTransport implements SmtpEmailTransport {
  readonly kind = "smtp" as const;
  private readonly transport;

  constructor(policy: EmailEnvelopePolicy) {
    this.transport = nodemailer.createTransport({
      host: policy.smtpHost,
      port: policy.smtpPort,
      secure: policy.smtpSecure,
      auth: { user: policy.smtpUser, pass: policy.smtpPassword },
    });
  }

  async send(envelope: TrustedEmailEnvelope): Promise<CaptureTransportOutcome> {
    await this.transport.sendMail({
      from: envelope.from,
      replyTo: envelope.replyTo,
      to: envelope.to,
      cc: [...envelope.cc],
      bcc: [...envelope.bcc],
      subject: envelope.subject,
      text: envelope.textBody,
      messageId: envelope.messageId,
    });
    return Object.freeze({ outcome: "success" });
  }
}

export function createEmailTransport(
  policy: EmailEnvelopePolicy = emailEnvelopePolicyFromEnvironment(),
): EmailTransport {
  if (policy.environment === "local" || policy.environment === "test") {
    if (policy.emailDriver === "smtp") {
      throw new Error("SMTP transport construction is forbidden in Local and Test.");
    }
    return new InMemoryCaptureEmailTransport();
  }
  if (policy.environment === "production") assertProductionEmailPolicy(policy);
  if (policy.emailDriver !== "smtp" || !policy.smtpHost || !policy.smtpUser || !policy.smtpPassword) {
    throw new Error("Staging and Production email delivery requires complete SMTP configuration.");
  }
  return new NodemailerSmtpTransport(policy);
}
