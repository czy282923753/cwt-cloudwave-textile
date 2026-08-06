import writeExcelFile from "write-excel-file/node";
import type { Row } from "write-excel-file/node";
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { PRODUCT_IMPORT_HEADERS, PRODUCT_IMPORT_TEMPLATE_NAME } from "./contract";
import { createProductImportTemplateV1 } from "./template";
import { parseProductImportWorkbook } from "./workbook";

async function workbook(header: string[] = [...PRODUCT_IMPORT_HEADERS], row?: Row, options: { version?: number; extraSheet?: boolean } = {}): Promise<Uint8Array> {
  const sheets = [
    { sheet: "Products", data: [header, ...(row ? [row] : [])] },
    { sheet: "_CWT_META", data: [["contract", PRODUCT_IMPORT_TEMPLATE_NAME], ["version", options.version ?? 1]] },
    ...(options.extraSheet ? [{ sheet: "Unexpected", data: [["not", "allowed"]] }] : []),
  ];
  const file = writeExcelFile(sheets);
  return new Uint8Array(await file.toBuffer());
}

describe("Product Import Template V1 workbook", () => {
  it("generates the exact metadata convention and header contract", async () => {
    const parsed = await parseProductImportWorkbook(await createProductImportTemplateV1());
    expect(parsed).toEqual({ templateVersion: 1, rows: [], errors: [] });
  });

  it("rejects unknown, missing, reordered, or case-changed headers", async () => {
    await expect(parseProductImportWorkbook(await workbook([...PRODUCT_IMPORT_HEADERS].reverse()))).rejects.toThrow(/headers.*exactly/i);
    await expect(parseProductImportWorkbook(await workbook(PRODUCT_IMPORT_HEADERS.slice(0, -1)))).rejects.toThrow(/headers.*exactly/i);
    await expect(parseProductImportWorkbook(await workbook(PRODUCT_IMPORT_HEADERS.map((value, index) => index === 0 ? "name" : value)))).rejects.toThrow(/headers.*exactly/i);
  });

  it("fails closed on future metadata versions and non-template sheets", async () => {
    await expect(parseProductImportWorkbook(await workbook([...PRODUCT_IMPORT_HEADERS], undefined, { version: 2 }))).rejects.toThrow(/metadata.*unsupported/i);
    await expect(parseProductImportWorkbook(await workbook([...PRODUCT_IMPORT_HEADERS], undefined, { extraSheet: true }))).rejects.toThrow(/only.*generated Template V1/i);
  });

  it("parses typed facts and preserves blank Update semantics", async () => {
    const row = Array(PRODUCT_IMPORT_HEADERS.length).fill(null);
    row[1] = "cwt-mesh-001";
    row[7] = 180;
    row[9] = 500;
    row[10] = "m";
    const parsed = await parseProductImportWorkbook(await workbook([...PRODUCT_IMPORT_HEADERS], row));
    expect(parsed.rows[0]).toMatchObject({ rowNumber: 2, input: { productCode: "cwt-mesh-001", gsm: "180", moqValue: "500", moqUnit: "m" }, errors: [] });
    expect(parsed.rows[0]?.input).not.toHaveProperty("name");
  });

  it("fails closed on formulas rather than trusting cached values", async () => {
    const row = Array(PRODUCT_IMPORT_HEADERS.length).fill(null);
    row[0] = { value: "=CONCAT(\"Synthetic\",\" Product\")", type: "Formula" };
    const parsed = await parseProductImportWorkbook(await workbook([...PRODUCT_IMPORT_HEADERS], row));
    expect(parsed.rows[0]?.errors).toEqual(expect.arrayContaining([expect.objectContaining({ code: "formula_not_allowed" })]));
  });

  it("rejects the 101st Product row", async () => {
    const rows = Array.from({ length: 101 }, (_, index) => {
      const row = Array(PRODUCT_IMPORT_HEADERS.length).fill(null);
      row[0] = `Synthetic Product ${index}`;
      return row;
    });
    const file = writeExcelFile([
      { sheet: "Products", data: [[...PRODUCT_IMPORT_HEADERS], ...rows] },
      { sheet: "_CWT_META", data: [["contract", PRODUCT_IMPORT_TEMPLATE_NAME], ["version", 1]] },
    ]);
    await expect(parseProductImportWorkbook(new Uint8Array(await file.toBuffer()))).rejects.toThrow(/more than 100/i);
  });
});
