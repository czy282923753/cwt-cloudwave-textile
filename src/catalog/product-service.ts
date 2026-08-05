import { and, count, desc, eq, gt, inArray, isNotNull, isNull, like, ne, or } from "drizzle-orm";
import type { PgQueryResultHKT } from "drizzle-orm/pg-core/session";
import { z } from "zod";

import { writeAuditLog } from "@/audit/service";
import {
  runGovernedMutation,
  type GovernedMutationOptions,
} from "@/audit/governed-mutation";
import { requirePermission, type UserRole } from "@/auth/permissions";
import {
  assets,
  applications,
  editorialRevisions,
  productAssets,
  productApplications,
  productFaqs,
  productFeatures,
  productFieldReviews,
  productLocalizations,
  products,
  productTaxonomyTerms,
  productTagAssignments,
  productTags,
  redirects,
  routes,
  keywordPageMappings,
  seoMetadata,
  taxonomyTerms,
  users,
} from "@/db/schema";
import type { AppDatabase } from "@/db/types";
import {
  blockDocumentSchema,
  legacyTextToBlockDocument,
  parseBlockDocument,
  type BlockDocument,
} from "@/editorial/blocks";
import {
  resolveBlockPublicProjection,
  type ProductBlockMediaPlacement,
} from "@/editorial/block-references";
import { changeEntityRoute } from "@/seo/redirects";
import { slugify } from "@/seo/path";
import {
  allowedImageMimeTypes,
  publicImageRoles,
  publicReadyImageSqlConditions,
} from "@/uploads/asset-eligibility";

import {
  nextGeneratedProductCode,
  normalizeAssignedProductCode,
  normalizeComposition,
  normalizeMoq,
  normalizePositiveDecimal,
  normalizeProductName,
} from "./product-data";

export class ProductValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ProductValidationError";
  }
}

export class ProductRevisionConflictError extends Error {
  constructor(message = "Product revision was already handled by another reviewer.") {
    super(message);
    this.name = "ProductRevisionConflictError";
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
  productCode?: string;
  requestedSlug?: string;
}

export const eligibleProductImageMimeTypes = allowedImageMimeTypes;

const productRevisionSnapshotSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("editorial_blocks"),
    name: z.string().min(1),
    shortDescription: z.string().nullable(),
    document: blockDocumentSchema,
    expectedEditorDocumentVersion: z.number().int().positive(),
    draftVersion: z.number().int().positive().optional(),
  }),
  z.object({
    kind: z.literal("editorial_copy"),
    name: z.string().min(1),
    shortDescription: z.string().nullable(),
    fullDescription: z.string().nullable(),
  }),
  z.object({
    kind: z.literal("facts"),
    productCode: z.string().nullable().optional(),
    supplierType: z.string().nullable().optional(),
    composition: z.string().nullable().optional(),
    weightGsm: z.string().nullable().optional(),
    widthCm: z.string().nullable().optional(),
    fabricStyle: z.string().nullable().optional(),
    colorOptions: z.string().nullable().optional(),
    moqNote: z.string().nullable().optional(),
    moqValue: z.string().nullable().optional(),
    moqUnit: z.enum(["m", "kg", "roll", "yd"]).nullable().optional(),
    customAvailable: z.enum(["unknown", "yes", "no"]).optional(),
    sampleAvailable: z.enum(["unknown", "yes", "no"]).optional(),
  }),
  z.object({
    kind: z.literal("product_code_correction"),
    previousProductCode: z.string().min(1),
    newProductCode: z.string().min(1),
    reason: z.string().min(1).max(500),
  }),
  z.object({
    kind: z.literal("structure"),
    primaryTaxonomyTermId: z.uuid(),
    additionalTaxonomyTermIds: z.array(z.uuid()),
    applicationIds: z.array(z.uuid()),
    tagNames: z.array(z.string().min(1).max(100)),
    assetIds: z.array(z.uuid()).min(1),
    heroAssetId: z.uuid(),
    media: z.array(z.object({
      assetId: z.uuid(),
      role: z.enum(["hero", "gallery", "detail", "application"]),
      sortOrder: z.number().int().min(0).max(10_000),
      altText: z.string().trim().min(1).max(500).nullable(),
      caption: z.string().trim().min(1).max(1_000).nullable(),
      isVisible: z.boolean(),
    }).strict()).min(1).max(100).optional(),
    features: z.array(z.string().min(1).max(300)),
    faqs: z.array(
      z.object({
        question: z.string().min(1).max(500),
        answer: z.string().min(1).max(5000),
      }),
    ),
    colorOptionsDisplay: z.enum(["inherit", "show", "hide"]),
    customAvailableDisplay: z.enum(["inherit", "show", "hide"]),
    sampleAvailableDisplay: z.enum(["inherit", "show", "hide"]),
    moqNoteDisplay: z.enum(["inherit", "show", "hide"]),
  }),
  z.object({
    kind: z.literal("seo"),
    routeId: z.uuid(),
    title: z.string().nullable(),
    metaDescription: z.string().nullable(),
    focusKeyword: z.string().nullable(),
  }),
]);

async function proposeProductRevision<TQueryResult extends PgQueryResultHKT>(
  db: AppDatabase<TQueryResult>,
  actor: Actor,
  productId: string,
  snapshot: z.infer<typeof productRevisionSnapshotSchema>,
  options: GovernedMutationOptions = {},
): Promise<string> {
  return runGovernedMutation(db, async ({ transaction, audit }) => {
    const latestRows = await transaction
      .select({ versionNumber: editorialRevisions.versionNumber })
      .from(editorialRevisions)
      .where(
        and(
          eq(editorialRevisions.entityType, "product"),
          eq(editorialRevisions.entityId, productId),
          eq(editorialRevisions.locale, "en"),
        ),
      )
      .orderBy(desc(editorialRevisions.versionNumber))
      .limit(1);
    const rows = await transaction
      .insert(editorialRevisions)
      .values({
        entityType: "product",
        entityId: productId,
        locale: "en",
        versionNumber: (latestRows[0]?.versionNumber ?? 0) + 1,
        status: "in_review",
        snapshot,
        changeSummary:
          snapshot.kind === "editorial_blocks" || snapshot.kind === "editorial_copy"
            ? "Published Product editorial update"
            : "Published Product factual update",
        createdByUserId: actor.userId,
      })
      .returning({ id: editorialRevisions.id });
    const revisionId = rows[0]?.id;
    if (!revisionId) throw new Error("Product revision insert failed.");
    await audit({
      actorUserId: actor.userId,
      action: "product.revision.proposed",
      entityType: "editorial_revision",
      entityId: revisionId,
      afterSummary: { productId, kind: snapshot.kind },
    });
    return revisionId;
  }, options);
}

async function uniqueProductPath<TQueryResult extends PgQueryResultHKT>(
  db: AppDatabase<TQueryResult>,
  baseSlug: string,
): Promise<string> {
  for (let suffix = 1; suffix <= 100; suffix += 1) {
    const candidate = `/products/${baseSlug}${suffix === 1 ? "" : `-${suffix}`}/`;
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
        eq(assets.storagePartition, "public"),
        eq(assets.scanStatus, "passed"),
        inArray(assets.detectedMimeType, eligibleProductImageMimeTypes),
        isNull(assets.deletedAt),
      ),
    );
  if (rows.length !== distinct.length) {
    throw new ProductValidationError(
      "Every product image must be a ready public Asset record.",
    );
  }
}

async function allocateGeneratedProductCode<TQueryResult extends PgQueryResultHKT>(
  db: AppDatabase<TQueryResult>,
  primaryTaxonomyTermId: string,
): Promise<string | null> {
  const categoryRows = await db
    .select({
      id: taxonomyTerms.id,
      active: taxonomyTerms.isActive,
      prefix: taxonomyTerms.productCodePrefix,
    })
    .from(taxonomyTerms)
    .where(eq(taxonomyTerms.id, primaryTaxonomyTermId))
    .limit(1)
    .for("update");
  const category = categoryRows[0];
  if (!category?.active) {
    throw new ProductValidationError("Primary Category must be an active taxonomy term.");
  }
  if (!category.prefix) return null;
  const existingRows = await db
    .select({ productCode: products.productCode })
    .from(products)
    .where(like(products.productCode, `CWT-${category.prefix}-%`));
  return nextGeneratedProductCode(
    category.prefix,
    existingRows.flatMap((row) => row.productCode ? [row.productCode] : []),
  );
}

type ProductStructureSnapshot = Extract<
  z.infer<typeof productRevisionSnapshotSchema>,
  { kind: "structure" }
>;

function productStructureMedia(
  snapshot: ProductStructureSnapshot,
): ProductBlockMediaPlacement[] {
  return snapshot.media ?? snapshot.assetIds.map((assetId, index) => ({
    assetId,
    role: assetId === snapshot.heroAssetId ? ("hero" as const) : ("gallery" as const),
    sortOrder: assetId === snapshot.heroAssetId ? 0 : index + 1,
    altText: null,
    caption: null,
    isVisible: true,
  }));
}

async function loadProductBlockDocument<TQueryResult extends PgQueryResultHKT>(
  db: AppDatabase<TQueryResult>,
  productId: string,
): Promise<{ document: BlockDocument; shortDescription: string | null }> {
  const rows = await db
    .select({
      structuredBlocks: productLocalizations.structuredBlocks,
      blocksVersion: productLocalizations.blocksVersion,
      shortDescription: productLocalizations.shortDescription,
    })
    .from(productLocalizations)
    .where(and(
      eq(productLocalizations.productId, productId),
      eq(productLocalizations.locale, "en"),
    ))
    .limit(1);
  const localization = rows[0];
  if (!localization || localization.blocksVersion !== 1) {
    throw new ProductValidationError("Product Block document version is unsupported.");
  }
  return {
    document: parseBlockDocument(localization.structuredBlocks, "product"),
    shortDescription: localization.shortDescription,
  };
}

async function assertProductBlockProjection<TQueryResult extends PgQueryResultHKT>(
  db: AppDatabase<TQueryResult>,
  productId: string,
  document: BlockDocument,
  shortDescription: string | null,
  media?: readonly ProductBlockMediaPlacement[],
): Promise<void> {
  const projection = await resolveBlockPublicProjection(
    db,
    { type: "product", id: productId, ...(media ? { media } : {}) },
    document,
  );
  const indexRows = await db
    .select({ indexStatus: seoMetadata.indexStatus })
    .from(routes)
    .innerJoin(seoMetadata, eq(seoMetadata.routeId, routes.id))
    .where(and(
      eq(routes.entityType, "product"),
      eq(routes.entityId, productId),
      eq(routes.locale, "en"),
      eq(routes.isCurrent, true),
    ))
    .limit(1);
  if (
    indexRows[0]?.indexStatus === "index" &&
    !(shortDescription?.trim() || projection.readableText)
  ) {
    throw new ProductValidationError(
      "An indexed Product revision must retain readable public narrative content.",
    );
  }
}

async function validateProductStructure<TQueryResult extends PgQueryResultHKT>(
  db: AppDatabase<TQueryResult>,
  snapshot: ProductStructureSnapshot,
): Promise<void> {
  const taxonomyIds = [
    snapshot.primaryTaxonomyTermId,
    ...snapshot.additionalTaxonomyTermIds,
  ].filter((id, index, all) => all.indexOf(id) === index);
  const [taxonomyRows, applicationRows] = await Promise.all([
    db
      .select({ id: taxonomyTerms.id })
      .from(taxonomyTerms)
      .where(and(inArray(taxonomyTerms.id, taxonomyIds), eq(taxonomyTerms.isActive, true))),
    snapshot.applicationIds.length
      ? db
          .select({ id: applications.id })
          .from(applications)
          .where(inArray(applications.id, snapshot.applicationIds))
      : Promise.resolve([]),
  ]);
  if (taxonomyRows.length !== taxonomyIds.length) {
    throw new ProductValidationError("Every Product category must be active and valid.");
  }
  if (applicationRows.length !== new Set(snapshot.applicationIds).size) {
    throw new ProductValidationError("Every Product Application must exist.");
  }
  const media = productStructureMedia(snapshot);
  if (!snapshot.assetIds.includes(snapshot.heroAssetId)) {
    throw new ProductValidationError("Hero Image must belong to the Product images.");
  }
  if (
    media.length !== snapshot.assetIds.length ||
    new Set(media.map((item) => item.assetId)).size !== media.length ||
    media.some((item) => !snapshot.assetIds.includes(item.assetId))
  ) {
    throw new ProductValidationError("Product media placements must match Product image Assets exactly.");
  }
  const hero = media.filter((item) => item.role === "hero");
  if (hero.length !== 1 || hero[0]?.assetId !== snapshot.heroAssetId || !hero[0].isVisible) {
    throw new ProductValidationError("Product media requires exactly one visible Primary image.");
  }
  await assertDraftAssets(db, media.map((item) => item.assetId));
}

async function applyProductStructure<TQueryResult extends PgQueryResultHKT>(
  db: AppDatabase<TQueryResult>,
  productId: string,
  snapshot: ProductStructureSnapshot,
): Promise<void> {
  const taxonomyIds = [
    snapshot.primaryTaxonomyTermId,
    ...snapshot.additionalTaxonomyTermIds,
  ].filter((id, index, all) => all.indexOf(id) === index);
  const media = productStructureMedia(snapshot);
  const applicationIds = [...new Set(snapshot.applicationIds)];

  await db.delete(productTaxonomyTerms).where(eq(productTaxonomyTerms.productId, productId));
  await db.insert(productTaxonomyTerms).values(
    taxonomyIds.map((taxonomyTermId) => ({
      productId,
      taxonomyTermId,
      isPrimary: taxonomyTermId === snapshot.primaryTaxonomyTermId,
    })),
  );

  await db.delete(productApplications).where(eq(productApplications.productId, productId));
  if (applicationIds.length) {
    await db.insert(productApplications).values(
      applicationIds.map((applicationId) => ({ productId, applicationId })),
    );
  }

  await db.delete(productAssets).where(eq(productAssets.productId, productId));
  await db.insert(productAssets).values(
    media.map((item) => ({
      productId,
      assetId: item.assetId,
      role: item.role,
      sortOrder: item.sortOrder,
      altText: item.altText,
      caption: item.caption,
      isVisible: item.isVisible,
    })),
  );

  await db.delete(productFeatures).where(eq(productFeatures.productId, productId));
  if (snapshot.features.length) {
    await db.insert(productFeatures).values(
      snapshot.features.map((label, sortOrder) => ({
        productId,
        locale: "en",
        label,
        sortOrder,
      })),
    );
  }

  await db.delete(productFaqs).where(eq(productFaqs.productId, productId));
  if (snapshot.faqs.length) {
    await db.insert(productFaqs).values(
      snapshot.faqs.map((faq, sortOrder) => ({
        productId,
        locale: "en",
        question: faq.question,
        answer: faq.answer,
        sortOrder,
      })),
    );
  }

  await db
    .delete(productTagAssignments)
    .where(eq(productTagAssignments.productId, productId));
  for (const name of snapshot.tagNames) {
    const slug = slugify(name);
    await db
      .insert(productTags)
      .values({ name, slug })
      .onConflictDoNothing({ target: productTags.slug });
    const tagRows = await db
      .select({ id: productTags.id })
      .from(productTags)
      .where(eq(productTags.slug, slug))
      .limit(1);
    const tagId = tagRows[0]?.id;
    if (!tagId) throw new ProductValidationError("Product Tag could not be resolved.");
    await db.insert(productTagAssignments).values({ productId, tagId });
  }

  await db
    .update(products)
    .set({
      colorOptionsDisplay: snapshot.colorOptionsDisplay,
      customAvailableDisplay: snapshot.customAvailableDisplay,
      sampleAvailableDisplay: snapshot.sampleAvailableDisplay,
      moqNoteDisplay: snapshot.moqNoteDisplay,
      updatedAt: new Date(),
    })
    .where(eq(products.id, productId));
}

export async function createProductDraft<TQueryResult extends PgQueryResultHKT>(
  db: AppDatabase<TQueryResult>,
  actor: Actor,
  input: CreateProductDraftInput,
): Promise<string> {
  requirePermission(actor.role, "products.write");
  const name = normalizeProductName(input.name);
  await assertDraftAssets(db, input.assetIds);
  const baseSlug = slugify(input.requestedSlug ?? name);
  const path = await uniqueProductPath(db, baseSlug);

  return db.transaction(async (transaction) => {
    const assignedCode = input.productCode
      ? normalizeAssignedProductCode(input.productCode)
      : await allocateGeneratedProductCode(transaction, input.primaryTaxonomyTermId);
    const productRows = await transaction
      .insert(products)
      .values({
        status: "draft",
        productCode: assignedCode,
        productCodeAssignedAt: assignedCode ? new Date() : null,
        createdByUserId: actor.userId,
      })
      .returning({ id: products.id });
    const productId = productRows[0]?.id;
    if (!productId) throw new Error("Product insert did not return an ID.");
    await transaction.insert(productLocalizations).values({
      productId,
      locale: "en",
      name,
      structuredBlocks: { version: 1, blocks: [] },
      blocksVersion: 1,
      editorDocumentVersion: 1,
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
  options: GovernedMutationOptions = {},
): Promise<void> {
  requirePermission(actor.role, "products.write");
  await runGovernedMutation(db, async ({ transaction, audit }) => {
    const updated = await transaction
      .update(products)
      .set({ status: "in_review", updatedAt: new Date() })
      .where(and(eq(products.id, productId), eq(products.status, "draft")))
      .returning({ id: products.id });
    if (!updated[0]) throw new ProductValidationError("Only a draft can enter review.");
    await audit({
      actorUserId: actor.userId,
      action: "product.review.requested",
      entityType: "product",
      entityId: productId,
    });
  }, options);
}

export async function rejectProductReview<TQueryResult extends PgQueryResultHKT>(
  db: AppDatabase<TQueryResult>,
  actor: Actor,
  productId: string,
  reason: string,
  options: GovernedMutationOptions = {},
): Promise<void> {
  requirePermission(actor.role, "products.review");
  if (!reason.trim()) throw new ProductValidationError("Review rejection requires a reason.");
  await runGovernedMutation(db, async ({ transaction, audit }) => {
    const updated = await transaction
      .update(products)
      .set({ status: "draft", reviewedByUserId: actor.userId, reviewedAt: new Date(), updatedAt: new Date() })
      .where(and(eq(products.id, productId), eq(products.status, "in_review")))
      .returning({ id: products.id });
    if (!updated[0]) throw new ProductValidationError("Only an in-review Product can be rejected.");
    await audit({
      actorUserId: actor.userId,
      action: "product.review.rejected",
      entityType: "product",
      entityId: productId,
      afterSummary: { reason: reason.trim().slice(0, 500) },
    });
  }, options);
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
    structuredDocument?: BlockDocument;
    expectedEditorDocumentVersion?: number;
  },
): Promise<string | null> {
  requirePermission(actor.role, "products.write");
  const name = normalizeProductName(input.name);
  const productRows = await db
    .select({
      status: products.status,
      editorDocumentVersion: productLocalizations.editorDocumentVersion,
    })
    .from(products)
    .innerJoin(
      productLocalizations,
      and(
        eq(productLocalizations.productId, products.id),
        eq(productLocalizations.locale, "en"),
      ),
    )
    .where(eq(products.id, productId))
    .limit(1);
  const product = productRows[0];
  if (!product) throw new ProductValidationError("Product was not found.");
  const snapshot = productRevisionSnapshotSchema.parse({
    kind: "editorial_blocks",
    name,
    shortDescription: input.shortDescription?.trim() || null,
    document: input.structuredDocument
      ? parseBlockDocument(input.structuredDocument, "product")
      : legacyTextToBlockDocument(input.fullDescription),
    expectedEditorDocumentVersion:
      input.expectedEditorDocumentVersion ?? product.editorDocumentVersion,
  });
  if (snapshot.kind !== "editorial_blocks") {
    throw new ProductValidationError("Invalid Product editorial revision.");
  }
  if (snapshot.expectedEditorDocumentVersion !== product.editorDocumentVersion) {
    throw new ProductRevisionConflictError(
      "Product narrative changed after this editor loaded; refresh before saving.",
    );
  }
  await assertProductBlockProjection(
    db,
    productId,
    snapshot.document,
    snapshot.shortDescription,
  );
  if (product.status === "published") {
    return proposeProductRevision(db, actor, productId, snapshot);
  }
  if (product.status === "archived") {
    throw new ProductValidationError("Archived Products cannot be edited.");
  }
  await db.transaction(async (transaction) => {
    const updated = await transaction
      .update(productLocalizations)
      .set({
        name: snapshot.name,
        shortDescription: snapshot.shortDescription,
        structuredBlocks: snapshot.document,
        blocksVersion: snapshot.document.version,
        editorDocumentVersion: snapshot.expectedEditorDocumentVersion + 1,
      })
      .where(
        and(
          eq(productLocalizations.productId, productId),
          eq(productLocalizations.locale, "en"),
          eq(
            productLocalizations.editorDocumentVersion,
            snapshot.expectedEditorDocumentVersion,
          ),
        ),
      )
      .returning({ productId: productLocalizations.productId });
    if (!updated[0]) {
      throw new ProductRevisionConflictError(
        "Product narrative changed after this editor loaded; refresh before saving.",
      );
    }
    await transaction
      .update(products)
      .set({ updatedAt: new Date() })
      .where(eq(products.id, productId));
    await writeAuditLog(transaction, {
      actorUserId: actor.userId,
      action: "product.editorial.updated",
      entityType: "product",
      entityId: productId,
    });
  });
  return null;
}

export async function updateProductBlocks<TQueryResult extends PgQueryResultHKT>(
  db: AppDatabase<TQueryResult>,
  actor: Actor,
  productId: string,
  input: {
    name: string;
    shortDescription?: string | null;
    document: BlockDocument;
    expectedEditorDocumentVersion: number;
  },
): Promise<string | null> {
  const document = parseBlockDocument(input.document, "product");
  return updateProductEditorialCopy(db, actor, productId, {
    name: input.name,
    ...(input.shortDescription !== undefined
      ? { shortDescription: input.shortDescription }
      : {}),
    fullDescription: null,
    structuredDocument: document,
    expectedEditorDocumentVersion: input.expectedEditorDocumentVersion,
  });
}

export interface ProductBlockDraftSaveResult {
  editorDocumentVersion: number;
  revisionId: string | null;
  revisionVersion: number | null;
}

export async function saveProductBlockDraft<TQueryResult extends PgQueryResultHKT>(
  db: AppDatabase<TQueryResult>,
  actor: Actor,
  productId: string,
  input: {
    name: string;
    shortDescription?: string | null;
    document: BlockDocument;
    expectedEditorDocumentVersion: number;
    revisionId?: string | null;
    expectedRevisionVersion?: number | null;
  },
  options: GovernedMutationOptions = {},
): Promise<ProductBlockDraftSaveResult> {
  requirePermission(actor.role, "products.write");
  const document = parseBlockDocument(input.document, "product");
  const name = normalizeProductName(input.name);
  const shortDescription = input.shortDescription?.trim() || null;
  const productRows = await db
    .select({
      status: products.status,
      editorDocumentVersion: productLocalizations.editorDocumentVersion,
    })
    .from(products)
    .innerJoin(productLocalizations, and(
      eq(productLocalizations.productId, products.id),
      eq(productLocalizations.locale, "en"),
    ))
    .where(eq(products.id, productId))
    .limit(1);
  const product = productRows[0];
  if (!product) throw new ProductValidationError("Product was not found.");
  if (product.status === "archived") {
    throw new ProductValidationError("Archived Products cannot be edited.");
  }
  if (input.expectedEditorDocumentVersion !== product.editorDocumentVersion) {
    throw new ProductRevisionConflictError(
      "Product narrative changed after this editor loaded; refresh before saving.",
    );
  }
  await assertProductBlockProjection(db, productId, document, shortDescription);
  if (product.status !== "published") {
    await updateProductBlocks(db, actor, productId, {
      name,
      shortDescription,
      document,
      expectedEditorDocumentVersion: input.expectedEditorDocumentVersion,
    });
    return {
      editorDocumentVersion: input.expectedEditorDocumentVersion + 1,
      revisionId: null,
      revisionVersion: null,
    };
  }

  return runGovernedMutation(db, async ({ transaction, audit }) => {
    const localizationRows = await transaction
      .select({ editorDocumentVersion: productLocalizations.editorDocumentVersion })
      .from(productLocalizations)
      .where(and(
        eq(productLocalizations.productId, productId),
        eq(productLocalizations.locale, "en"),
      ))
      .limit(1)
      .for("update");
    if (localizationRows[0]?.editorDocumentVersion !== input.expectedEditorDocumentVersion) {
      throw new ProductRevisionConflictError(
        "Product narrative changed after this editor loaded; refresh before saving.",
      );
    }
    const draftRows = await transaction
      .select()
      .from(editorialRevisions)
      .where(and(
        eq(editorialRevisions.entityType, "product"),
        eq(editorialRevisions.entityId, productId),
        eq(editorialRevisions.locale, "en"),
        eq(editorialRevisions.status, "draft"),
      ))
      .orderBy(desc(editorialRevisions.versionNumber))
      .limit(1)
      .for("update");
    const draft = draftRows[0];
    const expectedRevisionVersion = input.expectedRevisionVersion ?? 0;
    if (draft) {
      if (input.revisionId && input.revisionId !== draft.id) {
        throw new ProductRevisionConflictError("A different Product Draft Revision is current.");
      }
      const current = productRevisionSnapshotSchema.parse(draft.snapshot);
      if (current.kind !== "editorial_blocks") {
        throw new ProductRevisionConflictError("A different Product Draft Revision is current.");
      }
      const currentDraftVersion = current.draftVersion ?? 1;
      const proposedSnapshot = productRevisionSnapshotSchema.parse({
        kind: "editorial_blocks",
        name,
        shortDescription,
        document,
        expectedEditorDocumentVersion: input.expectedEditorDocumentVersion,
        draftVersion: currentDraftVersion + 1,
      });
      if (expectedRevisionVersion !== currentDraftVersion) {
        const samePayload = JSON.stringify({
          name: current.name,
          shortDescription: current.shortDescription,
          document: current.document,
        }) === JSON.stringify({ name, shortDescription, document });
        if (samePayload) {
          return {
            editorDocumentVersion: input.expectedEditorDocumentVersion,
            revisionId: draft.id,
            revisionVersion: currentDraftVersion,
          };
        }
        throw new ProductRevisionConflictError(
          "Product Draft Revision changed in another editor; reload before saving.",
        );
      }
      await transaction
        .update(editorialRevisions)
        .set({
          snapshot: proposedSnapshot,
          changeSummary: "Product Block Draft autosave",
        })
        .where(and(
          eq(editorialRevisions.id, draft.id),
          eq(editorialRevisions.status, "draft"),
        ));
      await audit({
        actorUserId: actor.userId,
        action: "product.block_draft.saved",
        entityType: "editorial_revision",
        entityId: draft.id,
        afterSummary: { productId, draftVersion: currentDraftVersion + 1 },
      });
      return {
        editorDocumentVersion: input.expectedEditorDocumentVersion,
        revisionId: draft.id,
        revisionVersion: currentDraftVersion + 1,
      };
    }
    if (input.revisionId || expectedRevisionVersion !== 0) {
      throw new ProductRevisionConflictError("Product Draft Revision is no longer available.");
    }
    const latestRows = await transaction
      .select({ versionNumber: editorialRevisions.versionNumber })
      .from(editorialRevisions)
      .where(and(
        eq(editorialRevisions.entityType, "product"),
        eq(editorialRevisions.entityId, productId),
        eq(editorialRevisions.locale, "en"),
      ))
      .orderBy(desc(editorialRevisions.versionNumber))
      .limit(1);
    const snapshot = productRevisionSnapshotSchema.parse({
      kind: "editorial_blocks",
      name,
      shortDescription,
      document,
      expectedEditorDocumentVersion: input.expectedEditorDocumentVersion,
      draftVersion: 1,
    });
    const inserted = await transaction
      .insert(editorialRevisions)
      .values({
        entityType: "product",
        entityId: productId,
        locale: "en",
        versionNumber: (latestRows[0]?.versionNumber ?? 0) + 1,
        status: "draft",
        snapshot,
        changeSummary: "Product Block Draft",
        createdByUserId: actor.userId,
      })
      .returning({ id: editorialRevisions.id });
    const revisionId = inserted[0]?.id;
    if (!revisionId) throw new ProductValidationError("Product Draft Revision insert failed.");
    await audit({
      actorUserId: actor.userId,
      action: "product.block_draft.created",
      entityType: "editorial_revision",
      entityId: revisionId,
      afterSummary: { productId, draftVersion: 1 },
    });
    return {
      editorDocumentVersion: input.expectedEditorDocumentVersion,
      revisionId,
      revisionVersion: 1,
    };
  }, options);
}

export async function submitProductBlockDraftForReview<
  TQueryResult extends PgQueryResultHKT,
>(
  db: AppDatabase<TQueryResult>,
  actor: Actor,
  productId: string,
  revisionId: string,
  options: GovernedMutationOptions = {},
): Promise<void> {
  requirePermission(actor.role, "products.write");
  await runGovernedMutation(db, async ({ transaction, audit }) => {
    const updated = await transaction
      .update(editorialRevisions)
      .set({ status: "in_review", changeSummary: "Product Block Draft submitted for review" })
      .where(and(
        eq(editorialRevisions.id, revisionId),
        eq(editorialRevisions.entityType, "product"),
        eq(editorialRevisions.entityId, productId),
        eq(editorialRevisions.status, "draft"),
      ))
      .returning({ id: editorialRevisions.id });
    if (!updated[0]) throw new ProductRevisionConflictError("Product Draft Revision is not current.");
    await audit({
      actorUserId: actor.userId,
      action: "product.block_draft.review_requested",
      entityType: "editorial_revision",
      entityId: revisionId,
      afterSummary: { productId },
    });
  }, options);
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
    moqValue?: string | null;
    moqUnit?: "m" | "kg" | "roll" | "yd" | null;
    customAvailable?: "unknown" | "yes" | "no";
    sampleAvailable?: "unknown" | "yes" | "no";
  },
): Promise<string | null> {
  requirePermission(actor.role, "products.write");
  const statusRows = await db
    .select({ status: products.status, productCode: products.productCode })
    .from(products)
    .where(eq(products.id, productId))
    .limit(1);
  const currentStatus = statusRows[0]?.status;
  if (!currentStatus) throw new ProductValidationError("Product was not found.");
  if (currentStatus === "archived") {
    throw new ProductValidationError("Archived Products cannot be edited.");
  }
  const requestedProductCode = input.productCode === undefined
    ? undefined
    : input.productCode?.trim()
      ? normalizeAssignedProductCode(input.productCode)
      : null;
  const currentProductCode = statusRows[0]?.productCode ?? null;
  if (currentProductCode && requestedProductCode !== undefined && requestedProductCode !== currentProductCode) {
    throw new ProductValidationError(
      "Assigned Product Codes are immutable here; an Admin must use the dedicated correction flow with a reason.",
    );
  }
  const normalizedMoq = input.moqValue !== undefined || input.moqUnit !== undefined
    ? normalizeMoq(input.moqValue, input.moqUnit)
    : null;
  const normalized = productRevisionSnapshotSchema.parse({
    kind: "facts",
    ...(input.productCode !== undefined
      ? { productCode: requestedProductCode }
      : {}),
    ...(input.supplierType !== undefined
      ? { supplierType: input.supplierType?.trim() || null }
      : {}),
    ...(input.composition !== undefined
      ? { composition: normalizeComposition(input.composition) }
      : {}),
    ...(input.weightGsm !== undefined
      ? { weightGsm: normalizePositiveDecimal(input.weightGsm, "GSM") }
      : {}),
    ...(input.widthCm !== undefined
      ? { widthCm: normalizePositiveDecimal(input.widthCm, "Width") }
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
    ...(normalizedMoq
      ? { moqValue: normalizedMoq.moqValue, moqUnit: normalizedMoq.moqUnit }
      : {}),
    ...(input.customAvailable !== undefined
      ? { customAvailable: input.customAvailable }
      : {}),
    ...(input.sampleAvailable !== undefined
      ? { sampleAvailable: input.sampleAvailable }
      : {}),
  });
  if (normalized.kind !== "facts") {
    throw new ProductValidationError("Invalid Product facts revision.");
  }
  if (currentStatus === "published") {
    return proposeProductRevision(db, actor, productId, normalized);
  }
  const reviewedFacts = ["composition", "weightGsm", "widthCm", "moqValue", "moqUnit"]
    .flatMap((fieldName) => fieldName in normalized ? [fieldName] : []);

  await db.transaction(async (transaction) => {
    await transaction
      .update(products)
      .set({
        ...(normalized.productCode !== undefined
          ? {
              productCode: normalized.productCode,
              productCodeAssignedAt:
                normalized.productCode && !currentProductCode ? new Date() : undefined,
            }
          : {}),
        ...(normalized.supplierType !== undefined
          ? { supplierType: normalized.supplierType }
          : {}),
        ...(normalized.composition !== undefined
          ? { composition: normalized.composition }
          : {}),
        ...(normalized.weightGsm !== undefined
          ? { weightGsm: normalized.weightGsm }
          : {}),
        ...(normalized.widthCm !== undefined
          ? { widthCm: normalized.widthCm }
          : {}),
        ...(normalized.fabricStyle !== undefined
          ? { fabricStyle: normalized.fabricStyle }
          : {}),
        ...(normalized.colorOptions !== undefined
          ? { colorOptions: normalized.colorOptions }
          : {}),
        ...(normalized.moqNote !== undefined
          ? { moqNote: normalized.moqNote }
          : {}),
        ...(normalized.moqValue !== undefined
          ? { moqValue: normalized.moqValue }
          : {}),
        ...(normalized.moqUnit !== undefined
          ? { moqUnit: normalized.moqUnit }
          : {}),
        ...(normalized.customAvailable !== undefined
          ? { customAvailable: normalized.customAvailable }
          : {}),
        ...(normalized.sampleAvailable !== undefined
          ? { sampleAvailable: normalized.sampleAvailable }
          : {}),
        updatedAt: new Date(),
      })
      .where(eq(products.id, productId));
    for (const fieldName of reviewedFacts) {
      const value = normalized[fieldName as keyof typeof normalized];
      await transaction
        .insert(productFieldReviews)
        .values({
          productId,
          fieldName,
          verificationStatus: value ? "provided" : "empty",
        })
        .onConflictDoUpdate({
          target: [productFieldReviews.productId, productFieldReviews.fieldName],
          set: {
            verificationStatus: value ? "provided" : "empty",
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
      afterSummary: { changedFactualFields: reviewedFacts },
    });
  });
  return null;
}

export async function assignGeneratedProductCode<TQueryResult extends PgQueryResultHKT>(
  db: AppDatabase<TQueryResult>,
  actor: Actor,
  productId: string,
  options: GovernedMutationOptions = {},
): Promise<string> {
  requirePermission(actor.role, "products.write");
  return runGovernedMutation(db, async ({ transaction, audit }) => {
    const rows = await transaction
      .select({
        status: products.status,
        productCode: products.productCode,
        primaryTaxonomyTermId: productTaxonomyTerms.taxonomyTermId,
      })
      .from(products)
      .innerJoin(
        productTaxonomyTerms,
        and(
          eq(productTaxonomyTerms.productId, products.id),
          eq(productTaxonomyTerms.isPrimary, true),
        ),
      )
      .where(eq(products.id, productId))
      .limit(1);
    const product = rows[0];
    if (!product) throw new ProductValidationError("Product was not found.");
    if (product.status === "published" || product.status === "archived") {
      throw new ProductValidationError(
        "Automatic Product Code assignment is limited to editable non-published Products.",
      );
    }
    if (product.productCode) {
      throw new ProductValidationError("Product Code is already assigned and cannot be regenerated.");
    }
    const productCode = await allocateGeneratedProductCode(
      transaction,
      product.primaryTaxonomyTermId,
    );
    if (!productCode) {
      throw new ProductValidationError(
        "Primary Category has no approved Product Code prefix; automatic generation is refused.",
      );
    }
    const updated = await transaction
      .update(products)
      .set({ productCode, productCodeAssignedAt: new Date(), updatedAt: new Date() })
      .where(and(eq(products.id, productId), isNull(products.productCode)))
      .returning({ id: products.id });
    if (!updated[0]) {
      throw new ProductValidationError("Product Code was assigned by another operation.");
    }
    await audit({
      actorUserId: actor.userId,
      action: "product.code.assigned",
      entityType: "product",
      entityId: productId,
      afterSummary: { productCode },
    });
    return productCode;
  }, options);
}

export async function correctProductCode<TQueryResult extends PgQueryResultHKT>(
  db: AppDatabase<TQueryResult>,
  actor: Actor,
  productId: string,
  newProductCodeInput: string,
  reasonInput: string,
  options: GovernedMutationOptions = {},
): Promise<string | null> {
  if (actor.role !== "admin") {
    throw new ProductValidationError("Only an Admin may correct an assigned Product Code.");
  }
  const reason = reasonInput.trim();
  if (!reason) throw new ProductValidationError("Product Code correction requires a reason.");
  const newProductCode = normalizeAssignedProductCode(newProductCodeInput);
  const rows = await db
    .select({ status: products.status, productCode: products.productCode })
    .from(products)
    .where(eq(products.id, productId))
    .limit(1);
  const product = rows[0];
  if (!product) throw new ProductValidationError("Product was not found.");
  if (!product.productCode) {
    throw new ProductValidationError(
      "Unassigned Product Codes use the ordinary assignment flow, not correction.",
    );
  }
  if (product.productCode === newProductCode) {
    throw new ProductValidationError("Corrected Product Code must differ from the current code.");
  }
  if (product.status === "archived") {
    throw new ProductValidationError("Archived Products cannot be corrected.");
  }
  const snapshot = productRevisionSnapshotSchema.parse({
    kind: "product_code_correction",
    previousProductCode: product.productCode,
    newProductCode,
    reason: reason.slice(0, 500),
  });
  if (product.status === "published") {
    return proposeProductRevision(db, actor, productId, snapshot, options);
  }
  await runGovernedMutation(db, async ({ transaction, audit }) => {
    const updated = await transaction
      .update(products)
      .set({
        productCode: newProductCode,
        productCodeAssignedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(products.id, productId),
          eq(products.productCode, product.productCode!),
        ),
      )
      .returning({ id: products.id });
    if (!updated[0]) throw new ProductRevisionConflictError("Product Code changed concurrently.");
    await audit({
      actorUserId: actor.userId,
      action: "product.code.corrected",
      entityType: "product",
      entityId: productId,
      beforeSummary: { productCode: product.productCode },
      afterSummary: { productCode: newProductCode, reason: reason.slice(0, 500) },
    });
  }, options);
  return null;
}

export async function updateProductStructure<TQueryResult extends PgQueryResultHKT>(
  db: AppDatabase<TQueryResult>,
  actor: Actor,
  productId: string,
  input: Omit<ProductStructureSnapshot, "kind">,
  options: GovernedMutationOptions = {},
): Promise<string | null> {
  requirePermission(actor.role, "products.write");
  const statusRows = await db
    .select({ status: products.status })
    .from(products)
    .where(eq(products.id, productId))
    .limit(1);
  const status = statusRows[0]?.status;
  if (!status) throw new ProductValidationError("Product was not found.");
  if (status === "archived") {
    throw new ProductValidationError("Archived Products cannot be edited.");
  }
  const snapshot = productRevisionSnapshotSchema.parse({
    kind: "structure",
    ...input,
    additionalTaxonomyTermIds: [...new Set(input.additionalTaxonomyTermIds)],
    applicationIds: [...new Set(input.applicationIds)],
    assetIds: [...new Set(input.assetIds)],
    ...(input.media
      ? {
          media: input.media.map((item) => ({
            ...item,
            altText: item.altText?.trim() || null,
            caption: item.caption?.trim() || null,
          })),
        }
      : {}),
    tagNames: input.tagNames
      .map((name) => name.trim())
      .filter(Boolean)
      .filter((name, index, all) =>
        all.findIndex((candidate) => slugify(candidate) === slugify(name)) === index,
      ),
    features: input.features.map((value) => value.trim()).filter(Boolean),
    faqs: input.faqs.map((faq) => ({
      question: faq.question.trim(),
      answer: faq.answer.trim(),
    })),
  });
  if (snapshot.kind !== "structure") {
    throw new ProductValidationError("Invalid Product structure revision.");
  }
  await validateProductStructure(db, snapshot);
  const currentNarrative = await loadProductBlockDocument(db, productId);
  await assertProductBlockProjection(
    db,
    productId,
    currentNarrative.document,
    currentNarrative.shortDescription,
    productStructureMedia(snapshot),
  );
  if (status === "published") {
    return proposeProductRevision(db, actor, productId, snapshot, options);
  }
  await runGovernedMutation(db, async ({ transaction, audit }) => {
    await applyProductStructure(transaction, productId, snapshot);
    await assertProductBlockProjection(
      transaction,
      productId,
      currentNarrative.document,
      currentNarrative.shortDescription,
    );
    await audit({
      actorUserId: actor.userId,
      action: "product.structure.updated",
      entityType: "product",
      entityId: productId,
    });
  }, options);
  return null;
}

export async function updateProductSeo<TQueryResult extends PgQueryResultHKT>(
  db: AppDatabase<TQueryResult>,
  actor: Actor,
  productId: string,
  input: {
    title?: string | null;
    metaDescription?: string | null;
    focusKeyword?: string | null;
  },
): Promise<string | null> {
  requirePermission(actor.role, "seo.manage");
  const rows = await db
    .select({ status: products.status, routeId: routes.id })
    .from(products)
    .innerJoin(
      routes,
      and(
        eq(routes.entityType, "product"),
        eq(routes.entityId, products.id),
        eq(routes.locale, "en"),
        eq(routes.isCurrent, true),
      ),
    )
    .where(eq(products.id, productId))
    .limit(1);
  const product = rows[0];
  if (!product) throw new ProductValidationError("Product SEO route was not found.");
  const snapshot = productRevisionSnapshotSchema.parse({
    kind: "seo",
    routeId: product.routeId,
    title: input.title?.trim() || null,
    metaDescription: input.metaDescription?.trim() || null,
    focusKeyword: input.focusKeyword?.trim() || null,
  });
  if (snapshot.kind !== "seo") {
    throw new ProductValidationError("Invalid Product SEO revision.");
  }
  if (product.status === "published") {
    return proposeProductRevision(db, actor, productId, snapshot);
  }
  if (product.status === "archived") {
    throw new ProductValidationError("Archived Products cannot be edited.");
  }
  await db.transaction(async (transaction) => {
    await transaction
      .update(seoMetadata)
      .set({
        title: snapshot.title,
        metaDescription: snapshot.metaDescription,
        focusKeyword: snapshot.focusKeyword,
        updatedByUserId: actor.userId,
        updatedAt: new Date(),
      })
      .where(eq(seoMetadata.routeId, snapshot.routeId));
    await writeAuditLog(transaction, {
      actorUserId: actor.userId,
      action: "product.seo.updated",
      entityType: "product",
      entityId: productId,
    });
  });
  return null;
}

export async function applyProductRevision<TQueryResult extends PgQueryResultHKT>(
  db: AppDatabase<TQueryResult>,
  actor: Actor,
  revisionId: string,
  options: GovernedMutationOptions = {},
): Promise<string> {
  requirePermission(actor.role, "products.publish");
  return runGovernedMutation(db, async ({ transaction, audit }) => {
    const claimedRows = await transaction
      .update(editorialRevisions)
      .set({
        status: "applied",
        reviewedByUserId: actor.userId,
        reviewedAt: new Date(),
      })
      .where(
        and(
          eq(editorialRevisions.id, revisionId),
          eq(editorialRevisions.entityType, "product"),
          eq(editorialRevisions.status, "in_review"),
        ),
      )
      .returning();
    const revision = claimedRows[0];
    if (!revision) {
      const currentRows = await transaction
        .select({
          entityType: editorialRevisions.entityType,
          entityId: editorialRevisions.entityId,
          status: editorialRevisions.status,
          reviewedByUserId: editorialRevisions.reviewedByUserId,
        })
        .from(editorialRevisions)
        .where(eq(editorialRevisions.id, revisionId))
        .limit(1);
      const current = currentRows[0];
      if (!current || current.entityType !== "product") {
        throw new ProductValidationError("Product revision is not eligible for approval.");
      }
      if (current.status === "applied" && current.reviewedByUserId === actor.userId) {
        return current.entityId;
      }
      throw new ProductRevisionConflictError();
    }
    const newer = await transaction
      .select({ id: editorialRevisions.id })
      .from(editorialRevisions)
      .where(
        and(
          eq(editorialRevisions.entityType, "product"),
          eq(editorialRevisions.entityId, revision.entityId),
          eq(editorialRevisions.locale, revision.locale),
          gt(editorialRevisions.versionNumber, revision.versionNumber),
        ),
      )
      .limit(1);
    if (newer[0]) {
      throw new ProductValidationError(
        "A newer Product revision exists; this revision is stale.",
      );
    }
    const snapshot = productRevisionSnapshotSchema.parse(revision.snapshot);
    const currentNarrative = await loadProductBlockDocument(transaction, revision.entityId);
    const finalDocument = snapshot.kind === "editorial_blocks"
      ? parseBlockDocument(snapshot.document, "product")
      : snapshot.kind === "editorial_copy"
        ? legacyTextToBlockDocument(snapshot.fullDescription)
        : currentNarrative.document;
    const finalShortDescription = snapshot.kind === "editorial_blocks" || snapshot.kind === "editorial_copy"
      ? snapshot.shortDescription
      : currentNarrative.shortDescription;
    await assertProductBlockProjection(
      transaction,
      revision.entityId,
      finalDocument,
      finalShortDescription,
      snapshot.kind === "structure" ? productStructureMedia(snapshot) : undefined,
    );
    if (snapshot.kind === "editorial_blocks") {
      const updated = await transaction
        .update(productLocalizations)
        .set({
          name: snapshot.name,
          shortDescription: snapshot.shortDescription,
          structuredBlocks: parseBlockDocument(snapshot.document, "product"),
          blocksVersion: snapshot.document.version,
          editorDocumentVersion: snapshot.expectedEditorDocumentVersion + 1,
        })
        .where(
          and(
            eq(productLocalizations.productId, revision.entityId),
            eq(productLocalizations.locale, revision.locale),
            eq(
              productLocalizations.editorDocumentVersion,
              snapshot.expectedEditorDocumentVersion,
            ),
          ),
        )
        .returning({ productId: productLocalizations.productId });
      if (!updated[0]) {
        throw new ProductRevisionConflictError(
          "Product narrative changed after this revision was proposed.",
        );
      }
    } else if (snapshot.kind === "editorial_copy") {
      const localizationRows = await transaction
        .select({ editorDocumentVersion: productLocalizations.editorDocumentVersion })
        .from(productLocalizations)
        .where(
          and(
            eq(productLocalizations.productId, revision.entityId),
            eq(productLocalizations.locale, revision.locale),
          ),
        )
        .limit(1);
      const editorDocumentVersion = localizationRows[0]?.editorDocumentVersion;
      if (!editorDocumentVersion) throw new ProductValidationError("Product localization was not found.");
      await transaction
        .update(productLocalizations)
        .set({
          name: snapshot.name,
          shortDescription: snapshot.shortDescription,
          structuredBlocks: legacyTextToBlockDocument(snapshot.fullDescription),
          blocksVersion: 1,
          editorDocumentVersion: editorDocumentVersion + 1,
        })
        .where(
          and(
            eq(productLocalizations.productId, revision.entityId),
            eq(productLocalizations.locale, revision.locale),
          ),
        );
    } else if (snapshot.kind === "facts") {
      if (snapshot.productCode !== undefined) {
        const currentCodeRows = await transaction
          .select({ productCode: products.productCode })
          .from(products)
          .where(eq(products.id, revision.entityId))
          .limit(1);
        const currentCode = currentCodeRows[0]?.productCode ?? null;
        if (currentCode && snapshot.productCode !== currentCode) {
          throw new ProductValidationError(
            "Assigned Product Codes require the dedicated Admin correction revision.",
          );
        }
      }
      await transaction
        .update(products)
        .set({
          ...(snapshot.productCode !== undefined
            ? {
                productCode: snapshot.productCode,
                productCodeAssignedAt: snapshot.productCode ? new Date() : null,
              }
            : {}),
          ...(snapshot.supplierType !== undefined
            ? { supplierType: snapshot.supplierType }
            : {}),
          ...(snapshot.composition !== undefined
            ? { composition: snapshot.composition }
            : {}),
          ...(snapshot.weightGsm !== undefined ? { weightGsm: snapshot.weightGsm } : {}),
          ...(snapshot.widthCm !== undefined ? { widthCm: snapshot.widthCm } : {}),
          ...(snapshot.fabricStyle !== undefined
            ? { fabricStyle: snapshot.fabricStyle }
            : {}),
          ...(snapshot.colorOptions !== undefined
            ? { colorOptions: snapshot.colorOptions }
            : {}),
          ...(snapshot.moqNote !== undefined ? { moqNote: snapshot.moqNote } : {}),
          ...(snapshot.moqValue !== undefined ? { moqValue: snapshot.moqValue } : {}),
          ...(snapshot.moqUnit !== undefined ? { moqUnit: snapshot.moqUnit } : {}),
          ...(snapshot.customAvailable !== undefined
            ? { customAvailable: snapshot.customAvailable }
            : {}),
          ...(snapshot.sampleAvailable !== undefined
            ? { sampleAvailable: snapshot.sampleAvailable }
            : {}),
        })
        .where(eq(products.id, revision.entityId));
      for (const fieldName of [
        "composition",
        "weightGsm",
        "widthCm",
        "moqValue",
        "moqUnit",
      ] as const) {
        if (snapshot[fieldName] !== undefined) {
          await transaction
            .insert(productFieldReviews)
            .values({
              productId: revision.entityId,
              fieldName,
              verificationStatus: snapshot[fieldName] ? "provided" : "empty",
            })
            .onConflictDoUpdate({
              target: [productFieldReviews.productId, productFieldReviews.fieldName],
              set: {
                verificationStatus: snapshot[fieldName] ? "provided" : "empty",
                reviewedByUserId: null,
                reviewedAt: null,
              },
            });
        }
      }
    } else if (snapshot.kind === "product_code_correction") {
      if (actor.role !== "admin") {
        throw new ProductValidationError(
          "Only an Admin may apply a Product Code correction revision.",
        );
      }
      const updated = await transaction
        .update(products)
        .set({
          productCode: snapshot.newProductCode,
          productCodeAssignedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(products.id, revision.entityId),
            eq(products.productCode, snapshot.previousProductCode),
          ),
        )
        .returning({ id: products.id });
      if (!updated[0]) {
        throw new ProductRevisionConflictError("Product Code changed after correction proposal.");
      }
    } else if (snapshot.kind === "structure") {
      await validateProductStructure(transaction, snapshot);
      await applyProductStructure(transaction, revision.entityId, snapshot);
    } else if (snapshot.kind === "seo") {
      const routeRows = await transaction
        .select({ id: routes.id })
        .from(routes)
        .where(
          and(
            eq(routes.id, snapshot.routeId),
            eq(routes.entityType, "product"),
            eq(routes.entityId, revision.entityId),
            eq(routes.isCurrent, true),
          ),
        )
        .limit(1);
      if (!routeRows[0]) {
        throw new ProductValidationError("Product SEO revision targets an invalid route.");
      }
      await transaction
        .update(seoMetadata)
        .set({
          title: snapshot.title,
          metaDescription: snapshot.metaDescription,
          focusKeyword: snapshot.focusKeyword,
          updatedByUserId: actor.userId,
          updatedAt: new Date(),
        })
        .where(eq(seoMetadata.routeId, snapshot.routeId));
    } else {
      snapshot satisfies never;
    }
    await transaction
      .update(products)
      .set({ updatedAt: new Date() })
      .where(eq(products.id, revision.entityId));
    await audit({
      actorUserId: actor.userId,
      action: "product.revision.applied",
      entityType: "editorial_revision",
      entityId: revisionId,
      afterSummary: { productId: revision.entityId, kind: snapshot.kind },
    });
    return revision.entityId;
  }, options);
}

export async function rejectProductRevision<TQueryResult extends PgQueryResultHKT>(
  db: AppDatabase<TQueryResult>,
  actor: Actor,
  revisionId: string,
  options: GovernedMutationOptions = {},
): Promise<void> {
  requirePermission(actor.role, "products.publish");
  await runGovernedMutation(db, async ({ transaction, audit }) => {
    const updated = await transaction
      .update(editorialRevisions)
      .set({ status: "rejected", reviewedByUserId: actor.userId, reviewedAt: new Date() })
      .where(
        and(
          eq(editorialRevisions.id, revisionId),
          eq(editorialRevisions.entityType, "product"),
          eq(editorialRevisions.status, "in_review"),
        ),
      )
      .returning({ entityId: editorialRevisions.entityId });
    if (!updated[0]) throw new ProductValidationError("Product revision cannot be rejected.");
    await audit({
      actorUserId: actor.userId,
      action: "product.revision.rejected",
      entityType: "editorial_revision",
      entityId: revisionId,
      afterSummary: { productId: updated[0].entityId },
    });
  }, options);
}

export async function publishReviewedProduct<TQueryResult extends PgQueryResultHKT>(
  db: AppDatabase<TQueryResult>,
  actor: Actor,
  productId: string,
  options: GovernedMutationOptions = {},
): Promise<void> {
  requirePermission(actor.role, "products.publish");
  const narrative = await loadProductBlockDocument(db, productId);
  await assertProductBlockProjection(
    db,
    productId,
    narrative.document,
    narrative.shortDescription,
  );
  const [productRows, currentRoutes, localizations, imageCount] = await Promise.all([
    db
      .select({
        realProductBasis: products.realProductBasis,
        confirmedBy: products.realProductConfirmedByUserId,
        confirmedAt: products.realProductConfirmedAt,
        confirmedByActive: users.isActive,
        confirmedByRole: users.role,
      })
      .from(products)
      .leftJoin(users, eq(users.id, products.realProductConfirmedByUserId))
      .where(eq(products.id, productId))
      .limit(1),
    db
      .select({ id: routes.id })
      .from(routes)
      .innerJoin(seoMetadata, eq(seoMetadata.routeId, routes.id))
      .where(
        and(
          eq(routes.entityType, "product"),
          eq(routes.entityId, productId),
          eq(routes.locale, "en"),
          eq(routes.isCurrent, true),
        ),
      )
      .limit(1),
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
          eq(productAssets.isVisible, true),
          inArray(productAssets.role, [...publicImageRoles]),
          publicReadyImageSqlConditions(),
        ),
      ),
  ]);
  const product = productRows[0];
  if (
    !product?.realProductBasis ||
    !product.confirmedBy ||
    !product.confirmedAt ||
    !product.confirmedByActive ||
    (product.confirmedByRole !== "admin" &&
      product.confirmedByRole !== "reviewer_publisher") ||
    !localizations[0]?.name.trim() ||
    !currentRoutes[0] ||
    Number(imageCount[0]?.count ?? 0) < 1
  ) {
    throw new ProductValidationError("Product publication requirements are incomplete.");
  }
  await runGovernedMutation(db, async ({ transaction, audit }) => {
    const updated = await transaction
      .update(products)
      .set({
        status: "published",
        reviewedByUserId: actor.userId,
        reviewedAt: new Date(),
        publishedAt: new Date(),
        publicationRemediationRequired: false,
        publicationRemediationReason: null,
        updatedAt: new Date(),
      })
      .where(and(eq(products.id, productId), eq(products.status, "in_review")))
      .returning({ id: products.id });
    if (!updated[0]) {
      throw new ProductValidationError("Only an in-review product can be published.");
    }
    await audit({
      actorUserId: actor.userId,
      action: "product.published",
      entityType: "product",
      entityId: productId,
      afterSummary: { status: "published" },
    });
  }, options);
}

export async function confirmRealProductBasis<TQueryResult extends PgQueryResultHKT>(
  db: AppDatabase<TQueryResult>,
  actor: Actor,
  productId: string,
  basis: NonNullable<typeof products.$inferInsert.realProductBasis>,
  evidenceNote?: string,
  options: GovernedMutationOptions = {},
): Promise<void> {
  requirePermission(actor.role, "products.review");
  await runGovernedMutation(db, async ({ transaction, audit }) => {
    const updated = await transaction
      .update(products)
      .set({
        realProductBasis: basis,
        realProductEvidenceNote: evidenceNote?.trim() || null,
        realProductConfirmedByUserId: actor.userId,
        realProductConfirmedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(products.id, productId))
      .returning({ id: products.id });
    if (!updated[0]) throw new ProductValidationError("Product was not found.");
    await audit({
      actorUserId: actor.userId,
      action: "product.real_basis.confirmed",
      entityType: "product",
      entityId: productId,
      afterSummary: { basis },
    });
  }, options);
}

export async function reviewProductField<TQueryResult extends PgQueryResultHKT>(
  db: AppDatabase<TQueryResult>,
  actor: Actor,
  productId: string,
  fieldName: "composition" | "weightGsm" | "widthCm" | "moqValue" | "moqUnit",
  status: "verified" | "rejected",
  options: GovernedMutationOptions = {},
): Promise<void> {
  requirePermission(actor.role, "products.review");
  await runGovernedMutation(db, async ({ transaction, audit }) => {
    await transaction
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
    await audit({
      actorUserId: actor.userId,
      action: `product.field.${status}`,
      entityType: "product",
      entityId: productId,
      afterSummary: { fieldName, status },
    });
  }, options);
}

export async function setProductIndexStatus<TQueryResult extends PgQueryResultHKT>(
  db: AppDatabase<TQueryResult>,
  actor: Actor,
  productId: string,
  indexStatus: "index" | "noindex",
  options: GovernedMutationOptions = {},
): Promise<void> {
  requirePermission(actor.role, "seo.manage");
  const rows = await db
    .select({
      status: products.status,
      realProductBasis: products.realProductBasis,
      realProductConfirmedByUserId: products.realProductConfirmedByUserId,
      realProductConfirmedAt: products.realProductConfirmedAt,
      confirmerActive: users.isActive,
      confirmerRole: users.role,
      shortDescription: productLocalizations.shortDescription,
      structuredBlocks: productLocalizations.structuredBlocks,
      blocksVersion: productLocalizations.blocksVersion,
      routeId: routes.id,
      title: seoMetadata.title,
      metaDescription: seoMetadata.metaDescription,
    })
    .from(products)
    .leftJoin(users, eq(users.id, products.realProductConfirmedByUserId))
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
  let narrativeText = "";
  try {
    if (product.blocksVersion !== 1) throw new Error("Unsupported Block version.");
    narrativeText = (await resolveBlockPublicProjection(
      db,
      { type: "product", id: productId },
      parseBlockDocument(product.structuredBlocks, "product"),
    )).readableText;
  } catch {
    narrativeText = "";
  }
  if (indexStatus === "index") {
    const [imageRows, applicationRows, intentRows] = await Promise.all([
      db
        .select({ count: count() })
        .from(productAssets)
        .innerJoin(assets, eq(productAssets.assetId, assets.id))
        .where(
          and(
            eq(productAssets.productId, productId),
            eq(productAssets.isVisible, true),
            inArray(productAssets.role, [...publicImageRoles]),
            publicReadyImageSqlConditions(),
            or(
              and(isNotNull(productAssets.altText), ne(productAssets.altText, "")),
              and(isNotNull(assets.altText), ne(assets.altText, "")),
            ),
          ),
        ),
      db
        .select({ count: count() })
        .from(productApplications)
        .innerJoin(applications, eq(applications.id, productApplications.applicationId))
        .where(
          and(
            eq(productApplications.productId, productId),
            eq(applications.status, "published"),
          ),
        ),
      db
        .select({ count: count() })
        .from(keywordPageMappings)
        .where(eq(keywordPageMappings.primaryRouteId, product.routeId)),
    ]);
    if (
      product.status !== "published" ||
      !product.realProductBasis ||
      !product.realProductConfirmedByUserId ||
      !product.realProductConfirmedAt ||
      !product.confirmerActive ||
      (product.confirmerRole !== "admin" &&
        product.confirmerRole !== "reviewer_publisher") ||
      !(product.shortDescription?.trim() || narrativeText) ||
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
  await runGovernedMutation(db, async ({ transaction, audit }) => {
    await transaction
      .update(seoMetadata)
      .set({ indexStatus, updatedByUserId: actor.userId, updatedAt: new Date() })
      .where(eq(seoMetadata.routeId, product.routeId));
    await audit({
      actorUserId: actor.userId,
      action: "product.index_status.changed",
      entityType: "product",
      entityId: productId,
      afterSummary: { indexStatus },
    });
  }, options);
}

export async function archiveProduct<TQueryResult extends PgQueryResultHKT>(
  db: AppDatabase<TQueryResult>,
  actor: Actor,
  productId: string,
  reason: string,
  options: GovernedMutationOptions = {},
): Promise<void> {
  requirePermission(actor.role, "products.publish");
  if (!reason.trim()) throw new ProductValidationError("Archive requires a reason.");
  await runGovernedMutation(db, async ({ transaction, audit }) => {
    const routeRows = await transaction
      .select({ routeId: routes.id, status: products.status })
      .from(products)
      .innerJoin(
        routes,
        and(
          eq(routes.entityType, "product"),
          eq(routes.entityId, products.id),
          eq(routes.isCurrent, true),
        ),
      )
      .where(eq(products.id, productId))
      .limit(1);
    const current = routeRows[0];
    if (!current || current.status === "archived") {
      throw new ProductValidationError("Product cannot be archived.");
    }
    await transaction
      .update(products)
      .set({ status: "archived", updatedAt: new Date() })
      .where(eq(products.id, productId));
    await transaction
      .update(seoMetadata)
      .set({ indexStatus: "noindex", updatedByUserId: actor.userId, updatedAt: new Date() })
      .where(eq(seoMetadata.routeId, current.routeId));
    await audit({
      actorUserId: actor.userId,
      action: "product.archived",
      entityType: "product",
      entityId: productId,
      beforeSummary: { status: current.status },
      afterSummary: { status: "archived", reason: reason.trim().slice(0, 500) },
    });
  }, options);
}

export async function changeProductSlug<TQueryResult extends PgQueryResultHKT>(
  db: AppDatabase<TQueryResult>,
  actor: Actor,
  productId: string,
  requestedSlug: string,
  options: GovernedMutationOptions = {},
): Promise<void> {
  requirePermission(actor.role, "seo.manage");
  await changeEntityRoute(db, {
    entityType: "product",
    entityId: productId,
    locale: "en",
    newPath: `/products/${slugify(requestedSlug)}/`,
    actor,
    reason: "Published product slug changed by an authorized operator",
  }, options);
}
