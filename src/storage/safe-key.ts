export function assertSafeObjectKey(objectKey: string): void {
  if (
    objectKey.length === 0 ||
    objectKey.startsWith("/") ||
    objectKey.includes("\\") ||
    objectKey.split("/").some((segment) => segment === ".." || segment === "")
  ) {
    throw new Error("Unsafe storage object key.");
  }
}
