import { randomUUID } from "node:crypto";

import { eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres, { type Sql } from "postgres";
import { afterAll, beforeAll, beforeEach, describe, expect, it, onTestFinished, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { createPhaseCDurableDraftAssistanceServiceV1 } from "@/ai/applications/draft-assistance/composition";
import type { DraftAssistanceCommandV1 } from "@/ai/applications/draft-assistance/contracts";
import { canonicalJsonHash } from "@/ai/canonical-json";
import { aiSuccess } from "@/ai/errors";
import type { PromptBundleLoaderV1 } from "@/ai/prompts/loader";
import { createTextProviderRegistryV1 } from "@/ai/providers/registry";
import type { TextAiProvider } from "@/ai/providers/text-provider";
import { createFakeTextProviderV1 } from "@/ai/testing/fake-text-provider";
import type { DatabaseConnection, PostgresAppDatabase } from "@/db/client";
import { migrateDatabase } from "@/db/migrate";
import {
  aiModelConfig,
  aiRuns,
  auditLogs,
  featureFlags,
  productLocalizations,
  productTaxonomyTerms,
  products,
  taxonomyTerms,
  users,
} from "@/db/schema";
import * as schema from "@/db/schema";
import { localTestPricingPolicyRegistryV1 } from "./pricing-policy";
import {
  CWT_AI_TEXT_CLAIM_BUDGET_ADVISORY_KEY_V1,
  createAiRunRepositoryV1,
} from "./repository";
import { createAiRunWorkerV1 } from "./worker";

const postgresUrl = process.env.CWT_PHASE_C_POSTGRES_URL;
const hash = (character: string) => character.repeat(64);
const requests: import("@/ai/canonical-json").ReadonlyJsonObject[] = [];
const syntheticOutput = {
  schemaVersion: 1,
  useCase: "product_description_draft",
  locale: "en",
  summaryProposal: { text: "Synthetic Worker candidate.", sourceRefs: ["src_01:text"] },
  descriptionBlocks: [],
  featureProposals: [],
  faqProposals: [],
  mediaTextProposals: [],
} as const;
const syntheticCandidate = {
  schemaVersion: 1,
  useCase: "product_description_draft",
  locale: "en",
  payload: syntheticOutput,
  derivedCandidateRefs: [],
  automaticEvidenceStatus: "structural_provenance_checked",
  semanticReviewStatus: "human_review_required",
} as const;
const syntheticCandidateHash = canonicalJsonHash(syntheticCandidate);
if (!syntheticCandidateHash.ok) throw new Error("Synthetic candidate hash failed.");
const provider = createFakeTextProviderV1({
  key: "synthetic_alpha",
  model: "synthetic-text-alpha-v1",
  envelope: { version: 1, hash: hash("e") },
  recorder: { requests },
  result: {
    kind: "success",
    returnedModel: "synthetic-text-alpha-v1",
    completion: { kind: "complete" },
    outputText: JSON.stringify(syntheticOutput),
    usage: { inputTokens: 20, outputTokens: 10, totalTokens: 30 },
    durationMs: 3,
  },
});
const providerRegistryResult = createTextProviderRegistryV1([provider]);
if (!providerRegistryResult.ok) throw new Error("Synthetic Provider registry failed.");
const providerRegistry = providerRegistryResult.value;
const promptLoader: PromptBundleLoaderV1 = {
  load(input) {
    return {
      ok: true,
      value: {
        tuple: { promptId: input.promptId, promptVersion: input.promptVersion, promptHash: input.promptHash },
        applicationClass: input.applicationClass,
        capability: "text",
        useCase: input.useCase,
        locale: "en",
        inputSchemaVersion: input.inputSchemaVersion,
        outputSchemaVersion: input.outputSchemaVersion,
        policyVersion: input.policyVersion,
        variables: [
          { name: "locale", type: "string", maximumUtf8Bytes: 16 },
          { name: "product_context_json", type: "json", maximumUtf8Bytes: 49_152 },
          { name: "media_placement_refs_json", type: "json", maximumUtf8Bytes: 8_192 },
          { name: "requested_tone", type: "enum", values: ["concise_professional_b2b", "neutral_editorial"] },
        ],
        body: "SYNTHETIC TEST DATA — NOT A CWT FACT\n{{locale}}\n{{product_context_json}}\n{{media_placement_refs_json}}\n{{requested_tone}}",
      },
    };
  },
};

function deferred(): {
  readonly promise: Promise<void>;
  readonly resolve: () => void;
} {
  let resolve!: () => void;
  const promise = new Promise<void>((accept) => { resolve = accept; });
  return { promise, resolve };
}

let client: Sql | undefined;
let database: PostgresAppDatabase | undefined;
function db(): PostgresAppDatabase {
  if (database === undefined) throw new Error("Real PostgreSQL fixture was not initialized.");
  return database;
}

async function seed() {
  const [actor] = await db().insert(users).values({
    email: `${randomUUID()}@worker.example.test`,
    displayName: "Synthetic Worker Actor",
    role: "product_editor",
    passwordHash: "test-only",
  }).returning({ id: users.id });
  if (actor === undefined) throw new Error("Synthetic actor failed.");
  const productId = await db().transaction(async (transaction) => {
    const [taxonomy] = await transaction.insert(taxonomyTerms).values({
      internalKey: `synthetic-worker-${randomUUID()}`,
      dimension: "material_fiber",
    }).returning({ id: taxonomyTerms.id });
    const [product] = await transaction.insert(products).values({
      status: "draft",
      createdByUserId: actor.id,
    }).returning({ id: products.id });
    if (taxonomy === undefined || product === undefined) throw new Error("Synthetic product failed.");
    await transaction.insert(productLocalizations).values({
      productId: product.id,
      locale: "en",
      name: "Synthetic Worker Product",
      editorDocumentVersion: 1,
    });
    await transaction.insert(productTaxonomyTerms).values({
      productId: product.id,
      taxonomyTermId: taxonomy.id,
      isPrimary: true,
    });
    return product.id;
  });
  await db().insert(featureFlags).values({ key: "ai", enabled: true });
  await db().insert(aiModelConfig).values({
    useCase: "product_description_draft",
    provider: "synthetic_alpha",
    model: "synthetic-text-alpha-v1",
    parametersJson: { temperature: 0 },
    maxInputTokens: 1_000,
    maxOutputTokens: 200,
    maxAttempts: 3,
    runCostLimitMicrousd: 20_000,
    promptId: "product-description-draft",
    promptVersion: 1,
    promptHash: hash("a"),
    enabled: true,
    isDefault: true,
    createdByUserId: actor.id,
    updatedByUserId: actor.id,
  });
  return { actorId: actor.id, productId };
}

function command(fixture: Awaited<ReturnType<typeof seed>>, idempotencyKey: string): DraftAssistanceCommandV1 {
  return {
    useCase: "product_description_draft",
    task: {
      kind: "product_description_draft",
      tone: "concise_professional_b2b",
      selectedMediaPlacementIds: [],
    },
    actor: { userId: fixture.actorId, role: "product_editor" },
    target: { type: "product_draft", productId: fixture.productId, locale: "en", expectedVersion: 1 },
    idempotencyKey,
    contextSelections: [{ sourceClass: "explicit_human_input", origin: "typed_brief" }],
    explicitInput: "SYNTHETIC TEST DATA — NOT A CWT FACT; Worker lifecycle proof.",
  };
}

async function waitFor(predicate: () => Promise<boolean>) {
  for (let count = 0; count < 800; count += 1) {
    if (await predicate()) return;
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  throw new Error("Synthetic Worker condition did not become true.");
}

describe.skipIf(postgresUrl === undefined)("Phase C direct two-slot Worker", () => {
  beforeAll(async () => {
    if (postgresUrl === undefined) return;
    client = postgres(postgresUrl, { max: 12, prepare: false, onnotice: () => undefined });
    database = drizzle(client, { schema });
    const connection: DatabaseConnection = {
      kind: "postgres",
      db: database,
      createMigrationClient: () => postgres(postgresUrl, { max: 1, prepare: false }),
      close: async () => undefined,
    };
    await migrateDatabase(connection);
  });
  beforeEach(async () => {
    requests.length = 0;
    await db().execute(sql`truncate table ${aiRuns}, ${aiModelConfig}, ${auditLogs}, ${featureFlags}, ${productLocalizations}, ${products}, ${users} cascade`);
  });
  afterAll(async () => client?.end());

  it("processes three durable rows through only two local slots and one call per row", async () => {
    const fixture = await seed();
    const service = createPhaseCDurableDraftAssistanceServiceV1({
      database: db(),
      trustedEnvironment: { appEnvironment: "test", processFeatureAiEnabled: true },
      providerRegistry,
      promptLoader,
      pricingRegistry: localTestPricingPolicyRegistryV1,
    });
    for (let index = 0; index < 3; index += 1) {
      const result = await service.requestDraftAssistance(command(fixture, randomUUID()));
      expect(result.ok).toBe(true);
    }
    const releaseProvider = deferred();
    let activeProviderCalls = 0;
    let maximumProviderCalls = 0;
    const deferredProvider: TextAiProvider = {
      ...provider,
      prepareTextDispatch(input) {
        const prepared = provider.prepareTextDispatch(input);
        if (!prepared.ok) return prepared;
        return aiSuccess({
          ...prepared.value,
          async execute(executeInput) {
            activeProviderCalls += 1;
            maximumProviderCalls = Math.max(maximumProviderCalls, activeProviderCalls);
            await releaseProvider.promise;
            try {
              return await prepared.value.execute(executeInput);
            } finally {
              activeProviderCalls -= 1;
            }
          },
        });
      },
    };
    const deferredRegistryResult = createTextProviderRegistryV1([deferredProvider]);
    if (!deferredRegistryResult.ok) throw new Error("Deferred Provider registry failed.");
    const memoryBefore = process.memoryUsage().rss;
    const cpuBefore = process.cpuUsage();
    const worker = createAiRunWorkerV1({
      database: db(),
      trustedEnvironment: { appEnvironment: "test", processFeatureAiEnabled: true },
      providerRegistry: deferredRegistryResult.value,
      promptLoader,
      pricingRegistry: localTestPricingPolicyRegistryV1,
      timing: {
        heartbeatIntervalMs: 15_000,
        lockRetryDelayMs: 1_000,
        idlePollMs: 50,
        gracefulShutdownMs: 1_000,
        postAbortPersistenceMs: 200,
      },
      workerId: "synthetic-worker-integration",
    });
    await worker.start();
    await waitFor(async () => activeProviderCalls === 2);
    const whileBlocked = await db().select().from(aiRuns);
    expect(whileBlocked.filter((row) => row.status === "processing")).toHaveLength(2);
    expect(whileBlocked.filter((row) => row.status === "pending")).toHaveLength(1);
    expect(requests).toHaveLength(0);
    releaseProvider.resolve();
    await waitFor(async () => {
      const rows = await db().select().from(aiRuns);
      return rows.length === 3 && rows.every((row) => row.status === "draft_ready");
    });
    await worker.stop("SIGTERM");
    const rows = await db().select().from(aiRuns);
    expect(rows).toHaveLength(3);
    expect(rows.every((row) => row.status === "draft_ready" && row.attemptCount === 1)).toBe(true);
    expect(requests).toHaveLength(3);
    expect(maximumProviderCalls).toBe(2);
    expect(activeProviderCalls).toBe(0);
    const cpuUsed = process.cpuUsage(cpuBefore);
    expect(cpuUsed.user + cpuUsed.system).toBeLessThan(30_000_000);
    expect(process.memoryUsage().rss - memoryBefore).toBeLessThan(512 * 1024 * 1024);
    expect(new Set(rows.map((row) => row.leaseToken))).toEqual(new Set([null]));
    const active = await db().select().from(aiRuns).where(eq(aiRuns.status, "processing"));
    expect(active).toHaveLength(0);
  }, 20_000);

  it("keeps bounded stop separate from the exact claimed-generation join", async () => {
    const providerEntered = deferred();
    const releaseProvider = deferred();
    const controlledProvider: TextAiProvider = {
      ...provider,
      prepareTextDispatch(input) {
        const prepared = provider.prepareTextDispatch(input);
        if (!prepared.ok) return prepared;
        return aiSuccess({
          ...prepared.value,
          async execute() {
            providerEntered.resolve();
            await releaseProvider.promise;
            throw new Error("Controlled Provider rejection after release.");
          },
        });
      },
    };
    const controlledRegistry = createTextProviderRegistryV1([controlledProvider]);
    if (!controlledRegistry.ok) throw new Error("Controlled Provider registry failed.");
    const worker = createAiRunWorkerV1({
      database: db(),
      trustedEnvironment: { appEnvironment: "test", processFeatureAiEnabled: true },
      providerRegistry: controlledRegistry.value,
      promptLoader,
      pricingRegistry: localTestPricingPolicyRegistryV1,
      timing: {
        heartbeatIntervalMs: 15_000,
        lockRetryDelayMs: 1_000,
        idlePollMs: 10,
        gracefulShutdownMs: 30,
        postAbortPersistenceMs: 20,
      },
      workerId: "synthetic-bounded-stop-join-worker",
      slotCount: 1,
    });
    let cleanupCompletion: Promise<void> | undefined;
    const finishWorker = () => {
      cleanupCompletion ??= (async () => {
        const stopCompletion = worker.stop("SIGTERM");
        releaseProvider.resolve();
        const joinCompletion = worker.join();
        await stopCompletion.then(() => undefined, () => undefined);
        await joinCompletion;
        await stopCompletion;
      })();
      return cleanupCompletion;
    };
    onTestFinished(finishWorker);

    const fixture = await seed();
    const service = createPhaseCDurableDraftAssistanceServiceV1({
      database: db(),
      trustedEnvironment: { appEnvironment: "test", processFeatureAiEnabled: true },
      providerRegistry,
      promptLoader,
      pricingRegistry: localTestPricingPolicyRegistryV1,
    });
    const enqueued = await service.requestDraftAssistance(command(fixture, randomUUID()));
    if (!enqueued.ok) throw new Error(`Synthetic enqueue failed: ${enqueued.error.code}`);
    const beforeStart = worker.join();
    expect(worker.join()).toBe(beforeStart);
    await expect(beforeStart).resolves.toBeUndefined();
    await worker.start();
    const generationCompletion = worker.join();
    expect(worker.join()).toBe(generationCompletion);
    await providerEntered.promise;
    let joined = false;
    void generationCompletion.then(
      () => { joined = true; },
      () => { joined = true; },
    );
    const stopCompletion = worker.stop("SIGTERM");
    expect(worker.join()).toBe(generationCompletion);
    await stopCompletion;
    expect(joined).toBe(false);
    const [beforeRelease] = await db().select().from(aiRuns)
      .where(eq(aiRuns.id, enqueued.value.runId));
    expect(beforeRelease).toMatchObject({
      status: "processing",
      attemptCount: 1,
      candidateJson: null,
      candidateHash: null,
    });
    releaseProvider.resolve();
    await generationCompletion;
    expect(joined).toBe(true);
    expect(worker.join()).toBe(generationCompletion);
    await expect(worker.join()).resolves.toBeUndefined();
    const [final] = await db().select().from(aiRuns)
      .where(eq(aiRuns.id, enqueued.value.runId));
    expect(final).toMatchObject({
      status: "failed",
      retryState: "not_retryable",
      attemptCount: 1,
      failureCode: "adapter_unexpected_failure",
      leaseOwner: null,
      leaseToken: null,
      leaseExpiresAt: null,
    });
    expect(final?.attemptHistoryJson).toHaveLength(1);
  }, 20_000);

  it("aborts on bounded heartbeat contention and recovers the same row after restart", async () => {
    const restartedProviderEntered = deferred();
    const releaseRestartedProvider = deferred();
    let cleanupWorker: ReturnType<typeof createAiRunWorkerV1> | undefined;
    let releaseCleanupProvider: () => void = () => undefined;
    let cleanupCompletion: Promise<void> | undefined;
    const finishWorker = () => {
      cleanupCompletion ??= (async () => {
        const worker = cleanupWorker;
        const stopCompletion = worker?.stop("SIGTERM") ?? Promise.resolve();
        releaseCleanupProvider();
        const joinCompletion = worker?.join() ?? Promise.resolve();
        await stopCompletion.then(() => undefined, () => undefined);
        await joinCompletion;
        await stopCompletion;
      })();
      return cleanupCompletion;
    };
    onTestFinished(finishWorker);

    const fixture = await seed();
    const service = createPhaseCDurableDraftAssistanceServiceV1({
      database: db(),
      trustedEnvironment: { appEnvironment: "test", processFeatureAiEnabled: true },
      providerRegistry,
      promptLoader,
      pricingRegistry: localTestPricingPolicyRegistryV1,
    });
    const enqueued = await service.requestDraftAssistance(command(fixture, randomUUID()));
    if (!enqueued.ok) throw new Error(`Synthetic enqueue failed: ${enqueued.error.code}`);
    const providerEntered = deferred();
    let observedAbortReason: unknown;
    const abortingProvider: TextAiProvider = {
      ...provider,
      prepareTextDispatch(input) {
        const prepared = provider.prepareTextDispatch(input);
        if (!prepared.ok) return prepared;
        return aiSuccess({
          ...prepared.value,
          async execute(executeInput) {
            providerEntered.resolve();
            await new Promise<void>((resolve) => {
              if (executeInput.signal.aborted) {
                resolve();
                return;
              }
              executeInput.signal.addEventListener("abort", () => resolve(), { once: true });
            });
            observedAbortReason = executeInput.signal.reason;
            return {
              kind: "failure",
              responseStatus: "transport_error",
              failureCode: "transport",
              retryClass: "same_provider_transient",
              durationMs: 1,
            };
          },
        });
      },
    };
    const abortingRegistryResult = createTextProviderRegistryV1([abortingProvider]);
    if (!abortingRegistryResult.ok) throw new Error("Aborting Provider registry failed.");
    const telemetryEvents: string[] = [];
    const worker = createAiRunWorkerV1({
      database: db(),
      trustedEnvironment: { appEnvironment: "test", processFeatureAiEnabled: true },
      providerRegistry: abortingRegistryResult.value,
      promptLoader,
      pricingRegistry: localTestPricingPolicyRegistryV1,
      telemetry: { emit: (event) => { telemetryEvents.push(event.eventName); } },
      timing: {
        heartbeatIntervalMs: 10,
        lockRetryDelayMs: 20,
        idlePollMs: 10,
        gracefulShutdownMs: 300,
        postAbortPersistenceMs: 150,
      },
      workerId: "synthetic-contention-worker",
    });
    cleanupWorker = worker;
    await worker.start();
    await providerEntered.promise;
    const lockClient = postgres(postgresUrl!, { max: 1, prepare: false, onnotice: () => undefined });
    const lockHeld = deferred();
    const releaseLock = deferred();
    const advisory = CWT_AI_TEXT_CLAIM_BUDGET_ADVISORY_KEY_V1;
    const lockPromise = lockClient.begin(async (transaction) => {
      await transaction`select pg_advisory_xact_lock(${advisory[0]}, ${advisory[1]})`;
      lockHeld.resolve();
      await releaseLock.promise;
    });
    await lockHeld.promise;
    try {
      await worker.stop("SIGTERM");
      expect(worker.running).toBe(false);
      expect(observedAbortReason).toBe("lease_renewal_unavailable");
      expect(telemetryEvents.filter((event) => event === "ai_heartbeat_lock_busy"))
        .toHaveLength(5);
      expect(telemetryEvents.filter((event) => event === "ai_lease_renewal_unavailable"))
        .toHaveLength(1);
      const [abandoned] = await db().select().from(aiRuns);
      expect(abandoned).toMatchObject({
        status: "processing",
        attemptCount: 1,
        candidateJson: null,
        candidateHash: null,
      });
    } finally {
      releaseLock.resolve();
      await lockPromise;
      await lockClient.end();
    }
    await db().update(aiRuns).set({
      leaseExpiresAt: sql`clock_timestamp() - interval '1 millisecond'`,
    });
    const recovered = await createAiRunRepositoryV1(db()).claimOrRecover({
      executionEnvironment: "test",
      workerId: "synthetic-recovery-owner",
    });
    expect(recovered).toEqual({ kind: "recovered", runId: enqueued.value.runId });
    const [afterRecovery] = await db().select().from(aiRuns)
      .where(eq(aiRuns.id, enqueued.value.runId));
    expect(afterRecovery).toMatchObject({
      status: "pending",
      attemptCount: 1,
      leaseOwner: null,
      leaseToken: null,
      leaseExpiresAt: null,
    });
    expect(afterRecovery?.attemptHistoryJson).toMatchObject([{
      attempt: 1,
      dispatch_state: "dispatched",
      outcome: "retry_scheduled",
      failure_code: "provider_transport_error",
    }]);
    await db().update(aiRuns).set({ nextAttemptAt: sql`clock_timestamp()` });
    const restartedProvider: TextAiProvider = {
      ...provider,
      prepareTextDispatch(input) {
        const prepared = provider.prepareTextDispatch(input);
        if (!prepared.ok) return prepared;
        return aiSuccess({
          ...prepared.value,
          async execute(executeInput) {
            restartedProviderEntered.resolve();
            await releaseRestartedProvider.promise;
            return prepared.value.execute(executeInput);
          },
        });
      },
    };
    const restartedRegistryResult = createTextProviderRegistryV1([restartedProvider]);
    if (!restartedRegistryResult.ok) throw new Error("Restarted Provider registry failed.");
    const restarted = createAiRunWorkerV1({
      database: db(),
      trustedEnvironment: { appEnvironment: "test", processFeatureAiEnabled: true },
      providerRegistry: restartedRegistryResult.value,
      promptLoader,
      pricingRegistry: localTestPricingPolicyRegistryV1,
      timing: {
        heartbeatIntervalMs: 15_000,
        lockRetryDelayMs: 1_000,
        idlePollMs: 10,
        gracefulShutdownMs: 1_000,
        postAbortPersistenceMs: 200,
      },
      workerId: "synthetic-restarted-worker",
    });
    cleanupWorker = restarted;
    releaseCleanupProvider = releaseRestartedProvider.resolve;
    await restarted.start();
    await restartedProviderEntered.promise;
    await finishWorker();
    const [final] = await db().select().from(aiRuns);
    expect(final).toMatchObject({ status: "draft_ready", attemptCount: 2 });
    expect(final?.attemptHistoryJson).toMatchObject([
      { attempt: 1, outcome: "retry_scheduled", failure_code: "provider_transport_error" },
      { attempt: 2, outcome: "draft_ready", failure_code: null },
    ]);
    expect(final?.candidateJson).toEqual(syntheticCandidate);
    expect(final?.candidateHash).toBe(syntheticCandidateHash.value.hash);
    const residualLocks = await db().execute<{ readonly count: number }>(sql`
      select count(*)::integer as count
      from pg_locks
      where locktype = 'advisory'
        and classid = 1129792594
        and objid = 1
    `);
    expect(residualLocks[0]?.count).toBe(0);
  }, 20_000);
});
