"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import type { RetryableAdminUploadBatch } from "@/uploads/admin-upload-service";

type Feedback = {
  kind: "success" | "error";
  message: string;
};

async function readResult(response: Response): Promise<Record<string, unknown>> {
  try {
    const value: unknown = await response.json();
    return typeof value === "object" && value !== null
      ? value as Record<string, unknown>
      : {};
  } catch {
    return {};
  }
}

function safeRetryFailure(response: Response, result: Record<string, unknown>): string {
  if (response.status === 401 || response.status === 403 || result.errorCode === "FORBIDDEN") {
    return "You do not have permission to retry this upload.";
  }
  const safeError = typeof result.error === "string" ? result.error : "";
  if (/expired/i.test(safeError)) {
    return "The original file has expired and can no longer be processed.";
  }
  if (/already finalized|already uploaded|already released/i.test(safeError)) {
    return "This upload was already processed by another task. Refreshing the Asset Library.";
  }
  if (/changed|lease|another finalize|not ready|incomplete|unavailable/i.test(safeError)) {
    return "The upload state changed or another task is processing it. Refresh and try again if it remains available.";
  }
  return "The upload could not be processed safely. You can retry while it remains listed.";
}

export function RetryableAssetBatches({ batches }: Readonly<{
  batches: readonly RetryableAdminUploadBatch[];
}>) {
  const router = useRouter();
  const [removedBatchIds, setRemovedBatchIds] = useState<ReadonlySet<string>>(() => new Set());
  const [processingBatchId, setProcessingBatchId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const errorRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    if (feedback?.kind === "error") errorRef.current?.focus();
  }, [feedback]);

  async function retry(batch: RetryableAdminUploadBatch): Promise<void> {
    if (processingBatchId) return;
    setProcessingBatchId(batch.batchId);
    setFeedback(null);
    try {
      const response = await fetch(
        `/api/admin/upload-batches/${encodeURIComponent(batch.batchId)}/finalize/`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: "{}",
        },
      );
      const result = await readResult(response);
      if (!response.ok || result.ok !== true) {
        const message = safeRetryFailure(response, result);
        if (/already processed/i.test(message)) {
          setRemovedBatchIds((current) => new Set(current).add(batch.batchId));
          setFeedback({ kind: "success", message });
          router.refresh();
          return;
        }
        setFeedback({ kind: "error", message });
        return;
      }

      const releasedAssetIds = Array.isArray(result.assetIds)
        ? result.assetIds.filter((assetId): assetId is string => typeof assetId === "string")
        : [];
      if (!releasedAssetIds[0]) {
        setFeedback({
          kind: "error",
          message: "Processing finished without a valid Asset result. Refresh before trying again.",
        });
        return;
      }
      const alreadyFinalized = result.alreadyFinalized === true;
      setRemovedBatchIds((current) => new Set(current).add(batch.batchId));
      setFeedback({
        kind: "success",
        message: alreadyFinalized
          ? "This upload had already been processed. The Asset Library is now up to date."
          : "Upload processing completed. The original file was reused; no re-upload was needed.",
      });
      router.replace(`/admin/assets/?processed=${encodeURIComponent(releasedAssetIds[0])}`);
    } catch {
      setFeedback({
        kind: "error",
        message: "The server could not be reached. The original upload is still available to retry.",
      });
    } finally {
      setProcessingBatchId(null);
    }
  }

  const visibleBatches = batches.filter((batch) => !removedBatchIds.has(batch.batchId));
  if (!visibleBatches.length && !feedback) return null;

  return (
    <section aria-labelledby="retryable-uploads-heading" className="mb-8 rounded-2xl border border-amber-300/30 bg-amber-950/20 p-5">
      <div>
        <h2 className="text-lg font-semibold text-amber-100" id="retryable-uploads-heading">Uploads that need processing</h2>
        <p className="mt-1 text-sm text-amber-50/80">These files are already stored securely. Retry processing without uploading them again.</p>
      </div>
      {visibleBatches.length ? (
        <ul className="mt-4 grid gap-3">
          {visibleBatches.map((batch) => {
            const pending = processingBatchId === batch.batchId;
            const firstName = batch.fileNames[0] ?? "Uploaded file";
            const additional = batch.fileCount > 1 ? ` + ${batch.fileCount - 1} more` : "";
            return (
              <li className="grid gap-3 rounded-xl border border-white/10 bg-slate-950/70 p-4 md:grid-cols-[1fr_auto] md:items-center" key={batch.batchId}>
                <div>
                  <p className="font-medium text-white">{firstName}{additional}</p>
                  <p className="mt-1 text-sm text-slate-300">
                    Uploaded {new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" }).format(new Date(batch.uploadedAt))} UTC
                  </p>
                  <p className="mt-1 text-sm font-medium text-amber-100">Status: Ready to retry</p>
                  <p className="mt-2 text-sm text-amber-100">Processing was interrupted. You can retry without uploading the file again.</p>
                </div>
                <button
                  className="rounded-xl bg-amber-300 px-4 py-2 font-semibold text-slate-950 disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={processingBatchId !== null}
                  onClick={() => void retry(batch)}
                  type="button"
                >
                  {pending ? "Retrying processing…" : "Retry processing"}
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
      {feedback ? (
        <p
          aria-live={feedback.kind === "error" ? "assertive" : "polite"}
          className={feedback.kind === "error" ? "mt-4 rounded-lg border border-red-300/40 p-3 text-sm text-red-100" : "mt-4 text-sm text-teal-200"}
          ref={feedback.kind === "error" ? errorRef : undefined}
          role={feedback.kind === "error" ? "alert" : "status"}
          tabIndex={feedback.kind === "error" ? -1 : undefined}
        >
          {feedback.message}
        </p>
      ) : null}
    </section>
  );
}
