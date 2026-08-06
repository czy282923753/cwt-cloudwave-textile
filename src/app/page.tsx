import type { Metadata } from "next";

import { env } from "@/config/env";
import {
  listPublishedApplications,
  listPublishedContents,
  listPublishedFabricEntries,
  listPublishedProducts,
  requirePublicStaticPage,
} from "@/public-site/data";
import { PublicShell } from "@/public-site/shell";
import { StaticHomeRenderer } from "@/public-site/static-page-renderer";
import { staticPageRobots } from "@/seo/page-indexability";

export const revalidate = 3600;

export async function generateMetadata(): Promise<Metadata> {
  const page = await requirePublicStaticPage("home");
  return {
    alternates: { canonical: "/" },
    robots: staticPageRobots(page.hasRenderableContent),
  };
}

export default async function Home() {
  const [page, products, applications, libraryEntries, contents] = await Promise.all([
    requirePublicStaticPage("home"),
    listPublishedProducts(6),
    listPublishedApplications(),
    listPublishedFabricEntries(),
    listPublishedContents(),
  ]);
  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "CloudWave Textile",
    url: env.NEXT_PUBLIC_SITE_URL,
  };
  return <PublicShell><StaticHomeRenderer applications={applications} config={page.config} contents={contents} facts={page.facts} libraryEntries={libraryEntries} placements={page.placements} products={products} /><script dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema).replaceAll("<", "\\u003c") }} type="application/ld+json" /></PublicShell>;
}
