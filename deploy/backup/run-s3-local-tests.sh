#!/bin/sh
# Called only by the disposable lab, with SYNTHETIC files and no Provider route.
set -eu
: "${CWT_BACKUP_TEST_IMAGE:?}" "${CWT_BACKUP_MOTO_DEPS:?}" "${CWT_BACKUP_LAB_NAME:?}"
name="$CWT_BACKUP_LAB_NAME"
endpoint="$name-s3"
cleanup() { docker rm -f "$endpoint" >/dev/null 2>&1 || true; docker network rm "$endpoint" >/dev/null 2>&1 || true; }
trap cleanup EXIT
trap 'exit 1' HUP INT TERM
docker network create --internal "$endpoint" >/dev/null
docker run --pull never --rm --network none -v "$name-files:/lab" "$CWT_BACKUP_TEST_IMAGE" sh -eu -c '
  mkdir /lab/tls /lab/secrets
  openssl req -x509 -newkey rsa:2048 -nodes -days 1 -subj /CN=cos.ap-singapore.myqcloud.com -addext subjectAltName=DNS:cos.ap-singapore.myqcloud.com -keyout /lab/tls/key.pem -out /lab/tls/cert.pem >/dev/null 2>&1
  for env in production staging; do
    printf %s SYNTHETIC-ONLY-ACCESS-KEY > /lab/secrets/$env-cos-access-key-id
    printf %s SYNTHETIC-ONLY-SECRET-KEY > /lab/secrets/$env-cos-secret-key
    cp /lab/restic-password /lab/secrets/$env-backup-password
    printf %s "postgresql://cwt_source@localhost/cwt_synthetic?host=/socket" > /lab/secrets/$env-database-url
    mkdir -p /lab/protected/$env/daily /lab/protected/$env/sets
  done
  chown -R 10001:10001 /lab/tls /lab/secrets /lab/protected
  chmod 700 /lab/tls /lab/secrets
  chmod 600 /lab/tls/* /lab/secrets/*
'
docker run --pull never -d --name "$endpoint" --network "$endpoint" --network-alias cos.ap-singapore.myqcloud.com \
  -v "$CWT_BACKUP_MOTO_DEPS:/deps:ro" -v "$name-files:/lab:ro" -e PYTHONPATH=/deps -e S3_IGNORE_SUBDOMAIN_BUCKETNAME=true \
  python:3.13-slim python /deps/bin/moto_server -H 0.0.0.0 -p 443 -c /lab/tls/cert.pem -k /lab/tls/key.pem >/dev/null
attempt=0
until docker exec -e PYTHONPATH=/deps "$endpoint" python -c 'import urllib.request,ssl; urllib.request.urlopen("https://cos.ap-singapore.myqcloud.com", context=ssl.create_default_context(cafile="/lab/tls/cert.pem"), timeout=2)' >/dev/null 2>&1; do
  attempt=$((attempt+1)); test "$attempt" -le 20; sleep 1
done
docker exec -e PYTHONPATH=/deps "$endpoint" python -c 'import boto3; boto3.client("s3",endpoint_url="https://cos.ap-singapore.myqcloud.com",region_name="ap-singapore",aws_access_key_id="SYNTHETIC-ONLY-ACCESS-KEY",aws_secret_access_key="SYNTHETIC-ONLY-SECRET-KEY",verify="/lab/tls/cert.pem").create_bucket(Bucket="synthetic-backup-123456",CreateBucketConfiguration={"LocationConstraint":"ap-singapore"})' >/dev/null
for env in production staging; do
  docker run --pull never --rm --network "$endpoint" --user 10001:10001 --cap-drop ALL --security-opt no-new-privileges:true \
    -v "$PWD:/app:ro" -v "$name-socket:/socket:ro" -v "$name-files:/lab" \
    --mount "type=volume,src=$name-files,dst=/run/secrets,volume-subpath=secrets,readonly" \
    -v "$name-files:/run/cwt:ro" \
    --mount "type=volume,src=$name-files,dst=/srv/cwt/backups/postgresql/$env,volume-subpath=protected/$env/daily" \
    --mount "type=volume,src=$name-files,dst=/srv/cwt/backups/sets/$env,volume-subpath=protected/$env/sets" \
    --mount "type=volume,src=$name-files,dst=/srv/cwt/$env/media/public,volume-subpath=public,readonly" \
    --mount "type=volume,src=$name-files,dst=/srv/cwt/$env/media/private-inquiries,volume-subpath=private,readonly" \
    -e APP_ENV="$env" -e BACKUP_ENVIRONMENT="$env" -e LAB_ENV="$env" \
    -e BACKUP_COS_REPOSITORY="s3:https://cos.ap-singapore.myqcloud.com/synthetic-backup-123456/$env" \
    -e COS_ACCESS_KEY_ID_FILE="/run/secrets/$env-cos-access-key-id" -e COS_SECRET_ACCESS_KEY_FILE="/run/secrets/$env-cos-secret-key" \
    -e BACKUP_REPOSITORY_PASSWORD_FILE="/run/secrets/$env-backup-password" -e DATABASE_URL_FILE="/run/secrets/$env-database-url" \
    -e RESTIC_CACERT=/lab/tls/cert.pem "$CWT_BACKUP_TEST_IMAGE" sh -eu -c '
      # All protected-shaped mounts contain disposable Synthetic lab data only.
      export RESTIC_PASSWORD_FILE="$BACKUP_REPOSITORY_PASSWORD_FILE" RESTIC_CACHE_DIR="/lab/protected/$LAB_ENV/sets/.restic-cache"
      /app/deploy/backup/restic-run init --quiet
      /app/deploy/backup/backup-weekly
      /app/deploy/backup/restic-run snapshots --json > /lab/protected/$LAB_ENV/snapshots.json
      node -e '\''const fs=require("fs"); const v=JSON.parse(fs.readFileSync("/lab/protected/"+process.env.LAB_ENV+"/snapshots.json")); if(v.length!==1 || v[0].hostname!=="cwt-"+process.env.LAB_ENV)process.exit(1)'\''
    '
done
echo 'Protected repository branch passed against isolated local TLS/S3 fixtures for both environments.'
