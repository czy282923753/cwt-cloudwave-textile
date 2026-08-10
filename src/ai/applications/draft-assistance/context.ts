import { z } from "zod";

import type { PgQueryResultHKT } from "drizzle-orm/pg-core/session";

import type { ApplicationContextPolicy } from "@/ai/applications/contracts";
import {
  canonicalJsonHash,
  type JsonPrimitive,
  type ReadonlyJsonObject,
  type ReadonlyJsonValue,
} from "@/ai/canonical-json";
import type {
  ProductContextField,
  ReconstructibleSourceEntryV1,
  ReconstructibleSourceFieldV1,
  SourceProvenanceV1,
} from "@/ai/context/contracts";
import {
  protectedDataClassifierV1,
  selectedProtectedDataRegistryIdentityV1,
} from "@/ai/context/protected-data";
import type { SafeInputSourceReferenceV1 } from "@/ai/core/contracts";
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
const utf8Length = (value: string): number => Buffer.byteLength(value, "utf8");
const unicodeScalars = (value: string): number => Array.from(value).length;

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
    primaryPhrase: z.string().min(1).max(200).optional(),
    topic: z.string().min(1).max(300).optional(),
    guideIntent: z.string().min(1).max(500).optional(),
  }).strict(),
  sources: z.array(sourceEntrySchema).max(32),
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

const companyFieldOrder = [
  "factKey", "subject", "statement", "relationshipToCwt",
] as const;
const productSelectorFieldOrder = [
  "name", "primaryCategoryLabel", "additionalCategoryLabels",
  "applicationLabels", "composition", "weightGsm", "widthCm", "moqPair",
  "fabricStyle", "colorOptions", "moqNote", "customAvailable",
  "sampleAvailable",
] as const satisfies readonly ProductContextField[];
const productSerializedFieldOrder = [
  "name", "primaryCategoryLabel", "additionalCategoryLabels",
  "applicationLabels", "composition", "weightGsm", "widthCm", "moqValue",
  "moqUnit", "fabricStyle", "colorOptions", "moqNote", "customAvailable",
  "sampleAvailable",
] as const;
const fabricFieldOrder = ["title", "excerpt", "narrativeText"] as const;
const decimalPattern = /^(?:[1-9]\d*(?:\.\d*[1-9])?|0\.\d*[1-9])$/;
const moqUnits = new Set(["m", "kg", "roll", "yd"]);

function containsExactly<T>(values: readonly T[], candidate: T): boolean {
  return values.includes(candidate);
}

function canonicalSize(value: unknown): number | undefined {
  const canonical = canonicalJsonHash(value);
  return canonical.ok ? utf8Length(canonical.value.canonicalJson) : undefined;
}

function boundedNonblankString(
  value: ReadonlyJsonValue,
  maximumScalars: number,
  maximumBytes: number,
): value is string {
  return typeof value === "string" && value.trim().length > 0 &&
    unicodeScalars(value) <= maximumScalars && utf8Length(value) <= maximumBytes;
}

function boundedLabelArray(value: ReadonlyJsonValue): value is readonly string[] {
  return Array.isArray(value) && value.length > 0 && value.length <= 16 &&
    value.every((member) => boundedNonblankString(member, 200, 800)) &&
    new Set(value).size === value.length;
}

function isReadonlyJsonObject(value: ReadonlyJsonValue): value is ReadonlyJsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

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

function serializedField(
  alias: string,
  field: string,
  provenance: SourceProvenanceV1,
  value: ReconstructibleSourceFieldV1["value"],
): ReconstructibleSourceFieldV1 {
  return { field, ref: `${alias}:${field}`, provenance, value };
}

function serializeProductField(
  alias: string,
  field: ProductContextField,
  sourceField: DraftContextSourceDtoV1["fields"][number],
): AiServiceResult<readonly ReconstructibleSourceFieldV1[]> {
  const provenance = sourceField.provenance;
  const value = sourceField.value;
  switch (field) {
    case "name":
      return provenance === "structural" && boundedNonblankString(value, 300, 1_024)
        ? aiSuccess([serializedField(alias, field, provenance, value)])
        : aiFailure("context_field_ineligible");
    case "primaryCategoryLabel":
      return provenance === "structural" && boundedNonblankString(value, 200, 800)
        ? aiSuccess([serializedField(alias, field, provenance, value)])
        : aiFailure("context_field_ineligible");
    case "additionalCategoryLabels":
    case "applicationLabels":
      return provenance === "structural" && boundedLabelArray(value)
        ? aiSuccess([serializedField(alias, field, provenance, value)])
        : aiFailure("context_field_ineligible");
    case "composition":
      return (provenance === "provided" || provenance === "verified") &&
        boundedNonblankString(value, 2_000, 8_192)
        ? aiSuccess([serializedField(alias, field, provenance, value)])
        : aiFailure("context_field_ineligible");
    case "weightGsm":
    case "widthCm":
      return (provenance === "provided" || provenance === "verified") &&
        typeof value === "string" && decimalPattern.test(value)
        ? aiSuccess([serializedField(alias, field, provenance, value)])
        : aiFailure("context_field_ineligible");
    case "moqPair": {
      if ((provenance !== "provided" && provenance !== "verified") ||
        !isReadonlyJsonObject(value) ||
        Object.keys(value).length !== 2 ||
        !Object.hasOwn(value, "moqValue") || !Object.hasOwn(value, "moqUnit")) {
        return aiFailure("context_field_ineligible");
      }
      const moqValue = value.moqValue;
      const moqUnit = value.moqUnit;
      if (typeof moqValue !== "string" || !decimalPattern.test(moqValue) ||
        typeof moqUnit !== "string" || !moqUnits.has(moqUnit)) {
        return aiFailure("context_field_ineligible");
      }
      return aiSuccess([
        serializedField(alias, "moqValue", provenance, moqValue),
        serializedField(alias, "moqUnit", provenance, moqUnit),
      ]);
    }
    case "fabricStyle":
      return provenance === "provided" && boundedNonblankString(value, 500, 2_000)
        ? aiSuccess([serializedField(alias, field, provenance, value)])
        : aiFailure("context_field_ineligible");
    case "colorOptions":
      return provenance === "provided" && boundedNonblankString(value, 2_048, 2_048)
        ? aiSuccess([serializedField(alias, field, provenance, value)])
        : aiFailure("context_field_ineligible");
    case "moqNote":
      return provenance === "provided" && boundedNonblankString(value, 1_024, 1_024)
        ? aiSuccess([serializedField(alias, field, provenance, value)])
        : aiFailure("context_field_ineligible");
    case "customAvailable":
    case "sampleAvailable":
      return provenance === "provided" && (value === "yes" || value === "no")
        ? aiSuccess([serializedField(alias, field, provenance, value)])
        : aiFailure("context_field_ineligible");
  }
}

function serializeSelectedSource(
  alias: string,
  source: DraftContextSourceDtoV1,
  selection: Exclude<
    DraftAssistanceCommandV1["contextSelections"][number],
    { readonly sourceClass: "explicit_human_input" }
  >,
): AiServiceResult<ReconstructibleSourceEntryV1> {
  if (source.sourceClass !== selection.sourceClass || selection.fields.length === 0 ||
    new Set(selection.fields).size !== selection.fields.length ||
    source.fields.length !== selection.fields.length ||
    new Set(source.fields.map((field) => field.field)).size !== source.fields.length ||
    canonicalSize(source.sourceIdentity) === undefined) {
    return aiFailure("context_field_forbidden");
  }
  const selected = new Set<string>(selection.fields);
  const returned = new Map(source.fields.map((field) => [field.field, field]));
  if (Array.from(returned.keys()).some((field) => !selected.has(field))) {
    return aiFailure("context_field_forbidden");
  }
  const fields: ReconstructibleSourceFieldV1[] = [];
  if (source.sourceClass === "product_structured") {
    for (const field of productSelectorFieldOrder) {
      if (!selected.has(field)) continue;
      const sourceField = returned.get(field);
      if (sourceField === undefined) return aiFailure("context_field_forbidden");
      const serialized = serializeProductField(alias, field, sourceField);
      if (!serialized.ok) return serialized;
      fields.push(...serialized.value);
    }
  } else {
    const fieldOrder = source.sourceClass === "public_company_fact"
      ? companyFieldOrder : fabricFieldOrder;
    if (selection.fields.some((field) => !containsExactly(fieldOrder, field))) {
      return aiFailure("context_field_forbidden");
    }
    for (const field of fieldOrder) {
      if (!selected.has(field)) continue;
      const sourceField = returned.get(field);
      if (sourceField === undefined || typeof sourceField.value !== "string" ||
        sourceField.value.trim().length === 0) {
        return aiFailure("context_field_ineligible");
      }
      if (source.sourceClass === "public_company_fact") {
        if (sourceField.provenance !== "verified" ||
          (field === "statement" && utf8Length(sourceField.value) > 2 * 1_024)) {
          return aiFailure("context_field_ineligible");
        }
      } else if (sourceField.provenance !== "provided" &&
        sourceField.provenance !== "verified") {
        return aiFailure("context_field_ineligible");
      }
      fields.push(serializedField(alias, field, sourceField.provenance, sourceField.value));
    }
  }
  if (fields.length === 0) return aiFailure("context_field_forbidden");
  return aiSuccess({
    alias,
    sourceClass: source.sourceClass,
    selectedBy: "request_actor",
    fields,
  });
}

function orderedFieldsMatch(
  fields: readonly ReconstructibleSourceFieldV1[],
  order: readonly string[],
): boolean {
  let previous = -1;
  for (const field of fields) {
    const position = order.indexOf(field.field);
    if (position <= previous) return false;
    previous = position;
  }
  return true;
}

function serializedSourceIsEligible(source: ReconstructibleSourceEntryV1): boolean {
  if (source.sourceClass === "explicit_human_input") {
    const field = source.fields[0];
    return source.fields.length === 1 && field !== undefined && field.field === "text" &&
      field.provenance === "provided" && typeof field.value === "string" &&
      field.value.trim().length > 0 && utf8Length(field.value) <= 8 * 1_024;
  }
  if (source.sourceClass === "public_company_fact") {
    return orderedFieldsMatch(source.fields, companyFieldOrder) && source.fields.every((field) =>
      field.provenance === "verified" && typeof field.value === "string" &&
      field.value.trim().length > 0 &&
      (field.field !== "statement" || utf8Length(field.value) <= 2 * 1_024));
  }
  if (source.sourceClass === "fabric_knowledge") {
    return orderedFieldsMatch(source.fields, fabricFieldOrder) && source.fields.every((field) =>
      (field.provenance === "provided" || field.provenance === "verified") &&
      typeof field.value === "string" && field.value.trim().length > 0);
  }
  if (!orderedFieldsMatch(source.fields, productSerializedFieldOrder)) return false;
  for (let index = 0; index < source.fields.length; index += 1) {
    const field = source.fields[index];
    if (field === undefined) return false;
    if (field.field === "moqValue") {
      const unit = source.fields[index + 1];
      if (unit === undefined || unit.field !== "moqUnit" ||
        unit.provenance !== field.provenance ||
        typeof field.value !== "string" || !decimalPattern.test(field.value) ||
        typeof unit.value !== "string" || !moqUnits.has(unit.value) ||
        (field.provenance !== "provided" && field.provenance !== "verified")) return false;
      index += 1;
      continue;
    }
    if (field.field === "moqUnit") return false;
    const selectorField = productSelectorFieldOrder.find((candidate) => candidate === field.field);
    if (selectorField === undefined) return false;
    const validated = serializeProductField(source.alias, selectorField, {
      field: selectorField,
      provenance: field.provenance,
      value: field.value,
    });
    if (!validated.ok || validated.value.length !== 1) return false;
  }
  return true;
}

function taskContractIsValid(
  context: z.infer<typeof reconstructibleContextSchema>,
): boolean {
  const task = context.task;
  if (task.pageIntent !== undefined && utf8Length(task.pageIntent) > 500) return false;
  if (task.primaryPhrase !== undefined && utf8Length(task.primaryPhrase) > 200) return false;
  if (task.topic !== undefined && utf8Length(task.topic) > 300) return false;
  if (task.guideIntent !== undefined && utf8Length(task.guideIntent) > 500) return false;
  switch (context.useCase) {
    case "seo_content_draft":
      return task.topic === undefined && task.guideIntent === undefined;
    case "fabric_knowledge_draft":
      return task.pageIntent === undefined && task.primaryPhrase === undefined &&
        task.guideIntent === undefined;
    case "product_description_draft":
      return task.pageIntent === undefined && task.primaryPhrase === undefined &&
        task.topic === undefined && task.guideIntent === undefined;
    case "sourcing_guide_draft":
      return task.pageIntent === undefined && task.primaryPhrase === undefined &&
        task.topic === undefined;
  }
}

function contextLimitsAreValid(context: ReconstructibleDraftContextV1): boolean {
  const company = context.sources.filter((source) => source.sourceClass === "public_company_fact");
  const product = context.sources.filter((source) => source.sourceClass === "product_structured");
  const fabric = context.sources.filter((source) => source.sourceClass === "fabric_knowledge");
  const explicit = context.sources.filter((source) => source.sourceClass === "explicit_human_input");
  const companySize = canonicalSize(company);
  const productSize = canonicalSize(product);
  const fabricSize = canonicalSize(fabric);
  const explicitSize = canonicalSize(explicit);
  const contextSize = canonicalSize(context);
  const linkSize = canonicalSize(context.internalLinkCandidates);
  const mediaSize = canonicalSize(context.mediaPlacementRefs);
  if (companySize === undefined || productSize === undefined || fabricSize === undefined ||
    explicitSize === undefined || contextSize === undefined || linkSize === undefined ||
    mediaSize === undefined) return false;
  if (company.length > 20 || companySize > 16 * 1_024 ||
    product.reduce((count, source) => count + source.fields.length, 0) > 32 ||
    productSize > 16 * 1_024 || fabric.length > 8 || fabricSize > 48 * 1_024 ||
    fabric.some((source) => (canonicalSize(source) ?? Number.POSITIVE_INFINITY) > 8 * 1_024) ||
    explicit.length > 1 || explicitSize > 16 * 1_024 || contextSize > 64 * 1_024 ||
    linkSize > 8 * 1_024 || mediaSize > 8 * 1_024) return false;
  const selectedSourcesSize = canonicalSize(context.sources);
  return selectedSourcesSize !== undefined &&
    (context.useCase !== "product_description_draft" || selectedSourcesSize <= 48 * 1_024);
}

function strictContext(input: unknown): AiServiceResult<ReconstructibleDraftContextV1> {
  const parsed = reconstructibleContextSchema.safeParse(input);
  if (!parsed.success || !taskContractIsValid(parsed.data)) {
    return aiFailure("context_provenance_mismatch");
  }
  const refs = new Set<string>();
  for (const [sourceIndex, source] of parsed.data.sources.entries()) {
    if (source.alias !== `src_${String(sourceIndex + 1).padStart(2, "0")}` ||
      !sourceAllowed(parsed.data.useCase, source.sourceClass, parsed.data.association.targetType) ||
      !serializedSourceIsEligible(source)) {
      return aiFailure("context_provenance_mismatch");
    }
    for (const field of source.fields) {
      if (field.ref !== `${source.alias}:${field.field}` || refs.has(field.ref)) {
        return aiFailure("context_provenance_mismatch");
      }
      refs.add(field.ref);
    }
  }
  const task: Record<string, ReadonlyJsonValue> = { tone: parsed.data.task.tone };
  if (parsed.data.task.pageIntent !== undefined) task.pageIntent = parsed.data.task.pageIntent;
  if (parsed.data.task.primaryPhrase !== undefined) task.primaryPhrase = parsed.data.task.primaryPhrase;
  if (parsed.data.task.topic !== undefined) task.topic = parsed.data.task.topic;
  if (parsed.data.task.guideIntent !== undefined) task.guideIntent = parsed.data.task.guideIntent;
  const context: ReconstructibleDraftContextV1 = { ...parsed.data, task };
  if (!contextLimitsAreValid(context)) return aiFailure("context_too_large");
  const classification = protectedDataClassifierV1.classify(context);
  if (classification.kind !== "allow") return aiFailure("context_prohibited_data");
  return aiSuccess(context);
}

export interface AllowedEvidenceFieldV1 {
  readonly alias: string;
  readonly field: string;
  readonly value: ReadonlyJsonValue;
}

export function deriveAllowedEvidenceFieldsV1(
  context: ReconstructibleDraftContextV1,
): AiServiceResult<ReadonlyMap<string, AllowedEvidenceFieldV1>> {
  const validated = strictContext(context);
  if (!validated.ok) return validated;
  const fields = new Map<string, AllowedEvidenceFieldV1>();
  for (const source of validated.value.sources) {
    for (const field of source.fields) {
      fields.set(field.ref, {
        alias: source.alias,
        field: field.field,
        value: field.value,
      });
    }
  }
  return aiSuccess(fields);
}

function promptVariables(
  context: ReconstructibleDraftContextV1,
): AiServiceResult<import("@/ai/core/contracts").PromptVariablesV1> {
  const selectedContext: ReadonlyJsonValue = context.sources;
  switch (context.useCase) {
    case "seo_content_draft":
      return aiSuccess({
        locale: "en",
        page_intent: typeof context.task.pageIntent === "string" ? context.task.pageIntent : "",
        primary_phrase: typeof context.task.primaryPhrase === "string" ? context.task.primaryPhrase : "",
        selected_context_json: selectedContext,
        internal_link_candidates_json: context.internalLinkCandidates,
        requested_tone: context.task.tone ?? "concise_professional_b2b",
      });
    case "fabric_knowledge_draft":
      return aiSuccess({
        locale: "en",
        topic: typeof context.task.topic === "string" ? context.task.topic : "",
        selected_context_json: selectedContext,
        requested_tone: context.task.tone ?? "neutral_editorial",
      });
    case "product_description_draft":
      return aiSuccess({
        locale: "en",
        product_context_json: selectedContext,
        media_placement_refs_json: context.mediaPlacementRefs,
        requested_tone: context.task.tone ?? "concise_professional_b2b",
      });
    case "sourcing_guide_draft":
      return aiSuccess({
        locale: "en",
        guide_intent: typeof context.task.guideIntent === "string" ? context.task.guideIntent : "",
        selected_context_json: selectedContext,
        requested_tone: context.task.tone ?? "concise_professional_b2b",
      });
  }
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
  const preparedSources = new WeakMap<
    ReconstructibleDraftContextV1,
    readonly SafeInputSourceReferenceV1[]
  >();
  return {
    contextPolicyId: "ctx.draft-assistance.v1",
    async buildReconstructibleContext(input) {
      const sources: ReconstructibleSourceEntryV1[] = [];
      const inputSources: SafeInputSourceReferenceV1[] = [];
      const selectedIdentities = new Set<string>();
      let explicitCount = 0;
      for (const selection of input.command.contextSelections) {
        if (!sourceAllowed(input.command.useCase, selection.sourceClass, input.association.association.targetType)) {
          return aiFailure("context_source_forbidden");
        }
        const identity = selection.sourceClass === "explicit_human_input"
          ? `${selection.sourceClass}:${selection.origin}`
          : `${selection.sourceClass}:${selection.sourceId}`;
        if (selectedIdentities.has(identity)) return aiFailure("context_source_forbidden");
        selectedIdentities.add(identity);
        const alias = `src_${String(sources.length + 1).padStart(2, "0")}`;
        if (selection.sourceClass === "explicit_human_input") {
          explicitCount += 1;
          if (explicitCount > 1 || input.command.explicitInput === undefined ||
            input.command.explicitInput.trim().length === 0 ||
            utf8Length(input.command.explicitInput) > 8 * 1_024) {
            return aiFailure("context_field_ineligible");
          }
          const entry: ReconstructibleSourceEntryV1 = {
            alias,
            sourceClass: "explicit_human_input",
            selectedBy: "request_actor",
            fields: [serializedField(alias, "text", "provided", input.command.explicitInput)],
          };
          sources.push(entry);
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
        const entry = serializeSelectedSource(alias, read.value, selection);
        if (!entry.ok) return entry;
        sources.push(entry.value);
        inputSources.push({
          alias,
          sourceClass: read.value.sourceClass,
          sourceIdentity: read.value.sourceIdentity,
          selectedFields: entry.value.fields.map((field) => field.field),
          fieldProvenance: entry.value.fields.map((field) => ({
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
      const inputSourcesSize = canonicalSize(inputSources);
      if (inputSourcesSize === undefined || inputSourcesSize > 32 * 1_024) {
        return aiFailure("context_too_large");
      }
      preparedSources.set(validated.value, inputSources);
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
      const inputSources = preparedSources.get(context) ?? [];
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
          source_refs: validated.value.sources.map((source) => source.alias),
        },
      });
    },
    parseDurableContext(input) {
      return strictContext(input);
    },
    buildPromptVariables(context) {
      const validated = strictContext(context);
      return validated.ok ? promptVariables(validated.value) : validated;
    },
  };
}
