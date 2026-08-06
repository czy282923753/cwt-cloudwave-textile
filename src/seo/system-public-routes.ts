import { and, eq, inArray } from "drizzle-orm";
import type { PgQueryResultHKT } from "drizzle-orm/pg-core/session";

import { redirects, routes } from "@/db/schema";
import type { AppDatabase } from "@/db/types";

export const SYSTEM_PUBLIC_ROUTES = [
  { key: "home", label: "Home", path: "/", entityType: "home" },
  { key: "products", label: "Products", path: "/products/", entityType: "static_page" },
  { key: "applications", label: "Applications", path: "/applications/", entityType: "static_page" },
  { key: "fabric-library", label: "Fabric Library", path: "/fabric-library/", entityType: "static_page" },
  { key: "resources", label: "Fabric & Sourcing", path: "/resources/", entityType: "static_page" },
  { key: "fabric-knowledge", label: "Fabric Knowledge", path: "/fabric-knowledge/", entityType: "static_page" },
  { key: "china-textile-guide", label: "China Textile Guide", path: "/china-textile-guide/", entityType: "static_page" },
  { key: "china-sourcing-guide", label: "China Sourcing Guide", path: "/china-sourcing-guide/", entityType: "static_page" },
  { key: "about", label: "About CWT", path: "/about/", entityType: "static_page" },
  { key: "get-quote", label: "Get a Quote", path: "/get-quote/", entityType: "static_page" },
] as const;

export type SystemPublicRoute = (typeof SYSTEM_PUBLIC_ROUTES)[number];

const systemRoutesByPath = new Map<string, SystemPublicRoute>(
  SYSTEM_PUBLIC_ROUTES.map((route) => [route.path, route]),
);

export function systemPublicRoutePathFromHref(href: string): string | null {
  const [path, fragment] = href.split("#", 2);
  if (!path || !systemRoutesByPath.has(path)) return null;
  if (fragment && !(path === "/get-quote/" && fragment === "upload")) return null;
  return path;
}

export function systemPublicRouteDefinition(path: string): SystemPublicRoute | null {
  return systemRoutesByPath.get(path) ?? null;
}

export class SystemPublicRouteRegistrationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SystemPublicRouteRegistrationError";
  }
}

export async function registerSystemPublicRoutes<
  TQueryResult extends PgQueryResultHKT,
>(
  db: AppDatabase<TQueryResult>,
): Promise<ReadonlyMap<string, string>> {
  return db.transaction(async (transaction) => {
    const paths = SYSTEM_PUBLIC_ROUTES.map((route) => route.path);
    const redirectRows = await transaction
      .select({ sourcePath: redirects.sourcePath })
      .from(redirects)
      .where(and(inArray(redirects.sourcePath, paths), eq(redirects.isActive, true)));
    if (redirectRows.length) {
      throw new SystemPublicRouteRegistrationError(
        `System public Route conflicts with active Redirect source ${redirectRows[0]!.sourcePath}.`,
      );
    }
    await transaction.insert(routes).values(SYSTEM_PUBLIC_ROUTES.map((route) => ({
      locale: "en",
      path: route.path,
      entityType: route.entityType,
      entityId: null,
      isCurrent: true,
    }))).onConflictDoNothing({ target: routes.path });
    const rows = await transaction
      .select({
        id: routes.id,
        locale: routes.locale,
        path: routes.path,
        entityType: routes.entityType,
        entityId: routes.entityId,
        isCurrent: routes.isCurrent,
      })
      .from(routes)
      .where(inArray(routes.path, paths));
    const rowsByPath = new Map(rows.map((row) => [row.path, row]));
    for (const expected of SYSTEM_PUBLIC_ROUTES) {
      const actual = rowsByPath.get(expected.path);
      if (
        !actual ||
        actual.locale !== "en" ||
        actual.entityType !== expected.entityType ||
        actual.entityId !== null ||
        !actual.isCurrent
      ) {
        throw new SystemPublicRouteRegistrationError(
          `System public Route ${expected.path} conflicts with existing Route authority.`,
        );
      }
    }
    return new Map(rows.map((route) => [route.path, route.id]));
  });
}
