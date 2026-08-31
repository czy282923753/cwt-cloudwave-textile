#!/usr/bin/bash-static -p

[[ $- == *p* && ${UID:-1} -eq 0 && ${EUID:-1} -eq 0 && ${GID:-1} -eq 0 && ${EGID:-1} -eq 0 && $# -eq 0 ]] || exit 65
while IFS= read -r -d '' cwt_entry; do
  cwt_name=${cwt_entry%%=*}
  cwt_value=${cwt_entry#*=}
  case "$cwt_name" in
    LD_*|GCONV_PATH|LOCPATH|BASH_ENV|ENV|SHELLOPTS|BASHOPTS|CDPATH|GLOBIGNORE|BASH_FUNC_*|DOCKER_*|COMPOSE_*)
      [[ -z $cwt_value ]] || exit 65
      ;;
  esac
done < /proc/self/environ
unalias -a
hash -r
unset CDPATH GLOBIGNORE BASH_ENV ENV
export -n SHELLOPTS BASHOPTS 2>/dev/null || true
IFS=$' \t\n'
set -Eeuo pipefail
umask 077
PATH=/usr/sbin:/usr/bin:/sbin:/bin
HOME=/root
LANG=C
LC_ALL=C
TZ=UTC
export PATH HOME LANG LC_ALL TZ
readonly PATH HOME LANG LC_ALL TZ

[[ $(/usr/bin/id -u 9>&-) == 0 && $(/usr/bin/id -g 9>&-) == 0 ]] || exit 66
[[ -d /run/lock/cwt && ! -L /run/lock/cwt ]] || exit 67
exec 9<>/run/lock/cwt/staging-start.lock
/usr/bin/flock --exclusive --nonblock 9 || exit 81

/usr/bin/node /usr/local/libexec/cwt/preflight-compose-graph.mjs --protected-pre-start 9>&-

cwt_pending_status=0
cwt_signal() {
  [[ $cwt_pending_status -ne 0 ]] || cwt_pending_status=$1
  printf 'CWT Staging signal deferred until the single lifecycle action settles.\n' >&2
}
trap 'cwt_signal 130' INT
trap 'cwt_signal 143' TERM
trap 'cwt_signal 129' HUP

set -m
/usr/bin/env -i PATH=/usr/sbin:/usr/bin:/sbin:/bin HOME=/root LANG=C LC_ALL=C TZ=UTC DOCKER_API_VERSION=1.55 \
  /usr/bin/docker --config /etc/cwt/docker-cli --host unix:///run/docker.sock \
  compose --env-file /etc/cwt/compose.env --project-name cwt \
  --file /etc/cwt/compose.yaml --profile staging \
  up --detach --wait --wait-timeout 120 --no-deps \
  web-staging worker-staging scheduler-staging valkey-staging &
cwt_lifecycle_pid=$!
set +m
cwt_child_status=0
while true; do
  wait -f "$cwt_lifecycle_pid" && cwt_child_status=0 || cwt_child_status=$?
  if kill -0 "$cwt_lifecycle_pid" 2>/dev/null; then continue; fi
  break
done

/usr/bin/node /usr/local/libexec/cwt/preflight-compose-graph.mjs --protected-post-start 9>&- || {
  [[ $cwt_child_status -ne 0 ]] || cwt_child_status=82
}
[[ $cwt_child_status -eq 0 ]] || exit "$cwt_child_status"
[[ $cwt_pending_status -eq 0 ]] || exit "$cwt_pending_status"
exit 0
