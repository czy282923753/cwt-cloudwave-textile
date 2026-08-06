// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { openPreview, PreviewViewportPanel } from "./preview-viewport-panel";

describe("protected Preview popup", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("severs opener and navigates through a noopener noreferrer link", () => {
    const click = vi.fn();
    const link = { href: "", rel: "", referrerPolicy: "", textContent: "", click };
    const popup = {
      opener: window,
      document: {
        createElement: vi.fn(() => link),
        body: { append: vi.fn() },
      },
    };
    vi.spyOn(window, "open").mockReturnValue(popup as unknown as Window);
    expect(openPreview("/admin/preview/product/test/", "Product", 390, 844)).toBe(true);
    expect(popup.opener).toBeNull();
    expect(link).toMatchObject({
      href: "/admin/preview/product/test/",
      rel: "noopener noreferrer",
      referrerPolicy: "no-referrer",
    });
    expect(click).toHaveBeenCalledOnce();
  });

  it("announces a blocked popup without claiming success", async () => {
    vi.spyOn(window, "open").mockReturnValue(null);
    render(<PreviewViewportPanel href="/admin/preview/site/home/" label="Home" />);
    await userEvent.click(screen.getByRole("button", { name: /Open Mobile/ }));
    expect(screen.getByRole("status")).toHaveTextContent("blocked by the browser");
  });
});
