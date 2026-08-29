import type { PgQueryResultHKT } from "drizzle-orm/pg-core/session";

import { writeAuditLog, type AuditInput } from "@/audit/service";
import type { Actor } from "@/catalog/product-service";
import type { AppDatabase } from "@/db/types";
import {
  buildTrustedEmailEnvelope,
  dispatchTrustedEmail,
  TEMPLATE_TEST_RECIPIENT,
  type CaptureEmailTransport,
  type CaptureTransportOutcome,
  type TrustedEmailEnvelope,
} from "@/integrations/email";

import type { EmailTemplateKind } from "./contracts";
import {
  previewSyntheticEmailTemplate,
  SYNTHETIC_TEMPLATE_CONTEXT_ID,
} from "./service";

export {
  InMemoryCaptureEmailTransport,
  TEMPLATE_TEST_RECIPIENT,
  type CaptureEmailTransport,
  type CaptureTransportOutcome,
} from "@/integrations/email";
export type TemplateTestEnvelope = TrustedEmailEnvelope;

export type TemplateTestSendResult = CaptureTransportOutcome & Readonly<{
  attempted: true;
  outcomeAuditRecorded: boolean;
}>;

type TestSendAuditWriter<TQueryResult extends PgQueryResultHKT> = (
  db: AppDatabase<TQueryResult>,
  input: AuditInput,
) => Promise<string>;

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

  const policy = Object.freeze({
    environment: input.environment,
    applicationOrigin: "http://localhost:3000",
    emailDriver: "log" as const,
    emailFrom: "",
    internalRecipient: TEMPLATE_TEST_RECIPIENT,
    smtpHost: "",
    smtpPort: 587,
    smtpSecure: false,
    smtpUser: "",
    smtpPassword: "",
    databaseDriver: "pglite" as const,
    monitoringDriver: "log" as const,
  });
  const envelope = buildTrustedEmailEnvelope({
    policy,
    logicalTo: TEMPLATE_TEST_RECIPIENT,
    subject: preview.rendered.subject,
    textBody: preview.rendered.textBody,
    deliveryKey: `email_template_test:${input.templateKind}:${revisionId ?? "code_fallback"}`,
    isTestSend: true,
  });
  const actual = await dispatchTrustedEmail(transport, policy, envelope);
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
