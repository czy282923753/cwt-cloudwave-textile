import { eq } from "drizzle-orm";
import type { PgQueryResultHKT } from "drizzle-orm/pg-core/session";

import { hashPassword } from "@/auth/password";
import { env } from "@/config/env";

import { authors, featureFlags, users } from "./schema";
import type { AppDatabase } from "./types";

export async function seedCoreData<TQueryResult extends PgQueryResultHKT>(
  db: AppDatabase<TQueryResult>,
): Promise<{ adminUserId: string }> {
  const passwordHash = await hashPassword(env.DEV_ADMIN_PASSWORD);
  const existingUsers = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, env.DEV_ADMIN_EMAIL.toLowerCase()))
    .limit(1);

  let adminUserId = existingUsers[0]?.id;
  if (adminUserId) {
    await db
      .update(users)
      .set({
        displayName: "Local CWT Administrator",
        role: "admin",
        passwordHash,
        isActive: true,
        updatedAt: new Date(),
      })
      .where(eq(users.id, adminUserId));
  } else {
    const inserted = await db
      .insert(users)
      .values({
        email: env.DEV_ADMIN_EMAIL.toLowerCase(),
        displayName: "Local CWT Administrator",
        role: "admin",
        passwordHash,
      })
      .returning({ id: users.id });
    adminUserId = inserted[0]?.id;
  }
  if (!adminUserId) throw new Error("Unable to seed the local administrator.");

  await db
    .insert(authors)
    .values({
      internalKey: "cwt-textile-team",
      displayName: "CWT Textile Team",
      isOrganization: true,
    })
    .onConflictDoUpdate({
      target: authors.internalKey,
      set: { displayName: "CWT Textile Team", isOrganization: true, isActive: true },
    });

  const flags = [
    ["refine_admin", env.FEATURE_REFINE_ADMIN],
    ["source_declaration", env.FEATURE_SOURCE_DECLARATION],
    ["ai", false],
    ["seo_assistant", false],
  ] as const;
  for (const [key, enabled] of flags) {
    await db
      .insert(featureFlags)
      .values({ key, enabled, updatedByUserId: adminUserId })
      .onConflictDoNothing({ target: featureFlags.key });
  }

  return { adminUserId };
}
