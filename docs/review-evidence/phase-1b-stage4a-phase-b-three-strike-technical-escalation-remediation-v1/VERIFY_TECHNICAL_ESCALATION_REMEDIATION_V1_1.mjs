import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  existsSync,
  readFileSync,
} from "node:fs";
import {
  dirname,
  resolve,
} from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const repositoryRoot = resolve(here, "../../..");
const captureMode = process.argv.includes("--capture");
const output = [];

function pass(message) {
  output.push(`PASS ${message}`);
}

function readText(path) {
  return readFileSync(resolve(repositoryRoot, path), "utf8");
}

function readJson(path) {
  return JSON.parse(readText(path));
}

function readEvidenceJson(name) {
  return JSON.parse(readFileSync(resolve(here, name), "utf8"));
}

function sha256Bytes(value) {
  return createHash("sha256").update(value).digest("hex");
}

function sha256File(path) {
  return sha256Bytes(readFileSync(path));
}

function sha256RepositoryFile(path) {
  return sha256File(resolve(repositoryRoot, path));
}

function run(command, args, options = {}) {
  return spawnSync(command, args, {
    cwd: options.cwd ?? repositoryRoot,
    encoding: "utf8",
    env: process.env,
  });
}

function git(args, options = {}) {
  const result = run("git", args, options);
  assert.equal(result.status, 0, `git ${args.join(" ")} failed: ${result.stderr}`);
  return result.stdout.trim();
}

function canonicalize(value) {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalize).join(",")}]`;
  return `{${Object.keys(value)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${canonicalize(value[key])}`)
    .join(",")}}`;
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function nonempty(value, label) {
  assert.equal(typeof value, "string", `${label} must be string`);
  assert.ok(value.length > 0, `${label} must be nonempty`);
}

function assertExactKeys(value, expected, label) {
  assert.deepEqual(Object.keys(value).sort(), [...expected].sort(), `${label} keys`);
}

function verifyManifest(path, expectedCount) {
  const entries = readFileSync(path, "utf8")
    .trim()
    .split("\n")
    .map((line) => {
      const match = line.match(/^([0-9a-f]{64})  (.+)$/u);
      assert.ok(match, `invalid manifest line ${line}`);
      return { hash: match[1], path: match[2] };
    });
  assert.equal(entries.length, expectedCount, `${path} entry count`);
  for (const entry of entries) {
    const target = resolve(repositoryRoot, entry.path);
    assert.equal(existsSync(target), true, `manifest missing ${entry.path}`);
    assert.equal(sha256File(target), entry.hash, `manifest hash ${entry.path}`);
  }
  return entries;
}

const remediationEvidencePath =
  "docs/review-evidence/phase-1b-stage4a-phase-b-three-strike-technical-escalation-remediation-v1";
const v10EvidencePath =
  "docs/review-evidence/phase-1b-stage4a-phase-b-three-strike-technical-escalation-v1";
const independentEvidencePath =
  "docs/review-evidence/phase-1b-stage4a-phase-b-three-strike-technical-escalation-independent-review-v1";

const fixed = readEvidenceJson("FIXED_INPUTS_V1_1.json");
const policy = readEvidenceJson("M02_PROTECTED_DATA_AUTHORITY_PROFILE_V2_1.json");
const decision = readEvidenceJson("M02_DEEPSEEK_OWNER_DECISION_PROFILE_V1_1.json");
const corpus = readEvidenceJson("M02_FALSE_POSITIVE_AND_SECURITY_CORPUS_V1_1.json");
const includeRegistry = readEvidenceJson(
  "M02_GRAMMAR_REGISTRY_INCLUDE_DEEPSEEK_V2_1.json",
);
const excludeRegistry = readEvidenceJson(
  "M02_GRAMMAR_REGISTRY_EXCLUDE_DEEPSEEK_V2_1.json",
);
const m03Graph = readJson(
  `${v10EvidencePath}/M03_CAPABILITY_GRAPH_AND_DATABASE_SEAM_PROFILE_V2_0.json`,
);

for (const field of ["node", "v8", "icu", "unicode", "cldr"]) {
  assert.equal(process.versions[field], fixed.runtimeTuple[field], `runtime ${field}`);
}
assert.equal(process.platform, fixed.runtimeTuple.platform, "runtime platform");
assert.equal(process.arch, fixed.runtimeTuple.arch, "runtime architecture");
const typescriptPackage = readJson("node_modules/typescript/package.json");
assert.equal(typescriptPackage.version, fixed.runtimeTuple.typescript);
pass(
  `runtime Node ${process.versions.node}; V8 ${process.versions.v8}; ICU ${process.versions.icu}; Unicode ${process.versions.unicode}; CLDR ${process.versions.cldr}; ${process.platform}/${process.arch}; TypeScript ${typescriptPackage.version}`,
);

assert.equal(git(["branch", "--show-current"]), fixed.git.branch);
assert.equal(
  git(["merge-base", "HEAD", fixed.git.remediationParent]),
  fixed.git.remediationParent,
);
assert.equal(
  git(["rev-parse", `${fixed.git.independentFailImportCheckpoint}^`]),
  fixed.git.remediationParent,
);
assert.equal(
  git(["merge-base", "HEAD", fixed.git.cleanRestartCheckpoint]),
  fixed.git.cleanRestartCheckpoint,
);
assert.equal(
  git(["rev-parse", `refs/tags/${fixed.frozenBaseline.tag}`]),
  fixed.frozenBaseline.tagObject,
);
assert.equal(
  git(["rev-parse", `refs/tags/${fixed.frozenBaseline.tag}^{}`]),
  fixed.frozenBaseline.peeledCommit,
);
for (const commit of [
  fixed.git.diagnosticEvidenceOnly,
  ...fixed.git.failedImplementationEvidenceOnly,
]) {
  assert.equal(git(["cat-file", "-t", commit]), "commit");
  const ancestor = run("git", ["merge-base", "--is-ancestor", commit, "HEAD"]);
  assert.equal(ancestor.status, 1, `${commit} must remain evidence-only`);
}
pass("fixed branch, remediation parent, clean restart, frozen tag and evidence-only ancestry");

for (const artifact of [
  fixed.immutableV10.mainReport,
  fixed.immutableV10.ownerPackage,
  fixed.immutableV10.manifest,
]) {
  assert.equal(sha256RepositoryFile(artifact.path), artifact.sha256, artifact.path);
}
const v10Diff = run("git", [
  "diff",
  "--quiet",
  fixed.git.remediationParent,
  "--",
  fixed.immutableV10.mainReport.path,
  fixed.immutableV10.ownerPackage.path,
  fixed.immutableV10.evidenceDirectory,
]);
assert.equal(v10Diff.status, 0, "V1.0 files changed");
verifyManifest(
  resolve(repositoryRoot, fixed.immutableV10.manifest.path),
  fixed.immutableV10.manifest.entries,
);
pass("V1.0 report/package/evidence byte identity and original 21/21 manifest");

for (const artifact of [
  fixed.independentFailAuthority.mainReport,
  fixed.independentFailAuthority.evidence,
  fixed.independentFailAuthority.manifest,
]) {
  assert.equal(sha256RepositoryFile(artifact.path), artifact.sha256, artifact.path);
}
verifyManifest(
  resolve(repositoryRoot, fixed.independentFailAuthority.manifest.path),
  fixed.independentFailAuthority.manifest.entries,
);
assert.equal(fixed.independentFailAuthority.finding.id, "TECH-M01");
assert.equal(fixed.independentFailAuthority.finding.onlyFinding, true);
pass("byte-identical independent FAIL report/evidence and 8/8 reviewer manifest");

for (const [path, expectedHash] of Object.entries(fixed.immutableAuthorityFiles)) {
  assert.equal(sha256RepositoryFile(path), expectedHash, path);
}
pass("accepted Design, ADR, database/environment types, compiler, package and lock hashes");

const allowedGrammarNodeTypes = new Set([
  "literal",
  "charClass",
  "unicodeProperty",
  "shorthand",
  "sequence",
  "alternation",
  "group",
  "repeat",
  "reference",
  "wordBoundary",
  "startAnchor",
  "negativeLookbehind",
  "negativeLookahead",
]);
const allowedGapNodeTypes = new Set([
  "emptySet",
  "codePoint",
  "codePointRange",
  "unicodeProperty",
  "union",
  "subtract",
  "reference",
]);
const allowedGapProperties = new Set([
  "Default_Ignorable_Code_Point",
  "Mark",
  "White_Space",
  "Separator",
  "Punctuation",
]);

function validateCharClass(source, label) {
  nonempty(source, label);
  let index = source.startsWith("^") ? 1 : 0;
  assert.ok(index < source.length, `${label} empty negated class`);
  const atoms = [];
  while (index < source.length) {
    if (source[index] === "\\") {
      if (source.startsWith("\\p{N}", index)) {
        atoms.push("\\p{N}");
        index += 5;
        continue;
      }
      assert.ok(
        source[index + 1] === "s" || source[index + 1] === "d",
        `${label} unsupported escape`,
      );
      atoms.push(source.slice(index, index + 2));
      index += 2;
      continue;
    }
    const code = source.codePointAt(index);
    assert.ok(code >= 0x20 && code <= 0x7e, `${label} non-ASCII class token`);
    assert.ok(!"[]".includes(source[index]), `${label} bracket token`);
    if (index + 2 < source.length && source[index + 1] === "-") {
      const end = source.codePointAt(index + 2);
      assert.ok(end >= code, `${label} reverse range`);
      atoms.push(`${source[index]}-${source[index + 2]}`);
      index += 3;
      continue;
    }
    atoms.push(source[index]);
    index += 1;
  }
  assert.equal(new Set(atoms).size, atoms.length, `${label} duplicate atom`);
}

function literalSource(value) {
  return [...value]
    .map((character) =>
      /[\\^$.*+?()[\]{}|/]/u.test(character) ? `\\${character}` : character,
    )
    .join("");
}

function compileAstSource(node, registry, state, path = "$") {
  assert.ok(Array.isArray(node) && node.length > 0, `${path} grammar AST node`);
  const type = node[0];
  assert.ok(allowedGrammarNodeTypes.has(type), `${path} unsupported ${type}`);
  state.nodeCount += 1;
  assert.ok(
    state.nodeCount <= policy.limits.maximumCompiledAstNodes,
    "compiled grammar AST node limit",
  );
  if (type === "literal") {
    assert.equal(node.length, 2, `${path} literal arity`);
    nonempty(node[1], `${path} literal`);
    return literalSource(node[1]);
  }
  if (type === "charClass") {
    assert.equal(node.length, 2, `${path} charClass arity`);
    validateCharClass(node[1], `${path} charClass`);
    return `[${node[1]}]`;
  }
  if (type === "unicodeProperty") {
    assert.equal(node.length, 2, `${path} Unicode property arity`);
    assert.equal(node[1], "N", `${path} grammar Unicode property`);
    return `\\p{${node[1]}}`;
  }
  if (type === "shorthand") {
    assert.equal(node.length, 2, `${path} shorthand arity`);
    assert.ok(["d", "s"].includes(node[1]), `${path} shorthand`);
    return `\\${node[1]}`;
  }
  if (type === "wordBoundary") {
    assert.equal(node.length, 1, `${path} wordBoundary arity`);
    return "\\b";
  }
  if (type === "startAnchor") {
    assert.equal(node.length, 1, `${path} startAnchor arity`);
    return "^";
  }
  if (type === "sequence" || type === "alternation") {
    assert.ok(node.length >= 3, `${path} ${type} arity`);
    return node
      .slice(1)
      .map((child, index) =>
        compileAstSource(child, registry, state, `${path}/${index}`),
      )
      .join(type === "sequence" ? "" : "|");
  }
  if (type === "group") {
    assert.equal(node.length, 2, `${path} group arity`);
    return `(?:${compileAstSource(node[1], registry, state, `${path}/group`)})`;
  }
  if (type === "reference") {
    assert.equal(node.length, 2, `${path} reference arity`);
    nonempty(node[1], `${path} reference`);
    assert.ok(Object.hasOwn(registry.definitions, node[1]), `${path} missing reference`);
    assert.equal(state.referenceStack.includes(node[1]), false, `${path} recursive reference`);
    state.usedReferences.add(node[1]);
    state.referenceStack.push(node[1]);
    const compiled = compileAstSource(
      registry.definitions[node[1]],
      registry,
      state,
      `${path}/ref:${node[1]}`,
    );
    state.referenceStack.pop();
    return compiled;
  }
  if (type === "repeat") {
    assert.equal(node.length, 4, `${path} repeat arity`);
    const min = node[1];
    const max = node[2];
    assert.equal(Number.isInteger(min) && min >= 0, true, `${path} repeat min`);
    assert.ok(max === null || (Number.isInteger(max) && max >= min), `${path} repeat max`);
    const child = node[3];
    const compiled = compileAstSource(child, registry, state, `${path}/repeat`);
    const atomic =
      ["charClass", "unicodeProperty", "shorthand", "reference", "group"].includes(
        child[0],
      ) ||
      (child[0] === "literal" && [...child[1]].length === 1);
    const operand = atomic ? compiled : `(?:${compiled})`;
    let quantifier;
    if (min === 0 && max === 1) quantifier = "?";
    else if (min === 0 && max === null) quantifier = "*";
    else if (min === 1 && max === null) quantifier = "+";
    else if (max === min) quantifier = `{${min}}`;
    else if (max === null) quantifier = `{${min},}`;
    else quantifier = `{${min},${max}}`;
    return operand + quantifier;
  }
  assert.ok(type === "negativeLookbehind" || type === "negativeLookahead");
  assert.equal(node.length, 2, `${path} lookaround arity`);
  assert.ok(
    ["unicodeProperty", "shorthand", "charClass"].includes(node[1]?.[0]),
    `${path} lookaround operand`,
  );
  const operand = compileAstSource(node[1], registry, state, `${path}/look`);
  return type === "negativeLookbehind" ? `(?<!${operand})` : `(?!${operand})`;
}

function parseCodePoint(token, label) {
  assert.match(token, /^U\+[0-9A-F]{4,6}$/u, label);
  const value = Number.parseInt(token.slice(2), 16);
  assert.ok(
    value <= 0x10ffff && !(value >= 0xd800 && value <= 0xdfff),
    `${label} Unicode scalar`,
  );
  return value;
}

function validateGapAst(node, registry, state, path = "$") {
  assert.ok(Array.isArray(node) && node.length > 0, `${path} gap AST node`);
  const type = node[0];
  assert.ok(allowedGapNodeTypes.has(type), `${path} unsupported gap node ${type}`);
  state.nodeCount += 1;
  assert.ok(state.nodeCount <= policy.limits.maximumCompiledAstNodes, "gap AST node limit");
  if (type === "emptySet") {
    assert.equal(node.length, 1, `${path} emptySet arity`);
    return;
  }
  if (type === "codePoint") {
    assert.equal(node.length, 2, `${path} codePoint arity`);
    parseCodePoint(node[1], `${path} codePoint`);
    return;
  }
  if (type === "codePointRange") {
    assert.equal(node.length, 3, `${path} range arity`);
    const start = parseCodePoint(node[1], `${path} range start`);
    const end = parseCodePoint(node[2], `${path} range end`);
    assert.ok(end >= start, `${path} reverse range`);
    return;
  }
  if (type === "unicodeProperty") {
    assert.equal(node.length, 2, `${path} property arity`);
    assert.ok(allowedGapProperties.has(node[1]), `${path} property ${node[1]}`);
    new RegExp(`^\\p{${node[1]}}$`, "u");
    state.usedProperties.add(node[1]);
    return;
  }
  if (type === "union") {
    assert.ok(node.length >= 3, `${path} union arity`);
    node.slice(1).forEach((child, index) =>
      validateGapAst(child, registry, state, `${path}/union:${index}`),
    );
    return;
  }
  if (type === "subtract") {
    assert.equal(node.length, 3, `${path} subtract arity`);
    validateGapAst(node[1], registry, state, `${path}/left`);
    validateGapAst(node[2], registry, state, `${path}/right`);
    return;
  }
  assert.equal(type, "reference");
  assert.equal(node.length, 2, `${path} gap reference arity`);
  assert.ok(Object.hasOwn(registry.gapSetDefinitions, node[1]), `${path} missing gap ref`);
  assert.equal(state.referenceStack.includes(node[1]), false, `${path} recursive gap ref`);
  state.usedReferences.add(node[1]);
  state.referenceStack.push(node[1]);
  validateGapAst(
    registry.gapSetDefinitions[node[1]],
    registry,
    state,
    `${path}/ref:${node[1]}`,
  );
  state.referenceStack.pop();
}

function compileGapPredicate(node, registry, mutationId = null, stack = []) {
  const type = node[0];
  if (type === "emptySet") return () => false;
  if (type === "codePoint") {
    const expected = parseCodePoint(node[1], "compiled codePoint");
    return (character) => character.codePointAt(0) === expected;
  }
  if (type === "codePointRange") {
    const start = parseCodePoint(node[1], "compiled range start");
    const end = parseCodePoint(node[2], "compiled range end");
    return (character) => {
      const value = character.codePointAt(0);
      return value >= start && value <= end;
    };
  }
  if (type === "unicodeProperty") {
    if (
      (mutationId === "drop-default-ignorable-property" &&
        node[1] === "Default_Ignorable_Code_Point") ||
      (mutationId === "drop-mark-property" && node[1] === "Mark") ||
      (mutationId === "drop-punctuation-property" && node[1] === "Punctuation")
    ) {
      return () => false;
    }
    const expression = new RegExp(`^\\p{${node[1]}}$`, "u");
    return (character) => expression.test(character);
  }
  if (type === "union") {
    const predicates = node
      .slice(1)
      .map((child) => compileGapPredicate(child, registry, mutationId, stack));
    return (character) => predicates.some((predicate) => predicate(character));
  }
  if (type === "subtract") {
    const left = compileGapPredicate(node[1], registry, mutationId, stack);
    const right = compileGapPredicate(node[2], registry, mutationId, stack);
    return (character) => left(character) && !right(character);
  }
  assert.equal(type, "reference");
  assert.equal(stack.includes(node[1]), false, `recursive compiled gap ref ${node[1]}`);
  return compileGapPredicate(
    registry.gapSetDefinitions[node[1]],
    registry,
    mutationId,
    [...stack, node[1]],
  );
}

function atomDescriptor(node, flags) {
  const type = node[0];
  let source;
  if (type === "literal") source = literalSource(node[1]);
  else if (type === "charClass") source = `[${node[1]}]`;
  else if (type === "unicodeProperty") source = `\\p{${node[1]}}`;
  else if (type === "shorthand") source = `\\${node[1]}`;
  else assert.fail(`not an atom ${type}`);
  const expression = new RegExp(`^(?:${source})$`, flags);
  return {
    kind: type,
    source,
    flags,
    matches: (character) => expression.test(character),
  };
}

function buildNfa(rule, registry, astOverride = null) {
  let stateCount = 0;
  const transitions = [];
  function newState() {
    const state = stateCount;
    stateCount += 1;
    transitions[state] = [];
    return state;
  }
  function add(from, transition) {
    transitions[from].push(transition);
  }
  function epsilonFragment() {
    const start = newState();
    const end = newState();
    add(start, { type: "epsilon", to: end });
    return { start, end };
  }
  function concat(left, right) {
    add(left.end, { type: "epsilon", to: right.start });
    return { start: left.start, end: right.end };
  }
  function build(node, referenceStack = []) {
    const type = node[0];
    if (type === "literal") {
      const atoms = [...node[1]];
      let fragment = null;
      for (const character of atoms) {
        const start = newState();
        const end = newState();
        add(start, {
          type: "atom",
          to: end,
          atom: atomDescriptor(["literal", character], rule.flags),
        });
        fragment = fragment === null ? { start, end } : concat(fragment, { start, end });
      }
      return fragment;
    }
    if (["charClass", "unicodeProperty", "shorthand"].includes(type)) {
      const start = newState();
      const end = newState();
      add(start, {
        type: "atom",
        to: end,
        atom: atomDescriptor(node, rule.flags),
      });
      return { start, end };
    }
    if (type === "wordBoundary" || type === "startAnchor") {
      const start = newState();
      const end = newState();
      add(start, { type: "assertion", assertion: type, to: end });
      return { start, end };
    }
    if (type === "negativeLookbehind" || type === "negativeLookahead") {
      const start = newState();
      const end = newState();
      add(start, {
        type: "assertion",
        assertion: type,
        operand: atomDescriptor(node[1], rule.flags),
        to: end,
      });
      return { start, end };
    }
    if (type === "group") return build(node[1], referenceStack);
    if (type === "reference") {
      assert.equal(referenceStack.includes(node[1]), false, `recursive NFA ref ${node[1]}`);
      return build(registry.definitions[node[1]], [...referenceStack, node[1]]);
    }
    if (type === "sequence") {
      let result = build(node[1], referenceStack);
      for (const child of node.slice(2)) result = concat(result, build(child, referenceStack));
      return result;
    }
    if (type === "alternation") {
      const start = newState();
      const end = newState();
      for (const child of node.slice(1)) {
        const fragment = build(child, referenceStack);
        add(start, { type: "epsilon", to: fragment.start });
        add(fragment.end, { type: "epsilon", to: end });
      }
      return { start, end };
    }
    assert.equal(type, "repeat");
    const min = node[1];
    const max = node[2];
    let result = epsilonFragment();
    for (let index = 0; index < min; index += 1) {
      result = concat(result, build(node[3], referenceStack));
    }
    if (max === null) {
      const loopEntry = result.end;
      const loopEnd = newState();
      const child = build(node[3], referenceStack);
      add(loopEntry, { type: "epsilon", to: loopEnd });
      add(loopEntry, { type: "epsilon", to: child.start });
      add(child.end, { type: "epsilon", to: loopEntry });
      result.end = loopEnd;
      return result;
    }
    for (let index = min; index < max; index += 1) {
      const optionalStart = result.end;
      const optionalEnd = newState();
      const child = build(node[3], referenceStack);
      add(optionalStart, { type: "epsilon", to: optionalEnd });
      add(optionalStart, { type: "epsilon", to: child.start });
      add(child.end, { type: "epsilon", to: optionalEnd });
      result.end = optionalEnd;
    }
    return result;
  }
  const fragment = build(astOverride ?? rule.ast);
  assert.ok(stateCount <= policy.limits.maximumCompiledAstNodes, `${rule.ruleId} NFA states`);
  const descriptor = transitions.map((edges) =>
    edges.map((edge) => {
      if (edge.type === "atom") {
        return {
          type: edge.type,
          to: edge.to,
          atom: {
            kind: edge.atom.kind,
            source: edge.atom.source,
            flags: edge.atom.flags,
          },
        };
      }
      if (edge.type === "assertion" && edge.operand) {
        return {
          type: edge.type,
          to: edge.to,
          assertion: edge.assertion,
          operand: {
            kind: edge.operand.kind,
            source: edge.operand.source,
            flags: edge.operand.flags,
          },
        };
      }
      return edge;
    }),
  );
  return {
    start: fragment.start,
    accept: fragment.end,
    transitions,
    descriptor,
    flags: rule.flags,
  };
}

function wordCharacter(character, flags) {
  if (character === undefined) return false;
  const expression = new RegExp("^\\w$", flags.includes("i") ? "iu" : "u");
  return expression.test(character);
}

function assertionPasses(edge, characters, index, flags) {
  if (edge.assertion === "startAnchor") return index === 0;
  if (edge.assertion === "wordBoundary") {
    return (
      wordCharacter(characters[index - 1], flags) !==
      wordCharacter(characters[index], flags)
    );
  }
  if (edge.assertion === "negativeLookbehind") {
    return characters[index - 1] === undefined ||
      !edge.operand.matches(characters[index - 1]);
  }
  assert.equal(edge.assertion, "negativeLookahead");
  return characters[index] === undefined || !edge.operand.matches(characters[index]);
}

function runNfa(
  compiled,
  input,
  gapPredicate,
  limits,
  stateLimit = policy.limits.maximumMatcherStatesPerRuleAndInput,
) {
  const characters = [...input];
  let visitedCount = 0;
  for (let startIndex = 0; startIndex <= characters.length; startIndex += 1) {
    const queue = [];
    const seen = new Set();
    function enqueue(configuration) {
      const key = [
        configuration.state,
        configuration.index,
        configuration.lastConsumed ? 1 : 0,
        configuration.gapRun,
        configuration.totalInserted,
      ].join(":");
      if (seen.has(key)) return;
      seen.add(key);
      queue.push(configuration);
      visitedCount += 1;
    }
    enqueue({
      state: compiled.start,
      index: startIndex,
      lastConsumed: false,
      gapRun: 0,
      totalInserted: 0,
    });
    for (let cursor = 0; cursor < queue.length; cursor += 1) {
      if (visitedCount > stateLimit) {
        return { matched: false, stateOverflow: true, visitedCount };
      }
      const current = queue[cursor];
      if (
        current.state === compiled.accept &&
        current.lastConsumed &&
        current.gapRun === 0
      ) {
        return { matched: true, stateOverflow: false, visitedCount };
      }
      for (const edge of compiled.transitions[current.state]) {
        if (edge.type === "epsilon") {
          enqueue({ ...current, state: edge.to });
        } else if (edge.type === "assertion") {
          if (assertionPasses(edge, characters, current.index, compiled.flags)) {
            enqueue({ ...current, state: edge.to });
          }
        } else if (
          current.index < characters.length &&
          edge.atom.matches(characters[current.index])
        ) {
          enqueue({
            state: edge.to,
            index: current.index + 1,
            lastConsumed: true,
            gapRun: 0,
            totalInserted: current.totalInserted,
          });
        }
      }
      if (
        current.lastConsumed &&
        current.index < characters.length &&
        gapPredicate(characters[current.index]) &&
        current.gapRun < limits.maximumCodePointsPerGap &&
        current.totalInserted < limits.maximumInsertedCodePointsPerMatchedCandidate
      ) {
        enqueue({
          ...current,
          index: current.index + 1,
          gapRun: current.gapRun + 1,
          totalInserted: current.totalInserted + 1,
        });
      }
    }
  }
  return { matched: false, stateOverflow: false, visitedCount };
}

function transitionOutcome(compiled, input, gapPredicate, insertion, mutationId = null) {
  const direct = runNfa(
    compiled,
    input,
    () => false,
    {
      maximumCodePointsPerGap: 0,
      maximumInsertedCodePointsPerMatchedCandidate: 0,
    },
  );
  if (direct.stateOverflow) return { direct: "unsupported_value", bounded: "unsupported_value" };
  const directResult = direct.matched ? "match" : "no_match";
  const boundedLimits = {
    maximumCodePointsPerGap: insertion.maximumCodePointsPerGap,
    maximumInsertedCodePointsPerMatchedCandidate:
      mutationId === "disable-total-counter"
        ? [...input].length
        : insertion.maximumInsertedCodePointsPerMatchedCandidate,
  };
  const bounded = runNfa(compiled, input, gapPredicate, boundedLimits);
  if (bounded.stateOverflow) {
    return { direct: directResult, bounded: "unsupported_value" };
  }
  if (bounded.matched) return { direct: directResult, bounded: "match" };
  if (![...input].some((character) => gapPredicate(character))) {
    return { direct: directResult, bounded: "no_match" };
  }
  const relaxed = runNfa(
    compiled,
    input,
    gapPredicate,
    {
      maximumCodePointsPerGap: [...input].length,
      maximumInsertedCodePointsPerMatchedCandidate: [...input].length,
    },
  );
  if (relaxed.stateOverflow || relaxed.matched) {
    return { direct: directResult, bounded: "unsupported_value" };
  }
  return { direct: directResult, bounded: "no_match" };
}

function validateAndCompileRegistry(registry, expectedCount) {
  assert.equal(registry.registryVersion, "2.1.0");
  assert.equal(registry.rules.length, expectedCount);
  assert.deepEqual(registry.astSchema.closedNodeTypes, [...allowedGrammarNodeTypes]);
  assert.deepEqual(
    registry.astSchema.gapSetAstSchema.closedNodeTypes,
    [...allowedGapNodeTypes],
  );
  assert.deepEqual(
    registry.astSchema.gapSetAstSchema.allowedUnicodeProperties,
    [...allowedGapProperties],
  );
  assert.equal(registry.authority.soleGrammarAuthorityWhenSelected, true);
  assert.equal(
    registry.authority.directInsertionAndStructuredRecognizersGeneratedFromThisAstOnly,
    true,
  );
  const ruleIds = new Set();
  const priorities = new Set();
  const regressionIds = new Set();
  const usedGrammarReferences = new Set();
  const usedGapReferences = new Set();
  const directDescriptors = [];
  const transitionDescriptors = [];
  const compiledRules = new Map();
  const commonGapCanonical = [];
  const specialGapCanonical = [];
  for (const rule of registry.rules) {
    const requiredFields = registry.astSchema.ruleSchema.requiredCommonFields;
    const allowedFields = Object.hasOwn(rule, "structuredRecognizerId")
      ? [...requiredFields, "structuredRecognizerId"]
      : requiredFields;
    assertExactKeys(rule, allowedFields, rule.ruleId ?? "rule");
    for (const field of requiredFields) assert.ok(Object.hasOwn(rule, field));
    nonempty(rule.ruleId, "ruleId");
    nonempty(rule.regressionEvidenceId, `${rule.ruleId} regressionEvidenceId`);
    assert.equal(ruleIds.has(rule.ruleId), false, `duplicate rule ${rule.ruleId}`);
    assert.equal(priorities.has(rule.priority), false, `duplicate priority ${rule.priority}`);
    assert.equal(
      regressionIds.has(rule.regressionEvidenceId),
      false,
      `duplicate regression ID ${rule.regressionEvidenceId}`,
    );
    ruleIds.add(rule.ruleId);
    priorities.add(rule.priority);
    regressionIds.add(rule.regressionEvidenceId);
    assert.ok(policy.resultDomain.protectedMatch.categorySet.includes(rule.category));
    assert.ok(["key", "value", "both"].includes(rule.targetDomain));
    assert.ok(["lexical", "prefix", "structured"].includes(rule.kind));
    if (rule.kind === "structured") nonempty(rule.structuredRecognizerId, rule.ruleId);
    else if (Object.hasOwn(rule, "structuredRecognizerId")) {
      assert.equal(rule.structuredRecognizerId, null, `${rule.ruleId} recognizer metadata`);
    }
    assert.ok(["i", "u", "iu"].includes(rule.flags));
    const grammarState = {
      nodeCount: 0,
      usedReferences: new Set(),
      referenceStack: [],
    };
    const directSource = compileAstSource(rule.ast, registry, grammarState);
    for (const reference of grammarState.usedReferences) {
      usedGrammarReferences.add(reference);
    }
    new RegExp(directSource, rule.flags);
    const insertionKeys = [
      "mode",
      "gapPolicyId",
      "gapSetAst",
      "minimumCodePointsPerGap",
      "maximumCodePointsPerGap",
      "maximumInsertedCodePointsPerMatchedCandidate",
      "leadingGapAllowed",
      "trailingGapAllowed",
      "eligibleGapDefinition",
      "forbiddenPositions",
    ];
    assertExactKeys(rule.insertion, insertionKeys, `${rule.ruleId} insertion`);
    assert.equal(rule.insertion.leadingGapAllowed, false);
    assert.equal(rule.insertion.trailingGapAllowed, false);
    const gapState = {
      nodeCount: 0,
      usedProperties: new Set(),
      usedReferences: new Set(),
      referenceStack: [],
    };
    validateGapAst(rule.insertion.gapSetAst, registry, gapState, `${rule.ruleId}/gap`);
    for (const reference of gapState.usedReferences) usedGapReferences.add(reference);
    if (rule.targetDomain === "key") {
      assert.equal(rule.insertion.mode, "projection-equivalent-no-extra-gap");
      assert.deepEqual(rule.insertion.gapSetAst, ["emptySet"]);
      assert.equal(rule.insertion.minimumCodePointsPerGap, 0);
      assert.equal(rule.insertion.maximumCodePointsPerGap, 0);
      assert.equal(rule.insertion.maximumInsertedCodePointsPerMatchedCandidate, 0);
    } else {
      assert.equal(rule.insertion.mode, "grammar-adjacency-rule-specific-v2");
      assert.equal(rule.insertion.minimumCodePointsPerGap, 0);
      assert.equal(rule.insertion.maximumCodePointsPerGap, 4);
      assert.equal(rule.insertion.maximumInsertedCodePointsPerMatchedCandidate, 64);
    }
    if (
      rule.ruleId === "value.provider-selected-model-prefix.v1" ||
      rule.ruleId === "value.provider-selected-name.lexical.v2_1"
    ) {
      assert.equal(
        rule.insertion.gapPolicyId,
        "deepseek-default-ignorable-mark-lf-gap-v1",
      );
      specialGapCanonical.push(canonicalize(rule.insertion.gapSetAst));
    } else if (rule.targetDomain !== "key") {
      assert.equal(
        rule.insertion.gapPolicyId,
        "full-obfuscation-property-union-gap-v1",
      );
      commonGapCanonical.push(canonicalize(rule.insertion.gapSetAst));
    }
    const nfa = buildNfa(rule, registry);
    compiledRules.set(rule.ruleId, {
      rule,
      directSource,
      directRegex: new RegExp(directSource, rule.flags),
      nfa,
    });
    directDescriptors.push({
      ruleId: rule.ruleId,
      flags: rule.flags,
      source: directSource,
    });
    transitionDescriptors.push({
      ruleId: rule.ruleId,
      grammar: nfa.descriptor,
      insertion: rule.insertion,
    });
  }
  assert.deepEqual(
    [...priorities].sort((left, right) => left - right),
    Array.from({ length: expectedCount }, (_, index) => index + 1),
  );
  assert.deepEqual(
    [...usedGrammarReferences].sort(),
    Object.keys(registry.definitions).sort(),
  );
  assert.deepEqual(
    [...usedGapReferences].sort(),
    Object.keys(registry.gapSetDefinitions).sort(),
  );
  assert.equal(new Set(commonGapCanonical).size, 1, "common gap AST identity");
  if (expectedCount === 32) {
    assert.equal(specialGapCanonical.length, 2);
    assert.equal(new Set(specialGapCanonical).size, 1, "DeepSeek gap AST identity");
    assert.notEqual(specialGapCanonical[0], commonGapCanonical[0]);
  } else {
    assert.equal(specialGapCanonical.length, 0);
  }
  const structured = registry.rules.filter((rule) => rule.kind === "structured");
  assert.equal(structured.length, 9);
  assert.deepEqual(
    structured.map((rule) => rule.structuredRecognizerId),
    registry.structuredRecognizerIds,
  );
  return {
    compiledRules,
    directHash: sha256Bytes(canonicalize(directDescriptors)),
    transitionHash: sha256Bytes(canonicalize(transitionDescriptors)),
    commonGapAst: JSON.parse(commonGapCanonical[0]),
    specialGapAst:
      specialGapCanonical.length === 0 ? null : JSON.parse(specialGapCanonical[0]),
  };
}

const includeCompiled = validateAndCompileRegistry(includeRegistry, 32);
const excludeCompiled = validateAndCompileRegistry(excludeRegistry, 30);
pass(
  `M02 closed registries include=32/direct:${includeCompiled.directHash}/transition:${includeCompiled.transitionHash}; exclude=30/direct:${excludeCompiled.directHash}/transition:${excludeCompiled.transitionHash}; structured=9 each`,
);

const includeOption = policy.grammarSelection.candidateOptions.find(
  (option) => option.optionId === "M02-D1-INCLUDE",
);
const excludeOption = policy.grammarSelection.candidateOptions.find(
  (option) => option.optionId === "M02-D1-EXCLUDE",
);
assert.equal(sha256File(resolve(here, includeOption.path)), includeOption.sha256);
assert.equal(sha256File(resolve(here, excludeOption.path)), excludeOption.sha256);
assert.equal(decision.ownerSelection, null);
assert.equal(decision.recommendation, "M02-D1-INCLUDE");
assert.equal(decision.commonAuthorityProfile.profileId, policy.profileId);
assert.equal(decision.commonAuthorityProfile.profileVersion, policy.profileVersion);
assert.equal(
  sha256File(resolve(here, decision.commonAuthorityProfile.path)),
  decision.commonAuthorityProfile.sha256,
);
assert.equal(decision.mandatoryCorpus.corpusId, corpus.corpusId);
assert.equal(decision.mandatoryCorpus.corpusVersion, corpus.corpusVersion);
assert.equal(
  sha256File(resolve(here, decision.mandatoryCorpus.path)),
  decision.mandatoryCorpus.sha256,
);
assert.equal(decision.options[0].registry.sha256, includeOption.sha256);
assert.equal(decision.options[1].registry.sha256, excludeOption.sha256);
assert.match(decision.options[0].adrDisposition, /^no security-exception ADR/u);
assert.match(decision.options[1].adrDisposition, /mandatory/u);
assert.equal(policy.authority.ownerApproved, false);
assert.equal(policy.authority.implementationAuthorized, false);

const includeByRegression = new Map(
  includeRegistry.rules
    .filter((rule) => !rule.regressionEvidenceId.startsWith("none:"))
    .map((rule) => [rule.regressionEvidenceId, rule]),
);
for (const excludeRule of excludeRegistry.rules) {
  const includeRule = includeByRegression.get(excludeRule.regressionEvidenceId);
  assert.ok(includeRule, `missing common INCLUDE rule ${excludeRule.regressionEvidenceId}`);
  const includeComparable = clone(includeRule);
  const excludeComparable = clone(excludeRule);
  delete includeComparable.priority;
  delete excludeComparable.priority;
  assert.deepEqual(
    includeComparable,
    excludeComparable,
    `common semantic delta ${excludeRule.regressionEvidenceId}`,
  );
  assert.equal(
    includeRule.priority,
    excludeRule.priority + (excludeRule.priority > 26 ? 2 : 0),
    `priority delta ${excludeRule.regressionEvidenceId}`,
  );
}
const extraIncludeRules = includeRegistry.rules.filter((rule) =>
  rule.regressionEvidenceId.startsWith("none:"),
);
assert.deepEqual(
  extraIncludeRules.map((rule) => rule.ruleId),
  [
    "value.provider-selected-model-prefix.v1",
    "value.provider-selected-name.lexical.v2_1",
  ],
);
assert.deepEqual(extraIncludeRules[0].insertion, extraIncludeRules[1].insertion);
pass("INCLUDE/EXCLUDE common rules are identical; exact delta is two DeepSeek-only rules and later priority shift");

const invalidControlPredicate = compileGapPredicate(
  ["reference", "invalid-control-set-v1"],
  includeRegistry,
);
assert.deepEqual(
  includeRegistry.gapSetDefinitions,
  excludeRegistry.gapSetDefinitions,
  "invalid-control authority differs",
);

class UnsupportedValueError extends Error {
  constructor(reason) {
    super(`unsupported_value:${reason}`);
    this.reason = reason;
  }
}

function preflight(value) {
  const seen = new WeakSet();
  let nodes = 0;
  let rawBytes = 0;
  let normalizedBytes = 0;
  function visit(current, depth) {
    if (depth > policy.limits.maximumDepth) {
      throw new UnsupportedValueError("maximumDepth");
    }
    nodes += 1;
    if (nodes > policy.limits.maximumVisitedNodes) {
      throw new UnsupportedValueError("maximumVisitedNodes");
    }
    if (current === null || typeof current === "boolean") return;
    if (typeof current === "number") {
      if (!Number.isFinite(current)) throw new UnsupportedValueError("nonFiniteNumber");
      return;
    }
    if (typeof current === "string") {
      const scalars = [...current];
      if (scalars.length > policy.limits.maximumUnicodeScalarsPerStringOrKey) {
        throw new UnsupportedValueError("maximumUnicodeScalarsPerStringOrKey");
      }
      for (let index = 0; index < current.length; index += 1) {
        const code = current.charCodeAt(index);
        if (code >= 0xd800 && code <= 0xdbff) {
          const next = current.charCodeAt(index + 1);
          if (!(next >= 0xdc00 && next <= 0xdfff)) {
            throw new UnsupportedValueError("loneSurrogate");
          }
          index += 1;
        } else if (code >= 0xdc00 && code <= 0xdfff) {
          throw new UnsupportedValueError("loneSurrogate");
        }
      }
      rawBytes += Buffer.byteLength(current);
      normalizedBytes += Buffer.byteLength(current.normalize("NFKC"));
      if (rawBytes > policy.limits.maximumRawUtf8Bytes) {
        throw new UnsupportedValueError("maximumRawUtf8Bytes");
      }
      if (normalizedBytes > policy.limits.maximumNfkcUtf8Bytes) {
        throw new UnsupportedValueError("maximumNfkcUtf8Bytes");
      }
      return;
    }
    if (typeof current !== "object") {
      throw new UnsupportedValueError("unsupportedPrimitive");
    }
    if (seen.has(current)) throw new UnsupportedValueError("repeatedIdentity");
    seen.add(current);
    if (Array.isArray(current)) {
      const names = Object.getOwnPropertyNames(current);
      const expectedNames = [
        ...Array.from({ length: current.length }, (_, index) => String(index)),
        "length",
      ];
      if (
        names.length !== expectedNames.length ||
        expectedNames.some((name) => !names.includes(name))
      ) {
        throw new UnsupportedValueError("sparseOrExtendedArray");
      }
      if (Object.getOwnPropertySymbols(current).length > 0) {
        throw new UnsupportedValueError("symbolKey");
      }
      for (const item of current) visit(item, depth + 1);
      return;
    }
    const prototype = Object.getPrototypeOf(current);
    if (prototype !== Object.prototype && prototype !== null) {
      throw new UnsupportedValueError("nonPlainPrototype");
    }
    if (Object.getOwnPropertySymbols(current).length > 0) {
      throw new UnsupportedValueError("symbolKey");
    }
    const descriptors = Object.getOwnPropertyDescriptors(current);
    for (const [key, descriptor] of Object.entries(descriptors)) {
      if (!descriptor.enumerable || !Object.hasOwn(descriptor, "value")) {
        throw new UnsupportedValueError("nonEnumerableOrAccessor");
      }
      visit(key, depth + 1);
      visit(descriptor.value, depth + 1);
    }
  }
  visit(value, 0);
  return { nodes, rawBytes, normalizedBytes };
}

function gapPredicateForRule(rule, registry, compiledRegistry, mutationId) {
  if (mutationId === "legacy-three-character-gap-shortcut") {
    return (character) =>
      character === "\n" || character === "\u034f" || character === "\u200b";
  }
  const gapAst =
    mutationId === "global-full-gap-on-deepseek" &&
    (rule.ruleId === "value.provider-selected-model-prefix.v1" ||
      rule.ruleId === "value.provider-selected-name.lexical.v2_1")
      ? compiledRegistry.commonGapAst
      : rule.insertion.gapSetAst;
  return compileGapPredicate(gapAst, registry, mutationId);
}

function classifyString(input, targetDomain, registry, compiledRegistry, mutationId = null) {
  try {
    preflight(input);
  } catch (error) {
    assert.ok(error instanceof UnsupportedValueError);
    return "unsupported_value";
  }
  const normalized =
    targetDomain === "key"
      ? input.normalize("NFKC").replace(/[^a-z0-9_]/giu, "")
      : input.normalize("NFKC");
  if ([...normalized].some((character) => invalidControlPredicate(character))) {
    return "invalid_control";
  }
  for (const rule of [...registry.rules].sort((left, right) => left.priority - right.priority)) {
    if (!(rule.targetDomain === targetDomain || rule.targetDomain === "both")) continue;
    const compiled = compiledRegistry.compiledRules.get(rule.ruleId);
    const directRegexResult = compiled.directRegex.test(normalized);
    const gapPredicate = gapPredicateForRule(
      rule,
      registry,
      compiledRegistry,
      mutationId,
    );
    const transition = transitionOutcome(
      compiled.nfa,
      normalized,
      gapPredicate,
      rule.insertion,
      mutationId,
    );
    assert.equal(
      transition.direct === "match",
      directRegexResult,
      `${rule.ruleId} direct regex/NFA agreement for ${JSON.stringify(input)}`,
    );
    if (transition.bounded === "match") return rule.category;
    if (transition.bounded === "unsupported_value") return "unsupported_value";
  }
  return "allow";
}

const fullGapPredicate = compileGapPredicate(
  includeCompiled.commonGapAst,
  includeRegistry,
);
const deepseekGapPredicate = compileGapPredicate(
  includeCompiled.specialGapAst,
  includeRegistry,
);
for (const witness of corpus.propertyWitnessCases) {
  assert.equal(fullGapPredicate(witness.scalar), witness.fullGap, `${witness.id} full`);
  assert.equal(
    deepseekGapPredicate(witness.scalar),
    witness.deepseekGap,
    `${witness.id} DeepSeek`,
  );
  if (allowedGapProperties.has(witness.property)) {
    assert.equal(
      new RegExp(`^\\p{${witness.property}}$`, "u").test(witness.scalar),
      true,
      `${witness.id} declared property witness`,
    );
  }
}
pass("all five declared Unicode properties, explicit LF and invalid-control subtraction execute under the fixed runtime");

const caseById = new Map(corpus.cases.map((testCase) => [testCase.id, testCase]));
const originalCaseHashes = new Map();
for (const testCase of corpus.cases) {
  const targetDomain = testCase.targetDomain ?? "value";
  const originalHash = sha256Bytes(Buffer.from(testCase.input));
  originalCaseHashes.set(testCase.id, originalHash);
  assert.equal(
    classifyString(
      testCase.input,
      targetDomain,
      includeRegistry,
      includeCompiled,
    ),
    testCase.include,
    `${testCase.id} INCLUDE`,
  );
  assert.equal(
    classifyString(
      testCase.input,
      targetDomain,
      excludeRegistry,
      excludeCompiled,
    ),
    testCase.exclude,
    `${testCase.id} EXCLUDE`,
  );
  assert.equal(
    sha256Bytes(Buffer.from(testCase.input)),
    originalHash,
    `${testCase.id} persisted bytes`,
  );
}
pass(
  `M02 full transition-language corpus ${corpus.cases.length}/${corpus.cases.length} for both Owner options with persisted-byte identity`,
);

for (const testCase of corpus.compilerConformanceCases) {
  const source = includeCompiled.compiledRules.get(testCase.sourceRuleId);
  assert.ok(source, `${testCase.id} source rule`);
  const syntheticRule = {
    ...source.rule,
    ruleId: `compiler-probe.${testCase.id}`,
    ast: testCase.ast,
  };
  const grammarState = {
    nodeCount: 0,
    usedReferences: new Set(),
    referenceStack: [],
  };
  compileAstSource(syntheticRule.ast, includeRegistry, grammarState);
  const nfa = buildNfa(syntheticRule, includeRegistry, syntheticRule.ast);
  const predicate = compileGapPredicate(
    syntheticRule.insertion.gapSetAst,
    includeRegistry,
  );
  const beforeHash = sha256Bytes(Buffer.from(testCase.input));
  const transition = transitionOutcome(
    nfa,
    testCase.input,
    predicate,
    syntheticRule.insertion,
  );
  assert.equal(transition.direct, testCase.direct, `${testCase.id} direct`);
  assert.equal(
    transition.bounded,
    testCase.boundedInsertion,
    `${testCase.id} bounded`,
  );
  assert.equal(sha256Bytes(Buffer.from(testCase.input)), beforeHash, `${testCase.id} bytes`);
}
pass("transition compiler limits: direct zero-gap, per-gap 4/5 and total 64/65");

for (const mutation of corpus.mutationNegativeCases) {
  if (mutation.mutationId === "disable-total-counter") {
    for (const caseId of mutation.mustBeKilledByCompilerCaseIds) {
      const testCase = corpus.compilerConformanceCases.find((entry) => entry.id === caseId);
      assert.ok(testCase);
      const source = includeCompiled.compiledRules.get(testCase.sourceRuleId);
      const syntheticRule = {
        ...source.rule,
        ruleId: `mutation-probe.${caseId}`,
        ast: testCase.ast,
      };
      const nfa = buildNfa(syntheticRule, includeRegistry, syntheticRule.ast);
      const predicate = compileGapPredicate(
        syntheticRule.insertion.gapSetAst,
        includeRegistry,
      );
      const mutated = transitionOutcome(
        nfa,
        testCase.input,
        predicate,
        syntheticRule.insertion,
        mutation.mutationId,
      );
      assert.notEqual(mutated.bounded, testCase.boundedInsertion, mutation.mutationId);
    }
    continue;
  }
  for (const caseId of mutation.mustBeKilledByCaseIds) {
    const testCase = caseById.get(caseId);
    assert.ok(testCase, `${mutation.mutationId} case ${caseId}`);
    const mutated = classifyString(
      testCase.input,
      testCase.targetDomain ?? "value",
      includeRegistry,
      includeCompiled,
      mutation.mutationId,
    );
    assert.notEqual(mutated, testCase.include, `${mutation.mutationId} survived ${caseId}`);
    assert.equal(
      sha256Bytes(Buffer.from(testCase.input)),
      originalCaseHashes.get(caseId),
      `${mutation.mutationId} bytes ${caseId}`,
    );
  }
}
pass(
  `mutation negatives ${corpus.mutationNegativeCases.length}/${corpus.mutationNegativeCases.length}, including legacy three-character shortcut`,
);

let deepValue = null;
for (let index = 0; index < 17; index += 1) deepValue = [deepValue];
assert.throws(
  () => preflight(deepValue),
  (error) => error instanceof UnsupportedValueError && error.reason === "maximumDepth",
);
assert.throws(
  () => preflight(Array.from({ length: 4096 }, () => null)),
  (error) =>
    error instanceof UnsupportedValueError && error.reason === "maximumVisitedNodes",
);
const rawOverflow = `${"😀".repeat(32768)}a`;
assert.equal(Buffer.byteLength(rawOverflow), 131073);
assert.throws(
  () => preflight(rawOverflow),
  (error) =>
    error instanceof UnsupportedValueError && error.reason === "maximumRawUtf8Bytes",
);
const nfkcOverflow = `${"\ufdfa".repeat(3971)}${"a".repeat(30)}`;
assert.ok(Buffer.byteLength(nfkcOverflow) < 131072);
assert.equal(Buffer.byteLength(nfkcOverflow.normalize("NFKC")), 131073);
assert.throws(
  () => preflight(nfkcOverflow),
  (error) =>
    error instanceof UnsupportedValueError && error.reason === "maximumNfkcUtf8Bytes",
);
assert.throws(
  () => preflight("a".repeat(65537)),
  (error) =>
    error instanceof UnsupportedValueError &&
    error.reason === "maximumUnicodeScalarsPerStringOrKey",
);
assert.throws(
  () => preflight("\ud800"),
  (error) => error instanceof UnsupportedValueError && error.reason === "loneSurrogate",
);
const cycle = {};
cycle.self = cycle;
assert.throws(
  () => preflight(cycle),
  (error) =>
    error instanceof UnsupportedValueError && error.reason === "repeatedIdentity",
);
const repeated = {};
assert.throws(
  () => preflight([repeated, repeated]),
  (error) =>
    error instanceof UnsupportedValueError && error.reason === "repeatedIdentity",
);
pass("structural preflight exact depth/node/raw-byte/NFKC-byte/scalar/surrogate/identity limits");

assert.equal(m03Graph.profileVersion, "2.0.0");
assert.equal(m03Graph.authority.ownerApproved, false);
assert.equal(m03Graph.authority.implementationAuthorized, false);
assert.equal(m03Graph.classificationModel.rootClasses.length, 12);
const phaseBRoot = m03Graph.outerCompositionRoots.find(
  (root) => root.rootId === "phase-b-composition-v1",
);
const phaseDRoot = m03Graph.outerCompositionRoots.find(
  (root) => root.rootId === "phase-d-provider-composition-v1",
);
assert.equal(phaseBRoot.exactAllowedImports.length, 5);
assert.deepEqual(phaseBRoot.typeSafetyCounts.explicitDriverCases, [
  "pglite",
  "postgres",
]);
assert.equal(phaseBRoot.typeSafetyCounts.protectedFactoryCallSites, 2);
assert.equal(phaseBRoot.typeSafetyCounts.protectedFactoryRuntimeCallsPerInvocation, 1);
assert.equal(phaseBRoot.typeSafetyCounts.connectionWrappersCrossing, 0);
assert.equal(phaseBRoot.typeSafetyCounts.discriminatorsCrossing, 0);
assert.equal(phaseDRoot.phaseBPresence.maximumFiles, 0);
assert.equal(m03Graph.adapterZone.phaseBExpectedPresence.maximumFiles, 0);
assert.equal(existsSync(resolve(repositoryRoot, phaseDRoot.path)), false);
assert.equal(existsSync(resolve(repositoryRoot, m03Graph.adapterZone.path)), false);
for (const [path, expectedHash] of Object.entries(
  fixed.m03NonRegression.artifacts,
)) {
  assert.equal(sha256RepositoryFile(path), expectedHash, `M03 ${path}`);
}

function runTypeProbe(configPath) {
  const tsc = resolve(repositoryRoot, "node_modules/.bin/tsc");
  assert.equal(existsSync(tsc), true, "local TypeScript missing");
  const result = run(tsc, ["-p", resolve(repositoryRoot, configPath)]);
  return {
    status: result.status,
    diagnostics: `${result.stdout}${result.stderr}`,
  };
}

const m03Positive = runTypeProbe(`${v10EvidencePath}/tsconfig.m03-positive.json`);
assert.equal(m03Positive.status, 0, m03Positive.diagnostics);
assert.equal(m03Positive.diagnostics, "");
const m03Union = runTypeProbe(`${v10EvidencePath}/tsconfig.m03-union-negative.json`);
assert.equal(m03Union.status, 2);
assert.match(m03Union.diagnostics, /error TS2375/u);
assert.match(m03Union.diagnostics, /PgliteAppDatabase \| PostgresAppDatabase/u);
const m03Swap = runTypeProbe(
  `${v10EvidencePath}/tsconfig.m03-driver-swap-negative.json`,
);
assert.equal(m03Swap.status, 2);
assert.match(m03Swap.diagnostics, /error TS2375/u);
assert.match(m03Swap.diagnostics, /PostgresJsQueryResultHKT/u);
const reviewerPositive = runTypeProbe(
  `${independentEvidencePath}/tsconfig.reviewer-m03-positive.json`,
);
assert.equal(reviewerPositive.status, 0, reviewerPositive.diagnostics);
assert.equal(reviewerPositive.diagnostics, "");
pass("M03 non-regression: graph/root/absence unchanged; three author type probes plus reviewer positive retain exact results");

const reportPaths = [
  "docs/PHASE_1B_STAGE4A_PHASE_B_THREE_STRIKE_TECHNICAL_ESCALATION_V1_1.md",
  "docs/PHASE_1B_STAGE4A_PHASE_B_THREE_STRIKE_TECHNICAL_ESCALATION_OWNER_DECISION_PACKAGE_V1_1.md",
  `${remediationEvidencePath}/README.md`,
];
for (const reportPath of reportPaths) {
  assert.equal(existsSync(resolve(repositoryRoot, reportPath)), true, reportPath);
  const source = readText(reportPath);
  for (const match of source.matchAll(/\[[^\]]*\]\(([^)]+)\)/gu)) {
    const target = match[1];
    if (
      target.startsWith("#") ||
      target.startsWith("http://") ||
      target.startsWith("https://") ||
      target.startsWith("mailto:")
    ) {
      continue;
    }
    const withoutAnchor = target.split("#")[0];
    if (withoutAnchor.length === 0) continue;
    assert.equal(
      existsSync(resolve(dirname(resolve(repositoryRoot, reportPath)), withoutAnchor)),
      true,
      `broken link ${reportPath} -> ${target}`,
    );
  }
  assert.equal(source.endsWith("\n"), true, `${reportPath} final LF`);
}
pass("V1.1 report, Owner package and remediation index links/final LF");

const committedPaths = git([
  "diff",
  "--name-only",
  `${fixed.git.remediationParent}...HEAD`,
])
  .split("\n")
  .filter(Boolean);
const workingTrackedPaths = git(["diff", "--name-only"])
  .split("\n")
  .filter(Boolean);
const untrackedPaths = git(["ls-files", "--others", "--exclude-standard"])
  .split("\n")
  .filter(Boolean);
const allChangedPaths = [
  ...new Set([...committedPaths, ...workingTrackedPaths, ...untrackedPaths]),
];
assert.ok(allChangedPaths.length > 0);
for (const path of allChangedPaths) {
  const allowed =
    path ===
      "docs/PHASE_1B_STAGE4A_PHASE_B_THREE_STRIKE_TECHNICAL_ESCALATION_INDEPENDENT_REVIEW_V1_0.md" ||
    path === reportPaths[0] ||
    path === reportPaths[1] ||
    path.startsWith(`${independentEvidencePath}/`) ||
    path.startsWith(`${remediationEvidencePath}/`);
  assert.equal(allowed, true, `out-of-scope path ${path}`);
}
pass(`scope guard ${allChangedPaths.length} paths; only imported FAIL and new V1.1 docs/evidence`);

const ownedWhitespaceCheck = run("git", [
  "diff",
  "--check",
  `${fixed.git.remediationParent}...HEAD`,
  "--",
  reportPaths[0],
  reportPaths[1],
  remediationEvidencePath,
]);
assert.equal(
  ownedWhitespaceCheck.status,
  0,
  `V1.1-owned whitespace failure: ${ownedWhitespaceCheck.stdout}${ownedWhitespaceCheck.stderr}`,
);
pass("strict whitespace check for V1.1-owned artifacts; byte-identical reviewer hard breaks preserved by hash");

if (captureMode) {
  pass("capture mode: remediation manifest and final clean-state checks deferred");
} else {
  const manifestPath = resolve(here, "SHA256SUMS.txt");
  assert.equal(existsSync(manifestPath), true, "remediation manifest missing");
  const entries = verifyManifest(manifestPath, 22);
  for (const entry of entries) {
    assert.notEqual(entry.path, `${remediationEvidencePath}/SHA256SUMS.txt`);
  }
  pass(`V1.1 SHA-256 manifest ${entries.length}/${entries.length}`);
  assert.equal(git(["status", "--porcelain"]), "", "worktree not clean");
  pass("final worktree clean");
}

output.push("SUMMARY TECHNICAL_ESCALATION_REMEDIATION_V1_1=PASS TECH_M01=CORRECTED_CANDIDATE M03=NON_REGRESSION_PASS");
process.stdout.write(`${output.join("\n")}\n`);
