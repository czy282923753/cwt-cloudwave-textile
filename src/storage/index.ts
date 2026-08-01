import { env } from "@/config/env";

import { LocalObjectStorage } from "./local";
import { S3ObjectStorage } from "./s3";
import type { ObjectStorage } from "./types";

export function createObjectStorage(): ObjectStorage {
  return env.STORAGE_DRIVER === "s3"
    ? new S3ObjectStorage()
    : new LocalObjectStorage();
}

export type { ObjectStorage, StoragePartition, StoredObject } from "./types";
