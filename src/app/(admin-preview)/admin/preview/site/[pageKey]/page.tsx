import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { getAdminStaticPage, listAdminAssets } from "@/admin/data";
import { isEligiblePublicImagePickerAsset } from "@/admin/asset-picker";
import { resolveCurrentUser } from "@/auth/current-user";
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
import { StaticAboutRenderer, StaticHomeRenderer, StaticPageUnavailable } from "@/public-site/static-page-renderer";
import { canAccessEditorialResource } from "@/admin/preview-policy";

export const metadata: Metadata = { title: "CWT Draft Preview", robots: { index: false, follow: false, noarchive: true } };
export const dynamic = "force-dynamic";

function previewPlacements(
  config: StaticPageConfig,
  eligibleAssets: ReadonlyMap<string, { subjectRelationship: string | null; isCwtOwnedFacility: boolean | null }>,
): PublicStaticPagePlacement[] {
  return deriveStaticPageLivePlacements(config).filter((placement) => {
    const asset = eligibleAssets.get(placement.assetId);
    if (!asset) return false;
    return (placement.placementKey !== "manufacturing_strength" && placement.placementKey !== "owned_manufacturing") ||
      (asset.subjectRelationship === "cwt" && asset.isCwtOwnedFacility === true);
  }).map((placement) => ({
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
  const currentUser = await resolveCurrentUser();
  if (!currentUser || !canAccessEditorialResource(currentUser.role, "static_page", "preview")) notFound();
  const { pageKey: rawPageKey } = await params;
  if (rawPageKey !== "home" && rawPageKey !== "about") notFound();
  const [page, assets] = await Promise.all([
    getAdminStaticPage(rawPageKey),
    listAdminAssets(),
  ]);
  const config = page.pendingRevision?.config ?? page.liveConfig;
  if (!config) {
    return <PublicShell><StaticPageUnavailable pageKey={rawPageKey} /></PublicShell>;
  }
  const eligibleAssets = new Map(assets.filter((asset) =>
    isEligiblePublicImagePickerAsset(asset),
  ).map((asset) => [asset.id, asset]));
  const placements = previewPlacements(config, eligibleAssets);
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
