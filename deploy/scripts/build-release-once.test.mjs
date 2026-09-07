import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { copyFileSync, mkdtempSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, resolve } from "node:path";
import { afterEach, test } from "node:test";

import { materializeScoutOciBlobs, verifyLoadedBundle } from "./build-release-once.mjs";

const roots = [];
afterEach(() => { while (roots.length) rmSync(roots.pop(), { recursive: true, force: true }); });

const promptTuples = [
  ["fabric-knowledge-draft", 1, "b3b65d50e9ea0d5f5da2e0dca25d808463a47fbf59a7dfcb9b71b64823501a8c"],
  ["product-description-draft", 1, "0aefaeb2dba08c76587f6501451dc0031b6f825ab3bb903be00f28dda5e0b198"],
  ["seo-content-draft", 1, "91f8868efad16310a5ed26c85a6001024572949c59725efe2b6c0df935499195"],
  ["sourcing-guide-draft", 1, "e4aaf2e39483bde7569edb529f1c1d213b0a11d68ac4a9b99075992620238adf"],
];
const scannerChunkIdentity = "server/chunks/ssr/admin-ai.js";

function writeFixtureFile(root, relativePath, content) {
  const path = resolve(root, relativePath);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content);
}

function materializeSyntheticRuntime(root) {
  const buildRoot = resolve(root, ".next/standalone/.next");
  const scannerMarkers = ["/virus/scan/file", "CleanResult", "FoundViruses", "Apikey"];
  const scannerModule = `module.exports=[56002,e=>{${scannerMarkers.map((marker, index) =>
    `const scannerContract${index}=${JSON.stringify(marker)};`).join("")}e.s(["createFileScanner",0,function(){}],56002)}];`;
  const serverEvidence = [
    "CWT_SERVER_AI_BOUNDARY_V1_5F4D7C2A",
    "CWT_SERVER_AI_PROMPT_BUNDLE_V1_91B6E4A3",
    'const valkeyPackage = "@valkey/valkey-glide";',
    'const limiterAlgorithm = "fixed-window-v1";',
    scannerModule,
    ...promptTuples.map(([promptId, promptVersion, sha256]) =>
      `({promptId:"${promptId}",promptVersion:${promptVersion},sha256:"${sha256}"})`),
  ].join("\n");
  const runtimeEvidence = [
    "const moduleFactories = new Map();",
    "const moduleCache = Object.create(null);",
    "if (!moduleFactories.has(id)) moduleFactories.set(id, factoryToInstall);",
    "moduleCache[id] = module1;",
  ].join("\n");
  const manifestPayload = {
    clientModules: {
      "/src/public-site/example.tsx": {
        id: "fixture-module",
        name: "*",
        chunks: ["/_next/static/chunks/app/public.js"],
        async: false,
      },
    },
  };
  const manifest = [
    "globalThis.__RSC_MANIFEST = globalThis.__RSC_MANIFEST || {};\n",
    `globalThis.__RSC_MANIFEST["/page"] = ${JSON.stringify(manifestPayload)};`,
  ].join("");

  writeFixtureFile(buildRoot, "BUILD_ID", "synthetic-runtime-build\n");
  writeFixtureFile(buildRoot, "build-manifest.json", JSON.stringify({ polyfillFiles: [], rootMainFiles: [] }));
  writeFixtureFile(buildRoot, "server/app/page_client-reference-manifest.js", manifest);
  writeFixtureFile(buildRoot, "server/chunks/[turbopack]_runtime.js", runtimeEvidence);
  writeFixtureFile(buildRoot, scannerChunkIdentity, serverEvidence);
  writeFixtureFile(buildRoot, "server/app/api/scanner-proof/route.js", [
    'var R=require("../../../chunks/[turbopack]_runtime.js")("server/app/api/scanner-proof/route.js")',
    `R.c(${JSON.stringify(scannerChunkIdentity)})`,
    "module.exports=R.m(1).exports",
  ].join("\n"));
  writeFixtureFile(buildRoot, "static/chunks/app/public.js", "synthetic public fixture\n");
  return buildRoot;
}

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

test("workspace and CI callers each reach exactly one build-before-bundle sequence", () => {
  const scripts = JSON.parse(readFileSync(resolve("package.json"), "utf8")).scripts;
  assert.equal(scripts["check:bundle"], "pnpm build && node scripts/check-public-bundle.mjs");
  assert.equal(scripts.check.match(/pnpm check:bundle/gu)?.length, 1);
  assert.equal(scripts.check.match(/pnpm build/gu)?.length ?? 0, 0);

  const ci = readFileSync(resolve(".github/workflows/ci.yml"), "utf8");
  const buildBundleJob = ci.slice(ci.indexOf("  build-bundle:"), ci.indexOf("  browser:"));
  assert.ok(buildBundleJob.indexOf("run: pnpm db:migrate") < buildBundleJob.indexOf("run: pnpm check:bundle"));
  assert.equal(buildBundleJob.match(/run: pnpm check:bundle/gu)?.length, 1);
  assert.equal(buildBundleJob.match(/run: pnpm build/gu)?.length ?? 0, 0);
  assert.match(buildBundleJob, /name: Build and verify the public bundle boundary/u);
});

test("the locked production-only runtime shape completes the checker and rejects content or required-data loss", () => {
  const root = mkdtempSync(resolve(tmpdir(), "cwt-build-once-production-dependencies-")); roots.push(root);
  const alienCwd = mkdtempSync(resolve(tmpdir(), "cwt-build-once-alien-cwd-")); roots.push(alienCwd);
  for (const name of [".npmrc", "package.json", "pnpm-lock.yaml", "pnpm-workspace.yaml"]) {
    copyFileSync(resolve(name), resolve(root, name));
  }
  mkdirSync(resolve(root, "scripts"));
  copyFileSync(resolve("scripts/check-public-bundle.mjs"), resolve(root, "scripts/check-public-bundle.mjs"));
  const promptPath = "src/ai/prompts/generated/production-prompt-bundle.generated.ts";
  mkdirSync(dirname(resolve(root, promptPath)), { recursive: true });
  copyFileSync(resolve(promptPath), resolve(root, promptPath));
  const install = spawnSync("pnpm", [
    "install", "--prod", "--offline", "--frozen-lockfile", "--trust-lockfile", "--ignore-scripts",
  ], { cwd: root, encoding: "utf8", env: { ...process.env, CI: "1" } });
  assert.equal(install.status, 0, `${install.stdout}\n${install.stderr}`);
  for (const path of [
    ".npmrc",
    "pnpm-lock.yaml",
    "pnpm-workspace.yaml",
    "node_modules/.modules.yaml",
    "node_modules/.pnpm-workspace-state-v1.json",
  ]) rmSync(resolve(root, path), { force: true });
  assert.equal(statSync(resolve(root, "next.config.ts"), { throwIfNoEntry: false }), undefined);

  const buildRoot = materializeSyntheticRuntime(root);
  const runChecker = () => spawnSync(process.execPath, [resolve(root, "scripts/check-public-bundle.mjs")], {
    cwd: alienCwd,
    encoding: "utf8",
    env: { ...process.env, CWT_BUILD_DIR: buildRoot },
  });

  const success = runChecker();
  assert.equal(success.status, 0, `${success.stdout}\n${success.stderr}`);
  assert.match(success.stdout, /Public bundle boundary verified/u);
  assert.match(success.stdout, /File Scanner module 56002/u);
  assert.match(success.stdout, /1 public page manifests; 0 root chunks; 1 manifest chunks; 1 distinct chunk files/u);

  const publicChunk = resolve(buildRoot, "static/chunks/app/public.js");
  writeFileSync(publicChunk, "const publicLeak = '@refinedev/core';\n");
  const leak = runChecker();
  assert.equal(leak.status, 1);
  assert.deepEqual(JSON.parse(leak.stdout), { schemaVersion: 1, reasonCode: "bundle_assertion_or_unknown_failed" });
  assert.match(leak.stderr, /Admin-only dependencies leaked into public bundles/u);
  assert.match(leak.stderr, /@refinedev/u);

  writeFileSync(publicChunk, "synthetic public fixture\n");
  rmSync(resolve(root, promptPath));
  const missingPrompt = runChecker();
  assert.equal(missingPrompt.status, 1);
  assert.deepEqual(JSON.parse(missingPrompt.stdout), { schemaVersion: 1, reasonCode: "bundle_assertion_or_unknown_failed" });
  assert.match(missingPrompt.stderr, /production-prompt-bundle\.generated\.ts/u);
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
