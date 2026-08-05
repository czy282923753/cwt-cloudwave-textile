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
import { AdminActionForm } from "@/admin/components/admin-action-form";
import { AdminPageHeader } from "@/admin/components/admin-table";
import { getAdminContent, listAdminAssets, listAdminAuthors } from "@/admin/data";
import { requireCurrentUser } from "@/auth/current-user";
import { blockDocumentPlainText, parseBlockDocument } from "@/editorial/blocks";

const inputClass = "rounded-lg border border-white/10 bg-slate-950 p-3";
const panelClass = "grid gap-4 rounded-2xl border border-white/10 bg-slate-900 p-6";

export default async function ContentEditorPage({ params }: Readonly<{ params: Promise<{ id: string }> }>) {
  await requireCurrentUser("content.read");
  const { id } = await params;
  const [content, authors, assets] = await Promise.all([getAdminContent(id), listAdminAuthors(), listAdminAssets()]);
  if (!content) notFound();
  const selectedAssets = new Set(content.assets.map((asset) => asset.assetId));
  const coverAssetId = content.assets.find((asset) => asset.role === "cover")?.assetId;
  const document = parseBlockDocument(content.structuredBlocks, "content");
  const narrativeText = blockDocumentPlainText(document);
  const readyAssets = assets.filter((asset) => asset.status === "ready" && asset.scanStatus === "passed" && asset.access === "public" && asset.deletedAt === null);
  return <main className="mx-auto max-w-5xl px-6 py-10">
    <AdminPageHeader title={content.title} description={`${content.channel} · ${content.status} · ${content.indexStatus} · ${content.path}`} />
    <div className="grid gap-8">
      {content.status === "published" ? <p className="rounded-xl border border-amber-300/30 bg-amber-300/10 p-4 text-amber-100">Published Content edits create an In Review revision. The public article remains unchanged until approval.</p> : null}
      <AdminActionForm action={updateContentAction} className={panelClass} successMessage="Content changes saved.">
        <input name="contentId" type="hidden" value={content.id} />
        <input name="expectedEditorDocumentVersion" type="hidden" value={content.editorDocumentVersion} />
        <h2 className="text-xl font-semibold">Editorial content and metadata</h2>
        <label className="grid gap-2">Type<select className={inputClass} defaultValue={content.type} name="type"><option value="article">Article</option><option value="pillar">Pillar</option><option value="comparison">Comparison</option><option value="how_to">How-to</option><option value="guide">Guide</option></select></label>
        <label className="grid gap-2">Author<select className={inputClass} defaultValue={content.authorId} name="authorId">{authors.filter((author) => author.isActive || author.id === content.authorId).map((author) => <option disabled={!author.isActive} key={author.id} value={author.id}>{author.displayName}{author.isActive ? "" : " · inactive"}</option>)}</select></label>
        <label className="grid gap-2">Title<input className={inputClass} defaultValue={content.title} name="title" required /></label>
        <label className="grid gap-2">Excerpt<textarea className={inputClass} defaultValue={content.excerpt ?? ""} name="excerpt" rows={3} /></label>
        <label className="grid gap-2">Narrative Paragraph<textarea className={inputClass} defaultValue={narrativeText} name="body" required rows={18} /></label>
        <p className="text-xs text-slate-400">This Stage 1 writer saves one validated Paragraph Block. Ordering, Undo/Redo, autosave, and the full Block Editor arrive only in Stage 2.</p>
        <fieldset className="grid max-h-[32rem] gap-3 overflow-auto rounded-xl border border-white/10 p-4">
          <legend>Ready public Content media</legend>
          {readyAssets.map((asset) => {
            const current = content.assets.find((row) => row.assetId === asset.id);
            return (
              <div className="grid gap-3 rounded-xl border border-white/10 p-3 sm:grid-cols-[auto_1fr_8rem]" key={asset.id}>
                <input aria-label={`Select ${asset.fileName}`} defaultChecked={selectedAssets.has(asset.id)} name="assetIds" type="checkbox" value={asset.id} />
                <span>{asset.fileName}</span>
                <input aria-label={`${asset.fileName} sort order`} className={inputClass} defaultValue={current?.sortOrder ?? 100} min="0" name={`assetSort:${asset.id}`} type="number" />
                <select aria-label={`${asset.fileName} role`} className={inputClass} defaultValue={current?.role === "cover" ? "inline" : current?.role ?? "inline"} name={`assetRole:${asset.id}`}>
                  <option value="inline">Inline</option><option value="gallery">Gallery</option><option value="detail">Detail</option>
                </select>
                <label className="flex items-center gap-2"><input defaultChecked={current?.isVisible ?? true} name={`assetVisible:${asset.id}`} type="checkbox" value="true" />Visible</label>
                <input aria-label={`${asset.fileName} Block key`} className={inputClass} defaultValue={current?.blockKey ?? ""} name={`assetBlockKey:${asset.id}`} pattern="[A-Za-z0-9_-]+" placeholder="Block key, if referenced" />
                <input aria-label={`${asset.fileName} placement alt text`} className={inputClass} defaultValue={current?.altText ?? ""} name={`assetAlt:${asset.id}`} placeholder="Placement Alt Text" />
                <input aria-label={`${asset.fileName} caption`} className={`${inputClass} sm:col-span-2`} defaultValue={current?.caption ?? ""} name={`assetCaption:${asset.id}`} placeholder="Optional Caption" />
              </div>
            );
          })}
        </fieldset>
        <label className="grid gap-2">Cover Image<select className={inputClass} defaultValue={coverAssetId ?? ""} name="coverAssetId"><option value="">No cover</option>{readyAssets.map((asset) => <option key={asset.id} value={asset.id}>{asset.fileName}</option>)}</select></label>
        <label className="grid gap-2">SEO Title<input className={inputClass} defaultValue={content.seoTitle ?? ""} name="seoTitle" /></label>
        <label className="grid gap-2">Meta Description<textarea className={inputClass} defaultValue={content.metaDescription ?? ""} name="metaDescription" rows={3} /></label>
        <label className="grid gap-2">Focus Keyword<input className={inputClass} defaultValue={content.focusKeyword ?? ""} name="focusKeyword" /></label>
        <label className="grid gap-2">Change Summary<input className={inputClass} name="changeSummary" placeholder="Required context for a published revision" /></label>
        <button className="rounded-xl bg-teal-400 px-4 py-3 font-semibold text-slate-950" type="submit">Save or propose revision</button>
      </AdminActionForm>
      <section className={panelClass}>
        <h2 className="text-xl font-semibold">Review, publish, and index</h2>
        <div className="flex flex-wrap gap-3"><AdminActionForm action={submitContentReviewAction} successMessage="Content submitted for review."><input name="contentId" type="hidden" value={content.id} /><button className="rounded-xl border border-white/20 px-4 py-3">Submit for review</button></AdminActionForm><AdminActionForm action={publishContentAction} successMessage="Content published; Index remains independently controlled."><input name="contentId" type="hidden" value={content.id} /><button className="rounded-xl border border-white/20 px-4 py-3">Publish</button></AdminActionForm></div>
        <AdminActionForm action={rejectContentReviewAction} className="flex gap-3" successMessage="Content returned to Draft."><input name="contentId" type="hidden" value={content.id} /><input className={`${inputClass} flex-1`} name="reason" placeholder="Review rejection reason" required /><button className="rounded-xl border border-red-300/40 px-4">Reject to Draft</button></AdminActionForm>
        <AdminActionForm action={setContentIndexAction} className="flex gap-3" successMessage="Content Index status updated."><input name="contentId" type="hidden" value={content.id} /><select className={`${inputClass} flex-1`} defaultValue={content.indexStatus} name="indexStatus"><option value="noindex">Noindex</option><option value="index">Index — quality gates apply</option></select><button className="rounded-xl border border-white/20 px-4">Apply</button></AdminActionForm>
      </section>
      <section className={panelClass}>
        <h2 className="text-xl font-semibold">Revisions</h2>
        {content.revisions.map((revision) => <article className="rounded-xl border border-white/10 p-4" key={revision.id}><p>v{revision.versionNumber} · {revision.status}</p><p className="text-sm text-slate-400">{revision.changeSummary}</p>{revision.status === "in_review" ? <div className="mt-3 flex gap-3"><AdminActionForm action={applyContentRevisionAction} successMessage="Content revision applied."><input name="contentId" type="hidden" value={content.id} /><input name="revisionId" type="hidden" value={revision.id} /><button className="rounded-lg bg-teal-400 px-3 py-2 text-slate-950">Approve &amp; apply</button></AdminActionForm><AdminActionForm action={rejectContentRevisionAction} successMessage="Content revision rejected."><input name="contentId" type="hidden" value={content.id} /><input name="revisionId" type="hidden" value={revision.id} /><button className="rounded-lg border border-red-300/40 px-3 py-2">Reject</button></AdminActionForm></div> : null}</article>)}
      </section>
      <AdminActionForm action={archiveContentAction} className={panelClass} successMessage="Content archived and forced to Noindex."><h2 className="text-xl font-semibold">Archive Content</h2><input name="contentId" type="hidden" value={content.id} /><input className={inputClass} name="reason" placeholder="Archive reason" required /><button className="rounded-xl border border-red-300/40 px-4 py-3">Archive and force Noindex</button></AdminActionForm>
      <AdminActionForm action={changeContentSlugAction} className={panelClass} successMessage="Content URL changed and 301 Redirect created."><h2 className="text-xl font-semibold">Change slug with 301</h2><input name="contentId" type="hidden" value={content.id} /><input className={inputClass} name="slug" placeholder="new-content-slug" required /><button className="rounded-xl border border-white/20 px-4 py-3">Change URL transactionally</button></AdminActionForm>
    </div>
  </main>;
}
