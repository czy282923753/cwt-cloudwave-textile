import { Uint8ArrayReader, Uint8ArrayWriter, ZipReader, ZipWriter } from "@zip.js/zip.js";
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

async function addPackageEntry(bytes: Uint8Array, name: string, data: string): Promise<Uint8Array> {
  const reader = new ZipReader(new Uint8ArrayReader(bytes), { checkSignature: true });
  const writer = new ZipWriter(new Uint8ArrayWriter());
  try {
    for (const entry of await reader.getEntries()) {
      if (entry.directory) continue;
      await writer.add(entry.filename, new Uint8ArrayReader(await entry.getData(new Uint8ArrayWriter(), { checkSignature: true })));
    }
    await writer.add(name, new Uint8ArrayReader(new TextEncoder().encode(data)));
    return writer.close();
  } finally {
    await reader.close();
  }
}

async function rewritePackage(
  bytes: Uint8Array,
  rewrite: (name: string, data: Uint8Array) => { name?: string; data?: Uint8Array | string } | null,
): Promise<Uint8Array> {
  const reader = new ZipReader(new Uint8ArrayReader(bytes), { checkSignature: true });
  const writer = new ZipWriter(new Uint8ArrayWriter());
  try {
    for (const entry of await reader.getEntries()) {
      if (entry.directory) continue;
      const data = await entry.getData(new Uint8ArrayWriter(), { checkSignature: true });
      const changed = rewrite(entry.filename, data);
      if (!changed) continue;
      const nextData = typeof changed.data === "string" ? new TextEncoder().encode(changed.data) : changed.data ?? data;
      await writer.add(changed.name ?? entry.filename, new Uint8ArrayReader(nextData));
    }
    return writer.close();
  } finally {
    await reader.close();
  }
}

function relationshipResolvedProducts(bytes: Uint8Array, mutateWorksheet: (xml: string) => string): Promise<Uint8Array> {
  const decoder = new TextDecoder();
  return rewritePackage(bytes, (name, data) => {
    if (name === "xl/worksheets/sheet1.xml") return { name: "xl/worksheets/products.xml", data: mutateWorksheet(decoder.decode(data)) };
    if (name === "xl/_rels/workbook.xml.rels") return { data: decoder.decode(data).replace("worksheets/sheet1.xml", "worksheets/products.xml") };
    if (name === "[Content_Types].xml") return { data: decoder.decode(data).replace("/xl/worksheets/sheet1.xml", "/xl/worksheets/products.xml") };
    return {};
  });
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
    await expect(parseProductImportWorkbook(await workbook(PRODUCT_IMPORT_HEADERS.map((value, index) => index === 1 ? "Name" : value)))).rejects.toThrow(/headers.*exactly/i);
    await expect(parseProductImportWorkbook(await workbook(PRODUCT_IMPORT_HEADERS.map((value, index) => index === 1 ? "Unknown" : value)))).rejects.toThrow(/headers.*exactly/i);
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

  it("returns typed Row Errors for invalid MOQ pairing and units", async () => {
    const missingUnit = Array(PRODUCT_IMPORT_HEADERS.length).fill(null);
    missingUnit[9] = 500;
    const invalidUnit = Array(PRODUCT_IMPORT_HEADERS.length).fill(null);
    invalidUnit[9] = 500;
    invalidUnit[10] = "piece";
    expect((await parseProductImportWorkbook(await workbook([...PRODUCT_IMPORT_HEADERS], missingUnit))).rows[0]?.errors[0]?.detail).toMatch(/together/i);
    expect((await parseProductImportWorkbook(await workbook([...PRODUCT_IMPORT_HEADERS], invalidUnit))).rows[0]?.errors[0]?.detail).toMatch(/one of m, kg, roll, yd/i);
  });

  it("fails closed on formulas rather than trusting cached values", async () => {
    const row = Array(PRODUCT_IMPORT_HEADERS.length).fill(null);
    row[0] = { value: "=CONCAT(\"Synthetic\",\" Product\")", type: "Formula" };
    const parsed = await parseProductImportWorkbook(await workbook([...PRODUCT_IMPORT_HEADERS], row));
    expect(parsed.rows[0]?.errors).toEqual(expect.arrayContaining([expect.objectContaining({ code: "formula_not_allowed" })]));
  });

  it("follows workbook relationships for non-default Products worksheet parts", async () => {
    const row = Array(PRODUCT_IMPORT_HEADERS.length).fill(null);
    row[0] = { value: "=1+1", type: "Formula" };
    const renamed = await relationshipResolvedProducts(await workbook([...PRODUCT_IMPORT_HEADERS], row), (xml) => xml);
    const parsed = await parseProductImportWorkbook(renamed);
    expect(parsed.rows[0]?.errors).toEqual(expect.arrayContaining([expect.objectContaining({ code: "formula_not_allowed" })]));

    const oversized = await relationshipResolvedProducts(await workbook([...PRODUCT_IMPORT_HEADERS], Array(PRODUCT_IMPORT_HEADERS.length).fill("Synthetic")), (xml) =>
      xml.replace(/(<worksheet\b[^>]*>)/, '$1<dimension ref="A1:S102"/>'),
    );
    await expect(parseProductImportWorkbook(oversized)).rejects.toThrow(/dimensions/i);
  });

  it("checks the relationship-resolved metadata worksheet and fails closed on incomplete relationships", async () => {
    const decoder = new TextDecoder();
    const metadataFormula = await rewritePackage(await workbook(), (name, data) => {
      if (name === "xl/worksheets/sheet2.xml") {
        return { name: "xl/worksheets/meta.xml", data: decoder.decode(data).replace(/(<c\b[^>]*\br="A1"[^>]*>)/, "$1<f>1+1</f>") };
      }
      if (name === "xl/_rels/workbook.xml.rels") return { data: decoder.decode(data).replace("worksheets/sheet2.xml", "worksheets/meta.xml") };
      if (name === "[Content_Types].xml") return { data: decoder.decode(data).replace("/xl/worksheets/sheet2.xml", "/xl/worksheets/meta.xml") };
      return {};
    });
    await expect(parseProductImportWorkbook(metadataFormula)).rejects.toThrow(/formula/i);

    const missingTarget = await rewritePackage(await workbook(), (name, data) => name === "xl/worksheets/sheet1.xml" ? null : { data });
    await expect(parseProductImportWorkbook(missingTarget)).rejects.toThrow(/missing/i);
    const external = await rewritePackage(await workbook(), (name, data) => name === "xl/_rels/workbook.xml.rels"
      ? { data: decoder.decode(data).replace(/(<Relationship\b[^>]*\bTarget="worksheets\/sheet1\.xml")/, '$1 TargetMode="External"') }
      : { data });
    await expect(parseProductImportWorkbook(external)).rejects.toThrow(/external/i);
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

  it("accepts exactly 100 Product rows and rejects actual bytes beyond 10 MB", async () => {
    const rows = Array.from({ length: 100 }, (_, index) => {
      const row = Array(PRODUCT_IMPORT_HEADERS.length).fill(null);
      row[0] = `Synthetic Product ${index}`;
      return row;
    });
    const file = writeExcelFile([
      { sheet: "Products", data: [[...PRODUCT_IMPORT_HEADERS], ...rows] },
      { sheet: "_CWT_META", data: [["contract", PRODUCT_IMPORT_TEMPLATE_NAME], ["version", 1]] },
    ]);
    expect((await parseProductImportWorkbook(new Uint8Array(await file.toBuffer()))).rows).toHaveLength(100);
    await expect(parseProductImportWorkbook(new Uint8Array(10 * 1024 * 1024 + 1))).rejects.toThrow(/actual bytes/i);
  });

  it("rejects malformed or truncated containers, macro payloads, and extreme dimensions", async () => {
    const valid = await workbook();
    await expect(parseProductImportWorkbook(valid.slice(0, 80))).rejects.toThrow();
    await expect(parseProductImportWorkbook(await addPackageEntry(valid, "xl/vbaProject.bin", "synthetic macro"))).rejects.toThrow(/macros/i);
    await expect(parseProductImportWorkbook(await addPackageEntry(valid, "xl/worksheets/sheet99.xml", '<worksheet><dimension ref="A1:S102"/></worksheet>'))).rejects.toThrow(/dimensions/i);
  });
});
