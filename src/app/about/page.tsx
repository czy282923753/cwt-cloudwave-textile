import type { Metadata } from "next";

import { getPublicStaticPage } from "@/public-site/data";
import { PublicShell } from "@/public-site/shell";
import { StaticAboutRenderer, StaticPageUnavailable } from "@/public-site/static-page-renderer";

export const metadata: Metadata = {
  title: "About CWT",
  description: "CloudWave Textile is a fabric supplier and textile sourcing partner in China.",
  alternates: { canonical: "/about/" },
};

export default async function AboutPage() {
  const page = await getPublicStaticPage("about");
  if (!page.config || page.config.pageKey !== "about") {
    console.error("Static page live configuration is invalid.", { pageKey: "about" });
    return <PublicShell><StaticPageUnavailable pageKey="about" /></PublicShell>;
  }
  return <PublicShell><StaticAboutRenderer config={page.config} facts={page.facts} placements={page.placements} /></PublicShell>;
}
