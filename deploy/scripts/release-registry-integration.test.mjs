import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { test } from "node:test";

import {
  __testOnly,
  canonicalGhcrRepository,
  createRegistryCommandPlan,
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

test("requires built release, source and exact index identities to agree", () => {
  const record = { releaseId: RELEASE, source: { commit: RELEASE }, oci: { indexDigest: INDEX }, state: "built" };
  assert.equal(validateReleaseIdentity(record, { releaseId: RELEASE, indexDigest: INDEX }), true);
  assert.throws(() => validateReleaseIdentity({ ...record, state: "staging_validated" }, { releaseId: RELEASE, indexDigest: INDEX }), /exact immutable inputs/u);
  assert.throws(() => validateReleaseIdentity(record, { releaseId: "c".repeat(40), indexDigest: INDEX }), /exact immutable inputs/u);
  assert.throws(() => validateReleaseIdentity(record, { releaseId: RELEASE, indexDigest: `sha256:${"d".repeat(64)}` }), /exact immutable inputs/u);
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
  assert.doesNotMatch(releaseWorkflow, /preflight-linux-runtime\.mjs validate/u);
  assert.match(runtimeWorkflow, /runs-on: \[self-hosted, linux, x64, cwt-tencent-singapore, cwt-single-use/u);
  assert.match(runtimeWorkflow, /cwt-job-\$\{\{ inputs\.runner_nonce \}\}/u);
  assert.match(runtimeWorkflow, /actions\/download-artifact@d3f86a106a0bac45b974a628896c90dbdf5c8093/u);
  assert.match(runtimeWorkflow, /release-registry-integration\.mjs materialize/u);
  assert.match(runtimeWorkflow, /preflight-linux-runtime\.mjs validate/u);
  assert.match(runtimeWorkflow, /packages: read/u);
  assert.doesNotMatch(runtimeWorkflow, /packages: write/u);
  assert.match(runtimeWorkflow, /Authenticate to private GHCR[\s\S]*env:\n\s+GHCR_TOKEN: \$\{\{ github\.token \}\}/u);
  assert.doesNotMatch(runtimeWorkflow, /^\s{6}GHCR_TOKEN:/mu);
  assert.doesNotMatch(runtimeWorkflow, /build:release-once/u);
  assert.doesNotMatch(runtimeWorkflow, /:[a-z0-9._-]+"?\s*\\?\n\s*--image/u);
});
