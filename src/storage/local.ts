import { createHmac, timingSafeEqual } from "node:crypto";
import { createWriteStream } from "node:fs";
import { access, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, resolve, sep } from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";

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
  createPublicUrl(assetId: string): string {
    return `/api/public-assets/${encodeURIComponent(assetId)}/`;
  }

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

  async putStream(
    partition: StoragePartition,
    objectKey: string,
    stream: ReadableStream<Uint8Array>,
    contentType: string,
    expectedBytes: number,
  ): Promise<StoredObject> {
    void contentType;
    const objectPath = resolveObjectPath(partition, objectKey);
    await mkdir(dirname(objectPath), { recursive: true });
    let actual = 0;
    const bounded = stream.pipeThrough(new TransformStream<Uint8Array, Uint8Array>({
      transform(chunk, controller) {
        actual += chunk.byteLength;
        if (actual > expectedBytes) throw new Error("Streamed object exceeds its declared size.");
        controller.enqueue(chunk);
      },
      flush() {
        if (actual !== expectedBytes) throw new Error("Streamed object does not match its declared size.");
      },
    }));
    try {
      await pipeline(
        Readable.fromWeb(bounded as import("node:stream/web").ReadableStream<Uint8Array>),
        createWriteStream(objectPath, { flags: "wx" }),
      );
    } catch (error) {
      await rm(objectPath, { force: true });
      throw error;
    }
    return { partition, objectKey, byteSize: actual };
  }

  async get(partition: StoragePartition, objectKey: string): Promise<Uint8Array> {
    return readFile(resolveObjectPath(partition, objectKey));
  }

  async exists(partition: StoragePartition, objectKey: string): Promise<boolean> {
    try {
      await access(resolveObjectPath(partition, objectKey));
      return true;
    } catch {
      return false;
    }
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
    return `/api/storage/${partition}/${objectKey}/?expires=${expires}&signature=${signature}`;
  }
}
