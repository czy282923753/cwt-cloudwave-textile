import { NextResponse } from "next/server";

import { adminActionHttpFailure } from "@/admin/action-result";
import { requireCurrentUser } from "@/auth/current-user";
import { databaseConnection } from "@/db/client";
import { getProductImportBatch } from "@/imports/service";
import { createProductImportErrorExport } from "@/imports/template";

export async function GET(_request: Request, context: { params: Promise<{ batchId: string }> }): Promise<NextResponse> {
  try {
    const user = await requireCurrentUser("products.import");
    const { batchId } = await context.params;
    const actor = { userId: user.id, role: user.role, authSessionId: user.sessionId } as const;
    const result = databaseConnection.kind === "pglite"
      ? await getProductImportBatch(databaseConnection.db, actor, batchId)
      : await getProductImportBatch(databaseConnection.db, actor, batchId);
    const rows = result.items.filter((item) => item.kind === "row" && item.status === "error").map((item) => ({
      rowNumber: item.rowNumber!,
      productCode: typeof (item.rawData as { productCode?: unknown }).productCode === "string" ? (item.rawData as { productCode: string }).productCode : null,
      errorCode: item.errorCode ?? "row_error",
      errorDetail: item.errorDetail ?? "Row could not be applied.",
    }));
    const bytes = await createProductImportErrorExport(rows);
    return new NextResponse(Buffer.from(bytes), { headers: {
      "cache-control": "private, no-store, max-age=0, must-revalidate",
      "content-disposition": `attachment; filename="CWT-Product-Import-${batchId}-Errors.xlsx"`,
      "content-type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "x-content-type-options": "nosniff",
    } });
  } catch (error) {
    const failure = adminActionHttpFailure(error);
    return NextResponse.json({ ok: false, error: failure.error, errorCode: failure.errorCode }, { status: failure.status });
  }
}
