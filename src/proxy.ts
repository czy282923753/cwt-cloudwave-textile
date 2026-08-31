import { NextResponse, type NextRequest } from "next/server";

import { findRedirect } from "@/public-site/data";
import { normalizePath } from "@/seo/path";

const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "style-src 'self' 'unsafe-inline'",
  "script-src 'self' 'unsafe-inline'",
  "connect-src 'self' https:",
].join("; ");

export function applyRuntimeResponsePolicy(response: NextResponse): NextResponse {
  const protectedEnvironment =
    process.env.APP_ENV === "production" || process.env.APP_ENV === "staging";
  const indexingAllowed =
    process.env.APP_ENV === "production" &&
    process.env.NON_PRODUCTION_NOINDEX !== "true";

  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), payment=()",
  );
  response.headers.set("Content-Security-Policy", CONTENT_SECURITY_POLICY);
  if (protectedEnvironment) {
    response.headers.set(
      "Strict-Transport-Security",
      "max-age=63072000; includeSubDomains; preload",
    );
  }
  if (!indexingAllowed) {
    response.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");
  }
  return response;
}

export async function proxy(request: NextRequest): Promise<NextResponse> {
  if (request.nextUrl.pathname.startsWith("/admin/preview/")) {
    const response = applyRuntimeResponsePolicy(NextResponse.next());
    response.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");
    response.headers.set("Cache-Control", "private, no-store, max-age=0");
    return response;
  }
  const sourcePath = normalizePath(request.nextUrl.pathname);
  if (sourcePath === "/api/health/live/" || sourcePath === "/api/health/ready/") {
    return applyRuntimeResponsePolicy(NextResponse.next());
  }
  const destinationPath = await findRedirect(sourcePath);
  if (!destinationPath) return applyRuntimeResponsePolicy(NextResponse.next());
  const destination = request.nextUrl.clone();
  destination.pathname = destinationPath;
  destination.search = "";
  return applyRuntimeResponsePolicy(NextResponse.redirect(destination, 301));
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
