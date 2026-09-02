import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { resolve } from "node:path";

import {
  __testOnly,
  createRuntimeCommandPlan,
  decideCompatibility,
  parseDigestReference,
  syntheticHostPlan,
  validateNativeHostFacts,
  validatePulledImageIdentity,
} from "./preflight-linux-runtime.mjs";

const INDEX = `sha256:${"a".repeat(64)}`;
const CHILD = `sha256:${"b".repeat(64)}`;
const RELEASE = "c".repeat(40);
const REFERENCE = `registry.cwt.invalid/cloudwave/application@${INDEX}`;

function profile() {
  return {
    schemaVersion: 1,
    authority: {
      runnerClass: "cwt-controlled-vm-backed-single-use-ephemeral",
      osId: "ubuntu",
      osVersion: "24.04",
      architecture: "amd64",
      dockerMode: "host-engine",
      dindAllowed: false,
      sharedOrPersistentRunnerAllowed: false,
    },
    profiles: [{ id: "initial", dockerEngine: "29.6.2", dockerCompose: "5.3.1" }],
  };
}

test("accepts only a private repository at one lowercase sha256 index digest", () => {
  assert.deepEqual(parseDigestReference(REFERENCE), {
    reference: REFERENCE,
    registry: "registry.cwt.invalid",
    repository: "registry.cwt.invalid/cloudwave/application",
    indexDigest: INDEX,
  });
  for (const invalid of [
    "registry.cwt.invalid/cloudwave/application:latest",
    "registry.cwt.invalid/cloudwave/application",
    `docker.io/cloudwave/application@${INDEX}`,
    `https://registry.cwt.invalid/cloudwave/application@${INDEX}`,
    `registry.cwt.invalid/cloudwave/application@SHA256:${"a".repeat(64)}`,
    `registry.cwt.invalid/cloudwave/application@sha256:${"a".repeat(63)}`,
    `registry.cwt.invalid:65536/cloudwave/application@${INDEX}`,
    "docker save registry.cwt.invalid/cloudwave/application",
    "/tmp/subject.oci.tar",
    "temporary-transfer-tag",
    "host-to-host://subject",
  ]) assert.throws(() => parseDigestReference(invalid), /exact OCI repository digest|private OCI Registry/u);
  const portReference = `registry.cwt.invalid:5443/cloudwave/application@${INDEX}`;
  assert.equal(parseDigestReference(portReference).registry, "registry.cwt.invalid:5443");
});

test("matches actual Runner versions to one reviewed compatibility profile and fails closed on drift", () => {
  const actual = {
    osId: "ubuntu",
    osVersion: "24.04",
    architecture: "amd64",
    dockerMode: "host-engine",
    dockerEngine: "29.6.2",
    dockerCompose: "5.3.1",
  };
  assert.deepEqual(decideCompatibility(profile(), actual), { profileId: "initial", ...actual });
  assert.throws(() => decideCompatibility(profile(), { ...actual, dockerCompose: "5.3.2" }), /accepted compatibility profile/u);
  assert.throws(() => decideCompatibility(profile(), { ...actual, architecture: "arm64" }), /not authoritative/u);
  const invalid = profile(); invalid.authority.dindAllowed = true;
  assert.throws(() => decideCompatibility(invalid, actual), /profile is invalid/u);
});

test("requires a root native Ubuntu amd64 host Engine and rejects DIND/container cgroups", () => {
  const input = {
    uid: 0,
    architecture: "x64",
    osRelease: 'ID=ubuntu\nVERSION_ID="24.04"\n',
    processOneCgroup: "0::/init.scope\n",
    dockerInfo: { OSType: "linux", Architecture: "x86_64", DockerRootDir: "/var/lib/docker" },
  };
  assert.deepEqual(validateNativeHostFacts(input), { osId: "ubuntu", osVersion: "24.04", architecture: "amd64", dockerMode: "host-engine" });
  assert.throws(() => validateNativeHostFacts({ ...input, uid: 1000 }), /native Runner VM host/u);
  assert.throws(() => validateNativeHostFacts({ ...input, processOneCgroup: "0::/docker/abc" }), /DIND/u);
  assert.throws(() => validateNativeHostFacts({ ...input, dockerInfo: { ...input.dockerInfo, DockerRootDir: "/var/lib/dind" } }), /DIND/u);
});

test("builds one direct standard-Compose plan with exactly three services and no retired custody path", () => {
  const repositoryRoot = resolve(".");
  const plan = createRuntimeCommandPlan({ repositoryRoot, project: "cwt-runtime-proof", imageReference: REFERENCE });
  assert.deepEqual(plan.infrastructureUp.slice(-2), ["postgres", "valkey-staging"]);
  assert.equal(plan.webUp.at(-1), "web-staging");
  assert.equal(plan.migrate.includes("web-staging"), true);
  assert.equal(plan.migrate.includes(`${resolve("drizzle")}:/app/drizzle:ro`), true);
  assert.equal(plan.infrastructureUp.includes("--no-build"), true);
  assert.equal(plan.webUp.includes("--pull") && plan.webUp.includes("never"), true);
  const rendered = JSON.stringify(plan).toLowerCase();
  for (const forbidden of ["dind", "docker save", "docker load", ".tar", "temporary tag", "host-to-host"]) {
    assert.equal(rendered.includes(forbidden), false);
  }
  assert.deepEqual(__testOnly.EXACT_SERVICES, ["postgres", "valkey-staging", "web-staging"]);
});

test("keeps real-shaped runtime.env, secret-file and isolated staging storage contracts", () => {
  const plan = syntheticHostPlan(RELEASE);
  assert.equal(plan.configRoot, "/etc/cwt");
  assert.equal(plan.storageRoot, "/srv/cwt");
  assert.equal(plan.configFiles.includes("staging/runtime.env"), true);
  for (const requirement of ["database-url", "auth-session-secret", "valkey-password", "cloudmersive-api-key", "smtp-password", "monitoring-dsn", "ai-api-key", "cos-access-key-id", "cos-secret-key", "backup-password"]) {
    assert.equal(plan.configFiles.includes(`staging/${requirement}`), true);
  }
  assert.deepEqual(plan.stagingStorage, [
    "/srv/cwt/staging/media/public",
    "/srv/cwt/staging/media/private-inquiries",
    "/srv/cwt/staging/media/import",
  ]);
  const runtime = __testOnly.runtimeEnvironment("staging", RELEASE);
  assert.equal(runtime.APP_ENV, "staging");
  assert.equal(runtime.NON_PRODUCTION_NOINDEX, "true");
  assert.equal(runtime.DATABASE_URL, "");
  assert.equal(runtime.AUTH_SESSION_SECRET, "");
  assert.equal(runtime.CWT_RELEASE_ID, RELEASE);
});

test("binds the pulled index, selected linux/amd64 child, revision and non-root image user", () => {
  const neutral = { Descriptor: { digest: INDEX }, RepoDigests: [REFERENCE] };
  const platform = {
    Descriptor: { digest: CHILD },
    Os: "linux",
    Architecture: "amd64",
    Config: { User: "10001:10001", Labels: { "org.opencontainers.image.revision": RELEASE } },
  };
  assert.equal(validatePulledImageIdentity({ reference: REFERENCE, releaseId: RELEASE, childDigest: CHILD, neutralInspection: neutral, platformInspection: platform }), true);
  assert.throws(() => validatePulledImageIdentity({ reference: REFERENCE, releaseId: RELEASE, childDigest: CHILD, neutralInspection: neutral, platformInspection: { ...platform, Architecture: "arm64" } }), /linux-amd64 child/u);
  assert.throws(() => validatePulledImageIdentity({ reference: REFERENCE, releaseId: RELEASE, childDigest: CHILD, neutralInspection: neutral, platformInspection: { ...platform, Config: { ...platform.Config, User: "0:0" } } }), /linux-amd64 child/u);
});

test("reuses existing authorities and exposes only PASS/NOT_PASS without classifier or revocation calls", () => {
  const source = readFileSync(resolve("deploy/scripts/preflight-linux-runtime.mjs"), "utf8");
  assert.match(source, /import \{ sha256File, verifyReleaseRecord \} from "\.\/preflight-image\.mjs"/u);
  assert.match(source, /import \{ exactProtectedSecretFiles, validateComposeGraph \} from "\.\/preflight-compose-graph\.mjs"/u);
  assert.match(source, /\/app\/scripts\/check-public-bundle\.mjs/u);
  assert.match(source, /status = mainFailure \? "NOT_PASS" : "PASS"/u);
  assert.doesNotMatch(source, /classifyValidationFailure|createRevocation|preflight-release-compose/u);
  assert.doesNotMatch(source, /OWNER_DIND_REFERENCE|docker:\d[^\n]*-dind/u);
  assert.match(source, /automaticRetry: false, automaticRevocation: false/u);
});

test("hard-blocks both immutable historical release subjects", () => {
  assert.deepEqual(__testOnly.REVOKED_SUBJECTS, [
    {
      releaseId: "fe6e5b057aa7054d42f02f76d31858d3f71be3a9",
      indexDigest: "sha256:0a2f4651c569db1eba3eab465c3092122c0d80b8fe7b81166e11be1b4293fc46",
    },
    {
      releaseId: "e105d68d75032e9ba7eb86f4e8479cc09175c821",
      indexDigest: "sha256:57c95535939eef9376563799849ecf27027eea518709faa0705aef0c6a5119ad",
    },
  ]);
});
