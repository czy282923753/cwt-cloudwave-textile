import { z } from "zod";

const productMediaSchema = z.object({
  assetId: z.uuid(),
  role: z.enum(["hero", "gallery", "detail", "application"]),
  sortOrder: z.number().int(),
  altText: z.string().nullable(),
  caption: z.string().nullable(),
  isVisible: z.boolean(),
}).strict();

const productStructureSchema = z.object({
  kind: z.literal("structure"),
  assetIds: z.array(z.uuid()),
  heroAssetId: z.uuid(),
  media: z.array(productMediaSchema).optional(),
}).passthrough();

const contentMediaSchema = z.object({
  assetId: z.uuid(),
  role: z.enum(["cover", "inline", "gallery", "detail"]),
  sortOrder: z.number().int(),
  altText: z.string().nullable(),
  caption: z.string().nullable(),
  isVisible: z.boolean(),
  blockKey: z.string().nullable(),
}).strict();

const contentRevisionSchema = z.object({
  kind: z.literal("content_blocks_v1"),
  media: z.array(contentMediaSchema).optional(),
}).passthrough();

export type ProductPreviewMedia = z.infer<typeof productMediaSchema>;
export type ContentPreviewMedia = z.infer<typeof contentMediaSchema>;

export function productPreviewMediaFromSnapshot(
  snapshot: unknown,
): ProductPreviewMedia[] | null {
  const parsed = productStructureSchema.safeParse(snapshot);
  if (!parsed.success) return null;
  if (parsed.data.media) return parsed.data.media;
  return parsed.data.assetIds.map((assetId, sortOrder) => ({
    assetId,
    role: assetId === parsed.data.heroAssetId ? "hero" as const : "gallery" as const,
    sortOrder,
    altText: null,
    caption: null,
    isVisible: true,
  }));
}

export function contentPreviewMediaFromSnapshot(
  snapshot: unknown,
): ContentPreviewMedia[] | null {
  const parsed = contentRevisionSchema.safeParse(snapshot);
  return parsed.success && parsed.data.media ? parsed.data.media : null;
}

export function snapshotContainsPreviewAsset(
  entityType: "product" | "content",
  snapshot: unknown,
  assetId: string,
): boolean {
  const media = entityType === "product"
    ? productPreviewMediaFromSnapshot(snapshot)
    : contentPreviewMediaFromSnapshot(snapshot);
  return Boolean(media?.some((placement) =>
    placement.assetId === assetId && placement.isVisible,
  ));
}
