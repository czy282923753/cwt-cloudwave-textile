-- Direct Route deletion must participate in the same endpoint-lock namespace as
-- Route/Redirect writes. The application remains the only graph mutation authority.
CREATE OR REPLACE FUNCTION cwt_assert_route_path_available()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  lock_path text;
  lock_paths text[];
BEGIN
  IF TG_OP = 'DELETE' THEN
    lock_paths := ARRAY[OLD.path];
  ELSE
    lock_paths := ARRAY[NEW.path];
    IF TG_OP = 'UPDATE' THEN
      lock_paths := array_append(lock_paths, OLD.path);
    END IF;
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

  IF TG_OP <> 'DELETE' AND NEW.is_current AND EXISTS (
    SELECT 1 FROM redirects WHERE source_path = NEW.path AND is_active = true
  ) THEN
    RAISE EXCEPTION 'Current route path conflicts with active redirect source: %', NEW.path
      USING ERRCODE = '23505';
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;--> statement-breakpoint

DROP TRIGGER IF EXISTS cwt_route_path_guard ON routes;--> statement-breakpoint
CREATE TRIGGER cwt_route_path_guard
BEFORE INSERT OR DELETE OR UPDATE OF path, is_current ON routes
FOR EACH ROW EXECUTE FUNCTION cwt_assert_route_path_available();--> statement-breakpoint

-- Constraint triggers inspect the transaction's final graph. Intermediate Route
-- moves may be temporarily inconsistent while inbound Redirects are flattened.
CREATE OR REPLACE FUNCTION cwt_assert_redirect_graph_final_state()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  affected_paths text[];
  invalid_source text;
  invalid_destination text;
BEGIN
  IF TG_TABLE_NAME = 'routes' THEN
    IF TG_OP = 'INSERT' THEN
      affected_paths := ARRAY[NEW.path];
    ELSIF TG_OP = 'DELETE' THEN
      affected_paths := ARRAY[OLD.path];
    ELSE
      affected_paths := ARRAY[OLD.path, NEW.path];
    END IF;
  ELSE
    IF TG_OP = 'INSERT' THEN
      affected_paths := ARRAY[NEW.source_path, NEW.destination_path];
    ELSIF TG_OP = 'DELETE' THEN
      affected_paths := ARRAY[OLD.source_path, OLD.destination_path];
    ELSE
      affected_paths := ARRAY[
        OLD.source_path,
        OLD.destination_path,
        NEW.source_path,
        NEW.destination_path
      ];
    END IF;
  END IF;

  SELECT candidate.source_path, candidate.destination_path
  INTO invalid_source, invalid_destination
  FROM redirects AS candidate
  WHERE candidate.is_active = true
    AND (
      candidate.source_path = ANY(affected_paths)
      OR candidate.destination_path = ANY(affected_paths)
    )
    AND (
      EXISTS (
        SELECT 1
        FROM routes AS source_route
        WHERE source_route.path = candidate.source_path
          AND source_route.is_current = true
      )
      OR NOT EXISTS (
        SELECT 1
        FROM routes AS destination_route
        WHERE destination_route.path = candidate.destination_path
          AND destination_route.is_current = true
      )
      OR EXISTS (
        SELECT 1
        FROM redirects AS downstream
        WHERE downstream.source_path = candidate.destination_path
          AND downstream.is_active = true
      )
    )
  LIMIT 1;

  IF FOUND THEN
    RAISE EXCEPTION 'Redirect graph final state is invalid for edge % -> %',
      invalid_source, invalid_destination
      USING ERRCODE = '23514';
  END IF;

  RETURN NULL;
END;
$$;--> statement-breakpoint

CREATE CONSTRAINT TRIGGER cwt_route_graph_final_guard
AFTER INSERT OR DELETE OR UPDATE OF path, is_current ON routes
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION cwt_assert_redirect_graph_final_state();--> statement-breakpoint

CREATE CONSTRAINT TRIGGER cwt_redirect_graph_final_guard
AFTER INSERT OR DELETE OR UPDATE OF source_path, destination_path, is_active ON redirects
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION cwt_assert_redirect_graph_final_state();--> statement-breakpoint

-- Refuse to install the guard over an already-invalid graph. This is a one-time
-- migration check; normal writes use the affected-path constraint triggers above.
DO $$
DECLARE
  invalid_source text;
  invalid_destination text;
BEGIN
  SELECT candidate.source_path, candidate.destination_path
  INTO invalid_source, invalid_destination
  FROM redirects AS candidate
  WHERE candidate.is_active = true
    AND (
      EXISTS (
        SELECT 1
        FROM routes AS source_route
        WHERE source_route.path = candidate.source_path
          AND source_route.is_current = true
      )
      OR NOT EXISTS (
        SELECT 1
        FROM routes AS destination_route
        WHERE destination_route.path = candidate.destination_path
          AND destination_route.is_current = true
      )
      OR EXISTS (
        SELECT 1
        FROM redirects AS downstream
        WHERE downstream.source_path = candidate.destination_path
          AND downstream.is_active = true
      )
    )
  LIMIT 1;

  IF FOUND THEN
    RAISE EXCEPTION 'Cannot install Redirect final-state guard over invalid edge % -> %',
      invalid_source, invalid_destination
      USING ERRCODE = '23514';
  END IF;
END;
$$;
