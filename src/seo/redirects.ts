import { and, eq, isNull, or } from "drizzle-orm";
import type { PgQueryResultHKT } from "drizzle-orm/pg-core/session";

import {
  runGovernedMutation,
  type GovernedMutationOptions,
} from "@/audit/governed-mutation";
import { requirePermission, type UserRole } from "@/auth/permissions";
import { redirects, routes, seoMetadata } from "@/db/schema";
import type { AppDatabase } from "@/db/types";

import { normalizePath } from "./path";

export class RedirectConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RedirectConflictError";
  }
}

export interface ExistingRedirect {
  sourcePath: string;
  destinationPath: string;
}

export function validateRedirectGraph(
  existing: readonly ExistingRedirect[],
  sourcePath: string,
  destinationPath: string,
): void {
  const source = normalizePath(sourcePath);
  const destination = normalizePath(destinationPath);
  if (source === destination) throw new RedirectConflictError("Redirect loop detected.");
  if (existing.some((item) => normalizePath(item.sourcePath) === source)) {
    throw new RedirectConflictError("Redirect source already exists.");
  }
  if (existing.some((item) => normalizePath(item.sourcePath) === destination)) {
    throw new RedirectConflictError("Redirect destination would create a chain.");
  }
  if (existing.some((item) => normalizePath(item.destinationPath) === source)) {
    throw new RedirectConflictError("Redirect source would extend an existing chain.");
  }
}

export async function createRedirect<TQueryResult extends PgQueryResultHKT>(
  db: AppDatabase<TQueryResult>,
  input: {
    sourcePath: string;
    destinationPath: string;
    reason: string;
    actor: { userId: string; role: UserRole };
  },
  options: GovernedMutationOptions = {},
): Promise<string> {
  const sourcePath = normalizePath(input.sourcePath);
  const destinationPath = normalizePath(input.destinationPath);
  requirePermission(input.actor.role, "seo.manage");
  return runGovernedMutation(db, async ({ transaction, audit }) => {
    const [existing, routeConflicts, destinationRoutes] = await Promise.all([
      transaction
        .select({ sourcePath: redirects.sourcePath, destinationPath: redirects.destinationPath })
        .from(redirects)
        .where(eq(redirects.isActive, true)),
      transaction
        .select({ path: routes.path })
        .from(routes)
        .where(and(eq(routes.isCurrent, true), eq(routes.path, sourcePath)))
        .limit(1),
      transaction
        .select({ id: routes.id })
        .from(routes)
        .where(and(eq(routes.isCurrent, true), eq(routes.path, destinationPath)))
        .limit(1),
    ]);
    if (routeConflicts[0]) {
      throw new RedirectConflictError("A current route owns the redirect source.");
    }
    if (!destinationRoutes[0]) {
      throw new RedirectConflictError("Redirect destination must be a current route.");
    }
    validateRedirectGraph(existing, sourcePath, destinationPath);
    const rows = await transaction
      .insert(redirects)
      .values({
        sourcePath,
        destinationPath,
        reason: input.reason,
        createdByUserId: input.actor.userId,
      })
      .returning({ id: redirects.id });
    const redirect = rows[0];
    if (!redirect) throw new Error("Redirect insert did not return an ID.");
    await audit({
      actorUserId: input.actor.userId,
      action: "redirect.created",
      entityType: "redirect",
      entityId: redirect.id,
      afterSummary: { sourcePath, destinationPath },
    });
    return redirect.id;
  }, options);
}

export async function changeEntityRoute<TQueryResult extends PgQueryResultHKT>(
  db: AppDatabase<TQueryResult>,
  input: {
    entityType: typeof routes.$inferSelect.entityType;
    entityId: string;
    locale: string;
    newPath: string;
    actor: { userId: string; role: UserRole };
    reason: string;
  },
  options: GovernedMutationOptions = {},
): Promise<void> {
  const newPath = normalizePath(input.newPath);
  requirePermission(input.actor.role, "seo.manage");
  await runGovernedMutation(db, async ({ transaction, audit }) => {
    const currentRows = await transaction
      .select()
      .from(routes)
      .where(
        and(
          eq(routes.entityType, input.entityType),
          eq(routes.entityId, input.entityId),
          eq(routes.locale, input.locale),
          eq(routes.isCurrent, true),
        ),
      )
      .limit(1);
    const current = currentRows[0];
    if (!current) throw new Error("Current route was not found.");
    const oldPath = current.path;
    if (oldPath === newPath) return;

    const [routeConflicts, redirectConflicts] = await Promise.all([
      transaction.select({ id: routes.id }).from(routes).where(eq(routes.path, newPath)).limit(1),
      transaction
        .select({ id: redirects.id })
        .from(redirects)
        .where(eq(redirects.sourcePath, newPath))
        .limit(1),
    ]);
    if (routeConflicts[0] || redirectConflicts[0]) {
      throw new RedirectConflictError("The new path is already owned.");
    }

    await transaction
      .update(routes)
      .set({ path: newPath, updatedAt: new Date() })
      .where(eq(routes.id, current.id));
    await transaction
      .update(seoMetadata)
      .set({ canonicalPath: newPath, updatedAt: new Date() })
      .where(
        and(
          eq(seoMetadata.routeId, current.id),
          or(eq(seoMetadata.canonicalPath, oldPath), isNull(seoMetadata.canonicalPath)),
        ),
      );
    await transaction
      .update(redirects)
      .set({ destinationPath: newPath, updatedAt: new Date() })
      .where(and(eq(redirects.destinationPath, oldPath), eq(redirects.isActive, true)));
    await transaction.insert(redirects).values({
      sourcePath: oldPath,
      destinationPath: newPath,
      reason: input.reason,
      createdByUserId: input.actor.userId,
    });

    await audit({
      actorUserId: input.actor.userId,
      action: "route.path.changed",
      entityType: input.entityType,
      entityId: input.entityId,
      beforeSummary: { path: oldPath },
      afterSummary: { path: newPath, redirectCreated: true },
    });
  }, options);
}
