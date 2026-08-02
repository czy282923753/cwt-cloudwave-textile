export type StoragePartition = "public" | "private" | "imports";

export interface StoredObject {
  partition: StoragePartition;
  objectKey: string;
  byteSize: number;
}

export interface ObjectStorage {
  put(
    partition: StoragePartition,
    objectKey: string,
    bytes: Uint8Array,
    contentType: string,
  ): Promise<StoredObject>;
  get(partition: StoragePartition, objectKey: string): Promise<Uint8Array>;
  exists(partition: StoragePartition, objectKey: string): Promise<boolean>;
  delete(partition: StoragePartition, objectKey: string): Promise<void>;
  createReadUrl(
    partition: StoragePartition,
    objectKey: string,
    expiresInSeconds: number,
  ): Promise<string>;
  /** Returns the application-controlled media route, never a raw object URL. */
  createPublicUrl(assetId: string): string;
}
