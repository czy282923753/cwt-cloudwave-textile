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

import {
  approveTaxonomyPublicRoute,
  quickCreateApplicationDraft,
  quickCreateTaxonomyTerm,
} from "./taxonomy-service";

describe("I-03 Category/Application governed quick creation", () => {
  it("creates one immediately selectable internal Draft without Route or SEO authority", async () => {
    const connection = await createTestDatabase();
    const userRows = await connection.db.insert(users).values({
      email: `stage2-taxonomy-${crypto.randomUUID()}@example.test`,
      displayName: "TEST Stage 2 Product Editor",
      role: "product_editor",
      passwordHash: "test",
    }).returning({ id: users.id });
    const actor = { userId: userRows[0]!.id, role: "product_editor" as const };
    const termName = `TEST Stage 2 Performance Knit ${crypto.randomUUID()}`;
    const [termId, repeatedTermId] = await Promise.all([
      quickCreateTaxonomyTerm(connection.db, actor, {
      internalKey: "ignored-by-quick-create",
      name: termName,
      dimension: "structure_construction",
      productCodePrefix: "SPK",
    }),
      quickCreateTaxonomyTerm(connection.db, actor, {
      internalKey: "also-ignored",
      name: `  ${termName}  `,
      dimension: "structure_construction",
      productCodePrefix: "SPK",
    }),
    ]);
    expect(repeatedTermId).toBe(termId);
    const applicationId = await quickCreateApplicationDraft(connection.db, actor, {
      internalKey: "ignored-by-quick-create",
      name: `TEST Stage 2 Protective Apparel ${crypto.randomUUID()}`,
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
    expect(createdRoutes).toHaveLength(0);
    const audits = await connection.db.select({ action: auditLogs.action }).from(auditLogs).where(and(
      inArray(auditLogs.entityId, [termId, applicationId]),
      inArray(auditLogs.action, ["taxonomy.quick_draft.created", "application.quick_draft.created"]),
    ));
    expect(audits).toHaveLength(2);
    const approvedRouteId = await approveTaxonomyPublicRoute(connection.db, actor, termId);
    expect((await connection.db.select().from(routes).where(eq(routes.id, approvedRouteId)))[0])
      .toMatchObject({ entityType: "taxonomy", entityId: termId });
    expect((await connection.db.select().from(seoMetadata).where(eq(seoMetadata.routeId, approvedRouteId)))[0]?.indexStatus)
      .toBe("noindex");
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
    await expect(quickCreateApplicationDraft(connection.db, {
      userId: userRows[0]!.id,
      role: "sales",
    }, {
      internalKey: `forbidden-${crypto.randomUUID()}`,
      name: "TEST Forbidden Application",
    })).rejects.toThrow(/permission/i);
    await connection.close();
  });
});
