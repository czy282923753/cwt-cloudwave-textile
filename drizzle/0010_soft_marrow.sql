CREATE TYPE "public"."asset_upload_batch_status" AS ENUM('created', 'uploading', 'ready_to_finalize', 'completed', 'failed', 'expired');--> statement-breakpoint
CREATE TYPE "public"."upload_intent_kind" AS ENUM('inquiry', 'admin_asset');--> statement-breakpoint
ALTER TABLE "asset_upload_batches" ADD COLUMN "status" "asset_upload_batch_status" DEFAULT 'created' NOT NULL;--> statement-breakpoint
ALTER TABLE "asset_upload_batches" ADD COLUMN "auth_session_id" uuid;--> statement-breakpoint
ALTER TABLE "asset_upload_batches" ADD COLUMN "declared_file_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "asset_upload_batches" ADD COLUMN "completed_file_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "asset_upload_batches" ADD COLUMN "declaration_input" jsonb;--> statement-breakpoint
ALTER TABLE "asset_upload_batches" ADD COLUMN "expires_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "asset_upload_batches" ADD COLUMN "completed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "asset_upload_batches" ADD COLUMN "failure_reason" text;--> statement-breakpoint
ALTER TABLE "upload_intents" ADD COLUMN "kind" "upload_intent_kind" DEFAULT 'inquiry' NOT NULL;--> statement-breakpoint
ALTER TABLE "upload_intents" ADD COLUMN "created_by_user_id" uuid;--> statement-breakpoint
ALTER TABLE "upload_intents" ADD COLUMN "auth_session_id" uuid;--> statement-breakpoint
ALTER TABLE "upload_intents" ADD COLUMN "upload_batch_id" uuid;--> statement-breakpoint
ALTER TABLE "upload_intents" ADD COLUMN "admin_asset_category" "asset_category";--> statement-breakpoint
ALTER TABLE "upload_intents" ADD COLUMN "admin_asset_role" "asset_role";--> statement-breakpoint
ALTER TABLE "upload_intents" ADD COLUMN "association_type" text;--> statement-breakpoint
ALTER TABLE "upload_intents" ADD COLUMN "association_entity_id" uuid;--> statement-breakpoint
ALTER TABLE "upload_intents" ADD COLUMN "sort_order" integer;--> statement-breakpoint
ALTER TABLE "asset_upload_batches" ADD CONSTRAINT "asset_upload_batches_auth_session_id_auth_sessions_id_fk" FOREIGN KEY ("auth_session_id") REFERENCES "public"."auth_sessions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "upload_intents" ADD CONSTRAINT "upload_intents_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "upload_intents" ADD CONSTRAINT "upload_intents_upload_batch_id_asset_upload_batches_id_fk" FOREIGN KEY ("upload_batch_id") REFERENCES "public"."asset_upload_batches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "upload_intents_admin_owner_idx" ON "upload_intents" USING btree ("created_by_user_id","auth_session_id","status");--> statement-breakpoint
CREATE INDEX "upload_intents_batch_idx" ON "upload_intents" USING btree ("upload_batch_id","status");--> statement-breakpoint
SET CONSTRAINTS ALL IMMEDIATE;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_product_code_nonblank_check" CHECK ("products"."product_code" is null or "products"."product_code" !~ '^[[:space:]]*$');
