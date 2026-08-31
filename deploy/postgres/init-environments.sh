#!/bin/sh
set -eu

for environment in production staging; do
  username="cwt_${environment}"
  database="cwt_${environment}"
  password_file="/run/secrets/${environment}-database-password"
  test -r "$password_file" || { echo "Missing ${environment} database secret." >&2; exit 65; }
  password=$(cat "$password_file")
  test -n "$password" || { echo "Empty ${environment} database secret." >&2; exit 65; }
  psql --set=ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" \
    --set=cwt_username="$username" --set=cwt_database="$database" --set=cwt_password="$password" <<'SQL'
SELECT format('CREATE ROLE %I LOGIN PASSWORD %L', :'cwt_username', :'cwt_password') \gexec
SELECT format('CREATE DATABASE %I OWNER %I', :'cwt_database', :'cwt_username') \gexec
SQL
  unset password
done
