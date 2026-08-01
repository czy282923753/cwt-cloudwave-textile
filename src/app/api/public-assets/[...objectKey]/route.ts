import { NextResponse } from "next/server";
import { env } from "@/config/env";
import { databaseConnection } from "@/db/client";
import { findPublicAssetForDelivery } from "@/public-site/public-asset-access";
import { LocalObjectStorage } from "@/storage/local";

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
  context: { params: Promise<{ objectKey: string[] }> },
): Promise<NextResponse> {
  void request;
  if (env.STORAGE_DRIVER !== "local") return new NextResponse("Not found", { status: 404 });
  const objectKey = (await context.params).objectKey.join("/");
  try {
    const asset = databaseConnection.kind === "pglite"
      ? await findPublicAssetForDelivery(databaseConnection.db, objectKey)
      : await findPublicAssetForDelivery(databaseConnection.db, objectKey);
    if (!asset) return new NextResponse("Not found", { status: 404 });
    const bytes = await new LocalObjectStorage().get("public", objectKey);
    return new NextResponse(Buffer.from(bytes), {
      headers: {
        "content-type": contentType(objectKey),
        "cache-control": "public, max-age=3600, stale-while-revalidate=86400",
        "x-content-type-options": "nosniff",
      },
    });
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
}
