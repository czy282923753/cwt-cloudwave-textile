import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const repositoryRoot = resolve(here, "../../..");
const candidateEvidence = resolve(
  repositoryRoot,
  "docs/review-evidence/phase-1b-stage4a-phase-b-three-strike-technical-escalation-v1",
);

const readJson = (name) =>
  JSON.parse(readFileSync(resolve(candidateEvidence, name), "utf8"));

const includeRegistry = readJson("M02_GRAMMAR_REGISTRY_INCLUDE_DEEPSEEK_V2_0.json");
const excludeRegistry = readJson("M02_GRAMMAR_REGISTRY_EXCLUDE_DEEPSEEK_V2_0.json");
const policy = readJson("M02_PROTECTED_DATA_AUTHORITY_PROFILE_V2_0.json");
const decision = readJson("M02_DEEPSEEK_OWNER_DECISION_PROFILE_V1_0.json");
const corpus = readJson("M02_FALSE_POSITIVE_AND_SECURITY_CORPUS_V1_0.json");

assert.equal(decision.ownerSelection, null);
assert.equal(decision.options.length, 2);
assert.deepEqual(
  decision.options.map((option) => option.optionId),
  ["M02-D1-INCLUDE", "M02-D1-EXCLUDE"],
);
assert.equal(includeRegistry.rules.length, 31);
assert.equal(excludeRegistry.rules.length, 30);

const cloneWithout = (value, fields) => {
  const cloned = structuredClone(value);
  for (const field of fields) delete cloned[field];
  return cloned;
};

const includeByEvidence = new Map(
  includeRegistry.rules.map((rule) => [rule.regressionEvidenceId, rule]),
);
for (const excludeRule of excludeRegistry.rules) {
  const includeRule = includeByEvidence.get(excludeRule.regressionEvidenceId);
  assert.ok(includeRule, `missing INCLUDE rule ${excludeRule.regressionEvidenceId}`);
  if (excludeRule.regressionEvidenceId === "valueRules[15]") continue;
  assert.deepEqual(
    cloneWithout(includeRule, ["priority"]),
    cloneWithout(excludeRule, ["priority"]),
    `unexpected semantic delta ${excludeRule.regressionEvidenceId}`,
  );
  assert.equal(
    includeRule.priority,
    excludeRule.priority + (excludeRule.priority > 26 ? 1 : 0),
    `unexpected priority shift ${excludeRule.regressionEvidenceId}`,
  );
}

const includePrefix = includeRegistry.rules.find(
  (rule) => rule.ruleId === "value.provider-model-prefix.v3",
);
const excludePrefix = excludeRegistry.rules.find(
  (rule) => rule.ruleId === "value.provider-model-prefix.v2",
);
const includeName = includeRegistry.rules.find(
  (rule) => rule.ruleId === "value.provider-selected-name.lexical.v1",
);
assert.ok(includePrefix && excludePrefix && includeName);
assert.match(JSON.stringify(includePrefix.ast), /deepseek-/u);
assert.doesNotMatch(JSON.stringify(excludePrefix.ast), /deepseek-/u);
assert.deepEqual(includeName.ast, [
  "sequence",
  ["wordBoundary"],
  ["literal", "deepseek"],
  ["wordBoundary"],
]);
assert.equal(includeName.insertion.mode, "grammar-adjacency-v1");
assert.equal(
  includeName.insertion.eligibleGapDefinition,
  "between every two consecutive consuming atom transitions in a successful AST path; zero-width assertions, absent optional branches and the outside of the matched span never create a gap",
);

const properties = policy.controlAndInsertionPolicy.admittedInsertionProperties;
assert.deepEqual(properties, [
  "Default_Ignorable_Code_Point",
  "Mark",
  "White_Space",
  "Separator",
  "Punctuation",
]);
assert.equal(policy.controlAndInsertionPolicy.gapSemantics.maximumCodePointsPerGap, 4);

const invalidControlSource = "[\\u0000-\\u0009\\u000b-\\u001f\\u007f]";
const admittedPropertySource = properties
  .map((property) => `\\p{${property}}`)
  .join("|");
const admittedInsertionAtom = `(?:(?!${invalidControlSource})(?:${admittedPropertySource}))`;
const declaredGap = `(?:${admittedInsertionAtom}){0,4}`;

// The selected-name rule expands its literal to scalar atoms and declares a
// gap between every consecutive consuming atom. This is the exact rule-level
// consequence of the normative profile, independent of the author verifier's
// three-code-point witness shortcut.
const wholeTokenPattern = new RegExp(
  `\\b${[..."deepseek"].join(declaredGap)}\\b`,
  "iu",
);
const modelPrefixPattern = new RegExp(
  `\\b${[..."deepseek-"].join(declaredGap)}`,
  "iu",
);

for (const value of [
  "DeepSeek",
  "d\u200beepseek",
  "deep\nseek",
  "deep-seek",
  "The analysis is deep; seek durable textiles.",
]) {
  assert.equal(wholeTokenPattern.test(value), true, `expected grammar match ${value}`);
}
assert.equal(modelPrefixPattern.test("deepseek-v4-flash"), true);
assert.equal(modelPrefixPattern.test("deepseek\u034f-v4-flash"), true);
assert.equal(wholeTokenPattern.test("deepseeking"), false);
assert.equal(wholeTokenPattern.test("deepseekers"), false);
assert.equal(wholeTokenPattern.test("a deep seeker"), false);

const safeHyphen = corpus.cases.find((entry) => entry.id === "safe-deep-hyphen-seek");
const safeSeparated = corpus.cases.find((entry) => entry.id === "safe-separated-words");
assert.ok(safeHyphen && safeSeparated);
assert.equal(safeHyphen.include, "allow");
assert.equal(safeSeparated.include, "allow");
assert.equal(wholeTokenPattern.test(safeHyphen.input), true);
assert.equal(wholeTokenPattern.test(safeSeparated.input), true);

const authorVerifier = readFileSync(
  resolve(candidateEvidence, "VERIFY_TECHNICAL_ESCALATION_V1_0.mjs"),
  "utf8",
);
assert.match(
  authorVerifier,
  /const witnessInsertionPattern = \/\[\\u000a\\u034f\\u200b\]\/gu/u,
);
assert.doesNotMatch(authorVerifier, /\\p\{Punctuation\}/u);

process.stdout.write(
  [
    "CWT Stage 4A Phase B independent M02 escalation challenge V1.0",
    "PASS INCLUDE/EXCLUDE are unselected, mutually named, and differ in rule semantics only by the DeepSeek prefix, one whole-token rule, and the declared later priority shift",
    "PASS whole-token DeepSeek and deepseek- model-prefix rules are generated from the selected closed AST and grammar-adjacency insertion policy",
    "PASS fresh derived matcher confirms direct, U+200B, LF, U+034F and deepseek-v4-flash protected forms",
    "FAIL false-positive boundary is internally contradictory: Punctuation/White_Space are admitted at every literal adjacency, so both deep-seek and deep; seek match the whole-token DeepSeek rule although the mandatory corpus and Owner package say allow",
    "FAIL author verifier is not a proof of the normative insertion language: its corpus helper strips only LF/U+034F/U+200B and never evaluates the declared Punctuation/White_Space property union",
    "RESULT TECHNICAL_ESCALATION_OWNER_DECISION_READY=NO M02_OWNER_CHOICE_PRECISE=NO",
  ].join("\n") + "\n",
);
