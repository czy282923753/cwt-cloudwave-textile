import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { chmodSync, existsSync, mkdtempSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { afterEach, test } from "node:test";

const scriptPath = resolve("deploy/runtime-validation/register-and-start-ephemeral-runner.sh");
const source = readFileSync(scriptPath, "utf8");
const roots = [];
const TOKEN = "SyntheticRegistrationToken_0123456789";
const NONCE = "0123456789abcdef0123456789abcdef";
const NAME = `cwt-tencent-sg-${NONCE}`;
const REPOSITORY = "czy282923753/cwt-cloudwave-textile";

afterEach(() => { while (roots.length) rmSync(roots.pop(), { recursive: true, force: true }); });

function fixture() {
  const root = mkdtempSync(resolve(tmpdir(), "cwt-runner-registration-test-")); roots.push(root);
  const runnerRoot = resolve(root, "runner"); mkdirSync(runnerRoot);
  for (const name of ["config.sh", "run.sh"]) {
    const path = resolve(runnerRoot, name); writeFileSync(path, "#!/usr/bin/bash\nexit 0\n"); chmodSync(path, 0o755);
  }
  return { root, runnerRoot, trace: resolve(root, "trace") };
}

function runFixture({ mode = "success", environment = {}, createRegistrationState = true } = {}) {
  const value = fixture();
  const command = String.raw`
source "$1"
trace="$3"
mode="$4"
state="$5"
cwt_configure_runner() {
  printf 'config\n' >>"$trace"
  [[ "$2" == "SyntheticRegistrationToken_0123456789" ]]
  [[ -z "${"$"}{CWT_REGISTRATION_TOKEN+x}" ]]
  [[ "$3" == "czy282923753/cwt-cloudwave-textile" ]]
  [[ "$4" == "cwt-tencent-sg-0123456789abcdef0123456789abcdef" ]]
  [[ "$5" == "cwt-tencent-singapore,cwt-single-use,cwt-job-0123456789abcdef0123456789abcdef" ]]
  [[ "$mode" != "config-failure" ]] || return 73
  [[ "$state" == "create-state" ]] && : >"$1/.runner"
}
cwt_launch_runner() {
  printf 'start\n' >>"$trace"
  [[ -z "${"$"}{CWT_REGISTRATION_TOKEN+x}" ]]
  [[ -z "${"$"}{registration_token+x}" ]]
  [[ "$mode" != "launch-failure" ]]
}
cwt_registration_main "$2"
`;
  const result = spawnSync("/bin/bash", ["-c", command, "cwt-registration-fixture", scriptPath, value.runnerRoot, value.trace, mode, createRegistrationState ? "create-state" : "no-state"], {
    encoding: "utf8",
    env: {
      PATH: process.env.PATH,
      CWT_REGISTRATION_TOKEN: TOKEN,
      CWT_RUNNER_NONCE: NONCE,
      CWT_RUNNER_NAME: NAME,
      CWT_GITHUB_REPOSITORY: REPOSITORY,
      ...environment,
    },
  });
  return { ...value, result, traceContent: existsSync(value.trace) ? readFileSync(value.trace, "utf8") : "" };
}

function assertTokenLifecycle(candidate) {
  const main = candidate.slice(candidate.indexOf("cwt_registration_main()"), candidate.indexOf("cwt_main()"));
  assert.doesNotMatch(candidate, /readonly\s+CWT_REGISTRATION_TOKEN/u);
  assert.doesNotMatch(candidate, /export\s+CWT_REGISTRATION_TOKEN/u);
  const localCopy = main.indexOf('local registration_token="${CWT_REGISTRATION_TOKEN:-}"');
  const clearExport = main.indexOf("unset CWT_REGISTRATION_TOKEN");
  const configure = main.indexOf("cwt_configure_runner");
  const clearLocal = main.indexOf("unset registration_token");
  const launch = main.indexOf("cwt_launch_runner");
  assert.ok(localCopy >= 0 && clearExport > localCopy && configure > clearExport && clearLocal > configure && launch > clearLocal);
}

test("one successful registration reaches one start with the token confined to config", () => {
  const value = runFixture();
  assert.equal(value.result.status, 0, value.result.stderr);
  assert.equal(value.traceContent, "config\nstart\n");
  assert.match(value.result.stdout, new RegExp(`^CWT_RUNNER_STARTED name=${NAME} labels=cwt-tencent-singapore,cwt-single-use,cwt-job-${NONCE}\\n$`, "u"));
  assert.equal(`${value.result.stdout}${value.result.stderr}${value.traceContent}`.includes(TOKEN), false);
  for (const name of readdirSync(value.runnerRoot)) {
    assert.equal(readFileSync(resolve(value.runnerRoot, name), "utf8").includes(TOKEN), false, name);
  }
});

test("registration failure or absent registration state never starts the Runner", () => {
  for (const options of [{ mode: "config-failure" }, { createRegistrationState: false }]) {
    const value = runFixture(options);
    assert.notEqual(value.result.status, 0);
    assert.equal(value.traceContent, "config\n");
    assert.doesNotMatch(value.result.stdout, /CWT_RUNNER_STARTED/u);
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

test("rejects the readonly-unset mutation and preserves exact one-shot ephemeral semantics", () => {
  assertTokenLifecycle(source);
  assert.throws(() => assertTokenLifecycle(source.replace(
    'local registration_token="${CWT_REGISTRATION_TOKEN:-}"',
    'readonly CWT_REGISTRATION_TOKEN="${CWT_REGISTRATION_TOKEN:-}"\n  local registration_token="$CWT_REGISTRATION_TOKEN"',
  )), assert.AssertionError);
  assert.equal(source.match(/cwt_run_as_ubuntu "\$runner_root\/config\.sh"/gu)?.length, 1);
  assert.equal(source.match(/"\$runner_root\/run\.sh"/gu)?.length, 2);
  for (const exact of [
    "--unattended", "--ephemeral", "--disableupdate", "--work _work",
    'runner_labels="cwt-tencent-singapore,cwt-single-use,cwt-job-${runner_nonce}"',
    '/usr/bin/env -u CWT_REGISTRATION_TOKEN',
  ]) assert.ok(source.includes(exact), exact);
  assert.doesNotMatch(source, /\bretry\b|\bfallback\b|while\s|for\s/u);
});

test("operator documentation uses the reviewed payload and forbids reconstructed registration commands", () => {
  const operator = readFileSync("deploy/host/README.md", "utf8");
  assert.match(operator, /register-and-start-ephemeral-runner\.sh/u);
  assert.match(operator, /Do not reconstruct `config\.sh` or `run\.sh` commands/u);
  assert.match(operator, /same single authorized TAT invocation/u);
});
