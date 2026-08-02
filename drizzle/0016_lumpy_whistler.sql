ALTER TABLE "inquiries" ADD COLUMN "request_fingerprint" text;--> statement-breakpoint
ALTER TABLE "inquiries" ADD COLUMN "request_fingerprint_version" integer;--> statement-breakpoint
ALTER TABLE "inquiries" ADD CONSTRAINT "inquiries_request_fingerprint_check" CHECK ((
        "inquiries"."request_fingerprint" is null
        and "inquiries"."request_fingerprint_version" is null
      ) or (
        "inquiries"."request_fingerprint" is not null
        and "inquiries"."request_fingerprint_version" is not null
        and
        "inquiries"."request_fingerprint" ~ '^[0-9a-f]{64}$'
        and "inquiries"."request_fingerprint_version" >= 1
      ));--> statement-breakpoint

-- Route and Redirect mutations share one deterministic endpoint-lock namespace.
CREATE OR REPLACE FUNCTION cwt_assert_route_path_available()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  lock_path text;
  lock_paths text[] := ARRAY[NEW.path];
BEGIN
  IF TG_OP = 'UPDATE' THEN
    lock_paths := array_append(lock_paths, OLD.path);
  END IF;
  FOR lock_path IN
    SELECT DISTINCT candidate
    FROM unnest(lock_paths) AS candidate
    WHERE candidate IS NOT NULL
    ORDER BY candidate
  LOOP
    PERFORM pg_advisory_xact_lock(
      hashtext('cwt:redirect-graph:' || lock_path)
    );
  END LOOP;
  IF NEW.is_current AND EXISTS (
    SELECT 1 FROM redirects WHERE source_path = NEW.path AND is_active = true
  ) THEN
    RAISE EXCEPTION 'Current route path conflicts with active redirect source: %', NEW.path
      USING ERRCODE = '23505';
  END IF;
  RETURN NEW;
END;
$$;--> statement-breakpoint

CREATE OR REPLACE FUNCTION cwt_assert_redirect_graph()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  creates_cycle boolean;
  lock_path text;
  lock_paths text[] := ARRAY[NEW.source_path, NEW.destination_path];
BEGIN
  IF TG_OP = 'UPDATE' THEN
    lock_paths := array_append(lock_paths, OLD.source_path);
    lock_paths := array_append(lock_paths, OLD.destination_path);
  END IF;
  FOR lock_path IN
    SELECT DISTINCT candidate
    FROM unnest(lock_paths) AS candidate
    WHERE candidate IS NOT NULL
    ORDER BY candidate
  LOOP
    PERFORM pg_advisory_xact_lock(
      hashtext('cwt:redirect-graph:' || lock_path)
    );
  END LOOP;
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
  IF NEW.is_active AND EXISTS (
    SELECT 1
    FROM redirects r
    WHERE r.is_active = true
      AND r.source_path = NEW.destination_path
      AND (TG_OP = 'INSERT' OR r.id <> NEW.id)
  ) THEN
    RAISE EXCEPTION 'Redirect destination would create a chain: %', NEW.destination_path
      USING ERRCODE = '23514';
  END IF;
  IF NEW.is_active AND EXISTS (
    SELECT 1
    FROM redirects r
    WHERE r.is_active = true
      AND r.destination_path = NEW.source_path
      AND (TG_OP = 'INSERT' OR r.id <> NEW.id)
  ) THEN
    RAISE EXCEPTION 'Redirect source would extend an existing chain: %', NEW.source_path
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
$$;
