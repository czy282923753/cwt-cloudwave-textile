import { readFile, stat } from "node:fs/promises";

import { describe, expect, it } from "vitest";

const root = new URL("./phase-c-composition.ts", import.meta.url);

describe("sole Phase C server composition root", () => {
  it("has exactly the closed imports, exports and PGlite fail-closed Worker branch", async () => {
    const source = await readFile(root, "utf8");
    const exports = [...source.matchAll(/export function ([A-Za-z0-9_]+)/g)].map((match) => match[1]);
    expect(exports).toEqual(["createPhaseCServerAiServiceV1", "createPhaseCAiRunWorkerV1"]);
    expect(source).toContain('throw new Error("PGlite cannot run the durable AI Worker")');
    expect(source).toContain("productionTextProviderRegistryV1");
    expect(source).toContain("productionPromptLoaderV1");
    expect(source).toContain("productionPricingPolicyRegistryV1");
    await expect(stat(new URL("./phase-b-composition.ts", import.meta.url))).rejects.toThrow();
  });
});
