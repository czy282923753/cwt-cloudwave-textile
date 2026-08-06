import type { NextResponse } from "next/server";

import { databaseConnection } from "@/db/client";
import { serveGovernedPublicAsset } from "@/public-site/public-asset-response";
import { createObjectStorage } from "@/storage";

export async function GET(
  request: Request,
  context: { params: Promise<{ assetId: string }> },
): Promise<NextResponse> {
  const { assetId } = await context.params;
  const variantKey = new URL(request.url).searchParams.get("variant") ?? undefined;
  const storage = createObjectStorage();
  return databaseConnection.kind === "pglite"
    ? serveGovernedPublicAsset(databaseConnection.db, storage, assetId, variantKey)
    : serveGovernedPublicAsset(databaseConnection.db, storage, assetId, variantKey);
}
