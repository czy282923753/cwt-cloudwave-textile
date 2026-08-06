import { z } from "zod";

import {
  AuthorizationError,
  hasPermission,
  type Permission,
  type UserRole,
} from "@/auth/permissions";

export type EditorialResourceKind = "product" | "content" | "static_page";
export type EditorialResourceAction = "manage" | "write" | "preview" | "review" | "apply";

const resourcePermissions: Readonly<Record<
  EditorialResourceKind,
  Readonly<Record<EditorialResourceAction, Permission>>
>> = {
  product: {
    manage: "products.read",
    write: "products.write",
    preview: "products.read",
    review: "products.review",
    apply: "products.publish",
  },
  content: {
    manage: "content.read",
    write: "content.write",
    preview: "content.read",
    review: "content.review",
    apply: "content.publish",
  },
  static_page: {
    manage: "content.read",
    write: "content.write",
    preview: "content.read",
    review: "content.review",
    apply: "content.publish",
  },
};

const resourceRoles: Readonly<Record<EditorialResourceKind, ReadonlySet<UserRole>>> = {
  product: new Set(["admin", "product_editor", "reviewer_publisher"]),
  content: new Set(["admin", "content_editor", "reviewer_publisher"]),
  static_page: new Set(["admin", "content_editor", "reviewer_publisher"]),
};

export function canAccessEditorialResource(
  role: UserRole,
  resource: EditorialResourceKind,
  action: EditorialResourceAction,
): boolean {
  return resourceRoles[resource].has(role) && hasPermission(role, resourcePermissions[resource][action]);
}

export function requireEditorialResourceAccess(
  role: UserRole,
  resource: EditorialResourceKind,
  action: EditorialResourceAction,
): void {
  if (!canAccessEditorialResource(role, resource, action)) {
    throw new AuthorizationError(role, resourcePermissions[resource][action]);
  }
}

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

function snapshotCandidates(snapshot: unknown): unknown[] {
  if (typeof snapshot !== "object" || snapshot === null || !("pendingChanges" in snapshot)) {
    return [snapshot];
  }
  const pending = snapshot.pendingChanges;
  return [snapshot, ...(Array.isArray(pending) ? pending : [])];
}

export function productPreviewMediaFromSnapshot(
  snapshot: unknown,
): ProductPreviewMedia[] | null {
  const parsed = snapshotCandidates(snapshot)
    .map((candidate) => productStructureSchema.safeParse(candidate))
    .find((candidate) => candidate.success);
  if (!parsed?.success) return null;
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
