import { notFound } from "next/navigation";

import {
  applyFabricEntryRevisionAction,
  archiveFabricEntryAction,
  changeFabricEntrySlugAction,
  confirmFabricEntryValueAction,
  publishFabricEntryAction,
  rejectFabricEntryReviewAction,
  rejectFabricEntryRevisionAction,
  setFabricEntryIndexAction,
  submitFabricEntryReviewAction,
  updateFabricEntryAction,
} from "@/admin/actions";
import { AdminPageHeader } from "@/admin/components/admin-table";
import {
  getAdminFabricEntry,
  listAdminApplications,
  listAdminAssets,
  listAdminProducts,
} from "@/admin/data";
import { requireCurrentUser } from "@/auth/current-user";

const inputClass = "rounded-lg border border-white/10 bg-slate-950 p-3";
const panelClass = "grid gap-4 rounded-2xl border border-white/10 bg-slate-900 p-6";

export default async function FabricEntryEditorPage({ params }: Readonly<{ params: Promise<{ id: string }> }>) {
  await requireCurrentUser("products.read");
  const { id } = await params;
  const [entry, assets, products, applications] = await Promise.all([
    getAdminFabricEntry(id), listAdminAssets(), listAdminProducts(), listAdminApplications(),
  ]);
  if (!entry) notFound();
  const selectedAssets = new Set(entry.assets.map((row) => row.assetId));
  const selectedProducts = new Set(entry.productIds);
  const selectedApplications = new Set(entry.applicationIds);
  const readyAssets = assets.filter((asset) => asset.status === "ready" && asset.scanStatus === "passed" && asset.access === "public" && asset.deletedAt === null);
  return <main className="mx-auto max-w-6xl px-6 py-10"><AdminPageHeader title={entry.title} description={`${entry.status} · ${entry.indexStatus} · ${entry.path}`} /><div className="grid gap-8">
    {entry.status === "published" ? <p className="rounded-xl border border-amber-300/30 bg-amber-300/10 p-4 text-amber-100">Published Entry edits create an In Review revision. The public version remains unchanged until approval.</p> : null}
    <form action={updateFabricEntryAction} className={panelClass}><input name="entryId" type="hidden" value={entry.id} /><input name="routeId" type="hidden" value={entry.routeId} /><h2 className="text-xl font-semibold">Entry, relations, and SEO</h2><label className="grid gap-2">Title<input className={inputClass} defaultValue={entry.title} name="title" required /></label><label className="grid gap-2">Description<textarea className={inputClass} defaultValue={entry.description ?? ""} name="description" rows={6} /></label>
      <fieldset className="grid max-h-60 gap-2 overflow-auto rounded-xl border border-white/10 p-4"><legend>Ready public images — lowest order is Hero</legend>{readyAssets.map((asset) => { const current = entry.assets.find((row) => row.assetId === asset.id); return <label className="grid grid-cols-[auto_1fr_5rem] items-center gap-2" key={asset.id}><input defaultChecked={selectedAssets.has(asset.id)} name="assetIds" type="checkbox" value={asset.id} /><span>{asset.fileName}</span><input aria-label={`${asset.fileName} sort order`} className={inputClass} defaultValue={current?.sortOrder ?? 100} min="0" name={`assetSort:${asset.id}`} type="number" /></label>; })}</fieldset>
      <fieldset className="grid max-h-60 gap-2 overflow-auto rounded-xl border border-white/10 p-4"><legend>Related Products</legend>{products.map((product) => <label className="flex gap-2" key={product.id}><input defaultChecked={selectedProducts.has(product.id)} name="productIds" type="checkbox" value={product.id} />{product.name} · {product.status}</label>)}</fieldset>
      <fieldset className="grid max-h-60 gap-2 overflow-auto rounded-xl border border-white/10 p-4"><legend>Related Applications</legend>{applications.map((application) => <label className="flex gap-2" key={application.id}><input defaultChecked={selectedApplications.has(application.id)} name="applicationIds" type="checkbox" value={application.id} />{application.name} · {application.status}</label>)}</fieldset>
      <label className="grid gap-2">SEO Title<input className={inputClass} defaultValue={entry.seoTitle ?? ""} name="seoTitle" /></label><label className="grid gap-2">Meta Description<textarea className={inputClass} defaultValue={entry.metaDescription ?? ""} name="metaDescription" rows={3} /></label><label className="grid gap-2">Focus Keyword<input className={inputClass} defaultValue={entry.focusKeyword ?? ""} name="focusKeyword" /></label><button className="rounded-xl bg-teal-400 px-4 py-3 font-semibold text-slate-950">Save or propose revision</button>
    </form>
    <section className={panelClass}><h2 className="text-xl font-semibold">Review, publish, value, and index</h2><div className="flex flex-wrap gap-3"><form action={submitFabricEntryReviewAction}><input name="entryId" type="hidden" value={entry.id} /><button className="rounded-xl border border-white/20 px-4 py-3">Submit for review</button></form><form action={publishFabricEntryAction}><input name="entryId" type="hidden" value={entry.id} /><button className="rounded-xl border border-white/20 px-4 py-3">Publish</button></form><form action={confirmFabricEntryValueAction}><input name="entryId" type="hidden" value={entry.id} /><button className="rounded-xl border border-amber-300/40 px-4 py-3">Confirm independent value</button></form></div><form action={rejectFabricEntryReviewAction} className="flex gap-3"><input name="entryId" type="hidden" value={entry.id} /><input className={`${inputClass} flex-1`} name="reason" placeholder="Review rejection reason" required /><button className="rounded-xl border border-red-300/40 px-4">Reject to Draft</button></form><form action={setFabricEntryIndexAction} className="flex gap-3"><input name="entryId" type="hidden" value={entry.id} /><select className={`${inputClass} flex-1`} defaultValue={entry.indexStatus} name="indexStatus"><option value="noindex">Noindex</option><option value="index">Index — quality gates apply</option></select><button className="rounded-xl border border-white/20 px-4">Apply</button></form></section>
    <section className={panelClass}><h2 className="text-xl font-semibold">Revisions</h2>{entry.revisions.map((revision) => <article className="rounded-xl border border-white/10 p-4" key={revision.id}><p>v{revision.versionNumber} · {revision.status}</p><p className="text-sm text-slate-400">{revision.changeSummary}</p>{revision.status === "in_review" ? <div className="mt-3 flex gap-3"><form action={applyFabricEntryRevisionAction}><input name="entryId" type="hidden" value={entry.id} /><input name="revisionId" type="hidden" value={revision.id} /><button className="rounded-lg bg-teal-400 px-3 py-2 text-slate-950">Approve &amp; apply</button></form><form action={rejectFabricEntryRevisionAction}><input name="entryId" type="hidden" value={entry.id} /><input name="revisionId" type="hidden" value={revision.id} /><button className="rounded-lg border border-red-300/40 px-3 py-2">Reject</button></form></div> : null}</article>)}</section>
    <form action={archiveFabricEntryAction} className={panelClass}><h2 className="text-xl font-semibold">Archive Entry</h2><input name="entryId" type="hidden" value={entry.id} /><input className={inputClass} name="reason" placeholder="Archive reason" required /><button className="rounded-xl border border-red-300/40 px-4 py-3">Archive and force Noindex</button></form>
    <form action={changeFabricEntrySlugAction} className={panelClass}><h2 className="text-xl font-semibold">Change slug with 301</h2><input name="entryId" type="hidden" value={entry.id} /><input className={inputClass} name="slug" placeholder="new-fabric-entry-slug" required /><button className="rounded-xl border border-white/20 px-4 py-3">Change URL transactionally</button></form>
  </div></main>;
}
