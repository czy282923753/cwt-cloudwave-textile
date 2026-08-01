import type {
  ObjectStorage,
  StoragePartition,
  StoredObject,
} from "@/storage";

export class InMemoryObjectStorage implements ObjectStorage {
  readonly objects = new Map<string, Uint8Array>();

  private key(partition: StoragePartition, objectKey: string): string {
    return `${partition}:${objectKey}`;
  }

  async put(
    partition: StoragePartition,
    objectKey: string,
    bytes: Uint8Array,
    contentType: string,
  ): Promise<StoredObject> {
    void contentType;
    const key = this.key(partition, objectKey);
    if (this.objects.has(key)) throw new Error("Object already exists.");
    this.objects.set(key, bytes);
    return { partition, objectKey, byteSize: bytes.byteLength };
  }

  async get(partition: StoragePartition, objectKey: string): Promise<Uint8Array> {
    const value = this.objects.get(this.key(partition, objectKey));
    if (!value) throw new Error("Object was not found.");
    return value;
  }

  async delete(partition: StoragePartition, objectKey: string): Promise<void> {
    this.objects.delete(this.key(partition, objectKey));
  }

  async createReadUrl(
    partition: StoragePartition,
    objectKey: string,
    expiresInSeconds: number,
  ): Promise<string> {
    void expiresInSeconds;
    return `memory://${partition}/${objectKey}`;
  }
}
