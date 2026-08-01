import { describe, expect, it } from "vitest";

import { assertSportsBoundary } from "./taxonomy-service";

describe("Sports Fabric taxonomy boundary", () => {
  it("models Sportswear as an Application and Sports Fabric as a commercial collection", () => {
    expect(() => assertSportsBoundary("application", "Sportswear")).not.toThrow();
    expect(() => assertSportsBoundary("application", "Sports Fabric")).toThrow(
      /Commercial Collection/,
    );
    expect(() =>
      assertSportsBoundary("taxonomy", "Sports Fabric", "material_fiber"),
    ).toThrow(/Commercial Collection/);
    expect(() =>
      assertSportsBoundary("taxonomy", "Sports Fabric", "commercial_collection"),
    ).not.toThrow();
  });
});
