import { and, eq, gt, inArray, isNull, or, sql } from "drizzle-orm";
import type { SQLWrapper } from "drizzle-orm";

import { assets } from "@/db/schema";

export const allowedImageMimeTypes = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
] as const;

export const publicImageRoles = [
  "hero",
  "gallery",
  "cover",
  "detail",
  "thumbnail",
  "inline",
] as const;

export const publicAttachmentRoles = ["document", "download"] as const;

export type PublicAssetRole =
  | (typeof publicImageRoles)[number]
  | (typeof publicAttachmentRoles)[number];

export function isAllowedImageMimeType(
  mimeType: string | null | undefined,
): boolean {
  return Boolean(
    mimeType && (allowedImageMimeTypes as readonly string[]).includes(mimeType),
  );
}

export function isRoleMimeCompatible(
  role: string,
  mimeType: string | null | undefined,
): boolean {
  if ((publicImageRoles as readonly string[]).includes(role)) {
    return isAllowedImageMimeType(mimeType);
  }
  if ((publicAttachmentRoles as readonly string[]).includes(role)) {
    return isAllowedImageMimeType(mimeType) || mimeType === "application/pdf";
  }
  return false;
}

export function publicRightsSqlConditions(now = new Date()) {
  return and(
    or(
      and(
        isNull(assets.effectiveRightsDecision),
        or(
          isNull(assets.publicUsePermission),
          eq(assets.publicUsePermission, "allowed"),
        ),
      ),
      eq(assets.effectiveRightsDecision, "allowed"),
      and(
        eq(assets.effectiveRightsDecision, "restricted"),
        eq(assets.rightsPublicWebsiteAllowed, true),
      ),
    ),
    or(isNull(assets.declarationExpiryDate), gt(assets.declarationExpiryDate, now)),
  )!;
}

export function publicReadyAssetSqlConditions(now = new Date()) {
  return and(
    eq(assets.storagePartition, "public"),
    eq(assets.access, "public"),
    eq(assets.status, "ready"),
    eq(assets.scanStatus, "passed"),
    isNull(assets.deletedAt),
    publicRightsSqlConditions(now),
  )!;
}

export function publicReadyImageSqlConditions(now = new Date()) {
  return and(
    publicReadyAssetSqlConditions(now),
    inArray(assets.detectedMimeType, [...allowedImageMimeTypes]),
  )!;
}

export function roleMimeSqlCondition(roleColumn: SQLWrapper) {
  return sql`(
    (${roleColumn} in ('hero', 'gallery', 'cover', 'detail', 'thumbnail', 'inline')
      and ${assets.detectedMimeType} in ('image/jpeg', 'image/png', 'image/webp', 'image/avif'))
    or
    (${roleColumn} in ('document', 'download')
      and ${assets.detectedMimeType} in ('image/jpeg', 'image/png', 'image/webp', 'image/avif', 'application/pdf'))
  )`;
}

export function resolveEffectiveRightsDecision(asset: {
  effectiveRightsDecision: typeof assets.$inferSelect.effectiveRightsDecision;
  publicUsePermission: typeof assets.$inferSelect.publicUsePermission;
  rightsPublicWebsiteAllowed: boolean | null;
  declarationExpiryDate: Date | null;
}, now = new Date()):
  | "allowed"
  | "restricted"
  | "not_allowed"
  | "expired"
  | "revoked"
  | "pending_review" {
  if (asset.declarationExpiryDate && asset.declarationExpiryDate <= now) {
    return "expired";
  }
  if (asset.effectiveRightsDecision) return asset.effectiveRightsDecision;
  if (asset.publicUsePermission === "not_allowed") return "not_allowed";
  if (asset.publicUsePermission === "restricted") return "restricted";
  return "allowed";
}

export function isPublicWebsiteUseAllowed(asset: Parameters<
  typeof resolveEffectiveRightsDecision
>[0], now = new Date()): boolean {
  const decision = resolveEffectiveRightsDecision(asset, now);
  return decision === "allowed" ||
    (decision === "restricted" && asset.rightsPublicWebsiteAllowed === true);
}
