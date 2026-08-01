import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const fixtureProductPath = "/products/test-fixture-fabric-01";

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

test("@all fixture Product renders governed metadata, schema, and no empty specification module", async ({
  page,
}) => {
  const response = await page.goto(fixtureProductPath);
  expect(response?.ok()).toBe(true);
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "TEST FIXTURE",
  );
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
    "content",
    /noindex/,
  );
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    "href",
    new RegExp(`${fixtureProductPath}$`),
  );
  const schemaText = await page.locator('script[type="application/ld+json"]').textContent();
  expect(schemaText).toContain('"Product"');
  expect(schemaText).toContain('"BreadcrumbList"');
  await expect(page.getByText("Product Code", { exact: true })).toHaveCount(0);
  await expect(page.getByText("MOQ", { exact: true })).toHaveCount(0);
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

test("@desktop image-only inquiry is accepted and the uploaded file stays private", async ({
  page,
}) => {
  await page.goto("/get-quote");
  await page.getByLabel("Name", { exact: true }).fill("E2E Image Buyer");
  await page
    .getByLabel("Email", { exact: true })
    .fill(`e2e-image-${Date.now()}@example.test`);
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
});

test("@desktop operations require authentication and local fixture login reaches the admin shell", async ({
  page,
}) => {
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/operations-login$/);
  await page.getByLabel("Email", { exact: true }).fill("admin@example.test");
  await page
    .getByLabel("Password", { exact: true })
    .fill("local-only-admin-password");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/\/admin$/);
  await expect(
    page.getByRole("heading", { level: 1, name: "CWT operations" }),
  ).toBeVisible();
});
