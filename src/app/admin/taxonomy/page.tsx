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

const inputClass = "min-w-0 w-full rounded-lg border border-white/10 bg-slate-950 p-3";
const panelClass = "grid min-w-0 gap-4 rounded-2xl border border-white/10 bg-slate-900 p-4 sm:p-5";

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
    <main className="mx-auto min-w-0 max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
      <AdminPageHeader
        description="Four product dimensions only; end use belongs in Applications. Sports Fabric is a Commercial Collection, while Sportswear is an Application."
        title="Product Taxonomy"
      />
      <div className="grid gap-8 lg:grid-cols-[1fr_22rem]">
        <section className="grid gap-5">
          {terms.map((term) => (
            <article className={panelClass} key={term.id}>
              <p className="break-all text-sm text-slate-300">{term.path ?? "Internal Draft · no public route"} · {term.isActive ? "active" : "inactive"} · {term.indexStatus ?? "noindex"}</p>
              <AdminActionForm action={updateTaxonomyAction} className="grid gap-3" successMessage="Taxonomy term saved.">
                <input name="termId" type="hidden" value={term.id} />
                <input name="routeId" type="hidden" value={term.routeId ?? ""} />
                <label className="grid gap-2">Name<input className={inputClass} defaultValue={term.name} name="name" required /></label>
                <label className="grid gap-2">Dimension<select className={inputClass} defaultValue={term.dimension} name="dimension">{dimensions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
                <label className="grid gap-2">Product Code Prefix<input className={inputClass} defaultValue={term.productCodePrefix ?? ""} maxLength={8} minLength={3} name="productCodePrefix" pattern="[A-Z]{3,8}" placeholder="e.g. POL" /></label>
                <label className="grid gap-2">Description<textarea className={inputClass} defaultValue={term.description ?? ""} name="description" rows={4} /></label>
                {term.routeId ? <>
                  <label className="grid gap-2">SEO Title<input className={inputClass} defaultValue={term.seoTitle ?? ""} name="seoTitle" /></label>
                  <label className="grid gap-2">Meta Description<textarea className={inputClass} defaultValue={term.metaDescription ?? ""} name="metaDescription" rows={3} /></label>
                </> : <p className="text-sm text-slate-300">Saving this quick-created internal Draft is the explicit approval that creates its noindex public URL.</p>}
                <button className="rounded-xl bg-teal-400 px-4 py-3 font-semibold text-slate-950">{term.routeId ? "Save term" : "Approve term and create noindex URL"}</button>
              </AdminActionForm>
              <div className="grid gap-3 sm:grid-cols-2">
                {term.routeId ? <AdminActionForm action={setTaxonomyIndexAction} className="flex gap-2" successMessage="Taxonomy Index status updated."><input name="termId" type="hidden" value={term.id} /><label className="sr-only" htmlFor={`taxonomy-index-${term.id}`}>Index status</label><select className={`${inputClass} min-w-0 flex-1`} defaultValue={term.indexStatus ?? "noindex"} id={`taxonomy-index-${term.id}`} name="indexStatus"><option value="noindex">Noindex</option><option value="index">Index</option></select><button className="rounded-xl border border-white/20 px-3">Apply</button></AdminActionForm> : <span />}
                <AdminActionForm action={setTaxonomyActiveAction} className="flex gap-2" successMessage="Taxonomy active state updated."><input name="termId" type="hidden" value={term.id} /><input name="active" type="hidden" value={term.isActive ? "false" : "true"} /><button className="w-full rounded-xl border border-white/20 px-3 py-3">{term.isActive ? "Deactivate + Noindex" : "Activate"}</button></AdminActionForm>
              </div>
              {term.routeId ? <AdminActionForm action={changeTaxonomySlugAction} className="flex gap-2" successMessage="Taxonomy URL changed and 301 Redirect created."><input name="termId" type="hidden" value={term.id} /><label className="min-w-0 flex-1"><span className="sr-only">New taxonomy slug</span><input className={`${inputClass} w-full min-w-0`} name="slug" placeholder="new-taxonomy-slug" required /></label><button className="rounded-xl border border-white/20 px-3">Change URL + 301</button></AdminActionForm> : null}
            </article>
          ))}
        </section>
        <AdminActionForm action={createTaxonomyAction} className={`${panelClass} content-start`} successMessage="Taxonomy term created.">
          <h2 className="text-xl font-semibold">New taxonomy term</h2>
          <label className="grid gap-2">English name<input className={inputClass} name="name" required /></label>
          <label className="grid gap-2">Stable internal key<input className={inputClass} name="internalKey" required /></label>
          <label className="grid gap-2">Dimension<select className={inputClass} name="dimension" required>{dimensions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          <label className="grid gap-2">Optional Product Code prefix<input className={inputClass} maxLength={8} minLength={3} name="productCodePrefix" pattern="[A-Z]{3,8}" /></label>
          <label className="grid gap-2">Optional description<textarea className={inputClass} name="description" rows={4} /></label>
          <button className="rounded-xl bg-teal-400 px-4 py-3 font-semibold text-slate-950" type="submit">Create noindex term</button>
        </AdminActionForm>
      </div>
    </main>
  );
}
