import { execFileSync } from "node:child_process";

function argument(name: string): string {
  const prefix = `--${name}=`;
  const value = process.argv.find((item) => item.startsWith(prefix));
  if (value === undefined || value.slice(prefix.length).length === 0) {
    throw new Error(`Missing explicit ${prefix}<git-object>.`);
  }
  return value.slice(prefix.length);
}

function git(args: readonly string[]): string {
  return execFileSync("git", [...args], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trimEnd();
}

function resolveObject(value: string): string {
  const resolved = git(["rev-parse", "--verify", `${value}^{commit}`]);
  if (!/^[0-9a-f]{40}$/.test(resolved)) throw new Error("Git object is not a complete commit.");
  return resolved;
}

const base = resolveObject(argument("base"));
const candidate = resolveObject(argument("candidate"));
try {
  execFileSync("git", ["merge-base", "--is-ancestor", base, candidate], { stdio: "ignore" });
} catch {
  throw new Error("Prompt history base must be an ancestor of Candidate.");
}

const root = "src/ai/prompts/resources/production";
const manifestPath = `${root}/manifest.v1.json`;
function tree(commit: string): readonly string[] {
  return git(["ls-tree", "-r", "--name-only", commit, "--", root])
    .split("\n").filter((value) => value.length > 0).sort();
}

interface PromptManifestHistory {
  readonly manifestVersion: number;
  readonly entries: readonly string[];
}

function manifest(commit: string): PromptManifestHistory {
  const input: unknown = JSON.parse(git(["show", `${commit}:${manifestPath}`]));
  if (typeof input !== "object" || input === null || Array.isArray(input) ||
    !("manifestVersion" in input) || !("entries" in input) ||
    typeof input.manifestVersion !== "number" || !Number.isInteger(input.manifestVersion) ||
    !Array.isArray(input.entries)) {
    throw new Error("Prompt history manifest is invalid.");
  }
  const entries: string[] = [];
  for (const entry of input.entries) {
    if (typeof entry !== "object" || entry === null || Array.isArray(entry) ||
      !("promptId" in entry) || !("promptVersion" in entry) || !("sha256" in entry) ||
      !("relativePath" in entry) || typeof entry.promptId !== "string" ||
      typeof entry.promptVersion !== "number" || !Number.isInteger(entry.promptVersion) ||
      typeof entry.sha256 !== "string" ||
      typeof entry.relativePath !== "string") {
      throw new Error("Prompt history manifest entry is invalid.");
    }
    entries.push(JSON.stringify([
      entry.promptId,
      entry.promptVersion,
      entry.sha256,
      entry.relativePath,
    ]));
  }
  return { manifestVersion: input.manifestVersion, entries };
}

const basePaths = tree(base).filter((path) => path !== manifestPath);
const candidatePaths = new Set(tree(candidate));
for (const path of basePaths) {
  if (!candidatePaths.has(path)) throw new Error(`Protected Prompt path was deleted: ${path}`);
  const before = execFileSync("git", ["show", `${base}:${path}`]);
  const after = execFileSync("git", ["show", `${candidate}:${path}`]);
  if (!before.equals(after)) throw new Error(`Protected Prompt bytes changed: ${path}`);
}
const baseManifest = manifest(base);
const candidateManifest = manifest(candidate);
if (candidateManifest.manifestVersion !== baseManifest.manifestVersion) {
  throw new Error("Prompt manifestVersion changed.");
}
const candidateEntries = new Set(candidateManifest.entries);
for (const entry of baseManifest.entries) {
  if (!candidateEntries.has(entry)) throw new Error(`Protected Prompt manifest entry changed: ${entry}`);
}
console.log(`AI Prompt history verification passed: ${base}..${candidate}`);
