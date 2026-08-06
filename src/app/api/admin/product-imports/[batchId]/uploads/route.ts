import { NextResponse } from "next/server";
import { z } from "zod";

import { adminActionHttpFailure } from "@/admin/action-result";
import { requireCurrentUser } from "@/auth/current-user";
import { assertSameOrigin } from "@/auth/request-security";
import { databaseConnection } from "@/db/client";
import { createProductImportUploadBatch } from "@/uploads/admin-upload-service";
import { assertRequestLength } from "@/uploads/request-guard";

const schema = z.object({
  kind: z.enum(["folder_media", "archive_package"]),
  relativePath: z.string().min(1).max(240).optional(),
  fileName: z.string().min(1).max(200),
  declaredMimeType: z.string().min(1).max(100),
  declaredByteSize: z.number().int().positive(),
}).strict();

export async function POST(request: Request, context: { params: Promise<{ batchId: string }> }): Promise<NextResponse> {
  try {
    assertSameOrigin(request);
    assertRequestLength(request, 64 * 1024);
    const user = await requireCurrentUser("products.import");
    const { batchId } = await context.params;
    const input = schema.parse(await request.json());
    const actor = { userId: user.id, role: user.role, authSessionId: user.sessionId } as const;
    const command = {
      productImportBatchId: batchId,
      kind: input.kind,
      ...(input.relativePath !== undefined ? { relativePath: input.relativePath } : {}),
      fileName: input.fileName,
      declaredMimeType: input.declaredMimeType,
      declaredByteSize: input.declaredByteSize,
    };
    const result = databaseConnection.kind === "pglite"
      ? await createProductImportUploadBatch(databaseConnection.db, actor, command)
      : await createProductImportUploadBatch(databaseConnection.db, actor, command);
    return NextResponse.json({ ok: true, ...result, expiresAt: result.expiresAt.toISOString() }, { status: 201 });
  } catch (error) {
    const failure = adminActionHttpFailure(error);
    return NextResponse.json({ ok: false, error: failure.error, errorCode: failure.errorCode }, { status: failure.status });
  }
}
