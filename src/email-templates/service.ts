import { and, desc, eq, gt } from "drizzle-orm";
import type { PgQueryResultHKT } from "drizzle-orm/pg-core/session";

import { requireEditorialResourceAccess } from "@/admin/preview-policy";
import { runGovernedMutation, type GovernedMutationOptions } from "@/audit/governed-mutation";
import type { Actor } from "@/catalog/product-service";
import { editorialRevisions, systemSettings } from "@/db/schema";
import type { AppDatabase } from "@/db/types";
import { EditorialDraftConflictError } from "@/editorial/conflict";

import {
  createEmailTemplateActive,
  createEmailTemplateRevision,
  EMAIL_TEMPLATE_KINDS,
  parseEmailTemplateActive,
  parseEmailTemplateRevision,
  settingKeyForTemplateKind,
  type EmailTemplateActiveV1,
  type EmailTemplateKind,
  type EmailTemplateRevisionV1,
} from "./contracts";
import { codeEmailTemplateFallback } from "./fallbacks";
import {
  buildCustomerTemplateContext,
  buildInternalTemplateContext,
  renderEmailTemplate,
  type EmailTemplateRenderContext,
  type RenderedEmailTemplate,
} from "./renderer";

export const SYNTHETIC_TEMPLATE_CONTEXT_ID = "SYNTHETIC_EMAIL_TEMPLATE_V1";
const SYNTHETIC_INQUIRY_ID = "00000000-0000-4000-8000-000000000001";
const SYNTHETIC_SUBMITTED_AT = new Date("2026-01-15T10:30:00.000Z");

export interface EmailTemplateDraftSaveResult {
  readonly revisionId: string;
  readonly revisionVersion: number;
  readonly draftVersion: number;
}

export interface EmailTemplateHistoryEntry {
  readonly revisionId: string;
  readonly revisionVersion: number;
  readonly status: "draft" | "in_review" | "approved" | "rejected" | "applied";
  readonly createdAt: Date;
  readonly reviewedAt: Date | null;
  readonly createdByUserId: string | null;
  readonly reviewedByUserId: string | null;
  readonly changeSummary: string | null;
  readonly template: EmailTemplateRevisionV1;
}

export interface EmailTemplateAdminProjection {
  readonly kind: EmailTemplateKind;
  readonly active: ResolvedEmailTemplate;
  readonly history: readonly EmailTemplateHistoryEntry[];
  readonly draft: EmailTemplateHistoryEntry | null;
  readonly inReview: EmailTemplateHistoryEntry | null;
}

export type TemplateFallbackReason = "active_absent" | "active_invalid";

export interface ResolvedEmailTemplate {
  readonly template: EmailTemplateRevisionV1;
  readonly provenance: Readonly<{
    source: "revision" | "code_fallback";
    settingKey: string;
    revisionId: string | null;
    revisionVersion: number | null;
    canonicalSha256: string;
    fallbackReason: TemplateFallbackReason | null;
  }>;
}

export interface TemplateConfigurationSignal {
  readonly code: "email_template_active_invalid";
  readonly settingKey: string;
  readonly templateKind: EmailTemplateKind;
}

export interface TemplateResolverOptions {
  readonly onConfigurationSignal?: (
    signal: TemplateConfigurationSignal,
  ) => void | Promise<void>;
}

function activeFallback(kind: EmailTemplateKind): EmailTemplateActiveV1 {
  return createEmailTemplateActive({
    template: codeEmailTemplateFallback(kind),
    source: "code_fallback",
  });
}

function templateFromActive(active: EmailTemplateActiveV1): EmailTemplateRevisionV1 {
  return createEmailTemplateRevision({
    templateKind: active.templateKind,
    subjectSource: active.subjectSource,
    textBodySource: active.textBodySource,
    draftVersion: 1,
  });
}

function freezeResolved(
  template: EmailTemplateRevisionV1,
  provenance: ResolvedEmailTemplate["provenance"],
): ResolvedEmailTemplate {
  return Object.freeze({
    template: Object.freeze({ ...template }),
    provenance: Object.freeze({ ...provenance }),
  });
}

async function emitInvalidSignal(
  kind: EmailTemplateKind,
  options: TemplateResolverOptions,
): Promise<void> {
  const signal = Object.freeze({
    code: "email_template_active_invalid" as const,
    settingKey: settingKeyForTemplateKind(kind),
    templateKind: kind,
  });
  if (options.onConfigurationSignal) {
    try {
      await options.onConfigurationSignal(signal);
    } catch {
      // Signaling is non-critical and must never block the complete safe fallback.
    }
    return;
  }
  try {
    process.stderr.write(
      `[email-template-config] ${signal.code} key=${signal.settingKey} kind=${signal.templateKind}\n`,
    );
  } catch {
    // Logging failure cannot turn invalid configuration into an Inquiry outage.
  }
}

async function ensureTemplateSetting<TQueryResult extends PgQueryResultHKT>(
  db: AppDatabase<TQueryResult>,
  actor: Actor,
  kind: EmailTemplateKind,
) {
  const key = settingKeyForTemplateKind(kind);
  await db.insert(systemSettings).values({
    key,
    value: activeFallback(kind),
    isSensitive: false,
    updatedByUserId: actor.userId,
  }).onConflictDoNothing({ target: systemSettings.key });
  const rows = await db.select().from(systemSettings)
    .where(eq(systemSettings.key, key)).limit(1).for("update");
  const setting = rows[0];
  if (!setting || setting.isSensitive || setting.key !== key) {
    throw new Error("Email-template Setting authority is invalid.");
  }
  return setting;
}

export async function resolveActiveEmailTemplate<TQueryResult extends PgQueryResultHKT>(
  db: AppDatabase<TQueryResult>,
  kind: EmailTemplateKind,
  options: TemplateResolverOptions = {},
): Promise<ResolvedEmailTemplate> {
  const key = settingKeyForTemplateKind(kind);
  const fallback = codeEmailTemplateFallback(kind);
  const rows = await db.select().from(systemSettings)
    .where(eq(systemSettings.key, key)).limit(1);
  const setting = rows[0];
  if (!setting) {
    return freezeResolved(fallback, {
      source: "code_fallback",
      settingKey: key,
      revisionId: null,
      revisionVersion: null,
      canonicalSha256: fallback.canonicalSha256,
      fallbackReason: "active_absent",
    });
  }

  try {
    if (setting.isSensitive) throw new Error("Sensitive template Setting is forbidden.");
    const active = parseEmailTemplateActive(setting.value);
    if (active.templateKind !== kind) throw new Error("Template kind does not match Setting key.");
    if (active.source === "code_fallback") {
      if (
        active.canonicalSha256 !== fallback.canonicalSha256 ||
        active.subjectSource !== fallback.subjectSource ||
        active.textBodySource !== fallback.textBodySource
      ) {
        throw new Error("Code fallback projection does not match code authority.");
      }
      return freezeResolved(fallback, {
        source: "code_fallback",
        settingKey: key,
        revisionId: null,
        revisionVersion: null,
        canonicalSha256: fallback.canonicalSha256,
        fallbackReason: null,
      });
    }
    const historyRows = await db.select({
      entityId: editorialRevisions.entityId,
      versionNumber: editorialRevisions.versionNumber,
      status: editorialRevisions.status,
      snapshot: editorialRevisions.snapshot,
    }).from(editorialRevisions).where(and(
      eq(editorialRevisions.id, active.revisionId!),
      eq(editorialRevisions.entityType, "email_template"),
      eq(editorialRevisions.entityId, setting.id),
      eq(editorialRevisions.locale, "en"),
      eq(editorialRevisions.versionNumber, active.revisionVersion!),
      eq(editorialRevisions.status, "applied"),
    )).limit(1);
    const history = historyRows[0];
    if (!history) throw new Error("Active Revision provenance is absent.");
    const revision = parseEmailTemplateRevision(history.snapshot);
    if (
      revision.templateKind !== kind ||
      revision.canonicalSha256 !== active.canonicalSha256 ||
      revision.subjectSource !== active.subjectSource ||
      revision.textBodySource !== active.textBodySource
    ) {
      throw new Error("Active projection does not match its historical Revision.");
    }
    return freezeResolved(templateFromActive(active), {
      source: "revision",
      settingKey: key,
      revisionId: active.revisionId,
      revisionVersion: active.revisionVersion,
      canonicalSha256: active.canonicalSha256,
      fallbackReason: null,
    });
  } catch {
    await emitInvalidSignal(kind, options);
    return freezeResolved(fallback, {
      source: "code_fallback",
      settingKey: key,
      revisionId: null,
      revisionVersion: null,
      canonicalSha256: fallback.canonicalSha256,
      fallbackReason: "active_invalid",
    });
  }
}

export async function saveEmailTemplateDraft<TQueryResult extends PgQueryResultHKT>(
  db: AppDatabase<TQueryResult>,
  actor: Actor,
  input: {
    readonly templateKind: EmailTemplateKind;
    readonly subjectSource: string;
    readonly textBodySource: string;
    readonly changeSummary: string;
    readonly expectedRevisionId?: string | null;
    readonly expectedDraftVersion: number;
  },
  options: GovernedMutationOptions = {},
): Promise<EmailTemplateDraftSaveResult> {
  requireEditorialResourceAccess(actor.role, "email_template", "write");
  const changeSummary = input.changeSummary.trim();
  if (!changeSummary) throw new Error("Template Draft requires a change summary.");
  if (changeSummary.length > 500) throw new Error("Template Draft change summary exceeds 500 characters.");
  return runGovernedMutation(db, async ({ transaction, audit }) => {
    const setting = await ensureTemplateSetting(transaction, actor, input.templateKind);
    const latestRows = await transaction.select({
      id: editorialRevisions.id,
      versionNumber: editorialRevisions.versionNumber,
      status: editorialRevisions.status,
      snapshot: editorialRevisions.snapshot,
    }).from(editorialRevisions).where(and(
      eq(editorialRevisions.entityType, "email_template"),
      eq(editorialRevisions.entityId, setting.id),
      eq(editorialRevisions.locale, "en"),
    )).orderBy(desc(editorialRevisions.versionNumber)).limit(1).for("update");
    const latest = latestRows[0];
    if (latest?.status === "draft") {
      if (input.expectedRevisionId !== latest.id) {
        throw new EditorialDraftConflictError("A different Email Template Draft is current.");
      }
      const current = parseEmailTemplateRevision(latest.snapshot);
      if (input.expectedDraftVersion !== current.draftVersion) {
        throw new EditorialDraftConflictError("Email Template Draft changed; reload before saving.");
      }
      const template = createEmailTemplateRevision({
        templateKind: input.templateKind,
        subjectSource: input.subjectSource,
        textBodySource: input.textBodySource,
        draftVersion: current.draftVersion + 1,
      });
      const updated = await transaction.update(editorialRevisions).set({
        snapshot: template,
        changeSummary,
      }).where(and(
        eq(editorialRevisions.id, latest.id),
        eq(editorialRevisions.status, "draft"),
      )).returning({ id: editorialRevisions.id });
      if (!updated[0]) throw new EditorialDraftConflictError("Email Template Draft is no longer current.");
      await audit({
        actorUserId: actor.userId,
        action: "email_template.draft.saved",
        entityType: "editorial_revision",
        entityId: latest.id,
        afterSummary: {
          templateKind: input.templateKind,
          revisionVersion: latest.versionNumber,
          draftVersion: template.draftVersion,
          canonicalSha256: template.canonicalSha256,
        },
      });
      return {
        revisionId: latest.id,
        revisionVersion: latest.versionNumber,
        draftVersion: template.draftVersion,
      };
    }
    if (input.expectedRevisionId || input.expectedDraftVersion !== 0) {
      throw new EditorialDraftConflictError("Email Template Draft is no longer current.");
    }
    const template = createEmailTemplateRevision({
      templateKind: input.templateKind,
      subjectSource: input.subjectSource,
      textBodySource: input.textBodySource,
      draftVersion: 1,
    });
    const versionNumber = (latest?.versionNumber ?? 0) + 1;
    const inserted = await transaction.insert(editorialRevisions).values({
      entityType: "email_template",
      entityId: setting.id,
      locale: "en",
      versionNumber,
      status: "draft",
      snapshot: template,
      changeSummary,
      createdByUserId: actor.userId,
    }).returning({ id: editorialRevisions.id });
    const revisionId = inserted[0]?.id;
    if (!revisionId) throw new Error("Email Template Draft insert failed.");
    await audit({
      actorUserId: actor.userId,
      action: "email_template.draft.created",
      entityType: "editorial_revision",
      entityId: revisionId,
      afterSummary: {
        templateKind: input.templateKind,
        revisionVersion: versionNumber,
        draftVersion: 1,
        canonicalSha256: template.canonicalSha256,
      },
    });
    return { revisionId, revisionVersion: versionNumber, draftVersion: 1 };
  }, options);
}

export async function submitEmailTemplateDraftForReview<
  TQueryResult extends PgQueryResultHKT,
>(
  db: AppDatabase<TQueryResult>,
  actor: Actor,
  input: { readonly revisionId: string; readonly expectedDraftVersion: number },
  options: GovernedMutationOptions = {},
): Promise<void> {
  requireEditorialResourceAccess(actor.role, "email_template", "write");
  await runGovernedMutation(db, async ({ transaction, audit }) => {
    const identityRows = await transaction.select({
      entityId: editorialRevisions.entityId,
    }).from(editorialRevisions).where(and(
      eq(editorialRevisions.id, input.revisionId),
      eq(editorialRevisions.entityType, "email_template"),
    )).limit(1);
    const identity = identityRows[0];
    if (!identity) throw new EditorialDraftConflictError("Email Template Draft is not current.");
    const settingRows = await transaction.select().from(systemSettings)
      .where(eq(systemSettings.id, identity.entityId)).limit(1).for("update");
    const setting = settingRows[0];
    const revisionRows = await transaction.select().from(editorialRevisions).where(and(
      eq(editorialRevisions.id, input.revisionId),
      eq(editorialRevisions.entityType, "email_template"),
      eq(editorialRevisions.entityId, identity.entityId),
      eq(editorialRevisions.locale, "en"),
      eq(editorialRevisions.status, "draft"),
    )).limit(1).for("update");
    const revision = revisionRows[0];
    if (!setting || setting.isSensitive || !revision) {
      throw new EditorialDraftConflictError("Email Template Draft is not current.");
    }
    const templateKind = EMAIL_TEMPLATE_KINDS.find(
      (kind) => setting.key === settingKeyForTemplateKind(kind),
    );
    const template = parseEmailTemplateRevision(revision.snapshot);
    if (!templateKind || templateKind !== template.templateKind ||
      template.draftVersion !== input.expectedDraftVersion) {
      throw new EditorialDraftConflictError("Email Template Draft changed; reload before submitting.");
    }
    const newer = await transaction.select({ id: editorialRevisions.id })
      .from(editorialRevisions).where(and(
        eq(editorialRevisions.entityType, "email_template"),
        eq(editorialRevisions.entityId, setting.id),
        eq(editorialRevisions.locale, "en"),
        gt(editorialRevisions.versionNumber, revision.versionNumber),
      )).limit(1);
    if (newer[0]) throw new EditorialDraftConflictError("A newer Email Template Revision exists.");
    const updated = await transaction.update(editorialRevisions).set({
      status: "in_review",
      changeSummary: `${revision.changeSummary ?? templateKind} — submitted for review`,
    }).where(and(
      eq(editorialRevisions.id, revision.id),
      eq(editorialRevisions.status, "draft"),
    )).returning({ id: editorialRevisions.id });
    if (!updated[0]) throw new EditorialDraftConflictError("Email Template Draft is no longer current.");
    await audit({
      actorUserId: actor.userId,
      action: "email_template.draft.review_requested",
      entityType: "editorial_revision",
      entityId: revision.id,
      afterSummary: {
        templateKind,
        revisionVersion: revision.versionNumber,
        canonicalSha256: template.canonicalSha256,
      },
    });
  }, options);
}

export async function applyEmailTemplateRevision<TQueryResult extends PgQueryResultHKT>(
  db: AppDatabase<TQueryResult>,
  actor: Actor,
  revisionId: string,
  options: GovernedMutationOptions = {},
): Promise<ResolvedEmailTemplate> {
  requireEditorialResourceAccess(actor.role, "email_template", "apply");
  return runGovernedMutation(db, async ({ transaction, audit }) => {
    const identityRows = await transaction.select({ entityId: editorialRevisions.entityId })
      .from(editorialRevisions).where(and(
        eq(editorialRevisions.id, revisionId),
        eq(editorialRevisions.entityType, "email_template"),
      )).limit(1);
    const identity = identityRows[0];
    if (!identity) throw new Error("Email Template Revision is not eligible for Apply.");
    const settingRows = await transaction.select().from(systemSettings)
      .where(eq(systemSettings.id, identity.entityId)).limit(1).for("update");
    const setting = settingRows[0];
    const revisionRows = await transaction.select().from(editorialRevisions).where(and(
      eq(editorialRevisions.id, revisionId),
      eq(editorialRevisions.entityType, "email_template"),
      eq(editorialRevisions.entityId, identity.entityId),
      eq(editorialRevisions.locale, "en"),
    )).limit(1).for("update");
    const revision = revisionRows[0];
    if (!setting || setting.isSensitive || !revision) {
      throw new Error("Email Template Revision authority is invalid.");
    }
    const template = parseEmailTemplateRevision(revision.snapshot);
    if (setting.key !== settingKeyForTemplateKind(template.templateKind)) {
      throw new Error("Email Template Revision does not match its Setting.");
    }
    if (revision.status === "applied") {
      const current = parseEmailTemplateActive(setting.value);
      if (current.source !== "revision" || current.revisionId !== revision.id ||
        current.revisionVersion !== revision.versionNumber ||
        current.canonicalSha256 !== template.canonicalSha256) {
        throw new Error("An historical Applied Revision is not the live Active template.");
      }
      return freezeResolved(template, {
        source: "revision",
        settingKey: setting.key,
        revisionId: revision.id,
        revisionVersion: revision.versionNumber,
        canonicalSha256: template.canonicalSha256,
        fallbackReason: null,
      });
    }
    if (revision.status !== "in_review") {
      throw new Error("Email Template Revision is not eligible for Apply.");
    }
    const newer = await transaction.select({ id: editorialRevisions.id })
      .from(editorialRevisions).where(and(
        eq(editorialRevisions.entityType, "email_template"),
        eq(editorialRevisions.entityId, setting.id),
        eq(editorialRevisions.locale, "en"),
        gt(editorialRevisions.versionNumber, revision.versionNumber),
      )).limit(1);
    if (newer[0]) throw new Error("A newer Email Template Revision exists.");
    const active = createEmailTemplateActive({
      template,
      source: "revision",
      revisionId: revision.id,
      revisionVersion: revision.versionNumber,
    });
    const now = new Date();
    const updatedSetting = await transaction.update(systemSettings).set({
      value: active,
      isSensitive: false,
      updatedByUserId: actor.userId,
      updatedAt: now,
    }).where(eq(systemSettings.id, setting.id)).returning({ id: systemSettings.id });
    const updatedRevision = await transaction.update(editorialRevisions).set({
      status: "applied",
      reviewedByUserId: actor.userId,
      reviewedAt: now,
    }).where(and(
      eq(editorialRevisions.id, revision.id),
      eq(editorialRevisions.status, "in_review"),
    )).returning({ id: editorialRevisions.id });
    if (!updatedSetting[0] || !updatedRevision[0]) {
      throw new Error("Email Template Apply lost its serialized authority.");
    }
    await audit({
      actorUserId: actor.userId,
      action: "email_template.revision.applied",
      entityType: "editorial_revision",
      entityId: revision.id,
      afterSummary: {
        templateKind: template.templateKind,
        revisionVersion: revision.versionNumber,
        canonicalSha256: template.canonicalSha256,
      },
    });
    return freezeResolved(template, {
      source: "revision",
      settingKey: setting.key,
      revisionId: revision.id,
      revisionVersion: revision.versionNumber,
      canonicalSha256: template.canonicalSha256,
      fallbackReason: null,
    });
  }, options);
}

export async function rollbackEmailTemplate<TQueryResult extends PgQueryResultHKT>(
  db: AppDatabase<TQueryResult>,
  actor: Actor,
  input: { readonly templateKind: EmailTemplateKind; readonly sourceRevisionId: string },
  options: GovernedMutationOptions = {},
): Promise<ResolvedEmailTemplate> {
  requireEditorialResourceAccess(actor.role, "email_template", "apply");
  return runGovernedMutation(db, async ({ transaction, audit }) => {
    const setting = await ensureTemplateSetting(transaction, actor, input.templateKind);
    const sourceRows = await transaction.select().from(editorialRevisions).where(and(
      eq(editorialRevisions.id, input.sourceRevisionId),
      eq(editorialRevisions.entityType, "email_template"),
      eq(editorialRevisions.entityId, setting.id),
      eq(editorialRevisions.locale, "en"),
      eq(editorialRevisions.status, "applied"),
    )).limit(1).for("update");
    const sourceRow = sourceRows[0];
    if (!sourceRow) throw new Error("Rollback source must be a compatible historical Applied Revision.");
    const sourceTemplate = parseEmailTemplateRevision(sourceRow.snapshot);
    if (sourceTemplate.templateKind !== input.templateKind) {
      throw new Error("Rollback source does not match the requested template kind.");
    }
    let current: EmailTemplateActiveV1 | null = null;
    try {
      current = parseEmailTemplateActive(setting.value);
    } catch {
      // A compatible historical snapshot may repair an invalid Active projection.
    }
    if (current?.source === "revision" && current.revisionId === sourceRow.id) {
      throw new Error("Rollback source is already the live Active template.");
    }
    const latestRows = await transaction.select({ versionNumber: editorialRevisions.versionNumber })
      .from(editorialRevisions).where(and(
        eq(editorialRevisions.entityType, "email_template"),
        eq(editorialRevisions.entityId, setting.id),
        eq(editorialRevisions.locale, "en"),
      )).orderBy(desc(editorialRevisions.versionNumber)).limit(1);
    const versionNumber = (latestRows[0]?.versionNumber ?? 0) + 1;
    const copied = createEmailTemplateRevision({
      templateKind: sourceTemplate.templateKind,
      subjectSource: sourceTemplate.subjectSource,
      textBodySource: sourceTemplate.textBodySource,
      draftVersion: 1,
      rollbackSourceRevisionId: sourceRow.id,
    });
    const now = new Date();
    const inserted = await transaction.insert(editorialRevisions).values({
      entityType: "email_template",
      entityId: setting.id,
      locale: "en",
      versionNumber,
      status: "applied",
      snapshot: copied,
      changeSummary: `Rollback copied from Revision ${sourceRow.versionNumber}`,
      createdByUserId: actor.userId,
      reviewedByUserId: actor.userId,
      reviewedAt: now,
    }).returning({ id: editorialRevisions.id });
    const revisionId = inserted[0]?.id;
    if (!revisionId) throw new Error("Email Template rollback Revision insert failed.");
    const active = createEmailTemplateActive({
      template: copied,
      source: "revision",
      revisionId,
      revisionVersion: versionNumber,
    });
    const updated = await transaction.update(systemSettings).set({
      value: active,
      isSensitive: false,
      updatedByUserId: actor.userId,
      updatedAt: now,
    }).where(eq(systemSettings.id, setting.id)).returning({ id: systemSettings.id });
    if (!updated[0]) throw new Error("Email Template rollback lost its Setting authority.");
    await audit({
      actorUserId: actor.userId,
      action: "email_template.rollback.applied",
      entityType: "editorial_revision",
      entityId: revisionId,
      afterSummary: {
        templateKind: input.templateKind,
        revisionVersion: versionNumber,
        sourceRevisionId: sourceRow.id,
        sourceRevisionVersion: sourceRow.versionNumber,
        canonicalSha256: copied.canonicalSha256,
      },
    });
    return freezeResolved(copied, {
      source: "revision",
      settingKey: setting.key,
      revisionId,
      revisionVersion: versionNumber,
      canonicalSha256: copied.canonicalSha256,
      fallbackReason: null,
    });
  }, options);
}

export async function listEmailTemplateHistory<TQueryResult extends PgQueryResultHKT>(
  db: AppDatabase<TQueryResult>,
  role: Actor["role"],
  kind: EmailTemplateKind,
): Promise<readonly EmailTemplateHistoryEntry[]> {
  requireEditorialResourceAccess(role, "email_template", "manage");
  const settingRows = await db.select({ id: systemSettings.id, isSensitive: systemSettings.isSensitive })
    .from(systemSettings).where(eq(systemSettings.key, settingKeyForTemplateKind(kind))).limit(1);
  const setting = settingRows[0];
  if (!setting) return Object.freeze([]);
  if (setting.isSensitive) throw new Error("Email-template Setting authority is invalid.");
  const rows = await db.select().from(editorialRevisions).where(and(
    eq(editorialRevisions.entityType, "email_template"),
    eq(editorialRevisions.entityId, setting.id),
    eq(editorialRevisions.locale, "en"),
  )).orderBy(desc(editorialRevisions.versionNumber));
  return Object.freeze(rows.map((row) => Object.freeze({
    revisionId: row.id,
    revisionVersion: row.versionNumber,
    status: row.status,
    createdAt: row.createdAt,
    reviewedAt: row.reviewedAt,
    createdByUserId: row.createdByUserId,
    reviewedByUserId: row.reviewedByUserId,
    changeSummary: row.changeSummary,
    template: Object.freeze(parseEmailTemplateRevision(row.snapshot)),
  })));
}

export async function getEmailTemplateAdminProjection<
  TQueryResult extends PgQueryResultHKT,
>(
  db: AppDatabase<TQueryResult>,
  role: Actor["role"],
  kind: EmailTemplateKind,
): Promise<EmailTemplateAdminProjection> {
  requireEditorialResourceAccess(role, "email_template", "manage");
  const [active, history] = await Promise.all([
    resolveActiveEmailTemplate(db, kind),
    listEmailTemplateHistory(db, role, kind),
  ]);
  return Object.freeze({
    kind,
    active,
    history,
    draft: history.find((entry) => entry.status === "draft") ?? null,
    inReview: history.find((entry) => entry.status === "in_review") ?? null,
  });
}

function syntheticContext(kind: EmailTemplateKind): EmailTemplateRenderContext {
  if (kind === "inquiry_customer_confirmation") {
    return buildCustomerTemplateContext({
      customerName: "Synthetic Customer",
      inquiryReference: "CWT-AAAAAAAAAAAAAAAAAAAA",
      submittedAt: SYNTHETIC_SUBMITTED_AT,
    });
  }
  return buildInternalTemplateContext({
    inquiryReference: "CWT-AAAAAAAAAAAAAAAAAAAA",
    submittedAt: SYNTHETIC_SUBMITTED_AT,
    customerName: "Synthetic Customer",
    customerEmail: "synthetic@example.test",
    countryCode: "US",
    whatsapp: "+1 555 0100",
    inquiryDescription: "Conspicuously Synthetic inquiry description.",
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
    inquiryId: SYNTHETIC_INQUIRY_ID,
  });
}

export interface SyntheticEmailTemplatePreview {
  readonly contextId: typeof SYNTHETIC_TEMPLATE_CONTEXT_ID;
  readonly rendered: RenderedEmailTemplate;
  readonly provenance: ResolvedEmailTemplate["provenance"];
}

export async function previewSyntheticEmailTemplate<
  TQueryResult extends PgQueryResultHKT,
>(
  db: AppDatabase<TQueryResult>,
  actor: Actor,
  kind: EmailTemplateKind,
  revisionId?: string | null,
): Promise<SyntheticEmailTemplatePreview> {
  requireEditorialResourceAccess(actor.role, "email_template", "preview");
  let resolved: ResolvedEmailTemplate;
  if (revisionId) {
    const settingRows = await db.select({
      id: systemSettings.id,
      isSensitive: systemSettings.isSensitive,
    })
      .from(systemSettings).where(eq(systemSettings.key, settingKeyForTemplateKind(kind))).limit(1);
    const setting = settingRows[0];
    if (!setting) throw new Error("Selected Email Template Revision is not available.");
    if (setting.isSensitive) throw new Error("Sensitive Email Template Setting is forbidden.");
    const revisionRows = await db.select().from(editorialRevisions).where(and(
      eq(editorialRevisions.id, revisionId),
      eq(editorialRevisions.entityType, "email_template"),
      eq(editorialRevisions.entityId, setting.id),
      eq(editorialRevisions.locale, "en"),
    )).limit(1);
    const revision = revisionRows[0];
    if (!revision) throw new Error("Selected Email Template Revision is not available.");
    const template = parseEmailTemplateRevision(revision.snapshot);
    if (template.templateKind !== kind) throw new Error("Selected Email Template kind does not match.");
    resolved = freezeResolved(template, {
      source: "revision",
      settingKey: settingKeyForTemplateKind(kind),
      revisionId: revision.id,
      revisionVersion: revision.versionNumber,
      canonicalSha256: template.canonicalSha256,
      fallbackReason: null,
    });
  } else {
    resolved = await resolveActiveEmailTemplate(db, kind);
  }
  return Object.freeze({
    contextId: SYNTHETIC_TEMPLATE_CONTEXT_ID,
    rendered: renderEmailTemplate(resolved.template, syntheticContext(kind)),
    provenance: resolved.provenance,
  });
}
