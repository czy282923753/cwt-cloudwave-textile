import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  existsSync,
  linkSync,
  lstatSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  realpathSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { extname, join, relative, resolve, sep } from "node:path";
import { createRequire } from "node:module";
import { spawnSync } from "node:child_process";

const targetRoot = resolve(process.argv[2] ?? ".");
const evidenceRelative = "docs/review-evidence/phase-1b-stage4a-phase-b-corrected-design-v1-6-remediation-v1";
const profilePath = join(targetRoot, evidenceRelative, "M03_CAPABILITY_GRAPH_AND_DATABASE_SEAM_PROFILE_V2_1.json");
const profile = JSON.parse(readFileSync(profilePath, "utf8"));

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function canonicalJson(value) {
  if (value === null || typeof value === "boolean" || typeof value === "number" || typeof value === "string") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(",")}}`;
}

function runGit(args) {
  const result = spawnSync("git", args, { cwd: targetRoot, encoding: "utf8" });
  assert.equal(result.status, 0, `${args.join(" ")}\n${result.stdout}\n${result.stderr}`);
  return result.stdout;
}

function parseNul(value) {
  return new Set(value.split("\0").filter(Boolean));
}

const expectedExecutableExtensions = [".ts", ".tsx", ".mts", ".cts", ".js", ".jsx", ".mjs", ".cjs"];
const expectedProtectedResourceExtensions = [".json", ".md"];
const expectedRootControlFiles = [
  "package.json",
  "pnpm-lock.yaml",
  "tsconfig.json",
  "next.config.ts",
  "eslint.config.mjs",
  "postcss.config.mjs",
  "drizzle.config.ts",
  "playwright.config.ts",
  "vitest.config.mts",
];
const expectedExcludedRoots = [
  ".git/",
  "node_modules/",
  ".next/",
  "coverage/",
  "playwright-report/",
  "test-results/",
  ".data/",
  ".storage/",
  "dist/",
  "build/",
  "tmp/",
];

assert.deepEqual(profile.filesystemEnumeration.executableExtensions, expectedExecutableExtensions);
assert.deepEqual(profile.filesystemEnumeration.protectedResourceExtensions, expectedProtectedResourceExtensions);
assert.deepEqual(profile.filesystemEnumeration.rootControlFiles, expectedRootControlFiles);
assert.deepEqual(profile.filesystemEnumeration.excludedPhysicalRoots, expectedExcludedRoots);
assert.equal(profile.classificationModel.rootClasses.length, 12);

const executableExtensions = new Set(expectedExecutableExtensions);
const resourceExtensions = new Set(expectedProtectedResourceExtensions);
const rootControls = new Set(expectedRootControlFiles);
const excludedRootNames = new Set(expectedExcludedRoots.map((value) => value.slice(0, -1)));
const tracked = parseNul(runGit(["ls-files", "-z"]));
const untracked = parseNul(runGit(["ls-files", "--others", "--exclude-standard", "-z"]));
const targetRealRoot = realpathSync.native(targetRoot);
const inodeOwners = new Map();

function normalizeRepositoryPath(absolute) {
  const canonical = realpathSync.native(absolute);
  assert.ok(canonical === targetRealRoot || canonical.startsWith(`${targetRealRoot}${sep}`), canonical);
  return relative(targetRealRoot, canonical).split(sep).join("/");
}

function hasPrefix(path, prefix) {
  return path.startsWith(prefix);
}

function isTestSemantic(path) {
  return profile.filesystemEnumeration.testDirectoryRoots.some((root) => hasPrefix(path, root)) ||
    profile.filesystemEnumeration.testSuffixes.some((suffix) => path.endsWith(suffix));
}

function isProtectedResource(path) {
  return resourceExtensions.has(extname(path)) &&
    profile.filesystemEnumeration.protectedResourceRoots.some((root) => hasPrefix(path, root));
}

function isCandidate(path) {
  return executableExtensions.has(extname(path)) || rootControls.has(path) || isProtectedResource(path);
}

function matches(path, rootClass) {
  const rule = rootClass.match;
  assert.deepEqual(
    Object.keys(rule).sort(),
    ["directories", "excludeDirectories", "excludeFiles", "excludeTestSemantic", "files", "testSemantic"].sort(),
  );
  const positive = rule.files.includes(path) ||
    rule.directories.some((directory) => hasPrefix(path, directory)) ||
    (rule.testSemantic && isTestSemantic(path));
  const negative = rule.excludeFiles.includes(path) ||
    rule.excludeDirectories.some((directory) => hasPrefix(path, directory)) ||
    (rule.excludeTestSemantic && isTestSemantic(path));
  return positive && !negative;
}

function classify(path, candidateProfile = profile) {
  return candidateProfile.classificationModel.rootClasses
    .filter((rootClass) => matches(path, rootClass))
    .map((rootClass) => rootClass.id);
}

function decodePointer(root, pointer) {
  return pointer.split("/").slice(1).reduce(
    (value, token) => value[token.replaceAll("~1", "/").replaceAll("~0", "~")],
    root,
  );
}

function profileIntegrity(candidateProfile) {
  const payload = candidateProfile.profileIntegrity.coveredJsonPointers.map((pointer) => ({
    pointer,
    value: decodePointer(candidateProfile, pointer),
  }));
  return sha256(Buffer.from(canonicalJson(payload), "utf8"));
}

const inventory = [];
const excludedRoots = [];
function walk(absoluteDirectory, relativeDirectory = "") {
  const entries = readdirSync(absoluteDirectory, { withFileTypes: true })
    .sort((left, right) => left.name < right.name ? -1 : left.name > right.name ? 1 : 0);
  for (const entry of entries) {
    const path = relativeDirectory ? `${relativeDirectory}/${entry.name}` : entry.name;
    const absolute = join(absoluteDirectory, entry.name);
    const stat = lstatSync(absolute, { bigint: true });
    if (!relativeDirectory && excludedRootNames.has(entry.name)) {
      assert.equal(stat.isSymbolicLink(), false, `excluded symlink ${path}`);
      assert.ok(entry.name === ".git" ? stat.isDirectory() || stat.isFile() : stat.isDirectory(), `excluded type ${path}`);
      excludedRoots.push(path);
      continue;
    }
    assert.equal(stat.isSymbolicLink(), false, `non-excluded symlink ${path}`);
    if (stat.isDirectory()) {
      walk(absolute, path);
      continue;
    }
    assert.equal(stat.isFile(), true, `special node ${path}`);
    const inodeKey = `${stat.dev}:${stat.ino}`;
    assert.equal(inodeOwners.has(inodeKey), false, `hard-link ${inodeOwners.get(inodeKey)},${path}`);
    inodeOwners.set(inodeKey, path);
    const realpath = normalizeRepositoryPath(absolute);
    assert.equal(realpath, path, `canonical alias ${path}->${realpath}`);
    if (!isCandidate(path)) continue;
    const bytes = readFileSync(absolute);
    const sourceState = tracked.has(path) ? "tracked" : untracked.has(path) ? "untracked-not-ignored" : "untracked-ignored";
    const generated = profile.resourceAndGeneratedPolicy.generatedRoots.some((root) => hasPrefix(path, root)) ||
      profile.resourceAndGeneratedPolicy.generatedExecutableSuffixes.some((suffix) => path.endsWith(suffix));
    inventory.push({
      path,
      nodeKind: "regular_file",
      realpath,
      sourceState,
      contentSha256: sha256(bytes),
      isExecutable: executableExtensions.has(extname(path)),
      isProtectedResource: isProtectedResource(path),
      isRootControl: rootControls.has(path),
      isGenerated: generated,
      hardLinkAlias: false,
    });
  }
}
walk(targetRoot);
inventory.sort((left, right) => left.path < right.path ? -1 : left.path > right.path ? 1 : 0);

const classes = Object.fromEntries(profile.classificationModel.rootClasses.map(({ id }) => [id, []]));
const zero = [];
const ambiguous = [];
for (const item of inventory) {
  const classIds = classify(item.path);
  if (classIds.length === 0) zero.push(item.path);
  if (classIds.length > 1) ambiguous.push({ path: item.path, classIds });
  if (classIds.length === 1) classes[classIds[0]].push(item.path);
}
assert.deepEqual(zero, []);
assert.deepEqual(ambiguous, []);
assert.equal(inventory.length, 402);
assert.equal(inventory.filter(({ isExecutable }) => isExecutable).length, 362);

const inventorySha256 = sha256(Buffer.from(canonicalJson(inventory), "utf8"));
const contentSha256 = sha256(Buffer.from(
  `cwt-v16-content-v1\0${inventory.map(({ path, contentSha256: content }) => `${path}\0${content}\n`).join("")}`,
  "utf8",
));
const classificationSha256 = sha256(Buffer.from(
  `cwt-v16-classification-v1\0${inventory.map(({ path }) => {
    const rootClass = profile.classificationModel.rootClasses.find(({ id }) => id === classify(path)[0]);
    return `${path}\0${rootClass.id}\0${rootClass.stageStatus}\0${rootClass.bundleZones.join(",")}\n`;
  }).join("")}`,
  "utf8",
));
assert.equal(inventorySha256, "af98fecfd5963207855478301dea528dee220057ddb3abbb85379c81f8d49e5d");
assert.equal(contentSha256, "29a1c9d740ae99b491c57412d75c7d68f9f8f6f6fe73b246ea0e70b86030996a");
assert.equal(classificationSha256, "964fb51dad53c886ead8c5506a78cd59014b38fdb5239e3ab821612e150cda6e");
assert.equal(profileIntegrity(profile), profile.profileIntegrity.sha256);

const six = profile.classificationModel.v15M01ExistingPathDisposition;
for (const [path, expectedClass] of Object.entries(six)) assert.deepEqual(classify(path), [expectedClass]);
for (const item of inventory.filter(({ path }) => path.startsWith("src/test/"))) {
  assert.deepEqual(classify(item.path), ["other-test-fixtures"]);
}

// Reproduce the required selector mutations independently.
assert.deepEqual(classify("fresh-root-runner.ts"), []);
const overlap = structuredClone(profile);
overlap.classificationModel.rootClasses.find(({ id }) => id === "root-control-file").match.files.push("tests/e2e/public.spec.ts");
assert.deepEqual(classify("tests/e2e/public.spec.ts", overlap).sort(), ["other-test-fixtures", "root-control-file"]);
for (const [path, expectedClass] of Object.entries(six)) {
  const removed = structuredClone(profile);
  removed.classificationModel.rootClasses.find(({ id }) => id === expectedClass).match.excludeFiles.push(path);
  assert.deepEqual(classify(path, removed), [], path);
}
assert.deepEqual(classify("src/server/ai/phase-d-provider-composition.ts"), ["phase-d-outer-composition-reserved"]);
assert.deepEqual(classify("src/integrations/ai/providers/deepseek.ts"), ["future-provider-adapter-zone-reserved"]);
assert.deepEqual(classify("src/server/ai/second-composition.ts"), ["other-production-src"]);
assert.deepEqual(classify("src/ai/prompts/generated/unlisted.generated.ts"), ["protected-ai"]);
assert.equal(profile.resourceAndGeneratedPolicy.productionGeneratedFiles.includes("src/ai/prompts/generated/unlisted.generated.ts"), false);
const sealedExclusionMutation = structuredClone(profile);
sealedExclusionMutation.filesystemEnumeration.excludedPhysicalRoots.push("tests/");
assert.notEqual(profileIntegrity(sealedExclusionMutation), profile.profileIntegrity.sha256);
const silentlyExcluded = inventory.filter(({ path }) => !path.startsWith("tests/"));
for (const requiredPath of Object.keys(six).filter((path) => path.startsWith("tests/"))) {
  assert.equal(silentlyExcluded.some(({ path }) => path === requiredPath), false);
}

const physicalMutationRoot = mkdtempSync(join(tmpdir(), "cwt-v16-physical-"));
try {
  writeFileSync(join(physicalMutationRoot, "target.ts"), "export {};\n");
  symlinkSync("target.ts", join(physicalMutationRoot, "alias.ts"));
  assert.equal(lstatSync(join(physicalMutationRoot, "alias.ts")).isSymbolicLink(), true);
  linkSync(join(physicalMutationRoot, "target.ts"), join(physicalMutationRoot, "hard.ts"));
  const targetStat = lstatSync(join(physicalMutationRoot, "target.ts"), { bigint: true });
  const hardStat = lstatSync(join(physicalMutationRoot, "hard.ts"), { bigint: true });
  assert.equal(`${targetStat.dev}:${targetStat.ino}`, `${hardStat.dev}:${hardStat.ino}`);
} finally {
  rmSync(physicalMutationRoot, { recursive: true, force: true });
}

function localTarget(from, specifier) {
  if (specifier.startsWith("@/")) return `src/${specifier.slice(2)}`;
  if (!specifier.startsWith(".")) return null;
  return resolve("/", from.slice(0, from.lastIndexOf("/")), specifier).slice(1);
}
const aliasTarget = localTarget("tests/e2e/fresh.spec.ts", "@/server/ai/phase-b-composition");
assert.equal(aliasTarget, "src/server/ai/phase-b-composition");
assert.equal(profile.testAndRootControlPolicy.forbiddenLocalTargetsAllTestAndControl.some((root) => aliasTarget.startsWith(root)), true);

// Fresh equivalence/boundary challenges not named by the Candidate.
assert.deepEqual(classify("src/test/nested/new-boundary.spec.ts"), ["other-test-fixtures"]);
assert.deepEqual(classify("src/testing/new-boundary.ts"), ["other-production-src"]);
assert.deepEqual(classify("docs/review-evidence/fresh/new-boundary.test.mjs"), ["other-test-fixtures"]);
assert.deepEqual(classify("rollup.config.ts"), []);
assert.deepEqual(classify("tools/node_modules/hidden-runner.ts"), []);

// The normal, already-declared Next TypeScript setup produces an ignored root
// executable that the purported complete selector has no class for.
const nextEnv = "next-env.d.ts";
assert.equal(isCandidate(nextEnv), true);
assert.deepEqual(classify(nextEnv), []);
assert.match(readFileSync(join(targetRoot, ".gitignore"), "utf8"), /^next-env\.d\.ts$/mu);
const tsconfig = JSON.parse(readFileSync(join(targetRoot, "tsconfig.json"), "utf8"));
assert.equal(tsconfig.include.includes(nextEnv), true);

const requireFromTarget = createRequire(join(targetRoot, "package.json"));
const nextWriterPath = requireFromTarget.resolve("next/dist/lib/typescript/writeAppTypeDeclarations");
const nextWriterSource = readFileSync(nextWriterPath, "utf8");
assert.match(nextWriterSource, /join\(baseDir, 'next-env\.d\.ts'\)/u);
assert.match(nextWriterSource, /promises\.writeFile\(appTypeDeclarations, content\)/u);
const nextBuildSource = readFileSync(requireFromTarget.resolve("next/dist/build/index"), "utf8");
assert.match(nextBuildSource, /startTypeChecking/u);
const nextTypeCheckSource = readFileSync(requireFromTarget.resolve("next/dist/build/type-check"), "utf8");
assert.match(nextTypeCheckSource, /verifyAndRunTypeScript/u);

const probeDirectory = mkdtempSync(join(tmpdir(), "cwt-v16-next-env-"));
try {
  const { writeAppTypeDeclarations } = requireFromTarget("next/dist/lib/typescript/writeAppTypeDeclarations");
  await writeAppTypeDeclarations({
    baseDir: probeDirectory,
    distDir: ".next",
    imageImportsEnabled: true,
    hasPagesDir: false,
    hasAppDir: true,
    strictRouteTypes: false,
    typedRoutes: false,
  });
  assert.equal(existsSync(join(probeDirectory, nextEnv)), true);
  assert.match(readFileSync(join(probeDirectory, nextEnv), "utf8"), /reference types="next"/u);
} finally {
  rmSync(probeDirectory, { recursive: true, force: true });
}

console.log(`CURRENT_TREE candidates=${inventory.length} executables=${inventory.filter(({ isExecutable }) => isExecutable).length} zero=${zero.length} ambiguous=${ambiguous.length}`);
console.log(`HASHES inventory=${inventorySha256} content=${contentSha256} classification=${classificationSha256}`);
console.log(`CLASSES ${Object.entries(classes).map(([id, members]) => `${id}:${members.length}`).join(" ")}`);
console.log(`SIX_PATHS ${Object.entries(six).map(([path, expectedClass]) => `${path}=>${expectedClass}`).join(" | ")}`);
console.log("AUTHOR_MUTATIONS classification-removal/overlap/generated/phase-d/adapter/second-root=EXPECTED_FAIL_CLOSED");
console.log("PHYSICAL_AND_SEALED_MUTATIONS symlink/hardlink/alias-import/silent-exclusion/sealed-exclusion=EXPECTED_FAIL_CLOSED");
console.log("FRESH_BOUNDARIES nested-test=one-class src-testing=production docs-test=test-only unknown-root-config=unclassified nested-node-modules=unclassified");
console.log("FINDING next-env.d.ts=candidate+ignored+tsconfig-included+Next-build-generated+zero-class");
console.log("SUMMARY REVIEWER_V16_ACTUAL_TREE_AND_SELECTOR_CHALLENGE=FINDING_REPRODUCED V15_M01=OPEN");
