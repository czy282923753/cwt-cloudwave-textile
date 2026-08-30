import { constants } from "node:fs";
import type { FileHandle } from "node:fs/promises";
import { describe, expect, it, vi } from "vitest";

import { parseEnvironment } from "@/config/env";

import { probeConfiguredStorage, probeStorageRoot, type StorageReadinessFs } from "./readiness";

function fakeFs(overrides: Partial<StorageReadinessFs> = {}): StorageReadinessFs {
  const handle = {
    writeFile: vi.fn(async () => undefined),
    sync: vi.fn(async () => undefined),
    close: vi.fn(async () => undefined),
  } as unknown as FileHandle;
  return {
    lstat: vi.fn(async () => ({ isDirectory: () => true, isSymbolicLink: () => false, uid: 1000, mode: 0o40750 })),
    realpath: vi.fn(async (path) => path.toString()),
    access: vi.fn(async (_path, mode) => { expect(mode).toBe(constants.R_OK | constants.W_OK | constants.X_OK); }),
    open: vi.fn(async () => handle),
    rename: vi.fn(async () => undefined),
    rm: vi.fn(async () => undefined),
    statfs: vi.fn(async () => ({ bavail: 4096, bsize: 4096 })),
    ...overrides,
  };
}

describe("local storage readiness", () => {
  it("performs bounded write, fsync, rename, delete and capacity checks", async () => {
    const fs = fakeFs();
    await expect(probeStorageRoot({
      partition: "public",
      root: "/srv/cwt/production/media/public",
      minimumFreeBytes: 1,
      expectedUid: 1000,
      fs,
    })).resolves.toMatchObject({ partition: "public" });
    expect(fs.open).toHaveBeenCalledOnce();
    expect(fs.rename).toHaveBeenCalledOnce();
    expect(fs.rm).toHaveBeenCalledOnce();
  });

  it.each([
    ["symlink", { lstat: vi.fn(async () => ({ isDirectory: () => true, isSymbolicLink: () => true, uid: 1000, mode: 0o40750 })) }],
    ["non-directory", { lstat: vi.fn(async () => ({ isDirectory: () => false, isSymbolicLink: () => false, uid: 1000, mode: 0o100640 })) }],
    ["wrong owner", { lstat: vi.fn(async () => ({ isDirectory: () => true, isSymbolicLink: () => false, uid: 2000, mode: 0o40750 })) }],
    ["unsafe mode", { lstat: vi.fn(async () => ({ isDirectory: () => true, isSymbolicLink: () => false, uid: 1000, mode: 0o40777 })) }],
    ["unwritable", { access: vi.fn(async () => { throw new Error("denied"); }) }],
    ["low capacity", { statfs: vi.fn(async () => ({ bavail: 0, bsize: 4096 })) }],
  ] as const)("fails closed for %s roots without disclosing the host path", async (_name, override) => {
    const failure = await probeStorageRoot({
      partition: "private",
      root: "/srv/cwt/production/media/private-inquiries",
      minimumFreeBytes: 1,
      expectedUid: 1000,
      fs: fakeFs(override),
    }).then(() => undefined, (error: unknown) => error);
    expect(failure).toBeInstanceOf(Error);
    expect((failure as Error).message).toBe("Storage readiness failed for private partition.");
    expect((failure as Error).message).not.toContain("/srv/cwt");
  });

  it("rejects a non-local authority before probing roots", async () => {
    const environment = parseEnvironment({ APP_ENV: "test", STORAGE_DRIVER: "s3" });
    await expect(probeConfiguredStorage({ environment, minimumFreeBytes: 1, fs: fakeFs() }))
      .rejects.toThrow(/authoritative local driver/);
  });
});
