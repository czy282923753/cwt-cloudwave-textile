import type { PgQueryResultHKT } from "drizzle-orm/pg-core/session";

import { writeAuditLog, type AuditInput } from "@/audit/service";
import type { Actor } from "@/catalog/product-service";
import type { AppDatabase } from "@/db/types";

import type { EmailTemplateKind } from "./contracts";
import {
  previewSyntheticEmailTemplate,
  SYNTHETIC_TEMPLATE_CONTEXT_ID,
} from "./service";

export const TEMPLATE_TEST_RECIPIENT = "test@cwtextile.com";

export type CaptureTransportOutcome =
  | Readonly<{ outcome: "success" }>
  | Readonly<{ outcome: "failure"; errorClass: string }>
  | Readonly<{ outcome: "uncertain"; errorClass: string }>;

export interface TemplateTestEnvelope {
  readonly from: "CloudWave Textile Sales <sales@cwtextile.com>";
  readonly replyTo: "info@cwtextile.com";
  readonly to: typeof TEMPLATE_TEST_RECIPIENT;
  readonly cc: readonly [];
  readonly bcc: readonly [];
  readonly subject: string;
  readonly textBody: string;
}

export interface CaptureEmailTransport {
  readonly kind: "capture_only";
  capture(envelope: TemplateTestEnvelope): Promise<CaptureTransportOutcome>;
}

export class InMemoryCaptureEmailTransport implements CaptureEmailTransport {
  readonly kind = "capture_only" as const;
  readonly captured: TemplateTestEnvelope[] = [];

  constructor(private readonly result: CaptureTransportOutcome = { outcome: "success" }) {}

  async capture(envelope: TemplateTestEnvelope): Promise<CaptureTransportOutcome> {
    this.captured.push(Object.freeze({ ...envelope }));
    return this.result;
  }
}

export type TemplateTestSendResult = CaptureTransportOutcome & Readonly<{
  attempted: true;
  outcomeAuditRecorded: boolean;
}>;

type TestSendAuditWriter<TQueryResult extends PgQueryResultHKT> = (
  db: AppDatabase<TQueryResult>,
  input: AuditInput,
) => Promise<string>;

function exactlyOneTestPrefix(subject: string): string {
  const normalized = subject.trimStart();
  const unprefixed = normalized.replace(/^(?:\[TEST\]\s*)+/, "").trimStart();
  return unprefixed.length === 0 ? "[TEST]" : `[TEST] ${unprefixed}`;
}

function safeErrorClass(error: unknown): string {
  if (!(error instanceof Error)) return "transport_exception";
  const value = error.name.replace(/[^a-zA-Z0-9_.-]/g, "_").slice(0, 80);
  return value || "transport_exception";
}

function safeOutcome(result: CaptureTransportOutcome): CaptureTransportOutcome {
  if (result.outcome === "success") return Object.freeze({ outcome: "success" });
  return Object.freeze({
    outcome: result.outcome,
    errorClass: result.errorClass.replace(/[^a-zA-Z0-9_.-]/g, "_").slice(0, 80) || "unspecified",
  });
}

export async function sendSyntheticEmailTemplateTest<
  TQueryResult extends PgQueryResultHKT,
>(
  db: AppDatabase<TQueryResult>,
  actor: Actor,
  input: {
    readonly templateKind: EmailTemplateKind;
    readonly revisionId?: string | null;
    readonly environment: "local" | "test" | "staging" | "production";
  },
  transport: CaptureEmailTransport,
  options: {
    readonly attemptAuditWriter?: TestSendAuditWriter<TQueryResult>;
    readonly outcomeAuditWriter?: TestSendAuditWriter<TQueryResult>;
  } = {},
): Promise<TemplateTestSendResult> {
  if (actor.role !== "admin") throw new Error("Only Admin may perform an Email Template test send.");
  if (transport.kind !== "capture_only") throw new Error("S5-F3 test send requires capture-only transport.");
  const preview = await previewSyntheticEmailTemplate(
    db,
    actor,
    input.templateKind,
    input.revisionId,
  );
  const attemptAudit = options.attemptAuditWriter ?? writeAuditLog;
  const outcomeAudit = options.outcomeAuditWriter ?? writeAuditLog;
  const revisionId = preview.provenance.revisionId;
  const commonSummary = {
    templateKind: input.templateKind,
    revisionId,
    revisionVersion: preview.provenance.revisionVersion,
    environment: input.environment,
    syntheticContextId: SYNTHETIC_TEMPLATE_CONTEXT_ID,
    recipientPolicy: "fixed_test_recipient",
    transportPolicy: "capture_only",
  } as const;
  await attemptAudit(db, {
    actorUserId: actor.userId,
    action: "email_template.test_send.attempted",
    entityType: "email_template",
    entityId: revisionId,
    afterSummary: commonSummary,
  });

  const envelope = Object.freeze({
    from: "CloudWave Textile Sales <sales@cwtextile.com>" as const,
    replyTo: "info@cwtextile.com" as const,
    to: TEMPLATE_TEST_RECIPIENT,
    cc: Object.freeze([]) as readonly [],
    bcc: Object.freeze([]) as readonly [],
    subject: exactlyOneTestPrefix(preview.rendered.subject),
    textBody: preview.rendered.textBody,
  });
  let actual: CaptureTransportOutcome;
  try {
    actual = safeOutcome(await transport.capture(envelope));
  } catch (error) {
    actual = Object.freeze({ outcome: "uncertain", errorClass: safeErrorClass(error) });
  }
  let outcomeAuditRecorded = true;
  try {
    await outcomeAudit(db, {
      actorUserId: actor.userId,
      action: `email_template.test_send.${actual.outcome}`,
      entityType: "email_template",
      entityId: revisionId,
      afterSummary: {
        ...commonSummary,
        outcome: actual.outcome,
        ...(actual.outcome === "success" ? {} : { errorClass: actual.errorClass }),
      },
    });
  } catch {
    outcomeAuditRecorded = false;
  }
  return Object.freeze({ ...actual, attempted: true, outcomeAuditRecorded });
}
