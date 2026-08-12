import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

const script = new URL("./validate-deepseek-text-adapter.ts", import.meta.url);

describe("controlled DeepSeek validation CLI", () => {
  it("imports only the sole controlled runner and exposes no alternate input", async () => {
    const source = await readFile(script, "utf8");
    const imports = [...source.matchAll(/^import .* from "([^"]+)";/gmu)].map((match) => match[1]);
    expect(imports).toEqual(["@/ai/testing/controlled-provider-validation"]);
    expect(source).toContain("runControlledDeepSeekValidationV1()");
    expect(source).not.toMatch(/fetch|adapter|repository|authorizeProviderDispatch|execute\s*\(/u);
    expect(source).not.toMatch(/process\.env|readline|prompt\s*\(/u);
  });
});
