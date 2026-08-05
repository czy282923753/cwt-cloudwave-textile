import {
  isAllowedImageMimeType,
  isPublicWebsiteUseAllowed,
} from "@/uploads/asset-eligibility";

export interface AdminAssetPickerCandidate {
  access: string;
  storagePartition: string;
  status: string;
  scanStatus: string;
  detectedMimeType: string | null;
  deletedAt: Date | null;
  effectiveRightsDecision:
    | "allowed"
    | "restricted"
    | "not_allowed"
    | "expired"
    | "revoked"
    | "pending_review"
    | null;
  publicUsePermission: "unknown" | "allowed" | "restricted" | "not_allowed" | null;
  rightsPublicWebsiteAllowed: boolean | null;
  declarationExpiryDate: Date | null;
}

export function isEligiblePublicImagePickerAsset(
  asset: AdminAssetPickerCandidate,
  now = new Date(),
): boolean {
  const legacyRightsAllowed = asset.effectiveRightsDecision !== null ||
    asset.publicUsePermission === null ||
    asset.publicUsePermission === "allowed";
  return asset.storagePartition === "public" &&
    asset.access === "public" &&
    asset.status === "ready" &&
    asset.scanStatus === "passed" &&
    asset.deletedAt === null &&
    legacyRightsAllowed &&
    isAllowedImageMimeType(asset.detectedMimeType) &&
    isPublicWebsiteUseAllowed(asset, now);
}
