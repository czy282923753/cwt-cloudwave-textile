import { cookies } from "next/headers";

import { env } from "@/config/env";
import { databaseConnection } from "@/db/client";

import type { Permission } from "./permissions";
import { requirePermission } from "./permissions";
import { resolveSession } from "./session";

export type CurrentUser = NonNullable<Awaited<ReturnType<typeof resolveCurrentUser>>>;

export async function resolveCurrentUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get(env.AUTH_COOKIE_NAME)?.value;
  if (!token) return null;
  if (databaseConnection.kind === "pglite") {
    return resolveSession(databaseConnection.db, token);
  }
  return resolveSession(databaseConnection.db, token);
}

export async function requireCurrentUser(permission?: Permission): Promise<CurrentUser> {
  const user = await resolveCurrentUser();
  if (!user) throw new Error("Authentication required.");
  if (permission) requirePermission(user.role, permission);
  return user;
}
