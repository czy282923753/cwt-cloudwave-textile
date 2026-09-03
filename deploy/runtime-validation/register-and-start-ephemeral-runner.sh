#!/usr/bin/bash

set -euo pipefail
set +x

readonly CWT_RUNNER_ROOT="/opt/cwt-actions-runner"
readonly CWT_EXPECTED_REPOSITORY="czy282923753/cwt-cloudwave-textile"
readonly CWT_NONCE_PATTERN='^[0-9a-f]{32}$'
readonly CWT_TOKEN_PATTERN='^[A-Za-z0-9_-]+$'

cwt_registration_refuse() {
  printf 'CWT_RUNNER_START_NOT_PASS reason=%s\n' "$1" >&2
  return 70
}

cwt_validate_registration_inputs() {
  local registration_token="$1"
  local runner_nonce="$2"
  local runner_name="$3"
  local github_repository="$4"

  [[ "${#registration_token}" -ge 20 && "${#registration_token}" -le 256 && "$registration_token" =~ $CWT_TOKEN_PATTERN ]] || \
    cwt_registration_refuse "registration_token_invalid"
  [[ "$runner_nonce" =~ $CWT_NONCE_PATTERN ]] || cwt_registration_refuse "runner_nonce_invalid"
  [[ "$runner_name" == "cwt-tencent-sg-${runner_nonce}" ]] || cwt_registration_refuse "runner_name_invalid"
  [[ "$github_repository" == "$CWT_EXPECTED_REPOSITORY" ]] || cwt_registration_refuse "github_repository_invalid"
}

cwt_run_as_ubuntu() {
  /usr/bin/sudo -u ubuntu -H "$@"
}

cwt_configure_runner() {
  local runner_root="$1"
  local registration_token="$2"
  local github_repository="$3"
  local runner_name="$4"
  local runner_labels="$5"

  cwt_run_as_ubuntu "$runner_root/config.sh" \
    --unattended \
    --url "https://github.com/${github_repository}" \
    --token "$registration_token" \
    --name "$runner_name" \
    --labels "$runner_labels" \
    --work _work \
    --ephemeral \
    --disableupdate
}

cwt_launch_runner() {
  local runner_root="$1"
  local runner_pid

  /usr/bin/nohup /usr/bin/env -u CWT_REGISTRATION_TOKEN \
    /usr/bin/sudo -u ubuntu -H "$runner_root/run.sh" \
    </dev/null >/dev/null 2>&1 &
  runner_pid="$!"
  /usr/bin/sleep 1
  /bin/kill -0 "$runner_pid" >/dev/null 2>&1 || cwt_registration_refuse "runner_launch_failed"
}

cwt_registration_main() {
  local runner_root="$1"
  local registration_token="${CWT_REGISTRATION_TOKEN:-}"
  local runner_nonce="${CWT_RUNNER_NONCE:-}"
  local runner_name="${CWT_RUNNER_NAME:-}"
  local github_repository="${CWT_GITHUB_REPOSITORY:-}"
  local runner_labels

  unset CWT_REGISTRATION_TOKEN
  cwt_validate_registration_inputs "$registration_token" "$runner_nonce" "$runner_name" "$github_repository"
  [[ -d "$runner_root" && ! -L "$runner_root" && -x "$runner_root/config.sh" && -x "$runner_root/run.sh" ]] || \
    cwt_registration_refuse "runner_installation_invalid"

  runner_labels="cwt-tencent-singapore,cwt-single-use,cwt-job-${runner_nonce}"
  if ! cwt_configure_runner "$runner_root" "$registration_token" "$github_repository" "$runner_name" "$runner_labels" \
    >/dev/null 2>&1; then
    cwt_registration_refuse "runner_registration_failed"
    return
  fi
  [[ -f "$runner_root/.runner" && ! -L "$runner_root/.runner" ]] || \
    cwt_registration_refuse "runner_registration_state_absent"

  registration_token=""
  unset registration_token
  [[ -z "${CWT_REGISTRATION_TOKEN+x}" ]] || cwt_registration_refuse "registration_token_still_exported"
  cwt_launch_runner "$runner_root"

  printf 'CWT_RUNNER_STARTED name=%s labels=%s\n' "$runner_name" "$runner_labels"
}

cwt_main() {
  [[ "$#" -eq 0 ]] || cwt_registration_refuse "arguments_forbidden"
  cwt_registration_main "$CWT_RUNNER_ROOT"
}

if [[ "${BASH_SOURCE[0]}" == "$0" ]]; then
  cwt_main "$@"
fi
