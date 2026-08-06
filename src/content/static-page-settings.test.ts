import { describe, expect, it } from "vitest";

import { DEFAULT_STATIC_PAGE_CONFIGS, staticPageConfigSchema } from "./static-page-settings";
import { resolveStaticPageLiveAuthority } from "./static-page-projection";

describe("fixed Home/About page settings", () => {
  it("uses bootstrap defaults only before an applied persisted authority exists", () => {
    expect(resolveStaticPageLiveAuthority("home", null, false)).toMatchObject({ state: "bootstrap" });
    expect(resolveStaticPageLiveAuthority("home", { invalid: true }, true)).toEqual({
      state: "invalid",
      config: null,
    });
    expect(resolveStaticPageLiveAuthority("home", DEFAULT_STATIC_PAGE_CONFIGS.home, false))
      .toMatchObject({ state: "bootstrap" });
    const approved = {
      ...DEFAULT_STATIC_PAGE_CONFIGS.home,
      copy: {
        ...DEFAULT_STATIC_PAGE_CONFIGS.home.copy!,
        hero: { ...DEFAULT_STATIC_PAGE_CONFIGS.home.copy!.hero, title: "Approved persisted title" },
      },
    };
    expect(resolveStaticPageLiveAuthority("home", approved, true)).toEqual({
      state: "live",
      config: staticPageConfigSchema.parse(approved),
    });
  });

  it("compatibly reads but removes legacy free factual copy and media text", () => {
    const normalized = staticPageConfigSchema.parse({
      ...DEFAULT_STATIC_PAGE_CONFIGS.home,
      copy: {
        ...DEFAULT_STATIC_PAGE_CONFIGS.home.copy!,
        manufacturingStrength: {
          factKeys: ["test-fact"],
          eyebrow: "TEST false eyebrow",
          title: "TEST false title",
          summary: "TEST false summary",
        },
      },
      placements: [{
        assetId: "10000000-0000-4000-8000-000000000001",
        placementKey: "manufacturing_strength",
        viewport: "desktop",
        role: "hero",
        sortOrder: 0,
        altText: "TEST false alt",
        caption: "TEST false caption",
        focalX: 50,
        focalY: 50,
        overlayOpacity: 0,
        isVisible: true,
      }],
    });
    if (normalized.pageKey !== "home") throw new Error("Expected normalized Home config.");
    expect(normalized.copy?.manufacturingStrength).toEqual({ factKeys: ["test-fact"] });
    expect(normalized.placements[0]).toMatchObject({
      altText: "CWT Manufacturing & Service Strength",
      caption: null,
    });
  });

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
    expect(() => staticPageConfigSchema.parse({
      ...DEFAULT_STATIC_PAGE_CONFIGS.home,
      placements: [
        {
          assetId: "10000000-0000-4000-8000-000000000001",
          placementKey: "hero",
          viewport: "desktop",
          role: "hero",
          sortOrder: 0,
          altText: "Synthetic first hero",
          caption: null,
          focalX: 50,
          focalY: 50,
          overlayOpacity: 0.2,
          isVisible: true,
        },
        {
          assetId: "10000000-0000-4000-8000-000000000002",
          placementKey: "hero",
          viewport: "desktop",
          role: "hero",
          sortOrder: 1,
          altText: "Synthetic competing hero",
          caption: null,
          focalX: 50,
          focalY: 50,
          overlayOpacity: 0.2,
          isVisible: true,
        },
      ],
    })).toThrow(/unique/);
  });
});
