import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const repositoryRoot = resolve(import.meta.dirname, "../../..");
const base = resolve(
  repositoryRoot,
  "docs/review-evidence/phase-1b-stage4a-phase-b-three-strike-technical-escalation-remediation-v1",
);
const include = JSON.parse(readFileSync(resolve(base, "M02_GRAMMAR_REGISTRY_INCLUDE_DEEPSEEK_V2_1.json"), "utf8"));
const exclude = JSON.parse(readFileSync(resolve(base, "M02_GRAMMAR_REGISTRY_EXCLUDE_DEEPSEEK_V2_1.json"), "utf8"));

assert.deepEqual(
  [process.versions.node, process.versions.v8, process.versions.icu, process.versions.unicode, process.versions.cldr, process.platform, process.arch],
  ["24.14.0", "13.6.233.17-node.41", "78.2", "17.0", "48.0", "darwin", "arm64"],
);
assert.equal(include.rules.length, 32);
assert.equal(exclude.rules.length, 30);

const deepSeekIds = new Set([
  "value.provider-selected-model-prefix.v1",
  "value.provider-selected-name.lexical.v2_1",
]);
const deepSeekRules = include.rules.filter((rule) => deepSeekIds.has(rule.ruleId));
assert.equal(deepSeekRules.length, 2);
assert.equal(exclude.rules.some((rule) => deepSeekIds.has(rule.ruleId)), false);

const includeCommon = new Map(
  include.rules
    .filter((rule) => !deepSeekIds.has(rule.ruleId))
    .map((rule) => [rule.regressionEvidenceId, structuredClone(rule)]),
);
for (const excluded of exclude.rules) {
  const selected = includeCommon.get(excluded.regressionEvidenceId);
  assert.ok(selected, excluded.ruleId);
  assert.equal(selected.priority, excluded.priority + (excluded.priority > 26 ? 2 : 0));
  const left = structuredClone(selected);
  const right = structuredClone(excluded);
  delete left.priority;
  delete right.priority;
  assert.deepEqual(left, right, excluded.ruleId);
}

const invalid = (character) => {
  const point = character.codePointAt(0);
  return (point >= 0x00 && point <= 0x09) || (point >= 0x0b && point <= 0x1f) || point === 0x7f;
};
const deepSeekGap = (character) =>
  !invalid(character) &&
  (/^\p{Default_Ignorable_Code_Point}$/u.test(character) || /^\p{Mark}$/u.test(character) || character === "\n");

function gappedLiteral(input, literal, { prefix = false } = {}) {
  const normalized = input.normalize("NFKC");
  if ([...normalized].some(invalid)) return "invalid_control";
  const source = [...normalized];
  const target = [...literal];
  let cursor = 0;
  let inserted = 0;
  for (let index = 0; index < target.length; index += 1) {
    if ((source[cursor] ?? "").toLocaleLowerCase("en-US") !== target[index].toLocaleLowerCase("en-US")) return "allow";
    cursor += 1;
    if (index === target.length - 1) break;
    let gapRun = 0;
    while (cursor < source.length && deepSeekGap(source[cursor])) {
      gapRun += 1;
      inserted += 1;
      cursor += 1;
    }
    if (gapRun > 4 || inserted > 64) return "unsupported_value";
  }
  if (!prefix && cursor !== source.length) return "allow";
  return "provider_override";
}

const admitted = ["\u180E", "\u200D", "\u2060", "\u034F", "\u20DD", "\uFE0F", "\n"];
for (const gap of admitted) {
  assert.equal(gappedLiteral(`deep${gap}seek`, "deepseek"), "provider_override", `admitted ${JSON.stringify(gap)}`);
}
for (const gap of ["-", ";", " ", "\u2028", "\u2029", "\u3000", "、", "—"]) {
  assert.equal(gappedLiteral(`deep${gap}seek`, "deepseek"), "allow", `visible/ordinary separator ${JSON.stringify(gap)}`);
}
assert.equal(gappedLiteral("deep\tseek", "deepseek"), "invalid_control");
assert.equal(gappedLiteral("deep\rseek", "deepseek"), "invalid_control");
assert.equal(gappedLiteral(`deep${"\u034F".repeat(4)}seek`, "deepseek"), "provider_override");
assert.equal(gappedLiteral(`deep${"\u034F".repeat(5)}seek`, "deepseek"), "unsupported_value");
assert.equal(gappedLiteral("deepseek-v4-flash", "deepseek-", { prefix: true }), "provider_override");
assert.equal(gappedLiteral("xdeepseek", "deepseek"), "allow");
assert.equal(gappedLiteral("deepseeker", "deepseek"), "allow");

const fullwidth = "ｄｅｅｐｓｅｅｋ";
const before = Buffer.from(fullwidth, "utf8");
assert.equal(gappedLiteral(fullwidth, "deepseek"), "provider_override");
assert.deepEqual(Buffer.from(fullwidth, "utf8"), before);

for (const rule of deepSeekRules) {
  const serialized = JSON.stringify(rule.insertion.gapSetAst);
  assert.match(serialized, /Default_Ignorable_Code_Point/u);
  assert.match(serialized, /Mark/u);
  assert.match(serialized, /U\+000A/u);
  assert.doesNotMatch(serialized, /Punctuation|Separator|White_Space/u);
  assert.equal(rule.insertion.maximumCodePointsPerGap, 4);
  assert.equal(rule.insertion.maximumInsertedCodePointsPerMatchedCandidate, 64);
}

console.log("RUNTIME_TUPLE=24.14.0/13.6.233.17-node.41/78.2/17.0/48.0/darwin/arm64");
console.log("RULES=32 COMMON=30 DEEPSEEK_ONLY=2 COMMON_DELTA=IDENTICAL_EXCEPT_PRIORITY_SHIFT");
console.log(`FRESH_ADMITTED_GAPS=${admitted.length} FRESH_VISIBLE_OR_ORDINARY_EXCLUDED=8`);
console.log("LIMITS=PER_GAP_4_MATCH_5_UNSUPPORTED PERSISTED_BYTES=UNCHANGED");
console.log("SUMMARY M02_SELECTED_BOUNDARY_PROBE=PASS");
