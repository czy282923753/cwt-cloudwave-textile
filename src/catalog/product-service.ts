import { and, count, eq, inArray, isNotNull, ne } from "drizzle-orm";
import type { PgQueryResultHKT } from "drizzle-orm/pg-core/session";

import { writeAuditLog } from "@/audit/service";
import { requirePermission, type UserRole } from "@/auth/permissions";
import {
  assets,
  productAssets,
  productApplications,
  productFieldReviews,
  productLocalizations,
  products,
  productTaxonomyTerms,
  redirects,
  routes,
  keywordPageMappings,
  seoMetadata,
  taxonomyTerms,
} from "@/db/schema";
import type { AppDatabase } from "@/db/types";
import { changeEntityRoute } from "@/seo/redirects";
import { slugify } from "@/seo/path";

export class ProductValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ProductValidationError";
  }
}

export interface Actor {
  userId: string;
  role: UserRole;
}

export interface CreateProductDraftInput {
  name: string;
  primaryTaxonomyTermId: string;
  assetIds: readonly string[];
  requestedSlug?: string;
}

async function uniqueProductPath<TQueryResult extends PgQueryResultHKT>(
  db: AppDatabase<TQueryResult>,
  baseSlug: string,
): Promise<string> {
  for (let suffix = 1; suffix <= 100; suffix += 1) {
    const candidate = `/products/${baseSlug}${suffix === 1 ? "" : `-${suffix}`}`;
    const [routeRows, redirectRows] = await Promise.all([
      db.select({ id: routes.id }).from(routes).where(eq(routes.path, candidate)),
      db
        .select({ id: redirects.id })
        .from(redirects)
        .where(eq(redirects.sourcePath, candidate)),
    ]);
    if (!routeRows[0] && !redirectRows[0]) return candidate;
  }
  throw new ProductValidationError("Unable to allocate a unique product URL.");
}

async function assertDraftAssets<TQueryResult extends PgQueryResultHKT>(
  db: AppDatabase<TQueryResult>,
  assetIds: readonly string[],
): Promise<void> {
  const distinct = [...new Set(assetIds)];
  if (distinct.length === 0) {
    throw new ProductValidationError("A product draft requires at least one image.");
  }
  const rows = await db
    .select({ id: assets.id })
    .from(assets)
    .where(
      and(
        inArray(assets.id, distinct),
        eq(assets.status, "ready"),
        eq(assets.access, "public"),
      ),
    );
  if (rows.length !== distinct.length) {
    throw new ProductValidationError(
      "Every product image must be a ready public Asset record.",
    );
  }
}

export async function createProductDraft<TQueryResult extends PgQueryResultHKT>(
  db: AppDatabase<TQueryResult>,
  actor: Actor,
  input: CreateProductDraftInput,
): Promise<string> {
  requirePermission(actor.role, "products.write");
  const name = input.name.trim();
  if (!name) throw new ProductValidationError("Product Name is required.");
  const categoryRows = await db
    .select({ id: taxonomyTerms.id, active: taxonomyTerms.isActive })
    .from(taxonomyTerms)
    .where(eq(taxonomyTerms.id, input.primaryTaxonomyTermId))
    .limit(1);
  if (!categoryRows[0]?.active) {
    throw new ProductValidationError("Primary Category must be an active taxonomy term.");
  }
  await assertDraftAssets(db, input.assetIds);
  const baseSlug = slugify(input.requestedSlug ?? name);
  const path = await uniqueProductPath(db, baseSlug);

  return db.transaction(async (transaction) => {
    const productRows = await transaction
      .insert(products)
      .values({
        primaryTaxonomyTermId: input.primaryTaxonomyTermId,
        status: "draft",
        createdByUserId: actor.userId,
      })
      .returning({ id: products.id });
    const productId = productRows[0]?.id;
    if (!productId) throw new Error("Product insert did not return an ID.");
    await transaction.insert(productLocalizations).values({
      productId,
      locale: "en",
      name,
    });
    await transaction.insert(productTaxonomyTerms).values({
      productId,
      taxonomyTermId: input.primaryTaxonomyTermId,
      isPrimary: true,
    });
    await transaction.insert(productAssets).values(
      [...new Set(input.assetIds)].map((assetId, index) => ({
        productId,
        assetId,
        role: index === 0 ? ("hero" as const) : ("gallery" as const),
        sortOrder: index,
      })),
    );
    const routeRows = await transaction
      .insert(routes)
      .values({ locale: "en", path, entityType: "product", entityId: productId })
      .returning({ id: routes.id });
    const routeId = routeRows[0]?.id;
    if (!routeId) throw new Error("Route insert did not return an ID.");
    await transaction.insert(seoMetadata).values({
      routeId,
      title: `${name} | CloudWave Textile`,
      indexStatus: "noindex",
      canonicalPath: path,
    });
    await writeAuditLog(transaction, {
      actorUserId: actor.userId,
      action: "product.draft.created",
      entityType: "product",
      entityId: productId,
      afterSummary: { name, path, indexStatus: "noindex" },
    });
    return productId;
  });
}

export async function submitProductForReview<TQueryResult extends PgQueryResultHKT>(
  db: AppDatabase<TQueryResult>,
  actor: Actor,
  productId: string,
): Promise<void> {
  requirePermission(actor.role, "products.write");
  const updated = await db
    .update(products)
    .set({ status: "in_review", updatedAt: new Date() })
    .where(and(eq(products.id, productId), eq(products.status, "draft")))
    .returning({ id: products.id });
  if (!updated[0]) throw new ProductValidationError("Only a draft can enter review.");
  await writeAuditLog(db, {
    actorUserId: actor.userId,
    action: "product.review.requested",
    entityType: "product",
    entityId: productId,
  });
}

export async function updateProductEditorialCopy<
  TQueryResult extends PgQueryResultHKT,
>(
  db: AppDatabase<TQueryResult>,
  actor: Actor,
  productId: string,
  input: {
    name: string;
    shortDescription?: string | null;
    fullDescription?: string | null;
  },
): Promise<void> {
  requirePermission(actor.role, "products.write");
  const name = input.name.trim();
  if (!name) throw new ProductValidationError("Product Name is required.");
  await db
    .update(productLocalizations)
    .set({
      name,
      shortDescription: input.shortDescription?.trim() || null,
      fullDescription: input.fullDescription?.trim() || null,
    })
    .where(
      and(
        eq(productLocalizations.productId, productId),
        eq(productLocalizations.locale, "en"),
      ),
    );
  await db
    .update(products)
    .set({ updatedAt: new Date() })
    .where(eq(products.id, productId));
  await writeAuditLog(db, {
    actorUserId: actor.userId,
    action: "product.editorial.updated",
    entityType: "product",
    entityId: productId,
  });
}

export async function updateProductFacts<TQueryResult extends PgQueryResultHKT>(
  db: AppDatabase<TQueryResult>,
  actor: Actor,
  productId: string,
  input: {
    productCode?: string | null;
    supplierType?: string | null;
    composition?: string | null;
    weightGsm?: string | null;
    widthCm?: string | null;
    fabricStyle?: string | null;
    colorOptions?: string | null;
    moqNote?: string | null;
    customAvailable?: "unknown" | "yes" | "no";
    sampleAvailable?: "unknown" | "yes" | "no";
  },
): Promise<void> {
  requirePermission(actor.role, "products.write");
  const providedFacts: string[] = [];
  if (input.composition?.trim()) providedFacts.push("composition");
  if (input.weightGsm) providedFacts.push("weightGsm");
  if (input.widthCm) providedFacts.push("widthCm");

  await db.transaction(async (transaction) => {
    await transaction
      .update(products)
      .set({
        ...(input.productCode !== undefined
          ? { productCode: input.productCode?.trim() || null }
          : {}),
        ...(input.supplierType !== undefined
          ? { supplierType: input.supplierType?.trim() || null }
          : {}),
        ...(input.composition !== undefined
          ? { composition: input.composition?.trim() || null }
          : {}),
        ...(input.weightGsm !== undefined
          ? { weightGsm: input.weightGsm?.trim() || null }
          : {}),
        ...(input.widthCm !== undefined
          ? { widthCm: input.widthCm?.trim() || null }
          : {}),
        ...(input.fabricStyle !== undefined
          ? { fabricStyle: input.fabricStyle?.trim() || null }
          : {}),
        ...(input.colorOptions !== undefined
          ? { colorOptions: input.colorOptions?.trim() || null }
          : {}),
        ...(input.moqNote !== undefined
          ? { moqNote: input.moqNote?.trim() || null }
          : {}),
        ...(input.customAvailable !== undefined
          ? { customAvailable: input.customAvailable }
          : {}),
        ...(input.sampleAvailable !== undefined
          ? { sampleAvailable: input.sampleAvailable }
          : {}),
        updatedAt: new Date(),
      })
      .where(eq(products.id, productId));
    for (const fieldName of providedFacts) {
      await transaction
        .insert(productFieldReviews)
        .values({
          productId,
          fieldName,
          verificationStatus: "provided",
        })
        .onConflictDoUpdate({
          target: [productFieldReviews.productId, productFieldReviews.fieldName],
          set: {
            verificationStatus: "provided",
            reviewedByUserId: null,
            reviewedAt: null,
          },
        });
    }
    await writeAuditLog(transaction, {
      actorUserId: actor.userId,
      action: "product.facts.updated",
      entityType: "product",
      entityId: productId,
      afterSummary: { providedFields: providedFacts },
    });
  });
}

export async function publishReviewedProduct<TQueryResult extends PgQueryResultHKT>(
  db: AppDatabase<TQueryResult>,
  actor: Actor,
  productId: string,
): Promise<void> {
  requirePermission(actor.role, "products.publish");
  const [localizations, imageCount] = await Promise.all([
    db
      .select({ name: productLocalizations.name })
      .from(productLocalizations)
      .where(
        and(
          eq(productLocalizations.productId, productId),
          eq(productLocalizations.locale, "en"),
        ),
      )
      .limit(1),
    db
      .select({ count: count() })
      .from(productAssets)
      .innerJoin(assets, eq(productAssets.assetId, assets.id))
      .where(
        and(
          eq(productAssets.productId, productId),
          eq(assets.status, "ready"),
          eq(assets.access, "public"),
        ),
      ),
  ]);
  if (!localizations[0]?.name.trim() || Number(imageCount[0]?.count ?? 0) < 1) {
    throw new ProductValidationError("Product publication requirements are incomplete.");
  }
  const updated = await db
    .update(products)
    .set({
      status: "published",
      reviewedByUserId: actor.userId,
      reviewedAt: new Date(),
      publishedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(and(eq(products.id, productId), eq(products.status, "in_review")))
    .returning({ id: products.id });
  if (!updated[0]) {
    throw new ProductValidationError("Only an in-review product can be published.");
  }
  await writeAuditLog(db, {
    actorUserId: actor.userId,
    action: "product.published",
    entityType: "product",
    entityId: productId,
    afterSummary: { status: "published" },
  });
}

export async function confirmRealProductBasis<TQueryResult extends PgQueryResultHKT>(
  db: AppDatabase<TQueryResult>,
  actor: Actor,
  productId: string,
  basis: NonNullable<typeof products.$inferInsert.realProductBasis>,
  evidenceNote?: string,
): Promise<void> {
  requirePermission(actor.role, "products.review");
  await db
    .update(products)
    .set({
      realProductBasis: basis,
      realProductEvidenceNote: evidenceNote?.trim() || null,
      realProductConfirmedByUserId: actor.userId,
      realProductConfirmedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(products.id, productId));
  await writeAuditLog(db, {
    actorUserId: actor.userId,
    action: "product.real_basis.confirmed",
    entityType: "product",
    entityId: productId,
    afterSummary: { basis },
  });
}

export async function reviewProductField<TQueryResult extends PgQueryResultHKT>(
  db: AppDatabase<TQueryResult>,
  actor: Actor,
  productId: string,
  fieldName: "composition" | "weightGsm" | "widthCm",
  status: "verified" | "rejected",
): Promise<void> {
  requirePermission(actor.role, "products.review");
  await db
    .insert(productFieldReviews)
    .values({
      productId,
      fieldName,
      verificationStatus: status,
      reviewedByUserId: actor.userId,
      reviewedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: [productFieldReviews.productId, productFieldReviews.fieldName],
      set: {
        verificationStatus: status,
        reviewedByUserId: actor.userId,
        reviewedAt: new Date(),
      },
    });
  await writeAuditLog(db, {
    actorUserId: actor.userId,
    action: `product.field.${status}`,
    entityType: "product",
    entityId: productId,
    afterSummary: { fieldName, status },
  });
}

export async function setProductIndexStatus<TQueryResult extends PgQueryResultHKT>(
  db: AppDatabase<TQueryResult>,
  actor: Actor,
  productId: string,
  indexStatus: "index" | "noindex",
): Promise<void> {
  requirePermission(actor.role, "seo.manage");
  const rows = await db
    .select({
      status: products.status,
      realProductBasis: products.realProductBasis,
      realProductConfirmedAt: products.realProductConfirmedAt,
      shortDescription: productLocalizations.shortDescription,
      fullDescription: productLocalizations.fullDescription,
      routeId: routes.id,
      title: seoMetadata.title,
      metaDescription: seoMetadata.metaDescription,
    })
    .from(products)
    .innerJoin(
      productLocalizations,
      and(
        eq(products.id, productLocalizations.productId),
        eq(productLocalizations.locale, "en"),
      ),
    )
    .innerJoin(
      routes,
      and(
        eq(routes.entityId, products.id),
        eq(routes.entityType, "product"),
        eq(routes.locale, "en"),
        eq(routes.isCurrent, true),
      ),
    )
    .innerJoin(seoMetadata, eq(seoMetadata.routeId, routes.id))
    .where(eq(products.id, productId))
    .limit(1);
  const product = rows[0];
  if (!product) throw new ProductValidationError("Product SEO record was not found.");
  if (indexStatus === "index") {
    const [imageRows, applicationRows, intentRows] = await Promise.all([
      db
        .select({ count: count() })
        .from(productAssets)
        .innerJoin(assets, eq(productAssets.assetId, assets.id))
        .where(
          and(
            eq(productAssets.productId, productId),
            eq(assets.status, "ready"),
            eq(assets.access, "public"),
            isNotNull(assets.altText),
            ne(assets.altText, ""),
          ),
        ),
      db
        .select({ count: count() })
        .from(productApplications)
        .where(eq(productApplications.productId, productId)),
      db
        .select({ count: count() })
        .from(keywordPageMappings)
        .where(eq(keywordPageMappings.primaryRouteId, product.routeId)),
    ]);
    if (
      product.status !== "published" ||
      !product.realProductBasis ||
      !product.realProductConfirmedAt ||
      !(product.shortDescription?.trim() || product.fullDescription?.trim()) ||
      !product.title?.trim() ||
      !product.metaDescription?.trim() ||
      Number(imageRows[0]?.count ?? 0) < 1 ||
      Number(applicationRows[0]?.count ?? 0) < 1 ||
      Number(intentRows[0]?.count ?? 0) < 1
    ) {
      throw new ProductValidationError(
        "Indexing requires a published, confirmed real Product with unique descriptive and SEO content.",
      );
    }
  }
  await db
    .update(seoMetadata)
    .set({ indexStatus, updatedByUserId: actor.userId, updatedAt: new Date() })
    .where(eq(seoMetadata.routeId, product.routeId));
  await writeAuditLog(db, {
    actorUserId: actor.userId,
    action: "product.index_status.changed",
    entityType: "product",
    entityId: productId,
    afterSummary: { indexStatus },
  });
}

export async function changeProductSlug<TQueryResult extends PgQueryResultHKT>(
  db: AppDatabase<TQueryResult>,
  actor: Actor,
  productId: string,
  requestedSlug: string,
): Promise<void> {
  requirePermission(actor.role, "seo.manage");
  await changeEntityRoute(db, {
    entityType: "product",
    entityId: productId,
    locale: "en",
    newPath: `/products/${slugify(requestedSlug)}`,
    actorUserId: actor.userId,
    reason: "Published product slug changed by an authorized operator",
  });
}
