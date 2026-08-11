import profile from "./V18_M01_M02_M03_MACHINE_PROFILE_V1_0.json";

import {
  aiErrorCodes,
  aiFailure,
  type AiErrorCode,
  type SafeAiError,
} from "../../../src/ai/errors";

// Checked design derivative only. `src/ai/errors.ts` remains the unique code tuple/factory authority;
// the verifier proves that the JSON profile is byte/order/value-identical to this projection.
type AssertNever<T extends never> = T;
type AssertTrue<T extends true> = T;

const designTraversalReturnCodes = [
  "context_provenance_mismatch",
  "context_prohibited_data",
  "context_too_large",
  "canonicalization_failed",
  "internal_failure",
] as const satisfies readonly AiErrorCode[];

type DesignTraversalReturnCode = (typeof designTraversalReturnCodes)[number];
type _TraversalHasNoCodeOutsideAuthority = AssertNever<Exclude<DesignTraversalReturnCode, AiErrorCode>>;
type _TraversalIncludesProvenanceFailure = AssertTrue<
  "context_provenance_mismatch" extends DesignTraversalReturnCode ? true : false
>;

const exactProjection: readonly SafeAiError[] = aiErrorCodes.map((code) => {
  const result = aiFailure(code);
  if (result.ok) {
    throw new Error("aiFailure returned success");
  }
  return result.error;
});

function normalizeCaughtFailure(_caught: unknown): AiErrorCode {
  return "internal_failure";
}

void exactProjection;
void designTraversalReturnCodes;
void profile;
void normalizeCaughtFailure;
