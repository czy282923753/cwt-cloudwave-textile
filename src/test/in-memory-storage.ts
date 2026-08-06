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
    const key = this.key(partition, objectKey);
    if (this.objects.has(key)) throw new Error("Object already exists.");
    this.objects.set(key, bytes);
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
    const reader = stream.getReader();
    const chunks: Uint8Array[] = [];
    let actual = 0;
    while (true) {
      const result = await reader.read();
      if (result.done) break;
      actual += result.value.byteLength;
      if (actual > expectedBytes) throw new Error("Streamed object exceeds its declared size.");
      chunks.push(result.value);
    }
    if (actual !== expectedBytes) throw new Error("Streamed object does not match its declared size.");
    const bytes = new Uint8Array(actual);
    let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
    return this.put(partition, objectKey, bytes, contentType);
  }

  async get(partition: StoragePartition, objectKey: string): Promise<Uint8Array> {
    const value = this.objects.get(this.key(partition, objectKey));
    if (!value) throw new Error("Object was not found.");
    return value;
  }

  async exists(partition: StoragePartition, objectKey: string): Promise<boolean> {
    return this.objects.has(this.key(partition, objectKey));
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
