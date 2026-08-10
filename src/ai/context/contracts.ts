import type {
  JsonPrimitive,
  ReadonlyJsonObject,
} from "../canonical-json";

export type SourceProvenanceV1 = "structural" | "provided" | "verified";

export type CompanyFactField =
  | "factKey"
  | "subject"
  | "statement"
  | "relationshipToCwt";

export type ProductContextField =
  | "name"
  | "primaryCategoryLabel"
  | "additionalCategoryLabels"
  | "applicationLabels"
  | "composition"
  | "weightGsm"
  | "widthCm"
  | "moqPair"
  | "fabricStyle"
  | "colorOptions"
  | "moqNote"
  | "customAvailable"
  | "sampleAvailable";

export type FabricKnowledgeField = "title" | "excerpt" | "narrativeText";

export type ExplicitContextSelector =
  | {
      readonly sourceClass: "public_company_fact";
      readonly sourceId: string;
      readonly fields: readonly CompanyFactField[];
    }
  | {
      readonly sourceClass: "product_structured";
      readonly sourceId: string;
      readonly fields: readonly ProductContextField[];
    }
  | {
      readonly sourceClass: "fabric_knowledge";
      readonly sourceId: string;
      readonly fields: readonly FabricKnowledgeField[];
    }
  | {
      readonly sourceClass: "explicit_human_input";
      readonly origin: "typed_brief" | "operator_selected_target_text";
    };

export interface ReconstructibleSourceEntryV1 {
  readonly alias: string;
  readonly sourceClass:
    | "public_company_fact"
    | "product_structured"
    | "fabric_knowledge"
    | "explicit_human_input";
  readonly selectedBy: "request_actor";
  readonly fields: readonly {
    readonly field: string;
    readonly ref: string;
    readonly provenance: SourceProvenanceV1;
    readonly value:
      | JsonPrimitive
      | readonly JsonPrimitive[]
      | ReadonlyJsonObject;
  }[];
}
