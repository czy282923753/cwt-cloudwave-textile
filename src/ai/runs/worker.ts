import "server-only";

import { randomUUID } from "node:crypto";
import type { PostgresJsQueryResultHKT } from "drizzle-orm/postgres-js/session";

import { createPhaseCClaimedApplicationRegistryV1 } from "@/ai/applications/draft-assistance/composition";
import type { TrustedPhaseBEnvironmentV1 } from "@/ai/config/trusted-phase-b-environment";
import { createAiClaimedExecutionServiceV2 } from "@/ai/core/orchestrator";
import { aiFailure } from "@/ai/errors";
import { constructPreDispatchClaimedRunV2 } from "@/ai/internal/claimed-run-authority";
import type { PromptBundleLoaderV1 } from "@/ai/prompts/loader";
import type { TextProviderRegistryV1 } from "@/ai/providers/registry";
import type { AppDatabase } from "@/db/types";
import type {
  AiRunWorkerV1,
  ClaimedLeaseHandleV1,
  DispatchAuthorizationOutcomeV1,
  HeartbeatOutcomeV1,
  SettlementOutcomeV1,
  WorkerClaimResultV1,
} from "./contracts";
import type { PricingPolicyRegistryV1, PricingSnapshotV1 } from "./pricing-policy";
import { createAiRunRepositoryV1, type AiRunRepositoryV1 } from "./repository";
import {
  AI_GRACEFUL_SHUTDOWN_MS_V1,
  AI_HEARTBEAT_INTERVAL_SECONDS_V1,
  AI_HEARTBEAT_LOCK_ATTEMPTS_V1,
  AI_HEARTBEAT_LOCK_RETRY_DELAY_MS_V1,
  AI_IDLE_POLL_MS_V1,
  AI_POST_ABORT_PERSISTENCE_GRACE_MS_V1,
  AI_TEXT_CONCURRENCY_LIMIT_V1,
  heartbeatLockRetryDecisionV1,
} from "./retry-policy";

type WorkerEnvironment = "local" | "test" | "staging";

export interface AiRunWorkerTimingV1 {
  readonly heartbeatIntervalMs: number;
  readonly lockRetryDelayMs: number;
  readonly idlePollMs: number;
  readonly gracefulShutdownMs: number;
  readonly postAbortPersistenceMs: number;
}

const productionTiming: AiRunWorkerTimingV1 = Object.freeze({
  heartbeatIntervalMs: AI_HEARTBEAT_INTERVAL_SECONDS_V1 * 1_000,
  lockRetryDelayMs: AI_HEARTBEAT_LOCK_RETRY_DELAY_MS_V1,
  idlePollMs: AI_IDLE_POLL_MS_V1,
  gracefulShutdownMs: AI_GRACEFUL_SHUTDOWN_MS_V1,
  postAbortPersistenceMs: AI_POST_ABORT_PERSISTENCE_GRACE_MS_V1,
});

function wait(milliseconds: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    if (signal?.aborted === true) {
      resolve();
      return;
    }
    const timeout = setTimeout(resolve, milliseconds);
    signal?.addEventListener("abort", () => {
      clearTimeout(timeout);
      resolve();
    }, { once: true });
  });
}

function samePricing(left: PricingSnapshotV1, right: PricingSnapshotV1): boolean {
  return left.version === right.version && left.currency === right.currency &&
    left.billing_unit_tokens === right.billing_unit_tokens &&
    left.input_microusd_per_unit === right.input_microusd_per_unit &&
    left.output_microusd_per_unit === right.output_microusd_per_unit &&
    left.formula === right.formula && left.source_id === right.source_id &&
    left.source_version === right.source_version && left.effective_from === right.effective_from;
}

async function boundedLifecycleOutcome<T extends {
  readonly kind: string;
  readonly observedAt?: Date;
  readonly currentLeaseExpiresAt?: Date | null;
}>(
  operation: () => Promise<T>,
  leaseExpiresAt: () => Date,
  timing: AiRunWorkerTimingV1,
): Promise<T | null> {
  for (let attempt = 1; attempt <= AI_HEARTBEAT_LOCK_ATTEMPTS_V1; attempt += 1) {
    const outcome = await operation();
    if (outcome.kind !== "lock_busy") return outcome;
    const observedAt = outcome.observedAt;
    if (observedAt === undefined || heartbeatLockRetryDecisionV1({
      completedAttempts: attempt,
      observedAt,
      currentLeaseExpiresAt: outcome.currentLeaseExpiresAt ?? leaseExpiresAt(),
    }) === "abort") return null;
    await wait(timing.lockRetryDelayMs);
  }
  return null;
}

async function processClaimedRun(input: {
  readonly repository: AiRunRepositoryV1;
  readonly claim: Extract<WorkerClaimResultV1, { readonly kind: "claimed" }>;
  readonly executionEnvironment: WorkerEnvironment;
  readonly providerRegistry: TextProviderRegistryV1;
  readonly promptLoader: PromptBundleLoaderV1;
  readonly pricingRegistry: PricingPolicyRegistryV1;
  readonly timing: AiRunWorkerTimingV1;
  readonly processAbort: AbortSignal;
  readonly registerController: (controller: AbortController) => void;
  readonly unregisterController: (controller: AbortController) => void;
}): Promise<void> {
  const claimedResult = constructPreDispatchClaimedRunV2({
    row: input.claim.row,
    applicationRegistry: createPhaseCClaimedApplicationRegistryV1(),
  });
  if (!claimedResult.ok) throw new Error(`Claimed run reconstruction failed: ${claimedResult.error.code}`);
  const claimed = claimedResult.value;
  let lease: ClaimedLeaseHandleV1 = {
    runId: claimed.runId,
    executionEnvironment: input.executionEnvironment,
    leaseOwner: claimed.leaseOwner,
    leaseToken: claimed.leaseToken,
    leaseExpiresAt: claimed.leaseExpiresAt,
    stateVersion: claimed.stateVersion,
  };
  const providerAbort = new AbortController();
  input.registerController(providerAbort);
  const processAbortHandler = () => providerAbort.abort(input.processAbort.reason);
  input.processAbort.addEventListener("abort", processAbortHandler, { once: true });
  const heartbeatStop = new AbortController();
  let lifecycle = Promise.resolve();
  let authorityLost = false;
  const serialized = async <T>(operation: () => Promise<T>): Promise<T> => {
    let release: () => void = () => undefined;
    const prior = lifecycle;
    lifecycle = new Promise<void>((resolve) => { release = resolve; });
    await prior;
    try {
      return await operation();
    } finally {
      release();
    }
  };
  const heartbeatLoop = (async () => {
    while (!heartbeatStop.signal.aborted && !providerAbort.signal.aborted) {
      await wait(input.timing.heartbeatIntervalMs, heartbeatStop.signal);
      if (heartbeatStop.signal.aborted || providerAbort.signal.aborted) return;
      const outcome = await serialized(() => boundedLifecycleOutcome<HeartbeatOutcomeV1>(
        () => input.repository.heartbeat(lease),
        () => lease.leaseExpiresAt,
        input.timing,
      ));
      if (outcome?.kind !== "renewed") {
        authorityLost = true;
        providerAbort.abort("lease_renewal_unavailable");
        return;
      }
      lease = { ...lease, leaseExpiresAt: outcome.leaseExpiresAt, stateVersion: outcome.stateVersion };
    }
  })();
  const execution = createAiClaimedExecutionServiceV2({
    providerRegistry: input.providerRegistry,
    promptLoader: input.promptLoader,
    now: () => new Date(),
  });
  try {
    const result = await execution.executePreDispatchTextAttempt({
      claimed,
      signal: providerAbort.signal,
      authorizeProviderDispatch: () => serialized(async () => {
        const persisted = await input.repository.readPricingForWorker(claimed.runId);
        const current = persisted === null ? aiFailure("pricing_stale") : input.pricingRegistry.resolve({
          provider: persisted.provider,
          model: persisted.model,
          at: new Date(),
        });
        const pricingCurrent = persisted !== null && current.ok && samePricing(persisted.snapshot, current.value);
        const outcome = await boundedLifecycleOutcome<DispatchAuthorizationOutcomeV1>(
          () => input.repository.authorizeProviderDispatch({ ...lease, pricingCurrent }),
          () => lease.leaseExpiresAt,
          input.timing,
        );
        if (outcome?.kind === "authorized") {
          lease = { ...lease, leaseExpiresAt: outcome.leaseExpiresAt, stateVersion: outcome.stateVersion };
          return outcome;
        }
        if (outcome === null) {
          authorityLost = true;
          providerAbort.abort("lease_renewal_unavailable");
          return { kind: "lease_lost_or_unsafe", observedAt: new Date() };
        }
        return outcome;
      }),
    });
    heartbeatStop.abort();
    await heartbeatLoop;
    if (authorityLost || result.kind === "dispatch_unavailable") return;
    const settlement = await serialized(() => boundedLifecycleOutcome<SettlementOutcomeV1>(
      () => input.repository.settle({ ...lease, evidence: result.evidence }),
      () => lease.leaseExpiresAt,
      input.timing,
    ));
    if (settlement?.kind === "cancelled_fence" && result.evidence.dispatchState === "dispatched") {
      const fence = await input.repository.readCancelledFenceForWorker({
        runId: claimed.runId,
        cancelledLeaseToken: claimed.leaseToken,
      });
      if (fence !== null) {
        await input.repository.recordCancelledLateAccounting({
          runId: claimed.runId,
          executionEnvironment: input.executionEnvironment,
          cancelledLeaseToken: claimed.leaseToken,
          expectedStateVersion: fence.stateVersion,
          evidence: result.evidence,
        });
      }
    }
  } finally {
    heartbeatStop.abort();
    await heartbeatLoop;
    input.processAbort.removeEventListener("abort", processAbortHandler);
    input.unregisterController(providerAbort);
  }
}

export function createAiRunWorkerV1(dependencies: {
  readonly database: AppDatabase<PostgresJsQueryResultHKT>;
  readonly trustedEnvironment: TrustedPhaseBEnvironmentV1;
  readonly providerRegistry: TextProviderRegistryV1;
  readonly promptLoader: PromptBundleLoaderV1;
  readonly pricingRegistry: PricingPolicyRegistryV1;
  readonly timing?: AiRunWorkerTimingV1;
  readonly workerId?: string;
}): AiRunWorkerV1 {
  if (dependencies.trustedEnvironment.appEnvironment === "production") {
    throw new Error("Production cannot run the Phase C AI Worker.");
  }
  const executionEnvironment = dependencies.trustedEnvironment.appEnvironment;
  const timing = dependencies.timing ?? productionTiming;
  const repository = createAiRunRepositoryV1(dependencies.database);
  const workerId = dependencies.workerId ?? `cwt-ai-worker-${randomUUID()}`;
  const processAbort = new AbortController();
  const activeControllers = new Set<AbortController>();
  let acceptingClaims = false;
  let loops: readonly Promise<void>[] = [];
  const slotLoop = async (slot: number) => {
    while (acceptingClaims && !processAbort.signal.aborted) {
      const claim = await repository.claimOrRecover({
        executionEnvironment,
        workerId: `${workerId}:slot-${slot}`,
      });
      if (claim.kind === "claimed") {
        await processClaimedRun({
          repository,
          claim,
          executionEnvironment,
          providerRegistry: dependencies.providerRegistry,
          promptLoader: dependencies.promptLoader,
          pricingRegistry: dependencies.pricingRegistry,
          timing,
          processAbort: processAbort.signal,
          registerController: (controller) => activeControllers.add(controller),
          unregisterController: (controller) => activeControllers.delete(controller),
        });
        continue;
      }
      if (claim.kind === "recovered") continue;
      await wait(timing.idlePollMs, processAbort.signal);
    }
  };
  return {
    workerId,
    get running() { return acceptingClaims || activeControllers.size > 0; },
    async start() {
      if (acceptingClaims) return;
      acceptingClaims = true;
      loops = Array.from({ length: AI_TEXT_CONCURRENCY_LIMIT_V1 }, (_, slot) => slotLoop(slot));
    },
    async stop() {
      acceptingClaims = false;
      const drained = await Promise.race([
        Promise.all(loops).then(() => true),
        wait(timing.gracefulShutdownMs).then(() => false),
      ]);
      if (!drained) {
        for (const controller of activeControllers) controller.abort("worker_shutdown");
        processAbort.abort("worker_shutdown");
        await Promise.race([
          Promise.all(loops),
          wait(timing.postAbortPersistenceMs),
        ]);
      } else {
        processAbort.abort("worker_stopped");
      }
      loops = [];
    },
  };
}
