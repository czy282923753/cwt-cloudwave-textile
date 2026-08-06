import type { MetadataRoute } from "next";

import { env, publicIndexingAllowed } from "@/config/env";

export function productionRobots(siteOrigin: string): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/api/public-assets/"],
      disallow: ["/admin/", "/api/", "/operations-login", "/*?q="],
    },
    sitemap: new URL("/sitemap.xml", siteOrigin).toString(),
  };
}

export default function robots(): MetadataRoute.Robots {
  if (!publicIndexingAllowed()) {
    return { rules: { userAgent: "*", disallow: "/" } };
  }
  return productionRobots(env.NEXT_PUBLIC_SITE_URL);
}
