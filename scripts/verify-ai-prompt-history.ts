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
function tree(commit: string): readonly string[] {
  try {
    return git(["ls-tree", "-r", "--name-only", commit, "--", root])
      .split("\n").filter((value) => value.length > 0).sort();
  } catch {
    return [];
  }
}

const basePaths = tree(base);
const candidatePaths = new Set(tree(candidate));
for (const path of basePaths) {
  if (!candidatePaths.has(path)) throw new Error(`Protected Prompt path was deleted: ${path}`);
  const before = execFileSync("git", ["show", `${base}:${path}`]);
  const after = execFileSync("git", ["show", `${candidate}:${path}`]);
  if (!before.equals(after)) throw new Error(`Protected Prompt bytes changed: ${path}`);
}
console.log(`AI Prompt history verification passed: ${base}..${candidate}`);
