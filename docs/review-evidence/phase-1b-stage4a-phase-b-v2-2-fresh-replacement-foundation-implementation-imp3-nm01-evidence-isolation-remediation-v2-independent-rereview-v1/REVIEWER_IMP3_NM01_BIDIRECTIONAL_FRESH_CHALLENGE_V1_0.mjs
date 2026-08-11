import { execFileSync, spawnSync } from "node:child_process";
import {
  appendFileSync,
  existsSync,
  linkSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  statSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, relative, resolve } from "node:path";

const repository = "/Users/calvin/Downloads/CWT（CloudWave Textile）项目";
const dependencies = "/Users/calvin/.codex/worktrees/2a07/CWT（CloudWave Textile）项目/node_modules";
const node = "/Users/calvin/.nvm/versions/node/v24.14.0/bin/node";
const candidate = "d60d5cc2398eeeb06263c58924896250f12f3756";
const failed = "b48f33f35d5d46824a8c4dec6b40d4a093050285";
const seal = "627779d294e45f1fb166f70b94067c4b811aaaff";
const evidence = "docs/review-evidence/phase-1b-stage4a-phase-b-v2-2-fresh-replacement-foundation-implementation-imp3-nm01-evidence-isolation-remediation-v2";
const historicalProbe = "docs/review-evidence/phase-1b-stage4a-phase-b-v2-2-fresh-replacement-foundation-implementation-h01-m04-remediation-v2-independent-rereview-v1/REVIEWER_H02_NONREGRESSION_IMPORT_PROBE_V1_0.ts";
const currentAuthorityJson = `${evidence}/IMP3_NM01_EVIDENCE_ISOLATION_AUTHORITY_V2_0.json`;
const proofDir = `${evidence}/M04_FINAL_EXECUTABLE_TREE_PROOFS_V3_1`;

if (process.versions.node !== "24.14.0") throw new Error("Node 24.14.0 required");

function worktree(commit) {
  const root = mkdtempSync(join(tmpdir(), "cwt-reviewer-imp3-nm01-r2-"));
  rmSync(root, { recursive: true });
  execFileSync("git", ["worktree", "add", "--detach", root, commit], { cwd: repository, stdio: "ignore" });
  return root;
}

function removeWorktree(root) {
  execFileSync("git", ["worktree", "remove", "--force", root], { cwd: repository, stdio: "ignore" });
}

function bridge(root) {
  const target = resolve(root, "node_modules");
  mkdirSync(target);
  for (const name of ["tsx", "typescript"]) {
    symlinkSync(resolve(dependencies, name), resolve(target, name), "dir");
  }
  return () => rmSync(target, { recursive: true });
}

function runGate(root, args = [], extraEnv = {}) {
  const remove = bridge(root);
  try {
    const result = spawnSync(node, ["--import", "tsx", "scripts/verify-ai-architecture.ts", ...args], {
      cwd: root,
      encoding: "utf8",
      env: { ...process.env, CWT_INSTALLED_NODE_MODULES: dependencies, ...extraEnv },
    });
    return { status: result.status, stdout: result.stdout, stderr: result.stderr };
  } finally {
    remove();
  }
}

function runTypecheck(root) {
  const target = resolve(root, "node_modules");
  symlinkSync(dependencies, target, "dir");
  try {
    return spawnSync(node, [resolve(dependencies, "typescript/bin/tsc"), "--noEmit"], {
      cwd: root,
      encoding: "utf8",
    });
  } finally {
    rmSync(target);
  }
}

function generateOfficialTypegen(root) {
  const target = resolve(root, "node_modules");
  symlinkSync(dependencies, target, "dir");
  try {
    const result = spawnSync("/usr/bin/sandbox-exec", [
      "-p", "(version 1)(allow default)(deny network*)",
      node, resolve(dependencies, "next/dist/bin/next"), "typegen", ".",
    ], {
      cwd: root,
      encoding: "utf8",
      env: { ...process.env, NEXT_TELEMETRY_DISABLED: "1" },
    });
    if (result.status !== 0) throw new Error(`typegen failed: ${result.stderr || result.stdout}`);
  } finally {
    rmSync(target);
  }
}

function reason(observed) {
  if (observed.status === 0) return "PASS";
  const text = `${observed.stderr}\n${observed.stdout}`;
  for (const token of [
    "class_capability_violation",
    "post-proof executable candidate drift",
    "stale proof commit or executable-tree binding",
    "unresolved_static_edge",
    "immutable historical Reviewer executable is absent, changed, or promoted",
    "historical Reviewer import compatibility target or shim exists under docs/docs",
    "symlink",
    "hard-link",
    "physical alias",
    "ambient_runtime_capability_not_authorized",
  ]) if (text.includes(token)) return token;
  return text.split("\n").find(Boolean) ?? "UNKNOWN";
}

function requireEvidenceDiagnostic(observed, id, expectedNodeKind, expectedEdgeKind) {
  const text = observed.stderr;
  const tokens = [
    "class_capability_violation",
    '"rule":"production-current-must-not-reach-evidence-only"',
    '"classId":"diagnostic-documentation"',
    '"stageStatus":"evidence_only_not_production"',
    '"reason":"production_current_edge_to_evidence_only_class"',
    `"edgeKind":"${expectedEdgeKind}"`,
    `"nodeKind":"${expectedNodeKind}"`,
  ];
  if (observed.status === 0 || tokens.some((token) => !text.includes(token))) {
    throw new Error(`${id} did not fail with the exact evidence-isolation diagnostic: ${text || observed.stdout}`);
  }
}

function appendAcquisition(root, sourcePath, statement) {
  appendFileSync(resolve(root, sourcePath), `\n${statement}\n`);
}

function relativeProbe(sourcePath, targetPath = historicalProbe) {
  const value = relative(dirname(sourcePath), targetPath).replaceAll("\\", "/");
  return value.startsWith(".") ? value : `./${value}`;
}

const results = [];

function record(id, observed, expectedStatus, extra = {}) {
  if (observed.status !== expectedStatus) {
    throw new Error(`${id}: expected status ${expectedStatus}, got ${observed.status}: ${observed.stderr || observed.stdout}`);
  }
  results.push({ id, status: observed.status, reason: reason(observed), ...extra });
}

// Reproduce the exact attempt-1 one-sided isolation failure.
{
  const root = worktree(failed);
  try {
    const specifier = relativeProbe("src/storage/index.ts");
    appendAcquisition(root, "src/storage/index.ts", `import ${JSON.stringify(specifier)};`);
    const observed = runGate(root);
    record("attempt1-production-to-evidence-unsafe-pass", observed, 0, { unsafeAcceptance: true });
  } finally { removeWorktree(root); }
}

// Baseline source-clean gate.
{
  const root = worktree(candidate);
  try {
    const observed = runGate(root);
    record("candidate-source-clean-baseline", observed, 0, {
      candidateCount: JSON.parse(observed.stdout).candidateCount,
      executableCount: JSON.parse(observed.stdout).executableCount,
      edgeCount: JSON.parse(observed.stdout).moduleGraph.edgeCount,
    });
  } finally { removeWorktree(root); }
}

// H-01 remains closed: a Fresh ambient capability alias fails, while a runtime-emitted local shadow passes.
{
  const root = worktree(candidate);
  try {
    appendAcquisition(root, "src/ai/canonical-json.ts", "const reviewerNetworkAlias = fetch; void reviewerNetworkAlias;");
    const observed = runGate(root);
    record("h01-ambient-fetch-alias-negative", observed, 1);
    if (!observed.stderr.includes("ambient_runtime_capability_not_authorized") ||
      !observed.stderr.includes('"capability":"fetch"')) {
      throw new Error(`H-01 Fresh negative lacked origin/capability diagnostics: ${observed.stderr}`);
    }
  } finally { removeWorktree(root); }
}

{
  const root = worktree(candidate);
  try {
    appendAcquisition(root, "src/ai/canonical-json.ts", "function reviewerLocal(fetch: () => unknown) { return fetch(); } void reviewerLocal;");
    const observed = runGate(root);
    record("h01-runtime-emitted-local-shadow-positive", observed, 0);
  } finally { removeWorktree(root); }
}

const incomingVariants = [
  ["other-production-side-effect-import", "src/storage/index.ts", (s) => `import ${JSON.stringify(s)};`, "ImportDeclaration", "runtime"],
  ["other-production-reexport", "src/storage/index.ts", (s) => `export * from ${JSON.stringify(s)};`, "ExportDeclaration", "runtime"],
  ["other-production-type-import", "src/storage/index.ts", (s) => `import type { ReviewerOnlyType } from ${JSON.stringify(s)};`, "ImportDeclaration", "type-only"],
  ["other-production-type-reexport", "src/storage/index.ts", (s) => `export type { ReviewerOnlyType } from ${JSON.stringify(s)};`, "ExportDeclaration", "type-only"],
  ["protected-ai-side-effect-import", "src/ai/canonical-json.ts", (s) => `import ${JSON.stringify(s)};`, "ImportDeclaration", "runtime"],
  ["phase-b-root-side-effect-import", "src/server/ai/phase-b-composition.ts", (s) => `import ${JSON.stringify(s)};`, "ImportDeclaration", "runtime"],
  ["business-consumer-side-effect-import", "src/admin/action-result.ts", (s) => `import ${JSON.stringify(s)};`, "ImportDeclaration", "runtime"],
];

for (const [id, sourcePath, statement, nodeKind, edgeKind] of incomingVariants) {
  const root = worktree(candidate);
  try {
    const specifier = relativeProbe(sourcePath);
    appendAcquisition(root, sourcePath, statement(specifier));
    const observed = runGate(root);
    requireEvidenceDiagnostic(observed, id, nodeKind, edgeKind);
    record(id, observed, 1);
  } finally { removeWorktree(root); }
}

// A Production helper imported by another Production node cannot hide the forbidden target.
{
  const root = worktree(candidate);
  try {
    const sourcePath = "src/storage/local.ts";
    appendAcquisition(root, sourcePath, `import ${JSON.stringify(relativeProbe(sourcePath))};`);
    const observed = runGate(root);
    requireEvidenceDiagnostic(observed, "transitive-production-helper", "ImportDeclaration", "runtime");
    record("transitive-production-helper", observed, 1);
  } finally { removeWorktree(root); }
}

// A new untracked evidence executable is still classified and cannot become a Production dependency.
for (const ignored of [false, true]) {
  const root = worktree(candidate);
  let excludeRoot;
  try {
    const target = `docs/review-evidence/reviewer-fresh-${ignored ? "ignored" : "visible"}-copy.ts`;
    writeFileSync(resolve(root, target), "export type ReviewerOnlyType = string;\n");
    let extraEnv = {};
    if (ignored) {
      excludeRoot = mkdtempSync(join(tmpdir(), "cwt-reviewer-ignore-"));
      const excludeFile = resolve(excludeRoot, "global-excludes");
      writeFileSync(excludeFile, `/${target}\n`);
      extraEnv = {
        GIT_CONFIG_COUNT: "1",
        GIT_CONFIG_KEY_0: "core.excludesFile",
        GIT_CONFIG_VALUE_0: excludeFile,
      };
    }
    const sourcePath = "src/storage/index.ts";
    appendAcquisition(root, sourcePath, `import type { ReviewerOnlyType } from ${JSON.stringify(relativeProbe(sourcePath, target))};`);
    const observed = runGate(root, [], extraEnv);
    requireEvidenceDiagnostic(observed, `${ignored ? "ignored" : "visible"}-untracked-evidence-target`, "ImportDeclaration", "type-only");
    record(`${ignored ? "ignored" : "visible"}-untracked-evidence-target`, observed, 1);
  } finally {
    if (excludeRoot !== undefined && existsSync(excludeRoot)) rmSync(excludeRoot, { recursive: true });
    removeWorktree(root);
  }
}

// Evidence may observe Production for review, but the evidence node emits no current runtime authority.
{
  const root = worktree(candidate);
  try {
    const target = "docs/review-evidence/reviewer-fresh-observation.ts";
    writeFileSync(resolve(root, target), 'import type { ObjectStorage } from "../../../src/storage/types";\nexport type Observed = ObjectStorage;\n');
    const observed = runGate(root);
    record("evidence-observes-production-positive", observed, 0);
  } finally { removeWorktree(root); }
}

// On a case-insensitive filesystem this spelling resolves to the same physical evidence file.
// The gate must still canonicalize the target into the actual-tree class before applying ceilings.
{
  const root = worktree(candidate);
  try {
    const sourcePath = "src/storage/index.ts";
    const specifier = relativeProbe(sourcePath).replace("REVIEWER_H02", "reviewer_H02");
    const canonicalTarget = resolve(root, historicalProbe);
    const caseVariantTarget = resolve(root, dirname(historicalProbe), "reviewer_H02_NONREGRESSION_IMPORT_PROBE_V1_0.ts");
    const canonicalStat = statSync(canonicalTarget);
    const caseVariantStat = statSync(caseVariantTarget);
    appendAcquisition(root, sourcePath, `import ${JSON.stringify(specifier)};`);
    const observed = runGate(root);
    record("case-drift-physical-evidence-alias", observed, 0, {
      unsafeAcceptance: true,
      canonicalRealpath: realpathSync(canonicalTarget),
      caseVariantRealpath: realpathSync(caseVariantTarget),
      sameDeviceAndInode: canonicalStat.dev === caseVariantStat.dev && canonicalStat.ino === caseVariantStat.ino,
    });
  } finally { removeWorktree(root); }
}

// A case-variant import of a current evidence JSON has no historical unresolved import;
// both the architecture gate and strict TypeScript must be assessed on the same physical target.
{
  const root = worktree(candidate);
  try {
    const sourcePath = "src/storage/index.ts";
    const caseVariantPath = currentAuthorityJson.replace(
      "IMP3_NM01_EVIDENCE_ISOLATION_AUTHORITY_V2_0.json",
      "imp3_nm01_evidence_isolation_authority_v2_0.json",
    );
    const canonicalTarget = resolve(root, currentAuthorityJson);
    const caseVariantTarget = resolve(root, caseVariantPath);
    const canonicalStat = statSync(canonicalTarget);
    const caseVariantStat = statSync(caseVariantTarget);
    appendAcquisition(root, sourcePath, `import ${JSON.stringify(relativeProbe(sourcePath, caseVariantPath))};`);
    const observed = runGate(root);
    const typecheck = runTypecheck(root);
    record("case-drift-current-json-physical-evidence-alias", observed, 0, {
      unsafeAcceptance: true,
      strictTypecheckStatus: typecheck.status,
      canonicalRealpath: realpathSync(canonicalTarget),
      caseVariantRealpath: realpathSync(caseVariantTarget),
      sameDeviceAndInode: canonicalStat.dev === caseVariantStat.dev && canonicalStat.ino === caseVariantStat.ino,
    });
  } finally { removeWorktree(root); }
}

for (const kind of ["symlink", "hardlink"]) {
  const root = worktree(candidate);
  try {
    const alias = resolve(root, `docs/review-evidence/reviewer-fresh-${kind}-evidence.ts`);
    if (kind === "symlink") symlinkSync(resolve(root, historicalProbe), alias);
    else linkSync(resolve(root, historicalProbe), alias);
    const observed = runGate(root);
    record(`${kind}-evidence-alias`, observed, 1);
  } finally { removeWorktree(root); }
}

// Proof-bound controls: post-seal executable and stale proof must fail.
{
  const root = worktree(candidate);
  try {
    generateOfficialTypegen(root);
    const extra = resolve(root, "docs/review-evidence/reviewer-fresh-post-seal.mts");
    writeFileSync(extra, "export {};\n");
    const observed = runGate(root, ["--proof-bound-commit", seal, "--verify-evidence-dir", proofDir]);
    record("post-seal-executable-drift", observed, 1);
  } finally { removeWorktree(root); }
}

{
  const root = worktree(candidate);
  try {
    generateOfficialTypegen(root);
    const path = resolve(root, proofDir, "AI_ACTUAL_TREE_AND_STATIC_LANGUAGE_PROOF_V3_1.json");
    const proof = JSON.parse(readFileSync(path, "utf8"));
    proof.candidateCommit = "0000000000000000000000000000000000000000";
    writeFileSync(path, `${JSON.stringify(proof)}\n`);
    const observed = runGate(root, ["--proof-bound-commit", seal, "--verify-evidence-dir", proofDir]);
    record("stale-proof-binding", observed, 1);
  } finally { removeWorktree(root); }
}

{
  const root = worktree(candidate);
  try {
    const path = resolve(root, "docs/docs/review-evidence/compatibility-target.ts");
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, "export {};\n");
    const observed = runGate(root);
    record("compatibility-shim", observed, 1);
  } finally { removeWorktree(root); }
}

{
  const root = worktree(candidate);
  try {
    rmSync(resolve(root, historicalProbe));
    const observed = runGate(root);
    record("silent-historical-probe-exclusion", observed, 1);
  } finally { removeWorktree(root); }
}

process.stdout.write(`${JSON.stringify({
  schemaVersion: 1,
  candidate,
  failed,
  seal,
  node: process.versions.node,
  typescript: JSON.parse(readFileSync(resolve(dependencies, "typescript/package.json"), "utf8")).version,
  results,
  summary: {
    total: results.length,
    expectedPositive: results.filter((entry) => entry.status === 0 && entry.id !== "attempt1-production-to-evidence-unsafe-pass").length,
    expectedNegative: results.filter((entry) => entry.status === 1).length,
    priorUnsafePassReproduced: results.some((entry) => entry.unsafeAcceptance === true),
    candidateUnsafeAcceptance: results.some((entry) =>
      entry.id !== "attempt1-production-to-evidence-unsafe-pass" && entry.unsafeAcceptance === true),
  },
  conclusion: results.some((entry) =>
    entry.id !== "attempt1-production-to-evidence-unsafe-pass" && entry.unsafeAcceptance === true)
    ? "FAIL: case-variant physical evidence target bypasses the Production target-class ceiling"
    : "PASS: bidirectional evidence isolation closes the reproduced attempt-1 root across real edge forms and classes",
}, null, 2)}\n`);
