import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { execFileSync, spawnSync } from "node:child_process";

const [repoArg, outputArg] = process.argv.slice(2);
if (!repoArg) throw new Error("usage: node REVIEWER_IDENTITY_AND_NONREGRESSION_V2_2.mjs <exact-candidate-repo> [output]");
if (process.versions.node !== "24.14.0") throw new Error(`node-version:${process.versions.node}`);

const repo = fs.realpathSync(repoArg);
const HEAD = "156cbafc061d36ce2395529a3150b0c974f3c603";
const PARENT = "626552c4b3eb2ef3f0dbeadddcf5202444102368";
const TREE = "00a2cf04c8834339f917ba67c05e719acb67108c";
const V21 = "3d424821aab67c03c3b8ec02a62b5577044837c9";
const FULL_REF = "refs/heads/codex/phase-1b-stage4a-phase-b-v111-m01-replacement-design-remediation-v2";
const DIR = "docs/review-evidence/phase-1b-stage4a-phase-b-v111-m01-replacement-corrected-design-v2-2";
const ROOT = `${DIR}/V111_M01_CANONICAL_REVIEW_AUTHORITY_V2_2.json`;
const PROFILE = `${DIR}/PHASE_B_CURRENT_TECHNICAL_PROFILE_V2_2.json`;
const MANIFEST = `${DIR}/SHA256SUMS.txt`;
const MATRIX = `${DIR}/V111_M01_REPLACEMENT_PROOF_MATRIX_V2_2.json`;
const VERIFIER = `${DIR}/VERIFY_V111_M01_REPLACEMENT_CORRECTED_DESIGN_V2_2.mjs`;

const checkpointExpected = {
  "refs/heads/codex/checkpoint/phase-1b-stage4a-phase-b-implementation-attempt3-pre-l3-v1": "0793948ad115c19f852a9590387ed9ba06738a39",
  "refs/heads/codex/checkpoint/phase-1b-stage4a-phase-b-m02-m04-pre-corrected-design-v1": "521525bf02394ab49727aca9f8ea00bbb91e487b",
  "refs/heads/codex/checkpoint/phase-1b-stage4a-phase-b-nm01-pre-design-v1": "b7ad96b24da45de00cae2cdb961a9aefcbc99496",
  "refs/heads/codex/checkpoint/phase-1b-stage4a-phase-b-v111-m01-pre-corrected-design-v1": "66bfd0bb8dd5a0f398bd2a70ee5672acc127a100",
  "refs/heads/codex/checkpoint/phase-1b-stage4a-phase-b-v111-m01-replacement-design-pre-l3-v1": "c103682e63e9a2cb62b6581d7d62773ddcab1a99",
  "refs/heads/codex/checkpoint/phase-1b-stage4a-phase-b-v111-m01-three-strike-analysis-pre-l3-v1": "0793948ad115c19f852a9590387ed9ba06738a39",
  "refs/heads/codex/checkpoint/phase-1b-stage4a-phase-b-v111-m01-v2-m01-remediation-pre-l3-v1": "4b626fc9278f4c49957ecf165d7d5c5fc4058dca",
  "refs/heads/codex/checkpoint/phase-1b-stage4a-phase-b-v111-m01-v21-cli-remediation-pre-l3-v1": V21,
  "refs/heads/codex/checkpoint/phase-1b-stage4a-phase-b-v112-v111-m01-attempt2-pre-design-v1": "901edf7b8207afb39970e8507c86d53668c27196",
  "refs/heads/codex/checkpoint/phase-1b-stage4a-phase-b-v113-v111-m01-attempt3-pre-design-v1": "de6c10d9ffc23fefcb1a5bcfd57b2906d4c2d16d",
};

function git(args, encoding = "utf8") {
  return execFileSync("git", args, { cwd: repo, encoding, stdio: ["ignore", "pipe", "pipe"] }).toString().trimEnd();
}

function runGit(args) {
  const result = spawnSync("git", args, { cwd: repo, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  return { exit: result.status, stdout: result.stdout || "", stderr: result.stderr || "" };
}

const sha256 = (bytes) => crypto.createHash("sha256").update(bytes).digest("hex");

function jcs(value) {
  if (value === null || typeof value === "boolean" || typeof value === "string") return JSON.stringify(value);
  if (typeof value === "number") {
    if (!Number.isFinite(value) || (Number.isInteger(value) && !Number.isSafeInteger(value))) throw new Error("invalid-jcs-number");
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) return `[${value.map(jcs).join(",")}]`;
  return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${jcs(value[key])}`).join(",")}}`;
}

function readJson(repoPath) {
  return JSON.parse(fs.readFileSync(path.join(repo, repoPath), "utf8"));
}

function verifyManifest(repoPath) {
  const text = fs.readFileSync(path.join(repo, repoPath), "utf8");
  const lines = text.trimEnd().split("\n");
  const entries = lines.map((line) => {
    const match = line.match(/^([0-9a-f]{64})  (.+)$/);
    if (!match) throw new Error(`manifest-line:${repoPath}`);
    return { hash: match[1], path: match[2] };
  });
  if (new Set(entries.map((entry) => entry.path)).size !== entries.length) throw new Error(`manifest-duplicate:${repoPath}`);
  for (const entry of entries) {
    const actual = sha256(fs.readFileSync(path.join(repo, entry.path)));
    if (actual !== entry.hash) throw new Error(`manifest-hash:${entry.path}`);
  }
  return { count: entries.length, fileSha256: sha256(Buffer.from(text)), ok: true };
}

function extractSqlColumns(sql, table) {
  const startToken = `CREATE TABLE "${table}" (`;
  const start = sql.indexOf(startToken);
  if (start < 0) throw new Error(`table-missing:${table}`);
  const block = sql.slice(start + startToken.length, sql.indexOf("\n);", start));
  return block.split("\n").map((line) => line.match(/^\s*"([^"]+)"\s/)?.[1]).filter(Boolean);
}

const rootBytes = fs.readFileSync(path.join(repo, ROOT));
const root = JSON.parse(rootBytes);
const rootProjection = structuredClone(root);
delete rootProjection.seal.authorityJcsSha256;
const profile = readJson(PROFILE);
const profile21 = readJson("docs/review-evidence/phase-1b-stage4a-phase-b-v111-m01-replacement-corrected-design-v2-1/PHASE_B_CURRENT_TECHNICAL_PROFILE_V2_1.json");
const sql = fs.readFileSync(path.join(repo, "drizzle/0020_phase1b_ai_foundation.sql"), "utf8");
const sqlConfig = extractSqlColumns(sql, "ai_model_config");
const sqlRuns = extractSqlColumns(sql, "ai_runs");

const result = {
  runtime: { node: process.versions.node, v8: process.versions.v8, icu: process.versions.icu, unicode: process.versions.unicode, arch: process.arch },
  identity: {
    head: git(["rev-parse", "HEAD"]),
    parent: git(["rev-parse", "HEAD^"]),
    tree: git(["rev-parse", "HEAD^{tree}"]),
    fullRef: git(["rev-parse", FULL_REF]),
    detached: runGit(["symbolic-ref", "-q", "HEAD"]).exit === 1,
    clean: git(["status", "--porcelain=v1", "--untracked-files=all"]) === "",
  },
  checkpoints: {},
  newCheckpointRecord: {},
  tag: {
    object: git(["rev-parse", "refs/tags/phase-1b-stage3-approved-2026-08-09"]),
    peel: git(["rev-parse", "refs/tags/phase-1b-stage3-approved-2026-08-09^{}"]),
  },
  scope: {},
  manifests: {},
  canonicalRoot: {
    fileSha256: sha256(rootBytes),
    canonicalBytes: rootBytes.toString("utf8") === `${jcs(root)}\n`,
    authorityJcsSha256: sha256(Buffer.from(jcs(rootProjection), "utf8")),
    declaredAuthorityJcsSha256: root.seal.authorityJcsSha256,
    subjectJcsSha256: sha256(Buffer.from(jcs(root.subject), "utf8")),
    declaredSubjectJcsSha256: root.seal.subjectJcsSha256,
    topLevelKeys: Object.keys(root).sort(),
    rootCount: root.rolePolicy.rootCount,
  },
  selectedAuthorities: {},
  schemaMapping: {
    aiModelConfig: { sql: sqlConfig, profile: profile.schemaMapping.aiModelConfig.fields, equal: JSON.stringify(sqlConfig) === JSON.stringify(profile.schemaMapping.aiModelConfig.fields) },
    aiRuns: { sql: sqlRuns, profile: profile.schemaMapping.aiRuns.fields, equal: JSON.stringify(sqlRuns) === JSON.stringify(profile.schemaMapping.aiRuns.fields) },
  },
  priorLoopNonAncestors: {},
  physicalInjectivity: {},
  verifierStaticBoundary: {},
  process: { packageManager: false, network: false },
};

for (const [ref, expected] of Object.entries(checkpointExpected)) {
  const actual = git(["rev-parse", ref]);
  result.checkpoints[ref] = { actual, expected, exact: actual === expected };
}

const record = "eca7843fa3ced513cc199514bbf5afad30dc5553";
const recordPaths = git(["diff-tree", "--no-commit-id", "--name-status", "-r", `${record}^`, record]).split("\n").filter(Boolean);
result.newCheckpointRecord = {
  parent: git(["rev-parse", `${record}^`]),
  tree: git(["rev-parse", `${record}^{tree}`]),
  paths: recordPaths,
  pathSha256: sha256(fs.readFileSync(path.join(repo, "docs/PHASE_1B_STAGE4A_PHASE_B_V111_M01_V21_CLI_REMEDIATION_PRE_L3_CHECKPOINT_V1_0.md"))),
};

const fullScope = git(["diff", "--name-status", `${V21}..${HEAD}`]).split("\n").filter(Boolean);
const contentScope = git(["diff", "--name-status", `${PARENT}..${HEAD}`]).split("\n").filter(Boolean);
const modes = contentScope.map((entry) => {
  const repoPath = entry.split("\t").at(-1);
  const treeEntry = git(["ls-tree", "HEAD", "--", repoPath]);
  return { path: repoPath, mode: treeEntry.split(" ")[0], type: treeEntry.split(" ")[1] };
});
result.scope = {
  v21ToHeadPathCount: fullScope.length,
  contentPathCount: contentScope.length,
  contentPaths: contentScope,
  contentAllDocs: contentScope.every((entry) => entry.split("\t").at(-1).startsWith("docs/")),
  allAdded: contentScope.every((entry) => entry.startsWith("A\t")),
  allMode100644Blob: modes.every((entry) => entry.mode === "100644" && entry.type === "blob"),
  modes,
  disallowedPathCount: fullScope.filter((entry) => /\t(?:src|scripts|test-fixtures|drizzle|package\.json|pnpm-lock\.yaml)/.test(entry)).length,
  diffCheckV21ToHead: runGit(["diff", "--check", `${V21}..${HEAD}`]).exit,
  diffCheckContent: runGit(["diff", "--check", `${PARENT}..${HEAD}`]).exit,
};

result.manifests.candidate = verifyManifest(MANIFEST);
result.manifests.priorReview = verifyManifest("docs/review-evidence/phase-1b-stage4a-phase-b-independent-v111-m01-replacement-corrected-design-rereview-v2-1/SHA256SUMS.txt");
result.manifests.maxAnalysis = verifyManifest("docs/review-evidence/phase-1b-stage4a-phase-b-v111-m01-three-strike-analysis-v1/SHA256SUMS.txt");
result.manifests.v110 = verifyManifest("docs/review-evidence/phase-1b-stage4a-phase-b-corrected-exact-design-v1-10-v18-m01-m03-attempt-2-v1/SHA256SUMS.txt");
result.manifests.v110Independent = verifyManifest("docs/review-evidence/phase-1b-stage4a-phase-b-independent-corrected-design-review-v1-10/SHA256SUMS.txt");

for (const [name, entry] of Object.entries(profile.selectedAuthorities)) {
  const objectBytes = execFileSync("git", ["show", `${entry.source.commit}:${entry.source.path}`], { cwd: repo, stdio: ["ignore", "pipe", "pipe"] });
  const objectValue = JSON.parse(objectBytes);
  result.selectedAuthorities[name] = {
    sourceFileSha256: sha256(objectBytes),
    declaredFileSha256: entry.source.fileSha256,
    sourceEqualsEmbeddedByJcs: jcs(objectValue) === jcs(entry.value),
    embeddedValueJcsSha256: sha256(Buffer.from(jcs(entry.value), "utf8")),
    declaredValueJcsSha256: entry.source.valueJcsSha256,
    v21EmbeddedValueEqual: jcs(entry.value) === jcs(profile21.selectedAuthorities[name].value),
  };
}

for (const commit of [
  "901edf7b8207afb39970e8507c86d53668c27196",
  "de6c10d9ffc23fefcb1a5bcfd57b2906d4c2d16d",
  "aac9169c507f0976a492d61a30d415a27c95e4b1",
]) {
  result.priorLoopNonAncestors[commit] = runGit(["merge-base", "--is-ancestor", commit, HEAD]).exit === 1;
}

const physicalPaths = [MANIFEST, ...root.rolePolicy.candidatePackagePaths, ...root.checkpoints.map((entry) => entry.recordPath)];
const physical = physicalPaths.map((repoPath) => {
  const stat = fs.lstatSync(path.join(repo, repoPath));
  return { path: repoPath, device: stat.dev, inode: stat.ino, regular: stat.isFile(), symlink: stat.isSymbolicLink() };
});
result.physicalInjectivity = {
  count: physical.length,
  uniquePathCount: new Set(physical.map((entry) => entry.path)).size,
  uniqueDeviceInodeCount: new Set(physical.map((entry) => `${entry.device}:${entry.inode}`)).size,
  allRegularNoSymlink: physical.every((entry) => entry.regular && !entry.symlink),
};

const verifierText = fs.readFileSync(path.join(repo, VERIFIER), "utf8");
const rawIndex = verifierText.indexOf("const rawAuthorityEvidence = validateRawAuthorityArgument(authorityArgument);");
const repoIndex = verifierText.indexOf("const repoRoot = repoRootFrom(process.cwd());", rawIndex);
result.verifierStaticBoundary = {
  rawCheckBeforeRepoDiscovery: rawIndex >= 0 && repoIndex > rawIndex,
  actualCliSpawnPresent: verifierText.includes("spawnSync(process.execPath, [verifierAbsolute, \"--authority\", rawAuthorityArgument, \"--package-only\"]"),
  legacyCurrentLoaderSymbolsAbsent: !/(markdownAuthorityView|scanCurrentAuthority|markedBlock|withoutHistoricalBlocks|SEAL_SHA256SUMS)/.test(verifierText),
  candidateCurrentEnvelopeAbsent: !root.rolePolicy.candidatePackagePaths.some((entry) => path.posix.basename(entry).startsWith("CANDIDATE_REVIEW_ENVELOPE_")),
  oneVerifierRole: root.currentRoles.filter((entry) => entry.role === "currentVerifier").length,
  oneRootManifestEntry: fs.readFileSync(path.join(repo, MANIFEST), "utf8").split("\n").filter((line) => line.endsWith(`  ${ROOT}`)).length,
  proofMatrixCounts: { positive: readJson(MATRIX).positive.length, negative: readJson(MATRIX).negative.length, properties: readJson(MATRIX).properties.length },
};

if (result.identity.head !== HEAD || result.identity.parent !== PARENT || result.identity.tree !== TREE || result.identity.fullRef !== HEAD) throw new Error("identity-mismatch");
if (!result.identity.clean || !result.identity.detached) throw new Error("snapshot-not-clean-detached");
if (!result.canonicalRoot.canonicalBytes || result.canonicalRoot.authorityJcsSha256 !== root.seal.authorityJcsSha256 || result.canonicalRoot.subjectJcsSha256 !== root.seal.subjectJcsSha256) throw new Error("canonical-root-mismatch");
if (!result.schemaMapping.aiModelConfig.equal || sqlConfig.length !== 21 || !result.schemaMapping.aiRuns.equal || sqlRuns.length !== 96) throw new Error("schema-mapping-mismatch");
if (Object.values(result.checkpoints).some((entry) => !entry.exact)) throw new Error("checkpoint-moved");
if (Object.values(result.selectedAuthorities).some((entry) => entry.sourceFileSha256 !== entry.declaredFileSha256 || !entry.sourceEqualsEmbeddedByJcs || entry.embeddedValueJcsSha256 !== entry.declaredValueJcsSha256 || !entry.v21EmbeddedValueEqual)) throw new Error("selected-authority-mismatch");

const output = `${JSON.stringify(result, null, 2)}\n`;
if (outputArg) fs.writeFileSync(outputArg, output);
else process.stdout.write(output);
