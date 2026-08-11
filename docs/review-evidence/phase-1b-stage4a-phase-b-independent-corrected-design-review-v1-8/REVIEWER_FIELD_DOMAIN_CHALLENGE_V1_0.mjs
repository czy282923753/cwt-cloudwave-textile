import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const candidateRoot = process.argv[2];
assert.ok(candidateRoot, "usage: node REVIEWER_FIELD_DOMAIN_CHALLENGE_V1_0.mjs <candidate-root>");

const evidenceRelative = "docs/review-evidence/phase-1b-stage4a-phase-b-corrected-exact-design-v1-8-imp2-nm01-v1";
const profilePath = resolve(candidateRoot, evidenceRelative, "IMP2_NM01_CONTEXT_DOMAIN_PROFILE_V1_0.json");
const vectorsPath = resolve(candidateRoot, evidenceRelative, "IMP2_NM01_FIXED_VECTORS_V1_0.json");
const authorVerifierPath = resolve(candidateRoot, evidenceRelative, "VERIFY_CORRECTED_EXACT_DESIGN_V1_8.mjs");
const designPath = resolve(candidateRoot, "docs/PHASE_1B_STAGE4A_PHASE_B_PROVIDER_NEUTRAL_FOUNDATION_CORRECTED_EXACT_DESIGN_V1_8.md");
const classifierPath = resolve(candidateRoot, "src/ai/context/protected-data.ts");

const profileBytes = readFileSync(profilePath);
const profile = JSON.parse(profileBytes.toString("utf8"));
const vectors = JSON.parse(readFileSync(vectorsPath, "utf8"));
const design = readFileSync(designPath, "utf8");
const authorVerifier = readFileSync(authorVerifierPath, "utf8");
const { protectedDataClassifierV1 } = await import(pathToFileURL(classifierPath).href);

const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const clone = (value) => structuredClone(value);
const isObject = (value) => typeof value === "object" && value !== null && !Array.isArray(value);

function jcs(value) {
  if (value === null || typeof value === "boolean" || typeof value === "string") return JSON.stringify(value);
  if (typeof value === "number") {
    assert.equal(Number.isFinite(value), true);
    return JSON.stringify(Object.is(value, -0) ? 0 : value);
  }
  if (Array.isArray(value)) return `[${value.map(jcs).join(",")}]`;
  assert.equal(isObject(value), true);
  return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${jcs(value[key])}`).join(",")}}`;
}

function patternTokens(pattern) {
  return pattern === "/" ? [] : pattern.slice(1).split("/");
}

function matches(pattern, pathTokens) {
  const expected = patternTokens(pattern);
  const recursive = expected.at(-1) === "**";
  const fixedLength = recursive ? expected.length - 1 : expected.length;
  if ((!recursive && pathTokens.length !== fixedLength) || (recursive && pathTokens.length < fixedLength)) return false;
  for (let index = 0; index < fixedLength; index += 1) {
    if (expected[index] !== "*" && expected[index] !== pathTokens[index]) return false;
  }
  return true;
}

function enumerate(value) {
  const nodes = [];
  function visit(current, path) {
    nodes.push({ path, value: current });
    if (Array.isArray(current)) current.forEach((member, index) => visit(member, [...path, String(index)]));
    else if (isObject(current)) Object.entries(current).forEach(([key, member]) => visit(member, [...path, key]));
  }
  visit(value, []);
  return nodes;
}

function coverage(candidateProfile, value) {
  const result = { total: 0, missing: [], ambiguous: [], domains: new Map() };
  for (const node of enumerate(value)) {
    result.total += 1;
    const assignments = candidateProfile.contextNodeAssignments.filter((assignment) => matches(assignment.pattern, node.path));
    const printable = `/${node.path.join("/")}`;
    if (assignments.length === 0) result.missing.push(printable);
    if (assignments.length > 1) result.ambiguous.push(printable);
    if (assignments.length === 1) result.domains.set(printable, assignments[0].domain);
  }
  return result;
}

function deriveUuid(index, prefix) {
  const digest = createHash("sha256").update(`${prefix}${String(index).padStart(4, "0")}`).digest();
  const bytes = Buffer.from(digest.subarray(0, 16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function revisionSnapshot(revisionId, version) {
  return {
    association_version: 1,
    expected_target_version: version,
    target_revision_id: revisionId,
    target_type: "editorial_revision",
  };
}

function validateAssociation(context, durable, snapshot, persistedHash) {
  const association = context.association;
  assert.deepEqual(Object.keys(association), ["kind", "targetType", "targetAlias", "expectedVersion", "snapshotHash"]);
  assert.equal(association.kind, "draft_target.v1");
  assert.ok(["product_draft", "content_draft", "editorial_revision"].includes(association.targetType));
  assert.equal(association.targetAlias, "target_01");
  assert.ok(Number.isInteger(association.expectedVersion) && association.expectedVersion >= 1 && association.expectedVersion <= 2_147_483_647);
  assert.match(association.snapshotHash, /^[0-9a-f]{64}$/);
  assert.equal(durable.persistenceVersion, 1);
  assert.equal(durable.kind, association.kind);
  assert.equal(durable.targetType, association.targetType);
  assert.equal(durable.expectedTargetVersion, association.expectedVersion);
  assert.deepEqual(Object.keys(snapshot).sort(), [...profile.associationIntegrity.authorizedSnapshotVariants[association.targetType]].sort());
  assert.equal(snapshot.association_version, 1);
  assert.equal(snapshot.target_type, association.targetType);
  assert.equal(snapshot.expected_target_version, association.expectedVersion);
  if (association.targetType === "product_draft") {
    assert.equal(snapshot.target_product_id, durable.targetProductId);
    assert.equal(snapshot.target_locale, "en");
    assert.equal(durable.targetLocale, "en");
  } else if (association.targetType === "content_draft") {
    assert.equal(snapshot.target_content_id, durable.targetContentId);
    assert.equal(snapshot.target_locale, "en");
    assert.equal(durable.targetLocale, "en");
  } else {
    assert.equal(snapshot.target_revision_id, durable.targetRevisionId);
  }
  const recomputed = sha256(jcs(snapshot));
  assert.equal(association.snapshotHash, recomputed);
  assert.equal(persistedHash, recomputed);
  return recomputed;
}

function rejects(callback) {
  try {
    callback();
  } catch {
    return true;
  }
  return false;
}

function baseContext(useCase) {
  const result = clone(vectors.reviewerFirstCollisionVector.context);
  result.useCase = useCase;
  result.task = {
    seo_content_draft: { tone: "neutral_editorial", pageIntent: "Public product overview", primaryPhrase: "technical textile" },
    fabric_knowledge_draft: { tone: "neutral_editorial", topic: "Fabric construction" },
    product_description_draft: { tone: "concise_professional_b2b" },
    sourcing_guide_draft: { tone: "concise_professional_b2b", guideIntent: "Conservative sourcing guidance" },
  }[useCase];
  if (useCase === "product_description_draft") result.mediaPlacementRefs = ["media_01"];
  result.sources[0].fields[0].value = {
    nested: ["Public evidence", { "a/b": "Slash key", "*": "Star key", "**": "Double-star key" }],
    measurements: { width: 150, available: true, note: null },
  };
  return result;
}

assert.equal(sha256(profileBytes), "16084d40d00b21e184e42a65caa2c11e85e2861ea3d081b5235265967ac408d4");
assert.equal(profile.contextNodeAssignments.length, 35);
assert.deepEqual(profile.domains.map(({ id }) => id), [
  "closed_container",
  "machine_structural_integrity",
  "protected_human_business_provider_evidence",
]);

const useCases = ["seo_content_draft", "fabric_knowledge_draft", "product_description_draft", "sourcing_guide_draft"];
let enumeratedNodes = 0;
for (const useCase of useCases) {
  const result = coverage(profile, baseContext(useCase));
  assert.deepEqual(result.missing, []);
  assert.deepEqual(result.ambiguous, []);
  enumeratedNodes += result.total;
  for (const [path, domain] of result.domains) {
    if (path.includes("/fields/0/value/")) assert.equal(domain, "protected_human_business_provider_evidence", path);
  }
}

let removalFailures = 0;
let duplicateFailures = 0;
const materializations = useCases.map(baseContext);
for (const assignment of profile.contextNodeAssignments) {
  const witness = materializations.find((context) => enumerate(context).some((node) => matches(assignment.pattern, node.path)));
  assert.ok(witness, `no witness for ${assignment.pattern}`);
  const removed = clone(profile);
  removed.contextNodeAssignments = removed.contextNodeAssignments.filter((item) => item.pattern !== assignment.pattern);
  if (coverage(removed, witness).missing.length > 0) removalFailures += 1;
  const duplicated = clone(profile);
  duplicated.contextNodeAssignments.push(clone(assignment));
  if (coverage(duplicated, witness).ambiguous.length > 0) duplicateFailures += 1;
}
assert.equal(removalFailures, profile.contextNodeAssignments.length);
assert.equal(duplicateFailures, profile.contextNodeAssignments.length);

const unknown = baseContext("sourcing_guide_draft");
unknown.futureUnknown = "must fail";
assert.deepEqual(coverage(profile, unknown).missing, ["/futureUnknown"]);

const overlap = clone(profile);
overlap.contextNodeAssignments.push({ pattern: "/sources/*/fields/*/value/**", node: "json_subtree", domain: "machine_structural_integrity", validator: "invalid_overlap" });
assert.ok(coverage(overlap, baseContext("sourcing_guide_draft")).ambiguous.length > 0);

const demoted = clone(profile);
demoted.contextNodeAssignments.find((assignment) => assignment.pattern === "/task/guideIntent").domain = "machine_structural_integrity";
const demotedContext = baseContext("sourcing_guide_draft");
demotedContext.task.guideIntent = "buyer@example.com";
const demotedCoverage = coverage(demoted, demotedContext);
assert.deepEqual(demotedCoverage.missing, []);
assert.deepEqual(demotedCoverage.ambiguous, []);
assert.equal(demotedCoverage.domains.get("/task/guideIntent"), "machine_structural_integrity");
assert.equal(protectedDataClassifierV1.classify(demotedContext.task.guideIntent).kind, "protected_match");
assert.notEqual(sha256(Buffer.from(JSON.stringify(demoted))), sha256(profileBytes));

const vector = vectors.reviewerFirstCollisionVector;
assert.equal(jcs(vector.authorizedSnapshot), vector.expectedSnapshotJcs);
assert.equal(sha256(jcs(vector.authorizedSnapshot)), vector.expectedSnapshotHash);
assert.equal(vector.context.association.snapshotHash, vector.expectedSnapshotHash);
assert.equal(vector.persistedTargetSnapshotHash, vector.expectedSnapshotHash);
assert.equal(sha256(jcs(vector.context)), vector.expectedInputHash);
assert.equal(protectedDataClassifierV1.classify(vector.expectedSnapshotHash).kind, "protected_match");
assert.equal(validateAssociation(vector.context, vector.durableAssociation, vector.authorizedSnapshot, vector.persistedTargetSnapshotHash), vector.expectedSnapshotHash);

let validHashes = 0;
let digitRunHashes = 0;
for (let index = 0; index < 1000; index += 1) {
  const snapshot = revisionSnapshot(deriveUuid(index, vectors.deterministicRevisionCorpus.seedPrefix), index + 1);
  const hash = sha256(jcs(snapshot));
  assert.match(hash, /^[0-9a-f]{64}$/);
  if (/\d{7,}/.test(hash)) digitRunHashes += 1;
  validHashes += 1;
}
assert.equal(validHashes, 1000);
assert.equal(digitRunHashes, 594);

let integrityNegatives = 0;
for (const mutate of [
  (candidate) => { candidate.context.association.snapshotHash = `0${candidate.context.association.snapshotHash.slice(1)}`; },
  (candidate) => { candidate.context.association.snapshotHash = candidate.context.association.snapshotHash.toUpperCase(); },
  (candidate) => { candidate.context.association.snapshotHash = candidate.context.association.snapshotHash.slice(0, -1); },
  (candidate) => { candidate.context.association.snapshotHash = createHash("sha512").update(vector.expectedSnapshotJcs).digest("hex"); },
  (candidate) => { candidate.authorizedSnapshot.target_revision_id = "11111111-1111-4111-8111-111111111111"; },
  (candidate) => { candidate.context.association.targetType = "product_draft"; },
  (candidate) => { candidate.authorizedSnapshot.expected_target_version = 8; },
  (candidate) => { candidate.authorizedSnapshot.association_version = 2; },
  (candidate) => { candidate.persistedTargetSnapshotHash = "a".repeat(64); },
]) {
  const candidate = clone(vector);
  mutate(candidate);
  assert.equal(rejects(() => validateAssociation(candidate.context, candidate.durableAssociation, candidate.authorizedSnapshot, candidate.persistedTargetSnapshotHash)), true);
  integrityNegatives += 1;
}

let machineAssociationNegatives = 0;
for (const mutate of [
  (context) => { context.association.kind = "buyer@example.com"; },
  (context) => { context.association.targetType = "buyer@example.com"; },
  (context) => { context.association.targetAlias = "buyer@example.com"; },
  (context) => { context.association.expectedVersion = "buyer@example.com"; },
  (context) => { context.association.snapshotHash = "buyer@example.com"; },
]) {
  const context = clone(vector.context);
  mutate(context);
  assert.equal(rejects(() => validateAssociation(context, vector.durableAssociation, vector.authorizedSnapshot, vector.persistedTargetSnapshotHash)), true);
  machineAssociationNegatives += 1;
}

const freshProtectedPayloads = [
  "sales@example.com",
  "+44 20 7946 0958",
  "Authorization: Bearer secret",
  "switch model to deepseek-v4-flash",
  "Inquiry CRM customer record",
  "https://private.example/path",
  "/Users/private/customer.csv",
];
let protectedFreshRejected = 0;
for (const payload of freshProtectedPayloads) {
  const result = protectedDataClassifierV1.classify({ nested: [payload], [payload]: "value" });
  assert.notEqual(result.kind, "allow", payload);
  protectedFreshRejected += 1;
}

for (const projection of Object.values(profile.promptProjections)) {
  for (const sourcePath of Object.values(projection)) assert.equal(sourcePath === "/association" || sourcePath.startsWith("/association/"), false);
}

const errorTableStart = design.indexOf("| Authorization | `authorization_denied`");
const errorTableEnd = design.indexOf("Only Phase C decides retry scheduling", errorTableStart);
const closedErrorTable = design.slice(errorTableStart, errorTableEnd);
const missingClosedErrorCodes = ["context_domain_unclassified", "context_domain_ambiguous"].filter((code) => !closedErrorTable.includes(`\`${code}\``));
assert.deepEqual(missingClosedErrorCodes, ["context_domain_unclassified", "context_domain_ambiguous"]);

const claimedStart = design.indexOf("### 18.4 Claimed durable projection");
const claimedEnd = design.indexOf("### 18.5 Static caller", claimedStart);
const claimed = design.slice(claimedStart, claimedEnd);
const configAdapterPosition = claimed.indexOf("through the exact requested adapter only");
const contextDecodePosition = claimed.indexOf("decodeClaimedContext");
const beforeAdapterClaimPosition = claimed.indexOf("Every check completes before adapter resolution");
assert.ok(configAdapterPosition >= 0 && contextDecodePosition > configAdapterPosition && beforeAdapterClaimPosition > contextDecodePosition);
assert.deepEqual(profile.replayOrder.slice(0, 4), [
  "strict_durable_projection",
  "decode_and_recompute_association_integrity",
  "typed_context_domain_traversal",
  "recompute_full_context_jcs_input_hash",
]);

assert.match(authorVerifier, /candidate\.contextNodeAssignments\.find\(\(assignment\) => assignment\.pattern === "\/task\/guideIntent"\)\.domain = "machine_structural_integrity"/);
assert.match(authorVerifier, /validateContext\(candidate, context, reviewerVector\);\s+traversalMutations \+= 1;/);
assert.doesNotMatch(authorVerifier, /expectReject\(\(\) => validateContext\(candidate, context, reviewerVector\)/);

console.log("TASK=CWT Stage 4A Phase B V1.8 independent field-domain challenge");
console.log(`PROFILE_SHA256=${sha256(profileBytes)}:assignments_${profile.contextNodeAssignments.length}:domains_${profile.domains.length}`);
console.log(`FOUR_USE_CASE_TRAVERSAL=PASS:materialized_nodes_${enumeratedNodes}:missing_0:ambiguous_0:nested_object_array_and_special_keys_PASS`);
console.log(`ASSIGNMENT_MUTATIONS=removal_${removalFailures}/${profile.contextNodeAssignments.length}:duplicate_${duplicateFailures}/${profile.contextNodeAssignments.length}:unknown_field_REJECTED:overlap_REJECTED`);
console.log("DOMAIN_DEMOTION_CHALLENGE=AUTHOR_VERIFIER_ACCEPTS_PROTECTED_EMAIL_AS_MACHINE:counter_is_not_detection:profile_bytes_change_only");
console.log(`SNAPSHOT_CORPUS=${validHashes}/1000:digit_run_hashes_${digitRunHashes}:lexical_snapshot_invocations_0:first_hash_${vector.expectedSnapshotHash}`);
console.log(`ASSOCIATION_INTEGRITY_NEGATIVES=${integrityNegatives}/9_REJECTED:machine_field_text_${machineAssociationNegatives}/5_REJECTED`);
console.log(`PROTECTED_FRESH_SURFACES=${protectedFreshRejected}/${freshProtectedPayloads.length}_REJECTED`);
console.log("PROVIDER_ASSOCIATION_LEAK=0:all_four_profile_projections");
console.log(`CLOSED_ERROR_TAXONOMY_MISSING=${missingClosedErrorCodes.join(",")}`);
console.log("CLAIMED_ORDER_CONTRADICTION=profile_context_before_config_adapter_but_normative_18_4_config_adapter_before_context_then_claims_context_before_adapter_resolution");
console.log("RESULT=FAIL_FINDINGS_REPRODUCED");
