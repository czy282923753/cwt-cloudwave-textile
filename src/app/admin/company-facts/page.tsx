import { createCompanyFactAction } from "@/admin/actions";
import { AdminActionForm } from "@/admin/components/admin-action-form";
import Link from "next/link";
import { AdminPageHeader, AdminTable } from "@/admin/components/admin-table";
import { listAdminCompanyFacts } from "@/admin/data";
import { requireCurrentUser } from "@/auth/current-user";

export default async function AdminCompanyFactsPage() {
  await requireCurrentUser("company_facts.manage");
  const facts = await listAdminCompanyFacts();
  return (
    <main className="mx-auto max-w-7xl px-6 py-10">
      <AdminPageHeader
        description="New facts begin as Provided and Public Use: No. Verification requires evidence and reviewer authority."
        title="Company Facts"
      />
      <div className="grid gap-8 xl:grid-cols-[1fr_28rem]">
        <AdminTable
          headers={["Key", "Subject", "Statement", "Status", "Public"]}
          rows={facts.map((fact) => [<Link className="text-teal-300" href={`/admin/company-facts/${fact.id}`} key={fact.id}>{fact.factKey}</Link>, fact.subject, fact.statement, fact.verificationStatus, fact.publicUseAllowed ? "Allowed" : "No"])}
        />
        <AdminActionForm action={createCompanyFactAction} className="grid content-start gap-4 rounded-2xl border border-white/10 bg-slate-900 p-5" successMessage="Company Fact created as Provided / Not Public.">
          <h2 className="text-xl font-semibold">Record unverified fact</h2>
          <input className="rounded-lg bg-slate-950 p-3" name="factKey" placeholder="stable.fact.key" required />
          <input className="rounded-lg bg-slate-950 p-3" name="subject" placeholder="Subject" required />
          <textarea className="rounded-lg bg-slate-950 p-3" name="statement" placeholder="Exact factual statement" required rows={5} />
          <input className="rounded-lg bg-slate-950 p-3" name="relationshipToCwt" placeholder="Relationship to CWT" />
          <input className="rounded-lg bg-slate-950 p-3" name="evidenceReference" placeholder="Evidence reference (does not auto-verify)" />
          <button className="rounded-xl border border-amber-300/40 px-4 py-3" type="submit">Save as Provided / Not Public</button>
        </AdminActionForm>
      </div>
    </main>
  );
}
