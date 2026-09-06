#!/bin/sh
# Temporary Synthetic PostgreSQL; public tool downloads belong to setup, not restore.
set -eu
: "${CWT_BACKUP_TEST_IMAGE:?Build the local test-tools image documented in README.md}"
: "${CWT_BACKUP_TEST_DEPS:?Prepare the Linux node_modules volume documented in README.md}"
name="cwt-backup-lab-$$"
cleanup() {
  docker rm -f "$name" >/dev/null 2>&1 || true
  docker volume rm "$name-socket" "$name-data" "$name-files" >/dev/null 2>&1 || true
}
trap cleanup EXIT
trap 'exit 1' HUP INT TERM
for suffix in socket data files; do docker volume create "$name-$suffix" >/dev/null; done
docker run --pull never --rm --network none -v "$name-socket:/socket" -v "$name-files:/lab" "$CWT_BACKUP_TEST_IMAGE" sh -c 'chmod 1777 /socket; chown 10001:10001 /lab; chmod 700 /lab'
docker run --pull never -d --name "$name" --network none -e POSTGRES_HOST_AUTH_METHOD=trust -v "$name-socket:/var/run/postgresql" -v "$name-data:/var/lib/postgresql" "$CWT_BACKUP_TEST_IMAGE" postgres -c listen_addresses= >/dev/null
attempt=0
until docker exec -e PGHOST=/var/run/postgresql -e PGUSER=postgres "$name" sh -c 'test "$(cat /proc/1/comm)" = postgres && pg_isready -q' 2>/dev/null; do
  if test "$(docker inspect --format '{{.State.Running}}' "$name")" != true; then docker logs "$name"; exit 1; fi
  attempt=$((attempt + 1)); test "$attempt" -le 30; sleep 1
done
docker exec -i -e PGHOST=/var/run/postgresql -e PGUSER=postgres "$name" psql -Xq -v ON_ERROR_STOP=1 <<'SQL'
CREATE ROLE cwt_source LOGIN;
CREATE DATABASE cwt_synthetic OWNER cwt_source;
CREATE ROLE cwt_restore LOGIN;
CREATE DATABASE cwt_restore_valid OWNER cwt_restore;
SQL
docker run --pull never --rm --network none --user 10001:10001 --cap-drop ALL --security-opt no-new-privileges:true \
  -v "$PWD:/app:ro" -v "$CWT_BACKUP_TEST_DEPS:/app/node_modules:ro" \
  -v "$name-socket:/socket:ro" -v "$name-files:/lab" -w /app \
  "$CWT_BACKUP_TEST_IMAGE" node --test deploy/backup/integration.test.mjs
# A separate network-enabled client must fail before touching an empty target.
docker run --pull never --rm --network none -v "$name-files:/lab" "$CWT_BACKUP_TEST_IMAGE" sh -c 'mkdir /lab/network-negative; chown 10001:10001 /lab/network-negative'
if docker run --pull never --rm --user 10001:10001 -e PGHOST=/socket -e PGUSER=cwt_restore -e PGDATABASE=cwt_restore_valid \
  -v "$PWD:/app:ro" -v "$name-socket:/socket:ro" -v "$name-files:/lab" \
  "$CWT_BACKUP_TEST_IMAGE" /app/deploy/backup/restore-empty /lab/export/lab/backups-sets/.weekly-work /lab/network-negative; then
  echo 'Networked restore should have refused.' >&2; exit 1
fi
if test -n "${CWT_BACKUP_MOTO_DEPS:-}"; then
  export CWT_BACKUP_LAB_NAME="$name"
  deploy/backup/run-s3-local-tests.sh
fi
echo 'Local backup/restore lab passed; temporary containers and volumes will be removed.'
