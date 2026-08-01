import { createAuthorAction, updateAuthorAction } from "@/admin/actions";
import { AdminPageHeader } from "@/admin/components/admin-table";
import { listAdminAuthors } from "@/admin/data";
import { requireCurrentUser } from "@/auth/current-user";

const inputClass = "rounded-lg border border-white/10 bg-slate-950 p-3";
const panelClass = "grid content-start gap-4 rounded-2xl border border-white/10 bg-slate-900 p-5";

export default async function AdminAuthorsPage() {
  await requireCurrentUser("content.read");
  const authors = await listAdminAuthors();
  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <AdminPageHeader description="Use a real person or an accurate organization author such as CWT Textile Team." title="Authors" />
      <div className="grid gap-8 lg:grid-cols-[1fr_24rem]">
        <section className="grid gap-4">
          {authors.map((author) => (
            <form action={updateAuthorAction} className={panelClass} key={author.id}>
              <input name="authorId" type="hidden" value={author.id} />
              <p className="text-sm text-slate-400">{author.internalKey}</p>
              <label className="grid gap-2">Display name<input className={inputClass} defaultValue={author.displayName} name="displayName" required /></label>
              <label className="grid gap-2">Bio<textarea className={inputClass} defaultValue={author.bio ?? ""} name="bio" rows={4} /></label>
              <div className="flex flex-wrap gap-5"><label className="flex gap-2"><input defaultChecked={author.isOrganization} name="isOrganization" type="checkbox" />Organization author</label><label className="flex gap-2"><input defaultChecked={author.isActive} name="isActive" type="checkbox" />Active</label></div>
              <button className="rounded-xl border border-white/20 px-4 py-3">Save Author</button>
            </form>
          ))}
        </section>
        <form action={createAuthorAction} className={panelClass}>
          <h2 className="text-xl font-semibold">New Author</h2>
          <input className={inputClass} name="displayName" placeholder="Display name" required />
          <input className={inputClass} name="internalKey" placeholder="stable-internal-key" required />
          <textarea className={inputClass} name="bio" placeholder="Optional verified bio" rows={4} />
          <label className="flex gap-3"><input name="isOrganization" type="checkbox" />Organization author</label>
          <button className="rounded-xl bg-teal-400 px-4 py-3 font-semibold text-slate-950" type="submit">Create Author</button>
        </form>
      </div>
    </main>
  );
}
