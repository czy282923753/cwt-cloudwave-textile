import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

function protectedEnvironment(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    APP_ENV: "production",
    FILE_SCAN_DRIVER: "cloudmersive",
    FILE_SCAN_ORIGIN: "https://scanner.example.test",
    FILE_SCAN_API_KEY: "synthetic-protected-key",
    FILE_SCAN_ACCOUNT_CUSTODY: "production:synthetic-cloudmersive-account",
    ...overrides,
  };
}

async function loadFactory(environment: Record<string, unknown>) {
  vi.doMock("@/config/env", () => ({ env: environment }));
  return import("./scanner-factory");
}

function jsonResponse(payload: unknown): Response {
  return new Response(JSON.stringify(payload), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}

beforeEach(() => {
  vi.unstubAllGlobals();
  vi.resetModules();
  vi.clearAllMocks();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("FileScanner composition", () => {
  it.each(["production", "staging"])("selects only Cloudmersive for protected %s", async (appEnvironment) => {
    const { createFileScanner } = await loadFactory(protectedEnvironment({
      APP_ENV: appEnvironment,
      FILE_SCAN_ACCOUNT_CUSTODY: `${appEnvironment}:synthetic-cloudmersive-account`,
    }));
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

  it("reuses one protected process scanner across repeated factory calls", async () => {
    const { createFileScanner } = await loadFactory(protectedEnvironment());
    const first = createFileScanner();
    expect(createFileScanner()).toBe(first);
    expect(createFileScanner()).toBe(first);
  });

  it("serializes independent protected factory callers to maximum Provider concurrency one", async () => {
    let calls = 0;
    let active = 0;
    let maximumActive = 0;
    const releases: Array<() => void> = [];
    vi.stubGlobal("fetch", vi.fn(async () => {
      calls += 1;
      active += 1;
      maximumActive = Math.max(maximumActive, active);
      await new Promise<void>((resolve) => releases.push(resolve));
      active -= 1;
      return jsonResponse({ CleanResult: true, FoundViruses: [] });
    }));
    const { createFileScanner } = await loadFactory(protectedEnvironment());
    const first = createFileScanner();
    const second = createFileScanner();
    expect(second).toBe(first);

    const firstScan = first.scan(new Uint8Array([1]), "first.bin");
    const secondScan = second.scan(new Uint8Array([2]), "second.bin");
    await vi.waitFor(() => expect(calls).toBe(1));
    expect(maximumActive).toBe(1);
    releases.shift()?.();
    await firstScan;
    await vi.waitFor(() => expect(calls).toBe(2));
    expect(maximumActive).toBe(1);
    releases.shift()?.();
    await secondScan;
    expect(calls).toBe(2);
    expect(maximumActive).toBe(1);
  });

  it("allows a later independent factory caller to recover after one unavailable scan without replay", async () => {
    let calls = 0;
    let active = 0;
    let maximumActive = 0;
    vi.stubGlobal("fetch", vi.fn(async () => {
      calls += 1;
      active += 1;
      maximumActive = Math.max(maximumActive, active);
      try {
        if (calls === 1) throw new TypeError("synthetic outage");
        return jsonResponse({ CleanResult: true, FoundViruses: [] });
      } finally {
        active -= 1;
      }
    }));
    const { createFileScanner } = await loadFactory(protectedEnvironment());
    const first = createFileScanner();
    await expect(first.scan(new Uint8Array([1]), "failed.bin"))
      .rejects.toMatchObject({ code: "scanner_unavailable" });
    const later = createFileScanner();
    expect(later).toBe(first);
    await expect(later.scan(new Uint8Array([2]), "recovered.bin"))
      .resolves.toMatchObject({ clean: true, reference: "cloudmersive:clean" });
    expect(calls).toBe(2);
    expect(maximumActive).toBe(1);
  });

  it("keeps concurrent clean, malware, and unavailable results paired to independent callers", async () => {
    let calls = 0;
    let active = 0;
    let maximumActive = 0;
    vi.stubGlobal("fetch", vi.fn(async () => {
      const call = calls;
      calls += 1;
      active += 1;
      maximumActive = Math.max(maximumActive, active);
      try {
        if (call === 0) return jsonResponse({ CleanResult: true, FoundViruses: [] });
        if (call === 1) return jsonResponse({
          CleanResult: false,
          FoundViruses: [{ VirusName: "Synthetic.Test.Signature" }],
        });
        throw new TypeError("synthetic unavailable");
      } finally {
        active -= 1;
      }
    }));
    const { createFileScanner } = await loadFactory(protectedEnvironment());
    const pending = [
      createFileScanner().scan(new Uint8Array([1]), "clean.bin"),
      createFileScanner().scan(new Uint8Array([2]), "malware.bin"),
      createFileScanner().scan(new Uint8Array([3]), "unavailable.bin"),
    ];
    const results = await Promise.allSettled(pending);
    expect(results[0]).toMatchObject({
      status: "fulfilled",
      value: { clean: true, reference: "cloudmersive:clean" },
    });
    expect(results[1]).toMatchObject({
      status: "fulfilled",
      value: { clean: false, reference: "cloudmersive:malware-detected" },
    });
    expect(results[2]).toMatchObject({
      status: "rejected",
      reason: { code: "scanner_unavailable", reference: "cloudmersive:unavailable" },
    });
    expect(calls).toBe(3);
    expect(maximumActive).toBe(1);
  });

  it.each([
    ["environment", { APP_ENV: "staging", FILE_SCAN_ACCOUNT_CUSTODY: "staging:synthetic-cloudmersive-account" }],
    ["origin", { FILE_SCAN_ORIGIN: "https://other-scanner.example.test" }],
    ["custody", { FILE_SCAN_ACCOUNT_CUSTODY: "production:other-account" }],
    ["credential", { FILE_SCAN_API_KEY: "different-synthetic-key" }],
  ])("fails closed on protected process %s configuration mismatch", async (_label, overrides) => {
    const environment = protectedEnvironment();
    const { createFileScanner } = await loadFactory(environment);
    createFileScanner();
    Object.assign(environment, overrides);
    let thrown: unknown;
    try {
      createFileScanner();
    } catch (error) {
      thrown = error;
    }
    expect(thrown).toMatchObject({
      code: "scanner_unavailable",
      reference: "cloudmersive:process-configuration-mismatch",
    });
    expect(String(thrown)).not.toContain("synthetic-protected-key");
    expect(String(thrown)).not.toContain("different-synthetic-key");
  });

  it.each(["local", "test"])("does not expose protected authority to %s composition", async (appEnvironment) => {
    const providerFetch = vi.fn();
    vi.stubGlobal("fetch", providerFetch);
    const { createFileScanner } = await loadFactory({
      APP_ENV: appEnvironment,
      FILE_SCAN_DRIVER: "development",
    });
    const first = createFileScanner();
    const second = createFileScanner();
    expect(first.constructor.name).toBe("DevelopmentFileScanner");
    expect(second.constructor.name).toBe("DevelopmentFileScanner");
    expect(second).not.toBe(first);
    await expect(first.scan(new Uint8Array([1]), "local.bin"))
      .resolves.toMatchObject({ provider: "development-eicar-adapter" });
    expect(providerFetch).not.toHaveBeenCalled();
  });

  it("exposes no production reset hook for the protected process authority", async () => {
    const factory = await loadFactory(protectedEnvironment());
    expect(Object.keys(factory)).toEqual(["createFileScanner"]);
  });
});
