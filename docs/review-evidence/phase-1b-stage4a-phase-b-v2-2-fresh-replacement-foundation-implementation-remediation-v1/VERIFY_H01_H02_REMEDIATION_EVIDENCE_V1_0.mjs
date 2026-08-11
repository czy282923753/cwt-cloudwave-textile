import { createHash } from "node:crypto";
import { execFileSync, spawnSync } from "node:child_process";
import { readFileSync, realpathSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const evidenceRoot = dirname(fileURLToPath(import.meta.url));
const repositoryRoot = realpathSync(resolve(evidenceRoot, "../../.."));
const authorityPath = resolve(evidenceRoot, "H01_H02_REMEDIATION_AUTHORITY_V1_0.json");
const manifestPath = resolve(evidenceRoot, "SHA256SUMS.txt");
const failedReviewRoot = resolve(repositoryRoot,
  "docs/review-evidence/phase-1b-stage4a-phase-b-v2-2-fresh-replacement-foundation-implementation-independent-review-v1");

const expected = Object.freeze({
  node: "24.14.0",
  branch: "codex/phase-1b-stage4a-phase-b-v2-2-fresh-replacement-implementation-remediation-v1",
  failedCandidate: "b95390c34fc4fe687f6e7577a7505a7394bca80b",
  codeHead: "8cd768fada5da140d62aa48b7efc02d60cf1758b",
  codeParent: "8c43df1719fb550f9849ee6dd26e169a351e0339",
  codeTree: "242b1b8eeff9c38bc872d0f56a1e7bcaf2592752",
  authoritySha256: "aa8f7f2c2502b08860c6232c852ccc0eac5eb4ba5e1db1d6bd850a0f1912c3b8",
  failedReviewManifestSha256: "506276efb41a4e472a3f40ce8d9e0d41a38002fca59355eaee7a0ab807da874b",
  checkpoints: Object.freeze({
    "refs/heads/codex/checkpoint/phase-1b-stage4a-phase-b-v2-2-fresh-implementation-pre-l3-v1":
      "9aa9735f422975780585e62eaec1a4759f9894c9",
    "refs/heads/codex/checkpoint/phase-1b-stage4a-phase-b-v2-2-db-client-convergence-pre-l3-v1":
      "d83cfb69a2abb51b95e43db3ea23c87c0410692b",
  }),
  failedRef: "refs/heads/codex/phase-1b-stage4a-phase-b-v2-2-fresh-replacement-implementation-v1",
});

function fail(message) {
  throw new Error(`H01/H02 remediation evidence verification failed: ${message}`);
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function git(args) {
  return execFileSync("git", args, {
    cwd: repositoryRoot,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trimEnd();
}

function requireEqual(actual, wanted, label) {
  if (actual !== wanted) fail(`${label}: expected ${wanted}, got ${actual}`);
}

function parseManifest(path) {
  const lines = readFileSync(path, "utf8").split("\n").filter(Boolean);
  return lines.map((line) => {
    const match = /^([0-9a-f]{64})  (.+)$/u.exec(line);
    if (match === null) fail(`invalid manifest line in ${path}: ${line}`);
    return { sha256: match[1], path: match[2] };
  });
}

function verifyManifest(path, expectedPaths) {
  const entries = parseManifest(path);
  requireEqual(JSON.stringify(entries.map((entry) => entry.path)), JSON.stringify(expectedPaths),
    `manifest membership/order for ${path}`);
  const root = dirname(path);
  for (const entry of entries) {
    const absolute = resolve(root, entry.path);
    requireEqual(sha256(readFileSync(absolute)), entry.sha256, `manifest hash ${entry.path}`);
  }
  return entries;
}

if (process.versions.node !== expected.node) fail(`Node must be ${expected.node}`);
requireEqual(realpathSync(git(["rev-parse", "--show-toplevel"])), repositoryRoot, "repository root");
requireEqual(git(["symbolic-ref", "--short", "HEAD"]), expected.branch, "branch");
requireEqual(git(["rev-parse", `${expected.codeHead}^{commit}`]), expected.codeHead, "corrected code HEAD");
requireEqual(git(["rev-parse", `${expected.codeHead}^`]), expected.codeParent, "corrected code parent");
requireEqual(git(["rev-parse", `${expected.codeHead}^{tree}`]), expected.codeTree, "corrected code tree");
requireEqual(git(["rev-parse", expected.failedRef]), expected.failedCandidate, "preserved failed Candidate ref");
for (const [ref, commit] of Object.entries(expected.checkpoints)) {
  requireEqual(git(["rev-parse", ref]), commit, `checkpoint ${ref}`);
}
const ancestor = spawnSync("git", ["merge-base", "--is-ancestor", expected.codeHead, "HEAD"], {
  cwd: repositoryRoot,
  stdio: "ignore",
});
if (ancestor.status !== 0) fail("corrected code HEAD is not an ancestor of Candidate HEAD");
const successorPaths = git(["diff", "--name-only", `${expected.codeHead}..HEAD`]).split("\n").filter(Boolean);
if (successorPaths.length === 0 || successorPaths.some((path) => !path.startsWith("docs/"))) {
  fail("every corrected-code successor must be docs-only");
}

const authorityBytes = readFileSync(authorityPath);
requireEqual(sha256(authorityBytes), expected.authoritySha256, "authority SHA-256");
const authority = JSON.parse(authorityBytes);
requireEqual(authority.status, "CORRECTED_CANDIDATE_REVIEW_REQUIRED_NOT_ACCEPTED", "authority status");
if (authority.acceptanceClaim !== false || authority.selfApproval !== false) fail("authority must not claim acceptance");
requireEqual(authority.correctedCode.head, expected.codeHead, "authority code HEAD");
requireEqual(authority.correctedCode.tree, expected.codeTree, "authority code tree");

const changedPath = resolve(evidenceRoot, "CHANGED_PATH_INVENTORY_V1_0.json");
const verificationCapture = resolve(evidenceRoot, "H01_H02_REMEDIATION_VERIFICATION_CAPTURE_V1_0.json");
requireEqual(sha256(readFileSync(changedPath)), authority.changedPathBoundary.sha256, "changed-path capture hash");
requireEqual(sha256(readFileSync(verificationCapture)), authority.verificationCapture.sha256,
  "verification capture hash");
const changed = JSON.parse(readFileSync(changedPath));
const expectedCodeDiff = [
  "M\tscripts/verify-ai-architecture.ts",
  "M\tsrc/ai/applications/draft-assistance/composition.ts",
  "M\tsrc/ai/provider-neutral-foundation.integration.test.ts",
  "M\ttest-fixtures/ai-architecture/graph-faults.v3_1.json",
];
requireEqual(git(["diff", "--name-status", `${expected.failedCandidate}..${expected.codeHead}`]),
  expectedCodeDiff.join("\n"), "bounded Product-code diff");
requireEqual(JSON.stringify(changed.paths.map((entry) => `${entry.status}\t${entry.path}`)),
  JSON.stringify(expectedCodeDiff), "changed-path inventory");
for (const entry of changed.paths) {
  requireEqual(sha256(readFileSync(resolve(repositoryRoot, entry.path))), entry.correctedSha256,
    `corrected Product-code hash ${entry.path}`);
}
const forbiddenDiff = git(["diff", "--name-only", `${expected.failedCandidate}..${expected.codeHead}`, "--",
  "src/db", "src/app", "src/public-site", "src/seo", "src/ai/prompts", "src/ai/providers",
  "package.json", "pnpm-lock.yaml", "tsconfig.json", "eslint.config.mjs", "next.config.ts"]);
requireEqual(forbiddenDiff, "", "preserved forbidden/frozen paths");

requireEqual(sha256(readFileSync(resolve(failedReviewRoot, "SHA256SUMS.txt"))),
  expected.failedReviewManifestSha256, "controlling FAIL manifest SHA-256");
const failedReviewEntries = verifyManifest(resolve(failedReviewRoot, "SHA256SUMS.txt"), [
  "../../PHASE_1B_STAGE4A_PHASE_B_V2_2_FRESH_REPLACEMENT_FOUNDATION_IMPLEMENTATION_INDEPENDENT_REVIEW_V1_0.md",
  "IDENTITY_SCOPE_AND_VERIFICATION_CAPTURE_V1_0.txt",
  "INDEPENDENT_REVIEW_EVIDENCE_V1_0.md",
  "REVIEWER_FRESH_REPLACEMENT_IMPLEMENTATION_TEST_OUTPUT_V1_0.txt",
  "REVIEWER_FRESH_REPLACEMENT_IMPLEMENTATION_TEST_V1_0.ts",
  "REVIEWER_M04_GLOBALTHIS_FETCH_FAULT_V1_0.patch",
  "REVIEWER_M04_GLOBALTHIS_FETCH_GATE_RESULT_V1_0.txt",
]);

const remediationManifestPaths = [
  "../../PHASE_1B_STAGE4A_PHASE_B_V2_2_FRESH_REPLACEMENT_FOUNDATION_IMPLEMENTATION_REMEDIATION_V1_0.md",
  "../phase-1b-stage4a-phase-b-v2-2-fresh-replacement-foundation-implementation-independent-review-v1/IDENTITY_SCOPE_AND_VERIFICATION_CAPTURE_V1_0.txt",
  "../phase-1b-stage4a-phase-b-v2-2-fresh-replacement-foundation-implementation-independent-review-v1/INDEPENDENT_REVIEW_EVIDENCE_V1_0.md",
  "../phase-1b-stage4a-phase-b-v2-2-fresh-replacement-foundation-implementation-independent-review-v1/REVIEWER_FRESH_REPLACEMENT_IMPLEMENTATION_TEST_OUTPUT_V1_0.txt",
  "../phase-1b-stage4a-phase-b-v2-2-fresh-replacement-foundation-implementation-independent-review-v1/REVIEWER_FRESH_REPLACEMENT_IMPLEMENTATION_TEST_V1_0.ts",
  "../phase-1b-stage4a-phase-b-v2-2-fresh-replacement-foundation-implementation-independent-review-v1/REVIEWER_M04_GLOBALTHIS_FETCH_FAULT_V1_0.patch",
  "../phase-1b-stage4a-phase-b-v2-2-fresh-replacement-foundation-implementation-independent-review-v1/REVIEWER_M04_GLOBALTHIS_FETCH_GATE_RESULT_V1_0.txt",
  "../phase-1b-stage4a-phase-b-v2-2-fresh-replacement-foundation-implementation-independent-review-v1/SHA256SUMS.txt",
  "CHANGED_PATH_INVENTORY_V1_0.json",
  "H01_H02_REMEDIATION_AUTHORITY_V1_0.json",
  "H01_H02_REMEDIATION_VERIFICATION_CAPTURE_V1_0.json",
  "M04_PROOF_ARTIFACTS_V3_1/AI_ACTUAL_TREE_AND_STATIC_LANGUAGE_PROOF_V3_1.json",
  "M04_PROOF_ARTIFACTS_V3_1/AI_CAPABILITY_ORIGIN_AND_NON_REACHABILITY_PROOF_V3_1.json",
  "M04_PROOF_ARTIFACTS_V3_1/AI_PHASE_B_COMPOSITION_PROOF_V3_1.json",
  "M04_PROOF_ARTIFACTS_V3_1/AI_SERVER_PUBLIC_BUNDLE_BOUNDARY_V3_1.json",
  "M04_PROOF_ARTIFACTS_V3_1/AI_STATIC_MODULE_AND_RESOURCE_GRAPH_PROOF_V3_1.json",
  "VERIFY_H01_H02_REMEDIATION_EVIDENCE_V1_0.mjs",
];
const remediationEntries = verifyManifest(manifestPath, remediationManifestPaths);
const proofPaths = remediationManifestPaths.filter((path) => path.startsWith("M04_PROOF_ARTIFACTS_V3_1/"));
requireEqual(String(proofPaths.length), "5", "M04 proof artifact count");
for (const path of proofPaths) {
  const proof = JSON.parse(readFileSync(resolve(evidenceRoot, path)));
  requireEqual(proof.candidateCommit, expected.codeHead, `proof Candidate ${path}`);
  requireEqual(String(proof.schemaVersion), "31", `proof schema ${path}`);
}

const requireClean = process.argv.includes("--require-clean");
const clean = git(["status", "--porcelain=v1"]) === "";
if (requireClean && !clean) fail("formal worktree is not clean");
process.stdout.write(`${JSON.stringify({
  ok: true,
  status: authority.status,
  candidateHead: git(["rev-parse", "HEAD"]),
  correctedCodeHead: expected.codeHead,
  correctedCodeTree: expected.codeTree,
  docsOnlySuccessors: successorPaths.length,
  manifestEntries: remediationEntries.length,
  controllingFailEntries: failedReviewEntries.length,
  proofArtifacts: proofPaths.length,
  clean,
}, null, 2)}\n`);
