import sharp from "sharp";

import { runWithImageWorkSemaphore } from "./image-derivatives";

export const acceptedPublicMimeTypes = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
  "application/pdf",
] as const;

export const acceptedInquiryMimeTypes = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

export type DetectedMimeType =
  | (typeof acceptedPublicMimeTypes)[number]
  | "application/octet-stream";

function startsWith(bytes: Uint8Array, signature: readonly number[]): boolean {
  return signature.every((value, index) => bytes[index] === value);
}

export function detectMimeType(bytes: Uint8Array): DetectedMimeType {
  if (startsWith(bytes, [0xff, 0xd8, 0xff])) return "image/jpeg";
  if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) {
    return "image/png";
  }
  if (
    startsWith(bytes, [0x52, 0x49, 0x46, 0x46]) &&
    String.fromCharCode(...bytes.slice(8, 12)) === "WEBP"
  ) {
    return "image/webp";
  }
  if (
    bytes.length >= 12 &&
    String.fromCharCode(...bytes.slice(4, 8)) === "ftyp" &&
    ["avif", "avis"].includes(String.fromCharCode(...bytes.slice(8, 12)))
  ) {
    return "image/avif";
  }
  if (startsWith(bytes, [0x25, 0x50, 0x44, 0x46, 0x2d])) {
    return "application/pdf";
  }
  return "application/octet-stream";
}

interface ValidationInput {
  bytes: Uint8Array;
  declaredMimeType: string;
  maximumBytes: number;
  purpose: "public_asset" | "admin_asset_staging" | "inquiry";
}

export interface ValidatedFile {
  detectedMimeType: Exclude<DetectedMimeType, "application/octet-stream">;
  width: number | null;
  height: number | null;
}

export async function validateUploadedFile(
  input: ValidationInput,
): Promise<ValidatedFile> {
  if (input.bytes.byteLength === 0) throw new Error("Empty files are not accepted.");
  if (input.bytes.byteLength > input.maximumBytes) {
    throw new Error("File exceeds the configured size limit.");
  }

  const detectedMimeType = detectMimeType(input.bytes);
  if (detectedMimeType === "application/octet-stream") {
    throw new Error("File signature is not supported.");
  }
  if (detectedMimeType !== input.declaredMimeType) {
    throw new Error("Declared MIME type does not match the file signature.");
  }

  const allowList =
    input.purpose === "inquiry" ? acceptedInquiryMimeTypes : acceptedPublicMimeTypes;
  if (!(allowList as readonly string[]).includes(detectedMimeType)) {
    throw new Error("File type is not permitted for this upload purpose.");
  }

  if (detectedMimeType === "application/pdf") {
    return { detectedMimeType, width: null, height: null };
  }

  try {
    return await runWithImageWorkSemaphore(async () => {
      const decoded = sharp(input.bytes, { failOn: "error" });
      const metadata = await decoded.metadata();
      await decoded.clone().toBuffer();
      return {
        detectedMimeType,
        width: metadata.width ?? null,
        height: metadata.height ?? null,
      };
    });
  } catch {
    throw new Error("Image decoding validation failed.");
  }
}

export function inferNonBlockingRiskHints(fileName: string): string[] {
  const normalized = fileName.toLowerCase();
  const hints: string[] = [];
  if (normalized.includes("logo") || normalized.includes("brand")) {
    hints.push("possible_third_party_logo");
  }
  if (
    normalized.includes("certificate") ||
    normalized.includes("report") ||
    normalized.includes("test-result")
  ) {
    hints.push("possible_certificate_or_third_party_document");
  }
  return hints;
}
