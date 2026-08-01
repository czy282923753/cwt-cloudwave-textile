import { and, eq } from "drizzle-orm";
import type { PgQueryResultHKT } from "drizzle-orm/pg-core/session";

import { writeAuditLog } from "@/audit/service";
import { requirePermission } from "@/auth/permissions";
import type { Actor } from "@/catalog/product-service";
import { companyFacts } from "@/db/schema";
import type { AppDatabase } from "@/db/types";

export async function updateCompanyFact<TQueryResult extends PgQueryResultHKT>(
  db: AppDatabase<TQueryResult>,
  actor: Actor,
  factId: string,
  input: {
    subject: string;
    statement: string;
    relationshipToCwt?: string | null;
    evidenceReference?: string | null;
  },
): Promise<void> {
  requirePermission(actor.role, "company_facts.manage");
  if (!input.subject.trim() || !input.statement.trim()) {
    throw new Error("Company Fact subject and statement are required.");
  }
  const beforeRows = await db
    .select()
    .from(companyFacts)
    .where(eq(companyFacts.id, factId))
    .limit(1);
  const before = beforeRows[0];
  if (!before) throw new Error("Company Fact was not found.");
  await db
    .update(companyFacts)
    .set({
      subject: input.subject.trim(),
      statement: input.statement.trim(),
      relationshipToCwt: input.relationshipToCwt?.trim() || null,
      evidenceReference: input.evidenceReference?.trim() || null,
      verificationStatus: "provided",
      publicUseAllowed: false,
      verifiedByUserId: null,
      verifiedAt: null,
      updatedAt: new Date(),
    })
    .where(eq(companyFacts.id, factId));
  await writeAuditLog(db, {
    actorUserId: actor.userId,
    action: "company_fact.updated_reverification_required",
    entityType: "company_fact",
    entityId: factId,
    beforeSummary: {
      verificationStatus: before.verificationStatus,
      publicUseAllowed: before.publicUseAllowed,
    },
    afterSummary: { verificationStatus: "provided", publicUseAllowed: false },
  });
}

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

export async function rejectCompanyFact<TQueryResult extends PgQueryResultHKT>(
  db: AppDatabase<TQueryResult>,
  actor: Actor,
  factId: string,
  reason: string,
): Promise<void> {
  requirePermission(actor.role, "company_facts.manage");
  if (!reason.trim()) throw new Error("Company Fact rejection requires a reason.");
  const updated = await db
    .update(companyFacts)
    .set({
      verificationStatus: "rejected",
      publicUseAllowed: false,
      verifiedByUserId: actor.userId,
      verifiedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(companyFacts.id, factId))
    .returning({ id: companyFacts.id });
  if (!updated[0]) throw new Error("Company Fact was not found.");
  await writeAuditLog(db, {
    actorUserId: actor.userId,
    action: "company_fact.rejected",
    entityType: "company_fact",
    entityId: factId,
    afterSummary: { publicUseAllowed: false, reason: reason.trim().slice(0, 500) },
  });
}

export async function listVerifiedPublicCompanyFacts<
  TQueryResult extends PgQueryResultHKT,
>(db: AppDatabase<TQueryResult>): Promise<ReadonlyMap<string, string>> {
  const rows = await db
    .select({ key: companyFacts.factKey, statement: companyFacts.statement })
    .from(companyFacts)
    .where(
      and(
        eq(companyFacts.verificationStatus, "verified"),
        eq(companyFacts.publicUseAllowed, true),
      ),
    );
  return new Map(rows.map((row) => [row.key, row.statement]));
}
