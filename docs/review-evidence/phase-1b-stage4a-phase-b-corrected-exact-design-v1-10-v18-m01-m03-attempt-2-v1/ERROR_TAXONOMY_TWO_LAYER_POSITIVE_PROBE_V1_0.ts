import {
  aiErrorCodes,
  aiFailure,
  type AiErrorCode,
  type SafeAiError,
} from "../../../src/ai/errors";

// Layer B only: these are the five context-traversal results. This type proof
// intentionally does not claim that the other 64 AiErrorCode members belong to
// the traversal subset. Layer A's complete 69-entry closure is a runtime proof.
export const traversalReturnCodes = [
  "context_provenance_mismatch",
  "context_prohibited_data",
  "context_too_large",
  "canonicalization_failed",
  "internal_failure",
] as const satisfies readonly AiErrorCode[];

type AssertNever<T extends never> = T;
type TraversalReturnCode = (typeof traversalReturnCodes)[number];
type _TraversalHasNoUnknownMember = AssertNever<
  Exclude<TraversalReturnCode, AiErrorCode>
>;

// These values are runtime inputs for the verifier's Layer A comparison. Their
// existence here is not a profile-derived literal-union claim.
export const sourceAuthorityProjection: readonly SafeAiError[] = aiErrorCodes.map(
  (code) => {
    const result = aiFailure(code);
    if (result.ok) throw new Error("aiFailure returned success");
    return result.error;
  },
);

export function normalizeCaughtFailure(_caught: unknown): AiErrorCode {
  return "internal_failure";
}
