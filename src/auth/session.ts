import { createHash, randomBytes } from "node:crypto";
import { and, eq, gt, isNull } from "drizzle-orm";
import type { PgQueryResultHKT } from "drizzle-orm/pg-core/session";

import type { AppDatabase } from "@/db/types";
import { authSessions, users } from "@/db/schema";

const SESSION_DURATION_MS = 8 * 60 * 60 * 1000;

function hashSessionToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function createSession<TQueryResult extends PgQueryResultHKT>(
  db: AppDatabase<TQueryResult>,
  userId: string,
): Promise<{ token: string; expiresAt: Date }> {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);
  await db.insert(authSessions).values({
    userId,
    tokenHash: hashSessionToken(token),
    expiresAt,
  });
  return { token, expiresAt };
}

export async function resolveSession<TQueryResult extends PgQueryResultHKT>(
  db: AppDatabase<TQueryResult>,
  token: string,
): Promise<{ id: string; email: string; displayName: string; role: typeof users.$inferSelect.role } | null> {
  const rows = await db
    .select({
      id: users.id,
      email: users.email,
      displayName: users.displayName,
      role: users.role,
    })
    .from(authSessions)
    .innerJoin(users, eq(authSessions.userId, users.id))
    .where(
      and(
        eq(authSessions.tokenHash, hashSessionToken(token)),
        gt(authSessions.expiresAt, new Date()),
        isNull(authSessions.revokedAt),
        eq(users.isActive, true),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

export async function revokeSession<TQueryResult extends PgQueryResultHKT>(
  db: AppDatabase<TQueryResult>,
  token: string,
): Promise<{ sessionId: string; userId: string } | null> {
  const rows = await db
    .update(authSessions)
    .set({ revokedAt: new Date() })
    .where(
      and(
        eq(authSessions.tokenHash, hashSessionToken(token)),
        isNull(authSessions.revokedAt),
      ),
    )
    .returning({ sessionId: authSessions.id, userId: authSessions.userId });
  return rows[0] ?? null;
}
