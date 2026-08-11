import selectedProfileSource from "./context-integrity-profile.v2_0.json";

import { canonicalJsonHash, type ReadonlyJsonObject } from "@/ai/canonical-json";
import {
  protectedDataClassifierV1,
  selectedProtectedDataRegistryIdentityV1,
} from "@/ai/context/protected-data";
import {
  aiErrorCodes,
  aiFailure,
  aiSuccess,
  type AiErrorCode,
  type AiServiceResult,
} from "@/ai/errors";

type PlainJson = null | boolean | number | string | PlainJson[] | { [key: string]: PlainJson };
type DomainId =
  | "closed_container"
  | "machine_structural_integrity"
  | "protected_human_business_provider_evidence";
type AssignmentNode = "object" | "array" | "scalar" | "json_subtree";
type PatternToken = { readonly kind: "literal"; readonly value: string } |
  { readonly kind: "index" } | { readonly kind: "recursive" };

interface CompiledAssignment {
  readonly pattern: string;
  readonly tokens: readonly PatternToken[];
  readonly domain: DomainId;
  readonly node: AssignmentNode;
  readonly validator: string;
  readonly scanRoot: boolean;
}

interface CompiledValidationAuthority {
  readonly assignments: readonly CompiledAssignment[];
  readonly useCases: readonly string[];
  readonly targetTypes: readonly string[];
  readonly sourceClasses: readonly string[];
  readonly sourceFieldAllowlists: Readonly<Record<string, readonly string[]>>;
}

export interface DraftContextIntegrityProductV1 {
  readonly identity: {
    readonly profileId: string;
    readonly profileVersion: string;
    readonly sha256: string;
  };
  readonly summary: {
    readonly assignmentCount: 35;
    readonly domainCount: 3;
    readonly errorCodeCount: 69;
    readonly claimedReplayStepCount: 14;
  };
  validateContext(value: unknown): AiServiceResult<true>;
}

const selectedTraversalCodes = [
  "context_provenance_mismatch",
  "context_prohibited_data",
  "context_too_large",
  "canonicalization_failed",
  "internal_failure",
] as const satisfies readonly AiErrorCode[];

const expectedProfileId =
  "cwt.phase1b.stage4a.phaseb.corrected-design.v1_10.v18-m01-m03-attempt-2.v1";
const expectedProfileVersion = "2.0.0";
const expectedProfileSha256 = "efdec023f886a9ca9d1a558bfba0e54781292e0e8215609c4b68a68268caba01";
const expectedProfileKeys = [
  "associationIntegrity", "authority", "compiledAuthority", "compilerContract",
  "contextNodeAssignments", "decision", "domains", "errorTaxonomy", "executionOrders",
  "persistence", "phaseBoundary", "profileId", "profileVersion", "promptProjections",
  "protectedClassifier", "providerLeakDenyPrefixes", "recursiveEvidenceGrammar",
  "sourceFieldAllowlists", "status", "traversalAuthority",
] as const;

class ProfileCompilationFailure extends Error {}
class ContextValidationFailure extends Error {
  constructor(readonly code: (typeof selectedTraversalCodes)[number]) {
    super(code);
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function copyPlainJson(value: unknown, path = "profile"): PlainJson {
  if (value === null || typeof value === "boolean" || typeof value === "string") return value;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (Array.isArray(value)) return value.map((member, index) => copyPlainJson(member, `${path}/${index}`));
  if (!isRecord(value) || Object.getPrototypeOf(value) !== Object.prototype) {
    throw new ProfileCompilationFailure(`non_plain:${path}`);
  }
  const copy: { [key: string]: PlainJson } = {};
  for (const [key, member] of Object.entries(value)) {
    if (key === "__proto__" || key === "prototype" || key === "constructor") {
      throw new ProfileCompilationFailure(`unsafe_key:${path}/${key}`);
    }
    copy[key] = copyPlainJson(member, `${path}/${key}`);
  }
  return copy;
}

function freezeRecursively<T extends PlainJson>(value: T): T {
  if (value !== null && typeof value === "object") {
    for (const member of Array.isArray(value) ? value : Object.values(value)) freezeRecursively(member);
    Object.freeze(value);
  }
  return value;
}

function exactKeys(value: Record<string, unknown>, expected: readonly string[]): boolean {
  const actual = Object.keys(value).sort();
  const sortedExpected = [...expected].sort();
  return actual.length === sortedExpected.length &&
    actual.every((key, index) => key === sortedExpected[index]);
}

function exactOrderedKeys(value: Record<string, unknown>, expected: readonly string[]): boolean {
  const actual = Object.keys(value);
  return actual.length === expected.length && actual.every((key, index) => key === expected[index]);
}

function stringArray(value: unknown): readonly string[] | undefined {
  return Array.isArray(value) && value.every((member) => typeof member === "string")
    ? value : undefined;
}

function tokenizePattern(pattern: string): readonly PatternToken[] {
  if (pattern === "/") return Object.freeze([]);
  if (!pattern.startsWith("/") || pattern.endsWith("/")) throw new ProfileCompilationFailure("pattern_shape");
  const segments = pattern.slice(1).split("/");
  const tokens = segments.map<PatternToken>((segment, index) => {
    if (segment === "*") return Object.freeze({ kind: "index" });
    if (segment === "**") {
      if (index !== segments.length - 1) throw new ProfileCompilationFailure("recursive_not_final");
      return Object.freeze({ kind: "recursive" });
    }
    if (segment.length === 0 || segment.includes("~")) throw new ProfileCompilationFailure("pattern_literal");
    return Object.freeze({ kind: "literal", value: segment });
  });
  return Object.freeze(tokens);
}

function assignmentMatches(tokens: readonly PatternToken[], path: readonly string[]): boolean {
  const recursive = tokens.at(-1)?.kind === "recursive";
  const fixedLength = recursive ? tokens.length - 1 : tokens.length;
  if ((!recursive && path.length !== fixedLength) || (recursive && path.length < fixedLength)) return false;
  for (let index = 0; index < fixedLength; index += 1) {
    const token = tokens[index];
    const segment = path[index];
    if (token === undefined || segment === undefined) return false;
    if (token.kind === "literal" && token.value !== segment) return false;
    if (token.kind === "index" && !/^(?:0|[1-9][0-9]*)$/.test(segment)) return false;
  }
  return true;
}

function profileRecord(value: PlainJson, name: string): Record<string, PlainJson> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new ProfileCompilationFailure(`${name}_record`);
  }
  return value;
}

function profileArray(value: PlainJson, name: string): readonly PlainJson[] {
  if (!Array.isArray(value)) throw new ProfileCompilationFailure(`${name}_array`);
  return value;
}

function profileMember(profile: Record<string, PlainJson>, key: string): PlainJson {
  const value = profile[key];
  if (value === undefined) throw new ProfileCompilationFailure(`missing_${key}`);
  return value;
}

function compileAssignments(profile: Record<string, PlainJson>): readonly CompiledAssignment[] {
  const values = profileArray(profileMember(profile, "contextNodeAssignments"), "assignments");
  if (values.length !== 35) throw new ProfileCompilationFailure("assignment_count");
  const patterns = new Set<string>();
  const compiled = values.map((value, index): CompiledAssignment => {
    const assignment = profileRecord(value, `assignment_${index}`);
    if (!exactKeys(assignment, ["domain", "node", "pattern", "validator", ...(assignment.scanRoot === undefined ? [] : ["scanRoot"])])) {
      throw new ProfileCompilationFailure(`assignment_keys_${index}`);
    }
    const domain = assignment.domain;
    const node = assignment.node;
    const pattern = assignment.pattern;
    const validator = assignment.validator;
    if ((domain !== "closed_container" && domain !== "machine_structural_integrity" &&
      domain !== "protected_human_business_provider_evidence") ||
      (node !== "object" && node !== "array" && node !== "scalar" && node !== "json_subtree") ||
      typeof pattern !== "string" || typeof validator !== "string" || patterns.has(pattern) ||
      (assignment.scanRoot !== undefined && assignment.scanRoot !== true)) {
      throw new ProfileCompilationFailure(`assignment_value_${index}`);
    }
    patterns.add(pattern);
    return Object.freeze({
      pattern,
      tokens: tokenizePattern(pattern),
      domain,
      node,
      validator,
      scanRoot: assignment.scanRoot === true,
    });
  });
  return Object.freeze(compiled);
}

function assertErrorClosure(profile: Record<string, PlainJson>): void {
  const taxonomy = profileRecord(profileMember(profile, "errorTaxonomy"), "error_taxonomy");
  const codes = profileArray(profileMember(taxonomy, "codes"), "error_codes");
  const traversalCodes = stringArray(profileMember(taxonomy, "traversalReturnCodes"));
  if (codes.length !== 69 || aiErrorCodes.length !== 69 || traversalCodes === undefined ||
    traversalCodes.length !== selectedTraversalCodes.length ||
    traversalCodes.some((code, index) => code !== selectedTraversalCodes[index])) {
    throw new ProfileCompilationFailure("error_closure_count_or_subset");
  }
  for (const [index, code] of aiErrorCodes.entries()) {
    const expected = profileRecord(codes[index]!, `error_${index}`);
    const runtime = aiFailure(code);
    if (runtime.ok || !exactKeys(expected, ["category", "code", "manualEditorAvailable", "retryable"]) ||
      expected.code !== code || expected.category !== runtime.error.category ||
      expected.retryable !== runtime.error.retryable ||
      expected.manualEditorAvailable !== runtime.error.manualEditorAvailable ||
      runtime.error.safeMessage !== "AI assistance is unavailable.") {
      throw new ProfileCompilationFailure(`error_projection_${index}`);
    }
  }
}

function compileProfile(source: unknown): DraftContextIntegrityProductV1 {
  const detached = freezeRecursively(copyPlainJson(source));
  const profile = profileRecord(detached, "profile");
  if (!exactKeys(profile, expectedProfileKeys) || profile.profileId !== expectedProfileId ||
    profile.profileVersion !== expectedProfileVersion) throw new ProfileCompilationFailure("profile_identity");
  const authority = profileRecord(profileMember(profile, "compiledAuthority"), "compiled_authority");
  const projectionKeys = stringArray(profileMember(authority, "identityProjectionKeys"));
  if (authority.algorithm !== "sha256" || authority.canonicalization !== "RFC8785-JCS-accepted-domain" ||
    authority.expectedSha256 !== expectedProfileSha256 || projectionKeys === undefined) {
    throw new ProfileCompilationFailure("compiled_authority");
  }
  const projection: Record<string, PlainJson> = {};
  for (const key of projectionKeys) {
    const member = profile[key];
    if (member === undefined) throw new ProfileCompilationFailure(`projection_${key}`);
    projection[key] = member;
  }
  const profileHash = canonicalJsonHash(projection as ReadonlyJsonObject);
  if (!profileHash.ok || profileHash.value.hash !== expectedProfileSha256) {
    throw new ProfileCompilationFailure("profile_hash");
  }
  const domains = profileArray(profileMember(profile, "domains"), "domains");
  if (domains.length !== 3 || domains.map((domain) => profileRecord(domain, "domain").id).join(",") !==
    "closed_container,machine_structural_integrity,protected_human_business_provider_evidence") {
    throw new ProfileCompilationFailure("domains");
  }
  const protectedClassifier = profileRecord(
    profileMember(profile, "protectedClassifier"),
    "protected_classifier",
  );
  if (protectedClassifier.registryId !== selectedProtectedDataRegistryIdentityV1.registryId ||
    protectedClassifier.registryVersion !== selectedProtectedDataRegistryIdentityV1.registryVersion ||
    protectedClassifier.sha256 !== selectedProtectedDataRegistryIdentityV1.sha256 ||
    protectedClassifier.secondClassifierAllowed !== false ||
    protectedClassifier.consumerExceptionAllowed !== false) {
    throw new ProfileCompilationFailure("protected_classifier");
  }
  assertErrorClosure(profile);
  const orders = profileRecord(profileMember(profile, "executionOrders"), "execution_orders");
  const claimedReplay = profileArray(profileMember(orders, "claimedReplay"), "claimed_replay");
  if (claimedReplay.length !== 14 || claimedReplay.map((step) => profileRecord(step, "step").id).join(",") !==
    Array.from({ length: 14 }, (_, index) => `CR-${String(index + 1).padStart(2, "0")}`).join(",")) {
    throw new ProfileCompilationFailure("claimed_replay_order");
  }
  const prompts = profileRecord(profileMember(profile, "promptProjections"), "prompt_projections");
  const deniedPrefixes = stringArray(profileMember(profile, "providerLeakDenyPrefixes"));
  if (Object.keys(prompts).length !== 4 || deniedPrefixes === undefined ||
    Object.values(prompts).some((projection) => Object.values(profileRecord(projection, "prompt_projection"))
      .some((pointer) => typeof pointer !== "string" || deniedPrefixes.some((prefix) => pointer.startsWith(prefix))))) {
    throw new ProfileCompilationFailure("prompt_projection_leak");
  }
  const assignments = compileAssignments(profile);
  const associationIntegrity = profileRecord(
    profileMember(profile, "associationIntegrity"),
    "association_integrity",
  );
  const authorizedVariants = profileRecord(
    profileMember(associationIntegrity, "authorizedSnapshotVariants"),
    "authorized_snapshot_variants",
  );
  const rawAllowlists = profileRecord(
    profileMember(profile, "sourceFieldAllowlists"),
    "source_field_allowlists",
  );
  const sourceFieldAllowlists: Record<string, readonly string[]> = {};
  for (const [sourceClass, fields] of Object.entries(rawAllowlists)) {
    const fieldNames = stringArray(fields);
    if (fieldNames === undefined || fieldNames.length === 0 || new Set(fieldNames).size !== fieldNames.length) {
      throw new ProfileCompilationFailure(`source_field_allowlist_${sourceClass}`);
    }
    sourceFieldAllowlists[sourceClass] = Object.freeze([...fieldNames]);
  }
  const validationAuthority = Object.freeze({
    assignments,
    useCases: Object.freeze(Object.keys(prompts).sort()),
    targetTypes: Object.freeze(Object.keys(authorizedVariants).sort()),
    sourceClasses: Object.freeze(Object.keys(sourceFieldAllowlists).sort()),
    sourceFieldAllowlists: Object.freeze(sourceFieldAllowlists),
  });

  const identity = Object.freeze({
    profileId: expectedProfileId,
    profileVersion: expectedProfileVersion,
    sha256: expectedProfileSha256,
  });
  const summary = Object.freeze({
    assignmentCount: 35 as const,
    domainCount: 3 as const,
    errorCodeCount: 69 as const,
    claimedReplayStepCount: 14 as const,
  });

  const product: DraftContextIntegrityProductV1 = {
    identity,
    summary,
    validateContext(value) {
      try {
        validateContextWithAssignments(value, validationAuthority);
        return aiSuccess(true);
      } catch (error) {
        return error instanceof ContextValidationFailure
          ? aiFailure(error.code)
          : aiFailure("internal_failure");
      }
    },
  };
  return Object.freeze(product);
}

function failContext(code: (typeof selectedTraversalCodes)[number]): never {
  throw new ContextValidationFailure(code);
}

function nodeKind(value: unknown): AssignmentNode {
  if (Array.isArray(value)) return "array";
  if (typeof value === "object" && value !== null) return "object";
  return "scalar";
}

function strictObject(value: unknown): value is Record<string, unknown> {
  if (!isRecord(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) return false;
  const keys = Object.keys(value);
  const ownKeys = Reflect.ownKeys(value);
  const descriptors = Object.getOwnPropertyDescriptors(value);
  return ownKeys.length === keys.length && keys.every((key) => {
    const descriptor = descriptors[key];
    return descriptor !== undefined && descriptor.enumerable && "value" in descriptor;
  });
}

function sourceAt(root: Record<string, unknown>, path: readonly string[]): Record<string, unknown> | undefined {
  const sources = root.sources;
  const sourceIndex = Number(path[1]);
  const source = Array.isArray(sources) ? sources[sourceIndex] : undefined;
  return strictObject(source) ? source : undefined;
}

function fieldAt(root: Record<string, unknown>, path: readonly string[]): Record<string, unknown> | undefined {
  const source = sourceAt(root, path);
  const fields = source?.fields;
  const fieldIndex = Number(path[3]);
  const field = Array.isArray(fields) ? fields[fieldIndex] : undefined;
  return strictObject(field) ? field : undefined;
}

function validateClosedContainer(
  validator: string,
  value: unknown,
  root: Record<string, unknown>,
  path: readonly string[],
): void {
  if (validator === "context_root_exact_keys") {
    if (!strictObject(value) || !exactKeys(value, [
      "version", "applicationClass", "capability", "useCase", "locale", "association",
      "task", "sources", "internalLinkCandidates", "mediaPlacementRefs",
    ])) failContext("context_provenance_mismatch");
    return;
  }
  if (validator === "association_exact_keys") {
    if (!strictObject(value) || !exactOrderedKeys(value, [
      "kind", "targetType", "targetAlias", "expectedVersion", "snapshotHash",
    ])) failContext("context_provenance_mismatch");
    return;
  }
  if (validator === "task_exact_use_case_keys") {
    if (!strictObject(value)) failContext("context_provenance_mismatch");
    const optional = root.useCase === "seo_content_draft" ? ["pageIntent", "primaryPhrase"] :
      root.useCase === "fabric_knowledge_draft" ? ["topic"] :
        root.useCase === "sourcing_guide_draft" ? ["guideIntent"] : [];
    if (!exactKeys(value, ["tone", ...Object.keys(value).filter((key) => optional.includes(key))]) ||
      Object.keys(value).some((key) => key !== "tone" && !optional.includes(key))) {
      failContext("context_provenance_mismatch");
    }
    return;
  }
  if (validator === "source_entry_exact_keys") {
    if (!strictObject(value) || !exactOrderedKeys(value, ["alias", "sourceClass", "selectedBy", "fields"])) {
      failContext("context_provenance_mismatch");
    }
    return;
  }
  if (validator === "source_field_exact_keys") {
    if (!strictObject(value) || !exactOrderedKeys(value, ["field", "ref", "provenance", "value"])) {
      failContext("context_provenance_mismatch");
    }
    return;
  }
  if (validator === "internal_link_exact_keys") {
    if (!strictObject(value) || !exactOrderedKeys(value, ["candidateRef", "label"])) {
      failContext("context_provenance_mismatch");
    }
    return;
  }
  if (!Array.isArray(value)) failContext("context_provenance_mismatch");
  if ((validator === "array:max32_ordered" && value.length > 32) ||
    (validator === "array:1..32_ordered" && (value.length < 1 || value.length > 32))) {
    failContext("context_provenance_mismatch");
  }
  if (path.length === 1 && path[0] === "sources" && value !== root.sources) {
    failContext("context_provenance_mismatch");
  }
}

function validateMachine(
  validator: string,
  value: unknown,
  root: Record<string, unknown>,
  path: readonly string[],
  authority: CompiledValidationAuthority,
): void {
  let valid = false;
  if (validator.startsWith("literal:")) {
    const literal = validator.slice("literal:".length);
    valid = literal === "1" ? value === 1 : value === literal;
  } else if (validator === "enum:production_use_cases_4") {
    valid = typeof value === "string" && authority.useCases.includes(value);
  } else if (validator === "enum:draft_target_types_3") {
    valid = typeof value === "string" && authority.targetTypes.includes(value);
  }
  else if (validator === "enum:task_tones_2") {
    valid = value === "concise_professional_b2b" || value === "neutral_editorial";
  } else if (validator === "enum:source_classes_4") {
    valid = typeof value === "string" && authority.sourceClasses.includes(value);
  }
  else if (validator === "enum:structural_provided_verified") {
    valid = value === "structural" || value === "provided" || value === "verified";
  } else if (validator === "integer:1..2147483647") {
    valid = typeof value === "number" && Number.isInteger(value) && value >= 1 && value <= 2_147_483_647;
  } else if (validator === "recomputed_sha256_lowercase_hex_64") {
    valid = typeof value === "string" && /^[0-9a-f]{64}$/.test(value);
  } else if (validator.startsWith("sequential_source_alias:")) {
    valid = value === `src_${String(Number(path[1]) + 1).padStart(2, "0")}`;
  } else if (validator === "exact_alias_colon_field_ref") {
    const source = sourceAt(root, path);
    const field = fieldAt(root, path);
    valid = typeof value === "string" && value === `${String(source?.alias)}:${String(field?.field)}`;
  } else if (validator.startsWith("unique_opaque_ref:^link_")) {
    const values = root.internalLinkCandidates;
    valid = typeof value === "string" && /^link_[0-9]{2}$/.test(value) && Array.isArray(values) &&
      values.filter(strictObject).filter((candidate) => candidate.candidateRef === value).length === 1;
  } else if (validator.startsWith("unique_opaque_ref:^media_")) {
    const values = root.mediaPlacementRefs;
    valid = typeof value === "string" && /^media_[0-9]{2}$/.test(value) && Array.isArray(values) &&
      values.filter((candidate) => candidate === value).length === 1;
  }
  if (!valid) failContext("context_provenance_mismatch");
}

function validateProtected(
  assignment: CompiledAssignment,
  value: unknown,
  root: Record<string, unknown>,
  path: readonly string[],
  authority: CompiledValidationAuthority,
  protectedRoots: unknown[],
): void {
  if (assignment.validator === "source_class_field_allowlist_and_identifier") {
    const source = sourceAt(root, path);
    const allowed = typeof source?.sourceClass === "string"
      ? authority.sourceFieldAllowlists[source.sourceClass] : undefined;
    if (typeof value !== "string" || !/^[a-z][A-Za-z0-9_]{0,63}$/.test(value) ||
      allowed?.includes(value) !== true) {
      failContext("context_provenance_mismatch");
    }
  }
  if (assignment.validator.startsWith("bounded_text:")) {
    const limits = /^bounded_text:([0-9]+)_scalars_([0-9]+)_utf8$/.exec(assignment.validator);
    const scalars = Number(limits?.[1]);
    const bytes = Number(limits?.[2]);
    if (typeof value !== "string" || value.trim().length === 0 || Array.from(value).length > scalars ||
      Buffer.byteLength(value, "utf8") > bytes) failContext("context_provenance_mismatch");
  }
  const recursiveRootLength = assignment.tokens.at(-1)?.kind === "recursive"
    ? assignment.tokens.length - 1 : assignment.tokens.length;
  if (!assignment.scanRoot || path.length !== recursiveRootLength) return;
  protectedRoots.push(value);
}

function validateContextWithAssignments(
  value: unknown,
  authority: CompiledValidationAuthority,
): void {
  if (!strictObject(value)) failContext("context_provenance_mismatch");
  const root = value;
  const seen = new Set<object>();
  const protectedRoots: unknown[] = [];
  let nodes = 0;

  function visit(current: unknown, path: readonly string[], depth: number): void {
    nodes += 1;
    if (nodes > 4_096 || depth > 16) failContext("context_too_large");
    const matching = authority.assignments.filter((assignment) => assignmentMatches(assignment.tokens, path));
    if (matching.length !== 1) failContext("context_provenance_mismatch");
    const assignment = matching[0]!;
    const actualKind = nodeKind(current);
    if (assignment.node !== "json_subtree" && assignment.node !== actualKind) {
      failContext("context_provenance_mismatch");
    }
    if (assignment.domain === "closed_container") {
      validateClosedContainer(assignment.validator, current, root, path);
    } else if (assignment.domain === "machine_structural_integrity") {
      validateMachine(assignment.validator, current, root, path, authority);
    } else {
      validateProtected(assignment, current, root, path, authority, protectedRoots);
    }
    if (current === null || typeof current === "boolean" || typeof current === "string") return;
    if (typeof current === "number") {
      if (!Number.isFinite(current)) failContext("context_provenance_mismatch");
      return;
    }
    if (typeof current !== "object" || seen.has(current)) failContext("context_provenance_mismatch");
    seen.add(current);
    if (Array.isArray(current)) {
      if (Object.getPrototypeOf(current) !== Array.prototype) failContext("context_provenance_mismatch");
      const descriptors = Object.getOwnPropertyDescriptors(current);
      const ownKeys = Reflect.ownKeys(current);
      if (ownKeys.length !== current.length + 1 || ownKeys.some((key) =>
        key !== "length" && (typeof key !== "string" || !/^(?:0|[1-9][0-9]*)$/.test(key) ||
          Number(key) >= current.length))) failContext("context_provenance_mismatch");
      for (let index = 0; index < current.length; index += 1) {
        const descriptor = descriptors[index];
        if (descriptor === undefined || !descriptor.enumerable || !("value" in descriptor)) {
          failContext("context_provenance_mismatch");
        }
        visit(descriptor.value, [...path, String(index)], depth + 1);
      }
      return;
    }
    if (!strictObject(current)) failContext("context_provenance_mismatch");
    for (const key of Object.keys(current)) visit(current[key], [...path, key], depth + 1);
  }

  visit(root, [], 0);
  const bytes = JSON.stringify(root);
  if (Buffer.byteLength(bytes, "utf8") > 65_536) failContext("context_too_large");
  for (const protectedRoot of protectedRoots) {
    const classified = protectedDataClassifierV1.classify(protectedRoot);
    if (classified.kind !== "allow") failContext("context_prohibited_data");
  }
}

export const draftContextIntegrityV1 = compileProfile(selectedProfileSource);
