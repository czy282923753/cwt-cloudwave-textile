import { count, eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import { authors, featureFlags, users } from "@/db/schema";
import { createTestDatabase } from "@/test/database";

import { seedCoreData } from "./seed";

describe("core seed repeatability", () => {
  it("can run repeatedly without duplicating stable records", async () => {
    const connection = await createTestDatabase();
    const first = await seedCoreData(connection.db);
    await connection.db
      .update(featureFlags)
      .set({ enabled: true })
      .where(eq(featureFlags.key, "ai"));
    const second = await seedCoreData(connection.db);
    expect(second.adminUserId).toBe(first.adminUserId);
    const [userRows, authorRows, flagRows] = await Promise.all([
      connection.db.select({ value: count() }).from(users),
      connection.db.select({ value: count() }).from(authors),
      connection.db.select({ value: count() }).from(featureFlags),
    ]);
    expect(Number(userRows[0]?.value)).toBe(1);
    expect(Number(authorRows[0]?.value)).toBe(1);
    expect(Number(flagRows[0]?.value)).toBe(4);
    const preserved = await connection.db
      .select({ enabled: featureFlags.enabled })
      .from(featureFlags)
      .where(eq(featureFlags.key, "ai"));
    expect(preserved[0]?.enabled).toBe(true);
    await connection.close();
  });
});
