CREATE TYPE "public"."activity_direction" AS ENUM('inbound', 'outbound', 'internal');--> statement-breakpoint
CREATE TYPE "public"."asset_scan_status" AS ENUM('pending', 'passed', 'failed', 'error');--> statement-breakpoint
CREATE TYPE "public"."consent_state" AS ENUM('unknown', 'granted', 'denied');--> statement-breakpoint
CREATE TYPE "public"."outbox_status" AS ENUM('pending', 'processing', 'sent', 'failed', 'dead');--> statement-breakpoint
CREATE TABLE "notification_outbox" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kind" text NOT NULL,
	"aggregate_type" text NOT NULL,
	"aggregate_id" uuid NOT NULL,
	"status" "outbox_status" DEFAULT 'pending' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"payload" jsonb NOT NULL,
	"next_attempt_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_error_code" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"processed_at" timestamp with time zone
);--> statement-breakpoint
ALTER TABLE "products" DROP CONSTRAINT "products_primary_taxonomy_term_id_taxonomy_terms_id_fk";--> statement-breakpoint
UPDATE "product_taxonomy_terms" AS rel
SET "is_primary" = false
FROM "products" AS product
WHERE rel."product_id" = product."id"
  AND product."primary_taxonomy_term_id" IS NOT NULL;--> statement-breakpoint
INSERT INTO "product_taxonomy_terms" ("product_id", "taxonomy_term_id", "is_primary")
SELECT "id", "primary_taxonomy_term_id", true
FROM "products"
WHERE "primary_taxonomy_term_id" IS NOT NULL
ON CONFLICT ("product_id", "taxonomy_term_id")
DO UPDATE SET "is_primary" = true;--> statement-breakpoint
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "products" AS product
    LEFT JOIN "product_taxonomy_terms" AS rel
      ON rel."product_id" = product."id" AND rel."is_primary" = true
    GROUP BY product."id"
    HAVING count(rel."taxonomy_term_id") <> 1
  ) THEN
    RAISE EXCEPTION 'Every existing Product must have exactly one primary taxonomy relation before remediation';
  END IF;
END;
$$;--> statement-breakpoint
ALTER TABLE "conversion_events" ADD COLUMN "event_id" text;--> statement-breakpoint
ALTER TABLE "conversion_events" ADD COLUMN "submit_source_page_path" text;--> statement-breakpoint
ALTER TABLE "conversion_events" ADD COLUMN "last_non_direct_source" text;--> statement-breakpoint
ALTER TABLE "conversion_events" ADD COLUMN "last_non_direct_medium" text;--> statement-breakpoint
ALTER TABLE "conversion_events" ADD COLUMN "last_non_direct_campaign" text;--> statement-breakpoint
ALTER TABLE "conversion_events" ADD COLUMN "attribution_confidence" "attribution_confidence" DEFAULT 'unavailable' NOT NULL;--> statement-breakpoint
ALTER TABLE "conversion_events" ADD COLUMN "consent_state" "consent_state" DEFAULT 'unknown' NOT NULL;--> statement-breakpoint
UPDATE "conversion_events" SET "event_id" = 'legacy:' || "id"::text WHERE "event_id" IS NULL;--> statement-breakpoint
ALTER TABLE "conversion_events" ALTER COLUMN "event_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "assets" ADD COLUMN "scan_status" "asset_scan_status" DEFAULT 'pending' NOT NULL;--> statement-breakpoint
ALTER TABLE "customer_activities" ADD COLUMN "direction" "activity_direction" DEFAULT 'internal' NOT NULL;--> statement-breakpoint
ALTER TABLE "inquiries" ADD COLUMN "submitted_name" text;--> statement-breakpoint
ALTER TABLE "inquiries" ADD COLUMN "submitted_email" text;--> statement-breakpoint
ALTER TABLE "inquiries" ADD COLUMN "submitted_country_code" text;--> statement-breakpoint
ALTER TABLE "inquiries" ADD COLUMN "submitted_whatsapp" text;--> statement-breakpoint
ALTER TABLE "inquiries" ADD COLUMN "idempotency_key" text;--> statement-breakpoint
ALTER TABLE "inquiries" ADD COLUMN "analytics_consent_state" "consent_state" DEFAULT 'unknown' NOT NULL;--> statement-breakpoint
UPDATE "inquiries" AS i
SET "submitted_name" = c."name",
    "submitted_email" = c."email",
    "submitted_country_code" = c."country_code",
    "submitted_whatsapp" = c."whatsapp",
    "idempotency_key" = 'legacy:' || i."id"::text
FROM "contacts" AS c
WHERE c."id" = i."contact_id";--> statement-breakpoint
ALTER TABLE "inquiries" ALTER COLUMN "submitted_name" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "inquiries" ALTER COLUMN "submitted_email" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "inquiries" ALTER COLUMN "idempotency_key" SET NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "notification_outbox_kind_aggregate_unique" ON "notification_outbox" USING btree ("kind","aggregate_type","aggregate_id");--> statement-breakpoint
CREATE INDEX "notification_outbox_delivery_idx" ON "notification_outbox" USING btree ("status","next_attempt_at");--> statement-breakpoint
CREATE UNIQUE INDEX "conversion_events_event_id_unique" ON "conversion_events" USING btree ("event_id");--> statement-breakpoint
CREATE UNIQUE INDEX "inquiries_idempotency_key_unique" ON "inquiries" USING btree ("idempotency_key");--> statement-breakpoint
ALTER TABLE "products" DROP COLUMN "primary_taxonomy_term_id";--> statement-breakpoint

-- Enforce the single authoritative primary-category relation at transaction commit.
CREATE OR REPLACE FUNCTION cwt_assert_product_primary_taxonomy()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  target_product_id uuid;
  primary_count integer;
BEGIN
  IF TG_TABLE_NAME = 'products' THEN
    target_product_id := COALESCE(NEW.id, OLD.id);
  ELSE
    target_product_id := COALESCE(NEW.product_id, OLD.product_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM products WHERE id = target_product_id) THEN
    RETURN NULL;
  END IF;
  SELECT count(*) INTO primary_count
  FROM product_taxonomy_terms
  WHERE product_id = target_product_id AND is_primary = true;
  IF primary_count <> 1 THEN
    RAISE EXCEPTION 'Product % must have exactly one primary taxonomy term', target_product_id
      USING ERRCODE = '23514';
  END IF;
  RETURN NULL;
END;
$$;--> statement-breakpoint
CREATE CONSTRAINT TRIGGER cwt_product_primary_from_product
AFTER INSERT OR UPDATE ON products
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION cwt_assert_product_primary_taxonomy();--> statement-breakpoint
CREATE CONSTRAINT TRIGGER cwt_product_primary_from_relation
AFTER INSERT OR UPDATE OR DELETE ON product_taxonomy_terms
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION cwt_assert_product_primary_taxonomy();--> statement-breakpoint

-- An activity can never be attached to a Contact other than the Inquiry's Contact.
CREATE OR REPLACE FUNCTION cwt_assert_activity_contact()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM inquiries
    WHERE id = NEW.inquiry_id AND contact_id = NEW.contact_id
  ) THEN
    RAISE EXCEPTION 'Customer Activity contact must match Inquiry contact'
      USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;--> statement-breakpoint
CREATE TRIGGER cwt_customer_activity_contact_guard
BEFORE INSERT OR UPDATE OF inquiry_id, contact_id ON customer_activities
FOR EACH ROW EXECUTE FUNCTION cwt_assert_activity_contact();--> statement-breakpoint

-- CRM ownership and Qualified-state invariants are database-enforced as well as service-enforced.
CREATE OR REPLACE FUNCTION cwt_assert_inquiry_assignment()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.owner_user_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM users
    WHERE id = NEW.owner_user_id AND is_active = true AND role IN ('admin', 'sales')
  ) THEN
    RAISE EXCEPTION 'Inquiry owner must be an active Admin or Sales user'
      USING ERRCODE = '23514';
  END IF;
  IF NEW.status = 'qualified' AND NEW.qualification_status <> 'qualified' THEN
    RAISE EXCEPTION 'Qualified Inquiry requires qualified qualification status'
      USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;--> statement-breakpoint
CREATE TRIGGER cwt_inquiry_assignment_guard
BEFORE INSERT OR UPDATE OF owner_user_id, status, qualification_status ON inquiries
FOR EACH ROW EXECUTE FUNCTION cwt_assert_inquiry_assignment();--> statement-breakpoint

-- Serialize competing route/redirect writes and keep active redirect sources disjoint from routes.
CREATE OR REPLACE FUNCTION cwt_assert_route_path_available()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext(NEW.path));
  IF NEW.is_current AND EXISTS (
    SELECT 1 FROM redirects WHERE source_path = NEW.path AND is_active = true
  ) THEN
    RAISE EXCEPTION 'Current route path conflicts with active redirect source: %', NEW.path
      USING ERRCODE = '23505';
  END IF;
  RETURN NEW;
END;
$$;--> statement-breakpoint
CREATE TRIGGER cwt_route_path_guard
BEFORE INSERT OR UPDATE OF path, is_current ON routes
FOR EACH ROW EXECUTE FUNCTION cwt_assert_route_path_available();--> statement-breakpoint
CREATE OR REPLACE FUNCTION cwt_assert_redirect_graph()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  creates_cycle boolean;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext(NEW.source_path));
  IF NEW.is_active AND EXISTS (
    SELECT 1 FROM routes WHERE path = NEW.source_path AND is_current = true
  ) THEN
    RAISE EXCEPTION 'Redirect source conflicts with current route: %', NEW.source_path
      USING ERRCODE = '23505';
  END IF;
  IF NEW.is_active AND NOT EXISTS (
    SELECT 1 FROM routes WHERE path = NEW.destination_path AND is_current = true
  ) THEN
    RAISE EXCEPTION 'Redirect destination must be a current route: %', NEW.destination_path
      USING ERRCODE = '23514';
  END IF;
  WITH RECURSIVE redirect_chain(path) AS (
    SELECT NEW.destination_path
    UNION
    SELECT r.destination_path
    FROM redirects r
    JOIN redirect_chain c ON r.source_path = c.path
    WHERE r.is_active = true AND (TG_OP = 'INSERT' OR r.id <> NEW.id)
  )
  SELECT EXISTS (SELECT 1 FROM redirect_chain WHERE path = NEW.source_path)
  INTO creates_cycle;
  IF NEW.is_active AND creates_cycle THEN
    RAISE EXCEPTION 'Redirect cycle detected for source: %', NEW.source_path
      USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;--> statement-breakpoint
CREATE TRIGGER cwt_redirect_graph_guard
BEFORE INSERT OR UPDATE OF source_path, destination_path, is_active ON redirects
FOR EACH ROW EXECUTE FUNCTION cwt_assert_redirect_graph();
