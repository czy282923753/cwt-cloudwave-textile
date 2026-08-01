import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import {
  assetAccessEnum,
  assetUploadBatchStatusEnum,
  assetCategoryEnum,
  assetPermissionEnum,
  assetRescanStatusEnum,
  assetScanStatusEnum,
  assetStatusEnum,
  declarationReviewDecisionEnum,
  effectiveRightsDecisionEnum,
  objectCleanupStatusEnum,
  sourceDeclarationSubjectEnum,
} from "./enums";
import { authSessions, users } from "./identity";

export const assetUploadBatches = pgTable("asset_upload_batches", {
  id: uuid("id").primaryKey().defaultRandom(),
  createdByUserId: uuid("created_by_user_id").references(() => users.id, {
    onDelete: "set null",
  }),
  sourceDeclarationEnabled: boolean("source_declaration_enabled")
    .notNull()
    .default(false),
  status: assetUploadBatchStatusEnum("status").notNull().default("created"),
  authSessionId: uuid("auth_session_id").references(() => authSessions.id, {
    onDelete: "restrict",
  }),
  declaredFileCount: integer("declared_file_count").notNull().default(0),
  completedFileCount: integer("completed_file_count").notNull().default(0),
  declarationInput: jsonb("declaration_input"),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  failureReason: text("failure_reason"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const assets = pgTable(
  "assets",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    uploadBatchId: uuid("upload_batch_id").references(() => assetUploadBatches.id, {
      onDelete: "set null",
    }),
    uploadedByUserId: uuid("uploaded_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    originalFileName: text("original_file_name").notNull(),
    storageProvider: text("storage_provider").notNull(),
    storagePartition: text("storage_partition").notNull(),
    objectKey: text("object_key").notNull(),
    access: assetAccessEnum("access").notNull(),
    category: assetCategoryEnum("category").notNull(),
    status: assetStatusEnum("status").notNull().default("uploaded"),
    declaredMimeType: text("declared_mime_type").notNull(),
    detectedMimeType: text("detected_mime_type"),
    byteSize: integer("byte_size").notNull(),
    sha256: text("sha256").notNull(),
    width: integer("width"),
    height: integer("height"),
    altText: text("alt_text"),
    scanProvider: text("scan_provider"),
    scanStatus: assetScanStatusEnum("scan_status").notNull().default("pending"),
    scanResult: text("scan_result"),
    scanFailureReason: text("scan_failure_reason"),
    scanCompletedAt: timestamp("scan_completed_at", { withTimezone: true }),
    rescanStatus: assetRescanStatusEnum("rescan_status")
      .notNull()
      .default("not_required"),
    rescanAttemptCount: integer("rescan_attempt_count").notNull().default(0),
    lastRescanAttemptAt: timestamp("last_rescan_attempt_at", {
      withTimezone: true,
    }),
    sourceDeclarationEnabled: boolean("source_declaration_enabled")
      .notNull()
      .default(false),
    sourceType: text("source_type"),
    sourceProvider: text("source_provider"),
    rightsStatus: text("rights_status"),
    subjectRelationship: sourceDeclarationSubjectEnum("subject_relationship"),
    publicUsePermission: assetPermissionEnum("public_use_permission"),
    editingPermission: assetPermissionEnum("editing_permission"),
    usageRestrictions: text("usage_restrictions"),
    permissionEvidence: text("permission_evidence"),
    declarationStatementVersion: integer("declaration_statement_version")
      .notNull()
      .default(0),
    declarationRecordVersion: integer("declaration_record_version")
      .notNull()
      .default(0),
    declarationLastEditorUserId: uuid(
      "declaration_last_editor_user_id",
    ).references(() => users.id, { onDelete: "set null" }),
    declarationReviewerUserId: uuid("declaration_reviewer_user_id").references(
      () => users.id,
      { onDelete: "set null" },
    ),
    declarationReviewDate: timestamp("declaration_review_date", {
      withTimezone: true,
    }),
    declarationReviewedStatementVersion: integer(
      "declaration_reviewed_statement_version",
    ),
    declarationReviewDecision: declarationReviewDecisionEnum(
      "declaration_review_decision",
    ),
    declarationReviewReason: text("declaration_review_reason"),
    effectiveRightsDecision: effectiveRightsDecisionEnum(
      "effective_rights_decision",
    ),
    rightsPublicWebsiteAllowed: boolean("rights_public_website_allowed"),
    declarationExpiryDate: timestamp("declaration_expiry_date", {
      withTimezone: true,
    }),
    isCwtOwnedFacility: boolean("is_cwt_owned_facility"),
    nonBlockingRiskHints: jsonb("non_blocking_risk_hints"),
    retentionExpiresAt: timestamp("retention_expires_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("assets_partition_object_unique").on(
      table.storagePartition,
      table.objectKey,
    ),
    index("assets_category_status_idx").on(table.category, table.status),
    index("assets_access_status_idx").on(table.access, table.status),
    index("assets_sha256_idx").on(table.sha256),
    index("assets_retention_idx").on(table.retentionExpiresAt),
    index("assets_rescan_work_idx").on(table.rescanStatus, table.updatedAt),
  ],
);

export const assetVariants = pgTable(
  "asset_variants",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    sourceAssetId: uuid("source_asset_id")
      .notNull()
      .references(() => assets.id, { onDelete: "cascade" }),
    format: text("format").notNull(),
    variantKey: text("variant_key").notNull(),
    objectKey: text("object_key").notNull(),
    byteSize: integer("byte_size").notNull(),
    width: integer("width"),
    height: integer("height"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("asset_variants_source_key_unique").on(
      table.sourceAssetId,
      table.variantKey,
    ),
  ],
);

/** Persistent compensation records for storage side effects. */
export const objectCleanupJobs = pgTable(
  "object_cleanup_jobs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    uploadBatchId: uuid("upload_batch_id").references(() => assetUploadBatches.id, {
      onDelete: "set null",
    }),
    assetId: uuid("asset_id").references(() => assets.id, { onDelete: "set null" }),
    storagePartition: text("storage_partition").notNull(),
    objectKey: text("object_key").notNull(),
    reason: text("reason").notNull(),
    status: objectCleanupStatusEnum("status").notNull().default("pending"),
    attemptCount: integer("attempt_count").notNull().default(0),
    maxAttempts: integer("max_attempts").notNull().default(8),
    nextAttemptAt: timestamp("next_attempt_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    lockedBy: text("locked_by"),
    lockedAt: timestamp("locked_at", { withTimezone: true }),
    leaseExpiresAt: timestamp("lease_expires_at", { withTimezone: true }),
    lastError: text("last_error"),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("object_cleanup_jobs_object_unique").on(
      table.storagePartition,
      table.objectKey,
    ),
    index("object_cleanup_jobs_work_idx").on(
      table.status,
      table.nextAttemptAt,
      table.leaseExpiresAt,
    ),
    index("object_cleanup_jobs_batch_idx").on(table.uploadBatchId, table.status),
  ],
);

export const assetTags = pgTable(
  "asset_tags",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
  },
  (table) => [uniqueIndex("asset_tags_slug_unique").on(table.slug)],
);

export const assetTagAssignments = pgTable(
  "asset_tag_assignments",
  {
    assetId: uuid("asset_id")
      .notNull()
      .references(() => assets.id, { onDelete: "cascade" }),
    tagId: uuid("tag_id")
      .notNull()
      .references(() => assetTags.id, { onDelete: "cascade" }),
  },
  (table) => [primaryKey({ columns: [table.assetId, table.tagId] })],
);
