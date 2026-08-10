import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "../../..");
const v14 = readFileSync(resolve(root, "docs/PHASE_1B_STAGE4A_PHASE_B_PROVIDER_NEUTRAL_FOUNDATION_EXACT_DESIGN_V1_4.md"), "utf8");
const v15 = readFileSync(resolve(root, "docs/PHASE_1B_STAGE4A_PHASE_B_PROVIDER_NEUTRAL_FOUNDATION_CORRECTED_EXACT_DESIGN_V1_5.md"), "utf8");
const owner = readFileSync(resolve(root, "docs/PHASE_1B_STAGE4A_PHASE_B_THREE_STRIKE_OWNER_SELECTION_RECORD_V1_0.md"), "utf8");
const profile = JSON.parse(readFileSync(resolve(root, "docs/review-evidence/phase-1b-stage4a-phase-b-corrected-design-v1/CORRECTED_DESIGN_CONTRACT_PROFILE_V1_0.json"), "utf8"));

function sections(markdown) {
  const matches = [...markdown.matchAll(/^## (\d+)\./gmu)];
  const result = new Map();
  for (let index = 0; index < matches.length; index += 1) {
    const start = matches[index].index;
    const end = matches[index + 1]?.index ?? markdown.length;
    result.set(Number(matches[index][1]), markdown.slice(start, end));
  }
  return result;
}

const v14Sections = sections(v14);
const v15Sections = sections(v15);
assert.equal(v14Sections.size, 26);
assert.equal(v15Sections.size, 26);
const byteIdenticalSections = [3, 4, 5, 9, 10, 11, 12, 15, 16, 17, 18, 21, 24];
for (const section of byteIdenticalSections) {
  assert.equal(v15Sections.get(section), v14Sections.get(section), `section ${section}`);
}

assert.match(owner, /批准 M02-D1-INCLUDE；批准 M03-D1-DISCRIMINATED-SEAM。/u);
assert.deepEqual(profile.preservedClosedContracts, [
  "H-01", "H-02", "M-01", "M-02", "M-03", "M-04", "M-05", "M-06", "L-01",
  "N-M01", "N-M02", "N-M03", "N-M04",
]);
assert.deepEqual(profile.selectedOptions.m02.optionId, "M02-D1-INCLUDE");
assert.deepEqual(profile.selectedOptions.m03.optionId, "M03-D1-DISCRIMINATED-SEAM");
assert.equal(profile.implementationAuthorized, false);
assert.equal(profile.selfApproved, false);
assert.equal(profile.derivation.failedImplementationsReused, false);
assert.equal(profile.derivation.compatibilityLayerAdded, false);

for (const text of [
  "seo_content_draft",
  "fabric_knowledge_draft",
  "product_description_draft",
  "sourcing_guide_draft",
  "customer_support",
  "fallback",
  "Production Prompt manifest",
  "human_review_required",
  "Phase C",
  "Phase D",
  "Phase E",
  "21/21",
  "96/96",
]) {
  assert.ok(v15.includes(text), text);
}

const digest = (value) => createHash("sha256").update(value).digest("hex");
console.log(`V14_SECTIONS=${v14Sections.size} V15_SECTIONS=${v15Sections.size}`);
console.log(`BYTE_IDENTICAL_TOP_LEVEL_SECTIONS=${byteIdenticalSections.join(",")}`);
console.log(`PRESERVED_CLOSURES=${profile.preservedClosedContracts.length}`);
console.log(`V15_SHA256=${digest(v15)}`);
console.log("OWNER_SELECTIONS=M02-D1-INCLUDE,M03-D1-DISCRIMINATED-SEAM IMPLEMENTATION_AUTHORIZED=false");
console.log("SUMMARY STANDALONE_NONREGRESSION_PROBE=PASS_WITH_SEPARATE_M03_GRAPH_FINDING");
