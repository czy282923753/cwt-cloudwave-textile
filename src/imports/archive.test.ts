import sharp from "sharp";
import { Uint8ArrayReader, Uint8ArrayWriter, ZipWriter, type ZipWriterAddDataOptions } from "@zip.js/zip.js";
import { describe, expect, it } from "vitest";

import { inspectImportImageArchive, validateFolderMediaPath } from "./archive";

async function archive(entries: Array<{ name: string; bytes: Uint8Array; options?: ZipWriterAddDataOptions }>): Promise<Uint8Array> {
  const writer = new ZipWriter(new Uint8ArrayWriter());
  for (const entry of entries) await writer.add(entry.name, new Uint8ArrayReader(entry.bytes), entry.options);
  return writer.close();
}

describe("Product Import archive boundary", () => {
  it("accepts decoded approved images and keeps only safe relative paths", async () => {
    const image = new Uint8Array(await sharp({ create: { width: 16, height: 16, channels: 3, background: "teal" } }).webp().toBuffer());
    const result = await inspectImportImageArchive(await archive([{ name: "CWT-MESH-001/CWT-MESH-001-01.webp", bytes: image }]));
    expect(result[0]).toMatchObject({ relativePath: "CWT-MESH-001/CWT-MESH-001-01.webp", detectedMimeType: "image/webp" });
  });

  it("rejects traversal, drive paths, controls, excessive depth, and nested archives", async () => {
    expect(() => validateFolderMediaPath("../escape.jpg")).toThrow(/traversal/i);
    expect(() => validateFolderMediaPath("C:\\escape.jpg")).toThrow(/absolute|unsupported/i);
    expect(() => validateFolderMediaPath(`unsafe\u0000.jpg`)).toThrow(/unsupported/i);
    expect(() => validateFolderMediaPath("a/b/c/d/e/f/g/h/i.jpg")).toThrow(/depth/i);
    expect(() => validateFolderMediaPath(`${"a".repeat(241)}.jpg`)).toThrow(/length/i);
    const nested = await archive([{ name: "nested.zip", bytes: new Uint8Array([0x50, 0x4b, 3, 4]) }]);
    await expect(inspectImportImageArchive(nested)).rejects.toThrow(/nested archives/i);
  });

  it("rejects duplicate normalized/case-colliding paths", async () => {
    const image = new Uint8Array(await sharp({ create: { width: 8, height: 8, channels: 3, background: "navy" } }).jpeg().toBuffer());
    const bytes = await archive([{ name: "A.jpg", bytes: image }, { name: "a.jpg", bytes: image }]);
    await expect(inspectImportImageArchive(bytes)).rejects.toThrow(/collision/i);
  });

  it("rejects malformed packages, excessive file counts, and high expansion ratios", async () => {
    await expect(inspectImportImageArchive(new Uint8Array([0x50, 0x4b, 0x00]))).rejects.toThrow();
    const image = new Uint8Array(await sharp({ create: { width: 2, height: 2, channels: 3, background: "navy" } }).jpeg().toBuffer());
    const tooMany = await archive(Array.from({ length: 501 }, (_, index) => ({ name: `CWT-MESH-${String(index).padStart(3, "0")}.jpg`, bytes: image })));
    await expect(inspectImportImageArchive(tooMany)).rejects.toThrow(/more than 500/i);
    const bombLike = await archive([{ name: "CWT-MESH-001-01.jpg", bytes: new Uint8Array(1024 * 1024) }]);
    await expect(inspectImportImageArchive(bombLike)).rejects.toThrow(/expansion ratio/i);
  });

  it("rejects encrypted, executable, symlink, device, and script entries", async () => {
    const image = new Uint8Array(await sharp({ create: { width: 8, height: 8, channels: 3, background: "teal" } }).png().toBuffer());
    await expect(inspectImportImageArchive(await archive([{ name: "encrypted.png", bytes: image, options: { password: "synthetic" } }]))).rejects.toThrow(/encrypted/i);
    await expect(inspectImportImageArchive(await archive([{ name: "executable.png", bytes: image, options: { executable: true } }]))).rejects.toThrow(/executable/i);
    await expect(inspectImportImageArchive(await archive([{ name: "link.png", bytes: image, options: { unixMode: 0o120777, versionMadeBy: 0x31e } }]))).rejects.toThrow(/executable|links|devices/i);
    await expect(inspectImportImageArchive(await archive([{ name: "device.png", bytes: image, options: { unixMode: 0o060666, versionMadeBy: 0x31e } }]))).rejects.toThrow(/executable|links|devices/i);
    await expect(inspectImportImageArchive(await archive([{ name: "script.js", bytes: new TextEncoder().encode("alert(1)") }]))).rejects.toThrow(/script/i);
  });

  it("rejects a single image whose actual expanded bytes exceed 20 MB", async () => {
    const oversized = new Uint8Array(20 * 1024 * 1024 + 1);
    const bytes = await archive([{ name: "oversized.png", bytes: oversized }]);
    await expect(inspectImportImageArchive(bytes)).rejects.toThrow(/20 MB/i);
  });
});
