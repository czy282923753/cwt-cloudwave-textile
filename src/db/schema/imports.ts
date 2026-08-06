import { sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { assetUploadBatches, assets } from "./assets";
import { products } from "./catalog";
import { authSessions, users } from "./identity";

export const productImportBatches = pgTable(
  "product_import_batches",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    createdByUserId: uuid("created_by_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    authSessionId: uuid("auth_session_id")
      .notNull()
      .references(() => authSessions.id, { onDelete: "restrict" }),
    mode: text("mode").notNull(),
    templateVersion: integer("template_version").notNull().default(1),
    sourceFingerprint: text("source_fingerprint").notNull(),
    workbookAssetId: uuid("workbook_asset_id").references(() => assets.id, {
      onDelete: "restrict",
    }),
    mediaPackageAssetId: uuid("media_package_asset_id").references(() => assets.id, {
      onDelete: "restrict",
    }),
    packageUploadBatchId: uuid("package_upload_batch_id").references(
      () => assetUploadBatches.id,
      { onDelete: "restrict" },
    ),
    status: text("status").notNull().default("draft"),
    failureCode: text("failure_code"),
    failureDetail: text("failure_detail"),
    validatedAt: timestamp("validated_at", { withTimezone: true }),
    applyStartedAt: timestamp("apply_started_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("product_import_batches_actor_mode_fingerprint_unique").on(
      table.createdByUserId,
      table.mode,
      table.sourceFingerprint,
    ),
    index("product_import_batches_owner_status_idx").on(
      table.createdByUserId,
      table.status,
      table.createdAt,
    ),
    check("product_import_batches_mode_check", sql`${table.mode} in ('create', 'update')`),
    check("product_import_batches_template_version_check", sql`${table.templateVersion} = 1`),
    check(
      "product_import_batches_status_check",
      sql`${table.status} in ('draft', 'validated', 'applying', 'completed', 'failed')`,
    ),
    check(
      "product_import_batches_fingerprint_check",
      sql`${table.sourceFingerprint} ~ '^[0-9a-f]{64}$'`,
    ),
    check(
      "product_import_batches_failure_code_check",
      sql`${table.failureCode} is null or length(${table.failureCode}) between 1 and 80`,
    ),
    check(
      "product_import_batches_failure_detail_check",
      sql`${table.failureDetail} is null or length(${table.failureDetail}) <= 500`,
    ),
  ],
);

export const productImportItems = pgTable(
  "product_import_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    batchId: uuid("batch_id")
      .notNull()
      .references(() => productImportBatches.id, { onDelete: "cascade" }),
    kind: text("kind").notNull(),
    sourceKey: text("source_key").notNull(),
    rowNumber: integer("row_number"),
    status: text("status").notNull().default("pending"),
    rawData: jsonb("raw_data").notNull().default({}),
    normalizedData: jsonb("normalized_data").notNull().default({}),
    warningCodes: jsonb("warning_codes").notNull().default([]),
    errorCode: text("error_code"),
    errorDetail: text("error_detail"),
    targetProductId: uuid("target_product_id").references(() => products.id, {
      onDelete: "restrict",
    }),
    targetAssetId: uuid("target_asset_id").references(() => assets.id, {
      onDelete: "restrict",
    }),
    uploadBatchId: uuid("upload_batch_id").references(() => assetUploadBatches.id, {
      onDelete: "restrict",
    }),
    attemptCount: integer("attempt_count").notNull().default(0),
    lastAttemptAt: timestamp("last_attempt_at", { withTimezone: true }),
    appliedAt: timestamp("applied_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("product_import_items_batch_kind_source_unique").on(
      table.batchId,
      table.kind,
      table.sourceKey,
    ),
    index("product_import_items_batch_status_idx").on(table.batchId, table.status, table.kind),
    index("product_import_items_target_product_idx").on(table.targetProductId),
    index("product_import_items_target_asset_idx").on(table.targetAssetId),
    check("product_import_items_kind_check", sql`${table.kind} in ('row', 'media')`),
    check(
      "product_import_items_status_check",
      sql`${table.status} in ('pending', 'valid', 'applied', 'error', 'skipped')`,
    ),
    check(
      "product_import_items_source_key_check",
      sql`length(${table.sourceKey}) between 1 and 128 and ${table.sourceKey} ~ '^[A-Za-z0-9:_-]+$'`,
    ),
    check(
      "product_import_items_row_number_check",
      sql`(${table.kind} = 'row' and ${table.rowNumber} between 2 and 101) or (${table.kind} = 'media' and ${table.rowNumber} is null)`,
    ),
    check("product_import_items_attempt_check", sql`${table.attemptCount} between 0 and 100`),
    check(
      "product_import_items_error_code_check",
      sql`${table.errorCode} is null or length(${table.errorCode}) between 1 and 80`,
    ),
    check(
      "product_import_items_error_detail_check",
      sql`${table.errorDetail} is null or length(${table.errorDetail}) <= 500`,
    ),
    check(
      "product_import_items_json_bounds_check",
      sql`octet_length(${table.rawData}::text) <= 32768 and octet_length(${table.normalizedData}::text) <= 131072 and octet_length(${table.warningCodes}::text) <= 4096`,
    ),
  ],
);
