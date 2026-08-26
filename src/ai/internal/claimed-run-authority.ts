import { z } from "zod";

import { canonicalJsonHash, type ReadonlyJsonObject, type ReadonlyJsonValue } from "@/ai/canonical-json";
import type {
  ApplicationAssociationEnvelopeV1,
  ClaimedTargetOwnerAuthorityV1,
  ClaimedApplicationRuntimeRegistryV1,
  OpaqueClaimedContextStageV1,
} from "@/ai/core/contracts";
import { aiFailure, aiSuccess, type AiServiceResult } from "@/ai/errors";
import { resolvedConfigHashV1 } from "./preparation";

const claimedRunBrand = Symbol("pre-dispatch-claimed-ai-run-v2");
function claimedRunMarker(): true {
  return true;
}
const uuid = z.string().regex(
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
);
const hash = z.string().regex(/^[0-9a-f]{64}$/);
const rowSchema = z.object({
  claimAuthority: z.object({
    version: z.literal(1),
    owner: z.enum(["product", "content"]),
  }).strict(),
  runId: uuid,
  applicationClass: z.string().min(1).max(64),
  capability: z.literal("text"),
  useCase: z.string().min(1).max(64),
  idempotencyKey: uuid,
  requestFingerprintVersion: z.literal(1),
  requestFingerprint: hash,
  targetType: z.string(),
  targetProductId: uuid.nullable(),
  targetContentId: uuid.nullable(),
  targetRevisionId: uuid.nullable(),
  targetLocale: z.string().nullable(),
  expectedTargetVersion: z.number().int().positive(),
  targetSnapshotHash: hash,
  modelConfigId: uuid,
  modelConfigVersion: z.number().int().positive(),
  resolvedConfigHash: hash,
  requestedProvider: z.string().min(1).max(64),
  actualProvider: z.string().min(1).max(64).nullable(),
  requestedModel: z.string().min(1).max(128),
  parametersSnapshotJson: z.unknown(),
  maxInputTokens: z.number().int().min(1).max(16_000),
  maxOutputTokens: z.number().int().min(1).max(4_000),
  maxAttempts: z.number().int().min(1).max(3),
  runCostLimitMicrousd: z.number().int().min(0).max(500_000),
  promptId: z.string().min(1).max(64),
  promptVersion: z.number().int().positive(),
  promptHash: hash,
  providerEnvelopeVersion: z.number().int().positive(),
  providerEnvelopeHash: hash,
  inputSchemaVersion: z.number().int().positive(),
  outputSchemaVersion: z.number().int().positive(),
  policyVersion: z.string().min(1).max(100),
  inputContextJson: z.unknown(),
  inputSourcesJson: z.unknown(),
  inputHash: hash,
  status: z.literal("processing"),
  retryState: z.literal("none"),
  attemptCount: z.number().int().positive(),
  leaseOwner: z.string().min(1).max(128),
  leaseToken: uuid,
  leaseExpiresAt: z.date(),
  stateVersion: z.number().int().positive(),
  activeAttemptDispatchedAt: z.null(),
  providerDispatchedAt: z.date().nullable(),
}).strict();

function jsonValue(value: unknown): value is ReadonlyJsonValue {
  if (value === null || typeof value === "string" || typeof value === "boolean") return true;
  if (typeof value === "number") return Number.isFinite(value);
  if (Array.isArray(value)) return value.every(jsonValue);
  if (typeof value !== "object") return false;
  const prototype = Object.getPrototypeOf(value);
  return (prototype === Object.prototype || prototype === null) && Object.values(value).every(jsonValue);
}

function jsonObject(value: unknown): value is ReadonlyJsonObject {
  return jsonValue(value) && typeof value === "object" && value !== null && !Array.isArray(value);
}

function copyJsonValue(value: ReadonlyJsonValue): ReadonlyJsonValue {
  if (value === null || typeof value !== "object") return value;
  if (Array.isArray(value)) return Object.freeze(value.map(copyJsonValue));
  const copy: Record<string, ReadonlyJsonValue> = Object.create(null);
  for (const [key, member] of Object.entries(value)) copy[key] = copyJsonValue(member);
  return Object.freeze(copy);
}

function copyJsonObject(value: ReadonlyJsonObject): ReadonlyJsonObject {
  const copy: Record<string, ReadonlyJsonValue> = Object.create(null);
  for (const [key, member] of Object.entries(value)) copy[key] = copyJsonValue(member);
  return Object.freeze(copy);
}

function controlledValidationIdentity(
  inputSources: readonly ReadonlyJsonValue[],
): AiServiceResult<{ readonly fixtureId: string; readonly fixtureHash: string } | null> {
  const controlled = inputSources.filter((value) => {
    if (!jsonObject(value)) return false;
    const identity = value.sourceIdentity;
    return jsonObject(identity) && Object.keys(identity)
      .some((key) => key.startsWith("controlled_validation_"));
  });
  if (controlled.length === 0) return aiSuccess(null);
  if (controlled.length !== 1 || !jsonObject(controlled[0])) return aiFailure("context_provenance_mismatch");
  const source = controlled[0];
  const identity = source.sourceIdentity;
  if (source.sourceClass !== "explicit_human_input" || !jsonObject(identity) ||
    identity.origin !== "typed_brief" || identity.controlled_validation_fixture_version !== 1 ||
    typeof identity.controlled_validation_fixture_id !== "string" ||
    !/^SYN-AI-[A-Z0-9-]{1,120}$/.test(identity.controlled_validation_fixture_id) ||
    typeof identity.controlled_validation_fixture_hash !== "string" ||
    !hash.safeParse(identity.controlled_validation_fixture_hash).success ||
    Object.keys(identity).sort().join("\u0000") !== [
      "controlled_validation_fixture_hash",
      "controlled_validation_fixture_id",
      "controlled_validation_fixture_version",
      "origin",
    ].join("\u0000")) return aiFailure("context_provenance_mismatch");
  return aiSuccess(Object.freeze({
    fixtureId: identity.controlled_validation_fixture_id,
    fixtureHash: identity.controlled_validation_fixture_hash,
  }));
}

function claimedDraftContextInAcceptedOrder(value: ReadonlyJsonObject): ReadonlyJsonObject {
  const ordered: Record<string, ReadonlyJsonValue> = Object.create(null);
  const copyKeys = (source: ReadonlyJsonObject, keys: readonly string[]) => {
    const target: Record<string, ReadonlyJsonValue> = Object.create(null);
    for (const key of keys) {
      const member = source[key];
      if (member !== undefined) target[key] = copyJsonValue(member);
    }
    return Object.freeze(target);
  };
  for (const key of ["version", "applicationClass", "capability", "useCase", "locale"] as const) {
    const member = value[key];
    if (member !== undefined) ordered[key] = copyJsonValue(member);
  }
  const association = value.association;
  ordered.association = jsonObject(association)
    ? copyKeys(association, ["kind", "targetType", "targetAlias", "expectedVersion", "snapshotHash"])
    : copyJsonValue(association ?? null);
  const task = value.task;
  ordered.task = jsonObject(task)
    ? copyKeys(task, ["tone", "pageIntent", "primaryPhrase", "topic", "guideIntent"])
    : copyJsonValue(task ?? null);
  const sources = value.sources;
  ordered.sources = Array.isArray(sources) ? Object.freeze(sources.map((source) => {
    if (!jsonObject(source)) return copyJsonValue(source);
    const fields = source.fields;
    const orderedSource = copyKeys(source, ["alias", "sourceClass", "selectedBy"]);
    return Object.freeze({
      ...orderedSource,
      fields: Array.isArray(fields) ? Object.freeze(fields.map((field) =>
        jsonObject(field)
          ? copyKeys(field, ["field", "ref", "provenance", "value"])
          : copyJsonValue(field))) : copyJsonValue(fields ?? null),
    });
  })) : copyJsonValue(sources ?? null);
  const links = value.internalLinkCandidates;
  ordered.internalLinkCandidates = Array.isArray(links) ? Object.freeze(links.map((link) =>
    jsonObject(link)
      ? copyKeys(link, ["candidateRef", "label"]) : copyJsonValue(link))) : copyJsonValue(links ?? null);
  ordered.mediaPlacementRefs = copyJsonValue(value.mediaPlacementRefs ?? null);
  return Object.freeze(ordered);
}

export interface PreDispatchClaimedRunV2 {
  readonly [claimedRunBrand]: true;
  readonly version: 2;
  readonly runId: string;
  readonly applicationClass: string;
  readonly capability: "text";
  readonly useCase: string;
  readonly idempotencyKey: string;
  readonly requestFingerprintVersion: 1;
  readonly requestFingerprint: string;
  readonly applicationAssociation: ApplicationAssociationEnvelopeV1;
  readonly targetSnapshotHash: string;
  readonly modelConfigId: string;
  readonly modelConfigVersion: number;
  readonly resolvedConfigHash: string;
  readonly requestedProvider: string;
  readonly actualProvider: string | null;
  readonly requestedModel: string;
  readonly parametersSnapshot: ReadonlyJsonObject;
  readonly maxInputTokens: number;
  readonly maxOutputTokens: number;
  readonly maxAttempts: number;
  readonly runCostLimitMicrousd: number;
  readonly promptId: string;
  readonly promptVersion: number;
  readonly promptHash: string;
  readonly providerEnvelopeVersion: number;
  readonly providerEnvelopeHash: string;
  readonly inputSchemaVersion: number;
  readonly outputSchemaId: string;
  readonly outputSchemaVersion: number;
  readonly policyVersion: string;
  readonly inputContext: ReadonlyJsonObject;
  readonly inputSources: readonly ReadonlyJsonValue[];
  readonly inputHash: string;
  readonly controlledValidationIdentity: {
    readonly fixtureId: string;
    readonly fixtureHash: string;
  } | null;
  readonly status: "processing";
  readonly retryState: "none";
  readonly attemptCount: number;
  readonly leaseOwner: string;
  readonly leaseToken: string;
  readonly leaseExpiresAt: Date;
  readonly stateVersion: number;
  readonly activeAttemptDispatchedAt: null;
  readonly providerDispatchedAt: Date | null;
  readonly claimedContext: OpaqueClaimedContextStageV1;
}

export function constructPreDispatchClaimedRunV2(input: {
  readonly row: unknown;
  readonly applicationRegistry: ClaimedApplicationRuntimeRegistryV1;
}): AiServiceResult<PreDispatchClaimedRunV2> {
  const parsed = rowSchema.safeParse(input.row);
  if (!parsed.success) return aiFailure("claimed_run_required");
  const row = parsed.data;
  if (!jsonObject(row.parametersSnapshotJson) || !jsonObject(row.inputContextJson) ||
    !Array.isArray(row.inputSourcesJson) || !row.inputSourcesJson.every(jsonValue)) {
    return aiFailure("claimed_run_required");
  }
  const parametersSnapshot = copyJsonObject(row.parametersSnapshotJson);
  const inputContext = claimedDraftContextInAcceptedOrder(row.inputContextJson);
  const inputSources = Object.freeze(row.inputSourcesJson.map(copyJsonValue));
  const controlledIdentity = controlledValidationIdentity(inputSources);
  if (!controlledIdentity.ok) return controlledIdentity;
  if (row.actualProvider !== null && row.actualProvider !== row.requestedProvider) {
    return aiFailure("config_provenance_mismatch");
  }
  if ((row.actualProvider === null) !== (row.providerDispatchedAt === null)) {
    return aiFailure("config_provenance_mismatch");
  }
  if (row.attemptCount > row.maxAttempts) return aiFailure("claimed_run_required");
  const runtime = input.applicationRegistry.resolve({
    applicationClass: row.applicationClass,
    capability: "text",
    useCase: row.useCase,
    inputSchemaVersion: row.inputSchemaVersion,
    outputSchemaVersion: row.outputSchemaVersion,
    policyVersion: row.policyVersion,
  });
  if (!runtime.ok) return runtime;
  const association = runtime.value.decodeClaimedAssociation(row);
  if (!association.ok) {
    return aiFailure("association_provenance_mismatch");
  }
  const targetOwnerAuthority: ClaimedTargetOwnerAuthorityV1 = Object.freeze(row.claimAuthority);
  const claimedContext = runtime.value.decodeClaimedContext(inputContext, targetOwnerAuthority);
  if (!claimedContext.ok) return claimedContext;
  const associationIntegrity = claimedContext.value.verifyAssociationIntegrity(association.value);
  if (!associationIntegrity.ok || association.value.snapshotHash !== row.targetSnapshotHash) {
    return aiFailure("association_provenance_mismatch");
  }
  const contextHash = canonicalJsonHash(inputContext);
  if (!contextHash.ok || contextHash.value.hash !== row.inputHash ||
    claimedContext.value.preparedContext.inputHash !== row.inputHash) {
    return aiFailure("context_provenance_mismatch");
  }
  const configHash = resolvedConfigHashV1({
    applicationClass: row.applicationClass,
    capability: "text",
    useCase: row.useCase,
    modelConfigId: row.modelConfigId,
    modelConfigVersion: row.modelConfigVersion,
    requestedProvider: row.requestedProvider,
    requestedModel: row.requestedModel,
    parametersSnapshot,
    maxInputTokens: row.maxInputTokens,
    maxOutputTokens: row.maxOutputTokens,
    maxAttempts: row.maxAttempts,
    runCostLimitMicrousd: row.runCostLimitMicrousd,
    promptId: row.promptId,
    promptVersion: row.promptVersion,
    promptHash: row.promptHash,
    providerEnvelope: {
      version: row.providerEnvelopeVersion,
      hash: row.providerEnvelopeHash,
    },
    inputSchemaVersion: row.inputSchemaVersion,
    outputSchemaVersion: row.outputSchemaVersion,
    policyVersion: row.policyVersion,
  });
  if (!configHash.ok || configHash.value.hash !== row.resolvedConfigHash) {
    return aiFailure("config_provenance_mismatch");
  }
  const claimed: PreDispatchClaimedRunV2 = Object.freeze({
    [claimedRunBrand]: claimedRunMarker(),
    version: 2,
    runId: row.runId,
    applicationClass: row.applicationClass,
    capability: "text",
    useCase: row.useCase,
    idempotencyKey: row.idempotencyKey,
    requestFingerprintVersion: 1,
    requestFingerprint: row.requestFingerprint,
    applicationAssociation: association.value,
    targetSnapshotHash: row.targetSnapshotHash,
    modelConfigId: row.modelConfigId,
    modelConfigVersion: row.modelConfigVersion,
    resolvedConfigHash: row.resolvedConfigHash,
    requestedProvider: row.requestedProvider,
    actualProvider: row.actualProvider,
    requestedModel: row.requestedModel,
    parametersSnapshot,
    maxInputTokens: row.maxInputTokens,
    maxOutputTokens: row.maxOutputTokens,
    maxAttempts: row.maxAttempts,
    runCostLimitMicrousd: row.runCostLimitMicrousd,
    promptId: row.promptId,
    promptVersion: row.promptVersion,
    promptHash: row.promptHash,
    providerEnvelopeVersion: row.providerEnvelopeVersion,
    providerEnvelopeHash: row.providerEnvelopeHash,
    inputSchemaVersion: row.inputSchemaVersion,
    outputSchemaId: runtime.value.outputSchemaId,
    outputSchemaVersion: row.outputSchemaVersion,
    policyVersion: row.policyVersion,
    inputContext,
    inputSources,
    inputHash: row.inputHash,
    controlledValidationIdentity: controlledIdentity.value,
    status: "processing",
    retryState: "none",
    attemptCount: row.attemptCount,
    leaseOwner: row.leaseOwner,
    leaseToken: row.leaseToken,
    leaseExpiresAt: row.leaseExpiresAt,
    stateVersion: row.stateVersion,
    activeAttemptDispatchedAt: row.activeAttemptDispatchedAt,
    providerDispatchedAt: row.providerDispatchedAt,
    claimedContext: claimedContext.value,
  });
  return aiSuccess(claimed);
}
