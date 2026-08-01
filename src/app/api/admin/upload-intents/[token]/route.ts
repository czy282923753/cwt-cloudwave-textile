import { NextResponse } from "next/server";

import { requireCurrentUser } from "@/auth/current-user";
import { assertSameOrigin } from "@/auth/request-security";
import { env } from "@/config/env";
import { databaseConnection } from "@/db/client";
import { createObjectStorage } from "@/storage";
import {
  completeAdminUploadIntent,
  inspectAdminUploadIntent,
} from "@/uploads/admin-upload-service";
import { assertRequestLength, readRequestBodyWithLimit } from "@/uploads/request-guard";
import { createFileScanner } from "@/uploads/scanner";

export async function PUT(request: Request, context: { params: Promise<{ token: string }> }): Promise<NextResponse> {
  try {
    assertSameOrigin(request);
    assertRequestLength(request, env.MAX_PUBLIC_FILE_BYTES);
    const user = await requireCurrentUser("assets.write");
    const actor = { userId: user.id, role: user.role, authSessionId: user.sessionId } as const;
    const { token } = await context.params;
    const intent = databaseConnection.kind === "pglite"
      ? await inspectAdminUploadIntent(databaseConnection.db, actor, token)
      : await inspectAdminUploadIntent(databaseConnection.db, actor, token);
    assertRequestLength(request, env.MAX_PUBLIC_FILE_BYTES, { exact: intent.declaredByteSize });
    const mime = request.headers.get("content-type")?.split(";", 1)[0]?.trim();
    if (mime !== intent.declaredMimeType) throw new Error("Upload MIME does not match the Admin Upload Intent.");
    const bytes = await readRequestBodyWithLimit(request, intent.declaredByteSize);
    if (bytes.byteLength !== intent.declaredByteSize) throw new Error("Actual upload bytes do not match the Admin Upload Intent.");
    const storage = createObjectStorage();
    const scanner = createFileScanner();
    const assetId = databaseConnection.kind === "pglite"
      ? await completeAdminUploadIntent(databaseConnection.db, storage, scanner, actor, { token, bytes })
      : await completeAdminUploadIntent(databaseConnection.db, storage, scanner, actor, { token, bytes });
    return NextResponse.json({ ok: true, assetId }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Admin upload failed.";
    const status = /Authentication|permission|session/.test(message) ? 403 : 400;
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}
