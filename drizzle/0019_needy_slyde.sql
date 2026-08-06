CREATE TABLE "product_import_batches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_by_user_id" uuid NOT NULL,
	"auth_session_id" uuid NOT NULL,
	"mode" text NOT NULL,
	"template_version" integer DEFAULT 1 NOT NULL,
	"source_fingerprint" text NOT NULL,
	"workbook_asset_id" uuid,
	"media_package_asset_id" uuid,
	"package_upload_batch_id" uuid,
	"status" text DEFAULT 'draft' NOT NULL,
	"failure_code" text,
	"failure_detail" text,
	"validated_at" timestamp with time zone,
	"apply_started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "product_import_batches_mode_check" CHECK ("product_import_batches"."mode" in ('create', 'update')),
	CONSTRAINT "product_import_batches_template_version_check" CHECK ("product_import_batches"."template_version" = 1),
	CONSTRAINT "product_import_batches_status_check" CHECK ("product_import_batches"."status" in ('draft', 'validated', 'applying', 'completed', 'failed')),
	CONSTRAINT "product_import_batches_fingerprint_check" CHECK ("product_import_batches"."source_fingerprint" ~ '^[0-9a-f]{64}$'),
	CONSTRAINT "product_import_batches_failure_code_check" CHECK ("product_import_batches"."failure_code" is null or length("product_import_batches"."failure_code") between 1 and 80),
	CONSTRAINT "product_import_batches_failure_detail_check" CHECK ("product_import_batches"."failure_detail" is null or length("product_import_batches"."failure_detail") <= 500)
);
--> statement-breakpoint
CREATE TABLE "product_import_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"batch_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"source_key" text NOT NULL,
	"row_number" integer,
	"status" text DEFAULT 'pending' NOT NULL,
	"raw_data" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"normalized_data" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"warning_codes" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"error_code" text,
	"error_detail" text,
	"target_product_id" uuid,
	"target_asset_id" uuid,
	"upload_batch_id" uuid,
	"attempt_count" integer DEFAULT 0 NOT NULL,
	"last_attempt_at" timestamp with time zone,
	"applied_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "product_import_items_kind_check" CHECK ("product_import_items"."kind" in ('row', 'media')),
	CONSTRAINT "product_import_items_status_check" CHECK ("product_import_items"."status" in ('pending', 'valid', 'applied', 'error', 'skipped')),
	CONSTRAINT "product_import_items_source_key_check" CHECK (length("product_import_items"."source_key") between 1 and 128 and "product_import_items"."source_key" ~ '^[A-Za-z0-9:_-]+$'),
	CONSTRAINT "product_import_items_row_number_check" CHECK (("product_import_items"."kind" = 'row' and "product_import_items"."row_number" between 2 and 101) or ("product_import_items"."kind" = 'media' and "product_import_items"."row_number" is null)),
	CONSTRAINT "product_import_items_attempt_check" CHECK ("product_import_items"."attempt_count" between 0 and 100),
	CONSTRAINT "product_import_items_error_code_check" CHECK ("product_import_items"."error_code" is null or length("product_import_items"."error_code") between 1 and 80),
	CONSTRAINT "product_import_items_error_detail_check" CHECK ("product_import_items"."error_detail" is null or length("product_import_items"."error_detail") <= 500),
	CONSTRAINT "product_import_items_json_bounds_check" CHECK (octet_length("product_import_items"."raw_data"::text) <= 32768 and octet_length("product_import_items"."normalized_data"::text) <= 131072 and octet_length("product_import_items"."warning_codes"::text) <= 4096)
);
--> statement-breakpoint
ALTER TABLE "product_import_batches" ADD CONSTRAINT "product_import_batches_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_import_batches" ADD CONSTRAINT "product_import_batches_auth_session_id_auth_sessions_id_fk" FOREIGN KEY ("auth_session_id") REFERENCES "public"."auth_sessions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_import_batches" ADD CONSTRAINT "product_import_batches_workbook_asset_id_assets_id_fk" FOREIGN KEY ("workbook_asset_id") REFERENCES "public"."assets"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_import_batches" ADD CONSTRAINT "product_import_batches_media_package_asset_id_assets_id_fk" FOREIGN KEY ("media_package_asset_id") REFERENCES "public"."assets"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_import_batches" ADD CONSTRAINT "product_import_batches_package_upload_batch_id_asset_upload_batches_id_fk" FOREIGN KEY ("package_upload_batch_id") REFERENCES "public"."asset_upload_batches"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_import_items" ADD CONSTRAINT "product_import_items_batch_id_product_import_batches_id_fk" FOREIGN KEY ("batch_id") REFERENCES "public"."product_import_batches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_import_items" ADD CONSTRAINT "product_import_items_target_product_id_products_id_fk" FOREIGN KEY ("target_product_id") REFERENCES "public"."products"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_import_items" ADD CONSTRAINT "product_import_items_target_asset_id_assets_id_fk" FOREIGN KEY ("target_asset_id") REFERENCES "public"."assets"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_import_items" ADD CONSTRAINT "product_import_items_upload_batch_id_asset_upload_batches_id_fk" FOREIGN KEY ("upload_batch_id") REFERENCES "public"."asset_upload_batches"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "product_import_batches_actor_mode_fingerprint_unique" ON "product_import_batches" USING btree ("created_by_user_id","mode","source_fingerprint");--> statement-breakpoint
CREATE INDEX "product_import_batches_owner_status_idx" ON "product_import_batches" USING btree ("created_by_user_id","status","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "product_import_items_batch_kind_source_unique" ON "product_import_items" USING btree ("batch_id","kind","source_key");--> statement-breakpoint
CREATE INDEX "product_import_items_batch_status_idx" ON "product_import_items" USING btree ("batch_id","status","kind");--> statement-breakpoint
CREATE INDEX "product_import_items_target_product_idx" ON "product_import_items" USING btree ("target_product_id");--> statement-breakpoint
CREATE INDEX "product_import_items_target_asset_idx" ON "product_import_items" USING btree ("target_asset_id");
