import { z } from "zod";

const blockIdSchema = z
  .string()
  .min(1)
  .max(64)
  .regex(/^[A-Za-z0-9_-]+$/, "Block IDs may contain letters, numbers, underscore, and hyphen only.");
const shortText = z.string().trim().min(1).max(500);
const bodyText = z.string().min(1).max(20_000);
const uuidList = z.array(z.uuid()).min(1).max(24).refine(
  (values) => new Set(values).size === values.length,
  "Related entity IDs must be unique.",
);
const mediaKey = z
  .string()
  .min(1)
  .max(80)
  .regex(/^[A-Za-z0-9_-]+$/, "Media keys may contain letters, numbers, underscore, and hyphen only.");
const internalHref = z
  .string()
  .min(1)
  .max(500)
  .regex(/^\/(?!\/)[^\s]*$/, "CTA links must be application-controlled root-relative paths.");
const blockBase = {
  id: blockIdSchema,
  locked: z.boolean().optional(),
} as const;

const headingBlockSchema = z.object({
  ...blockBase,
  type: z.literal("heading"),
  level: z.union([z.literal(2), z.literal(3), z.literal(4)]),
  text: shortText,
}).strict();

const paragraphBlockSchema = z.object({
  ...blockBase,
  type: z.literal("paragraph"),
  text: bodyText,
}).strict();

const imageBlockSchema = z.object({
  ...blockBase,
  type: z.literal("image"),
  mediaKey,
}).strict();

const galleryBlockSchema = z.object({
  ...blockBase,
  type: z.literal("gallery"),
  mediaKeys: z.array(mediaKey).min(2).max(12).refine(
    (values) => new Set(values).size === values.length,
    "Gallery media keys must be unique.",
  ),
}).strict();

const specificationTableBlockSchema = z.object({
  ...blockBase,
  type: z.literal("specification_table"),
  caption: shortText.optional(),
  rows: z.array(z.object({
    label: shortText,
    value: z.string().trim().min(1).max(2_000),
  }).strict()).min(1).max(50),
}).strict();

const comparisonTableBlockSchema = z.object({
  ...blockBase,
  type: z.literal("comparison_table"),
  caption: shortText.optional(),
  columns: z.array(shortText).min(2).max(8),
  rows: z.array(z.object({
    label: shortText,
    cells: z.array(z.string().trim().min(1).max(2_000)).min(2).max(8),
  }).strict()).min(1).max(50),
}).strict().superRefine((block, context) => {
  for (const [index, row] of block.rows.entries()) {
    if (row.cells.length !== block.columns.length) {
      context.addIssue({
        code: "custom",
        message: "Every comparison row must match the declared column count.",
        path: ["rows", index, "cells"],
      });
    }
  }
});

const textListBlockSchema = z.object({
  ...blockBase,
  type: z.enum(["feature_list", "bullet_list"]),
  items: z.array(z.string().trim().min(1).max(1_000)).min(1).max(50),
}).strict();

const calloutBlockSchema = z.object({
  ...blockBase,
  type: z.literal("callout"),
  title: shortText.optional(),
  text: bodyText,
}).strict();

const quoteBlockSchema = z.object({
  ...blockBase,
  type: z.literal("quote"),
  text: bodyText,
  attribution: shortText.optional(),
}).strict();

const faqBlockSchema = z.object({
  ...blockBase,
  type: z.literal("faq"),
  items: z.array(z.object({
    question: z.string().trim().min(1).max(500),
    answer: z.string().trim().min(1).max(5_000),
  }).strict()).min(1).max(30),
}).strict();

const relatedProductsBlockSchema = z.object({
  ...blockBase,
  type: z.literal("related_products"),
  productIds: uuidList,
}).strict();

const relatedArticlesBlockSchema = z.object({
  ...blockBase,
  type: z.literal("related_articles"),
  contentIds: uuidList,
}).strict();

const ctaBlockSchema = z.object({
  ...blockBase,
  type: z.literal("cta"),
  label: shortText,
  href: internalHref,
  supportingText: z.string().trim().min(1).max(1_000).optional(),
}).strict();

const dividerBlockSchema = z.object({
  ...blockBase,
  type: z.literal("divider"),
}).strict();

export const blockSchema = z.discriminatedUnion("type", [
  headingBlockSchema,
  paragraphBlockSchema,
  imageBlockSchema,
  galleryBlockSchema,
  specificationTableBlockSchema,
  comparisonTableBlockSchema,
  textListBlockSchema,
  calloutBlockSchema,
  quoteBlockSchema,
  faqBlockSchema,
  relatedProductsBlockSchema,
  relatedArticlesBlockSchema,
  ctaBlockSchema,
  dividerBlockSchema,
]);

export const blockDocumentSchema = z.object({
  version: z.literal(1),
  blocks: z.array(blockSchema).max(100),
}).strict().superRefine((document, context) => {
  const ids = new Set<string>();
  for (const [index, block] of document.blocks.entries()) {
    if (ids.has(block.id)) {
      context.addIssue({
        code: "custom",
        message: "Block IDs must be unique within a document.",
        path: ["blocks", index, "id"],
      });
    }
    ids.add(block.id);
  }
  if (JSON.stringify(document).length > 262_144) {
    context.addIssue({ code: "custom", message: "Block document exceeds 256 KiB." });
  }
});

export type EditorialBlock = z.infer<typeof blockSchema>;
export type BlockDocument = z.infer<typeof blockDocumentSchema>;
export type BlockDocumentContext = "product" | "content";

export const EMPTY_BLOCK_DOCUMENT: BlockDocument = Object.freeze({ version: 1, blocks: [] });

export function parseBlockDocument(
  input: unknown,
  context: BlockDocumentContext,
): BlockDocument {
  const document = blockDocumentSchema.parse(input);
  if (context === "product") {
    const factualTable = document.blocks.find(
      (block) => block.type === "specification_table",
    );
    if (factualTable) {
      throw new Error(
        "Product specification facts remain relational fields and cannot be duplicated in a narrative Block.",
      );
    }
  }
  return document;
}

export function legacyTextToBlockDocument(value: string | null | undefined): BlockDocument {
  if (!value?.trim()) return { version: 1, blocks: [] };
  return {
    version: 1,
    blocks: [{ id: "legacy-paragraph-1", type: "paragraph", text: value }],
  };
}

export function blockDocumentPlainText(document: BlockDocument): string {
  const parts: string[] = [];
  for (const block of document.blocks) {
    switch (block.type) {
      case "heading":
      case "paragraph":
      case "callout":
      case "quote":
        parts.push(block.text);
        break;
      case "specification_table":
        parts.push(...block.rows.flatMap((row) => [row.label, row.value]));
        break;
      case "comparison_table":
        parts.push(...block.columns, ...block.rows.flatMap((row) => [row.label, ...row.cells]));
        break;
      case "feature_list":
      case "bullet_list":
        parts.push(...block.items);
        break;
      case "faq":
        parts.push(...block.items.flatMap((item) => [item.question, item.answer]));
        break;
      case "cta":
        parts.push(block.label, ...(block.supportingText ? [block.supportingText] : []));
        break;
      default:
        break;
    }
  }
  return parts.join("\n").trim();
}

export function referencedMediaKeys(document: BlockDocument): string[] {
  const keys = document.blocks.flatMap((block) => {
    if (block.type === "image") return [block.mediaKey];
    if (block.type === "gallery") return block.mediaKeys;
    return [];
  });
  return [...new Set(keys)];
}
