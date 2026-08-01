import { createHmac, timingSafeEqual } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, resolve, sep } from "node:path";

import { env } from "@/config/env";

import { assertSafeObjectKey } from "./safe-key";
import type { ObjectStorage, StoragePartition, StoredObject } from "./types";

const roots: Readonly<Record<StoragePartition, string>> = {
  public: resolve(env.PUBLIC_STORAGE_ROOT),
  private: resolve(env.PRIVATE_STORAGE_ROOT),
  imports: resolve(env.IMPORT_STORAGE_ROOT),
};

function resolveObjectPath(partition: StoragePartition, objectKey: string): string {
  assertSafeObjectKey(objectKey);
  const root = roots[partition];
  const objectPath = resolve(root, objectKey);
  if (!objectPath.startsWith(`${root}${sep}`)) {
    throw new Error("Storage path escaped its configured partition.");
  }
  return objectPath;
}

function signGrant(partition: StoragePartition, objectKey: string, expires: number): string {
  return createHmac("sha256", env.AUTH_SESSION_SECRET)
    .update(`${partition}:${objectKey}:${expires}`)
    .digest("base64url");
}

export function verifyLocalReadGrant(
  partition: StoragePartition,
  objectKey: string,
  expires: number,
  signature: string,
): boolean {
  if (!Number.isSafeInteger(expires) || expires < Math.floor(Date.now() / 1000)) {
    return false;
  }
  const expected = Buffer.from(signGrant(partition, objectKey, expires));
  const received = Buffer.from(signature);
  return expected.length === received.length && timingSafeEqual(expected, received);
}

export class LocalObjectStorage implements ObjectStorage {
  async put(
    partition: StoragePartition,
    objectKey: string,
    bytes: Uint8Array,
    contentType: string,
  ): Promise<StoredObject> {
    void contentType;
    const objectPath = resolveObjectPath(partition, objectKey);
    await mkdir(dirname(objectPath), { recursive: true });
    await writeFile(objectPath, bytes, { flag: "wx" });
    return { partition, objectKey, byteSize: bytes.byteLength };
  }

  async get(partition: StoragePartition, objectKey: string): Promise<Uint8Array> {
    return readFile(resolveObjectPath(partition, objectKey));
  }

  async delete(partition: StoragePartition, objectKey: string): Promise<void> {
    await rm(resolveObjectPath(partition, objectKey), { force: true });
  }

  async createReadUrl(
    partition: StoragePartition,
    objectKey: string,
    expiresInSeconds: number,
  ): Promise<string> {
    assertSafeObjectKey(objectKey);
    const expires = Math.floor(Date.now() / 1000) + expiresInSeconds;
    const signature = signGrant(partition, objectKey, expires);
    return `/api/storage/${partition}/${objectKey}?expires=${expires}&signature=${signature}`;
  }
}
