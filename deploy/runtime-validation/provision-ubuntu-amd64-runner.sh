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
readonly CWT_RUNNER_ROOT="/opt/cwt-actions-runner"
CWT_PROVISION_WORK_ROOT=""

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

cwt_require_fresh_host() {
  local conflicting_package status

  [[ "$EUID" -eq 0 ]] || {
    printf 'CWT_PROVISION_NOT_PASS reason=root_required\n' >&2
    return 66
  }
  [[ "$#" -eq 0 ]] || {
    printf 'CWT_PROVISION_NOT_PASS reason=arguments_forbidden\n' >&2
    return 64
  }
  [[ -r /etc/os-release ]] || {
    printf 'CWT_PROVISION_NOT_PASS reason=os_release_missing\n' >&2
    return 66
  }

  # shellcheck disable=SC1091
  source /etc/os-release
  [[ "${ID:-}" == "ubuntu" && "${VERSION_ID:-}" == "24.04" ]] || {
    printf 'CWT_PROVISION_NOT_PASS reason=unsupported_os\n' >&2
    return 66
  }
  [[ "$(dpkg --print-architecture)" == "amd64" && "$(uname -m)" == "x86_64" ]] || {
    printf 'CWT_PROVISION_NOT_PASS reason=unsupported_architecture\n' >&2
    return 66
  }
  id ubuntu >/dev/null 2>&1 || {
    printf 'CWT_PROVISION_NOT_PASS reason=ubuntu_user_missing\n' >&2
    return 66
  }
  [[ ! -e "$CWT_RUNNER_ROOT" ]] || {
    printf 'CWT_PROVISION_NOT_PASS reason=runner_root_not_fresh\n' >&2
    return 66
  }

  for conflicting_package in docker.io docker-compose docker-compose-v2 podman-docker containerd runc; do
    status="$(dpkg-query -W -f='${Status}' "$conflicting_package" 2>/dev/null || true)"
    [[ "$status" != "install ok installed" ]] || {
      printf 'CWT_PROVISION_NOT_PASS reason=conflicting_package package=%s\n' "$conflicting_package" >&2
      return 66
    }
  done
}

cwt_install_exact_docker() {
  local docker_ce_version docker_cli_version compose_version containerd_version

  export DEBIAN_FRONTEND=noninteractive
  apt-get update
  apt-get install -y --no-install-recommends ca-certificates curl git gnupg jq sudo

  install -d -m 0755 /etc/apt/keyrings
  curl --fail --silent --show-error --location https://download.docker.com/linux/ubuntu/gpg \
    --output /etc/apt/keyrings/docker.asc
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

cwt_install_runner() {
  local archive actual_sha ownership_drift runner_version probe docker_user_version

  CWT_PROVISION_WORK_ROOT="$(mktemp -d /tmp/cwt-runner-provision.XXXXXX)"
  [[ "$CWT_PROVISION_WORK_ROOT" == /tmp/cwt-runner-provision.* && ! -L "$CWT_PROVISION_WORK_ROOT" ]]
  archive="${CWT_PROVISION_WORK_ROOT}/actions-runner.tar.gz"
  trap cwt_cleanup EXIT

  curl --fail --silent --show-error --location "$CWT_RUNNER_ARCHIVE_URL" --output "$archive"
  actual_sha="$(sha256sum "$archive")"
  actual_sha="${actual_sha%% *}"
  [[ "$actual_sha" == "$CWT_RUNNER_ARCHIVE_SHA256" ]] || {
    printf 'CWT_PROVISION_NOT_PASS reason=runner_archive_digest_mismatch\n' >&2
    return 67
  }

  install -d -m 0755 "$CWT_RUNNER_ROOT"
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
  if [[ -n "${CWT_PROVISION_WORK_ROOT:-}" ]]; then
    rm -rf -- "$CWT_PROVISION_WORK_ROOT"
    CWT_PROVISION_WORK_ROOT=""
  fi
}

cwt_main() {
  cwt_require_fresh_host "$@"
  cwt_install_exact_docker
  cwt_install_runner
  printf 'CWT_PRE_REGISTRATION_OK os=ubuntu-24.04 arch=amd64 docker=%s compose=%s runner=%s runner_tree_owner=ubuntu diag_write_probe=PASS docker_user_probe=PASS\n' \
    "$CWT_DOCKER_ENGINE_VERSION" "$CWT_DOCKER_COMPOSE_VERSION" "$CWT_RUNNER_VERSION"
}

if [[ "${BASH_SOURCE[0]}" != "$0" ]]; then
  return 0
fi

set -Eeuo pipefail
IFS=$'\n\t'
cwt_main "$@"
