import { readdir, readFile, stat } from "node:fs/promises";
import { join, relative } from "node:path";

const buildRoot = process.env.CWT_BUILD_DIR ?? ".next";
const serverAppRoot = join(buildRoot, "server/app");
const clientReferenceManifestFramings = [
  {
    preamble:
      "globalThis.__RSC_MANIFEST = globalThis.__RSC_MANIFEST || {};\nglobalThis.__RSC_MANIFEST[",
    delimiter: "] = ",
  },
  {
    preamble:
      "globalThis.__RSC_MANIFEST=(globalThis.__RSC_MANIFEST||{});globalThis.__RSC_MANIFEST[",
    delimiter: "]=",
  },
];
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

function hasSafeRouteKeyShape(routeKey) {
  if (routeKey === "/") return true;
  if (!routeKey.startsWith("/") || routeKey.endsWith("/")) return false;

  for (const encodedSegment of routeKey.slice(1).split("/")) {
    if (!encodedSegment) return false;

    let segment;
    try {
      segment = decodeURIComponent(encodedSegment);
    } catch {
      return false;
    }
    if (!segment || segment === "." || segment === "..") return false;

    for (const character of segment) {
      const code = character.codePointAt(0);
      const isAsciiAlphaNumeric =
        (code >= 0x30 && code <= 0x39) ||
        (code >= 0x41 && code <= 0x5a) ||
        (code >= 0x61 && code <= 0x7a);
      if (!isAsciiAlphaNumeric && !"-._~@()[]".includes(character)) return false;
    }
  }

  return true;
}

function parseClientReferenceManifest(manifest, manifestPath) {
  let framedEnd = manifest.length;
  while (framedEnd > 0) {
    const code = manifest.charCodeAt(framedEnd - 1);
    if (code !== 0x09 && code !== 0x0a && code !== 0x0d && code !== 0x20) break;
    framedEnd -= 1;
  }
  const framed = manifest.slice(0, framedEnd);

  const framing = clientReferenceManifestFramings.find(({ preamble }) =>
    framed.startsWith(preamble),
  );
  if (framing === undefined || !framed.endsWith(";")) {
    throw new Error(`Unrecognized client-reference manifest framing: ${manifestPath}`);
  }

  const assignment = framed.slice(framing.preamble.length, -1);
  if (!assignment.startsWith('"')) {
    throw new Error(`Invalid client-reference manifest route key: ${manifestPath}`);
  }

  let routeLiteralEnd = -1;
  let escaped = false;
  for (let index = 1; index < assignment.length; index += 1) {
    const character = assignment[index];
    if (escaped) {
      escaped = false;
    } else if (character === "\\") {
      escaped = true;
    } else if (character === '"') {
      routeLiteralEnd = index + 1;
      break;
    }
  }
  if (routeLiteralEnd < 0) {
    throw new Error(`Invalid client-reference manifest route key: ${manifestPath}`);
  }

  let routeKey;
  try {
    routeKey = JSON.parse(assignment.slice(0, routeLiteralEnd));
  } catch {
    throw new Error(`Invalid client-reference manifest route key: ${manifestPath}`);
  }
  if (typeof routeKey !== "string" || !hasSafeRouteKeyShape(routeKey)) {
    throw new Error(`Invalid client-reference manifest route key: ${manifestPath}`);
  }

  const afterRouteKey = assignment.slice(routeLiteralEnd);
  if (!afterRouteKey.startsWith(framing.delimiter)) {
    throw new Error(`Unrecognized client-reference manifest framing: ${manifestPath}`);
  }
  const jsonRhs = afterRouteKey.slice(framing.delimiter.length);

  let parsed;
  try {
    parsed = JSON.parse(jsonRhs);
  } catch {
    throw new Error(`Invalid client-reference manifest JSON: ${manifestPath}`);
  }
  return parsed;
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
  const parsed = parseClientReferenceManifest(manifest, manifestPath);
  if (
    typeof parsed !== "object" ||
    parsed === null ||
    Array.isArray(parsed) ||
    typeof parsed.clientModules !== "object" ||
    parsed.clientModules === null ||
    Array.isArray(parsed.clientModules)
  ) {
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
