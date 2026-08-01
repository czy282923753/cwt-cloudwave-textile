import { NextResponse } from "next/server";
import { z } from "zod";

import { recordConversionEvent } from "@/analytics/conversion-service";
import { assertSameOrigin } from "@/auth/request-security";
import { databaseConnection } from "@/db/client";

const eventSchema = z.object({
  eventName: z.enum([
    "product_view",
    "quote_cta_click",
    "whatsapp_click",
    "upload_started",
    "image_upload_completed",
    "quote_submit_success",
  ]),
  anonymousSessionId: z.uuid(),
  routePath: z.string().max(500),
  entityType: z.string().max(50).optional(),
  entityId: z.uuid().optional(),
  landingPagePath: z.string().max(500).optional(),
  referrerOrigin: z.string().max(200).optional(),
  utmSource: z.string().max(100).optional(),
  utmMedium: z.string().max(100).optional(),
  utmCampaign: z.string().max(100).optional(),
  safeProperties: z
    .record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()]))
    .optional(),
});

export async function POST(request: Request): Promise<NextResponse> {
  try {
    assertSameOrigin(request);
    const input = eventSchema.parse(await request.json());
    if (databaseConnection.kind === "pglite") {
      await recordConversionEvent(databaseConnection.db, input);
    } else {
      await recordConversionEvent(databaseConnection.db, input);
    }
    return NextResponse.json({ ok: true }, { status: 202 });
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
}
