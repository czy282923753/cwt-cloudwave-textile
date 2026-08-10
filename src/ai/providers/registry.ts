import "server-only";

import { aiFailure, aiSuccess, type AiServiceResult } from "../errors";
import type { TextAiProvider } from "./text-provider";

export interface TextProviderRegistryV1 {
  resolve(key: string): AiServiceResult<TextAiProvider>;
  readonly keys: readonly string[];
}

export function createTextProviderRegistryV1(
  providers: readonly TextAiProvider[],
): AiServiceResult<TextProviderRegistryV1> {
  const keys = new Set<string>();
  for (const provider of providers) {
    if (provider.key.length === 0 || keys.has(provider.key)) {
      return aiFailure("registry_invalid");
    }
    keys.add(provider.key);
  }
  return aiSuccess({
    keys: [...keys],
    resolve(key: string): AiServiceResult<TextAiProvider> {
      const provider = providers.find((candidate) => candidate.key === key);
      return provider === undefined
        ? aiFailure("provider_unsupported")
        : aiSuccess(provider);
    },
  });
}

const emptyProductionRegistry = createTextProviderRegistryV1([]);
if (!emptyProductionRegistry.ok) {
  throw new Error("The empty Phase B Provider registry is invalid.");
}
export const productionTextProviderRegistryV1 = emptyProductionRegistry.value;
