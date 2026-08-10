import { readdir, readFile, stat } from "node:fs/promises";
import { join, relative } from "node:path";

const buildRoot = process.env.CWT_BUILD_DIR ?? ".next";
const serverAppRoot = join(buildRoot, "server/app");
const forbidden = [
  "@refinedev",
  "/src/admin/",
  "RefineAdminProvider",
  "CWT_SERVER_AI_BOUNDARY_V1_5F4D7C2A",
  "CWT_SERVER_AI_PROMPT_BUNDLE_V1_91B6E4A3",
  "CWT_SYNTHETIC_TEST_DATA_NOT_A_CWT_FACT_V1",
  "synthetic_test_application",
  "synthetic_case_association",
];

async function filesUnder(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await filesUnder(path)));
    else files.push(path);
  }
  return files;
}

async function assertFreshBuild() {
  const buildIdPath = join(buildRoot, "BUILD_ID");
  let buildIdStat;
  try {
    const buildId = (await readFile(buildIdPath, "utf8")).trim();
    if (!buildId) throw new Error("BUILD_ID is empty");
    buildIdStat = await stat(buildIdPath);
  } catch {
    throw new Error(
      `Public bundle check requires a fresh production build; ${buildIdPath} is missing or invalid. Run pnpm build first.`,
    );
  }
  const inputRoots = ["src", "scripts", "package.json", "pnpm-lock.yaml", "next.config.ts"];
  const inputFiles = [];
  for (const input of inputRoots) {
    const details = await stat(input);
    if (details.isDirectory()) inputFiles.push(...(await filesUnder(input)));
    else inputFiles.push(input);
  }
  let newest = 0;
  let newestPath = "";
  for (const input of inputFiles) {
    const details = await stat(input);
    if (details.mtimeMs > newest) {
      newest = details.mtimeMs;
      newestPath = input;
    }
  }
  if (newest > buildIdStat.mtimeMs) {
    throw new Error(
      `Public bundle check refused a stale build: ${newestPath} is newer than ${buildIdPath}. Run pnpm build again.`,
    );
  }
}

await assertFreshBuild();

const manifests = (await filesUnder(serverAppRoot)).filter((path) => {
  const name = relative(serverAppRoot, path).replaceAll("\\", "/");
  return (
    name.endsWith("page_client-reference-manifest.js") &&
    !name.startsWith("admin/") &&
    !name.startsWith("(admin-preview)/") &&
    !name.startsWith("operations-login/")
  );
});

if (manifests.length === 0) {
  throw new Error("No fresh public page client-reference manifests were found.");
}

const checked = new Set();
const leaks = [];
const buildManifest = JSON.parse(await readFile(join(buildRoot, "build-manifest.json"), "utf8"));
const rootChunks = [
  ...(buildManifest.polyfillFiles ?? []),
  ...(buildManifest.rootMainFiles ?? []),
].filter((path) => typeof path === "string" && path.endsWith(".js"));
for (const chunkPath of rootChunks) {
  const localPath = join(buildRoot, chunkPath);
  checked.add(localPath);
  const chunk = await readFile(localPath, "utf8");
  for (const needle of forbidden) {
    if (chunk.includes(needle)) leaks.push(`${localPath}: ${needle}`);
  }
}
for (const manifestPath of manifests) {
  const manifest = await readFile(manifestPath, "utf8");
  checked.add(manifestPath);
  const assignmentAt = manifest.lastIndexOf("]=");
  if (assignmentAt < 0 || !manifest.endsWith(";")) {
    throw new Error(`Unrecognized client-reference manifest framing: ${manifestPath}`);
  }
  const parsed = JSON.parse(manifest.slice(assignmentAt + 2, -1));
  if (typeof parsed.clientModules !== "object" || parsed.clientModules === null) {
    throw new Error(`Client-reference manifest has no clientModules object: ${manifestPath}`);
  }
  const chunkPaths = new Set();
  for (const [modulePath, descriptor] of Object.entries(parsed.clientModules)) {
    if (typeof descriptor !== "object" || descriptor === null || !Array.isArray(descriptor.chunks)) {
      throw new Error(`Invalid client module descriptor in ${manifestPath}`);
    }
    const activeChunks = descriptor.chunks.filter(
      (value) => typeof value === "string" && value.startsWith("static/chunks/") && value.endsWith(".js"),
    );
    if (activeChunks.length === 0) continue;
    for (const needle of forbidden) {
      if (modulePath.includes(needle)) leaks.push(`${manifestPath}: active module ${needle}`);
    }
    for (const chunkPath of activeChunks) chunkPaths.add(chunkPath);
  }
  for (const chunkPath of chunkPaths) {
    let decodedChunkPath;
    try {
      decodedChunkPath = decodeURIComponent(chunkPath);
    } catch {
      throw new Error(`Public bundle manifest contains a malformed chunk path: ${chunkPath}`);
    }
    const localPath = join(buildRoot, decodedChunkPath);
    if (checked.has(localPath)) continue;
    checked.add(localPath);
    const chunk = await readFile(localPath, "utf8");
    for (const needle of forbidden) {
      if (chunk.includes(needle)) leaks.push(`${localPath}: ${needle}`);
    }
  }
}

if (leaks.length > 0) {
  throw new Error(`Admin-only dependencies leaked into public bundles:\n${leaks.join("\n")}`);
}

process.stdout.write(
  `Public bundle boundary verified across ${manifests.length} public page manifests and ${checked.size} manifest/chunk files.\n`,
);
