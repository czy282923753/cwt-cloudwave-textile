import "server-only";

import { sql } from "drizzle-orm";
import sharp from "sharp";

import { env } from "@/config/env";
import { databaseConnection } from "@/db/client";
import { sharedRateLimiter } from "@/security/rate-limiter-factory";
import { probeConfiguredStorage } from "@/storage/readiness";

import { assertReadinessConfiguration, checkReadiness, type ReadinessResult } from "./health";

export function runApplicationReadiness(): Promise<ReadinessResult> {
  return checkReadiness({
    async configuration() {
      assertReadinessConfiguration(env);
    },
    async storage() {
      await probeConfiguredStorage({
        environment: env,
        minimumFreeBytes: 1,
        ...((env.APP_ENV === "production" || env.APP_ENV === "staging") ? { expectedUid: 10_001 } : {}),
      });
    },
    async database() {
      if (databaseConnection.kind === "pglite") {
        await databaseConnection.db.execute(sql`select 1 as ready`);
      } else {
        await databaseConnection.db.execute(sql`select 1 as ready`);
      }
    },
    async valkey() {
      const outcome = await sharedRateLimiter.readiness();
      if (outcome.kind !== "allowed") throw new Error("Valkey readiness refused.");
    },
    async localDependencies() {
      if (process.versions.node !== "24.14.0") throw new Error("Node runtime is not ready.");
      if (!sharp.versions.vips) throw new Error("Image runtime is not ready.");
    },
  });
}
