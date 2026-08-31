#!/bin/sh
set -eu

environment=${1:-}
shift || true
case "$environment" in
  production|staging) ;;
  *) echo "Refusing unknown scheduler environment." >&2; exit 64 ;;
esac
test "$#" -gt 0 || { echo "Missing one-shot command." >&2; exit 64; }
lock_directory="/tmp/cwt-${environment}-one-shot.lock"
if ! mkdir "$lock_directory" 2>/dev/null; then
  echo "Another ${environment} one-shot is active." >&2
  exit 75
fi
trap 'rmdir "$lock_directory"' EXIT HUP INT TERM
"$@"
