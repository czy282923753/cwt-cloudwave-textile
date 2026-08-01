// @vitest-environment jsdom

import { render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { AdminActionResult } from "@/admin/action-result";

const refresh = vi.fn();
const invokeAdminAction = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh }),
}));

vi.mock("@/admin/invoke-admin-action", () => ({
  invokeAdminAction: (...args: unknown[]) => invokeAdminAction(...args),
}));

import { AdminActionForm } from "./admin-action-form";

const action = async (): Promise<void> => undefined;

describe("AdminActionForm", () => {
  beforeEach(() => {
    refresh.mockReset();
    invokeAdminAction.mockReset();
  });

  it("blocks duplicate submission, announces success, and refreshes real page data", async () => {
    let resolveResult!: (result: AdminActionResult) => void;
    invokeAdminAction.mockImplementation(() => new Promise<AdminActionResult>((resolve) => {
      resolveResult = resolve;
    }));
    const user = userEvent.setup();
    render(<AdminActionForm action={action} successMessage="Author saved."><input name="name" defaultValue="CWT Team" /><button type="submit">Save</button></AdminActionForm>);
    const button = screen.getByRole("button", { name: "Save" });
    await user.click(button);
    await user.click(button);
    expect(invokeAdminAction).toHaveBeenCalledTimes(1);
    expect(screen.getByText("Saving…")).toBeInTheDocument();
    resolveResult({ success: true, message: "Author saved.", intent: "refresh" });
    await waitFor(() => expect(screen.getByText("Author saved.")).toBeInTheDocument());
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it("focuses and announces a safe permission or conflict summary", async () => {
    invokeAdminAction.mockResolvedValue({
      success: false,
      message: "You do not have permission to perform this operation.",
      formError: "Permission denied.",
      fieldErrors: {},
      errorKind: "permission",
      intent: "none",
    } satisfies AdminActionResult);
    const user = userEvent.setup();
    render(<AdminActionForm action={action}><button type="submit">Publish</button></AdminActionForm>);
    await user.click(screen.getByRole("button", { name: "Publish" }));
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveFocus();
    expect(alert).toHaveTextContent("Permission denied");
    expect(refresh).not.toHaveBeenCalled();
  });
});
