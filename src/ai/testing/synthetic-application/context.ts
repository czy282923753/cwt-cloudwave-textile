import { z } from "zod";

import { canonicalJsonHash } from "@/ai/canonical-json";
import type { ReadonlyJsonObject } from "@/ai/canonical-json";
import type {
  PreparedApplicationContextV1,
  PromptVariablesV1,
} from "@/ai/core/contracts";
import { aiFailure, aiSuccess, type AiServiceResult } from "@/ai/errors";

import type { SyntheticAssociationV1 } from "./association";
import type { SyntheticObservationV1 } from "./read-scopes";

export interface SyntheticContextV1 {
  readonly version: 1;
  readonly applicationClass: "synthetic_test_application";
  readonly useCase: "synthetic_extensibility_probe";
  readonly association: SyntheticAssociationV1;
  readonly observation: string;
}

const contextSchema = z.object({
  version: z.literal(1),
  applicationClass: z.literal("synthetic_test_application"),
  useCase: z.literal("synthetic_extensibility_probe"),
  association: z.object({
    kind: z.literal("synthetic_case_association"),
    suiteKey: z.string().regex(/^[a-z][a-z0-9_]{0,31}$/),
    sampleOrdinal: z.number().int().min(1).max(100),
    epochLabel: z.string().min(1).max(32),
  }).strict(),
  observation: z.string().min(1).max(1_000),
}).strict();

export function createSyntheticContextV1(input: {
  readonly association: SyntheticAssociationV1;
  readonly observation: SyntheticObservationV1;
}): SyntheticContextV1 {
  return {
    version: 1,
    applicationClass: "synthetic_test_application",
    useCase: "synthetic_extensibility_probe",
    association: input.association,
    observation: input.observation.observation,
  };
}

export function parseSyntheticContextV1(input: unknown): AiServiceResult<SyntheticContextV1> {
  const parsed = contextSchema.safeParse(input);
  return parsed.success ? aiSuccess(parsed.data) : aiFailure("context_provenance_mismatch");
}

export function encodeSyntheticContextV1(
  context: SyntheticContextV1,
): AiServiceResult<PreparedApplicationContextV1> {
  const inputContext: ReadonlyJsonObject = {
    version: 1,
    applicationClass: "synthetic_test_application",
    useCase: "synthetic_extensibility_probe",
    association: {
      kind: "synthetic_case_association",
      suiteKey: context.association.suiteKey,
      sampleOrdinal: context.association.sampleOrdinal,
      epochLabel: context.association.epochLabel,
    },
    observation: context.observation,
  };
  const protectedContext = canonicalJsonHash(inputContext);
  if (!protectedContext.ok) return aiFailure("canonicalization_failed");
  return aiSuccess({
    version: 1,
    inputSources: [{
      alias: "synthetic_01",
      sourceClass: "synthetic_observation",
      sourceIdentity: {
        epochLabel: context.association.epochLabel,
        sampleOrdinal: context.association.sampleOrdinal,
        suiteKey: context.association.suiteKey,
      },
      selectedFields: ["observation"],
      fieldProvenance: [{ field: "observation", provenance: "provided" }],
    }],
    inputContext,
    inputHash: protectedContext.value.hash,
    explicitInputHash: protectedContext.value.hash,
    requestFingerprintInput: {
      epochLabel: context.association.epochLabel,
      sampleOrdinal: context.association.sampleOrdinal,
      suiteKey: context.association.suiteKey,
    },
  });
}

export function buildSyntheticPromptVariablesV1(
  context: SyntheticContextV1,
): AiServiceResult<PromptVariablesV1> {
  return aiSuccess({
    marker: "SYNTHETIC TEST DATA — NOT A CWT FACT",
    observation: context.observation,
  });
}
