import { z } from "zod";

import { evidenceTextSchema, seoNarrativeBlockSchema } from "./common";

export const seoContentDraftV1Schema = z.object({
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
