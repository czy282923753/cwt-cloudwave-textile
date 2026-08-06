import { notFound } from "next/navigation";

import {
  assignProductCodeAction,
  applyProductRevisionAction,
  archiveProductAction,
  changeProductSlugAction,
  confirmRealProductAction,
  correctProductCodeAction,
  publishProductAction,
  rejectProductRevisionAction,
  rejectProductReviewAction,
  reviewProductFieldAction,
  setProductIndexAction,
  submitProductReviewAction,
  submitBlockDraftForReviewAction,
  updateProductFactsAction,
  updateProductSeoAction,
  updateProductStructureAction,
} from "@/admin/actions";
import { AdminActionForm } from "@/admin/components/admin-action-form";
import { BlockEditor } from "@/admin/components/block-editor";
import { AssetUploadForm } from "@/admin/components/asset-upload-form";
import { AdminPageHeader } from "@/admin/components/admin-table";
import { MediaPlacementEditor } from "@/admin/components/media-placement-editor";
import { ProductRelationSelectors } from "@/admin/components/product-relation-selectors";
import {
  getAdminProduct,
  getEditorialPickerOptions,
  listAdminApplications,
  listAdminAssets,
  listAdminTaxonomy,
} from "@/admin/data";
import { resolveCurrentUser } from "@/auth/current-user";
import { isEligiblePublicImagePickerAsset } from "@/admin/asset-picker";
import { blockDocumentSchema, parseBlockDocument } from "@/editorial/blocks";
import { canAccessEditorialResource } from "@/admin/preview-policy";

const inputClass = "min-w-0 w-full rounded-lg border border-white/10 bg-slate-950 p-3";
const panelClass = "grid min-w-0 gap-4 rounded-2xl border border-white/10 bg-slate-900 p-4 sm:p-6";

export default async function ProductEditorPage({
  params,
}: Readonly<{ params: Promise<{ id: string }> }>) {
  const currentUser = await resolveCurrentUser();
  if (!currentUser || !canAccessEditorialResource(currentUser.role, "product", "manage")) notFound();
  const { id } = await params;
  const [product, taxonomy, applications, allAssets, pickerOptions] = await Promise.all([
    getAdminProduct(id, currentUser.role),
    listAdminTaxonomy(),
    listAdminApplications(),
    listAdminAssets(),
    getEditorialPickerOptions(),
  ]);
  if (!product) notFound();
  const selectedTaxonomy = new Set(product.taxonomy.map((row) => row.taxonomyTermId));
  const primaryTaxonomy = product.taxonomy.find((row) => row.isPrimary)?.taxonomyTermId;
  const selectedApplications = new Set(product.applicationIds);
  const readyAssets = allAssets.filter((asset) =>
    isEligiblePublicImagePickerAsset(asset),
  );
  const reviewStatus = new Map(
    product.fieldReviews.map((review) => [review.fieldName, review.status]),
  );
  const narrativeDocument = parseBlockDocument(product.structuredBlocks, "product");
  const draftRevision = product.revisions.find((revision) => revision.status === "draft");
  const draftSnapshot = draftRevision?.kind;
  const draftDocument = typeof draftSnapshot === "object" && draftSnapshot !== null &&
    "kind" in draftSnapshot && draftSnapshot.kind === "editorial_blocks" &&
    "document" in draftSnapshot
    ? blockDocumentSchema.safeParse(draftSnapshot.document)
    : null;
  const editorDocument = draftDocument?.success ? draftDocument.data : narrativeDocument;
  const editorTitle = typeof draftSnapshot === "object" && draftSnapshot !== null &&
    "name" in draftSnapshot && typeof draftSnapshot.name === "string"
    ? draftSnapshot.name
    : product.name;
  const editorSummary = typeof draftSnapshot === "object" && draftSnapshot !== null &&
    "shortDescription" in draftSnapshot &&
    (typeof draftSnapshot.shortDescription === "string" || draftSnapshot.shortDescription === null)
    ? draftSnapshot.shortDescription
    : product.shortDescription;
  const draftVersion = typeof draftSnapshot === "object" && draftSnapshot !== null &&
    "draftVersion" in draftSnapshot && typeof draftSnapshot.draftVersion === "number"
    ? draftSnapshot.draftVersion
    : draftRevision ? 1 : null;
  const assetNames = new Map(allAssets.map((asset) => [asset.id, asset.fileName]));
  const mediaAssets = allAssets
    .filter((asset) => readyAssets.some((ready) => ready.id === asset.id) || product.assets.some((placement) => placement.assetId === asset.id))
    .map((asset) => ({
      id: asset.id,
      label: `${asset.fileName} · ${asset.status}/${asset.scanStatus}`,
      selectable: readyAssets.some((ready) => ready.id === asset.id),
    }));
  const eligibleAssetIds = new Set(readyAssets.map((asset) => asset.id));
  const blockMediaOptions = product.assets.filter((asset) =>
    asset.isVisible && eligibleAssetIds.has(asset.assetId),
  ).map((asset) => ({
    id: asset.assetId,
    value: asset.assetId,
    label: `${asset.role} · ${assetNames.get(asset.assetId) ?? asset.assetId}`,
    usages: [
      ...((asset.role !== "gallery" ? ["image"] : []) as Array<"image">),
      ...((asset.role !== "hero" ? ["gallery"] : []) as Array<"gallery">),
    ],
  }));

  return (
    <main className="mx-auto min-w-0 max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
      <AdminPageHeader
        description={`${product.path} · ${product.status} · ${product.indexStatus}`}
        title={product.name}
      />
      <div className="grid gap-8">
        {product.status === "published" ? (
          <p className="rounded-xl border border-amber-300/30 bg-amber-300/10 p-4 text-sm text-amber-100">
            This Product is live. Editorial, factual, structural, and SEO changes merge
            into one Draft Revision; public pages keep the approved version until explicit Review and Apply.
          </p>
        ) : null}

        <BlockEditor
          contentOptions={pickerOptions.contents}
          draftRevisionId={draftRevision?.id ?? null}
          draftRevisionVersion={draftVersion}
          editorDocumentVersion={product.editorDocumentVersion}
          entityId={product.id}
          entityType="product"
          initialDocument={editorDocument}
          initialSummary={editorSummary}
          initialTitle={editorTitle}
          internalLinkOptions={pickerOptions.links}
          mediaOptions={blockMediaOptions}
          previewHref={`/admin/preview/product/${product.id}/`}
          productOptions={pickerOptions.products}
        />
        {draftRevision ? <AdminActionForm action={submitBlockDraftForReviewAction} className={panelClass} successMessage="Product Block Draft submitted for review."><h2 className="text-xl font-semibold">Product Block Draft Revision</h2><p className="text-sm text-slate-300">Autosave remains Draft-only. Submit explicitly when this revision is ready for human review.</p><input name="entityType" type="hidden" value="product" /><input name="entityId" type="hidden" value={product.id} /><input name="revisionId" type="hidden" value={draftRevision.id} /><button className="rounded-xl border border-white/20 px-4 py-3" type="submit">Submit Block Draft for Review</button></AdminActionForm> : null}
        <AssetUploadForm associations={[{ value: `product:${product.id}`, label: product.name, group: "Product" }]} returnTo={`/admin/products/${product.id}/`} />

        <AdminActionForm action={updateProductFactsAction} className={`${panelClass} border-amber-300/20 sm:grid-cols-2`} successMessage="Product facts saved as provided data.">
          <div className="sm:col-span-2">
            <h2 className="text-xl font-semibold">Facts — never infer</h2>
            <p className="mt-2 text-sm text-amber-200">Unknown values stay blank. Saving a value marks it Provided, not Verified.</p>
          </div>
          <input name="productId" type="hidden" value={product.id} />
          <input name="expectedRevisionId" type="hidden" value={draftRevision?.id ?? ""} />
          <input name="expectedRevisionVersion" type="hidden" value={draftVersion ?? 0} />
          {[
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
          <label className="grid gap-2">MOQ Value<input className={inputClass} defaultValue={product.moqValue ?? ""} min="0.01" name="moqValue" step="0.01" type="number" /></label>
          <label className="grid gap-2">MOQ Unit<select className={inputClass} defaultValue={product.moqUnit ?? ""} name="moqUnit"><option value="">Unknown</option><option value="m">m</option><option value="kg">kg</option><option value="roll">roll</option><option value="yd">yd</option></select></label>
          <label className="grid gap-2">Custom Available<select className={inputClass} defaultValue={product.customAvailable} name="customAvailable"><option value="unknown">Unknown</option><option value="yes">Yes</option><option value="no">No</option></select></label>
          <label className="grid gap-2">Sample Available<select className={inputClass} defaultValue={product.sampleAvailable} name="sampleAvailable"><option value="unknown">Unknown</option><option value="yes">Yes</option><option value="no">No</option></select></label>
          <button className="rounded-xl border border-white/20 px-4 py-3 sm:col-span-2" type="submit">Save or propose factual inputs</button>
        </AdminActionForm>

        <section className={panelClass}>
          <h2 className="text-xl font-semibold">Product Code</h2>
          <p className="text-sm text-slate-300">Current: {product.productCode ?? "Unassigned"}</p>
          {!product.productCode ? <AdminActionForm action={assignProductCodeAction} successMessage="Product Code assigned from the managed Primary Category prefix."><input name="productId" type="hidden" value={product.id} /><button className="rounded-xl border border-white/20 px-4 py-3" type="submit">Generate from Primary Category</button></AdminActionForm> : null}
          {product.productCode && currentUser.role === "admin" ? <AdminActionForm action={correctProductCodeAction} className="grid gap-3 sm:grid-cols-2" successMessage="Product Code correction saved or proposed for the published Product."><input name="productId" type="hidden" value={product.id} /><input name="expectedRevisionId" type="hidden" value={draftRevision?.id ?? ""} /><input name="expectedRevisionVersion" type="hidden" value={draftVersion ?? 0} /><label className="grid gap-2">Corrected Product Code<input className={inputClass} name="newProductCode" pattern="[A-Za-z0-9]+(?:-[A-Za-z0-9]+)*" required /></label><label className="grid gap-2">Mandatory correction reason<input className={inputClass} name="reason" required /></label><button className="rounded-xl border border-amber-300/40 px-4 py-3 sm:col-span-2" type="submit">Correct with Audit</button></AdminActionForm> : null}
        </section>

        <section className={panelClass}>
          <h2 className="text-xl font-semibold">Fact review status</h2>
          <div className="grid gap-3 sm:grid-cols-3">
            {(["composition", "weightGsm", "widthCm", "moqValue", "moqUnit"] as const).map((fieldName) => (
              <AdminActionForm action={reviewProductFieldAction} className="grid gap-2 rounded-xl border border-white/10 p-4" key={fieldName} successMessage="Product field review recorded.">
                <input name="productId" type="hidden" value={product.id} />
                <input name="fieldName" type="hidden" value={fieldName} />
                <strong>{fieldName}</strong>
                <span className="text-sm text-slate-400">Current: {reviewStatus.get(fieldName) ?? "empty"}</span>
                <select aria-label={`${fieldName} verification status`} className={inputClass} name="verificationStatus"><option value="verified">Verified</option><option value="rejected">Rejected</option></select>
                <button className="rounded-lg border border-white/20 p-2" type="submit">Record review</button>
              </AdminActionForm>
            ))}
          </div>
        </section>

        <AdminActionForm action={updateProductStructureAction} className={panelClass} successMessage="Product relations and display structure saved.">
          <h2 className="text-xl font-semibold">Taxonomy, Applications, media, and structured content</h2>
          <input name="productId" type="hidden" value={product.id} />
          <input name="expectedRevisionId" type="hidden" value={draftRevision?.id ?? ""} />
          <input name="expectedRevisionVersion" type="hidden" value={draftVersion ?? 0} />
          <ProductRelationSelectors
            applications={applications}
            initialAdditional={[...selectedTaxonomy].filter((id) => id !== primaryTaxonomy)}
            initialApplications={[...selectedApplications]}
            initialPrimary={primaryTaxonomy ?? ""}
            taxonomy={taxonomy}
          />
          <MediaPlacementEditor assets={mediaAssets} entityType="product" initial={product.assets} />
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
          <input name="expectedRevisionId" type="hidden" value={draftRevision?.id ?? ""} />
          <input name="expectedRevisionVersion" type="hidden" value={draftVersion ?? 0} />
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
          <AdminActionForm action={rejectProductReviewAction} className="flex min-w-0 flex-wrap gap-3" successMessage="Product returned to Draft."><input name="productId" type="hidden" value={product.id} /><label className="min-w-0 basis-64 flex-1">Review rejection reason<input className={inputClass} name="reason" required /></label><button className="rounded-xl border border-red-300/40 px-4 py-3" type="submit">Reject to Draft</button></AdminActionForm>
          <AdminActionForm action={confirmRealProductAction} className="grid gap-3 sm:grid-cols-2" successMessage="Real Product basis confirmed.">
            <input name="productId" type="hidden" value={product.id} />
            <label className="grid gap-2">Real Product basis<select className={inputClass} defaultValue={product.realProductBasis ?? ""} name="basis" required><option value="">Select only with evidence…</option><option value="physical_product">Physical product</option><option value="physical_sample">Physical sample</option><option value="internal_product_code">Internal product code</option><option value="supply_specification">Supply specification</option><option value="explicit_specification_combination">Explicit specification combination</option></select></label>
            <label className="grid gap-2">Evidence note<input className={inputClass} defaultValue={product.realProductEvidenceNote ?? ""} name="evidenceNote" /></label>
            <button className="rounded-xl border border-amber-300/40 px-4 py-3 sm:col-span-2" type="submit">Confirm real Product basis</button>
          </AdminActionForm>
        </section>

        <section className={`${panelClass} sm:grid-cols-2`}>
          <AdminActionForm action={changeProductSlugAction} className="grid gap-3" successMessage="Product URL changed and 301 Redirect created.">
            <h2 className="text-lg font-semibold">Change slug with 301</h2><input name="productId" type="hidden" value={product.id} /><label className="grid gap-2">New URL slug<input className={inputClass} name="slug" required /></label><button className="rounded-xl border border-white/20 px-4 py-3" type="submit">Change URL transactionally</button>
          </AdminActionForm>
          <AdminActionForm action={setProductIndexAction} className="grid gap-3" successMessage="Product Index status updated.">
            <h2 className="text-lg font-semibold">Index decision</h2><input name="productId" type="hidden" value={product.id} /><label className="grid gap-2">Index status<select className={inputClass} defaultValue={product.indexStatus} name="indexStatus"><option value="noindex">Noindex</option><option value="index">Index — quality gates apply</option></select></label><button className="rounded-xl border border-white/20 px-4 py-3" type="submit">Apply index status</button>
          </AdminActionForm>
          <AdminActionForm action={archiveProductAction} className="grid gap-3 sm:col-span-2" successMessage="Product archived and forced to Noindex."><h2 className="text-lg font-semibold">Archive Product</h2><input name="productId" type="hidden" value={product.id} /><label className="grid gap-2">Archive reason<input className={inputClass} name="reason" required /></label><button className="rounded-xl border border-red-300/40 px-4 py-3" type="submit">Archive and force Noindex</button></AdminActionForm>
        </section>
      </div>
    </main>
  );
}
