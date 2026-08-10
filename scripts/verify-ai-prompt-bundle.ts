import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { generatePromptBundleText } from "./generate-ai-prompt-bundle";

const outputs = {
  production: "src/ai/prompts/generated/production-prompt-bundle.generated.ts",
  "synthetic-test": "src/ai/testing/synthetic-prompts/synthetic-prompt-bundle.generated.ts",
} as const;

async function verify(scope: keyof typeof outputs): Promise<void> {
  const expected = await generatePromptBundleText(scope);
  const actual = await readFile(resolve(outputs[scope]), "utf8");
  if (actual !== expected) throw new Error(`${scope} Prompt bundle is stale.`);
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
