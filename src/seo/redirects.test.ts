import { describe, expect, it } from "vitest";

import { RedirectConflictError, validateRedirectGraph } from "./redirects";

describe("redirect graph validation", () => {
  it("rejects loops", () => {
    expect(() => validateRedirectGraph([], "/old", "/old")).toThrow(
      RedirectConflictError,
    );
  });

  it("rejects conflicts and both directions of redirect chains", () => {
    const existing = [{ sourcePath: "/one", destinationPath: "/two" }];
    expect(() => validateRedirectGraph(existing, "/one", "/three")).toThrow(
      /already exists/,
    );
    expect(() => validateRedirectGraph(existing, "/new", "/one")).toThrow(
      /create a chain/,
    );
    expect(() => validateRedirectGraph(existing, "/two", "/new")).toThrow(
      /extend an existing chain/,
    );
  });
});
