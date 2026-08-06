import { count, eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import { redirects, routes } from "@/db/schema";
import { createTestDatabase } from "@/test/database";

import {
  registerSystemPublicRoutes,
  SYSTEM_PUBLIC_ROUTES,
  SystemPublicRouteRegistrationError,
} from "./system-public-routes";

describe("system public Route registration", () => {
  it("registers one stable current Route ID per approved fixed page and is repeatable", async () => {
    const connection = await createTestDatabase();
    const first = await registerSystemPublicRoutes(connection.db);
    const second = await registerSystemPublicRoutes(connection.db);
    expect([...second]).toEqual([...first]);
    expect(first.size).toBe(SYSTEM_PUBLIC_ROUTES.length);
    const rows = await connection.db.select({ value: count() }).from(routes).where(
      eq(routes.isCurrent, true),
    );
    expect(Number(rows[0]?.value)).toBe(SYSTEM_PUBLIC_ROUTES.length);
    await connection.close();
  });

  it("fails closed when an approved path belongs to a conflicting Route authority", async () => {
    const connection = await createTestDatabase();
    await connection.db.insert(routes).values({
      path: "/get-quote/",
      entityType: "content",
      entityId: crypto.randomUUID(),
    });
    await expect(registerSystemPublicRoutes(connection.db))
      .rejects.toBeInstanceOf(SystemPublicRouteRegistrationError);
    const rows = await connection.db.select({ value: count() }).from(routes);
    expect(Number(rows[0]?.value)).toBe(1);
    await connection.close();
  });

  it("fails closed without partial registration when an approved path is an active Redirect source", async () => {
    const connection = await createTestDatabase();
    await connection.db.insert(routes).values({
      path: "/test-system-route-destination/",
      entityType: "content",
      entityId: crypto.randomUUID(),
    });
    await connection.db.insert(redirects).values({
      sourcePath: "/about/",
      destinationPath: "/test-system-route-destination/",
      reason: "TEST conflicting fixed-page Redirect",
    });
    await expect(registerSystemPublicRoutes(connection.db))
      .rejects.toBeInstanceOf(SystemPublicRouteRegistrationError);
    const rows = await connection.db.select({ value: count() }).from(routes);
    expect(Number(rows[0]?.value)).toBe(1);
    await connection.close();
  });
});
