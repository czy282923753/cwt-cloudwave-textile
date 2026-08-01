import { eq } from "drizzle-orm";
import type { PgQueryResultHKT } from "drizzle-orm/pg-core/session";

import { writeAuditLog } from "@/audit/service";
import { requirePermission } from "@/auth/permissions";
import type { Actor } from "@/catalog/product-service";
import { featureFlags } from "@/db/schema";
import type { AppDatabase } from "@/db/types";

export async function setFeatureFlag<TQueryResult extends PgQueryResultHKT>(
  db: AppDatabase<TQueryResult>,
  actor: Actor,
  flagId: string,
  enabled: boolean,
): Promise<void> {
  requirePermission(actor.role, "settings.manage");
  await db.transaction(async (transaction) => {
    const before = await transaction
      .select({ enabled: featureFlags.enabled, key: featureFlags.key })
      .from(featureFlags)
      .where(eq(featureFlags.id, flagId))
      .limit(1);
    if (!before[0]) throw new Error("Feature Flag was not found.");
    await transaction
      .update(featureFlags)
      .set({ enabled, updatedByUserId: actor.userId, updatedAt: new Date() })
      .where(eq(featureFlags.id, flagId));
    await writeAuditLog(transaction, {
      actorUserId: actor.userId,
      action: "feature_flag.changed",
      entityType: "feature_flag",
      entityId: flagId,
      beforeSummary: { enabled: before[0].enabled },
      afterSummary: { key: before[0].key, enabled },
    });
  });
}
