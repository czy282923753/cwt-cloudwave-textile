CREATE TYPE "public"."finalize_manifest_evidence_status" AS ENUM('planned', 'written', 'verified', 'unverified');--> statement-breakpoint
CREATE TYPE "public"."object_cleanup_kind" AS ENUM('generic', 'staging', 'finalize_public', 'finalize_private');--> statement-breakpoint
ALTER TABLE "object_cleanup_jobs" DROP CONSTRAINT "object_cleanup_finalize_state_check";--> statement-breakpoint
ALTER TABLE "finalize_object_manifest_items" DROP CONSTRAINT "finalize_object_manifest_items_recovery_job_id_upload_recovery_jobs_id_fk";
--> statement-breakpoint
ALTER TABLE "object_cleanup_jobs" ADD COLUMN "upload_intent_id" uuid;--> statement-breakpoint
ALTER TABLE "object_cleanup_jobs" ADD COLUMN "cleanup_kind" "object_cleanup_kind" DEFAULT 'generic' NOT NULL;--> statement-breakpoint
ALTER TABLE "object_cleanup_jobs" ADD COLUMN "recovery_version" integer;--> statement-breakpoint
ALTER TABLE "object_cleanup_jobs" ADD COLUMN "finalize_manifest_item_id" uuid;--> statement-breakpoint
ALTER TABLE "finalize_object_manifest_items" ADD COLUMN "evidence_status" "finalize_manifest_evidence_status" DEFAULT 'unverified' NOT NULL;--> statement-breakpoint
ALTER TABLE "finalize_object_manifest_items" ADD COLUMN "evidence_source" text DEFAULT 'unverified' NOT NULL;--> statement-breakpoint
ALTER TABLE "finalize_object_manifest_items" ADD COLUMN "evidence_verified_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "finalize_object_manifest_items" ADD COLUMN "observed_byte_size" integer;--> statement-breakpoint
ALTER TABLE "finalize_object_manifest_items" ADD COLUMN "observed_mime_type" text;--> statement-breakpoint
ALTER TABLE "finalize_object_manifest_items" ADD COLUMN "observed_at" timestamp with time zone;--> statement-breakpoint
UPDATE "finalize_object_manifest_items"
SET
  "evidence_status" = 'unverified',
  "evidence_source" = 'migration_0015_legacy_inferred',
  "evidence_verified_at" = NULL,
  "observed_byte_size" = NULL,
  "observed_mime_type" = NULL,
  "observed_at" = NULL;--> statement-breakpoint
UPDATE "object_cleanup_jobs" AS "cleanup"
SET
  "cleanup_kind" = CASE
    WHEN "cleanup"."finalize_recovery_id" IS NOT NULL THEN 'finalize_public'::"object_cleanup_kind"
    WHEN "cleanup"."storage_partition" = 'private'
      AND "cleanup"."reason" = 'finalize_private_staging_released'
      THEN 'finalize_private'::"object_cleanup_kind"
    WHEN "cleanup"."storage_partition" = 'private'
      AND "cleanup"."reason" = 'admin_staging_saga_compensation'
      THEN 'staging'::"object_cleanup_kind"
    ELSE 'generic'::"object_cleanup_kind"
  END;--> statement-breakpoint
UPDATE "object_cleanup_jobs" AS "cleanup"
SET
  "upload_intent_id" = "recovery"."upload_intent_id",
  "recovery_version" = "recovery"."version"
FROM "upload_recovery_jobs" AS "recovery"
WHERE "cleanup"."storage_partition" = 'private'
  AND "cleanup"."upload_batch_id" = "recovery"."upload_batch_id"
  AND "cleanup"."asset_id" = "recovery"."asset_id"
  AND "cleanup"."object_key" = "recovery"."object_key"
  AND "recovery"."kind" = 'staging';--> statement-breakpoint
UPDATE "object_cleanup_jobs" AS "cleanup"
SET
  "recovery_version" = "recovery"."version",
  "finalize_manifest_item_id" = "manifest"."id"
FROM "upload_recovery_jobs" AS "recovery",
     "finalize_object_manifest_items" AS "manifest"
WHERE "cleanup"."finalize_recovery_id" = "recovery"."id"
  AND "manifest"."recovery_job_id" = "cleanup"."finalize_recovery_id"
  AND "manifest"."finalize_attempt" = "cleanup"."finalize_attempt"
  AND "manifest"."object_key" = "cleanup"."object_key"
  AND "manifest"."asset_id" = "cleanup"."asset_id";--> statement-breakpoint
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "object_cleanup_jobs" AS "cleanup"
    LEFT JOIN "upload_recovery_jobs" AS "recovery"
      ON "recovery"."id" = "cleanup"."finalize_recovery_id"
    WHERE "cleanup"."finalize_recovery_id" IS NOT NULL
      AND "recovery"."id" IS NULL
  ) THEN
    RAISE EXCEPTION '0015: orphan finalize_recovery_id requires manual governance';
  END IF;
  IF EXISTS (
    SELECT 1
    FROM "object_cleanup_jobs"
    WHERE "finalize_recovery_id" IS NOT NULL
      AND ("recovery_version" IS NULL OR "finalize_manifest_item_id" IS NULL)
  ) THEN
    RAISE EXCEPTION '0015: incomplete Finalize Cleanup identity requires manual governance';
  END IF;
END $$;--> statement-breakpoint
ALTER TABLE "object_cleanup_jobs" ADD CONSTRAINT "object_cleanup_jobs_upload_intent_id_upload_intents_id_fk" FOREIGN KEY ("upload_intent_id") REFERENCES "public"."upload_intents"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "object_cleanup_jobs" ADD CONSTRAINT "object_cleanup_jobs_finalize_recovery_id_upload_recovery_jobs_id_fk" FOREIGN KEY ("finalize_recovery_id") REFERENCES "public"."upload_recovery_jobs"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "object_cleanup_jobs" ADD CONSTRAINT "object_cleanup_jobs_finalize_manifest_item_id_finalize_object_manifest_items_id_fk" FOREIGN KEY ("finalize_manifest_item_id") REFERENCES "public"."finalize_object_manifest_items"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "finalize_object_manifest_items" ADD CONSTRAINT "finalize_object_manifest_items_recovery_job_id_upload_recovery_jobs_id_fk" FOREIGN KEY ("recovery_job_id") REFERENCES "public"."upload_recovery_jobs"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "object_cleanup_jobs_intent_idx" ON "object_cleanup_jobs" USING btree ("upload_intent_id","status");--> statement-breakpoint
CREATE INDEX "object_cleanup_jobs_manifest_idx" ON "object_cleanup_jobs" USING btree ("finalize_manifest_item_id");--> statement-breakpoint
ALTER TABLE "object_cleanup_jobs" ADD CONSTRAINT "object_cleanup_finalize_state_check" CHECK ("object_cleanup_jobs"."finalize_recovery_id" is null or (
        "object_cleanup_jobs"."cleanup_kind" = 'finalize_public'
        and "object_cleanup_jobs"."storage_partition" = 'public'
        and "object_cleanup_jobs"."recovery_version" is not null
        and "object_cleanup_jobs"."finalize_attempt" is not null
        and "object_cleanup_jobs"."finalize_manifest_item_id" is not null
        and "object_cleanup_jobs"."expected_object_role" is not null
        and "object_cleanup_jobs"."expected_mime_type" is not null
        and "object_cleanup_jobs"."expected_byte_size" is not null
        and (
          ("object_cleanup_jobs"."status" = 'standby' and "object_cleanup_jobs"."armed_at" is null and "object_cleanup_jobs"."completed_at" is null)
          or ("object_cleanup_jobs"."status" = 'cancelled' and "object_cleanup_jobs"."armed_at" is null)
          or ("object_cleanup_jobs"."status" in ('pending', 'processing', 'completed', 'dead') and "object_cleanup_jobs"."armed_at" is not null)
        )
      ));
