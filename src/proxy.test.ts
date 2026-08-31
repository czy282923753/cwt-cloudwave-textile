import { NextResponse } from "next/server";
import { afterEach, describe, expect, it } from "vitest";
import { applyRuntimeResponsePolicy } from "./proxy";

const original = { APP_ENV: process.env.APP_ENV, NON_PRODUCTION_NOINDEX: process.env.NON_PRODUCTION_NOINDEX };
afterEach(() => {
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
});
