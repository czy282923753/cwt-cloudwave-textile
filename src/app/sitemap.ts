import type { MetadataRoute } from "next";

import { env, publicIndexingAllowed } from "@/config/env";
import {
  getPublishedProductPage,
  listPublishedApplications,
  listPublishedFabricEntries,
  requirePublicStaticPage,
} from "@/public-site/data";
import { listIndexableRoutes } from "@/seo/public-index";

export const revalidate = 3600;

const knownStaticPaths = [
  "/",
  "/products/",
  "/applications/",
  "/fabric-library/",
  "/resources/",
  "/fabric-knowledge/",
  "/china-textile-guide/",
  "/china-sourcing-guide/",
  "/about/",
] as const;

const alwaysIndexableStaticPaths = [
  "/resources/",
  "/fabric-knowledge/",
  "/china-textile-guide/",
  "/china-sourcing-guide/",
] as const;

export async function listIndexableStaticPaths(): Promise<string[]> {
  const [home, about, productPage, applications, fabricEntries] = await Promise.all([
    requirePublicStaticPage("home"),
    requirePublicStaticPage("about"),
    getPublishedProductPage(1),
    listPublishedApplications(),
    listPublishedFabricEntries(),
  ]);
  return [
    ...(home.hasRenderableContent ? ["/"] : []),
    ...(productPage && productPage.total > 0 ? ["/products/"] : []),
    ...(applications.length > 0 ? ["/applications/"] : []),
    ...(fabricEntries.length > 0 ? ["/fabric-library/"] : []),
    ...alwaysIndexableStaticPaths,
    ...(about.hasRenderableContent ? ["/about/"] : []),
  ];
}

export function buildPublicSitemap(
  dynamicRoutes: readonly { path: string }[],
  siteOrigin: string,
  indexableStaticPaths: readonly string[],
): MetadataRoute.Sitemap {
  const staticEntries = indexableStaticPaths.map((path) => ({
    url: new URL(path, siteOrigin).toString(),
    changeFrequency: "weekly" as const,
    priority: path === "/" ? 1 : 0.7,
  }));
  const dynamicEntries = dynamicRoutes
    .filter((route) => !knownStaticPaths.includes(route.path as (typeof knownStaticPaths)[number]))
    .map((route) => ({
      url: new URL(route.path, siteOrigin).toString(),
      changeFrequency: "weekly" as const,
      priority: 0.6,
    }));
  return [...staticEntries, ...dynamicEntries];
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  if (!publicIndexingAllowed()) return [];
  const [dynamicRoutes, indexableStaticPaths] = await Promise.all([
    listIndexableRoutes(),
    listIndexableStaticPaths(),
  ]);
  return buildPublicSitemap(dynamicRoutes, env.NEXT_PUBLIC_SITE_URL, indexableStaticPaths);
}
