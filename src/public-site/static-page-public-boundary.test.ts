import { describe, expect, it } from "vitest";

import { DEFAULT_STATIC_PAGE_CONFIGS } from "@/content/static-page-projection";

import {
  assertPublicStaticPageProjection,
  PublicStaticPageUnavailableError,
} from "./data";

describe("public Static Page operational boundary", () => {
  it("keeps a valid but empty projection available for a 200 noindex response", () => {
    const result = assertPublicStaticPageProjection({
      authorityState: "live",
      config: {
        version: 1,
        pageKey: "home",
        modules: DEFAULT_STATIC_PAGE_CONFIGS.home.modules,
        placements: [],
      },
      placements: [],
      facts: [],
      hasRenderableContent: false,
    }, "home");
    expect(result.config.pageKey).toBe("home");
    expect(result.hasRenderableContent).toBe(false);
  });

  it("throws a safe operational error for an invalid live projection", () => {
    expect(() => assertPublicStaticPageProjection({
      authorityState: "invalid",
      config: null,
      placements: [],
      facts: [],
      hasRenderableContent: false,
    }, "about")).toThrow(PublicStaticPageUnavailableError);
    expect(() => assertPublicStaticPageProjection({
      authorityState: "invalid",
      config: null,
      placements: [],
      facts: [],
      hasRenderableContent: false,
    }, "about")).toThrow("Public static page is temporarily unavailable.");
  });
});
