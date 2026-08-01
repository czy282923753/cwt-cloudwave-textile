import { notFound } from "next/navigation";

import {
  applyContentRevisionAction,
  archiveContentAction,
  changeContentSlugAction,
  publishContentAction,
  rejectContentReviewAction,
  rejectContentRevisionAction,
  setContentIndexAction,
  submitContentReviewAction,
  updateContentAction,
} from "@/admin/actions";
import { AdminPageHeader } from "@/admin/components/admin-table";
import { getAdminContent, listAdminAssets, listAdminAuthors } from "@/admin/data";
import { requireCurrentUser } from "@/auth/current-user";

const inputClass = "rounded-lg border border-white/10 bg-slate-950 p-3";
const panelClass = "grid gap-4 rounded-2xl border border-white/10 bg-slate-900 p-6";

export default async function ContentEditorPage({ params }: Readonly<{ params: Promise<{ id: string }> }>) {
  await requireCurrentUser("content.read");
  const { id } = await params;
  const [content, authors, assets] = await Promise.all([getAdminContent(id), listAdminAuthors(), listAdminAssets()]);
  if (!content) notFound();
  const selectedAssets = new Set(content.assets.map((asset) => asset.assetId));
  const readyAssets = assets.filter((asset) => asset.status === "ready" && asset.scanStatus === "passed" && asset.access === "public" && asset.deletedAt === null);
  return <main className="mx-auto max-w-5xl px-6 py-10">
    <AdminPageHeader title={content.title} description={`${content.channel} · ${content.status} · ${content.indexStatus} · ${content.path}`} />
    <div className="grid gap-8">
      {content.status === "published" ? <p className="rounded-xl border border-amber-300/30 bg-amber-300/10 p-4 text-amber-100">Published Content edits create an In Review revision. The public article remains unchanged until approval.</p> : null}
      <form action={updateContentAction} className={panelClass}>
        <input name="contentId" type="hidden" value={content.id} />
        <h2 className="text-xl font-semibold">Editorial content and metadata</h2>
        <label className="grid gap-2">Type<select className={inputClass} defaultValue={content.type} name="type"><option value="article">Article</option><option value="pillar">Pillar</option><option value="comparison">Comparison</option><option value="how_to">How-to</option><option value="guide">Guide</option></select></label>
        <label className="grid gap-2">Author<select className={inputClass} defaultValue={content.authorId} name="authorId">{authors.filter((author) => author.isActive || author.id === content.authorId).map((author) => <option disabled={!author.isActive} key={author.id} value={author.id}>{author.displayName}{author.isActive ? "" : " · inactive"}</option>)}</select></label>
        <label className="grid gap-2">Title<input className={inputClass} defaultValue={content.title} name="title" required /></label>
        <label className="grid gap-2">Excerpt<textarea className={inputClass} defaultValue={content.excerpt ?? ""} name="excerpt" rows={3} /></label>
        <label className="grid gap-2">Body<textarea className={inputClass} defaultValue={content.body} name="body" required rows={18} /></label>
        <fieldset className="grid max-h-60 gap-2 overflow-auto rounded-xl border border-white/10 p-4"><legend>Ready public Assets — lowest order is Hero</legend>{readyAssets.map((asset) => { const current = content.assets.find((row) => row.assetId === asset.id); return <label className="grid grid-cols-[auto_1fr_5rem] items-center gap-2" key={asset.id}><input defaultChecked={selectedAssets.has(asset.id)} name="assetIds" type="checkbox" value={asset.id} /><span>{asset.fileName}</span><input aria-label={`${asset.fileName} sort order`} className={inputClass} defaultValue={current?.sortOrder ?? 100} min="0" name={`assetSort:${asset.id}`} type="number" /></label>; })}</fieldset>
        <label className="grid gap-2">SEO Title<input className={inputClass} defaultValue={content.seoTitle ?? ""} name="seoTitle" /></label>
        <label className="grid gap-2">Meta Description<textarea className={inputClass} defaultValue={content.metaDescription ?? ""} name="metaDescription" rows={3} /></label>
        <label className="grid gap-2">Focus Keyword<input className={inputClass} defaultValue={content.focusKeyword ?? ""} name="focusKeyword" /></label>
        <label className="grid gap-2">Change Summary<input className={inputClass} name="changeSummary" placeholder="Required context for a published revision" /></label>
        <button className="rounded-xl bg-teal-400 px-4 py-3 font-semibold text-slate-950" type="submit">Save or propose revision</button>
      </form>
      <section className={panelClass}>
        <h2 className="text-xl font-semibold">Review, publish, and index</h2>
        <div className="flex flex-wrap gap-3"><form action={submitContentReviewAction}><input name="contentId" type="hidden" value={content.id} /><button className="rounded-xl border border-white/20 px-4 py-3">Submit for review</button></form><form action={publishContentAction}><input name="contentId" type="hidden" value={content.id} /><button className="rounded-xl border border-white/20 px-4 py-3">Publish</button></form></div>
        <form action={rejectContentReviewAction} className="flex gap-3"><input name="contentId" type="hidden" value={content.id} /><input className={`${inputClass} flex-1`} name="reason" placeholder="Review rejection reason" required /><button className="rounded-xl border border-red-300/40 px-4">Reject to Draft</button></form>
        <form action={setContentIndexAction} className="flex gap-3"><input name="contentId" type="hidden" value={content.id} /><select className={`${inputClass} flex-1`} defaultValue={content.indexStatus} name="indexStatus"><option value="noindex">Noindex</option><option value="index">Index — quality gates apply</option></select><button className="rounded-xl border border-white/20 px-4">Apply</button></form>
      </section>
      <section className={panelClass}>
        <h2 className="text-xl font-semibold">Revisions</h2>
        {content.revisions.map((revision) => <article className="rounded-xl border border-white/10 p-4" key={revision.id}><p>v{revision.versionNumber} · {revision.status}</p><p className="text-sm text-slate-400">{revision.changeSummary}</p>{revision.status === "in_review" ? <div className="mt-3 flex gap-3"><form action={applyContentRevisionAction}><input name="contentId" type="hidden" value={content.id} /><input name="revisionId" type="hidden" value={revision.id} /><button className="rounded-lg bg-teal-400 px-3 py-2 text-slate-950">Approve &amp; apply</button></form><form action={rejectContentRevisionAction}><input name="contentId" type="hidden" value={content.id} /><input name="revisionId" type="hidden" value={revision.id} /><button className="rounded-lg border border-red-300/40 px-3 py-2">Reject</button></form></div> : null}</article>)}
      </section>
      <form action={archiveContentAction} className={panelClass}><h2 className="text-xl font-semibold">Archive Content</h2><input name="contentId" type="hidden" value={content.id} /><input className={inputClass} name="reason" placeholder="Archive reason" required /><button className="rounded-xl border border-red-300/40 px-4 py-3">Archive and force Noindex</button></form>
      <form action={changeContentSlugAction} className={panelClass}><h2 className="text-xl font-semibold">Change slug with 301</h2><input name="contentId" type="hidden" value={content.id} /><input className={inputClass} name="slug" placeholder="new-content-slug" required /><button className="rounded-xl border border-white/20 px-4 py-3">Change URL transactionally</button></form>
    </div>
  </main>;
}
