import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { test } from "node:test";

import {
  OWNER_DIND_REFERENCE,
  __testOnly,
  assertExclusiveStore,
  classifyValidationFailure,
  cleanupPreservingPrimary,
  createOwnerControllerPlan,
  createValidationPlan,
  digestQualifiedReference,
  ownerDockerArgs,
  ownerHelperArgs,
  ownerResources,
  validateOwnerControllerPlan,
  validateResolvedIdentity,
  validateValidationPlan,
} from "./preflight-release-compose.mjs";

const index = `sha256:${"a".repeat(64)}`;
const child = `sha256:${"b".repeat(64)}`;
const revision = "c".repeat(40);
const outerHost = "unix:///outer/docker.sock";
const token = "cwt-proof-1234";
const resources = ownerResources(token);
const ownerHost = resources.ownerHost;
const qualified = `cwt.local/release@${index}`;
const tag = `cwt.local/release:${revision}`;
const repositoryRoot = "/workspace/cwt";
const workspace = "/tmp/cwt-proof-workspace";

function disposableWorkspace() {
  const parent = mkdtempSync(resolve(tmpdir(), "cwt-release-finalizer-test-"));
  return { parent, workspace: mkdtempSync(resolve(parent, "workspace-")) };
}

function mutableControllerPlan() {
  const plan = createOwnerControllerPlan({ token, outerHost, repositoryRoot, workspace });
  return {
    resources: { ...plan.resources },
    volumeCreate: plan.volumeCreate.map((command) => [...command]),
    controllerRun: [...plan.controllerRun],
    readiness: [...plan.readiness],
    diagnostics: plan.diagnostics.map((command) => [...command]),
    cleanup: plan.cleanup.map((command) => [...command]),
    finalization: plan.finalization.map((command) => [...command]),
  };
}

test("pins one private DIND controller with exact resources and pull-never isolation", () => {
  const plan = createOwnerControllerPlan({ token, outerHost, repositoryRoot, workspace });
  assert.equal(plan.controllerRun.includes(OWNER_DIND_REFERENCE), true);
  assert.equal(plan.controllerRun.join(" ").includes("--pull never"), true);
  assert.equal(plan.controllerRun.join(" ").includes("--network none"), true);
  assert.equal(plan.controllerRun.includes("--privileged"), true);
  assert.equal(plan.controllerRun.includes("--rm"), false);
  assert.equal(plan.controllerRun.includes("--pid"), false);
  assert.equal(plan.controllerRun.some((value) => value === "--publish" || value === "-p"), false);
  assert.deepEqual(plan.volumeCreate.map((command) => command.at(-1)), [resources.apiVolume, resources.dockerDataVolume, resources.containerdDataVolume]);
  assert.equal(plan.controllerRun.join(" ").includes(`--exec-root=${resources.execRoot}`), true);
  assert.equal(plan.controllerRun.join(" ").includes("containerd.sock"), false);
  assert.equal(plan.controllerRun.join(" ").includes("nsenter"), false);
  assert.equal(plan.controllerRun.join(" ").includes("tcp://"), false);
  assert.equal(plan.readiness.slice(0, 4).join(" "), `docker --host ${outerHost} run`);
});

test("projects repository, workspace, configuration, storage and journal at identical paths", () => {
  const rendered = createOwnerControllerPlan({ token, outerHost, repositoryRoot, workspace }).controllerRun.join(" ");
  for (const expected of [
    `source=${repositoryRoot},target=${repositoryRoot},readonly`,
    `source=${workspace},target=${workspace}`,
    "source=/etc/cwt,target=/etc/cwt,readonly",
    "source=/srv/cwt,target=/srv/cwt",
    "source=/run/systemd/journal,target=/run/systemd/journal",
  ]) assert.equal(rendered.includes(expected), true);
});

test("every owner helper mounts only the run API transport and contains no nsenter or TCP endpoint", () => {
  const helper = ownerHelperArgs({ resources, outerHost, mounts: [[repositoryRoot, true], [workspace]], args: ["image", "inspect", qualified] });
  const rendered = helper.join(" ");
  assert.equal(rendered.includes(`source=${resources.apiVolume},target=${resources.apiRoot}`), true);
  assert.equal(rendered.startsWith(`docker --host ${outerHost} run`), true);
  assert.equal(rendered.includes(`docker --host ${resources.ownerHost}`), true);
  assert.equal(rendered.includes("nsenter"), false);
  assert.equal(rendered.includes("tcp://"), false);
  assert.equal(rendered.includes("--privileged"), false);
  assert.deepEqual(ownerDockerArgs(ownerHost, ["image", "inspect", qualified]), ["docker", "--host", ownerHost, "image", "inspect", qualified]);
  assert.throws(() => ownerDockerArgs("tcp://127.0.0.1:2375", ["info"]), /private Unix socket/u);
});

test("accepts conventional moby namespaces only on the genuinely private exec-root address", () => {
  const outer = { address: "/run/containerd/containerd.sock", containersNamespace: "moby", pluginsNamespace: "plugins.moby" };
  assert.deepEqual(assertExclusiveStore(
    { address: `${resources.execRoot}/containerd/containerd.sock`, containersNamespace: "moby", pluginsNamespace: "plugins.moby" },
    outer,
    resources.execRoot,
  ), { socketIdentityClass: "private-containerd-socket", containerdAddressClass: "run-unique-exec-root", namespace: "moby", pluginsNamespace: "plugins.moby" });
  assert.throws(() => assertExclusiveStore(outer, outer, resources.execRoot), /shares the outer/u);
  assert.throws(() => assertExclusiveStore(
    { address: "/run/containerd/containerd.sock", containersNamespace: "cwt-private", pluginsNamespace: "plugins.cwt-private" },
    outer,
    resources.execRoot,
  ), /shares the outer/u);
});

test("rejects controller mutations for shared mounts, missing paths or volumes, TCP and host authority", () => {
  for (const mutate of [
    (plan) => { plan.controllerRun.splice(plan.controllerRun.indexOf(OWNER_DIND_REFERENCE), 0, "--pid", "host"); },
    (plan) => { plan.controllerRun.splice(plan.controllerRun.indexOf(OWNER_DIND_REFERENCE), 0, "--publish", "2375:2375"); },
    (plan) => { plan.controllerRun[plan.controllerRun.indexOf("none")] = "host"; },
    (plan) => { plan.controllerRun.splice(plan.controllerRun.indexOf(OWNER_DIND_REFERENCE), 0, "--mount", "type=bind,source=/var/run/docker.sock,target=/var/run/docker.sock"); },
    (plan) => { const indexValue = plan.controllerRun.findIndex((value) => value.includes("owner-containerd-data")); plan.controllerRun.splice(indexValue - 1, 2); },
    (plan) => { const indexValue = plan.controllerRun.findIndex((value) => value.includes("source=/srv/cwt")); plan.controllerRun.splice(indexValue - 1, 2); },
    (plan) => { plan.controllerRun[plan.controllerRun.findIndex((value) => value.startsWith("--host=unix://"))] = "--host=tcp://0.0.0.0:2375"; },
  ]) {
    const plan = mutableControllerPlan(); mutate(plan);
    assert.throws(() => validateOwnerControllerPlan(plan, { outerHost, repositoryRoot, workspace }), /controller plan|isolation boundary/u);
  }
});

test("requires inspect and complete timestamped logs before exact controller removal", () => {
  const plan = mutableControllerPlan();
  assert.equal(validateOwnerControllerPlan(plan, { outerHost, repositoryRoot, workspace }), true);
  plan.diagnostics.pop();
  assert.throws(() => validateOwnerControllerPlan(plan, { outerHost, repositoryRoot, workspace }), /diagnostics or cleanup order/u);
  const reordered = mutableControllerPlan();
  const waitIndex = reordered.cleanup.findIndex((command) => command.includes("wait"));
  const removeIndex = reordered.cleanup.findIndex((command) => command.includes("rm") && command.includes(resources.controller));
  [reordered.cleanup[waitIndex], reordered.cleanup[removeIndex]] = [reordered.cleanup[removeIndex], reordered.cleanup[waitIndex]];
  assert.throws(() => validateOwnerControllerPlan(reordered, { outerHost, repositoryRoot, workspace }), /diagnostics or cleanup order/u);
});

test("plans every release image and Compose operation through the one private owner", () => {
  const plan = createValidationPlan({ ownerHost, outerHost, releaseId: revision, indexDigest: index, childDigest: child, project: "cwt-release-proof" });
  assert.equal(plan.every((command) => command.endpoint === "owner" && command.argv[2] === ownerHost), true);
  assert.equal(plan.find((command) => command.operation === "compose-up").composeReference, qualified);
  assert.ok(plan.findIndex((command) => command.operation === "image-rm") > plan.findIndex((command) => command.operation === "zero-consumers"));
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
  for (const mutation of [{ expectedIndex: `sha256:${"d".repeat(64)}` }, { expectedChild: `sha256:${"e".repeat(64)}` }, { expectedRevision: "f".repeat(40) }]) {
    assert.throws(() => validateResolvedIdentity({ expectedIndex: index, expectedChild: child, expectedRevision: revision, neutralInspection: neutral, platformInspection: platform, ...mutation }), /drifted/u);
  }
});

test("keeps harness/process and authenticated subject failures prospectively separate", () => {
  assert.deepEqual(classifyValidationFailure(new Error("daemon unavailable"), { gateOpen: false, cleanup: false }), { failureClass: "harness_pre_gate", revoke: false });
  assert.deepEqual(classifyValidationFailure(new Error("cleanup"), { gateOpen: true, cleanup: true }), { failureClass: "harness_cleanup", revoke: false });
  assert.deepEqual(classifyValidationFailure(__testOnly.subjectFailure(), { gateOpen: true, cleanup: false }), { failureClass: "subject", revoke: true });
});

test("cleanup never masks the primary error", async () => {
  const primary = new Error("primary setup failure");
  await assert.rejects(() => cleanupPreservingPrimary(primary, async () => { throw new Error("cleanup failure"); }), (error) => {
    assert.strictEqual(error, primary);
    assert.equal(error.cleanupFailure, "cleanup failure");
    return true;
  });
  assert.equal(await cleanupPreservingPrimary(undefined, async () => "clean"), "clean");
});

test("keeps root Compose positive singular and direct roles digest-qualified without published ports", () => {
  assert.deepEqual(__testOnly.EXACT_SERVICES, ["postgres", "valkey-production", "valkey-staging", "web-production", "web-staging"]);
  const args = __testOnly.directAppArgs({ name: "cwt-release-direct", platform: "linux/arm64", qualified });
  assert.ok(args.includes(qualified));
  assert.equal(args.some((value) => value === "--publish" || String(value).startsWith("-p")), false);
  const compose = __testOnly.composeArgs({ resources, outerHost, project: "cwt-release-proof", repositoryRoot, composeFile: `${repositoryRoot}/compose.yaml`, environment: {}, args: ["up", "--pull", "never", "--no-build"] });
  assert.equal(compose.join(" ").includes("nsenter"), false);
  assert.equal(compose.join(" ").includes(`source=${resources.apiVolume},target=${resources.apiRoot}`), true);
});

test("synthetic workspace finalization preserves success and primary failure without residue", () => {
  const { parent, workspace: localWorkspace } = disposableWorkspace();
  const primaryResult = Object.freeze({ status: "primary-result" });
  try {
    const configRoot = __testOnly.createSyntheticConfiguration(localWorkspace, revision);
    for (const directory of [configRoot, resolve(configRoot, "postgres"), resolve(configRoot, "production"), resolve(configRoot, "staging")]) assert.equal(statSync(directory).mode & 0o777, 0o700);
    assert.match(readFileSync(resolve(configRoot, ".cwt-release-validation"), "utf8"), /synthetic release validation/u);
    const result = (() => { try { return primaryResult; } finally { __testOnly.removeExactSyntheticWorkspace(localWorkspace); } })();
    assert.strictEqual(result, primaryResult);
    assert.equal(existsSync(localWorkspace), false);
  } finally { rmSync(parent, { recursive: true, force: true }); }

  const blocked = disposableWorkspace();
  const primaryError = new Error("synthetic blocked pre-gate assertion");
  let caught;
  try {
    __testOnly.createSyntheticConfiguration(blocked.workspace, revision);
    try { try { throw primaryError; } finally { __testOnly.removeExactSyntheticWorkspace(blocked.workspace); } } catch (error) { caught = error; }
    assert.strictEqual(caught, primaryError);
    assert.equal(existsSync(blocked.workspace), false);
  } finally { rmSync(blocked.parent, { recursive: true, force: true }); }
});
