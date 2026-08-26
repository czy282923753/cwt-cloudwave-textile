import { sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  check,
  date,
  foreignKey,
  index,
  integer,
  jsonb,
  pgTable,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { productLocalizations } from "./catalog";
import { contentLocalizations, editorialRevisions } from "./content";
import { appEnvironmentEnum } from "./enums";
import { users } from "./identity";

export const aiModelConfig = pgTable(
  "ai_model_config",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    capability: text("capability").notNull().default("text"),
    useCase: text("use_case").notNull(),
    provider: text("provider").notNull(),
    model: text("model").notNull(),
    parametersJson: jsonb("parameters_json").notNull().default({}),
    maxInputTokens: integer("max_input_tokens").notNull().default(16000),
    maxOutputTokens: integer("max_output_tokens").notNull().default(4000),
    maxAttempts: integer("max_attempts").notNull().default(3),
    runCostLimitMicrousd: bigint("run_cost_limit_microusd", { mode: "number" })
      .notNull()
      .default(500000),
    promptId: text("prompt_id").notNull(),
    promptVersion: integer("prompt_version").notNull(),
    promptHash: text("prompt_hash").notNull(),
    enabled: boolean("enabled").notNull().default(false),
    isDefault: boolean("is_default").notNull().default(false),
    fallbackConfigId: uuid("fallback_config_id"),
    recordVersion: bigint("record_version", { mode: "number" }).notNull().default(1),
    createdByUserId: uuid("created_by_user_id").notNull(),
    updatedByUserId: uuid("updated_by_user_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    foreignKey({
      columns: [table.createdByUserId],
      foreignColumns: [users.id],
      name: "ai_model_config_created_by_fk",
    })
      .onDelete("restrict")
      .onUpdate("no action"),
    foreignKey({
      columns: [table.updatedByUserId],
      foreignColumns: [users.id],
      name: "ai_model_config_updated_by_fk",
    })
      .onDelete("restrict")
      .onUpdate("no action"),
    foreignKey({
      columns: [table.fallbackConfigId],
      foreignColumns: [table.id],
      name: "ai_model_config_fallback_fk",
    })
      .onDelete("restrict")
      .onUpdate("no action"),
    check("ai_model_config_capability_check", sql`${table.capability} = 'text'`),
    check(
      "ai_model_config_use_case_check",
      sql`${table.useCase} in ('seo_content_draft', 'fabric_knowledge_draft', 'product_description_draft', 'sourcing_guide_draft')`,
    ),
    check(
      "ai_model_config_provider_check",
      sql`length(${table.provider}) between 1 and 64 and ${table.provider} = btrim(${table.provider}) and ${table.provider} ~ '^[a-z][a-z0-9_-]{0,63}$'`,
    ),
    check(
      "ai_model_config_model_check",
      sql`length(${table.model}) between 1 and 128 and ${table.model} = btrim(${table.model}) and ${table.model} !~ '[[:cntrl:]]'`,
    ),
    check(
      "ai_model_config_parameters_check",
      sql`jsonb_typeof(${table.parametersJson}) = 'object' and octet_length(${table.parametersJson}::text) <= 8192`,
    ),
    check(
      "ai_model_config_limits_check",
      sql`${table.maxInputTokens} between 1 and 16000 and ${table.maxOutputTokens} between 1 and 4000 and ${table.maxAttempts} between 1 and 3 and ${table.runCostLimitMicrousd} between 0 and 500000`,
    ),
    check(
      "ai_model_config_prompt_id_check",
      sql`${table.promptId} ~ '^[a-z][a-z0-9-]{0,63}$'`,
    ),
    check("ai_model_config_prompt_version_check", sql`${table.promptVersion} > 0`),
    check(
      "ai_model_config_prompt_hash_check",
      sql`${table.promptHash} ~ '^[0-9a-f]{64}$'`,
    ),
    check(
      "ai_model_config_fallback_disabled_check",
      sql`${table.fallbackConfigId} is null`,
    ),
    check("ai_model_config_record_version_check", sql`${table.recordVersion} > 0`),
    check(
      "ai_model_config_timestamps_check",
      sql`${table.updatedAt} >= ${table.createdAt}`,
    ),
    uniqueIndex("ai_model_config_enabled_default_unique")
      .on(table.capability, table.useCase)
      .where(sql`${table.enabled} = true and ${table.isDefault} = true`),
    index("ai_model_config_created_by_idx").on(table.createdByUserId),
    index("ai_model_config_updated_by_idx").on(table.updatedByUserId),
  ],
);

export const aiRuns = pgTable(
  "ai_runs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    applicationClass: text("application_class").notNull().default("draft_assistance"),
    capability: text("capability").notNull().default("text"),
    useCase: text("use_case").notNull(),
    requestedByUserId: uuid("requested_by_user_id").notNull(),
    idempotencyKey: uuid("idempotency_key").notNull(),
    requestFingerprintVersion: integer("request_fingerprint_version").notNull().default(1),
    requestFingerprint: text("request_fingerprint").notNull(),
    targetType: text("target_type").notNull(),
    targetProductId: uuid("target_product_id"),
    targetContentId: uuid("target_content_id"),
    targetRevisionId: uuid("target_revision_id"),
    targetLocale: text("target_locale"),
    expectedTargetVersion: integer("expected_target_version").notNull(),
    targetSnapshotHash: text("target_snapshot_hash").notNull(),
    modelConfigId: uuid("model_config_id").notNull(),
    modelConfigVersion: bigint("model_config_version", { mode: "number" }).notNull(),
    resolvedConfigHash: text("resolved_config_hash").notNull(),
    requestedProvider: text("requested_provider").notNull(),
    actualProvider: text("actual_provider"),
    requestedModel: text("requested_model").notNull(),
    returnedModel: text("returned_model"),
    parametersSnapshotJson: jsonb("parameters_snapshot_json").notNull(),
    maxInputTokens: integer("max_input_tokens").notNull(),
    maxOutputTokens: integer("max_output_tokens").notNull(),
    maxAttempts: integer("max_attempts").notNull(),
    promptId: text("prompt_id").notNull(),
    promptVersion: integer("prompt_version").notNull(),
    promptHash: text("prompt_hash").notNull(),
    providerEnvelopeVersion: integer("provider_envelope_version").notNull(),
    providerEnvelopeHash: text("provider_envelope_hash").notNull(),
    inputSchemaVersion: integer("input_schema_version").notNull(),
    outputSchemaVersion: integer("output_schema_version").notNull(),
    policyVersion: text("policy_version").notNull(),
    inputSourcesJson: jsonb("input_sources_json").notNull().default([]),
    inputContextJson: jsonb("input_context_json").notNull(),
    inputHash: text("input_hash").notNull(),
    attemptHistoryJson: jsonb("attempt_history_json").notNull().default([]),
    candidateJson: jsonb("candidate_json"),
    candidateHash: text("candidate_hash"),
    status: text("status").notNull().default("pending"),
    retryState: text("retry_state").notNull().default("none"),
    attemptCount: integer("attempt_count").notNull().default(0),
    nextAttemptAt: timestamp("next_attempt_at", { withTimezone: true }).defaultNow(),
    leaseOwner: text("lease_owner"),
    leaseToken: uuid("lease_token"),
    leaseAcquiredAt: timestamp("lease_acquired_at", { withTimezone: true }),
    leaseExpiresAt: timestamp("lease_expires_at", { withTimezone: true }),
    activeAttemptDispatchedAt: timestamp("active_attempt_dispatched_at", {
      withTimezone: true,
    }),
    stateVersion: bigint("state_version", { mode: "number" }).notNull().default(1),
    cancelledLeaseToken: uuid("cancelled_lease_token"),
    cancelledByUserId: uuid("cancelled_by_user_id"),
    cancellationReason: text("cancellation_reason"),
    cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
    queuedAt: timestamp("queued_at", { withTimezone: true }).notNull().defaultNow(),
    providerDispatchedAt: timestamp("provider_dispatched_at", { withTimezone: true }),
    generatedAt: timestamp("generated_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    generationDurationMs: bigint("generation_duration_ms", { mode: "number" })
      .notNull()
      .default(0),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    inputTokens: integer("input_tokens"),
    outputTokens: integer("output_tokens"),
    totalTokens: integer("total_tokens"),
    providerResponseStatus: text("provider_response_status")
      .notNull()
      .default("not_dispatched"),
    providerHttpStatus: integer("provider_http_status"),
    providerErrorCode: text("provider_error_code"),
    providerRequestId: text("provider_request_id"),
    failureCode: text("failure_code"),
    failureDetail: text("failure_detail"),
    executionEnvironment: appEnvironmentEnum("execution_environment").notNull(),
    budgetPolicyVersion: text("budget_policy_version").notNull(),
    budgetTimezone: text("budget_timezone").notNull().default("Asia/Shanghai"),
    budgetCurrency: text("budget_currency").notNull().default("USD"),
    textConcurrencyLimit: integer("text_concurrency_limit").notNull().default(2),
    budgetChargeDay: date("budget_charge_day"),
    budgetChargeMonth: date("budget_charge_month"),
    runCostLimitMicrousd: bigint("run_cost_limit_microusd", { mode: "number" }).notNull(),
    dailyHardLimitMicrousd: bigint("daily_hard_limit_microusd", {
      mode: "number",
    }).notNull(),
    monthlyWarningLimitMicrousd: bigint("monthly_warning_limit_microusd", {
      mode: "number",
    }).notNull(),
    monthlyHardLimitMicrousd: bigint("monthly_hard_limit_microusd", {
      mode: "number",
    }).notNull(),
    estimatedMaxCostMicrousd: bigint("estimated_max_cost_microusd", {
      mode: "number",
    }).notNull(),
    actualCostMicrousd: bigint("actual_cost_microusd", { mode: "number" })
      .notNull()
      .default(0),
    actualCostComplete: boolean("actual_cost_complete").notNull().default(true),
    budgetAccountedCostMicrousd: bigint("budget_accounted_cost_microusd", {
      mode: "number",
    })
      .notNull()
      .default(0),
    budgetReservedCostMicrousd: bigint("budget_reserved_cost_microusd", {
      mode: "number",
    })
      .notNull()
      .default(0),
    costAccountingState: text("cost_accounting_state").notNull().default("preflight"),
    pricingSnapshotJson: jsonb("pricing_snapshot_json").notNull(),
    humanDisposition: text("human_disposition").notNull().default("not_evaluated"),
    qualityRating: smallint("quality_rating"),
    qualityLabels: text("quality_labels").array().notNull().default(sql`'{}'::text[]`),
    qualityComment: text("quality_comment"),
    evaluatedByUserId: uuid("evaluated_by_user_id"),
    evaluatedAt: timestamp("evaluated_at", { withTimezone: true }),
    appliedTargetVersion: integer("applied_target_version"),
    appliedRevisionId: uuid("applied_revision_id"),
    appliedRevisionVersion: integer("applied_revision_version"),
  },
  (table) => [
    foreignKey({
      columns: [table.requestedByUserId],
      foreignColumns: [users.id],
      name: "ai_runs_requested_by_fk",
    })
      .onDelete("restrict")
      .onUpdate("no action"),
    foreignKey({
      columns: [table.modelConfigId],
      foreignColumns: [aiModelConfig.id],
      name: "ai_runs_model_config_fk",
    })
      .onDelete("restrict")
      .onUpdate("no action"),
    foreignKey({
      columns: [table.targetProductId, table.targetLocale],
      foreignColumns: [productLocalizations.productId, productLocalizations.locale],
      name: "ai_runs_target_product_localization_fk",
    })
      .onDelete("restrict")
      .onUpdate("no action"),
    foreignKey({
      columns: [table.targetContentId, table.targetLocale],
      foreignColumns: [contentLocalizations.contentId, contentLocalizations.locale],
      name: "ai_runs_target_content_localization_fk",
    })
      .onDelete("restrict")
      .onUpdate("no action"),
    foreignKey({
      columns: [table.targetRevisionId],
      foreignColumns: [editorialRevisions.id],
      name: "ai_runs_target_revision_fk",
    })
      .onDelete("restrict")
      .onUpdate("no action"),
    foreignKey({
      columns: [table.cancelledByUserId],
      foreignColumns: [users.id],
      name: "ai_runs_cancelled_by_fk",
    })
      .onDelete("restrict")
      .onUpdate("no action"),
    foreignKey({
      columns: [table.evaluatedByUserId],
      foreignColumns: [users.id],
      name: "ai_runs_evaluated_by_fk",
    })
      .onDelete("restrict")
      .onUpdate("no action"),
    foreignKey({
      columns: [table.appliedRevisionId],
      foreignColumns: [editorialRevisions.id],
      name: "ai_runs_applied_revision_fk",
    })
      .onDelete("restrict")
      .onUpdate("no action"),
    check(
      "ai_runs_application_scope_check",
      sql`${table.applicationClass} = 'draft_assistance' and ${table.capability} = 'text' and ${table.useCase} in ('seo_content_draft', 'fabric_knowledge_draft', 'product_description_draft', 'sourcing_guide_draft')`,
    ),
    check(
      "ai_runs_target_shape_check",
      sql`(${table.targetType} = 'product_draft' and ${table.targetProductId} is not null and ${table.targetContentId} is null and ${table.targetRevisionId} is null and ${table.targetLocale} = 'en') or (${table.targetType} = 'content_draft' and ${table.targetProductId} is null and ${table.targetContentId} is not null and ${table.targetRevisionId} is null and ${table.targetLocale} = 'en') or (${table.targetType} = 'editorial_revision' and ${table.targetProductId} is null and ${table.targetContentId} is null and ${table.targetRevisionId} is not null and ${table.targetLocale} is null)`,
    ),
    check(
      "ai_runs_target_use_case_check",
      sql`(${table.targetType} = 'product_draft' and ${table.useCase} in ('seo_content_draft', 'product_description_draft')) or (${table.targetType} = 'content_draft' and ${table.useCase} in ('seo_content_draft', 'fabric_knowledge_draft', 'sourcing_guide_draft')) or (${table.targetType} = 'editorial_revision' and ${table.useCase} in ('seo_content_draft', 'fabric_knowledge_draft', 'product_description_draft', 'sourcing_guide_draft'))`,
    ),
    check(
      "ai_runs_target_version_check",
      sql`${table.expectedTargetVersion} > 0 and ${table.targetSnapshotHash} ~ '^[0-9a-f]{64}$'`,
    ),
    check(
      "ai_runs_request_identity_check",
      sql`${table.requestFingerprintVersion} = 1 and ${table.requestFingerprint} ~ '^[0-9a-f]{64}$'`,
    ),
    check(
      "ai_runs_config_identity_check",
      sql`${table.modelConfigVersion} > 0 and ${table.resolvedConfigHash} ~ '^[0-9a-f]{64}$' and length(${table.requestedProvider}) between 1 and 64 and ${table.requestedProvider} = btrim(${table.requestedProvider}) and ${table.requestedProvider} ~ '^[a-z][a-z0-9_-]{0,63}$' and (${table.actualProvider} is null or (length(${table.actualProvider}) between 1 and 64 and ${table.actualProvider} = btrim(${table.actualProvider}) and ${table.actualProvider} ~ '^[a-z][a-z0-9_-]{0,63}$')) and length(${table.requestedModel}) between 1 and 128 and ${table.requestedModel} = btrim(${table.requestedModel}) and ${table.requestedModel} !~ '[[:cntrl:]]' and (${table.returnedModel} is null or (length(${table.returnedModel}) between 1 and 128 and ${table.returnedModel} = btrim(${table.returnedModel}) and ${table.returnedModel} !~ '[[:cntrl:]]'))`,
    ),
    check(
      "ai_runs_config_snapshot_check",
      sql`jsonb_typeof(${table.parametersSnapshotJson}) = 'object' and octet_length(${table.parametersSnapshotJson}::text) <= 8192 and ${table.maxInputTokens} between 1 and 16000 and ${table.maxOutputTokens} between 1 and 4000 and ${table.maxAttempts} between 1 and 3`,
    ),
    check(
      "ai_runs_prompt_policy_check",
      sql`${table.promptId} ~ '^[a-z][a-z0-9-]{0,63}$' and ${table.promptVersion} > 0 and ${table.promptHash} ~ '^[0-9a-f]{64}$' and ${table.providerEnvelopeVersion} > 0 and ${table.providerEnvelopeHash} ~ '^[0-9a-f]{64}$' and ${table.inputSchemaVersion} > 0 and ${table.outputSchemaVersion} > 0 and length(${table.policyVersion}) between 1 and 80 and ${table.policyVersion} = btrim(${table.policyVersion}) and ${table.policyVersion} !~ '[[:cntrl:]]' and ${table.policyVersion} ~ '^[a-z0-9][a-z0-9._-]{0,79}$'`,
    ),
    check(
      "ai_runs_input_attempt_json_check",
      sql`jsonb_typeof(${table.inputSourcesJson}) = 'array' and octet_length(${table.inputSourcesJson}::text) <= 65536 and jsonb_typeof(${table.attemptHistoryJson}) = 'array' and octet_length(${table.attemptHistoryJson}::text) <= 65536 and jsonb_typeof(${table.inputContextJson}) = 'object' and octet_length(${table.inputContextJson}::text) <= 131072 and jsonb_array_length(${table.attemptHistoryJson}) <= ${table.maxAttempts} and jsonb_array_length(${table.attemptHistoryJson}) <= ${table.attemptCount} and ${table.inputHash} ~ '^[0-9a-f]{64}$'`,
    ),
    check(
      "ai_runs_candidate_check",
      sql`(${table.status} = 'draft_ready' and ${table.candidateJson} is not null and ${table.candidateHash} is not null and jsonb_typeof(${table.candidateJson}) = 'object' and octet_length(${table.candidateJson}::text) <= 262144 and ${table.candidateHash} ~ '^[0-9a-f]{64}$') or (${table.status} <> 'draft_ready' and ${table.candidateJson} is null and ${table.candidateHash} is null)`,
    ),
    check(
      "ai_runs_status_check",
      sql`${table.status} in ('pending', 'processing', 'draft_ready', 'failed', 'cancelled')`,
    ),
    check(
      "ai_runs_retry_state_check",
      sql`(${table.status} = 'pending' and ${table.retryState} in ('none', 'scheduled')) or (${table.status} in ('processing', 'draft_ready', 'cancelled') and ${table.retryState} = 'none') or (${table.status} = 'failed' and ${table.retryState} in ('exhausted', 'not_retryable'))`,
    ),
    check(
      "ai_runs_attempt_check",
      sql`${table.attemptCount} between 0 and ${table.maxAttempts} and (${table.status} not in ('processing', 'draft_ready', 'failed') or ${table.attemptCount} >= 1) and (${table.retryState} <> 'scheduled' or ${table.attemptCount} >= 1) and (${table.attemptCount} <> 0 or ${table.status} in ('pending', 'cancelled'))`,
    ),
    check(
      "ai_runs_next_attempt_check",
      sql`(${table.status} = 'pending') = (${table.nextAttemptAt} is not null)`,
    ),
    check(
      "ai_runs_lease_shape_check",
      sql`(${table.status} = 'processing' and ${table.leaseOwner} is not null and length(${table.leaseOwner}) between 1 and 128 and ${table.leaseOwner} = btrim(${table.leaseOwner}) and ${table.leaseOwner} !~ '[[:cntrl:]]' and ${table.leaseToken} is not null and ${table.leaseAcquiredAt} is not null and ${table.leaseExpiresAt} is not null and ${table.leaseExpiresAt} > ${table.leaseAcquiredAt}) or (${table.status} <> 'processing' and ${table.leaseOwner} is null and ${table.leaseToken} is null and ${table.leaseAcquiredAt} is null and ${table.leaseExpiresAt} is null)`,
    ),
    check(
      "ai_runs_active_attempt_dispatch_check",
      sql`(${table.activeAttemptDispatchedAt} is null or (${table.status} = 'processing' and ${table.leaseAcquiredAt} is not null and ${table.leaseExpiresAt} is not null and ${table.activeAttemptDispatchedAt} >= ${table.leaseAcquiredAt} and ${table.activeAttemptDispatchedAt} < ${table.leaseExpiresAt} and ${table.providerDispatchedAt} is not null and ${table.providerDispatchedAt} <= ${table.activeAttemptDispatchedAt})) and ((${table.providerDispatchedAt} is null) = (${table.actualProvider} is null)) and (${table.providerDispatchedAt} is null or ${table.providerDispatchedAt} >= ${table.queuedAt})`,
    ),
    check("ai_runs_state_version_check", sql`${table.stateVersion} > 0`),
    check(
      "ai_runs_cancellation_check",
      sql`((${table.status} = 'cancelled' and ${table.cancelledByUserId} is not null and ${table.cancellationReason} is not null and length(${table.cancellationReason}) between 1 and 500 and ${table.cancellationReason} !~ '[[:cntrl:]]' and ${table.cancelledAt} is not null) or (${table.status} <> 'cancelled' and ${table.cancelledByUserId} is null and ${table.cancellationReason} is null and ${table.cancelledAt} is null)) and (${table.cancelledLeaseToken} is null or ${table.status} = 'cancelled')`,
    ),
    check(
      "ai_runs_terminal_time_check",
      sql`((${table.status} in ('draft_ready', 'failed', 'cancelled')) = (${table.completedAt} is not null)) and (${table.providerDispatchedAt} is null or ${table.providerDispatchedAt} >= ${table.queuedAt}) and (${table.generatedAt} is null or (${table.providerDispatchedAt} is not null and ${table.generatedAt} >= ${table.providerDispatchedAt})) and (${table.completedAt} is null or ${table.completedAt} >= ${table.queuedAt}) and (${table.status} <> 'draft_ready' or ${table.generatedAt} is not null) and (${table.status} not in ('draft_ready', 'failed') or ${table.generatedAt} is null or ${table.completedAt} >= ${table.generatedAt}) and (${table.status} <> 'cancelled' or ${table.generatedAt} is null or ${table.completedAt} >= ${table.generatedAt} or ${table.providerResponseStatus} = 'cancelled_late_response') and ${table.updatedAt} >= ${table.queuedAt} and (${table.generatedAt} is null or ${table.updatedAt} >= ${table.generatedAt}) and (${table.completedAt} is null or ${table.updatedAt} >= ${table.completedAt}) and ${table.generationDurationMs} >= 0`,
    ),
    check(
      "ai_runs_token_check",
      sql`(${table.inputTokens} is null or ${table.inputTokens} >= 0) and (${table.outputTokens} is null or ${table.outputTokens} >= 0) and (${table.totalTokens} is null or ${table.totalTokens} >= 0) and (${table.inputTokens} is null or ${table.outputTokens} is null or ${table.totalTokens} is null or ${table.totalTokens} = ${table.inputTokens} + ${table.outputTokens})`,
    ),
    check(
      "ai_runs_provider_response_check",
      sql`${table.providerResponseStatus} in ('not_dispatched', 'success', 'timeout', 'transport_error', 'rate_limited', 'quota_exceeded', 'client_error', 'server_error', 'safety_rejected', 'invalid_response', 'model_drift', 'cancelled_no_response', 'cancelled_late_response', 'unknown') and (${table.providerHttpStatus} is null or ${table.providerHttpStatus} between 100 and 599) and (${table.providerErrorCode} is null or (length(${table.providerErrorCode}) <= 80 and ${table.providerErrorCode} !~ '[[:cntrl:]]')) and (${table.providerRequestId} is null or (length(${table.providerRequestId}) <= 200 and ${table.providerRequestId} !~ '[[:cntrl:]]')) and (${table.providerResponseStatus} <> 'cancelled_no_response' or (${table.status} = 'cancelled' and ${table.cancelledLeaseToken} is not null and ${table.providerDispatchedAt} is not null)) and (${table.providerResponseStatus} <> 'cancelled_late_response' or (${table.status} = 'cancelled' and ${table.cancelledLeaseToken} is not null and ${table.providerDispatchedAt} is not null and ${table.generatedAt} is not null)) and (${table.status} <> 'draft_ready' or (${table.providerResponseStatus} = 'success' and ${table.actualProvider} = ${table.requestedProvider} and ${table.returnedModel} = ${table.requestedModel} and ${table.failureCode} is null and ${table.failureDetail} is null))`,
    ),
    check(
      "ai_runs_failure_check",
      sql`(${table.failureCode} is null or ${table.failureCode} ~ '^[a-z0-9_]{1,80}$') and (${table.failureDetail} is null or (length(${table.failureDetail}) <= 500 and ${table.failureDetail} !~ '[[:cntrl:]]')) and (${table.status} <> 'failed' or ${table.failureCode} is not null) and (${table.retryState} <> 'scheduled' or ${table.failureCode} is not null)`,
    ),
    check(
      "ai_runs_environment_budget_policy_check",
      sql`${table.budgetTimezone} = 'Asia/Shanghai' and ${table.budgetCurrency} = 'USD' and ${table.textConcurrencyLimit} = 2 and ((${table.executionEnvironment} = 'staging' and ${table.budgetPolicyVersion} = 'stage4a-staging-v1' and ${table.runCostLimitMicrousd} between 1 and 500000 and ${table.dailyHardLimitMicrousd} = 5000000 and ${table.monthlyWarningLimitMicrousd} = 50000000 and ${table.monthlyHardLimitMicrousd} = 100000000) or (${table.executionEnvironment} in ('local', 'test') and ${table.budgetPolicyVersion} = 'nonbillable-v1' and ${table.runCostLimitMicrousd} between 0 and 500000 and ${table.dailyHardLimitMicrousd} = 0 and ${table.monthlyWarningLimitMicrousd} = 0 and ${table.monthlyHardLimitMicrousd} = 0 and ${table.estimatedMaxCostMicrousd} = 0 and ${table.actualCostMicrousd} = 0 and ${table.budgetAccountedCostMicrousd} = 0 and ${table.budgetReservedCostMicrousd} = 0))`,
    ),
    check(
      "ai_runs_budget_period_check",
      sql`((${table.budgetChargeDay} is null) = (${table.budgetChargeMonth} is null)) and (${table.budgetChargeDay} is null or (${table.budgetChargeMonth} = date_trunc('month', ${table.budgetChargeDay})::date and ${table.budgetChargeMonth} = date_trunc('month', ${table.budgetChargeMonth})::date)) and (${table.costAccountingState} <> 'preflight' or ${table.budgetChargeDay} is null)`,
    ),
    check(
      "ai_runs_cost_values_check",
      sql`${table.estimatedMaxCostMicrousd} >= 0 and ${table.actualCostMicrousd} >= 0 and ${table.budgetAccountedCostMicrousd} >= 0 and ${table.budgetReservedCostMicrousd} >= 0 and (${table.executionEnvironment} <> 'staging' or ${table.estimatedMaxCostMicrousd} between 1 and ${table.runCostLimitMicrousd}) and ${table.actualCostMicrousd} <= ${table.budgetAccountedCostMicrousd} and (${table.budgetReservedCostMicrousd} = 0 or ${table.budgetAccountedCostMicrousd} + ${table.budgetReservedCostMicrousd} <= ${table.runCostLimitMicrousd}) and jsonb_typeof(${table.pricingSnapshotJson}) = 'object' and octet_length(${table.pricingSnapshotJson}::text) <= 8192 and (${table.executionEnvironment} <> 'staging' or ${table.pricingSnapshotJson} <> '{}'::jsonb)`,
    ),
    check(
      "ai_runs_cost_state_check",
      sql`(${table.costAccountingState} = 'preflight' and ${table.status} = 'pending' and ${table.attemptCount} = 0 and ${table.budgetChargeDay} is null and ${table.budgetChargeMonth} is null and ${table.budgetReservedCostMicrousd} = 0 and ${table.budgetAccountedCostMicrousd} = 0) or (${table.costAccountingState} = 'reserved' and ${table.status} in ('pending', 'processing') and ${table.budgetChargeDay} is not null and ${table.budgetChargeMonth} is not null) or (${table.costAccountingState} = 'final' and ${table.status} in ('draft_ready', 'failed', 'cancelled') and ${table.budgetReservedCostMicrousd} = 0 and ((${table.budgetChargeDay} is not null and ${table.budgetChargeMonth} is not null) or (${table.status} = 'cancelled' and ${table.attemptCount} = 0 and ${table.providerDispatchedAt} is null and ${table.actualCostMicrousd} = 0 and ${table.budgetAccountedCostMicrousd} = 0 and ${table.budgetChargeDay} is null and ${table.budgetChargeMonth} is null)))`,
    ),
    check(
      "ai_runs_disposition_check",
      sql`${table.humanDisposition} in ('not_evaluated', 'accepted', 'accepted_with_edits', 'rejected') and ((${table.humanDisposition} = 'not_evaluated' and ${table.qualityRating} is null and cardinality(${table.qualityLabels}) = 0 and ${table.qualityComment} is null and ${table.evaluatedByUserId} is null and ${table.evaluatedAt} is null and ${table.appliedTargetVersion} is null and ${table.appliedRevisionId} is null and ${table.appliedRevisionVersion} is null) or (${table.humanDisposition} <> 'not_evaluated' and ${table.status} = 'draft_ready' and ${table.evaluatedByUserId} is not null and ${table.evaluatedAt} is not null and ((${table.humanDisposition} = 'rejected' and ${table.appliedTargetVersion} is null and ${table.appliedRevisionId} is null and ${table.appliedRevisionVersion} is null) or (${table.humanDisposition} in ('accepted', 'accepted_with_edits') and ((${table.appliedTargetVersion} is not null and ${table.appliedTargetVersion} > ${table.expectedTargetVersion} and ${table.appliedRevisionId} is null and ${table.appliedRevisionVersion} is null) or (${table.appliedTargetVersion} is null and ${table.appliedRevisionId} is not null and ${table.appliedRevisionVersion} is not null and ${table.appliedRevisionVersion} > 0 and (${table.targetType} <> 'editorial_revision' or (${table.appliedRevisionId} = ${table.targetRevisionId} and ${table.appliedRevisionVersion} > ${table.expectedTargetVersion}))))))))`,
    ),
    check(
      "ai_runs_quality_check",
      sql`(${table.qualityRating} is null or ${table.qualityRating} between 1 and 5) and array_position(${table.qualityLabels}, null) is null and ${table.qualityLabels} <@ array['factual_issue', 'relevance', 'clarity', 'tone', 'format', 'duplication', 'unsafe_claim']::text[] and cardinality(${table.qualityLabels}) <= 7 and cardinality(${table.qualityLabels}) = ((${table.qualityLabels} @> array['factual_issue']::text[])::integer + (${table.qualityLabels} @> array['relevance']::text[])::integer + (${table.qualityLabels} @> array['clarity']::text[])::integer + (${table.qualityLabels} @> array['tone']::text[])::integer + (${table.qualityLabels} @> array['format']::text[])::integer + (${table.qualityLabels} @> array['duplication']::text[])::integer + (${table.qualityLabels} @> array['unsafe_claim']::text[])::integer) and (${table.qualityComment} is null or (length(${table.qualityComment}) <= 1000 and ${table.qualityComment} !~ '[[:cntrl:]]')) and (${table.appliedTargetVersion} is null or ${table.targetType} in ('product_draft', 'content_draft'))`,
    ),
    uniqueIndex("ai_runs_idempotency_key_unique").on(table.idempotencyKey),
    uniqueIndex("ai_runs_active_lease_token_unique")
      .on(table.leaseToken)
      .where(sql`${table.leaseToken} is not null`),
    index("ai_runs_claimable_idx")
      .on(table.executionEnvironment, table.nextAttemptAt, table.queuedAt, table.id)
      .where(sql`${table.status} = 'pending'`),
    index("ai_runs_active_lease_idx")
      .on(table.executionEnvironment, table.leaseExpiresAt, table.id)
      .where(sql`${table.status} = 'processing'`),
    // Drizzle 0.45 has no INCLUDE builder. The bounded raw expression is snapshot-stable and
    // intentionally closes the key list so drizzle-kit emits the exact approved covering index.
    index("ai_runs_budget_day_idx")
      .on(
        sql.raw(
          '"budget_charge_day") INCLUDE ("budget_accounted_cost_microusd","budget_reserved_cost_microusd"',
        ),
      )
      .where(
        sql`${table.executionEnvironment} = 'staging' and ${table.budgetChargeDay} is not null`,
      ),
    index("ai_runs_budget_month_idx")
      .on(
        sql.raw(
          '"budget_charge_month") INCLUDE ("budget_accounted_cost_microusd","budget_reserved_cost_microusd"',
        ),
      )
      .where(
        sql`${table.executionEnvironment} = 'staging' and ${table.budgetChargeMonth} is not null`,
      ),
    index("ai_runs_model_config_idx").on(table.modelConfigId, sql.raw('"queued_at" DESC')),
    index("ai_runs_requester_history_idx").on(
      table.requestedByUserId,
      sql.raw('"queued_at" DESC'),
      table.id,
    ),
    index("ai_runs_admin_status_idx").on(
      table.status,
      table.useCase,
      sql.raw('"queued_at" DESC'),
      table.id,
    ),
    index("ai_runs_target_product_idx")
      .on(table.targetProductId, sql.raw('"queued_at" DESC'), table.id)
      .where(sql`${table.targetProductId} is not null`),
    index("ai_runs_target_content_idx")
      .on(table.targetContentId, sql.raw('"queued_at" DESC'), table.id)
      .where(sql`${table.targetContentId} is not null`),
    index("ai_runs_target_revision_idx")
      .on(table.targetRevisionId, sql.raw('"queued_at" DESC'), table.id)
      .where(sql`${table.targetRevisionId} is not null`),
    index("ai_runs_applied_revision_idx")
      .on(table.appliedRevisionId)
      .where(sql`${table.appliedRevisionId} is not null`),
    index("ai_runs_cancelled_by_idx")
      .on(table.cancelledByUserId)
      .where(sql`${table.cancelledByUserId} is not null`),
    index("ai_runs_evaluated_by_idx")
      .on(table.evaluatedByUserId)
      .where(sql`${table.evaluatedByUserId} is not null`),
  ],
);
