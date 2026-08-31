import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import { chmodSync, closeSync, existsSync, lstatSync, mkdtempSync, mkdirSync, openSync, readFileSync, readdirSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from "node:path";

const DIGEST = /^sha256:[0-9a-f]{64}$/u;
const RELEASE = /^[0-9a-f]{40}$/u;
const PLATFORM_ORDER = ["linux/amd64", "linux/arm64"];
const LEGAL_STATES = ["built", "staging_validated", "promotion_authorized"];
const REVOCATION_REASONS = ["post_emission_gate_failed", "runtime_validation_failed", "operator_revoked"];

export const PROHIBITED_RUNTIME_PACKAGE_MANAGERS = Object.freeze([
  Object.freeze({ id: "npm", sbomNames: Object.freeze(["npm", "npx"]), launcherPaths: Object.freeze(["usr/local/bin/npm", "usr/local/bin/npx"]), moduleNames: Object.freeze(["npm"]), rootfsPrefixes: Object.freeze([]) }),
  Object.freeze({ id: "pnpm", sbomNames: Object.freeze(["pnpm", "pnpx"]), launcherPaths: Object.freeze(["usr/local/bin/pnpm", "usr/local/bin/pnpx"]), moduleNames: Object.freeze(["pnpm"]), rootfsPrefixes: Object.freeze(["opt/pnpm"]) }),
  Object.freeze({ id: "yarn", sbomNames: Object.freeze(["yarn", "yarnpkg"]), launcherPaths: Object.freeze(["usr/local/bin/yarn", "usr/local/bin/yarnpkg"]), moduleNames: Object.freeze(["yarn"]), rootfsPrefixes: Object.freeze(["opt/yarn-"]) }),
  Object.freeze({ id: "corepack", sbomNames: Object.freeze(["corepack"]), launcherPaths: Object.freeze(["usr/local/bin/corepack"]), moduleNames: Object.freeze(["corepack"]), rootfsPrefixes: Object.freeze([]) }),
]);

function fail(message) { throw new Error(`Image evidence refused: ${message}`); }
export function sha256(value) { return createHash("sha256").update(value).digest("hex"); }
export function sha256File(path) { return sha256(readFileSync(path)); }
function digestBytes(value) { return `sha256:${sha256(value)}`; }
function readJson(path) { return JSON.parse(readFileSync(path, "utf8")); }
function stableJson(value) { return `${JSON.stringify(value, null, 2)}\n`; }
function assertExactKeys(value, keys, label) {
  if (!value || typeof value !== "object" || Array.isArray(value) ||
    JSON.stringify(Object.keys(value).sort()) !== JSON.stringify([...keys].sort())) fail(`${label} keys drifted`);
}

function blob(root, digest) {
  if (!DIGEST.test(digest)) fail("invalid OCI digest");
  const path = resolve(root, "blobs", "sha256", digest.slice(7));
  const bytes = readFileSync(path);
  if (digestBytes(bytes) !== digest) fail(`OCI blob digest mismatch (${digest})`);
  return { bytes, json: JSON.parse(bytes.toString("utf8")), path };
}

export function inventoryOciLayout(inputRoot) {
  const root = realpathSync(inputRoot);
  const layout = readJson(resolve(root, "oci-layout"));
  if (layout.imageLayoutVersion !== "1.0.0") fail("OCI layout version drifted");
  const rootIndexBytes = readFileSync(resolve(root, "index.json"));
  const rootIndex = JSON.parse(rootIndexBytes.toString("utf8"));
  if (!Array.isArray(rootIndex.manifests) || rootIndex.manifests.length !== 1) fail("OCI root index must name one accepted subject");
  const subjectDescriptor = rootIndex.manifests[0];
  if (!DIGEST.test(subjectDescriptor.digest)) fail("OCI subject digest is invalid");
  const subject = blob(root, subjectDescriptor.digest);
  if (!Array.isArray(subject.json.manifests) || subject.json.manifests.length !== 2) fail("OCI subject must contain exactly two children");
  const children = subject.json.manifests.map((descriptor) => {
    const platform = `${descriptor.platform?.os}/${descriptor.platform?.architecture}`;
    const manifest = blob(root, descriptor.digest);
    if (!manifest.json.config || !Array.isArray(manifest.json.layers)) fail("OCI child manifest shape drifted");
    const config = blob(root, manifest.json.config.digest);
    const layers = manifest.json.layers.map((layer) => {
      const layerPath = resolve(root, "blobs", "sha256", layer.digest.slice(7));
      const layerBytes = readFileSync(layerPath);
      if (digestBytes(layerBytes) !== layer.digest || layerBytes.byteLength !== layer.size) fail("OCI layer identity drifted");
      return layer.digest;
    });
    if (!Array.isArray(config.json.rootfs?.diff_ids) || config.json.rootfs.diff_ids.length !== layers.length) fail("OCI rootfs diff ID inventory drifted");
    if (config.json.config?.User !== "10001:10001") fail("runtime user drifted");
    const releaseId = config.json.config?.Labels?.["org.opencontainers.image.revision"];
    if (!RELEASE.test(releaseId ?? "")) fail("OCI release label drifted");
    return {
      platform,
      manifestDigest: descriptor.digest,
      configDigest: manifest.json.config.digest,
      layers,
      diffIds: [...config.json.rootfs.diff_ids],
      created: config.json.created,
      historyCreated: (config.json.history ?? []).map((entry) => entry.created ?? null),
      historyEntryCount: (config.json.history ?? []).length,
      releaseId,
    };
  });
  if (JSON.stringify(children.map((child) => child.platform)) !== JSON.stringify(PLATFORM_ORDER)) fail("OCI platform order drifted");
  if (children[0].releaseId !== children[1].releaseId) fail("OCI child release labels differ");
  return { root, indexDigest: subjectDescriptor.digest, children };
}

function normalizeLayerEntry(value) {
  const normalized = value.replace(/^(?:\.\/)+/u, "").replace(/\/+$/u, "");
  if (!normalized || normalized === ".") return undefined;
  if (isAbsolute(normalized) || normalized.split("/").some((part) => part === ".." || part === "")) fail("OCI layer path escapes rootfs");
  return normalized;
}

function rootfsPath(root, path) {
  const candidate = resolve(root, path);
  if (candidate !== root && !candidate.startsWith(`${root}${sep}`)) fail("OCI layer path escapes rootfs");
  return candidate;
}

export function extractOciChildRootfs(ociRoot, child, destination) {
  const root = resolve(destination);
  mkdirSync(root, { recursive: true });
  for (const layerDigest of child.layers) {
    const layerPath = resolve(ociRoot, "blobs", "sha256", layerDigest.slice(7));
    const entries = execFileSync("tar", ["-tf", layerPath], { encoding: "utf8", maxBuffer: 1024 * 1024 * 1024 })
      .split("\n").map(normalizeLayerEntry).filter(Boolean);
    const whiteouts = entries.filter((entry) => basename(entry).startsWith(".wh."));
    for (const marker of whiteouts) {
      const markerName = basename(marker); const markerDirectory = dirname(marker) === "." ? "" : dirname(marker);
      if (markerName === ".wh..wh..opq") {
        const targetDirectory = rootfsPath(root, markerDirectory);
        if (existsSync(targetDirectory) && lstatSync(targetDirectory).isDirectory()) {
          for (const name of readdirSync(targetDirectory)) rmSync(resolve(targetDirectory, name), { recursive: true, force: true });
        }
      } else {
        rmSync(rootfsPath(root, join(markerDirectory, markerName.slice(4))), { recursive: true, force: true });
      }
    }
    execFileSync("tar", ["-xf", layerPath, "-C", root], { stdio: ["ignore", "ignore", "inherit"] });
    for (const marker of whiteouts) rmSync(rootfsPath(root, marker), { recursive: true, force: true });
  }
  return root;
}

function rootfsInventory(root) {
  const paths = [];
  const visit = (directory, prefix = "") => {
    for (const name of readdirSync(directory).sort()) {
      const path = prefix ? `${prefix}/${name}` : name;
      const absolute = resolve(directory, name);
      paths.push(path);
      if (lstatSync(absolute).isDirectory()) visit(absolute, path);
    }
  };
  visit(root);
  return paths;
}

function matchesManagerPath(path, manager) {
  if (manager.launcherPaths.includes(path)) return true;
  if (manager.rootfsPrefixes.some((prefix) => path === prefix || path.startsWith(prefix.endsWith("-") ? prefix : `${prefix}/`))) return true;
  return manager.moduleNames.some((name) => path === `node_modules/${name}` || path.startsWith(`node_modules/${name}/`) ||
    path.includes(`/node_modules/${name}/`) || path.endsWith(`/node_modules/${name}`));
}

export function deriveRuntimePackageManagerEvidence(rootfsRoot, sbomDocument) {
  const paths = rootfsInventory(rootfsRoot);
  const packages = Array.isArray(sbomDocument?.packages) ? sbomDocument.packages : [];
  const rootfsMatches = new Set(); const sbomMatches = new Set();
  for (const manager of PROHIBITED_RUNTIME_PACKAGE_MANAGERS) {
    if (paths.some((path) => matchesManagerPath(path, manager))) rootfsMatches.add(manager.id);
    if (packages.some((entry) => manager.sbomNames.includes(String(entry?.name ?? "").toLowerCase()))) sbomMatches.add(manager.id);
  }
  return Object.freeze({
    status: rootfsMatches.size === 0 && sbomMatches.size === 0 ? "pass" : "fail",
    rootfsMatchCount: rootfsMatches.size,
    sbomMatchCount: sbomMatches.size,
  });
}

function pathInside(root, path, label) {
  const offset = relative(root, path);
  if (offset === ".." || offset.startsWith(`..${sep}`) || isAbsolute(offset)) fail(`${label} escapes the standalone closure`);
  return offset.split(sep).join("/");
}

function requiredSymlink(root, path, label) {
  try {
    if (!lstatSync(path).isSymbolicLink()) fail(`${label} is not a package symlink`);
    const target = realpathSync(path);
    pathInside(root, target, label);
    return target;
  } catch (error) {
    if (String(error?.message ?? "").startsWith("Image evidence refused:")) throw error;
    fail(`${label} is absent or unresolved`);
  }
}

function requiredFile(root, path, label) {
  try {
    const target = realpathSync(path);
    pathInside(root, target, label);
    if (!lstatSync(target).isFile()) fail(`${label} is not a regular file`);
    return target;
  } catch (error) {
    if (String(error?.message ?? "").startsWith("Image evidence refused:")) throw error;
    fail(`${label} is absent or unresolved`);
  }
}

export function deriveSharpStandaloneEvidence(standaloneRoot, platform) {
  const runtimeArchitecture = platform === "linux/amd64" ? "x64" : platform === "linux/arm64" ? "arm64" : undefined;
  if (!runtimeArchitecture) fail("Sharp standalone platform is unsupported");
  const root = realpathSync(standaloneRoot);
  const modules = resolve(root, "node_modules");
  const sharpRoot = requiredSymlink(root, resolve(modules, "sharp"), "Sharp package");
  let sharpPackage;
  try { sharpPackage = readJson(resolve(sharpRoot, "package.json")); } catch { fail("Sharp package metadata is absent"); }
  if (sharpPackage.version !== "0.35.3") fail("Sharp package version drifted");

  const dependencyRoot = resolve(dirname(sharpRoot), "@img");
  const nativePackage = requiredSymlink(root, resolve(dependencyRoot, `sharp-linux-${runtimeArchitecture}`), "Sharp native package");
  const libvipsPackage = requiredSymlink(root, resolve(dependencyRoot, `sharp-libvips-linux-${runtimeArchitecture}`), "Sharp libvips package");
  requiredSymlink(root, resolve(dirname(sharpRoot), "detect-libc"), "Sharp detect-libc dependency");
  const nativeAddon = requiredFile(root, resolve(nativePackage, "lib", `sharp-linux-${runtimeArchitecture}-0.35.3.node`), "Sharp native addon");
  const libvips = requiredFile(root, resolve(libvipsPackage, "lib", "libvips-cpp.so.8.18.3"), "Sharp libvips library");

  return Object.freeze({
    status: "pass",
    architecture: runtimeArchitecture,
    sharpVersion: "0.35.3",
    packageSymlinks: "pass",
    nativeAddon: Object.freeze({ path: pathInside(root, nativeAddon, "Sharp native addon"), sha256: sha256File(nativeAddon) }),
    libvips: Object.freeze({ path: pathInside(root, libvips, "Sharp libvips library"), sha256: sha256File(libvips) }),
  });
}

export async function runSharpStandaloneSmoke(standaloneRoot, platform) {
  const root = realpathSync(standaloneRoot);
  const evidence = deriveSharpStandaloneEvidence(root, platform);
  const require = createRequire(resolve(root, "server.js"));
  let sharp;
  try {
    const resolved = realpathSync(require.resolve("sharp"));
    pathInside(root, resolved, "Sharp runtime resolution");
    sharp = require("sharp");
  } catch (error) {
    fail(`Sharp executable load failed (${error?.message ?? "unknown error"})`);
  }
  if (sharp.versions?.sharp !== "0.35.3" || sharp.versions?.vips !== "8.18.3") fail("Sharp executable version drifted");
  try {
    const png = await sharp({ create: { width: 1, height: 1, channels: 4, background: { r: 1, g: 2, b: 3, alpha: 1 } } }).png().toBuffer();
    const metadata = await sharp(png).metadata();
    if (metadata.width !== 1 || metadata.height !== 1 || metadata.format !== "png") fail("Sharp executable decode result drifted");
  } catch (error) {
    if (String(error?.message ?? "").startsWith("Image evidence refused:")) throw error;
    fail(`Sharp executable smoke failed (${error?.message ?? "unknown error"})`);
  }
  return Object.freeze({ ...evidence, executableSmoke: "pass", decoded: Object.freeze({ format: "png", width: 1, height: 1 }) });
}

function evidencePath(releasePath, relativePath) {
  if (isAbsolute(relativePath) || relativePath.split("/").includes("..")) fail("evidence path escapes release directory");
  const releaseRoot = realpathSync(dirname(releasePath));
  const path = realpathSync(resolve(releaseRoot, relativePath));
  const offset = relative(releaseRoot, path);
  if (offset === ".." || offset.startsWith(`..${sep}`) || isAbsolute(offset)) fail("evidence path escapes release directory");
  return path;
}

function validateFrameworkSchema(schema) {
  assertExactKeys(schema, ["nextVersion", "preview", "serverActions"], "framework schema");
  if (schema.nextVersion !== "16.2.12" ||
    JSON.stringify(schema.preview) !== JSON.stringify({ idLength: 32, signingKeyLength: 64, encryptionKeyLength: 64 }) ||
    JSON.stringify(schema.serverActions) !== JSON.stringify({ encryptionKeyLength: 44, nodeActionCount: 87, edgeActionCount: 0 })) {
    fail("Next framework schema drifted");
  }
}

export function verifyReleaseRecord({ releasePath, ociRoot, requireState = "built" }) {
  const absoluteRelease = realpathSync(releasePath);
  const record = readJson(absoluteRelease);
  assertExactKeys(record, ["schemaVersion", "releaseId", "source", "oci", "tools", "frameworkSchemas", "evidence", "retention", "state"], "release record");
  if (record.schemaVersion !== 1 || record.state !== "built" || !RELEASE.test(record.releaseId)) fail("release record identity drifted");
  if (!record.source || record.source.commit !== record.releaseId || !/^[0-9a-f]{40}$/u.test(record.source.tree) ||
    !Number.isSafeInteger(record.source.epoch) || !/^[0-9a-f]{64}$/u.test(record.source.archiveSha256)) fail("source identity drifted");
  const inventory = inventoryOciLayout(ociRoot);
  if (record.oci.indexDigest !== inventory.indexDigest || JSON.stringify(record.oci.children) !== JSON.stringify(inventory.children) ||
    JSON.stringify(record.oci.platformOrder) !== JSON.stringify(PLATFORM_ORDER)) fail("recorded OCI graph differs from exact layout");
  if (inventory.children.some((child) => child.releaseId !== record.releaseId)) fail("source/image release ID mismatch");
  const expectedCreatedMilliseconds = record.source.epoch * 1000;
  for (const child of inventory.children) {
    const observed = child.historyCreated.filter((value) => value !== null);
    if (Date.parse(child.created) !== expectedCreatedMilliseconds || observed.length === 0 || Date.parse(observed.at(-1)) !== expectedCreatedMilliseconds ||
      observed.some((value) => Date.parse(value) > expectedCreatedMilliseconds)) fail("OCI created/history epoch drifted");
  }
  if (record.tools.next !== "16.2.12" || record.tools.node !== "24.14.0" || record.tools.pnpm !== "11.9.0" ||
    record.tools.tsx !== "4.23.1" || record.tools.supercronic !== "0.2.48" || record.tools.buildx !== "0.35.0-desktop.2" ||
    record.tools.dockerfileFrontend !== "docker/dockerfile:1.20@sha256:26147acbda4f14c5add9946e2fd2ed543fc402884fd75146bd342a7f6271dc1d" ||
    record.tools.nodeBase !== "node:24.14.0-bookworm-slim@sha256:d8e448a56fc63242f70026718378bd4b00f8c82e78d20eefb199224a4d8e33d8") fail("tool pin drifted");
  if (!Array.isArray(record.frameworkSchemas) || record.frameworkSchemas.length !== 2 ||
    record.frameworkSchemas.map((entry) => entry.platform).join(",") !== PLATFORM_ORDER.join(",")) fail("framework schema platform inventory drifted");
  for (const entry of record.frameworkSchemas) validateFrameworkSchema(entry.schema);
  const evidenceKinds = new Set(); const evidenceByKind = new Map();
  if (!Array.isArray(record.evidence) || record.evidence.length !== PLATFORM_ORDER.length * 3) fail("detached evidence inventory drifted");
  for (const item of record.evidence) {
    assertExactKeys(item, ["kind", "platform", "subjectDigest", "path", "sha256"], "detached evidence descriptor");
    if (!PLATFORM_ORDER.includes(item.platform) || !["sbom", "scan", "provenance"].includes(item.kind) || !DIGEST.test(item.subjectDigest) || !/^[0-9a-f]{64}$/u.test(item.sha256)) fail("detached evidence descriptor drifted");
    const child = inventory.children.find((candidate) => candidate.platform === item.platform);
    if (!child || child.manifestDigest !== item.subjectDigest) fail("detached evidence is bound to the wrong child");
    const path = evidencePath(absoluteRelease, item.path);
    if (sha256File(path) !== item.sha256) fail("detached evidence hash is stale");
    const key = `${item.platform}:${item.kind}`;
    if (evidenceByKind.has(key)) fail("duplicate detached evidence kind");
    evidenceByKind.set(key, { item, path }); evidenceKinds.add(key);
  }
  for (const platform of PLATFORM_ORDER) for (const kind of ["sbom", "scan", "provenance"]) {
    if (!evidenceKinds.has(`${platform}:${kind}`)) fail(`missing ${platform} ${kind} evidence`);
  }

  const runtimePackageManagerEvidence = new Map();
  for (const child of inventory.children) {
    const sbomEntry = evidenceByKind.get(`${child.platform}:sbom`);
    const document = readJson(sbomEntry.path);
    const packages = Array.isArray(document.packages) ? document.packages : [];
    const has = (name, version) => packages.some((entry) => entry.name === name && entry.versionInfo === version);
    if (!has("next", "16.2.12") || !has("tsx", "4.23.1") || !has("@valkey/valkey-glide", "2.5.1")) fail("SBOM runtime pin inventory drifted");
    const rootfs = mkdtempSync(resolve(tmpdir(), `cwt-option-f-rootfs-${child.platform.split("/")[1]}-`));
    try {
      extractOciChildRootfs(inventory.root, child, rootfs);
      const derived = deriveRuntimePackageManagerEvidence(rootfs, document);
      if (derived.status !== "pass") fail(`${child.platform} runtime contains a prohibited package manager`);
      const sharpStandalone = deriveSharpStandaloneEvidence(resolve(rootfs, "app/.next/standalone"), child.platform);
      runtimePackageManagerEvidence.set(child.platform, { derived, sharpStandalone, packageCount: packages.length });
    } finally {
      rmSync(rootfs, { recursive: true, force: true });
    }
  }

  for (const item of record.evidence) {
    const path = evidenceByKind.get(`${item.platform}:${item.kind}`).path;
    const document = readJson(path);
    if (item.kind === "sbom") {
      // The exact bound SPDX document and its runtime inventory were independently checked above.
    } else if (item.kind === "scan") {
      const derived = runtimePackageManagerEvidence.get(item.platform);
      assertExactKeys(document, ["schemaVersion", "kind", "subjectDigest", "platform", "packageCount", "checks", "externalVulnerabilityFeedClaimed"], "local scan");
      assertExactKeys(document.checks, ["pinnedRuntimePackages", "runtimePackageManagerAbsent", "sharpStandaloneRuntime", "businessSecretLeakageMatches", "frameworkValueOrHashEvidenceLeakageMatches"], "local scan checks");
      assertExactKeys(document.checks.runtimePackageManagerAbsent, ["status", "rootfsMatchCount", "sbomMatchCount"], "runtime package-manager evidence");
      assertExactKeys(document.checks.sharpStandaloneRuntime, ["status", "architecture", "sharpVersion", "packageSymlinks", "nativeAddon", "libvips", "executableSmoke", "decoded"], "Sharp standalone runtime evidence");
      assertExactKeys(document.checks.sharpStandaloneRuntime.nativeAddon, ["path", "sha256"], "Sharp native addon evidence");
      assertExactKeys(document.checks.sharpStandaloneRuntime.libvips, ["path", "sha256"], "Sharp libvips evidence");
      assertExactKeys(document.checks.sharpStandaloneRuntime.decoded, ["format", "width", "height"], "Sharp executable smoke evidence");
      const expectedSharpRuntime = { ...derived.sharpStandalone, executableSmoke: "pass", decoded: { format: "png", width: 1, height: 1 } };
      if (document.schemaVersion !== 1 || document.kind !== "local-release-policy-scan" || document.subjectDigest !== item.subjectDigest ||
        document.platform !== item.platform || document.packageCount !== derived.packageCount || document.externalVulnerabilityFeedClaimed !== false ||
        document.checks.pinnedRuntimePackages !== "pass" || JSON.stringify(document.checks.runtimePackageManagerAbsent) !== JSON.stringify(derived.derived) ||
        JSON.stringify(document.checks.sharpStandaloneRuntime) !== JSON.stringify(expectedSharpRuntime) ||
        document.checks.businessSecretLeakageMatches !== 0 || document.checks.frameworkValueOrHashEvidenceLeakageMatches !== 0) fail("local scan evidence drifted");
    } else if (item.kind === "provenance") {
      if (document.subject?.indexDigest !== inventory.indexDigest || document.subject?.childManifestDigest !== item.subjectDigest ||
        document.subject?.platform !== item.platform || document.source?.commit !== record.releaseId || document.source?.tree !== record.source.tree ||
        document.source?.archiveSha256 !== record.source.archiveSha256 || document.build?.networkAfterAcquisition !== "none" ||
        document.build?.noCache !== true || document.build?.attachedSbom !== false || document.build?.attachedProvenance !== false) fail("detached provenance evidence drifted");
    }
  }
  if (JSON.stringify(record.retention) !== JSON.stringify({ registryPrivate: true, immutableNoOverwrite: true, noEarlyDeletion: true, leastReadAudited: true, completeProtectedReplica: true, totalLossDisposition: "NEW_RELEASE_REQUIRED" })) fail("retention/loss contract drifted");
  const transitionsRoot = resolve(dirname(absoluteRelease), "transitions");
  const stagingPath = resolve(transitionsRoot, "001-staging-validated.json");
  const promotionPath = resolve(transitionsRoot, "002-promotion-authorized.json");
  let state = "built";
  let selectedChildDigest;
  if (existsSync(stagingPath)) {
    const transition = readJson(stagingPath);
    assertExactKeys(transition, ["schemaVersion", "from", "to", "indexDigest", "selectedChildDigest", "validatedChildren", "releaseRecordSha256", "recordedAt"], "Staging transition");
    if (transition.schemaVersion !== 1 || transition.from !== "built" || transition.to !== "staging_validated" || transition.indexDigest !== inventory.indexDigest ||
      !inventory.children.some((child) => child.manifestDigest === transition.selectedChildDigest) ||
      JSON.stringify(transition.validatedChildren) !== JSON.stringify(inventory.children.map((child) => child.manifestDigest)) ||
      transition.releaseRecordSha256 !== sha256File(absoluteRelease)) fail("Staging transition identity drifted");
    state = "staging_validated";
    selectedChildDigest = transition.selectedChildDigest;
  }
  if (existsSync(promotionPath)) {
    if (state !== "staging_validated") fail("promotion has no Staging transition");
    const transition = readJson(promotionPath);
    assertExactKeys(transition, ["schemaVersion", "from", "to", "indexDigest", "selectedChildDigest", "previousTransitionSha256", "recordedAt"], "promotion transition");
    if (transition.schemaVersion !== 1 || transition.from !== "staging_validated" || transition.to !== "promotion_authorized" || transition.indexDigest !== inventory.indexDigest ||
      transition.selectedChildDigest !== selectedChildDigest || transition.previousTransitionSha256 !== sha256File(stagingPath)) fail("promotion transition identity drifted");
    state = "promotion_authorized";
  }
  const revokedPath = resolve(dirname(absoluteRelease), "revoked", `${inventory.indexDigest.slice(7)}.json`);
  if (existsSync(revokedPath)) fail("subject is revoked");
  if (!LEGAL_STATES.includes(requireState) || LEGAL_STATES.indexOf(state) < LEGAL_STATES.indexOf(requireState)) fail(`required lifecycle state ${requireState} is absent`);
  return { record, inventory, state, selectedChildDigest };
}

function exclusiveWrite(path, value) {
  mkdirSync(dirname(path), { recursive: true });
  const descriptor = openSync(path, "wx", 0o600);
  try { writeFileSync(descriptor, stableJson(value)); } finally { closeSync(descriptor); }
  chmodSync(path, 0o444);
}

function createTransition(args) {
  const releasePath = realpathSync(args.release);
  const releaseRoot = dirname(releasePath);
  const current = verifyReleaseRecord({ releasePath, ociRoot: args.oci, requireState: args.to === "promotion_authorized" ? "staging_validated" : "built" });
  if (!DIGEST.test(args.index ?? "") || !DIGEST.test(args.child ?? "") || args.index !== current.inventory.indexDigest ||
    !current.inventory.children.some((child) => child.manifestDigest === args.child)) fail("transition input is tag-only, wrong, or unvalidated");
  if (args.to === "staging_validated") {
    if (current.state !== "built") fail("Staging transition is append-only and already exists");
    exclusiveWrite(resolve(releaseRoot, "transitions/001-staging-validated.json"), {
      schemaVersion: 1, from: "built", to: "staging_validated", indexDigest: args.index, selectedChildDigest: args.child,
      validatedChildren: current.inventory.children.map((child) => child.manifestDigest), releaseRecordSha256: sha256File(releasePath), recordedAt: new Date().toISOString(),
    });
  } else if (args.to === "promotion_authorized") {
    if (current.state !== "staging_validated" || current.selectedChildDigest !== args.child) fail("promotion requires the exact Staging-selected child");
    const prior = resolve(releaseRoot, "transitions/001-staging-validated.json");
    exclusiveWrite(resolve(releaseRoot, "transitions/002-promotion-authorized.json"), {
      schemaVersion: 1, from: "staging_validated", to: "promotion_authorized", indexDigest: args.index, selectedChildDigest: args.child,
      previousTransitionSha256: sha256File(prior), recordedAt: new Date().toISOString(),
    });
  } else fail("illegal lifecycle transition");
}

function createRevocation(args) {
  if (!REVOCATION_REASONS.includes(args.reason) || !DIGEST.test(args.index ?? "")) fail("revocation input is invalid");
  const releasePath = realpathSync(args.release);
  const current = verifyReleaseRecord({ releasePath, ociRoot: args.oci, requireState: "built" });
  if (args.index !== current.inventory.indexDigest) fail("revocation targets the wrong OCI subject");
  exclusiveWrite(resolve(dirname(releasePath), "revoked", `${args.index.slice(7)}.json`), {
    schemaVersion: 1,
    indexDigest: args.index,
    releaseId: current.record.releaseId,
    reasonCode: args.reason,
    recordedAt: new Date().toISOString(),
  });
}

function parseArgs(argv) {
  const command = argv[0];
  const values = { command };
  for (let index = 1; index < argv.length; index += 2) {
    const key = argv[index]; const value = argv[index + 1];
    if (!key?.startsWith("--") || value === undefined) fail("invalid command arguments");
    values[key.slice(2)] = value;
  }
  return values;
}

if (process.argv[1] && import.meta.url === new URL(`file://${resolve(process.argv[1])}`).href) {
  const args = parseArgs(process.argv.slice(2));
  if (args.command === "verify") {
    const result = verifyReleaseRecord({ releasePath: args.release, ociRoot: args.oci, requireState: args.state ?? "built" });
    process.stdout.write(`${JSON.stringify({ ok: true, indexDigest: result.inventory.indexDigest, state: result.state })}\n`);
  } else if (args.command === "transition") {
    createTransition(args);
    const result = verifyReleaseRecord({ releasePath: args.release, ociRoot: args.oci, requireState: args.to });
    process.stdout.write(`${JSON.stringify({ ok: true, indexDigest: result.inventory.indexDigest, state: result.state })}\n`);
  } else if (args.command === "revoke") {
    createRevocation(args);
    process.stdout.write(`${JSON.stringify({ ok: true, indexDigest: args.index, state: "revoked" })}\n`);
  } else if (args.command === "loss") {
    process.stdout.write("NEW_RELEASE_REQUIRED\n");
    process.exitCode = 78;
  } else if (args.command === "sharp-smoke") {
    const evidence = await runSharpStandaloneSmoke(args.root, args.platform);
    process.stdout.write(`${JSON.stringify(evidence)}\n`);
  } else fail("unknown command");
}
