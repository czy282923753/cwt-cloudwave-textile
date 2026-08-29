import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Locator, type Page } from "@playwright/test";

async function loginAsLocalAdmin(page: Page): Promise<void> {
  await page.context().clearCookies();
  await page.goto("/operations-login/");
  await page.getByLabel("Email", { exact: true }).fill("admin@example.test");
  await page.getByLabel("Password", { exact: true }).fill("local-only-admin-password");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/\/admin\/$/);
}

async function loginAsEditorialRole(page: Page, email: string): Promise<void> {
  await page.context().clearCookies();
  await page.goto("/operations-login/");
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByLabel("Password", { exact: true }).fill("local-only-role-password");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/\/admin\/$/);
}

async function runAdminActionAndExpect(
  page: Page,
  button: Locator,
): Promise<void> {
  const form = button.locator("xpath=ancestor::form");
  const [response] = await Promise.all([
    page.waitForResponse((candidate) =>
      candidate.request().method() === "POST" &&
      candidate.headers()["content-type"]?.includes("text/x-component") === true),
    button.click(),
  ]);
  expect(response.ok()).toBe(true);
  await expect(form.getByRole("alert")).toHaveCount(0);
}

test("@desktop Email Template Admin lifecycle, rollback, Preview, capture, and role matrix", async ({ page }) => {
  test.setTimeout(240_000);
  await loginAsLocalAdmin(page);
  const response = await page.goto("/admin/email-templates/");
  expect(response?.ok()).toBe(true);
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
  await expect(page.getByRole("heading", { level: 1, name: "Email Templates" })).toBeVisible();
  await expect(page.getByText("SYNTHETIC_EMAIL_TEMPLATE_V1").first()).toBeVisible();
  await expect(page.getByText("Exact code fallback").first()).toBeVisible();
  await expect(page.getByText("Fixed recipient: test@cwtextile.com").first()).toBeVisible();
  await expect(page.locator('input[name="recipient"]')).toHaveCount(0);

  const internal = page.locator("article").filter({
    has: page.getByRole("heading", { name: "Internal inquiry notification" }),
  });
  let editor = internal.getByRole("heading", { name: "Create next Draft" }).locator("xpath=ancestor::form");
  await editor.getByLabel("Subject source").fill("Synthetic internal v1 {{inquiry_reference}}");
  await editor.getByLabel("Plain-text body source").fill("Synthetic internal v1\nReference: {{inquiry_reference}}\nOpen: {{operations_url}}");
  await editor.getByLabel("Change summary").fill("Synthetic internal v1 Admin flow");
  await runAdminActionAndExpect(page, editor.getByRole("button", { name: "Save Draft" }));

  let submit = internal.getByRole("heading", { name: "Submit Draft v1" }).locator("xpath=ancestor::form");
  await runAdminActionAndExpect(page, submit.getByRole("button", { name: "Submit for review" }));
  await runAdminActionAndExpect(page, internal.getByRole("button", { name: "Review & Apply" }));
  await expect(internal.getByText("Synthetic internal v1 CWT-AAAAAAAAAAAAAAAAAAAA", { exact: true })).toBeVisible();

  editor = internal.getByRole("heading", { name: "Create next Draft" }).locator("xpath=ancestor::form");
  await editor.getByLabel("Subject source").fill("Synthetic internal v2 {{inquiry_reference}}");
  await editor.getByLabel("Plain-text body source").fill("Synthetic internal v2\nReference: {{inquiry_reference}}\nOpen: {{operations_url}}");
  await editor.getByLabel("Change summary").fill("Synthetic internal v2 Admin flow");
  await runAdminActionAndExpect(page, editor.getByRole("button", { name: "Save Draft" }));
  submit = internal.getByRole("heading", { name: "Submit Draft v2" }).locator("xpath=ancestor::form");
  await runAdminActionAndExpect(page, submit.getByRole("button", { name: "Submit for review" }));
  await runAdminActionAndExpect(page, internal.getByRole("button", { name: "Review & Apply" }));
  await expect(internal.getByText("Synthetic internal v2 CWT-AAAAAAAAAAAAAAAAAAAA", { exact: true })).toBeVisible();

  const firstRevision = internal.locator("li").filter({ hasText: "Revision 1 · applied" });
  await runAdminActionAndExpect(page, firstRevision.getByRole("button", { name: "Rollback as new copy" }));
  await expect(internal.getByText("Revision 3 · applied · LIVE", { exact: true })).toBeVisible();
  await expect(internal.getByText("Synthetic internal v1 CWT-AAAAAAAAAAAAAAAAAAAA", { exact: true })).toBeVisible();

  const secondRevisionPreview = internal.locator("li").filter({ hasText: "Revision 2 · applied" })
    .getByRole("link", { name: "Preview this Revision" });
  await secondRevisionPreview.click();
  await expect(page).toHaveURL(/kind=inquiry_notification&revisionId=/);
  await expect(internal.getByText("Synthetic internal v2 CWT-AAAAAAAAAAAAAAAAAAAA", { exact: true })).toBeVisible();
  await page.getByRole("link", { name: "Return to Active previews" }).click();
  const testButton = internal.getByRole("button", { name: "Test Active with Synthetic data" });
  const testForm = testButton.locator("xpath=ancestor::form");
  await runAdminActionAndExpect(page, testButton);
  await expect(testForm.getByRole("status")).toContainText(
    /Capture-only test succeeded for test@cwtextile\.com\. Outcome Audit recorded/,
  );

  const customer = page.locator("article").filter({
    has: page.getByRole("heading", { name: "Customer inquiry confirmation" }),
  });
  const customerEditor = customer.getByRole("heading", { name: "Create next Draft" }).locator("xpath=ancestor::form");
  await customerEditor.getByLabel("Subject source").fill("Synthetic customer review {{inquiry_reference}}");
  await customerEditor.getByLabel("Plain-text body source").fill("Hello {{customer_name}}\nSynthetic confirmation {{inquiry_reference}} from {{company_name}}.\nReply to {{reply_to_email}}.");
  await customerEditor.getByLabel("Change summary").fill("Synthetic customer review matrix");
  await runAdminActionAndExpect(page, customerEditor.getByRole("button", { name: "Save Draft" }));
  await runAdminActionAndExpect(page, customer.getByRole("button", { name: "Submit for review" }));
  await expect(customer.getByText(/awaiting independent review/)).toBeVisible();

  const matrix = [
    ["admin@example.test", true, true, true, true],
    ["content-editor@example.test", true, true, false, false],
    ["reviewer@example.test", true, false, true, false],
    ["product-editor@example.test", false, false, false, false],
    ["sales@example.test", false, false, false, false],
    ["analyst@example.test", false, false, false, false],
  ] as const;
  for (const [email, allowed, canWrite, canApply, canTest] of matrix) {
    if (email === "admin@example.test") await loginAsLocalAdmin(page);
    else await loginAsEditorialRole(page, email);
    await page.goto("/admin/");
    await expect(page.getByRole("link", { name: "Email Templates", exact: true }))
      .toHaveCount(allowed ? 1 : 0);
    const roleResponse = await page.goto("/admin/email-templates/");
    expect(roleResponse?.status(), email).toBe(allowed ? 200 : 404);
    if (!allowed) {
      await expect(page.getByRole("heading", { name: "Email Templates" })).toHaveCount(0);
      continue;
    }
    await expect(page.getByRole("button", { name: "Save Draft" })).toHaveCount(canWrite ? 1 : 0);
    await expect(page.getByRole("button", { name: "Review & Apply" })).toHaveCount(canApply ? 1 : 0);
    await expect(page.getByRole("button", { name: "Rollback as new copy" })).toHaveCount(canApply ? 2 : 0);
    await expect(page.getByRole("button", { name: /Test Active with Synthetic data/ })).toHaveCount(canTest ? 2 : 0);
    await expect(page.getByRole("heading", { name: "Fixed-Synthetic Preview" })).toHaveCount(2);
    expect(await page.locator("body").textContent()).not.toContain("customer@example.test");
  }
  await page.context().clearCookies();
  await page.goto("/admin/email-templates/");
  await expect(page).toHaveURL(/\/operations-login\/?$/);
});

test("@mobile Email Template Admin is keyboard-focusable, accessible, and has no horizontal overflow", async ({ page }) => {
  await loginAsLocalAdmin(page);
  await page.goto("/admin/email-templates/");
  await expect(page.getByRole("heading", { level: 1, name: "Email Templates" })).toBeVisible();
  const focusTarget = page.getByRole("button", { name: "Test Active with Synthetic data" }).first();
  await focusTarget.focus();
  await expect(focusTarget).toBeFocused();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
    await page.evaluate(() => window.innerWidth),
  );
  const accessibility = await new AxeBuilder({ page }).analyze();
  expect(accessibility.violations.filter((violation) =>
    ["critical", "serious"].includes(violation.impact ?? ""),
  )).toEqual([]);
});
