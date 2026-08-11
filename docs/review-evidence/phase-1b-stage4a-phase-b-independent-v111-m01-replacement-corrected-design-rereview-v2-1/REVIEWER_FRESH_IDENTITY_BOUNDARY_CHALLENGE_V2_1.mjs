import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";

const [sourceRepoArg, envelopeArg, historicalEnvelopeArg] = process.argv.slice(2);
if (!sourceRepoArg || !envelopeArg || !historicalEnvelopeArg) {
  throw new Error("usage: node challenge.mjs <source-repo> <reviewer-envelope> <historical-envelope>");
}

const expectedHead = "3d424821aab67c03c3b8ec02a62b5577044837c9";
const expectedParent = "ac080b1d8b49906154ecbc44d381a84afe972bad";
const expectedRef = "refs/heads/codex/phase-1b-stage4a-phase-b-v111-m01-replacement-design-remediation-v1";
const authorityRel = "docs/review-evidence/phase-1b-stage4a-phase-b-v111-m01-replacement-corrected-design-v2-1/V111_M01_CANONICAL_REVIEW_AUTHORITY_V2_1.json";
const manifestRel = "docs/review-evidence/phase-1b-stage4a-phase-b-v111-m01-replacement-corrected-design-v2-1/SHA256SUMS.txt";
const verifierRel = "docs/review-evidence/phase-1b-stage4a-phase-b-v111-m01-replacement-corrected-design-v2-1/VERIFY_V111_M01_REPLACEMENT_CORRECTED_DESIGN_V2_1.mjs";

const sha256 = (bytes) => crypto.createHash("sha256").update(bytes).digest("hex");

function jcs(value) {
  if (value === null || typeof value === "boolean" || typeof value === "string" || typeof value === "number") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(jcs).join(",")}]`;
  return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${jcs(value[key])}`).join(",")}}`;
}

function run(command, args, cwd) {
  const result = spawnSync(command, args, { cwd, encoding: "utf8", env: { ...process.env, NO_COLOR: "1" } });
  return {
    exit: result.status,
    stderrCode: (result.stderr || "").match(/Error: ([^\n]+)/)?.[1] ?? null,
    stdoutSha256: sha256(Buffer.from(result.stdout || "", "utf8")),
  };
}

function git(args, cwd) {
  const outcome = run("git", args, cwd);
  if (outcome.exit !== 0) throw new Error(`git failed: ${args.join(" ")}`);
  return outcome;
}

function verifier(repo, authority, envelope = null) {
  const args = [path.join(repo, verifierRel), "--authority", authority];
  if (envelope) args.push("--review-envelope", envelope);
  else args.push("--package-only");
  return run(process.execPath, args, repo);
}

function changedLeaf(value) {
  if (typeof value === "boolean") return !value;
  if (/^[0-9a-f]{40}$/.test(value) || /^[0-9a-f]{64}$/.test(value)) return `${value.slice(0, -1)}${value.endsWith("0") ? "1" : "0"}`;
  return `${value}-fresh-reviewer-mutation`;
}

function setLeaf(value, dottedPath, replacement) {
  const copy = structuredClone(value);
  const parts = dottedPath.split(".");
  let current = copy;
  for (const part of parts.slice(0, -1)) current = current[part];
  current[parts.at(-1)] = replacement;
  return copy;
}

const sourceRepo = fs.realpathSync(sourceRepoArg);
const envelopePath = fs.realpathSync(envelopeArg);
const historicalEnvelopePath = fs.realpathSync(historicalEnvelopeArg);
const temp = fs.mkdtempSync(path.join(os.tmpdir(), "cwt-v21-independent-challenge-"));
let repo = path.join(temp, "clone");
const envelope = JSON.parse(fs.readFileSync(envelopePath, "utf8"));
const leaves = [
  "authorityBinding.authorityJcsSha256", "authorityBinding.fileSha256", "authorityBinding.path", "authorityBinding.role",
  "expectedGit.attachmentPolicy", "expectedGit.cleanRequired", "expectedGit.head", "expectedGit.parent", "expectedGit.ref", "expectedGit.tree",
  "provenance.createdAfterCandidateCommit", "provenance.ownerRole", "provenance.statement", "schemaId", "status", "version",
];

const results = {
  candidate: { head: expectedHead, parent: expectedParent, ref: expectedRef },
  process: { node: process.versions.node, packageManager: false, network: false },
  baseline: {},
  exactPathBoundary: {},
  priorDefectWitnesses: {},
  envelopeLeaves: [],
  gitAndMembership: {},
  manifestAndPhysical: {},
};

try {
  git(["clone", "--quiet", "--no-hardlinks", sourceRepo, repo], temp);
  repo = fs.realpathSync(repo);
  git(["checkout", "--quiet", "--detach", expectedHead], repo);
  git(["update-ref", expectedRef, expectedHead], repo);
  git(["update-ref", "refs/heads/codex/checkpoint/phase-1b-stage4a-phase-b-v111-m01-three-strike-analysis-pre-l3-v1", "0793948ad115c19f852a9590387ed9ba06738a39"], repo);
  git(["update-ref", "refs/heads/codex/checkpoint/phase-1b-stage4a-phase-b-v111-m01-replacement-design-pre-l3-v1", "c103682e63e9a2cb62b6581d7d62773ddcab1a99"], repo);
  git(["update-ref", "refs/heads/codex/checkpoint/phase-1b-stage4a-phase-b-v111-m01-v2-m01-remediation-pre-l3-v1", "4b626fc9278f4c49957ecf165d7d5c5fc4058dca"], repo);
  const authorityAbs = path.join(repo, authorityRel);
  const authorityRealAbs = fs.realpathSync(authorityAbs);
  const manifestAbs = path.join(repo, manifestRel);
  const authorityBytes = fs.readFileSync(authorityAbs);
  const manifestBytes = fs.readFileSync(manifestAbs);
  const authorityObject = JSON.parse(authorityBytes);

  results.baseline.packageOnly = verifier(repo, authorityRel);
  results.baseline.detachedFullReview = verifier(repo, authorityRel, envelopePath);

  const pathVariants = {
    exactRelative: authorityRel,
    dotPrefix: `./${authorityRel}`,
    dotDotCancellation: `${path.posix.dirname(authorityRel)}/../${path.posix.basename(path.posix.dirname(authorityRel))}/${path.posix.basename(authorityRel)}`,
    duplicateSlash: authorityRel.replace("docs/", "docs//"),
    exactAbsoluteRealpath: authorityRealAbs,
    backslash: authorityRel.replaceAll("/", "\\"),
    percent: authorityRel.replace("V111", "%56111"),
    caseOnly: authorityRel.replace("docs/", "Docs/"),
    nfd: authorityRel.replace("V2_1.json", "V2_1_e\u0301.json"),
  };
  for (const [name, value] of Object.entries(pathVariants)) results.exactPathBoundary[name] = verifier(repo, value);

  const ignored = path.join(repo, ".next", "fresh-reviewer-v21");
  fs.mkdirSync(ignored, { recursive: true });
  const exactCopy = path.join(ignored, "root-copy.json");
  fs.copyFileSync(authorityAbs, exactCopy);
  const copyEnvelope = structuredClone(envelope);
  copyEnvelope.authorityBinding.path = path.relative(repo, exactCopy).split(path.sep).join("/");
  const copyEnvelopePath = path.join(temp, "copy-envelope.json");
  fs.writeFileSync(copyEnvelopePath, `${JSON.stringify(copyEnvelope)}\n`);
  results.priorDefectWitnesses.ignoredExactCopy = verifier(repo, exactCopy, copyEnvelopePath);

  const hardlink = path.join(ignored, "root-hardlink.json");
  fs.linkSync(authorityAbs, hardlink);
  const hardlinkEnvelope = structuredClone(envelope);
  hardlinkEnvelope.authorityBinding.path = path.relative(repo, hardlink).split(path.sep).join("/");
  const hardlinkEnvelopePath = path.join(temp, "hardlink-envelope.json");
  fs.writeFileSync(hardlinkEnvelopePath, `${JSON.stringify(hardlinkEnvelope)}\n`);
  results.priorDefectWitnesses.ignoredHardlink = verifier(repo, hardlink, hardlinkEnvelopePath);

  const resealed = structuredClone(authorityObject);
  resealed.historicalEvidence[0].candidateCommit = "0".repeat(40);
  const projection = structuredClone(resealed);
  delete projection.seal.authorityJcsSha256;
  resealed.seal.authorityJcsSha256 = sha256(Buffer.from(jcs(projection), "utf8"));
  const resealedBytes = Buffer.from(`${jcs(resealed)}\n`, "utf8");
  const resealedPath = path.join(ignored, "root-resealed.json");
  fs.writeFileSync(resealedPath, resealedBytes);
  const resealedEnvelope = structuredClone(envelope);
  resealedEnvelope.authorityBinding.path = path.relative(repo, resealedPath).split(path.sep).join("/");
  resealedEnvelope.authorityBinding.fileSha256 = sha256(resealedBytes);
  resealedEnvelope.authorityBinding.authorityJcsSha256 = resealed.seal.authorityJcsSha256;
  const resealedEnvelopePath = path.join(temp, "resealed-envelope.json");
  fs.writeFileSync(resealedEnvelopePath, `${JSON.stringify(resealedEnvelope)}\n`);
  results.priorDefectWitnesses.ignoredResealedAlteredRoot = verifier(repo, resealedPath, resealedEnvelopePath);

  for (const leaf of leaves) {
    let original = envelope;
    for (const part of leaf.split(".")) original = original[part];
    const mutation = setLeaf(envelope, leaf, changedLeaf(original));
    const mutationPath = path.join(temp, `envelope-${leaf.replaceAll(".", "-")}.json`);
    fs.writeFileSync(mutationPath, `${JSON.stringify(mutation)}\n`);
    results.envelopeLeaves.push({ leaf, outcome: verifier(repo, authorityRel, mutationPath) });
  }
  results.gitAndMembership.historicalImportedEnvelope = verifier(repo, authorityRel, historicalEnvelopePath);

  fs.writeFileSync(path.join(repo, "fresh-visible-dirty.txt"), "dirty\n");
  results.gitAndMembership.visibleDirty = verifier(repo, authorityRel, envelopePath);
  fs.rmSync(path.join(repo, "fresh-visible-dirty.txt"));

  git(["update-ref", expectedRef, expectedParent], repo);
  results.gitAndMembership.movedExpectedRef = verifier(repo, authorityRel, envelopePath);
  git(["update-ref", expectedRef, expectedHead], repo);

  git(["checkout", "--quiet", "-b", "codex/fresh-wrong-attachment", expectedHead], repo);
  results.gitAndMembership.wrongAttachment = verifier(repo, authorityRel, envelopePath);
  git(["checkout", "--quiet", "--detach", expectedHead], repo);

  const rootObject = run("git", ["rev-parse", `HEAD:${authorityRel}`], repo);
  if (rootObject.exit !== 0) throw new Error("cannot resolve root blob");
  const rootBlob = spawnSync("git", ["rev-parse", `HEAD:${authorityRel}`], { cwd: repo, encoding: "utf8" }).stdout.trim();
  fs.writeFileSync(authorityAbs, Buffer.concat([authorityBytes, Buffer.from(" \n")]));
  results.gitAndMembership.unstagedRootDrift = verifier(repo, authorityRel);
  fs.writeFileSync(authorityAbs, authorityBytes);

  fs.writeFileSync(authorityAbs, Buffer.concat([authorityBytes, Buffer.from(" \n")]));
  git(["add", "--", authorityRel], repo);
  results.gitAndMembership.stagedRootDrift = verifier(repo, authorityRel);
  fs.writeFileSync(authorityAbs, authorityBytes);
  git(["update-index", "--cacheinfo", "100644", rootBlob, authorityRel], repo);

  fs.writeFileSync(manifestAbs, Buffer.concat([manifestBytes, Buffer.from(" \n")]));
  results.manifestAndPhysical.unstagedManifestDrift = verifier(repo, authorityRel);
  fs.writeFileSync(manifestAbs, manifestBytes);

  const profileRel = "docs/review-evidence/phase-1b-stage4a-phase-b-v111-m01-replacement-corrected-design-v2-1/PHASE_B_CURRENT_TECHNICAL_PROFILE_V2_1.json";
  const profileAbs = path.join(repo, profileRel);
  const profileBytes = fs.readFileSync(profileAbs);
  fs.rmSync(profileAbs);
  fs.linkSync(authorityAbs, profileAbs);
  results.manifestAndPhysical.rootHardlinkCurrentProfile = verifier(repo, authorityRel);
  fs.rmSync(profileAbs);
  fs.writeFileSync(profileAbs, profileBytes);

  const manifestLines = manifestBytes.toString("utf8").trimEnd().split("\n");
  const rootLineIndex = manifestLines.findIndex((line) => line.endsWith(`  ${authorityRel}`));
  if (rootLineIndex < 0) throw new Error("root manifest line absent from baseline");
  const commitManifestVariant = (name, lines) => {
    git(["checkout", "--quiet", "--detach", expectedHead], repo);
    fs.writeFileSync(manifestAbs, `${lines.join("\n")}\n`);
    git(["add", "--", manifestRel], repo);
    const commit = run("git", ["-c", "user.name=Fresh Reviewer", "-c", "user.email=reviewer.invalid@example.invalid", "commit", "--quiet", "-m", `reviewer ${name}`], repo);
    if (commit.exit !== 0) throw new Error(`manifest variant commit failed: ${name}`);
    results.manifestAndPhysical[name] = verifier(repo, authorityRel);
  };
  commitManifestVariant("committedManifestMissingRoot", manifestLines.filter((_, index) => index !== rootLineIndex));
  commitManifestVariant("committedManifestDuplicateRoot", [...manifestLines, manifestLines[rootLineIndex]]);
  const wrongHash = [...manifestLines];
  wrongHash[rootLineIndex] = `${"0".repeat(64)}  ${authorityRel}`;
  commitManifestVariant("committedManifestWrongRootHash", wrongHash);
  const reordered = [...manifestLines];
  [reordered[0], reordered[1]] = [reordered[1], reordered[0]];
  commitManifestVariant("committedManifestReordered", reordered);
  git(["checkout", "--quiet", "--detach", expectedHead], repo);

  results.gitAndMembership.finalStatus = run("git", ["status", "--porcelain=v1", "--untracked-files=all"], repo);
  process.stdout.write(`${JSON.stringify(results, null, 2)}\n`);
} finally {
  fs.rmSync(temp, { recursive: true, force: true });
}
