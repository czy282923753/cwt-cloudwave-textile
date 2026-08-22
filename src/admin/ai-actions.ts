"use server";

import { z } from "zod";

import {
  applyAiDraftCandidateV1Schema,
  type AiDraftReviewProjectionV1,
  type DraftAssistanceCandidateApplyService,
} from "@/ai/applications/draft-assistance/contracts";
import type { SafeAiError } from "@/ai/errors";
import type { AiRunAuthorizedReadV1, AiRunStatusV1 } from "@/ai/runs/contracts";
import type { AiRunServiceV1 } from "@/ai/runs/service";
import { requireCurrentUser } from "@/auth/current-user";

const uuid = z.string().regex(
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
);
const stateVersion = z.number().int().min(1).max(2_147_483_647);
const runInputSchema = z.object({ runId: uuid }).strict();
const fencedRunInputSchema = z.object({ runId: uuid, stateVersion }).strict();
const rejectInputSchema = z.object({
  runId: uuid,
  stateVersion,
  candidateHash: z.string().regex(/^[0-9a-f]{64}$/),
  qualityRating: z.number().int().min(1).max(5).nullable(),
  qualityLabels: z.array(z.enum([
    "factual_issue", "relevance", "clarity", "tone", "format", "duplication", "unsafe_claim",
  ])).max(7).refine((values) => new Set(values).size === values.length),
  qualityComment: z.string().trim().min(1).max(1_000).nullable(),
}).strict();

export type AiDraftActionFailureCodeV1 =
  | "invalid_request"
  | "access_denied"
  | "conflict"
  | "unavailable";

export type AiDraftActionResultV1<T> =
  | { readonly ok: true; readonly value: T }
  | {
      readonly ok: false;
      readonly code: AiDraftActionFailureCodeV1;
      readonly message: string;
      readonly manualEditorAvailable: boolean;
    };

export interface AiDraftAvailabilityViewV1 {
  readonly available: boolean;
  readonly manualEditorAvailable: boolean;
  readonly message: string;
}

export interface AiDraftRunViewV1 {
  readonly runId: string;
  readonly useCase: string;
  readonly status: AiRunStatusV1;
  readonly stateVersion: number;
  readonly queuedAt: string;
  readonly candidateHash: string | null;
  readonly reviewProjection: AiDraftReviewProjectionV1 | null;
  readonly disposition: "not_evaluated" | "accepted" | "accepted_with_edits" | "rejected";
  readonly cancelAvailable: boolean;
  readonly manualRetryAvailable: boolean;
  readonly rejectAvailable: boolean;
  readonly applyAvailable: boolean;
  readonly appliedTargetVersion: number | null;
  readonly appliedRevisionId: string | null;
  readonly appliedRevisionDraftVersion: number | null;
  readonly message: string;
}

function invalidRequest<T>(): AiDraftActionResultV1<T> {
  return {
    ok: false,
    code: "invalid_request",
    message: "The AI assistance request is invalid.",
    manualEditorAvailable: true,
  };
}

function safeFailure<T>(error: SafeAiError): AiDraftActionResultV1<T> {
  if (error.category === "authorization") {
    return {
      ok: false,
      code: "access_denied",
      message: "AI assistance is unavailable for this record.",
      manualEditorAvailable: false,
    };
  }
  if (error.category === "conflict") {
    return {
      ok: false,
      code: "conflict",
      message: "The AI request changed. Refresh it before trying again.",
      manualEditorAvailable: error.manualEditorAvailable,
    };
  }
  return {
    ok: false,
    code: "unavailable",
    message: "AI assistance is unavailable. Ordinary manual editing is unchanged.",
    manualEditorAvailable: true,
  };
}

function runMessage(row: AiRunAuthorizedReadV1): string {
  switch (row.status) {
    case "pending": return "AI draft request queued.";
    case "processing": return "AI draft processing.";
    case "draft_ready": return row.humanDisposition === "not_evaluated"
      ? "AI draft candidate ready for review."
      : row.humanDisposition === "rejected"
        ? "AI draft candidate rejected."
        : row.appliedTargetVersion !== null || row.appliedRevisionId !== null
          ? "AI draft candidate applied."
          : "AI draft candidate review recorded.";
    case "failed": return row.manualRetryAvailable
      ? "AI draft failed. An authorized manual retry is available."
      : "AI draft failed safely. Ordinary manual editing is unchanged.";
    case "cancelled": return "AI draft request cancelled.";
  }
}

function safeRun(row: AiRunAuthorizedReadV1): AiDraftRunViewV1 {
  const disposition = (() => {
    switch (row.humanDisposition) {
      case "not_evaluated":
      case "accepted":
      case "accepted_with_edits":
      case "rejected": return row.humanDisposition;
      default: throw new Error("Stored AI run disposition is invalid.");
    }
  })();
  const ready = row.status === "draft_ready" && row.humanDisposition === "not_evaluated";
  if (ready) {
    const projection = row.reviewProjection;
    if (row.candidateHash === null || projection === null ||
      projection.run.id !== row.runId || projection.run.useCase !== row.useCase ||
      projection.run.stateVersion !== row.stateVersion ||
      projection.run.candidateHash !== row.candidateHash) {
      throw new Error("Authorized AI review projection is inconsistent.");
    }
  } else if (row.reviewProjection !== null) {
    throw new Error("Authorized AI review projection is not available in this lifecycle state.");
  }
  return {
    runId: row.runId,
    useCase: row.useCase,
    status: row.status,
    stateVersion: row.stateVersion,
    queuedAt: row.queuedAt,
    candidateHash: ready ? row.candidateHash : null,
    reviewProjection: ready ? row.reviewProjection : null,
    disposition,
    cancelAvailable: row.cancelAvailable,
    manualRetryAvailable: row.manualRetryAvailable,
    rejectAvailable: ready && row.rejectAvailable,
    applyAvailable: ready && row.applyAvailable,
    appliedTargetVersion: row.appliedTargetVersion,
    appliedRevisionId: row.appliedRevisionId,
    appliedRevisionDraftVersion: row.appliedRevisionVersion,
    message: runMessage(row),
  };
}

async function currentActor() {
  const user = await requireCurrentUser("admin.access");
  return { userId: user.id, role: user.role } as const;
}

function infrastructureFailure<T>(): AiDraftActionResultV1<T> {
  return {
    ok: false,
    code: "unavailable",
    message: "AI assistance is unavailable. Ordinary manual editing is unchanged.",
    manualEditorAvailable: true,
  };
}

function authenticationFailure<T>(): AiDraftActionResultV1<T> {
  return {
    ok: false,
    code: "access_denied",
    message: "Sign in again before using AI assistance.",
    manualEditorAvailable: false,
  };
}

function durableRunService(service: unknown): service is AiRunServiceV1 &
DraftAssistanceCandidateApplyService {
  if (typeof service !== "object" || service === null) return false;
  const candidate = service as Partial<Record<keyof AiRunServiceV1, unknown>>;
  return typeof candidate.requestDraftAssistance === "function" &&
    typeof candidate.readRun === "function" && typeof candidate.cancelRun === "function" &&
    typeof candidate.manualRetry === "function" && typeof candidate.rejectDisposition === "function" &&
    typeof candidate.resolveCandidateApplyRoute === "function" &&
    typeof (service as Partial<DraftAssistanceCandidateApplyService>)
      .applyDraftAssistanceCandidate === "function";
}

async function resolveAuthenticatedAiAuthorities() {
  const productionUseCases = await import("@/ai/registry/production-use-cases");
  const serverComposition = await import("@/server/ai/phase-d-provider-composition");
  return {
    decodeActionCommand: productionUseCases.decodeDraftAssistanceActionCommandV1,
    decodeAvailabilityQuery:
      productionUseCases.decodeDraftAssistanceAvailabilityActionQueryV1,
    createService: serverComposition.createPhaseDServerAiServiceV1,
  } as const;
}

async function withAuthenticatedActor<T>(
  operation: (actor: Awaited<ReturnType<typeof currentActor>>) => Promise<AiDraftActionResultV1<T>>,
): Promise<AiDraftActionResultV1<T>> {
  let actor: Awaited<ReturnType<typeof currentActor>>;
  try {
    actor = await currentActor();
  } catch (error) {
    return error instanceof Error && /authentication required|permission/i.test(error.message)
      ? authenticationFailure()
      : infrastructureFailure();
  }
  try {
    return await operation(actor);
  } catch {
    return infrastructureFailure();
  }
}

export async function inspectAiDraftAssistanceAvailabilityAction(
  input: unknown,
): Promise<AiDraftActionResultV1<AiDraftAvailabilityViewV1>> {
  return withAuthenticatedActor(async (actor) => {
    const { decodeAvailabilityQuery, createService } =
      await resolveAuthenticatedAiAuthorities();
    const decoded = decodeAvailabilityQuery(input, actor);
    if (!decoded.ok) return invalidRequest();
    const result = await createService()
      .inspectDraftAssistanceAvailability(decoded.value);
    if (!result.ok) return safeFailure(result.error);
    return {
      ok: true,
      value: {
        available: result.value.available,
        manualEditorAvailable: result.value.manualEditorAvailable,
        message: result.value.available
          ? "AI draft assistance is available."
          : "AI assistance is unavailable. Ordinary manual editing is unchanged.",
      },
    };
  });
}

export async function enqueueAiDraftAssistanceAction(
  input: unknown,
): Promise<AiDraftActionResultV1<AiDraftRunViewV1>> {
  return withAuthenticatedActor(async (actor) => {
    const { decodeActionCommand, createService } = await resolveAuthenticatedAiAuthorities();
    const decoded = decodeActionCommand(input, actor);
    if (!decoded.ok) return invalidRequest();
    const service = createService();
    if (!durableRunService(service)) return infrastructureFailure();
    const requested = await service.requestDraftAssistance(decoded.value);
    if (!requested.ok) return safeFailure(requested.error);
    const read = await service.readRun({ runId: requested.value.runId, actor });
    return read.ok ? { ok: true, value: safeRun(read.value) } : safeFailure(read.error);
  });
}

export async function readAiDraftAssistanceRunAction(
  input: unknown,
): Promise<AiDraftActionResultV1<AiDraftRunViewV1>> {
  const parsed = runInputSchema.safeParse(input);
  if (!parsed.success) return invalidRequest();
  return withAuthenticatedActor(async (actor) => {
    const { createService } = await resolveAuthenticatedAiAuthorities();
    const service = createService();
    if (!durableRunService(service)) return infrastructureFailure();
    const result = await service.readRun({ ...parsed.data, actor });
    return result.ok ? { ok: true, value: safeRun(result.value) } : safeFailure(result.error);
  });
}

export async function cancelAiDraftAssistanceRunAction(
  input: unknown,
): Promise<AiDraftActionResultV1<AiDraftRunViewV1>> {
  const parsed = fencedRunInputSchema.safeParse(input);
  if (!parsed.success) return invalidRequest();
  return withAuthenticatedActor(async (actor) => {
    const { createService } = await resolveAuthenticatedAiAuthorities();
    const service = createService();
    if (!durableRunService(service)) return infrastructureFailure();
    const result = await service.cancelRun({
      runId: parsed.data.runId,
      actor,
      expectedStateVersion: parsed.data.stateVersion,
      reason: "Cancelled by an authorized operator from the AI draft assistance panel.",
    });
    return result.ok ? { ok: true, value: safeRun(result.value) } : safeFailure(result.error);
  });
}

export async function retryAiDraftAssistanceRunAction(
  input: unknown,
): Promise<AiDraftActionResultV1<AiDraftRunViewV1>> {
  const parsed = fencedRunInputSchema.safeParse(input);
  if (!parsed.success) return invalidRequest();
  return withAuthenticatedActor(async (actor) => {
    const { createService } = await resolveAuthenticatedAiAuthorities();
    const service = createService();
    if (!durableRunService(service)) return infrastructureFailure();
    const result = await service.manualRetry({
      runId: parsed.data.runId,
      actor,
      expectedStateVersion: parsed.data.stateVersion,
    });
    return result.ok ? { ok: true, value: safeRun(result.value) } : safeFailure(result.error);
  });
}

export async function rejectAiDraftAssistanceCandidateAction(
  input: unknown,
): Promise<AiDraftActionResultV1<AiDraftRunViewV1>> {
  const parsed = rejectInputSchema.safeParse(input);
  if (!parsed.success) return invalidRequest();
  return withAuthenticatedActor(async (actor) => {
    const { createService } = await resolveAuthenticatedAiAuthorities();
    const service = createService();
    if (!durableRunService(service)) return infrastructureFailure();
    const result = await service.rejectDisposition({
      runId: parsed.data.runId,
      actor,
      expectedStateVersion: parsed.data.stateVersion,
      disposition: "rejected",
      candidateHash: parsed.data.candidateHash,
      qualityRating: parsed.data.qualityRating,
      qualityLabels: parsed.data.qualityLabels,
      qualityComment: parsed.data.qualityComment,
    });
    return result.ok ? { ok: true, value: safeRun(result.value) } : safeFailure(result.error);
  });
}

export async function applyAiDraftAssistanceCandidateAction(
  input: unknown,
): Promise<AiDraftActionResultV1<AiDraftRunViewV1>> {
  const parsed = applyAiDraftCandidateV1Schema.safeParse(input);
  if (!parsed.success) return invalidRequest();
  return withAuthenticatedActor(async (actor) => {
    const { createService } = await resolveAuthenticatedAiAuthorities();
    const service = createService();
    if (!durableRunService(service)) return infrastructureFailure();
    const applied = await service.applyDraftAssistanceCandidate({
      actor,
      command: parsed.data,
    });
    if (!applied.ok) return safeFailure(applied.error);
    const read = await service.readRun({ runId: parsed.data.runId, actor });
    return read.ok ? { ok: true, value: safeRun(read.value) } : safeFailure(read.error);
  });
}
