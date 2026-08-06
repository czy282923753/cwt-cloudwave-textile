"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

function declaredMime(file: File): string {
  if (file.type) return file.type;
  const extension = file.name.toLocaleLowerCase("en-US").split(".").at(-1);
  return extension === "zip" ? "application/zip"
    : extension === "jpg" || extension === "jpeg" ? "image/jpeg"
      : extension === "png" ? "image/png"
        : extension === "webp" ? "image/webp"
          : extension === "avif" ? "image/avif"
            : "application/octet-stream";
}

async function json<T>(response: Response): Promise<T> {
  const body = await response.json() as T & { ok?: boolean; error?: string };
  if (!response.ok || body.ok === false) throw new Error(body.error ?? "Request failed safely.");
  return body;
}

async function uploadSameIntent(uploadUrl: string, file: File): Promise<void> {
  let lastError: unknown;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      await json(await fetch(uploadUrl, {
        method: "PUT", credentials: "same-origin",
        headers: { "content-type": declaredMime(file) }, body: file,
      }));
      return;
    } catch (error) {
      lastError = error;
      if (attempt === 0) await new Promise((resolve) => setTimeout(resolve, 250));
    }
  }
  throw lastError instanceof Error ? lastError : new Error("Upload replay failed safely.");
}

export function ProductImportResume({ batchId, preparationKind }: { batchId: string; preparationKind: "none" | "folder" | "archive" }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  return <form className="mb-6 space-y-3 rounded-xl border border-amber-300/30 bg-amber-950/30 p-4" onSubmit={async (event) => {
    event.preventDefault();
    setBusy(true); setMessage("");
    try {
      const selected = new FormData(event.currentTarget).getAll("resumeFiles").filter((value): value is File => value instanceof File && value.size > 0);
      if (preparationKind !== "none" && !selected.length) throw new Error(`Re-select the same ${preparationKind === "archive" ? "ZIP" : "folder"} to continue.`);
      for (const file of selected) {
        const relativePath = file.webkitRelativePath || file.name;
        const upload = await json<{ batchId: string; intents: Array<{ uploadUrl: string }> }>(await fetch(`/api/admin/product-imports/${batchId}/uploads/`, {
          method: "POST", credentials: "same-origin", headers: { "content-type": "application/json" },
          body: JSON.stringify({
            kind: preparationKind === "archive" ? "archive_package" : "folder_media",
            ...(preparationKind === "folder" ? { relativePath } : {}),
            fileName: file.name,
            declaredMimeType: declaredMime(file),
            declaredByteSize: file.size,
          }),
        }));
        await uploadSameIntent(upload.intents[0]!.uploadUrl, file);
        await json(await fetch(`/api/admin/upload-batches/${upload.batchId}/finalize/`, {
          method: "POST", credentials: "same-origin", headers: { "content-type": "application/json" }, body: "{}",
        }));
      }
      await json(await fetch(`/api/admin/product-imports/${batchId}/validate/`, { method: "POST", credentials: "same-origin" }));
      setMessage("Durable preparation resumed and validation completed.");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Preparation could not resume safely.");
    } finally {
      setBusy(false);
    }
  }}>
    <p className="text-amber-100">This preparation is durable. Completed files reuse the same Batch and Asset. If upload was interrupted, re-select the same {preparationKind === "archive" ? "ZIP" : preparationKind === "folder" ? "folder" : "source"}; no completed file is allocated again.</p>
    {preparationKind === "archive" ? <input accept=".zip,application/zip" name="resumeFiles" type="file" /> : null}
    {preparationKind === "folder" ? <input accept="image/jpeg,image/png,image/webp,image/avif" multiple name="resumeFiles" type="file" {...({ webkitdirectory: "" } as React.InputHTMLAttributes<HTMLInputElement>)} /> : null}
    <div className="flex flex-wrap gap-3">
      <button className="rounded-xl bg-teal-400 px-4 py-3 font-semibold text-slate-950 disabled:opacity-50" disabled={busy} type="submit">{busy ? "Resuming…" : preparationKind === "none" ? "Resume validation" : "Resume with the same files"}</button>
      <span aria-live="polite" className="self-center text-sm text-amber-100" role="status">{message}</span>
    </div>
  </form>;
}
