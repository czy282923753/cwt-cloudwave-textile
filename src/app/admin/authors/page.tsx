import { createAuthorAction } from "@/admin/actions";
import { AdminPageHeader, AdminTable } from "@/admin/components/admin-table";
import { listAdminAuthors } from "@/admin/data";
import { requireCurrentUser } from "@/auth/current-user";

export default async function AdminAuthorsPage() {
  await requireCurrentUser("content.read");
  const authors = await listAdminAuthors();
  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <AdminPageHeader description="Use a real person or an accurate organization author such as CWT Textile Team." title="Authors" />
      <div className="grid gap-8 lg:grid-cols-[1fr_24rem]">
        <AdminTable headers={["Author"]} rows={authors.map((author) => [author.displayName])} />
        <form action={createAuthorAction} className="grid content-start gap-4 rounded-2xl border border-white/10 bg-slate-900 p-5">
          <input className="rounded-lg bg-slate-950 p-3" name="displayName" placeholder="Display name" required />
          <input className="rounded-lg bg-slate-950 p-3" name="internalKey" placeholder="stable-internal-key" required />
          <textarea className="rounded-lg bg-slate-950 p-3" name="bio" placeholder="Optional verified bio" rows={4} />
          <label className="flex gap-3"><input name="isOrganization" type="checkbox" />Organization author</label>
          <button className="rounded-xl bg-teal-400 px-4 py-3 font-semibold text-slate-950" type="submit">Create Author</button>
        </form>
      </div>
    </main>
  );
}
