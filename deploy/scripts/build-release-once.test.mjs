import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { copyFileSync, mkdtempSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { afterEach, test } from "node:test";

import { materializeScoutOciBlobs, verifyLoadedBundle } from "./build-release-once.mjs";

const roots = [];
afterEach(() => { while (roots.length) rmSync(roots.pop(), { recursive: true, force: true }); });

function fixture() {
  const root = mkdtempSync(resolve(tmpdir(), "cwt-build-once-copy-test-")); roots.push(root);
  const layout = resolve(root, "subject.oci");
  const childLayout = resolve(root, "amd64.scout.oci");
  const sourceBlobs = resolve(layout, "blobs/sha256");
  mkdirSync(sourceBlobs, { recursive: true });
  const digests = {
    manifest: `sha256:${"1".repeat(64)}`,
    config: `sha256:${"2".repeat(64)}`,
    sharedLayer: `sha256:${"3".repeat(64)}`,
    missing: `sha256:${"4".repeat(64)}`,
  };
  const writeBlob = (digest, value) => writeFileSync(resolve(sourceBlobs, digest.slice(7)), value);
  writeBlob(digests.manifest, "manifest\n");
  writeBlob(digests.config, "config\n");
  writeBlob(digests.sharedLayer, "shared-layer\n");
  return { childLayout, digests, layout, sourceBlobs, writeBlob };
}

test("keeps the direct Build Once CLI fail-closed while allowing focused helper import", () => {
  const run = spawnSync(process.execPath, [resolve("deploy/scripts/build-release-once.mjs")], { encoding: "utf8" });
  assert.equal(run.status, 1);
  assert.match(run.stderr, /Build-once refused: --output is required/u);
});

test("the locked production-only install can bootstrap the shipped AST checker", () => {
  const root = mkdtempSync(resolve(tmpdir(), "cwt-build-once-production-dependencies-")); roots.push(root);
  for (const name of [".npmrc", "package.json", "pnpm-lock.yaml", "pnpm-workspace.yaml"]) {
    copyFileSync(resolve(name), resolve(root, name));
  }
  mkdirSync(resolve(root, "scripts"));
  copyFileSync(resolve("scripts/check-public-bundle.mjs"), resolve(root, "scripts/check-public-bundle.mjs"));
  const install = spawnSync("pnpm", [
    "install", "--prod", "--offline", "--frozen-lockfile", "--trust-lockfile", "--ignore-scripts",
  ], { cwd: root, encoding: "utf8", env: { ...process.env, CI: "1" } });
  assert.equal(install.status, 0, `${install.stdout}\n${install.stderr}`);
  const check = spawnSync(process.execPath, ["scripts/check-public-bundle.mjs"], {
    cwd: root,
    encoding: "utf8",
    env: { ...process.env, CWT_BUILD_DIR: resolve(root, "missing-build") },
  });
  assert.equal(check.status, 1);
  assert.deepEqual(JSON.parse(check.stdout), { schemaVersion: 1, reasonCode: "bundle_assertion_or_unknown_failed" });
  assert.doesNotMatch(check.stderr, /ERR_MODULE_NOT_FOUND|Cannot find package 'typescript'/u);
  assert.match(check.stderr, /requires a fresh production build/u);
});

test("runs every emitted child bundle checker under the Runtime restriction envelope and rejects failure", () => {
  for (const platform of ["linux/amd64", "linux/arm64"]) {
    let invocation;
    verifyLoadedBundle("cwt.local/release:test", platform, (command, args, options) => {
      invocation = { command, args, options };
      return { status: 0 };
    });
    assert.equal(invocation.command, "docker");
    assert.deepEqual(invocation.args, [
      "run", "--rm", "--pull", "never", "--platform", platform, "--network", "none",
      "--read-only", "--user", "10001:10001", "--cap-drop", "ALL", "--security-opt", "no-new-privileges:true",
      "--env", "CWT_BUILD_DIR=/app/.next/standalone/.next", "--entrypoint", "node", "cwt.local/release:test",
      "/app/scripts/check-public-bundle.mjs",
    ]);
    assert.equal(invocation.options.stdio, "inherit");
  }
  assert.throws(
    () => verifyLoadedBundle("cwt.local/release:test", "linux/amd64", () => ({ status: 1 })),
    /linux\/amd64 emitted Product bundle authority failed/u,
  );
});

test("materializes each Scout OCI blob once when the image descriptor repeats a layer digest", () => {
  const value = fixture();
  const child = {
    manifestDigest: value.digests.manifest,
    configDigest: value.digests.config,
    layers: [value.digests.sharedLayer, value.digests.sharedLayer],
  };
  const descriptorOrder = [...child.layers];

  materializeScoutOciBlobs(value.layout, child, value.childLayout);

  assert.deepEqual(child.layers, descriptorOrder);
  const destination = resolve(value.childLayout, "blobs/sha256");
  assert.deepEqual(readdirSync(destination).sort(), [
    value.digests.manifest.slice(7),
    value.digests.config.slice(7),
    value.digests.sharedLayer.slice(7),
  ].sort());
  for (const digest of [value.digests.manifest, value.digests.config, value.digests.sharedLayer]) {
    assert.equal(statSync(resolve(destination, digest.slice(7))).ino, statSync(resolve(value.sourceBlobs, digest.slice(7))).ino);
  }
});

test("refuses a missing source blob instead of producing an incomplete Scout layout", () => {
  const value = fixture();
  assert.throws(
    () => materializeScoutOciBlobs(value.layout, {
      manifestDigest: value.digests.manifest,
      configDigest: value.digests.missing,
      layers: [],
    }, value.childLayout),
    (error) => error?.code === "ENOENT",
  );
});

test("refuses a genuinely preexisting destination blob without overwriting it", () => {
  const value = fixture();
  const destination = resolve(value.childLayout, "blobs/sha256");
  mkdirSync(destination, { recursive: true });
  const preexisting = resolve(destination, value.digests.manifest.slice(7));
  writeFileSync(preexisting, "different-existing-bytes\n");

  assert.throws(
    () => materializeScoutOciBlobs(value.layout, {
      manifestDigest: value.digests.manifest,
      configDigest: value.digests.config,
      layers: [value.digests.sharedLayer],
    }, value.childLayout),
    (error) => error?.code === "EEXIST",
  );
  assert.equal(readFileSync(preexisting, "utf8"), "different-existing-bytes\n");
});
