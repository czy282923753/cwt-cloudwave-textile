import sharp from "sharp";

import {
  createAssetVariantLogicalKey,
  type AssetVariantFormat,
} from "./asset-variant";

export const IMAGE_WORK_CONCURRENCY = 1;
export const IMAGE_WORK_MAX_PENDING = 8;

class ImageWorkSemaphore {
  private active = 0;
  private readonly pending: Array<() => void> = [];

  async run<T>(operation: () => Promise<T>): Promise<T> {
    await this.acquire();
    try {
      return await operation();
    } finally {
      this.release();
    }
  }

  private async acquire(): Promise<void> {
    if (this.active < IMAGE_WORK_CONCURRENCY) {
      this.active += 1;
      return;
    }
    if (this.pending.length >= IMAGE_WORK_MAX_PENDING) {
      throw new Error("Image work is temporarily at capacity.");
    }
    await new Promise<void>((resolve) => this.pending.push(resolve));
  }

  private release(): void {
    const next = this.pending.shift();
    if (next) {
      next();
      return;
    }
    this.active -= 1;
  }
}

const imageWorkSemaphore = new ImageWorkSemaphore();

export function runWithImageWorkSemaphore<T>(operation: () => Promise<T>): Promise<T> {
  return imageWorkSemaphore.run(operation);
}

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
  return runWithImageWorkSemaphore(async () => {
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
  });
}
