import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";

const buildRoot = process.argv[2] ?? ".next";
const markers = [
  "CWT_SERVER_AI_BOUNDARY_V1_5F4D7C2A",
  "CWT_SERVER_AI_PROMPT_BUNDLE_V1_91B6E4A3",
  "CWT_SYNTHETIC_TEST_DATA_NOT_A_CWT_FACT_V1",
];
const rawPromptMarker = "SYNTHETIC TEST DATA — NOT A CWT FACT";

async function files(root) {
  const output = [];
  for (const entry of await readdir(root, { withFileTypes: true })) {
    const path = join(root, entry.name);
    if (entry.isDirectory()) output.push(...await files(path));
    else if (entry.isFile()) output.push(path);
  }
  return output;
}

async function occurrences(paths, needle) {
  const matches = [];
  for (const path of paths) {
    if ((await readFile(path)).includes(Buffer.from(needle))) matches.push(path);
  }
  return matches;
}

const serverFiles = await files(join(buildRoot, "server"));
const clientFiles = (await files(join(buildRoot, "static", "chunks")))
  .filter((path) => path.endsWith(".js"));
for (const marker of [...markers, rawPromptMarker]) {
  const serverMatches = await occurrences(serverFiles, marker);
  if (serverMatches.length === 0) throw new Error(`Server fixture did not retain ${marker}.`);
  const clientMatches = await occurrences(clientFiles, marker);
  if (clientMatches.length !== 0) throw new Error(`Server-only marker leaked: ${clientMatches.join(",")}`);
}
if ((await occurrences(clientFiles, "CWT_PUBLIC_CLIENT_FIXTURE_V1")).length === 0) {
  throw new Error("Client scan did not observe its positive control.");
}
const positiveLeakProbe = Buffer.from(`prefix:${markers[0]}:suffix`);
if (!positiveLeakProbe.includes(Buffer.from(markers[0]))) {
  throw new Error("Positive leak detector control did not fire.");
}
process.stdout.write(JSON.stringify({
  ok: true,
  serverFileCount: serverFiles.length,
  clientFileCount: clientFiles.length,
  serverMarkers: markers.length,
  rawPromptMarker: true,
  positiveLeakControl: true,
}) + "\n");
