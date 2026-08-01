import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import type { PgQueryResultHKT } from "drizzle-orm/pg-core/session";

import { recordConversionEvent } from "@/analytics/conversion-service";
import { assertSameOrigin } from "@/auth/request-security";
import { env } from "@/config/env";
import {
  createInquiry,
  findInquiryReferenceByIdempotencyKey,
} from "@/crm/inquiry-service";
import { databaseConnection } from "@/db/client";
import type { AppDatabase } from "@/db/types";
import { createEmailNotifier } from "@/integrations/email";
import { normalizePath } from "@/seo/path";
import { publicUploadRateLimiter as limiter } from "@/uploads/rate-limit";
import {
  assertRequestLength,
  preBodyRateLimitKeys,
} from "@/uploads/request-guard";
import {
  releaseReservedInquiryUploadTokens,
  reserveInquiryUploadTokens,
} from "@/uploads/upload-intent-service";

const inputSchema = z
  .object({
    name: z.string().trim().min(1).max(120),
    email: z.email().max(254),
    countryCode: z.string().trim().max(2).nullable().optional(),
    whatsapp: z.string().trim().max(80).nullable().optional(),
    description: z.string().trim().max(5_000).nullable().optional(),
    uploadTokens: z.array(z.string().min(32).max(100)).max(env.MAX_FILES_PER_UPLOAD),
    sourcePagePath: z.string().max(500),
    landingPagePath: z.string().max(500).nullable().optional(),
    referrer: z.string().max(500).nullable().optional(),
    utmSource: z.string().max(100).nullable().optional(),
    utmMedium: z.string().max(100).nullable().optional(),
    utmCampaign: z.string().max(100).nullable().optional(),
    lastNonDirectSource: z.string().max(200).nullable().optional(),
    lastNonDirectMedium: z.string().max(100).nullable().optional(),
    lastNonDirectCampaign: z.string().max(100).nullable().optional(),
    attributionConfidence: z.enum(["high", "medium", "low", "unavailable"]),
    analyticsConsentState: z.enum(["unknown", "granted", "denied"]),
    anonymousSessionId: z.uuid(),
    idempotencyKey: z.string().min(16).max(200),
    website: z.string().max(200).nullable().optional(),
  })
  .strict();

async function withDatabase<TResult>(
  operation: <TQueryResult extends PgQueryResultHKT>(
    db: AppDatabase<TQueryResult>,
  ) => Promise<TResult>,
): Promise<TResult> {
  if (databaseConnection.kind === "pglite") return operation(databaseConnection.db);
  return operation(databaseConnection.db);
}

export async function POST(request: Request): Promise<NextResponse> {
  const requestId = randomUUID();
  let reservedIntentIds: string[] = [];
  try {
    assertSameOrigin(request);
    assertRequestLength(request, env.MAX_INQUIRY_JSON_BYTES, { required: true });
    for (const key of preBodyRateLimitKeys(request)) {
      if (!(await limiter.consume(key, "upload"))) {
        return NextResponse.json({ ok: false, error: "Try again later." }, { status: 429 });
      }
    }
    const input = inputSchema.parse(await request.json());
    if (request.headers.get("x-cwt-upload-session") !== input.anonymousSessionId) {
      return NextResponse.json({ ok: false, error: "Upload Session mismatch." }, { status: 403 });
    }
    const headerKey = request.headers.get("idempotency-key");
    if (headerKey !== input.idempotencyKey) {
      return NextResponse.json({ ok: false, error: "Idempotency Key mismatch." }, { status: 400 });
    }
    const existing = await withDatabase((db) =>
      findInquiryReferenceByIdempotencyKey(db, input.idempotencyKey),
    );
    if (existing) {
      return NextResponse.json({ ok: true, reference: existing.publicReference }, { status: 200 });
    }
    if (input.website) {
      return NextResponse.json({ ok: true, reference: `CWT-${requestId.slice(0, 8)}` }, { status: 202 });
    }
    if (!input.description && input.uploadTokens.length === 0) {
      return NextResponse.json(
        { ok: false, error: "Provide a description or upload an image." },
        { status: 400 },
      );
    }
    const reserved = await withDatabase((db) =>
      reserveInquiryUploadTokens(db, input.anonymousSessionId, input.uploadTokens),
    );
    reservedIntentIds = reserved.intentIds;
    const sourcePagePath = normalizePath(input.sourcePagePath);
    const landingPagePath = input.landingPagePath
      ? normalizePath(input.landingPagePath)
      : null;
    const inquiryId = await withDatabase((db) =>
      createInquiry(db, createEmailNotifier(), {
        name: input.name,
        email: input.email,
        countryCode: input.countryCode || null,
        whatsapp: input.whatsapp || null,
        description: input.description || null,
        assetIds: reserved.assetIds,
        sourcePagePath,
        landingPagePath,
        referrer: input.referrer || null,
        utmSource: input.utmSource || null,
        utmMedium: input.utmMedium || null,
        utmCampaign: input.utmCampaign || null,
        lastNonDirectSource: input.lastNonDirectSource || null,
        lastNonDirectMedium: input.lastNonDirectMedium || null,
        lastNonDirectCampaign: input.lastNonDirectCampaign || null,
        attributionConfidence: input.attributionConfidence,
        analyticsConsentState: input.analyticsConsentState,
        sessionId: input.anonymousSessionId,
        requestId,
        idempotencyKey: input.idempotencyKey,
        reservedUploadIntentIds: reservedIntentIds,
      }),
    );
    const created = await withDatabase((db) =>
      findInquiryReferenceByIdempotencyKey(db, input.idempotencyKey),
    );
    if (!created || created.id !== inquiryId) {
      throw new Error("Inquiry public reference could not be resolved.");
    }
    if (input.analyticsConsentState === "granted") {
      try {
        if (reserved.assetIds.length > 0) {
          await withDatabase((db) =>
            recordConversionEvent(db, {
              eventId: `image_upload:${created.publicReference}`,
              eventName: "image_upload_completed",
              anonymousSessionId: input.anonymousSessionId,
              routePath: sourcePagePath,
              consentState: "granted",
              safeProperties: { file_count: reserved.assetIds.length },
            }),
          );
        }
        await withDatabase((db) =>
          recordConversionEvent(db, {
            eventId: `inquiry_created:${created.publicReference}`,
            eventName: "inquiry_created",
            anonymousSessionId: input.anonymousSessionId,
            routePath: sourcePagePath,
            inquiryId,
            consentState: "granted",
            landingPagePath,
            referrerOrigin: input.referrer || null,
            utmSource: input.utmSource || null,
            utmMedium: input.utmMedium || null,
            utmCampaign: input.utmCampaign || null,
            lastNonDirectSource: input.lastNonDirectSource || null,
            lastNonDirectMedium: input.lastNonDirectMedium || null,
            lastNonDirectCampaign: input.lastNonDirectCampaign || null,
            attributionConfidence: input.attributionConfidence,
            submitSourcePagePath: sourcePagePath,
          }),
        );
      } catch {
        process.stderr.write(`[analytics-rejected] request ${requestId}; details omitted.\n`);
      }
    }
    return NextResponse.json({ ok: true, reference: created.publicReference }, { status: 201 });
  } catch (error) {
    if (reservedIntentIds.length) {
      try {
        await withDatabase((db) =>
          releaseReservedInquiryUploadTokens(db, reservedIntentIds),
        );
      } catch {
        process.stderr.write(`[upload-token-release-error] request ${requestId}.\n`);
      }
    }
    const raw = error instanceof Error ? error.message : "";
    const safe = /Name and Email|required|description|upload|Intent|Session|Idempotency|size|limit/i.test(raw)
      ? raw
      : "Inquiry could not be submitted. Please try again.";
    process.stderr.write(`[inquiry-error] request ${requestId}; details omitted.\n`);
    return NextResponse.json({ ok: false, error: safe }, { status: 400 });
  }
}
