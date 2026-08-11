#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runInNewContext } from "node:vm";

const evidenceDir = dirname(fileURLToPath(import.meta.url));
const analysisRoot = resolve(evidenceDir, "../../..");
const V114_COMMIT = "aac9169c507f0976a492d61a30d415a27c95e4b1";
const V114_PARENT = "089a49367999c7a30e807320257d40fdbabca835";
const V114_TREE = "0057dbb7aef80f8d54649405d60a16baae94b08e";
const V114_REF = "refs/heads/codex/phase-1b-stage4a-phase-b-corrected-exact-design-v1-14";
const CHECKPOINT_REF = "refs/heads/codex/checkpoint/phase-1b-stage4a-phase-b-v111-m01-three-strike-analysis-pre-l3-v1";
const CHECKPOINT_COMMIT = "0793948ad115c19f852a9590387ed9ba06738a39";
const EVIDENCE_RELATIVE = "docs/review-evidence/phase-1b-stage4a-phase-b-corrected-exact-design-v1-14-v111-m01-final-attempt-3-v1";
const DESIGN_RELATIVE = "docs/PHASE_1B_STAGE4A_PHASE_B_PROVIDER_NEUTRAL_FOUNDATION_CORRECTED_EXACT_DESIGN_V1_14.md";
const VERIFIER_RELATIVE = `${EVIDENCE_RELATIVE}/VERIFY_CORRECTED_EXACT_DESIGN_V1_14.mjs`;
const SUBJECT_RELATIVE = `${EVIDENCE_RELATIVE}/CURRENT_AUTHORITY_SUBJECT_V1_0.json`;
const IDENTITY_RELATIVE = `${EVIDENCE_RELATIVE}/CURRENT_AUTHORITY_IDENTITY_V1_0.json`;
const ENVELOPE_RELATIVE = `${EVIDENCE_RELATIVE}/CANDIDATE_REVIEW_ENVELOPE_V1_0.json`;
const V113_MANIFEST_RELATIVE = "docs/review-evidence/phase-1b-stage4a-phase-b-corrected-exact-design-v1-13-v111-m01-attempt-2-v1/SHA256SUMS.txt";
const V113_SEAL_RELATIVE = "docs/review-evidence/phase-1b-stage4a-phase-b-corrected-exact-design-v1-13-v111-m01-attempt-2-v1/SEAL_SHA256SUMS.txt";

function parseArgs(argv) {
  const parsed = { repo: analysisRoot };
  for (let index = 0; index < argv.length; index += 1) {
    assert.equal(argv[index], "--repo", `unknown argument ${argv[index]}`);
    assert.ok(argv[index + 1], "--repo value required");
    parsed.repo = resolve(argv[index + 1]);
    index += 1;
  }
  return parsed;
}

function command(file, args, options = {}) {
  return execFileSync(file, args, {
    cwd: options.cwd,
    encoding: "utf8",
    env: options.env ?? process.env,
    stdio: options.stdio ?? ["ignore", "pipe", "pipe"]
  }).trim();
}

function git(cwd, ...args) {
  return command("git", args, { cwd });
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
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

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function expectedView(subject) {
  const contract = subject.designViewContract;
  const view = {
    checkpointRoles: contract.checkpointRoles,
    identityRole: contract.identityRole,
    proofRoles: contract.proofRoles,
    schemaId: contract.schemaId,
    subjectJcsSha256: subject.subjectJcsSha256,
    subjectRole: contract.subjectRole,
    viewProjectionSha256: "",
    viewVersion: contract.viewVersion
  };
  const copy = clone(view);
  delete copy.viewProjectionSha256;
  view.viewProjectionSha256 = sha256(jcs(copy));
  return view;
}

function shippedMarkdownFunction(verifierSource) {
  const start = verifierSource.indexOf("function markdownAuthorityView");
  const end = verifierSource.indexOf("function validateSubject", start);
  assert.ok(start >= 0 && end > start, "exact shipped Markdown function boundaries");
  const exactSource = verifierSource.slice(start, end);
  const executableSource = exactSource.trim();
  const fn = runInNewContext(`${executableSource}\nmarkdownAuthorityView`, {
    assert,
    expectedView,
    strictJson
  });
  assert.equal(typeof fn, "function");
  return { fn, sourceSha256: sha256(exactSource) };
}

function boundedCommonMarkFences(markdown) {
  const lines = markdown.replaceAll("\r\n", "\n").split("\n");
  const fences = [];
  for (let index = 0; index < lines.length; index += 1) {
    const opening = lines[index].match(/^( {0,3})(`{3,}|~{3,})(.*)$/);
    if (!opening) continue;
    const indent = opening[1].length;
    const delimiter = opening[2];
    const marker = delimiter[0];
    const info = opening[3].trim();
    if (marker === "`" && info.includes("`")) continue;
    let closing = -1;
    for (let cursor = index + 1; cursor < lines.length; cursor += 1) {
      const candidate = lines[cursor].match(/^( {0,3})(`{3,}|~{3,})[ \t]*$/);
      if (candidate && candidate[2][0] === marker && candidate[2].length >= delimiter.length) {
        closing = cursor;
        break;
      }
    }
    if (closing < 0) continue;
    const body = lines.slice(index + 1, closing)
      .map((line) => line.startsWith(" ".repeat(indent)) ? line.slice(indent) : line)
      .join("\n");
    fences.push({ body, info, openingLine: index + 1, closingLine: closing + 1 });
    index = closing;
  }
  return fences;
}

function declarationCounts(markdown, subject) {
  let exactMachineViews = 0;
  let reservedDeclarations = 0;
  for (const fence of boundedCommonMarkFences(markdown)) {
    if (fence.info === subject.designViewContract.fenceInfoString) {
      strictJson(fence.body.trim(), "bounded CommonMark machine view");
      exactMachineViews += 1;
    }
    if (/^(?:json|application\/json)(?:\s|$)/.test(fence.info)) {
      try {
        const value = strictJson(fence.body.trim(), "bounded CommonMark JSON");
        if (Object.hasOwn(value, subject.designViewContract.reservedMachineDeclarationKey)) reservedDeclarations += 1;
      } catch {
        // Malformed ordinary JSON fences are not part of these bounded witnesses.
      }
    }
  }
  return { exactMachineViews, reservedDeclarations };
}

function locateNodeModules(repo) {
  const worktrees = git(repo, "worktree", "list", "--porcelain")
    .split("\n")
    .flatMap((line) => line.startsWith("worktree ") ? [line.slice(9)] : []);
  for (const worktree of worktrees) {
    const candidate = join(worktree, "node_modules", "typescript", "lib", "typescript.js");
    if (existsSync(candidate)) return join(worktree, "node_modules");
  }
  throw new Error("already-installed local TypeScript not found; installation is prohibited");
}

function cloneExact(source, target) {
  command("git", ["clone", "--shared", "--no-checkout", "--", source, target], { cwd: dirname(target) });
  git(target, "checkout", "--detach", V114_COMMIT);
  assert.equal(git(target, "rev-parse", "HEAD"), V114_COMMIT);
  assert.equal(git(target, "rev-parse", "HEAD^"), V114_PARENT);
  assert.equal(git(target, "rev-parse", "HEAD^{tree}"), V114_TREE);
  assert.equal(git(target, "status", "--porcelain=v1", "--untracked-files=all"), "");
}

function runEnvelopeAndRefWitness(baseline, mutationRepo, nodeModules) {
  command("git", ["clone", "--shared", "--no-checkout", "--", baseline, mutationRepo], { cwd: dirname(mutationRepo) });
  git(mutationRepo, "checkout", "--detach", V114_COMMIT);
  const actualRef = "refs/heads/codex/v111-m01-repro-actual-review";
  const envelopeRef = "refs/heads/codex/v111-m01-repro-envelope-copy";
  git(mutationRepo, "switch", "-c", actualRef.slice("refs/heads/".length));
  symlinkSync(nodeModules, join(mutationRepo, "node_modules"), "dir");

  const envelopePath = join(mutationRepo, ENVELOPE_RELATIVE);
  const envelope = strictJson(readFileSync(envelopePath, "utf8"), "review envelope");
  envelope.exactReviewCli.expectedRef = envelopeRef;
  envelope.contentSeal.commit = "0".repeat(40);
  envelope.contentSeal.parent = "1".repeat(40);
  envelope.contentSeal.tree = "2".repeat(40);
  envelope.canonicalAuthority.fileSha256 = "3".repeat(64);
  envelope.canonicalAuthority.identityJcsSha256 = "4".repeat(64);
  writeFileSync(envelopePath, `${JSON.stringify(envelope, null, 2)}\n`);
  git(mutationRepo, "add", "--", ENVELOPE_RELATIVE);

  const fixedEnvironment = {
    ...process.env,
    GIT_AUTHOR_DATE: "2000-01-01T00:00:00Z",
    GIT_COMMITTER_DATE: "2000-01-01T00:00:00Z"
  };
  command("git", [
    "-c", "core.hooksPath=/dev/null",
    "-c", "user.name=CWT Deterministic Repro",
    "-c", "user.email=repro@invalid.example",
    "commit", "-m", "repro: mutate ignored candidate review envelope"
  ], { cwd: mutationRepo, env: fixedEnvironment });

  const observed = {
    ref: actualRef,
    head: git(mutationRepo, "rev-parse", "HEAD"),
    tree: git(mutationRepo, "rev-parse", "HEAD^{tree}"),
    parent: git(mutationRepo, "rev-parse", "HEAD^"),
    clean: git(mutationRepo, "status", "--porcelain=v1", "--untracked-files=all") === ""
  };
  assert.equal(observed.clean, true);

  const verifierPath = join(mutationRepo, VERIFIER_RELATIVE);
  const output = command(process.execPath, [
    verifierPath,
    "--expected-ref", actualRef,
    "--expected-head", observed.head,
    "--expected-tree", observed.tree,
    "--expected-parent", observed.parent
  ], { cwd: mutationRepo });
  const parsedOutput = strictJson(`${output}\n`, "mutated-envelope verifier output");
  assert.equal(parsedOutput.ok, true);

  const subject = strictJson(readFileSync(join(mutationRepo, SUBJECT_RELATIVE), "utf8"), "subject");
  const identity = strictJson(readFileSync(join(mutationRepo, IDENTITY_RELATIVE), "utf8"), "identity");
  assert.equal(subject.currentRoleDefinitions.candidateRefIdentity.ref, identity.candidateRefIdentity.ref);
  assert.notEqual(identity.candidateRefIdentity.ref, actualRef);
  assert.notEqual(envelope.exactReviewCli.expectedRef, actualRef);
  assert.notEqual(envelope.exactReviewCli.expectedRef, identity.candidateRefIdentity.ref);
  assert.notEqual(envelope.contentSeal.commit, observed.head);
  assert.notEqual(envelope.contentSeal.tree, observed.tree);
  assert.notEqual(envelope.contentSeal.parent, observed.parent);

  const verifierSource = readFileSync(verifierPath, "utf8");
  const exactFilenameOccurrences = verifierSource.split("CANDIDATE_REVIEW_ENVELOPE_V1_0.json").length - 1;
  const envelopePathBindingPresent = /paths\.(?:candidate)?reviewEnvelope|paths\.envelope/i.test(verifierSource);
  assert.equal(exactFilenameOccurrences, 0);
  assert.equal(envelopePathBindingPresent, false);

  return {
    actualVerifierExit: 0,
    actualVerifierOutputSha256: sha256(`${output}\n`),
    argsExpectedRef: actualRef,
    sealedCandidateRef: identity.candidateRefIdentity.ref,
    envelopeExpectedRef: envelope.exactReviewCli.expectedRef,
    allThreeRefCopiesDiffer: new Set([
      actualRef,
      identity.candidateRefIdentity.ref,
      envelope.exactReviewCli.expectedRef
    ]).size === 3,
    observedGit: observed,
    mutatedEnvelope: {
      commit: envelope.contentSeal.commit,
      tree: envelope.contentSeal.tree,
      parent: envelope.contentSeal.parent,
      allGitFieldsMismatchObserved: [
        envelope.contentSeal.commit !== observed.head,
        envelope.contentSeal.tree !== observed.tree,
        envelope.contentSeal.parent !== observed.parent
      ].every(Boolean)
    },
    verifierReadsEnvelopeFilename: exactFilenameOccurrences > 0,
    verifierHasEnvelopePathBinding: envelopePathBindingPresent,
    conclusion: "PASS proves the shipped verifier accepts divergent sealed-ref, args-ref, envelope-ref, HEAD/tree/parent and envelope authority hashes"
  };
}

const args = parseArgs(process.argv.slice(2));
const sourceRepo = args.repo;
const sourceStatusBefore = git(sourceRepo, "status", "--porcelain=v1", "--untracked-files=all");
assert.equal(git(sourceRepo, "rev-parse", CHECKPOINT_REF), CHECKPOINT_COMMIT);
assert.equal(git(sourceRepo, "rev-parse", V114_REF), V114_COMMIT);
const nodeModules = locateNodeModules(sourceRepo);
const temporary = mkdtempSync(join(tmpdir(), "cwt-v111-m01-repro-"));

try {
  const baseline = join(temporary, "v114-baseline");
  const mutationRepo = join(temporary, "v114-envelope-mutation");
  cloneExact(sourceRepo, baseline);

  const design = readFileSync(join(baseline, DESIGN_RELATIVE), "utf8");
  const subjectBytes = readFileSync(join(baseline, SUBJECT_RELATIVE));
  const identityBytes = readFileSync(join(baseline, IDENTITY_RELATIVE));
  const verifierBytes = readFileSync(join(baseline, VERIFIER_RELATIVE));
  const subject = strictJson(subjectBytes.toString("utf8"), "subject");
  const verifierSource = verifierBytes.toString("utf8");
  const shipped = shippedMarkdownFunction(verifierSource);
  const baselineView = shipped.fn(design, subject);
  const baselineCounts = declarationCounts(design, subject);
  assert.deepEqual(baselineCounts, { exactMachineViews: 1, reservedDeclarations: 0 });

  const renderedView = JSON.stringify(baselineView);
  const witnesses = [
    {
      id: "one-space-indented-exact-machine-view",
      markdown: ` \`\`\`${subject.designViewContract.fenceInfoString}\n ${renderedView}\n \`\`\``,
      expectedViews: 2,
      expectedReserved: 0
    },
    {
      id: "three-space-indented-exact-machine-view",
      markdown: `   \`\`\`${subject.designViewContract.fenceInfoString}\n   ${renderedView}\n   \`\`\``,
      expectedViews: 2,
      expectedReserved: 0
    },
    {
      id: "longer-valid-closing-fence",
      markdown: `\`\`\`${subject.designViewContract.fenceInfoString}\n${renderedView}\n\`\`\`\``,
      expectedViews: 2,
      expectedReserved: 0
    },
    {
      id: "indented-tilde-exact-machine-view",
      markdown: `  ~~~${subject.designViewContract.fenceInfoString}\n  ${renderedView}\n  ~~~`,
      expectedViews: 2,
      expectedReserved: 0
    },
    {
      id: "indented-reserved-second-seal-json",
      markdown: `   \`\`\`json\n   {"${subject.designViewContract.reservedMachineDeclarationKey}":{"role":"secondSeal"}}\n   \`\`\``,
      expectedViews: 1,
      expectedReserved: 1
    }
  ].map((witness) => {
    const mutated = `${design}\n${witness.markdown}\n`;
    const shippedResult = shipped.fn(mutated, subject);
    const structural = declarationCounts(mutated, subject);
    assert.deepEqual(shippedResult, baselineView, witness.id);
    assert.equal(structural.exactMachineViews, witness.expectedViews, `${witness.id} exact views`);
    assert.equal(structural.reservedDeclarations, witness.expectedReserved, `${witness.id} reserved declarations`);
    return {
      id: witness.id,
      commonMarkExactMachineViews: structural.exactMachineViews,
      commonMarkReservedDeclarations: structural.reservedDeclarations,
      requiredContractResult: "reject",
      shippedGateAccepted: true
    };
  });

  const identityGraphWitness = runEnvelopeAndRefWitness(baseline, mutationRepo, nodeModules);
  assert.equal(identityGraphWitness.actualVerifierOutputSha256, "6bb75954946d411fc1fc85923a2fac08bfbc0c37cd0c0dd763b1bd719fcc9f17");

  const sectionStart = design.indexOf("#### 20.0.5 Required immutable and historical inputs");
  const sectionEnd = design.indexOf("\n#### ", sectionStart + 5);
  assert.ok(sectionStart >= 0 && sectionEnd > sectionStart);
  const section = design.slice(sectionStart, sectionEnd);
  const v113 = section.match(/V1\.13 Candidate \/ seal[^\n]*manifest SHA-256 `([0-9a-f]{64})`[^\n]*seal SHA-256 `([0-9a-f]{64})`/);
  assert.ok(v113, "V1.13 rendered manifest/seal row");
  const actualManifest = sha256(readFileSync(join(baseline, V113_MANIFEST_RELATIVE)));
  const actualSeal = sha256(readFileSync(join(baseline, V113_SEAL_RELATIVE)));
  assert.notEqual(v113[1], actualManifest);
  assert.notEqual(v113[2], actualSeal);

  const sourceStatusAfter = git(sourceRepo, "status", "--porcelain=v1", "--untracked-files=all");
  assert.equal(sourceStatusAfter, sourceStatusBefore);
  assert.equal(git(sourceRepo, "rev-parse", CHECKPOINT_REF), CHECKPOINT_COMMIT);

  const result = {
    baseline: {
      commit: V114_COMMIT,
      parent: V114_PARENT,
      tree: V114_TREE,
      cleanDetachedExactSnapshot: true,
      designSha256: sha256(design),
      subjectFileSha256: sha256(subjectBytes),
      identityFileSha256: sha256(identityBytes),
      verifierSha256: sha256(verifierBytes)
    },
    commonMark: {
      boundedStructuralRule: "CommonMark fenced blocks relevant here: opening and closing indentation 0..3 spaces; closing delimiter length >= opener; backtick and tilde fences",
      shippedFunctionSourceSha256: shipped.sourceSha256,
      witnesses
    },
    gitAndReviewIdentity: identityGraphWitness,
    renderedGateDrift: {
      section: "20.0.5",
      v113Manifest: { rendered: v113[1], actual: actualManifest, drift: v113[1] !== actualManifest },
      v113Seal: { rendered: v113[2], actual: actualSeal, drift: v113[2] !== actualSeal }
    },
    isolation: {
      dependencyInstallCalls: 0,
      networkCalls: 0,
      packageManagerCalls: 0,
      providerCalls: 0,
      sourceRepositoryStatusStable: true,
      checkpointRefUnchanged: true,
      disposableRepositoriesRemovedOnExit: true
    },
    ok: true,
    rootDisposition: "all eight required witnesses are different manifestations of presentation-sensitive scanning plus an unclosed multi-copy identity graph"
  };
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
} finally {
  rmSync(temporary, { recursive: true, force: true });
}
