import { z } from "zod";

import { canonicalJsonHash, type ReadonlyJsonObject } from "@/ai/canonical-json";
import type { ProtectedApplicationResultEnvelopeV1 } from "@/ai/core/contracts";
import { aiFailure, aiSuccess, type AiServiceResult } from "@/ai/errors";

export interface SyntheticProtectedValueV1 extends ReadonlyJsonObject {
  readonly kind: "synthetic_review_packet";
  readonly observation: string;
  readonly evidenceLabels: readonly string[];
}

export const syntheticDispositionV1: {
  readonly kind: "synthetic_probe_verdict";
  readonly values: readonly ["acknowledged", "discarded"];
} = {
  kind: "synthetic_probe_verdict",
  values: ["acknowledged", "discarded"],
};

const outputSchema = z.object({
  kind: z.literal("synthetic_review_packet"),
  observation: z.string().min(1).max(1_000),
  evidenceLabels: z.array(z.string().min(1).max(100)).min(1).max(8),
}).strict();

export function protectSyntheticOutputV1(
  input: ReadonlyJsonObject,
): AiServiceResult<ProtectedApplicationResultEnvelopeV1 & {
  readonly value: SyntheticProtectedValueV1;
}> {
  const parsed = outputSchema.safeParse(input);
  if (!parsed.success) return aiFailure("output_schema_invalid");
  const protectedValue: SyntheticProtectedValueV1 = parsed.data;
  const canonical = canonicalJsonHash(protectedValue);
  if (!canonical.ok) return aiFailure("canonicalization_failed");
  return aiSuccess({
    version: 1,
    resultKind: "synthetic_review_packet",
    dispositionKind: "synthetic_probe_verdict",
    schemaId: "cwt.synthetic-review-packet.v1",
    schemaVersion: 1,
    policyVersion: "synthetic-probe-policy-v1",
    value: protectedValue,
    canonicalJson: canonical.value.canonicalJson,
    hash: canonical.value.hash,
  });
}
