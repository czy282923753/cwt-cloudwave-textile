import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, statSync } from "node:fs";
import { dirname, extname, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const repositoryRoot = resolve(here, "../../..");
const fixedPath = resolve(here, "FIXED_INPUTS_V1_0.json");
const profilePath = resolve(here, "CORRECTED_DESIGN_CONTRACT_PROFILE_V1_0.json");
const fixed = JSON.parse(readFileSync(fixedPath, "utf8"));
const profile = JSON.parse(readFileSync(profilePath, "utf8"));
const output = [];

function pass(message) {
  output.push(`PASS ${message}`);
}

function repositoryPath(path) {
  const absolute = resolve(repositoryRoot, path);
  assert.ok(
    absolute === repositoryRoot || absolute.startsWith(`${repositoryRoot}/`),
    `path escapes repository: ${path}`,
  );
  return absolute;
}

function sha256Bytes(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function sha256File(path) {
  return sha256Bytes(readFileSync(path));
}

function run(command, args, options = {}) {
  return spawnSync(command, args, {
    cwd: repositoryRoot,
    encoding: "utf8",
    env: process.env,
    maxBuffer: 32 * 1024 * 1024,
    ...options,
  });
}

function git(args) {
  const result = run("git", args);
  assert.equal(result.status, 0, `git ${args.join(" ")} failed: ${result.stderr}`);
  return result.stdout.trim();
}

function assertRuntime() {
  const runtime = profile.selectedOptions.m02.fixedRuntime;
  const expectedNode = process.env.CWT_CORRECTED_DESIGN_EXPECTED_NODE ?? runtime.node;
  assert.equal(process.versions.node, expectedNode, "runtime node");
  assert.equal(process.versions.v8, runtime.v8, "runtime v8");
  assert.equal(process.versions.icu, runtime.icu, "runtime icu");
  assert.equal(process.versions.unicode, runtime.unicode, "runtime unicode");
  assert.equal(process.versions.cldr, runtime.cldr, "runtime cldr");
  assert.equal(process.platform, runtime.platform, "runtime platform");
  assert.equal(process.arch, runtime.arch, "runtime architecture");
}

assertRuntime();

if (process.env.CWT_CORRECTED_DESIGN_RUNTIME_NEGATIVE_CHILD === "1") {
  throw new Error("runtime mismatch child unexpectedly accepted");
}

pass(
  `runtime Node ${process.versions.node}; V8 ${process.versions.v8}; ICU ${process.versions.icu}; Unicode ${process.versions.unicode}; CLDR ${process.versions.cldr}; ${process.platform}/${process.arch}`,
);

const branch = git(["branch", "--show-current"]);
assert.equal(branch, fixed.branch);
assert.equal(git(["rev-parse", fixed.branchParent]), fixed.branchParent);
assert.equal(git(["rev-parse", fixed.acceptedDesignCheckpoint]), fixed.acceptedDesignCheckpoint);
assert.equal(git(["rev-parse", `refs/tags/${fixed.frozenTag}^{}`]), fixed.frozenBaseline);
assert.equal(run("git", ["merge-base", "--is-ancestor", fixed.branchParent, "HEAD"]).status, 0);
assert.equal(
  run("git", ["merge-base", "--is-ancestor", fixed.acceptedDesignCheckpoint, fixed.branchParent]).status,
  0,
);
for (const failedRef of fixed.failedImplementationRefs) {
  assert.notEqual(
    run("git", ["merge-base", "--is-ancestor", failedRef, "HEAD"]).status,
    0,
    `failed implementation became ancestor: ${failedRef}`,
  );
}
pass("branch, parent, accepted rollback, frozen tag, ancestry and failed-code isolation");

for (const artifact of fixed.fixedArtifacts) {
  const absolute = repositoryPath(artifact.path);
  assert.ok(existsSync(absolute), `missing fixed artifact: ${artifact.path}`);
  assert.equal(sha256File(absolute), artifact.sha256, `fixed hash: ${artifact.path}`);
}
pass(`fixed artifacts byte-identical count=${fixed.fixedArtifacts.length}`);

const importedManifest = repositoryPath(
  "docs/review-evidence/phase-1b-stage4a-phase-b-three-strike-technical-escalation-independent-rereview-v1/SHA256SUMS.txt",
);
const importedLines = readFileSync(importedManifest, "utf8").trimEnd().split("\n");
assert.equal(importedLines.length, 5);
for (const line of importedLines) {
  const match = /^([0-9a-f]{64})  (.+)$/u.exec(line);
  assert.ok(match, `invalid imported manifest row: ${line}`);
  assert.equal(sha256File(repositoryPath(match[2])), match[1], match[2]);
}
pass("imported Fresh Technical Escalation PASS manifest 5/5");

assert.deepEqual(fixed.selectedOptions, ["M02-D1-INCLUDE", "M03-D1-DISCRIMINATED-SEAM"]);
assert.equal(profile.selectedOptions.m02.optionId, "M02-D1-INCLUDE");
assert.equal(profile.selectedOptions.m03.optionId, "M03-D1-DISCRIMINATED-SEAM");
assert.equal(profile.implementationAuthorized, false);
assert.equal(profile.selfApproved, false);

const ownerRecord = readFileSync(repositoryPath(profile.ownerSelectionRecordPath), "utf8");
assert.ok(ownerRecord.includes("批准 M02-D1-INCLUDE；批准 M03-D1-DISCRIMINATED-SEAM。"));
assert.ok(ownerRecord.includes("IMPLEMENTATION NOT AUTHORIZED"));
pass("Owner selections exact and authority limited to corrected Design authorship");

const includePath = repositoryPath(profile.selectedOptions.m02.path);
const includeRegistry = JSON.parse(readFileSync(includePath, "utf8"));
assert.equal(includeRegistry.registryId, profile.selectedOptions.m02.registryId);
assert.equal(includeRegistry.registryVersion, profile.selectedOptions.m02.registryVersion);
assert.equal(includeRegistry.rules.length, 32);
assert.equal(sha256File(includePath), profile.selectedOptions.m02.sha256);
assert.equal(includeRegistry.authority.soleGrammarAuthorityWhenSelected, true);
assert.equal(includeRegistry.authority.directInsertionAndStructuredRecognizersGeneratedFromThisAstOnly, true);
assert.equal(includeRegistry.authority.ownerApproved, false);
assert.equal(includeRegistry.authority.correctedDesign, false);
assert.equal(includeRegistry.authority.implementationAuthorized, false);
assert.equal(includeRegistry.structuredRecognizerIds.length, 9);
assert.equal(includeRegistry.gapSetDefinitions["invalid-control-set-v1"][0], "union");

const deepSeekRules = includeRegistry.rules.filter((rule) =>
  [
    "value.provider-selected-model-prefix.v1",
    "value.provider-selected-name.lexical.v2_1",
  ].includes(rule.ruleId),
);
assert.equal(deepSeekRules.length, 2);
assert.deepEqual(deepSeekRules[0].insertion.gapSetAst, deepSeekRules[1].insertion.gapSetAst);
assert.equal(deepSeekRules[0].insertion.maximumCodePointsPerGap, 4);
assert.equal(deepSeekRules[0].insertion.maximumInsertedCodePointsPerMatchedCandidate, 64);
assert.ok(JSON.stringify(deepSeekRules[0].insertion.gapSetAst).includes("Default_Ignorable_Code_Point"));
assert.ok(JSON.stringify(deepSeekRules[0].insertion.gapSetAst).includes("Mark"));
assert.ok(JSON.stringify(deepSeekRules[0].insertion.gapSetAst).includes("U+000A"));
assert.ok(!JSON.stringify(deepSeekRules[0].insertion.gapSetAst).includes("Punctuation"));
assert.ok(!JSON.stringify(deepSeekRules[0].insertion.gapSetAst).includes("Separator"));
assert.ok(!JSON.stringify(deepSeekRules[0].insertion.gapSetAst).includes("White_Space"));
pass("M02 selected INCLUDE registry=32 rules, exact two DeepSeek rules and inline narrow gaps");

const challengePath = repositoryPath(
  "docs/review-evidence/phase-1b-stage4a-phase-b-three-strike-technical-escalation-independent-rereview-v1/REVIEWER_TECH_M01_TRANSITION_CHALLENGE_V1_0.mjs",
);
const challenge = run(process.execPath, [challengePath]);
assert.equal(challenge.status, 0, `${challenge.stdout}\n${challenge.stderr}`);
assert.match(challenge.stdout, /SUMMARY TECH_M01_FRESH_TRANSITION_CHALLENGE=PASS/u);
assert.match(challenge.stdout, /visible separators excluded; DICP\/Mark\/LF admitted/u);
assert.match(challenge.stdout, /total transition counter synthetic=64 match \/ 65 unsupported_value/u);
assert.match(challenge.stdout, /full Unicode property predicates enumerated/u);
assert.match(challenge.stdout, /legacy LF\/U\+034F\/U\+200B shortcut/u);
pass("M02 independent full transition graph, Unicode properties, counters, persisted bytes and legacy-shortcut negative");

const runtimeNegative = run(process.execPath, [fileURLToPath(import.meta.url)], {
  env: {
    ...process.env,
    CWT_CORRECTED_DESIGN_EXPECTED_NODE: "0.0.0-runtime-mismatch",
    CWT_CORRECTED_DESIGN_RUNTIME_NEGATIVE_CHILD: "1",
  },
});
assert.notEqual(runtimeNegative.status, 0);
assert.match(`${runtimeNegative.stdout}\n${runtimeNegative.stderr}`, /runtime node/u);
pass("Unicode runtime tuple mismatch fails before Candidate acceptance");

const m03Path = repositoryPath(profile.selectedOptions.m03.path);
const m03 = JSON.parse(readFileSync(m03Path, "utf8"));
assert.equal(sha256File(m03Path), profile.selectedOptions.m03.sha256);
assert.equal(m03.authority.ownerApproved, false);
assert.equal(m03.authority.correctedDesign, false);
assert.equal(m03.authority.implementationAuthorized, false);
assert.equal(m03.classificationModel.rootClasses.length, 12);
assert.equal(m03.outerCompositionRoots[0].path, "src/server/ai/phase-b-composition.ts");
assert.equal(m03.outerCompositionRoots[0].exactAllowedImports.length, 5);
assert.deepEqual(m03.outerCompositionRoots[0].typeSafetyCounts.explicitDriverCases, [
  "pglite",
  "postgres",
]);
assert.equal(m03.outerCompositionRoots[0].typeSafetyCounts.protectedFactoryCallSites, 2);
assert.equal(m03.outerCompositionRoots[0].typeSafetyCounts.protectedFactoryRuntimeCallsPerInvocation, 1);
assert.equal(m03.outerCompositionRoots[1].phaseBPresence.maximumFiles, 0);
assert.equal(m03.adapterZone.phaseBExpectedPresence.maximumFiles, 0);
assert.equal(m03.actualDatabaseTypeBoundary.exactShapes.databaseProjection.includes(" | "), true);
assert.equal(m03.unsupportedSyntaxFailClosed.noWholeLanguageDataflowClaim.length > 0, true);
pass("M03 12-class graph, five-edge outer root, two branches and Phase D/adapter absences");

const tscPath = repositoryPath("node_modules/.bin/tsc");
assert.ok(existsSync(tscPath));
const positive = run(tscPath, ["-p", resolve(here, "tsconfig.m03-positive.json")]);
assert.equal(positive.status, 0, `${positive.stdout}\n${positive.stderr}`);
const unionNegative = run(tscPath, ["-p", resolve(here, "tsconfig.m03-union-negative.json")]);
assert.notEqual(unionNegative.status, 0);
assert.match(`${unionNegative.stdout}\n${unionNegative.stderr}`, /TS2375/u);
const crossDriverNegative = run(tscPath, ["-p", resolve(here, "tsconfig.m03-cross-driver-negative.json")]);
assert.notEqual(crossDriverNegative.status, 0);
assert.match(`${crossDriverNegative.stdout}\n${crossDriverNegative.stderr}`, /TS2375/u);

const positiveSource = readFileSync(resolve(here, "M03_DISCRIMINATED_SEAM_POSITIVE_V1_0.ts"), "utf8");
for (const forbidden of [
  /\bas\s+(?:const|unknown|any|[A-Za-z_$])/u,
  /<[^>]+>\s*databaseConnection/u,
  /\bany\b/u,
  /\bunknown\b/u,
  /@ts-(?:ignore|expect-error)/u,
  /\b(?:Proxy|Reflect)\b/u,
]) {
  assert.ok(!forbidden.test(positiveSource), `positive probe forbidden escape: ${forbidden}`);
}
assert.equal((positiveSource.match(/case "(?:pglite|postgres)"/gu) ?? []).length, 2);
assert.equal((positiveSource.match(/createPhaseBAvailabilityServiceV1\(\{/gu) ?? []).length, 2);
pass("M03 strict TypeScript positive exit=0; union and cross-driver negatives=TS2375; no type escape");

function mappingFields(markdown, startHeading, endHeading) {
  const start = markdown.indexOf(startHeading);
  const end = markdown.indexOf(endHeading, start + startHeading.length);
  assert.ok(start >= 0 && end > start, `mapping section missing: ${startHeading}`);
  return [...markdown.slice(start, end).matchAll(/^\| `([^`]+)` \|/gmu)].map((match) => match[1]);
}

const v14 = readFileSync(
  repositoryPath("docs/PHASE_1B_STAGE4A_PHASE_B_PROVIDER_NEUTRAL_FOUNDATION_EXACT_DESIGN_V1_4.md"),
  "utf8",
);
const v15 = readFileSync(repositoryPath(profile.standaloneDesignPath), "utf8");
const v14Config = mappingFields(v14, "### 11.1 `ai_model_config`", "### 11.2 `ai_runs`");
const v15Config = mappingFields(v15, "### 11.1 `ai_model_config`", "### 11.2 `ai_runs`");
const v14Runs = mappingFields(v14, "### 11.2 `ai_runs`", "## 12. Prompt Registry");
const v15Runs = mappingFields(v15, "### 11.2 `ai_runs`", "## 12. Prompt Registry");
assert.equal(v15Config.length, profile.phaseAFieldMappings.aiModelConfigExpected);
assert.equal(v15Runs.length, profile.phaseAFieldMappings.aiRunsExpected);
assert.deepEqual(v15Config, v14Config);
assert.deepEqual(v15Runs, v14Runs);
pass("accepted 0020 mappings byte-order equivalent by field: ai_model_config 21/21, ai_runs 96/96");

assert.deepEqual(profile.preservedClosedContracts, [
  "H-01",
  "H-02",
  "M-01",
  "M-02",
  "M-03",
  "M-04",
  "M-05",
  "M-06",
  "L-01",
  "N-M01",
  "N-M02",
  "N-M03",
  "N-M04",
]);
assert.deepEqual(profile.derivation.retainedTopLevelSections, Array.from({ length: 26 }, (_, index) => index + 1));
assert.deepEqual(profile.derivation.replacedProofBoundaries.map((boundary) => boundary.id), [
  "M02-D1-INCLUDE",
  "M03-D1-DISCRIMINATED-SEAM",
]);
assert.equal(profile.derivation.standalone, true);
assert.equal(profile.derivation.failedImplementationsReused, false);
assert.equal(profile.derivation.compatibilityLayerAdded, false);
for (const contract of profile.preservedClosedContracts) {
  assert.ok(v15.includes(contract), `missing preserved contract: ${contract}`);
}
for (const section of [
  "### 2.2 M02 selected single grammar authority",
  "### 2.3 M03 selected actual-type and capability-containment seam",
  "### 2.4 Phase allocation after selection",
  "## 11. Exact `0020` field mapping",
  "## 23. Exact V1.5 design acceptance checklist",
]) {
  assert.ok(v15.includes(section), `missing V1.5 section: ${section}`);
}
pass("standalone V1.5 contract map complete and all 13 accepted finding closures preserved");

const changedTracked = git(["diff", "--name-only", fixed.branchParent, "HEAD"])
  .split("\n")
  .filter(Boolean);
const changedUntracked = git(["ls-files", "--others", "--exclude-standard"])
  .split("\n")
  .filter(Boolean);
const candidatePaths = [...new Set([...changedTracked, ...changedUntracked])].sort();
assert.ok(candidatePaths.length > 0);
for (const path of candidatePaths) {
  assert.ok(path.startsWith("docs/"), `non-doc Candidate path: ${path}`);
  assert.ok(!path.startsWith("docs/adr/"), `ADR changed: ${path}`);
  assert.notEqual(path, "docs/PHASE_1B_STAGE4A_PHASE_B_PROVIDER_NEUTRAL_FOUNDATION_EXACT_DESIGN_V1_4.md");
  assert.notEqual(path, "docs/PHASE_1B_STAGE4A_PHASE_B_THREE_STRIKE_TECHNICAL_ESCALATION_V1_1.md");
}
pass(`Candidate scope docs/evidence only paths=${candidatePaths.length}`);

const immutableImportedPrefixes = [
  "docs/PHASE_1B_STAGE4A_PHASE_B_THREE_STRIKE_TECHNICAL_ESCALATION_INDEPENDENT_REREVIEW_V1_0.md",
  "docs/review-evidence/phase-1b-stage4a-phase-b-three-strike-technical-escalation-independent-rereview-v1/",
];
const ownedPaths = candidatePaths.filter(
  (path) => !immutableImportedPrefixes.some((prefix) => path === prefix || path.startsWith(prefix)),
);

for (const path of ownedPaths) {
  const absolute = repositoryPath(path);
  if (!existsSync(absolute) || !statSync(absolute).isFile()) continue;
  const bytes = readFileSync(absolute);
  assert.equal(bytes.at(-1), 0x0a, `missing final LF: ${path}`);
  assert.notEqual(bytes.at(-2), 0x0a, `extra blank line at EOF: ${path}`);
  const text = bytes.toString("utf8");
  assert.ok(!/[ \t]+$/gmu.test(text), `owned trailing whitespace: ${path}`);
  if ([".md", ".mjs", ".ts", ".json", ".txt"].includes(extname(path))) {
    const fences = text.split("\n").filter((line) => line.startsWith("```")).length;
    if (extname(path) === ".md") assert.equal(fences % 2, 0, `unbalanced fence: ${path}`);
  }
}

for (const path of ownedPaths.filter((candidate) => candidate.endsWith(".md"))) {
  const absolute = repositoryPath(path);
  const markdown = readFileSync(absolute, "utf8");
  for (const match of markdown.matchAll(/\[[^\]]+\]\(([^)]+)\)/gu)) {
    const link = match[1];
    if (/^(?:https?:|#)/u.test(link)) continue;
    const target = link.split("#", 1)[0];
    assert.ok(existsSync(resolve(dirname(absolute), target)), `broken link ${path} -> ${link}`);
  }
}
pass("owned Markdown links/fences/final-LF/whitespace valid; imported Reviewer bytes excluded only from owned whitespace claim");

assert.deepEqual(profile.impact, {
  schemaMigration: "none",
  adr: "none",
  dependencyPackageLock: "none",
  newPersistentCoordination: "none",
  seoUrlRedirect: "none",
  dataReconciliation: "none",
});
pass("Schema/Migration/ADR/dependency/persistent-complexity/SEO/data impact remains none");

output.push(
  "SUMMARY CORRECTED_EXACT_DESIGN_V1_5=PASS OWNER_SELECTIONS=INCORPORATED CANDIDATE_ONLY=TRUE IMPLEMENTATION_AUTHORIZED=FALSE",
);
process.stdout.write(`${output.join("\n")}\n`);
