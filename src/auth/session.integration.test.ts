import { describe, expect, it } from "vitest";

import { count, eq } from "drizzle-orm";

import { authSessions, users } from "@/db/schema";
import { createTestDatabase } from "@/test/database";

import {
  createAuthenticatedSession,
  createSession,
  resolveSession,
  revokeAuthenticatedSession,
  revokeSession,
} from "./session";

const failingAudit = async (): Promise<string> => {
  throw new Error("TEST session Audit failure");
};

describe("database sessions", () => {
  it("resolves active sessions and refuses revoked sessions", async () => {
    const connection = await createTestDatabase();
    const rows = await connection.db
      .insert(users)
      .values({
        email: "reviewer@example.test",
        displayName: "Test Reviewer",
        role: "reviewer_publisher",
        passwordHash: "test-only-hash",
      })
      .returning({ id: users.id });
    const userId = rows[0]?.id;
    expect(userId).toBeTruthy();
    if (!userId) throw new Error("Missing test user.");

    const session = await createSession(connection.db, userId);
    await expect(resolveSession(connection.db, session.token)).resolves.toMatchObject({
      id: userId,
      role: "reviewer_publisher",
    });
    await revokeSession(connection.db, session.token);
    await expect(resolveSession(connection.db, session.token)).resolves.toBeNull();
    await connection.close();
  });

  it("rolls authenticated session creation and revocation back when Audit fails", async () => {
    const connection = await createTestDatabase();
    try {
      const [user] = await connection.db.insert(users).values({
        email: "atomic-session@example.test",
        displayName: "Atomic Session User",
        role: "admin",
        passwordHash: "test-only-hash",
      }).returning({ id: users.id });
      if (!user) throw new Error("Missing test User.");

      await expect(createAuthenticatedSession(
        connection.db,
        user.id,
        "create-audit-failure",
        { auditWriter: failingAudit },
      )).rejects.toThrow("TEST session Audit failure");
      expect((await connection.db.select({ value: count() }).from(authSessions))[0]?.value).toBe(0);
      expect((await connection.db.select({ lastLoginAt: users.lastLoginAt }).from(users).where(eq(users.id, user.id)))[0]?.lastLoginAt).toBeNull();

      const session = await createAuthenticatedSession(
        connection.db,
        user.id,
        "create-success",
      );
      await expect(revokeAuthenticatedSession(
        connection.db,
        session.token,
        "revoke-audit-failure",
        { auditWriter: failingAudit },
      )).rejects.toThrow("TEST session Audit failure");
      await expect(resolveSession(connection.db, session.token)).resolves.toMatchObject({ id: user.id });
    } finally {
      await connection.close();
    }
  });
});
