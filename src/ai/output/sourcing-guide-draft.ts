import { z } from "zod";

import { evidenceTextSchema, sourcingNarrativeBlockSchema } from "./common";

export const sourcingGuideDraftV1Schema = z.object({
  schemaVersion: z.literal(1),
  useCase: z.literal("sourcing_guide_draft"),
  locale: z.literal("en"),
  titleProposal: evidenceTextSchema(200).optional(),
  summaryProposal: evidenceTextSchema(1_000).optional(),
  outline: z.array(evidenceTextSchema(300)).max(24),
  blocks: z.array(sourcingNarrativeBlockSchema).max(60),
}).strict();
