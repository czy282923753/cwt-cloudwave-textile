import type { assets } from "@/db/schema";
import { isPublicWebsiteUseAllowed } from "@/uploads/asset-eligibility";

export type PublicAssetCandidate = Pick<
  typeof assets.$inferSelect,
  | "storagePartition"
  | "access"
  | "status"
  | "scanStatus"
  | "deletedAt"
  | "effectiveRightsDecision"
  | "publicUsePermission"
  | "rightsPublicWebsiteAllowed"
  | "declarationExpiryDate"
>;

export function isPublicAssetCandidate(
  asset: PublicAssetCandidate,
): boolean {
  return (
    asset.storagePartition === "public" &&
    asset.access === "public" &&
    asset.status === "ready" &&
    asset.scanStatus === "passed" &&
    asset.deletedAt === null &&
    isPublicWebsiteUseAllowed(asset)
  );
}

export function assertPublicAssetCandidate(
  asset: PublicAssetCandidate,
): void {
  if (!isPublicAssetCandidate(asset)) {
    throw new Error("Asset is not eligible for public rendering.");
  }
}
