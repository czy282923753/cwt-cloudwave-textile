import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, realpathSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { test } from "node:test";
import { resolve } from "node:path";

import {
  __testOnly,
  createDockerEnvironment,
  createGitIdentityEnvironment,
  createRuntimeCommandPlan,
  collectInfrastructureFailureServices,
  decideCompatibility,
  parseDigestReference,
  parseBundleFailureDetail,
  parseInfrastructureFailureServices,
  syntheticHostPlan,
  unixModeAllowsRead,
  validateBundleProcessResult,
  validateNativeHostFacts,
  validatePulledImageIdentity,
} from "./preflight-linux-runtime.mjs";
import { exactProtectedSecretFiles, validateComposeGraph } from "./preflight-compose-graph.mjs";

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

function normalizedCompose(projectName) {
  const proxyDigest = `sha256:${"d".repeat(64)}`;
  return JSON.parse(execFileSync("docker", [
    "compose", "--project-name", projectName, "--file", resolve("compose.yaml"), "--profile", "staging", "--profile", "production-ai",
    "config", "--format", "json", "--no-env-resolution", "--no-path-resolution",
  ], {
    encoding: "utf8",
    env: {
      ...process.env,
      CWT_IMAGE_REFERENCE: REFERENCE,
      CWT_IMAGE_INDEX_DIGEST: INDEX,
      CWT_IMAGE_CHILD_DIGEST: CHILD,
      CWT_PROXY_IMAGE_REFERENCE: `registry.cwt.invalid/cloudwave/proxy@${proxyDigest}`,
      CWT_CLOUDFLARE_RANGES_FILE: resolve("deploy/proxy/cloudflare-ranges.lab.conf"),
    },
  }));
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

test("accepts only fixed bundle failure detail JSON and never forwards unrecognized content", () => {
  for (const reasonCode of [
    "bundle_dependency_bootstrap_failed",
    "bundle_assertion_or_unknown_failed",
  ]) {
    assert.equal(parseBundleFailureDetail(`${JSON.stringify({ schemaVersion: 1, reasonCode })}\n`), reasonCode);
  }
  for (const value of [
    "not-json",
    JSON.stringify({ schemaVersion: 1, reasonCode: "PASS" }),
    JSON.stringify({ schemaVersion: 1, reasonCode: "bundle_dependency_bootstrap_failed", leaked: "secret-value" }),
    JSON.stringify({ schemaVersion: 1, reasonCode: "bundle_assertion_or_unknown_failed" }) + "\nraw-child-output",
    JSON.stringify({ schemaVersion: 1, reasonCode: "x".repeat(300) }),
  ]) assert.equal(parseBundleFailureDetail(value), null);

  for (const stdout of [
    JSON.stringify({ schemaVersion: 1, reasonCode: "PASS" }),
    JSON.stringify({ schemaVersion: 1, reasonCode: "bundle_dependency_bootstrap_failed", leaked: "secret-value" }),
    "malicious raw output",
  ]) {
    assert.throws(
      () => validateBundleProcessResult({ status: 1, stdout }),
      (error) => error?.code === "bundle_authority_failed" && error.detailCode === null &&
        !error.message.includes(stdout) && !error.message.includes("secret-value"),
    );
  }
  assert.throws(
    () => validateBundleProcessResult({
      status: 1,
      stdout: JSON.stringify({ schemaVersion: 1, reasonCode: "bundle_dependency_bootstrap_failed" }),
    }),
    (error) => error?.code === "bundle_authority_failed" &&
      error.detailCode === "bundle_dependency_bootstrap_failed",
  );
});

test("retains only bounded fixed service state from Compose 5.3.1 JSON or NDJSON", () => {
  const rows = [
    { Service: "postgres", State: "exited", Health: "", ExitCode: 7, ID: "forbidden-id", Command: "forbidden-command" },
    { Service: "valkey-staging", State: "running", Health: "starting", ExitCode: 0, Name: "forbidden-name", Error: "forbidden-error" },
    { Service: "web-staging", State: "running", Health: "healthy", ExitCode: 0, Environment: "forbidden-environment" },
  ];
  const expected = {
    postgres: { present: true, state: "exited", health: null, exitCode: 7 },
    "valkey-staging": { present: true, state: "running", health: "starting", exitCode: 0 },
  };
  const ndjsonCaptured = parseInfrastructureFailureServices(rows.map(JSON.stringify).join("\n"));
  assert.deepEqual(ndjsonCaptured, expected);
  assert.deepEqual(parseInfrastructureFailureServices(JSON.stringify(rows)), expected);
  assert.deepEqual(parseInfrastructureFailureServices(JSON.stringify([
    { Service: "postgres", State: "invented-state", Health: "secret-health-detail", ExitCode: Number.MAX_VALUE },
  ])), {
    postgres: { present: true, state: null, health: null, exitCode: null },
    "valkey-staging": { present: false, state: null, health: null, exitCode: null },
  });
  assert.equal(parseInfrastructureFailureServices("not-json"), null);
  assert.equal(parseInfrastructureFailureServices(`${JSON.stringify(rows[0])}\n${JSON.stringify(rows[0])}`), null);
  assert.equal(parseInfrastructureFailureServices("x".repeat(16 * 1024 + 1)), null);
  assert.equal(JSON.stringify(ndjsonCaptured).includes("forbidden"), false);
});

test("captures one read-only infrastructure state command and preserves collector failures as null", () => {
  const plan = createRuntimeCommandPlan({ repositoryRoot: resolve("."), project: "cwt-runtime-proof", imageReference: REFERENCE });
  const calls = [];
  const execute = (program, args, options) => {
    calls.push({ program, args, options });
    return { status: 0, stdout: `${JSON.stringify({ Service: "postgres", State: "exited", Health: "unhealthy", ExitCode: 1 })}\n` };
  };
  assert.deepEqual(collectInfrastructureFailureServices({ repositoryRoot: resolve("."), plan, composeEnv: {}, execute }), {
    postgres: { present: true, state: "exited", health: "unhealthy", exitCode: 1 },
    "valkey-staging": { present: false, state: null, health: null, exitCode: null },
  });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].program, "docker");
  assert.deepEqual(calls[0].args, plan.infrastructureFailurePs);
  assert.equal(calls[0].options.allowFailure, true);
  assert.equal(calls[0].options.maxBuffer, 16 * 1024);
  assert.equal(calls[0].options.timeout, 10_000);
  assert.equal(collectInfrastructureFailureServices({ repositoryRoot: resolve("."), plan, composeEnv: {}, execute: () => ({ status: 1, stdout: "hostile" }) }), null);
  assert.equal(collectInfrastructureFailureServices({ repositoryRoot: resolve("."), plan, composeEnv: {}, execute: () => { throw new Error("collector failed"); } }), null);
});

test("parses the actual local Compose service-state output without published ports", () => {
  const root = mkdtempSync(resolve(tmpdir(), "cwt-runtime-ps-shape-"));
  const project = `cwt-ps-shape-${process.pid}`;
  const compose = resolve(root, "compose.yaml");
  const base = ["compose", "--project-name", project, "--project-directory", root, "--file", compose];
  writeFileSync(compose, `services:\n  postgres:\n    image: node:24.14.0-bookworm\n    command: ["sh", "-c", "exit 7"]\n  valkey-staging:\n    image: node:24.14.0-bookworm\n    command: ["sh", "-c", "sleep 60"]\n    healthcheck:\n      test: ["CMD", "node", "-e", "process.exit(0)"]\n      interval: 1s\n      timeout: 1s\n      retries: 3\n`);
  try {
    execFileSync("docker", [...base, "up", "--detach", "--pull", "never", "--no-build"], { stdio: "ignore" });
    const postgresId = execFileSync("docker", [...base, "ps", "--all", "--quiet", "postgres"], { encoding: "utf8" }).trim();
    assert.match(postgresId, /^[0-9a-f]{12,64}$/u);
    execFileSync("docker", ["wait", postgresId], { stdio: "ignore" });
    const stdout = execFileSync("docker", [...base, "ps", "--all", "--format", "json"], { encoding: "utf8" });
    const captured = parseInfrastructureFailureServices(stdout);
    assert.equal(captured.postgres.present, true);
    assert.equal(captured.postgres.state, "exited");
    assert.equal(captured.postgres.exitCode, 7);
    assert.equal(captured["valkey-staging"].present, true);
    assert.equal(captured["valkey-staging"].state, "running");
    assert.ok(["starting", "healthy"].includes(captured["valkey-staging"].health));
  } finally {
    spawnSync("docker", [...base, "down", "--remove-orphans", "--timeout", "1"], { stdio: "ignore" });
    rmSync(root, { recursive: true, force: true });
  }
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

test("fixes every Docker invocation to the standard local Unix socket despite a remote current context", () => {
  const environment = { DOCKER_CONFIG: "/run/cwt-registry-credentials", SUDO_UID: "1000" };
  const clean = createDockerEnvironment(environment, { dockerConfigPresent: true, localSocketIsUnix: true });
  assert.equal(clean.DOCKER_CONFIG, environment.DOCKER_CONFIG);
  assert.equal(clean.DOCKER_HOST, "unix:///var/run/docker.sock");
  assert.equal("SUDO_UID" in clean, false);
  assert.equal("DOCKER_CONTEXT" in clean, false);
  assert.throws(() => createDockerEnvironment(environment, { dockerConfigPresent: true, localSocketIsUnix: false }), /local Docker Unix socket/u);
  for (const selector of ["DOCKER_HOST", "DOCKER_CONTEXT", "DOCKER_TLS_VERIFY", "COMPOSE_PROJECT_NAME"]) {
    assert.throws(() => createDockerEnvironment({ ...environment, [selector]: "remote" }, {
      dockerConfigPresent: true,
      localSocketIsUnix: true,
    }), /Caller Docker or Compose authority/u);
  }
});

test("binds Git's sudo ownership bridge to root, one canonical repository owner, and Git-only child state", () => {
  const expected = {
    PATH: "/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin",
    HOME: "/root",
    LANG: "C",
    LC_ALL: "C",
    TZ: "UTC",
    GIT_OPTIONAL_LOCKS: "0",
    SUDO_UID: "1000",
  };
  assert.deepEqual(createGitIdentityEnvironment({
    effectiveUid: 0,
    repositoryOwnerUid: 1000,
    environment: { SUDO_UID: "1000", DOCKER_CONFIG: "/run/secret", GHCR_TOKEN: "secret" },
  }), expected);
  assert.deepEqual(createGitIdentityEnvironment({
    effectiveUid: 0,
    repositoryOwnerUid: 0,
    environment: {},
  }), Object.fromEntries(Object.entries(expected).filter(([name]) => name !== "SUDO_UID")));
  for (const sudoUid of ["", "0", "00", "01000", "+1000", "1000 ", "4294967295", "99999999999"]) {
    assert.throws(() => createGitIdentityEnvironment({
      effectiveUid: 0,
      repositoryOwnerUid: sudoUid === "0" ? 0 : 1000,
      environment: { SUDO_UID: sudoUid },
    }), /sudo-origin UID|ownership bridge facts/u);
  }
  assert.throws(() => createGitIdentityEnvironment({
    effectiveUid: 0,
    repositoryOwnerUid: 1000,
    environment: {},
  }), /requires the exact sudo-origin ownership bridge/u);
  assert.throws(() => createGitIdentityEnvironment({
    effectiveUid: 0,
    repositoryOwnerUid: 1001,
    environment: { SUDO_UID: "1000" },
  }), /does not own the canonical repository/u);
  assert.throws(() => createGitIdentityEnvironment({
    effectiveUid: 1000,
    repositoryOwnerUid: 1000,
    environment: { SUDO_UID: "1000" },
  }), /ownership bridge facts/u);

  const repositoryRoot = realpathSync(resolve("."));
  const temporaryRoot = realpathSync(mkdtempSync(resolve(tmpdir(), "cwt-source-path-")));
  try {
    const link = resolve(temporaryRoot, "repository-link");
    symlinkSync(repositoryRoot, link);
    assert.throws(() => __testOnly.exactCanonicalDirectory(link, "repository", "repository_invalid"), /canonical non-symlink/u);
  } finally {
    rmSync(temporaryRoot, { recursive: true, force: true });
  }
});

test("executes mixed-revision preparation, transport and sole image authority under root and sudo ownership", () => {
  const sourceRoot = realpathSync(resolve("."));
  const scratch = realpathSync(mkdtempSync(resolve(tmpdir(), "cwt-mixed-runtime-")));
  const frozen = "7e6ef0ad9fd00975da93789421c0d24ec9226e82";
  try {
    const exporter = resolve(scratch, "exporter");
    execFileSync("git", ["clone", "--quiet", "--shared", "--no-checkout", sourceRoot, exporter]);
    execFileSync("git", ["-C", exporter, "checkout", "--quiet", "--detach", frozen]);
    execFileSync("git", ["-C", exporter, "bundle", "create", resolve(scratch, "subject.bundle"), "HEAD"]);
    const probe = String.raw`
      import assert from "node:assert/strict";
      import { execFileSync, spawnSync } from "node:child_process";
      import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
      import { createHash } from "node:crypto";
      const tools = "/tmp/runtime-tools", subject = "/tmp/release-subject";
      const frozen = "7e6ef0ad9fd00975da93789421c0d24ec9226e82";
      delete process.env.SUDO_UID;
      delete process.env.DOCKER_CONFIG;
      const git = (path, args) => execFileSync("git", ["-C", path, ...args], { encoding: "utf8" }).trim();
      const globalPolicy = () => {
        const result = spawnSync("git", ["config", "--global", "--get-all", "safe.directory"], { encoding: "utf8" });
        return { status: result.status, stdout: result.stdout };
      };
      const before = globalPolicy();
      execFileSync("git", ["clone", "-q", "--no-checkout", "/fixture/subject.bundle", subject]);
      git(subject, ["checkout", "-q", "--detach", frozen]);
      mkdirSync(tools);
      cpSync("/cwt/deploy", tools + "/deploy", { recursive: true });
      const profileRelative = "/deploy/runtime-validation/linux-amd64-compatibility.v1.json";
      const fixedProfile = JSON.parse(readFileSync(tools + profileRelative));
      fixedProfile.profiles[0].id += "-synthetic-reviewed";
      writeFileSync(tools + profileRelative, JSON.stringify(fixedProfile));
      writeFileSync(tools + "/compose.yaml", "SYNTHETIC TOOLS COMPOSE MUST NOT BE SELECTED");
      mkdirSync(tools + "/drizzle");
      writeFileSync(tools + "/drizzle/synthetic.sql", "SYNTHETIC TOOLS SQL MUST NOT BE SELECTED");
      git(tools, ["init", "-q"]);
      const commit = () => {
        git(tools, ["add", "."]);
        git(tools, ["-c", "user.name=Synthetic", "-c", "user.email=synthetic@invalid.example", "commit", "-qm", "synthetic reviewed tools"]);
        return git(tools, ["rev-parse", "HEAD"]);
      };
      const toolsCommit = commit();
      const { prepareRuntimeInputs, __testOnly: checks } = await import("file://" + tools + "/deploy/scripts/preflight-linux-runtime.mjs");
      const index = "sha256:89e04e7201694e6f202c71cceb368622cc2d584136a7eedfaee9044a45023e8a";
      const header = { releaseId: frozen, source: { commit: frozen }, oci: { indexDigest: index }, state: "built" };
      writeFileSync("/tmp/release.json", JSON.stringify(header));
      mkdirSync("/tmp/subject.oci");
      mkdirSync("/tmp/runner-temp", { mode: 0o700 });
      execFileSync("chown", ["1000:1000", "/tmp/runner-temp"]);
      mkdirSync("/tmp/root-owned-parent", { mode: 0o700 });
      const args = { repository: subject, "tools-commit": toolsCommit, release: "/tmp/release.json", oci: "/tmp/subject.oci",
        image: "ghcr.io/czy282923753/cwt-cloudwave-textile@" + index, evidence: "/tmp/runner-temp/runtime-outcome", token: "runtime-proof" };
      const rejects = (action, code) => assert.throws(action, (error) => error.code === code);
      const proveInputs = () => {
        const prepared = prepareRuntimeInputs(args);
        assert.equal(prepared.toolsRoot, tools);
        assert.equal(prepared.repositoryRoot, subject);
        assert.equal(prepared.reference.indexDigest, index);
        assert.deepEqual(prepared.tools, { commit: toolsCommit, compatibilityProfileSha256: createHash("sha256").update(readFileSync(tools + profileRelative)).digest("hex") });
        assert.equal(prepared.profile.profiles[0].id, fixedProfile.profiles[0].id);
        assert.notDeepEqual(readFileSync(tools + profileRelative), readFileSync(subject + profileRelative));
        for (const command of Object.values(prepared.plan)) {
          if (!Array.isArray(command)) continue;
          if (command[0] === "compose") {
            assert.equal(command[command.indexOf("--project-directory") + 1], subject);
            assert.equal(command[command.indexOf("--file") + 1], subject + "/compose.yaml");
          }
        }
        assert.ok(prepared.plan.migrate.includes(subject + "/drizzle:/app/drizzle:ro"));
        assert.ok(JSON.stringify(prepared.plan.migrate).includes("scheduler-staging"));
        assert.ok(JSON.stringify(prepared.plan.migrate).includes("/app/deploy/backup/pre-deploy"));
        assert.ok(JSON.stringify(prepared.plan.migrate).includes("/app/scripts/migrate.ts"));
        assert.equal(existsSync(args.evidence), false);
      };
      proveInputs();
      // Both real Git roots are exercised in each supported owner role.
      for (const uid of [0, 1000]) {
        for (const root of [tools, subject]) execFileSync("chown", ["-R", String(uid) + ":" + String(uid), root]);
        if (uid === 0) delete process.env.SUDO_UID; else process.env.SUDO_UID = "1000";
        proveInputs();
        for (const root of [tools, subject]) {
          const expected = root === tools ? toolsCommit : frozen;
          rejects(() => checks.verifyRepositoryIdentity(root, "a".repeat(40)), "source_identity_mismatch");
          writeFileSync(root + "/synthetic-dirty", "synthetic");
          rejects(() => prepareRuntimeInputs(args), "source_identity_mismatch");
          rmSync(root + "/synthetic-dirty");
          rejects(() => checks.verifyRepositoryIdentity(root + "/deploy", expected), "source_identity_mismatch");
          symlinkSync(root, root + "-link");
          rejects(() => checks.verifyRepositoryIdentity(root + "-link", expected), "repository_invalid");
          rmSync(root + "-link");
          if (uid === 1000) {
            delete process.env.SUDO_UID;
            rejects(() => checks.verifyRepositoryIdentity(root, expected), "source_owner_bridge_missing");
            for (const invalid of ["malformed", "0"]) {
              process.env.SUDO_UID = invalid;
              rejects(() => checks.verifyRepositoryIdentity(root, expected), "source_owner_bridge_invalid");
            }
            process.env.SUDO_UID = "1001";
            rejects(() => checks.verifyRepositoryIdentity(root, expected), "source_owner_bridge_mismatch");
            process.env.SUDO_UID = "1000";
            execFileSync("chown", ["1001:1001", root]);
            rejects(() => prepareRuntimeInputs(args), "source_owner_bridge_mismatch");
            execFileSync("chown", ["1000:1000", root]);
          }
        }
      }
      rejects(() => prepareRuntimeInputs({ ...args, "tools-commit": frozen }), "source_identity_mismatch");
      rejects(() => prepareRuntimeInputs({ ...args, repository: tools }), "repository_source_mismatch");
      rejects(() => prepareRuntimeInputs({ ...args, repository: subject + "/deploy" }), "repository_source_mismatch");
      symlinkSync(subject, subject + "-link");
      rejects(() => prepareRuntimeInputs({ ...args, repository: subject + "-link" }), "repository_invalid");
      rmSync(subject + "-link");
      for (const root of [tools, subject]) {
        rejects(() => prepareRuntimeInputs({ ...args, evidence: root + "/outcome" }), "evidence_path_invalid");
        rejects(() => prepareRuntimeInputs({ ...args, oci: root + "/drizzle" }), "oci_evidence_invalid");
        rejects(() => prepareRuntimeInputs({ ...args, release: root + profileRelative }), "release_record_invalid");
        // Ignored credential fixtures preserve clean Git and exercise the path boundary itself.
        writeFileSync(root + "/.git/config.json", "{}");
        process.env.DOCKER_CONFIG = root + "/.git";
        rejects(() => prepareRuntimeInputs(args), "docker_credentials_unavailable");
        delete process.env.DOCKER_CONFIG; rmSync(root + "/.git/config.json");
        symlinkSync(root, "/tmp/source-link");
        rejects(() => prepareRuntimeInputs({ ...args, evidence: "/tmp/source-link/outcome" }), "evidence_path_invalid");
        rmSync("/tmp/source-link");
      }
      const originalProfile = readFileSync(tools + profileRelative);
      writeFileSync(tools + profileRelative, readFileSync(subject + profileRelative));
      rejects(() => prepareRuntimeInputs(args), "source_identity_mismatch");
      writeFileSync(tools + profileRelative, originalProfile);
      // Even a clean tracked symlink cannot substitute the fixed tools profile.
      rmSync(tools + profileRelative); symlinkSync(subject + profileRelative, tools + profileRelative);
      const substitutedCommit = commit();
      rejects(() => prepareRuntimeInputs({ ...args, "tools-commit": substitutedCommit }), "compatibility_profile_untracked");
      git(tools, ["reset", "--hard", toolsCommit]);
      assert.deepEqual(globalPolicy(), before);
      // Reuse the unchanged OCI test fixture generator, substituting only its synthetic source identity.
      let fixtureSource = readFileSync("/cwt/deploy/scripts/preflight-image.test.mjs", "utf8").split('test("verifies an exact OCI index')[0];
      fixtureSource = fixtureSource.replace('from "./preflight-image.mjs"', 'from "file://' + tools + '/deploy/scripts/preflight-image.mjs"')
        .replace('const releaseId = "1".repeat(40)', 'const releaseId = "' + frozen + '"')
        .replace('afterEach(() => { while (roots.length) rmSync(roots.pop(), { recursive: true, force: true }); });', '');
      const { fixture } = await import("data:text/javascript;base64," + Buffer.from(fixtureSource + "; export { fixture };").toString("base64"));
      const value = fixture();
      const recordBefore = readFileSync(value.releasePath);
      const output = "/tmp/materialized.oci", auth = "/tmp/auth.json", oras = "/tmp/synthetic-oras";
      writeFileSync(auth, "{}", { mode: 0o600 });
      const descriptor = JSON.parse(readFileSync(value.layout + "/index.json")).manifests.find((entry) => entry.digest === value.subjectDigest);
      writeFileSync(oras, '#!/usr/local/bin/node\n' +
        'const fs=require("node:fs"); const args=process.argv.slice(2); fs.appendFileSync("/tmp/transport-calls",args[0]+"\\n");' +
        'if(args[0]==="version") console.log("Version: 1.3.3\\nGit commit: 210747c29c1d38732b3194878dfd8b5a6b9ad7eb\\nGit tree state: clean");' +
        'else if(args[0]==="manifest") console.log(' + JSON.stringify(JSON.stringify(descriptor)) + ');' +
        'else if(args[0]==="cp") fs.cpSync(' + JSON.stringify(value.layout) + ',' + JSON.stringify(output) + ',{recursive:true}); else process.exit(1);', { mode: 0o700 });
      const materialize = spawnSync(process.execPath, [tools + "/deploy/scripts/release-registry-integration.mjs", "materialize",
        "--oras", oras, "--auth", auth, "--release", value.releasePath, "--output", output,
        "--github-repository", "czy282923753/cwt-cloudwave-textile", "--release-id", frozen, "--index-digest", value.subjectDigest], { encoding: "utf8" });
      assert.equal(materialize.status, 0, materialize.stderr);
      assert.deepEqual(readFileSync("/tmp/transport-calls", "utf8").trim().split("\n"), ["version", "manifest", "cp"]);
      const input = { ...args, release: value.releasePath, oci: output, image: "ghcr.io/czy282923753/cwt-cloudwave-textile@" + value.subjectDigest };
      prepareRuntimeInputs(input);
      const cli = (overrides = {}) => spawnSync(process.execPath, [tools + "/deploy/scripts/preflight-linux-runtime.mjs", "validate",
        ...Object.entries({ ...input, ...overrides }).flatMap(([key, value]) => ["--" + key, value])], { encoding: "utf8" });
      const rejectedHeader = cli({ image: args.image });
      assert.deepEqual(JSON.parse(rejectedHeader.stderr), { status: "NOT_PASS", reasonCode: "release_identity_mismatch", mismatchFields: ["oci.indexDigest"] });
      assert.equal(existsSync(args.evidence), false);
      const rejectedHandoff = cli({ evidence: "/tmp/root-owned-parent/outcome" });
      assert.equal(rejectedHandoff.status, 1); assert.equal(rejectedHandoff.stdout, "");
      assert.deepEqual(JSON.parse(rejectedHandoff.stderr), { status: "NOT_PASS", reasonCode: "outcome_handoff_invalid" });
      const result = cli();
      assert.equal(result.status, 1);
      const outcome = JSON.parse(readFileSync(args.evidence + "/linux-runtime-validation.json"));
      assert.equal(outcome.reasonCode, "docker_credentials_unavailable");
      assert.equal(outcome.authorities.imageEvidence, "preflight-image");
      assert.equal(outcome.release.releaseId, frozen);
      assert.equal(outcome.release.indexDigest, value.subjectDigest);
      assert.equal(outcome.tools.commit, toolsCommit);
      assert.equal(outcome.tools.compatibilityProfileSha256, createHash("sha256").update(originalProfile).digest("hex"));
      assert.deepEqual(readFileSync(value.releasePath), recordBefore);
      assert.equal(existsSync("/etc/cwt"), false);
      assert.equal(existsSync("/srv/cwt"), false);
      assert.deepEqual(globalPolicy(), before);
      console.log("PASS: mixed revisions, both root/sudo roles, exact roots, profile/paths, transport, sole image authority; native host not reached");
    `;
    const output = execFileSync("docker", [
      "run", "--rm", "--pull", "never", "--network", "none", "--volume", `${sourceRoot}:/cwt:ro`,
      "--volume", `${scratch}:/fixture:ro`, "node:24.14.0-bookworm", "node", "--input-type=module", "--eval", probe,
    ], { encoding: "utf8", maxBuffer: 4 * 1024 * 1024 });
    assert.match(output, /PASS: mixed revisions/u);
  } finally { rmSync(scratch, { recursive: true, force: true }); }
  const source = readFileSync(resolve("deploy/scripts/preflight-linux-runtime.mjs"), "utf8");
  assert.match(source, /run\("git", \["rev-parse", "--show-toplevel"\][^\n]+env: gitEnv/u);
  assert.doesNotMatch(source, /run\("docker"[^\n]+env: gitEnv/u);
  assert.doesNotMatch(source, /safe\.directory|safe-directory/u);
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

test("builds one direct standard-Compose plan with a disposable Scheduler maintenance caller and exactly three steady services", () => {
  const repositoryRoot = resolve(".");
  const plan = createRuntimeCommandPlan({ repositoryRoot, project: "cwt-runtime-proof", imageReference: REFERENCE });
  assert.deepEqual(plan.infrastructureUp.slice(-2), ["postgres", "valkey-staging"]);
  assert.deepEqual(plan.infrastructureFailurePs.slice(-4), ["ps", "--all", "--format", "json"]);
  assert.equal(plan.webUp.at(-1), "web-staging");
  assert.equal(plan.migrate.includes("scheduler-staging"), true);
  assert.equal(plan.migrate.includes("web-staging"), false);
  assert.deepEqual(plan.migrate.slice(-5), ["scheduler-staging", "/app/deploy/backup/pre-deploy", "node", "--import=tsx", "/app/scripts/migrate.ts"]);
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
  assert.equal(plan.configDirectoryMode, 0o700);
  assert.equal(plan.secretFileMode, 0o444);
  assert.equal(plan.runtimeEnvMode, 0o400);
  assert.equal(plan.ownerUid, 0);
  assert.equal(plan.ownerGid, 0);
  assert.equal(plan.configFiles.includes("staging/runtime.env"), true);
  for (const requirement of ["database-url", "auth-session-secret", "valkey-password", "cloudmersive-api-key", "smtp-password", "monitoring-dsn", "ai-api-key", "cos-access-key-id", "cos-secret-key", "backup-password"]) {
    assert.equal(plan.configFiles.includes(`staging/${requirement}`), true);
  }
  assert.deepEqual(plan.stagingStorage, [
    "/srv/cwt/staging/media/public",
    "/srv/cwt/staging/media/private-inquiries",
    "/srv/cwt/staging/media/import",
  ]);
  assert.deepEqual(plan.backupStorage, [
    "/srv/cwt/backups/postgresql/staging",
    "/srv/cwt/backups/sets/staging",
  ]);
  assert.equal(plan.maintenanceLockRoot, "/run/lock/cwt");
  assert.equal(plan.maintenanceLockFile, "/run/lock/cwt/backup-migration.lock");
  assert.equal(plan.maintenanceLockMode, 0o444);
  const runtime = __testOnly.runtimeEnvironment("staging", RELEASE);
  assert.equal(runtime.APP_ENV, "staging");
  assert.equal(runtime.NON_PRODUCTION_NOINDEX, "true");
  assert.equal(runtime.DATABASE_URL, "");
  assert.equal(runtime.AUTH_SESSION_SECRET, "");
  assert.equal(runtime.CWT_RELEASE_ID, RELEASE);
  for (const uid of [999, 10001]) {
    assert.equal(unixModeAllowsRead({ mode: plan.secretFileMode, ownerUid: 0, ownerGid: 0, uid }), true);
    assert.equal(unixModeAllowsRead({ mode: plan.runtimeEnvMode, ownerUid: 0, ownerGid: 0, uid }), false);
  }
  assert.equal(unixModeAllowsRead({ mode: plan.runtimeEnvMode, ownerUid: 0, ownerGid: 0, uid: 0 }), true);
  const source = readFileSync(resolve("deploy/scripts/preflight-linux-runtime.mjs"), "utf8");
  assert.match(source, /chownSync\(path, 0, 0\);\n  chmodSync\(path, 0o444\)/u);
  assert.match(source, /function secureRootDirectory[\s\S]*chmodSync\(path, 0o700\)/u);
  assert.match(source, /runtime\.env"\), 0, 0\);\n      chmodSync\(resolve\(root, "runtime\.env"\), 0o400\)/u);

  const projectName = "cwt-remediation-secret-proof";
  const compose = normalizedCompose(projectName);
  validateComposeGraph(compose, { projectName });
  assert.equal(compose.services.postgres.user, "999:999");
  assert.equal(compose.services["valkey-staging"].user, "999:999");
  assert.equal(compose.services["web-staging"].user, "10001:10001");
  assert.deepEqual(compose.services["web-staging"].env_file, [{ path: "/etc/cwt/staging/runtime.env" }]);
  assert.deepEqual(compose.services.postgres.secrets.map((entry) => entry.source), [
    "postgres-bootstrap-password", "production-database-password", "staging-database-password",
  ]);
  assert.deepEqual(compose.services["valkey-staging"].secrets.map((entry) => entry.source), ["staging-valkey-password"]);
  assert.deepEqual(compose.services["web-staging"].secrets.map((entry) => entry.source).sort(),
    exactProtectedSecretFiles.map((entry) => `staging-${entry.subjectSuffix}`).sort());
  const scheduler = compose.services["scheduler-staging"];
  assert.equal(scheduler.user, "10001:10001");
  assert.deepEqual(scheduler.volumes.filter(entry => entry.target.startsWith("/srv/cwt/backups/")).map(entry => [entry.source, entry.target, entry.read_only]), [
    ["/srv/cwt/backups/postgresql/staging", "/srv/cwt/backups/postgresql/staging", undefined],
    ["/srv/cwt/backups/sets/staging", "/srv/cwt/backups/sets/staging", undefined],
  ]);
  assert.deepEqual(scheduler.volumes.find(entry => entry.target === "/run/cwt/backup-migration.lock"), {
    type: "bind", source: "/run/lock/cwt/backup-migration.lock", target: "/run/cwt/backup-migration.lock", read_only: true, bind: {},
  });
  assert.equal((compose.services["web-staging"].volumes ?? []).some(entry => entry.target?.startsWith("/srv/cwt/backups/") || entry.target === "/run/cwt/backup-migration.lock"), false);
});

test("owns and cleans the synthetic backup roots and shared mutex without replacing pre-existing state", () => {
  const sourceRoot = realpathSync(resolve("."));
  const successfulProbe = String.raw`
    import assert from "node:assert/strict";
    import { existsSync, lstatSync, mkdirSync, writeFileSync } from "node:fs";
    const { __testOnly } = await import("file:///cwt/deploy/scripts/preflight-linux-runtime.mjs");
    const plan = __testOnly.prepareSyntheticHost("${RELEASE}");
    for (const path of plan.backupStorage) {
      const info = lstatSync(path);
      assert.equal(info.isDirectory(), true); assert.equal(info.uid, 10001); assert.equal(info.gid, 10001); assert.equal(info.mode & 0o777, 0o700);
    }
    const lock = lstatSync(plan.maintenanceLockFile);
    assert.equal(lock.isFile(), true); assert.equal(lock.size, 0); assert.equal(lock.uid, 0); assert.equal(lock.gid, 0); assert.equal(lock.mode & 0o777, 0o444);
    __testOnly.removeSyntheticHost(plan);
    for (const path of [plan.configRoot, plan.storageRoot, plan.maintenanceLockRoot]) assert.equal(existsSync(path), false);
    mkdirSync(plan.maintenanceLockRoot); writeFileSync(plan.maintenanceLockFile, "unrelated-pre-existing-state");
    assert.throws(() => __testOnly.prepareSyntheticHost("${RELEASE}"), error => error.code === "runner_not_single_use_clean");
    assert.equal(existsSync(plan.maintenanceLockFile), true);
  `;
  execFileSync("docker", ["run", "--rm", "--pull", "never", "--network", "none",
    "--tmpfs", "/etc:rw,nosuid,nodev,noexec,mode=0755", "--tmpfs", "/srv:rw,nosuid,nodev,noexec,mode=0755",
    "--tmpfs", "/run/lock:rw,nosuid,nodev,noexec,mode=0755", "--volume", `${sourceRoot}:/cwt:ro`,
    "node:24.14.0-bookworm", "node", "--input-type=module", "--eval", successfulProbe]);

  const failedProbe = String.raw`
    import assert from "node:assert/strict";
    import { existsSync } from "node:fs";
    const { __testOnly } = await import("file:///cwt/deploy/scripts/preflight-linux-runtime.mjs");
    assert.throws(() => __testOnly.prepareSyntheticHost("${RELEASE}"), error => error.code === "synthetic_host_setup_failed");
    assert.equal(existsSync("/etc/cwt"), false); assert.equal(existsSync("/srv/cwt"), false); assert.equal(existsSync("/run/lock/cwt"), false);
  `;
  execFileSync("docker", ["run", "--rm", "--pull", "never", "--network", "none", "--read-only",
    "--tmpfs", "/etc:rw,nosuid,nodev,noexec,mode=0755", "--tmpfs", "/srv:rw,nosuid,nodev,noexec,mode=0755",
    "--volume", `${sourceRoot}:/cwt:ro`, "node:24.14.0-bookworm", "node", "--input-type=module", "--eval", failedProbe]);
});

test("hands only the completed Runtime outcome from root to the verified Linux Runner identity", () => {
  const sourceRoot = realpathSync(resolve("."));
  const probe = String.raw`
    import assert from "node:assert/strict";
    import { createHash } from "node:crypto";
    import { chownSync, lstatSync, mkdirSync, readFileSync, readdirSync, symlinkSync, writeFileSync } from "node:fs";
    const { __testOnly } = await import("file:///cwt/deploy/scripts/preflight-linux-runtime.mjs");
    const mode = path => lstatSync(path).mode & 0o777;
    const outcome = { schemaVersion: 1, status: "NOT_PASS", reasonCode: "synthetic_failure", failureDetailCode: null };
    const makeParent = (name, uid = 1000, repositoryUid = 1000) => {
      const parent = "/tmp/" + name;
      const repository = parent + "/release-subject";
      const evidence = parent + "/outcome";
      mkdirSync(parent, { mode: 0o700 }); chownSync(parent, uid, uid);
      mkdirSync(repository, { mode: 0o700 }); chownSync(repository, repositoryUid, repositoryUid);
      mkdirSync(evidence, { mode: 0o700 });
      return { parent, repository, evidence };
    };

    const missingIdentity = makeParent("missing-identity");
    delete process.env.SUDO_UID;
    assert.throws(() => __testOnly.writeOutcome(missingIdentity.evidence, outcome, missingIdentity.repository),
      error => error.code === "source_owner_bridge_missing");
    assert.deepEqual(readdirSync(missingIdentity.evidence), []);

    const wrongParent = makeParent("wrong-parent", 1001);
    process.env.SUDO_UID = "1000";
    assert.throws(() => __testOnly.writeOutcome(wrongParent.evidence, outcome, wrongParent.repository),
      error => error.code === "outcome_handoff_invalid");
    assert.deepEqual(readdirSync(wrongParent.evidence), []);

    const linked = makeParent("linked-output");
    const physical = linked.parent + "/physical";
    mkdirSync(physical, { mode: 0o700 });
    const alias = linked.parent + "/alias";
    symlinkSync(physical, alias);
    assert.throws(() => __testOnly.writeOutcome(alias, outcome, linked.repository),
      error => error.code === "outcome_handoff_invalid");
    assert.deepEqual(readdirSync(physical), []);

    const rootOwned = makeParent("root-owned-handoff", 0, 0);
    delete process.env.SUDO_UID;
    __testOnly.writeOutcome(rootOwned.evidence, outcome, rootOwned.repository);
    assert.equal(lstatSync(rootOwned.evidence).uid, 0); assert.equal(mode(rootOwned.evidence), 0o700);
    for (const name of readdirSync(rootOwned.evidence)) {
      assert.equal(lstatSync(rootOwned.evidence + "/" + name).uid, 0);
      assert.equal(mode(rootOwned.evidence + "/" + name), 0o400);
    }

    const accepted = makeParent("accepted-handoff");
    const unrelated = accepted.parent + "/unrelated-private";
    writeFileSync(unrelated, "unrelated", { mode: 0o400 });
    const unrelatedBefore = lstatSync(unrelated);
    process.env.SUDO_UID = "1000";
    __testOnly.writeOutcome(accepted.evidence, outcome, accepted.repository);
    const names = readdirSync(accepted.evidence).sort();
    assert.deepEqual(names, ["linux-runtime-validation.json", "linux-runtime-validation.json.sha256"]);
    assert.equal(lstatSync(accepted.evidence).uid, 1000); assert.equal(mode(accepted.evidence), 0o700);
    for (const name of names) {
      const info = lstatSync(accepted.evidence + "/" + name);
      assert.equal(info.isFile(), true); assert.equal(info.isSymbolicLink(), false);
      assert.equal(info.uid, 1000); assert.equal(mode(accepted.evidence + "/" + name), 0o400);
    }
    const unrelatedAfter = lstatSync(unrelated);
    assert.equal(unrelatedAfter.uid, unrelatedBefore.uid); assert.equal(unrelatedAfter.gid, unrelatedBefore.gid);
    assert.equal(unrelatedAfter.mode, unrelatedBefore.mode); assert.equal(unrelatedAfter.size, unrelatedBefore.size);

    process.setgid(1000); process.setuid(1000);
    const jsonPath = accepted.evidence + "/linux-runtime-validation.json";
    const checksumPath = jsonPath + ".sha256";
    const jsonBytes = readFileSync(jsonPath);
    assert.deepEqual(JSON.parse(jsonBytes), outcome);
    const digest = createHash("sha256").update(jsonBytes).digest("hex");
    assert.equal(readFileSync(checksumPath, "utf8"), digest + "  linux-runtime-validation.json\n");
    assert.throws(() => readFileSync(unrelated), error => error.code === "EACCES");
    console.log("PASS: root producer handed exact two-file outcome to UID 1000 only");
  `;
  const output = execFileSync("docker", [
    "run", "--rm", "--pull", "never", "--network", "none", "--read-only",
    "--tmpfs", "/tmp:rw,nosuid,nodev,noexec,mode=1777", "--volume", `${sourceRoot}:/cwt:ro`,
    "node:24.14.0-bookworm", "node", "--input-type=module", "--eval", probe,
  ], { encoding: "utf8" });
  assert.match(output, /PASS: root producer handed exact two-file outcome to UID 1000 only/u);
});

test("executes the selected Scheduler pre-deploy Migration with the normalized maintenance mounts", {
  skip: !process.env.CWT_BACKUP_TEST_IMAGE || !process.env.CWT_BACKUP_TEST_DEPS,
  timeout: 180_000,
}, () => {
  const image = process.env.CWT_BACKUP_TEST_IMAGE;
  const dependencies = process.env.CWT_BACKUP_TEST_DEPS;
  const sourceRoot = realpathSync(resolve("."));
  const project = `cwt-runtime-maintenance-${process.pid}`;
  const network = `${project}-database`;
  const container = `${project}-postgres`;
  const holder = `${project}-lock-holder`;
  const volume = (name) => `${project}-${name}`;
  const ownedVolumes = ["postgres", "public", "private", "import", "daily", "sets", "lock", "secrets", "bad-secrets"].map(volume);
  const docker = (args, options = {}) => execFileSync("docker", args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], ...options }).trim();
  const attempt = (args) => { try { docker(args); } catch { /* bounded cleanup continues */ } };
  try {
    docker(["network", "create", "--internal", network]);
    for (const name of ownedVolumes) docker(["volume", "create", name]);
    const setup = String.raw`
      const { chmodSync, chownSync, writeFileSync } = require("node:fs");
      if (process.env.INIT_DATA === "1") {
        for (const path of ["/public", "/private", "/import", "/daily", "/sets"]) { chownSync(path, 10001, 10001); chmodSync(path, 0o700); }
        writeFileSync("/lock/backup-migration.lock", "", { mode: 0o444 }); chownSync("/lock/backup-migration.lock", 0, 0); chmodSync("/lock/backup-migration.lock", 0o444);
      }
      const values = JSON.parse(process.env.SYNTHETIC_SECRET_VALUES);
      for (const [name, value] of Object.entries(values)) { const path = "/secrets/" + name; writeFileSync(path, value, { mode: 0o444 }); chownSync(path, 0, 0); chmodSync(path, 0o444); }
    `;
    const secretValues = Object.fromEntries(exactProtectedSecretFiles.map(({ subjectSuffix }) => [`staging-${subjectSuffix}`, "SYNTHETIC-ONLY-VALUE-0123456789abcdef"]));
    secretValues["staging-database-url"] = "postgres://cwt_staging@postgres:5432/cwt_staging";
    secretValues["staging-monitoring-dsn"] = "https://synthetic@monitoring.invalid/1";
    const setupVolumes = (secretVolume, values, includeData = false) => docker(["run", "--rm", "--pull", "never", "--network", "none",
      ...(includeData ? [
        "--volume", `${volume("public")}:/public`, "--volume", `${volume("private")}:/private`, "--volume", `${volume("import")}:/import`,
        "--volume", `${volume("daily")}:/daily`, "--volume", `${volume("sets")}:/sets`, "--volume", `${volume("lock")}:/lock`,
      ] : []),
      "--volume", `${secretVolume}:/secrets`, "--env", `INIT_DATA=${includeData ? "1" : "0"}`,
      "--env", `SYNTHETIC_SECRET_VALUES=${JSON.stringify(values)}`, image, "node", "--eval", setup]);
    setupVolumes(volume("secrets"), secretValues, true);
    setupVolumes(volume("bad-secrets"), { ...secretValues, "staging-database-url": "postgres://cwt_staging@unreachable.invalid:5432/cwt_staging" });

    docker(["run", "--detach", "--name", container, "--network", network, "--network-alias", "postgres",
      "--env", "POSTGRES_HOST_AUTH_METHOD=trust", "--volume", `${volume("postgres")}:/var/lib/postgresql`, image]);
    for (let attemptNumber = 0; attemptNumber < 30; attemptNumber++) {
      const ready = spawnSync("docker", ["exec", "--env", "PGUSER=postgres", container, "pg_isready", "--quiet"]);
      if (ready.status === 0) break;
      if (attemptNumber === 29) assert.fail("Synthetic PostgreSQL did not become ready");
      execFileSync("sleep", ["1"]);
    }
    docker(["exec", "--env", "PGUSER=postgres", container, "psql", "-Xq", "-v", "ON_ERROR_STOP=1", "-c", "CREATE ROLE cwt_staging LOGIN"]);
    docker(["exec", "--env", "PGUSER=postgres", container, "psql", "-Xq", "-v", "ON_ERROR_STOP=1", "-c", "CREATE DATABASE cwt_staging OWNER cwt_staging"]);

    const plan = createRuntimeCommandPlan({ repositoryRoot: sourceRoot, project, imageReference: REFERENCE });
    const normalized = normalizedCompose(project);
    validateComposeGraph(normalized, { projectName: project });
    const drizzleIndex = plan.migrate.indexOf("--volume");
    const selectedService = plan.migrate[drizzleIndex + 2];
    const selectedCommand = plan.migrate.slice(drizzleIndex + 3);
    assert.equal(selectedService, "scheduler-staging");
    assert.deepEqual(selectedCommand, ["/app/deploy/backup/pre-deploy", "node", "--import=tsx", "/app/scripts/migrate.ts"]);
    const service = normalized.services[selectedService];
    const targetVolumes = new Map([
      ["/srv/cwt/staging/media/public", volume("public")], ["/srv/cwt/staging/media/private-inquiries", volume("private")],
      ["/srv/cwt/staging/media/import", volume("import")], ["/srv/cwt/backups/postgresql/staging", volume("daily")],
      ["/srv/cwt/backups/sets/staging", volume("sets")],
    ]);
    const runtime = __testOnly.runtimeEnvironment("staging", RELEASE);
    const runSelected = ({ lock = true, secretVolume = volume("secrets"), command = selectedCommand } = {}) => {
      const args = ["run", "--rm", "--pull", "never", "--network", network, "--user", service.user, "--workdir", "/app"];
      if (service.read_only) args.push("--read-only");
      for (const capability of service.cap_drop ?? []) args.push("--cap-drop", capability);
      for (const option of service.security_opt ?? []) args.push("--security-opt", option);
      for (const value of service.tmpfs ?? []) args.push("--tmpfs", value);
      for (const [name, value] of Object.entries({ ...runtime, ...service.environment })) args.push("--env", `${name}=${value}`);
      args.push("--volume", `${sourceRoot}:/app:ro`, "--volume", `${dependencies}:/app/node_modules:ro`, "--volume", `${secretVolume}:/run/secrets:ro`);
      for (const mount of service.volumes ?? []) {
        if (mount.target === "/run/cwt/backup-migration.lock") {
          if (lock) args.push("--mount", `type=volume,src=${volume("lock")},dst=${mount.target},volume-subpath=backup-migration.lock,readonly`);
        } else {
          const source = targetVolumes.get(mount.target);
          assert.ok(source, `unmapped normalized Scheduler mount: ${mount.target}`);
          args.push("--volume", `${source}:${mount.target}${mount.read_only ? ":ro" : ""}`);
        }
      }
      args.push("--volume", `${sourceRoot}/drizzle:/app/drizzle:ro`, image, ...command);
      return spawnSync("docker", args, { encoding: "utf8" });
    };

    const missing = runSelected({ lock: false, secretVolume: volume("bad-secrets") });
    assert.equal(missing.status, 1); assert.match(missing.stderr, /maintenance-mutex-file/u); assert.doesNotMatch(missing.stderr, /database-major/u);

    docker(["run", "--detach", "--name", holder, "--network", "none", "--mount", `type=volume,src=${volume("lock")},dst=/run/cwt,readonly`, image,
      "sh", "-c", "exec 8</run/cwt/backup-migration.lock; flock 8; echo ready; sleep 300"]);
    for (let attemptNumber = 0; attemptNumber < 30 && !docker(["logs", holder]).includes("ready"); attemptNumber++) execFileSync("sleep", ["1"]);
    assert.match(docker(["logs", holder]), /ready/u);
    const busy = runSelected({ secretVolume: volume("bad-secrets") });
    assert.equal(busy.status, 75); assert.match(busy.stderr, /already active/u); assert.doesNotMatch(busy.stderr, /database-major/u);
    docker(["rm", "--force", holder]);

    const completed = runSelected();
    assert.equal(completed.status, 0, completed.stderr); assert.match(completed.stdout, /Database migrations applied/u);
    const verified = runSelected({ command: ["sh", "-eu", "-c", "set -- /srv/cwt/backups/postgresql/staging/pre-deploy/*; test \"$#\" -eq 1; /app/deploy/backup/verify-backup-set \"$1\" >/dev/null; test -f \"$1/complete.json\""] });
    assert.equal(verified.status, 0, verified.stderr);
    const migrations = Number(docker(["exec", "--env", "PGUSER=cwt_staging", "--env", "PGDATABASE=cwt_staging", container,
      "psql", "-XAtq", "-v", "ON_ERROR_STOP=1", "-c", "SELECT count(*) FROM drizzle.__drizzle_migrations"]));
    assert.ok(migrations > 0);
  } finally {
    attempt(["rm", "--force", holder]);
    attempt(["rm", "--force", container]);
    for (const name of ownedVolumes) attempt(["volume", "rm", name]);
    attempt(["network", "rm", network]);
  }
});

test("rejects caller profile substitution and retains only the tools-tracked compatibility path", () => {
  const required = [
    "validate", "--release", "/release.json", "--oci", "/subject.oci", "--image", REFERENCE,
    "--evidence", "/evidence", "--token", "runtime-proof", "--repository", "/subject", "--tools-commit", RELEASE,
  ];
  assert.equal(__testOnly.parseArguments(required).profile, undefined);
  assert.throws(() => __testOnly.parseArguments(required.slice(0, -4)), /arguments are invalid/u);
  assert.throws(() => __testOnly.parseArguments(required.slice(0, -2)), /arguments are invalid/u);
  assert.throws(() => __testOnly.parseArguments([...required, "--profile", "/tmp/unreviewed.json"]), /arguments are invalid/u);
  const source = readFileSync(resolve("deploy/scripts/preflight-linux-runtime.mjs"), "utf8");
  assert.match(source, /exactExistingPath\(DEFAULT_PROFILE, "compatibility profile"/u);
  assert.doesNotMatch(source, /args\.profile/u);
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

test("reuses existing authorities while preserving the PASS/NOT_PASS boundary and no revocation calls", () => {
  const source = readFileSync(resolve("deploy/scripts/preflight-linux-runtime.mjs"), "utf8");
  assert.match(source, /import \{ sha256File, verifyReleaseRecord \} from "\.\/preflight-image\.mjs"/u);
  assert.match(source, /import \{ exactProtectedSecretFiles, validateComposeGraph \} from "\.\/preflight-compose-graph\.mjs"/u);
  assert.match(source, /\/app\/scripts\/check-public-bundle\.mjs/u);
  assert.match(source, /status = mainFailure \? "NOT_PASS" : "PASS"/u);
  assert.doesNotMatch(source, /classifyValidationFailure|createRevocation|preflight-release-compose/u);
  assert.doesNotMatch(source, /OWNER_DIND_REFERENCE|docker:\d[^\n]*-dind/u);
  assert.match(source, /automaticRetry: false, automaticRevocation: false/u);
  const capture = source.indexOf("infrastructureFailureServices = collectInfrastructureFailureServices");
  const originalFailure = source.indexOf('refuse("compose_infrastructure_up_failed"');
  const teardown = source.indexOf('run("docker", plan.down');
  assert.ok(capture > 0 && capture < originalFailure && originalFailure < teardown);
  assert.match(source, /mainFailure\?\.code === "compose_infrastructure_up_failed" \? \{ infrastructureFailureServices: infrastructureFailureServices \?\? null \} : \{\}/u);
});

test("runtime workflow always retains only the existing sanitized outcome and checksum", () => {
  const workflow = readFileSync(resolve(".github/workflows/cwt-runtime-validation.yml"), "utf8");
  const upload = workflow.split("      - name: Retain only the sanitized Runtime outcome\n")[1];
  assert.ok(upload);
  assert.match(upload, /if: \$\{\{ always\(\) \}\}/u);
  assert.match(upload, /actions\/upload-artifact@ea165f8d65b6e75b540449e92b4886f43607fa02/u);
  assert.match(upload, /cwt-runtime-outcome\/linux-runtime-validation\.json\n/u);
  assert.match(upload, /cwt-runtime-outcome\/linux-runtime-validation\.json\.sha256\n/u);
  assert.match(upload, /if-no-files-found: ignore/u);
  assert.match(upload, /retention-days: 30/u);
  assert.doesNotMatch(upload, /subject\.oci|release\.json|registry|auth|token|stderr|\.log/u);
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
