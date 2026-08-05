import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { getAdminStaticPage } from "@/admin/data";
import { requireCurrentUser } from "@/auth/current-user";
import {
  deriveStaticPageLivePlacements,
  type StaticPageConfig,
} from "@/content/static-page-projection";
import {
  listPublishedApplications,
  listPublishedContents,
  listPublishedFabricEntries,
  listPublishedProducts,
  type PublicStaticPagePlacement,
} from "@/public-site/data";
import { PublicShell } from "@/public-site/shell";
import { StaticAboutRenderer, StaticHomeRenderer } from "@/public-site/static-page-renderer";

export const metadata: Metadata = { title: "CWT Draft Preview", robots: { index: false, follow: false, noarchive: true } };
export const dynamic = "force-dynamic";

function previewPlacements(config: StaticPageConfig): PublicStaticPagePlacement[] {
  return deriveStaticPageLivePlacements(config).map((placement) => ({
    placementKey: placement.placementKey,
    viewport: placement.viewport,
    sortOrder: placement.sortOrder,
    focalX: placement.focalX,
    focalY: placement.focalY,
    overlayOpacity: placement.overlayOpacity,
    asset: {
      id: placement.assetId,
      url: `/api/admin/preview-assets/site/${config.pageKey}/${placement.assetId}/`,
      alt: placement.altText,
      caption: placement.caption,
      width: null,
      height: null,
    },
  }));
}

export default async function StaticPagePreview({ params }: Readonly<{ params: Promise<{ pageKey: string }> }>) {
  await requireCurrentUser("content.read");
  const { pageKey: rawPageKey } = await params;
  if (rawPageKey !== "home" && rawPageKey !== "about") notFound();
  const page = await getAdminStaticPage(rawPageKey);
  const config = page.pendingRevision?.config ?? page.liveConfig;
  const placements = previewPlacements(config);
  const banner = <div className="bg-amber-300 px-4 py-3 text-center text-sm font-semibold text-slate-950">Authenticated Draft Preview · noindex · no live state changed</div>;
  if (config.pageKey === "about") {
    const selected = new Set(config.copy?.ownedManufacturing.factKeys ?? []);
    const facts = page.facts.filter((fact) => selected.has(fact.key)).map((fact) => fact.statement);
    return <><div>{banner}</div><PublicShell><StaticAboutRenderer config={config} facts={facts} placements={placements} /></PublicShell></>;
  }
  const [products, applications, libraryEntries, contents] = await Promise.all([listPublishedProducts(6), listPublishedApplications(), listPublishedFabricEntries(), listPublishedContents()]);
  const selected = new Set(config.copy?.manufacturingStrength.factKeys ?? []);
  const facts = page.facts.filter((fact) => selected.has(fact.key)).map((fact) => fact.statement);
  return <><div>{banner}</div><PublicShell><StaticHomeRenderer applications={applications} config={config} contents={contents} facts={facts} libraryEntries={libraryEntries} placements={placements} products={products} /></PublicShell></>;
}
