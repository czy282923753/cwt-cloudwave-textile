import { count } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import { DevelopmentFileScanner } from "@/uploads/scanner";
import { InMemoryObjectStorage } from "@/test/in-memory-storage";
import { createTestDatabase } from "@/test/database";

import { seedFixtureProducts } from "./fixture-seed";
import { seedCoreData } from "./seed";
import { products } from "./schema";

describe("fixture seed repeatability", () => {
  it("creates 12 explicit Noindex fixtures once under database invariants", async () => {
    const connection = await createTestDatabase();
    const { adminUserId } = await seedCoreData(connection.db);
    const storage = new InMemoryObjectStorage();
    const scanner = new DevelopmentFileScanner();
    await expect(
      seedFixtureProducts(connection.db, storage, scanner, adminUserId),
    ).resolves.toBe(12);
    await expect(
      seedFixtureProducts(connection.db, storage, scanner, adminUserId),
    ).resolves.toBe(0);
    const rows = await connection.db.select({ value: count() }).from(products);
    expect(Number(rows[0]?.value)).toBe(12);
    await connection.close();
  }, 15_000);
});
