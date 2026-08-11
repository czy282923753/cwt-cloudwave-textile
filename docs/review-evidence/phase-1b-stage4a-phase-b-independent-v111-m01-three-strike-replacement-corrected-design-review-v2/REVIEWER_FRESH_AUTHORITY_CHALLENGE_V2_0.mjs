import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";

const [repoArg, attachedSourceArg, envelopeArg] = process.argv.slice(2);
if (!repoArg || !attachedSourceArg || !envelopeArg) {
  throw new Error("usage: node challenge.mjs <detached-repo> <attached-source-repo> <external-envelope>");
}

const repo = fs.realpathSync(repoArg);
const attachedSource = fs.realpathSync(attachedSourceArg);
const envelopePath = fs.realpathSync(envelopeArg);
const authorityRel = "docs/review-evidence/phase-1b-stage4a-phase-b-v111-m01-three-strike-replacement-corrected-design-v2/V111_M01_CANONICAL_REVIEW_AUTHORITY_V2_0.json";
const verifierRel = "docs/review-evidence/phase-1b-stage4a-phase-b-v111-m01-three-strike-replacement-corrected-design-v2/VERIFY_V111_M01_REPLACEMENT_CORRECTED_DESIGN_V2_0.mjs";
const expectedRef = "refs/heads/codex/phase-1b-stage4a-phase-b-v111-m01-three-strike-replacement-design-v1";
const expectedHead = "4b626fc9278f4c49957ecf165d7d5c5fc4058dca";
const expectedParent = "3aaad46b1627191a18fb82763a9627c1e2292d73";

function sha256(bytes) {
  return crypto.createHash("sha256").update(bytes).digest("hex");
}

function jcs(value) {
  if (value === null || typeof value === "boolean" || typeof value === "string" || typeof value === "number") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(jcs).join(",")}]`;
  return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${jcs(value[key])}`).join(",")}}`;
}

function run(command, args, cwd) {
  const result = spawnSync(command, args, { cwd, encoding: "utf8", env: { ...process.env, NO_COLOR: "1" } });
  return {
    exit: result.status,
    signal: result.signal,
    stderrFirstLine: (result.stderr || "").trim().split("\n")[0] || null,
    stdoutSha256: sha256(Buffer.from(result.stdout || "", "utf8")),
  };
}

function verifier(repoRoot, authorityPath, reviewEnvelope) {
  const canonicalRepoRoot = fs.realpathSync(repoRoot);
  return run(process.execPath, [path.join(canonicalRepoRoot, verifierRel), "--authority", authorityPath, "--review-envelope", reviewEnvelope], canonicalRepoRoot);
}

function git(args, cwd) {
  const result = run("git", args, cwd);
  if (result.exit !== 0) throw new Error(`git failed: ${args.join(" ")}`);
  return result;
}

function setLeaf(value, dottedPath, replacement) {
  const copy = structuredClone(value);
  const parts = dottedPath.split(".");
  let target = copy;
  for (const part of parts.slice(0, -1)) target = target[part];
  target[parts.at(-1)] = replacement;
  return copy;
}

function changedLeaf(value) {
  if (typeof value === "boolean") return !value;
  if (/^[0-9a-f]{40}$/.test(value) || /^[0-9a-f]{64}$/.test(value)) return `${value.slice(0, -1)}${value.endsWith("0") ? "1" : "0"}`;
  return `${value}-reviewer-mutation`;
}

const envelope = JSON.parse(fs.readFileSync(envelopePath, "utf8"));
const envelopeLeaves = [
  "authorityBinding.authorityJcsSha256",
  "authorityBinding.fileSha256",
  "authorityBinding.path",
  "authorityBinding.role",
  "expectedGit.attachmentPolicy",
  "expectedGit.cleanRequired",
  "expectedGit.head",
  "expectedGit.parent",
  "expectedGit.ref",
  "expectedGit.tree",
  "provenance.createdAfterCandidateCommit",
  "provenance.ownerRole",
  "provenance.statement",
  "schemaId",
  "status",
  "version",
];

const temp = fs.mkdtempSync(path.join(os.tmpdir(), "cwt-v111-m01-reviewer-challenge-"));
const ignoredDir = path.join(repo, ".next", "reviewer-v111-m01-v2");
const results = {
  candidate: { head: expectedHead, ref: expectedRef },
  process: { node: process.versions.node, packageManager: false, network: false },
  baseline: null,
  envelopeLeafMutations: [],
  fresh: {},
};

try {
  results.baseline = verifier(repo, path.join(repo, authorityRel), envelopePath);

  for (const leaf of envelopeLeaves) {
    let original = envelope;
    for (const part of leaf.split(".")) original = original[part];
    const changed = setLeaf(envelope, leaf, changedLeaf(original));
    const file = path.join(temp, `${leaf.replaceAll(".", "_")}.json`);
    fs.writeFileSync(file, `${JSON.stringify(changed, null, 2)}\n`);
    const outcome = verifier(repo, path.join(repo, authorityRel), file);
    results.envelopeLeafMutations.push({ leaf, ...outcome });
  }

  const duplicateEnvelope = path.join(temp, "duplicate-envelope.json");
  fs.writeFileSync(duplicateEnvelope, '{"schemaId":"a","schema\\u0049d":"b"}\n');
  results.fresh.duplicateDecodedEnvelopeName = verifier(repo, path.join(repo, authorityRel), duplicateEnvelope);

  fs.mkdirSync(ignoredDir, { recursive: true });
  const exactCopy = path.join(ignoredDir, "alternate-authority-copy.json");
  fs.copyFileSync(path.join(repo, authorityRel), exactCopy);
  const copyEnvelope = structuredClone(envelope);
  copyEnvelope.authorityBinding.path = path.relative(repo, exactCopy).split(path.sep).join("/");
  const copyEnvelopePath = path.join(temp, "copy-envelope.json");
  fs.writeFileSync(copyEnvelopePath, `${JSON.stringify(copyEnvelope, null, 2)}\n`);
  results.fresh.ignoredUntrackedExactAuthorityCopy = {
    gitStatusBefore: run("git", ["status", "--porcelain=v1", "--untracked-files=all"], repo),
    verifier: verifier(repo, exactCopy, copyEnvelopePath),
  };

  const hardLink = path.join(ignoredDir, "alternate-authority-hardlink.json");
  fs.linkSync(path.join(repo, authorityRel), hardLink);
  const hardLinkEnvelope = structuredClone(envelope);
  hardLinkEnvelope.authorityBinding.path = path.relative(repo, hardLink).split(path.sep).join("/");
  const hardLinkEnvelopePath = path.join(temp, "hardlink-envelope.json");
  fs.writeFileSync(hardLinkEnvelopePath, `${JSON.stringify(hardLinkEnvelope, null, 2)}\n`);
  results.fresh.ignoredUntrackedHardLinkAuthorityAlias = verifier(repo, hardLink, hardLinkEnvelopePath);

  const mutatedRoot = JSON.parse(fs.readFileSync(path.join(repo, authorityRel), "utf8"));
  mutatedRoot.historicalEvidence[0].candidateCommit = "0".repeat(40);
  const projection = structuredClone(mutatedRoot);
  delete projection.seal.authorityJcsSha256;
  mutatedRoot.seal.authorityJcsSha256 = sha256(Buffer.from(jcs(projection), "utf8"));
  const mutatedRootBytes = Buffer.from(`${jcs(mutatedRoot)}\n`, "utf8");
  const mutatedRootPath = path.join(ignoredDir, "alternate-authority-resealed.json");
  fs.writeFileSync(mutatedRootPath, mutatedRootBytes);
  const mutatedEnvelope = structuredClone(envelope);
  mutatedEnvelope.authorityBinding.authorityJcsSha256 = mutatedRoot.seal.authorityJcsSha256;
  mutatedEnvelope.authorityBinding.fileSha256 = sha256(mutatedRootBytes);
  mutatedEnvelope.authorityBinding.path = path.relative(repo, mutatedRootPath).split(path.sep).join("/");
  const mutatedEnvelopePath = path.join(temp, "resealed-envelope.json");
  fs.writeFileSync(mutatedEnvelopePath, `${JSON.stringify(mutatedEnvelope, null, 2)}\n`);
  results.fresh.ignoredUntrackedResealedAlteredAuthority = verifier(repo, mutatedRootPath, mutatedEnvelopePath);

  const dirtyPath = path.join(repo, "reviewer-dirty-state-v2.txt");
  fs.writeFileSync(dirtyPath, "reviewer probe\n");
  results.fresh.visibleUntrackedDirtyState = verifier(repo, path.join(repo, authorityRel), envelopePath);
  fs.rmSync(dirtyPath);

  const designPath = path.join(repo, "docs/PHASE_1B_STAGE4A_PHASE_B_PROVIDER_NEUTRAL_FOUNDATION_THREE_STRIKE_REPLACEMENT_CORRECTED_EXACT_DESIGN_V2_0.md");
  const designBytes = fs.readFileSync(designPath);
  fs.writeFileSync(designPath, Buffer.concat([designBytes, Buffer.from("\n   ~~~json reviewer presentation witness ~~~\n")]));
  results.fresh.renderedMarkdownByteMutation = verifier(repo, path.join(repo, authorityRel), envelopePath);
  fs.writeFileSync(designPath, designBytes);

  const cloneRoot = path.join(temp, "local-clone");
  git(["clone", "--quiet", "--no-hardlinks", attachedSource, cloneRoot], temp);
  const canonicalCloneRoot = fs.realpathSync(cloneRoot);
  git(["checkout", "--quiet", "--detach", expectedHead], canonicalCloneRoot);
  git(["update-ref", expectedRef, expectedParent], canonicalCloneRoot);
  results.fresh.movedExpectedRefAtPointInTimeHead = verifier(canonicalCloneRoot, path.join(canonicalCloneRoot, authorityRel), envelopePath);
  git(["update-ref", expectedRef, expectedHead], canonicalCloneRoot);
  git(["checkout", "--quiet", "-b", "codex/reviewer-wrong-attachment-v2", expectedHead], canonicalCloneRoot);
  results.fresh.wrongAttachedSymbolicRef = verifier(canonicalCloneRoot, path.join(canonicalCloneRoot, authorityRel), envelopePath);

  results.finalDetachedStatus = run("git", ["status", "--porcelain=v1", "--untracked-files=all"], repo);
  process.stdout.write(`${JSON.stringify(results, null, 2)}\n`);
} finally {
  fs.rmSync(ignoredDir, { recursive: true, force: true });
  fs.rmSync(temp, { recursive: true, force: true });
}
