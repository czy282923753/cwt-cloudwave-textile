// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

const push = vi.fn();
const refresh = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, refresh }),
}));

import { ProductImportWizard } from "./product-import-wizard";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

describe("ProductImportWizard upload replay", () => {
  afterEach(() => {
    cleanup();
    push.mockReset();
    refresh.mockReset();
    vi.unstubAllGlobals();
  });

  it("reuses the same Upload Intent after a lost response", async () => {
    const uploadUrl = "/api/admin/upload-intents/synthetic-replay-token/";
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse({
        batchId: "synthetic-package-batch",
        intents: [{ token: "synthetic-replay-token", uploadUrl }],
      }, 201))
      .mockRejectedValueOnce(new TypeError("synthetic response loss"))
      .mockResolvedValueOnce(jsonResponse({ ok: true, assetId: "synthetic-workbook-asset" }, 201))
      .mockResolvedValueOnce(jsonResponse({ ok: true, assetIds: ["synthetic-workbook-asset"] }))
      .mockResolvedValueOnce(jsonResponse({ ok: true, batchId: "synthetic-import-batch" }, 201))
      .mockResolvedValueOnce(jsonResponse({ ok: true, batchId: "synthetic-import-batch" }));
    vi.stubGlobal("fetch", fetchMock);

    const user = userEvent.setup();
    render(<ProductImportWizard enabled />);
    const workbook = new File(
      [new Uint8Array([0x50, 0x4b, 0x03, 0x04])],
      "CWT-Product-Import-Template-V1.xlsx",
      { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" },
    );
    await user.upload(screen.getByLabelText(/Template V1 workbook/i), workbook);
    vi.stubGlobal("FormData", class SyntheticProductImportFormData {
      get(name: string): FormDataEntryValue | null {
        if (name === "mode") return "create";
        if (name === "workbook") return workbook;
        return null;
      }

      getAll(): FormDataEntryValue[] {
        return [];
      }
    } as unknown as typeof FormData);
    const form = screen.getByRole("button", { name: "Upload and validate" }).closest("form");
    if (!form) throw new Error("Missing Product Import form.");
    fireEvent.submit(form);

    await waitFor(() => expect(push).toHaveBeenCalledWith("/admin/product-imports/synthetic-import-batch/"));
    const replayCalls = fetchMock.mock.calls.filter(([url]) => url === uploadUrl);
    expect(replayCalls).toHaveLength(2);
    expect(replayCalls[0]?.[1]).toMatchObject({ method: "PUT", body: replayCalls[1]?.[1]?.body });
    expect(refresh).toHaveBeenCalledTimes(1);
  });
});
