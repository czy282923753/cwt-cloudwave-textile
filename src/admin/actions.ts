"use server";

import type { PgQueryResultHKT } from "drizzle-orm/pg-core/session";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { writeAuditLog } from "@/audit/service";
import { hasPermission, requirePermission } from "@/auth/permissions";
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
  applyProductRevision,
  archiveProduct,
  changeProductSlug,
  confirmRealProductBasis,
  createProductDraft,
  publishReviewedProduct,
  rejectProductRevision,
  rejectProductReview,
  reviewProductField,
  setProductIndexStatus,
  submitProductForReview,
  updateProductEditorialCopy,
  updateProductFacts,
  updateProductSeo,
  updateProductStructure,
} from "@/catalog/product-service";
import { env } from "@/config/env";
import {
  addCustomerActivity,
  assignInquiry,
  changeInquiryStatus,
} from "@/crm/inquiry-service";
import {
  applyContentRevision,
  archiveContent,
  createContentDraft,
  publishContent,
  rejectContentReview,
  rejectContentRevision,
  setContentIndexStatus,
  submitContentForReview,
  updateContent,
} from "@/content/content-service";
import {
  rejectCompanyFact,
  updateCompanyFact,
  verifyCompanyFact,
} from "@/content/company-facts-service";
import { databaseConnection } from "@/db/client";
import {
  assetUploadBatches,
  assets,
  authors,
  companyFacts,
  contacts,
  contentAssets,
  contents,
  fabricLibraryEntries,
  fabricLibraryEntryAssets,
  organizations,
  productAssets,
  products,
  featureFlags,
} from "@/db/schema";
import { eq } from "drizzle-orm";
import type { AppDatabase } from "@/db/types";
import { createObjectStorage } from "@/storage";
import { updateSeoMetadata } from "@/seo/metadata-service";
import { changeEntityRoute } from "@/seo/redirects";
import { slugify } from "@/seo/path";
import { createUploadRateLimiter } from "@/uploads/rate-limit";
import { createFileScanner } from "@/uploads/scanner";
import { updateSourceDeclaration, uploadAsset } from "@/uploads/service";

import { currentActor } from "./actor";

function requiredString(form: FormData, key: string): string {
  const value = form.get(key);
  if (typeof value !== "string" || !value.trim()) throw new Error(`${key} is required.`);
  return value.trim();
}

function optionalString(form: FormData, key: string): string | undefined {
  const value = form.get(key);
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

async function withDatabase<TResult>(
  operation: <TQueryResult extends PgQueryResultHKT>(
    db: AppDatabase<TQueryResult>,
  ) => Promise<TResult>,
): Promise<TResult> {
  if (databaseConnection.kind === "pglite") return operation(databaseConnection.db);
  return operation(databaseConnection.db);
}

export async function createProductAction(form: FormData): Promise<void> {
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
    }),
  );
  revalidatePath("/admin/products");
  redirect(`/admin/products/${productId}`);
}

export async function updateProductEditorialAction(form: FormData): Promise<void> {
  const actor = await currentActor();
  const productId = requiredString(form, "productId");
  await withDatabase((db) =>
    updateProductEditorialCopy(db, actor, productId, {
      name: requiredString(form, "name"),
      shortDescription: optionalString(form, "shortDescription") ?? null,
      fullDescription: optionalString(form, "fullDescription") ?? null,
    }),
  );
  revalidatePath(`/admin/products/${productId}`);
}

export async function updateProductFactsAction(form: FormData): Promise<void> {
  const actor = await currentActor();
  const productId = requiredString(form, "productId");
  await withDatabase((db) =>
    updateProductFacts(db, actor, productId, {
      productCode: optionalString(form, "productCode") ?? null,
      supplierType: optionalString(form, "supplierType") ?? null,
      composition: optionalString(form, "composition") ?? null,
      weightGsm: optionalString(form, "weightGsm") ?? null,
      widthCm: optionalString(form, "widthCm") ?? null,
      fabricStyle: optionalString(form, "fabricStyle") ?? null,
      colorOptions: optionalString(form, "colorOptions") ?? null,
      moqNote: optionalString(form, "moqNote") ?? null,
      customAvailable: z
        .enum(["unknown", "yes", "no"])
        .parse(requiredString(form, "customAvailable")),
      sampleAvailable: z
        .enum(["unknown", "yes", "no"])
        .parse(requiredString(form, "sampleAvailable")),
    }),
  );
  revalidatePath(`/admin/products/${productId}`);
}

export async function submitProductReviewAction(form: FormData): Promise<void> {
  const actor = await currentActor();
  const productId = requiredString(form, "productId");
  await withDatabase((db) => submitProductForReview(db, actor, productId));
  revalidatePath(`/admin/products/${productId}`);
}

export async function publishProductAction(form: FormData): Promise<void> {
  const actor = await currentActor();
  const productId = requiredString(form, "productId");
  await withDatabase((db) => publishReviewedProduct(db, actor, productId));
  revalidatePath(`/admin/products/${productId}`);
}

export async function confirmRealProductAction(form: FormData): Promise<void> {
  const actor = await currentActor();
  const productId = requiredString(form, "productId");
  const basis = z
    .enum([
      "physical_product",
      "physical_sample",
      "internal_product_code",
      "supply_specification",
      "explicit_specification_combination",
    ])
    .parse(requiredString(form, "basis"));
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
}

export async function updateProductSeoAction(form: FormData): Promise<void> {
  const actor = await currentActor();
  const productId = requiredString(form, "productId");
  await withDatabase((db) =>
    updateProductSeo(db, actor, productId, {
      title: optionalString(form, "seoTitle") ?? null,
      metaDescription: optionalString(form, "metaDescription") ?? null,
      focusKeyword: optionalString(form, "focusKeyword") ?? null,
    }),
  );
  revalidatePath(`/admin/products/${productId}`);
}

export async function updateProductStructureAction(form: FormData): Promise<void> {
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
      heroAssetId: requiredString(form, "heroAssetId"),
      features: lines("features"),
      faqs,
      colorOptionsDisplay: z
        .enum(["inherit", "show", "hide"])
        .parse(requiredString(form, "colorOptionsDisplay")),
      customAvailableDisplay: z
        .enum(["inherit", "show", "hide"])
        .parse(requiredString(form, "customAvailableDisplay")),
      sampleAvailableDisplay: z
        .enum(["inherit", "show", "hide"])
        .parse(requiredString(form, "sampleAvailableDisplay")),
      moqNoteDisplay: z
        .enum(["inherit", "show", "hide"])
        .parse(requiredString(form, "moqNoteDisplay")),
    }),
  );
  revalidatePath(`/admin/products/${productId}`);
  revalidatePath("/products/[slug]", "page");
}

export async function reviewProductFieldAction(form: FormData): Promise<void> {
  const actor = await currentActor();
  const productId = requiredString(form, "productId");
  await withDatabase((db) =>
    reviewProductField(
      db,
      actor,
      productId,
      z.enum(["composition", "weightGsm", "widthCm"]).parse(requiredString(form, "fieldName")),
      z.enum(["verified", "rejected"]).parse(requiredString(form, "verificationStatus")),
    ),
  );
  revalidatePath(`/admin/products/${productId}`);
  revalidatePath("/products/[slug]", "page");
}

export async function applyProductRevisionAction(form: FormData): Promise<void> {
  const actor = await currentActor();
  const productId = requiredString(form, "productId");
  await withDatabase((db) =>
    applyProductRevision(db, actor, requiredString(form, "revisionId")),
  );
  revalidatePath(`/admin/products/${productId}`);
  revalidatePath("/products/[slug]", "page");
}

export async function rejectProductRevisionAction(form: FormData): Promise<void> {
  const actor = await currentActor();
  const productId = requiredString(form, "productId");
  await withDatabase((db) =>
    rejectProductRevision(db, actor, requiredString(form, "revisionId")),
  );
  revalidatePath(`/admin/products/${productId}`);
}

export async function rejectProductReviewAction(form: FormData): Promise<void> {
  const actor = await currentActor();
  const productId = requiredString(form, "productId");
  await withDatabase((db) =>
    rejectProductReview(db, actor, productId, requiredString(form, "reason")),
  );
  revalidatePath(`/admin/products/${productId}`);
}

export async function archiveProductAction(form: FormData): Promise<void> {
  const actor = await currentActor();
  const productId = requiredString(form, "productId");
  await withDatabase((db) =>
    archiveProduct(db, actor, productId, requiredString(form, "reason")),
  );
  revalidatePath(`/admin/products/${productId}`);
  revalidatePath("/products/[slug]", "page");
  revalidatePath("/products/");
}

export async function setProductIndexAction(form: FormData): Promise<void> {
  const actor = await currentActor();
  const productId = requiredString(form, "productId");
  const indexStatus = z
    .enum(["index", "noindex"])
    .parse(requiredString(form, "indexStatus"));
  await withDatabase((db) =>
    setProductIndexStatus(db, actor, productId, indexStatus),
  );
  revalidatePath(`/admin/products/${productId}`);
}

export async function changeProductSlugAction(form: FormData): Promise<void> {
  const actor = await currentActor();
  const productId = requiredString(form, "productId");
  await withDatabase((db) =>
    changeProductSlug(db, actor, productId, requiredString(form, "slug")),
  );
  revalidatePath(`/admin/products/${productId}`);
}

export async function createTaxonomyAction(form: FormData): Promise<void> {
  const actor = await currentActor();
  const dimension = z
    .enum([
      "material_fiber",
      "structure_construction",
      "commercial_collection",
      "surface_hand_feel",
    ])
    .parse(requiredString(form, "dimension"));
  await withDatabase((db) =>
    createTaxonomyTerm(db, actor, {
      internalKey: requiredString(form, "internalKey"),
      name: requiredString(form, "name"),
      dimension,
      ...(optionalString(form, "description")
        ? { description: requiredString(form, "description") }
        : {}),
    }),
  );
  revalidatePath("/admin/taxonomy");
  redirect("/admin/taxonomy");
}

export async function updateTaxonomyAction(form: FormData): Promise<void> {
  const actor = await currentActor();
  const termId = requiredString(form, "termId");
  await withDatabase((db) =>
    updateTaxonomyTerm(db, actor, termId, {
      name: requiredString(form, "name"),
      description: optionalString(form, "description") ?? null,
      dimension: z
        .enum([
          "material_fiber",
          "structure_construction",
          "commercial_collection",
          "surface_hand_feel",
        ])
        .parse(requiredString(form, "dimension")),
    }),
  );
  await withDatabase((db) =>
    updateSeoMetadata(db, actor, requiredString(form, "routeId"), {
      title: optionalString(form, "seoTitle") ?? null,
      metaDescription: optionalString(form, "metaDescription") ?? null,
    }),
  );
  revalidatePath("/admin/taxonomy");
  revalidatePath("/fabric-types/[slug]", "page");
}

export async function setTaxonomyIndexAction(form: FormData): Promise<void> {
  const actor = await currentActor();
  await withDatabase((db) =>
    setTaxonomyIndexStatus(
      db,
      actor,
      requiredString(form, "termId"),
      z.enum(["index", "noindex"]).parse(requiredString(form, "indexStatus")),
    ),
  );
  revalidatePath("/admin/taxonomy");
}

export async function setTaxonomyActiveAction(form: FormData): Promise<void> {
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
}

export async function changeTaxonomySlugAction(form: FormData): Promise<void> {
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
}

export async function createApplicationAction(form: FormData): Promise<void> {
  const actor = await currentActor();
  await withDatabase((db) =>
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
  redirect("/admin/applications");
}

export async function updateApplicationAction(form: FormData): Promise<void> {
  const actor = await currentActor();
  const applicationId = requiredString(form, "applicationId");
  await withDatabase((db) =>
    updateApplication(db, actor, applicationId, {
      name: requiredString(form, "name"),
      shortDescription: optionalString(form, "shortDescription") ?? null,
      body: optionalString(form, "body") ?? null,
      productIds: form
        .getAll("productIds")
        .filter((value): value is string => typeof value === "string" && Boolean(value)),
      seo: {
        routeId: requiredString(form, "routeId"),
        title: optionalString(form, "seoTitle") ?? null,
        metaDescription: optionalString(form, "metaDescription") ?? null,
        focusKeyword: optionalString(form, "focusKeyword") ?? null,
      },
    }),
  );
  revalidatePath(`/admin/applications/${applicationId}`);
  revalidatePath("/applications/[slug]", "page");
}

export async function submitApplicationReviewAction(form: FormData): Promise<void> {
  const actor = await currentActor();
  const applicationId = requiredString(form, "applicationId");
  await withDatabase((db) => submitApplicationForReview(db, actor, applicationId));
  revalidatePath(`/admin/applications/${applicationId}`);
}

export async function publishApplicationAction(form: FormData): Promise<void> {
  const actor = await currentActor();
  const applicationId = requiredString(form, "applicationId");
  await withDatabase((db) => publishApplication(db, actor, applicationId));
  revalidatePath(`/admin/applications/${applicationId}`);
  revalidatePath("/applications/[slug]", "page");
}

export async function rejectApplicationReviewAction(form: FormData): Promise<void> {
  const actor = await currentActor();
  const applicationId = requiredString(form, "applicationId");
  await withDatabase((db) =>
    rejectApplicationReview(db, actor, applicationId, requiredString(form, "reason")),
  );
  revalidatePath(`/admin/applications/${applicationId}`);
}

export async function applyApplicationRevisionAction(form: FormData): Promise<void> {
  const actor = await currentActor();
  const applicationId = requiredString(form, "applicationId");
  await withDatabase((db) =>
    applyApplicationRevision(db, actor, requiredString(form, "revisionId")),
  );
  revalidatePath(`/admin/applications/${applicationId}`);
  revalidatePath("/applications/[slug]", "page");
}

export async function rejectApplicationRevisionAction(form: FormData): Promise<void> {
  const actor = await currentActor();
  const applicationId = requiredString(form, "applicationId");
  await withDatabase((db) =>
    rejectApplicationRevision(db, actor, requiredString(form, "revisionId")),
  );
  revalidatePath(`/admin/applications/${applicationId}`);
}

export async function setApplicationIndexAction(form: FormData): Promise<void> {
  const actor = await currentActor();
  const applicationId = requiredString(form, "applicationId");
  await withDatabase((db) =>
    setApplicationIndexStatus(
      db,
      actor,
      applicationId,
      z.enum(["index", "noindex"]).parse(requiredString(form, "indexStatus")),
    ),
  );
  revalidatePath(`/admin/applications/${applicationId}`);
}

export async function archiveApplicationAction(form: FormData): Promise<void> {
  const actor = await currentActor();
  const applicationId = requiredString(form, "applicationId");
  await withDatabase((db) =>
    archiveApplication(db, actor, applicationId, requiredString(form, "reason")),
  );
  revalidatePath(`/admin/applications/${applicationId}`);
  revalidatePath("/applications/[slug]", "page");
}

export async function changeApplicationSlugAction(form: FormData): Promise<void> {
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
}

export async function createContentAction(form: FormData): Promise<void> {
  const actor = await currentActor();
  const channel = z
    .enum(["fabric_knowledge", "china_textile_guide", "china_sourcing_guide"])
    .parse(requiredString(form, "channel"));
  const type = z
    .enum(["article", "pillar", "comparison", "how_to", "guide"])
    .parse(requiredString(form, "type"));
  await withDatabase((db) =>
    createContentDraft(db, actor, {
      channel,
      type,
      authorId: requiredString(form, "authorId"),
      title: requiredString(form, "title"),
      ...(optionalString(form, "excerpt")
        ? { excerpt: requiredString(form, "excerpt") }
        : {}),
      body: requiredString(form, "body"),
    }),
  );
  revalidatePath("/admin/contents");
  redirect("/admin/contents");
}

export async function updateContentAction(form: FormData): Promise<void> {
  const actor = await currentActor();
  const contentId = requiredString(form, "contentId");
  await withDatabase((db) =>
    updateContent(db, actor, contentId, {
      authorId: requiredString(form, "authorId"),
      type: z
        .enum(["article", "pillar", "comparison", "how_to", "guide"])
        .parse(requiredString(form, "type")),
      title: requiredString(form, "title"),
      excerpt: optionalString(form, "excerpt") ?? null,
      body: requiredString(form, "body"),
      seoTitle: optionalString(form, "seoTitle") ?? null,
      metaDescription: optionalString(form, "metaDescription") ?? null,
      focusKeyword: optionalString(form, "focusKeyword") ?? null,
      assetIds: form
        .getAll("assetIds")
        .filter((value): value is string => typeof value === "string" && Boolean(value))
        .sort(
          (left, right) =>
            Number(form.get(`assetSort:${left}`) ?? 0) -
            Number(form.get(`assetSort:${right}`) ?? 0),
        ),
      ...(optionalString(form, "changeSummary")
        ? { changeSummary: requiredString(form, "changeSummary") }
        : {}),
    }),
  );
  revalidatePath(`/admin/contents/${contentId}`);
  revalidatePath("/fabric-knowledge/[slug]", "page");
  revalidatePath("/china-textile-guide/[slug]", "page");
  revalidatePath("/china-sourcing-guide/[slug]", "page");
}

export async function submitContentReviewAction(form: FormData): Promise<void> {
  const actor = await currentActor();
  const contentId = requiredString(form, "contentId");
  await withDatabase((db) => submitContentForReview(db, actor, contentId));
  revalidatePath(`/admin/contents/${contentId}`);
}

export async function publishContentAction(form: FormData): Promise<void> {
  const actor = await currentActor();
  const contentId = requiredString(form, "contentId");
  await withDatabase((db) => publishContent(db, actor, contentId));
  revalidatePath(`/admin/contents/${contentId}`);
}

export async function rejectContentReviewAction(form: FormData): Promise<void> {
  const actor = await currentActor();
  const contentId = requiredString(form, "contentId");
  await withDatabase((db) =>
    rejectContentReview(db, actor, contentId, requiredString(form, "reason")),
  );
  revalidatePath(`/admin/contents/${contentId}`);
}

export async function applyContentRevisionAction(form: FormData): Promise<void> {
  const actor = await currentActor();
  const contentId = requiredString(form, "contentId");
  await withDatabase((db) =>
    applyContentRevision(db, actor, requiredString(form, "revisionId")),
  );
  revalidatePath(`/admin/contents/${contentId}`);
  revalidatePath("/fabric-knowledge/[slug]", "page");
  revalidatePath("/china-textile-guide/[slug]", "page");
  revalidatePath("/china-sourcing-guide/[slug]", "page");
}

export async function rejectContentRevisionAction(form: FormData): Promise<void> {
  const actor = await currentActor();
  const contentId = requiredString(form, "contentId");
  await withDatabase((db) =>
    rejectContentRevision(db, actor, requiredString(form, "revisionId")),
  );
  revalidatePath(`/admin/contents/${contentId}`);
}

export async function setContentIndexAction(form: FormData): Promise<void> {
  const actor = await currentActor();
  const contentId = requiredString(form, "contentId");
  await withDatabase((db) =>
    setContentIndexStatus(
      db,
      actor,
      contentId,
      z.enum(["index", "noindex"]).parse(requiredString(form, "indexStatus")),
    ),
  );
  revalidatePath(`/admin/contents/${contentId}`);
}

export async function archiveContentAction(form: FormData): Promise<void> {
  const actor = await currentActor();
  const contentId = requiredString(form, "contentId");
  await withDatabase((db) =>
    archiveContent(db, actor, contentId, requiredString(form, "reason")),
  );
  revalidatePath(`/admin/contents/${contentId}`);
}

export async function changeContentSlugAction(form: FormData): Promise<void> {
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
}

export async function createFabricEntryAction(form: FormData): Promise<void> {
  const actor = await currentActor();
  const assetIds = form
    .getAll("assetIds")
    .filter((value): value is string => typeof value === "string" && Boolean(value));
  await withDatabase((db) =>
    createFabricLibraryEntry(db, actor, {
      title: requiredString(form, "title"),
      ...(optionalString(form, "description")
        ? { description: requiredString(form, "description") }
        : {}),
      assetIds,
    }),
  );
  revalidatePath("/admin/fabric-library");
  redirect("/admin/fabric-library");
}

export async function updateFabricEntryAction(form: FormData): Promise<void> {
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
}

export async function submitFabricEntryReviewAction(form: FormData): Promise<void> {
  const actor = await currentActor();
  const entryId = requiredString(form, "entryId");
  await withDatabase((db) => submitFabricLibraryEntryForReview(db, actor, entryId));
  revalidatePath(`/admin/fabric-library/${entryId}`);
}

export async function publishFabricEntryAction(form: FormData): Promise<void> {
  const actor = await currentActor();
  const entryId = requiredString(form, "entryId");
  await withDatabase((db) => publishFabricLibraryEntry(db, actor, entryId));
  revalidatePath(`/admin/fabric-library/${entryId}`);
}

export async function rejectFabricEntryReviewAction(form: FormData): Promise<void> {
  const actor = await currentActor();
  const entryId = requiredString(form, "entryId");
  await withDatabase((db) =>
    rejectFabricLibraryEntryReview(db, actor, entryId, requiredString(form, "reason")),
  );
  revalidatePath(`/admin/fabric-library/${entryId}`);
}

export async function confirmFabricEntryValueAction(form: FormData): Promise<void> {
  const actor = await currentActor();
  const entryId = requiredString(form, "entryId");
  await withDatabase((db) => confirmFabricEntryIndependentValue(db, actor, entryId));
  revalidatePath(`/admin/fabric-library/${entryId}`);
}

export async function setFabricEntryIndexAction(form: FormData): Promise<void> {
  const actor = await currentActor();
  const entryId = requiredString(form, "entryId");
  await withDatabase((db) =>
    setFabricEntryIndexStatus(
      db,
      actor,
      entryId,
      z.enum(["index", "noindex"]).parse(requiredString(form, "indexStatus")),
    ),
  );
  revalidatePath(`/admin/fabric-library/${entryId}`);
}

export async function applyFabricEntryRevisionAction(form: FormData): Promise<void> {
  const actor = await currentActor();
  const entryId = requiredString(form, "entryId");
  await withDatabase((db) =>
    applyFabricLibraryRevision(db, actor, requiredString(form, "revisionId")),
  );
  revalidatePath(`/admin/fabric-library/${entryId}`);
  revalidatePath("/fabric-library/[slug]", "page");
}

export async function rejectFabricEntryRevisionAction(form: FormData): Promise<void> {
  const actor = await currentActor();
  const entryId = requiredString(form, "entryId");
  await withDatabase((db) =>
    rejectFabricLibraryRevision(db, actor, requiredString(form, "revisionId")),
  );
  revalidatePath(`/admin/fabric-library/${entryId}`);
}

export async function archiveFabricEntryAction(form: FormData): Promise<void> {
  const actor = await currentActor();
  const entryId = requiredString(form, "entryId");
  await withDatabase((db) =>
    archiveFabricLibraryEntry(db, actor, entryId, requiredString(form, "reason")),
  );
  revalidatePath(`/admin/fabric-library/${entryId}`);
  revalidatePath("/fabric-library/[slug]", "page");
}

export async function changeFabricEntrySlugAction(form: FormData): Promise<void> {
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
}

export async function createAuthorAction(form: FormData): Promise<void> {
  const actor = await currentActor();
  requirePermission(actor.role, "content.write");
  await withDatabase(async (db) => {
    const rows = await db
      .insert(authors)
      .values({
        internalKey: requiredString(form, "internalKey"),
        displayName: requiredString(form, "displayName"),
        bio: optionalString(form, "bio") ?? null,
        isOrganization: form.get("isOrganization") === "on",
      })
      .returning({ id: authors.id });
    const authorId = rows[0]?.id;
    if (!authorId) throw new Error("Author insert failed.");
    await writeAuditLog(db, {
      actorUserId: actor.userId,
      action: "author.created",
      entityType: "author",
      entityId: authorId,
    });
  });
  revalidatePath("/admin/authors");
}

export async function updateAuthorAction(form: FormData): Promise<void> {
  const actor = await currentActor();
  requirePermission(actor.role, "content.write");
  const authorId = requiredString(form, "authorId");
  await withDatabase(async (db) => {
    const before = await db.select().from(authors).where(eq(authors.id, authorId)).limit(1);
    if (!before[0]) throw new Error("Author was not found.");
    await db
      .update(authors)
      .set({
        displayName: requiredString(form, "displayName"),
        bio: optionalString(form, "bio") ?? null,
        isOrganization: form.get("isOrganization") === "on",
        isActive: form.get("isActive") === "on",
        updatedAt: new Date(),
      })
      .where(eq(authors.id, authorId));
    await writeAuditLog(db, {
      actorUserId: actor.userId,
      action: "author.updated",
      entityType: "author",
      entityId: authorId,
      beforeSummary: { isActive: before[0].isActive },
      afterSummary: { isActive: form.get("isActive") === "on" },
    });
  });
  revalidatePath("/admin/authors");
}

export async function createCompanyFactAction(form: FormData): Promise<void> {
  const actor = await currentActor();
  requirePermission(actor.role, "company_facts.manage");
  await withDatabase(async (db) => {
    const rows = await db
      .insert(companyFacts)
      .values({
        factKey: requiredString(form, "factKey"),
        subject: requiredString(form, "subject"),
        statement: requiredString(form, "statement"),
        relationshipToCwt: optionalString(form, "relationshipToCwt") ?? null,
        evidenceReference: optionalString(form, "evidenceReference") ?? null,
        publicUseAllowed: false,
        verificationStatus: "provided",
      })
      .returning({ id: companyFacts.id });
    const factId = rows[0]?.id;
    if (!factId) throw new Error("Company Fact insert failed.");
    await writeAuditLog(db, {
      actorUserId: actor.userId,
      action: "company_fact.created",
      entityType: "company_fact",
      entityId: factId,
      afterSummary: { publicUseAllowed: false, status: "provided" },
    });
  });
  revalidatePath("/admin/company-facts");
}

export async function updateCompanyFactAction(form: FormData): Promise<void> {
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
}

export async function verifyCompanyFactAction(form: FormData): Promise<void> {
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
}

export async function rejectCompanyFactAction(form: FormData): Promise<void> {
  const actor = await currentActor();
  const factId = requiredString(form, "factId");
  await withDatabase((db) =>
    rejectCompanyFact(db, actor, factId, requiredString(form, "reason")),
  );
  revalidatePath(`/admin/company-facts/${factId}`);
  revalidatePath("/", "layout");
}

const uploadRateLimiter = createUploadRateLimiter();

const categorySchema = z.enum([
  "product",
  "fabric",
  "market",
  "company",
  "factory",
  "application",
  "certificate",
  "content",
  "other",
]);

async function performAssetUpload<TQueryResult extends PgQueryResultHKT>(
  db: AppDatabase<TQueryResult>,
  actor: Awaited<ReturnType<typeof currentActor>>,
  form: FormData,
): Promise<void> {
  requirePermission(actor.role, "assets.write");
  if (!(await uploadRateLimiter.consume(actor.userId))) {
    throw new Error("Upload rate limit exceeded.");
  }
  const files = form
    .getAll("files")
    .filter((value): value is File => value instanceof File && value.size > 0);
  if (files.length === 0 || files.length > env.MAX_FILES_PER_UPLOAD) {
    throw new Error("Upload file count is outside the configured limit.");
  }
  const sourceDeclarationEnabled = form.get("sourceDeclarationEnabled") === "on";
  const association = optionalString(form, "association");
  let associationType: "product" | "fabric" | "content" | null = null;
  let associationEntityId: string | null = null;
  if (association) {
    const separator = association.indexOf(":");
    const rawType = association.slice(0, separator);
    associationEntityId = association.slice(separator + 1);
    if (
      !associationEntityId ||
      (rawType !== "product" && rawType !== "fabric" && rawType !== "content")
    ) {
      throw new Error("Asset association is invalid.");
    }
    associationType = rawType;
    if (associationType === "content") {
      requirePermission(actor.role, "content.write");
      const rows = await db
        .select({ status: contents.status })
        .from(contents)
        .where(eq(contents.id, associationEntityId))
        .limit(1);
      if (!rows[0] || rows[0].status === "archived") {
        throw new Error("Asset association target is unavailable.");
      }
      if (rows[0].status === "published") {
        throw new Error("Published Content Assets must change through an Editorial Revision.");
      }
    } else if (associationType === "product") {
      requirePermission(actor.role, "products.write");
      const rows = await db
        .select({ status: products.status })
        .from(products)
        .where(eq(products.id, associationEntityId))
        .limit(1);
      if (!rows[0] || rows[0].status === "archived") {
        throw new Error("Asset association target is unavailable.");
      }
      if (rows[0].status === "published") {
        throw new Error("Published Product Assets must change through an Editorial Revision.");
      }
    } else {
      requirePermission(actor.role, "products.write");
      const rows = await db
        .select({ status: fabricLibraryEntries.status })
        .from(fabricLibraryEntries)
        .where(eq(fabricLibraryEntries.id, associationEntityId))
        .limit(1);
      if (!rows[0] || rows[0].status === "archived") {
        throw new Error("Asset association target is unavailable.");
      }
      if (rows[0].status === "published") {
        throw new Error(
          "Published Fabric Library Assets must change through an Editorial Revision.",
        );
      }
    }
  }
  const batchRows = await db
    .insert(assetUploadBatches)
    .values({ createdByUserId: actor.userId, sourceDeclarationEnabled })
    .returning({ id: assetUploadBatches.id });
  const uploadBatchId = batchRows[0]?.id;
  if (!uploadBatchId) throw new Error("Upload batch insert failed.");
  const storage = createObjectStorage();
  const scanner = createFileScanner();
  const category = categorySchema.parse(requiredString(form, "category"));
  for (const file of files) {
    const assetId = await uploadAsset(db, storage, scanner, {
      fileName: file.name,
      declaredMimeType: file.type,
      bytes: new Uint8Array(await file.arrayBuffer()),
      category,
      purpose: "public_asset",
      uploadedByUserId: actor.userId,
      uploadBatchId,
      sourceDeclarationEnabled,
    });
    const role = z
      .enum(["hero", "gallery", "detail", "thumbnail", "inline", "document"])
      .parse(requiredString(form, "role"));
    const sortOrder = z.coerce.number().int().min(0).parse(form.get("sortOrder") ?? 0);
    if (associationType && associationEntityId) {
      if (associationType === "product") {
        await db.insert(productAssets).values({ productId: associationEntityId, assetId, role, sortOrder });
      } else if (associationType === "fabric") {
        await db.insert(fabricLibraryEntryAssets).values({
          fabricEntryId: associationEntityId,
          assetId,
          role,
          sortOrder,
        });
      } else if (associationType === "content") {
        await db.insert(contentAssets).values({ contentId: associationEntityId, assetId, role, sortOrder });
      }
    }
    if (sourceDeclarationEnabled) {
      const subjectRelationship = z
        .enum(["cwt", "partner_factory", "supplier", "customer", "third_party", "unknown"])
        .optional()
        .parse(optionalString(form, "subjectRelationship"));
      const markReviewed = form.get("markReviewed") === "on";
      if (markReviewed) {
        requirePermission(actor.role, "assets.declaration.review");
      }
      await updateSourceDeclaration(db, assetId, actor, {
        enabled: true,
        sourceType: optionalString(form, "sourceType") ?? null,
        sourceProvider: optionalString(form, "sourceProvider") ?? null,
        rightsStatus: optionalString(form, "rightsStatus") ?? null,
        subjectRelationship: subjectRelationship ?? null,
        publicUsePermission: z
          .enum(["unknown", "allowed", "not_allowed", "restricted"])
          .optional()
          .parse(optionalString(form, "publicUsePermission")) ?? null,
        editingPermission: z
          .enum(["unknown", "allowed", "not_allowed", "restricted"])
          .optional()
          .parse(optionalString(form, "editingPermission")) ?? null,
        usageRestrictions: optionalString(form, "usageRestrictions") ?? null,
        permissionEvidence: optionalString(form, "permissionEvidence") ?? null,
        ...(markReviewed
          ? {
              declarationReviewerUserId: actor.userId,
              declarationReviewDate: new Date(),
            }
          : {}),
        declarationExpiryDate: optionalString(form, "declarationExpiryDate")
          ? new Date(requiredString(form, "declarationExpiryDate"))
          : null,
        isCwtOwnedFacility:
          form.get("isCwtOwnedFacility") === "yes"
            ? true
            : form.get("isCwtOwnedFacility") === "no"
              ? false
              : null,
      });
    }
  }
  await writeAuditLog(db, {
    actorUserId: actor.userId,
    action: "asset.upload_batch.completed",
    entityType: "asset_upload_batch",
    entityId: uploadBatchId,
    afterSummary: { fileCount: files.length, sourceDeclarationEnabled },
  });
}

export async function uploadAssetsAction(form: FormData): Promise<void> {
  const actor = await currentActor();
  await withDatabase((db) => performAssetUpload(db, actor, form));
  revalidatePath("/admin/assets");
  redirect("/admin/assets");
}

export async function updateAssetDeclarationAction(form: FormData): Promise<void> {
  const actor = await currentActor();
  const assetId = requiredString(form, "assetId");
  const enabled = form.get("enabled") === "on";
  const markReviewed = form.get("markReviewed") === "on";
  if (!hasPermission(actor.role, "assets.write")) {
    requirePermission(actor.role, "assets.declaration.review");
    if (!markReviewed || !enabled) {
      throw new Error("A review-only operator can only record an enabled declaration review.");
    }
    await withDatabase(async (db) => {
      const rows = await db
        .select({ enabled: assets.sourceDeclarationEnabled })
        .from(assets)
        .where(eq(assets.id, assetId))
        .limit(1);
      if (!rows[0]?.enabled) throw new Error("Source Declaration must be enabled before review.");
      await updateSourceDeclaration(db, assetId, actor, {
        enabled: true,
        declarationReviewerUserId: actor.userId,
        declarationReviewDate: new Date(),
      });
    });
    revalidatePath(`/admin/assets/${assetId}`);
    return;
  }
  if (markReviewed) requirePermission(actor.role, "assets.declaration.review");
  const subjectRelationship = z
    .enum(["cwt", "partner_factory", "supplier", "customer", "third_party", "unknown"])
    .optional()
    .parse(optionalString(form, "subjectRelationship"));
  const publicUsePermission = z
    .enum(["unknown", "allowed", "not_allowed", "restricted"])
    .optional()
    .parse(optionalString(form, "publicUsePermission"));
  const editingPermission = z
    .enum(["unknown", "allowed", "not_allowed", "restricted"])
    .optional()
    .parse(optionalString(form, "editingPermission"));
  await withDatabase((db) =>
    updateSourceDeclaration(db, assetId, actor, {
      enabled,
      sourceType: optionalString(form, "sourceType") ?? null,
      sourceProvider: optionalString(form, "sourceProvider") ?? null,
      rightsStatus: optionalString(form, "rightsStatus") ?? null,
      subjectRelationship: subjectRelationship ?? null,
      publicUsePermission: publicUsePermission ?? null,
      editingPermission: editingPermission ?? null,
      usageRestrictions: optionalString(form, "usageRestrictions") ?? null,
      permissionEvidence: optionalString(form, "permissionEvidence") ?? null,
      ...(markReviewed
        ? {
            declarationReviewerUserId: actor.userId,
            declarationReviewDate: new Date(),
          }
        : {}),
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
}

export async function changeInquiryStatusAction(form: FormData): Promise<void> {
  const actor = await currentActor();
  const inquiryId = requiredString(form, "inquiryId");
  const status = z
    .enum([
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
    ])
    .parse(requiredString(form, "status"));
  await withDatabase((db) =>
    changeInquiryStatus(db, actor, inquiryId, status, optionalString(form, "reason")),
  );
  revalidatePath(`/admin/inquiries/${inquiryId}`);
  revalidatePath("/admin/inquiries");
}

export async function addCustomerActivityAction(form: FormData): Promise<void> {
  const actor = await currentActor();
  const inquiryId = requiredString(form, "inquiryId");
  const type = z
    .enum(["note", "email", "whatsapp", "quote", "sample", "status_change"])
    .parse(requiredString(form, "type"));
  const direction = z
    .enum(["inbound", "outbound", "internal"])
    .parse(requiredString(form, "direction"));
  await withDatabase((db) =>
    addCustomerActivity(db, actor, inquiryId, {
      type,
      direction,
      content: requiredString(form, "content"),
    }),
  );
  revalidatePath(`/admin/inquiries/${inquiryId}`);
}

export async function assignInquiryAction(form: FormData): Promise<void> {
  const actor = await currentActor();
  const inquiryId = requiredString(form, "inquiryId");
  const priority = z
    .enum(["low", "normal", "high", "urgent"])
    .parse(requiredString(form, "priority"));
  const qualificationStatus = z
    .enum(["unassessed", "qualified", "unqualified", "needs_information"])
    .parse(requiredString(form, "qualificationStatus"));
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
}

export async function createOrganizationAction(form: FormData): Promise<void> {
  const actor = await currentActor();
  requirePermission(actor.role, "users.manage");
  await withDatabase(async (db) => {
    const rows = await db
      .insert(organizations)
      .values({
        name: requiredString(form, "name"),
        website: optionalString(form, "website") ?? null,
        countryCode: optionalString(form, "countryCode") ?? null,
      })
      .returning({ id: organizations.id });
    const organizationId = rows[0]?.id;
    if (!organizationId) throw new Error("Organization insert failed.");
    await writeAuditLog(db, {
      actorUserId: actor.userId,
      action: "organization.created",
      entityType: "organization",
      entityId: organizationId,
    });
  });
  revalidatePath("/admin/contacts");
}

export async function assignContactOrganizationAction(form: FormData): Promise<void> {
  const actor = await currentActor();
  requirePermission(actor.role, "users.manage");
  const contactId = requiredString(form, "contactId");
  const organizationId = optionalString(form, "organizationId") ?? null;
  await withDatabase(async (db) => {
    await db
      .update(contacts)
      .set({ organizationId, updatedAt: new Date() })
      .where(eq(contacts.id, contactId));
    await writeAuditLog(db, {
      actorUserId: actor.userId,
      action: "contact.organization.assigned",
      entityType: "contact",
      entityId: contactId,
      afterSummary: { organizationId },
    });
  });
  revalidatePath("/admin/contacts");
}

export async function setFeatureFlagAction(form: FormData): Promise<void> {
  const actor = await currentActor();
  requirePermission(actor.role, "settings.manage");
  const flagId = requiredString(form, "flagId");
  const enabled = requiredString(form, "enabled") === "true";
  await withDatabase(async (db) => {
    const before = await db
      .select({ enabled: featureFlags.enabled, key: featureFlags.key })
      .from(featureFlags)
      .where(eq(featureFlags.id, flagId))
      .limit(1);
    if (!before[0]) throw new Error("Feature Flag was not found.");
    await db
      .update(featureFlags)
      .set({ enabled, updatedByUserId: actor.userId, updatedAt: new Date() })
      .where(eq(featureFlags.id, flagId));
    await writeAuditLog(db, {
      actorUserId: actor.userId,
      action: "feature_flag.changed",
      entityType: "feature_flag",
      entityId: flagId,
      beforeSummary: { enabled: before[0].enabled },
      afterSummary: { key: before[0].key, enabled },
    });
  });
  revalidatePath("/admin/settings");
}
