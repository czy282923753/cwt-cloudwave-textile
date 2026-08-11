import { createHash } from "node:crypto";
import { execFileSync, spawnSync } from "node:child_process";
import { readFileSync, realpathSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const evidenceRoot = dirname(fileURLToPath(import.meta.url));
const repositoryRoot = realpathSync(resolve(evidenceRoot, "../../.."));
const authorityPath = resolve(evidenceRoot,
  "H01_M04_RUNTIME_EMITTING_ORIGIN_REMEDIATION_V3_AUTHORITY_V1_0.json");
const manifestPath = resolve(evidenceRoot, "SHA256SUMS.txt");
const controllingFailRoot = resolve(repositoryRoot,
  "docs/review-evidence/phase-1b-stage4a-phase-b-v2-2-fresh-replacement-foundation-implementation-h01-m04-remediation-v2-independent-rereview-v1");

const expected = Object.freeze({
  node: "24.14.0",
  branch: "codex/phase-1b-stage4a-phase-b-v2-2-fresh-replacement-implementation-h01-m04-final-remediation-v3",
  failedCandidate: "d41c9c4bd496f4c3a612c6ac88cc5acf6ae83308",
  failedCodeHead: "75c77797d64636d303cea2e8683c7a093fe8ec1f",
  codeHead: "df3369e5459c9eaf45186ee3140d94495254bf22",
  codeParent: "d41c9c4bd496f4c3a612c6ac88cc5acf6ae83308",
  codeTree: "6574602ac86d0d30dcc64aa585f83257410c99b2",
  authoritySha256: "dc0f89af2bfd3cf64e4e4ced7bfad340fc50ee327bb1008fa5791509e79b1bbd",
  reportSha256: "72fbb41219d2d33a9d363cf7a595e8246c163bc98e99ef363ce949c354245f8f",
  controllingFailManifestSha256: "a32892113675c1eaa52036a5cac6450bbb4b3e34882d1fab607f2d1995b9b199",
  controllingFailReportSha256: "c4417c89dcc898116aaf24c9a42f6a706f34724e8ea88fe8cc15d53763ce1143",
  profileFileSha256: "3a5ad42377740ee9072900b6b050ca4ec61ebba716a2238a41f963a63c6b7d45",
  profileIntegritySha256: "ef984a8366dbf837d941694fe79e03638d8c597b9a91e0daf761d5ae2fc42985",
  checkpoints: Object.freeze({
    "refs/heads/codex/checkpoint/phase-1b-stage4a-phase-b-v111-m01-v2-2-design-accepted-v1":
      "9aa9735f422975780585e62eaec1a4759f9894c9",
    "refs/heads/codex/checkpoint/phase-1b-stage4a-phase-b-v2-2-fresh-implementation-pre-l3-v1":
      "9aa9735f422975780585e62eaec1a4759f9894c9",
    "refs/heads/codex/checkpoint/phase-1b-stage4a-phase-b-v2-2-db-client-convergence-pre-l3-v1":
      "d83cfb69a2abb51b95e43db3ea23c87c0410692b",
  }),
  failedRef:
    "refs/heads/codex/phase-1b-stage4a-phase-b-v2-2-fresh-replacement-implementation-h01-m04-remediation-v2",
});

function fail(message) {
  throw new Error(`H01/M04 runtime-emitting-origin remediation V3 evidence verification failed: ${message}`);
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
requireEqual(git(["rev-parse", expected.failedRef]), expected.failedCandidate, "preserved failed attempt-2 ref");
requireEqual(git(["rev-parse", `${expected.failedCandidate}^`]), expected.failedCodeHead,
  "failed attempt-2 Candidate parent/code HEAD");
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
requireEqual(authority.status, "FINAL_ORDINARY_ATTEMPT3_CANDIDATE_REVIEW_REQUIRED_NOT_ACCEPTED",
  "authority status");
if (authority.acceptanceClaim !== false || authority.selfApproval !== false) {
  fail("authority must not claim acceptance");
}
requireEqual(authority.correctedCode.head, expected.codeHead, "authority code HEAD");
requireEqual(authority.correctedCode.parent, expected.codeParent, "authority code parent");
requireEqual(authority.correctedCode.tree, expected.codeTree, "authority code tree");
requireEqual(String(authority.attempts["H-01"]), "3", "H-01 attempt count");
requireEqual(String(authority.attempts["H-02"]), "1", "H-02 attempt count");
if (authority.attempts.ordinaryAttempt4Authorized !== false ||
  authority.attempts.threeStrikeIfSameRootRemainsOpenAfterIndependentReview !== true) {
  fail("three-strike/final ordinary attempt boundary changed");
}
requireEqual(authority.findings["H-02"].outcome, "CLOSED_non_regression_only", "H-02 disposition");

const reportPath = resolve(repositoryRoot,
  "docs/PHASE_1B_STAGE4A_PHASE_B_V2_2_FRESH_REPLACEMENT_FOUNDATION_IMPLEMENTATION_H01_M04_FINAL_REMEDIATION_V3_0.md");
requireEqual(sha256(readFileSync(reportPath)), expected.reportSha256, "implementation report SHA-256");
const changedPath = resolve(evidenceRoot, "CHANGED_PATH_INVENTORY_V3_0.json");
const verificationCapture = resolve(evidenceRoot,
  "H01_M04_RUNTIME_EMITTING_ORIGIN_REMEDIATION_V3_VERIFICATION_CAPTURE_V1_0.json");
requireEqual(sha256(readFileSync(changedPath)), authority.changedPathBoundary.sha256,
  "changed-path capture hash");
requireEqual(sha256(readFileSync(verificationCapture)), authority.verificationCapture.sha256,
  "verification capture hash");

const expectedCodeDiff = [
  "M\tscripts/verify-ai-architecture.ts",
  "M\ttest-fixtures/ai-architecture/graph-faults.v3_1.json",
];
requireEqual(git(["diff", "--name-status", `${expected.failedCandidate}..${expected.codeHead}`]),
  expectedCodeDiff.join("\n"), "bounded Product-code diff");
const changed = JSON.parse(readFileSync(changedPath));
requireEqual(JSON.stringify(changed.paths.map((entry) => `${entry.status}\t${entry.path}`)),
  JSON.stringify(expectedCodeDiff), "changed-path inventory");
for (const entry of changed.paths) {
  requireEqual(sha256(readFileSync(resolve(repositoryRoot, entry.path))), entry.correctedSha256,
    `corrected Product-code hash ${entry.path}`);
}
requireEqual(git(["diff", "--name-only", `${expected.failedCandidate}..${expected.codeHead}`, "--", "src"]),
  "", "attempt-3 src runtime preservation");

const profilePath = resolve(repositoryRoot, "test-fixtures/ai-architecture/graph-faults.v3_1.json");
requireEqual(sha256(readFileSync(profilePath)), expected.profileFileSha256, "V3.1 profile file SHA-256");
const profileBundle = JSON.parse(readFileSync(profilePath));
requireEqual(profileBundle.profile.profileIntegrity.sha256, expected.profileIntegritySha256,
  "V3.1 selected-pointer integrity SHA-256");
requireEqual(String(profileBundle.faultCases.length), "66", "fault fixture count");
requireEqual(String(profileBundle.topologyCases.length), "3", "topology fixture count");
requireEqual(String(profileBundle.positiveCases.length), "10", "positive fixture count");
const nonEmittingFaultIds = [
  "runtime-origin-non-emitting-combined-reviewer-witness",
  "runtime-origin-non-emitting-declare-var",
  "runtime-origin-non-emitting-declare-let",
  "runtime-origin-non-emitting-declare-const",
  "runtime-origin-non-emitting-declare-function",
  "runtime-origin-non-emitting-declare-class",
  "runtime-origin-non-emitting-global-augmentation",
  "runtime-origin-non-emitting-ambient-namespace-property",
  "runtime-origin-non-emitting-type-only-import",
  "runtime-origin-non-emitting-property-container",
  "runtime-origin-non-emitting-bind",
  "runtime-origin-non-emitting-call",
  "runtime-origin-non-emitting-apply",
  "runtime-origin-non-emitting-iife",
];
const observedNonEmitting = profileBundle.faultCases.filter((entry) =>
  nonEmittingFaultIds.includes(entry.id));
requireEqual(JSON.stringify(observedNonEmitting.map((entry) => entry.id)),
  JSON.stringify(nonEmittingFaultIds), "non-emitting fault membership/order");
if (observedNonEmitting.some((entry) => entry.expectedReason !== "denied_capability_origin" ||
  entry.expectedNodeKind !== "Identifier")) fail("non-emitting fault diagnostics weakened");
requireEqual(observedNonEmitting[0].source,
  "declare function fetch(url: string): Promise<unknown>;\ndeclare class WebSocket { constructor(url: string); }\ndeclare const window: { fetch: typeof fetch };\nvoid fetch(\"https://api.deepseek.com\");\nvoid new WebSocket(\"wss://api.deepseek.com\");\nvoid window.fetch(\"https://api.deepseek.com\");\n",
  "exact combined Reviewer witness");
const emittingPositiveIds = [
  "repository-local-ambient-name-shadows",
  "repository-imported-ambient-name-shadows",
  "runtime-emitting-parameter-shadow",
  "runtime-emitting-function-shadow",
  "runtime-emitting-overload-implementation-shadow",
];
requireEqual(JSON.stringify(profileBundle.positiveCases.filter((entry) => emittingPositiveIds.includes(entry.id))
  .map((entry) => entry.id)), JSON.stringify(emittingPositiveIds), "runtime-emitting shadow positives");
const checkerSource = readFileSync(resolve(repositoryRoot, "scripts/verify-ai-architecture.ts"), "utf8");
for (const required of [
  "declarationEmitsRuntimeBinding", "symbolHasRuntimeEmittingBinding",
  "typescript_resolved_non_emitting_repository_declaration",
  "protected-phase-b-runtime-global-capability-origin-denied",
]) {
  if (!checkerSource.includes(required)) fail(`checker lacks ${required}`);
}

requireEqual(sha256(readFileSync(resolve(repositoryRoot,
  "docs/PHASE_1B_STAGE4A_PHASE_B_V2_2_FRESH_REPLACEMENT_FOUNDATION_IMPLEMENTATION_H01_M04_REMEDIATION_V2_INDEPENDENT_REREVIEW_V1_0.md"))),
expected.controllingFailReportSha256, "controlling FAIL report SHA-256");
requireEqual(sha256(readFileSync(resolve(controllingFailRoot, "SHA256SUMS.txt"))),
  expected.controllingFailManifestSha256, "controlling FAIL manifest SHA-256");
const controllingPaths = [
  "docs/PHASE_1B_STAGE4A_PHASE_B_V2_2_FRESH_REPLACEMENT_FOUNDATION_IMPLEMENTATION_H01_M04_REMEDIATION_V2_INDEPENDENT_REREVIEW_V1_0.md",
  "docs/review-evidence/phase-1b-stage4a-phase-b-v2-2-fresh-replacement-foundation-implementation-h01-m04-remediation-v2-independent-rereview-v1/IDENTITY_SCOPE_AND_VERIFICATION_CAPTURE_V1_0.txt",
  "docs/review-evidence/phase-1b-stage4a-phase-b-v2-2-fresh-replacement-foundation-implementation-h01-m04-remediation-v2-independent-rereview-v1/INDEPENDENT_IMPLEMENTATION_REREVIEW_EVIDENCE_V1_0.md",
  "docs/review-evidence/phase-1b-stage4a-phase-b-v2-2-fresh-replacement-foundation-implementation-h01-m04-remediation-v2-independent-rereview-v1/REVIEWER_H01_FRESH_GATE_RESULTS_V1_0.txt",
  "docs/review-evidence/phase-1b-stage4a-phase-b-v2-2-fresh-replacement-foundation-implementation-h01-m04-remediation-v2-independent-rereview-v1/REVIEWER_H01_NON_EMITTING_DECLARE_BYPASS_V1_0.patch",
  "docs/review-evidence/phase-1b-stage4a-phase-b-v2-2-fresh-replacement-foundation-implementation-h01-m04-remediation-v2-independent-rereview-v1/REVIEWER_H02_NONREGRESSION_IMPORT_PROBE_V1_0.ts",
  "docs/review-evidence/phase-1b-stage4a-phase-b-v2-2-fresh-replacement-foundation-implementation-h01-m04-remediation-v2-independent-rereview-v1/REVIEWER_H02_NONREGRESSION_OUTPUT_V1_0.txt",
];
const controllingEntries = verifyManifest(resolve(controllingFailRoot, "SHA256SUMS.txt"),
  controllingPaths, repositoryRoot);

const remediationManifestPaths = [
  "../../PHASE_1B_STAGE4A_PHASE_B_V2_2_FRESH_REPLACEMENT_FOUNDATION_IMPLEMENTATION_H01_M04_FINAL_REMEDIATION_V3_0.md",
  "../../PHASE_1B_STAGE4A_PHASE_B_V2_2_FRESH_REPLACEMENT_FOUNDATION_IMPLEMENTATION_H01_M04_REMEDIATION_V2_INDEPENDENT_REREVIEW_V1_0.md",
  "../phase-1b-stage4a-phase-b-v2-2-fresh-replacement-foundation-implementation-h01-m04-remediation-v2-independent-rereview-v1/IDENTITY_SCOPE_AND_VERIFICATION_CAPTURE_V1_0.txt",
  "../phase-1b-stage4a-phase-b-v2-2-fresh-replacement-foundation-implementation-h01-m04-remediation-v2-independent-rereview-v1/INDEPENDENT_IMPLEMENTATION_REREVIEW_EVIDENCE_V1_0.md",
  "../phase-1b-stage4a-phase-b-v2-2-fresh-replacement-foundation-implementation-h01-m04-remediation-v2-independent-rereview-v1/REVIEWER_H01_FRESH_GATE_RESULTS_V1_0.txt",
  "../phase-1b-stage4a-phase-b-v2-2-fresh-replacement-foundation-implementation-h01-m04-remediation-v2-independent-rereview-v1/REVIEWER_H01_NON_EMITTING_DECLARE_BYPASS_V1_0.patch",
  "../phase-1b-stage4a-phase-b-v2-2-fresh-replacement-foundation-implementation-h01-m04-remediation-v2-independent-rereview-v1/REVIEWER_H02_NONREGRESSION_IMPORT_PROBE_V1_0.ts",
  "../phase-1b-stage4a-phase-b-v2-2-fresh-replacement-foundation-implementation-h01-m04-remediation-v2-independent-rereview-v1/REVIEWER_H02_NONREGRESSION_OUTPUT_V1_0.txt",
  "../phase-1b-stage4a-phase-b-v2-2-fresh-replacement-foundation-implementation-h01-m04-remediation-v2-independent-rereview-v1/SHA256SUMS.txt",
  "CHANGED_PATH_INVENTORY_V3_0.json",
  "H01_M04_RUNTIME_EMITTING_ORIGIN_REMEDIATION_V3_AUTHORITY_V1_0.json",
  "H01_M04_RUNTIME_EMITTING_ORIGIN_REMEDIATION_V3_VERIFICATION_CAPTURE_V1_0.json",
  "M04_PROOF_ARTIFACTS_V3_1/AI_ACTUAL_TREE_AND_STATIC_LANGUAGE_PROOF_V3_1.json",
  "M04_PROOF_ARTIFACTS_V3_1/AI_CAPABILITY_ORIGIN_AND_NON_REACHABILITY_PROOF_V3_1.json",
  "M04_PROOF_ARTIFACTS_V3_1/AI_PHASE_B_COMPOSITION_PROOF_V3_1.json",
  "M04_PROOF_ARTIFACTS_V3_1/AI_SERVER_PUBLIC_BUNDLE_BOUNDARY_V3_1.json",
  "M04_PROOF_ARTIFACTS_V3_1/AI_STATIC_MODULE_AND_RESOURCE_GRAPH_PROOF_V3_1.json",
  "VERIFY_H01_M04_RUNTIME_EMITTING_ORIGIN_REMEDIATION_V3_EVIDENCE_V1_0.mjs",
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
  nonEmittingFaults: nonEmittingFaultIds.length,
  positiveProbes: profileBundle.positiveCases.length,
  proofArtifacts: proofPaths.length,
  h01Attempt: authority.attempts["H-01"],
  h02Disposition: authority.findings["H-02"].outcome,
  clean,
}, null, 2)}\n`);
