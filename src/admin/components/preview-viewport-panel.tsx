"use client";

function openPreview(href: string, label: string, width: number, height: number) {
  window.open(
    href,
    `cwt-${label.toLowerCase()}-${width}`,
    `popup=yes,width=${width},height=${height},resizable=yes,scrollbars=yes`,
  );
}

export function PreviewViewportPanel({
  href,
  label,
}: Readonly<{ href: string; label: string }>) {
  return (
    <section className="grid gap-3 rounded-xl border border-white/10 p-4">
      <h3 className="font-semibold">Desktop and Mobile Draft Preview</h3>
      <p className="text-sm text-slate-400">
        Opens authenticated noindex Preview windows without weakening the global
        frame-ancestor policy or altering live state.
      </p>
      <div className="flex flex-wrap gap-3">
        <button
          className="rounded-lg border border-white/20 px-3 py-2 text-sm"
          onClick={() => openPreview(href, label, 1200, 850)}
          type="button"
        >
          Open Desktop · 1200px
        </button>
        <button
          className="rounded-lg border border-white/20 px-3 py-2 text-sm"
          onClick={() => openPreview(href, label, 390, 844)}
          type="button"
        >
          Open Mobile · 390px
        </button>
      </div>
    </section>
  );
}
