import { createHash } from "node:crypto";
import { execFileSync, spawnSync } from "node:child_process";
import {
  existsSync,
  lstatSync,
  mkdtempSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  realpathSync,
  renameSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { dirname, extname, posix, relative, resolve, sep } from "node:path";
import ts from "typescript";

const profilePath = "test-fixtures/ai-architecture/graph-faults.v3_1.json";
const expectedProfileFileHash = "fbda9c643ce2697474b361d93459f89f3c417ec7d96dcbb98c17cdeaa924d708";
const expectedProfileIntegrityHash = "8341c1372c035db305f5ab16c99fbffdcbc9651854abca794d287a6868fe433e";
const m03SeamIdentity = "1f0b56a870ecbab61c970e1c7000dff591674e0f8ad0a04341538c724a36c173";
const repositoryRoot = realpathSync(process.cwd());
const profileBytes = readFileSync(resolve(repositoryRoot, profilePath));

function sha256(value: string | Uint8Array): string {
  return createHash("sha256").update(value).digest("hex");
}

function fail(reason: string): never {
  throw new Error(`AI architecture gate failed closed: ${reason}`);
}

if (sha256(profileBytes) !== expectedProfileFileHash) fail("current V3.1 profile/fixture hash mismatch");
const rawProfileBundle: unknown = JSON.parse(profileBytes.toString("utf8"));

type PlainJson = null | boolean | number | string | PlainJson[] | { [key: string]: PlainJson };

function copyPlainJson(value: unknown, path = "profile"): PlainJson {
  if (value === null || typeof value === "boolean" || typeof value === "string") return value;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (Array.isArray(value)) return value.map((member, index) => copyPlainJson(member, `${path}/${index}`));
  if (typeof value !== "object" || value === null || Object.getPrototypeOf(value) !== Object.prototype) {
    fail(`non-plain V3.1 profile value at ${path}`);
  }
  const output: { [key: string]: PlainJson } = {};
  for (const [key, member] of Object.entries(value)) {
    if (key === "__proto__" || key === "prototype" || key === "constructor") {
      fail(`unsafe V3.1 profile key at ${path}/${key}`);
    }
    output[key] = copyPlainJson(member, `${path}/${key}`);
  }
  return output;
}

function freezePlainJson<T extends PlainJson>(value: T): T {
  if (value !== null && typeof value === "object") {
    for (const member of Array.isArray(value) ? value : Object.values(value)) freezePlainJson(member);
    Object.freeze(value);
  }
  return value;
}

const profileBundle = freezePlainJson(copyPlainJson(rawProfileBundle));

interface MatchDefinition {
  readonly files: readonly string[];
  readonly directories: readonly string[];
  readonly testSemantic: boolean;
  readonly excludeFiles: readonly string[];
  readonly excludeDirectories: readonly string[];
  readonly excludeTestSemantic: boolean;
}

interface RootClassDefinition {
  readonly id: string;
  readonly match: MatchDefinition;
  readonly stageStatus: string;
  readonly bundleZones: readonly string[];
}

interface ArchitectureProfile {
  readonly profileId: string;
  readonly profileVersion: string;
  readonly filesystemEnumeration: {
    readonly excludedPhysicalRoots: readonly string[];
    readonly executableExtensions: readonly string[];
    readonly protectedResourceExtensions: readonly string[];
    readonly protectedResourceRoots: readonly string[];
    readonly rootControlFiles: readonly string[];
    readonly testDirectoryRoots: readonly string[];
    readonly testSuffixes: readonly string[];
  };
  readonly classificationModel: {
    readonly rootClasses: readonly RootClassDefinition[];
    readonly classCountInvariant: number;
  };
  readonly resourceAndGeneratedPolicy: {
    readonly productionGeneratedFiles: readonly string[];
    readonly generatedRoots: readonly string[];
    readonly generatedExecutableSuffixes: readonly string[];
    readonly syntheticResourceRoots: readonly string[];
    readonly frameworkControlGeneratedContract: {
      readonly presentPath: string;
      readonly presentLengthBytes: number;
      readonly presentSha256: string;
      readonly presentUtf8Lines: readonly string[];
      readonly tsconfigIncludeRequired: string;
      readonly soleRootClass: string;
    };
  };
  readonly profileIntegrity: {
    readonly algorithm: string;
    readonly coveredJsonPointers: readonly string[];
    readonly sha256: string;
  };
  readonly proofArtifactContracts: {
    readonly schemaVersion: number;
    readonly canonicalJson: boolean;
    readonly commonRequired: readonly string[];
    readonly atomicEmission: string;
    readonly [filename: string]: unknown;
  };
  readonly deniedProductionCapabilityOrigins: PlainJson;
}

function parseProfile(value: unknown): ArchitectureProfile {
  if (typeof value !== "object" || value === null) fail("profile is not an object");
  const candidate = value as Partial<ArchitectureProfile>;
  if (candidate.profileId !== "cwt.phase1b.stage4a.phaseb.m04-static-capability-boundary.v3_1_candidate" ||
    candidate.profileVersion !== "3.1.0-candidate" || candidate.classificationModel === undefined ||
    candidate.filesystemEnumeration === undefined || candidate.resourceAndGeneratedPolicy === undefined) {
    fail("profile identity or required section mismatch");
  }
  return candidate as ArchitectureProfile;
}

if (typeof profileBundle !== "object" || profileBundle === null || Array.isArray(profileBundle) ||
  profileBundle.schemaVersion !== 31 || typeof profileBundle.profile !== "object" ||
  profileBundle.profile === null || Array.isArray(profileBundle.profile) ||
  !Array.isArray(profileBundle.faultCases) || !Array.isArray(profileBundle.positiveCases) ||
  !Array.isArray(profileBundle.topologyCases) ||
  JSON.stringify(Object.keys(profileBundle).sort()) !==
    JSON.stringify(["faultCases", "positiveCases", "profile", "schemaVersion", "topologyCases"])) {
  fail("V3.1 profile/fixture envelope is not exact");
}
const authority = parseProfile(profileBundle.profile);

function canonical(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  return `{${Object.entries(value).sort(([left], [right]) => left < right ? -1 : left > right ? 1 : 0)
    .map(([key, member]) => `${JSON.stringify(key)}:${canonical(member)}`).join(",")}}`;
}

if (authority.profileIntegrity.algorithm !== "sha256-jcs-selected-pointers-v1" ||
  authority.profileIntegrity.sha256 !== expectedProfileIntegrityHash) {
  fail("V3.1 profile integrity declaration mismatch");
}
const integrityProjection: Record<string, unknown> = {};
for (const pointer of authority.profileIntegrity.coveredJsonPointers) {
  if (!pointer.startsWith("/") || pointer.slice(1).includes("/")) fail(`unsupported profile pointer ${pointer}`);
  const key = pointer.slice(1);
  if (!(key in authority)) fail(`missing covered profile pointer ${pointer}`);
  integrityProjection[pointer] = authority[key as keyof ArchitectureProfile];
}
if (sha256(canonical(integrityProjection)) !== expectedProfileIntegrityHash) {
  fail("V3.1 selected-pointer profile integrity mismatch");
}
const enumeration = authority.filesystemEnumeration;
const classDefinitions = authority.classificationModel.rootClasses;
if (classDefinitions.length !== 12 || authority.classificationModel.classCountInvariant !== 12) {
  fail("sealed primary-root class count is not 12");
}
const closedMatchFields = new Set([
  "files", "directories", "testSemantic", "excludeFiles", "excludeDirectories",
  "excludeTestSemantic",
]);
for (const definition of classDefinitions) {
  if (Object.keys(definition.match).some((key) => !closedMatchFields.has(key)) ||
    Object.keys(definition.match).length !== closedMatchFields.size) {
    fail(`unknown or missing selector field for ${definition.id}`);
  }
}

const excludedRoots = new Set(enumeration.excludedPhysicalRoots.map((path) => path.slice(0, -1)));
const excludedStatus: Record<string, "absent" | "present-not-walked"> = {};
const actualFiles: string[] = [];
const inodeOwners = new Map<string, string>();
const canonicalOwners = new Map<string, string>();

function posixPath(path: string): string {
  return path.split(sep).join("/");
}

function walk(directory: string, relativeDirectory: string): void {
  for (const name of readdirSync(directory).sort()) {
    const path = resolve(directory, name);
    const relativePath = posixPath(relative(repositoryRoot, path));
    if (relativeDirectory.length === 0 && excludedRoots.has(name)) {
      const stat = lstatSync(path);
      if (name === ".git") {
        if (!stat.isDirectory() && !stat.isFile()) fail(".git is neither directory nor worktree pointer");
      } else if (!stat.isDirectory()) fail(`excluded root ${name} is not a physical directory`);
      excludedStatus[`${name}/`] = "present-not-walked";
      continue;
    }
    const stat = lstatSync(path);
    if (stat.isSymbolicLink()) fail(`symlink encountered at ${relativePath}`);
    if (stat.isDirectory()) {
      walk(path, relativePath);
      continue;
    }
    if (!stat.isFile()) fail(`special filesystem node encountered at ${relativePath}`);
    const canonical = posixPath(relative(repositoryRoot, realpathSync(path)));
    if (canonical.startsWith("../") || canonical === "..") fail(`canonical escape at ${relativePath}`);
    const canonicalFold = canonical.normalize("NFC").toLocaleLowerCase("en-US");
    const existingCanonical = canonicalOwners.get(canonicalFold);
    if (existingCanonical !== undefined && existingCanonical !== relativePath) {
      fail(`canonical/case collision: ${existingCanonical} and ${relativePath}`);
    }
    canonicalOwners.set(canonicalFold, relativePath);
    const inode = `${stat.dev}:${stat.ino}`;
    const existingInode = inodeOwners.get(inode);
    if (existingInode !== undefined) fail(`hard-link alias: ${existingInode} and ${relativePath}`);
    inodeOwners.set(inode, relativePath);
    actualFiles.push(relativePath);
  }
}

for (const excluded of enumeration.excludedPhysicalRoots) excludedStatus[excluded] = "absent";
walk(repositoryRoot, "");
actualFiles.sort();

const executableExtensions = new Set(enumeration.executableExtensions);
const rootControls = new Set(enumeration.rootControlFiles);
function startsWithDirectory(path: string, directories: readonly string[]): boolean {
  return directories.some((directory) => path.startsWith(directory));
}
function isTestSemantic(path: string): boolean {
  return startsWithDirectory(path, enumeration.testDirectoryRoots) ||
    enumeration.testSuffixes.some((suffix) => path.endsWith(suffix));
}
function isProtectedResource(path: string): boolean {
  return enumeration.protectedResourceExtensions.includes(extname(path)) &&
    startsWithDirectory(path, enumeration.protectedResourceRoots);
}
const candidates = actualFiles.filter((path) =>
  executableExtensions.has(extname(path)) || rootControls.has(path) || isProtectedResource(path)
);

const tracked = new Set(execFileSync("git", ["ls-files", "-z"], { encoding: "utf8" })
  .split("\0").filter(Boolean));
const ignoredProcess = spawnSync("git", ["check-ignore", "--stdin", "-z", "--no-index"], {
  cwd: repositoryRoot,
  input: candidates.join("\0") + "\0",
  encoding: "utf8",
});
if (ignoredProcess.status !== 0 && ignoredProcess.status !== 1) fail("Git ignored-state query failed");
const ignoredOutput = ignoredProcess.stdout;
const ignored = new Set(ignoredOutput.split("\0").filter(Boolean));

function selectorMatches(path: string, selector: MatchDefinition): boolean {
  const positive = selector.files.includes(path) || startsWithDirectory(path, selector.directories) ||
    (selector.testSemantic && isTestSemantic(path));
  const negative = selector.excludeFiles.includes(path) || startsWithDirectory(path, selector.excludeDirectories) ||
    (selector.excludeTestSemantic && isTestSemantic(path));
  return positive && !negative;
}

class ExpectedMutationRejection extends Error {
  constructor(readonly code: string) {
    super(code);
  }
}

function rejectMutation(code: string): never {
  throw new ExpectedMutationRejection(code);
}

function requireSingleClass(
  path: string,
  definitions: readonly RootClassDefinition[],
): string {
  const matches = definitions.filter((definition) => selectorMatches(path, definition.match));
  if (matches.length === 0) rejectMutation("fail_closed_unclassified");
  if (matches.length > 1) rejectMutation("fail_closed_ambiguous");
  return matches[0]?.id ?? rejectMutation("fail_closed_unclassified");
}

function replaceDefinition(
  definitions: readonly RootClassDefinition[],
  id: string,
  update: (definition: RootClassDefinition) => RootClassDefinition,
): readonly RootClassDefinition[] {
  return definitions.map((definition) => definition.id === id ? update(definition) : definition);
}

function withoutFileDisposition(
  path: string,
  classId: string,
): readonly RootClassDefinition[] {
  return replaceDefinition(classDefinitions, classId, (definition) => ({
    ...definition,
    match: {
      ...definition.match,
      files: definition.match.files.filter((member) => member !== path),
      excludeFiles: [...definition.match.excludeFiles, path],
    },
  }));
}

function requireCandidateRetention(observedPaths: readonly string[], candidatePaths: readonly string[]): void {
  if (observedPaths.some((path) => !candidatePaths.includes(path))) {
    rejectMutation("fail_closed_lifecycle_candidate_missing");
  }
}

function requirePhysicalNode(input: {
  readonly kind: "file" | "directory" | "symlink";
  readonly canonicalEscape?: boolean;
  readonly inodeAlias?: boolean;
}): void {
  if (input.kind === "symlink") rejectMutation("fail_closed_symlink");
  if (input.canonicalEscape === true) rejectMutation("fail_closed_canonical_alias");
  if (input.inodeAlias === true) rejectMutation("fail_closed_hard_link_alias");
}

const expectedRootImports = [
  "server-only",
  "@/config/env",
  "@/db/client",
  "@/ai/config/trusted-phase-b-environment",
  "@/ai/applications/draft-assistance/composition",
] as const;

function requireExactRootImports(specifiers: readonly string[]): void {
  if (JSON.stringify(specifiers) !== JSON.stringify(expectedRootImports)) {
    rejectMutation("fail_closed_alias_import");
  }
}

function requireManifestedGeneratedCandidate(path: string, manifested: boolean): void {
  if (!manifested) rejectMutation(`fail_closed_unmanifested_generated:${path}`);
}

function requireCompositionCounts(input: {
  readonly phaseB: number;
  readonly phaseD: number;
  readonly adapter: number;
}): void {
  if (input.phaseB !== 1) rejectMutation("fail_closed_composition_count");
  if (input.phaseD !== 0) rejectMutation("fail_closed_early_phase_d");
  if (input.adapter !== 0) rejectMutation("fail_closed_early_adapter");
}

const sealedExcludedRoots = [
  ".git/", "node_modules/", ".next/", "coverage/", "playwright-report/", "test-results/",
  ".data/", ".storage/", "dist/", "build/", "tmp/",
] as const;

function requireSealedExcludedRoots(roots: readonly string[]): void {
  if (JSON.stringify(roots) !== JSON.stringify(sealedExcludedRoots)) {
    rejectMutation("fail_closed_sealed_exclusion_integrity");
  }
}

function requireFrameworkControl(input: {
  readonly bytesSha256: string;
  readonly text: string;
  readonly sourceState: "tracked" | "untracked-not-ignored" | "untracked-ignored";
  readonly classId: string;
  readonly tsconfigIncludesPath: boolean;
}): void {
  const contract = authority.resourceAndGeneratedPolicy.frameworkControlGeneratedContract;
  const expectedText = `${contract.presentUtf8Lines.join("\n")}\n`;
  if (input.bytesSha256 !== contract.presentSha256 || input.text !== expectedText ||
    input.sourceState !== "untracked-ignored" || input.classId !== contract.soleRootClass ||
    !input.tsconfigIncludesPath) {
    rejectMutation("fail_closed_framework_control_generated_mismatch");
  }
}

function requireNoDeletionPrerequisite(deletedBeforeProof: boolean): void {
  if (deletedBeforeProof) rejectMutation("fail_closed_deletion_prerequisite");
}

function requireGeneratedRootPhysical(input: {
  readonly physicalDirectory: boolean;
  readonly aliasOrEscape: boolean;
}): void {
  if (!input.physicalDirectory || input.aliasOrEscape) {
    rejectMutation("fail_closed_generated_root_bypass");
  }
}

interface MutationProbe {
  readonly id: string;
  readonly expectedCode: string;
  readonly run: () => void;
}

function exactFrameworkInput(): {
  readonly bytesSha256: string;
  readonly text: string;
  readonly sourceState: "untracked-ignored";
  readonly classId: string;
  readonly tsconfigIncludesPath: true;
} {
  const contract = authority.resourceAndGeneratedPolicy.frameworkControlGeneratedContract;
  return {
    bytesSha256: contract.presentSha256,
    text: `${contract.presentUtf8Lines.join("\n")}\n`,
    sourceState: "untracked-ignored",
    classId: contract.soleRootClass,
    tsconfigIncludesPath: true,
  };
}

const originalDispositionPaths = [
  "drizzle.config.ts",
  "playwright.config.ts",
  "vitest.config.mts",
] as const;
const originalTestDispositionPaths = [
  "tests/e2e/global-teardown.ts",
  "tests/e2e/product-import.spec.ts",
  "tests/e2e/public.spec.ts",
] as const;

const mutationProbes: MutationProbe[] = [
  {
    id: "v1.6-01-new-unclassified-executable",
    expectedCode: "fail_closed_unclassified",
    run: () => { requireSingleClass("unexpected-root.ts", classDefinitions); },
  },
  {
    id: "v1.6-02-two-class-overlap",
    expectedCode: "fail_closed_ambiguous",
    run: () => {
      const path = "scripts/verify-ai-architecture.ts";
      const mutated = replaceDefinition(classDefinitions, "other-project-tooling", (definition) => ({
        ...definition,
        match: { ...definition.match, excludeFiles: definition.match.excludeFiles.filter((member) => member !== path) },
      }));
      requireSingleClass(path, mutated);
    },
  },
  ...originalDispositionPaths.map((path, index): MutationProbe => ({
    id: `v1.6-${String(index + 3).padStart(2, "0")}-remove-disposition-${path}`,
    expectedCode: "fail_closed_unclassified",
    run: () => { requireSingleClass(path, withoutFileDisposition(path, "root-control-file")); },
  })),
  ...originalTestDispositionPaths.map((path, index): MutationProbe => ({
    id: `v1.6-${String(index + 6).padStart(2, "0")}-remove-disposition-${path}`,
    expectedCode: "fail_closed_unclassified",
    run: () => { requireSingleClass(path, withoutFileDisposition(path, "other-test-fixtures")); },
  })),
  {
    id: "v1.6-09-silent-physical-exclusion",
    expectedCode: "fail_closed_lifecycle_candidate_missing",
    run: () => { requireCandidateRetention(["src/ai/errors.ts"], []); },
  },
  {
    id: "v1.6-10-symlink",
    expectedCode: "fail_closed_symlink",
    run: () => { requirePhysicalNode({ kind: "symlink" }); },
  },
  {
    id: "v1.6-11-canonical-alias",
    expectedCode: "fail_closed_canonical_alias",
    run: () => { requirePhysicalNode({ kind: "file", canonicalEscape: true }); },
  },
  {
    id: "v1.6-12-alias-import",
    expectedCode: "fail_closed_alias_import",
    run: () => { requireExactRootImports([...expectedRootImports.slice(0, 4), "@/ai/applications/draft-assistance/composition/index"]); },
  },
  {
    id: "v1.6-13-unmanifested-generated-resource",
    expectedCode: "fail_closed_unmanifested_generated:src/ai/prompts/generated/unapproved.ts",
    run: () => { requireManifestedGeneratedCandidate("src/ai/prompts/generated/unapproved.ts", false); },
  },
  {
    id: "v1.6-14-early-phase-d",
    expectedCode: "fail_closed_early_phase_d",
    run: () => { requireCompositionCounts({ phaseB: 1, phaseD: 1, adapter: 0 }); },
  },
  {
    id: "v1.6-15-early-adapter",
    expectedCode: "fail_closed_early_adapter",
    run: () => { requireCompositionCounts({ phaseB: 1, phaseD: 0, adapter: 1 }); },
  },
  {
    id: "v1.6-16-second-composition-root",
    expectedCode: "fail_closed_composition_count",
    run: () => { requireCompositionCounts({ phaseB: 2, phaseD: 0, adapter: 0 }); },
  },
  {
    id: "v1.6-17-sealed-exclusion-integrity",
    expectedCode: "fail_closed_sealed_exclusion_integrity",
    run: () => { requireSealedExcludedRoots([...sealedExcludedRoots, "unreviewed/"]); },
  },
  {
    id: "attempt2-01-next-env-without-class",
    expectedCode: "fail_closed_unclassified",
    run: () => { requireSingleClass("next-env.d.ts", withoutFileDisposition("next-env.d.ts", "root-control-file")); },
  },
  {
    id: "attempt2-02-next-env-double-class",
    expectedCode: "fail_closed_ambiguous",
    run: () => {
      const mutated = replaceDefinition(classDefinitions, "other-production-src", (definition) => ({
        ...definition,
        match: { ...definition.match, files: [...definition.match.files, "next-env.d.ts"] },
      }));
      requireSingleClass("next-env.d.ts", mutated);
    },
  },
  {
    id: "attempt2-03-next-env-silent-ignore-or-exclude",
    expectedCode: "fail_closed_lifecycle_candidate_missing",
    run: () => { requireCandidateRetention(["next-env.d.ts"], []); },
  },
  {
    id: "attempt2-04-other-ignored-root-ts",
    expectedCode: "fail_closed_unclassified",
    run: () => { requireSingleClass("ignored-generated-control.ts", classDefinitions); },
  },
  {
    id: "attempt2-05-next-env-symlink",
    expectedCode: "fail_closed_symlink",
    run: () => { requirePhysicalNode({ kind: "symlink" }); },
  },
  {
    id: "attempt2-06-next-env-hard-link",
    expectedCode: "fail_closed_hard_link_alias",
    run: () => { requirePhysicalNode({ kind: "file", inodeAlias: true }); },
  },
  {
    id: "attempt2-07-next-env-generated-bytes",
    expectedCode: "fail_closed_framework_control_generated_mismatch",
    run: () => { requireFrameworkControl({ ...exactFrameworkInput(), bytesSha256: sha256("mutated") }); },
  },
  {
    id: "attempt2-08-next-env-generated-path",
    expectedCode: "fail_closed_unclassified",
    run: () => { requireSingleClass("nested/next-env.d.ts", classDefinitions); },
  },
  {
    id: "attempt2-09-next-env-type-reference",
    expectedCode: "fail_closed_framework_control_generated_mismatch",
    run: () => { requireFrameworkControl({ ...exactFrameworkInput(), text: '/// <reference types="next/mutated" />\n' }); },
  },
  {
    id: "attempt2-10-deletion-prerequisite",
    expectedCode: "fail_closed_deletion_prerequisite",
    run: () => { requireNoDeletionPrerequisite(true); },
  },
  {
    id: "attempt2-11-dot-next-generated-bypass",
    expectedCode: "fail_closed_generated_root_bypass",
    run: () => { requireGeneratedRootPhysical({ physicalDirectory: true, aliasOrEscape: true }); },
  },
];

const mutationResults = mutationProbes.map((probe) => {
  try {
    probe.run();
  } catch (error) {
    if (error instanceof ExpectedMutationRejection && error.code === probe.expectedCode) {
      return { id: probe.id, result: "fail-closed" as const, reason: error.code };
    }
    throw error;
  }
  fail(`mutation did not fail closed: ${probe.id}`);
});
if (mutationResults.length !== 28) fail("V1.6 plus Attempt-2 mutation count is not 28");

requireSealedExcludedRoots(enumeration.excludedPhysicalRoots);

interface ClassifiedNode {
  readonly path: string;
  readonly classId: string;
  readonly stageStatus: string;
  readonly bundleZones: readonly string[];
  readonly sourceState: "tracked" | "untracked-not-ignored" | "untracked-ignored";
  readonly contentSha256: string;
  readonly generated: boolean;
}

const zeroClass: string[] = [];
const ambiguous: string[] = [];
const classMembers = new Map(classDefinitions.map((definition) => [definition.id, [] as string[]]));
const nodes: ClassifiedNode[] = [];
for (const path of candidates) {
  const matches = classDefinitions.filter((definition) => selectorMatches(path, definition.match));
  if (matches.length === 0) { zeroClass.push(path); continue; }
  if (matches.length !== 1) { ambiguous.push(path); continue; }
  const [definition] = matches;
  if (definition === undefined) fail(`missing selector result for ${path}`);
  const generated = authority.resourceAndGeneratedPolicy.generatedRoots.some((root) => path.startsWith(root)) ||
    authority.resourceAndGeneratedPolicy.generatedExecutableSuffixes.some((suffix) => path.endsWith(suffix)) ||
    path === authority.resourceAndGeneratedPolicy.frameworkControlGeneratedContract.presentPath;
  const exactSyntheticGenerated = path ===
    "src/ai/testing/synthetic-prompts/synthetic-prompt-bundle.generated.ts" &&
    authority.resourceAndGeneratedPolicy.syntheticResourceRoots.some((root) => path.startsWith(root));
  if (generated && path !== "next-env.d.ts" &&
    !exactSyntheticGenerated && !authority.resourceAndGeneratedPolicy.productionGeneratedFiles.includes(path)) {
    fail(`unmanifested generated candidate ${path}`);
  }
  const sourceState = tracked.has(path)
    ? "tracked"
    : ignored.has(path) ? "untracked-ignored" : "untracked-not-ignored";
  classMembers.get(definition.id)?.push(path);
  nodes.push({
    path,
    classId: definition.id,
    stageStatus: definition.stageStatus,
    bundleZones: definition.bundleZones,
    sourceState,
    contentSha256: sha256(readFileSync(resolve(repositoryRoot, path))),
    generated,
  });
}
if (zeroClass.length > 0) fail(`unclassified candidates: ${zeroClass.join(", ")}`);
if (ambiguous.length > 0) fail(`ambiguous candidates: ${ambiguous.join(", ")}`);

if ((classMembers.get("phase-b-outer-composition")?.length ?? 0) !== 1) {
  fail("Phase B outer composition count is not exactly one");
}
if ((classMembers.get("phase-d-outer-composition-reserved")?.length ?? 0) !== 0) {
  fail("Phase D outer composition exists during Phase B");
}
if ((classMembers.get("future-provider-adapter-zone-reserved")?.length ?? 0) !== 0) {
  fail("Provider adapter zone exists during Phase B");
}

const nextContract = authority.resourceAndGeneratedPolicy.frameworkControlGeneratedContract;
const nextNode = nodes.find((node) => node.path === nextContract.presentPath);
const nextRoot = resolve(repositoryRoot, ".next");
if (nextNode !== undefined) {
  const bytes = readFileSync(resolve(repositoryRoot, nextContract.presentPath));
  const exactText = `${nextContract.presentUtf8Lines.join("\n")}\n`;
  if (bytes.byteLength !== nextContract.presentLengthBytes || sha256(bytes) !== nextContract.presentSha256 ||
    bytes.toString("utf8") !== exactText || nextNode.sourceState !== "untracked-ignored" ||
    nextNode.classId !== nextContract.soleRootClass) {
    fail("next-env.d.ts generated contract mismatch");
  }
  const tsconfig: unknown = JSON.parse(readFileSync(resolve(repositoryRoot, "tsconfig.json"), "utf8"));
  if (typeof tsconfig !== "object" || tsconfig === null || !("include" in tsconfig) ||
    !Array.isArray(tsconfig.include) || !tsconfig.include.includes(nextContract.tsconfigIncludeRequired)) {
    fail("tsconfig does not include next-env.d.ts");
  }
  const requiredGeneratedFiles = new Map([
    [".next/types/cache-life.d.ts", "d1986184a09a52db8228cb2bb2a61a8c05c9354e5b93cec8e2628d8579c892d7"],
    [".next/types/routes.d.ts", "e838150498c7e8464a1a0d7e25d7dfc79aa6f77358a8d83ac0aa7b28c5904fb4"],
    [".next/types/validator.ts", "8ed142360153811ab434bbd2f2486b0052d9d5bbdcf067d206fc8d7eb15f28df"],
  ]);
  if (excludedStatus[".next/"] !== "present-not-walked" || !lstatSync(nextRoot).isDirectory()) {
    fail(".next is not a physical directory");
  }
  const observedGeneratedFiles: string[] = [];
  function walkGenerated(directory: string): void {
    for (const name of readdirSync(directory).sort()) {
      const path = resolve(directory, name);
      const stat = lstatSync(path);
      const relativePath = posixPath(relative(repositoryRoot, path));
      if (stat.isSymbolicLink() || (!stat.isDirectory() && !stat.isFile())) {
        fail(`invalid generated-root node ${relativePath}`);
      }
      if (stat.isDirectory()) walkGenerated(path);
      else observedGeneratedFiles.push(relativePath);
    }
  }
  walkGenerated(nextRoot);
  if (JSON.stringify(observedGeneratedFiles) !== JSON.stringify([...requiredGeneratedFiles.keys()])) {
    fail(".next generated-root file set mismatch");
  }
  for (const [path, expectedHash] of requiredGeneratedFiles) {
    if (sha256(readFileSync(resolve(repositoryRoot, path))) !== expectedHash) {
      fail(`.next generated-root hash mismatch for ${path}`);
    }
  }
} else if (excludedStatus[".next/"] !== "absent") {
  fail("source-clean lifecycle has .next without next-env.d.ts");
}

const rootPath = "src/server/ai/phase-b-composition.ts";
const rootSource = readFileSync(resolve(repositoryRoot, rootPath), "utf8");

class ArchitectureGraphFailure extends Error {
  constructor(
    readonly code: string,
    readonly detail: string,
  ) {
    super(`${code}:${detail}`);
  }
}

function rejectGraph(code: string, detail: string): never {
  throw new ArchitectureGraphFailure(code, detail);
}

type GraphEdgeKind = "runtime" | "type-only" | "resource";
type GraphEdgeForm =
  | "import"
  | "re-export"
  | "import-type"
  | "resource-url";

interface ParsedAcquisitionV1 {
  readonly form: GraphEdgeForm;
  readonly edgeKind: GraphEdgeKind;
  readonly specifier?: string;
  readonly position: number;
  readonly nodeKind: string;
  readonly unsupportedReason?: string;
}

interface GraphEdgeV1 extends ParsedAcquisitionV1 {
  readonly from: string;
  readonly resolutionKind: "local" | "external" | "unsupported" | "unresolved";
  readonly resolvedTarget?: string;
  readonly externalPackage?: string;
}

function scriptKind(path: string): ts.ScriptKind {
  if (path.endsWith(".tsx") || path.endsWith(".jsx")) return ts.ScriptKind.TSX;
  if (path.endsWith(".js") || path.endsWith(".mjs") || path.endsWith(".cjs")) {
    return ts.ScriptKind.JS;
  }
  return ts.ScriptKind.TS;
}

function literalText(expression: ts.Expression): string | undefined {
  return ts.isStringLiteral(expression) || ts.isNoSubstitutionTemplateLiteral(expression)
    ? expression.text
    : undefined;
}

function exactImportMetaUrl(expression: ts.Expression): ts.MetaProperty | undefined {
  if (!ts.isPropertyAccessExpression(expression) || expression.questionDotToken !== undefined ||
    expression.name.text !== "url" || !ts.isMetaProperty(expression.expression) ||
    expression.expression.keywordToken !== ts.SyntaxKind.ImportKeyword ||
    expression.expression.name.text !== "meta") return undefined;
  return expression.expression;
}

function repositoryDeclaration(symbol: ts.Symbol): boolean {
  return (symbol.declarations ?? []).some((declaration) => {
    const filename = realpathOrSelf(declaration.getSourceFile().fileName);
    return filename === repositoryRoot || filename.startsWith(`${repositoryRoot}${sep}`);
  });
}

function realpathOrSelf(path: string): string {
  return existsSync(path) ? realpathSync(path) : path;
}

function resolvedGlobalUrl(identifier: ts.Identifier, checker: ts.TypeChecker): boolean {
  const symbol = checker.getSymbolAtLocation(identifier);
  if (symbol === undefined) rejectGraph("denied_capability_origin", JSON.stringify({
    path: identifier.getSourceFile().fileName,
    nodeKind: ts.SyntaxKind[identifier.kind],
    position: identifier.getStart(),
    reason: "global_url_binding_unresolved",
  }));
  return !repositoryDeclaration(symbol);
}

function importDeclarationIsTypeOnly(node: ts.ImportDeclaration): boolean {
  const clause = node.importClause;
  if (clause === undefined) return false;
  if (clause.isTypeOnly) return true;
  if (clause.name !== undefined || clause.namedBindings === undefined) return false;
  return ts.isNamedImports(clause.namedBindings) && clause.namedBindings.elements.length > 0 &&
    clause.namedBindings.elements.every((element) => element.isTypeOnly);
}

interface StaticLanguageScan {
  readonly acquisitions: readonly ParsedAcquisitionV1[];
  readonly ordinaryGlobalUrlValues: readonly number[];
  readonly staticResourceCandidates: readonly number[];
  readonly deniedOriginCount: number;
  readonly importMetaPlacementCount: number;
  readonly allowedStaticFormCounts: Readonly<Record<GraphEdgeForm, number>>;
}

function scanStaticLanguage(input: {
  readonly path: string;
  readonly source: ts.SourceFile;
  readonly checker: ts.TypeChecker;
  readonly production: boolean;
}): StaticLanguageScan {
  const { path, source, checker, production } = input;
  const syntaxCheck = ts.transpileModule(source.text, {
    fileName: path,
    reportDiagnostics: true,
    compilerOptions: {
      target: ts.ScriptTarget.ESNext,
      module: ts.ModuleKind.ESNext,
      jsx: ts.JsxEmit.ReactJSX,
      allowJs: true,
    },
  });
  if (syntaxCheck.diagnostics?.some((diagnostic) => diagnostic.category === ts.DiagnosticCategory.Error) === true) {
    rejectGraph("parse_failed", JSON.stringify({ path, nodeKind: "SourceFile", position: 0, reason: "typescript_parse_diagnostic" }));
  }
  const acquisitions: ParsedAcquisitionV1[] = [];
  const ordinaryGlobalUrlValues: number[] = [];
  const staticResourceCandidates: number[] = [];
  const permittedImportMetaPositions = new Set<number>();
  let importMetaPlacementCount = 0;

  const rejectNode = (node: ts.Node, reason: string, code = "denied_capability_origin"): never =>
    rejectGraph(code, JSON.stringify({
      path,
      nodeKind: ts.SyntaxKind[node.kind],
      position: node.getStart(source),
      reason,
    }));

  const addStatic = (
    form: GraphEdgeForm,
    edgeKind: GraphEdgeKind,
    expression: ts.Expression,
    node: ts.Node,
  ): void => {
    const specifier = ts.isStringLiteral(expression)
      ? expression.text
      : rejectNode(node, "static_specifier_not_string_literal", "unsupported_acquisition_syntax");
    acquisitions.push({
      form,
      edgeKind,
      specifier,
      position: node.getStart(source),
      nodeKind: ts.SyntaxKind[node.kind],
    });
  };

  const forbiddenComputedMembers = new Set([
    "require", "createRequire", "module", "exports", "getBuiltinModule", "binding",
    "_linkedBinding", "mainModule", "constructor", "URL",
  ]);

  function visit(node: ts.Node): void {
    if (ts.isImportDeclaration(node)) {
      const specifier = ts.isStringLiteral(node.moduleSpecifier) ? node.moduleSpecifier.text : undefined;
      if (production && (specifier === "node:vm" || specifier === "vm" ||
        ((specifier === "node:module" || specifier === "module") &&
          node.importClause?.namedBindings !== undefined && ts.isNamedImports(node.importClause.namedBindings) &&
          node.importClause.namedBindings.elements.some((element) =>
            (element.propertyName ?? element.name).text === "createRequire")))) {
        rejectNode(node, specifier === "node:vm" || specifier === "vm" ? "vm_origin" : "create_require_origin");
      }
      addStatic("import", importDeclarationIsTypeOnly(node) ? "type-only" : "runtime", node.moduleSpecifier, node);
    } else if (ts.isExportDeclaration(node) && node.moduleSpecifier !== undefined) {
      addStatic("re-export", node.isTypeOnly ? "type-only" : "runtime", node.moduleSpecifier, node);
    } else if (ts.isImportTypeNode(node) && ts.isLiteralTypeNode(node.argument) &&
      ts.isStringLiteral(node.argument.literal)) {
      addStatic("import-type", "type-only", node.argument.literal, node);
    }

    if (production && ts.isImportEqualsDeclaration(node) && ts.isExternalModuleReference(node.moduleReference)) {
      rejectNode(node, "import_equals_loader");
    }
    if (production && ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword) {
      rejectNode(node, "dynamic_import_loader");
    }
    if (production && (ts.isCallExpression(node) || ts.isNewExpression(node))) {
      const expression = node.expression;
      if (ts.isIdentifier(expression) && expression.text === "eval") rejectNode(node, "eval_origin");
      if (ts.isIdentifier(expression) && ["Function", "AsyncFunction", "GeneratorFunction"].includes(expression.text)) {
        rejectNode(node, "function_constructor_origin");
      }
      if (ts.isIdentifier(expression) && expression.text === "Proxy") rejectNode(node, "proxy_origin");
      if (ts.isPropertyAccessExpression(expression) && ts.isIdentifier(expression.expression) &&
        expression.expression.text === "Reflect" && expression.name.text === "construct") {
        rejectNode(node, "reflect_construct_origin");
      }
      if (ts.isPropertyAccessExpression(expression) && ts.isIdentifier(expression.expression) &&
        expression.expression.text === "WebAssembly" && ["compile", "instantiate"].includes(expression.name.text)) {
        rejectNode(node, "dynamic_webassembly_origin");
      }
      if (ts.isCallExpression(expression) && ts.isPropertyAccessExpression(expression.expression) &&
        ts.isIdentifier(expression.expression.expression) && expression.expression.expression.text === "Reflect" &&
        expression.expression.name.text === "get" && literalText(expression.arguments[1] ?? expression.arguments[0]!) === "constructor") {
        rejectNode(node, "reflect_constructor_recovery");
      }
      if (ts.isNewExpression(node) && ts.isElementAccessExpression(expression) &&
        ts.isIdentifier(expression.expression) && expression.expression.text === "globalThis") {
        rejectNode(node, "computed_global_constructor_recovery");
      }
    }
    if (production && ts.isPropertyAccessExpression(node)) {
      if (node.name.text === "constructor") rejectNode(node, "constructor_property_escape");
      if (ts.isIdentifier(node.expression) && node.expression.text === "process" &&
        node.name.text === "getBuiltinModule") rejectNode(node, "get_builtin_module_origin");
    }
    if (production && ts.isElementAccessExpression(node)) {
      const member = node.argumentExpression === undefined ? undefined : literalText(node.argumentExpression);
      const ambientOwner = (ts.isIdentifier(node.expression) && [
        "globalThis", "process", "module", "exports",
      ].includes(node.expression.text)) || ts.isMetaProperty(node.expression);
      if ((ambientOwner && (member === undefined || forbiddenComputedMembers.has(member))) ||
        member === "constructor") rejectNode(node, "ambient_computed_capability");
    }

    if (production && ts.isNewExpression(node) && ts.isIdentifier(node.expression) &&
      node.expression.text === "URL" &&
      resolvedGlobalUrl(node.expression, checker)) {
      const second = node.arguments?.[1];
      const importMeta = second === undefined ? undefined : exactImportMetaUrl(second);
      if (production && importMeta !== undefined) {
        const argumentsList = node.arguments ??
          rejectNode(node, "static_resource_missing_arguments", "unsupported_acquisition_syntax");
        if (argumentsList.length !== 2 || node.typeArguments !== undefined) {
          rejectNode(node, "static_resource_wrong_arity_or_type_arguments", "unsupported_acquisition_syntax");
        }
        const first = argumentsList[0];
        const specifier = (first === undefined ? undefined : literalText(first)) ??
          rejectNode(node, "static_resource_non_literal", "unsupported_acquisition_syntax");
        if ((!specifier.startsWith("./") && !specifier.startsWith("../")) ||
          specifier.includes("\\") || specifier.includes("\0") || specifier.includes("?") ||
          specifier.includes("#") || specifier.startsWith("//") ||
          /^[A-Za-z][A-Za-z0-9+.-]*:/u.test(specifier)) {
          rejectNode(node, "static_resource_non_literal_or_invalid_relative_path", "unsupported_acquisition_syntax");
        }
        permittedImportMetaPositions.add(importMeta.getStart(source));
        staticResourceCandidates.push(node.getStart(source));
        acquisitions.push({
          form: "resource-url",
          edgeKind: "resource",
          specifier,
          position: node.getStart(source),
          nodeKind: ts.SyntaxKind[node.kind],
        });
      } else if (production) {
        ordinaryGlobalUrlValues.push(node.getStart(source));
      }
    }

    if (production && ts.isMetaProperty(node) && node.keywordToken === ts.SyntaxKind.ImportKeyword &&
      node.name.text === "meta") {
      importMetaPlacementCount += 1;
      if (!permittedImportMetaPositions.has(node.getStart(source))) rejectNode(node, "import_meta_outside_exact_resource_base");
    }
    if (production && ts.isIdentifier(node) && node.text === "globalThis") {
      const parent = node.parent;
      const directNamedNonLoader = ts.isPropertyAccessExpression(parent) && parent.expression === node &&
        !forbiddenComputedMembers.has(parent.name.text);
      if (!directNamedNonLoader) rejectNode(node, "global_object_capture_or_computed_access");
    }
    if (production && ts.isIdentifier(node) && [
      "require", "module", "exports", "createRequire", "getBuiltinModule",
    ].includes(node.text)) {
      rejectNode(node, "commonjs_or_native_loader_origin");
    }
    if (production && ts.isIdentifier(node) && node.text === "URL" && !ts.isPartOfTypeNode(node) &&
      resolvedGlobalUrl(node, checker) &&
      !(ts.isNewExpression(node.parent) && node.parent.expression === node)) {
      rejectNode(node, "global_url_alias_or_recovery");
    }
    ts.forEachChild(node, visit);
  }
  visit(source);
  const allowedStaticFormCounts: Record<GraphEdgeForm, number> = {
    import: 0,
    "re-export": 0,
    "import-type": 0,
    "resource-url": 0,
  };
  for (const acquisition of acquisitions) allowedStaticFormCounts[acquisition.form] += 1;
  return {
    acquisitions: acquisitions.sort((left, right) => left.position - right.position),
    ordinaryGlobalUrlValues,
    staticResourceCandidates,
    deniedOriginCount: 0,
    importMetaPlacementCount,
    allowedStaticFormCounts,
  };
}

const resolvableExtensions = [
  "", ".ts", ".tsx", ".mts", ".cts", ".js", ".jsx", ".mjs", ".cjs",
  ".json", ".md", ".css",
] as const;

function localSpecifierBase(from: string, specifier: string): string | undefined {
  if (specifier.startsWith("@/")) return posix.normalize(`src/${specifier.slice(2)}`);
  if (specifier.startsWith(".")) return posix.normalize(posix.join(posix.dirname(from), specifier));
  return undefined;
}

function resolveLocalSpecifier(from: string, specifier: string): string | undefined {
  const base = localSpecifierBase(from, specifier);
  if (base === undefined || base.startsWith("../") || base === "..") return undefined;
  const candidates: string[] = [];
  for (const extension of resolvableExtensions) candidates.push(`${base}${extension}`);
  if (/\.m?js$|\.cjs$/.test(base)) {
    const withoutJs = base.replace(/\.(?:mjs|cjs|js)$/, "");
    candidates.push(`${withoutJs}.ts`, `${withoutJs}.tsx`, `${withoutJs}.mts`, `${withoutJs}.cts`);
  }
  for (const extension of resolvableExtensions.slice(1)) candidates.push(`${base}/index${extension}`);
  for (const candidate of candidates) {
    const absolute = resolve(repositoryRoot, candidate);
    if (!existsSync(absolute)) continue;
    const stat = lstatSync(absolute);
    if (!stat.isFile()) continue;
    const canonical = posixPath(relative(repositoryRoot, realpathSync(absolute)));
    if (canonical.startsWith("../") || canonical === "..") {
      rejectGraph("fail_closed_canonical_escape", `${from}->${specifier}`);
    }
    return canonical;
  }
  const absoluteBase = resolve(repositoryRoot, base);
  if (existsSync(absoluteBase) && lstatSync(absoluteBase).isDirectory()) return `${base}/`;
  return undefined;
}

function externalPackage(specifier: string): string {
  if (specifier.startsWith("node:")) return specifier;
  const segments = specifier.split("/");
  if (specifier.startsWith("@")) return segments.slice(0, 2).join("/");
  return segments[0] ?? specifier;
}

function resolveAcquisition(from: string, acquisition: ParsedAcquisitionV1): GraphEdgeV1 {
  if (acquisition.unsupportedReason !== undefined || acquisition.specifier === undefined) {
    return {
      ...acquisition,
      from,
      resolutionKind: "unsupported",
    };
  }
  if (acquisition.form === "resource-url") {
    const base = posix.normalize(posix.join(posix.dirname(from), acquisition.specifier));
    if (base.startsWith("../") || base === ".." ||
      !enumeration.protectedResourceExtensions.includes(extname(base)) ||
      !startsWithDirectory(base, enumeration.protectedResourceRoots)) {
      return { ...acquisition, from, resolutionKind: "unresolved" };
    }
    const absolute = resolve(repositoryRoot, base);
    if (!existsSync(absolute) || !lstatSync(absolute).isFile() || lstatSync(absolute).isSymbolicLink()) {
      return { ...acquisition, from, resolutionKind: "unresolved" };
    }
    const canonical = posixPath(relative(repositoryRoot, realpathSync(absolute)));
    if (canonical !== base || !candidates.includes(base)) {
      return { ...acquisition, from, resolutionKind: "unresolved" };
    }
    return { ...acquisition, from, resolutionKind: "local", resolvedTarget: canonical };
  }
  const localBase = localSpecifierBase(from, acquisition.specifier);
  if (localBase !== undefined) {
    const target = resolveLocalSpecifier(from, acquisition.specifier);
    return target === undefined
      ? { ...acquisition, from, resolutionKind: "unresolved" }
      : { ...acquisition, from, resolutionKind: "local", resolvedTarget: target };
  }
  return {
    ...acquisition,
    from,
    resolutionKind: "external",
    externalPackage: externalPackage(acquisition.specifier),
  };
}

const nodeByPath = new Map(nodes.map((node) => [node.path, node]));
const executableNodes = nodes.filter((node) => executableExtensions.has(extname(node.path)));

function classForPath(path: string): string {
  return nodeByPath.get(path)?.classId ?? requireSingleClass(path, classDefinitions);
}

function protectedExternalAllowed(edge: GraphEdgeV1): boolean {
  const specifier = edge.specifier ?? "";
  return specifier === "server-only" || specifier === "zod" ||
    specifier === "node:crypto" || specifier === "node:buffer" ||
    specifier === "drizzle-orm" || specifier.startsWith("drizzle-orm/");
}

const testOrControlClasses = new Set([
  "synthetic-ai-test-code", "other-test-fixtures", "root-control-file",
]);
const productionClasses = new Set([
  "phase-b-outer-composition", "protected-ai", "business-consumer", "other-production-src",
]);

function edgeDiagnostic(edge: GraphEdgeV1, reason: string, target?: string): string {
  return JSON.stringify({
    path: edge.from,
    nodeKind: edge.nodeKind,
    position: edge.position,
    reason,
    target: target ?? edge.resolvedTarget ?? edge.specifier ?? null,
  });
}

function enforceCapabilityEdge(
  edge: GraphEdgeV1,
  sourceClass = classForPath(edge.from),
  publicClient = false,
): void {
  if (edge.resolutionKind === "unsupported" || edge.resolutionKind === "unresolved") {
    if (productionClasses.has(sourceClass) || publicClient) {
      rejectGraph(edge.resolutionKind === "unresolved" ? "unresolved_static_edge" : "unsupported_acquisition_syntax", JSON.stringify({
        path: edge.from,
        rule: "production-acquisition-must-resolve-uniquely",
        ast: {
          form: edge.form,
          edgeKind: edge.edgeKind,
          position: edge.position,
          nodeKind: edge.nodeKind,
        },
        nodeKind: edge.nodeKind,
        reason: edge.unsupportedReason ?? "unresolved_specifier",
        acquisition: {
          resolutionKind: edge.resolutionKind,
          reason: edge.unsupportedReason ?? "unresolved_specifier",
          specifier: edge.specifier ?? null,
        },
      }));
    }
    return;
  }
  if (edge.resolutionKind === "external") {
    const specifier = edge.specifier ?? "";
    if (sourceClass === "protected-ai" && !protectedExternalAllowed(edge)) {
      rejectGraph("class_capability_violation", `${edge.from}->${specifier}`);
    }
    if (testOrControlClasses.has(sourceClass) && [
      "node:http", "node:https", "node:net", "node:tls", "openai",
      "@anthropic-ai/sdk", "@google/generative-ai", "@google/genai",
      "cohere-ai", "groq-sdk", "ollama",
    ].some((value) => specifier === value || specifier.startsWith(`${value}/`))) {
      rejectGraph("class_capability_violation", `${edge.from}->${specifier}`);
    }
    if (publicClient && specifier === "server-only") {
      rejectGraph("public_client_reachability", `${edge.from}->${specifier}`);
    }
    return;
  }
  const target = edge.resolvedTarget ?? rejectGraph(
    "unresolved_static_edge", `${edge.from}:${edge.position}`,
  );
  if (target === rootPath && edge.from !== rootPath) {
    rejectGraph("phase_b_composition_violation", edgeDiagnostic(edge, "incoming_edge_to_phase_b_composition", target));
  }
  if (target.startsWith("src/server/ai/") && edge.from !== rootPath) {
    rejectGraph("phase_b_composition_violation", edgeDiagnostic(edge, "incoming_edge_to_server_ai_composition", target));
  }
  if (publicClient && (target.startsWith("src/ai/") || target.startsWith("src/server/ai/") ||
    target.startsWith("src/integrations/ai/providers/"))) {
    rejectGraph("public_client_reachability", edgeDiagnostic(edge, "public_client_reaches_ai_server_boundary", target));
  }
  if (testOrControlClasses.has(sourceClass) &&
    (target.startsWith("src/server/ai/") || target.startsWith("src/integrations/ai/providers/") ||
      (sourceClass === "root-control-file" && target.startsWith("src/ai/")))) {
    rejectGraph("class_capability_violation", `${edge.from}->${target}`);
  }
  const targetNode = nodeByPath.get(target);
  if (productionClasses.has(sourceClass) && targetNode !== undefined &&
    (targetNode.classId === "synthetic-ai-test-code" || targetNode.classId === "other-test-fixtures")) {
    rejectGraph("class_capability_violation", `${edge.from}->${target}`);
  }
  if (sourceClass === "business-consumer" && target.startsWith("src/ai/") &&
    (edge.specifier !== "@/ai" || target !== "src/ai/index.ts")) {
    rejectGraph("class_capability_violation", `${edge.from}->${target}`);
  }
  if (sourceClass === "protected-ai") {
    if (target.startsWith("src/ai/testing/") || target.startsWith("src/server/ai/") ||
      target.startsWith("src/integrations/ai/providers/") || target === "src/db/client.ts" ||
      target === "src/config/env.ts") {
      rejectGraph("class_capability_violation", `${edge.from}->${target}`);
    }
    if (!target.startsWith("src/ai/")) {
      const typeDatabaseEdge = edge.edgeKind === "type-only" && target === "src/db/types.ts" && [
        "src/ai/applications/draft-assistance/read-scopes.ts",
        "src/ai/applications/draft-assistance/composition.ts",
        "src/ai/applications/draft-assistance/facade.ts",
      ].includes(edge.from);
      const typeRoleEdge = edge.edgeKind === "type-only" && target === "src/auth/permissions.ts" &&
        edge.from === "src/ai/applications/draft-assistance/contracts.ts";
      const schemaEdge = edge.edgeKind === "runtime" && target === "src/db/schema/index.ts" && [
        "src/ai/applications/draft-assistance/composition.ts",
        "src/ai/config/feature-gate-repository.ts",
        "src/ai/config/model-config-repository.ts",
      ].includes(edge.from);
      if (!typeDatabaseEdge && !typeRoleEdge && !schemaEdge) {
        rejectGraph("class_capability_violation", `${edge.from}->${target}`);
      }
    }
  }
}

const tsconfigPath = resolve(repositoryRoot, "tsconfig.json");
const tsconfigBytes = readFileSync(tsconfigPath);
if (sha256(tsconfigBytes) !== "9e18b3b8bc76276a6f3f5db0b6bb489dd9967dda56d283b5ee72d6ed08e1b0d0" ||
  ts.version !== "5.9.3") {
  fail("installed TypeScript/compiler options identity mismatch");
}
const configRead = ts.readConfigFile(tsconfigPath, ts.sys.readFile);
if (configRead.error !== undefined) fail("tsconfig could not be read by installed TypeScript");
const parsedConfig = ts.parseJsonConfigFileContent(configRead.config, ts.sys, repositoryRoot, undefined, tsconfigPath);
if (parsedConfig.errors.length > 0 || parsedConfig.options.moduleResolution !== ts.ModuleResolutionKind.Bundler ||
  parsedConfig.options.strict !== true || parsedConfig.options.exactOptionalPropertyTypes !== true) {
  fail("installed TypeScript compiler options differ from V3.1");
}
const architectureProgram = ts.createProgram({
  rootNames: executableNodes
    .filter((node) => productionClasses.has(node.classId))
    .map((node) => resolve(repositoryRoot, node.path)),
  options: { ...parsedConfig.options, noEmit: true },
});
const architectureChecker = architectureProgram.getTypeChecker();
const staticLanguageByPath = new Map<string, StaticLanguageScan>();
const ordinaryGlobalUrlValues: { readonly path: string; readonly position: number }[] = [];
const staticResourceCandidates: { readonly path: string; readonly position: number }[] = [];
const graphEdges: GraphEdgeV1[] = [];
for (const node of executableNodes) {
  const absolute = resolve(repositoryRoot, node.path);
  const production = productionClasses.has(node.classId);
  const source = production
    ? architectureProgram.getSourceFile(absolute)
    : ts.createSourceFile(
      absolute,
      readFileSync(absolute, "utf8"),
      ts.ScriptTarget.Latest,
      true,
      scriptKind(node.path),
    );
  if (source === undefined) fail(`TypeScript Program omitted Production Candidate ${node.path}`);
  const scan = scanStaticLanguage({
    path: node.path,
    source,
    checker: architectureChecker,
    production,
  });
  staticLanguageByPath.set(node.path, scan);
  scan.ordinaryGlobalUrlValues.forEach((position) => ordinaryGlobalUrlValues.push({ path: node.path, position }));
  scan.staticResourceCandidates.forEach((position) => staticResourceCandidates.push({ path: node.path, position }));
  for (const acquisition of scan.acquisitions) {
    const edge = resolveAcquisition(node.path, acquisition);
    enforceCapabilityEdge(edge);
    graphEdges.push(edge);
  }
}
if (ordinaryGlobalUrlValues.length !== 21 || staticResourceCandidates.length !== 0 ||
  graphEdges.some((edge) => edge.resolutionKind === "unresolved" || edge.resolutionKind === "unsupported")) {
  fail(`actual Production static-language baseline differs from V3.1: ${JSON.stringify({
    ordinaryGlobalUrlValues,
    staticResourceCandidates,
    unresolved: graphEdges.filter((edge) => edge.resolutionKind === "unresolved" || edge.resolutionKind === "unsupported"),
  })}`);
}

const edgesBySource = new Map<string, GraphEdgeV1[]>();
for (const edge of graphEdges) {
  const list = edgesBySource.get(edge.from) ?? [];
  list.push(edge);
  edgesBySource.set(edge.from, list);
}

function executableClosure(
  roots: readonly string[],
  includeTypeOnly: boolean,
  publicClient = false,
): readonly string[] {
  const visited = new Set<string>();
  const pending = [...roots];
  while (pending.length > 0) {
    const current = pending.shift();
    if (current === undefined || visited.has(current)) continue;
    visited.add(current);
    for (const edge of edgesBySource.get(current) ?? []) {
      if (!includeTypeOnly && edge.edgeKind === "type-only") continue;
      enforceCapabilityEdge(edge, classForPath(current), publicClient);
      if (edge.resolutionKind !== "local" || edge.resolvedTarget === undefined) continue;
      const targetNode = nodeByPath.get(edge.resolvedTarget);
      if (targetNode !== undefined && executableExtensions.has(extname(targetNode.path))) {
        pending.push(targetNode.path);
      }
    }
  }
  return [...visited].sort();
}

const rootEdges = graphEdges.filter((edge) => edge.from === rootPath);
const exactSpecifiers = rootEdges
  .filter((edge) => edge.form === "import")
  .sort((left, right) => left.position - right.position)
  .map((edge) => edge.specifier ?? "");
if (JSON.stringify(exactSpecifiers) !== JSON.stringify(expectedRootImports) ||
  rootEdges.length !== expectedRootImports.length) {
  fail("Phase B outer composition imports differ from the exact five-edge seam");
}

const rootAst = ts.createSourceFile(
  rootPath,
  rootSource,
  ts.ScriptTarget.Latest,
  true,
  ts.ScriptKind.TS,
);
const rootFacts = {
  freezeCalls: 0,
  kindReads: 0,
  dbReads: 0,
  factoryCalls: 0,
  switches: 0,
  elementAccesses: 0,
  spreads: 0,
};
function inspectRoot(node: ts.Node): void {
  if (ts.isCallExpression(node)) {
    if (ts.isPropertyAccessExpression(node.expression) && ts.isIdentifier(node.expression.expression) &&
      node.expression.expression.text === "Object" && node.expression.name.text === "freeze") {
      rootFacts.freezeCalls += 1;
    }
    if (ts.isIdentifier(node.expression) && node.expression.text === "createPhaseBAvailabilityServiceV1") {
      rootFacts.factoryCalls += 1;
    }
  }
  if (ts.isPropertyAccessExpression(node) && ts.isIdentifier(node.expression) &&
    node.expression.text === "databaseConnection") {
    if (node.name.text === "kind") rootFacts.kindReads += 1;
    if (node.name.text === "db") rootFacts.dbReads += 1;
  }
  if (ts.isSwitchStatement(node)) rootFacts.switches += 1;
  if (ts.isElementAccessExpression(node)) rootFacts.elementAccesses += 1;
  if (ts.isSpreadAssignment(node) || ts.isSpreadElement(node)) rootFacts.spreads += 1;
  ts.forEachChild(node, inspectRoot);
}
inspectRoot(rootAst);
if (rootFacts.freezeCalls !== 1 || rootFacts.kindReads !== 1 || rootFacts.dbReads !== 2 ||
  rootFacts.factoryCalls !== 2 || rootFacts.switches !== 1 || rootFacts.elementAccesses !== 0 ||
  rootFacts.spreads !== 0 || (rootSource.match(/database:\s*databaseConnection\.db/g) ?? []).length !== 2 ||
  !rootSource.includes('case "pglite"') || !rootSource.includes('case "postgres"') ||
  !rootSource.includes("default:") || /\bas\b|\bany\b|\bunknown\b|@ts-/.test(rootSource)) {
  fail("Phase B outer composition does not satisfy the direct discriminated seam");
}

const protectedPaths = executableNodes
  .filter((node) => node.classId === "protected-ai")
  .map((node) => node.path);
const protectedClosure = executableClosure(protectedPaths, true);
if (protectedClosure.some((path) => path === "src/config/env.ts" || path === "src/db/client.ts" ||
  path.startsWith("src/server/ai/") || path.startsWith("src/integrations/ai/providers/") ||
  path.startsWith("src/ai/testing/"))) {
  fail("protected graph reaches a prohibited capability origin");
}

const coreRoots = protectedPaths.filter((path) => path.startsWith("src/ai/core/"));
const coreClosure = executableClosure(coreRoots, true);
if (coreClosure.some((path) => path.startsWith("src/ai/applications/draft-assistance/") ||
  path.startsWith("src/ai/testing/") || path.startsWith("src/catalog/") ||
  path.startsWith("src/content/") || path.startsWith("src/seo/") ||
  path.startsWith("src/admin/") || path.startsWith("src/public-site/"))) {
  fail("application-neutral core closure reaches Draft/business authority");
}

const publicEntryPrefixes = ["src/app/", "src/public-site/"];
const publicEntryExclusions = [
  "src/app/admin/", "src/app/operations-login/", "src/app/api/", "src/app/(admin-preview)/",
];
const publicClientRoots = executableNodes.filter((node) =>
  node.classId === "business-consumer" &&
  publicEntryPrefixes.some((prefix) => node.path.startsWith(prefix)) &&
  !publicEntryExclusions.some((prefix) => node.path.startsWith(prefix)) &&
  /^\s*["']use client["'];/u.test(readFileSync(resolve(repositoryRoot, node.path), "utf8"))
).map((node) => node.path);
const publicClientClosure = executableClosure(publicClientRoots, false, true);

const serverClosure = executableClosure([rootPath], false);
if (!serverClosure.some((path) => path.startsWith("src/ai/")) ||
  serverClosure.some((path) => path.startsWith("src/server/ai/phase-d") ||
    path.startsWith("src/integrations/ai/providers/"))) {
  fail("Phase B server closure does not satisfy required reachability/absence");
}

const generateCallOwners = executableNodes.filter((entry) => entry.classId === "protected-ai" &&
  readFileSync(resolve(repositoryRoot, entry.path), "utf8").includes(".generateText("));
if (generateCallOwners.length !== 1 || generateCallOwners[0]?.path !== "src/ai/core/orchestrator.ts") {
  fail("Text provider call authority is not unique to core/orchestrator.ts");
}
const providerRegistry = readFileSync(resolve(repositoryRoot, "src/ai/providers/registry.ts"), "utf8");
if (!providerRegistry.includes("createTextProviderRegistryV1([])")) fail("Production Provider registry is not exact-empty");
const productionManifest = readFileSync(resolve(repositoryRoot, "src/ai/prompts/resources/production/manifest.v1.json"), "utf8");
if (productionManifest !== '{"manifestVersion":1,"entries":[]}\n') fail("Production Prompt manifest is not exact-empty");

interface StaticFaultCaseV31 {
  readonly id: string;
  readonly sourcePath: string;
  readonly source: string;
  readonly expectedReason: string;
  readonly expectedNodeKind: string;
}

interface StaticPositiveCaseV31 {
  readonly id: string;
  readonly sourcePath: string;
  readonly source: string;
  readonly ordinaryGlobalUrlValues: number;
  readonly resourceEdges: number;
}

interface TopologyCaseV31 {
  readonly id: string;
  readonly path: string;
  readonly expectedReason: string;
}

function exactString(record: { [key: string]: PlainJson }, key: string, owner: string): string {
  const value = record[key];
  if (typeof value !== "string") fail(`${owner} lacks string ${key}`);
  return value;
}

function exactNumber(record: { [key: string]: PlainJson }, key: string, owner: string): number {
  const value = record[key];
  if (typeof value !== "number" || !Number.isInteger(value) || value < 0) fail(`${owner} lacks integer ${key}`);
  return value;
}

function exactRecord(value: PlainJson, owner: string): { [key: string]: PlainJson } {
  if (typeof value !== "object" || value === null || Array.isArray(value)) fail(`${owner} is not an object`);
  return value;
}

const graphFaultCases: StaticFaultCaseV31[] = profileBundle.faultCases.map((value, index) => {
  const record = exactRecord(value, `faultCases/${index}`);
  if (Object.keys(record).sort().join(",") !== "expectedNodeKind,expectedReason,id,source,sourcePath") {
    fail(`faultCases/${index} keys differ from V3.1 fixture schema`);
  }
  return {
    id: exactString(record, "id", `faultCases/${index}`),
    sourcePath: exactString(record, "sourcePath", `faultCases/${index}`),
    source: exactString(record, "source", `faultCases/${index}`),
    expectedReason: exactString(record, "expectedReason", `faultCases/${index}`),
    expectedNodeKind: exactString(record, "expectedNodeKind", `faultCases/${index}`),
  };
});
const graphPositiveCases: StaticPositiveCaseV31[] = profileBundle.positiveCases.map((value, index) => {
  const record = exactRecord(value, `positiveCases/${index}`);
  if (Object.keys(record).sort().join(",") !== "id,ordinaryGlobalUrlValues,resourceEdges,source,sourcePath") {
    fail(`positiveCases/${index} keys differ from V3.1 fixture schema`);
  }
  return {
    id: exactString(record, "id", `positiveCases/${index}`),
    sourcePath: exactString(record, "sourcePath", `positiveCases/${index}`),
    source: exactString(record, "source", `positiveCases/${index}`),
    ordinaryGlobalUrlValues: exactNumber(record, "ordinaryGlobalUrlValues", `positiveCases/${index}`),
    resourceEdges: exactNumber(record, "resourceEdges", `positiveCases/${index}`),
  };
});
const graphTopologyCases: TopologyCaseV31[] = profileBundle.topologyCases.map((value, index) => {
  const record = exactRecord(value, `topologyCases/${index}`);
  if (Object.keys(record).sort().join(",") !== "expectedReason,id,path") {
    fail(`topologyCases/${index} keys differ from V3.1 fixture schema`);
  }
  return {
    id: exactString(record, "id", `topologyCases/${index}`),
    path: exactString(record, "path", `topologyCases/${index}`),
    expectedReason: exactString(record, "expectedReason", `topologyCases/${index}`),
  };
});

function scanVirtualSource(path: string, text: string): StaticLanguageScan {
  const absolute = resolve(repositoryRoot, path);
  const virtualSource = ts.createSourceFile(absolute, text, ts.ScriptTarget.Latest, true, scriptKind(path));
  const host = ts.createCompilerHost(parsedConfig.options, true);
  const originalGetSourceFile = host.getSourceFile.bind(host);
  host.getSourceFile = (filename, languageVersion, onError, shouldCreateNewSourceFile) =>
    resolve(filename) === absolute
      ? virtualSource
      : originalGetSourceFile(filename, languageVersion, onError, shouldCreateNewSourceFile);
  host.fileExists = (filename) => resolve(filename) === absolute || ts.sys.fileExists(filename);
  host.readFile = (filename) => resolve(filename) === absolute ? text : ts.sys.readFile(filename);
  const program = ts.createProgram({ rootNames: [absolute], options: parsedConfig.options, host });
  return scanStaticLanguage({
    path,
    source: program.getSourceFile(absolute) ?? fail(`virtual Program omitted ${path}`),
    checker: program.getTypeChecker(),
    production: true,
  });
}

const graphFaultResults: {
  readonly id: string;
  readonly code: string;
  readonly detail: string;
}[] = [];
for (const fault of graphFaultCases) {
  let observed: ArchitectureGraphFailure | undefined;
  try {
    const sourceClass = classForPath(fault.sourcePath);
    const publicClient = /^\s*["']use client["'];/u.test(fault.source);
    for (const acquisition of scanVirtualSource(fault.sourcePath, fault.source).acquisitions) {
      enforceCapabilityEdge(resolveAcquisition(fault.sourcePath, acquisition), sourceClass, publicClient);
    }
  } catch (error) {
    if (error instanceof ArchitectureGraphFailure) observed = error;
    else throw error;
  }
  if (observed?.code !== fault.expectedReason) {
    fail(`graph fault ${fault.id} expected ${fault.expectedReason}, got ${observed?.code ?? "pass"}`);
  }
  if (!observed.detail.includes(`"path":"${fault.sourcePath}"`) ||
    !observed.detail.includes(`"nodeKind":"${fault.expectedNodeKind}"`) ||
    !observed.detail.includes('"reason":')) {
    fail(`graph fault ${fault.id} lacks exact path/node/reason diagnostics`);
  }
  graphFaultResults.push({ id: fault.id, code: observed.code, detail: observed.detail });
}

const graphPositiveResults = graphPositiveCases.map((positive) => {
  const scan = scanVirtualSource(positive.sourcePath, positive.source);
  const edges = scan.acquisitions.map((acquisition) => resolveAcquisition(positive.sourcePath, acquisition));
  for (const edge of edges) enforceCapabilityEdge(edge, classForPath(positive.sourcePath), false);
  const resourceEdges = edges.filter((edge) => edge.edgeKind === "resource").length;
  if (scan.ordinaryGlobalUrlValues.length !== positive.ordinaryGlobalUrlValues ||
    resourceEdges !== positive.resourceEdges) {
    fail(`static-language positive ${positive.id} count mismatch: ${JSON.stringify({
      actualOrdinary: scan.ordinaryGlobalUrlValues.length,
      expectedOrdinary: positive.ordinaryGlobalUrlValues,
      actualResources: resourceEdges,
      expectedResources: positive.resourceEdges,
    })}`);
  }
  return { id: positive.id, ordinaryGlobalUrlValues: scan.ordinaryGlobalUrlValues.length, resourceEdges };
});

function enforceTopology(paths: readonly string[]): void {
  const phaseD = paths.find((path) => path === "src/server/ai/phase-d-provider-composition.ts");
  const adapter = paths.find((path) => path.startsWith("src/integrations/ai/providers/"));
  const undeclared = paths.find((path) => path.startsWith("src/server/ai/") &&
    path !== rootPath && path !== "src/server/ai/phase-d-provider-composition.ts");
  if (phaseD !== undefined || adapter !== undefined) {
    rejectGraph("reserved_zone_present", JSON.stringify({ path: phaseD ?? adapter ?? "unknown", nodeKind: "FilesystemPath", reason: "future_zone_present" }));
  }
  if (undeclared !== undefined) rejectGraph("reserved_zone_present", JSON.stringify({ path: undeclared, nodeKind: "FilesystemPath", reason: "undeclared_composition" }));
}
enforceTopology(actualFiles);
for (const fault of graphTopologyCases) {
  let observed: ArchitectureGraphFailure | undefined;
  try {
    enforceTopology([...actualFiles, fault.path]);
  } catch (error) {
    if (error instanceof ArchitectureGraphFailure) observed = error;
    else throw error;
  }
  if (observed?.code !== fault.expectedReason) {
    fail(`topology fault ${fault.id} expected ${fault.expectedReason}, got ${observed?.code ?? "pass"}`);
  }
  graphFaultResults.push({ id: fault.id, code: observed.code, detail: observed.detail });
}

const commonReadAuthorityPaths = [
  "src/ai/applications/draft-assistance/read-scopes.ts",
  "src/ai/applications/draft-assistance/composition.ts",
  "src/ai/config/feature-gate-repository.ts",
  "src/ai/config/model-config-repository.ts",
];
for (const path of commonReadAuthorityPaths) {
  const source = readFileSync(resolve(repositoryRoot, path), "utf8");
  if (/\.execute\s*\(|["']select["']\s*\|\s*["']execute["']/.test(source)) {
    fail(`raw execute escaped into common read authority: ${path}`);
  }
}
const readScopeSource = readFileSync(
  resolve(repositoryRoot, "src/ai/applications/draft-assistance/read-scopes.ts"),
  "utf8",
);
if ((readScopeSource.match(/Pick<AppDatabase<TQueryResult>, "select">/g) ?? []).length !== 5) {
  fail("common Draft read carrier/helper/factories are not exact select-only projections");
}
const configRepositorySource = readFileSync(
  resolve(repositoryRoot, "src/ai/config/model-config-repository.ts"),
  "utf8",
);
if (!configRepositorySource.includes("database.select({") ||
  configRepositorySource.includes(".limit(") || configRepositorySource.includes("sql`")) {
  fail("model configuration repository is not one typed complete select");
}

const positiveTypeConfigs = [
  "test-fixtures/ai-types/database-seam/tsconfig.positive.json",
  "test-fixtures/ai-types/read-scope/tsconfig.positive.json",
];
const negativeTypeConfigs = [
  { path: "test-fixtures/ai-types/database-seam/tsconfig.cross-driver-negative.json", code: "TS2379" },
  { path: "test-fixtures/ai-types/database-seam/tsconfig.unnarrowed-negative.json", code: "TS2379" },
  { path: "test-fixtures/ai-types/read-scope/tsconfig.common-authority-negative.json", code: "TS2339" },
  { path: "test-fixtures/ai-types/read-scope/tsconfig.execute-authority-negative.json", code: "TS2339" },
  { path: "test-fixtures/ai-types/read-scope/tsconfig.external-fabrication-negative.json", code: "TS2741" },
  { path: "test-fixtures/ai-types/read-scope/tsconfig.mode-mismatch-negative.json", code: "TS2345" },
];
const installedNodeModulesInput = process.env.CWT_INSTALLED_NODE_MODULES;
if (installedNodeModulesInput === undefined || !existsSync(installedNodeModulesInput) ||
  !lstatSync(installedNodeModulesInput).isDirectory()) {
  fail("CWT_INSTALLED_NODE_MODULES must name the pinned installed dependency directory");
}
const installedNodeModules = realpathSync(installedNodeModulesInput);
const repositoryNodeModules = resolve(repositoryRoot, "node_modules");

function installedDependencyPath(candidate: string): string | undefined {
  const relativeCandidate = relative(repositoryNodeModules, candidate);
  return relativeCandidate === "" || (!relativeCandidate.startsWith(`..${sep}`) && relativeCandidate !== "..")
    ? resolve(installedNodeModules, relativeCandidate)
    : undefined;
}

function compileTypeFixture(configPath: string): readonly ts.Diagnostic[] {
  const absoluteConfigPath = resolve(repositoryRoot, configPath);
  const config = ts.readConfigFile(absoluteConfigPath, ts.sys.readFile);
  if (config.error !== undefined) return [config.error];
  const parsed = ts.parseJsonConfigFileContent(
    config.config,
    ts.sys,
    posix.dirname(absoluteConfigPath),
    undefined,
    absoluteConfigPath,
  );
  if (parsed.errors.length > 0) return parsed.errors;
  const host = ts.createCompilerHost(parsed.options, true);
  const hostFileExists = host.fileExists.bind(host);
  const hostReadFile = host.readFile.bind(host);
  const hostDirectoryExists = host.directoryExists?.bind(host);
  const hostGetDirectories = host.getDirectories?.bind(host);
  host.fileExists = (path) => hostFileExists(path) ||
    (installedDependencyPath(path) !== undefined && hostFileExists(installedDependencyPath(path)!));
  host.readFile = (path) => hostReadFile(path) ??
    (installedDependencyPath(path) === undefined ? undefined : hostReadFile(installedDependencyPath(path)!));
  host.directoryExists = (path) => hostDirectoryExists?.(path) === true ||
    (installedDependencyPath(path) !== undefined && hostDirectoryExists?.(installedDependencyPath(path)!) === true);
  host.getDirectories = (path) => {
    const direct = hostGetDirectories?.(path) ?? [];
    const installed = installedDependencyPath(path);
    return installed === undefined ? direct : [...new Set([...direct, ...(hostGetDirectories?.(installed) ?? [])])];
  };
  const programOptions: ts.CreateProgramOptions = {
    rootNames: parsed.fileNames,
    options: { ...parsed.options, noEmit: true },
    host,
  };
  if (parsed.projectReferences !== undefined) programOptions.projectReferences = parsed.projectReferences;
  const program = ts.createProgram(programOptions);
  return ts.getPreEmitDiagnostics(program);
}
for (const config of positiveTypeConfigs) {
  const diagnostics = compileTypeFixture(config);
  if (diagnostics.length > 0) {
    fail(`positive type fixture failed: ${config}:${diagnostics.map((diagnostic) => diagnostic.code).join(",")}`);
  }
}
for (const config of negativeTypeConfigs) {
  const diagnostics = compileTypeFixture(config.path);
  if (!diagnostics.some((diagnostic) => `TS${diagnostic.code}` === config.code)) {
    fail(`negative type fixture did not fail with ${config.code}: ${config.path}`);
  }
}
for (const path of actualFiles.filter((candidate) => candidate.startsWith("test-fixtures/ai-types/read-scope/") && candidate.endsWith(".ts"))) {
  const source = readFileSync(resolve(repositoryRoot, path), "utf8");
  if (/\bdeclare\s+const\b|\bas\s+(?:const|unknown|any)\b|@ts-|\bany\b/.test(source)) {
    fail(`read-scope fixture contains a construction bypass: ${path}`);
  }
}

const sourceStateCounts = {
  tracked: nodes.filter((node) => node.sourceState === "tracked").length,
  untrackedNotIgnored: nodes.filter((node) => node.sourceState === "untracked-not-ignored").length,
  untrackedIgnored: nodes.filter((node) => node.sourceState === "untracked-ignored").length,
};
const exactHead = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
const inventorySha256 = sha256(canonical(nodes.map((node) => ({
  path: node.path,
  sourceState: node.sourceState,
  contentSha256: node.contentSha256,
  generated: node.generated,
}))));
const contentSha256 = sha256("cwt-v17-content-v2\n" + nodes
  .map((node) => `${node.path}\0${node.contentSha256}\n`).join(""));
const classificationSha256 = sha256("cwt-v17-classification-v2\n" + nodes
  .map((node) => `${node.path}\0${node.classId}\0${node.stageStatus}\0${node.bundleZones.join(",")}\n`).join(""));
const graphSha256 = sha256(canonical(graphEdges));
const allowedStaticFormCounts: Record<GraphEdgeForm, number> = {
  import: 0,
  "re-export": 0,
  "import-type": 0,
  "resource-url": 0,
};
let importMetaPlacementCount = 0;
for (const scan of staticLanguageByPath.values()) {
  for (const form of Object.keys(allowedStaticFormCounts) as GraphEdgeForm[]) {
    allowedStaticFormCounts[form] += scan.allowedStaticFormCounts[form];
  }
  importMetaPlacementCount += scan.importMetaPlacementCount;
}
const staticLanguageSha256 = sha256(canonical({
  ordinaryGlobalUrlValues,
  staticResourceCandidates,
  allowedStaticFormCounts,
  importMetaPlacementCount,
}));

function graphCycles(): readonly (readonly string[])[] {
  const cycles: string[][] = [];
  const active: string[] = [];
  const visited = new Set<string>();
  const visit = (path: string): void => {
    const activeIndex = active.indexOf(path);
    if (activeIndex >= 0) {
      cycles.push([...active.slice(activeIndex), path]);
      return;
    }
    if (visited.has(path)) return;
    visited.add(path);
    active.push(path);
    for (const edge of edgesBySource.get(path) ?? []) {
      if (edge.resolutionKind === "local" && edge.resolvedTarget !== undefined &&
        executableExtensions.has(extname(edge.resolvedTarget))) visit(edge.resolvedTarget);
    }
    active.pop();
  };
  for (const node of executableNodes) visit(node.path);
  return cycles.sort((left, right) => canonical(left).localeCompare(canonical(right), "en"));
}

function argumentValue(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  if (index < 0) return undefined;
  const value = process.argv[index + 1];
  if (value === undefined || value.length === 0) fail(`${name} requires one exact path`);
  return value;
}

function bundleFiles(rootInput: string): readonly { readonly path: string; readonly sha256: string }[] {
  const root = realpathSync(rootInput);
  const output: { path: string; sha256: string }[] = [];
  const visit = (directory: string): void => {
    for (const name of readdirSync(directory).sort()) {
      const path = resolve(directory, name);
      const stat = lstatSync(path);
      if (stat.isSymbolicLink() || (!stat.isDirectory() && !stat.isFile())) fail("bundle proof encountered alias or special node");
      if (stat.isDirectory()) visit(path);
      else output.push({ path: posixPath(relative(root, path)), sha256: sha256(readFileSync(path)) });
    }
  };
  visit(root);
  return output;
}

const serverBundleInput = argumentValue("--server-bundle-dir");
const publicBundleInput = argumentValue("--public-bundle-dir");
if ((serverBundleInput === undefined) !== (publicBundleInput === undefined)) {
  fail("server/public bundle proof inputs must be supplied together");
}
const bundleMarkers = [
  "CWT_SERVER_AI_BOUNDARY_V1_5F4D7C2A",
  "CWT_SERVER_AI_PROMPT_BUNDLE_V1_91B6E4A3",
  "CWT_SYNTHETIC_TEST_DATA_NOT_A_CWT_FACT_V1",
] as const;
const rawPromptMarker = "SYNTHETIC TEST DATA — NOT A CWT FACT";
let bundleBoundary = {
  toolchainIdentities: { node: process.version.slice(1), next: "16.2.12", typescript: ts.version },
  buildInputs: { supplied: false, serverTreeHash: null as string | null, publicTreeHash: null as string | null },
  serverMarkerPresence: Object.fromEntries(bundleMarkers.map((marker) => [marker, 0])),
  publicClientAbsence: false,
  positiveLeakFailure: false,
  sourceBundleAgreement: false,
  bundleHash: sha256("bundle-proof-not-supplied"),
};
if (serverBundleInput !== undefined && publicBundleInput !== undefined) {
  const serverFiles = bundleFiles(serverBundleInput);
  const publicFiles = bundleFiles(publicBundleInput);
  const serverRoot = realpathSync(serverBundleInput);
  const publicRoot = realpathSync(publicBundleInput);
  const serverContents = serverFiles.map((file) => ({
    path: file.path,
    bytes: readFileSync(resolve(serverRoot, file.path)),
  }));
  const publicClientContents = publicFiles.filter((file) =>
    file.path.startsWith("static/chunks/") && file.path.endsWith(".js")).map((file) => ({
    path: file.path,
    bytes: readFileSync(resolve(publicRoot, file.path)),
  }));
  const markerCounts = Object.fromEntries(bundleMarkers.map((marker) => [
    marker,
    serverContents.filter((file) => file.bytes.includes(Buffer.from(marker))).length,
  ]));
  const serverRawPromptCount = serverContents.filter((file) => file.bytes.includes(Buffer.from(rawPromptMarker))).length;
  const publicLeaks = publicClientContents.flatMap((file) => [...bundleMarkers, rawPromptMarker]
    .filter((marker) => file.bytes.includes(Buffer.from(marker))).map((marker) => `${file.path}:${marker}`));
  const positiveClientControl = publicClientContents.some((file) =>
    file.bytes.includes(Buffer.from("CWT_PUBLIC_CLIENT_FIXTURE_V1"))) || publicFiles.length > 0;
  const positiveLeakFailure = Buffer.from(`prefix:${bundleMarkers[0]}:suffix`).includes(Buffer.from(bundleMarkers[0]));
  const sourceBundleAgreement = Object.values(markerCounts).every((count) => count > 0) &&
    serverRawPromptCount > 0 && publicLeaks.length === 0 && positiveClientControl && positiveLeakFailure;
  if (!sourceBundleAgreement) fail("installed server/public bundle boundary mismatch");
  const serverTreeHash = sha256(canonical(serverFiles));
  const publicTreeHash = sha256(canonical(publicFiles));
  bundleBoundary = {
    toolchainIdentities: { node: process.version.slice(1), next: "16.2.12", typescript: ts.version },
    buildInputs: { supplied: true, serverTreeHash, publicTreeHash },
    serverMarkerPresence: { ...markerCounts, rawPromptMarker: serverRawPromptCount },
    publicClientAbsence: publicLeaks.length === 0,
    positiveLeakFailure,
    sourceBundleAgreement,
    bundleHash: sha256(canonical({ serverTreeHash, publicTreeHash, markerCounts, serverRawPromptCount, publicLeaks })),
  };
}

const inputHashes = {
  currentProfile: expectedProfileFileHash,
  tsconfig: sha256(tsconfigBytes),
  inventory: inventorySha256,
  content: contentSha256,
  classification: classificationSha256,
  staticLanguage: staticLanguageSha256,
  graph: graphSha256,
};

function sealProof(payload: Readonly<Record<string, unknown>>): Readonly<Record<string, unknown>> {
  const base = {
    schemaVersion: 31,
    profileId: authority.profileId,
    profileSha256: expectedProfileIntegrityHash,
    candidateCommit: exactHead,
    inputHashes,
    ...payload,
  };
  return Object.freeze({ ...base, proofHash: sha256(canonical(base)) });
}

const classMembersProof = Object.fromEntries(classDefinitions.map((definition) => [
  definition.id,
  classMembers.get(definition.id) ?? [],
]));
const actualTreeProof = sealProof({
  runtimeIdentities: {
    node: process.version.slice(1),
    v8: process.versions.v8,
    icu: process.versions.icu,
    unicode: process.versions.unicode,
    cldr: process.versions.cldr,
    typescript: ts.version,
  },
  currentProfileCompileInputs: [{ path: profilePath, sha256: expectedProfileFileHash }],
  historicalProfileRuntimeReads: [],
  excludedPhysicalRoots: excludedStatus,
  candidates: nodes,
  executables: executableNodes.map((node) => node.path),
  classMembers: classMembersProof,
  zeroClass,
  ambiguous,
  sourceStates: sourceStateCounts,
  ordinaryGlobalUrlValues,
  ordinaryGlobalUrlValueCount: ordinaryGlobalUrlValues.length,
  staticResourceCandidates,
  allowedStaticFormCounts,
  deniedOriginCount: 0,
  inventoryHash: inventorySha256,
  contentHash: contentSha256,
  classificationHash: classificationSha256,
  staticLanguageHash: staticLanguageSha256,
});
const staticGraphProof = sealProof({
  nodes: nodes.map((node) => ({ path: node.path, classId: node.classId, contentSha256: node.contentSha256 })),
  edges: graphEdges,
  ordinaryUrlZeroEdgeLocations: ordinaryGlobalUrlValues,
  resourceEdges: graphEdges.filter((edge) => edge.edgeKind === "resource"),
  unresolved: graphEdges.filter((edge) => edge.resolutionKind === "unresolved"),
  ambiguous: [],
  cycles: graphCycles(),
  compilerOptionsHash: sha256(canonical({
    moduleResolution: parsedConfig.options.moduleResolution,
    strict: parsedConfig.options.strict,
    exactOptionalPropertyTypes: parsedConfig.options.exactOptionalPropertyTypes,
    paths: parsedConfig.options.paths,
  })),
  graphHash: graphSha256,
});
const originProof = sealProof({
  originRuleSetHash: sha256(canonical(authority.deniedProductionCapabilityOrigins)),
  deniedOriginCount: 0,
  importMetaPlacementCount,
  protectedOrigins: {
    environment: protectedClosure.includes("src/config/env.ts"),
    databaseConnection: protectedClosure.includes("src/db/client.ts"),
    adapter: protectedClosure.some((path) => path.startsWith("src/integrations/ai/providers/")),
    testing: protectedClosure.some((path) => path.startsWith("src/ai/testing/")),
    providerRegistry: "exact-empty",
  },
  reservedAbsence: {
    phaseDComposition: !actualFiles.includes("src/server/ai/phase-d-provider-composition.ts"),
    providerAdapterZone: !actualFiles.some((path) => path.startsWith("src/integrations/ai/providers/")),
  },
  productionClosure: { protectedClosure, coreClosure, serverClosure },
  publicClientClosure: { roots: publicClientRoots, closure: publicClientClosure },
  nonReachabilityHash: sha256(canonical({ protectedClosure, coreClosure, serverClosure, publicClientClosure })),
});
const compositionProof = sealProof({
  compositionPath: rootPath,
  exactImports: rootEdges,
  trustedEnvironmentDto: { freezeCalls: rootFacts.freezeCalls, fields: ["appEnvironment", "processFeatureAiEnabled"] },
  databaseBranches: ["pglite", "postgres"],
  factoryCalls: { syntacticSites: rootFacts.factoryCalls, runtimePerInvocation: 1 },
  incomingProductionEdges: graphEdges.filter((edge) => edge.resolvedTarget === rootPath),
  typescriptProbeCaptures: { positive: positiveTypeConfigs, negative: negativeTypeConfigs },
  m03SeamIdentity,
  compositionHash: sha256(canonical({ rootEdges, rootFacts, sourceSha256: sha256(rootSource) })),
});
const bundleProof = sealProof({
  toolchainIdentities: bundleBoundary.toolchainIdentities,
  sourceProofHashes: {
    actualTree: actualTreeProof.proofHash,
    staticGraph: staticGraphProof.proofHash,
    origin: originProof.proofHash,
    composition: compositionProof.proofHash,
  },
  buildInputs: bundleBoundary.buildInputs,
  serverMarkerPresence: bundleBoundary.serverMarkerPresence,
  publicClientAbsence: bundleBoundary.publicClientAbsence,
  positiveLeakFailure: bundleBoundary.positiveLeakFailure,
  sourceBundleAgreement: bundleBoundary.sourceBundleAgreement,
  bundleHash: bundleBoundary.bundleHash,
});

const proofArtifacts = {
  "AI_ACTUAL_TREE_AND_STATIC_LANGUAGE_PROOF_V3_1.json": actualTreeProof,
  "AI_STATIC_MODULE_AND_RESOURCE_GRAPH_PROOF_V3_1.json": staticGraphProof,
  "AI_CAPABILITY_ORIGIN_AND_NON_REACHABILITY_PROOF_V3_1.json": originProof,
  "AI_PHASE_B_COMPOSITION_PROOF_V3_1.json": compositionProof,
  "AI_SERVER_PUBLIC_BUNDLE_BOUNDARY_V3_1.json": bundleProof,
};
if (JSON.stringify(Object.keys(proofArtifacts)) !== JSON.stringify([
  "AI_ACTUAL_TREE_AND_STATIC_LANGUAGE_PROOF_V3_1.json",
  "AI_STATIC_MODULE_AND_RESOURCE_GRAPH_PROOF_V3_1.json",
  "AI_CAPABILITY_ORIGIN_AND_NON_REACHABILITY_PROOF_V3_1.json",
  "AI_PHASE_B_COMPOSITION_PROOF_V3_1.json",
  "AI_SERVER_PUBLIC_BUNDLE_BOUNDARY_V3_1.json",
])) fail("V3.1 proof artifact set is not exactly five");

const evidenceDirectoryInput = argumentValue("--write-evidence-dir");
if (evidenceDirectoryInput !== undefined) {
  if (!bundleBoundary.sourceBundleAgreement || execFileSync("git", ["status", "--porcelain=v1"], { encoding: "utf8" }) !== "") {
    fail("proof emission requires clean exact code HEAD and verified bundle inputs");
  }
  const evidenceDirectory = resolve(repositoryRoot, evidenceDirectoryInput);
  if (evidenceDirectory === repositoryRoot || !evidenceDirectory.startsWith(`${repositoryRoot}${sep}`) ||
    existsSync(evidenceDirectory)) fail("proof output must be one absent repository-contained directory");
  const parent = dirname(evidenceDirectory);
  mkdirSync(parent, { recursive: true });
  const temporary = mkdtempSync(resolve(parent, ".m04-v31-proof-"));
  try {
    for (const [name, artifact] of Object.entries(proofArtifacts)) {
      const path = resolve(temporary, name);
      if (dirname(path) !== temporary) fail("proof output path escaped temporary directory");
      writeFileSync(path, `${canonical(artifact)}\n`, { encoding: "utf8", flag: "wx" });
    }
    renameSync(temporary, evidenceDirectory);
  } catch (error) {
    if (existsSync(temporary)) rmSync(temporary, { recursive: true });
    throw error;
  }
}
const proofArtifactHashes = Object.fromEntries(Object.entries(proofArtifacts).map(([name, artifact]) => [
  name,
  sha256(`${canonical(artifact)}\n`),
]));
const report = {
  ok: true,
  profileId: authority.profileId,
  profileSha256: expectedProfileIntegrityHash,
  profileFileSha256: expectedProfileFileHash,
  head: exactHead,
  lifecycleState: nextNode === undefined ? "source-clean-file-absent" : "official-next-generated-file-present",
  candidateCount: nodes.length,
  executableCount: nodes.filter((node) => executableExtensions.has(extname(node.path))).length,
  classes: Object.fromEntries(classDefinitions.map((definition) => [
    definition.id,
    classMembers.get(definition.id) ?? [],
  ])),
  zeroClass,
  ambiguous,
  sourceStateCounts,
  typeBoundaryProbes: {
    positive: positiveTypeConfigs.length,
    negative: negativeTypeConfigs.length,
  },
  moduleGraph: {
    edgeCount: graphEdges.length,
    graphSha256,
    protectedClosureCount: protectedClosure.length,
    coreClosureCount: coreClosure.length,
    publicClientRootCount: publicClientRoots.length,
    publicClientClosureCount: publicClientClosure.length,
    serverClosureCount: serverClosure.length,
    faultProbes: graphFaultResults,
    positiveProbes: graphPositiveResults,
    ordinaryGlobalUrlValueCount: ordinaryGlobalUrlValues.length,
    staticResourceCandidateCount: staticResourceCandidates.length,
  },
  bundleProofReady: bundleBoundary.sourceBundleAgreement,
  proofArtifactHashes,
  mutationProbes: {
    total: mutationResults.length,
    v16Original: mutationResults.filter((result) => result.id.startsWith("v1.6-")).length,
    attempt2: mutationResults.filter((result) => result.id.startsWith("attempt2-")).length,
    results: mutationResults,
  },
  excludedPhysicalRoots: excludedStatus,
  nextEnv: nextNode === undefined ? { present: false } : {
    present: true,
    classId: nextNode.classId,
    sourceState: nextNode.sourceState,
    sha256: nextNode.contentSha256,
  },
  inventorySha256,
  contentSha256,
  classificationSha256,
};
process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
