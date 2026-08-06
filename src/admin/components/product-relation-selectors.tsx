"use client";

import { useState } from "react";

import {
  quickCreateProductRelation,
  type QuickCreateProductRelationResult,
} from "@/admin/actions";

const inputClass = "min-w-0 w-full rounded-lg border border-white/10 bg-slate-950 p-3";
const buttonClass = "rounded-lg border border-white/20 px-3 py-2 disabled:opacity-40";

type TaxonomyDimension =
  | "material_fiber"
  | "structure_construction"
  | "commercial_collection"
  | "surface_hand_feel";

interface TaxonomyOption {
  id: string;
  name: string;
  dimension: TaxonomyDimension;
  isActive: boolean;
}

interface ApplicationOption {
  id: string;
  name: string;
  status: string;
}

interface ProductRelationSelectorsProps {
  taxonomy: readonly TaxonomyOption[];
  applications: readonly ApplicationOption[];
  initialPrimary: string;
  initialAdditional: readonly string[];
  initialApplications: readonly string[];
}

function includesSearch(label: string, search: string): boolean {
  return label.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase());
}

function QuickCreateFeedback({ result }: Readonly<{ result: QuickCreateProductRelationResult | null }>) {
  if (!result || result.success) return null;
  return (
    <p className="rounded-lg border border-red-300/40 bg-red-950/30 p-3 text-sm text-red-100" role="alert">
      {result.message} {result.formError}
    </p>
  );
}

function networkFailure(): QuickCreateProductRelationResult {
  return {
    success: false,
    message: "The server could not be reached.",
    formError: "Nothing was selected. Check the connection and try again.",
    fieldErrors: {},
    errorCode: "NETWORK_ERROR",
  };
}

export function ProductRelationSelectors({
  taxonomy: initialTaxonomy,
  applications: initialApplicationOptions,
  initialPrimary,
  initialAdditional,
  initialApplications,
}: Readonly<ProductRelationSelectorsProps>) {
  const [taxonomy, setTaxonomy] = useState([...initialTaxonomy]);
  const [applications, setApplications] = useState([...initialApplicationOptions]);
  const [primary, setPrimary] = useState(initialPrimary);
  const [additional, setAdditional] = useState(() => new Set(initialAdditional));
  const [selectedApplications, setSelectedApplications] = useState(
    () => new Set(initialApplications),
  );
  const [primarySearch, setPrimarySearch] = useState("");
  const [additionalSearch, setAdditionalSearch] = useState("");
  const [applicationSearch, setApplicationSearch] = useState("");
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<QuickCreateProductRelationResult | null>(null);
  const [quickTaxonomyName, setQuickTaxonomyName] = useState("");
  const [quickTaxonomyDimension, setQuickTaxonomyDimension] =
    useState<TaxonomyDimension>("material_fiber");
  const [quickTaxonomyPrefix, setQuickTaxonomyPrefix] = useState("");
  const [quickTaxonomyTarget, setQuickTaxonomyTarget] =
    useState<"primary" | "additional">("additional");
  const [quickApplicationName, setQuickApplicationName] = useState("");

  function toggle(setter: typeof setAdditional, id: string, selected: boolean) {
    setter((current) => {
      const next = new Set(current);
      if (selected) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  async function quickCreateTaxonomy() {
    if (
      pending ||
      !quickTaxonomyName.trim() ||
      (quickTaxonomyPrefix && !/^[A-Z]{3,8}$/.test(quickTaxonomyPrefix))
    ) return;
    setPending(true);
    setResult(null);
    let next: QuickCreateProductRelationResult;
    try {
      next = await quickCreateProductRelation({
        kind: "taxonomy",
        name: quickTaxonomyName,
        dimension: quickTaxonomyDimension,
        productCodePrefix: quickTaxonomyPrefix.trim() || null,
      });
    } catch {
      next = networkFailure();
    }
    setResult(next);
    setPending(false);
    if (!next.success) return;
    setTaxonomy((current) => [
      ...current,
      {
        id: next.id,
        name: next.label,
        dimension: next.detail as TaxonomyDimension,
        isActive: true,
      },
    ]);
    if (quickTaxonomyTarget === "primary") {
      setPrimary(next.id);
      setAdditional((current) => {
        const updated = new Set(current);
        updated.delete(next.id);
        return updated;
      });
    } else {
      setAdditional((current) => new Set(current).add(next.id));
    }
    setQuickTaxonomyName("");
    setQuickTaxonomyPrefix("");
  }

  async function quickCreateApplication() {
    if (pending || !quickApplicationName.trim()) return;
    setPending(true);
    setResult(null);
    let next: QuickCreateProductRelationResult;
    try {
      next = await quickCreateProductRelation({
        kind: "application",
        name: quickApplicationName,
      });
    } catch {
      next = networkFailure();
    }
    setResult(next);
    setPending(false);
    if (!next.success) return;
    setApplications((current) => [
      ...current,
      { id: next.id, name: next.label, status: next.detail },
    ]);
    setSelectedApplications((current) => new Set(current).add(next.id));
    setQuickApplicationName("");
  }

  const primaryOptions = taxonomy.filter((term) =>
    includesSearch(`${term.name} ${term.dimension}`, primarySearch),
  );
  const additionalOptions = taxonomy.filter((term) =>
    includesSearch(`${term.name} ${term.dimension}`, additionalSearch),
  );
  const applicationOptions = applications.filter((application) =>
    includesSearch(`${application.name} ${application.status}`, applicationSearch),
  );

  return (
    <section className="grid min-w-0 gap-5 rounded-xl border border-white/10 p-3 sm:p-4">
      <input name="primaryTaxonomyTermId" type="hidden" value={primary} />
      {[...additional].filter((id) => id !== primary).map((id) => (
        <input key={id} name="taxonomyTermIds" type="hidden" value={id} />
      ))}
      {[...selectedApplications].map((id) => (
        <input key={id} name="applicationIds" type="hidden" value={id} />
      ))}

      <fieldset className="grid gap-3">
        <legend>Primary Category — searchable single select</legend>
        <label className="grid gap-2">
          Search Primary Category
          <input
            className={inputClass}
            onChange={(event) => setPrimarySearch(event.target.value)}
            placeholder="Search name or dimension"
            type="search"
            value={primarySearch}
          />
        </label>
        <div className="grid max-h-48 gap-2 overflow-auto rounded-lg border border-white/10 p-3">
          {primaryOptions.map((term) => (
            <label className="flex min-w-0 gap-2 break-words" key={term.id}>
              <input
                checked={primary === term.id}
                disabled={!term.isActive && primary !== term.id}
                name="primaryTaxonomyChoice"
                onChange={() => {
                  setPrimary(term.id);
                  setAdditional((current) => {
                    const next = new Set(current);
                    next.delete(term.id);
                    return next;
                  });
                }}
                type="radio"
              />
              {term.name} · {term.dimension}{term.isActive ? "" : " · inactive"}
            </label>
          ))}
          {!primaryOptions.length ? <p className="text-sm text-slate-400">No matching Category.</p> : null}
        </div>
      </fieldset>

      <fieldset className="grid gap-3">
        <legend>Additional Categories — searchable multi-select</legend>
        <label className="grid gap-2">
          Search Additional Categories
          <input className={inputClass} onChange={(event) => setAdditionalSearch(event.target.value)} type="search" value={additionalSearch} />
        </label>
        <div className="grid max-h-48 gap-2 overflow-auto rounded-lg border border-white/10 p-3">
          {additionalOptions.map((term) => (
            <label className="flex min-w-0 gap-2 break-words" key={term.id}>
              <input
                checked={additional.has(term.id)}
                disabled={term.id === primary || (!term.isActive && !additional.has(term.id))}
                onChange={(event) => toggle(setAdditional, term.id, event.target.checked)}
                type="checkbox"
              />
              {term.name} · {term.dimension}{term.id === primary ? " · Primary" : ""}
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="grid gap-3">
        <legend>Applications — searchable multi-select</legend>
        <label className="grid gap-2">
          Search Applications
          <input className={inputClass} onChange={(event) => setApplicationSearch(event.target.value)} type="search" value={applicationSearch} />
        </label>
        <div className="grid max-h-48 gap-2 overflow-auto rounded-lg border border-white/10 p-3">
          {applicationOptions.map((application) => (
            <label className="flex min-w-0 gap-2 break-words" key={application.id}>
              <input
                checked={selectedApplications.has(application.id)}
                onChange={(event) =>
                  toggle(setSelectedApplications, application.id, event.target.checked)
                }
                type="checkbox"
              />
              {application.name} · {application.status}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="grid gap-3 rounded-lg border border-white/10 p-3">
          <strong>Quick-create Category</strong>
          <label className="grid gap-2">Name<input className={inputClass} onChange={(event) => setQuickTaxonomyName(event.target.value)} required value={quickTaxonomyName} /></label>
          <label className="grid gap-2">Dimension<select className={inputClass} onChange={(event) => setQuickTaxonomyDimension(event.target.value as TaxonomyDimension)} value={quickTaxonomyDimension}><option value="material_fiber">Material / Fiber</option><option value="structure_construction">Structure / Construction</option><option value="commercial_collection">Commercial Collection</option><option value="surface_hand_feel">Surface / Hand Feel</option></select></label>
          <label className="grid gap-2">Product Code Prefix (optional)<input className={inputClass} maxLength={8} onChange={(event) => setQuickTaxonomyPrefix(event.target.value.toUpperCase())} pattern="[A-Z]{3,8}" value={quickTaxonomyPrefix} /></label>
          <label className="grid gap-2">Select after creation<select className={inputClass} onChange={(event) => setQuickTaxonomyTarget(event.target.value as "primary" | "additional")} value={quickTaxonomyTarget}><option value="additional">Additional Category</option><option value="primary">Primary Category</option></select></label>
          <button className={buttonClass} disabled={pending || !quickTaxonomyName.trim() || Boolean(quickTaxonomyPrefix && !/^[A-Z]{3,8}$/.test(quickTaxonomyPrefix))} onClick={() => void quickCreateTaxonomy()} type="button">Create and select</button>
        </div>
        <div className="grid content-start gap-3 rounded-lg border border-white/10 p-3">
          <strong>Quick-create Application Draft</strong>
          <label className="grid gap-2">Name<input className={inputClass} onChange={(event) => setQuickApplicationName(event.target.value)} required value={quickApplicationName} /></label>
          <p className="text-xs text-slate-300">The new Application remains an internal Draft with no public Route or SEO record.</p>
          <button className={buttonClass} disabled={pending || !quickApplicationName.trim()} onClick={() => void quickCreateApplication()} type="button">Create and select</button>
        </div>
      </div>
      <div aria-live="polite" className="text-sm" role="status">
        {pending ? "Creating…" : result?.success ? `${result.label} created and selected.` : null}
      </div>
      <QuickCreateFeedback result={result} />
    </section>
  );
}
