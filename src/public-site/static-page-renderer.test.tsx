import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { DEFAULT_STATIC_PAGE_CONFIGS, staticPageConfigSchema } from "@/content/static-page-projection";

import type { PublicStaticPagePlacement } from "./data";
import { StaticAboutRenderer, StaticHomeRenderer } from "./static-page-renderer";

function renderHome(
  config = DEFAULT_STATIC_PAGE_CONFIGS.home,
  placements: readonly PublicStaticPagePlacement[] = [],
  facts: readonly { key: string; statement: string }[] = [],
) {
  return renderToStaticMarkup(
    <StaticHomeRenderer
      applications={[]}
      config={config}
      contents={[]}
      facts={facts}
      libraryEntries={[]}
      placements={placements}
      products={[]}
    />,
  );
}

describe("fixed Home/About public renderer", () => {
  it("renders the frozen Home module sequence and omits disabled modules from the DOM", () => {
    const html = renderHome();
    const titles = [
      "Professional Fabric Supplier in China",
      "Explore real fabric records",
      "Start from what the fabric needs to do.",
      "A visual path into the range",
      "Useful answers before the first sourcing conversation.",
      "Send less. Start faster.",
    ];
    const positions = titles.map((title) => html.indexOf(title));
    expect(positions.every((position) => position >= 0)).toBe(true);
    expect([...positions].sort((left, right) => left - right)).toEqual(positions);
    expect(html).toContain('data-brand-wave="true"');
    expect(html).toContain('data-scheme4-zone="home-applications"');
    expect(html).not.toContain("weave-placeholder");

    const disabled = {
      ...DEFAULT_STATIC_PAGE_CONFIGS.home,
      modules: {
        ...DEFAULT_STATIC_PAGE_CONFIGS.home.modules,
        applications: false,
      },
    };
    const disabledHtml = renderHome(disabled);
    expect(disabledHtml).not.toContain("Start from what the fabric needs to do.");
    expect(disabledHtml).not.toContain("Explore Applications");
  });

  it("uses viewport-specific governed media, focal point, overlay, Alt, and Caption", () => {
    const placements: PublicStaticPagePlacement[] = [
      {
        placementKey: "hero",
        viewport: "desktop",
        sortOrder: 0,
        focalX: 20,
        focalY: 30,
        overlayOpacity: 0.4,
        asset: {
          id: "10000000-0000-4000-8000-000000000001",
          url: "/api/public/assets/10000000-0000-4000-8000-000000000001/",
          alt: "Synthetic desktop hero",
          caption: "Desktop caption",
          width: 1200,
          height: 900,
          variants: [{ format: "webp", url: "/api/public-assets/10000000-0000-4000-8000-000000000001/?variant=960w-webp", width: 960, height: 720 }],
        },
      },
      {
        placementKey: "hero",
        viewport: "mobile",
        sortOrder: 1,
        focalX: 70,
        focalY: 60,
        overlayOpacity: 0.2,
        asset: {
          id: "10000000-0000-4000-8000-000000000002",
          url: "/api/public/assets/10000000-0000-4000-8000-000000000002/",
          alt: "Synthetic mobile hero",
          caption: "Mobile caption",
          width: 600,
          height: 900,
          variants: [{ format: "webp", url: "/api/public-assets/10000000-0000-4000-8000-000000000002/?variant=480w-webp", width: 480, height: 720 }],
        },
      },
    ];
    const html = renderHome(DEFAULT_STATIC_PAGE_CONFIGS.home, placements);
    expect(html).toContain("Synthetic desktop hero");
    expect(html).toContain("media=\"(min-width: 640px)\"");
    expect(html).toContain("media=\"(max-width: 639px)\"");
    expect(html).toContain("variant=960w-webp 960w");
    expect(html).toContain("variant=480w-webp 480w");
    expect(html).toContain("--desktop-object-position:20% 30%");
    expect(html).toContain("--mobile-object-position:70% 60%");
    expect((html.match(/<img/g) ?? [])).toHaveLength(1);
    expect(html).toContain('fetchPriority="high"');
    expect(html).toContain("opacity:0.4");
    expect(html).toContain("opacity:0.2");
    expect(html).toContain("Desktop caption");
    expect(html).toContain("Mobile caption");
    expect(html).not.toContain("test/hero-object-key");
  });

  it("renders fact-sensitive modules only when current Fact and owned media evidence both exist", () => {
    const evidencedAbout = {
      ...DEFAULT_STATIC_PAGE_CONFIGS.about,
      copy: {
        ...DEFAULT_STATIC_PAGE_CONFIGS.about.copy!,
        ownedManufacturing: { factKeys: ["test-owned"] },
      },
    };
    const ownedPlacement: PublicStaticPagePlacement = {
      placementKey: "owned_manufacturing",
      viewport: "desktop",
      sortOrder: 0,
      focalX: 50,
      focalY: 50,
      overlayOpacity: 0,
      asset: {
        id: "10000000-0000-4000-8000-000000000003",
        url: "/api/public-assets/10000000-0000-4000-8000-000000000003/",
        alt: "Own Manufacturing",
        caption: null,
        width: 1200,
        height: 900,
      },
    };
    const withoutFacts = renderToStaticMarkup(
      <StaticAboutRenderer
        config={evidencedAbout}
        facts={[]}
        placements={[ownedPlacement]}
      />,
    );
    const withoutMedia = renderToStaticMarkup(
      <StaticAboutRenderer
        config={evidencedAbout}
        facts={[{ key: "test-owned", statement: "Synthetic verified owned-facility fact." }]}
        placements={[]}
      />,
    );
    const withFact = renderToStaticMarkup(
      <StaticAboutRenderer
        config={evidencedAbout}
        facts={[{ key: "test-owned", statement: "Synthetic verified owned-facility fact." }]}
        placements={[ownedPlacement]}
      />,
    );
    expect(withoutFacts).not.toContain("Synthetic verified owned-facility fact.");
    expect(withoutFacts).not.toContain('data-fact-sensitive-module="owned_manufacturing"');
    expect(withoutMedia).not.toContain('data-fact-sensitive-module="owned_manufacturing"');
    expect(withFact).toContain("Synthetic verified owned-facility fact.");
    expect(withFact).toContain('data-fact-sensitive-module="owned_manufacturing"');
    expect(withFact).not.toContain("partner factory");
  });

  it("does not render legacy free factual copy and uses fixed approved labels after the evidence gate", () => {
    const parsed = DEFAULT_STATIC_PAGE_CONFIGS.home;
    const legacy = {
      ...parsed,
      copy: {
        ...parsed.copy!,
        manufacturingStrength: {
          ...parsed.copy!.manufacturingStrength,
          factKeys: ["test-fact"],
          eyebrow: "TEST false eyebrow",
          title: "TEST false ownership title",
          summary: "TEST false capacity summary",
        },
      },
      placements: [{
        assetId: "10000000-0000-4000-8000-000000000004",
        placementKey: "manufacturing_strength" as const,
        viewport: "desktop" as const,
        role: "hero" as const,
        sortOrder: 0,
        altText: "TEST false facility alt",
        caption: "TEST false facility caption",
        focalX: 50,
        focalY: 50,
        overlayOpacity: 0,
        isVisible: true,
      }],
    };
    const normalized = staticPageConfigSchema.parse(legacy);
    if (normalized.pageKey !== "home") throw new Error("Expected normalized Home config.");
    const legacyPlacement = legacy.placements[0]!;
    const normalizedPlacement = normalized.placements[0]!;
    const html = renderHome(normalized, [{
      placementKey: "manufacturing_strength",
      viewport: "desktop",
      sortOrder: 0,
      focalX: 50,
      focalY: 50,
      overlayOpacity: 0,
      asset: {
        id: legacyPlacement.assetId,
        url: `/api/public-assets/${legacyPlacement.assetId}/`,
        alt: normalizedPlacement.altText,
        caption: normalizedPlacement.caption,
        width: 1200,
        height: 900,
      },
    }], [{ key: "test-fact", statement: "TEST verified statement" }]);
    expect(html).not.toContain("TEST false");
    expect(html).toContain("CWT Manufacturing &amp; Service Strength");
  });

  it("keeps one page-level H1 when the governed Hero module is disabled", () => {
    const homeHtml = renderHome({
      ...DEFAULT_STATIC_PAGE_CONFIGS.home,
      modules: { ...DEFAULT_STATIC_PAGE_CONFIGS.home.modules, hero: false },
    });
    const aboutHtml = renderToStaticMarkup(
      <StaticAboutRenderer
        config={{
          ...DEFAULT_STATIC_PAGE_CONFIGS.about,
          modules: { ...DEFAULT_STATIC_PAGE_CONFIGS.about.modules, hero: false },
        }}
        facts={[]}
        placements={[]}
      />,
    );
    expect(homeHtml).toContain('<h1 class="sr-only">CloudWave Textile</h1>');
    expect(homeHtml).not.toContain(DEFAULT_STATIC_PAGE_CONFIGS.home.copy!.hero.title);
    expect(aboutHtml).toContain('<h1 class="sr-only">About CloudWave Textile</h1>');
    expect(aboutHtml).not.toContain(DEFAULT_STATIC_PAGE_CONFIGS.about.copy!.hero.title);
  });

  it("does not substitute bootstrap copy into an approved config that intentionally omits optional copy", () => {
    const withoutCopy = {
      version: DEFAULT_STATIC_PAGE_CONFIGS.home.version,
      pageKey: DEFAULT_STATIC_PAGE_CONFIGS.home.pageKey,
      modules: DEFAULT_STATIC_PAGE_CONFIGS.home.modules,
      placements: DEFAULT_STATIC_PAGE_CONFIGS.home.placements,
    };
    const html = renderHome(withoutCopy);
    expect(html).toContain('<h1 class="sr-only">CloudWave Textile</h1>');
    expect(html).not.toContain(DEFAULT_STATIC_PAGE_CONFIGS.home.copy!.hero.title);
    expect(html).not.toContain(DEFAULT_STATIC_PAGE_CONFIGS.home.copy!.inquiryCta.title);
  });
});
