import { and, eq, inArray } from "drizzle-orm";
import type { PgQueryResultHKT } from "drizzle-orm/pg-core/session";

import { publicProductEligibilityConditions } from "@/catalog/product-eligibility";
import {
  assets,
  applications,
  contentAssets,
  contentLocalizations,
  contents,
  internalLinkRelations,
  productAssets,
  productLocalizations,
  products,
  redirects,
  routes,
} from "@/db/schema";
import type { AppDatabase } from "@/db/types";
import {
  systemPublicRouteDefinition,
  systemPublicRoutePathFromHref,
} from "@/seo/system-public-routes";
import { publicReadyImageSqlConditions } from "@/uploads/asset-eligibility";

import {
  blockDocumentPlainText,
  referencedMediaKeys,
  type BlockDocument,
  type EditorialBlock,
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
  routeId: string;
  label: string;
  href: string;
}

export interface ResolvedInternalLink {
  destinationRouteId: string;
  anchorText: string;
}

export interface ResolvedBlockProjection {
  mediaAssetIds: ReadonlyMap<string, string>;
  relatedProducts: Readonly<Record<string, ResolvedBlockLink>>;
  relatedArticles: Readonly<Record<string, ResolvedBlockLink>>;
  renderableDocument: BlockDocument;
  hasRenderableContent: boolean;
  referencesValid: boolean;
  readableText: string;
  internalLinks: readonly ResolvedInternalLink[];
}

export interface ResolveBlockProjectionOptions {
  invalidReferences?: "reject" | "filter";
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
): Promise<{
  mediaAssetIds: Map<string, string>;
  referencesValid: boolean;
  ambiguityMessage: string | null;
}> {
  const usage = referencedMediaUsage(document);
  const referencedKeys = referencedMediaKeys(document);
  if (!referencedKeys.length) {
    return { mediaAssetIds: new Map(), referencesValid: true, ambiguityMessage: null };
  }

  let placements: Array<{ key: string; assetId: string; role: string; isVisible: boolean }>;
  let ambiguityMessage: string | null = null;
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
      ambiguityMessage = "Product media relationships are ambiguous.";
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
      ambiguityMessage = "Content media Block keys are ambiguous.";
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
  const placementsByKey = new Map<string, typeof placements>();
  for (const placement of placements) {
    placementsByKey.set(placement.key, [
      ...(placementsByKey.get(placement.key) ?? []),
      placement,
    ]);
  }
  const resolved = new Map<string, string>();
  for (const key of referencedKeys) {
    const candidates = placementsByKey.get(key) ?? [];
    const placement = candidates.length === 1 ? candidates[0] : undefined;
    if (
      !placement ||
      !placement.isVisible ||
      !eligibleAssetIds.has(placement.assetId) ||
      !isRoleCompatible(owner.type, placement.role, usage.get(key) ?? new Set())
    ) {
      continue;
    }
    resolved.set(key, placement.assetId);
  }
  return {
    mediaAssetIds: resolved,
    referencesValid: !ambiguityMessage && resolved.size === referencedKeys.length,
    ambiguityMessage,
  };
}

async function resolveRelatedLinks<TQueryResult extends PgQueryResultHKT>(
  db: AppDatabase<TQueryResult>,
  document: BlockDocument,
): Promise<{
  relatedProducts: Record<string, ResolvedBlockLink>;
  relatedArticles: Record<string, ResolvedBlockLink>;
  referencesValid: boolean;
}> {
  const { productIds, contentIds } = referencedEditorialEntities(document);
  const [productRows, contentRows] = await Promise.all([
    productIds.length
      ? db
          .select({ id: products.id, routeId: routes.id, label: productLocalizations.name, href: routes.path })
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
          .select({ id: contents.id, routeId: routes.id, label: contentLocalizations.title, href: routes.path })
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
  return {
    relatedProducts: Object.fromEntries(productRows.map((row) => [row.id, row])),
    relatedArticles: Object.fromEntries(contentRows.map((row) => [row.id, row])),
    referencesValid:
      new Set(productRows.map((row) => row.id)).size === productIds.length &&
      new Set(contentRows.map((row) => row.id)).size === contentIds.length,
  };
}

async function resolveInternalCtaHrefs<TQueryResult extends PgQueryResultHKT>(
  db: AppDatabase<TQueryResult>,
  document: BlockDocument,
): Promise<{
  validHrefs: Set<string>;
  routeIds: Map<string, string>;
  normalizedHrefs: Map<string, string>;
}> {
  const hrefs = [...new Set(document.blocks.flatMap((block) => block.type === "cta" ? [block.href] : []))];
  const resolved = new Set<string>();
  const routeIds = new Map<string, string>();
  const normalizedHrefs = new Map<string, string>();
  if (!hrefs.length) return { validHrefs: resolved, routeIds, normalizedHrefs };
  const lookupPathByHref = new Map(hrefs.map((href) => [
    href,
    systemPublicRoutePathFromHref(href) ?? href,
  ]));
  const lookupPaths = [...new Set(lookupPathByHref.values())];
  const directRouteRows = await db
    .select({ id: routes.id, path: routes.path, entityType: routes.entityType, entityId: routes.entityId })
    .from(routes)
    .where(and(inArray(routes.path, lookupPaths), eq(routes.locale, "en"), eq(routes.isCurrent, true)));
  const directPaths = new Set(directRouteRows.map((route) => route.path));
  const unresolvedHrefs = hrefs.filter((href) => (
    !systemPublicRoutePathFromHref(href) && !directPaths.has(href)
  ));
  const redirectRows = unresolvedHrefs.length ? await db
    .select({ sourcePath: redirects.sourcePath, destinationPath: redirects.destinationPath })
    .from(redirects)
    .where(and(inArray(redirects.sourcePath, unresolvedHrefs), eq(redirects.isActive, true))) : [];
  const destinationPaths = [...new Set(redirectRows.map((redirect) => redirect.destinationPath))];
  const destinationRouteRows = destinationPaths.length ? await db
    .select({ id: routes.id, path: routes.path, entityType: routes.entityType, entityId: routes.entityId })
    .from(routes)
    .where(and(inArray(routes.path, destinationPaths), eq(routes.locale, "en"), eq(routes.isCurrent, true))) : [];
  const routeRows = [...directRouteRows, ...destinationRouteRows];
  const productIds = routeRows.flatMap((row) =>
    row.entityType === "product" && row.entityId ? [row.entityId] : [],
  );
  const contentIds = routeRows.flatMap((row) =>
    row.entityType === "content" && row.entityId ? [row.entityId] : [],
  );
  const applicationIds = routeRows.flatMap((row) =>
    row.entityType === "application" && row.entityId ? [row.entityId] : [],
  );
  const [eligibleProducts, eligibleContents, eligibleApplications] = await Promise.all([
    productIds.length ? db.select({ id: products.id }).from(products).where(and(inArray(products.id, productIds), publicProductEligibilityConditions(db))) : Promise.resolve([]),
    contentIds.length ? db.select({ id: contents.id }).from(contents).where(and(inArray(contents.id, contentIds), eq(contents.status, "published"))) : Promise.resolve([]),
    applicationIds.length ? db.select({ id: applications.id }).from(applications).where(and(inArray(applications.id, applicationIds), eq(applications.status, "published"))) : Promise.resolve([]),
  ]);
  const eligibleIds = new Set([...eligibleProducts, ...eligibleContents, ...eligibleApplications].map((row) => row.id));
  const isEligibleRoute = (route: (typeof routeRows)[number]): boolean => {
    const systemRoute = systemPublicRouteDefinition(route.path);
    return Boolean(systemRoute
      ? route.entityType === systemRoute.entityType && route.entityId === null
      : (
      (route.entityType === "product" || route.entityType === "content" || route.entityType === "application") &&
      route.entityId !== null &&
      eligibleIds.has(route.entityId)
    ));
  };
  const directRoutesByPath = new Map(directRouteRows.map((route) => [route.path, route]));
  for (const href of hrefs) {
    const lookupPath = lookupPathByHref.get(href)!;
    const route = directRoutesByPath.get(lookupPath);
    if (!route || !isEligibleRoute(route)) continue;
    const fragment = href.startsWith(`${lookupPath}#`) ? href.slice(lookupPath.length) : "";
    const normalizedHref = `${route.path}${fragment}`;
    resolved.add(href);
    routeIds.set(href, route.id);
    routeIds.set(normalizedHref, route.id);
    normalizedHrefs.set(href, normalizedHref);
  }
  const destinationRoutesByPath = new Map(destinationRouteRows.map((route) => [route.path, route]));
  for (const destination of destinationRouteRows) {
    if (isEligibleRoute(destination)) routeIds.set(destination.path, destination.id);
  }
  for (const redirect of redirectRows) {
    const destination = destinationRoutesByPath.get(redirect.destinationPath);
    if (!destination || !isEligibleRoute(destination)) continue;
    resolved.add(redirect.sourcePath);
    routeIds.set(redirect.sourcePath, destination.id);
    normalizedHrefs.set(redirect.sourcePath, destination.path);
  }
  return { validHrefs: resolved, routeIds, normalizedHrefs };
}

function projectRenderableDocument(
  document: BlockDocument,
  mediaAssetIds: ReadonlyMap<string, string>,
  relatedProducts: Readonly<Record<string, ResolvedBlockLink>>,
  relatedArticles: Readonly<Record<string, ResolvedBlockLink>>,
  validInternalHrefs: ReadonlySet<string>,
  normalizedInternalHrefs: ReadonlyMap<string, string>,
): BlockDocument {
  const blocks: EditorialBlock[] = [];
  for (const block of document.blocks) {
    if (block.type === "image") {
      if (mediaAssetIds.has(block.mediaKey)) blocks.push(block);
      continue;
    }
    if (block.type === "gallery") {
      if (block.mediaKeys.every((key) => mediaAssetIds.has(key))) blocks.push(block);
      continue;
    }
    if (block.type === "related_products") {
      const productIds = block.productIds.filter((id) => relatedProducts[id]);
      if (productIds.length) blocks.push({ ...block, productIds });
      continue;
    }
    if (block.type === "related_articles") {
      const contentIds = block.contentIds.filter((id) => relatedArticles[id]);
      if (contentIds.length) blocks.push({ ...block, contentIds });
      continue;
    }
    if (block.type === "cta") {
      if (validInternalHrefs.has(block.href)) {
        blocks.push({ ...block, href: normalizedInternalHrefs.get(block.href) ?? block.href });
      }
      continue;
    }
    blocks.push(block);
  }
  return {
    version: document.version,
    blocks,
  };
}

export async function resolveBlockPublicProjection<
  TQueryResult extends PgQueryResultHKT,
>(
  db: AppDatabase<TQueryResult>,
  owner: BlockProjectionOwner,
  document: BlockDocument,
  options: ResolveBlockProjectionOptions = {},
): Promise<ResolvedBlockProjection> {
  const [media, links, internalCtas] = await Promise.all([
    resolveMedia(db, owner, document),
    resolveRelatedLinks(db, document),
    resolveInternalCtaHrefs(db, document),
  ]);
  const ctaHrefs = document.blocks.flatMap((block) => block.type === "cta" ? [block.href] : []);
  const referencesValid = media.referencesValid && links.referencesValid && ctaHrefs.every((href) => internalCtas.validHrefs.has(href));
  if (options.invalidReferences !== "filter" && !referencesValid) {
    if (media.ambiguityMessage) {
      throw new BlockReferenceResolutionError(media.ambiguityMessage);
    }
    const mediaReferencesValid = media.referencesValid;
    throw new BlockReferenceResolutionError(
      mediaReferencesValid
        ? "Related Product, Article, and internal CTA references must resolve to current public records and eligible routes."
        : `${owner.type === "product" ? "Product" : "Content"} Block media must resolve to a visible, role-compatible, public-ready relationship owned by the current record.`,
    );
  }
  const renderableDocument = projectRenderableDocument(
    document,
    media.mediaAssetIds,
    links.relatedProducts,
    links.relatedArticles,
    internalCtas.validHrefs,
    internalCtas.normalizedHrefs,
  );
  const relatedText = [
    ...renderableDocument.blocks.flatMap((block) =>
      block.type === "related_products"
        ? block.productIds.map((id) => links.relatedProducts[id]!.label)
        : [],
    ),
    ...renderableDocument.blocks.flatMap((block) =>
      block.type === "related_articles"
        ? block.contentIds.map((id) => links.relatedArticles[id]!.label)
        : [],
    ),
  ];
  return {
    mediaAssetIds: media.mediaAssetIds,
    ...links,
    renderableDocument,
    hasRenderableContent: renderableDocument.blocks.some((block) => block.type !== "divider"),
    referencesValid,
    readableText: [blockDocumentPlainText(renderableDocument), ...relatedText]
      .filter((value) => value.trim())
      .join("\n")
      .trim(),
    internalLinks: renderableDocument.blocks.flatMap((block) => {
      if (block.type === "related_products") {
        return block.productIds.map((id) => ({
          destinationRouteId: links.relatedProducts[id]!.routeId,
          anchorText: links.relatedProducts[id]!.label,
        }));
      }
      if (block.type === "related_articles") {
        return block.contentIds.map((id) => ({
          destinationRouteId: links.relatedArticles[id]!.routeId,
          anchorText: links.relatedArticles[id]!.label,
        }));
      }
      if (block.type === "cta") {
        const destinationRouteId = internalCtas.routeIds.get(block.href);
        return destinationRouteId ? [{ destinationRouteId, anchorText: block.label }] : [];
      }
      return [];
    }),
  };
}

export async function synchronizeBlockInternalLinks<
  TQueryResult extends PgQueryResultHKT,
>(
  db: AppDatabase<TQueryResult>,
  owner: { type: "product" | "content"; id: string },
  projection: ResolvedBlockProjection,
): Promise<void> {
  const sourceRows = await db
    .select({ id: routes.id })
    .from(routes)
    .where(and(
      eq(routes.entityType, owner.type),
      eq(routes.entityId, owner.id),
      eq(routes.locale, "en"),
      eq(routes.isCurrent, true),
    ))
    .limit(1);
  const sourceRouteId = sourceRows[0]?.id;
  if (!sourceRouteId) {
    if (!projection.internalLinks.length) return;
    throw new BlockReferenceResolutionError("Block link owner has no current Route authority.");
  }
  const deduplicated = new Map<string, ResolvedInternalLink>();
  for (const link of projection.internalLinks) {
    if (link.destinationRouteId !== sourceRouteId && !deduplicated.has(link.destinationRouteId)) {
      deduplicated.set(link.destinationRouteId, link);
    }
  }
  await db
    .delete(internalLinkRelations)
    .where(eq(internalLinkRelations.sourceRouteId, sourceRouteId));
  if (deduplicated.size) {
    await db.insert(internalLinkRelations).values(
      [...deduplicated.values()].map((link) => ({
        sourceRouteId,
        destinationRouteId: link.destinationRouteId,
        anchorText: link.anchorText,
        status: "published" as const,
      })),
    );
  }
}
