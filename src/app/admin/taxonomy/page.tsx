import {
  createTaxonomyAction,
  changeTaxonomySlugAction,
  setTaxonomyActiveAction,
  setTaxonomyIndexAction,
  updateTaxonomyAction,
} from "@/admin/actions";
import { AdminActionForm } from "@/admin/components/admin-action-form";
import { AdminPageHeader } from "@/admin/components/admin-table";
import { listAdminTaxonomy } from "@/admin/data";
import { requireCurrentUser } from "@/auth/current-user";

const inputClass = "rounded-lg border border-white/10 bg-slate-950 p-3";
const panelClass = "grid gap-4 rounded-2xl border border-white/10 bg-slate-900 p-5";

const dimensions = [
  ["material_fiber", "Material / Fiber"],
  ["structure_construction", "Structure / Construction"],
  ["commercial_collection", "Commercial Collection"],
  ["surface_hand_feel", "Surface / Hand Feel"],
] as const;

export default async function AdminTaxonomyPage() {
  await requireCurrentUser("products.read");
  const terms = await listAdminTaxonomy();
  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <AdminPageHeader
        description="Four product dimensions only; end use belongs in Applications. Sports Fabric is a Commercial Collection, while Sportswear is an Application."
        title="Product Taxonomy"
      />
      <div className="grid gap-8 lg:grid-cols-[1fr_22rem]">
        <section className="grid gap-5">
          {terms.map((term) => (
            <article className={panelClass} key={term.id}>
              <p className="text-sm text-slate-400">{term.path} · {term.isActive ? "active" : "inactive"} · {term.indexStatus}</p>
              <AdminActionForm action={updateTaxonomyAction} className="grid gap-3" successMessage="Taxonomy term saved.">
                <input name="termId" type="hidden" value={term.id} />
                <input name="routeId" type="hidden" value={term.routeId} />
                <label className="grid gap-2">Name<input className={inputClass} defaultValue={term.name} name="name" required /></label>
                <label className="grid gap-2">Dimension<select className={inputClass} defaultValue={term.dimension} name="dimension">{dimensions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
                <label className="grid gap-2">Product Code Prefix<input className={inputClass} defaultValue={term.productCodePrefix ?? ""} maxLength={8} minLength={3} name="productCodePrefix" pattern="[A-Z]{3,8}" placeholder="e.g. POL" /></label>
                <label className="grid gap-2">Description<textarea className={inputClass} defaultValue={term.description ?? ""} name="description" rows={4} /></label>
                <label className="grid gap-2">SEO Title<input className={inputClass} defaultValue={term.seoTitle ?? ""} name="seoTitle" /></label>
                <label className="grid gap-2">Meta Description<textarea className={inputClass} defaultValue={term.metaDescription ?? ""} name="metaDescription" rows={3} /></label>
                <button className="rounded-xl bg-teal-400 px-4 py-3 font-semibold text-slate-950">Save term</button>
              </AdminActionForm>
              <div className="grid gap-3 sm:grid-cols-2">
                <AdminActionForm action={setTaxonomyIndexAction} className="flex gap-2" successMessage="Taxonomy Index status updated."><input name="termId" type="hidden" value={term.id} /><select className={`${inputClass} min-w-0 flex-1`} defaultValue={term.indexStatus} name="indexStatus"><option value="noindex">Noindex</option><option value="index">Index</option></select><button className="rounded-xl border border-white/20 px-3">Apply</button></AdminActionForm>
                <AdminActionForm action={setTaxonomyActiveAction} className="flex gap-2" successMessage="Taxonomy active state updated."><input name="termId" type="hidden" value={term.id} /><input name="active" type="hidden" value={term.isActive ? "false" : "true"} /><button className="w-full rounded-xl border border-white/20 px-3 py-3">{term.isActive ? "Deactivate + Noindex" : "Activate"}</button></AdminActionForm>
              </div>
              <AdminActionForm action={changeTaxonomySlugAction} className="flex gap-2" successMessage="Taxonomy URL changed and 301 Redirect created."><input name="termId" type="hidden" value={term.id} /><input className={`${inputClass} min-w-0 flex-1`} name="slug" placeholder="new-taxonomy-slug" required /><button className="rounded-xl border border-white/20 px-3">Change URL + 301</button></AdminActionForm>
            </article>
          ))}
        </section>
        <AdminActionForm action={createTaxonomyAction} className={`${panelClass} content-start`} successMessage="Taxonomy term created.">
          <h2 className="text-xl font-semibold">New taxonomy term</h2>
          <input className={inputClass} name="name" placeholder="English name" required />
          <input className={inputClass} name="internalKey" placeholder="stable-internal-key" required />
          <select className={inputClass} name="dimension" required>{dimensions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
          <input className={inputClass} maxLength={8} minLength={3} name="productCodePrefix" pattern="[A-Z]{3,8}" placeholder="Optional Product Code prefix" />
          <textarea className={inputClass} name="description" placeholder="Optional description" rows={4} />
          <button className="rounded-xl bg-teal-400 px-4 py-3 font-semibold text-slate-950" type="submit">Create noindex term</button>
        </AdminActionForm>
      </div>
    </main>
  );
}
