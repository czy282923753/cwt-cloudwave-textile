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

export const assetRoleEnum = pgEnum("asset_role", [
  "hero",
  "gallery",
  "detail",
  "thumbnail",
  "inline",
  "document",
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

export const activityTypeEnum = pgEnum("activity_type", [
  "note",
  "email",
  "whatsapp",
  "quote",
  "sample",
  "status_change",
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
