import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { writeAuditLog } from "@/audit/service";
import { requireCurrentUser } from "@/auth/current-user";
import { env } from "@/config/env";
import { databaseConnection } from "@/db/client";
import { assets, inquiryAssets } from "@/db/schema";
import { createObjectStorage, type StoragePartition } from "@/storage";

async function authorizeAsset(assetId: string) {
  const query = databaseConnection.kind === "pglite"
    ? databaseConnection.db
        .select({
          id: assets.id,
          objectKey: assets.objectKey,
          partition: assets.storagePartition,
        })
        .from(assets)
        .innerJoin(inquiryAssets, eq(inquiryAssets.assetId, assets.id))
        .where(
          and(
            eq(assets.id, assetId),
            eq(assets.category, "inquiry"),
            eq(assets.access, "private"),
            eq(assets.status, "ready"),
          ),
        )
        .limit(1)
    : databaseConnection.db
        .select({
          id: assets.id,
          objectKey: assets.objectKey,
          partition: assets.storagePartition,
        })
        .from(assets)
        .innerJoin(inquiryAssets, eq(inquiryAssets.assetId, assets.id))
        .where(
          and(
            eq(assets.id, assetId),
            eq(assets.category, "inquiry"),
            eq(assets.access, "private"),
            eq(assets.status, "ready"),
          ),
        )
        .limit(1);
  return (await query)[0] ?? null;
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ assetId: string }> },
): Promise<NextResponse> {
  const user = await requireCurrentUser("inquiries.read");
  const { assetId } = await context.params;
  const asset = await authorizeAsset(assetId);
  if (!asset || asset.partition !== "private") {
    return new NextResponse("Not found", { status: 404 });
  }
  if (databaseConnection.kind === "pglite") {
    await writeAuditLog(databaseConnection.db, {
      actorUserId: user.id,
      action: "private_file.access_granted",
      entityType: "asset",
      entityId: asset.id,
    });
  } else {
    await writeAuditLog(databaseConnection.db, {
      actorUserId: user.id,
      action: "private_file.access_granted",
      entityType: "asset",
      entityId: asset.id,
    });
  }
  const url = await createObjectStorage().createReadUrl(
    asset.partition as StoragePartition,
    asset.objectKey,
    env.PRIVATE_URL_TTL_SECONDS,
  );
  return NextResponse.redirect(new URL(url, env.NEXT_PUBLIC_SITE_URL));
}
