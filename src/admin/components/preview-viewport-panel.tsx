"use client";

import { useState } from "react";

export function openPreview(href: string, label: string, width: number, height: number): boolean {
  const preview = window.open(
    "about:blank",
    `cwt-${label.toLowerCase()}-${width}`,
    `popup=yes,width=${width},height=${height},resizable=yes,scrollbars=yes`,
  );
  if (!preview) return false;
  preview.opener = null;
  const protectedLink = preview.document.createElement("a");
  protectedLink.href = href;
  protectedLink.rel = "noopener noreferrer";
  protectedLink.referrerPolicy = "no-referrer";
  protectedLink.textContent = "Open protected preview";
  preview.document.body.append(protectedLink);
  protectedLink.click();
  return true;
}

export function PreviewViewportPanel({
  href,
  label,
}: Readonly<{ href: string; label: string }>) {
  const [status, setStatus] = useState("");
  const open = (width: number, height: number) => {
    const opened = openPreview(href, label, width, height);
    setStatus(opened
      ? "Preview opened in a separate protected window."
      : "Preview was blocked by the browser. Allow pop-ups for this localhost site and try again.");
  };
  return (
    <section className="grid min-w-0 gap-3 rounded-xl border border-white/10 p-4">
      <h3 className="font-semibold">Desktop and Mobile Draft Preview</h3>
      <p className="text-sm text-slate-400">
        Opens authenticated noindex Preview windows without weakening the global
        frame-ancestor policy or altering live state.
      </p>
      <div className="flex flex-wrap gap-3">
        <button
          className="rounded-lg border border-white/20 px-3 py-2 text-sm"
          onClick={() => open(1200, 850)}
          type="button"
        >
          Open Desktop · 1200px
        </button>
        <button
          className="rounded-lg border border-white/20 px-3 py-2 text-sm"
          onClick={() => open(390, 844)}
          type="button"
        >
          Open Mobile · 390px
        </button>
      </div>
      <p aria-live="polite" className="text-sm text-amber-100" role="status">{status}</p>
    </section>
  );
}
