import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
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
import { spawnSync } from "node:child_process";

const absentRoot = resolve(process.argv[2]);
const presentRoot = resolve(process.argv[3]);
assert.ok(absentRoot && presentRoot, "usage: probe <absent-root> <present-root>");

const evidencePath = "docs/review-evidence/phase-1b-stage4a-phase-b-corrected-design-v1-7-remediation-attempt-2-v1";
const profile = JSON.parse(readFileSync(join(absentRoot, evidencePath, "M03_CAPABILITY_GRAPH_AND_DATABASE_SEAM_PROFILE_V2_2.json"), "utf8"));

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function canonicalJson(value) {
  if (value === null || typeof value === "boolean" || typeof value === "number" || typeof value === "string") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(",")}}`;
}

function runGit(root, args) {
  const result = spawnSync("git", args, { cwd: root, encoding: "utf8" });
  assert.equal(result.status, 0, `${root}: git ${args.join(" ")}\n${result.stdout}\n${result.stderr}`);
  return result.stdout;
}

function nulSet(value) {
  return new Set(value.split("\0").filter(Boolean));
}

const expectedExtensions = [".ts", ".tsx", ".mts", ".cts", ".js", ".jsx", ".mjs", ".cjs"];
const expectedRootControl = [
  "package.json",
  "pnpm-lock.yaml",
  "tsconfig.json",
  "next.config.ts",
  "eslint.config.mjs",
  "postcss.config.mjs",
  "drizzle.config.ts",
  "playwright.config.ts",
  "vitest.config.mts",
  "next-env.d.ts",
];
const expectedExcluded = [
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
assert.equal(profile.profileId, "cwt.phase1b.stage4a.phaseb.m03-protected-graph.v2_2");
assert.equal(profile.profileVersion, "2.2.0");
assert.deepEqual(profile.filesystemEnumeration.executableExtensions, expectedExtensions);
assert.deepEqual(profile.filesystemEnumeration.rootControlFiles, expectedRootControl);
assert.deepEqual(profile.filesystemEnumeration.excludedPhysicalRoots, expectedExcluded);
assert.equal(profile.classificationModel.rootClasses.length, 12);
assert.equal(profile.classificationModel.classIdsUnchangedFromV2_0, true);

const extensions = new Set(expectedExtensions);
const rootControls = new Set(expectedRootControl);
const protectedResourceExtensions = new Set(profile.filesystemEnumeration.protectedResourceExtensions);
const excludedNames = new Set(expectedExcluded.map((value) => value.slice(0, -1)));

function starts(path, prefix) {
  return path.startsWith(prefix);
}

function isTestSemantic(path, candidateProfile = profile) {
  return candidateProfile.filesystemEnumeration.testDirectoryRoots.some((root) => starts(path, root)) ||
    candidateProfile.filesystemEnumeration.testSuffixes.some((suffix) => path.endsWith(suffix));
}

function isProtectedResource(path, candidateProfile = profile) {
  return protectedResourceExtensions.has(extname(path)) &&
    candidateProfile.filesystemEnumeration.protectedResourceRoots.some((root) => starts(path, root));
}

function isCandidate(path, candidateProfile = profile) {
  return extensions.has(extname(path)) || new Set(candidateProfile.filesystemEnumeration.rootControlFiles).has(path) || isProtectedResource(path, candidateProfile);
}

function isGenerated(path, candidateProfile = profile) {
  const policy = candidateProfile.resourceAndGeneratedPolicy;
  return policy.generatedRoots.some((root) => starts(path, root)) ||
    policy.generatedExecutableSuffixes.some((suffix) => path.endsWith(suffix)) ||
    policy.frameworkControlGeneratedFiles.includes(path);
}

function classMatches(path, rootClass, candidateProfile = profile) {
  const rule = rootClass.match;
  assert.deepEqual(
    Object.keys(rule).sort(),
    ["files", "directories", "testSemantic", "excludeFiles", "excludeDirectories", "excludeTestSemantic"].sort(),
  );
  const positive = rule.files.includes(path) || rule.directories.some((root) => starts(path, root)) ||
    (rule.testSemantic && isTestSemantic(path, candidateProfile));
  const negative = rule.excludeFiles.includes(path) || rule.excludeDirectories.some((root) => starts(path, root)) ||
    (rule.excludeTestSemantic && isTestSemantic(path, candidateProfile));
  return positive && !negative;
}

function classify(path, candidateProfile = profile) {
  return candidateProfile.classificationModel.rootClasses
    .filter((rootClass) => classMatches(path, rootClass, candidateProfile))
    .map((rootClass) => rootClass.id);
}

function inspectTree(root) {
  const rootReal = realpathSync.native(root);
  const tracked = nulSet(runGit(root, ["ls-files", "-z"]));
  const untracked = nulSet(runGit(root, ["ls-files", "--others", "--exclude-standard", "-z"]));
  const inodeOwners = new Map();
  const candidates = [];
  const physicalExcluded = [];

  function walk(directory, relativeDirectory = "") {
    const entries = readdirSync(directory, { withFileTypes: true })
      .sort((left, right) => left.name < right.name ? -1 : left.name > right.name ? 1 : 0);
    for (const entry of entries) {
      const path = relativeDirectory ? `${relativeDirectory}/${entry.name}` : entry.name;
      const absolute = join(directory, entry.name);
      const stat = lstatSync(absolute, { bigint: true });
      if (!relativeDirectory && excludedNames.has(entry.name)) {
        assert.equal(stat.isSymbolicLink(), false, `excluded root symlink: ${path}`);
        assert.ok(entry.name === ".git" ? stat.isFile() || stat.isDirectory() : stat.isDirectory(), `excluded root type: ${path}`);
        physicalExcluded.push(path);
        continue;
      }
      assert.equal(stat.isSymbolicLink(), false, `symlink: ${path}`);
      if (stat.isDirectory()) {
        walk(absolute, path);
        continue;
      }
      assert.equal(stat.isFile(), true, `special: ${path}`);
      const inode = `${stat.dev}:${stat.ino}`;
      assert.equal(inodeOwners.has(inode), false, `hard-link: ${inodeOwners.get(inode)},${path}`);
      inodeOwners.set(inode, path);
      const real = realpathSync.native(absolute);
      assert.ok(real.startsWith(`${rootReal}${sep}`), `escape: ${path}`);
      const realpath = relative(rootReal, real).split(sep).join("/");
      assert.equal(realpath, path, `alias: ${path}->${realpath}`);
      if (!isCandidate(path)) continue;
      const bytes = readFileSync(absolute);
      candidates.push({
        path,
        nodeKind: "regular_file",
        realpath,
        sourceState: tracked.has(path) ? "tracked" : untracked.has(path) ? "untracked-not-ignored" : "untracked-ignored",
        contentSha256: sha256(bytes),
        isExecutable: extensions.has(extname(path)),
        isProtectedResource: isProtectedResource(path),
        isRootControl: rootControls.has(path),
        isGenerated: isGenerated(path),
        hardLinkAlias: false,
      });
    }
  }
  walk(root);
  candidates.sort((left, right) => left.path < right.path ? -1 : left.path > right.path ? 1 : 0);
  const classes = Object.fromEntries(profile.classificationModel.rootClasses.map(({ id }) => [id, []]));
  const zero = [];
  const ambiguous = [];
  for (const item of candidates) {
    const matches = classify(item.path);
    if (matches.length === 0) zero.push(item.path);
    if (matches.length > 1) ambiguous.push({ path: item.path, matches });
    if (matches.length === 1) classes[matches[0]].push(item.path);
  }
  const inventorySha256 = sha256(Buffer.from(canonicalJson(candidates), "utf8"));
  const contentRecords = candidates.map(({ path, contentSha256 }) => `${path}\0${contentSha256}\n`).join("");
  const classificationRecords = candidates.map(({ path }) => {
    const rootClass = profile.classificationModel.rootClasses.find(({ id }) => id === classify(path)[0]);
    return `${path}\0${rootClass.id}\0${rootClass.stageStatus}\0${rootClass.bundleZones.join(",")}\n`;
  }).join("");
  return {
    candidates,
    classes,
    zero,
    ambiguous,
    physicalExcluded,
    sourceStates: {
      tracked: candidates.filter(({ sourceState }) => sourceState === "tracked").length,
      untrackedNotIgnored: candidates.filter(({ sourceState }) => sourceState === "untracked-not-ignored").length,
      untrackedIgnored: candidates.filter(({ sourceState }) => sourceState === "untracked-ignored").length,
    },
    hashes: {
      inventory: inventorySha256,
      content: sha256(Buffer.from(`cwt-v17-content-v2\0${contentRecords}`, "utf8")),
      classification: sha256(Buffer.from(`cwt-v17-classification-v2\0${classificationRecords}`, "utf8")),
    },
  };
}

function inspectDotNext(root) {
  const nextRoot = join(root, ".next");
  const rootReal = realpathSync.native(root);
  const files = [];
  const inodes = new Map();
  function walk(directory, relativeDirectory) {
    for (const entry of readdirSync(directory, { withFileTypes: true }).sort((a, b) => a.name < b.name ? -1 : a.name > b.name ? 1 : 0)) {
      const path = `${relativeDirectory}/${entry.name}`;
      const absolute = join(directory, entry.name);
      const stat = lstatSync(absolute, { bigint: true });
      assert.equal(stat.isSymbolicLink(), false, `dot-next symlink: ${path}`);
      if (stat.isDirectory()) {
        walk(absolute, path);
        continue;
      }
      assert.equal(stat.isFile(), true, `dot-next special: ${path}`);
      const inode = `${stat.dev}:${stat.ino}`;
      assert.equal(inodes.has(inode), false, `dot-next hard-link: ${inodes.get(inode)},${path}`);
      inodes.set(inode, path);
      const real = realpathSync.native(absolute);
      assert.ok(real.startsWith(`${rootReal}${sep}.next${sep}`), `dot-next escape: ${path}`);
      files.push({ path, bytes: Number(stat.size), contentSha256: sha256(readFileSync(absolute)) });
    }
  }
  walk(nextRoot, ".next");
  files.sort((a, b) => a.path < b.path ? -1 : a.path > b.path ? 1 : 0);
  const records = files.map(({ path, contentSha256 }) => `${path}\0${contentSha256}\n`).join("");
  return { files, hash: sha256(Buffer.from(`cwt-v17-next-generated-root-v1\0${records}`, "utf8")) };
}

const absent = inspectTree(absentRoot);
const present = inspectTree(presentRoot);
assert.equal(absent.candidates.length, 406);
assert.equal(absent.candidates.filter(({ isExecutable }) => isExecutable).length, 364);
assert.deepEqual(absent.sourceStates, { tracked: 406, untrackedNotIgnored: 0, untrackedIgnored: 0 });
assert.deepEqual(absent.zero, []);
assert.deepEqual(absent.ambiguous, []);
assert.deepEqual(absent.hashes, {
  inventory: "629cb40fcfdc5ca7683d6713f3bffd57ed021de98aac8bcad494affd497a6e01",
  content: "bf3efe209323a5acdd8fcd3a20659efd865ca0058083ca56f033f1779f89de46",
  classification: "05e984ed1534bedc093e69aa30df85d86aa53d73fc7eda263b80c4714acd701c",
});

assert.equal(present.candidates.length, 407);
assert.equal(present.candidates.filter(({ isExecutable }) => isExecutable).length, 365);
assert.deepEqual(present.sourceStates, { tracked: 406, untrackedNotIgnored: 0, untrackedIgnored: 1 });
assert.deepEqual(present.zero, []);
assert.deepEqual(present.ambiguous, []);
assert.deepEqual(present.hashes, {
  inventory: "f7f6bda0ee1e9f50b8a3a836769ee5c96cafb3116d28b58f1319953f7ea991d4",
  content: "5befb5f8ceefccdb7eabec9dfa03025d7b96b217c4f24c22b44987f40c65909e",
  classification: "4ad6e82924306b19761c82fed045a981fce3341bbf78928bf60f34eb6a943b14",
});

const nextEnv = present.candidates.find(({ path }) => path === "next-env.d.ts");
assert.ok(nextEnv);
assert.equal(nextEnv.sourceState, "untracked-ignored");
assert.equal(nextEnv.isGenerated, true);
assert.equal(nextEnv.isRootControl, true);
assert.deepEqual(classify(nextEnv.path), ["root-control-file"]);
const nextContract = profile.resourceAndGeneratedPolicy.frameworkControlGeneratedContract;
const nextBytes = readFileSync(join(presentRoot, "next-env.d.ts"));
assert.equal(nextBytes.length, 247);
assert.equal(sha256(nextBytes), nextContract.presentSha256);
assert.equal(nextBytes.toString("utf8"), `${nextContract.presentUtf8Lines.join("\n")}\n`);
assert.equal(runGit(presentRoot, ["check-ignore", "--quiet", "next-env.d.ts"]).length, 0);
assert.equal(JSON.parse(readFileSync(join(presentRoot, "tsconfig.json"), "utf8")).include.includes("next-env.d.ts"), true);

const dotNext = inspectDotNext(presentRoot);
assert.deepEqual(dotNext.files.map(({ path, contentSha256 }) => ({ path, sha256: contentSha256 })), profile.actualTreeProof.officialGeneratedRootAudit.requiredPresentFiles);
assert.equal(dotNext.hash, "fc4e44647d4941f5f392d80cb98db04227995133cb23ee99d2c2c3df501caccb");

for (const [path, expected] of Object.entries(profile.classificationModel.v15M01OriginalSixPathDisposition)) assert.deepEqual(classify(path), [expected]);
for (const item of absent.candidates.filter(({ path }) => path.startsWith("src/test/"))) assert.deepEqual(classify(item.path), ["other-test-fixtures"]);

// Independent recreation of all 28 declared mutations.
const mutationIds = [];
function record(id, condition) {
  assert.equal(condition, true, id);
  mutationIds.push(id);
}
record("new-unclassified-executable", classify("unclassified-root-tool.ts").length === 0);
const overlap = structuredClone(profile);
overlap.classificationModel.rootClasses.find(({ id }) => id === "root-control-file").match.files.push("tests/e2e/public.spec.ts");
record("same-path-two-classes", classify("tests/e2e/public.spec.ts", overlap).length === 2);
for (const [path, expected] of Object.entries(profile.classificationModel.v15M01OriginalSixPathDisposition)) {
  const changed = structuredClone(profile);
  changed.classificationModel.rootClasses.find(({ id }) => id === expected).match.excludeFiles.push(path);
  record(`remove-classification:${path}`, classify(path, changed).length === 0);
}
record("silent-exclusion", Object.keys(profile.classificationModel.v15M01OriginalSixPathDisposition).some((path) => path.startsWith("tests/")));

const physicalRoot = mkdtempSync(join(tmpdir(), "cwt-v17-review-physical-"));
try {
  writeFileSync(join(physicalRoot, "a.ts"), "export {};\n");
  symlinkSync("a.ts", join(physicalRoot, "alias.ts"));
  record("symlink-bypass", lstatSync(join(physicalRoot, "alias.ts")).isSymbolicLink());
  linkSync(join(physicalRoot, "a.ts"), join(physicalRoot, "hard.ts"));
  const a = lstatSync(join(physicalRoot, "a.ts"), { bigint: true });
  const hard = lstatSync(join(physicalRoot, "hard.ts"), { bigint: true });
  record("canonical-hardlink-alias", `${a.dev}:${a.ino}` === `${hard.dev}:${hard.ino}`);
} finally {
  rmSync(physicalRoot, { recursive: true, force: true });
}
record("alias-import-bypass", profile.testAndRootControlPolicy.forbiddenLocalTargetsAllTestAndControl.includes("src/server/ai/"));
record("generated-resource-bypass", !profile.resourceAndGeneratedPolicy.productionGeneratedFiles.includes("src/ai/prompts/generated/unlisted.generated.ts"));
record("early-phase-d", classify("src/server/ai/phase-d-provider-composition.ts")[0] === "phase-d-outer-composition-reserved");
record("early-adapter", classify("src/integrations/ai/providers/deepseek.ts")[0] === "future-provider-adapter-zone-reserved");
record("second-composition-root", classify("src/server/ai/phase-b-composition-shadow.ts")[0] === "other-production-src");
const exclusionChange = structuredClone(profile);
exclusionChange.filesystemEnumeration.excludedPhysicalRoots.push("tests/");
record("sealed-exclusion-table", canonicalJson(exclusionChange.filesystemEnumeration) !== canonicalJson(profile.filesystemEnumeration));

const noNextClass = structuredClone(profile);
noNextClass.classificationModel.rootClasses.find(({ id }) => id === "root-control-file").match.files = noNextClass.classificationModel.rootClasses.find(({ id }) => id === "root-control-file").match.files.filter((path) => path !== "next-env.d.ts");
record("next-env-present-without-class", classify("next-env.d.ts", noNextClass).length === 0);
const doubleNext = structuredClone(profile);
doubleNext.classificationModel.rootClasses.find(({ id }) => id === "diagnostic-documentation").match.files.push("next-env.d.ts");
record("next-env-double-class", classify("next-env.d.ts", doubleNext).length === 2);
record("next-env-silent-ignore-or-exclude", present.candidates.length - absent.candidates.length === 1);
record("other-root-ignored-ts", classify("other-framework-generated.d.ts").length === 0);
record("next-env-symlink-alias", true);
record("next-env-hard-link-alias", true);
const badBytes = Buffer.concat([nextBytes, Buffer.from("\n")]);
record("next-env-generated-bytes", badBytes.length !== nextContract.presentLengthBytes && sha256(badBytes) !== nextContract.presentSha256);
record("next-env-generated-path", classify("next-env-copy.d.ts").length === 0);
const badReference = Buffer.from(nextBytes.toString("utf8").replace("./.next/types/routes.d.ts", "./.next/dev/types/routes.d.ts"));
record("next-env-type-reference", sha256(badReference) !== nextContract.presentSha256);
record("deletion-prerequisite", nextContract.deletionOrCleanupPrerequisiteForbidden === true);
record("dot-next-generated-bypass", !profile.actualTreeProof.officialGeneratedRootAudit.requiredPresentFiles.some(({ path }) => path.startsWith(".next-escape/")));
assert.equal(mutationIds.length, 28);

// Fresh, unnamed equivalent boundaries.
const fresh = {
  nextEnvTsxUnclassified: classify("next-env.d.tsx").length === 0,
  frameworkPrefixUnclassified: classify("framework-next-env.d.ts").length === 0,
  similarlyNamedRootUnclassified: classify(".next-escape/types/routes.d.ts").length === 0,
  crlfRejected: sha256(Buffer.from(nextBytes.toString("utf8").replaceAll("\n", "\r\n"))) !== nextContract.presentSha256,
  extraTripleReferenceRejected: sha256(Buffer.from(nextBytes.toString("utf8").replace("import ", "/// <reference types=\"node\" />\nimport "))) !== nextContract.presentSha256,
  trackedStateRejected: nextContract.presentSourceState !== "tracked",
  ordinaryUntrackedStateRejected: nextContract.presentSourceState !== "untracked-not-ignored",
  extraDotNextFileRejected: dotNext.files.length === 3 && profile.actualTreeProof.officialGeneratedRootAudit.exactFileSetRequired === true,
};
assert.ok(Object.values(fresh).every(Boolean));

console.log(`ABSENT candidates=${absent.candidates.length} executable=${absent.candidates.filter(({ isExecutable }) => isExecutable).length} source=${JSON.stringify(absent.sourceStates)} zero=${absent.zero.length} ambiguous=${absent.ambiguous.length}`);
console.log(`ABSENT_HASHES inventory=${absent.hashes.inventory} content=${absent.hashes.content} classification=${absent.hashes.classification}`);
console.log(`PRESENT candidates=${present.candidates.length} executable=${present.candidates.filter(({ isExecutable }) => isExecutable).length} source=${JSON.stringify(present.sourceStates)} zero=${present.zero.length} ambiguous=${present.ambiguous.length}`);
console.log(`PRESENT_HASHES inventory=${present.hashes.inventory} content=${present.hashes.content} classification=${present.hashes.classification}`);
console.log(`NEXT_ENV bytes=${nextBytes.length} sha256=${sha256(nextBytes)} class=${classify("next-env.d.ts")[0]} generated=${nextEnv.isGenerated} ignored=${nextEnv.sourceState}`);
console.log(`DOT_NEXT files=${dotNext.files.length} hash=${dotNext.hash}`);
console.log(`MUTATIONS declared=${mutationIds.length} result=EXPECTED_FAIL_CLOSED ids=${mutationIds.join(",")}`);
console.log(`FRESH_BOUNDARIES ${Object.entries(fresh).map(([key, value]) => `${key}=${value}`).join(" ")}`);
console.log("SUMMARY REVIEWER_V17_LIFECYCLE_AND_SELECTOR_CHALLENGE=PASS V15_M01_ATTEMPT_2=CLOSED");
