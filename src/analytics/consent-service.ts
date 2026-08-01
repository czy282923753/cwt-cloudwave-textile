import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import type { PgQueryResultHKT } from "drizzle-orm/pg-core/session";

import { env } from "@/config/env";
import { analyticsConsents } from "@/db/schema";
import type { AppDatabase } from "@/db/types";

export type PersistedConsentStatus =
  | "unknown"
  | "granted"
  | "denied"
  | "revoked";

export interface PersistedConsent {
  consentSessionId: string;
  status: PersistedConsentStatus;
  consentVersion: number;
  grantedAt: Date | null;
  revokedAt: Date | null;
  updatedAt: Date;
}

function requestCookie(request: Request, name: string): string | null {
  const cookie = request.headers.get("cookie");
  if (!cookie) return null;
  for (const pair of cookie.split(";")) {
    const [rawName, ...rawValue] = pair.trim().split("=");
    if (rawName === name) return decodeURIComponent(rawValue.join("="));
  }
  return null;
}

function validConsentSessionId(value: string | null): value is string {
  return Boolean(
    value &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        value,
      ),
  );
}

export function consentSessionIdFromRequest(request: Request): string | null {
  const value = requestCookie(request, env.ANALYTICS_CONSENT_COOKIE_NAME);
  return validConsentSessionId(value) ? value : null;
}

export async function findPersistedConsent<
  TQueryResult extends PgQueryResultHKT,
>(
  db: AppDatabase<TQueryResult>,
  consentSessionId: string | null,
): Promise<PersistedConsent | null> {
  if (!validConsentSessionId(consentSessionId)) return null;
  const rows = await db
    .select()
    .from(analyticsConsents)
    .where(eq(analyticsConsents.consentSessionId, consentSessionId))
    .limit(1);
  return rows[0] ?? null;
}

export async function ensurePersistedConsent<
  TQueryResult extends PgQueryResultHKT,
>(
  db: AppDatabase<TQueryResult>,
  requestedSessionId: string | null,
): Promise<{ consent: PersistedConsent; created: boolean }> {
  const existing = await findPersistedConsent(db, requestedSessionId);
  if (existing) return { consent: existing, created: false };
  const consentSessionId = randomUUID();
  const rows = await db
    .insert(analyticsConsents)
    .values({ consentSessionId, status: "unknown" })
    .returning();
  const consent = rows[0];
  if (!consent) throw new Error("Analytics Consent session could not be created.");
  return { consent, created: true };
}

export async function updatePersistedConsent<
  TQueryResult extends PgQueryResultHKT,
>(
  db: AppDatabase<TQueryResult>,
  consentSessionId: string,
  status: Exclude<PersistedConsentStatus, "unknown">,
  expectedVersion: number,
): Promise<PersistedConsent> {
  const now = new Date();
  const rows = await db
    .update(analyticsConsents)
    .set({
      status,
      consentVersion: expectedVersion + 1,
      grantedAt: status === "granted" ? now : null,
      revokedAt: status === "revoked" ? now : null,
      updatedAt: now,
    })
    .where(
      and(
        eq(analyticsConsents.consentSessionId, consentSessionId),
        eq(analyticsConsents.consentVersion, expectedVersion),
      ),
    )
    .returning();
  const consent = rows[0];
  if (!consent) throw new Error("Analytics Consent changed; reload privacy choices.");
  return consent;
}

export function analyticsConsentCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: env.APP_ENV === "production" || env.APP_ENV === "preview",
    path: "/",
    maxAge: 31_536_000,
  };
}
