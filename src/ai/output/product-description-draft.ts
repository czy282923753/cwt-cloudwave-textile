import { z } from "zod";

import {
  evidenceTextSchema,
  faqItemSchema,
  productNarrativeBlockSchema,
} from "./common";

export const productDescriptionDraftV1Schema = z.object({
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
