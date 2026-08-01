import { notFound } from "next/navigation";

import {
  rejectCompanyFactAction,
  updateCompanyFactAction,
  verifyCompanyFactAction,
} from "@/admin/actions";
import { AdminActionForm } from "@/admin/components/admin-action-form";
import { AdminPageHeader } from "@/admin/components/admin-table";
import { getAdminCompanyFact } from "@/admin/data";
import { requireCurrentUser } from "@/auth/current-user";

const inputClass = "rounded-lg border border-white/10 bg-slate-950 p-3";
const panelClass = "grid gap-4 rounded-2xl border border-white/10 bg-slate-900 p-6";

export default async function CompanyFactEditorPage({ params }: Readonly<{ params: Promise<{ id: string }> }>) {
  await requireCurrentUser("company_facts.manage");
  const fact = await getAdminCompanyFact((await params).id);
  if (!fact) notFound();
  return <main className="mx-auto max-w-4xl px-6 py-10"><AdminPageHeader title={fact.factKey} description={`${fact.verificationStatus} · Public use ${fact.publicUseAllowed ? "allowed" : "not allowed"}`} /><div className="grid gap-8">
    <AdminActionForm action={updateCompanyFactAction} className={panelClass} successMessage="Company Fact saved and returned to Provided / Not Public."><input name="factId" type="hidden" value={fact.id} /><h2 className="text-xl font-semibold">Edit fact</h2><p className="text-sm text-amber-200">Any edit resets the Fact to Provided and disables public use until reverified.</p><label className="grid gap-2">Subject<input className={inputClass} defaultValue={fact.subject} name="subject" required /></label><label className="grid gap-2">Statement<textarea className={inputClass} defaultValue={fact.statement} name="statement" required rows={6} /></label><label className="grid gap-2">Relationship to CWT<input className={inputClass} defaultValue={fact.relationshipToCwt ?? ""} name="relationshipToCwt" /></label><label className="grid gap-2">Evidence Reference<input className={inputClass} defaultValue={fact.evidenceReference ?? ""} name="evidenceReference" /></label><button className="rounded-xl border border-white/20 px-4 py-3">Save as Provided / Not Public</button></AdminActionForm>
    <AdminActionForm action={verifyCompanyFactAction} className={panelClass} successMessage="Company Fact verified."><input name="factId" type="hidden" value={fact.id} /><h2 className="text-xl font-semibold">Human verification</h2><label className="grid gap-2">Evidence Reference<input className={inputClass} defaultValue={fact.evidenceReference ?? ""} name="evidenceReference" required /></label><label className="flex gap-2"><input defaultChecked={fact.publicUseAllowed} name="publicUseAllowed" type="checkbox" />Allow this exact verified statement on public pages</label><button className="rounded-xl bg-teal-400 px-4 py-3 font-semibold text-slate-950">Verify</button></AdminActionForm>
    <AdminActionForm action={rejectCompanyFactAction} className={panelClass} successMessage="Company Fact rejected and blocked from public use."><input name="factId" type="hidden" value={fact.id} /><h2 className="text-xl font-semibold">Reject Fact</h2><input className={inputClass} name="reason" placeholder="Rejection reason" required /><button className="rounded-xl border border-red-300/40 px-4 py-3">Reject and block public use</button></AdminActionForm>
  </div></main>;
}
