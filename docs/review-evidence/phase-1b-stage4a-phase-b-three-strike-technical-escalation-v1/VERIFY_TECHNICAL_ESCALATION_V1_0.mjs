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

function readJsonAt(path) {
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

function nonempty(value, label) {
  assert.equal(typeof value, "string", `${label} must be a string`);
  assert.ok(value.length > 0, `${label} must be nonempty`);
}

const evidencePath =
  "docs/review-evidence/phase-1b-stage4a-phase-b-three-strike-technical-escalation-v1";
const fixed = readEvidenceJson("FIXED_INPUTS_V1_0.json");
const policy = readEvidenceJson("M02_PROTECTED_DATA_AUTHORITY_PROFILE_V2_0.json");
const decision = readEvidenceJson("M02_DEEPSEEK_OWNER_DECISION_PROFILE_V1_0.json");
const corpus = readEvidenceJson("M02_FALSE_POSITIVE_AND_SECURITY_CORPUS_V1_0.json");
const includeRegistry = readEvidenceJson(
  "M02_GRAMMAR_REGISTRY_INCLUDE_DEEPSEEK_V2_0.json",
);
const excludeRegistry = readEvidenceJson(
  "M02_GRAMMAR_REGISTRY_EXCLUDE_DEEPSEEK_V2_0.json",
);
const graph = readEvidenceJson(
  "M03_CAPABILITY_GRAPH_AND_DATABASE_SEAM_PROFILE_V2_0.json",
);

for (const field of ["node", "v8", "icu", "unicode", "cldr"]) {
  assert.equal(process.versions[field], fixed.runtimeTuple[field], `runtime ${field}`);
}
assert.equal(process.platform, fixed.runtimeTuple.platform, "runtime platform");
assert.equal(process.arch, fixed.runtimeTuple.arch, "runtime architecture");
const typescriptPackage = readJsonAt("node_modules/typescript/package.json");
assert.equal(typescriptPackage.version, fixed.runtimeTuple.typescript);
pass(
  `runtime Node ${process.versions.node}; V8 ${process.versions.v8}; ICU ${process.versions.icu}; Unicode ${process.versions.unicode}; CLDR ${process.versions.cldr}; ${process.platform}/${process.arch}; TypeScript ${typescriptPackage.version}`,
);

assert.equal(git(["rev-parse", fixed.acceptedDesign.ref]), fixed.acceptedDesign.commit);
assert.equal(
  git(["rev-parse", `refs/tags/${fixed.frozenBaseline.tag}`]),
  fixed.frozenBaseline.tagObject,
);
assert.equal(
  git(["rev-parse", `refs/tags/${fixed.frozenBaseline.tag}^{}`]),
  fixed.frozenBaseline.peeledCommit,
);
assert.equal(
  git(["rev-parse", fixed.diagnosticV12Candidate.ref]),
  fixed.diagnosticV12Candidate.commit,
);
assert.equal(
  git(["merge-base", "HEAD", fixed.technicalEscalation.startCommit]),
  fixed.technicalEscalation.startCommit,
);
const diagnosticAncestor = run("git", [
  "merge-base",
  "--is-ancestor",
  fixed.diagnosticV12Candidate.commit,
  "HEAD",
]);
assert.equal(diagnosticAncestor.status, 1, "diagnostic Candidate must not be an ancestor");
for (const commit of fixed.failedImplementationEvidenceOnly) {
  assert.equal(git(["cat-file", "-t", commit]), "commit");
}
assert.equal(git(["cat-file", "-t", fixed.technicalEscalation.firstRollbackCheckpoint]), "commit");
pass("fixed Git refs, frozen tag, clean restart ancestry, diagnostic isolation and failed-ref identities");

for (const [path, expectedHash] of Object.entries(fixed.authorityFiles)) {
  assert.equal(sha256RepositoryFile(path), expectedHash, path);
}
for (const [path, expectedHash] of Object.entries(fixed.typeBoundaryFiles)) {
  assert.equal(sha256RepositoryFile(path), expectedHash, path);
}
assert.equal(
  sha256RepositoryFile(fixed.acceptedDesign.file),
  fixed.acceptedDesign.sha256,
);
pass("authority, accepted Design, database type boundary, package and lock hashes");

assert.equal(
  git(["-C", fixed.pausedFreshReviewV11.worktree, "rev-parse", "HEAD"]),
  fixed.pausedFreshReviewV11.trackedHead,
);
for (const artifact of fixed.pausedFreshReviewV11.artifacts) {
  const path = resolve(fixed.pausedFreshReviewV11.worktree, artifact.path);
  assert.equal(sha256File(path), artifact.sha256, `paused ${artifact.role}`);
}
pass("paused Fresh Review V1.1 report/evidence/manifest hashes (read-only)");

const allowedAstNodeTypes = new Set([
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
        `${label} unsupported class escape`,
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
  assert.equal(new Set(atoms).size, atoms.length, `${label} duplicate class atom`);
}

function literalSource(value) {
  return [...value]
    .map((character) =>
      /[\\^$.*+?()[\]{}|/]/u.test(character) ? `\\${character}` : character,
    )
    .join("");
}

function compileAst(node, registry, state, path = "$") {
  assert.ok(Array.isArray(node) && node.length > 0, `${path} AST node`);
  const type = node[0];
  assert.ok(allowedAstNodeTypes.has(type), `${path} unsupported AST node ${type}`);
  state.nodeCount += 1;
  assert.ok(
    state.nodeCount <= policy.limits.maximumCompiledAstNodes,
    "compiled AST node limit",
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
    assert.equal(node[1], "N", `${path} Unicode property`);
    return `\\p{${node[1]}}`;
  }
  if (type === "shorthand") {
    assert.equal(node.length, 2, `${path} shorthand arity`);
    assert.ok(["d", "s"].includes(node[1]), `${path} shorthand`);
    return `\\${node[1]}`;
  }
  if (type === "wordBoundary") {
    assert.equal(node.length, 1, `${path} word boundary arity`);
    return "\\b";
  }
  if (type === "startAnchor") {
    assert.equal(node.length, 1, `${path} start anchor arity`);
    return "^";
  }
  if (type === "sequence" || type === "alternation") {
    assert.ok(node.length >= 3, `${path} ${type} arity`);
    return node
      .slice(1)
      .map((child, index) => compileAst(child, registry, state, `${path}/${index}`))
      .join(type === "sequence" ? "" : "|");
  }
  if (type === "group") {
    assert.equal(node.length, 2, `${path} group arity`);
    return `(?:${compileAst(node[1], registry, state, `${path}/group`)})`;
  }
  if (type === "reference") {
    assert.equal(node.length, 2, `${path} reference arity`);
    nonempty(node[1], `${path} reference`);
    assert.ok(Object.hasOwn(registry.definitions, node[1]), `${path} missing reference`);
    assert.equal(state.referenceStack.includes(node[1]), false, `${path} recursive reference`);
    state.usedReferences.add(node[1]);
    state.referenceStack.push(node[1]);
    const compiled = compileAst(
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
    const compiled = compileAst(child, registry, state, `${path}/repeat`);
    const childType = child[0];
    const singleLiteral = childType === "literal" && [...child[1]].length === 1;
    const atomic =
      ["charClass", "unicodeProperty", "shorthand", "reference", "group"].includes(
        childType,
      ) || singleLiteral;
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
  const compiled = compileAst(node[1], registry, state, `${path}/look`);
  return type === "negativeLookbehind" ? `(?<!${compiled})` : `(?!${compiled})`;
}

function deriveInsertionIr(node, registry, referenceStack = []) {
  const type = node[0];
  if (type === "literal") {
    const atoms = [...node[1]].map((value) => ["atom-literal-code-point", value]);
    return atoms.length === 1 ? atoms[0] : ["gap-concatenation", ...atoms];
  }
  if (type === "charClass") return ["atom-character-class", node[1]];
  if (type === "unicodeProperty") return ["atom-unicode-property", node[1]];
  if (type === "shorthand") return ["atom-shorthand", node[1]];
  if (type === "wordBoundary") return ["assertion-word-boundary"];
  if (type === "startAnchor") return ["assertion-start"];
  if (type === "negativeLookbehind" || type === "negativeLookahead") {
    return [`assertion-${type}`, deriveInsertionIr(node[1], registry, referenceStack)];
  }
  if (type === "sequence") {
    return [
      "gap-concatenation",
      ...node.slice(1).map((child) => deriveInsertionIr(child, registry, referenceStack)),
    ];
  }
  if (type === "alternation") {
    return [
      "alternation",
      ...node.slice(1).map((child) => deriveInsertionIr(child, registry, referenceStack)),
    ];
  }
  if (type === "group") return ["group", deriveInsertionIr(node[1], registry, referenceStack)];
  if (type === "repeat") {
    return [
      "repeat-with-inter-iteration-gaps",
      node[1],
      node[2],
      deriveInsertionIr(node[3], registry, referenceStack),
    ];
  }
  if (type === "reference") {
    assert.equal(referenceStack.includes(node[1]), false, `recursive IR ${node[1]}`);
    return [
      "expanded-reference",
      node[1],
      deriveInsertionIr(registry.definitions[node[1]], registry, [
        ...referenceStack,
        node[1],
      ]),
    ];
  }
  assert.fail(`unsupported IR node ${type}`);
}

function validateRegistry(registry, expectedCount) {
  assert.equal(registry.registryVersion, "2.0.0");
  assert.equal(registry.rules.length, expectedCount);
  assert.deepEqual(registry.astSchema.closedNodeTypes, [...allowedAstNodeTypes]);
  assert.equal(registry.authority.soleGrammarAuthorityWhenSelected, true);
  assert.equal(
    registry.authority.directInsertionAndStructuredRecognizersGeneratedFromThisAstOnly,
    true,
  );
  const ids = new Set();
  const priorities = new Set();
  const historicalIds = new Set();
  const usedReferences = new Set();
  const compiled = [];
  const insertionIr = [];
  for (const rule of registry.rules) {
    for (const field of registry.astSchema.ruleSchema.requiredCommonFields) {
      assert.ok(Object.hasOwn(rule, field), `${rule.ruleId ?? "rule"} missing ${field}`);
    }
    nonempty(rule.ruleId, "ruleId");
    nonempty(rule.regressionEvidenceId, `${rule.ruleId} regressionEvidenceId`);
    assert.ok(policy.resultDomain.protectedMatch.categorySet.includes(rule.category));
    assert.ok(["key", "value", "both"].includes(rule.targetDomain));
    assert.ok(["lexical", "prefix", "structured"].includes(rule.kind));
    assert.ok(["i", "u", "iu"].includes(rule.flags));
    assert.equal(ids.has(rule.ruleId), false, `duplicate rule ${rule.ruleId}`);
    assert.equal(priorities.has(rule.priority), false, `duplicate priority ${rule.priority}`);
    assert.equal(
      historicalIds.has(rule.regressionEvidenceId) &&
        rule.regressionEvidenceId !== "none:new-accepted-architecture-coverage",
      false,
      `duplicate regression mapping ${rule.regressionEvidenceId}`,
    );
    ids.add(rule.ruleId);
    priorities.add(rule.priority);
    historicalIds.add(rule.regressionEvidenceId);
    assert.equal(rule.insertion.leadingGapAllowed, false);
    assert.equal(rule.insertion.trailingGapAllowed, false);
    if (rule.targetDomain === "key") {
      assert.equal(rule.inputProjectionId, "key-nfkc-ascii-fold-strip-v3");
      assert.equal(rule.insertion.mode, "projection-equivalent-no-extra-gap");
    } else {
      assert.equal(rule.inputProjectionId, "value-nfkc-v3");
      assert.equal(rule.insertion.mode, "grammar-adjacency-v1");
    }
    const state = {
      nodeCount: 0,
      usedReferences: new Set(),
      referenceStack: [],
    };
    const source = compileAst(rule.ast, registry, state);
    for (const reference of state.usedReferences) usedReferences.add(reference);
    new RegExp(source, rule.flags);
    compiled.push({
      ruleId: rule.ruleId,
      category: rule.category,
      priority: rule.priority,
      targetDomain: rule.targetDomain,
      source,
      flags: rule.flags,
    });
    insertionIr.push({
      ruleId: rule.ruleId,
      category: rule.category,
      priority: rule.priority,
      targetDomain: rule.targetDomain,
      ir: deriveInsertionIr(rule.ast, registry),
    });
  }
  assert.deepEqual(
    [...priorities].sort((left, right) => left - right),
    Array.from({ length: expectedCount }, (_, index) => index + 1),
  );
  assert.deepEqual([...usedReferences].sort(), Object.keys(registry.definitions).sort());
  const structured = registry.rules.filter((rule) => rule.kind === "structured");
  assert.equal(structured.length, 9);
  assert.deepEqual(
    structured.map((rule) => rule.structuredRecognizerId),
    registry.structuredRecognizerIds,
  );
  return {
    compiled,
    insertionIr,
    directHash: sha256Bytes(canonicalize(compiled)),
    insertionIrHash: sha256Bytes(canonicalize(insertionIr)),
  };
}

const includeCompiled = validateRegistry(includeRegistry, 31);
const excludeCompiled = validateRegistry(excludeRegistry, 30);
pass(
  `M02 closed AST registries include=31/direct:${includeCompiled.directHash}/IR:${includeCompiled.insertionIrHash}; exclude=30/direct:${excludeCompiled.directHash}/IR:${excludeCompiled.insertionIrHash}; structured=9 each`,
);

const includeOption = policy.grammarSelection.candidateOptions.find(
  (option) => option.optionId === "M02-D1-INCLUDE",
);
const excludeOption = policy.grammarSelection.candidateOptions.find(
  (option) => option.optionId === "M02-D1-EXCLUDE",
);
assert.equal(
  sha256File(resolve(here, includeOption.path)),
  includeOption.sha256,
  "include registry hash",
);
assert.equal(
  sha256File(resolve(here, excludeOption.path)),
  excludeOption.sha256,
  "exclude registry hash",
);
assert.equal(decision.ownerSelection, null);
assert.equal(decision.recommendation, "M02-D1-INCLUDE");
assert.equal(decision.commonAuthorityProfile.profileId, policy.profileId);
assert.equal(decision.commonAuthorityProfile.profileVersion, policy.profileVersion);
assert.equal(
  sha256File(resolve(here, decision.commonAuthorityProfile.path)),
  decision.commonAuthorityProfile.sha256,
  "common authority profile hash",
);
assert.equal(decision.mandatoryCorpus.corpusId, corpus.corpusId);
assert.equal(decision.mandatoryCorpus.corpusVersion, corpus.corpusVersion);
assert.equal(
  sha256File(resolve(here, decision.mandatoryCorpus.path)),
  decision.mandatoryCorpus.sha256,
  "mandatory corpus hash",
);
assert.deepEqual(
  [...corpus.semantics.expectedValues].sort(),
  [
    "allow",
    "invalid_control",
    "unsupported_value",
    ...policy.resultDomain.protectedMatch.categorySet,
  ].sort(),
  "corpus result enumeration",
);
assert.equal(decision.options[0].adrDisposition.startsWith("no security-exception"), true);
assert.match(decision.options[1].adrDisposition, /mandatory/);
assert.equal(policy.authority.ownerApproved, false);
assert.equal(policy.authority.implementationAuthorized, false);

const includeModelRule = includeRegistry.rules.find(
  (rule) => rule.ruleId === "value.provider-model-prefix.v3",
);
const excludeModelRule = excludeRegistry.rules.find(
  (rule) => rule.ruleId === "value.provider-model-prefix.v2",
);
const includeModelText = canonicalize(includeModelRule.ast);
const excludeModelText = canonicalize(excludeModelRule.ast);
assert.match(includeModelText, /deepseek-/);
assert.doesNotMatch(excludeModelText, /deepseek-/);
const selectedNameRule = includeRegistry.rules.find(
  (rule) => rule.ruleId === "value.provider-selected-name.lexical.v1",
);
assert.deepEqual(selectedNameRule.ast, [
  "sequence",
  ["wordBoundary"],
  ["literal", "deepseek"],
  ["wordBoundary"],
]);
assert.equal(
  excludeRegistry.rules.some((rule) => canonicalize(rule.ast).includes("deepseek")),
  false,
);
const includeByRegression = new Map(
  includeRegistry.rules
    .filter((rule) => rule.regressionEvidenceId !== "none:new-accepted-architecture-coverage")
    .map((rule) => [rule.regressionEvidenceId, rule]),
);
for (const rule of excludeRegistry.rules) {
  const included = includeByRegression.get(rule.regressionEvidenceId);
  assert.ok(included, `missing include mapping ${rule.regressionEvidenceId}`);
  if (rule.regressionEvidenceId !== "valueRules[15]") {
    assert.deepEqual(included.ast, rule.ast, `unexpected AST delta ${rule.ruleId}`);
    assert.equal(included.category, rule.category);
    assert.equal(included.targetDomain, rule.targetDomain);
    assert.equal(included.kind, rule.kind);
  }
}
pass("M02 alternatives differ only by explicit DeepSeek provider token/model prefix and later priority shift");

const invalidControlPattern = /[\u0000-\u0009\u000b-\u001f\u007f]/u;
const witnessInsertionPattern = /[\u000a\u034f\u200b]/gu;

function preflight(value) {
  const seen = new WeakSet();
  let nodes = 0;
  let rawBytes = 0;
  let normalizedBytes = 0;
  function visit(current, depth) {
    if (depth > policy.limits.maximumDepth) throw new Error("unsupported_value");
    nodes += 1;
    if (nodes > policy.limits.maximumVisitedNodes) throw new Error("unsupported_value");
    if (current === null || typeof current === "boolean") return;
    if (typeof current === "number") {
      if (!Number.isFinite(current)) throw new Error("unsupported_value");
      return;
    }
    if (typeof current === "string") {
      const scalars = [...current];
      if (scalars.length > policy.limits.maximumUnicodeScalarsPerStringOrKey) {
        throw new Error("unsupported_value");
      }
      for (let index = 0; index < current.length; index += 1) {
        const code = current.charCodeAt(index);
        if (code >= 0xd800 && code <= 0xdbff) {
          const next = current.charCodeAt(index + 1);
          if (!(next >= 0xdc00 && next <= 0xdfff)) throw new Error("unsupported_value");
          index += 1;
        } else if (code >= 0xdc00 && code <= 0xdfff) {
          throw new Error("unsupported_value");
        }
      }
      rawBytes += Buffer.byteLength(current);
      normalizedBytes += Buffer.byteLength(current.normalize("NFKC"));
      if (
        rawBytes > policy.limits.maximumRawUtf8Bytes ||
        normalizedBytes > policy.limits.maximumNfkcUtf8Bytes
      ) {
        throw new Error("unsupported_value");
      }
      return;
    }
    if (typeof current !== "object") throw new Error("unsupported_value");
    if (seen.has(current)) throw new Error("unsupported_value");
    seen.add(current);
    if (Array.isArray(current)) {
      if (Object.keys(current).length !== current.length) throw new Error("unsupported_value");
      for (const item of current) visit(item, depth + 1);
      return;
    }
    const prototype = Object.getPrototypeOf(current);
    if (prototype !== Object.prototype && prototype !== null) {
      throw new Error("unsupported_value");
    }
    const descriptors = Object.getOwnPropertyDescriptors(current);
    if (Object.getOwnPropertySymbols(current).length > 0) throw new Error("unsupported_value");
    for (const key of Object.keys(descriptors)) {
      const descriptor = descriptors[key];
      if (!descriptor.enumerable || !Object.hasOwn(descriptor, "value")) {
        throw new Error("unsupported_value");
      }
      visit(key, depth + 1);
      visit(descriptor.value, depth + 1);
    }
  }
  visit(value, 0);
}

function classifyWitness(input, targetDomain, registry) {
  try {
    preflight(input);
  } catch {
    return "unsupported_value";
  }
  const normalized =
    targetDomain === "key"
      ? input.normalize("NFKC").replace(/[^a-z0-9_]/giu, "")
      : input.normalize("NFKC");
  if (invalidControlPattern.test(normalized)) return "invalid_control";
  const candidates =
    targetDomain === "key"
      ? [normalized]
      : [normalized, normalized.replace(witnessInsertionPattern, "")];
  for (const rule of [...registry.rules].sort((left, right) => left.priority - right.priority)) {
    if (!(rule.targetDomain === targetDomain || rule.targetDomain === "both")) continue;
    const state = { nodeCount: 0, usedReferences: new Set(), referenceStack: [] };
    const source = compileAst(rule.ast, registry, state);
    for (const candidate of candidates) {
      if (new RegExp(source, rule.flags).test(candidate)) return rule.category;
    }
  }
  return "allow";
}

for (const testCase of corpus.cases) {
  const domain = testCase.targetDomain ?? "value";
  const originalHash = sha256Bytes(Buffer.from(testCase.input));
  assert.equal(
    classifyWitness(testCase.input, domain, includeRegistry),
    testCase.include,
    `${testCase.id} include`,
  );
  assert.equal(
    classifyWitness(testCase.input, domain, excludeRegistry),
    testCase.exclude,
    `${testCase.id} exclude`,
  );
  assert.equal(sha256Bytes(Buffer.from(testCase.input)), originalHash, `${testCase.id} bytes`);
}
let deepValue = null;
for (let index = 0; index < 17; index += 1) deepValue = [deepValue];
assert.throws(() => preflight(deepValue), /unsupported_value/);
assert.throws(
  () => preflight(Array.from({ length: 4097 }, () => null)),
  /unsupported_value/,
);
assert.throws(() => preflight("a".repeat(131073)), /unsupported_value/);
assert.throws(() => preflight("\ud800"), /unsupported_value/);
const cycle = {};
cycle.self = cycle;
assert.throws(() => preflight(cycle), /unsupported_value/);
const repeated = {};
assert.throws(() => preflight([repeated, repeated]), /unsupported_value/);
pass(
  `M02 corpus ${corpus.cases.length}/${corpus.cases.length} include/exclude/security/false-positive/Unicode/byte-identity cases plus structural limits`,
);

assert.equal(graph.profileVersion, "2.0.0");
assert.equal(graph.authority.ownerApproved, false);
assert.equal(graph.authority.implementationAuthorized, false);
assert.equal(graph.classificationModel.rootClasses.length, 12);
assert.equal(
  new Set(graph.classificationModel.rootClasses.map((root) => root.id)).size,
  graph.classificationModel.rootClasses.length,
);
const phaseBRoot = graph.outerCompositionRoots.find(
  (root) => root.rootId === "phase-b-composition-v1",
);
const phaseDRoot = graph.outerCompositionRoots.find(
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
assert.equal(phaseBRoot.exhaustiveness.helperCalls, 1);
assert.equal(phaseDRoot.phaseBPresence.maximumFiles, 0);
assert.equal(graph.adapterZone.phaseBExpectedPresence.maximumFiles, 0);
assert.equal(
  existsSync(resolve(repositoryRoot, phaseDRoot.path)),
  false,
  "Phase D root must remain absent",
);
assert.equal(
  existsSync(resolve(repositoryRoot, graph.adapterZone.path)),
  false,
  "adapter zone must remain absent",
);
assert.equal(graph.protectedAiPolicy.productionProviderRegistry.startsWith("exact-empty"), true);
pass("M03 complete root classes, exact five-edge Phase B root, Phase D/adapter absence and empty Provider registry");

const dbTypesSource = readText("src/db/types.ts");
const dbClientSource = readText("src/db/client.ts");
assert.match(dbTypesSource, /export type AppDatabase<TQueryResult extends PgQueryResultHKT>/);
assert.match(dbClientSource, /export type DatabaseConnection\s*=\s*\|/);
assert.match(dbClientSource, /kind: "pglite"/);
assert.match(dbClientSource, /kind: "postgres"/);
assert.match(graph.actualDatabaseTypeBoundary.varianceFact, /not assignable/);

const positiveSource = readFileSync(
  resolve(here, graph.literalTypeSafeSeam.positiveProbe),
  "utf8",
);
for (const forbidden of [
  /\bas\s+(?:const|[A-Za-z_$])/u,
  /\bany\b/u,
  /\bunknown\b/u,
  /@ts-/u,
  /Object\.assign/u,
  /Object\.defineProperty/u,
  /Reflect\./u,
  /Proxy/u,
]) {
  assert.doesNotMatch(positiveSource, forbidden);
}
assert.equal((positiveSource.match(/switch \(databaseConnection\.kind\)/gu) ?? []).length, 1);
assert.equal((positiveSource.match(/databaseConnection\.db/gu) ?? []).length, 2);
assert.equal(
  (positiveSource.match(/return createPhaseBAvailabilityServiceV1\(/gu) ?? []).length,
  2,
);
assert.equal(
  (positiveSource.match(/unsupportedDatabaseConnection\(databaseConnection\)/gu) ?? [])
    .length,
  1,
);

function runTypeProbe(configName) {
  const tsc = resolve(repositoryRoot, "node_modules/.bin/tsc");
  assert.equal(existsSync(tsc), true, "local TypeScript binary missing");
  const result = run(tsc, ["-p", resolve(here, configName)]);
  return {
    status: result.status,
    diagnostics: `${result.stdout}${result.stderr}`,
  };
}

const positive = runTypeProbe("tsconfig.m03-positive.json");
assert.equal(positive.status, 0, positive.diagnostics);
assert.equal(positive.diagnostics, "");
const unionNegative = runTypeProbe("tsconfig.m03-union-negative.json");
assert.equal(unionNegative.status, 2);
assert.match(unionNegative.diagnostics, /error TS2375/);
assert.match(
  unionNegative.diagnostics,
  /PgliteAppDatabase \| PostgresAppDatabase/,
);
const driverSwapNegative = runTypeProbe("tsconfig.m03-driver-swap-negative.json");
assert.equal(driverSwapNegative.status, 2);
assert.match(driverSwapNegative.diagnostics, /error TS2375/);
assert.match(driverSwapNegative.diagnostics, /PgliteAppDatabase/);
assert.match(driverSwapNegative.diagnostics, /PostgresJsQueryResultHKT/);
pass("M03 strict positive exit=0; union projection exit=2/TS2375; cross-driver handoff exit=2/TS2375");
pass("M03 positive seam has one exhaustive kind switch, two mutually exclusive .db reads, one runtime factory authority and zero type erasure");

const reportPaths = [
  "docs/PHASE_1B_STAGE4A_PHASE_B_THREE_STRIKE_TECHNICAL_ESCALATION_V1_0.md",
  "docs/PHASE_1B_STAGE4A_PHASE_B_THREE_STRIKE_TECHNICAL_ESCALATION_OWNER_DECISION_PACKAGE_V1_0.md",
  `${evidencePath}/README.md`,
];
for (const reportPath of reportPaths) {
  assert.equal(existsSync(resolve(repositoryRoot, reportPath)), true, reportPath);
  const source = readText(reportPath);
  const linkPattern = /\[[^\]]*\]\(([^)]+)\)/gu;
  for (const match of source.matchAll(linkPattern)) {
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
pass("Markdown links and final-LF checks for escalation report, Owner package and evidence README");

const changedPaths = git([
  "diff",
  "--name-only",
  `${fixed.technicalEscalation.startCommit}...HEAD`,
])
  .split("\n")
  .filter(Boolean);
assert.ok(changedPaths.length > 0);
for (const path of changedPaths) {
  const allowed =
    path === reportPaths[0] ||
    path === reportPaths[1] ||
    path.startsWith(`${evidencePath}/`);
  assert.equal(allowed, true, `out-of-scope changed path ${path}`);
}
pass(`scope guard ${changedPaths.length} committed paths, docs/evidence only`);

if (captureMode) {
  pass("capture mode: SHA-256 manifest and final clean-state checks deferred");
} else {
  const manifestPath = resolve(here, "SHA256SUMS.txt");
  assert.equal(existsSync(manifestPath), true, "manifest missing");
  const entries = readFileSync(manifestPath, "utf8")
    .trim()
    .split("\n")
    .map((line) => {
      const match = line.match(/^([0-9a-f]{64})  (.+)$/u);
      assert.ok(match, `invalid manifest line ${line}`);
      return { hash: match[1], path: match[2] };
    });
  assert.ok(entries.length > 0);
  for (const entry of entries) {
    assert.notEqual(entry.path, `${evidencePath}/SHA256SUMS.txt`);
    const path = resolve(repositoryRoot, entry.path);
    assert.equal(existsSync(path), true, `manifest missing ${entry.path}`);
    assert.equal(sha256File(path), entry.hash, `manifest hash ${entry.path}`);
  }
  pass(`SHA-256 manifest ${entries.length}/${entries.length}`);
  assert.equal(git(["status", "--porcelain"]), "", "worktree not clean");
  pass("final worktree clean");
}

output.push("SUMMARY TECHNICAL_ESCALATION_PROBE=PASS");
process.stdout.write(`${output.join("\n")}\n`);
