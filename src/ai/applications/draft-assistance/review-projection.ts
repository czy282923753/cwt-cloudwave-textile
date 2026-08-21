import "server-only";

import type { PgQueryResultHKT } from "drizzle-orm/pg-core/session";
import { z } from "zod";

import {
  canonicalJsonHash,
  type ReadonlyJsonObject,
  type ReadonlyJsonValue,
} from "@/ai/canonical-json";
import { aiFailure, aiSuccess, type AiServiceResult } from "@/ai/errors";
import {
  faqItemSchema,
  fabricNarrativeBlockSchema,
  productNarrativeBlockSchema,
  seoNarrativeBlockSchema,
  sourcingNarrativeBlockSchema,
  evidenceTextSchema,
  protectDraftCandidateV1,
} from "@/ai/output/common";
import { attemptResponseFingerprintV2 } from "@/ai/runs/attempt-evidence";
import type { AiRunAuthorizedEvidenceV1, AttemptHistoryEntryV2 } from "@/ai/runs/contracts";
import type {
  ProductAiDraftReaderV1,
} from "@/catalog/product-ai-context-reader";
import type {
  AiDraftTargetSnapshotV1,
  ContentAiDraftReaderV1,
  ContentAiTargetSnapshotV1,
} from "@/content/content-ai-context-reader";

import {
  decodeDraftTargetColumnsV1,
  draftTargetFromAssociationV1,
} from "./association";
import type {
  AiDraftReviewProjectionV1,
  DraftAssistanceCommandV1,
  DraftDurableAssociationWithoutHashV1,
  ProductionAiUseCase,
  ReviewProposalNodeV1,
} from "./contracts";
import {
  decodeReconstructibleDraftContextV1,
  decodeStoredDraftInputSourcesV1,
  type DraftContextSourceDtoV1,
  type ReconstructibleDraftContextV1,
  type StoredDraftInputSourceV1,
} from "./context";
import type { DraftConsistentReadScope } from "./read-scopes";

const hashSchema = z.string().regex(/^[0-9a-f]{64}$/);
const derivedReferenceSchema = z.object({
  containerPath: z.string().min(1).max(200),
  candidateRef: z.string().regex(/^cand_[0-9]{4}_[0-9a-f]{64}$/),
}).strict();
const protectedCandidateSchema = z.object({
  schemaVersion: z.literal(1),
  useCase: z.enum([
    "seo_content_draft",
    "fabric_knowledge_draft",
    "product_description_draft",
    "sourcing_guide_draft",
  ]),
  locale: z.literal("en"),
  payload: z.record(z.string(), z.unknown()),
  derivedCandidateRefs: z.array(derivedReferenceSchema).max(60),
  automaticEvidenceStatus: z.literal("structural_provenance_checked"),
  semanticReviewStatus: z.literal("human_review_required"),
}).strict();

const seoPayloadSchema = z.object({
  schemaVersion: z.literal(1),
  useCase: z.literal("seo_content_draft"),
  locale: z.literal("en"),
  titleProposal: evidenceTextSchema(120).optional(),
  metaDescriptionProposal: evidenceTextSchema(320).optional(),
  outline: z.array(evidenceTextSchema(300)).max(20),
  blocks: z.array(seoNarrativeBlockSchema).max(40),
  internalLinkSuggestions: z.array(z.object({
    candidateRef: z.string().regex(/^link_[0-9]{2}$/),
    anchorText: evidenceTextSchema(200),
  }).strict()).max(12),
}).strict();
const fabricPayloadSchema = z.object({
  schemaVersion: z.literal(1),
  useCase: z.literal("fabric_knowledge_draft"),
  locale: z.literal("en"),
  titleProposal: evidenceTextSchema(300).optional(),
  summaryProposal: evidenceTextSchema(1_000).optional(),
  outline: z.array(evidenceTextSchema(300)).max(20),
  blocks: z.array(fabricNarrativeBlockSchema).max(50),
}).strict();
const productPayloadSchema = z.object({
  schemaVersion: z.literal(1),
  useCase: z.literal("product_description_draft"),
  locale: z.literal("en"),
  displayNameProposal: evidenceTextSchema(300).optional(),
  summaryProposal: evidenceTextSchema(1_000).optional(),
  descriptionBlocks: z.array(productNarrativeBlockSchema).max(30),
  featureProposals: z.array(evidenceTextSchema(500)).max(20),
  faqProposals: z.array(faqItemSchema).max(20),
  mediaTextProposals: z.array(z.object({
    placementRef: z.string().regex(/^media_[0-9]{2}$/),
    altText: evidenceTextSchema(500).optional(),
    caption: evidenceTextSchema(1_000).optional(),
  }).strict()).max(12),
}).strict();
const sourcingPayloadSchema = z.object({
  schemaVersion: z.literal(1),
  useCase: z.literal("sourcing_guide_draft"),
  locale: z.literal("en"),
  titleProposal: evidenceTextSchema(200).optional(),
  summaryProposal: evidenceTextSchema(1_000).optional(),
  outline: z.array(evidenceTextSchema(300)).max(24),
  blocks: z.array(sourcingNarrativeBlockSchema).max(60),
}).strict();

const outputIdentities = Object.freeze({
  seo_content_draft: { schemaId: "cwt.seo-content-draft.v1", schemaVersion: 1, policyVersion: "draft-seo-content-v1" },
  fabric_knowledge_draft: { schemaId: "cwt.fabric-knowledge-draft.v1", schemaVersion: 1, policyVersion: "draft-fabric-knowledge-v1" },
  product_description_draft: { schemaId: "cwt.product-description-draft.v1", schemaVersion: 1, policyVersion: "draft-product-description-v1" },
  sourcing_guide_draft: { schemaId: "cwt.sourcing-guide-draft.v1", schemaVersion: 1, policyVersion: "draft-sourcing-guide-v1" },
} as const);

type ValidPayload =
  | z.infer<typeof seoPayloadSchema>
  | z.infer<typeof fabricPayloadSchema>
  | z.infer<typeof productPayloadSchema>
  | z.infer<typeof sourcingPayloadSchema>;

interface ValidCandidate {
  readonly value: z.infer<typeof protectedCandidateSchema>;
  readonly payload: ValidPayload;
}

interface DomainReadersV1<TQueryResult extends PgQueryResultHKT> {
  readonly product: ProductAiDraftReaderV1<TQueryResult>;
  readonly content: ContentAiDraftReaderV1<TQueryResult>;
}

function payloadFor(useCase: ProductionAiUseCase, value: unknown): ValidPayload | null {
  const schema = useCase === "seo_content_draft" ? seoPayloadSchema
    : useCase === "fabric_knowledge_draft" ? fabricPayloadSchema
      : useCase === "product_description_draft" ? productPayloadSchema
        : sourcingPayloadSchema;
  const parsed = schema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

function schemaFor(useCase: ProductionAiUseCase): z.ZodType {
  return useCase === "seo_content_draft" ? seoPayloadSchema
    : useCase === "fabric_knowledge_draft" ? fabricPayloadSchema
      : useCase === "product_description_draft" ? productPayloadSchema
        : sourcingPayloadSchema;
}

function blockMaterial(payload: ValidPayload): readonly {
  readonly path: string;
  readonly ordinal: number;
  readonly block: ReadonlyJsonObject;
}[] {
  const values = payload.useCase === "product_description_draft"
    ? payload.descriptionBlocks
    : payload.blocks;
  const root = payload.useCase === "product_description_draft" ? "/descriptionBlocks" : "/blocks";
  return values.map((block, index) => ({
    path: `${root}/${index}`,
    ordinal: index + 1,
    block: block as unknown as ReadonlyJsonObject,
  }));
}

function validateCandidate(
  evidence: AiRunAuthorizedEvidenceV1,
  context: ReconstructibleDraftContextV1,
): AiServiceResult<ValidCandidate> {
  if (evidence.status !== "draft_ready" || evidence.humanDisposition !== "not_evaluated" ||
    evidence.candidate === null || evidence.candidateHash === null ||
    !hashSchema.safeParse(evidence.candidateHash).success) {
    return aiFailure("state_conflict");
  }
  const outer = protectedCandidateSchema.safeParse(evidence.candidate);
  if (!outer.success || outer.data.useCase !== evidence.useCase) {
    return aiFailure("output_schema_invalid");
  }
  const identity = outputIdentities[outer.data.useCase];
  if (evidence.outputSchemaVersion !== identity.schemaVersion ||
    evidence.policyVersion !== identity.policyVersion) {
    return aiFailure("output_policy_rejected");
  }
  const payload = payloadFor(outer.data.useCase, outer.data.payload);
  if (payload === null || payload.useCase !== outer.data.useCase) {
    return aiFailure("output_schema_invalid");
  }
  const reprotected = protectDraftCandidateV1({
    rawObject: payload as unknown as ReadonlyJsonObject,
    context,
    schema: schemaFor(outer.data.useCase),
    useCase: outer.data.useCase,
    schemaId: identity.schemaId,
    policyVersion: identity.policyVersion,
  });
  if (!reprotected.ok || reprotected.value.hash !== evidence.candidateHash) {
    return aiFailure("output_policy_rejected");
  }
  const storedCanonical = canonicalJsonHash(outer.data as unknown as ReadonlyJsonObject);
  const rebuiltCanonical = canonicalJsonHash(reprotected.value.value);
  if (!storedCanonical.ok || !rebuiltCanonical.ok ||
    storedCanonical.value.canonicalJson !== rebuiltCanonical.value.canonicalJson) {
    return aiFailure("output_policy_rejected");
  }
  const protectedHash = canonicalJsonHash(outer.data as unknown as ReadonlyJsonObject);
  if (!protectedHash.ok || Buffer.byteLength(protectedHash.value.canonicalJson, "utf8") > 65_536 ||
    protectedHash.value.hash !== evidence.candidateHash) {
    return aiFailure("output_policy_rejected");
  }
  const material = blockMaterial(payload);
  if (outer.data.derivedCandidateRefs.length !== material.length) {
    return aiFailure("output_policy_rejected");
  }
  for (const [index, block] of material.entries()) {
    const reference = outer.data.derivedCandidateRefs[index];
    const hash = canonicalJsonHash({
      useCase: outer.data.useCase,
      containerPath: block.path,
      ordinal: block.ordinal,
      block: block.block,
    });
    if (!hash.ok || reference?.containerPath !== block.path ||
      reference.candidateRef !==
        `cand_${String(block.ordinal).padStart(4, "0")}_${hash.value.hash}`) {
      return aiFailure("output_policy_rejected");
    }
  }
  const last = evidence.attemptHistory.at(-1);
  if (last === undefined || last.outcome !== "draft_ready" ||
    typeof last.response_fingerprint !== "string") {
    return aiFailure("output_policy_rejected");
  }
  const { response_fingerprint: responseFingerprint, ...withoutFingerprint } = last;
  const fingerprint = attemptResponseFingerprintV2({
    entryWithoutFingerprint: withoutFingerprint as unknown as Omit<
      AttemptHistoryEntryV2,
      "response_fingerprint"
    >,
    candidateHash: evidence.candidateHash,
  });
  if (!fingerprint.ok || fingerprint.value !== responseFingerprint) {
    return aiFailure("output_policy_rejected");
  }
  return aiSuccess({ value: outer.data, payload });
}

function taskWithoutSelections(context: ReconstructibleDraftContextV1): DraftAssistanceCommandV1["task"] {
  switch (context.useCase) {
    case "seo_content_draft": return {
      kind: "seo_content_draft",
      tone: "concise_professional_b2b",
      pageIntent: String(context.task.pageIntent),
      ...(typeof context.task.primaryPhrase === "string"
        ? { primaryPhrase: context.task.primaryPhrase } : {}),
      selectedInternalLinkIds: [],
    };
    case "fabric_knowledge_draft": return {
      kind: "fabric_knowledge_draft",
      tone: "neutral_editorial",
      topic: String(context.task.topic),
    };
    case "product_description_draft": return {
      kind: "product_description_draft",
      tone: "concise_professional_b2b",
      selectedMediaPlacementIds: [],
    };
    case "sourcing_guide_draft": return {
      kind: "sourcing_guide_draft",
      tone: "concise_professional_b2b",
      guideIntent: String(context.task.guideIntent),
    };
  }
}

function sourceFieldsMatch(
  source: ReconstructibleDraftContextV1["sources"][number],
  current: DraftContextSourceDtoV1,
): boolean {
  const currentFields = current.fields.flatMap((field) => {
    if (field.field !== "moqPair" || typeof field.value !== "object" ||
      field.value === null || Array.isArray(field.value)) return [field];
    const pair = field.value as Readonly<Record<string, ReadonlyJsonValue>>;
    return [
      { field: "moqValue", provenance: field.provenance, value: pair.moqValue },
      { field: "moqUnit", provenance: field.provenance, value: pair.moqUnit },
    ];
  });
  const stored = source.fields.map((field) => ({
    field: field.field,
    provenance: field.provenance,
    value: field.value,
  }));
  const left = canonicalJsonHash(stored);
  const right = canonicalJsonHash(currentFields as unknown as readonly ReadonlyJsonValue[]);
  return left.ok && right.ok && left.value.hash === right.value.hash;
}

function sourceIdentityMatchesCurrent(
  source: ReconstructibleDraftContextV1["sources"][number],
  stored: StoredDraftInputSourceV1,
  current: DraftContextSourceDtoV1,
): boolean {
  if (stored.sourceClass !== current.sourceClass) return false;
  switch (current.sourceClass) {
    case "product_structured": {
      if (stored.sourceClass !== "product_structured" ||
        stored.sourceIdentity.productId !== current.productId) return false;
      const projection = canonicalJsonHash(source.fields.map((field) => ({
        field: field.field,
        provenance: field.provenance,
        value: field.value,
      })));
      return projection.ok &&
        stored.sourceIdentity.projectionSha256 === projection.value.hash;
    }
    case "fabric_knowledge":
      return stored.sourceClass === "fabric_knowledge" &&
        stored.sourceIdentity.contentId === current.contentId &&
        stored.sourceIdentity.recordVersion === current.recordVersion;
    case "public_company_fact":
      return stored.sourceClass === "public_company_fact" &&
        stored.sourceIdentity.companyFactId === current.companyFactId &&
        stored.sourceIdentity.recordUpdatedAt === current.recordUpdatedAt;
  }
}

function evidenceText(value: { readonly text: string }): string {
  return value.text;
}

function blockText(block: Readonly<Record<string, unknown>>): readonly string[] {
  const evidence = (value: unknown): string[] =>
    typeof value === "object" && value !== null && !Array.isArray(value) &&
      typeof (value as { text?: unknown }).text === "string"
      ? [(value as { text: string }).text] : [];
  switch (block.type) {
    case "heading":
    case "paragraph": return evidence(block.text);
    case "feature_list":
    case "bullet_list": return Array.isArray(block.items) ? block.items.flatMap(evidence) : [];
    case "callout": return [...evidence(block.title), ...evidence(block.text)];
    case "faq": return Array.isArray(block.items) ? block.items.flatMap((item) => {
      if (typeof item !== "object" || item === null || Array.isArray(item)) return [];
      return [...evidence((item as Record<string, unknown>).question),
        ...evidence((item as Record<string, unknown>).answer)];
    }) : [];
    default: return [];
  }
}

function proposalNodes(input: {
  readonly runId: string;
  readonly candidateHash: string;
  readonly payload: ValidPayload;
  readonly before: AiDraftReviewProjectionV1["before"];
}): AiServiceResult<{
  readonly nodes: readonly ReviewProposalNodeV1[];
  readonly seo?: AiDraftReviewProjectionV1["proposal"]["seo"];
}> {
  const nodes: ReviewProposalNodeV1[] = [];
  let seo: AiDraftReviewProjectionV1["proposal"]["seo"] | undefined;
  let ordinal = 0;
  const identities = new Set<string>(input.before.document.map((node) => node.id));
  const paths = new Set<string>();
  const ordinals = new Set<number>();
  const append = (value: Omit<ReviewProposalNodeV1, "id" | "ordinal">): ReviewProposalNodeV1 | null => {
    ordinal += 1;
    if (paths.has(value.path) || ordinals.has(ordinal)) return null;
    paths.add(value.path);
    ordinals.add(ordinal);
    const identity = canonicalJsonHash({
      v: 1,
      domain: "cwt.ai.review-block",
      runId: input.runId,
      candidateHash: input.candidateHash,
      path: value.path,
      ordinal,
    });
    if (!identity.ok) return null;
    const id = `ai_${identity.value.hash.slice(0, 60)}`;
    if (id.length !== 63 || identities.has(id)) return null;
    identities.add(id);
    return { id, ordinal, ...value };
  };
  const addNode = (value: Omit<ReviewProposalNodeV1, "id" | "ordinal">): boolean => {
    const node = append(value);
    if (node === null) return false;
    nodes.push(node);
    return true;
  };
  const addBlock = (block: Readonly<Record<string, unknown>>, path: string): boolean => {
    const text = blockText(block);
    return addNode({
      path,
      kind: "block",
      label: `Proposed ${String(block.type).replaceAll("_", " ")} Block`,
      proposedText: text.join("\n"),
      beforeText: null,
      details: text,
      editable: block.type === "heading" || block.type === "paragraph",
      previewOnly: false,
    });
  };
  const titleBefore = input.before.kind === "product" ? input.before.name : input.before.title;
  if (input.payload.useCase === "seo_content_draft") {
    const title = input.payload.titleProposal === undefined ? undefined : append({
      path: "/titleProposal", kind: "title", label: "SEO title proposal",
      proposedText: evidenceText(input.payload.titleProposal),
      beforeText: input.before.seo.title, details: [], editable: true, previewOnly: false,
    });
    const metaDescription = input.payload.metaDescriptionProposal === undefined ? undefined : append({
      path: "/metaDescriptionProposal", kind: "summary", label: "SEO meta description proposal",
      proposedText: evidenceText(input.payload.metaDescriptionProposal),
      beforeText: input.before.seo.metaDescription, details: [], editable: true, previewOnly: false,
    });
    if (title === null || metaDescription === null) return aiFailure("output_policy_rejected");
    seo = {
      ...(title === undefined ? {} : { title }),
      ...(metaDescription === undefined ? {} : { metaDescription }),
    };
    for (const [index, item] of input.payload.outline.entries()) {
      if (!addNode({ path: `/outline/${index}`, kind: "outline", label: "Outline planning item",
        proposedText: item.text, beforeText: null, details: [], editable: true, previewOnly: true })) {
        return aiFailure("output_policy_rejected");
      }
    }
    for (const [index, block] of input.payload.blocks.entries()) {
      if (!addBlock(block as unknown as Readonly<Record<string, unknown>>, `/blocks/${index}`)) {
        return aiFailure("output_policy_rejected");
      }
    }
    for (const [index, link] of input.payload.internalLinkSuggestions.entries()) {
      if (!addNode({ path: `/internalLinkSuggestions/${index}`, kind: "internal_link",
        label: `Internal link ${link.candidateRef}`, proposedText: link.anchorText.text,
        beforeText: null, details: [link.candidateRef], editable: true, previewOnly: true })) {
        return aiFailure("output_policy_rejected");
      }
    }
  } else if (input.payload.useCase === "product_description_draft") {
    if (input.payload.displayNameProposal !== undefined && !addNode({
      path: "/displayNameProposal", kind: "title", label: "Product display name",
      proposedText: input.payload.displayNameProposal.text, beforeText: titleBefore,
      details: [], editable: true, previewOnly: false,
    })) return aiFailure("output_policy_rejected");
    if (input.payload.summaryProposal !== undefined && !addNode({
      path: "/summaryProposal", kind: "summary", label: "Product summary",
      proposedText: input.payload.summaryProposal.text, beforeText: input.before.summary,
      details: [], editable: true, previewOnly: false,
    })) return aiFailure("output_policy_rejected");
    for (const [index, block] of input.payload.descriptionBlocks.entries()) {
      if (!addBlock(block as unknown as Readonly<Record<string, unknown>>, `/descriptionBlocks/${index}`)) {
        return aiFailure("output_policy_rejected");
      }
    }
    for (const [index, feature] of input.payload.featureProposals.entries()) {
      if (!addNode({ path: `/featureProposals/${index}`, kind: "feature", label: "Feature proposal",
        proposedText: feature.text, beforeText: null, details: [], editable: true, previewOnly: false })) {
        return aiFailure("output_policy_rejected");
      }
    }
    for (const [index, faq] of input.payload.faqProposals.entries()) {
      if (!addNode({ path: `/faqProposals/${index}`, kind: "faq", label: "FAQ proposal",
        proposedText: `${faq.question.text}\n${faq.answer.text}`, beforeText: null,
        details: [faq.question.text, faq.answer.text], editable: false, previewOnly: false })) {
        return aiFailure("output_policy_rejected");
      }
    }
    const mediaBefore = input.before.kind === "product"
      ? new Map(input.before.mediaText.map((item) => [item.placementRef, item])) : new Map();
    for (const [index, media] of input.payload.mediaTextProposals.entries()) {
      const before = mediaBefore.get(media.placementRef);
      if (before === undefined) return aiFailure("output_policy_rejected");
      for (const [field, value, old] of [
        ["altText", media.altText, before.altText],
        ["caption", media.caption, before.caption],
      ] as const) {
        if (value !== undefined && !addNode({
          path: `/mediaTextProposals/${index}/${field}`, kind: "media_text",
          label: `${media.placementRef} ${field === "altText" ? "alt text" : "caption"}`,
          proposedText: value.text, beforeText: old, details: [media.placementRef],
          editable: true, previewOnly: false,
        })) return aiFailure("output_policy_rejected");
      }
    }
  } else {
    if (input.payload.titleProposal !== undefined && !addNode({
      path: "/titleProposal", kind: "title", label: "Content title",
      proposedText: input.payload.titleProposal.text, beforeText: titleBefore,
      details: [], editable: true, previewOnly: false,
    })) return aiFailure("output_policy_rejected");
    if (input.payload.summaryProposal !== undefined && !addNode({
      path: "/summaryProposal", kind: "summary", label: "Content summary",
      proposedText: input.payload.summaryProposal.text, beforeText: input.before.summary,
      details: [], editable: true, previewOnly: false,
    })) return aiFailure("output_policy_rejected");
    for (const [index, item] of input.payload.outline.entries()) {
      if (!addNode({ path: `/outline/${index}`, kind: "outline", label: "Outline planning item",
        proposedText: item.text, beforeText: null, details: [], editable: true, previewOnly: true })) {
        return aiFailure("output_policy_rejected");
      }
    }
    for (const [index, block] of input.payload.blocks.entries()) {
      if (!addBlock(block as unknown as Readonly<Record<string, unknown>>, `/blocks/${index}`)) {
        return aiFailure("output_policy_rejected");
      }
    }
  }
  return aiSuccess({ nodes, ...(seo === undefined ? {} : { seo }) });
}

async function targetSnapshot<TQueryResult extends PgQueryResultHKT>(
  readers: DomainReadersV1<TQueryResult>,
  input: {
    readonly scope: DraftConsistentReadScope<TQueryResult>;
    readonly actor: import("@/ai/core/contracts").CoreAiActorV1;
    readonly command: DraftAssistanceCommandV1;
    readonly association: DraftDurableAssociationWithoutHashV1;
  },
): Promise<AiServiceResult<AiDraftTargetSnapshotV1>> {
  if (input.association.targetType === "product_draft") return readers.product.readTargetSnapshot(input);
  if (input.association.targetType === "content_draft") return readers.content.readTargetSnapshot(input);
  const product = await readers.product.readTargetSnapshot(input);
  if (product.ok || product.error.code !== "target_scope_mismatch") return product;
  return readers.content.readTargetSnapshot(input);
}

export interface DraftReviewProjectionBuilderV1<TQueryResult extends PgQueryResultHKT> {
  build(input: {
    readonly scope: DraftConsistentReadScope<TQueryResult>;
    readonly actor: import("@/ai/core/contracts").CoreAiActorV1;
    readonly evidence: AiRunAuthorizedEvidenceV1;
  }): Promise<AiServiceResult<AiDraftReviewProjectionV1>>;
}

export function createDraftReviewProjectionBuilderV1<
  TQueryResult extends PgQueryResultHKT,
>(readers: DomainReadersV1<TQueryResult>): DraftReviewProjectionBuilderV1<TQueryResult> {
  return {
    async build(input) {
      const context = decodeReconstructibleDraftContextV1(input.evidence.inputContext);
      const storedSources = decodeStoredDraftInputSourcesV1(input.evidence.inputSources);
      const contextHash = canonicalJsonHash(input.evidence.inputContext);
      if (!context.ok || !storedSources.ok || !contextHash.ok ||
        contextHash.value.hash !== input.evidence.inputHash ||
        context.value.useCase !== input.evidence.useCase ||
        context.value.association.snapshotHash !== input.evidence.targetSnapshotHash) {
        return aiFailure("context_provenance_mismatch");
      }
      const candidate = validateCandidate(input.evidence, context.value);
      if (!candidate.ok) return candidate;
      const association = decodeDraftTargetColumnsV1({
        targetType: input.evidence.targetType,
        targetProductId: input.evidence.targetProductId,
        targetContentId: input.evidence.targetContentId,
        targetRevisionId: input.evidence.targetRevisionId,
        targetLocale: input.evidence.targetLocale,
        expectedTargetVersion: input.evidence.expectedTargetVersion,
        targetSnapshotHash: input.evidence.targetSnapshotHash,
      });
      if (!association.ok || context.value.association.targetType !== association.value.targetType ||
        context.value.association.expectedVersion !== association.value.expectedTargetVersion) {
        return aiFailure("association_provenance_mismatch");
      }
      const businessSources = storedSources.value.filter((source) => source.alias.startsWith("src_"));
      const linkSources = storedSources.value.filter((source) =>
        source.sourceClass === "internal_link_relation");
      const mediaSources = storedSources.value.filter((source) =>
        source.sourceClass === "product_media_placement");
      if (businessSources.length !== context.value.sources.length || businessSources.some((source, index) =>
        source.alias !== context.value.sources[index]?.alias ||
        source.sourceClass !== context.value.sources[index]?.sourceClass ||
        source.selectedFields.join("\u0000") !==
          context.value.sources[index]?.fields.map((field) => field.field).join("\u0000") ||
        source.fieldProvenance.some((field, fieldIndex) =>
          field.provenance !== context.value.sources[index]?.fields[fieldIndex]?.provenance),
      )) return aiFailure("context_provenance_mismatch");
      if (linkSources.some((source, index) =>
        source.alias !== `link_${String(index + 1).padStart(2, "0")}` ||
        source.selectedFields.length !== 0 || source.fieldProvenance.length !== 0 ||
        context.value.internalLinkCandidates[index]?.candidateRef !== source.alias) ||
        mediaSources.some((source, index) =>
          source.alias !== `media_${String(index + 1).padStart(2, "0")}` ||
          source.selectedFields.length !== 0 || source.fieldProvenance.length !== 0 ||
          context.value.mediaPlacementRefs[index] !== source.alias)) {
        return aiFailure("context_provenance_mismatch");
      }

      const contextSelections: DraftAssistanceCommandV1["contextSelections"][number][] = [];
      let explicitInput: string | undefined;
      for (const [index, source] of businessSources.entries()) {
        const stored = context.value.sources[index]!;
        if (source.sourceClass === "explicit_human_input") {
          const text = stored.fields[0]?.value;
          if (stored.fields.length !== 1 || stored.fields[0]?.field !== "text" ||
            typeof text !== "string") return aiFailure("context_provenance_mismatch");
          explicitInput = text;
          const identity = source.sourceIdentity as { readonly origin: "typed_brief" | "operator_selected_target_text" };
          contextSelections.push({ sourceClass: "explicit_human_input", origin: identity.origin });
        } else if (source.sourceClass === "product_structured") {
          const identity = source.sourceIdentity as { readonly productId: string };
          const fields = source.selectedFields.includes("moqValue") && source.selectedFields.includes("moqUnit")
            ? [...source.selectedFields.filter((field) => field !== "moqValue" && field !== "moqUnit"), "moqPair"]
            : [...source.selectedFields];
          contextSelections.push({
            sourceClass: "product_structured",
            sourceId: identity.productId,
            fields: fields as Extract<DraftAssistanceCommandV1["contextSelections"][number],
              { readonly sourceClass: "product_structured" }>["fields"],
          });
        } else if (source.sourceClass === "fabric_knowledge") {
          const identity = source.sourceIdentity as { readonly contentId: string };
          contextSelections.push({ sourceClass: "fabric_knowledge", sourceId: identity.contentId,
            fields: source.selectedFields as ("title" | "excerpt" | "narrativeText")[] });
        } else if (source.sourceClass === "public_company_fact") {
          const identity = source.sourceIdentity as { readonly companyFactId: string };
          contextSelections.push({ sourceClass: "public_company_fact", sourceId: identity.companyFactId,
            fields: source.selectedFields as ("factKey" | "subject" | "statement" | "relationshipToCwt")[] });
        } else return aiFailure("context_provenance_mismatch");
      }
      const baseTask = taskWithoutSelections(context.value);
      if (!["admin", "product_editor", "content_editor", "reviewer_publisher", "sales", "analyst"]
        .includes(input.actor.roleKey)) return aiFailure("authorization_denied");
      const actorRole = input.actor.roleKey as DraftAssistanceCommandV1["actor"]["role"];
      const baseCommand: DraftAssistanceCommandV1 = {
        useCase: context.value.useCase,
        task: baseTask,
        actor: { userId: input.actor.principalId, role: actorRole },
        target: draftTargetFromAssociationV1(association.value),
        contextSelections,
        ...(explicitInput === undefined ? {} : { explicitInput }),
        idempotencyKey: "00000000-0000-4000-8000-000000000000",
      };
      const target = await targetSnapshot(readers, {
        scope: input.scope,
        actor: input.actor,
        command: baseCommand,
        association: association.value,
      });
      if (!target.ok) return target;
      const linkHashes = linkSources.map((source) => source.sourceIdentity.selectionSha256);
      const mediaHashes = mediaSources.map((source) => source.sourceIdentity.selectionSha256);
      if (linkHashes.length !== context.value.internalLinkCandidates.length ||
        mediaHashes.length !== context.value.mediaPlacementRefs.length) {
        return aiFailure("context_provenance_mismatch");
      }
      let before: AiDraftReviewProjectionV1["before"];
      let selectedLinkIds: readonly string[] = [];
      let selectedMediaIds: readonly string[] = [];
      if (target.value.owner === "product") {
        if (linkHashes.length > 0) return aiFailure("target_scope_mismatch");
        const read = await readers.product.readReviewBefore({
          scope: input.scope, actor: input.actor, target: target.value,
          mediaSelectionHashes: mediaHashes,
        });
        if (!read.ok) return read;
        before = read.value.before;
        selectedMediaIds = read.value.selectedMediaPlacementIds;
      } else {
        if (mediaHashes.length > 0) return aiFailure("target_scope_mismatch");
        const read = await readers.content.readReviewBefore({
          scope: input.scope, actor: input.actor, target: target.value,
          linkSelectionHashes: linkHashes,
        });
        if (!read.ok) return read;
        before = read.value.before;
        selectedLinkIds = read.value.selectedInternalLinkIds;
      }
      const task = baseTask.kind === "seo_content_draft"
        ? { ...baseTask, selectedInternalLinkIds: selectedLinkIds }
        : baseTask.kind === "product_description_draft"
          ? { ...baseTask, selectedMediaPlacementIds: selectedMediaIds }
          : baseTask;
      const command: DraftAssistanceCommandV1 = { ...baseCommand, task };
      for (const [index, selection] of contextSelections.entries()) {
        if (selection.sourceClass === "explicit_human_input") continue;
        let current: AiServiceResult<DraftContextSourceDtoV1>;
        if (selection.sourceClass === "product_structured") {
          if (target.value.owner !== "product") return aiFailure("context_record_unauthorized");
          current = await readers.product.readSelectedStructuredContext({
            scope: input.scope, actor: input.actor, command, target: target.value, selector: selection,
          });
        } else if (selection.sourceClass === "fabric_knowledge") {
          current = await readers.content.readSelectedFabricContext({
            scope: input.scope, actor: input.actor, command, target: target.value, selector: selection,
          });
        } else {
          current = await readers.content.readSelectedPublicCompanyFact({
            scope: input.scope, actor: input.actor, command, target: target.value, selector: selection,
          });
        }
        if (!current.ok || !sourceFieldsMatch(context.value.sources[index]!, current.value) ||
          !sourceIdentityMatchesCurrent(
            context.value.sources[index]!, businessSources[index]!, current.value,
          )) {
          return aiFailure("context_provenance_mismatch");
        }
      }
      if (task.kind === "seo_content_draft") {
        const links = await readers.content.readSelectedInternalLinks({
          scope: input.scope, actor: input.actor, command, target: target.value,
          selectedLinkIds: task.selectedInternalLinkIds,
        });
        if (!links.ok || links.value.some((link, index) =>
          link.candidateRef !== context.value.internalLinkCandidates[index]?.candidateRef ||
          link.label !== context.value.internalLinkCandidates[index]?.label,
        )) return aiFailure("context_provenance_mismatch");
      } else if (task.kind === "product_description_draft") {
        if (target.value.owner !== "product") return aiFailure("target_scope_mismatch");
        const media = await readers.product.readSelectedMediaPlacements({
          scope: input.scope, actor: input.actor, command, target: target.value,
          selectedPlacementIds: task.selectedMediaPlacementIds,
        });
        if (!media.ok || media.value.some((item, index) =>
          item.placementRef !== context.value.mediaPlacementRefs[index],
        )) return aiFailure("context_provenance_mismatch");
      }
      const nodes = proposalNodes({
        runId: input.evidence.runId,
        candidateHash: input.evidence.candidateHash!,
        payload: candidate.value.payload,
        before,
      });
      if (!nodes.ok) return nodes;
      const beforeHash = canonicalJsonHash(before as unknown as ReadonlyJsonObject);
      const projectionKey = beforeHash.ok ? canonicalJsonHash({
        version: 1,
        runId: input.evidence.runId,
        stateVersion: input.evidence.stateVersion,
        candidateHash: input.evidence.candidateHash,
        targetSnapshotHash: input.evidence.targetSnapshotHash,
        beforeHash: beforeHash.value.hash,
      }) : beforeHash;
      if (!beforeHash.ok || !projectionKey.ok) return aiFailure("canonicalization_failed");
      const base = {
        version: 1 as const,
        run: {
          id: input.evidence.runId,
          useCase: context.value.useCase,
          stateVersion: input.evidence.stateVersion,
          candidateHash: input.evidence.candidateHash!,
        },
        projectionKey: projectionKey.value.hash,
        proposal: nodes.value,
      };
      return target.value.owner === "product"
        ? aiSuccess({ ...base, target: { kind: "product", locale: "en", draftVersion: target.value.editVersion },
          before: before as Extract<AiDraftReviewProjectionV1, { target: { kind: "product" } }>["before"] })
        : aiSuccess({ ...base, target: { kind: "content", locale: "en", draftVersion: target.value.editVersion,
          channel: (target.value as ContentAiTargetSnapshotV1).channel },
          before: before as Extract<AiDraftReviewProjectionV1, { target: { kind: "content" } }>["before"] });
    },
  };
}
