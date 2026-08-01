CREATE TYPE "public"."object_cleanup_status" AS ENUM('pending', 'processing', 'completed', 'cancelled', 'dead');--> statement-breakpoint
ALTER TYPE "public"."asset_upload_batch_status" ADD VALUE 'finalizing' BEFORE 'completed';--> statement-breakpoint
CREATE TABLE "object_cleanup_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"upload_batch_id" uuid,
	"asset_id" uuid,
	"storage_partition" text NOT NULL,
	"object_key" text NOT NULL,
	"reason" text NOT NULL,
	"status" "object_cleanup_status" DEFAULT 'pending' NOT NULL,
	"attempt_count" integer DEFAULT 0 NOT NULL,
	"max_attempts" integer DEFAULT 8 NOT NULL,
	"next_attempt_at" timestamp with time zone DEFAULT now() NOT NULL,
	"locked_by" text,
	"locked_at" timestamp with time zone,
	"lease_expires_at" timestamp with time zone,
	"last_error" text,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "conversion_events" DROP CONSTRAINT IF EXISTS "conversion_events_public_only_check";--> statement-breakpoint
ALTER TABLE "object_cleanup_jobs" ADD CONSTRAINT "object_cleanup_jobs_upload_batch_id_asset_upload_batches_id_fk" FOREIGN KEY ("upload_batch_id") REFERENCES "public"."asset_upload_batches"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "object_cleanup_jobs" ADD CONSTRAINT "object_cleanup_jobs_asset_id_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."assets"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "object_cleanup_jobs_object_unique" ON "object_cleanup_jobs" USING btree ("storage_partition","object_key");--> statement-breakpoint
CREATE INDEX "object_cleanup_jobs_work_idx" ON "object_cleanup_jobs" USING btree ("status","next_attempt_at","lease_expires_at");--> statement-breakpoint
CREATE INDEX "object_cleanup_jobs_batch_idx" ON "object_cleanup_jobs" USING btree ("upload_batch_id","status");--> statement-breakpoint
ALTER TABLE "conversion_events" ADD CONSTRAINT "conversion_events_public_only_check" CHECK ("conversion_events"."event_name" in ('product_view', 'quote_cta_click', 'whatsapp_click', 'upload_started', 'image_upload_completed', 'quote_submit_success', 'inquiry_created') and ("conversion_events"."entity_type" is null or "conversion_events"."entity_type" in ('product', 'application', 'fabric_entry', 'content')) and (("conversion_events"."entity_type" is null and "conversion_events"."entity_id" is null) or ("conversion_events"."entity_type" is not null and "conversion_events"."entity_id" is not null)));
