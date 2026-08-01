import { NextResponse } from "next/server";

import { assertSameOrigin } from "@/auth/request-security";
import { env } from "@/config/env";
import { databaseConnection } from "@/db/client";
import { createObjectStorage } from "@/storage";
import { publicUploadRateLimiter as limiter } from "@/uploads/rate-limit";
import {
  assertRequestLength,
  preBodyRateLimitKeys,
  readRequestBodyWithLimit,
} from "@/uploads/request-guard";
import { createFileScanner } from "@/uploads/scanner";
import {
  completeInquiryUploadIntent,
  inspectInquiryUploadIntentForRequest,
} from "@/uploads/upload-intent-service";


export async function PUT(
  request: Request,
  context: { params: Promise<{ token: string }> },
): Promise<NextResponse> {
  try {
    assertSameOrigin(request);
    assertRequestLength(request, env.MAX_INQUIRY_FILE_BYTES);
    for (const key of preBodyRateLimitKeys(request)) {
      if (!(await limiter.consume(key, "upload"))) {
        return NextResponse.json({ ok: false, error: "Try again later." }, { status: 429 });
      }
    }
    const anonymousSessionId = request.headers.get("x-cwt-upload-session") ?? "";
    const { token } = await context.params;
    const intent = databaseConnection.kind === "pglite"
      ? await inspectInquiryUploadIntentForRequest(databaseConnection.db, {
          token,
          anonymousSessionId,
        })
      : await inspectInquiryUploadIntentForRequest(databaseConnection.db, {
          token,
          anonymousSessionId,
        });
    assertRequestLength(request, env.MAX_INQUIRY_FILE_BYTES, {
      exact: intent.declaredByteSize,
    });
    const requestMimeType = request.headers.get("content-type")?.split(";", 1)[0]?.trim();
    if (requestMimeType !== intent.declaredMimeType) {
      throw new Error("Upload MIME does not match the Upload Intent.");
    }
    const bytes = await readRequestBodyWithLimit(request, intent.declaredByteSize);
    if (bytes.byteLength !== intent.declaredByteSize) {
      throw new Error("Actual upload bytes do not match the Upload Intent.");
    }
    const storage = createObjectStorage();
    const scanner = createFileScanner();
    const assetId = databaseConnection.kind === "pglite"
      ? await completeInquiryUploadIntent(databaseConnection.db, storage, scanner, {
          token,
          anonymousSessionId,
          bytes,
        })
      : await completeInquiryUploadIntent(databaseConnection.db, storage, scanner, {
          token,
          anonymousSessionId,
          bytes,
        });
    void assetId;
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error && /Content-Length|size|Intent|Session|MIME|File/.test(error.message)
      ? error.message
      : "Upload failed.";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
