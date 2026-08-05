import { notFound } from "next/navigation";

import {
  applyContentRevisionAction,
  archiveContentAction,
  changeContentSlugAction,
  publishContentAction,
  rejectContentReviewAction,
  rejectContentRevisionAction,
  setContentIndexAction,
  submitBlockDraftForReviewAction,
  submitContentReviewAction,
  updateContentAction,
} from "@/admin/actions";
import { AdminActionForm } from "@/admin/components/admin-action-form";
import { BlockEditor } from "@/admin/components/block-editor";
import { AssetUploadForm } from "@/admin/components/asset-upload-form";
import { AdminPageHeader } from "@/admin/components/admin-table";
import { MediaPlacementEditor } from "@/admin/components/media-placement-editor";
import { getAdminContent, getEditorialPickerOptions, listAdminAssets, listAdminAuthors } from "@/admin/data";
import { requireCurrentUser } from "@/auth/current-user";
import { isEligiblePublicImagePickerAsset } from "@/admin/asset-picker";
import { blockDocumentSchema, parseBlockDocument } from "@/editorial/blocks";

const inputClass = "rounded-lg border border-white/10 bg-slate-950 p-3";
const panelClass = "grid gap-4 rounded-2xl border border-white/10 bg-slate-900 p-6";

export default async function ContentEditorPage({ params }: Readonly<{ params: Promise<{ id: string }> }>) {
  await requireCurrentUser("content.read");
  const { id } = await params;
  const [content, authors, assets, pickerOptions] = await Promise.all([getAdminContent(id), listAdminAuthors(), listAdminAssets(), getEditorialPickerOptions()]);
  if (!content) notFound();
  const document = parseBlockDocument(content.structuredBlocks, "content");
  const draftRevision = content.revisions.find((revision) => revision.status === "draft");
  const draftSnapshot = draftRevision?.snapshot;
  const draftDocument = typeof draftSnapshot === "object" && draftSnapshot !== null &&
    "kind" in draftSnapshot && draftSnapshot.kind === "content_blocks_v1" &&
    "document" in draftSnapshot
    ? blockDocumentSchema.safeParse(draftSnapshot.document)
    : null;
  const editorDocument = draftDocument?.success ? draftDocument.data : document;
  const editorTitle = typeof draftSnapshot === "object" && draftSnapshot !== null &&
    "title" in draftSnapshot && typeof draftSnapshot.title === "string"
    ? draftSnapshot.title
    : content.title;
  const editorSummary = typeof draftSnapshot === "object" && draftSnapshot !== null &&
    "excerpt" in draftSnapshot &&
    (typeof draftSnapshot.excerpt === "string" || draftSnapshot.excerpt === null)
    ? draftSnapshot.excerpt
    : content.excerpt;
  const draftVersion = typeof draftSnapshot === "object" && draftSnapshot !== null &&
    "draftVersion" in draftSnapshot && typeof draftSnapshot.draftVersion === "number"
    ? draftSnapshot.draftVersion
    : draftRevision ? 1 : null;
  const readyAssets = assets.filter((asset) => isEligiblePublicImagePickerAsset(asset));
  const assetNames = new Map(assets.map((asset) => [asset.id, asset.fileName]));
  const mediaAssets = assets
    .filter((asset) => readyAssets.some((ready) => ready.id === asset.id) || content.assets.some((placement) => placement.assetId === asset.id))
    .map((asset) => ({
      id: asset.id,
      label: `${asset.fileName} · ${asset.status}/${asset.scanStatus}`,
      selectable: readyAssets.some((ready) => ready.id === asset.id),
    }));
  const eligibleAssetIds = new Set(readyAssets.map((asset) => asset.id));
  const blockMediaOptions = content.assets.flatMap((asset) =>
    asset.blockKey && asset.isVisible && eligibleAssetIds.has(asset.assetId)
      ? [{
          id: asset.assetId,
          value: asset.blockKey,
          label: `${asset.role} · ${assetNames.get(asset.assetId) ?? asset.assetId} · ${asset.blockKey}`,
          usages: [
            ...((asset.role !== "gallery" ? ["image"] : []) as Array<"image">),
            ...((asset.role !== "cover" ? ["gallery"] : []) as Array<"gallery">),
          ],
        }]
      : [],
  );
  return <main className="mx-auto max-w-5xl px-6 py-10">
    <AdminPageHeader title={content.title} description={`${content.channel} · ${content.status} · ${content.indexStatus} · ${content.path}`} />
    <div className="grid gap-8">
      {content.status === "published" ? <p className="rounded-xl border border-amber-300/30 bg-amber-300/10 p-4 text-amber-100">Published Content edits create an In Review revision. The public article remains unchanged until approval.</p> : null}
      <BlockEditor contentOptions={pickerOptions.contents} draftRevisionId={draftRevision?.id ?? null} draftRevisionVersion={draftVersion} editorDocumentVersion={content.editorDocumentVersion} entityId={content.id} entityType="content" initialDocument={editorDocument} initialSummary={editorSummary} initialTitle={editorTitle} internalLinkOptions={pickerOptions.links} mediaOptions={blockMediaOptions} previewHref={`/admin/preview/content/${content.id}/`} productOptions={pickerOptions.products} />
      {draftRevision ? <AdminActionForm action={submitBlockDraftForReviewAction} className={panelClass} successMessage="Content Block Draft submitted for review."><h2 className="text-xl font-semibold">Content Block Draft Revision</h2><p className="text-sm text-slate-300">Autosave remains Draft-only. Submit explicitly when this revision is ready for human review.</p><input name="entityType" type="hidden" value="content" /><input name="entityId" type="hidden" value={content.id} /><input name="revisionId" type="hidden" value={draftRevision.id} /><button className="rounded-xl border border-white/20 px-4 py-3" type="submit">Submit Block Draft for Review</button></AdminActionForm> : null}
      <AssetUploadForm associations={[{ value: `content:${content.id}`, label: content.title, group: "Content" }]} returnTo={`/admin/contents/${content.id}/`} />
      <AdminActionForm action={updateContentAction} className={panelClass} successMessage="Content changes saved.">
        <input name="contentId" type="hidden" value={content.id} />
        <input name="expectedEditorDocumentVersion" type="hidden" value={content.editorDocumentVersion} />
        <input name="title" type="hidden" value={content.title} />
        <input name="excerpt" type="hidden" value={content.excerpt ?? ""} />
        <input name="structuredDocument" type="hidden" value={JSON.stringify(document)} />
        <h2 className="text-xl font-semibold">Metadata and media placements</h2>
        <label className="grid gap-2">Type<select className={inputClass} defaultValue={content.type} name="type"><option value="article">Article</option><option value="pillar">Pillar</option><option value="comparison">Comparison</option><option value="how_to">How-to</option><option value="guide">Guide</option></select></label>
        <label className="grid gap-2">Author<select className={inputClass} defaultValue={content.authorId} name="authorId">{authors.filter((author) => author.isActive || author.id === content.authorId).map((author) => <option disabled={!author.isActive} key={author.id} value={author.id}>{author.displayName}{author.isActive ? "" : " · inactive"}</option>)}</select></label>
        <MediaPlacementEditor assets={mediaAssets} entityType="content" initial={content.assets} />
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
