import type { ApplicationProtectedResultPolicy } from "@/ai/applications/contracts";
import type { ReconstructibleDraftContextV1 } from "@/ai/applications/draft-assistance/context";

import { protectDraftCandidateV1, type ProtectedDraftCandidateV1 } from "./common";
import { fabricKnowledgeDraftV1Schema } from "./fabric-knowledge-draft";
import { productDescriptionDraftV1Schema } from "./product-description-draft";
import { seoContentDraftV1Schema } from "./seo-content-draft";
import { sourcingGuideDraftV1Schema } from "./sourcing-guide-draft";

export interface DraftOutputDefinitionV1 {
  readonly useCase:
    | "seo_content_draft"
    | "fabric_knowledge_draft"
    | "product_description_draft"
    | "sourcing_guide_draft";
  readonly schemaId: string;
  readonly schemaVersion: 1;
  readonly policyVersion: string;
  readonly policy: ApplicationProtectedResultPolicy<
    ReconstructibleDraftContextV1,
    ProtectedDraftCandidateV1
  >;
}

function definition(input: {
  readonly useCase: DraftOutputDefinitionV1["useCase"];
  readonly schemaId: string;
  readonly policyVersion: string;
  readonly schema: import("zod").ZodType;
}): DraftOutputDefinitionV1 {
  return {
    useCase: input.useCase,
    schemaId: input.schemaId,
    schemaVersion: 1,
    policyVersion: input.policyVersion,
    policy: {
      outputSchemaId: input.schemaId,
      outputSchemaVersion: 1,
      resultKind: "draft_candidate",
      dispositionKind: "draft_human_review",
      parseAndProtect(candidate) {
        return protectDraftCandidateV1({
          rawObject: candidate.rawObject,
          context: candidate.context,
          schema: input.schema,
          useCase: input.useCase,
          schemaId: input.schemaId,
          policyVersion: input.policyVersion,
        });
      },
    },
  };
}

export const draftOutputDefinitionsV1: readonly DraftOutputDefinitionV1[] = Object.freeze([
  definition({
    useCase: "seo_content_draft",
    schemaId: "cwt.seo-content-draft.v1",
    policyVersion: "draft-seo-content-v1",
    schema: seoContentDraftV1Schema,
  }),
  definition({
    useCase: "fabric_knowledge_draft",
    schemaId: "cwt.fabric-knowledge-draft.v1",
    policyVersion: "draft-fabric-knowledge-v1",
    schema: fabricKnowledgeDraftV1Schema,
  }),
  definition({
    useCase: "product_description_draft",
    schemaId: "cwt.product-description-draft.v1",
    policyVersion: "draft-product-description-v1",
    schema: productDescriptionDraftV1Schema,
  }),
  definition({
    useCase: "sourcing_guide_draft",
    schemaId: "cwt.sourcing-guide-draft.v1",
    policyVersion: "draft-sourcing-guide-v1",
    schema: sourcingGuideDraftV1Schema,
  }),
]);

export function draftOutputDefinitionV1(
  useCase: DraftOutputDefinitionV1["useCase"],
): DraftOutputDefinitionV1 | undefined {
  return draftOutputDefinitionsV1.find((candidate) => candidate.useCase === useCase);
}
