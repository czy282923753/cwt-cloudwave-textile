import type { assets } from "@/db/schema";

export type PublicAssetCandidate = Pick<
  typeof assets.$inferSelect,
  | "storagePartition"
  | "access"
  | "status"
  | "scanStatus"
  | "deletedAt"
  | "sourceDeclarationEnabled"
  | "publicUsePermission"
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
    (!asset.sourceDeclarationEnabled || asset.publicUsePermission !== "not_allowed") &&
    (asset.declarationExpiryDate === null || asset.declarationExpiryDate.getTime() > Date.now())
  );
}

export function assertPublicAssetCandidate(
  asset: PublicAssetCandidate,
): void {
  if (!isPublicAssetCandidate(asset)) {
    throw new Error("Asset is not eligible for public rendering.");
  }
}
