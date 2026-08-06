import Image, { type ImageProps } from "next/image";

import type { PublicAssetVariant } from "./data";

export interface ResponsiveImageAsset {
  url: string;
  alt: string;
  variants?: readonly PublicAssetVariant[];
}

export function publicAssetSrcSet(
  asset: ResponsiveImageAsset,
  format: "avif" | "webp",
): string | undefined {
  const byWidth = new Map<number, string>();
  for (const variant of asset.variants ?? []) {
    if (variant.format === format) byWidth.set(variant.width, variant.url);
  }
  const candidates = [...byWidth.entries()].sort(([left], [right]) => left - right);
  return candidates.length
    ? candidates.map(([width, url]) => `${url} ${width}w`).join(", ")
    : undefined;
}

export function ResponsivePublicImage({
  asset,
  priority = false,
  loading,
  fetchPriority,
  ...imageProps
}: Readonly<{
  asset: ResponsiveImageAsset;
}> & Omit<ImageProps, "alt" | "src" | "unoptimized">) {
  const avif = publicAssetSrcSet(asset, "avif");
  const webp = publicAssetSrcSet(asset, "webp");
  return (
    <picture>
      {avif ? <source sizes={imageProps.sizes} srcSet={avif} type="image/avif" /> : null}
      {webp ? <source sizes={imageProps.sizes} srcSet={webp} type="image/webp" /> : null}
      <Image
        {...imageProps}
        alt={asset.alt}
        fetchPriority={priority ? "high" : fetchPriority}
        loading={priority ? "eager" : (loading ?? "lazy")}
        src={asset.url}
        unoptimized
      />
    </picture>
  );
}
