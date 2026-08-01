import type { MetadataRoute } from "next";

import { env } from "@/config/env";
import { listIndexableRoutes } from "@/seo/public-index";

export const revalidate = 3600;

const staticPaths = [
  "/",
  "/products",
  "/applications",
  "/fabric-library",
  "/resources",
  "/fabric-knowledge",
  "/china-textile-guide",
  "/china-sourcing-guide",
  "/about",
  "/get-quote",
  "/privacy",
] as const;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  if (env.APP_ENV !== "production" || env.NON_PRODUCTION_NOINDEX) return [];
  const dynamicRoutes = await listIndexableRoutes();
  const staticEntries = staticPaths.map((path) => ({
    url: new URL(path, env.NEXT_PUBLIC_SITE_URL).toString(),
    changeFrequency: "weekly" as const,
    priority: path === "/" ? 1 : 0.7,
  }));
  const dynamicEntries = dynamicRoutes
    .filter((route) => !staticPaths.includes(route.path as (typeof staticPaths)[number]))
    .map((route) => ({
      url: new URL(route.path, env.NEXT_PUBLIC_SITE_URL).toString(),
      lastModified: route.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.6,
    }));
  return [...staticEntries, ...dynamicEntries];
}
