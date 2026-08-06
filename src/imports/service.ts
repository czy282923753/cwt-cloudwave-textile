import "server-only";

import { createHash } from "node:crypto";
import { and, count, desc, eq, gt, inArray, isNotNull, isNull, like, or, sql } from "drizzle-orm";
import type { PgQueryResultHKT } from "drizzle-orm/pg-core/session";

import { writeAuditLog } from "@/audit/service";
import { requirePermission } from "@/auth/permissions";
import {
  applications,
  applicationLocalizations,
  assetUploadBatches,
  assets,
  authSessions,
  featureFlags,
  productApplications,
  productAssets,
  productFaqs,
  productFeatures,
  productImportBatches,
  productImportItems,
  productLocalizations,
  products,
  productTagAssignments,
  productTags,
  productTaxonomyTerms,
  taxonomyTermLocalizations,
  taxonomyTerms,
} from "@/db/schema";
import type { AppDatabase } from "@/db/types";
import { legacyTextToBlockDocument, parseBlockDocument } from "@/editorial/blocks";
import {
  changeProductSlug,
  createProductDraft,
  proposeProductImportSlugRevision,
  updateProductEditorialCopy,
  updateProductFacts,
  updateProductStructure,
  type Actor,
} from "@/catalog/product-service";
import {
  nextGeneratedProductCode,
  normalizeAssignedProductCode,
  normalizeComposition,
  normalizeMoq,
  normalizePositiveDecimal,
  normalizeProductName,
} from "@/catalog/product-data";
import { slugify } from "@/seo/path";
import type { ObjectStorage } from "@/storage";
import type { AdminUploadActor } from "@/uploads/admin-upload-service";
import { abandonProductImportUploads, IMPORT_ARCHIVE_MIME, IMPORT_WORKBOOK_MIME, releaseRelatedProductImportMedia } from "@/uploads/admin-upload-service";
import { validateFolderMediaPath } from "./archive";
import type { ImportMediaCandidate, MatchedImportMedia } from "./matching";
import { matchImportMedia } from "./matching";
import { parseProductImportWorkbook } from "./workbook";
import type { ProductImportMode, ProductImportRowInput } from "./contract";

type NormalizedImportRow = {
  name?: string;
  productCode: string;
  primaryTaxonomyTermId?: string;
  additionalTaxonomyTermIds?: string[];
  applicationIds?: string[];
  tags?: string[];
  composition?: string | null;
  weightGsm?: string | null;
  widthCm?: string | null;
  moqValue?: string | null;
  moqUnit?: "m" | "kg" | "roll" | "yd" | null;
  moqNote?: string | null;
  slug?: string;
  summary?: string | null;
  document?: ReturnType<typeof legacyTextToBlockDocument>;
  media?: Array<Pick<MatchedImportMedia, "sourceKey" | "role" | "sortOrder"> & { assetId: string; altText: string | null; caption: string | null }>;
  targetProductId?: string;
};

function safeError(error: unknown): { code: string; detail: string } {
  const detail = error instanceof Error ? error.message : "Import operation failed.";
  return {
    code: "row_validation_failed",
    detail: detail.replaceAll(/(?:[A-Za-z]:)?[/\\][^\s]+/g, "[path]").slice(0, 500),
  };
}

async function assertImportAccess<TQueryResult extends PgQueryResultHKT>(
  db: AppDatabase<TQueryResult>,
  actor: AdminUploadActor,
): Promise<void> {
  requirePermission(actor.role, "products.import");
  const now = new Date();
  const [session, flag] = await Promise.all([
    db.select({ id: authSessions.id }).from(authSessions).where(and(
      eq(authSessions.id, actor.authSessionId),
      eq(authSessions.userId, actor.userId),
      gt(authSessions.expiresAt, now),
      isNull(authSessions.revokedAt),
    )).limit(1),
    db.select({ enabled: featureFlags.enabled }).from(featureFlags)
      .where(eq(featureFlags.key, "product_import")).limit(1),
  ]);
  if (!session[0]) throw new Error("Product Import session is invalid or expired.");
  if (!flag[0]?.enabled) throw new Error("Product Import is disabled.");
}

export async function isProductImportEnabled<TQueryResult extends PgQueryResultHKT>(
  db: AppDatabase<TQueryResult>,
): Promise<boolean> {
  return (await db.select({ enabled: featureFlags.enabled }).from(featureFlags)
    .where(eq(featureFlags.key, "product_import")).limit(1))[0]?.enabled ?? false;
}

export type ProductImportPreparation =
  | { kind: "none" }
  | { kind: "archive"; fileName: string; declaredMimeType: typeof IMPORT_ARCHIVE_MIME; declaredByteSize: number }
  | { kind: "folder"; files: Array<{ relativePath: string; fileName: string; declaredMimeType: "image/jpeg" | "image/png" | "image/webp" | "image/avif"; declaredByteSize: number }> };

function folderMediaSourceKey(relativePath: string): string {
  return `m_${createHash("sha256").update(`folder-v1\0${relativePath}`).digest("hex").slice(0, 32)}`;
}

export async function prepareProductImportBatch<TQueryResult extends PgQueryResultHKT>(
  db: AppDatabase<TQueryResult>,
  actor: AdminUploadActor,
  input: { mode: ProductImportMode; workbookAssetId: string; preparation: ProductImportPreparation },
): Promise<string> {
  await assertImportAccess(db, actor);
  const workbook = (await db.select().from(assets).where(and(
    eq(assets.id, input.workbookAssetId),
    eq(assets.uploadedByUserId, actor.userId),
    eq(assets.storagePartition, "imports"),
    eq(assets.access, "internal"),
    eq(assets.status, "ready"),
    eq(assets.scanStatus, "passed"),
    eq(assets.detectedMimeType, IMPORT_WORKBOOK_MIME),
    isNull(assets.deletedAt),
  )).limit(1))[0];
  if (!workbook?.uploadBatchId) throw new Error("Workbook Asset is not an eligible finalized Import package.");
  const preparation = input.preparation.kind === "folder"
    ? {
        kind: "folder" as const,
        files: input.preparation.files.map((file) => ({
          relativePath: validateFolderMediaPath(file.relativePath),
          fileName: file.fileName.trim(),
          declaredMimeType: file.declaredMimeType,
          declaredByteSize: file.declaredByteSize,
        })).sort((left, right) => left.relativePath.localeCompare(right.relativePath, "en")),
      }
    : input.preparation;
  if (preparation.kind === "folder") {
    if (!preparation.files.length || preparation.files.length > 500) throw new Error("Folder preparation requires 1 to 500 images.");
    const pathIdentities = preparation.files.map((file) => file.relativePath.normalize("NFC").toLocaleLowerCase("en-US"));
    if (new Set(pathIdentities).size !== pathIdentities.length) throw new Error("Folder preparation paths contain a case or Unicode collision.");
    for (const file of preparation.files) {
      if (!file.fileName || file.fileName.length > 200 || file.declaredByteSize < 1 || file.declaredByteSize > 20 * 1024 * 1024) {
        throw new Error("Folder preparation contains an invalid file declaration.");
      }
    }
  }
  if (preparation.kind === "archive" && (
    !preparation.fileName.trim() || preparation.fileName.length > 200 || preparation.declaredMimeType !== IMPORT_ARCHIVE_MIME ||
    preparation.declaredByteSize < 1 || preparation.declaredByteSize > 500 * 1024 * 1024
  )) throw new Error("Archive preparation declaration is invalid.");
  const fingerprint = createHash("sha256").update(JSON.stringify({
    version: 1,
    mode: input.mode,
    workbook: workbook.sha256,
    preparation,
  })).digest("hex");
  const existing = (await db.select({ id: productImportBatches.id, authSessionId: productImportBatches.authSessionId }).from(productImportBatches).where(and(
    eq(productImportBatches.createdByUserId, actor.userId),
    eq(productImportBatches.mode, input.mode),
    eq(productImportBatches.sourceFingerprint, fingerprint),
  )).limit(1))[0];
  if (existing) {
    if (existing.authSessionId !== actor.authSessionId) throw new Error("Duplicate Import preparation belongs to another active session.");
    return existing.id;
  }
  return db.transaction(async (transaction) => {
    await assertImportAccess(transaction, actor);
    const batch = (await transaction.insert(productImportBatches).values({
      createdByUserId: actor.userId,
      authSessionId: actor.authSessionId,
      mode: input.mode,
      templateVersion: 1,
      sourceFingerprint: fingerprint,
      workbookAssetId: workbook.id,
      packageUploadBatchId: workbook.uploadBatchId,
      status: "draft",
    }).onConflictDoNothing({
      target: [productImportBatches.createdByUserId, productImportBatches.mode, productImportBatches.sourceFingerprint],
    }).returning({ id: productImportBatches.id }))[0];
    if (!batch) {
      const concurrent = (await transaction.select({ id: productImportBatches.id, authSessionId: productImportBatches.authSessionId }).from(productImportBatches).where(and(
        eq(productImportBatches.createdByUserId, actor.userId),
        eq(productImportBatches.mode, input.mode),
        eq(productImportBatches.sourceFingerprint, fingerprint),
      )).limit(1))[0];
      if (!concurrent || concurrent.authSessionId !== actor.authSessionId) throw new Error("Concurrent Import preparation identity could not be recovered safely.");
      return concurrent.id;
    }
    if (preparation.kind === "folder") await transaction.insert(productImportItems).values(preparation.files.map((file) => ({
      batchId: batch.id,
      kind: "media",
      sourceKey: folderMediaSourceKey(file.relativePath),
      status: "pending",
      rawData: { preparationKind: "folder", relativePath: file.relativePath, displayName: file.fileName, declaredMimeType: file.declaredMimeType, declaredByteSize: file.declaredByteSize },
      normalizedData: {},
    })));
    if (preparation.kind === "archive") await transaction.insert(productImportItems).values({
      batchId: batch.id,
      kind: "media",
      sourceKey: "archive:package",
      status: "pending",
      rawData: { preparationKind: "archive", displayName: preparation.fileName, declaredMimeType: preparation.declaredMimeType, declaredByteSize: preparation.declaredByteSize },
      normalizedData: {},
    });
    await writeAuditLog(transaction, {
      actorUserId: actor.userId,
      action: "product_import.prepared",
      entityType: "product_import_batch",
      entityId: batch.id,
      afterSummary: { mode: input.mode, preparation: preparation.kind, plannedMedia: preparation.kind === "folder" ? preparation.files.length : 0 },
    });
    return batch.id;
  });
}

async function resolveTaxonomy<TQueryResult extends PgQueryResultHKT>(
  db: AppDatabase<TQueryResult>,
  value: string,
): Promise<{ id: string; prefix: string | null }> {
  const identifiers = [eq(taxonomyTerms.internalKey, value), eq(taxonomyTermLocalizations.name, value)];
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)) identifiers.unshift(eq(taxonomyTerms.id, value));
  const rows = await db.select({ id: taxonomyTerms.id, prefix: taxonomyTerms.productCodePrefix })
    .from(taxonomyTerms)
    .leftJoin(taxonomyTermLocalizations, and(
      eq(taxonomyTermLocalizations.taxonomyTermId, taxonomyTerms.id),
      eq(taxonomyTermLocalizations.locale, "en"),
    ))
    .where(and(
      eq(taxonomyTerms.isActive, true),
      or(...identifiers),
    ));
  if (rows.length !== 1) throw new Error(`Managed Category could not be resolved exactly: ${value.slice(0, 100)}`);
  return rows[0]!;
}

async function resolveApplication<TQueryResult extends PgQueryResultHKT>(
  db: AppDatabase<TQueryResult>,
  value: string,
): Promise<string> {
  const identifiers = [eq(applications.internalKey, value), eq(applicationLocalizations.name, value)];
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)) identifiers.unshift(eq(applications.id, value));
  const rows = await db.select({ id: applications.id }).from(applications)
    .leftJoin(applicationLocalizations, and(
      eq(applicationLocalizations.applicationId, applications.id),
      eq(applicationLocalizations.locale, "en"),
    ))
    .where(and(
      sql`${applications.status} <> 'archived'`,
      or(...identifiers),
    ));
  if (rows.length !== 1) throw new Error(`Managed Application could not be resolved exactly: ${value.slice(0, 100)}`);
  return rows[0]!.id;
}

async function normalizeRow<TQueryResult extends PgQueryResultHKT>(
  db: AppDatabase<TQueryResult>,
  mode: ProductImportMode,
  input: ProductImportRowInput,
  media: readonly (ImportMediaCandidate & { assetId: string })[],
  reservedCodes: Set<string>,
): Promise<NormalizedImportRow> {
  const primary = input.primaryCategory ? await resolveTaxonomy(db, input.primaryCategory) : null;
  const additional = input.additionalCategories
    ? await Promise.all(input.additionalCategories.map((value) => resolveTaxonomy(db, value)))
    : undefined;
  const applicationIds = input.applications
    ? await Promise.all(input.applications.map((value) => resolveApplication(db, value)))
    : undefined;
  let targetProductId: string | undefined;
  let productCode: string;
  if (mode === "update") {
    if (!input.productCode) throw new Error("Update requires a complete Product Code.");
    productCode = normalizeAssignedProductCode(input.productCode);
    const targets = await db.select({ id: products.id, status: products.status }).from(products).where(eq(products.productCode, productCode));
    if (targets.length !== 1) throw new Error("Update Product Code must match exactly one Product.");
    targetProductId = targets[0]!.id;
  } else {
    if (!input.name) throw new Error("Create requires Name.");
    if (!primary) throw new Error("Create requires one resolved Primary Category.");
    if (input.productCode) {
      productCode = normalizeAssignedProductCode(input.productCode);
    } else {
      if (!primary.prefix) throw new Error("Primary Category has no managed Product Code prefix.");
      const existing = await db.select({ code: products.productCode }).from(products)
        .where(like(products.productCode, `CWT-${primary.prefix}-%`));
      productCode = nextGeneratedProductCode(primary.prefix, [
        ...existing.flatMap((row) => row.code ? [row.code] : []),
        ...reservedCodes,
      ]);
    }
    const duplicate = await db.select({ id: products.id }).from(products).where(eq(products.productCode, productCode)).limit(1);
    if (duplicate[0] || reservedCodes.has(productCode)) throw new Error("Product Code is already assigned.");
    reservedCodes.add(productCode);
  }
  const matches = matchImportMedia(productCode, input.imageFiles ?? [], media);
  if (matches.errors.length) throw new Error(matches.errors.join(", "));
  if (mode === "create" && matches.matched.length === 0) throw new Error("Create requires at least one deterministically matched eligible image.");
  const byKey = new Map(media.map((item) => [item.sourceKey, item]));
  const normalizedMedia = matches.matched.map((item) => ({
    sourceKey: item.sourceKey,
    role: item.role,
    sortOrder: item.sortOrder,
    assetId: byKey.get(item.sourceKey)!.assetId,
    altText: item.role === "hero" ? input.primaryImageAlt ?? null : null,
    caption: item.role === "hero" ? input.primaryImageCaption ?? null : null,
  }));
  const additiveMedia = targetProductId && normalizedMedia.length
    ? planAdditiveMedia((await existingStructure(db, targetProductId)).media, normalizedMedia)
    : normalizedMedia;
  const moq = input.moqValue || input.moqUnit ? normalizeMoq(input.moqValue, input.moqUnit) : null;
  return {
    ...(input.name ? { name: normalizeProductName(input.name) } : {}),
    productCode,
    ...(primary ? { primaryTaxonomyTermId: primary.id } : {}),
    ...(additional ? { additionalTaxonomyTermIds: additional.map((item) => item.id).filter((id) => id !== primary?.id) } : {}),
    ...(applicationIds ? { applicationIds: [...new Set(applicationIds)] } : {}),
    ...(input.tags ? { tags: input.tags.map((tag) => tag.trim()).filter(Boolean) } : {}),
    ...(input.composition ? { composition: normalizeComposition(input.composition) } : {}),
    ...(input.gsm ? { weightGsm: normalizePositiveDecimal(input.gsm, "GSM") } : {}),
    ...(input.width ? { widthCm: normalizePositiveDecimal(input.width, "Width") } : {}),
    ...(moq ? { moqValue: moq.moqValue, moqUnit: moq.moqUnit } : {}),
    ...(input.moqNote ? { moqNote: input.moqNote.trim().slice(0, 1000) } : {}),
    ...(input.slug ? { slug: slugify(input.slug) } : {}),
    ...(input.summary ? { summary: input.summary.trim().slice(0, 1000) } : {}),
    ...(input.description ? { document: legacyTextToBlockDocument(input.description) } : {}),
    ...(additiveMedia.length ? { media: additiveMedia } : {}),
    ...(targetProductId ? { targetProductId } : {}),
  };
}

export async function validatePreparedProductImport<TQueryResult extends PgQueryResultHKT>(
  db: AppDatabase<TQueryResult>,
  storage: ObjectStorage,
  actor: AdminUploadActor,
  batchId: string,
): Promise<string> {
  await assertImportAccess(db, actor);
  const batch = (await db.select().from(productImportBatches).where(and(
    eq(productImportBatches.id, batchId),
    eq(productImportBatches.createdByUserId, actor.userId),
    eq(productImportBatches.authSessionId, actor.authSessionId),
  )).limit(1))[0];
  if (!batch) throw new Error("Product Import preparation was not found.");
  if (batch.status === "validated" || batch.status === "applying" || batch.status === "completed") return batch.id;
  if (batch.status !== "draft" || !batch.workbookAssetId) throw new Error("Product Import preparation is not resumable.");
  const workbook = (await db.select().from(assets).where(and(
    eq(assets.id, batch.workbookAssetId),
    eq(assets.uploadedByUserId, actor.userId),
    eq(assets.storagePartition, "imports"),
    eq(assets.access, "internal"),
    eq(assets.status, "ready"),
    eq(assets.scanStatus, "passed"),
    eq(assets.detectedMimeType, IMPORT_WORKBOOK_MIME),
    isNull(assets.deletedAt),
  )).limit(1))[0];
  if (!workbook) throw new Error("Workbook Asset is no longer eligible for validation.");
  const parsed = await parseProductImportWorkbook(await storage.get("imports", workbook.objectKey));
  if (parsed.errors.length) throw new Error(parsed.errors[0]!.detail);
  const mediaItems = await db.select().from(productImportItems).where(and(
    eq(productImportItems.batchId, batch.id),
    eq(productImportItems.kind, "media"),
  ));
  const archivePlan = mediaItems.find((item) => item.sourceKey === "archive:package");
  if (archivePlan && !batch.mediaPackageAssetId) throw new Error("Archive upload is incomplete. Re-select the same ZIP to resume this preparation.");
  const plannedFolderItems = mediaItems.filter((item) => (item.rawData as { preparationKind?: unknown }).preparationKind === "folder");
  if (plannedFolderItems.some((item) => !item.targetAssetId || !item.uploadBatchId || item.status !== "valid")) {
    throw new Error("Folder upload is incomplete. Re-select the same folder to resume this preparation.");
  }
  const durableMediaItems = mediaItems.filter((item) => item.sourceKey !== "archive:package" && item.targetAssetId && item.uploadBatchId);
  const mediaIds = durableMediaItems.map((item) => item.targetAssetId!);
  const eligibleMedia = mediaIds.length ? await db.select({
    id: assets.id,
    sha256: assets.sha256,
    uploadBatchId: assets.uploadBatchId,
    declarationInput: assetUploadBatches.declarationInput,
  }).from(assets).innerJoin(assetUploadBatches, eq(assetUploadBatches.id, assets.uploadBatchId)).where(and(
    inArray(assets.id, mediaIds),
    eq(assets.uploadedByUserId, actor.userId),
    eq(assets.storagePartition, "public"),
    eq(assets.access, "public"),
    eq(assets.status, "ready"),
    eq(assets.scanStatus, "passed"),
    isNotNull(assets.retentionExpiresAt),
    isNull(assets.deletedAt),
  )) : [];
  if (eligibleMedia.length !== mediaIds.length) throw new Error("Prepared Import media is incomplete or no longer retained safely.");
  const eligibleById = new Map(eligibleMedia.map((item) => [item.id, item]));
  const media: Array<ImportMediaCandidate & { assetId: string }> = durableMediaItems.map((item) => {
    const eligible = eligibleById.get(item.targetAssetId!)!;
    const binding = (eligible.declarationInput as { importMediaBinding?: { productImportBatchId?: unknown; sourceKey?: unknown } } | null)?.importMediaBinding;
    if (
      eligible.uploadBatchId !== item.uploadBatchId ||
      binding?.productImportBatchId !== batch.id ||
      binding.sourceKey !== item.sourceKey ||
      (item.normalizedData as { sha256?: unknown }).sha256 !== eligible.sha256
    ) throw new Error("Prepared Import media binding does not match its durable Asset identity.");
    return {
      sourceKey: item.sourceKey,
      relativePath: String((item.rawData as { relativePath?: unknown }).relativePath ?? ""),
      sha256: eligible.sha256,
      assetId: eligible.id,
    };
  });
  if (batch.mediaPackageAssetId) {
    const mediaPackage = (await db.select({ id: assets.id }).from(assets).where(and(
      eq(assets.id, batch.mediaPackageAssetId),
      eq(assets.uploadedByUserId, actor.userId),
      eq(assets.storagePartition, "imports"),
      eq(assets.access, "internal"),
      eq(assets.status, "ready"),
      eq(assets.scanStatus, "passed"),
      eq(assets.detectedMimeType, IMPORT_ARCHIVE_MIME),
      isNull(assets.deletedAt),
    )).limit(1))[0];
    if (!mediaPackage) throw new Error("Archive package is no longer eligible for validation.");
  }
  const reservedCodes = new Set<string>();
  const normalizedRows = [] as Array<{ rowNumber: number; input: ProductImportRowInput; normalized: NormalizedImportRow | null; error: { code: string; detail: string } | null }>;
  for (const row of parsed.rows) {
    if (row.errors.length) {
      normalizedRows.push({ rowNumber: row.rowNumber, input: row.input, normalized: null, error: { code: row.errors[0]!.code, detail: row.errors[0]!.detail } });
      continue;
    }
    try {
      normalizedRows.push({ rowNumber: row.rowNumber, input: row.input, normalized: await normalizeRow(db, batch.mode as ProductImportMode, row.input, media, reservedCodes), error: null });
    } catch (error) {
      normalizedRows.push({ rowNumber: row.rowNumber, input: row.input, normalized: null, error: safeError(error) });
    }
  }
  const claims = new Map<string, number>();
  for (const row of normalizedRows) for (const item of row.normalized?.media ?? []) claims.set(item.sourceKey, (claims.get(item.sourceKey) ?? 0) + 1);
  for (const row of normalizedRows) {
    if (row.normalized?.media?.some((item) => (claims.get(item.sourceKey) ?? 0) > 1)) {
      row.error = { code: "media_claimed_by_multiple_rows", detail: "A matched image is claimed by more than one Product row." };
      row.normalized = null;
    }
  }
  const matchedMediaKeys = new Set(normalizedRows.flatMap((row) => row.normalized?.media?.map((item) => item.sourceKey) ?? []));
  return db.transaction(async (transaction) => {
    await assertImportAccess(transaction, actor);
    await transaction.execute(sql`select id from product_import_batches where id = ${batch.id} for update`);
    const current = (await transaction.select({ status: productImportBatches.status }).from(productImportBatches).where(eq(productImportBatches.id, batch.id)).limit(1))[0];
    if (current?.status === "validated") return batch.id;
    if (current?.status !== "draft") throw new Error("Product Import preparation changed before validation.");
    if (normalizedRows.length) await transaction.insert(productImportItems).values(normalizedRows.map((row) => ({
      batchId: batch.id,
      kind: "row",
      sourceKey: `row:${String(row.rowNumber).padStart(3, "0")}`,
      rowNumber: row.rowNumber,
      status: row.error ? "error" : "valid",
      rawData: row.input,
      normalizedData: row.normalized ?? {},
      errorCode: row.error?.code ?? null,
      errorDetail: row.error?.detail ?? null,
    })));
    for (const item of durableMediaItems) await transaction.update(productImportItems).set({
      status: matchedMediaKeys.has(item.sourceKey) ? "applied" : "skipped",
      warningCodes: matchedMediaKeys.has(item.sourceKey) ? [] : ["unmatched_image"],
      appliedAt: matchedMediaKeys.has(item.sourceKey) ? new Date() : null,
      updatedAt: new Date(),
    }).where(and(eq(productImportItems.id, item.id), eq(productImportItems.status, "valid")));
    if (archivePlan) await transaction.update(productImportItems).set({
      status: "skipped",
      warningCodes: ["archive_package_plan"],
      updatedAt: new Date(),
    }).where(and(eq(productImportItems.id, archivePlan.id), eq(productImportItems.status, "pending")));
    const validated = await transaction.update(productImportBatches).set({
      status: "validated",
      validatedAt: new Date(),
      failureCode: null,
      failureDetail: null,
      updatedAt: new Date(),
    }).where(and(eq(productImportBatches.id, batch.id), eq(productImportBatches.status, "draft"))).returning({ id: productImportBatches.id });
    if (!validated[0]) throw new Error("Product Import preparation changed before validation commit.");
    await writeAuditLog(transaction, {
      actorUserId: actor.userId,
      action: "product_import.validated",
      entityType: "product_import_batch",
      entityId: batch.id,
      afterSummary: { mode: batch.mode, rows: normalizedRows.length, valid: normalizedRows.filter((row) => !row.error).length },
    });
    return batch.id;
  });
}

async function existingStructure<TQueryResult extends PgQueryResultHKT>(db: AppDatabase<TQueryResult>, productId: string) {
  const [primary, additional, appRows, tagRows, mediaRows, featureRows, faqRows, localization, product] = await Promise.all([
    db.select({ id: productTaxonomyTerms.taxonomyTermId }).from(productTaxonomyTerms).where(and(eq(productTaxonomyTerms.productId, productId), eq(productTaxonomyTerms.isPrimary, true))).limit(1),
    db.select({ id: productTaxonomyTerms.taxonomyTermId }).from(productTaxonomyTerms).where(and(eq(productTaxonomyTerms.productId, productId), eq(productTaxonomyTerms.isPrimary, false))),
    db.select({ id: productApplications.applicationId }).from(productApplications).where(eq(productApplications.productId, productId)),
    db.select({ name: productTags.name }).from(productTagAssignments).innerJoin(productTags, eq(productTags.id, productTagAssignments.tagId)).where(eq(productTagAssignments.productId, productId)),
    db.select().from(productAssets).where(eq(productAssets.productId, productId)).orderBy(productAssets.role, productAssets.sortOrder, productAssets.assetId),
    db.select({ label: productFeatures.label }).from(productFeatures).where(and(eq(productFeatures.productId, productId), eq(productFeatures.locale, "en"))).orderBy(productFeatures.sortOrder),
    db.select({ question: productFaqs.question, answer: productFaqs.answer }).from(productFaqs).where(and(eq(productFaqs.productId, productId), eq(productFaqs.locale, "en"))).orderBy(productFaqs.sortOrder),
    db.select().from(productLocalizations).where(and(eq(productLocalizations.productId, productId), eq(productLocalizations.locale, "en"))).limit(1),
    db.select({
      colorOptionsDisplay: products.colorOptionsDisplay,
      customAvailableDisplay: products.customAvailableDisplay,
      sampleAvailableDisplay: products.sampleAvailableDisplay,
      moqNoteDisplay: products.moqNoteDisplay,
    }).from(products).where(eq(products.id, productId)).limit(1),
  ]);
  if (!primary[0] || !localization[0] || !product[0] || !mediaRows.length) throw new Error("Existing Product structure is incomplete.");
  return {
    primary: primary[0].id,
    additional: additional.map((row) => row.id),
    applications: appRows.map((row) => row.id),
    tags: tagRows.map((row) => row.name),
    media: mediaRows,
    features: featureRows.map((row) => row.label),
    faqs: faqRows,
    localization: localization[0],
    ...product[0],
  };
}

function planAdditiveMedia(
  existing: Array<{ assetId: string; role: string; sortOrder: number; altText: string | null; caption: string | null; isVisible: boolean }>,
  additions: NonNullable<NormalizedImportRow["media"]>,
): NonNullable<NormalizedImportRow["media"]> {
  const existingIds = new Set(existing.map((entry) => entry.assetId));
  const nextOrder = new Map<string, number>();
  for (const role of ["hero", "gallery", "detail", "application"] as const) {
    nextOrder.set(role, Math.max(-1, ...existing.filter((entry) => entry.role === role).map((entry) => entry.sortOrder)) + 1);
  }
  const hasHero = existing.some((entry) => entry.role === "hero");
  return additions.filter((entry) => !existingIds.has(entry.assetId)).map((entry) => {
    const role = entry.role === "hero" && hasHero ? "gallery" : entry.role;
    const sortOrder = nextOrder.get(role) ?? 0;
    nextOrder.set(role, sortOrder + 1);
    return { ...entry, role, sortOrder };
  });
}

async function applyRow<TQueryResult extends PgQueryResultHKT>(
  db: AppDatabase<TQueryResult>, actor: AdminUploadActor, item: typeof productImportItems.$inferSelect, mode: ProductImportMode,
): Promise<{ productId: string; revisionId: string | null }> {
  const normalized = item.normalizedData as NormalizedImportRow;
  const productActor: Actor = { userId: actor.userId, role: actor.role };
  const factsInput = {
    ...(normalized.composition !== undefined ? { composition: normalized.composition } : {}),
    ...(normalized.weightGsm !== undefined ? { weightGsm: normalized.weightGsm } : {}),
    ...(normalized.widthCm !== undefined ? { widthCm: normalized.widthCm } : {}),
    ...(normalized.moqValue !== undefined ? { moqValue: normalized.moqValue } : {}),
    ...(normalized.moqUnit !== undefined ? { moqUnit: normalized.moqUnit } : {}),
    ...(normalized.moqNote !== undefined ? { moqNote: normalized.moqNote } : {}),
  };
  if (mode === "create") {
    const media = normalized.media ?? [];
    const productId = await createProductDraft(db, productActor, {
      name: normalized.name!,
      primaryTaxonomyTermId: normalized.primaryTaxonomyTermId!,
      assetIds: media.map((entry) => entry.assetId),
      productCode: normalized.productCode,
      ...(normalized.slug ? { requestedSlug: normalized.slug } : {}),
      importItemId: item.id,
    });
    if (Object.keys(factsInput).length) await updateProductFacts(db, productActor, productId, factsInput);
    if (normalized.summary !== undefined || normalized.document) await updateProductEditorialCopy(db, productActor, productId, {
      name: normalized.name!,
      ...(normalized.summary !== undefined ? { shortDescription: normalized.summary } : {}),
      structuredDocument: normalized.document ?? { version: 1, blocks: [] },
    });
    await updateProductStructure(db, productActor, productId, {
      primaryTaxonomyTermId: normalized.primaryTaxonomyTermId!,
      additionalTaxonomyTermIds: normalized.additionalTaxonomyTermIds ?? [],
      applicationIds: normalized.applicationIds ?? [],
      tagNames: normalized.tags ?? [],
      assetIds: media.map((entry) => entry.assetId),
      heroAssetId: media.find((entry) => entry.role === "hero")!.assetId,
      media: media.map((entry) => ({ assetId: entry.assetId, role: entry.role, sortOrder: entry.sortOrder, altText: entry.altText, caption: entry.caption, isVisible: true })),
      features: [], faqs: [], colorOptionsDisplay: "inherit", customAvailableDisplay: "inherit", sampleAvailableDisplay: "inherit", moqNoteDisplay: "hide",
    });
    await releaseRelatedProductImportMedia(db, media.map((entry) => entry.assetId));
    return { productId, revisionId: null };
  }
  const productId = normalized.targetProductId!;
  const current = await existingStructure(db, productId);
  let revisionId: string | null = null;
  if (normalized.composition !== undefined || normalized.weightGsm !== undefined || normalized.widthCm !== undefined || normalized.moqValue !== undefined || normalized.moqNote !== undefined) {
    revisionId = await updateProductFacts(db, productActor, productId, factsInput);
  }
  if (normalized.name || normalized.summary !== undefined || normalized.document) {
    revisionId = await updateProductEditorialCopy(db, productActor, productId, {
      name: normalized.name ?? current.localization.name,
      shortDescription: normalized.summary ?? current.localization.shortDescription,
      structuredDocument: normalized.document ?? parseBlockDocument(current.localization.structuredBlocks, "product"),
      expectedEditorDocumentVersion: current.localization.editorDocumentVersion,
    }) ?? revisionId;
  }
  if (normalized.primaryTaxonomyTermId || normalized.additionalTaxonomyTermIds || normalized.applicationIds || normalized.tags || normalized.media) {
    const existingMedia = current.media.map((entry) => ({
      sourceKey: `existing_${entry.assetId.replaceAll("-", "")}`,
      assetId: entry.assetId,
      role: entry.role as "hero" | "gallery" | "detail" | "application",
      sortOrder: entry.sortOrder,
      altText: entry.altText,
      caption: entry.caption,
      isVisible: entry.isVisible,
    }));
    const media = normalized.media
      ? [...existingMedia, ...planAdditiveMedia(current.media, normalized.media)]
      : existingMedia;
    revisionId = await updateProductStructure(db, productActor, productId, {
      primaryTaxonomyTermId: normalized.primaryTaxonomyTermId ?? current.primary,
      additionalTaxonomyTermIds: normalized.additionalTaxonomyTermIds ?? current.additional,
      applicationIds: normalized.applicationIds ?? current.applications,
      tagNames: normalized.tags ?? current.tags,
      assetIds: media.map((entry) => entry.assetId),
      heroAssetId: media.find((entry) => entry.role === "hero")!.assetId,
      media: media.map((entry) => ({
        assetId: entry.assetId,
        role: entry.role,
        sortOrder: entry.sortOrder,
        altText: entry.altText,
        caption: entry.caption,
        isVisible: "isVisible" in entry && typeof entry.isVisible === "boolean" ? entry.isVisible : true,
      })),
      features: current.features,
      faqs: current.faqs,
      colorOptionsDisplay: current.colorOptionsDisplay,
      customAvailableDisplay: current.customAvailableDisplay,
      sampleAvailableDisplay: current.sampleAvailableDisplay,
      moqNoteDisplay: current.moqNoteDisplay,
    }) ?? revisionId;
    await releaseRelatedProductImportMedia(db, media.map((entry) => entry.assetId));
  }
  const status = (await db.select({ status: products.status }).from(products).where(eq(products.id, productId)).limit(1))[0]?.status;
  if (normalized.slug && status !== "published") await changeProductSlug(db, productActor, productId, normalized.slug);
  if (normalized.slug && status === "published") revisionId = await proposeProductImportSlugRevision(db, productActor, productId, normalized.slug);
  return { productId, revisionId };
}

export async function applyProductImportBatch<TQueryResult extends PgQueryResultHKT>(db: AppDatabase<TQueryResult>, actor: AdminUploadActor, batchId: string): Promise<void> {
  await assertImportAccess(db, actor);
  const claimed = await db.transaction(async (transaction) => {
    await assertImportAccess(transaction, actor);
    await transaction.execute(sql`select id from product_import_batches where id = ${batchId} for update`);
    const current = (await transaction.select().from(productImportBatches).where(and(
      eq(productImportBatches.id, batchId),
      eq(productImportBatches.createdByUserId, actor.userId),
      eq(productImportBatches.authSessionId, actor.authSessionId),
    )).limit(1))[0];
    if (!current) throw new Error("Import Batch was not found.");
    if (current.status === "completed") return { batch: current, alreadyCompleted: true };
    if (current.status !== "validated" && current.status !== "applying") {
      throw new Error("Import Batch is not validated or resumable.");
    }
    const rows = await transaction.update(productImportBatches).set({ status: "applying", applyStartedAt: new Date(), failureCode: null, failureDetail: null, updatedAt: new Date() })
      .where(and(eq(productImportBatches.id, batchId), eq(productImportBatches.createdByUserId, actor.userId), eq(productImportBatches.authSessionId, actor.authSessionId), inArray(productImportBatches.status, ["validated", "applying"])))
      .returning();
    if (!rows[0]) throw new Error("Import Batch changed before Apply could start.");
    await writeAuditLog(transaction, { actorUserId: actor.userId, action: current.status === "applying" ? "product_import.apply_resumed" : "product_import.apply_started", entityType: "product_import_batch", entityId: batchId });
    return { batch: rows[0], alreadyCompleted: false };
  });
  if (claimed.alreadyCompleted) return;
  const items = await db.select().from(productImportItems).where(and(eq(productImportItems.batchId, batchId), eq(productImportItems.kind, "row"), eq(productImportItems.status, "valid"))).orderBy(productImportItems.rowNumber);
  for (const item of items) {
    try {
      await db.transaction(async (transaction) => {
        const claimedItem = await transaction.update(productImportItems)
          .set({ status: "pending", lastAttemptAt: new Date(), updatedAt: new Date() })
          .where(and(eq(productImportItems.id, item.id), eq(productImportItems.status, "valid")))
          .returning();
        if (!claimedItem[0]) return;
        const result = await applyRow(transaction, actor, claimedItem[0], claimed.batch.mode as ProductImportMode);
        const updated = await transaction.update(productImportItems).set({ status: "applied", targetProductId: result.productId, attemptCount: sql`${productImportItems.attemptCount} + 1`, lastAttemptAt: new Date(), appliedAt: new Date(), errorCode: null, errorDetail: null, updatedAt: new Date() })
          .where(and(eq(productImportItems.id, item.id), eq(productImportItems.status, "pending"))).returning({ id: productImportItems.id });
        if (!updated[0]) throw new Error("Import Item changed before result commit.");
        await writeAuditLog(transaction, { actorUserId: actor.userId, action: "product_import.item_applied", entityType: "product_import_item", entityId: item.id, afterSummary: { productId: result.productId, revisionId: result.revisionId } });
      });
    } catch (error) {
      const safe = safeError(error);
      const failure = { code: "row_apply_failed", detail: safe.detail };
      await db.transaction(async (transaction) => {
        // A concurrent continuation may have claimed this row after the failed
        // transaction rolled back. Never overwrite that durable winner with the
        // stale caller's failure result.
        const failed = await transaction.update(productImportItems).set({ status: "error", attemptCount: sql`${productImportItems.attemptCount} + 1`, lastAttemptAt: new Date(), errorCode: failure.code, errorDetail: failure.detail, updatedAt: new Date() }).where(and(
          eq(productImportItems.id, item.id),
          eq(productImportItems.status, "valid"),
        )).returning({ id: productImportItems.id });
        if (failed[0]) {
          await writeAuditLog(transaction, { actorUserId: actor.userId, action: "product_import.item_failed", entityType: "product_import_item", entityId: item.id, afterSummary: { errorCode: failure.code } });
        }
      });
    }
  }
  await db.transaction(async (transaction) => {
    const unfinished = await transaction.select({ value: count() }).from(productImportItems).where(and(
      eq(productImportItems.batchId, batchId),
      eq(productImportItems.kind, "row"),
      inArray(productImportItems.status, ["valid", "pending"]),
    ));
    if (Number(unfinished[0]?.value ?? 0) > 0) return;
    const completed = await transaction.update(productImportBatches).set({ status: "completed", completedAt: new Date(), updatedAt: new Date() }).where(and(eq(productImportBatches.id, batchId), eq(productImportBatches.status, "applying"))).returning({ id: productImportBatches.id });
    if (completed[0]) await writeAuditLog(transaction, { actorUserId: actor.userId, action: "product_import.completed", entityType: "product_import_batch", entityId: batchId });
  });
}

export async function retryProductImportErrors<TQueryResult extends PgQueryResultHKT>(db: AppDatabase<TQueryResult>, actor: AdminUploadActor, batchId: string): Promise<void> {
  await assertImportAccess(db, actor);
  await db.transaction(async (transaction) => {
    const batch = (await transaction.select().from(productImportBatches).where(and(eq(productImportBatches.id, batchId), eq(productImportBatches.createdByUserId, actor.userId), eq(productImportBatches.authSessionId, actor.authSessionId), eq(productImportBatches.status, "completed"))).limit(1))[0];
    if (!batch) throw new Error("Completed Import Batch was not found.");
    const changed = await transaction.update(productImportItems).set({ status: "valid", errorCode: null, errorDetail: null, updatedAt: new Date() }).where(and(eq(productImportItems.batchId, batchId), eq(productImportItems.kind, "row"), eq(productImportItems.status, "error"), eq(productImportItems.errorCode, "row_apply_failed"))).returning({ id: productImportItems.id });
    if (!changed.length) throw new Error("Import Batch has no retryable Row Errors.");
    await transaction.update(productImportBatches).set({ status: "validated", completedAt: null, updatedAt: new Date() }).where(eq(productImportBatches.id, batchId));
    await writeAuditLog(transaction, { actorUserId: actor.userId, action: "product_import.errors_retried", entityType: "product_import_batch", entityId: batchId, afterSummary: { count: changed.length } });
  });
}

export async function cancelProductImportBatch<TQueryResult extends PgQueryResultHKT>(
  db: AppDatabase<TQueryResult>,
  storage: ObjectStorage,
  actor: AdminUploadActor,
  batchId: string,
): Promise<void> {
  await assertImportAccess(db, actor);
  await db.transaction(async (transaction) => {
    await assertImportAccess(transaction, actor);
    await transaction.execute(sql`select id from product_import_batches where id = ${batchId} for update`);
    const cancelled = await transaction.update(productImportBatches).set({
      status: "failed",
      failureCode: "operator_cancelled",
      failureDetail: "Import was cancelled before Apply.",
      completedAt: new Date(),
      updatedAt: new Date(),
    }).where(and(
      eq(productImportBatches.id, batchId),
      eq(productImportBatches.createdByUserId, actor.userId),
      eq(productImportBatches.authSessionId, actor.authSessionId),
      inArray(productImportBatches.status, ["draft", "validated"]),
    )).returning({ id: productImportBatches.id });
    if (!cancelled[0]) throw new Error("Only a Draft or validated Import Batch can be cancelled.");
    await transaction.update(productImportItems).set({ status: "skipped", updatedAt: new Date() }).where(and(
      eq(productImportItems.batchId, batchId),
      eq(productImportItems.kind, "row"),
      eq(productImportItems.status, "valid"),
    ));
    await transaction.update(productImportItems).set({ status: "skipped", updatedAt: new Date() }).where(and(
      eq(productImportItems.batchId, batchId),
      eq(productImportItems.kind, "media"),
      inArray(productImportItems.status, ["pending", "valid", "applied"]),
    ));
    await writeAuditLog(transaction, {
      actorUserId: actor.userId,
      action: "product_import.cancelled",
      entityType: "product_import_batch",
      entityId: batchId,
    });
  });
  await abandonProductImportUploads(db, storage, actor, batchId);
}

export async function correctProductImportRow<TQueryResult extends PgQueryResultHKT>(
  db: AppDatabase<TQueryResult>,
  actor: AdminUploadActor,
  batchId: string,
  itemId: string,
  input: ProductImportRowInput,
): Promise<void> {
  await assertImportAccess(db, actor);
  const [batch, item, mediaRows, reservedRows] = await Promise.all([
    db.select().from(productImportBatches).where(and(eq(productImportBatches.id, batchId), eq(productImportBatches.createdByUserId, actor.userId), eq(productImportBatches.authSessionId, actor.authSessionId), inArray(productImportBatches.status, ["validated", "completed"]))).limit(1),
    db.select().from(productImportItems).where(and(eq(productImportItems.id, itemId), eq(productImportItems.batchId, batchId), eq(productImportItems.kind, "row"), eq(productImportItems.status, "error"))).limit(1),
    db.select().from(productImportItems).where(and(eq(productImportItems.batchId, batchId), eq(productImportItems.kind, "media"), inArray(productImportItems.status, ["applied", "skipped"]))),
    db.select({ normalizedData: productImportItems.normalizedData }).from(productImportItems).where(and(eq(productImportItems.batchId, batchId), eq(productImportItems.kind, "row"), inArray(productImportItems.status, ["valid", "applied"]))),
  ]);
  if (!batch[0] || !item[0]) throw new Error("Only an existing Row Error can be corrected.");
  const currentBatch = batch[0];
  const media = mediaRows.map((row) => ({
    sourceKey: row.sourceKey,
    relativePath: String((row.rawData as { relativePath?: unknown }).relativePath ?? ""),
    sha256: String((row.normalizedData as { sha256?: unknown }).sha256 ?? ""),
    assetId: row.targetAssetId!,
  }));
  const reserved = new Set(reservedRows.flatMap((row) => {
    const code = (row.normalizedData as { productCode?: unknown }).productCode;
    return typeof code === "string" ? [code] : [];
  }));
  const normalized = await normalizeRow(db, currentBatch.mode as ProductImportMode, input, media, reserved);
  const claimedMedia = new Set(reservedRows.flatMap((row) => {
    const entries = (row.normalizedData as { media?: Array<{ sourceKey?: unknown }> }).media;
    return Array.isArray(entries) ? entries.flatMap((entry) => typeof entry.sourceKey === "string" ? [entry.sourceKey] : []) : [];
  }));
  if (normalized.media?.some((entry) => claimedMedia.has(entry.sourceKey))) {
    throw new Error("A matched image is already claimed by another Product row.");
  }
  await db.transaction(async (transaction) => {
    await assertImportAccess(transaction, actor);
    const updated = await transaction.update(productImportItems).set({
      rawData: input,
      normalizedData: normalized,
      status: "valid",
      errorCode: null,
      errorDetail: null,
      updatedAt: new Date(),
    }).where(and(eq(productImportItems.id, itemId), eq(productImportItems.status, "error"))).returning({ id: productImportItems.id });
    if (!updated[0]) throw new Error("Row Error changed before correction.");
    const correctedMediaKeys = new Set(normalized.media?.map((entry) => entry.sourceKey) ?? []);
    if (correctedMediaKeys.size) await transaction.update(productImportItems).set({
      status: "applied",
      warningCodes: [],
      appliedAt: new Date(),
      updatedAt: new Date(),
    }).where(and(
      eq(productImportItems.batchId, batchId),
      eq(productImportItems.kind, "media"),
      eq(productImportItems.status, "skipped"),
      inArray(productImportItems.sourceKey, [...correctedMediaKeys]),
    ));
    if (currentBatch.status === "completed") await transaction.update(productImportBatches).set({ status: "validated", completedAt: null, updatedAt: new Date() }).where(eq(productImportBatches.id, batchId));
    await writeAuditLog(transaction, { actorUserId: actor.userId, action: "product_import.item_corrected", entityType: "product_import_item", entityId: itemId, afterSummary: { batchId } });
  });
}

export async function listProductImportBatches<TQueryResult extends PgQueryResultHKT>(db: AppDatabase<TQueryResult>, actor: AdminUploadActor) {
  await assertImportAccess(db, actor);
  return db.select().from(productImportBatches).where(eq(productImportBatches.createdByUserId, actor.userId)).orderBy(desc(productImportBatches.createdAt)).limit(100);
}

export async function getProductImportBatch<TQueryResult extends PgQueryResultHKT>(db: AppDatabase<TQueryResult>, actor: AdminUploadActor, batchId: string) {
  await assertImportAccess(db, actor);
  const batch = (await db.select().from(productImportBatches).where(and(eq(productImportBatches.id, batchId), eq(productImportBatches.createdByUserId, actor.userId), eq(productImportBatches.authSessionId, actor.authSessionId))).limit(1))[0];
  if (!batch) throw new Error("Product Import Batch was not found.");
  const [items, counts] = await Promise.all([
    db.select().from(productImportItems).where(eq(productImportItems.batchId, batchId)).orderBy(productImportItems.kind, productImportItems.rowNumber),
    db.select({ status: productImportItems.status, value: count() }).from(productImportItems).where(and(eq(productImportItems.batchId, batchId), eq(productImportItems.kind, "row"))).groupBy(productImportItems.status),
  ]);
  return {
    batch,
    items,
    counts: Object.fromEntries(counts.map((row) => [row.status, Number(row.value)])),
    unmatchedImages: items.filter((item) => item.kind === "media" && item.status === "skipped" && item.targetAssetId).length,
  };
}
