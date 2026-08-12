import "server-only";
import { env } from "@/config/env";
import { databaseConnection } from "@/db/client";
import type { TrustedPhaseBEnvironmentV1 } from "@/ai/config/trusted-phase-b-environment";
import {
  createPhaseCAvailabilityServiceV1,
  createPhaseCDurableDraftAssistanceServiceV1,
} from "@/ai/applications/draft-assistance/composition";
import { createAiRunWorkerV1 } from "@/ai/internal/worker-entry";
import { productionTextProviderRegistryV1 } from "@/ai/providers/registry";
import { productionPromptLoaderV1 } from "@/ai/prompts/loader";
import { productionPricingPolicyRegistryV1 } from "@/ai/runs/pricing-policy";

const trustedEnvironment = Object.freeze({
  appEnvironment: env.APP_ENV,
  processFeatureAiEnabled: env.FEATURE_AI,
}) satisfies TrustedPhaseBEnvironmentV1;

export function createPhaseCServerAiServiceV1() {
  switch (databaseConnection.kind) {
    case "pglite":
      return createPhaseCAvailabilityServiceV1({
        database: databaseConnection.db,
        trustedEnvironment,
        providerRegistry: productionTextProviderRegistryV1,
        promptLoader: productionPromptLoaderV1,
        pricingRegistry: productionPricingPolicyRegistryV1,
      });
    case "postgres":
      return createPhaseCDurableDraftAssistanceServiceV1({
        database: databaseConnection.db,
        trustedEnvironment,
        providerRegistry: productionTextProviderRegistryV1,
        promptLoader: productionPromptLoaderV1,
        pricingRegistry: productionPricingPolicyRegistryV1,
      });
    default:
      throw new Error("Unsupported database connection kind.");
  }
}

export function createPhaseCAiRunWorkerV1() {
  switch (databaseConnection.kind) {
    case "pglite":
      throw new Error("PGlite cannot run the durable AI Worker");
    case "postgres":
      return createAiRunWorkerV1({
        database: databaseConnection.db,
        trustedEnvironment,
        providerRegistry: productionTextProviderRegistryV1,
        promptLoader: productionPromptLoaderV1,
        pricingRegistry: productionPricingPolicyRegistryV1,
      });
    default:
      throw new Error("Unsupported database connection kind.");
  }
}
