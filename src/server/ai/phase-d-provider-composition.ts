import "server-only";

import {
  createPhaseCAvailabilityServiceV1,
  createPhaseCDurableDraftAssistanceServiceV1,
} from "@/ai/applications/draft-assistance/composition";
import type { TrustedPhaseBEnvironmentV1 } from "@/ai/config/trusted-phase-b-environment";
import { createAiRunWorkerV1 } from "@/ai/internal/worker-entry";
import { createTextProviderRegistryV1, productionTextProviderRegistryV1 } from "@/ai/providers/registry";
import { productionPromptLoaderV1 } from "@/ai/prompts/loader";
import { productionPricingPolicyRegistryV1 } from "@/ai/runs/pricing-policy";
import { env } from "@/config/env";
import { databaseConnection } from "@/db/client";
import { createDeepSeekTextProviderV1 } from "@/integrations/ai/providers/deepseek-text-adapter";
import { createDeepSeekPricingPolicyRegistryV1 } from "@/integrations/ai/providers/deepseek-pricing";

const trustedEnvironment = Object.freeze({
  appEnvironment: env.APP_ENV,
  processFeatureAiEnabled: env.FEATURE_AI,
}) satisfies TrustedPhaseBEnvironmentV1;

function enabledStagingCapability() {
  const providerRegistry = createTextProviderRegistryV1([createDeepSeekTextProviderV1()]);
  if (!providerRegistry.ok) throw new Error("The Phase D Staging Provider registry is invalid.");
  return Object.freeze({
    providerRegistry: providerRegistry.value,
    pricingRegistry: createDeepSeekPricingPolicyRegistryV1(),
  });
}

export function createPhaseDServerAiServiceV1() {
  if (databaseConnection.kind === "pglite") {
    return createPhaseCAvailabilityServiceV1({
      database: databaseConnection.db,
      trustedEnvironment,
      providerRegistry: productionTextProviderRegistryV1,
      promptLoader: productionPromptLoaderV1,
      pricingRegistry: productionPricingPolicyRegistryV1,
    });
  }
  if (databaseConnection.kind !== "postgres") throw new Error("Unsupported database connection kind.");
  const capability = trustedEnvironment.appEnvironment === "staging" &&
    trustedEnvironment.processFeatureAiEnabled
    ? enabledStagingCapability()
    : {
        providerRegistry: productionTextProviderRegistryV1,
        pricingRegistry: productionPricingPolicyRegistryV1,
      };
  return createPhaseCDurableDraftAssistanceServiceV1({
    database: databaseConnection.db,
    trustedEnvironment,
    providerRegistry: capability.providerRegistry,
    promptLoader: productionPromptLoaderV1,
    pricingRegistry: capability.pricingRegistry,
  });
}

export function createPhaseDAiRunWorkerV1() {
  if (databaseConnection.kind === "pglite") {
    throw new Error("PGlite cannot run the durable AI Worker");
  }
  if (databaseConnection.kind !== "postgres") throw new Error("Unsupported database connection kind.");
  if (trustedEnvironment.appEnvironment !== "staging" ||
    !trustedEnvironment.processFeatureAiEnabled) {
    throw new Error("The Phase D Provider Worker requires enabled Staging.");
  }
  const capability = enabledStagingCapability();
  return createAiRunWorkerV1({
    database: databaseConnection.db,
    trustedEnvironment,
    providerRegistry: capability.providerRegistry,
    promptLoader: productionPromptLoaderV1,
    pricingRegistry: capability.pricingRegistry,
  });
}
