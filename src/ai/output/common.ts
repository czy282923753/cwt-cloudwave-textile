import { z } from "zod";

import {
  canonicalJsonHash,
  type ReadonlyJsonObject,
  type ReadonlyJsonValue,
} from "@/ai/canonical-json";
import type { ReconstructibleDraftContextV1 } from "@/ai/applications/draft-assistance/context";
import { protectedDataClassifierV1 } from "@/ai/context/protected-data";
import { aiFailure, aiSuccess, type AiServiceResult } from "@/ai/errors";

const referencePattern = /^src_[0-9]{2}:[a-z][A-Za-z0-9_]{0,63}$/;

function unicodeScalars(value: string): number {
  return Array.from(value).length;
}

export function evidenceTextSchema(maxScalars: number) {
  return z.object({
    text: z.string().refine((value) =>
      value.length > 0 && unicodeScalars(value) <= maxScalars &&
      value === value.trim() && !value.includes("\r"),
    ),
    sourceRefs: z.array(z.string().regex(referencePattern)).max(8),
  }).strict();
}

const headingBlock = z.object({
  type: z.literal("heading"),
  level: z.union([z.literal(2), z.literal(3), z.literal(4)]),
  text: evidenceTextSchema(500),
}).strict();
const paragraphBlock = z.object({
  type: z.literal("paragraph"),
  text: evidenceTextSchema(20_000),
}).strict();
const featureListBlock = z.object({
  type: z.literal("feature_list"),
  items: z.array(evidenceTextSchema(1_000)).min(1).max(20),
}).strict();
const bulletListBlock = z.object({
  type: z.literal("bullet_list"),
  items: z.array(evidenceTextSchema(1_000)).min(1).max(20),
}).strict();
const calloutBlock = z.object({
  type: z.literal("callout"),
  title: evidenceTextSchema(500).optional(),
  text: evidenceTextSchema(20_000),
}).strict();
const faqItem = z.object({
  question: evidenceTextSchema(500),
  answer: evidenceTextSchema(5_000),
}).strict();
const faqBlock = z.object({
  type: z.literal("faq"),
  items: z.array(faqItem).min(1).max(15),
}).strict();

export const seoNarrativeBlockSchema = z.discriminatedUnion("type", [
  headingBlock, paragraphBlock, bulletListBlock, calloutBlock, faqBlock,
]);
export const fabricNarrativeBlockSchema = z.discriminatedUnion("type", [
  headingBlock, paragraphBlock, featureListBlock, bulletListBlock,
  calloutBlock, faqBlock,
]);
export const productNarrativeBlockSchema = fabricNarrativeBlockSchema;
export const sourcingNarrativeBlockSchema = seoNarrativeBlockSchema;
export const faqItemSchema = faqItem;

interface EvidenceNodeV1 {
  readonly text: string;
  readonly sourceRefs: readonly string[];
}

interface CandidateBlockV1 {
  readonly path: string;
  readonly ordinal: number;
  readonly block: ReadonlyJsonObject;
}

export interface ProtectedDraftCandidateV1 extends ReadonlyJsonObject {
  readonly schemaVersion: 1;
  readonly useCase: string;
  readonly locale: "en";
  readonly payload: ReadonlyJsonObject;
  readonly derivedCandidateRefs: readonly (ReadonlyJsonObject & {
    readonly containerPath: string;
    readonly candidateRef: string;
  })[];
  readonly automaticEvidenceStatus: "structural_provenance_checked";
  readonly semanticReviewStatus: "human_review_required";
}

function isJsonObject(value: ReadonlyJsonValue): value is ReadonlyJsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function collectCandidateMaterial(
  value: ReadonlyJsonValue,
  path: string,
  evidence: EvidenceNodeV1[],
  blocks: CandidateBlockV1[],
): void {
  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      collectCandidateMaterial(item, `${path}/${index}`, evidence, blocks));
    return;
  }
  if (!isJsonObject(value)) return;
  if (
    typeof value.text === "string" && Array.isArray(value.sourceRefs) &&
    value.sourceRefs.every((ref) => typeof ref === "string")
  ) {
    evidence.push({ text: value.text, sourceRefs: value.sourceRefs });
  }
  if (typeof value.type === "string") {
    blocks.push({ path, ordinal: blocks.length + 1, block: value });
  }
  for (const key of Object.keys(value)) {
    const child = value[key];
    if (child !== undefined) collectCandidateMaterial(child, `${path}/${key}`, evidence, blocks);
  }
}

function contextFields(context: ReconstructibleDraftContextV1): ReadonlyMap<
  string,
  { readonly alias: string; readonly field: string; readonly value: ReadonlyJsonValue }
> {
  const map = new Map<string, {
    readonly alias: string;
    readonly field: string;
    readonly value: ReadonlyJsonValue;
  }>();
  for (const source of context.sources) {
    for (const field of source.fields) {
      map.set(field.ref, { alias: source.alias, field: field.field, value: field.value });
    }
  }
  return map;
}

function numericPolicyPasses(
  text: string,
  refs: readonly string[],
  fields: ReadonlyMap<string, { readonly alias: string; readonly field: string; readonly value: ReadonlyJsonValue }>,
): boolean {
  let scan = text.normalize("NFKC").toLowerCase();
  const matches = Array.from(scan.matchAll(/(?<![+\-\d.])([1-9]\d*(?:\.\d+)?|0\.\d+) (gsm|cm|m|kg|roll|yd)(?![a-z\d])/g));
  for (const match of matches) {
    const number = match[1];
    const unit = match[2];
    if (number === undefined || unit === undefined || number.endsWith("0") && number.includes(".")) return false;
    const cited = refs.flatMap((ref) => {
      const field = fields.get(ref);
      return field === undefined ? [] : [field];
    });
    if (unit === "gsm") {
      if (!cited.some((field) => field.field === "weightGsm" && field.value === number)) return false;
    } else if (unit === "cm") {
      if (!cited.some((field) => field.field === "widthCm" && field.value === number)) return false;
    } else {
      if (!cited.some((valueField) =>
        valueField.field === "moqValue" && valueField.value === number &&
        cited.some((unitField) => unitField.alias === valueField.alias &&
          unitField.field === "moqUnit" && unitField.value === unit))) return false;
    }
  }
  scan = scan.replace(/(?<![+\-\d.])([1-9]\d*(?:\.\d+)?|0\.\d+) (gsm|cm|m|kg|roll|yd)(?![a-z\d])/g, "");
  return !/\p{N}/u.test(scan);
}

const bannedCurrencyOrTime = /[$¢£¥€₹₩％%]|\b(?:usd|eur|gbp|cny|rmb|jpy|percent|percentage|january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sep|oct|nov|dec|monday|tuesday|wednesday|thursday|friday|saturday|sunday|mon|tue|wed|thu|fri|sat|sun|today|tomorrow|yesterday|am|pm|utc|gmt)\b/iu;
const bannedActionOrClaim = /\b(?:certification|certified|certificate|iso|oeko|grs|gots|bci|factory|facility|plant|workshop|equipment|machine|loom|capacity|employees|staff|founded|established|ownership|customer|client|crm|inquiry|email|phone|telephone|whatsapp|wechat|publish|index|noindex|route|redirect|canonical|sitemap|deploy|retrieve|retrieval|browse|upload|download)\b|\b(?:our factory|in house|years of experience|contact us|send message|call tool|search web|open file|read file)\b/iu;
const placeholder = /(?:\bTODO\b|\bTBD\b|\[insert[^\]]*\]|lorem ipsum)/iu;

function validateEvidence(
  nodes: readonly EvidenceNodeV1[],
  context: ReconstructibleDraftContextV1,
): boolean {
  const fields = contextFields(context);
  const orderedRefs = Array.from(fields.keys());
  for (const node of nodes) {
    if (node.sourceRefs.length === 0 || new Set(node.sourceRefs).size !== node.sourceRefs.length) return false;
    const positions = node.sourceRefs.map((ref) => orderedRefs.indexOf(ref));
    if (positions.some((position) => position < 0)) return false;
    for (let index = 1; index < positions.length; index += 1) {
      const previous = positions[index - 1];
      const current = positions[index];
      if (previous === undefined || current === undefined || current <= previous) return false;
    }
    if (Buffer.byteLength(node.text, "utf8") > 20_000 || placeholder.test(node.text)) return false;
    if (!numericPolicyPasses(node.text, node.sourceRefs, fields)) return false;
    if (bannedCurrencyOrTime.test(node.text) || bannedActionOrClaim.test(node.text)) return false;
    if (protectedDataClassifierV1.classify(node.text).kind !== "allow") return false;
  }
  return true;
}

function mechanicsPass(
  rawObject: ReadonlyJsonObject,
  context: ReconstructibleDraftContextV1,
): boolean {
  const links = new Set(context.internalLinkCandidates.map((candidate) => candidate.candidateRef));
  const media = new Set(context.mediaPlacementRefs);
  const visit = (value: ReadonlyJsonValue): boolean => {
    if (Array.isArray(value)) return value.every(visit);
    if (!isJsonObject(value)) return true;
    if (typeof value.candidateRef === "string" && !links.has(value.candidateRef)) return false;
    if (typeof value.placementRef === "string" && !media.has(value.placementRef)) return false;
    return Object.values(value).every(visit);
  };
  return visit(rawObject);
}

export function protectDraftCandidateV1(input: {
  readonly rawObject: ReadonlyJsonObject;
  readonly context: ReconstructibleDraftContextV1;
  readonly schema: z.ZodType;
  readonly useCase: string;
  readonly schemaId: string;
  readonly policyVersion: string;
}): AiServiceResult<import("@/ai/core/contracts").ProtectedApplicationResultEnvelopeV1 & {
  readonly value: ProtectedDraftCandidateV1;
}> {
  const parsed = input.schema.safeParse(input.rawObject);
  if (!parsed.success) return aiFailure("output_schema_invalid");
  if (input.context.useCase !== input.useCase) return aiFailure("output_policy_rejected");
  const evidence: EvidenceNodeV1[] = [];
  const blocks: CandidateBlockV1[] = [];
  collectCandidateMaterial(input.rawObject, "", evidence, blocks);
  if (evidence.length === 0 || !validateEvidence(evidence, input.context) ||
    !mechanicsPass(input.rawObject, input.context)) {
    return aiFailure("output_policy_rejected");
  }
  let previousHeading = 1;
  for (const block of blocks) {
    if (block.block.type === "heading" && typeof block.block.level === "number") {
      if (block.block.level > previousHeading + 1) return aiFailure("output_policy_rejected");
      previousHeading = block.block.level;
    }
  }
  const derivedCandidateRefs: (ReadonlyJsonObject & {
    readonly containerPath: string;
    readonly candidateRef: string;
  })[] = [];
  for (const block of blocks) {
    const protectedBlock = canonicalJsonHash({
      useCase: input.useCase,
      containerPath: block.path,
      ordinal: block.ordinal,
      block: block.block,
    });
    if (!protectedBlock.ok) return aiFailure("canonicalization_failed");
    derivedCandidateRefs.push({
      containerPath: block.path,
      candidateRef: `cand_${String(block.ordinal).padStart(4, "0")}_${protectedBlock.value.hash}`,
    });
  }
  const value: ProtectedDraftCandidateV1 = {
    schemaVersion: 1,
    useCase: input.useCase,
    locale: "en",
    payload: input.rawObject,
    derivedCandidateRefs,
    automaticEvidenceStatus: "structural_provenance_checked",
    semanticReviewStatus: "human_review_required",
  };
  const protectedValue = canonicalJsonHash(value);
  if (!protectedValue.ok) return aiFailure("canonicalization_failed");
  if (Buffer.byteLength(protectedValue.value.canonicalJson, "utf8") > 65_536) {
    return aiFailure("output_too_large");
  }
  return aiSuccess({
    version: 1,
    resultKind: "draft_candidate",
    dispositionKind: "draft_human_review",
    schemaId: input.schemaId,
    schemaVersion: 1,
    policyVersion: input.policyVersion,
    value,
    canonicalJson: protectedValue.value.canonicalJson,
    hash: protectedValue.value.hash,
  });
}
