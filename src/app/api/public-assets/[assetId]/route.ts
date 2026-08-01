import { NextResponse } from "next/server";

import { databaseConnection } from "@/db/client";
import { findPublicAssetForDelivery } from "@/public-site/public-asset-access";
import { createObjectStorage } from "@/storage";

export async function GET(
  request: Request,
  context: { params: Promise<{ assetId: string }> },
): Promise<NextResponse> {
  void request;
  const { assetId } = await context.params;
  try {
    const asset = databaseConnection.kind === "pglite"
      ? await findPublicAssetForDelivery(databaseConnection.db, assetId)
      : await findPublicAssetForDelivery(databaseConnection.db, assetId);
    if (!asset) return new NextResponse("Not found", { status: 404 });
    const bytes = await createObjectStorage().get("public", asset.objectKey);
    return new NextResponse(Buffer.from(bytes), {
      headers: {
        "content-type": asset.detectedMimeType,
        "cache-control": "private, no-store, max-age=0, must-revalidate",
        "content-disposition": "inline",
        "x-content-type-options": "nosniff",
      },
    });
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
}
