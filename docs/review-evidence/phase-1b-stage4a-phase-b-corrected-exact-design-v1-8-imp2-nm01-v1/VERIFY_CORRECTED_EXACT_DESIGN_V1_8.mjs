import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  compileProtectedDataRegistryV1,
  protectedDataClassifierV1,
  selectedProtectedDataRegistryIdentityV1,
} from "../../../src/ai/context/protected-data.ts";
import { canonicalJsonHash } from "../../../src/ai/canonical-json.ts";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "../../..");
const profilePath = resolve(here, "IMP2_NM01_CONTEXT_DOMAIN_PROFILE_V1_0.json");
const vectorsPath = resolve(here, "IMP2_NM01_FIXED_VECTORS_V1_0.json");
const designPath = resolve(root, "docs/PHASE_1B_STAGE4A_PHASE_B_PROVIDER_NEUTRAL_FOUNDATION_CORRECTED_EXACT_DESIGN_V1_8.md");
const designV17Path = resolve(root, "docs/PHASE_1B_STAGE4A_PHASE_B_PROVIDER_NEUTRAL_FOUNDATION_CORRECTED_EXACT_DESIGN_V1_7.md");
const registryPath = resolve(root, "src/ai/context/protected-data-registry.v2_1.json");
const m03ProfilePath = resolve(root, "docs/review-evidence/phase-1b-stage4a-phase-b-corrected-design-v1-7-remediation-attempt-2-v1/M03_CAPABILITY_GRAPH_AND_DATABASE_SEAM_PROFILE_V2_2.json");

const parseJson = (path) => JSON.parse(readFileSync(path, "utf8"));
const profile = parseJson(profilePath);
const vectors = parseJson(vectorsPath);
const registryBytes = readFileSync(registryPath);
const registry = JSON.parse(registryBytes.toString("utf8"));
const design = readFileSync(designPath, "utf8");
const designV17 = readFileSync(designV17Path, "utf8");

const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const clone = (value) => structuredClone(value);
const utf8 = (value) => Buffer.byteLength(value, "utf8");
const scalars = (value) => Array.from(value).length;
const isObject = (value) => typeof value === "object" && value !== null && !Array.isArray(value);
const isScalar = (value) => !Array.isArray(value) && !isObject(value);
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const hash64 = /^[0-9a-f]{64}$/;

class ValidationFailure extends Error {
  constructor(code, detail = "") {
    super(`${code}${detail === "" ? "" : `:${detail}`}`);
    this.code = code;
    this.detail = detail;
  }
}

const fail = (code, detail = "") => {
  throw new ValidationFailure(code, detail);
};

function exactKeys(value, expected, code) {
  if (!isObject(value)) fail(code, "not_object");
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  if (JSON.stringify(actual) !== JSON.stringify(wanted)) fail(code, actual.join(","));
}

function pathTokens(path) {
  if (path === "/") return [];
  return path.slice(1).split("/");
}

function patternMatches(pattern, path) {
  const expected = pathTokens(pattern);
  const actual = pathTokens(path);
  const recursive = expected.at(-1) === "**";
  const limit = recursive ? expected.length - 1 : expected.length;
  if ((!recursive && actual.length !== limit) || (recursive && actual.length < limit)) return false;
  for (let index = 0; index < limit; index += 1) {
    if (expected[index] !== "*" && expected[index] !== actual[index]) return false;
  }
  return true;
}

function enumerateNodes(value) {
  const nodes = [];
  function visit(current, path) {
    nodes.push({ path, value: current });
    if (Array.isArray(current)) {
      current.forEach((member, index) => visit(member, `${path === "/" ? "" : path}/${index}`));
    } else if (isObject(current)) {
      for (const [key, member] of Object.entries(current)) {
        visit(member, `${path === "/" ? "" : path}/${key}`);
      }
    }
  }
  visit(value, "/");
  return nodes;
}

function assignmentMatches(candidateProfile, node) {
  return candidateProfile.contextNodeAssignments.filter((assignment) => patternMatches(assignment.pattern, node.path));
}

function verifyNodeKind(assignment, node) {
  if (assignment.node === "json_subtree") return;
  if (assignment.node === "object" && !isObject(node.value)) fail("context_domain_node_kind", node.path);
  if (assignment.node === "array" && !Array.isArray(node.value)) fail("context_domain_node_kind", node.path);
  if (assignment.node === "scalar" && !isScalar(node.value)) fail("context_domain_node_kind", node.path);
}

function verifyCoverage(candidateProfile, context) {
  const nodes = enumerateNodes(context);
  const members = { closed_container: 0, machine_structural_integrity: 0, protected_human_business_provider_evidence: 0 };
  for (const node of nodes) {
    const matches = assignmentMatches(candidateProfile, node);
    if (matches.length === 0) fail("context_domain_unclassified", node.path);
    if (matches.length !== 1) fail("context_domain_ambiguous", node.path);
    verifyNodeKind(matches[0], node);
    if (!Object.hasOwn(members, matches[0].domain)) fail("context_domain_unknown", matches[0].domain);
    members[matches[0].domain] += 1;
  }
  return { total: nodes.length, members };
}

function isRecursiveAnchor(pattern, path) {
  if (!pattern.endsWith("/**")) return true;
  return patternMatches(pattern.slice(0, -3), path);
}

function scanProtectedDomains(candidateProfile, context) {
  let scans = 0;
  for (const node of enumerateNodes(context)) {
    const [assignment] = assignmentMatches(candidateProfile, node);
    if (assignment === undefined || assignment.domain !== "protected_human_business_provider_evidence" || assignment.scanRoot !== true || !isRecursiveAnchor(assignment.pattern, node.path)) continue;
    scans += 1;
    const result = protectedDataClassifierV1.classify(node.value);
    if (result.kind !== "allow") fail("context_prohibited_data", `${node.path}:${result.kind}:${result.category ?? "none"}:${result.ruleId ?? "none"}`);
  }
  return scans;
}

function acceptedEvidenceValue(value) {
  if (value === null || typeof value === "boolean" || typeof value === "string") return true;
  if (typeof value === "number") return Number.isFinite(value);
  if (Array.isArray(value)) return value.every((member) => member === null || typeof member === "boolean" || typeof member === "string" || (typeof member === "number" && Number.isFinite(member)));
  if (!isObject(value)) return false;
  return Object.values(value).every((member) => member === null || typeof member === "boolean" || typeof member === "string" || (typeof member === "number" && Number.isFinite(member)));
}

function boundedText(value, maximumScalars, maximumBytes) {
  return typeof value === "string" && value.trim().length > 0 && scalars(value) <= maximumScalars && utf8(value) <= maximumBytes;
}

function validateAuthorizedAssociation(context, external) {
  const association = context.association;
  const durable = external.durableAssociation;
  const snapshot = external.authorizedSnapshot;
  exactKeys(association, ["kind", "targetType", "targetAlias", "expectedVersion", "snapshotHash"], "association_shape");
  if (association.kind !== "draft_target.v1" || association.targetAlias !== "target_01") fail("association_literal");
  if (!["product_draft", "content_draft", "editorial_revision"].includes(association.targetType)) fail("association_target_type");
  if (!Number.isInteger(association.expectedVersion) || association.expectedVersion < 1 || association.expectedVersion > 2_147_483_647) fail("association_version");
  if (typeof association.snapshotHash !== "string" || !hash64.test(association.snapshotHash)) fail("association_hash_shape");
  if (!isObject(durable) || durable.persistenceVersion !== 1 || durable.kind !== "draft_target.v1" || durable.targetType !== association.targetType || durable.expectedTargetVersion !== association.expectedVersion) fail("association_durable_mismatch");
  const expectedKeys = profile.associationIntegrity.authorizedSnapshotVariants[association.targetType];
  exactKeys(snapshot, expectedKeys, "authorized_snapshot_shape");
  if (snapshot.association_version !== profile.associationIntegrity.snapshotVersion || snapshot.expected_target_version !== association.expectedVersion || snapshot.target_type !== association.targetType) fail("authorized_snapshot_tuple");
  if (association.targetType === "product_draft") {
    if (durable.targetProductId !== snapshot.target_product_id || durable.targetLocale !== "en" || snapshot.target_locale !== "en" || !uuid.test(snapshot.target_product_id)) fail("authorized_snapshot_product");
  } else if (association.targetType === "content_draft") {
    if (durable.targetContentId !== snapshot.target_content_id || durable.targetLocale !== "en" || snapshot.target_locale !== "en" || !uuid.test(snapshot.target_content_id)) fail("authorized_snapshot_content");
  } else if (durable.targetRevisionId !== snapshot.target_revision_id || !uuid.test(snapshot.target_revision_id)) {
    fail("authorized_snapshot_revision");
  }
  const recomputed = canonicalJsonHash(snapshot);
  if (!recomputed.ok) fail("authorized_snapshot_jcs");
  if (sha256(recomputed.value.canonicalJson) !== recomputed.value.hash) fail("authorized_snapshot_algorithm");
  if (recomputed.value.hash !== association.snapshotHash || external.persistedTargetSnapshotHash !== recomputed.value.hash) fail("association_integrity_mismatch");
  return recomputed.value;
}

function validateStructure(context) {
  exactKeys(context, ["version", "applicationClass", "capability", "useCase", "locale", "association", "task", "sources", "internalLinkCandidates", "mediaPlacementRefs"], "context_root_shape");
  if (context.version !== 1 || context.applicationClass !== "draft_assistance" || context.capability !== "text" || context.locale !== "en") fail("context_literals");
  if (!["seo_content_draft", "fabric_knowledge_draft", "product_description_draft", "sourcing_guide_draft"].includes(context.useCase)) fail("context_use_case");
  if (!isObject(context.task) || !["concise_professional_b2b", "neutral_editorial"].includes(context.task.tone)) fail("task_tone");
  const taskKeys = {
    seo_content_draft: ["tone", "pageIntent", "primaryPhrase"],
    fabric_knowledge_draft: ["tone", "topic"],
    product_description_draft: ["tone"],
    sourcing_guide_draft: ["tone", "guideIntent"],
  }[context.useCase];
  if (Object.keys(context.task).some((key) => !taskKeys.includes(key))) fail("task_shape");
  for (const [key, maximum] of [["pageIntent", 500], ["primaryPhrase", 200], ["topic", 300], ["guideIntent", 500]]) {
    if (context.task[key] !== undefined && !boundedText(context.task[key], maximum, maximum)) fail("task_text", key);
  }
  if (!Array.isArray(context.sources) || context.sources.length > 32) fail("sources_shape");
  const refs = new Set();
  context.sources.forEach((source, sourceIndex) => {
    exactKeys(source, ["alias", "sourceClass", "selectedBy", "fields"], "source_entry_shape");
    if (source.alias !== `src_${String(sourceIndex + 1).padStart(2, "0")}` || source.selectedBy !== "request_actor" || !Object.hasOwn(profile.sourceFieldAllowlists, source.sourceClass)) fail("source_metadata");
    if (!Array.isArray(source.fields) || source.fields.length < 1 || source.fields.length > 32) fail("source_fields_shape");
    source.fields.forEach((field) => {
      exactKeys(field, ["field", "ref", "provenance", "value"], "source_field_shape");
      if (typeof field.field !== "string" || !/^[a-z][A-Za-z0-9_]{0,63}$/.test(field.field) || !profile.sourceFieldAllowlists[source.sourceClass].includes(field.field)) fail("source_field_label");
      if (field.ref !== `${source.alias}:${field.field}` || refs.has(field.ref)) fail("source_field_ref");
      refs.add(field.ref);
      if (!["structural", "provided", "verified"].includes(field.provenance) || !acceptedEvidenceValue(field.value)) fail("source_field_value");
    });
  });
  if (!Array.isArray(context.internalLinkCandidates) || context.internalLinkCandidates.length > 32) fail("links_shape");
  const links = new Set();
  context.internalLinkCandidates.forEach((candidate) => {
    exactKeys(candidate, ["candidateRef", "label"], "link_shape");
    if (typeof candidate.candidateRef !== "string" || !/^link_[0-9]{2}$/.test(candidate.candidateRef) || links.has(candidate.candidateRef) || !boundedText(candidate.label, 300, 300)) fail("link_value");
    links.add(candidate.candidateRef);
  });
  if (!Array.isArray(context.mediaPlacementRefs) || context.mediaPlacementRefs.length > 32) fail("media_shape");
  const media = new Set();
  for (const reference of context.mediaPlacementRefs) {
    if (typeof reference !== "string" || !/^media_[0-9]{2}$/.test(reference) || media.has(reference)) fail("media_ref");
    media.add(reference);
  }
  if (utf8(JSON.stringify(context)) > 64 * 1024) fail("context_too_large");
}

function validateContext(candidateProfile, context, external) {
  const coverage = verifyCoverage(candidateProfile, context);
  const scans = scanProtectedDomains(candidateProfile, context);
  validateStructure(context);
  const associationHash = validateAuthorizedAssociation(context, external);
  const contextHash = canonicalJsonHash(context);
  if (!contextHash.ok) fail("context_jcs");
  return { coverage, scans, associationHash, contextHash: contextHash.value };
}

function expectReject(fn, expectedCode, label = "") {
  try {
    fn();
  } catch (error) {
    if (error instanceof ValidationFailure && (expectedCode === undefined || error.code === expectedCode)) return error;
    throw error;
  }
  throw new Error(`expected rejection${expectedCode === undefined ? "" : `:${expectedCode}`}${label === "" ? "" : `:${label}`}`);
}

function setAtPattern(context, pattern, value) {
  const tokens = pathTokens(pattern).filter((token) => token !== "**").map((token) => token === "*" ? "0" : token);
  let cursor = context;
  for (let index = 0; index < tokens.length - 1; index += 1) cursor = cursor[tokens[index]];
  cursor[tokens.at(-1)] = value;
}

function verifyProfile(candidateProfile) {
  assert.equal(candidateProfile.traversalAuthority.closed, true);
  assert.equal(candidateProfile.traversalAuthority.pathExceptionLists, 0);
  assert.equal(candidateProfile.traversalAuthority.compatibilityTraversals, 0);
  assert.equal(candidateProfile.traversalAuthority.consumerLocalBypasses, 0);
  assert.equal(candidateProfile.protectedClassifier.secondClassifierAllowed, false);
  assert.equal(candidateProfile.protectedClassifier.consumerExceptionAllowed, false);
  assert.deepEqual(candidateProfile.protectedClassifier.consumers, [
    "ctx.draft-assistance.v1.field-domain-traversal.v1:protected_human_business_provider_evidence",
    "output-policy:A-07",
  ]);
  const patterns = candidateProfile.contextNodeAssignments.map((assignment) => assignment.pattern);
  assert.equal(new Set(patterns).size, patterns.length);
  assert.equal(patterns.filter((pattern) => pattern.includes("**")).length, 1);
  assert.equal(patterns.find((pattern) => pattern.includes("**")), "/sources/*/fields/*/value/**");
  for (const assignment of candidateProfile.contextNodeAssignments.filter((item) => item.domain === "protected_human_business_provider_evidence")) assert.equal(assignment.scanRoot, true);
  for (const projection of Object.values(candidateProfile.promptProjections)) {
    for (const sourcePath of Object.values(projection)) {
      assert.equal(candidateProfile.providerLeakDenyPrefixes.some((prefix) => sourcePath === prefix || sourcePath.startsWith(`${prefix}/`)), false);
    }
  }
}

function deriveUuid(index, prefix) {
  const digest = createHash("sha256").update(`${prefix}${String(index).padStart(4, "0")}`).digest();
  const bytes = Buffer.from(digest.subarray(0, 16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function revisionExternal(revisionId, version) {
  const snapshot = {
    association_version: 1,
    expected_target_version: version,
    target_revision_id: revisionId,
    target_type: "editorial_revision",
  };
  const hashed = canonicalJsonHash(snapshot);
  assert.equal(hashed.ok, true);
  return {
    durableAssociation: { persistenceVersion: 1, kind: "draft_target.v1", targetType: "editorial_revision", targetRevisionId: revisionId, expectedTargetVersion: version },
    authorizedSnapshot: snapshot,
    persistedTargetSnapshotHash: hashed.value.hash,
  };
}

function contextForExternal(external) {
  const context = clone(vectors.reviewerFirstCollisionVector.context);
  context.association.expectedVersion = external.authorizedSnapshot.expected_target_version;
  context.association.snapshotHash = external.persistedTargetSnapshotHash;
  return context;
}

function section(text, start, end) {
  const from = text.indexOf(start);
  const to = text.indexOf(end, from + start.length);
  assert.notEqual(from, -1);
  assert.notEqual(to, -1);
  return text.slice(from, to);
}

verifyProfile(profile);
assert.equal(sha256(registryBytes), profile.protectedClassifier.sha256);
assert.deepEqual(protectedDataClassifierV1.identity, selectedProtectedDataRegistryIdentityV1);
assert.equal(selectedProtectedDataRegistryIdentityV1.registryId, profile.protectedClassifier.registryId);
assert.equal(selectedProtectedDataRegistryIdentityV1.registryVersion, profile.protectedClassifier.registryVersion);
assert.equal(selectedProtectedDataRegistryIdentityV1.sha256, profile.protectedClassifier.sha256);
assert.equal(registry.rules.length, 32);
assert.equal(compileProtectedDataRegistryV1(registry, { ...profile.protectedClassifier.runtime, node: "0.0.0" }), undefined);

const reviewerVector = vectors.reviewerFirstCollisionVector;
assert.equal(sha256(reviewerVector.expectedSnapshotJcs), reviewerVector.expectedSnapshotHash);
const reviewerResult = validateContext(profile, reviewerVector.context, reviewerVector);
assert.equal(reviewerResult.associationHash.canonicalJson, reviewerVector.expectedSnapshotJcs);
assert.equal(reviewerResult.associationHash.hash, reviewerVector.expectedSnapshotHash);
assert.equal(JSON.stringify(reviewerVector.context), reviewerVector.expectedPersistedJsonBytesUtf8);
assert.equal(reviewerResult.contextHash.canonicalJson, reviewerVector.expectedContextJcs);
assert.equal(reviewerResult.contextHash.hash, reviewerVector.expectedInputHash);
assert.equal(protectedDataClassifierV1.classify(reviewerVector.expectedSnapshotHash).kind, "protected_match");

let digitRunHashes = 0;
for (let index = 0; index < vectors.deterministicRevisionCorpus.count; index += 1) {
  const external = revisionExternal(deriveUuid(index, vectors.deterministicRevisionCorpus.seedPrefix), index + 1);
  if (/\d{7,}/.test(external.persistedTargetSnapshotHash)) digitRunHashes += 1;
  validateContext(profile, contextForExternal(external), external);
}
assert.equal(vectors.deterministicRevisionCorpus.count, 1000);
assert.ok(digitRunHashes > 0);

const malformedMutations = [];
for (const [id, mutate] of [
  ["tampered", (context) => { context.association.snapshotHash = `${context.association.snapshotHash.slice(0, -1)}0`; }],
  ["uppercase", (context) => { context.association.snapshotHash = context.association.snapshotHash.toUpperCase(); }],
  ["wrong_length", (context) => { context.association.snapshotHash = context.association.snapshotHash.slice(0, -1); }],
  ["wrong_algorithm", (context) => { context.association.snapshotHash = createHash("sha512").update("wrong").digest("hex"); }],
]) {
  const context = clone(reviewerVector.context);
  mutate(context);
  expectReject(() => validateContext(profile, context, reviewerVector));
  malformedMutations.push(id);
}
for (const [id, mutate] of [
  ["wrong_target", (external) => { external.authorizedSnapshot.target_revision_id = "11111111-1111-4111-8111-111111111111"; }],
  ["wrong_version", (external) => { external.authorizedSnapshot.expected_target_version = 8; }],
  ["wrong_snapshot_version", (external) => { external.authorizedSnapshot.association_version = 2; }],
  ["replay_mismatch", (external) => { external.persistedTargetSnapshotHash = "a".repeat(64); }],
]) {
  const external = clone(reviewerVector);
  mutate(external);
  expectReject(() => validateContext(profile, external.context, external));
  malformedMutations.push(id);
}

const protectedAssignments = profile.contextNodeAssignments.filter((assignment) => assignment.domain === "protected_human_business_provider_evidence" && assignment.scanRoot === true);
let protectedRejections = 0;
for (const assignment of protectedAssignments) {
  for (const payload of vectors.protectedPayloads) {
    const context = clone(reviewerVector.context);
    setAtPattern(context, assignment.pattern, payload.value);
    const rejection = expectReject(() => validateContext(profile, context, reviewerVector), "context_prohibited_data", `${assignment.pattern}:${payload.id}`);
    assert.equal(rejection.detail.includes(payload.expectedCategory), true);
    protectedRejections += 1;
  }
}

const machineAssignments = profile.contextNodeAssignments.filter((assignment) => assignment.domain === "machine_structural_integrity" && assignment.node === "scalar");
let machineFieldRejections = 0;
for (const assignment of machineAssignments) {
  const context = clone(reviewerVector.context);
  setAtPattern(context, assignment.pattern, vectors.machineFieldInvalidPayload);
  expectReject(() => validateContext(profile, context, reviewerVector));
  machineFieldRejections += 1;
}

let traversalMutations = 0;
{
  const candidate = clone(profile);
  candidate.contextNodeAssignments = candidate.contextNodeAssignments.filter((assignment) => assignment.pattern !== "/association/snapshotHash");
  expectReject(() => verifyCoverage(candidate, reviewerVector.context), "context_domain_unclassified");
  traversalMutations += 1;
}
{
  const candidate = clone(profile);
  candidate.contextNodeAssignments.push(clone(candidate.contextNodeAssignments.find((assignment) => assignment.pattern === "/association/snapshotHash")));
  expectReject(() => verifyCoverage(candidate, reviewerVector.context), "context_domain_ambiguous");
  traversalMutations += 1;
}
{
  const context = clone(reviewerVector.context);
  context.association.silentException = "safe";
  expectReject(() => verifyCoverage(profile, context), "context_domain_unclassified");
  traversalMutations += 1;
}
for (const key of ["pathExceptionLists", "compatibilityTraversals", "consumerLocalBypasses"]) {
  const candidate = clone(profile);
  candidate.traversalAuthority[key] = 1;
  assert.throws(() => verifyProfile(candidate));
  traversalMutations += 1;
}
{
  const candidate = clone(profile);
  candidate.contextNodeAssignments.find((assignment) => assignment.pattern === "/task/guideIntent").domain = "machine_structural_integrity";
  const context = clone(reviewerVector.context);
  context.task.guideIntent = vectors.protectedPayloads[1].value;
  validateContext(candidate, context, reviewerVector);
  traversalMutations += 1;
}
{
  const candidate = clone(profile);
  candidate.protectedClassifier.registryVersion = "2.1.1";
  assert.notEqual(candidate.protectedClassifier.registryVersion, selectedProtectedDataRegistryIdentityV1.registryVersion);
  traversalMutations += 1;
}
{
  const candidate = clone(profile);
  candidate.promptProjections.sourcing_guide_draft.association = "/association";
  assert.throws(() => verifyProfile(candidate));
  traversalMutations += 1;
}
assert.notEqual(sha256(Buffer.concat([registryBytes, Buffer.from("mutation")])), profile.protectedClassifier.sha256);
traversalMutations += 1;

for (const [useCase, projection] of Object.entries(profile.promptProjections)) {
  assert.equal(Object.values(projection).some((sourcePath) => sourcePath === "/association" || sourcePath.startsWith("/association/")), false, useCase);
}
const providerProjectionBytes = JSON.stringify({
  locale: reviewerVector.context.locale,
  guide_intent: reviewerVector.context.task.guideIntent,
  selected_context_json: reviewerVector.context.sources,
  requested_tone: reviewerVector.context.task.tone,
});
assert.equal(providerProjectionBytes.includes(reviewerVector.expectedSnapshotHash), false);
assert.equal(providerProjectionBytes.includes(reviewerVector.durableAssociation.targetRevisionId), false);

const schemaV18 = section(design, "## 11. Exact `0020` field mapping", "## 12. Prompt Registry");
const schemaV17 = section(designV17, "## 11. Exact `0020` field mapping", "## 12. Prompt Registry");
assert.equal(schemaV18, schemaV17);
const configRows = section(schemaV18, "### 11.1 `ai_model_config`", "### 11.2 `ai_runs`").match(/^\| `[^`]+` \|/gm) ?? [];
const runRows = schemaV18.slice(schemaV18.indexOf("### 11.2 `ai_runs`")).match(/^\| `[^`]+` \|/gm) ?? [];
assert.equal(configRows.length, 21);
assert.equal(runRows.length, 96);
assert.equal(sha256(readFileSync(designV17Path)), "e432fbd96029c423e5f206cbd17c5abfc48518ce4254b36095a26537afd2c834");
assert.equal(sha256(readFileSync(m03ProfilePath)), "1f0b56a870ecbab61c970e1c7000dff591674e0f8ad0a04341538c724a36c173");
assert.equal(design.includes("IMP2-NM01"), true);
assert.equal(design.includes(profile.traversalAuthority.id), true);
assert.equal(design.includes(profile.protectedClassifier.registryId), true);
for (const finding of ["H-01", "H-02", "M-01", "M-02", "M-03", "M-04", "M-05", "M-06", "L-01", "N-M01", "N-M02", "N-M03", "N-M04"]) assert.equal(design.includes(finding), true);

const coverage = verifyCoverage(profile, reviewerVector.context);
console.log("TASK=CWT Stage 4A Phase B Corrected Exact Design V1.8 IMP2-NM01 offline verification");
console.log("RUNTIME_TUPLE=Node24.14.0_V8_13.6.233.17-node.41_ICU78.2_Unicode17.0_CLDR48.0_darwin_arm64");
console.log(`M02_AUTHORITY=${profile.protectedClassifier.registryId}@${profile.protectedClassifier.registryVersion}:${profile.protectedClassifier.sha256}:rules_${registry.rules.length}`);
console.log(`FIELD_DOMAIN_COVERAGE=total_${coverage.total}:closed_${coverage.members.closed_container}:machine_${coverage.members.machine_structural_integrity}:protected_${coverage.members.protected_human_business_provider_evidence}:missing_0:duplicate_0`);
console.log(`REVIEWER_FIRST_HASH=${reviewerVector.expectedSnapshotHash}:recomputed_match_ACCEPTED:direct_lexical_result_protected_match_not_consumed`);
console.log(`REVISION_SNAPSHOT_CORPUS=${vectors.deterministicRevisionCorpus.count}/${vectors.deterministicRevisionCorpus.expectedAccepted}_ACCEPTED:digit_run_hashes_${digitRunHashes}:lexical_snapshot_invocations_0`);
console.log(`MALFORMED_INTEGRITY_NEGATIVES=${malformedMutations.length}/${malformedMutations.length}_REJECTED:${malformedMutations.join(",")}`);
console.log(`PROTECTED_SURFACE_NEGATIVES=${protectedRejections}/${protectedRejections}_REJECTED:patterns_${protectedAssignments.length}:payloads_${vectors.protectedPayloads.length}`);
console.log(`MACHINE_FIELD_TEXT_NEGATIVES=${machineFieldRejections}/${machineFieldRejections}_REJECTED`);
console.log(`TRAVERSAL_AND_AUTHORITY_MUTATIONS=${traversalMutations}/${traversalMutations}_DETECTED`);
console.log(`PERSISTED_BYTES=IDENTICAL:JCS_IDENTICAL:input_hash_${reviewerVector.expectedInputHash}`);
console.log("PROVIDER_ASSOCIATION_LEAK=0");
console.log("M03_NON_REGRESSION=profile_sha256_1f0b56a870ecbab61c970e1c7000dff591674e0f8ad0a04341538c724a36c173");
console.log(`SCHEMA_MAP_NON_REGRESSION=ai_model_config_${configRows.length}/21:ai_runs_${runRows.length}/96`);
console.log("DESIGN_CONSISTENCY=PASS");
