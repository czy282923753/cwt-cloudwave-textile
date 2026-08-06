import "server-only";

import writeExcelFile from "write-excel-file/node";

import {
  PRODUCT_IMPORT_HEADERS,
  PRODUCT_IMPORT_TEMPLATE_NAME,
  PRODUCT_IMPORT_TEMPLATE_VERSION,
} from "./contract";

export const PRODUCT_IMPORT_TEMPLATE_FILENAME = "CWT-Product-Import-Template-V1.xlsx";

export async function createProductImportTemplateV1(): Promise<Uint8Array> {
  const file = writeExcelFile([
    {
      sheet: "Products",
      data: [
        PRODUCT_IMPORT_HEADERS.map((value) => ({
          value,
          fontWeight: "bold" as const,
          backgroundColor: "#E2E8F0",
        })),
      ],
      columns: PRODUCT_IMPORT_HEADERS.map(() => ({ width: 24 })),
    },
    {
      sheet: "_CWT_META",
      data: [
        ["contract", PRODUCT_IMPORT_TEMPLATE_NAME],
        ["version", PRODUCT_IMPORT_TEMPLATE_VERSION],
      ],
      columns: [{ width: 18 }, { width: 44 }],
    },
  ]);
  return new Uint8Array(await file.toBuffer());
}

export async function createProductImportErrorExport(
  rows: readonly {
    rowNumber: number;
    productCode: string | null;
    errorCode: string;
    errorDetail: string;
  }[],
): Promise<Uint8Array> {
  const safe = (value: string): string => /^\s*[=+\-@]/.test(value) ? `'${value}` : value;
  const file = writeExcelFile([[
    "Row", "Product Code", "Error Code", "Safe Detail",
  ], ...rows.map((row) => [
    row.rowNumber,
    safe(row.productCode ?? ""),
    safe(row.errorCode),
    safe(row.errorDetail),
  ])], {
    sheet: "Row Errors",
    columns: [{ width: 10 }, { width: 26 }, { width: 28 }, { width: 72 }],
  });
  return new Uint8Array(await file.toBuffer());
}
