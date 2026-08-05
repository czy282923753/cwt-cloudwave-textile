import { NextResponse, type NextRequest } from "next/server";

import { findRedirect } from "@/public-site/data";
import { normalizePath } from "@/seo/path";

export async function proxy(request: NextRequest): Promise<NextResponse> {
  if (request.nextUrl.pathname.startsWith("/admin/preview/")) {
    const response = NextResponse.next();
    response.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");
    response.headers.set("Cache-Control", "private, no-store, max-age=0");
    return response;
  }
  const sourcePath = normalizePath(request.nextUrl.pathname);
  const destinationPath = await findRedirect(sourcePath);
  if (!destinationPath) return NextResponse.next();
  const destination = request.nextUrl.clone();
  destination.pathname = destinationPath;
  destination.search = "";
  return NextResponse.redirect(destination, 301);
}

export const config = {
  matcher: [
    "/admin/preview/:path*",
    "/((?!api/|admin/|operations-login/|_next/|favicon.ico|robots.txt|sitemap.xml).*)",
  ],
};
