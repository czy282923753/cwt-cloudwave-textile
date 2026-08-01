CREATE TYPE "public"."upload_recovery_kind" AS ENUM('staging', 'finalize');--> statement-breakpoint
CREATE TYPE "public"."upload_recovery_stage" AS ENUM('preregistered', 'storage_writing', 'storage_written', 'scanning', 'scan_passed', 'claimed', 'source_copy_started', 'original_written', 'variants_processing', 'variants_written', 'database_finalizing', 'cleanup_required', 'failed', 'completed');--> statement-breakpoint
CREATE TYPE "public"."upload_recovery_status" AS ENUM('pending', 'processing', 'retryable', 'cleanup_required', 'completed', 'dead');--> statement-breakpoint
CREATE TABLE "upload_recovery_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kind" "upload_recovery_kind" NOT NULL,
	"upload_batch_id" uuid NOT NULL,
	"upload_intent_id" uuid,
	"asset_id" uuid,
	"storage_partition" text,
	"object_key" text,
	"status" "upload_recovery_status" DEFAULT 'pending' NOT NULL,
	"stage" "upload_recovery_stage" DEFAULT 'preregistered' NOT NULL,
	"attempt_count" integer DEFAULT 0 NOT NULL,
	"max_attempts" integer DEFAULT 8 NOT NULL,
	"next_attempt_at" timestamp with time zone DEFAULT now() NOT NULL,
	"locked_by" text,
	"locked_at" timestamp with time zone,
	"lease_expires_at" timestamp with time zone,
	"version" integer DEFAULT 0 NOT NULL,
	"last_error" text,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "upload_recovery_jobs" ADD CONSTRAINT "upload_recovery_jobs_upload_batch_id_asset_upload_batches_id_fk" FOREIGN KEY ("upload_batch_id") REFERENCES "public"."asset_upload_batches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "upload_recovery_jobs" ADD CONSTRAINT "upload_recovery_jobs_upload_intent_id_upload_intents_id_fk" FOREIGN KEY ("upload_intent_id") REFERENCES "public"."upload_intents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "upload_recovery_jobs" ADD CONSTRAINT "upload_recovery_jobs_asset_id_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."assets"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "upload_recovery_jobs_intent_unique" ON "upload_recovery_jobs" USING btree ("upload_intent_id");--> statement-breakpoint
CREATE UNIQUE INDEX "upload_recovery_jobs_finalize_batch_unique" ON "upload_recovery_jobs" USING btree ("upload_batch_id") WHERE "upload_recovery_jobs"."kind" = 'finalize';--> statement-breakpoint
CREATE INDEX "upload_recovery_jobs_work_idx" ON "upload_recovery_jobs" USING btree ("status","next_attempt_at","lease_expires_at");--> statement-breakpoint
CREATE INDEX "upload_recovery_jobs_batch_idx" ON "upload_recovery_jobs" USING btree ("upload_batch_id","kind");