import { z } from "zod";

import type { PgQueryResultHKT } from "drizzle-orm/pg-core/session";

import type { ApplicationContextPolicy } from "@/ai/applications/contracts";
import {
  canonicalJsonHash,
  sha256Hex,
  type JsonPrimitive,
  type ReadonlyJsonObject,
  type ReadonlyJsonValue,
} from "@/ai/canonical-json";
import type {
  ProductContextField,
  ReconstructibleSourceEntryV1,
  SourceProvenanceV1,
} from "@/ai/context/contracts";
import {
  protectedDataClassifierV1,
  selectedProtectedDataRegistryIdentityV1,
} from "@/ai/context/protected-data";
import { aiFailure, aiSuccess, type AiServiceResult } from "@/ai/errors";

import type {
  DraftAssistanceCommandV1,
  DraftDurableAssociationWithoutHashV1,
  ProductionAiUseCase,
} from "./contracts";
import type { DraftConsistentReadScope } from "./read-scopes";

const lowercaseHash = z.string().regex(/^[0-9a-f]{64}$/);
const sourceAlias = z.string().regex(/^src_[0-9]{2}$/);
const sourceRef = z.string().regex(/^src_[0-9]{2}:[a-z][A-Za-z0-9_]{0,63}$/);
const utf8Length = (value: string) => Buffer.byteLength(value, "utf8");

const jsonPrimitiveSchema = z.union([
  z.null(), z.boolean(), z.number().finite(), z.string(),
]);
const sourceValueSchema = z.union([
  jsonPrimitiveSchema,
  z.array(jsonPrimitiveSchema),
  z.record(z.string(), jsonPrimitiveSchema),
]);
const sourceFieldSchema = z.object({
  field: z.string().regex(/^[a-z][A-Za-z0-9_]{0,63}$/),
  ref: sourceRef,
  provenance: z.enum(["structural", "provided", "verified"]),
  value: sourceValueSchema,
}).strict();
const sourceEntrySchema = z.object({
  alias: sourceAlias,
  sourceClass: z.enum([
    "public_company_fact", "product_structured", "fabric_knowledge",
    "explicit_human_input",
  ]),
  selectedBy: z.literal("request_actor"),
  fields: z.array(sourceFieldSchema).min(1).max(32),
}).strict();

const reconstructibleContextSchema = z.object({
  version: z.literal(1),
  applicationClass: z.literal("draft_assistance"),
  capability: z.literal("text"),
  useCase: z.enum([
    "seo_content_draft", "fabric_knowledge_draft",
    "product_description_draft", "sourcing_guide_draft",
  ]),
  locale: z.literal("en"),
  association: z.object({
    kind: z.literal("draft_target.v1"),
    targetType: z.enum(["product_draft", "content_draft", "editorial_revision"]),
    targetAlias: z.literal("target_01"),
    expectedVersion: z.number().int().min(1).max(2_147_483_647),
    snapshotHash: lowercaseHash,
  }).strict(),
  task: z.object({
    tone: z.enum(["concise_professional_b2b", "neutral_editorial"]),
    pageIntent: z.string().min(1).max(500).optional(),
    primaryPhrase: z.string().min(1).max(300).optional(),
    topic: z.string().min(1).max(500).optional(),
    guideIntent: z.string().min(1).max(500).optional(),
  }).strict(),
  sources: z.array(sourceEntrySchema).max(99),
  internalLinkCandidates: z.array(z.object({
    candidateRef: z.string().regex(/^link_[0-9]{2}$/),
    label: z.string().min(1).max(300),
  }).strict()).max(32),
  mediaPlacementRefs: z.array(z.string().regex(/^media_[0-9]{2}$/)).max(32),
}).strict();

export interface ReconstructibleDraftContextV1 extends ReadonlyJsonObject {
  readonly version: 1;
  readonly applicationClass: "draft_assistance";
  readonly capability: "text";
  readonly useCase: ProductionAiUseCase;
  readonly locale: "en";
  readonly association: ReadonlyJsonObject & {
    readonly kind: "draft_target.v1";
    readonly targetType: "product_draft" | "content_draft" | "editorial_revision";
    readonly targetAlias: "target_01";
    readonly expectedVersion: number;
    readonly snapshotHash: string;
  };
  readonly task: ReadonlyJsonObject;
  readonly sources: readonly ReconstructibleSourceEntryV1[];
  readonly internalLinkCandidates: readonly (ReadonlyJsonObject & {
    readonly candidateRef: string;
    readonly label: string;
  })[];
  readonly mediaPlacementRefs: readonly string[];
}

export interface DraftContextSourceDtoV1 {
  readonly sourceClass:
    | "public_company_fact"
    | "product_structured"
    | "fabric_knowledge";
  readonly sourceIdentity: ReadonlyJsonObject;
  readonly fields: readonly {
    readonly field: string;
    readonly provenance: SourceProvenanceV1;
    readonly value:
      | JsonPrimitive
      | readonly JsonPrimitive[]
      | ReadonlyJsonObject;
  }[];
}

export interface DraftContextReadRepository<
  TQueryResult extends PgQueryResultHKT,
> {
  readSelectedSource(input: {
    readonly scope: DraftConsistentReadScope<TQueryResult>;
    readonly actor: import("@/ai/core/contracts").CoreAiActorV1;
    readonly command: DraftAssistanceCommandV1;
    readonly selector: Exclude<
      DraftAssistanceCommandV1["contextSelections"][number],
      { readonly sourceClass: "explicit_human_input" }
    >;
  }): Promise<AiServiceResult<DraftContextSourceDtoV1>>;
}

const productFields: ReadonlySet<string> = new Set<ProductContextField>([
  "name", "primaryCategoryLabel", "additionalCategoryLabels",
  "applicationLabels", "composition", "weightGsm", "widthCm", "moqPair",
  "fabricStyle", "colorOptions", "moqNote", "customAvailable",
  "sampleAvailable",
]);

function sourceAllowed(
  useCase: ProductionAiUseCase,
  sourceClass: DraftAssistanceCommandV1["contextSelections"][number]["sourceClass"],
  targetType: DraftDurableAssociationWithoutHashV1["targetType"],
): boolean {
  switch (useCase) {
    case "seo_content_draft":
      return sourceClass === "explicit_human_input" ||
        sourceClass === "fabric_knowledge" ||
        sourceClass === "public_company_fact" ||
        (sourceClass === "product_structured" && targetType === "product_draft");
    case "fabric_knowledge_draft":
    case "product_description_draft":
      return sourceClass === "explicit_human_input" ||
        sourceClass === "fabric_knowledge" || sourceClass === "product_structured";
    case "sourcing_guide_draft":
      return sourceClass === "explicit_human_input" ||
        sourceClass === "fabric_knowledge" || sourceClass === "public_company_fact";
  }
}

function validateSourceSelection(
  command: DraftAssistanceCommandV1,
  source: DraftContextSourceDtoV1,
  selection: DraftAssistanceCommandV1["contextSelections"][number],
): boolean {
  if (selection.sourceClass === "explicit_human_input" || source.sourceClass !== selection.sourceClass) return false;
  if (source.fields.length !== selection.fields.length) return false;
  for (let index = 0; index < source.fields.length; index += 1) {
    const field = source.fields[index];
    const selected = selection.fields[index];
    if (field === undefined || selected === undefined || field.field !== selected) return false;
    if (source.sourceClass === "product_structured" && !productFields.has(selected)) return false;
  }
  return sourceAllowed(command.useCase, source.sourceClass, command.target.type);
}

function sourceLimitIsValid(source: DraftContextSourceDtoV1): boolean {
  const encoded = JSON.stringify(source.fields);
  if (utf8Length(encoded) > 16 * 1024 || source.fields.length > 32) return false;
  if (source.sourceClass === "public_company_fact") {
    return source.fields.length <= 20 && source.fields.every((field) =>
      field.field !== "statement" ||
      (typeof field.value === "string" && utf8Length(field.value) <= 2 * 1024));
  }
  if (source.sourceClass === "fabric_knowledge") {
    return utf8Length(encoded) <= 8 * 1024;
  }
  return true;
}

function strictContext(input: unknown): AiServiceResult<ReconstructibleDraftContextV1> {
  const parsed = reconstructibleContextSchema.safeParse(input);
  if (!parsed.success) return aiFailure("context_provenance_mismatch");
  const refs = new Set<string>();
  for (const [sourceIndex, source] of parsed.data.sources.entries()) {
    if (source.alias !== `src_${String(sourceIndex + 1).padStart(2, "0")}`) {
      return aiFailure("context_provenance_mismatch");
    }
    for (const field of source.fields) {
      if (field.ref !== `${source.alias}:${field.field}` || refs.has(field.ref)) {
        return aiFailure("context_provenance_mismatch");
      }
      refs.add(field.ref);
    }
  }
  const classification = protectedDataClassifierV1.classify(parsed.data);
  if (classification.kind !== "allow") return aiFailure("context_prohibited_data");
  const task: Record<string, ReadonlyJsonValue> = {
    tone: parsed.data.task.tone,
  };
  if (parsed.data.task.pageIntent !== undefined) task.pageIntent = parsed.data.task.pageIntent;
  if (parsed.data.task.primaryPhrase !== undefined) task.primaryPhrase = parsed.data.task.primaryPhrase;
  if (parsed.data.task.topic !== undefined) task.topic = parsed.data.task.topic;
  if (parsed.data.task.guideIntent !== undefined) task.guideIntent = parsed.data.task.guideIntent;
  return aiSuccess({
    ...parsed.data,
    task,
  });
}

export function createDraftContextPolicy<
  TQueryResult extends PgQueryResultHKT,
>(
  repository: DraftContextReadRepository<TQueryResult>,
): ApplicationContextPolicy<
  DraftAssistanceCommandV1,
  DraftDurableAssociationWithoutHashV1,
  ReconstructibleDraftContextV1,
  DraftConsistentReadScope<TQueryResult>
> {
  return {
    contextPolicyId: "ctx.draft-assistance.v1",
    async buildReconstructibleContext(input) {
      const sources: ReconstructibleSourceEntryV1[] = [];
      const inputSources: import("@/ai/core/contracts").SafeInputSourceReferenceV1[] = [];
      let explicitCount = 0;
      for (const selection of input.command.contextSelections) {
        if (!sourceAllowed(input.command.useCase, selection.sourceClass, input.association.association.targetType)) {
          return aiFailure("context_source_forbidden");
        }
        const alias = `src_${String(sources.length + 1).padStart(2, "0")}`;
        if (selection.sourceClass === "explicit_human_input") {
          explicitCount += 1;
          if (explicitCount > 1 || input.command.explicitInput === undefined ||
            utf8Length(input.command.explicitInput) > 8 * 1024) {
            return aiFailure("context_too_large");
          }
          sources.push({
            alias,
            sourceClass: "explicit_human_input",
            selectedBy: "request_actor",
            fields: [{
              field: "text",
              ref: `${alias}:text`,
              provenance: "provided",
              value: input.command.explicitInput,
            }],
          });
          inputSources.push({
            alias,
            sourceClass: "explicit_human_input",
            sourceIdentity: { origin: selection.origin },
            selectedFields: ["text"],
            fieldProvenance: [{ field: "text", provenance: "provided" }],
          });
          continue;
        }
        const read = await repository.readSelectedSource({
          scope: input.scope,
          actor: input.actor,
          command: input.command,
          selector: selection,
        });
        if (!read.ok) return read;
        if (!validateSourceSelection(input.command, read.value, selection)) {
          return aiFailure("context_field_forbidden");
        }
        if (!sourceLimitIsValid(read.value)) return aiFailure("context_too_large");
        const fields = read.value.fields.map((field) => ({
          field: field.field,
          ref: `${alias}:${field.field}`,
          provenance: field.provenance,
          value: field.value,
        }));
        sources.push({
          alias,
          sourceClass: read.value.sourceClass,
          selectedBy: "request_actor",
          fields,
        });
        inputSources.push({
          alias,
          sourceClass: read.value.sourceClass,
          sourceIdentity: read.value.sourceIdentity,
          selectedFields: fields.map((field) => field.field),
          fieldProvenance: fields.map((field) => ({
            field: field.field,
            provenance: field.provenance,
          })),
        });
      }
      if (input.command.explicitInput !== undefined && explicitCount === 0) {
        return aiFailure("context_source_forbidden");
      }
      const context = {
        version: 1,
        applicationClass: "draft_assistance",
        capability: "text",
        useCase: input.command.useCase,
        locale: "en",
        association: {
          kind: "draft_target.v1",
          targetType: input.association.association.targetType,
          targetAlias: "target_01",
          expectedVersion: input.association.association.expectedTargetVersion,
          snapshotHash: input.association.snapshotHash,
        },
        task: {
          tone: input.command.useCase === "fabric_knowledge_draft"
            ? "neutral_editorial" : "concise_professional_b2b",
        },
        sources,
        internalLinkCandidates: [],
        mediaPlacementRefs: [],
      } satisfies ReconstructibleDraftContextV1;
      const validated = strictContext(context);
      if (!validated.ok) return validated;
      const encodedSources = JSON.stringify(inputSources);
      const encodedContext = JSON.stringify(validated.value);
      if (utf8Length(encodedSources) > 32 * 1024 || utf8Length(encodedContext) > 64 * 1024) {
        return aiFailure("context_too_large");
      }
      return validated;
    },
    encodePreparedContext(context) {
      const validated = strictContext(context);
      if (!validated.ok) return validated;
      const input = canonicalJsonHash(validated.value);
      if (!input.ok) return aiFailure("canonicalization_failed");
      const explicit = validated.value.sources
        .filter((source) => source.sourceClass === "explicit_human_input")
        .flatMap((source) => source.fields.map((field) => field.value));
      const explicitHash = canonicalJsonHash(explicit);
      if (!explicitHash.ok) return aiFailure("canonicalization_failed");
      const inputSources = validated.value.sources.map((source) => ({
        alias: source.alias,
        sourceClass: source.sourceClass,
        sourceIdentity: { alias: source.alias },
        selectedFields: source.fields.map((field) => field.field),
        fieldProvenance: source.fields.map((field) => ({
          field: field.field,
          provenance: field.provenance,
        })),
      }));
      return aiSuccess({
        version: 1,
        inputSources,
        inputContext: validated.value,
        inputHash: input.value.hash,
        explicitInputHash: explicitHash.value.hash,
        requestFingerprintInput: {
          classifier_registry_id: selectedProtectedDataRegistryIdentityV1.registryId,
          classifier_registry_version: selectedProtectedDataRegistryIdentityV1.registryVersion,
          classifier_registry_hash: selectedProtectedDataRegistryIdentityV1.sha256,
          input_hash: input.value.hash,
          explicit_input_hash: explicitHash.value.hash,
          association_hash: validated.value.association.snapshotHash,
          source_refs: inputSources.map((source) => source.alias),
        },
      });
    },
    parseDurableContext(input) {
      return strictContext(input);
    },
    buildPromptVariables(context) {
      const validated = strictContext(context);
      if (!validated.ok) return validated;
      return aiSuccess({
        context_json: validated.value,
        input_hash: sha256Hex(Buffer.from(JSON.stringify(validated.value), "utf8")),
      });
    },
  };
}
