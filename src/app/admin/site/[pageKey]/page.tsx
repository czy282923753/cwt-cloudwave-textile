import { notFound } from "next/navigation";

import {
  applyStaticPageRevisionAction,
  saveStaticPageDraftAction,
  submitStaticPageDraftReviewAction,
} from "@/admin/actions";
import { isEligiblePublicImagePickerAsset } from "@/admin/asset-picker";
import { AdminActionForm } from "@/admin/components/admin-action-form";
import { AssetUploadForm } from "@/admin/components/asset-upload-form";
import { AdminPageHeader } from "@/admin/components/admin-table";
import { PreviewViewportPanel } from "@/admin/components/preview-viewport-panel";
import { getAdminStaticPage, listAdminAssets } from "@/admin/data";
import { requireCurrentUser } from "@/auth/current-user";
import { hasPermission } from "@/auth/permissions";
import {
  ABOUT_MODULE_ORDER,
  DEFAULT_STATIC_PAGE_CONFIGS,
  HOME_MODULE_ORDER,
  type StaticPageConfig,
} from "@/content/static-page-projection";

const inputClass = "rounded-lg border border-white/10 bg-slate-950 p-3";
const panelClass = "grid gap-5 rounded-2xl border border-white/10 bg-slate-900 p-6";

interface ModuleCopyValue {
  eyebrow: string;
  title: string;
  summary: string;
  cta?: { label: string; href: string };
}

function ModuleCopyFields({
  fieldKey,
  label,
  value,
}: Readonly<{
  fieldKey: string;
  label: string;
  value: ModuleCopyValue;
}>) {
  return (
    <fieldset className="grid gap-3 rounded-xl border border-white/10 p-4">
      <legend>{label}</legend>
      <label className="grid gap-2">
        Eyebrow
        <input
          className={inputClass}
          defaultValue={value.eyebrow}
          name={`copy:${fieldKey}:eyebrow`}
        />
      </label>
      <label className="grid gap-2">
        Title
        <input
          className={inputClass}
          defaultValue={value.title}
          name={`copy:${fieldKey}:title`}
          required
        />
      </label>
      <label className="grid gap-2">
        Summary
        <textarea
          className={inputClass}
          defaultValue={value.summary}
          name={`copy:${fieldKey}:summary`}
          rows={3}
        />
      </label>
      {value.cta ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="grid gap-2">
            CTA label
            <input
              className={inputClass}
              defaultValue={value.cta.label}
              name={`copy:${fieldKey}:label`}
              required
            />
          </label>
          <label className="grid gap-2">
            CTA internal path
            <input
              className={inputClass}
              defaultValue={value.cta.href}
              name={`copy:${fieldKey}:href`}
              pattern="/.*"
              required
            />
          </label>
        </div>
      ) : null}
    </fieldset>
  );
}

function CopyFields({ config }: Readonly<{ config: StaticPageConfig }>) {
  if (config.pageKey === "home") {
    const copy = config.copy ?? DEFAULT_STATIC_PAGE_CONFIGS.home.copy!;
    const modules: ReadonlyArray<readonly [string, string, ModuleCopyValue]> = [
      ["products", "Products", copy.products],
      ["applications", "Applications", copy.applications],
      ["fabricLibrary", "Fabric Library", copy.fabricLibrary],
      ["fabricSourcing", "Fabric & Sourcing", copy.fabricSourcing],
      ["manufacturingStrength", "Manufacturing & Service Strength", copy.manufacturingStrength],
      ["inquiryCta", "Inquiry CTA", copy.inquiryCta],
    ];
    return (
      <div className="grid gap-5">
        <fieldset className="grid gap-3 rounded-xl border border-white/10 p-4">
          <legend>Hero copy</legend>
          <label className="grid gap-2">
            Eyebrow
            <input className={inputClass} defaultValue={copy.hero.eyebrow} name="copy:hero:eyebrow" />
          </label>
          <label className="grid gap-2">
            Title
            <input className={inputClass} defaultValue={copy.hero.title} name="copy:hero:title" required />
          </label>
          <label className="grid gap-2">
            Summary
            <textarea className={inputClass} defaultValue={copy.hero.summary} name="copy:hero:summary" rows={3} />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-2">
              Primary CTA label
              <input className={inputClass} defaultValue={copy.hero.primaryCta.label} name="copy:hero:primaryLabel" required />
            </label>
            <label className="grid gap-2">
              Primary CTA internal path
              <input className={inputClass} defaultValue={copy.hero.primaryCta.href} name="copy:hero:primaryHref" pattern="/.*" required />
            </label>
            <label className="grid gap-2">
              Secondary CTA label
              <input className={inputClass} defaultValue={copy.hero.secondaryCta?.label ?? ""} name="copy:hero:secondaryLabel" />
            </label>
            <label className="grid gap-2">
              Secondary CTA internal path
              <input className={inputClass} defaultValue={copy.hero.secondaryCta?.href ?? ""} name="copy:hero:secondaryHref" pattern="/.*" />
            </label>
          </div>
        </fieldset>
        {modules.map(([fieldKey, label, value]) => (
          <ModuleCopyFields fieldKey={fieldKey} key={fieldKey} label={label} value={value} />
        ))}
      </div>
    );
  }
  const copy = config.copy ?? DEFAULT_STATIC_PAGE_CONFIGS.about.copy!;
  const modules: ReadonlyArray<readonly [string, string, ModuleCopyValue]> = [
    ["hero", "Hero", copy.hero],
    ["introduction", "Introduction", copy.introduction],
    ["ownedManufacturing", "Owned Manufacturing", copy.ownedManufacturing],
    ["serviceStrength", "Service Strength", copy.serviceStrength],
    ["inquiryCta", "Inquiry CTA", copy.inquiryCta],
  ];
  return (
    <div className="grid gap-5">
      {modules.map(([fieldKey, label, value]) => (
        <ModuleCopyFields fieldKey={fieldKey} key={fieldKey} label={label} value={value} />
      ))}
    </div>
  );
}

export default async function StaticPageEditor({
  params,
}: Readonly<{ params: Promise<{ pageKey: string }> }>) {
  const user = await requireCurrentUser("content.read");
  const { pageKey: rawPageKey } = await params;
  if (rawPageKey !== "home" && rawPageKey !== "about") notFound();
  const pageKey = rawPageKey;
  const [page, allAssets] = await Promise.all([
    getAdminStaticPage(pageKey),
    listAdminAssets(),
  ]);
  const config = page.pendingRevision?.config ?? page.liveConfig;
  const moduleKeys = pageKey === "home" ? HOME_MODULE_ORDER : ABOUT_MODULE_ORDER;
  const readyAssets = allAssets.filter((asset) =>
    isEligiblePublicImagePickerAsset(asset),
  );
  const factKeys = new Set(
    config.pageKey === "home"
      ? config.copy?.manufacturingStrength.factKeys ?? []
      : config.copy?.ownedManufacturing.factKeys ?? [],
  );
  const canWrite = hasPermission(user.role, "content.write");
  const canApply = hasPermission(user.role, "content.publish");
  const draftEditable = !page.pendingRevision || page.pendingRevision.status === "draft";
  const stateDescription = page.pendingRevision
    ? `Pending v${page.pendingRevision.versionNumber} ${page.pendingRevision.status} by ${page.pendingRevision.createdByName ?? "unknown"} at ${page.pendingRevision.createdAt.toLocaleString("en-GB")}`
    : "No pending revision";
  const liveDescription = page.liveUpdatedAt
    ? `Live updated by ${page.liveUpdatedByName ?? "unknown"} at ${page.liveUpdatedAt.toLocaleString("en-GB")}`
    : "Live safe code default";

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <AdminPageHeader
        action={(
          <a
            className="rounded-xl border border-white/20 px-4 py-3"
            href={`/admin/preview/site/${pageKey}/`}
            target="_blank"
          >
            Preview Draft
          </a>
        )}
        description={`Fixed schema · ${liveDescription} · ${stateDescription}`}
        title={`${pageKey === "home" ? "Home" : "About CWT"} Page Settings`}
      />
      <div className="grid gap-8">
        <p className="rounded-xl border border-amber-300/30 bg-amber-300/10 p-4 text-sm text-amber-100">
          Modules use a frozen order and allowlist. Disabling a module removes its DOM
          and media authority. Facility media and Company Facts remain server-validated.
        </p>
        <PreviewViewportPanel
          href={`/admin/preview/site/${pageKey}/`}
          label={pageKey === "home" ? "Home" : "About CWT"}
        />
        {canWrite ? (
          <AssetUploadForm associations={[]} returnTo={`/admin/site/${pageKey}/`} />
        ) : null}
        <AdminActionForm
          action={saveStaticPageDraftAction}
          className={panelClass}
          successMessage={`${pageKey} Draft saved.`}
        >
          <input name="pageKey" type="hidden" value={pageKey} />
          <input
            name="revisionId"
            type="hidden"
            value={page.pendingRevision?.status === "draft" ? page.pendingRevision.id : ""}
          />
          <input
            name="revisionVersion"
            type="hidden"
            value={page.pendingRevision?.status === "draft" ? page.pendingRevision.draftVersion ?? 1 : 0}
          />
          <fieldset className="contents" disabled={!canWrite || !draftEditable}>
            <fieldset className="grid gap-3">
              <legend className="text-xl font-semibold">Fixed modules</legend>
              {moduleKeys.map((key) => (
                <label className="flex items-center gap-3" key={key}>
                  <input
                    defaultChecked={(config.modules as Readonly<Record<string, boolean>>)[key]}
                    name={`module:${key}`}
                    type="checkbox"
                    value="true"
                  />
                  {key.replaceAll("_", " ")}
                </label>
              ))}
            </fieldset>
            <CopyFields config={config} />
            <fieldset className="grid gap-3">
              <legend className="text-xl font-semibold">Verified public Company Facts</legend>
              {page.facts.length ? page.facts.map((fact) => (
                <label className="flex gap-3" key={fact.id}>
                  <input
                    defaultChecked={factKeys.has(fact.key)}
                    name="factKeys"
                    type="checkbox"
                    value={fact.key}
                  />
                  <span>
                    <strong>{fact.key}</strong>
                    <span className="block text-sm text-slate-400">{fact.statement}</span>
                  </span>
                </label>
              )) : (
                <p className="text-sm text-slate-400">
                  No verified public Synthetic/Test Company Facts are available.
                </p>
              )}
            </fieldset>
            <fieldset className="grid gap-5">
              <legend className="text-xl font-semibold">Desktop and mobile media placements</legend>
              {moduleKeys.map((placementKey) => {
                const selectableAssets = placementKey === "manufacturing_strength" || placementKey === "owned_manufacturing"
                  ? readyAssets.filter((asset) => asset.subjectRelationship === "cwt" && asset.isCwtOwnedFacility === true)
                  : readyAssets;
                return (
                  <section className="grid gap-3 rounded-xl border border-white/10 p-4" key={placementKey}>
                    <h3 className="font-semibold">{placementKey.replaceAll("_", " ")}</h3>
                    {(["desktop", "mobile"] as const).map((viewport) => {
                      const placement = config.placements.find((item) =>
                        item.placementKey === placementKey && item.viewport === viewport,
                      );
                      return (
                        <div className="grid gap-3 rounded-lg bg-slate-950/40 p-3 sm:grid-cols-2" key={viewport}>
                          <label className="grid gap-2 sm:col-span-2">
                            {viewport} Asset
                            <select className={inputClass} defaultValue={placement?.assetId ?? ""} name={`asset:${placementKey}:${viewport}`}>
                              <option value="">No media</option>
                              {selectableAssets.map((asset) => (
                                <option key={asset.id} value={asset.id}>{asset.fileName}</option>
                              ))}
                            </select>
                          </label>
                          <label className="grid gap-2">
                            Placement Alt Text
                            <input className={inputClass} defaultValue={placement?.altText ?? ""} name={`alt:${placementKey}:${viewport}`} />
                          </label>
                          <label className="grid gap-2">
                            Caption
                            <input className={inputClass} defaultValue={placement?.caption ?? ""} name={`caption:${placementKey}:${viewport}`} />
                          </label>
                          <label className="grid gap-2">
                            Focal X
                            <input className={inputClass} defaultValue={placement?.focalX ?? 50} max="100" min="0" name={`focalX:${placementKey}:${viewport}`} type="number" />
                          </label>
                          <label className="grid gap-2">
                            Focal Y
                            <input className={inputClass} defaultValue={placement?.focalY ?? 50} max="100" min="0" name={`focalY:${placementKey}:${viewport}`} type="number" />
                          </label>
                          <label className="grid gap-2">
                            Overlay
                            <input className={inputClass} defaultValue={placement?.overlayOpacity ?? 0} max="0.9" min="0" name={`overlay:${placementKey}:${viewport}`} step="0.05" type="number" />
                          </label>
                          <label className="flex items-center gap-2">
                            <input defaultChecked={placement?.isVisible ?? true} name={`visible:${placementKey}:${viewport}`} type="checkbox" value="true" />
                            Visible
                          </label>
                        </div>
                      );
                    })}
                  </section>
                );
              })}
            </fieldset>
            <button className="rounded-xl bg-teal-400 px-4 py-3 font-semibold text-slate-950" type="submit">
              Save Draft
            </button>
          </fieldset>
        </AdminActionForm>
        {page.pendingRevision?.status === "draft" ? (
          <AdminActionForm
            action={submitStaticPageDraftReviewAction}
            className={panelClass}
            successMessage="Static-page Draft submitted for review."
          >
            <input name="pageKey" type="hidden" value={pageKey} />
            <input name="revisionId" type="hidden" value={page.pendingRevision.id} />
            <button className="rounded-xl border border-white/20 px-4 py-3" disabled={!canWrite}>
              Submit Review
            </button>
          </AdminActionForm>
        ) : null}
        {page.pendingRevision?.status === "in_review" ? (
          <AdminActionForm
            action={applyStaticPageRevisionAction}
            className={panelClass}
            successMessage="Static-page Revision applied to the live projection."
          >
            <p>
              Pending v{page.pendingRevision.versionNumber} is In Review. Public output
              remains on the previous live config.
            </p>
            <input name="revisionId" type="hidden" value={page.pendingRevision.id} />
            <button
              className="rounded-xl bg-teal-400 px-4 py-3 font-semibold text-slate-950"
              disabled={!canApply}
            >
              Authorized Apply
            </button>
          </AdminActionForm>
        ) : null}
      </div>
    </main>
  );
}
