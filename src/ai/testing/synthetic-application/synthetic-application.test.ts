import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import type {
  AiModelConfigRow,
  CoreCommittedRunSummaryV1,
  PreparedCoreRunV1,
} from "@/ai/core/contracts";
import { createGenericAiOrchestratorV1 } from "@/ai/core/orchestrator";
import { aiFailure, aiSuccess } from "@/ai/errors";
import { createTypedApplicationRegistry } from "@/ai/registry/application-registry";

import type { SyntheticAssociationV1 } from "./association";
import { createSyntheticDefinitionV1 } from "./definition";
import {
  withSyntheticCaseTransactionScope,
  withSyntheticObservationScope,
  type SyntheticCaseOperationsV1,
  type SyntheticObservationInputV1,
} from "./read-scopes";

const hash = "a".repeat(64);
const configId = "44444444-4444-4444-8444-444444444444";
const association: SyntheticAssociationV1 = {
  kind: "synthetic_case_association",
  suiteKey: "extensibility_probe",
  sampleOrdinal: 7,
  epochLabel: "fixture_epoch_01",
};

function observation(input: SyntheticObservationInputV1) {
  return aiSuccess({
    epochLabel: "fixture_epoch_01",
    observation: `SYNTHETIC TEST DATA — NOT A CWT FACT (${input.suiteKey}:${input.sampleOrdinal})`,
  });
}

const configRow: AiModelConfigRow = {
  id: configId,
  capability: "text",
  useCase: "synthetic_extensibility_probe",
  provider: "synthetic_alpha",
  model: "synthetic-text-alpha-v1",
  parametersJson: {},
  maxInputTokens: 1_000,
  maxOutputTokens: 200,
  maxAttempts: 2,
  runCostLimitMicrousd: 1,
  promptId: "synthetic-extensibility-probe",
  promptVersion: 1,
  promptHash: hash,
  enabled: true,
  isDefault: true,
  fallbackConfigId: null,
  recordVersion: 3,
  createdByUserId: "11111111-1111-4111-8111-111111111111",
  updatedByUserId: "11111111-1111-4111-8111-111111111111",
  createdAt: new Date("2026-08-12T00:00:00.000Z"),
  updatedAt: new Date("2026-08-12T00:00:00.000Z"),
};

const preparedRun: PreparedCoreRunV1 = {
  version: 1,
  applicationClass: "synthetic_test_application",
  useCase: "synthetic_extensibility_probe",
  capability: "text",
  requestIdentity: {
    idempotencyKey: "22222222-2222-4222-8222-222222222222",
    fingerprintVersion: 1,
    fingerprint: hash,
    requestedByPrincipalId: "synthetic-principal",
  },
  association: { kind: "synthetic_case.v1", persistenceVersion: 1, value: { synthetic: true } },
  associationSnapshotHash: hash,
  resolvedConfig: {
    modelConfigId: configId,
    modelConfigVersion: 3,
    resolvedConfigHash: hash,
    requestedProvider: "synthetic_alpha",
    requestedModel: "synthetic-text-alpha-v1",
    parametersSnapshot: {},
    maxInputTokens: 1_000,
    maxOutputTokens: 200,
    maxAttempts: 2,
    runCostLimitMicrousd: 1,
  },
  promptIdentity: { promptId: "synthetic-extensibility-probe", promptVersion: 1, promptHash: hash },
  providerEnvelope: { version: 1, hash },
  inputSchemaVersion: 1,
  outputSchemaId: "cwt.synthetic-review-packet.v1",
  outputSchemaVersion: 1,
  policyVersion: "synthetic-probe-policy-v1",
  resultKind: "synthetic_review_packet",
  dispositionKind: "synthetic_probe_verdict",
  inputSources: [],
  inputContext: { synthetic: true },
  inputHash: hash,
};

const summary: CoreCommittedRunSummaryV1 = {
  runId: "33333333-3333-4333-8333-333333333333",
  applicationClass: "synthetic_test_application",
  useCase: "synthetic_extensibility_probe",
  status: "pending",
  queuedAt: "2026-08-12T00:00:00.000Z",
};

function preparedBinding() {
  const registry = createTypedApplicationRegistry([createSyntheticDefinitionV1()]);
  if (!registry.ok) throw new Error("Synthetic registry failed.");
  const binding = registry.value.prepareInvocation({
    applicationClass: "synthetic_test_application",
    capability: "text",
    useCase: "synthetic_extensibility_probe",
    actor: { principalId: "synthetic-principal", roleKey: "synthetic_operator" },
    applicationPayload: { association },
  });
  if (!binding.ok) throw new Error("Synthetic binding failed.");
  return binding.value;
}

function orchestrator() {
  return createGenericAiOrchestratorV1({
    appEnvironment: "test",
    processFeatureAiEnabled: true,
    async validateConfiguration(input) {
      return aiSuccess({
        modelConfigId: configId,
        modelConfigVersion: 3,
        ...(input.requestStage === undefined ? {} : { preparedRun }),
      });
    },
  });
}

function durableOperations(
  calls: string[],
  replay: "new_request" | "exact_replay",
): SyntheticCaseOperationsV1 {
  return {
    async authorizeReserveAndSnapshotCase(input) { return observation(input); },
    async findReplay() {
      calls.push(`findReplay(${replay === "new_request" ? "no_match" : "exact_replay"})`);
      return aiSuccess(replay === "new_request" ? { kind: "new_request" } : { kind: "exact_replay", summary });
    },
    async readFeatureState() {
      calls.push("readFeatureState(enabled)");
      return aiSuccess({ processEnabled: true, databaseRowPresent: true, databaseEnabled: true });
    },
    async readConfigResolution() {
      calls.push("readConfigResolution(one enabled default)");
      return aiSuccess({
        version: 1,
        applicationClass: "synthetic_test_application",
        capability: "text",
        useCase: "synthetic_extensibility_probe",
        totalRowCount: 1,
        defaultRowCount: 1,
        enabledDefaultRowCount: 1,
        enabledDefaultRows: [configRow],
      });
    },
    async confirmResolvedConfiguration(input) {
      calls.push(`confirmResolvedConfiguration(${input.modelConfigId}:${input.expectedRecordVersion})`);
      return aiSuccess(configRow);
    },
    async commitPreparedRun(input) {
      calls.push(`commitPreparedRun(${input.applicationClass})`);
      return aiSuccess({ kind: "inserted", summary });
    },
  };
}

describe("the sole accepted Synthetic application definition", () => {
  it("delegates the ordered new-run durable sequence to the exact transaction scope", async () => {
    const calls: string[] = [];
    const binding = preparedBinding();
    await withSyntheticCaseTransactionScope(
      { async observe(input) { return observation(input); } },
      durableOperations(calls, "new_request"),
      async (scope) => {
        const invocation = binding.bindRequest({
          scope,
          idempotencyKey: "22222222-2222-4222-8222-222222222222",
        });
        if (!invocation.ok) throw new Error("Synthetic request invocation failed.");
        await expect(orchestrator().request(invocation.value)).resolves.toEqual({ ok: true, value: summary });
      },
    );
    expect(calls).toEqual([
      "findReplay(no_match)",
      "readFeatureState(enabled)",
      "readConfigResolution(one enabled default)",
      `confirmResolvedConfiguration(${configId}:3)`,
      "commitPreparedRun(synthetic_test_application)",
    ]);
  });

  it("returns an exact replay before feature, config, confirm or commit", async () => {
    const calls: string[] = [];
    const binding = preparedBinding();
    await withSyntheticCaseTransactionScope(
      { async observe(input) { return observation(input); } },
      durableOperations(calls, "exact_replay"),
      async (scope) => {
        const invocation = binding.bindRequest({
          scope,
          idempotencyKey: "22222222-2222-4222-8222-222222222222",
        });
        if (!invocation.ok) throw new Error("Synthetic request invocation failed.");
        await expect(orchestrator().request(invocation.value)).resolves.toEqual({ ok: true, value: summary });
      },
    );
    expect(calls).toEqual(["findReplay(exact_replay)"]);
  });

  it("keeps the observation-only availability scope fail-closed and durable-authority-free", async () => {
    const binding = preparedBinding();
    await withSyntheticObservationScope(
      { async observe(input) { return observation(input); } },
      async (scope) => {
        const invocation = binding.bindAvailability(scope);
        if (!invocation.ok) throw new Error("Synthetic availability invocation failed.");
        await expect(orchestrator().inspect(invocation.value)).resolves.toMatchObject({
          ok: true,
          value: { available: false, code: "integration_not_ready" },
        });
      },
    );
  });

  it("keeps the protected result and disposition conspicuously Synthetic", () => {
    const definition = createSyntheticDefinitionV1();
    const result = definition.resultPolicy.parseAndProtect({
      rawObject: {
        kind: "synthetic_review_packet",
        observation: "SYNTHETIC TEST DATA — NOT A CWT FACT",
        evidenceLabels: ["synthetic_fixture_only"],
      },
      context: {
        version: 1,
        applicationClass: "synthetic_test_application",
        useCase: "synthetic_extensibility_probe",
        association,
        observation: "SYNTHETIC TEST DATA — NOT A CWT FACT",
      },
    });
    expect(result).toMatchObject({
      ok: true,
      value: {
        resultKind: "synthetic_review_packet",
        dispositionKind: "synthetic_probe_verdict",
      },
    });
    expect(aiFailure("integration_not_ready")).toMatchObject({ ok: false });
  });
});
