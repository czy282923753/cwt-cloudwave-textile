import { NextResponse } from "next/server";
import { z } from "zod";

import { assertSameOrigin } from "@/auth/request-security";
import { env } from "@/config/env";
import { databaseConnection } from "@/db/client";
import { publicUploadRateLimiter as limiter } from "@/uploads/rate-limit";
import {
  assertRequestLength,
  preBodyRateLimitKeys,
} from "@/uploads/request-guard";
import { createInquiryUploadIntent } from "@/uploads/upload-intent-service";

const inputSchema = z
  .object({
    anonymousSessionId: z.uuid(),
    fileName: z.string().min(1).max(200),
    declaredMimeType: z.enum(["image/jpeg", "image/png", "image/webp"]),
    declaredByteSize: z.number().int().positive(),
  })
  .strict();

export async function POST(request: Request): Promise<NextResponse> {
  try {
    assertSameOrigin(request);
    assertRequestLength(request, env.MAX_UPLOAD_INTENT_JSON_BYTES, { required: true });
    for (const key of preBodyRateLimitKeys(request)) {
      if (!(await limiter.consume(key, "upload"))) {
        return NextResponse.json({ ok: false, error: "Try again later." }, { status: 429 });
      }
    }
    const input = inputSchema.parse(await request.json());
    if (
      request.headers.get("x-cwt-upload-session") !== input.anonymousSessionId
    ) {
      return NextResponse.json({ ok: false, error: "Upload Session mismatch." }, { status: 403 });
    }
    const result = databaseConnection.kind === "pglite"
      ? await createInquiryUploadIntent(databaseConnection.db, input)
      : await createInquiryUploadIntent(databaseConnection.db, input);
    return NextResponse.json(
      {
        ok: true,
        token: result.token,
        uploadUrl: `/api/upload-intents/${encodeURIComponent(result.token)}/`,
        expiresAt: result.expiresAt.toISOString(),
      },
      { status: 201 },
    );
  } catch (error) {
    const message = error instanceof Error && /Content-Length|required|size|MIME|file name/.test(error.message)
      ? error.message
      : "Upload Intent could not be created.";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
