import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";

import { writeAuditLog } from "@/audit/service";
import { authenticateUserAttempt } from "@/auth/authenticate";
import { assertSameOrigin } from "@/auth/request-security";
import { createAuthenticatedSession } from "@/auth/session";
import { env } from "@/config/env";
import { databaseConnection } from "@/db/client";
import type { AppDatabase } from "@/db/types";
import { sharedRateLimiter as loginLimiter } from "@/security/rate-limiter-factory";
import { trustedClientAddressFromRequest } from "@/security/trusted-client-address";
import type { PgQueryResultHKT } from "drizzle-orm/pg-core/session";

async function withDatabase<TResult>(
  operation: <TQueryResult extends PgQueryResultHKT>(
    db: AppDatabase<TQueryResult>,
  ) => Promise<TResult>,
): Promise<TResult> {
  if (databaseConnection.kind === "pglite") return operation(databaseConnection.db);
  return operation(databaseConnection.db);
}

function loginKeys(address: string, email: string): readonly string[] {
  return [
    `network:${address}`,
    `account:${email.trim().toLowerCase()}`,
  ];
}

function loginRedirect(error?: string): NextResponse {
  const path = error ? `/operations-login/?error=${error}` : "/admin/";
  return NextResponse.redirect(new URL(path, env.NEXT_PUBLIC_SITE_URL), 303);
}

export async function POST(request: Request): Promise<NextResponse> {
  const requestId = randomUUID();
  try {
    assertSameOrigin(request);
    const clientAddress = trustedClientAddressFromRequest(request);
    if (clientAddress.kind !== "trusted") return loginRedirect("rate_unavailable");
    const form = await request.formData();
    const email = form.get("email");
    const password = form.get("password");
    if (typeof email !== "string" || typeof password !== "string") {
      return loginRedirect("invalid");
    }
    const keys = loginKeys(clientAddress.address, email);
    const decisions = await Promise.all(
      keys.map((key) => loginLimiter.consume(key, "login")),
    );
    if (decisions.some((decision) => decision.kind === "unavailable")) {
      return loginRedirect("rate_unavailable");
    }
    if (decisions.some((decision) => decision.kind === "limited")) {
      await withDatabase((db) =>
        writeAuditLog(db, {
          action: "auth.login.rate_limited",
          entityType: "auth",
          requestId,
        }),
      );
      return loginRedirect("rate_limited");
    }
    const attempt = await withDatabase((db) =>
      authenticateUserAttempt(db, email, password),
    );
    if (attempt.status !== "success") {
      await withDatabase((db) =>
        writeAuditLog(db, {
          actorUserId: attempt.status === "disabled" ? attempt.userId : null,
          action:
            attempt.status === "disabled"
              ? "auth.login.disabled_user_attempt"
              : "auth.login.failure",
          entityType: "auth",
          requestId,
        }),
      );
      return loginRedirect("invalid");
    }
    const session = await withDatabase((db) =>
      createAuthenticatedSession(db, attempt.userId, requestId),
    );
    const response = loginRedirect();
    response.cookies.set(env.AUTH_COOKIE_NAME, session.token, {
      httpOnly: true,
      secure: env.APP_ENV === "production" || env.APP_ENV === "staging",
      sameSite: "strict",
      path: "/",
      expires: session.expiresAt,
    });
    return response;
  } catch {
    return loginRedirect("request");
  }
}
