import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  compileProtectedDataRegistryV1,
  protectedDataClassifierV1,
  selectedProtectedDataRegistryIdentityV1,
} from "../../../src/ai/context/protected-data.ts";
import { canonicalJsonHash } from "../../../src/ai/canonical-json.ts";
import { aiErrorCodes, aiFailure } from "../../../src/ai/errors.ts";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "../../..");
const profilePath = resolve(here, "V18_M01_M03_ATTEMPT_2_MACHINE_PROFILE_V2_0.json");
const vectorsPath = resolve(here, "V18_M01_M03_ATTEMPT_2_FIXED_VECTORS_V2_0.json");
const positiveTypeProbePath = resolve(here, "ERROR_TAXONOMY_TWO_LAYER_POSITIVE_PROBE_V1_0.ts");
const negativeTypeProbePaths = Object.freeze({
  taxonomy_subset_inverse_negative_probe: resolve(here, "ERROR_TAXONOMY_SUBSET_INVERSE_NEGATIVE_V1_0.ts.fixture"),
  taxonomy_json_widening_negative_probe: resolve(here, "ERROR_TAXONOMY_JSON_WIDENING_NEGATIVE_V1_0.ts.fixture"),
  taxonomy_unknown_traversal_type_negative_probe: resolve(here, "ERROR_TAXONOMY_UNKNOWN_TRAVERSAL_NEGATIVE_V1_0.ts.fixture"),
});
const designPath = resolve(root, "docs/PHASE_1B_STAGE4A_PHASE_B_PROVIDER_NEUTRAL_FOUNDATION_CORRECTED_EXACT_DESIGN_V1_10.md");
const designV19Path = resolve(root, "docs/PHASE_1B_STAGE4A_PHASE_B_PROVIDER_NEUTRAL_FOUNDATION_CORRECTED_EXACT_DESIGN_V1_9.md");
const designV18Path = resolve(root, "docs/PHASE_1B_STAGE4A_PHASE_B_PROVIDER_NEUTRAL_FOUNDATION_CORRECTED_EXACT_DESIGN_V1_8.md");
const profileV19Path = resolve(root, "docs/review-evidence/phase-1b-stage4a-phase-b-corrected-exact-design-v1-9-v18-remediation-v1/V18_M01_M02_M03_MACHINE_PROFILE_V1_0.json");
const registryPath = resolve(root, "src/ai/context/protected-data-registry.v2_1.json");
const errorsPath = resolve(root, "src/ai/errors.ts");
const m03ProfilePath = resolve(root, "docs/review-evidence/phase-1b-stage4a-phase-b-corrected-design-v1-7-remediation-attempt-2-v1/M03_CAPABILITY_GRAPH_AND_DATABASE_SEAM_PROFILE_V2_2.json");
const v18ManifestPath = resolve(root, "docs/review-evidence/phase-1b-stage4a-phase-b-corrected-exact-design-v1-8-imp2-nm01-v1/SHA256SUMS.txt");
const reviewV18ManifestPath = resolve(root, "docs/review-evidence/phase-1b-stage4a-phase-b-independent-corrected-design-review-v1-8/SHA256SUMS.txt");
const reviewV19ManifestPath = resolve(root, "docs/review-evidence/phase-1b-stage4a-phase-b-independent-corrected-design-review-v1-9/SHA256SUMS.txt");

const parseJson = (path) => JSON.parse(readFileSync(path, "utf8"));
const profileBytes = readFileSync(profilePath);
const profile = JSON.parse(profileBytes.toString("utf8"));
const vectors = parseJson(vectorsPath);
const registryBytes = readFileSync(registryPath);
const registry = JSON.parse(registryBytes.toString("utf8"));
const design = readFileSync(designPath, "utf8");
const designV19 = readFileSync(designV19Path, "utf8");
const designV18 = readFileSync(designV18Path, "utf8");
const profileV19 = parseJson(profileV19Path);

const SEALED_PROFILE_IDENTITY = "efdec023f886a9ca9d1a558bfba0e54781292e0e8215609c4b68a68268caba01";
const REVIEWED_PROFILE_ID = "cwt.phase1b.stage4a.phaseb.corrected-design.v1_10.v18-m01-m03-attempt-2.v1";
const REVIEWED_PROFILE_VERSION = "2.0.0";
const REVIEWED_IDENTITY_KEYS = Object.freeze([
  "profileId",
  "profileVersion",
  "traversalAuthority",
  "domains",
  "protectedClassifier",
  "associationIntegrity",
  "contextNodeAssignments",
  "sourceFieldAllowlists",
  "promptProjections",
  "providerLeakDenyPrefixes",
  "persistence",
  "recursiveEvidenceGrammar",
  "errorTaxonomy",
  "executionOrders",
  "compilerContract",
]);
const TRAVERSAL_RETURN_CODES = Object.freeze([
  "context_provenance_mismatch",
  "context_prohibited_data",
  "context_too_large",
  "canonicalization_failed",
  "internal_failure",
]);
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

function jcs(value) {
  if (value === null || typeof value === "boolean" || typeof value === "string") return JSON.stringify(value);
  if (typeof value === "number") {
    if (!Number.isFinite(value)) fail("canonicalization_failed", "non_finite");
    return JSON.stringify(Object.is(value, -0) ? 0 : value);
  }
  if (Array.isArray(value)) return `[${value.map(jcs).join(",")}]`;
  if (!isObject(value)) fail("canonicalization_failed", "unsupported");
  return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${jcs(value[key])}`).join(",")}}`;
}

function identityProjection(candidateProfile) {
  if (JSON.stringify(candidateProfile.compiledAuthority?.identityProjectionKeys) !== JSON.stringify(REVIEWED_IDENTITY_KEYS)) {
    fail("context_provenance_mismatch", "identity_projection_keys");
  }
  return Object.fromEntries(REVIEWED_IDENTITY_KEYS.map((key) => [key, candidateProfile[key]]));
}

function copyPlainDetached(value, seen = new Set()) {
  if (value === null || typeof value === "boolean" || typeof value === "string") return value;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) fail("context_provenance_mismatch", "profile_non_finite_number");
    return value;
  }
  if (typeof value !== "object") fail("context_provenance_mismatch", "profile_non_json_value");
  if (seen.has(value)) fail("context_provenance_mismatch", "profile_alias_or_cycle");
  seen.add(value);
  if (Array.isArray(value)) {
    if (Object.getPrototypeOf(value) !== Array.prototype || Object.keys(value).length !== value.length) {
      fail("context_provenance_mismatch", "profile_non_plain_array");
    }
    return value.map((member) => copyPlainDetached(member, seen));
  }
  if (Object.getPrototypeOf(value) !== Object.prototype) fail("context_provenance_mismatch", "profile_custom_prototype");
  return Object.fromEntries(Object.entries(value).map(([key, member]) => [key, copyPlainDetached(member, seen)]));
}

function deepFreeze(value) {
  if (value !== null && typeof value === "object" && !Object.isFrozen(value)) {
    for (const member of Object.values(value)) deepFreeze(member);
    Object.freeze(value);
  }
  return value;
}

function exactRuntimeTuple(candidateProfile) {
  const expected = candidateProfile.protectedClassifier.runtime;
  assert.equal(process.versions.node, expected.node);
  assert.equal(process.versions.v8, expected.v8);
  assert.equal(process.versions.icu, expected.icu);
  assert.equal(process.versions.unicode, expected.unicode);
  assert.equal(process.versions.cldr, expected.cldr);
  assert.equal(process.platform, expected.platform);
  assert.equal(process.arch, expected.arch);
}

function verifyErrorTaxonomy(candidateProfile) {
  const taxonomy = candidateProfile.errorTaxonomy;
  assert.equal(taxonomy.closed, true);
  assert.equal(taxonomy.codes.length, vectors.taxonomyContract.expectedCodeCount);
  assert.deepEqual(taxonomy.codes.map(({ code }) => code), [...aiErrorCodes]);
  assert.equal(new Set(taxonomy.codes.map(({ code }) => code)).size, aiErrorCodes.length);
  for (const entry of taxonomy.codes) {
    const result = aiFailure(entry.code);
    assert.equal(result.ok, false);
    assert.equal(result.error.code, entry.code);
    assert.equal(result.error.category, entry.category);
    assert.equal(result.error.retryable, entry.retryable);
    assert.equal(result.error.manualEditorAvailable, entry.manualEditorAvailable);
    assert.equal(result.error.safeMessage, taxonomy.commonProjection.safeMessage);
  }
  const closed = new Set(aiErrorCodes);
  assert.deepEqual(taxonomy.traversalReturnCodes, TRAVERSAL_RETURN_CODES);
  assert.equal(new Set(taxonomy.traversalReturnCodes).size, TRAVERSAL_RETURN_CODES.length);
  for (const code of taxonomy.traversalReturnCodes) assert.equal(closed.has(code), true, code);
  assert.deepEqual(vectors.taxonomyContract.expectedTraversalReturnCodes, TRAVERSAL_RETURN_CODES);
  assert.equal(taxonomy.proofContract.fullAuthorityClosure, "offline_runtime_exact_equality_against_src_ai_errors_aiErrorCodes_and_aiFailure_for_all_69_entries_in_source_order");
  assert.equal(taxonomy.proofContract.selectedTraversalSubsetInverseRequired, false);
  assert.equal(taxonomy.proofContract.jsonLiteralUnionDerivationClaimed, false);
  assert.equal(vectors.taxonomyContract.subsetInverseRequired, false);
  assert.equal(vectors.taxonomyContract.jsonLiteralUnionDerivationClaimed, false);
  assert.equal(candidateProfile.traversalAuthority.zeroMatches.errorCode, vectors.taxonomyContract.zeroAndMultipleAssignmentCode);
  assert.equal(candidateProfile.traversalAuthority.multipleMatches.errorCode, vectors.taxonomyContract.zeroAndMultipleAssignmentCode);
  assert.equal(candidateProfile.traversalAuthority.profileIdentityMismatch.errorCode, vectors.taxonomyContract.profileIdentityMismatchCode);
  assert.equal(taxonomy.unknownCaughtFailure, vectors.taxonomyContract.unknownCaughtFailureCode);
  assert.equal(taxonomy.fieldDomainZeroOrMultiple, vectors.taxonomyContract.zeroAndMultipleAssignmentCode);
}

function verifyOrderAuthority(candidateProfile) {
  const steps = candidateProfile.executionOrders.claimedReplay;
  const ids = steps.map(({ id }) => id);
  assert.equal(steps.length, vectors.claimedReplayOrderContract.expectedStepCount);
  assert.deepEqual(ids, Array.from({ length: 14 }, (_, index) => `CR-${String(index + 1).padStart(2, "0")}`));
  assert.equal(ids[0], vectors.claimedReplayOrderContract.firstStep);
  assert.equal(ids.at(-1), vectors.claimedReplayOrderContract.lastStep);
  assert.deepEqual(steps.filter(({ adapterCalls }) => adapterCalls === 1).map(({ id }) => id), [vectors.claimedReplayOrderContract.adapterCallStep]);
  assert.equal(steps.reduce((sum, { adapterCalls }) => sum + adapterCalls, 0), 1);
  const positions = Object.fromEntries(ids.map((id, index) => [id, index]));
  for (const contextId of vectors.claimedReplayOrderContract.contextSteps) {
    for (const laterId of [...vectors.claimedReplayOrderContract.configPromptEnvelopeSteps, vectors.claimedReplayOrderContract.adapterResolutionStep]) {
      assert.ok(positions[contextId] < positions[laterId]);
    }
  }
  for (const id of vectors.claimedReplayOrderContract.configPromptEnvelopeSteps) assert.ok(positions[id] < positions[vectors.claimedReplayOrderContract.adapterCallStep]);

  const marker = design.match(/<!-- V1_10_CLAIMED_REPLAY_ORDER: ([A-Z0-9,-]+) -->/);
  assert.ok(marker);
  const section13Ids = marker[1].split(",");
  const section18 = section(design, "### 18.4 Claimed durable projection", "### 18.5 Cross-contract");
  const section18Ids = [...section18.matchAll(/^\d+\. `?(CR-\d{2})`? /gm)].map((match) => match[1]);
  const matrix = section(design, "### 18.5 Cross-contract", "### 18.6 No second authority");
  const matrixIds = [...matrix.matchAll(/^\| (CR-\d{2}) \|/gm)].map((match) => match[1]);
  assert.deepEqual(section13Ids, ids);
  assert.deepEqual(section18Ids, ids);
  assert.deepEqual(matrixIds, ids);
  assert.equal(section18.indexOf("CR-08") < section18.indexOf("CR-09"), true);
  assert.equal(section18.indexOf("CR-11") < section18.indexOf("CR-12"), true);
  assert.equal(section18.indexOf("CR-12") < section18.indexOf("CR-13"), true);
  assert.equal(JSON.stringify(candidateProfile.executionOrders), JSON.stringify(profileV19.executionOrders));
  assert.equal(section18, section(designV19, "### 18.4 Claimed durable projection", "### 18.5 Cross-contract"));
  assert.equal(matrix, section(designV19, "### 18.5 Cross-contract", "### 18.6 No second authority"));
}

const compiledProducts = new WeakSet();

function compileReviewedProfile(candidateProfile) {
  let sealed;
  try {
    sealed = copyPlainDetached(candidateProfile);
    if (sealed.profileId !== REVIEWED_PROFILE_ID || sealed.profileVersion !== REVIEWED_PROFILE_VERSION) {
      fail("context_provenance_mismatch", "reviewed_profile_identity");
    }
    if (sealed.traversalAuthority.closed !== true) fail("context_provenance_mismatch", "traversal_not_closed");
    for (const key of ["pathExceptionLists", "compatibilityTraversals", "consumerLocalBypasses"]) {
      if (sealed.traversalAuthority[key] !== 0) fail("context_provenance_mismatch", key);
    }
    assert.deepEqual(sealed.domains.map(({ id }) => id), [
      "closed_container",
      "machine_structural_integrity",
      "protected_human_business_provider_evidence",
    ]);
    if (sealed.protectedClassifier.secondClassifierAllowed !== false || sealed.protectedClassifier.consumerExceptionAllowed !== false) {
      fail("context_provenance_mismatch", "classifier_authority");
    }
    const patterns = sealed.contextNodeAssignments.map(({ pattern }) => pattern);
    if (new Set(patterns).size !== patterns.length) fail("context_provenance_mismatch", "assignment_pattern_duplicate");
    if (patterns.filter((pattern) => pattern.includes("**")).length !== 1 || !patterns.includes("/sources/*/fields/*/value/**")) {
      fail("context_provenance_mismatch", "recursive_pattern");
    }
    for (const assignment of sealed.contextNodeAssignments.filter(({ domain }) => domain === "protected_human_business_provider_evidence")) {
      if (assignment.scanRoot !== true) fail("context_provenance_mismatch", assignment.pattern);
    }
    assert.equal(sealed.compilerContract.copySemantics, "recursive_plain_value_copy_with_no_source_alias_or_prototype_sharing");
    assert.equal(sealed.compilerContract.sealSemantics, "recursive_deep_freeze_before_any_traversal_closure_is_returned");
    assert.equal(sealed.compilerContract.productVisibility, "module_private_compile_once_closure");
    assert.equal(sealed.compilerContract.exportedSourceJson, false);
    assert.equal(sealed.compilerContract.exportedAssignments, false);
    assert.equal(sealed.compilerContract.exportedDomains, false);
    assert.equal(sealed.compilerContract.mutableProfileOverridePerValidation, false);
    verifyErrorTaxonomy(sealed);
    verifyOrderAuthority(sealed);
    for (const projection of Object.values(sealed.promptProjections)) {
      for (const sourcePath of Object.values(projection)) {
        if (sealed.providerLeakDenyPrefixes.some((prefix) => sourcePath === prefix || sourcePath.startsWith(`${prefix}/`))) {
          fail("context_provenance_mismatch", "provider_projection");
        }
      }
    }
    if (sealed.compiledAuthority.expectedSha256 !== SEALED_PROFILE_IDENTITY) {
      fail("context_provenance_mismatch", "sealed_identity_changed");
    }
    const recomputed = sha256(jcs(identityProjection(sealed)));
    if (recomputed !== SEALED_PROFILE_IDENTITY) fail("context_provenance_mismatch", "compiled_profile_identity_mismatch");
    deepFreeze(sealed);
  } catch (error) {
    if (error instanceof ValidationFailure) throw error;
    fail("context_provenance_mismatch", `profile_validation:${error instanceof Error ? error.message : "unknown"}`);
  }

  const product = {
    identity: SEALED_PROFILE_IDENTITY,
    summary: deepFreeze({
      assignmentCount: sealed.contextNodeAssignments.length,
      domainCount: sealed.domains.length,
      errorCodeCount: sealed.errorTaxonomy.codes.length,
      claimedReplayStepCount: sealed.executionOrders.claimedReplay.length,
    }),
    validateContext(context, external) {
      return validateContextWithSealed(sealed, context, external);
    },
  };
  deepFreeze(product);
  compiledProducts.add(product);
  return product;
}

function pathTokens(path) {
  return path === "/" ? [] : path.slice(1).split("/");
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
    if (Array.isArray(current)) current.forEach((member, index) => visit(member, `${path === "/" ? "" : path}/${index}`));
    else if (isObject(current)) for (const [key, member] of Object.entries(current)) visit(member, `${path === "/" ? "" : path}/${key}`);
  }
  visit(value, "/");
  return nodes;
}

function assignmentMatches(candidateProfile, node) {
  return candidateProfile.contextNodeAssignments.filter((assignment) => patternMatches(assignment.pattern, node.path));
}

function verifyNodeKind(assignment, node) {
  if (assignment.node === "json_subtree") return;
  if (assignment.node === "object" && !isObject(node.value)) fail("context_provenance_mismatch", `node_kind:${node.path}`);
  if (assignment.node === "array" && !Array.isArray(node.value)) fail("context_provenance_mismatch", `node_kind:${node.path}`);
  if (assignment.node === "scalar" && !isScalar(node.value)) fail("context_provenance_mismatch", `node_kind:${node.path}`);
}

function verifyCoverage(candidateProfile, context) {
  const nodes = enumerateNodes(context);
  const members = { closed_container: 0, machine_structural_integrity: 0, protected_human_business_provider_evidence: 0 };
  for (const node of nodes) {
    const matches = assignmentMatches(candidateProfile, node);
    if (matches.length === 0) fail("context_provenance_mismatch", `assignment_count_zero:${node.path}`);
    if (matches.length !== 1) fail("context_provenance_mismatch", `assignment_count_multiple:${node.path}`);
    verifyNodeKind(matches[0], node);
    if (!Object.hasOwn(members, matches[0].domain)) fail("context_provenance_mismatch", `unknown_domain:${matches[0].domain}`);
    members[matches[0].domain] += 1;
  }
  return { total: nodes.length, members };
}

function validateRecursiveEvidence(value, grammar) {
  const state = { nodes: 0, maximumDepth: 0 };
  function visit(current, depth) {
    state.nodes += 1;
    state.maximumDepth = Math.max(state.maximumDepth, depth);
    if (state.nodes > grammar.maximumNodesPerValue || depth > grammar.maximumDepth) fail("context_too_large", "recursive_evidence");
    if (current === null || typeof current === "boolean" || typeof current === "string") return;
    if (typeof current === "number") {
      if (!Number.isFinite(current)) fail("context_provenance_mismatch", "non_finite_evidence");
      return;
    }
    if (Array.isArray(current)) {
      if (Object.keys(current).length !== current.length) fail("context_provenance_mismatch", "sparse_or_custom_array");
      current.forEach((member) => visit(member, depth + 1));
      return;
    }
    if (!isObject(current) || Object.getPrototypeOf(current) !== Object.prototype) fail("context_provenance_mismatch", "unsupported_evidence_value");
    for (const [key, member] of Object.entries(current)) {
      if (typeof key !== "string") fail("context_provenance_mismatch", "non_string_key");
      visit(member, depth + 1);
    }
  }
  visit(value, 0);
  return state;
}

function strictOuterShape(context, grammar) {
  exactKeys(context, ["version", "applicationClass", "capability", "useCase", "locale", "association", "task", "sources", "internalLinkCandidates", "mediaPlacementRefs"], "context_provenance_mismatch");
  exactKeys(context.association, ["kind", "targetType", "targetAlias", "expectedVersion", "snapshotHash"], "context_provenance_mismatch");
  if (!isObject(context.task) || !Object.hasOwn(context.task, "tone")) fail("context_provenance_mismatch", "task_shape");
  if (Object.keys(context.task).some((key) => !["tone", "pageIntent", "primaryPhrase", "topic", "guideIntent"].includes(key))) fail("context_provenance_mismatch", "task_unknown_key");
  if (!Array.isArray(context.sources) || !Array.isArray(context.internalLinkCandidates) || !Array.isArray(context.mediaPlacementRefs)) fail("context_provenance_mismatch", "root_array_shape");
  for (const source of context.sources) {
    exactKeys(source, ["alias", "sourceClass", "selectedBy", "fields"], "context_provenance_mismatch");
    if (!Array.isArray(source.fields)) fail("context_provenance_mismatch", "source_fields_shape");
    for (const field of source.fields) {
      exactKeys(field, ["field", "ref", "provenance", "value"], "context_provenance_mismatch");
      validateRecursiveEvidence(field.value, grammar);
    }
  }
  for (const candidate of context.internalLinkCandidates) exactKeys(candidate, ["candidateRef", "label"], "context_provenance_mismatch");
  if (utf8(JSON.stringify(context)) > grammar.maximumWholeContextUtf8Bytes) fail("context_too_large", "whole_context");
}

function boundedText(value, maximumScalars, maximumBytes) {
  return typeof value === "string" && value.trim().length > 0 && scalars(value) <= maximumScalars && utf8(value) <= maximumBytes;
}

function validateDomainStructure(candidateProfile, context) {
  if (context.version !== 1 || context.applicationClass !== "draft_assistance" || context.capability !== "text" || context.locale !== "en") fail("context_provenance_mismatch", "context_literals");
  if (!["seo_content_draft", "fabric_knowledge_draft", "product_description_draft", "sourcing_guide_draft"].includes(context.useCase)) fail("context_provenance_mismatch", "use_case");
  const taskKeys = {
    seo_content_draft: ["tone", "pageIntent", "primaryPhrase"],
    fabric_knowledge_draft: ["tone", "topic"],
    product_description_draft: ["tone"],
    sourcing_guide_draft: ["tone", "guideIntent"],
  }[context.useCase];
  if (JSON.stringify(Object.keys(context.task).sort()) !== JSON.stringify([...taskKeys].sort())) fail("context_provenance_mismatch", "task_keys");
  if (!["concise_professional_b2b", "neutral_editorial"].includes(context.task.tone)) fail("context_provenance_mismatch", "task_tone");
  for (const [key, maximum] of [["pageIntent", 500], ["primaryPhrase", 200], ["topic", 300], ["guideIntent", 500]]) {
    if (context.task[key] !== undefined && !boundedText(context.task[key], maximum, maximum)) fail("context_provenance_mismatch", `task_text:${key}`);
  }
  const association = context.association;
  if (association.kind !== "draft_target.v1" || association.targetAlias !== "target_01") fail("association_provenance_mismatch", "literal");
  if (!["product_draft", "content_draft", "editorial_revision"].includes(association.targetType)) fail("association_provenance_mismatch", "target_type");
  if (!Number.isInteger(association.expectedVersion) || association.expectedVersion < 1 || association.expectedVersion > 2_147_483_647) fail("association_provenance_mismatch", "version");
  if (typeof association.snapshotHash !== "string" || !hash64.test(association.snapshotHash)) fail("association_provenance_mismatch", "hash_shape");
  if (context.sources.length > 32) fail("context_too_large", "sources");
  const refs = new Set();
  context.sources.forEach((source, sourceIndex) => {
    if (source.alias !== `src_${String(sourceIndex + 1).padStart(2, "0")}` || source.selectedBy !== "request_actor" || !Object.hasOwn(candidateProfile.sourceFieldAllowlists, source.sourceClass)) fail("context_provenance_mismatch", "source_metadata");
    if (source.fields.length < 1 || source.fields.length > 32) fail("context_too_large", "source_fields");
    for (const field of source.fields) {
      if (typeof field.field !== "string" || !/^[a-z][A-Za-z0-9_]{0,63}$/.test(field.field) || !candidateProfile.sourceFieldAllowlists[source.sourceClass].includes(field.field)) fail("context_field_forbidden", "field_label");
      if (field.ref !== `${source.alias}:${field.field}` || refs.has(field.ref)) fail("context_provenance_mismatch", "field_ref");
      refs.add(field.ref);
      if (!["structural", "provided", "verified"].includes(field.provenance)) fail("context_provenance_mismatch", "provenance");
    }
  });
  if (context.internalLinkCandidates.length > 32 || context.mediaPlacementRefs.length > 32) fail("context_too_large", "refs");
  const links = new Set();
  for (const candidate of context.internalLinkCandidates) {
    if (typeof candidate.candidateRef !== "string" || !/^link_[0-9]{2}$/.test(candidate.candidateRef) || links.has(candidate.candidateRef) || !boundedText(candidate.label, 300, 300)) fail("context_provenance_mismatch", "link");
    links.add(candidate.candidateRef);
  }
  const media = new Set();
  for (const reference of context.mediaPlacementRefs) {
    if (typeof reference !== "string" || !/^media_[0-9]{2}$/.test(reference) || media.has(reference)) fail("context_provenance_mismatch", "media");
    media.add(reference);
  }
}

function isRecursiveAnchor(pattern, path) {
  return !pattern.endsWith("/**") || patternMatches(pattern.slice(0, -3), path);
}

function scanProtectedDomains(candidateProfile, context) {
  let scans = 0;
  function scanValue(value, path) {
    if (typeof value === "string") {
      scans += 1;
      const result = protectedDataClassifierV1.classify(value);
      if (result.kind !== "allow") fail("context_prohibited_data", `${path}:${result.kind}:${result.category ?? "none"}:${result.ruleId ?? "none"}`);
      return;
    }
    if (Array.isArray(value)) {
      value.forEach((member, index) => scanValue(member, `${path}/${index}`));
      return;
    }
    if (isObject(value)) {
      for (const [key, member] of Object.entries(value)) {
        scanValue(key, `${path}/<key>`);
        scanValue(member, `${path}/${key}`);
      }
    }
  }
  for (const node of enumerateNodes(context)) {
    const [assignment] = assignmentMatches(candidateProfile, node);
    if (assignment === undefined || assignment.domain !== "protected_human_business_provider_evidence" || assignment.scanRoot !== true || !isRecursiveAnchor(assignment.pattern, node.path)) continue;
    scanValue(node.value, node.path);
  }
  return scans;
}

function validateAuthorizedAssociation(context, external, candidateProfile) {
  const association = context.association;
  const durable = external.durableAssociation;
  const snapshot = external.authorizedSnapshot;
  if (!isObject(durable) || durable.persistenceVersion !== 1 || durable.kind !== association.kind || durable.targetType !== association.targetType || durable.expectedTargetVersion !== association.expectedVersion) fail("association_provenance_mismatch", "durable_tuple");
  const expectedKeys = candidateProfile.associationIntegrity.authorizedSnapshotVariants[association.targetType];
  exactKeys(snapshot, expectedKeys, "association_provenance_mismatch");
  if (snapshot.association_version !== 1 || snapshot.expected_target_version !== association.expectedVersion || snapshot.target_type !== association.targetType) fail("association_provenance_mismatch", "snapshot_tuple");
  if (association.targetType === "product_draft") {
    if (durable.targetProductId !== snapshot.target_product_id || durable.targetLocale !== "en" || snapshot.target_locale !== "en" || !uuid.test(snapshot.target_product_id)) fail("association_provenance_mismatch", "product");
  } else if (association.targetType === "content_draft") {
    if (durable.targetContentId !== snapshot.target_content_id || durable.targetLocale !== "en" || snapshot.target_locale !== "en" || !uuid.test(snapshot.target_content_id)) fail("association_provenance_mismatch", "content");
  } else if (durable.targetRevisionId !== snapshot.target_revision_id || !uuid.test(snapshot.target_revision_id)) fail("association_provenance_mismatch", "revision");
  const recomputed = canonicalJsonHash(snapshot);
  if (!recomputed.ok) fail("canonicalization_failed", "snapshot");
  if (recomputed.value.hash !== association.snapshotHash || external.persistedTargetSnapshotHash !== recomputed.value.hash) fail("association_provenance_mismatch", "hash_compare");
  return recomputed.value;
}

function validateContextWithSealed(sealedProfile, context, external) {
  strictOuterShape(context, sealedProfile.recursiveEvidenceGrammar);
  const coverage = verifyCoverage(sealedProfile, context);
  const scans = scanProtectedDomains(sealedProfile, context);
  validateDomainStructure(sealedProfile, context);
  const associationHash = validateAuthorizedAssociation(context, external, sealedProfile);
  const contextHash = canonicalJsonHash(context);
  if (!contextHash.ok) fail("canonicalization_failed", "context");
  if (external.expectedInputHash !== undefined && contextHash.value.hash !== external.expectedInputHash) fail("context_provenance_mismatch", "input_hash");
  return { coverage, scans, associationHash, contextHash: contextHash.value };
}

function validateContext(compiledProduct, context, external) {
  if (!isObject(compiledProduct) || !compiledProducts.has(compiledProduct)) {
    fail("context_provenance_mismatch", "compiled_product_required");
  }
  return compiledProduct.validateContext(context, external);
}

function expectFailure(fn, expectedCode) {
  try {
    fn();
  } catch (error) {
    if (expectedCode !== undefined) {
      assert.equal(error instanceof ValidationFailure, true);
      assert.equal(error.code, expectedCode);
    }
    return error;
  }
  throw new Error(`expected actual failure${expectedCode === undefined ? "" : `:${expectedCode}`}`);
}

const detectedMutations = [];
function detect(label, fn, expectedCode) {
  expectFailure(fn, expectedCode);
  detectedMutations.push(label);
}

function setAtPattern(context, pattern, value) {
  const tokens = pathTokens(pattern).filter((token) => token !== "**").map((token) => token === "*" ? "0" : token);
  let cursor = context;
  for (let index = 0; index < tokens.length - 1; index += 1) cursor = cursor[tokens[index]];
  cursor[tokens.at(-1)] = value;
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
  const snapshot = { association_version: 1, expected_target_version: version, target_revision_id: revisionId, target_type: "editorial_revision" };
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
  const hashed = canonicalJsonHash(context);
  assert.equal(hashed.ok, true);
  external.expectedInputHash = hashed.value.hash;
  return context;
}

function section(text, start, end) {
  const from = text.indexOf(start);
  const to = text.indexOf(end, from + start.length);
  assert.notEqual(from, -1);
  assert.notEqual(to, -1);
  return text.slice(from, to);
}

function verifyManifest(manifestPath) {
  const lines = readFileSync(manifestPath, "utf8").trimEnd().split("\n").filter(Boolean);
  for (const line of lines) {
    const match = line.match(/^([0-9a-f]{64})  (.+)$/);
    assert.ok(match, line);
    assert.equal(sha256(readFileSync(resolve(root, match[2]))), match[1], match[2]);
  }
  return lines.length;
}

function runTsc(path) {
  const tsc = resolve(root, "node_modules/.bin/tsc");
  return spawnSync(tsc, [
    "--noEmit", "--strict", "--target", "ES2022", "--module", "NodeNext", "--moduleResolution", "NodeNext",
    "--resolveJsonModule", "--esModuleInterop", "--skipLibCheck", path,
  ], { cwd: root, encoding: "utf8" });
}

const typeProbeDetections = [];
function runTypeProbes() {
  const positive = runTsc(positiveTypeProbePath);
  assert.equal(positive.status, 0, `${positive.stdout}\n${positive.stderr}`);
  for (const [label, fixturePath] of Object.entries(negativeTypeProbePaths)) {
    const materializedPath = fixturePath.replace(/\.fixture$/, `.author-run-${process.pid}.ts`);
    writeFileSync(materializedPath, readFileSync(fixturePath));
    try {
      const negative = runTsc(materializedPath);
      assert.notEqual(negative.status, 0, `${label}:unexpected_typecheck_success`);
      assert.match(`${negative.stdout}\n${negative.stderr}`, /error TS\d+:/);
      typeProbeDetections.push(label);
    } finally {
      unlinkSync(materializedPath);
    }
  }
  assert.deepEqual(typeProbeDetections, Object.keys(negativeTypeProbePaths));
}

function simulateOldMutableSourceCacheShortcut() {
  const source = clone(profile);
  let baselineCompiled = false;
  function oldCompile(candidate) {
    if (candidate === source && baselineCompiled) return candidate;
    if (sha256(jcs(identityProjection(candidate))) !== SEALED_PROFILE_IDENTITY) {
      fail("context_provenance_mismatch", "compiled_profile_identity_mismatch");
    }
    if (candidate === source) baselineCompiled = true;
    return candidate;
  }

  oldCompile(source);
  source.contextNodeAssignments.find((assignment) => assignment.pattern === "/task/guideIntent").domain = "machine_structural_integrity";
  source.contextNodeAssignments.find((assignment) => assignment.pattern === "/task/guideIntent").scanRoot = false;
  const context = clone(vectors.reviewerFirstCollisionVector.context);
  context.task.guideIntent = vectors.protectedPayloads.find(({ id }) => id === "email").value;
  const external = clone(vectors.reviewerFirstCollisionVector);
  const hash = canonicalJsonHash(context);
  assert.equal(hash.ok, true);
  external.expectedInputHash = hash.value.hash;
  try {
    validateContextWithSealed(oldCompile(source), context, external);
  } catch {
    process.exit(0);
  }
  console.error("OLD_MUTABLE_SOURCE_CACHE_SHORTCUT_RESTORED:protected_email_accepted_after_post_compile_demotion");
  process.exit(97);
}

if (process.argv.includes("--simulate-old-mutable-source-cache-shortcut")) simulateOldMutableSourceCacheShortcut();

exactRuntimeTuple(profile);
const compiledProfile = compileReviewedProfile(profile);
assert.equal(Object.isFrozen(compiledProfile), true);
assert.equal(Object.isFrozen(compiledProfile.summary), true);
assert.equal(compiledProfile.source, undefined);
assert.equal(compiledProfile.contextNodeAssignments, undefined);
assert.equal(compiledProfile.domains, undefined);
assert.equal(sha256(profileBytes), sha256(readFileSync(profilePath)));
assert.equal(sha256(readFileSync(errorsPath)), profile.errorTaxonomy.authoritySha256AtV18);
assert.equal(sha256(registryBytes), profile.protectedClassifier.sha256);
assert.deepEqual(protectedDataClassifierV1.identity, selectedProtectedDataRegistryIdentityV1);
assert.equal(selectedProtectedDataRegistryIdentityV1.registryId, profile.protectedClassifier.registryId);
assert.equal(selectedProtectedDataRegistryIdentityV1.registryVersion, profile.protectedClassifier.registryVersion);
assert.equal(selectedProtectedDataRegistryIdentityV1.sha256, profile.protectedClassifier.sha256);
assert.equal(registry.rules.length, 32);
assert.equal(compileProtectedDataRegistryV1(registry, { ...profile.protectedClassifier.runtime, node: "0.0.0" }), undefined);
runTypeProbes();

const v18ManifestCount = verifyManifest(v18ManifestPath);
const reviewV18ManifestCount = verifyManifest(reviewV18ManifestPath);
const reviewV19ManifestCount = verifyManifest(reviewV19ManifestPath);
assert.equal(v18ManifestCount, 21);
assert.equal(reviewV18ManifestCount, 7);
assert.equal(reviewV19ManifestCount, 6);
assert.equal(sha256(readFileSync(designV18Path)), "4fc11c42c4091f8ed8d1e802dc1b4829a6df89a82c4668f898469135eda0666b");
assert.equal(sha256(readFileSync(resolve(root, "docs/PHASE_1B_STAGE4A_PHASE_B_IMP2_NM01_PRE_DESIGN_CHECKPOINT_V1_0.md"))), "07e6c7a6335b34e1c5dd30411e38ff4d7610b4988a31cfd29a51e9f7d414b167");

const reviewerVector = vectors.reviewerFirstCollisionVector;
const reviewerResult = validateContext(compiledProfile, reviewerVector.context, reviewerVector);
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
  assert.match(external.persistedTargetSnapshotHash, hash64);
  validateContext(compiledProfile, contextForExternal(external), external);
}
assert.equal(vectors.deterministicRevisionCorpus.count, 1000);
assert.equal(digitRunHashes, 594);

const malformedLabels = [];
for (const [id, mutate] of [
  ["tampered", (context) => { context.association.snapshotHash = `${context.association.snapshotHash.slice(0, -1)}0`; }],
  ["uppercase", (context) => { context.association.snapshotHash = context.association.snapshotHash.toUpperCase(); }],
  ["wrong_length", (context) => { context.association.snapshotHash = context.association.snapshotHash.slice(0, -1); }],
  ["wrong_algorithm", (context) => { context.association.snapshotHash = createHash("sha512").update("wrong").digest("hex"); }],
]) {
  const context = clone(reviewerVector.context);
  mutate(context);
  expectFailure(() => validateContext(compiledProfile, context, reviewerVector));
  malformedLabels.push(id);
}
for (const [id, mutate] of [
  ["wrong_target", (external) => { external.authorizedSnapshot.target_revision_id = "11111111-1111-4111-8111-111111111111"; }],
  ["wrong_version", (external) => { external.authorizedSnapshot.expected_target_version = 8; }],
  ["wrong_snapshot_version", (external) => { external.authorizedSnapshot.association_version = 2; }],
  ["replay_mismatch", (external) => { external.persistedTargetSnapshotHash = "a".repeat(64); }],
]) {
  const external = clone(reviewerVector);
  mutate(external);
  expectFailure(() => validateContext(compiledProfile, external.context, external));
  malformedLabels.push(id);
}

const protectedAssignments = profile.contextNodeAssignments.filter((assignment) => assignment.domain === "protected_human_business_provider_evidence" && assignment.scanRoot === true);
let protectedRejections = 0;
for (const assignment of protectedAssignments) {
  for (const payload of vectors.protectedPayloads) {
    const context = clone(reviewerVector.context);
    setAtPattern(context, assignment.pattern, payload.value);
    const external = clone(reviewerVector);
    const hashed = canonicalJsonHash(context);
    assert.equal(hashed.ok, true);
    external.expectedInputHash = hashed.value.hash;
    const rejection = expectFailure(() => validateContext(compiledProfile, context, external), "context_prohibited_data");
    assert.equal(rejection.detail.includes(payload.expectedCategory), true);
    protectedRejections += 1;
  }
}

const machineAssignments = profile.contextNodeAssignments.filter((assignment) => assignment.domain === "machine_structural_integrity" && assignment.node === "scalar");
let machineFieldRejections = 0;
for (const assignment of machineAssignments) {
  const context = clone(reviewerVector.context);
  setAtPattern(context, assignment.pattern, vectors.machineFieldInvalidPayload);
  expectFailure(() => validateContext(compiledProfile, context, reviewerVector));
  machineFieldRejections += 1;
}

{
  const candidate = clone(profile);
  candidate.contextNodeAssignments = candidate.contextNodeAssignments.filter(({ pattern }) => pattern !== "/association/snapshotHash");
  detect("assignment_removed", () => compileReviewedProfile(candidate), "context_provenance_mismatch");
}
{
  const candidate = clone(profile);
  candidate.contextNodeAssignments.push(clone(candidate.contextNodeAssignments.find(({ pattern }) => pattern === "/association/snapshotHash")));
  detect("assignment_duplicated", () => compileReviewedProfile(candidate), "context_provenance_mismatch");
}
{
  const context = clone(reviewerVector.context);
  context.futureUnknown = "must fail";
  detect("unknown_context_field", () => validateContext(compiledProfile, context, reviewerVector), "context_provenance_mismatch");
}
{
  const candidate = clone(profile);
  candidate.contextNodeAssignments.push({ pattern: "/sources/*/fields/*/value/**", node: "json_subtree", domain: "machine_structural_integrity", validator: "invalid_overlap" });
  detect("overlapping_assignment", () => compileReviewedProfile(candidate), "context_provenance_mismatch");
}
for (const [label, domain] of [["protected_to_machine_demotion", "machine_structural_integrity"], ["protected_to_closed_container_demotion", "closed_container"]]) {
  const candidate = clone(profile);
  candidate.contextNodeAssignments.find(({ pattern }) => pattern === "/task/guideIntent").domain = domain;
  const context = clone(reviewerVector.context);
  context.task.guideIntent = vectors.protectedPayloads.find(({ id }) => id === "email").value;
  detect(label, () => compileReviewedProfile(candidate), "context_provenance_mismatch");
  expectFailure(() => validateContext(compiledProfile, context, reviewerVector), "context_prohibited_data");
}
{
  const context = clone(reviewerVector.context);
  context.sources[0].fields[0].value = vectors.recursiveEvidenceVector.protectedNestedPayload;
  detect("recursive_nested_protected_value", () => validateContext(compiledProfile, context, reviewerVector), "context_prohibited_data");
}
{
  const context = clone(reviewerVector.context);
  context.sources[0].fields[0].value = { [vectors.recursiveEvidenceVector.protectedNestedKey]: "Synthetic value" };
  detect("recursive_nested_protected_key", () => validateContext(compiledProfile, context, reviewerVector), "context_prohibited_data");
}

const recursiveContextA = clone(reviewerVector.context);
recursiveContextA.sources[0].fields[0].value = clone(vectors.recursiveEvidenceVector.valueA);
const recursiveExternalA = clone(reviewerVector);
const recursiveHashA = canonicalJsonHash(recursiveContextA);
assert.equal(recursiveHashA.ok, true);
recursiveExternalA.expectedInputHash = recursiveHashA.value.hash;
validateContext(compiledProfile, recursiveContextA, recursiveExternalA);
const recursiveContextB = clone(reviewerVector.context);
recursiveContextB.sources[0].fields[0].value = clone(vectors.recursiveEvidenceVector.valueB);
assert.equal(jcs(vectors.recursiveEvidenceVector.valueA), jcs(vectors.recursiveEvidenceVector.valueB));
detect("recursive_object_key_permutation", () => assert.equal(JSON.stringify(vectors.recursiveEvidenceVector.valueA), JSON.stringify(vectors.recursiveEvidenceVector.valueB)));
{
  const context = clone(recursiveContextA);
  context.sources[0].fields[0].value.zLast[0].nested.reverse();
  detect("recursive_array_order_permutation", () => validateContext(compiledProfile, context, recursiveExternalA), "context_provenance_mismatch");
}
{
  const context = clone(recursiveContextA);
  delete context.sources[0].fields[0].value;
  detect("recursive_value_removed", () => validateContext(compiledProfile, context, recursiveExternalA), "context_provenance_mismatch");
}
{
  const context = clone(recursiveContextA);
  context.sources[0].fields.push(clone(context.sources[0].fields[0]));
  detect("recursive_value_duplicated", () => validateContext(compiledProfile, context, recursiveExternalA), "context_provenance_mismatch");
}
{
  const candidate = clone(profile);
  candidate.contextNodeAssignments.find(({ pattern }) => pattern === "/task/guideIntent").domain = "machine_structural_integrity";
  candidate.compiledAuthority.expectedSha256 = sha256(jcs(identityProjection(candidate)));
  detect("profile_identity_forgery", () => compileReviewedProfile(candidate), "context_provenance_mismatch");
}
{
  const candidate = clone(profile);
  candidate.protectedClassifier.secondClassifierAllowed = true;
  detect("second_classifier", () => compileReviewedProfile(candidate), "context_provenance_mismatch");
}
{
  const candidate = clone(profile);
  candidate.protectedClassifier.consumerExceptionAllowed = true;
  detect("consumer_exception", () => compileReviewedProfile(candidate), "context_provenance_mismatch");
}
{
  const candidate = clone(profile);
  candidate.promptProjections.sourcing_guide_draft.association = "/association";
  detect("prompt_association_leak", () => compileReviewedProfile(candidate), "context_provenance_mismatch");
}
{
  const candidate = clone(profile);
  candidate.protectedClassifier.registryVersion = "2.1.1";
  detect("registry_identity_drift", () => compileReviewedProfile(candidate), "context_provenance_mismatch");
}
{
  const candidate = clone(profile);
  [candidate.executionOrders.claimedReplay[7], candidate.executionOrders.claimedReplay[8]] = [candidate.executionOrders.claimedReplay[8], candidate.executionOrders.claimedReplay[7]];
  detect("claimed_order_swap_context_after_config", () => compileReviewedProfile(candidate), "context_provenance_mismatch");
}
{
  const candidate = clone(profile);
  [candidate.executionOrders.claimedReplay[10], candidate.executionOrders.claimedReplay[11]] = [candidate.executionOrders.claimedReplay[11], candidate.executionOrders.claimedReplay[10]];
  detect("claimed_order_adapter_before_envelope", () => compileReviewedProfile(candidate), "context_provenance_mismatch");
}
{
  const candidate = clone(profile);
  candidate.errorTaxonomy.codes.pop();
  detect("taxonomy_profile_code_missing", () => compileReviewedProfile(candidate), "context_provenance_mismatch");
}
{
  const candidate = clone(profile);
  candidate.errorTaxonomy.codes.push({ code: "future_unreviewed_code", category: "internal", retryable: false, manualEditorAvailable: false });
  detect("taxonomy_profile_code_extra", () => compileReviewedProfile(candidate), "context_provenance_mismatch");
}
{
  const candidate = clone(profile);
  [candidate.errorTaxonomy.codes[0], candidate.errorTaxonomy.codes[1]] = [candidate.errorTaxonomy.codes[1], candidate.errorTaxonomy.codes[0]];
  detect("taxonomy_profile_code_reordered", () => compileReviewedProfile(candidate), "context_provenance_mismatch");
}
{
  const candidate = clone(profile);
  candidate.errorTaxonomy.traversalReturnCodes.push("context_domain_unclassified");
  detect("taxonomy_unknown_return_code", () => compileReviewedProfile(candidate), "context_provenance_mismatch");
}
{
  const candidate = clone(profile);
  candidate.errorTaxonomy.traversalReturnCodes.push("internal_failure");
  detect("taxonomy_duplicate_traversal_code", () => compileReviewedProfile(candidate), "context_provenance_mismatch");
}
{
  const candidate = clone(profile);
  candidate.errorTaxonomy.codes.find(({ code }) => code === "context_provenance_mismatch").retryable = true;
  detect("taxonomy_projection_drift", () => compileReviewedProfile(candidate), "context_provenance_mismatch");
}

function externalForMutatedContext(context) {
  const external = clone(reviewerVector);
  const hashed = canonicalJsonHash(context);
  assert.equal(hashed.ok, true);
  external.expectedInputHash = hashed.value.hash;
  return external;
}

{
  const source = clone(profile);
  const sealed = compileReviewedProfile(source);
  const assignment = source.contextNodeAssignments.find(({ pattern }) => pattern === "/task/guideIntent");
  assignment.domain = "machine_structural_integrity";
  assignment.scanRoot = false;
  const context = clone(reviewerVector.context);
  context.task.guideIntent = "sales@example.com";
  detect("post_compile_guide_intent_source_demotion", () => validateContext(sealed, context, externalForMutatedContext(context)), "context_prohibited_data");
}
{
  const source = clone(profile);
  const sealed = compileReviewedProfile(source);
  const assignment = source.contextNodeAssignments.find(({ pattern }) => pattern === "/sources/*/fields/*/value/**");
  assignment.domain = "machine_structural_integrity";
  assignment.scanRoot = false;
  const context = clone(reviewerVector.context);
  context.sources[0].fields[0].value = { nested: ["sales@example.com"] };
  detect("post_compile_nested_value_source_demotion", () => validateContext(sealed, context, externalForMutatedContext(context)), "context_prohibited_data");
}
{
  const source = clone(profile);
  const sealed = compileReviewedProfile(source);
  source.contextNodeAssignments = [];
  const context = clone(reviewerVector.context);
  context.task.guideIntent = "sales@example.com";
  detect("post_compile_source_array_replacement", () => validateContext(sealed, context, externalForMutatedContext(context)), "context_prohibited_data");
}
{
  const source = clone(profile);
  const sealed = compileReviewedProfile(source);
  source.contextNodeAssignments[15] = { pattern: "/task/guideIntent", node: "scalar", domain: "machine_structural_integrity", validator: "literal:sales@example.com" };
  const context = clone(reviewerVector.context);
  context.task.guideIntent = "sales@example.com";
  detect("post_compile_source_object_replacement", () => validateContext(sealed, context, externalForMutatedContext(context)), "context_prohibited_data");
}

detect("compiled_product_method_mutation", () => {
  compiledProfile.validateContext = () => ({ accepted: true });
});
detect("compiled_product_nested_summary_mutation", () => {
  compiledProfile.summary.assignmentCount = 0;
});
detect("compiled_product_prototype_mutation", () => {
  Object.setPrototypeOf(compiledProfile, { bypass: true });
});
{
  const candidate = clone(profile);
  Object.setPrototypeOf(candidate, { bypass: true });
  detect("compiler_source_custom_prototype", () => compileReviewedProfile(candidate), "context_provenance_mismatch");
}
{
  const candidate = clone(profile);
  candidate.domains[1] = candidate.domains[0];
  detect("compiler_source_alias_injection", () => compileReviewedProfile(candidate), "context_provenance_mismatch");
}

const child = spawnSync(process.execPath, [...process.execArgv, fileURLToPath(import.meta.url), "--simulate-old-mutable-source-cache-shortcut"], { cwd: root, encoding: "utf8" });
assert.equal(child.status, 97, `${child.stdout}\n${child.stderr}`);
assert.match(child.stderr, /OLD_MUTABLE_SOURCE_CACHE_SHORTCUT_RESTORED/);
detectedMutations.push("old_mutable_source_cache_shortcut_self_test");

const executedProofLabels = [...detectedMutations, ...typeProbeDetections];
for (const required of vectors.requiredMutationLabels) assert.equal(executedProofLabels.includes(required), true, required);
assert.equal(new Set(executedProofLabels).size, executedProofLabels.length);

for (const projection of Object.values(profile.promptProjections)) {
  for (const sourcePath of Object.values(projection)) assert.equal(sourcePath === "/association" || sourcePath.startsWith("/association/"), false);
}
const providerProjectionBytes = JSON.stringify({
  locale: reviewerVector.context.locale,
  guide_intent: reviewerVector.context.task.guideIntent,
  selected_context_json: reviewerVector.context.sources,
  requested_tone: reviewerVector.context.task.tone,
});
assert.equal(providerProjectionBytes.includes(reviewerVector.expectedSnapshotHash), false);
assert.equal(providerProjectionBytes.includes(reviewerVector.durableAssociation.targetRevisionId), false);

const schemaV110 = section(design, "## 11. Exact `0020` field mapping", "## 12. Prompt Registry");
const schemaV18 = section(designV18, "## 11. Exact `0020` field mapping", "## 12. Prompt Registry");
assert.equal(schemaV110, schemaV18);
const configRows = section(schemaV110, "### 11.1 `ai_model_config`", "### 11.2 `ai_runs`").match(/^\| `[^`]+` \|/gm) ?? [];
const runRows = schemaV110.slice(schemaV110.indexOf("### 11.2 `ai_runs`")).match(/^\| `[^`]+` \|/gm) ?? [];
assert.equal(configRows.length, 21);
assert.equal(runRows.length, 96);
assert.equal(sha256(readFileSync(m03ProfilePath)), "1f0b56a870ecbab61c970e1c7000dff591674e0f8ad0a04341538c724a36c173");
for (const finding of ["H-01", "H-02", "M-01", "M-02", "M-03", "M-04", "M-05", "M-06", "L-01", "N-M01", "N-M02", "N-M03", "N-M04"]) assert.equal(design.includes(finding), true);
for (const fixed of ["M02-D1-INCLUDE", "M03-D1-DISCRIMINATED-SEAM", "IMP2-NM01-STRUCTURAL-INTEGRITY-DOMAIN", "NOT SELF-APPROVED", "IMPLEMENTATION NOT AUTHORIZED"]) assert.equal(design.includes(fixed), true);

const coverage = reviewerResult.coverage;
console.log("TASK=CWT Stage 4A Phase B Corrected Exact Design V1.10 V18-M01/M03 Attempt 2 offline verification");
console.log("RUNTIME_TUPLE=Node24.14.0_V8_13.6.233.17-node.41_ICU78.2_Unicode17.0_CLDR48.0_darwin_arm64");
console.log(`PROFILE_AUTHORITY=${profile.profileId}@${profile.profileVersion}:compiled_${SEALED_PROFILE_IDENTITY}:assignments_${profile.contextNodeAssignments.length}:domains_${profile.domains.length}`);
console.log(`ERROR_TAXONOMY_LAYER_A=${profile.errorTaxonomy.codes.length}/69_RUNTIME_EXACT:source_order_category_retry_manual_message_MATCH`);
console.log(`ERROR_TAXONOMY_LAYER_B=${profile.errorTaxonomy.traversalReturnCodes.length}/5_SUBSET_ASSIGNABLE:inverse_NOT_REQUIRED:json_literal_derivation_NOT_CLAIMED:unknown_internal_failure`);
console.log(`TYPE_PROBES=positive_1/1:negative_${typeProbeDetections.length}/${typeProbeDetections.length}_ACTUAL_TSC_FAILURES:${typeProbeDetections.join(",")}`);
console.log("CLAIMED_REPLAY_ORDER=V18_M02_FROZEN_CLOSED:CR-01..CR-14_PROFILE_BYTES_EXACT:section13_semantic_section18_4_18_5_BYTES_EXACT:one_call_CR13");
console.log(`COMPILED_PRODUCT=INPUT_DETACHED:RECURSIVELY_FROZEN:MODULE_PRIVATE_CLOSURE:source_exports_0:assignments_exports_0:domains_exports_0:summary_${JSON.stringify(compiledProfile.summary)}`);
console.log("REVIEWER_POST_COMPILE_PROBES=2/2_ACTUAL_PROTECTED_REJECTIONS:guideIntent_source_demotion,nested_value_source_demotion:child_exit97_0");
console.log("COMPILED_MUTABILITY_NEGATIVES=method_replace,nested_summary_replace,prototype_replace,custom_source_prototype,source_alias_injection_REJECTED:no_shared_source_reference");
console.log(`FIELD_DOMAIN_COVERAGE=total_${coverage.total}:closed_${coverage.members.closed_container}:machine_${coverage.members.machine_structural_integrity}:protected_${coverage.members.protected_human_business_provider_evidence}:missing_0:duplicate_0`);
console.log("RECURSIVE_EVIDENCE=object_array_key_value_arbitrary_accepted_nesting_PASS:object_key_permutation_JCS_EQUAL_bytes_distinct:array_order_semantic");
console.log(`REVIEWER_FIRST_HASH=${reviewerVector.expectedSnapshotHash}:recomputed_match_ACCEPTED:direct_lexical_result_protected_match_not_consumed`);
console.log(`REVISION_SNAPSHOT_CORPUS=${vectors.deterministicRevisionCorpus.count}/${vectors.deterministicRevisionCorpus.expectedAccepted}_ACCEPTED:digit_run_hashes_${digitRunHashes}:lexical_snapshot_invocations_0`);
console.log(`MALFORMED_INTEGRITY_NEGATIVES=${malformedLabels.length}/${malformedLabels.length}_REJECTED:${malformedLabels.join(",")}`);
console.log(`PROTECTED_SURFACE_NEGATIVES=${protectedRejections}/${protectedRejections}_REJECTED:patterns_${protectedAssignments.length}:payloads_${vectors.protectedPayloads.length}`);
console.log(`MACHINE_FIELD_TEXT_NEGATIVES=${machineFieldRejections}/${machineFieldRejections}_REJECTED`);
console.log(`EXECUTED_MUTATION_REJECTIONS=${detectedMutations.length}/${detectedMutations.length}_ACTUAL_CAUGHT_FAILURES:${detectedMutations.join(",")}`);
console.log("OLD_BUG_SELF_TEST=mutable_source_cache_shortcut_child_exit_97_EXPECTED_AND_CAPTURED");
console.log(`PERSISTED_BYTES=IDENTICAL:JCS_IDENTICAL:input_hash_${reviewerVector.expectedInputHash}`);
console.log("PROVIDER_ASSOCIATION_LEAK=0:M02_CONTEXT_AND_A07_ONE_IDENTITY");
console.log(`IMPORTED_MANIFESTS=V1_8_DESIGN_${v18ManifestCount}/${v18ManifestCount}:V1_8_INDEPENDENT_FAIL_${reviewV18ManifestCount}/${reviewV18ManifestCount}:V1_9_INDEPENDENT_FAIL_${reviewV19ManifestCount}/${reviewV19ManifestCount}`);
console.log("M03_NON_REGRESSION=profile_sha256_1f0b56a870ecbab61c970e1c7000dff591674e0f8ad0a04341538c724a36c173");
console.log(`SCHEMA_MAP_NON_REGRESSION=ai_model_config_${configRows.length}/21:ai_runs_${runRows.length}/96`);
console.log("DESIGN_CONSISTENCY=PASS:NOT_SELF_APPROVED:IMPLEMENTATION_NOT_AUTHORIZED");
