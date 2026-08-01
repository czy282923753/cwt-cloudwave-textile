import { createHash, randomUUID } from "node:crypto";
import { NextResponse } from "next/server";

import { writeAuditLog } from "@/audit/service";
import { authenticateUserAttempt } from "@/auth/authenticate";
import { assertSameOrigin } from "@/auth/request-security";
import { createSession } from "@/auth/session";
import { env } from "@/config/env";
import { databaseConnection } from "@/db/client";
import { users } from "@/db/schema";
import type { AppDatabase } from "@/db/types";
import { createUploadRateLimiter } from "@/uploads/rate-limit";
import { eq } from "drizzle-orm";
import type { PgQueryResultHKT } from "drizzle-orm/pg-core/session";

const loginLimiter = createUploadRateLimiter();

async function withDatabase<TResult>(
  operation: <TQueryResult extends PgQueryResultHKT>(
    db: AppDatabase<TQueryResult>,
  ) => Promise<TResult>,
): Promise<TResult> {
  if (databaseConnection.kind === "pglite") return operation(databaseConnection.db);
  return operation(databaseConnection.db);
}

function loginKeys(request: Request, email: string): readonly string[] {
  const networkIdentity = `${request.headers.get("cf-connecting-ip") ?? request.headers.get("x-real-ip") ?? "unknown"}:${request.headers.get("user-agent") ?? "unknown"}`;
  return [
    createHash("sha256").update(`network:${networkIdentity}`).digest("hex"),
    createHash("sha256")
      .update(`account:${email.trim().toLowerCase()}`)
      .digest("hex"),
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
    const form = await request.formData();
    const email = form.get("email");
    const password = form.get("password");
    if (typeof email !== "string" || typeof password !== "string") {
      return loginRedirect("invalid");
    }
    const keys = loginKeys(request, email);
    const decisions = await Promise.all(
      keys.map((key) => loginLimiter.consume(key, "login")),
    );
    if (decisions.some((allowed) => !allowed)) {
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
    const session = await withDatabase(async (db) => {
      const created = await createSession(db, attempt.userId);
      await db
        .update(users)
        .set({ lastLoginAt: new Date(), updatedAt: new Date() })
        .where(eq(users.id, attempt.userId));
      await writeAuditLog(db, {
        actorUserId: attempt.userId,
        action: "auth.login.success",
        entityType: "auth",
        requestId,
      });
      return created;
    });
    const response = loginRedirect();
    response.cookies.set(env.AUTH_COOKIE_NAME, session.token, {
      httpOnly: true,
      secure: env.APP_ENV === "production",
      sameSite: "strict",
      path: "/",
      expires: session.expiresAt,
    });
    return response;
  } catch {
    return loginRedirect("request");
  }
}
