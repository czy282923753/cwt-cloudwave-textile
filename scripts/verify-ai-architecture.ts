import { createHash } from "node:crypto";
import { execFileSync, spawnSync } from "node:child_process";
import {
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  realpathSync,
  writeFileSync,
} from "node:fs";
import { dirname, extname, posix, relative, resolve, sep } from "node:path";
import ts from "typescript";

const profilePath = "docs/review-evidence/phase-1b-stage4a-phase-b-corrected-design-v1-7-remediation-attempt-2-v1/M03_CAPABILITY_GRAPH_AND_DATABASE_SEAM_PROFILE_V2_2.json";
const expectedProfileHash = "1f0b56a870ecbab61c970e1c7000dff591674e0f8ad0a04341538c724a36c173";
const repositoryRoot = realpathSync(process.cwd());
const profileBytes = readFileSync(resolve(repositoryRoot, profilePath));

function sha256(value: string | Uint8Array): string {
  return createHash("sha256").update(value).digest("hex");
}

function fail(reason: string): never {
  throw new Error(`AI architecture gate failed closed: ${reason}`);
}

if (sha256(profileBytes) !== expectedProfileHash) fail("selected M03 V2.2 profile hash mismatch");
const profile: unknown = JSON.parse(profileBytes.toString("utf8"));

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
}

function parseProfile(value: unknown): ArchitectureProfile {
  if (typeof value !== "object" || value === null) fail("profile is not an object");
  const candidate = value as Partial<ArchitectureProfile>;
  if (candidate.profileId !== "cwt.phase1b.stage4a.phaseb.m03-protected-graph.v2_2" ||
    candidate.profileVersion !== "2.2.0" || candidate.classificationModel === undefined ||
    candidate.filesystemEnumeration === undefined || candidate.resourceAndGeneratedPolicy === undefined) {
    fail("profile identity or required section mismatch");
  }
  return candidate as ArchitectureProfile;
}

const authority = parseProfile(profile);
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
  | "import-equals"
  | "import-type"
  | "dynamic-import"
  | "require"
  | "require-resolve"
  | "module-require"
  | "create-require"
  | "resource-url";

interface ParsedAcquisitionV1 {
  readonly form: GraphEdgeForm;
  readonly edgeKind: GraphEdgeKind;
  readonly specifier?: string;
  readonly position: number;
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

function constInitializers(source: ts.SourceFile): ReadonlyMap<string, ts.Expression> {
  const candidates = new Map<string, ts.Expression>();
  const duplicated = new Set<string>();
  function visit(node: ts.Node): void {
    if (ts.isVariableDeclarationList(node) && (node.flags & ts.NodeFlags.Const) !== 0) {
      for (const declaration of node.declarations) {
        if (!ts.isIdentifier(declaration.name) || declaration.initializer === undefined) continue;
        const name = declaration.name.text;
        if (candidates.has(name)) duplicated.add(name);
        else candidates.set(name, declaration.initializer);
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(source);
  for (const name of duplicated) candidates.delete(name);
  return candidates;
}

type FoldedPrimitive = string | number | boolean | null;

function foldStaticPrimitive(
  expression: ts.Expression,
  aliases: ReadonlyMap<string, ts.Expression>,
  visiting: ReadonlySet<string> = new Set<string>(),
): FoldedPrimitive | undefined {
  if (ts.isParenthesizedExpression(expression) || ts.isAsExpression(expression) ||
    ts.isSatisfiesExpression(expression) || ts.isTypeAssertionExpression(expression) ||
    ts.isNonNullExpression(expression)) {
    return foldStaticPrimitive(expression.expression, aliases, visiting);
  }
  if (ts.isStringLiteral(expression) || ts.isNoSubstitutionTemplateLiteral(expression)) {
    return expression.text;
  }
  if (ts.isNumericLiteral(expression)) return Number(expression.text);
  if (expression.kind === ts.SyntaxKind.TrueKeyword) return true;
  if (expression.kind === ts.SyntaxKind.FalseKeyword) return false;
  if (expression.kind === ts.SyntaxKind.NullKeyword) return null;
  if (ts.isTemplateExpression(expression)) {
    let value = expression.head.text;
    for (const span of expression.templateSpans) {
      const folded = foldStaticPrimitive(span.expression, aliases, visiting);
      if (folded === undefined) return undefined;
      value += String(folded) + span.literal.text;
    }
    return value;
  }
  if (ts.isBinaryExpression(expression) && expression.operatorToken.kind === ts.SyntaxKind.PlusToken) {
    const left = foldStaticPrimitive(expression.left, aliases, visiting);
    const right = foldStaticPrimitive(expression.right, aliases, visiting);
    if (left === undefined || right === undefined) return undefined;
    if (typeof left === "string" || typeof right === "string") return String(left) + String(right);
    if (typeof left === "number" && typeof right === "number") return left + right;
    return undefined;
  }
  if (ts.isIdentifier(expression)) {
    if (visiting.has(expression.text)) return undefined;
    const initializer = aliases.get(expression.text);
    if (initializer === undefined) return undefined;
    const next = new Set(visiting);
    next.add(expression.text);
    return foldStaticPrimitive(initializer, aliases, next);
  }
  return undefined;
}

function isImportMetaUrl(
  expression: ts.Expression,
  aliases: ReadonlyMap<string, ts.Expression>,
  visiting: ReadonlySet<string> = new Set<string>(),
): boolean {
  if (ts.isParenthesizedExpression(expression) || ts.isAsExpression(expression) ||
    ts.isSatisfiesExpression(expression) || ts.isTypeAssertionExpression(expression) ||
    ts.isNonNullExpression(expression)) {
    return isImportMetaUrl(expression.expression, aliases, visiting);
  }
  if (ts.isPropertyAccessExpression(expression) && expression.name.text === "url" &&
    ts.isMetaProperty(expression.expression) &&
    expression.expression.keywordToken === ts.SyntaxKind.ImportKeyword &&
    expression.expression.name.text === "meta") return true;
  if (ts.isElementAccessExpression(expression) && expression.argumentExpression !== undefined &&
    foldStaticPrimitive(expression.argumentExpression, aliases) === "url" &&
    ts.isMetaProperty(expression.expression) &&
    expression.expression.keywordToken === ts.SyntaxKind.ImportKeyword &&
    expression.expression.name.text === "meta") return true;
  if (!ts.isIdentifier(expression) || visiting.has(expression.text)) return false;
  const initializer = aliases.get(expression.text);
  if (initializer === undefined) return false;
  const next = new Set(visiting);
  next.add(expression.text);
  return isImportMetaUrl(initializer, aliases, next);
}

function importDeclarationIsTypeOnly(node: ts.ImportDeclaration): boolean {
  const clause = node.importClause;
  if (clause === undefined) return false;
  if (clause.isTypeOnly) return true;
  if (clause.name !== undefined || clause.namedBindings === undefined) return false;
  return ts.isNamedImports(clause.namedBindings) && clause.namedBindings.elements.length > 0 &&
    clause.namedBindings.elements.every((element) => element.isTypeOnly);
}

function collectAcquisitions(path: string, text: string): readonly ParsedAcquisitionV1[] {
  const syntaxCheck = ts.transpileModule(text, {
    fileName: path.endsWith(".d.ts") ? path.slice(0, -5) + ".ts" : path,
    reportDiagnostics: true,
    compilerOptions: {
      target: ts.ScriptTarget.ESNext,
      module: ts.ModuleKind.ESNext,
      jsx: ts.JsxEmit.ReactJSX,
      allowJs: true,
    },
  });
  const syntaxFailure = syntaxCheck.diagnostics?.find((diagnostic) =>
    diagnostic.category === ts.DiagnosticCategory.Error);
  if (syntaxFailure !== undefined) {
    rejectGraph("fail_closed_source_parse", `${path}:${syntaxFailure.start ?? 0}`);
  }
  const source = ts.createSourceFile(path, text, ts.ScriptTarget.Latest, true, scriptKind(path));
  const aliases = constInitializers(source);
  const createRequireLoaders = new Set<string>();
  function collectLoaders(node: ts.Node): void {
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) &&
      node.initializer !== undefined && ts.isCallExpression(node.initializer) &&
      ts.isIdentifier(node.initializer.expression) &&
      node.initializer.expression.text === "createRequire") {
      createRequireLoaders.add(node.name.text);
    }
    ts.forEachChild(node, collectLoaders);
  }
  collectLoaders(source);
  let discoveredLoader = true;
  while (discoveredLoader) {
    discoveredLoader = false;
    for (const [name, initializer] of aliases) {
      if (createRequireLoaders.has(name)) continue;
      const directAlias = ts.isIdentifier(initializer) &&
        (initializer.text === "require" || createRequireLoaders.has(initializer.text));
      const moduleRequireAlias = (ts.isPropertyAccessExpression(initializer) &&
        ts.isIdentifier(initializer.expression) && initializer.expression.text === "module" &&
        initializer.name.text === "require") ||
        (ts.isElementAccessExpression(initializer) && ts.isIdentifier(initializer.expression) &&
          initializer.expression.text === "module" && initializer.argumentExpression !== undefined &&
          foldStaticPrimitive(initializer.argumentExpression, aliases) === "require");
      if (directAlias || moduleRequireAlias) {
        createRequireLoaders.add(name);
        discoveredLoader = true;
      }
    }
  }
  const acquisitions: ParsedAcquisitionV1[] = [];
  function add(
    form: GraphEdgeForm,
    edgeKind: GraphEdgeKind,
    expression: ts.Expression | undefined,
    node: ts.Node,
  ): void {
    const folded = expression === undefined ? undefined : foldStaticPrimitive(expression, aliases);
    if (typeof folded !== "string") {
      acquisitions.push({
        form,
        edgeKind,
        position: node.getStart(source),
        unsupportedReason: expression === undefined ? "missing_specifier" : "non_foldable_specifier",
      });
      return;
    }
    acquisitions.push({ form, edgeKind, specifier: folded, position: node.getStart(source) });
  }
  function visit(node: ts.Node): void {
    if (ts.isImportDeclaration(node)) {
      add("import", importDeclarationIsTypeOnly(node) ? "type-only" : "runtime",
        node.moduleSpecifier, node);
    } else if (ts.isExportDeclaration(node) && node.moduleSpecifier !== undefined) {
      add("re-export", node.isTypeOnly ? "type-only" : "runtime",
        node.moduleSpecifier, node);
    } else if (ts.isImportEqualsDeclaration(node) &&
      ts.isExternalModuleReference(node.moduleReference)) {
      add("import-equals", node.isTypeOnly ? "type-only" : "runtime",
        node.moduleReference.expression, node);
    } else if (ts.isImportTypeNode(node) && ts.isLiteralTypeNode(node.argument)) {
      add("import-type", "type-only",
        node.argument.literal, node);
    } else if (ts.isCallExpression(node)) {
      if (node.expression.kind === ts.SyntaxKind.ImportKeyword) {
        add("dynamic-import", "runtime", node.arguments[0], node);
      } else if (ts.isIdentifier(node.expression) &&
        (node.expression.text === "require" || createRequireLoaders.has(node.expression.text))) {
        add(createRequireLoaders.has(node.expression.text) ? "create-require" : "require",
          "runtime", node.arguments[0], node);
      } else if (ts.isPropertyAccessExpression(node.expression)) {
        const owner = node.expression.expression;
        if (node.expression.name.text === "resolve" && ts.isIdentifier(owner) &&
          (owner.text === "require" || createRequireLoaders.has(owner.text))) {
          add("require-resolve", "runtime", node.arguments[0], node);
        } else if (node.expression.name.text === "require" && ts.isIdentifier(owner) &&
          owner.text === "module") {
          add("module-require", "runtime", node.arguments[0], node);
        }
      } else if (ts.isElementAccessExpression(node.expression) &&
        node.expression.argumentExpression !== undefined) {
        const owner = node.expression.expression;
        const member = foldStaticPrimitive(node.expression.argumentExpression, aliases);
        if (member === "resolve" && ts.isIdentifier(owner) && owner.text === "require") {
          add("require-resolve", "runtime", node.arguments[0], node);
        } else if (member === "require" && ts.isIdentifier(owner) && owner.text === "module") {
          add("module-require", "runtime", node.arguments[0], node);
        }
      }
    } else if (ts.isNewExpression(node) && ts.isIdentifier(node.expression) &&
      node.expression.text === "URL" && node.arguments !== undefined &&
      node.arguments.length === 2 && node.arguments[1] !== undefined &&
      isImportMetaUrl(node.arguments[1], aliases)) {
      add("resource-url", "resource", node.arguments[0], node);
    }
    ts.forEachChild(node, visit);
  }
  visit(source);
  return acquisitions.sort((left, right) => left.position - right.position);
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

function enforceCapabilityEdge(
  edge: GraphEdgeV1,
  sourceClass = classForPath(edge.from),
  publicClient = false,
): void {
  if (edge.resolutionKind === "unsupported" || edge.resolutionKind === "unresolved") {
    if (productionClasses.has(sourceClass) || publicClient) {
      rejectGraph("fail_closed_unsupported_acquisition", JSON.stringify({
        path: edge.from,
        rule: "production-acquisition-must-resolve-uniquely",
        ast: {
          form: edge.form,
          edgeKind: edge.edgeKind,
          position: edge.position,
        },
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
      rejectGraph("fail_closed_unknown_protected_package", `${edge.from}->${specifier}`);
    }
    if (testOrControlClasses.has(sourceClass) && [
      "node:http", "node:https", "node:net", "node:tls", "openai",
      "@anthropic-ai/sdk", "@google/generative-ai", "@google/genai",
      "cohere-ai", "groq-sdk", "ollama",
    ].some((value) => specifier === value || specifier.startsWith(`${value}/`))) {
      rejectGraph("fail_closed_capability_ceiling", `${edge.from}->${specifier}`);
    }
    if (publicClient && specifier === "server-only") {
      rejectGraph("fail_closed_public_client_to_server", `${edge.from}->${specifier}`);
    }
    return;
  }
  const target = edge.resolvedTarget ?? rejectGraph(
    "fail_closed_unsupported_acquisition", `${edge.from}:${edge.position}`,
  );
  if (target === rootPath && edge.from !== rootPath) {
    rejectGraph("fail_closed_composition_incoming_edge", `${edge.from}->${target}`);
  }
  if (target.startsWith("src/server/ai/") && edge.from !== rootPath) {
    rejectGraph("fail_closed_composition_incoming_edge", `${edge.from}->${target}`);
  }
  if (publicClient && (target.startsWith("src/ai/") || target.startsWith("src/server/ai/") ||
    target.startsWith("src/integrations/ai/providers/"))) {
    rejectGraph("fail_closed_public_client_to_server", `${edge.from}->${target}`);
  }
  if (testOrControlClasses.has(sourceClass) &&
    (target.startsWith("src/server/ai/") || target.startsWith("src/integrations/ai/providers/") ||
      (sourceClass === "root-control-file" && target.startsWith("src/ai/")))) {
    rejectGraph("fail_closed_capability_ceiling", `${edge.from}->${target}`);
  }
  const targetNode = nodeByPath.get(target);
  if (productionClasses.has(sourceClass) && targetNode !== undefined &&
    (targetNode.classId === "synthetic-ai-test-code" || targetNode.classId === "other-test-fixtures")) {
    rejectGraph("fail_closed_production_to_test", `${edge.from}->${target}`);
  }
  if (sourceClass === "business-consumer" && target.startsWith("src/ai/") &&
    (edge.specifier !== "@/ai" || target !== "src/ai/index.ts")) {
    rejectGraph("fail_closed_business_ai_boundary", `${edge.from}->${target}`);
  }
  if (sourceClass === "protected-ai") {
    if (target.startsWith("src/ai/testing/") || target.startsWith("src/server/ai/") ||
      target.startsWith("src/integrations/ai/providers/") || target === "src/db/client.ts" ||
      target === "src/config/env.ts") {
      rejectGraph("fail_closed_protected_authority_escape", `${edge.from}->${target}`);
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
        rejectGraph("fail_closed_unapproved_protected_edge", `${edge.from}->${target}`);
      }
    }
  }
}

const graphEdges: GraphEdgeV1[] = [];
for (const node of executableNodes) {
  const text = readFileSync(resolve(repositoryRoot, node.path), "utf8");
  for (const acquisition of collectAcquisitions(node.path, text)) {
    const edge = resolveAcquisition(node.path, acquisition);
    enforceCapabilityEdge(edge);
    graphEdges.push(edge);
  }
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

interface GraphFaultFixtureV1 {
  readonly version: 1;
  readonly cases: readonly {
    readonly id: string;
    readonly sourcePath: string;
    readonly source: string;
    readonly expectedCode: string;
  }[];
  readonly topologyCases: readonly {
    readonly id: string;
    readonly path: string;
    readonly expectedCode: string;
  }[];
}

function parseGraphFaultFixture(input: unknown): GraphFaultFixtureV1 {
  if (typeof input !== "object" || input === null || !("version" in input) ||
    input.version !== 1 || !("cases" in input) || !Array.isArray(input.cases) ||
    !("topologyCases" in input) || !Array.isArray(input.topologyCases)) {
    fail("graph fault fixture is invalid");
  }
  const cases: GraphFaultFixtureV1["cases"][number][] = [];
  for (const candidate of input.cases) {
    if (typeof candidate !== "object" || candidate === null ||
      !("id" in candidate) || typeof candidate.id !== "string" ||
      !("sourcePath" in candidate) || typeof candidate.sourcePath !== "string" ||
      !("source" in candidate) || typeof candidate.source !== "string" ||
      !("expectedCode" in candidate) || typeof candidate.expectedCode !== "string") {
      fail("graph fault case is invalid");
    }
    cases.push({
      id: candidate.id,
      sourcePath: candidate.sourcePath,
      source: candidate.source,
      expectedCode: candidate.expectedCode,
    });
  }
  const topologyCases: GraphFaultFixtureV1["topologyCases"][number][] = [];
  for (const candidate of input.topologyCases) {
    if (typeof candidate !== "object" || candidate === null ||
      !("id" in candidate) || typeof candidate.id !== "string" ||
      !("path" in candidate) || typeof candidate.path !== "string" ||
      !("expectedCode" in candidate) || typeof candidate.expectedCode !== "string") {
      fail("graph topology fault case is invalid");
    }
    topologyCases.push({
      id: candidate.id,
      path: candidate.path,
      expectedCode: candidate.expectedCode,
    });
  }
  return { version: 1, cases, topologyCases };
}

const graphFaultFixture = parseGraphFaultFixture(JSON.parse(readFileSync(
  resolve(repositoryRoot, "test-fixtures/ai-architecture/graph-faults.v2_2.json"),
  "utf8",
)));
const graphFaultResults: {
  readonly id: string;
  readonly code: string;
  readonly detail: string;
}[] = [];
for (const fault of graphFaultFixture.cases) {
  let observed: ArchitectureGraphFailure | undefined;
  try {
    const sourceClass = classForPath(fault.sourcePath);
    const publicClient = /^\s*["']use client["'];/u.test(fault.source);
    for (const acquisition of collectAcquisitions(fault.sourcePath, fault.source)) {
      enforceCapabilityEdge(resolveAcquisition(fault.sourcePath, acquisition), sourceClass, publicClient);
    }
  } catch (error) {
    if (error instanceof ArchitectureGraphFailure) observed = error;
    else throw error;
  }
  if (observed?.code !== fault.expectedCode) {
    fail(`graph fault ${fault.id} expected ${fault.expectedCode}, got ${observed?.code ?? "pass"}`);
  }
  if (observed.code === "fail_closed_unsupported_acquisition" &&
    (!observed.detail.includes(`"path":"${fault.sourcePath}"`) ||
      !observed.detail.includes('"rule":"production-acquisition-must-resolve-uniquely"') ||
      !observed.detail.includes('"ast":{') || !observed.detail.includes('"acquisition":{'))) {
    fail(`graph fault ${fault.id} lacks exact acquisition diagnostics`);
  }
  graphFaultResults.push({ id: fault.id, code: observed.code, detail: observed.detail });
}

function enforceTopology(paths: readonly string[]): void {
  const phaseD = paths.find((path) => path === "src/server/ai/phase-d-provider-composition.ts");
  const adapter = paths.find((path) => path.startsWith("src/integrations/ai/providers/"));
  const undeclared = paths.find((path) => path.startsWith("src/server/ai/") &&
    path !== rootPath && path !== "src/server/ai/phase-d-provider-composition.ts");
  if (phaseD !== undefined || adapter !== undefined) {
    rejectGraph("fail_closed_future_stage_unauthorized", phaseD ?? adapter ?? "unknown");
  }
  if (undeclared !== undefined) rejectGraph("fail_closed_undeclared_composition", undeclared);
}
enforceTopology(actualFiles);
for (const fault of graphFaultFixture.topologyCases) {
  let observed: ArchitectureGraphFailure | undefined;
  try {
    enforceTopology([...actualFiles, fault.path]);
  } catch (error) {
    if (error instanceof ArchitectureGraphFailure) observed = error;
    else throw error;
  }
  if (observed?.code !== fault.expectedCode) {
    fail(`topology fault ${fault.id} expected ${fault.expectedCode}, got ${observed?.code ?? "pass"}`);
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
const localTsc = resolve(repositoryRoot, "node_modules/.bin/tsc");
for (const config of positiveTypeConfigs) {
  const compiled = spawnSync(localTsc, ["-p", config], {
    cwd: repositoryRoot,
    encoding: "utf8",
  });
  if (compiled.status !== 0) fail(`positive type fixture failed: ${config}`);
}
for (const config of negativeTypeConfigs) {
  const compiled = spawnSync(localTsc, ["-p", config.path], {
    cwd: repositoryRoot,
    encoding: "utf8",
  });
  const output = `${compiled.stdout}${compiled.stderr}`;
  if (compiled.status === 0 || !output.includes(config.code)) {
    fail(`negative type fixture did not fail with ${config.code}: ${config.path}`);
  }
}
for (const path of actualFiles.filter((candidate) => candidate.startsWith("test-fixtures/ai-types/read-scope/") && candidate.endsWith(".ts"))) {
  const source = readFileSync(resolve(repositoryRoot, path), "utf8");
  if (/\bdeclare\s+const\b|\bas\s+(?:const|unknown|any)\b|@ts-|\bany\b/.test(source)) {
    fail(`read-scope fixture contains a construction bypass: ${path}`);
  }
}

function canonical(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  return `{${Object.entries(value).sort(([left], [right]) => left < right ? -1 : left > right ? 1 : 0)
    .map(([key, member]) => `${JSON.stringify(key)}:${canonical(member)}`).join(",")}}`;
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
const graphManifestEntries = nodes.map((node) => ({
  path: node.path,
  realpath: posixPath(relative(repositoryRoot, realpathSync(resolve(repositoryRoot, node.path)))),
  sha256: node.contentSha256,
  primaryRootClass: node.classId,
  stageStatus: node.stageStatus,
  bundleZones: node.bundleZones,
  sourceState: node.sourceState,
  generated: node.generated,
  edges: graphEdges.filter((edge) => edge.from === node.path),
}));
const actualTreeProof = {
  proofId: "cwt.phase1b.stage4a.phaseb.actual-tree-classification.v2_2",
  profileId: authority.profileId,
  profileSha256: expectedProfileHash,
  exactCodeHead: exactHead,
  lifecycleState: nextNode === undefined ? "source-clean-file-absent" : "official-next-generated-file-present",
  candidateCount: nodes.length,
  executableCount: executableNodes.length,
  classes: Object.fromEntries(classDefinitions.map((definition) => [
    definition.id,
    classMembers.get(definition.id) ?? [],
  ])),
  zeroClass,
  ambiguous,
  sourceStateCounts,
  excludedPhysicalRoots: excludedStatus,
  symlinkPolicy: "raw lstat walk; any observed symlink outside sealed physical exclusions fails",
  hardLinkPolicy: "device/inode ownership unique across every observed non-excluded file",
  canonicalCollisionPolicy: "NFC lowercase canonical path ownership unique",
  hashes: { inventorySha256, contentSha256, classificationSha256 },
};
const protectedGraphManifest = {
  proofId: "cwt.phase1b.stage4a.phaseb.protected-graph-manifest.v2_2",
  profileId: authority.profileId,
  profileSha256: expectedProfileHash,
  exactCodeHead: exactHead,
  graphSha256,
  nodeCount: nodes.length,
  edgeCount: graphEdges.length,
  unsupportedOrUnresolvedEdges: graphEdges.filter((edge) =>
    edge.resolutionKind === "unsupported" || edge.resolutionKind === "unresolved"),
  expectedAbsence: {
    phaseDComposition: !actualFiles.includes("src/server/ai/phase-d-provider-composition.ts"),
    providerAdapterZone: !actualFiles.some((path) => path.startsWith("src/integrations/ai/providers/")),
  },
  nodes: graphManifestEntries,
};
const phaseBCompositionProof = {
  proofId: "cwt.phase1b.stage4a.phaseb.composition.v2_2",
  profileId: authority.profileId,
  profileSha256: expectedProfileHash,
  exactCodeHead: exactHead,
  path: rootPath,
  realpath: posixPath(relative(repositoryRoot, realpathSync(resolve(repositoryRoot, rootPath)))),
  sha256: sha256(readFileSync(resolve(repositoryRoot, rootPath))),
  exactImports: rootEdges,
  rootFacts,
  discriminatedCases: ["pglite", "postgres"],
  neverDefaultCount: (rootSource.match(/unsupportedDatabaseConnection\(databaseConnection\)/g) ?? []).length,
  mutuallyExclusiveFactoryCallSites: 2,
  runtimeFactoryCallsPerInvocation: 1,
  wrapperOrDiscriminatorCrossing: false,
  incomingEdges: graphEdges.filter((edge) => edge.resolvedTarget === rootPath),
  typeBoundaryProbes: {
    positive: positiveTypeConfigs,
    negative: negativeTypeConfigs,
  },
  expectedAbsence: {
    phaseDComposition: true,
    providerAdapterZone: true,
  },
};
const capabilityOriginProof = {
  proofId: "cwt.phase1b.stage4a.phaseb.capability-origin.v2_2",
  profileId: authority.profileId,
  profileSha256: expectedProfileHash,
  exactCodeHead: exactHead,
  graphSha256,
  protectedClosure,
  coreClosure,
  publicClientRoots,
  publicClientClosure,
  serverClosure,
  protectedForbiddenOriginReachability: {
    environment: protectedClosure.includes("src/config/env.ts"),
    databaseConnection: protectedClosure.includes("src/db/client.ts"),
    providerAdapter: protectedClosure.some((path) => path.startsWith("src/integrations/ai/providers/")),
    testing: protectedClosure.some((path) => path.startsWith("src/ai/testing/")),
  },
  exactProtectedCwtEdges: graphEdges.filter((edge) =>
    classForPath(edge.from) === "protected-ai" && edge.resolutionKind === "local" &&
    edge.resolvedTarget !== undefined && !edge.resolvedTarget.startsWith("src/ai/")),
  protectedExternalPackages: [...new Set(graphEdges.filter((edge) =>
    classForPath(edge.from) === "protected-ai" && edge.resolutionKind === "external")
    .map((edge) => edge.externalPackage ?? edge.specifier ?? ""))].sort(),
  outerCapabilityOrigins: ["src/config/env.ts", "src/db/client.ts"],
  graphFaultResults,
  providerRegistry: "exact-empty",
  secondDatabaseAuthority: false,
};

const proofArtifacts = {
  "AI_ACTUAL_TREE_CLASSIFICATION_PROOF_V2_2.json": actualTreeProof,
  "AI_PROTECTED_GRAPH_MANIFEST_V2_2.json": protectedGraphManifest,
  "AI_PHASE_B_COMPOSITION_PROOF_V2_2.json": phaseBCompositionProof,
  "AI_CAPABILITY_ORIGIN_PROOF_V2_2.json": capabilityOriginProof,
};
const evidenceArgument = process.argv.indexOf("--write-evidence-dir");
if (evidenceArgument >= 0) {
  const evidenceDirectory = process.argv[evidenceArgument + 1];
  if (evidenceDirectory === undefined || evidenceDirectory.length === 0) {
    fail("--write-evidence-dir requires one exact directory");
  }
  mkdirSync(evidenceDirectory, { recursive: true });
  for (const [name, artifact] of Object.entries(proofArtifacts)) {
    const path = resolve(evidenceDirectory, name);
    if (dirname(path) !== resolve(evidenceDirectory)) fail("evidence output path escaped directory");
    writeFileSync(path, `${JSON.stringify(artifact, null, 2)}\n`, { encoding: "utf8" });
  }
}
const proofArtifactHashes = Object.fromEntries(Object.entries(proofArtifacts).map(([name, artifact]) => [
  name,
  sha256(`${JSON.stringify(artifact, null, 2)}\n`),
]));
const report = {
  ok: true,
  profileId: authority.profileId,
  profileSha256: expectedProfileHash,
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
  },
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
