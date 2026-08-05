import { describe, expect, it } from "vitest";

import {
  formatGeneratedProductCode,
  nextGeneratedProductCode,
  normalizeAssignedProductCode,
  normalizeComposition,
  normalizeMoq,
  normalizeProductCodePrefix,
  normalizeProductName,
} from "./product-data";

describe("Phase 1B Product data standards", () => {
  it("validates managed prefixes and deterministic codes", () => {
    expect(normalizeProductCodePrefix(" pol ")).toBe("POL");
    expect(() => normalizeProductCodePrefix("P2")).toThrow(/3–8/);
    expect(formatGeneratedProductCode("POL", 7)).toBe("CWT-POL-007");
    expect(nextGeneratedProductCode("POL", ["LEGACY-1", "CWT-POL-001", "CWT-POL-009"]))
      .toBe("CWT-POL-010");
    expect(() => formatGeneratedProductCode("POL", 1000)).toThrow(/1 through 999/);
  });

  it("normalizes assigned codes without weakening the no-space rule", () => {
    expect(normalizeAssignedProductCode(" cwt-pol-010 ")).toBe("CWT-POL-010");
    expect(() => normalizeAssignedProductCode("CWT POL 010")).toThrow(/hyphen/);
  });

  it("normalizes Composition separators without changing ratios or forcing totals", () => {
    expect(normalizeComposition("92%  Polyester/8% Spandex")).toBe(
      "92% Polyester / 8% Spandex",
    );
    expect(normalizeComposition("40% Cotton / 40% Linen")).toBe(
      "40% Cotton / 40% Linen",
    );
    expect(normalizeComposition(null)).toBeNull();
    expect(() => normalizeComposition("Polyester")).toThrow(/Composition must use/);
  });

  it("stores MOQ value and the exact approved unit as an atomic pair", () => {
    expect(normalizeMoq("500", "m")).toEqual({ moqValue: "500", moqUnit: "m" });
    expect(normalizeMoq("", "")).toEqual({ moqValue: null, moqUnit: null });
    expect(() => normalizeMoq("500", "pcs")).toThrow();
    expect(() => normalizeMoq("500", "")).toThrow(/together/);
  });

  it("keeps Product names plain and bounded", () => {
    expect(normalizeProductName(" Polyester   Chiffon Fabric ")).toBe(
      "Polyester Chiffon Fabric",
    );
    expect(() => normalizeProductName("<script>")).toThrow(/markup/);
  });
});
