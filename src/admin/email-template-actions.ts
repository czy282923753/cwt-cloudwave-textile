"use server";

import type { PgQueryResultHKT } from "drizzle-orm/pg-core/session";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { type AdminMutationOutcome, AdminFieldValidationError } from "@/admin/action-result";
import { currentActor } from "@/admin/actor";
import { env } from "@/config/env";
import { databaseConnection } from "@/db/client";
import type { AppDatabase } from "@/db/types";
import {
  EMAIL_TEMPLATE_KINDS,
  type EmailTemplateKind,
} from "@/email-templates/contracts";
import {
  applyEmailTemplateRevision,
  rollbackEmailTemplate,
  saveEmailTemplateDraft,
  submitEmailTemplateDraftForReview,
} from "@/email-templates/service";
import {
  InMemoryCaptureEmailTransport,
  sendSyntheticEmailTemplateTest,
  TEMPLATE_TEST_RECIPIENT,
} from "@/email-templates/test-send";

const templateKindSchema = z.enum(EMAIL_TEMPLATE_KINDS);
const revisionIdSchema = z.uuid();
const draftVersionSchema = z.coerce.number().int().nonnegative();

async function withDatabase<TResult>(
  operation: <TQueryResult extends PgQueryResultHKT>(
    db: AppDatabase<TQueryResult>,
  ) => Promise<TResult>,
): Promise<TResult> {
  if (databaseConnection.kind === "pglite") return operation(databaseConnection.db);
  return operation(databaseConnection.db);
}

function field(form: FormData, key: string): string {
  const value = form.get(key);
  if (typeof value !== "string") {
    throw new AdminFieldValidationError({ [key]: [`${key} is required.`] });
  }
  return value;
}

function parsedField<T>(form: FormData, key: string, schema: z.ZodType<T>): T {
  const parsed = schema.safeParse(field(form, key));
  if (!parsed.success) {
    throw new AdminFieldValidationError({
      [key]: parsed.error.issues.map((issue) => issue.message),
    });
  }
  return parsed.data;
}

function optionalRevisionId(form: FormData): string | null {
  const value = form.get("revisionId");
  if (value === null || value === "") return null;
  return parsedField(form, "revisionId", revisionIdSchema);
}

function templatePath(kind: EmailTemplateKind): string {
  return `/admin/email-templates/?kind=${kind}`;
}

export async function saveEmailTemplateDraftAction(
  form: FormData,
): Promise<AdminMutationOutcome> {
  const actor = await currentActor();
  const templateKind = parsedField(form, "templateKind", templateKindSchema);
  const expectedRevisionId = optionalRevisionId(form);
  const expectedDraftVersion = parsedField(form, "expectedDraftVersion", draftVersionSchema);
  const result = await withDatabase((db) => saveEmailTemplateDraft(db, actor, {
    templateKind,
    subjectSource: field(form, "subjectSource"),
    textBodySource: field(form, "textBodySource").replace(/\r\n?/g, "\n"),
    changeSummary: field(form, "changeSummary"),
    expectedRevisionId,
    expectedDraftVersion,
  }));
  revalidatePath("/admin/email-templates/");
  return { entityId: result.revisionId, refresh: true };
}

export async function submitEmailTemplateDraftReviewAction(
  form: FormData,
): Promise<AdminMutationOutcome> {
  const actor = await currentActor();
  const templateKind = parsedField(form, "templateKind", templateKindSchema);
  await withDatabase((db) => submitEmailTemplateDraftForReview(db, actor, {
    revisionId: parsedField(form, "revisionId", revisionIdSchema),
    expectedDraftVersion: parsedField(form, "expectedDraftVersion", draftVersionSchema),
  }));
  revalidatePath(templatePath(templateKind));
  return { refresh: true };
}

export async function applyEmailTemplateRevisionAction(
  form: FormData,
): Promise<AdminMutationOutcome> {
  const actor = await currentActor();
  const result = await withDatabase((db) => applyEmailTemplateRevision(
    db,
    actor,
    parsedField(form, "revisionId", revisionIdSchema),
  ));
  revalidatePath(templatePath(result.template.templateKind));
  return {
    ...(result.provenance.revisionId ? { entityId: result.provenance.revisionId } : {}),
    refresh: true,
  };
}

export async function rollbackEmailTemplateAction(
  form: FormData,
): Promise<AdminMutationOutcome> {
  const actor = await currentActor();
  const templateKind = parsedField(form, "templateKind", templateKindSchema);
  const result = await withDatabase((db) => rollbackEmailTemplate(db, actor, {
    templateKind,
    sourceRevisionId: parsedField(form, "sourceRevisionId", revisionIdSchema),
  }));
  revalidatePath(templatePath(templateKind));
  return {
    ...(result.provenance.revisionId ? { entityId: result.provenance.revisionId } : {}),
    refresh: true,
  };
}

export async function sendSyntheticEmailTemplateTestAction(
  form: FormData,
): Promise<AdminMutationOutcome> {
  for (const forbidden of ["to", "recipient", "cc", "bcc", "from", "replyTo"] as const) {
    if (form.has(forbidden)) {
      throw new AdminFieldValidationError({
        [forbidden]: ["Test recipient and envelope fields are server-owned."],
      });
    }
  }
  const actor = await currentActor();
  const templateKind = parsedField(form, "templateKind", templateKindSchema);
  const transport = new InMemoryCaptureEmailTransport();
  const result = await withDatabase((db) => sendSyntheticEmailTemplateTest(
    db,
    actor,
    {
      templateKind,
      revisionId: optionalRevisionId(form),
      environment: env.APP_ENV,
    },
    transport,
  ));
  const auditTruth = result.outcomeAuditRecorded
    ? "Outcome Audit recorded."
    : "Outcome Audit could not be recorded; capture truth is unchanged.";
  const message = result.outcome === "success"
    ? `Capture-only test succeeded for ${TEMPLATE_TEST_RECIPIENT}. ${auditTruth}`
    : result.outcome === "failure"
      ? `Capture-only test reported failure for ${TEMPLATE_TEST_RECIPIENT}; no retry was attempted. ${auditTruth}`
      : `Capture-only test outcome is uncertain for ${TEMPLATE_TEST_RECIPIENT}; no retry was attempted. ${auditTruth}`;
  return {
    refresh: false,
    message,
    operationStatus: result.outcome,
  };
}
