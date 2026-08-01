import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import { env } from "@/config/env";

import { assertSafeObjectKey } from "./safe-key";
import type { ObjectStorage, StoragePartition, StoredObject } from "./types";

const buckets: Readonly<Record<StoragePartition, string>> = {
  public: env.S3_PUBLIC_BUCKET,
  private: env.S3_PRIVATE_BUCKET,
  imports: env.S3_IMPORT_BUCKET,
};

function requireBucket(partition: StoragePartition): string {
  const bucket = buckets[partition];
  if (!bucket) throw new Error(`Missing S3 bucket for ${partition} storage.`);
  return bucket;
}

export class S3ObjectStorage implements ObjectStorage {
  private readonly client = new S3Client({
    region: env.S3_REGION,
    ...(env.S3_ENDPOINT ? { endpoint: env.S3_ENDPOINT, forcePathStyle: true } : {}),
    credentials: {
      accessKeyId: env.S3_ACCESS_KEY_ID,
      secretAccessKey: env.S3_SECRET_ACCESS_KEY,
    },
  });

  async put(
    partition: StoragePartition,
    objectKey: string,
    bytes: Uint8Array,
    contentType: string,
  ): Promise<StoredObject> {
    assertSafeObjectKey(objectKey);
    await this.client.send(
      new PutObjectCommand({
        Bucket: requireBucket(partition),
        Key: objectKey,
        Body: bytes,
        ContentType: contentType,
      }),
    );
    return { partition, objectKey, byteSize: bytes.byteLength };
  }

  async get(partition: StoragePartition, objectKey: string): Promise<Uint8Array> {
    assertSafeObjectKey(objectKey);
    const response = await this.client.send(
      new GetObjectCommand({ Bucket: requireBucket(partition), Key: objectKey }),
    );
    if (!response.Body) throw new Error("Stored object returned an empty body.");
    return response.Body.transformToByteArray();
  }

  async delete(partition: StoragePartition, objectKey: string): Promise<void> {
    assertSafeObjectKey(objectKey);
    await this.client.send(
      new DeleteObjectCommand({ Bucket: requireBucket(partition), Key: objectKey }),
    );
  }

  async createReadUrl(
    partition: StoragePartition,
    objectKey: string,
    expiresInSeconds: number,
  ): Promise<string> {
    assertSafeObjectKey(objectKey);
    return getSignedUrl(
      this.client,
      new GetObjectCommand({ Bucket: requireBucket(partition), Key: objectKey }),
      { expiresIn: expiresInSeconds },
    );
  }
}
