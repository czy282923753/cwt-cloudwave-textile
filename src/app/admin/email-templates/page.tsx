import Link from "next/link";
import { notFound } from "next/navigation";
import type { PgQueryResultHKT } from "drizzle-orm/pg-core/session";
import { z } from "zod";

import {
  applyEmailTemplateRevisionAction,
  rollbackEmailTemplateAction,
  saveEmailTemplateDraftAction,
  sendSyntheticEmailTemplateTestAction,
  submitEmailTemplateDraftReviewAction,
} from "@/admin/email-template-actions";
import { AdminActionForm } from "@/admin/components/admin-action-form";
import { AdminPageHeader } from "@/admin/components/admin-table";
import { canAccessEditorialResource } from "@/admin/preview-policy";
import { resolveCurrentUser } from "@/auth/current-user";
import { databaseConnection } from "@/db/client";
import type { AppDatabase } from "@/db/types";
import {
  CUSTOMER_TEMPLATE_VARIABLES,
  EMAIL_TEMPLATE_KINDS,
  INTERNAL_TEMPLATE_VARIABLES,
  type EmailTemplateKind,
} from "@/email-templates/contracts";
import {
  getEmailTemplateAdminProjection,
  previewSyntheticEmailTemplate,
  SYNTHETIC_TEMPLATE_CONTEXT_ID,
  type EmailTemplateAdminProjection,
  type SyntheticEmailTemplatePreview,
} from "@/email-templates/service";
import { TEMPLATE_TEST_RECIPIENT } from "@/email-templates/test-send";

const inputClass = "min-w-0 w-full rounded-lg border border-white/10 bg-slate-950 p-3";
const panelClass = "min-w-0 rounded-2xl border border-white/10 bg-slate-900 p-4 sm:p-6";
const selectedPreviewSchema = z.object({
  kind: z.enum(EMAIL_TEMPLATE_KINDS),
  revisionId: z.uuid(),
}).strict();

const kindLabels: Readonly<Record<EmailTemplateKind, string>> = {
  inquiry_notification: "Internal inquiry notification",
  inquiry_customer_confirmation: "Customer inquiry confirmation",
};

function withDatabase<TResult>(
  operation: <TQueryResult extends PgQueryResultHKT>(db: AppDatabase<TQueryResult>) => Promise<TResult>,
): Promise<TResult> {
  if (databaseConnection.kind === "pglite") return operation(databaseConnection.db);
  return operation(databaseConnection.db);
}

function variablesForKind(kind: EmailTemplateKind): readonly string[] {
  return kind === "inquiry_notification"
    ? INTERNAL_TEMPLATE_VARIABLES
    : CUSTOMER_TEMPLATE_VARIABLES;
}

function TemplatePreview({
  kind,
  preview,
}: Readonly<{
  kind: EmailTemplateKind;
  preview: SyntheticEmailTemplatePreview;
}>) {
  return (
    <section
      aria-label={`${kindLabels[kind]} Synthetic Preview`}
      className={`${panelClass} bg-slate-950`}
      data-template-preview={kind}
    >
      <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
        <h3 className="text-lg font-semibold">Fixed-Synthetic Preview</h3>
        <span className="rounded-full border border-teal-300/30 px-3 py-1 text-xs text-teal-200">
          {SYNTHETIC_TEMPLATE_CONTEXT_ID}
        </span>
      </div>
      <p className="mt-2 break-words text-xs text-slate-400">
        Source: {preview.provenance.source} · revision {preview.provenance.revisionVersion ?? "code fallback"}
      </p>
      <dl className="mt-5 grid min-w-0 grid-cols-[minmax(0,1fr)] gap-4">
        <div className="min-w-0">
          <dt className="text-sm font-semibold text-slate-300">Subject</dt>
          <dd
            className="mt-2 min-w-0 [overflow-wrap:anywhere] rounded-lg border border-white/10 bg-slate-900 p-3"
            data-template-preview-essential="subject"
          >
            {preview.rendered.subject}
          </dd>
        </div>
        <div className="min-w-0">
          <dt className="text-sm font-semibold text-slate-300">Plain-text body</dt>
          <dd className="min-w-0">
            <pre
              className="mt-2 min-w-0 max-w-full whitespace-pre-wrap [overflow-wrap:anywhere] rounded-lg border border-white/10 bg-slate-900 p-3 font-sans text-sm leading-6"
              data-template-preview-essential="body"
            >
              {preview.rendered.textBody}
            </pre>
          </dd>
        </div>
      </dl>
    </section>
  );
}

function TemplatePanel({
  projection,
  preview,
  role,
  selectedRevisionId,
}: Readonly<{
  projection: EmailTemplateAdminProjection;
  preview: SyntheticEmailTemplatePreview;
  role: Parameters<typeof canAccessEditorialResource>[0];
  selectedRevisionId: string | null;
}>) {
  const { kind, active, history, draft, inReview } = projection;
  const canWrite = canAccessEditorialResource(role, "email_template", "write");
  const canApply = canAccessEditorialResource(role, "email_template", "apply");
  const canTest = role === "admin";
  const editableTemplate = draft?.template ?? active.template;
  const liveRevisionId = active.provenance.source === "revision"
    ? active.provenance.revisionId
    : null;
  return (
    <article aria-labelledby={`template-${kind}`} className="grid min-w-0 gap-6">
      <section className={panelClass}>
        <h2 className="text-2xl font-semibold" id={`template-${kind}`}>{kindLabels[kind]}</h2>
        <p className="mt-2 break-all font-mono text-xs text-slate-400">{active.provenance.settingKey}</p>
        <dl className="mt-5 grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
          <div><dt className="text-slate-400">Live authority</dt><dd>{active.provenance.source === "revision" ? "Applied Revision" : "Exact code fallback"}</dd></div>
          <div><dt className="text-slate-400">Revision</dt><dd>{active.provenance.revisionVersion ?? "Not applicable"}</dd></div>
          <div><dt className="text-slate-400">Fallback reason</dt><dd>{active.provenance.fallbackReason ?? "None"}</dd></div>
          <div><dt className="text-slate-400">Canonical SHA-256</dt><dd className="break-all font-mono text-xs">{active.provenance.canonicalSha256}</dd></div>
        </dl>
        <div className="mt-5">
          <h3 className="text-sm font-semibold text-slate-300">Exact allowed variables</h3>
          <ul className="mt-2 flex flex-wrap gap-2 text-xs">
            {variablesForKind(kind).map((variable) => (
              <li className="rounded-full border border-white/15 px-2 py-1 font-mono" key={variable}>{`{{${variable}}}`}</li>
            ))}
          </ul>
        </div>
        {canTest ? (
          <AdminActionForm
            action={sendSyntheticEmailTemplateTestAction}
            className="mt-5"
            pendingMessage="Running one capture-only test…"
            successMessage="Capture-only test completed."
          >
            <input name="templateKind" type="hidden" value={kind} />
            <p className="mb-3 text-sm text-slate-300">Fixed recipient: {TEMPLATE_TEST_RECIPIENT}. No SMTP, Provider, or retry.</p>
            <button className="rounded-xl border border-teal-300/40 px-4 py-3" type="submit">Test Active with Synthetic data</button>
          </AdminActionForm>
        ) : null}
      </section>

      <TemplatePreview kind={kind} preview={preview} />
      {selectedRevisionId ? (
        <Link className="w-fit text-sm text-teal-300 underline" href="/admin/email-templates/">Return to Active previews</Link>
      ) : null}

      {canWrite ? (
        inReview ? (
          <section className={panelClass}>
            <h3 className="text-lg font-semibold">Draft editor</h3>
            <p className="mt-2 text-slate-300">Revision {inReview.revisionVersion} is awaiting independent review. A newer Draft is not opened while this review is pending.</p>
          </section>
        ) : (
          <AdminActionForm
            action={saveEmailTemplateDraftAction}
            className={`grid gap-4 ${panelClass}`}
            successMessage="Email Template Draft saved with required Audit."
          >
            <h3 className="text-lg font-semibold">{draft ? `Edit Draft v${draft.revisionVersion}` : "Create next Draft"}</h3>
            <input name="templateKind" type="hidden" value={kind} />
            <input name="revisionId" type="hidden" value={draft?.revisionId ?? ""} />
            <input name="expectedDraftVersion" type="hidden" value={draft?.template.draftVersion ?? 0} />
            <label className="grid gap-2" htmlFor={`subject-${kind}`}>Subject source
              <textarea className={inputClass} defaultValue={editableTemplate.subjectSource} id={`subject-${kind}`} maxLength={200} name="subjectSource" required rows={2} />
            </label>
            <label className="grid gap-2" htmlFor={`body-${kind}`}>Plain-text body source
              <textarea className={`${inputClass} font-mono text-sm`} defaultValue={editableTemplate.textBodySource} id={`body-${kind}`} maxLength={20_000} name="textBodySource" required rows={14} />
            </label>
            <label className="grid gap-2" htmlFor={`summary-${kind}`}>Change summary
              <input className={inputClass} id={`summary-${kind}`} maxLength={500} name="changeSummary" required />
            </label>
            <button className="rounded-xl bg-teal-400 px-4 py-3 font-semibold text-slate-950" type="submit">Save Draft</button>
          </AdminActionForm>
        )
      ) : null}

      {canWrite && draft ? (
        <AdminActionForm action={submitEmailTemplateDraftReviewAction} className={panelClass} successMessage="Email Template Draft submitted for review.">
          <h3 className="text-lg font-semibold">Submit Draft v{draft.revisionVersion}</h3>
          <p className="mt-2 text-sm text-slate-300">Submission freezes this Draft for Reviewer/Publisher or Admin Apply.</p>
          <input name="templateKind" type="hidden" value={kind} />
          <input name="revisionId" type="hidden" value={draft.revisionId} />
          <input name="expectedDraftVersion" type="hidden" value={draft.template.draftVersion} />
          <button className="mt-4 rounded-xl border border-white/20 px-4 py-3" type="submit">Submit for review</button>
        </AdminActionForm>
      ) : null}

      <section className={panelClass}>
        <h3 className="text-xl font-semibold">Immutable Revision history</h3>
        <p className="mt-2 text-sm text-slate-400">Newest version first. Rollback copies compatible Applied history into a new later Applied Revision.</p>
        {history.length === 0 ? <p className="mt-5 text-slate-300">No custom Revision exists. The complete code fallback is Active.</p> : (
          <ol className="mt-5 grid gap-4">
            {history.map((entry) => {
              const isLive = liveRevisionId === entry.revisionId;
              return (
                <li className="min-w-0 rounded-xl border border-white/10 p-4" key={entry.revisionId}>
                  <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
                    <h4 className="font-semibold">Revision {entry.revisionVersion} · {entry.status}{isLive ? " · LIVE" : ""}</h4>
                    <time className="text-xs text-slate-400">{entry.createdAt.toLocaleString("en-GB")}</time>
                  </div>
                  <p className="mt-2 break-words text-sm text-slate-300">{entry.changeSummary ?? "No summary"}</p>
                  <p className="mt-2 break-all font-mono text-xs text-slate-400">{entry.template.canonicalSha256}</p>
                  <div className="mt-4 flex min-w-0 flex-wrap gap-3">
                    <Link className="rounded-lg border border-white/20 px-3 py-2 text-sm" href={`/admin/email-templates/?kind=${kind}&revisionId=${entry.revisionId}`}>Preview this Revision</Link>
                    {canApply && entry.status === "in_review" ? (
                      <AdminActionForm action={applyEmailTemplateRevisionAction} successMessage="Email Template Revision applied atomically.">
                        <input name="templateKind" type="hidden" value={kind} />
                        <input name="revisionId" type="hidden" value={entry.revisionId} />
                        <button className="rounded-lg bg-teal-400 px-3 py-2 text-sm font-semibold text-slate-950" type="submit">Review &amp; Apply</button>
                      </AdminActionForm>
                    ) : null}
                    {canApply && entry.status === "applied" && !isLive ? (
                      <AdminActionForm action={rollbackEmailTemplateAction} successMessage="Rollback copy created and atomically applied.">
                        <input name="templateKind" type="hidden" value={kind} />
                        <input name="sourceRevisionId" type="hidden" value={entry.revisionId} />
                        <button className="rounded-lg border border-amber-300/40 px-3 py-2 text-sm" type="submit">Rollback as new copy</button>
                      </AdminActionForm>
                    ) : null}
                    {canTest ? (
                      <AdminActionForm action={sendSyntheticEmailTemplateTestAction} pendingMessage="Running one capture-only test…" successMessage="Capture-only test completed.">
                        <input name="templateKind" type="hidden" value={kind} />
                        <input name="revisionId" type="hidden" value={entry.revisionId} />
                        <button className="rounded-lg border border-teal-300/40 px-3 py-2 text-sm" type="submit">Test this Revision</button>
                      </AdminActionForm>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </section>
    </article>
  );
}

export default async function EmailTemplatesPage({
  searchParams,
}: Readonly<{ searchParams: Promise<Record<string, string | string[] | undefined>> }>) {
  const user = await resolveCurrentUser();
  if (!user || !canAccessEditorialResource(user.role, "email_template", "manage")) notFound();
  const rawSearchParams = await searchParams;
  const hasSelectedPreview = rawSearchParams.kind !== undefined || rawSearchParams.revisionId !== undefined;
  const selected = hasSelectedPreview
    ? selectedPreviewSchema.safeParse({
        kind: rawSearchParams.kind,
        revisionId: rawSearchParams.revisionId,
      })
    : null;
  if (selected && !selected.success) notFound();
  const projections = await Promise.all(EMAIL_TEMPLATE_KINDS.map((kind) =>
    withDatabase((db) => getEmailTemplateAdminProjection(db, user.role, kind)),
  ));
  const previews = await Promise.all(EMAIL_TEMPLATE_KINDS.map((kind) =>
    withDatabase((db) => previewSyntheticEmailTemplate(
      db,
      { userId: user.id, role: user.role },
      kind,
      selected?.success && selected.data.kind === kind ? selected.data.revisionId : null,
    )),
  ));
  return (
    <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <AdminPageHeader
        description="Two strict plain-text templates, one Settings/Revision authority, fixed-Synthetic Preview, and capture-only test delivery. No customer record is loaded here."
        title="Email Templates"
      />
      <div className="grid min-w-0 gap-12">
        {projections.map((projection, index) => (
          <TemplatePanel
            key={projection.kind}
            preview={previews[index]!}
            projection={projection}
            role={user.role}
            selectedRevisionId={selected?.success && selected.data.kind === projection.kind ? selected.data.revisionId : null}
          />
        ))}
      </div>
    </main>
  );
}
