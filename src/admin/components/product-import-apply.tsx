"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function ProductImportApply({ batchId, retry = false, cancel = false, resume = false }: { batchId: string; retry?: boolean; cancel?: boolean; resume?: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  return <button className="rounded-xl bg-teal-400 px-4 py-3 font-semibold text-slate-950 disabled:opacity-50" disabled={busy} onClick={async () => {
    setBusy(true); setMessage("");
    try {
      const response = await fetch(`/api/admin/product-imports/${batchId}/${cancel ? "cancel" : retry ? "retry" : "apply"}/`, { method: "POST", credentials: "same-origin" });
      const body = await response.json() as { error?: string };
      if (!response.ok) throw new Error(body.error ?? "Operation failed safely.");
      setMessage(cancel ? "Import cancelled before Apply." : retry ? "Row Errors are ready for another explicit Apply." : resume ? "Import continuation finished. Refreshing durable results." : "Apply finished. Refreshing durable results.");
      router.refresh();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Operation failed safely."); }
    finally { setBusy(false); }
  }} type="button">{busy ? "Working…" : cancel ? "Cancel before Apply" : retry ? "Prepare only Row Errors for retry" : resume ? "Resume interrupted Apply" : "Apply valid rows"}{message ? <span className="sr-only" aria-live="polite">{message}</span> : null}</button>;
}
