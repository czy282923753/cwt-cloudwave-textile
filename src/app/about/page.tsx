import type { Metadata } from "next";

import { requirePublicStaticPage } from "@/public-site/data";
import { PublicShell } from "@/public-site/shell";
import { StaticAboutRenderer } from "@/public-site/static-page-renderer";
import { staticPageRobots } from "@/seo/page-indexability";

export async function generateMetadata(): Promise<Metadata> {
  const page = await requirePublicStaticPage("about");
  return {
    title: "About CWT",
    description: "CloudWave Textile is a fabric supplier and textile sourcing partner in China.",
    alternates: { canonical: "/about/" },
    robots: staticPageRobots(page.hasRenderableContent),
  };
}

export default async function AboutPage() {
  const page = await requirePublicStaticPage("about");
  return <PublicShell><StaticAboutRenderer config={page.config} facts={page.facts} placements={page.placements} /></PublicShell>;
}
