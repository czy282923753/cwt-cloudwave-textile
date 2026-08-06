import { NextResponse } from "next/server";

import { adminActionHttpFailure } from "@/admin/action-result";
import { requireCurrentUser } from "@/auth/current-user";
import { createProductImportTemplateV1, PRODUCT_IMPORT_TEMPLATE_FILENAME } from "@/imports/template";

export async function GET(): Promise<NextResponse> {
  try {
    await requireCurrentUser("products.import");
    const bytes = await createProductImportTemplateV1();
    return new NextResponse(Buffer.from(bytes), {
      headers: {
        "cache-control": "private, no-store, max-age=0, must-revalidate",
        "content-disposition": `attachment; filename="${PRODUCT_IMPORT_TEMPLATE_FILENAME}"`,
        "content-type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "x-content-type-options": "nosniff",
      },
    });
  } catch (error) {
    const failure = adminActionHttpFailure(error);
    return NextResponse.json({ ok: false, error: failure.error, errorCode: failure.errorCode }, { status: failure.status });
  }
}
