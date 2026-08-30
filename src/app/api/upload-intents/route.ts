import { NextResponse } from "next/server";
import { z } from "zod";

import { assertSameOrigin } from "@/auth/request-security";
import { env } from "@/config/env";
import { databaseConnection } from "@/db/client";
import { sharedRateLimiter as limiter } from "@/security/rate-limiter-factory";
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
    const rateLimitKeys = preBodyRateLimitKeys(request);
    if (rateLimitKeys === null) {
      return NextResponse.json({ ok: false, error: "Try again later." }, { status: 503 });
    }
    for (const key of rateLimitKeys) {
      const decision = await limiter.consume(key, "upload");
      if (decision.kind === "limited") {
        return NextResponse.json({ ok: false, error: "Try again later." }, { status: 429 });
      }
      if (decision.kind === "unavailable") {
        return NextResponse.json({ ok: false, error: "Try again later." }, { status: 503 });
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
