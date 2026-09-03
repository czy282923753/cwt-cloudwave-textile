import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
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
  ]) {
    assert.ok(source.includes(expected), expected);
  }

  for (const forbidden of [
    /config\.sh/u,
    /registration.?token/iu,
    /ACTIONS_RUNNER_INPUT_TOKEN/u,
    /\/run\.sh/u,
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
  assert.doesNotMatch(source, /\bretry\b|\bfallback\b|docker:.*dind/iu);
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
