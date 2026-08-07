import {
  PRODUCT_IMPORT_HEADERS,
  PRODUCT_IMPORT_LIMITS,
  PRODUCT_IMPORT_TEMPLATE_NAME,
  type ParsedProductImportWorkbook,
  type ProductImportHeader,
  type ProductImportParseError,
  type ProductImportRowInput,
} from "./contract";
import {
  readResolvedTemplateV1Workbook,
  WorkbookPackageParseError,
} from "./workbook-xml";

export class ProductImportWorkbookPackageError extends Error {
  readonly code = "invalid_workbook_package" as const;

  constructor(message: string) {
    super(message);
    this.name = "ProductImportWorkbookPackageError";
  }
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

export async function parseProductImportWorkbook(bytes: Uint8Array): Promise<ParsedProductImportWorkbook> {
  if (!bytes.byteLength || bytes.byteLength > PRODUCT_IMPORT_LIMITS.workbookBytes) {
    throw new ProductImportWorkbookPackageError("Workbook actual bytes exceed the Template V1 limit.");
  }
  if (bytes[0] !== 0x50 || bytes[1] !== 0x4b) {
    throw new ProductImportWorkbookPackageError("Only an XLSX ZIP container is accepted.");
  }

  let resolved: Awaited<ReturnType<typeof readResolvedTemplateV1Workbook>>;
  try {
    resolved = await readResolvedTemplateV1Workbook(bytes);
  } catch (error) {
    if (error instanceof ProductImportWorkbookPackageError) throw error;
    if (error instanceof WorkbookPackageParseError) {
      throw new ProductImportWorkbookPackageError(error.message);
    }
    throw new ProductImportWorkbookPackageError("Workbook package could not be validated safely.");
  }

  const { products, metadata } = resolved;
  if (
    metadata.data[0]?.[0] !== "contract" ||
    metadata.data[0]?.[1] !== PRODUCT_IMPORT_TEMPLATE_NAME ||
    metadata.data[1]?.[0] !== "version" ||
    metadata.data[1]?.[1] !== 1
  ) {
    throw new Error("Workbook Template V1 metadata is missing or unsupported.");
  }
  const header = products.data[0] ?? [];
  if (header.length !== PRODUCT_IMPORT_HEADERS.length || header.some((value, index) => value !== PRODUCT_IMPORT_HEADERS[index])) {
    throw new Error("Workbook headers must exactly match Template V1 in the approved order.");
  }

  const formulaErrors = products.formulaErrors;
  const maximumRowNumber = Math.max(products.data.length, ...formulaErrors.keys(), 1);
  const dataRows = Array.from({ length: maximumRowNumber - 1 }, (_, index) => ({
    row: products.data[index + 1] ?? [],
    rowNumber: index + 2,
  })).filter(({ row, rowNumber }) =>
    row.some((cell) => cell !== null && cell !== "") || formulaErrors.has(rowNumber),
  );
  if (dataRows.length > PRODUCT_IMPORT_LIMITS.rows) throw new Error("Workbook contains more than 100 Product rows.");
  const rows = dataRows.map(({ row, rowNumber }) => {
    const errors: ProductImportParseError[] = [...(formulaErrors.get(rowNumber) ?? [])];
    let input: ProductImportRowInput = {};
    try {
      input = parseRow(row);
    } catch (error) {
      errors.push({
        rowNumber,
        column: null,
        code: "invalid_cell",
        detail: error instanceof Error ? error.message : "Row value is invalid.",
      });
    }
    return { rowNumber, input, errors };
  });
  return { templateVersion: 1, rows, errors: [...(formulaErrors.get(1) ?? [])] };
}
