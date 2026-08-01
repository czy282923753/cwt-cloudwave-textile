import { createApplicationAction } from "@/admin/actions";
import { AdminActionForm } from "@/admin/components/admin-action-form";
import { AdminPageHeader, AdminTable } from "@/admin/components/admin-table";
import { listAdminApplications } from "@/admin/data";
import { requireCurrentUser } from "@/auth/current-user";
import Link from "next/link";

export default async function AdminApplicationsPage() {
  await requireCurrentUser("products.read");
  const applications = await listAdminApplications();
  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <AdminPageHeader
        description="Applications model end use and remain separate from material, structure, collection, and surface taxonomies."
        title="Applications"
      />
      <div className="grid gap-8 lg:grid-cols-[1fr_24rem]">
        <AdminTable
          headers={["Application", "Status", "Updated"]}
          rows={applications.map((application) => [
            <Link className="text-teal-300" href={`/admin/applications/${application.id}`} key={application.id}>{application.name}</Link>,
            application.status,
            application.updatedAt.toLocaleString("en-GB"),
          ])}
        />
        <AdminActionForm action={createApplicationAction} className="grid content-start gap-4 rounded-2xl border border-white/10 bg-slate-900 p-5" successMessage="Application Draft created.">
          <h2 className="text-xl font-semibold">New Application Draft</h2>
          <input className="rounded-lg bg-slate-950 p-3" name="name" placeholder="e.g. Sportswear" required />
          <input className="rounded-lg bg-slate-950 p-3" name="internalKey" placeholder="stable-internal-key" required />
          <textarea className="rounded-lg bg-slate-950 p-3" name="shortDescription" placeholder="Short description" rows={3} />
          <textarea className="rounded-lg bg-slate-950 p-3" name="body" placeholder="Landing page body" rows={6} />
          <button className="rounded-xl bg-teal-400 px-4 py-3 font-semibold text-slate-950" type="submit">Create noindex draft</button>
        </AdminActionForm>
      </div>
    </main>
  );
}
