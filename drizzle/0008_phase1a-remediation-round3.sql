CREATE TYPE "public"."effective_rights_decision" AS ENUM('allowed', 'restricted', 'not_allowed', 'expired', 'revoked', 'pending_review');--> statement-breakpoint
ALTER TYPE "public"."asset_role" ADD VALUE 'cover' BEFORE 'detail';--> statement-breakpoint
ALTER TYPE "public"."asset_role" ADD VALUE 'download' BEFORE 'inquiry';--> statement-breakpoint
ALTER TYPE "public"."consent_state" ADD VALUE 'revoked';--> statement-breakpoint
CREATE TABLE "analytics_consents" (
	"consent_session_id" text PRIMARY KEY NOT NULL,
	"status" "consent_state" DEFAULT 'unknown' NOT NULL,
	"consent_version" integer DEFAULT 0 NOT NULL,
	"granted_at" timestamp with time zone,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "conversion_events" DROP CONSTRAINT "conversion_events_inquiry_id_inquiries_id_fk";
--> statement-breakpoint
DROP INDEX "conversion_events_inquiry_idx";--> statement-breakpoint
ALTER TABLE "conversion_events" ADD COLUMN "external_reference" text;--> statement-breakpoint
UPDATE "conversion_events" AS ce
SET "external_reference" = i."public_reference"
FROM "inquiries" AS i
WHERE ce."inquiry_id" = i."id"
  AND ce."event_name" = 'inquiry_created';--> statement-breakpoint
DELETE FROM "conversion_events"
WHERE "event_name" IN (
	'inquiry_qualified',
	'quote_recorded',
	'sample_recorded',
	'inquiry_won',
	'inquiry_lost'
);--> statement-breakpoint
ALTER TABLE "assets" ADD COLUMN "effective_rights_decision" "effective_rights_decision";--> statement-breakpoint
ALTER TABLE "assets" ADD COLUMN "rights_public_website_allowed" boolean;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "publication_remediation_required" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "publication_remediation_reason" text;--> statement-breakpoint
UPDATE "assets"
SET
	"effective_rights_decision" = CASE
		WHEN "declaration_expiry_date" IS NOT NULL AND "declaration_expiry_date" <= now() THEN 'expired'::"effective_rights_decision"
		WHEN "public_use_permission" = 'not_allowed' OR "declaration_review_decision" = 'rejected' THEN 'not_allowed'::"effective_rights_decision"
		WHEN "declaration_statement_version" > 0 AND (
			"declaration_review_decision" IS NULL OR
			"declaration_reviewed_statement_version" IS DISTINCT FROM "declaration_statement_version"
		) THEN 'pending_review'::"effective_rights_decision"
		WHEN "public_use_permission" = 'restricted' THEN 'restricted'::"effective_rights_decision"
		WHEN "public_use_permission" = 'allowed' AND "declaration_review_decision" IN ('approved', 'admin_override') THEN 'allowed'::"effective_rights_decision"
		ELSE NULL
	END,
	"rights_public_website_allowed" = CASE
		WHEN "public_use_permission" = 'restricted' THEN false
		ELSE NULL
	END;--> statement-breakpoint
WITH invalid_products AS (
	SELECT p."id"
	FROM "products" AS p
	WHERE p."status" = 'published'
	AND (
		p."real_product_basis" IS NULL OR
		p."real_product_confirmed_by_user_id" IS NULL OR
		p."real_product_confirmed_at" IS NULL OR
		NOT EXISTS (
			SELECT 1 FROM "users" AS u
			WHERE u."id" = p."real_product_confirmed_by_user_id"
			AND u."is_active" = true
			AND u."role" IN ('admin', 'reviewer_publisher')
		) OR
		NOT EXISTS (
			SELECT 1 FROM "product_localizations" AS pl
			WHERE pl."product_id" = p."id" AND pl."locale" = 'en'
			AND length(trim(pl."name")) > 0
		) OR
		NOT EXISTS (
			SELECT 1 FROM "routes" AS r
			JOIN "seo_metadata" AS sm ON sm."route_id" = r."id"
			WHERE r."entity_type" = 'product' AND r."entity_id" = p."id"
			AND r."locale" = 'en' AND r."is_current" = true
		) OR
		NOT EXISTS (
			SELECT 1 FROM "product_assets" AS pa
			JOIN "assets" AS a ON a."id" = pa."asset_id"
			WHERE pa."product_id" = p."id"
			AND pa."role" IN ('hero', 'gallery', 'detail', 'thumbnail', 'inline')
			AND a."detected_mime_type" IN ('image/jpeg', 'image/png', 'image/webp', 'image/avif')
			AND a."storage_partition" = 'public' AND a."access" = 'public'
			AND a."status" = 'ready' AND a."scan_status" = 'passed' AND a."deleted_at" IS NULL
			AND (a."declaration_expiry_date" IS NULL OR a."declaration_expiry_date" > now())
			AND (
				(a."effective_rights_decision" IS NULL AND (a."public_use_permission" IS NULL OR a."public_use_permission" = 'allowed')) OR
				a."effective_rights_decision" = 'allowed' OR
				(a."effective_rights_decision" = 'restricted' AND a."rights_public_website_allowed" = true)
			)
		) OR
		p."product_code" LIKE 'TEST-FIXTURE-%' OR
		EXISTS (
			SELECT 1 FROM "product_localizations" AS fixture_pl
			WHERE fixture_pl."product_id" = p."id" AND fixture_pl."name" LIKE 'TEST FIXTURE%'
		)
	)
)
UPDATE "seo_metadata" AS sm
SET "index_status" = 'noindex', "updated_at" = now()
FROM "routes" AS r, invalid_products AS invalid
WHERE sm."route_id" = r."id"
	AND r."entity_type" = 'product'
	AND r."entity_id" = invalid."id"
	AND r."is_current" = true;--> statement-breakpoint
WITH invalid_products AS (
	SELECT p."id"
	FROM "products" AS p
	WHERE p."status" = 'published'
	AND (
		p."real_product_basis" IS NULL OR p."real_product_confirmed_by_user_id" IS NULL OR p."real_product_confirmed_at" IS NULL OR
		NOT EXISTS (SELECT 1 FROM "users" u WHERE u."id" = p."real_product_confirmed_by_user_id" AND u."is_active" = true AND u."role" IN ('admin', 'reviewer_publisher')) OR
		NOT EXISTS (SELECT 1 FROM "product_localizations" pl WHERE pl."product_id" = p."id" AND pl."locale" = 'en' AND length(trim(pl."name")) > 0) OR
		NOT EXISTS (SELECT 1 FROM "routes" r JOIN "seo_metadata" sm ON sm."route_id" = r."id" WHERE r."entity_type" = 'product' AND r."entity_id" = p."id" AND r."locale" = 'en' AND r."is_current" = true) OR
		NOT EXISTS (
			SELECT 1 FROM "product_assets" pa JOIN "assets" a ON a."id" = pa."asset_id"
			WHERE pa."product_id" = p."id" AND pa."role" IN ('hero', 'gallery', 'detail', 'thumbnail', 'inline')
			AND a."detected_mime_type" IN ('image/jpeg', 'image/png', 'image/webp', 'image/avif')
			AND a."storage_partition" = 'public' AND a."access" = 'public' AND a."status" = 'ready' AND a."scan_status" = 'passed' AND a."deleted_at" IS NULL
			AND (a."declaration_expiry_date" IS NULL OR a."declaration_expiry_date" > now())
			AND ((a."effective_rights_decision" IS NULL AND (a."public_use_permission" IS NULL OR a."public_use_permission" = 'allowed')) OR a."effective_rights_decision" = 'allowed' OR (a."effective_rights_decision" = 'restricted' AND a."rights_public_website_allowed" = true))
		) OR
		p."product_code" LIKE 'TEST-FIXTURE-%' OR EXISTS (SELECT 1 FROM "product_localizations" fixture_pl WHERE fixture_pl."product_id" = p."id" AND fixture_pl."name" LIKE 'TEST FIXTURE%')
	)
), demoted AS (
	UPDATE "products" AS p
	SET
		"status" = 'in_review',
		"publication_remediation_required" = true,
		"publication_remediation_reason" = 'round3_historical_publication_gate_failed',
		"updated_at" = now()
	FROM invalid_products AS invalid
	WHERE p."id" = invalid."id"
	RETURNING p."id"
)
INSERT INTO "audit_logs" ("action", "entity_type", "entity_id", "before_summary", "after_summary")
SELECT
	'product.historical_publication.remediation_required',
	'product',
	demoted."id",
	'{"status":"published"}'::jsonb,
	'{"status":"in_review","indexStatus":"noindex","reason":"round3_historical_publication_gate_failed"}'::jsonb
FROM demoted;--> statement-breakpoint
CREATE INDEX "analytics_consents_status_idx" ON "analytics_consents" USING btree ("status");--> statement-breakpoint
CREATE INDEX "conversion_events_external_reference_idx" ON "conversion_events" USING btree ("external_reference");--> statement-breakpoint
ALTER TABLE "conversion_events" DROP COLUMN "inquiry_id";--> statement-breakpoint
ALTER TABLE "conversion_events" ADD CONSTRAINT "conversion_events_public_only_check" CHECK (
	"event_name" IN (
		'product_view',
		'quote_cta_click',
		'whatsapp_click',
		'upload_started',
		'image_upload_completed',
		'quote_submit_success',
		'inquiry_created'
	)
);
