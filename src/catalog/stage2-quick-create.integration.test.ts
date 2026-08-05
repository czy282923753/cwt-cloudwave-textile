import { and, eq, inArray } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import {
  applications,
  auditLogs,
  routes,
  seoMetadata,
  taxonomyTerms,
  users,
} from "@/db/schema";
import { createTestDatabase } from "@/test/database";

import { createApplicationDraft, createTaxonomyTerm } from "./taxonomy-service";

describe("I-03 Category/Application governed quick creation", () => {
  it("creates immediately selectable noindex records with Required Audit and rejects normalized duplicates", async () => {
    const connection = await createTestDatabase();
    const userRows = await connection.db.insert(users).values({
      email: `stage2-taxonomy-${crypto.randomUUID()}@example.test`,
      displayName: "TEST Stage 2 Product Editor",
      role: "product_editor",
      passwordHash: "test",
    }).returning({ id: users.id });
    const actor = { userId: userRows[0]!.id, role: "product_editor" as const };
    const termId = await createTaxonomyTerm(connection.db, actor, {
      internalKey: `stage2-category-${crypto.randomUUID()}`,
      name: "TEST Stage 2 Performance Knit",
      dimension: "structure_construction",
      productCodePrefix: "SPK",
    });
    const applicationId = await createApplicationDraft(connection.db, actor, {
      internalKey: `stage2-application-${crypto.randomUUID()}`,
      name: "TEST Stage 2 Protective Apparel",
    });
    expect((await connection.db.select().from(taxonomyTerms).where(eq(taxonomyTerms.id, termId)))[0])
      .toMatchObject({ productCodePrefix: "SPK", isActive: true });
    expect((await connection.db.select().from(applications).where(eq(applications.id, applicationId)))[0]?.status)
      .toBe("draft");
    const createdRoutes = await connection.db
      .select({ entityType: routes.entityType, indexStatus: seoMetadata.indexStatus })
      .from(routes)
      .innerJoin(seoMetadata, eq(seoMetadata.routeId, routes.id))
      .where(inArray(routes.entityId, [termId, applicationId]));
    expect(createdRoutes).toEqual(expect.arrayContaining([
      { entityType: "taxonomy", indexStatus: "noindex" },
      { entityType: "application", indexStatus: "noindex" },
    ]));
    const audits = await connection.db.select({ action: auditLogs.action }).from(auditLogs).where(and(
      inArray(auditLogs.entityId, [termId, applicationId]),
      inArray(auditLogs.action, ["taxonomy.created", "application.draft.created"]),
    ));
    expect(audits).toHaveLength(2);
    await expect(createTaxonomyTerm(connection.db, actor, {
      internalKey: `stage2-category-duplicate-${crypto.randomUUID()}`,
      name: "  TEST Stage 2 Performance Knit  ",
      dimension: "structure_construction",
      productCodePrefix: null,
    })).rejects.toThrow(/URL is already in use/);
    await connection.close();
  });

  it("denies quick creation to a role without taxonomy.manage", async () => {
    const connection = await createTestDatabase();
    const userRows = await connection.db.insert(users).values({
      email: `stage2-sales-${crypto.randomUUID()}@example.test`,
      displayName: "TEST Stage 2 Sales",
      role: "sales",
      passwordHash: "test",
    }).returning({ id: users.id });
    await expect(createApplicationDraft(connection.db, {
      userId: userRows[0]!.id,
      role: "sales",
    }, {
      internalKey: `forbidden-${crypto.randomUUID()}`,
      name: "TEST Forbidden Application",
    })).rejects.toThrow(/permission/i);
    await connection.close();
  });
});
