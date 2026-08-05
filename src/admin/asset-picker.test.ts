import { describe, expect, it } from "vitest";

import { isEligiblePublicImagePickerAsset } from "./asset-picker";

const eligible = {
  access: "public",
  storagePartition: "public",
  status: "ready",
  scanStatus: "passed",
  detectedMimeType: "image/jpeg",
  deletedAt: null,
  effectiveRightsDecision: "allowed" as const,
  publicUsePermission: "allowed" as const,
  rightsPublicWebsiteAllowed: true,
  declarationExpiryDate: null,
};

describe("public editor Asset picker boundary", () => {
  it("shows only ready scanned public rights-eligible images", () => {
    expect(isEligiblePublicImagePickerAsset(eligible)).toBe(true);
    expect(isEligiblePublicImagePickerAsset({ ...eligible, access: "private" })).toBe(false);
    expect(isEligiblePublicImagePickerAsset({ ...eligible, storagePartition: "imports" })).toBe(false);
    expect(isEligiblePublicImagePickerAsset({ ...eligible, scanStatus: "pending" })).toBe(false);
    expect(isEligiblePublicImagePickerAsset({ ...eligible, detectedMimeType: "application/pdf" })).toBe(false);
    expect(isEligiblePublicImagePickerAsset({ ...eligible, effectiveRightsDecision: "revoked" })).toBe(false);
    expect(isEligiblePublicImagePickerAsset({
      ...eligible,
      declarationExpiryDate: new Date("2020-01-01T00:00:00.000Z"),
    }, new Date("2026-08-06T00:00:00.000Z"))).toBe(false);
  });
});
