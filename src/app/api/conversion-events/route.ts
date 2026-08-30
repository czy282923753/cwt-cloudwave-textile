import { NextResponse } from "next/server";
import { z } from "zod";

import { recordConversionEvent } from "@/analytics/conversion-service";
import { consentSessionIdFromRequest } from "@/analytics/consent-service";
import { assertSameOrigin } from "@/auth/request-security";
import { databaseConnection } from "@/db/client";
import { sharedRateLimiter as limiter } from "@/security/rate-limiter-factory";
import { trustedClientAddressFromRequest } from "@/security/trusted-client-address";

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
    const clientAddress = trustedClientAddressFromRequest(request);
    if (clientAddress.kind !== "trusted") {
      return NextResponse.json({ ok: true }, { status: 202 });
    }
    const input = eventSchema.parse(await request.json());
    const consentSessionId = consentSessionIdFromRequest(request);
    if (!consentSessionId) {
      return NextResponse.json({ ok: false }, { status: 403 });
    }
    const decision = await limiter.consume(`consent:${consentSessionId}:network:${clientAddress.address}`, "conversion");
    if (decision.kind === "limited") {
      return NextResponse.json({ ok: false }, { status: 429 });
    }
    if (decision.kind === "unavailable") {
      return NextResponse.json({ ok: true }, { status: 202 });
    }
    const conversionInput = {
      ...input,
      consentSessionId,
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
      const stored = await recordConversionEvent(databaseConnection.db, conversionInput);
      if (!stored) return NextResponse.json({ ok: false }, { status: 403 });
    } else {
      const stored = await recordConversionEvent(databaseConnection.db, conversionInput);
      if (!stored) return NextResponse.json({ ok: false }, { status: 403 });
    }
    return NextResponse.json({ ok: true }, { status: 202 });
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
}
