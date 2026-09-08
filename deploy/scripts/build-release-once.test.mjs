import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { copyFileSync, mkdtempSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, resolve } from "node:path";
import { afterEach, test } from "node:test";
import { pathToFileURL } from "node:url";

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
const postgresSourceUrl = "https://ftp.postgresql.org/pub/source/v18.4/postgresql-18.4.tar.bz2";
const postgresSourceSha256 = "81a81ec695fb0c7901407defaa1d2f7973617154cf27ba74e3a7ab8e64436094";

function countLiteral(value, literal) {
  return value.split(literal).length - 1;
}

function assertQualityPostgresContract(qualityPostgres) {
  assert.match(qualityPostgres, /runs-on: macos-15/u, "Quality must use the governed Darwin/ARM64 runner");
  assert.doesNotMatch(
    qualityPostgres,
    /services:|postgres:18\.4-bookworm@sha256:882236b897e39051d2368c5ccc6cda944904723506b2dfc97f2a8f5bc9afa382|\bbrew\b|postgresql@18|Cellar/u,
    "Quality must have only the task-local PostgreSQL source lifecycle",
  );
  assert.equal(countLiteral(qualityPostgres, postgresSourceUrl), 1, "Quality must acquire the exact source once");
  assert.equal(countLiteral(qualityPostgres, postgresSourceSha256), 1, "Quality must embed one exact source digest");
  assert.equal(countLiteral(qualityPostgres, "curl --fail --show-error --silent --location"), 1, "Quality must have one acquisition path");
  assert.match(qualityPostgres, /--proto '=https' --tlsv1\.2/u, "Acquisition must require HTTPS and TLS 1.2 or newer");
  assert.match(qualityPostgres, /--connect-timeout 20 --max-time 180/u, "Acquisition must bound connection and transfer time");
  assert.match(qualityPostgres, /--retry 3 --retry-delay 2 --retry-connrefused --retry-max-time 240/u, "Acquisition retries must be bounded");

  const typecheckIndex = qualityPostgres.indexOf("- name: Typecheck");
  const acquisitionIndex = qualityPostgres.indexOf(postgresSourceUrl);
  const digestIndex = qualityPostgres.indexOf(postgresSourceSha256);
  const verificationIndex = qualityPostgres.indexOf("shasum -a 256 --check");
  const extractionIndex = qualityPostgres.indexOf("tar -xjf");
  const startupIndex = qualityPostgres.indexOf("--wait --timeout=60 start");
  const migrationIndex = qualityPostgres.indexOf("- name: Apply fresh PostgreSQL migrations through 0021");
  const fullSuiteIndex = qualityPostgres.indexOf("run: pnpm test:run");
  const diagnosticsIndex = qualityPostgres.indexOf("- name: Report bounded PostgreSQL failure diagnostics");
  const cleanupIndex = qualityPostgres.indexOf("- name: Stop and remove task-owned PostgreSQL");
  assert.ok(typecheckIndex >= 0 && typecheckIndex < acquisitionIndex, "PostgreSQL acquisition must follow Typecheck");
  assert.ok(acquisitionIndex < digestIndex && digestIndex < verificationIndex, "The literal digest must govern checksum verification");
  assert.ok(verificationIndex < extractionIndex, "Source integrity must be verified before extraction");
  assert.ok(extractionIndex < startupIndex && startupIndex < migrationIndex, "A verified new cluster must start before Migration");
  assert.ok(migrationIndex < fullSuiteIndex, "Fresh Migration must precede the full suite");
  assert.ok(fullSuiteIndex < diagnosticsIndex && diagnosticsIndex < cleanupIndex, "Diagnostics and cleanup must follow substantive gates");

  for (const flag of ["--without-readline", "--without-zlib", "--without-icu"]) {
    assert.equal(countLiteral(qualityPostgres, flag), 1, `Quality must configure PostgreSQL with ${flag}`);
  }
  assert.match(qualityPostgres, /--prefix="\$pg_install"/u, "PostgreSQL must install below the task root");
  assert.match(
    qualityPostgres,
    /test "\$\("\$pg_install\/bin\/postgres" --version\)" = 'postgres \(PostgreSQL\) 18\.4'/u,
    "Quality must require the exact PostgreSQL binary identity",
  );
  assert.equal(countLiteral(qualityPostgres, '"$pg_install/bin/initdb"'), 1, "Quality must initialize one new cluster");
  assert.match(qualityPostgres, /--encoding=UTF8/u, "The new cluster must use UTF8");
  assert.match(qualityPostgres, /--locale=C/u, "The new cluster must use locale C");
  assert.match(qualityPostgres, /--auth-local=trust[\s\S]*--auth-host=trust/u, "Trust auth must be explicit inside the isolated job");
  assert.equal(countLiteral(qualityPostgres, "--wait --timeout=60 start"), 1, "Quality must start one PostgreSQL authority");
  assert.match(qualityPostgres, /--options='-h 127\.0\.0\.1 -p 55432'/u, "PostgreSQL must bind only to the governed loopback endpoint");
  assert.match(
    qualityPostgres,
    /--host=127\.0\.0\.1 --port=55432 --username=cwt_ci cwt_ci/u,
    "Quality must create the synthetic cwt_ci database as cwt_ci",
  );
  assert.match(qualityPostgres, /--command='SHOW server_version'\)" = '18\.4'/u, "The live server version must be exact");
  assert.match(qualityPostgres, /--command='SHOW server_encoding'\)" = 'UTF8'/u, "The live server encoding must be UTF8");
  assert.match(qualityPostgres, /--command='SELECT 1'\)" = '1'/u, "The synthetic connection must succeed");

  assert.match(qualityPostgres, /run: pnpm check:ai-prompts/u, "The AI Prompt authority gate must remain");
  assert.match(qualityPostgres, /run: pnpm check:ai-phase-d-synthetic/u, "The Phase D synthetic gate must remain");
  assert.match(qualityPostgres, /test -f drizzle\/0020_phase1b_ai_foundation\.sql/u, "Migration 0020 must remain in the fresh-chain gate");
  assert.match(qualityPostgres, /test -f drizzle\/0021_phase_f_k1_run_cost_ceiling\.sql/u, "Migration 0021 must remain in the fresh-chain gate");
  assert.equal(countLiteral(qualityPostgres, "pnpm db:migrate"), 1, "Quality must apply one fresh Migration chain");
  assert.match(
    qualityPostgres,
    /- name: Run the full test suite with PostgreSQL suites enabled\n        env:\n          NEXT_PUBLIC_SITE_URL: http:\/\/localhost:3000\n        run: pnpm test:run\n/u,
    "Quality must run the unfiltered full suite with PostgreSQL suites enabled",
  );
  assert.equal(countLiteral(qualityPostgres, "run: pnpm test:run"), 1, "Quality must have one unfiltered full-suite command");

  assert.match(qualityPostgres, /if: failure\(\)[\s\S]*tail -c 32768 "\$pg_log" \| tail -n 200/u, "Failure diagnostics must be bounded");
  assert.match(qualityPostgres, /if: always\(\)/u, "PostgreSQL cleanup must be unconditional");
  assert.match(qualityPostgres, /--pgdata="\$pg_data" --mode=fast --wait --timeout=60 stop/u, "Cleanup must stop the owned cluster first");
  assert.match(qualityPostgres, /Refusing to signal a live process that is not the task-owned PostgreSQL postmaster/u, "Cleanup must not signal unrelated processes");
  assert.match(qualityPostgres, /rm -rf -- "\$pg_root"/u, "Cleanup must remove the exact task-owned root");
  assert.match(qualityPostgres, /Task-owned PostgreSQL postmaster remains live/u, "Cleanup must fail closed on a live owned server");

  assert.match(qualityPostgres, /pnpm\/action-setup@0977fd99725f1db4007ccb2928dbb4e90d06cc86[\s\S]*version: 11\.9\.0/u);
  assert.match(qualityPostgres, /actions\/setup-node@249970729cb0ef3589644e2896645e5dc5ba9c38[\s\S]*node-version: 24\.14\.0/u);
}

function assertRejectedQualityMutation(name, qualityPostgres, expectedMessage) {
  assert.throws(
    () => assertQualityPostgresContract(qualityPostgres),
    (error) => {
      assert.match(error.message, expectedMessage);
      return true;
    },
    name,
  );
}

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

test("CI binds builds to the checked-out source and owns one exact Darwin PostgreSQL source lifecycle", () => {
  const ci = readFileSync(resolve(".github/workflows/ci.yml"), "utf8");
  const workflowEnvironment = ci.slice(ci.indexOf("env:"), ci.indexOf("jobs:"));
  assert.match(
    workflowEnvironment,
    /CWT_RELEASE_ID: \$\{\{ github\.event\.pull_request\.head\.sha \|\| github\.sha \}\}/u,
  );

  const qualityPostgres = ci.slice(ci.indexOf("  quality-postgres:"), ci.indexOf("  build-bundle:"));
  assertQualityPostgresContract(qualityPostgres);
  assert.match(workflowEnvironment, /NEXT_PUBLIC_SITE_URL: http:\/\/127\.0\.0\.1:3100/u);

  assertRejectedQualityMutation(
    "the former x64 runner is rejected",
    qualityPostgres.replace("runs-on: macos-15", "runs-on: ubuntu-24.04"),
    /governed Darwin\/ARM64 runner/u,
  );
  assertRejectedQualityMutation(
    "the former service acquisition is rejected inside Quality",
    qualityPostgres.replace("    steps:", "    services:\n      postgres:\n        image: postgres:18.4-bookworm@sha256:882236b897e39051d2368c5ccc6cda944904723506b2dfc97f2a8f5bc9afa382\n    steps:"),
    /task-local PostgreSQL source lifecycle/u,
  );
  assertRejectedQualityMutation(
    "a changed source version is rejected",
    qualityPostgres.replace(postgresSourceUrl, "https://ftp.postgresql.org/pub/source/v18.5/postgresql-18.5.tar.bz2"),
    /exact source once/u,
  );
  assertRejectedQualityMutation(
    "a changed embedded digest is rejected",
    qualityPostgres.replace(postgresSourceSha256, "0".repeat(64)),
    /one exact source digest/u,
  );
  assertRejectedQualityMutation(
    "extraction before verification is rejected",
    qualityPostgres.replace("shasum -a 256 --check\n          tar -xjf", "tar -xjf\n          shasum -a 256 --check\n          tar -xjf"),
    /verified before extraction/u,
  );
  assertRejectedQualityMutation(
    "a weakened binary version assertion is rejected",
    qualityPostgres.replace("test \"$(\"$pg_install/bin/postgres\" --version)\" = 'postgres (PostgreSQL) 18.4'", "\"$pg_install/bin/postgres\" --version"),
    /exact PostgreSQL binary identity/u,
  );
  assertRejectedQualityMutation(
    "a public PostgreSQL bind is rejected",
    qualityPostgres.replace("--options='-h 127.0.0.1 -p 55432'", "--options='-h 0.0.0.0 -p 55432'"),
    /governed loopback endpoint/u,
  );
  assertRejectedQualityMutation(
    "a changed synthetic database identity is rejected",
    qualityPostgres.replace("--username=cwt_ci cwt_ci", "--username=postgres postgres"),
    /synthetic cwt_ci database/u,
  );
  assertRejectedQualityMutation(
    "removing Migration 0020 is rejected",
    qualityPostgres.replace("test -f drizzle/0020_phase1b_ai_foundation.sql", "true"),
    /Migration 0020/u,
  );
  assertRejectedQualityMutation(
    "removing Migration 0021 is rejected",
    qualityPostgres.replace("test -f drizzle/0021_phase_f_k1_run_cost_ceiling.sql", "true"),
    /Migration 0021/u,
  );
  assertRejectedQualityMutation(
    "filtering the full suite is rejected",
    qualityPostgres.replace("run: pnpm test:run", "run: pnpm test:run -- src/ai"),
    /unfiltered full suite/u,
  );
  assertRejectedQualityMutation(
    "removing the AI synthetic gate is rejected",
    qualityPostgres.replace("run: pnpm check:ai-phase-d-synthetic", "run: echo skipped"),
    /Phase D synthetic gate/u,
  );
  assertRejectedQualityMutation(
    "conditional cleanup is rejected",
    qualityPostgres.replace("if: always()", "if: success()"),
    /cleanup must be unconditional/u,
  );
  assertRejectedQualityMutation(
    "a duplicate acquisition authority is rejected",
    qualityPostgres.replace(postgresSourceUrl, `${postgresSourceUrl}\n          ${postgresSourceUrl}`),
    /exact source once/u,
  );
  assertRejectedQualityMutation(
    "a duplicate startup authority is rejected",
    qualityPostgres.replace("--wait --timeout=60 start", "--wait --timeout=60 start\n          --wait --timeout=60 start"),
    /start one PostgreSQL authority/u,
  );
});

test("Next build identity rejects missing input and returns one lowercase source head", () => {
  const configUrl = pathToFileURL(resolve("next.config.ts")).href;
  const source = `const imported = await import(${JSON.stringify(configUrl)}); const config = imported.default.default ?? imported.default; process.stdout.write(await config.generateBuildId());`;
  const baseEnvironment = { ...process.env };
  delete baseEnvironment.CWT_RELEASE_ID;
  const missing = spawnSync(process.execPath, ["--import=tsx", "--input-type=module", "--eval", source], {
    encoding: "utf8",
    env: baseEnvironment,
  });
  assert.notEqual(missing.status, 0);
  assert.match(missing.stderr, /CWT_RELEASE_ID must be the full lowercase 40-character source commit/u);

  const releaseId = "d".repeat(40);
  const accepted = spawnSync(process.execPath, ["--import=tsx", "--input-type=module", "--eval", source], {
    encoding: "utf8",
    env: { ...baseEnvironment, CWT_RELEASE_ID: releaseId },
  });
  assert.equal(accepted.status, 0, accepted.stderr);
  assert.equal(accepted.stdout, releaseId);
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
