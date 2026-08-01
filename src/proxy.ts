import { NextResponse, type NextRequest } from "next/server";

import { findRedirect } from "@/public-site/data";
import { normalizePath } from "@/seo/path";

export async function proxy(request: NextRequest): Promise<NextResponse> {
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
    "/((?!api/|admin/|operations-login/|_next/|favicon.ico|robots.txt|sitemap.xml).*)",
  ],
};
