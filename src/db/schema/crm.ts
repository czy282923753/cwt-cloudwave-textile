import {
  boolean,
  check,
  integer,
  jsonb,
  index,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

import { assets, assetUploadBatches } from "./assets";
import {
  activityTypeEnum,
  activityDirectionEnum,
  attributionConfidenceEnum,
  consentStateEnum,
  inquiryStatusEnum,
  priorityEnum,
  qualificationStatusEnum,
  outboxStatusEnum,
  uploadIntentStatusEnum,
  uploadIntentKindEnum,
  assetCategoryEnum,
  assetRoleEnum,
  uploadRecoveryKindEnum,
  uploadRecoveryStageEnum,
  uploadRecoveryStatusEnum,
  objectCleanupKindEnum,
  objectCleanupStatusEnum,
  finalizeManifestEvidenceStatusEnum,
} from "./enums";
import { users } from "./identity";

export const organizations = pgTable("organizations", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  website: text("website"),
  countryCode: text("country_code"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const contacts = pgTable(
  "contacts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id").references(() => organizations.id, {
      onDelete: "set null",
    }),
    name: text("name").notNull(),
    email: text("email").notNull(),
    normalizedEmail: text("normalized_email").notNull(),
    countryCode: text("country_code"),
    whatsapp: text("whatsapp"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("contacts_normalized_email_unique").on(table.normalizedEmail),
    index("contacts_organization_idx").on(table.organizationId),
  ],
);

export const inquiries = pgTable(
  "inquiries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    publicReference: text("public_reference").notNull(),
    contactId: uuid("contact_id")
      .notNull()
      .references(() => contacts.id, { onDelete: "restrict" }),
    ownerUserId: uuid("owner_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    status: inquiryStatusEnum("status").notNull().default("new"),
    priority: priorityEnum("priority").notNull().default("normal"),
    qualificationStatus: qualificationStatusEnum("qualification_status")
      .notNull()
      .default("unassessed"),
    description: text("description"),
    submittedName: text("submitted_name").notNull(),
    submittedEmail: text("submitted_email").notNull(),
    submittedCountryCode: text("submitted_country_code"),
    submittedWhatsapp: text("submitted_whatsapp"),
    idempotencyKey: text("idempotency_key").notNull(),
    requestFingerprint: text("request_fingerprint"),
    requestFingerprintVersion: integer("request_fingerprint_version"),
    lostReason: text("lost_reason"),
    sourcePagePath: text("source_page_path").notNull(),
    landingPagePath: text("landing_page_path"),
    referrer: text("referrer"),
    utmSource: text("utm_source"),
    utmMedium: text("utm_medium"),
    utmCampaign: text("utm_campaign"),
    lastNonDirectSource: text("last_non_direct_source"),
    lastNonDirectMedium: text("last_non_direct_medium"),
    lastNonDirectCampaign: text("last_non_direct_campaign"),
    attributionConfidence: attributionConfidenceEnum("attribution_confidence")
      .notNull()
      .default("unavailable"),
    analyticsConsentState: consentStateEnum("analytics_consent_state")
      .notNull()
      .default("unknown"),
    sessionId: text("session_id"),
    requestId: text("request_id"),
    firstResponseAt: timestamp("first_response_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
  },
  (table) => [
    index("inquiries_status_created_idx").on(table.status, table.createdAt),
    index("inquiries_owner_status_idx").on(table.ownerUserId, table.status),
    index("inquiries_contact_idx").on(table.contactId),
    uniqueIndex("inquiries_idempotency_key_unique").on(table.idempotencyKey),
    uniqueIndex("inquiries_public_reference_unique").on(table.publicReference),
    check(
      "inquiries_request_fingerprint_check",
      sql`(
        ${table.requestFingerprint} is null
        and ${table.requestFingerprintVersion} is null
      ) or (
        ${table.requestFingerprint} is not null
        and ${table.requestFingerprintVersion} is not null
        and
        ${table.requestFingerprint} ~ '^[0-9a-f]{64}$'
        and ${table.requestFingerprintVersion} >= 1
      )`,
    ),
  ],
);

export const uploadIntents = pgTable(
  "upload_intents",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tokenHash: text("token_hash").notNull(),
    kind: uploadIntentKindEnum("kind").notNull().default("inquiry"),
    anonymousSessionId: text("anonymous_session_id").notNull(),
    createdByUserId: uuid("created_by_user_id").references(() => users.id, {
      onDelete: "cascade",
    }),
    authSessionId: uuid("auth_session_id"),
    uploadBatchId: uuid("upload_batch_id").references(() => assetUploadBatches.id, {
      onDelete: "cascade",
    }),
    adminAssetCategory: assetCategoryEnum("admin_asset_category"),
    adminAssetRole: assetRoleEnum("admin_asset_role"),
    associationType: text("association_type"),
    associationEntityId: uuid("association_entity_id"),
    sortOrder: integer("sort_order"),
    declaredFileName: text("declared_file_name").notNull(),
    declaredMimeType: text("declared_mime_type").notNull(),
    declaredByteSize: integer("declared_byte_size").notNull(),
    status: uploadIntentStatusEnum("status").notNull().default("created"),
    assetId: uuid("asset_id").references(() => assets.id, { onDelete: "restrict" }),
    consumedByInquiryId: uuid("consumed_by_inquiry_id").references(
      (): typeof inquiries.id => inquiries.id,
      { onDelete: "set null" },
    ),
    isConsumed: boolean("is_consumed").notNull().default(false),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    usedAt: timestamp("used_at", { withTimezone: true }),
    failureReason: text("failure_reason"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("upload_intents_token_hash_unique").on(table.tokenHash),
    index("upload_intents_session_status_idx").on(
      table.anonymousSessionId,
      table.status,
    ),
    index("upload_intents_expiry_idx").on(table.expiresAt),
    index("upload_intents_admin_owner_idx").on(
      table.createdByUserId,
      table.authSessionId,
      table.status,
    ),
    index("upload_intents_batch_idx").on(table.uploadBatchId, table.status),
  ],
);

/** Durable Saga state for Admin staging and Finalize external side effects. */
export const uploadRecoveryJobs = pgTable(
  "upload_recovery_jobs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    kind: uploadRecoveryKindEnum("kind").notNull(),
    uploadBatchId: uuid("upload_batch_id")
      .notNull()
      .references(() => assetUploadBatches.id, { onDelete: "cascade" }),
    uploadIntentId: uuid("upload_intent_id").references(
      (): typeof uploadIntents.id => uploadIntents.id,
      { onDelete: "cascade" },
    ),
    assetId: uuid("asset_id").references(() => assets.id, { onDelete: "set null" }),
    storagePartition: text("storage_partition"),
    objectKey: text("object_key"),
    status: uploadRecoveryStatusEnum("status").notNull().default("pending"),
    stage: uploadRecoveryStageEnum("stage").notNull().default("preregistered"),
    attemptCount: integer("attempt_count").notNull().default(0),
    maxAttempts: integer("max_attempts").notNull().default(8),
    nextAttemptAt: timestamp("next_attempt_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    lockedBy: text("locked_by"),
    lockedAt: timestamp("locked_at", { withTimezone: true }),
    leaseExpiresAt: timestamp("lease_expires_at", { withTimezone: true }),
    version: integer("version").notNull().default(0),
    lastError: text("last_error"),
    startedAt: timestamp("started_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("upload_recovery_jobs_intent_unique").on(table.uploadIntentId),
    uniqueIndex("upload_recovery_jobs_finalize_batch_unique")
      .on(table.uploadBatchId)
      .where(sql`${table.kind} = 'finalize'`),
    index("upload_recovery_jobs_work_idx").on(
      table.status,
      table.nextAttemptAt,
      table.leaseExpiresAt,
    ),
    index("upload_recovery_jobs_batch_idx").on(table.uploadBatchId, table.kind),
  ],
);

/**
 * Authoritative, attempt-scoped object set for a Finalize Saga.
 *
 * This record deliberately lives independently from object_cleanup_jobs: a
 * missing or damaged compensation row must never erase the durable knowledge
 * of which Public object was written and may need recovery.
 */
export const finalizeObjectManifestItems = pgTable(
  "finalize_object_manifest_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    recoveryJobId: uuid("recovery_job_id")
      .notNull()
      .references(() => uploadRecoveryJobs.id, { onDelete: "restrict" }),
    uploadBatchId: uuid("upload_batch_id")
      .notNull()
      .references(() => assetUploadBatches.id, { onDelete: "cascade" }),
    finalizeAttempt: integer("finalize_attempt").notNull(),
    assetId: uuid("asset_id")
      .notNull()
      .references(() => assets.id, { onDelete: "restrict" }),
    objectKey: text("object_key").notNull(),
    objectRole: text("object_role").notNull(),
    mimeType: text("mime_type").notNull(),
    byteSize: integer("byte_size").notNull(),
    writeCompletedAt: timestamp("write_completed_at", { withTimezone: true }),
    evidenceStatus: finalizeManifestEvidenceStatusEnum("evidence_status")
      .notNull()
      .default("unverified"),
    evidenceSource: text("evidence_source").notNull().default("unverified"),
    evidenceVerifiedAt: timestamp("evidence_verified_at", { withTimezone: true }),
    observedByteSize: integer("observed_byte_size"),
    observedMimeType: text("observed_mime_type"),
    observedAt: timestamp("observed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("finalize_manifest_attempt_object_unique").on(
      table.recoveryJobId,
      table.finalizeAttempt,
      table.objectKey,
    ),
    index("finalize_manifest_batch_attempt_idx").on(
      table.uploadBatchId,
      table.finalizeAttempt,
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
    uploadIntentId: uuid("upload_intent_id").references(() => uploadIntents.id, {
      onDelete: "restrict",
    }),
    assetId: uuid("asset_id").references(() => assets.id, { onDelete: "set null" }),
    storagePartition: text("storage_partition").notNull(),
    objectKey: text("object_key").notNull(),
    reason: text("reason").notNull(),
    cleanupKind: objectCleanupKindEnum("cleanup_kind").notNull().default("generic"),
    status: objectCleanupStatusEnum("status").notNull().default("pending"),
    finalizeRecoveryId: uuid("finalize_recovery_id").references(
      () => uploadRecoveryJobs.id,
      { onDelete: "restrict" },
    ),
    recoveryVersion: integer("recovery_version"),
    finalizeAttempt: integer("finalize_attempt"),
    finalizeManifestItemId: uuid("finalize_manifest_item_id").references(
      () => finalizeObjectManifestItems.id,
      { onDelete: "restrict" },
    ),
    expectedObjectRole: text("expected_object_role"),
    expectedMimeType: text("expected_mime_type"),
    expectedByteSize: integer("expected_byte_size"),
    writeCompletedAt: timestamp("write_completed_at", { withTimezone: true }),
    armedAt: timestamp("armed_at", { withTimezone: true }),
    armedReason: text("armed_reason"),
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
    index("object_cleanup_jobs_intent_idx").on(table.uploadIntentId, table.status),
    index("object_cleanup_jobs_manifest_idx").on(table.finalizeManifestItemId),
    index("object_cleanup_jobs_finalize_idx").on(
      table.finalizeRecoveryId,
      table.finalizeAttempt,
      table.status,
    ),
    check(
      "object_cleanup_finalize_state_check",
      sql`${table.finalizeRecoveryId} is null or (
        ${table.cleanupKind} = 'finalize_public'
        and ${table.storagePartition} = 'public'
        and ${table.recoveryVersion} is not null
        and ${table.finalizeAttempt} is not null
        and ${table.finalizeManifestItemId} is not null
        and ${table.expectedObjectRole} is not null
        and ${table.expectedMimeType} is not null
        and ${table.expectedByteSize} is not null
        and (
          (${table.status} = 'standby' and ${table.armedAt} is null and ${table.completedAt} is null)
          or (${table.status} = 'cancelled' and ${table.armedAt} is null)
          or (${table.status} in ('pending', 'processing', 'completed', 'dead') and ${table.armedAt} is not null)
        )
      )`,
    ),
  ],
);

export const inquiryAssets = pgTable(
  "inquiry_assets",
  {
    inquiryId: uuid("inquiry_id")
      .notNull()
      .references(() => inquiries.id, { onDelete: "cascade" }),
    assetId: uuid("asset_id")
      .notNull()
      .references(() => assets.id, { onDelete: "restrict" }),
  },
  (table) => [primaryKey({ columns: [table.inquiryId, table.assetId] })],
);

export const customerActivities = pgTable(
  "customer_activities",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    inquiryId: uuid("inquiry_id")
      .notNull()
      .references(() => inquiries.id, { onDelete: "cascade" }),
    contactId: uuid("contact_id")
      .notNull()
      .references(() => contacts.id, { onDelete: "restrict" }),
    type: activityTypeEnum("type").notNull(),
    direction: activityDirectionEnum("direction").notNull().default("internal"),
    content: text("content").notNull(),
    createdByUserId: uuid("created_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("customer_activities_inquiry_idx").on(table.inquiryId, table.occurredAt),
    index("customer_activities_contact_idx").on(table.contactId),
  ],
);

export const notificationOutbox = pgTable(
  "notification_outbox",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    kind: text("kind").notNull(),
    aggregateType: text("aggregate_type").notNull(),
    aggregateId: uuid("aggregate_id").notNull(),
    status: outboxStatusEnum("status").notNull().default("pending"),
    attempts: integer("attempts").notNull().default(0),
    attemptCount: integer("attempt_count").notNull().default(0),
    deliveryKey: text("delivery_key").notNull(),
    payload: jsonb("payload").notNull(),
    nextAttemptAt: timestamp("next_attempt_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    lastErrorCode: text("last_error_code"),
    lastError: text("last_error"),
    lockedAt: timestamp("locked_at", { withTimezone: true }),
    lockedBy: text("locked_by"),
    leaseExpiresAt: timestamp("lease_expires_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    processedAt: timestamp("processed_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("notification_outbox_kind_aggregate_unique").on(
      table.kind,
      table.aggregateType,
      table.aggregateId,
    ),
    uniqueIndex("notification_outbox_delivery_key_unique").on(table.deliveryKey),
    index("notification_outbox_delivery_idx").on(table.status, table.nextAttemptAt),
  ],
);

export const inquiryStatusHistory = pgTable(
  "inquiry_status_history",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    inquiryId: uuid("inquiry_id")
      .notNull()
      .references(() => inquiries.id, { onDelete: "cascade" }),
    fromStatus: inquiryStatusEnum("from_status"),
    toStatus: inquiryStatusEnum("to_status").notNull(),
    reason: text("reason"),
    changedByUserId: uuid("changed_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    changedAt: timestamp("changed_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("inquiry_status_history_idx").on(table.inquiryId, table.changedAt)],
);
