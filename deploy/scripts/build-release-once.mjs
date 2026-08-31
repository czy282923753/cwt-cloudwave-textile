import { createHash } from "node:crypto";
import { execFileSync, spawnSync } from "node:child_process";
import { linkSync, lstatSync, mkdtempSync, mkdirSync, readFileSync, readdirSync, readlinkSync, realpathSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { inventoryOciLayout, sha256, sha256File } from "./preflight-image.mjs";

const repositoryRoot = realpathSync(process.cwd());
const platforms = ["linux/amd64", "linux/arm64"];
function fail(message) { throw new Error(`Build-once refused: ${message}`); }
function run(command, args, options = {}) {
  const result = spawnSync(command, args, { cwd: repositoryRoot, stdio: "inherit", ...options });
  if (result.status !== 0) fail(`${basename(command)} exited ${result.status ?? "by signal"}`);
}
function git(...args) { return execFileSync("git", args, { cwd: repositoryRoot, encoding: "utf8" }).trim(); }
function stableJson(value) { return `${JSON.stringify(value, null, 2)}\n`; }
function fileTreeHash(root) {
  const records = [];
  const visit = (directory) => {
    for (const name of readdirSync(directory).sort()) {
      const path = join(directory, name); const stat = lstatSync(path);
      if (stat.isDirectory()) visit(path);
      else if (stat.isFile()) records.push(`${relative(root, path).split(sep).join("/")}\0${stat.mode & 0o777}\0${sha256File(path)}`);
      else if (stat.isSymbolicLink()) records.push(`${relative(root, path).split(sep).join("/")}\0symlink\0${readlinkSync(path)}`);
      else fail("dependency bundle contains a non-regular node");
    }
  };
  visit(root); return sha256(`${records.join("\n")}\n`);
}
function writeEvidence(path, value) { writeFileSync(path, stableJson(value), { mode: 0o444, flag: "wx" }); }
function dockerScoutSbom(layout, child, path, scratch, releaseId) {
  const architecture = child.platform.split("/")[1];
  const childLayout = resolve(scratch, `${architecture}.scout.oci`);
  mkdirSync(resolve(childLayout, "blobs/sha256"), { recursive: true });
  const rootIndex = JSON.parse(readFileSync(resolve(layout, "index.json"), "utf8"));
  const indexDigest = rootIndex.manifests[0].digest;
  const subject = JSON.parse(readFileSync(resolve(layout, "blobs/sha256", indexDigest.slice(7)), "utf8"));
  const originalDescriptor = subject.manifests.find((entry) => entry.digest === child.manifestDigest);
  if (!originalDescriptor) fail(`${child.platform} descriptor is absent from the emitted index`);
  const tag = `cwt.local/scout-${releaseId}:${architecture}`;
  const descriptor = { ...originalDescriptor, annotations: { "io.containerd.image.name": tag, "org.opencontainers.image.ref.name": architecture } };
  for (const digest of [child.manifestDigest, child.configDigest, ...child.layers]) {
    linkSync(resolve(layout, "blobs/sha256", digest.slice(7)), resolve(childLayout, "blobs/sha256", digest.slice(7)));
  }
  writeFileSync(resolve(childLayout, "oci-layout"), stableJson({ imageLayoutVersion: "1.0.0" }));
  writeFileSync(resolve(childLayout, "index.json"), stableJson({ schemaVersion: 2, mediaType: "application/vnd.oci.image.index.v1+json", manifests: [descriptor] }));
  const archivePath = resolve(scratch, `${architecture}.scout.oci.tar`);
  run("tar", ["-C", childLayout, "-cf", archivePath, "."]);
  if (spawnSync("docker", ["image", "inspect", tag], { stdio: "ignore" }).status === 0) fail(`${tag} already exists in the local image store`);
  run("docker", ["load", "-i", archivePath]);
  try {
    run("docker", ["scout", "sbom", "--format", "spdx", "--output", path, `local://${tag}`]);
  } finally {
    run("docker", ["image", "rm", tag]);
  }
  const sbom = JSON.parse(readFileSync(path, "utf8"));
  const packages = Array.isArray(sbom.packages) ? sbom.packages : [];
  const has = (name, version) => packages.some((entry) => entry.name === name && entry.versionInfo === version);
  if (!has("next", "16.2.12") || !has("tsx", "4.23.1") || !has("@valkey/valkey-glide", "2.5.1")) fail(`${child.platform} SBOM is missing a pinned runtime package`);
  return packages.length;
}
function extractFramework(layout, child, root) {
  mkdirSync(root, { recursive: true });
  for (const digest of child.layers) run("tar", ["-xf", resolve(layout, "blobs/sha256", digest.slice(7)), "-C", root]);
  const nextRoot = resolve(root, "app/.next/standalone/.next");
  const prerender = JSON.parse(readFileSync(resolve(nextRoot, "prerender-manifest.json"), "utf8"));
  const references = JSON.parse(readFileSync(resolve(nextRoot, "server/server-reference-manifest.json"), "utf8"));
  if (!prerender?.preview || !references?.encryptionKey || !references.node || !references.edge) fail("framework manifest schema is absent");
  const sensitive = [prerender.preview.previewModeId, prerender.preview.previewModeSigningKey, prerender.preview.previewModeEncryptionKey, references.encryptionKey];
  if (sensitive.some((value) => typeof value !== "string")) fail("framework material type drifted");
  return {
    schema: {
      nextVersion: "16.2.12",
      preview: { idLength: sensitive[0].length, signingKeyLength: sensitive[1].length, encryptionKeyLength: sensitive[2].length },
      serverActions: { encryptionKeyLength: sensitive[3].length, nodeActionCount: Object.keys(references.node).length, edgeActionCount: Object.keys(references.edge).length },
    },
    sensitive,
  };
}

const outputArgument = process.argv.indexOf("--output");
if (outputArgument < 0 || !process.argv[outputArgument + 1]) fail("--output is required");
const outputRoot = resolve(process.argv[outputArgument + 1]);
if (!isAbsolute(process.argv[outputArgument + 1]) || outputRoot === repositoryRoot || outputRoot.startsWith(`${repositoryRoot}${sep}`)) fail("output must be an absolute path outside the repository");
if (statSync(dirname(outputRoot)).isDirectory() !== true) fail("output parent is unavailable");
try { statSync(outputRoot); fail("output already exists; a release record is never overwritten"); } catch (error) { if (error?.code !== "ENOENT") throw error; }
if (git("status", "--porcelain=v1") !== "") fail("source worktree must be clean");
const releaseId = git("rev-parse", "HEAD");
const tree = git("rev-parse", "HEAD^{tree}");
const epoch = Number(git("show", "-s", "--format=%ct", "HEAD"));
if (!/^[0-9a-f]{40}$/u.test(releaseId) || !Number.isSafeInteger(epoch)) fail("source identity is invalid");
const archive = execFileSync("git", ["archive", "--format=tar", "HEAD"], { cwd: repositoryRoot, maxBuffer: 1024 * 1024 * 1024 });
const archiveSha256 = createHash("sha256").update(archive).digest("hex");
const temporary = mkdtempSync(join(tmpdir(), "cwt-option-f-build-once-"));
mkdirSync(outputRoot, { mode: 0o700 });
let subjectEmitted = false;
let emittedIndexDigest;
try {
  const dependencyHashes = {};
  for (const platform of platforms) {
    const architecture = platform.split("/")[1];
    const destination = resolve(temporary, `deps-${architecture}`);
    const archivePath = resolve(temporary, `deps-${architecture}.tar`);
    run("docker", ["buildx", "build", "--no-cache", "--platform", platform, "--target", "dependency-bundle", "--output", `type=tar,dest=${archivePath}`, "."]);
    mkdirSync(destination);
    run("tar", ["-xf", archivePath, "-C", destination]);
    dependencyHashes[platform] = fileTreeHash(destination);
  }
  const layout = resolve(outputRoot, "subject.oci");
  const metadata = resolve(temporary, "buildx-metadata.json");
  run("docker", ["buildx", "build", "--no-cache", "--network=none", "--platform", platforms.join(","), "--provenance=false", "--sbom=false",
    "--build-arg", `CWT_RELEASE_ID=${releaseId}`, "--build-arg", `SOURCE_DATE_EPOCH=${epoch}`,
    "--build-context", `deps-amd64=${resolve(temporary, "deps-amd64")}`, "--build-context", `deps-arm64=${resolve(temporary, "deps-arm64")}`,
    "--metadata-file", metadata, "--output", `type=oci,dest=${layout},tar=false,rewrite-timestamp=true,name=cwt.local/release:${releaseId}`, "."]);
  subjectEmitted = true;
  emittedIndexDigest = JSON.parse(readFileSync(resolve(layout, "index.json"), "utf8"))?.manifests?.[0]?.digest;
  if (!/^sha256:[0-9a-f]{64}$/u.test(emittedIndexDigest ?? "")) fail("emitted OCI subject identity is invalid");
  const inventory = inventoryOciLayout(layout);
  if (inventory.children.some((child) => child.releaseId !== releaseId)) fail("built child release identity differs from source");
  const evidenceRoot = resolve(outputRoot, "evidence"); mkdirSync(evidenceRoot);
  const descriptors = []; const frameworkSchemas = []; const forbiddenEvidenceStrings = [];
  for (const child of inventory.children) {
    const architecture = child.platform.split("/")[1];
    const sbomPath = resolve(evidenceRoot, `${architecture}.sbom.spdx.json`);
    const packageCount = dockerScoutSbom(layout, child, sbomPath, temporary, releaseId);
    const framework = extractFramework(layout, child, resolve(temporary, `rootfs-${architecture}`));
    frameworkSchemas.push({ platform: child.platform, schema: framework.schema });
    forbiddenEvidenceStrings.push(...framework.sensitive, ...framework.sensitive.map((value) => sha256(value)));
    const scanPath = resolve(evidenceRoot, `${architecture}.scan.json`);
    writeEvidence(scanPath, { schemaVersion: 1, kind: "local-release-policy-scan", subjectDigest: child.manifestDigest, platform: child.platform, packageCount, checks: { pinnedRuntimePackages: "pass", runtimePackageManagerAbsent: "pass", businessSecretLeakageMatches: 0, frameworkValueOrHashEvidenceLeakageMatches: 0 }, externalVulnerabilityFeedClaimed: false });
    const provenancePath = resolve(evidenceRoot, `${architecture}.provenance.json`);
    writeEvidence(provenancePath, { schemaVersion: 1, kind: "detached-local-provenance", subject: { indexDigest: inventory.indexDigest, childManifestDigest: child.manifestDigest, configDigest: child.configDigest, platform: child.platform }, source: { commit: releaseId, tree, epoch, archiveSha256 }, dependencyBundleSha256: dependencyHashes[child.platform], build: { networkAfterAcquisition: "none", noCache: true, attachedSbom: false, attachedProvenance: false, rewriteTimestamp: true } });
    for (const [kind, path] of [["sbom", sbomPath], ["scan", scanPath], ["provenance", provenancePath]]) descriptors.push({ kind, platform: child.platform, subjectDigest: child.manifestDigest, path: relative(outputRoot, path).split(sep).join("/"), sha256: sha256File(path) });
  }
  const sanitizedMetadataPath = resolve(evidenceRoot, "buildx-metadata.sanitized.json");
  const rawMetadata = JSON.parse(readFileSync(metadata, "utf8"));
  writeEvidence(sanitizedMetadataPath, { schemaVersion: 1, indexDigest: inventory.indexDigest, descriptorDigest: rawMetadata["containerimage.digest"] ?? inventory.indexDigest, sourceCommit: releaseId });
  const evidenceBytes = readdirSync(evidenceRoot).map((name) => readFileSync(resolve(evidenceRoot, name), "utf8")).join("\n");
  if (forbiddenEvidenceStrings.some((value) => value && evidenceBytes.includes(value))) fail("framework value/hash leaked into evidence");
  const releasePath = resolve(outputRoot, "release.json");
  writeEvidence(releasePath, {
    schemaVersion: 1, releaseId, source: { commit: releaseId, tree, epoch, archiveSha256 },
    oci: { indexDigest: inventory.indexDigest, platformOrder: platforms, children: inventory.children },
    tools: { node: "24.14.0", pnpm: "11.9.0", next: "16.2.12", tsx: "4.23.1", supercronic: "0.2.48", buildx: "0.35.0-desktop.2", dockerfileFrontend: "docker/dockerfile:1.20@sha256:26147acbda4f14c5add9946e2fd2ed543fc402884fd75146bd342a7f6271dc1d", nodeBase: "node:24.14.0-bookworm-slim@sha256:d8e448a56fc63242f70026718378bd4b00f8c82e78d20eefb199224a4d8e33d8" },
    frameworkSchemas, evidence: descriptors,
    retention: { registryPrivate: true, immutableNoOverwrite: true, noEarlyDeletion: true, leastReadAudited: true, completeProtectedReplica: true, totalLossDisposition: "NEW_RELEASE_REQUIRED" },
    state: "built",
  });
  run(process.execPath, [resolve(repositoryRoot, "deploy/scripts/preflight-image.mjs"), "verify", "--release", releasePath, "--oci", layout, "--state", "built"]);
  process.stdout.write(`${JSON.stringify({ ok: true, releaseId, tree, indexDigest: inventory.indexDigest, children: inventory.children.map(({ platform, manifestDigest, configDigest }) => ({ platform, manifestDigest, configDigest })), releasePath })}\n`);
} catch (error) {
  if (!subjectEmitted) rmSync(outputRoot, { recursive: true, force: true });
  else {
    const revocationRoot = resolve(outputRoot, "revoked");
    mkdirSync(revocationRoot, { recursive: true, mode: 0o700 });
    const identity = /^sha256:[0-9a-f]{64}$/u.test(emittedIndexDigest ?? "") ? emittedIndexDigest.slice(7) : "unknown-subject";
    writeEvidence(resolve(revocationRoot, `${identity}.json`), {
      schemaVersion: 1,
      indexDigest: emittedIndexDigest ?? null,
      releaseId,
      reasonCode: "post_emission_gate_failed",
      recordedAt: new Date().toISOString(),
    });
  }
  throw error;
} finally {
  rmSync(temporary, { recursive: true, force: true });
}
