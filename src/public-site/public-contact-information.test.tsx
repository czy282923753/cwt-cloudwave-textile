// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { PUBLIC_CONTACT_INFORMATION } from "@/config/public-contact-information";

import { PublicContactInformation } from "./public-contact-information";

vi.mock("next/navigation", () => ({
  usePathname: () => "/get-quote/",
}));

const root = process.cwd();

describe("Owner-confirmed public contact information", () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("keeps the exact approved facts and canonical contact links in one frozen source", () => {
    expect(PUBLIC_CONTACT_INFORMATION).toEqual({
      email: {
        display: "sales@cwtextile.com",
        href: "mailto:sales@cwtextile.com",
      },
      whatsapp: {
        display: "+86 133 8000 7688",
        canonicalDigits: "8613380007688",
        href: "https://wa.me/8613380007688",
      },
      location: "Guangzhou, Guangdong, China",
      businessHours: "Monday–Friday, 9:00–18:00 (UTC+8)",
    });
    expect(Object.isFrozen(PUBLIC_CONTACT_INFORMATION)).toBe(true);
    expect(Object.isFrozen(PUBLIC_CONTACT_INFORMATION.email)).toBe(true);
    expect(Object.isFrozen(PUBLIC_CONTACT_INFORMATION.whatsapp)).toBe(true);
  });

  it("renders all four Footer facts and only the two approved direct channels", () => {
    const { unmount } = render(<PublicContactInformation variant="footer" />);
    expect(screen.getByRole("link", { name: "sales@cwtextile.com" }))
      .toHaveAttribute("href", "mailto:sales@cwtextile.com");
    expect(screen.getByRole("link", { name: "+86 133 8000 7688" }))
      .toHaveAttribute("href", "https://wa.me/8613380007688");
    expect(screen.getByText("Guangzhou, Guangdong, China")).toBeVisible();
    expect(screen.getByText("Monday–Friday, 9:00–18:00 (UTC+8)")).toBeVisible();

    unmount();
    render(<PublicContactInformation variant="direct" />);
    expect(screen.getByRole("link", { name: "sales@cwtextile.com" })).toBeVisible();
    expect(screen.getByRole("link", { name: "+86 133 8000 7688" })).toBeVisible();
    expect(screen.queryByText("Guangzhou, Guangdong, China")).toBeNull();
    expect(screen.queryByText("Monday–Friday, 9:00–18:00 (UTC+8)")).toBeNull();
  });

  it("keeps WhatsApp analytics to its non-PII placement property", async () => {
    const user = userEvent.setup();
    window.localStorage.setItem("cwt_analytics_consent", "granted");
    vi.spyOn(globalThis.crypto, "randomUUID")
      .mockReturnValue("10000000-0000-4000-8000-000000000001");
    const fetchMock = vi.fn(async (
      _input: RequestInfo | URL,
      _init?: RequestInit,
    ) => {
      void _input;
      void _init;
      return new Response(JSON.stringify({ ok: true }), { status: 202 });
    });
    vi.stubGlobal("fetch", fetchMock);
    render(<PublicContactInformation variant="direct" />);
    const whatsapp = screen.getByRole("link", { name: "+86 133 8000 7688" });
    whatsapp.addEventListener("click", (event) => event.preventDefault(), { once: true });

    await user.click(whatsapp);

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const [input, init] = fetchMock.mock.calls[0]!;
    expect(input).toBe("/api/conversion-events/");
    const payload = JSON.parse(String(init?.body)) as Record<string, unknown>;
    expect(payload).toMatchObject({
      eventName: "whatsapp_click",
      routePath: "/get-quote/",
      safeProperties: { placement: "quote_direct" },
    });
    const serialized = JSON.stringify(payload);
    expect(serialized).not.toContain(PUBLIC_CONTACT_INFORMATION.email.display);
    expect(serialized).not.toContain(PUBLIC_CONTACT_INFORMATION.whatsapp.canonicalDigits);
    expect(serialized).not.toContain(PUBLIC_CONTACT_INFORMATION.whatsapp.display);
  });

  it("keeps renderers on the shared source and removes the former public env authority", () => {
    const shell = readFileSync(join(root, "src/public-site/shell.tsx"), "utf8");
    const quote = readFileSync(join(root, "src/app/get-quote/page.tsx"), "utf8");
    const contactRenderer = readFileSync(
      join(root, "src/public-site/public-contact-information.tsx"),
      "utf8",
    );
    const environment = readFileSync(join(root, "src/config/env.ts"), "utf8");
    const environmentExample = readFileSync(join(root, ".env.example"), "utf8");

    expect(shell).toContain("<PublicContactInformation variant=\"footer\" />");
    expect(quote).toContain("<PublicContactInformation variant=\"direct\" />");
    expect(contactRenderer).toContain('from "@/config/public-contact-information"');
    for (const source of [shell, quote, contactRenderer]) {
      expect(source).not.toContain("sales@cwtextile.com");
      expect(source).not.toContain("8613380007688");
      expect(source).not.toContain("INQUIRY_NOTIFICATION_TO");
    }
    expect(environment).not.toContain("WHATSAPP_NUMBER");
    expect(environmentExample).not.toContain("WHATSAPP_NUMBER");
  });

  it("does not add Home or Contact to the fixed public navigation", () => {
    const shell = readFileSync(join(root, "src/public-site/shell.tsx"), "utf8");
    const primaryLinks = shell.match(/const primaryLinks = \[([\s\S]*?)\] as const;/)?.[1];
    expect(primaryLinks).toBeDefined();
    expect(primaryLinks).not.toMatch(/Home|Contact/);
    expect(shell).not.toContain('href="/contact');
  });
});
