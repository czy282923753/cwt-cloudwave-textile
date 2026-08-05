ALTER TYPE "public"."asset_role" ADD VALUE 'application' BEFORE 'thumbnail';--> statement-breakpoint
CREATE TABLE "site_page_assets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"system_setting_id" uuid NOT NULL,
	"asset_id" uuid NOT NULL,
	"page_key" text NOT NULL,
	"placement_key" text NOT NULL,
	"viewport" text NOT NULL,
	"role" "asset_role" DEFAULT 'hero' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"alt_text" text,
	"caption" text,
	"focal_x" numeric(5, 2) DEFAULT '50' NOT NULL,
	"focal_y" numeric(5, 2) DEFAULT '50' NOT NULL,
	"is_visible" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "site_page_assets_page_key_check" CHECK ("site_page_assets"."page_key" in ('home', 'about')),
	CONSTRAINT "site_page_assets_viewport_check" CHECK ("site_page_assets"."viewport" in ('desktop', 'mobile')),
	CONSTRAINT "site_page_assets_sort_order_check" CHECK ("site_page_assets"."sort_order" >= 0),
	CONSTRAINT "site_page_assets_focal_x_check" CHECK ("site_page_assets"."focal_x" between 0 and 100),
	CONSTRAINT "site_page_assets_focal_y_check" CHECK ("site_page_assets"."focal_y" between 0 and 100),
	CONSTRAINT "site_page_assets_placement_key_check" CHECK (length("site_page_assets"."placement_key") between 1 and 80),
	CONSTRAINT "site_page_assets_alt_text_check" CHECK ("site_page_assets"."alt_text" is null or length("site_page_assets"."alt_text") <= 500),
	CONSTRAINT "site_page_assets_caption_check" CHECK ("site_page_assets"."caption" is null or length("site_page_assets"."caption") <= 1000)
);
--> statement-breakpoint
ALTER TYPE "public"."app_environment" RENAME VALUE 'preview' TO 'staging';--> statement-breakpoint
ALTER TABLE "product_assets" ADD COLUMN "alt_text" text;--> statement-breakpoint
ALTER TABLE "product_assets" ADD COLUMN "caption" text;--> statement-breakpoint
ALTER TABLE "product_assets" ADD COLUMN "is_visible" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "product_localizations" ADD COLUMN "structured_blocks" jsonb DEFAULT '{"version":1,"blocks":[]}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "product_localizations" ADD COLUMN "blocks_version" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "product_localizations" ADD COLUMN "editor_document_version" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "product_code_assigned_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "moq_value" numeric(12, 2);--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "moq_unit" text;--> statement-breakpoint
ALTER TABLE "taxonomy_terms" ADD COLUMN "product_code_prefix" text;--> statement-breakpoint
ALTER TABLE "content_assets" ADD COLUMN "alt_text" text;--> statement-breakpoint
ALTER TABLE "content_assets" ADD COLUMN "caption" text;--> statement-breakpoint
ALTER TABLE "content_assets" ADD COLUMN "is_visible" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "content_assets" ADD COLUMN "block_key" text;--> statement-breakpoint
ALTER TABLE "content_localizations" ADD COLUMN "structured_blocks" jsonb DEFAULT '{"version":1,"blocks":[]}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "content_localizations" ADD COLUMN "blocks_version" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "content_localizations" ADD COLUMN "editor_document_version" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
UPDATE "product_localizations"
SET "structured_blocks" = CASE
	WHEN length(trim(coalesce("full_description", ''))) = 0
		THEN '{"version":1,"blocks":[]}'::jsonb
	ELSE jsonb_build_object(
		'version', 1,
		'blocks', jsonb_build_array(jsonb_build_object(
			'id', 'legacy-paragraph-1',
			'type', 'paragraph',
			'text', "full_description"
		)))
	END,
	"blocks_version" = 1,
	"editor_document_version" = 1;--> statement-breakpoint
UPDATE "content_localizations"
SET "structured_blocks" = CASE
	WHEN length(trim(coalesce("body", ''))) = 0
		THEN '{"version":1,"blocks":[]}'::jsonb
	ELSE jsonb_build_object(
		'version', 1,
		'blocks', jsonb_build_array(jsonb_build_object(
			'id', 'legacy-paragraph-1',
			'type', 'paragraph',
			'text', "body"
		)))
	END,
	"blocks_version" = 1,
	"editor_document_version" = 1;--> statement-breakpoint
ALTER TABLE "site_page_assets" ADD CONSTRAINT "site_page_assets_system_setting_id_system_settings_id_fk" FOREIGN KEY ("system_setting_id") REFERENCES "public"."system_settings"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "site_page_assets" ADD CONSTRAINT "site_page_assets_asset_id_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."assets"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "site_page_assets_placement_asset_unique" ON "site_page_assets" USING btree ("system_setting_id","placement_key","viewport","asset_id");--> statement-breakpoint
CREATE INDEX "site_page_assets_setting_sort_idx" ON "site_page_assets" USING btree ("system_setting_id","placement_key","viewport","sort_order");--> statement-breakpoint
CREATE INDEX "site_page_assets_asset_idx" ON "site_page_assets" USING btree ("asset_id");--> statement-breakpoint
CREATE UNIQUE INDEX "product_assets_one_hero_unique" ON "product_assets" USING btree ("product_id") WHERE "product_assets"."role" = 'hero';--> statement-breakpoint
CREATE UNIQUE INDEX "taxonomy_terms_product_code_prefix_unique" ON "taxonomy_terms" USING btree ("product_code_prefix") WHERE "taxonomy_terms"."product_code_prefix" is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "content_assets_block_key_unique" ON "content_assets" USING btree ("content_id","block_key") WHERE "content_assets"."block_key" is not null;--> statement-breakpoint
ALTER TABLE "product_localizations" ADD CONSTRAINT "product_localizations_blocks_version_check" CHECK ("product_localizations"."blocks_version" = 1);--> statement-breakpoint
ALTER TABLE "product_localizations" ADD CONSTRAINT "product_localizations_editor_document_version_check" CHECK ("product_localizations"."editor_document_version" > 0);--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_moq_positive" CHECK ("products"."moq_value" is null or "products"."moq_value" > 0);--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_moq_value_unit_pair_check" CHECK (("products"."moq_value" is null) = ("products"."moq_unit" is null));--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_moq_unit_check" CHECK ("products"."moq_unit" is null or "products"."moq_unit" in ('m', 'kg', 'roll', 'yd'));--> statement-breakpoint
UPDATE "products"
SET "product_code_assigned_at" = coalesce("updated_at", "created_at")
WHERE "product_code" is not null;--> statement-breakpoint
ALTER TABLE "taxonomy_terms" ADD CONSTRAINT "taxonomy_terms_product_code_prefix_check" CHECK ("taxonomy_terms"."product_code_prefix" is null or "taxonomy_terms"."product_code_prefix" ~ '^[A-Z]{3,8}$');--> statement-breakpoint
ALTER TABLE "content_localizations" ADD CONSTRAINT "content_localizations_blocks_version_check" CHECK ("content_localizations"."blocks_version" = 1);--> statement-breakpoint
ALTER TABLE "content_localizations" ADD CONSTRAINT "content_localizations_editor_document_version_check" CHECK ("content_localizations"."editor_document_version" > 0);
