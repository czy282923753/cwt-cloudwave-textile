import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const candidateEvidence = resolve(
  here,
  "../phase-1b-stage4a-phase-b-three-strike-technical-escalation-remediation-v1",
);

const include = JSON.parse(
  readFileSync(resolve(candidateEvidence, "M02_GRAMMAR_REGISTRY_INCLUDE_DEEPSEEK_V2_1.json"), "utf8"),
);
const exclude = JSON.parse(
  readFileSync(resolve(candidateEvidence, "M02_GRAMMAR_REGISTRY_EXCLUDE_DEEPSEEK_V2_1.json"), "utf8"),
);

assert.deepEqual(
  {
    node: process.versions.node,
    v8: process.versions.v8,
    icu: process.versions.icu,
    unicode: process.versions.unicode,
    cldr: process.versions.cldr,
    platform: process.platform,
    arch: process.arch,
  },
  {
    node: "24.14.0",
    v8: "13.6.233.17-node.41",
    icu: "78.2",
    unicode: "17.0",
    cldr: "48.0",
    platform: "darwin",
    arch: "arm64",
  },
);

const canonical = (value) => {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
};

const digest = (value) => createHash("sha256").update(value).digest("hex");

function parseScalar(token) {
  assert.match(token, /^U\+[0-9A-F]{4,6}$/u);
  const scalar = Number.parseInt(token.slice(2), 16);
  assert.ok(scalar <= 0x10ffff && !(scalar >= 0xd800 && scalar <= 0xdfff));
  return scalar;
}

const gapNodeTypes = new Set([
  "emptySet",
  "codePoint",
  "codePointRange",
  "unicodeProperty",
  "union",
  "subtract",
  "reference",
]);
const gapProperties = new Set([
  "Default_Ignorable_Code_Point",
  "Mark",
  "White_Space",
  "Separator",
  "Punctuation",
]);

function compileGap(node, registry, stack = []) {
  assert.ok(Array.isArray(node) && gapNodeTypes.has(node[0]));
  const type = node[0];
  if (type === "emptySet") {
    assert.equal(node.length, 1);
    return () => false;
  }
  if (type === "codePoint") {
    assert.equal(node.length, 2);
    const scalar = parseScalar(node[1]);
    return (character) => character.codePointAt(0) === scalar;
  }
  if (type === "codePointRange") {
    assert.equal(node.length, 3);
    const start = parseScalar(node[1]);
    const end = parseScalar(node[2]);
    assert.ok(start <= end);
    return (character) => {
      const scalar = character.codePointAt(0);
      return scalar >= start && scalar <= end;
    };
  }
  if (type === "unicodeProperty") {
    assert.equal(node.length, 2);
    assert.ok(gapProperties.has(node[1]));
    const expression = new RegExp(`^\\p{${node[1]}}$`, "u");
    return (character) => expression.test(character);
  }
  if (type === "union") {
    assert.ok(node.length >= 3);
    const children = node.slice(1).map((child) => compileGap(child, registry, stack));
    return (character) => children.some((child) => child(character));
  }
  if (type === "subtract") {
    assert.equal(node.length, 3);
    const admitted = compileGap(node[1], registry, stack);
    const removed = compileGap(node[2], registry, stack);
    return (character) => admitted(character) && !removed(character);
  }
  assert.equal(type, "reference");
  assert.equal(node.length, 2);
  assert.ok(Object.hasOwn(registry.gapSetDefinitions, node[1]));
  assert.equal(stack.includes(node[1]), false);
  return compileGap(registry.gapSetDefinitions[node[1]], registry, [...stack, node[1]]);
}

function atom(node, flags) {
  let source;
  if (node[0] === "literal") {
    assert.equal([...node[1]].length, 1);
    source = node[1].replace(/[\\^$.*+?()[\]{}|/]/gu, "\\$&");
  } else if (node[0] === "charClass") source = `[${node[1]}]`;
  else if (node[0] === "unicodeProperty") source = `\\p{${node[1]}}`;
  else if (node[0] === "shorthand") source = `\\${node[1]}`;
  else assert.fail(`unsupported atom ${node[0]}`);
  const expression = new RegExp(`^(?:${source})$`, flags);
  return (character) => expression.test(character);
}

function compileGrammar(rule, registry, ast = rule.ast) {
  let next = 0;
  const edges = [];
  const state = () => {
    const id = next;
    next += 1;
    edges[id] = [];
    return id;
  };
  const link = (from, edge) => edges[from].push(edge);
  const epsilon = () => {
    const start = state();
    const end = state();
    link(start, { kind: "epsilon", to: end });
    return { start, end };
  };
  const join = (left, right) => {
    link(left.end, { kind: "epsilon", to: right.start });
    return { start: left.start, end: right.end };
  };
  const build = (node, references = []) => {
    const type = node[0];
    if (type === "literal") {
      assert.ok([...node[1]].length > 0);
      let fragment;
      for (const character of [...node[1]]) {
        const start = state();
        const end = state();
        link(start, { kind: "atom", to: end, accepts: atom(["literal", character], rule.flags) });
        fragment = fragment ? join(fragment, { start, end }) : { start, end };
      }
      return fragment;
    }
    if (["charClass", "unicodeProperty", "shorthand"].includes(type)) {
      const start = state();
      const end = state();
      link(start, { kind: "atom", to: end, accepts: atom(node, rule.flags) });
      return { start, end };
    }
    if (["wordBoundary", "startAnchor"].includes(type)) {
      const start = state();
      const end = state();
      link(start, { kind: "assertion", to: end, assertion: type });
      return { start, end };
    }
    if (["negativeLookbehind", "negativeLookahead"].includes(type)) {
      const start = state();
      const end = state();
      link(start, { kind: "assertion", to: end, assertion: type, accepts: atom(node[1], rule.flags) });
      return { start, end };
    }
    if (type === "group") return build(node[1], references);
    if (type === "reference") {
      assert.ok(Object.hasOwn(registry.definitions, node[1]));
      assert.equal(references.includes(node[1]), false);
      return build(registry.definitions[node[1]], [...references, node[1]]);
    }
    if (type === "sequence") {
      assert.ok(node.length >= 3);
      return node.slice(2).reduce((left, child) => join(left, build(child, references)), build(node[1], references));
    }
    if (type === "alternation") {
      assert.ok(node.length >= 3);
      const start = state();
      const end = state();
      for (const child of node.slice(1)) {
        const fragment = build(child, references);
        link(start, { kind: "epsilon", to: fragment.start });
        link(fragment.end, { kind: "epsilon", to: end });
      }
      return { start, end };
    }
    assert.equal(type, "repeat");
    const [minimum, maximum, child] = node.slice(1);
    assert.ok(Number.isInteger(minimum) && minimum >= 0);
    assert.ok(maximum === null || (Number.isInteger(maximum) && maximum >= minimum));
    let fragment = epsilon();
    for (let count = 0; count < minimum; count += 1) fragment = join(fragment, build(child, references));
    if (maximum === null) {
      const loopStart = fragment.end;
      const loopEnd = state();
      const repeated = build(child, references);
      link(loopStart, { kind: "epsilon", to: loopEnd });
      link(loopStart, { kind: "epsilon", to: repeated.start });
      link(repeated.end, { kind: "epsilon", to: loopStart });
      fragment.end = loopEnd;
      return fragment;
    }
    for (let count = minimum; count < maximum; count += 1) {
      const branch = fragment.end;
      const end = state();
      const repeated = build(child, references);
      link(branch, { kind: "epsilon", to: end });
      link(branch, { kind: "epsilon", to: repeated.start });
      link(repeated.end, { kind: "epsilon", to: end });
      fragment.end = end;
    }
    return fragment;
  };
  const fragment = build(ast);
  return { start: fragment.start, accept: fragment.end, edges, flags: rule.flags };
}

function word(character, flags) {
  if (character === undefined) return false;
  return new RegExp("^\\w$", flags.includes("i") ? "iu" : "u").test(character);
}

function assertion(edge, characters, index, flags) {
  if (edge.assertion === "startAnchor") return index === 0;
  if (edge.assertion === "wordBoundary") return word(characters[index - 1], flags) !== word(characters[index], flags);
  if (edge.assertion === "negativeLookbehind") return characters[index - 1] === undefined || !edge.accepts(characters[index - 1]);
  if (edge.assertion === "negativeLookahead") return characters[index] === undefined || !edge.accepts(characters[index]);
  assert.fail(`unknown assertion ${edge.assertion}`);
}

function run(graph, input, gap, maximumPerGap, maximumTotal) {
  const characters = [...input];
  for (let origin = 0; origin <= characters.length; origin += 1) {
    const queue = [{ state: graph.start, index: origin, consumed: false, gapRun: 0, inserted: 0 }];
    const seen = new Set();
    for (let cursor = 0; cursor < queue.length; cursor += 1) {
      const current = queue[cursor];
      const identity = `${current.state}:${current.index}:${current.consumed}:${current.gapRun}:${current.inserted}`;
      if (seen.has(identity)) continue;
      seen.add(identity);
      if (current.state === graph.accept && current.consumed && current.gapRun === 0) return true;
      for (const edge of graph.edges[current.state]) {
        if (edge.kind === "epsilon") queue.push({ ...current, state: edge.to });
        else if (edge.kind === "assertion" && assertion(edge, characters, current.index, graph.flags)) {
          queue.push({ ...current, state: edge.to });
        } else if (edge.kind === "atom" && current.index < characters.length && edge.accepts(characters[current.index])) {
          queue.push({ state: edge.to, index: current.index + 1, consumed: true, gapRun: 0, inserted: current.inserted });
        }
      }
      if (
        current.consumed &&
        current.index < characters.length &&
        gap(characters[current.index]) &&
        current.gapRun < maximumPerGap &&
        current.inserted < maximumTotal
      ) {
        queue.push({ ...current, index: current.index + 1, gapRun: current.gapRun + 1, inserted: current.inserted + 1 });
      }
    }
  }
  return false;
}

function outcome(compiled, input) {
  const normalized = input.normalize("NFKC");
  const invalid = compileGap(["reference", "invalid-control-set-v1"], compiled.registry);
  if ([...normalized].some(invalid)) return "invalid_control";
  const gap = compileGap(compiled.rule.insertion.gapSetAst, compiled.registry);
  if (run(compiled.graph, normalized, () => false, 0, 0)) return compiled.rule.category;
  if (run(
    compiled.graph,
    normalized,
    gap,
    compiled.rule.insertion.maximumCodePointsPerGap,
    compiled.rule.insertion.maximumInsertedCodePointsPerMatchedCandidate,
  )) return compiled.rule.category;
  if ([...normalized].some(gap) && run(compiled.graph, normalized, gap, normalized.length, normalized.length)) return "unsupported_value";
  return "allow";
}

function compileRegistry(registry) {
  const result = new Map();
  for (const rule of registry.rules) {
    const gap = compileGap(rule.insertion.gapSetAst, registry);
    assert.equal(typeof gap, "function");
    result.set(rule.ruleId, { rule, registry, graph: compileGrammar(rule, registry) });
  }
  return result;
}

function classifyRegistry(compiledRules, registry, input, targetDomain = "value") {
  for (const rule of [...registry.rules].sort((left, right) => left.priority - right.priority)) {
    if (!(rule.targetDomain === targetDomain || rule.targetDomain === "both")) continue;
    const result = outcome(compiledRules.get(rule.ruleId), input);
    if (result !== "allow") return result;
  }
  return "allow";
}

assert.equal(include.rules.length, 32);
assert.equal(exclude.rules.length, 30);
const includeCompiled = compileRegistry(include);
const excludeCompiled = compileRegistry(exclude);

const includeCommon = new Map(
  include.rules.filter((rule) => !rule.regressionEvidenceId.startsWith("none:"))
    .map((rule) => [rule.regressionEvidenceId, rule]),
);
for (const excludeRule of exclude.rules) {
  const includeRule = structuredClone(includeCommon.get(excludeRule.regressionEvidenceId));
  const compareExclude = structuredClone(excludeRule);
  assert.ok(includeRule);
  const expectedShift = excludeRule.priority > 26 ? 2 : 0;
  assert.equal(includeRule.priority, excludeRule.priority + expectedShift);
  delete includeRule.priority;
  delete compareExclude.priority;
  assert.deepEqual(includeRule, compareExclude);
}
const extras = include.rules.filter((rule) => rule.regressionEvidenceId.startsWith("none:"));
assert.deepEqual(extras.map((rule) => rule.ruleId), [
  "value.provider-selected-model-prefix.v1",
  "value.provider-selected-name.lexical.v2_1",
]);
assert.deepEqual(extras[0].insertion, extras[1].insertion);

const selectedName = includeCompiled.get("value.provider-selected-name.lexical.v2_1");
const selectedPrefix = includeCompiled.get("value.provider-selected-model-prefix.v1");
const commonPrefix = includeCompiled.get("value.provider-model-prefix.common.v2_1");

const cases = [
  [selectedName, "DeepSeek", "provider_override"],
  [selectedPrefix, "deepseek-v4-flash", "provider_override"],
  [selectedName, "deep\u200bseek", "provider_override"],
  [selectedName, "deep\u2060seek", "provider_override"],
  [selectedName, "deep\u061cseek", "provider_override"],
  [selectedName, "deep\ufe00seek", "provider_override"],
  [selectedName, "deep\u20ddseek", "provider_override"],
  [selectedName, "deep\u05b0seek", "provider_override"],
  [selectedName, "deep\u034fseek", "provider_override"],
  [selectedName, "deep\nseek", "provider_override"],
  [selectedName, "deep-seek", "allow"],
  [selectedName, "deep; seek", "allow"],
  [selectedName, "deep seek", "allow"],
  [selectedName, "deep\u2014seek", "allow"],
  [selectedName, "deep\u2028seek", "allow"],
  [selectedName, "deep\u1680seek", "allow"],
  [selectedName, "deep\u0085seek", "allow"],
  [selectedName, "deep\tseek", "invalid_control"],
  [selectedName, "deep\rseek", "invalid_control"],
  [selectedName, `deep${"\u061c".repeat(4)}seek`, "provider_override"],
  [selectedName, `deep${"\u061c".repeat(5)}seek`, "unsupported_value"],
  [commonPrefix, "g\u061cpt-4", "provider_override"],
  [commonPrefix, "g\u05b0pt-4", "provider_override"],
  [commonPrefix, "g\u00b7pt-4", "provider_override"],
  [commonPrefix, "g\u1680pt-4", "provider_override"],
  [commonPrefix, "g\u0085pt-4", "provider_override"],
];
for (const [compiled, input, expected] of cases) {
  const before = digest(Buffer.from(input));
  assert.equal(outcome(compiled, input), expected, JSON.stringify(input));
  assert.equal(digest(Buffer.from(input)), before, `persisted bytes ${JSON.stringify(input)}`);
}

for (const [input, includeExpected, excludeExpected] of [
  ["DeepSeek", "provider_override", "allow"],
  ["deepseek-v4-flash", "provider_override", "allow"],
  ["deep\u061cseek", "provider_override", "allow"],
  ["deep\u05b0seek", "provider_override", "allow"],
  ["deep\nseek", "provider_override", "allow"],
  ["deep-seek", "allow", "allow"],
  ["deep; seek", "allow", "allow"],
  ["deep\u1680seek", "allow", "allow"],
  ["deep\tseek", "invalid_control", "invalid_control"],
  ["g\u00b7pt-4", "provider_override", "provider_override"],
]) {
  assert.equal(classifyRegistry(includeCompiled, include, input), includeExpected, `INCLUDE ${JSON.stringify(input)}`);
  assert.equal(classifyRegistry(excludeCompiled, exclude, input), excludeExpected, `EXCLUDE ${JSON.stringify(input)}`);
}

const syntheticRule = {
  ...selectedName.rule,
  ruleId: "reviewer.synthetic.total-counter",
  ast: ["literal", "abcdefghijklmnopqr"],
};
const synthetic = { rule: syntheticRule, registry: include, graph: compileGrammar(syntheticRule, include) };
const buildCounterInput = (lastGapCount) =>
  [..."abcdefghijklmnopq"]
    .map((character, index) => character + "\u200b".repeat(index < 16 ? 4 : lastGapCount))
    .join("") + "r";
const gaps64 = buildCounterInput(0);
assert.equal([...gaps64].length - 18, 64);
assert.equal(outcome(synthetic, gaps64), "provider_override");
const gaps65Exact = buildCounterInput(1);
assert.equal([...gaps65Exact].length - 18, 65);
assert.equal(outcome(synthetic, gaps65Exact), "unsupported_value");

const propertyExpressions = Object.fromEntries(
  [...gapProperties].map((property) => [property, new RegExp(`^\\p{${property}}$`, "u")]),
);
const propertyCounts = Object.fromEntries([...gapProperties].map((property) => [property, 0]));
for (let scalar = 0; scalar <= 0x10ffff; scalar += 1) {
  if (scalar >= 0xd800 && scalar <= 0xdfff) continue;
  const character = String.fromCodePoint(scalar);
  for (const [property, expression] of Object.entries(propertyExpressions)) {
    if (expression.test(character)) propertyCounts[property] += 1;
  }
}
for (const count of Object.values(propertyCounts)) assert.ok(count > 0);

const legacyShortcut = (character) => ["\n", "\u034f", "\u200b"].includes(character);
for (const character of ["\u061c", "\ufe00", "\u05b0", "\u00b7", "\u1680", "\u0085"]) {
  assert.equal(legacyShortcut(character), false);
}

console.log(`PASS runtime=${process.versions.node}/${process.versions.unicode}/${process.arch}`);
console.log(`PASS registries include=${include.rules.length} exclude=${exclude.rules.length} common=${exclude.rules.length} delta=${extras.length}`);
console.log(`PASS compiled every rule from inline grammar AST + inline gapSetAst + counters: include=${includeCompiled.size} exclude=${excludeCompiled.size}`);
console.log(`PASS deepseek fresh cases=${cases.length} visible separators excluded; DICP/Mark/LF admitted; controls and 4/5 limits exact`);
console.log("PASS total transition counter synthetic=64 match / 65 unsupported_value from the same graph");
console.log(`PASS full Unicode property predicates enumerated counts=${JSON.stringify(propertyCounts)}`);
console.log("PASS fresh witnesses kill legacy LF/U+034F/U+200B shortcut and preserve original UTF-8 bytes");
console.log(`SUMMARY TECH_M01_FRESH_TRANSITION_CHALLENGE=PASS graph_sha256=${digest(canonical([...includeCompiled.keys()]))}`);
