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
