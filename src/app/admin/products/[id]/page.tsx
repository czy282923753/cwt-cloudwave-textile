import { notFound } from "next/navigation";

import {
  applyProductRevisionAction,
  archiveProductAction,
  changeProductSlugAction,
  confirmRealProductAction,
  publishProductAction,
  rejectProductRevisionAction,
  rejectProductReviewAction,
  reviewProductFieldAction,
  setProductIndexAction,
  submitProductReviewAction,
  updateProductEditorialAction,
  updateProductFactsAction,
  updateProductSeoAction,
  updateProductStructureAction,
} from "@/admin/actions";
import { AdminActionForm } from "@/admin/components/admin-action-form";
import { AdminPageHeader } from "@/admin/components/admin-table";
import {
  getAdminProduct,
  listAdminApplications,
  listAdminAssets,
  listAdminTaxonomy,
} from "@/admin/data";
import { requireCurrentUser } from "@/auth/current-user";

const inputClass = "rounded-lg border border-white/10 bg-slate-950 p-3";
const panelClass = "grid gap-4 rounded-2xl border border-white/10 bg-slate-900 p-6";

export default async function ProductEditorPage({
  params,
}: Readonly<{ params: Promise<{ id: string }> }>) {
  await requireCurrentUser("products.read");
  const { id } = await params;
  const [product, taxonomy, applications, allAssets] = await Promise.all([
    getAdminProduct(id),
    listAdminTaxonomy(),
    listAdminApplications(),
    listAdminAssets(),
  ]);
  if (!product) notFound();
  const selectedTaxonomy = new Set(product.taxonomy.map((row) => row.taxonomyTermId));
  const primaryTaxonomy = product.taxonomy.find((row) => row.isPrimary)?.taxonomyTermId;
  const selectedApplications = new Set(product.applicationIds);
  const selectedAssets = new Set(product.assets.map((row) => row.assetId));
  const heroAsset = product.assets.find((row) => row.role === "hero")?.assetId;
  const readyAssets = allAssets.filter(
    (asset) =>
      asset.status === "ready" &&
      asset.scanStatus === "passed" &&
      asset.access === "public" &&
      asset.deletedAt === null,
  );
  const reviewStatus = new Map(
    product.fieldReviews.map((review) => [review.fieldName, review.status]),
  );

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <AdminPageHeader
        description={`${product.path} · ${product.status} · ${product.indexStatus}`}
        title={product.name}
      />
      <div className="grid gap-8">
        {product.status === "published" ? (
          <p className="rounded-xl border border-amber-300/30 bg-amber-300/10 p-4 text-sm text-amber-100">
            This Product is live. Editorial, factual, structural, and SEO changes create
            an In Review revision; public pages keep the approved version until approval.
          </p>
        ) : null}

        <AdminActionForm action={updateProductEditorialAction} className={panelClass} successMessage="Product copy saved.">
          <h2 className="text-xl font-semibold">Editorial copy</h2>
          <input name="productId" type="hidden" value={product.id} />
          <label className="grid gap-2">Product Name<input className={inputClass} defaultValue={product.name} name="name" required /></label>
          <label className="grid gap-2">Short Description<textarea className={inputClass} defaultValue={product.shortDescription ?? ""} name="shortDescription" rows={3} /></label>
          <label className="grid gap-2">Full Description<textarea className={inputClass} defaultValue={product.fullDescription ?? ""} name="fullDescription" rows={8} /></label>
          <button className="rounded-xl bg-teal-400 px-4 py-3 font-semibold text-slate-950" type="submit">Save or propose editorial copy</button>
        </AdminActionForm>

        <AdminActionForm action={updateProductFactsAction} className={`${panelClass} border-amber-300/20 sm:grid-cols-2`} successMessage="Product facts saved as provided data.">
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
          <button className="rounded-xl border border-white/20 px-4 py-3 sm:col-span-2" type="submit">Save or propose factual inputs</button>
        </AdminActionForm>

        <section className={panelClass}>
          <h2 className="text-xl font-semibold">Fact review status</h2>
          <div className="grid gap-3 sm:grid-cols-3">
            {(["composition", "weightGsm", "widthCm"] as const).map((fieldName) => (
              <AdminActionForm action={reviewProductFieldAction} className="grid gap-2 rounded-xl border border-white/10 p-4" key={fieldName} successMessage="Product field review recorded.">
                <input name="productId" type="hidden" value={product.id} />
                <input name="fieldName" type="hidden" value={fieldName} />
                <strong>{fieldName}</strong>
                <span className="text-sm text-slate-400">Current: {reviewStatus.get(fieldName) ?? "empty"}</span>
                <select className={inputClass} name="verificationStatus"><option value="verified">Verified</option><option value="rejected">Rejected</option></select>
                <button className="rounded-lg border border-white/20 p-2" type="submit">Record review</button>
              </AdminActionForm>
            ))}
          </div>
        </section>

        <AdminActionForm action={updateProductStructureAction} className={panelClass} successMessage="Product relations and display structure saved.">
          <h2 className="text-xl font-semibold">Taxonomy, Applications, media, and structured content</h2>
          <input name="productId" type="hidden" value={product.id} />
          <label className="grid gap-2">Primary Category<select className={inputClass} defaultValue={primaryTaxonomy} name="primaryTaxonomyTermId" required>{taxonomy.map((term) => <option key={term.id} value={term.id}>{term.name} · {term.dimension}</option>)}</select></label>
          <fieldset className="grid max-h-56 gap-2 overflow-auto rounded-xl border border-white/10 p-4">
            <legend>Additional Categories</legend>
            {taxonomy.map((term) => <label className="flex gap-2" key={term.id}><input defaultChecked={selectedTaxonomy.has(term.id) && term.id !== primaryTaxonomy} name="taxonomyTermIds" type="checkbox" value={term.id} />{term.name} · {term.dimension}</label>)}
          </fieldset>
          <fieldset className="grid max-h-56 gap-2 overflow-auto rounded-xl border border-white/10 p-4">
            <legend>Applications</legend>
            {applications.map((application) => <label className="flex gap-2" key={application.id}><input defaultChecked={selectedApplications.has(application.id)} name="applicationIds" type="checkbox" value={application.id} />{application.name} · {application.status}</label>)}
          </fieldset>
          <fieldset className="grid max-h-64 gap-2 overflow-auto rounded-xl border border-white/10 p-4">
            <legend>Product images</legend>
            {readyAssets.map((asset) => { const current = product.assets.find((row) => row.assetId === asset.id); return <label className="grid grid-cols-[auto_1fr_5rem] items-center gap-2" key={asset.id}><input defaultChecked={selectedAssets.has(asset.id)} name="assetIds" type="checkbox" value={asset.id} /><span>{asset.fileName}</span><input aria-label={`${asset.fileName} sort order`} className={inputClass} defaultValue={current?.sortOrder ?? 100} min="0" name={`assetSort:${asset.id}`} type="number" /></label>; })}
          </fieldset>
          <label className="grid gap-2">Hero Image<select className={inputClass} defaultValue={heroAsset} name="heroAssetId" required>{readyAssets.map((asset) => <option key={asset.id} value={asset.id}>{asset.fileName}</option>)}</select></label>
          <label className="grid gap-2">Tags — comma or line separated<textarea className={inputClass} defaultValue={product.tags.join(", ")} name="tagNames" rows={3} /></label>
          <label className="grid gap-2">Features — one per line<textarea className={inputClass} defaultValue={product.features.join("\n")} name="features" rows={5} /></label>
          <label className="grid gap-2">FAQs — one Question | Answer per line<textarea className={inputClass} defaultValue={product.faqs.map((faq) => `${faq.question} | ${faq.answer}`).join("\n")} name="faqs" rows={6} /></label>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              ["Color options display", "colorOptionsDisplay", product.colorOptionsDisplay],
              ["Custom display", "customAvailableDisplay", product.customAvailableDisplay],
              ["Sample display", "sampleAvailableDisplay", product.sampleAvailableDisplay],
              ["MOQ display", "moqNoteDisplay", product.moqNoteDisplay],
            ].map(([label, name, value]) => <label className="grid gap-2" key={String(name)}>{label}<select className={inputClass} defaultValue={String(value)} name={String(name)}><option value="inherit">Inherit</option><option value="show">Show</option><option value="hide">Hide</option></select></label>)}
          </div>
          <button className="rounded-xl border border-white/20 px-4 py-3" type="submit">Save or propose structure</button>
        </AdminActionForm>

        <AdminActionForm action={updateProductSeoAction} className={panelClass} successMessage="Product SEO draft saved.">
          <h2 className="text-xl font-semibold">SEO metadata</h2>
          <input name="productId" type="hidden" value={product.id} />
          <label className="grid gap-2">SEO Title<input className={inputClass} defaultValue={product.seoTitle ?? ""} name="seoTitle" /></label>
          <label className="grid gap-2">Meta Description<textarea className={inputClass} defaultValue={product.metaDescription ?? ""} name="metaDescription" rows={3} /></label>
          <label className="grid gap-2">Focus Keyword<input className={inputClass} defaultValue={product.focusKeyword ?? ""} name="focusKeyword" /></label>
          <button className="rounded-xl border border-white/20 px-4 py-3" type="submit">Save or propose metadata</button>
        </AdminActionForm>

        {product.revisions.length ? (
          <section className={panelClass}>
            <h2 className="text-xl font-semibold">Editorial revisions</h2>
            {product.revisions.map((revision) => {
              const kind = typeof revision.kind === "object" && revision.kind && "kind" in revision.kind ? String(revision.kind.kind) : "unknown";
              return <article className="rounded-xl border border-white/10 p-4" key={revision.id}><p>v{revision.versionNumber} · {kind} · {revision.status}</p><p className="text-sm text-slate-400">{revision.changeSummary}</p>{revision.status === "in_review" ? <div className="mt-3 flex gap-3"><AdminActionForm action={applyProductRevisionAction} successMessage="Product revision applied."><input name="productId" type="hidden" value={product.id} /><input name="revisionId" type="hidden" value={revision.id} /><button className="rounded-lg bg-teal-400 px-3 py-2 text-slate-950" type="submit">Approve &amp; apply</button></AdminActionForm><AdminActionForm action={rejectProductRevisionAction} successMessage="Product revision rejected."><input name="productId" type="hidden" value={product.id} /><input name="revisionId" type="hidden" value={revision.id} /><button className="rounded-lg border border-red-300/40 px-3 py-2" type="submit">Reject</button></AdminActionForm></div> : null}</article>;
            })}
          </section>
        ) : null}

        <section className={panelClass}>
          <h2 className="text-xl font-semibold">Human review and publication</h2>
          <div className="flex flex-wrap gap-3">
            <AdminActionForm action={submitProductReviewAction} successMessage="Product submitted for review."><input name="productId" type="hidden" value={product.id} /><button className="rounded-xl border border-white/20 px-4 py-3" type="submit">Submit for review</button></AdminActionForm>
            <AdminActionForm action={publishProductAction} successMessage="Product published; Index remains independently controlled."><input name="productId" type="hidden" value={product.id} /><button className="rounded-xl border border-white/20 px-4 py-3" type="submit">Publish</button></AdminActionForm>
          </div>
          <AdminActionForm action={rejectProductReviewAction} className="flex flex-wrap gap-3" successMessage="Product returned to Draft."><input name="productId" type="hidden" value={product.id} /><input className={`${inputClass} flex-1`} name="reason" placeholder="Review rejection reason" required /><button className="rounded-xl border border-red-300/40 px-4 py-3" type="submit">Reject to Draft</button></AdminActionForm>
          <AdminActionForm action={confirmRealProductAction} className="grid gap-3 sm:grid-cols-2" successMessage="Real Product basis confirmed.">
            <input name="productId" type="hidden" value={product.id} />
            <label className="grid gap-2">Real Product basis<select className={inputClass} defaultValue={product.realProductBasis ?? ""} name="basis" required><option value="">Select only with evidence…</option><option value="physical_product">Physical product</option><option value="physical_sample">Physical sample</option><option value="internal_product_code">Internal product code</option><option value="supply_specification">Supply specification</option><option value="explicit_specification_combination">Explicit specification combination</option></select></label>
            <label className="grid gap-2">Evidence note<input className={inputClass} defaultValue={product.realProductEvidenceNote ?? ""} name="evidenceNote" /></label>
            <button className="rounded-xl border border-amber-300/40 px-4 py-3 sm:col-span-2" type="submit">Confirm real Product basis</button>
          </AdminActionForm>
        </section>

        <section className={`${panelClass} sm:grid-cols-2`}>
          <AdminActionForm action={changeProductSlugAction} className="grid gap-3" successMessage="Product URL changed and 301 Redirect created.">
            <h2 className="text-lg font-semibold">Change slug with 301</h2><input name="productId" type="hidden" value={product.id} /><input className={inputClass} name="slug" required /><button className="rounded-xl border border-white/20 px-4 py-3" type="submit">Change URL transactionally</button>
          </AdminActionForm>
          <AdminActionForm action={setProductIndexAction} className="grid gap-3" successMessage="Product Index status updated.">
            <h2 className="text-lg font-semibold">Index decision</h2><input name="productId" type="hidden" value={product.id} /><select className={inputClass} defaultValue={product.indexStatus} name="indexStatus"><option value="noindex">Noindex</option><option value="index">Index — quality gates apply</option></select><button className="rounded-xl border border-white/20 px-4 py-3" type="submit">Apply index status</button>
          </AdminActionForm>
          <AdminActionForm action={archiveProductAction} className="grid gap-3 sm:col-span-2" successMessage="Product archived and forced to Noindex."><h2 className="text-lg font-semibold">Archive Product</h2><input name="productId" type="hidden" value={product.id} /><input className={inputClass} name="reason" placeholder="Archive reason" required /><button className="rounded-xl border border-red-300/40 px-4 py-3" type="submit">Archive and force Noindex</button></AdminActionForm>
        </section>
      </div>
    </main>
  );
}
