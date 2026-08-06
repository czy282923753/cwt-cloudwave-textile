import { Uint8ArrayReader, Uint8ArrayWriter, ZipReader, type Entry } from "@zip.js/zip.js";

import { detectMimeType } from "@/uploads/file-validation";

import { PRODUCT_IMPORT_LIMITS } from "./contract";

export interface SafeImportMedia {
  sourceKey: string;
  relativePath: string;
  displayName: string;
  bytes: Uint8Array;
  detectedMimeType: "image/jpeg" | "image/png" | "image/webp" | "image/avif";
}

function normalizeArchivePath(input: string): string {
  if (!input || input.startsWith("/") || input.startsWith("\\") || /^[A-Za-z]:/.test(input)) {
    throw new Error("Archive contains an absolute path.");
  }
  if (/\u0000|[\u0001-\u001f\u007f]/.test(input) || input.includes("\\")) {
    throw new Error("Archive path contains unsupported characters.");
  }
  const normalized = input.normalize("NFC").replace(/^\.\//, "").replace(/\/$/, "");
  const segments = normalized.split("/");
  if (!segments.length || segments.some((segment) => !segment || segment === "." || segment === "..")) {
    throw new Error("Archive path traversal is not accepted.");
  }
  if (segments.length > PRODUCT_IMPORT_LIMITS.archivePathDepth) throw new Error("Archive path depth exceeds the limit.");
  if (new TextEncoder().encode(normalized).byteLength > PRODUCT_IMPORT_LIMITS.archivePathBytes) throw new Error("Archive path length exceeds the limit.");
  return normalized;
}

function assertRegularFile(entry: Entry): void {
  if (entry.encrypted) throw new Error("Encrypted archives are not accepted.");
  if (entry.executable) throw new Error("Executable archive entries are not accepted.");
  const mode = entry.unixMode ?? entry.unixExternalUpper ?? 0;
  const type = mode & 0o170000;
  if (type && type !== 0o100000 && type !== 0o040000) {
    throw new Error("Archive links, devices, pipes, and sockets are not accepted.");
  }
}

function safeMediaMime(bytes: Uint8Array): SafeImportMedia["detectedMimeType"] {
  const detected = detectMimeType(bytes);
  if (!["image/jpeg", "image/png", "image/webp", "image/avif"].includes(detected)) {
    throw new Error("Archive entry signature is not an approved image type.");
  }
  return detected as SafeImportMedia["detectedMimeType"];
}

async function inspectArchiveReader(
  source: Uint8ArrayReader | ReadableStream<Uint8Array>,
  onMedia?: (media: SafeImportMedia) => Promise<void>,
): Promise<SafeImportMedia[]> {
  const reader = new ZipReader(source, {
    checkSignature: true,
    checkAmbiguity: true,
  });
  try {
    const entries = await reader.getEntries();
    if (entries.length > PRODUCT_IMPORT_LIMITS.archiveEntries) throw new Error("Archive entry count exceeds the limit.");
    const directories = entries.filter((entry) => entry.directory).length;
    if (directories > PRODUCT_IMPORT_LIMITS.archiveDirectories) throw new Error("Archive directory count exceeds the limit.");
    const files = entries.filter((entry) => !entry.directory);
    if (files.length > PRODUCT_IMPORT_LIMITS.images) throw new Error("Archive contains more than 500 files.");
    const seen = new Set<string>();
    let expandedActual = 0;
    const result: SafeImportMedia[] = [];
    for (const entry of files) {
      assertRegularFile(entry);
      const path = normalizeArchivePath(entry.filename);
      const collisionKey = path.toLocaleLowerCase("en-US");
      if (seen.has(collisionKey)) throw new Error("Archive contains a case or Unicode-normalization path collision.");
      seen.add(collisionKey);
      if (/\.(?:zip|7z|rar|tar|gz|bz2|xz|exe|dll|js|mjs|cjs|sh|bat|cmd|ps1|html?|svg)$/i.test(path)) {
        throw new Error("Nested archives and executable or script entries are not accepted.");
      }
      if (entry.uncompressedSize > PRODUCT_IMPORT_LIMITS.imageBytes) throw new Error("An archive image exceeds 20 MB.");
      if (entry.compressedSize > 0 && entry.uncompressedSize / entry.compressedSize > PRODUCT_IMPORT_LIMITS.archiveExpansionRatio) {
        throw new Error("Archive expansion ratio exceeds the safety limit.");
      }
      const extracted = await entry.getData(new Uint8ArrayWriter(), {
        checkSignature: true,
        onprogress(progress) {
          if (progress > PRODUCT_IMPORT_LIMITS.imageBytes || expandedActual + progress > PRODUCT_IMPORT_LIMITS.archiveExpandedBytes) {
            throw new Error("Archive actual expanded bytes exceed the limit.");
          }
        },
      });
      expandedActual += extracted.byteLength;
      if (expandedActual > PRODUCT_IMPORT_LIMITS.archiveExpandedBytes) throw new Error("Archive actual expanded bytes exceed the limit.");
      const mime = safeMediaMime(extracted);
      const basename = path.split("/").at(-1)!;
      const media = {
        sourceKey: `media:${crypto.randomUUID().replaceAll("-", "")}`,
        relativePath: path,
        displayName: basename.slice(0, 200),
        bytes: extracted,
        detectedMimeType: mime,
      } satisfies SafeImportMedia;
      if (onMedia) await onMedia(media);
      else result.push(media);
    }
    return result;
  } finally {
    await reader.close();
  }
}

export async function inspectImportImageArchive(bytes: Uint8Array): Promise<SafeImportMedia[]> {
  if (!bytes.byteLength || bytes.byteLength > PRODUCT_IMPORT_LIMITS.archiveBytes) {
    throw new Error("Archive actual compressed bytes exceed the limit.");
  }
  if (bytes[0] !== 0x50 || bytes[1] !== 0x4b) throw new Error("Image package is not a ZIP archive.");
  return inspectArchiveReader(new Uint8ArrayReader(bytes));
}

export async function inspectImportImageArchiveStream(
  stream: ReadableStream<Uint8Array>,
  onMedia?: (media: SafeImportMedia) => Promise<void>,
): Promise<SafeImportMedia[]> {
  return inspectArchiveReader(stream, onMedia);
}

export function validateFolderMediaPath(path: string): string {
  return normalizeArchivePath(path);
}
