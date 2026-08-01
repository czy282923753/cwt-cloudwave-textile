import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Locator, type Page } from "@playwright/test";

const fixtureProductPath = "/products/test-fixture-fabric-01/";

async function loginAsLocalAdmin(page: Page) {
  await page.goto("/operations-login/");
  await page.getByLabel("Email", { exact: true }).fill("admin@example.test");
  await page
    .getByLabel("Password", { exact: true })
    .fill("local-only-admin-password");
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

test("@desktop a Published Product edit stays pending until approval", async ({ page }) => {
  await loginAsLocalAdmin(page);
  await page.goto("/admin/products/");
  await openLinkedRecord(
    page,
    page.getByRole("link", { name: /TEST FIXTURE Fabric Sample 01/ }),
  );
  const replacement = `E2E approved editorial revision ${Date.now()}.`;
  await page.getByLabel("Short Description").fill(replacement);
  await submitServerAction(
    page,
    page.getByRole("button", { name: "Save or propose editorial copy" }),
  );
  await expect(page.getByText(/editorial_copy · in_review/).first()).toBeVisible();
  const publicBefore = await page.request.get(fixtureProductPath);
  expect(await publicBefore.text()).not.toContain(replacement);
  await submitServerAction(
    page,
    page.getByRole("button", { name: "Approve & apply" }).first(),
  );
  await page.goto(fixtureProductPath);
  await expect(page.getByText(replacement)).toBeVisible();
});

test("@desktop a changed Published Product slug returns a real 301 to the slash URL", async ({ page }) => {
  await loginAsLocalAdmin(page);
  await page.goto("/admin/products/");
  await openLinkedRecord(
    page,
    page.getByRole("link", { name: /TEST FIXTURE Fabric Sample 12/ }),
  );
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
