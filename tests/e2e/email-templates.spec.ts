import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Locator, type Page } from "@playwright/test";

const INTERNAL_PREVIEW_NAME = "Internal inquiry notification Synthetic Preview";
const CUSTOMER_PREVIEW_NAME = "Customer inquiry confirmation Synthetic Preview";
const SYNTHETIC_OPERATIONS_URL =
  "https://operations.example.test/admin/inquiries/00000000-0000-4000-8000-000000000001/";
const LONG_UNBROKEN_TOKEN = `SYNTHETICLONGTOKEN${"A".repeat(900)}`;
const INTERNAL_V1_SOURCE = `Synthetic internal v1
Reference: {{inquiry_reference}}
Open: {{operations_url}}
Long token: ${LONG_UNBROKEN_TOKEN}`;
const INTERNAL_V1_RENDERED = `Synthetic internal v1
Reference: CWT-AAAAAAAAAAAAAAAAAAAA
Open: ${SYNTHETIC_OPERATIONS_URL}
Long token: ${LONG_UNBROKEN_TOKEN}`;
const INTERNAL_FALLBACK_BODY = `New CWT inquiry

Reference: CWT-AAAAAAAAAAAAAAAAAAAA
Submitted: 2026-01-15T10:30:00.000Z
Name: Synthetic Customer
Email: synthetic@example.test
Country: US
WhatsApp: +1 555 0100
Description: Conspicuously Synthetic inquiry description.
Private attachment count: 2
Source page: /synthetic-source/
Landing page: /synthetic-landing/
Referrer: synthetic.example.test
UTM: synthetic_source / synthetic_medium / synthetic_campaign
Last non-direct: synthetic_last_source / synthetic_last_medium /
synthetic_last_campaign
Source entity: product — Synthetic Product Label

Open CWT Operations: ${SYNTHETIC_OPERATIONS_URL}
Review private files only through authenticated record-scoped access.`;

async function expectUniquePreviewLandmarks(page: Page): Promise<void> {
  await expect(page.getByRole("region", { name: INTERNAL_PREVIEW_NAME, exact: true })).toHaveCount(1);
  await expect(page.getByRole("region", { name: CUSTOMER_PREVIEW_NAME, exact: true })).toHaveCount(1);
}

async function expectUnfilteredAxePass(page: Page): Promise<void> {
  const accessibility = await new AxeBuilder({ page }).analyze();
  expect(accessibility.violations).toEqual([]);
}

async function expectPreviewContainment(page: Page, expectedDeviceWidth: number): Promise<void> {
  const metrics = await page.evaluate(() => {
    const visualViewport = window.visualViewport;
    const viewportLeft = visualViewport?.offsetLeft ?? 0;
    const viewportWidth = visualViewport?.width ?? window.innerWidth;
    const targets = [...document.querySelectorAll<HTMLElement>(
      "[data-template-preview], [data-template-preview-essential]",
    )].map((element) => {
      const bounds = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      return {
        marker: element.dataset.templatePreview ?? element.dataset.templatePreviewEssential ?? "unknown",
        left: bounds.left,
        right: bounds.right,
        width: bounds.width,
        clientWidth: element.clientWidth,
        scrollWidth: element.scrollWidth,
        overflowX: style.overflowX,
        overflowWrap: style.overflowWrap,
        textOverflow: style.textOverflow,
        whiteSpace: style.whiteSpace,
      };
    });
    return {
      screenWidth: window.screen.width,
      visualViewportWidth: viewportWidth,
      visualViewportLeft: viewportLeft,
      innerWidth: window.innerWidth,
      documentScrollWidth: document.documentElement.scrollWidth,
      bodyScrollWidth: document.body.scrollWidth,
      targets,
    };
  });

  expect(metrics.screenWidth).toBe(expectedDeviceWidth);
  expect(metrics.visualViewportWidth).toBe(expectedDeviceWidth);
  expect(metrics.innerWidth).toBe(expectedDeviceWidth);
  expect(metrics.documentScrollWidth).toBe(expectedDeviceWidth);
  expect(metrics.bodyScrollWidth).toBe(expectedDeviceWidth);
  expect(metrics.targets).toHaveLength(6);
  const viewportRight = metrics.visualViewportLeft + metrics.visualViewportWidth;
  for (const target of metrics.targets) {
    expect(target.left, `${target.marker} left edge`).toBeGreaterThanOrEqual(metrics.visualViewportLeft - 0.5);
    expect(target.right, `${target.marker} right edge`).toBeLessThanOrEqual(viewportRight + 0.5);
    expect(target.width, `${target.marker} visible width`).toBeGreaterThan(0);
    expect(target.scrollWidth, `${target.marker} intrinsic overflow`).toBeLessThanOrEqual(target.clientWidth);
    expect(target.overflowX, `${target.marker} must not conceal overflow`).not.toMatch(/hidden|clip/);
    expect(target.textOverflow, `${target.marker} must not truncate`).not.toBe("ellipsis");
  }
  const bodies = metrics.targets.filter((target) => target.marker === "body");
  expect(bodies).toHaveLength(2);
  expect(bodies.every((target) => target.whiteSpace === "pre-wrap")).toBe(true);
  expect(bodies.every((target) => target.overflowWrap === "anywhere")).toBe(true);
}

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

async function applyLongInternalTemplate(page: Page, internal: Locator): Promise<void> {
  const editor = internal.getByRole("heading", { name: "Create next Draft" }).locator("xpath=ancestor::form");
  await editor.getByLabel("Subject source").fill("Synthetic internal v1 {{inquiry_reference}}");
  await editor.getByLabel("Plain-text body source").fill(INTERNAL_V1_SOURCE);
  await editor.getByLabel("Change summary").fill("Synthetic internal v1 Admin flow");
  await runAdminActionAndExpect(page, editor.getByRole("button", { name: "Save Draft" }));
  const submit = internal.getByRole("heading", { name: "Submit Draft v1" }).locator("xpath=ancestor::form");
  await runAdminActionAndExpect(page, submit.getByRole("button", { name: "Submit for review" }));
  await runAdminActionAndExpect(page, internal.getByRole("button", { name: "Review & Apply" }));
  await expect(internal.getByText("Synthetic internal v1 CWT-AAAAAAAAAAAAAAAAAAAA", { exact: true }))
    .toBeVisible();
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
  const internalPreview = page.getByRole("region", { name: INTERNAL_PREVIEW_NAME, exact: true });
  await expectUniquePreviewLandmarks(page);
  expect(await internalPreview.locator("pre").textContent()).toBe(INTERNAL_FALLBACK_BODY);
  await expect(internalPreview.locator("pre")).toContainText(SYNTHETIC_OPERATIONS_URL);
  await expectPreviewContainment(page, 1280);
  await expectUnfilteredAxePass(page);

  await applyLongInternalTemplate(page, internal);
  await expect(internal.getByText("Synthetic internal v1 CWT-AAAAAAAAAAAAAAAAAAAA", { exact: true })).toBeVisible();
  expect(await internalPreview.locator("pre").textContent()).toBe(INTERNAL_V1_RENDERED);
  await expectPreviewContainment(page, 1280);

  const editor = internal.getByRole("heading", { name: "Create next Draft" }).locator("xpath=ancestor::form");
  await editor.getByLabel("Subject source").fill("Synthetic internal v2 {{inquiry_reference}}");
  await editor.getByLabel("Plain-text body source").fill("Synthetic internal v2\nReference: {{inquiry_reference}}\nOpen: {{operations_url}}");
  await editor.getByLabel("Change summary").fill("Synthetic internal v2 Admin flow");
  await runAdminActionAndExpect(page, editor.getByRole("button", { name: "Save Draft" }));
  const submit = internal.getByRole("heading", { name: "Submit Draft v2" }).locator("xpath=ancestor::form");
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
  await expectUniquePreviewLandmarks(page);
  const internalPreview = page.getByRole("region", { name: INTERNAL_PREVIEW_NAME, exact: true });
  expect(await internalPreview.locator("pre").textContent()).toBe(INTERNAL_FALLBACK_BODY);
  await expectPreviewContainment(page, 412);
  await expectUnfilteredAxePass(page);
});
