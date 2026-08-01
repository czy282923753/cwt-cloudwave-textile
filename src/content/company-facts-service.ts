import { eq } from "drizzle-orm";
import type { PgQueryResultHKT } from "drizzle-orm/pg-core/session";

import { writeAuditLog } from "@/audit/service";
import { requirePermission } from "@/auth/permissions";
import type { Actor } from "@/catalog/product-service";
import { companyFacts } from "@/db/schema";
import type { AppDatabase } from "@/db/types";

export async function verifyCompanyFact<TQueryResult extends PgQueryResultHKT>(
  db: AppDatabase<TQueryResult>,
  actor: Actor,
  factId: string,
  input: { evidenceReference: string; publicUseAllowed: boolean },
): Promise<void> {
  requirePermission(actor.role, "company_facts.manage");
  if (!input.evidenceReference.trim()) {
    throw new Error("Verified Company Facts require an evidence reference.");
  }
  await db
    .update(companyFacts)
    .set({
      evidenceReference: input.evidenceReference.trim(),
      publicUseAllowed: input.publicUseAllowed,
      verificationStatus: "verified",
      verifiedByUserId: actor.userId,
      verifiedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(companyFacts.id, factId));
  await writeAuditLog(db, {
    actorUserId: actor.userId,
    action: "company_fact.verified",
    entityType: "company_fact",
    entityId: factId,
    afterSummary: { publicUseAllowed: input.publicUseAllowed },
  });
}
