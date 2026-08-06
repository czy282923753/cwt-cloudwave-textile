import { describe, expect, it } from "vitest";

import { parseProductPage, productPageHref } from "./page";

describe("public Product pagination contract", () => {
  it("keeps page one canonical and makes later pages self-canonical", () => {
    expect(productPageHref(1)).toBe("/products/");
    expect(productPageHref(2)).toBe("/products/?page=2");
  });

  it("rejects malformed, repeated, zero, negative, fractional, and unsafe pages", () => {
    expect(parseProductPage(undefined)).toBe(1);
    expect(parseProductPage("1")).toBe(1);
    expect(parseProductPage("101")).toBe(101);
    for (const input of ["", "0", "-1", "1.5", "01", "x", "9007199254740992"]) {
      expect(parseProductPage(input), input).toBeNull();
    }
    expect(parseProductPage(["1", "2"])).toBeNull();
  });
});
