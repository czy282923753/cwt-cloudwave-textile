import { pgEnum } from "drizzle-orm/pg-core";

export const appEnvironmentEnum = pgEnum("app_environment", [
  "local",
  "test",
  "preview",
  "production",
]);

export const userRoleEnum = pgEnum("user_role", [
  "admin",
  "product_editor",
  "content_editor",
  "reviewer_publisher",
  "sales",
  "analyst",
]);

export const recordStatusEnum = pgEnum("record_status", [
  "draft",
  "in_review",
  "published",
  "archived",
]);

export const indexStatusEnum = pgEnum("index_status", ["index", "noindex"]);

export const verificationStatusEnum = pgEnum("verification_status", [
  "empty",
  "provided",
  "verified",
  "rejected",
]);

export const taxonomyDimensionEnum = pgEnum("taxonomy_dimension", [
  "material_fiber",
  "structure_construction",
  "commercial_collection",
  "surface_hand_feel",
]);

export const triStateEnum = pgEnum("tri_state", ["unknown", "yes", "no"]);
export const realProductBasisEnum = pgEnum("real_product_basis", [
  "physical_product",
  "physical_sample",
  "internal_product_code",
  "supply_specification",
  "explicit_specification_combination",
]);
export const displayOverrideEnum = pgEnum("display_override", [
  "inherit",
  "show",
  "hide",
]);

export const assetAccessEnum = pgEnum("asset_access", [
  "public",
  "private",
  "internal",
]);

export const assetCategoryEnum = pgEnum("asset_category", [
  "product",
  "fabric",
  "market",
  "company",
  "factory",
  "application",
  "certificate",
  "content",
  "inquiry",
  "import",
  "other",
]);

export const assetStatusEnum = pgEnum("asset_status", [
  "uploaded",
  "quarantined",
  "scanning",
  "ready",
  "rejected",
  "deleted",
]);

export const assetScanStatusEnum = pgEnum("asset_scan_status", [
  "pending",
  "passed",
  "failed",
  "error",
]);

export const assetRescanStatusEnum = pgEnum("asset_rescan_status", [
  "not_required",
  "required",
  "processing",
  "completed",
  "manual_review",
]);

export const declarationReviewDecisionEnum = pgEnum(
  "declaration_review_decision",
  ["approved", "rejected", "admin_override"],
);

export const uploadIntentStatusEnum = pgEnum("upload_intent_status", [
  "created",
  "uploading",
  "passed",
  "failed",
  "consumed",
  "expired",
]);

export const uploadIntentKindEnum = pgEnum("upload_intent_kind", [
  "inquiry",
  "admin_asset",
]);

export const assetUploadBatchStatusEnum = pgEnum("asset_upload_batch_status", [
  "created",
  "uploading",
  "ready_to_finalize",
  "finalizing",
  "completed",
  "failed",
  "expired",
]);

export const objectCleanupStatusEnum = pgEnum("object_cleanup_status", [
  "standby",
  "pending",
  "processing",
  "completed",
  "cancelled",
  "dead",
]);

export const uploadRecoveryKindEnum = pgEnum("upload_recovery_kind", [
  "staging",
  "finalize",
]);

export const uploadRecoveryStatusEnum = pgEnum("upload_recovery_status", [
  "pending",
  "processing",
  "retryable",
  "cleanup_required",
  "completed",
  "dead",
]);

export const uploadRecoveryStageEnum = pgEnum("upload_recovery_stage", [
  "preregistered",
  "storage_writing",
  "storage_written",
  "scanning",
  "scan_passed",
  "claimed",
  "manifest_registered",
  "source_copy_started",
  "original_written",
  "variants_processing",
  "variants_written",
  "database_finalizing",
  "cleanup_required",
  "failed",
  "completed",
]);

export const assetRoleEnum = pgEnum("asset_role", [
  "hero",
  "gallery",
  "cover",
  "detail",
  "thumbnail",
  "inline",
  "document",
  "download",
  "inquiry",
  "import",
]);

export const sourceDeclarationSubjectEnum = pgEnum(
  "source_declaration_subject",
  [
    "cwt",
    "partner_factory",
    "supplier",
    "customer",
    "third_party",
    "unknown",
  ],
);

export const assetPermissionEnum = pgEnum("asset_permission", [
  "unknown",
  "allowed",
  "not_allowed",
  "restricted",
]);

export const effectiveRightsDecisionEnum = pgEnum(
  "effective_rights_decision",
  [
    "allowed",
    "restricted",
    "not_allowed",
    "expired",
    "revoked",
    "pending_review",
  ],
);

export const editorialRevisionStatusEnum = pgEnum(
  "editorial_revision_status",
  ["draft", "in_review", "approved", "rejected", "applied"],
);

export const contentChannelEnum = pgEnum("content_channel", [
  "fabric_knowledge",
  "china_textile_guide",
  "china_sourcing_guide",
]);

export const contentTypeEnum = pgEnum("content_type", [
  "article",
  "pillar",
  "comparison",
  "how_to",
  "guide",
]);

export const routeEntityTypeEnum = pgEnum("route_entity_type", [
  "home",
  "product",
  "taxonomy",
  "application",
  "fabric_entry",
  "content",
  "author",
  "static_page",
]);

export const searchIntentEnum = pgEnum("search_intent", [
  "informational",
  "commercial_investigation",
  "transactional_inquiry",
  "navigational",
]);

export const topicMemberRoleEnum = pgEnum("topic_member_role", [
  "pillar",
  "cluster",
  "product",
  "commercial_landing",
  "supporting",
]);

export const linkRelationStatusEnum = pgEnum("link_relation_status", [
  "suggested",
  "approved",
  "published",
  "rejected",
]);

export const inquiryStatusEnum = pgEnum("inquiry_status", [
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
]);

export const qualificationStatusEnum = pgEnum("qualification_status", [
  "unassessed",
  "qualified",
  "unqualified",
  "needs_information",
]);

export const priorityEnum = pgEnum("priority", ["low", "normal", "high", "urgent"]);

export const attributionConfidenceEnum = pgEnum("attribution_confidence", [
  "high",
  "medium",
  "low",
  "unavailable",
]);

export const activityTypeEnum = pgEnum("activity_type", [
  "note",
  "email",
  "whatsapp",
  "quote",
  "sample",
  "status_change",
]);

export const activityDirectionEnum = pgEnum("activity_direction", [
  "inbound",
  "outbound",
  "internal",
]);

export const consentStateEnum = pgEnum("consent_state", [
  "unknown",
  "granted",
  "denied",
  "revoked",
]);

export const outboxStatusEnum = pgEnum("outbox_status", [
  "pending",
  "processing",
  "sent",
  "failed",
  "dead",
]);

export const conversionEventEnum = pgEnum("conversion_event", [
  "product_view",
  "quote_cta_click",
  "whatsapp_click",
  "upload_started",
  "image_upload_completed",
  "quote_submit_success",
  "inquiry_created",
  "inquiry_qualified",
  "quote_recorded",
  "sample_recorded",
  "inquiry_won",
  "inquiry_lost",
]);
