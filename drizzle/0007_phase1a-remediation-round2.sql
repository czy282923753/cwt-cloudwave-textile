CREATE TYPE "public"."asset_rescan_status" AS ENUM('not_required', 'required', 'processing', 'completed', 'manual_review');--> statement-breakpoint
CREATE TYPE "public"."declaration_review_decision" AS ENUM('approved', 'rejected', 'admin_override');--> statement-breakpoint
CREATE TYPE "public"."upload_intent_status" AS ENUM('created', 'uploading', 'passed', 'failed', 'consumed', 'expired');--> statement-breakpoint
CREATE TABLE "upload_intents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"token_hash" text NOT NULL,
	"anonymous_session_id" text NOT NULL,
	"declared_file_name" text NOT NULL,
	"declared_mime_type" text NOT NULL,
	"declared_byte_size" integer NOT NULL,
	"status" "upload_intent_status" DEFAULT 'created' NOT NULL,
	"asset_id" uuid,
	"consumed_by_inquiry_id" uuid,
	"is_consumed" boolean DEFAULT false NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"used_at" timestamp with time zone,
	"failure_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "assets" ADD COLUMN "scan_failure_reason" text;--> statement-breakpoint
ALTER TABLE "assets" ADD COLUMN "rescan_status" "asset_rescan_status" DEFAULT 'not_required' NOT NULL;--> statement-breakpoint
ALTER TABLE "assets" ADD COLUMN "rescan_attempt_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "assets" ADD COLUMN "last_rescan_attempt_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "assets" ADD COLUMN "declaration_statement_version" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "assets" ADD COLUMN "declaration_last_editor_user_id" uuid;--> statement-breakpoint
ALTER TABLE "assets" ADD COLUMN "declaration_reviewed_statement_version" integer;--> statement-breakpoint
ALTER TABLE "assets" ADD COLUMN "declaration_review_decision" "declaration_review_decision";--> statement-breakpoint
ALTER TABLE "assets" ADD COLUMN "declaration_review_reason" text;--> statement-breakpoint
ALTER TABLE "inquiries" ADD COLUMN "public_reference" text;--> statement-breakpoint
ALTER TABLE "notification_outbox" ADD COLUMN "attempt_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "notification_outbox" ADD COLUMN "delivery_key" text;--> statement-breakpoint
ALTER TABLE "notification_outbox" ADD COLUMN "last_error" text;--> statement-breakpoint
ALTER TABLE "notification_outbox" ADD COLUMN "locked_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "notification_outbox" ADD COLUMN "locked_by" text;--> statement-breakpoint
ALTER TABLE "notification_outbox" ADD COLUMN "lease_expires_at" timestamp with time zone;--> statement-breakpoint
-- Phase one of the historical-Asset upgrade deliberately refuses to infer a clean scan.
-- Every surviving object must be read from its recorded partition and rescanned by the
-- application job before it can be delivered again. Deleted records enter the manual list.
UPDATE "assets"
SET "scan_status" = 'pending',
    "scan_provider" = NULL,
    "scan_result" = NULL,
    "scan_completed_at" = NULL,
    "rescan_status" = CASE
      WHEN "deleted_at" IS NOT NULL OR "status" = 'deleted' THEN 'manual_review'::"asset_rescan_status"
      ELSE 'required'::"asset_rescan_status"
    END,
    "scan_failure_reason" = CASE
      WHEN "deleted_at" IS NOT NULL OR "status" = 'deleted' THEN 'historical_asset_deleted'
      ELSE 'historical_asset_requires_rescan'
    END;--> statement-breakpoint
UPDATE "inquiries"
SET "public_reference" = 'CWT-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 20))
WHERE "public_reference" IS NULL;--> statement-breakpoint
ALTER TABLE "inquiries" ALTER COLUMN "public_reference" SET NOT NULL;--> statement-breakpoint
UPDATE "notification_outbox"
SET "attempt_count" = "attempts",
    "delivery_key" = "kind" || ':' || "aggregate_type" || ':' || "aggregate_id"::text
WHERE "delivery_key" IS NULL;--> statement-breakpoint
ALTER TABLE "notification_outbox" ALTER COLUMN "delivery_key" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "upload_intents" ADD CONSTRAINT "upload_intents_asset_id_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."assets"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "upload_intents" ADD CONSTRAINT "upload_intents_consumed_by_inquiry_id_inquiries_id_fk" FOREIGN KEY ("consumed_by_inquiry_id") REFERENCES "public"."inquiries"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "upload_intents_token_hash_unique" ON "upload_intents" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "upload_intents_session_status_idx" ON "upload_intents" USING btree ("anonymous_session_id","status");--> statement-breakpoint
CREATE INDEX "upload_intents_expiry_idx" ON "upload_intents" USING btree ("expires_at");--> statement-breakpoint
ALTER TABLE "assets" ADD CONSTRAINT "assets_declaration_last_editor_user_id_users_id_fk" FOREIGN KEY ("declaration_last_editor_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "assets_rescan_work_idx" ON "assets" USING btree ("rescan_status","updated_at");--> statement-breakpoint
CREATE UNIQUE INDEX "inquiries_public_reference_unique" ON "inquiries" USING btree ("public_reference");--> statement-breakpoint
CREATE UNIQUE INDEX "notification_outbox_delivery_key_unique" ON "notification_outbox" USING btree ("delivery_key");
