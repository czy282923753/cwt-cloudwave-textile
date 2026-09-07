#!/usr/bin/bash

readonly CWT_DOCKER_ENGINE_VERSION="29.6.2"
readonly CWT_DOCKER_COMPOSE_VERSION="5.3.1"
readonly CWT_RUNNER_VERSION="2.337.0"

readonly CWT_DOCKER_CE_PACKAGE_VERSION="5:29.6.2-1~ubuntu.24.04~noble"
readonly CWT_DOCKER_CLI_PACKAGE_VERSION="5:29.6.2-1~ubuntu.24.04~noble"
readonly CWT_DOCKER_COMPOSE_PACKAGE_VERSION="5.3.1-1~ubuntu.24.04~noble"
readonly CWT_CONTAINERD_PACKAGE_VERSION="2.3.4-1~ubuntu.24.04~noble"

readonly CWT_RUNNER_ARCHIVE_SHA256="70920811a4f8ad4328818682bca5c6469c1c942fab52448868071d0063816613"
readonly CWT_RUNNER_ARCHIVE_URL="https://github.com/actions/runner/releases/download/v${CWT_RUNNER_VERSION}/actions-runner-linux-x64-${CWT_RUNNER_VERSION}.tar.gz"
readonly CWT_DOCKER_SIGNING_KEY_URL="https://download.docker.com/linux/ubuntu/gpg"
readonly CWT_DOCKER_KEY_DOWNLOAD_MAX_TIME_SECONDS="60"
readonly CWT_PUBLIC_DOWNLOAD_CONNECT_TIMEOUT_SECONDS="15"
readonly CWT_RUNNER_DOWNLOAD_MAX_TIME_SECONDS="390"
readonly CWT_PUBLIC_DOWNLOAD_RETRY_COUNT="2"
readonly CWT_PUBLIC_DOWNLOAD_RETRY_DELAY_SECONDS="2"
readonly CWT_PUBLIC_DOWNLOAD_RETRY_MAX_TIME_SECONDS="45"
readonly CWT_APT_RETRY_COUNT="2"
readonly CWT_APT_HTTP_TIMEOUT_SECONDS="30"
readonly CWT_APT_HTTPS_TIMEOUT_SECONDS="30"
readonly CWT_RUNNER_ROOT="/opt/cwt-actions-runner"
readonly CWT_FAILURE_DIAGNOSTIC_TAIL_BYTES=4096
CWT_APT_POLICY_PATH=""
CWT_HOST_PREPARATION_MODE=""
CWT_PROVISION_OWNS_RUNNER_ROOT=0
CWT_PROVISION_WORK_ROOT=""
CWT_PROVISION_LOG=""
CWT_PROVISION_LOG_ACTIVE=0

cwt_trim_space() {
  local value="$1"
  value="${value#"${value%%[![:space:]]*}"}"
  value="${value%"${value##*[![:space:]]}"}"
  CWT_TRIMMED="$value"
}

select_exact_package_version() {
  local expected_package="$1"
  local expected_version="$2"
  local catalog="$3"
  local line separators package_field version_field source_field extra_field
  local selected=""
  local matches=0

  while IFS= read -r line || [[ -n "$line" ]]; do
    [[ -z "$line" ]] && continue

    separators="${line//[^|]/}"
    if [[ "${#separators}" -ne 2 ]]; then
      printf 'CWT_PROVISION_NOT_PASS reason=malformed_package_catalog package=%s\n' "$expected_package" >&2
      return 64
    fi

    package_field=""
    version_field=""
    source_field=""
    extra_field=""
    IFS='|' read -r package_field version_field source_field extra_field <<<"$line"

    cwt_trim_space "$package_field"
    package_field="$CWT_TRIMMED"
    cwt_trim_space "$version_field"
    version_field="$CWT_TRIMMED"
    cwt_trim_space "$source_field"
    source_field="$CWT_TRIMMED"
    cwt_trim_space "$extra_field"
    extra_field="$CWT_TRIMMED"

    if [[ -z "$package_field" || -z "$version_field" || -z "$source_field" || -n "$extra_field" ]]; then
      printf 'CWT_PROVISION_NOT_PASS reason=malformed_package_catalog package=%s\n' "$expected_package" >&2
      return 64
    fi
    if [[ "$package_field" != "$expected_package" ]]; then
      printf 'CWT_PROVISION_NOT_PASS reason=wrong_package_catalog package=%s\n' "$expected_package" >&2
      return 64
    fi
    if [[ "$version_field" == "$expected_version" ]]; then
      selected="$version_field"
      matches=$((matches + 1))
    fi
  done <<<"$catalog"

  if [[ "$matches" -ne 1 || "$selected" != "$expected_version" ]]; then
    printf 'CWT_PROVISION_NOT_PASS reason=package_version_not_unique package=%s matches=%s\n' "$expected_package" "$matches" >&2
    return 65
  fi

  printf '%s\n' "$selected"
}

cwt_resolve_package_version() {
  local package="$1"
  local expected_version="$2"
  local catalog

  catalog="$(apt-cache madison "$package")"
  select_exact_package_version "$package" "$expected_version" "$catalog"
}

cwt_refuse() {
  printf 'CWT_PROVISION_NOT_PASS reason=%s\n' "$1" >&2
  return "${2:-66}"
}

cwt_validate_invocation() {
  local conflicting_package status

  [[ "$EUID" -eq 0 ]] || {
    cwt_refuse "root_required"
    return
  }
  [[ "$#" -eq 0 ]] || {
    cwt_refuse "arguments_forbidden" 64
    return
  }
  [[ -r /etc/os-release ]] || {
    cwt_refuse "os_release_missing"
    return
  }

  # shellcheck disable=SC1091
  source /etc/os-release
  [[ "${ID:-}" == "ubuntu" && "${VERSION_ID:-}" == "24.04" ]] || {
    cwt_refuse "unsupported_os"
    return
  }
  [[ "$(dpkg --print-architecture)" == "amd64" && "$(uname -m)" == "x86_64" ]] || {
    cwt_refuse "unsupported_architecture"
    return
  }
  id ubuntu >/dev/null 2>&1 || {
    cwt_refuse "ubuntu_user_missing"
    return
  }

  for conflicting_package in docker.io docker-compose docker-compose-v2 podman-docker containerd runc; do
    status="$(dpkg-query -W -f='${Status}' "$conflicting_package" 2>/dev/null || true)"
    [[ "$status" != "install ok installed" ]] || {
      printf 'CWT_PROVISION_NOT_PASS reason=conflicting_package package=%s\n' "$conflicting_package" >&2
      return 66
    }
  done
}

cwt_create_apt_acquisition_policy() {
  [[ -z "${CWT_APT_POLICY_PATH:-}" ]] || cwt_refuse "apt_policy_already_active" 68
  CWT_APT_POLICY_PATH="$(mktemp /tmp/cwt-runner-apt-policy.XXXXXX)"
  [[ "$CWT_APT_POLICY_PATH" == /tmp/cwt-runner-apt-policy.* && ! -L "$CWT_APT_POLICY_PATH" ]] || \
    cwt_refuse "apt_policy_path_invalid" 68
  chmod 0600 "$CWT_APT_POLICY_PATH"
  printf '%s\n' \
    "Acquire::Retries \"${CWT_APT_RETRY_COUNT}\";" \
    "Acquire::http::Timeout \"${CWT_APT_HTTP_TIMEOUT_SECONDS}\";" \
    "Acquire::https::Timeout \"${CWT_APT_HTTPS_TIMEOUT_SECONDS}\";" \
    >"$CWT_APT_POLICY_PATH"
  export APT_CONFIG="$CWT_APT_POLICY_PATH"
}

cwt_remove_apt_acquisition_policy() {
  local policy_path="${CWT_APT_POLICY_PATH:-}"

  if [[ -n "$policy_path" ]]; then
    [[ "$policy_path" == /tmp/cwt-runner-apt-policy.* && -f "$policy_path" && ! -L "$policy_path" ]] || {
      unset APT_CONFIG
      CWT_APT_POLICY_PATH=""
      cwt_refuse "apt_policy_cleanup_path_invalid" 68
      return
    }
    rm -f -- "$policy_path" || {
      unset APT_CONFIG
      CWT_APT_POLICY_PATH=""
      cwt_refuse "apt_policy_cleanup_failed" 68
      return
    }
    [[ ! -e "$policy_path" && ! -L "$policy_path" ]] || {
      unset APT_CONFIG
      CWT_APT_POLICY_PATH=""
      cwt_refuse "apt_policy_cleanup_failed" 68
      return
    }
  fi
  unset APT_CONFIG
  CWT_APT_POLICY_PATH=""
}

cwt_package_identity() {
  dpkg-query -W -f='${Status}|${Version}' "$1" 2>/dev/null || true
}

cwt_classify_docker_installation() {
  local identity package expected_version
  local present=0
  local exact=0

  while IFS='|' read -r package expected_version; do
    identity="$(cwt_package_identity "$package")"
    if [[ -n "$identity" ]]; then
      present=$((present + 1))
      [[ "$identity" == "install ok installed|${expected_version}" ]] || {
        CWT_DOCKER_INSTALLATION_STATE="mixed"
        return 0
      }
      exact=$((exact + 1))
    fi
  done <<EOF
docker-ce|${CWT_DOCKER_CE_PACKAGE_VERSION}
docker-ce-cli|${CWT_DOCKER_CLI_PACKAGE_VERSION}
docker-compose-plugin|${CWT_DOCKER_COMPOSE_PACKAGE_VERSION}
containerd.io|${CWT_CONTAINERD_PACKAGE_VERSION}
EOF

  if [[ "$present" -eq 0 ]]; then
    CWT_DOCKER_INSTALLATION_STATE="absent"
  elif [[ "$exact" -eq 4 ]]; then
    CWT_DOCKER_INSTALLATION_STATE="exact"
  else
    CWT_DOCKER_INSTALLATION_STATE="mixed"
  fi
}

cwt_list_runner_processes() {
  local executable process_executable

  for executable in /proc/[0-9]*/exe; do
    process_executable="$(readlink -f "$executable" 2>/dev/null || true)"
    case "$process_executable" in
      "$CWT_RUNNER_ROOT/bin/Runner.Listener"|"$CWT_RUNNER_ROOT/bin/Runner.Listener (deleted)"|\
      "$CWT_RUNNER_ROOT/bin/Runner.Worker"|"$CWT_RUNNER_ROOT/bin/Runner.Worker (deleted)")
        printf '%s\n' "$process_executable"
        ;;
    esac
  done
}

cwt_runner_is_active() {
  local process

  while IFS= read -r process; do
    [[ -z "$process" ]] || return 0
  done < <(cwt_list_runner_processes)
  return 1
}

cwt_recovery_path_exists() {
  [[ -e "$1" || -L "$1" ]]
}

cwt_require_no_recovery_residue() {
  local compose_project network_name path
  local containers networks

  containers="$(docker ps -aq)"
  [[ -z "$containers" ]] || {
    cwt_refuse "docker_container_residue"
    return
  }

  networks="$(docker network ls --format '{{.Label "com.docker.compose.project"}}|{{.Name}}')"
  while IFS='|' read -r compose_project network_name; do
    [[ -z "$compose_project" && -z "$network_name" ]] && continue
    case "$compose_project" in [cC][wW][tT]|[cC][wW][tT]-*|[cC][wW][tT]_*) cwt_refuse "cwt_network_residue"; return ;; esac
    case "$network_name" in [cC][wW][tT]|[cC][wW][tT]-*|[cC][wW][tT]_*) cwt_refuse "cwt_network_residue"; return ;; esac
  done <<<"$networks"

  for path in \
    /etc/cwt \
    /srv/cwt \
    /run/lock/cwt \
    "$CWT_RUNNER_ROOT/_work/_temp/cwt-ghcr-auth" \
    "$CWT_RUNNER_ROOT/_work/_temp/cwt-runtime-subject.oci" \
    "$CWT_RUNNER_ROOT/_work/_temp/cwt-runtime-outcome"; do
    if cwt_recovery_path_exists "$path"; then
      cwt_refuse "recovery_private_or_runtime_residue"
      return
    fi
  done
}

cwt_list_mount_targets() {
  findmnt --raw --noheadings --output TARGET
}

cwt_require_runner_root_unmounted() {
  local mount_target mount_targets

  mount_targets="$(cwt_list_mount_targets)" || {
    cwt_refuse "runner_mount_state_unavailable"
    return
  }
  while IFS= read -r mount_target; do
    case "$mount_target" in
      "$CWT_RUNNER_ROOT"|"$CWT_RUNNER_ROOT"/*)
        cwt_refuse "runner_root_mount_present"
        return
        ;;
    esac
  done <<<"$mount_targets"
}

cwt_remove_inactive_runner_root() {
  [[ "$CWT_RUNNER_ROOT" == "/opt/cwt-actions-runner" ]] || {
    cwt_refuse "runner_root_identity_invalid"
    return
  }
  if [[ ! -e "$CWT_RUNNER_ROOT" && ! -L "$CWT_RUNNER_ROOT" ]]; then
    return 0
  fi
  [[ -d "$CWT_RUNNER_ROOT" && ! -L "$CWT_RUNNER_ROOT" ]] || {
    cwt_refuse "runner_root_type_invalid"
    return
  }
  if cwt_runner_is_active; then
    cwt_refuse "runner_process_active"
    return
  fi
  cwt_require_runner_root_unmounted
  rm -rf -- "$CWT_RUNNER_ROOT" || {
    cwt_refuse "runner_root_cleanup_failed" 68
    return
  }
  [[ ! -e "$CWT_RUNNER_ROOT" && ! -L "$CWT_RUNNER_ROOT" ]] || cwt_refuse "runner_root_cleanup_failed" 68
}

cwt_create_owned_runner_root() {
  [[ ! -e "$CWT_RUNNER_ROOT" && ! -L "$CWT_RUNNER_ROOT" ]] || {
    cwt_refuse "runner_root_creation_collision" 68
    return
  }
  CWT_PROVISION_OWNS_RUNNER_ROOT=1
  install -d -m 0755 "$CWT_RUNNER_ROOT"
  [[ -d "$CWT_RUNNER_ROOT" && ! -L "$CWT_RUNNER_ROOT" ]] || cwt_refuse "runner_root_creation_invalid" 68
}

cwt_prepare_host() {
  local fresh_state_path

  cwt_classify_docker_installation
  case "$CWT_DOCKER_INSTALLATION_STATE" in
    absent)
      [[ ! -e "$CWT_RUNNER_ROOT" && ! -L "$CWT_RUNNER_ROOT" ]] || {
        cwt_refuse "mixed_fresh_host_state"
        return
      }
      command -v docker >/dev/null 2>&1 && {
        cwt_refuse "mixed_docker_identity"
        return
      }
      for fresh_state_path in \
        /etc/apt/keyrings/docker.asc \
        /etc/apt/sources.list.d/docker.list \
        /etc/docker \
        /var/lib/containerd \
        /var/lib/docker; do
        if cwt_recovery_path_exists "$fresh_state_path"; then
          cwt_refuse "mixed_fresh_host_state"
          return
        fi
      done
      CWT_HOST_PREPARATION_MODE="fresh"
      ;;
    exact)
      [[ "$(docker version --format '{{.Client.Version}}')" == "$CWT_DOCKER_ENGINE_VERSION" &&
        "$(docker version --format '{{.Server.Version}}')" == "$CWT_DOCKER_ENGINE_VERSION" &&
        "$(docker compose version --short)" == "$CWT_DOCKER_COMPOSE_VERSION" ]] || {
        cwt_refuse "mixed_docker_identity"
        return
      }
      cwt_require_no_recovery_residue
      if [[ -e "$CWT_RUNNER_ROOT" || -L "$CWT_RUNNER_ROOT" ]]; then
        [[ -d "$CWT_RUNNER_ROOT" && ! -L "$CWT_RUNNER_ROOT" ]] || {
          cwt_refuse "runner_root_type_invalid"
          return
        }
      fi
      if cwt_runner_is_active; then
        cwt_refuse "runner_process_active"
        return
      fi
      cwt_remove_inactive_runner_root
      CWT_HOST_PREPARATION_MODE="recovery"
      ;;
    *)
      cwt_refuse "mixed_docker_installation"
      return
      ;;
  esac
}

cwt_download_public_file() {
  local url="$1"
  local output="$2"
  local max_time_seconds="$3"

  rm -f -- "$output"
  curl --fail --silent --show-error --location --proto '=https' --tlsv1.2 \
    --connect-timeout "$CWT_PUBLIC_DOWNLOAD_CONNECT_TIMEOUT_SECONDS" \
    --max-time "$max_time_seconds" \
    --retry "$CWT_PUBLIC_DOWNLOAD_RETRY_COUNT" \
    --retry-delay "$CWT_PUBLIC_DOWNLOAD_RETRY_DELAY_SECONDS" \
    --retry-max-time "$CWT_PUBLIC_DOWNLOAD_RETRY_MAX_TIME_SECONDS" \
    --retry-connrefused \
    --remove-on-error \
    "$url" \
    --output "$output"
}

cwt_install_exact_docker() {
  local docker_ce_version docker_cli_version compose_version containerd_version

  export DEBIAN_FRONTEND=noninteractive
  apt-get update
  apt-get install -y --no-install-recommends ca-certificates curl git gnupg jq sudo

  install -d -m 0755 /etc/apt/keyrings
  cwt_download_public_file \
    "$CWT_DOCKER_SIGNING_KEY_URL" \
    /etc/apt/keyrings/docker.asc \
    "$CWT_DOCKER_KEY_DOWNLOAD_MAX_TIME_SECONDS"
  chmod 0644 /etc/apt/keyrings/docker.asc
  printf '%s\n' \
    'deb [arch=amd64 signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu noble stable' \
    >/etc/apt/sources.list.d/docker.list
  apt-get update

  docker_ce_version="$(cwt_resolve_package_version docker-ce "$CWT_DOCKER_CE_PACKAGE_VERSION")"
  docker_cli_version="$(cwt_resolve_package_version docker-ce-cli "$CWT_DOCKER_CLI_PACKAGE_VERSION")"
  compose_version="$(cwt_resolve_package_version docker-compose-plugin "$CWT_DOCKER_COMPOSE_PACKAGE_VERSION")"
  containerd_version="$(cwt_resolve_package_version containerd.io "$CWT_CONTAINERD_PACKAGE_VERSION")"

  apt-get install -y --no-install-recommends \
    "containerd.io=${containerd_version}" \
    "docker-ce-cli=${docker_cli_version}" \
    "docker-ce=${docker_ce_version}" \
    "docker-compose-plugin=${compose_version}"
  systemctl enable --now docker

  [[ "$(docker version --format '{{.Client.Version}}')" == "$CWT_DOCKER_ENGINE_VERSION" ]]
  [[ "$(docker version --format '{{.Server.Version}}')" == "$CWT_DOCKER_ENGINE_VERSION" ]]
  [[ "$(docker compose version --short)" == "$CWT_DOCKER_COMPOSE_VERSION" ]]
}

cwt_download_runner_archive() {
  local url="$1"
  local expected_sha="$2"
  local archive="$3"
  local max_time_seconds="$4"
  local actual_sha

  cwt_download_public_file "$url" "$archive" "$max_time_seconds"

  actual_sha="$(sha256sum "$archive")"
  actual_sha="${actual_sha%% *}"
  [[ "$actual_sha" == "$expected_sha" ]] || {
    printf 'CWT_PROVISION_NOT_PASS reason=runner_archive_digest_mismatch\n' >&2
    return 67
  }
}

cwt_install_runner() {
  local archive ownership_drift runner_version probe docker_user_version

  CWT_PROVISION_WORK_ROOT="$(mktemp -d /tmp/cwt-runner-provision.XXXXXX)"
  [[ "$CWT_PROVISION_WORK_ROOT" == /tmp/cwt-runner-provision.* && ! -L "$CWT_PROVISION_WORK_ROOT" ]]
  archive="${CWT_PROVISION_WORK_ROOT}/actions-runner.tar.gz"

  cwt_download_runner_archive \
    "$CWT_RUNNER_ARCHIVE_URL" \
    "$CWT_RUNNER_ARCHIVE_SHA256" \
    "$archive" \
    "$CWT_RUNNER_DOWNLOAD_MAX_TIME_SECONDS"

  cwt_create_owned_runner_root
  tar -xzf "$archive" -C "$CWT_RUNNER_ROOT"
  "$CWT_RUNNER_ROOT/bin/installdependencies.sh"

  usermod -aG docker ubuntu
  chown -R ubuntu:ubuntu "$CWT_RUNNER_ROOT"
  install -d -o ubuntu -g ubuntu -m 0750 "$CWT_RUNNER_ROOT/_diag"

  ownership_drift="$(find "$CWT_RUNNER_ROOT" \( ! -user ubuntu -o ! -group ubuntu \) -print -quit)"
  [[ -z "$ownership_drift" ]] || {
    printf 'CWT_PROVISION_NOT_PASS reason=runner_tree_ownership\n' >&2
    return 67
  }

  probe="$CWT_RUNNER_ROOT/_diag/.cwt-write-probe.$$"
  sudo -u ubuntu test -w "$CWT_RUNNER_ROOT/_diag"
  sudo -u ubuntu touch "$probe"
  sudo -u ubuntu test -f "$probe"
  sudo -u ubuntu rm -- "$probe"
  [[ ! -e "$probe" ]]

  runner_version="$(sudo -u ubuntu "$CWT_RUNNER_ROOT/bin/Runner.Listener" --version)"
  [[ "$runner_version" == "$CWT_RUNNER_VERSION" ]]
  docker_user_version="$(sudo -u ubuntu -H docker version --format '{{.Server.Version}}')"
  [[ "$docker_user_version" == "$CWT_DOCKER_ENGINE_VERSION" ]]
}

cwt_cleanup() {
  local cleanup_status=0

  if [[ "${CWT_PROVISION_OWNS_RUNNER_ROOT:-0}" -eq 1 ]]; then
    if [[ ! -e "$CWT_RUNNER_ROOT" && ! -L "$CWT_RUNNER_ROOT" ]]; then
      :
    elif [[ "$CWT_RUNNER_ROOT" == "/opt/cwt-actions-runner" && -d "$CWT_RUNNER_ROOT" && ! -L "$CWT_RUNNER_ROOT" ]] && \
      ! cwt_runner_is_active && cwt_require_runner_root_unmounted; then
      rm -rf -- "$CWT_RUNNER_ROOT" || cleanup_status=68
      [[ ! -e "$CWT_RUNNER_ROOT" && ! -L "$CWT_RUNNER_ROOT" ]] || cleanup_status=68
    else
      cleanup_status=68
    fi
    CWT_PROVISION_OWNS_RUNNER_ROOT=0
  fi
  if [[ -n "${CWT_PROVISION_WORK_ROOT:-}" ]]; then
    if [[ "$CWT_PROVISION_WORK_ROOT" == /tmp/cwt-runner-provision.* && ! -L "$CWT_PROVISION_WORK_ROOT" ]]; then
      rm -rf -- "$CWT_PROVISION_WORK_ROOT" || cleanup_status=68
    fi
    CWT_PROVISION_WORK_ROOT=""
  fi
  cwt_remove_apt_acquisition_policy || cleanup_status=68
  if [[ -n "${CWT_PROVISION_LOG:-}" ]]; then
    if [[ "$CWT_PROVISION_LOG" == /tmp/cwt-runner-provision-log.* && ! -L "$CWT_PROVISION_LOG" ]]; then
      rm -f -- "$CWT_PROVISION_LOG" || cleanup_status=68
    fi
    CWT_PROVISION_LOG=""
  fi
  if [[ "$cleanup_status" -ne 0 ]]; then
    printf 'CWT_PROVISION_NOT_PASS reason=provisioning_cleanup_failed\n' >&2
    return "$cleanup_status"
  fi
}

cwt_emit_failure_diagnostic() {
  local status="$1"

  printf 'CWT_PROVISION_NOT_PASS reason=verbose_phase_failed exit_code=%s diagnostic_tail_bytes=%s\n' \
    "$status" "$CWT_FAILURE_DIAGNOSTIC_TAIL_BYTES" >&2
  if [[ -r "${CWT_PROVISION_LOG:-}" ]]; then
    tail -c "$CWT_FAILURE_DIAGNOSTIC_TAIL_BYTES" "$CWT_PROVISION_LOG" \
      | LC_ALL=C tr -cd '\11\12\15\40-\176' >&2 || true
    printf '\n' >&2
  fi
}

cwt_on_exit() {
  local status="$1"

  trap - EXIT
  set +e
  if [[ "${CWT_PROVISION_LOG_ACTIVE:-0}" -eq 1 ]]; then
    exec 1>&3 2>&4
    exec 3>&- 4>&-
    CWT_PROVISION_LOG_ACTIVE=0
    cwt_emit_failure_diagnostic "$status"
  fi
  local cleanup_status=0
  cwt_cleanup || cleanup_status=$?
  if [[ "$cleanup_status" -ne 0 ]]; then
    status="$cleanup_status"
  fi
  exit "$status"
}

cwt_start_logging() {
  umask 077
  CWT_PROVISION_LOG="$(mktemp /tmp/cwt-runner-provision-log.XXXXXX)"
  [[ "$CWT_PROVISION_LOG" == /tmp/cwt-runner-provision-log.* && ! -L "$CWT_PROVISION_LOG" ]]
  chmod 0600 "$CWT_PROVISION_LOG"
  exec 3>&1 4>&2
  exec >"$CWT_PROVISION_LOG" 2>&1
  CWT_PROVISION_LOG_ACTIVE=1
  trap 'cwt_on_exit $?' EXIT
}

cwt_finish_logging() {
  exec 1>&3 2>&4
  exec 3>&- 4>&-
  CWT_PROVISION_LOG_ACTIVE=0
  if [[ -n "$CWT_PROVISION_WORK_ROOT" ]]; then
    [[ "$CWT_PROVISION_WORK_ROOT" == /tmp/cwt-runner-provision.* && ! -L "$CWT_PROVISION_WORK_ROOT" ]]
    rm -rf -- "$CWT_PROVISION_WORK_ROOT"
    CWT_PROVISION_WORK_ROOT=""
  fi
  cwt_remove_apt_acquisition_policy
  CWT_PROVISION_OWNS_RUNNER_ROOT=0
  [[ "$CWT_PROVISION_LOG" == /tmp/cwt-runner-provision-log.* && ! -L "$CWT_PROVISION_LOG" ]]
  rm -f -- "$CWT_PROVISION_LOG"
  CWT_PROVISION_LOG=""
  trap - EXIT
}

cwt_main() {
  cwt_validate_invocation "$@"
  cwt_start_logging
  cwt_create_apt_acquisition_policy
  cwt_prepare_host
  if [[ "$CWT_HOST_PREPARATION_MODE" == "fresh" ]]; then
    cwt_install_exact_docker
  fi
  cwt_install_runner
  cwt_finish_logging
  printf 'CWT_PRE_REGISTRATION_OK os=ubuntu-24.04 arch=amd64 docker=%s compose=%s runner=%s preparation=%s runner_tree_owner=ubuntu diag_write_probe=PASS docker_user_probe=PASS\n' \
    "$CWT_DOCKER_ENGINE_VERSION" "$CWT_DOCKER_COMPOSE_VERSION" "$CWT_RUNNER_VERSION" "$CWT_HOST_PREPARATION_MODE"
}

if [[ "${BASH_SOURCE[0]}" != "$0" ]]; then
  return 0
fi

set -Eeuo pipefail
IFS=$'\n\t'
cwt_main "$@"
