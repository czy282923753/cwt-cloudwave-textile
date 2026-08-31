import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { afterEach, test } from "node:test";
import { inventoryOciLayout, sha256File, verifyReleaseRecord } from "./preflight-image.mjs";

const roots = [];
afterEach(() => { while (roots.length) rmSync(roots.pop(), { recursive: true, force: true }); });
const json = (value) => Buffer.from(`${JSON.stringify(value)}\n`);
const digest = (bytes) => `sha256:${createHash("sha256").update(bytes).digest("hex")}`;

function fixture() {
  const root = mkdtempSync(resolve(tmpdir(), "cwt-option-f-image-test-")); roots.push(root);
  const layout = resolve(root, "subject.oci"); mkdirSync(resolve(layout, "blobs/sha256"), { recursive: true });
  const put = (value) => { const bytes = Buffer.isBuffer(value) ? value : json(value); const identity = digest(bytes); writeFileSync(resolve(layout, "blobs/sha256", identity.slice(7)), bytes); return { digest: identity, size: bytes.length }; };
  const releaseId = "1".repeat(40); const tree = "2".repeat(40); const archiveSha256 = "3".repeat(64);
  const layer = put(Buffer.from("synthetic-layer"));
  const children = [];
  for (const architecture of ["amd64", "arm64"]) {
    const config = put({ created: "2026-08-31T00:00:00.000Z", config: { User: "10001:10001", Labels: { "org.opencontainers.image.revision": releaseId } }, rootfs: { diff_ids: [`sha256:${architecture === "amd64" ? "4" : "5"}`.padEnd(71, architecture === "amd64" ? "4" : "5")] }, history: [{ created: "2026-08-31T00:00:00.000Z", created_by: "synthetic" }] });
    const manifest = put({ schemaVersion: 2, config: { ...config, mediaType: "application/vnd.oci.image.config.v1+json" }, layers: [{ ...layer, mediaType: "application/vnd.oci.image.layer.v1.tar" }] });
    children.push({ mediaType: "application/vnd.oci.image.manifest.v1+json", ...manifest, platform: { os: "linux", architecture } });
  }
  const subject = put({ schemaVersion: 2, mediaType: "application/vnd.oci.image.index.v1+json", manifests: children });
  writeFileSync(resolve(layout, "oci-layout"), json({ imageLayoutVersion: "1.0.0" }));
  writeFileSync(resolve(layout, "index.json"), json({ schemaVersion: 2, manifests: [{ mediaType: "application/vnd.oci.image.index.v1+json", ...subject }] }));
  const inventory = inventoryOciLayout(layout); const evidenceRoot = resolve(root, "evidence"); mkdirSync(evidenceRoot);
  const descriptors = [];
  for (const child of inventory.children) {
    const architecture = child.platform.split("/")[1];
    const documents = {
      sbom: { spdxVersion: "SPDX-2.3", packages: [{ name: "next", versionInfo: "16.2.12" }, { name: "tsx", versionInfo: "4.23.1" }, { name: "@valkey/valkey-glide", versionInfo: "2.5.1" }] },
      scan: { schemaVersion: 1, subjectDigest: child.manifestDigest, platform: child.platform, checks: { pinnedRuntimePackages: "pass", runtimePackageManagerAbsent: "pass", businessSecretLeakageMatches: 0, frameworkValueOrHashEvidenceLeakageMatches: 0 }, externalVulnerabilityFeedClaimed: false },
      provenance: { schemaVersion: 1, subject: { indexDigest: inventory.indexDigest, childManifestDigest: child.manifestDigest, configDigest: child.configDigest, platform: child.platform }, source: { commit: releaseId, tree, epoch: 1788134400, archiveSha256 }, dependencyBundleSha256: "6".repeat(64), build: { networkAfterAcquisition: "none", noCache: true, attachedSbom: false, attachedProvenance: false, rewriteTimestamp: true } },
    };
    for (const [kind, document] of Object.entries(documents)) {
      const path = resolve(evidenceRoot, `${architecture}.${kind}.json`); writeFileSync(path, json(document));
      descriptors.push({ kind, platform: child.platform, subjectDigest: child.manifestDigest, path: `evidence/${architecture}.${kind}.json`, sha256: sha256File(path) });
    }
  }
  const releasePath = resolve(root, "release.json");
  writeFileSync(releasePath, json({ schemaVersion: 1, releaseId, source: { commit: releaseId, tree, epoch: 1788134400, archiveSha256 }, oci: { indexDigest: inventory.indexDigest, platformOrder: ["linux/amd64", "linux/arm64"], children: inventory.children }, tools: { node: "24.14.0", pnpm: "11.9.0", next: "16.2.12", tsx: "4.23.1", supercronic: "0.2.48", buildx: "0.35.0-desktop.2", dockerfileFrontend: "docker/dockerfile:1.20@sha256:26147acbda4f14c5add9946e2fd2ed543fc402884fd75146bd342a7f6271dc1d", nodeBase: "node:24.14.0-bookworm-slim@sha256:d8e448a56fc63242f70026718378bd4b00f8c82e78d20eefb199224a4d8e33d8" }, frameworkSchemas: inventory.children.map((child) => ({ platform: child.platform, schema: { nextVersion: "16.2.12", preview: { idLength: 32, signingKeyLength: 64, encryptionKeyLength: 64 }, serverActions: { encryptionKeyLength: 44, nodeActionCount: 87, edgeActionCount: 0 } } })), evidence: descriptors, retention: { registryPrivate: true, immutableNoOverwrite: true, noEarlyDeletion: true, leastReadAudited: true, completeProtectedReplica: true, totalLossDisposition: "NEW_RELEASE_REQUIRED" }, state: "built" }));
  return { root, layout, releasePath, inventory };
}

test("verifies built -> staging_validated -> promotion_authorized for one exact digest", () => {
  const value = fixture();
  assert.equal(verifyReleaseRecord({ releasePath: value.releasePath, ociRoot: value.layout }).state, "built");
  const script = resolve("deploy/scripts/preflight-image.mjs"); const child = value.inventory.children[1].manifestDigest;
  execFileSync(process.execPath, [script, "transition", "--release", value.releasePath, "--oci", value.layout, "--to", "staging_validated", "--index", value.inventory.indexDigest, "--child", child]);
  execFileSync(process.execPath, [script, "transition", "--release", value.releasePath, "--oci", value.layout, "--to", "promotion_authorized", "--index", value.inventory.indexDigest, "--child", child]);
  assert.equal(verifyReleaseRecord({ releasePath: value.releasePath, ociRoot: value.layout, requireState: "promotion_authorized" }).state, "promotion_authorized");
});

test("rejects wrong index/child/config/order, tag-only, stale/leaking evidence, Next drift, and revoked subjects", () => {
  const script = resolve("deploy/scripts/preflight-image.mjs");
  for (const kind of ["wrong-index", "wrong-child", "tag-only", "wrong-config", "platform-order", "stale", "business-leakage", "framework-leakage", "next", "revoked"]) {
    const value = fixture();
    if (["wrong-index", "wrong-child", "tag-only"].includes(kind)) {
      const suppliedChild = kind === "tag-only" ? "cwt:latest" : kind === "wrong-child" ? `sha256:${"f".repeat(64)}` : value.inventory.children[1].manifestDigest;
      const suppliedIndex = kind === "wrong-index" ? `sha256:${"e".repeat(64)}` : value.inventory.indexDigest;
      const result = spawnSync(process.execPath, [script, "transition", "--release", value.releasePath, "--oci", value.layout, "--to", "staging_validated", "--index", suppliedIndex, "--child", suppliedChild]);
      assert.notEqual(result.status, 0); continue;
    }
    const record = JSON.parse(readFileSync(value.releasePath, "utf8"));
    if (kind === "wrong-config") { record.oci.children[0].configDigest = `sha256:${"d".repeat(64)}`; writeFileSync(value.releasePath, json(record)); }
    if (kind === "platform-order") { record.oci.platformOrder.reverse(); writeFileSync(value.releasePath, json(record)); }
    if (["stale", "business-leakage", "framework-leakage"].includes(kind)) {
      const scanPath = resolve(value.root, "evidence/amd64.scan.json");
      if (kind === "stale") writeFileSync(scanPath, "{}\n");
      else {
        const scan = JSON.parse(readFileSync(scanPath, "utf8"));
        scan.checks[kind === "business-leakage" ? "businessSecretLeakageMatches" : "frameworkValueOrHashEvidenceLeakageMatches"] = 1;
        writeFileSync(scanPath, json(scan));
        record.evidence.find((item) => item.kind === "scan" && item.platform === "linux/amd64").sha256 = sha256File(scanPath);
        writeFileSync(value.releasePath, json(record));
      }
    }
    if (kind === "next") { record.frameworkSchemas[0].schema.nextVersion = "16.2.13"; writeFileSync(value.releasePath, json(record)); }
    if (kind === "revoked") { mkdirSync(resolve(value.root, "revoked")); writeFileSync(resolve(value.root, "revoked", `${value.inventory.indexDigest.slice(7)}.json`), "{}\n"); }
    assert.throws(() => verifyReleaseRecord({ releasePath: value.releasePath, ociRoot: value.layout }), /refused/u);
  }
});

test("refuses promotion after a rebuilt or substituted index", () => {
  const value = fixture(); const script = resolve("deploy/scripts/preflight-image.mjs"); const child = value.inventory.children[1].manifestDigest;
  execFileSync(process.execPath, [script, "transition", "--release", value.releasePath, "--oci", value.layout, "--to", "staging_validated", "--index", value.inventory.indexDigest, "--child", child]);
  const result = spawnSync(process.execPath, [script, "transition", "--release", value.releasePath, "--oci", value.layout, "--to", "promotion_authorized", "--index", `sha256:${"e".repeat(64)}`, "--child", child]);
  assert.notEqual(result.status, 0);
  assert.equal(verifyReleaseRecord({ releasePath: value.releasePath, ociRoot: value.layout }).state, "staging_validated");
});

test("an immutable revocation blocks every later verification or promotion", () => {
  const value = fixture(); const script = resolve("deploy/scripts/preflight-image.mjs");
  execFileSync(process.execPath, [script, "revoke", "--release", value.releasePath, "--oci", value.layout, "--index", value.inventory.indexDigest, "--reason", "runtime_validation_failed"]);
  assert.throws(() => verifyReleaseRecord({ releasePath: value.releasePath, ociRoot: value.layout }), /revoked/u);
  const second = spawnSync(process.execPath, [script, "revoke", "--release", value.releasePath, "--oci", value.layout, "--index", value.inventory.indexDigest, "--reason", "operator_revoked"]);
  assert.notEqual(second.status, 0);
});

test("total loss has only NEW_RELEASE_REQUIRED disposition", () => {
  const result = spawnSync(process.execPath, [resolve("deploy/scripts/preflight-image.mjs"), "loss", "--release", "/missing"], { encoding: "utf8" });
  assert.equal(result.status, 78); assert.equal(result.stdout, "NEW_RELEASE_REQUIRED\n");
});
