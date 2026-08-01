import { notFound } from "next/navigation";

import {
  changeProductSlugAction,
  confirmRealProductAction,
  publishProductAction,
  setProductIndexAction,
  submitProductReviewAction,
  updateProductEditorialAction,
  updateProductFactsAction,
  updateProductSeoAction,
} from "@/admin/actions";
import { AdminPageHeader } from "@/admin/components/admin-table";
import { getAdminProduct } from "@/admin/data";
import { requireCurrentUser } from "@/auth/current-user";

const inputClass = "rounded-lg border border-white/10 bg-slate-950 p-3";

export default async function ProductEditorPage({
  params,
}: Readonly<{ params: Promise<{ id: string }> }>) {
  await requireCurrentUser("products.read");
  const { id } = await params;
  const product = await getAdminProduct(id);
  if (!product) notFound();
  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <AdminPageHeader
        description={`${product.path} · ${product.status} · ${product.indexStatus}`}
        title={product.name}
      />
      <div className="grid gap-8">
        <form action={updateProductEditorialAction} className="grid gap-4 rounded-2xl border border-white/10 bg-slate-900 p-6">
          <h2 className="text-xl font-semibold">Editorial copy</h2>
          <input name="productId" type="hidden" value={product.id} />
          <label className="grid gap-2">Product Name<input className={inputClass} defaultValue={product.name} name="name" required /></label>
          <label className="grid gap-2">Short Description<textarea className={inputClass} defaultValue={product.shortDescription ?? ""} name="shortDescription" rows={3} /></label>
          <label className="grid gap-2">Full Description<textarea className={inputClass} defaultValue={product.fullDescription ?? ""} name="fullDescription" rows={8} /></label>
          <button className="rounded-xl bg-teal-400 px-4 py-3 font-semibold text-slate-950" type="submit">Save editorial copy</button>
        </form>

        <form action={updateProductFactsAction} className="grid gap-4 rounded-2xl border border-amber-300/20 bg-slate-900 p-6 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <h2 className="text-xl font-semibold">Facts — never infer</h2>
            <p className="mt-2 text-sm text-amber-200">Unknown values stay blank. Saving a value marks it Provided, not Verified.</p>
          </div>
          <input name="productId" type="hidden" value={product.id} />
          {[
            ["Product Code", "productCode", product.productCode],
            ["Supplier Type", "supplierType", product.supplierType],
            ["Composition", "composition", product.composition],
            ["Weight (GSM)", "weightGsm", product.weightGsm],
            ["Width (cm)", "widthCm", product.widthCm],
            ["Fabric Style", "fabricStyle", product.fabricStyle],
            ["Color Options", "colorOptions", product.colorOptions],
            ["MOQ Note — hidden by default", "moqNote", product.moqNote],
          ].map(([label, name, value]) => (
            <label className="grid gap-2" key={String(name)}>{label}<input className={inputClass} defaultValue={String(value ?? "")} name={String(name)} /></label>
          ))}
          <label className="grid gap-2">Custom Available<select className={inputClass} defaultValue={product.customAvailable} name="customAvailable"><option value="unknown">Unknown</option><option value="yes">Yes</option><option value="no">No</option></select></label>
          <label className="grid gap-2">Sample Available<select className={inputClass} defaultValue={product.sampleAvailable} name="sampleAvailable"><option value="unknown">Unknown</option><option value="yes">Yes</option><option value="no">No</option></select></label>
          <button className="rounded-xl border border-white/20 px-4 py-3 sm:col-span-2" type="submit">Save factual inputs</button>
        </form>

        <section className="grid gap-4 rounded-2xl border border-white/10 bg-slate-900 p-6">
          <h2 className="text-xl font-semibold">Human review and publication</h2>
          <div className="flex flex-wrap gap-3">
            <form action={submitProductReviewAction}><input name="productId" type="hidden" value={product.id} /><button className="rounded-xl border border-white/20 px-4 py-3" type="submit">Submit for review</button></form>
            <form action={publishProductAction}><input name="productId" type="hidden" value={product.id} /><button className="rounded-xl border border-white/20 px-4 py-3" type="submit">Publish (authorized reviewer)</button></form>
          </div>
          <form action={confirmRealProductAction} className="grid gap-3 sm:grid-cols-2">
            <input name="productId" type="hidden" value={product.id} />
            <label className="grid gap-2">Real Product basis<select className={inputClass} defaultValue={product.realProductBasis ?? ""} name="basis" required><option value="">Select only with evidence…</option><option value="physical_product">Physical product</option><option value="physical_sample">Physical sample</option><option value="internal_product_code">Internal product code</option><option value="supply_specification">Supply specification</option><option value="explicit_specification_combination">Explicit specification combination</option></select></label>
            <label className="grid gap-2">Evidence note<input className={inputClass} defaultValue={product.realProductEvidenceNote ?? ""} name="evidenceNote" /></label>
            <button className="rounded-xl border border-amber-300/40 px-4 py-3 sm:col-span-2" type="submit">Confirm real Product basis</button>
          </form>
        </section>

        <form action={updateProductSeoAction} className="grid gap-4 rounded-2xl border border-white/10 bg-slate-900 p-6">
          <h2 className="text-xl font-semibold">SEO metadata</h2>
          <input name="productId" type="hidden" value={product.id} /><input name="routeId" type="hidden" value={product.routeId} />
          <label className="grid gap-2">SEO Title<input className={inputClass} defaultValue={product.seoTitle ?? ""} name="seoTitle" /></label>
          <label className="grid gap-2">Meta Description<textarea className={inputClass} defaultValue={product.metaDescription ?? ""} name="metaDescription" rows={3} /></label>
          <label className="grid gap-2">Focus Keyword<input className={inputClass} defaultValue={product.focusKeyword ?? ""} name="focusKeyword" /></label>
          <button className="rounded-xl border border-white/20 px-4 py-3" type="submit">Save metadata</button>
        </form>

        <div className="grid gap-4 rounded-2xl border border-white/10 bg-slate-900 p-6 sm:grid-cols-2">
          <form action={changeProductSlugAction} className="grid gap-3">
            <h2 className="text-lg font-semibold">Change slug with 301</h2><input name="productId" type="hidden" value={product.id} /><input className={inputClass} name="slug" required /><button className="rounded-xl border border-white/20 px-4 py-3" type="submit">Change URL transactionally</button>
          </form>
          <form action={setProductIndexAction} className="grid gap-3">
            <h2 className="text-lg font-semibold">Index decision</h2><input name="productId" type="hidden" value={product.id} /><select className={inputClass} defaultValue={product.indexStatus} name="indexStatus"><option value="noindex">Noindex</option><option value="index">Index — quality gates apply</option></select><button className="rounded-xl border border-white/20 px-4 py-3" type="submit">Apply index status</button>
          </form>
        </div>
      </div>
    </main>
  );
}
