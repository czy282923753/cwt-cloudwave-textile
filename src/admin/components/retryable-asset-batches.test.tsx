// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const refresh = vi.fn();
const replace = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh, replace }),
}));

import { RetryableAssetBatches } from "./retryable-asset-batches";

const batch = {
  batchId: "11111111-1111-4111-8111-111111111111",
  fileNames: ["TEST interrupted fabric.jpg"],
  fileCount: 1,
  uploadedAt: new Date("2026-08-02T08:00:00.000Z"),
  status: "retryable" as const,
  reason: "processing_interrupted" as const,
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

describe("RetryableAssetBatches", () => {
  afterEach(() => {
    cleanup();
    refresh.mockReset();
    replace.mockReset();
    vi.unstubAllGlobals();
  });

  it("reuses the original batch, prevents duplicate clicks, and announces success before refresh", async () => {
    let release: ((response: Response) => void) | undefined;
    const pending = new Promise<Response>((resolve) => { release = resolve; });
    const fetchMock = vi.fn(() => pending);
    vi.stubGlobal("fetch", fetchMock);
    render(<RetryableAssetBatches batches={[batch]} />);

    expect(screen.getByText("TEST interrupted fabric.jpg")).toBeVisible();
    expect(screen.getByText(/without uploading the file again/i)).toBeVisible();
    const button = screen.getByRole("button", { name: "Retry processing" });
    fireEvent.click(button);
    expect(await screen.findByRole("button", { name: "Retrying processing…" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Retrying processing…" }));
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      `/api/admin/upload-batches/${batch.batchId}/finalize/`,
      expect.objectContaining({ method: "POST", body: "{}" }),
    );

    release?.(jsonResponse({ ok: true, success: true, assetIds: ["asset-1"], alreadyFinalized: false }));
    expect(await screen.findByRole("status")).toHaveTextContent(/no re-upload was needed/i);
    expect(screen.queryByText("TEST interrupted fabric.jpg")).not.toBeInTheDocument();
    expect(replace).toHaveBeenCalledWith("/admin/assets/?processed=asset-1");
    expect(refresh).not.toHaveBeenCalled();
  });

  it("keeps the original retry entry and focuses a safe state-change error", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({
      ok: false,
      error: "The operation could not be completed. Admin Upload Batch recovery is not ready for another Finalize attempt.",
      errorCode: "VALIDATION_ERROR",
    }, 400)));
    render(<RetryableAssetBatches batches={[batch]} />);
    fireEvent.click(screen.getByRole("button", { name: "Retry processing" }));

    const alert = await screen.findByRole("alert");
    await waitFor(() => expect(alert).toHaveFocus());
    expect(alert).toHaveTextContent(/state changed or another task/i);
    expect(screen.getByText("TEST interrupted fabric.jpg")).toBeVisible();
    expect(refresh).not.toHaveBeenCalled();
    expect(replace).not.toHaveBeenCalled();
  });

  it("reports permission, expiry, and network failures without exposing provider details", async () => {
    for (const fixture of [
      { response: jsonResponse({ ok: false, errorCode: "FORBIDDEN" }, 403), expected: /do not have permission/i },
      { response: jsonResponse({ ok: false, error: "Admin Upload Batch is expired." }, 400), expected: /has expired/i },
    ]) {
      const view = render(<RetryableAssetBatches batches={[batch]} />);
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue(fixture.response));
      fireEvent.click(screen.getByRole("button", { name: "Retry processing" }));
      expect(await screen.findByRole("alert")).toHaveTextContent(fixture.expected);
      view.unmount();
    }
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("s3 secret provider stack")));
    render(<RetryableAssetBatches batches={[batch]} />);
    fireEvent.click(screen.getByRole("button", { name: "Retry processing" }));
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(/server could not be reached/i);
    expect(alert).not.toHaveTextContent(/s3|provider|stack/i);
  });
});
