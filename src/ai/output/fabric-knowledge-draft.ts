import { z } from "zod";

import { evidenceTextSchema, fabricNarrativeBlockSchema } from "./common";

export const fabricKnowledgeDraftV1Schema = z.object({
  schemaVersion: z.literal(1),
  useCase: z.literal("fabric_knowledge_draft"),
  locale: z.literal("en"),
  titleProposal: evidenceTextSchema(300).optional(),
  summaryProposal: evidenceTextSchema(1_000).optional(),
  outline: z.array(evidenceTextSchema(300)).max(20),
  blocks: z.array(fabricNarrativeBlockSchema).max(50),
}).strict();
