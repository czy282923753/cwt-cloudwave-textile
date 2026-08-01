import { describe, expect, it } from "vitest";

import { users } from "@/db/schema";
import { createTestDatabase } from "@/test/database";

import { createSession, resolveSession, revokeSession } from "./session";

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
});
