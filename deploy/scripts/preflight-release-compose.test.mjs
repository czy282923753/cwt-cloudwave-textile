import assert from "node:assert/strict";
import { existsSync, mkdtempSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { test } from "node:test";

import {
  __testOnly,
  assertExclusiveStore,
  classifyValidationFailure,
  createValidationPlan,
  digestQualifiedReference,
  ownerDockerArgs,
  validateResolvedIdentity,
  validateValidationPlan,
} from "./preflight-release-compose.mjs";

const index = `sha256:${"a".repeat(64)}`;
const child = `sha256:${"b".repeat(64)}`;
const revision = "c".repeat(40);
const ownerHost = "tcp://127.0.0.1:23751";
const outerHost = "unix:///outer/docker.sock";
const qualified = `cwt.local/release@${index}`;
const tag = `cwt.local/release:${revision}`;

function disposableWorkspace() {
  const parent = mkdtempSync(resolve(tmpdir(), "cwt-release-finalizer-test-"));
  return { parent, workspace: mkdtempSync(resolve(parent, "workspace-")) };
}

test("accepts only an exclusive owner containerd tuple", () => {
  assert.deepEqual(assertExclusiveStore(
    { address: "/run/containerd/containerd.sock", containersNamespace: "cwt-release-a", pluginsNamespace: "plugins.cwt-release-a" },
    { address: "/run/containerd/containerd.sock", containersNamespace: "moby", pluginsNamespace: "plugins.moby" },
  ), { socketIdentityClass: "shared-socket-isolated-namespace", namespace: "cwt-release-a" });
  assert.throws(() => assertExclusiveStore(
    { address: "/run/containerd/containerd.sock", containersNamespace: "moby", pluginsNamespace: "plugins.moby" },
    { address: "/run/containerd/containerd.sock", containersNamespace: "moby", pluginsNamespace: "plugins.moby" },
  ), /shares the outer/u);
});

test("plans every release image, Compose, inspection and cleanup operation through one explicit owner", () => {
  const plan = createValidationPlan({ ownerHost, outerHost, releaseId: revision, indexDigest: index, childDigest: child, project: "cwt-release-proof" });
  assert.equal(plan.every((command) => command.endpoint === "owner" && command.argv[0] === "docker" && command.argv[1] === "--host" && command.argv[2] === ownerHost), true);
  assert.equal(plan.find((command) => command.operation === "compose-up").composeReference, qualified);
  assert.ok(plan.findIndex((command) => command.operation === "image-rm") > plan.findIndex((command) => command.operation === "zero-consumers"));
  assert.deepEqual(ownerDockerArgs(ownerHost, ["image", "inspect", qualified]), ["docker", "--host", ownerHost, "image", "inspect", qualified]);
});

test("rejects tag-only Compose authority, outer deletion and early image cleanup mutations", () => {
  assert.throws(() => digestQualifiedReference("cwt.local/release", tag), /not the exact/u);
  const plan = [...createValidationPlan({ ownerHost, outerHost, releaseId: revision, indexDigest: index, childDigest: child, project: "cwt-release-proof" })].map((entry) => ({ ...entry, argv: [...entry.argv] }));
  const removal = plan.find((command) => command.operation === "image-rm");
  removal.endpoint = "outer";
  assert.throws(() => validateValidationPlan(plan, { ownerHost, qualified, tag }), /escapes the one explicit owner/u);
  removal.endpoint = "owner";
  const removalIndex = plan.indexOf(removal); plan.splice(removalIndex, 1); plan.splice(2, 0, removal);
  assert.throws(() => validateValidationPlan(plan, { ownerHost, qualified, tag }), /cleanup occurs before/u);
});

test("binds same-daemon index, native child and source revision exactly", () => {
  const neutral = { Descriptor: { digest: index }, RepoDigests: [qualified] };
  const platform = { Descriptor: { digest: child }, Config: { Labels: { "org.opencontainers.image.revision": revision } } };
  assert.equal(validateResolvedIdentity({ expectedIndex: index, expectedChild: child, expectedRevision: revision, neutralInspection: neutral, platformInspection: platform }), true);
  for (const mutation of [
    { expectedIndex: `sha256:${"d".repeat(64)}` },
    { expectedChild: `sha256:${"e".repeat(64)}` },
    { expectedRevision: "f".repeat(40) },
  ]) assert.throws(() => validateResolvedIdentity({ expectedIndex: index, expectedChild: child, expectedRevision: revision, neutralInspection: neutral, platformInspection: platform, ...mutation }), /drifted/u);
});

test("keeps harness/process and authenticated subject failures prospectively separate", () => {
  assert.deepEqual(classifyValidationFailure(new Error("daemon unavailable"), { gateOpen: false, cleanup: false }), { failureClass: "harness_pre_gate", revoke: false });
  assert.deepEqual(classifyValidationFailure(new Error("cleanup"), { gateOpen: true, cleanup: true }), { failureClass: "harness_cleanup", revoke: false });
  assert.deepEqual(classifyValidationFailure(__testOnly.subjectFailure(), { gateOpen: true, cleanup: false }), { failureClass: "subject", revoke: true });
});

test("keeps root Compose positive singular and direct roles digest-qualified without published ports", () => {
  assert.deepEqual(__testOnly.EXACT_SERVICES, ["postgres", "valkey-production", "valkey-staging", "web-production", "web-staging"]);
  const args = __testOnly.directAppArgs({ name: "cwt-release-direct", platform: "linux/arm64", qualified });
  assert.ok(args.includes(qualified));
  assert.equal(args.some((value) => value === "--publish" || String(value).startsWith("-p")), false);
  assert.equal(args.includes("--platform"), true);
});

test("successful synthetic workspace finalization returns the primary result and removes the exact workspace", () => {
  const { parent, workspace } = disposableWorkspace();
  const primaryResult = Object.freeze({ status: "primary-result" });
  try {
    const configRoot = __testOnly.createSyntheticConfiguration(workspace, revision);
    for (const directory of [configRoot, resolve(configRoot, "postgres"), resolve(configRoot, "production"), resolve(configRoot, "staging")]) {
      assert.equal(statSync(directory).mode & 0o777, 0o700);
    }
    for (const file of [
      resolve(configRoot, ".cwt-release-validation"),
      resolve(configRoot, "postgres/bootstrap-password"),
      resolve(configRoot, "production/runtime.env"),
      resolve(configRoot, "production/database-password"),
      resolve(configRoot, "staging/runtime.env"),
      resolve(configRoot, "staging/database-password"),
    ]) assert.equal(statSync(file).mode & 0o777, 0o444);
    const result = (() => {
      try { return primaryResult; }
      finally { __testOnly.removeExactSyntheticWorkspace(workspace); }
    })();
    assert.strictEqual(result, primaryResult);
    assert.equal(existsSync(workspace), false);
  } finally {
    rmSync(parent, { recursive: true, force: true });
  }
});

test("blocked pre-gate finalization rethrows the same primary error and leaves zero secret residue", () => {
  const { parent, workspace } = disposableWorkspace();
  const primaryError = new Error("synthetic blocked pre-gate assertion");
  let caught;
  try {
    __testOnly.createSyntheticConfiguration(workspace, revision);
    try {
      try { throw primaryError; }
      finally { __testOnly.removeExactSyntheticWorkspace(workspace); }
    } catch (error) { caught = error; }
    assert.strictEqual(caught, primaryError);
    assert.equal(existsSync(workspace), false);
  } finally {
    rmSync(parent, { recursive: true, force: true });
  }
});
