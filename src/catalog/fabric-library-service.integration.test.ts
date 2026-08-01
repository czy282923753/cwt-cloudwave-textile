import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import { assets, routes, seoMetadata, users } from "@/db/schema";
import { createTestDatabase } from "@/test/database";

import { createFabricLibraryEntry } from "./fabric-library-service";

describe("Fabric Library boundary", () => {
  it("creates a distinct thin visual entry as noindex", async () => {
    const connection = await createTestDatabase();
    const userRows = await connection.db
      .insert(users)
      .values({
        email: "fabric-editor@example.test",
        displayName: "Fabric Editor",
        role: "product_editor",
        passwordHash: "test",
      })
      .returning({ id: users.id });
    const userId = userRows[0]?.id;
    if (!userId) throw new Error("Missing actor.");
    const assetRows = await connection.db
      .insert(assets)
      .values({
        originalFileName: "fabric.jpg",
        storageProvider: "test",
        storagePartition: "public",
        objectKey: "test/fabric.jpg",
        access: "public",
        category: "fabric",
        status: "ready",
        declaredMimeType: "image/jpeg",
        detectedMimeType: "image/jpeg",
        byteSize: 100,
        sha256: "fabric-test-sha",
      })
      .returning({ id: assets.id });
    const assetId = assetRows[0]?.id;
    if (!assetId) throw new Error("Missing asset.");
    const entryId = await createFabricLibraryEntry(
      connection.db,
      { userId, role: "product_editor" },
      { title: "TEST Blue Fabric Visual", assetIds: [assetId] },
    );
    const rows = await connection.db
      .select({ indexStatus: seoMetadata.indexStatus })
      .from(routes)
      .innerJoin(seoMetadata, eq(seoMetadata.routeId, routes.id))
      .where(eq(routes.entityId, entryId));
    expect(rows[0]?.indexStatus).toBe("noindex");
    await connection.close();
  });
});
