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
  const result = await authenticateUserAttempt(db, email, password);
  return result.status === "success" ? { id: result.userId } : null;
}

export async function authenticateUserAttempt<
  TQueryResult extends PgQueryResultHKT,
>(
  db: AppDatabase<TQueryResult>,
  email: string,
  password: string,
): Promise<
  | { status: "success"; userId: string }
  | { status: "invalid" }
  | { status: "disabled"; userId: string }
> {
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
  if (!user) return { status: "invalid" };
  if (!user.isActive) return { status: "disabled", userId: user.id };
  return (await verifyPassword(password, user.passwordHash))
    ? { status: "success", userId: user.id }
    : { status: "invalid" };
}
