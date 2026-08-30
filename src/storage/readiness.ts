import { randomUUID } from "node:crypto";
import { constants } from "node:fs";
import { access, lstat, open, realpath, rename, rm, statfs, type FileHandle } from "node:fs/promises";
import { basename, dirname, isAbsolute, join, resolve } from "node:path";

import type { AppEnvironment } from "@/config/env";

import type { StoragePartition } from "./types";

export interface StorageReadinessFs {
  lstat(path: string): Promise<Readonly<{
    isDirectory(): boolean;
    isSymbolicLink(): boolean;
    uid: number;
    mode: number;
  }>>;
  realpath(path: string): Promise<string>;
  access(path: string, mode: number): Promise<void>;
  open(path: string, flags: string, mode: number): Promise<Pick<FileHandle, "writeFile" | "sync" | "close">>;
  rename(from: string, to: string): Promise<void>;
  rm(path: string): Promise<void>;
  statfs(path: string): Promise<Readonly<{ bavail: number | bigint; bsize: number | bigint }>>;
}

const nodeFs: StorageReadinessFs = {
  lstat: async (path) => lstat(path),
  realpath: async (path) => realpath(path),
  access: async (path, mode) => access(path, mode),
  open: async (path, flags, mode) => open(path, flags, mode),
  rename: async (from, to) => rename(from, to),
  rm: async (path) => rm(path),
  statfs: async (path) => statfs(path),
};

export interface StorageRootReadiness {
  readonly partition: StoragePartition;
  readonly freeBytes: number;
}

export function configuredStorageRoots(environment: AppEnvironment): Readonly<Record<StoragePartition, string>> {
  return Object.freeze({
    public: resolve(environment.PUBLIC_STORAGE_ROOT),
    private: resolve(environment.PRIVATE_STORAGE_ROOT),
    imports: resolve(environment.IMPORT_STORAGE_ROOT),
  });
}

export async function probeStorageRoot(input: {
  readonly partition: StoragePartition;
  readonly root: string;
  readonly minimumFreeBytes: number;
  readonly expectedUid?: number;
  readonly fs?: StorageReadinessFs;
}): Promise<StorageRootReadiness> {
  const fs = input.fs ?? nodeFs;
  const failure = (): Error => new Error(`Storage readiness failed for ${input.partition} partition.`);
  try {
    if (!isAbsolute(input.root) || resolve(input.root) !== input.root) throw failure();
    const metadata = await fs.lstat(input.root);
    if (!metadata.isDirectory() || metadata.isSymbolicLink()) throw failure();
    if (await fs.realpath(input.root) !== input.root) throw failure();
    if (input.expectedUid !== undefined && metadata.uid !== input.expectedUid) throw failure();
    if ((metadata.mode & 0o007) !== 0 || (metadata.mode & 0o020) !== 0) throw failure();
    await fs.access(input.root, constants.R_OK | constants.W_OK | constants.X_OK);

    const probeName = `.cwt-readiness-${randomUUID()}`;
    const initialPath = join(input.root, probeName);
    const renamedPath = join(input.root, `${probeName}.renamed`);
    if (basename(initialPath) !== probeName || dirname(initialPath) !== input.root) throw failure();
    const handle = await fs.open(initialPath, "wx", 0o600);
    try {
      await handle.writeFile("cwt-readiness-v1\n", "utf8");
      await handle.sync();
    } finally {
      await handle.close();
    }
    await fs.rename(initialPath, renamedPath);
    await fs.rm(renamedPath);

    const capacity = await fs.statfs(input.root);
    const freeBytes = Number(capacity.bavail) * Number(capacity.bsize);
    if (!Number.isSafeInteger(freeBytes) || freeBytes < input.minimumFreeBytes) throw failure();
    return Object.freeze({ partition: input.partition, freeBytes });
  } catch {
    throw failure();
  }
}

export async function probeConfiguredStorage(input: {
  readonly environment: AppEnvironment;
  readonly minimumFreeBytes: number;
  readonly expectedUid?: number;
  readonly fs?: StorageReadinessFs;
}): Promise<readonly StorageRootReadiness[]> {
  if (input.environment.STORAGE_DRIVER !== "local") throw new Error("Storage readiness requires the authoritative local driver.");
  const roots = configuredStorageRoots(input.environment);
  if (new Set(Object.values(roots)).size !== 3) throw new Error("Storage readiness requires isolated roots.");
  const results: StorageRootReadiness[] = [];
  for (const partition of ["public", "private", "imports"] as const) {
    results.push(await probeStorageRoot({
      partition,
      root: roots[partition],
      minimumFreeBytes: input.minimumFreeBytes,
      ...(input.expectedUid === undefined ? {} : { expectedUid: input.expectedUid }),
      ...(input.fs === undefined ? {} : { fs: input.fs }),
    }));
  }
  return Object.freeze(results);
}
