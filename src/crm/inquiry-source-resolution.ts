import { and, eq } from "drizzle-orm";
import type { PgQueryResultHKT } from "drizzle-orm/pg-core/session";

import { publicProductEligibilityConditions } from "@/catalog/product-eligibility";
import {
  applicationLocalizations,
  applications,
  authors,
  contentLocalizations,
  contents,
  products,
  routes,
  seoMetadata,
} from "@/db/schema";
import type { AppDatabase } from "@/db/types";
import { resolveBlockPublicProjection } from "@/editorial/block-references";
import { parseBlockDocument } from "@/editorial/blocks";

export type InquirySourceEntity = Readonly<{
  type: "product" | "application" | "content";
  id: string;
}>;

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

  if (route.entityType === "product") {
    const rows = await db
      .select({ id: products.id })
      .from(products)
      .where(
        and(
          eq(products.id, route.entityId),
          publicProductEligibilityConditions(db),
        ),
      )
      .limit(1);
    return rows[0] ? { type: "product", id: rows[0].id } : null;
  }

  if (route.entityType === "application") {
    const rows = await db
      .select({ id: applications.id })
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
          eq(routes.path, sourcePagePath),
        ),
      )
      .innerJoin(seoMetadata, eq(seoMetadata.routeId, routes.id))
      .where(
        and(
          eq(applications.id, route.entityId),
          eq(applications.status, "published"),
        ),
      )
      .limit(1);
    return rows[0] ? { type: "application", id: rows[0].id } : null;
  }

  if (route.entityType === "content") {
    const rows = await db
      .select({
        id: contents.id,
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
          eq(routes.path, sourcePagePath),
        ),
      )
      .innerJoin(seoMetadata, eq(seoMetadata.routeId, routes.id))
      .where(
        and(
          eq(contents.id, route.entityId),
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
        { type: "content", id: content.id },
        document,
      );
      return projection.readableText
        ? { type: "content", id: content.id }
        : null;
    } catch {
      return null;
    }
  }

  return null;
}
