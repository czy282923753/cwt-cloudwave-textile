import { execFileSync, spawnSync } from "node:child_process";
import {
  existsSync,
  linkSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";

const source = "/Users/calvin/.codex/worktrees/b62f/CWT（CloudWave Textile）项目";
const dependencies = "/Users/calvin/.codex/worktrees/2a07/CWT（CloudWave Textile）项目/node_modules";
const candidate = "b48f33f35d5d46824a8c4dec6b40d4a093050285";
const failed = "10de3daf142561247e141c140b10966954f8dc9e";
const seal = "87966f118766b60aeacc51ceca61c68ea57a62cf";
const evidence = "docs/review-evidence/phase-1b-stage4a-phase-b-v2-2-fresh-replacement-foundation-implementation-imp3-nm01-final-tree-closure-remediation-v1";
const probe = "docs/review-evidence/phase-1b-stage4a-phase-b-v2-2-fresh-replacement-foundation-implementation-h01-m04-remediation-v2-independent-rereview-v1/REVIEWER_H02_NONREGRESSION_IMPORT_PROBE_V1_0.ts";

if (process.versions.node !== "24.14.0") throw new Error("Node 24.14.0 required");

function worktree(commit) {
  const root = mkdtempSync(join(tmpdir(), "cwt-reviewer-imp3-nm01-"));
  rmSync(root, { recursive: true });
  execFileSync("git", ["worktree", "add", "--detach", root, commit], { cwd: source, stdio: "ignore" });
  return root;
}

function removeWorktree(root) {
  execFileSync("git", ["worktree", "remove", "--force", root], { cwd: source, stdio: "ignore" });
}

function installBridge(root) {
  const nodeModules = resolve(root, "node_modules");
  mkdirSync(nodeModules);
  for (const name of ["tsx", "typescript"]) {
    symlinkSync(resolve(dependencies, name), resolve(nodeModules, name), "dir");
  }
  return () => rmSync(nodeModules, { recursive: true });
}

function generateOfficialTypegen(root) {
  const nodeModules = resolve(root, "node_modules");
  symlinkSync(dependencies, nodeModules, "dir");
  try {
    const result = spawnSync("/usr/bin/sandbox-exec", [
      "-p", "(version 1)(allow default)(deny network*)",
      process.execPath, resolve(dependencies, "next/dist/bin/next"), "typegen", ".",
    ], { cwd: root, encoding: "utf8", env: { ...process.env, NEXT_TELEMETRY_DISABLED: "1" } });
    if (result.status !== 0) throw new Error(`official typegen failed: ${result.stderr || result.stdout}`);
  } finally {
    rmSync(nodeModules);
  }
}

function run(root, args = []) {
  const removeBridge = installBridge(root);
  try {
    const result = spawnSync(process.execPath, ["--import", "tsx", "scripts/verify-ai-architecture.ts", ...args], {
      cwd: root,
      encoding: "utf8",
      env: { ...process.env, CWT_INSTALLED_NODE_MODULES: dependencies },
    });
    return { status: result.status, stdout: result.stdout, stderr: result.stderr };
  } finally {
    removeBridge();
  }
}

function reason(result) {
  if (result.status === 0) return "none";
  const text = result.stderr;
  for (const value of [
    "unresolved_static_edge",
    "post-proof executable candidate drift",
    "historical Reviewer import compatibility target or shim exists under docs/docs",
    "stale proof commit or executable-tree binding",
    "bound proof hash or canonical bytes mismatch",
    "physical alias",
    "hard-link",
    "aliased physical file",
    "symlink",
  ]) if (text.includes(value)) return value;
  return text.split("\n").find((line) => line.includes("failed closed")) ?? "none";
}

function mutateSource(root, specifier) {
  const path = resolve(root, "src/storage/index.ts");
  const input = readFileSync(path, "utf8");
  writeFileSync(path, input.replace(
    'import { env } from "@/config/env";\n',
    `import { env } from "@/config/env";\nimport "${specifier}";\n`,
  ));
}

const results = [];

{
  const root = worktree(failed);
  try {
    const observed = run(root);
    results.push({ id: "failed-attached-equivalent-unresolved-probe", status: observed.status, reason: reason(observed) });
  } finally { removeWorktree(root); }
}

{
  const root = worktree(candidate);
  try {
    generateOfficialTypegen(root);
    const observed = run(root, ["--proof-bound-commit", seal, "--verify-evidence-dir", `${evidence}/M04_FINAL_EXECUTABLE_TREE_PROOFS_V3_1`]);
    results.push({ id: "exact-candidate-proof-bound-baseline", status: observed.status, reason: reason(observed) });
  } finally { removeWorktree(root); }
}

{
  const root = worktree(candidate);
  try {
    mutateSource(root, `../../${probe}`);
    const observed = run(root);
    results.push({
      id: "production-current-imports-diagnostic-evidence",
      status: observed.status,
      reason: reason(observed),
      unsafeAcceptance: observed.status === 0,
    });
  } finally { removeWorktree(root); }
}

{
  const root = worktree(candidate);
  try {
    mutateSource(root, "../../docs/review-evidence/reviewer-fresh-missing-current-edge");
    const observed = run(root);
    results.push({ id: "production-unresolved-control", status: observed.status, reason: reason(observed) });
  } finally { removeWorktree(root); }
}

{
  const root = worktree(candidate);
  try {
    generateOfficialTypegen(root);
    const path = resolve(root, "docs/review-evidence/reviewer-fresh-post-seal.mts");
    writeFileSync(path, 'import "./missing";\n');
    const observed = run(root, ["--proof-bound-commit", seal, "--verify-evidence-dir", `${evidence}/M04_FINAL_EXECUTABLE_TREE_PROOFS_V3_1`]);
    results.push({ id: "post-seal-executable-evidence", status: observed.status, reason: reason(observed) });
  } finally { removeWorktree(root); }
}

{
  const root = worktree(candidate);
  try {
    const path = resolve(root, "docs/docs/review-evidence/compatibility-target.ts");
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, "export {};\n");
    const observed = run(root);
    results.push({ id: "docs-docs-compatibility-shim", status: observed.status, reason: reason(observed) });
  } finally { removeWorktree(root); }
}

{
  const root = worktree(candidate);
  try {
    generateOfficialTypegen(root);
    const proofPath = resolve(root, evidence, "M04_FINAL_EXECUTABLE_TREE_PROOFS_V3_1", "AI_ACTUAL_TREE_AND_STATIC_LANGUAGE_PROOF_V3_1.json");
    const parsed = JSON.parse(readFileSync(proofPath, "utf8"));
    parsed.candidateCommit = "0000000000000000000000000000000000000000";
    writeFileSync(proofPath, `${JSON.stringify(parsed)}\n`);
    const observed = run(root, ["--proof-bound-commit", seal, "--verify-evidence-dir", `${evidence}/M04_FINAL_EXECUTABLE_TREE_PROOFS_V3_1`]);
    results.push({ id: "stale-proof-binding", status: observed.status, reason: reason(observed) });
  } finally { removeWorktree(root); }
}

for (const [id, kind] of [["historical-evidence-symlink", "symlink"], ["historical-evidence-hardlink", "hardlink"]]) {
  const root = worktree(candidate);
  try {
    const target = resolve(root, probe);
    const alias = resolve(root, `docs/review-evidence/reviewer-fresh-${kind}-alias.ts`);
    if (kind === "symlink") symlinkSync(target, alias);
    else linkSync(target, alias);
    const observed = run(root);
    results.push({ id, status: observed.status, reason: reason(observed) });
  } finally { removeWorktree(root); }
}

const expected = new Map([
  ["failed-attached-equivalent-unresolved-probe", 1],
  ["exact-candidate-proof-bound-baseline", 0],
  ["production-current-imports-diagnostic-evidence", 0],
  ["production-unresolved-control", 1],
  ["post-seal-executable-evidence", 1],
  ["docs-docs-compatibility-shim", 1],
  ["stale-proof-binding", 1],
  ["historical-evidence-symlink", 1],
  ["historical-evidence-hardlink", 1],
]);
for (const result of results) {
  if (result.status !== expected.get(result.id)) throw new Error(`unexpected challenge result: ${JSON.stringify(result)}`);
}

process.stdout.write(`${JSON.stringify({
  schemaVersion: 1,
  candidate,
  seal,
  pinnedNode: process.versions.node,
  results,
  conclusion: "FAIL: Production/current can import diagnostic evidence; evidence-only isolation is one-sided",
}, null, 2)}\n`);
