import "server-only";

import type { PgQueryResultHKT } from "drizzle-orm/pg-core/session";
import type { PostgresJsQueryResultHKT } from "drizzle-orm/postgres-js/session";
import { z } from "zod";

import {
  canonicalJsonHash,
  type ReadonlyJsonObject,
  type ReadonlyJsonValue,
} from "@/ai/canonical-json";
import { aiFailure, aiSuccess, type AiServiceResult } from "@/ai/errors";
import { fabricKnowledgeDraftV1Schema } from "@/ai/output/fabric-knowledge-draft";
import { productDescriptionDraftV1Schema } from "@/ai/output/product-description-draft";
import { draftOutputDefinitionV1 } from "@/ai/output/registry";
import { seoContentDraftV1Schema } from "@/ai/output/seo-content-draft";
import { sourcingGuideDraftV1Schema } from "@/ai/output/sourcing-guide-draft";
import {
  attemptResponseFingerprintV2,
  decodeAttemptHistoryEntryV2,
} from "@/ai/runs/attempt-evidence";
import type {
  AiCandidateApplyCommandFingerprintV1,
  AiRunAuthorizedEvidenceV1,
} from "@/ai/runs/contracts";
import { mayManuallyRetryFailureV1 } from "@/ai/runs/retry-policy";
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
  ApplyAiDraftCandidateV1,
  AiDraftReviewProjectionV1,
  DraftAssistanceCommandV1,
  DraftDurableAssociationWithoutHashV1,
  ProductionAiUseCase,
  ReviewProposalNodeV1,
} from "./contracts";
import { applyAiDraftCandidateV1Schema } from "./contracts";
import {
  decodeReconstructibleDraftContextV1,
  decodeStoredDraftInputSourcesV1,
  type DraftContextSourceDtoV1,
  type ReconstructibleDraftContextV1,
  type StoredDraftInputSourceV1,
} from "./context";
import {
  type DraftConsistentReadScope,
  type DraftTransactionScopeOperationsV1,
  withTransactionBoundDraftEnqueueScope,
} from "./read-scopes";
import type { AppDatabase } from "@/db/types";
import {
  blockSchema,
  parseBlockDocument,
  type BlockDocument,
  type EditorialBlock,
} from "@/editorial/blocks";

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

type ValidPayload =
  | z.infer<typeof seoContentDraftV1Schema>
  | z.infer<typeof fabricKnowledgeDraftV1Schema>
  | z.infer<typeof productDescriptionDraftV1Schema>
  | z.infer<typeof sourcingGuideDraftV1Schema>;

interface ValidCandidate {
  readonly value: z.infer<typeof protectedCandidateSchema>;
  readonly payload: ValidPayload;
}

interface DomainReadersV1<TQueryResult extends PgQueryResultHKT> {
  readonly product: ProductAiDraftReaderV1<TQueryResult>;
  readonly content: ContentAiDraftReaderV1<TQueryResult>;
}

function payloadFor(useCase: ProductionAiUseCase, value: unknown): ValidPayload | null {
  const schema = useCase === "seo_content_draft" ? seoContentDraftV1Schema
    : useCase === "fabric_knowledge_draft" ? fabricKnowledgeDraftV1Schema
      : useCase === "product_description_draft" ? productDescriptionDraftV1Schema
        : sourcingGuideDraftV1Schema;
  const parsed = schema.safeParse(value);
  return parsed.success ? parsed.data : null;
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
  const output = draftOutputDefinitionV1(outer.data.useCase);
  if (output === undefined || evidence.outputSchemaVersion !== output.schemaVersion ||
    evidence.policyVersion !== output.policyVersion) {
    return aiFailure("output_policy_rejected");
  }
  const payload = payloadFor(outer.data.useCase, outer.data.payload);
  if (payload === null || payload.useCase !== outer.data.useCase) {
    return aiFailure("output_schema_invalid");
  }
  const reprotected = output.policy.parseAndProtect({
    rawObject: payload as unknown as ReadonlyJsonObject,
    context,
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
  if (!Number.isInteger(evidence.attemptCount) || evidence.attemptCount < 1 ||
    evidence.attemptCount > 3 || evidence.attemptHistory.length !== evidence.attemptCount) {
    return aiFailure("output_policy_rejected");
  }
  for (const [index, storedEntry] of evidence.attemptHistory.entries()) {
    const decoded = decodeAttemptHistoryEntryV2(storedEntry);
    if (!decoded.ok) return aiFailure("output_policy_rejected");
    const entry = decoded.value;
    const final = index === evidence.attemptCount - 1;
    const continuingPrefix = entry.outcome === "retry_scheduled" ||
      (entry.outcome === "failed" && entry.failure_code !== null &&
        mayManuallyRetryFailureV1(entry.failure_code as Parameters<
          typeof mayManuallyRetryFailureV1
        >[0]));
    if (entry.attempt !== index + 1 || (final
      ? entry.outcome !== "draft_ready" || entry.attempt !== evidence.attemptCount
      : !continuingPrefix)) {
      return aiFailure("output_policy_rejected");
    }
    const { response_fingerprint: responseFingerprint, ...withoutFingerprint } = entry;
    const fingerprint = attemptResponseFingerprintV2({
      entryWithoutFingerprint: withoutFingerprint,
      candidateHash: final ? evidence.candidateHash : null,
    });
    if (!fingerprint.ok || fingerprint.value !== responseFingerprint) {
      return aiFailure("output_policy_rejected");
    }
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
    return { id, ordinal, ...value, editable: value.previewOnly ? false : value.editable };
  };
  const addNode = (value: Omit<ReviewProposalNodeV1, "id" | "ordinal">): boolean => {
    const node = append(value);
    if (node === null) return false;
    nodes.push(node);
    return true;
  };
  const addBlock = (
    block: Readonly<Record<string, unknown>>,
    path: string,
    previewOnly = false,
  ): boolean => {
    const text = blockText(block);
    return addNode({
      path,
      kind: "block",
      label: `Proposed ${String(block.type).replaceAll("_", " ")} Block`,
      proposedText: text.join("\n"),
      beforeText: null,
      details: text,
      editable: block.type === "heading" || block.type === "paragraph",
      previewOnly,
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
      if (!addBlock(block as unknown as Readonly<Record<string, unknown>>, `/blocks/${index}`, true)) {
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
  if (input.actor.roleKey === "product_editor") {
    return readers.product.readTargetSnapshot(input);
  }
  if (input.actor.roleKey === "content_editor") {
    return readers.content.readTargetSnapshot(input);
  }
  const product = await readers.product.readTargetSnapshot(input);
  if (product.ok) return product;
  const content = await readers.content.readTargetSnapshot(input);
  if (content.ok) return content;
  return product.error.code === "authorization_denied" ||
    content.error.code === "authorization_denied"
    ? aiFailure("authorization_denied") : product;
}

export interface DraftCandidateGeneratedBlockV1 {
  readonly candidatePath: string;
  readonly ordinal: number;
  readonly block: EditorialBlock;
  readonly insertAfterBlockId: string | null;
}

export interface DraftCandidateApplicationPlanV1 {
  readonly owner: "product" | "content";
  readonly useCase: ProductionAiUseCase;
  readonly projectionKey: string;
  readonly targetDraftVersion: number;
  readonly revisionId: string | null;
  readonly title?: string;
  readonly summary?: string | null;
  readonly seoTitle?: string | null;
  readonly seoMetaDescription?: string | null;
  readonly generatedBlocks: readonly DraftCandidateGeneratedBlockV1[];
  readonly mediaText: readonly {
    readonly placementRef: `media_${string}`;
    readonly altText?: string | null;
    readonly caption?: string | null;
  }[];
  readonly mediaSelectionHashes: readonly string[];
  readonly disposition: "accepted" | "accepted_with_edits";
}

export function composeDraftCandidateBlocksV1(
  current: BlockDocument,
  generated: readonly DraftCandidateGeneratedBlockV1[],
  owner: "product" | "content",
): AiServiceResult<BlockDocument> {
  const currentIds = new Set(current.blocks.map((block) => block.id));
  const generatedIds = new Set<string>();
  if (generated.some((item) => {
    if (generatedIds.has(item.block.id) || currentIds.has(item.block.id)) return true;
    generatedIds.add(item.block.id);
    if (item.insertAfterBlockId === null) return false;
    const anchor = current.blocks.find((block) => block.id === item.insertAfterBlockId);
    return anchor === undefined || anchor.locked === true;
  })) return aiFailure("state_conflict");
  const atStart = generated.filter((item) => item.insertAfterBlockId === null);
  const byAnchor = new Map<string, DraftCandidateGeneratedBlockV1[]>();
  for (const item of generated) {
    if (item.insertAfterBlockId === null) continue;
    const values = byAnchor.get(item.insertAfterBlockId) ?? [];
    values.push(item);
    byAnchor.set(item.insertAfterBlockId, values);
  }
  const blocks: EditorialBlock[] = [...atStart.map((item) => item.block)];
  for (const existing of current.blocks) {
    blocks.push(existing);
    blocks.push(...(byAnchor.get(existing.id) ?? []).map((item) => item.block));
  }
  try {
    const document = parseBlockDocument({ version: 1, blocks }, owner);
    const existingAfter = document.blocks.filter((block) => currentIds.has(block.id));
    if (JSON.stringify(existingAfter) !== JSON.stringify(current.blocks)) {
      return aiFailure("state_conflict");
    }
    return aiSuccess(document);
  } catch {
    return aiFailure("state_conflict");
  }
}

function allReviewProposalNodes(
  projection: AiDraftReviewProjectionV1,
): readonly ReviewProposalNodeV1[] {
  return [
    ...(projection.proposal.seo?.title ? [projection.proposal.seo.title] : []),
    ...(projection.proposal.seo?.metaDescription
      ? [projection.proposal.seo.metaDescription] : []),
    ...projection.proposal.nodes,
  ];
}

function plainCandidateBlock(
  value: Readonly<Record<string, unknown>>,
  id: string,
  editedText: string | undefined,
): EditorialBlock | null {
  const text = (candidate: unknown): string | null =>
    typeof candidate === "object" && candidate !== null && !Array.isArray(candidate) &&
      typeof (candidate as { readonly text?: unknown }).text === "string"
      ? (candidate as { readonly text: string }).text : null;
  let raw: unknown;
  switch (value.type) {
    case "heading": raw = {
      id, type: "heading", level: value.level,
      text: editedText ?? text(value.text),
    }; break;
    case "paragraph": raw = {
      id, type: "paragraph", text: editedText ?? text(value.text),
    }; break;
    case "feature_list":
    case "bullet_list": raw = {
      id, type: value.type,
      items: Array.isArray(value.items) ? value.items.map(text) : [],
    }; break;
    case "callout": raw = {
      id, type: "callout",
      ...(value.title === undefined ? {} : { title: text(value.title) }),
      text: text(value.text),
    }; break;
    case "faq": raw = {
      id, type: "faq",
      items: Array.isArray(value.items) ? value.items.map((item) => {
        const object = typeof item === "object" && item !== null && !Array.isArray(item)
          ? item as Readonly<Record<string, unknown>> : {};
        return { question: text(object.question), answer: text(object.answer) };
      }) : [],
    }; break;
    default: return null;
  }
  const parsed = blockSchema.safeParse(raw);
  return parsed.success ? parsed.data : null;
}

function boundedEditedValue(node: ReviewProposalNodeV1, editedText: string | undefined): string {
  return editedText === undefined ? node.proposedText : editedText;
}

function buildApplicationPlan(
  projection: AiDraftReviewProjectionV1,
  candidate: ValidCandidate,
  evidence: AiRunAuthorizedEvidenceV1,
  untrustedCommand: ApplyAiDraftCandidateV1,
): AiServiceResult<DraftCandidateApplicationPlanV1> {
  const decoded = applyAiDraftCandidateV1Schema.safeParse(untrustedCommand);
  if (!decoded.success) return aiFailure("state_conflict");
  const command = decoded.data;
  if (command.runId !== projection.run.id ||
    command.expectedRunStateVersion !== projection.run.stateVersion ||
    command.candidateHash !== projection.run.candidateHash ||
    command.expectedTargetVersion !== projection.target.draftVersion ||
    command.expectedRevisionId !== projection.target.revisionId ||
    command.expectedRevisionDraftVersion !==
      (projection.target.revisionId === null ? null : projection.target.draftVersion)) {
    return aiFailure("state_conflict");
  }
  const nodes = allReviewProposalNodes(projection);
  const actionable = nodes.filter((node) => !node.previewOnly);
  const nodeByPath = new Map(actionable.map((node) => [node.path, node]));
  const decisions = new Map(command.decisions.map((decision) => [decision.candidatePath, decision]));
  if (decisions.size !== actionable.length || command.decisions.length !== actionable.length ||
    actionable.some((node) => !decisions.has(node.path)) ||
    command.decisions.some((decision) => !nodeByPath.has(decision.candidatePath))) {
    return aiFailure("state_conflict");
  }
  let acceptedCount = 0;
  let pristine = true;
  const generatedBlocks: DraftCandidateGeneratedBlockV1[] = [];
  const media = new Map<string, {
    placementRef: `media_${string}`;
    altText?: string | null;
    caption?: string | null;
  }>();
  const result: {
    title?: string;
    summary?: string | null;
    seoTitle?: string | null;
    seoMetaDescription?: string | null;
  } = {};
  const acceptedFeatures: { node: ReviewProposalNodeV1; text: string; anchor: string | null }[] = [];
  const acceptedFaqs: { node: ReviewProposalNodeV1; question: string; answer: string;
    anchor: string | null }[] = [];
  for (const node of actionable) {
    const decision = decisions.get(node.path)!;
    if (decision.decision === "rejected") {
      pristine = false;
      continue;
    }
    acceptedCount += 1;
    if (decision.editedText !== undefined) {
      if (!node.editable) return aiFailure("state_conflict");
      if (decision.editedText !== node.proposedText) pristine = false;
    }
    const requiresAnchor = node.kind === "block" || node.kind === "feature" || node.kind === "faq";
    const hasAnchor = Object.prototype.hasOwnProperty.call(decision, "insertAfterBlockId");
    if (requiresAnchor !== hasAnchor || (!requiresAnchor && decision.insertAfterBlockId !== undefined)) {
      return aiFailure("state_conflict");
    }
    if (requiresAnchor) {
      const anchor = decision.insertAfterBlockId ?? null;
      const currentAnchor = anchor === null ? undefined
        : projection.before.document.find((block) => block.id === anchor);
      if (anchor !== null && (currentAnchor === undefined || currentAnchor.locked)) {
        return aiFailure("state_conflict");
      }
    }
    const value = boundedEditedValue(node, decision.editedText);
    if (candidate.payload.useCase === "seo_content_draft") {
      if (node.path === "/titleProposal") result.seoTitle = value.trim() || null;
      else if (node.path === "/metaDescriptionProposal") {
        result.seoMetaDescription = value.trim() || null;
      } else return aiFailure("state_conflict");
    } else if (candidate.payload.useCase === "product_description_draft") {
      if (node.path === "/displayNameProposal") result.title = value;
      else if (node.path === "/summaryProposal") result.summary = value.trim() || null;
      else if (node.path.startsWith("/descriptionBlocks/")) {
        const index = Number(node.path.slice("/descriptionBlocks/".length));
        const block = candidate.payload.descriptionBlocks[index];
        const plain = block === undefined ? null : plainCandidateBlock(
          block as unknown as Readonly<Record<string, unknown>>, node.id, decision.editedText,
        );
        if (plain === null) return aiFailure("state_conflict");
        generatedBlocks.push({ candidatePath: node.path, ordinal: node.ordinal, block: plain,
          insertAfterBlockId: decision.insertAfterBlockId ?? null });
      } else if (node.path.startsWith("/featureProposals/")) {
        acceptedFeatures.push({ node, text: value,
          anchor: decision.insertAfterBlockId ?? null });
      } else if (node.path.startsWith("/faqProposals/")) {
        const index = Number(node.path.slice("/faqProposals/".length));
        const faq = candidate.payload.faqProposals[index];
        if (faq === undefined) return aiFailure("state_conflict");
        acceptedFaqs.push({ node, question: faq.question.text, answer: faq.answer.text,
          anchor: decision.insertAfterBlockId ?? null });
      } else {
        const match = /^\/mediaTextProposals\/(\d+)\/(altText|caption)$/.exec(node.path);
        if (match === null) return aiFailure("state_conflict");
        const index = Number(match[1]);
        const field = match[2] as "altText" | "caption";
        const proposal = candidate.payload.mediaTextProposals[index];
        if (proposal === undefined) return aiFailure("state_conflict");
        const existing = media.get(proposal.placementRef) ?? {
          placementRef: proposal.placementRef as `media_${string}`,
        };
        media.set(proposal.placementRef, { ...existing, [field]: value.trim() || null });
      }
    } else {
      if (node.path === "/titleProposal") result.title = value;
      else if (node.path === "/summaryProposal") result.summary = value.trim() || null;
      else if (node.path.startsWith("/blocks/")) {
        const index = Number(node.path.slice("/blocks/".length));
        const block = candidate.payload.blocks[index];
        const plain = block === undefined ? null : plainCandidateBlock(
          block as unknown as Readonly<Record<string, unknown>>, node.id, decision.editedText,
        );
        if (plain === null) return aiFailure("state_conflict");
        generatedBlocks.push({ candidatePath: node.path, ordinal: node.ordinal, block: plain,
          insertAfterBlockId: decision.insertAfterBlockId ?? null });
      } else return aiFailure("state_conflict");
    }
  }
  if (acceptedCount === 0) return aiFailure("state_conflict");
  const aggregate = <T extends { node: ReviewProposalNodeV1; anchor: string | null }>(
    values: readonly T[],
    block: (id: string) => EditorialBlock | null,
  ): boolean => {
    if (values.length === 0) return true;
    if (values.some((value) => value.anchor !== values[0]!.anchor)) return false;
    const built = block(values[0]!.node.id);
    if (built === null) return false;
    generatedBlocks.push({ candidatePath: values[0]!.node.path,
      ordinal: values[0]!.node.ordinal, block: built, insertAfterBlockId: values[0]!.anchor });
    return true;
  };
  if (!aggregate(acceptedFeatures, (id) => {
    const parsed = blockSchema.safeParse({ id, type: "feature_list",
      items: acceptedFeatures.map((item) => item.text) });
    return parsed.success ? parsed.data : null;
  }) || !aggregate(acceptedFaqs, (id) => {
    const parsed = blockSchema.safeParse({ id, type: "faq",
      items: acceptedFaqs.map((item) => ({ question: item.question, answer: item.answer })) });
    return parsed.success ? parsed.data : null;
  })) return aiFailure("state_conflict");
  generatedBlocks.sort((left, right) => left.ordinal - right.ordinal);
  const anchorIndex = (anchor: string | null): number => anchor === null ? -1
    : projection.before.document.findIndex((block) => block.id === anchor);
  if (generatedBlocks.some((block, index) => index > 0 &&
    anchorIndex(block.insertAfterBlockId) < anchorIndex(generatedBlocks[index - 1]!.insertAfterBlockId))) {
    return aiFailure("state_conflict");
  }
  const storedSources = decodeStoredDraftInputSourcesV1(evidence.inputSources);
  if (!storedSources.ok) return aiFailure("context_provenance_mismatch");
  const mediaSelectionHashes = storedSources.value.filter((source) =>
    source.sourceClass === "product_media_placement").map((source) =>
    source.sourceIdentity.selectionSha256);
  if (projection.before.kind === "product" &&
    mediaSelectionHashes.length !== projection.before.mediaText.length ||
    projection.before.kind === "content" && mediaSelectionHashes.length !== 0) {
    return aiFailure("context_provenance_mismatch");
  }
  return aiSuccess({
    owner: projection.target.kind,
    useCase: projection.run.useCase,
    projectionKey: projection.projectionKey,
    targetDraftVersion: projection.target.draftVersion,
    revisionId: projection.target.revisionId,
    ...result,
    generatedBlocks,
    mediaText: [...media.values()],
    mediaSelectionHashes,
    disposition: pristine ? "accepted" : "accepted_with_edits",
  });
}

export function fingerprintApplyAiDraftCandidateV1(
  untrustedCommand: unknown,
): AiServiceResult<AiCandidateApplyCommandFingerprintV1> {
  const decoded = applyAiDraftCandidateV1Schema.safeParse(untrustedCommand);
  if (!decoded.success) return aiFailure("state_conflict");
  const command = decoded.data;
  const fingerprint = canonicalJsonHash({
    contract: "cwt.ai.apply-draft-candidate-command",
    version: 1,
    runId: command.runId,
    expectedRunStateVersion: command.expectedRunStateVersion,
    candidateHash: command.candidateHash,
    expectedTargetVersion: command.expectedTargetVersion,
    expectedRevisionId: command.expectedRevisionId,
    expectedRevisionDraftVersion: command.expectedRevisionDraftVersion,
    decisions: command.decisions.map((decision) => ({
      candidatePath: decision.candidatePath,
      decision: decision.decision,
      editedText: Object.hasOwn(decision, "editedText")
        ? { present: true, value: decision.editedText as string }
        : { present: false },
      insertAfterBlockId: Object.hasOwn(decision, "insertAfterBlockId")
        ? { present: true, value: decision.insertAfterBlockId ?? null }
        : { present: false },
    })),
    quality: {
      rating: command.qualityRating,
      labels: command.qualityLabels,
      comment: command.qualityComment,
    },
  });
  return fingerprint.ok
    ? aiSuccess({ version: 1, hash: fingerprint.value.hash })
    : aiFailure("state_conflict");
}

export interface DraftReviewProjectionBuilderV1<TQueryResult extends PgQueryResultHKT> {
  build(input: {
    readonly scope: DraftConsistentReadScope<TQueryResult>;
    readonly actor: import("@/ai/core/contracts").CoreAiActorV1;
    readonly evidence: AiRunAuthorizedEvidenceV1;
  }): Promise<AiServiceResult<AiDraftReviewProjectionV1>>;
  buildApplicationPlan(input: {
    readonly scope: DraftConsistentReadScope<TQueryResult>;
    readonly actor: import("@/ai/core/contracts").CoreAiActorV1;
    readonly evidence: AiRunAuthorizedEvidenceV1;
    readonly command: ApplyAiDraftCandidateV1;
  }): Promise<AiServiceResult<DraftCandidateApplicationPlanV1>>;
}

export function createDraftReviewProjectionBuilderV1<
  TQueryResult extends PgQueryResultHKT,
>(readers: DomainReadersV1<TQueryResult>): DraftReviewProjectionBuilderV1<TQueryResult> {
  const build: DraftReviewProjectionBuilderV1<TQueryResult>["build"] = async (input) => {
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
        ? aiSuccess({ ...base, target: { kind: "product", locale: "en", draftVersion: target.value.editVersion,
          revisionId: target.value.revisionId },
          before: before as Extract<AiDraftReviewProjectionV1, { target: { kind: "product" } }>["before"] })
        : aiSuccess({ ...base, target: { kind: "content", locale: "en", draftVersion: target.value.editVersion,
          revisionId: target.value.revisionId, channel: (target.value as ContentAiTargetSnapshotV1).channel },
          before: before as Extract<AiDraftReviewProjectionV1, { target: { kind: "content" } }>["before"] });
  };
  return {
    build,
    async buildApplicationPlan(input) {
      const projection = await build(input);
      if (!projection.ok) return projection;
      const context = decodeReconstructibleDraftContextV1(input.evidence.inputContext);
      if (!context.ok) return context;
      const candidate = validateCandidate(input.evidence, context.value);
      return candidate.ok
        ? buildApplicationPlan(projection.value, candidate.value, input.evidence, input.command)
        : candidate;
    },
  };
}

export interface DraftCandidateApplicationPlannerV1 {
  fingerprint(command: unknown): AiServiceResult<AiCandidateApplyCommandFingerprintV1>;
  build(input: {
    readonly transaction: AppDatabase<PostgresJsQueryResultHKT>;
    readonly actor: import("@/ai/core/contracts").CoreAiActorV1;
    readonly evidence: AiRunAuthorizedEvidenceV1;
    readonly command: ApplyAiDraftCandidateV1;
  }): Promise<AiServiceResult<DraftCandidateApplicationPlanV1>>;
  compose(
    current: BlockDocument,
    generated: readonly DraftCandidateGeneratedBlockV1[],
    owner: "product" | "content",
  ): AiServiceResult<BlockDocument>;
}

export function createDraftCandidateApplicationPlannerV1(
  readers: DomainReadersV1<PostgresJsQueryResultHKT>,
): DraftCandidateApplicationPlannerV1 {
  const builder = createDraftReviewProjectionBuilderV1(readers);
  const unavailableOperations: DraftTransactionScopeOperationsV1 = {
    async findReplay() { throw new Error("Apply review scope cannot enqueue a run."); },
    async authorizeLockAndSnapshotTargetForNewRequest() {
      throw new Error("Apply review scope cannot authorize an enqueue target.");
    },
    async lockSelectedConfigForNewRequest() {
      throw new Error("Apply review scope cannot read configuration.");
    },
    async insertPreparedWithRequiredAudit() {
      throw new Error("Apply review scope cannot insert a run.");
    },
  };
  return {
    fingerprint: fingerprintApplyAiDraftCandidateV1,
    compose: composeDraftCandidateBlocksV1,
    build(input) {
      return withTransactionBoundDraftEnqueueScope(
        input.transaction,
        unavailableOperations,
        (scope) => builder.buildApplicationPlan({
          scope,
          actor: input.actor,
          evidence: input.evidence,
          command: input.command,
        }),
      );
    },
  };
}
