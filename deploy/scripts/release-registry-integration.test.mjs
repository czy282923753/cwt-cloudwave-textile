import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { test } from "node:test";

import {
  __testOnly,
  canonicalGhcrRepository,
  createRegistryCommandPlan,
  isVerifiedAnonymousGhcrDenial,
  validateOrasIdentity,
  validateRegistryDescriptor,
  validateReleaseIdentity,
  validateRuntimeRunnerBinding,
} from "./release-registry-integration.mjs";

const RELEASE = "a".repeat(40);
const INDEX = `sha256:${"b".repeat(64)}`;
const REPOSITORY = "ghcr.io/czy282923753/cwt-cloudwave-textile";
const AUTH = "/run/cwt-ghcr/config.json";
const ORAS = "/opt/cwt-tools/oras";
const OCI = "/tmp/cwt-release/subject.oci";
const FROZEN_RELEASE = "7e6ef0ad9fd00975da93789421c0d24ec9226e82";

function assertRuntimeNodeSetupOrdering(workflow) {
  const setupMarker = "      - name: Install exact Node.js\n";
  const ghcrMarker = "      - name: Authenticate to private GHCR without credential arguments\n";
  const setupIndex = workflow.indexOf(setupMarker);
  const ghcrIndex = workflow.indexOf(ghcrMarker);
  assert.notEqual(setupIndex, -1, "Runtime workflow must retain the exact Node setup step");
  assert.equal(workflow.indexOf(setupMarker, setupIndex + setupMarker.length), -1, "Runtime workflow must have one Node setup authority");
  assert.notEqual(ghcrIndex, -1, "Runtime workflow must retain its private GHCR boundary");
  assert.ok(setupIndex < ghcrIndex, "Exact Node setup must occur before private GHCR access");

  const preGhcr = workflow.slice(0, ghcrIndex);
  for (const command of preGhcr.matchAll(/^\s+node\s+[^-]/gmu)) {
    assert.ok(setupIndex < command.index, "Exact Node setup must precede every Node-dependent pre-GHCR command");
  }
}

function workflowRun(workflow, name) {
  const step = workflow.split("      - name: ").find((value) => value.startsWith(`${name}\n`));
  assert.ok(step, name);
  return step.split("        run: |\n")[1].replace(/^ {10}/gmu, "").trim();
}

test("binds registry identity to the exact lowercase GitHub repository", () => {
  assert.equal(canonicalGhcrRepository("czy282923753/cwt-cloudwave-textile"), REPOSITORY);
  for (const invalid of ["CZY282923753/cwt-cloudwave-textile", "owner", "owner/repo/extra", "owner/repo:tag", "docker.io/owner/repo"]) {
    assert.throws(() => canonicalGhcrRepository(invalid), /exact lowercase owner\/name/u);
  }
});

test("pins the patched ORAS identity and rejects version or source drift", () => {
  const exact = "Version:        1.3.3\nGo version:     go1.25.7\nOS/Arch:        linux/amd64\nGit commit:     210747c29c1d38732b3194878dfd8b5a6b9ad7eb\nGit tree state: clean\n";
  assert.deepEqual(validateOrasIdentity(exact), __testOnly.ORAS_IDENTITY);
  assert.throws(() => validateOrasIdentity(exact.replace("1.3.3", "1.3.2")), /pinned release/u);
  assert.throws(() => validateOrasIdentity(exact.replace("clean", "dirty")), /pinned release/u);
});

test("checks the release header without network, credentials or state and emits only literal mismatch fields", () => {
  const root = realpathSync(mkdtempSync(resolve(tmpdir(), "cwt-check-release-")));
  const release = resolve(root, "release.json");
  const script = resolve("deploy/scripts/release-registry-integration.mjs");
  const secret = "SYNTHETIC_SECRET_MUST_NEVER_APPEAR";
  const record = { releaseId: FROZEN_RELEASE, source: { commit: FROZEN_RELEASE },
    oci: { indexDigest: "sha256:89e04e7201694e6f202c71cceb368622cc2d584136a7eedfaee9044a45023e8a" }, state: "built",
    SYNTHETIC_UNKNOWN_SECRET_KEY: secret };
  const run = (input = {}) => spawnSync(process.execPath, [script, "check-release", "--release", release,
    "--release-id", input.releaseId ?? FROZEN_RELEASE, "--index-digest", input.indexDigest ?? record.oci.indexDigest], {
    encoding: "utf8", env: { PATH: "/nonexistent", DOCKER_CONFIG: `/nonexistent/${secret}`, GHCR_TOKEN: secret },
  });
  try {
    writeFileSync(release, JSON.stringify(record));
    const original = readFileSync(release);
    assert.equal(validateReleaseIdentity(record, { releaseId: FROZEN_RELEASE, indexDigest: record.oci.indexDigest }), true);
    const accepted = run();
    assert.equal(accepted.status, 0, accepted.stderr);
    assert.deepEqual(JSON.parse(accepted.stdout), { status: "PASS" });
    const wrongIndex = run({ indexDigest: "sha256:89e04b0273e213a8c02f39803cb57ec14b83b07b27471f24b2d625702aef06a8" });
    assert.equal(wrongIndex.status, 1);
    assert.deepEqual(JSON.parse(wrongIndex.stderr), { status: "NOT_PASS", reasonCode: "release_identity_mismatch", mismatchFields: ["oci.indexDigest"] });
    for (const [mutate, fields] of [
      [(value) => { value.releaseId = { secret }; }, ["releaseId"]],
      [(value) => { value.source = null; }, ["source.commit"]],
      [(value) => { value.oci.indexDigest = [secret]; }, ["oci.indexDigest"]],
      [(value) => { value.state = secret; }, ["state"]],
    ]) {
      const value = structuredClone(record); mutate(value); writeFileSync(release, JSON.stringify(value));
      const result = run();
      assert.equal(result.status, 1);
      assert.deepEqual(JSON.parse(result.stderr), { status: "NOT_PASS", reasonCode: "release_identity_mismatch", mismatchFields: fields });
      assert.doesNotMatch(result.stdout + result.stderr, /SYNTHETIC_|expected|actual/u);
    }
    writeFileSync(release, original);
    const malformed = run({ releaseId: secret, indexDigest: secret });
    assert.deepEqual(JSON.parse(malformed.stderr).mismatchFields, ["input.releaseId", "input.indexDigest", "releaseId", "source.commit", "oci.indexDigest"]);
    assert.doesNotMatch(malformed.stderr, /SYNTHETIC_/u);
    assert.deepEqual(readFileSync(release), original);
    const extra = spawnSync(process.execPath, [script, "check-release", "--auth", secret], { encoding: "utf8" });
    assert.deepEqual(JSON.parse(extra.stderr), { status: "NOT_PASS", reasonCode: "arguments_invalid" });
    writeFileSync(release, secret);
    assert.deepEqual(JSON.parse(run().stderr), { status: "NOT_PASS", reasonCode: "release_record_invalid" });
    rmSync(release);
    assert.deepEqual(JSON.parse(run().stderr), { status: "NOT_PASS", reasonCode: "integration_not_pass" });
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test("uses ORAS digest-rooted layout copy and exact GHCR descriptor verification", () => {
  const plan = createRegistryCommandPlan({ orasPath: ORAS, authFile: AUTH, ociRoot: OCI, outputRoot: "/tmp/runtime/subject.oci", repository: REPOSITORY, releaseId: RELEASE, indexDigest: INDEX });
  assert.deepEqual(plan.publish, ["cp", "--from-oci-layout", "--to-registry-config", AUTH, "--no-tty", `${OCI}@${INDEX}`, `${REPOSITORY}:${RELEASE}`]);
  assert.deepEqual(plan.materialize, ["cp", "--from-registry-config", AUTH, "--to-oci-layout", "--no-tty", `${REPOSITORY}@${INDEX}`, `/tmp/runtime/subject.oci:${RELEASE}`]);
  assert.equal(plan.digestReference, `${REPOSITORY}@${INDEX}`);
  assert.equal(plan.tagReference, `${REPOSITORY}:${RELEASE}`);
  assert.equal(plan.digestDescriptor.at(-1), plan.digestReference);
  assert.equal(validateRegistryDescriptor({ digest: INDEX, mediaType: __testOnly.OCI_INDEX_MEDIA_TYPE, size: 987 }, INDEX), true);
  assert.throws(() => validateRegistryDescriptor({ digest: `sha256:${"c".repeat(64)}`, mediaType: __testOnly.OCI_INDEX_MEDIA_TYPE, size: 987 }, INDEX), /preserve the exact OCI index/u);
  assert.throws(() => validateRegistryDescriptor({ digest: INDEX, mediaType: "application/vnd.docker.distribution.manifest.list.v2+json", size: 987 }, INDEX), /preserve the exact OCI index/u);
  const rendered = JSON.stringify(plan).toLowerCase();
  for (const forbidden of ["docker save", "docker load", "docker-archive", "temporary-transfer", "buildx imagetools", "--platform"]) {
    assert.equal(rendered.includes(forbidden), false);
  }
});

test("keeps trusted publish verification, makes materialization transport-only, and retains the sole ordered Runtime authority", () => {
  const integration = readFileSync(resolve("deploy/scripts/release-registry-integration.mjs"), "utf8");
  const publish = integration.slice(integration.indexOf("function publish"), integration.indexOf("function materialize"));
  const materialize = integration.slice(integration.indexOf("function materialize"), integration.indexOf("function main"));
  assert.match(publish, /verifiedRelease\(/u);
  assert.doesNotMatch(materialize, /verifiedRelease\(|verifyReleaseRecord\(/u);
  assert.match(materialize, /validateRegistryDescriptor[\s\S]*run\(orasPath, plan\.materialize\)/u);

  const runtimeWorkflow = readFileSync(resolve(".github/workflows/cwt-runtime-validation.yml"), "utf8");
  const materializeStep = runtimeWorkflow.indexOf("      - name: Materialize read-only OCI evidence from the same GHCR digest\n");
  const runtimeStep = runtimeWorkflow.indexOf("      - name: Run the sole accepted Linux Runtime Validation authority\n");
  assert.ok(materializeStep >= 0 && runtimeStep > materializeStep);
  assert.equal(runtimeWorkflow.slice(materializeStep, runtimeStep).match(/release-registry-integration\.mjs"? materialize/gu)?.length, 1);
  assert.match(runtimeWorkflow.slice(runtimeStep), /preflight-linux-runtime\.mjs"? validate/u);

  const runtimeValidator = readFileSync(resolve("deploy/scripts/preflight-linux-runtime.mjs"), "utf8");
  assert.equal(runtimeValidator.match(/verifyReleaseRecord\(/gu)?.length, 1);
});

test("accepts the live pinned ORAS authorization semantics only in the authenticated exact GHCR context", () => {
  const digestReference = `${REPOSITORY}@${INDEX}`;
  const liveOrasDenial = {
    status: 1,
    signal: null,
    error: undefined,
    stdout: "",
    stderr: "Error response from registry: unauthorized: authentication required\n",
  };
  const context = { repository: REPOSITORY, digestReference, authenticatedDigest: INDEX };
  assert.equal(isVerifiedAnonymousGhcrDenial(liveOrasDenial, context), true);

  const failures = [
    { name: "public anonymous success", result: { ...liveOrasDenial, status: 0, stderr: "", stdout: `{\"digest\":\"${INDEX}\"}\n` } },
    { name: "spawn error", result: { ...liveOrasDenial, error: new Error("spawn failed") } },
    { name: "signal termination", result: { ...liveOrasDenial, status: null, signal: "SIGTERM" } },
    { name: "unexpected nonzero exit", result: { ...liveOrasDenial, status: 2 } },
    { name: "empty output", result: { ...liveOrasDenial, stderr: "" } },
    { name: "stdout contamination", result: { ...liveOrasDenial, stdout: "unexpected" } },
    { name: "multiline output", result: { ...liveOrasDenial, stderr: `${liveOrasDenial.stderr}second line\n` } },
    { name: "oversized output", result: { ...liveOrasDenial, stderr: `Error response from registry: unauthorized: ${"a".repeat(220)}\n` } },
    { name: "bare registry first-hop 401", result: { ...liveOrasDenial, stderr: `Error response from registry: GET "https://ghcr.io/v2/${REPOSITORY.slice("ghcr.io/".length)}/manifests/${INDEX}": response status code 401: Unauthorized\n` } },
    { name: "prior unverified token 403 assumption", result: { ...liveOrasDenial, stderr: "Error response from registry: GET \"https://ghcr.io/token\": response status code 403: Forbidden\n" } },
    { name: "generic forbidden", result: { ...liveOrasDenial, stderr: "Error response from registry: forbidden: authentication required\n" } },
    { name: "structured denied text", result: { ...liveOrasDenial, stderr: "Error response from registry: denied: requested access to the resource is denied\n" } },
    { name: "not found", result: { ...liveOrasDenial, stderr: "Error response from registry: not_found: manifest unknown\n" } },
    { name: "ambiguous authorization", result: { ...liveOrasDenial, stderr: "Error response from registry: unauthorized: access denied\n" } },
    { name: "DNS failure", result: { ...liveOrasDenial, stderr: "Error: dial tcp: lookup ghcr.io: no such host\n" } },
    { name: "TLS failure", result: { ...liveOrasDenial, stderr: "Error: tls: failed to verify certificate\n" } },
    { name: "timeout", result: { ...liveOrasDenial, stderr: "Error: context deadline exceeded\n" } },
  ];
  for (const { name, result } of failures) {
    assert.equal(isVerifiedAnonymousGhcrDenial(result, context), false, name);
  }
  assert.equal(isVerifiedAnonymousGhcrDenial(liveOrasDenial, { ...context, authenticatedDigest: `sha256:${"c".repeat(64)}` }), false, "wrong authenticated digest");
  assert.equal(isVerifiedAnonymousGhcrDenial(liveOrasDenial, { ...context, digestReference: `${REPOSITORY}@sha256:${"c".repeat(64)}` }), false, "wrong requested digest");
  assert.equal(isVerifiedAnonymousGhcrDenial(liveOrasDenial, { ...context, repository: "ghcr.io/czy282923753/missing-repository" }), false, "wrong repository context");
  assert.equal(isVerifiedAnonymousGhcrDenial(liveOrasDenial, { ...context, digestReference: `ghcr.io/czy282923753/missing-repository@${INDEX}` }), false, "wrong requested repository");
  assert.equal(isVerifiedAnonymousGhcrDenial(liveOrasDenial, { ...context, digestReference: `docker.io/czy282923753/cwt-cloudwave-textile@${INDEX}` }), false, "wrong registry host");
});

test("keeps the anonymous probe credential-free and digest-rooted", () => {
  const source = readFileSync(resolve("deploy/scripts/release-registry-integration.mjs"), "utf8");
  const probe = source.slice(source.indexOf("function provePrivate"), source.indexOf("function publish"));
  assert.match(probe, /writeFileSync\(anonymousConfig, '\{"auths":\{\}\}\\n'/u);
  assert.match(probe, /"manifest", "fetch", "--descriptor", "--registry-config", anonymousConfig, digestReference/u);
  assert.doesNotMatch(probe, /authFile|GHCR_TOKEN|github\.token|Authorization/u);
});

test("requires one first-attempt job-scoped Tencent Singapore Runner identity", () => {
  const nonce = "0123456789abcdef0123456789abcdef";
  const exact = {
    eventName: "workflow_dispatch",
    runAttempt: "1",
    runnerEnvironment: "self-hosted",
    runnerOs: "Linux",
    runnerArch: "X64",
    runnerName: `cwt-tencent-sg-${nonce}`,
    nonce,
  };
  assert.deepEqual(validateRuntimeRunnerBinding(exact), {
    runnerName: exact.runnerName,
    runnerLabel: `cwt-job-${nonce}`,
    selectedProvider: "tencent-cloud",
    selectedRegion: "ap-singapore",
    lifecycleContract: "single-use-ephemeral",
    actualProviderAndDestructionProven: false,
  });
  for (const mutation of [
    { eventName: "push" },
    { runAttempt: "2" },
    { runnerEnvironment: "github-hosted" },
    { runnerArch: "ARM64" },
    { runnerName: "persistent-runner" },
    { nonce: "not-unique" },
  ]) assert.throws(() => validateRuntimeRunnerBinding({ ...exact, ...mutation }), /Runner|nonce/u);
});

test("executes workflow checkout checks and reviewed absolute script paths with a frozen older subject", () => {
  const workflow = readFileSync(resolve(".github/workflows/cwt-runtime-validation.yml"), "utf8");
  const root = realpathSync(mkdtempSync(resolve(tmpdir(), "cwt-workflow-chain-")));
  const tools = resolve(root, "runtime-tools"), subject = resolve(root, "release-subject");
  const git = (path, args) => execFileSync("git", ["-C", path, ...args], { encoding: "utf8" }).trim();
  try {
    execFileSync("git", ["clone", "--quiet", "--shared", "--no-checkout", resolve("."), subject]);
    git(subject, ["checkout", "--quiet", "--detach", FROZEN_RELEASE]);
    mkdirSync(tools); cpSync(resolve("deploy"), resolve(tools, "deploy"), { recursive: true });
    git(tools, ["init", "-q"]); git(tools, ["add", "."]);
    git(tools, ["-c", "user.name=Synthetic", "-c", "user.email=synthetic@invalid.example", "commit", "-qm", "synthetic reviewed tooling"]);
    const toolsCommit = git(tools, ["rev-parse", "HEAD"]);
    const nonce = "0123456789abcdef0123456789abcdef";
    const environment = { ...process.env, GITHUB_WORKSPACE: root, GITHUB_SHA: toolsCommit, WORKFLOW_COMMIT: toolsCommit,
      RELEASE_COMMIT: FROZEN_RELEASE, INDEX_DIGEST: INDEX, EVIDENCE_RUN_ID: "1", RUNNER_NONCE: nonce,
      GITHUB_EVENT_NAME: "workflow_dispatch", GITHUB_RUN_ATTEMPT: "1", RUNNER_ENVIRONMENT: "self-hosted",
      RUNNER_OS: "Linux", RUNNER_ARCH: "X64", RUNNER_NAME: `cwt-tencent-sg-${nonce}`, RUNNER_TEMP: root,
      GITHUB_REPOSITORY: "czy282923753/cwt-cloudwave-textile" };
    const run = (name, overrides = {}) => spawnSync("bash", ["-c", workflowRun(workflow, name)], {
      cwd: subject, encoding: "utf8", env: { ...environment, ...overrides },
    });
    const binding = "Verify the unique Tencent Singapore Runner binding before GHCR access";
    assert.equal(run(binding).status, 0);
    for (const overrides of [{ GITHUB_SHA: RELEASE }, { WORKFLOW_COMMIT: RELEASE, GITHUB_SHA: RELEASE }, { RELEASE_COMMIT: RELEASE }]) {
      assert.notEqual(run(binding, overrides).status, 0);
    }
    for (const path of [tools, subject]) {
      writeFileSync(resolve(path, "synthetic-dirty"), "synthetic");
      const dirty = run(binding);
      assert.notEqual(dirty.status, 0, JSON.stringify({ path, status: git(path, ["status", "--porcelain=v1"]), stdout: dirty.stdout, stderr: dirty.stderr }));
      rmSync(resolve(path, "synthetic-dirty"));
    }
    mkdirSync(resolve(root, "cwt-release-evidence"));
    writeFileSync(resolve(root, "cwt-release-evidence/release.json"), JSON.stringify({
      releaseId: FROZEN_RELEASE, source: { commit: FROZEN_RELEASE }, oci: { indexDigest: INDEX }, state: "built",
    }));
    const checked = run("Reconcile the detached release header before ORAS or credentials");
    assert.equal(checked.status, 0, checked.stderr);
    assert.deepEqual(JSON.parse(checked.stdout), { status: "PASS" });
    // A wrong tools path executes the frozen command, which has no check-release verb.
    const oldCheck = spawnSync("bash", ["-c", workflowRun(workflow, "Reconcile the detached release header before ORAS or credentials")
      .replaceAll("$GITHUB_WORKSPACE/runtime-tools", "$GITHUB_WORKSPACE/release-subject")], { encoding: "utf8", env: environment });
    assert.equal(oldCheck.status, 1);
    assert.equal(JSON.parse(oldCheck.stderr).reasonCode, "arguments_invalid");
    // Reach actual selected materializer and Runtime CLIs; unavailable inputs stop before transport/host work.
    const materialize = run("Materialize read-only OCI evidence from the same GHCR digest", { CWT_ORAS: "/nonexistent/oras", CWT_REGISTRY_AUTH: "/nonexistent/auth" });
    assert.equal(JSON.parse(materialize.stderr).reasonCode, "integration_not_pass");
    // Only the local sudo transport is omitted; execute the actual workflow-selected Node/script/arguments.
    const runtimeCommand = workflowRun(workflow, "Run the sole accepted Linux Runtime Validation authority")
      .replace('sudo --preserve-env=DOCKER_CONFIG ', '');
    const runtime = spawnSync("bash", ["-c", runtimeCommand], { cwd: subject, encoding: "utf8", env: environment });
    assert.equal(runtime.status, 1);
    assert.notEqual(JSON.parse(runtime.stderr).reasonCode, "arguments_invalid");
    assert.equal(existsSync(resolve(root, "cwt-runtime-outcome")), false);
    const download = workflow.indexOf("      - name: Download detached");
    const check = workflow.indexOf("      - name: Reconcile the detached");
    const oras = workflow.indexOf("      - name: Install hash-pinned");
    const login = workflow.indexOf("      - name: Authenticate");
    assert.ok(download < check && check < oras && oras < login);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test("release and runtime workflows remain manual, separated and fail-closed", () => {
  const releaseWorkflow = readFileSync(resolve(".github/workflows/cwt-release-publish.yml"), "utf8");
  const runtimeWorkflow = readFileSync(resolve(".github/workflows/cwt-runtime-validation.yml"), "utf8");
  for (const workflow of [releaseWorkflow, runtimeWorkflow]) {
    assert.match(workflow, /^on:\n  workflow_dispatch:/mu);
    assert.doesNotMatch(workflow, /^\s{0,4}(push|pull_request|schedule):/mu);
    assert.match(workflow, /GITHUB_RUN_ATTEMPT/u);
    assert.match(workflow, /environment: cwt-stage6-/u);
    for (const action of workflow.matchAll(/^\s*uses:\s*([^\s#]+)/gmu)) {
      assert.match(action[1], /^[a-z0-9_.-]+\/[a-z0-9_.-]+@[0-9a-f]{40}$/u);
    }
  }
  assert.match(releaseWorkflow, /runs-on: \[self-hosted, macOS, ARM64, cwt-trusted-build-once\]/u);
  assert.match(releaseWorkflow, /pnpm build:release-once/u);
  assert.match(releaseWorkflow, /release-registry-integration\.mjs publish/u);
  assert.match(releaseWorkflow, /packages: write/u);
  assert.match(releaseWorkflow, /Authenticate to private GHCR[\s\S]*env:\n\s+GHCR_TOKEN: \$\{\{ github\.token \}\}/u);
  assert.doesNotMatch(releaseWorkflow, /^\s{6}GHCR_TOKEN:/mu);
  assert.match(releaseWorkflow, /actions\/upload-artifact@ea165f8d65b6e75b540449e92b4886f43607fa02/u);
  assert.doesNotMatch(releaseWorkflow, /preflight-linux-runtime\.mjs"? validate/u);
  assert.match(runtimeWorkflow, /runs-on: \[self-hosted, linux, x64, cwt-tencent-singapore, cwt-single-use/u);
  assert.match(runtimeWorkflow, /cwt-job-\$\{\{ inputs\.runner_nonce \}\}/u);
  assert.match(runtimeWorkflow, /actions\/download-artifact@d3f86a106a0bac45b974a628896c90dbdf5c8093/u);
  assert.match(runtimeWorkflow, /release-registry-integration\.mjs"? materialize/u);
  assert.match(runtimeWorkflow, /preflight-linux-runtime\.mjs"? validate/u);
  assert.match(runtimeWorkflow, /packages: read/u);
  assert.doesNotMatch(runtimeWorkflow, /packages: write/u);
  assert.match(runtimeWorkflow, /Authenticate to private GHCR[\s\S]*env:\n\s+GHCR_TOKEN: \$\{\{ github\.token \}\}/u);
  assert.doesNotMatch(runtimeWorkflow, /^\s{6}GHCR_TOKEN:/mu);
  assert.doesNotMatch(runtimeWorkflow, /build:release-once/u);
  assert.doesNotMatch(runtimeWorkflow, /:[a-z0-9._-]+"?\s*\\?\n\s*--image/u);
  assert.match(runtimeWorkflow, /WORKFLOW_COMMIT: \$\{\{ inputs\.workflow_commit \}\}/u);
  assert.match(runtimeWorkflow, /ref: \$\{\{ inputs\.release_commit \}\}/u);
  assert.match(runtimeWorkflow, /ref: \$\{\{ inputs\.workflow_commit \}\}/u);
  assert.match(runtimeWorkflow, /path: runtime-tools/u);
  assert.match(runtimeWorkflow, /path: release-subject/u);
  assert.doesNotMatch(runtimeWorkflow, /\[\[\s+"?\$GITHUB_SHA"?\s+==\s+"?\$RELEASE_COMMIT"?\s+\]\]/u);
});

test("runtime workflow establishes exact Node before every Node-dependent pre-GHCR step", () => {
  const runtimeWorkflow = readFileSync(resolve(".github/workflows/cwt-runtime-validation.yml"), "utf8");
  assertRuntimeNodeSetupOrdering(runtimeWorkflow);

  const setupBlock = runtimeWorkflow.match(/      - name: Install exact Node\.js\n        uses: actions\/setup-node@[0-9a-f]{40}[^\n]*\n        with:\n          node-version: 24\.14\.0\n\n/u)?.[0];
  assert.ok(setupBlock, "Expected the pinned exact Node setup block");
  const causalMutation = runtimeWorkflow
    .replace(setupBlock, "")
    .replace("      - name: Install hash-pinned patched ORAS\n", `${setupBlock}      - name: Install hash-pinned patched ORAS\n`);
  assert.throws(
    () => assertRuntimeNodeSetupOrdering(causalMutation),
    /precede every Node-dependent pre-GHCR command/u,
  );
});
