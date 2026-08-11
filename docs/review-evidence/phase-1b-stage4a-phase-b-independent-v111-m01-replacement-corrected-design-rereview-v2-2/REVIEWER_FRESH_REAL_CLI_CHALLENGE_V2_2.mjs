import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";

const [sourceRepoArg, envelopeArg, outputArg] = process.argv.slice(2);
if (!sourceRepoArg || !envelopeArg) {
  throw new Error("usage: node REVIEWER_FRESH_REAL_CLI_CHALLENGE_V2_2.mjs <source-repo> <reviewer-envelope>");
}

const EXPECTED_NODE = "24.14.0";
const EXPECTED_REF = "refs/heads/codex/phase-1b-stage4a-phase-b-v111-m01-replacement-design-remediation-v2";
const EXPECTED_HEAD = "156cbafc061d36ce2395529a3150b0c974f3c603";
const EXPECTED_PARENT = "626552c4b3eb2ef3f0dbeadddcf5202444102368";
const EXPECTED_TREE = "00a2cf04c8834339f917ba67c05e719acb67108c";
const AUTHORITY = "docs/review-evidence/phase-1b-stage4a-phase-b-v111-m01-replacement-corrected-design-v2-2/V111_M01_CANONICAL_REVIEW_AUTHORITY_V2_2.json";
const MANIFEST = "docs/review-evidence/phase-1b-stage4a-phase-b-v111-m01-replacement-corrected-design-v2-2/SHA256SUMS.txt";
const PROFILE = "docs/review-evidence/phase-1b-stage4a-phase-b-v111-m01-replacement-corrected-design-v2-2/PHASE_B_CURRENT_TECHNICAL_PROFILE_V2_2.json";
const VERIFIER = "docs/review-evidence/phase-1b-stage4a-phase-b-v111-m01-replacement-corrected-design-v2-2/VERIFY_V111_M01_REPLACEMENT_CORRECTED_DESIGN_V2_2.mjs";
const OLD_AUTHORITY = "docs/review-evidence/phase-1b-stage4a-phase-b-v111-m01-replacement-corrected-design-v2-1/V111_M01_CANONICAL_REVIEW_AUTHORITY_V2_1.json";
const OLD_VERIFIER = "docs/review-evidence/phase-1b-stage4a-phase-b-v111-m01-replacement-corrected-design-v2-1/VERIFY_V111_M01_REPLACEMENT_CORRECTED_DESIGN_V2_1.mjs";
const OLD_HEAD = "3d424821aab67c03c3b8ec02a62b5577044837c9";

if (process.versions.node !== EXPECTED_NODE) throw new Error(`node-version:${process.versions.node}`);

const sha256 = (bytes) => crypto.createHash("sha256").update(bytes).digest("hex");
const sourceRepo = fs.realpathSync(sourceRepoArg);
const envelopePath = fs.realpathSync(envelopeArg);
const envelope = JSON.parse(fs.readFileSync(envelopePath, "utf8"));
const temp = fs.mkdtempSync(path.join(os.tmpdir(), "cwt-v22-reviewer-real-cli-"));

function run(command, args, cwd) {
  const result = spawnSync(command, args, {
    cwd,
    encoding: "utf8",
    env: { ...process.env, NO_COLOR: "1" },
    stdio: ["ignore", "pipe", "pipe"],
  });
  return {
    diagnostic: (result.stderr || "").match(/Error: ([^\n]+)/)?.[1] ?? null,
    errorCode: result.error?.code ?? null,
    exit: result.status,
    pidObserved: Number.isInteger(result.pid) && result.pid > 0,
    stderrSha256: sha256(Buffer.from(result.stderr || "", "utf8")),
    stdoutEmpty: (result.stdout || "") === "",
    stdoutSha256: sha256(Buffer.from(result.stdout || "", "utf8")),
  };
}

function git(repo, args) {
  const result = spawnSync("git", args, { cwd: repo, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  if (result.status !== 0) throw new Error(`git:${args.join(" ")}:${result.stderr}`);
  return (result.stdout || "").trimEnd();
}

function installRequiredRefs(repo, head = EXPECTED_HEAD) {
  const refs = [
    [EXPECTED_REF, head],
    ["refs/heads/codex/checkpoint/phase-1b-stage4a-phase-b-v111-m01-three-strike-analysis-pre-l3-v1", "0793948ad115c19f852a9590387ed9ba06738a39"],
    ["refs/heads/codex/checkpoint/phase-1b-stage4a-phase-b-v111-m01-replacement-design-pre-l3-v1", "c103682e63e9a2cb62b6581d7d62773ddcab1a99"],
    ["refs/heads/codex/checkpoint/phase-1b-stage4a-phase-b-v111-m01-v2-m01-remediation-pre-l3-v1", "4b626fc9278f4c49957ecf165d7d5c5fc4058dca"],
    ["refs/heads/codex/checkpoint/phase-1b-stage4a-phase-b-v111-m01-v21-cli-remediation-pre-l3-v1", OLD_HEAD],
  ];
  for (const [ref, target] of refs) git(repo, ["update-ref", ref, target]);
}

function cloneAt(name, head = EXPECTED_HEAD) {
  const repo = path.join(temp, name);
  git(temp, ["clone", "--quiet", "--no-hardlinks", sourceRepo, repo]);
  git(repo, ["checkout", "--quiet", "--detach", head]);
  installRequiredRefs(repo, head === EXPECTED_HEAD ? EXPECTED_HEAD : EXPECTED_HEAD);
  return fs.realpathSync(repo);
}

function cli(repo, authority, mode = "package", suppliedEnvelope = envelopePath, cwd = repo, verifier = VERIFIER) {
  const args = [path.join(repo, verifier), "--authority", authority];
  if (mode === "package") args.push("--package-only");
  else args.push("--review-envelope", suppliedEnvelope);
  return run(process.execPath, args, cwd);
}

function writeJson(file, value) {
  fs.writeFileSync(file, `${JSON.stringify(value)}\n`);
}

function changedLeaf(value) {
  if (typeof value === "boolean") return !value;
  if (/^[0-9a-f]{40}$/.test(value) || /^[0-9a-f]{64}$/.test(value)) {
    return `${value.slice(0, -1)}${value.endsWith("0") ? "1" : "0"}`;
  }
  return `${value}-reviewer-fresh-mutation`;
}

function setLeaf(value, dottedPath, replacement) {
  const result = structuredClone(value);
  const segments = dottedPath.split(".");
  let current = result;
  for (const segment of segments.slice(0, -1)) current = current[segment];
  current[segments.at(-1)] = replacement;
  return result;
}

function assertRawReject(name, result) {
  if (result.exit !== 1 || result.diagnostic !== "raw_authority_spelling_not_canonical" || !result.stdoutEmpty || !result.pidObserved) {
    throw new Error(`raw-case-did-not-fail-closed:${name}:${JSON.stringify(result)}`);
  }
  return result;
}

const results = {
  candidate: { head: EXPECTED_HEAD, parent: EXPECTED_PARENT, ref: EXPECTED_REF, tree: EXPECTED_TREE },
  environment: { node: process.versions.node, network: false, packageManager: false },
  baseline: {},
  rawCli: {},
  ordering: {},
  oldDefect: {},
  envelopeLeaves: [],
  gitAndMembership: {},
  alternateRoots: {},
  mutationKill: {},
  finalState: {},
};

try {
  const repo = cloneAt("candidate");
  const verifierAbs = path.join(repo, VERIFIER);
  const authorityAbs = path.join(repo, AUTHORITY);
  const manifestAbs = path.join(repo, MANIFEST);
  const profileAbs = path.join(repo, PROFILE);
  const authorityBytes = fs.readFileSync(authorityAbs);
  const manifestBytes = fs.readFileSync(manifestAbs);
  const profileBytes = fs.readFileSync(profileAbs);
  const verifierBytes = fs.readFileSync(verifierAbs);

  results.baseline.packageOnly = cli(repo, AUTHORITY);
  if (results.baseline.packageOnly.exit !== 0) throw new Error("canonical-package-only-failed");
  const packageOutput = JSON.parse(spawnSync(process.execPath, [verifierAbs, "--authority", AUTHORITY, "--package-only"], { cwd: repo, encoding: "utf8" }).stdout);
  results.baseline.packageAcceptanceEligible = packageOutput.acceptanceEligible;

  results.baseline.detachedFullReview = cli(repo, AUTHORITY, "review");
  if (results.baseline.detachedFullReview.exit !== 0) throw new Error("detached-full-review-failed");
  const detachedPayload = JSON.parse(spawnSync(process.execPath, [verifierAbs, "--authority", AUTHORITY, "--review-envelope", envelopePath], { cwd: repo, encoding: "utf8" }).stdout);

  git(repo, ["symbolic-ref", "HEAD", EXPECTED_REF]);
  git(repo, ["reset", "--quiet", "--hard", EXPECTED_HEAD]);
  results.baseline.attachedFullReview = cli(repo, AUTHORITY, "review");
  if (results.baseline.attachedFullReview.exit !== 0) throw new Error("attached-full-review-failed");
  const attachedPayload = JSON.parse(spawnSync(process.execPath, [verifierAbs, "--authority", AUTHORITY, "--review-envelope", envelopePath], { cwd: repo, encoding: "utf8" }).stdout);
  delete detachedPayload.attachmentDiagnostic;
  delete attachedPayload.attachmentDiagnostic;
  results.baseline.attachedDetachedNormalizedEquivalent = JSON.stringify(detachedPayload) === JSON.stringify(attachedPayload);
  git(repo, ["checkout", "--quiet", "--detach", EXPECTED_HEAD]);

  const rawVariants = {
    absoluteRealpath: fs.realpathSync(authorityAbs),
    dotPrefix: `./${AUTHORITY}`,
    doubledDotPrefix: `././${AUTHORITY}`,
    embeddedDot: AUTHORITY.replace("/V111_", "/./V111_"),
    cancellingDotDot: `${path.posix.dirname(AUTHORITY)}/child/../${path.posix.basename(AUTHORITY)}`,
    nonCancellingDotDot: `${path.posix.dirname(AUTHORITY)}/../${path.posix.basename(AUTHORITY)}`,
    leadingDotDotCancellation: `docs/../docs/${AUTHORITY.slice("docs/".length)}`,
    duplicateSlash: AUTHORITY.replace("docs/", "docs//"),
    tripleSlash: AUTHORITY.replace("docs/", "docs///"),
    trailingSlash: `${AUTHORITY}/`,
    backslash: AUTHORITY.replaceAll("/", "\\"),
    percentEncoded: AUTHORITY.replace("V111", "%56%31%31%31"),
    percentLiteral: `${AUTHORITY}%25`,
    lowerCase: AUTHORITY.replace("V111", "v111"),
    upperDocs: AUTHORITY.replace("docs/", "DOCS/"),
    nfd: AUTHORITY.replace("V2_2.json", "V2_2-e\u0301.json"),
    fullwidthSolidus: AUTHORITY.replace("docs/", "docs\uff0f"),
    divisionSlash: AUTHORITY.replace("docs/", "docs\u2215"),
    zeroWidth: AUTHORITY.replace("V111", "V\u200b111"),
    bidiControl: AUTHORITY.replace("V111", "V\u202e111"),
    leadingSpace: ` ${AUTHORITY}`,
    trailingSpace: `${AUTHORITY} `,
    leadingTab: `\t${AUTHORITY}`,
    trailingNewline: `${AUTHORITY}\n`,
    carriageReturn: `${AUTHORITY}\r`,
    tilde: `~/${AUTHORITY}`,
    homeLiteral: `$HOME/${AUTHORITY}`,
    envAssignment: `AUTHORITY=${AUTHORITY}`,
    fileUrl: `file://${fs.realpathSync(authorityAbs)}`,
    empty: "",
    ordinaryLookalike: `${AUTHORITY}.json`,
  };
  for (const [name, raw] of Object.entries(rawVariants)) results.rawCli[name] = assertRawReject(name, cli(repo, raw));
  try {
    spawnSync(process.execPath, [verifierAbs, "--authority", `${AUTHORITY}\u0000suffix`, "--package-only"], { cwd: repo, encoding: "utf8" });
    throw new Error("nul-process-interface-did-not-reject");
  } catch (error) {
    results.rawCli.nul = { errorCode: error.code, rejectedBeforeCli: error.code === "ERR_INVALID_ARG_VALUE" };
  }

  const outside = path.join(temp, "not-a-git-repository");
  fs.mkdirSync(outside);
  results.ordering.invalidOutsideGit = assertRawReject("invalidOutsideGit", cli(repo, `./${AUTHORITY}`, "package", envelopePath, outside));
  results.ordering.canonicalOutsideGit = cli(repo, AUTHORITY, "package", envelopePath, outside);
  if (results.ordering.canonicalOutsideGit.diagnostic === "raw_authority_spelling_not_canonical") throw new Error("canonical-outside-git-stopped-at-raw-boundary");

  const ignored = path.join(repo, ".next", "reviewer-v22-unnamed");
  fs.mkdirSync(ignored, { recursive: true });
  const copyPath = path.join(ignored, "root-copy.json");
  fs.copyFileSync(authorityAbs, copyPath);
  const hardlinkPath = path.join(ignored, "root-hardlink.json");
  fs.linkSync(authorityAbs, hardlinkPath);
  const resealedPath = path.join(ignored, "root-resealed.json");
  const resealed = JSON.parse(authorityBytes);
  resealed.historicalEvidence[0].candidateCommit = "0".repeat(40);
  fs.writeFileSync(resealedPath, `${JSON.stringify(resealed)}\n`);
  results.alternateRoots.ignoredCopy = assertRawReject("ignoredCopy", cli(repo, path.relative(repo, copyPath).split(path.sep).join("/")));
  results.alternateRoots.ignoredHardlink = assertRawReject("ignoredHardlink", cli(repo, path.relative(repo, hardlinkPath).split(path.sep).join("/")));
  results.alternateRoots.ignoredResealed = assertRawReject("ignoredResealed", cli(repo, path.relative(repo, resealedPath).split(path.sep).join("/")));
  fs.rmSync(path.join(repo, ".next"), { recursive: true, force: true });

  const leaves = [
    "authorityBinding.authorityJcsSha256", "authorityBinding.fileSha256", "authorityBinding.path", "authorityBinding.role",
    "expectedGit.attachmentPolicy", "expectedGit.cleanRequired", "expectedGit.head", "expectedGit.parent", "expectedGit.ref", "expectedGit.tree",
    "provenance.createdAfterCandidateCommit", "provenance.ownerRole", "provenance.statement", "schemaId", "status", "version",
  ];
  for (const leaf of leaves) {
    let original = envelope;
    for (const segment of leaf.split(".")) original = original[segment];
    const mutated = setLeaf(envelope, leaf, changedLeaf(original));
    const file = path.join(temp, `envelope-${leaf.replaceAll(".", "-")}.json`);
    writeJson(file, mutated);
    results.envelopeLeaves.push({ leaf, outcome: cli(repo, AUTHORITY, "review", file), jcsInputSha256: sha256(Buffer.from(JSON.stringify(mutated), "utf8")) });
  }

  fs.writeFileSync(path.join(repo, "reviewer-visible-dirty.txt"), "dirty\n");
  results.gitAndMembership.dirty = cli(repo, AUTHORITY, "review");
  fs.rmSync(path.join(repo, "reviewer-visible-dirty.txt"));

  git(repo, ["update-ref", EXPECTED_REF, EXPECTED_PARENT]);
  results.gitAndMembership.movedRef = cli(repo, AUTHORITY, "review");
  git(repo, ["update-ref", EXPECTED_REF, EXPECTED_HEAD]);

  git(repo, ["checkout", "--quiet", "-b", "codex/reviewer-wrong-attachment", EXPECTED_HEAD]);
  results.gitAndMembership.wrongAttachment = cli(repo, AUTHORITY, "review");
  git(repo, ["checkout", "--quiet", "--detach", EXPECTED_HEAD]);

  fs.writeFileSync(authorityAbs, Buffer.concat([authorityBytes, Buffer.from(" \n")]));
  results.gitAndMembership.unstagedRootDrift = cli(repo, AUTHORITY);
  fs.writeFileSync(authorityAbs, authorityBytes);

  const originalRootBlob = git(repo, ["rev-parse", `HEAD:${AUTHORITY}`]);
  fs.writeFileSync(authorityAbs, Buffer.concat([authorityBytes, Buffer.from(" \n")]));
  git(repo, ["add", "--", AUTHORITY]);
  results.gitAndMembership.stagedRootDrift = cli(repo, AUTHORITY);
  fs.writeFileSync(authorityAbs, authorityBytes);
  git(repo, ["update-index", "--cacheinfo", "100644", originalRootBlob, AUTHORITY]);

  fs.writeFileSync(manifestAbs, Buffer.concat([manifestBytes, Buffer.from(" \n")]));
  results.gitAndMembership.manifestDrift = cli(repo, AUTHORITY);
  fs.writeFileSync(manifestAbs, manifestBytes);

  fs.rmSync(authorityAbs);
  fs.symlinkSync(path.relative(path.dirname(authorityAbs), profileAbs), authorityAbs);
  results.gitAndMembership.rootSymlink = cli(repo, AUTHORITY);
  fs.rmSync(authorityAbs);
  fs.writeFileSync(authorityAbs, authorityBytes);

  fs.rmSync(profileAbs);
  fs.linkSync(authorityAbs, profileAbs);
  results.gitAndMembership.rootProfileHardlink = cli(repo, AUTHORITY);
  fs.rmSync(profileAbs);
  fs.writeFileSync(profileAbs, profileBytes);

  const resolvedMutation = verifierBytes.toString("utf8").replace(
    "const rawAuthorityEvidence = validateRawAuthorityArgument(authorityArgument);",
    "const rawAuthorityEvidence = validateRawAuthorityArgument(AUTHORITY_PATH);"
  );
  fs.writeFileSync(verifierAbs, resolvedMutation);
  results.mutationKill.resolveBeforeValidation = cli(repo, `./${AUTHORITY}`);
  fs.writeFileSync(verifierAbs, verifierBytes);

  const helperOnlyMutation = verifierBytes.toString("utf8").replace(
    "const result = spawnSync(process.execPath, [verifierAbsolute, \"--authority\", rawAuthorityArgument, \"--package-only\"], {",
    "const result = { status: 1, pid: 1, stdout: \"\", stderr: \"Error: raw_authority_spelling_not_canonical\\n\" }; void verifierAbsolute; void rawAuthorityArgument; ({"
  );
  fs.writeFileSync(verifierAbs, helperOnlyMutation);
  results.mutationKill.helperOnly = cli(repo, AUTHORITY);
  fs.writeFileSync(verifierAbs, verifierBytes);

  const oldRepo = cloneAt("v21", OLD_HEAD);
  git(oldRepo, ["update-ref", "refs/heads/codex/phase-1b-stage4a-phase-b-v111-m01-replacement-design-remediation-v1", OLD_HEAD]);
  const oldAuthorityAbs = fs.realpathSync(path.join(oldRepo, OLD_AUTHORITY));
  const oldVariants = {
    exact: OLD_AUTHORITY,
    dotPrefix: `./${OLD_AUTHORITY}`,
    duplicateSlash: OLD_AUTHORITY.replace("docs/", "docs//"),
    absoluteRealpath: oldAuthorityAbs,
  };
  for (const [name, raw] of Object.entries(oldVariants)) results.oldDefect[name] = cli(oldRepo, raw, "package", envelopePath, oldRepo, OLD_VERIFIER);

  results.finalState.cloneClean = git(repo, ["status", "--porcelain=v1", "--untracked-files=all"]) === "";
  results.finalState.formalSourceHead = git(sourceRepo, ["rev-parse", "HEAD"]);
  results.finalState.formalSourceStatusClean = git(sourceRepo, ["status", "--porcelain=v1", "--untracked-files=all"]) === "";
  const output = `${JSON.stringify(results, null, 2)}\n`;
  if (outputArg) fs.writeFileSync(outputArg, output);
  else process.stdout.write(output);
} finally {
  fs.rmSync(temp, { recursive: true, force: true });
}
