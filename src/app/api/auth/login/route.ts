import { NextResponse } from "next/server";

import { authenticateUser } from "@/auth/authenticate";
import { assertSameOrigin } from "@/auth/request-security";
import { createSession } from "@/auth/session";
import { env } from "@/config/env";
import { databaseConnection } from "@/db/client";

export async function POST(request: Request): Promise<NextResponse> {
  try {
    assertSameOrigin(request);
    const form = await request.formData();
    const email = form.get("email");
    const password = form.get("password");
    if (typeof email !== "string" || typeof password !== "string") {
      return NextResponse.redirect(
        new URL("/operations-login?error=invalid", env.NEXT_PUBLIC_SITE_URL),
        303,
      );
    }
    const user =
      databaseConnection.kind === "pglite"
        ? await authenticateUser(databaseConnection.db, email, password)
        : await authenticateUser(databaseConnection.db, email, password);
    if (!user) {
      return NextResponse.redirect(
        new URL("/operations-login?error=invalid", env.NEXT_PUBLIC_SITE_URL),
        303,
      );
    }
    const session =
      databaseConnection.kind === "pglite"
        ? await createSession(databaseConnection.db, user.id)
        : await createSession(databaseConnection.db, user.id);
    const response = NextResponse.redirect(
      new URL("/admin", env.NEXT_PUBLIC_SITE_URL),
      303,
    );
    response.cookies.set(env.AUTH_COOKIE_NAME, session.token, {
      httpOnly: true,
      secure: env.APP_ENV === "production",
      sameSite: "strict",
      path: "/",
      expires: session.expiresAt,
    });
    return response;
  } catch {
    return NextResponse.redirect(
      new URL("/operations-login?error=request", env.NEXT_PUBLIC_SITE_URL),
      303,
    );
  }
}
