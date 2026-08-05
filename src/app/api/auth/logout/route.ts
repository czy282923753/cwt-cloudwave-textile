import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";

import { assertSameOrigin } from "@/auth/request-security";
import { revokeAuthenticatedSession } from "@/auth/session";
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
      if (databaseConnection.kind === "pglite") {
        await revokeAuthenticatedSession(databaseConnection.db, token, requestId);
      } else {
        await revokeAuthenticatedSession(databaseConnection.db, token, requestId);
      }
    }
  } finally {
    const response = NextResponse.redirect(
      new URL("/operations-login/", env.NEXT_PUBLIC_SITE_URL),
      303,
    );
    response.cookies.set(env.AUTH_COOKIE_NAME, "", {
      httpOnly: true,
      secure: env.APP_ENV === "production" || env.APP_ENV === "staging",
      sameSite: "strict",
      path: "/",
      maxAge: 0,
    });
    return response;
  }
}
