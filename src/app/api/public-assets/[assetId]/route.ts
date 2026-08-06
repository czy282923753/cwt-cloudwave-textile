import { NextResponse } from "next/server";

import { databaseConnection } from "@/db/client";
import { findPublicAssetForDelivery } from "@/public-site/public-asset-access";
import { createObjectStorage } from "@/storage";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const variantKeyPattern = /^[a-z0-9][a-z0-9_-]{0,79}$/i;

export async function GET(
  request: Request,
  context: { params: Promise<{ assetId: string }> },
): Promise<NextResponse> {
  const { assetId } = await context.params;
  const variantKey = new URL(request.url).searchParams.get("variant") ?? undefined;
  if (!uuidPattern.test(assetId) || (variantKey && !variantKeyPattern.test(variantKey))) {
    return new NextResponse("Not found", { status: 404 });
  }
  try {
    const asset = databaseConnection.kind === "pglite"
      ? await findPublicAssetForDelivery(databaseConnection.db, assetId, variantKey)
      : await findPublicAssetForDelivery(databaseConnection.db, assetId, variantKey);
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
  } catch (error) {
    console.error("Public Asset delivery temporarily failed.", {
      assetId,
      cause: error instanceof Error ? error.name : "UnknownError",
    });
    return new NextResponse("Temporarily unavailable", {
      status: 503,
      headers: { "cache-control": "private, no-store, max-age=0" },
    });
  }
}
