ALTER TYPE "public"."object_cleanup_status" RENAME TO "object_cleanup_status_before_standby";--> statement-breakpoint
CREATE TYPE "public"."object_cleanup_status" AS ENUM('standby', 'pending', 'processing', 'completed', 'cancelled', 'dead');--> statement-breakpoint
ALTER TABLE "object_cleanup_jobs" ALTER COLUMN "status" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "object_cleanup_jobs" ALTER COLUMN "status" TYPE "public"."object_cleanup_status" USING "status"::text::"public"."object_cleanup_status";--> statement-breakpoint
ALTER TABLE "object_cleanup_jobs" ALTER COLUMN "status" SET DEFAULT 'pending';--> statement-breakpoint
DROP TYPE "public"."object_cleanup_status_before_standby";--> statement-breakpoint
ALTER TYPE "public"."upload_recovery_stage" RENAME TO "upload_recovery_stage_before_manifest";--> statement-breakpoint
CREATE TYPE "public"."upload_recovery_stage" AS ENUM('preregistered', 'storage_writing', 'storage_written', 'scanning', 'scan_passed', 'claimed', 'manifest_registered', 'source_copy_started', 'original_written', 'variants_processing', 'variants_written', 'database_finalizing', 'cleanup_required', 'failed', 'completed');--> statement-breakpoint
ALTER TABLE "upload_recovery_jobs" ALTER COLUMN "stage" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "upload_recovery_jobs" ALTER COLUMN "stage" TYPE "public"."upload_recovery_stage" USING "stage"::text::"public"."upload_recovery_stage";--> statement-breakpoint
ALTER TABLE "upload_recovery_jobs" ALTER COLUMN "stage" SET DEFAULT 'preregistered';--> statement-breakpoint
DROP TYPE "public"."upload_recovery_stage_before_manifest";--> statement-breakpoint
ALTER TABLE "object_cleanup_jobs" ADD COLUMN "finalize_recovery_id" uuid;--> statement-breakpoint
ALTER TABLE "object_cleanup_jobs" ADD COLUMN "finalize_attempt" integer;--> statement-breakpoint
ALTER TABLE "object_cleanup_jobs" ADD COLUMN "expected_object_role" text;--> statement-breakpoint
ALTER TABLE "object_cleanup_jobs" ADD COLUMN "expected_mime_type" text;--> statement-breakpoint
ALTER TABLE "object_cleanup_jobs" ADD COLUMN "expected_byte_size" integer;--> statement-breakpoint
ALTER TABLE "object_cleanup_jobs" ADD COLUMN "write_completed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "object_cleanup_jobs" ADD COLUMN "armed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "object_cleanup_jobs" ADD COLUMN "armed_reason" text;--> statement-breakpoint
UPDATE "object_cleanup_jobs" AS "cleanup"
SET
  "finalize_recovery_id" = "recovery"."id",
  "finalize_attempt" = "recovery"."attempt_count",
  "expected_object_role" = CASE
    WHEN "cleanup"."reason" LIKE '%variant%' THEN 'variant'
    ELSE 'original'
  END,
  "expected_mime_type" = CASE
    WHEN "cleanup"."object_key" LIKE '%.avif' THEN 'image/avif'
    WHEN "cleanup"."object_key" LIKE '%.webp' THEN 'image/webp'
    ELSE COALESCE("asset"."detected_mime_type", "asset"."declared_mime_type", 'application/octet-stream')
  END,
  "expected_byte_size" = GREATEST(COALESCE("asset"."byte_size", 0), 0),
  "write_completed_at" = CASE
    WHEN "cleanup"."status" IN ('pending', 'processing', 'completed', 'dead', 'cancelled')
      THEN COALESCE("cleanup"."completed_at", "cleanup"."created_at")
    ELSE "cleanup"."write_completed_at"
  END,
  "status" = CASE
    WHEN "batch"."status" = 'finalizing'
      AND "recovery"."status" = 'processing'
      AND "recovery"."lease_expires_at" > now()
      AND "cleanup"."status" = 'pending'
      THEN 'standby'::"object_cleanup_status"
    ELSE "cleanup"."status"
  END,
  "armed_at" = CASE
    WHEN "batch"."status" = 'finalizing'
      AND "recovery"."status" = 'processing'
      AND "recovery"."lease_expires_at" > now()
      AND "cleanup"."status" = 'pending'
      THEN NULL
    WHEN "cleanup"."status" IN ('pending', 'processing', 'completed', 'dead')
      THEN COALESCE("cleanup"."created_at", now())
    ELSE NULL
  END,
  "armed_reason" = CASE
    WHEN "batch"."status" = 'finalizing'
      AND "recovery"."status" = 'processing'
      AND "recovery"."lease_expires_at" > now()
      AND "cleanup"."status" = 'pending'
      THEN NULL
    WHEN "cleanup"."status" IN ('pending', 'processing', 'completed', 'dead')
      THEN 'migration_0013_existing_public_compensation'
    ELSE NULL
  END
FROM "upload_recovery_jobs" AS "recovery"
JOIN "asset_upload_batches" AS "batch"
  ON "batch"."id" = "recovery"."upload_batch_id"
JOIN "assets" AS "asset"
  ON "asset"."upload_batch_id" = "batch"."id"
WHERE "cleanup"."storage_partition" = 'public'
  AND "cleanup"."upload_batch_id" = "recovery"."upload_batch_id"
  AND "cleanup"."asset_id" = "asset"."id"
  AND "recovery"."kind" = 'finalize';--> statement-breakpoint
CREATE INDEX "object_cleanup_jobs_finalize_idx" ON "object_cleanup_jobs" USING btree ("finalize_recovery_id","finalize_attempt","status");--> statement-breakpoint
ALTER TABLE "object_cleanup_jobs" ADD CONSTRAINT "object_cleanup_finalize_state_check" CHECK ("object_cleanup_jobs"."finalize_recovery_id" is null or (
        "object_cleanup_jobs"."storage_partition" = 'public'
        and "object_cleanup_jobs"."finalize_attempt" is not null
        and "object_cleanup_jobs"."expected_object_role" is not null
        and "object_cleanup_jobs"."expected_mime_type" is not null
        and "object_cleanup_jobs"."expected_byte_size" is not null
        and (
          ("object_cleanup_jobs"."status" = 'standby' and "object_cleanup_jobs"."armed_at" is null and "object_cleanup_jobs"."completed_at" is null)
          or ("object_cleanup_jobs"."status" = 'cancelled' and "object_cleanup_jobs"."armed_at" is null)
          or ("object_cleanup_jobs"."status" in ('pending', 'processing', 'completed', 'dead') and "object_cleanup_jobs"."armed_at" is not null)
        )
      ));
