import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import process from "node:process";

const candidate = resolve(process.argv[2] ?? "");
const tsc = resolve(process.argv[3] ?? join(candidate, "node_modules/.bin/tsc"));
const loader = resolve(process.argv[4] ?? join(candidate, "node_modules/tsx/dist/loader.mjs"));
assert.equal(process.versions.node, "24.14.0");

const evidenceRelative = "docs/review-evidence/phase-1b-stage4a-phase-b-corrected-exact-design-v1-9-v18-remediation-v1";
const evidenceDir = join(candidate, evidenceRelative);
const profilePath = join(evidenceDir, "V18_M01_M02_M03_MACHINE_PROFILE_V1_0.json");
const authorProbePath = join(evidenceDir, "ERROR_TAXONOMY_CLOSED_UNION_PROBE_V1_0.ts");
const authorVerifierPath = join(evidenceDir, "VERIFY_CORRECTED_EXACT_DESIGN_V1_9.mjs");
const designPath = join(candidate, "docs/PHASE_1B_STAGE4A_PHASE_B_PROVIDER_NEUTRAL_FOUNDATION_CORRECTED_EXACT_DESIGN_V1_9.md");
const errorsPath = join(candidate, "src/ai/errors.ts");
const profile = JSON.parse(readFileSync(profilePath, "utf8"));
const design = readFileSync(designPath, "utf8");
const errors = readFileSync(errorsPath, "utf8");

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function jcs(value) {
  if (value === null || typeof value === "boolean" || typeof value === "string") return JSON.stringify(value);
  if (typeof value === "number") return JSON.stringify(Object.is(value, -0) ? 0 : value);
  if (Array.isArray(value)) return `[${value.map(jcs).join(",")}]`;
  return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${jcs(value[key])}`).join(",")}}`;
}

function identityProjection(value) {
  return Object.fromEntries(value.compiledAuthority.identityProjectionKeys.map((key) => [key, value[key]]));
}

function runTsc(file) {
  return spawnSync(tsc, [
    "--noEmit", "--strict", "--skipLibCheck", "--target", "ES2022", "--module", "NodeNext",
    "--moduleResolution", "NodeNext", "--resolveJsonModule", "--esModuleInterop", file,
  ], { cwd: candidate, encoding: "utf8" });
}

const aiCodesMatch = errors.match(/export const aiErrorCodes = \[([\s\S]*?)\] as const;/);
assert.ok(aiCodesMatch);
const sourceCodes = [...aiCodesMatch[1].matchAll(/"([a-z0-9_]+)"/g)].map((match) => match[1]);
assert.equal(sourceCodes.length, 69);
assert.deepEqual(profile.errorTaxonomy.codes.map(({ code }) => code), sourceCodes);
assert.equal(new Set(sourceCodes).size, 69);
assert.equal(profile.errorTaxonomy.traversalReturnCodes.length, 5);
assert.equal(profile.traversalAuthority.zeroMatches.errorCode, "context_provenance_mismatch");
assert.equal(profile.traversalAuthority.multipleMatches.errorCode, "context_provenance_mismatch");
assert.equal(profile.traversalAuthority.profileIdentityMismatch.errorCode, "context_provenance_mismatch");
assert.equal(profile.errorTaxonomy.unknownCaughtFailure, "internal_failure");

const recomputedIdentity = sha256(Buffer.from(jcs(identityProjection(profile)), "utf8"));
assert.equal(recomputedIdentity, profile.compiledAuthority.expectedSha256);

const authorProbe = runTsc(authorProbePath);
assert.equal(authorProbe.status, 0, `${authorProbe.stdout}\n${authorProbe.stderr}`);

const reviewerTypePath = join(candidate, "reviewer-v19-profile-derived-taxonomy-probe.ts");
writeFileSync(reviewerTypePath, `import profile from "./${evidenceRelative}/V18_M01_M02_M03_MACHINE_PROFILE_V1_0.json";\nimport type { AiErrorCode } from "./src/ai/errors";\ntype AssertNever<T extends never> = T;\ntype ProfileAiErrorCode = (typeof profile.errorTaxonomy.codes)[number]["code"];\ntype TraversalReturnCode = "context_provenance_mismatch" | "context_prohibited_data" | "context_too_large" | "canonicalization_failed" | "internal_failure";\ntype ProfileHasNoUnknown = AssertNever<Exclude<ProfileAiErrorCode, AiErrorCode>>;\ntype AuthorityHasNoMissing = AssertNever<Exclude<AiErrorCode, ProfileAiErrorCode>>;\ntype TraversalHasNoUnknown = AssertNever<Exclude<TraversalReturnCode, ProfileAiErrorCode>>;\ntype ClaimedInverse = AssertNever<Exclude<ProfileAiErrorCode, TraversalReturnCode>>;\nvoid profile;\n`, "utf8");
const reviewerProbe = runTsc(reviewerTypePath);
assert.notEqual(reviewerProbe.status, 0);
assert.match(`${reviewerProbe.stdout}\n${reviewerProbe.stderr}`, /Type 'string' does not satisfy the constraint 'never'/);

const ids = profile.executionOrders.claimedReplay.map(({ id }) => id);
const expectedIds = Array.from({ length: 14 }, (_, index) => `CR-${String(index + 1).padStart(2, "0")}`);
assert.deepEqual(ids, expectedIds);
const marker = design.match(/<!-- V1_9_CLAIMED_REPLAY_ORDER: ([A-Z0-9,-]+) -->/);
assert.ok(marker);
assert.deepEqual(marker[1].split(","), ids);
const section18Start = design.indexOf("### 18.4 Claimed durable projection");
const section18End = design.indexOf("### 18.5 Cross-contract", section18Start);
const section18 = design.slice(section18Start, section18End);
assert.deepEqual([...section18.matchAll(/^\d+\. `?(CR-\d{2})`? /gm)].map((match) => match[1]), ids);
const matrixStart = section18End;
const matrixEnd = design.indexOf("### 18.6 No second authority", matrixStart);
const matrix = design.slice(matrixStart, matrixEnd);
assert.deepEqual([...matrix.matchAll(/^\| (CR-\d{2}) \|/gm)].map((match) => match[1]), ids);
assert.deepEqual(profile.executionOrders.claimedReplay.filter(({ adapterCalls }) => adapterCalls === 1).map(({ id }) => id), ["CR-13"]);
assert.equal(profile.executionOrders.claimedReplay.reduce((sum, step) => sum + step.adapterCalls, 0), 1);
assert.match(profile.executionOrders.claimedReplay[3].operation, /strict_parse_unchanged_context/);
assert.match(profile.executionOrders.claimedReplay[7].operation, /full_context_jcs_input_hash/);
assert.match(profile.executionOrders.claimedReplay[8].operation, /resolved_config/);
assert.match(profile.executionOrders.claimedReplay[9].operation, /prompt_raw_bytes/);
assert.match(profile.executionOrders.claimedReplay[10].operation, /envelope/);
assert.match(profile.executionOrders.claimedReplay[11].operation, /resolve_exact_adapter_once/);
assert.match(profile.executionOrders.claimedReplay[12].operation, /invoke_text_adapter_exactly_once/);

function orderIsValid(steps) {
  const positions = Object.fromEntries(steps.map(({ id }, index) => [id, index]));
  if (steps.length !== 14 || new Set(steps.map(({ id }) => id)).size !== 14) return false;
  if (steps.reduce((sum, step) => sum + step.adapterCalls, 0) !== 1) return false;
  if (steps.filter(({ adapterCalls }) => adapterCalls === 1).map(({ id }) => id).join() !== "CR-13") return false;
  for (const before of ["CR-03", "CR-04", "CR-05", "CR-06", "CR-07", "CR-08"]) {
    for (const after of ["CR-09", "CR-10", "CR-11", "CR-12", "CR-13"]) if (!(positions[before] < positions[after])) return false;
  }
  for (const before of ["CR-09", "CR-10", "CR-11", "CR-12"]) if (!(positions[before] < positions["CR-13"])) return false;
  return true;
}

const orderMutations = [
  (steps) => [steps[0], steps[1], steps[8], ...steps.slice(2, 8), ...steps.slice(9)],
  (steps) => steps.map((step) => step.id === "CR-12" ? { ...step, adapterCalls: 1 } : step),
  (steps) => steps.filter((step) => step.id !== "CR-07"),
  (steps) => [...steps, { ...steps[12] }],
];
for (const mutate of orderMutations) assert.equal(orderIsValid(mutate(structuredClone(profile.executionOrders.claimedReplay))), false);

const verifierSource = readFileSync(authorVerifierPath, "utf8");
const insertionPoint = "compileProfile(profile);\nassert.equal(sha256(profileBytes)";
assert.equal(verifierSource.split(insertionPoint).length, 2);

function runCachedMutation(label, injectionBody) {
  const transformedPath = join(dirname(authorVerifierPath), `REVIEWER_TRANSFORMED_${label}.mjs`);
  const injected = `compileProfile(profile);\n{\n${injectionBody}\n}\nassert.equal(sha256(profileBytes)`;
  writeFileSync(transformedPath, verifierSource.replace(insertionPoint, injected), "utf8");
  return spawnSync(process.execPath, ["--import", loader, transformedPath], { cwd: candidate, encoding: "utf8" });
}

const commonInjection = (assignmentPattern, payloadMutation) => `
  const reviewerAssignment = profile.contextNodeAssignments.find((assignment) => assignment.pattern === ${JSON.stringify(assignmentPattern)});
  reviewerAssignment.domain = "machine_structural_integrity";
  reviewerAssignment.scanRoot = false;
  const reviewerContext = clone(vectors.reviewerFirstCollisionVector.context);
  ${payloadMutation}
  const reviewerExternal = clone(vectors.reviewerFirstCollisionVector);
  const reviewerHash = canonicalJsonHash(reviewerContext);
  assert.equal(reviewerHash.ok, true);
  reviewerExternal.expectedInputHash = reviewerHash.value.hash;
  try {
    validateContext(profile, reviewerContext, reviewerExternal);
  } catch (error) {
    console.error("${assignmentPattern}:PROFILE_MUTATION_REJECTED", error instanceof ValidationFailure ? error.code : String(error));
    process.exit(0);
  }
  console.error("${assignmentPattern}:PROFILE_MUTATION_ACCEPTED_AFTER_COMPILE_CACHE");
  process.exit(97);`;

const cacheGuide = runCachedMutation("GUIDE_INTENT", commonInjection("/task/guideIntent", "reviewerContext.task.guideIntent = \"sales@example.com\";"));
assert.equal(cacheGuide.status, 97, `${cacheGuide.stdout}\n${cacheGuide.stderr}`);
assert.match(cacheGuide.stderr, /PROFILE_MUTATION_ACCEPTED_AFTER_COMPILE_CACHE/);
const cacheNested = runCachedMutation("NESTED_VALUE", commonInjection("/sources/*/fields/*/value/**", "reviewerContext.sources[0].fields[0].value = { nested: [\"sales@example.com\"] };"));
assert.equal(cacheNested.status, 97, `${cacheNested.stdout}\n${cacheNested.stderr}`);
assert.match(cacheNested.stderr, /PROFILE_MUTATION_ACCEPTED_AFTER_COMPILE_CACHE/);

const mutatedProfile = structuredClone(profile);
mutatedProfile.contextNodeAssignments.find(({ pattern }) => pattern === "/task/guideIntent").domain = "machine_structural_integrity";
assert.notEqual(sha256(Buffer.from(jcs(identityProjection(mutatedProfile)), "utf8")), recomputedIdentity);

console.log("TASK=CWT Stage 4A Phase B Corrected Exact Design V1.9 Reviewer Fresh Challenge");
console.log(`RUNTIME=Node${process.versions.node}_V8_${process.versions.v8}_ICU${process.versions.icu}_Unicode${process.versions.unicode}_CLDR${process.versions.cldr}_${process.platform}_${process.arch}`);
console.log(`PROFILE_IDENTITY=${recomputedIdentity}:69_CODES:5_TRAVERSAL_RETURNS`);
console.log("V18_M01_RUNTIME_PROFILE=PASS:69_SOURCE_CODES_EXACT:zero_multiple_identity_context_provenance_mismatch:unknown_internal_failure");
console.log("V18_M01_AUTHOR_TYPE_PROBE=EXIT_0_BUT_HARDCODED_SUBSET_ONLY");
console.log(`V18_M01_CLAIMED_PROFILE_DERIVED_TYPE_PROBE=EXIT_${reviewerProbe.status}:FAIL_AS_WRITTEN:JSON_CODE_TYPE_WIDENS_TO_STRING:69_TO_5_INVERSE_NOT_NEVER`);
console.log("V18_M02_ORDER=PASS:CR01_CR14_EXACT:SECTION13_SECTION18_MATRIX:CONTEXT_BEFORE_CONFIG_PROMPT_ENVELOPE_ADAPTER:SOLE_CALL_CR13");
console.log("V18_M02_FRESH_MUTATIONS=4/4_REJECTED:context_after_config,second_call,missing_step,duplicate_call_step");
console.log("V18_M03_CLONED_PROFILE_IDENTITY=PASS:DEMOTION_CHANGES_SEALED_SHA");
console.log("V18_M03_POST_COMPILE_IN_PLACE_DEMOTION_GUIDE_INTENT=ACCEPTED_UNSAFE_EMAIL:CHILD_EXIT_97");
console.log("V18_M03_POST_COMPILE_IN_PLACE_DEMOTION_NESTED_SOURCE_VALUE=ACCEPTED_UNSAFE_EMAIL:CHILD_EXIT_97");
console.log("REVIEWER_CHALLENGE=FAIL:V18_M01_TYPE_PROOF_CLAIM_FALSE:V18_M03_COMPILED_PROFILE_MUTABILITY_UNSEALED");
