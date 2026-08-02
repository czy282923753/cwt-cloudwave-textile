import { randomUUID } from "node:crypto";

import { and, asc, count, eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import { auditLogs, redirects, routes, seoMetadata, users } from "@/db/schema";
import { createTestDatabase } from "@/test/database";

import { changeEntityRoute, createRedirect, RedirectConflictError } from "./redirects";

describe("Route and Redirect graph mutations", () => {
  it("rolls back a direct Route move and its Audit when the final Redirect destination dangles", async () => {
    const connection = await createTestDatabase();
    const entityId = randomUUID();
    const routeRows = await connection.db
      .insert(routes)
      .values({ path: "/final-guard-y/", entityType: "content", entityId })
      .returning({ id: routes.id });
    await connection.db.insert(redirects).values({
      sourcePath: "/final-guard-x/",
      destinationPath: "/final-guard-y/",
      reason: "Synthetic final-state guard fixture",
    });

    await expect(
      connection.db.transaction(async (transaction) => {
        await transaction
          .update(routes)
          .set({ path: "/final-guard-z/" })
          .where(eq(routes.id, routeRows[0]!.id));
        await transaction.insert(auditLogs).values({
          action: "test.direct_route.changed",
          entityType: "content",
          entityId,
        });
      }),
    ).rejects.toThrow(/final state/i);

    const persistedRoute = await connection.db
      .select({ path: routes.path })
      .from(routes)
      .where(eq(routes.id, routeRows[0]!.id));
    const persistedRedirect = await connection.db
      .select({ sourcePath: redirects.sourcePath, destinationPath: redirects.destinationPath })
      .from(redirects)
      .where(eq(redirects.sourcePath, "/final-guard-x/"));
    const persistedAudit = await connection.db
      .select({ value: count() })
      .from(auditLogs)
      .where(eq(auditLogs.action, "test.direct_route.changed"));
    expect(persistedRoute[0]?.path).toBe("/final-guard-y/");
    expect(persistedRedirect).toEqual([
      { sourcePath: "/final-guard-x/", destinationPath: "/final-guard-y/" },
    ]);
    expect(Number(persistedAudit[0]?.value)).toBe(0);
    await connection.close();
  });

  it("flattens inbound Redirects while moving a current Route", async () => {
    const connection = await createTestDatabase();
    const actorRows = await connection.db
      .insert(users)
      .values({
        email: "redirect-admin@example.test",
        displayName: "Redirect Admin",
        role: "admin",
        passwordHash: "test",
      })
      .returning({ id: users.id });
    const actor = { userId: actorRows[0]!.id, role: "admin" as const };
    const entityId = randomUUID();
    const routeRows = await connection.db
      .insert(routes)
      .values({
        path: "/graph-y/",
        entityType: "content",
        entityId,
      })
      .returning({ id: routes.id });
    await connection.db.insert(seoMetadata).values({
      routeId: routeRows[0]!.id,
      canonicalPath: "/graph-y/",
    });
    await createRedirect(connection.db, {
      sourcePath: "/graph-x/",
      destinationPath: "/graph-y/",
      reason: "Synthetic graph fixture",
      actor,
    });

    await changeEntityRoute(connection.db, {
      entityType: "content",
      entityId,
      locale: "en",
      newPath: "/graph-z/",
      reason: "Synthetic route move",
      actor,
    });

    const graph = await connection.db
      .select({ source: redirects.sourcePath, destination: redirects.destinationPath })
      .from(redirects)
      .orderBy(asc(redirects.sourcePath));
    expect(graph).toEqual([
      { source: "/graph-x/", destination: "/graph-z/" },
      { source: "/graph-y/", destination: "/graph-z/" },
    ]);
    const audits = await connection.db
      .select({ action: auditLogs.action })
      .from(auditLogs)
      .where(
        and(
          eq(auditLogs.entityId, entityId),
          eq(auditLogs.action, "route.path.changed"),
        ),
      );
    expect(audits).toHaveLength(1);
    await connection.close();
  });

  it("keeps Trigger enforcement as the last defense against an unflattened chain", async () => {
    const connection = await createTestDatabase();
    const entityId = randomUUID();
    const routeRows = await connection.db
      .insert(routes)
      .values({ path: "/trigger-y/", entityType: "content", entityId })
      .returning({ id: routes.id });
    await connection.db.insert(redirects).values({
      sourcePath: "/trigger-x/",
      destinationPath: "/trigger-y/",
      reason: "Synthetic trigger fixture",
    });

    await expect(
      connection.db.transaction(async (transaction) => {
        await transaction
          .update(routes)
          .set({ path: "/trigger-z/" })
          .where(eq(routes.id, routeRows[0]!.id));
        await transaction.insert(redirects).values({
          sourcePath: "/trigger-y/",
          destinationPath: "/trigger-z/",
          reason: "Synthetic invalid chain",
        });
      }),
    ).rejects.toThrow(/chain/i);
    const route = await connection.db
      .select({ path: routes.path })
      .from(routes)
      .where(eq(routes.id, routeRows[0]!.id));
    expect(route[0]?.path).toBe("/trigger-y/");
    expect(
      Number((await connection.db.select({ value: count() }).from(redirects))[0]?.value),
    ).toBe(1);
    await connection.close();
  });

  it("returns a stable conflict without writing a success Audit", async () => {
    const connection = await createTestDatabase();
    const actorRows = await connection.db
      .insert(users)
      .values({
        email: "redirect-conflict@example.test",
        displayName: "Redirect Conflict Admin",
        role: "admin",
        passwordHash: "test",
      })
      .returning({ id: users.id });
    await connection.db.insert(routes).values([
      { path: "/owned-source/", entityType: "static_page" },
      { path: "/owned-destination/", entityType: "static_page" },
    ]);
    await expect(
      createRedirect(connection.db, {
        sourcePath: "/owned-source/",
        destinationPath: "/owned-destination/",
        reason: "Synthetic conflict",
        actor: { userId: actorRows[0]!.id, role: "admin" },
      }),
    ).rejects.toBeInstanceOf(RedirectConflictError);
    const createdAudits = await connection.db
      .select({ value: count() })
      .from(auditLogs)
      .where(eq(auditLogs.action, "redirect.created"));
    expect(Number(createdAudits[0]?.value)).toBe(0);
    await connection.close();
  });
});
