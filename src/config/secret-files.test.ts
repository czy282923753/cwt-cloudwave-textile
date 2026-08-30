import { describe, expect, it } from "vitest";

import { assertProtectedSecretPath, readProtectedSecret } from "./secret-files";

describe("protected secret files", () => {
  it("requires an exact environment-prefixed Docker secret path", () => {
    expect(() => assertProtectedSecretPath("production", "/run/secrets/production-database-url")).not.toThrow();
    expect(() => assertProtectedSecretPath("staging", "/run/secrets/production-database-url")).toThrow(/environment-prefixed path/);
  });

  it("reads one bounded synthetic value without retaining a trailing newline", () => {
    expect(readProtectedSecret({
      environment: "staging",
      field: "VALKEY_PASSWORD",
      literal: "",
      file: "/run/secrets/staging-valkey-password",
      minimumLength: 4,
      reader: { read: () => "synthetic\n" },
    })).toBe("synthetic");
  });

  it("refuses literal, multiline, empty and unreadable values", () => {
    expect(() => readProtectedSecret({
      environment: "production",
      field: "DATABASE_URL",
      literal: "secret",
      file: "/run/secrets/production-database-url",
      reader: { read: () => "ignored" },
    })).toThrow(/refuses literal/);
    for (const read of [() => "", () => "two\nlines", () => { throw new Error("private"); }]) {
      expect(() => readProtectedSecret({
        environment: "production",
        field: "DATABASE_URL",
        literal: "",
        file: "/run/secrets/production-database-url",
        reader: { read },
      })).toThrow(/secret file/);
    }
  });
});
