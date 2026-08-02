CREATE TABLE "finalize_object_manifest_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"recovery_job_id" uuid NOT NULL,
	"upload_batch_id" uuid NOT NULL,
	"finalize_attempt" integer NOT NULL,
	"asset_id" uuid NOT NULL,
	"object_key" text NOT NULL,
	"object_role" text NOT NULL,
	"mime_type" text NOT NULL,
	"byte_size" integer NOT NULL,
	"write_completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "finalize_object_manifest_items" ADD CONSTRAINT "finalize_object_manifest_items_recovery_job_id_upload_recovery_jobs_id_fk" FOREIGN KEY ("recovery_job_id") REFERENCES "public"."upload_recovery_jobs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "finalize_object_manifest_items" ADD CONSTRAINT "finalize_object_manifest_items_upload_batch_id_asset_upload_batches_id_fk" FOREIGN KEY ("upload_batch_id") REFERENCES "public"."asset_upload_batches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "finalize_object_manifest_items" ADD CONSTRAINT "finalize_object_manifest_items_asset_id_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."assets"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
INSERT INTO "finalize_object_manifest_items" (
	"recovery_job_id",
	"upload_batch_id",
	"finalize_attempt",
	"asset_id",
	"object_key",
	"object_role",
	"mime_type",
	"byte_size",
	"write_completed_at",
	"created_at",
	"updated_at"
)
SELECT
	"finalize_recovery_id",
	"upload_batch_id",
	"finalize_attempt",
	"asset_id",
	"object_key",
	"expected_object_role",
	"expected_mime_type",
	"expected_byte_size",
	"write_completed_at",
	"created_at",
	"updated_at"
FROM "object_cleanup_jobs"
WHERE "storage_partition" = 'public'
	AND "finalize_recovery_id" IS NOT NULL
	AND "finalize_attempt" IS NOT NULL
	AND "asset_id" IS NOT NULL
ON CONFLICT DO NOTHING;--> statement-breakpoint
CREATE UNIQUE INDEX "finalize_manifest_attempt_object_unique" ON "finalize_object_manifest_items" USING btree ("recovery_job_id","finalize_attempt","object_key");--> statement-breakpoint
CREATE INDEX "finalize_manifest_batch_attempt_idx" ON "finalize_object_manifest_items" USING btree ("upload_batch_id","finalize_attempt");
