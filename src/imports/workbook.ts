import readExcelFile from "read-excel-file/node";
import { Uint8ArrayReader, Uint8ArrayWriter, ZipReader } from "@zip.js/zip.js";

import {
  PRODUCT_IMPORT_HEADERS,
  PRODUCT_IMPORT_LIMITS,
  PRODUCT_IMPORT_TEMPLATE_NAME,
  type ParsedProductImportWorkbook,
  type ProductImportHeader,
  type ProductImportParseError,
  type ProductImportRowInput,
} from "./contract";

const textDecoder = new TextDecoder("utf-8", { fatal: true });
const transitionalWorksheetRelationshipType =
  "http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet";
const worksheetContentType =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml";

function columnNumber(letters: string): number {
  return [...letters].reduce((value, letter) => value * 26 + letter.charCodeAt(0) - 64, 0);
}

function cellText(value: unknown, header: ProductImportHeader): string | undefined {
  if (value === null || value === undefined || value === "") return undefined;
  if (value instanceof Date || typeof value === "boolean") {
    throw new Error(`${header} requires text or a number.`);
  }
  const text = String(value).trim();
  const limit = header === "Description" || header === "Image Files" ? 20_000
    : header === "Summary" || header === "MOQ Note" || header === "Primary Image Caption" ? 1_000
      : 2_000;
  if (new TextEncoder().encode(text).byteLength > limit) {
    throw new Error(`${header} exceeds the Template V1 cell limit.`);
  }
  return text || undefined;
}

function list(value: unknown, header: ProductImportHeader): string[] | undefined {
  const text = cellText(value, header);
  if (!text) return undefined;
  const values = text.split(";").map((item) => item.trim()).filter(Boolean);
  const limit = header === "Image Files" ? PRODUCT_IMPORT_LIMITS.images
    : header === "Tags" ? 50
      : 24;
  if (values.length > limit) throw new Error(`${header} contains too many values.`);
  return values.length ? [...new Set(values)] : undefined;
}

function decimal(value: unknown, header: ProductImportHeader): string | undefined {
  const text = cellText(value, header);
  if (!text) return undefined;
  if (!/^\d+(?:\.\d{1,2})?$/.test(text) || Number(text) <= 0) {
    throw new Error(`${header} must be a positive number with at most two decimals.`);
  }
  return text;
}

function parseRow(row: readonly unknown[]): ProductImportRowInput {
  const at = (name: ProductImportHeader) => row[PRODUCT_IMPORT_HEADERS.indexOf(name)];
  const moqUnit = cellText(at("MOQ Unit"), "MOQ Unit");
  if (moqUnit && !["m", "kg", "roll", "yd"].includes(moqUnit)) {
    throw new Error("MOQ Unit must be one of m, kg, roll, yd.");
  }
  const moqValue = decimal(at("MOQ Value"), "MOQ Value");
  if (Boolean(moqUnit) !== Boolean(moqValue)) {
    throw new Error("MOQ Value and MOQ Unit must be supplied together.");
  }
  const result: ProductImportRowInput = {};
  const textFields = [
    ["Name", "name"], ["Product Code", "productCode"], ["Primary Category", "primaryCategory"],
    ["Composition", "composition"], ["MOQ Note", "moqNote"], ["Slug", "slug"],
    ["Summary", "summary"], ["Description", "description"], ["Primary Image Alt", "primaryImageAlt"],
    ["Primary Image Caption", "primaryImageCaption"],
  ] as const;
  for (const [header, key] of textFields) {
    const value = cellText(at(header), header);
    if (value) result[key] = value;
  }
  const listFields = [
    ["Additional Categories", "additionalCategories"], ["Applications", "applications"],
    ["Tags", "tags"], ["Image Files", "imageFiles"],
  ] as const;
  for (const [header, key] of listFields) {
    const value = list(at(header), header);
    if (value) result[key] = value;
  }
  const gsm = decimal(at("GSM"), "GSM");
  const width = decimal(at("Width"), "Width");
  if (gsm) result.gsm = gsm;
  if (width) result.width = width;
  if (moqValue) {
    result.moqValue = moqValue;
    result.moqUnit = moqUnit as "m" | "kg" | "roll" | "yd";
  }
  if (new TextEncoder().encode(JSON.stringify(result)).byteLength > 30 * 1024) {
    throw new Error("Product row exceeds the bounded Template V1 evidence limit.");
  }
  return result;
}

async function inspectWorkbookContainer(bytes: Uint8Array): Promise<Map<number, ProductImportParseError[]>> {
  const formulas = new Map<number, ProductImportParseError[]>();
  const reader = new ZipReader(new Uint8ArrayReader(bytes), { checkSignature: true });
  try {
    const entries = await reader.getEntries();
    if (entries.length > PRODUCT_IMPORT_LIMITS.workbookEntries) throw new Error("Workbook contains too many package entries.");
    let expanded = 0;
    const packagePartNames = new Set<string>();
    const packageXmlParts = new Map<string, string>();
    for (const entry of entries) {
      if (entry.encrypted) throw new Error("Encrypted workbooks are not accepted.");
      const name = entry.filename.normalize("NFC");
      if (name.startsWith("/") || name.includes("..") || name.includes("\\") || /\u0000/.test(name)) {
        throw new Error("Workbook package path is unsafe.");
      }
      if (packagePartNames.has(name)) throw new Error("Workbook package contains a duplicate part.");
      if (/vbaProject\.bin$/i.test(name) || /^xl\/externalLinks\//.test(name)) {
        throw new Error("Macros and external workbook links are not accepted.");
      }
      expanded += entry.uncompressedSize;
      if (expanded > PRODUCT_IMPORT_LIMITS.workbookExpandedBytes) throw new Error("Workbook expanded size exceeds the limit.");
      if (!entry.directory) {
        packagePartNames.add(name);
        if (/\.(?:xml|rels)$/i.test(name)) {
          packageXmlParts.set(name, textDecoder.decode(await entry.getData(new Uint8ArrayWriter(), { checkSignature: true })));
        }
      }
    }
    for (const [name, xml] of packageXmlParts) {
      if (name.endsWith(".rels") && /\bTargetMode=["']External["']/i.test(xml)) {
        throw new Error("External workbook links are not accepted.");
      }
    }
    const workbookXml = packageXmlParts.get("xl/workbook.xml");
    const relationshipsXml = packageXmlParts.get("xl/_rels/workbook.xml.rels");
    const contentTypesXml = packageXmlParts.get("[Content_Types].xml");
    if (!workbookXml || !relationshipsXml || !contentTypesXml) {
      throw new Error("Workbook package topology is incomplete.");
    }

    const decodeAttribute = (value: string): string => {
      const entity = /&(?:amp|lt|gt|quot|apos|#\d+|#x[0-9a-f]+);/gi;
      if (value.replaceAll(entity, "").includes("&")) throw new Error("Workbook XML attribute is invalid.");
      return value.replaceAll(entity, (encoded) => {
      const named: Record<string, string> = { "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": "\"", "&apos;": "'" };
      const known = named[encoded.toLowerCase()];
      if (known !== undefined) return known;
      const numeric = encoded.startsWith("&#x") || encoded.startsWith("&#X")
        ? Number.parseInt(encoded.slice(3, -1), 16)
        : Number.parseInt(encoded.slice(2, -1), 10);
      if (!Number.isSafeInteger(numeric) || numeric < 0 || numeric > 0x10ffff || (numeric >= 0xd800 && numeric <= 0xdfff)) {
        throw new Error("Workbook XML attribute is invalid.");
      }
      return String.fromCodePoint(numeric);
      });
    };
    const attributes = (tag: string): Map<string, string> => {
      const result = new Map<string, string>();
      const body = tag.replace(/^<[^\s>]+/, "").replace(/\/?>$/, "");
      let consumed = "";
      for (const match of body.matchAll(/\s+([^\s=]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g)) {
        const [full, name, doubleQuoted, singleQuoted] = match;
        consumed += full;
        if (!name || result.has(name)) throw new Error("Workbook XML contains duplicate attributes.");
        result.set(name, decodeAttribute(doubleQuoted ?? singleQuoted ?? ""));
      }
      if (body.replace(consumed, "").trim()) throw new Error("Workbook XML attributes could not be parsed completely.");
      for (const value of result.values()) {
        if (/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(value)) {
          throw new Error("Workbook XML attribute is invalid.");
        }
      }
      return result;
    };
    const assertXmlEnvelope = (xml: string, root: string): void => {
      if (/<!DOCTYPE\b|<!ENTITY\b|<!\[CDATA\[|<!--|<\?(?!xml\b)/i.test(xml)) {
        throw new Error("Workbook package XML contains unsupported markup.");
      }
      const document = xml.replace(/^\uFEFF?\s*<\?xml\b[^?]*\?>/i, "").trim();
      const rootPattern = new RegExp(`^<${root}\\b[^>]*>[\\s\\S]*<\\/${root}>$`);
      const openingRoots = [...document.matchAll(new RegExp(`<${root}\\b`, "g"))];
      const closingRoots = [...document.matchAll(new RegExp(`<\\/${root}>`, "g"))];
      if (!rootPattern.test(document) || openingRoots.length !== 1 || closingRoots.length !== 1) {
        throw new Error("Workbook package XML topology is malformed.");
      }
    };
    assertXmlEnvelope(workbookXml, "workbook");
    assertXmlEnvelope(relationshipsXml, "Relationships");
    assertXmlEnvelope(contentTypesXml, "Types");

    const normalizeContentTypePart = (partName: string): string => {
      if (!partName.startsWith("/") || partName.includes("\\") || partName.includes("?") || partName.includes("#") || partName.includes("%") || /[\u0000-\u001f]/.test(partName)) {
        throw new Error("Workbook content type part name is unsafe.");
      }
      const segments = partName.slice(1).split("/");
      if (!segments.length || segments.some((segment) => !segment || segment === "." || segment === ".." || segment.includes(":"))) {
        throw new Error("Workbook content type part name is unsafe.");
      }
      return segments.join("/");
    };
    const overrideTags = [...contentTypesXml.matchAll(/<Override\b[^>]*\/>/g)];
    if ([...contentTypesXml.matchAll(/<Override\b/g)].length !== overrideTags.length) {
      throw new Error("Workbook content type declarations are malformed.");
    }
    const contentTypeByPart = new Map<string, string>();
    for (const match of overrideTags) {
      const value = attributes(match[0]);
      const partName = value.get("PartName");
      const contentType = value.get("ContentType");
      if (!partName || !contentType || value.size !== 2) {
        throw new Error("Workbook content type declaration is invalid.");
      }
      const part = normalizeContentTypePart(partName);
      if (contentTypeByPart.has(part)) throw new Error("Workbook content type declaration is duplicated.");
      contentTypeByPart.set(part, contentType);
    }

    const relationshipById = new Map<string, { type: string; target: string; targetMode: string | null }>();
    const relationshipTags = [...relationshipsXml.matchAll(/<Relationship\b[^>]*\/>/g)];
    if ([...relationshipsXml.matchAll(/<Relationship\b/g)].length !== relationshipTags.length) {
      throw new Error("Workbook relationships are malformed.");
    }
    for (const match of relationshipTags) {
      const value = attributes(match[0]);
      const id = value.get("Id");
      const type = value.get("Type");
      const target = value.get("Target");
      const targetMode = value.get("TargetMode") ?? null;
      if (!id || !type || !target || (targetMode !== null && targetMode !== "Internal")) {
        throw new Error("Workbook relationship is invalid or external.");
      }
      if (relationshipById.has(id)) throw new Error("Workbook relationship ID is duplicated.");
      relationshipById.set(id, { type, target, targetMode });
    }
    if (!relationshipById.size) throw new Error("Workbook relationships are missing.");
    const resolveWorksheetTarget = (target: string): string => {
      if (!target || target.includes("\\") || target.includes("?") || target.includes("#") || target.includes("%") || /[\u0000-\u001f]/.test(target)) {
        throw new Error("Workbook worksheet target is unsafe.");
      }
      const segments = (target.startsWith("/") ? target.slice(1) : `xl/${target}`).split("/");
      const resolved: string[] = [];
      for (const segment of segments) {
        if (!segment || segment === ".") continue;
        if (segment === "..") {
          if (!resolved.length) throw new Error("Workbook worksheet target escaped the package.");
          resolved.pop();
        } else if (segment.includes(":")) {
          throw new Error("Workbook worksheet target is unsafe.");
        } else {
          resolved.push(segment);
        }
      }
      const part = resolved.join("/");
      if (!/^xl\/worksheets\/[A-Za-z0-9._-]+\.xml$/.test(part)) {
        throw new Error("Workbook relationship does not reference a legal worksheet part.");
      }
      return part;
    };
    const worksheetRelationshipParts = new Map<string, string>();
    const worksheetRelationshipIdsByPart = new Map<string, string>();
    for (const [id, relationship] of relationshipById) {
      if (relationship.type !== transitionalWorksheetRelationshipType) continue;
      const part = resolveWorksheetTarget(relationship.target);
      if (worksheetRelationshipIdsByPart.has(part)) {
        throw new Error("Workbook worksheet relationship target is duplicated.");
      }
      worksheetRelationshipIdsByPart.set(part, id);
      worksheetRelationshipParts.set(id, part);
    }
    const sheetNames = new Set<string>();
    const sheetParts = new Set<string>();
    const usedWorksheetRelationshipIds = new Set<string>();
    const workbookSheets: Array<{ name: string; part: string }> = [];
    const sheetTags = [...workbookXml.matchAll(/<sheet\b[^>]*\/>/g)];
    if ([...workbookXml.matchAll(/<sheet\b/g)].length !== sheetTags.length) {
      throw new Error("Workbook sheet topology is malformed.");
    }
    for (const match of sheetTags) {
      const value = attributes(match[0]);
      const name = value.get("name");
      const relationshipId = value.get("r:id");
      if (!name || !relationshipId || sheetNames.has(name)) throw new Error("Workbook sheet identity is missing or duplicated.");
      const relationship = relationshipById.get(relationshipId);
      if (!relationship) throw new Error("Workbook worksheet relationship is missing or invalid.");
      if (relationship.type !== transitionalWorksheetRelationshipType) {
        throw new Error("Workbook worksheet relationship type is unsupported.");
      }
      const part = worksheetRelationshipParts.get(relationshipId);
      if (!part) throw new Error("Workbook worksheet relationship is missing or invalid.");
      if (!packagePartNames.has(part) || !packageXmlParts.has(part) || sheetParts.has(part)) throw new Error("Workbook worksheet part is missing or duplicated.");
      if (contentTypeByPart.get(part) !== worksheetContentType) {
        throw new Error("Workbook worksheet content type is missing or invalid.");
      }
      sheetNames.add(name);
      sheetParts.add(part);
      usedWorksheetRelationshipIds.add(relationshipId);
      workbookSheets.push({ name, part });
    }
    if (
      workbookSheets.length !== 2 ||
      !sheetNames.has("Products") ||
      !sheetNames.has("_CWT_META")
    ) {
      throw new Error("Workbook must contain only the generated Template V1 Products and metadata sheets.");
    }
    if ([...worksheetRelationshipParts.keys()].some((id) => !usedWorksheetRelationshipIds.has(id))) {
      throw new Error("Workbook contains an unreferenced worksheet relationship.");
    }
    for (const sheet of workbookSheets) {
      const xml = packageXmlParts.get(sheet.part)!;
      if (!/<worksheet\b/.test(xml)) throw new Error("Workbook worksheet part is malformed.");
      if (/<[A-Za-z_][\w.-]*:f(?:\s|>)/i.test(xml)) throw new Error("Workbook formula evidence could not be attributed safely.");
      const dimensions = [...xml.matchAll(/<dimension\b[^>]*\bref=["'](?:[A-Z]+\d+:)?([A-Z]+)(\d+)["'][^>]*\/?>/gi)];
      if (dimensions.length > 1) throw new Error("Workbook worksheet dimension is duplicated.");
      const dimension = dimensions[0];
      if (dimension && (columnNumber(dimension[1]!.toUpperCase()) > PRODUCT_IMPORT_HEADERS.length || Number(dimension[2]) > PRODUCT_IMPORT_LIMITS.rows + 1)) {
        throw new Error("Workbook contains more than 100 Product rows or dimensions exceed the Template V1 limit.");
      }
      for (const match of xml.matchAll(/<c\b[^>]*\br=["']([A-Z]+)(\d+)["'][^>]*>(?:(?!<\/c>)[\s\S])*?<f(?:\s[^>]*)?>/gi)) {
        const rowNumber = Number(match[2]);
        if (columnNumber(match[1]!.toUpperCase()) > PRODUCT_IMPORT_HEADERS.length || rowNumber > PRODUCT_IMPORT_LIMITS.rows + 1) {
          throw new Error("Workbook contains more than 100 Product rows or dimensions exceed the Template V1 limit.");
        }
        if (sheet.name !== "Products") throw new Error(`Formula cell ${match[1]}${match[2]} is not accepted.`);
        const errors = formulas.get(rowNumber) ?? [];
        errors.push({ rowNumber, column: null, code: "formula_not_allowed", detail: `Formula cell ${match[1]}${match[2]} is not accepted.` });
        formulas.set(rowNumber, errors);
      }
      if (/<f(?:\s|>)/i.test(xml) && ![...xml.matchAll(/<c\b[^>]*\br=["']([A-Z]+)(\d+)["'][^>]*>(?:(?!<\/c>)[\s\S])*?<f(?:\s[^>]*)?>/gi)].length) {
        throw new Error("Workbook formula evidence could not be attributed safely.");
      }
      for (const cell of xml.matchAll(/<c\b[^>]*\br=["']([A-Z]+)(\d+)["']/gi)) {
        if (columnNumber(cell[1]!.toUpperCase()) > PRODUCT_IMPORT_HEADERS.length || Number(cell[2]) > PRODUCT_IMPORT_LIMITS.rows + 1) {
          throw new Error("Workbook contains more than 100 Product rows or dimensions exceed the Template V1 limit.");
        }
      }
    }
    const unreferencedWorksheet = [...packagePartNames].find((part) =>
      /^xl\/worksheets\/[^/]+\.xml$/i.test(part) && !sheetParts.has(part),
    );
    if (unreferencedWorksheet) throw new Error("Workbook contains an unreferenced worksheet part whose dimensions cannot be trusted.");
  } finally {
    await reader.close();
  }
  return formulas;
}

export async function parseProductImportWorkbook(bytes: Uint8Array): Promise<ParsedProductImportWorkbook> {
  if (!bytes.byteLength || bytes.byteLength > PRODUCT_IMPORT_LIMITS.workbookBytes) {
    throw new Error("Workbook actual bytes exceed the Template V1 limit.");
  }
  if (bytes[0] !== 0x50 || bytes[1] !== 0x4b) throw new Error("Only an XLSX ZIP container is accepted.");
  const formulaErrors = await inspectWorkbookContainer(bytes);
  const sheets = await readExcelFile(Buffer.from(bytes));
  if (sheets.length !== 2 || !sheets.some((sheet) => sheet.sheet === "Products") || !sheets.some((sheet) => sheet.sheet === "_CWT_META")) {
    throw new Error("Only the generated Template V1 Products and metadata sheets are accepted.");
  }
  const products = sheets.find((sheet) => sheet.sheet === "Products");
  const metadata = sheets.find((sheet) => sheet.sheet === "_CWT_META");
  if (!products || !metadata) throw new Error("Template V1 Products or metadata sheet is missing.");
  if (metadata.data[0]?.[0] !== "contract" || metadata.data[0]?.[1] !== PRODUCT_IMPORT_TEMPLATE_NAME || metadata.data[1]?.[0] !== "version" || metadata.data[1]?.[1] !== 1) {
    throw new Error("Workbook Template V1 metadata is missing or unsupported.");
  }
  const header = products.data[0] ?? [];
  if (header.length !== PRODUCT_IMPORT_HEADERS.length || header.some((value, index) => value !== PRODUCT_IMPORT_HEADERS[index])) {
    throw new Error("Workbook headers must exactly match Template V1 in the approved order.");
  }
  const maximumRowNumber = Math.max(products.data.length, ...formulaErrors.keys(), 1);
  const dataRows = Array.from({ length: maximumRowNumber - 1 }, (_, index) => ({
    row: products.data[index + 1] ?? [],
    rowNumber: index + 2,
  })).filter(({ row, rowNumber }) =>
    row.some((cell) => cell !== null && cell !== "") || formulaErrors.has(rowNumber),
  );
  if (dataRows.length > PRODUCT_IMPORT_LIMITS.rows) throw new Error("Workbook contains more than 100 Product rows.");
  const rows = dataRows.map(({ row, rowNumber }) => {
    const errors = [...(formulaErrors.get(rowNumber) ?? [])];
    let input: ProductImportRowInput = {};
    try {
      input = parseRow(row);
    } catch (error) {
      errors.push({ rowNumber, column: null, code: "invalid_cell", detail: error instanceof Error ? error.message : "Row value is invalid." });
    }
    return { rowNumber, input, errors };
  });
  return { templateVersion: 1, rows, errors: [...formulaErrors.get(1) ?? []] };
}
