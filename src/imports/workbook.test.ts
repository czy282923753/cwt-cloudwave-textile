import { Uint8ArrayReader, Uint8ArrayWriter, ZipReader, ZipWriter, type ZipWriterAddDataOptions } from "@zip.js/zip.js";
import writeExcelFile from "write-excel-file/node";
import type { Row } from "write-excel-file/node";
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { PRODUCT_IMPORT_HEADERS, PRODUCT_IMPORT_LIMITS, PRODUCT_IMPORT_TEMPLATE_NAME } from "./contract";
import { createProductImportTemplateV1 } from "./template";
import { parseProductImportWorkbook, ProductImportWorkbookPackageError } from "./workbook";

const transitionalWorksheetRelationshipType =
  "http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet";
const officeRelationshipsNamespace =
  "http://schemas.openxmlformats.org/officeDocument/2006/relationships";
const strictWorksheetRelationshipType =
  "http://purl.oclc.org/ooxml/officeDocument/relationships/worksheet";
const contentTypesNamespace = "http://schemas.openxmlformats.org/package/2006/content-types";
const packageRelationshipsNamespace = "http://schemas.openxmlformats.org/package/2006/relationships";
const spreadsheetNamespace = "http://schemas.openxmlformats.org/spreadsheetml/2006/main";
const strictSpreadsheetNamespace = "http://purl.oclc.org/ooxml/spreadsheetml/main";

async function workbook(header: string[] = [...PRODUCT_IMPORT_HEADERS], row?: Row, options: { version?: number; extraSheet?: boolean } = {}): Promise<Uint8Array> {
  const sheets = [
    { sheet: "Products", data: [header, ...(row ? [row] : [])] },
    { sheet: "_CWT_META", data: [["contract", PRODUCT_IMPORT_TEMPLATE_NAME], ["version", options.version ?? 1]] },
    ...(options.extraSheet ? [{ sheet: "Unexpected", data: [["not", "allowed"]] }] : []),
  ];
  const file = writeExcelFile(sheets);
  return new Uint8Array(await file.toBuffer());
}

async function addPackageEntries(
  bytes: Uint8Array,
  additions: Array<{ name: string; data: string | Uint8Array; options?: ZipWriterAddDataOptions }>,
): Promise<Uint8Array> {
  const reader = new ZipReader(new Uint8ArrayReader(bytes), { checkSignature: true });
  const writer = new ZipWriter(new Uint8ArrayWriter());
  try {
    for (const entry of await reader.getEntries()) {
      if (entry.directory) continue;
      await writer.add(entry.filename, new Uint8ArrayReader(await entry.getData(new Uint8ArrayWriter(), { checkSignature: true })));
    }
    for (const addition of additions) {
      const data = typeof addition.data === "string" ? new TextEncoder().encode(addition.data) : addition.data;
      await writer.add(addition.name, new Uint8ArrayReader(data), addition.options);
    }
    return writer.close();
  } finally {
    await reader.close();
  }
}

function addPackageEntry(bytes: Uint8Array, name: string, data: string, options?: ZipWriterAddDataOptions): Promise<Uint8Array> {
  return addPackageEntries(bytes, [{ name, data, ...(options ? { options } : {}) }]);
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

function worksheetOverride(xml: string, partName: string): string {
  const escaped = partName.replaceAll(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = xml.match(new RegExp(`<Override\\b(?=[^>]*\\bPartName=["']${escaped}["'])[^>]*\\/>`));
  if (!match) throw new Error(`Synthetic fixture could not find ${partName}.`);
  return match[0];
}

function rewriteXmlPart(bytes: Uint8Array, part: string, mutate: (xml: string) => string): Promise<Uint8Array> {
  const decoder = new TextDecoder();
  return rewritePackage(bytes, (name, data) => name === part ? { data: mutate(decoder.decode(data)) } : { data });
}

function prefixRoot(xml: string, root: string, namespace: string, prefix: string): string {
  return xml
    .replace(`<${root} xmlns="${namespace}"`, `<${prefix}:${root} xmlns:${prefix}="${namespace}" xmlns="${namespace}"`)
    .replace(`</${root}>`, `</${prefix}:${root}>`);
}

function appendBeforeRootClose(xml: string, root: string, addition: string): string {
  return xml.replace(`</${root}>`, `${addition}</${root}>`);
}

function elementsWithAttributes(total: number, valueBytes = 0): string {
  let remaining = total;
  const elements: string[] = [];
  while (remaining) {
    const count = Math.min(remaining, PRODUCT_IMPORT_LIMITS.workbookXmlAttributesPerElement);
    const attributes = Array.from({ length: count }, (_, index) =>
      ` a${index}="${"x".repeat(valueBytes)}"`,
    ).join("");
    elements.push(`<synthetic${attributes}/>`);
    remaining -= count;
  }
  return elements.join("");
}

async function expectInvalidPackage(bytes: Uint8Array, message: RegExp): Promise<void> {
  try {
    await parseProductImportWorkbook(bytes);
    throw new Error("Expected workbook package rejection.");
  } catch (error) {
    expect(error).toBeInstanceOf(ProductImportWorkbookPackageError);
    expect(error).toMatchObject({ code: "invalid_workbook_package" });
    expect((error as Error).message).toMatch(message);
  }
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

  it("preserves shared and inline strings, XML escapes, Unicode, and safe boolean row errors", async () => {
    const row = Array(PRODUCT_IMPORT_HEADERS.length).fill(null);
    row[0] = "Café & 织物";
    row[7] = 180;
    const canonical = await workbook([...PRODUCT_IMPORT_HEADERS], row);
    expect((await parseProductImportWorkbook(canonical)).rows[0]?.input).toMatchObject({
      name: "Café & 织物",
      gsm: "180",
    });

    const inline = await rewriteXmlPart(canonical, "xl/worksheets/sheet1.xml", (source) =>
      source.replace(/<c\b[^>]*\br="A2"[^>]*><v>\d+<\/v><\/c>/, '<c r="A2" t="inlineStr"><is><t>  Café &amp; 织物  </t></is></c>'),
    );
    expect((await parseProductImportWorkbook(inline)).rows[0]?.input.name).toBe("Café & 织物");

    const boolean = await rewriteXmlPart(canonical, "xl/worksheets/sheet1.xml", (source) =>
      source.replace(/<c\b[^>]*\br="A2"[^>]*><v>\d+<\/v><\/c>/, '<c r="A2" t="b"><v>1</v></c>'),
    );
    expect((await parseProductImportWorkbook(boolean)).rows[0]?.errors).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: "invalid_cell", detail: expect.stringMatching(/requires text or a number/i) }),
    ]));
  });

  it("fails closed on date, error, and unsupported styled numeric cells", async () => {
    const row = Array(PRODUCT_IMPORT_HEADERS.length).fill(null);
    row[0] = "Synthetic";
    row[7] = 180;
    const base = await workbook([...PRODUCT_IMPORT_HEADERS], row);
    const cases = [
      {
        message: /date or error cell type is unsupported/i,
        mutate: (source: string) => source.replace(/<c\b[^>]*\br="A2"[^>]*><v>\d+<\/v><\/c>/, '<c r="A2" t="d"><v>2026-08-07</v></c>'),
      },
      {
        message: /date or error cell type is unsupported/i,
        mutate: (source: string) => source.replace(/<c\b[^>]*\br="A2"[^>]*><v>\d+<\/v><\/c>/, '<c r="A2" t="e"><v>15</v></c>'),
      },
      {
        message: /cell style is invalid or unsupported/i,
        mutate: (source: string) => source.replace('<c r="H2">', '<c r="H2" s="999">'),
      },
    ];
    for (const item of cases) {
      await expectInvalidPackage(await rewriteXmlPart(base, "xl/worksheets/sheet1.xml", item.mutate), item.message);
    }
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

  it("proves the exact namespace URI on every governed package root", async () => {
    const base = await workbook();
    const governedRoots = [
      { part: "[Content_Types].xml", namespace: contentTypesNamespace },
      { part: "xl/_rels/workbook.xml.rels", namespace: packageRelationshipsNamespace },
      { part: "xl/workbook.xml", namespace: spreadsheetNamespace },
      { part: "xl/worksheets/sheet1.xml", namespace: spreadsheetNamespace },
      { part: "xl/worksheets/sheet2.xml", namespace: spreadsheetNamespace },
    ];
    for (const governed of governedRoots) {
      const wrong = await rewriteXmlPart(base, governed.part, (xml) =>
        xml.replace(`xmlns="${governed.namespace}"`, 'xmlns="https://synthetic.invalid/ooxml"'),
      );
      await expect(parseProductImportWorkbook(wrong)).rejects.toThrow(/package XML topology or namespace is invalid/i);
      const missing = await rewriteXmlPart(base, governed.part, (xml) =>
        xml.replace(` xmlns="${governed.namespace}"`, ""),
      );
      await expect(parseProductImportWorkbook(missing)).rejects.toThrow(/package XML topology or namespace is invalid/i);
    }
    const strictWorkbook = await rewriteXmlPart(base, "xl/workbook.xml", (xml) => xml.replace(spreadsheetNamespace, strictSpreadsheetNamespace));
    await expect(parseProductImportWorkbook(strictWorkbook)).rejects.toThrow(/package XML topology or namespace is invalid/i);
    await expect(parseProductImportWorkbook(strictWorkbook)).rejects.toMatchObject({
      name: "ProductImportWorkbookPackageError",
      code: "invalid_workbook_package",
    } satisfies Partial<ProductImportWorkbookPackageError>);
  });

  it("accepts equivalent default and custom-prefix forms for governed root namespaces", async () => {
    let prefixed = await workbook();
    const governedRoots = [
      { part: "[Content_Types].xml", root: "Types", namespace: contentTypesNamespace, prefix: "ct" },
      { part: "xl/_rels/workbook.xml.rels", root: "Relationships", namespace: packageRelationshipsNamespace, prefix: "pr" },
      { part: "xl/workbook.xml", root: "workbook", namespace: spreadsheetNamespace, prefix: "ss" },
      { part: "xl/worksheets/sheet1.xml", root: "worksheet", namespace: spreadsheetNamespace, prefix: "p1" },
      { part: "xl/worksheets/sheet2.xml", root: "worksheet", namespace: spreadsheetNamespace, prefix: "p2" },
    ];
    for (const governed of governedRoots) {
      prefixed = await rewriteXmlPart(prefixed, governed.part, (xml) =>
        prefixRoot(xml, governed.root, governed.namespace, governed.prefix),
      );
    }
    prefixed = await rewriteXmlPart(prefixed, "[Content_Types].xml", (xml) =>
      xml.replaceAll(/<(Default|Override)\b/g, "<ct:$1"),
    );
    prefixed = await rewriteXmlPart(prefixed, "xl/_rels/workbook.xml.rels", (xml) =>
      xml.replaceAll(/<Relationship\b/g, "<pr:Relationship"),
    );
    prefixed = await rewriteXmlPart(prefixed, "xl/workbook.xml", (xml) =>
      xml.replaceAll(/<sheet\b/g, "<ss:sheet"),
    );
    expect((await parseProductImportWorkbook(prefixed)).templateVersion).toBe(1);
  });

  it("parses an equivalent custom Office relationship attribute prefix identically", async () => {
    const canonical = await workbook();
    const prefixed = await rewriteXmlPart(canonical, "xl/workbook.xml", (xml) =>
      xml
        .replace(
          `xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"`,
          `xmlns:office="http://schemas.openxmlformats.org/officeDocument/2006/relationships"`,
        )
        .replaceAll("r:id=", "office:id="),
    );

    await expect(parseProductImportWorkbook(prefixed)).resolves.toEqual(await parseProductImportWorkbook(canonical));
  });

  it("keeps nested prefix rebinding and multiple prefixes for one URI semantically equivalent", async () => {
    const canonical = await workbook();
    const prefixed = await rewriteXmlPart(canonical, "xl/workbook.xml", (source) => {
      let sheetIndex = 0;
      return source
        .replace(
          `xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"`,
          `xmlns:office="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:alternate="http://schemas.openxmlformats.org/officeDocument/2006/relationships"`,
        )
        .replace("<sheets>", `<outer:sheets xmlns:outer="${spreadsheetNamespace}">`)
        .replace("</sheets>", "</outer:sheets>")
        .replaceAll(/<sheet\b/g, () => {
          sheetIndex += 1;
          return sheetIndex === 1
            ? `<one:sheet xmlns:one="${spreadsheetNamespace}"`
            : `<two:sheet xmlns:two="${spreadsheetNamespace}"`;
        })
        .replace('r:id="rId1"', 'office:id="rId1"')
        .replace('r:id="rId2"', 'alternate:id="rId2"');
    });

    await expect(parseProductImportWorkbook(prefixed)).resolves.toEqual(await parseProductImportWorkbook(canonical));
  });

  it("rejects unbound and reserved namespace prefix misuse as typed package errors", async () => {
    const base = await workbook();
    const unbound = await rewriteXmlPart(base, "xl/workbook.xml", (source) => source.replace("r:id=", "missing:id="));
    await expectInvalidPackage(unbound, /topology or namespace is invalid/i);
    const reserved = await rewriteXmlPart(base, "xl/workbook.xml", (source) =>
      source.replace(`xmlns:r="${officeRelationshipsNamespace}"`, `xmlns:xml="${officeRelationshipsNamespace}"`),
    );
    await expectInvalidPackage(reserved, /topology or namespace is invalid/i);
  });

  it("rejects namespace lookalikes on governed relationship and content-type elements", async () => {
    const base = await workbook();
    const wrongRelationship = await rewriteXmlPart(base, "xl/_rels/workbook.xml.rels", (xml) =>
      xml.replace("<Relationship ", '<Relationship xmlns="https://synthetic.invalid/relationships" '),
    );
    await expect(parseProductImportWorkbook(wrongRelationship)).rejects.toThrow(/relationships are malformed/i);

    const missingContentTypeNamespace = await rewriteXmlPart(base, "[Content_Types].xml", (xml) =>
      xml.replace("<Default ", '<Default xmlns="" '),
    );
    await expect(parseProductImportWorkbook(missingContentTypeNamespace)).rejects.toThrow(/content type declarations are malformed/i);

    const missingSheetNamespace = await rewriteXmlPart(base, "xl/workbook.xml", (xml) =>
      xml.replace("<sheet ", '<sheet xmlns="" '),
    );
    await expect(parseProductImportWorkbook(missingSheetNamespace)).rejects.toThrow(/sheet topology is malformed/i);

    const wrongCellNamespace = await rewriteXmlPart(base, "xl/worksheets/sheet1.xml", (xml) =>
      xml.replace("<c ", '<c xmlns="https://synthetic.invalid/cell" '),
    );
    await expect(parseProductImportWorkbook(wrongCellNamespace)).rejects.toThrow(/worksheet evidence namespace is invalid/i);
  });

  it("attributes a custom-prefixed SpreadsheetML formula by namespace rather than prefix", async () => {
    const row = Array(PRODUCT_IMPORT_HEADERS.length).fill(null);
    row[0] = { value: "=1+1", type: "Formula" };
    const prefixedFormula = await rewriteXmlPart(await workbook([...PRODUCT_IMPORT_HEADERS], row), "xl/worksheets/sheet1.xml", (xml) =>
      xml
        .replace(`xmlns="${spreadsheetNamespace}"`, `xmlns="${spreadsheetNamespace}" xmlns:formula="${spreadsheetNamespace}"`)
        .replace("<f>", "<formula:f>")
        .replace("</f>", "</formula:f>"),
    );
    const parsed = await parseProductImportWorkbook(prefixedFormula);
    expect(parsed.rows[0]?.errors).toEqual(expect.arrayContaining([expect.objectContaining({ code: "formula_not_allowed" })]));
  });

  it("fails closed when governed workbook evidence cannot be attributed to the narrow Template V1 topology", async () => {
    const row = Array(PRODUCT_IMPORT_HEADERS.length).fill(null);
    row[0] = "Synthetic";
    const base = await workbook([...PRODUCT_IMPORT_HEADERS], row);
    const cases = [
      {
        part: "xl/workbook.xml",
        message: /sheet topology is malformed/i,
        mutate: (source: string) => source.replace("</workbook>", "<sheets/></workbook>"),
      },
      {
        part: "xl/worksheets/sheet1.xml",
        message: /worksheet topology is invalid/i,
        mutate: (source: string) => source.replace("</worksheet>", "<sheetData/></worksheet>"),
      },
      {
        part: "xl/worksheets/sheet1.xml",
        message: /formula evidence could not be attributed safely/i,
        mutate: (source: string) => source.replace("</worksheet>", "<f/></worksheet>"),
      },
      {
        part: "xl/sharedStrings.xml",
        message: /shared strings are malformed/i,
        mutate: (source: string) => source.replace("</sst>", "<synthetic><si><t>hidden</t></si></synthetic></sst>"),
      },
      {
        part: "xl/styles.xml",
        message: /styles are malformed/i,
        mutate: (source: string) => source.replace("</styleSheet>", "<cellXfs><xf numFmtId=\"0\"/></cellXfs></styleSheet>"),
      },
    ];

    for (const item of cases) {
      await expectInvalidPackage(await rewriteXmlPart(base, item.part, item.mutate), item.message);
    }
  });

  it("rejects DTD, entity declarations, external entities, and unsupported processing instructions", async () => {
    const base = await workbook();
    const declarations = [
      '<!DOCTYPE workbook>',
      '<!DOCTYPE workbook [<!ENTITY synthetic "value">]>',
      '<!DOCTYPE workbook [<!ENTITY synthetic SYSTEM "file:///synthetic-never-resolved">]>',
      '<?synthetic unsupported?>',
    ];
    for (const declaration of declarations) {
      const unsafe = await rewriteXmlPart(base, "xl/workbook.xml", (source) =>
        source.replace(/(<\?xml[^?]*\?>)/, `$1${declaration}`),
      );
      await expectInvalidPackage(unsafe, /unsupported (?:DTD|processing instruction)/i);
    }
  });

  it("rejects every XML resource family above its frozen limit as a typed package error", async () => {
    const base = await workbook();
    const mutations: Array<{ name: string; part?: string; message: RegExp; mutate: (source: string) => string }> = [
      {
        name: "depth",
        message: /depth exceeds/i,
        mutate: (source) => appendBeforeRootClose(
          source,
          "workbook",
          `${"<synthetic>".repeat(PRODUCT_IMPORT_LIMITS.workbookXmlDepth)}${"</synthetic>".repeat(PRODUCT_IMPORT_LIMITS.workbookXmlDepth)}`,
        ),
      },
      {
        name: "total nodes",
        message: /element count exceeds/i,
        mutate: (source) => appendBeforeRootClose(source, "workbook", "<synthetic/>".repeat(PRODUCT_IMPORT_LIMITS.workbookXmlNodes)),
      },
      {
        name: "attributes per element",
        message: /attributes per element exceed/i,
        mutate: (source) => appendBeforeRootClose(
          source,
          "workbook",
          `<synthetic${Array.from(
            { length: PRODUCT_IMPORT_LIMITS.workbookXmlAttributesPerElement + 1 },
            (_, index) => ` a${index}=""`,
          ).join("")}/>` ,
        ),
      },
      {
        name: "total attributes",
        message: /attribute count exceeds/i,
        mutate: (source) => appendBeforeRootClose(source, "workbook", elementsWithAttributes(PRODUCT_IMPORT_LIMITS.workbookXmlAttributes)),
      },
      {
        name: "attribute value",
        message: /attribute value exceeds/i,
        mutate: (source) => appendBeforeRootClose(
          source,
          "workbook",
          `<synthetic value="${"x".repeat(PRODUCT_IMPORT_LIMITS.workbookXmlAttributeValueBytes + 1)}"/>`,
        ),
      },
      {
        name: "logical text run",
        message: /logical text run exceeds/i,
        mutate: (source) => appendBeforeRootClose(
          source,
          "workbook",
          `<synthetic>${"x".repeat(PRODUCT_IMPORT_LIMITS.workbookXmlTextSegmentBytes + 1)}</synthetic>`,
        ),
      },
      {
        name: "total decoded text",
        part: "xl/sharedStrings.xml",
        message: /decoded text exceeds/i,
        mutate: (source) => appendBeforeRootClose(
          source,
          "sst",
          Array.from(
            { length: PRODUCT_IMPORT_LIMITS.workbookXmlTextBytes / PRODUCT_IMPORT_LIMITS.workbookXmlTextSegmentBytes },
            () => `<si><t>${"x".repeat(PRODUCT_IMPORT_LIMITS.workbookXmlTextSegmentBytes)}</t></si>`,
          ).join(""),
        ),
      },
      {
        name: "actual XML source",
        message: /source bytes exceed/i,
        mutate: (source) => appendBeforeRootClose(
          source,
          "workbook",
          elementsWithAttributes(
            PRODUCT_IMPORT_LIMITS.workbookXmlAttributesPerElement * 128,
            PRODUCT_IMPORT_LIMITS.workbookXmlAttributeValueBytes,
          ),
        ),
      },
    ];

    for (const mutation of mutations) {
      const oversized = await rewriteXmlPart(base, mutation.part ?? "xl/workbook.xml", mutation.mutate);
      try {
        await expectInvalidPackage(oversized, mutation.message);
      } catch (error) {
        throw new Error(`${mutation.name}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  }, 30_000);

  it("accepts only the explicitly supported transitional worksheet relationship type", async () => {
    const decoder = new TextDecoder();
    const unsupportedSuffix = await rewritePackage(await workbook(), (name, data) => name === "xl/_rels/workbook.xml.rels"
      ? { data: decoder.decode(data).replace(transitionalWorksheetRelationshipType, "https://synthetic.invalid/relationships/worksheet") }
      : { data });
    await expect(parseProductImportWorkbook(unsupportedSuffix)).rejects.toThrow(/relationship type is unsupported/i);

    const unsupportedStrict = await rewritePackage(await workbook(), (name, data) => name === "xl/_rels/workbook.xml.rels"
      ? { data: decoder.decode(data).replaceAll(transitionalWorksheetRelationshipType, strictWorksheetRelationshipType) }
      : { data });
    await expect(parseProductImportWorkbook(unsupportedStrict)).rejects.toThrow(/relationship type is unsupported/i);
    expect((await parseProductImportWorkbook(await workbook())).templateVersion).toBe(1);
  });

  it("requires one exact worksheet content type declaration for every governed sheet", async () => {
    const decoder = new TextDecoder();
    const base = await workbook();
    const missing = await rewritePackage(base, (name, data) => {
      if (name !== "[Content_Types].xml") return { data };
      const xml = decoder.decode(data);
      return { data: xml.replace(worksheetOverride(xml, "/xl/worksheets/sheet1.xml"), "") };
    });
    await expect(parseProductImportWorkbook(missing)).rejects.toThrow(/content type is missing or invalid/i);

    const wrong = await rewritePackage(base, (name, data) => {
      if (name !== "[Content_Types].xml") return { data };
      const xml = decoder.decode(data);
      const override = worksheetOverride(xml, "/xl/worksheets/sheet2.xml");
      return { data: xml.replace(override, override.replace(
        "application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml",
        "application/vnd.synthetic.invalid+xml",
      )) };
    });
    await expect(parseProductImportWorkbook(wrong)).rejects.toThrow(/content type is missing or invalid/i);

    const duplicate = await rewritePackage(base, (name, data) => {
      if (name !== "[Content_Types].xml") return { data };
      const xml = decoder.decode(data);
      const override = worksheetOverride(xml, "/xl/worksheets/sheet1.xml");
      return { data: xml.replace("</Types>", `${override}</Types>`) };
    });
    await expect(parseProductImportWorkbook(duplicate)).rejects.toThrow(/content type declaration is duplicated/i);

    const noAuthority = await rewritePackage(base, (name, data) => name === "[Content_Types].xml" ? null : { data });
    await expect(parseProductImportWorkbook(noAuthority)).rejects.toThrow(/package topology is incomplete/i);
  });

  it("proves the complete normalized Default content-type declaration set", async () => {
    const base = await workbook();
    const decoder = new TextDecoder();
    const contentTypes = async (mutate: (xml: string) => string) => rewritePackage(base, (name, data) =>
      name === "[Content_Types].xml" ? { data: mutate(decoder.decode(data)) } : { data },
    );
    const defaultXml = '<Default ContentType="application/xml" Extension="xml"/>';

    for (const duplicate of [defaultXml, defaultXml.replace('Extension="xml"', 'Extension="XML"'), defaultXml.replace('Extension="xml"', 'Extension="x&#109;l"')]) {
      await expect(parseProductImportWorkbook(await contentTypes((xml) => xml.replace("</Types>", `${duplicate}</Types>`))))
        .rejects.toThrow(/default content type declaration is duplicated or ambiguous/i);
    }
    for (const replacement of [
      defaultXml.replace('Extension="xml"', 'Extension=""'),
      defaultXml.replace('Extension="xml"', 'Extension="x/ml"'),
      defaultXml.replace('ContentType="application/xml"', 'ContentType=""'),
      defaultXml.replace("application/xml", "application/vnd.synthetic.invalid+xml"),
    ]) {
      await expect(parseProductImportWorkbook(await contentTypes((xml) => xml.replace(defaultXml, replacement))))
        .rejects.toThrow(/(?:content type declaration is invalid|default content type declaration is (?:invalid|unsupported))/i);
    }
    await expect(parseProductImportWorkbook(await contentTypes((xml) => xml.replace(defaultXml, ""))))
      .rejects.toThrow(/default content type declarations are incomplete/i);
    await expect(parseProductImportWorkbook(await contentTypes((xml) => xml.replace("</Types>", '<Default ContentType="application/octet-stream" Extension="bin"/></Types>'))))
      .rejects.toThrow(/default content type declaration is unsupported/i);
  });

  it("rejects conflicting, incomplete, and unconsumed Default or Override topology", async () => {
    const base = await workbook();
    const conflictingDefault = await rewriteXmlPart(base, "[Content_Types].xml", (xml) =>
      xml.replace('Default ContentType="application/xml" Extension="xml"', `Default ContentType="${worksheetOverride(xml, "/xl/worksheets/sheet1.xml").match(/ContentType="([^"]+)"/)?.[1]}" Extension="xml"`),
    );
    await expect(parseProductImportWorkbook(conflictingDefault)).rejects.toThrow(/default content type declaration is unsupported or invalid/i);

    const missingFixedOverride = await rewriteXmlPart(base, "[Content_Types].xml", (xml) =>
      xml.replace(/<Override\b(?=[^>]*\bPartName=["']\/xl\/styles\.xml["'])[^>]*\/>/, ""),
    );
    await expect(parseProductImportWorkbook(missingFixedOverride)).rejects.toThrow(/fixed content type declaration is missing or invalid/i);

    const unconsumedOverride = await rewriteXmlPart(base, "[Content_Types].xml", (xml) =>
      xml.replace("</Types>", '<Override PartName="/xl/synthetic.xml" ContentType="application/xml"/></Types>'),
    );
    await expect(parseProductImportWorkbook(unconsumedOverride)).rejects.toThrow(/content type declaration is unreferenced or unsupported/i);

    const encodedDuplicateOverride = await rewriteXmlPart(base, "[Content_Types].xml", (xml) => {
      const duplicate = worksheetOverride(xml, "/xl/worksheets/sheet1.xml").replace("sheet1.xml", "sheet&#49;.xml");
      return xml.replace("</Types>", `${duplicate}</Types>`);
    });
    await expect(parseProductImportWorkbook(encodedDuplicateOverride)).rejects.toThrow(/content type declaration is duplicated/i);

    const malformedDeclaration = await rewriteXmlPart(base, "[Content_Types].xml", (xml) =>
      xml.replace('<Default ContentType="application/xml" Extension="xml"/>', '<Default ContentType="application/xml"><Unexpected/></Default>'),
    );
    await expect(parseProductImportWorkbook(malformedDeclaration)).rejects.toThrow(/content type declarations are malformed or unsupported/i);
  });

  it("rejects duplicate and unreferenced worksheet relationship topology", async () => {
    const decoder = new TextDecoder();
    const base = await workbook();
    const duplicateId = await rewritePackage(base, (name, data) => name === "xl/_rels/workbook.xml.rels"
      ? { data: decoder.decode(data).replace('Id="rId2"', 'Id="rId1"') }
      : { data });
    await expect(parseProductImportWorkbook(duplicateId)).rejects.toThrow(/relationship ID is duplicated/i);

    const duplicateTarget = await rewritePackage(base, (name, data) => name === "xl/_rels/workbook.xml.rels"
      ? { data: decoder.decode(data).replace('Target="worksheets/sheet2.xml"', 'Target="worksheets/sheet1.xml"') }
      : { data });
    await expect(parseProductImportWorkbook(duplicateTarget)).rejects.toThrow(/relationship target is duplicated/i);

    const withOrphanPart = await addPackageEntry(base, "xl/worksheets/orphan.xml", '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"/>');
    const orphanRelationship = await rewritePackage(withOrphanPart, (name, data) => {
      const xml = decoder.decode(data);
      if (name === "xl/_rels/workbook.xml.rels") {
        return { data: xml.replace("</Relationships>", `<Relationship Id="rId999" Type="${transitionalWorksheetRelationshipType}" Target="worksheets/orphan.xml"/></Relationships>`) };
      }
      if (name === "[Content_Types].xml") {
        return { data: xml.replace("</Types>", '<Override PartName="/xl/worksheets/orphan.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>') };
      }
      return { data };
    });
    await expect(parseProductImportWorkbook(orphanRelationship)).rejects.toThrow(/unreferenced worksheet relationship/i);

    const missingRelationship = await rewritePackage(base, (name, data) => {
      if (name !== "xl/_rels/workbook.xml.rels") return { data };
      const xml = decoder.decode(data);
      return { data: xml.replace(/<Relationship\b(?=[^>]*\bId=["']rId1["'])[^>]*\/>/, "") };
    });
    await expect(parseProductImportWorkbook(missingRelationship)).rejects.toThrow(/relationship is missing or invalid/i);
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
    await expect(parseProductImportWorkbook(new Uint8Array(10 * 1024 * 1024 + 1))).rejects.toMatchObject({
      name: "ProductImportWorkbookPackageError",
      code: "invalid_workbook_package",
      message: expect.stringMatching(/actual bytes/i),
    } satisfies Partial<ProductImportWorkbookPackageError>);
  });

  it("rejects malformed or truncated containers, macro payloads, and extreme dimensions", async () => {
    const valid = await workbook();
    await expect(parseProductImportWorkbook(new TextEncoder().encode("not an xlsx"))).rejects.toMatchObject({
      name: "ProductImportWorkbookPackageError",
      code: "invalid_workbook_package",
      message: "Only an XLSX ZIP container is accepted.",
    } satisfies Partial<ProductImportWorkbookPackageError>);
    await expect(parseProductImportWorkbook(valid.slice(0, 80))).rejects.toMatchObject({
      name: "ProductImportWorkbookPackageError",
      code: "invalid_workbook_package",
      message: "Workbook package could not be validated safely.",
    } satisfies Partial<ProductImportWorkbookPackageError>);
    await expect(parseProductImportWorkbook(await addPackageEntry(valid, "xl/vbaProject.bin", "synthetic macro"))).rejects.toThrow(/macros/i);
    await expect(parseProductImportWorkbook(await addPackageEntry(valid, "xl/worksheets/sheet99.xml", '<worksheet><dimension ref="A1:S102"/></worksheet>'))).rejects.toThrow(/unreferenced worksheet part/i);
  });

  it("retains encrypted, duplicate-part, entry-count, and expanded-size package limits", async () => {
    const valid = await workbook();
    await expect(parseProductImportWorkbook(await addPackageEntry(valid, "synthetic-encrypted.bin", "synthetic", { password: "synthetic" })))
      .rejects.toThrow(/encrypted/i);
    const normalizedDuplicate = await addPackageEntries(valid, [
      { name: "synthetic/caf\u00e9.xml", data: "<synthetic/>" },
      { name: "synthetic/cafe\u0301.xml", data: "<synthetic/>" },
    ]);
    await expect(parseProductImportWorkbook(normalizedDuplicate))
      .rejects.toThrow(/duplicate part/i);

    const reader = new ZipReader(new Uint8ArrayReader(valid));
    const existingEntryCount = (await reader.getEntries()).length;
    await reader.close();
    const additions = Array.from({ length: PRODUCT_IMPORT_LIMITS.workbookEntries - existingEntryCount + 1 }, (_, index) => ({
      name: `synthetic/entry-${index}.bin`,
      data: "x",
    }));
    await expect(parseProductImportWorkbook(await addPackageEntries(valid, additions))).rejects.toThrow(/too many package entries/i);

    const expanded = new Uint8Array(PRODUCT_IMPORT_LIMITS.workbookExpandedBytes + 1);
    await expect(parseProductImportWorkbook(await addPackageEntries(valid, [{ name: "synthetic/expanded.bin", data: expanded }])))
      .rejects.toThrow(/expanded size exceeds/i);
  });
});
