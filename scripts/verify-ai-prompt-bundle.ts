import { lstat, readFile, readdir } from "node:fs/promises";
import { relative, resolve } from "node:path";

import { generatePromptBundleText } from "./generate-ai-prompt-bundle";

const outputs = {
  production: "src/ai/prompts/generated/production-prompt-bundle.generated.ts",
  "synthetic-test": "src/ai/testing/synthetic-prompts/synthetic-prompt-bundle.generated.ts",
} as const;

const manifests = {
  production: "src/ai/prompts/resources/production/manifest.v1.json",
  "synthetic-test": "src/ai/testing/synthetic-prompts/manifest.v1.json",
} as const;

const resourceRoots = {
  production: "src/ai/prompts/resources/production",
  "synthetic-test": "src/ai/testing/synthetic-prompts/resources",
} as const;

async function jsonFiles(root: string, directory = root): Promise<string[]> {
  const files: string[] = [];
  for (const entry of await readdir(resolve(directory), { withFileTypes: true })) {
    const path = resolve(directory, entry.name);
    const info = await lstat(path);
    if (info.isSymbolicLink()) throw new Error(`Prompt path is a symlink: ${path}`);
    if (entry.isDirectory()) files.push(...await jsonFiles(root, path));
    else if (entry.isFile() && entry.name.endsWith(".json")) {
      files.push(relative(resolve(root), path).replaceAll("\\", "/"));
    }
  }
  return files.sort();
}

async function verify(scope: keyof typeof outputs): Promise<void> {
  const expected = await generatePromptBundleText(scope);
  const actual = await readFile(resolve(outputs[scope]), "utf8");
  if (actual !== expected) throw new Error(`${scope} Prompt bundle is stale.`);
  const manifestInput: unknown = JSON.parse(await readFile(resolve(manifests[scope]), "utf8"));
  if (typeof manifestInput !== "object" || manifestInput === null || !("entries" in manifestInput) ||
    !Array.isArray(manifestInput.entries)) throw new Error(`${scope} Prompt manifest is invalid.`);
  const referenced: string[] = [];
  for (const entry of manifestInput.entries) {
    if (typeof entry !== "object" || entry === null || !("relativePath" in entry) ||
      typeof entry.relativePath !== "string") throw new Error(`${scope} Prompt manifest entry is invalid.`);
    referenced.push(entry.relativePath);
  }
  const observed = (await jsonFiles(resourceRoots[scope]))
    .filter((path) => scope !== "production" || path !== "manifest.v1.json");
  if (JSON.stringify(observed) !== JSON.stringify([...referenced].sort())) {
    throw new Error(`${scope} Prompt resource set contains stale or unreferenced bytes.`);
  }
  if (scope === "production" && referenced.length !== 0) {
    throw new Error("Phase B Production Prompt manifest must remain empty.");
  }
}

async function main(): Promise<void> {
  await verify("production");
  if (process.argv.includes("--include-synthetic-test")) await verify("synthetic-test");
  console.log("AI Prompt bundle verification passed.");
}

void main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Prompt verification failed.");
  process.exitCode = 1;
});
