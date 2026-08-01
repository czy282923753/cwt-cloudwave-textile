import { NextResponse } from "next/server";

import { writeAuditLog } from "@/audit/service";
import { requireCurrentUser } from "@/auth/current-user";
import { env } from "@/config/env";
import { databaseConnection } from "@/db/client";
import { createObjectStorage, type StoragePartition } from "@/storage";
import { authorizeInquiryAssetRecord } from "@/crm/authorization";

export async function GET(
  _request: Request,
  context: { params: Promise<{ assetId: string }> },
): Promise<NextResponse> {
  try {
    const user = await requireCurrentUser("inquiries.read");
    const { assetId } = await context.params;
    const asset = databaseConnection.kind === "pglite"
    ? await authorizeInquiryAssetRecord(
        databaseConnection.db,
        { userId: user.id, role: user.role },
        assetId,
      )
    : await authorizeInquiryAssetRecord(
        databaseConnection.db,
        { userId: user.id, role: user.role },
        assetId,
      );
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
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
}
