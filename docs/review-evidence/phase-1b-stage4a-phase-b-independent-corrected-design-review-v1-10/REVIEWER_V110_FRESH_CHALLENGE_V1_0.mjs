import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { basename, dirname, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const candidateRoot = resolve(process.argv[2] ?? ".");
const authorDir = resolve(
  candidateRoot,
  "docs/review-evidence/phase-1b-stage4a-phase-b-corrected-exact-design-v1-10-v18-m01-m03-attempt-2-v1",
);
const authorVerifierPath = resolve(authorDir, "VERIFY_CORRECTED_EXACT_DESIGN_V1_10.mjs");
const profilePath = resolve(authorDir, "V18_M01_M03_ATTEMPT_2_MACHINE_PROFILE_V2_0.json");
const v19ProfilePath = resolve(
  candidateRoot,
  "docs/review-evidence/phase-1b-stage4a-phase-b-corrected-exact-design-v1-9-v18-remediation-v1/V18_M01_M02_M03_MACHINE_PROFILE_V1_0.json",
);
const designPath = resolve(
  candidateRoot,
  "docs/PHASE_1B_STAGE4A_PHASE_B_PROVIDER_NEUTRAL_FOUNDATION_CORRECTED_EXACT_DESIGN_V1_10.md",
);
const designV19Path = resolve(
  candidateRoot,
  "docs/PHASE_1B_STAGE4A_PHASE_B_PROVIDER_NEUTRAL_FOUNDATION_CORRECTED_EXACT_DESIGN_V1_9.md",
);
const errorsPath = resolve(candidateRoot, "src/ai/errors.ts");
const tscPath = resolve(candidateRoot, "node_modules/.bin/tsc");
const profile = JSON.parse(readFileSync(profilePath, "utf8"));
const profileV19 = JSON.parse(readFileSync(v19ProfilePath, "utf8"));
const design = readFileSync(designPath, "utf8");
const designV19 = readFileSync(designV19Path, "utf8");
const { aiErrorCodes, aiFailure } = await import(pathToFileURL(errorsPath).href);

const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const clone = (value) => structuredClone(value);
const traversalCodes = Object.freeze([
  "context_provenance_mismatch",
  "context_prohibited_data",
  "context_too_large",
  "canonicalization_failed",
  "internal_failure",
]);

function verifyTaxonomy(candidate) {
  assert.equal(candidate.errorTaxonomy.codes.length, 69);
  assert.deepEqual(candidate.errorTaxonomy.codes.map(({ code }) => code), [...aiErrorCodes]);
  assert.equal(new Set(candidate.errorTaxonomy.codes.map(({ code }) => code)).size, 69);
  for (const entry of candidate.errorTaxonomy.codes) {
    const projected = aiFailure(entry.code);
    assert.equal(projected.ok, false);
    assert.deepEqual(
      {
        code: projected.error.code,
        category: projected.error.category,
        retryable: projected.error.retryable,
        manualEditorAvailable: projected.error.manualEditorAvailable,
        safeMessage: projected.error.safeMessage,
      },
      {
        code: entry.code,
        category: entry.category,
        retryable: entry.retryable,
        manualEditorAvailable: entry.manualEditorAvailable,
        safeMessage: candidate.errorTaxonomy.commonProjection.safeMessage,
      },
    );
  }
  assert.deepEqual(candidate.errorTaxonomy.traversalReturnCodes, traversalCodes);
  assert.equal(new Set(candidate.errorTaxonomy.traversalReturnCodes).size, 5);
  assert.equal(candidate.traversalAuthority.zeroMatches.errorCode, "context_provenance_mismatch");
  assert.equal(candidate.traversalAuthority.multipleMatches.errorCode, "context_provenance_mismatch");
  assert.equal(candidate.traversalAuthority.profileIdentityMismatch.errorCode, "context_provenance_mismatch");
  assert.equal(candidate.errorTaxonomy.unknownCaughtFailure, "internal_failure");
}

verifyTaxonomy(profile);
const taxonomyMutationLabels = [];
function rejectTaxonomy(label, mutate) {
  const candidate = clone(profile);
  mutate(candidate);
  assert.throws(() => verifyTaxonomy(candidate), undefined, label);
  taxonomyMutationLabels.push(label);
}
rejectTaxonomy("missing_code", (candidate) => candidate.errorTaxonomy.codes.splice(7, 1));
rejectTaxonomy("extra_code", (candidate) => candidate.errorTaxonomy.codes.push(clone(candidate.errorTaxonomy.codes[0])));
rejectTaxonomy("reordered_codes", (candidate) => candidate.errorTaxonomy.codes.splice(2, 0, candidate.errorTaxonomy.codes.splice(19, 1)[0]));
rejectTaxonomy("duplicate_code", (candidate) => { candidate.errorTaxonomy.codes[8] = clone(candidate.errorTaxonomy.codes[7]); });
rejectTaxonomy("category_drift", (candidate) => { candidate.errorTaxonomy.codes[0].category = "internal"; });
rejectTaxonomy("retry_drift", (candidate) => { candidate.errorTaxonomy.codes[0].retryable = true; });
rejectTaxonomy("manual_drift", (candidate) => { candidate.errorTaxonomy.codes[0].manualEditorAvailable = true; });
rejectTaxonomy("message_drift", (candidate) => { candidate.errorTaxonomy.commonProjection.safeMessage = "Changed"; });
rejectTaxonomy("traversal_missing", (candidate) => candidate.errorTaxonomy.traversalReturnCodes.splice(1, 1));
rejectTaxonomy("traversal_extra", (candidate) => candidate.errorTaxonomy.traversalReturnCodes.push("provider_timeout"));
rejectTaxonomy("traversal_reordered", (candidate) => candidate.errorTaxonomy.traversalReturnCodes.reverse());
rejectTaxonomy("traversal_duplicate", (candidate) => { candidate.errorTaxonomy.traversalReturnCodes[1] = "context_provenance_mismatch"; });

const importPath = "../../../src/ai/errors.ts";
const typeFixtures = {
  fresh_positive: `import type { AiErrorCode } from "${importPath}";\nconst selected = ["context_provenance_mismatch", "context_prohibited_data", "context_too_large", "canonicalization_failed", "internal_failure"] as const satisfies readonly AiErrorCode[];\nconst unknownFallback = (_value: unknown): AiErrorCode => "internal_failure";\nvoid selected; void unknownFallback;\n`,
  fresh_unknown_negative: `import type { AiErrorCode } from "${importPath}";\nconst selected = ["context_provenance_mismatch", "context_profile_unsealed"] as const satisfies readonly AiErrorCode[];\nvoid selected;\n`,
  fresh_json_widening_negative: `import profile from "./V18_M01_M03_ATTEMPT_2_MACHINE_PROFILE_V2_0.json" with { type: "json" };\nimport type { AiErrorCode } from "${importPath}";\nconst widened: AiErrorCode = profile.errorTaxonomy.codes[0].code;\nvoid widened;\n`,
  fresh_inverse_negative: `import type { AiErrorCode } from "${importPath}";\nconst selected = ["context_provenance_mismatch", "context_prohibited_data", "context_too_large", "canonicalization_failed", "internal_failure"] as const satisfies readonly AiErrorCode[];\ntype Selected = (typeof selected)[number];\ntype NotSelected = Exclude<AiErrorCode, Selected>;\ndeclare const remainder: NotSelected;\nconst impossible: never = remainder;\nvoid impossible;\n`,
};
const typeStatuses = {};
for (const [label, source] of Object.entries(typeFixtures)) {
  const path = resolve(authorDir, `.reviewer-v110-${process.pid}-${label}.ts`);
  writeFileSync(path, source);
  try {
    const run = spawnSync(tscPath, [
      "--noEmit", "--strict", "--target", "ES2022", "--module", "NodeNext", "--moduleResolution", "NodeNext",
      "--resolveJsonModule", "--esModuleInterop", "--skipLibCheck", path,
    ], { cwd: candidateRoot, encoding: "utf8" });
    typeStatuses[label] = run.status;
    if (label === "fresh_positive") assert.equal(run.status, 0, `${run.stdout}\n${run.stderr}`);
    else {
      assert.notEqual(run.status, 0, `${label}: unexpected success`);
      assert.match(`${run.stdout}\n${run.stderr}`, /error TS\d+:/);
    }
  } finally {
    unlinkSync(path);
  }
}

function section(text, start, end) {
  const from = text.indexOf(start);
  const to = text.indexOf(end, from + start.length);
  assert.notEqual(from, -1);
  assert.notEqual(to, -1);
  return text.slice(from, to);
}
const order = profile.executionOrders.claimedReplay;
const orderIds = order.map(({ id }) => id);
assert.deepEqual(orderIds, Array.from({ length: 14 }, (_, index) => `CR-${String(index + 1).padStart(2, "0")}`));
assert.equal(JSON.stringify(profile.executionOrders), JSON.stringify(profileV19.executionOrders));
assert.equal(
  section(design, "### 18.4 Claimed durable projection", "### 18.5 Cross-contract"),
  section(designV19, "### 18.4 Claimed durable projection", "### 18.5 Cross-contract"),
);
assert.equal(
  section(design, "### 18.5 Cross-contract", "### 18.6 No second authority"),
  section(designV19, "### 18.5 Cross-contract", "### 18.6 No second authority"),
);
function verifyOrder(candidate) {
  const ids = candidate.map(({ id }) => id);
  assert.deepEqual(ids, orderIds);
  assert.deepEqual(candidate.filter(({ adapterCalls }) => adapterCalls === 1).map(({ id }) => id), ["CR-13"]);
  assert.equal(candidate.reduce((sum, { adapterCalls }) => sum + adapterCalls, 0), 1);
  const position = Object.fromEntries(ids.map((id, index) => [id, index]));
  for (const early of ["CR-03", "CR-04", "CR-05", "CR-06", "CR-07", "CR-08"])
    for (const later of ["CR-09", "CR-10", "CR-11", "CR-12", "CR-13"])
      assert.ok(position[early] < position[later]);
}
verifyOrder(order);
const orderMutationLabels = [];
function rejectOrder(label, mutate) {
  const candidate = clone(order);
  mutate(candidate);
  assert.throws(() => verifyOrder(candidate), undefined, label);
  orderMutationLabels.push(label);
}
rejectOrder("swap_CR05_CR06", (candidate) => { [candidate[4], candidate[5]] = [candidate[5], candidate[4]]; });
rejectOrder("context_after_config", (candidate) => candidate.splice(9, 0, candidate.splice(5, 1)[0]));
rejectOrder("missing_CR08", (candidate) => candidate.splice(7, 1));
rejectOrder("second_adapter_call", (candidate) => { candidate[11].adapterCalls = 1; });

const authorSource = readFileSync(authorVerifierPath, "utf8");
const insertionPoint = "const compiledProfile = compileReviewedProfile(profile);";
assert.equal(authorSource.split(insertionPoint).length, 2);
const injected = String.raw`
const __reviewerLifecycle = [];
{
  const source = clone(profile);
  const assignment = source.contextNodeAssignments.find(({ pattern }) => pattern === "/task/guideIntent");
  let getterReads = 0;
  let afterCompile = false;
  Object.defineProperty(assignment, "domain", {
    configurable: true,
    enumerable: true,
    get() {
      getterReads += 1;
      return afterCompile ? "machine_structural_integrity" : "protected_human_business_provider_evidence";
    },
  });
  const product = compileReviewedProfile(source);
  afterCompile = true;
  const context = clone(vectors.reviewerFirstCollisionVector.context);
  context.task.guideIntent = "sales@example.com";
  const external = clone(vectors.reviewerFirstCollisionVector);
  const hashed = canonicalJsonHash(context);
  assert.equal(hashed.ok, true);
  external.expectedInputHash = hashed.value.hash;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    expectFailure(() => validateContext(product, context, external), "context_prohibited_data");
  }
  assert.equal(getterReads, 1);
  __reviewerLifecycle.push("getter_source_detached_after_single_compile_read");
}
{
  let source = clone(profile);
  const productA = compileReviewedProfile(source);
  source = clone(profile);
  source.contextNodeAssignments.find(({ pattern }) => pattern === "/sources/*/fields/*/value/**").domain = "machine_structural_integrity";
  expectFailure(() => compileReviewedProfile(source), "context_provenance_mismatch");
  const productB = compileReviewedProfile(clone(profile));
  assert.notEqual(productA, productB);
  const context = clone(vectors.reviewerFirstCollisionVector.context);
  context.sources[0].fields[0].value = { nested: ["sales@example.com"] };
  const external = clone(vectors.reviewerFirstCollisionVector);
  const hashed = canonicalJsonHash(context);
  assert.equal(hashed.ok, true);
  external.expectedInputHash = hashed.value.hash;
  expectFailure(() => validateContext(productA, context, external), "context_prohibited_data");
  expectFailure(() => validateContext(productB, context, external), "context_prohibited_data");
  __reviewerLifecycle.push("source_replacement_products_independent");
}
{
  const fake = {
    identity: compiledProfile.identity,
    summary: compiledProfile.summary,
    validateContext: () => ({ accepted: true }),
  };
  expectFailure(
    () => validateContext(fake, vectors.reviewerFirstCollisionVector.context, vectors.reviewerFirstCollisionVector),
    "context_provenance_mismatch",
  );
  __reviewerLifecycle.push("lookalike_product_rejected");
}
console.log("REVIEWER_FRESH_LIFECYCLE=" + __reviewerLifecycle.join(","));
`;
const transformedPath = resolve(authorDir, `.reviewer-v110-transformed-${process.pid}.mjs`);
writeFileSync(transformedPath, authorSource.replace(insertionPoint, `${insertionPoint}\n${injected}`));
let transformed;
try {
  transformed = spawnSync(process.execPath, [...process.execArgv, transformedPath], {
    cwd: candidateRoot,
    encoding: "utf8",
    maxBuffer: 16 * 1024 * 1024,
  });
} finally {
  unlinkSync(transformedPath);
}
assert.equal(transformed.status, 0, `${transformed.stdout}\n${transformed.stderr}`);
assert.match(transformed.stdout, /REVIEWER_FRESH_LIFECYCLE=getter_source_detached_after_single_compile_read,source_replacement_products_independent,lookalike_product_rejected/);
assert.match(transformed.stdout, /DESIGN_CONSISTENCY=PASS/);
assert.equal(transformed.stderr, "");

console.log("TASK=V1.10 independent Fresh challenge");
console.log(`CANDIDATE=${basename(candidateRoot)}:profile_sha256_${sha256(readFileSync(profilePath))}`);
console.log(`V18_M01_RUNTIME=69/69:mutations_${taxonomyMutationLabels.length}/${taxonomyMutationLabels.length}:${taxonomyMutationLabels.join(",")}`);
console.log(`V18_M01_TYPES=positive_1/1:negative_3/3:${JSON.stringify(typeStatuses)}`);
console.log(`V18_M02_NON_REGRESSION=CR01..CR14:mutations_${orderMutationLabels.length}/${orderMutationLabels.length}:${orderMutationLabels.join(",")}`);
console.log("V18_M03_LIFECYCLE=getter_source_single_read_detached:source_replacement_detached:independent_products:lookalike_product_rejected:multiple_validation_3/3");
console.log("FRESH_CHALLENGE=PASS");
