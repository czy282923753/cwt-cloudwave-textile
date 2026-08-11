#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import { readFileSync, readdirSync, lstatSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const evidenceDir = dirname(fileURLToPath(import.meta.url));
const root = resolve(evidenceDir, "../../..");
const relativeEvidence = relative(root, evidenceDir).split(sep).join("/");
const CHECKPOINT = "0793948ad115c19f852a9590387ed9ba06738a39";
const CHECKPOINT_PARENT = "234cd90211c45c6cc86c988d02c8d5dc2f7858d2";
const CHECKPOINT_TREE = "affecff8bc55e00d533f08e9d29d1449aa7993ca";
const CHECKPOINT_REF = "refs/heads/codex/checkpoint/phase-1b-stage4a-phase-b-v111-m01-three-strike-analysis-pre-l3-v1";
const RECORD_COMMIT = "c19e7163e9a02655461a07dce1ddb1099c6e55a6";
const RECORD_PATH = "docs/PHASE_1B_STAGE4A_PHASE_B_V111_M01_THREE_STRIKE_ANALYSIS_PRE_L3_CHECKPOINT_V1_0.md";
const BRANCH = "codex/phase-1b-stage4a-phase-b-v111-m01-three-strike-analysis-v1";
const TAG = "phase-1b-stage3-approved-2026-08-09";
const V114 = "aac9169c507f0976a492d61a30d415a27c95e4b1";
const V114_EVIDENCE = "docs/review-evidence/phase-1b-stage4a-phase-b-corrected-exact-design-v1-14-v111-m01-final-attempt-3-v1";
const ANALYSIS_PATH = "docs/PHASE_1B_STAGE4A_PHASE_B_V111_M01_THREE_STRIKE_ROOT_CAUSE_ANALYSIS_V1_0.md";
const PLAN_PATH = "docs/PHASE_1B_STAGE4A_PHASE_B_V111_M01_EXACT_REPLACEMENT_PLAN_V1_0.md";
const MANIFEST_PATH = `${relativeEvidence}/SHA256SUMS.txt`;
const OUTPUT_PATH = `${relativeEvidence}/ANALYSIS_PACKAGE_VERIFICATION_OUTPUT_V1_0.txt`;

const EXPECTED_MANIFEST_PATHS = [
  RECORD_PATH,
  ANALYSIS_PATH,
  PLAN_PATH,
  `${relativeEvidence}/README.md`,
  `${relativeEvidence}/FIXED_INPUTS_V1_0.json`,
  `${relativeEvidence}/V111_M01_REPLACEMENT_DECISION_PROFILE_V1_0.json`,
  `${relativeEvidence}/V111_M01_REPLACEMENT_PROOF_MATRIX_V1_0.json`,
  `${relativeEvidence}/RUN_V111_M01_MINIMAL_REPRO_V1_0.mjs`,
  `${relativeEvidence}/V111_M01_MINIMAL_REPRO_CAPTURE_V1_0.txt`,
  `${relativeEvidence}/ANALYSIS_IDENTITY_AND_SCOPE_CAPTURE_V1_0.txt`,
  `${relativeEvidence}/VERIFY_V111_M01_THREE_STRIKE_ANALYSIS_PACKAGE_V1_0.mjs`,
  OUTPUT_PATH
].sort();

const EXPECTED_SCOPE_PATHS = [...EXPECTED_MANIFEST_PATHS, MANIFEST_PATH].sort();
const EXPECTED_EVIDENCE_FILES = EXPECTED_SCOPE_PATHS
  .filter((path) => path.startsWith(`${relativeEvidence}/`))
  .map((path) => path.slice(relativeEvidence.length + 1))
  .sort();

function command(file, args, options = {}) {
  return execFileSync(file, args, {
    cwd: options.cwd ?? root,
    encoding: Object.hasOwn(options, "encoding") ? options.encoding : "utf8",
    maxBuffer: 64 * 1024 * 1024,
    stdio: options.stdio ?? ["ignore", "pipe", "pipe"]
  });
}

function git(...args) {
  return command("git", args).trim();
}

function gitExit(...args) {
  try {
    command("git", args);
    return 0;
  } catch (error) {
    return error.status;
  }
}

function bytes(path) {
  return readFileSync(resolve(root, path));
}

function text(path) {
  return bytes(path).toString("utf8");
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function gitBytes(commit, path) {
  return command("git", ["show", `${commit}:${path}`], { encoding: null });
}

function strictJson(source, label) {
  let index = 0;
  const fail = (reason) => { throw new Error(`${label}:${index}:${reason}`); };
  const whitespace = () => { while (/\s/.test(source[index] ?? "")) index += 1; };
  const string = () => {
    const start = index;
    if (source[index] !== '"') fail("string expected");
    index += 1;
    while (index < source.length) {
      const code = source.charCodeAt(index);
      if (source[index] === '"') {
        index += 1;
        const value = JSON.parse(source.slice(start, index));
        for (let offset = 0; offset < value.length; offset += 1) {
          const unit = value.charCodeAt(offset);
          if (unit >= 0xd800 && unit <= 0xdbff) {
            const next = value.charCodeAt(offset + 1);
            if (!(next >= 0xdc00 && next <= 0xdfff)) fail("unpaired high surrogate");
            offset += 1;
          } else if (unit >= 0xdc00 && unit <= 0xdfff) fail("unpaired low surrogate");
        }
        return value;
      }
      if (source[index] === "\\") {
        index += 1;
        if (source[index] === "u") index += 4;
      } else if (code < 0x20) fail("unescaped control");
      index += 1;
    }
    fail("unterminated string");
  };
  const value = () => {
    whitespace();
    if (source[index] === '"') return string();
    if (source[index] === "{") {
      index += 1;
      whitespace();
      const object = {};
      const seen = new Set();
      if (source[index] === "}") { index += 1; return object; }
      while (true) {
        whitespace();
        const key = string();
        if (seen.has(key)) fail(`duplicate key ${key}`);
        seen.add(key);
        whitespace();
        if (source[index] !== ":") fail("colon expected");
        index += 1;
        object[key] = value();
        whitespace();
        if (source[index] === "}") { index += 1; return object; }
        if (source[index] !== ",") fail("comma expected");
        index += 1;
      }
    }
    if (source[index] === "[") {
      index += 1;
      whitespace();
      const array = [];
      if (source[index] === "]") { index += 1; return array; }
      while (true) {
        array.push(value());
        whitespace();
        if (source[index] === "]") { index += 1; return array; }
        if (source[index] !== ",") fail("comma expected");
        index += 1;
      }
    }
    for (const [literal, parsed] of [["true", true], ["false", false], ["null", null]]) {
      if (source.startsWith(literal, index)) { index += literal.length; return parsed; }
    }
    const match = source.slice(index).match(/^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?/);
    if (!match) fail("value expected");
    index += match[0].length;
    const number = Number(match[0]);
    if (!Number.isFinite(number)) fail("non-finite number");
    return number;
  };
  const parsed = value();
  whitespace();
  if (index !== source.length) fail("trailing bytes");
  return parsed;
}

function jcs(value) {
  if (value === null) return "null";
  if (["boolean", "number", "string"].includes(typeof value)) return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(jcs).join(",")}]`;
  return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${jcs(value[key])}`).join(",")}}`;
}

function selfJcsSha(value, field) {
  const copy = JSON.parse(JSON.stringify(value));
  delete copy[field];
  return sha256(jcs(copy));
}

function parseManifest(source, label) {
  const lines = source.trimEnd().split("\n").filter(Boolean);
  return lines.map((line) => {
    const match = line.match(/^([0-9a-f]{64})  (.+)$/);
    assert.ok(match, `${label} malformed line`);
    return { sha256: match[1], path: match[2] };
  });
}

function verifyFilesystemManifest(manifestPath, manifestRoot, expectedCount) {
  const entries = parseManifest(readFileSync(manifestPath, "utf8"), manifestPath);
  assert.equal(entries.length, expectedCount, `${manifestPath} count`);
  for (const entry of entries) {
    assert.equal(sha256(readFileSync(resolve(manifestRoot, entry.path))), entry.sha256, entry.path);
  }
}

function verifyGitManifest(commit, manifestPath, expectedCount) {
  const entries = parseManifest(gitBytes(commit, manifestPath).toString("utf8"), manifestPath);
  assert.equal(entries.length, expectedCount, `${manifestPath} count`);
  for (const entry of entries) {
    assert.equal(sha256(gitBytes(commit, entry.path)), entry.sha256, entry.path);
  }
}

function changedScopePaths() {
  const lists = [
    git("diff", "--name-only", `${CHECKPOINT}..HEAD`),
    git("diff", "--name-only"),
    git("diff", "--cached", "--name-only"),
    git("ls-files", "--others", "--exclude-standard")
  ];
  return [...new Set(lists.flatMap((value) => value.split("\n").filter(Boolean)))].sort();
}

function verifyMarkdown(path) {
  const body = text(path);
  assert.equal(body.includes("\r"), false, `${path} LF only`);
  assert.equal((body.match(/^```/gm) ?? []).length % 2, 0, `${path} balanced fences`);
  for (const match of body.matchAll(/\[[^\]]+\]\(([^)]+)\)/g)) {
    const target = match[1];
    if (/^(?:https?:|#)/.test(target)) continue;
    const targetPath = target.split("#", 1)[0];
    const resolved = resolve(root, dirname(path), targetPath);
    assert.equal(lstatSync(resolved).isFile(), true, `${path} local link ${target}`);
  }
}

const emitCapture = process.argv.slice(2).includes("--emit-capture");
assert.deepEqual(process.argv.slice(2), emitCapture ? ["--emit-capture"] : []);
assert.equal(process.versions.node, "24.14.0");

const fixed = strictJson(text(`${relativeEvidence}/FIXED_INPUTS_V1_0.json`), "fixed inputs");
const decision = strictJson(text(`${relativeEvidence}/V111_M01_REPLACEMENT_DECISION_PROFILE_V1_0.json`), "decision profile");
const matrix = strictJson(text(`${relativeEvidence}/V111_M01_REPLACEMENT_PROOF_MATRIX_V1_0.json`), "proof matrix");

assert.equal(git("branch", "--show-current"), BRANCH);
assert.equal(git("rev-parse", CHECKPOINT_REF), CHECKPOINT);
assert.equal(git("rev-parse", `${CHECKPOINT}^`), CHECKPOINT_PARENT);
assert.equal(git("rev-parse", `${CHECKPOINT}^{tree}`), CHECKPOINT_TREE);
assert.equal(git("rev-parse", `${RECORD_COMMIT}^`), CHECKPOINT);
assert.deepEqual(git("show", "--format=", "--name-only", RECORD_COMMIT).split("\n").filter(Boolean), [RECORD_PATH]);
assert.equal(sha256(bytes(RECORD_PATH)), fixed.checkpoint.recordSha256);
assert.equal(git("rev-parse", TAG), fixed.frozenTag.object);
assert.equal(git("rev-parse", `${TAG}^{}`), fixed.frozenTag.peeledCommit);
assert.equal(gitExit("merge-base", "--is-ancestor", CHECKPOINT, "HEAD"), 0);
for (const attempt of fixed.failedAttempts) {
  assert.equal(git("rev-parse", `${attempt.candidateCommit}^`), attempt.candidateParent);
  assert.equal(git("rev-parse", `${attempt.candidateCommit}^{tree}`), attempt.candidateTree);
  assert.equal(gitExit("merge-base", "--is-ancestor", attempt.candidateCommit, "HEAD"), 1, `${attempt.candidateCommit} non-ancestor`);
}

const expectedCurrentScope = emitCapture
  ? EXPECTED_SCOPE_PATHS.filter((path) => path !== MANIFEST_PATH)
  : EXPECTED_SCOPE_PATHS;
assert.deepEqual(changedScopePaths(), expectedCurrentScope, "exact analysis scope inventory");
assert.equal(expectedCurrentScope.every((path) => path.startsWith("docs/")), true);
for (const path of expectedCurrentScope) {
  const info = lstatSync(resolve(root, path));
  assert.equal(info.isSymbolicLink(), false, `${path} not symlink`);
  assert.equal(info.isFile(), true, `${path} regular file`);
  assert.equal(bytes(path).includes(13), false, `${path} LF only`);
}

const evidenceFiles = readdirSync(evidenceDir).sort();
const expectedCurrentEvidence = emitCapture
  ? EXPECTED_EVIDENCE_FILES.filter((path) => path !== "SHA256SUMS.txt")
  : EXPECTED_EVIDENCE_FILES;
assert.deepEqual(evidenceFiles, expectedCurrentEvidence, "exact evidence directory inventory");

for (const path of [RECORD_PATH, ANALYSIS_PATH, PLAN_PATH, `${relativeEvidence}/README.md`]) verifyMarkdown(path);

assert.equal(sha256(bytes("package.json")), fixed.dependencyInventory.packageJsonSha256);
assert.equal(sha256(bytes("pnpm-lock.yaml")), fixed.dependencyInventory.pnpmLockSha256);
const packageText = `${text("package.json")}\n${text("pnpm-lock.yaml")}`;
for (const packageName of fixed.dependencyInventory.packagesChecked) {
  assert.equal(packageText.includes(`\"${packageName}\"`), false, `${packageName} not declared/locked`);
}
const require = createRequire(import.meta.url);
for (const packageName of fixed.dependencyInventory.packagesChecked) {
  let resolved = false;
  try { require.resolve(`${packageName}/package.json`); resolved = true; } catch { resolved = false; }
  assert.equal(resolved, false, `${packageName} not locally resolved`);
}

const reviewerDirectory = fixed.reviewerV114Control.directory;
const reviewerRoot = resolve(reviewerDirectory, "../../..");
for (const file of fixed.reviewerV114Control.files) {
  const path = file.path ?? join(reviewerDirectory, file.filename);
  assert.equal(sha256(readFileSync(path)), file.sha256, file.role);
}
verifyFilesystemManifest(join(reviewerDirectory, "SHA256SUMS.txt"), reviewerRoot, 6);

for (const attempt of fixed.failedAttempts.slice(0, 2)) {
  const version = attempt.attempt === 1 ? "12" : "13";
  const report = join(reviewerRoot, `docs/PHASE_1B_STAGE4A_PHASE_B_INDEPENDENT_CORRECTED_EXACT_DESIGN_REVIEW_V1_${version}.md`);
  const directory = join(reviewerRoot, `docs/review-evidence/phase-1b-stage4a-phase-b-independent-corrected-design-review-v1-${version}`);
  assert.equal(sha256(readFileSync(report)), attempt.controllingReportSha256);
  assert.equal(sha256(readFileSync(join(directory, `INDEPENDENT_CORRECTED_DESIGN_REVIEW_EVIDENCE_V1_${version}.md`))), attempt.controllingEvidenceSha256);
  assert.equal(sha256(readFileSync(join(directory, "SHA256SUMS.txt"))), attempt.controllingManifestSha256);
}

for (const file of fixed.v114CandidateControl.files) {
  const path = file.path ?? `${V114_EVIDENCE}/${file.filename}`;
  assert.equal(sha256(gitBytes(V114, path)), file.sha256, file.role);
}
verifyGitManifest(V114, `${V114_EVIDENCE}/SHA256SUMS.txt`, 15);
verifyGitManifest(V114, `${V114_EVIDENCE}/SEAL_SHA256SUMS.txt`, 3);
const v114Subject = strictJson(gitBytes(V114, `${V114_EVIDENCE}/CURRENT_AUTHORITY_SUBJECT_V1_0.json`).toString("utf8"), "V1.14 subject");
const v114Identity = strictJson(gitBytes(V114, `${V114_EVIDENCE}/CURRENT_AUTHORITY_IDENTITY_V1_0.json`).toString("utf8"), "V1.14 identity");
assert.equal(v114Subject.subjectJcsSha256, selfJcsSha(v114Subject, "subjectJcsSha256"));
assert.equal(v114Identity.identityJcsSha256, selfJcsSha(v114Identity, "identityJcsSha256"));

assert.equal(decision.decision.selectedOption, "A-SEALED-STRUCTURED-ROOT-PLUS-EXTERNAL-CONSUMED-REVIEW-ENVELOPE");
assert.equal(decision.decision.ownerArchitectureDecisionRequired, false);
assert.equal(decision.decision.dependencyDecisionRequired, false);
assert.equal(decision.decision.newAdrRequired, false);
assert.equal(decision.selectedArchitecture.markdown.machineAuthority, false);
assert.equal(decision.selectedArchitecture.markdown.astLintRequired, false);
assert.equal(decision.selectedArchitecture.authorityArtifact.exactCardinality.currentRoles, 3);
assert.equal(decision.selectedArchitecture.authorityArtifact.exactCardinality.proofContracts, 5);
assert.equal(decision.selectedArchitecture.authorityArtifact.exactCardinality.checkpoints, 2);
assert.equal(decision.requiredRemovals.compatibilityLayerAllowed, false);
assert.equal(matrix.positive.length, 10);
assert.equal(matrix.negative.length, 42);
assert.equal(matrix.properties.length, 10);
assert.equal(new Set([...matrix.positive, ...matrix.negative, ...matrix.properties].map((item) => item.id)).size, 62);
assert.equal(matrix.acceptance.ordinaryAttempt4Allowed, false);
assert.equal(matrix.acceptance.freshIndependentDesignReviewRequired, true);

for (const [path, needles] of [
  [ANALYSIS_PATH, [
    "Ordinary Attempt 4 is prohibited",
    "one sealed, duplicate-aware, canonical JSON root",
    "Markdown remains useful for human design explanation",
    "This task does not perform step 2 or later"
  ]],
  [PLAN_PATH, [
    "A-SEALED-STRUCTURED-ROOT-PLUS-EXTERNAL-CONSUMED-REVIEW-ENVELOPE",
    "Markdown is non-authoritative rendered documentation",
    "Every envelope leaf must be read",
    "different new `gpt-5.6-sol/xhigh`",
    "must send its coordinator callback and stop"
  ]]
]) {
  for (const needle of needles) assert.ok(text(path).includes(needle), `${path} includes ${needle}`);
}

const reproScript = resolve(root, `${relativeEvidence}/RUN_V111_M01_MINIMAL_REPRO_V1_0.mjs`);
const capturedRepro = bytes(`${relativeEvidence}/V111_M01_MINIMAL_REPRO_CAPTURE_V1_0.txt`);
const freshRepro1 = command(process.execPath, [reproScript, "--repo", root], { encoding: null });
const freshRepro2 = command(process.execPath, [reproScript, "--repo", root], { encoding: null });
assert.deepEqual(freshRepro1, capturedRepro);
assert.deepEqual(freshRepro2, capturedRepro);
assert.equal(sha256(capturedRepro), "9ae5ad930221858d7f832b9c856cbc0215560b56d23176f374ae28f9bf9cd75c");
const repro = strictJson(capturedRepro.toString("utf8"), "minimal repro capture");
assert.equal(repro.ok, true);
assert.equal(repro.commonMark.witnesses.length, 5);
assert.equal(repro.commonMark.witnesses.every((item) => item.shippedGateAccepted), true);
assert.equal(repro.gitAndReviewIdentity.actualVerifierExit, 0);
assert.equal(repro.gitAndReviewIdentity.allThreeRefCopiesDiffer, true);
assert.equal(repro.gitAndReviewIdentity.mutatedEnvelope.allGitFieldsMismatchObserved, true);
assert.equal(repro.gitAndReviewIdentity.verifierReadsEnvelopeFilename, false);
assert.equal(repro.gitAndReviewIdentity.verifierHasEnvelopePathBinding, false);
assert.equal(repro.renderedGateDrift.v113Manifest.drift, true);
assert.equal(repro.renderedGateDrift.v113Seal.drift, true);

for (const value of Object.values(fixed.processActions)) assert.equal(value, 0);

if (!emitCapture) {
  const entries = parseManifest(text(MANIFEST_PATH), MANIFEST_PATH);
  assert.deepEqual(entries.map((entry) => entry.path).sort(), EXPECTED_MANIFEST_PATHS);
  for (const entry of entries) assert.equal(sha256(bytes(entry.path)), entry.sha256, entry.path);
}

const normalized = {
  baseline: {
    checkpoint: CHECKPOINT,
    checkpointParent: CHECKPOINT_PARENT,
    checkpointRecord: RECORD_COMMIT,
    checkpointTree: CHECKPOINT_TREE,
    failedAttemptsAreNonAncestors: true,
    frozenTagObject: fixed.frozenTag.object,
    frozenTagPeeledCommit: fixed.frozenTag.peeledCommit
  },
  decision: {
    markdownMachineAuthority: false,
    newAdrRequired: false,
    newDependencyRequired: false,
    ownerArchitectureDecisionRequired: false,
    selectedOption: decision.decision.selectedOption
  },
  evidence: {
    reviewerV114Manifest: "6/6 PASS",
    v114MainManifest: "15/15 PASS",
    v114SealManifest: "3/3 PASS"
  },
  package: {
    evidenceFileCount: EXPECTED_EVIDENCE_FILES.length,
    expectedChangedPathCount: EXPECTED_SCOPE_PATHS.length,
    manifestEntries: EXPECTED_MANIFEST_PATHS.length,
    scope: "docs-only",
    strictJsonDocuments: 3
  },
  proofMatrix: {
    negative: matrix.negative.length,
    positive: matrix.positive.length,
    properties: matrix.properties.length
  },
  reproduction: {
    commonMarkWitnesses: repro.commonMark.witnesses.length,
    divergentIdentityGraphAcceptedByV114Verifier: true,
    outputSha256: sha256(capturedRepro),
    repeatedByteIdentical: true,
    renderedHashDrifts: 2
  },
  runtime: {
    arch: process.arch,
    node: process.versions.node,
    v8: process.versions.v8
  },
  ok: true,
  disposition: "ANALYSIS COMPLETE / REPLACEMENT RECOMMENDED / NOT CORRECTED DESIGN / NOT IMPLEMENTATION ELIGIBLE"
};

const output = `${JSON.stringify(normalized, null, 2)}\n`;
if (!emitCapture) assert.equal(text(OUTPUT_PATH), output, "package verifier capture deterministic");
process.stdout.write(output);
