import { z } from "zod";

import {
  canonicalizeJson,
  canonicalJsonHash,
  type ReadonlyJsonObject,
} from "@/ai/canonical-json";
import { aiFailure, aiSuccess, type AiServiceResult } from "@/ai/errors";

import type {
  AuthorizedDraftAssociationV1,
  DraftAuthorizedTargetSnapshotV1,
  DraftDurableAssociationWithoutHashV1,
  DraftDurableAssociationV1,
  DraftTarget,
  DraftTargetColumnProjectionV1,
} from "./contracts";

const uuid = z.string().regex(
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
);
const positiveVersion = z.number().int().min(1).max(2_147_483_647);
const lowercaseHash = z.string().regex(/^[0-9a-f]{64}$/);

const draftTargetSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("product_draft"),
    productId: uuid,
    locale: z.literal("en"),
    expectedVersion: positiveVersion,
  }).strict(),
  z.object({
    type: z.literal("content_draft"),
    contentId: uuid,
    locale: z.literal("en"),
    expectedVersion: positiveVersion,
  }).strict(),
  z.object({
    type: z.literal("editorial_revision"),
    revisionId: uuid,
    expectedVersion: positiveVersion,
  }).strict(),
]);

const targetColumnsSchema = z.object({
  targetType: z.enum(["product_draft", "content_draft", "editorial_revision"]),
  targetProductId: uuid.nullable(),
  targetContentId: uuid.nullable(),
  targetRevisionId: uuid.nullable(),
  targetLocale: z.literal("en").nullable(),
  expectedTargetVersion: positiveVersion,
  targetSnapshotHash: lowercaseHash,
}).strict();

function provenanceFailure(): AiServiceResult<never> {
  return aiFailure("association_provenance_mismatch");
}

export function prepareDraftAssociationV1(
  input: unknown,
): AiServiceResult<DraftDurableAssociationWithoutHashV1> {
  const parsed = draftTargetSchema.safeParse(input);
  if (!parsed.success) return provenanceFailure();
  switch (parsed.data.type) {
    case "product_draft":
      return aiSuccess({
        persistenceVersion: 1,
        kind: "draft_target.v1",
        targetType: "product_draft",
        targetProductId: parsed.data.productId,
        targetLocale: "en",
        expectedTargetVersion: parsed.data.expectedVersion,
      });
    case "content_draft":
      return aiSuccess({
        persistenceVersion: 1,
        kind: "draft_target.v1",
        targetType: "content_draft",
        targetContentId: parsed.data.contentId,
        targetLocale: "en",
        expectedTargetVersion: parsed.data.expectedVersion,
      });
    case "editorial_revision":
      return aiSuccess({
        persistenceVersion: 1,
        kind: "draft_target.v1",
        targetType: "editorial_revision",
        targetRevisionId: parsed.data.revisionId,
        expectedTargetVersion: parsed.data.expectedVersion,
      });
  }
}

function buildSnapshot(
  association: DraftDurableAssociationWithoutHashV1,
): DraftAuthorizedTargetSnapshotV1 {
  switch (association.targetType) {
    case "product_draft":
      return {
        association_version: 1,
        expected_target_version: association.expectedTargetVersion,
        target_locale: "en",
        target_product_id: association.targetProductId,
        target_type: "product_draft",
      };
    case "content_draft":
      return {
        association_version: 1,
        expected_target_version: association.expectedTargetVersion,
        target_content_id: association.targetContentId,
        target_locale: "en",
        target_type: "content_draft",
      };
    case "editorial_revision":
      return {
        association_version: 1,
        expected_target_version: association.expectedTargetVersion,
        target_revision_id: association.targetRevisionId,
        target_type: "editorial_revision",
      };
  }
}

export function buildAuthorizedDraftAssociationV1(
  association: DraftDurableAssociationWithoutHashV1,
): AiServiceResult<AuthorizedDraftAssociationV1> {
  try {
    const snapshot = buildSnapshot(association);
    const protectedSnapshot = canonicalJsonHash(snapshot);
    if (!protectedSnapshot.ok) return provenanceFailure();
    return aiSuccess({
      association,
      snapshot,
      snapshotHash: protectedSnapshot.value.hash,
    });
  } catch {
    return provenanceFailure();
  }
}

export function encodeDraftTargetColumnsV1(
  authorized: AuthorizedDraftAssociationV1,
): AiServiceResult<DraftTargetColumnProjectionV1> {
  const rebuilt = buildAuthorizedDraftAssociationV1(authorized.association);
  if (!rebuilt.ok) return rebuilt;
  const rebuiltCanonical = canonicalizeJson(rebuilt.value.snapshot);
  const suppliedCanonical = canonicalizeJson(authorized.snapshot);
  if (
    rebuilt.value.snapshotHash !== authorized.snapshotHash ||
    !rebuiltCanonical.ok ||
    !suppliedCanonical.ok ||
    rebuiltCanonical.value !== suppliedCanonical.value
  ) return provenanceFailure();
  const association = authorized.association;
  switch (association.targetType) {
    case "product_draft":
      return aiSuccess({
        targetType: "product_draft",
        targetProductId: association.targetProductId,
        targetContentId: null,
        targetRevisionId: null,
        targetLocale: "en",
        expectedTargetVersion: association.expectedTargetVersion,
        targetSnapshotHash: authorized.snapshotHash,
      });
    case "content_draft":
      return aiSuccess({
        targetType: "content_draft",
        targetProductId: null,
        targetContentId: association.targetContentId,
        targetRevisionId: null,
        targetLocale: "en",
        expectedTargetVersion: association.expectedTargetVersion,
        targetSnapshotHash: authorized.snapshotHash,
      });
    case "editorial_revision":
      return aiSuccess({
        targetType: "editorial_revision",
        targetProductId: null,
        targetContentId: null,
        targetRevisionId: association.targetRevisionId,
        targetLocale: null,
        expectedTargetVersion: association.expectedTargetVersion,
        targetSnapshotHash: authorized.snapshotHash,
      });
  }
}

function parseDraftTargetColumnsV1(
  input: unknown,
): AiServiceResult<{
  readonly association: DraftDurableAssociationWithoutHashV1;
  readonly targetSnapshotHash: string;
}> {
  const parsed = targetColumnsSchema.safeParse(input);
  if (!parsed.success) return provenanceFailure();
  const row = parsed.data;
  let association: DraftDurableAssociationWithoutHashV1;
  switch (row.targetType) {
    case "product_draft":
      if (
        row.targetProductId === null || row.targetContentId !== null ||
        row.targetRevisionId !== null || row.targetLocale !== "en"
      ) return provenanceFailure();
      association = {
        persistenceVersion: 1,
        kind: "draft_target.v1",
        targetType: "product_draft",
        targetProductId: row.targetProductId,
        targetLocale: "en",
        expectedTargetVersion: row.expectedTargetVersion,
      };
      break;
    case "content_draft":
      if (
        row.targetProductId !== null || row.targetContentId === null ||
        row.targetRevisionId !== null || row.targetLocale !== "en"
      ) return provenanceFailure();
      association = {
        persistenceVersion: 1,
        kind: "draft_target.v1",
        targetType: "content_draft",
        targetContentId: row.targetContentId,
        targetLocale: "en",
        expectedTargetVersion: row.expectedTargetVersion,
      };
      break;
    case "editorial_revision":
      if (
        row.targetProductId !== null || row.targetContentId !== null ||
        row.targetRevisionId === null || row.targetLocale !== null
      ) return provenanceFailure();
      association = {
        persistenceVersion: 1,
        kind: "draft_target.v1",
        targetType: "editorial_revision",
        targetRevisionId: row.targetRevisionId,
        expectedTargetVersion: row.expectedTargetVersion,
      };
      break;
  }
  return aiSuccess({ association, targetSnapshotHash: row.targetSnapshotHash });
}

export function decodeDraftTargetColumnsStructureV1(
  input: unknown,
): AiServiceResult<{
  readonly kind: "draft_target.v1";
  readonly snapshot: ReadonlyJsonObject;
  readonly snapshotHash: string;
}> {
  const parsed = parseDraftTargetColumnsV1(input);
  if (!parsed.ok) return parsed;
  return aiSuccess({
    kind: "draft_target.v1",
    snapshot: buildSnapshot(parsed.value.association),
    snapshotHash: parsed.value.targetSnapshotHash,
  });
}

export function decodeDraftTargetColumnsV1(
  input: unknown,
): AiServiceResult<DraftDurableAssociationV1> {
  const parsed = parseDraftTargetColumnsV1(input);
  if (!parsed.ok) return parsed;
  const authorized = buildAuthorizedDraftAssociationV1(parsed.value.association);
  if (!authorized.ok || authorized.value.snapshotHash !== parsed.value.targetSnapshotHash) {
    return provenanceFailure();
  }
  return aiSuccess({
    ...parsed.value.association,
    targetSnapshotHash: parsed.value.targetSnapshotHash,
  });
}

export function toDraftAssociationEnvelopeV1(
  authorized: AuthorizedDraftAssociationV1,
): AiServiceResult<{
  readonly kind: "draft_target.v1";
  readonly snapshot: ReadonlyJsonObject;
  readonly snapshotHash: string;
}> {
  const columns = encodeDraftTargetColumnsV1(authorized);
  if (!columns.ok) return columns;
  return aiSuccess({
    kind: "draft_target.v1",
    snapshot: authorized.snapshot,
    snapshotHash: authorized.snapshotHash,
  });
}

export function draftTargetFromAssociationV1(
  association: DraftDurableAssociationWithoutHashV1,
): DraftTarget {
  switch (association.targetType) {
    case "product_draft":
      return {
        type: "product_draft",
        productId: association.targetProductId,
        locale: "en",
        expectedVersion: association.expectedTargetVersion,
      };
    case "content_draft":
      return {
        type: "content_draft",
        contentId: association.targetContentId,
        locale: "en",
        expectedVersion: association.expectedTargetVersion,
      };
    case "editorial_revision":
      return {
        type: "editorial_revision",
        revisionId: association.targetRevisionId,
        expectedVersion: association.expectedTargetVersion,
      };
  }
}
