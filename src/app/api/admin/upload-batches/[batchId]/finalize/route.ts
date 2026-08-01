import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireCurrentUser } from "@/auth/current-user";
import { assertSameOrigin } from "@/auth/request-security";
import { databaseConnection } from "@/db/client";
import { env } from "@/config/env";
import { createObjectStorage } from "@/storage";
import { finalizeAdminUploadBatch } from "@/uploads/admin-upload-service";
import { assertRequestLength } from "@/uploads/request-guard";

export async function POST(request: Request, context: { params: Promise<{ batchId: string }> }): Promise<NextResponse> {
  try {
    assertSameOrigin(request);
    assertRequestLength(request, env.MAX_UPLOAD_INTENT_JSON_BYTES);
    z.object({}).strict().parse(await request.json());
    const user = await requireCurrentUser("assets.write");
    const { batchId } = await context.params;
    const actor = { userId: user.id, role: user.role, authSessionId: user.sessionId } as const;
    const storage = createObjectStorage();
    const result = databaseConnection.kind === "pglite"
      ? await finalizeAdminUploadBatch(databaseConnection.db, storage, actor, batchId)
      : await finalizeAdminUploadBatch(databaseConnection.db, storage, actor, batchId);
    revalidatePath("/admin/assets");
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Admin Upload Batch could not be finalized.";
    const status = /Authentication|permission|session/.test(message) ? 403 : 400;
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}
