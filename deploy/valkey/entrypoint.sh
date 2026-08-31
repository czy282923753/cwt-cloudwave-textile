#!/bin/sh
set -eu

environment=${1:-}
case "$environment" in
  production|staging) ;;
  *) echo "Refusing unknown Valkey environment." >&2; exit 64 ;;
esac
secret="/run/secrets/${environment}-valkey-password"
test -r "$secret" || { echo "Valkey secret is unavailable." >&2; exit 65; }
password=$(cat "$secret")
test -n "$password" || { echo "Valkey secret is empty." >&2; exit 65; }
case "$password" in *[!A-Za-z0-9_.,:@%+=-]*) echo "Valkey secret contains an unsupported ACL byte." >&2; exit 65;; esac
mkdir -p /tmp/valkey
umask 077
cat > /tmp/valkey/users.acl <<EOF
user default off resetpass >${password} resetkeys ~* resetchannels &* -@all
user cwt-${environment} on >${password} resetkeys ~cwt:${environment}:rate:* resetchannels -@all +ping +client|setname +script|load +evalsha +incr +pexpire +pttl
EOF
unset password
exec valkey-server --protected-mode yes --aclfile /tmp/valkey/users.acl --save '' --appendonly no --maxmemory 64mb --maxmemory-policy noeviction --bind 0.0.0.0
