import "server-only";

import { and, eq, sql } from "drizzle-orm";
import type { PostgresJsQueryResultHKT } from "drizzle-orm/postgres-js/session";

import { aiFailure, aiSuccess, type AiServiceResult } from "@/ai/errors";
import { runGovernedMutation, type GovernedMutationOptions } from "@/audit/governed-mutation";
import type { AppDatabase } from "@/db/types";
import { aiRuns, productLocalizations } from "@/db/schema";

export interface ConspicuouslySyntheticAcceptedDraftInputV1 {
  readonly runId: string;
  readonly productId: string;
  readonly actorUserId: string;
  readonly expectedRunStateVersion: number;
  readonly expectedTargetVersion: number;
  readonly candidateHash: string;
  readonly syntheticFullDescription: string;
}

export async function applyConspicuouslySyntheticAcceptedDraftV1(
  database: AppDatabase<PostgresJsQueryResultHKT>,
  input: ConspicuouslySyntheticAcceptedDraftInputV1,
  options: GovernedMutationOptions = {},
): Promise<AiServiceResult<{
  readonly runStateVersion: number;
  readonly targetVersion: number;
}>> {
  if (!input.syntheticFullDescription.startsWith("SYNTHETIC TEST DATA — NOT A CWT FACT")) {
    return aiFailure("state_conflict");
  }
  return runGovernedMutation(database, async ({ transaction, audit }) => {
    const targets = await transaction.select().from(productLocalizations).where(and(
      eq(productLocalizations.productId, input.productId),
      eq(productLocalizations.locale, "en"),
    )).limit(1).for("update", { of: productLocalizations });
    const target = targets[0];
    if (target === undefined || target.editorDocumentVersion !== input.expectedTargetVersion) {
      return aiFailure("state_conflict");
    }
    const runs = await transaction.select().from(aiRuns).where(eq(aiRuns.id, input.runId))
      .limit(1).for("update", { of: aiRuns });
    const run = runs[0];
    if (run === undefined || run.status !== "draft_ready" || run.targetType !== "product_draft" ||
      run.targetProductId !== input.productId || run.targetLocale !== "en" ||
      run.expectedTargetVersion !== input.expectedTargetVersion ||
      run.stateVersion !== input.expectedRunStateVersion || run.candidateHash !== input.candidateHash ||
      run.humanDisposition !== "not_evaluated") return aiFailure("state_conflict");
    const targetVersion = target.editorDocumentVersion + 1;
    const updatedTarget = await transaction.update(productLocalizations).set({
      fullDescription: input.syntheticFullDescription,
      editorDocumentVersion: targetVersion,
    }).where(and(
      eq(productLocalizations.productId, input.productId),
      eq(productLocalizations.locale, "en"),
      eq(productLocalizations.editorDocumentVersion, input.expectedTargetVersion),
    )).returning({ version: productLocalizations.editorDocumentVersion });
    if (updatedTarget[0]?.version !== targetVersion) return aiFailure("state_conflict");
    const updatedRun = await transaction.update(aiRuns).set({
      humanDisposition: "accepted",
      evaluatedByUserId: input.actorUserId,
      evaluatedAt: sql`statement_timestamp()`,
      appliedTargetVersion: targetVersion,
      stateVersion: run.stateVersion + 1,
      updatedAt: sql`statement_timestamp()`,
    }).where(and(eq(aiRuns.id, run.id), eq(aiRuns.stateVersion, run.stateVersion))).returning({
      stateVersion: aiRuns.stateVersion,
    });
    const runStateVersion = updatedRun[0]?.stateVersion;
    if (runStateVersion === undefined) return aiFailure("state_conflict");
    await audit({
      actorUserId: input.actorUserId,
      action: "ai.run.candidate_applied",
      entityType: "ai_run",
      entityId: run.id,
      beforeSummary: {
        runStateVersion: run.stateVersion,
        targetVersion: target.editorDocumentVersion,
      },
      afterSummary: {
        runId: run.id,
        targetType: run.targetType,
        targetId: input.productId,
        candidateHash: input.candidateHash,
        disposition: "accepted",
        runStateVersion,
        targetVersion,
      },
    });
    return aiSuccess({ runStateVersion, targetVersion });
  }, options);
}
