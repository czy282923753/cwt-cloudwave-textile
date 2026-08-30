import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

async function loadFactory(environment: Record<string, unknown>) {
  vi.doMock("@/config/env", () => ({ env: environment }));
  return import("./scanner-factory");
}

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
});

describe("FileScanner composition", () => {
  it.each(["production", "staging"])("selects only Cloudmersive for protected %s", async (appEnvironment) => {
    const { createFileScanner } = await loadFactory({
      APP_ENV: appEnvironment,
      FILE_SCAN_DRIVER: "cloudmersive",
      FILE_SCAN_ORIGIN: "https://scanner.example.test",
      FILE_SCAN_API_KEY: "synthetic-protected-key",
    });
    expect(createFileScanner().constructor.name).toBe("CloudmersiveFileScanner");
  });

  it.each(["production", "staging"])("has no development fallback in protected %s", async (appEnvironment) => {
    const { createFileScanner } = await loadFactory({
      APP_ENV: appEnvironment,
      FILE_SCAN_DRIVER: "development",
    });
    expect(() => createFileScanner()).toThrow(/require the Cloudmersive scanner/i);
  });

  it.each(["local", "test"])("keeps Development/EICAR local-only in %s", async (appEnvironment) => {
    const { createFileScanner } = await loadFactory({
      APP_ENV: appEnvironment,
      FILE_SCAN_DRIVER: "development",
    });
    expect(createFileScanner().constructor.name).toBe("DevelopmentFileScanner");
  });

  it.each(["local", "test"])("blocks accidental Provider composition in %s", async (appEnvironment) => {
    const { createFileScanner } = await loadFactory({
      APP_ENV: appEnvironment,
      FILE_SCAN_DRIVER: "cloudmersive",
      FILE_SCAN_ORIGIN: "https://scanner.example.test",
      FILE_SCAN_API_KEY: "synthetic-local-key",
    });
    expect(() => createFileScanner()).toThrow(/permit only the development scanner/i);
  });
});
