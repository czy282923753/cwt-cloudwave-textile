import {
  Uint8ArrayReader,
  Writer,
  ZipReader,
  type FileEntry,
} from "@zip.js/zip.js";
import {
  SaxesParser,
  type SaxesAttributeNS,
  type SaxesTagNS,
} from "saxes";

import {
  PRODUCT_IMPORT_HEADERS,
  PRODUCT_IMPORT_LIMITS,
  type ProductImportParseError,
} from "./contract";
import {
  WorkbookXmlResourceBudget,
  WorkbookXmlResourceMeter,
} from "./workbook-xml-resource-meter";

const xmlnsNamespace = "http://www.w3.org/2000/xmlns/";
const contentTypesNamespace = "http://schemas.openxmlformats.org/package/2006/content-types";
const packageRelationshipsNamespace = "http://schemas.openxmlformats.org/package/2006/relationships";
const spreadsheetNamespace = "http://schemas.openxmlformats.org/spreadsheetml/2006/main";
const officeRelationshipsNamespace = "http://schemas.openxmlformats.org/officeDocument/2006/relationships";
const worksheetRelationshipType = `${officeRelationshipsNamespace}/worksheet`;
const sharedStringsRelationshipType = `${officeRelationshipsNamespace}/sharedStrings`;
const stylesRelationshipType = `${officeRelationshipsNamespace}/styles`;
const worksheetContentType = "application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml";
const requiredDefaultContentTypes = new Map([
  ["xml", "application/xml"],
  ["rels", "application/vnd.openxmlformats-package.relationships+xml"],
]);
const requiredFixedOverrideContentTypes = new Map([
  ["xl/workbook.xml", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"],
  ["xl/sharedStrings.xml", "application/vnd.openxmlformats-officedocument.spreadsheetml.sharedStrings+xml"],
  ["xl/styles.xml", "application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"],
]);

type CellValue = string | number | boolean | null;

export class WorkbookPackageParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WorkbookPackageParseError";
  }
}

function fail(message: string): never {
  throw new WorkbookPackageParseError(message);
}

interface XmlMachine<Result> {
  open(tag: SaxesTagNS): void;
  text(value: string): void;
  close(tag: SaxesTagNS): void;
  finish(): Result;
}

class BoundedXmlParser<Result> {
  private readonly parser = new SaxesParser({ xmlns: true });
  private readonly meter: WorkbookXmlResourceMeter;
  private closed = false;

  constructor(
    budget: WorkbookXmlResourceBudget,
    private readonly machine: XmlMachine<Result>,
  ) {
    this.meter = new WorkbookXmlResourceMeter(budget, fail);
    this.parser.on("xmldecl", (declaration) => {
      if (
        declaration.version !== "1.0" ||
        (declaration.encoding !== undefined && declaration.encoding.toLowerCase() !== "utf-8") ||
        (declaration.standalone !== undefined && declaration.standalone !== "yes" && declaration.standalone !== "no")
      ) {
        fail("Workbook package XML declaration is unsupported.");
      }
    });
    this.parser.on("doctype", () => fail("Workbook package XML contains unsupported DTD or entity declarations."));
    this.parser.on("processinginstruction", () => fail("Workbook package XML contains an unsupported processing instruction."));
    this.parser.on("comment", () => fail("Workbook package XML contains unsupported markup."));
    this.parser.on("cdata", () => fail("Workbook package XML contains unsupported markup."));
    this.parser.on("error", () => fail("Workbook package XML topology or namespace is invalid."));
    this.parser.on("opentag", (tag) => {
      this.machine.open(tag);
    });
    this.parser.on("text", (value) => {
      this.machine.text(value);
    });
    this.parser.on("closetag", (tag) => {
      this.machine.close(tag);
    });
  }

  write(bytes: Uint8Array): void {
    if (this.closed) fail("Workbook package XML parser received data after close.");
    try {
      this.meter.write(bytes, (decoded) => {
        this.parser.write(decoded);
      });
    } catch (error) {
      if (error instanceof WorkbookPackageParseError) throw error;
      fail("Workbook package XML topology or namespace is invalid.");
    }
  }

  close(): Result {
    if (this.closed) fail("Workbook package XML parser was closed more than once.");
    this.closed = true;
    try {
      this.meter.close((decoded) => {
        this.parser.write(decoded);
      });
      this.parser.close();
    } catch (error) {
      if (error instanceof WorkbookPackageParseError) throw error;
      fail("Workbook package XML topology or namespace is invalid.");
    }
    return this.machine.finish();
  }
}

class XmlEntryWriter<Result> extends Writer<Result> {
  private readonly bounded: BoundedXmlParser<Result>;
  failure: WorkbookPackageParseError | null = null;

  constructor(budget: WorkbookXmlResourceBudget, machine: XmlMachine<Result>) {
    super();
    this.bounded = new BoundedXmlParser(budget, machine);
  }

  override async writeUint8Array(array: Uint8Array): Promise<void> {
    try {
      this.bounded.write(array);
    } catch (error) {
      if (error instanceof WorkbookPackageParseError) this.failure = error;
      throw error;
    }
  }

  override async getData(): Promise<Result> {
    try {
      return this.bounded.close();
    } catch (error) {
      if (error instanceof WorkbookPackageParseError) this.failure = error;
      throw error;
    }
  }
}

function regularAttributes(tag: SaxesTagNS): SaxesAttributeNS[] {
  return Object.values(tag.attributes).filter((attribute) => attribute.uri !== xmlnsNamespace);
}

function attribute(tag: SaxesTagNS, local: string, uri = ""): string | undefined {
  return Object.values(tag.attributes).find((candidate) => candidate.local === local && candidate.uri === uri)?.value;
}

function attributeKey(attributeValue: SaxesAttributeNS): string {
  return `${attributeValue.uri}\u0000${attributeValue.local}`;
}

function assertAttributes(tag: SaxesTagNS, allowed: readonly string[]): void {
  const allowedSet = new Set(allowed);
  if (regularAttributes(tag).some((candidate) => !allowedSet.has(attributeKey(candidate)))) {
    fail("Workbook package XML contains unsupported attributes.");
  }
}

function assertRoot(tag: SaxesTagNS, local: string, uri: string): void {
  if (tag.local !== local || tag.uri !== uri) fail("Workbook package XML topology or namespace is invalid.");
}

type ContentTypes = {
  defaults: Map<string, string>;
  overrides: Map<string, string>;
};

function normalizeContentTypePart(partName: string): string {
  if (!partName.startsWith("/") || partName.includes("\\") || partName.includes("?") || partName.includes("#") || partName.includes("%") || /[\u0000-\u001f]/.test(partName)) {
    fail("Workbook content type part name is unsafe.");
  }
  const segments = partName.slice(1).split("/");
  if (!segments.length || segments.some((segment) => !segment || segment === "." || segment === ".." || segment.includes(":"))) {
    fail("Workbook content type part name is unsafe.");
  }
  return segments.join("/");
}

class ContentTypesMachine implements XmlMachine<ContentTypes> {
  private depth = 0;
  private readonly defaults = new Map<string, string>();
  private readonly overrides = new Map<string, string>();
  private pendingInvalid: "default" | "override" | null = null;

  open(tag: SaxesTagNS): void {
    this.depth += 1;
    if (this.depth === 1) {
      assertRoot(tag, "Types", contentTypesNamespace);
      assertAttributes(tag, []);
      return;
    }
    if (this.depth !== 2 || tag.uri !== contentTypesNamespace || (tag.local !== "Default" && tag.local !== "Override")) {
      fail("Workbook content type declarations are malformed or unsupported.");
    }
    if (tag.local === "Default") {
      assertAttributes(tag, ["\u0000Extension", "\u0000ContentType"]);
      const extension = attribute(tag, "Extension");
      const contentType = attribute(tag, "ContentType");
      if (!extension || !contentType || regularAttributes(tag).length !== 2) {
        this.pendingInvalid = "default";
        return;
      }
      if (!/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(extension.normalize("NFC"))) {
        fail("Workbook default content type declaration is invalid.");
      }
      const normalized = extension.normalize("NFC").toLowerCase();
      if (this.defaults.has(normalized)) fail("Workbook default content type declaration is duplicated or ambiguous.");
      this.defaults.set(normalized, contentType);
      return;
    }
    assertAttributes(tag, ["\u0000PartName", "\u0000ContentType"]);
    const partName = attribute(tag, "PartName");
    const contentType = attribute(tag, "ContentType");
    if (!partName || !contentType || regularAttributes(tag).length !== 2) {
      this.pendingInvalid = "override";
      return;
    }
    const part = normalizeContentTypePart(partName.normalize("NFC"));
    if (this.overrides.has(part)) fail("Workbook content type declaration is duplicated.");
    this.overrides.set(part, contentType);
  }

  text(value: string): void {
    if (value.trim()) fail("Workbook content type declarations are malformed or unsupported.");
  }

  close(): void {
    if (this.depth === 2 && this.pendingInvalid) {
      const pending = this.pendingInvalid;
      this.pendingInvalid = null;
      if (pending === "default") fail("Workbook default content type declaration is invalid.");
      fail("Workbook content type declaration is invalid.");
    }
    this.depth -= 1;
  }

  finish(): ContentTypes {
    if (this.depth !== 0) fail("Workbook package XML topology or namespace is invalid.");
    return { defaults: this.defaults, overrides: this.overrides };
  }
}

type Relationship = { id: string; type: string; target: string; targetMode: string | null };

class RelationshipsMachine implements XmlMachine<Relationship[]> {
  private depth = 0;
  private readonly relationships: Relationship[] = [];
  private readonly relationshipIds = new Set<string>();

  open(tag: SaxesTagNS): void {
    this.depth += 1;
    if (this.depth === 1) {
      assertRoot(tag, "Relationships", packageRelationshipsNamespace);
      assertAttributes(tag, []);
      return;
    }
    if (this.depth !== 2 || tag.local !== "Relationship" || tag.uri !== packageRelationshipsNamespace) {
      fail("Workbook relationships are malformed.");
    }
    assertAttributes(tag, ["\u0000Id", "\u0000Type", "\u0000Target", "\u0000TargetMode"]);
    const id = attribute(tag, "Id");
    const type = attribute(tag, "Type");
    const target = attribute(tag, "Target");
    const targetMode = attribute(tag, "TargetMode") ?? null;
    if (!id || !type || !target || regularAttributes(tag).length !== (targetMode === null ? 3 : 4)) {
      fail("Workbook relationship is invalid or external.");
    }
    if (targetMode !== null && targetMode !== "Internal") fail("Workbook relationship is invalid or external.");
    if (this.relationshipIds.has(id)) fail("Workbook relationship ID is duplicated.");
    this.relationshipIds.add(id);
    this.relationships.push({ id, type, target, targetMode });
  }

  text(value: string): void {
    if (value.trim()) fail("Workbook relationships are malformed.");
  }

  close(): void {
    this.depth -= 1;
  }

  finish(): Relationship[] {
    if (this.depth !== 0) fail("Workbook package XML topology or namespace is invalid.");
    return this.relationships;
  }
}

type WorkbookSheet = { name: string; relationshipId: string };

class WorkbookMachine implements XmlMachine<WorkbookSheet[]> {
  private readonly stack: Array<{ local: string; uri: string }> = [];
  private readonly sheets: WorkbookSheet[] = [];
  private sheetsElements = 0;

  open(tag: SaxesTagNS): void {
    const parent = this.stack.at(-1);
    this.stack.push({ local: tag.local, uri: tag.uri });
    if (this.stack.length === 1) {
      assertRoot(tag, "workbook", spreadsheetNamespace);
      return;
    }
    if (tag.local === "sheet" && tag.uri !== spreadsheetNamespace) {
      fail("Workbook sheet topology is malformed.");
    }
    if (tag.local === "sheets" && tag.uri === spreadsheetNamespace) {
      this.sheetsElements += 1;
      if (this.sheetsElements > 1 || parent?.local !== "workbook" || parent.uri !== spreadsheetNamespace) {
        fail("Workbook sheet topology is malformed.");
      }
      return;
    }
    if (tag.local !== "sheet") return;
    if (parent?.local !== "sheets" || parent.uri !== spreadsheetNamespace) fail("Workbook sheet topology is malformed.");
    const name = attribute(tag, "name");
    const relationshipId = attribute(tag, "id", officeRelationshipsNamespace);
    if (!name || !relationshipId || this.sheets.some((sheet) => sheet.name === name)) {
      fail("Workbook sheet identity is missing or duplicated.");
    }
    this.sheets.push({ name, relationshipId });
  }

  text(value: string): void {
    if (value.trim()) fail("Workbook sheet topology is malformed.");
  }

  close(): void {
    this.stack.pop();
  }

  finish(): WorkbookSheet[] {
    if (this.stack.length || this.sheetsElements !== 1) fail("Workbook package XML topology or namespace is invalid.");
    return this.sheets;
  }
}

class SharedStringsMachine implements XmlMachine<string[]> {
  private readonly stack: Array<{ local: string; uri: string }> = [];
  private readonly strings: string[] = [];
  private current: string | null = null;

  open(tag: SaxesTagNS): void {
    const parent = this.stack.at(-1);
    this.stack.push({ local: tag.local, uri: tag.uri });
    if (this.stack.length === 1) {
      assertRoot(tag, "sst", spreadsheetNamespace);
      return;
    }
    if (["si", "t", "r", "rPh"].includes(tag.local) && tag.uri !== spreadsheetNamespace) {
      fail("Workbook shared strings namespace is invalid.");
    }
    if (tag.local === "si" && tag.uri === spreadsheetNamespace) {
      if (this.current !== null || parent?.local !== "sst" || parent.uri !== spreadsheetNamespace) {
        fail("Workbook shared strings are malformed.");
      }
      this.current = "";
      return;
    }
    if (tag.uri !== spreadsheetNamespace || !["t", "r", "rPh"].includes(tag.local)) return;
    if (this.current === null) fail("Workbook shared strings are malformed.");
    if (tag.local === "r" && (parent?.local !== "si" || parent.uri !== spreadsheetNamespace)) {
      fail("Workbook shared strings are malformed.");
    }
    if (tag.local === "rPh" && (parent?.local !== "si" || parent.uri !== spreadsheetNamespace)) {
      fail("Workbook shared strings are malformed.");
    }
    if (
      tag.local === "t" &&
      (parent?.uri !== spreadsheetNamespace || !["si", "r", "rPh"].includes(parent.local))
    ) {
      fail("Workbook shared strings are malformed.");
    }
  }

  text(value: string): void {
    const current = this.stack.at(-1);
    const insidePhonetic = this.stack.some((element) => element.local === "rPh" && element.uri === spreadsheetNamespace);
    if (this.current !== null && current?.local === "t" && current.uri === spreadsheetNamespace && !insidePhonetic) {
      this.current += value;
    } else if (value.trim()) {
      fail("Workbook shared strings are malformed.");
    }
  }

  close(tag: SaxesTagNS): void {
    if (tag.local === "si" && tag.uri === spreadsheetNamespace) {
      if (this.current === null) fail("Workbook shared strings are malformed.");
      this.strings.push(this.current);
      this.current = null;
    }
    this.stack.pop();
  }

  finish(): string[] {
    if (this.stack.length || this.current !== null) fail("Workbook shared strings are malformed.");
    return this.strings;
  }
}

class StylesMachine implements XmlMachine<number[]> {
  private readonly stack: Array<{ local: string; uri: string }> = [];
  private readonly numberFormatIds: number[] = [];
  private cellXfsElements = 0;

  open(tag: SaxesTagNS): void {
    const parent = this.stack.at(-1);
    this.stack.push({ local: tag.local, uri: tag.uri });
    if (this.stack.length === 1) {
      assertRoot(tag, "styleSheet", spreadsheetNamespace);
      return;
    }
    if (["cellXfs", "xf"].includes(tag.local) && tag.uri !== spreadsheetNamespace) {
      fail("Workbook styles namespace is invalid.");
    }
    if (tag.local === "cellXfs" && tag.uri === spreadsheetNamespace) {
      this.cellXfsElements += 1;
      if (this.cellXfsElements > 1 || parent?.local !== "styleSheet" || parent.uri !== spreadsheetNamespace) {
        fail("Workbook styles are malformed.");
      }
      return;
    }
    if (tag.local === "xf" && tag.uri === spreadsheetNamespace && parent?.local === "cellXfs" && parent.uri === spreadsheetNamespace) {
      const raw = attribute(tag, "numFmtId") ?? "0";
      if (!/^\d+$/.test(raw)) fail("Workbook cell style is invalid.");
      this.numberFormatIds.push(Number(raw));
    }
  }

  text(value: string): void {
    if (value.trim()) fail("Workbook styles are malformed.");
  }

  close(): void {
    this.stack.pop();
  }

  finish(): number[] {
    if (this.stack.length || this.cellXfsElements !== 1 || !this.numberFormatIds.length) fail("Workbook styles are incomplete.");
    return this.numberFormatIds;
  }
}

type WorksheetResult = {
  data: CellValue[][];
  formulaErrors: Map<number, ProductImportParseError[]>;
};

type CurrentCell = {
  reference: string;
  row: number;
  column: number;
  type: string | undefined;
  style: number | undefined;
  value: string;
  inline: string;
  valueElements: number;
  formulaElements: number;
};

const governedWorksheetElements = new Set(["worksheet", "dimension", "sheetData", "row", "c", "f", "v", "is", "t", "r", "rPh"]);

function columnNumber(letters: string): number {
  return [...letters].reduce((value, letter) => value * 26 + letter.charCodeAt(0) - 64, 0);
}

class WorksheetMachine implements XmlMachine<WorksheetResult> {
  private readonly stack: Array<{ local: string; uri: string }> = [];
  private readonly cells = new Map<number, Map<number, CellValue>>();
  private readonly cellReferences = new Set<string>();
  private readonly formulaErrors = new Map<number, ProductImportParseError[]>();
  private currentCell: CurrentCell | null = null;
  private dimensions = 0;
  private sheetDataElements = 0;

  constructor(
    private readonly sheetName: string,
    private readonly sharedStrings: readonly string[],
    private readonly numberFormatIds: readonly number[],
  ) {}

  open(tag: SaxesTagNS): void {
    const parent = this.stack.at(-1);
    this.stack.push({ local: tag.local, uri: tag.uri });
    if (this.stack.length === 1) {
      assertRoot(tag, "worksheet", spreadsheetNamespace);
      return;
    }
    if (governedWorksheetElements.has(tag.local) && tag.uri !== spreadsheetNamespace) {
      fail("Workbook worksheet evidence namespace is invalid.");
    }
    if (tag.uri !== spreadsheetNamespace) return;
    if (tag.local === "dimension") {
      if (parent?.local !== "worksheet" || parent.uri !== spreadsheetNamespace) fail("Workbook worksheet dimension is invalid.");
      this.dimensions += 1;
      if (this.dimensions > 1) fail("Workbook worksheet dimension is duplicated.");
      const reference = attribute(tag, "ref");
      const match = reference?.match(/^(?:[A-Z]+\d+:)?([A-Z]+)(\d+)$/i);
      if (!match) fail("Workbook worksheet dimension is invalid.");
      if (columnNumber(match[1]!.toUpperCase()) > PRODUCT_IMPORT_HEADERS.length || Number(match[2]) < 1 || Number(match[2]) > PRODUCT_IMPORT_LIMITS.rows + 1) {
        fail("Workbook contains more than 100 Product rows or dimensions exceed the Template V1 limit.");
      }
      return;
    }
    if (tag.local === "sheetData") {
      this.sheetDataElements += 1;
      if (this.sheetDataElements > 1 || parent?.local !== "worksheet" || parent.uri !== spreadsheetNamespace) {
        fail("Workbook worksheet topology is invalid.");
      }
      return;
    }
    if (tag.local === "row") {
      if (parent?.local !== "sheetData" || parent.uri !== spreadsheetNamespace) fail("Workbook worksheet row topology is invalid.");
      const row = attribute(tag, "r");
      if (row !== undefined && (!/^\d+$/.test(row) || Number(row) < 1 || Number(row) > PRODUCT_IMPORT_LIMITS.rows + 1)) {
        fail("Workbook contains more than 100 Product rows or dimensions exceed the Template V1 limit.");
      }
      return;
    }
    if (tag.local === "c") {
      if (this.currentCell || parent?.local !== "row" || parent.uri !== spreadsheetNamespace) fail("Workbook cell identity is invalid.");
      const reference = attribute(tag, "r");
      const match = reference?.match(/^([A-Z]+)(\d+)$/i);
      if (!match) fail("Workbook cell identity is invalid.");
      const column = columnNumber(match[1]!.toUpperCase());
      const row = Number(match[2]);
      if (column > PRODUCT_IMPORT_HEADERS.length || row < 1 || row > PRODUCT_IMPORT_LIMITS.rows + 1) {
        fail("Workbook contains more than 100 Product rows or dimensions exceed the Template V1 limit.");
      }
      const normalizedReference = `${match[1]!.toUpperCase()}${row}`;
      if (this.cellReferences.has(normalizedReference)) fail("Workbook cell identity is duplicated.");
      this.cellReferences.add(normalizedReference);
      const styleRaw = attribute(tag, "s");
      const style = styleRaw === undefined ? undefined : Number(styleRaw);
      if (styleRaw !== undefined && (!/^\d+$/.test(styleRaw) || !Number.isSafeInteger(style) || style! >= this.numberFormatIds.length)) {
        fail("Workbook cell style is invalid or unsupported.");
      }
      this.currentCell = {
        reference: normalizedReference,
        row,
        column,
        type: attribute(tag, "t"),
        style,
        value: "",
        inline: "",
        valueElements: 0,
        formulaElements: 0,
      };
      return;
    }
    if (["f", "v", "is", "t", "r", "rPh"].includes(tag.local) && !this.currentCell) {
      if (tag.local === "f") fail("Workbook formula evidence could not be attributed safely.");
      fail("Workbook cell topology is invalid.");
    }
    if (!this.currentCell) return;
    if (["f", "v", "is"].includes(tag.local) && (parent?.local !== "c" || parent.uri !== spreadsheetNamespace)) {
      fail("Workbook cell topology is invalid.");
    }
    if (tag.local === "r" && (parent?.local !== "is" || parent.uri !== spreadsheetNamespace)) {
      fail("Workbook cell topology is invalid.");
    }
    if (tag.local === "rPh" && (parent?.local !== "is" || parent.uri !== spreadsheetNamespace)) {
      fail("Workbook cell topology is invalid.");
    }
    if (
      tag.local === "t" &&
      (parent?.uri !== spreadsheetNamespace || !["is", "r", "rPh"].includes(parent.local))
    ) {
      fail("Workbook cell topology is invalid.");
    }
    if (tag.local === "v") {
      this.currentCell.valueElements += 1;
      if (this.currentCell.valueElements > 1) fail("Workbook cell value is duplicated.");
    } else if (tag.local === "f") {
      this.currentCell.formulaElements += 1;
      if (this.currentCell.formulaElements > 1) fail("Workbook formula evidence is duplicated.");
    }
  }

  text(value: string): void {
    const current = this.stack.at(-1);
    if (this.currentCell && current?.uri === spreadsheetNamespace && current.local === "v") {
      this.currentCell.value += value;
      return;
    }
    const insideInline = this.stack.some((element) => element.local === "is" && element.uri === spreadsheetNamespace);
    const insidePhonetic = this.stack.some((element) => element.local === "rPh" && element.uri === spreadsheetNamespace);
    if (this.currentCell && insideInline && !insidePhonetic && current?.uri === spreadsheetNamespace && current.local === "t") {
      this.currentCell.inline += value;
      return;
    }
    if (this.currentCell && current?.uri === spreadsheetNamespace && current.local === "f") return;
    if (value.trim()) fail("Workbook worksheet contains unsupported text.");
  }

  close(tag: SaxesTagNS): void {
    if (tag.local === "c" && tag.uri === spreadsheetNamespace) this.finishCell();
    this.stack.pop();
  }

  finish(): WorksheetResult {
    if (this.stack.length || this.currentCell || this.sheetDataElements !== 1) fail("Workbook worksheet topology is incomplete.");
    const maximumRow = Math.max(0, ...this.cells.keys(), ...this.formulaErrors.keys());
    const data = Array.from({ length: maximumRow }, (_, rowIndex) => {
      const row = this.cells.get(rowIndex + 1);
      const maximumColumn = row ? Math.max(0, ...row.keys()) : 0;
      return Array.from({ length: maximumColumn }, (_, columnIndex) => row?.get(columnIndex + 1) ?? null);
    });
    return { data, formulaErrors: this.formulaErrors };
  }

  private finishCell(): void {
    const cell = this.currentCell;
    if (!cell) fail("Workbook cell topology is invalid.");
    this.currentCell = null;
    if (cell.formulaElements) {
      if (this.sheetName !== "Products") fail(`Formula cell ${cell.reference} is not accepted.`);
      const errors = this.formulaErrors.get(cell.row) ?? [];
      errors.push({
        rowNumber: cell.row,
        column: null,
        code: "formula_not_allowed",
        detail: `Formula cell ${cell.reference} is not accepted.`,
      });
      this.formulaErrors.set(cell.row, errors);
      return;
    }
    const value = this.parseCellValue(cell);
    const row = this.cells.get(cell.row) ?? new Map<number, CellValue>();
    row.set(cell.column, value);
    this.cells.set(cell.row, row);
  }

  private parseCellValue(cell: CurrentCell): CellValue {
    const type = cell.type ?? "n";
    if (cell.style !== undefined && this.numberFormatIds[cell.style] !== 0 && (type === "n" || cell.type === undefined)) {
      fail("Workbook date or formatted numeric cell style is unsupported.");
    }
    if (type === "s") {
      if (!/^\d+$/.test(cell.value)) fail("Workbook shared string index is invalid.");
      const index = Number(cell.value);
      if (index >= this.sharedStrings.length) fail("Workbook shared string index is out of bounds.");
      return this.sharedStrings[index]!.trim() || null;
    }
    if (type === "inlineStr") return cell.inline.trim() || null;
    if (type === "str") return cell.value.trim() || null;
    if (type === "b") {
      if (cell.value === "1") return true;
      if (cell.value === "0") return false;
      fail("Workbook boolean cell value is unsupported.");
    }
    if (type === "z") return null;
    if (type === "d" || type === "e") fail("Workbook date or error cell type is unsupported.");
    if (type !== "n") fail("Workbook cell type is unsupported.");
    if (!cell.valueElements) return null;
    if (cell.value === "") return null;
    const value = Number(cell.value);
    if (!Number.isFinite(value)) fail("Workbook numeric cell value is invalid.");
    return value;
  }
}

class ResourceOnlyMachine implements XmlMachine<void> {
  private depth = 0;
  open(): void { this.depth += 1; }
  text(): void {}
  close(): void { this.depth -= 1; }
  finish(): void {
    if (this.depth !== 0) fail("Workbook package XML topology or namespace is invalid.");
  }
}

export function parseWorkbookXmlResourceFixture(parts: readonly (Uint8Array | readonly Uint8Array[])[]): void {
  const budget = new WorkbookXmlResourceBudget(fail);
  for (const part of parts) {
    const parser = new BoundedXmlParser(budget, new ResourceOnlyMachine());
    const chunks = part instanceof Uint8Array ? [part] : part;
    for (const chunk of chunks) parser.write(chunk);
    parser.close();
  }
}

async function parseEntry<Result>(entry: FileEntry, budget: WorkbookXmlResourceBudget, machine: XmlMachine<Result>): Promise<Result> {
  const writer = new XmlEntryWriter(budget, machine);
  try {
    return await entry.getData(writer, { checkSignature: true });
  } catch (error) {
    if (writer.failure) throw writer.failure;
    throw error;
  }
}

function resolveWorkbookTarget(target: string): string {
  if (!target || target.includes("\\") || target.includes("?") || target.includes("#") || target.includes("%") || /[\u0000-\u001f]/.test(target)) {
    fail("Workbook relationship target is unsafe.");
  }
  const segments = (target.startsWith("/") ? target.slice(1) : `xl/${target}`).split("/");
  const resolved: string[] = [];
  for (const segment of segments) {
    if (!segment || segment === ".") continue;
    if (segment === "..") {
      if (!resolved.length) fail("Workbook relationship target escaped the package.");
      resolved.pop();
    } else if (segment.includes(":")) {
      fail("Workbook relationship target is unsafe.");
    } else {
      resolved.push(segment);
    }
  }
  return resolved.join("/");
}

export type ResolvedTemplateV1Workbook = {
  products: WorksheetResult;
  metadata: WorksheetResult;
};

export async function readResolvedTemplateV1Workbook(bytes: Uint8Array): Promise<ResolvedTemplateV1Workbook> {
  const reader = new ZipReader(new Uint8ArrayReader(bytes), { checkSignature: true });
  try {
    const zipEntries = await reader.getEntries();
    if (zipEntries.length > PRODUCT_IMPORT_LIMITS.workbookEntries) fail("Workbook contains too many package entries.");
    const entries = new Map<string, FileEntry>();
    let expanded = 0;
    for (const entry of zipEntries) {
      if (entry.encrypted) fail("Encrypted workbooks are not accepted.");
      const name = entry.filename.normalize("NFC");
      if (name.startsWith("/") || name.includes("..") || name.includes("\\") || /\u0000/.test(name)) {
        fail("Workbook package path is unsafe.");
      }
      if (!entry.directory) {
        if (entries.has(name)) fail("Workbook package contains a duplicate part.");
        entries.set(name, entry as FileEntry);
      }
      if (/vbaProject\.bin$/i.test(name) || /^xl\/externalLinks\//.test(name)) {
        fail("Macros and external workbook links are not accepted.");
      }
      expanded += entry.uncompressedSize;
      if (expanded > PRODUCT_IMPORT_LIMITS.workbookExpandedBytes) fail("Workbook expanded size exceeds the limit.");
    }

    const contentTypesEntry = entries.get("[Content_Types].xml");
    const workbookEntry = entries.get("xl/workbook.xml");
    const workbookRelationshipsEntry = entries.get("xl/_rels/workbook.xml.rels");
    if (!contentTypesEntry || !workbookEntry || !workbookRelationshipsEntry) fail("Workbook package topology is incomplete.");

    const budget = new WorkbookXmlResourceBudget(fail);
    const contentTypes = await parseEntry(contentTypesEntry, budget, new ContentTypesMachine());
    for (const [extension, contentType] of contentTypes.defaults) {
      if (requiredDefaultContentTypes.get(extension) !== contentType) {
        fail("Workbook default content type declaration is unsupported or invalid.");
      }
    }
    if (
      contentTypes.defaults.size !== requiredDefaultContentTypes.size ||
      [...requiredDefaultContentTypes].some(([extension, contentType]) => contentTypes.defaults.get(extension) !== contentType)
    ) {
      fail("Workbook default content type declarations are incomplete.");
    }
    for (const [part, contentType] of requiredFixedOverrideContentTypes) {
      if (!entries.has(part) || contentTypes.overrides.get(part) !== contentType) {
        fail("Workbook fixed content type declaration is missing or invalid.");
      }
    }

    const relationshipParts = [...entries.entries()]
      .filter(([name]) => name.endsWith(".rels"))
      .sort(([left], [right]) => left.localeCompare(right));
    const relationshipsByPart = new Map<string, Relationship[]>();
    for (const [name, entry] of relationshipParts) {
      const relationships = await parseEntry(entry, budget, new RelationshipsMachine());
      if (relationships.some((relationship) => relationship.targetMode === "External")) {
        fail("External workbook links are not accepted.");
      }
      relationshipsByPart.set(name, relationships);
    }

    const workbookRelationships = relationshipsByPart.get("xl/_rels/workbook.xml.rels");
    if (!workbookRelationships?.length) fail("Workbook relationships are missing.");
    const relationshipById = new Map<string, Relationship & { part: string }>();
    const relationshipIdByPart = new Map<string, string>();
    for (const relationship of workbookRelationships) {
      if (relationshipById.has(relationship.id)) fail("Workbook relationship ID is duplicated.");
      if (![worksheetRelationshipType, sharedStringsRelationshipType, stylesRelationshipType].includes(relationship.type)) {
        fail("Workbook worksheet relationship type is unsupported.");
      }
      const part = resolveWorkbookTarget(relationship.target);
      if (relationship.type === worksheetRelationshipType && !/^xl\/worksheets\/[A-Za-z0-9._-]+\.xml$/.test(part)) {
        fail("Workbook relationship does not reference a legal worksheet part.");
      }
      if (relationshipIdByPart.has(part)) fail("Workbook worksheet relationship target is duplicated.");
      relationshipIdByPart.set(part, relationship.id);
      relationshipById.set(relationship.id, { ...relationship, part });
    }

    const sharedStringsRelationship = workbookRelationships.find((relationship) => relationship.type === sharedStringsRelationshipType);
    const stylesRelationship = workbookRelationships.find((relationship) => relationship.type === stylesRelationshipType);
    if (
      !sharedStringsRelationship || resolveWorkbookTarget(sharedStringsRelationship.target) !== "xl/sharedStrings.xml" ||
      !stylesRelationship || resolveWorkbookTarget(stylesRelationship.target) !== "xl/styles.xml"
    ) {
      fail("Workbook fixed relationships are missing or invalid.");
    }

    const workbookSheets = await parseEntry(workbookEntry, budget, new WorkbookMachine());
    if (workbookSheets.length !== 2 || !workbookSheets.some((sheet) => sheet.name === "Products") || !workbookSheets.some((sheet) => sheet.name === "_CWT_META")) {
      fail("Workbook must contain only the generated Template V1 Products and metadata sheets.");
    }
    const usedWorksheetRelationships = new Set<string>();
    const resolvedSheets = new Map<string, string>();
    for (const sheet of workbookSheets) {
      const relationship = relationshipById.get(sheet.relationshipId);
      if (!relationship || relationship.type !== worksheetRelationshipType) fail("Workbook worksheet relationship is missing or invalid.");
      if (!entries.has(relationship.part)) fail("Workbook worksheet part is missing or duplicated.");
      if (contentTypes.overrides.get(relationship.part) !== worksheetContentType) {
        fail("Workbook worksheet content type is missing or invalid.");
      }
      usedWorksheetRelationships.add(sheet.relationshipId);
      resolvedSheets.set(sheet.name, relationship.part);
    }
    const worksheetRelationships = [...relationshipById.values()].filter((relationship) => relationship.type === worksheetRelationshipType);
    if (worksheetRelationships.some((relationship) => !usedWorksheetRelationships.has(relationship.id))) {
      fail("Workbook contains an unreferenced worksheet relationship.");
    }
    const allowedContentTypeParts = new Set([
      ...requiredFixedOverrideContentTypes.keys(),
      ...worksheetRelationships.map((relationship) => relationship.part),
    ]);
    if (
      contentTypes.overrides.size !== allowedContentTypeParts.size ||
      [...contentTypes.overrides.keys()].some((part) => !allowedContentTypeParts.has(part))
    ) {
      fail("Workbook content type declaration is unreferenced or unsupported.");
    }
    const unreferencedWorksheet = [...entries.keys()].find((part) =>
      /^xl\/worksheets\/[^/]+\.xml$/i.test(part) && !new Set(resolvedSheets.values()).has(part),
    );
    if (unreferencedWorksheet) fail("Workbook contains an unreferenced worksheet part whose dimensions cannot be trusted.");

    const sharedStringsEntry = entries.get("xl/sharedStrings.xml")!;
    const stylesEntry = entries.get("xl/styles.xml")!;
    const sharedStrings = await parseEntry(sharedStringsEntry, budget, new SharedStringsMachine());
    const numberFormatIds = await parseEntry(stylesEntry, budget, new StylesMachine());
    const productsPart = resolvedSheets.get("Products")!;
    const metadataPart = resolvedSheets.get("_CWT_META")!;
    const products = await parseEntry(entries.get(productsPart)!, budget, new WorksheetMachine("Products", sharedStrings, numberFormatIds));
    const metadata = await parseEntry(entries.get(metadataPart)!, budget, new WorksheetMachine("_CWT_META", sharedStrings, numberFormatIds));
    return { products, metadata };
  } catch (error) {
    if (error instanceof WorkbookPackageParseError) throw error;
    fail("Workbook package could not be validated safely.");
  } finally {
    try {
      await reader.close();
    } catch {
      throw new WorkbookPackageParseError("Workbook package could not be validated safely.");
    }
  }
  throw new WorkbookPackageParseError("Workbook package could not be validated safely.");
}
