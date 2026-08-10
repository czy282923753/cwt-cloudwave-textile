import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

import { describe, expect, it } from "vitest";

import corpus from "../../../docs/review-evidence/phase-1b-stage4a-phase-b-three-strike-technical-escalation-remediation-v1/M02_FALSE_POSITIVE_AND_SECURITY_CORPUS_V1_1.json";
import selectedRegistry from "./protected-data-registry.v2_1.json";
import {
  compileProtectedDataRegistryV1,
  protectedDataClassifierV1,
  selectedProtectedDataRegistryIdentityV1,
} from "./protected-data";

describe("selected M02 protected-data authority", () => {
  it("keeps the selected transport byte-identical and hash-pinned", async () => {
    const bytes = await readFile(new URL("./protected-data-registry.v2_1.json", import.meta.url));
    expect(createHash("sha256").update(bytes).digest("hex"))
      .toBe(selectedProtectedDataRegistryIdentityV1.sha256);
    expect(selectedRegistry.rules).toHaveLength(32);
    expect(selectedRegistry.rules.slice(0, 30).map((rule) => rule.priority))
      .toEqual(Array.from({ length: 30 }, (_, index) => index + 1));
    expect(selectedRegistry.rules.slice(30).map((rule) => rule.priority))
      .toEqual([31, 32]);
  });

  it.each(corpus.cases)("classifies corpus case $id", (testCase) => {
    const original = testCase.input;
    const originalBytes = Buffer.from(original, "utf8");
    const value = testCase.targetDomain === "key"
      ? { [testCase.input]: "safe fixture text" }
      : { text: testCase.input };
    const result = protectedDataClassifierV1.classify(value);
    const actual = result.kind === "protected_match" ? result.category : result.kind;
    expect(actual).toBe(testCase.include);
    expect(testCase.input).toBe(original);
    expect(Buffer.from(testCase.input, "utf8")).toEqual(originalBytes);
  });

  it("fails closed before matching for unsupported structures", () => {
    const repeated = { text: "safe fixture text" };
    expect(protectedDataClassifierV1.classify({ one: repeated, two: repeated }).kind)
      .toBe("unsupported_value");
    expect(protectedDataClassifierV1.classify({ number: Number.POSITIVE_INFINITY }).kind)
      .toBe("unsupported_value");
    expect(protectedDataClassifierV1.classify(new Date()).kind)
      .toBe("unsupported_value");
    const sparse = new Array(2);
    sparse[1] = "safe fixture text";
    expect(protectedDataClassifierV1.classify(sparse).kind)
      .toBe("unsupported_value");
  });

  it("fails initialization on runtime mismatch or registry mutation", () => {
    expect(compileProtectedDataRegistryV1(selectedRegistry, {
      node: "24.14.1",
      v8: "13.6.233.17-node.41",
      icu: "78.2",
      unicode: "17.0",
      cldr: "48.0",
      platform: "darwin",
      arch: "arm64",
    })).toBeUndefined();

    const missingRule = structuredClone(selectedRegistry);
    missingRule.rules.pop();
    expect(compileProtectedDataRegistryV1(missingRule)).toBeUndefined();

    const changedGap = structuredClone(selectedRegistry);
    changedGap.rules[30]!.insertion.maximumCodePointsPerGap = 5;
    expect(compileProtectedDataRegistryV1(changedGap)).toBeUndefined();
  });

  it("enforces the exact structural and byte ceilings before classification", () => {
    let overDepth: unknown = "safe";
    for (let depth = 0; depth < 17; depth += 1) overDepth = [overDepth];

    const shared = { text: "safe" };
    const cases: readonly unknown[] = [
      overDepth,
      Array.from({ length: 4_096 }, () => null),
      "a".repeat(131_073),
      "\ufdfa".repeat(7_000),
      "\ud800",
      { one: shared, two: shared },
    ];
    for (const value of cases) {
      expect(protectedDataClassifierV1.classify(value).kind).toBe("unsupported_value");
    }
  });

  it("distinguishes the total inserted-scalar boundary at 64/65", () => {
    const gap = "\u200b";
    const literal = Array.from("environment variable");
    const withInsertedGaps = (extraAtSeventeenthTransition: boolean) => literal
      .map((character, index) => {
        if (index < 16) return `${character}${gap.repeat(4)}`;
        if (index === 16 && extraAtSeventeenthTransition) return `${character}${gap}`;
        return character;
      })
      .join("");

    expect(protectedDataClassifierV1.classify({ text: withInsertedGaps(false) }).kind)
      .toBe("protected_match");
    expect(protectedDataClassifierV1.classify({ text: withInsertedGaps(true) }).kind)
      .toBe("unsupported_value");
  });

  it("executes every declared mutation witness against the selected classifier", () => {
    const casesById = new Map(corpus.cases.map((testCase) => [testCase.id, testCase]));
    for (const mutation of corpus.mutationNegativeCases) {
      const witnessIds = "mustBeKilledByCaseIds" in mutation
        ? mutation.mustBeKilledByCaseIds
        : mutation.mustBeKilledByCompilerCaseIds;
      expect(witnessIds.length).toBeGreaterThan(0);
      for (const id of witnessIds) {
        if (!casesById.has(id)) {
          expect(corpus.compilerConformanceCases.some((testCase) => testCase.id === id)).toBe(true);
          continue;
        }
        const witness = casesById.get(id)!;
        const value = witness.targetDomain === "key"
          ? { [witness.input]: "safe fixture text" }
          : { text: witness.input };
        const result = protectedDataClassifierV1.classify(value);
        const actual = result.kind === "protected_match" ? result.category : result.kind;
        expect(actual).toBe(witness.include);
      }
    }
  });
});
