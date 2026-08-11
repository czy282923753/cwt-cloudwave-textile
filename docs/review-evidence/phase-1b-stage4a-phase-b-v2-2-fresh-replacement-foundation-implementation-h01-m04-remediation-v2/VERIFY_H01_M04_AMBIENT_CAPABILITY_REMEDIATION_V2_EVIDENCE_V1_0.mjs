import { createHash } from "node:crypto";
import { execFileSync, spawnSync } from "node:child_process";
import { readFileSync, realpathSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const evidenceRoot = dirname(fileURLToPath(import.meta.url));
const repositoryRoot = realpathSync(resolve(evidenceRoot, "../../.."));
const authorityPath = resolve(evidenceRoot, "H01_M04_AMBIENT_CAPABILITY_REMEDIATION_V2_AUTHORITY_V1_0.json");
const manifestPath = resolve(evidenceRoot, "SHA256SUMS.txt");
const controllingFailRoot = resolve(repositoryRoot,
  "docs/review-evidence/phase-1b-stage4a-phase-b-v2-2-fresh-replacement-foundation-implementation-remediation-v1-independent-rereview-v1");

const expected = Object.freeze({
  node: "24.14.0",
  branch: "codex/phase-1b-stage4a-phase-b-v2-2-fresh-replacement-implementation-h01-m04-remediation-v2",
  failedCandidate: "49f789a9e4c5c7f2a3dbd7eaddba17e6a248832b",
  codeHead: "75c77797d64636d303cea2e8683c7a093fe8ec1f",
  codeParent: "49f789a9e4c5c7f2a3dbd7eaddba17e6a248832b",
  codeTree: "018d872a3544bbfc9d0f6aa84b08911d262ee2b9",
  authoritySha256: "2f3aa02b13f2f3b927409c18f1c1e7a4ddab55f9f4bc6356d3d86c0c2d4eec8a",
  controllingFailManifestSha256: "d1e66f0a1ffdfb898e62508643c6488027ad98eb79eddff05e4543cf66776cd7",
  profileFileSha256: "766c10d8170276f4eaf51f3609ae02b9cf8f31776dc65634a9e4c4f1a36066f4",
  profileIntegritySha256: "84dc5dd7b95e391524a7dc657a9473d24afeb8ae6f82e2067dabc2ffa410c869",
  checkpoints: Object.freeze({
    "refs/heads/codex/checkpoint/phase-1b-stage4a-phase-b-v2-2-fresh-implementation-pre-l3-v1":
      "9aa9735f422975780585e62eaec1a4759f9894c9",
    "refs/heads/codex/checkpoint/phase-1b-stage4a-phase-b-v2-2-db-client-convergence-pre-l3-v1":
      "d83cfb69a2abb51b95e43db3ea23c87c0410692b",
  }),
  failedRef: "refs/heads/codex/phase-1b-stage4a-phase-b-v2-2-fresh-replacement-implementation-remediation-v1",
});

function fail(message) {
  throw new Error(`H01/M04 ambient-capability remediation V2 evidence verification failed: ${message}`);
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

function parseManifest(manifestFile) {
  return readFileSync(manifestFile, "utf8").split("\n").filter(Boolean).map((line) => {
    const match = /^([0-9a-f]{64})  (.+)$/u.exec(line);
    if (match === null) fail(`invalid manifest line in ${manifestFile}: ${line}`);
    return { sha256: match[1], path: match[2] };
  });
}

function verifyManifest(manifestFile, expectedPaths, baseDirectory) {
  const entries = parseManifest(manifestFile);
  requireEqual(JSON.stringify(entries.map((entry) => entry.path)), JSON.stringify(expectedPaths),
    `manifest membership/order for ${manifestFile}`);
  for (const entry of entries) {
    requireEqual(sha256(readFileSync(resolve(baseDirectory, entry.path))), entry.sha256,
      `manifest hash ${entry.path}`);
  }
  return entries;
}

if (process.versions.node !== expected.node) fail(`Node must be ${expected.node}`);
requireEqual(realpathSync(git(["rev-parse", "--show-toplevel"])), repositoryRoot, "repository root");
requireEqual(git(["symbolic-ref", "--short", "HEAD"]), expected.branch, "branch");
requireEqual(git(["rev-parse", `${expected.codeHead}^{commit}`]), expected.codeHead, "corrected code HEAD");
requireEqual(git(["rev-parse", `${expected.codeHead}^`]), expected.codeParent, "corrected code parent");
requireEqual(git(["rev-parse", `${expected.codeHead}^{tree}`]), expected.codeTree, "corrected code tree");
requireEqual(git(["rev-parse", expected.failedRef]), expected.failedCandidate, "preserved failed remediation ref");
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
requireEqual(String(authority.attempts["H-01"]), "2", "H-01 attempt count");
requireEqual(authority.findings["H-02"].outcome, "CLOSED_non_regression_only", "H-02 disposition");

const changedPath = resolve(evidenceRoot, "CHANGED_PATH_INVENTORY_V2_0.json");
const verificationCapture = resolve(evidenceRoot,
  "H01_M04_AMBIENT_CAPABILITY_REMEDIATION_V2_VERIFICATION_CAPTURE_V1_0.json");
requireEqual(sha256(readFileSync(changedPath)), authority.changedPathBoundary.sha256, "changed-path capture hash");
requireEqual(sha256(readFileSync(verificationCapture)), authority.verificationCapture.sha256,
  "verification capture hash");
const changed = JSON.parse(readFileSync(changedPath));
const expectedCodeDiff = [
  "M\tscripts/verify-ai-architecture.ts",
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
  "src/ai", "src/db", "src/server/ai", "src/app", "src/public-site", "src/seo", "drizzle",
  "package.json", "pnpm-lock.yaml", "tsconfig.json", "eslint.config.mjs", "next.config.ts"]);
requireEqual(forbiddenDiff, "", "preserved runtime/frozen paths");

const profilePath = resolve(repositoryRoot, "test-fixtures/ai-architecture/graph-faults.v3_1.json");
requireEqual(sha256(readFileSync(profilePath)), expected.profileFileSha256, "V3.1 profile file SHA-256");
const profileBundle = JSON.parse(readFileSync(profilePath));
requireEqual(profileBundle.profile.profileIntegrity.sha256, expected.profileIntegritySha256,
  "V3.1 selected-pointer integrity SHA-256");
const semanticFaultIds = [
  "bare-fetch-reviewer-witness", "bare-websocket-construction", "bare-event-source-construction",
  "bare-xml-http-request-construction", "bare-fetch-alias-capture", "bare-fetch-bind",
  "bare-fetch-call", "bare-fetch-apply", "bare-fetch-static-field", "bare-fetch-container-destructure",
  "bare-fetch-iife-argument", "ambient-window-fetch-member", "ambient-self-computed-fetch-member",
  "ambient-window-destructured-fetch", "ambient-global-websocket-member",
  "ambient-navigator-send-beacon-member",
];
const observedFaults = profileBundle.faultCases.filter((entry) => semanticFaultIds.includes(entry.id));
requireEqual(JSON.stringify(observedFaults.map((entry) => entry.id)), JSON.stringify(semanticFaultIds),
  "semantic fault fixture membership/order");
if (observedFaults.some((entry) => entry.expectedReason !== "denied_capability_origin" ||
  entry.expectedNodeKind !== "Identifier")) fail("semantic fault fixture diagnostics weakened");
requireEqual(observedFaults[0].source, "void fetch(\"https://api.deepseek.com\");\n",
  "exact Reviewer bare-fetch witness");
const shadowPositiveIds = profileBundle.positiveCases.map((entry) => entry.id)
  .filter((id) => id.includes("ambient-name-shadows"));
requireEqual(JSON.stringify(shadowPositiveIds), JSON.stringify([
  "repository-local-ambient-name-shadows", "repository-imported-ambient-name-shadows",
]), "semantic shadow positives");

requireEqual(sha256(readFileSync(resolve(controllingFailRoot, "SHA256SUMS.txt"))),
  expected.controllingFailManifestSha256, "controlling FAIL manifest SHA-256");
const controllingPaths = [
  "docs/PHASE_1B_STAGE4A_PHASE_B_V2_2_FRESH_REPLACEMENT_FOUNDATION_IMPLEMENTATION_REMEDIATION_V1_INDEPENDENT_REREVIEW_V1_0.md",
  "docs/review-evidence/phase-1b-stage4a-phase-b-v2-2-fresh-replacement-foundation-implementation-remediation-v1-independent-rereview-v1/IDENTITY_SCOPE_AND_VERIFICATION_CAPTURE_V1_0.txt",
  "docs/review-evidence/phase-1b-stage4a-phase-b-v2-2-fresh-replacement-foundation-implementation-remediation-v1-independent-rereview-v1/INDEPENDENT_IMPLEMENTATION_REREVIEW_EVIDENCE_V1_0.md",
  "docs/review-evidence/phase-1b-stage4a-phase-b-v2-2-fresh-replacement-foundation-implementation-remediation-v1-independent-rereview-v1/REVIEWER_H01_AMBIENT_FETCH_FAULT_V1_0.patch",
  "docs/review-evidence/phase-1b-stage4a-phase-b-v2-2-fresh-replacement-foundation-implementation-remediation-v1-independent-rereview-v1/REVIEWER_H01_AMBIENT_FETCH_GATE_RESULT_V1_0.txt",
  "docs/review-evidence/phase-1b-stage4a-phase-b-v2-2-fresh-replacement-foundation-implementation-remediation-v1-independent-rereview-v1/REVIEWER_H02_AUTHORIZATION_ORDER_OUTPUT_V1_0.txt",
  "docs/review-evidence/phase-1b-stage4a-phase-b-v2-2-fresh-replacement-foundation-implementation-remediation-v1-independent-rereview-v1/REVIEWER_H02_AUTHORIZATION_ORDER_PROBE_V1_0.ts",
];
const controllingEntries = verifyManifest(resolve(controllingFailRoot, "SHA256SUMS.txt"),
  controllingPaths, repositoryRoot);

const remediationManifestPaths = [
  "../../PHASE_1B_STAGE4A_PHASE_B_V2_2_FRESH_REPLACEMENT_FOUNDATION_IMPLEMENTATION_H01_M04_AMBIENT_CAPABILITY_REMEDIATION_V2_0.md",
  "../../PHASE_1B_STAGE4A_PHASE_B_V2_2_FRESH_REPLACEMENT_FOUNDATION_IMPLEMENTATION_REMEDIATION_V1_INDEPENDENT_REREVIEW_V1_0.md",
  "../phase-1b-stage4a-phase-b-v2-2-fresh-replacement-foundation-implementation-remediation-v1-independent-rereview-v1/IDENTITY_SCOPE_AND_VERIFICATION_CAPTURE_V1_0.txt",
  "../phase-1b-stage4a-phase-b-v2-2-fresh-replacement-foundation-implementation-remediation-v1-independent-rereview-v1/INDEPENDENT_IMPLEMENTATION_REREVIEW_EVIDENCE_V1_0.md",
  "../phase-1b-stage4a-phase-b-v2-2-fresh-replacement-foundation-implementation-remediation-v1-independent-rereview-v1/REVIEWER_H01_AMBIENT_FETCH_FAULT_V1_0.patch",
  "../phase-1b-stage4a-phase-b-v2-2-fresh-replacement-foundation-implementation-remediation-v1-independent-rereview-v1/REVIEWER_H01_AMBIENT_FETCH_GATE_RESULT_V1_0.txt",
  "../phase-1b-stage4a-phase-b-v2-2-fresh-replacement-foundation-implementation-remediation-v1-independent-rereview-v1/REVIEWER_H02_AUTHORIZATION_ORDER_OUTPUT_V1_0.txt",
  "../phase-1b-stage4a-phase-b-v2-2-fresh-replacement-foundation-implementation-remediation-v1-independent-rereview-v1/REVIEWER_H02_AUTHORIZATION_ORDER_PROBE_V1_0.ts",
  "../phase-1b-stage4a-phase-b-v2-2-fresh-replacement-foundation-implementation-remediation-v1-independent-rereview-v1/SHA256SUMS.txt",
  "CHANGED_PATH_INVENTORY_V2_0.json",
  "H01_M04_AMBIENT_CAPABILITY_REMEDIATION_V2_AUTHORITY_V1_0.json",
  "H01_M04_AMBIENT_CAPABILITY_REMEDIATION_V2_VERIFICATION_CAPTURE_V1_0.json",
  "M04_PROOF_ARTIFACTS_V3_1/AI_ACTUAL_TREE_AND_STATIC_LANGUAGE_PROOF_V3_1.json",
  "M04_PROOF_ARTIFACTS_V3_1/AI_CAPABILITY_ORIGIN_AND_NON_REACHABILITY_PROOF_V3_1.json",
  "M04_PROOF_ARTIFACTS_V3_1/AI_PHASE_B_COMPOSITION_PROOF_V3_1.json",
  "M04_PROOF_ARTIFACTS_V3_1/AI_SERVER_PUBLIC_BUNDLE_BOUNDARY_V3_1.json",
  "M04_PROOF_ARTIFACTS_V3_1/AI_STATIC_MODULE_AND_RESOURCE_GRAPH_PROOF_V3_1.json",
  "VERIFY_H01_M04_AMBIENT_CAPABILITY_REMEDIATION_V2_EVIDENCE_V1_0.mjs",
];
const remediationEntries = verifyManifest(manifestPath, remediationManifestPaths, evidenceRoot);
const proofPaths = remediationManifestPaths.filter((path) => path.startsWith("M04_PROOF_ARTIFACTS_V3_1/"));
requireEqual(String(proofPaths.length), "5", "M04 proof artifact count");
for (const proofPath of proofPaths) {
  const proof = JSON.parse(readFileSync(resolve(evidenceRoot, proofPath)));
  requireEqual(proof.candidateCommit, expected.codeHead, `proof Candidate ${proofPath}`);
  requireEqual(String(proof.schemaVersion), "31", `proof schema ${proofPath}`);
  requireEqual(proof.profileSha256, expected.profileIntegritySha256, `proof profile ${proofPath}`);
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
  controllingFailEntries: controllingEntries.length,
  semanticFaults: semanticFaultIds.length,
  shadowPositives: shadowPositiveIds.length,
  proofArtifacts: proofPaths.length,
  clean,
}, null, 2)}\n`);
