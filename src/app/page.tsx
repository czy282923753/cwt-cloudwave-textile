import { env } from "@/config/env";
import {
  getPublicStaticPage,
  listPublishedApplications,
  listPublishedContents,
  listPublishedFabricEntries,
  listPublishedProducts,
} from "@/public-site/data";
import { PublicShell } from "@/public-site/shell";
import { StaticHomeRenderer } from "@/public-site/static-page-renderer";

export const revalidate = 3600;

export default async function Home() {
  const [page, products, applications, libraryEntries, contents] = await Promise.all([
    getPublicStaticPage("home"),
    listPublishedProducts(6),
    listPublishedApplications(),
    listPublishedFabricEntries(),
    listPublishedContents(),
  ]);
  if (page.config.pageKey !== "home") throw new Error("Home settings projection is invalid.");
  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "CloudWave Textile",
    url: env.NEXT_PUBLIC_SITE_URL,
  };
  return <PublicShell><StaticHomeRenderer applications={applications} config={page.config} contents={contents} facts={page.facts} libraryEntries={libraryEntries} placements={page.placements} products={products} /><script dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema).replaceAll("<", "\\u003c") }} type="application/ld+json" /></PublicShell>;
}
