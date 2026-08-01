"use client";

import { useState } from "react";

import { updateAssetDeclarationAction } from "@/admin/actions";

const fieldClass = "rounded-lg border border-white/10 bg-slate-950 p-3";

interface DeclarationAsset {
  id: string;
  sourceDeclarationEnabled: boolean;
  sourceType: string | null;
  sourceProvider: string | null;
  rightsStatus: string | null;
  subjectRelationship: string | null;
  publicUsePermission: string | null;
  editingPermission: string | null;
  usageRestrictions: string | null;
  permissionEvidence: string | null;
  declarationReviewerUserId: string | null;
  declarationReviewDate: Date | null;
  declarationExpiryDate: Date | null;
  isCwtOwnedFacility: boolean | null;
}

export function AssetDeclarationForm({
  asset,
  canReviewDeclaration,
  canWriteDeclaration,
}: Readonly<{
  asset: DeclarationAsset;
  canReviewDeclaration: boolean;
  canWriteDeclaration: boolean;
}>) {
  const [enabled, setEnabled] = useState(asset.sourceDeclarationEnabled);
  const hasHistoricalData = Boolean(
    asset.sourceType || asset.sourceProvider || asset.rightsStatus ||
    asset.subjectRelationship || asset.publicUsePermission ||
    asset.editingPermission || asset.usageRestrictions ||
    asset.permissionEvidence || asset.declarationReviewerUserId ||
    asset.declarationReviewDate || asset.declarationExpiryDate ||
    asset.isCwtOwnedFacility !== null,
  );

  if (!canWriteDeclaration) {
    return (
      <section className="grid gap-5 rounded-2xl border border-white/10 bg-slate-900 p-6">
        <h2 className="text-xl font-semibold">Source Declaration</h2>
        <p className="text-sm text-slate-300">
          {asset.sourceDeclarationEnabled
            ? "Enabled. Reviewers can record review state but cannot alter declaration content."
            : "Off. An Asset writer must enable and complete the declaration before review."}
        </p>
        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <div><dt className="text-slate-500">Source</dt><dd>{asset.sourceType ?? "Unspecified"}</dd></div>
          <div><dt className="text-slate-500">Provider</dt><dd>{asset.sourceProvider ?? "Unspecified"}</dd></div>
          <div><dt className="text-slate-500">Rights</dt><dd>{asset.rightsStatus ?? "Unspecified"}</dd></div>
          <div><dt className="text-slate-500">Relationship</dt><dd>{asset.subjectRelationship ?? "Unspecified"}</dd></div>
          <div><dt className="text-slate-500">Last reviewer</dt><dd>{asset.declarationReviewerUserId ?? "Not reviewed"}</dd></div>
          <div><dt className="text-slate-500">Review date</dt><dd>{asset.declarationReviewDate?.toLocaleString("en-GB") ?? "—"}</dd></div>
        </dl>
        {canReviewDeclaration && asset.sourceDeclarationEnabled ? (
          <form action={updateAssetDeclarationAction}>
            <input name="assetId" type="hidden" value={asset.id} />
            <input name="enabled" type="hidden" value="on" />
            <input name="markReviewed" type="hidden" value="on" />
            <button className="rounded-xl bg-teal-400 px-4 py-3 font-semibold text-slate-950">
              Record my review now
            </button>
          </form>
        ) : null}
      </section>
    );
  }

  return (
    <form
      action={updateAssetDeclarationAction}
      className="grid gap-5 rounded-2xl border border-white/10 bg-slate-900 p-6"
      onSubmit={(event) => {
        if (
          asset.sourceDeclarationEnabled && !enabled && hasHistoricalData &&
          !window.confirm(
            "Turn off Source Declaration? Existing declaration data will be hidden but preserved in history and Audit Log.",
          )
        ) event.preventDefault();
      }}
    >
      <input name="assetId" type="hidden" value={asset.id} />
      <label className="flex items-center gap-3 rounded-xl border border-white/10 p-4">
        <input checked={enabled} name="enabled" onChange={(event) => setEnabled(event.target.checked)} type="checkbox" />
        Enable Source Declaration
      </label>
      {!enabled ? (
        <p className="text-sm text-slate-400">Fields are hidden. {hasHistoricalData ? "Existing historical values are preserved." : "No declaration values are stored."}</p>
      ) : (
        <fieldset className="grid gap-4 sm:grid-cols-2">
          <label className="grid gap-2">Source Type<input className={fieldClass} defaultValue={asset.sourceType ?? ""} name="sourceType" /></label>
          <label className="grid gap-2">Source / Provider<input className={fieldClass} defaultValue={asset.sourceProvider ?? ""} name="sourceProvider" /></label>
          <label className="grid gap-2">Rights Status<input className={fieldClass} defaultValue={asset.rightsStatus ?? ""} name="rightsStatus" /></label>
          <label className="grid gap-2">Subject Relationship<select className={fieldClass} defaultValue={asset.subjectRelationship ?? ""} name="subjectRelationship"><option value="">Unspecified</option><option value="cwt">CWT</option><option value="partner_factory">Partner Factory</option><option value="supplier">Supplier</option><option value="customer">Customer</option><option value="third_party">Third Party</option><option value="unknown">Unknown</option></select></label>
          <label className="grid gap-2">Public Use Permission<select className={fieldClass} defaultValue={asset.publicUsePermission ?? ""} name="publicUsePermission"><option value="">Unspecified</option><option value="unknown">Unknown</option><option value="allowed">Allowed</option><option value="not_allowed">Not allowed</option><option value="restricted">Restricted</option></select></label>
          <label className="grid gap-2">Editing Permission<select className={fieldClass} defaultValue={asset.editingPermission ?? ""} name="editingPermission"><option value="">Unspecified</option><option value="unknown">Unknown</option><option value="allowed">Allowed</option><option value="not_allowed">Not allowed</option><option value="restricted">Restricted</option></select></label>
          <label className="grid gap-2 sm:col-span-2">Usage Restrictions<textarea className={fieldClass} defaultValue={asset.usageRestrictions ?? ""} name="usageRestrictions" rows={3} /></label>
          <label className="grid gap-2 sm:col-span-2">Permission Evidence<input className={fieldClass} defaultValue={asset.permissionEvidence ?? ""} name="permissionEvidence" /></label>
          <label className="grid gap-2">Whether CWT-Owned Facility<select className={fieldClass} defaultValue={asset.isCwtOwnedFacility === true ? "yes" : asset.isCwtOwnedFacility === false ? "no" : ""} name="isCwtOwnedFacility"><option value="">Unspecified</option><option value="yes">Yes</option><option value="no">No</option></select></label>
          <label className="grid gap-2">Optional Expiry Date<input className={fieldClass} defaultValue={asset.declarationExpiryDate?.toISOString().slice(0, 10) ?? ""} name="declarationExpiryDate" type="date" /></label>
          {canReviewDeclaration ? <label className="flex items-center gap-3 sm:col-span-2"><input name="markReviewed" type="checkbox" />Record current operator and current date as reviewer</label> : null}
          <p className="text-sm text-amber-200 sm:col-span-2">Partner Factory + CWT-Owned Facility: No must never be described as CWT-owned.</p>
        </fieldset>
      )}
      <button className="rounded-xl bg-teal-400 px-4 py-3 font-semibold text-slate-950" type="submit">Save declaration state</button>
    </form>
  );
}
