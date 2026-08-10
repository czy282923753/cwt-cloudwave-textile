import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { extname, resolve } from "node:path";
import { spawnSync } from "node:child_process";

const repositoryRoot = resolve(import.meta.dirname, "../../..");
const profilePath = resolve(
  repositoryRoot,
  "docs/review-evidence/phase-1b-stage4a-phase-b-three-strike-technical-escalation-v1/M03_CAPABILITY_GRAPH_AND_DATABASE_SEAM_PROFILE_V2_0.json",
);
const profile = JSON.parse(readFileSync(profilePath, "utf8"));
const enumeration = profile.filesystemEnumeration;
const model = profile.classificationModel;

const git = spawnSync("git", ["ls-tree", "-r", "--name-only", "HEAD"], {
  cwd: repositoryRoot,
  encoding: "utf8",
});
assert.equal(git.status, 0, git.stderr);

const executable = new Set(enumeration.executableExtensions);
const protectedResources = new Set(enumeration.protectedResourceExtensions);
const excludedRoots = enumeration.excludedPhysicalRoots;
const testSuffixes = enumeration.testSuffixes;
const exactFiles = new Map();
const directories = [];
for (const rootClass of model.rootClasses) {
  for (const file of rootClass.match.files) {
    const entries = exactFiles.get(file) ?? [];
    entries.push(rootClass.id);
    exactFiles.set(file, entries);
  }
  for (const directory of rootClass.match.directories) {
    directories.push({ id: rootClass.id, directory });
  }
}

function isCandidate(path) {
  if (excludedRoots.some((root) => path.startsWith(root))) return false;
  if (executable.has(extname(path))) return true;
  if (enumeration.rootControlFiles.includes(path)) return true;
  return protectedResources.has(extname(path)) &&
    enumeration.protectedResourceRoots.some((root) => path.startsWith(root));
}

function classify(path) {
  // Give the profile its most generous stated precedence: a declared test suffix
  // is treated as other test fixture even though that suffix is not encoded in
  // a root-class match object.
  if (testSuffixes.some((suffix) => path.endsWith(suffix))) return ["other-test-fixtures"];
  const exact = exactFiles.get(path);
  if (exact) return exact;
  const matches = directories
    .filter(({ directory }) => path.startsWith(directory))
    .sort((left, right) => right.directory.length - left.directory.length);
  if (matches.length === 0) return [];
  const longest = matches[0].directory.length;
  return [...new Set(matches.filter(({ directory }) => directory.length === longest).map(({ id }) => id))];
}

const paths = git.stdout.trimEnd().split("\n").filter(Boolean).filter(isCandidate);
const unclassified = paths.filter((path) => classify(path).length === 0);
const ambiguous = paths.filter((path) => classify(path).length > 1);

assert.deepEqual(ambiguous, []);
assert.deepEqual(unclassified, [
  "drizzle.config.ts",
  "playwright.config.ts",
  "tests/e2e/global-teardown.ts",
  "tests/e2e/product-import.spec.ts",
  "tests/e2e/public.spec.ts",
  "vitest.config.mts",
]);

console.log(`CANDIDATE_EXECUTABLE_OR_PROTECTED_RESOURCE_NODES=${paths.length}`);
console.log(`ROOT_CLASSES=${model.rootClasses.length}`);
console.log(`UNCLASSIFIED_COUNT=${unclassified.length}`);
for (const path of unclassified) console.log(`UNCLASSIFIED ${path}`);
console.log("SUMMARY M03_GRAPH_ENUMERATION_CHALLENGE=EXPECTED_DESIGN_DEFECT_REPRODUCED");
