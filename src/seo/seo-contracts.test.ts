import { describe, expect, it } from "vitest";

import { productionRobots } from "@/app/robots";
import { buildPublicSitemap } from "@/app/sitemap";

import { derivedPageRobots, staticPageRobots } from "./page-indexability";

describe("public SEO contracts", () => {
  it("allows the governed Public Asset route while keeping the rest of the API blocked", () => {
    const result = productionRobots("https://cwtextile.com");
    expect(result.rules).toMatchObject({
      allow: ["/", "/api/public-assets/"],
      disallow: expect.arrayContaining(["/admin/", "/api/"]),
    });
    expect(result.sitemap).toBe("https://cwtextile.com/sitemap.xml");
  });

  it("uses noindex,follow for public derived entities without an eligible Product", () => {
    expect(derivedPageRobots("index", false, true)).toEqual({
      index: false,
      follow: true,
    });
    expect(derivedPageRobots("index", true, true)).toEqual({
      index: true,
      follow: true,
    });
    expect(derivedPageRobots("noindex", true, true)).toEqual({
      index: false,
      follow: true,
    });
    expect(derivedPageRobots("index", true, false)).toEqual({
      index: false,
      follow: false,
    });
  });

  it("keeps empty static pages noindex,follow without weakening non-production isolation", () => {
    expect(staticPageRobots(false, true)).toEqual({ index: false, follow: true });
    expect(staticPageRobots(true, true)).toEqual({ index: true, follow: true });
    expect(staticPageRobots(true, false)).toEqual({ index: false, follow: false });
  });

  it("emits canonical-origin Sitemap URLs without unproven lastmod values", () => {
    const result = buildPublicSitemap(
      [{ path: "/products/test-product/" }],
      "https://cwtextile.com",
      ["/", "/products/", "/applications/", "/about/"],
    );
    expect(result.some((entry) => entry.url === "https://cwtextile.com/")).toBe(true);
    expect(result.some((entry) => entry.url === "https://cwtextile.com/products/test-product/")).toBe(true);
    expect(result.every((entry) => !("lastModified" in entry))).toBe(true);
    expect(result.every((entry) => !entry.url.includes("cwtextile.com//"))).toBe(true);
  });

  it("omits empty derived collections and static pages from the Sitemap", () => {
    const result = buildPublicSitemap(
      [],
      "https://cwtextile.com",
      ["/resources/", "/fabric-knowledge/"],
    );
    const urls = result.map((entry) => entry.url);
    expect(urls).toEqual([
      "https://cwtextile.com/resources/",
      "https://cwtextile.com/fabric-knowledge/",
    ]);
    expect(urls).not.toContain("https://cwtextile.com/");
    expect(urls).not.toContain("https://cwtextile.com/products/");
    expect(urls).not.toContain("https://cwtextile.com/applications/");
    expect(urls).not.toContain("https://cwtextile.com/fabric-library/");
    expect(urls).not.toContain("https://cwtextile.com/about/");
  });
});
