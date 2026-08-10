import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { createGenericAiOrchestratorV1 } from "@/ai/core/orchestrator";
import { aiFailure, aiSuccess } from "@/ai/errors";
import { createTypedApplicationRegistry } from "@/ai/registry/application-registry";

import { createSyntheticDefinitionV1 } from "./definition";
import type { SyntheticAssociationV1 } from "./association";
import {
  withSyntheticCaseTransactionScope,
  withSyntheticObservationScope,
  type SyntheticObservationInputV1,
} from "./read-scopes";

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

describe("structurally distinct Synthetic application", () => {
  it("constructs both private scopes and binds both opaque core paths", async () => {
    const definition = createSyntheticDefinitionV1();
    const registry = createTypedApplicationRegistry([definition]);
    expect(registry.ok).toBe(true);
    if (!registry.ok) return;
    const binding = registry.value.prepareInvocation({
      applicationClass: "synthetic_test_application",
      capability: "text",
      useCase: "synthetic_extensibility_probe",
      actor: { principalId: "synthetic-principal", roleKey: "synthetic_operator" },
      applicationPayload: { association },
    });
    expect(binding.ok).toBe(true);
    if (!binding.ok) return;
    const orchestrator = createGenericAiOrchestratorV1({
      durableEnqueueAvailable: false,
      appEnvironment: "test",
      processFeatureAiEnabled: false,
      async validateConfiguration() { return aiFailure("integration_not_ready"); },
    });
    await withSyntheticObservationScope(
      { async observe(input) { return observation(input); } },
      async (scope) => {
        const invocation = binding.value.bindAvailability(scope);
        expect(invocation.ok).toBe(true);
        if (!invocation.ok) return;
        const result = await orchestrator.inspect(invocation.value);
        expect(result).toMatchObject({
          ok: true,
          value: { available: false, code: "integration_not_ready" },
        });
      },
    );
    await withSyntheticCaseTransactionScope(
      { async observe(input) { return observation(input); } },
      { async authorizeReserveAndSnapshotCase(input) { return observation(input); } },
      async (scope) => {
        const invocation = binding.value.bindRequest({
          scope,
          idempotencyKey: "synthetic-idempotency-01",
        });
        expect(invocation.ok).toBe(true);
        if (!invocation.ok) return;
        const result = await orchestrator.request(invocation.value);
        expect(result).toMatchObject({ ok: false, error: { code: "integration_not_ready" } });
      },
    );
  });

  it("keeps association, protected result, and disposition structurally non-production", async () => {
    const definition = createSyntheticDefinitionV1();
    expect(definition.claimedRuntime.outputSchemaId).toBe("cwt.synthetic-review-packet.v1");
    expect(definition.resultPolicy.resultKind).toBe("synthetic_review_packet");
    expect(definition.resultPolicy.dispositionKind).toBe("synthetic_probe_verdict");
    const protectedResult = definition.resultPolicy.parseAndProtect({
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
    expect(protectedResult).toMatchObject({
      ok: true,
      value: {
        resultKind: "synthetic_review_packet",
        dispositionKind: "synthetic_probe_verdict",
      },
    });
  });
});
