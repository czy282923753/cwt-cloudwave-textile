import { createHash } from "node:crypto";
import { execFileSync, spawnSync } from "node:child_process";
import {
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, extname, join, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const evidenceRoot = dirname(fileURLToPath(import.meta.url));
const repositoryRoot = realpathSync(resolve(evidenceRoot, "../../.."));
const authorityPath = resolve(evidenceRoot, "IMP3_NM01_EVIDENCE_ISOLATION_AUTHORITY_V2_0.json");
const manifestPath = resolve(evidenceRoot, "SHA256SUMS.txt");
const proofDirectory = resolve(evidenceRoot, "M04_FINAL_EXECUTABLE_TREE_PROOFS_V3_1");
const checkerPath = "scripts/verify-ai-architecture.ts";
const executableExtensions = new Set([".ts", ".tsx", ".mts", ".cts", ".js", ".jsx", ".mjs", ".cjs"]);

function fail(message) {
  throw new Error(`IMP3-NM01 bidirectional evidence-isolation verification failed: ${message}`);
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function argumentValue(name) {
  const index = process.argv.indexOf(name);
  if (index < 0) return undefined;
  const value = process.argv[index + 1];
  if (value === undefined || value.length === 0) fail(`${name} requires one value`);
  return value;
}

function git(args, cwd = repositoryRoot) {
  return execFileSync("git", args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trimEnd();
}

function requireEqual(actual, expected, label) {
  if (actual !== expected) fail(`${label}: expected ${expected}, got ${actual}`);
}

function parseManifest(path) {
  return readFileSync(path, "utf8").split("\n").filter(Boolean).map((line) => {
    const match = /^([0-9a-f]{64})  (.+)$/u.exec(line);
    if (match === null) fail(`invalid manifest line: ${line}`);
    return { sha256: match[1], path: match[2] };
  });
}

function verifyManifest(path) {
  const entries = parseManifest(path);
  const observedPaths = entries.map((entry) => entry.path);
  if (new Set(observedPaths).size !== observedPaths.length ||
    JSON.stringify(observedPaths) !== JSON.stringify([...observedPaths].sort())) {
    fail("manifest paths are duplicated or not sorted");
  }
  for (const entry of entries) {
    const absolute = resolve(repositoryRoot, entry.path);
    if (absolute === repositoryRoot || !absolute.startsWith(`${repositoryRoot}${sep}`) ||
      !existsSync(absolute) || !lstatSync(absolute).isFile() || lstatSync(absolute).isSymbolicLink()) {
      fail(`manifest path is not one physical repository file: ${entry.path}`);
    }
    requireEqual(sha256(readFileSync(absolute)), entry.sha256, `manifest hash ${entry.path}`);
  }
  return entries;
}

function installDependencyBridge(root, installedNodeModules) {
  const local = resolve(root, "node_modules");
  if (existsSync(local)) fail(`temporary dependency bridge target already exists: ${local}`);
  mkdirSync(local);
  for (const name of ["tsx", "typescript"]) {
    const source = resolve(installedNodeModules, name);
    if (!existsSync(source)) fail(`installed dependency missing: ${name}`);
    symlinkSync(source, resolve(local, name), "dir");
  }
  return () => rmSync(local, { recursive: true });
}

function generateOfficialTypegen(root, installedNodeModules) {
  const local = resolve(root, "node_modules");
  if (existsSync(local)) fail(`official typegen dependency bridge target already exists: ${local}`);
  symlinkSync(installedNodeModules, local, "dir");
  try {
    const result = spawnSync("/usr/bin/sandbox-exec", [
      "-p", "(version 1)(allow default)(deny network*)",
      process.execPath, "node_modules/next/dist/bin/next", "typegen", ".",
    ], {
      cwd: root,
      encoding: "utf8",
      env: { ...process.env, NEXT_TELEMETRY_DISABLED: "1" },
    });
    if (result.status !== 0) fail(`official network-denied typegen failed at ${root}: ${result.stderr || result.stdout}`);
  } finally {
    rmSync(local);
  }
  const generated = [
    ["next-env.d.ts", "7b550dda9686c16f36a17bf9051d5dbf31e98555b30d114ac49fc49a1e712651"],
    [".next/types/cache-life.d.ts", "d1986184a09a52db8228cb2bb2a61a8c05c9354e5b93cec8e2628d8579c892d7"],
    [".next/types/routes.d.ts", "e838150498c7e8464a1a0d7e25d7dfc79aa6f77358a8d83ac0aa7b28c5904fb4"],
    [".next/types/validator.ts", "8ed142360153811ab434bbd2f2486b0052d9d5bbdcf067d206fc8d7eb15f28df"],
  ];
  for (const [path, hash] of generated) requireEqual(sha256(readFileSync(resolve(root, path))), hash,
    `official typegen hash ${path}`);
}

function runGate(root, installedNodeModules, sealCommit, proofBound, closureMutationIds) {
  const removeBridge = installDependencyBridge(root, installedNodeModules);
  try {
    const args = ["--import", "tsx", checkerPath];
    if (proofBound) args.push(
      "--proof-bound-commit", sealCommit,
      "--verify-evidence-dir",
      "docs/review-evidence/phase-1b-stage4a-phase-b-v2-2-fresh-replacement-foundation-implementation-imp3-nm01-evidence-isolation-remediation-v2/M04_FINAL_EXECUTABLE_TREE_PROOFS_V3_1",
    );
    const result = spawnSync(process.execPath, args, {
      cwd: root,
      encoding: "utf8",
      env: { ...process.env, CWT_INSTALLED_NODE_MODULES: installedNodeModules },
    });
    if (result.status !== 0) fail(`architecture gate failed at ${root}: ${result.stderr || result.stdout}`);
    const report = JSON.parse(result.stdout);
    if (report.ok !== true || report.zeroClass.length !== 0 || report.ambiguous.length !== 0 ||
      report.moduleGraph.ordinaryGlobalUrlValueCount !== 21 ||
      JSON.stringify(report.finalTreeClosureMutations.map((entry) => entry.id)) !==
        JSON.stringify(closureMutationIds) ||
      report.proofBoundCommit !== (proofBound ? sealCommit : null)) {
      fail(`architecture gate report contract mismatch at ${root}`);
    }
    return report;
  } finally {
    removeBridge();
  }
}

function reproduceProductionToEvidenceRejection(root, installedNodeModules, probePath) {
  const sourcePath = resolve(root, "src/storage/index.ts");
  const source = readFileSync(sourcePath, "utf8");
  writeFileSync(sourcePath, source.replace(
    'import { env } from "@/config/env";\n',
    `import { env } from "@/config/env";\nimport "../../${probePath}";\n`,
  ));
  const removeBridge = installDependencyBridge(root, installedNodeModules);
  try {
    const result = spawnSync(process.execPath, ["--import", "tsx", checkerPath], {
      cwd: root,
      encoding: "utf8",
      env: { ...process.env, CWT_INSTALLED_NODE_MODULES: installedNodeModules },
    });
    const expected = [
      "class_capability_violation",
      '"path":"src/storage/index.ts"',
      '"rule":"production-current-must-not-reach-evidence-only"',
      '"classId":"other-production-src"',
      '"classId":"diagnostic-documentation"',
      '"stageStatus":"evidence_only_not_production"',
      '"edgeKind":"runtime"',
      '"reason":"production_current_edge_to_evidence_only_class"',
    ];
    if (result.status === 0 || expected.some((token) => !result.stderr.includes(token))) {
      fail(`Production-to-evidence witness did not fail with exact diagnostics: ${result.stderr || result.stdout}`);
    }
  } finally {
    removeBridge();
  }
  return { result: "fail-closed", reason: "class_capability_violation" };
}

if (process.versions.node !== "24.14.0") fail("Node must be 24.14.0");
const installedInput = argumentValue("--installed-node-modules");
if (installedInput === undefined) fail("--installed-node-modules is required");
const installedNodeModules = realpathSync(installedInput);
if (!lstatSync(installedNodeModules).isDirectory()) fail("installed dependency input is not a physical directory");
requireEqual(realpathSync(git(["rev-parse", "--show-toplevel"])), repositoryRoot, "repository root");

const authorityBytes = readFileSync(authorityPath);
const authority = JSON.parse(authorityBytes);
if (authority.status !== "IMP3_NM01_ATTEMPT2_CANDIDATE_REVIEW_REQUIRED_NOT_ACCEPTED" ||
  authority.acceptanceClaim !== false || authority.selfApproval !== false) {
  fail("authority status or no-self-approval boundary mismatch");
}
const sealCommit = authority.executableTreeSeal.commit;
const finalHead = git(["rev-parse", "HEAD"]);
requireEqual(git(["symbolic-ref", "--short", "HEAD"]), authority.candidate.branch, "Candidate branch");
if (authority.candidate.finalHeadDerivedAtVerification !== true) {
  fail("Candidate final HEAD must be derived from the exact clean verification target");
}
requireEqual(git(["rev-parse", `${sealCommit}^{commit}`]), sealCommit, "executable-tree seal commit");
requireEqual(git(["rev-parse", `${sealCommit}^`]), authority.executableTreeSeal.parent, "seal parent");
requireEqual(git(["rev-parse", `${sealCommit}^{tree}`]), authority.executableTreeSeal.tree, "seal tree");
requireEqual(git(["rev-parse", authority.failedCandidate.ref]), authority.failedCandidate.head, "preserved failed ref");
if (spawnSync("git", ["merge-base", "--is-ancestor", sealCommit, finalHead], { cwd: repositoryRoot }).status !== 0) {
  fail("executable-tree seal is not an ancestor of final HEAD");
}
const successorPaths = git(["diff", "--name-only", `${sealCommit}..${finalHead}`]).split("\n").filter(Boolean);
if (successorPaths.length === 0 || successorPaths.some((path) =>
  !path.startsWith("docs/") || executableExtensions.has(extname(path)))) {
  fail("every post-seal successor must be non-executable docs/evidence");
}

const manifestEntries = verifyManifest(manifestPath);
requireEqual(String(manifestEntries.length), String(authority.manifest.entryCount), "manifest entry count");
requireEqual(sha256(readFileSync(authority.controllingReview.reportPath)),
  authority.controllingReview.reportSha256, "controlling review report SHA-256");
requireEqual(sha256(readFileSync(authority.controllingReview.manifestPath)),
  authority.controllingReview.manifestSha256, "controlling review manifest SHA-256");
requireEqual(sha256(readFileSync(authority.controllingReview.challengeSourcePath)),
  authority.controllingReview.challengeSourceSha256, "controlling challenge source SHA-256");
requireEqual(sha256(readFileSync(authority.controllingReview.challengeOutputPath)),
  authority.controllingReview.challengeOutputSha256, "controlling challenge output SHA-256");
requireEqual(sha256(readFileSync(authority.immutableHistoricalProbe.path)),
  authority.immutableHistoricalProbe.sha256, "immutable historical probe SHA-256");
requireEqual(sha256(readFileSync(checkerPath)), authority.executableTreeSeal.checkerSha256, "sole checker SHA-256");

generateOfficialTypegen(repositoryRoot, installedNodeModules);
const attached = runGate(
  repositoryRoot,
  installedNodeModules,
  sealCommit,
  true,
  authority.closureMutationIds,
);
requireEqual(attached.executableTreeSha256, authority.executableTreeSeal.executableTreeSha256,
  "attached executable-tree SHA-256");
requireEqual(String(attached.candidateCount), String(authority.lifecycle.officialPresent.candidateCount),
  "attached official-present Candidate total");
requireEqual(String(attached.executableCount), String(authority.lifecycle.officialPresent.executableCount),
  "attached official-present executable total");
requireEqual(attached.lifecycleState, "official-next-generated-file-present", "attached lifecycle state");
const detachedRoot = mkdtempSync(join(tmpdir(), "cwt-imp3-nm01-final-tree-"));
let detached;
let sourceClean;
let productionToEvidence;
try {
  execFileSync("git", ["worktree", "add", "--detach", detachedRoot, finalHead], {
    cwd: repositoryRoot,
    stdio: ["ignore", "ignore", "pipe"],
  });
  sourceClean = runGate(
    detachedRoot,
    installedNodeModules,
    sealCommit,
    false,
    authority.closureMutationIds,
  );
  requireEqual(sourceClean.lifecycleState, "source-clean-file-absent", "detached source-clean lifecycle state");
  requireEqual(String(sourceClean.candidateCount), String(authority.lifecycle.sourceClean.candidateCount),
    "detached source-clean Candidate total");
  requireEqual(String(sourceClean.executableCount), String(authority.lifecycle.sourceClean.executableCount),
    "detached source-clean executable total");
  if (sourceClean.nextEnv.present !== false) fail("detached source-clean next-env.d.ts must be absent");
  productionToEvidence = reproduceProductionToEvidenceRejection(
    detachedRoot,
    installedNodeModules,
    authority.immutableHistoricalProbe.path,
  );
  execFileSync("git", ["restore", "src/storage/index.ts"], { cwd: detachedRoot, stdio: "ignore" });
  generateOfficialTypegen(detachedRoot, installedNodeModules);
  detached = runGate(
    detachedRoot,
    installedNodeModules,
    sealCommit,
    true,
    authority.closureMutationIds,
  );
  requireEqual(detached.executableTreeSha256, attached.executableTreeSha256,
    "attached/detached executable-tree SHA-256");
  requireEqual(detached.moduleGraph.graphSha256, attached.moduleGraph.graphSha256,
    "attached/detached graph SHA-256");
  requireEqual(String(detached.candidateCount), String(attached.candidateCount),
    "attached/detached official-present Candidate total");
  requireEqual(String(detached.executableCount), String(attached.executableCount),
    "attached/detached official-present executable total");
} finally {
  if (existsSync(resolve(detachedRoot, ".git"))) {
    execFileSync("git", ["worktree", "remove", detachedRoot], { cwd: repositoryRoot, stdio: "ignore" });
  } else if (existsSync(detachedRoot)) {
    rmSync(detachedRoot, { recursive: true });
  }
}

const clean = git(["status", "--porcelain=v1"]) === "";
if (process.argv.includes("--require-clean") && !clean) fail("formal worktree is not clean");
process.stdout.write(`${JSON.stringify({
  ok: true,
  status: authority.status,
  finalHead,
  executableTreeSeal: sealCommit,
  executableTreeSha256: attached.executableTreeSha256,
  lifecycle: {
    sourceClean: {
      candidateCount: sourceClean.candidateCount,
      executableCount: sourceClean.executableCount,
    },
    officialPresent: {
      candidateCount: attached.candidateCount,
      executableCount: attached.executableCount,
    },
  },
  attachedGate: "PASS",
  detachedGate: "PASS",
  productionToEvidence,
  manifestEntries: manifestEntries.length,
  proofArtifacts: lstatSync(proofDirectory).isDirectory() ? 5 : 0,
  imp3Nm01Attempt: 2,
  h01: authority.findings.H01,
  h02: authority.findings.H02,
  clean,
}, null, 2)}\n`);
