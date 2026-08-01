import { NextResponse } from "next/server";
import { z } from "zod";
import { createHash } from "node:crypto";

import { recordConversionEvent } from "@/analytics/conversion-service";
import { assertSameOrigin } from "@/auth/request-security";
import { databaseConnection } from "@/db/client";
import { createUploadRateLimiter } from "@/uploads/rate-limit";

const limiter = createUploadRateLimiter();

const eventSchema = z.object({
  eventId: z.string().min(16).max(128),
  eventName: z.enum([
    "product_view",
    "quote_cta_click",
    "whatsapp_click",
    "upload_started",
    "image_upload_completed",
    "quote_submit_success",
  ]),
  anonymousSessionId: z.uuid(),
  consentState: z.literal("granted"),
  routePath: z.string().max(500),
  entityType: z.enum(["product", "application", "fabric_entry", "content"]).optional(),
  entityPath: z.string().max(500).optional(),
  landingPagePath: z.string().max(500).optional(),
  referrerOrigin: z.string().max(200).optional(),
  utmSource: z.string().max(100).optional(),
  utmMedium: z.string().max(100).optional(),
  utmCampaign: z.string().max(100).optional(),
  lastNonDirectSource: z.string().max(200).optional(),
  lastNonDirectMedium: z.string().max(100).optional(),
  lastNonDirectCampaign: z.string().max(100).optional(),
  attributionConfidence: z.enum(["high", "medium", "low", "unavailable"]).optional(),
  submitSourcePagePath: z.string().max(500).optional(),
  safeProperties: z
    .record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()]))
    .optional(),
}).strict();

export async function POST(request: Request): Promise<NextResponse> {
  try {
    assertSameOrigin(request);
    const input = eventSchema.parse(await request.json());
    const rateKey = createHash("sha256")
      .update(`${input.anonymousSessionId}:${request.headers.get("user-agent") ?? "unknown"}`)
      .digest("hex");
    if (!(await limiter.consume(rateKey, "conversion"))) {
      return NextResponse.json({ ok: false }, { status: 429 });
    }
    const conversionInput = {
      ...input,
      entityType: input.entityType ?? null,
      entityPath: input.entityPath ?? null,
      landingPagePath: input.landingPagePath ?? null,
      referrerOrigin: input.referrerOrigin ?? null,
      utmSource: input.utmSource ?? null,
      utmMedium: input.utmMedium ?? null,
      utmCampaign: input.utmCampaign ?? null,
      lastNonDirectSource: input.lastNonDirectSource ?? null,
      lastNonDirectMedium: input.lastNonDirectMedium ?? null,
      lastNonDirectCampaign: input.lastNonDirectCampaign ?? null,
      submitSourcePagePath: input.submitSourcePagePath ?? null,
      safeProperties: input.safeProperties ?? {},
    };
    if (databaseConnection.kind === "pglite") {
      await recordConversionEvent(databaseConnection.db, conversionInput);
    } else {
      await recordConversionEvent(databaseConnection.db, conversionInput);
    }
    return NextResponse.json({ ok: true }, { status: 202 });
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
}
