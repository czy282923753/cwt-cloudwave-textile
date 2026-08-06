import AxeBuilder from "@axe-core/playwright";
import { Uint8ArrayReader, Uint8ArrayWriter, ZipWriter } from "@zip.js/zip.js";
import { expect, test, type Page } from "@playwright/test";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import sharp from "sharp";
import writeExcelFile from "write-excel-file/node";

import {
  PRODUCT_IMPORT_HEADERS,
  PRODUCT_IMPORT_TEMPLATE_NAME,
} from "../../src/imports/contract";

const workbookMime = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem("cwt_analytics_consent", "denied");
  });
});

async function login(page: Page, email = "admin@example.test", password = "local-only-admin-password") {
  await page.context().clearCookies();
  await page.goto("/operations-login/");
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/\/admin\/$/);
}

async function workbook(rows: string[][]): Promise<Buffer> {
  const file = writeExcelFile([
    { sheet: "Products", data: [[...PRODUCT_IMPORT_HEADERS], ...rows] },
    { sheet: "_CWT_META", data: [["contract", PRODUCT_IMPORT_TEMPLATE_NAME], ["version", 1]] },
  ]);
  return file.toBuffer();
}

async function archive(entries: Array<{ name: string; bytes: Uint8Array }>): Promise<Buffer> {
  const writer = new ZipWriter(new Uint8ArrayWriter());
  for (const entry of entries) await writer.add(entry.name, new Uint8ArrayReader(entry.bytes));
  return Buffer.from(await writer.close());
}

function countCard(page: Page, label: string) {
  return page.locator('[role="status"] > div').filter({ has: page.getByText(label, { exact: true }) });
}

test("@desktop Product Import uses the real Upload Saga for partial success, correction, and durable replay safety", async ({ page }) => {
  test.setTimeout(240_000);
  const runtimeErrors: string[] = [];
  page.on("console", (message) => {
    if (["error", "warning"].includes(message.type())) runtimeErrors.push(`${message.type()}: ${message.text()}`);
  });
  page.on("pageerror", (error) => runtimeErrors.push(`pageerror: ${error.message}`));

  await login(page);
  const indexResponse = await page.goto("/admin/product-imports/");
  expect(indexResponse?.status()).toBe(200);
  await expect(page.getByRole("heading", { name: "Product Import", exact: true })).toBeVisible();
  await expect(page.getByText(/Create and Update are separate immutable modes/)).toBeVisible();

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("link", { name: "Download Template V1" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe("CWT-Product-Import-Template-V1.xlsx");

  const valid = Array(PRODUCT_IMPORT_HEADERS.length).fill("");
  valid[0] = "TEST E2E Stage 3 Imported Fabric";
  valid[1] = "CWT-E2EIMP-001";
  valid[2] = "TEST FIXTURE Polyester";
  valid[6] = "92% Polyester / 8% Spandex";
  valid[7] = "180";
  valid[8] = "150";
  valid[9] = "300";
  valid[10] = "kg";
  valid[12] = "test-e2e-stage3-imported-fabric";
  valid[13] = "Synthetic Stage 3 browser import evidence.";
  valid[14] = "Synthetic controlled paragraph for the Stage 3 browser test.";
  valid[16] = "Synthetic imported fabric image";
  const correctable = Array(PRODUCT_IMPORT_HEADERS.length).fill("");
  correctable[0] = "TEST E2E Stage 3 Corrected Fabric";
  correctable[1] = "CWT-E2EIMP-002";
  correctable[2] = "TEST FIXTURE Polyester";
  correctable[13] = "Synthetic row starts without a deterministic image match.";

  const workbookBytes = await workbook([valid, correctable]);
  const primary = new Uint8Array(await sharp({ create: { width: 64, height: 48, channels: 3, background: "teal" } }).webp().toBuffer());
  const detail = new Uint8Array(await sharp({ create: { width: 48, height: 64, channels: 3, background: "navy" } }).avif().toBuffer());
  const correctionImage = new Uint8Array(await sharp({ create: { width: 56, height: 56, channels: 3, background: "orange" } }).webp().toBuffer());
  const archiveBytes = await archive([
    { name: "CWT-E2EIMP-001-01.webp", bytes: primary },
    { name: "CWT-E2EIMP-001-detail-01.avif", bytes: detail },
    { name: "CWT-E2EIMP-003-01.webp", bytes: correctionImage },
  ]);

  await page.locator('input[name="workbook"]').setInputFiles({
    name: "CWT-Product-Import-Template-V1.xlsx",
    mimeType: workbookMime,
    buffer: workbookBytes,
  });
  await page.locator('input[name="archive"]').setInputFiles({
    name: "TEST-E2E-Stage3-Images.zip",
    mimeType: "application/zip",
    buffer: archiveBytes,
  });
  await page.getByRole("button", { name: "Upload and validate" }).click();
  await expect(page).toHaveURL(/\/admin\/product-imports\/[0-9a-f-]+\/$/, { timeout: 120_000 });
  await expect(countCard(page, "valid")).toContainText("1");
  await expect(countCard(page, "error")).toContainText("1");
  await expect(countCard(page, "unmatched images")).toContainText("1");
  await expect(page.getByText("CWT-E2EIMP-001", { exact: true })).toBeVisible();
  await expect(page.getByText("CWT-E2EIMP-002", { exact: true })).toBeVisible();

  const errorExport = page.getByRole("link", { name: "Export Row Errors" });
  const errorResponse = await page.request.get((await errorExport.getAttribute("href"))!);
  expect(errorResponse.status()).toBe(200);
  expect(errorResponse.headers()["content-type"]).toContain(workbookMime);
  expect(errorResponse.headers()["content-disposition"]).toContain("attachment");

  await page.getByRole("button", { name: "Apply valid rows" }).click();
  await expect(countCard(page, "applied")).toContainText("1");
  await expect(countCard(page, "error")).toContainText("1");
  await expect(page.getByText(/Product [0-9a-f]{8}/)).toBeVisible();

  const correction = page.getByText("CWT-E2EIMP-002", { exact: true }).locator("..", { has: page.getByText("error", { exact: true }) });
  await correction.getByText("Correct this Row Error", { exact: true }).click();
  await correction.getByLabel("Product Code", { exact: true }).fill("CWT-E2EIMP-003");
  await correction.getByRole("button", { name: "Validate correction" }).click();
  await expect(page.getByRole("button", { name: "Apply valid rows" })).toBeVisible();
  await page.getByRole("button", { name: "Apply valid rows" }).click();
  await expect(countCard(page, "applied")).toContainText("2");
  await expect(countCard(page, "error")).toContainText("0");
  await expect(countCard(page, "unmatched images")).toContainText("0");

  const detailUrl = page.url();
  await page.reload();
  expect(page.url()).toBe(detailUrl);
  await expect(countCard(page, "applied")).toContainText("2");
  await expect(page.getByRole("button", { name: "Apply valid rows" })).toHaveCount(0);

  for (const width of [320, 375, 390, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: width < 800 ? 900 : 1000 });
    await page.goto(detailUrl);
    expect(await page.evaluate(() => document.documentElement.scrollWidth), `Import detail overflow at ${width}px`)
      .toBeLessThanOrEqual(await page.evaluate(() => window.innerWidth));
    const accessibility = await new AxeBuilder({ page }).analyze();
    expect(accessibility.violations.filter((violation) => ["critical", "serious"].includes(violation.impact ?? "")), `Import Axe at ${width}px`).toEqual([]);
  }
  expect(runtimeErrors).toEqual([]);
});

test("@desktop Product Import authorization remains resource-scoped and stable", async ({ page }) => {
  await login(page, "product-editor@example.test", "local-only-role-password");
  expect((await page.goto("/admin/product-imports/"))?.status()).toBe(200);
  await expect(page.getByRole("heading", { name: "Product Import", exact: true })).toBeVisible();
  await page.goto("/admin/");
  await expect(page.getByRole("link", { name: "Product Imports", exact: true })).toBeVisible();

  for (const email of ["content-editor@example.test", "reviewer@example.test", "sales@example.test", "analyst@example.test"]) {
    await login(page, email, "local-only-role-password");
    expect((await page.goto("/admin/product-imports/"))?.status(), email).toBe(404);
    await page.goto("/admin/");
    await expect(page.getByRole("link", { name: "Product Imports", exact: true })).toHaveCount(0);
  }
  await page.context().clearCookies();
  await page.goto("/admin/product-imports/");
  await expect(page).toHaveURL(/\/operations-login\/?$/);
});

test("@desktop Product Import accepts an actual browser folder selection through the governed image path", async ({ page }) => {
  test.setTimeout(120_000);
  const temporaryRoot = await mkdtemp(join(tmpdir(), "cwt-stage3-folder-e2e-"));
  const productFolder = join(temporaryRoot, "CWT-E2EFOL-001");
  try {
    await mkdir(productFolder);
    const image = await sharp({ create: { width: 48, height: 36, channels: 3, background: "purple" } }).webp().toBuffer();
    await writeFile(join(productFolder, "CWT-E2EFOL-001-01.webp"), image);
    const row = Array(PRODUCT_IMPORT_HEADERS.length).fill("");
    row[0] = "TEST E2E Stage 3 Folder Fabric";
    row[1] = "CWT-E2EFOL-001";
    row[2] = "TEST FIXTURE Polyester";
    const workbookBytes = await workbook([row]);

    await login(page);
    await page.goto("/admin/product-imports/");
    await page.locator('input[name="workbook"]').setInputFiles({
      name: "CWT-Product-Import-Template-V1.xlsx",
      mimeType: workbookMime,
      buffer: workbookBytes,
    });
    await page.locator('input[name="folder"]').setInputFiles(temporaryRoot);
    await page.getByRole("button", { name: "Upload and validate" }).click();
    await expect(page).toHaveURL(/\/admin\/product-imports\/[0-9a-f-]+\/$/, { timeout: 90_000 });
    await expect(countCard(page, "valid")).toContainText("1");
    await expect(countCard(page, "error")).toContainText("0");
    await expect(countCard(page, "unmatched images")).toContainText("0");
    await page.getByRole("button", { name: "Apply valid rows" }).click();
    await expect(countCard(page, "applied")).toContainText("1");
  } finally {
    await rm(temporaryRoot, { recursive: true, force: true });
  }
});

test("@mobile Product Import is usable in the Pixel 7 project without horizontal blocking", async ({ page }) => {
  const errors: string[] = [];
  page.on("console", (message) => {
    if (["error", "warning"].includes(message.type())) errors.push(`${message.type()}: ${message.text()}`);
  });
  page.on("pageerror", (error) => errors.push(error.message));
  await login(page);
  const response = await page.goto("/admin/product-imports/");
  expect(response?.status()).toBe(200);
  await expect(page.getByRole("heading", { name: "Product Import", exact: true })).toBeVisible();
  await expect(page.getByLabel("Template V1 workbook (.xlsx, max 10 MB)")).toBeVisible();
  await expect(page.getByLabel("Optional image ZIP (max 500 MB)")).toBeVisible();
  await expect(page.getByRole("button", { name: "Upload and validate" })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(await page.evaluate(() => window.innerWidth));
  const accessibility = await new AxeBuilder({ page }).analyze();
  expect(accessibility.violations.filter((violation) => ["critical", "serious"].includes(violation.impact ?? ""))).toEqual([]);
  expect(errors).toEqual([]);
});
