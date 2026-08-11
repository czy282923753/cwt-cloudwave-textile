import { createHash } from "node:crypto";
import { existsSync, readFileSync, realpathSync } from "node:fs";
import { basename, resolve } from "node:path";
import { execFileSync } from "node:child_process";

function argument(name) {
  const prefix = `--${name}=`;
  const value = process.argv.find((item) => item.startsWith(prefix));
  if (value === undefined) throw new Error(`missing ${prefix}`);
  return value.slice(prefix.length);
}

function canonical(value) {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  return `{${Object.entries(value).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0)
    .map(([key, member]) => `${JSON.stringify(key)}:${canonical(member)}`).join(",")}}`;
}

const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const repository = realpathSync(argument("repository"));
const expectedHead = "4a053c0fa9449588e88f2b8519e74e08b1b59956";
const seal = "9b5be5792bbb7f863740dca3168081ad92ced868";
const executableTree = "067a5e2ec41b1809b38091972e362b0d5dd9fc559abf1a50545ecac05bc26674";
const proofRoot = resolve(repository,
  "docs/review-evidence/phase-1b-stage4a-phase-b-v2-2-fresh-replacement-foundation-implementation-imp3-nm01-physical-target-identity-remediation-v3/M04_FINAL_EXECUTABLE_TREE_PROOFS_V3_1");
const names = [
  "AI_ACTUAL_TREE_AND_STATIC_LANGUAGE_PROOF_V3_1.json",
  "AI_STATIC_MODULE_AND_RESOURCE_GRAPH_PROOF_V3_1.json",
  "AI_CAPABILITY_ORIGIN_AND_NON_REACHABILITY_PROOF_V3_1.json",
  "AI_PHASE_B_COMPOSITION_PROOF_V3_1.json",
  "AI_SERVER_PUBLIC_BUNDLE_BOUNDARY_V3_1.json",
];

const head = execFileSync("git", ["rev-parse", "HEAD"], { cwd: repository, encoding: "utf8" }).trim();
if (head !== expectedHead) throw new Error(`wrong HEAD ${head}`);
const proofResults = [];
for (const name of names) {
  const path = resolve(proofRoot, name);
  if (!existsSync(path)) throw new Error(`missing proof ${name}`);
  const value = JSON.parse(readFileSync(path, "utf8"));
  const declared = value.proofHash;
  delete value.proofHash;
  const recomputed = sha256(canonical(value));
  if (declared !== recomputed || value.candidateCommit !== seal ||
    value.inputHashes?.executableTree !== executableTree || value.schemaVersion !== 31) {
    throw new Error(`proof binding mismatch ${name}`);
  }
  proofResults.push({ name: basename(path), proofHash: declared, candidateCommit: value.candidateCommit,
    executableTree: value.inputHashes.executableTree });
}

const productionManifest = JSON.parse(readFileSync(resolve(repository,
  "src/ai/prompts/resources/production/manifest.v1.json"), "utf8"));
const providerRegistry = readFileSync(resolve(repository, "src/ai/providers/registry.ts"), "utf8");
if (canonical(productionManifest) !== canonical({ manifestVersion: 1, entries: [] }) ||
  !/createTextProviderRegistryV1\(\[\]\)/u.test(providerRegistry) ||
  /https?:|api[_-]?key|credential|fallback|openai|anthropic|deepseek/iu.test(providerRegistry)) {
  throw new Error("Production Prompt or Provider registry is not exact-empty");
}

process.stdout.write(`${JSON.stringify({
  ok: true,
  head,
  seal,
  executableTree,
  proofCount: proofResults.length,
  proofs: proofResults,
  productionPromptManifest: "exact-empty",
  productionProviderRegistry: "exact-empty",
}, null, 2)}\n`);
