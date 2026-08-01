import type { MetadataRoute } from "next";

import { env, publicIndexingAllowed } from "@/config/env";

export default function robots(): MetadataRoute.Robots {
  if (!publicIndexingAllowed()) {
    return { rules: { userAgent: "*", disallow: "/" } };
  }
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin/", "/api/", "/operations-login", "/*?q="],
    },
    sitemap: `${env.NEXT_PUBLIC_SITE_URL}/sitemap.xml`,
  };
}
