import { describe, expect, it } from "vitest";

import {
  COUNTRY_CODE_ERROR_MESSAGE,
  COUNTRY_OPTIONS,
  isIsoAlpha2CountryCode,
  normalizeOptionalCountryCode,
} from "./country-codes";

describe("ISO 3166-1 alpha-2 country authority", () => {
  it("exposes the complete unique country set with code-valued English options", () => {
    const codes: readonly string[] = COUNTRY_OPTIONS.map((country) => country.code);
    expect(COUNTRY_OPTIONS).toHaveLength(249);
    expect(new Set(codes).size).toBe(249);
    expect(COUNTRY_OPTIONS.find((country) => country.name === "China")).toEqual({
      code: "CN",
      name: "China",
    });
    expect(codes).not.toContain("ZZ");
  });

  it("normalizes lowercase codes and preserves optional empty values", () => {
    expect(normalizeOptionalCountryCode(" cn ")).toBe("CN");
    expect(normalizeOptionalCountryCode("us")).toBe("US");
    expect(normalizeOptionalCountryCode("")).toBeNull();
    expect(normalizeOptionalCountryCode("   ")).toBeNull();
    expect(normalizeOptionalCountryCode(null)).toBeNull();
    expect(normalizeOptionalCountryCode(undefined)).toBeNull();
  });

  it.each(["ZZ", "China", "C", "12", "C1"])(
    "rejects invalid country input %s",
    (value) => {
      expect(isIsoAlpha2CountryCode(value)).toBe(false);
      expect(() => normalizeOptionalCountryCode(value)).toThrow(
        COUNTRY_CODE_ERROR_MESSAGE,
      );
    },
  );
});
