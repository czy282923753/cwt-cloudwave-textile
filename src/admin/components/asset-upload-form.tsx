"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";

const fieldClass = "rounded-lg border border-white/10 bg-slate-950 p-3";

function optionalValue(form: FormData, name: string): string | null {
  const value = form.get(name);
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

async function responseJson(response: Response): Promise<Record<string, unknown>> {
  const value: unknown = await response.json();
  if (typeof value !== "object" || value === null) throw new Error("Upload service returned an invalid response.");
  return value as Record<string, unknown>;
}

export function AssetUploadForm({ associations }: Readonly<{
  associations: readonly { value: string; label: string; group: string }[];
}>) {
  const router = useRouter();
  const [declarationEnabled, setDeclarationEnabled] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ kind: "success" | "error"; message: string } | null>(null);
  const errorSummaryRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    if (feedback?.kind === "error") errorSummaryRef.current?.focus();
  }, [feedback]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setFeedback(null);
    try {
      const formElement = event.currentTarget;
      const form = new FormData(formElement);
      const input = formElement.elements.namedItem("files");
      if (!(input instanceof HTMLInputElement) || !input.files?.length) throw new Error("Select at least one file.");
      const files = [...input.files];
      const association = optionalValue(form, "association");
      const separator = association?.indexOf(":") ?? -1;
      const associationType = separator > 0 ? association!.slice(0, separator) : null;
      const associationEntityId = separator > 0 ? association!.slice(separator + 1) : null;
      const sourceDeclaration = declarationEnabled ? {
        sourceType: optionalValue(form, "sourceType"),
        sourceProvider: optionalValue(form, "sourceProvider"),
        rightsStatus: optionalValue(form, "rightsStatus"),
        subjectRelationship: optionalValue(form, "subjectRelationship"),
        publicUsePermission: optionalValue(form, "publicUsePermission"),
        editingPermission: optionalValue(form, "editingPermission"),
        usageRestrictions: optionalValue(form, "usageRestrictions"),
        permissionEvidence: optionalValue(form, "permissionEvidence"),
        declarationExpiryDate: optionalValue(form, "declarationExpiryDate"),
        isCwtOwnedFacility: form.get("isCwtOwnedFacility") === "yes" ? true : form.get("isCwtOwnedFacility") === "no" ? false : null,
      } : null;
      const intentResponse = await fetch("/api/admin/upload-intents/", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          files: files.map((file) => ({ fileName: file.name, declaredMimeType: file.type, declaredByteSize: file.size })),
          category: form.get("category"), role: form.get("role"),
          sortOrder: Number(form.get("sortOrder") ?? 0),
          associationType, associationEntityId,
          sourceDeclarationEnabled: declarationEnabled, sourceDeclaration,
        }),
      });
      const intentResult = await responseJson(intentResponse);
      if (!intentResponse.ok || typeof intentResult.batchId !== "string" || !Array.isArray(intentResult.intents)) {
        throw new Error(typeof intentResult.error === "string" ? intentResult.error : "Upload Batch could not be created.");
      }
      if (intentResult.intents.length !== files.length) throw new Error("Upload Intent count mismatch.");
      for (const [index, issued] of intentResult.intents.entries()) {
        if (typeof issued !== "object" || issued === null || !("uploadUrl" in issued) || typeof issued.uploadUrl !== "string") {
          throw new Error("Upload Intent response is invalid.");
        }
        const file = files[index];
        if (!file) throw new Error("Upload Intent count mismatch.");
        const uploadResponse = await fetch(issued.uploadUrl, {
          method: "PUT",
          headers: { "content-type": file.type },
          body: file,
        });
        const uploadResult = await responseJson(uploadResponse);
        if (!uploadResponse.ok) throw new Error(typeof uploadResult.error === "string" ? uploadResult.error : "File upload failed.");
      }
      const finalizeResponse = await fetch(`/api/admin/upload-batches/${encodeURIComponent(intentResult.batchId)}/finalize/`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "{}",
      });
      const finalizeResult = await responseJson(finalizeResponse);
      if (!finalizeResponse.ok) throw new Error(typeof finalizeResult.error === "string" ? finalizeResult.error : "Upload Batch finalization failed.");
      const releasedAssetIds = Array.isArray(finalizeResult.assetIds)
        ? finalizeResult.assetIds.filter((assetId): assetId is string => typeof assetId === "string")
        : [];
      if (releasedAssetIds.length !== files.length) throw new Error("Upload Batch finalization returned an invalid result.");
      formElement.reset();
      setDeclarationEnabled(false);
      setFeedback({ kind: "success", message: `${files.length} asset${files.length === 1 ? "" : "s"} uploaded and released.` });
      router.replace(`/admin/assets/?uploaded=${encodeURIComponent(releasedAssetIds[0]!)}`);
    } catch (error) {
      setFeedback({ kind: "error", message: error instanceof Error ? error.message : "Upload failed safely. Try again." });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="grid gap-5 rounded-2xl border border-white/10 bg-slate-900 p-6" onSubmit={submit}>
      <div><h2 className="text-xl font-semibold">Upload assets</h2><p className="mt-2 text-sm text-slate-300">Files use authenticated Upload Intents, a bounded binary stream, quarantine, scanning, and atomic release.</p></div>
      <label className="grid gap-2">Files<input accept="image/jpeg,image/png,image/webp,image/avif,application/pdf" className={fieldClass} multiple name="files" required type="file" /></label>
      <label className="grid gap-2">Asset Category<select className={fieldClass} name="category" required><option value="product">Product</option><option value="fabric">Fabric</option><option value="market">Market</option><option value="company">Company</option><option value="factory">Factory</option><option value="application">Application</option><option value="certificate">Certificate</option><option value="content">Content</option><option value="other">Other</option></select></label>
      <label className="grid gap-2">Associate with<select className={fieldClass} name="association"><option value="">No association yet</option>{associations.map((association) => <option key={association.value} value={association.value}>{association.group} · {association.label}</option>)}</select></label>
      <div className="grid gap-4 sm:grid-cols-2"><label className="grid gap-2">Asset role<select className={fieldClass} defaultValue="gallery" name="role"><option value="hero">Hero image</option><option value="gallery">Gallery image</option><option value="cover">Cover image</option><option value="detail">Detail image</option><option value="thumbnail">Thumbnail image</option><option value="inline">Inline image</option><option value="document">Document / certificate</option><option value="download">Download attachment</option></select></label><label className="grid gap-2">Sort order<input className={fieldClass} defaultValue={0} min={0} name="sortOrder" type="number" /></label></div>
      <label className="flex items-center gap-3 rounded-xl border border-white/10 p-4"><input checked={declarationEnabled} name="sourceDeclarationEnabled" onChange={(event) => setDeclarationEnabled(event.target.checked)} type="checkbox" />Enable Source Declaration</label>
      {!declarationEnabled ? <p className="text-sm text-slate-400">OFF: source, copyright, authorization, relationship, review, and restriction fields stay null.</p> : (
        <fieldset className="grid gap-4 rounded-xl border border-amber-300/30 p-4 sm:grid-cols-2"><legend className="px-2 text-amber-200">Optional declaration fields</legend>
          <label className="grid gap-2">Source Type<input className={fieldClass} name="sourceType" /></label><label className="grid gap-2">Source / Provider<input className={fieldClass} name="sourceProvider" /></label><label className="grid gap-2">Rights Status<input className={fieldClass} name="rightsStatus" /></label>
          <label className="grid gap-2">Subject Relationship<select className={fieldClass} name="subjectRelationship"><option value="">Unspecified</option><option value="cwt">CWT</option><option value="partner_factory">Partner Factory</option><option value="supplier">Supplier</option><option value="customer">Customer</option><option value="third_party">Third Party</option><option value="unknown">Unknown</option></select></label>
          <label className="grid gap-2">Public Use Permission<select className={fieldClass} name="publicUsePermission"><option value="">Unspecified</option><option value="unknown">Unknown</option><option value="allowed">Allowed</option><option value="not_allowed">Not allowed</option><option value="restricted">Restricted</option></select></label><label className="grid gap-2">Editing Permission<select className={fieldClass} name="editingPermission"><option value="">Unspecified</option><option value="unknown">Unknown</option><option value="allowed">Allowed</option><option value="not_allowed">Not allowed</option><option value="restricted">Restricted</option></select></label>
          <label className="grid gap-2 sm:col-span-2">Usage Restrictions<textarea className={fieldClass} name="usageRestrictions" rows={3} /></label><label className="grid gap-2 sm:col-span-2">Permission Evidence<input className={fieldClass} name="permissionEvidence" /></label><label className="grid gap-2">Whether CWT-Owned Facility<select className={fieldClass} name="isCwtOwnedFacility"><option value="">Unspecified</option><option value="yes">Yes</option><option value="no">No</option></select></label><label className="grid gap-2">Optional Expiry Date<input className={fieldClass} name="declarationExpiryDate" type="date" /></label><p className="text-sm text-amber-200 sm:col-span-2">Partner Factory + CWT-Owned Facility: No must never be described publicly as “Our Factory” or “CWT Factory”.</p>
        </fieldset>
      )}
      {feedback ? <p aria-live={feedback.kind === "error" ? "assertive" : "polite"} className={feedback.kind === "error" ? "rounded-lg border border-red-300/40 p-3 text-sm text-red-100" : "text-sm text-teal-200"} ref={feedback.kind === "error" ? errorSummaryRef : undefined} role={feedback.kind === "error" ? "alert" : "status"} tabIndex={feedback.kind === "error" ? -1 : undefined}>{feedback.message}</p> : null}
      <button className="rounded-xl bg-teal-400 px-5 py-3 font-semibold text-slate-950 disabled:opacity-60" disabled={submitting} type="submit">{submitting ? "Uploading…" : "Upload and process"}</button>
    </form>
  );
}
