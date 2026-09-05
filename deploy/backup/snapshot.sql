\set ON_ERROR_STOP on
BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY;
SELECT pg_export_snapshot() AS snapshot \gset
\setenv CWT_BACKUP_SNAPSHOT :snapshot
\o objects.jsonl
\i :objects_sql
\o
\! "$CWT_BACKUP_BIN/snapshot-copy"
\if :SHELL_ERROR
  -- A failed shell copy must fail the parent instead of committing a false set.
  SELECT 1 / 0;
\endif
COMMIT;
