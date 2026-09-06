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
      BACKUP_WORK_ROOT="/srv/cwt/backups/sets/$BACKUP_ENVIRONMENT"
      BACKUP_LOCK_FILE=/run/cwt/backup-migration.lock
      PUBLIC_STORAGE_ROOT="/srv/cwt/$BACKUP_ENVIRONMENT/media/public"
      PRIVATE_STORAGE_ROOT="/srv/cwt/$BACKUP_ENVIRONMENT/media/private-inquiries"
      test "${DATABASE_URL_FILE:-}" = "/run/secrets/$BACKUP_ENVIRONMENT-database-url" || refuse credential-boundary
      ;;
    synthetic)
      BACKUP_ENVIRONMENT=synthetic
      case "${APP_ENV:-}" in test|local) ;; *) refuse synthetic-environment ;; esac
      : "${BACKUP_ROOT:?BACKUP_ROOT is required}"
      BACKUP_WORK_ROOT=${BACKUP_WORK_ROOT:-$BACKUP_ROOT-sets}
      : "${BACKUP_LOCK_FILE:?An existing shared maintenance mutex is required}"
      ;;
    *) refuse environment ;;
  esac
  export BACKUP_ENVIRONMENT BACKUP_ROOT BACKUP_WORK_ROOT BACKUP_LOCK_FILE PUBLIC_STORAGE_ROOT PRIVATE_STORAGE_ROOT
  node "$backup_bin/files.mjs" roots
  mkdir -p "$BACKUP_ROOT/daily" "$BACKUP_ROOT/pre-deploy" "$BACKUP_WORK_ROOT"
}
postgres_tools() {
  pg_dump --version | grep -Eq 'PostgreSQL\) 18\.' || refuse pg-dump-major
  pg_restore --version | grep -Eq 'PostgreSQL\) 18\.' || refuse pg-restore-major
  export PGCONNECT_TIMEOUT=10
}
source_database() {
  postgres_tools
  test "$(node "$backup_bin/database-run.mjs" psql -XAtq -v ON_ERROR_STOP=1 -c 'SHOW server_version_num' 2>/dev/null | cut -c1-2)" = 18 || refuse database-major
}
lock_backup() {
  test -f "$BACKUP_LOCK_FILE" || refuse maintenance-mutex-file
  # Reuse an inherited pre-deploy descriptor, otherwise open the same host inode.
  if ! test /proc/self/fd/8 -ef "$BACKUP_LOCK_FILE" 2>/dev/null; then
    exec 8<"$BACKUP_LOCK_FILE"
  fi
  flock -n -E 75 8 || { echo 'Backup/Migration operation already active.' >&2; exit 75; }
}
restic_repository() {
  restic version | grep -q '^restic 0.19.1 ' || refuse restic-version
  RESTIC_REPOSITORY=$(node "$backup_bin/repository.mjs") || refuse repository-boundary
  export RESTIC_REPOSITORY RESTIC_PASSWORD_FILE="${BACKUP_REPOSITORY_PASSWORD_FILE:?Backup password file is required}"
  export RESTIC_CACHE_DIR="$BACKUP_WORK_ROOT/.restic-cache"
}
