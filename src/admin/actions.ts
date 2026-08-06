"use server";

import type { PgQueryResultHKT } from "drizzle-orm/pg-core/session";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requirePermission } from "@/auth/permissions";
import {
  applyApplicationRevision,
  archiveApplication,
  publishApplication,
  rejectApplicationReview,
  rejectApplicationRevision,
  setApplicationIndexStatus,
  submitApplicationForReview,
  updateApplication,
} from "@/catalog/application-service";
import {
  createApplicationDraft,
  createTaxonomyTerm,
  quickCreateApplicationDraft,
  quickCreateTaxonomyTerm,
  approveTaxonomyPublicRoute,
  setTaxonomyActive,
  setTaxonomyIndexStatus,
  updateTaxonomyTerm,
} from "@/catalog/taxonomy-service";
import {
  applyFabricLibraryRevision,
  archiveFabricLibraryEntry,
  confirmFabricEntryIndependentValue,
  createFabricLibraryEntry,
  publishFabricLibraryEntry,
  rejectFabricLibraryEntryReview,
  rejectFabricLibraryRevision,
  setFabricEntryIndexStatus,
  submitFabricLibraryEntryForReview,
  updateFabricLibraryEntry,
} from "@/catalog/fabric-library-service";
import {
  assignGeneratedProductCode,
  applyProductRevision,
  archiveProduct,
  changeProductSlug,
  confirmRealProductBasis,
  correctProductCode,
  createProductDraft,
  publishReviewedProduct,
  rejectProductRevision,
  rejectProductReview,
  reviewProductField,
  saveProductBlockDraft,
  setProductIndexStatus,
  submitProductBlockDraftForReview,
  submitProductForReview,
  updateProductBlocks,
  updateProductFacts,
  updateProductSeo,
  updateProductStructure,
} from "@/catalog/product-service";
import {
  addCustomerActivity,
  assignInquiry,
  changeInquiryStatus,
} from "@/crm/inquiry-service";
import {
  assignContactOrganization,
  createOrganization,
} from "@/crm/contact-service";
import {
  applyContentRevision,
  archiveContent,
  createContentDraft,
  publishContent,
  rejectContentReview,
  rejectContentRevision,
  saveContentBlockDraft,
  setContentIndexStatus,
  submitContentBlockDraftForReview,
  submitContentForReview,
  updateContent,
} from "@/content/content-service";
import {
  createAuthor,
  updateAuthor,
} from "@/content/author-service";
import {
  createCompanyFact,
  rejectCompanyFact,
  updateCompanyFact,
  verifyCompanyFact,
} from "@/content/company-facts-service";
import {
  applyStaticPageConfigRevision,
  saveStaticPageConfigDraft,
  staticPageConfigSchema,
  submitStaticPageConfigDraftForReview,
  type StaticPageConfig,
} from "@/content/static-page-settings";
import { databaseConnection } from "@/db/client";
import { contents } from "@/db/schema";
import { blockDocumentSchema } from "@/editorial/blocks";
import { eq } from "drizzle-orm";
import type { AppDatabase } from "@/db/types";
import { updateSeoMetadata } from "@/seo/metadata-service";
import { changeEntityRoute } from "@/seo/redirects";
import { slugify } from "@/seo/path";
import { setFeatureFlag } from "@/settings/feature-flag-service";
import {
  adminOverrideSourceDeclaration,
  reviewSourceDeclaration,
  updateSourceDeclaration,
} from "@/uploads/service";

import { currentActor } from "./actor";
import {
  adminActionFailure,
  AdminFieldValidationError,
  type AdminMutationOutcome,
} from "./action-result";

function requiredString(form: FormData, key: string): string {
  const value = form.get(key);
  if (typeof value !== "string" || !value.trim()) {
    throw new AdminFieldValidationError({ [key]: [`${key} is required.`] });
  }
  return value.trim();
}

function requireFields(form: FormData, keys: readonly string[]): void {
  const fieldErrors: Record<string, string[]> = {};
  for (const key of keys) {
    const value = form.get(key);
    if (typeof value !== "string" || !value.trim()) {
      fieldErrors[key] = [`${key} is required.`];
    }
  }
  if (Object.keys(fieldErrors).length) {
    throw new AdminFieldValidationError(fieldErrors);
  }
}

function parseRequiredField<T>(
  schema: z.ZodType<T>,
  form: FormData,
  key: string,
): T {
  const parsed = schema.safeParse(requiredString(form, key));
  if (!parsed.success) {
    throw new AdminFieldValidationError({
      [key]: parsed.error.issues.map((issue) => issue.message),
    });
  }
  return parsed.data;
}

function parseOptionalField<T>(
  schema: z.ZodType<T>,
  form: FormData,
  key: string,
): T {
  const parsed = schema.safeParse(optionalString(form, key));
  if (!parsed.success) {
    throw new AdminFieldValidationError({
      [key]: parsed.error.issues.map((issue) => issue.message),
    });
  }
  return parsed.data;
}

function mutationResult(
  entityId?: string,
  redirectTo?: string,
): AdminMutationOutcome {
  return {
    ...(entityId ? { entityId } : {}),
    ...(redirectTo ? { redirectTo } : { refresh: true }),
  };
}

function optionalString(form: FormData, key: string): string | undefined {
  const value = form.get(key);
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function editorialDraftExpectation(form: FormData) {
  return {
    expectedRevisionId: optionalString(form, "expectedRevisionId") ?? null,
    expectedRevisionVersion: Number(optionalString(form, "expectedRevisionVersion") ?? 0),
  };
}

async function withDatabase<TResult>(
  operation: <TQueryResult extends PgQueryResultHKT>(
    db: AppDatabase<TQueryResult>,
  ) => Promise<TResult>,
): Promise<TResult> {
  if (databaseConnection.kind === "pglite") return operation(databaseConnection.db);
  return operation(databaseConnection.db);
}

const blockSaveRequestSchema = z.object({
  entityType: z.enum(["product", "content"]),
  entityId: z.uuid(),
  title: z.string().trim().min(1).max(300),
  summary: z.string().trim().max(2_000).nullable(),
  document: blockDocumentSchema,
  expectedEditorDocumentVersion: z.number().int().positive(),
  revisionId: z.uuid().nullable(),
  expectedRevisionVersion: z.number().int().nonnegative().nullable(),
}).strict();

export type BlockSaveResult =
  | {
      success: true;
      editorDocumentVersion: number;
      revisionId: string | null;
      revisionVersion: number | null;
    }
  | {
      success: false;
      message: string;
      formError: string;
      fieldErrors: Readonly<Record<string, readonly string[]>>;
      errorCode: "VALIDATION_ERROR" | "FORBIDDEN" | "CONFLICT" | "NOT_FOUND" | "AUDIT_FAILURE" | "NETWORK_ERROR" | "UNKNOWN_ERROR";
    };

const quickCreateProductRelationSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("taxonomy"),
    name: z.string().trim().min(1).max(160),
    dimension: z.enum([
      "material_fiber",
      "structure_construction",
      "commercial_collection",
      "surface_hand_feel",
    ]),
    productCodePrefix: z.string().trim().max(8).nullable(),
  }).strict(),
  z.object({
    kind: z.literal("application"),
    name: z.string().trim().min(1).max(160),
  }).strict(),
]);

export type QuickCreateProductRelationResult =
  | {
      success: true;
      id: string;
      kind: "taxonomy" | "application";
      label: string;
      detail: string;
    }
  | {
      success: false;
      message: string;
      formError: string;
      fieldErrors: Readonly<Record<string, readonly string[]>>;
      errorCode: "VALIDATION_ERROR" | "FORBIDDEN" | "CONFLICT" | "NOT_FOUND" | "AUDIT_FAILURE" | "NETWORK_ERROR" | "UNKNOWN_ERROR";
    };

export async function quickCreateProductRelation(
  input: unknown,
): Promise<QuickCreateProductRelationResult> {
  try {
    const parsed = quickCreateProductRelationSchema.parse(input);
    const actor = await currentActor();
    const id = parsed.kind === "taxonomy"
      ? await withDatabase((db) => quickCreateTaxonomyTerm(db, actor, {
          internalKey: `quick-${slugify(parsed.name)}`,
          name: parsed.name,
          dimension: parsed.dimension,
          productCodePrefix: parsed.productCodePrefix,
        }))
      : await withDatabase((db) => quickCreateApplicationDraft(db, actor, {
          internalKey: `quick-${slugify(parsed.name)}`,
          name: parsed.name,
        }));
    revalidatePath("/admin/products/[id]", "page");
    revalidatePath(parsed.kind === "taxonomy" ? "/admin/taxonomy" : "/admin/applications");
    return {
      success: true,
      id,
      kind: parsed.kind,
      label: parsed.name,
      detail: parsed.kind === "taxonomy" ? parsed.dimension : "draft",
    };
  } catch (error) {
    const failure = adminActionFailure(error);
    if (failure.success) throw new Error("Expected a failed quick-create result.");
    return {
      success: false,
      message: failure.message,
      formError: failure.formError,
      fieldErrors: failure.fieldErrors,
      errorCode: failure.errorCode,
    };
  }
}

export async function saveBlockDocument(input: unknown): Promise<BlockSaveResult> {
  try {
    const parsed = blockSaveRequestSchema.parse(input);
    const actor = await currentActor();
    const result = parsed.entityType === "product"
      ? await withDatabase((db) => saveProductBlockDraft(db, actor, parsed.entityId, {
          name: parsed.title,
          shortDescription: parsed.summary,
          document: parsed.document,
          expectedEditorDocumentVersion: parsed.expectedEditorDocumentVersion,
          revisionId: parsed.revisionId,
          expectedRevisionVersion: parsed.expectedRevisionVersion,
        }))
      : await withDatabase((db) => saveContentBlockDraft(db, actor, parsed.entityId, {
          title: parsed.title,
          excerpt: parsed.summary,
          document: parsed.document,
          expectedEditorDocumentVersion: parsed.expectedEditorDocumentVersion,
          revisionId: parsed.revisionId,
          expectedRevisionVersion: parsed.expectedRevisionVersion,
        }));
    revalidatePath(`/admin/${parsed.entityType === "product" ? "products" : "contents"}/${parsed.entityId}`);
    revalidatePath(`/admin/preview/${parsed.entityType}/${parsed.entityId}`);
    return { success: true, ...result };
  } catch (error) {
    const failure = adminActionFailure(error);
    if (failure.success) throw new Error("Expected a failed Block save result.");
    return {
      success: false,
      message: failure.message,
      formError: failure.formError,
      fieldErrors: failure.fieldErrors,
      errorCode: failure.errorCode,
    };
  }
}

export async function submitBlockDraftForReviewAction(
  form: FormData,
): Promise<AdminMutationOutcome> {
  const actor = await currentActor();
  const entityType = parseRequiredField(z.enum(["product", "content"]), form, "entityType");
  const entityId = requiredString(form, "entityId");
  const revisionId = requiredString(form, "revisionId");
  if (entityType === "product") {
    await withDatabase((db) => submitProductBlockDraftForReview(
      db,
      actor,
      entityId,
      revisionId,
    ));
  } else {
    await withDatabase((db) => submitContentBlockDraftForReview(
      db,
      actor,
      entityId,
      revisionId,
    ));
  }
  revalidatePath(`/admin/${entityType === "product" ? "products" : "contents"}/${entityId}`);
  return mutationResult(entityId);
}

const homeModuleKeys = ["hero", "products", "applications", "fabric_library", "fabric_sourcing", "manufacturing_strength", "inquiry_cta"] as const;
const aboutModuleKeys = ["hero", "introduction", "owned_manufacturing", "service_strength", "inquiry_cta"] as const;

function fieldValue(form: FormData, key: string): string {
  const value = form.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function parseStaticPageConfigForm(form: FormData): StaticPageConfig {
  const pageKey = parseRequiredField(z.enum(["home", "about"]), form, "pageKey");
  const moduleKeys = pageKey === "home" ? homeModuleKeys : aboutModuleKeys;
  const modules = Object.fromEntries(moduleKeys.map((key) => [key, form.get(`module:${key}`) === "true"]));
  const placements = moduleKeys.flatMap((placementKey) => (["desktop", "mobile"] as const).flatMap((viewport) => {
    const assetId = optionalString(form, `asset:${placementKey}:${viewport}`);
    if (!assetId) return [];
    return [{
      assetId,
      placementKey,
      viewport,
      role: "hero" as const,
      sortOrder: 0,
      altText: requiredString(form, `alt:${placementKey}:${viewport}`),
      caption: optionalString(form, `caption:${placementKey}:${viewport}`) ?? null,
      focalX: Number(fieldValue(form, `focalX:${placementKey}:${viewport}`) || 50),
      focalY: Number(fieldValue(form, `focalY:${placementKey}:${viewport}`) || 50),
      overlayOpacity: Number(fieldValue(form, `overlay:${placementKey}:${viewport}`) || 0),
      isVisible: form.get(`visible:${placementKey}:${viewport}`) === "true",
    }];
  }));
  const copy = pageKey === "home" ? {
    hero: {
      eyebrow: fieldValue(form, "copy:hero:eyebrow"),
      title: requiredString(form, "copy:hero:title"),
      summary: fieldValue(form, "copy:hero:summary"),
      primaryCta: { label: requiredString(form, "copy:hero:primaryLabel"), href: requiredString(form, "copy:hero:primaryHref") },
      secondaryCta: optionalString(form, "copy:hero:secondaryLabel") && optionalString(form, "copy:hero:secondaryHref")
        ? { label: requiredString(form, "copy:hero:secondaryLabel"), href: requiredString(form, "copy:hero:secondaryHref") }
        : null,
    },
    products: { eyebrow: fieldValue(form, "copy:products:eyebrow"), title: requiredString(form, "copy:products:title"), summary: fieldValue(form, "copy:products:summary") },
    applications: { eyebrow: fieldValue(form, "copy:applications:eyebrow"), title: requiredString(form, "copy:applications:title"), summary: fieldValue(form, "copy:applications:summary") },
    fabricLibrary: { eyebrow: fieldValue(form, "copy:fabricLibrary:eyebrow"), title: requiredString(form, "copy:fabricLibrary:title"), summary: fieldValue(form, "copy:fabricLibrary:summary") },
    fabricSourcing: { eyebrow: fieldValue(form, "copy:fabricSourcing:eyebrow"), title: requiredString(form, "copy:fabricSourcing:title"), summary: fieldValue(form, "copy:fabricSourcing:summary") },
    manufacturingStrength: { eyebrow: fieldValue(form, "copy:manufacturingStrength:eyebrow"), title: requiredString(form, "copy:manufacturingStrength:title"), summary: fieldValue(form, "copy:manufacturingStrength:summary"), factKeys: form.getAll("factKeys").filter((value): value is string => typeof value === "string") },
    inquiryCta: { eyebrow: fieldValue(form, "copy:inquiryCta:eyebrow"), title: requiredString(form, "copy:inquiryCta:title"), summary: fieldValue(form, "copy:inquiryCta:summary"), cta: { label: requiredString(form, "copy:inquiryCta:label"), href: requiredString(form, "copy:inquiryCta:href") } },
  } : {
    hero: { eyebrow: fieldValue(form, "copy:hero:eyebrow"), title: requiredString(form, "copy:hero:title"), summary: fieldValue(form, "copy:hero:summary") },
    introduction: { eyebrow: fieldValue(form, "copy:introduction:eyebrow"), title: requiredString(form, "copy:introduction:title"), summary: fieldValue(form, "copy:introduction:summary") },
    ownedManufacturing: { eyebrow: fieldValue(form, "copy:ownedManufacturing:eyebrow"), title: requiredString(form, "copy:ownedManufacturing:title"), summary: fieldValue(form, "copy:ownedManufacturing:summary"), factKeys: form.getAll("factKeys").filter((value): value is string => typeof value === "string") },
    serviceStrength: { eyebrow: fieldValue(form, "copy:serviceStrength:eyebrow"), title: requiredString(form, "copy:serviceStrength:title"), summary: fieldValue(form, "copy:serviceStrength:summary") },
    inquiryCta: { eyebrow: fieldValue(form, "copy:inquiryCta:eyebrow"), title: requiredString(form, "copy:inquiryCta:title"), summary: fieldValue(form, "copy:inquiryCta:summary"), cta: { label: requiredString(form, "copy:inquiryCta:label"), href: requiredString(form, "copy:inquiryCta:href") } },
  };
  return staticPageConfigSchema.parse({ version: 1, pageKey, modules, copy, placements });
}

export async function saveStaticPageDraftAction(form: FormData): Promise<AdminMutationOutcome> {
  const actor = await currentActor();
  const config = parseStaticPageConfigForm(form);
  const result = await withDatabase((db) => saveStaticPageConfigDraft(
    db,
    actor,
    config,
    optionalString(form, "revisionId") ?? null,
    Number(fieldValue(form, "revisionVersion") || 0),
  ));
  revalidatePath(`/admin/site/${config.pageKey}`);
  revalidatePath(`/admin/preview/site/${config.pageKey}`);
  return mutationResult(result.revisionId);
}

export async function submitStaticPageDraftReviewAction(form: FormData): Promise<AdminMutationOutcome> {
  const actor = await currentActor();
  const pageKey = parseRequiredField(z.enum(["home", "about"]), form, "pageKey");
  await withDatabase((db) => submitStaticPageConfigDraftForReview(db, actor, requiredString(form, "revisionId")));
  revalidatePath(`/admin/site/${pageKey}`);
  return mutationResult();
}

export async function applyStaticPageRevisionAction(form: FormData): Promise<AdminMutationOutcome> {
  const actor = await currentActor();
  const pageKey = await withDatabase((db) => applyStaticPageConfigRevision(db, actor, requiredString(form, "revisionId")));
  revalidatePath(`/admin/site/${pageKey}`);
  revalidatePath(pageKey === "home" ? "/" : "/about/");
  return mutationResult();
}

export async function createProductAction(form: FormData): Promise<AdminMutationOutcome> {
  requireFields(form, ["name", "primaryTaxonomyTermId", "assetIds"]);
  const actor = await currentActor();
  const assetIds = form
    .getAll("assetIds")
    .filter((value): value is string => typeof value === "string" && Boolean(value))
    .sort(
      (left, right) =>
        Number(form.get(`assetSort:${left}`) ?? 0) -
        Number(form.get(`assetSort:${right}`) ?? 0),
    );
  const productId = await withDatabase((db) =>
    createProductDraft(db, actor, {
      name: requiredString(form, "name"),
      primaryTaxonomyTermId: requiredString(form, "primaryTaxonomyTermId"),
      assetIds,
      ...(optionalString(form, "productCode")
        ? { productCode: requiredString(form, "productCode") }
        : {}),
    }),
  );
  revalidatePath("/admin/products");
  return mutationResult(productId, `/admin/products/${productId}/`);
}

export async function updateProductEditorialAction(form: FormData): Promise<AdminMutationOutcome> {
  const actor = await currentActor();
  const productId = requiredString(form, "productId");
  let structuredDocument: unknown;
  try {
    structuredDocument = JSON.parse(requiredString(form, "structuredDocument"));
  } catch {
    throw new AdminFieldValidationError({
      structuredDocument: ["The structured Product document is invalid."],
    });
  }
  await withDatabase((db) =>
    updateProductBlocks(db, actor, productId, {
      name: requiredString(form, "name"),
      shortDescription: optionalString(form, "shortDescription") ?? null,
      document: blockDocumentSchema.parse(structuredDocument),
      expectedEditorDocumentVersion: Number(
        requiredString(form, "expectedEditorDocumentVersion"),
      ),
    }),
  );
  revalidatePath(`/admin/products/${productId}`);
  return mutationResult(productId);
}

export async function updateProductFactsAction(form: FormData): Promise<AdminMutationOutcome> {
  const actor = await currentActor();
  const productId = requiredString(form, "productId");
  await withDatabase((db) =>
    updateProductFacts(db, actor, productId, {
      supplierType: optionalString(form, "supplierType") ?? null,
      composition: optionalString(form, "composition") ?? null,
      weightGsm: optionalString(form, "weightGsm") ?? null,
      widthCm: optionalString(form, "widthCm") ?? null,
      fabricStyle: optionalString(form, "fabricStyle") ?? null,
      colorOptions: optionalString(form, "colorOptions") ?? null,
      moqNote: optionalString(form, "moqNote") ?? null,
      moqValue: optionalString(form, "moqValue") ?? null,
      moqUnit: parseOptionalField(
        z.union([z.enum(["m", "kg", "roll", "yd"]), z.undefined()]),
        form,
        "moqUnit",
      ) ?? null,
      customAvailable: parseRequiredField(
        z.enum(["unknown", "yes", "no"]), form, "customAvailable",
      ),
      sampleAvailable: parseRequiredField(
        z.enum(["unknown", "yes", "no"]), form, "sampleAvailable",
      ),
    }, editorialDraftExpectation(form)),
  );
  revalidatePath(`/admin/products/${productId}`);
  return mutationResult(productId);
}

export async function assignProductCodeAction(form: FormData): Promise<AdminMutationOutcome> {
  const actor = await currentActor();
  const productId = requiredString(form, "productId");
  await withDatabase((db) => assignGeneratedProductCode(db, actor, productId));
  revalidatePath(`/admin/products/${productId}`);
  return mutationResult(productId);
}

export async function correctProductCodeAction(form: FormData): Promise<AdminMutationOutcome> {
  const actor = await currentActor();
  const productId = requiredString(form, "productId");
  await withDatabase((db) =>
    correctProductCode(
      db,
      actor,
      productId,
      requiredString(form, "newProductCode"),
      requiredString(form, "reason"),
      editorialDraftExpectation(form),
    ),
  );
  revalidatePath(`/admin/products/${productId}`);
  return mutationResult(productId);
}

export async function submitProductReviewAction(form: FormData): Promise<AdminMutationOutcome> {
  const actor = await currentActor();
  const productId = requiredString(form, "productId");
  await withDatabase((db) => submitProductForReview(db, actor, productId));
  revalidatePath(`/admin/products/${productId}`);
  return mutationResult(productId);
}

export async function publishProductAction(form: FormData): Promise<AdminMutationOutcome> {
  const actor = await currentActor();
  const productId = requiredString(form, "productId");
  await withDatabase((db) => publishReviewedProduct(db, actor, productId));
  revalidatePath(`/admin/products/${productId}`);
  return mutationResult(productId);
}

export async function confirmRealProductAction(form: FormData): Promise<AdminMutationOutcome> {
  const actor = await currentActor();
  const productId = requiredString(form, "productId");
  const basis = parseRequiredField(z.enum([
      "physical_product",
      "physical_sample",
      "internal_product_code",
      "supply_specification",
      "explicit_specification_combination",
    ]), form, "basis");
  await withDatabase((db) =>
    confirmRealProductBasis(
      db,
      actor,
      productId,
      basis,
      optionalString(form, "evidenceNote"),
    ),
  );
  revalidatePath(`/admin/products/${productId}`);
  return mutationResult(productId);
}

export async function updateProductSeoAction(form: FormData): Promise<AdminMutationOutcome> {
  const actor = await currentActor();
  const productId = requiredString(form, "productId");
  await withDatabase((db) =>
    updateProductSeo(db, actor, productId, {
      title: optionalString(form, "seoTitle") ?? null,
      metaDescription: optionalString(form, "metaDescription") ?? null,
      focusKeyword: optionalString(form, "focusKeyword") ?? null,
    }, editorialDraftExpectation(form)),
  );
  revalidatePath(`/admin/products/${productId}`);
  return mutationResult(productId);
}

export async function updateProductStructureAction(form: FormData): Promise<AdminMutationOutcome> {
  const actor = await currentActor();
  const productId = requiredString(form, "productId");
  const assetIds = form
    .getAll("assetIds")
    .filter((value): value is string => typeof value === "string" && Boolean(value))
    .sort(
      (left, right) =>
        Number(form.get(`assetSort:${left}`) ?? 0) -
        Number(form.get(`assetSort:${right}`) ?? 0),
    );
  const primaryTaxonomyTermId = requiredString(form, "primaryTaxonomyTermId");
  const heroAssetId = requiredString(form, "heroAssetId");
  const taxonomyTermIds = form
    .getAll("taxonomyTermIds")
    .filter((value): value is string => typeof value === "string" && Boolean(value));
  const applicationIds = form
    .getAll("applicationIds")
    .filter((value): value is string => typeof value === "string" && Boolean(value));
  const lines = (key: string): string[] =>
    (optionalString(form, key) ?? "")
      .split(/\r?\n/)
      .map((value) => value.trim())
      .filter(Boolean);
  const faqs = lines("faqs").map((line) => {
    const separator = line.indexOf("|");
    if (separator < 1 || separator === line.length - 1) {
      throw new Error("Each FAQ line must use Question | Answer.");
    }
    return {
      question: line.slice(0, separator).trim(),
      answer: line.slice(separator + 1).trim(),
    };
  });
  await withDatabase((db) =>
    updateProductStructure(db, actor, productId, {
      primaryTaxonomyTermId,
      additionalTaxonomyTermIds: taxonomyTermIds.filter(
        (id) => id !== primaryTaxonomyTermId,
      ),
      applicationIds,
      tagNames: (optionalString(form, "tagNames") ?? "")
        .split(/[\n,]/)
        .map((value) => value.trim())
        .filter(Boolean),
      assetIds,
      heroAssetId,
      media: assetIds.map((assetId, index) => ({
        assetId,
        role: assetId === heroAssetId
          ? ("hero" as const)
          : parseRequiredField(
              z.enum(["gallery", "detail", "application"]),
              form,
              `assetRole:${assetId}`,
            ),
        sortOrder: Number(form.get(`assetSort:${assetId}`) ?? index + 1),
        altText: optionalString(form, `assetAlt:${assetId}`) ?? null,
        caption: optionalString(form, `assetCaption:${assetId}`) ?? null,
        isVisible: assetId === heroAssetId || form.get(`assetVisible:${assetId}`) === "true",
      })),
      features: lines("features"),
      faqs,
      colorOptionsDisplay: parseRequiredField(
        z.enum(["inherit", "show", "hide"]), form, "colorOptionsDisplay",
      ),
      customAvailableDisplay: parseRequiredField(
        z.enum(["inherit", "show", "hide"]), form, "customAvailableDisplay",
      ),
      sampleAvailableDisplay: parseRequiredField(
        z.enum(["inherit", "show", "hide"]), form, "sampleAvailableDisplay",
      ),
      moqNoteDisplay: parseRequiredField(
        z.enum(["inherit", "show", "hide"]), form, "moqNoteDisplay",
      ),
    }, editorialDraftExpectation(form)),
  );
  revalidatePath(`/admin/products/${productId}`);
  revalidatePath("/products/[slug]", "page");
  return mutationResult(productId);
}

export async function reviewProductFieldAction(form: FormData): Promise<AdminMutationOutcome> {
  const actor = await currentActor();
  const productId = requiredString(form, "productId");
  await withDatabase((db) =>
    reviewProductField(
      db,
      actor,
      productId,
      parseRequiredField(
        z.enum(["composition", "weightGsm", "widthCm", "moqValue", "moqUnit"]),
        form,
        "fieldName",
      ),
      parseRequiredField(z.enum(["verified", "rejected"]), form, "verificationStatus"),
    ),
  );
  revalidatePath(`/admin/products/${productId}`);
  revalidatePath("/products/[slug]", "page");
  return mutationResult(productId);
}

export async function applyProductRevisionAction(form: FormData): Promise<AdminMutationOutcome> {
  const actor = await currentActor();
  const productId = requiredString(form, "productId");
  await withDatabase((db) =>
    applyProductRevision(db, actor, requiredString(form, "revisionId")),
  );
  revalidatePath(`/admin/products/${productId}`);
  revalidatePath("/products/[slug]", "page");
  return mutationResult(productId);
}

export async function rejectProductRevisionAction(form: FormData): Promise<AdminMutationOutcome> {
  const actor = await currentActor();
  const productId = requiredString(form, "productId");
  await withDatabase((db) =>
    rejectProductRevision(db, actor, requiredString(form, "revisionId")),
  );
  revalidatePath(`/admin/products/${productId}`);
  return mutationResult(productId);
}

export async function rejectProductReviewAction(form: FormData): Promise<AdminMutationOutcome> {
  const actor = await currentActor();
  const productId = requiredString(form, "productId");
  await withDatabase((db) =>
    rejectProductReview(db, actor, productId, requiredString(form, "reason")),
  );
  revalidatePath(`/admin/products/${productId}`);
  return mutationResult(productId);
}

export async function archiveProductAction(form: FormData): Promise<AdminMutationOutcome> {
  const actor = await currentActor();
  const productId = requiredString(form, "productId");
  await withDatabase((db) =>
    archiveProduct(db, actor, productId, requiredString(form, "reason")),
  );
  revalidatePath(`/admin/products/${productId}`);
  revalidatePath("/products/[slug]", "page");
  revalidatePath("/products/");
  return mutationResult(productId);
}

export async function setProductIndexAction(form: FormData): Promise<AdminMutationOutcome> {
  const actor = await currentActor();
  const productId = requiredString(form, "productId");
  const indexStatus = parseRequiredField(z.enum(["index", "noindex"]), form, "indexStatus");
  await withDatabase((db) =>
    setProductIndexStatus(db, actor, productId, indexStatus),
  );
  revalidatePath(`/admin/products/${productId}`);
  return mutationResult(productId);
}

export async function changeProductSlugAction(form: FormData): Promise<AdminMutationOutcome> {
  const actor = await currentActor();
  const productId = requiredString(form, "productId");
  await withDatabase((db) =>
    changeProductSlug(db, actor, productId, requiredString(form, "slug")),
  );
  revalidatePath(`/admin/products/${productId}`);
  return mutationResult(productId);
}

export async function createTaxonomyAction(form: FormData): Promise<AdminMutationOutcome> {
  requireFields(form, ["internalKey", "name", "dimension"]);
  const actor = await currentActor();
  const dimension = parseRequiredField(z.enum([
      "material_fiber",
      "structure_construction",
      "commercial_collection",
      "surface_hand_feel",
    ]), form, "dimension");
  const termId = await withDatabase((db) =>
    createTaxonomyTerm(db, actor, {
      internalKey: requiredString(form, "internalKey"),
      name: requiredString(form, "name"),
      dimension,
      productCodePrefix: optionalString(form, "productCodePrefix") ?? null,
      ...(optionalString(form, "description")
        ? { description: requiredString(form, "description") }
        : {}),
    }),
  );
  revalidatePath("/admin/taxonomy");
  return mutationResult(termId, `/admin/taxonomy/?created=${termId}`);
}

export async function updateTaxonomyAction(form: FormData): Promise<AdminMutationOutcome> {
  const actor = await currentActor();
  const termId = requiredString(form, "termId");
  await withDatabase((db) =>
    updateTaxonomyTerm(db, actor, termId, {
      name: requiredString(form, "name"),
      description: optionalString(form, "description") ?? null,
      productCodePrefix: optionalString(form, "productCodePrefix") ?? null,
      dimension: parseRequiredField(z.enum([
          "material_fiber",
          "structure_construction",
          "commercial_collection",
          "surface_hand_feel",
        ]), form, "dimension"),
    }),
  );
  const existingRouteId = optionalString(form, "routeId");
  const routeId = existingRouteId ?? await withDatabase((db) =>
    approveTaxonomyPublicRoute(db, actor, termId),
  );
  await withDatabase((db) =>
    updateSeoMetadata(db, actor, routeId, {
      title: optionalString(form, "seoTitle") ?? null,
      metaDescription: optionalString(form, "metaDescription") ?? null,
    }),
  );
  revalidatePath("/admin/taxonomy");
  revalidatePath("/fabric-types/[slug]", "page");
  return mutationResult(termId);
}

export async function setTaxonomyIndexAction(form: FormData): Promise<AdminMutationOutcome> {
  const actor = await currentActor();
  await withDatabase((db) =>
    setTaxonomyIndexStatus(
      db,
      actor,
      requiredString(form, "termId"),
      parseRequiredField(z.enum(["index", "noindex"]), form, "indexStatus"),
    ),
  );
  revalidatePath("/admin/taxonomy");
  return mutationResult(requiredString(form, "termId"));
}

export async function setTaxonomyActiveAction(form: FormData): Promise<AdminMutationOutcome> {
  const actor = await currentActor();
  await withDatabase((db) =>
    setTaxonomyActive(
      db,
      actor,
      requiredString(form, "termId"),
      requiredString(form, "active") === "true",
    ),
  );
  revalidatePath("/admin/taxonomy");
  revalidatePath("/fabric-types/[slug]", "page");
  return mutationResult(requiredString(form, "termId"));
}

export async function changeTaxonomySlugAction(form: FormData): Promise<AdminMutationOutcome> {
  const actor = await currentActor();
  const termId = requiredString(form, "termId");
  await withDatabase((db) =>
    changeEntityRoute(db, {
      entityType: "taxonomy",
      entityId: termId,
      locale: "en",
      newPath: `/fabric-types/${slugify(requiredString(form, "slug"))}/`,
      actor,
      reason: "Taxonomy slug changed in CMS",
    }),
  );
  revalidatePath("/admin/taxonomy");
  revalidatePath("/fabric-types/[slug]", "page");
  return mutationResult(termId);
}

export async function createApplicationAction(form: FormData): Promise<AdminMutationOutcome> {
  requireFields(form, ["internalKey", "name"]);
  const actor = await currentActor();
  const applicationId = await withDatabase((db) =>
    createApplicationDraft(db, actor, {
      internalKey: requiredString(form, "internalKey"),
      name: requiredString(form, "name"),
      ...(optionalString(form, "shortDescription")
        ? { shortDescription: requiredString(form, "shortDescription") }
        : {}),
      ...(optionalString(form, "body") ? { body: requiredString(form, "body") } : {}),
    }),
  );
  revalidatePath("/admin/applications");
  return mutationResult(applicationId, `/admin/applications/${applicationId}/`);
}

export async function updateApplicationAction(form: FormData): Promise<AdminMutationOutcome> {
  const actor = await currentActor();
  const applicationId = requiredString(form, "applicationId");
  const routeId = optionalString(form, "routeId");
  await withDatabase((db) =>
    updateApplication(db, actor, applicationId, {
      name: requiredString(form, "name"),
      shortDescription: optionalString(form, "shortDescription") ?? null,
      body: optionalString(form, "body") ?? null,
      productIds: form
        .getAll("productIds")
        .filter((value): value is string => typeof value === "string" && Boolean(value)),
      ...(routeId ? { seo: {
          routeId,
          title: optionalString(form, "seoTitle") ?? null,
          metaDescription: optionalString(form, "metaDescription") ?? null,
          focusKeyword: optionalString(form, "focusKeyword") ?? null,
        } } : {}),
    }),
  );
  revalidatePath(`/admin/applications/${applicationId}`);
  revalidatePath("/applications/[slug]", "page");
  return mutationResult(applicationId);
}

export async function submitApplicationReviewAction(form: FormData): Promise<AdminMutationOutcome> {
  const actor = await currentActor();
  const applicationId = requiredString(form, "applicationId");
  await withDatabase((db) => submitApplicationForReview(db, actor, applicationId));
  revalidatePath(`/admin/applications/${applicationId}`);
  return mutationResult(applicationId);
}

export async function publishApplicationAction(form: FormData): Promise<AdminMutationOutcome> {
  const actor = await currentActor();
  const applicationId = requiredString(form, "applicationId");
  await withDatabase((db) => publishApplication(db, actor, applicationId));
  revalidatePath(`/admin/applications/${applicationId}`);
  revalidatePath("/applications/[slug]", "page");
  return mutationResult(applicationId);
}

export async function rejectApplicationReviewAction(form: FormData): Promise<AdminMutationOutcome> {
  const actor = await currentActor();
  const applicationId = requiredString(form, "applicationId");
  await withDatabase((db) =>
    rejectApplicationReview(db, actor, applicationId, requiredString(form, "reason")),
  );
  revalidatePath(`/admin/applications/${applicationId}`);
  return mutationResult(applicationId);
}

export async function applyApplicationRevisionAction(form: FormData): Promise<AdminMutationOutcome> {
  const actor = await currentActor();
  const applicationId = requiredString(form, "applicationId");
  await withDatabase((db) =>
    applyApplicationRevision(db, actor, requiredString(form, "revisionId")),
  );
  revalidatePath(`/admin/applications/${applicationId}`);
  revalidatePath("/applications/[slug]", "page");
  return mutationResult(applicationId);
}

export async function rejectApplicationRevisionAction(form: FormData): Promise<AdminMutationOutcome> {
  const actor = await currentActor();
  const applicationId = requiredString(form, "applicationId");
  await withDatabase((db) =>
    rejectApplicationRevision(db, actor, requiredString(form, "revisionId")),
  );
  revalidatePath(`/admin/applications/${applicationId}`);
  return mutationResult(applicationId);
}

export async function setApplicationIndexAction(form: FormData): Promise<AdminMutationOutcome> {
  const actor = await currentActor();
  const applicationId = requiredString(form, "applicationId");
  await withDatabase((db) =>
    setApplicationIndexStatus(
      db,
      actor,
      applicationId,
      parseRequiredField(z.enum(["index", "noindex"]), form, "indexStatus"),
    ),
  );
  revalidatePath(`/admin/applications/${applicationId}`);
  return mutationResult(applicationId);
}

export async function archiveApplicationAction(form: FormData): Promise<AdminMutationOutcome> {
  const actor = await currentActor();
  const applicationId = requiredString(form, "applicationId");
  await withDatabase((db) =>
    archiveApplication(db, actor, applicationId, requiredString(form, "reason")),
  );
  revalidatePath(`/admin/applications/${applicationId}`);
  revalidatePath("/applications/[slug]", "page");
  return mutationResult(applicationId);
}

export async function changeApplicationSlugAction(form: FormData): Promise<AdminMutationOutcome> {
  const actor = await currentActor();
  const applicationId = requiredString(form, "applicationId");
  await withDatabase((db) =>
    changeEntityRoute(db, {
      entityType: "application",
      entityId: applicationId,
      locale: "en",
      newPath: `/applications/${slugify(requiredString(form, "slug"))}/`,
      actor,
      reason: "Application slug changed in CMS",
    }),
  );
  revalidatePath(`/admin/applications/${applicationId}`);
  revalidatePath("/applications/[slug]", "page");
  return mutationResult(applicationId);
}

export async function createContentAction(form: FormData): Promise<AdminMutationOutcome> {
  requireFields(form, ["channel", "type", "authorId", "title", "initialParagraph"]);
  const actor = await currentActor();
  const channel = parseRequiredField(
    z.enum(["fabric_knowledge", "china_textile_guide", "china_sourcing_guide"]),
    form,
    "channel",
  );
  const type = parseRequiredField(
    z.enum(["article", "pillar", "comparison", "how_to", "guide"]),
    form,
    "type",
  );
  const contentId = await withDatabase((db) =>
    createContentDraft(db, actor, {
      channel,
      type,
      authorId: requiredString(form, "authorId"),
      title: requiredString(form, "title"),
      ...(optionalString(form, "excerpt")
        ? { excerpt: requiredString(form, "excerpt") }
        : {}),
      initialDocument: blockDocumentSchema.parse({
        version: 1,
        blocks: [{
          id: "initial-paragraph",
          type: "paragraph",
          text: requiredString(form, "initialParagraph"),
        }],
      }),
    }),
  );
  revalidatePath("/admin/contents");
  return mutationResult(contentId, `/admin/contents/${contentId}/`);
}

export async function updateContentAction(form: FormData): Promise<AdminMutationOutcome> {
  const actor = await currentActor();
  const contentId = requiredString(form, "contentId");
  let structuredDocument: unknown;
  try {
    structuredDocument = JSON.parse(requiredString(form, "structuredDocument"));
  } catch {
    throw new AdminFieldValidationError({
      structuredDocument: ["The structured Content document is invalid."],
    });
  }
  const assetIds = form
    .getAll("assetIds")
    .filter((value): value is string => typeof value === "string" && Boolean(value))
    .sort(
      (left, right) =>
        Number(form.get(`assetSort:${left}`) ?? 0) -
        Number(form.get(`assetSort:${right}`) ?? 0),
    );
  const coverAssetId = optionalString(form, "coverAssetId");
  await withDatabase((db) =>
    updateContent(db, actor, contentId, {
      authorId: requiredString(form, "authorId"),
      type: parseRequiredField(
        z.enum(["article", "pillar", "comparison", "how_to", "guide"]),
        form,
        "type",
      ),
      title: requiredString(form, "title"),
      excerpt: optionalString(form, "excerpt") ?? null,
      structuredDocument: blockDocumentSchema.parse(structuredDocument),
      expectedEditorDocumentVersion: Number(
        requiredString(form, "expectedEditorDocumentVersion"),
      ),
      seoTitle: optionalString(form, "seoTitle") ?? null,
      metaDescription: optionalString(form, "metaDescription") ?? null,
      focusKeyword: optionalString(form, "focusKeyword") ?? null,
      assetIds,
      media: assetIds.map((assetId, index) => ({
        assetId,
        role: assetId === coverAssetId
          ? ("cover" as const)
          : parseRequiredField(
              z.enum(["inline", "gallery", "detail"]),
              form,
              `assetRole:${assetId}`,
            ),
        sortOrder: Number(form.get(`assetSort:${assetId}`) ?? index),
        altText: optionalString(form, `assetAlt:${assetId}`) ?? null,
        caption: optionalString(form, `assetCaption:${assetId}`) ?? null,
        isVisible: assetId === coverAssetId || form.get(`assetVisible:${assetId}`) === "true",
        blockKey: optionalString(form, `assetBlockKey:${assetId}`) ?? null,
      })),
      ...(optionalString(form, "changeSummary")
        ? { changeSummary: requiredString(form, "changeSummary") }
        : {}),
      ...editorialDraftExpectation(form),
    }),
  );
  revalidatePath(`/admin/contents/${contentId}`);
  revalidatePath("/fabric-knowledge/[slug]", "page");
  revalidatePath("/china-textile-guide/[slug]", "page");
  revalidatePath("/china-sourcing-guide/[slug]", "page");
  return mutationResult(contentId);
}

export async function submitContentReviewAction(form: FormData): Promise<AdminMutationOutcome> {
  const actor = await currentActor();
  const contentId = requiredString(form, "contentId");
  await withDatabase((db) => submitContentForReview(db, actor, contentId));
  revalidatePath(`/admin/contents/${contentId}`);
  return mutationResult(contentId);
}

export async function publishContentAction(form: FormData): Promise<AdminMutationOutcome> {
  const actor = await currentActor();
  const contentId = requiredString(form, "contentId");
  await withDatabase((db) => publishContent(db, actor, contentId));
  revalidatePath(`/admin/contents/${contentId}`);
  return mutationResult(contentId);
}

export async function rejectContentReviewAction(form: FormData): Promise<AdminMutationOutcome> {
  const actor = await currentActor();
  const contentId = requiredString(form, "contentId");
  await withDatabase((db) =>
    rejectContentReview(db, actor, contentId, requiredString(form, "reason")),
  );
  revalidatePath(`/admin/contents/${contentId}`);
  return mutationResult(contentId);
}

export async function applyContentRevisionAction(form: FormData): Promise<AdminMutationOutcome> {
  const actor = await currentActor();
  const contentId = requiredString(form, "contentId");
  await withDatabase((db) =>
    applyContentRevision(db, actor, requiredString(form, "revisionId")),
  );
  revalidatePath(`/admin/contents/${contentId}`);
  revalidatePath("/fabric-knowledge/[slug]", "page");
  revalidatePath("/china-textile-guide/[slug]", "page");
  revalidatePath("/china-sourcing-guide/[slug]", "page");
  return mutationResult(contentId);
}

export async function rejectContentRevisionAction(form: FormData): Promise<AdminMutationOutcome> {
  const actor = await currentActor();
  const contentId = requiredString(form, "contentId");
  await withDatabase((db) =>
    rejectContentRevision(db, actor, requiredString(form, "revisionId")),
  );
  revalidatePath(`/admin/contents/${contentId}`);
  return mutationResult(contentId);
}

export async function setContentIndexAction(form: FormData): Promise<AdminMutationOutcome> {
  const actor = await currentActor();
  const contentId = requiredString(form, "contentId");
  await withDatabase((db) =>
    setContentIndexStatus(
      db,
      actor,
      contentId,
      parseRequiredField(z.enum(["index", "noindex"]), form, "indexStatus"),
    ),
  );
  revalidatePath(`/admin/contents/${contentId}`);
  return mutationResult(contentId);
}

export async function archiveContentAction(form: FormData): Promise<AdminMutationOutcome> {
  const actor = await currentActor();
  const contentId = requiredString(form, "contentId");
  await withDatabase((db) =>
    archiveContent(db, actor, contentId, requiredString(form, "reason")),
  );
  revalidatePath(`/admin/contents/${contentId}`);
  return mutationResult(contentId);
}

export async function changeContentSlugAction(form: FormData): Promise<AdminMutationOutcome> {
  const actor = await currentActor();
  const contentId = requiredString(form, "contentId");
  await withDatabase(async (db) => {
    const rows = await db
      .select({ channel: contents.channel })
      .from(contents)
      .where(eq(contents.id, contentId))
      .limit(1);
    const channel = rows[0]?.channel;
    if (!channel) throw new Error("Content was not found.");
    const prefix = {
      fabric_knowledge: "fabric-knowledge",
      china_textile_guide: "china-textile-guide",
      china_sourcing_guide: "china-sourcing-guide",
    }[channel];
    await changeEntityRoute(db, {
      entityType: "content",
      entityId: contentId,
      locale: "en",
      newPath: `/${prefix}/${slugify(requiredString(form, "slug"))}/`,
      actor,
      reason: "Content slug changed in CMS",
    });
  });
  revalidatePath(`/admin/contents/${contentId}`);
  revalidatePath("/fabric-knowledge/[slug]", "page");
  revalidatePath("/china-textile-guide/[slug]", "page");
  revalidatePath("/china-sourcing-guide/[slug]", "page");
  return mutationResult(contentId);
}

export async function createFabricEntryAction(form: FormData): Promise<AdminMutationOutcome> {
  requireFields(form, ["title", "assetIds"]);
  const actor = await currentActor();
  const assetIds = form
    .getAll("assetIds")
    .filter((value): value is string => typeof value === "string" && Boolean(value));
  const entryId = await withDatabase((db) =>
    createFabricLibraryEntry(db, actor, {
      title: requiredString(form, "title"),
      ...(optionalString(form, "description")
        ? { description: requiredString(form, "description") }
        : {}),
      assetIds,
    }),
  );
  revalidatePath("/admin/fabric-library");
  return mutationResult(entryId, `/admin/fabric-library/${entryId}/`);
}

export async function updateFabricEntryAction(form: FormData): Promise<AdminMutationOutcome> {
  const actor = await currentActor();
  const entryId = requiredString(form, "entryId");
  const values = (key: string) =>
    form
      .getAll(key)
      .filter((value): value is string => typeof value === "string" && Boolean(value));
  const assetIds = values("assetIds").sort(
    (left, right) =>
      Number(form.get(`assetSort:${left}`) ?? 0) -
      Number(form.get(`assetSort:${right}`) ?? 0),
  );
  await withDatabase((db) =>
    updateFabricLibraryEntry(db, actor, entryId, {
      title: requiredString(form, "title"),
      description: optionalString(form, "description") ?? null,
      assetIds,
      productIds: values("productIds"),
      applicationIds: values("applicationIds"),
      seo: {
        routeId: requiredString(form, "routeId"),
        title: optionalString(form, "seoTitle") ?? null,
        metaDescription: optionalString(form, "metaDescription") ?? null,
        focusKeyword: optionalString(form, "focusKeyword") ?? null,
      },
    }),
  );
  revalidatePath(`/admin/fabric-library/${entryId}`);
  revalidatePath("/fabric-library/[slug]", "page");
  return mutationResult(entryId);
}

export async function submitFabricEntryReviewAction(form: FormData): Promise<AdminMutationOutcome> {
  const actor = await currentActor();
  const entryId = requiredString(form, "entryId");
  await withDatabase((db) => submitFabricLibraryEntryForReview(db, actor, entryId));
  revalidatePath(`/admin/fabric-library/${entryId}`);
  return mutationResult(entryId);
}

export async function publishFabricEntryAction(form: FormData): Promise<AdminMutationOutcome> {
  const actor = await currentActor();
  const entryId = requiredString(form, "entryId");
  await withDatabase((db) => publishFabricLibraryEntry(db, actor, entryId));
  revalidatePath(`/admin/fabric-library/${entryId}`);
  return mutationResult(entryId);
}

export async function rejectFabricEntryReviewAction(form: FormData): Promise<AdminMutationOutcome> {
  const actor = await currentActor();
  const entryId = requiredString(form, "entryId");
  await withDatabase((db) =>
    rejectFabricLibraryEntryReview(db, actor, entryId, requiredString(form, "reason")),
  );
  revalidatePath(`/admin/fabric-library/${entryId}`);
  return mutationResult(entryId);
}

export async function confirmFabricEntryValueAction(form: FormData): Promise<AdminMutationOutcome> {
  const actor = await currentActor();
  const entryId = requiredString(form, "entryId");
  await withDatabase((db) => confirmFabricEntryIndependentValue(db, actor, entryId));
  revalidatePath(`/admin/fabric-library/${entryId}`);
  return mutationResult(entryId);
}

export async function setFabricEntryIndexAction(form: FormData): Promise<AdminMutationOutcome> {
  const actor = await currentActor();
  const entryId = requiredString(form, "entryId");
  await withDatabase((db) =>
    setFabricEntryIndexStatus(
      db,
      actor,
      entryId,
      parseRequiredField(z.enum(["index", "noindex"]), form, "indexStatus"),
    ),
  );
  revalidatePath(`/admin/fabric-library/${entryId}`);
  return mutationResult(entryId);
}

export async function applyFabricEntryRevisionAction(form: FormData): Promise<AdminMutationOutcome> {
  const actor = await currentActor();
  const entryId = requiredString(form, "entryId");
  await withDatabase((db) =>
    applyFabricLibraryRevision(db, actor, requiredString(form, "revisionId")),
  );
  revalidatePath(`/admin/fabric-library/${entryId}`);
  revalidatePath("/fabric-library/[slug]", "page");
  return mutationResult(entryId);
}

export async function rejectFabricEntryRevisionAction(form: FormData): Promise<AdminMutationOutcome> {
  const actor = await currentActor();
  const entryId = requiredString(form, "entryId");
  await withDatabase((db) =>
    rejectFabricLibraryRevision(db, actor, requiredString(form, "revisionId")),
  );
  revalidatePath(`/admin/fabric-library/${entryId}`);
  return mutationResult(entryId);
}

export async function archiveFabricEntryAction(form: FormData): Promise<AdminMutationOutcome> {
  const actor = await currentActor();
  const entryId = requiredString(form, "entryId");
  await withDatabase((db) =>
    archiveFabricLibraryEntry(db, actor, entryId, requiredString(form, "reason")),
  );
  revalidatePath(`/admin/fabric-library/${entryId}`);
  revalidatePath("/fabric-library/[slug]", "page");
  return mutationResult(entryId);
}

export async function changeFabricEntrySlugAction(form: FormData): Promise<AdminMutationOutcome> {
  const actor = await currentActor();
  const entryId = requiredString(form, "entryId");
  await withDatabase((db) =>
    changeEntityRoute(db, {
      entityType: "fabric_entry",
      entityId: entryId,
      locale: "en",
      newPath: `/fabric-library/${slugify(requiredString(form, "slug"))}/`,
      actor,
      reason: "Fabric Library slug changed in CMS",
    }),
  );
  revalidatePath(`/admin/fabric-library/${entryId}`);
  revalidatePath("/fabric-library/[slug]", "page");
  return mutationResult(entryId);
}

export async function createAuthorAction(form: FormData): Promise<AdminMutationOutcome> {
  requireFields(form, ["internalKey", "displayName"]);
  const actor = await currentActor();
  const authorId = await withDatabase((db) => createAuthor(db, actor, {
    internalKey: requiredString(form, "internalKey"),
    displayName: requiredString(form, "displayName"),
    bio: optionalString(form, "bio") ?? null,
    isOrganization: form.get("isOrganization") === "on",
  }));
  revalidatePath("/admin/authors");
  return mutationResult(authorId, `/admin/authors/?created=${authorId}`);
}

export async function updateAuthorAction(form: FormData): Promise<AdminMutationOutcome> {
  const actor = await currentActor();
  const authorId = requiredString(form, "authorId");
  await withDatabase((db) => updateAuthor(db, actor, authorId, {
    displayName: requiredString(form, "displayName"),
    bio: optionalString(form, "bio") ?? null,
    isOrganization: form.get("isOrganization") === "on",
    isActive: form.get("isActive") === "on",
  }));
  revalidatePath("/admin/authors");
  return mutationResult(authorId);
}

export async function createCompanyFactAction(form: FormData): Promise<AdminMutationOutcome> {
  requireFields(form, ["factKey", "subject", "statement"]);
  const actor = await currentActor();
  const factId = await withDatabase((db) => createCompanyFact(db, actor, {
    factKey: requiredString(form, "factKey"),
    subject: requiredString(form, "subject"),
    statement: requiredString(form, "statement"),
    relationshipToCwt: optionalString(form, "relationshipToCwt") ?? null,
    evidenceReference: optionalString(form, "evidenceReference") ?? null,
  }));
  revalidatePath("/admin/company-facts");
  return mutationResult(factId, `/admin/company-facts/${factId}/`);
}

export async function updateCompanyFactAction(form: FormData): Promise<AdminMutationOutcome> {
  const actor = await currentActor();
  const factId = requiredString(form, "factId");
  await withDatabase((db) =>
    updateCompanyFact(db, actor, factId, {
      subject: requiredString(form, "subject"),
      statement: requiredString(form, "statement"),
      relationshipToCwt: optionalString(form, "relationshipToCwt") ?? null,
      evidenceReference: optionalString(form, "evidenceReference") ?? null,
    }),
  );
  revalidatePath(`/admin/company-facts/${factId}`);
  revalidatePath("/", "layout");
  return mutationResult(factId);
}

export async function verifyCompanyFactAction(form: FormData): Promise<AdminMutationOutcome> {
  const actor = await currentActor();
  const factId = requiredString(form, "factId");
  await withDatabase((db) =>
    verifyCompanyFact(db, actor, factId, {
      evidenceReference: requiredString(form, "evidenceReference"),
      publicUseAllowed: form.get("publicUseAllowed") === "on",
    }),
  );
  revalidatePath(`/admin/company-facts/${factId}`);
  revalidatePath("/", "layout");
  return mutationResult(factId);
}

export async function rejectCompanyFactAction(form: FormData): Promise<AdminMutationOutcome> {
  const actor = await currentActor();
  const factId = requiredString(form, "factId");
  await withDatabase((db) =>
    rejectCompanyFact(db, actor, factId, requiredString(form, "reason")),
  );
  revalidatePath(`/admin/company-facts/${factId}`);
  revalidatePath("/", "layout");
  return mutationResult(factId);
}

export async function updateAssetDeclarationAction(form: FormData): Promise<AdminMutationOutcome> {
  const actor = await currentActor();
  const assetId = requiredString(form, "assetId");
  const enabled = form.get("enabled") === "on";
  requirePermission(actor.role, "assets.write");
  if (form.has("markReviewed") || form.has("reviewDecision")) {
    throw new Error("Declaration editing and review must be separate operations.");
  }
  const subjectRelationship = parseOptionalField(
    z.enum(["cwt", "partner_factory", "supplier", "customer", "third_party", "unknown"]).optional(),
    form,
    "subjectRelationship",
  );
  const publicUsePermission = parseOptionalField(
    z.enum(["unknown", "allowed", "not_allowed", "restricted"]).optional(),
    form,
    "publicUsePermission",
  );
  const editingPermission = parseOptionalField(
    z.enum(["unknown", "allowed", "not_allowed", "restricted"]).optional(),
    form,
    "editingPermission",
  );
  await withDatabase((db) =>
    updateSourceDeclaration(db, assetId, actor, {
      expectedVersion: parseRequiredField(
        z.coerce.number().int().min(0), form, "expectedVersion",
      ),
      enabled,
      sourceType: optionalString(form, "sourceType") ?? null,
      sourceProvider: optionalString(form, "sourceProvider") ?? null,
      rightsStatus: optionalString(form, "rightsStatus") ?? null,
      subjectRelationship: subjectRelationship ?? null,
      publicUsePermission: publicUsePermission ?? null,
      editingPermission: editingPermission ?? null,
      usageRestrictions: optionalString(form, "usageRestrictions") ?? null,
      permissionEvidence: optionalString(form, "permissionEvidence") ?? null,
      declarationExpiryDate: optionalString(form, "declarationExpiryDate")
        ? new Date(requiredString(form, "declarationExpiryDate"))
        : null,
      isCwtOwnedFacility:
        form.get("isCwtOwnedFacility") === "yes"
          ? true
          : form.get("isCwtOwnedFacility") === "no"
            ? false
            : null,
    }),
  );
  revalidatePath(`/admin/assets/${assetId}`);
  revalidatePath("/admin/assets");
  return mutationResult(assetId);
}

export async function reviewAssetDeclarationAction(form: FormData): Promise<AdminMutationOutcome> {
  const actor = await currentActor();
  const assetId = requiredString(form, "assetId");
  const decision = parseRequiredField(
    z.enum(["approved", "rejected"]), form, "decision",
  );
  const effectiveDecision = parseRequiredField(
    z.enum(["allowed", "restricted", "not_allowed", "revoked"]),
    form,
    "effectiveDecision",
  );
  const publicWebsite = optionalString(form, "rightsPublicWebsiteAllowed");
  await withDatabase((db) =>
    reviewSourceDeclaration(
      db,
      assetId,
      actor,
      decision,
      effectiveDecision,
      publicWebsite === "yes" ? true : publicWebsite === "no" ? false : null,
      parseRequiredField(z.coerce.number().int().min(0), form, "expectedVersion"),
      optionalString(form, "reason") ?? null,
    ),
  );
  revalidatePath(`/admin/assets/${assetId}`);
  return mutationResult(assetId);
}

export async function overrideAssetDeclarationAction(form: FormData): Promise<AdminMutationOutcome> {
  const actor = await currentActor();
  const assetId = requiredString(form, "assetId");
  const effectiveDecision = parseRequiredField(
    z.enum(["allowed", "restricted", "not_allowed", "revoked"]),
    form,
    "effectiveDecision",
  );
  const publicWebsite = optionalString(form, "rightsPublicWebsiteAllowed");
  await withDatabase((db) =>
    adminOverrideSourceDeclaration(
      db,
      assetId,
      actor,
      effectiveDecision,
      publicWebsite === "yes" ? true : publicWebsite === "no" ? false : null,
      parseRequiredField(z.coerce.number().int().min(0), form, "expectedVersion"),
      requiredString(form, "reason"),
    ),
  );
  revalidatePath(`/admin/assets/${assetId}`);
  return mutationResult(assetId);
}

export async function changeInquiryStatusAction(form: FormData): Promise<AdminMutationOutcome> {
  const actor = await currentActor();
  const inquiryId = requiredString(form, "inquiryId");
  const status = parseRequiredField(z.enum([
      "new",
      "reviewing",
      "qualified",
      "quoted",
      "sample",
      "negotiation",
      "won",
      "lost",
      "spam",
      "archived",
    ]), form, "status");
  await withDatabase((db) =>
    changeInquiryStatus(db, actor, inquiryId, status, optionalString(form, "reason")),
  );
  revalidatePath(`/admin/inquiries/${inquiryId}`);
  revalidatePath("/admin/inquiries");
  return mutationResult(inquiryId);
}

export async function addCustomerActivityAction(form: FormData): Promise<AdminMutationOutcome> {
  requireFields(form, ["inquiryId", "type", "direction", "content"]);
  const actor = await currentActor();
  const inquiryId = requiredString(form, "inquiryId");
  const type = parseRequiredField(
    z.enum(["note", "email", "whatsapp", "quote", "sample", "status_change"]),
    form,
    "type",
  );
  const direction = parseRequiredField(
    z.enum(["inbound", "outbound", "internal"]), form, "direction",
  );
  const activityId = await withDatabase((db) =>
    addCustomerActivity(db, actor, inquiryId, {
      type,
      direction,
      content: requiredString(form, "content"),
    }),
  );
  revalidatePath(`/admin/inquiries/${inquiryId}`);
  return mutationResult(activityId);
}

export async function assignInquiryAction(form: FormData): Promise<AdminMutationOutcome> {
  const actor = await currentActor();
  const inquiryId = requiredString(form, "inquiryId");
  const priority = parseRequiredField(
    z.enum(["low", "normal", "high", "urgent"]), form, "priority",
  );
  const qualificationStatus = parseRequiredField(
    z.enum(["unassessed", "qualified", "unqualified", "needs_information"]),
    form,
    "qualificationStatus",
  );
  await withDatabase((db) =>
    assignInquiry(db, actor, inquiryId, {
      ...(actor.role === "admin"
        ? { ownerUserId: optionalString(form, "ownerUserId") ?? null }
        : {}),
      priority,
      qualificationStatus,
    }),
  );
  revalidatePath(`/admin/inquiries/${inquiryId}`);
  revalidatePath("/admin/inquiries");
  return mutationResult(inquiryId);
}

export async function createOrganizationAction(form: FormData): Promise<AdminMutationOutcome> {
  requireFields(form, ["name"]);
  const actor = await currentActor();
  const organizationId = await withDatabase((db) =>
    createOrganization(db, actor, {
      name: requiredString(form, "name"),
      website: optionalString(form, "website") ?? null,
      countryCode: optionalString(form, "countryCode") ?? null,
    }),
  );
  revalidatePath("/admin/contacts");
  return mutationResult(organizationId);
}

export async function assignContactOrganizationAction(form: FormData): Promise<AdminMutationOutcome> {
  const actor = await currentActor();
  const contactId = requiredString(form, "contactId");
  const organizationId = optionalString(form, "organizationId") ?? null;
  await withDatabase((db) =>
    assignContactOrganization(db, actor, contactId, organizationId),
  );
  revalidatePath("/admin/contacts");
  return mutationResult(contactId);
}

export async function setFeatureFlagAction(form: FormData): Promise<AdminMutationOutcome> {
  const actor = await currentActor();
  const flagId = requiredString(form, "flagId");
  const enabled = requiredString(form, "enabled") === "true";
  await withDatabase((db) => setFeatureFlag(db, actor, flagId, enabled));
  revalidatePath("/admin/settings");
  return mutationResult(flagId);
}
