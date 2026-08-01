"use client";

import { useState } from "react";

import { uploadAssetsAction } from "@/admin/actions";

const fieldClass = "rounded-lg border border-white/10 bg-slate-950 p-3";

export function AssetUploadForm({
  associations,
  canReviewDeclaration,
}: Readonly<{
  associations: readonly { value: string; label: string; group: string }[];
  canReviewDeclaration: boolean;
}>) {
  const [declarationEnabled, setDeclarationEnabled] = useState(false);
  return (
    <form action={uploadAssetsAction} className="grid gap-5 rounded-2xl border border-white/10 bg-slate-900 p-6">
      <div>
        <h2 className="text-xl font-semibold">Upload assets</h2>
        <p className="mt-2 text-sm text-slate-300">
          Files are validated, quarantined, scanned, and processed before release.
        </p>
      </div>
      <label className="grid gap-2">Files<input accept="image/jpeg,image/png,image/webp,image/avif,application/pdf" className={fieldClass} multiple name="files" required type="file" /></label>
      <label className="grid gap-2">Asset Category<select className={fieldClass} name="category" required><option value="product">Product</option><option value="fabric">Fabric</option><option value="market">Market</option><option value="company">Company</option><option value="factory">Factory</option><option value="application">Application</option><option value="certificate">Certificate</option><option value="content">Content</option><option value="other">Other</option></select></label>
      <label className="grid gap-2">Associate with<select className={fieldClass} name="association"><option value="">No association yet</option>{associations.map((association) => <option key={association.value} value={association.value}>{association.group} · {association.label}</option>)}</select></label>
      <div className="grid gap-4 sm:grid-cols-2"><label className="grid gap-2">Image role<select className={fieldClass} defaultValue="gallery" name="role"><option value="hero">Hero</option><option value="gallery">Gallery</option><option value="detail">Detail</option><option value="thumbnail">Thumbnail</option><option value="inline">Inline</option><option value="document">Document</option></select></label><label className="grid gap-2">Sort order<input className={fieldClass} defaultValue={0} min={0} name="sortOrder" type="number" /></label></div>
      <label className="flex items-center gap-3 rounded-xl border border-white/10 p-4">
        <input
          checked={declarationEnabled}
          name="sourceDeclarationEnabled"
          onChange={(event) => setDeclarationEnabled(event.target.checked)}
          type="checkbox"
        />
        Enable Source Declaration
      </label>
      {!declarationEnabled ? (
        <p className="text-sm text-slate-400">
          OFF: no source, copyright, authorization, or restriction values will be written.
        </p>
      ) : (
        <fieldset className="grid gap-4 rounded-xl border border-amber-300/30 p-4 sm:grid-cols-2">
          <legend className="px-2 text-amber-200">Optional declaration fields</legend>
          <label className="grid gap-2">Source Type<input className={fieldClass} name="sourceType" /></label>
          <label className="grid gap-2">Source / Provider<input className={fieldClass} name="sourceProvider" /></label>
          <label className="grid gap-2">Rights Status<input className={fieldClass} name="rightsStatus" /></label>
          <label className="grid gap-2">Subject Relationship<select className={fieldClass} name="subjectRelationship"><option value="">Unspecified</option><option value="cwt">CWT</option><option value="partner_factory">Partner Factory</option><option value="supplier">Supplier</option><option value="customer">Customer</option><option value="third_party">Third Party</option><option value="unknown">Unknown</option></select></label>
          <label className="grid gap-2">Public Use Permission<select className={fieldClass} name="publicUsePermission"><option value="">Unspecified</option><option value="unknown">Unknown</option><option value="allowed">Allowed</option><option value="not_allowed">Not allowed</option><option value="restricted">Restricted</option></select></label>
          <label className="grid gap-2">Editing Permission<select className={fieldClass} name="editingPermission"><option value="">Unspecified</option><option value="unknown">Unknown</option><option value="allowed">Allowed</option><option value="not_allowed">Not allowed</option><option value="restricted">Restricted</option></select></label>
          <label className="grid gap-2 sm:col-span-2">Usage Restrictions<textarea className={fieldClass} name="usageRestrictions" rows={3} /></label>
          <label className="grid gap-2 sm:col-span-2">Permission Evidence<input className={fieldClass} name="permissionEvidence" /></label>
          <label className="grid gap-2">Whether CWT-Owned Facility<select className={fieldClass} name="isCwtOwnedFacility"><option value="">Unspecified</option><option value="yes">Yes</option><option value="no">No</option></select></label>
          <label className="grid gap-2">Optional Expiry Date<input className={fieldClass} name="declarationExpiryDate" type="date" /></label>
          {canReviewDeclaration ? <label className="flex items-center gap-3 sm:col-span-2"><input name="markReviewed" type="checkbox" />Record current operator and current date as reviewer</label> : null}
          <p className="text-sm text-amber-200 sm:col-span-2">
            Partner Factory + CWT-Owned Facility: No must never be described publicly as “Our Factory” or “CWT Factory”.
          </p>
        </fieldset>
      )}
      <button className="rounded-xl bg-teal-400 px-5 py-3 font-semibold text-slate-950" type="submit">Upload and process</button>
    </form>
  );
}
