import { and, eq, inArray } from "drizzle-orm";
import type { PgQueryResultHKT } from "drizzle-orm/pg-core/session";

import { publicProductEligibilityConditions } from "@/catalog/product-eligibility";
import {
  assets,
  contentAssets,
  contentLocalizations,
  contents,
  productAssets,
  productLocalizations,
  products,
  routes,
} from "@/db/schema";
import type { AppDatabase } from "@/db/types";
import { publicReadyImageSqlConditions } from "@/uploads/asset-eligibility";

import {
  blockDocumentPlainText,
  referencedMediaKeys,
  type BlockDocument,
} from "./blocks";

export function referencedEditorialEntities(document: BlockDocument): {
  productIds: string[];
  contentIds: string[];
} {
  return {
    productIds: [...new Set(document.blocks.flatMap((block) =>
      block.type === "related_products" ? block.productIds : [],
    ))],
    contentIds: [...new Set(document.blocks.flatMap((block) =>
      block.type === "related_articles" ? block.contentIds : [],
    ))],
  };
}

export class BlockReferenceResolutionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BlockReferenceResolutionError";
  }
}

export interface ProductBlockMediaPlacement {
  assetId: string;
  role: "hero" | "gallery" | "detail" | "application";
  sortOrder?: number;
  altText?: string | null;
  caption?: string | null;
  isVisible: boolean;
}

export interface ContentBlockMediaPlacement {
  assetId: string;
  role: "cover" | "inline" | "gallery" | "detail";
  isVisible: boolean;
  blockKey: string | null;
}

export type BlockProjectionOwner =
  | { type: "product"; id: string; media?: readonly ProductBlockMediaPlacement[] }
  | { type: "content"; id: string; media?: readonly ContentBlockMediaPlacement[] };

export interface ResolvedBlockLink {
  id: string;
  label: string;
  href: string;
}

export interface ResolvedBlockProjection {
  mediaAssetIds: ReadonlyMap<string, string>;
  relatedProducts: Readonly<Record<string, ResolvedBlockLink>>;
  relatedArticles: Readonly<Record<string, ResolvedBlockLink>>;
  readableText: string;
}

type MediaUsage = "image" | "gallery";

function referencedMediaUsage(document: BlockDocument): Map<string, Set<MediaUsage>> {
  const usage = new Map<string, Set<MediaUsage>>();
  for (const block of document.blocks) {
    const values = block.type === "image"
      ? [[block.mediaKey, "image"] as const]
      : block.type === "gallery"
        ? block.mediaKeys.map((key) => [key, "gallery"] as const)
        : [];
    for (const [key, kind] of values) {
      const kinds = usage.get(key) ?? new Set<MediaUsage>();
      kinds.add(kind);
      usage.set(key, kinds);
    }
  }
  return usage;
}

function isRoleCompatible(
  ownerType: BlockProjectionOwner["type"],
  role: string,
  usage: ReadonlySet<MediaUsage>,
): boolean {
  if (ownerType === "product") {
    if (!["hero", "gallery", "detail", "application"].includes(role)) return false;
    if (usage.has("image") && role === "gallery") return false;
    if (usage.has("gallery") && role === "hero") return false;
    return true;
  }
  if (!["cover", "inline", "gallery", "detail"].includes(role)) return false;
  if (usage.has("image") && role === "gallery") return false;
  if (usage.has("gallery") && role === "cover") return false;
  return true;
}

async function resolveMedia<TQueryResult extends PgQueryResultHKT>(
  db: AppDatabase<TQueryResult>,
  owner: BlockProjectionOwner,
  document: BlockDocument,
): Promise<Map<string, string>> {
  const usage = referencedMediaUsage(document);
  const referencedKeys = referencedMediaKeys(document);
  if (!referencedKeys.length) return new Map();

  let placements: Array<{ key: string; assetId: string; role: string; isVisible: boolean }>;
  if (owner.type === "product") {
    const source = owner.media ?? await db
      .select({
        assetId: productAssets.assetId,
        role: productAssets.role,
        isVisible: productAssets.isVisible,
      })
      .from(productAssets)
      .where(eq(productAssets.productId, owner.id));
    if (new Set(source.map((item) => item.assetId)).size !== source.length) {
      throw new BlockReferenceResolutionError("Product media relationships are ambiguous.");
    }
    placements = source.map((item) => ({ ...item, key: item.assetId }));
  } else {
    const source = owner.media ?? await db
      .select({
        assetId: contentAssets.assetId,
        role: contentAssets.role,
        isVisible: contentAssets.isVisible,
        blockKey: contentAssets.blockKey,
      })
      .from(contentAssets)
      .where(eq(contentAssets.contentId, owner.id));
    const keys = source.flatMap((item) => item.blockKey ? [item.blockKey] : []);
    if (new Set(keys).size !== keys.length) {
      throw new BlockReferenceResolutionError("Content media Block keys are ambiguous.");
    }
    placements = source.flatMap((item) => item.blockKey
      ? [{ assetId: item.assetId, role: item.role, isVisible: item.isVisible, key: item.blockKey }]
      : []);
  }

  const eligibleRows = await db
    .select({ id: assets.id })
    .from(assets)
    .where(and(
      inArray(assets.id, [...new Set(placements.map((item) => item.assetId))]),
      publicReadyImageSqlConditions(),
    ));
  const eligibleAssetIds = new Set(eligibleRows.map((row) => row.id));
  const byKey = new Map(placements.map((placement) => [placement.key, placement]));
  const resolved = new Map<string, string>();
  for (const key of referencedKeys) {
    const placement = byKey.get(key);
    if (
      !placement ||
      !placement.isVisible ||
      !eligibleAssetIds.has(placement.assetId) ||
      !isRoleCompatible(owner.type, placement.role, usage.get(key) ?? new Set())
    ) {
      throw new BlockReferenceResolutionError(
        `${owner.type === "product" ? "Product" : "Content"} Block media must resolve to a visible, role-compatible, public-ready relationship owned by the current record.`,
      );
    }
    resolved.set(key, placement.assetId);
  }
  return resolved;
}

async function resolveRelatedLinks<TQueryResult extends PgQueryResultHKT>(
  db: AppDatabase<TQueryResult>,
  document: BlockDocument,
): Promise<{
  relatedProducts: Record<string, ResolvedBlockLink>;
  relatedArticles: Record<string, ResolvedBlockLink>;
}> {
  const { productIds, contentIds } = referencedEditorialEntities(document);
  const [productRows, contentRows] = await Promise.all([
    productIds.length
      ? db
          .select({ id: products.id, label: productLocalizations.name, href: routes.path })
          .from(products)
          .innerJoin(productLocalizations, and(
            eq(productLocalizations.productId, products.id),
            eq(productLocalizations.locale, "en"),
          ))
          .innerJoin(routes, and(
            eq(routes.entityType, "product"),
            eq(routes.entityId, products.id),
            eq(routes.locale, "en"),
            eq(routes.isCurrent, true),
          ))
          .where(and(inArray(products.id, productIds), publicProductEligibilityConditions(db)))
      : Promise.resolve([]),
    contentIds.length
      ? db
          .select({ id: contents.id, label: contentLocalizations.title, href: routes.path })
          .from(contents)
          .innerJoin(contentLocalizations, and(
            eq(contentLocalizations.contentId, contents.id),
            eq(contentLocalizations.locale, "en"),
          ))
          .innerJoin(routes, and(
            eq(routes.entityType, "content"),
            eq(routes.entityId, contents.id),
            eq(routes.locale, "en"),
            eq(routes.isCurrent, true),
          ))
          .where(and(inArray(contents.id, contentIds), eq(contents.status, "published")))
      : Promise.resolve([]),
  ]);
  if (productRows.length !== productIds.length || contentRows.length !== contentIds.length) {
    throw new BlockReferenceResolutionError(
      "Related Product and Article Blocks must resolve to current public records.",
    );
  }
  return {
    relatedProducts: Object.fromEntries(productRows.map((row) => [row.id, row])),
    relatedArticles: Object.fromEntries(contentRows.map((row) => [row.id, row])),
  };
}

export async function resolveBlockPublicProjection<
  TQueryResult extends PgQueryResultHKT,
>(
  db: AppDatabase<TQueryResult>,
  owner: BlockProjectionOwner,
  document: BlockDocument,
): Promise<ResolvedBlockProjection> {
  const [mediaAssetIds, links] = await Promise.all([
    resolveMedia(db, owner, document),
    resolveRelatedLinks(db, document),
  ]);
  const relatedText = [
    ...Object.values(links.relatedProducts).map((row) => row.label),
    ...Object.values(links.relatedArticles).map((row) => row.label),
  ];
  return {
    mediaAssetIds,
    ...links,
    readableText: [blockDocumentPlainText(document), ...relatedText]
      .filter((value) => value.trim())
      .join("\n")
      .trim(),
  };
}
