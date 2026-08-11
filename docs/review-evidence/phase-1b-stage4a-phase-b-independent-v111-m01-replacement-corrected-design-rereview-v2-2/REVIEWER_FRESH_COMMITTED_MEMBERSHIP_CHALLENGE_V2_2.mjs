import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";

const [sourceRepoArg, envelopeArg, outputArg] = process.argv.slice(2);
if (!sourceRepoArg || !envelopeArg || !outputArg) throw new Error("usage: node challenge.mjs <source-repo> <envelope> <output>");
if (process.versions.node !== "24.14.0") throw new Error(`node-version:${process.versions.node}`);

const HEAD = "156cbafc061d36ce2395529a3150b0c974f3c603";
const AUTHORITY = "docs/review-evidence/phase-1b-stage4a-phase-b-v111-m01-replacement-corrected-design-v2-2/V111_M01_CANONICAL_REVIEW_AUTHORITY_V2_2.json";
const MANIFEST = "docs/review-evidence/phase-1b-stage4a-phase-b-v111-m01-replacement-corrected-design-v2-2/SHA256SUMS.txt";
const VERIFIER = "docs/review-evidence/phase-1b-stage4a-phase-b-v111-m01-replacement-corrected-design-v2-2/VERIFY_V111_M01_REPLACEMENT_CORRECTED_DESIGN_V2_2.mjs";
const sourceRepo = fs.realpathSync(sourceRepoArg);
const envelope = fs.realpathSync(envelopeArg);
const temp = fs.mkdtempSync(path.join(os.tmpdir(), "cwt-v22-committed-membership-"));
let repo = path.join(temp, "clone");
const sha256 = (bytes) => crypto.createHash("sha256").update(bytes).digest("hex");

function git(args) {
  const result = spawnSync("git", args, { cwd: repo, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  if (result.status !== 0) throw new Error(`git:${args.join(" ")}:${result.stderr}`);
  return (result.stdout || "").trimEnd();
}

function invoke(args) {
  const result = spawnSync(process.execPath, [path.join(repo, VERIFIER), "--authority", AUTHORITY, ...args], {
    cwd: repo,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  const parsed = result.status === 0 && result.stdout ? JSON.parse(result.stdout) : null;
  return {
    acceptanceEligible: parsed?.acceptanceEligible ?? null,
    diagnostic: (result.stderr || "").match(/Error: ([^\n]+)/)?.[1] ?? null,
    exit: result.status,
    pidObserved: Number.isInteger(result.pid) && result.pid > 0,
    stdoutEmpty: (result.stdout || "") === "",
    stdoutSha256: sha256(Buffer.from(result.stdout || "", "utf8")),
  };
}

function verify() {
  return {
    fullReview: invoke(["--review-envelope", envelope]),
    packageOnly: invoke(["--package-only"]),
  };
}

function commit(name) {
  git(["-c", "user.name=Fresh Reviewer", "-c", "user.email=reviewer.invalid@example.invalid", "commit", "--quiet", "-m", name]);
}

function restore() {
  git(["restore", "--source", HEAD, "--staged", "--worktree", "."]);
  git(["checkout", "--quiet", "--detach", HEAD]);
}

const results = { candidate: HEAD, runtime: process.versions.node, cases: {}, packageManager: false, network: false };

try {
  const cloneResult = spawnSync("git", ["clone", "--quiet", "--no-hardlinks", sourceRepo, repo], { cwd: temp, encoding: "utf8" });
  if (cloneResult.status !== 0) throw new Error(`clone:${cloneResult.stderr}`);
  repo = fs.realpathSync(repo);
  restore();
  const manifestPath = path.join(repo, MANIFEST);
  const rootPath = path.join(repo, AUTHORITY);
  const manifestText = fs.readFileSync(manifestPath, "utf8");
  const lines = manifestText.trimEnd().split("\n");
  const rootIndex = lines.findIndex((line) => line.endsWith(`  ${AUTHORITY}`));
  if (rootIndex < 0) throw new Error("root-manifest-entry-missing-baseline");

  fs.writeFileSync(manifestPath, `${lines.filter((_, index) => index !== rootIndex).join("\n")}\n`);
  git(["add", "--", MANIFEST]);
  commit("reviewer manifest missing root");
  results.cases.manifestMissingRoot = verify();
  restore();

  fs.writeFileSync(manifestPath, `${[...lines, lines[rootIndex]].join("\n")}\n`);
  git(["add", "--", MANIFEST]);
  commit("reviewer manifest duplicate root");
  results.cases.manifestDuplicateRoot = verify();
  restore();

  const wrongHash = [...lines];
  wrongHash[rootIndex] = `${"0".repeat(64)}  ${AUTHORITY}`;
  fs.writeFileSync(manifestPath, `${wrongHash.join("\n")}\n`);
  git(["add", "--", MANIFEST]);
  commit("reviewer manifest wrong root hash");
  results.cases.manifestWrongRootHash = verify();
  restore();

  const reordered = [...lines];
  [reordered[0], reordered[1]] = [reordered[1], reordered[0]];
  fs.writeFileSync(manifestPath, `${reordered.join("\n")}\n`);
  git(["add", "--", MANIFEST]);
  commit("reviewer manifest reorder");
  results.cases.manifestReordered = verify();
  restore();

  git(["update-index", "--chmod=+x", "--", AUTHORITY]);
  commit("reviewer root wrong mode");
  results.cases.rootWrongMode = verify();
  restore();

  fs.rmSync(rootPath);
  git(["add", "--", AUTHORITY]);
  commit("reviewer root missing");
  results.cases.rootMissing = verify();
  restore();

  results.finalClean = git(["status", "--porcelain=v1", "--untracked-files=all"]) === "";
  fs.writeFileSync(outputArg, `${JSON.stringify(results, null, 2)}\n`);
} finally {
  fs.rmSync(temp, { recursive: true, force: true });
}
