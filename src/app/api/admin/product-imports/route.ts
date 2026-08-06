import { NextResponse } from "next/server";
import { z } from "zod";

import { adminActionHttpFailure } from "@/admin/action-result";
import { requireCurrentUser } from "@/auth/current-user";
import { assertSameOrigin } from "@/auth/request-security";
import { databaseConnection } from "@/db/client";
import { createValidatedProductImport } from "@/imports/service";
import { createObjectStorage } from "@/storage";
import { assertRequestLength } from "@/uploads/request-guard";

const schema = z.object({
  mode: z.enum(["create", "update"]),
  workbookAssetId: z.uuid(),
  mediaPackageAssetId: z.uuid().nullable().optional(),
  media: z.array(z.object({
    assetId: z.uuid(),
    uploadBatchId: z.uuid(),
    relativePath: z.string().min(1).max(240),
    sha256: z.string().regex(/^[0-9a-f]{64}$/),
  }).strict()).max(500),
}).strict();

export async function POST(request: Request): Promise<NextResponse> {
  try {
    assertSameOrigin(request);
    assertRequestLength(request, 512 * 1024);
    const user = await requireCurrentUser("products.import");
    const input = schema.parse(await request.json());
    const command = {
      mode: input.mode,
      workbookAssetId: input.workbookAssetId,
      media: input.media,
      ...(input.mediaPackageAssetId !== undefined ? { mediaPackageAssetId: input.mediaPackageAssetId } : {}),
    };
    const actor = { userId: user.id, role: user.role, authSessionId: user.sessionId } as const;
    const batchId = databaseConnection.kind === "pglite"
      ? await createValidatedProductImport(databaseConnection.db, createObjectStorage(), actor, command)
      : await createValidatedProductImport(databaseConnection.db, createObjectStorage(), actor, command);
    return NextResponse.json({ ok: true, batchId }, { status: 201 });
  } catch (error) {
    const failure = adminActionHttpFailure(error);
    return NextResponse.json({ ok: false, error: failure.error, errorCode: failure.errorCode }, { status: failure.status });
  }
}
