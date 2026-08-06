"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type RawRow = Record<string, unknown>;

const textValue = (raw: RawRow, key: string): string => typeof raw[key] === "string" ? raw[key] as string : "";
const listValue = (raw: RawRow, key: string): string => Array.isArray(raw[key]) ? (raw[key] as unknown[]).filter((item): item is string => typeof item === "string").join("; ") : "";

export function ProductImportRowCorrection({ batchId, itemId, raw }: { batchId: string; itemId: string; raw: RawRow }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const fields = [
    ["name", "Name"], ["productCode", "Product Code"], ["primaryCategory", "Primary Category"],
    ["additionalCategories", "Additional Categories (; separated)"], ["applications", "Applications (; separated)"],
    ["tags", "Tags (; separated)"], ["composition", "Composition"], ["gsm", "GSM"], ["width", "Width"],
    ["moqValue", "MOQ Value"], ["moqUnit", "MOQ Unit"], ["moqNote", "MOQ Note"], ["slug", "Slug"],
    ["summary", "Summary"], ["description", "Description"], ["imageFiles", "Image Files (; separated)"],
    ["primaryImageAlt", "Primary Image Alt"], ["primaryImageCaption", "Primary Image Caption"],
  ] as const;
  const lists = new Set(["additionalCategories", "applications", "tags", "imageFiles"]);
  return <details className="mt-2 rounded-lg border border-white/10 p-3"><summary className="cursor-pointer text-teal-200">Correct this Row Error</summary><form className="mt-4 grid gap-3 sm:grid-cols-2" onSubmit={async (event) => {
    event.preventDefault(); setBusy(true); setMessage("");
    const form = new FormData(event.currentTarget);
    const body: Record<string, string | string[]> = {};
    for (const [key] of fields) {
      const value = String(form.get(key) ?? "").trim();
      if (!value) continue;
      body[key] = lists.has(key) ? value.split(";").map((item) => item.trim()).filter(Boolean) : value;
    }
    try {
      const response = await fetch(`/api/admin/product-imports/${batchId}/items/${itemId}/correct/`, { method: "POST", credentials: "same-origin", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error ?? "Correction failed safely.");
      setMessage("Correction validated. The row is ready for explicit Apply."); router.refresh();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Correction failed safely."); }
    finally { setBusy(false); }
  }}>{fields.map(([key, label]) => <label className={key === "description" || key === "summary" ? "sm:col-span-2" : ""} key={key}><span className="mb-1 block text-xs text-slate-300">{label}</span>{key === "description" || key === "summary" ? <textarea className="min-h-24 w-full rounded-lg border border-white/20 bg-slate-950 p-2" defaultValue={textValue(raw, key)} name={key} /> : <input className="w-full rounded-lg border border-white/20 bg-slate-950 p-2" defaultValue={lists.has(key) ? listValue(raw, key) : textValue(raw, key)} name={key} />}</label>)}<div className="sm:col-span-2"><button className="rounded-lg bg-teal-400 px-4 py-2 font-semibold text-slate-950 disabled:opacity-50" disabled={busy} type="submit">{busy ? "Validating…" : "Validate correction"}</button>{message ? <p aria-live="polite" className="mt-2 text-sm">{message}</p> : null}</div></form></details>;
}
