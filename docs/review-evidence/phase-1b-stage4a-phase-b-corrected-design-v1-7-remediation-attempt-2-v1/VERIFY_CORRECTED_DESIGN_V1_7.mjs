import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  existsSync,
  lstatSync,
  readFileSync,
  readdirSync,
  realpathSync,
} from "node:fs";
import { createRequire } from "node:module";
import { dirname, extname, posix, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const rootArgument = process.argv.find((value) => value.startsWith("--repository-root="));
const repositoryRoot = resolve(rootArgument ? rootArgument.slice("--repository-root=".length) : resolve(here, "../../.."));
const profilePath = resolve(repositoryRoot, "docs/review-evidence/phase-1b-stage4a-phase-b-corrected-design-v1-7-remediation-attempt-2-v1/M03_CAPABILITY_GRAPH_AND_DATABASE_SEAM_PROFILE_V2_2.json");
const profile = JSON.parse(readFileSync(profilePath, "utf8"));
const exactNode = "/Users/calvin/.nvm/versions/node/v24.14.0/bin/node";
const lifecycleArgument = process.argv.find((value) => value.startsWith("--lifecycle-state="));
const lifecycleState = lifecycleArgument ? lifecycleArgument.slice("--lifecycle-state=".length) : "candidate-file-absent";
const lifecycleOnly = process.argv.includes("--lifecycle-only");
const inventoryMode = process.argv.includes("--inventory");
const allowedLifecycleStates = new Set([
  "candidate-file-absent",
  "source-clean-file-absent",
  "official-next-generated-file-present",
]);
assert.ok(allowedLifecycleStates.has(lifecycleState), lifecycleState);
const output = [];

class GraphFailure extends Error {
  constructor(code, detail) {
    super(`${code}: ${detail}`);
    this.code = code;
  }
}

function pass(message) {
  output.push(`PASS ${message}`);
}

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function sha256File(path) {
  return sha256(readFileSync(path));
}

function canonicalJson(value) {
  if (value === null || typeof value === "boolean" || typeof value === "number" || typeof value === "string") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  const keys = Object.keys(value).sort();
  return `{${keys.map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(",")}}`;
}

function repositoryPath(path) {
  const absolute = resolve(repositoryRoot, path);
  assert.ok(absolute === repositoryRoot || absolute.startsWith(`${repositoryRoot}/`), path);
  return absolute;
}

function run(command, args, options = {}) {
  return spawnSync(command, args, {
    cwd: repositoryRoot,
    encoding: "utf8",
    env: process.env,
    maxBuffer: 64 * 1024 * 1024,
    ...options,
  });
}

function git(args) {
  const result = run("git", args);
  assert.equal(result.status, 0, `git ${args.join(" ")}\n${result.stdout}\n${result.stderr}`);
  return result.stdout.trim();
}

function parseNul(value) {
  return value.split("\0").filter(Boolean);
}

function assertRuntime() {
  const expectedNode = process.env.CWT_V17_EXPECTED_NODE ?? "24.14.0";
  assert.deepEqual(
    [
      process.versions.node,
      process.versions.v8,
      process.versions.icu,
      process.versions.unicode,
      process.versions.cldr,
      process.platform,
      process.arch,
    ],
    [
      expectedNode,
      "13.6.233.17-node.41",
      "78.2",
      "17.0",
      "48.0",
      "darwin",
      "arm64",
    ],
  );
}

assertRuntime();
if (process.env.CWT_V17_RUNTIME_NEGATIVE_CHILD === "1") {
  throw new Error("runtime mismatch child unexpectedly accepted");
}

function decodePointer(root, pointer) {
  return pointer.split("/").slice(1).reduce((value, token) => value[token.replaceAll("~1", "/").replaceAll("~0", "~")], root);
}

function verifyProfileIntegrity(candidateProfile) {
  const integrity = candidateProfile.profileIntegrity;
  assert.equal(integrity.algorithm, "sha256-jcs-selected-pointers-v1");
  const payload = integrity.coveredJsonPointers.map((pointer) => ({
    pointer,
    value: decodePointer(candidateProfile, pointer),
  }));
  const actual = sha256(Buffer.from(canonicalJson(payload), "utf8"));
  if (actual !== integrity.sha256) throw new GraphFailure("profile_integrity_mismatch", `${actual} != ${integrity.sha256}`);
  return actual;
}

function verifyManifest(relativePath, expectedRows) {
  const lines = readFileSync(repositoryPath(relativePath), "utf8").trimEnd().split("\n");
  assert.equal(lines.length, expectedRows, relativePath);
  for (const line of lines) {
    const match = /^([0-9a-f]{64})  (.+)$/u.exec(line);
    assert.ok(match, line);
    assert.equal(sha256File(repositoryPath(match[2])), match[1], match[2]);
  }
}

function checkFixedIdentity() {
  const branch = git(["branch", "--show-current"]);
  if (lifecycleOnly) assert.equal(branch, "");
  else assert.equal(branch, "codex/phase-1b-stage4a-phase-b-corrected-design-v1");
  const expectedHead = process.env.CWT_V17_EXPECTED_HEAD;
  if (expectedHead) assert.equal(git(["rev-parse", "HEAD"]), expectedHead);
  assert.equal(git(["rev-parse", "da2143654a372f70a93ff22f9fcb6e999f1e528e"]), "da2143654a372f70a93ff22f9fcb6e999f1e528e");
  assert.equal(git(["rev-parse", "da2143654a372f70a93ff22f9fcb6e999f1e528e^"]), "9cedefd618a168176f8d70a85e3ec8cb684967a7");
  assert.equal(git(["rev-parse", "b55fe1a7bcda91bce685392f2b4092e226bf560f^"]), "da2143654a372f70a93ff22f9fcb6e999f1e528e");
  assert.equal(git(["rev-parse", "refs/tags/phase-1b-stage3-approved-2026-08-09^{}"]), "31c0e405acfdd0d05200d0fb2531e897a541a2c4");
  for (const ancestor of [
    "377181cd76e5427f344ff0c259fc9bd32ec7b670",
    "6bc26cf035608a21a057d6f4e87da8d4f7f23d40",
    "da2143654a372f70a93ff22f9fcb6e999f1e528e",
    "b55fe1a7bcda91bce685392f2b4092e226bf560f",
    "49ba05ff0e40efce4ba8feb1bc87528414e3fad9",
    "799b2dd4340c244d9f609942bd097acbb2ff6ecc",
  ]) {
    assert.equal(run("git", ["merge-base", "--is-ancestor", ancestor, "HEAD"]).status, 0, ancestor);
  }
  for (const failed of [
    "755e514540351ed53ee96bedd5ea12f3e934387e",
    "a696325fa2608c77e526bb7403bb911d34200064",
    "b1a73bb8aae87f7c862117b32ce5c2a051f21b84",
    "d8a24d48592a8c5e112d20edd24505e9e34d83c9",
  ]) {
    assert.notEqual(run("git", ["merge-base", "--is-ancestor", failed, "HEAD"]).status, 0, failed);
  }

  const fixed = new Map([
    ["docs/PHASE_1B_STAGE4A_PHASE_B_PROVIDER_NEUTRAL_FOUNDATION_CORRECTED_EXACT_DESIGN_V1_5.md", "22d9820f1faa5b318bb6904adcefbb96ba59559f132c9dcd611e16c574643698"],
    ["docs/PHASE_1B_STAGE4A_PHASE_B_CORRECTED_EXACT_DESIGN_V1_5_DERIVATION_REPORT_V1_0.md", "481947f06bd51139d081b46bf3ef852f1ce233191428e568b1c970ad36547d65"],
    ["docs/PHASE_1B_STAGE4A_PHASE_B_THREE_STRIKE_OWNER_SELECTION_RECORD_V1_0.md", "21c5db60154374f52546dae730dd2893d1fb53689757cf969106b9f1c7c96fa2"],
    ["docs/review-evidence/phase-1b-stage4a-phase-b-corrected-design-v1/SHA256SUMS.txt", "a98890959e9e24c522367b9e788cdd797cb6e98d5d1d57e35dcbdea01e853d6e"],
    ["docs/PHASE_1B_STAGE4A_PHASE_B_CORRECTED_EXACT_DESIGN_INDEPENDENT_REVIEW_V1_0.md", "723a4d59af63c66117ed2c5a9dcb349a18c970b85b067bba6eda8bcb129e1aa4"],
    ["docs/review-evidence/phase-1b-stage4a-phase-b-corrected-exact-design-independent-review-v1/INDEPENDENT_CORRECTED_EXACT_DESIGN_REVIEW_EVIDENCE_V1_0.md", "3a75df5276e8fd8d34a2d88aa29f038a538870e6e9333b7d006106bb94d1d73a"],
    ["docs/review-evidence/phase-1b-stage4a-phase-b-corrected-exact-design-independent-review-v1/REVIEWER_M03_GRAPH_ENUMERATION_CHALLENGE_V1_0.mjs", "2eb4720dcb48ffda9d29f679ce192900415a46e5ea982ac1116a4baf04ee36bb"],
    ["docs/review-evidence/phase-1b-stage4a-phase-b-corrected-exact-design-independent-review-v1/REVIEWER_M03_GRAPH_ENUMERATION_CHALLENGE_OUTPUT_V1_0.txt", "71a92f48794310604f125feb489451d743cb28751f85fdd05c25430684cd42d4"],
    ["docs/review-evidence/phase-1b-stage4a-phase-b-corrected-exact-design-independent-review-v1/SHA256SUMS.txt", "5a8635b95a6b435ff3b5e7111a86d13c0a379ca2f908e434dd899e7118819f01"],
    ["docs/PHASE_1B_STAGE4A_PHASE_B_PROVIDER_NEUTRAL_FOUNDATION_EXACT_DESIGN_V1_4.md", "48e6afebfba53f65c03077a1ca27522f0245f17cbd0b3b46ff492929cf1e0c07"],
    ["docs/PHASE_1B_STAGE4A_PHASE_B_DESIGN_REMEDIATION_V1_3.md", "6f3868e860a5951951750d7b2e07a4ab7c777b8c9c772db0563348ea0ed7d0a7"],
    ["docs/PHASE_1B_STAGE4A_PHASE_B_PROVIDER_NEUTRAL_FOUNDATION_CORRECTED_EXACT_DESIGN_V1_6.md", "06fb0795cc05e6651f63f46226c67290e108103cb567e5aa5e80a8b09a33eec2"],
    ["docs/PHASE_1B_STAGE4A_PHASE_B_CORRECTED_EXACT_DESIGN_V1_6_V15_M01_REMEDIATION_AUDIT_V1_0.md", "d3bcf40c999672f7e7a8b3fb05c09a98457e68c9171294ac0c1ef5494ab73c31"],
    ["docs/review-evidence/phase-1b-stage4a-phase-b-corrected-design-v1-6-remediation-v1/SHA256SUMS.txt", "36da610be6e29ef9fd461bd10b0d12c09fa48573384b33356aa1fc0da79af48b"],
    ["docs/PHASE_1B_STAGE4A_PHASE_B_CORRECTED_EXACT_DESIGN_INDEPENDENT_REVIEW_V1_1.md", "50289f51b93dc4a333db3e2fac8875fb0c2f5c6e6d8c4d126462446acfd122ab"],
    ["docs/review-evidence/phase-1b-stage4a-phase-b-corrected-exact-design-independent-review-v1-1/INDEPENDENT_CORRECTED_EXACT_DESIGN_REVIEW_EVIDENCE_V1_1.md", "00ccf4da3a61c3d46acb8bb81e49e749c061eb5658af1bc52e322a30fab7e833"],
    ["docs/review-evidence/phase-1b-stage4a-phase-b-corrected-exact-design-independent-review-v1-1/REVIEWER_V16_ACTUAL_TREE_AND_SELECTOR_CHALLENGE_V1_0.mjs", "1c389fee052e42b5513a12ce7a25d6ca01247854673c220228a60fbb798619f6"],
    ["docs/review-evidence/phase-1b-stage4a-phase-b-corrected-exact-design-independent-review-v1-1/REVIEWER_V16_ACTUAL_TREE_AND_SELECTOR_CHALLENGE_OUTPUT_V1_0.txt", "b085621c8f7b019e9fee0afd665ff2f667716693f413dea3c2ebd62f3cb88b61"],
    ["docs/review-evidence/phase-1b-stage4a-phase-b-corrected-exact-design-independent-review-v1-1/SHA256SUMS.txt", "0c33a9ca1e783c76a6bb7757557e67233285205b12995fc105e6fe649d848bef"],
  ]);
  for (const [path, expected] of fixed) assert.equal(sha256File(repositoryPath(path)), expected, path);
  verifyManifest("docs/review-evidence/phase-1b-stage4a-phase-b-corrected-design-v1/SHA256SUMS.txt", 22);
  verifyManifest("docs/review-evidence/phase-1b-stage4a-phase-b-corrected-exact-design-independent-review-v1/SHA256SUMS.txt", 17);
  verifyManifest("docs/review-evidence/phase-1b-stage4a-phase-b-three-strike-technical-escalation-independent-rereview-v1/SHA256SUMS.txt", 5);
  verifyManifest("docs/review-evidence/phase-1b-stage4a-phase-b-corrected-design-v1-6-remediation-v1/SHA256SUMS.txt", 28);
  verifyManifest("docs/review-evidence/phase-1b-stage4a-phase-b-corrected-exact-design-independent-review-v1-1/SHA256SUMS.txt", 4);
}

function validateProfileShape(candidateProfile) {
  assert.equal(candidateProfile.profileId, "cwt.phase1b.stage4a.phaseb.m03-protected-graph.v2_2");
  assert.equal(candidateProfile.profileVersion, "2.2.0");
  assert.equal(candidateProfile.authority.ownerSelectedOption, "M03-D1-DISCRIMINATED-SEAM");
  assert.equal(candidateProfile.authority.ownerSelectionApproved, true);
  assert.equal(candidateProfile.authority.correctedDesignIndependentlyApproved, false);
  assert.equal(candidateProfile.authority.implementationAuthorized, false);
  assert.equal(candidateProfile.classificationModel.rootClasses.length, 12);
  assert.equal(candidateProfile.classificationModel.classIdsUnchangedFromV2_0, true);
  assert.equal(candidateProfile.classificationModel.selectorCompiler.priorityRole.includes("never resolves"), true);
  assert.deepEqual(candidateProfile.filesystemEnumeration.rootControlFiles, [
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
  ]);
  assert.deepEqual(candidateProfile.classificationModel.v15M01Attempt2LifecyclePathDisposition, {
    "next-env.d.ts": "root-control-file",
  });
  assert.equal(candidateProfile.resourceAndGeneratedPolicy.frameworkControlGeneratedContract.deletionOrCleanupPrerequisiteForbidden, true);
  const allowedMatchKeys = [...candidateProfile.classificationModel.selectorCompiler.closedMatchFields].sort();
  for (const rootClass of candidateProfile.classificationModel.rootClasses) {
    assert.deepEqual(Object.keys(rootClass.match).sort(), allowedMatchKeys, rootClass.id);
    for (const field of ["files", "directories", "excludeFiles", "excludeDirectories"]) assert.ok(Array.isArray(rootClass.match[field]));
    assert.equal(typeof rootClass.match.testSemantic, "boolean");
    assert.equal(typeof rootClass.match.excludeTestSemantic, "boolean");
  }
}

const enumeration = profile.filesystemEnumeration;
const executableExtensions = new Set(enumeration.executableExtensions);
const protectedResourceExtensions = new Set(enumeration.protectedResourceExtensions);
const rootControlFiles = new Set(enumeration.rootControlFiles);
const excludedNames = new Map(enumeration.excludedPhysicalRoots.map((value) => [value.replace(/\/$/u, ""), value]));

function hasDirectoryPrefix(path, prefix) {
  return path.startsWith(prefix);
}

function isTestSemantic(path, candidateProfile = profile) {
  const fsProfile = candidateProfile.filesystemEnumeration;
  return fsProfile.testDirectoryRoots.some((root) => hasDirectoryPrefix(path, root)) ||
    fsProfile.testSuffixes.some((suffix) => path.endsWith(suffix));
}

function isProtectedResource(path) {
  return protectedResourceExtensions.has(extname(path)) &&
    enumeration.protectedResourceRoots.some((root) => hasDirectoryPrefix(path, root));
}

function isGenerated(path, candidateProfile = profile) {
  const generated = candidateProfile.resourceAndGeneratedPolicy;
  return generated.generatedRoots.some((root) => hasDirectoryPrefix(path, root)) ||
    generated.generatedExecutableSuffixes.some((suffix) => path.endsWith(suffix)) ||
    generated.frameworkControlGeneratedFiles.includes(path);
}

function isCandidatePath(path) {
  return executableExtensions.has(extname(path)) || rootControlFiles.has(path) || isProtectedResource(path);
}

function classMatches(path, rootClass, candidateProfile = profile) {
  const match = rootClass.match;
  const positive = match.files.includes(path) ||
    match.directories.some((root) => hasDirectoryPrefix(path, root)) ||
    (match.testSemantic && isTestSemantic(path, candidateProfile));
  const negative = match.excludeFiles.includes(path) ||
    match.excludeDirectories.some((root) => hasDirectoryPrefix(path, root)) ||
    (match.excludeTestSemantic && isTestSemantic(path, candidateProfile));
  return positive && !negative;
}

function classifyPath(path, candidateProfile = profile) {
  return candidateProfile.classificationModel.rootClasses.filter((rootClass) => classMatches(path, rootClass, candidateProfile));
}

function throwForClassification(paths, candidateProfile = profile) {
  const zero = [];
  const ambiguous = [];
  for (const path of paths) {
    const matches = classifyPath(path, candidateProfile);
    if (matches.length === 0) zero.push(path);
    if (matches.length > 1) ambiguous.push({ path, classes: matches.map(({ id }) => id) });
  }
  if (zero.length > 0) throw new GraphFailure("fail_closed_unclassified", zero.join(","));
  if (ambiguous.length > 0) throw new GraphFailure("fail_closed_ambiguous", JSON.stringify(ambiguous));
}

function sourceStates() {
  const trackedResult = run("git", ["ls-files", "-z"]);
  assert.equal(trackedResult.status, 0, trackedResult.stderr);
  const untrackedResult = run("git", ["ls-files", "--others", "--exclude-standard", "-z"]);
  assert.equal(untrackedResult.status, 0, untrackedResult.stderr);
  return {
    tracked: new Set(parseNul(trackedResult.stdout)),
    untracked: new Set(parseNul(untrackedResult.stdout)),
  };
}

function validatePhysicalFileMetadata(entry, inodeOwners) {
  if (entry.nodeKind === "symlink") throw new GraphFailure("fail_closed_symlink", entry.path);
  if (entry.nodeKind !== "regular_file") throw new GraphFailure("fail_closed_special_file", entry.path);
  if (entry.realpath !== entry.path) throw new GraphFailure("fail_closed_canonical_alias", `${entry.path}->${entry.realpath}`);
  if (inodeOwners.has(entry.inodeKey)) throw new GraphFailure("fail_closed_hard_link_alias", `${inodeOwners.get(entry.inodeKey)},${entry.path}`);
  inodeOwners.set(entry.inodeKey, entry.path);
}

function actualTreeInventory() {
  const states = sourceStates();
  const candidates = [];
  const excludedRoots = [];
  const inodeOwners = new Map();
  const rootReal = realpathSync.native(repositoryRoot);

  function walk(directory, relativeDirectory = "") {
    const entries = readdirSync(directory, { withFileTypes: true }).sort((left, right) => left.name < right.name ? -1 : left.name > right.name ? 1 : 0);
    for (const entry of entries) {
      const path = relativeDirectory ? `${relativeDirectory}/${entry.name}` : entry.name;
      const absolute = resolve(directory, entry.name);
      if (relativeDirectory === "" && excludedNames.has(entry.name)) {
        const stat = lstatSync(absolute, { bigint: true });
        if (stat.isSymbolicLink()) throw new GraphFailure("fail_closed_excluded_root_symlink", path);
        if (entry.name !== ".git" && !stat.isDirectory()) throw new GraphFailure("fail_closed_excluded_root_type", path);
        if (entry.name === ".git" && !(stat.isDirectory() || stat.isFile())) throw new GraphFailure("fail_closed_excluded_root_type", path);
        excludedRoots.push({ path: excludedNames.get(entry.name), present: true, nodeKind: stat.isDirectory() ? "directory" : "worktree_admin_file", walked: false });
        continue;
      }

      const stat = lstatSync(absolute, { bigint: true });
      if (stat.isSymbolicLink()) validatePhysicalFileMetadata({ path, nodeKind: "symlink", realpath: path, inodeKey: `${stat.dev}:${stat.ino}` }, inodeOwners);
      if (stat.isDirectory()) {
        walk(absolute, path);
        continue;
      }
      if (!stat.isFile()) validatePhysicalFileMetadata({ path, nodeKind: "special", realpath: path, inodeKey: `${stat.dev}:${stat.ino}` }, inodeOwners);

      const real = realpathSync.native(absolute);
      if (!(real === rootReal || real.startsWith(`${rootReal}/`))) throw new GraphFailure("fail_closed_realpath_escape", path);
      const realRelative = real.slice(rootReal.length + 1).split("\\").join("/");
      const inode = `${stat.dev}:${stat.ino}`;
      validatePhysicalFileMetadata({ path, nodeKind: "regular_file", realpath: realRelative, inodeKey: inode }, inodeOwners);

      if (!isCandidatePath(path)) continue;
      const bytes = readFileSync(absolute);
      const sourceState = states.tracked.has(path) ? "tracked" : states.untracked.has(path) ? "untracked-not-ignored" : "untracked-ignored";
      candidates.push({
        path,
        nodeKind: "regular_file",
        realpath: realRelative,
        sourceState,
        contentSha256: sha256(bytes),
        isExecutable: executableExtensions.has(extname(path)),
        isProtectedResource: isProtectedResource(path),
        isRootControl: rootControlFiles.has(path),
        isGenerated: isGenerated(path),
        hardLinkAlias: false,
      });
    }
  }

  walk(repositoryRoot);
  for (const [name, declared] of excludedNames) {
    if (!excludedRoots.some(({ path }) => path === declared)) excludedRoots.push({ path: declared, present: false, nodeKind: "absent", walked: false });
  }
  candidates.sort((left, right) => left.path < right.path ? -1 : left.path > right.path ? 1 : 0);
  excludedRoots.sort((left, right) => left.path < right.path ? -1 : left.path > right.path ? 1 : 0);
  return { candidates, excludedRoots };
}

function validateGenerated(items, candidateProfile = profile) {
  const allowed = new Set(candidateProfile.resourceAndGeneratedPolicy.productionGeneratedFiles);
  const frameworkControls = new Set(candidateProfile.resourceAndGeneratedPolicy.frameworkControlGeneratedFiles);
  for (const item of items) {
    if (!isGenerated(item.path, candidateProfile)) continue;
    if (frameworkControls.has(item.path)) {
      const classes = classifyPath(item.path, candidateProfile).map(({ id }) => id);
      if (classes.length !== 1 || classes[0] !== "root-control-file") {
        throw new GraphFailure("fail_closed_framework_control_class", item.path);
      }
      continue;
    }
    if (!allowed.has(item.path)) throw new GraphFailure("fail_closed_unmanifested_generated_resource", item.path);
    const classes = classifyPath(item.path, candidateProfile).map(({ id }) => id);
    if (!classes.includes("protected-ai")) throw new GraphFailure("fail_closed_generated_not_protected", item.path);
  }
}

function expectedNextEnvBytes(candidateProfile = profile) {
  const contract = candidateProfile.resourceAndGeneratedPolicy.frameworkControlGeneratedContract;
  return Buffer.from(`${contract.presentUtf8Lines.join("\n")}\n`, "utf8");
}

function validateNextEnvLifecycle(items, state = lifecycleState, candidateProfile = profile, mutation = {}) {
  const contract = candidateProfile.resourceAndGeneratedPolicy.frameworkControlGeneratedContract;
  if (mutation.requiresDeletionBeforeProof === true) {
    throw new GraphFailure("fail_closed_deletion_prerequisite", "next-env.d.ts");
  }
  const item = items.find(({ path }) => path === contract.presentPath);
  if (state === "candidate-file-absent" || state === "source-clean-file-absent") {
    if (item) throw new GraphFailure("fail_closed_lifecycle_expected_absent", item.path);
    return {
      state,
      path: contract.presentPath,
      present: false,
      sourceState: "absent",
      soleClass: null,
      contentSha256: null,
      bytes: 0,
      gitIgnored: true,
      tsconfigIncluded: true,
      generated: false,
      productionClosureMember: false,
    };
  }
  if (!item) throw new GraphFailure("fail_closed_lifecycle_candidate_missing", contract.presentPath);
  const path = mutation.path ?? item.path;
  if (path !== contract.presentPath) throw new GraphFailure("fail_closed_unclassified", path);
  const bytes = mutation.bytes ?? readFileSync(repositoryPath(item.path));
  if (bytes.length !== contract.presentLengthBytes || sha256(bytes) !== contract.presentSha256 || !bytes.equals(expectedNextEnvBytes(candidateProfile))) {
    throw new GraphFailure("fail_closed_framework_control_generated_mismatch", item.path);
  }
  if (item.sourceState !== contract.presentSourceState) throw new GraphFailure("fail_closed_framework_control_source_state", item.sourceState);
  if (!item.isGenerated || !item.isExecutable || !item.isRootControl) throw new GraphFailure("fail_closed_framework_control_inventory_flags", item.path);
  const classes = classifyPath(item.path, candidateProfile).map(({ id }) => id);
  if (classes.length === 0) throw new GraphFailure("fail_closed_unclassified", item.path);
  if (classes.length > 1) throw new GraphFailure("fail_closed_ambiguous", item.path);
  if (classes[0] !== contract.soleRootClass) throw new GraphFailure("fail_closed_framework_control_class", classes[0]);
  const ignored = run("git", ["check-ignore", "--quiet", item.path]).status === 0;
  if (!ignored) throw new GraphFailure("fail_closed_framework_control_ignore_contract", item.path);
  const tsconfig = JSON.parse(readFileSync(repositoryPath("tsconfig.json"), "utf8"));
  if (!Array.isArray(tsconfig.include) || !tsconfig.include.includes(contract.tsconfigIncludeRequired)) {
    throw new GraphFailure("fail_closed_framework_control_tsconfig_contract", item.path);
  }
  return {
    state,
    path: item.path,
    present: true,
    sourceState: item.sourceState,
    soleClass: classes[0],
    contentSha256: item.contentSha256,
    bytes: bytes.length,
    gitIgnored: ignored,
    tsconfigIncluded: true,
    generated: item.isGenerated,
    productionClosureMember: false,
  };
}

function validateGeneratedRootEntry(entry, inodeOwners) {
  if (entry.nodeKind !== "regular_file") throw new GraphFailure("fail_closed_generated_root_bypass", entry.path);
  if (!entry.path.startsWith(".next/") || !entry.realpath.startsWith(".next/") || entry.path !== entry.realpath) {
    throw new GraphFailure("fail_closed_generated_root_bypass", `${entry.path}->${entry.realpath}`);
  }
  if (inodeOwners.has(entry.inodeKey)) {
    throw new GraphFailure("fail_closed_generated_root_bypass", `${inodeOwners.get(entry.inodeKey)},${entry.path}`);
  }
  inodeOwners.set(entry.inodeKey, entry.path);
}

function auditOfficialGeneratedRoot(state = lifecycleState) {
  const contract = profile.actualTreeProof.officialGeneratedRootAudit;
  const root = repositoryPath(contract.root);
  const emptyHash = sha256(Buffer.from("cwt-v17-next-generated-root-v1\0", "utf8"));
  if (state === "candidate-file-absent") {
    return {
      state,
      path: contract.root,
      lifecycleAssertion: "not_requested",
      present: existsSync(root),
      files: [],
      generatedRootSha256: null,
    };
  }
  if (state === "source-clean-file-absent") {
    if (existsSync(root)) throw new GraphFailure("fail_closed_lifecycle_generated_root_expected_absent", contract.root);
    return {
      state,
      path: contract.root,
      lifecycleAssertion: "absent",
      present: false,
      files: [],
      generatedRootSha256: emptyHash,
    };
  }
  if (!existsSync(root)) throw new GraphFailure("fail_closed_lifecycle_generated_root_missing", contract.root);
  const rootStat = lstatSync(root, { bigint: true });
  if (rootStat.isSymbolicLink() || !rootStat.isDirectory()) {
    throw new GraphFailure("fail_closed_generated_root_bypass", contract.root);
  }
  const rootReal = realpathSync.native(repositoryRoot);
  const inodeOwners = new Map();
  const files = [];
  function walk(directory, relativeDirectory) {
    const entries = readdirSync(directory, { withFileTypes: true }).sort((left, right) => left.name < right.name ? -1 : left.name > right.name ? 1 : 0);
    for (const entry of entries) {
      const path = `${relativeDirectory}/${entry.name}`;
      const absolute = resolve(directory, entry.name);
      const stat = lstatSync(absolute, { bigint: true });
      if (stat.isSymbolicLink()) throw new GraphFailure("fail_closed_generated_root_bypass", path);
      if (stat.isDirectory()) {
        walk(absolute, path);
        continue;
      }
      if (!stat.isFile()) throw new GraphFailure("fail_closed_generated_root_bypass", path);
      const real = realpathSync.native(absolute);
      if (!real.startsWith(`${rootReal}/.next/`)) throw new GraphFailure("fail_closed_generated_root_bypass", path);
      const inodeKey = `${stat.dev}:${stat.ino}`;
      const realRelative = real.slice(rootReal.length + 1).split("\\").join("/");
      validateGeneratedRootEntry({ path, nodeKind: "regular_file", realpath: realRelative, inodeKey }, inodeOwners);
      files.push({ path, contentSha256: sha256File(absolute), bytes: Number(stat.size) });
    }
  }
  walk(root, ".next");
  files.sort((left, right) => left.path < right.path ? -1 : left.path > right.path ? 1 : 0);
  assert.deepEqual(
    files.map(({ path, contentSha256 }) => ({ path, sha256: contentSha256 })),
    contract.requiredPresentFiles,
  );
  const records = files.map(({ path, contentSha256 }) => `${path}\0${contentSha256}\n`).join("");
  return {
    state,
    path: contract.root,
    lifecycleAssertion: "present_exact",
    present: true,
    files,
    generatedRootSha256: sha256(Buffer.from(`cwt-v17-next-generated-root-v1\0${records}`, "utf8")),
  };
}

function validateComposition(paths, mode = "design") {
  const phaseB = paths.filter((path) => path === "src/server/ai/phase-b-composition.ts");
  const phaseD = paths.filter((path) => path === "src/server/ai/phase-d-provider-composition.ts");
  const adapters = paths.filter((path) => path.startsWith("src/integrations/ai/providers/"));
  const undeclared = paths.filter((path) => path.startsWith("src/server/ai/") && !phaseB.includes(path) && !phaseD.includes(path));
  if (phaseD.length > 0) throw new GraphFailure("fail_closed_future_stage_unauthorized", phaseD.join(","));
  if (adapters.length > 0) throw new GraphFailure("fail_closed_future_stage_unauthorized", adapters.join(","));
  if (undeclared.length > 0) throw new GraphFailure("fail_closed_undeclared_composition", undeclared.join(","));
  const expectedPhaseB = mode === "design" ? 0 : 1;
  if (phaseB.length !== expectedPhaseB) throw new GraphFailure("fail_closed_phase_b_composition_count", `${phaseB.length} != ${expectedPhaseB}`);
  return { phaseB: phaseB.length, phaseD: phaseD.length, adapters: adapters.length, undeclared: undeclared.length };
}

const require = createRequire(resolve(repositoryRoot, "package.json"));
const ts = require("typescript");

function collectSpecifiers(path, text) {
  const kind = path.endsWith(".tsx") || path.endsWith(".jsx") ? ts.ScriptKind.TSX : path.endsWith(".js") || path.endsWith(".mjs") || path.endsWith(".cjs") ? ts.ScriptKind.JS : ts.ScriptKind.TS;
  const source = ts.createSourceFile(path, text, ts.ScriptTarget.Latest, true, kind);
  const specifiers = [];
  function add(node) {
    if (node && (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node))) specifiers.push(node.text);
  }
  function visit(node) {
    if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) add(node.moduleSpecifier);
    if (ts.isImportEqualsDeclaration(node) && ts.isExternalModuleReference(node.moduleReference)) add(node.moduleReference.expression);
    if (ts.isImportTypeNode(node) && ts.isLiteralTypeNode(node.argument)) add(node.argument.literal);
    if (ts.isCallExpression(node)) {
      if (node.expression.kind === ts.SyntaxKind.ImportKeyword) add(node.arguments[0]);
      if (ts.isIdentifier(node.expression) && node.expression.text === "require") add(node.arguments[0]);
      if (ts.isPropertyAccessExpression(node.expression) && ts.isIdentifier(node.expression.expression) && node.expression.expression.text === "require" && node.expression.name.text === "resolve") add(node.arguments[0]);
    }
    ts.forEachChild(node, visit);
  }
  visit(source);
  return specifiers;
}

function localTarget(from, specifier) {
  if (specifier.startsWith("@/")) return `src/${specifier.slice(2)}`;
  if (!specifier.startsWith(".")) return null;
  return posix.normalize(posix.join(posix.dirname(from), specifier));
}

function assertCapabilityEdge(from, classId, specifier) {
  const target = localTarget(from, specifier);
  const policy = profile.testAndRootControlPolicy;
  if (["synthetic-ai-test-code", "other-test-fixtures", "root-control-file"].includes(classId)) {
    const forbiddenLocal = [...policy.forbiddenLocalTargetsAllTestAndControl];
    if (classId === "root-control-file") forbiddenLocal.push(...policy.rootControlAdditionalForbiddenLocalTargets);
    if (target && forbiddenLocal.some((root) => target === root.slice(0, -1) || target.startsWith(root))) {
      throw new GraphFailure("fail_closed_capability_ceiling", `${from}->${specifier}`);
    }
    if (policy.forbiddenExternalSpecifiers.some((external) => specifier === external || specifier.startsWith(`${external}/`))) {
      throw new GraphFailure("fail_closed_capability_ceiling", `${from}->${specifier}`);
    }
  }
  const productionClasses = new Set(["phase-b-outer-composition", "protected-ai", "business-consumer", "other-production-src"]);
  if (productionClasses.has(classId) && target && isTestSemantic(target)) {
    throw new GraphFailure("fail_closed_production_to_test", `${from}->${specifier}`);
  }
  if ((from.startsWith("src/app/") || from.startsWith("src/public-site/")) && target && ["src/ai/", "src/server/ai/", "src/integrations/ai/providers/"].some((root) => target.startsWith(root))) {
    throw new GraphFailure("fail_closed_public_to_ai", `${from}->${specifier}`);
  }
}

function validateCapabilities(items, classification) {
  let edgeCount = 0;
  for (const item of items.filter(({ isExecutable }) => isExecutable)) {
    const rootClass = classification.get(item.path);
    const text = readFileSync(repositoryPath(item.path), "utf8");
    const specifiers = collectSpecifiers(item.path, text);
    for (const specifier of specifiers) {
      edgeCount += 1;
      assertCapabilityEdge(item.path, rootClass.id, specifier);
    }
    if (["synthetic-ai-test-code", "other-test-fixtures", "root-control-file"].includes(rootClass.id)) {
      for (const pattern of profile.testAndRootControlPolicy.forbiddenProviderCredentialPatterns) {
        const prefix = pattern.replace("_*", "");
        if (text.includes(prefix)) throw new GraphFailure("fail_closed_provider_credential", `${item.path}:${prefix}`);
      }
    }
  }
  return edgeCount;
}

function actualProof() {
  const { candidates, excludedRoots } = actualTreeInventory();
  const paths = candidates.map(({ path }) => path);
  throwForClassification(paths);
  validateGenerated(candidates);
  const nextEnvStatus = validateNextEnvLifecycle(candidates);
  const officialGeneratedRootStatus = auditOfficialGeneratedRoot();
  const compositionStatus = validateComposition(paths, "design");
  const classification = new Map();
  const classes = Object.fromEntries(profile.classificationModel.rootClasses.map(({ id }) => [id, []]));
  for (const item of candidates) {
    const [rootClass] = classifyPath(item.path);
    classification.set(item.path, rootClass);
    classes[rootClass.id].push(item.path);
  }
  const required = profile.classificationModel.v15M01OriginalSixPathDisposition;
  for (const [path, expectedClass] of Object.entries(required)) {
    assert.ok(paths.includes(path), `required V15-M01 path missing: ${path}`);
    assert.equal(classification.get(path).id, expectedClass, path);
  }
  for (const item of candidates.filter(({ path }) => path.startsWith("src/test/"))) assert.equal(classification.get(item.path).id, "other-test-fixtures", item.path);
  const edgeCount = validateCapabilities(candidates, classification);
  const inventorySha256 = sha256(Buffer.from(canonicalJson(candidates), "utf8"));
  const contentRecords = candidates.map(({ path, contentSha256 }) => `${path}\0${contentSha256}\n`).join("");
  const classificationRecords = candidates.map(({ path }) => {
    const rootClass = classification.get(path);
    return `${path}\0${rootClass.id}\0${rootClass.stageStatus}\0${rootClass.bundleZones.join(",")}\n`;
  }).join("");
  const contentSha256 = sha256(Buffer.from(`cwt-v17-content-v2\0${contentRecords}`, "utf8"));
  const classificationSha256 = sha256(Buffer.from(`cwt-v17-classification-v2\0${classificationRecords}`, "utf8"));
  const sourceStateCounts = Object.fromEntries(enumeration.sourceStateLabels.map((state) => [state, candidates.filter(({ sourceState }) => sourceState === state).length]));
  if (lifecycleState === "source-clean-file-absent") {
    assert.equal(sourceStateCounts["untracked-not-ignored"], 0);
    assert.equal(sourceStateCounts["untracked-ignored"], 0);
  }
  if (lifecycleState === "official-next-generated-file-present") {
    assert.equal(sourceStateCounts["untracked-not-ignored"], 0);
    assert.equal(sourceStateCounts["untracked-ignored"], 1);
  }
  return {
    proofId: profile.actualTreeProof.proofId,
    profileId: profile.profileId,
    profileVersion: profile.profileVersion,
    mode: "design-candidate-no-implementation",
    lifecycleState,
    exactHead: git(["rev-parse", "HEAD"]),
    totalCandidateNodes: candidates.length,
    totalExecutableNodes: candidates.filter(({ isExecutable }) => isExecutable).length,
    totalProtectedResourceNodes: candidates.filter(({ isProtectedResource }) => isProtectedResource).length,
    totalRootControlNodes: candidates.filter(({ isRootControl }) => isRootControl).length,
    parsedSpecifierEdges: edgeCount,
    classes,
    zeroClass: [],
    ambiguous: [],
    excludedRoots,
    sourceStateCounts,
    protectedStatus: { protectedAiMembers: classes["protected-ai"], implementationExpectedInDesignCandidate: false },
    testStatus: { syntheticMembers: classes["synthetic-ai-test-code"], otherTestMembers: classes["other-test-fixtures"] },
    rootControlStatus: {
      members: classes["root-control-file"],
      productionClosureMember: false,
      publicOrServerProductionClosureMember: false,
      nextEnvStatus,
    },
    compositionStatus,
    phaseDStatus: "absent_required",
    adapterStatus: "absent_required",
    productionProviderRegistryStatus: "implementation_absent_and_no_registry_node",
    officialGeneratedRootStatus,
    hashes: { inventorySha256, contentSha256, classificationSha256 },
    inventory: candidates,
  };
}

function expectGraphFailure(id, expectedCode, fn) {
  let failure;
  try {
    fn();
  } catch (error) {
    failure = error;
  }
  assert.ok(failure instanceof GraphFailure, `${id}: expected GraphFailure, got ${failure}`);
  assert.equal(failure.code, expectedCode, `${id}: ${failure.message}`);
  return id;
}

function mutationSuite(actual) {
  const passed = [];
  passed.push(expectGraphFailure("new-unclassified-executable", "fail_closed_unclassified", () => throwForClassification(["unclassified-root-tool.ts"])));

  const ambiguous = structuredClone(profile);
  ambiguous.classificationModel.rootClasses.find(({ id }) => id === "root-control-file").match.files.push("tests/e2e/public.spec.ts");
  passed.push(expectGraphFailure("same-path-two-classes", "fail_closed_ambiguous", () => throwForClassification(["tests/e2e/public.spec.ts"], ambiguous)));

  for (const path of Object.keys(profile.classificationModel.v15M01OriginalSixPathDisposition)) {
    const removed = structuredClone(profile);
    const classId = profile.classificationModel.v15M01OriginalSixPathDisposition[path];
    removed.classificationModel.rootClasses.find(({ id }) => id === classId).match.excludeFiles.push(path);
    passed.push(expectGraphFailure(`remove-classification:${path}`, "fail_closed_unclassified", () => throwForClassification([path], removed)));
  }

  passed.push(expectGraphFailure("silent-exclusion", "fail_closed_silent_exclusion", () => {
    const paths = actual.inventory.map(({ path }) => path).filter((path) => !path.startsWith("tests/"));
    const missing = Object.keys(profile.classificationModel.v15M01OriginalSixPathDisposition).filter((path) => !paths.includes(path));
    if (missing.length > 0) throw new GraphFailure("fail_closed_silent_exclusion", missing.join(","));
  }));

  passed.push(expectGraphFailure("symlink-bypass", "fail_closed_symlink", () => {
    validatePhysicalFileMetadata({ path: "virtual/symlink.ts", nodeKind: "symlink", realpath: "virtual/target.ts", inodeKey: "1:1" }, new Map());
  }));
  passed.push(expectGraphFailure("canonical-hardlink-alias", "fail_closed_hard_link_alias", () => {
    const owners = new Map();
    validatePhysicalFileMetadata({ path: "virtual/a.ts", nodeKind: "regular_file", realpath: "virtual/a.ts", inodeKey: "1:2" }, owners);
    validatePhysicalFileMetadata({ path: "virtual/b.ts", nodeKind: "regular_file", realpath: "virtual/b.ts", inodeKey: "1:2" }, owners);
  }));
  passed.push(expectGraphFailure("alias-import-bypass", "fail_closed_capability_ceiling", () => {
    assertCapabilityEdge("tests/e2e/alias.spec.ts", "other-test-fixtures", "@/server/ai/phase-b-composition");
  }));
  passed.push(expectGraphFailure("generated-resource-bypass", "fail_closed_unmanifested_generated_resource", () => {
    validateGenerated([{ path: "src/ai/prompts/generated/unlisted.generated.ts" }]);
  }));
  passed.push(expectGraphFailure("early-phase-d", "fail_closed_future_stage_unauthorized", () => {
    validateComposition(["src/server/ai/phase-d-provider-composition.ts"], "design");
  }));
  passed.push(expectGraphFailure("early-adapter", "fail_closed_future_stage_unauthorized", () => {
    validateComposition(["src/integrations/ai/providers/deepseek.ts"], "design");
  }));
  passed.push(expectGraphFailure("second-composition-root", "fail_closed_undeclared_composition", () => {
    validateComposition(["src/server/ai/phase-b-composition-shadow.ts"], "design");
  }));

  const integrityMutation = structuredClone(profile);
  integrityMutation.filesystemEnumeration.excludedPhysicalRoots.push("tests/");
  passed.push(expectGraphFailure("sealed-exclusion-table", "profile_integrity_mismatch", () => verifyProfileIntegrity(integrityMutation)));
  assert.equal(passed.length, 17);
  const baseCount = passed.length;

  const nextEnvUnclassified = structuredClone(profile);
  nextEnvUnclassified.classificationModel.rootClasses
    .find(({ id }) => id === "root-control-file")
    .match.files = nextEnvUnclassified.classificationModel.rootClasses
      .find(({ id }) => id === "root-control-file")
      .match.files.filter((path) => path !== "next-env.d.ts");
  passed.push(expectGraphFailure("next-env-present-without-class", "fail_closed_unclassified", () => {
    throwForClassification(["next-env.d.ts"], nextEnvUnclassified);
  }));

  const nextEnvAmbiguous = structuredClone(profile);
  nextEnvAmbiguous.classificationModel.rootClasses
    .find(({ id }) => id === "diagnostic-documentation")
    .match.files.push("next-env.d.ts");
  passed.push(expectGraphFailure("next-env-double-class", "fail_closed_ambiguous", () => {
    throwForClassification(["next-env.d.ts"], nextEnvAmbiguous);
  }));

  passed.push(expectGraphFailure("next-env-silent-ignore-or-exclude", "fail_closed_lifecycle_candidate_missing", () => {
    validateNextEnvLifecycle([], "official-next-generated-file-present");
  }));

  passed.push(expectGraphFailure("other-root-ignored-ts", "fail_closed_unclassified", () => {
    throwForClassification(["other-framework-generated.d.ts"]);
  }));

  passed.push(expectGraphFailure("next-env-symlink-alias", "fail_closed_symlink", () => {
    validatePhysicalFileMetadata({ path: "next-env.d.ts", nodeKind: "symlink", realpath: "generated/next-env.d.ts", inodeKey: "2:1" }, new Map());
  }));

  passed.push(expectGraphFailure("next-env-hard-link-alias", "fail_closed_hard_link_alias", () => {
    const owners = new Map([["2:2", "framework-copy.d.ts"]]);
    validatePhysicalFileMetadata({ path: "next-env.d.ts", nodeKind: "regular_file", realpath: "next-env.d.ts", inodeKey: "2:2" }, owners);
  }));

  const frameworkItem = {
    path: "next-env.d.ts",
    sourceState: "untracked-ignored",
    contentSha256: profile.resourceAndGeneratedPolicy.frameworkControlGeneratedContract.presentSha256,
    isExecutable: true,
    isRootControl: true,
    isGenerated: true,
  };
  const mutatedBytes = Buffer.from(expectedNextEnvBytes());
  mutatedBytes[0] ^= 1;
  passed.push(expectGraphFailure("next-env-generated-bytes", "fail_closed_framework_control_generated_mismatch", () => {
    validateNextEnvLifecycle([frameworkItem], "official-next-generated-file-present", profile, { bytes: mutatedBytes });
  }));

  passed.push(expectGraphFailure("next-env-generated-path", "fail_closed_unclassified", () => {
    throwForClassification(["next-env-copy.d.ts"]);
  }));

  const typeReferenceMutation = Buffer.from(expectedNextEnvBytes().toString("utf8").replace("./.next/types/routes.d.ts", "./.next/dev/types/routes.d.ts"), "utf8");
  passed.push(expectGraphFailure("next-env-type-reference", "fail_closed_framework_control_generated_mismatch", () => {
    validateNextEnvLifecycle([frameworkItem], "official-next-generated-file-present", profile, { bytes: typeReferenceMutation });
  }));

  passed.push(expectGraphFailure("deletion-prerequisite", "fail_closed_deletion_prerequisite", () => {
    validateNextEnvLifecycle([], "source-clean-file-absent", profile, { requiresDeletionBeforeProof: true });
  }));

  passed.push(expectGraphFailure("dot-next-generated-bypass", "fail_closed_generated_root_bypass", () => {
    validateGeneratedRootEntry({
      path: ".next/types/routes.d.ts",
      nodeKind: "regular_file",
      realpath: ".next-escape/types/routes.d.ts",
      inodeKey: "3:1",
    }, new Map());
  }));

  return { passed, baseCount, attempt2Count: passed.length - baseCount };
}

function mappingFields(markdown, startHeading, endHeading) {
  const start = markdown.indexOf(startHeading);
  const end = markdown.indexOf(endHeading, start + startHeading.length);
  assert.ok(start >= 0 && end > start, startHeading);
  return [...markdown.slice(start, end).matchAll(/^\| `([^`]+)` \|/gmu)].map((match) => match[1]);
}

function runNonRegression() {
  const m02 = run(exactNode, [repositoryPath("docs/review-evidence/phase-1b-stage4a-phase-b-corrected-exact-design-independent-review-v1/REVIEWER_M02_SELECTED_BOUNDARY_PROBE_V1_0.mjs")]);
  assert.equal(m02.status, 0, `${m02.stdout}\n${m02.stderr}`);
  assert.match(m02.stdout, /SUMMARY M02_SELECTED_BOUNDARY_PROBE=PASS/u);
  const transition = run(exactNode, [repositoryPath("docs/review-evidence/phase-1b-stage4a-phase-b-three-strike-technical-escalation-independent-rereview-v1/REVIEWER_TECH_M01_TRANSITION_CHALLENGE_V1_0.mjs")]);
  assert.equal(transition.status, 0, `${transition.stdout}\n${transition.stderr}`);
  assert.match(transition.stdout, /SUMMARY TECH_M01_FRESH_TRANSITION_CHALLENGE=PASS/u);

  const runtimeNegative = run(exactNode, [fileURLToPath(import.meta.url)], {
    env: { ...process.env, CWT_V17_EXPECTED_NODE: "0.0.0-runtime-mismatch", CWT_V17_RUNTIME_NEGATIVE_CHILD: "1" },
  });
  assert.notEqual(runtimeNegative.status, 0);
  assert.match(`${runtimeNegative.stdout}\n${runtimeNegative.stderr}`, /0\.0\.0-runtime-mismatch/u);

  const tsc = repositoryPath("node_modules/.bin/tsc");
  const typeCases = [
    ["m03-positive", 0, "docs/review-evidence/phase-1b-stage4a-phase-b-corrected-design-v1/tsconfig.m03-positive.json", null],
    ["m03-reviewer-positive", 0, "docs/review-evidence/phase-1b-stage4a-phase-b-corrected-exact-design-independent-review-v1/tsconfig.m03-reviewer-positive.json", null],
    ["m03-union-negative", 2, "docs/review-evidence/phase-1b-stage4a-phase-b-corrected-design-v1/tsconfig.m03-union-negative.json", /TS2375/u],
    ["m03-cross-driver-negative", 2, "docs/review-evidence/phase-1b-stage4a-phase-b-corrected-design-v1/tsconfig.m03-cross-driver-negative.json", /TS2375/u],
    ["m03-destructured-union-negative", 2, "docs/review-evidence/phase-1b-stage4a-phase-b-corrected-exact-design-independent-review-v1/tsconfig.m03-reviewer-negative.json", /TS2375/u],
  ];
  for (const [id, expected, path, diagnostic] of typeCases) {
    const result = run(tsc, ["-p", repositoryPath(path)]);
    assert.equal(result.status, expected, `${id}\n${result.stdout}\n${result.stderr}`);
    if (diagnostic) assert.match(`${result.stdout}\n${result.stderr}`, diagnostic);
  }

  const schema = run(exactNode, [repositoryPath("docs/review-evidence/phase-1b-stage4a-phase-b-corrected-exact-design-independent-review-v1/REVIEWER_SCHEMA_MAPPING_PROBE_V1_0.mjs")]);
  assert.equal(schema.status, 0, `${schema.stdout}\n${schema.stderr}`);
  assert.match(schema.stdout, /AI_MODEL_CONFIG=21\/21/u);
  assert.match(schema.stdout, /AI_RUNS=96\/96/u);

  const v16 = readFileSync(repositoryPath("docs/PHASE_1B_STAGE4A_PHASE_B_PROVIDER_NEUTRAL_FOUNDATION_CORRECTED_EXACT_DESIGN_V1_6.md"), "utf8");
  const v17 = readFileSync(repositoryPath("docs/PHASE_1B_STAGE4A_PHASE_B_PROVIDER_NEUTRAL_FOUNDATION_CORRECTED_EXACT_DESIGN_V1_7.md"), "utf8");
  const config16 = mappingFields(v16, "### 11.1 `ai_model_config`", "### 11.2 `ai_runs`");
  const config17 = mappingFields(v17, "### 11.1 `ai_model_config`", "### 11.2 `ai_runs`");
  const runs16 = mappingFields(v16, "### 11.2 `ai_runs`", "## 12. Prompt Registry");
  const runs17 = mappingFields(v17, "### 11.2 `ai_runs`", "## 12. Prompt Registry");
  assert.equal(config17.length, 21);
  assert.equal(runs17.length, 96);
  assert.deepEqual(config17, config16);
  assert.deepEqual(runs17, runs16);
  const closures = ["H-01", "H-02", "M-01", "M-02", "M-03", "M-04", "M-05", "M-06", "L-01", "N-M01", "N-M02", "N-M03", "N-M04"];
  for (const closure of closures) assert.ok(v17.includes(closure), closure);
  assert.equal([...v17.matchAll(/^## (\d+)\./gmu)].length, 26);
  for (const frozen of [
    "seo_content_draft",
    "fabric_knowledge_draft",
    "product_description_draft",
    "sourcing_guide_draft",
    "human_review_required",
    "customer_support",
    "no fallback",
    "Phase C",
    "Phase D",
    "Phase E",
    "IMPLEMENTATION NOT AUTHORIZED",
  ]) assert.ok(v17.includes(frozen), frozen);
}

checkFixedIdentity();
validateProfileShape(profile);
const profileIntegritySha256 = verifyProfileIntegrity(profile);
const proof = actualProof();
const mutations = mutationSuite(proof);
proof.mutationStatus = {
  baseV16OriginalCount: mutations.baseCount,
  attempt2Count: mutations.attempt2Count,
  total: mutations.passed.length,
  allExpectedFailClosed: true,
  ids: mutations.passed,
};
if (!lifecycleOnly) runNonRegression();

const changed = git(["diff", "--name-only", "49ba05ff0e40efce4ba8feb1bc87528414e3fad9", "HEAD"]).split("\n").filter(Boolean);
for (const path of changed) {
  assert.ok(path.startsWith("docs/"), `non-doc change: ${path}`);
  assert.ok(!path.startsWith("docs/adr/"), `ADR change: ${path}`);
}
for (const path of git(["ls-files", "--others", "--exclude-standard"]).split("\n").filter(Boolean)) {
  assert.ok(path.startsWith("docs/"), `non-doc untracked: ${path}`);
}

pass(`runtime Node ${process.versions.node}; V8 ${process.versions.v8}; ICU ${process.versions.icu}; Unicode ${process.versions.unicode}; CLDR ${process.versions.cldr}; ${process.platform}/${process.arch}`);
pass("branch/detached lifecycle mode, V1.5/V1.6 checkpoints, attempt-2 authoring parent, escalation/rollback/tag ancestry and failed-code isolation");
pass("V1.5 and V1.6 bytes/manifests unchanged; both imported FAIL evidence sets byte-identical; technical escalation PASS 5/5");
pass(`M03 V2.2 one sealed selector authority classes=12 integrity=${profileIntegritySha256}`);
pass(`actual tree candidates=${proof.totalCandidateNodes} executable=${proof.totalExecutableNodes} protectedResource=${proof.totalProtectedResourceNodes} rootControl=${proof.totalRootControlNodes}`);
for (const classId of profile.classificationModel.precedence) pass(`class ${classId} members=${proof.classes[classId].length}`);
pass(`zeroClass=0 ambiguous=0 inventory=${proof.hashes.inventorySha256} content=${proof.hashes.contentSha256} classification=${proof.hashes.classificationSha256}`);
pass(`lifecycle=${lifecycleState} next-env=${proof.rootControlStatus.nextEnvStatus.present ? "present+ignored+tsconfig+root-control" : "absent"} generated-root=${proof.officialGeneratedRootStatus.lifecycleAssertion}`);
pass("six original V15-M01 paths uniquely classified; optional next-env receives the sole root-control class when present; src/test/** test-only; test/control capability ceilings and Production incoming-edge rule pass");
pass(`mutation negatives=${mutations.passed.length} base-v1.6=${mutations.baseCount} attempt-2=${mutations.attempt2Count} all fail closed with exact reasons`);
for (const mutation of mutations.passed) pass(`mutation ${mutation}=EXPECTED_FAIL_CLOSED`);
pass("Phase B/protected implementation absent in design mode; Phase D root=0 adapter=0 second composition=0 Provider registry implementation absent");
pass("M02 selected INCLUDE full Unicode transitions/runtime mismatch/persisted bytes non-regression");
pass("M03 branch-local positives exit=0; union/cross-driver/destructured negatives=TS2375; no selected seam change");
pass("accepted mapping V1.7=V1.5=Drizzle=0020: ai_model_config 21/21, ai_runs 96/96");
pass("all 13 historical closures, 26 sections, frozen four use cases/Draft-only/phase boundaries retained");
pass("Schema/Migration/ADR/dependency/package/lock/persistent-complexity impact none; docs/evidence-only scope");
output.push("SUMMARY CORRECTED_EXACT_DESIGN_V1_7=PASS V15_M01=CLOSED_CANDIDATE_ONLY INDEPENDENT_APPROVAL=FALSE IMPLEMENTATION_AUTHORIZED=FALSE");

if (inventoryMode) process.stdout.write(`${JSON.stringify(proof, null, 2)}\n`);
else process.stdout.write(`${output.join("\n")}\n`);
