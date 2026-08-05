import { describe, expect, it } from "vitest";

import { resolveVisibleProductFields } from "./product-visibility";

const product = {
  composition: "TEST 100% Nylon",
  weightGsm: "180.00",
  widthCm: null,
  colorOptions: "Custom colors",
  customAvailable: "yes" as const,
  sampleAvailable: "unknown" as const,
  moqNote: "Test MOQ note",
  moqValue: "500.00",
  moqUnit: "m",
  colorOptionsDisplay: "inherit" as const,
  customAvailableDisplay: "show" as const,
  sampleAvailableDisplay: "show" as const,
  moqNoteDisplay: "hide" as const,
};

describe("public Product field visibility", () => {
  it("hides unverified facts and optional fields without explicit show", () => {
    expect(resolveVisibleProductFields(product, new Set())).toEqual({
      composition: null,
      weightGsm: null,
      widthCm: null,
      colorOptions: null,
      customAvailable: "yes",
      sampleAvailable: "unknown",
      moqNote: null,
      moqValue: null,
      moqUnit: null,
    });
  });

  it("reveals only the factual fields authorized as Verified", () => {
    expect(
      resolveVisibleProductFields(product, new Set(["composition"])),
    ).toMatchObject({ composition: "TEST 100% Nylon", weightGsm: null });
  });

  it("reveals MOQ only when both the value and controlled unit are verified", () => {
    expect(resolveVisibleProductFields(product, new Set(["moqValue"]))).toMatchObject({
      moqValue: null,
      moqUnit: null,
    });
    expect(
      resolveVisibleProductFields(product, new Set(["moqValue", "moqUnit"])),
    ).toMatchObject({ moqValue: "500.00", moqUnit: "m" });
  });
});
