import { eq } from "drizzle-orm";
import type { PgQueryResultHKT } from "drizzle-orm/pg-core/session";

import { users } from "@/db/schema";
import type { AppDatabase } from "@/db/types";

import { verifyPassword } from "./password";

export async function authenticateUser<TQueryResult extends PgQueryResultHKT>(
  db: AppDatabase<TQueryResult>,
  email: string,
  password: string,
): Promise<{ id: string } | null> {
  const normalizedEmail = email.trim().toLowerCase();
  const rows = await db
    .select({
      id: users.id,
      passwordHash: users.passwordHash,
      isActive: users.isActive,
    })
    .from(users)
    .where(eq(users.email, normalizedEmail))
    .limit(1);
  const user = rows[0];
  if (!user || !user.isActive) return null;
  return (await verifyPassword(password, user.passwordHash)) ? { id: user.id } : null;
}
