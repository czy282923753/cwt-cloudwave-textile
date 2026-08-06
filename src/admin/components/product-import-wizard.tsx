"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type UploadedMedia = { assetId: string; uploadBatchId: string; relativePath: string; sha256: string };

const workbookMime = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

function declaredMime(file: File): string {
  if (file.type) return file.type;
  const extension = file.name.toLocaleLowerCase("en-US").split(".").at(-1);
  return extension === "xlsx" ? workbookMime
    : extension === "zip" ? "application/zip"
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

async function issueUpload(files: File[], isolatedPackage: boolean) {
  return json<{ batchId: string; intents: { token: string; uploadUrl: string }[] }>(await fetch("/api/admin/upload-intents/", {
    method: "POST",
    credentials: "same-origin",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      files: files.map((file) => ({ fileName: file.name, declaredMimeType: declaredMime(file), declaredByteSize: file.size })),
      category: isolatedPackage ? "other" : "product",
      role: isolatedPackage ? "document" : "gallery",
      sortOrder: 0,
      associationType: null,
      associationEntityId: null,
      sourceDeclarationEnabled: false,
      sourceDeclaration: null,
    }),
  }));
}

async function digest(file: File): Promise<string> {
  const value = await crypto.subtle.digest("SHA-256", await file.arrayBuffer());
  return [...new Uint8Array(value)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function uploadWithSameIntent<T>(uploadUrl: string, file: File): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      return await json<T>(await fetch(uploadUrl, {
        method: "PUT",
        credentials: "same-origin",
        headers: { "content-type": declaredMime(file) },
        body: file,
      }));
    } catch (error) {
      lastError = error;
      if (attempt === 0) await new Promise((resolve) => setTimeout(resolve, 250));
    }
  }
  throw lastError instanceof Error ? lastError : new Error("Upload replay failed safely.");
}

export function ProductImportWizard({ enabled }: { enabled: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  if (!enabled) return <p className="rounded-2xl border border-amber-300/30 bg-amber-950/30 p-6 text-amber-100">Product Import is disabled. Existing Product editing, Assets, and the public website remain available.</p>;
  return <form className="space-y-6 rounded-2xl border border-white/10 bg-slate-900 p-6" onSubmit={async (event) => {
    event.preventDefault();
    setBusy(true); setError(""); setStatus("Preparing isolated uploads…");
    try {
      const data = new FormData(event.currentTarget);
      const mode = String(data.get("mode"));
      const workbook = data.get("workbook");
      const archive = data.get("archive");
      const folder = data.getAll("folder").filter((value): value is File => value instanceof File && value.size > 0);
      if (!(workbook instanceof File) || !workbook.size) throw new Error("Choose the Template V1 workbook.");
      if (archive instanceof File && archive.size && folder.length) throw new Error("Choose either one ZIP or a folder, not both.");
      if (workbook.size > 10 * 1024 * 1024) throw new Error("The workbook exceeds 10 MB.");
      if (archive instanceof File && archive.size > 500 * 1024 * 1024) throw new Error("The ZIP exceeds 500 MB.");
      if (folder.length > 500) throw new Error("A folder import is limited to 500 images.");
      if (folder.some((file) => file.size > 20 * 1024 * 1024)) throw new Error("Each image must be 20 MB or smaller.");
      const packageFiles = [workbook, ...(archive instanceof File && archive.size ? [archive] : [])];
      const packageUpload = await issueUpload(packageFiles, true);
      let workbookAssetId = "";
      let mediaPackageAssetId: string | null = null;
      const media: UploadedMedia[] = [];
      for (const [index, file] of packageFiles.entries()) {
        setStatus(`Uploading isolated package ${index + 1} of ${packageFiles.length}…`);
        const intent = packageUpload.intents[index]!;
        const response = await uploadWithSameIntent<{ assetId: string; media?: UploadedMedia[] }>(intent.uploadUrl, file);
        if (file === workbook) workbookAssetId = response.assetId;
        else {
          mediaPackageAssetId = response.assetId;
          media.push(...(response.media ?? []).map((item) => ({
            assetId: item.assetId,
            uploadBatchId: item.uploadBatchId,
            relativePath: item.relativePath,
            sha256: item.sha256,
          })));
        }
      }
      await json(await fetch(`/api/admin/upload-batches/${packageUpload.batchId}/finalize/`, {
        method: "POST", credentials: "same-origin", headers: { "content-type": "application/json" }, body: "{}",
      }));
      for (let start = 0; start < folder.length; start += 8) {
        const files = folder.slice(start, start + 8);
        const upload = await issueUpload(files, false);
        const uploaded: Array<{ assetId: string; file: File }> = [];
        for (const [index, file] of files.entries()) {
          setStatus(`Uploading folder image ${start + index + 1} of ${folder.length}…`);
          const response = await uploadWithSameIntent<{ assetId: string }>(upload.intents[index]!.uploadUrl, file);
          uploaded.push({ assetId: response.assetId, file });
        }
        await json(await fetch(`/api/admin/upload-batches/${upload.batchId}/finalize/`, {
          method: "POST", credentials: "same-origin", headers: { "content-type": "application/json" }, body: "{}",
        }));
        for (const item of uploaded) media.push({
          assetId: item.assetId,
          uploadBatchId: upload.batchId,
          relativePath: item.file.webkitRelativePath || item.file.name,
          sha256: await digest(item.file),
        });
      }
      setStatus("Validating Template V1 rows and deterministic image matches…");
      const created = await json<{ batchId: string }>(await fetch("/api/admin/product-imports/", {
        method: "POST", credentials: "same-origin", headers: { "content-type": "application/json" },
        body: JSON.stringify({ mode, workbookAssetId, mediaPackageAssetId, media }),
      }));
      setStatus("Validation preview is ready.");
      router.push(`/admin/product-imports/${created.batchId}/`);
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Import preparation failed safely.");
      setStatus("");
    } finally { setBusy(false); }
  }}>
    <fieldset className="grid gap-3 sm:grid-cols-2"><legend className="mb-2 font-semibold">Immutable batch mode</legend>
      <label className="rounded-xl border border-white/10 p-4"><input defaultChecked name="mode" type="radio" value="create" /> <span className="ml-2">Create new Draft Products</span></label>
      <label className="rounded-xl border border-white/10 p-4"><input name="mode" type="radio" value="update" /> <span className="ml-2">Update by complete Product Code</span></label>
    </fieldset>
    <label className="block"><span className="mb-2 block font-semibold">Template V1 workbook (.xlsx, max 10 MB)</span><input accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" className="block w-full rounded-xl border border-white/20 p-3" name="workbook" required type="file" /></label>
    <label className="block"><span className="mb-2 block font-semibold">Optional image ZIP (max 500 MB)</span><input accept=".zip,application/zip" className="block w-full rounded-xl border border-white/20 p-3" name="archive" type="file" /></label>
    <label className="block"><span className="mb-2 block font-semibold">Or optional image folder (max 500 images)</span><input accept="image/jpeg,image/png,image/webp,image/avif" className="block w-full rounded-xl border border-white/20 p-3" multiple name="folder" type="file" {...({ webkitdirectory: "" } as React.InputHTMLAttributes<HTMLInputElement>)} /></label>
    {status ? <p aria-live="polite" className="rounded-xl bg-slate-800 p-3 text-teal-200" role="status">{status}</p> : null}
    {error ? <p aria-live="assertive" className="rounded-xl bg-red-950 p-3 text-red-100" role="alert">{error}</p> : null}
    <button className="rounded-xl bg-teal-400 px-5 py-3 font-semibold text-slate-950 disabled:opacity-50" disabled={busy} type="submit">{busy ? "Preparing…" : "Upload and validate"}</button>
  </form>;
}
