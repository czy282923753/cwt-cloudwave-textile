#!/usr/bin/bash

set -euo pipefail
set +x

readonly CWT_RUNNER_ROOT="/opt/cwt-actions-runner"
readonly CWT_EXPECTED_REPOSITORY="czy282923753/cwt-cloudwave-textile"
readonly CWT_EXPECTED_EXECUTION_USER="ubuntu"
readonly CWT_NONCE_PATTERN='^[0-9a-f]{32}$'
readonly CWT_TOKEN_PATTERN='^[A-Za-z0-9_-]+$'

cwt_registration_refuse() {
  printf 'CWT_RUNNER_START_NOT_PASS reason=%s\n' "$1" >&2
  return 70
}

cwt_validate_nonsecret_registration_inputs() {
  local runner_nonce="$1"
  local runner_name="$2"
  local github_repository="$3"

  [[ "$runner_nonce" =~ $CWT_NONCE_PATTERN ]] || cwt_registration_refuse "runner_nonce_invalid"
  [[ "$runner_name" == "cwt-tencent-sg-${runner_nonce}" ]] || cwt_registration_refuse "runner_name_invalid"
  [[ "$github_repository" == "$CWT_EXPECTED_REPOSITORY" ]] || cwt_registration_refuse "github_repository_invalid"
}

cwt_registration_for_identity() {
  local runner_root="$1"
  local actual_user="$2"
  local actual_uid="$3"
  local expected_uid="$4"

  [[ "$actual_user" == "$CWT_EXPECTED_EXECUTION_USER" && "$actual_uid" != "0" && "$actual_uid" == "$expected_uid" ]] || \
    cwt_registration_refuse "execution_user_invalid"
  cwt_registration_main "$runner_root"
}

cwt_launch_runner() {
  local runner_root="$1"
  local runner_pid

  /usr/bin/nohup /usr/bin/env -u CWT_REGISTRATION_TOKEN \
    "$runner_root/run.sh" \
    </dev/null >/dev/null 2>&1 &
  runner_pid="$!"
  /bin/sleep 1
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
  [[ "${#registration_token}" -ge 20 && "${#registration_token}" -le 256 && "$registration_token" =~ $CWT_TOKEN_PATTERN ]] || \
    cwt_registration_refuse "registration_token_invalid"
  cwt_validate_nonsecret_registration_inputs "$runner_nonce" "$runner_name" "$github_repository"
  [[ -d "$runner_root" && ! -L "$runner_root" && -x "$runner_root/config.sh" && -x "$runner_root/run.sh" ]] || \
    cwt_registration_refuse "runner_installation_invalid"

  runner_labels="cwt-tencent-singapore,cwt-single-use,cwt-job-${runner_nonce}"
  if ! "$runner_root/config.sh" \
    --unattended \
    --url "https://github.com/${github_repository}" \
    --token "$registration_token" \
    --name "$runner_name" \
    --labels "$runner_labels" \
    --work _work \
    --ephemeral \
    --disableupdate \
    --replace \
    >/dev/null 2>&1; then
    cwt_registration_refuse "runner_registration_failed"
    return
  fi

  registration_token=""
  unset registration_token
  [[ -z "${CWT_REGISTRATION_TOKEN+x}" ]] || cwt_registration_refuse "registration_token_still_exported"
  [[ -f "$runner_root/.runner" && ! -L "$runner_root/.runner" ]] || \
    cwt_registration_refuse "runner_registration_state_absent"
  cwt_launch_runner "$runner_root"

  printf 'CWT_RUNNER_STARTED name=%s labels=%s\n' "$runner_name" "$runner_labels"
}

cwt_main() {
  local actual_user
  local actual_uid
  local expected_uid

  [[ "$#" -eq 0 ]] || cwt_registration_refuse "arguments_forbidden"
  actual_user="$(/usr/bin/id -un)" || cwt_registration_refuse "execution_user_unavailable"
  actual_uid="$(/usr/bin/id -u)" || cwt_registration_refuse "execution_user_unavailable"
  expected_uid="$(/usr/bin/id -u "$CWT_EXPECTED_EXECUTION_USER")" || cwt_registration_refuse "execution_user_unavailable"
  cwt_registration_for_identity "$CWT_RUNNER_ROOT" "$actual_user" "$actual_uid" "$expected_uid"
}

if [[ "${BASH_SOURCE[0]}" == "$0" ]]; then
  cwt_main "$@"
fi
