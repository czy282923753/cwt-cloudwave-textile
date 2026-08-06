import { notFound } from "next/navigation";

import {
  applyApplicationRevisionAction,
  archiveApplicationAction,
  changeApplicationSlugAction,
  publishApplicationAction,
  rejectApplicationReviewAction,
  rejectApplicationRevisionAction,
  setApplicationIndexAction,
  submitApplicationReviewAction,
  updateApplicationAction,
} from "@/admin/actions";
import { AdminActionForm } from "@/admin/components/admin-action-form";
import { AdminPageHeader } from "@/admin/components/admin-table";
import { getAdminApplication, listAdminProducts } from "@/admin/data";
import { requireCurrentUser } from "@/auth/current-user";

const inputClass = "min-w-0 w-full rounded-lg border border-white/10 bg-slate-950 p-3";
const panelClass = "grid min-w-0 gap-4 rounded-2xl border border-white/10 bg-slate-900 p-4 sm:p-6";

export default async function ApplicationEditorPage({
  params,
}: Readonly<{ params: Promise<{ id: string }> }>) {
  await requireCurrentUser("products.read");
  const { id } = await params;
  const [application, products] = await Promise.all([
    getAdminApplication(id),
    listAdminProducts(),
  ]);
  if (!application) notFound();
  const selectedProducts = new Set(application.productIds);
  return (
    <main className="mx-auto min-w-0 max-w-5xl px-4 py-8 sm:px-6 sm:py-10">
      <AdminPageHeader
        description={`${application.status} · ${application.indexStatus ?? "noindex"} · ${application.path ?? "Internal Draft · no public route"}`}
        title={application.name}
      />
      <div className="grid gap-8">
        {application.status === "published" ? (
          <p className="rounded-xl border border-amber-300/30 bg-amber-300/10 p-4 text-amber-100">
            Published Application edits create an In Review revision. Public data is
            unchanged until approval.
          </p>
        ) : null}
        <AdminActionForm action={updateApplicationAction} className={panelClass} successMessage="Application changes saved.">
          <input name="applicationId" type="hidden" value={application.id} />
          <input name="routeId" type="hidden" value={application.routeId ?? ""} />
          <h2 className="text-xl font-semibold">Landing page, relations, and SEO</h2>
          <label className="grid gap-2">
            Name
            <input className={inputClass} defaultValue={application.name} name="name" required />
          </label>
          <label className="grid gap-2">
            Short description
            <textarea className={inputClass} defaultValue={application.shortDescription ?? ""} name="shortDescription" rows={3} />
          </label>
          <label className="grid gap-2">
            Body
            <textarea className={inputClass} defaultValue={application.body ?? ""} name="body" rows={10} />
          </label>
          <fieldset className="grid max-h-64 gap-2 overflow-auto rounded-xl border border-white/10 p-4">
            <legend>Related Products</legend>
            {products.map((product) => (
              <label className="flex gap-2" key={product.id}>
                <input defaultChecked={selectedProducts.has(product.id)} name="productIds" type="checkbox" value={product.id} />
                {product.name} · {product.status}
              </label>
            ))}
          </fieldset>
          {application.routeId ? <>
            <label className="grid gap-2">
              SEO Title
              <input className={inputClass} defaultValue={application.seoTitle ?? ""} name="seoTitle" />
            </label>
            <label className="grid gap-2">
              Meta Description
              <textarea className={inputClass} defaultValue={application.metaDescription ?? ""} name="metaDescription" rows={3} />
            </label>
            <label className="grid gap-2">
              Focus Keyword
              <input className={inputClass} defaultValue={application.focusKeyword ?? ""} name="focusKeyword" />
            </label>
          </> : <p className="text-sm text-slate-300">Public URL and SEO authority are created only after formal review and Publish approval.</p>}
          <button className="rounded-xl bg-teal-400 px-4 py-3 font-semibold text-slate-950" type="submit">
            Save or propose revision
          </button>
        </AdminActionForm>
        <section className={panelClass}>
          <h2 className="text-xl font-semibold">Review, publish, and index</h2>
          <div className="flex flex-wrap gap-3">
            <AdminActionForm action={submitApplicationReviewAction} successMessage="Application submitted for review."><input name="applicationId" type="hidden" value={application.id} /><button className="rounded-xl border border-white/20 px-4 py-3">Submit for review</button></AdminActionForm>
            <AdminActionForm action={publishApplicationAction} successMessage="Application published; Index remains independently controlled."><input name="applicationId" type="hidden" value={application.id} /><button className="rounded-xl border border-white/20 px-4 py-3">Publish</button></AdminActionForm>
          </div>
          <AdminActionForm action={rejectApplicationReviewAction} className="flex min-w-0 flex-wrap gap-3" successMessage="Application returned to Draft."><input name="applicationId" type="hidden" value={application.id} /><label className="min-w-0 basis-64 flex-1">Review rejection reason<input className={inputClass} name="reason" required /></label><button className="rounded-xl border border-red-300/40 px-4">Reject to Draft</button></AdminActionForm>
          {application.routeId ? <AdminActionForm action={setApplicationIndexAction} className="flex gap-3" successMessage="Application Index status updated."><input name="applicationId" type="hidden" value={application.id} /><label className="sr-only" htmlFor="application-index-status">Index status</label><select className={`${inputClass} flex-1`} defaultValue={application.indexStatus ?? "noindex"} id="application-index-status" name="indexStatus"><option value="noindex">Noindex</option><option value="index">Index — quality gates apply</option></select><button className="rounded-xl border border-white/20 px-4">Apply</button></AdminActionForm> : null}
        </section>
        <section className={panelClass}>
          <h2 className="text-xl font-semibold">Revisions</h2>
          {application.revisions.map((revision) => (
            <article className="rounded-xl border border-white/10 p-4" key={revision.id}>
              <p>v{revision.versionNumber} · {revision.status}</p>
              <p className="text-sm text-slate-400">{revision.changeSummary}</p>
              {revision.status === "in_review" ? <div className="mt-3 flex gap-3"><AdminActionForm action={applyApplicationRevisionAction} successMessage="Application revision applied."><input name="applicationId" type="hidden" value={application.id} /><input name="revisionId" type="hidden" value={revision.id} /><button className="rounded-lg bg-teal-400 px-3 py-2 text-slate-950">Approve &amp; apply</button></AdminActionForm><AdminActionForm action={rejectApplicationRevisionAction} successMessage="Application revision rejected."><input name="applicationId" type="hidden" value={application.id} /><input name="revisionId" type="hidden" value={revision.id} /><button className="rounded-lg border border-red-300/40 px-3 py-2">Reject</button></AdminActionForm></div> : null}
            </article>
          ))}
        </section>
        <AdminActionForm action={archiveApplicationAction} className={panelClass} successMessage="Application archived and forced to Noindex."><h2 className="text-xl font-semibold">Archive Application</h2><input name="applicationId" type="hidden" value={application.id} /><label className="grid gap-2">Archive reason<input className={inputClass} name="reason" required /></label><button className="rounded-xl border border-red-300/40 px-4 py-3">Archive and force Noindex</button></AdminActionForm>
        {application.routeId ? <AdminActionForm action={changeApplicationSlugAction} className={panelClass} successMessage="Application URL changed and 301 Redirect created."><h2 className="text-xl font-semibold">Change slug with 301</h2><input name="applicationId" type="hidden" value={application.id} /><label className="grid gap-2">New Application slug<input className={inputClass} name="slug" placeholder="new-application-slug" required /></label><button className="rounded-xl border border-white/20 px-4 py-3">Change URL transactionally</button></AdminActionForm> : null}
      </div>
    </main>
  );
}
