import { readFileSync, readdirSync, statSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const sourceRoot = resolve(process.cwd(), "src");

function filesBelow(directory: string): string[] {
  return readdirSync(directory).flatMap((entry) => {
    const path = resolve(directory, entry);
    return statSync(path).isDirectory() ? filesBelow(path) : [path];
  });
}

function source(path: string): string {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

describe("Phase E E2 static AI boundaries", () => {
  it("has exactly one new runtime importer of the byte-unchanged server AI composition", () => {
    const runtimeImporters = filesBelow(sourceRoot)
      .filter((path) => /\.(?:ts|tsx)$/.test(path) && !/\.(?:test|spec)\./.test(path))
      .filter((path) => readFileSync(path, "utf8").includes("phase-d-provider-composition"))
      .map((path) => path.slice(sourceRoot.length + 1));
    expect(runtimeImporters).toEqual(["admin/ai-actions.ts"]);
  });

  it("keeps the client panel outside database, Provider, Prompt and business-service boundaries", () => {
    const panel = source("src/admin/components/ai-draft-assistance-panel.tsx");
    expect(panel).toContain('"use client"');
    expect(panel).not.toMatch(/@\/(?:db|server\/ai|integrations\/ai|ai\/prompts|catalog|content|crm|uploads)\//);
    expect(panel).not.toMatch(/(?:database|schema|provider|prompt|objectKey|privateAsset)/i);
    expect(panel).not.toMatch(/\b(?:WebSocket|localStorage|sessionStorage|indexedDB|setInterval)\b/);
    expect(panel).not.toMatch(/\b(?:onApply|onChangeTarget|autosave|undo|diff)\b/i);
  });

  it("keeps Actions thin and leaves Product/Content pages and public APIs unintegrated", () => {
    const actions = source("src/admin/ai-actions.ts");
    expect(actions).toContain('"use server"');
    expect(actions).toContain("phase-d-provider-composition");
    expect(actions).not.toMatch(/@\/(?:db|catalog|content|crm|uploads)\//);
    expect(actions).not.toMatch(/(?:revalidatePath|redirect\(|fetch\(|WebSocket|providerRegistry|promptLoader)/);

    const applicationSources = filesBelow(resolve(sourceRoot, "app"))
      .filter((path) => /\.(?:ts|tsx)$/.test(path))
      .map((path) => readFileSync(path, "utf8").toLowerCase())
      .join("\n");
    expect(applicationSources).not.toContain("ai-draft-assistance-panel");
    expect(applicationSources).not.toContain("enqueueaidraftassistanceaction");
  });
});
