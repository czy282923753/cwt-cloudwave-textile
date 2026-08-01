import { describe, expect, it } from "vitest";

import { parseEnvironment } from "./env";

describe("environment safety", () => {
  it("allows explicitly marked local adapters outside production", () => {
    expect(parseEnvironment({ APP_ENV: "test" }).DATABASE_DRIVER).toBe("pglite");
  });

  it("fails closed when placeholders are used in production", () => {
    expect(() => parseEnvironment({ APP_ENV: "production" })).toThrow(
      /Production configuration refused/,
    );
  });
});
