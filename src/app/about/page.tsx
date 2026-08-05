import type { Metadata } from "next";

import { getPublicStaticPage } from "@/public-site/data";
import { PublicShell } from "@/public-site/shell";
import { StaticAboutRenderer } from "@/public-site/static-page-renderer";

export const metadata: Metadata = {
  title: "About CWT",
  description: "CloudWave Textile is a fabric supplier and textile sourcing partner in China.",
  alternates: { canonical: "/about/" },
};

export default async function AboutPage() {
  const page = await getPublicStaticPage("about");
  if (page.config.pageKey !== "about") throw new Error("About settings projection is invalid.");
  return <PublicShell><StaticAboutRenderer config={page.config} facts={page.facts} placements={page.placements} /></PublicShell>;
}
