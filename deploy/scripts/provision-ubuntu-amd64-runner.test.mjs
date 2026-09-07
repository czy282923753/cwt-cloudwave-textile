import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { once } from "node:events";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn, spawnSync } from "node:child_process";
import { test } from "node:test";

const scriptPath = "deploy/runtime-validation/provision-ubuntu-amd64-runner.sh";
const invocationPath = "deploy/runtime-validation/tencent-tat-provisioning-invocation.v1.json";
const source = readFileSync(scriptPath, "utf8");
const invocation = JSON.parse(readFileSync(invocationPath, "utf8"));
const dockerPackageVersion = "5:29.6.2-1~ubuntu.24.04~noble";

function selectVersion(packageName, expectedVersion, catalog) {
  return spawnSync(
    "/bin/bash",
    [
      "-c",
      'set -euo pipefail; source "$1"; select_exact_package_version "$2" "$3" "$4"',
      "cwt-package-selector",
      scriptPath,
      packageName,
      expectedVersion,
      catalog,
    ],
    { encoding: "utf8" },
  );
}

function assertProvisioningSourcePolicy(candidate) {
  assert.doesNotMatch(candidate, /apt-cache[^\n]*\|[^\n]*awk/u);
  assert.doesNotMatch(candidate, /awk[^\n]*\bexit\b/u);
}

function tatAuthorizesRegistration({ timeoutSeconds, terminalStatus, processExitCode }) {
  return (
    timeoutSeconds === invocation.timeoutSeconds &&
    terminalStatus === invocation.completionAuthority.terminalStatus &&
    processExitCode === invocation.completionAuthority.processExitCode
  );
}

function runLoggedFixture(body, successMarker = "") {
  const command = `
set -Eeuo pipefail
source "$1"
cwt_fixture() {
${body}
}
trap 'cwt_on_exit $?' EXIT
cwt_start_logging
cwt_fixture
cwt_finish_logging
printf '%s' "$2"
`;
  return spawnSync("/bin/bash", ["-c", command, "cwt-logged-fixture", scriptPath, successMarker], {
    encoding: "utf8",
  });
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

async function startArchiveServer(mode, body) {
  const root = mkdtempSync(join(tmpdir(), "cwt-runner-download-test-"));
  const countPath = join(root, "requests");
  const keyPath = join(root, "loopback.key");
  const certificatePath = join(root, "loopback.crt");
  const certificate = spawnSync("openssl", [
    "req", "-x509", "-newkey", "rsa:2048", "-nodes", "-days", "1",
    "-subj", "/CN=127.0.0.1", "-addext", "subjectAltName=IP:127.0.0.1",
    "-keyout", keyPath, "-out", certificatePath,
  ], { encoding: "utf8" });
  assert.equal(certificate.status, 0, certificate.stderr);
  const serverSource = String.raw`
const https = require("node:https");
const fs = require("node:fs");
const mode = process.argv[1];
const countPath = process.argv[2];
const body = Buffer.from(process.argv[3], "base64");
const keyPath = process.argv[4];
const certificatePath = process.argv[5];
let count = 0;
const server = https.createServer({ key: fs.readFileSync(keyPath), cert: fs.readFileSync(certificatePath) }, (_request, response) => {
  count += 1;
  fs.writeFileSync(countPath, String(count));
  if (mode === "stall") return;
  if (mode === "transient" && count === 1) {
    response.writeHead(503, { "content-type": "text/plain" });
    response.end("try again");
    return;
  }
  if (mode === "unavailable") {
    response.writeHead(503, { "content-type": "text/plain" });
    response.end("unavailable");
    return;
  }
  response.writeHead(200, { "content-type": "application/octet-stream" });
  response.end(body);
});
server.listen(0, "127.0.0.1", () => process.stdout.write(String(server.address().port) + "\n"));
process.on("SIGTERM", () => server.close(() => process.exit(0)));
`;
  const child = spawn(process.execPath, ["-e", serverSource, mode, countPath, body.toString("base64"), keyPath, certificatePath], {
    stdio: ["ignore", "pipe", "pipe"],
  });
  let stderr = "";
  child.stderr.setEncoding("utf8");
  child.stderr.on("data", chunk => {
    stderr += chunk;
  });
  const port = await new Promise((resolve, reject) => {
    let stdout = "";
    child.stdout.setEncoding("utf8");
    child.stdout.on("data", chunk => {
      stdout += chunk;
      if (stdout.includes("\n")) resolve(Number.parseInt(stdout, 10));
    });
    child.once("error", reject);
    child.once("exit", code => reject(new Error(`archive server exited ${code}: ${stderr}`)));
  });

  return {
    archivePath: join(root, "actions-runner.tar.gz"),
    certificatePath,
    count: () => Number.parseInt(readFileSync(countPath, "utf8"), 10),
    root,
    url: `https://127.0.0.1:${port}/actions-runner.tar.gz`,
    async close() {
      child.kill("SIGTERM");
      await once(child, "exit");
      rmSync(root, { force: true, recursive: true });
    },
  };
}

function downloadArchive({ url, expectedSha, archivePath, certificatePath, maxTime = 5 }) {
  const command = 'set -Eeuo pipefail; source "$1"; cwt_download_runner_archive "$2" "$3" "$4" "$5"';
  return spawnSync(
    "/bin/bash",
    [
      "-c",
      command,
      "cwt-runner-download-fixture",
      scriptPath,
      url,
      expectedSha,
      archivePath,
      String(maxTime),
    ],
    { encoding: "utf8", env: { ...process.env, CURL_CA_BUNDLE: certificatePath } },
  );
}

function fixtureScriptForRunnerRoot(root, fixtureRoot) {
  const fixturePath = join(fixtureRoot, "provision-fixture.sh");
  const replaced = source.replaceAll("/opt/cwt-actions-runner", root);
  assert.notEqual(replaced, source);
  writeFileSync(fixturePath, replaced, { mode: 0o700 });
  return fixturePath;
}

function exactRecoveryPrelude() {
  return String.raw`
cwt_package_identity() {
  case "$1" in
    docker-ce) printf '%s\n' 'install ok installed|5:29.6.2-1~ubuntu.24.04~noble' ;;
    docker-ce-cli) printf '%s\n' 'install ok installed|5:29.6.2-1~ubuntu.24.04~noble' ;;
    docker-compose-plugin) printf '%s\n' 'install ok installed|5.3.1-1~ubuntu.24.04~noble' ;;
    containerd.io) printf '%s\n' 'install ok installed|2.3.4-1~ubuntu.24.04~noble' ;;
  esac
}
docker() {
  case "$*" in
    "version --format {{.Client.Version}}"|"version --format {{.Server.Version}}") printf '%s\n' '29.6.2' ;;
    "compose version --short") printf '%s\n' '5.3.1' ;;
    "ps -aq"|"network ls --format {{.Label \"com.docker.compose.project\"}}|{{.Name}}") : ;;
    *) return 70 ;;
  esac
}
cwt_list_runner_processes() { :; }
cwt_list_mount_targets() { :; }
cwt_recovery_path_exists() { return 1; }
`;
}

test("selects one exact package version after consuming the complete catalog", () => {
  const result = selectVersion(
    "docker-ce",
    dockerPackageVersion,
    [
      " docker-ce | 5:29.6.1-1~ubuntu.24.04~noble | https://download.docker.com/linux/ubuntu noble/stable amd64 Packages",
      ` docker-ce | ${dockerPackageVersion} | https://download.docker.com/linux/ubuntu noble/stable amd64 Packages`,
      " docker-ce | 5:29.6.3-1~ubuntu.24.04~noble | https://download.docker.com/linux/ubuntu noble/stable amd64 Packages",
    ].join("\n"),
  );

  assert.equal(result.status, 0);
  assert.equal(result.stdout, `${dockerPackageVersion}\n`);
  assert.equal(result.stderr, "");
});

test("fails closed on zero, duplicate, wrong, malformed and wrong-package catalogs", () => {
  const exact = ` docker-ce | ${dockerPackageVersion} | https://download.docker.com/linux/ubuntu noble/stable amd64 Packages`;
  const cases = [
    ["zero", ""],
    ["duplicate", `${exact}\n${exact}`],
    ["wrong-version", " docker-ce | 5:29.6.1-1~ubuntu.24.04~noble | https://download.docker.com/linux/ubuntu noble/stable amd64 Packages"],
    ["malformed", "docker-ce missing separators"],
    ["extra-separator", `${exact} | unexpected`],
    ["wrong-package", ` docker-ce-cli | ${dockerPackageVersion} | https://download.docker.com/linux/ubuntu noble/stable amd64 Packages`],
  ];

  for (const [name, catalog] of cases) {
    const result = selectVersion("docker-ce", dockerPackageVersion, catalog);
    assert.notEqual(result.status, 0, name);
    assert.match(result.stderr, /CWT_PROVISION_NOT_PASS/u, name);
    assert.equal(result.stdout, "", name);
  }
});

test("rejects the prior early-exit pipeline pattern and its mutation", () => {
  assertProvisioningSourcePolicy(source);
  assert.throws(
    () => assertProvisioningSourcePolicy(`${source}\napt-cache madison docker-ce | awk '{ print $3; exit }'\n`),
    assert.AssertionError,
  );
  assert.match(source, /catalog="\$\(apt-cache madison "\$package"\)"/u);
  assert.match(source, /while IFS= read -r line \|\| \[\[ -n "\$line" \]\]/u);
});

test("pins accepted identities and excludes post-provisioning responsibilities", () => {
  for (const expected of [
    'CWT_DOCKER_ENGINE_VERSION="29.6.2"',
    'CWT_DOCKER_COMPOSE_VERSION="5.3.1"',
    'CWT_RUNNER_VERSION="2.337.0"',
    'CWT_DOCKER_CE_PACKAGE_VERSION="5:29.6.2-1~ubuntu.24.04~noble"',
    'CWT_DOCKER_COMPOSE_PACKAGE_VERSION="5.3.1-1~ubuntu.24.04~noble"',
    'CWT_CONTAINERD_PACKAGE_VERSION="2.3.4-1~ubuntu.24.04~noble"',
    'CWT_RUNNER_ARCHIVE_SHA256="70920811a4f8ad4328818682bca5c6469c1c942fab52448868071d0063816613"',
    'CWT_DOCKER_SIGNING_KEY_URL="https://download.docker.com/linux/ubuntu/gpg"',
    'CWT_DOCKER_KEY_DOWNLOAD_MAX_TIME_SECONDS="60"',
    'CWT_PUBLIC_DOWNLOAD_CONNECT_TIMEOUT_SECONDS="15"',
    'CWT_RUNNER_DOWNLOAD_MAX_TIME_SECONDS="390"',
    'CWT_PUBLIC_DOWNLOAD_RETRY_COUNT="2"',
    'CWT_PUBLIC_DOWNLOAD_RETRY_DELAY_SECONDS="2"',
    'CWT_PUBLIC_DOWNLOAD_RETRY_MAX_TIME_SECONDS="45"',
    'CWT_APT_RETRY_COUNT="2"',
    'CWT_APT_HTTP_TIMEOUT_SECONDS="30"',
    'CWT_APT_HTTPS_TIMEOUT_SECONDS="30"',
  ]) {
    assert.ok(source.includes(expected), expected);
  }

  for (const forbidden of [
    /config\.sh/u,
    /registration.?token/iu,
    /ACTIONS_RUNNER_INPUT_TOKEN/u,
    /gh\s+(?:api|workflow|run)/u,
    /workflow_dispatch/u,
    /tencentcloud/iu,
    /TerminateInstances/u,
    /docker\s+login/u,
    /DOCKER_HOST=/u,
  ]) {
    assert.doesNotMatch(source, forbidden);
  }
});

test("bounds both provisioning downloads with one native curl policy", () => {
  const retryCount = Number(source.match(/CWT_PUBLIC_DOWNLOAD_RETRY_COUNT="(\d+)"/u)?.[1]);
  const retryWindow = Number(source.match(/CWT_PUBLIC_DOWNLOAD_RETRY_MAX_TIME_SECONDS="(\d+)"/u)?.[1]);
  const transferLimit = Number(source.match(/CWT_RUNNER_DOWNLOAD_MAX_TIME_SECONDS="(\d+)"/u)?.[1]);
  assert.equal((source.match(/cwt_download_public_file \\/gu) ?? []).length, 1);
  assert.match(source, /cwt_download_public_file "\$url" "\$archive" "\$max_time_seconds"/u);
  assert.match(source, /--proto '=https' --tlsv1\.2/u);
  assert.match(source, /--connect-timeout "\$CWT_PUBLIC_DOWNLOAD_CONNECT_TIMEOUT_SECONDS"/u);
  assert.match(source, /--max-time "\$max_time_seconds"/u);
  assert.match(source, /--retry "\$CWT_PUBLIC_DOWNLOAD_RETRY_COUNT"/u);
  assert.match(source, /--retry-delay "\$CWT_PUBLIC_DOWNLOAD_RETRY_DELAY_SECONDS"/u);
  assert.match(source, /--retry-max-time "\$CWT_PUBLIC_DOWNLOAD_RETRY_MAX_TIME_SECONDS"/u);
  assert.match(source, /--retry-connrefused/u);
  assert.doesNotMatch(source, /--retry-all-errors/u);
  assert.match(source, /--remove-on-error/u);
  assert.equal(1 + retryCount, 3);
  assert.ok(retryWindow + transferLimit < invocation.timeoutSeconds);
  assert.doesNotMatch(source, /while[^\n]*curl|until[^\n]*curl/u);
});

test("retries a transient archive response and accepts only the exact digest", async () => {
  const body = Buffer.from("synthetic exact Runner archive");
  const server = await startArchiveServer("transient", body);
  try {
    const result = downloadArchive({
      url: server.url,
      expectedSha: sha256(body),
      archivePath: server.archivePath,
      certificatePath: server.certificatePath,
    });
    assert.equal(result.status, 0, result.stderr);
    assert.deepEqual(readFileSync(server.archivePath), body);
    assert.equal(server.count(), 2);
  } finally {
    await server.close();
  }
});

test("fails after the bounded retry count and removes failed transfer bytes", async () => {
  const body = Buffer.from("never returned");
  const server = await startArchiveServer("unavailable", body);
  try {
    const result = downloadArchive({
      url: server.url,
      expectedSha: sha256(body),
      archivePath: server.archivePath,
      certificatePath: server.certificatePath,
    });
    assert.notEqual(result.status, 0);
    assert.equal(server.count(), 3);
    assert.equal(existsSync(server.archivePath), false);
  } finally {
    await server.close();
  }
});

test("fails when the transfer time budget expires", async () => {
  const body = Buffer.from("stalled response");
  const server = await startArchiveServer("stall", body);
  try {
    const startedAt = Date.now();
    const result = downloadArchive({
      url: server.url,
      expectedSha: sha256(body),
      archivePath: server.archivePath,
      certificatePath: server.certificatePath,
      maxTime: 1,
    });
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /timed out|Timeout was reached/iu);
    assert.ok(Date.now() - startedAt < 9000);
    assert.equal(existsSync(server.archivePath), false);
  } finally {
    await server.close();
  }
});

test("never accepts a completed archive with the wrong digest", async () => {
  const expected = Buffer.from("expected archive");
  const server = await startArchiveServer("success", Buffer.from("corrupt archive"));
  try {
    const result = downloadArchive({
      url: server.url,
      expectedSha: sha256(expected),
      archivePath: server.archivePath,
      certificatePath: server.certificatePath,
    });
    assert.equal(result.status, 67);
    assert.match(result.stderr, /reason=runner_archive_digest_mismatch/u);
    assert.equal(server.count(), 1);
  } finally {
    await server.close();
  }
});

test("exports one temporary APT acquisition policy to direct and nested dependency clients and removes it", () => {
  const root = mkdtempSync(join(tmpdir(), "cwt-apt-policy-test-"));
  const policyRecord = join(root, "policy-path");
  const command = String.raw`
set -Eeuo pipefail
source "$1"
cwt_create_apt_acquisition_policy
policy="$APT_CONFIG"
printf '%s' "$policy" >"$2"
[[ -f "$policy" && ! -L "$policy" ]]
grep -Fx 'Acquire::Retries "2";' "$policy"
grep -Fx 'Acquire::http::Timeout "30";' "$policy"
grep -Fx 'Acquire::https::Timeout "30";' "$policy"
direct_apt_client() { [[ "$APT_CONFIG" == "$policy" && -f "$APT_CONFIG" ]]; }
direct_apt_client
/bin/bash -c '[[ -f "$APT_CONFIG" ]] && grep -Fx '\''Acquire::Retries "2";'\'' "$APT_CONFIG"'
cwt_remove_apt_acquisition_policy
[[ ! -e "$policy" && ! -L "$policy" && -z "${"${APT_CONFIG+x}"}" ]]
`;
  try {
    const result = spawnSync("/bin/bash", ["-c", command, "cwt-apt-policy", scriptPath, policyRecord], { encoding: "utf8" });
    assert.equal(result.status, 0, result.stderr);
    assert.equal(existsSync(readFileSync(policyRecord, "utf8")), false);
    assert.match(source, /export APT_CONFIG="\$CWT_APT_POLICY_PATH"/u);
    assert.match(source, /"\$CWT_RUNNER_ROOT\/bin\/installdependencies\.sh"/u);
  } finally {
    rmSync(root, { force: true, recursive: true });
  }
});

test("removes the temporary APT policy on a failed provisioning process", () => {
  const root = mkdtempSync(join(tmpdir(), "cwt-apt-policy-failure-"));
  const policyRecord = join(root, "policy-path");
  const command = String.raw`
set -Eeuo pipefail
source "$1"
trap 'cwt_on_exit $?' EXIT
cwt_create_apt_acquisition_policy
printf '%s' "$APT_CONFIG" >"$2"
false
`;
  try {
    const result = spawnSync("/bin/bash", ["-c", command, "cwt-apt-policy-failure", scriptPath, policyRecord], { encoding: "utf8" });
    assert.notEqual(result.status, 0);
    assert.equal(existsSync(readFileSync(policyRecord, "utf8")), false);
  } finally {
    rmSync(root, { force: true, recursive: true });
  }
});

test("accepts exact-Docker recovery with no Runner root and creates only a fresh owned root", () => {
  const fixtureRoot = mkdtempSync(join(tmpdir(), "cwt-recovery-absent-root-"));
  const runnerRoot = join(fixtureRoot, "fixed-runner");
  const fixtureScript = fixtureScriptForRunnerRoot(runnerRoot, fixtureRoot);
  const command = `${String.raw`set -Eeuo pipefail
source "$1"
`}${exactRecoveryPrelude()}${String.raw`
cwt_prepare_host
[[ "$CWT_HOST_PREPARATION_MODE" == "recovery" && ! -e "$CWT_RUNNER_ROOT" ]]
cwt_create_owned_runner_root
[[ -d "$CWT_RUNNER_ROOT" && "$CWT_PROVISION_OWNS_RUNNER_ROOT" -eq 1 ]]
`}`;
  try {
    const result = spawnSync("/bin/bash", ["-c", command, "cwt-recovery-absent", fixtureScript], { encoding: "utf8" });
    assert.equal(result.status, 0, result.stderr);
  } finally {
    rmSync(fixtureRoot, { force: true, recursive: true });
  }
});

test("wipes one inactive fixed stale Runner tree before fresh installation and cleans current-process partial state", () => {
  const fixtureRoot = mkdtempSync(join(tmpdir(), "cwt-recovery-stale-root-"));
  const runnerRoot = join(fixtureRoot, "fixed-runner");
  mkdirSync(runnerRoot);
  writeFileSync(join(runnerRoot, "stale-binary"), "synthetic stale bytes");
  const fixtureScript = fixtureScriptForRunnerRoot(runnerRoot, fixtureRoot);
  const command = `${String.raw`set -Eeuo pipefail
source "$1"
`}${exactRecoveryPrelude()}${String.raw`
cwt_prepare_host
[[ "$CWT_HOST_PREPARATION_MODE" == "recovery" && ! -e "$CWT_RUNNER_ROOT/stale-binary" ]]
cwt_create_owned_runner_root
printf '%s' 'synthetic fresh partial bytes' >"$CWT_RUNNER_ROOT/fresh-partial"
[[ "$CWT_PROVISION_OWNS_RUNNER_ROOT" -eq 1 && -f "$CWT_RUNNER_ROOT/fresh-partial" ]]
cwt_cleanup
[[ ! -e "$CWT_RUNNER_ROOT" && ! -L "$CWT_RUNNER_ROOT" ]]
`}`;
  try {
    const result = spawnSync("/bin/bash", ["-c", command, "cwt-recovery-stale", fixtureScript], { encoding: "utf8" });
    assert.equal(result.status, 0, result.stderr);
  } finally {
    rmSync(fixtureRoot, { force: true, recursive: true });
  }
});

test("refuses symlink, active Runner, mixed Docker, container, CWT network and private Runtime residue", () => {
  const cases = [
    {
      name: "symlink root",
      setup(root, runnerRoot) { const target = join(root, "target"); mkdirSync(target); symlinkSync(target, runnerRoot); },
      overrides: "",
      reason: /runner_root_type_invalid/u,
    },
    {
      name: "active Runner",
      setup(_root, runnerRoot) { mkdirSync(runnerRoot); },
      overrides: 'cwt_list_runner_processes() { printf "%s\\n" "$CWT_RUNNER_ROOT/bin/Runner.Listener run"; }',
      reason: /runner_process_active/u,
    },
    {
      name: "mounted Runner subtree",
      setup(_root, runnerRoot) { mkdirSync(runnerRoot); },
      overrides: 'cwt_list_mount_targets() { printf "%s\\n" "$CWT_RUNNER_ROOT/_work"; }',
      reason: /runner_root_mount_present/u,
    },
    {
      name: "unavailable mount state",
      setup(_root, runnerRoot) { mkdirSync(runnerRoot); },
      overrides: 'cwt_list_mount_targets() { return 69; }',
      reason: /runner_mount_state_unavailable/u,
    },
    {
      name: "mixed Docker",
      setup() {},
      overrides: 'cwt_package_identity() { if [[ "$1" == docker-ce ]]; then printf "%s\\n" "install ok installed|0:wrong"; fi; return 0; }',
      reason: /mixed_docker_installation/u,
      replacePrelude: true,
    },
    {
      name: "container residue",
      setup() {},
      overrides: 'docker() { [[ "$*" == "ps -aq" ]] && { printf "%s\\n" synthetic-container; return; }; command docker "$@"; }',
      reason: /docker_container_residue/u,
      directResidueCheck: true,
    },
    {
      name: "CWT network residue",
      setup() {},
      overrides: 'docker() { [[ "$*" == "ps -aq" ]] && return; printf "%s\\n" "cwt-runtime|cwt-runtime_default"; }',
      reason: /cwt_network_residue/u,
      directResidueCheck: true,
    },
    {
      name: "private Runtime residue",
      setup() {},
      overrides: 'docker() { :; }; cwt_recovery_path_exists() { [[ "$1" == *cwt-ghcr-auth ]]; }',
      reason: /recovery_private_or_runtime_residue/u,
      directResidueCheck: true,
    },
  ];

  for (const fixture of cases) {
    const fixtureRoot = mkdtempSync(join(tmpdir(), "cwt-recovery-refusal-"));
    const runnerRoot = join(fixtureRoot, "fixed-runner");
    fixture.setup(fixtureRoot, runnerRoot);
    const fixtureScript = fixtureScriptForRunnerRoot(runnerRoot, fixtureRoot);
    const prelude = fixture.replacePrelude ? "" : exactRecoveryPrelude();
    const operation = fixture.directResidueCheck ? "cwt_require_no_recovery_residue" : "cwt_prepare_host";
    const command = `set -Eeuo pipefail\nsource "$1"\n${prelude}\n${fixture.overrides}\n${operation}`;
    try {
      const result = spawnSync("/bin/bash", ["-c", command, `cwt-${fixture.name}`, fixtureScript], { encoding: "utf8" });
      assert.notEqual(result.status, 0, fixture.name);
      assert.match(result.stderr, fixture.reason, fixture.name);
    } finally {
      rmSync(fixtureRoot, { force: true, recursive: true });
    }
  }
});

test("failed fixed-root cleanup stays a refusal and never widens its target", () => {
  const fixtureRoot = mkdtempSync(join(tmpdir(), "cwt-recovery-cleanup-failure-"));
  const runnerRoot = join(fixtureRoot, "fixed-runner");
  mkdirSync(runnerRoot);
  const fixtureScript = fixtureScriptForRunnerRoot(runnerRoot, fixtureRoot);
  const command = String.raw`
set -Eeuo pipefail
source "$1"
cwt_list_runner_processes() { :; }
cwt_list_mount_targets() { :; }
rm() { return 1; }
cwt_remove_inactive_runner_root
`;
  try {
    const result = spawnSync("/bin/bash", ["-c", command, "cwt-cleanup-failure", fixtureScript], { encoding: "utf8" });
    assert.equal(result.status, 68);
    assert.match(result.stderr, /runner_root_cleanup_failed/u);
    assert.equal(existsSync(runnerRoot), true);
    assert.equal(existsSync(fixtureRoot), true);
  } finally {
    rmSync(fixtureRoot, { force: true, recursive: true });
  }
});

test("keeps ownership convergence and actual ubuntu-user probes before success", () => {
  const ownership = source.indexOf('chown -R ubuntu:ubuntu "$CWT_RUNNER_ROOT"');
  const diagCreate = source.indexOf('sudo -u ubuntu touch "$probe"');
  const diagRemove = source.indexOf('sudo -u ubuntu rm -- "$probe"');
  const dockerProbe = source.indexOf("sudo -u ubuntu -H docker version");
  const success = source.indexOf("CWT_PRE_REGISTRATION_OK");

  assert.ok(ownership > 0);
  assert.ok(diagCreate > ownership);
  assert.ok(diagRemove > diagCreate);
  assert.ok(dockerProbe > diagRemove);
  assert.ok(success > dockerProbe);
  assert.doesNotMatch(source, /\bfallback\b|docker:.*dind/iu);
});

test("fixes the current TAT envelope at 600 seconds and makes terminal SUCCESS plus exit 0 authoritative", () => {
  assert.equal(invocation.timeoutSeconds, 600);
  assert.notEqual(invocation.timeoutSeconds, 60);
  assert.equal(invocation.completionAuthority.markerRole, "corroborating_only");
  assert.equal(
    tatAuthorizesRegistration({ timeoutSeconds: 600, terminalStatus: "SUCCESS", processExitCode: 0 }),
    true,
  );
  assert.equal(
    tatAuthorizesRegistration({
      timeoutSeconds: 600,
      terminalStatus: "SUCCESS",
      processExitCode: 0,
      retainedOutput: "marker omitted by output retention",
    }),
    true,
  );
  assert.equal(
    tatAuthorizesRegistration({ timeoutSeconds: 60, terminalStatus: "SUCCESS", processExitCode: 0 }),
    false,
  );
});

test("never authorizes from a marker when terminal status or exit code fails closed", () => {
  const marker = invocation.completionAuthority.marker;
  for (const result of [
    { timeoutSeconds: 600, terminalStatus: "FAILED", processExitCode: 0, retainedOutput: marker },
    { timeoutSeconds: 600, terminalStatus: "TIMEOUT", processExitCode: 0, retainedOutput: marker },
    { timeoutSeconds: 600, terminalStatus: "CANCELLED", processExitCode: 0, retainedOutput: marker },
    { timeoutSeconds: 600, terminalStatus: "SUCCESS", processExitCode: 1, retainedOutput: marker },
    { timeoutSeconds: 600, terminalStatus: "SUCCESS", processExitCode: undefined, retainedOutput: marker },
  ]) {
    assert.equal(tatAuthorizesRegistration(result), false, JSON.stringify(result));
  }
});

test("discards noisy success output and keeps the corroborating marker below budget", () => {
  const marker = `${invocation.completionAuthority.marker} synthetic=PASS\n`;
  const result = runLoggedFixture(
    'for ((i = 0; i < 4000; i += 1)); do printf "verbose-success-%04d-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx\\n" "$i"; done',
    marker,
  );

  assert.equal(result.status, 0);
  assert.equal(result.stdout, marker);
  assert.equal(result.stderr, "");
  assert.ok(Buffer.byteLength(result.stdout) < invocation.successOutputBudgetBytes);
  assert.ok(invocation.successOutputBudgetBytes < invocation.retainedOrdinaryOutputCeilingBytes);
});

test("preserves a noisy failure exit code and emits only a bounded diagnostic tail", () => {
  const result = runLoggedFixture(
    'for ((i = 0; i < 4000; i += 1)); do printf "verbose-failure-%04d-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx\\n" "$i"; done; printf "synthetic-final-reason\\n" >&2; return 73',
  );

  assert.equal(result.status, 73);
  assert.equal(result.stdout, "");
  assert.match(result.stderr, /CWT_PROVISION_NOT_PASS reason=verbose_phase_failed exit_code=73/u);
  assert.match(result.stderr, /synthetic-final-reason/u);
  assert.ok(
    Buffer.byteLength(result.stderr) <= invocation.failureDiagnosticTailBytes + 256,
    Buffer.byteLength(result.stderr),
  );
  assert.ok(Buffer.byteLength(result.stderr) < invocation.retainedOrdinaryOutputCeilingBytes);
});

test("removes mandatory-marker authority and encloses every verbose provisioning phase", () => {
  const hostContract = readFileSync("deploy/host/README.md", "utf8");
  assert.doesNotMatch(hostContract, /Only `CWT_PRE_REGISTRATION_OK/u);
  assert.match(hostContract, /terminal `SUCCESS` status and exact process exit code `0`/u);
  assert.match(hostContract, /marker is corroboration only/u);
  assert.match(hostContract, /timeout.*`600` seconds/iu);
  assert.match(hostContract, /default `60`-second timeout.*forbidden/iu);
  assert.match(hostContract, /no registration token, Runtime credential or other secret may exist/u);

  const main = source.slice(source.indexOf("cwt_main()"));
  const start = main.indexOf("cwt_start_logging");
  const docker = main.indexOf("cwt_install_exact_docker");
  const runner = main.indexOf("cwt_install_runner");
  const finish = main.indexOf("cwt_finish_logging");
  const marker = main.indexOf("CWT_PRE_REGISTRATION_OK");
  assert.ok(start > 0 && docker > start && runner > docker && finish > runner && marker > finish);
  assert.equal(invocation.failureDiagnosticTailBytes, 4096);
  assert.match(source, /chmod 0600 "\$CWT_PROVISION_LOG"/u);
  assert.doesNotMatch(source, /tee\s|cat\s+"?\$CWT_PROVISION_LOG/u);
});
