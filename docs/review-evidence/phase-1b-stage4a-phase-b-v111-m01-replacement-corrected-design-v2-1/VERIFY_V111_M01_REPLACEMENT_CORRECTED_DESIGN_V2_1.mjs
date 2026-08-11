import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { execFileSync } from "node:child_process";
import { pathToFileURL } from "node:url";

const EXPECTED_NODE = "24.14.0";
const EXPECTED_REF = "refs/heads/codex/phase-1b-stage4a-phase-b-v111-m01-replacement-design-remediation-v1";
const AUTHORITY_SCHEMA_ID = "cwt.phase1b.stage4a.phaseb.v111-m01.canonical-review-authority.v2_1";
const VERIFIER_SCHEMA_ID = "cwt.phase1b.stage4a.phaseb.v111-m01.replacement-verifier.v2_1";
const ENVELOPE_SCHEMA_ID = "cwt.phase1b.stage4a.phaseb.v111-m01.candidate-review-envelope.v2";
const PROFILE_ID = "cwt.phase1b.stage4a.phaseb.v111-m01.replacement-current-technical-profile.v2_1";
const PROFILE_VERSION = "2.1.0";
const CANDIDATE_STATUS = "v2-m01-remediation-corrected-design-candidate-awaiting-fresh-independent-review-not-implementation-authority";
const PACKAGE_DIR = "docs/review-evidence/phase-1b-stage4a-phase-b-v111-m01-replacement-corrected-design-v2-1";
const AUTHORITY_PATH = `${PACKAGE_DIR}/V111_M01_CANONICAL_REVIEW_AUTHORITY_V2_1.json`;
const MANIFEST_PATH = `${PACKAGE_DIR}/SHA256SUMS.txt`;
const PACKAGE_CAPTURE_PATH = `${PACKAGE_DIR}/PACKAGE_ONLY_VERIFICATION_OUTPUT_V2_1.txt`;
const MUTATION_CAPTURE_PATH = `${PACKAGE_DIR}/SCHEMA_PROPERTY_MUTATION_OUTPUT_V2_1.txt`;
const BOUNDARY_CAPTURE_PATH = `${PACKAGE_DIR}/IDENTITY_JOIN_FRESH_NEGATIVE_OUTPUT_V2_1.txt`;

function fail(code, detail = "") {
  throw new Error(detail ? `${code}:${detail}` : code);
}

function sha256(bytes) {
  return crypto.createHash("sha256").update(bytes).digest("hex");
}

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value) && Object.getPrototypeOf(value) === Object.prototype;
}

function assertIJsonString(value, label) {
  for (let index = 0; index < value.length; index += 1) {
    const unit = value.charCodeAt(index);
    if (unit >= 0xd800 && unit <= 0xdbff) {
      const next = value.charCodeAt(index + 1);
      if (!(next >= 0xdc00 && next <= 0xdfff)) fail("invalid-unicode", label);
      index += 1;
    } else if (unit >= 0xdc00 && unit <= 0xdfff) {
      fail("invalid-unicode", label);
    }
  }
}

export function jcs(value) {
  if (value === null || typeof value === "boolean") return JSON.stringify(value);
  if (typeof value === "string") {
    assertIJsonString(value, "jcs-string");
    return JSON.stringify(value);
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value)) fail("non-finite-number");
    if (Number.isInteger(value) && !Number.isSafeInteger(value)) fail("unsafe-integer");
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) return `[${value.map(jcs).join(",")}]`;
  if (isPlainObject(value)) {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${jcs(value[key])}`).join(",")}}`;
  }
  fail("unsupported-jcs-value");
}

function strictJsonParse(bytes, label, canonicalRequired = false) {
  const decoder = new TextDecoder("utf-8", { fatal: true, ignoreBOM: false });
  let text;
  try {
    text = decoder.decode(bytes);
  } catch {
    fail("invalid-utf8", label);
  }
  if (text.charCodeAt(0) === 0xfeff) fail("bom-forbidden", label);
  let cursor = 0;

  const skipWhitespace = () => {
    while (cursor < text.length && /[\x20\x09\x0a\x0d]/.test(text[cursor])) cursor += 1;
  };

  const parseString = () => {
    const start = cursor;
    if (text[cursor] !== "\"") fail("expected-string", label);
    cursor += 1;
    while (cursor < text.length) {
      const code = text.charCodeAt(cursor);
      if (code === 0x22) {
        cursor += 1;
        const raw = text.slice(start, cursor);
        let decoded;
        try {
          decoded = JSON.parse(raw);
        } catch {
          fail("invalid-json-string", label);
        }
        assertIJsonString(decoded, label);
        return decoded;
      }
      if (code === 0x5c) {
        cursor += 1;
        if (cursor >= text.length) fail("truncated-escape", label);
        if (text[cursor] === "u") {
          if (!/^[0-9a-fA-F]{4}$/.test(text.slice(cursor + 1, cursor + 5))) fail("invalid-unicode-escape", label);
          cursor += 5;
        } else {
          if (!/["\\/bfnrt]/.test(text[cursor])) fail("invalid-escape", label);
          cursor += 1;
        }
        continue;
      }
      if (code <= 0x1f) fail("raw-control-in-string", label);
      cursor += 1;
    }
    fail("unterminated-string", label);
  };

  const parseNumber = () => {
    const match = text.slice(cursor).match(/^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?/);
    if (!match) fail("invalid-number", label);
    cursor += match[0].length;
    const value = Number(match[0]);
    if (!Number.isFinite(value)) fail("non-finite-number", label);
    if (Number.isInteger(value) && !Number.isSafeInteger(value)) fail("unsafe-integer", label);
    return value;
  };

  const parseValue = (depth = 0) => {
    if (depth > 256) fail("json-depth", label);
    skipWhitespace();
    const char = text[cursor];
    if (char === "\"") return parseString();
    if (char === "{") {
      cursor += 1;
      const object = {};
      const decodedNames = new Set();
      skipWhitespace();
      if (text[cursor] === "}") {
        cursor += 1;
        return object;
      }
      while (true) {
        skipWhitespace();
        const key = parseString();
        if (decodedNames.has(key)) fail("duplicate-decoded-member", `${label}:${key}`);
        decodedNames.add(key);
        skipWhitespace();
        if (text[cursor] !== ":") fail("missing-colon", label);
        cursor += 1;
        object[key] = parseValue(depth + 1);
        skipWhitespace();
        if (text[cursor] === "}") {
          cursor += 1;
          return object;
        }
        if (text[cursor] !== ",") fail("missing-comma", label);
        cursor += 1;
      }
    }
    if (char === "[") {
      cursor += 1;
      const array = [];
      skipWhitespace();
      if (text[cursor] === "]") {
        cursor += 1;
        return array;
      }
      while (true) {
        array.push(parseValue(depth + 1));
        skipWhitespace();
        if (text[cursor] === "]") {
          cursor += 1;
          return array;
        }
        if (text[cursor] !== ",") fail("missing-array-comma", label);
        cursor += 1;
      }
    }
    if (text.startsWith("true", cursor)) {
      cursor += 4;
      return true;
    }
    if (text.startsWith("false", cursor)) {
      cursor += 5;
      return false;
    }
    if (text.startsWith("null", cursor)) {
      cursor += 4;
      return null;
    }
    return parseNumber();
  };

  const value = parseValue();
  skipWhitespace();
  if (cursor !== text.length) fail("trailing-json-bytes", label);
  if (canonicalRequired && text !== `${jcs(value)}\n`) fail("noncanonical-jcs-bytes", label);
  return { text, value };
}

function exactKeys(value, keys, label) {
  if (!isPlainObject(value)) fail("expected-object", label);
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  if (jcs(actual) !== jcs(expected)) fail("closed-schema", `${label}:${actual.join(",")}`);
}

function clone(value) {
  return structuredClone(value);
}

function expectReject(id, operation) {
  let rejected = false;
  try {
    operation();
  } catch {
    rejected = true;
  }
  if (!rejected) fail("mutation-did-not-reject", id);
  return id;
}

function git(repoRoot, args, allowFailure = false) {
  try {
    return execFileSync("git", args, { cwd: repoRoot, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trimEnd();
  } catch (error) {
    if (allowFailure) return null;
    throw error;
  }
}

function repoRootFrom(start) {
  return git(start, ["rev-parse", "--show-toplevel"]);
}

function validateRepoPath(repoPath, label) {
  if (typeof repoPath !== "string" || repoPath.length === 0) fail("invalid-path", label);
  if (repoPath !== repoPath.normalize("NFC")) fail("path-not-nfc", label);
  if (path.posix.isAbsolute(repoPath) || repoPath.startsWith("/")) fail("absolute-path", label);
  if (repoPath.includes("\\")) fail("backslash-path", label);
  if (repoPath.includes("%")) fail("percent-path", label);
  if (/[\u0000-\u001f\u007f]/.test(repoPath)) fail("control-path", label);
  const segments = repoPath.split("/");
  if (segments.some((segment) => segment === "")) fail("duplicate-slash", label);
  if (segments.some((segment) => segment === ".")) fail("dot-segment", label);
  if (segments.some((segment) => segment === "..")) fail("dot-dot-segment", label);
  return repoPath;
}

function resolveCaseExact(repoRoot, repoPath) {
  let current = repoRoot;
  for (const segment of repoPath.split("/")) {
    const names = fs.readdirSync(current);
    if (!names.includes(segment)) fail("path-case-or-missing", repoPath);
    current = path.join(current, segment);
  }
  return current;
}

function existingTrackedRegular(repoRoot, repoPath) {
  validateRepoPath(repoPath, repoPath);
  const absolute = resolveCaseExact(repoRoot, repoPath);
  const stat = fs.lstatSync(absolute);
  if (stat.isSymbolicLink() || !stat.isFile()) fail("not-regular-file", repoPath);
  const resolved = fs.realpathSync(absolute);
  const prefix = `${fs.realpathSync(repoRoot)}${path.sep}`;
  if (!resolved.startsWith(prefix)) fail("path-escape", repoPath);
  if (git(repoRoot, ["ls-files", "--error-unmatch", "--", repoPath], true) === null) fail("untracked-role", repoPath);
  return { absolute, dev: stat.dev, ino: stat.ino, repoPath };
}

function validatePhysicalEntries(entries) {
  const identities = new Set();
  for (const entry of entries) {
    if (entry.kind === "symlink") fail("physical-symlink", entry.path);
    if (entry.kind !== "file") fail("physical-nonfile", entry.path);
    const identity = `${entry.dev}:${entry.ino}`;
    if (identities.has(identity)) fail("physical-alias", entry.path);
    identities.add(identity);
  }
}

function validateExactAuthorityPath(actualPath, expectedPath = AUTHORITY_PATH) {
  validateRepoPath(actualPath, "authority-path");
  if (actualPath !== expectedPath) fail("authority-path-not-canonical", `${actualPath}->${expectedPath}`);
}

function validateHeadBinding(observation, label = "authority") {
  exactKeys(observation, [
    "headBlobSha256", "headExists", "headMode", "headPath", "headType",
    "indexBlobSha256", "indexMode", "indexPath", "indexStage", "repoPath",
    "worktreeKind", "worktreePath", "worktreeSha256"
  ], `${label}-head-binding`);
  if (observation.headExists !== true) fail(`${label}-head-missing`, observation.repoPath);
  if (observation.headPath !== observation.repoPath) fail(`${label}-head-path`, observation.headPath);
  if (observation.headMode !== "100644") fail(`${label}-head-mode`, observation.headMode);
  if (observation.headType !== "blob") fail(`${label}-head-type`, observation.headType);
  if (observation.indexPath !== observation.repoPath || observation.indexStage !== 0) fail(`${label}-index-path-or-stage`, observation.indexPath);
  if (observation.indexMode !== "100644") fail(`${label}-index-mode`, observation.indexMode);
  if (observation.worktreePath !== observation.repoPath) fail(`${label}-worktree-path`, observation.worktreePath);
  if (observation.worktreeKind === "symlink") fail(`${label}-worktree-symlink`, observation.repoPath);
  if (observation.worktreeKind !== "file") fail(`${label}-worktree-kind`, observation.worktreeKind);
  if (observation.indexBlobSha256 !== observation.headBlobSha256) fail(`${label}-index-differs-head`, observation.repoPath);
  if (observation.worktreeSha256 !== observation.headBlobSha256) fail(`${label}-worktree-differs-head`, observation.repoPath);
}

function readExactHeadTrackedRegular(repoRoot, repoPath, label) {
  validateRepoPath(repoPath, label);
  const treeLine = git(repoRoot, ["ls-tree", "--full-tree", "HEAD", "--", repoPath]);
  if (treeLine === "") {
    validateHeadBinding({
      headBlobSha256: "", headExists: false, headMode: "", headPath: repoPath,
      headType: "", indexBlobSha256: "", indexMode: "", indexPath: repoPath,
      indexStage: 0, repoPath, worktreeKind: "missing", worktreePath: repoPath,
      worktreeSha256: ""
    }, label);
  }
  const treeLines = treeLine.split("\n");
  if (treeLines.length !== 1) fail(`${label}-head-cardinality`, repoPath);
  const treeMatch = treeLines[0].match(/^([0-9]{6}) ([a-z]+) ([0-9a-f]{40})\t(.+)$/);
  if (!treeMatch) fail(`${label}-head-entry`, repoPath);
  const [, headMode, headType, headObject, headPath] = treeMatch;
  const headBytes = execFileSync("git", ["cat-file", "blob", headObject], { cwd: repoRoot, stdio: ["ignore", "pipe", "pipe"] });

  const indexLine = git(repoRoot, ["ls-files", "--stage", "--", repoPath]);
  const indexLines = indexLine === "" ? [] : indexLine.split("\n");
  if (indexLines.length !== 1) fail(`${label}-index-cardinality`, repoPath);
  const indexMatch = indexLines[0].match(/^([0-9]{6}) ([0-9a-f]{40}) ([0-3])\t(.+)$/);
  if (!indexMatch) fail(`${label}-index-entry`, repoPath);
  const [, indexMode, indexObject, indexStageRaw, indexPath] = indexMatch;
  const indexBytes = execFileSync("git", ["cat-file", "blob", indexObject], { cwd: repoRoot, stdio: ["ignore", "pipe", "pipe"] });

  const absolute = resolveCaseExact(repoRoot, repoPath);
  const stat = fs.lstatSync(absolute);
  const worktreeKind = stat.isSymbolicLink() ? "symlink" : stat.isFile() ? "file" : "other";
  const resolved = fs.realpathSync(absolute);
  const repoPrefix = `${fs.realpathSync(repoRoot)}${path.sep}`;
  if (!resolved.startsWith(repoPrefix)) fail(`${label}-path-escape`, repoPath);
  const worktreeBytes = fs.readFileSync(absolute);
  const observation = {
    headBlobSha256: sha256(headBytes),
    headExists: true,
    headMode,
    headPath,
    headType,
    indexBlobSha256: sha256(indexBytes),
    indexMode,
    indexPath,
    indexStage: Number(indexStageRaw),
    repoPath,
    worktreeKind,
    worktreePath: repoPath,
    worktreeSha256: sha256(worktreeBytes)
  };
  validateHeadBinding(observation, label);
  if (headObject !== indexObject) fail(`${label}-index-object-differs-head`, repoPath);
  return {
    absolute,
    bytes: worktreeBytes,
    dev: stat.dev,
    headBytes,
    headObject,
    ino: stat.ino,
    kind: worktreeKind,
    observation,
    path: repoPath,
    realpath: resolved,
    repoPath
  };
}

function validateRootManifestJoin(entries, authorityObservation) {
  const rootEntries = entries.filter((entry) => entry.path === AUTHORITY_PATH);
  if (rootEntries.length !== 1) fail("manifest-root-entry-cardinality", String(rootEntries.length));
  if (rootEntries[0].hash !== authorityObservation.headBlobSha256) fail("manifest-root-hash", AUTHORITY_PATH);
}

function addPhysicalEntry(byPath, entry) {
  const prior = byPath.get(entry.repoPath);
  if (prior) {
    if (prior.dev !== entry.dev || prior.ino !== entry.ino || prior.realpath !== entry.realpath) fail("physical-same-path-identity-drift", entry.repoPath);
    return;
  }
  byPath.set(entry.repoPath, entry);
}

const ROOT_KEYS = [
  "authorityId", "authorityVersion", "canonicalization", "checkpoints", "closedReplacementEvidence",
  "currentRoles", "frozenInputs", "historicalEvidence", "proofContracts",
  "roleGraph", "rolePolicy", "seal", "status", "subject"
];

const EXPECTED_GRAPH = {
  authorityRoot: ["embeddedSubject", "renderedDesign", "currentTechnicalProfile", "currentVerifier", "proofContracts", "checkpoints", "frozenInputs", "historicalEvidence", "closedReplacementEvidence"],
  checkpoints: [],
  closedReplacementEvidence: [],
  currentTechnicalProfile: [],
  currentVerifier: [],
  embeddedSubject: ["renderedDesign", "currentTechnicalProfile", "currentVerifier"],
  frozenInputs: [],
  historicalEvidence: [],
  proofContracts: ["currentTechnicalProfile"],
  renderedDesign: []
};

function validateProofContract(contract) {
  exactKeys(contract, ["contractSubtreeSha256", "filename", "futureRequiredAtDesignTime", "jcsContract", "outputPath", "profileId", "profileVersion", "role", "schemaVersion"], `proof:${contract?.role}`);
  const withoutHash = { ...contract };
  delete withoutHash.contractSubtreeSha256;
  if (contract.contractSubtreeSha256 !== sha256(Buffer.from(jcs(withoutHash), "utf8"))) fail("proof-subtree-hash", contract.role);
  if (contract.profileId !== PROFILE_ID || contract.profileVersion !== PROFILE_VERSION || contract.schemaVersion !== 31) fail("proof-profile-binding", contract.role);
  if (contract.jcsContract !== "UTF-8 RFC8785-compatible JCS plus one LF" || contract.futureRequiredAtDesignTime !== false) fail("proof-jcs-contract", contract.role);
  validateRepoPath(contract.outputPath, contract.role);
}

function validateRootSchema(root) {
  exactKeys(root, ROOT_KEYS, "authority-root");
  if (root.authorityId !== AUTHORITY_SCHEMA_ID || root.authorityVersion !== "2.1.0") fail("authority-identity");
  if (root.status !== CANDIDATE_STATUS) fail("authority-status");

  exactKeys(root.canonicalization, ["algorithm", "decodedDuplicateMembers", "encoding", "trailingBytes"], "canonicalization");
  if (root.canonicalization.algorithm !== "RFC8785-JCS" || root.canonicalization.decodedDuplicateMembers !== "reject-before-semantic-consumption" || root.canonicalization.encoding !== "UTF-8" || root.canonicalization.trailingBytes !== "one-LF") fail("canonicalization-contract");

  exactKeys(root.subject, ["candidateRef", "markdownAuthority", "renderedDesignRole", "subjectId", "technicalProfileRole", "verifierRole"], "subject");
  if (root.subject.candidateRef !== EXPECTED_REF || root.subject.markdownAuthority !== false || root.subject.renderedDesignRole !== "renderedDesign" || root.subject.technicalProfileRole !== "currentTechnicalProfile" || root.subject.verifierRole !== "currentVerifier") fail("subject-contract");

  exactKeys(root.seal, ["authorityJcsSha256", "subjectJcsSha256"], "seal");
  if (!/^[0-9a-f]{64}$/.test(root.seal.authorityJcsSha256) || !/^[0-9a-f]{64}$/.test(root.seal.subjectJcsSha256)) fail("seal-shape");

  if (!Array.isArray(root.currentRoles) || root.currentRoles.length !== 3) fail("current-role-cardinality");
  const roleNames = root.currentRoles.map((role) => role.role);
  if (jcs(roleNames) !== jcs(["renderedDesign", "currentTechnicalProfile", "currentVerifier"])) fail("current-role-order-or-identity");
  const rendered = root.currentRoles[0];
  exactKeys(rendered, ["executableAuthority", "fileSha256", "machineAuthority", "path", "role"], "rendered-role");
  if (rendered.executableAuthority !== false || rendered.machineAuthority !== false) fail("rendered-role-authority");
  const technical = root.currentRoles[1];
  exactKeys(technical, ["executableAuthority", "fileSha256", "path", "profileId", "profileVersion", "role", "selectedAuthoritiesJcsSha256"], "technical-role");
  if (technical.executableAuthority !== true || technical.profileId !== PROFILE_ID || technical.profileVersion !== PROFILE_VERSION) fail("technical-role-authority");
  const verifier = root.currentRoles[2];
  exactKeys(verifier, ["executableAuthority", "fileSha256", "path", "role", "schemaId", "schemaVersion"], "verifier-role");
  if (verifier.executableAuthority !== true || verifier.schemaId !== VERIFIER_SCHEMA_ID || verifier.schemaVersion !== "2.1.0") fail("verifier-role-authority");
  for (const role of root.currentRoles) {
    validateRepoPath(role.path, role.role);
    if (!/^[0-9a-f]{64}$/.test(role.fileSha256)) fail("role-file-hash", role.role);
  }

  if (!Array.isArray(root.proofContracts) || root.proofContracts.length !== 5) fail("proof-cardinality");
  const proofRoles = root.proofContracts.map((contract) => contract.role);
  const expectedProofRoles = [
    "proof.actualTreeAndStaticLanguage",
    "proof.staticModuleAndResourceGraph",
    "proof.capabilityOriginAndNonReachability",
    "proof.phaseBComposition",
    "proof.serverPublicBundleBoundary"
  ];
  if (jcs(proofRoles) !== jcs(expectedProofRoles)) fail("proof-role-identity");
  root.proofContracts.forEach(validateProofContract);

  if (!Array.isArray(root.checkpoints) || root.checkpoints.length !== 3) fail("checkpoint-cardinality");
  const checkpointRoles = root.checkpoints.map((entry) => entry.role);
  if (jcs(checkpointRoles) !== jcs(["checkpoint.analysisPreL3", "checkpoint.correctedDesignPreL3", "checkpoint.v2M01RemediationPreL3"])) fail("checkpoint-role-identity");
  for (const entry of root.checkpoints) {
    exactKeys(entry, ["checkpointRef", "checkpointTarget", "recordCommit", "recordParent", "recordPath", "recordSha256", "recordTree", "role"], entry.role);
    validateRepoPath(entry.recordPath, entry.role);
    for (const key of ["checkpointTarget", "recordCommit", "recordParent", "recordTree"]) if (!/^[0-9a-f]{40}$/.test(entry[key])) fail("checkpoint-git-shape", `${entry.role}:${key}`);
    if (!/^[0-9a-f]{64}$/.test(entry.recordSha256)) fail("checkpoint-hash-shape", entry.role);
  }

  if (!Array.isArray(root.historicalEvidence) || root.historicalEvidence.length !== 3) fail("history-cardinality");
  if (jcs(root.historicalEvidence.map((entry) => entry.attempt)) !== jcs([1, 2, 3])) fail("history-attempts");
  for (const entry of root.historicalEvidence) {
    exactKeys(entry, ["attempt", "candidateCommit", "candidateParent", "candidateRef", "candidateTree", "controllingManifestSha256", "controllingReportSha256", "historicalVerifierPath", "nonExecutable"], `history:${entry.attempt}`);
    if (entry.nonExecutable !== true) fail("history-executable", String(entry.attempt));
    validateRepoPath(entry.historicalVerifierPath, `history:${entry.attempt}`);
  }

  exactKeys(root.closedReplacementEvidence, [
    "candidateCommit", "candidateManifestPath", "candidateManifestSha256",
    "candidateParent", "candidateRef", "candidateRootPath", "candidateRootSha256",
    "candidateTree", "currentExecutableEdge", "findingId", "historicalVerifierPath",
    "importedReviewerEnvelopeIsCurrent", "nonExecutable", "reviewerManifestPath",
    "reviewerManifestSha256", "reviewerReportPath", "reviewerReportSha256"
  ], "closed-replacement-evidence");
  if (
    root.closedReplacementEvidence.nonExecutable !== true ||
    root.closedReplacementEvidence.currentExecutableEdge !== false ||
    root.closedReplacementEvidence.importedReviewerEnvelopeIsCurrent !== false ||
    root.closedReplacementEvidence.findingId !== "V2-M01"
  ) fail("closed-replacement-evidence-state");
  for (const key of ["candidateCommit", "candidateParent", "candidateTree"]) {
    if (!/^[0-9a-f]{40}$/.test(root.closedReplacementEvidence[key])) fail("closed-replacement-git-shape", key);
  }
  for (const key of ["candidateManifestSha256", "candidateRootSha256", "reviewerManifestSha256", "reviewerReportSha256"]) {
    if (!/^[0-9a-f]{64}$/.test(root.closedReplacementEvidence[key])) fail("closed-replacement-hash-shape", key);
  }
  for (const key of ["candidateManifestPath", "candidateRootPath", "historicalVerifierPath", "reviewerManifestPath", "reviewerReportPath"]) {
    validateRepoPath(root.closedReplacementEvidence[key], `closed-replacement:${key}`);
  }

  exactKeys(root.frozenInputs, ["acceptedAnalysis", "acceptedV110", "successorFixedLedger", "technicalSources"], "frozen-inputs");
  exactKeys(root.frozenInputs.acceptedAnalysis, ["commit", "manifestSha256", "planSha256", "rootCauseAnalysisSha256"], "accepted-analysis");
  exactKeys(root.frozenInputs.acceptedV110, ["commit", "designPath", "designSha256", "independentPassPath", "independentPassSha256", "machineProfilePath", "machineProfileSha256"], "accepted-v110");
  exactKeys(root.frozenInputs.successorFixedLedger, ["path", "sha256"], "successor-ledger");
  exactKeys(root.frozenInputs.technicalSources, ["m02A08Sha256", "m03V22Sha256", "m04V31Sha256"], "technical-sources");
  for (const key of ["designPath", "independentPassPath", "machineProfilePath"]) validateRepoPath(root.frozenInputs.acceptedV110[key], key);
  validateRepoPath(root.frozenInputs.successorFixedLedger.path, "successor-ledger");

  exactKeys(root.rolePolicy, ["canonicalAuthorityPath", "candidateManifest", "candidatePackagePaths", "markdown", "pathContract", "proofMatrix", "rootCount"], "role-policy");
  if (root.rolePolicy.rootCount !== 1) fail("root-count");
  if (root.rolePolicy.canonicalAuthorityPath !== AUTHORITY_PATH) fail("canonical-authority-path-policy");
  exactKeys(root.rolePolicy.markdown, ["machineAuthority", "parsedForAuthority", "reservedDeclarationConcept"], "markdown-policy");
  if (root.rolePolicy.markdown.machineAuthority !== false || root.rolePolicy.markdown.parsedForAuthority !== false || root.rolePolicy.markdown.reservedDeclarationConcept !== false) fail("markdown-authority-policy");
  exactKeys(root.rolePolicy.candidateManifest, ["derivedOnly", "hashedByAuthorityRoot", "path", "rootEntryCardinality"], "manifest-policy");
  if (root.rolePolicy.candidateManifest.derivedOnly !== true || root.rolePolicy.candidateManifest.hashedByAuthorityRoot !== false || root.rolePolicy.candidateManifest.path !== MANIFEST_PATH || root.rolePolicy.candidateManifest.rootEntryCardinality !== 1) fail("manifest-policy");
  exactKeys(root.rolePolicy.pathContract, [
    "authorityPathClosed", "caseExact", "headMode", "indexAndWorktreeEqualHead",
    "loadedRootPhysicalInjectivity", "nfc", "physicalIdentityUnique",
    "repoRelativePosix", "soleManifestRootJoin", "symlinkAllowed",
    "trackedRegularExistingRoles"
  ], "path-policy");
  if (jcs(root.rolePolicy.pathContract) !== jcs({
    authorityPathClosed: true,
    caseExact: true,
    headMode: "100644",
    indexAndWorktreeEqualHead: true,
    loadedRootPhysicalInjectivity: true,
    nfc: true,
    physicalIdentityUnique: true,
    repoRelativePosix: true,
    soleManifestRootJoin: true,
    symlinkAllowed: false,
    trackedRegularExistingRoles: true
  })) fail("path-policy");
  exactKeys(root.rolePolicy.proofMatrix, ["path", "sha256"], "proof-matrix-policy");
  validateRepoPath(root.rolePolicy.proofMatrix.path, "proof-matrix");
  if (!Array.isArray(root.rolePolicy.candidatePackagePaths) || root.rolePolicy.candidatePackagePaths.length !== 13) fail("package-inventory-cardinality");
  if (jcs(root.rolePolicy.candidatePackagePaths) !== jcs([...root.rolePolicy.candidatePackagePaths].sort())) fail("package-inventory-order");
  root.rolePolicy.candidatePackagePaths.forEach((entry) => validateRepoPath(entry, "package-path"));
  if (root.rolePolicy.candidatePackagePaths.filter((entry) => entry === AUTHORITY_PATH).length !== 1) fail("package-root-entry-cardinality");

  exactKeys(root.roleGraph, Object.keys(EXPECTED_GRAPH), "role-graph");
  if (jcs(root.roleGraph) !== jcs(EXPECTED_GRAPH)) fail("role-graph-contract");
  validateGraph(root.roleGraph);

  const currentPaths = new Set(root.currentRoles.map((entry) => entry.path));
  const historyPaths = new Set(root.historicalEvidence.map((entry) => entry.historicalVerifierPath));
  historyPaths.add(root.closedReplacementEvidence.historicalVerifierPath);
  for (const entry of currentPaths) if (historyPaths.has(entry)) fail("current-history-overlap", entry);
  const allRolePaths = [
    ...root.currentRoles.map((entry) => entry.path),
    ...root.proofContracts.map((entry) => entry.outputPath),
    ...root.checkpoints.map((entry) => entry.recordPath)
  ];
  if (new Set(allRolePaths).size !== allRolePaths.length) fail("role-path-overlap");
}

function validateGraph(graph) {
  const nodes = new Set(Object.keys(graph));
  const state = new Map();
  const visit = (node) => {
    if (!nodes.has(node)) fail("graph-undeclared-node", node);
    if (state.get(node) === "visiting") fail("graph-cycle", node);
    if (state.get(node) === "done") return;
    state.set(node, "visiting");
    const targets = graph[node];
    if (!Array.isArray(targets) || new Set(targets).size !== targets.length) fail("graph-edge-cardinality", node);
    targets.forEach(visit);
    state.set(node, "done");
  };
  Object.keys(graph).forEach(visit);
  if (state.size !== nodes.size) fail("graph-incomplete");
}

function verifySeals(root) {
  if (root.seal.subjectJcsSha256 !== sha256(Buffer.from(jcs(root.subject), "utf8"))) fail("subject-jcs-hash");
  const authorityProjection = clone(root);
  delete authorityProjection.seal.authorityJcsSha256;
  if (root.seal.authorityJcsSha256 !== sha256(Buffer.from(jcs(authorityProjection), "utf8"))) fail("authority-jcs-hash");
}

function validateProfile(profile) {
  exactKeys(profile, ["authorityPolicy", "findingDispositions", "phaseBoundaries", "profileId", "profileVersion", "proofContracts", "schemaMapping", "securityAndProductBoundaries", "selectedAuthorities", "status"], "technical-profile");
  if (profile.profileId !== PROFILE_ID || profile.profileVersion !== PROFILE_VERSION || profile.status !== CANDIDATE_STATUS) fail("profile-identity");
  exactKeys(profile.authorityPolicy, [
    "canonicalAuthorityPath", "canonicalRootCount", "compatibilityLayerAllowed",
    "exactHeadTrackedRoot", "failedCandidateAncestryIsAuthority",
    "historicalTechnicalValuesRequireNewRootAndFreshPass",
    "loadedRootPhysicalInjectivity", "markdownMachineAuthority",
    "reviewerEnvelopeCandidateCommitted", "soleManifestRootJoin",
    "v20FallbackAllowed"
  ], "profile-authority-policy");
  if (
    profile.authorityPolicy.canonicalAuthorityPath !== AUTHORITY_PATH ||
    profile.authorityPolicy.canonicalRootCount !== 1 ||
    profile.authorityPolicy.compatibilityLayerAllowed !== false ||
    profile.authorityPolicy.exactHeadTrackedRoot !== true ||
    profile.authorityPolicy.failedCandidateAncestryIsAuthority !== false ||
    profile.authorityPolicy.loadedRootPhysicalInjectivity !== true ||
    profile.authorityPolicy.markdownMachineAuthority !== false ||
    profile.authorityPolicy.reviewerEnvelopeCandidateCommitted !== false ||
    profile.authorityPolicy.soleManifestRootJoin !== true ||
    profile.authorityPolicy.v20FallbackAllowed !== false
  ) fail("profile-authority-policy-value");
  if (profile.findingDispositions.V2_M01 !== "BOUNDED_REMEDIATION_CANDIDATE_AWAITING_FRESH_INDEPENDENT_PASS") fail("profile-v2-m01-disposition");
  exactKeys(profile.selectedAuthorities, ["acceptedV110", "m02A08Successor", "m03DiscriminatedSeam", "m04StaticCapabilityBoundaryV31"], "selected-authorities");
  for (const [name, entry] of Object.entries(profile.selectedAuthorities)) {
    exactKeys(entry, ["source", "value"], `selected:${name}`);
    exactKeys(entry.source, ["commit", "currentBy", "disposition", "failedAncestrySuppliesAuthority", "fileSha256", "path", "valueJcsSha256"], `selected-source:${name}`);
    if (entry.source.failedAncestrySuppliesAuthority !== false || entry.source.currentBy !== "v2-1-successor-canonical-root-plus-future-fresh-pass") fail("selected-currentness", name);
    if (entry.source.valueJcsSha256 !== sha256(Buffer.from(jcs(entry.value), "utf8"))) fail("selected-value-jcs", name);
  }
  if (!Array.isArray(profile.proofContracts) || profile.proofContracts.length !== 5) fail("profile-proof-cardinality");
  profile.proofContracts.forEach(validateProofContract);
  exactKeys(profile.schemaMapping, ["aiModelConfig", "aiRuns", "mappingSource", "mutationAllowed"], "schema-mapping");
  if (profile.schemaMapping.mutationAllowed !== false || profile.schemaMapping.aiModelConfig.expectedFieldCount !== 21 || profile.schemaMapping.aiModelConfig.fields.length !== 21 || profile.schemaMapping.aiRuns.expectedFieldCount !== 96 || profile.schemaMapping.aiRuns.fields.length !== 96) fail("schema-mapping-count");
  if (new Set(profile.schemaMapping.aiModelConfig.fields).size !== 21 || new Set(profile.schemaMapping.aiRuns.fields).size !== 96) fail("schema-mapping-duplicate");
}

function enumerateMachineRoles(root) {
  return root.currentRoles.map((entry) => ({ executableAuthority: entry.executableAuthority, path: entry.path, role: entry.role }));
}

function parseManifest(text) {
  if (!text.endsWith("\n")) fail("manifest-final-lf");
  const lines = text.slice(0, -1).split("\n");
  const entries = lines.map((line) => {
    const match = line.match(/^([0-9a-f]{64})  ([^\n]+)$/);
    if (!match) fail("manifest-line", line);
    return { hash: match[1], path: match[2] };
  });
  if (new Set(entries.map((entry) => entry.path)).size !== entries.length) fail("manifest-duplicate-path");
  if (jcs(entries.map((entry) => entry.path)) !== jcs(entries.map((entry) => entry.path).sort())) fail("manifest-order");
  entries.forEach((entry) => validateRepoPath(entry.path, "manifest-entry"));
  return entries;
}

function validateManifestInventory(actualPaths, expectedPaths, physicalEntries = []) {
  if (jcs([...actualPaths].sort()) !== jcs([...expectedPaths].sort())) fail("manifest-inventory");
  if (physicalEntries.length > 0) validatePhysicalEntries(physicalEntries);
}

function verifyManifest(repoRoot, root, boundary) {
  const manifestPolicy = root.rolePolicy.candidateManifest;
  if (manifestPolicy.path !== MANIFEST_PATH) fail("manifest-path-not-closed");
  const entries = boundary.manifestEntries;
  const expected = root.rolePolicy.candidatePackagePaths;
  if (entries.some((entry) => entry.path === manifestPolicy.path)) fail("manifest-self-entry");
  validateManifestInventory(entries.map((entry) => entry.path), expected);
  validateRootManifestJoin(entries, boundary.authorityState.observation);

  const physicalByPath = new Map();
  addPhysicalEntry(physicalByPath, boundary.authorityState);
  addPhysicalEntry(physicalByPath, boundary.manifestState);
  for (const entry of entries) {
    const file = entry.path === AUTHORITY_PATH
      ? boundary.authorityState
      : readExactHeadTrackedRegular(repoRoot, entry.path, "manifest-member");
    addPhysicalEntry(physicalByPath, file);
    if (file.observation.headBlobSha256 !== entry.hash) fail("manifest-hash", entry.path);
  }
  for (const checkpoint of root.checkpoints) {
    const file = readExactHeadTrackedRegular(repoRoot, checkpoint.recordPath, "checkpoint-record");
    addPhysicalEntry(physicalByPath, file);
  }
  validatePhysicalEntries([...physicalByPath.values()].map((entry) => ({
    dev: entry.dev,
    ino: entry.ino,
    kind: entry.kind,
    path: entry.repoPath
  })));

  const expectedPackageNames = new Set(expected.filter((entry) => entry.startsWith(`${PACKAGE_DIR}/`)).map((entry) => path.posix.basename(entry)));
  expectedPackageNames.add("SHA256SUMS.txt");
  const actualNames = fs.readdirSync(path.join(repoRoot, PACKAGE_DIR)).sort();
  if (jcs(actualNames) !== jcs([...expectedPackageNames].sort())) fail("package-directory-extra-or-missing");
  return { count: entries.length, physicalEntryCount: physicalByPath.size };
}

function validateEnvelopeSchema(envelope) {
  exactKeys(envelope, ["authorityBinding", "expectedGit", "provenance", "schemaId", "status", "version"], "review-envelope");
  if (envelope.schemaId !== ENVELOPE_SCHEMA_ID || envelope.status !== "review-expectation-not-acceptance" || envelope.version !== "2.0.0") fail("envelope-identity");
  exactKeys(envelope.authorityBinding, ["authorityJcsSha256", "fileSha256", "path", "role"], "envelope-authority-binding");
  if (envelope.authorityBinding.role !== "canonicalReviewAuthority") fail("envelope-authority-role");
  validateRepoPath(envelope.authorityBinding.path, "envelope-authority-path");
  if (envelope.authorityBinding.path !== AUTHORITY_PATH) fail("envelope-authority-path-not-canonical", envelope.authorityBinding.path);
  exactKeys(envelope.expectedGit, ["attachmentPolicy", "cleanRequired", "head", "parent", "ref", "tree"], "envelope-expected-git");
  if (envelope.expectedGit.attachmentPolicy !== "detached-or-exact-ref" || envelope.expectedGit.cleanRequired !== true) fail("envelope-git-policy");
  if (!envelope.expectedGit.ref.startsWith("refs/heads/codex/")) fail("envelope-ref-shape");
  for (const key of ["head", "parent", "tree"]) if (!/^[0-9a-f]{40}$/.test(envelope.expectedGit[key])) fail("envelope-git-shape", key);
  exactKeys(envelope.provenance, ["createdAfterCandidateCommit", "ownerRole", "statement"], "envelope-provenance");
  if (envelope.provenance.createdAfterCandidateCommit !== true || typeof envelope.provenance.ownerRole !== "string" || envelope.provenance.ownerRole.length === 0 || typeof envelope.provenance.statement !== "string" || envelope.provenance.statement.length === 0) fail("envelope-provenance-value");
}

function validateReviewPure(root, envelope, authorityInfo, observed) {
  validateEnvelopeSchema(envelope);
  if (envelope.authorityBinding.path !== authorityInfo.path || envelope.authorityBinding.fileSha256 !== authorityInfo.fileSha256 || envelope.authorityBinding.authorityJcsSha256 !== root.seal.authorityJcsSha256) fail("envelope-authority-cross-binding");
  if (envelope.expectedGit.ref !== root.subject.candidateRef) fail("envelope-ref-sealed-ref");
  if (observed.refTarget === null) fail("git-missing-ref");
  if (observed.refTarget !== envelope.expectedGit.head) fail("git-ref-target");
  if (observed.head !== envelope.expectedGit.head) fail("git-head");
  if (observed.parentCount !== 1) fail("git-parent-count");
  if (observed.derivedTree !== envelope.expectedGit.tree || observed.observedTree !== envelope.expectedGit.tree) fail("git-tree");
  if (observed.derivedParent !== envelope.expectedGit.parent || observed.observedParent !== envelope.expectedGit.parent) fail("git-parent");
  if (envelope.expectedGit.cleanRequired && observed.clean !== true) fail("git-dirty");
  if (observed.symbolicRef !== null && observed.symbolicRef !== envelope.expectedGit.ref) fail("git-attachment");
  return {
    authorityBound: true,
    clean: true,
    headBound: true,
    parentBound: true,
    refBound: true,
    treeBound: true
  };
}

function observeGit(repoRoot, expectedRef, expectedHead) {
  const refTarget = git(repoRoot, ["rev-parse", "--verify", expectedRef], true);
  const head = git(repoRoot, ["rev-parse", "HEAD"]);
  const parentLine = git(repoRoot, ["rev-list", "--parents", "-n", "1", expectedHead]);
  const parentParts = parentLine.split(" ");
  const symbolic = git(repoRoot, ["symbolic-ref", "--quiet", "HEAD"], true);
  return {
    clean: git(repoRoot, ["status", "--porcelain=v1", "--untracked-files=all"]) === "",
    derivedParent: parentParts.length === 2 ? parentParts[1] : null,
    derivedTree: git(repoRoot, ["rev-parse", `${expectedHead}^{tree}`], true),
    head,
    observedParent: git(repoRoot, ["rev-parse", "HEAD^"], true),
    observedTree: git(repoRoot, ["rev-parse", "HEAD^{tree}"], true),
    parentCount: Math.max(0, parentParts.length - 1),
    refTarget,
    symbolicRef: symbolic
  };
}

function setLeaf(value, dottedPath, replacement) {
  const result = clone(value);
  const parts = dottedPath.split(".");
  let target = result;
  for (const part of parts.slice(0, -1)) target = target[part];
  target[parts.at(-1)] = replacement;
  return result;
}

function mutateLeaf(original, dottedPath) {
  const parts = dottedPath.split(".");
  let value = original;
  for (const part of parts) value = value[part];
  if (typeof value === "boolean") return !value;
  if (typeof value === "number") return value + 1;
  if (typeof value === "string") {
    if (/^[0-9a-f]{40}$/.test(value)) return `${value.slice(0, -1)}${value.endsWith("0") ? "1" : "0"}`;
    if (/^[0-9a-f]{64}$/.test(value)) return `${value.slice(0, -1)}${value.endsWith("0") ? "1" : "0"}`;
    return `${value}-mutation`;
  }
  fail("unsupported-leaf-mutation", dottedPath);
}

function syntheticEnvelope(root, authorityInfo) {
  return {
    authorityBinding: {
      authorityJcsSha256: root.seal.authorityJcsSha256,
      fileSha256: authorityInfo.fileSha256,
      path: authorityInfo.path,
      role: "canonicalReviewAuthority"
    },
    expectedGit: {
      attachmentPolicy: "detached-or-exact-ref",
      cleanRequired: true,
      head: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      parent: "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
      ref: root.subject.candidateRef,
      tree: "cccccccccccccccccccccccccccccccccccccccc"
    },
    provenance: {
      createdAfterCandidateCommit: true,
      ownerRole: "independent-reviewer",
      statement: "reviewer-supplied-pinned-git-expectation"
    },
    schemaId: ENVELOPE_SCHEMA_ID,
    status: "review-expectation-not-acceptance",
    version: "2.0.0"
  };
}

function syntheticObservation(envelope, symbolicRef) {
  return {
    clean: true,
    derivedParent: envelope.expectedGit.parent,
    derivedTree: envelope.expectedGit.tree,
    head: envelope.expectedGit.head,
    observedParent: envelope.expectedGit.parent,
    observedTree: envelope.expectedGit.tree,
    parentCount: 1,
    refTarget: envelope.expectedGit.head,
    symbolicRef
  };
}

function syntheticHeadBinding() {
  return {
    headBlobSha256: "a".repeat(64),
    headExists: true,
    headMode: "100644",
    headPath: AUTHORITY_PATH,
    headType: "blob",
    indexBlobSha256: "a".repeat(64),
    indexMode: "100644",
    indexPath: AUTHORITY_PATH,
    indexStage: 0,
    repoPath: AUTHORITY_PATH,
    worktreeKind: "file",
    worktreePath: AUTHORITY_PATH,
    worktreeSha256: "a".repeat(64)
  };
}

function captureDiagnostic(id, operation) {
  try {
    operation();
  } catch (error) {
    return { diagnostic: error instanceof Error ? error.message : String(error), id, rejected: true };
  }
  fail("boundary-negative-did-not-reject", id);
}

export function runBoundaryDiagnosticMatrix() {
  const baselineHead = syntheticHeadBinding();
  const cases = [
    captureDiagnostic("v2-m01-ignored-untracked-exact-root-copy", () => validateExactAuthorityPath(".next/reviewer-v111-m01-v2/alternate-authority-copy.json")),
    captureDiagnostic("v2-m01-ignored-untracked-hardlink-root", () => validateExactAuthorityPath(".next/reviewer-v111-m01-v2/alternate-authority-hardlink.json")),
    captureDiagnostic("v2-m01-ignored-untracked-resealed-root", () => validateExactAuthorityPath(".next/reviewer-v111-m01-v2/alternate-authority-resealed.json")),
    captureDiagnostic("v2-m01-visible-untracked-root", () => validateExactAuthorityPath("docs/reviewer-visible-untracked-root.json")),
    captureDiagnostic("v2-m01-tracked-wrong-path-root", () => validateExactAuthorityPath(`${PACKAGE_DIR}/TRACKED_WRONG_PATH_ROOT.json`)),
    captureDiagnostic("v2-m01-case-only-root-path", () => validateExactAuthorityPath(`${PACKAGE_DIR}/v111_M01_CANONICAL_REVIEW_AUTHORITY_V2_1.json`)),
    captureDiagnostic("v2-m01-symlink-root-alias", () => validateHeadBinding({ ...baselineHead, worktreeKind: "symlink" })),
    captureDiagnostic("v2-m01-root-hardlink-current-role", () => validatePhysicalEntries([
      { dev: 7, ino: 11, kind: "file", path: AUTHORITY_PATH },
      { dev: 7, ino: 11, kind: "file", path: `${PACKAGE_DIR}/PHASE_B_CURRENT_TECHNICAL_PROFILE_V2_1.json` }
    ])),
    captureDiagnostic("v2-m01-root-hardlink-proof-artifact", () => validatePhysicalEntries([
      { dev: 7, ino: 12, kind: "file", path: AUTHORITY_PATH },
      { dev: 7, ino: 12, kind: "file", path: `${PACKAGE_DIR}/V111_M01_REPLACEMENT_PROOF_MATRIX_V2_1.json` }
    ])),
    captureDiagnostic("v2-m01-root-hardlink-checkpoint", () => validatePhysicalEntries([
      { dev: 7, ino: 13, kind: "file", path: AUTHORITY_PATH },
      { dev: 7, ino: 13, kind: "file", path: "docs/PHASE_1B_STAGE4A_PHASE_B_V111_M01_V2_M01_REMEDIATION_PRE_L3_CHECKPOINT_V1_0.md" }
    ])),
    captureDiagnostic("v2-m01-root-hardlink-manifest", () => validatePhysicalEntries([
      { dev: 7, ino: 14, kind: "file", path: AUTHORITY_PATH },
      { dev: 7, ino: 14, kind: "file", path: MANIFEST_PATH }
    ])),
    captureDiagnostic("v2-m01-manifest-missing-root-entry", () => validateRootManifestJoin([], baselineHead)),
    captureDiagnostic("v2-m01-manifest-duplicate-root-entry", () => validateRootManifestJoin([
      { hash: baselineHead.headBlobSha256, path: AUTHORITY_PATH },
      { hash: baselineHead.headBlobSha256, path: AUTHORITY_PATH }
    ], baselineHead)),
    captureDiagnostic("v2-m01-manifest-root-wrong-hash", () => validateRootManifestJoin([
      { hash: "b".repeat(64), path: AUTHORITY_PATH }
    ], baselineHead)),
    captureDiagnostic("v2-m01-coordinated-authority-envelope-redirection", () => validateExactAuthorityPath(".next/coordinated-authority-and-envelope.json")),
    captureDiagnostic("v2-m01-head-root-missing", () => validateHeadBinding({ ...baselineHead, headExists: false })),
    captureDiagnostic("v2-m01-head-root-wrong-mode", () => validateHeadBinding({ ...baselineHead, headMode: "100755" })),
    captureDiagnostic("v2-m01-head-root-wrong-blob", () => validateHeadBinding({ ...baselineHead, headBlobSha256: "b".repeat(64) })),
    captureDiagnostic("v2-m01-index-root-differs-head", () => validateHeadBinding({ ...baselineHead, indexBlobSha256: "b".repeat(64) })),
    captureDiagnostic("v2-m01-worktree-root-differs-head", () => validateHeadBinding({ ...baselineHead, worktreeSha256: "b".repeat(64) })),
    captureDiagnostic("v2-m01-envelope-path-mutation", () => {
      const envelope = syntheticEnvelope({ seal: { authorityJcsSha256: "a".repeat(64) }, subject: { candidateRef: EXPECTED_REF } }, {
        fileSha256: "b".repeat(64),
        path: AUTHORITY_PATH
      });
      envelope.authorityBinding.path = ".next/envelope-mutated-root.json";
      validateEnvelopeSchema(envelope);
    }),
    captureDiagnostic("v2-m01-self-consistently-resealed-alternate-root", () => validateExactAuthorityPath(".cache-v2-m01/resealed-root.json")),
    captureDiagnostic("v2-m01-arbitrary-ignored-directory-root", () => validateExactAuthorityPath(".fresh-unnamed-ignored-v2-m01/root.json"))
  ];
  return { cases, count: cases.length, ok: true };
}

export function runProofMatrix(root, profile, matrix, authorityInfo, repoRoot) {
  const positive = [];
  const negative = [];
  const properties = [];

  validateRootSchema(root);
  verifySeals(root);
  validateProfile(profile);
  positive.push("canonical-root-baseline");

  const envelope = syntheticEnvelope(root, authorityInfo);
  const detached = validateReviewPure(root, envelope, authorityInfo, syntheticObservation(envelope, null));
  positive.push("git-detached-exact-head");
  const attached = validateReviewPure(root, envelope, authorityInfo, syntheticObservation(envelope, envelope.expectedGit.ref));
  positive.push("git-attached-exact-ref");
  assert.deepEqual(detached, attached);
  positive.push("attached-detached-normalized-equivalence");

  const roleProjection = jcs(enumerateMachineRoles(root));
  const witnesses = [
    " ```json\n{\"role\":\"currentVerifier\"}\n ```",
    "   ```json\n{\"role\":\"currentVerifier\"}\n   ```",
    "```json\n{\"role\":\"currentVerifier\"}\n````",
    "  ~~~json\n{\"role\":\"currentVerifier\"}\n  ~~~",
    "   ```json\n{\"secondSeal\":true}\n   ```"
  ];
  const witnessIds = matrix.commonMarkWitnesses;
  witnesses.forEach((witness, index) => {
    assert.equal(jcs(enumerateMachineRoles(root)), roleProjection);
    assert.equal(typeof witness, "string");
    positive.push(witnessIds[index]);
  });

  const rawDuplicate = Buffer.from(`{"authorityId":"a","authorityId":"b"}`, "utf8");
  negative.push(expectReject("root-duplicate-json-key", () => strictJsonParse(rawDuplicate, "duplicate")));
  const rawEscapedDuplicate = Buffer.from(`{"authorityId":"a","authority\\u0049d":"b"}`, "utf8");
  negative.push(expectReject("root-escaped-duplicate-json-key", () => strictJsonParse(rawEscapedDuplicate, "escaped-duplicate")));

  const unknownRoot = clone(root);
  unknownRoot.currentAuthorityAlias = true;
  negative.push(expectReject("root-unknown-top-level-key", () => validateRootSchema(unknownRoot)));
  const missingVerifier = clone(root);
  missingVerifier.currentRoles.pop();
  negative.push(expectReject("root-missing-current-verifier", () => validateRootSchema(missingVerifier)));
  const extraRole = clone(root);
  extraRole.currentRoles.push({ ...extraRole.currentRoles[2], role: "currentVerifierCopy" });
  negative.push(expectReject("root-extra-current-role", () => validateRootSchema(extraRole)));
  const duplicateProof = clone(root);
  duplicateProof.proofContracts[1].role = duplicateProof.proofContracts[0].role;
  negative.push(expectReject("root-duplicate-proof-role", () => validateRootSchema(duplicateProof)));
  const missingProof = clone(root);
  missingProof.proofContracts.pop();
  negative.push(expectReject("root-missing-proof-role", () => validateRootSchema(missingProof)));
  const missingCheckpoint = clone(root);
  missingCheckpoint.checkpoints.pop();
  negative.push(expectReject("root-missing-checkpoint", () => validateRootSchema(missingCheckpoint)));
  const missingHistory = clone(root);
  missingHistory.historicalEvidence.splice(1, 1);
  negative.push(expectReject("root-missing-v113-history", () => validateRootSchema(missingHistory)));
  const badAuthoritySeal = clone(root);
  badAuthoritySeal.seal.authorityJcsSha256 = "0".repeat(64);
  negative.push(expectReject("root-authority-jcs-mutation", () => verifySeals(badAuthoritySeal)));
  const badSubjectSeal = clone(root);
  badSubjectSeal.subject.candidateRef = `${EXPECTED_REF}-other`;
  negative.push(expectReject("root-subject-jcs-mutation", () => verifySeals(badSubjectSeal)));
  const overlap = clone(root);
  overlap.historicalEvidence[0].historicalVerifierPath = overlap.currentRoles[2].path;
  negative.push(expectReject("root-current-history-path-overlap", () => validateRootSchema(overlap)));
  const swappedHashes = clone(root);
  [swappedHashes.currentRoles[1].fileSha256, swappedHashes.currentRoles[2].fileSha256] = [swappedHashes.currentRoles[2].fileSha256, swappedHashes.currentRoles[1].fileSha256];
  negative.push(expectReject("root-verifier-profile-hash-swap", () => verifyCurrentFiles(repoRoot, swappedHashes, profile)));
  const swappedProofPaths = clone(root);
  [swappedProofPaths.proofContracts[0].outputPath, swappedProofPaths.proofContracts[1].outputPath] = [swappedProofPaths.proofContracts[1].outputPath, swappedProofPaths.proofContracts[0].outputPath];
  negative.push(expectReject("root-proof-output-path-swap", () => validateRootProfileBinding(swappedProofPaths, profile)));
  const cycle = clone(root);
  cycle.roleGraph.currentVerifier = ["authorityRoot"];
  negative.push(expectReject("root-seal-cycle", () => validateGraph(cycle.roleGraph)));

  const pathMutations = [
    ["path-absolute", "/docs/review-evidence/profile.json"],
    ["path-backslash", "docs\\review-evidence\\profile.json"],
    ["path-dot", "docs/./review-evidence/profile.json"],
    ["path-dot-dot", "docs/review-evidence/../profile.json"],
    ["path-duplicate-slash", "docs//review-evidence/profile.json"],
    ["path-percent", "docs/review-evidence/%70rofile.json"],
    ["path-control", "docs/review-evidence/profile\u0001.json"],
    ["path-nfd", "docs/review-evidence/cafe\u0301.json"],
    ["path-case-alias", "Docs/PHASE_1B_STAGE4A_PHASE_B_DESIGN.md"]
  ];
  pathMutations.forEach(([id, candidate]) => negative.push(expectReject(id, () => {
    validateRepoPath(candidate, id);
    if (id === "path-case-alias") resolveCaseExact(repoRoot, candidate);
  })));
  negative.push(expectReject("physical-symlink-alias", () => validatePhysicalEntries([{ dev: 1, ino: 1, kind: "symlink", path: "role-a" }])));
  negative.push(expectReject("physical-hardlink-alias", () => validatePhysicalEntries([{ dev: 1, ino: 1, kind: "file", path: "role-a" }, { dev: 1, ino: 1, kind: "file", path: "role-b" }])));

  const duplicateEnvelope = Buffer.from(`{"expectedGit":{"ref":"a","ref":"b"}}`, "utf8");
  negative.push(expectReject("envelope-duplicate-json-key", () => strictJsonParse(duplicateEnvelope, "duplicate-envelope")));
  const refMismatch = clone(envelope);
  refMismatch.expectedGit.ref = `${EXPECTED_REF}-other`;
  negative.push(expectReject("envelope-ref-versus-sealed-ref", () => validateReviewPure(root, refMismatch, authorityInfo, syntheticObservation(refMismatch, null))));
  const missingRefObservation = syntheticObservation(envelope, null);
  missingRefObservation.refTarget = null;
  negative.push(expectReject("git-missing-ref", () => validateReviewPure(root, envelope, authorityInfo, missingRefObservation)));
  const movedRefObservation = syntheticObservation(envelope, null);
  movedRefObservation.refTarget = "d".repeat(40);
  negative.push(expectReject("git-moved-ref", () => validateReviewPure(root, envelope, authorityInfo, movedRefObservation)));
  const wrongHeadObservation = syntheticObservation(envelope, null);
  wrongHeadObservation.head = "d".repeat(40);
  negative.push(expectReject("git-wrong-head", () => validateReviewPure(root, envelope, authorityInfo, wrongHeadObservation)));
  const wrongTree = clone(envelope);
  wrongTree.expectedGit.tree = "d".repeat(40);
  negative.push(expectReject("git-wrong-tree", () => validateReviewPure(root, wrongTree, authorityInfo, syntheticObservation(envelope, null))));
  const wrongParent = clone(envelope);
  wrongParent.expectedGit.parent = "d".repeat(40);
  negative.push(expectReject("git-wrong-parent", () => validateReviewPure(root, wrongParent, authorityInfo, syntheticObservation(envelope, null))));
  const mergeObservation = syntheticObservation(envelope, null);
  mergeObservation.parentCount = 2;
  negative.push(expectReject("git-multiple-parents", () => validateReviewPure(root, envelope, authorityInfo, mergeObservation)));
  const dirtyObservation = syntheticObservation(envelope, null);
  dirtyObservation.clean = false;
  negative.push(expectReject("git-dirty", () => validateReviewPure(root, envelope, authorityInfo, dirtyObservation)));
  const wrongBranchObservation = syntheticObservation(envelope, `${EXPECTED_REF}-other`);
  negative.push(expectReject("git-attached-wrong-branch", () => validateReviewPure(root, envelope, authorityInfo, wrongBranchObservation)));
  const badFileBinding = clone(envelope);
  badFileBinding.authorityBinding.fileSha256 = "0".repeat(64);
  negative.push(expectReject("envelope-authority-file-hash", () => validateReviewPure(root, badFileBinding, authorityInfo, syntheticObservation(envelope, null))));
  const badJcsBinding = clone(envelope);
  badJcsBinding.authorityBinding.authorityJcsSha256 = "0".repeat(64);
  negative.push(expectReject("envelope-authority-jcs-hash", () => validateReviewPure(root, badJcsBinding, authorityInfo, syntheticObservation(envelope, null))));

  const baselineEnvelopeHash = sha256(Buffer.from(jcs(envelope), "utf8"));
  for (const leaf of matrix.reviewEnvelopeLeafPaths) {
    const changed = setLeaf(envelope, leaf, mutateLeaf(envelope, leaf));
    let rejected = false;
    try {
      validateReviewPure(root, changed, authorityInfo, syntheticObservation(envelope, null));
    } catch {
      rejected = true;
    }
    const changedHash = sha256(Buffer.from(jcs(changed), "utf8"));
    if (!rejected && changedHash === baselineEnvelopeHash) fail("unconsumed-envelope-leaf", leaf);
  }
  negative.push("envelope-consumption-completeness");

  const expectedInventory = root.rolePolicy.candidatePackagePaths;
  negative.push(expectReject("manifest-missing-file", () => validateManifestInventory(expectedInventory.slice(1), expectedInventory)));
  negative.push(expectReject("manifest-extra-file", () => validateManifestInventory([...expectedInventory, `${PACKAGE_DIR}/EXTRA.json`], expectedInventory)));
  negative.push(expectReject("manifest-path-alias", () => validateManifestInventory(expectedInventory, expectedInventory, [{ dev: 2, ino: 2, kind: "file", path: "a" }, { dev: 2, ino: 2, kind: "file", path: "b" }])));

  const boundaryDiagnostics = runBoundaryDiagnosticMatrix();
  negative.push(...boundaryDiagnostics.cases.map((entry) => entry.id));

  properties.push("one-root-only");
  assert.equal(root.currentRoles.length, 3);
  assert.equal(root.currentRoles.filter((entry) => entry.executableAuthority).length, 2);
  assert.equal(root.proofContracts.length, 5);
  assert.equal(root.checkpoints.length, 3);
  assert.equal(root.historicalEvidence.length, 3);
  properties.push("closed-cardinality");
  assert.equal(new Set([...root.currentRoles.map((entry) => entry.path), ...root.proofContracts.map((entry) => entry.outputPath), ...root.checkpoints.map((entry) => entry.recordPath)]).size, 11);
  properties.push("path-physical-injectivity");
  validateGraph(root.roleGraph);
  properties.push("dag-acyclic");
  assert.equal(envelope.expectedGit.ref, root.subject.candidateRef);
  properties.push("ref-closure");
  assert.equal(detached.parentBound && detached.treeBound, true);
  properties.push("git-object-derivation");
  assert.deepEqual(detached, attached);
  properties.push("attachment-orthogonality");
  assert.equal(root.rolePolicy.candidatePackagePaths.some((entry) => path.posix.basename(entry).startsWith("CANDIDATE_REVIEW_ENVELOPE_")), false);
  properties.push("envelope-no-cycle");
  assert.equal(root.rolePolicy.candidateManifest.hashedByAuthorityRoot, false);
  properties.push("manifest-is-derived");
  assert.equal(enumerateMachineRoles.length, 1);
  assert.equal(jcs(enumerateMachineRoles(root)), roleProjection);
  properties.push("presentation-independence");
  validateExactAuthorityPath(AUTHORITY_PATH);
  properties.push("exact-canonical-authority-path");
  validateHeadBinding(syntheticHeadBinding());
  properties.push("exact-head-root-membership");
  validateRootManifestJoin([{ hash: "a".repeat(64), path: AUTHORITY_PATH }], syntheticHeadBinding());
  properties.push("sole-manifest-root-join");
  validatePhysicalEntries([
    { dev: 3, ino: 1, kind: "file", path: AUTHORITY_PATH },
    { dev: 3, ino: 2, kind: "file", path: MANIFEST_PATH }
  ]);
  properties.push("loaded-root-global-physical-injectivity");

  positive.push("offline-deterministic-repeat");
  if (jcs(positive) !== jcs(matrix.positive.map((entry) => entry.id))) fail("positive-id-order");
  if (jcs(negative) !== jcs(matrix.negative.map((entry) => entry.id))) fail("negative-id-order");
  if (jcs(properties) !== jcs(matrix.properties.map((entry) => entry.id))) fail("property-id-order");

  return {
    counts: { negative: negative.length, positive: positive.length, properties: properties.length, total: negative.length + positive.length + properties.length },
    negative,
    ok: true,
    positive,
    properties
  };
}

function validateRootProfileBinding(root, profile) {
  if (jcs(root.proofContracts) !== jcs(profile.proofContracts)) fail("root-profile-proof-binding");
  const technical = root.currentRoles.find((entry) => entry.role === "currentTechnicalProfile");
  if (technical.selectedAuthoritiesJcsSha256 !== sha256(Buffer.from(jcs(profile.selectedAuthorities), "utf8"))) fail("selected-authorities-pointer-integrity");
}

function verifyCurrentFiles(repoRoot, root, profile) {
  const physical = [];
  for (const role of root.currentRoles) {
    const file = existingTrackedRegular(repoRoot, role.path);
    physical.push({ ...file, kind: "file", path: role.path });
    if (sha256(fs.readFileSync(file.absolute)) !== role.fileSha256) fail("current-role-file-hash", role.role);
  }
  for (const checkpoint of root.checkpoints) {
    const file = existingTrackedRegular(repoRoot, checkpoint.recordPath);
    physical.push({ ...file, kind: "file", path: checkpoint.recordPath });
    if (sha256(fs.readFileSync(file.absolute)) !== checkpoint.recordSha256) fail("checkpoint-record-hash", checkpoint.role);
    if (git(repoRoot, ["rev-parse", checkpoint.recordCommit]) !== checkpoint.recordCommit || git(repoRoot, ["rev-parse", `${checkpoint.recordCommit}^`]) !== checkpoint.recordParent || git(repoRoot, ["rev-parse", `${checkpoint.recordCommit}^{tree}`]) !== checkpoint.recordTree) fail("checkpoint-record-git", checkpoint.role);
    const checkpointRef = checkpoint.checkpointRef.startsWith("refs/") ? checkpoint.checkpointRef : `refs/heads/${checkpoint.checkpointRef}`;
    if (git(repoRoot, ["rev-parse", checkpointRef]) !== checkpoint.checkpointTarget) fail("checkpoint-ref-moved", checkpoint.role);
  }
  validatePhysicalEntries(physical);
  validateRootProfileBinding(root, profile);
}

function verifyFrozenFiles(repoRoot, root) {
  const v110 = root.frozenInputs.acceptedV110;
  for (const [pathKey, hashKey] of [["designPath", "designSha256"], ["independentPassPath", "independentPassSha256"], ["machineProfilePath", "machineProfileSha256"]]) {
    const file = existingTrackedRegular(repoRoot, v110[pathKey]);
    if (sha256(fs.readFileSync(file.absolute)) !== v110[hashKey]) fail("frozen-v110-hash", pathKey);
  }
  const ledger = existingTrackedRegular(repoRoot, root.frozenInputs.successorFixedLedger.path);
  if (sha256(fs.readFileSync(ledger.absolute)) !== root.frozenInputs.successorFixedLedger.sha256) fail("fixed-ledger-hash");
  const ledgerValue = strictJsonParse(fs.readFileSync(ledger.absolute), "fixed-ledger").value;
  if (jcs(ledgerValue.packageInventory) !== jcs(root.rolePolicy.candidatePackagePaths)) fail("fixed-ledger-inventory");
}

function loadAuthorityBoundary(authorityArgument) {
  const repoRoot = repoRootFrom(process.cwd());
  const expectedAbsolute = path.resolve(repoRoot, AUTHORITY_PATH);
  const argumentAbsolute = path.resolve(authorityArgument);
  const lexicalPath = path.relative(repoRoot, argumentAbsolute).split(path.sep).join("/");
  validateExactAuthorityPath(lexicalPath);
  if (argumentAbsolute !== expectedAbsolute) fail("authority-absolute-path-not-canonical", argumentAbsolute);

  const authorityState = readExactHeadTrackedRegular(repoRoot, AUTHORITY_PATH, "authority");
  if (authorityState.absolute !== expectedAbsolute) fail("authority-case-exact-absolute-path", authorityState.absolute);
  const manifestState = readExactHeadTrackedRegular(repoRoot, MANIFEST_PATH, "manifest");
  const manifestText = new TextDecoder("utf-8", { fatal: true, ignoreBOM: false }).decode(manifestState.bytes);
  const manifestEntries = parseManifest(manifestText);
  validateRootManifestJoin(manifestEntries, authorityState.observation);

  const { value: root } = strictJsonParse(authorityState.bytes, "canonical-authority", true);
  validateRootSchema(root);
  verifySeals(root);
  return {
    absolute: authorityState.absolute,
    authorityPath: AUTHORITY_PATH,
    authorityState,
    bytes: authorityState.bytes,
    manifestEntries,
    manifestState,
    repoRoot,
    root
  };
}

function loadPackage(authorityArgument) {
  const loaded = loadAuthorityBoundary(authorityArgument);
  const { repoRoot, root } = loaded;
  const technicalRole = root.currentRoles.find((entry) => entry.role === "currentTechnicalProfile");
  const profileFile = existingTrackedRegular(repoRoot, technicalRole.path);
  const profile = strictJsonParse(fs.readFileSync(profileFile.absolute), "technical-profile", true).value;
  validateProfile(profile);
  verifyCurrentFiles(repoRoot, root, profile);
  verifyFrozenFiles(repoRoot, root);
  const matrixFile = existingTrackedRegular(repoRoot, root.rolePolicy.proofMatrix.path);
  if (sha256(fs.readFileSync(matrixFile.absolute)) !== root.rolePolicy.proofMatrix.sha256) fail("proof-matrix-hash");
  const matrix = strictJsonParse(fs.readFileSync(matrixFile.absolute), "proof-matrix", true).value;
  if (matrix.positive.length !== 10 || matrix.negative.length !== 65 || matrix.properties.length !== 14) fail("proof-matrix-count");
  const manifestVerification = verifyManifest(repoRoot, root, loaded);
  const authorityInfo = { authorityJcsSha256: root.seal.authorityJcsSha256, fileSha256: sha256(loaded.bytes), path: loaded.authorityPath };
  const proof = runProofMatrix(root, profile, matrix, authorityInfo, repoRoot);
  const secondProof = runProofMatrix(root, profile, matrix, authorityInfo, repoRoot);
  if (jcs(proof) !== jcs(secondProof)) fail("proof-repeat-not-deterministic");
  const mutationCapture = fs.readFileSync(path.join(repoRoot, MUTATION_CAPTURE_PATH), "utf8");
  if (mutationCapture !== normalized(proof)) fail("mutation-capture-mismatch");
  const boundaryCapture = fs.readFileSync(path.join(repoRoot, BOUNDARY_CAPTURE_PATH), "utf8");
  const boundaryDiagnostics = runBoundaryDiagnosticMatrix();
  if (boundaryCapture !== normalized(boundaryDiagnostics)) fail("boundary-capture-mismatch");
  return { ...loaded, authorityInfo, boundaryDiagnostics, manifestEntries: manifestVerification.count, manifestVerification, matrix, profile, proof };
}

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (isPlainObject(value)) return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])]));
  return value;
}

function normalized(value) {
  return `${JSON.stringify(stable(value), null, 2)}\n`;
}

function packageOnlyResult(loaded) {
  return {
    acceptanceEligible: false,
    authority: {
      authorityJcsSha256: loaded.root.seal.authorityJcsSha256,
      fileSha256: loaded.authorityInfo.fileSha256,
      markdownAuthority: loaded.root.subject.markdownAuthority,
      path: loaded.authorityInfo.path,
      rootCount: loaded.root.rolePolicy.rootCount
    },
    disposition: "PACKAGE_CONSISTENCY_PASS_NOT_INDEPENDENT_ACCEPTANCE",
    mode: "package-only",
    ok: true,
    package: {
      manifestEntries: loaded.manifestEntries,
      currentRoles: loaded.root.currentRoles.length,
      executableCurrentRoles: loaded.root.currentRoles.filter((entry) => entry.executableAuthority).length
    },
    proofMatrix: loaded.proof.counts,
    runtime: { arch: process.arch, node: process.versions.node, platform: process.platform }
  };
}

function reviewResult(loaded, envelopePath, envelope, envelopeJcsSha256, reviewFacts, observed) {
  return {
    acceptanceEligible: true,
    attachmentDiagnostic: observed.symbolicRef === null ? "detached-exact-head" : "attached-exact-ref",
    authority: {
      authorityJcsSha256: loaded.root.seal.authorityJcsSha256,
      fileSha256: loaded.authorityInfo.fileSha256,
      path: loaded.authorityInfo.path
    },
    disposition: "TECHNICAL_REVIEW_INPUT_VALID_FRESH_INDEPENDENT_HUMAN_PASS_REQUIRED",
    envelope: {
      consumedLeafCount: 16,
      jcsSha256: envelopeJcsSha256,
      path: path.resolve(envelopePath),
      schemaId: envelope.schemaId
    },
    git: {
      attachmentPolicy: envelope.expectedGit.attachmentPolicy,
      clean: observed.clean,
      expectedHead: envelope.expectedGit.head,
      expectedParent: envelope.expectedGit.parent,
      expectedRef: envelope.expectedGit.ref,
      expectedTree: envelope.expectedGit.tree,
      ...reviewFacts
    },
    mode: "full-review",
    ok: true,
    package: { manifestEntries: loaded.manifestEntries },
    proofMatrix: loaded.proof.counts,
    runtime: { arch: process.arch, node: process.versions.node, platform: process.platform }
  };
}

function parseArgs(argv) {
  const args = [...argv];
  const result = {};
  while (args.length > 0) {
    const key = args.shift();
    if (key === "--package-only") {
      if (result.packageOnly) fail("duplicate-cli-argument", key);
      result.packageOnly = true;
      continue;
    }
    if (key === "--authority" || key === "--review-envelope") {
      const value = args.shift();
      if (!value || value.startsWith("--")) fail("missing-cli-value", key);
      const field = key === "--authority" ? "authority" : "reviewEnvelope";
      if (result[field]) fail("duplicate-cli-argument", key);
      result[field] = value;
      continue;
    }
    fail("unknown-cli-argument", String(key));
  }
  if (!result.authority) fail("authority-required");
  if (Boolean(result.packageOnly) === Boolean(result.reviewEnvelope)) fail("select-exactly-one-mode");
  return result;
}

function main() {
  if (process.versions.node !== EXPECTED_NODE) fail("node-version", process.versions.node);
  const args = parseArgs(process.argv.slice(2));
  const loaded = loadPackage(args.authority);
  if (args.packageOnly) {
    const result = packageOnlyResult(loaded);
    const expectedCapture = fs.readFileSync(path.join(loaded.repoRoot, PACKAGE_CAPTURE_PATH), "utf8");
    if (expectedCapture !== normalized(result)) fail("package-capture-mismatch");
    process.stdout.write(normalized(result));
    return;
  }
  const envelopeBytes = fs.readFileSync(args.reviewEnvelope);
  const envelope = strictJsonParse(envelopeBytes, "review-envelope").value;
  validateEnvelopeSchema(envelope);
  const observed = observeGit(loaded.repoRoot, envelope.expectedGit.ref, envelope.expectedGit.head);
  const reviewFacts = validateReviewPure(loaded.root, envelope, loaded.authorityInfo, observed);
  const envelopeJcsSha256 = sha256(Buffer.from(jcs(envelope), "utf8"));
  process.stdout.write(normalized(reviewResult(loaded, args.reviewEnvelope, envelope, envelopeJcsSha256, reviewFacts, observed)));
}

const invokedAsMain = process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
if (invokedAsMain) main();
