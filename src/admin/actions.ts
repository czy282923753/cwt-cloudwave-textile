"use server";

import type { PgQueryResultHKT } from "drizzle-orm/pg-core/session";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { writeAuditLog } from "@/audit/service";
import { requirePermission } from "@/auth/permissions";
import {
  createApplicationDraft,
  createTaxonomyTerm,
} from "@/catalog/taxonomy-service";
import { createFabricLibraryEntry } from "@/catalog/fabric-library-service";
import {
  changeProductSlug,
  confirmRealProductBasis,
  createProductDraft,
  publishReviewedProduct,
  setProductIndexStatus,
  submitProductForReview,
  updateProductEditorialCopy,
  updateProductFacts,
} from "@/catalog/product-service";
import { env } from "@/config/env";
import {
  addCustomerActivity,
  assignInquiry,
  changeInquiryStatus,
} from "@/crm/inquiry-service";
import { createContentDraft } from "@/content/content-service";
import { databaseConnection } from "@/db/client";
import {
  assetUploadBatches,
  authors,
  companyFacts,
  contacts,
  contentAssets,
  fabricLibraryEntryAssets,
  organizations,
  productAssets,
} from "@/db/schema";
import { eq } from "drizzle-orm";
import type { AppDatabase } from "@/db/types";
import { createObjectStorage } from "@/storage";
import { createUploadRateLimiter } from "@/uploads/rate-limit";
import { createFileScanner } from "@/uploads/scanner";
import { updateSourceDeclaration, uploadAsset } from "@/uploads/service";
import { updateSeoMetadata } from "@/seo/metadata-service";

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
    .filter((value): value is string => typeof value === "string" && Boolean(value));
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
  const routeId = requiredString(form, "routeId");
  await withDatabase((db) =>
    updateSeoMetadata(db, actor, routeId, {
      title: optionalString(form, "seoTitle") ?? null,
      metaDescription: optionalString(form, "metaDescription") ?? null,
      focusKeyword: optionalString(form, "focusKeyword") ?? null,
    }),
  );
  revalidatePath(`/admin/products/${productId}`);
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
    const association = optionalString(form, "association");
    const role = z
      .enum(["hero", "gallery", "detail", "thumbnail", "inline", "document"])
      .parse(requiredString(form, "role"));
    const sortOrder = z.coerce.number().int().min(0).parse(form.get("sortOrder") ?? 0);
    if (association) {
      const separator = association.indexOf(":");
      const associationType = association.slice(0, separator);
      const entityId = association.slice(separator + 1);
      if (!entityId) throw new Error("Asset association is invalid.");
      if (associationType === "product") {
        requirePermission(actor.role, "products.write");
        await db.insert(productAssets).values({ productId: entityId, assetId, role, sortOrder });
      } else if (associationType === "fabric") {
        requirePermission(actor.role, "products.write");
        await db.insert(fabricLibraryEntryAssets).values({
          fabricEntryId: entityId,
          assetId,
          role,
          sortOrder,
        });
      } else if (associationType === "content") {
        requirePermission(actor.role, "content.write");
        await db.insert(contentAssets).values({ contentId: entityId, assetId, role, sortOrder });
      } else {
        throw new Error("Asset association type is invalid.");
      }
    }
    if (sourceDeclarationEnabled) {
      const subjectRelationship = z
        .enum(["cwt", "partner_factory", "supplier", "customer", "third_party", "unknown"])
        .optional()
        .parse(optionalString(form, "subjectRelationship"));
      await updateSourceDeclaration(db, assetId, actor.userId, {
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
        declarationReviewerUserId:
          form.get("markReviewed") === "on" ? actor.userId : null,
        declarationReviewDate:
          form.get("markReviewed") === "on" ? new Date() : null,
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
  requirePermission(actor.role, "assets.write");
  const assetId = requiredString(form, "assetId");
  const enabled = form.get("enabled") === "on";
  const markReviewed = form.get("markReviewed") === "on";
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
    updateSourceDeclaration(db, assetId, actor.userId, {
      enabled,
      sourceType: optionalString(form, "sourceType") ?? null,
      sourceProvider: optionalString(form, "sourceProvider") ?? null,
      rightsStatus: optionalString(form, "rightsStatus") ?? null,
      subjectRelationship: subjectRelationship ?? null,
      publicUsePermission: publicUsePermission ?? null,
      editingPermission: editingPermission ?? null,
      usageRestrictions: optionalString(form, "usageRestrictions") ?? null,
      permissionEvidence: optionalString(form, "permissionEvidence") ?? null,
      declarationReviewerUserId: markReviewed ? actor.userId : null,
      declarationReviewDate: markReviewed ? new Date() : null,
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
  await withDatabase((db) =>
    addCustomerActivity(db, actor, inquiryId, {
      type,
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
      ownerUserId: optionalString(form, "ownerUserId") ?? null,
      priority,
      qualificationStatus,
    }),
  );
  revalidatePath(`/admin/inquiries/${inquiryId}`);
  revalidatePath("/admin/inquiries");
}

export async function createOrganizationAction(form: FormData): Promise<void> {
  const actor = await currentActor();
  requirePermission(actor.role, "crm.manage");
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
  requirePermission(actor.role, "crm.manage");
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
