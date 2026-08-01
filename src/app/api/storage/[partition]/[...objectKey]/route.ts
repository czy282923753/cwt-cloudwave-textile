import { NextResponse } from "next/server";

import { env } from "@/config/env";
import { LocalObjectStorage, verifyLocalReadGrant } from "@/storage/local";
import type { StoragePartition } from "@/storage";

function isPartition(value: string): value is StoragePartition {
  return value === "public" || value === "private" || value === "imports";
}

function contentType(objectKey: string): string {
  if (objectKey.endsWith(".jpg") || objectKey.endsWith(".jpeg")) return "image/jpeg";
  if (objectKey.endsWith(".png")) return "image/png";
  if (objectKey.endsWith(".webp")) return "image/webp";
  if (objectKey.endsWith(".avif")) return "image/avif";
  if (objectKey.endsWith(".pdf")) return "application/pdf";
  return "application/octet-stream";
}

export async function GET(
  request: Request,
  context: { params: Promise<{ partition: string; objectKey: string[] }> },
): Promise<NextResponse> {
  if (env.STORAGE_DRIVER !== "local") {
    return new NextResponse("Not found", { status: 404 });
  }
  const { partition, objectKey: segments } = await context.params;
  const objectKey = segments.join("/");
  if (!isPartition(partition)) return new NextResponse("Not found", { status: 404 });
  const url = new URL(request.url);
  const expires = Number(url.searchParams.get("expires"));
  const signature = url.searchParams.get("signature") ?? "";
  if (!verifyLocalReadGrant(partition, objectKey, expires, signature)) {
    return new NextResponse("Expired or invalid grant", { status: 403 });
  }
  try {
    const bytes = await new LocalObjectStorage().get(partition, objectKey);
    return new NextResponse(Buffer.from(bytes), {
      headers: {
        "content-type": contentType(objectKey),
        "cache-control":
          partition === "public"
            ? "public, max-age=300"
            : "private, no-store, max-age=0",
        "x-content-type-options": "nosniff",
      },
    });
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
}
