import { NextResponse } from "next/server";
import { z } from "zod";

import {
  analyticsConsentCookieOptions,
  consentSessionIdFromRequest,
  ensurePersistedConsent,
  updatePersistedConsent,
} from "@/analytics/consent-service";
import { assertSameOrigin } from "@/auth/request-security";
import { env } from "@/config/env";
import { databaseConnection } from "@/db/client";

async function ensure(request: Request) {
  const requested = consentSessionIdFromRequest(request);
  return databaseConnection.kind === "pglite"
    ? ensurePersistedConsent(databaseConnection.db, requested)
    : ensurePersistedConsent(databaseConnection.db, requested);
}

function responseFor(consent: Awaited<ReturnType<typeof ensure>>["consent"]) {
  return {
    status: consent.status,
    consentVersion: consent.consentVersion,
    grantedAt: consent.grantedAt,
    revokedAt: consent.revokedAt,
    updatedAt: consent.updatedAt,
  };
}

export async function GET(request: Request): Promise<NextResponse> {
  const result = await ensure(request);
  const response = NextResponse.json(responseFor(result.consent));
  if (result.created) {
    response.cookies.set(
      env.ANALYTICS_CONSENT_COOKIE_NAME,
      result.consent.consentSessionId,
      analyticsConsentCookieOptions(),
    );
  }
  return response;
}

const updateSchema = z
  .object({
    status: z.enum(["granted", "denied", "revoked"]),
    expectedVersion: z.number().int().min(0),
  })
  .strict();

export async function POST(request: Request): Promise<NextResponse> {
  try {
    assertSameOrigin(request);
    const result = await ensure(request);
    const input = updateSchema.parse(await request.json());
    const consent = databaseConnection.kind === "pglite"
      ? await updatePersistedConsent(
          databaseConnection.db,
          result.consent.consentSessionId,
          input.status,
          input.expectedVersion,
        )
      : await updatePersistedConsent(
          databaseConnection.db,
          result.consent.consentSessionId,
          input.status,
          input.expectedVersion,
        );
    const response = NextResponse.json(responseFor(consent));
    if (result.created) {
      response.cookies.set(
        env.ANALYTICS_CONSENT_COOKIE_NAME,
        consent.consentSessionId,
        analyticsConsentCookieOptions(),
      );
    }
    return response;
  } catch {
    return NextResponse.json({ ok: false }, { status: 409 });
  }
}
