import selectedRegistry from "./protected-data-registry.v2_1.json";

const selectedRegistrySemanticTransport = JSON.stringify(selectedRegistry);

export const selectedProtectedDataRegistryIdentityV1 = Object.freeze({
  registryId: "cwt.phase1b.stage4a.phaseb.m02-grammar-registry.include-deepseek.v2_1",
  registryVersion: "2.1.0",
  sha256: "264ca6358dcec00da5bc17e134c89e52d5321c87683212b8c32ba12756700b66",
});

const exactRuntime = Object.freeze({
  node: "24.14.0",
  v8: "13.6.233.17-node.41",
  icu: "78.2",
  unicode: "17.0",
  cldr: "48.0",
  platform: "darwin",
  arch: "arm64",
});

const LIMITS = Object.freeze({
  depth: 16,
  visitedNodes: 4_096,
  rawUtf8Bytes: 131_072,
  normalizedUtf8Bytes: 131_072,
  scalarsPerString: 65_536,
  compiledAstNodes: 8_192,
  matcherStatesPerRule: 262_144,
  rules: 64,
});

export type ProtectedDataCategoryV1 =
  | "customer_private_data"
  | "personal_identity"
  | "network_location"
  | "private_storage"
  | "credential_secret"
  | "session_analytics_identity"
  | "prompt_override"
  | "provider_override"
  | "markup_syntax"
  | "tool_network_action"
  | "public_state_action";

export type ProtectedDataClassificationV1 =
  | { readonly kind: "allow" }
  | { readonly kind: "invalid_control"; readonly path: string }
  | { readonly kind: "unsupported_value"; readonly path: string }
  | {
      readonly kind: "protected_match";
      readonly category: ProtectedDataCategoryV1;
      readonly priority: number;
      readonly ruleId: string;
      readonly targetDomain: "key" | "value" | "both";
      readonly path: string;
    };

interface RuntimeTupleV1 {
  readonly node: string;
  readonly v8: string;
  readonly icu: string;
  readonly unicode: string;
  readonly cldr: string;
  readonly platform: string;
  readonly arch: string;
}

interface MatchStateV1 {
  readonly position: number;
  readonly started: boolean;
  readonly inserted: number;
}

interface CompiledRuleV1 {
  readonly ruleId: string;
  readonly targetDomain: "key" | "value" | "both";
  readonly category: ProtectedDataCategoryV1;
  readonly priority: number;
  readonly flags: string;
  readonly inputProjectionId: string;
  readonly ast: readonly unknown[];
  readonly gapSetAst: readonly unknown[];
  readonly minimumCodePointsPerGap: number;
  readonly maximumCodePointsPerGap: number;
  readonly maximumInsertedCodePointsPerMatchedCandidate: number;
}

export interface CompiledProtectedDataClassifierV1 {
  readonly identity: typeof selectedProtectedDataRegistryIdentityV1;
  classify(value: unknown): ProtectedDataClassificationV1;
}

class UnsupportedRegistryError extends Error {}
class MatcherOverflowError extends Error {}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function exactKeys(
  value: Record<string, unknown>,
  required: readonly string[],
  optional: readonly string[] = [],
): boolean {
  const keys = Object.keys(value);
  return required.every((key) => Object.hasOwn(value, key)) &&
    keys.every((key) => required.includes(key) || optional.includes(key));
}

function scalarCount(value: string): number {
  return Array.from(value).length;
}

function hasLoneSurrogate(value: string): boolean {
  for (let index = 0; index < value.length; index += 1) {
    const unit = value.charCodeAt(index);
    if (unit >= 0xd800 && unit <= 0xdbff) {
      const next = value.charCodeAt(index + 1);
      if (!(next >= 0xdc00 && next <= 0xdfff)) return true;
      index += 1;
    } else if (unit >= 0xdc00 && unit <= 0xdfff) return true;
  }
  return false;
}

function currentRuntime(): RuntimeTupleV1 {
  return {
    node: process.versions.node,
    v8: process.versions.v8,
    icu: process.versions.icu ?? "",
    unicode: process.versions.unicode ?? "",
    cldr: process.versions.cldr ?? "",
    platform: process.platform,
    arch: process.arch,
  };
}

function runtimeMatches(runtime: RuntimeTupleV1): boolean {
  return runtime.node === exactRuntime.node && runtime.v8 === exactRuntime.v8 &&
    runtime.icu === exactRuntime.icu && runtime.unicode === exactRuntime.unicode &&
    runtime.cldr === exactRuntime.cldr && runtime.platform === exactRuntime.platform &&
    runtime.arch === exactRuntime.arch;
}

function parseCodePoint(value: unknown): number {
  if (typeof value !== "string" || !/^U\+[0-9A-F]{4,6}$/.test(value)) {
    throw new UnsupportedRegistryError();
  }
  const codePoint = Number.parseInt(value.slice(2), 16);
  if (
    codePoint > 0x10ffff ||
    (codePoint >= 0xd800 && codePoint <= 0xdfff)
  ) throw new UnsupportedRegistryError();
  return codePoint;
}

const grammarNodes = new Set([
  "literal", "charClass", "unicodeProperty", "shorthand", "sequence",
  "alternation", "group", "repeat", "reference", "wordBoundary",
  "startAnchor", "negativeLookbehind", "negativeLookahead",
]);
const gapNodes = new Set([
  "emptySet", "codePoint", "codePointRange", "unicodeProperty", "union",
  "subtract", "reference",
]);
const gapProperties = new Set([
  "Default_Ignorable_Code_Point", "Mark", "White_Space", "Separator",
  "Punctuation",
]);

function validateCharacterClass(value: unknown): void {
  if (typeof value !== "string" || value.length === 0) {
    throw new UnsupportedRegistryError();
  }
  try {
    new RegExp(`^[${value}]$`, "u");
  } catch {
    throw new UnsupportedRegistryError();
  }
}

function validateGrammarNode(
  node: unknown,
  definitions: Record<string, unknown>,
  visiting: ReadonlySet<string>,
  counter: { value: number },
): asserts node is readonly unknown[] {
  if (!Array.isArray(node) || typeof node[0] !== "string" || !grammarNodes.has(node[0])) {
    throw new UnsupportedRegistryError();
  }
  counter.value += 1;
  if (counter.value > LIMITS.compiledAstNodes) throw new UnsupportedRegistryError();
  const tag = node[0];
  if (tag === "literal") {
    if (node.length !== 2 || typeof node[1] !== "string" || node[1].length === 0 || hasLoneSurrogate(node[1])) {
      throw new UnsupportedRegistryError();
    }
    return;
  }
  if (tag === "charClass") {
    if (node.length !== 2) throw new UnsupportedRegistryError();
    validateCharacterClass(node[1]);
    return;
  }
  if (tag === "unicodeProperty") {
    if (node.length !== 2 || node[1] !== "N") throw new UnsupportedRegistryError();
    return;
  }
  if (tag === "shorthand") {
    if (node.length !== 2 || (node[1] !== "d" && node[1] !== "s")) {
      throw new UnsupportedRegistryError();
    }
    return;
  }
  if (tag === "wordBoundary" || tag === "startAnchor") {
    if (node.length !== 1) throw new UnsupportedRegistryError();
    return;
  }
  if (tag === "group") {
    if (node.length !== 2) throw new UnsupportedRegistryError();
    validateGrammarNode(node[1], definitions, visiting, counter);
    return;
  }
  if (tag === "sequence" || tag === "alternation") {
    if (node.length < 2) throw new UnsupportedRegistryError();
    for (const child of node.slice(1)) {
      validateGrammarNode(child, definitions, visiting, counter);
    }
    return;
  }
  if (tag === "repeat") {
    if (
      node.length !== 4 || !Number.isInteger(node[1]) ||
      typeof node[1] !== "number" || node[1] < 0 ||
      (node[2] !== null &&
        (!Number.isInteger(node[2]) || typeof node[2] !== "number" || node[2] < node[1]))
    ) throw new UnsupportedRegistryError();
    validateGrammarNode(node[3], definitions, visiting, counter);
    return;
  }
  if (tag === "reference") {
    if (node.length !== 2 || typeof node[1] !== "string" || !Object.hasOwn(definitions, node[1]) || visiting.has(node[1])) {
      throw new UnsupportedRegistryError();
    }
    const next = new Set(visiting);
    next.add(node[1]);
    validateGrammarNode(definitions[node[1]], definitions, next, counter);
    return;
  }
  if (node.length !== 2) throw new UnsupportedRegistryError();
  const operand = node[1];
  if (!Array.isArray(operand) || !["unicodeProperty", "shorthand", "charClass"].includes(String(operand[0]))) {
    throw new UnsupportedRegistryError();
  }
  validateGrammarNode(operand, definitions, visiting, counter);
}

function validateGapNode(
  node: unknown,
  definitions: Record<string, unknown>,
  visiting: ReadonlySet<string>,
  counter: { value: number },
): asserts node is readonly unknown[] {
  if (!Array.isArray(node) || typeof node[0] !== "string" || !gapNodes.has(node[0])) {
    throw new UnsupportedRegistryError();
  }
  counter.value += 1;
  if (counter.value > LIMITS.compiledAstNodes) throw new UnsupportedRegistryError();
  const tag = node[0];
  if (tag === "emptySet") {
    if (node.length !== 1) throw new UnsupportedRegistryError();
    return;
  }
  if (tag === "codePoint") {
    if (node.length !== 2) throw new UnsupportedRegistryError();
    parseCodePoint(node[1]);
    return;
  }
  if (tag === "codePointRange") {
    if (node.length !== 3 || parseCodePoint(node[1]) > parseCodePoint(node[2])) {
      throw new UnsupportedRegistryError();
    }
    return;
  }
  if (tag === "unicodeProperty") {
    if (node.length !== 2 || typeof node[1] !== "string" || !gapProperties.has(node[1])) {
      throw new UnsupportedRegistryError();
    }
    return;
  }
  if (tag === "union" || tag === "subtract") {
    if (node.length < 3 || (tag === "subtract" && node.length !== 3)) {
      throw new UnsupportedRegistryError();
    }
    for (const child of node.slice(1)) validateGapNode(child, definitions, visiting, counter);
    return;
  }
  if (node.length !== 2 || typeof node[1] !== "string" || !Object.hasOwn(definitions, node[1]) || visiting.has(node[1])) {
    throw new UnsupportedRegistryError();
  }
  const next = new Set(visiting);
  next.add(node[1]);
  validateGapNode(definitions[node[1]], definitions, next, counter);
}

function isTargetDomain(value: unknown): value is "key" | "value" | "both" {
  return value === "key" || value === "value" || value === "both";
}

function isCategory(value: unknown): value is ProtectedDataCategoryV1 {
  return typeof value === "string" && [
    "customer_private_data", "personal_identity", "network_location",
    "private_storage", "credential_secret", "session_analytics_identity",
    "prompt_override", "provider_override", "markup_syntax",
    "tool_network_action", "public_state_action",
  ].includes(value);
}

function parseRegistry(input: unknown): readonly CompiledRuleV1[] {
  if (!isRecord(input) || !exactKeys(input, [
    "astSchema", "authority", "canonicalization", "deepSeekDecision",
    "definitions", "gapSetDefinitions", "insertionTransform",
    "providerModelRegistrationClosure", "registryId", "registryVersion",
    "rules", "status", "structuredRecognizerIds",
  ])) throw new UnsupportedRegistryError();
  if (
    input.registryId !== selectedProtectedDataRegistryIdentityV1.registryId ||
    input.registryVersion !== selectedProtectedDataRegistryIdentityV1.registryVersion ||
    !isRecord(input.definitions) || !isRecord(input.gapSetDefinitions) ||
    !Array.isArray(input.rules) || input.rules.length !== 32 ||
    input.rules.length > LIMITS.rules
  ) throw new UnsupportedRegistryError();

  const rules: CompiledRuleV1[] = [];
  const priorities = new Set<number>();
  const ruleIds = new Set<string>();
  const counter = { value: 0 };
  for (const rawRule of input.rules) {
    if (!isRecord(rawRule) || !exactKeys(rawRule, [
      "regressionEvidenceId", "ruleId", "targetDomain", "category", "priority",
      "kind", "flags", "inputProjectionId", "ast", "insertion",
    ], ["structuredRecognizerId"]) || !isRecord(rawRule.insertion)) {
      throw new UnsupportedRegistryError();
    }
    if (!exactKeys(rawRule.insertion, [
      "mode", "gapPolicyId", "gapSetAst", "minimumCodePointsPerGap",
      "maximumCodePointsPerGap", "maximumInsertedCodePointsPerMatchedCandidate",
      "leadingGapAllowed", "trailingGapAllowed", "eligibleGapDefinition",
      "forbiddenPositions",
    ])) throw new UnsupportedRegistryError();
    const insertion = rawRule.insertion;
    if (
      typeof rawRule.ruleId !== "string" || ruleIds.has(rawRule.ruleId) ||
      !isTargetDomain(rawRule.targetDomain) || !isCategory(rawRule.category) ||
      typeof rawRule.priority !== "number" || !Number.isInteger(rawRule.priority) ||
      rawRule.priority < 1 || rawRule.priority > 32 || priorities.has(rawRule.priority) ||
      (rawRule.flags !== "i" && rawRule.flags !== "u" && rawRule.flags !== "iu") ||
      (rawRule.inputProjectionId !== "key-nfkc-ascii-fold-strip-v3" && rawRule.inputProjectionId !== "value-nfkc-v3") ||
      typeof insertion.minimumCodePointsPerGap !== "number" ||
      typeof insertion.maximumCodePointsPerGap !== "number" ||
      typeof insertion.maximumInsertedCodePointsPerMatchedCandidate !== "number" ||
      !Number.isInteger(insertion.minimumCodePointsPerGap) ||
      !Number.isInteger(insertion.maximumCodePointsPerGap) ||
      !Number.isInteger(insertion.maximumInsertedCodePointsPerMatchedCandidate) ||
      insertion.minimumCodePointsPerGap < 0 ||
      insertion.maximumCodePointsPerGap < insertion.minimumCodePointsPerGap ||
      insertion.maximumInsertedCodePointsPerMatchedCandidate < 0 ||
      insertion.leadingGapAllowed !== false || insertion.trailingGapAllowed !== false
    ) throw new UnsupportedRegistryError();
    validateGrammarNode(rawRule.ast, input.definitions, new Set(), counter);
    validateGapNode(insertion.gapSetAst, input.gapSetDefinitions, new Set(), counter);
    ruleIds.add(rawRule.ruleId);
    priorities.add(rawRule.priority);
    rules.push({
      ruleId: rawRule.ruleId,
      targetDomain: rawRule.targetDomain,
      category: rawRule.category,
      priority: rawRule.priority,
      flags: rawRule.flags,
      inputProjectionId: rawRule.inputProjectionId,
      ast: rawRule.ast,
      gapSetAst: insertion.gapSetAst,
      minimumCodePointsPerGap: insertion.minimumCodePointsPerGap,
      maximumCodePointsPerGap: insertion.maximumCodePointsPerGap,
      maximumInsertedCodePointsPerMatchedCandidate:
        insertion.maximumInsertedCodePointsPerMatchedCandidate,
    });
  }
  for (let priority = 1; priority <= 32; priority += 1) {
    if (!priorities.has(priority)) throw new UnsupportedRegistryError();
  }
  return rules.sort((left, right) => left.priority - right.priority);
}

function propertyMatches(property: string, value: string): boolean {
  return new RegExp(`^\\p{${property}}$`, "u").test(value);
}

function gapMatches(
  node: readonly unknown[],
  character: string,
  definitions: Record<string, unknown>,
): boolean {
  switch (node[0]) {
    case "emptySet": return false;
    case "codePoint": return character.codePointAt(0) === parseCodePoint(node[1]);
    case "codePointRange": {
      const value = character.codePointAt(0);
      return value !== undefined && value >= parseCodePoint(node[1]) && value <= parseCodePoint(node[2]);
    }
    case "unicodeProperty": return propertyMatches(String(node[1]), character);
    case "union": return node.slice(1).some((child) =>
      Array.isArray(child) && gapMatches(child, character, definitions));
    case "subtract":
      return Array.isArray(node[1]) && Array.isArray(node[2]) &&
        gapMatches(node[1], character, definitions) &&
        !gapMatches(node[2], character, definitions);
    case "reference": {
      const referenced = definitions[String(node[1])];
      return Array.isArray(referenced) && gapMatches(referenced, character, definitions);
    }
    default: throw new UnsupportedRegistryError();
  }
}

function dedupe(states: readonly MatchStateV1[]): readonly MatchStateV1[] {
  const seen = new Set<string>();
  return states.filter((state) => {
    const key = `${state.position}:${state.started ? 1 : 0}:${state.inserted}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function atomPredicate(node: readonly unknown[], flags: string): (value: string) => boolean {
  switch (node[0]) {
    case "charClass": {
      const matcher = new RegExp(`^[${String(node[1])}]$`, flags);
      return (value) => matcher.test(value);
    }
    case "unicodeProperty": return (value) => propertyMatches(String(node[1]), value);
    case "shorthand": {
      const matcher = new RegExp(`^\\${String(node[1])}$`, flags);
      return (value) => matcher.test(value);
    }
    default: throw new UnsupportedRegistryError();
  }
}

function matchNode(input: {
  readonly node: readonly unknown[];
  readonly state: MatchStateV1;
  readonly characters: readonly string[];
  readonly rule: CompiledRuleV1;
  readonly grammarDefinitions: Record<string, unknown>;
  readonly gapDefinitions: Record<string, unknown>;
  readonly maximumPerGap: number;
  readonly maximumTotal: number;
  readonly stateCounter: { value: number };
}): readonly MatchStateV1[] {
  input.stateCounter.value += 1;
  if (input.stateCounter.value > LIMITS.matcherStatesPerRule) throw new MatcherOverflowError();
  const consume = (predicate: (value: string) => boolean): readonly MatchStateV1[] => {
    const candidates: MatchStateV1[] = [];
    const minimum = input.state.started ? input.rule.minimumCodePointsPerGap : 0;
    const maximum = input.state.started ? input.maximumPerGap : 0;
    for (let gap = 0; gap <= maximum; gap += 1) {
      if (gap < minimum || input.state.inserted + gap > input.maximumTotal) continue;
      let eligible = true;
      for (let offset = 0; offset < gap; offset += 1) {
        const character = input.characters[input.state.position + offset];
        if (character === undefined || !gapMatches(input.rule.gapSetAst, character, input.gapDefinitions)) {
          eligible = false;
          break;
        }
      }
      if (!eligible) break;
      const atom = input.characters[input.state.position + gap];
      if (atom !== undefined && predicate(atom)) {
        candidates.push({
          position: input.state.position + gap + 1,
          started: true,
          inserted: input.state.inserted + gap,
        });
      }
    }
    return candidates;
  };

  const node = input.node;
  switch (node[0]) {
    case "literal": {
      let states: readonly MatchStateV1[] = [input.state];
      for (const character of Array.from(String(node[1]))) {
        states = dedupe(states.flatMap((state) => matchNode({
          ...input,
          node: ["charClass", character.replace(/[\\\]\^-]/g, "\\$&")],
          state,
        })));
      }
      return states;
    }
    case "charClass":
    case "unicodeProperty":
    case "shorthand":
      return consume(atomPredicate(node, input.rule.flags));
    case "group":
      return Array.isArray(node[1]) ? matchNode({ ...input, node: node[1] }) : [];
    case "sequence": {
      let states: readonly MatchStateV1[] = [input.state];
      for (const child of node.slice(1)) {
        if (!Array.isArray(child)) return [];
        states = dedupe(states.flatMap((state) => matchNode({ ...input, node: child, state })));
        if (states.length === 0) break;
      }
      return states;
    }
    case "alternation":
      return dedupe(node.slice(1).flatMap((child) =>
        Array.isArray(child) ? matchNode({ ...input, node: child }) : []));
    case "repeat": {
      const minimum = Number(node[1]);
      const configuredMaximum = node[2] === null ? input.characters.length + 1 : Number(node[2]);
      const child = node[3];
      if (!Array.isArray(child)) return [];
      const accepted: MatchStateV1[] = minimum === 0 ? [input.state] : [];
      let states: readonly MatchStateV1[] = [input.state];
      for (let count = 1; count <= configuredMaximum && states.length > 0; count += 1) {
        const next = dedupe(states.flatMap((state) => matchNode({ ...input, node: child, state })));
        if (next.every((candidate) => states.some((prior) =>
          candidate.position === prior.position && candidate.inserted === prior.inserted && candidate.started === prior.started
        ))) break;
        states = next;
        if (count >= minimum) accepted.push(...states);
      }
      return dedupe(accepted);
    }
    case "reference": {
      const referenced = input.grammarDefinitions[String(node[1])];
      return Array.isArray(referenced) ? matchNode({ ...input, node: referenced }) : [];
    }
    case "startAnchor": return input.state.position === 0 ? [input.state] : [];
    case "wordBoundary": {
      const word = (value: string | undefined) => value !== undefined && /^[A-Za-z0-9_]$/.test(value);
      return word(input.characters[input.state.position - 1]) !== word(input.characters[input.state.position])
        ? [input.state] : [];
    }
    case "negativeLookbehind": {
      const operand = node[1];
      if (!Array.isArray(operand)) return [];
      const previous = input.characters[input.state.position - 1];
      return previous === undefined || !atomPredicate(operand, input.rule.flags)(previous)
        ? [input.state] : [];
    }
    case "negativeLookahead": {
      const operand = node[1];
      if (!Array.isArray(operand)) return [];
      const next = input.characters[input.state.position];
      return next === undefined || !atomPredicate(operand, input.rule.flags)(next)
        ? [input.state] : [];
    }
    default: return [];
  }
}

function ruleMatches(
  rule: CompiledRuleV1,
  value: string,
  grammarDefinitions: Record<string, unknown>,
  gapDefinitions: Record<string, unknown>,
  relaxed: boolean,
): boolean {
  const characters = Array.from(value);
  const stateCounter = { value: 0 };
  for (let start = 0; start < characters.length; start += 1) {
    const matches = matchNode({
      node: rule.ast,
      state: { position: start, started: false, inserted: 0 },
      characters,
      rule,
      grammarDefinitions,
      gapDefinitions,
      maximumPerGap: relaxed ? 64 : rule.maximumCodePointsPerGap,
      maximumTotal: relaxed ? 65 : rule.maximumInsertedCodePointsPerMatchedCandidate,
      stateCounter,
    });
    if (matches.some((state) => state.started)) return true;
  }
  return false;
}

interface TraversalEntryV1 {
  readonly domain: "key" | "value";
  readonly path: string;
  readonly value: string;
}

function escapePointer(value: string): string {
  return value.replaceAll("~", "~0").replaceAll("/", "~1");
}

function preflight(value: unknown):
  | { readonly ok: true; readonly entries: readonly TraversalEntryV1[] }
  | { readonly ok: false; readonly path: string } {
  const entries: TraversalEntryV1[] = [];
  const seen = new Set<object>();
  let visited = 0;
  let rawBytes = 0;
  const encoder = new TextEncoder();

  function visit(current: unknown, path: string, depth: number): boolean {
    visited += 1;
    if (visited > LIMITS.visitedNodes || depth > LIMITS.depth) return false;
    if (current === null || typeof current === "boolean") return true;
    if (typeof current === "number") return Number.isFinite(current);
    if (typeof current === "string") {
      if (hasLoneSurrogate(current) || current.includes("\uFFFD") || scalarCount(current) > LIMITS.scalarsPerString) return false;
      rawBytes += encoder.encode(current).byteLength;
      if (rawBytes > LIMITS.rawUtf8Bytes) return false;
      entries.push({ domain: "value", path, value: current });
      return true;
    }
    if (typeof current !== "object" || seen.has(current)) return false;
    seen.add(current);
    if (Array.isArray(current)) {
      for (let index = 0; index < current.length; index += 1) {
        if (!Object.hasOwn(current, index) || !visit(current[index], `${path}/${index}`, depth + 1)) return false;
      }
      return true;
    }
    const prototype = Object.getPrototypeOf(current);
    if (prototype !== Object.prototype && prototype !== null) return false;
    const ownKeys = Reflect.ownKeys(current);
    const descriptors = Object.getOwnPropertyDescriptors(current);
    const keys = Object.keys(current);
    if (ownKeys.length !== keys.length) return false;
    for (const key of keys) {
      const descriptor = descriptors[key];
      if (descriptor === undefined || !descriptor.enumerable || !("value" in descriptor) || hasLoneSurrogate(key)) return false;
      rawBytes += encoder.encode(key).byteLength;
      if (rawBytes > LIMITS.rawUtf8Bytes || scalarCount(key) > LIMITS.scalarsPerString) return false;
      const childPath = `${path}/${escapePointer(key)}`;
      entries.push({ domain: "key", path: childPath, value: key });
      if (!visit(descriptor.value, childPath, depth + 1)) return false;
    }
    return true;
  }

  return visit(value, "", 0) ? { ok: true, entries } : { ok: false, path: "" };
}

function hasInvalidControl(value: string): boolean {
  for (const character of value) {
    const codePoint = character.codePointAt(0);
    if (codePoint !== undefined && ((codePoint <= 0x09) || (codePoint >= 0x0b && codePoint <= 0x1f) || codePoint === 0x7f)) return true;
  }
  return false;
}

function project(value: string, projection: string): string | undefined {
  const normalized = value.normalize("NFKC");
  if (new TextEncoder().encode(normalized).byteLength > LIMITS.normalizedUtf8Bytes) return undefined;
  return projection === "key-nfkc-ascii-fold-strip-v3"
    ? normalized.toLowerCase().replace(/[^a-z0-9_]/g, "")
    : normalized;
}

export function compileProtectedDataRegistryV1(
  registry: unknown,
  runtime: RuntimeTupleV1 = currentRuntime(),
): CompiledProtectedDataClassifierV1 | undefined {
  if (!runtimeMatches(runtime) || JSON.stringify(registry) !== selectedRegistrySemanticTransport) {
    return undefined;
  }
  try {
    const rules = parseRegistry(registry);
    if (!isRecord(registry) || !isRecord(registry.definitions) || !isRecord(registry.gapSetDefinitions)) return undefined;
    const grammarDefinitions = registry.definitions;
    const gapDefinitions = registry.gapSetDefinitions;
    return Object.freeze({
      identity: selectedProtectedDataRegistryIdentityV1,
      classify(value: unknown): ProtectedDataClassificationV1 {
        const traversal = preflight(value);
        if (!traversal.ok) return { kind: "unsupported_value", path: traversal.path };
        for (const entry of traversal.entries) {
          if (hasInvalidControl(entry.value)) return { kind: "invalid_control", path: entry.path };
          for (const rule of rules) {
            if (rule.targetDomain !== "both" && rule.targetDomain !== entry.domain) continue;
            const projected = project(entry.value, rule.inputProjectionId);
            if (projected === undefined) return { kind: "unsupported_value", path: entry.path };
            try {
              if (ruleMatches(rule, projected, grammarDefinitions, gapDefinitions, false)) {
                return {
                  kind: "protected_match",
                  category: rule.category,
                  priority: rule.priority,
                  ruleId: rule.ruleId,
                  targetDomain: rule.targetDomain,
                  path: entry.path,
                };
              }
              if (ruleMatches(rule, projected, grammarDefinitions, gapDefinitions, true)) {
                return { kind: "unsupported_value", path: entry.path };
              }
            } catch (error) {
              if (error instanceof MatcherOverflowError || error instanceof UnsupportedRegistryError) {
                return { kind: "unsupported_value", path: entry.path };
              }
              return { kind: "unsupported_value", path: entry.path };
            }
          }
        }
        return { kind: "allow" };
      },
    });
  } catch {
    return undefined;
  }
}

const compiled = compileProtectedDataRegistryV1(selectedRegistry);
if (compiled === undefined) {
  throw new Error("The selected protected-data registry or runtime is invalid.");
}

export const protectedDataClassifierV1 = compiled;
