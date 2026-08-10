import type { ReadonlyJsonObject } from "@/ai/canonical-json";
import type { ProviderEnvelopeIdentityV1 } from "@/ai/core/contracts";
import { aiFailure, aiSuccess } from "@/ai/errors";
import type {
  ProviderTextResultV1,
  TextAiProvider,
} from "@/ai/providers/text-provider";

export const SYNTHETIC_TEST_DATA_MARKER =
  "SYNTHETIC TEST DATA — NOT A CWT FACT";

export interface FakeTextProviderRecorderV1 {
  readonly requests: ReadonlyJsonObject[];
}

export function createFakeTextProviderV1(input: {
  readonly key: "synthetic_alpha" | "synthetic_beta";
  readonly model: "synthetic-text-alpha-v1" | "synthetic-text-beta-v1";
  readonly envelope: ProviderEnvelopeIdentityV1;
  readonly result: ProviderTextResultV1;
  readonly recorder?: FakeTextProviderRecorderV1;
}): TextAiProvider {
  return {
    key: input.key,
    capability: "text",
    resolveConfiguration(configuration) {
      if (configuration.model !== input.model ||
        typeof configuration.parameters !== "object" || configuration.parameters === null ||
        Array.isArray(configuration.parameters)) return aiFailure("model_unsupported");
      const keys = Object.keys(configuration.parameters);
      if (keys.some((key) => key !== "temperature" && key !== "top_p")) {
        return aiFailure("parameters_invalid");
      }
      const temperature = Object.hasOwn(configuration.parameters, "temperature")
        ? Object.getOwnPropertyDescriptor(configuration.parameters, "temperature")?.value
        : undefined;
      const topP = Object.hasOwn(configuration.parameters, "top_p")
        ? Object.getOwnPropertyDescriptor(configuration.parameters, "top_p")?.value
        : undefined;
      if ((temperature !== undefined &&
          (typeof temperature !== "number" || !Number.isFinite(temperature) || temperature < 0 || temperature > 2)) ||
        (topP !== undefined &&
          (typeof topP !== "number" || !Number.isFinite(topP) || topP < 0 || topP > 1))) {
        return aiFailure("parameters_invalid");
      }
      const parameters: Record<string, number> = {};
      if (typeof temperature === "number") parameters.temperature = temperature;
      if (typeof topP === "number") parameters.top_p = topP;
      return aiSuccess({ model: input.model, parameters });
    },
    describeEnvelope() {
      return input.envelope;
    },
    estimateInputTokens(request) {
      return aiSuccess(Math.max(1, Math.ceil(
        Buffer.byteLength(request.instructions + request.input, "utf8") / 4,
      )));
    },
    async generateText(request) {
      input.recorder?.requests.push({
        marker: SYNTHETIC_TEST_DATA_MARKER,
        model: request.model,
        request: {
          version: request.request.version,
          instructions: request.request.instructions,
          input: request.request.input,
          responseFormat: {
            kind: request.request.responseFormat.kind,
            schemaId: request.request.responseFormat.schemaId,
            schemaVersion: request.request.responseFormat.schemaVersion,
          },
          maxOutputTokens: request.request.maxOutputTokens,
        },
      });
      return input.result;
    },
  };
}
