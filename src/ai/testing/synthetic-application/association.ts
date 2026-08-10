import { z } from "zod";

import { canonicalJsonHash, type ReadonlyJsonObject } from "@/ai/canonical-json";
import type {
  ApplicationAssociationEnvelopeV1,
  AuthorizedAssociationSnapshot,
  DurableApplicationAssociationV1,
} from "@/ai/core/contracts";
import { aiFailure, aiSuccess, type AiServiceResult } from "@/ai/errors";

export interface SyntheticAssociationV1 {
  readonly kind: "synthetic_case_association";
  readonly suiteKey: string;
  readonly sampleOrdinal: number;
  readonly epochLabel: string;
}

const associationSchema = z.object({
  kind: z.literal("synthetic_case_association"),
  suiteKey: z.string().regex(/^[a-z][a-z0-9_]{0,31}$/),
  sampleOrdinal: z.number().int().min(1).max(100),
  epochLabel: z.string().min(1).max(32),
}).strict();

function snapshot(association: SyntheticAssociationV1): ReadonlyJsonObject {
  return {
    association_version: 1,
    epoch_label: association.epochLabel,
    sample_ordinal: association.sampleOrdinal,
    suite_key: association.suiteKey,
    target_type: "synthetic_case_association",
  };
}

export function parseSyntheticAssociationV1(
  input: unknown,
): AiServiceResult<SyntheticAssociationV1> {
  const parsed = associationSchema.safeParse(input);
  return parsed.success ? aiSuccess(parsed.data) : aiFailure("association_provenance_mismatch");
}

export function authorizeSyntheticAssociationV1(
  association: SyntheticAssociationV1,
): AiServiceResult<AuthorizedAssociationSnapshot<SyntheticAssociationV1>> {
  const protectedSnapshot = canonicalJsonHash(snapshot(association));
  if (!protectedSnapshot.ok) return aiFailure("association_provenance_mismatch");
  return aiSuccess({
    association,
    snapshot: snapshot(association),
    snapshotHash: protectedSnapshot.value.hash,
  });
}

export function syntheticAssociationEnvelopeV1(
  authorized: AuthorizedAssociationSnapshot<SyntheticAssociationV1>,
): AiServiceResult<ApplicationAssociationEnvelopeV1> {
  const rebuilt = authorizeSyntheticAssociationV1(authorized.association);
  if (!rebuilt.ok || rebuilt.value.snapshotHash !== authorized.snapshotHash) {
    return aiFailure("association_provenance_mismatch");
  }
  return aiSuccess({
    kind: "synthetic_case_association",
    snapshot: rebuilt.value.snapshot,
    snapshotHash: rebuilt.value.snapshotHash,
  });
}

export function syntheticDurableAssociationV1(
  authorized: AuthorizedAssociationSnapshot<SyntheticAssociationV1>,
): AiServiceResult<DurableApplicationAssociationV1> {
  const rebuilt = authorizeSyntheticAssociationV1(authorized.association);
  if (!rebuilt.ok || rebuilt.value.snapshotHash !== authorized.snapshotHash) {
    return aiFailure("association_provenance_mismatch");
  }
  return aiSuccess({
    kind: "synthetic_case_association",
    persistenceVersion: 1,
    value: {
      epochLabel: authorized.association.epochLabel,
      sampleOrdinal: authorized.association.sampleOrdinal,
      suiteKey: authorized.association.suiteKey,
    },
  });
}
