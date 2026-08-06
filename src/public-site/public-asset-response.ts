import { NextResponse } from "next/server";
import type { PgQueryResultHKT } from "drizzle-orm/pg-core/session";

import type { AppDatabase } from "@/db/types";
import type { ObjectStorage } from "@/storage";
import { isCanonicalAssetVariantKey } from "@/uploads/asset-variant";

import { findPublicAssetForDelivery } from "./public-asset-access";

export const GOVERNED_PUBLIC_ASSET_CACHE_CONTROL =
  "private, no-store, max-age=0, must-revalidate";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function governedResponse(
  body: BodyInit | null,
  status: number,
  headers: HeadersInit = {},
): NextResponse {
  return new NextResponse(body, {
    status,
    headers: {
      "cache-control": GOVERNED_PUBLIC_ASSET_CACHE_CONTROL,
      ...headers,
    },
  });
}

export async function serveGovernedPublicAsset<
  TQueryResult extends PgQueryResultHKT,
>(
  db: AppDatabase<TQueryResult>,
  storage: ObjectStorage,
  assetId: string,
  variantKey?: string,
): Promise<NextResponse> {
  if (
    !uuidPattern.test(assetId) ||
    (variantKey !== undefined && !isCanonicalAssetVariantKey(variantKey))
  ) {
    return governedResponse("Not found", 404);
  }
  try {
    const asset = await findPublicAssetForDelivery(db, assetId, variantKey);
    if (!asset) return governedResponse("Not found", 404);
    const bytes = await storage.get("public", asset.objectKey);
    return governedResponse(Buffer.from(bytes), 200, {
      "content-type": asset.detectedMimeType,
      "content-disposition": "inline",
      "x-content-type-options": "nosniff",
    });
  } catch (error) {
    console.error("Public Asset delivery temporarily failed.", {
      assetId,
      cause: error instanceof Error ? error.name : "UnknownError",
    });
    return governedResponse("Temporarily unavailable", 503);
  }
}
