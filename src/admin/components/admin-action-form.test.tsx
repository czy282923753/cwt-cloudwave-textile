// @vitest-environment jsdom

import { cleanup, render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { AdminActionResult } from "@/admin/action-result";

const refresh = vi.fn();
const push = vi.fn();
const invokeAdminAction = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, refresh }),
}));

vi.mock("@/admin/invoke-admin-action", () => ({
  invokeAdminAction: (...args: unknown[]) => invokeAdminAction(...args),
}));

import { AdminActionForm } from "./admin-action-form";

const action = async () => ({ refresh: true });

describe("AdminActionForm", () => {
  afterEach(cleanup);

  beforeEach(() => {
    refresh.mockReset();
    push.mockReset();
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
    resolveResult({ success: true, message: "Author saved.", intent: "refresh", refresh: true });
    await waitFor(() => expect(screen.getByText("Author saved.")).toBeInTheDocument());
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it("focuses and announces a safe permission or conflict summary", async () => {
    invokeAdminAction.mockResolvedValue({
      success: false,
      message: "You do not have permission to perform this operation.",
      formError: "Permission denied.",
      fieldErrors: {},
      errorCode: "FORBIDDEN",
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

  it("announces success before following a testable redirect intent", async () => {
    invokeAdminAction.mockResolvedValue({
      success: true,
      message: "Product created.",
      entityId: "product-1",
      redirectTo: "/admin/products/product-1/",
      intent: "redirect",
      refresh: false,
    } satisfies AdminActionResult);
    const user = userEvent.setup();
    render(<AdminActionForm action={action}><button type="submit">Create</button></AdminActionForm>);
    await user.click(screen.getByRole("button", { name: "Create" }));
    expect(await screen.findByText("Product created.")).toBeInTheDocument();
    await waitFor(() => expect(push).toHaveBeenCalledWith("/admin/products/product-1/"));
    expect(refresh).not.toHaveBeenCalled();
  });

  it("binds field errors to controls and focuses the error summary", async () => {
    invokeAdminAction.mockResolvedValue({
      success: false,
      message: "Check the highlighted information and try again.",
      formError: "Some submitted fields are invalid.",
      fieldErrors: {
        name: ["name is required."],
        slug: ["slug is required."],
      },
      errorCode: "VALIDATION_ERROR",
      intent: "none",
    } satisfies AdminActionResult);
    const user = userEvent.setup();
    render(
      <AdminActionForm action={action} noValidate>
        <input aria-label="Name" name="name" />
        <input aria-label="Slug" name="slug" />
        <button type="submit">Save</button>
      </AdminActionForm>,
    );
    await user.click(screen.getByRole("button", { name: "Save" }));
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveFocus();
    expect(screen.getByLabelText("Name")).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByLabelText("Slug")).toHaveAttribute("aria-invalid", "true");
    expect(alert).toHaveTextContent("name is required");
    expect(alert).toHaveTextContent("slug is required");
    expect(push).not.toHaveBeenCalled();
  });

  it("reports a sanitized network failure without refresh or redirect", async () => {
    invokeAdminAction.mockRejectedValue(new Error("socket included secret detail"));
    const user = userEvent.setup();
    render(<AdminActionForm action={action}><button type="submit">Save network</button></AdminActionForm>);
    await user.click(screen.getByRole("button", { name: "Save network" }));
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("server could not be reached");
    expect(alert).not.toHaveTextContent("secret detail");
    expect(refresh).not.toHaveBeenCalled();
    expect(push).not.toHaveBeenCalled();
  });

  it("keeps local form values and offers an explicit reload for a typed conflict", async () => {
    invokeAdminAction.mockResolvedValue({
      success: false,
      message: "This record changed or conflicts with another record.",
      formError: "Refresh the page, review the latest data, and try again.",
      fieldErrors: {},
      errorCode: "CONFLICT",
      intent: "none",
    } satisfies AdminActionResult);
    const user = userEvent.setup();
    render(
      <AdminActionForm action={action}>
        <label>Draft title<input defaultValue="Local unsaved title" name="title" /></label>
        <button type="submit">Save Draft</button>
      </AdminActionForm>,
    );
    await user.click(screen.getByRole("button", { name: "Save Draft" }));
    expect(await screen.findByRole("button", { name: "Reload latest server Draft" }))
      .toBeInTheDocument();
    expect(screen.getByLabelText("Draft title")).toHaveValue("Local unsaved title");
    expect(refresh).not.toHaveBeenCalled();
  });
});
