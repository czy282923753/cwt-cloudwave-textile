import { NextResponse } from "next/server";
import { z } from "zod";

import { adminActionHttpFailure } from "@/admin/action-result";
import { requireCurrentUser } from "@/auth/current-user";
import { assertSameOrigin } from "@/auth/request-security";
import { databaseConnection } from "@/db/client";
import { prepareProductImportBatch } from "@/imports/service";
import { assertRequestLength } from "@/uploads/request-guard";

const schema = z.object({
  mode: z.enum(["create", "update"]),
  workbookAssetId: z.uuid(),
  preparation: z.discriminatedUnion("kind", [
    z.object({ kind: z.literal("none") }).strict(),
    z.object({
      kind: z.literal("archive"),
      fileName: z.string().min(1).max(200),
      declaredMimeType: z.literal("application/zip"),
      declaredByteSize: z.number().int().positive().max(500 * 1024 * 1024),
    }).strict(),
    z.object({
      kind: z.literal("folder"),
      files: z.array(z.object({
        relativePath: z.string().min(1).max(240),
        fileName: z.string().min(1).max(200),
        declaredMimeType: z.enum(["image/jpeg", "image/png", "image/webp", "image/avif"]),
        declaredByteSize: z.number().int().positive().max(20 * 1024 * 1024),
      }).strict()).min(1).max(500),
    }).strict(),
  ]),
}).strict();

export async function POST(request: Request): Promise<NextResponse> {
  try {
    assertSameOrigin(request);
    assertRequestLength(request, 512 * 1024);
    const user = await requireCurrentUser("products.import");
    const input = schema.parse(await request.json());
    const actor = { userId: user.id, role: user.role, authSessionId: user.sessionId } as const;
    const batchId = databaseConnection.kind === "pglite"
      ? await prepareProductImportBatch(databaseConnection.db, actor, input)
      : await prepareProductImportBatch(databaseConnection.db, actor, input);
    return NextResponse.json({ ok: true, batchId }, { status: 201 });
  } catch (error) {
    const failure = adminActionHttpFailure(error);
    return NextResponse.json({ ok: false, error: failure.error, errorCode: failure.errorCode }, { status: failure.status });
  }
}
