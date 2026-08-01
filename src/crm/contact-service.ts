import { eq } from "drizzle-orm";
import type { PgQueryResultHKT } from "drizzle-orm/pg-core/session";

import { writeAuditLog } from "@/audit/service";
import { requirePermission } from "@/auth/permissions";
import type { Actor } from "@/catalog/product-service";
import { contacts, organizations } from "@/db/schema";
import type { AppDatabase } from "@/db/types";

export async function createOrganization<TQueryResult extends PgQueryResultHKT>(
  db: AppDatabase<TQueryResult>,
  actor: Actor,
  input: { name: string; website?: string | null; countryCode?: string | null },
): Promise<string> {
  requirePermission(actor.role, "users.manage");
  const name = input.name.trim();
  if (!name) throw new Error("Organization Name is required.");
  return db.transaction(async (transaction) => {
    const rows = await transaction
      .insert(organizations)
      .values({
        name,
        website: input.website?.trim() || null,
        countryCode: input.countryCode?.trim() || null,
      })
      .returning({ id: organizations.id });
    const id = rows[0]?.id;
    if (!id) throw new Error("Organization insert failed.");
    await writeAuditLog(transaction, {
      actorUserId: actor.userId,
      action: "organization.created",
      entityType: "organization",
      entityId: id,
    });
    return id;
  });
}

export async function assignContactOrganization<
  TQueryResult extends PgQueryResultHKT,
>(
  db: AppDatabase<TQueryResult>,
  actor: Actor,
  contactId: string,
  organizationId: string | null,
): Promise<void> {
  requirePermission(actor.role, "users.manage");
  await db.transaction(async (transaction) => {
    if (organizationId) {
      const organization = await transaction
        .select({ id: organizations.id })
        .from(organizations)
        .where(eq(organizations.id, organizationId))
        .limit(1);
      if (!organization[0]) throw new Error("Organization was not found.");
    }
    const updated = await transaction
      .update(contacts)
      .set({ organizationId, updatedAt: new Date() })
      .where(eq(contacts.id, contactId))
      .returning({ id: contacts.id });
    if (!updated[0]) throw new Error("Contact was not found.");
    await writeAuditLog(transaction, {
      actorUserId: actor.userId,
      action: "contact.organization.assigned",
      entityType: "contact",
      entityId: contactId,
      afterSummary: { organizationId },
    });
  });
}
