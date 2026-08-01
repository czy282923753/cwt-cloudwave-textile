CREATE TYPE "public"."activity_type" AS ENUM('note', 'email', 'whatsapp', 'quote', 'sample', 'status_change');--> statement-breakpoint
CREATE TYPE "public"."app_environment" AS ENUM('local', 'test', 'preview', 'production');--> statement-breakpoint
CREATE TYPE "public"."asset_access" AS ENUM('public', 'private', 'internal');--> statement-breakpoint
CREATE TYPE "public"."asset_category" AS ENUM('product', 'fabric', 'market', 'company', 'factory', 'application', 'certificate', 'content', 'inquiry', 'import', 'other');--> statement-breakpoint
CREATE TYPE "public"."asset_permission" AS ENUM('unknown', 'allowed', 'not_allowed', 'restricted');--> statement-breakpoint
CREATE TYPE "public"."asset_role" AS ENUM('hero', 'gallery', 'detail', 'thumbnail', 'inline', 'document', 'inquiry', 'import');--> statement-breakpoint
CREATE TYPE "public"."asset_status" AS ENUM('uploaded', 'quarantined', 'scanning', 'ready', 'rejected', 'deleted');--> statement-breakpoint
CREATE TYPE "public"."content_channel" AS ENUM('fabric_knowledge', 'china_textile_guide', 'china_sourcing_guide');--> statement-breakpoint
CREATE TYPE "public"."content_type" AS ENUM('article', 'pillar', 'comparison', 'how_to', 'guide');--> statement-breakpoint
CREATE TYPE "public"."conversion_event" AS ENUM('product_view', 'quote_cta_click', 'whatsapp_click', 'upload_started', 'image_upload_completed', 'quote_submit_success', 'inquiry_created', 'inquiry_qualified', 'quote_recorded', 'sample_recorded', 'inquiry_won', 'inquiry_lost');--> statement-breakpoint
CREATE TYPE "public"."display_override" AS ENUM('inherit', 'show', 'hide');--> statement-breakpoint
CREATE TYPE "public"."editorial_revision_status" AS ENUM('draft', 'in_review', 'approved', 'rejected', 'applied');--> statement-breakpoint
CREATE TYPE "public"."index_status" AS ENUM('index', 'noindex');--> statement-breakpoint
CREATE TYPE "public"."inquiry_status" AS ENUM('new', 'reviewing', 'qualified', 'quoted', 'sample', 'negotiation', 'won', 'lost', 'spam', 'archived');--> statement-breakpoint
CREATE TYPE "public"."link_relation_status" AS ENUM('suggested', 'approved', 'published', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."priority" AS ENUM('low', 'normal', 'high', 'urgent');--> statement-breakpoint
CREATE TYPE "public"."qualification_status" AS ENUM('unassessed', 'qualified', 'unqualified', 'needs_information');--> statement-breakpoint
CREATE TYPE "public"."record_status" AS ENUM('draft', 'in_review', 'published', 'archived');--> statement-breakpoint
CREATE TYPE "public"."route_entity_type" AS ENUM('home', 'product', 'taxonomy', 'application', 'fabric_entry', 'content', 'author', 'static_page');--> statement-breakpoint
CREATE TYPE "public"."search_intent" AS ENUM('informational', 'commercial_investigation', 'transactional_inquiry', 'navigational');--> statement-breakpoint
CREATE TYPE "public"."source_declaration_subject" AS ENUM('cwt', 'partner_factory', 'supplier', 'customer', 'third_party', 'unknown');--> statement-breakpoint
CREATE TYPE "public"."taxonomy_dimension" AS ENUM('material_fiber', 'structure_construction', 'commercial_collection', 'surface_hand_feel');--> statement-breakpoint
CREATE TYPE "public"."topic_member_role" AS ENUM('pillar', 'cluster', 'product', 'commercial_landing', 'supporting');--> statement-breakpoint
CREATE TYPE "public"."tri_state" AS ENUM('unknown', 'yes', 'no');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('admin', 'product_editor', 'content_editor', 'reviewer_publisher', 'sales', 'analyst');--> statement-breakpoint
CREATE TYPE "public"."verification_status" AS ENUM('empty', 'provided', 'verified', 'rejected');--> statement-breakpoint
CREATE TABLE "conversion_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_name" "conversion_event" NOT NULL,
	"anonymous_session_id" text NOT NULL,
	"route_path" text NOT NULL,
	"entity_type" text,
	"entity_id" uuid,
	"inquiry_id" uuid,
	"landing_page_path" text,
	"referrer_origin" text,
	"utm_source" text,
	"utm_medium" text,
	"utm_campaign" text,
	"country_code" text,
	"safe_properties" jsonb,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "asset_tag_assignments" (
	"asset_id" uuid NOT NULL,
	"tag_id" uuid NOT NULL,
	CONSTRAINT "asset_tag_assignments_asset_id_tag_id_pk" PRIMARY KEY("asset_id","tag_id")
);
--> statement-breakpoint
CREATE TABLE "asset_tags" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "asset_upload_batches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_by_user_id" uuid,
	"source_declaration_enabled" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "asset_variants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source_asset_id" uuid NOT NULL,
	"format" text NOT NULL,
	"variant_key" text NOT NULL,
	"object_key" text NOT NULL,
	"byte_size" integer NOT NULL,
	"width" integer,
	"height" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "assets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"upload_batch_id" uuid,
	"uploaded_by_user_id" uuid,
	"original_file_name" text NOT NULL,
	"storage_provider" text NOT NULL,
	"storage_partition" text NOT NULL,
	"object_key" text NOT NULL,
	"access" "asset_access" NOT NULL,
	"category" "asset_category" NOT NULL,
	"status" "asset_status" DEFAULT 'uploaded' NOT NULL,
	"declared_mime_type" text NOT NULL,
	"detected_mime_type" text,
	"byte_size" integer NOT NULL,
	"sha256" text NOT NULL,
	"width" integer,
	"height" integer,
	"alt_text" text,
	"scan_provider" text,
	"scan_result" text,
	"scan_completed_at" timestamp with time zone,
	"source_declaration_enabled" boolean DEFAULT false NOT NULL,
	"source_type" text,
	"source_provider" text,
	"rights_status" text,
	"subject_relationship" "source_declaration_subject",
	"public_use_permission" "asset_permission",
	"editing_permission" "asset_permission",
	"usage_restrictions" text,
	"permission_evidence" text,
	"declaration_reviewer_user_id" uuid,
	"declaration_review_date" timestamp with time zone,
	"declaration_expiry_date" timestamp with time zone,
	"is_cwt_owned_facility" boolean,
	"non_blocking_risk_hints" jsonb,
	"retention_expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "application_localizations" (
	"application_id" uuid NOT NULL,
	"locale" text NOT NULL,
	"name" text NOT NULL,
	"short_description" text,
	"body" text,
	CONSTRAINT "application_localizations_application_id_locale_pk" PRIMARY KEY("application_id","locale")
);
--> statement-breakpoint
CREATE TABLE "applications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"status" "record_status" DEFAULT 'draft' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_by_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"published_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "fabric_library_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"status" "record_status" DEFAULT 'draft' NOT NULL,
	"created_by_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"published_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "fabric_library_entry_applications" (
	"fabric_entry_id" uuid NOT NULL,
	"application_id" uuid NOT NULL,
	CONSTRAINT "fabric_library_entry_applications_fabric_entry_id_application_id_pk" PRIMARY KEY("fabric_entry_id","application_id")
);
--> statement-breakpoint
CREATE TABLE "fabric_library_entry_assets" (
	"fabric_entry_id" uuid NOT NULL,
	"asset_id" uuid NOT NULL,
	"role" "asset_role" DEFAULT 'gallery' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "fabric_library_entry_assets_fabric_entry_id_asset_id_pk" PRIMARY KEY("fabric_entry_id","asset_id")
);
--> statement-breakpoint
CREATE TABLE "fabric_library_entry_localizations" (
	"fabric_entry_id" uuid NOT NULL,
	"locale" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	CONSTRAINT "fabric_library_entry_localizations_fabric_entry_id_locale_pk" PRIMARY KEY("fabric_entry_id","locale")
);
--> statement-breakpoint
CREATE TABLE "fabric_library_entry_products" (
	"fabric_entry_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	CONSTRAINT "fabric_library_entry_products_fabric_entry_id_product_id_pk" PRIMARY KEY("fabric_entry_id","product_id")
);
--> statement-breakpoint
CREATE TABLE "product_applications" (
	"product_id" uuid NOT NULL,
	"application_id" uuid NOT NULL,
	CONSTRAINT "product_applications_product_id_application_id_pk" PRIMARY KEY("product_id","application_id")
);
--> statement-breakpoint
CREATE TABLE "product_assets" (
	"product_id" uuid NOT NULL,
	"asset_id" uuid NOT NULL,
	"role" "asset_role" DEFAULT 'gallery' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "product_assets_product_id_asset_id_pk" PRIMARY KEY("product_id","asset_id")
);
--> statement-breakpoint
CREATE TABLE "product_faqs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"locale" text DEFAULT 'en' NOT NULL,
	"question" text NOT NULL,
	"answer" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product_features" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"locale" text DEFAULT 'en' NOT NULL,
	"label" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product_field_reviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"field_name" text NOT NULL,
	"verification_status" "verification_status" DEFAULT 'provided' NOT NULL,
	"reviewed_by_user_id" uuid,
	"reviewed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "product_localizations" (
	"product_id" uuid NOT NULL,
	"locale" text NOT NULL,
	"name" text NOT NULL,
	"short_description" text,
	"full_description" text,
	CONSTRAINT "product_localizations_product_id_locale_pk" PRIMARY KEY("product_id","locale")
);
--> statement-breakpoint
CREATE TABLE "product_tag_assignments" (
	"product_id" uuid NOT NULL,
	"tag_id" uuid NOT NULL,
	CONSTRAINT "product_tag_assignments_product_id_tag_id_pk" PRIMARY KEY("product_id","tag_id")
);
--> statement-breakpoint
CREATE TABLE "product_tags" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product_taxonomy_terms" (
	"product_id" uuid NOT NULL,
	"taxonomy_term_id" uuid NOT NULL,
	"is_primary" boolean DEFAULT false NOT NULL,
	CONSTRAINT "product_taxonomy_terms_product_id_taxonomy_term_id_pk" PRIMARY KEY("product_id","taxonomy_term_id")
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"primary_taxonomy_term_id" uuid NOT NULL,
	"status" "record_status" DEFAULT 'draft' NOT NULL,
	"product_code" text,
	"supplier_type" text,
	"composition" text,
	"weight_gsm" numeric(10, 2),
	"width_cm" numeric(10, 2),
	"fabric_style" text,
	"color_options" text,
	"moq_note" text,
	"custom_available" "tri_state" DEFAULT 'unknown' NOT NULL,
	"sample_available" "tri_state" DEFAULT 'unknown' NOT NULL,
	"color_options_display" "display_override" DEFAULT 'inherit' NOT NULL,
	"custom_available_display" "display_override" DEFAULT 'inherit' NOT NULL,
	"sample_available_display" "display_override" DEFAULT 'inherit' NOT NULL,
	"moq_note_display" "display_override" DEFAULT 'hide' NOT NULL,
	"created_by_user_id" uuid,
	"reviewed_by_user_id" uuid,
	"reviewed_at" timestamp with time zone,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "products_weight_nonnegative" CHECK ("products"."weight_gsm" is null or "products"."weight_gsm" > 0),
	CONSTRAINT "products_width_nonnegative" CHECK ("products"."width_cm" is null or "products"."width_cm" > 0)
);
--> statement-breakpoint
CREATE TABLE "taxonomy_term_localizations" (
	"taxonomy_term_id" uuid NOT NULL,
	"locale" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	CONSTRAINT "taxonomy_term_localizations_taxonomy_term_id_locale_pk" PRIMARY KEY("taxonomy_term_id","locale")
);
--> statement-breakpoint
CREATE TABLE "taxonomy_terms" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"dimension" "taxonomy_dimension" NOT NULL,
	"parent_id" uuid,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "authors" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"display_name" text NOT NULL,
	"bio" text,
	"is_organization" boolean DEFAULT false NOT NULL,
	"profile_asset_id" uuid,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "content_assets" (
	"content_id" uuid NOT NULL,
	"asset_id" uuid NOT NULL,
	"role" "asset_role" DEFAULT 'inline' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "content_assets_content_id_asset_id_pk" PRIMARY KEY("content_id","asset_id")
);
--> statement-breakpoint
CREATE TABLE "content_localizations" (
	"content_id" uuid NOT NULL,
	"locale" text NOT NULL,
	"title" text NOT NULL,
	"excerpt" text,
	"body" text NOT NULL,
	CONSTRAINT "content_localizations_content_id_locale_pk" PRIMARY KEY("content_id","locale")
);
--> statement-breakpoint
CREATE TABLE "contents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"channel" "content_channel" NOT NULL,
	"type" "content_type" DEFAULT 'article' NOT NULL,
	"status" "record_status" DEFAULT 'draft' NOT NULL,
	"author_id" uuid NOT NULL,
	"created_by_user_id" uuid,
	"reviewed_by_user_id" uuid,
	"reviewed_at" timestamp with time zone,
	"published_at" timestamp with time zone,
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "editorial_revisions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" uuid NOT NULL,
	"locale" text DEFAULT 'en' NOT NULL,
	"version_number" integer NOT NULL,
	"status" "editorial_revision_status" DEFAULT 'draft' NOT NULL,
	"snapshot" jsonb NOT NULL,
	"change_summary" text,
	"created_by_user_id" uuid,
	"reviewed_by_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"reviewed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "contacts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"normalized_email" text NOT NULL,
	"country_code" text,
	"whatsapp" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "customer_activities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"inquiry_id" uuid NOT NULL,
	"contact_id" uuid NOT NULL,
	"type" "activity_type" NOT NULL,
	"content" text NOT NULL,
	"created_by_user_id" uuid,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "inquiries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"contact_id" uuid NOT NULL,
	"owner_user_id" uuid,
	"status" "inquiry_status" DEFAULT 'new' NOT NULL,
	"priority" "priority" DEFAULT 'normal' NOT NULL,
	"qualification_status" "qualification_status" DEFAULT 'unassessed' NOT NULL,
	"description" text,
	"lost_reason" text,
	"source_page_path" text NOT NULL,
	"landing_page_path" text,
	"referrer" text,
	"utm_source" text,
	"utm_medium" text,
	"utm_campaign" text,
	"session_id" text,
	"request_id" text,
	"first_response_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"archived_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "inquiry_assets" (
	"inquiry_id" uuid NOT NULL,
	"asset_id" uuid NOT NULL,
	CONSTRAINT "inquiry_assets_inquiry_id_asset_id_pk" PRIMARY KEY("inquiry_id","asset_id")
);
--> statement-breakpoint
CREATE TABLE "inquiry_status_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"inquiry_id" uuid NOT NULL,
	"from_status" "inquiry_status",
	"to_status" "inquiry_status" NOT NULL,
	"reason" text,
	"changed_by_user_id" uuid,
	"changed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "organizations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"website" text,
	"country_code" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_user_id" uuid,
	"action" text NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" uuid,
	"before_summary" jsonb,
	"after_summary" jsonb,
	"request_id" text,
	"ip_summary" text,
	"user_agent_summary" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "auth_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "company_facts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"fact_key" text NOT NULL,
	"subject" text NOT NULL,
	"statement" text NOT NULL,
	"relationship_to_cwt" text,
	"evidence_reference" text,
	"public_use_allowed" boolean DEFAULT false NOT NULL,
	"verification_status" "verification_status" DEFAULT 'provided' NOT NULL,
	"verified_by_user_id" uuid,
	"verified_at" timestamp with time zone,
	"review_after" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"display_name" text NOT NULL,
	"role" "user_role" NOT NULL,
	"password_hash" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"last_login_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "internal_link_relations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source_route_id" uuid NOT NULL,
	"destination_route_id" uuid NOT NULL,
	"anchor_text" text,
	"status" "link_relation_status" DEFAULT 'suggested' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "internal_link_relations_not_self" CHECK ("internal_link_relations"."source_route_id" <> "internal_link_relations"."destination_route_id")
);
--> statement-breakpoint
CREATE TABLE "keyword_page_mappings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"locale" text DEFAULT 'en' NOT NULL,
	"normalized_keyword" text NOT NULL,
	"intent" "search_intent" NOT NULL,
	"primary_route_id" uuid NOT NULL,
	"notes" text,
	"updated_by_user_id" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "redirects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source_path" text NOT NULL,
	"destination_path" text NOT NULL,
	"status_code" text DEFAULT '301' NOT NULL,
	"reason" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_by_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "redirects_distinct_paths" CHECK ("redirects"."source_path" <> "redirects"."destination_path"),
	CONSTRAINT "redirects_source_absolute" CHECK ("redirects"."source_path" like '/%'),
	CONSTRAINT "redirects_destination_absolute" CHECK ("redirects"."destination_path" like '/%')
);
--> statement-breakpoint
CREATE TABLE "routes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"locale" text DEFAULT 'en' NOT NULL,
	"path" text NOT NULL,
	"entity_type" "route_entity_type" NOT NULL,
	"entity_id" uuid,
	"is_current" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "routes_path_absolute" CHECK ("routes"."path" like '/%')
);
--> statement-breakpoint
CREATE TABLE "seo_metadata" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"route_id" uuid NOT NULL,
	"title" text,
	"meta_description" text,
	"focus_keyword" text,
	"index_status" "index_status" DEFAULT 'noindex' NOT NULL,
	"canonical_path" text,
	"open_graph_title" text,
	"open_graph_description" text,
	"open_graph_asset_id" uuid,
	"schema_data" jsonb,
	"updated_by_user_id" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "seo_metadata_canonical_absolute" CHECK ("seo_metadata"."canonical_path" is null or "seo_metadata"."canonical_path" like '/%')
);
--> statement-breakpoint
CREATE TABLE "seo_topic_members" (
	"topic_id" uuid NOT NULL,
	"route_id" uuid NOT NULL,
	"role" "topic_member_role" NOT NULL,
	CONSTRAINT "seo_topic_members_topic_id_route_id_pk" PRIMARY KEY("topic_id","route_id")
);
--> statement-breakpoint
CREATE TABLE "seo_topics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"locale" text DEFAULT 'en' NOT NULL,
	"primary_keyword" text NOT NULL,
	"intent" "search_intent" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "feature_flags" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" text NOT NULL,
	"enabled" boolean DEFAULT false NOT NULL,
	"configuration" jsonb,
	"updated_by_user_id" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "system_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" text NOT NULL,
	"value" jsonb NOT NULL,
	"is_sensitive" boolean DEFAULT false NOT NULL,
	"updated_by_user_id" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "conversion_events" ADD CONSTRAINT "conversion_events_inquiry_id_inquiries_id_fk" FOREIGN KEY ("inquiry_id") REFERENCES "public"."inquiries"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "asset_tag_assignments" ADD CONSTRAINT "asset_tag_assignments_asset_id_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."assets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "asset_tag_assignments" ADD CONSTRAINT "asset_tag_assignments_tag_id_asset_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."asset_tags"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "asset_upload_batches" ADD CONSTRAINT "asset_upload_batches_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "asset_variants" ADD CONSTRAINT "asset_variants_source_asset_id_assets_id_fk" FOREIGN KEY ("source_asset_id") REFERENCES "public"."assets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assets" ADD CONSTRAINT "assets_upload_batch_id_asset_upload_batches_id_fk" FOREIGN KEY ("upload_batch_id") REFERENCES "public"."asset_upload_batches"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assets" ADD CONSTRAINT "assets_uploaded_by_user_id_users_id_fk" FOREIGN KEY ("uploaded_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assets" ADD CONSTRAINT "assets_declaration_reviewer_user_id_users_id_fk" FOREIGN KEY ("declaration_reviewer_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "application_localizations" ADD CONSTRAINT "application_localizations_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "applications" ADD CONSTRAINT "applications_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fabric_library_entries" ADD CONSTRAINT "fabric_library_entries_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fabric_library_entry_applications" ADD CONSTRAINT "fabric_library_entry_applications_fabric_entry_id_fabric_library_entries_id_fk" FOREIGN KEY ("fabric_entry_id") REFERENCES "public"."fabric_library_entries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fabric_library_entry_applications" ADD CONSTRAINT "fabric_library_entry_applications_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fabric_library_entry_assets" ADD CONSTRAINT "fabric_library_entry_assets_fabric_entry_id_fabric_library_entries_id_fk" FOREIGN KEY ("fabric_entry_id") REFERENCES "public"."fabric_library_entries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fabric_library_entry_assets" ADD CONSTRAINT "fabric_library_entry_assets_asset_id_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."assets"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fabric_library_entry_localizations" ADD CONSTRAINT "fabric_library_entry_localizations_fabric_entry_id_fabric_library_entries_id_fk" FOREIGN KEY ("fabric_entry_id") REFERENCES "public"."fabric_library_entries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fabric_library_entry_products" ADD CONSTRAINT "fabric_library_entry_products_fabric_entry_id_fabric_library_entries_id_fk" FOREIGN KEY ("fabric_entry_id") REFERENCES "public"."fabric_library_entries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fabric_library_entry_products" ADD CONSTRAINT "fabric_library_entry_products_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_applications" ADD CONSTRAINT "product_applications_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_applications" ADD CONSTRAINT "product_applications_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_assets" ADD CONSTRAINT "product_assets_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_assets" ADD CONSTRAINT "product_assets_asset_id_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."assets"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_faqs" ADD CONSTRAINT "product_faqs_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_features" ADD CONSTRAINT "product_features_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_field_reviews" ADD CONSTRAINT "product_field_reviews_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_field_reviews" ADD CONSTRAINT "product_field_reviews_reviewed_by_user_id_users_id_fk" FOREIGN KEY ("reviewed_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_localizations" ADD CONSTRAINT "product_localizations_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_tag_assignments" ADD CONSTRAINT "product_tag_assignments_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_tag_assignments" ADD CONSTRAINT "product_tag_assignments_tag_id_product_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."product_tags"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_taxonomy_terms" ADD CONSTRAINT "product_taxonomy_terms_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_taxonomy_terms" ADD CONSTRAINT "product_taxonomy_terms_taxonomy_term_id_taxonomy_terms_id_fk" FOREIGN KEY ("taxonomy_term_id") REFERENCES "public"."taxonomy_terms"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_primary_taxonomy_term_id_taxonomy_terms_id_fk" FOREIGN KEY ("primary_taxonomy_term_id") REFERENCES "public"."taxonomy_terms"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_reviewed_by_user_id_users_id_fk" FOREIGN KEY ("reviewed_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "taxonomy_term_localizations" ADD CONSTRAINT "taxonomy_term_localizations_taxonomy_term_id_taxonomy_terms_id_fk" FOREIGN KEY ("taxonomy_term_id") REFERENCES "public"."taxonomy_terms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "authors" ADD CONSTRAINT "authors_profile_asset_id_assets_id_fk" FOREIGN KEY ("profile_asset_id") REFERENCES "public"."assets"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_assets" ADD CONSTRAINT "content_assets_content_id_contents_id_fk" FOREIGN KEY ("content_id") REFERENCES "public"."contents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_assets" ADD CONSTRAINT "content_assets_asset_id_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."assets"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_localizations" ADD CONSTRAINT "content_localizations_content_id_contents_id_fk" FOREIGN KEY ("content_id") REFERENCES "public"."contents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contents" ADD CONSTRAINT "contents_author_id_authors_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."authors"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contents" ADD CONSTRAINT "contents_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contents" ADD CONSTRAINT "contents_reviewed_by_user_id_users_id_fk" FOREIGN KEY ("reviewed_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "editorial_revisions" ADD CONSTRAINT "editorial_revisions_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "editorial_revisions" ADD CONSTRAINT "editorial_revisions_reviewed_by_user_id_users_id_fk" FOREIGN KEY ("reviewed_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_activities" ADD CONSTRAINT "customer_activities_inquiry_id_inquiries_id_fk" FOREIGN KEY ("inquiry_id") REFERENCES "public"."inquiries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_activities" ADD CONSTRAINT "customer_activities_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_activities" ADD CONSTRAINT "customer_activities_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inquiries" ADD CONSTRAINT "inquiries_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inquiries" ADD CONSTRAINT "inquiries_owner_user_id_users_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inquiry_assets" ADD CONSTRAINT "inquiry_assets_inquiry_id_inquiries_id_fk" FOREIGN KEY ("inquiry_id") REFERENCES "public"."inquiries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inquiry_assets" ADD CONSTRAINT "inquiry_assets_asset_id_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."assets"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inquiry_status_history" ADD CONSTRAINT "inquiry_status_history_inquiry_id_inquiries_id_fk" FOREIGN KEY ("inquiry_id") REFERENCES "public"."inquiries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inquiry_status_history" ADD CONSTRAINT "inquiry_status_history_changed_by_user_id_users_id_fk" FOREIGN KEY ("changed_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth_sessions" ADD CONSTRAINT "auth_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_facts" ADD CONSTRAINT "company_facts_verified_by_user_id_users_id_fk" FOREIGN KEY ("verified_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "internal_link_relations" ADD CONSTRAINT "internal_link_relations_source_route_id_routes_id_fk" FOREIGN KEY ("source_route_id") REFERENCES "public"."routes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "internal_link_relations" ADD CONSTRAINT "internal_link_relations_destination_route_id_routes_id_fk" FOREIGN KEY ("destination_route_id") REFERENCES "public"."routes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "keyword_page_mappings" ADD CONSTRAINT "keyword_page_mappings_primary_route_id_routes_id_fk" FOREIGN KEY ("primary_route_id") REFERENCES "public"."routes"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "keyword_page_mappings" ADD CONSTRAINT "keyword_page_mappings_updated_by_user_id_users_id_fk" FOREIGN KEY ("updated_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "redirects" ADD CONSTRAINT "redirects_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seo_metadata" ADD CONSTRAINT "seo_metadata_route_id_routes_id_fk" FOREIGN KEY ("route_id") REFERENCES "public"."routes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seo_metadata" ADD CONSTRAINT "seo_metadata_updated_by_user_id_users_id_fk" FOREIGN KEY ("updated_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seo_topic_members" ADD CONSTRAINT "seo_topic_members_topic_id_seo_topics_id_fk" FOREIGN KEY ("topic_id") REFERENCES "public"."seo_topics"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seo_topic_members" ADD CONSTRAINT "seo_topic_members_route_id_routes_id_fk" FOREIGN KEY ("route_id") REFERENCES "public"."routes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feature_flags" ADD CONSTRAINT "feature_flags_updated_by_user_id_users_id_fk" FOREIGN KEY ("updated_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "system_settings" ADD CONSTRAINT "system_settings_updated_by_user_id_users_id_fk" FOREIGN KEY ("updated_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "conversion_events_name_time_idx" ON "conversion_events" USING btree ("event_name","occurred_at");--> statement-breakpoint
CREATE INDEX "conversion_events_route_time_idx" ON "conversion_events" USING btree ("route_path","occurred_at");--> statement-breakpoint
CREATE INDEX "conversion_events_inquiry_idx" ON "conversion_events" USING btree ("inquiry_id");--> statement-breakpoint
CREATE UNIQUE INDEX "asset_tags_slug_unique" ON "asset_tags" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "asset_variants_source_key_unique" ON "asset_variants" USING btree ("source_asset_id","variant_key");--> statement-breakpoint
CREATE UNIQUE INDEX "assets_partition_object_unique" ON "assets" USING btree ("storage_partition","object_key");--> statement-breakpoint
CREATE INDEX "assets_category_status_idx" ON "assets" USING btree ("category","status");--> statement-breakpoint
CREATE INDEX "assets_access_status_idx" ON "assets" USING btree ("access","status");--> statement-breakpoint
CREATE INDEX "assets_sha256_idx" ON "assets" USING btree ("sha256");--> statement-breakpoint
CREATE INDEX "assets_retention_idx" ON "assets" USING btree ("retention_expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "product_field_reviews_unique" ON "product_field_reviews" USING btree ("product_id","field_name");--> statement-breakpoint
CREATE UNIQUE INDEX "product_tags_slug_unique" ON "product_tags" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "product_taxonomy_term_idx" ON "product_taxonomy_terms" USING btree ("taxonomy_term_id");--> statement-breakpoint
CREATE UNIQUE INDEX "products_product_code_unique" ON "products" USING btree ("product_code");--> statement-breakpoint
CREATE INDEX "products_status_idx" ON "products" USING btree ("status");--> statement-breakpoint
CREATE INDEX "taxonomy_terms_dimension_idx" ON "taxonomy_terms" USING btree ("dimension");--> statement-breakpoint
CREATE INDEX "contents_channel_status_idx" ON "contents" USING btree ("channel","status");--> statement-breakpoint
CREATE INDEX "contents_author_idx" ON "contents" USING btree ("author_id");--> statement-breakpoint
CREATE UNIQUE INDEX "editorial_revisions_entity_version_unique" ON "editorial_revisions" USING btree ("entity_type","entity_id","locale","version_number");--> statement-breakpoint
CREATE INDEX "editorial_revisions_status_idx" ON "editorial_revisions" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "contacts_normalized_email_unique" ON "contacts" USING btree ("normalized_email");--> statement-breakpoint
CREATE INDEX "contacts_organization_idx" ON "contacts" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "customer_activities_inquiry_idx" ON "customer_activities" USING btree ("inquiry_id","occurred_at");--> statement-breakpoint
CREATE INDEX "customer_activities_contact_idx" ON "customer_activities" USING btree ("contact_id");--> statement-breakpoint
CREATE INDEX "inquiries_status_created_idx" ON "inquiries" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "inquiries_owner_status_idx" ON "inquiries" USING btree ("owner_user_id","status");--> statement-breakpoint
CREATE INDEX "inquiries_contact_idx" ON "inquiries" USING btree ("contact_id");--> statement-breakpoint
CREATE INDEX "inquiry_status_history_idx" ON "inquiry_status_history" USING btree ("inquiry_id","changed_at");--> statement-breakpoint
CREATE INDEX "audit_logs_entity_idx" ON "audit_logs" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "audit_logs_actor_idx" ON "audit_logs" USING btree ("actor_user_id");--> statement-breakpoint
CREATE INDEX "audit_logs_created_idx" ON "audit_logs" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "auth_sessions_token_hash_unique" ON "auth_sessions" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "auth_sessions_user_idx" ON "auth_sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "auth_sessions_expiry_idx" ON "auth_sessions" USING btree ("expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "company_facts_key_unique" ON "company_facts" USING btree ("fact_key");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_unique" ON "users" USING btree ("email");--> statement-breakpoint
CREATE UNIQUE INDEX "internal_link_relations_unique" ON "internal_link_relations" USING btree ("source_route_id","destination_route_id");--> statement-breakpoint
CREATE UNIQUE INDEX "keyword_page_mappings_unique" ON "keyword_page_mappings" USING btree ("locale","normalized_keyword");--> statement-breakpoint
CREATE INDEX "keyword_page_mappings_route_idx" ON "keyword_page_mappings" USING btree ("primary_route_id");--> statement-breakpoint
CREATE UNIQUE INDEX "redirects_source_path_unique" ON "redirects" USING btree ("source_path");--> statement-breakpoint
CREATE INDEX "redirects_destination_idx" ON "redirects" USING btree ("destination_path");--> statement-breakpoint
CREATE UNIQUE INDEX "routes_path_unique" ON "routes" USING btree ("path");--> statement-breakpoint
CREATE UNIQUE INDEX "routes_current_entity_locale_unique" ON "routes" USING btree ("entity_type","entity_id","locale") WHERE "routes"."is_current" = true and "routes"."entity_id" is not null;--> statement-breakpoint
CREATE INDEX "routes_entity_idx" ON "routes" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE UNIQUE INDEX "seo_metadata_route_unique" ON "seo_metadata" USING btree ("route_id");--> statement-breakpoint
CREATE UNIQUE INDEX "seo_topics_keyword_locale_unique" ON "seo_topics" USING btree ("primary_keyword","locale");--> statement-breakpoint
CREATE UNIQUE INDEX "feature_flags_key_unique" ON "feature_flags" USING btree ("key");--> statement-breakpoint
CREATE UNIQUE INDEX "system_settings_key_unique" ON "system_settings" USING btree ("key");