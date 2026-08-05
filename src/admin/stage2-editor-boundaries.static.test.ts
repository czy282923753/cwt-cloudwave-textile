import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function source(path: string): string {
  return readFileSync(new URL(path, import.meta.url), "utf8");
}

function functionSource(file: string, name: string, nextName: string): string {
  const start = file.indexOf(`export async function ${name}`);
  const end = file.indexOf(`export async function ${nextName}`, start + 1);
  if (start < 0 || end < 0) throw new Error(`Could not isolate ${name}.`);
  return file.slice(start, end);
}

describe("Stage 2 editor authority boundaries", () => {
  it("removes Product Narrative and Content Body legacy fields from normal editorial UI writers", () => {
    const actions = source("./actions.ts");
    const productUpdate = functionSource(
      actions,
      "updateProductEditorialAction",
      "updateProductFactsAction",
    );
    const contentUpdate = functionSource(
      actions,
      "updateContentAction",
      "submitContentReviewAction",
    );
    expect(productUpdate).not.toContain("fullDescription");
    expect(contentUpdate).not.toMatch(/\bbody\s*:/);
    expect(source("../app/admin/products/[id]/page.tsx")).not.toContain("name=\"fullDescription\"");
    expect(source("../app/admin/contents/[id]/page.tsx")).not.toContain("name=\"body\"");
    expect(source("../app/admin/contents/page.tsx")).not.toContain("name=\"body\"");
    expect(source("../app/admin/contents/page.tsx")).toContain("name=\"initialParagraph\"");
  });

  it("uses one shared Block Editor, command reducer, Resolver, and public Renderer per entity", () => {
    const productEditor = source("../app/admin/products/[id]/page.tsx");
    const contentEditor = source("../app/admin/contents/[id]/page.tsx");
    expect(productEditor).toContain("<BlockEditor");
    expect(contentEditor).toContain("<BlockEditor");
    expect(source("./components/block-editor.tsx")).toContain("blockHistoryReducer");
    expect(source("../catalog/product-service.ts")).toContain("resolveBlockPublicProjection");
    expect(source("../content/content-service.ts")).toContain("resolveBlockPublicProjection");
    expect(source("../app/products/[slug]/page.tsx")).toContain("ProductDetailRenderer");
    expect(source("../app/admin/preview/product/[id]/page.tsx")).toContain("ProductDetailRenderer");
    expect(source("../public-site/content-pages.tsx")).toContain("ContentArticleRenderer");
    expect(source("../app/admin/preview/content/[id]/page.tsx")).toContain("ContentArticleRenderer");
  });

  it("keeps Draft Preview authenticated, noindex, no-store, and behind controlled Asset delivery", () => {
    const proxy = source("../proxy.ts");
    const productPreview = source("../app/admin/preview/product/[id]/page.tsx");
    const contentPreview = source("../app/admin/preview/content/[id]/page.tsx");
    const sitePreview = source("../app/admin/preview/site/[pageKey]/page.tsx");
    const assetRoute = source("../app/api/admin/preview-assets/[entityType]/[entityId]/[assetId]/route.ts");
    for (const preview of [productPreview, contentPreview, sitePreview]) {
      expect(preview).toContain("requireCurrentUser");
      expect(preview).toContain("index: false");
      expect(preview).toContain("follow: false");
    }
    expect(proxy).toContain("/admin/preview/:path*");
    expect(proxy).toContain("noindex, nofollow, noarchive");
    expect(proxy).toContain("private, no-store");
    expect(assetRoute).toContain("requireCurrentUser");
    expect(assetRoute).toContain("publicReadyImageSqlConditions");
    expect(assetRoute).toContain("deriveStaticPageLivePlacements");
    expect(assetRoute).toContain("private, no-store");
    expect(assetRoute).toContain("x-content-type-options");
    expect(assetRoute).not.toContain("storagePartition, asset.objectKey");
  });

  it("replaces the former Home/About templates with the shared fixed-schema renderer", () => {
    const home = source("../app/page.tsx");
    const about = source("../app/about/page.tsx");
    expect(home).toContain("StaticHomeRenderer");
    expect(about).toContain("StaticAboutRenderer");
    expect(home).toContain("getPublicStaticPage");
    expect(about).toContain("getPublicStaticPage");
  });
});
