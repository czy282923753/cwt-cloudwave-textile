import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import type {
  AiModelConfigResolutionReadV1,
  AiModelConfigRow,
} from "@/ai/core/contracts";
import type { PromptBundleLoaderV1 } from "@/ai/prompts/loader";
import { createTextProviderRegistryV1 } from "@/ai/providers/registry";
import { createFakeTextProviderV1 } from "@/ai/testing/fake-text-provider";

import { resolveModelConfigV1 } from "./model-config-resolver";

const row: AiModelConfigRow = {
  id: "44444444-4444-4444-8444-444444444444",
  capability: "text",
  useCase: "product_description_draft",
  provider: "synthetic_alpha",
  model: "synthetic-text-alpha-v1",
  parametersJson: { temperature: 0, top_p: 1 },
  maxInputTokens: 16_000,
  maxOutputTokens: 4_000,
  maxAttempts: 3,
  runCostLimitMicrousd: 20_000,
  promptId: "product-description-draft",
  promptVersion: 1,
  promptHash: "a".repeat(64),
  enabled: true,
  isDefault: true,
  fallbackConfigId: null,
  recordVersion: 4,
  createdByUserId: "11111111-1111-4111-8111-111111111111",
  updatedByUserId: "11111111-1111-4111-8111-111111111111",
  createdAt: new Date("2026-08-10T00:00:00.000Z"),
  updatedAt: new Date("2026-08-10T00:00:00.000Z"),
};

const provider = createFakeTextProviderV1({
  key: "synthetic_alpha",
  model: "synthetic-text-alpha-v1",
  envelope: { version: 1, hash: "b".repeat(64) },
  result: {
    kind: "failure",
    responseStatus: "unknown",
    failureCode: "unknown",
    retryClass: "not_retryable",
    durationMs: 0,
  },
});
const registryResult = createTextProviderRegistryV1([provider]);
if (!registryResult.ok) throw new Error("Invalid fake registry.");
const fakeProviderRegistry = registryResult.value;

const promptLoader: PromptBundleLoaderV1 = {
  load(input) {
    return {
      ok: true,
      value: {
        tuple: {
          promptId: input.promptId,
          promptVersion: input.promptVersion,
          promptHash: input.promptHash,
        },
        applicationClass: input.applicationClass,
        capability: "text",
        useCase: input.useCase,
        locale: "en",
        inputSchemaVersion: input.inputSchemaVersion,
        outputSchemaVersion: input.outputSchemaVersion,
        policyVersion: input.policyVersion,
        variables: [],
        body: "SYNTHETIC TEST DATA — NOT A CWT FACT",
      },
    };
  },
};

function read(overrides: Partial<AiModelConfigResolutionReadV1> = {}): AiModelConfigResolutionReadV1 {
  return {
    version: 1,
    applicationClass: "draft_assistance",
    capability: "text",
    useCase: "product_description_draft",
    totalRowCount: 1,
    defaultRowCount: 1,
    enabledDefaultRowCount: 1,
    enabledDefaultRows: [row],
    ...overrides,
  };
}

function resolve(resolution: AiModelConfigResolutionReadV1) {
  return resolveModelConfigV1({
    key: {
      applicationClass: "draft_assistance",
      capability: "text",
      useCase: "product_description_draft",
    },
    read: resolution,
    inputSchemaVersion: 1,
    outputSchemaVersion: 1,
    policyVersion: "draft-product-description-v1",
    outputSchemaId: "cwt.product-description-draft.v1",
    providerRegistry: fakeProviderRegistry,
    promptLoader,
  });
}

describe("single fail-closed model-config resolution", () => {
  it("reproduces the fixed 20-field JCS hash vector", () => {
    const result = resolve(read());
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.model.resolvedConfigHash)
      .toBe("4a31457a0458233e62c0de489f95f3e7cd6463c1fe95b3e0c3620452d82845f3");
    expect(result.value.model).not.toHaveProperty("actualProvider");
  });

  it.each([
    [read({ totalRowCount: 0, defaultRowCount: 0, enabledDefaultRowCount: 0, enabledDefaultRows: [] }), "config_missing"],
    [read({ totalRowCount: 4, defaultRowCount: 1, enabledDefaultRowCount: 0, enabledDefaultRows: [] }), "config_disabled"],
    [read({ totalRowCount: 100, defaultRowCount: 0, enabledDefaultRowCount: 0, enabledDefaultRows: [] }), "config_default_missing"],
    [read({ totalRowCount: 2, defaultRowCount: 2, enabledDefaultRowCount: 2, enabledDefaultRows: [row, { ...row, id: "55555555-5555-4555-8555-555555555555" }] }), "config_ambiguous"],
    [read({ enabledDefaultRowCount: 2 }), "config_repository_invalid"],
  ] as const)("returns exact closed branch %#", (resolution, code) => {
    const result = resolve(resolution);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe(code);
  });

  it("keeps Production Provider registry exactly empty and fails before Prompt", async () => {
    const { productionTextProviderRegistryV1 } = await import("@/ai/providers/registry");
    expect(productionTextProviderRegistryV1.keys).toEqual([]);
    const result = resolveModelConfigV1({
      key: {
        applicationClass: "draft_assistance",
        capability: "text",
        useCase: "product_description_draft",
      },
      read: read(),
      inputSchemaVersion: 1,
      outputSchemaVersion: 1,
      policyVersion: "draft-product-description-v1",
      outputSchemaId: "cwt.product-description-draft.v1",
      providerRegistry: productionTextProviderRegistryV1,
      promptLoader,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("provider_unsupported");
  });
});
