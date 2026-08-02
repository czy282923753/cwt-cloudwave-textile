import { and, eq, isNull, or, sql } from "drizzle-orm";
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

class RedirectGraphLockSetChangedError extends Error {
  constructor() {
    super("The redirect graph changed while its mutation locks were being acquired.");
    this.name = "RedirectGraphLockSetChangedError";
  }
}

const REDIRECT_GRAPH_LOCK_PREFIX = "cwt:redirect-graph:";
const REDIRECT_GRAPH_MAX_ATTEMPTS = 3;

function normalizedGraphPaths(paths: readonly string[]): string[] {
  return [...new Set(paths.map(normalizePath))].sort();
}

async function acquireRedirectGraphLocks<TQueryResult extends PgQueryResultHKT>(
  db: AppDatabase<TQueryResult>,
  paths: readonly string[],
): Promise<ReadonlySet<string>> {
  const normalizedPaths = normalizedGraphPaths(paths);
  for (const path of normalizedPaths) {
    await db.execute(
      sql`select pg_advisory_xact_lock(hashtext(${`${REDIRECT_GRAPH_LOCK_PREFIX}${path}`}))`,
    );
  }
  return new Set(normalizedPaths);
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
    await acquireRedirectGraphLocks(transaction, [sourcePath, destinationPath]);
    const [existing, sourceRedirects, routeConflicts, destinationRoutes] = await Promise.all([
      transaction
        .select({ sourcePath: redirects.sourcePath, destinationPath: redirects.destinationPath })
        .from(redirects)
        .where(eq(redirects.isActive, true)),
      transaction
        .select({ id: redirects.id })
        .from(redirects)
        .where(eq(redirects.sourcePath, sourcePath))
        .limit(1),
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
    if (sourceRedirects[0]) {
      throw new RedirectConflictError("Redirect source already exists.");
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
  for (let attempt = 1; attempt <= REDIRECT_GRAPH_MAX_ATTEMPTS; attempt += 1) {
    try {
      await runGovernedMutation(db, async ({ transaction, audit }) => {
        const initialRows = await transaction
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
        const initial = initialRows[0];
        if (!initial) throw new Error("Current route was not found.");
        if (initial.path === newPath) return;

        const initialInbound = await transaction
          .select({ sourcePath: redirects.sourcePath })
          .from(redirects)
          .where(
            and(
              eq(redirects.destinationPath, initial.path),
              eq(redirects.isActive, true),
            ),
          );
        const lockedPaths = await acquireRedirectGraphLocks(transaction, [
          initial.path,
          newPath,
          ...initialInbound.map((redirect) => redirect.sourcePath),
        ]);

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
        if (current.path === newPath) return;

        const inbound = await transaction
          .select({ sourcePath: redirects.sourcePath })
          .from(redirects)
          .where(
            and(
              eq(redirects.destinationPath, current.path),
              eq(redirects.isActive, true),
            ),
          );
        const authoritativePaths = normalizedGraphPaths([
          current.path,
          newPath,
          ...inbound.map((redirect) => redirect.sourcePath),
        ]);
        if (authoritativePaths.some((path) => !lockedPaths.has(path))) {
          throw new RedirectGraphLockSetChangedError();
        }

        const [routeConflicts, redirectConflicts, activeRedirects] = await Promise.all([
          transaction
            .select({ id: routes.id })
            .from(routes)
            .where(eq(routes.path, newPath))
            .limit(1),
          transaction
            .select({ id: redirects.id })
            .from(redirects)
            .where(eq(redirects.sourcePath, newPath))
            .limit(1),
          transaction
            .select({
              sourcePath: redirects.sourcePath,
              destinationPath: redirects.destinationPath,
            })
            .from(redirects)
            .where(eq(redirects.isActive, true)),
        ]);
        if (routeConflicts[0] || redirectConflicts[0]) {
          throw new RedirectConflictError("The new path is already owned.");
        }

        const oldPath = current.path;
        const flattenedRedirects = activeRedirects.map((redirect) => ({
          sourcePath: redirect.sourcePath,
          destinationPath:
            normalizePath(redirect.destinationPath) === oldPath
              ? newPath
              : redirect.destinationPath,
        }));
        validateRedirectGraph(flattenedRedirects, oldPath, newPath);

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
      return;
    } catch (error) {
      if (
        !(error instanceof RedirectGraphLockSetChangedError) ||
        attempt === REDIRECT_GRAPH_MAX_ATTEMPTS
      ) {
        if (error instanceof RedirectGraphLockSetChangedError) {
          throw new RedirectConflictError(
            "The route graph changed concurrently. Refresh and try again.",
          );
        }
        throw error;
      }
    }
  }
}
