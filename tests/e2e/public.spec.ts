import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Locator, type Page } from "@playwright/test";

const fixtureProductPath = "/products/test-fixture-fabric-01/";
const adminFinalizedResponsiveProductPath =
  "/products/test-e2e-admin-finalized-responsive/";

const blockProjectionFixtures = {
  productPath: "/products/test-e2e-block-media-product/",
  contentPath: "/fabric-knowledge/test-e2e-block-media-content/",
  renderableProductPaths: {
    empty: "/products/test-e2e-renderable-empty/",
    divider: "/products/test-e2e-renderable-divider/",
    unresolvedImage: "/products/test-e2e-renderable-unresolved-image/",
    hiddenImage: "/products/test-e2e-renderable-hidden-image/",
    unresolvedGallery: "/products/test-e2e-renderable-unresolved-gallery/",
    filteredRelated: "/products/test-e2e-renderable-filtered-related/",
    paragraph: "/products/test-e2e-renderable-paragraph/",
    heading: "/products/test-e2e-renderable-heading/",
    validMedia: "/products/test-e2e-block-media-product/",
    independentModules: "/products/test-e2e-renderable-independent-modules/",
    revisionBefore: "/products/test-e2e-renderable-revision-before/",
    revisionAfter: "/products/test-e2e-renderable-revision-after/",
  },
  enabledStaticAssetId: "91000000-0000-4000-8000-000000000001",
  disabledStaticAssetId: "91000000-0000-4000-8000-000000000002",
  aboutStaticAssetId: "91000000-0000-4000-8000-000000000003",
} as const;

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    if (window.sessionStorage.getItem("cwt_e2e_verify_unset_consent") !== "true") {
      window.localStorage.setItem("cwt_analytics_consent", "denied");
    }
  });
});

async function loginAsLocalAdmin(page: Page) {
  await page.goto("/operations-login/");
  await page.getByLabel("Email", { exact: true }).fill("admin@example.test");
  await page
    .getByLabel("Password", { exact: true })
    .fill("local-only-admin-password");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/\/admin\/$/);
}

async function loginAsEditorialRole(page: Page, email: string) {
  await page.context().clearCookies();
  await page.goto("/operations-login/");
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByLabel("Password", { exact: true }).fill("local-only-role-password");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/\/admin\/$/);
}

async function openLinkedRecord(page: Page, link: Locator): Promise<void> {
  const href = await link.getAttribute("href");
  if (!href) throw new Error("Expected the admin record link to have an href.");
  await page.goto(href);
}

async function submitServerAction(page: Page, button: Locator): Promise<void> {
  const [response] = await Promise.all([
    page.waitForResponse(
      (candidate) =>
        candidate.request().method() === "POST" &&
        candidate.headers()["content-type"]?.includes("text/x-component") === true,
    ),
    button.click(),
  ]);
  expect(response.ok()).toBe(true);
  await page.reload();
}

test("@all public home communicates the CWT offer and remains non-indexable outside production", async ({
  page,
}) => {
  const response = await page.goto("/");
  expect(response?.ok()).toBe(true);
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "Professional Fabric Supplier in China",
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Find Your Fabric Solution", exact: true }),
  ).toBeVisible();
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
    "content",
    /noindex/,
  );
  expect(response?.headers()["x-robots-tag"]).toContain("noindex");
  const accessibility = await new AxeBuilder({ page }).analyze();
  expect(
    accessibility.violations.filter((violation) =>
      ["critical", "serious"].includes(violation.impact ?? ""),
    ),
  ).toEqual([]);
});

test("@desktop primary public surfaces return successful responses", async ({ page }) => {
  for (const path of [
    "/",
    "/products/",
    "/applications/",
    "/fabric-library/",
    "/resources/",
    "/fabric-knowledge/",
    "/china-textile-guide/",
    "/china-sourcing-guide/",
    "/about/",
    "/get-quote/",
    "/privacy/",
  ]) {
    const response = await page.request.get(path);
    expect(response.status(), `${path} should be available`).toBe(200);
  }
});

test("@all Version B uses the official Logo-only header and accessible responsive navigation", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/");
  const header = page.locator("[data-public-header]");
  const logoLink = header.locator('[data-navigation-logo-only="true"]');
  await expect(logoLink).toHaveCount(1);
  await expect(logoLink.locator('[data-cwt-official-logo="true"]')).toHaveAttribute("src", /CWTLOGO\.svg/);
  expect((await logoLink.textContent())?.trim()).toBe("");
  const desktopLogo = await logoLink.locator("img").boundingBox();
  expect(desktopLogo?.height).toBeGreaterThanOrEqual(28);
  expect(desktopLogo?.height).toBeLessThanOrEqual(34);
  expect((desktopLogo?.width ?? 0) / (desktopLogo?.height ?? 1)).toBeCloseTo(1929 / 555, 1);

  const resourcesLink = header.getByRole("link", { name: "Fabric & Sourcing", exact: true }).first();
  await resourcesLink.focus();
  await expect(header.getByRole("navigation", { name: "Fabric and sourcing resources" })).toBeVisible();

  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload();
  const mobileLogo = await header.locator('[data-cwt-official-logo="true"]').boundingBox();
  expect(mobileLogo?.height).toBeGreaterThanOrEqual(22);
  expect(mobileLogo?.height).toBeLessThanOrEqual(27);
  const mobileNavigation = header.locator("details.mobile-navigation");
  await expect(mobileNavigation).not.toHaveAttribute("open", "");
  await mobileNavigation.locator("summary").click();
  await expect(mobileNavigation).toHaveAttribute("open", "");
  await expect(header.getByRole("navigation", { name: "Mobile" })).toBeVisible();
  await expect(header.getByRole("link", { name: "Get a Quote", exact: true })).toBeVisible();
});

test("@all Version B key surfaces keep selective deep zones, accessibility, and width integrity", async ({ page }) => {
  const fixtures = [
    { path: "/", zone: "home-applications" },
    { path: "/fabric-knowledge/", zone: "content-index-cta" },
    { path: blockProjectionFixtures.contentPath, zone: "article-consultation" },
    { path: "/get-quote/", zone: "inquiry-guidance" },
  ] as const;
  for (const width of [390, 1440]) {
    await page.setViewportSize({ width, height: width < 800 ? 844 : 1000 });
    for (const fixture of fixtures) {
      const response = await page.goto(fixture.path);
      expect(response?.status(), `${fixture.path} at ${width}px`).toBe(200);
      await expect(page.locator(`[data-scheme4-zone="${fixture.zone}"]`)).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth), `${fixture.path} overflow at ${width}px`)
        .toBeLessThanOrEqual(await page.evaluate(() => window.innerWidth));
      const accessibility = await new AxeBuilder({ page }).analyze();
      expect(accessibility.violations.filter((violation) =>
        ["critical", "serious"].includes(violation.impact ?? ""),
      ), `${fixture.path} Axe at ${width}px`).toEqual([]);
    }
  }
});

test("@desktop synthetic fixture Product is not publicly accessible before explicit gate review", async ({
  page,
}) => {
  const response = await page.goto(fixtureProductPath);
  expect(response?.status()).toBe(404);
  const list = await page.request.get("/products/");
  expect(await list.text()).not.toContain("TEST FIXTURE Fabric Sample 01");
});

test("@desktop dynamic Application, taxonomy, and Fabric Library pages expose OG and Breadcrumb metadata", async ({ page }) => {
  for (const path of [
    "/applications/test-fixture-sportswear/",
    "/fabric-types/fixture-polyester/",
    "/fabric-library/test-fixture-entry/",
  ]) {
    const response = await page.goto(path);
    expect(response?.status(), `${path} should be available`).toBe(200);
    await expect(page.locator('meta[property="og:title"]')).toHaveAttribute("content", /TEST FIXTURE/);
    const schemas = await page.locator('script[type="application/ld+json"]').allTextContents();
    expect(schemas.join("\n")).toContain('"BreadcrumbList"');
  }
});

test("@all controlled SEO metadata, structured data, and responsive media stay aligned", async ({ page }) => {
  const browserErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") browserErrors.push(message.text());
  });
  page.on("pageerror", (error) => browserErrors.push(error.message));

  await page.goto("/");
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    "href",
    "http://127.0.0.1:3100/",
  );

  await page.goto("/products/");
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    "href",
    "http://127.0.0.1:3100/products/",
  );
  expect((await page.request.get("/products/?page=0")).status()).toBe(404);

  await page.goto(blockProjectionFixtures.productPath);
  const productSchemas = await page.locator('script[type="application/ld+json"]').allTextContents();
  const productNodes = productSchemas.flatMap((value) => {
    const parsed = JSON.parse(value) as { "@graph"?: Array<Record<string, unknown>> };
    return parsed["@graph"] ?? [];
  });
  const productNode = productNodes.find((node) => node["@type"] === "Product");
  expect(productNode).toBeDefined();
  expect(productNode).not.toHaveProperty("brand");
  const responsiveSources = page.locator("main picture source");
  expect(await responsiveSources.count()).toBeGreaterThan(0);
  for (const source of await responsiveSources.all()) {
    await expect(source).toHaveAttribute("srcset", /\/api\/public-assets\//);
  }
  const firstImage = page.locator("main img").first();
  await expect(firstImage).toHaveAttribute("loading", "eager");
  await expect(firstImage).toHaveAttribute("fetchpriority", "high");
  expect(await page.locator('main img[loading="lazy"]').count()).toBeGreaterThan(0);

  await page.goto("/fabric-types/fixture-polyester/");
  const taxonomySchemas = await page.locator('script[type="application/ld+json"]').allTextContents();
  const taxonomyBreadcrumb = taxonomySchemas
    .map((value) => JSON.parse(value) as { "@type"?: string; itemListElement?: Array<{ name?: string; item?: string }> })
    .find((value) => value["@type"] === "BreadcrumbList");
  expect(taxonomyBreadcrumb?.itemListElement).toHaveLength(2);
  expect(taxonomyBreadcrumb?.itemListElement?.some((item) => item.name === "Fabric Types")).toBe(false);
  expect(browserErrors).toEqual([]);
});

test("@all real Admin Finalize Variant is selected, fetched, and decoded", async ({ page }) => {
  const selectedVariantResponses: Array<{
    url: string;
    status: number;
    contentType: string | undefined;
    cacheControl: string | undefined;
  }> = [];
  const browserErrors: string[] = [];
  page.on("response", (response) => {
    if (response.url().includes("/api/public-assets/") && response.url().includes("variant=")) {
      selectedVariantResponses.push({
        url: response.url(),
        status: response.status(),
        contentType: response.headers()["content-type"],
        cacheControl: response.headers()["cache-control"],
      });
    }
  });
  page.on("console", (message) => {
    if (message.type() === "error") browserErrors.push(message.text());
  });
  page.on("pageerror", (error) => browserErrors.push(error.message));

  const pageResponse = await page.goto(adminFinalizedResponsiveProductPath);
  expect(pageResponse?.status()).toBe(200);
  const hero = page.locator("main picture img").first();
  await expect(hero).toHaveAttribute("loading", "eager");
  await expect(hero).toHaveAttribute("fetchpriority", "high");
  await expect.poll(async () => hero.evaluate((image: HTMLImageElement) => ({
    complete: image.complete,
    naturalWidth: image.naturalWidth,
    currentSrc: image.currentSrc,
  }))).toMatchObject({
    complete: true,
    naturalWidth: expect.any(Number),
    currentSrc: expect.stringContaining("/api/public-assets/"),
  });
  const naturalWidth = await hero.evaluate((image: HTMLImageElement) => image.naturalWidth);
  expect(naturalWidth).toBeGreaterThan(0);
  const currentSrc = await hero.evaluate((image: HTMLImageElement) => image.currentSrc);
  const selectedUrl = new URL(currentSrc);
  expect(selectedUrl.searchParams.get("variant")).toMatch(
    /^(480|960|1600)w-(avif|webp)$/,
  );
  await expect.poll(() =>
    selectedVariantResponses.find((response) => response.url === currentSrc),
  ).toMatchObject({
    status: 200,
    contentType: expect.stringMatching(/^image\/(avif|webp)$/),
    cacheControl: "private, no-store, max-age=0, must-revalidate",
  });
  const directResponse = await page.request.get(currentSrc);
  expect(directResponse.status()).toBe(200);
  expect(directResponse.headers()["content-type"]).toMatch(/^image\/(avif|webp)$/);
  expect(directResponse.headers()["cache-control"]).toBe(
    "private, no-store, max-age=0, must-revalidate",
  );
  expect(await page.locator('main img[loading="eager"][fetchpriority="high"]').count()).toBe(1);
  expect(browserErrors).toEqual([]);
});

test("@desktop analytics consent defaults off and can be granted then withdrawn", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => {
    window.sessionStorage.setItem("cwt_e2e_verify_unset_consent", "true");
    window.localStorage.removeItem("cwt_analytics_consent");
  });
  await page.reload();
  await expect(page.getByRole("dialog", { name: "Analytics privacy choices" })).toBeVisible();
  expect(await page.evaluate(() => window.localStorage.getItem("cwt_analytics_consent"))).toBeNull();
  await page.getByRole("button", { name: "Allow analytics" }).click();
  await expect.poll(() => page.evaluate(() => window.localStorage.getItem("cwt_analytics_consent"))).toBe("granted");
  await page.getByRole("button", { name: "Privacy choices" }).click();
  await page.getByRole("button", { name: "Withdraw consent" }).click();
  await expect.poll(() => page.evaluate(() => window.localStorage.getItem("cwt_analytics_consent"))).toBe("denied");
});

test("@mobile mobile viewport uses the compact header and fixed inquiry action", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.locator("summary").filter({ hasText: "Menu" })).toBeVisible();
  await expect(
    page.getByRole("complementary", { name: "Mobile quick inquiry" }),
  ).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
    await page.evaluate(() => window.innerWidth),
  );
});

test("@all Static, Product, and Content public media use the authoritative Block projection", async ({ page }) => {
  const fixture = blockProjectionFixtures;
  const enabledMedia = await page.request.get(`/api/public-assets/${fixture.enabledStaticAssetId}/`);
  const disabledMedia = await page.request.get(`/api/public-assets/${fixture.disabledStaticAssetId}/`);
  expect(enabledMedia.status()).toBe(200);
  expect(disabledMedia.status()).toBe(404);

  await page.goto(fixture.productPath);
  await expect(page.getByText("Synthetic Product Block projection is visible.")).toBeVisible();
  await expect(page.getByText("Synthetic gallery A")).toBeVisible();
  await expect(page.getByText("Synthetic gallery B")).toBeVisible();
  await expect(page.locator('img[alt="Synthetic Product hero"]')).toHaveCount(2);
  await expect(page.locator('img[alt="Synthetic Product gallery A"]')).toHaveCount(2);
  const productAccessibility = await new AxeBuilder({ page }).analyze();
  expect(productAccessibility.violations.filter((violation) => ["critical", "serious"].includes(violation.impact ?? ""))).toEqual([]);

  await page.goto(fixture.contentPath);
  await expect(page.getByText("Synthetic Content Block projection is visible.")).toBeVisible();
  await expect(page.getByText("Synthetic Content gallery A")).toBeVisible();
  await expect(page.getByText("Synthetic Content gallery B")).toBeVisible();
  await expect(page.locator('img[alt="Synthetic Content inline"]')).toHaveCount(2);
  await expect(page.locator('img[alt="Synthetic Content gallery A"]')).toHaveCount(1);
  const authorByline = page.getByText("By TEST E2E Block Author", { exact: true });
  await expect(authorByline).toHaveCSS("color", "rgb(88, 107, 115)");
  const contentAccessibility = await new AxeBuilder({ page }).analyze();
  expect(contentAccessibility.violations.filter((violation) => ["critical", "serious"].includes(violation.impact ?? ""))).toEqual([]);

  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", new RegExp(fixture.contentPath.replaceAll("/", "\\/")));
  const sitemap = await page.request.get("/sitemap.xml");
  expect(await sitemap.text()).not.toContain(fixture.productPath);
  expect(await sitemap.text()).not.toContain(fixture.contentPath);
});

async function expectNoProductNarrative(page: Page, path: string) {
  const response = await page.goto(path);
  expect(response?.status(), `${path} should remain a public Product page`).toBe(200);
  await expect(page.getByText("Product context", { exact: true })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "About this fabric", exact: true })).toHaveCount(0);
  await expect(page.locator("[data-product-narrative]")).toHaveCount(0);
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
}

test("@all non-renderable Product Blocks do not emit narrative headings or containers", async ({ page }) => {
  const paths = blockProjectionFixtures.renderableProductPaths;
  for (const path of [
    paths.empty,
    paths.divider,
    paths.unresolvedImage,
    paths.hiddenImage,
    paths.unresolvedGallery,
    paths.filteredRelated,
  ]) {
    await expectNoProductNarrative(page, path);
  }
  await page.goto(paths.divider);
  await expect(page.locator("main hr")).toHaveCount(0);
});

test("@all Paragraph, Heading, Image, and Gallery use the renderable Product projection", async ({ page }) => {
  const paths = blockProjectionFixtures.renderableProductPaths;
  await page.goto(paths.paragraph);
  await expect(page.locator("[data-product-narrative]")).toBeVisible();
  await expect(page.getByText("Product context", { exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "About this fabric", exact: true })).toBeVisible();
  await expect(page.getByText("Synthetic renderable Paragraph is visible.", { exact: true })).toBeVisible();

  await page.goto(paths.heading);
  await expect(page.locator("[data-product-narrative]")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Synthetic renderable Heading", exact: true })).toBeVisible();

  await page.goto(paths.validMedia);
  await expect(page.locator("[data-product-narrative]")).toBeVisible();
  const narrativeImages = page.locator('[data-product-narrative] img');
  await expect(narrativeImages).toHaveCount(3);
  for (const image of await narrativeImages.all()) {
    await expect(image).toHaveAttribute("src", /^\/api\/public-assets\//);
  }
});

test("@desktop independent Product modules and Revision approval remain projection-driven", async ({ page }) => {
  const paths = blockProjectionFixtures.renderableProductPaths;
  await page.goto(paths.independentModules);
  await expect(page.locator("[data-product-narrative]")).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Features", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Applications", exact: true })).toBeVisible();

  await page.goto(paths.revisionBefore);
  await expect(page.getByText("Approved narrative remains before Revision approval.", { exact: true })).toBeVisible();
  await expect(page.locator("[data-product-narrative]")).toBeVisible();

  await expectNoProductNarrative(page, paths.revisionAfter);
  await expect(page.getByText("Narrative before final approved Revision.", { exact: true })).toHaveCount(0);
});

test("@desktop fixed responsive widths have no blocked navigation, CTA, form, or horizontal overflow", async ({ page }) => {
  const fixture = blockProjectionFixtures;
  for (const width of [320, 375, 390, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: width < 800 ? 900 : 1000 });
    for (const path of [
      "/",
      "/about/",
      fixture.renderableProductPaths.empty,
      fixture.renderableProductPaths.paragraph,
      fixture.productPath,
      fixture.contentPath,
      "/get-quote/",
    ]) {
      const response = await page.goto(path);
      expect(response?.status(), `${path} at ${width}px`).toBe(200);
      expect(await page.evaluate(() => document.documentElement.scrollWidth), `${path} overflow at ${width}px`)
        .toBeLessThanOrEqual(await page.evaluate(() => window.innerWidth));
    }
    await expect(page.getByLabel("Email", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Find Your Fabric Solution", exact: true })).toBeVisible();
    await page.goto("/");
    if (width < 1024) await expect(page.locator("details.mobile-navigation > summary")).toBeVisible();
  }
});

test("@all Stage 2 fixed-page settings and shared Block Editor remain keyboard-operable", async ({ page }) => {
  await loginAsLocalAdmin(page);
  await page.goto("/admin/site/home/");
  await expect(page.getByRole("heading", { name: "Home Page Settings" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Preview Draft" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Open Desktop · 1200px" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Open Mobile · 390px" })).toBeVisible();
  await expect(page.getByRole("group", { name: "Fixed modules" })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
    await page.evaluate(() => window.innerWidth),
  );
  const pageSettingsAccessibility = await new AxeBuilder({ page }).include("main").analyze();
  expect(
    pageSettingsAccessibility.violations.filter((violation) =>
      ["critical", "serious"].includes(violation.impact ?? ""),
    ),
  ).toEqual([]);

  await page.goto("/admin/products/");
  await openLinkedRecord(
    page,
    page.getByRole("link", { name: /TEST FIXTURE Fabric Sample 03/ }),
  );
  const editor = page.locator('[data-block-editor="product"]');
  await expect(editor.getByRole("heading", { name: "Structured Block Editor" })).toBeVisible();
  const blocks = editor.locator("article");
  const initialBlockCount = await blocks.count();
  await editor.getByRole("button", { name: "Insert Block", exact: true }).click();
  await expect(blocks).toHaveCount(initialBlockCount + 1);
  const inserted = blocks.last();
  await inserted.getByRole("button", { name: "Lock", exact: true }).click();
  await expect(inserted.getByRole("button", { name: "Delete", exact: true })).toBeDisabled();
  await inserted.getByRole("button", { name: "Unlock", exact: true }).click();
  await editor.getByRole("button", { name: "Undo", exact: true }).click();
  await editor.getByRole("button", { name: "Undo", exact: true }).click();
  await editor.getByRole("button", { name: "Undo", exact: true }).click();
  await expect(blocks).toHaveCount(initialBlockCount);
  await expect(editor.getByRole("button", { name: "Redo", exact: true })).toBeEnabled();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
    await page.evaluate(() => window.innerWidth),
  );
  const accessibility = await new AxeBuilder({ page }).analyze();
  expect(
    accessibility.violations.filter((violation) =>
      ["critical", "serious"].includes(violation.impact ?? ""),
    ),
  ).toEqual([]);
});

test("@desktop Locked Blocks remain sorting anchors in Product and Content editors", async ({ page }) => {
  await loginAsLocalAdmin(page);
  for (const fixture of [
    { index: "/admin/products/", name: /TEST E2E Block Media Product/, type: "product" },
    { index: "/admin/contents/", name: /TEST E2E Block Media Content/, type: "content" },
  ] as const) {
    await page.goto(fixture.index);
    await openLinkedRecord(page, page.getByRole("link", { name: fixture.name }));
    const editor = page.locator(`[data-block-editor="${fixture.type}"]`);
    const blocks = editor.locator("article");
    await expect(blocks.nth(1).getByRole("button", { name: "Unlock", exact: true })).toBeVisible();
    await expect(blocks.first().getByRole("button", { name: "Move down", exact: true })).toBeDisabled();
    await expect(blocks.nth(2).getByRole("button", { name: "Move up", exact: true })).toBeDisabled();
    await blocks.nth(1).getByRole("button", { name: "Unlock", exact: true }).click();
    await expect(blocks.first().getByRole("button", { name: "Move down", exact: true })).toBeEnabled();
    await expect(blocks.nth(2).getByRole("button", { name: "Move up", exact: true })).toBeEnabled();
  }
});

test("@desktop Stage 2 editor, Preview, and Preview Asset role matrix fails closed", async ({ page }) => {
  test.setTimeout(120_000);
  await loginAsLocalAdmin(page);
  await page.goto("/admin/products/");
  const productHref = await page.getByRole("link", { name: /TEST E2E Block Media Product/ }).getAttribute("href");
  await page.goto("/admin/contents/");
  const contentHref = await page.getByRole("link", { name: /TEST E2E Block Media Content/ }).getAttribute("href");
  if (!productHref || !contentHref) throw new Error("Expected synthetic editorial fixture links.");
  const productId = productHref.split("/").filter(Boolean).at(-1)!;
  const contentId = contentHref.split("/").filter(Boolean).at(-1)!;
  const editorPaths = {
    product: productHref,
    content: contentHref,
    home: "/admin/site/home/",
    about: "/admin/site/about/",
  } as const;
  const previewPaths = {
    product: `/admin/preview/product/${productId}/`,
    content: `/admin/preview/content/${contentId}/`,
    home: "/admin/preview/site/home/",
    about: "/admin/preview/site/about/",
  } as const;
  await page.goto(previewPaths.product);
  const productAssetPath = await page.locator('img[src*="/api/admin/preview-assets/product/"]').first().getAttribute("src");
  await page.goto(previewPaths.content);
  const contentAssetPath = await page.locator('img[src*="/api/admin/preview-assets/content/"]').first().getAttribute("src");
  if (!productAssetPath || !contentAssetPath) throw new Error("Expected governed Preview media URLs.");
  const assetPaths = {
    product: productAssetPath,
    content: contentAssetPath,
    home: `/api/admin/preview-assets/site/home/${blockProjectionFixtures.enabledStaticAssetId}/`,
    about: `/api/admin/preview-assets/site/about/${blockProjectionFixtures.aboutStaticAssetId}/`,
  } as const;
  const expectations = [
    ["admin@example.test", new Set(["product", "content", "home", "about"])],
    ["product-editor@example.test", new Set(["product"])],
    ["content-editor@example.test", new Set(["content", "home", "about"])],
    ["reviewer@example.test", new Set(["product", "content", "home", "about"])],
    ["sales@example.test", new Set<string>()],
    ["analyst@example.test", new Set<string>()],
  ] as const;
  for (const [email, allowed] of expectations) {
    if (email === "admin@example.test") {
      await page.context().clearCookies();
      await loginAsLocalAdmin(page);
    } else {
      await loginAsEditorialRole(page, email);
    }
    const productIndex = await page.goto("/admin/products/");
    expect(productIndex?.status(), `${email} Product index`).toBe(allowed.has("product") ? 200 : 404);
    if (allowed.has("product")) {
      await expect(page.getByText(/TEST E2E Block Media Product/)).toBeVisible();
      await expect(page.getByRole("link", { name: "New Product Draft" }))
        .toHaveCount(email === "admin@example.test" || email === "product-editor@example.test" ? 1 : 0);
    } else {
      await expect(page.getByText(/TEST E2E Block Media Product/)).toHaveCount(0);
    }
    const productCreate = await page.goto("/admin/products/new/");
    expect(productCreate?.status(), `${email} Product create`).toBe(
      email === "admin@example.test" || email === "product-editor@example.test" ? 200 : 404,
    );
    const contentIndex = await page.goto("/admin/contents/");
    expect(contentIndex?.status(), `${email} Content index`).toBe(allowed.has("content") ? 200 : 404);
    if (allowed.has("content")) {
      await expect(page.getByText(/TEST E2E Block Media Content/)).toBeVisible();
      await expect(page.getByRole("heading", { name: "New Content Draft" }))
        .toHaveCount(email === "admin@example.test" || email === "content-editor@example.test" ? 1 : 0);
    } else {
      await expect(page.getByText(/TEST E2E Block Media Content/)).toHaveCount(0);
    }
    await page.goto("/admin/");
    await expect(page.getByRole("link", { name: "Products", exact: true }))
      .toHaveCount(allowed.has("product") ? 1 : 0);
    await expect(page.getByRole("link", { name: "Contents", exact: true }))
      .toHaveCount(allowed.has("content") ? 1 : 0);
    await expect(page.getByRole("link", { name: "Home Page Settings", exact: true }))
      .toHaveCount(allowed.has("home") ? 1 : 0);
    await expect(page.getByRole("link", { name: "About CWT Settings", exact: true }))
      .toHaveCount(allowed.has("about") ? 1 : 0);
    for (const key of ["product", "content", "home", "about"] as const) {
      const editorResponse = await page.goto(editorPaths[key]);
      expect(editorResponse?.status(), `${email} editor ${key}`).toBe(allowed.has(key) ? 200 : 404);
      const previewResponse = await page.goto(previewPaths[key]);
      expect(previewResponse?.status(), `${email} preview ${key}`).toBe(allowed.has(key) ? 200 : 404);
      const assetResponse = await page.request.get(assetPaths[key]);
      expect(assetResponse.status(), `${email} Preview Asset ${key}`).toBe(allowed.has(key) ? 200 : 404);
    }
  }
  await page.context().clearCookies();
  await page.goto("/admin/products/");
  await expect(page).toHaveURL(/\/operations-login\/?$/);
  await expect(page.getByText(/TEST E2E Block Media Product/)).toHaveCount(0);
  await page.goto("/admin/contents/");
  await expect(page).toHaveURL(/\/operations-login\/?$/);
  await expect(page.getByText(/TEST E2E Block Media Content/)).toHaveCount(0);
  for (const key of ["product", "content", "home", "about"] as const) {
    expect((await page.goto(previewPaths[key]))?.status(), `anonymous preview ${key}`).toBe(404);
    expect((await page.request.get(assetPaths[key])).status(), `anonymous Preview Asset ${key}`).toBe(403);
  }
});

test("@desktop six-width Admin and Public-context Preview matrix has no serious Axe or overflow failures", async ({ page }) => {
  test.setTimeout(240_000);
  await loginAsLocalAdmin(page);
  await page.goto("/admin/products/");
  const productHref = await page.getByRole("link", { name: /TEST E2E Block Media Product/ }).getAttribute("href");
  await page.goto("/admin/contents/");
  const contentHref = await page.getByRole("link", { name: /TEST E2E Block Media Content/ }).getAttribute("href");
  if (!productHref || !contentHref) throw new Error("Expected synthetic editorial fixture links.");
  const productId = productHref.split("/").filter(Boolean).at(-1)!;
  const contentId = contentHref.split("/").filter(Boolean).at(-1)!;
  const adminPaths = ["/admin/site/home/", "/admin/site/about/", productHref, contentHref];
  const previewPaths = [
    "/admin/preview/site/home/",
    "/admin/preview/site/about/",
    `/admin/preview/product/${productId}/`,
    `/admin/preview/content/${contentId}/`,
  ];
  const runtimeErrors: string[] = [];
  page.on("console", (message) => {
    if (["error", "warning"].includes(message.type())) runtimeErrors.push(`${message.type()}: ${message.text()}`);
  });
  page.on("pageerror", (error) => runtimeErrors.push(`pageerror: ${error.message}`));
  for (const width of [320, 375, 390, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: width < 800 ? 900 : 1000 });
    for (const path of [...adminPaths, ...previewPaths]) {
      const response = await page.goto(path);
      expect(response?.status(), `${path} at ${width}px`).toBe(200);
      expect(await page.evaluate(() => document.documentElement.scrollWidth), `${path} overflow at ${width}px`)
        .toBeLessThanOrEqual(await page.evaluate(() => window.innerWidth));
      const accessibility = await new AxeBuilder({ page }).analyze();
      expect(accessibility.violations.filter((violation) =>
        ["critical", "serious"].includes(violation.impact ?? ""),
      ), `${path} Axe at ${width}px`).toEqual([]);
      if (path.includes("/admin/preview/")) {
        await expect(page.getByText(/Authenticated .* Preview/)).toBeVisible();
        await expect(page.getByText(/CWT Operations/)).toHaveCount(0);
        await expect(page.getByRole("banner").getByRole("link", { name: "CloudWave Textile home", exact: true })).toBeVisible();
      }
    }
  }
  expect(runtimeErrors).toEqual([]);
});

test("@desktop remediation public routes produce no Console, page, or Hydration errors", async ({ page }) => {
  const fixture = blockProjectionFixtures;
  const errors: string[] = [];
  let currentPath = "before-navigation";
  page.on("console", (message) => {
    if (["error", "warning"].includes(message.type())) {
      errors.push(`${currentPath} ${message.type()}: ${message.text()} @ ${message.location().url}`);
    }
  });
  page.on("pageerror", (error) => errors.push(error.message));
  for (const path of [
    "/",
    fixture.renderableProductPaths.empty,
    fixture.renderableProductPaths.divider,
    fixture.renderableProductPaths.paragraph,
    fixture.productPath,
    fixture.contentPath,
  ]) {
    currentPath = path;
    await page.goto(path);
    await page.waitForLoadState("networkidle");
  }
  expect(errors).toEqual([]);
});

test("@desktop fixed CTA renders the href governed by its registered Route ID", async ({ page }) => {
  await page.goto(blockProjectionFixtures.contentPath);
  await expect(page.getByRole("link", { name: "TEST governed Get a Quote" }))
    .toHaveAttribute("href", "/get-quote/");
});

test("@mobile unreviewed synthetic Product remains fail-closed on Pixel 7", async ({ page }) => {
  const response = await page.goto("/products/test-fixture-fabric-02/");
  expect(response?.status()).toBe(404);
  await expect(page.getByRole("heading", { name: "This page could not be found." })).toBeVisible();
});

test("@desktop text-only inquiry is accepted", async ({ page }) => {
  await page.goto("/get-quote?utm_source=e2e&utm_medium=test&utm_campaign=phase1a");
  await page.getByLabel("Name", { exact: true }).fill("E2E Text Buyer");
  await page
    .getByLabel("Email", { exact: true })
    .fill(`e2e-text-${Date.now()}@example.test`);
  await page
    .getByLabel("Describe what you need", { exact: true })
    .fill("Testing the text-only inquiry path.");
  await page
    .getByRole("button", { name: "Find Your Fabric Solution", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("Requirement received");
});

test("@desktop image-only inquiry is accepted and remains a governed private attachment", async ({
  page,
}) => {
  const email = `e2e-image-${Date.now()}@example.test`;
  await page.goto("/get-quote/");
  await page.getByLabel("Name", { exact: true }).fill("E2E Image Buyer");
  await page
    .getByLabel("Email", { exact: true })
    .fill(email);
  await page.getByLabel("Upload fabric images", { exact: true }).setInputFiles({
    name: "fabric-reference.png",
    mimeType: "image/png",
    buffer: Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAQAAAAECAIAAAAmkwkpAAAACXBIWXMAAAPoAAAD6AG1e1JrAAAAEElEQVQImWMQCaiAIwbiOABfgw3BWckaWgAAAABJRU5ErkJggg==",
      "base64",
    ),
  });
  await page
    .getByRole("button", { name: "Find Your Fabric Solution", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("Requirement received");
  await loginAsLocalAdmin(page);
  await page.goto("/admin/inquiries/");
  await page.getByRole("link", { name: new RegExp(email) }).click();
  const privateFile = page.getByRole("link", { name: "fabric-reference.png" });
  await expect(privateFile).toHaveAttribute("href", /^\/api\/inquiry-assets\/.*\/$/);
});

test("@desktop attachment inquiry replays the frozen request after its committed response is lost", async ({
  page,
}) => {
  const email = `e2e-response-loss-${Date.now()}@example.test`;
  const inquiryBodies: string[] = [];
  const inquiryStatuses: number[] = [];
  let intentCreates = 0;
  let objectUploads = 0;

  await page.route("**/api/upload-intents/**", async (route) => {
    const request = route.request();
    if (request.method() === "POST" && new URL(request.url()).pathname === "/api/upload-intents/") {
      intentCreates += 1;
    }
    if (request.method() === "PUT") objectUploads += 1;
    await route.continue();
  });
  await page.route("**/api/inquiries/", async (route) => {
    inquiryBodies.push(route.request().postData() ?? "");
    const committedResponse = await route.fetch();
    inquiryStatuses.push(committedResponse.status());
    if (inquiryBodies.length === 1) {
      await route.abort("connectionfailed");
      return;
    }
    await route.fulfill({ response: committedResponse });
  });

  await page.goto("/get-quote/");
  await page.getByLabel("Name", { exact: true }).fill("E2E Response Loss Buyer");
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByLabel("Upload fabric images", { exact: true }).setInputFiles({
    name: "frozen-retry.png",
    mimeType: "image/png",
    buffer: Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAQAAAAECAIAAAAmkwkpAAAACXBIWXMAAAPoAAAD6AG1e1JrAAAAEElEQVQImWMQCaiAIwbiOABfgw3BWckaWgAAAABJRU5ErkJggg==",
      "base64",
    ),
  });
  await page.getByRole("button", { name: "Find Your Fabric Solution", exact: true }).click();

  const uncertain = page.getByRole("alert").filter({ hasText: "Submission outcome uncertain" });
  await expect(uncertain).toContainText("Submission outcome uncertain");
  await expect(uncertain).toContainText("frozen-retry.png");
  await expect(uncertain).toBeFocused();
  await expect(page.getByLabel("Name", { exact: true })).toHaveValue("E2E Response Loss Buyer");
  expect(page.url()).not.toContain("upload");

  await page.getByRole("button", { name: "Retry same submission" }).click();
  await expect(page.getByRole("status")).toContainText("Requirement received");
  expect(intentCreates).toBe(1);
  expect(objectUploads).toBe(1);
  expect(inquiryBodies).toHaveLength(2);
  expect(inquiryBodies[1]).toBe(inquiryBodies[0]);
  expect(inquiryStatuses).toEqual([201, 200]);

  await loginAsLocalAdmin(page);
  await page.goto("/admin/inquiries/");
  await expect(page.getByRole("link", { name: new RegExp(email) })).toHaveCount(1);
});

test("@desktop operations require authentication and local fixture login reaches the admin shell", async ({
  page,
}) => {
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/operations-login\/$/);
  await loginAsLocalAdmin(page);
  await expect(
    page.getByRole("heading", { level: 1, name: "CWT operations" }),
  ).toBeVisible();
  await page.goto("/admin/audit/");
  await expect(page.getByText("auth.login.success").first()).toBeVisible();
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/operations-login\/$/);
  await loginAsLocalAdmin(page);
  await page.goto("/admin/audit/");
  await expect(page.getByText("auth.logout").first()).toBeVisible();
  await expect(page.getByText("auth.session.revoked").first()).toBeVisible();
});

test("@desktop governed admin create returns a redirect intent and lands on persisted Author data", async ({ page }) => {
  await loginAsLocalAdmin(page);
  await page.goto("/admin/authors/");
  const suffix = Date.now();
  const displayName = `TEST FIXTURE Author ${suffix}`;
  await page.getByPlaceholder("Display name").fill(displayName);
  await page.getByPlaceholder("stable-internal-key").fill(`test-fixture-author-${suffix}`);
  const createButton = page.getByRole("button", { name: "Create Author" });
  await createButton.click();
  await expect(page).toHaveURL(/\/admin\/authors\/\?created=[0-9a-f-]{36}$/i);
  await expect(page.locator(`input[name="displayName"][value="${displayName}"]`)).toBeVisible();
});

test("@desktop a create Action exposes a redirect intent and lands on persisted data", async ({ page }) => {
  await loginAsLocalAdmin(page);
  await page.goto("/admin/applications/");
  const suffix = Date.now();
  const name = `TEST FIXTURE Redirect Application ${suffix}`;
  await page.getByPlaceholder("e.g. Sportswear").fill(name);
  await page.getByPlaceholder("stable-internal-key").fill(`test-redirect-application-${suffix}`);
  await page.getByPlaceholder("Landing page body").fill("Synthetic E2E-only Application body for Redirect Intent verification.");
  await page.getByRole("button", { name: "Create noindex draft" }).click();
  await expect(page).toHaveURL(/\/admin\/applications\/[0-9a-f-]{36}\/$/i);
  await expect(page.locator('input[name="name"]')).toHaveValue(name);
  await expect(page.getByText(/draft · noindex/i)).toBeVisible();
});

test("@desktop Asset Library opens a governed Asset with Source Declaration off by default", async ({ page }) => {
  await loginAsLocalAdmin(page);
  await page.goto("/admin/assets/");
  await expect(page.getByRole("heading", { name: "Asset Library" })).toBeVisible();
  const firstAsset = page.locator("tbody a").first();
  await expect(firstAsset).toBeVisible();
  await openLinkedRecord(page, firstAsset);
  await expect(page.getByText("Detected MIME", { exact: true })).toBeVisible();
  await expect(page.getByRole("checkbox", { name: "Enable Source Declaration" })).not.toBeChecked();
});

test("@desktop Asset Library denies Analyst before data and preserves scoped role access", async ({ page }) => {
  const consoleFailures: string[] = [];
  const pageFailures: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error" || message.type() === "warning") {
      consoleFailures.push(`${message.text()} @ ${message.location().url}`);
    }
  });
  page.on("pageerror", (error) => pageFailures.push(error.message));

  await loginAsEditorialRole(page, "analyst@example.test");
  const analystResponse = await page.goto("/admin/assets/");
  expect(analystResponse?.status()).toBe(404);
  await expect(page.getByRole("heading", { name: "Asset Library" })).toHaveCount(0);
  await expect(page.getByText(/TEST E2E Block Media Product/)).toHaveCount(0);
  await expect(page.getByText(/TEST E2E Block Media Content/)).toHaveCount(0);
  await expect(page.locator("body")).not.toContainText("AuthorizationError");
  await expect(page.locator("body")).not.toContainText("assets.read");

  await loginAsEditorialRole(page, "sales@example.test");
  expect((await page.goto("/admin/assets/"))?.status()).toBe(200);
  await expect(page.getByRole("heading", { name: "Asset Library" })).toBeVisible();
  await expect(page.getByText("You have review-only Asset access.", { exact: false })).toBeVisible();
  await expect(page.getByText(/TEST E2E Block Media Product/)).toHaveCount(0);
  await expect(page.getByText(/TEST E2E Block Media Content/)).toHaveCount(0);

  await loginAsEditorialRole(page, "product-editor@example.test");
  expect((await page.goto("/admin/assets/"))?.status()).toBe(200);
  await expect(page.getByLabel("Associate with")).toContainText("TEST E2E Block Media Product");
  await expect(page.getByLabel("Associate with")).not.toContainText("TEST E2E Block Media Content");

  await loginAsEditorialRole(page, "content-editor@example.test");
  expect((await page.goto("/admin/assets/"))?.status()).toBe(200);
  await expect(page.getByLabel("Associate with")).not.toContainText("TEST E2E Block Media Product");
  await expect(page.getByLabel("Associate with")).toContainText("TEST E2E Block Media Content");

  await loginAsEditorialRole(page, "reviewer@example.test");
  expect((await page.goto("/admin/assets/"))?.status()).toBe(200);
  await expect(page.getByRole("heading", { name: "Asset Library" })).toBeVisible();
  await expect(page.getByLabel("Associate with")).toHaveCount(0);

  await page.context().clearCookies();
  await page.goto("/admin/assets/");
  await expect(page).toHaveURL(/\/operations-login\/?$/);
  await expect(page.getByRole("heading", { name: "Asset Library" })).toHaveCount(0);

  const controlledDenialNetworkMessages = consoleFailures.filter((message) =>
    message.includes("Failed to load resource: the server responded with a status of 404") &&
    message.endsWith("@ http://127.0.0.1:3100/admin/assets/"),
  );
  expect(controlledDenialNetworkMessages).toHaveLength(1);
  expect(consoleFailures).toEqual(controlledDenialNetworkMessages);
  expect(pageFailures).toEqual([]);
});

test("@desktop Asset Library uploads through authenticated binary Intents with Source Declaration off", async ({ page }) => {
  await loginAsLocalAdmin(page);
  await page.goto("/admin/assets/");
  const fileName = `e2e-admin-asset-${Date.now()}.png`;
  await page.getByLabel("Files", { exact: true }).setInputFiles({
    name: fileName,
    mimeType: "image/png",
    buffer: Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAQAAAAECAIAAAAmkwkpAAAACXBIWXMAAAPoAAAD6AG1e1JrAAAAEElEQVQImWMQCaiAIwbiOABfgw3BWckaWgAAAABJRU5ErkJggg==",
      "base64",
    ),
  });
  await page.getByLabel("Asset Category").selectOption("product");
  await page.getByRole("button", { name: "Upload and process" }).click();
  await expect(page.getByText("1 asset uploaded and released.")).toBeVisible();
  await expect(page.getByRole("link", { name: fileName })).toBeVisible();
  await expect(page.getByRole("checkbox", { name: "Enable Source Declaration" })).not.toBeChecked();
});

test("@desktop Asset Library retries an interrupted Batch without asking for another upload", async ({ page }) => {
  await page.context().addCookies([{
    name: "cwt_e2e_session",
    value: "cwt-e2e-retryable-asset-session",
    url: "http://127.0.0.1:3100",
  }]);
  await page.goto("/admin/assets/");
  const recoverySection = page.getByRole("region", { name: "Uploads that need processing" });
  await expect(recoverySection).toBeVisible();
  await expect(recoverySection.getByText("TEST interrupted upload — retry without re-upload.jpg")).toBeVisible();
  await expect(recoverySection.getByText(/without uploading the file again/i).last()).toBeVisible();
  const retry = page.getByRole("button", { name: "Retry processing" });
  await retry.click();
  await expect(page.getByRole("button", { name: "Retrying processing…" })).toBeDisabled();
  await expect(page.getByRole("status")).toContainText("no re-upload was needed");
  await expect(recoverySection.getByText("TEST interrupted upload — retry without re-upload.jpg")).toHaveCount(0);
  const assetLink = page.getByRole("link", { name: "TEST interrupted upload — retry without re-upload.jpg" });
  await expect(assetLink).toBeVisible();
  await expect(assetLink.locator("xpath=ancestor::tr")).toContainText("public");
  await expect(page.getByRole("heading", { name: "Uploads that need processing" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Retry processing" })).toHaveCount(0);
});

test("@desktop a Published Product edit stays pending until approval", async ({ page }) => {
  await loginAsLocalAdmin(page);
  await page.goto("/admin/products/");
  await openLinkedRecord(
    page,
    page.getByRole("link", { name: /TEST FIXTURE Fabric Sample 01/ }),
  );
  await page.getByLabel("Real Product basis").selectOption("physical_sample");
  await page.getByLabel("Evidence note").fill("Explicit E2E-only reviewer confirmation; never production data.");
  await submitServerAction(
    page,
    page.getByRole("button", { name: "Confirm real Product basis" }),
  );
  await submitServerAction(page, page.getByRole("button", { name: "Publish", exact: true }));
  const published = await page.request.get(fixtureProductPath);
  expect(published.status()).toBe(200);
  expect(await published.text()).toContain('"Product"');
  const replacement = `E2E approved editorial revision ${Date.now()}.`;
  await page.getByLabel("Short Description").fill(replacement);
  await page.getByRole("button", { name: "Save now" }).click();
  await expect(page.getByText("Draft saved. Review, Apply, Publish, and Index remain explicit actions."))
    .toBeVisible();
  await page.reload();
  await submitServerAction(
    page,
    page.getByRole("button", { name: "Submit Block Draft for Review" }),
  );
  await expect(page.getByText(/editorial_blocks · in_review/).first()).toBeVisible();
  const publicBefore = await page.request.get(fixtureProductPath);
  expect(await publicBefore.text()).not.toContain(replacement);
  await submitServerAction(
    page,
    page.getByRole("button", { name: "Approve & apply" }).first(),
  );
  await page.goto(fixtureProductPath);
  await expect(page.getByText(replacement)).toBeVisible();
  const image = page.locator("[data-product-detail] img").first();
  await expect(image).toHaveAttribute("src", /^\/api\/public-assets\/[0-9a-f-]{36}\/$/i);
  const imagePath = await image.getAttribute("src");
  if (!imagePath) throw new Error("Published test Product image is missing its governed media path.");
  expect((await page.request.get(imagePath)).headers()["cache-control"]).toContain("no-store");
  await expect(page.getByText("Product Code", { exact: true })).toHaveCount(0);
  await expect(page.getByText("MOQ", { exact: true })).toHaveCount(0);
});

test("@desktop a changed Published Product slug returns a real 301 to the slash URL", async ({ page }) => {
  await loginAsLocalAdmin(page);
  await page.goto("/admin/products/");
  await openLinkedRecord(
    page,
    page.getByRole("link", { name: /TEST FIXTURE Fabric Sample 12/ }),
  );
  await page.getByLabel("Real Product basis").selectOption("physical_sample");
  await page.getByLabel("Evidence note").fill("Explicit E2E-only redirect workflow confirmation.");
  await submitServerAction(
    page,
    page.getByRole("button", { name: "Confirm real Product basis" }),
  );
  await submitServerAction(page, page.getByRole("button", { name: "Publish", exact: true }));
  const routeText = await page.locator("p").filter({ hasText: /^\/products\// }).first().textContent();
  const oldPath = routeText?.split(" · ")[0];
  if (!oldPath) throw new Error("Unable to read the current fixture Product path.");
  const slug = `e2e-redirect-${Date.now()}`;
  const newPath = `/products/${slug}/`;
  await page.getByRole("heading", { name: "Change slug with 301" }).locator("..")
    .getByRole("textbox").fill(slug);
  await submitServerAction(
    page,
    page.getByRole("button", { name: "Change URL transactionally" }),
  );
  const redirectResponse = await page.request.get(oldPath, { maxRedirects: 0 });
  expect(redirectResponse.status()).toBe(301);
  expect(redirectResponse.headers().location).toContain(newPath);
  expect((await page.request.get(newPath)).status()).toBe(200);
});

test("@desktop inquiry submission flows into governed CRM activity", async ({ page }) => {
  const email = `e2e-crm-${Date.now()}@example.test`;
  await page.goto("/get-quote/");
  await page.getByLabel("Name", { exact: true }).fill("E2E CRM Buyer");
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByLabel("Describe what you need", { exact: true }).fill("E2E CRM workflow validation.");
  await page.getByRole("button", { name: "Find Your Fabric Solution", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Requirement received");
  await loginAsLocalAdmin(page);
  await page.goto("/admin/inquiries/");
  await openLinkedRecord(page, page.getByRole("link", { name: new RegExp(email) }));
  await page.getByLabel("Owner").selectOption({ label: "Local CWT Administrator · admin" });
  await submitServerAction(page, page.getByRole("button", { name: "Save assignment" }));
  await page.getByRole("heading", { name: "Change status" }).locator("..").getByRole("combobox").selectOption("reviewing");
  await submitServerAction(
    page,
    page.getByRole("button", { name: "Apply governed transition" }),
  );
  const activity = page.getByRole("heading", { name: "Add activity" }).locator("..");
  await activity.getByLabel("Type").selectOption("email");
  await activity.getByLabel("Direction").selectOption("outbound");
  await activity.getByRole("textbox").fill("E2E outbound response recorded.");
  await submitServerAction(
    page,
    activity.getByRole("button", { name: "Record activity" }),
  );
  await expect(page.getByText("E2E outbound response recorded.")).toBeVisible();
  await expect(page.getByText("outbound", { exact: true })).toBeVisible();
});
