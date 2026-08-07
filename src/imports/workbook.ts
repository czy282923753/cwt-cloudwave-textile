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
const contentTypesNamespace = "http://schemas.openxmlformats.org/package/2006/content-types";
const packageRelationshipsNamespace = "http://schemas.openxmlformats.org/package/2006/relationships";
const transitionalSpreadsheetNamespace = "http://schemas.openxmlformats.org/spreadsheetml/2006/main";
const transitionalOfficeRelationshipsNamespace =
  "http://schemas.openxmlformats.org/officeDocument/2006/relationships";
const transitionalWorksheetRelationshipType =
  "http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet";
const worksheetContentType =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml";
const requiredDefaultContentTypes = new Map([
  ["xml", "application/xml"],
  ["rels", "application/vnd.openxmlformats-package.relationships+xml"],
]);
const requiredFixedOverrideContentTypes = new Map([
  ["xl/workbook.xml", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"],
  ["xl/sharedStrings.xml", "application/vnd.openxmlformats-officedocument.spreadsheetml.sharedStrings+xml"],
  ["xl/styles.xml", "application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"],
]);

export class ProductImportWorkbookPackageError extends Error {
  readonly code = "invalid_workbook_package" as const;

  constructor(message: string) {
    super(message);
    this.name = "ProductImportWorkbookPackageError";
  }
}

type PackageXmlElement = {
  qualifiedName: string;
  localName: string;
  namespaceUri: string | null;
  attributes: Map<string, string>;
  children: PackageXmlElement[];
  parent: PackageXmlElement | null;
  hasNonWhitespaceText: boolean;
};

function packageXmlFailure(): never {
  throw new Error("Workbook package XML topology or namespace is invalid.");
}

function expandedXmlName(namespaceUri: string | null, localName: string): string {
  return `${namespaceUri ?? ""}\u0000${localName}`;
}

function splitXmlName(qualifiedName: string): { prefix: string | null; localName: string } {
  if (!/^[A-Za-z_][\w.-]*(?::[A-Za-z_][\w.-]*)?$/.test(qualifiedName)) packageXmlFailure();
  const separator = qualifiedName.indexOf(":");
  return separator === -1
    ? { prefix: null, localName: qualifiedName }
    : { prefix: qualifiedName.slice(0, separator), localName: qualifiedName.slice(separator + 1) };
}

function decodeXmlValue(value: string): string {
  const entity = /&(?:amp|lt|gt|quot|apos|#\d+|#[xX][0-9a-fA-F]+);/g;
  if (value.replaceAll(entity, "").includes("&")) packageXmlFailure();
  const decoded = value.replaceAll(entity, (encoded) => {
    const named: Record<string, string> = { "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": "\"", "&apos;": "'" };
    const known = named[encoded];
    if (known !== undefined) return known;
    const numeric = encoded.startsWith("&#x") || encoded.startsWith("&#X")
      ? Number.parseInt(encoded.slice(3, -1), 16)
      : Number.parseInt(encoded.slice(2, -1), 10);
    if (!Number.isSafeInteger(numeric) || numeric < 0 || numeric > 0x10ffff || (numeric >= 0xd800 && numeric <= 0xdfff)) {
      packageXmlFailure();
    }
    return String.fromCodePoint(numeric);
  });
  if (/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(decoded)) packageXmlFailure();
  return decoded;
}

function parseXmlAttributes(source: string): Array<{ qualifiedName: string; value: string }> {
  const result: Array<{ qualifiedName: string; value: string }> = [];
  const lexicalNames = new Set<string>();
  let position = 0;
  while (position < source.length) {
    while (/\s/.test(source[position] ?? "")) position += 1;
    if (position === source.length) break;
    const nameMatch = /^[A-Za-z_][\w.-]*(?::[A-Za-z_][\w.-]*)?/.exec(source.slice(position));
    if (!nameMatch) packageXmlFailure();
    const qualifiedName = nameMatch[0];
    splitXmlName(qualifiedName);
    if (lexicalNames.has(qualifiedName)) packageXmlFailure();
    lexicalNames.add(qualifiedName);
    position += qualifiedName.length;
    while (/\s/.test(source[position] ?? "")) position += 1;
    if (source[position] !== "=") packageXmlFailure();
    position += 1;
    while (/\s/.test(source[position] ?? "")) position += 1;
    const quote = source[position];
    if (quote !== "\"" && quote !== "'") packageXmlFailure();
    position += 1;
    const end = source.indexOf(quote, position);
    if (end === -1 || source.slice(position, end).includes("<")) packageXmlFailure();
    result.push({ qualifiedName, value: decodeXmlValue(source.slice(position, end)) });
    position = end + 1;
  }
  return result;
}

function parsePackageXml(xml: string): PackageXmlElement {
  if (/<!DOCTYPE\b|<!ENTITY\b|<!\[CDATA\[|<!--|<\?(?!xml\b)/i.test(xml) || xml.includes("]]>")) {
    throw new Error("Workbook package XML contains unsupported markup.");
  }
  let position = xml.charCodeAt(0) === 0xfeff ? 1 : 0;
  if (xml.startsWith("<?xml", position)) {
    const declarationEnd = xml.indexOf("?>", position);
    if (declarationEnd === -1) packageXmlFailure();
    const declaration = xml.slice(position, declarationEnd + 2);
    if (!/^<\?xml\s+version=(?:"1\.0"|'1\.0')(?:\s+encoding=(?:"[Uu][Tt][Ff]-8"|'[Uu][Tt][Ff]-8'))?(?:\s+standalone=(?:"(?:yes|no)"|'(?:yes|no)'))?\s*\?>$/.test(declaration)) {
      packageXmlFailure();
    }
    position = declarationEnd + 2;
  }
  const stack: Array<{ element: PackageXmlElement; namespaces: Map<string, string> }> = [];
  let root: PackageXmlElement | null = null;
  while (position < xml.length) {
    const nextTag = xml.indexOf("<", position);
    if (nextTag === -1) {
      const text = xml.slice(position);
      if (!stack.length && text.trim()) packageXmlFailure();
      decodeXmlValue(text);
      if (text.trim()) stack.at(-1)!.element.hasNonWhitespaceText = true;
      position = xml.length;
      break;
    }
    const text = xml.slice(position, nextTag);
    if (!stack.length && text.trim()) packageXmlFailure();
    decodeXmlValue(text);
    if (text.trim()) stack.at(-1)!.element.hasNonWhitespaceText = true;
    position = nextTag;
    if (xml.startsWith("</", position)) {
      const closeEnd = xml.indexOf(">", position + 2);
      if (closeEnd === -1) packageXmlFailure();
      const qualifiedName = xml.slice(position + 2, closeEnd).trim();
      splitXmlName(qualifiedName);
      const current = stack.pop();
      if (!current || current.element.qualifiedName !== qualifiedName) packageXmlFailure();
      position = closeEnd + 1;
      continue;
    }
    if (xml[position + 1] === "!" || xml[position + 1] === "?") packageXmlFailure();
    let tagEnd = position + 1;
    let quote: string | null = null;
    for (; tagEnd < xml.length; tagEnd += 1) {
      const character = xml[tagEnd]!;
      if (quote) {
        if (character === quote) quote = null;
      } else if (character === "\"" || character === "'") {
        quote = character;
      } else if (character === ">") {
        break;
      }
    }
    if (tagEnd === xml.length || quote) packageXmlFailure();
    let tagBody = xml.slice(position + 1, tagEnd);
    const selfClosing = /\/\s*$/.test(tagBody);
    if (selfClosing) tagBody = tagBody.replace(/\/\s*$/, "");
    const nameMatch = /^([A-Za-z_][\w.-]*(?::[A-Za-z_][\w.-]*)?)(?=\s|$)/.exec(tagBody);
    if (!nameMatch) packageXmlFailure();
    const qualifiedName = nameMatch[1]!;
    const rawAttributes = parseXmlAttributes(tagBody.slice(qualifiedName.length));
    const namespaces = new Map(stack.at(-1)?.namespaces ?? [["xml", "http://www.w3.org/XML/1998/namespace"]]);
    for (const attribute of rawAttributes) {
      if (attribute.qualifiedName === "xmlns") {
        if (attribute.value === "http://www.w3.org/XML/1998/namespace" || attribute.value === "http://www.w3.org/2000/xmlns/") {
          packageXmlFailure();
        }
        namespaces.set("", attribute.value);
      } else if (attribute.qualifiedName.startsWith("xmlns:")) {
        const prefix = attribute.qualifiedName.slice(6);
        if (
          !attribute.value ||
          prefix === "xmlns" ||
          (prefix === "xml") !== (attribute.value === "http://www.w3.org/XML/1998/namespace") ||
          attribute.value === "http://www.w3.org/2000/xmlns/"
        ) {
          packageXmlFailure();
        }
        namespaces.set(prefix, attribute.value);
      }
    }
    const elementName = splitXmlName(qualifiedName);
    const namespaceUri = namespaces.get(elementName.prefix ?? "") || null;
    if (elementName.prefix && !namespaceUri) packageXmlFailure();
    const parent = stack.at(-1)?.element ?? null;
    const element: PackageXmlElement = {
      qualifiedName,
      localName: elementName.localName,
      namespaceUri,
      attributes: new Map(),
      children: [],
      parent,
      hasNonWhitespaceText: false,
    };
    for (const attribute of rawAttributes) {
      if (attribute.qualifiedName === "xmlns" || attribute.qualifiedName.startsWith("xmlns:")) continue;
      const name = splitXmlName(attribute.qualifiedName);
      const attributeNamespace = name.prefix ? namespaces.get(name.prefix) ?? null : null;
      if (name.prefix && !attributeNamespace) packageXmlFailure();
      const key = expandedXmlName(attributeNamespace, name.localName);
      if (element.attributes.has(key)) packageXmlFailure();
      element.attributes.set(key, attribute.value);
    }
    if (parent) parent.children.push(element);
    else if (root) packageXmlFailure();
    else root = element;
    if (!selfClosing) stack.push({ element, namespaces });
    position = tagEnd + 1;
  }
  if (!root || stack.length) packageXmlFailure();
  return root;
}

function xmlAttribute(element: PackageXmlElement, localName: string, namespaceUri: string | null = null): string | undefined {
  return element.attributes.get(expandedXmlName(namespaceUri, localName));
}

function xmlDescendants(element: PackageXmlElement, localName: string, namespaceUri: string): PackageXmlElement[] {
  return element.children.flatMap((child) => [
    ...(child.localName === localName && child.namespaceUri === namespaceUri ? [child] : []),
    ...xmlDescendants(child, localName, namespaceUri),
  ]);
}

function xmlDescendantsByLocalName(element: PackageXmlElement, localName: string): PackageXmlElement[] {
  return element.children.flatMap((child) => [
    ...(child.localName === localName ? [child] : []),
    ...xmlDescendantsByLocalName(child, localName),
  ]);
}

function assertXmlRoot(element: PackageXmlElement, localName: string, namespaceUri: string): void {
  if (element.localName !== localName || element.namespaceUri !== namespaceUri) packageXmlFailure();
}

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

    const workbookRoot = parsePackageXml(workbookXml);
    const relationshipsRoot = parsePackageXml(relationshipsXml);
    const contentTypesRoot = parsePackageXml(contentTypesXml);
    assertXmlRoot(workbookRoot, "workbook", transitionalSpreadsheetNamespace);
    assertXmlRoot(relationshipsRoot, "Relationships", packageRelationshipsNamespace);
    assertXmlRoot(contentTypesRoot, "Types", contentTypesNamespace);
    if (relationshipsRoot.hasNonWhitespaceText || contentTypesRoot.hasNonWhitespaceText) packageXmlFailure();

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
    const defaultContentTypeByExtension = new Map<string, string>();
    const contentTypeByPart = new Map<string, string>();
    for (const declaration of contentTypesRoot.children) {
      if (
        declaration.namespaceUri !== contentTypesNamespace ||
        (declaration.localName !== "Default" && declaration.localName !== "Override") ||
        declaration.children.length ||
        declaration.hasNonWhitespaceText
      ) {
        throw new Error("Workbook content type declarations are malformed or unsupported.");
      }
      const contentType = xmlAttribute(declaration, "ContentType");
      if (!contentType || declaration.attributes.size !== 2) {
        throw new Error("Workbook content type declaration is invalid.");
      }
      if (declaration.localName === "Default") {
        const extension = xmlAttribute(declaration, "Extension");
        if (!extension || !/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(extension.normalize("NFC"))) {
          throw new Error("Workbook default content type declaration is invalid.");
        }
        const normalizedExtension = extension.normalize("NFC").toLowerCase();
        if (defaultContentTypeByExtension.has(normalizedExtension)) {
          throw new Error("Workbook default content type declaration is duplicated or ambiguous.");
        }
        const expected = requiredDefaultContentTypes.get(normalizedExtension);
        if (!expected || contentType !== expected) {
          throw new Error("Workbook default content type declaration is unsupported or invalid.");
        }
        defaultContentTypeByExtension.set(normalizedExtension, contentType);
        continue;
      }
      const partName = xmlAttribute(declaration, "PartName");
      if (!partName) throw new Error("Workbook content type declaration is invalid.");
      const part = normalizeContentTypePart(partName.normalize("NFC"));
      if (contentTypeByPart.has(part)) throw new Error("Workbook content type declaration is duplicated.");
      contentTypeByPart.set(part, contentType);
    }
    if (
      defaultContentTypeByExtension.size !== requiredDefaultContentTypes.size ||
      [...requiredDefaultContentTypes].some(([extension, contentType]) => defaultContentTypeByExtension.get(extension) !== contentType)
    ) {
      throw new Error("Workbook default content type declarations are incomplete.");
    }
    for (const [part, contentType] of requiredFixedOverrideContentTypes) {
      if (!packagePartNames.has(part) || contentTypeByPart.get(part) !== contentType) {
        throw new Error("Workbook fixed content type declaration is missing or invalid.");
      }
    }

    const relationshipById = new Map<string, { type: string; target: string; targetMode: string | null }>();
    for (const relationshipElement of relationshipsRoot.children) {
      if (
        relationshipElement.localName !== "Relationship" ||
        relationshipElement.namespaceUri !== packageRelationshipsNamespace ||
        relationshipElement.children.length ||
        relationshipElement.hasNonWhitespaceText
      ) {
        throw new Error("Workbook relationships are malformed.");
      }
      const id = xmlAttribute(relationshipElement, "Id");
      const type = xmlAttribute(relationshipElement, "Type");
      const target = xmlAttribute(relationshipElement, "Target");
      const targetMode = xmlAttribute(relationshipElement, "TargetMode") ?? null;
      const expectedAttributeCount = targetMode === null ? 3 : 4;
      if (!id || !type || !target || relationshipElement.attributes.size !== expectedAttributeCount || (targetMode !== null && targetMode !== "Internal")) {
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
    if (xmlDescendantsByLocalName(workbookRoot, "sheet").some((element) => element.namespaceUri !== transitionalSpreadsheetNamespace)) {
      throw new Error("Workbook sheet topology is malformed.");
    }
    const sheetElements = xmlDescendants(workbookRoot, "sheet", transitionalSpreadsheetNamespace);
    for (const sheetElement of sheetElements) {
      const name = xmlAttribute(sheetElement, "name");
      const relationshipId = xmlAttribute(sheetElement, "id", transitionalOfficeRelationshipsNamespace);
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
    const allowedContentTypeParts = new Set([
      ...requiredFixedOverrideContentTypes.keys(),
      ...worksheetRelationshipParts.values(),
    ]);
    if (
      contentTypeByPart.size !== allowedContentTypeParts.size ||
      [...contentTypeByPart.keys()].some((part) => !allowedContentTypeParts.has(part))
    ) {
      throw new Error("Workbook content type declaration is unreferenced or unsupported.");
    }
    for (const sheet of workbookSheets) {
      const xml = packageXmlParts.get(sheet.part)!;
      const worksheetRoot = parsePackageXml(xml);
      assertXmlRoot(worksheetRoot, "worksheet", transitionalSpreadsheetNamespace);
      if (["dimension", "c", "f"].some((localName) =>
        xmlDescendantsByLocalName(worksheetRoot, localName).some((element) => element.namespaceUri !== transitionalSpreadsheetNamespace),
      )) {
        throw new Error("Workbook worksheet evidence namespace is invalid.");
      }
      const dimensions = xmlDescendants(worksheetRoot, "dimension", transitionalSpreadsheetNamespace);
      if (dimensions.length > 1) throw new Error("Workbook worksheet dimension is duplicated.");
      const dimension = dimensions[0];
      if (dimension) {
        const reference = xmlAttribute(dimension, "ref");
        const match = reference?.match(/^(?:[A-Z]+\d+:)?([A-Z]+)(\d+)$/i);
        if (!match) throw new Error("Workbook worksheet dimension is invalid.");
        if (columnNumber(match[1]!.toUpperCase()) > PRODUCT_IMPORT_HEADERS.length || Number(match[2]) > PRODUCT_IMPORT_LIMITS.rows + 1) {
          throw new Error("Workbook contains more than 100 Product rows or dimensions exceed the Template V1 limit.");
        }
      }
      const cells = xmlDescendants(worksheetRoot, "c", transitionalSpreadsheetNamespace);
      for (const cell of cells) {
        const reference = xmlAttribute(cell, "r");
        const match = reference?.match(/^([A-Z]+)(\d+)$/i);
        if (!match) throw new Error("Workbook cell identity is invalid.");
        if (columnNumber(match[1]!.toUpperCase()) > PRODUCT_IMPORT_HEADERS.length || Number(match[2]) > PRODUCT_IMPORT_LIMITS.rows + 1) {
          throw new Error("Workbook contains more than 100 Product rows or dimensions exceed the Template V1 limit.");
        }
      }
      for (const formula of xmlDescendants(worksheetRoot, "f", transitionalSpreadsheetNamespace)) {
        let cell = formula.parent;
        while (cell && (cell.localName !== "c" || cell.namespaceUri !== transitionalSpreadsheetNamespace)) cell = cell.parent;
        const reference = cell ? xmlAttribute(cell, "r") : undefined;
        const match = reference?.match(/^([A-Z]+)(\d+)$/i);
        if (!match) throw new Error("Workbook formula evidence could not be attributed safely.");
        const rowNumber = Number(match[2]);
        if (columnNumber(match[1]!.toUpperCase()) > PRODUCT_IMPORT_HEADERS.length || rowNumber > PRODUCT_IMPORT_LIMITS.rows + 1) {
          throw new Error("Workbook contains more than 100 Product rows or dimensions exceed the Template V1 limit.");
        }
        if (sheet.name !== "Products") throw new Error(`Formula cell ${match[1]}${match[2]} is not accepted.`);
        const errors = formulas.get(rowNumber) ?? [];
        errors.push({ rowNumber, column: null, code: "formula_not_allowed", detail: `Formula cell ${match[1]}${match[2]} is not accepted.` });
        formulas.set(rowNumber, errors);
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
  let formulaErrors: Map<number, ProductImportParseError[]>;
  try {
    formulaErrors = await inspectWorkbookContainer(bytes);
  } catch (error) {
    if (error instanceof ProductImportWorkbookPackageError) throw error;
    const detail = error instanceof Error && /^(?:Workbook|Encrypted workbooks|Macros and external|External workbook|Formula cell )/.test(error.message)
      ? error.message
      : "Workbook package could not be validated safely.";
    throw new ProductImportWorkbookPackageError(detail);
  }
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
