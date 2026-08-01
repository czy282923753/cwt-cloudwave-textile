import { sql } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import { migrateDatabase } from "./migrate";
import { createTestDatabase } from "@/test/database";

describe("database migrations", () => {
  it("creates the complete schema and is safe to run repeatedly", async () => {
    const connection = await createTestDatabase();
    await migrateDatabase(connection);
    const result = await connection.db.execute<{ table_name: string }>(sql`
      select table_name
      from information_schema.tables
      where table_schema = 'public'
    `);
    const names = result.rows.map((row) => row.table_name);
    expect(names).toContain("products");
    expect(names).toContain("assets");
    expect(names).toContain("inquiries");
    expect(names).toContain("audit_logs");
    await connection.close();
  });
});
