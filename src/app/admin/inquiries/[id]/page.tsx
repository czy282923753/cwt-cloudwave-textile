import Link from "next/link";
import { notFound } from "next/navigation";

import {
  addCustomerActivityAction,
  assignInquiryAction,
  changeInquiryStatusAction,
} from "@/admin/actions";
import { AdminPageHeader, AdminTable } from "@/admin/components/admin-table";
import { getAdminInquiry, listCrmOwners } from "@/admin/data";
import { requireCurrentUser } from "@/auth/current-user";

const fieldClass = "rounded-lg border border-white/10 bg-slate-950 p-3";
const panelClass = "grid gap-4 rounded-2xl border border-white/10 bg-slate-900 p-5";

export default async function InquiryDetailPage({ params }: Readonly<{ params: Promise<{ id: string }> }>) {
  const user = await requireCurrentUser("inquiries.read");
  const { id } = await params;
  const [inquiry, owners] = await Promise.all([
    getAdminInquiry({ userId: user.id, role: user.role }, id),
    user.role === "admin" ? listCrmOwners() : Promise.resolve([]),
  ]);
  if (!inquiry) notFound();
  const firstResponseMinutes = inquiry.firstResponseAt
    ? Math.round((inquiry.firstResponseAt.getTime() - inquiry.createdAt.getTime()) / 60_000)
    : null;
  return <main className="mx-auto max-w-7xl px-6 py-10">
    <AdminPageHeader description={`${inquiry.submittedEmail} · created ${inquiry.createdAt.toLocaleString("en-GB")}`} title={inquiry.submittedName} />
    <div className="grid gap-8 lg:grid-cols-[1.2fr_.8fr]">
      <div className="grid gap-8">
        <section className="rounded-2xl border border-white/10 bg-slate-900 p-6">
          <h2 className="text-xl font-semibold">Submitted requirement snapshot</h2>
          {inquiry.description ? <p className="mt-4 whitespace-pre-line leading-7 text-slate-300">{inquiry.description}</p> : <p className="mt-4 text-slate-400">Image-only inquiry</p>}
          <dl className="mt-6 grid gap-4 text-sm sm:grid-cols-2">
            <div><dt className="text-slate-500">Submitted Email</dt><dd>{inquiry.submittedEmail}</dd></div><div><dt className="text-slate-500">Submitted Country</dt><dd>{inquiry.submittedCountryCode ?? "Not provided"}</dd></div><div><dt className="text-slate-500">Submitted WhatsApp</dt><dd>{inquiry.submittedWhatsapp ?? "Not provided"}</dd></div><div><dt className="text-slate-500">CRM Contact</dt><dd>{inquiry.contactName} · {inquiry.email}</dd></div><div><dt className="text-slate-500">Source page</dt><dd>{inquiry.sourcePagePath}</dd></div><div><dt className="text-slate-500">Landing page</dt><dd>{inquiry.landingPagePath ?? "Unavailable"}</dd></div><div><dt className="text-slate-500">UTM</dt><dd>{[inquiry.utmSource, inquiry.utmMedium, inquiry.utmCampaign].filter(Boolean).join(" / ") || "Unavailable"}</dd></div><div><dt className="text-slate-500">First response</dt><dd>{firstResponseMinutes === null ? "Not recorded" : `${firstResponseMinutes} minutes`}</dd></div>
          </dl>
          {inquiry.files.length ? <div className="mt-6"><h3 className="font-semibold">Private files</h3><div className="mt-3 flex flex-wrap gap-2">{inquiry.files.map((file) => <Link className="rounded-lg border border-white/20 px-3 py-2 text-sm text-teal-300" href={`/api/inquiry-assets/${file.id}/`} key={file.id}>{file.fileName}</Link>)}</div><p className="mt-2 text-xs text-slate-500">Opening creates an expiring grant and Audit Log.</p></div> : null}
        </section>
        <section><h2 className="mb-4 text-xl font-semibold">Customer Activities</h2><AdminTable headers={["Type", "Direction", "Content", "Operator", "Time"]} rows={inquiry.activities.map((activity) => [activity.type, activity.direction, activity.content, activity.operator ?? "System", activity.occurredAt.toLocaleString("en-GB")])} /></section>
        <section><h2 className="mb-4 text-xl font-semibold">Status History</h2><AdminTable headers={["From", "To", "Reason", "Time"]} rows={inquiry.history.map((history) => [history.fromStatus ?? "Created", history.toStatus, history.reason ?? "—", history.changedAt.toLocaleString("en-GB")])} /></section>
      </div>
      <aside className="grid content-start gap-6">
        <form action={assignInquiryAction} className={panelClass}>
          <h2 className="text-xl font-semibold">Ownership &amp; qualification</h2><input name="inquiryId" type="hidden" value={inquiry.id} />
          {user.role === "admin" ? <label className="grid gap-2">Owner<select className={fieldClass} defaultValue={inquiry.ownerUserId ?? ""} name="ownerUserId"><option value="">Unassigned</option>{owners.map((owner) => <option key={owner.id} value={owner.id}>{owner.displayName} · {owner.role}</option>)}</select></label> : <p className="text-sm text-slate-300">Assigned to you. Only an Admin can reassign ownership.</p>}
          <label className="grid gap-2">Priority<select className={fieldClass} defaultValue={inquiry.priority} name="priority"><option value="low">Low</option><option value="normal">Normal</option><option value="high">High</option><option value="urgent">Urgent</option></select></label>
          <label className="grid gap-2">Qualification<select className={fieldClass} defaultValue={inquiry.qualificationStatus} name="qualificationStatus"><option value="unassessed">Unassessed</option><option value="qualified">Qualified</option><option value="unqualified">Unqualified</option><option value="needs_information">Needs information</option></select></label>
          <button className="rounded-xl bg-teal-400 px-4 py-3 font-semibold text-slate-950">Save assignment</button>
        </form>
        <form action={changeInquiryStatusAction} className={panelClass}><h2 className="text-xl font-semibold">Change status</h2><input name="inquiryId" type="hidden" value={inquiry.id} /><select className={fieldClass} defaultValue={inquiry.status} name="status">{["new", "reviewing", "qualified", "quoted", "sample", "negotiation", "won", "lost", "spam", "archived"].map((status) => <option key={status} value={status}>{status}</option>)}</select><textarea className={fieldClass} name="reason" placeholder="Reason (required for Lost)" rows={3} /><button className="rounded-xl border border-white/20 px-4 py-3">Apply governed transition</button></form>
        <form action={addCustomerActivityAction} className={panelClass}><h2 className="text-xl font-semibold">Add activity</h2><input name="inquiryId" type="hidden" value={inquiry.id} /><label className="grid gap-2">Type<select className={fieldClass} name="type"><option value="note">Note</option><option value="email">Email</option><option value="whatsapp">WhatsApp</option><option value="quote">Quote</option><option value="sample">Sample</option></select></label><label className="grid gap-2">Direction<select className={fieldClass} name="direction"><option value="internal">Internal</option><option value="outbound">Outbound</option><option value="inbound">Inbound</option></select></label><textarea className={fieldClass} name="content" required rows={4} /><button className="rounded-xl border border-white/20 px-4 py-3">Record activity</button></form>
      </aside>
    </div>
  </main>;
}
