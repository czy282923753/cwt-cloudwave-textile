import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { chmodSync, existsSync, mkdtempSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { afterEach, test } from "node:test";

const scriptPath = resolve("deploy/runtime-validation/register-and-start-ephemeral-runner.sh");
const invocationPath = resolve("deploy/runtime-validation/tencent-tat-runner-registration-invocation.v1.json");
const payloadBytes = readFileSync(scriptPath);
const source = payloadBytes.toString("utf8");
const invocation = JSON.parse(readFileSync(invocationPath, "utf8"));
const wrapper = Buffer.from(invocation.content, "base64").toString("utf8");
const roots = [];
const TOKEN = "SyntheticRegistrationToken_0123456789";
const NONCE = "0123456789abcdef0123456789abcdef";
const NAME = `cwt-tencent-sg-${NONCE}`;
const REPOSITORY = "czy282923753/cwt-cloudwave-textile";
const EXPECTED_PAYLOAD_BYTES = 3752;
const EXPECTED_PAYLOAD_SHA256 = "7c773a341cfd629dae2985f7c51792aee6f917ca5df7733f7200d26e780da94b";
const EXPECTED_PAYLOAD_BLOB = "1281a207e5ebe58b7fb78900213a44ef26ad7e0a";
const MATERIALIZATION_NOT_PASS = "CWT_REGISTRATION_MATERIALIZATION_NOT_PASS\n";
const SHA256SUM_PATH = existsSync("/usr/bin/sha256sum") ? "/usr/bin/sha256sum" : "/sbin/sha256sum";

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

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function gitBlob(value) {
  return createHash("sha1").update(`blob ${value.length}\0`).update(value).digest("hex");
}

function embeddedPayload(candidate) {
  const match = candidate.match(/readonly CWT_REGISTRATION_PAYLOAD_BASE64='([A-Za-z0-9+/=]+)'/u);
  assert.ok(match, "embedded payload literal");
  return Buffer.from(match[1], "base64");
}

function withEmbeddedPayload(candidate, value) {
  const encoded = value.toString("base64");
  const next = candidate
    .replace(/readonly CWT_REGISTRATION_EXPECTED_BYTES='[0-9]+'/u, `readonly CWT_REGISTRATION_EXPECTED_BYTES='${value.length}'`)
    .replace(/readonly CWT_REGISTRATION_EXPECTED_SHA256='[0-9a-f]{64}'/u, `readonly CWT_REGISTRATION_EXPECTED_SHA256='${sha256(value)}'`)
    .replace(/readonly CWT_REGISTRATION_PAYLOAD_BASE64='[A-Za-z0-9+/=]+'/u, `readonly CWT_REGISTRATION_PAYLOAD_BASE64='${encoded}'`);
  assert.notEqual(next, candidate);
  return next;
}

function testPayload(trace, { fail = false } = {}) {
  return Buffer.from(`#!/bin/bash
set -eu
printf 'execute\\n' >>"${trace}"
[[ "\${CWT_REGISTRATION_TOKEN:-}" == "${TOKEN}" ]]
[[ "\${CWT_RUNNER_NONCE:-}" == "${NONCE}" ]]
[[ "\${CWT_RUNNER_NAME:-}" == "${NAME}" ]]
[[ "\${CWT_GITHUB_REPOSITORY:-}" == "${REPOSITORY}" ]]
printf 'child-output-must-not-escape\\n'
${fail ? "printf 'child-failure-detail-must-not-escape\\n' >&2\nexit 79" : "exit 0"}
`);
}

function runMaterialization(candidate, { parameterValues = {}, payloadOptions } = {}) {
  const root = mkdtempSync(resolve(tmpdir(), "cwt-runner-materialization-test-")); roots.push(root);
  const trace = resolve(root, "trace");
  const payload = testPayload(trace, payloadOptions);
  let runnable = withEmbeddedPayload(candidate, payload)
    .replace("{{tat-hidden:CWT_REGISTRATION_TOKEN}}", parameterValues.CWT_REGISTRATION_TOKEN ?? TOKEN)
    .replace("{{CWT_RUNNER_NONCE}}", parameterValues.CWT_RUNNER_NONCE ?? NONCE)
    .replace("{{CWT_RUNNER_NAME}}", parameterValues.CWT_RUNNER_NAME ?? NAME)
    .replace("{{CWT_GITHUB_REPOSITORY}}", parameterValues.CWT_GITHUB_REPOSITORY ?? REPOSITORY)
    .replace("/home/ubuntu/.cwt-runner-registration.XXXXXXXX", `${root}/payload.XXXXXXXX`)
    .replace("/usr/bin/sha256sum", SHA256SUM_PATH);
  const mutate = parameterValues.mutateWrapper;
  if (mutate) runnable = mutate(runnable, payload);
  const result = spawnSync("/bin/bash", ["-c", runnable], {
    encoding: "utf8",
    env: { PATH: process.env.PATH },
  });
  return {
    result,
    trace: existsSync(trace) ? readFileSync(trace, "utf8") : "",
    residue: readdirSync(root).filter((entry) => entry !== "trace"),
  };
}

function assertMaterializationFailure(value, executionCount = 0) {
  assert.notEqual(value.result.status, 0);
  assert.equal(value.result.stdout, "");
  assert.equal(value.result.stderr, MATERIALIZATION_NOT_PASS);
  assert.equal(value.trace, "execute\n".repeat(executionCount));
  assert.deepEqual(value.residue, []);
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
    "commandType", "content", "enableParameter", "operation", "outputCosEnabled", "provider", "saveCommand", "schemaVersion", "timeoutSeconds", "username", "workingDirectory",
  ]);
  assert.equal(invocationCandidate.operation, "RunCommand");
  assert.equal(invocationCandidate.commandType, "SHELL");
  assert.equal(invocationCandidate.enableParameter, true);
  assert.equal(invocationCandidate.username, "ubuntu");
  assert.equal(invocationCandidate.workingDirectory, "/home/ubuntu");
  assert.equal(invocationCandidate.timeoutSeconds, 600);
  assert.equal(invocationCandidate.saveCommand, false);
  assert.equal(invocationCandidate.outputCosEnabled, false);
}

function assertMaterializationPolicy(candidate, invocationCandidate = invocation) {
  assertRegistrationPolicy(source, invocationCandidate);
  assert.equal(invocationCandidate.content.length <= 64 * 1024, true);
  assert.match(invocationCandidate.content, /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/u);
  assert.equal(Buffer.from(invocationCandidate.content, "base64").toString("base64"), invocationCandidate.content);
  assert.match(candidate, /^#!\/usr\/bin\/bash\nset \+x\numask 077\n/u);
  assert.equal(candidate.match(/^trap /gmu)?.length, 1);
  assert.equal(candidate.match(/\/usr\/bin\/mktemp /gu)?.length, 1);
  assert.equal(candidate.match(/\/bin\/chmod 0700 /gu)?.length, 1);
  assert.equal(candidate.match(/\/usr\/bin\/base64 --decode /gu)?.length, 1);
  assert.equal(candidate.match(/\/usr\/bin\/wc -c /gu)?.length, 1);
  assert.equal(candidate.match(/\/usr\/bin\/sha256sum /gu)?.length, 1);
  assert.equal(candidate.match(/^  "\$payload_path" >\/dev\/null 2>&1; then$/gmu)?.length, 1);
  assert.equal(candidate.match(/\/bin\/rm -f /gu)?.length, 1);
  assert.doesNotMatch(candidate, /curl|wget|raw\.githubusercontent|https?:\/\/|\bretry\b|\bfallback\b|\/dev\/tcp|nc\s/u);
  assert.equal(candidate.match(/\{\{tat-hidden:CWT_REGISTRATION_TOKEN\}\}/gu)?.length, 1);
  assert.equal(candidate.match(/\{\{CWT_RUNNER_NONCE\}\}/gu)?.length, 1);
  assert.equal(candidate.match(/\{\{CWT_RUNNER_NAME\}\}/gu)?.length, 1);
  assert.equal(candidate.match(/\{\{CWT_GITHUB_REPOSITORY\}\}/gu)?.length, 1);
  assert.doesNotMatch(candidate, /tat-hidden:(?!CWT_REGISTRATION_TOKEN)/u);
  for (const exact of [
    'CWT_REGISTRATION_TOKEN="$registration_token"',
    'CWT_RUNNER_NONCE="$runner_nonce"',
    'CWT_RUNNER_NAME="$runner_name"',
    'CWT_GITHUB_REPOSITORY="$github_repository"',
  ]) assert.equal(candidate.split(exact).length - 1, 1, exact);
  assert.equal(candidate.match(/CWT_REGISTRATION_MATERIALIZATION_NOT_PASS\\n/gu)?.length, 1);
  assert.deepEqual(embeddedPayload(candidate), payloadBytes);
}

test("the outer Content and embedded registration payload are deterministic and byte exact", () => {
  assertMaterializationPolicy(wrapper);
  assert.equal(payloadBytes.length, EXPECTED_PAYLOAD_BYTES);
  assert.equal(payloadBytes.toString("base64").length, 5004);
  assert.equal(sha256(payloadBytes), EXPECTED_PAYLOAD_SHA256);
  assert.equal(gitBlob(payloadBytes), EXPECTED_PAYLOAD_BLOB);
  assert.match(wrapper, new RegExp(`readonly CWT_REGISTRATION_EXPECTED_BYTES='${EXPECTED_PAYLOAD_BYTES}'`, "u"));
  assert.match(wrapper, new RegExp(`readonly CWT_REGISTRATION_EXPECTED_SHA256='${EXPECTED_PAYLOAD_SHA256}'`, "u"));
});

test("the wrapper decodes, verifies, executes exactly once, and removes its temporary payload", () => {
  const value = runMaterialization(wrapper);
  assert.equal(value.result.status, 0, value.result.stderr);
  assert.equal(value.result.stdout, "CWT_REGISTRATION_MATERIALIZATION_PASS\n");
  assert.equal(value.result.stderr, "");
  assert.equal(value.trace, "execute\n");
  assert.deepEqual(value.residue, []);
});

test("decode corruption, truncation, and extra bytes fail before execution and clean up", () => {
  const mutations = [
    (candidate) => candidate.replace(/readonly CWT_REGISTRATION_PAYLOAD_BASE64='[^']+'/u, "readonly CWT_REGISTRATION_PAYLOAD_BASE64='%%%INVALID%%%'"),
    (candidate, payload) => candidate.replace(payload.toString("base64"), payload.subarray(0, -1).toString("base64")),
    (candidate, payload) => candidate.replace(payload.toString("base64"), Buffer.concat([payload, Buffer.from("x")]).toString("base64")),
  ];
  for (const mutateWrapper of mutations) {
    assertMaterializationFailure(runMaterialization(wrapper, { parameterValues: { mutateWrapper } }));
  }
});

test("explicit size and same-length hash mismatches fail before execution", () => {
  const mutations = [
    (candidate) => candidate.replace(/CWT_REGISTRATION_EXPECTED_BYTES='[0-9]+'/u, "CWT_REGISTRATION_EXPECTED_BYTES='999999'"),
    (candidate) => candidate.replace(/CWT_REGISTRATION_EXPECTED_SHA256='[0-9a-f]{64}'/u, `CWT_REGISTRATION_EXPECTED_SHA256='${"0".repeat(64)}'`),
  ];
  for (const mutateWrapper of mutations) {
    assertMaterializationFailure(runMaterialization(wrapper, { parameterValues: { mutateWrapper } }));
  }
});

test("payload identity or execution failure emits one fixed result after one execution and cleanup", () => {
  const wrongIdentity = runFixture({ identityUser: "root", identityUid: "0", expectedUid: "1000" });
  assert.notEqual(wrongIdentity.result.status, 0);
  assert.match(wrongIdentity.result.stderr, /reason=execution_user_invalid/u);
  const value = runMaterialization(wrapper, { payloadOptions: { fail: true } });
  assertMaterializationFailure(value, 1);
  assert.doesNotMatch(`${value.result.stdout}${value.result.stderr}`, /child-output|child-failure-detail/u);
});

test("temporary-file creation failure emits only the fixed result", () => {
  const mutateWrapper = (candidate) => candidate.replace(
    /\/usr\/bin\/mktemp \S+ 2>\/dev\/null/u,
    "/usr/bin/mktemp /definitely-absent-cwt-directory/payload.XXXXXXXX 2>/dev/null",
  );
  assertMaterializationFailure(runMaterialization(wrapper, { parameterValues: { mutateWrapper } }));
});

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

test("policy mutations cannot restore privilege wrappers, token custody, a second path, or wrong TAT settings", () => {
  assertRegistrationPolicy(source);
  assertMaterializationPolicy(wrapper);
  for (const mutation of [
    source.replace('if ! "$runner_root/config.sh"', 'if ! /usr/bin/sudo -u ubuntu -H "$runner_root/config.sh"'),
    source.replace('if ! "$runner_root/config.sh"', 'if ! /usr/bin/env CWT_WRAPPED=1 "$runner_root/config.sh"'),
    source.replace("unset CWT_REGISTRATION_TOKEN", "export CWT_REGISTRATION_TOKEN"),
    source.replace("  registration_token=\"\"", "  printf '%s\\n' \"$registration_token\""),
    `${source}\n"$runner_root/config.sh" --token "$registration_token"\n`,
  ]) assert.throws(() => assertRegistrationPolicy(mutation), assert.AssertionError);
  assert.throws(() => assertRegistrationPolicy(source, { ...invocation, username: "root" }), assert.AssertionError);
  assert.throws(() => assertRegistrationPolicy(source, { ...invocation, registrationTokenFile: "/tmp/token" }), assert.AssertionError);
  assert.throws(() => assertMaterializationPolicy(wrapper, { ...invocation, enableParameter: false }), assert.AssertionError);
  assert.throws(() => assertMaterializationPolicy(wrapper, { ...invocation, timeoutSeconds: 60 }), assert.AssertionError);
  assert.throws(() => assertMaterializationPolicy(wrapper, { ...invocation, workingDirectory: "/root" }), assert.AssertionError);
  assert.throws(() => assertMaterializationPolicy(wrapper, { ...invocation, contentCredential: "second-path" }), assert.AssertionError);
  for (const mutation of [
    wrapper.replace("/usr/bin/base64 --decode", "/usr/bin/curl https://example.invalid"),
    wrapper.replace("trap cwt_materialization_cleanup EXIT", "trap cwt_materialization_cleanup EXIT\ntrap cwt_materialization_cleanup TERM"),
    wrapper.replace("{{tat-hidden:CWT_REGISTRATION_TOKEN}}", "{{CWT_REGISTRATION_TOKEN}}"),
    wrapper.replace(payloadBytes.toString("base64"), Buffer.concat([payloadBytes, Buffer.from("x")]).toString("base64")),
  ]) assert.throws(() => assertMaterializationPolicy(mutation), assert.AssertionError);
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
  assert.match(operator, /submit its exact Base64 `content` value as TAT `RunCommand` `Content`/u);
  assert.match(operator, /`CWT_REGISTRATION_TOKEN` must use the embedded `tat-hidden` placeholder/u);
  assert.match(operator, /The embedded wrapper is the sole source-materialization path/u);
  assert.match(operator, /Do not reconstruct or modify the wrapper, fetch registration source over a network, add another content credential or source/u);
  assert.doesNotMatch(operator, /raw\.githubusercontent|curl|wget/u);
});
