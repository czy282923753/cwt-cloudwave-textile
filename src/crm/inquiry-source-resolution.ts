import { and, eq } from "drizzle-orm";
import type { PgQueryResultHKT } from "drizzle-orm/pg-core/session";

import { publicProductEligibilityConditions } from "@/catalog/product-eligibility";
import {
  applicationLocalizations,
  applications,
  authors,
  contentLocalizations,
  contents,
  productLocalizations,
  products,
  routes,
  seoMetadata,
} from "@/db/schema";
import type { AppDatabase } from "@/db/types";
import { resolveBlockPublicProjection } from "@/editorial/block-references";
import { parseBlockDocument } from "@/editorial/blocks";

import { normalizeRequiredSourcePagePath } from "./inquiry-attribution";

export type InquirySourceEntity = Readonly<{
  type: "product" | "application" | "content";
  id: string;
}>;

export type InquirySourcePresentation = Readonly<{
  type: InquirySourceEntity["type"];
  label: string;
  href: string;
}>;

function currentSafePresentation(
  type: InquirySourceEntity["type"],
  label: string,
  href: string,
): InquirySourcePresentation | null {
  try {
    return normalizeRequiredSourcePagePath(href) === href
      ? { type, label, href }
      : null;
  } catch {
    return null;
  }
}

/**
 * Resolves a mutable, current-safe CRM label/link for immutable source evidence.
 * It deliberately returns no entity ID and grants no public or CRM authorization.
 */
export async function resolveInquirySourcePresentation<
  TQueryResult extends PgQueryResultHKT,
>(
  db: AppDatabase<TQueryResult>,
  source: InquirySourceEntity,
): Promise<InquirySourcePresentation | null> {
  if (source.type === "product") {
    const rows = await db
      .select({
        label: productLocalizations.name,
        href: routes.path,
      })
      .from(products)
      .innerJoin(
        productLocalizations,
        and(
          eq(productLocalizations.productId, products.id),
          eq(productLocalizations.locale, "en"),
        ),
      )
      .innerJoin(
        routes,
        and(
          eq(routes.entityType, "product"),
          eq(routes.entityId, products.id),
          eq(routes.locale, "en"),
          eq(routes.isCurrent, true),
        ),
      )
      .where(
        and(
          eq(products.id, source.id),
          publicProductEligibilityConditions(db),
        ),
      )
      .limit(1);
    const row = rows[0];
    return row
      ? currentSafePresentation(source.type, row.label, row.href)
      : null;
  }

  if (source.type === "application") {
    const rows = await db
      .select({
        label: applicationLocalizations.name,
        href: routes.path,
      })
      .from(applications)
      .innerJoin(
        applicationLocalizations,
        and(
          eq(applicationLocalizations.applicationId, applications.id),
          eq(applicationLocalizations.locale, "en"),
        ),
      )
      .innerJoin(
        routes,
        and(
          eq(routes.entityType, "application"),
          eq(routes.entityId, applications.id),
          eq(routes.locale, "en"),
          eq(routes.isCurrent, true),
        ),
      )
      .innerJoin(seoMetadata, eq(seoMetadata.routeId, routes.id))
      .where(
        and(
          eq(applications.id, source.id),
          eq(applications.status, "published"),
        ),
      )
      .limit(1);
    const row = rows[0];
    return row
      ? currentSafePresentation(source.type, row.label, row.href)
      : null;
  }

  const rows = await db
    .select({
      label: contentLocalizations.title,
      href: routes.path,
      structuredBlocks: contentLocalizations.structuredBlocks,
      blocksVersion: contentLocalizations.blocksVersion,
    })
    .from(contents)
    .innerJoin(
      contentLocalizations,
      and(
        eq(contentLocalizations.contentId, contents.id),
        eq(contentLocalizations.locale, "en"),
      ),
    )
    .innerJoin(authors, eq(authors.id, contents.authorId))
    .innerJoin(
      routes,
      and(
        eq(routes.entityType, "content"),
        eq(routes.entityId, contents.id),
        eq(routes.locale, "en"),
        eq(routes.isCurrent, true),
      ),
    )
    .innerJoin(seoMetadata, eq(seoMetadata.routeId, routes.id))
    .where(
      and(
        eq(contents.id, source.id),
        eq(contents.status, "published"),
      ),
    )
    .limit(1);
  const content = rows[0];
  if (!content || content.blocksVersion !== 1) return null;
  try {
    const document = parseBlockDocument(content.structuredBlocks, "content");
    const projection = await resolveBlockPublicProjection(
      db,
      { type: "content", id: source.id },
      document,
    );
    return projection.readableText
      ? currentSafePresentation(source.type, content.label, content.href)
      : null;
  } catch {
    return null;
  }
}

/**
 * Resolves immutable CRM evidence from a Domain-sanitized canonical path.
 * The result grants no authorization, publication, indexing, or analytics authority.
 */
export async function resolveInquirySourceEntity<
  TQueryResult extends PgQueryResultHKT,
>(
  db: AppDatabase<TQueryResult>,
  sourcePagePath: string,
): Promise<InquirySourceEntity | null> {
  const routeRows = await db
    .select({
      entityType: routes.entityType,
      entityId: routes.entityId,
    })
    .from(routes)
    .where(
      and(
        eq(routes.path, sourcePagePath),
        eq(routes.locale, "en"),
        eq(routes.isCurrent, true),
      ),
    )
    .limit(1);
  const route = routeRows[0];
  if (!route?.entityId) return null;
  if (
    route.entityType !== "product" &&
    route.entityType !== "application" &&
    route.entityType !== "content"
  ) return null;
  const source = { type: route.entityType, id: route.entityId } as const;
  const presentation = await resolveInquirySourcePresentation(db, source);
  return presentation?.href === sourcePagePath ? source : null;
}
