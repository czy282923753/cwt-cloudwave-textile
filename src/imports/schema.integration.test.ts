import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import { authSessions, productImportBatches, productImportItems, users } from "@/db/schema";
import { createTestDatabase } from "@/test/database";

describe("Product Import durable authority", () => {
  it("enforces the approved modes, states, item identity, and bounded evidence", async () => {
    const connection = await createTestDatabase();
    try {
      const [user] = await connection.db.insert(users).values({ email: "import-schema@example.test", displayName: "Synthetic Import", role: "product_editor", passwordHash: "test" }).returning({ id: users.id });
      const [session] = await connection.db.insert(authSessions).values({ userId: user!.id, tokenHash: "import-schema-session", expiresAt: new Date(Date.now() + 60_000) }).returning({ id: authSessions.id });
      const [batch] = await connection.db.insert(productImportBatches).values({ createdByUserId: user!.id, authSessionId: session!.id, mode: "create", sourceFingerprint: "a".repeat(64), status: "validated" }).returning({ id: productImportBatches.id });
      await connection.db.insert(productImportItems).values({ batchId: batch!.id, kind: "row", sourceKey: "row:002", rowNumber: 2, status: "valid", rawData: { name: "Synthetic" }, normalizedData: { productCode: "CWT-TEST-001" } });
      await expect(connection.db.insert(productImportItems).values({ batchId: batch!.id, kind: "row", sourceKey: "row:002", rowNumber: 2, status: "valid" })).rejects.toThrow();
      expect((await connection.db.select().from(productImportItems).where(eq(productImportItems.batchId, batch!.id)))).toHaveLength(1);
      await expect(connection.db.insert(productImportBatches).values({ createdByUserId: user!.id, authSessionId: session!.id, mode: "mixed", sourceFingerprint: "b".repeat(64) })).rejects.toThrow();
    } finally { await connection.close(); }
  });
});
