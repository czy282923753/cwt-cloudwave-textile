import sharp from "sharp";

import {
  createAssetVariantLogicalKey,
  type AssetVariantFormat,
} from "./asset-variant";

export interface ImageDerivative {
  key: string;
  format: AssetVariantFormat;
  bytes: Uint8Array;
  width: number;
  height: number;
}

export async function createImageDerivatives(
  source: Uint8Array,
): Promise<ImageDerivative[]> {
  const widths = [480, 960, 1600] as const;
  const derivatives: ImageDerivative[] = [];

  for (const width of widths) {
    const resized = sharp(source, { failOn: "error" }).rotate().resize({
      width,
      withoutEnlargement: true,
    });
    for (const format of ["webp", "avif"] as const) {
      const result = await resized
        .clone()
        [format]({ quality: format === "webp" ? 82 : 58 })
        .toBuffer({ resolveWithObject: true });
      derivatives.push({
        key: createAssetVariantLogicalKey(width, format),
        format,
        bytes: result.data,
        width: result.info.width,
        height: result.info.height,
      });
    }
  }
  return derivatives;
}
