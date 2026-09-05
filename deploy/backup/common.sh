#!/bin/sh
# Shared argument, credential and tool boundary; never enable shell tracing.
set -eu
umask 077
backup_bin=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
export CWT_BACKUP_BIN="$backup_bin"
refuse() { echo "Backup operation refused: $1" >&2; exit 1; }
init_backup() {
  case "${BACKUP_ENVIRONMENT:-${APP_ENV:-}}" in
    production|staging)
      BACKUP_ENVIRONMENT=${BACKUP_ENVIRONMENT:-$APP_ENV}
      test "${APP_ENV:-}" = "$BACKUP_ENVIRONMENT" || refuse environment
      BACKUP_ROOT="/srv/cwt/backups/postgresql/$BACKUP_ENVIRONMENT"
      PUBLIC_STORAGE_ROOT="/srv/cwt/$BACKUP_ENVIRONMENT/media/public"
      PRIVATE_STORAGE_ROOT="/srv/cwt/$BACKUP_ENVIRONMENT/media/private-inquiries"
      test "${DATABASE_URL_FILE:-}" = "/run/secrets/$BACKUP_ENVIRONMENT-database-url" || refuse credential-boundary
      ;;
    synthetic)
      BACKUP_ENVIRONMENT=synthetic
      case "${APP_ENV:-}" in test|local) ;; *) refuse synthetic-environment ;; esac
      : "${BACKUP_ROOT:?BACKUP_ROOT is required}"
      ;;
    *) refuse environment ;;
  esac
  export BACKUP_ENVIRONMENT BACKUP_ROOT PUBLIC_STORAGE_ROOT PRIVATE_STORAGE_ROOT
  node "$backup_bin/files.mjs" roots
  mkdir -p "$BACKUP_ROOT/daily" "$BACKUP_ROOT/pre-deploy"
}
postgres_tools() {
  pg_dump --version | grep -Eq 'PostgreSQL\) 18\.' || refuse pg-dump-major
  pg_restore --version | grep -Eq 'PostgreSQL\) 18\.' || refuse pg-restore-major
  export PGCONNECT_TIMEOUT=10
}
source_database() {
  if test -n "${DATABASE_URL_FILE:-}"; then PGDATABASE=$(cat "$DATABASE_URL_FILE"); export PGDATABASE; fi
  postgres_tools
  test "$(psql -XAtq -v ON_ERROR_STOP=1 -c 'SHOW server_version_num' 2>/dev/null | cut -c1-2)" = 18 || refuse database-major
}
restic_local() {
  test "$BACKUP_ENVIRONMENT" = synthetic || refuse protected-offsite-integration-required
  restic version | grep -q '^restic 0.19.1 ' || refuse restic-version
  test "${RESTIC_REPOSITORY:-$BACKUP_ROOT/restic}" = "$BACKUP_ROOT/restic" || refuse repository-boundary
  # Current executable contract is local only. COS activation is separately gated.
  export RESTIC_REPOSITORY="$BACKUP_ROOT/restic" RESTIC_PASSWORD_FILE="${BACKUP_REPOSITORY_PASSWORD_FILE:?Backup password file is required}"
  export RESTIC_CACHE_DIR="$BACKUP_ROOT/.restic-cache"
}
