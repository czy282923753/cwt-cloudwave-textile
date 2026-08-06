export const assetVariantFormats = ["webp", "avif"] as const;

export type AssetVariantFormat = (typeof assetVariantFormats)[number];

const canonicalAssetVariantKeyPattern = /^[a-z0-9][a-z0-9_-]{0,79}$/i;

export function isCanonicalAssetVariantKey(value: string): boolean {
  return canonicalAssetVariantKeyPattern.test(value);
}

export function createAssetVariantLogicalKey(
  width: number,
  format: AssetVariantFormat,
): string {
  if (!Number.isSafeInteger(width) || width < 1) {
    throw new Error("Asset Variant width must be a positive integer.");
  }
  const key = `${width}w-${format}`;
  if (!isCanonicalAssetVariantKey(key)) {
    throw new Error("Asset Variant logical key is invalid.");
  }
  return key;
}

export function createAssetVariantObjectKey(
  sourceObjectKey: string,
  logicalKey: string,
  format: AssetVariantFormat,
): string {
  if (!sourceObjectKey || !isCanonicalAssetVariantKey(logicalKey)) {
    throw new Error("Asset Variant identity is invalid.");
  }
  return `${sourceObjectKey}.variants/${logicalKey}.${format}`;
}
