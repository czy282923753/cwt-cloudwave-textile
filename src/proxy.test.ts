import { NextRequest, NextResponse } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";

const findRedirect = vi.hoisted(() => vi.fn());

vi.mock("@/public-site/data", () => ({ findRedirect }));

import { applyRuntimeResponsePolicy, proxy } from "./proxy";

const original = { APP_ENV: process.env.APP_ENV, NON_PRODUCTION_NOINDEX: process.env.NON_PRODUCTION_NOINDEX };
afterEach(() => {
  vi.clearAllMocks();
  if (original.APP_ENV === undefined) delete process.env.APP_ENV; else process.env.APP_ENV = original.APP_ENV;
  if (original.NON_PRODUCTION_NOINDEX === undefined) delete process.env.NON_PRODUCTION_NOINDEX; else process.env.NON_PRODUCTION_NOINDEX = original.NON_PRODUCTION_NOINDEX;
});

describe("Option F runtime response policy", () => {
  it("keeps Production indexable while applying protected-environment HSTS", () => {
    process.env.APP_ENV = "production"; process.env.NON_PRODUCTION_NOINDEX = "false";
    const response = applyRuntimeResponsePolicy(NextResponse.next());
    expect(response.headers.get("strict-transport-security")).toContain("max-age=63072000");
    expect(response.headers.get("x-robots-tag")).toBeNull();
  });

  it("applies Staging HSTS and fail-closed noindex from runtime state", () => {
    process.env.APP_ENV = "staging"; process.env.NON_PRODUCTION_NOINDEX = "true";
    const response = applyRuntimeResponsePolicy(NextResponse.next());
    expect(response.headers.get("strict-transport-security")).toContain("max-age=63072000");
    expect(response.headers.get("x-robots-tag")).toBe("noindex, nofollow, noarchive");
  });

  it.each([
    "/api/health/live",
    "/api/health/live/",
    "/api/health/ready",
    "/api/health/ready/",
  ])("bypasses redirect persistence for the exact health path %s", async (path) => {
    const response = await proxy(new NextRequest(`https://staging.cwtextile.com${path}`));
    expect(response.headers.get("x-middleware-next")).toBe("1");
    expect(findRedirect).not.toHaveBeenCalled();
  });

  it.each([
    ["/api/health/live-extra", "/api/health/live-extra/"],
    ["/api/health/ready/extra", "/api/health/ready/extra/"],
  ])("does not widen the health exception to %s", async (path, normalized) => {
    await proxy(new NextRequest(`https://staging.cwtextile.com${path}`));
    expect(findRedirect).toHaveBeenCalledOnce();
    expect(findRedirect).toHaveBeenCalledWith(normalized);
  });

  it("keeps an ordinary governed path on the redirect authority", async () => {
    findRedirect.mockResolvedValueOnce("/about/");
    const response = await proxy(new NextRequest("https://cwtextile.com/products?source=synthetic"));
    expect(findRedirect).toHaveBeenCalledOnce();
    expect(findRedirect).toHaveBeenCalledWith("/products/");
    expect(response.status).toBe(301);
    expect(response.headers.get("location")).toBe("https://cwtextile.com/about");
  });
});
