import type { UserRole } from "@/auth/permissions";
import type { ExplicitContextSelector } from "@/ai/context/contracts";
import type { AiErrorCode, AiServiceResult } from "@/ai/errors";

export const productionAiUseCases = [
  "seo_content_draft",
  "fabric_knowledge_draft",
  "product_description_draft",
  "sourcing_guide_draft",
] as const;

export type ProductionAiUseCase = (typeof productionAiUseCases)[number];

export type DraftAssistanceTaskV1 =
  | {
      readonly kind: "seo_content_draft";
      readonly tone: "concise_professional_b2b";
      readonly pageIntent: string;
      readonly primaryPhrase?: string;
      readonly selectedInternalLinkIds: readonly string[];
    }
  | {
      readonly kind: "fabric_knowledge_draft";
      readonly tone: "neutral_editorial";
      readonly topic: string;
    }
  | {
      readonly kind: "product_description_draft";
      readonly tone: "concise_professional_b2b";
      readonly selectedMediaPlacementIds: readonly string[];
    }
  | {
      readonly kind: "sourcing_guide_draft";
      readonly tone: "concise_professional_b2b";
      readonly guideIntent: string;
    };

export interface AiActor {
  readonly userId: string;
  readonly role: UserRole;
}

export type DraftTarget =
  | {
      readonly type: "product_draft";
      readonly productId: string;
      readonly locale: "en";
      readonly expectedVersion: number;
    }
  | {
      readonly type: "content_draft";
      readonly contentId: string;
      readonly locale: "en";
      readonly expectedVersion: number;
    }
  | {
      readonly type: "editorial_revision";
      readonly revisionId: string;
      readonly expectedVersion: number;
    };

export type DraftDurableAssociationWithoutHashV1 =
  | {
      readonly persistenceVersion: 1;
      readonly kind: "draft_target.v1";
      readonly targetType: "product_draft";
      readonly targetProductId: string;
      readonly targetLocale: "en";
      readonly expectedTargetVersion: number;
    }
  | {
      readonly persistenceVersion: 1;
      readonly kind: "draft_target.v1";
      readonly targetType: "content_draft";
      readonly targetContentId: string;
      readonly targetLocale: "en";
      readonly expectedTargetVersion: number;
    }
  | {
      readonly persistenceVersion: 1;
      readonly kind: "draft_target.v1";
      readonly targetType: "editorial_revision";
      readonly targetRevisionId: string;
      readonly expectedTargetVersion: number;
    };

export type DraftDurableAssociationV1 =
  DraftDurableAssociationWithoutHashV1 & {
    readonly targetSnapshotHash: string;
  };

export type DraftAuthorizedTargetSnapshotV1 =
  | {
      readonly association_version: 1;
      readonly expected_target_version: number;
      readonly target_locale: "en";
      readonly target_product_id: string;
      readonly target_type: "product_draft";
    }
  | {
      readonly association_version: 1;
      readonly expected_target_version: number;
      readonly target_content_id: string;
      readonly target_locale: "en";
      readonly target_type: "content_draft";
    }
  | {
      readonly association_version: 1;
      readonly expected_target_version: number;
      readonly target_revision_id: string;
      readonly target_type: "editorial_revision";
    };

export interface AuthorizedDraftAssociationV1 {
  readonly association: DraftDurableAssociationWithoutHashV1;
  readonly snapshot: DraftAuthorizedTargetSnapshotV1;
  readonly snapshotHash: string;
}

export interface DraftTargetColumnProjectionV1 {
  readonly targetType:
    | "product_draft"
    | "content_draft"
    | "editorial_revision";
  readonly targetProductId: string | null;
  readonly targetContentId: string | null;
  readonly targetRevisionId: string | null;
  readonly targetLocale: "en" | null;
  readonly expectedTargetVersion: number;
  readonly targetSnapshotHash: string;
}

interface DraftAssistanceInputV1 {
  readonly useCase: ProductionAiUseCase;
  readonly task: DraftAssistanceTaskV1;
  readonly actor: AiActor;
  readonly target: DraftTarget;
  readonly contextSelections: readonly ExplicitContextSelector[];
  readonly explicitInput?: string;
}

export interface DraftAssistanceCommandV1 extends DraftAssistanceInputV1 {
  readonly idempotencyKey: string;
}

export type DraftAssistanceAvailabilityQueryV1 = DraftAssistanceInputV1;

export interface AiAvailabilityV1 {
  readonly available: boolean;
  readonly manualEditorAvailable: boolean;
  readonly code: AiErrorCode | "available";
}

export interface AiRunSummaryV1 {
  readonly runId: string;
  readonly applicationClass: "draft_assistance";
  readonly useCase: ProductionAiUseCase;
  readonly status:
    | "pending"
    | "processing"
    | "draft_ready"
    | "failed"
    | "cancelled";
  readonly queuedAt: string;
}

export type ReviewCurrentNodeKindV1 =
  | "heading"
  | "paragraph"
  | "image"
  | "gallery"
  | "specification_table"
  | "comparison_table"
  | "feature_list"
  | "bullet_list"
  | "callout"
  | "quote"
  | "faq"
  | "related_products"
  | "related_articles"
  | "cta"
  | "divider";

export interface ReviewCurrentNodeV1 {
  readonly id: string;
  readonly kind: ReviewCurrentNodeKindV1;
  readonly locked: boolean;
  /** Safe textual rendering only; relationship and media identifiers are intentionally absent. */
  readonly text: readonly string[];
}

export interface ReviewSeoBeforeV1 {
  readonly title: string | null;
  readonly metaDescription: string | null;
}

export interface ReviewMediaTextBeforeV1 {
  readonly placementRef: `media_${string}`;
  readonly altText: string | null;
  readonly caption: string | null;
}

export interface ProductBeforeV1 {
  readonly kind: "product";
  readonly name: string;
  readonly summary: string | null;
  readonly document: readonly ReviewCurrentNodeV1[];
  readonly seo: ReviewSeoBeforeV1;
  readonly mediaText: readonly ReviewMediaTextBeforeV1[];
}

export interface ContentBeforeV1 {
  readonly kind: "content";
  readonly title: string;
  readonly summary: string | null;
  readonly document: readonly ReviewCurrentNodeV1[];
  readonly seo: ReviewSeoBeforeV1;
}

export type ReviewProposalNodeKindV1 =
  | "title"
  | "summary"
  | "outline"
  | "block"
  | "feature"
  | "faq"
  | "internal_link"
  | "media_text";

export interface ReviewProposalNodeV1 {
  readonly id: string;
  readonly path: string;
  readonly ordinal: number;
  readonly kind: ReviewProposalNodeKindV1;
  readonly label: string;
  readonly proposedText: string;
  readonly beforeText: string | null;
  readonly details: readonly string[];
  readonly editable: boolean;
  readonly previewOnly: boolean;
}

export interface ReviewSeoProposalV1 {
  readonly title?: ReviewProposalNodeV1;
  readonly metaDescription?: ReviewProposalNodeV1;
}

interface ReviewProjectionBaseV1 {
  readonly version: 1;
  readonly run: {
    readonly id: string;
    readonly useCase: ProductionAiUseCase;
    readonly stateVersion: number;
    readonly candidateHash: string;
  };
  readonly projectionKey: string;
  readonly proposal: {
    readonly nodes: readonly ReviewProposalNodeV1[];
    readonly seo?: ReviewSeoProposalV1 | undefined;
  };
}

export type AiDraftReviewProjectionV1 =
  | (ReviewProjectionBaseV1 & {
      readonly target: {
        readonly kind: "product";
        readonly locale: "en";
        readonly draftVersion: number;
      };
      readonly before: ProductBeforeV1;
    })
  | (ReviewProjectionBaseV1 & {
      readonly target: {
        readonly kind: "content";
        readonly locale: "en";
        readonly draftVersion: number;
        readonly channel: "fabric_knowledge" | "china_sourcing_guide" | "china_textile_guide";
      };
      readonly before: ContentBeforeV1;
    });

export interface DraftAssistanceService {
  inspectDraftAssistanceAvailability(
    query: DraftAssistanceAvailabilityQueryV1,
  ): Promise<AiServiceResult<AiAvailabilityV1>>;
  requestDraftAssistance(
    command: DraftAssistanceCommandV1,
  ): Promise<AiServiceResult<AiRunSummaryV1>>;
}

export type DraftAssistanceAvailabilityService = Pick<
  DraftAssistanceService,
  "inspectDraftAssistanceAvailability"
>;
