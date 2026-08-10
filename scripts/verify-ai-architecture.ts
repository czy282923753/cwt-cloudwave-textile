import { createHash } from "node:crypto";
import { execFileSync, spawnSync } from "node:child_process";
import {
  lstatSync,
  readFileSync,
  readdirSync,
  realpathSync,
} from "node:fs";
import { extname, relative, resolve, sep } from "node:path";

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
const exactSpecifiers = rootSource.split("\n")
  .filter((line) => line.startsWith("import "))
  .map((line) => line.match(/"([^"]+)"/)?.[1] ?? fail(`unparsed import in ${rootPath}`));
if (JSON.stringify(exactSpecifiers) !== JSON.stringify([
  "server-only",
  "@/config/env",
  "@/db/client",
  "@/ai/config/trusted-phase-b-environment",
  "@/ai/applications/draft-assistance/composition",
])) fail("Phase B outer composition imports differ from the exact five-edge seam");
if ((rootSource.match(/createPhaseBAvailabilityServiceV1\(\{/g) ?? []).length !== 2 ||
  (rootSource.match(/database:\s*databaseConnection\.db/g) ?? []).length !== 2 ||
  !rootSource.includes("switch (databaseConnection.kind)") ||
  !rootSource.includes('case "pglite"') || !rootSource.includes('case "postgres"') ||
  !rootSource.includes("default:") || /\bas\b|\bany\b|\bunknown\b/.test(rootSource)) {
  fail("Phase B outer composition does not satisfy the direct discriminated seam");
}

for (const node of nodes.filter((entry) => entry.classId === "protected-ai")) {
  const source = readFileSync(resolve(repositoryRoot, node.path), "utf8");
  if (source.includes("@/db/client") || source.includes("@/config/env") ||
    source.includes("@/server/ai/") || source.includes("@/integrations/ai/providers/") ||
    /\bprocess\.env\b|\bglobalThis\.process\b/.test(source)) {
    fail(`protected authority escape in ${node.path}`);
  }
  if (source.includes("@/ai/testing/")) fail(`Production-to-test import in ${node.path}`);
}
const generateCallOwners = nodes.filter((entry) => entry.classId === "protected-ai" &&
  readFileSync(resolve(repositoryRoot, entry.path), "utf8").includes(".generateText("));
if (generateCallOwners.length !== 1 || generateCallOwners[0]?.path !== "src/ai/core/orchestrator.ts") {
  fail("Text provider call authority is not unique to core/orchestrator.ts");
}
const providerRegistry = readFileSync(resolve(repositoryRoot, "src/ai/providers/registry.ts"), "utf8");
if (!providerRegistry.includes("createTextProviderRegistryV1([])")) fail("Production Provider registry is not exact-empty");
const productionManifest = readFileSync(resolve(repositoryRoot, "src/ai/prompts/resources/production/manifest.v1.json"), "utf8");
if (productionManifest !== '{"manifestVersion":1,"entries":[]}\n') fail("Production Prompt manifest is not exact-empty");

const positiveTypeConfigs = [
  "test-fixtures/ai-types/database-seam/tsconfig.positive.json",
  "test-fixtures/ai-types/read-scope/tsconfig.positive.json",
];
const negativeTypeConfigs = [
  { path: "test-fixtures/ai-types/database-seam/tsconfig.cross-driver-negative.json", code: "TS2379" },
  { path: "test-fixtures/ai-types/database-seam/tsconfig.unnarrowed-negative.json", code: "TS2379" },
  { path: "test-fixtures/ai-types/read-scope/tsconfig.common-authority-negative.json", code: "TS2339" },
  { path: "test-fixtures/ai-types/read-scope/tsconfig.external-fabrication-negative.json", code: "TS2741" },
  { path: "test-fixtures/ai-types/read-scope/tsconfig.mode-mismatch-negative.json", code: "TS2345" },
];
for (const config of positiveTypeConfigs) {
  const compiled = spawnSync("tsc", ["-p", config], {
    cwd: repositoryRoot,
    encoding: "utf8",
  });
  if (compiled.status !== 0) fail(`positive type fixture failed: ${config}`);
}
for (const config of negativeTypeConfigs) {
  const compiled = spawnSync("tsc", ["-p", config.path], {
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
const report = {
  ok: true,
  profileId: authority.profileId,
  profileSha256: expectedProfileHash,
  head: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
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
  excludedPhysicalRoots: excludedStatus,
  nextEnv: nextNode === undefined ? { present: false } : {
    present: true,
    classId: nextNode.classId,
    sourceState: nextNode.sourceState,
    sha256: nextNode.contentSha256,
  },
  inventorySha256: sha256(canonical(nodes.map((node) => ({
    path: node.path,
    sourceState: node.sourceState,
    contentSha256: node.contentSha256,
    generated: node.generated,
  })))),
  contentSha256: sha256("cwt-v17-content-v2\n" + nodes
    .map((node) => `${node.path}\0${node.contentSha256}\n`).join("")),
  classificationSha256: sha256("cwt-v17-classification-v2\n" + nodes
    .map((node) => `${node.path}\0${node.classId}\0${node.stageStatus}\0${node.bundleZones.join(",")}\n`).join("")),
};
process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
