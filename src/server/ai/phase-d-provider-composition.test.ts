import { readFile, stat } from "node:fs/promises";

import { describe, expect, it } from "vitest";

const root = new URL("./phase-d-provider-composition.ts", import.meta.url);

describe("sole Phase D server composition root", () => {
  it("has exactly the accepted exports and fail-closed capability matrix", async () => {
    const source = await readFile(root, "utf8");
    const exports = [...source.matchAll(/export function ([A-Za-z0-9_]+)/g)].map((match) => match[1]);
    expect(exports).toEqual(["createPhaseDServerAiServiceV1", "createPhaseDAiRunWorkerV1"]);
    expect(source).toContain('throw new Error("PGlite cannot run the durable AI Worker")');
    expect(source).toContain('throw new Error("The Phase D Provider Worker requires enabled Staging.")');
    expect(source).toContain("productionTextProviderRegistryV1");
    expect(source).toContain("productionPromptLoaderV1");
    expect(source).toContain("productionPricingPolicyRegistryV1");
    expect(source).toContain("createDeepSeekTextProviderV1()");
    expect(source).not.toContain("DEEPSEEK_API_KEY");
    await expect(stat(new URL("./phase-c-composition.ts", import.meta.url))).rejects.toThrow();
    await expect(stat(new URL("./phase-b-composition.ts", import.meta.url))).rejects.toThrow();
  });
});
