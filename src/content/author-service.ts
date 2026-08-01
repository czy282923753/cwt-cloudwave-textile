import { eq } from "drizzle-orm";
import type { PgQueryResultHKT } from "drizzle-orm/pg-core/session";

import { writeAuditLog } from "@/audit/service";
import { requirePermission } from "@/auth/permissions";
import type { Actor } from "@/catalog/product-service";
import { authors } from "@/db/schema";
import type { AppDatabase } from "@/db/types";

interface AuthorServiceOptions {
  auditWriter?: typeof writeAuditLog;
}

export async function createAuthor<TQueryResult extends PgQueryResultHKT>(
  db: AppDatabase<TQueryResult>,
  actor: Actor,
  input: {
    internalKey: string;
    displayName: string;
    bio?: string | null;
    isOrganization: boolean;
  },
  options: AuthorServiceOptions = {},
): Promise<string> {
  requirePermission(actor.role, "content.write");
  const internalKey = input.internalKey.trim();
  const displayName = input.displayName.trim();
  if (!internalKey || !displayName) throw new Error("Author key and display name are required.");
  const auditWriter = options.auditWriter ?? writeAuditLog;
  return db.transaction(async (transaction) => {
    const rows = await transaction
      .insert(authors)
      .values({
        internalKey,
        displayName,
        bio: input.bio?.trim() || null,
        isOrganization: input.isOrganization,
      })
      .returning({ id: authors.id });
    const authorId = rows[0]?.id;
    if (!authorId) throw new Error("Author insert failed.");
    await auditWriter(transaction, {
      actorUserId: actor.userId,
      action: "author.created",
      entityType: "author",
      entityId: authorId,
    });
    return authorId;
  });
}

export async function updateAuthor<TQueryResult extends PgQueryResultHKT>(
  db: AppDatabase<TQueryResult>,
  actor: Actor,
  authorId: string,
  input: {
    displayName: string;
    bio?: string | null;
    isOrganization: boolean;
    isActive: boolean;
  },
  options: AuthorServiceOptions = {},
): Promise<void> {
  requirePermission(actor.role, "content.write");
  const displayName = input.displayName.trim();
  if (!displayName) throw new Error("Author display name is required.");
  const auditWriter = options.auditWriter ?? writeAuditLog;
  await db.transaction(async (transaction) => {
    const beforeRows = await transaction
      .select({ isActive: authors.isActive })
      .from(authors)
      .where(eq(authors.id, authorId))
      .limit(1);
    const before = beforeRows[0];
    if (!before) throw new Error("Author was not found.");
    const updated = await transaction
      .update(authors)
      .set({
        displayName,
        bio: input.bio?.trim() || null,
        isOrganization: input.isOrganization,
        isActive: input.isActive,
        updatedAt: new Date(),
      })
      .where(eq(authors.id, authorId))
      .returning({ id: authors.id });
    if (!updated[0]) throw new Error("Author was not found.");
    await auditWriter(transaction, {
      actorUserId: actor.userId,
      action: "author.updated",
      entityType: "author",
      entityId: authorId,
      beforeSummary: { isActive: before.isActive },
      afterSummary: { isActive: input.isActive },
    });
  });
}
