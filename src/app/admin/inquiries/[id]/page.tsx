import Link from "next/link";
import { notFound } from "next/navigation";

import {
  addCustomerActivityAction,
  assignInquiryAction,
  changeInquiryStatusAction,
} from "@/admin/actions";
import { AdminActionForm } from "@/admin/components/admin-action-form";
import { AdminPageHeader, AdminTable } from "@/admin/components/admin-table";
import { getAdminInquiry, listCrmOwners } from "@/admin/data";
import { requireCurrentUser } from "@/auth/current-user";

const fieldClass = "rounded-lg border border-white/10 bg-slate-950 p-3";
const panelClass = "grid gap-4 rounded-2xl border border-white/10 bg-slate-900 p-5";

function joinedAttribution(...values: Array<string | null>) {
  return values.filter(Boolean).join(" / ") || "Unavailable";
}

export default async function InquiryDetailPage({ params }: Readonly<{ params: Promise<{ id: string }> }>) {
  const user = await requireCurrentUser("inquiries.read");
  const { id } = await params;
  const [inquiry, owners] = await Promise.all([
    getAdminInquiry({ userId: user.id, role: user.role }, id),
    user.role === "admin" ? listCrmOwners() : Promise.resolve([]),
  ]);
  if (!inquiry) notFound();
  const sourceEvidence = inquiry.attribution.sourceEntityEvidence;
  return <main className="mx-auto max-w-7xl px-6 py-10">
    <AdminPageHeader description={`${inquiry.submittedEmail} · created ${inquiry.createdAt.toLocaleString("en-GB")}`} title={inquiry.submittedName} />
    <div className="grid gap-8 lg:grid-cols-[1.2fr_.8fr]">
      <div className="grid gap-8">
        <section className="rounded-2xl border border-white/10 bg-slate-900 p-6">
          <h2 className="text-xl font-semibold">Submitted requirement snapshot</h2>
          {inquiry.description ? <p className="mt-4 whitespace-pre-line leading-7 text-slate-300">{inquiry.description}</p> : <p className="mt-4 text-slate-400">Image-only inquiry</p>}
          <dl className="mt-6 grid gap-4 text-sm sm:grid-cols-2">
            <div><dt className="text-slate-400">Submitted Email</dt><dd>{inquiry.submittedEmail}</dd></div><div><dt className="text-slate-400">Submitted Country</dt><dd>{inquiry.submittedCountryCode ?? "Not provided"}</dd></div><div><dt className="text-slate-400">Submitted WhatsApp</dt><dd>{inquiry.submittedWhatsapp ?? "Not provided"}</dd></div><div><dt className="text-slate-400">CRM Contact</dt><dd>{inquiry.contactName} · {inquiry.email}</dd></div>
          </dl>
          {inquiry.files.length ? <div className="mt-6"><h3 className="font-semibold">Private files</h3><div className="mt-3 flex flex-wrap gap-2">{inquiry.files.map((file) => <Link className="rounded-lg border border-white/20 px-3 py-2 text-sm text-teal-300" href={`/api/inquiry-assets/${file.id}/`} key={file.id}>{file.fileName}</Link>)}</div><p className="mt-2 text-xs text-slate-400">Opening creates an expiring grant and Audit Log.</p></div> : null}
        </section>
        <section className="rounded-2xl border border-white/10 bg-slate-900 p-6" aria-labelledby="historical-attribution-heading">
          <h2 className="text-xl font-semibold" id="historical-attribution-heading">Historical attribution snapshot</h2>
          <p className="mt-2 text-sm text-slate-400">Immutable evidence captured when the Inquiry was first created.</p>
          <div className="mt-6 grid gap-6 md:grid-cols-3">
            <div>
              <h3 className="font-semibold text-slate-200">First Touch</h3>
              <dl className="mt-3 grid gap-3 text-sm">
                <div><dt className="text-slate-400">Landing page</dt><dd>{inquiry.attribution.firstTouch.landingPagePath ?? "Unavailable"}</dd></div>
                <div><dt className="text-slate-400">Referrer</dt><dd className="break-words">{inquiry.attribution.firstTouch.referrer ?? "Unavailable"}</dd></div>
                <div><dt className="text-slate-400">UTM</dt><dd>{joinedAttribution(inquiry.attribution.firstTouch.utmSource, inquiry.attribution.firstTouch.utmMedium, inquiry.attribution.firstTouch.utmCampaign)}</dd></div>
              </dl>
            </div>
            <div>
              <h3 className="font-semibold text-slate-200">Last Non-Direct</h3>
              <dl className="mt-3 grid gap-3 text-sm">
                <div><dt className="text-slate-400">Source</dt><dd className="break-words">{inquiry.attribution.lastNonDirect.source ?? "Unavailable"}</dd></div>
                <div><dt className="text-slate-400">Medium</dt><dd>{inquiry.attribution.lastNonDirect.medium ?? "Unavailable"}</dd></div>
                <div><dt className="text-slate-400">Campaign</dt><dd>{inquiry.attribution.lastNonDirect.campaign ?? "Unavailable"}</dd></div>
              </dl>
            </div>
            <div>
              <h3 className="font-semibold text-slate-200">Submit Touch</h3>
              <dl className="mt-3 grid gap-3 text-sm">
                <div><dt className="text-slate-400">Source page</dt><dd>{inquiry.attribution.submitTouch.sourcePagePath}</dd></div>
                <div><dt className="text-slate-400">Referrer</dt><dd className="break-words">{inquiry.attribution.submitTouch.referrer ?? "Unavailable"}</dd></div>
                <div><dt className="text-slate-400">UTM</dt><dd>{joinedAttribution(inquiry.attribution.submitTouch.utmSource, inquiry.attribution.submitTouch.utmMedium, inquiry.attribution.submitTouch.utmCampaign)}</dd></div>
              </dl>
            </div>
          </div>
          <p className="mt-5 text-xs text-slate-400">Attribution confidence: {inquiry.attribution.confidence}</p>
        </section>
        <section className="rounded-2xl border border-white/10 bg-slate-900 p-6" aria-labelledby="source-evidence-heading">
          <h2 className="text-xl font-semibold" id="source-evidence-heading">Source entity evidence</h2>
          <p className="mt-2 text-sm text-slate-400">The historical identity is immutable. The label and link below are a live, current-public check and may change or disappear.</p>
          <dl className="mt-5 grid gap-4 text-sm sm:grid-cols-2">
            <div><dt className="text-slate-400">Historical evidence</dt><dd>{sourceEvidence ? `${sourceEvidence.typeLabel} identity stored` : "No eligible source identity stored"}</dd></div>
            <div><dt className="text-slate-400">Current public presentation</dt><dd>{sourceEvidence?.currentPublicSource ? <Link className="break-words text-teal-300 underline-offset-4 hover:underline focus-visible:underline" href={sourceEvidence.currentPublicSource.href}>{sourceEvidence.currentPublicSource.label} · {sourceEvidence.currentPublicSource.href}</Link> : "Unavailable — no current safe public target"}</dd></div>
          </dl>
        </section>
        <section className="rounded-2xl border border-white/10 bg-slate-900 p-6" aria-labelledby="crm-outcome-heading">
          <h2 className="text-xl font-semibold" id="crm-outcome-heading">CRM outcome</h2>
          <dl className="mt-5 grid gap-4 text-sm sm:grid-cols-2">
            <div><dt className="text-slate-400">Pipeline status</dt><dd>{inquiry.status}</dd></div>
            <div><dt className="text-slate-400">Qualification</dt><dd>{inquiry.qualificationStatus}</dd></div>
            <div><dt className="text-slate-400">Lost Reason</dt><dd>{inquiry.status === "lost" ? inquiry.lostReason ?? "Unavailable" : "Not applicable"}</dd></div>
            <div><dt className="text-slate-400">Effective-inquiry reporting</dt><dd>{inquiry.isEffectiveInquiry ? "Included" : "Excluded as Spam"}</dd></div>
            <div><dt className="text-slate-400">First Response</dt><dd>{inquiry.firstResponseMinutes === null ? "Not recorded" : `${inquiry.firstResponseMinutes} minutes`}</dd></div>
          </dl>
        </section>
        <section className="rounded-2xl bg-slate-950"><h2 className="mb-4 text-xl font-semibold">Customer Activities</h2><AdminTable headers={["Type", "Direction", "Content", "Operator", "Time"]} rows={inquiry.activities.map((activity) => [activity.type, activity.direction, activity.content, activity.operator ?? "System", activity.occurredAt.toLocaleString("en-GB")])} /></section>
        <section className="rounded-2xl bg-slate-950"><h2 className="mb-4 text-xl font-semibold">Status History</h2><AdminTable headers={["From", "To", "Reason", "Time"]} rows={inquiry.history.map((history) => [history.fromStatus ?? "Created", history.toStatus, history.reason ?? "—", history.changedAt.toLocaleString("en-GB")])} /></section>
      </div>
      <aside className="grid content-start gap-6">
        <AdminActionForm action={assignInquiryAction} className={panelClass} successMessage="Inquiry assignment and priority updated.">
          <h2 className="text-xl font-semibold">Ownership &amp; qualification</h2><input name="inquiryId" type="hidden" value={inquiry.id} />
          {user.role === "admin" ? <label className="grid gap-2">Owner<select className={fieldClass} defaultValue={inquiry.ownerUserId ?? ""} name="ownerUserId"><option value="">Unassigned</option>{owners.map((owner) => <option key={owner.id} value={owner.id}>{owner.displayName} · {owner.role}</option>)}</select></label> : <p className="text-sm text-slate-300">Assigned to you. Only an Admin can reassign ownership.</p>}
          <label className="grid gap-2">Priority<select className={fieldClass} defaultValue={inquiry.priority} name="priority"><option value="low">Low</option><option value="normal">Normal</option><option value="high">High</option><option value="urgent">Urgent</option></select></label>
          <label className="grid gap-2">Qualification<select className={fieldClass} defaultValue={inquiry.qualificationStatus} name="qualificationStatus"><option value="unassessed">Unassessed</option><option value="qualified">Qualified</option><option value="unqualified">Unqualified</option><option value="needs_information">Needs information</option></select></label>
          <button className="rounded-xl bg-teal-400 px-4 py-3 font-semibold text-slate-950">Save assignment</button>
        </AdminActionForm>
        <AdminActionForm action={changeInquiryStatusAction} className={panelClass} successMessage="CRM status changed and history recorded."><h2 className="text-xl font-semibold">Change status</h2><p className="text-sm text-slate-400">Current: {inquiry.status}. Only accepted next transitions are offered.</p><input name="inquiryId" type="hidden" value={inquiry.id} /><label className="grid gap-2">Next status<select className={fieldClass} defaultValue="" name="status" required><option disabled value="">Select a next status</option>{inquiry.allowedNextStatuses.map((status) => <option key={status} value={status}>{status}</option>)}</select></label><label className="grid gap-2">Transition reason<textarea className={fieldClass} name="reason" placeholder="Required for Lost" rows={3} /></label><button className="rounded-xl border border-white/20 px-4 py-3">Apply governed transition</button></AdminActionForm>
        <AdminActionForm action={addCustomerActivityAction} className={panelClass} successMessage="Customer Activity recorded."><h2 className="text-xl font-semibold">Add activity</h2><input name="inquiryId" type="hidden" value={inquiry.id} /><label className="grid gap-2">Type<select className={fieldClass} name="type"><option value="note">Note</option><option value="email">Email</option><option value="whatsapp">WhatsApp</option><option value="quote">Quote</option><option value="sample">Sample</option></select></label><label className="grid gap-2">Direction<select className={fieldClass} name="direction"><option value="internal">Internal</option><option value="outbound">Outbound</option><option value="inbound">Inbound</option></select></label><label className="grid gap-2">Activity details<textarea className={fieldClass} name="content" required rows={4} /></label><button className="rounded-xl border border-white/20 px-4 py-3">Record activity</button></AdminActionForm>
      </aside>
    </div>
  </main>;
}
