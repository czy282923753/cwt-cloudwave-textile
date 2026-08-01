import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";

import { writeAuditLog } from "@/audit/service";
import { assertSameOrigin } from "@/auth/request-security";
import { revokeSession } from "@/auth/session";
import { env } from "@/config/env";
import { databaseConnection } from "@/db/client";

export async function POST(request: Request): Promise<NextResponse> {
  const requestId = randomUUID();
  try {
    assertSameOrigin(request);
    const token = request.headers
      .get("cookie")
      ?.split(";")
      .map((item) => item.trim().split("="))
      .find(([name]) => name === env.AUTH_COOKIE_NAME)?.[1];
    if (token) {
      const revoked = databaseConnection.kind === "pglite"
        ? await revokeSession(databaseConnection.db, token)
        : await revokeSession(databaseConnection.db, token);
      if (revoked) {
        if (databaseConnection.kind === "pglite") {
          await writeAuditLog(databaseConnection.db, {
            actorUserId: revoked.userId,
            action: "auth.logout",
            entityType: "auth_session",
            entityId: revoked.sessionId,
            requestId,
            afterSummary: { revoked: true },
          });
          await writeAuditLog(databaseConnection.db, {
            actorUserId: revoked.userId,
            action: "auth.session.revoked",
            entityType: "auth_session",
            entityId: revoked.sessionId,
            requestId,
            afterSummary: { reason: "logout" },
          });
        } else {
          await writeAuditLog(databaseConnection.db, {
            actorUserId: revoked.userId,
            action: "auth.logout",
            entityType: "auth_session",
            entityId: revoked.sessionId,
            requestId,
            afterSummary: { revoked: true },
          });
          await writeAuditLog(databaseConnection.db, {
            actorUserId: revoked.userId,
            action: "auth.session.revoked",
            entityType: "auth_session",
            entityId: revoked.sessionId,
            requestId,
            afterSummary: { reason: "logout" },
          });
        }
      }
    }
  } finally {
    const response = NextResponse.redirect(
      new URL("/operations-login/", env.NEXT_PUBLIC_SITE_URL),
      303,
    );
    response.cookies.set(env.AUTH_COOKIE_NAME, "", {
      httpOnly: true,
      secure: env.APP_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: 0,
    });
    return response;
  }
}
