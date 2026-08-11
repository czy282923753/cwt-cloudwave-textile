import { execFileSync, spawnSync } from "node:child_process";
import {
  appendFileSync,
  copyFileSync,
  existsSync,
  linkSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
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
const candidate = "4a053c0fa9449588e88f2b8519e74e08b1b59956";
const failed = "d60d5cc2398eeeb06263c58924896250f12f3756";
const seal = "9b5be5792bbb7f863740dca3168081ad92ced868";
const evidence = "docs/review-evidence/phase-1b-stage4a-phase-b-v2-2-fresh-replacement-foundation-implementation-imp3-nm01-physical-target-identity-remediation-v3";
const proofDir = `${evidence}/M04_FINAL_EXECUTABLE_TREE_PROOFS_V3_1`;
const historicalProbe = "docs/review-evidence/phase-1b-stage4a-phase-b-v2-2-fresh-replacement-foundation-implementation-h01-m04-remediation-v2-independent-rereview-v1/REVIEWER_H02_NONREGRESSION_IMPORT_PROBE_V1_0.ts";
const v2Authority = "docs/review-evidence/phase-1b-stage4a-phase-b-v2-2-fresh-replacement-foundation-implementation-imp3-nm01-evidence-isolation-remediation-v2/IMP3_NM01_EVIDENCE_ISOLATION_AUTHORITY_V2_0.json";
const v3Authority = `${evidence}/IMP3_NM01_PHYSICAL_TARGET_IDENTITY_AUTHORITY_V3_0.json`;

if (process.versions.node !== "24.14.0") throw new Error("Node 24.14.0 required");

function worktree(commit) {
  const root = mkdtempSync(join(tmpdir(), "cwt-reviewer-imp3-nm01-r3-"));
  rmSync(root, { recursive: true });
  execFileSync("git", ["worktree", "add", "--detach", root, commit], { cwd: repository, stdio: "ignore" });
  return root;
}

function removeWorktree(root) {
  execFileSync("git", ["worktree", "remove", "--force", root], { cwd: repository, stdio: "ignore" });
}

function bridge(root, full = false) {
  const target = resolve(root, "node_modules");
  if (full) symlinkSync(dependencies, target, "dir");
  else {
    mkdirSync(target);
    for (const name of ["tsx", "typescript"]) symlinkSync(resolve(dependencies, name), resolve(target, name), "dir");
  }
  return () => rmSync(target, { recursive: !full });
}

function runGate(root, args = [], env = {}) {
  const remove = bridge(root);
  try {
    const result = spawnSync(node, ["--import", "tsx", "scripts/verify-ai-architecture.ts", ...args], {
      cwd: root,
      encoding: "utf8",
      env: { ...process.env, CWT_INSTALLED_NODE_MODULES: dependencies, ...env },
    });
    return { status: result.status, stdout: result.stdout, stderr: result.stderr };
  } finally { remove(); }
}

function runTypecheck(root) {
  const remove = bridge(root, true);
  try {
    return spawnSync(node, [resolve(dependencies, "typescript/bin/tsc"), "--noEmit"], {
      cwd: root,
      encoding: "utf8",
    });
  } finally { remove(); }
}

function relativeTarget(source, target) {
  const value = relative(dirname(source), target).replaceAll("\\", "/");
  return value.startsWith(".") ? value : `./${value}`;
}

function append(root, source, statement) {
  appendFileSync(resolve(root, source), `\n${statement}\n`);
}

function reason(result) {
  if (result.status === 0) return "PASS";
  const text = `${result.stderr}\n${result.stdout}`;
  for (const token of [
    "static-target-spelling-must-match-canonical-actual-tree-and-git-identity",
    "production-current-must-not-reach-evidence-only",
    "canonical/case collision",
    "hard-link alias",
    "symlink encountered",
    "post-proof executable candidate drift",
    "stale proof commit or executable-tree binding",
    "ambient_runtime_capability_not_authorized",
  ]) if (text.includes(token)) return token;
  return text.split("\n").find(Boolean) ?? "UNKNOWN";
}

const results = [];
function record(id, result, expected, extra = {}) {
  if (result.status !== expected) throw new Error(`${id}: expected ${expected}, got ${result.status}: ${result.stderr || result.stdout}`);
  results.push({ id, status: result.status, reason: reason(result), ...extra });
}

function assertCaseDiagnostic(id, result, requested, canonical) {
  const required = [
    "class_capability_violation",
    "static-target-spelling-must-match-canonical-actual-tree-and-git-identity",
    `\"requestedPath\":${JSON.stringify(requested)}`,
    `\"canonicalPath\":${JSON.stringify(canonical)}`,
    "non_case_exact_or_physical_alias_target_spelling",
  ];
  if (result.status === 0 || required.some((token) => !result.stderr.includes(token))) {
    throw new Error(`${id}: missing physical identity diagnostic: ${result.stderr || result.stdout}`);
  }
}

function caseWitness(commit, id, canonical, variant, expected, strictTypecheck = false) {
  const root = worktree(commit);
  try {
    const canonicalStat = statSync(resolve(root, canonical));
    const variantStat = statSync(resolve(root, variant));
    const samePhysical = canonicalStat.dev === variantStat.dev && canonicalStat.ino === variantStat.ino;
    if (!samePhysical) throw new Error(`${id}: variant is not same physical file`);
    const source = "src/storage/index.ts";
    append(root, source, `import ${JSON.stringify(relativeTarget(source, variant))};`);
    const observed = runGate(root);
    if (expected === 1) assertCaseDiagnostic(id, observed, variant, canonical);
    const typecheck = strictTypecheck ? runTypecheck(root) : undefined;
    if (typecheck !== undefined && typecheck.status !== 0) throw new Error(`${id}: strict typecheck failed`);
    record(id, observed, expected, {
      sameDeviceAndInode: samePhysical,
      canonicalRealpath: realpathSync(resolve(root, canonical)),
      variantRealpath: realpathSync(resolve(root, variant)),
      strictTypecheckStatus: typecheck?.status ?? null,
      unsafeAcceptance: expected === 0,
    });
  } finally { removeWorktree(root); }
}

// Reproduce both exact attempt-2 unsafe accepts.
caseWitness(failed, "attempt2-ts-case-variant-unsafe-pass", historicalProbe,
  historicalProbe.replace("REVIEWER_H02", "reviewer_H02"), 0);
caseWitness(failed, "attempt2-json-case-variant-unsafe-pass", v2Authority,
  v2Authority.replace("IMP3_NM01_EVIDENCE_ISOLATION_AUTHORITY_V2_0.json", "imp3_nm01_evidence_isolation_authority_v2_0.json"), 0, true);

// Exact Candidate closes filename and directory case variants, including current JSON.
caseWitness(candidate, "candidate-ts-filename-case-negative", historicalProbe,
  historicalProbe.replace("REVIEWER_H02", "reviewer_H02"), 1);
caseWitness(candidate, "candidate-v2-json-filename-case-negative", v2Authority,
  v2Authority.replace("IMP3_NM01_EVIDENCE_ISOLATION_AUTHORITY_V2_0.json", "imp3_nm01_evidence_isolation_authority_v2_0.json"), 1, true);
caseWitness(candidate, "candidate-v3-json-filename-case-negative", v3Authority,
  v3Authority.replace("IMP3_NM01_PHYSICAL_TARGET_IDENTITY_AUTHORITY_V3_0.json", "imp3_nm01_physical_target_identity_authority_v3_0.json"), 1, true);
caseWitness(candidate, "candidate-directory-case-negative", historicalProbe,
  historicalProbe.replace("review-evidence", "review-Evidence"), 1);

const canonicalForms = [
  ["canonical-side-effect", (s) => `import ${JSON.stringify(s)};`],
  ["canonical-reexport", (s) => `export * from ${JSON.stringify(s)};`],
  ["canonical-type-import", (s) => `import type { ReviewerOnlyType } from ${JSON.stringify(s)};`],
  ["canonical-type-reexport", (s) => `export type { ReviewerOnlyType } from ${JSON.stringify(s)};`],
];
for (const [id, statement] of canonicalForms) {
  const root = worktree(candidate);
  try {
    const source = "src/storage/index.ts";
    append(root, source, statement(relativeTarget(source, historicalProbe)));
    record(id, runGate(root), 1);
  } finally { removeWorktree(root); }
}

// Canonical current JSON is also evidence-only; TypeScript accepts it while the architecture gate rejects it.
{
  const root = worktree(candidate);
  try {
    const source = "src/storage/index.ts";
    append(root, source, `import ${JSON.stringify(relativeTarget(source, v3Authority))};`);
    const observed = runGate(root);
    const typecheck = runTypecheck(root);
    if (typecheck.status !== 0) throw new Error("canonical current JSON strict typecheck failed");
    record("canonical-current-json-evidence-negative", observed, 1, { strictTypecheckStatus: typecheck.status });
  } finally { removeWorktree(root); }
}

// A Fresh protected documentation resource and its extension-case alias use the same common identity authority.
{
  const root = worktree(candidate);
  try {
    const target = "docs/review-evidence/reviewer-alternative-evidence.md";
    writeFileSync(resolve(root, target), "# Reviewer evidence only\n");
    append(root, "src/storage/index.ts", `import ${JSON.stringify(relativeTarget("src/storage/index.ts", target))};`);
    record("canonical-alternative-markdown-evidence-negative", runGate(root), 1);
  } finally { removeWorktree(root); }
}

{
  const root = worktree(candidate);
  try {
    const canonical = "docs/review-evidence/reviewer-alternative-evidence.md";
    const alternate = "docs/review-evidence/reviewer-alternative-evidence.MD";
    writeFileSync(resolve(root, canonical), "# Reviewer evidence only\n");
    const canonicalStat = statSync(resolve(root, canonical));
    const alternateStat = statSync(resolve(root, alternate));
    append(root, "src/storage/index.ts", `import ${JSON.stringify(relativeTarget("src/storage/index.ts", alternate))};`);
    const observed = runGate(root);
    assertCaseDiagnostic("markdown-extension-case-negative", observed, alternate, canonical);
    record("markdown-extension-case-negative", observed, 1, {
      sameDeviceAndInode: canonicalStat.dev === alternateStat.dev && canonicalStat.ino === alternateStat.ino,
    });
  } finally { removeWorktree(root); }
}

// Transitive Product helper and extension/index resolution must still reach the common ceiling.
{
  const root = worktree(candidate);
  try {
    const helper = "src/storage/reviewer-evidence-helper.ts";
    writeFileSync(resolve(root, helper), `import ${JSON.stringify(relativeTarget(helper, historicalProbe))};\nexport {};\n`);
    append(root, "src/storage/index.ts", 'import "./reviewer-evidence-helper";');
    record("transitive-product-helper-negative", runGate(root), 1);
  } finally { removeWorktree(root); }
}

{
  const root = worktree(candidate);
  try {
    const target = "docs/review-evidence/reviewer-fresh-index-target/index.ts";
    mkdirSync(dirname(resolve(root, target)), { recursive: true });
    writeFileSync(resolve(root, target), "export type ReviewerIndexType = string;\n");
    const source = "src/storage/index.ts";
    append(root, source, `import type { ReviewerIndexType } from ${JSON.stringify(relativeTarget(source, dirname(target)))}; void (0 as unknown as ReviewerIndexType);`);
    record("index-resolution-evidence-negative", runGate(root), 1);
  } finally { removeWorktree(root); }
}

// Visible, ignored, tracked-copy, symlink and hard-link evidence aliases all remain closed.
for (const mode of ["visible-copy", "ignored-copy", "tracked-copy", "symlink", "hardlink"]) {
  const root = worktree(candidate);
  let excludeRoot;
  try {
    const target = `docs/review-evidence/reviewer-fresh-${mode}.ts`;
    const absolute = resolve(root, target);
    if (mode === "symlink") symlinkSync(resolve(root, historicalProbe), absolute);
    else if (mode === "hardlink") linkSync(resolve(root, historicalProbe), absolute);
    else copyFileSync(resolve(root, historicalProbe), absolute);
    if (mode === "tracked-copy") execFileSync("git", ["add", target], { cwd: root, stdio: "ignore" });
    const env = {};
    if (mode === "ignored-copy") {
      excludeRoot = mkdtempSync(join(tmpdir(), "cwt-reviewer-excludes-"));
      const excludes = resolve(excludeRoot, "excludes");
      writeFileSync(excludes, `${target}\n`);
      Object.assign(env, {
        GIT_CONFIG_COUNT: "1",
        GIT_CONFIG_KEY_0: "core.excludesfile",
        GIT_CONFIG_VALUE_0: excludes,
      });
    }
    if (!["symlink", "hardlink"].includes(mode)) {
      append(root, "src/storage/index.ts", `import ${JSON.stringify(relativeTarget("src/storage/index.ts", target))};`);
    }
    record(`${mode}-negative`, runGate(root, [], env), 1);
  } finally {
    if (excludeRoot !== undefined) rmSync(excludeRoot, { recursive: true });
    removeWorktree(root);
  }
}

// Unicode normalization variant on the host filesystem must either resolve to the same physical file and reject,
// or the actual-tree collision gate must reject before graph construction.
{
  const root = worktree(candidate);
  try {
    const directory = resolve(root, "docs/review-evidence");
    const requestedName = "reviewer-évidence.ts";
    writeFileSync(resolve(directory, requestedName), "export {};\n");
    const observedName = readdirSync(directory).find((name) => name.normalize("NFC") === requestedName.normalize("NFC"));
    if (observedName === undefined) throw new Error("Unicode evidence file was not observed");
    const canonical = `docs/review-evidence/${observedName}`;
    const alternateName = observedName === observedName.normalize("NFC") ? observedName.normalize("NFD") : observedName.normalize("NFC");
    const alternate = `docs/review-evidence/${alternateName}`;
    const samePhysical = statSync(resolve(root, canonical)).ino === statSync(resolve(root, alternate)).ino;
    append(root, "src/storage/index.ts", `import ${JSON.stringify(relativeTarget("src/storage/index.ts", alternate))};`);
    record("unicode-normalization-physical-alias-negative", runGate(root), 1, { canonical, alternate, samePhysical });
  } finally { removeWorktree(root); }
}

// Positive controls: canonical Product edge, emitted H-01 shadow and evidence-side observation.
{
  const root = worktree(candidate);
  try {
    append(root, "src/storage/index.ts", 'import type { StoragePartition as ReviewerStoragePartition } from "./types"; void (0 as unknown as ReviewerStoragePartition);');
    record("canonical-product-edge-positive", runGate(root), 0);
  } finally { removeWorktree(root); }
}

{
  const root = worktree(candidate);
  try {
    append(root, "src/ai/canonical-json.ts", "function reviewerLocal(fetch: () => unknown) { return fetch(); } void reviewerLocal;");
    record("h01-emitted-local-shadow-positive", runGate(root), 0);
  } finally { removeWorktree(root); }
}

{
  const root = worktree(candidate);
  try {
    append(root, "src/ai/canonical-json.ts", "const reviewerAmbient = fetch; void reviewerAmbient;");
    record("h01-ambient-origin-negative", runGate(root), 1);
  } finally { removeWorktree(root); }
}

{
  const root = worktree(candidate);
  try {
    const target = "docs/review-evidence/reviewer-fresh-observation.ts";
    writeFileSync(resolve(root, target), 'import type { ObjectStorage } from "../../src/storage/types";\nexport type Observed = ObjectStorage;\n');
    record("evidence-observes-product-positive", runGate(root), 0);
  } finally { removeWorktree(root); }
}

// Proof-bound controls.
{
  const root = worktree(candidate);
  try {
    writeFileSync(resolve(root, "docs/review-evidence/reviewer-post-seal.mts"), "export {};\n");
    record("post-seal-executable-negative", runGate(root, ["--proof-bound-commit", seal, "--verify-evidence-dir", proofDir]), 1);
  } finally { removeWorktree(root); }
}

{
  const root = worktree(candidate);
  try {
    const path = resolve(root, proofDir, "AI_ACTUAL_TREE_AND_STATIC_LANGUAGE_PROOF_V3_1.json");
    const proof = JSON.parse(readFileSync(path, "utf8"));
    proof.candidateCommit = "0000000000000000000000000000000000000000";
    writeFileSync(path, `${JSON.stringify(proof)}\n`);
    record("stale-proof-negative", runGate(root, ["--proof-bound-commit", seal, "--verify-evidence-dir", proofDir]), 1);
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
    expectedNegative: results.filter((entry) => entry.status === 1).length,
    expectedPositive: results.filter((entry) => entry.status === 0 && entry.unsafeAcceptance !== true).length,
    priorUnsafePassesReproduced: results.filter((entry) => entry.unsafeAcceptance === true).length,
    candidateUnsafeAcceptance: false,
  },
  conclusion: "PASS: exact Candidate closes physical target identity and case variants across the real sole gate",
}, null, 2)}\n`);
