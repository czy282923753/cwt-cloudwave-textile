export const PRODUCT_IMPORT_TEMPLATE_NAME = "CWT Product Import Template V1";
export const PRODUCT_IMPORT_TEMPLATE_VERSION = 1;

export const PRODUCT_IMPORT_HEADERS = [
  "Name",
  "Product Code",
  "Primary Category",
  "Additional Categories",
  "Applications",
  "Tags",
  "Composition",
  "GSM",
  "Width",
  "MOQ Value",
  "MOQ Unit",
  "MOQ Note",
  "Slug",
  "Summary",
  "Description",
  "Image Files",
  "Primary Image Alt",
  "Primary Image Caption",
] as const;

export type ProductImportHeader = (typeof PRODUCT_IMPORT_HEADERS)[number];
export type ProductImportMode = "create" | "update";

export const PRODUCT_IMPORT_LIMITS = Object.freeze({
  workbookBytes: 10 * 1024 * 1024,
  rows: 100,
  images: 500,
  imageBytes: 20 * 1024 * 1024,
  archiveBytes: 500 * 1024 * 1024,
  archiveExpandedBytes: 2 * 1024 * 1024 * 1024,
  archiveEntries: 750,
  archiveDirectories: 250,
  archivePathDepth: 8,
  archivePathBytes: 240,
  archiveExpansionRatio: 200,
  workbookEntries: 256,
  workbookExpandedBytes: 64 * 1024 * 1024,
});

export interface ProductImportRowInput {
  name?: string;
  productCode?: string;
  primaryCategory?: string;
  additionalCategories?: string[];
  applications?: string[];
  tags?: string[];
  composition?: string;
  gsm?: string;
  width?: string;
  moqValue?: string;
  moqUnit?: "m" | "kg" | "roll" | "yd";
  moqNote?: string;
  slug?: string;
  summary?: string;
  description?: string;
  imageFiles?: string[];
  primaryImageAlt?: string;
  primaryImageCaption?: string;
}

export interface ProductImportParseError {
  rowNumber: number | null;
  column: ProductImportHeader | null;
  code: string;
  detail: string;
}

export interface ParsedProductImportWorkbook {
  templateVersion: 1;
  rows: Array<{ rowNumber: number; input: ProductImportRowInput; errors: ProductImportParseError[] }>;
  errors: ProductImportParseError[];
}
