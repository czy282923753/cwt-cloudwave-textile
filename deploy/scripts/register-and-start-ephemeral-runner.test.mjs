import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { chmodSync, existsSync, mkdtempSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { afterEach, test } from "node:test";

const scriptPath = resolve("deploy/runtime-validation/register-and-start-ephemeral-runner.sh");
const invocationPath = resolve("deploy/runtime-validation/tencent-tat-runner-registration-invocation.v1.json");
const source = readFileSync(scriptPath, "utf8");
const invocation = JSON.parse(readFileSync(invocationPath, "utf8"));
const roots = [];
const TOKEN = "SyntheticRegistrationToken_0123456789";
const NONCE = "0123456789abcdef0123456789abcdef";
const NAME = `cwt-tencent-sg-${NONCE}`;
const REPOSITORY = "czy282923753/cwt-cloudwave-textile";

afterEach(() => { while (roots.length) rmSync(roots.pop(), { recursive: true, force: true }); });

function fixture() {
  const root = mkdtempSync(resolve(tmpdir(), "cwt-runner-registration-test-")); roots.push(root);
  const runnerRoot = resolve(root, "runner"); mkdirSync(runnerRoot);
  const trace = resolve(root, "trace");
  const config = `#!/bin/bash
set -euo pipefail
printf 'config\\n' >>"${trace}"
[[ "$1" == "--unattended" ]]
[[ "$2" == "--url" && "$3" == "https://github.com/czy282923753/cwt-cloudwave-textile" ]]
[[ "$4" == "--token" && "\${#5}" -ge 20 && "$5" =~ ^[A-Za-z0-9_-]+$ ]]
[[ "$6" == "--name" && "$7" == "cwt-tencent-sg-0123456789abcdef0123456789abcdef" ]]
[[ "$8" == "--labels" && "$9" == "cwt-tencent-singapore,cwt-single-use,cwt-job-0123456789abcdef0123456789abcdef" ]]
[[ "\${10}" == "--work" && "\${11}" == "_work" ]]
[[ "\${12}" == "--ephemeral" && "\${13}" == "--disableupdate" && "\${14}" == "--replace" && "$#" -eq 14 ]]
[[ "\${CWT_TEST_MODE:-}" != "config-failure" ]] || exit 73
[[ "\${CWT_TEST_MODE:-}" != "config-signal" ]] || kill -TERM "$BASHPID"
[[ "\${CWT_TEST_CREATE_STATE:-}" == "yes" ]] && : >"${resolve(runnerRoot, ".runner")}"
`;
  const run = `#!/bin/bash
set -euo pipefail
[[ -z "\${CWT_REGISTRATION_TOKEN+x}" ]] || printf 'token-leaked\\n' >>"${trace}"
printf 'run\\n' >>"${trace}"
printf '%s\\n' "$$" >"${resolve(root, "runner.pid")}"
exec /bin/sleep 3
`;
  writeFileSync(resolve(runnerRoot, "config.sh"), config); chmodSync(resolve(runnerRoot, "config.sh"), 0o755);
  writeFileSync(resolve(runnerRoot, "run.sh"), run); chmodSync(resolve(runnerRoot, "run.sh"), 0o755);
  return { root, runnerRoot, trace, pid: resolve(root, "runner.pid") };
}

function runFixture({ mode = "success", environment = {}, createRegistrationState = true, identityUser = "ubuntu", identityUid = "1000", expectedUid = "1000" } = {}) {
  const value = fixture();
  const command = String.raw`
source "$1"
trace="$3"
cwt_launch_runner() {
  printf 'start\n' >>"$trace"
  [[ -z "${"$"}{CWT_REGISTRATION_TOKEN+x}" ]]
  [[ -z "${"$"}{registration_token+x}" ]]
  [[ "${"$"}{CWT_TEST_MODE:-}" != "launch-failure" ]]
}
cwt_registration_for_identity "$2" "$4" "$5" "$6"
`;
  const result = spawnSync("/bin/bash", ["-c", command, "cwt-registration-fixture", scriptPath, value.runnerRoot, value.trace, identityUser, identityUid, expectedUid], {
    encoding: "utf8",
    env: {
      PATH: process.env.PATH,
      CWT_REGISTRATION_TOKEN: TOKEN,
      CWT_RUNNER_NONCE: NONCE,
      CWT_RUNNER_NAME: NAME,
      CWT_GITHUB_REPOSITORY: REPOSITORY,
      CWT_TEST_MODE: mode,
      CWT_TEST_CREATE_STATE: createRegistrationState ? "yes" : "no",
      ...environment,
    },
  });
  return { ...value, result, traceContent: existsSync(value.trace) ? readFileSync(value.trace, "utf8") : "" };
}

function assertRegistrationPolicy(candidate, invocationCandidate = invocation) {
  const main = candidate.slice(candidate.indexOf("cwt_registration_main()"), candidate.indexOf("cwt_main()"));
  assert.match(candidate, /set \+x/u);
  assert.doesNotMatch(candidate, /sudo|bash\s+-c|sh\s+-c|systemd-run/u);
  assert.doesNotMatch(candidate, /readonly\s+CWT_REGISTRATION_TOKEN|export\s+CWT_REGISTRATION_TOKEN/u);
  assert.doesNotMatch(candidate, /(?:printf|echo).*registration_token/u);
  assert.equal(candidate.match(/if ! "\$runner_root\/config\.sh" \\/gu)?.length, 1);
  assert.equal(candidate.match(/"\$runner_root\/run\.sh"/gu)?.length, 2);
  assert.equal(candidate.match(/--token "\$registration_token"/gu)?.length, 1);
  const localCopy = main.indexOf('local registration_token="${CWT_REGISTRATION_TOKEN:-}"');
  const clearExport = main.indexOf("unset CWT_REGISTRATION_TOKEN");
  const configure = main.indexOf('if ! "$runner_root/config.sh"');
  const clearLocal = main.indexOf("unset registration_token");
  const stateCheck = main.indexOf('[[ -f "$runner_root/.runner"');
  const launch = main.indexOf("cwt_launch_runner");
  assert.ok(localCopy >= 0 && clearExport > localCopy && configure > clearExport && clearLocal > configure && stateCheck > clearLocal && launch > stateCheck);
  assert.deepEqual(Object.keys(invocationCandidate).sort(), [
    "commandType", "operation", "outputCosEnabled", "provider", "saveCommand", "schemaVersion", "timeoutSeconds", "username", "workingDirectory",
  ]);
  assert.equal(invocationCandidate.operation, "RunCommand");
  assert.equal(invocationCandidate.commandType, "SHELL");
  assert.equal(invocationCandidate.username, "ubuntu");
  assert.equal(invocationCandidate.saveCommand, false);
  assert.equal(invocationCandidate.outputCosEnabled, false);
}

test("exact ubuntu identity performs one direct registration and one start without retained token output", () => {
  const value = runFixture();
  assert.equal(value.result.status, 0, value.result.stderr);
  assert.equal(value.traceContent, "config\nstart\n");
  assert.match(value.result.stdout, new RegExp(`^CWT_RUNNER_STARTED name=${NAME} labels=cwt-tencent-singapore,cwt-single-use,cwt-job-${NONCE}\\n$`, "u"));
  assert.equal(`${value.result.stdout}${value.result.stderr}${value.traceContent}`.includes(TOKEN), false);
  for (const name of readdirSync(value.runnerRoot).filter((entry) => !["config.sh", "run.sh"].includes(entry))) {
    assert.equal(readFileSync(resolve(value.runnerRoot, name), "utf8").includes(TOKEN), false, name);
  }
});

test("root, a wrong user, or a mismatched ubuntu UID fail before config and start", () => {
  const cases = [
    ["root", { identityUser: "root", identityUid: "0", expectedUid: "1000" }],
    ["wrong-user", { identityUser: "deployer", identityUid: "1001", expectedUid: "1000" }],
    ["wrong-uid", { identityUser: "ubuntu", identityUid: "1001", expectedUid: "1000" }],
  ];
  for (const [name, options] of cases) {
    const value = runFixture(options);
    assert.notEqual(value.result.status, 0, name);
    assert.equal(value.traceContent, "", name);
    assert.match(value.result.stderr, /reason=execution_user_invalid/u, name);
    assert.equal(`${value.result.stdout}${value.result.stderr}`.includes(TOKEN), false, name);
  }
});

test("registration failure, registration signal, or absent state never starts the Runner", () => {
  for (const options of [{ mode: "config-failure" }, { mode: "config-signal" }, { createRegistrationState: false }]) {
    const value = runFixture(options);
    assert.notEqual(value.result.status, 0);
    assert.equal(value.traceContent, "config\n");
    assert.doesNotMatch(value.result.stdout, /CWT_RUNNER_STARTED/u);
    assert.equal(`${value.result.stdout}${value.result.stderr}${value.traceContent}`.includes(TOKEN), false);
  }
});

test("launch failure is terminal after one registration and one start attempt", () => {
  const value = runFixture({ mode: "launch-failure" });
  assert.notEqual(value.result.status, 0);
  assert.equal(value.traceContent, "config\nstart\n");
  assert.doesNotMatch(value.result.stdout, /CWT_RUNNER_STARTED/u);
});

test("missing or malformed token, nonce, name, and repository fail before registration", () => {
  const cases = [
    ["missing-token", { CWT_REGISTRATION_TOKEN: "" }],
    ["malformed-token", { CWT_REGISTRATION_TOKEN: "contains whitespace" }],
    ["missing-nonce", { CWT_RUNNER_NONCE: "" }],
    ["malformed-nonce", { CWT_RUNNER_NONCE: "A".repeat(32) }],
    ["missing-name", { CWT_RUNNER_NAME: "" }],
    ["mismatched-name", { CWT_RUNNER_NAME: `cwt-tencent-sg-${"f".repeat(32)}` }],
    ["missing-repository", { CWT_GITHUB_REPOSITORY: "" }],
    ["wrong-repository", { CWT_GITHUB_REPOSITORY: "other/repository" }],
  ];
  for (const [name, environment] of cases) {
    const value = runFixture({ environment });
    assert.notEqual(value.result.status, 0, name);
    assert.equal(value.traceContent, "", name);
    assert.equal(`${value.result.stdout}${value.result.stderr}`.includes(TOKEN), false, name);
  }
});

test("the detached direct Runner start removes the token environment before exec", () => {
  const value = fixture();
  const command = String.raw`
source "$1"
cwt_launch_runner "$2"
[[ -f "$3" ]]
`;
  const result = spawnSync("/bin/bash", ["-c", command, "cwt-runner-launch-fixture", scriptPath, value.runnerRoot, value.pid], {
    encoding: "utf8", env: { PATH: process.env.PATH, CWT_REGISTRATION_TOKEN: TOKEN },
  });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(readFileSync(value.trace, "utf8"), "run\n");
  const pid = readFileSync(value.pid, "utf8").trim();
  spawnSync("/bin/kill", ["-TERM", pid]);
});

test("policy mutations cannot restore privilege wrappers, token custody, a second path, or a wrong TAT user", () => {
  assertRegistrationPolicy(source);
  for (const mutation of [
    source.replace('if ! "$runner_root/config.sh"', 'if ! /usr/bin/sudo -u ubuntu -H "$runner_root/config.sh"'),
    source.replace('if ! "$runner_root/config.sh"', 'if ! /usr/bin/env CWT_WRAPPED=1 "$runner_root/config.sh"'),
    source.replace("unset CWT_REGISTRATION_TOKEN", "export CWT_REGISTRATION_TOKEN"),
    source.replace("  registration_token=\"\"", "  printf '%s\\n' \"$registration_token\""),
    `${source}\n"$runner_root/config.sh" --token "$registration_token"\n`,
  ]) assert.throws(() => assertRegistrationPolicy(mutation), assert.AssertionError);
  assert.throws(() => assertRegistrationPolicy(source, { ...invocation, username: "root" }), assert.AssertionError);
  assert.throws(() => assertRegistrationPolicy(source, { ...invocation, registrationTokenFile: "/tmp/token" }), assert.AssertionError);
});

test("one-shot labels, flags, failure exits, and operator contract remain exact", () => {
  assertRegistrationPolicy(source);
  for (const exact of [
    "--unattended", "--ephemeral", "--disableupdate", "--replace", "--work _work",
    'runner_labels="cwt-tencent-singapore,cwt-single-use,cwt-job-${runner_nonce}"',
    "/usr/bin/nohup /usr/bin/env -u CWT_REGISTRATION_TOKEN", "</dev/null >/dev/null 2>&1 &",
  ]) assert.ok(source.includes(exact), exact);
  assert.doesNotMatch(source, /\bretry\b|\bfallback\b|while\s|for\s/u);
  const operator = readFileSync("deploy/host/README.md", "utf8");
  assert.match(operator, /tencent-tat-runner-registration-invocation\.v1\.json/u);
  assert.match(operator, /TAT `RunCommand` with `username` exactly `ubuntu`/u);
  assert.match(operator, /Do not reconstruct `config\.sh` or `run\.sh` commands, insert `sudo` or another wrapper/u);
});
