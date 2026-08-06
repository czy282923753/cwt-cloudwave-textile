import { NextResponse } from "next/server";

import { adminActionHttpFailure } from "@/admin/action-result";
import { requireCurrentUser } from "@/auth/current-user";
import { assertSameOrigin } from "@/auth/request-security";
import { databaseConnection } from "@/db/client";
import { applyProductImportBatch } from "@/imports/service";

export async function POST(request: Request, context: { params: Promise<{ batchId: string }> }): Promise<NextResponse> {
  try {
    assertSameOrigin(request);
    const user = await requireCurrentUser("products.import");
    const { batchId } = await context.params;
    const actor = { userId: user.id, role: user.role, authSessionId: user.sessionId } as const;
    if (databaseConnection.kind === "pglite") await applyProductImportBatch(databaseConnection.db, actor, batchId);
    else await applyProductImportBatch(databaseConnection.db, actor, batchId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const failure = adminActionHttpFailure(error);
    return NextResponse.json({ ok: false, error: failure.error, errorCode: failure.errorCode }, { status: failure.status });
  }
}
