import { readdir, readFile, realpath, stat } from "node:fs/promises";
import { isAbsolute, join, relative, resolve, sep } from "node:path";
import ts from "typescript";

const buildRoot = process.env.CWT_BUILD_DIR ?? ".next";
const serverRoot = join(buildRoot, "server");
const serverAppRoot = join(buildRoot, "server/app");
const absoluteBuildRoot = resolve(buildRoot);
const promptBundleSourcePath = "src/ai/prompts/generated/production-prompt-bundle.generated.ts";
const currentChunkPrefix = "/_next/static/chunks/";
const legacyChunkPrefix = "static/chunks/";
const clientReferenceManifestFramings = [
  {
    preamble:
      "globalThis.__RSC_MANIFEST = globalThis.__RSC_MANIFEST || {};\nglobalThis.__RSC_MANIFEST[",
    delimiter: "] = ",
  },
  // Rollback-only compatibility owned by the public-bundle checker. Remove when the
  // supported rollback baseline no longer emits this exact legacy Webpack framing.
  {
    preamble:
      "globalThis.__RSC_MANIFEST=(globalThis.__RSC_MANIFEST||{});globalThis.__RSC_MANIFEST[",
    delimiter: "]=",
  },
];
const serverMarkers = [
  "CWT_SERVER_AI_BOUNDARY_V1_5F4D7C2A",
  "CWT_SERVER_AI_PROMPT_BUNDLE_V1_91B6E4A3",
];
const serverRateLimiterMarkers = [
  "@valkey/valkey-glide",
  "fixed-window-v1",
];
const serverScannerMarkers = [
  "/virus/scan/file",
  "CleanResult",
  "FoundViruses",
  "Apikey",
];
const approvedPromptTuples = [
  ["fabric-knowledge-draft", 1, "b3b65d50e9ea0d5f5da2e0dca25d808463a47fbf59a7dfcb9b71b64823501a8c"],
  ["product-description-draft", 1, "0aefaeb2dba08c76587f6501451dc0031b6f825ab3bb903be00f28dda5e0b198"],
  ["seo-content-draft", 1, "91f8868efad16310a5ed26c85a6001024572949c59725efe2b6c0df935499195"],
  ["sourcing-guide-draft", 1, "e4aaf2e39483bde7569edb529f1c1d213b0a11d68ac4a9b99075992620238adf"],
];
const baseForbidden = [
  "@refinedev",
  "/src/admin/",
  "RefineAdminProvider",
  ...serverMarkers,
  ...approvedPromptTuples.flatMap((tuple) => [tuple[0], tuple[2]]),
  "CWT_SYNTHETIC_TEST_DATA_NOT_A_CWT_FACT_V1",
  "synthetic_test_application",
  "synthetic_case_association",
  "src/ai/testing",
  "deepseek-text-adapter",
  "api.deepseek.com",
  "deepseek-v4-flash",
  "DeepSeek-V4-Flash-0731",
  "phase-d-provider-composition",
  "production-prompt-bundle.generated",
  "productionPromptBundleV1",
  '"targetProductId"',
  '"targetContentId"',
  '"targetRevisionId"',
  '"targetSnapshotHash"',
  '"runId"',
  '"candidateHash"',
  "sourceEntityType",
  "sourceEntityId",
  "source_entity_type",
  "source_entity_id",
  "inquiry-source-resolution",
  "inquiry-read-projection",
  "email_template_active_v1",
  "SYNTHETIC_EMAIL_TEMPLATE_V1",
  "/src/email-templates/",
  "@valkey/valkey-glide",
  "@valkey/valkey-glide-linux-",
  "valkey_glide",
  "valkey-rate-limiter",
  "rate-limiter-factory",
  "fixed-window-v1",
  "cloudmersive-file-scanner",
  "/virus/scan/file",
  "CloudmersiveFileScanner",
  "CleanResult",
  "FoundViruses",
  "FILE_SCAN_API_KEY",
  "Apikey",
];

async function readProductionPromptAuthority() {
  const source = await readFile(promptBundleSourcePath, "utf8");
  const entries = [...source.matchAll(
    /promptId: "([a-z-]+)",\s+promptVersion: ([0-9]+),\s+sha256: "([0-9a-f]{64})",[\s\S]*?rawBase64: "([A-Za-z0-9+/=]+)"/g,
  )].map((match) => ({
    promptId: match[1],
    promptVersion: Number(match[2]),
    sha256: match[3],
    rawBase64: match[4],
  }));
  if (entries.length !== approvedPromptTuples.length ||
    entries.some((entry, index) => {
      const tuple = approvedPromptTuples[index];
      return entry.promptId !== tuple[0] || entry.promptVersion !== tuple[1] ||
        entry.sha256 !== tuple[2] || entry.rawBase64.length === 0;
    })) {
    throw new Error("Generated Production Prompt authority does not match the approved tuple contract.");
  }
  return entries;
}

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

function eligibleServerRuntimeIdentity(path) {
  const absolutePath = resolve(path);
  if (!isContainedPath(absoluteBuildRoot, absolutePath)) return undefined;
  const serverRelativePath = relative(resolve(serverRoot), absolutePath);
  if (serverRelativePath === "" || serverRelativePath === ".." ||
    serverRelativePath.startsWith(`..${sep}`) || isAbsolute(serverRelativePath)) return undefined;
  const identity = serverRelativePath.split(sep).join("/");
  const lowerIdentity = identity.toLowerCase();
  if (!identity.endsWith(".js") || lowerIdentity.includes("manifest") ||
    lowerIdentity.includes("trace") || lowerIdentity.includes("cache")) {
    return undefined;
  }
  if (identity.startsWith("chunks/") && identity.length > "chunks/.js".length) {
    return `server/${identity}`;
  }
  if (/^app\/(?:.*\/)?(?:page|route)\.js$/.test(identity)) return `server/${identity}`;
  return undefined;
}

function directPropertyName(property) {
  if (!ts.isPropertyAssignment(property) || ts.isComputedPropertyName(property.name)) {
    return undefined;
  }
  if (ts.isIdentifier(property.name) || ts.isStringLiteral(property.name)) {
    return property.name.text;
  }
  return undefined;
}

function hasExactPromptTupleBinding(file, [promptId, promptVersion, sha256]) {
  if (!file.content.includes(promptId) || !file.content.includes(sha256)) return false;
  const parsed = ts.createSourceFile(
    file.identity,
    file.content,
    ts.ScriptTarget.ESNext,
    true,
    ts.ScriptKind.JS,
  );
  if (parsed.parseDiagnostics?.length > 0) return false;
  let matched = false;
  function visit(node, insideSpreadOperand = false) {
    if (matched) return;
    if (!insideSpreadOperand && ts.isObjectLiteralExpression(node)) {
      const directFields = new Map();
      for (const property of node.properties) {
        const name = directPropertyName(property);
        if (name === undefined || directFields.has(name)) {
          directFields.clear();
          break;
        }
        directFields.set(name, property.initializer);
      }
      const id = directFields.get("promptId");
      const version = directFields.get("promptVersion");
      const hash = directFields.get("sha256");
      matched = id !== undefined && version !== undefined && hash !== undefined &&
        ts.isStringLiteral(id) && id.text === promptId &&
        ts.isNumericLiteral(version) && Number(version.text) === promptVersion &&
        ts.isStringLiteral(hash) && hash.text === sha256;
    }
    if (ts.isSpreadAssignment(node)) {
      visit(node.expression, true);
      return;
    }
    if (!matched) ts.forEachChild(node, (child) => visit(child, insideSpreadOperand));
  }
  visit(parsed);
  return matched;
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

function expectedRouteKeyForManifest(manifestPath) {
  const relativePath = relative(serverAppRoot, manifestPath);
  if (sep === "/" && relativePath.includes("\\")) {
    throw new Error("Invalid client-reference manifest filesystem path.");
  }
  const portablePath = relativePath.split(sep).join("/");
  const suffix = "_client-reference-manifest.js";
  if (
    !portablePath.endsWith(suffix) ||
    portablePath === suffix ||
    portablePath.startsWith("../")
  ) {
    throw new Error(`Invalid client-reference manifest path: ${manifestPath}`);
  }
  return `/${portablePath.slice(0, -suffix.length)}`;
}

function hasSafeChunkSegment(segment) {
  if (!segment || segment === "." || segment === "..") return false;
  for (const character of segment) {
    const code = character.codePointAt(0);
    const isAsciiAlphaNumeric =
      (code >= 0x30 && code <= 0x39) ||
      (code >= 0x41 && code <= 0x5a) ||
      (code >= 0x61 && code <= 0x7a);
    if (!isAsciiAlphaNumeric && !"-._~@()[]".includes(character)) return false;
  }
  return true;
}

function normalizeChunkPath(chunkPath, source) {
  if (
    typeof chunkPath !== "string" ||
    chunkPath.includes("\\") ||
    chunkPath.includes("?") ||
    chunkPath.includes("#")
  ) {
    throw new Error(`Invalid public bundle chunk path in ${source}`);
  }

  let encodedSuffix;
  if (chunkPath.startsWith(currentChunkPrefix)) {
    encodedSuffix = chunkPath.slice(currentChunkPrefix.length);
  } else if (chunkPath.startsWith(legacyChunkPrefix)) {
    encodedSuffix = chunkPath.slice(legacyChunkPrefix.length);
  } else {
    throw new Error(`Unrecognized public bundle chunk namespace in ${source}`);
  }

  if (!encodedSuffix) {
    throw new Error(`Invalid public bundle chunk path in ${source}`);
  }

  const decodedSegments = encodedSuffix.split("/").map((encodedSegment) => {
    if (!encodedSegment) {
      throw new Error(`Invalid public bundle chunk path in ${source}`);
    }
    let segment;
    try {
      segment = decodeURIComponent(encodedSegment);
    } catch {
      throw new Error(`Public bundle manifest contains a malformed chunk path in ${source}`);
    }
    if (segment.includes("/") || segment.includes("\\") || !hasSafeChunkSegment(segment)) {
      throw new Error(`Invalid public bundle chunk path in ${source}`);
    }
    return segment;
  });

  if (!decodedSegments.at(-1).endsWith(".js")) {
    throw new Error(`Invalid public bundle chunk path in ${source}`);
  }
  return ["static", "chunks", ...decodedSegments].join("/");
}

function normalizedDescriptorChunks(chunks, manifestPath) {
  const normalized = new Set();
  for (let index = 0; index < chunks.length; index += 1) {
    const value = chunks[index];
    if (typeof value !== "string") {
      throw new Error(`Invalid client module descriptor in ${manifestPath}`);
    }
    if (value.startsWith(currentChunkPrefix) || value.startsWith(legacyChunkPrefix)) {
      normalized.add(normalizeChunkPath(value, manifestPath));
      continue;
    }

    const following = chunks[index + 1];
    const isLegacyChunkId =
      value !== "." && value !== ".." && /^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(value);
    if (
      isLegacyChunkId &&
      typeof following === "string" &&
      following.startsWith(legacyChunkPrefix)
    ) {
      normalized.add(normalizeChunkPath(following, manifestPath));
      index += 1;
      continue;
    }
    throw new Error(`Invalid client chunk entry in ${manifestPath}`);
  }
  return normalized;
}

function isContainedPath(root, candidate) {
  const relativePath = relative(root, candidate);
  return (
    relativePath !== "" &&
    relativePath !== ".." &&
    !relativePath.startsWith(`..${sep}`) &&
    !isAbsolute(relativePath)
  );
}

async function resolveChunkIdentity(identity, realBuildRoot, source) {
  const lexicalPath = resolve(absoluteBuildRoot, ...identity.split("/"));
  if (!isContainedPath(absoluteBuildRoot, lexicalPath)) {
    throw new Error(`Public bundle chunk escapes the lexical build root in ${source}`);
  }

  let physicalPath;
  try {
    physicalPath = await realpath(lexicalPath);
  } catch {
    throw new Error(`Public bundle chunk is missing or inaccessible in ${source}`);
  }
  if (!isContainedPath(realBuildRoot, physicalPath)) {
    throw new Error(`Public bundle chunk escapes the real build root in ${source}`);
  }
  const details = await stat(physicalPath);
  if (!details.isFile()) {
    throw new Error(`Public bundle chunk is not a file in ${source}`);
  }
  return physicalPath;
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
  if (routeKey !== expectedRouteKeyForManifest(manifestPath)) {
    throw new Error(`Client-reference manifest route key does not match its path: ${manifestPath}`);
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
const realBuildRoot = await realpath(absoluteBuildRoot);
const promptAuthority = await readProductionPromptAuthority();
const forbidden = [...baseForbidden, ...promptAuthority.map((entry) => entry.rawBase64)];

const eligibleServerRuntimePaths = (await filesUnder(serverRoot))
  .map((path) => ({ path, identity: eligibleServerRuntimeIdentity(path) }))
  .filter((entry) => entry.identity !== undefined);
if (eligibleServerRuntimePaths.length === 0) {
  throw new Error("No eligible executable server runtime JavaScript output was found.");
}
const serverRuntimeJavaScript = [];
for (const { path: lexicalPath, identity } of eligibleServerRuntimePaths) {
  const absoluteLexicalPath = resolve(lexicalPath);
  if (!isContainedPath(absoluteBuildRoot, absoluteLexicalPath)) {
    throw new Error("Server runtime JavaScript output escapes the lexical build root.");
  }
  let physicalPath;
  try {
    physicalPath = await realpath(absoluteLexicalPath);
  } catch {
    throw new Error("Server runtime JavaScript output is missing or inaccessible.");
  }
  if (!isContainedPath(realBuildRoot, physicalPath)) {
    throw new Error("Server runtime JavaScript output escapes the real build root.");
  }
  const details = await stat(physicalPath);
  if (!details.isFile()) {
    throw new Error("Server runtime JavaScript output is not a regular file.");
  }
  serverRuntimeJavaScript.push({
    identity,
    content: await readFile(physicalPath, "utf8"),
  });
}

const serverEvidenceIdentities = new Set();
for (const marker of serverMarkers) {
  const evidence = serverRuntimeJavaScript.find((file) => file.content.includes(marker));
  if (evidence === undefined) {
    throw new Error(`Required server AI marker is missing: ${marker}`);
  }
  serverEvidenceIdentities.add(evidence.identity);
}
for (const marker of serverRateLimiterMarkers) {
  const evidence = serverRuntimeJavaScript.find((file) => file.content.includes(marker));
  if (evidence === undefined) {
    throw new Error(`Required server-only Rate Limiter marker is missing: ${marker}`);
  }
  serverEvidenceIdentities.add(evidence.identity);
}
const scannerEvidence = serverRuntimeJavaScript.find((file) =>
  serverScannerMarkers.every((marker) => file.content.includes(marker)));
if (scannerEvidence === undefined) {
  throw new Error(
    `Required co-located server-only File Scanner contract is missing: ${serverScannerMarkers.join(", ")}`,
  );
}
serverEvidenceIdentities.add(scannerEvidence.identity);
for (const [promptId, promptVersion, sha256] of approvedPromptTuples) {
  const evidence = serverRuntimeJavaScript.find((file) =>
    hasExactPromptTupleBinding(file, [promptId, promptVersion, sha256]));
  if (evidence === undefined) {
    throw new Error(`Required co-bound server Prompt tuple is missing: ${promptId}@${promptVersion}`);
  }
  serverEvidenceIdentities.add(evidence.identity);
}

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

const leaks = [];
const scannedPhysicalChunks = new Set();
const rootChunkIdentities = new Set();
const manifestChunkIdentities = new Set();

async function scanChunk(identity, source, coverage) {
  coverage.add(identity);
  const physicalPath = await resolveChunkIdentity(identity, realBuildRoot, source);
  if (scannedPhysicalChunks.has(physicalPath)) return;
  scannedPhysicalChunks.add(physicalPath);
  const chunk = await readFile(physicalPath, "utf8");
  for (const needle of forbidden) {
    if (chunk.includes(needle)) leaks.push(`${identity}: ${needle}`);
  }
}

const staticFiles = await filesUnder(join(buildRoot, "static"));
const staticNativeFiles = staticFiles.filter((path) => path.endsWith(".node"));
if (staticNativeFiles.length > 0) {
  throw new Error(`Native server dependency leaked into public static output:\n${staticNativeFiles.join("\n")}`);
}

const buildManifest = JSON.parse(await readFile(join(buildRoot, "build-manifest.json"), "utf8"));
if (typeof buildManifest !== "object" || buildManifest === null || Array.isArray(buildManifest)) {
  throw new Error("Invalid build-manifest.json root chunk contract.");
}
const rootChunks = [
  ...(buildManifest.polyfillFiles ?? []),
  ...(buildManifest.rootMainFiles ?? []),
];
for (const chunkPath of rootChunks) {
  const identity = normalizeChunkPath(chunkPath, "build-manifest.json");
  await scanChunk(identity, "build-manifest.json", rootChunkIdentities);
}
for (const manifestPath of manifests) {
  const manifest = await readFile(manifestPath, "utf8");
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
    const activeChunks = normalizedDescriptorChunks(descriptor.chunks, manifestPath);
    if (activeChunks.size === 0) continue;
    for (const needle of forbidden) {
      if (modulePath.includes(needle)) leaks.push(`${manifestPath}: active module ${needle}`);
    }
    for (const chunkPath of activeChunks) chunkPaths.add(chunkPath);
  }
  for (const identity of chunkPaths) {
    await scanChunk(identity, manifestPath, manifestChunkIdentities);
  }
}

if (manifestChunkIdentities.size === 0) {
  throw new Error("No normalized manifest-referenced public chunks were found.");
}

if (leaks.length > 0) {
  throw new Error(`Admin-only dependencies leaked into public bundles:\n${leaks.join("\n")}`);
}

process.stdout.write(
  `Public bundle boundary verified: ${serverRuntimeJavaScript.length} eligible server runtime JavaScript files; AI evidence in ${[...serverEvidenceIdentities].sort().join(", ")}; ${manifests.length} public page manifests; ${rootChunkIdentities.size} root chunks; ${manifestChunkIdentities.size} manifest chunks; ${scannedPhysicalChunks.size} distinct chunk files.\n`,
);
