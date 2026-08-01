// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const refresh = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh }),
}));

import { AssetUploadForm } from "./asset-upload-form";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

describe("AssetUploadForm feedback", () => {
  afterEach(() => {
    cleanup();
    refresh.mockReset();
    vi.unstubAllGlobals();
  });

  it("announces and focuses a sanitized Finalize failure without refreshing", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse({
        batchId: "test-batch",
        intents: [{ uploadUrl: "/api/admin/upload-intents/test-token/" }],
      }, 201))
      .mockResolvedValueOnce(jsonResponse({ ok: true, assetId: "test-asset" }, 201))
      .mockResolvedValueOnce(jsonResponse({
        ok: false,
        error: "The operation failed safely; no partial change was committed.",
        errorCode: "UNKNOWN_ERROR",
      }, 500));
    vi.stubGlobal("fetch", fetchMock);
    render(<AssetUploadForm associations={[]} />);
    const fileInput = screen.getByLabelText("Files");
    fireEvent.change(fileInput, {
      target: {
        files: [new File([new Uint8Array([1, 2, 3])], "fixture.png", { type: "image/png" })],
      },
    });
    const form = screen.getByRole("button", { name: "Upload and process" }).closest("form");
    if (!form) throw new Error("Missing Asset upload form.");
    fireEvent.submit(form);
    const alert = await screen.findByRole("alert");
    await waitFor(() => expect(alert).toHaveFocus());
    expect(alert).toHaveTextContent("failed safely");
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(refresh).not.toHaveBeenCalled();
  });

  it("announces successful Finalize before scheduling the persisted-list refresh", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse({
        batchId: "test-success-batch",
        intents: [{ uploadUrl: "/api/admin/upload-intents/test-success-token/" }],
      }, 201))
      .mockResolvedValueOnce(jsonResponse({ ok: true, assetId: "test-success-asset" }, 201))
      .mockResolvedValueOnce(jsonResponse({ ok: true, assetIds: ["test-success-asset"] }));
    vi.stubGlobal("fetch", fetchMock);
    render(<AssetUploadForm associations={[]} />);
    fireEvent.change(screen.getByLabelText("Files"), {
      target: {
        files: [new File([new Uint8Array([1, 2, 3])], "fixture-success.png", { type: "image/png" })],
      },
    });
    const form = screen.getByRole("button", { name: "Upload and process" }).closest("form");
    if (!form) throw new Error("Missing Asset upload form.");
    fireEvent.submit(form);
    expect(await screen.findByRole("status")).toHaveTextContent("1 asset uploaded and released");
    await waitFor(() => expect(refresh).toHaveBeenCalledTimes(1));
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });
});
