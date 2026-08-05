import { describe, expect, it } from "vitest";

import { DEFAULT_STATIC_PAGE_CONFIGS, staticPageConfigSchema } from "./static-page-settings";

describe("fixed Home/About page settings", () => {
  it("accepts the fixed Home module order and bounded media controls", () => {
    expect(staticPageConfigSchema.parse({
      ...DEFAULT_STATIC_PAGE_CONFIGS.home,
      placements: [{
        assetId: "10000000-0000-4000-8000-000000000001",
        placementKey: "hero",
        viewport: "desktop",
        role: "hero",
        sortOrder: 0,
        altText: "Synthetic test fabric detail",
        caption: null,
        focalX: 50,
        focalY: 35,
        overlayOpacity: 0.4,
        isVisible: true,
      }],
    }).pageKey).toBe("home");
  });

  it("rejects arbitrary modules, placements, ranges, and duplicate relation keys", () => {
    expect(() => staticPageConfigSchema.parse({
      ...DEFAULT_STATIC_PAGE_CONFIGS.home,
      modules: { ...DEFAULT_STATIC_PAGE_CONFIGS.home.modules, arbitrary_html: true },
    })).toThrow();
    expect(() => staticPageConfigSchema.parse({
      ...DEFAULT_STATIC_PAGE_CONFIGS.home,
      placements: [{
        assetId: "10000000-0000-4000-8000-000000000001",
        placementKey: "freeform_banner",
        viewport: "desktop",
        role: "hero",
        sortOrder: 0,
        altText: "Synthetic",
        caption: null,
        focalX: 101,
        focalY: 50,
        overlayOpacity: 1,
        isVisible: true,
      }],
    })).toThrow();
  });
});
